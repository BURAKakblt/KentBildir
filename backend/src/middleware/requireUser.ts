import type { RequestHandler } from 'express';
import type { Supabase } from '../lib/supabase.js';

export interface AuthenticatedUser {
  id: string;
}

export interface AuthVerifier {
  getUser(accessToken: string): Promise<AuthenticatedUser | null>;
}

export function createAuthVerifier(db: Supabase): AuthVerifier {
  return {
    async getUser(accessToken) {
      const { data, error } = await db.auth.getUser(accessToken);
      if (error || !data.user?.id) return null;
      return { id: data.user.id };
    },
  };
}

function bearerToken(value: string | undefined) {
  const match = value?.match(/^Bearer ([^\s]+)$/i);
  return match?.[1] ?? null;
}

export function requireUser(verifier: AuthVerifier): RequestHandler {
  return async (req, res, next) => {
    const accessToken = bearerToken(req.header('authorization'));
    if (!accessToken) {
      res.status(401).json({ error: 'Kimlik doğrulaması gerekli.' });
      return;
    }

    try {
      const user = await verifier.getUser(accessToken);
      if (!user) {
        res.status(401).json({ error: 'Geçersiz veya süresi dolmuş oturum.' });
        return;
      }
      res.locals.user = user;
      next();
    } catch {
      res.status(401).json({ error: 'Oturum doğrulanamadı.' });
    }
  };
}

export function authenticatedUser(res: { locals: Record<string, unknown> }): AuthenticatedUser {
  const user = res.locals.user as AuthenticatedUser | undefined;
  if (!user?.id) throw new Error('authenticated_user_missing');
  return user;
}
