import { createContext, type PropsWithChildren, useCallback, useContext, useMemo, useReducer } from 'react';

import type {
  AnalysisResult,
  IssueCategoryId,
  PhotoSource,
  ReportDraft,
} from '@/types/report';

type ReportDraftAction =
  | { type: 'set_photo'; payload: { uri: string; source: PhotoSource } }
  | { type: 'start_analysis' }
  | { type: 'set_analysis_result'; payload: AnalysisResult }
  | { type: 'set_selected_category'; payload: IssueCategoryId }
  | { type: 'set_description'; payload: string }
  | { type: 'reset_draft' };

interface ReportDraftContextValue {
  draft: ReportDraft;
  setPhoto: (uri: string, source: PhotoSource) => void;
  startAnalysis: () => void;
  setAnalysisResult: (result: AnalysisResult) => void;
  setSelectedCategory: (categoryId: IssueCategoryId) => void;
  setDescription: (description: string) => void;
  resetDraft: () => void;
}

const initialDraft: ReportDraft = {
  photoUri: null,
  photoSource: null,
  aiSuggestion: null,
  selectedCategoryId: null,
  location: null,
  description: '',
  status: 'idle',
};

function reportDraftReducer(state: ReportDraft, action: ReportDraftAction): ReportDraft {
  switch (action.type) {
    case 'set_photo':
      return {
        ...initialDraft,
        photoUri: action.payload.uri,
        photoSource: action.payload.source,
        description: state.description,
        status: 'photo_selected',
      };
    case 'start_analysis':
      return { ...state, status: 'analyzing' };
    case 'set_analysis_result':
      return {
        ...state,
        aiSuggestion: action.payload,
        selectedCategoryId: action.payload.suggestedCategoryId,
        status: 'analyzed',
      };
    case 'set_selected_category':
      return { ...state, selectedCategoryId: action.payload };
    case 'set_description':
      return { ...state, description: action.payload };
    case 'reset_draft':
      return initialDraft;
  }
}

const ReportDraftContext = createContext<ReportDraftContextValue | null>(null);

export function ReportDraftProvider({ children }: PropsWithChildren) {
  const [draft, dispatch] = useReducer(reportDraftReducer, initialDraft);
  const setPhoto = useCallback((uri: string, source: PhotoSource) => dispatch({ type: 'set_photo', payload: { uri, source } }), []);
  const startAnalysis = useCallback(() => dispatch({ type: 'start_analysis' }), []);
  const setAnalysisResult = useCallback((result: AnalysisResult) => dispatch({ type: 'set_analysis_result', payload: result }), []);
  const setSelectedCategory = useCallback((categoryId: IssueCategoryId) => dispatch({ type: 'set_selected_category', payload: categoryId }), []);
  const setDescription = useCallback((description: string) => dispatch({ type: 'set_description', payload: description }), []);
  const resetDraft = useCallback(() => dispatch({ type: 'reset_draft' }), []);

  const value = useMemo<ReportDraftContextValue>(() => ({
    draft,
    setPhoto,
    startAnalysis,
    setAnalysisResult,
    setSelectedCategory,
    setDescription,
    resetDraft,
  }), [draft, resetDraft, setAnalysisResult, setDescription, setPhoto, setSelectedCategory, startAnalysis]);

  return <ReportDraftContext.Provider value={value}>{children}</ReportDraftContext.Provider>;
}

export function useReportDraft() {
  const context = useContext(ReportDraftContext);
  if (!context) throw new Error('useReportDraft must be used inside ReportDraftProvider');
  return context;
}
