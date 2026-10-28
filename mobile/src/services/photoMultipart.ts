import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { createPhotoUpload } from '@/services/photoUpload';

export class PhotoPreparationError extends Error {
  constructor() {
    super('Fotoğraf yükleme için hazırlanamadı. Fotoğrafı yeniden seçip tekrar deneyin.');
    this.name = 'PhotoPreparationError';
  }
}

async function webPhotoBlob(uri: string, mimeType: string): Promise<Blob> {
  const response = await fetch(uri);
  if (!response.ok) throw new PhotoPreparationError();
  const blob = await response.blob();
  return blob.type === mimeType ? blob : blob.slice(0, blob.size, mimeType);
}

export async function appendPhotoToFormData(
  form: FormData,
  fieldName: string,
  uri: string,
  mimeType: string | null | undefined,
  filenamePrefix: string,
) {
  const photo = createPhotoUpload(uri, mimeType, filenamePrefix);

  try {
    if (Platform.OS === 'web') {
      const blob = await webPhotoBlob(uri, photo.type);
      form.append(fieldName, blob, photo.name);
      return;
    }

    const file = new File(uri);
    if (!file.exists) throw new PhotoPreparationError();
    form.append(fieldName, file);
  } catch (error) {
    if (error instanceof PhotoPreparationError) throw error;
    throw new PhotoPreparationError();
  }
}
