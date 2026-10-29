import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { colors, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getReport, getReportPhotoSource, type ReportDetail } from '@/services/api';
import { categoryLabel, createReportMapUrl, emailStatusLabel, formatReportDate, formatReportNumber, reportStatusLabel } from '@/services/reportPresentation';

function Field({ label, value }: { label: string; value: string }) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><Text selectable style={styles.value}>{value}</Text></View>; }

export default function ReportDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(true);
  const [retryKey, setRetryKey] = useState(0);
  const [photoAccessToken, setPhotoAccessToken] = useState<string | null>(null);
  const { getAccessToken } = useAuth();
  useEffect(() => { let active = true; getAccessToken().then((accessToken) => getReport(id, accessToken).then((value) => ({ value, accessToken }))).then(({ value, accessToken }) => { if (active) { setReport(value); setPhotoAccessToken(accessToken); } }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Bildirim yüklenemedi.'); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [getAccessToken, id, retryKey]);
  const mapUrl = useMemo(() => report ? createReportMapUrl(report.latitude, report.longitude) : null, [report]);
  async function openMap() { if (!mapUrl) return; try { await Linking.openURL(mapUrl); } catch { Alert.alert('Harita açılamadı', 'Harita uygulaması şu anda açılamıyor. Lütfen tekrar deneyin.'); } }
  if (loading) return <Screen><ActivityIndicator style={styles.loading} color={colors.primary} /></Screen>;
  if (!report) return <Screen contentContainerStyle={styles.errorContainer}><Text style={styles.error}>{error ?? 'Bildirim bulunamadı.'}</Text><PrimaryButton label="Tekrar Dene" variant="secondary" onPress={() => { setLoading(true); setError(null); setRetryKey(value => value + 1); }} /></Screen>;
  return <Screen contentContainerStyle={styles.container}>
    <SectionHeader title="Bildirim Detayı" description={`${formatReportNumber(report.id)} numaralı kaydınızın güncel bilgileri.`} />
    {!photoFailed && photoAccessToken ? <View style={styles.photoContainer}><Image source={getReportPhotoSource(report.id, photoAccessToken)} style={styles.photo} contentFit="cover" onLoadStart={() => setPhotoLoading(true)} onLoad={() => setPhotoLoading(false)} onError={() => { setPhotoLoading(false); setPhotoFailed(true); }} accessibilityLabel="Bildirim fotoğrafı" />{photoLoading ? <ActivityIndicator accessibilityLabel="Fotoğraf yükleniyor" style={styles.photoLoader} color={colors.primary} /> : null}</View> : <View style={styles.photoFallback}><Text style={styles.muted}>Fotoğraf yüklenemedi.</Text></View>}
    <View style={styles.statusGrid}>
      <View style={styles.statusCard}><Text style={styles.statusLabel}>Kayıt durumu</Text><Text style={styles.statusValue}>{reportStatusLabel(report.status)}</Text></View>
      <View style={styles.statusCard}><Text style={styles.statusLabel}>E-posta iletim durumu</Text><Text style={styles.statusValue}>{emailStatusLabel(report.emailStatus)}</Text></View>
    </View>
    <View style={styles.card}>
      <Text style={styles.cardHeading}>Kategori</Text>
      <Text style={styles.title}>{categoryLabel(report.categoryId)}</Text>
      {report.aiCategoryId ? <Field label="AI önerisi" value={`${categoryLabel(report.aiCategoryId)}${report.aiConfidence === null || !Number.isFinite(report.aiConfidence) ? '' : ` · güven skoru %${Math.round(report.aiConfidence * 100)}`}`} /> : null}
    </View>
    <View style={styles.card}>
      <Text style={styles.cardHeading}>Açıklama</Text>
      <Text selectable style={styles.description}>{report.description}</Text>
    </View>
    <View style={styles.card}>
      <Text style={styles.cardHeading}>Tarih ve konum</Text>
      <Field label="Fotoğraf tarihi" value={formatReportDate(report.capturedAt)} />
      <Field label="Açık adres" value={report.address ?? 'Belirtilmedi'} />
      <Field label="İl / İlçe" value={[report.city, report.district ?? report.subregion].filter(Boolean).join(' / ') || 'Belirtilmedi'} />
      <Field label="Konum doğruluğu" value={report.accuracy === null || !Number.isFinite(report.accuracy) ? 'Belirtilmedi' : `${Math.round(report.accuracy)} m · ${report.locationPrecision === 'precise' ? 'kesin konum' : 'yaklaşık konum'}`} />
    </View>
    {mapUrl ? <PrimaryButton label="Haritada Aç" variant="secondary" onPress={() => void openMap()} /> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  container: { gap: spacing.md, paddingBottom: spacing.xl },
  loading: { marginTop: spacing.xl }, errorContainer: { justifyContent: 'center', gap: spacing.lg }, error: { color: colors.textMuted, textAlign: 'center' }, photoContainer: { width: '100%', aspectRatio: 4 / 3, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.border, marginTop: spacing.sm }, photo: { width: '100%', height: '100%' }, photoLoader: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }, photoFallback: { width: '100%', aspectRatio: 4 / 3, borderRadius: 20, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm }, muted: { color: colors.textMuted },
  statusGrid: { gap: spacing.sm },
  statusCard: { backgroundColor: colors.primarySoft, borderRadius: 16, padding: spacing.md, gap: spacing.xs },
  statusLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  statusValue: { color: colors.primary, fontSize: 16, fontWeight: '800' },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 20, padding: spacing.lg, gap: spacing.md },
  cardHeading: { color: colors.text, fontSize: 17, fontWeight: '800' },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  description: { color: colors.text, fontSize: 16, lineHeight: 24 },
  field: { gap: spacing.xs }, label: { color: colors.textMuted, fontSize: 12, fontWeight: '700' }, value: { color: colors.text, fontSize: 15, lineHeight: 22 },
});
