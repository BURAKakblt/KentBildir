import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '@/constants/theme';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'tertiary';
  accessibilityLabel?: string;
}

export function PrimaryButton({ label, onPress, disabled = false, loading = false, variant = 'primary', accessibilityLabel = label }: PrimaryButtonProps) {
  const secondary = variant === 'secondary';
  const tertiary = variant === 'tertiary';
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: loading, disabled: inactive }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [styles.button, secondary ? styles.secondary : tertiary ? styles.tertiary : styles.primary, pressed && !inactive && styles.pressed, inactive && styles.disabled]}
    >
      {loading ? (
        <ActivityIndicator color={secondary || tertiary ? colors.primary : colors.white} />
      ) : (
        <Text style={[styles.label, (secondary || tertiary) && styles.secondaryLabel]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  tertiary: { backgroundColor: 'transparent' },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.45 },
  label: { color: colors.white, fontSize: 17, fontWeight: '700' },
  secondaryLabel: { color: colors.text },
});
