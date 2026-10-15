import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking, StyleSheet, Text, TextInput, View } from 'react-native';

import { CategorySelector } from '@/components/CategorySelector';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { ISSUE_CATEGORIES } from '@/constants/categories';
import { getLocationAccuracyLevel } from '@/constants/location';
import { colors, spacing } from '@/constants/theme';
import { useReportDraft } from '@/context/ReportDraftContext';
import { getCurrentReportLocation, getLocationPrecision, LocationTimeoutError } from '@/services/location';
import { submitReport } from '@/services/api';
import { getDefaultDescription } from '@/services/description';
import type { IssueCategoryId } from '@/types/report';

type LocationError = 'permission_denied' | 'permission_blocked' | 'services_disabled' | 'timeout' | 'unavailable' | null;

const LOCATION_ERRORS: Record<Exclude<LocationError, null>, string> = {
  permission_denied: 'Konum izni verilmedi. Konumu eklemek için tekrar deneyebilirsiniz.',
  permission_blocked: 'Konum izni kalıcı olarak reddedildi. İzni cihaz ayarlarından açabilirsiniz.',
  services_disabled: 'Konum servisleri kapalı. Cihaz ayarlarından GPS veya konum servislerini açıp tekrar deneyin.',
  timeout: 'Konum belirlenemedi. Açık bir alanda tekrar deneyin.',
  unavailable: 'Konum alınamadı. Açık bir alanda veya bağlantınızı kontrol ettikten sonra tekrar deneyin.',
};

function categoryLabel(categoryId: IssueCategoryId | null) {
  return ISSUE_CATEGORIES.find((category) => category.id === categoryId)?.label ?? 'Seçilmedi';
}

export default function ReportFormScreen() {
  const {
    draft,
    setDescription,
    setLocation,
    setSelectedCategory,
    setSubmissionStatus,
  } = useReportDraft();
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<LocationError>(null);
  const requestedLocation = useRef(false);
  const locationRequestId = useRef(0);
  const locationRequestInFlight = useRef(false);
  const mounted = useRef(true);
  const waitingForSettings = useRef(false);
  const submissionInFlight = useRef(false);
  const draftLocked = draft.status === 'submitting' || draft.status === 'submitted';

  const acquireLocation = useCallback(async () => {
    if (locationRequestInFlight.current || draftLocked) return;
    locationRequestInFlight.current = true;
    const requestId = ++locationRequestId.current;
    setIsLocating(true);
    setLocationError(null);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        if (mounted.current && requestId === locationRequestId.current) {
          setLocationError(permission.canAskAgain ? 'permission_denied' : 'permission_blocked');
        }
        return;
      }

      if (!(await Location.hasServicesEnabledAsync())) {
        if (mounted.current && requestId === locationRequestId.current) setLocationError('services_disabled');
        return;
      }

      const location = await getCurrentReportLocation(getLocationPrecision(permission));
      if (mounted.current && requestId === locationRequestId.current) setLocation(location);
    } catch (error) {
      if (mounted.current && requestId === locationRequestId.current) {
        setLocationError(error instanceof LocationTimeoutError ? 'timeout' : 'unavailable');
      }
    } finally {
      if (requestId === locationRequestId.current) {
        locationRequestInFlight.current = false;
        if (mounted.current) setIsLocating(false);
      }
    }
  }, [draftLocked, setLocation]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      locationRequestId.current += 1;
      locationRequestInFlight.current = false;
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !waitingForSettings.current) return;
      waitingForSettings.current = false;
      void Location.getForegroundPermissionsAsync().then((permission) => {
        if (permission.granted && mounted.current) void acquireLocation();
      });
    });
    return () => subscription.remove();
  }, [acquireLocation]);

  useEffect(() => {
    if (!draft.photoUri || !draft.selectedCategoryId) {
      router.replace('/report');
      return;
    }
    if (!draft.location && !requestedLocation.current) {
      requestedLocation.current = true;
      void acquireLocation();
    }
  }, [acquireLocation, draft.location, draft.photoUri, draft.selectedCategoryId]);

  if (!draft.photoUri || !draft.selectedCategoryId) return null;

  const descriptionLength = draft.description.trim().length;
  const descriptionIsValid = descriptionLength >= 10 && descriptionLength <= 1000;
  const otherCategoryIsValid = draft.selectedCategoryId !== 'other' || draft.description.trim() !== getDefaultDescription('other').trim();
  const isValid = Boolean(
    draft.photoUri
      && draft.selectedCategoryId
      && draft.location
      && descriptionIsValid
      && otherCategoryIsValid,
  );

  function changeCategory(categoryId: IssueCategoryId) {
    setSelectedCategory(categoryId);
  }

  function openSettings() {
    waitingForSettings.current = true;
    void Linking.openSettings();
  }

  async function finishDraft() {
    if (!isValid) {
      Alert.alert('Eksik bilgiler', 'Fotoğraf, kategori, konum ve açıklama alanlarının tamamlandığından emin olun.');
      return;
    }
    if (submissionInFlight.current || draftLocked) return;
    submissionInFlight.current = true;
    setSubmissionStatus('submitting');
    try { const report = await submitReport(draft); setSubmissionStatus('submitted', report.id); router.replace('/report/success' as Href); }
    catch (error) { setSubmissionStatus('failed'); Alert.alert('Gönderilemedi', error instanceof Error ? error.message : 'Bildirim gönderilemedi. Taslağınız korundu.'); }
    finally { submissionInFlight.current = false; }
  }

  return (
    <Screen keyboardVerticalOffset={88} contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Image source={{ uri: draft.photoUri }} style={styles.photo} contentFit="cover" accessibilityLabel="Bildirim fotoğrafı" />
        <Text style={styles.eyebrow}>AI TAHMİNİ</Text>
        <Text style={styles.cardTitle}>{draft.aiSuggestion ? categoryLabel(draft.aiSuggestion.suggestedCategoryId) : 'Otomatik tahmin bulunamadı'}</Text>
        {draft.aiSuggestion ? <Text style={styles.confidence}>Güven oranı: %{Math.round(draft.aiSuggestion.confidence * 100)}</Text> : null}
      </View>

      {draft.photoSource === 'library' ? (
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>Konumu kontrol edin</Text>
          <Text style={styles.warningText}>Galeriden seçilen fotoğrafın çekildiği konum ile mevcut konumunuz farklı olabilir. Lütfen konum bilgisini kontrol edin.</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sorun türü</Text>
        <Text style={styles.helper}>AI önerisini kontrol edin; gerekirse kategoriyi değiştirebilirsiniz.</Text>
        <CategorySelector value={draft.selectedCategoryId} onChange={changeCategory} disabled={draftLocked} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Konum</Text>
        <Text style={styles.privacyNote}>Konum bilginiz, bildirilen sorunun yerini belirlemek amacıyla bildirim içeriğine eklenecektir.</Text>
        <View style={styles.locationCard}>
          {draft.location ? (
            <>
              <Text style={styles.address}>{draft.location.address ?? 'Açık adres bulunamadı'}</Text>
              <Text style={styles.coordinate}>Enlem: {draft.location.latitude.toFixed(6)}</Text>
              <Text style={styles.coordinate}>Boylam: {draft.location.longitude.toFixed(6)}</Text>
              {draft.location.accuracy != null ? <Text style={styles.accuracy}>Yaklaşık doğruluk: {Math.round(draft.location.accuracy)} m</Text> : null}
              {draft.location.precision === 'approximate' ? (
                <View style={styles.inlineWarning}>
                  <Text style={styles.warningText}>Konumunuz yaklaşık olarak alındı. Daha doğru bir bildirim için cihaz ayarlarından kesin konuma izin vermeniz önerilir.</Text>
                  <PrimaryButton label="Ayarlara Git" variant="secondary" onPress={openSettings} />
                </View>
              ) : null}
              {getLocationAccuracyLevel(draft.location.accuracy) === 'warning' ? (
                <Text style={styles.accuracyWarning}>Konum doğruluğu orta seviyede. Dilerseniz konumu tekrar alabilirsiniz.</Text>
              ) : null}
              {getLocationAccuracyLevel(draft.location.accuracy) === 'poor' ? (
                <Text style={styles.errorText}>Konum doğruluğu düşük. Konumu tekrar almanız önerilir.</Text>
              ) : null}
            </>
          ) : locationError ? (
            <Text style={styles.errorText}>{LOCATION_ERRORS[locationError]}</Text>
          ) : (
            <Text style={styles.helper}>Mevcut konumunuz alınıyor…</Text>
          )}
          {locationError === 'permission_blocked' ? (
            <PrimaryButton label="Ayarlara Git" variant="secondary" onPress={openSettings} />
          ) : null}
          <PrimaryButton label={draft.location ? 'Konumu Tekrar Al' : 'Konumu Al'} variant="secondary" loading={isLocating} disabled={draftLocked} onPress={() => void acquireLocation()} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Açıklama</Text>
        <TextInput
          accessibilityLabel="Bildirim açıklaması"
          multiline
          editable={!draftLocked}
          maxLength={1000}
          onChangeText={setDescription}
          placeholder="Sorunu kısaca açıklayın"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          textAlignVertical="top"
          value={draft.description}
        />
        <Text style={styles.characterCount}>{draft.description.length}/1000</Text>
        {descriptionLength > 0 && descriptionLength < 10 ? <Text style={styles.errorText}>Açıklama en az 10 karakter olmalıdır.</Text> : null}
        {draft.selectedCategoryId === 'other' && !otherCategoryIsValid ? <Text style={styles.errorText}>Diğer kategorisinde açıklamayı soruna göre düzenlemelisiniz.</Text> : null}
      </View>

      <View style={styles.previewCard}>
        <Text style={styles.previewTitle}>Bildirim Önizlemesi</Text>
        <Image source={{ uri: draft.photoUri }} style={styles.previewPhoto} contentFit="cover" accessibilityLabel="Bildirim önizleme fotoğrafı" />
        <Text style={styles.previewLabel}>Sorun Türü</Text>
        <Text style={styles.previewValue}>{categoryLabel(draft.selectedCategoryId)}</Text>
        <Text style={styles.previewLabel}>AI Tahmini / Güven</Text>
        <Text style={styles.previewValue}>{draft.aiSuggestion ? `${categoryLabel(draft.aiSuggestion.suggestedCategoryId)} · %${Math.round(draft.aiSuggestion.confidence * 100)}` : 'Otomatik tahmin bulunamadı'}</Text>
        <Text style={styles.previewLabel}>Konum / Adres</Text>
        <Text style={styles.previewValue}>{draft.location?.address ?? 'Henüz alınmadı'}</Text>
        <Text style={styles.previewLabel}>Açıklama</Text>
        <Text style={styles.previewValue}>{draft.description.trim() || 'Henüz girilmedi'}</Text>
      </View>

      {!isValid ? <Text style={styles.validation}>Taslağı tamamlamak için fotoğraf, sorun türü, konum ve geçerli bir açıklama gereklidir.</Text> : null}
      <PrimaryButton label={draft.status === 'submitted' ? 'Bildirim Gönderildi' : 'Bildirimi Gönder'} loading={draft.status === 'submitting'} disabled={!isValid || draft.status === 'submitted'} onPress={() => void finishDraft()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg, paddingBottom: spacing.xl },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: spacing.md, gap: spacing.xs },
  photo: { width: '100%', aspectRatio: 16 / 10, borderRadius: 14, backgroundColor: colors.border, marginBottom: spacing.sm },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  cardTitle: { color: colors.text, fontSize: 19, fontWeight: '800' },
  confidence: { color: colors.success, fontSize: 14, fontWeight: '700' },
  warningCard: { backgroundColor: '#FFF7E6', borderColor: '#E9C46A', borderWidth: 1, borderRadius: 16, padding: spacing.md, gap: spacing.xs },
  warningTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  warningText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  section: { gap: spacing.sm },
  sectionTitle: { color: colors.text, fontSize: 19, fontWeight: '800' },
  helper: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  privacyNote: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  locationCard: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: spacing.md, gap: spacing.sm },
  address: { color: colors.text, fontSize: 16, fontWeight: '700', lineHeight: 23 },
  coordinate: { color: colors.textMuted, fontSize: 14 },
  accuracy: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.xs },
  accuracyWarning: { color: '#7A5A00', fontSize: 14, lineHeight: 20 },
  inlineWarning: { backgroundColor: '#FFF7E6', borderRadius: 12, padding: spacing.sm, gap: spacing.sm },
  errorText: { color: '#9B2C2C', fontSize: 14, lineHeight: 20 },
  input: { minHeight: 140, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, color: colors.text, fontSize: 16, lineHeight: 23, padding: spacing.md },
  characterCount: { color: colors.textMuted, fontSize: 12, textAlign: 'right' },
  previewCard: { backgroundColor: colors.primarySoft, borderRadius: 18, padding: spacing.md, gap: spacing.xs },
  previewTitle: { color: colors.text, fontSize: 19, fontWeight: '800', marginBottom: spacing.sm },
  previewPhoto: { width: '100%', aspectRatio: 16 / 8, borderRadius: 12, backgroundColor: colors.border, marginBottom: spacing.sm },
  previewLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700', marginTop: spacing.sm, textTransform: 'uppercase' },
  previewValue: { color: colors.text, fontSize: 15, lineHeight: 21 },
  validation: { color: '#9B2C2C', fontSize: 13, lineHeight: 18, textAlign: 'center' },
});
