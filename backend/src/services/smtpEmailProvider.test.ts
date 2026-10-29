import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loadConfig } from '../config.js';
import type { ReportEmail } from './emailProvider.js';
import { createSmtpEmailProvider } from './smtpEmailProvider.js';

const mocks = vi.hoisted(() => ({
  createTransport: vi.fn(),
  sendMail: vi.fn(),
}));

vi.mock('nodemailer', () => ({
  default: { createTransport: mocks.createTransport },
}));

const config = loadConfig({
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'a'.repeat(40),
  NODE_ENV: 'test',
  EMAIL_ENABLED: 'true',
  SMTP_HOST: 'smtp.example.com',
  SMTP_PORT: '465',
  SMTP_SECURE: 'true',
  SMTP_USER: 'kentbildir-smtp',
  SMTP_PASSWORD: 'test-only-password',
  EMAIL_FROM_NAME: 'KentBildir',
  EMAIL_FROM_ADDRESS: 'verified-sender@example.com',
  TEST_REPORT_RECIPIENT_EMAIL: 'controlled-test@example.com',
});

const email: ReportEmail = {
  subject: '[KentBildir] Test bildirimi',
  text: 'Metin',
  html: '<p>Metin</p>',
  attachment: { filename: 'photo.png', content: Buffer.from('image'), contentType: 'image/png' },
};

describe('SMTP email provider', () => {
  beforeEach(() => {
    mocks.createTransport.mockReset();
    mocks.sendMail.mockReset().mockResolvedValue(undefined);
    mocks.createTransport.mockReturnValue({ sendMail: mocks.sendMail });
  });

  it('uses only the configured verified sender and controlled test recipient', async () => {
    const provider = createSmtpEmailProvider(config);
    await provider.sendReportEmail(email);

    expect(mocks.sendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: { name: 'KentBildir Bildirim Sistemi', address: 'verified-sender@example.com' },
      to: 'controlled-test@example.com',
      envelope: { from: 'verified-sender@example.com', to: 'controlled-test@example.com' },
    }));
    expect(JSON.stringify(mocks.sendMail.mock.calls)).not.toContain('attacker');
  });
});
