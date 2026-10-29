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
const TEST_NOTICE = 'Bu ileti KentBildir’in test ortamı tarafından otomatik oluşturulmuş ve yalnızca tanımlı test adresine gönderilmiştir. Henüz herhangi bir belediyeye veya resmî kuruma iletilmemiştir.';
const safeSubjectPart = (value: unknown) => shown(value).replace(/[\r\n]+/g, ' ').trim();

export function buildReportEmail(meta: ReportMetadata, image: { buffer: Buffer; mime: string; ext: string }): ReportEmail {
  if (!Number.isFinite(meta.latitude) || !Number.isFinite(meta.longitude)) throw new Error('invalid_coordinates');
  const mapUrl = `https://www.google.com/maps?q=${encodeURIComponent(`${meta.latitude},${meta.longitude}`)}`;
  const category = CATEGORY_LABELS[meta.categoryId];
  const district = shown(meta.district ?? meta.subregion);
  const fields: Array<[string, unknown]> = [
    ['Kategori', category],
    ['Vatandaşın açıklaması', meta.description],
    ['Bildirim tarihi ve saati', formatDate(meta.capturedAt)],
    ['Takip numarası', meta.id],
    ['Açık adres', shown(meta.address)],
    ['İlçe / il', `${district} / ${shown(meta.city)}`],
    ['Enlem', meta.latitude],
    ['Boylam', meta.longitude],
    ['AI önerisi', meta.aiCategoryId ? CATEGORY_LABELS[meta.aiCategoryId] : shown(null)],
    ['AI güven skoru', meta.aiConfidence === null ? shown(null) : `%${Math.round(meta.aiConfidence * 100)}`],
  ];
  const text = [
    'YENİ KENT BİLDİRİMİ',
    'TEST BİLDİRİMİ',
    '',
    ...fields.map(([key, value]) => `${key}: ${shown(value)}`),
    `Harita bağlantısı: ${mapUrl}`,
    '',
    'Bildirim fotoğrafı bu e-postaya dosya eki olarak iliştirilmiştir.',
    '',
    TEST_NOTICE,
  ].join('\n');
  const htmlRows = fields.map(([key, value]) => `<tr><th align="left" style="width:38%;padding:12px 14px;color:#52605c;border-bottom:1px solid #dde5e2;vertical-align:top;font-size:14px">${escapeHtml(key)}</th><td style="padding:12px 14px;color:#17211f;border-bottom:1px solid #dde5e2;font-size:14px;line-height:1.5;word-break:break-word">${escapeHtml(shown(value))}</td></tr>`).join('');
  const html = `<!doctype html><html lang="tr"><body style="margin:0;padding:0;background:#f3f7f5"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f7f5"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border:1px solid #dce7e3;border-radius:18px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#17211f"><tr><td style="padding:28px 24px;background:#146c5a"><span style="display:inline-block;padding:6px 10px;border-radius:999px;background:#ffffff;color:#146c5a;font-size:12px;font-weight:800;letter-spacing:.5px">TEST BİLDİRİMİ</span><h1 style="margin:16px 0 0;color:#ffffff;font-size:28px;line-height:1.2">Yeni Kent Bildirimi</h1></td></tr><tr><td style="padding:24px"><p style="margin:0 0 18px;color:#52605c;font-size:15px;line-height:1.6">KentBildir test ortamında yeni bir bildirim kaydedildi. Bildirim ayrıntıları aşağıdadır.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #dde5e2;border-radius:12px;border-collapse:separate;border-spacing:0;overflow:hidden">${htmlRows}</table><p style="margin:20px 0"><a href="${escapeHtml(mapUrl)}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#146c5a;color:#ffffff;text-decoration:none;font-weight:700">Konumu haritada görüntüle</a></p><p style="margin:0 0 18px;color:#52605c;font-size:14px;line-height:1.6">Bildirim fotoğrafı bu e-postaya dosya eki olarak iliştirilmiştir.</p><div style="padding:14px 16px;border-radius:10px;background:#eef7f3;color:#465550;font-size:13px;line-height:1.6">${escapeHtml(TEST_NOTICE)}</div></td></tr></table></td></tr></table></body></html>`;
  return { subject: `[KentBildir Test] Yeni Bildirim – ${category} – ${safeSubjectPart(district)}`, text, html, attachment: { filename: `kentbildir-${meta.id}.${image.ext}`, content: image.buffer, contentType: image.mime } };
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
