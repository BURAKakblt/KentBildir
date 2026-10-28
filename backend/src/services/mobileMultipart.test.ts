import { afterEach, describe, expect, it, vi } from 'vitest';
import { Platform } from 'react-native';
import { appendPhotoToFormData, PhotoPreparationError } from '../../../mobile/src/services/photoMultipart.ts';

class FormDataStub {
  entries: Array<[string, unknown, string | undefined]> = [];
  append(name: string, value: unknown, filename?: string) { this.entries.push([name, value, filename]); }
}

describe('mobile photo multipart', () => {
  afterEach(() => {
    Platform.OS = 'ios';
    vi.unstubAllGlobals();
  });

  it('native dosyayı URI nesnesi yerine Expo File olarak ekler', async () => {
    const form = new FormDataStub();
    await appendPhotoToFormData(form as unknown as FormData, 'photo', 'file:///cache/photo.jpg', 'image/jpeg', 'analysis');
    expect(form.entries).toEqual([['photo', expect.objectContaining({ uri: 'file:///cache/photo.jpg', name: 'photo.jpg', type: 'image/jpeg' }), undefined]]);
  });

  it('web fotoğrafını MIME tipi ve dosya adıyla Blob olarak ekler', async () => {
    Platform.OS = 'web';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['image'], { type: 'image/jpeg' }) }));
    const form = new FormDataStub();
    await appendPhotoToFormData(form as unknown as FormData, 'photo', 'blob:web-photo', 'image/png', 'report');
    const [name, value, filename] = form.entries[0] ?? [];
    expect(name).toBe('photo');
    expect(value).toBeInstanceOf(Blob);
    expect((value as Blob).type).toBe('image/png');
    expect(filename).toBe('report.png');
  });

  it('dosya hazırlanamadığında teknik ayrıntı sızdırmaz', async () => {
    Platform.OS = 'web';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('raw file detail')));
    await expect(appendPhotoToFormData(new FormDataStub() as unknown as FormData, 'photo', 'blob:missing', 'image/jpeg', 'analysis'))
      .rejects.toBeInstanceOf(PhotoPreparationError);
  });
});
