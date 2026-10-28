import { describe, expect, it } from 'vitest';

import { applyAnalysisResult, applyUserCategorySelection } from '../../../mobile/src/services/reportDraftSelection.ts';
import type { ReportDraft } from '../../../mobile/src/types/report.ts';

function draft(overrides: Partial<ReportDraft> = {}): ReportDraft {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    photoUri: 'file:///cache/photo.jpg',
    photoMimeType: 'image/jpeg',
    photoSource: 'library',
    aiSuggestion: null,
    selectedCategoryId: null,
    categorySelectionSource: null,
    location: null,
    description: '',
    descriptionEdited: false,
    status: 'analyzing',
    submittedReportId: null,
    emailDeliveryStatus: null,
    ...overrides,
  };
}

describe('mobile category selection state', () => {
  it.each(['pothole', 'other'] as const)(
    'selects a valid %s AI suggestion automatically',
    (suggestedCategoryId) => {
      const result = applyAnalysisResult(draft(), { suggestedCategoryId, confidence: 0.82 });

      expect(result.aiSuggestion).toEqual({ suggestedCategoryId, confidence: 0.82 });
      expect(result.selectedCategoryId).toBe(suggestedCategoryId);
      expect(result.categorySelectionSource).toBe('ai');
    },
  );

  it('keeps the user choice while updating the separate AI suggestion', () => {
    const userChoice = applyUserCategorySelection(draft(), 'litter');
    const result = applyAnalysisResult(userChoice, { suggestedCategoryId: 'pothole', confidence: 0.91 });

    expect(result.selectedCategoryId).toBe('litter');
    expect(result.categorySelectionSource).toBe('user');
    expect(result.aiSuggestion).toEqual({ suggestedCategoryId: 'pothole', confidence: 0.91 });
  });

  it('allows a later AI result to replace an earlier AI-only selection', () => {
    const firstResult = applyAnalysisResult(draft(), { suggestedCategoryId: 'pothole', confidence: 0.55 });
    const secondResult = applyAnalysisResult(firstResult, { suggestedCategoryId: 'sidewalk_damage', confidence: 0.88 });

    expect(secondResult.selectedCategoryId).toBe('sidewalk_damage');
    expect(secondResult.categorySelectionSource).toBe('ai');
  });

  it('preserves an edited description when the category changes', () => {
    const result = applyUserCategorySelection(draft({
      description: 'Kullanıcının özel açıklaması',
      descriptionEdited: true,
    }), 'other');

    expect(result.description).toBe('Kullanıcının özel açıklaması');
  });
});
