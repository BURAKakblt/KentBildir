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
  | { type: 'reset_draft' };

interface ReportDraftContextValue {
  draft: ReportDraft;
  setPhoto: (uri: string, source: PhotoSource) => void;
  startAnalysis: () => void;
  setAnalysisResult: (result: AnalysisResult) => void;
  setSelectedCategory: (categoryId: IssueCategoryId) => void;
  setLocation: (location: ReportLocation) => void;
  setDescription: (description: string) => void;
  completeDraft: () => void;
  resetDraft: () => void;
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
  };
}

const initialDraft = createInitialDraft();

function editableStatus(state: ReportDraft): ReportDraftStatus {
  return state.status === 'completed' ? 'analyzed' : state.status;
}

function reportDraftReducer(state: ReportDraft, action: ReportDraftAction): ReportDraft {
  switch (action.type) {
    case 'set_photo':
      return {
        ...createInitialDraft(),
        photoUri: action.payload.uri,
        photoSource: action.payload.source,
        status: 'photo_selected',
      };
    case 'start_analysis':
      return { ...state, status: 'analyzing' };
    case 'set_analysis_result':
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
      return {
        ...state,
        selectedCategoryId: action.payload,
        description: state.descriptionEdited ? state.description : getDefaultDescription(action.payload),
        status: editableStatus(state),
      };
    case 'set_location':
      return { ...state, location: action.payload, status: editableStatus(state) };
    case 'set_description':
      return {
        ...state,
        description: action.payload.value,
        descriptionEdited: action.payload.edited,
        status: editableStatus(state),
      };
    case 'complete_draft':
      return { ...state, status: 'completed' };
    case 'reset_draft':
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
  const resetDraft = useCallback(() => dispatch({ type: 'reset_draft' }), []);

  const value = useMemo<ReportDraftContextValue>(() => ({
    draft,
    setPhoto,
    startAnalysis,
    setAnalysisResult,
    setSelectedCategory,
    setLocation,
    setDescription,
    completeDraft,
    resetDraft,
  }), [completeDraft, draft, resetDraft, setAnalysisResult, setDescription, setLocation, setPhoto, setSelectedCategory, startAnalysis]);

  return <ReportDraftContext.Provider value={value}>{children}</ReportDraftContext.Provider>;
}

export function useReportDraft() {
  const context = useContext(ReportDraftContext);
  if (!context) throw new Error('useReportDraft must be used inside ReportDraftProvider');
  return context;
}
