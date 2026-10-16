import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  SUPABASE_URL: z.url(), SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  CORS_ORIGINS: z.string().default(''), NODE_ENV: z.enum(['development','test','production']).default('development'),
  GEMINI_API_KEY: z.preprocess(value => typeof value === 'string' ? (value.trim() || undefined) : value, z.string().min(10).optional()),
  GEMINI_VISION_MODEL: z.preprocess(value => typeof value === 'string' ? (value.trim() || undefined) : value, z.string().min(1).default('gemini-3.5-flash-lite')),
  EMAIL_ENABLED: z.string().trim().toLowerCase().pipe(z.enum(['true', 'false'])).default('false').transform(value => value === 'true'),
  SMTP_HOST: z.string().trim().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(465),
  SMTP_SECURE: z.string().trim().toLowerCase().pipe(z.enum(['true', 'false'])).default('true').transform(value => value === 'true'),
  SMTP_USER: z.string().trim().default(''),
  SMTP_PASSWORD: z.string().default(''),
  EMAIL_FROM_NAME: z.string().trim().default('KentBildir'),
  EMAIL_FROM_ADDRESS: z.string().trim().default(''),
  TEST_REPORT_RECIPIENT_EMAIL: z.string().trim().default(''),
});
export type Config = z.infer<typeof schema> & { corsOrigins: string[] };
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const value = schema.parse(env);
  const email = z.email();
  if ((value.EMAIL_FROM_ADDRESS && !email.safeParse(value.EMAIL_FROM_ADDRESS).success) || (value.TEST_REPORT_RECIPIENT_EMAIL && !email.safeParse(value.TEST_REPORT_RECIPIENT_EMAIL).success)) {
    throw new Error('E-posta gönderen veya test alıcı adresi geçersiz.');
  }
  if (value.EMAIL_ENABLED) {
    const required = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'EMAIL_FROM_ADDRESS', 'TEST_REPORT_RECIPIENT_EMAIL'] as const;
    const missing = required.filter(key => !value[key]);
    if (missing.length) throw new Error(`E-posta yapılandırması eksik: ${missing.join(', ')}`);
  }
  return { ...value, corsOrigins: value.CORS_ORIGINS.split(',').map(x => x.trim()).filter(Boolean) };
}
