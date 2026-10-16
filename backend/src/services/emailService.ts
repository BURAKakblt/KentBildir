import type { Supabase } from '../lib/supabase.js';
import { CATEGORY_LABELS } from '../domain/categories.js';
import type { ReportMetadata } from '../schemas/report.js';
import type { EmailProvider, ReportEmail } from './emailProvider.js';

export type EmailStatus = 'pending' | 'sent' | 'failed' | 'disabled';
const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
const shown = (value: unknown) => value === null || value === undefined || value === '' ? 'Belirtilmedi' : String(value);

export function buildReportEmail(meta: ReportMetadata, image: { buffer: Buffer; mime: string; ext: string }): ReportEmail {
  if (!Number.isFinite(meta.latitude) || !Number.isFinite(meta.longitude)) throw new Error('invalid_coordinates');
  const mapUrl = `https://www.google.com/maps?q=${encodeURIComponent(`${meta.latitude},${meta.longitude}`)}`;
  const fields: Array<[string, unknown]> = [
    ['Bildirim ID', meta.id], ['Kullanıcının seçtiği nihai kategori', CATEGORY_LABELS[meta.categoryId]], ['Kullanıcı açıklaması', meta.description],
    ['Tarih', new Date(meta.capturedAt).toISOString()], ['Adres', shown(meta.address)], ['İl', shown(meta.city)], ['İlçe', shown(meta.district ?? meta.subregion)],
    ['Latitude', meta.latitude], ['Longitude', meta.longitude], ['Konum hassasiyeti', meta.accuracy === null ? shown(null) : `${meta.accuracy} m`],
  ];
  if (meta.aiCategoryId) fields.push(['AI kategori tahmini', CATEGORY_LABELS[meta.aiCategoryId]], ['Model confidence', shown(meta.aiConfidence)]);
  const text = `${fields.map(([key, value]) => `${key}: ${shown(value)}`).join('\n')}\nHarita: ${mapUrl}`;
  const html = `<h1>KentBildir Bildirimi</h1><dl>${fields.map(([key, value]) => `<dt><strong>${escapeHtml(key)}</strong></dt><dd>${escapeHtml(shown(value))}</dd>`).join('')}</dl><p><a href="${escapeHtml(mapUrl)}">Haritada görüntüle</a></p>`;
  return { subject: `[KentBildir] ${CATEGORY_LABELS[meta.categoryId]} Bildirimi`, text, html, attachment: { filename: `kentbildir-${meta.id}.${image.ext}`, content: image.buffer, contentType: image.mime } };
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
