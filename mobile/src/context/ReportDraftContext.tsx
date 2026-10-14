import * as Crypto from 'expo-crypto';
import { createContext, type PropsWithChildren, useCallback, useContext, useMemo, useReducer } from 'react';

import { getDefaultDescription } from '@/services/description';
import type {
  AnalysisResult,
  IssueCategoryId,
  PhotoSource,
  ReportDraft,
  ReportDraftStatus,
  ReportLocation,
} from '@/types/report';

type ReportDraftAction =
  | { type: 'set_photo'; payload: { uri: string; source: PhotoSource } }
  | { type: 'start_analysis' }
  | { type: 'set_analysis_result'; payload: AnalysisResult }
  | { type: 'set_selected_category'; payload: IssueCategoryId }
  | { type: 'set_location'; payload: ReportLocation }
  | { type: 'set_description'; payload: { value: string; edited: boolean } }
  | { type: 'complete_draft' }
  | { type: 'set_submission_status'; payload: { status: 'submitting' | 'submitted' | 'failed'; reportId?: string } }
  | { type: 'reset_draft'; payload?: { force: boolean } };

interface ReportDraftContextValue {
  draft: ReportDraft;
  setPhoto: (uri: string, source: PhotoSource) => void;
  startAnalysis: () => void;
  setAnalysisResult: (result: AnalysisResult) => void;
  setSelectedCategory: (categoryId: IssueCategoryId) => void;
  setLocation: (location: ReportLocation) => void;
  setDescription: (description: string) => void;
  completeDraft: () => void;
  setSubmissionStatus: (status: 'submitting' | 'submitted' | 'failed', reportId?: string) => void;
  resetDraft: (force?: boolean) => void;
}

function createInitialDraft(): ReportDraft {
  return {
    id: Crypto.randomUUID(),
    photoUri: null,
    photoSource: null,
    aiSuggestion: null,
    selectedCategoryId: null,
    location: null,
    description: '',
    descriptionEdited: false,
    status: 'idle',
    submittedReportId: null,
  };
}

const initialDraft = createInitialDraft();

function editableStatus(state: ReportDraft): ReportDraftStatus {
  return ['completed', 'submitted', 'failed'].includes(state.status) ? 'analyzed' : state.status;
}

function reportDraftReducer(state: ReportDraft, action: ReportDraftAction): ReportDraft {
  const locked = state.status === 'submitting' || state.status === 'submitted';
  switch (action.type) {
    case 'set_photo':
      if (locked) return state;
      return {
        ...createInitialDraft(),
        photoUri: action.payload.uri,
        photoSource: action.payload.source,
        status: 'photo_selected',
      };
    case 'start_analysis':
      if (locked) return state;
      return { ...state, status: 'analyzing' };
    case 'set_analysis_result':
      if (locked) return state;
      return {
        ...state,
        aiSuggestion: action.payload,
        selectedCategoryId: action.payload.suggestedCategoryId,
        description: state.descriptionEdited
          ? state.description
          : getDefaultDescription(action.payload.suggestedCategoryId),
        status: 'analyzed',
      };
    case 'set_selected_category':
      if (locked) return state;
      return {
        ...state,
        selectedCategoryId: action.payload,
        description: state.descriptionEdited ? state.description : getDefaultDescription(action.payload),
        status: editableStatus(state),
      };
    case 'set_location':
      if (locked) return state;
      return { ...state, location: action.payload, status: editableStatus(state) };
    case 'set_description':
      if (locked) return state;
      return {
        ...state,
        description: action.payload.value,
        descriptionEdited: action.payload.edited,
        status: editableStatus(state),
      };
    case 'complete_draft':
      return { ...state, status: 'completed' };
    case 'set_submission_status':
      return { ...state, status: action.payload.status, submittedReportId: action.payload.reportId ?? state.submittedReportId };
    case 'reset_draft':
      if (locked && !action.payload?.force) return state;
      return createInitialDraft();
  }
}

const ReportDraftContext = createContext<ReportDraftContextValue | null>(null);

export function ReportDraftProvider({ children }: PropsWithChildren) {
  const [draft, dispatch] = useReducer(reportDraftReducer, initialDraft);
  const setPhoto = useCallback((uri: string, source: PhotoSource) => dispatch({ type: 'set_photo', payload: { uri, source } }), []);
  const startAnalysis = useCallback(() => dispatch({ type: 'start_analysis' }), []);
  const setAnalysisResult = useCallback((result: AnalysisResult) => dispatch({ type: 'set_analysis_result', payload: result }), []);
  const setSelectedCategory = useCallback((categoryId: IssueCategoryId) => dispatch({ type: 'set_selected_category', payload: categoryId }), []);
  const setLocation = useCallback((location: ReportLocation) => dispatch({ type: 'set_location', payload: location }), []);
  const setDescription = useCallback((description: string) => dispatch({ type: 'set_description', payload: { value: description, edited: true } }), []);
  const completeDraft = useCallback(() => dispatch({ type: 'complete_draft' }), []);
  const setSubmissionStatus = useCallback((status: 'submitting' | 'submitted' | 'failed', reportId?: string) => dispatch({ type: 'set_submission_status', payload: { status, reportId } }), []);
  const resetDraft = useCallback((force = false) => dispatch({ type: 'reset_draft', payload: { force } }), []);

  const value = useMemo<ReportDraftContextValue>(() => ({
    draft,
    setPhoto,
    startAnalysis,
    setAnalysisResult,
    setSelectedCategory,
    setLocation,
    setDescription,
    completeDraft,
    setSubmissionStatus,
    resetDraft,
  }), [completeDraft, draft, resetDraft, setAnalysisResult, setDescription, setLocation, setPhoto, setSelectedCategory, setSubmissionStatus, startAnalysis]);

  return <ReportDraftContext.Provider value={value}>{children}</ReportDraftContext.Provider>;
}

export function useReportDraft() {
  const context = useContext(ReportDraftContext);
  if (!context) throw new Error('useReportDraft must be used inside ReportDraftProvider');
  return context;
}
