// Runs with Node's built-in test runner: node --test dev/dev-inbox.test.mjs
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import nodemailer from 'nodemailer';
import { startDevInbox } from './dev-inbox.mjs';

let inbox;
let base;

before(async () => {
  inbox = await startDevInbox({ smtpPort: 0, uiPort: 0 });
  base = `http://127.0.0.1:${inbox.uiPort}`;
});

after(async () => {
  await inbox.close();
});

test('receives an email over SMTP and lists it', async () => {
  const transport = nodemailer.createTransport({ host: '127.0.0.1', port: inbox.smtpPort, secure: false });
  await transport.sendMail({
    from: 'Catalogue <no-reply@catalogue.local>',
    to: 'sales@catalogue.local',
    replyTo: 'jane@example.com',
    subject: 'New enquiry: Mens Cotton Jacket',
    text: 'Is this available in blue?',
    html: '<p>Is this available in blue?</p><script>alert(1)</script>',
  });

  const messages = await (await fetch(`${base}/api/messages`)).json();
  assert.equal(messages.length, 1);
  assert.equal(messages[0].subject, 'New enquiry: Mens Cotton Jacket');
  assert.equal(messages[0].to, 'sales@catalogue.local');
  assert.equal(messages[0].replyTo, 'jane@example.com');
  assert.match(messages[0].text, /available in blue/);

  // The HTML body is served with a CSP that blocks scripts, for display in a sandboxed iframe.
  const html = await fetch(`${base}/messages/${messages[0].id}/html`);
  assert.equal(html.status, 200);
  assert.match(html.headers.get('content-security-policy') ?? '', /default-src 'none'/);
});

test('serves the inbox page and can be cleared', async () => {
  const page = await fetch(base);
  assert.match(await page.text(), /Sales inbox/);

  await fetch(`${base}/api/messages`, { method: 'DELETE' });
  assert.deepEqual(await (await fetch(`${base}/api/messages`)).json(), []);
});
