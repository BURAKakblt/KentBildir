import { AppState, Platform } from 'react-native';
import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const webStorage = {
  getItem: async (key: string) => typeof window === 'undefined' ? null : window.localStorage.getItem(key),
  setItem: async (key: string, value: string) => { if (typeof window !== 'undefined') window.localStorage.setItem(key, value); },
  removeItem: async (key: string) => { if (typeof window !== 'undefined') window.localStorage.removeItem(key); },
};

let client: SupabaseClient | null = null;
let refreshSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) throw new Error('Anonim oturum yapılandırması eksik. Uygulamayı güncel yapılandırmayla yeniden başlatın.');
  client = createClient(url, publishableKey, {
    auth: {
      storage: Platform.OS === 'web' ? webStorage : secureStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}

export function startAuthAutoRefresh(supabase: SupabaseClient) {
  if (Platform.OS === 'web' || refreshSubscription) return;
  refreshSubscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
  supabase.auth.startAutoRefresh();
}

export function stopAuthAutoRefresh(supabase: SupabaseClient) {
  refreshSubscription?.remove();
  refreshSubscription = null;
  if (Platform.OS !== 'web') supabase.auth.stopAutoRefresh();
}
