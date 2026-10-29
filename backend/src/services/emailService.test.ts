import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import type { Supabase } from '../lib/supabase.js';
import type { ReportMetadata } from '../schemas/report.js';
import type { EmailProvider } from './emailProvider.js';
import { buildReportEmail, deliverReportEmail } from './emailService.js';
import { CATEGORY_LABELS } from '../domain/categories.js';

const meta: ReportMetadata = {
  id: '11111111-1111-4111-8111-111111111111', categoryId: 'pothole', aiCategoryId: 'sidewalk_damage', aiConfidence: 0.75,
  description: '<img src=x onerror="secret"> & \'quoted\'', descriptionEdited: true, latitude: 41.0082, longitude: 28.9784,
  accuracy: 8, address: '<b>Taksim</b>', capturedAt: 1_797_000_000_000, locationPrecision: 'precise', locationIsMocked: false,
  city: 'İstanbul', subregion: 'Beyoğlu', district: 'Beyoğlu', postalCode: '34435', countryCode: 'TR',
};
const image = { buffer: Buffer.from('validated-image'), mime: 'image/png', ext: 'png' };

function fakeDb(updates: Array<Record<string, unknown>>, updateError: unknown = null) {
  return { from: () => ({ update: (values: Record<string, unknown>) => { updates.push(values); return { eq: async () => ({ error: updateError }) }; } }) } as unknown as Supabase;
}

describe('report email', () => {
  it('builds the approved Turkish subject and complete text content', () => {
    const email = buildReportEmail(meta, image);
    expect(email.subject).toBe('[KentBildir Test] Yeni Bildirim – Yol Çukuru / Yol Hasarı – Beyoğlu');
    expect(email.text).toContain('YENİ KENT BİLDİRİMİ');
    expect(email.text).toContain('TEST BİLDİRİMİ');
    expect(email.text).toContain('Vatandaşın açıklaması: <img');
    expect(email.text).toContain(`Takip numarası: ${meta.id}`);
    expect(email.text).toContain('Açık adres: <b>Taksim</b>');
    expect(email.text).toContain('İlçe / il: Beyoğlu / İstanbul');
    expect(email.text).toContain('Enlem: 41.0082');
    expect(email.text).toContain('Boylam: 28.9784');
    expect(email.text).toContain('AI önerisi: Kaldırım Bozukluğu');
    expect(email.text).toContain('AI güven skoru: %75');
    expect(email.text).toContain('Bu ileti KentBildir’in test ortamı tarafından otomatik oluşturulmuş');
    expect(email.text).toContain('Henüz herhangi bir belediyeye veya resmî kuruma iletilmemiştir.');
  });

  it('escapes user input, preserves Turkish characters, encodes the map link and attaches the photo', () => {
    const email = buildReportEmail(meta, image);
    expect(email.html).not.toContain('<img src=x');
    expect(email.html).not.toContain('<b>Taksim</b>');
    expect(email.html).toContain('&lt;img src=x onerror=&quot;secret&quot;&gt;');
    expect(email.html).toContain('&lt;b&gt;Taksim&lt;/b&gt;');
    expect(email.html).toContain('Yeni Kent Bildirimi');
    expect(email.html).toContain('Vatandaşın açıklaması');
    expect(email.html).toContain('Beyoğlu / İstanbul');
    expect(email.text).toContain('https://www.google.com/maps?q=41.0082%2C28.9784');
    expect(email.html).toContain('https://www.google.com/maps?q=41.0082%2C28.9784');
    expect(email.text).toContain('Bildirim fotoğrafı bu e-postaya dosya eki olarak iliştirilmiştir.');
    expect(email.attachment).toEqual({ filename: `kentbildir-${meta.id}.png`, content: image.buffer, contentType: 'image/png' });
  });

  it('removes header-breaking characters from the subject district', () => {
    const email = buildReportEmail({ ...meta, district: 'Beyoğlu\r\nBcc: belediye@example.com' }, image);
    expect(email.subject).toBe('[KentBildir Test] Yeni Bildirim – Yol Çukuru / Yol Hasarı – Beyoğlu Bcc: belediye@example.com');
    expect(email.subject).not.toMatch(/[\r\n]/);
  });

  it('uses the approved category labels consistently', () => {
    expect(CATEGORY_LABELS).toEqual({
      pothole: 'Yol Çukuru / Yol Hasarı', sidewalk_damage: 'Kaldırım Bozukluğu', overflowing_bin: 'Taşmış Çöp Konteyneri',
      litter: 'Çevreye Bırakılmış Çöp / Kirlilik', damaged_city_equipment: 'Hasarlı Şehir Ekipmanı', other: 'Diğer',
    });
    const sidewalkEmail = buildReportEmail({ ...meta, categoryId: 'sidewalk_damage' }, image);
    expect(sidewalkEmail.subject).toContain('Yeni Bildirim – Kaldırım Bozukluğu – Beyoğlu');
  });

  it('success calls provider once and records sent fields', async () => {
    const updates: Array<Record<string, unknown>> = [];
    const sendReportEmail = vi.fn().mockResolvedValue(undefined);
    const status = await deliverReportEmail({ db: fakeDb(updates), provider: { sendReportEmail }, enabled: true, meta, image });
    expect(status).toBe('sent');
    expect(sendReportEmail).toHaveBeenCalledOnce();
    expect(updates[0]).toEqual(expect.objectContaining({ email_status: 'sent', email_attempt_count: 1, email_last_error_code: null }));
    expect(updates[0].email_sent_at).toEqual(expect.any(String));
  });

  it('disabled does not call provider and records disabled', async () => {
    const updates: Array<Record<string, unknown>> = [];
    const provider: EmailProvider = { sendReportEmail: vi.fn() };
    expect(await deliverReportEmail({ db: fakeDb(updates), provider, enabled: false, meta, image })).toBe('disabled');
    expect(provider.sendReportEmail).not.toHaveBeenCalled();
    expect(updates).toEqual([{ email_status: 'disabled' }]);
  });

  it('provider failure is safe, does not throw, and records one failed attempt', async () => {
    const updates: Array<Record<string, unknown>> = [];
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const rawSecret = 'SMTP raw secret response';
    const provider: EmailProvider = { sendReportEmail: vi.fn().mockRejectedValue(Object.assign(new Error(rawSecret), { code: 'ETIMEDOUT', responseCode: 421 })) };
    try {
      expect(await deliverReportEmail({ db: fakeDb(updates), provider, enabled: true, meta, image })).toBe('failed');
      expect(updates[0]).toEqual({ email_status: 'failed', email_sent_at: null, email_last_error_code: 'ETIMEDOUT', email_attempt_count: 1 });
      expect(JSON.stringify(warning.mock.calls)).not.toContain(rawSecret);
    } finally { warning.mockRestore(); }
  });

  it('send succeeds but sent status update fails: returns sent without retrying or leaking DB details', async () => {
    const updates: Array<Record<string, unknown>> = [];
    const rawSecret = 'database connection includes secret detail';
    const dbError = Object.assign(new Error(rawSecret), { code: 'PGRST001' });
    const sendReportEmail = vi.fn().mockResolvedValue(undefined);
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const status = await deliverReportEmail({ db: fakeDb(updates, dbError), provider: { sendReportEmail }, enabled: true, meta, image });
      expect(status).toBe('sent');
      expect(sendReportEmail).toHaveBeenCalledOnce();
      expect(updates).toHaveLength(1);
      expect(warning).toHaveBeenCalledWith('email_status_update_failed', { reportId: meta.id, code: 'PGRST001', kind: 'Error' });
      expect(warning).not.toHaveBeenCalledWith('email_delivery_failed', expect.anything());
      expect(JSON.stringify(warning.mock.calls)).not.toContain(rawSecret);
    } finally { warning.mockRestore(); }
  });

  it('migration grants only email columns and no client role privileges', () => {
    const sql = readFileSync(new URL('../../../supabase/migrations/20261015000200_add_email_delivery_status.sql', import.meta.url), 'utf8').toLowerCase();
    expect(sql).toMatch(/grant update\s*\(email_status, email_sent_at, email_last_error_code, email_attempt_count\)/);
    expect(sql).not.toMatch(/grant[^;]+to\s+(anon|authenticated|public)/);
    expect(sql).not.toMatch(/grant\s+update\s+on/);
  });
});
