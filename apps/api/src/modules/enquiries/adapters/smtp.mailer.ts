import { createTransport, type Transporter } from 'nodemailer';
import { type EmailMessage, Mailer } from '../ports/mailer.port';

export interface SmtpOptions {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
  from: string;
}

/** Sends through any SMTP server: Mailpit locally, a real provider (e.g. SES SMTP) in production. */
export class SmtpMailer extends Mailer {
  private readonly transporter: Transporter;

  constructor(private readonly options: SmtpOptions) {
    super();
    this.transporter = createTransport({
      host: options.host,
      port: options.port,
      secure: options.secure,
      auth: options.user ? { user: options.user, pass: options.password } : undefined,
      // Don't let a slow mail server hang the customer's request.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }

  override async send(message: EmailMessage): Promise<void> {
    await this.transporter.sendMail({ from: this.options.from, ...message });
  }
}
