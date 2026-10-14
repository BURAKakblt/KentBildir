import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { CategorySelector } from '@/components/CategorySelector';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { ISSUE_CATEGORIES } from '@/constants/categories';
import { colors, spacing } from '@/constants/theme';
import { useReportDraft } from '@/context/ReportDraftContext';
import { analyzePhoto } from '@/services/analysis';

export default function AnalysisScreen() {
  const { draft, setAnalysisResult, setSelectedCategory, startAnalysis } = useReportDraft();
  const [analysisError, setAnalysisError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!draft.photoUri) {
      router.replace('/report');
      return;
    }

    if (draft.aiSuggestion) return;

    let active = true;
    startAnalysis();

    void analyzePhoto(draft.photoUri)
      .then((result) => {
        if (active) setAnalysisResult(result);
      })
      .catch(() => {
        if (active) setAnalysisError(true);
      });

    return () => {
      active = false;
    };
  }, [draft.aiSuggestion, draft.photoUri, retryKey, setAnalysisResult, startAnalysis]);

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
    setAnalysisError(false);
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
        <View style={styles.loadingCard}>
          <Text style={styles.errorText}>Fotoğraf analiz edilemedi.</Text>
          <PrimaryButton label="Tekrar Dene" variant="secondary" onPress={retryAnalysis} />
        </View>
      ) : draft.aiSuggestion && suggestion ? (
        <>
          <View style={styles.resultCard}>
            <Text style={styles.eyebrow}>AI ÖNERİSİ</Text>
            <Text style={styles.result}>{suggestion.label}</Text>
            <View style={styles.confidenceRow}>
              <Text style={styles.meta}>Güven</Text>
              <Text style={styles.confidence}>%{Math.round(draft.aiSuggestion.confidence * 100)}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Seçtiğiniz kategori</Text>
            <Text style={styles.helper}>Öneri doğru değilse başka bir kategori seçebilirsiniz. AI önerisi değişmeden saklanır.</Text>
            <CategorySelector value={draft.selectedCategoryId} onChange={setSelectedCategory} />
          </View>

          <View style={styles.locationCard}>
            <Text style={styles.locationTitle}>Konum</Text>
            <Text style={styles.helper}>{"Konum bilgisi M2'de eklenecek."}</Text>
          </View>
          <PrimaryButton
            label="Bildirimi Hazırla"
            disabled={!draft.selectedCategoryId}
            onPress={() => Alert.alert('Başarılı', 'Bildirim taslağı hazırlandı.')}
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
  locationCard: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: spacing.md },
  locationTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: spacing.xs },
});
