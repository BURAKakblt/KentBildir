import type { IssueCategoryId } from '@/types/report';

const DESCRIPTIONS: Record<IssueCategoryId, string> = {
  pothole: 'Belirtilen konumda yol yüzeyinde çukur veya hasar bulunmaktadır. İncelenerek gerekli bakım çalışmasının yapılmasını rica ederim.',
  sidewalk_damage: 'Belirtilen konumda kaldırım yüzeyinde yayaların kullanımını zorlaştıran bir hasar bulunmaktadır. Kontrol edilmesini rica ederim.',
  overflowing_bin: 'Belirtilen konumda çöp konteynerinin dolu veya taşmış durumda olduğu görülmektedir. Gerekli temizlik işleminin yapılmasını rica ederim.',
  litter: 'Belirtilen konumda çevreye bırakılmış atık veya kirlilik bulunmaktadır. Gerekli temizlik çalışmasının yapılmasını rica ederim.',
  damaged_city_equipment: 'Belirtilen konumda şehir ekipmanında hasar tespit edilmiştir. Kontrol edilerek gerekli bakımın yapılmasını rica ederim.',
  other: 'Belirtilen konumda belediyenin incelemesini gerektiren bir sorun bulunmaktadır.',
};

export function getDefaultDescription(categoryId: IssueCategoryId): string {
  return DESCRIPTIONS[categoryId];
}
