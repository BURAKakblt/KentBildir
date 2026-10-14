import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@/constants/theme';

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="report" options={{ title: 'Sorun Bildir' }} />
        <Stack.Screen name="analysis" options={{ title: 'Analiz Sonucu' }} />
        <Stack.Screen name="reports" options={{ title: 'Bildirimlerim' }} />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
