import { createPhotoUpload } from '@/services/photoUpload';
import type { EmailDeliveryStatus, ReportDraft } from '@/types/report';

export interface SubmittedReport { id: string; status: string; created_at: string }
export interface SubmitReportResult { report: SubmittedReport; emailStatus: EmailDeliveryStatus }
export interface ReportDetail {
  id: string; categoryId: ReportDraft['selectedCategoryId']; aiCategoryId: ReportDraft['selectedCategoryId']; aiConfidence: number | null;
  description: string; latitude: number; longitude: number; accuracy: number | null; address: string | null; capturedAt: string;
  locationPrecision: 'precise' | 'approximate'; city: string | null; subregion: string | null; district: string | null;
  postalCode: string | null; countryCode: string | null; status: string; emailStatus: EmailDeliveryStatus; emailSentAt: string | null; createdAt: string;
}
const API_TIMEOUT_MS = 40_000;
export const GET_REPORT_TIMEOUT_MS = 15_000;
const authorizationHeaders = (accessToken: string) => ({ Authorization: `Bearer ${accessToken}` });

export function normalizeEmailDeliveryStatus(value: unknown): EmailDeliveryStatus {
  return value === 'sent' || value === 'failed' || value === 'disabled' || value === 'pending' ? value : 'disabled';
}

function apiBase() { const base = process.env.EXPO_PUBLIC_API_URL; if (!base) throw new Error('Sunucu adresi yapılandırılmamış.'); return base.replace(/\/$/, ''); }

export function getReportPhotoSource(id: string, accessToken: string) { return { uri: `${apiBase()}/api/reports/${encodeURIComponent(id)}/photo`, headers: authorizationHeaders(accessToken) }; }

export async function getReport(id: string, accessToken: string): Promise<ReportDetail> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GET_REPORT_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${apiBase()}/api/reports/${encodeURIComponent(id)}`, { signal: controller.signal, headers: authorizationHeaders(accessToken) });
    if (response.status === 401) throw new Error('Oturumunuz doğrulanamadı. Lütfen tekrar deneyin.');
    if (response.status === 400) throw new Error('Bildirim kimliği geçersiz.');
    if (response.status === 404) throw new Error('Bildirim bulunamadı.');
    if (!response.ok) throw new Error('Bildirim bilgileri alınamadı. Lütfen tekrar deneyin.');
    const body = await response.json() as { report?: ReportDetail };
    if (!body.report) throw new Error('invalid');
    return { ...body.report, emailStatus: normalizeEmailDeliveryStatus(body.report.emailStatus) };
  } catch (error) {
    if (error instanceof Error && ['Oturumunuz doğrulanamadı. Lütfen tekrar deneyin.', 'Bildirim kimliği geçersiz.', 'Bildirim bulunamadı.', 'Bildirim bilgileri alınamadı. Lütfen tekrar deneyin.'].includes(error.message)) throw error;
    if (controller.signal.aborted || error instanceof TypeError) throw new Error('Sunucuya ulaşılamadı. Lütfen tekrar deneyin.');
    throw new Error('Sunucudan geçersiz yanıt alındı.');
  } finally { clearTimeout(timer); }
}

export async function submitReport(draft: ReportDraft, accessToken: string): Promise<SubmitReportResult> {
  const base = apiBase();
  if (!draft.photoUri || !draft.location || !draft.selectedCategoryId) throw new Error('Taslak eksik.');
  const location = draft.location;
  const metadata = { id: draft.id, categoryId: draft.selectedCategoryId, aiCategoryId: draft.aiSuggestion?.suggestedCategoryId ?? null, aiConfidence: draft.aiSuggestion?.confidence ?? null, description: draft.description, descriptionEdited: draft.descriptionEdited, latitude: location.latitude, longitude: location.longitude, accuracy: location.accuracy, address: location.address, capturedAt: location.capturedAt, locationPrecision: location.precision, locationIsMocked: location.isMocked, city: location.city, subregion: location.subregion, district: location.district, postalCode: location.postalCode, countryCode: location.countryCode };
  const form = new FormData();
  form.append('metadata', JSON.stringify(metadata));
  form.append('photo', createPhotoUpload(draft.photoUri, draft.photoMimeType, 'report') as unknown as Blob);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const response = await fetch(`${base}/api/reports`, { method: 'POST', body: form, signal: controller.signal, headers: authorizationHeaders(accessToken) });
    let body: { error?: string; report?: SubmittedReport; delivery?: { emailStatus?: EmailDeliveryStatus } } = {};
    if (response.headers.get('content-type')?.includes('application/json')) { try { body = await response.json(); } catch { body = {}; } }
    if (response.status === 401) throw new Error('Oturumunuz doğrulanamadı. Formunuz korunuyor; tekrar deneyin.');
    if (response.status === 409) throw new Error('Bu bildirim kimliği kullanılamıyor. Formunuz korunuyor; yeni taslakla tekrar deneyin.');
    if (!response.ok) throw new Error(body.error ?? 'Sunucu bildirimi kabul etmedi. Lütfen tekrar deneyin.');
    if (!body.report) throw new Error('Sunucudan geçersiz yanıt alındı.');
    const emailStatus = normalizeEmailDeliveryStatus(body.delivery?.emailStatus);
    return { report: body.report, emailStatus };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('Sunucuya ulaşılamadı. Bildiriminiz kaydedilmiş olabilir. Tekrar göndermek güvenlidir; formunuz korunuyor.');
    if (error instanceof TypeError) throw new Error('Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin; formunuz korunuyor.');
    throw error;
  } finally { clearTimeout(timer); }
}
