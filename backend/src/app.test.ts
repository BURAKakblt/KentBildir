import supertest from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp as createProductionApp } from './app.js';
import type { AuthVerifier } from './middleware/requireUser.js';

const config = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'a'.repeat(40), PORT: 3000, CORS_ORIGINS: '', NODE_ENV: 'test' as const, corsOrigins: [] };
const authVerifier: AuthVerifier = { getUser: async (token) => token === 'test-token' ? { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' } : null };
function createApp(...args: Parameters<typeof createProductionApp>) { return createProductionApp(args[0], { ...args[1], authVerifier }); }
function request(app: ReturnType<typeof createApp>) {
  const agent = supertest(app) as any;
  return new Proxy(agent, { get(target, property, receiver) {
    const value = Reflect.get(target, property, receiver);
    return typeof value === 'function' && ['get', 'post', 'put', 'patch', 'delete'].includes(String(property))
      ? (...args: unknown[]) => value.apply(target, args).set('Authorization', 'Bearer test-token')
      : value;
  } });
}
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
  it('kimliksiz API isteğini reddeder', async () => expect((await supertest(app).get('/api/reports/22222222-2222-4222-8222-222222222222')).status).toBe(401));
  it('geçersiz tokenı reddeder', async () => expect((await supertest(app).get('/api/reports/22222222-2222-4222-8222-222222222222').set('Authorization', 'Bearer invalid')).status).toBe(401));
});
