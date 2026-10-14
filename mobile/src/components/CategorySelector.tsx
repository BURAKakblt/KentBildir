import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/constants/theme';
import { ISSUE_CATEGORIES, type IssueCategory } from '@/types/report';

export function CategorySelector({ value, onChange }: { value: IssueCategory; onChange: (value: IssueCategory) => void }) {
  return <View style={styles.list}>{ISSUE_CATEGORIES.map((category) => {
    const selected = category === value;
    return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} key={category} onPress={() => onChange(category)} style={[styles.option, selected && styles.optionSelected]}>
      <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioDot} /> : null}</View>
      <Text style={[styles.label, selected && styles.labelSelected]}>{category}</Text>
    </Pressable>;
  })}</View>;
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm }, option: { minHeight: 54, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, paddingHorizontal: spacing.md },
  optionSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary }, radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  radioSelected: { borderColor: colors.primary }, radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }, label: { flex: 1, color: colors.text, fontSize: 15, lineHeight: 21, fontWeight: '500' }, labelSelected: { color: colors.primary, fontWeight: '700' },
});
