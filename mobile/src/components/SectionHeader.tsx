import { StyleSheet, Text } from 'react-native';
import { colors } from '@/constants/theme';

export function SectionHeader({ title, description }: { title: string; description?: string }) {
  return <><Text style={styles.title}>{title}</Text>{description ? <Text style={styles.description}>{description}</Text> : null}</>;
}
const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
  description: { color: colors.textMuted, fontSize: 16, lineHeight: 23, marginTop: 8 },
});
