import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

const base = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'a'.repeat(40) };
describe('config', () => {
  it('boş dev tokenı undefined yapar', () => expect(loadConfig({ ...base, DEV_READ_ACCESS_TOKEN: '' }).DEV_READ_ACCESS_TOKEN).toBeUndefined());
  it('token olmadan parse eder', () => expect(loadConfig(base).DEV_READ_ACCESS_TOKEN).toBeUndefined());
  it('kısa tokenı reddeder', () => expect(() => loadConfig({ ...base, DEV_READ_ACCESS_TOKEN: 'short' })).toThrow());
  it('32+ karakter development tokenını kabul eder', () => expect(loadConfig({ ...base, NODE_ENV: 'development', DEV_READ_ACCESS_TOKEN: 't'.repeat(32) }).DEV_READ_ACCESS_TOKEN).toHaveLength(32));
  it('production ortamında dev tokenı reddeder', () => expect(() => loadConfig({ ...base, NODE_ENV: 'production', DEV_READ_ACCESS_TOKEN: 't'.repeat(32) })).toThrow());
});
