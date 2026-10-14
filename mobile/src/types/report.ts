import type { ISSUE_CATEGORIES, REPORT_STATUSES } from '@/constants/categories';

export type IssueCategoryId = (typeof ISSUE_CATEGORIES)[number]['id'];
export type ReportStatusId = (typeof REPORT_STATUSES)[number]['id'];
export type PhotoSource = 'camera' | 'library';
export type ReportDraftStatus = 'idle' | 'photo_selected' | 'analyzing' | 'analyzed';

export interface AnalysisResult {
  suggestedCategoryId: IssueCategoryId;
  confidence: number;
}

export interface ReportDraft {
  photoUri: string | null;
  photoSource: PhotoSource | null;
  aiSuggestion: AnalysisResult | null;
  selectedCategoryId: IssueCategoryId | null;
  location: null;
  description: string;
  status: ReportDraftStatus;
}

export interface ReportSummary {
  id: string;
  categoryId: IssueCategoryId;
  createdAt: string;
  statusId: ReportStatusId;
}
