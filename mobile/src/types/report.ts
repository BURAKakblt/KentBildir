import type { ISSUE_CATEGORIES, REPORT_STATUSES } from '@/constants/categories';

export type IssueCategoryId = (typeof ISSUE_CATEGORIES)[number]['id'];
export type ReportStatusId = (typeof REPORT_STATUSES)[number]['id'];
export type PhotoSource = 'camera' | 'library';
export type ReportDraftStatus = 'idle' | 'photo_selected' | 'analyzing' | 'analyzed' | 'completed';

export interface ReportLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  address: string | null;
  capturedAt: number;
  isMocked: boolean;
  precision: 'precise' | 'approximate';
}

export interface AnalysisResult {
  suggestedCategoryId: IssueCategoryId;
  confidence: number;
}

export interface ReportDraft {
  id: string;
  photoUri: string | null;
  photoSource: PhotoSource | null;
  aiSuggestion: AnalysisResult | null;
  selectedCategoryId: IssueCategoryId | null;
  location: ReportLocation | null;
  description: string;
  descriptionEdited: boolean;
  status: ReportDraftStatus;
}

export interface ReportSummary {
  id: string;
  categoryId: IssueCategoryId;
  createdAt: string;
  statusId: ReportStatusId;
}
