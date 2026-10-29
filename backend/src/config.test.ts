import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

const base = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'a'.repeat(40) };
describe('config', () => {
  it('Gemini anahtarı olmadan başlar ve model varsayılanını kullanır', () => {
    const config = loadConfig({ ...base, GEMINI_API_KEY: '   ', GEMINI_VISION_MODEL: '' });
    expect(config.GEMINI_API_KEY).toBeUndefined();
    expect(config.GEMINI_VISION_MODEL).toBe('gemini-3.5-flash-lite');
  });
  it('email varsayılan olarak kapalıdır', () => expect(loadConfig(base).EMAIL_ENABLED).toBe(false));
  it('email açıkken eksik SMTP configini reddeder', () => expect(() => loadConfig({ ...base, EMAIL_ENABLED: 'true' })).toThrow(/SMTP_USER/));
  it('email açıkken geçersiz adresi reddeder', () => expect(() => loadConfig({ ...base, EMAIL_ENABLED: 'true', SMTP_USER: 'user', SMTP_PASSWORD: 'secret', EMAIL_FROM_ADDRESS: 'invalid', TEST_REPORT_RECIPIENT_EMAIL: 'test@example.com' })).toThrow(/geçersiz/));
  it('email açıkken geçerli configi kabul eder', () => expect(loadConfig({ ...base, EMAIL_ENABLED: 'true', SMTP_USER: 'user', SMTP_PASSWORD: 'secret', EMAIL_FROM_ADDRESS: 'sender@example.com', TEST_REPORT_RECIPIENT_EMAIL: 'test@example.com' }).EMAIL_ENABLED).toBe(true));
  it('Resend seçiliyken SMTP secretları yerine Resend anahtarını zorunlu tutar', () => {
    expect(() => loadConfig({ ...base, EMAIL_ENABLED: 'true', EMAIL_PROVIDER: 'resend', EMAIL_FROM_ADDRESS: 'sender@example.com', TEST_REPORT_RECIPIENT_EMAIL: 'test@example.com' })).toThrow(/RESEND_API_KEY/);
    const config = loadConfig({ ...base, EMAIL_ENABLED: 'true', EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 're_test_only_key', EMAIL_FROM_ADDRESS: 'sender@example.com', TEST_REPORT_RECIPIENT_EMAIL: 'test@example.com' });
    expect(config.EMAIL_PROVIDER).toBe('resend');
  });
});
