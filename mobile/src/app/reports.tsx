import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { colors, spacing } from '@/constants/theme';
import { MOCK_REPORTS } from '@/data/mockReports';

export default function ReportsScreen() {
  return (
    <Screen>
      <SectionHeader title="Geçmiş bildirimler" description="Daha önce oluşturduğunuz bildirimleri buradan takip edebilirsiniz." />
      <View style={styles.list}>
        {MOCK_REPORTS.map((report) => (
          <View key={report.id} style={styles.card}>
            <Text style={styles.category}>{report.category}</Text>
            <View style={styles.row}>
              <Text style={styles.date}>{report.date}</Text>
              <View style={styles.badge}><Text style={styles.badgeText}>{report.status}</Text></View>
            </View>
          </View>
        ))}
      </View>
      <Text style={styles.note}>Bu ekrandaki veriler M1 için örnek olarak gösterilmektedir.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md, marginTop: spacing.lg }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: spacing.lg },
  category: { color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: spacing.md }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }, date: { color: colors.textMuted, fontSize: 14 },
  badge: { backgroundColor: colors.successSoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99 }, badgeText: { color: colors.success, fontSize: 12, fontWeight: '700' }, note: { color: colors.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: spacing.lg },
});
