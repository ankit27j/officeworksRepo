import { Logger } from '@nestjs/common';
import { type EmailMessage, Mailer } from '../ports/mailer.port';

/** Dev fallback (MAILER=log) when no SMTP server is running. Logs only the envelope, not the body. */
export class LogMailer extends Mailer {
  private readonly logger = new Logger(LogMailer.name);

  override async send(message: EmailMessage): Promise<void> {
    this.logger.log(`Email to ${message.to}: "${message.subject}" (MAILER=log, not actually sent)`);
  }
}
