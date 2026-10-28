import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ReportHistoryEntry { reportId: string; submittedAt: string }
interface HistoryStorage { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void>; removeItem(key: string): Promise<void> }
const STORAGE_KEY = 'kentbildir.report-history.v1';
export const MAX_REPORT_HISTORY = 25;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function hasStoredReportHistory(storage: HistoryStorage = AsyncStorage): Promise<boolean> {
  return (await storage.getItem(STORAGE_KEY)) !== null;
}

export async function getReportHistory(storage: HistoryStorage = AsyncStorage): Promise<ReportHistoryEntry[]> {
  try {
    const raw = await storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is ReportHistoryEntry => {
      if (!item || typeof item !== 'object') return false;
      const value = item as Record<string, unknown>;
      return typeof value.reportId === 'string' && uuid.test(value.reportId) && typeof value.submittedAt === 'string' && !Number.isNaN(Date.parse(value.submittedAt));
    }).sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt)).slice(0, MAX_REPORT_HISTORY);
  } catch { return []; }
}

export async function addReportToHistory(reportId: string, submittedAt: string, storage: HistoryStorage = AsyncStorage) {
  if (!uuid.test(reportId) || Number.isNaN(Date.parse(submittedAt))) throw new Error('invalid_report_history_entry');
  const current = await getReportHistory(storage);
  const next = [{ reportId, submittedAt }, ...current.filter(item => item.reportId !== reportId)]
    .sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt))
    .slice(0, MAX_REPORT_HISTORY);
  await storage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export async function removeReportFromHistory(reportId: string, storage: HistoryStorage = AsyncStorage) {
  const current = await getReportHistory(storage);
  await storage.setItem(STORAGE_KEY, JSON.stringify(current.filter(item => item.reportId !== reportId)));
}

export async function clearReportHistory(storage: HistoryStorage = AsyncStorage) { await storage.removeItem(STORAGE_KEY); }
