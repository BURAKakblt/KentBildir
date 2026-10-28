import { createHash, randomUUID } from 'node:crypto';
import type { Supabase } from '../lib/supabase.js';
import type { ReportMetadata } from '../schemas/report.js';
import { validateImage } from './imageValidation.js';
export { FileValidationError } from './imageValidation.js';

const BUCKET = 'report-images';
export class ConflictError extends Error {}
function hash(meta: ReportMetadata, file: Buffer) { return createHash('sha256').update(JSON.stringify(meta)).update(file).digest('hex'); }
async function cleanup(db: Supabase, path: string) { try { const result = await db.storage.from(BUCKET).remove([path]); if (result.error) console.warn('storage_cleanup_failed', { path, code: (result.error as { statusCode?: string }).statusCode ?? 'storage_error' }); } catch { console.warn('storage_cleanup_failed', { path, code: 'unexpected' }); } }
async function existing(db: Supabase, id: string, ownerId: string) { const result = await db.from('reports').select('*').eq('id', id).eq('owner_id', ownerId).maybeSingle(); if (result.error) throw result.error; return result.data; }

export async function createReport(db: Supabase, meta: ReportMetadata, file: Express.Multer.File, ownerId: string) {
  const detected = await validateImage(file);
  const payloadHash = hash(meta, file.buffer);
  const found = await existing(db, meta.id, ownerId);
  if (found) {
    if (found.payload_hash === payloadHash) return { report: found, created: false } as const;
    throw new ConflictError('Bu bildirim kimliği farklı içerikle daha önce kullanılmış.');
  }
  const path = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${detected.ext}`;
  const uploaded = await db.storage.from(BUCKET).upload(path, file.buffer, { contentType: detected.mime, upsert: false });
  if (uploaded.error) throw uploaded.error;
  const row = { id: meta.id, owner_id: ownerId, category_id: meta.categoryId, ai_category_id: meta.aiCategoryId, ai_confidence: meta.aiConfidence, description: meta.description, latitude: meta.latitude, longitude: meta.longitude, accuracy_m: meta.accuracy, address: meta.address, captured_at: new Date(meta.capturedAt).toISOString(), location_precision: meta.locationPrecision, location_is_mocked: meta.locationIsMocked, city: meta.city, subregion: meta.subregion, district: meta.district, postal_code: meta.postalCode, country_code: meta.countryCode, photo_path: path, status: 'submitted', payload_hash: payloadHash };
  const inserted = await db.from('reports').insert(row).select('*').single();
  if (inserted.error) {
    await cleanup(db, path);
    if (inserted.error.code === '23505') {
      const winner = await existing(db, meta.id, ownerId);
      if (winner?.payload_hash === payloadHash) return { report: winner, created: false } as const;
      throw new ConflictError('Bu bildirim kimliği kullanılamıyor. Yeni bir taslakla tekrar deneyin.');
    }
    throw inserted.error;
  }
  return { report: inserted.data, created: true, image: { buffer: file.buffer, mime: detected.mime, ext: detected.ext } } as const;
}
export async function getReport(db: Supabase, id: string, ownerId: string) { return existing(db, id, ownerId); }
export class ReportPhotoDownloadError extends Error {}
export async function getReportPhoto(db: Supabase, path: string) {
  const result = await db.storage.from(BUCKET).download(path);
  if (result.error || !result.data) throw new ReportPhotoDownloadError('photo_download_failed');
  const mimeByExtension: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
  const extension = path.split('.').pop()?.toLowerCase() ?? '';
  const mime = result.data.type && ['image/jpeg', 'image/png', 'image/webp'].includes(result.data.type) ? result.data.type : mimeByExtension[extension];
  if (!mime) throw new ReportPhotoDownloadError('photo_type_invalid');
  return { buffer: Buffer.from(await result.data.arrayBuffer()), mime };
}
