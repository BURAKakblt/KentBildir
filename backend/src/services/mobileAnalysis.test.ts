import { afterEach, describe, expect, it, vi } from 'vitest';
import { ANALYSIS_TIMEOUT_MS, analyzePhoto } from '../../../mobile/src/services/analysis.ts';
import { createPhotoUpload } from '../../../mobile/src/services/photoUpload.ts';

class FormDataStub {
  entries: Array<[string, unknown]> = [];

  append(name: string, value: unknown) {
    this.entries.push([name, value]);
  }
}

function response(status: number, body: unknown, contentType = 'application/json') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => contentType },
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe('mobile image analysis', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    delete process.env.EXPO_PUBLIC_API_URL;
  });

  it('uses the picker MIME type instead of guessing from the URI', async () => {
    process.env.EXPO_PUBLIC_API_URL = 'https://api.example.test/';
    vi.stubGlobal('FormData', FormDataStub);
    const fetchMock = vi.fn().mockResolvedValue(response(200, { categoryId: 'pothole', confidence: 0.8 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(analyzePhoto('file:///cache/opaque-name', 'test-token', 'image/png')).resolves.toEqual({ suggestedCategoryId: 'pothole', confidence: 0.8 });
    expect(fetchMock).toHaveBeenCalledWith('https://api.example.test/api/ai/analyze-image', expect.objectContaining({
      method: 'POST',
      signal: expect.any(AbortSignal),
      headers: { Authorization: 'Bearer test-token' },
    }));
    const form = fetchMock.mock.calls[0]?.[1]?.body as FormDataStub;
    expect(form.entries).toEqual([['photo', { uri: 'file:///cache/opaque-name', name: 'analysis.png', type: 'image/png' }]]);
  });

  it('rejects unsupported iPhone photo formats before uploading', async () => {
    process.env.EXPO_PUBLIC_API_URL = 'https://api.example.test';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(() => createPhotoUpload('file:///cache/IMG.HEIC', 'image/heic', 'analysis')).toThrow('JPEG, PNG veya WebP');
    await expect(analyzePhoto('file:///cache/IMG.HEIC', 'test-token', 'image/heic')).rejects.toThrow('JPEG, PNG veya WebP');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [400, 'Fotoğraf JPEG, PNG veya WebP formatında ve en fazla 8 MB olmalıdır.'],
    [413, 'Fotoğraf JPEG, PNG veya WebP formatında ve en fazla 8 MB olmalıdır.'],
    [502, 'AI analizi tamamlanamadı. Lütfen tekrar deneyin.'],
    [503, 'AI servisi şu anda kullanılamıyor. Lütfen tekrar deneyin.'],
    [504, 'Fotoğraf analizi zaman aşımına uğradı. Lütfen tekrar deneyin.'],
    [500, 'Fotoğraf otomatik analiz edilemedi. Lütfen tekrar deneyin.'],
  ])('maps HTTP %i to a safe client error', async (status, message) => {
    process.env.EXPO_PUBLIC_API_URL = 'https://api.example.test';
    vi.stubGlobal('FormData', FormDataStub);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(status, { error: 'upstream detail must not be exposed' })));
    await expect(analyzePhoto('file:///cache/photo.jpg', 'test-token', 'image/jpeg')).rejects.toThrow(message);
  });

  it('handles timeout, unavailable server, and malformed success responses safely', async () => {
    process.env.EXPO_PUBLIC_API_URL = 'https://api.example.test';
    vi.stubGlobal('FormData', FormDataStub);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network detail')));
    await expect(analyzePhoto('file:///cache/photo.jpg', 'test-token', 'image/jpeg')).rejects.toThrow('Sunucuya ulaşılamadı');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, { categoryId: 'not-a-category', confidence: 2 })));
    await expect(analyzePhoto('file:///cache/photo.jpg', 'test-token', 'image/jpeg')).rejects.toThrow('geçersiz yanıt');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, null, 'text/plain')));
    await expect(analyzePhoto('file:///cache/photo.jpg', 'test-token', 'image/jpeg')).rejects.toThrow('geçersiz yanıt');

    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => init.signal?.addEventListener('abort', () => reject(new DOMException('raw timeout', 'AbortError'))))));
    const pending = analyzePhoto('file:///cache/photo.jpg', 'test-token', 'image/jpeg');
    const expectation = expect(pending).rejects.toThrow('zaman aşımına uğradı');
    await vi.advanceTimersByTimeAsync(ANALYSIS_TIMEOUT_MS);
    await expectation;
  });
});
