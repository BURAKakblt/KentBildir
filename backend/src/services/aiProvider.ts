import type { ImageAnalysis } from '../schemas/analysis.js';

export interface AIProvider {
  analyzeImage(buffer: Buffer, mime: string, signal: AbortSignal): Promise<ImageAnalysis>;
}

export class InvalidAIOutputError extends Error {}
