import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/constants/theme';
import { getCurrentAccessToken, MissingSessionWithHistoryError, restoreOrCreateAnonymousSession } from '@/services/auth';
import { hasStoredReportHistory } from '@/services/reportHistory';
import { getSupabaseClient, startAuthAutoRefresh, stopAuthAutoRefresh } from '@/services/supabase';

type AuthState =
  | { status: 'loading' }
  | { status: 'ready' }
  | { status: 'error'; message: string; canStartNewSession: boolean };

interface AuthContextValue {
  getAccessToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const authSubscriptionRef = useRef<{ unsubscribe(): void } | null>(null);

  const initialize = useCallback(async (allowNewSessionWithHistory = false) => {
    try {
      const supabase = supabaseRef.current ?? getSupabaseClient();
      supabaseRef.current = supabase;
      startAuthAutoRefresh(supabase);
      if (!authSubscriptionRef.current) {
        const { data } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_OUT' || !session) {
            setState({
              status: 'error',
              message: 'Oturumunuz sona erdi. Yeni bir anonim kullanıcı oluşturmadan önce tekrar deneyin.',
              canStartNewSession: false,
            });
          }
        });
        authSubscriptionRef.current = data.subscription;
      }
      const hasLocalHistory = await hasStoredReportHistory();
      await restoreOrCreateAnonymousSession(supabase, allowNewSessionWithHistory || !hasLocalHistory);
      setState({ status: 'ready' });
    } catch (error) {
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Oturum başlatılamadı. Lütfen tekrar deneyin.',
        canStartNewSession: error instanceof MissingSessionWithHistoryError,
      });
    }
  }, []);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    void initialize(false);
  }, [initialize]);

  const confirmNewSession = useCallback(() => {
    Alert.alert(
      'Yeni anonim oturum başlatılsın mı?',
      'Eski bildirimler bu yeni kullanıcıya aktarılmaz ve erişilemez kalır. Cihazdaki geçmiş listesi silinmez. Yeni bildirimleriniz yeni oturumla kaydedilir.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Yeni Oturum Başlat',
          style: 'destructive',
          onPress: () => {
            setState({ status: 'loading' });
            void initialize(true);
          },
        },
      ],
    );
  }, [initialize]);

  useEffect(() => {
    const timer = setTimeout(() => { void initialize(false); }, 0);
    return () => {
      clearTimeout(timer);
      authSubscriptionRef.current?.unsubscribe();
      authSubscriptionRef.current = null;
      if (supabaseRef.current) stopAuthAutoRefresh(supabaseRef.current);
    };
  }, [initialize]);

  const value = useMemo<AuthContextValue>(() => ({
    getAccessToken: () => {
      if (!supabaseRef.current) return Promise.reject(new Error('Oturum henüz hazır değil. Formunuz korunuyor; lütfen tekrar deneyin.'));
      return getCurrentAccessToken(supabaseRef.current);
    },
  }), []);

  if (state.status === 'loading') {
    return <View style={styles.container}><ActivityIndicator color={colors.primary} /><Text style={styles.message}>Güvenli oturum hazırlanıyor…</Text></View>;
  }
  if (state.status === 'error') {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>{state.message}</Text>
        <Pressable accessibilityRole="button" onPress={retry} style={styles.retry}>
          <Text style={styles.retryText}>Tekrar Dene</Text>
        </Pressable>
        {state.canStartNewSession ? (
          <Pressable accessibilityRole="button" onPress={confirmNewSession} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Yeni Anonim Oturum Başlat</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md, backgroundColor: colors.background },
  message: { color: colors.textMuted, textAlign: 'center' },
  error: { color: colors.text, textAlign: 'center', lineHeight: 22 },
  retry: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  retryText: { color: colors.white, fontWeight: '700' },
  secondaryButton: { borderColor: colors.primary, borderRadius: 12, borderWidth: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  secondaryButtonText: { color: colors.primary, fontWeight: '700' },
});
