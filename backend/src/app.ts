import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import multer from 'multer';
import { rateLimit } from 'express-rate-limit';
import type { Config } from './config.js';
import { createSupabase } from './lib/supabase.js';
import { aiRoutes } from './routes/ai.js';
import { reportRoutes } from './routes/reports.js';
import type { AIProvider } from './services/aiProvider.js';
import type { EmailProvider } from './services/emailProvider.js';
import { createGeminiProvider } from './services/geminiProvider.js';
import { createSmtpEmailProvider } from './services/smtpEmailProvider.js';

class CorsError extends Error {}
function safeError(error: unknown) { const value = error as { code?: unknown }; return { code: typeof value.code === 'string' ? value.code : 'internal_error', message: error instanceof CorsError ? 'CORS request rejected' : 'Request failed' }; }

export function createApp(config: Config, dependencies: { aiProvider?: AIProvider | null; emailProvider?: EmailProvider | null; db?: ReturnType<typeof createSupabase> } = {}) {
  const app = express();
  const aiProvider = dependencies.aiProvider !== undefined ? dependencies.aiProvider : config.GEMINI_API_KEY ? createGeminiProvider(config.GEMINI_API_KEY, config.GEMINI_VISION_MODEL) : null;
  const emailProvider = dependencies.emailProvider !== undefined ? dependencies.emailProvider : config.EMAIL_ENABLED ? createSmtpEmailProvider(config) : null;
  app.disable('x-powered-by');
  if (config.NODE_ENV === 'production') app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: (origin, callback) => !origin || config.corsOrigins.includes(origin) ? callback(null, true) : callback(new CorsError('rejected')) }));
  app.use(rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false }));
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/ai', aiRoutes(aiProvider));
  app.use('/api/reports', reportRoutes(dependencies.db ?? createSupabase(config), { enabled: config.EMAIL_ENABLED, provider: emailProvider }));
  app.use((error: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof multer.MulterError) { res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'Fotoğraf 8 MB sınırını aşıyor.' : 'Geçersiz multipart isteği.' }); return; }
    if (error instanceof CorsError) { res.status(403).json({ error: 'CORS origin reddedildi.' }); return; }
    console.error('request_error', { ...safeError(error), requestId: req.header('x-request-id') ?? undefined });
    res.status(500).json({ error: 'Sunucu hatası.' });
  });
  return app;
}
