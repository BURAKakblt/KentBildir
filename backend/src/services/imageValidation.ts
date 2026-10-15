import { fileTypeFromBuffer } from 'file-type';
const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
export class FileValidationError extends Error {}
export async function validateImage(file: Express.Multer.File) {
  const detected = await fileTypeFromBuffer(file.buffer);
  if (!detected || !ALLOWED_IMAGE_MIMES.has(detected.mime) || detected.mime !== file.mimetype) throw new FileValidationError('Geçersiz veya MIME bilgisi uyuşmayan fotoğraf.');
  return detected;
}
