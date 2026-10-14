import type { PropsWithChildren } from 'react';
import { ScrollView, type StyleProp, StyleSheet, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/constants/theme';

interface ScreenProps extends PropsWithChildren { contentContainerStyle?: StyleProp<ViewStyle>; includeTopInset?: boolean }

export function Screen({ children, contentContainerStyle, includeTopInset = false }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={includeTopInset ? ['top', 'bottom'] : ['bottom']}>
      <ScrollView contentContainerStyle={[styles.content, contentContainerStyle]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
});
