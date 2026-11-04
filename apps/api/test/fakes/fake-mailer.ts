import { type EmailMessage, Mailer } from '../../src/modules/enquiries/ports/mailer.port';

/** Records sent messages; set `failWith` to simulate the email provider being down. */
export class FakeMailer extends Mailer {
  readonly sent: EmailMessage[] = [];
  failWith: Error | null = null;

  override async send(message: EmailMessage): Promise<void> {
    if (this.failWith) throw this.failWith;
    this.sent.push(message);
  }

  reset(): void {
    this.sent.length = 0;
    this.failWith = null;
  }
}
