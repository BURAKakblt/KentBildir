export const ISSUE_CATEGORIES = [
  'Yol Çukuru / Yol Hasarı', 'Kaldırım Bozukluğu', 'Taşmış Çöp Konteyneri',
  'Çevreye Bırakılmış Çöp / Kirlilik', 'Hasarlı Şehir Ekipmanı', 'Diğer',
] as const;

export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];
export type ReportStatus = 'Gönderildi';
export interface ReportSummary { id: string; category: IssueCategory; date: string; status: ReportStatus }
