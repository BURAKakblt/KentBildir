export const CATEGORY_LABELS = {
  pothole: 'Yol Çukuru / Yol Hasarı',
  sidewalk_damage: 'Kaldırım Bozukluğu',
  overflowing_bin: 'Taşmış Çöp Konteyneri',
  litter: 'Çevreye Bırakılmış Çöp / Kirlilik',
  damaged_city_equipment: 'Hasarlı Şehir Ekipmanı',
  other: 'Diğer',
} as const;

export const REPORT_CATEGORY_IDS = Object.keys(CATEGORY_LABELS) as [keyof typeof CATEGORY_LABELS, ...(keyof typeof CATEGORY_LABELS)[]];
