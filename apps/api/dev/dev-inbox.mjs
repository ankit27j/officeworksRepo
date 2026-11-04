// Local "sales inbox" for running without Docker: an SMTP server plus a web page listing what it received.
// Stands in for Mailpit (same ports: SMTP 1025, inbox http://localhost:8025). Development only: it binds to
// 127.0.0.1, keeps messages in memory, and is never part of the API build or image.
//   npm run dev:inbox
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { simpleParser } from 'mailparser';
import { SMTPServer } from 'smtp-server';

const HOST = '127.0.0.1';
const MAX_MESSAGES = 200;
const MAX_MESSAGE_BYTES = 1024 * 1024;

/**
 * @typedef {{ id: string, receivedAt: string, from: string, to: string, replyTo: string,
 *             subject: string, text: string, html: string | null }} InboxMessage
 */

/**
 * Starts the SMTP listener and the inbox page. Port 0 picks a free port (used by tests).
 * @param {{ smtpPort?: number, uiPort?: number }} [options]
 */
export async function startDevInbox({ smtpPort = 1025, uiPort = 8025 } = {}) {
  /** @type {InboxMessage[]} newest first */
  const messages = [];

  const smtp = new SMTPServer({
    authOptional: true,
    // No certificate locally; nodemailer then sends in plain text, like it does to Mailpit.
    disabledCommands: ['STARTTLS'],
    size: MAX_MESSAGE_BYTES,
    logger: false,
    banner: 'Catalogue dev inbox',
    onData(stream, _session, callback) {
      simpleParser(stream)
        .then((mail) => {
          if (stream.sizeExceeded) return callback(new Error('Message too large'));
          messages.unshift({
            id: randomUUID(),
            receivedAt: new Date().toISOString(),
            from: mail.from?.text ?? '',
            to: addressText(mail.to),
            replyTo: mail.replyTo?.text ?? '',
            subject: mail.subject ?? '(no subject)',
            text: mail.text ?? '',
            html: typeof mail.html === 'string' ? mail.html : null,
          });
          messages.length = Math.min(messages.length, MAX_MESSAGES);
          callback();
        })
        .catch(callback);
    },
  });

  const http = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/') return send(res, 200, 'text/html', INBOX_PAGE);
    if (req.method === 'GET' && url.pathname === '/api/messages') return sendJson(res, messages);
    if (req.method === 'DELETE' && url.pathname === '/api/messages') {
      messages.length = 0;
      return sendJson(res, []);
    }
    const match = /^\/messages\/([\w-]+)\/html$/.exec(url.pathname);
    if (req.method === 'GET' && match) {
      const message = messages.find((m) => m.id === match[1]);
      if (!message?.html) return send(res, 404, 'text/plain', 'Not found');
      // Email HTML is untrusted: no scripts, no network, shown only inside a sandboxed iframe.
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'none'; style-src 'unsafe-inline'; img-src data:",
      );
      return send(res, 200, 'text/html', message.html);
    }
    send(res, 404, 'text/plain', 'Not found');
  });

  await listen(smtp, smtpPort);
  await listen(http, uiPort);

  return {
    messages,
    smtpPort: /** @type {import('node:net').AddressInfo} */ (smtp.server.address()).port,
    uiPort: /** @type {import('node:net').AddressInfo} */ (http.address()).port,
    async close() {
      await Promise.all([new Promise((r) => smtp.close(r)), new Promise((r) => http.close(r))]);
    },
  };
}

/** @param {import('mailparser').AddressObject | import('mailparser').AddressObject[] | undefined} to */
function addressText(to) {
  if (!to) return '';
  return (Array.isArray(to) ? to : [to]).map((a) => a.text).join(', ');
}

/** @param {{ listen: Function, once?: Function, server?: { once: Function } }} server @param {number} port */
function listen(server, port) {
  return new Promise((resolve, reject) => {
    const emitter = 'server' in server && server.server ? server.server : server;
    emitter.once('error', reject);
    server.listen(port, HOST, () => resolve(undefined));
  });
}

/** @param {import('node:http').ServerResponse} res */
function send(res, status, type, body) {
  res.writeHead(status, { 'Content-Type': `${type}; charset=utf-8`, 'X-Content-Type-Options': 'nosniff' });
  res.end(body);
}

/** @param {import('node:http').ServerResponse} res */
function sendJson(res, body) {
  send(res, 200, 'application/json', JSON.stringify(body));
}

const INBOX_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sales inbox (dev)</title>
<style>
  :root { color-scheme: light dark; --bg: #f5f5f5; --panel: #fff; --text: #1f1f1f; --muted: #666; --line: #e3e3e3; --accent: #1668dc; }
  @media (prefers-color-scheme: dark) { :root { --bg: #141414; --panel: #1f1f1f; --text: #eee; --muted: #aaa; --line: #333; --accent: #4096ff; } }
  * { box-sizing: border-box; }
  body { margin: 0; font: 14px/1.5 system-ui, sans-serif; background: var(--bg); color: var(--text); }
  header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; background: var(--panel); border-bottom: 1px solid var(--line); }
  h1 { font-size: 16px; margin: 0; }
  header small { color: var(--muted); }
  button { font: inherit; padding: 4px 12px; border: 1px solid var(--line); border-radius: 6px; background: var(--panel); color: var(--text); cursor: pointer; }
  main { display: grid; grid-template-columns: minmax(240px, 1fr) 2fr; height: calc(100vh - 57px); }
  @media (max-width: 720px) { main { grid-template-columns: 1fr; height: auto; } }
  ul { list-style: none; margin: 0; padding: 0; overflow-y: auto; border-right: 1px solid var(--line); background: var(--panel); }
  li button { display: block; width: 100%; text-align: left; border: 0; border-bottom: 1px solid var(--line); border-radius: 0; padding: 10px 16px; }
  li button[aria-current="true"] { box-shadow: inset 3px 0 var(--accent); }
  .subject { font-weight: 600; }
  .meta { color: var(--muted); font-size: 12px; }
  section { overflow-y: auto; padding: 16px; }
  dl { display: grid; grid-template-columns: max-content 1fr; gap: 2px 12px; margin: 0 0 12px; }
  dt { color: var(--muted); }
  dd { margin: 0; word-break: break-word; }
  iframe { width: 100%; min-height: 420px; border: 1px solid var(--line); border-radius: 6px; background: #fff; }
  pre { white-space: pre-wrap; }
  .empty { color: var(--muted); padding: 24px 16px; }
</style>
</head>
<body>
<header>
  <div><h1>Sales inbox</h1><small>Local dev inbox · enquiry emails sent by the API appear here</small></div>
  <button id="clear" type="button">Clear</button>
</header>
<main>
  <ul id="list" aria-label="Messages"></ul>
  <section id="detail"><p class="empty">No messages yet. Send an enquiry from the app.</p></section>
</main>
<script>
  const list = document.getElementById('list');
  const detail = document.getElementById('detail');
  let messages = [];
  let selectedId = null;

  function el(tag, props = {}, children = []) {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...children);
    return node;
  }

  function renderList() {
    list.replaceChildren(
      ...(messages.length
        ? messages.map((m) =>
            el('li', {}, [
              el('button', { type: 'button', onclick: () => select(m.id) }, [
                el('div', { className: 'subject', textContent: m.subject }),
                el('div', { className: 'meta', textContent: m.from + ' · ' + new Date(m.receivedAt).toLocaleTimeString() }),
              ]),
            ]),
          )
        : [el('li', { className: 'empty', textContent: 'Inbox is empty' })]),
    );
    [...list.querySelectorAll('li button')].forEach((b, i) => b.setAttribute('aria-current', String(messages[i].id === selectedId)));
  }

  function select(id) {
    selectedId = id;
    const m = messages.find((x) => x.id === id);
    renderList();
    if (!m) return;
    const rows = [['From', m.from], ['To', m.to], ['Reply-To', m.replyTo], ['Subject', m.subject], ['Received', new Date(m.receivedAt).toLocaleString()]];
    const body = m.html
      ? el('iframe', { title: 'Email body', sandbox: '', src: '/messages/' + m.id + '/html' })
      : el('pre', { textContent: m.text });
    detail.replaceChildren(el('dl', {}, rows.flatMap(([k, v]) => [el('dt', { textContent: k }), el('dd', { textContent: v })])), body);
  }

  async function refresh() {
    try {
      const next = await (await fetch('/api/messages')).json();
      const changed = next.length !== messages.length || next[0]?.id !== messages[0]?.id;
      messages = next;
      if (changed) {
        renderList();
        if (!selectedId && messages[0]) select(messages[0].id);
      }
    } catch {}
  }

  document.getElementById('clear').onclick = async () => {
    await fetch('/api/messages', { method: 'DELETE' });
    messages = [];
    selectedId = null;
    renderList();
    detail.replaceChildren(el('p', { className: 'empty', textContent: 'No messages yet. Send an enquiry from the app.' }));
  };

  renderList();
  refresh();
  setInterval(refresh, 2000);
</script>
</body>
</html>`;

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  // Same .env as the API (run from apps/api or the repo root), so SMTP_PORT matches on both sides.
  for (const file of ['.env', '../../.env']) {
    try {
      process.loadEnvFile(file);
      break;
    } catch {
      // no .env here; defaults apply
    }
  }
  const smtpPort = Number(process.env.SMTP_PORT ?? 1025);
  const uiPort = Number(process.env.INBOX_UI_PORT ?? 8025);
  startDevInbox({ smtpPort, uiPort }).then(
    () => console.log(`Dev inbox: http://localhost:${uiPort} (SMTP on ${HOST}:${smtpPort})`),
    (error) => {
      if (error?.code === 'EADDRINUSE') {
        console.error(`Dev inbox: port ${error.port} is in use. If Mailpit is running, use it instead.`);
      } else {
        console.error(error);
      }
      process.exit(1);
    },
  );
}
