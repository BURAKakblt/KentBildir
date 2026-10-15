import { z } from 'zod';
import { categories } from './report.js';
export const imageAnalysisSchema = z.object({ categoryId: z.enum(categories), confidence: z.number().finite().min(0).max(1) }).strict();
export type ImageAnalysis = z.infer<typeof imageAnalysisSchema>;
