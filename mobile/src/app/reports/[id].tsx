import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';
import { getReport, getReportPhotoUrl, type ReportDetail } from '@/services/api';
import { categoryLabel, createReportMapUrl, emailStatusLabel, formatReportDate, reportStatusLabel } from '@/services/reportPresentation';

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
  useEffect(() => { let active = true; getReport(id).then(value => { if (active) setReport(value); }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Bildirim yüklenemedi.'); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [id, retryKey]);
  const mapUrl = useMemo(() => report ? createReportMapUrl(report.latitude, report.longitude) : null, [report]);
  async function openMap() { if (!mapUrl) return; try { await Linking.openURL(mapUrl); } catch { Alert.alert('Harita açılamadı', 'Harita uygulaması şu anda açılamıyor. Lütfen tekrar deneyin.'); } }
  if (loading) return <Screen><ActivityIndicator style={styles.loading} color={colors.primary} /></Screen>;
  if (!report) return <Screen contentContainerStyle={styles.errorContainer}><Text style={styles.error}>{error ?? 'Bildirim bulunamadı.'}</Text><PrimaryButton label="Tekrar Dene" variant="secondary" onPress={() => { setLoading(true); setError(null); setRetryKey(value => value + 1); }} /></Screen>;
  return <Screen>
    {!photoFailed ? <View style={styles.photoContainer}><Image source={{ uri: getReportPhotoUrl(report.id) }} style={styles.photo} contentFit="cover" onLoadStart={() => setPhotoLoading(true)} onLoad={() => setPhotoLoading(false)} onError={() => { setPhotoLoading(false); setPhotoFailed(true); }} accessibilityLabel="Bildirim fotoğrafı" />{photoLoading ? <ActivityIndicator accessibilityLabel="Fotoğraf yükleniyor" style={styles.photoLoader} color={colors.primary} /> : null}</View> : <View style={styles.photoFallback}><Text style={styles.muted}>Fotoğraf yüklenemedi.</Text></View>}
    <View style={styles.card}>
      <Text style={styles.title}>{categoryLabel(report.categoryId)}</Text>
      <Field label="Durum" value={reportStatusLabel(report.status)} />
      <Field label="E-posta" value={emailStatusLabel(report.emailStatus)} />
      <Field label="Açıklama" value={report.description} />
      <Field label="Tarih" value={formatReportDate(report.capturedAt)} />
      <Field label="Adres" value={report.address ?? 'Belirtilmedi'} />
      <Field label="İl / İlçe" value={[report.city, report.district ?? report.subregion].filter(Boolean).join(' / ') || 'Belirtilmedi'} />
      <Field label="Koordinatlar" value={Number.isFinite(report.latitude) && Number.isFinite(report.longitude) ? `${report.latitude}, ${report.longitude}` : 'Belirtilmedi'} />
      <Field label="Konum hassasiyeti" value={report.accuracy === null || !Number.isFinite(report.accuracy) ? 'Belirtilmedi' : `${report.accuracy} m (${report.locationPrecision === 'precise' ? 'kesin' : 'yaklaşık'})`} />
      {report.aiCategoryId ? <Field label="AI önerisi" value={`${categoryLabel(report.aiCategoryId)}${report.aiConfidence === null || !Number.isFinite(report.aiConfidence) ? '' : ` — Model güven skoru: %${Math.round(report.aiConfidence * 100)}`}`} /> : null}
      <Field label="Bildirim ID" value={report.id} />
    </View>
    {mapUrl ? <PrimaryButton label="Haritada Aç" variant="secondary" onPress={() => void openMap()} /> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  loading: { marginTop: spacing.xl }, errorContainer: { justifyContent: 'center', gap: spacing.lg }, error: { color: colors.textMuted, textAlign: 'center' }, photoContainer: { width: '100%', aspectRatio: 4 / 3, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.border }, photo: { width: '100%', height: '100%' }, photoLoader: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }, photoFallback: { width: '100%', aspectRatio: 4 / 3, borderRadius: 20, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, muted: { color: colors.textMuted },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 20, padding: spacing.lg, gap: spacing.md, marginVertical: spacing.lg }, title: { color: colors.text, fontSize: 22, fontWeight: '800' }, field: { gap: spacing.xs }, label: { color: colors.textMuted, fontSize: 12, fontWeight: '700' }, value: { color: colors.text, fontSize: 15, lineHeight: 22 },
});
