import { getDefaultDescription } from '@/services/description';
import type { ReportDraft } from '@/types/report';

export function getReportValidationIssues(draft: ReportDraft): string[] {
  const issues: string[] = [];
  const descriptionLength = Array.from(draft.description.trim()).length;

  if (!draft.photoUri) issues.push('Fotoğraf ekleyin.');
  if (!draft.selectedCategoryId) issues.push('Sorun türünü seçin.');
  if (!draft.location) issues.push('Konum bilgisini alın.');

  if (descriptionLength === 0) {
    issues.push('Açıklama girin.');
  } else if (descriptionLength < 10) {
    issues.push('Açıklamayı en az 10 karakter olacak şekilde tamamlayın.');
  } else if (descriptionLength > 1000) {
    issues.push('Açıklamayı en fazla 1000 karakter olacak şekilde kısaltın.');
  } else if (draft.selectedCategoryId === 'other'
    && draft.description.trim() === getDefaultDescription('other').trim()) {
    issues.push('Diğer kategorisi için açıklamayı soruna göre düzenleyin.');
  }

  return issues;
}
