export interface EmailMessage {
  to: string;
  replyTo?: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Port for sending email. SMTP covers Mailpit locally and most providers (including AWS SES's
 * SMTP interface). An API-based provider would be another adapter.
 */
export abstract class Mailer {
  abstract send(message: EmailMessage): Promise<void>;
}
