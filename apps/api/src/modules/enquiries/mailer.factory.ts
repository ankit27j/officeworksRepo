import type { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.schema';
import { LogMailer } from './adapters/log.mailer';
import { SmtpMailer } from './adapters/smtp.mailer';
import type { Mailer } from './ports/mailer.port';

/** The one place that picks an email provider. A new provider means a new case here plus an adapter. */
export function createMailer(config: ConfigService<Env, true>): Mailer {
  const mailer = config.get('MAILER', { infer: true });
  switch (mailer) {
    case 'smtp':
      return new SmtpMailer({
        host: config.get('SMTP_HOST', { infer: true }),
        port: config.get('SMTP_PORT', { infer: true }),
        secure: config.get('SMTP_SECURE', { infer: true }),
        user: config.get('SMTP_USER', { infer: true }),
        password: config.get('SMTP_PASSWORD', { infer: true }),
        from: config.get('MAIL_FROM', { infer: true }),
      });
    case 'log':
      return new LogMailer();
    default: {
      const unsupported: never = mailer;
      throw new Error(`Unsupported MAILER: ${String(unsupported)}`);
    }
  }
}
