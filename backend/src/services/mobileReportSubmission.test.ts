import { afterEach, describe, expect, it, vi } from 'vitest';
import { submitReport } from '../../../mobile/src/services/api.ts';
import type { ReportDraft } from '../../../mobile/src/types/report.ts';
import { reportMetadataSchema } from '../schemas/report.ts';

class FormDataStub {
  entries: Array<[string, unknown, string | undefined]> = [];
  append(name: string, value: unknown, filename?: string) { this.entries.push([name, value, filename]); }
}

const draft: ReportDraft = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  photoUri: 'file:///cache/photo.jpg',
  photoMimeType: 'image/jpeg',
  photoSource: 'library',
  aiSuggestion: null,
  selectedCategoryId: 'pothole',
  categorySelectionSource: 'user',
  description: 'Yolda büyük bir çukur bulunmaktadır.',
  descriptionEdited: true,
  location: {
    latitude: 41,
    longitude: 29,
    accuracy: 5,
    address: 'Test adresi',
    capturedAt: Date.now(),
    precision: 'precise',
    isMocked: false,
    city: 'İstanbul',
    subregion: 'Kadıköy',
    district: 'Kadıköy',
    postalCode: null,
    countryCode: 'TR',
  },
  status: 'analyzed',
  submittedReportId: null,
  emailDeliveryStatus: null,
};

describe('mobile report multipart submission', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.EXPO_PUBLIC_API_URL;
  });

  it('metadata ve Expo File parçasını bearer token ile gönderir', async () => {
    process.env.EXPO_PUBLIC_API_URL = 'https://api.example.test';
    vi.stubGlobal('FormData', FormDataStub);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      headers: { get: () => 'application/json' },
      json: async () => ({ report: { id: draft.id, status: 'submitted', created_at: '2026-10-28T00:00:00.000Z' }, delivery: { emailStatus: 'disabled' } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(submitReport(draft, 'access-token')).resolves.toMatchObject({ report: { id: draft.id }, emailStatus: 'disabled' });
    expect(fetchMock).toHaveBeenCalledWith('https://api.example.test/api/reports', expect.objectContaining({
      method: 'POST',
      headers: { Authorization: 'Bearer access-token' },
      body: expect.any(FormDataStub),
    }));
    const form = fetchMock.mock.calls[0]?.[1]?.body as FormDataStub;
    expect(form.entries[0]?.[0]).toBe('metadata');
    expect(form.entries[1]).toEqual(['photo', expect.objectContaining({ uri: draft.photoUri, type: 'image/jpeg' }), undefined]);
  });

  it('ham multipart hatasını Türkçe mesaja çevirir ve formun korunduğunu belirtir', async () => {
    process.env.EXPO_PUBLIC_API_URL = 'https://api.example.test';
    vi.stubGlobal('FormData', FormDataStub);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Unsupported FormDataPart implementation')));
    await expect(submitReport(draft, 'access-token')).rejects.toThrow('Fotoğraf gönderime hazırlanamadı. Fotoğrafı yeniden seçip tekrar deneyin; formunuz korunuyor.');
  });

  it('Diğer senaryosundaki kesirli iOS konum zamanını backend şemasına uygun tam milisaniyeye dönüştürür', async () => {
    process.env.EXPO_PUBLIC_API_URL = 'https://api.example.test';
    vi.stubGlobal('FormData', FormDataStub);
    const simulatorDraft: ReportDraft = {
      ...draft,
      aiSuggestion: { suggestedCategoryId: 'other', confidence: 0.99 },
      selectedCategoryId: 'other',
      categorySelectionSource: 'user',
      description: 'Yaya geçidinin yanında sınıflandırılamayan bir belediye sorunu bulunuyor.',
      descriptionEdited: true,
      location: { ...draft.location!, capturedAt: Date.now() + 0.625 },
    };

    const rawMetadata = {
      id: simulatorDraft.id,
      categoryId: simulatorDraft.selectedCategoryId,
      aiCategoryId: simulatorDraft.aiSuggestion?.suggestedCategoryId,
      aiConfidence: simulatorDraft.aiSuggestion?.confidence,
      description: simulatorDraft.description,
      descriptionEdited: simulatorDraft.descriptionEdited,
      latitude: simulatorDraft.location!.latitude,
      longitude: simulatorDraft.location!.longitude,
      accuracy: simulatorDraft.location!.accuracy,
      address: simulatorDraft.location!.address,
      capturedAt: simulatorDraft.location!.capturedAt,
      locationPrecision: simulatorDraft.location!.precision,
      locationIsMocked: simulatorDraft.location!.isMocked,
      city: simulatorDraft.location!.city,
      subregion: simulatorDraft.location!.subregion,
      district: simulatorDraft.location!.district,
      postalCode: simulatorDraft.location!.postalCode,
      countryCode: simulatorDraft.location!.countryCode,
    };
    const rejection = reportMetadataSchema.safeParse(rawMetadata);
    expect(rejection.success).toBe(false);
    if (!rejection.success) expect(rejection.error.issues.map((issue) => issue.path)).toContainEqual(['capturedAt']);

    const fetchMock = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
      const form = init.body as unknown as FormDataStub;
      const serialized = form.entries.find(([name]) => name === 'metadata')?.[1];
      const metadata = JSON.parse(String(serialized)) as { capturedAt: number };
      expect(metadata.capturedAt).toBe(Math.trunc(simulatorDraft.location!.capturedAt));
      expect(reportMetadataSchema.safeParse(metadata).success).toBe(true);
      return {
        ok: true,
        status: 201,
        headers: { get: () => 'application/json' },
        json: async () => ({ report: { id: simulatorDraft.id, status: 'submitted', created_at: '2026-10-28T00:00:00.000Z' }, delivery: { emailStatus: 'disabled' } }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(submitReport(simulatorDraft, 'access-token')).resolves.toMatchObject({ report: { id: simulatorDraft.id } });
  });

  it('backend metadata issue pathini güvenli ve anlaşılır alan mesajına çevirir', async () => {
    process.env.EXPO_PUBLIC_API_URL = 'https://api.example.test';
    vi.stubGlobal('FormData', FormDataStub);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      headers: { get: () => 'application/json' },
      json: async () => ({ error: 'Geçersiz metadata.', issues: [{ path: ['capturedAt'] }] }),
    }));

    await expect(submitReport(draft, 'access-token')).rejects.toThrow('Konum zamanı geçersiz veya güncel değil. Konumu tekrar alıp yeniden deneyin; formunuz korunuyor.');
  });
});
