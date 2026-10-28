import { describe, expect, it, vi } from 'vitest';
import { createAuthVerifier } from './requireUser.js';
import type { Supabase } from '../lib/supabase.js';

describe('createAuthVerifier', () => {
  it('kimliği Supabase Auth getUser ile doğrular; JWT gövdesine güvenmez', async () => {
    const getUser = vi.fn().mockResolvedValue({ data: { user: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' } }, error: null });
    const verifier = createAuthVerifier({ auth: { getUser } } as unknown as Supabase);
    await expect(verifier.getUser('untrusted.jwt.value')).resolves.toEqual({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' });
    expect(getUser).toHaveBeenCalledWith('untrusted.jwt.value');
  });

  it('Supabase Auth reddettiğinde kullanıcı döndürmez', async () => {
    const verifier = createAuthVerifier({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('invalid') }) } } as unknown as Supabase);
    await expect(verifier.getUser('invalid')).resolves.toBeNull();
  });
});
