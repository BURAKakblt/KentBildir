import supertest from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp as createProductionApp } from '../app.js';
import { loadConfig } from '../config.js';
import type { Supabase } from '../lib/supabase.js';
import type { AuthVerifier } from '../middleware/requireUser.js';

const config = loadConfig({ SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'a'.repeat(40), NODE_ENV: 'test', EMAIL_ENABLED: 'true', SMTP_USER: 'user', SMTP_PASSWORD: 'password', EMAIL_FROM_ADDRESS: 'sender@example.com', TEST_REPORT_RECIPIENT_EMAIL: 'controlled@example.com' });
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6ZQAAAABJRU5ErkJggg==', 'base64');
const ownerA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ownerB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const authVerifier: AuthVerifier = { getUser: async (token) => token === 'token-a' ? { id: ownerA } : token === 'token-b' ? { id: ownerB } : null };
function createApp(...args: Parameters<typeof createProductionApp>) { return createProductionApp(args[0], { ...args[1], authVerifier }); }
function request(app: ReturnType<typeof createApp>, token = 'token-a') {
  const agent = supertest(app) as any;
  return new Proxy(agent, { get(target, property, receiver) {
    const value = Reflect.get(target, property, receiver);
    return typeof value === 'function' && ['get', 'post', 'put', 'patch', 'delete'].includes(String(property))
      ? (...args: unknown[]) => value.apply(target, args).set('Authorization', `Bearer ${token}`)
      : value;
  } });
}

const capturedAt = Date.now();
function metadata() { return { id: '22222222-2222-4222-8222-222222222222', categoryId: 'pothole', aiCategoryId: null, aiConfidence: null, description: 'Yolda büyük bir çukur bulunmaktadır.', descriptionEdited: true, latitude: 41, longitude: 29, accuracy: 5, address: 'Test adresi', capturedAt, locationPrecision: 'precise', locationIsMocked: false, city: 'İstanbul', subregion: 'Kadıköy', district: 'Kadıköy', postalCode: null, countryCode: 'TR', recipient: 'attacker@example.com' }; }

function memoryDb(failUpdates = false) {
  let row: Record<string, unknown> | null = null;
  const select = () => {
    const filters: Record<string, unknown> = {};
    const query = {
      eq(key: string, value: unknown) { filters[key] = value; return query; },
      maybeSingle: async () => ({ data: row && Object.entries(filters).every(([key, value]) => row?.[key] === value) ? row : null, error: null }),
    };
    return query;
  };
  const db = {
    storage: { from: () => ({ upload: async () => ({ error: null }), remove: async () => ({ error: null }) }) },
    from: () => ({
      select,
      insert: (value: Record<string, unknown>) => ({ select: () => ({ single: async () => { row = { ...value, created_at: new Date().toISOString(), email_status: 'pending', email_attempt_count: 0 }; return { data: row, error: null }; } }) }),
      update: (values: Record<string, unknown>) => ({ eq: async () => { if (failUpdates) return { error: Object.assign(new Error('raw DB detail'), { code: 'PGRST001' }) }; row = { ...row, ...values }; return { error: null }; } }),
    }),
  } as unknown as Supabase;
  return db;
}

describe('POST /api/reports email delivery', () => {
  let db: Supabase;
  beforeEach(() => { db = memoryDb(); });

  it('new report sends once; idempotent retry does not resend and returns stored status', async () => {
    const sendReportEmail = vi.fn().mockResolvedValue(undefined);
    const app = createApp(config, { db, emailProvider: { sendReportEmail } });
    const send = () => request(app).post('/api/reports').field('metadata', JSON.stringify(metadata())).attach('photo', png, { filename: 'user-controlled.png', contentType: 'image/png' });
    const first = await send();
    const second = await send();
    expect(first.status).toBe(201);
    expect(first.body.delivery).toEqual({ emailStatus: 'sent' });
    expect(second.status).toBe(200);
    expect(second.body.delivery).toEqual({ emailStatus: 'sent' });
    expect(sendReportEmail).toHaveBeenCalledOnce();
    const email = sendReportEmail.mock.calls[0][0];
    expect(email.attachment.filename).toBe(`kentbildir-${metadata().id}.png`);
    expect(JSON.stringify(email)).not.toContain('attacker@example.com');
  });

  it('email failure still returns created report and never leaks raw provider error', async () => {
    const raw = '535 password=very-secret';
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const response = await request(createApp(config, { db, emailProvider: { sendReportEmail: vi.fn().mockRejectedValue(new Error(raw)) } }))
        .post('/api/reports').field('metadata', JSON.stringify(metadata())).attach('photo', png, { filename: 'a.png', contentType: 'image/png' });
      expect(response.status).toBe(201);
      expect(response.body.delivery).toEqual({ emailStatus: 'failed' });
      expect(JSON.stringify(response.body)).not.toContain(raw);
      expect(JSON.stringify(warning.mock.calls)).not.toContain(raw);
    } finally { warning.mockRestore(); }
  });

  it('keeps pending status on an idempotent response when sent status persistence failed', async () => {
    const sendReportEmail = vi.fn().mockResolvedValue(undefined);
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const app = createApp(config, { db: memoryDb(true), emailProvider: { sendReportEmail } });
      const send = () => request(app).post('/api/reports').field('metadata', JSON.stringify(metadata())).attach('photo', png, { filename: 'a.png', contentType: 'image/png' });
      expect((await send()).body.delivery).toEqual({ emailStatus: 'sent' });
      const duplicate = await send();
      expect(duplicate.status).toBe(200);
      expect(duplicate.body.delivery).toEqual({ emailStatus: 'pending' });
      expect(sendReportEmail).toHaveBeenCalledOnce();
      expect(JSON.stringify(duplicate.body)).not.toContain('raw DB detail');
    } finally { warning.mockRestore(); }
  });

  it('disabled skips provider and returns disabled', async () => {
    const sendReportEmail = vi.fn();
    const disabledConfig = loadConfig({ SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'a'.repeat(40), NODE_ENV: 'test' });
    const response = await request(createApp(disabledConfig, { db, emailProvider: { sendReportEmail } }))
      .post('/api/reports').field('metadata', JSON.stringify(metadata())).attach('photo', png, { filename: 'a.png', contentType: 'image/png' });
    expect(response.status).toBe(201);
    expect(response.body.delivery).toEqual({ emailStatus: 'disabled' });
    expect(sendReportEmail).not.toHaveBeenCalled();
  });

  it('owner değerini requestten değil doğrulanmış oturumdan atar ve taklit girişimini reddeder', async () => {
    const app = createApp(config, { db, emailProvider: { sendReportEmail: vi.fn().mockResolvedValue(undefined) } });
    const forged = { ...metadata(), ownerId: ownerB, owner_id: ownerB };
    const spoofed = await request(app).post('/api/reports').field('metadata', JSON.stringify(forged)).attach('photo', png, { filename: 'a.png', contentType: 'image/png' });
    expect(spoofed.status).toBe(201);
    expect((await request(app).get(`/api/reports/${metadata().id}`)).status).toBe(200);
    expect((await request(app, 'token-b').get(`/api/reports/${metadata().id}`)).status).toBe(404);
  });
});

const detailRow = {
  id: metadata().id, owner_id: ownerA, category_id: 'pothole', ai_category_id: 'sidewalk_damage', ai_confidence: 0.81,
  description: 'Yolda büyük bir çukur bulunmaktadır.', latitude: 41, longitude: 29, accuracy_m: 5,
  address: 'Test adresi', captured_at: new Date(capturedAt).toISOString(), location_precision: 'precise',
  city: 'İstanbul', subregion: 'Kadıköy', district: 'Kadıköy', postal_code: '34710', country_code: 'TR',
  status: 'submitted', email_status: 'sent', email_sent_at: new Date().toISOString(), created_at: new Date().toISOString(),
  photo_path: '2026-10-16/server-generated.png', payload_hash: 'internal-hash', email_last_error_code: null,
};

function readDb(row: Record<string, unknown> | null, download: () => Promise<{ data: Blob | null; error: unknown }>) {
  const select = () => {
    const filters: Record<string, unknown> = {};
    const query = {
      eq(key: string, value: unknown) { filters[key] = value; return query; },
      maybeSingle: async () => ({ data: row && Object.entries(filters).every(([key, value]) => row?.[key] === value) ? row : null, error: null }),
    };
    return query;
  };
  return {
    from: () => ({ select }),
    storage: { from: () => ({ download }) },
  } as unknown as Supabase;
}

describe('GET /api/reports history endpoints', () => {
  it('returns the safe detail DTO and maps email status', async () => {
    const response = await request(createApp(config, { db: readDb(detailRow, async () => ({ data: null, error: null })), emailProvider: null }))
      .get(`/api/reports/${detailRow.id}`);
    expect(response.status).toBe(200);
    expect(response.body.report).toEqual(expect.objectContaining({ id: detailRow.id, categoryId: 'pothole', emailStatus: 'sent', accuracy: 5 }));
    expect(response.body.report).not.toHaveProperty('payload_hash');
    expect(response.body.report).not.toHaveProperty('photo_path');
    expect(response.body.report).not.toHaveProperty('email_last_error_code');
  });

  it('rejects invalid UUID and returns 404 for a missing report', async () => {
    const db = readDb(null, async () => ({ data: null, error: null }));
    expect((await request(createApp(config, { db, emailProvider: null })).get('/api/reports/not-a-uuid')).status).toBe(400);
    expect((await request(createApp(config, { db, emailProvider: null })).get(`/api/reports/${detailRow.id}`)).status).toBe(404);
  });

  it('proxies the private photo with its MIME type using the DB path', async () => {
    const bytes = Buffer.from('private-image');
    const download = vi.fn().mockResolvedValue({ data: new Blob([bytes], { type: 'image/png' }), error: null });
    const response = await request(createApp(config, { db: readDb(detailRow, download), emailProvider: null }))
      .get(`/api/reports/${detailRow.id}/photo?photo_path=attacker/override.jpg`);
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/^image\/png/);
    expect(Buffer.from(response.body)).toEqual(bytes);
    expect(download).toHaveBeenCalledWith(detailRow.photo_path);
  });

  it('returns 404 for a missing photo report and a safe 502 for storage failure', async () => {
    const missing = await request(createApp(config, { db: readDb(null, async () => ({ data: null, error: null })), emailProvider: null }))
      .get(`/api/reports/${detailRow.id}/photo`);
    expect(missing.status).toBe(404);
    const raw = 'storage secret internal/path';
    const failed = await request(createApp(config, { db: readDb(detailRow, async () => ({ data: null, error: new Error(raw) })), emailProvider: null }))
      .get(`/api/reports/${detailRow.id}/photo`);
    expect(failed.status).toBe(502);
    expect(JSON.stringify(failed.body)).not.toContain(raw);
    expect(JSON.stringify(failed.body)).not.toContain(String(detailRow.photo_path));
  });

  it('does not expose a global reports endpoint', async () => {
    expect((await request(createApp(config, { db: readDb(detailRow, async () => ({ data: null, error: null })), emailProvider: null })).get('/api/reports')).status).toBe(404);
  });

  it('başka bir kullanıcının raporuna ve fotoğrafına erişim vermez', async () => {
    const download = vi.fn().mockResolvedValue({ data: new Blob([Buffer.from('private')], { type: 'image/png' }), error: null });
    const app = createApp(config, { db: readDb(detailRow, download), emailProvider: null });
    expect((await request(app, 'token-b').get(`/api/reports/${detailRow.id}`)).status).toBe(404);
    expect((await request(app, 'token-b').get(`/api/reports/${detailRow.id}/photo`)).status).toBe(404);
    expect(download).not.toHaveBeenCalled();
  });

  it('sahipsiz eski raporu erişime kapalı tutar', async () => {
    const legacy = { ...detailRow, owner_id: null };
    const app = createApp(config, { db: readDb(legacy, async () => ({ data: null, error: null })), emailProvider: null });
    expect((await request(app).get(`/api/reports/${legacy.id}`)).status).toBe(404);
    expect((await request(app).get(`/api/reports/${legacy.id}/photo`)).status).toBe(404);
  });
});
