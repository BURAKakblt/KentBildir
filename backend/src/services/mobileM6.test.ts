import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET_REPORT_TIMEOUT_MS, getReport, getReportPhotoSource } from '../../../mobile/src/services/api.ts';
import { addReportToHistory, getReportHistory, hasStoredReportHistory, MAX_REPORT_HISTORY } from '../../../mobile/src/services/reportHistory.ts';
import { loadHistoryReports } from '../../../mobile/src/services/reportList.ts';
import { createReportMapUrl, emailStatusLabel, formatReportDate, reportStatusLabel } from '../../../mobile/src/services/reportPresentation.ts';
import appConfig from '../../../mobile/app.json';

function storage(initial: string | null = null) {
  let value = initial;
  return { getItem: vi.fn(async () => value), setItem: vi.fn(async (_key: string, next: string) => { value = next; }), removeItem: vi.fn(async () => { value = null; }) };
}
const a = '11111111-1111-4111-8111-111111111111';
const b = '22222222-2222-4222-8222-222222222222';

describe('mobile M6 services', () => {
  afterEach(() => { vi.unstubAllGlobals(); delete process.env.EXPO_PUBLIC_API_URL; });

  it('adds history, removes duplicates, and returns newest first', async () => {
    const store = storage();
    await addReportToHistory(a, '2026-10-15T10:00:00.000Z', store);
    await addReportToHistory(b, '2026-10-16T10:00:00.000Z', store);
    await addReportToHistory(a, '2026-10-14T10:00:00.000Z', store);
    expect(await getReportHistory(store)).toEqual([
      { reportId: b, submittedAt: '2026-10-16T10:00:00.000Z' },
      { reportId: a, submittedAt: '2026-10-14T10:00:00.000Z' },
    ]);
  });

  it('returns an empty history for malformed storage JSON', async () => {
    expect(await getReportHistory(storage('{broken'))).toEqual([]);
    expect(await hasStoredReportHistory(storage('{broken'))).toBe(true);
  });

  it('builds encoded report URLs and maps 404 to a friendly error', async () => {
    process.env.EXPO_PUBLIC_API_URL = 'https://api.example.test/';
    const fetchMock = vi.fn().mockResolvedValue({ status: 404, ok: false });
    vi.stubGlobal('fetch', fetchMock);
    await expect(getReport('id/with slash', 'test-token')).rejects.toThrow('Bildirim bulunamadı.');
    expect(fetchMock).toHaveBeenCalledWith('https://api.example.test/api/reports/id%2Fwith%20slash', expect.objectContaining({ signal: expect.any(AbortSignal), headers: { Authorization: 'Bearer test-token' } }));
    expect(getReportPhotoSource('id/with slash', 'test-token')).toEqual({ uri: 'https://api.example.test/api/reports/id%2Fwith%20slash/photo', headers: { Authorization: 'Bearer test-token' } });
  });

  it('uses safe status and all email labels', () => {
    expect(reportStatusLabel('failed')).toBe('Gönderilemedi');
    expect(reportStatusLabel('unexpected')).toBe('Güncel durum bilinmiyor');
    expect(emailStatusLabel('sent')).toBe('E-posta iletildi');
    expect(emailStatusLabel('failed')).toBe('E-posta iletimi tamamlanamadı');
    expect(emailStatusLabel('pending')).toBe('E-posta iletim durumu bekleniyor');
    expect(emailStatusLabel('disabled')).toBe('E-posta iletimi devre dışı');
  });

  it('limits history and filters malformed array items', async () => {
    const valid = Array.from({ length: 30 }, (_, index) => ({ reportId: `00000000-0000-4000-8000-${index.toString(16).padStart(12, '0')}`, submittedAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString() }));
    const store = storage(JSON.stringify([...valid, null, { reportId: 'bad', submittedAt: 'invalid' }]));
    const history = await getReportHistory(store);
    expect(history).toHaveLength(MAX_REPORT_HISTORY);
    expect(history[0]?.submittedAt).toBe(valid[29]?.submittedAt);
  });

  it('times out a hanging GET report request with a friendly message', async () => {
    vi.useFakeTimers();
    process.env.EXPO_PUBLIC_API_URL = 'https://api.example.test';
    vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => init.signal?.addEventListener('abort', () => reject(new DOMException('raw timeout', 'AbortError'))))));
    try {
      const pending = getReport(a, 'test-token');
      const expectation = expect(pending).rejects.toThrow('Sunucuya ulaşılamadı. Lütfen tekrar deneyin.');
      await vi.advanceTimersByTimeAsync(GET_REPORT_TIMEOUT_MS);
      await expectation;
    } finally { vi.useRealTimers(); }
  });

  it('formats invalid values safely and rejects invalid map coordinates', () => {
    expect(formatReportDate('invalid')).toBe('Tarih bilgisi kullanılamıyor');
    expect(createReportMapUrl(Number.NaN, 29)).toBeNull();
    expect(createReportMapUrl(91, 29)).toBeNull();
    expect(createReportMapUrl(41, 29)).toBe('https://www.google.com/maps?q=41%2C29');
  });

  it('native config blocks audio recording instead of requesting it', () => {
    expect(appConfig.expo.android.blockedPermissions).toContain('android.permission.RECORD_AUDIO');
    expect(appConfig.expo.android.permissions).not.toContain('android.permission.RECORD_AUDIO');
    const imagePicker = appConfig.expo.plugins.find(plugin => Array.isArray(plugin) && plugin[0] === 'expo-image-picker');
    expect(imagePicker).toEqual(expect.arrayContaining(['expo-image-picker', expect.objectContaining({ microphonePermission: false })]));
    expect(appConfig.expo.ios.infoPlist.NSAppTransportSecurity.NSAllowsLocalNetworking).toBe(true);
    expect(appConfig.expo.ios.infoPlist.NSLocalNetworkUsageDescription).toContain('yerel ağ');
  });

  it('keeps successful reports when one history fetch fails', async () => {
    const good = { id: a } as never;
    const result = await loadHistoryReports([{ reportId: a, submittedAt: '2026-10-16T10:00:00Z' }, { reportId: b, submittedAt: '2026-10-15T10:00:00Z' }], async id => {
      if (id === b) throw new Error('offline');
      return good;
    });
    expect(result).toEqual([good]);
  });
});
