import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '@/constants/theme';

interface Props { label: string; onPress: () => void; disabled?: boolean; variant?: 'primary' | 'secondary' }

export function PrimaryButton({ label, onPress, disabled = false, variant = 'primary' }: Props) {
  const secondary = variant === 'secondary';
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, secondary ? styles.secondary : styles.primary, pressed && !disabled && styles.pressed, disabled && styles.disabled]}>
      <Text style={[styles.label, secondary && styles.secondaryLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  primary: { backgroundColor: colors.primary }, secondary: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  pressed: { opacity: 0.82 }, disabled: { opacity: 0.45 }, label: { color: colors.white, fontSize: 17, fontWeight: '700' }, secondaryLabel: { color: colors.text },
});
