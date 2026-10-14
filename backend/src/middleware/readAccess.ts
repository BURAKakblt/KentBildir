import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
export function readAccess(expected?: string): RequestHandler { return (req,res,next) => {
  if (!expected) { res.status(403).json({error:'Rapor okuma, kimlik doğrulama eklenene kadar kapalıdır.'}); return; }
  const match=req.header('authorization')?.match(/^Bearer ([^\s]+)$/);
  const actual=match?.[1] ?? '';
  const a=Buffer.from(actual), b=Buffer.from(expected);
  if (a.length!==b.length || !timingSafeEqual(a,b)) { res.status(403).json({error:'Erişim reddedildi.'}); return; }
  next();
}; }
