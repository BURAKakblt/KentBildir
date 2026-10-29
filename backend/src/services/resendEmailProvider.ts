import type { Config } from '../config.js';
import type { EmailProvider, ReportEmail } from './emailProvider.js';

const RESEND_EMAILS_URL = 'https://api.resend.com/emails';

function resendError(status: number) {
  return Object.assign(new Error('Resend request failed'), {
    code: `RESEND_HTTP_${status}`,
    responseCode: status,
  });
}

export function createResendEmailProvider(config: Config, fetchImpl: typeof fetch = fetch): EmailProvider {
  return {
    async sendReportEmail(email: ReportEmail) {
      let response: Response;
      try {
        response = await fetchImpl(RESEND_EMAILS_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `${config.EMAIL_FROM_NAME || 'KentBildir'} Bildirim Sistemi <${config.EMAIL_FROM_ADDRESS}>`,
            to: [config.TEST_REPORT_RECIPIENT_EMAIL],
            subject: email.subject,
            text: email.text,
            html: email.html,
            attachments: [{
              filename: email.attachment.filename,
              content: email.attachment.content.toString('base64'),
              content_type: email.attachment.contentType,
            }],
          }),
          signal: AbortSignal.timeout(20_000),
        });
      } catch {
        throw Object.assign(new Error('Resend network request failed'), { code: 'RESEND_NETWORK_ERROR' });
      }
      if (!response.ok) throw resendError(response.status);
      const value = await response.json() as { id?: unknown };
      if (typeof value.id !== 'string' || value.id.length < 8 || value.id.length > 200) {
        throw Object.assign(new Error('Resend response invalid'), { code: 'RESEND_RESPONSE_INVALID' });
      }
      return { provider: 'resend', messageId: value.id } as const;
    },
  };
}
