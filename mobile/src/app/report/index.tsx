import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { colors, spacing } from '@/constants/theme';
import { useReportDraft } from '@/context/ReportDraftContext';
import type { PhotoSource } from '@/types/report';

export default function ReportScreen() {
  const { draft, resetDraft, setPhoto } = useReportDraft();
  const [pickingSource, setPickingSource] = useState<PhotoSource | null>(null);
  const draftLocked = draft.status === 'submitting' || draft.status === 'submitted';

  function showPermissionAlert(source: PhotoSource, canAskAgain: boolean) {
    const target = source === 'camera' ? 'kamera' : 'galeri';
    const message = `${target === 'kamera' ? 'Fotoğraf çekebilmek' : 'Fotoğraf seçebilmek'} için ${target} erişimine izin vermelisiniz.`;

    if (canAskAgain) {
      Alert.alert('İzin gerekli', message);
      return;
    }

    Alert.alert('İzin ayarlardan gerekli', `${message} İzni cihaz ayarlarından açabilirsiniz.`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Ayarlara Git', onPress: () => void Linking.openSettings() },
    ]);
  }

  function confirmPhotoChange(): Promise<boolean> {
    if (!draft.photoUri || !draft.descriptionEdited) return Promise.resolve(true);

    return new Promise((resolve) => {
      Alert.alert(
        'Fotoğraf değiştirilsin mi?',
        'Fotoğrafı değiştirirseniz mevcut bildirim taslağındaki analiz, konum ve açıklama sıfırlanacaktır. Devam etmek istiyor musunuz?',
        [
          { text: 'İptal', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Devam Et', style: 'destructive', onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });
  }

  async function pickPhoto(source: PhotoSource) {
    if (pickingSource || draftLocked) return;
    if (!(await confirmPhotoChange())) return;
    setPickingSource(source);

    try {
      const permission = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        showPermissionAlert(source, permission.canAskAgain);
        return;
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        quality: 0.85,
        preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      };
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets[0]) {
        setPhoto(result.assets[0].uri, source, result.assets[0].mimeType ?? null);
      }
    } catch {
      Alert.alert('Fotoğraf eklenemedi', 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setPickingSource(null);
    }
  }

  async function removePhoto() {
    if (await confirmPhotoChange()) resetDraft();
  }

  return (
    <Screen contentContainerStyle={styles.container}>
      <View>
        <SectionHeader title="Fotoğraf ekle" description="Bildirmek istediğiniz sorunu çevresiyle birlikte net biçimde gösteren bir fotoğraf ekleyin." />
        <View style={styles.actions}>
          <PrimaryButton
            label={draft.photoUri ? 'Yeni Fotoğraf Çek' : 'Fotoğraf Çek'}
            loading={pickingSource === 'camera'}
            disabled={pickingSource !== null || draftLocked}
            onPress={() => void pickPhoto('camera')}
          />
          <PrimaryButton
            label={draft.photoUri ? 'Galeriden Değiştir' : 'Galeriden Seç'}
            variant="secondary"
            loading={pickingSource === 'library'}
            disabled={pickingSource !== null || draftLocked}
            onPress={() => void pickPhoto('library')}
          />
        </View>

        {draft.photoUri ? (
          <View style={styles.previewSection}>
            <Image source={{ uri: draft.photoUri }} style={styles.preview} contentFit="cover" accessibilityLabel="Seçilen sorun fotoğrafı" />
            <View style={styles.previewMeta}>
              <Text style={styles.sourceText}>{draft.photoSource === 'camera' ? 'Kamera ile çekildi' : 'Galeriden seçildi'}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Seçilen fotoğrafı kaldır" disabled={pickingSource !== null || draftLocked} onPress={() => void removePhoto()} hitSlop={8}>
                <Text style={styles.removeText}>Fotoğrafı Kaldır</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>

      {draft.photoUri ? (
        <PrimaryButton label="Fotoğrafı Analiz Et" disabled={pickingSource !== null || draftLocked} onPress={() => router.push('/report/analysis')} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'space-between', gap: spacing.xl },
  actions: { gap: spacing.sm, marginTop: spacing.lg },
  previewSection: { marginTop: spacing.lg },
  preview: { width: '100%', aspectRatio: 4 / 3, borderRadius: 20, backgroundColor: colors.border },
  previewMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginTop: spacing.sm },
  sourceText: { color: colors.textMuted, fontSize: 13 },
  removeText: { color: '#B33A3A', fontSize: 14, fontWeight: '700' },
});
