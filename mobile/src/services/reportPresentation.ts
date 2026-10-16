import { ISSUE_CATEGORIES, REPORT_STATUSES } from '../constants/categories';
import type { EmailDeliveryStatus, IssueCategoryId } from '../types/report';

export function categoryLabel(id: IssueCategoryId | null) { return ISSUE_CATEGORIES.find(category => category.id === id)?.label ?? 'Kategori bilinmiyor'; }
export function reportStatusLabel(status: string) { return REPORT_STATUSES.find(item => item.id === status)?.label ?? 'Güncel durum bilinmiyor'; }
export function emailStatusLabel(status: EmailDeliveryStatus) {
  if (status === 'sent') return 'E-posta iletildi';
  if (status === 'failed') return 'E-posta iletimi tamamlanamadı';
  if (status === 'pending') return 'E-posta iletim durumu bekleniyor';
  return 'E-posta iletimi devre dışı';
}

export function formatReportDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Tarih bilgisi kullanılamıyor' : new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long', timeStyle: 'short' }).format(date);
}

export function createReportMapUrl(latitude: number, longitude: number) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return `https://www.google.com/maps?q=${encodeURIComponent(`${latitude},${longitude}`)}`;
}
