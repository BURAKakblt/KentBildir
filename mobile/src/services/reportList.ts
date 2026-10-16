import type { ReportDetail } from './api';
import type { ReportHistoryEntry } from './reportHistory';

export async function loadHistoryReports(entries: ReportHistoryEntry[], fetchReport: (id: string) => Promise<ReportDetail>) {
  const settled = await Promise.allSettled(entries.map(entry => fetchReport(entry.reportId)));
  return settled.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
}
