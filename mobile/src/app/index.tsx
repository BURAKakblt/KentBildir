import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';

export default function HomeScreen() {
  return (
    <Screen contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <View style={styles.mark}><Text style={styles.markText}>K</Text></View>
        <Text style={styles.title}>KentBildir</Text>
        <Text style={styles.subtitle}>Şehrindeki bir sorunu kolayca bildir.</Text>
      </View>
      <View style={styles.actions}>
        <PrimaryButton label="Yeni Bildirim Oluştur" onPress={() => router.push('/report')} />
        <PrimaryButton label="Bildirimlerim" variant="secondary" onPress={() => router.push('/reports')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', paddingTop: 120, paddingBottom: 44 },
  hero: { alignItems: 'center' },
  mark: { width: 72, height: 72, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  markText: { color: colors.white, fontSize: 34, fontWeight: '800' },
  title: { color: colors.text, fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  subtitle: { color: colors.textMuted, fontSize: 17, lineHeight: 25, marginTop: spacing.sm, textAlign: 'center' },
  actions: { gap: spacing.md },
});
