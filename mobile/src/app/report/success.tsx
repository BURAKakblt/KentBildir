import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';
import { useReportDraft } from '@/context/ReportDraftContext';

export default function SuccessScreen() {
  const { draft, resetDraft } = useReportDraft();
  const deliveryMessage = draft.emailDeliveryStatus === 'sent'
    ? 'Bildirim kaydedildi ve ilgili birime e-posta iletildi.'
    : draft.emailDeliveryStatus === 'failed'
      ? 'Bildirim kaydedildi ancak e-posta iletimi tamamlanamadı.'
      : draft.emailDeliveryStatus === 'pending'
        ? 'Bildirim kaydedildi. E-posta iletim durumu henüz kesinleşmedi.'
      : 'Bildirim başarıyla kaydedildi.';
  function createNew() { resetDraft(true); router.replace('/report'); }
  return <Screen contentContainerStyle={styles.container}><View style={styles.card}><Text style={styles.title}>Bildirim başarıyla kaydedildi</Text><Text style={styles.message}>{deliveryMessage}</Text><Text style={styles.label}>Bildirim numarası</Text><Text selectable style={styles.id}>{draft.submittedReportId ?? draft.id}</Text></View><PrimaryButton label="Yeni Bildirim Oluştur" onPress={createNew} /></Screen>;
}
const styles = StyleSheet.create({ container: { justifyContent: 'center', gap: spacing.lg }, card: { backgroundColor: colors.successSoft, borderRadius: 20, padding: spacing.lg, gap: spacing.sm }, title: { color: colors.text, fontSize: 22, fontWeight: '800' }, message: { color: colors.text, fontSize: 15 }, label: { color: colors.textMuted, fontSize: 13 }, id: { color: colors.text, fontSize: 14, fontWeight: '700' } });
