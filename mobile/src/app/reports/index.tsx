import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { colors, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getReport, type ReportDetail } from '@/services/api';
import { getReportHistory } from '@/services/reportHistory';
import { loadHistoryReports } from '@/services/reportList';
import { categoryLabel, emailStatusLabel, formatReportDate, formatReportNumber, reportStatusLabel } from '@/services/reportPresentation';

export default function ReportsScreen() {
  const [reports, setReports] = useState<ReportDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getAccessToken } = useAuth();
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const history = await getReportHistory();
      const accessToken = await getAccessToken();
      const loaded = await loadHistoryReports(history, (id) => getReport(id, accessToken));
      setReports(loaded);
      if (history.length > loaded.length) setError('Bazı bildirimler şu anda yüklenemedi.');
    } catch { setError('Bildirim geçmişi yüklenemedi.'); }
    finally { setLoading(false); }
  }, [getAccessToken]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return <Screen>
    <SectionHeader title="Bildirimlerim" description="Bu cihazdan gönderdiğiniz bildirimleri buradan takip edebilirsiniz." />
    {loading ? <View style={styles.stateCard}><ActivityIndicator color={colors.primary} /><Text style={styles.stateText}>Bildirimleriniz yükleniyor…</Text></View> : null}
    {!loading && reports.length === 0 ? <View style={styles.stateCard}><Text style={styles.emptyTitle}>Henüz bildiriminiz yok</Text><Text style={styles.stateText}>Yeni bir bildirim oluşturduğunuzda burada görünecek.</Text></View> : null}
    {error ? <View accessibilityRole="alert" style={styles.errorCard}><Text style={styles.error}>{error}</Text></View> : null}
    <View style={styles.list}>{reports.map(report => <Pressable key={report.id} accessibilityRole="button" accessibilityLabel={`${categoryLabel(report.categoryId)} bildiriminin detayını aç`} onPress={() => router.push(`/reports/${encodeURIComponent(report.id)}` as Href)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <Text style={styles.category}>{categoryLabel(report.categoryId)}</Text>
      <Text numberOfLines={2} style={styles.address}>{report.address ?? 'Adres belirtilmedi'}</Text>
      <View style={styles.row}><Text style={styles.date}>{formatReportDate(report.createdAt)}</Text><View style={styles.badge}><Text style={styles.badgeText}>{reportStatusLabel(report.status)}</Text></View></View>
      <Text style={styles.email}>E-posta: {emailStatusLabel(report.emailStatus)}</Text>
      <Text style={styles.id}>{formatReportNumber(report.id)}</Text>
    </Pressable>)}</View>
    <View style={styles.refresh}><PrimaryButton label="Yenile" variant="secondary" loading={loading} onPress={() => void load()} /></View>
  </Screen>;
}

const styles = StyleSheet.create({
  stateCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 18, gap: spacing.sm, marginTop: spacing.lg, padding: spacing.lg }, stateText: { color: colors.textMuted, textAlign: 'center', fontSize: 15, lineHeight: 22 }, emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '800' }, errorCard: { backgroundColor: '#FFF1F1', borderColor: '#E6B8B8', borderWidth: 1, borderRadius: 14, padding: spacing.md, marginTop: spacing.md }, error: { color: '#7D2525', textAlign: 'center' },
  list: { gap: spacing.md, marginTop: spacing.lg }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: spacing.lg, gap: spacing.sm }, pressed: { opacity: 0.75 },
  category: { color: colors.text, fontSize: 17, fontWeight: '700' }, address: { color: colors.textMuted, fontSize: 14 }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  date: { color: colors.textMuted, fontSize: 13, flex: 1 }, badge: { backgroundColor: colors.successSoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99 }, badgeText: { color: colors.success, fontSize: 12, fontWeight: '700' },
  email: { color: colors.textMuted, fontSize: 13 }, id: { color: colors.textMuted, fontSize: 12 }, refresh: { marginTop: spacing.lg },
});
