import { Stack } from 'expo-router';

import { colors } from '@/constants/theme';
import { ReportDraftProvider } from '@/context/ReportDraftContext';

export default function ReportLayout() {
  return (
    <ReportDraftProvider>
      <Stack
        screenOptions={{
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Sorun Bildir' }} />
        <Stack.Screen name="analysis" options={{ title: 'Analiz Sonucu' }} />
        <Stack.Screen name="form" options={{ title: 'Bildirim Formu' }} />
      </Stack>
    </ReportDraftProvider>
  );
}
