import { imageAnalysisSchema } from '../schemas/analysis.js';
import { InvalidAIOutputError, type AIProvider } from './aiProvider.js';
const AI_TIMEOUT_MS = 30_000;
export class AIUnavailableError extends Error {}
export class AITimeoutError extends Error {}
export async function analyzeWithTimeout(provider: AIProvider | null, buffer: Buffer, mime: string) { if (!provider) throw new AIUnavailableError('AI servisi yapılandırılmamış.'); const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS); try { const result = imageAnalysisSchema.safeParse(await provider.analyzeImage(buffer, mime, controller.signal)); if (!result.success) throw new InvalidAIOutputError('AI çıktısı şemaya uymuyor.'); return result.data; } catch (error) { if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) throw new AITimeoutError('AI isteği zaman aşımına uğradı.'); throw error; } finally { clearTimeout(timer); } }
