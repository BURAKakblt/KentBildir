import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  SUPABASE_URL: z.url(), SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  CORS_ORIGINS: z.string().default(''), NODE_ENV: z.enum(['development','test','production']).default('development'),
  DEV_READ_ACCESS_TOKEN: z.preprocess(
    value => typeof value === 'string' ? (value.trim() || undefined) : value,
    z.string().min(32).optional(),
  ),
  GEMINI_API_KEY: z.preprocess(value => typeof value === 'string' ? (value.trim() || undefined) : value, z.string().min(10).optional()),
  GEMINI_VISION_MODEL: z.preprocess(value => typeof value === 'string' ? (value.trim() || undefined) : value, z.string().min(1).default('gemini-3.5-flash-lite')),
});
export type Config = z.infer<typeof schema> & { corsOrigins: string[] };
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const value = schema.parse(env);
  if (value.NODE_ENV === 'production' && value.DEV_READ_ACCESS_TOKEN) throw new Error('DEV_READ_ACCESS_TOKEN production ortamında kullanılamaz.');
  return { ...value, corsOrigins: value.CORS_ORIGINS.split(',').map(x => x.trim()).filter(Boolean) };
}
