import { describe, expect, it } from 'vitest';

import { getReportValidationIssues } from '../../../mobile/src/services/reportValidation.ts';
import { emailStatusLabel } from '../../../mobile/src/services/reportPresentation.ts';
import type { ReportDraft } from '../../../mobile/src/types/report.ts';

function validDraft(overrides: Partial<ReportDraft> = {}): ReportDraft {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    photoUri: 'file:///cache/photo.jpg',
    photoMimeType: 'image/jpeg',
    photoSource: 'library',
    aiSuggestion: { suggestedCategoryId: 'other', confidence: 0.99 },
    selectedCategoryId: 'other',
    categorySelectionSource: 'user',
    location: {
      latitude: 41,
      longitude: 29,
      accuracy: 5,
      address: null,
      capturedAt: Date.now(),
      isMocked: false,
      precision: 'precise',
      city: null,
      subregion: null,
      district: null,
      postalCode: null,
      countryCode: null,
    },
    description: 'Sınıflandırılamayan sorun için kullanıcı tarafından düzenlenen açıklama.',
    descriptionEdited: true,
    status: 'analyzed',
    submittedReportId: null,
    emailDeliveryStatus: null,
    ...overrides,
  };
}

describe('mobile submission UX', () => {
  it('geçerli Diğer taslağını kabul eder', () => {
    expect(getReportValidationIssues(validDraft())).toEqual([]);
  });

  it('eksik alanları ayrı ve düzeltilebilir mesajlarla listeler', () => {
    expect(getReportValidationIssues(validDraft({ photoUri: null, selectedCategoryId: null, location: null, description: '' }))).toEqual([
      'Fotoğraf ekleyin.',
      'Sorun türünü seçin.',
      'Konum bilgisini alın.',
      'Açıklama girin.',
    ]);
  });

  it('Diğer kategorisinin varsayılan açıklamasını geçerli saymaz', () => {
    expect(getReportValidationIssues(validDraft({ description: 'Belirtilen konumda belediyenin incelemesini gerektiren bir sorun bulunmaktadır.' }))).toContain(
      'Diğer kategorisi için açıklamayı soruna göre düzenleyin.',
    );
  });

  it('e-posta durumunu kayıt durumundan ayrı ve doğru ifade eder', () => {
    expect(emailStatusLabel('disabled')).toBe('E-posta iletimi devre dışı');
    expect(emailStatusLabel('failed')).toBe('E-posta iletimi tamamlanamadı');
    expect(emailStatusLabel('sent')).toBe('E-posta iletildi');
  });
});
