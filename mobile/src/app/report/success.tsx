import { router, type Href, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';
import { useReportDraft } from '@/context/ReportDraftContext';
import { emailStatusLabel, formatReportNumber } from '@/services/reportPresentation';

export default function SuccessScreen() {
  const { draft, resetDraft } = useReportDraft();
  const reportId = draft.submittedReportId;
  const shownReportId = reportId ?? draft.id;
  const emailMessage = draft.emailDeliveryStatus
    ? emailStatusLabel(draft.emailDeliveryStatus)
    : 'E-posta iletim durumu bulunamadı';

  const goHome = useCallback(() => {
    router.replace('/');
  }, []);

  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      goHome();
      return true;
    });
    return () => subscription.remove();
  }, [goHome]));

  function openReport() {
    if (!reportId) return;
    router.replace(`/reports/${encodeURIComponent(reportId)}` as Href);
  }

  function openHistory() {
    router.replace('/reports' as Href);
  }

  function createNew() {
    resetDraft(true);
    router.replace('/report' as Href);
  }

  return (
    <Screen contentContainerStyle={styles.container}>
      <View style={styles.card} accessibilityRole="summary">
        <Text style={styles.title}>Bildirim başarıyla kaydedildi</Text>
        <View style={styles.statusRow}><Text style={styles.statusLabel}>Kayıt durumu</Text><Text style={styles.statusValue}>Kaydedildi</Text></View>
        <View style={styles.statusRow}><Text style={styles.statusLabel}>E-posta iletim durumu</Text><Text style={styles.statusValue}>{emailMessage}</Text></View>
        <Text style={styles.label}>Bildirim numarası</Text>
        <Text selectable style={styles.id}>{formatReportNumber(shownReportId)}</Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          label="Bildirimi Görüntüle"
          disabled={!reportId}
          onPress={openReport}
        />
        <PrimaryButton label="Bildirimlerim" variant="secondary" onPress={openHistory} />
        <PrimaryButton label="Yeni Bildirim Oluştur" variant="tertiary" onPress={createNew} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'center', gap: spacing.lg },
  card: { backgroundColor: colors.successSoft, borderRadius: 20, padding: spacing.lg, gap: spacing.sm },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  statusRow: { backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md, gap: spacing.xs },
  statusLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  statusValue: { color: colors.text, fontSize: 15, lineHeight: 22, fontWeight: '700' },
  label: { color: colors.textMuted, fontSize: 13, marginTop: spacing.sm },
  id: { color: colors.text, fontSize: 14, fontWeight: '700' },
  actions: { gap: spacing.sm },
});
