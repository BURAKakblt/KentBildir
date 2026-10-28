import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { CategorySelector } from '@/components/CategorySelector';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { ISSUE_CATEGORIES } from '@/constants/categories';
import { colors, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useReportDraft } from '@/context/ReportDraftContext';
import { analyzePhoto } from '@/services/analysis';

export default function AnalysisScreen() {
  const { draft, setAnalysisResult, setSelectedCategory, startAnalysis } = useReportDraft();
  const { getAccessToken } = useAuth();
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!draft.photoUri) {
      router.replace('/report');
      return;
    }

    if (draft.aiSuggestion) return;

    let active = true;
    startAnalysis();

    const photoUri = draft.photoUri;
    void getAccessToken()
      .then((accessToken) => analyzePhoto(photoUri, accessToken, draft.photoMimeType))
      .then((result) => {
        if (active) setAnalysisResult(result, photoUri);
      })
      .catch((error: unknown) => {
        if (active) setAnalysisError(error instanceof Error ? error.message : 'Fotoğraf otomatik analiz edilemedi. Lütfen tekrar deneyin.');
      });

    return () => {
      active = false;
    };
  }, [draft.aiSuggestion, draft.photoMimeType, draft.photoUri, getAccessToken, retryKey, setAnalysisResult, startAnalysis]);

  if (!draft.photoUri) {
    return (
      <Screen contentContainerStyle={styles.centered}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.helper}>Fotoğraf ekranına yönlendiriliyorsunuz…</Text>
      </Screen>
    );
  }

  const suggestion = ISSUE_CATEGORIES.find((category) => category.id === draft.aiSuggestion?.suggestedCategoryId);
  const isLoading = draft.status === 'analyzing' && !analysisError;

  function retryAnalysis() {
    setAnalysisError(null);
    setRetryKey((value) => value + 1);
  }

  return (
    <Screen contentContainerStyle={styles.container}>
      <Image source={{ uri: draft.photoUri }} style={styles.photo} contentFit="cover" accessibilityLabel="Analiz edilen sorun fotoğrafı" />

      {isLoading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Fotoğraf analiz ediliyor…</Text>
        </View>
      ) : analysisError ? (
        <>
          <View style={styles.loadingCard}>
            <Text style={styles.errorText}>{analysisError}</Text>
            <Text style={styles.helper}>Kategoriyi manuel seçebilir veya tekrar deneyebilirsiniz.</Text>
            <PrimaryButton label="Tekrar Dene" variant="secondary" onPress={retryAnalysis} />
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sorun türü</Text>
            <CategorySelector value={draft.selectedCategoryId} onChange={setSelectedCategory} />
          </View>
          <PrimaryButton label="Devam Et" disabled={!draft.selectedCategoryId} onPress={() => router.push('/report/form' as Href)} />
        </>
      ) : draft.aiSuggestion && suggestion ? (
        <>
          <View style={styles.resultCard}>
            <Text style={styles.eyebrow}>AI ÖNERİSİ</Text>
            <Text style={styles.result}>{suggestion.label}</Text>
            <View style={styles.confidenceRow}>
              <Text style={styles.meta}>Model güven skoru</Text>
              <Text style={styles.confidence}>%{Math.round(draft.aiSuggestion.confidence * 100)}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Seçtiğiniz kategori</Text>
            <Text style={styles.helper}>Öneri doğru değilse başka bir kategori seçebilirsiniz. AI önerisi değişmeden saklanır.</Text>
            <CategorySelector value={draft.selectedCategoryId} onChange={setSelectedCategory} />
          </View>

          <PrimaryButton
            label="Devam Et"
            disabled={!draft.selectedCategoryId}
            onPress={() => router.push('/report/form' as Href)}
          />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg, paddingBottom: spacing.xl },
  centered: { alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  photo: { width: '100%', aspectRatio: 16 / 10, borderRadius: 20, backgroundColor: colors.border },
  loadingCard: { minHeight: 150, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: spacing.lg, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingText: { color: colors.textMuted, fontSize: 15 },
  errorText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  resultCard: { backgroundColor: colors.primarySoft, borderRadius: 18, padding: spacing.lg },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  result: { color: colors.text, fontSize: 22, fontWeight: '800', marginTop: spacing.sm },
  confidenceRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: spacing.sm },
  meta: { color: colors.textMuted, fontSize: 15 },
  confidence: { color: colors.success, fontSize: 16, fontWeight: '800' },
  section: { gap: spacing.sm },
  sectionTitle: { color: colors.text, fontSize: 19, fontWeight: '800' },
  helper: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginBottom: spacing.sm },
});
