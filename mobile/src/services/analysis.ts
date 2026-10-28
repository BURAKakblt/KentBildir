import { ISSUE_CATEGORIES } from '@/constants/categories';
import { appendPhotoToFormData, PhotoPreparationError } from '@/services/photoMultipart';
import { PhotoValidationError } from '@/services/photoUpload';
import type { AnalysisResult, IssueCategoryId } from '@/types/report';

export const ANALYSIS_TIMEOUT_MS = 40_000;
class UserFacingAnalysisError extends Error {}

function isCategoryId(value: unknown): value is IssueCategoryId {
  return typeof value === 'string' && ISSUE_CATEGORIES.some((category) => category.id === value);
}

function parseAnalysis(value: unknown): AnalysisResult {
  if (!value || typeof value !== 'object') throw new UserFacingAnalysisError('AI servisinden geçersiz yanıt alındı.');
  const result = value as { categoryId?: unknown; confidence?: unknown };
  if (!isCategoryId(result.categoryId)
    || typeof result.confidence !== 'number'
    || !Number.isFinite(result.confidence)
    || result.confidence < 0
    || result.confidence > 1) {
    throw new UserFacingAnalysisError('AI servisinden geçersiz yanıt alındı.');
  }
  return { suggestedCategoryId: result.categoryId, confidence: result.confidence };
}

function apiBase() {
  const base = process.env.EXPO_PUBLIC_API_URL;
  if (!base) throw new Error('Sunucu adresi yapılandırılmamış.');
  try {
    const url = new URL(base);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('unsupported protocol');
  } catch {
    throw new Error('Sunucu adresi geçersiz.');
  }
  return base.replace(/\/$/, '');
}

function responseError(status: number) {
  if (status === 400 || status === 413) return 'Fotoğraf JPEG, PNG veya WebP formatında ve en fazla 8 MB olmalıdır.';
  if (status === 502) return 'AI analizi tamamlanamadı. Lütfen tekrar deneyin.';
  if (status === 503) return 'AI servisi şu anda kullanılamıyor. Lütfen tekrar deneyin.';
  if (status === 504) return 'Fotoğraf analizi zaman aşımına uğradı. Lütfen tekrar deneyin.';
  return 'Fotoğraf otomatik analiz edilemedi. Lütfen tekrar deneyin.';
}

async function jsonBody(response: Response): Promise<unknown> {
  if (!response.headers.get('content-type')?.includes('application/json')) return undefined;
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

export async function analyzePhoto(uri: string, accessToken: string, mimeType: string | null = null): Promise<AnalysisResult> {
  if (!uri) throw new Error('Analiz için bir fotoğraf gerekli.');
  const base = apiBase();
  const form = new FormData();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ANALYSIS_TIMEOUT_MS);
  try {
    await appendPhotoToFormData(form, 'photo', uri, mimeType, 'analysis');
    const response = await fetch(`${base.replace(/\/$/, '')}/api/ai/analyze-image`, { method: 'POST', body: form, signal: controller.signal, headers: { Authorization: `Bearer ${accessToken}` } });
    const body = await jsonBody(response);
    if (response.status === 401) throw new UserFacingAnalysisError('Oturumunuz doğrulanamadı. Lütfen tekrar deneyin.');
    if (!response.ok) throw new UserFacingAnalysisError(responseError(response.status));
    return parseAnalysis(body);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('Fotoğraf analizi zaman aşımına uğradı.');
    if (error instanceof PhotoPreparationError || error instanceof PhotoValidationError || error instanceof UserFacingAnalysisError) throw error;
    if (error instanceof TypeError) throw new Error('Sunucuya ulaşılamadı. Aynı Wi-Fi ağında olduğunuzu kontrol edin.');
    throw new Error('Fotoğraf analiz için hazırlanamadı. Fotoğrafı yeniden seçip tekrar deneyin.');
  } finally {
    clearTimeout(timer);
  }
}
