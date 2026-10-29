import nodemailer from 'nodemailer';
import type { Config } from '../config.js';
import type { EmailProvider, ReportEmail } from './emailProvider.js';

export function createSmtpEmailProvider(config: Config): EmailProvider {
  const transport = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_SECURE,
    requireTLS: !config.SMTP_SECURE,
    auth: { user: config.SMTP_USER, pass: config.SMTP_PASSWORD },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return {
    async sendReportEmail(email: ReportEmail) {
      await transport.sendMail({
        from: { name: `${config.EMAIL_FROM_NAME || 'KentBildir'} Bildirim Sistemi`, address: config.EMAIL_FROM_ADDRESS },
        to: config.TEST_REPORT_RECIPIENT_EMAIL,
        envelope: { from: config.EMAIL_FROM_ADDRESS, to: config.TEST_REPORT_RECIPIENT_EMAIL },
        subject: email.subject,
        text: email.text,
        html: email.html,
        attachments: [email.attachment],
      });
    },
  };
}
