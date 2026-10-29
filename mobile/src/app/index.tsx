import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';

export default function HomeScreen() {
  return (
    <Screen includeTopInset contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <View style={styles.mark}><Text style={styles.markText}>K</Text></View>
        <Text style={styles.title}>KentBildir</Text>
        <Text style={styles.subtitle}>Şehrinizde gördüğünüz sorunları fotoğraf ve konum bilgisiyle kolayca kaydedin.</Text>
      </View>
      <View style={styles.actions}>
        <PrimaryButton label="Yeni Bildirim Oluştur" onPress={() => router.push('/report')} />
        <PrimaryButton label="Bildirimlerim" variant="secondary" onPress={() => router.push('/reports')} />
      </View>
      <View style={styles.process} accessibilityLabel="Bildirim oluşturma adımları">
        <Text style={styles.processTitle}>Nasıl çalışır?</Text>
        <View style={styles.steps}>
          <Step number="1" title="Fotoğraf çek" description="Sorunu net biçimde gösterin." />
          <Step number="2" title="Kategoriyi doğrula" description="AI önerisini kontrol edin." />
          <Step number="3" title="Gönder" description="Konum ve açıklamayla kaydedin." />
        </View>
      </View>
    </Screen>
  );
}

function Step({ number, title, description }: { number: string; title: string; description: string }) {
  return <View style={styles.step}>
    <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{number}</Text></View>
    <View style={styles.stepCopy}><Text style={styles.stepTitle}>{title}</Text><Text style={styles.stepDescription}>{description}</Text></View>
  </View>;
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, gap: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.xl },
  hero: { alignItems: 'center' },
  mark: { width: 68, height: 68, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  markText: { color: colors.white, fontSize: 32, fontWeight: '800' },
  title: { color: colors.text, fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  subtitle: { color: colors.textMuted, fontSize: 16, lineHeight: 24, marginTop: spacing.sm, maxWidth: 340, textAlign: 'center' },
  actions: { gap: spacing.md },
  process: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 20, padding: spacing.lg, gap: spacing.md },
  processTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  steps: { gap: spacing.md },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48 },
  stepNumber: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { color: colors.primary, fontSize: 15, fontWeight: '800' },
  stepCopy: { flex: 1 },
  stepTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  stepDescription: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 2 },
});
