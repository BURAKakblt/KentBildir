import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import type { Supabase } from '../lib/supabase.js';
import { parseMetadata } from '../schemas/report.js';
import type { EmailProvider } from '../services/emailProvider.js';
import { deliverReportEmail, type EmailStatus } from '../services/emailService.js';
import { ConflictError, createReport, FileValidationError, getReport, getReportPhoto, ReportPhotoDownloadError } from '../services/reportService.js';
import { authenticatedUser } from '../middleware/requireUser.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 1, parts: 2, fieldSize: 16 * 1024, fieldNameSize: 50, headerPairs: 50 } });
const submissionDto = (report: Record<string, unknown>) => ({ id: report.id, status: report.status, created_at: report.created_at });
const detailDto = (report: Record<string, unknown>) => ({
  id: report.id,
  categoryId: report.category_id,
  aiCategoryId: report.ai_category_id,
  aiConfidence: report.ai_confidence,
  description: report.description,
  latitude: report.latitude,
  longitude: report.longitude,
  accuracy: report.accuracy_m,
  address: report.address,
  capturedAt: report.captured_at,
  locationPrecision: report.location_precision,
  city: report.city,
  subregion: report.subregion,
  district: report.district,
  postalCode: report.postal_code,
  countryCode: report.country_code,
  status: report.status,
  emailStatus: report.email_status,
  emailSentAt: report.email_sent_at,
  createdAt: report.created_at,
});
const persistedEmailStatus = (value: unknown): EmailStatus => value === 'pending' || value === 'sent' || value === 'failed' || value === 'disabled' ? value : 'pending';
const extensionByMime: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export function reportRoutes(db: Supabase, email: { enabled: boolean; provider: EmailProvider | null } = { enabled: false, provider: null }) {
  const router = Router();
  router.post('/', upload.single('photo'), async (req, res, next) => {
    try {
      if (Object.keys(req.body).length !== 1 || !Object.hasOwn(req.body, 'metadata')) { res.status(400).json({ error: 'Yalnızca metadata ve photo alanları kabul edilir.' }); return; }
      if (!req.file) { res.status(400).json({ error: 'Fotoğraf zorunludur.' }); return; }
      const meta = parseMetadata(req.body.metadata);
      const result = await createReport(db, meta, req.file, authenticatedUser(res).id);
      const emailStatus = result.created ? await deliverReportEmail({
        db,
        provider: email.provider,
        enabled: email.enabled,
        meta,
        image: async () => {
          const stored = await getReportPhoto(db, String(result.report.photo_path));
          const ext = extensionByMime[stored.mime];
          if (!ext) throw Object.assign(new Error('Stored photo type invalid'), { code: 'STORED_PHOTO_TYPE_INVALID' });
          return { ...stored, ext };
        },
      }) : persistedEmailStatus(result.report.email_status);
      res.status(result.created ? 201 : 200).json({ report: submissionDto(result.report), delivery: { emailStatus } });
    } catch (error) {
      if (error instanceof z.ZodError) { res.status(400).json({ error: 'Geçersiz metadata.', issues: error.issues }); return; }
      if (error instanceof SyntaxError || error instanceof FileValidationError) { res.status(400).json({ error: (error as Error).message }); return; }
      if (error instanceof ConflictError) { res.status(409).json({ error: error.message }); return; }
      next(error);
    }
  });
  router.get('/:id/photo', async (req, res, next) => {
    try {
      const id = z.uuid().parse(req.params.id);
      const report = await getReport(db, id, authenticatedUser(res).id);
      if (!report) { res.status(404).json({ error: 'Bildirim bulunamadı.' }); return; }
      const photo = await getReportPhoto(db, report.photo_path);
      res.set('Content-Type', photo.mime).set('Cache-Control', 'no-store').set('Vary', 'Authorization').send(photo.buffer);
    } catch (error) {
      if (error instanceof z.ZodError) { res.status(400).json({ error: 'Geçersiz ID.' }); return; }
      if (error instanceof ReportPhotoDownloadError) { res.status(502).json({ error: 'Bildirim fotoğrafı alınamadı.' }); return; }
      next(error);
    }
  });
  router.get('/:id', async (req, res, next) => {
    try {
      const report = await getReport(db, z.uuid().parse(req.params.id), authenticatedUser(res).id);
      if (!report) { res.status(404).json({ error: 'Bildirim bulunamadı.' }); return; }
      res.set('Cache-Control', 'no-store').set('Vary', 'Authorization').json({ report: detailDto(report) });
    } catch (error) {
      if (error instanceof z.ZodError) { res.status(400).json({ error: 'Geçersiz ID.' }); return; }
      next(error);
    }
  });
  return router;
}
