import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { OTHER_DEFAULT_DESCRIPTION, reportMetadataSchema } from './report.js';

const valid = { id: '550e8400-e29b-41d4-a716-446655440000', categoryId: 'pothole', aiCategoryId: null, aiConfidence: null, description: 'Yolda büyük bir çukur var.', descriptionEdited: false, latitude: 37, longitude: 27, accuracy: null, address: null, capturedAt: Date.now(), locationPrecision: 'precise', locationIsMocked: null, city: null, subregion: null, district: null, postalCode: null, countryCode: null };
const accepts = (change: object) => reportMetadataSchema.safeParse({ ...valid, ...change }).success;

describe('report metadata', () => {
  it('temel geçerli girdiyi kabul eder', () => expect(accepts({})).toBe(true));
  it('address içinde LF kabul eder', () => expect(accepts({ address: 'Atatürk Mahallesi\nKuşadası / Aydın' })).toBe(true));
  it('description içinde LF kabul eder', () => expect(accepts({ description: 'Yolda büyük bir çukur var.\nLütfen kontrol edin.' })).toBe(true));
  it('description içinde TAB kabul eder', () => expect(accepts({ description: 'Yolda\tbüyük bir çukur bulunmaktadır.' })).toBe(true));
  it('description içindeki U+0001 karakterini reddeder', () => expect(accepts({ description: 'Yolda büyük\u0001 bir çukur var.' })).toBe(false));
  it('address içindeki U+0001 karakterini reddeder', () => expect(accepts({ address: 'Atatürk\u0001 Mahallesi' })).toBe(false));
  it('10 Unicode code point kabul eder', () => expect(accepts({ description: '😀'.repeat(10) })).toBe(true));
  it('9 Unicode code point reddeder', () => expect(accepts({ description: '😀'.repeat(9) })).toBe(false));
  it('1001 Unicode code point reddeder', () => expect(accepts({ description: 'a'.repeat(1001) })).toBe(false));
  it('country code kuralını korur', () => { expect(accepts({ countryCode: 'T' })).toBe(false); expect(accepts({ countryCode: 'TR' })).toBe(true); });
  it('capturedAt aralığını korur', () => expect(accepts({ capturedAt: Date.now() - 8 * 86_400_000 })).toBe(false));
  it('other varsayılanını reddeder', () => expect(accepts({ categoryId: 'other', description: OTHER_DEFAULT_DESCRIPTION, descriptionEdited: true })).toBe(false));
  it('migration aynı açık karakter politikasını kullanır', () => { const sql = readFileSync('../supabase/migrations/202610140001_create_reports.sql', 'utf8'); expect(sql).not.toContain('[[:cntrl:]]'); expect(sql).toContain('\\\\x00-\\\\x08\\\\x0B\\\\x0C\\\\x0E-\\\\x1F\\\\x7F'); });
});
