import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { colors, spacing } from '@/constants/theme';
import { getReport, type ReportDetail } from '@/services/api';
import { getReportHistory } from '@/services/reportHistory';
import { loadHistoryReports } from '@/services/reportList';
import { categoryLabel, emailStatusLabel, formatReportDate, reportStatusLabel } from '@/services/reportPresentation';

export default function ReportsScreen() {
  const [reports, setReports] = useState<ReportDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const history = await getReportHistory();
      const loaded = await loadHistoryReports(history, getReport);
      setReports(loaded);
      if (history.length > loaded.length) setError('Bazı bildirimler şu anda yüklenemedi.');
    } catch { setError('Bildirim geçmişi yüklenemedi.'); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return <Screen>
    <SectionHeader title="Bildirimlerim" description="Bu cihazdan gönderdiğiniz bildirimleri buradan takip edebilirsiniz." />
    {loading ? <ActivityIndicator style={styles.loading} color={colors.primary} /> : null}
    {!loading && reports.length === 0 ? <Text style={styles.empty}>Henüz gönderilmiş bildiriminiz yok.</Text> : null}
    {error ? <Text style={styles.error}>{error}</Text> : null}
    <View style={styles.list}>{reports.map(report => <Pressable key={report.id} accessibilityRole="button" accessibilityLabel={`${categoryLabel(report.categoryId)} bildiriminin detayını aç`} onPress={() => router.push(`/reports/${encodeURIComponent(report.id)}` as Href)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <Text style={styles.category}>{categoryLabel(report.categoryId)}</Text>
      <Text numberOfLines={2} style={styles.address}>{report.address ?? 'Adres belirtilmedi'}</Text>
      <View style={styles.row}><Text style={styles.date}>{formatReportDate(report.createdAt)}</Text><View style={styles.badge}><Text style={styles.badgeText}>{reportStatusLabel(report.status)}</Text></View></View>
      <Text style={styles.email}>{emailStatusLabel(report.emailStatus)}</Text>
      <Text style={styles.id}>#{report.id.slice(0, 8)}</Text>
    </Pressable>)}</View>
    <View style={styles.refresh}><PrimaryButton label="Yenile" variant="secondary" loading={loading} onPress={() => void load()} /></View>
  </Screen>;
}

const styles = StyleSheet.create({
  loading: { marginTop: spacing.xl }, empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl, fontSize: 16 }, error: { color: colors.textMuted, marginTop: spacing.md, textAlign: 'center' },
  list: { gap: spacing.md, marginTop: spacing.lg }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: spacing.lg, gap: spacing.sm }, pressed: { opacity: 0.75 },
  category: { color: colors.text, fontSize: 17, fontWeight: '700' }, address: { color: colors.textMuted, fontSize: 14 }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  date: { color: colors.textMuted, fontSize: 13, flex: 1 }, badge: { backgroundColor: colors.successSoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99 }, badgeText: { color: colors.success, fontSize: 12, fontWeight: '700' },
  email: { color: colors.textMuted, fontSize: 13 }, id: { color: colors.textMuted, fontSize: 12 }, refresh: { marginTop: spacing.lg },
});
