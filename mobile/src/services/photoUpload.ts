export const SUPPORTED_PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type SupportedPhotoMimeType = (typeof SUPPORTED_PHOTO_MIME_TYPES)[number];

export interface PhotoUpload {
  uri: string;
  name: string;
  type: SupportedPhotoMimeType;
}

const mimeByExtension: Record<string, SupportedPhotoMimeType> = {
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const extensionByMime: Record<SupportedPhotoMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function supportedMimeType(value: string | null | undefined): SupportedPhotoMimeType | null {
  const normalized = value?.toLowerCase().trim();
  return SUPPORTED_PHOTO_MIME_TYPES.find((mimeType) => mimeType === normalized) ?? null;
}

export function createPhotoUpload(uri: string, mimeType: string | null | undefined, filenamePrefix: string): PhotoUpload {
  const detectedMimeType = supportedMimeType(mimeType);
  if (mimeType && !detectedMimeType) {
    throw new Error('Fotoğraf JPEG, PNG veya WebP formatında olmalıdır.');
  }

  const extension = uri.split('?')[0]?.split('.').pop()?.toLowerCase();
  const inferredMimeType = extension ? mimeByExtension[extension] : undefined;
  const type = detectedMimeType ?? inferredMimeType;
  if (!type) throw new Error('Fotoğraf formatı belirlenemedi. JPEG, PNG veya WebP formatında tekrar deneyin.');

  return { uri, name: `${filenamePrefix}.${extensionByMime[type]}`, type };
}
