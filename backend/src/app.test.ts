import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';

const config = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'a'.repeat(40), PORT: 3000, CORS_ORIGINS: '', NODE_ENV: 'test' as const, corsOrigins: [] };
describe('app', () => {
  const app = createApp(config);
  it('health 200', async () => expect((await request(app).get('/health')).body).toEqual({ status: 'ok' }));
  it('productionda Render proxysi için tek güvenilir proxy kullanır', () => expect(createApp({ ...config, NODE_ENV: 'production' }).get('trust proxy')).toBe(1));
  it('global reports listesi sunulmaz', async () => expect((await request(app).get('/api/reports')).status).toBe(404));
  it('photo yok 400', async () => expect((await request(app).post('/api/reports').field('metadata', '{}')).status).toBe(400));
  it('metadata yok 400', async () => expect((await request(app).post('/api/reports').attach('photo', Buffer.from('x'), { filename: 'a.jpg', contentType: 'image/jpeg' })).status).toBe(400));
  it('malformed metadata 400', async () => expect((await request(app).post('/api/reports').field('metadata', '{').attach('photo', Buffer.from('x'), { filename: 'a.jpg', contentType: 'image/jpeg' })).status).toBe(400));
  it('fazla field 400', async () => expect((await request(app).post('/api/reports').field('metadata', '{}').field('extra', 'x').attach('photo', Buffer.from('x'), { filename: 'a.jpg', contentType: 'image/jpeg' })).status).toBe(400));
  it('8MB üstü 413', async () => expect((await request(app).post('/api/reports').field('metadata', '{}').attach('photo', Buffer.alloc(8 * 1024 * 1024 + 1), { filename: 'a.jpg', contentType: 'image/jpeg' })).status).toBe(413));
});
