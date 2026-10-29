import { describe, expect, it, vi } from 'vitest';

import { loadConfig } from '../config.js';
import type { ReportEmail } from './emailProvider.js';
import { createResendEmailProvider } from './resendEmailProvider.js';

const config = loadConfig({
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'a'.repeat(40),
  NODE_ENV: 'test',
  EMAIL_ENABLED: 'true',
  EMAIL_PROVIDER: 'resend',
  RESEND_API_KEY: 're_test_only_key',
  EMAIL_FROM_NAME: 'KentBildir',
  EMAIL_FROM_ADDRESS: 'verified-sender@example.com',
  TEST_REPORT_RECIPIENT_EMAIL: 'controlled-test@example.com',
});

const email: ReportEmail = {
  subject: '[KentBildir Test] Yeni Bildirim – Diğer – Test İlçesi',
  text: 'Türkçe düz metin',
  html: '<p>Türkçe HTML</p>',
  attachment: { filename: 'photo.png', content: Buffer.from('private-photo'), contentType: 'image/png' },
};

describe('Resend email provider', () => {
  it('uses HTTPS API, the configured sender/test recipient and a base64 attachment', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'resend-message-12345678' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const receipt = await createResendEmailProvider(config, fetchMock).sendReportEmail(email);

    expect(receipt).toEqual({ provider: 'resend', messageId: 'resend-message-12345678' });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual(expect.objectContaining({ Authorization: 'Bearer re_test_only_key', 'Content-Type': 'application/json' }));
    const body = JSON.parse(String(init.body));
    expect(body).toEqual(expect.objectContaining({
      from: 'KentBildir Bildirim Sistemi <verified-sender@example.com>',
      to: ['controlled-test@example.com'],
      subject: email.subject,
      text: email.text,
      html: email.html,
      attachments: [{ filename: 'photo.png', content: email.attachment.content.toString('base64'), content_type: 'image/png' }],
    }));
    expect(JSON.stringify(body)).not.toContain('municipality');
  });

  it('maps HTTP failures to a safe code without reading or logging the response body', async () => {
    const json = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 422, json } as unknown as Response);
    await expect(createResendEmailProvider(config, fetchMock).sendReportEmail(email)).rejects.toMatchObject({ code: 'RESEND_HTTP_422', responseCode: 422 });
    expect(json).not.toHaveBeenCalled();
  });

  it('maps network failures without leaking the raw provider error', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('raw network secret'));
    await expect(createResendEmailProvider(config, fetchMock).sendReportEmail(email)).rejects.toMatchObject({ code: 'RESEND_NETWORK_ERROR' });
  });
});
