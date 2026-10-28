import { getDefaultDescription } from '@/services/description';
import type { AnalysisResult, IssueCategoryId, ReportDraft } from '@/types/report';

export function applyAnalysisResult(
  state: ReportDraft,
  result: AnalysisResult,
): ReportDraft {
  const userSelectedCategoryId = state.categorySelectionSource === 'user'
    ? state.selectedCategoryId
    : null;
  const selectedCategoryId = userSelectedCategoryId ?? result.suggestedCategoryId;

  return {
    ...state,
    aiSuggestion: result,
    selectedCategoryId,
    categorySelectionSource: userSelectedCategoryId ? 'user' : 'ai',
    description: state.descriptionEdited
      ? state.description
      : getDefaultDescription(selectedCategoryId),
    status: 'analyzed',
  };
}

export function applyUserCategorySelection(
  state: ReportDraft,
  categoryId: IssueCategoryId,
): ReportDraft {
  return {
    ...state,
    selectedCategoryId: categoryId,
    categorySelectionSource: 'user',
    description: state.descriptionEdited
      ? state.description
      : getDefaultDescription(categoryId),
  };
}
