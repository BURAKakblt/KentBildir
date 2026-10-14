import type { AnalysisResult } from '@/types/report';

const MOCK_ANALYSIS_DELAY_MS = 700;

export async function analyzePhoto(uri: string): Promise<AnalysisResult> {
  if (!uri) throw new Error('Analiz için bir fotoğraf gerekli.');

  await new Promise((resolve) => setTimeout(resolve, MOCK_ANALYSIS_DELAY_MS));

  return {
    suggestedCategoryId: 'sidewalk_damage',
    confidence: 0.92,
  };
}
