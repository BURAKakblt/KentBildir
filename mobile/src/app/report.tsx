import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { colors, spacing } from '@/constants/theme';

export default function ReportScreen() {
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  async function chooseFromLibrary() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('İzin gerekli', 'Fotoğraf seçebilmek için galeri erişimine izin vermelisiniz.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.85 });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('İzin gerekli', 'Fotoğraf çekebilmek için kamera erişimine izin vermelisiniz.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.85 });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  return (
    <Screen contentContainerStyle={styles.container}>
      <View>
        <SectionHeader title="Fotoğraf ekle" description="Bildirmek istediğiniz sorunu net biçimde gösteren bir fotoğraf ekleyin." />
        <View style={styles.actions}>
          <PrimaryButton label="Fotoğraf Çek" onPress={takePhoto} />
          <PrimaryButton label="Galeriden Seç" variant="secondary" onPress={chooseFromLibrary} />
        </View>
        {photoUri ? <Image source={{ uri: photoUri }} style={styles.preview} contentFit="cover" accessibilityLabel="Seçilen sorun fotoğrafı" /> : null}
      </View>
      {photoUri ? <PrimaryButton label="Fotoğrafı Analiz Et" onPress={() => router.push({ pathname: '/analysis', params: { photoUri } })} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'space-between', gap: spacing.xl }, actions: { gap: spacing.sm, marginTop: spacing.lg },
  preview: { width: '100%', aspectRatio: 4 / 3, borderRadius: 20, backgroundColor: colors.border, marginTop: spacing.lg },
});
