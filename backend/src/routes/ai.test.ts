import supertest from 'supertest';
import { ApiError } from '@google/genai';
import { describe, expect, it, vi } from 'vitest';
import { createApp as createProductionApp } from '../app.js';
import { imageAnalysisSchema } from '../schemas/analysis.js';
import { InvalidAIOutputError, type AIProvider } from '../services/aiProvider.js';
import type { AuthVerifier } from '../middleware/requireUser.js';

const config = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'a'.repeat(40),
  PORT: 3000,
  CORS_ORIGINS: '',
  NODE_ENV: 'test' as const,
  GEMINI_VISION_MODEL: 'gemini-3.5-flash-lite',
  corsOrigins: [],
};
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6ZQAAAABJRU5ErkJggg==', 'base64');
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

function providerWith(analyzeImage: AIProvider['analyzeImage']): AIProvider {
  return { analyzeImage };
}

describe('POST /api/ai/analyze-image', () => {
  it('geçerli fotoğrafı analiz edip sonucu döndürür', async () => {
    const analyzeImage = vi.fn().mockResolvedValue({ categoryId: 'pothole', confidence: 0.8 });
    const response = await request(createApp(config, { aiProvider: providerWith(analyzeImage) }))
      .post('/api/ai/analyze-image').attach('photo', png, { filename: 'a.png', contentType: 'image/png' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ categoryId: 'pothole', confidence: 0.8 });
    expect(analyzeImage).toHaveBeenCalledOnce();
  });

  it('fotoğraf yoksa 400 döndürür', async () => {
    expect((await request(createApp(config, { aiProvider: null })).post('/api/ai/analyze-image')).status).toBe(400);
  });

  it('dosya imzası MIME ile uyuşmuyorsa 400 döndürür', async () => {
    const response = await request(createApp(config, { aiProvider: null })).post('/api/ai/analyze-image')
      .attach('photo', Buffer.from('not an image'), { filename: 'a.jpg', contentType: 'image/jpeg' });
    expect(response.status).toBe(400);
  });

  it('desteklenmeyen gerçek dosya türünü 400 ile reddeder', async () => {
    const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64');
    const response = await request(createApp(config, { aiProvider: null })).post('/api/ai/analyze-image')
      .attach('photo', gif, { filename: 'a.gif', contentType: 'image/gif' });
    expect(response.status).toBe(400);
  });

  it('8 MB üstünü 413 ile reddeder', async () => {
    const response = await request(createApp(config, { aiProvider: null })).post('/api/ai/analyze-image')
      .attach('photo', Buffer.alloc(8 * 1024 * 1024 + 1), { filename: 'a.jpg', contentType: 'image/jpeg' });
    expect(response.status).toBe(413);
  });

  it('API anahtarı yapılandırılmadığında 503 döndürür', async () => {
    const response = await request(createApp(config, { aiProvider: null })).post('/api/ai/analyze-image')
      .attach('photo', png, { filename: 'a.png', contentType: 'image/png' });
    expect(response.status).toBe(503);
  });

  it('zaman aşımını 504 olarak eşler', async () => {
    const timeout = new Error('aborted'); timeout.name = 'AbortError';
    const provider = providerWith(vi.fn().mockRejectedValue(timeout));
    const response = await request(createApp(config, { aiProvider: provider })).post('/api/ai/analyze-image')
      .attach('photo', png, { filename: 'a.png', contentType: 'image/png' });
    expect(response.status).toBe(504);
  });

  it('geçersiz AI çıktısını 502 yapar ve sağlayıcı detayını sızdırmaz', async () => {
    const provider = providerWith(vi.fn().mockRejectedValue(new InvalidAIOutputError('secret upstream detail')));
    const response = await request(createApp(config, { aiProvider: provider })).post('/api/ai/analyze-image')
      .attach('photo', png, { filename: 'a.png', contentType: 'image/png' });
    expect(response.status).toBe(502);
    expect(JSON.stringify(response.body)).not.toContain('secret upstream detail');
  });

  it('sağlayıcının şema dışı sonucunu istemciye geçirmez', async () => {
    const provider = providerWith(vi.fn().mockResolvedValue({ categoryId: 'invented', confidence: 2 }));
    const response = await request(createApp(config, { aiProvider: provider })).post('/api/ai/analyze-image')
      .attach('photo', png, { filename: 'a.png', contentType: 'image/png' });
    expect(response.status).toBe(502);
  });

  it('upstream hata ayrıntısını sızdırmaz', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const upstreamError = Object.assign(new Error('sk-secret upstream failure'), {
        status: 401,
        code: 'invalid_api_key',
        type: 'authentication_error',
        request_id: 'req_safe_123',
      });
      const provider = providerWith(vi.fn().mockRejectedValue(upstreamError));
      const response = await request(createApp(config, { aiProvider: provider })).post('/api/ai/analyze-image')
        .attach('photo', png, { filename: 'a.png', contentType: 'image/png' });
      expect(response.status).toBe(502);
      expect(JSON.stringify(response.body)).not.toContain('sk-secret');
      expect(warning).toHaveBeenCalledWith('ai_upstream_error', {
        status: 401,
        code: undefined,
        type: undefined,
        requestId: 'req_safe_123',
        kind: 'Error',
      });
      expect(JSON.stringify(warning.mock.calls)).not.toContain('sk-secret');
    } finally {
      warning.mockRestore();
    }
  });

  it('gerçek Gemini ApiError şekilli kota hatasını güvenli metadata ile 503 olarak eşler', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const secret = 'private quota detail sk-secret';
      const upstreamError = new ApiError({
        status: 429,
        message: JSON.stringify({ error: { status: 'RESOURCE_EXHAUSTED', message: secret, details: [{ reason: 'RATE_LIMIT_EXCEEDED', message: secret }] } }),
      });
      const provider = providerWith(vi.fn().mockRejectedValue(upstreamError));
      const response = await request(createApp(config, { aiProvider: provider })).post('/api/ai/analyze-image')
        .attach('photo', png, { filename: 'a.png', contentType: 'image/png' });
      expect(response.status).toBe(503);
      expect(response.body).toEqual({ error: 'AI servisi yoğun. Lütfen tekrar deneyin.' });
      expect(warning).toHaveBeenCalledWith('ai_upstream_error', expect.objectContaining({
        status: 429,
        providerStatus: 'RESOURCE_EXHAUSTED',
        reason: 'RATE_LIMIT_EXCEEDED',
        kind: 'ApiError',
      }));
      expect(JSON.stringify(warning.mock.calls)).not.toContain(secret);
      expect(JSON.stringify(response.body)).not.toContain(secret);
    } finally {
      warning.mockRestore();
    }
  });

  it('Gemini invalid key mesajından yalnızca enum metadata çıkarır', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const secret = 'AIza-secret-value must never leak';
      const upstreamError = new ApiError({
        status: 400,
        message: JSON.stringify({ error: { status: 'INVALID_ARGUMENT', message: secret, details: [{ reason: 'API_KEY_INVALID', message: secret }] } }),
      });
      const provider = providerWith(vi.fn().mockRejectedValue(upstreamError));
      const response = await request(createApp(config, { aiProvider: provider })).post('/api/ai/analyze-image')
        .attach('photo', png, { filename: 'a.png', contentType: 'image/png' });
      expect(response.status).toBe(502);
      expect(warning).toHaveBeenCalledWith('ai_upstream_error', expect.objectContaining({
        status: 400,
        providerStatus: 'INVALID_ARGUMENT',
        reason: 'API_KEY_INVALID',
        kind: 'ApiError',
      }));
      expect(JSON.stringify(warning.mock.calls)).not.toContain(secret);
      expect(JSON.stringify(response.body)).not.toContain(secret);
    } finally {
      warning.mockRestore();
    }
  });
});

describe('imageAnalysisSchema', () => {
  it('yalnızca izin verilen kategorileri ve 0..1 güven aralığını kabul eder', () => {
    expect(imageAnalysisSchema.safeParse({ categoryId: 'other', confidence: 0 }).success).toBe(true);
    expect(imageAnalysisSchema.safeParse({ categoryId: 'unknown', confidence: 0.5 }).success).toBe(false);
    expect(imageAnalysisSchema.safeParse({ categoryId: 'pothole', confidence: 1.01 }).success).toBe(false);
    expect(imageAnalysisSchema.safeParse({ categoryId: 'pothole', confidence: Number.NaN }).success).toBe(false);
    expect(imageAnalysisSchema.safeParse({ categoryId: 'pothole', confidence: 0.5, extra: true }).success).toBe(false);
  });
});
