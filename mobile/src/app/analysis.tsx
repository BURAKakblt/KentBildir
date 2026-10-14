import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { CategorySelector } from '@/components/CategorySelector';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';
import type { IssueCategory } from '@/types/report';

export default function AnalysisScreen() {
  const { photoUri } = useLocalSearchParams<{ photoUri?: string }>();
  const [category, setCategory] = useState<IssueCategory>('Kaldırım Bozukluğu');

  return (
    <Screen contentContainerStyle={styles.container}>
      {photoUri ? <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" accessibilityLabel="Analiz edilen sorun fotoğrafı" /> : null}
      <View style={styles.resultCard}>
        <Text style={styles.eyebrow}>TAHMİN EDİLEN SORUN</Text>
        <Text style={styles.result}>{category}</Text>
        <View style={styles.confidenceRow}><Text style={styles.meta}>Güven</Text><Text style={styles.confidence}>%92</Text></View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kategoriyi doğrulayın</Text>
        <Text style={styles.helper}>Tahmin doğru değilse başka bir kategori seçebilirsiniz.</Text>
        <CategorySelector value={category} onChange={setCategory} />
      </View>

      <View style={styles.locationCard}>
        <Text style={styles.locationTitle}>Konum</Text>
        <Text style={styles.helper}>{"Konum bilgisi M2'de eklenecek."}</Text>
      </View>
      <PrimaryButton label="Bildirimi Hazırla" onPress={() => Alert.alert('Başarılı', 'Bildirim taslağı hazırlandı.')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg, paddingBottom: spacing.xl }, photo: { width: '100%', aspectRatio: 16 / 10, borderRadius: 20, backgroundColor: colors.border },
  resultCard: { backgroundColor: colors.primarySoft, borderRadius: 18, padding: spacing.lg }, eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1 }, result: { color: colors.text, fontSize: 22, fontWeight: '800', marginTop: spacing.sm },
  confidenceRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: spacing.sm }, meta: { color: colors.textMuted, fontSize: 15 }, confidence: { color: colors.success, fontSize: 16, fontWeight: '800' },
  section: { gap: spacing.sm }, sectionTitle: { color: colors.text, fontSize: 19, fontWeight: '800' }, helper: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginBottom: spacing.sm },
  locationCard: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: spacing.md }, locationTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: spacing.xs },
});
