import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import multer from 'multer';
import { InvalidAIOutputError, type AIProvider } from '../services/aiProvider.js';
import { AITimeoutError, AIUnavailableError, analyzeWithTimeout } from '../services/aiService.js';
import { FileValidationError, validateImage } from '../services/imageValidation.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 0, parts: 1, fieldNameSize: 50, headerPairs: 50 } });

function enumLike(value: unknown) {
  return typeof value === 'string' && /^[A-Z][A-Z0-9_]{0,63}$/.test(value) ? value : undefined;
}

function geminiMessageMetadata(message: unknown) {
  if (typeof message !== 'string') return {};
  try {
    const parsed = JSON.parse(message) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const providerError = (parsed as Record<string, unknown>).error;
    if (!providerError || typeof providerError !== 'object') return {};
    const value = providerError as Record<string, unknown>;
    const details = Array.isArray(value.details) ? value.details : [];
    const reason = details.map(detail => detail && typeof detail === 'object'
      ? enumLike((detail as Record<string, unknown>).reason)
      : undefined).find(Boolean);
    return { providerStatus: enumLike(value.status), reason };
  } catch {
    return {};
  }
}

function safeUpstreamMetadata(error: unknown) {
  const value = error !== null && typeof error === 'object' ? error as Record<string, unknown> : {};
  const requestId = value.request_id ?? value.requestID;
  const gemini = geminiMessageMetadata(error instanceof Error ? error.message : undefined);
  return {
    status: typeof value.status === 'number' ? value.status : undefined,
    code: enumLike(value.code),
    type: enumLike(value.type),
    ...gemini,
    requestId: typeof requestId === 'string' ? requestId : undefined,
    kind: error instanceof Error ? error.constructor.name : typeof error,
  };
}

function isQuotaError(error: unknown) {
  const metadata = safeUpstreamMetadata(error);
  return metadata.status === 429 || metadata.code === 'RESOURCE_EXHAUSTED'
    || metadata.type === 'RESOURCE_EXHAUSTED' || metadata.providerStatus === 'RESOURCE_EXHAUSTED';
}

export function aiRoutes(provider: AIProvider | null) {
  const router = Router();
  const limiter = rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false });
  router.post('/analyze-image', limiter, upload.single('photo'), async (req, res, next) => {
    try {
      if (!req.file) { res.status(400).json({ error: 'Fotoğraf zorunludur.' }); return; }
      const detected = await validateImage(req.file);
      res.json(await analyzeWithTimeout(provider, req.file.buffer, detected.mime));
    } catch (error) {
      if (error instanceof FileValidationError) { res.status(400).json({ error: error.message }); return; }
      if (error instanceof AIUnavailableError) { res.status(503).json({ error: 'AI servisi şu anda kullanılamıyor.' }); return; }
      if (error instanceof AITimeoutError) { console.warn('ai_upstream_error', safeUpstreamMetadata(error)); res.status(504).json({ error: 'AI analizi zaman aşımına uğradı.' }); return; }
      if (error instanceof InvalidAIOutputError) { console.warn('ai_upstream_error', safeUpstreamMetadata(error)); res.status(502).json({ error: 'AI servisinden geçersiz yanıt alındı.' }); return; }
      console.warn('ai_upstream_error', safeUpstreamMetadata(error));
      const quotaError = isQuotaError(error);
      res.status(quotaError ? 503 : 502).json({ error: quotaError ? 'AI servisi yoğun. Lütfen tekrar deneyin.' : 'AI analizi tamamlanamadı.' });
    }
  });
  return router;
}
