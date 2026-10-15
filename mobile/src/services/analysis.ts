import { ISSUE_CATEGORIES } from '@/constants/categories';
import type { AnalysisResult, IssueCategoryId } from '@/types/report';

const API_TIMEOUT_MS = 40_000;

function isCategoryId(value: unknown): value is IssueCategoryId {
  return typeof value === 'string' && ISSUE_CATEGORIES.some((category) => category.id === value);
}

function parseAnalysis(value: unknown): AnalysisResult {
  if (!value || typeof value !== 'object') throw new Error('AI servisinden geçersiz yanıt alındı.');
  const result = value as { categoryId?: unknown; confidence?: unknown };
  if (!isCategoryId(result.categoryId)
    || typeof result.confidence !== 'number'
    || !Number.isFinite(result.confidence)
    || result.confidence < 0
    || result.confidence > 1) {
    throw new Error('AI servisinden geçersiz yanıt alındı.');
  }
  return { suggestedCategoryId: result.categoryId, confidence: result.confidence };
}

export async function analyzePhoto(uri: string): Promise<AnalysisResult> {
  if (!uri) throw new Error('Analiz için bir fotoğraf gerekli.');
  const base = process.env.EXPO_PUBLIC_API_URL;
  if (!base) throw new Error('EXPO_PUBLIC_API_URL tanımlı değil.');
  const ext = uri.split('?')[0]?.split('.').pop()?.toLowerCase();
  const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const form = new FormData();
  form.append('photo', { uri, name: `analysis.${ext === 'png' || ext === 'webp' ? ext : 'jpg'}`, type } as unknown as Blob);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const response = await fetch(`${base.replace(/\/$/, '')}/api/ai/analyze-image`, { method: 'POST', body: form, signal: controller.signal });
    let body: unknown;
    if (response.headers.get('content-type')?.includes('application/json')) {
      try { body = await response.json(); } catch { body = undefined; }
    }
    if (!response.ok) throw new Error('Fotoğraf otomatik analiz edilemedi.');
    return parseAnalysis(body);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('Fotoğraf analizi zaman aşımına uğradı.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
