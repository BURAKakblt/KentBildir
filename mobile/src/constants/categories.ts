export const ISSUE_CATEGORIES = [
  { id: 'pothole', label: 'Yol Çukuru / Yol Hasarı' },
  { id: 'sidewalk_damage', label: 'Kaldırım Bozukluğu' },
  { id: 'overflowing_bin', label: 'Taşmış Çöp Konteyneri' },
  { id: 'litter', label: 'Çevreye Bırakılmış Çöp / Kirlilik' },
  { id: 'damaged_city_equipment', label: 'Hasarlı Şehir Ekipmanı' },
  { id: 'other', label: 'Diğer' },
] as const;

export const REPORT_STATUSES = [
  { id: 'submitted', label: 'Gönderildi' },
  { id: 'failed', label: 'Gönderilemedi' },
] as const;
