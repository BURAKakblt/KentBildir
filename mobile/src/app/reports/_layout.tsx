import { Stack } from 'expo-router';

import { colors } from '@/constants/theme';

export default function ReportsLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Bildirimlerim' }} />
      <Stack.Screen name="[id]" options={{ title: 'Bildirim Detayı' }} />
    </Stack>
  );
}
