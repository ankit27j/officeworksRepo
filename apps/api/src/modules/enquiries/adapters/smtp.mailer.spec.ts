import type { AddressInfo } from 'node:net';
import { SMTPServer } from 'smtp-server';
import { SmtpMailer } from './smtp.mailer';

interface ReceivedMail {
  from: string;
  to: string[];
  raw: string;
}

/** Real SMTP round trip against an in-process server, the same path as sending to Mailpit. */
describe('SmtpMailer', () => {
  const received: ReceivedMail[] = [];
  let server: SMTPServer;
  let port: number;

  beforeAll(async () => {
    server = new SMTPServer({
      authOptional: true,
      disabledCommands: ['STARTTLS'],
      logger: false,
      onData(stream, session, callback) {
        let raw = '';
        stream.on('data', (chunk: Buffer) => (raw += chunk.toString('utf8')));
        stream.on('end', () => {
          received.push({
            from: session.envelope.mailFrom ? session.envelope.mailFrom.address : '',
            to: session.envelope.rcptTo.map((r) => r.address),
            raw,
          });
          callback();
        });
      },
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = (server.server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('delivers the message with from, to, reply-to and both bodies', async () => {
    const mailer = new SmtpMailer({
      host: '127.0.0.1',
      port,
      secure: false,
      from: 'Catalogue <no-reply@catalogue.local>',
    });

    await mailer.send({
      to: 'sales@catalogue.local',
      replyTo: 'jane@example.com',
      subject: 'New enquiry: Mens Cotton Jacket',
      text: 'Plain body',
      html: '<p>HTML body</p>',
    });

    expect(received).toHaveLength(1);
    const [mail] = received;
    expect(mail?.from).toBe('no-reply@catalogue.local');
    expect(mail?.to).toEqual(['sales@catalogue.local']);
    expect(mail?.raw).toMatch(/^Reply-To: jane@example\.com/m);
    expect(mail?.raw).toMatch(/^Subject: New enquiry: Mens Cotton Jacket/m);
    expect(mail?.raw).toContain('Plain body');
    expect(mail?.raw).toContain('<p>HTML body</p>');
  });

  it('rejects when the SMTP server is unreachable', async () => {
    const mailer = new SmtpMailer({ host: '127.0.0.1', port: 1, secure: false, from: 'x@y.z' });
    await expect(
      mailer.send({ to: 'sales@catalogue.local', subject: 's', text: 't', html: 'h' }),
    ).rejects.toThrow();
  });
});
