export interface ReportEmail {
  subject: string;
  text: string;
  html: string;
  attachment: { filename: string; content: Buffer; contentType: string };
}

export interface EmailDeliveryReceipt {
  provider: 'smtp' | 'resend';
  messageId?: string;
}

export interface EmailProvider {
  sendReportEmail(email: ReportEmail): Promise<EmailDeliveryReceipt | void>;
}
