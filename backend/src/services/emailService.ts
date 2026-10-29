import type { Supabase } from '../lib/supabase.js';
import { CATEGORY_LABELS } from '../domain/categories.js';
import type { ReportMetadata } from '../schemas/report.js';
import type { EmailProvider, ReportEmail } from './emailProvider.js';

export type EmailStatus = 'pending' | 'sent' | 'failed' | 'disabled';
const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
const shown = (value: unknown) => value === null || value === undefined || value === '' ? 'Belirtilmedi' : String(value);
const formatDate = (value: number) => new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'Europe/Istanbul',
}).format(new Date(value));

export function buildReportEmail(meta: ReportMetadata, image: { buffer: Buffer; mime: string; ext: string }): ReportEmail {
  if (!Number.isFinite(meta.latitude) || !Number.isFinite(meta.longitude)) throw new Error('invalid_coordinates');
  const mapUrl = `https://www.google.com/maps?q=${encodeURIComponent(`${meta.latitude},${meta.longitude}`)}`;
  const fields: Array<[string, unknown]> = [
    ['Bildirim numarası', meta.id],
    ['Kategori', CATEGORY_LABELS[meta.categoryId]],
    ['Açıklama', meta.description],
    ['Fotoğraf tarihi', formatDate(meta.capturedAt)],
    ['Açık adres', shown(meta.address)],
    ['İl', shown(meta.city)],
    ['İlçe', shown(meta.district ?? meta.subregion)],
    ['Konum', `${meta.latitude}, ${meta.longitude}`],
    ['Konum hassasiyeti', meta.accuracy === null ? shown(null) : `${meta.accuracy} m`],
  ];
  if (meta.aiCategoryId) fields.push(
    ['AI kategori önerisi', CATEGORY_LABELS[meta.aiCategoryId]],
    ['Model güven skoru', meta.aiConfidence === null ? shown(null) : `%${Math.round(meta.aiConfidence * 100)}`],
  );
  const text = [
    'KentBildir test bildirimi',
    '',
    ...fields.map(([key, value]) => `${key}: ${shown(value)}`),
    `Harita: ${mapUrl}`,
    '',
    'Fotoğraf bu e-postaya güvenli ek olarak iliştirilmiştir.',
    'Bu ileti yalnız yapılandırılmış KentBildir test alıcısına gönderilmiştir.',
  ].join('\n');
  const htmlRows = fields.map(([key, value]) => `<tr><th align="left" style="padding:8px 12px;color:#52605c;border-bottom:1px solid #dde5e2;vertical-align:top">${escapeHtml(key)}</th><td style="padding:8px 12px;color:#17211f;border-bottom:1px solid #dde5e2">${escapeHtml(shown(value))}</td></tr>`).join('');
  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:680px;color:#17211f"><h1 style="color:#146c5a">KentBildir test bildirimi</h1><table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #dde5e2">${htmlRows}</table><p><a href="${escapeHtml(mapUrl)}" style="color:#146c5a;font-weight:700">Konumu haritada görüntüle</a></p><p>Fotoğraf bu e-postaya güvenli ek olarak iliştirilmiştir.</p><p style="color:#66736f;font-size:13px">Bu ileti yalnız yapılandırılmış KentBildir test alıcısına gönderilmiştir.</p></div>`;
  const shortNumber = meta.id.slice(0, 8).toUpperCase();
  return { subject: `[KentBildir] Test bildirimi #${shortNumber} — ${CATEGORY_LABELS[meta.categoryId]}`, text, html, attachment: { filename: `kentbildir-${meta.id}.${image.ext}`, content: image.buffer, contentType: image.mime } };
}

function safeErrorCode(error: unknown) {
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(code) ? code : 'email_provider_error';
}

async function updateDelivery(db: Supabase, id: string, values: Record<string, unknown>) {
  const result = await db.from('reports').update(values).eq('id', id);
  if (result.error) throw result.error;
}

export async function deliverReportEmail(options: { db: Supabase; provider: EmailProvider | null; enabled: boolean; meta: ReportMetadata; image: { buffer: Buffer; mime: string; ext: string } }): Promise<EmailStatus> {
  const { db, provider, enabled, meta, image } = options;
  if (!enabled) {
    try { await updateDelivery(db, meta.id, { email_status: 'disabled' }); } catch (error) { console.warn('email_status_update_failed', { reportId: meta.id, code: safeErrorCode(error) }); }
    return 'disabled';
  }
  try {
    if (!provider) throw Object.assign(new Error('provider unavailable'), { code: 'provider_unavailable' });
    await provider.sendReportEmail(buildReportEmail(meta, image));
  } catch (error) {
    const code = safeErrorCode(error);
    console.warn('email_delivery_failed', { reportId: meta.id, code, kind: error instanceof Error ? error.constructor.name : 'Unknown', responseCode: typeof (error as { responseCode?: unknown }).responseCode === 'number' ? (error as { responseCode: number }).responseCode : undefined });
    try { await updateDelivery(db, meta.id, { email_status: 'failed', email_sent_at: null, email_last_error_code: code, email_attempt_count: 1 }); } catch (updateError) { console.warn('email_status_update_failed', { reportId: meta.id, code: safeErrorCode(updateError) }); }
    return 'failed';
  }
  try {
    await updateDelivery(db, meta.id, { email_status: 'sent', email_sent_at: new Date().toISOString(), email_last_error_code: null, email_attempt_count: 1 });
  } catch (error) {
    console.warn('email_status_update_failed', { reportId: meta.id, code: safeErrorCode(error), kind: error instanceof Error ? error.constructor.name : 'Unknown' });
  }
  return 'sent';
}
