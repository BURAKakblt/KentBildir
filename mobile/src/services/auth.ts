import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase';

export class MissingSessionWithHistoryError extends Error {
  constructor() {
    super('Bu cihazda eski bildirim geçmişi var ancak ona ait güvenli oturum bulunamadı. Eski bildirimler yeni bir kullanıcıya aktarılmayacak.');
    this.name = 'MissingSessionWithHistoryError';
  }
}

export async function restoreOrCreateAnonymousSession(supabase: SupabaseClient = getSupabaseClient(), allowCreate = true): Promise<Session> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error('Kaydedilmiş oturum geri yüklenemedi. Lütfen bağlantınızı kontrol edip tekrar deneyin.');
  if (data.session) return data.session;
  if (!allowCreate) {
    throw new MissingSessionWithHistoryError();
  }

  const created = await supabase.auth.signInAnonymously();
  if (created.error || !created.data.session) {
    throw new Error('Güvenli kullanıcı oturumu oluşturulamadı. Lütfen tekrar deneyin.');
  }
  return created.data.session;
}

export async function getCurrentAccessToken(supabase: SupabaseClient = getSupabaseClient()): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error('Oturumunuz doğrulanamadı. Formunuz korunuyor; bağlantıyı kontrol edip tekrar deneyin.');
  }
  return data.session.access_token;
}
