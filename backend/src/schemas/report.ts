import { z } from 'zod';

export const categories = ['pothole', 'sidewalk_damage', 'overflowing_bin', 'litter', 'damaged_city_equipment', 'other'] as const;
export const OTHER_DEFAULT_DESCRIPTION = 'Belirtilen konumda belediyenin incelemesini gerektiren bir sorun bulunmaktadır.';
export const FORBIDDEN_MULTILINE_CONTROLS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u;
const FORBIDDEN_SINGLE_LINE_CONTROLS = /[\u0000-\u001F\u007F]/u;

const nullableText = (max: number, forbidden: RegExp) => z.preprocess(
  value => typeof value === 'string' && value.trim() === '' ? null : value,
  z.string().trim().max(max).refine(value => !forbidden.test(value), 'Geçersiz kontrol karakteri.').nullable(),
);
const description = z.string().trim()
  .refine(value => { const length = Array.from(value).length; return length >= 10 && length <= 1000; }, 'Açıklama 10-1000 Unicode karakter olmalıdır.')
  .refine(value => !FORBIDDEN_MULTILINE_CONTROLS.test(value), 'Geçersiz kontrol karakteri.');

export const reportMetadataSchema = z.object({
  id: z.uuid(), categoryId: z.enum(categories), aiCategoryId: z.enum(categories).nullable(), aiConfidence: z.number().min(0).max(1).nullable(),
  description, descriptionEdited: z.boolean(), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), accuracy: z.number().nonnegative().nullable(),
  address: nullableText(1000, FORBIDDEN_MULTILINE_CONTROLS), capturedAt: z.number().int(), locationPrecision: z.enum(['precise', 'approximate']), locationIsMocked: z.boolean().nullable(),
  city: nullableText(200, FORBIDDEN_SINGLE_LINE_CONTROLS), subregion: nullableText(200, FORBIDDEN_SINGLE_LINE_CONTROLS), district: nullableText(200, FORBIDDEN_SINGLE_LINE_CONTROLS),
  postalCode: nullableText(40, FORBIDDEN_SINGLE_LINE_CONTROLS), countryCode: z.preprocess(value => typeof value === 'string' && value.trim() === '' ? null : value, z.string().regex(/^[A-Z]{2}$/).nullable()),
}).superRefine((value, context) => {
  const now = Date.now();
  if (value.capturedAt < now - 7 * 86_400_000 || value.capturedAt > now + 300_000) context.addIssue({ code: 'custom', path: ['capturedAt'], message: 'Konum zamanı geçerli aralıkta değil.' });
  if (value.categoryId === 'other' && value.description.trim() === OTHER_DEFAULT_DESCRIPTION.trim()) context.addIssue({ code: 'custom', path: ['description'], message: 'Diğer kategorisi açıklaması özelleştirilmelidir.' });
});
export type ReportMetadata = z.infer<typeof reportMetadataSchema>;
export function parseMetadata(value: unknown) { return reportMetadataSchema.parse(JSON.parse(z.string().parse(value))); }
