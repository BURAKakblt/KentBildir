import { describe, expect, it, vi } from 'vitest';
vi.mock('../../../mobile/src/services/supabase.ts', () => ({ getSupabaseClient: vi.fn() }));
import { getCurrentAccessToken, MissingSessionWithHistoryError, restoreOrCreateAnonymousSession } from '../../../mobile/src/services/auth.ts';
import type { SupabaseClient } from '@supabase/supabase-js';

const session = { access_token: 'access-token', refresh_token: 'refresh-token', expires_in: 3600, expires_at: 2_000_000_000, token_type: 'bearer', user: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', aud: 'authenticated', role: 'authenticated', created_at: '' } };

function client(getSession: () => Promise<unknown>, signInAnonymously = vi.fn()) {
  return { auth: { getSession, signInAnonymously } } as unknown as SupabaseClient;
}

describe('mobile anonymous auth', () => {
  it('uygulama yeniden açıldığında saklanan oturumu kullanır', async () => {
    const signInAnonymously = vi.fn();
    const supabase = client(async () => ({ data: { session }, error: null }), signInAnonymously);
    await expect(restoreOrCreateAnonymousSession(supabase)).resolves.toEqual(session);
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it('geri yükleme hatasında sessizce yeni anonim kullanıcı oluşturmaz', async () => {
    const signInAnonymously = vi.fn();
    const supabase = client(async () => ({ data: { session: null }, error: new Error('storage failed') }), signInAnonymously);
    await expect(restoreOrCreateAnonymousSession(supabase)).rejects.toThrow('geri yüklenemedi');
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it('yerel geçmiş varken oturum yoksa yeni anonim kullanıcı oluşturmaz', async () => {
    const signInAnonymously = vi.fn();
    const supabase = client(async () => ({ data: { session: null }, error: null }), signInAnonymously);
    await expect(restoreOrCreateAnonymousSession(supabase, false)).rejects.toBeInstanceOf(MissingSessionWithHistoryError);
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it('kullanıcı açıkça onayladıktan sonra eski geçmişi sahiplenmeden yeni oturum oluşturabilir', async () => {
    const signInAnonymously = vi.fn().mockResolvedValue({ data: { session }, error: null });
    const supabase = client(async () => ({ data: { session: null }, error: null }), signInAnonymously);
    await expect(restoreOrCreateAnonymousSession(supabase, true)).resolves.toEqual(session);
    expect(signInAnonymously).toHaveBeenCalledOnce();
  });

  it('yalnızca oturum yoksa anonim kullanıcı oluşturur ve tokenı döndürür', async () => {
    const signInAnonymously = vi.fn().mockResolvedValue({ data: { session }, error: null });
    const getSession = vi.fn()
      .mockResolvedValueOnce({ data: { session: null }, error: null })
      .mockResolvedValueOnce({ data: { session }, error: null });
    const supabase = client(getSession, signInAnonymously);
    await expect(restoreOrCreateAnonymousSession(supabase)).resolves.toEqual(session);
    await expect(getCurrentAccessToken(supabase)).resolves.toBe('access-token');
    expect(signInAnonymously).toHaveBeenCalledOnce();
  });
});
