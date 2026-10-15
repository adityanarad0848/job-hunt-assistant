#!/usr/bin/env node
// Optional email notifier. Sends a short summary of NEW matches after a run.
// Zero dependencies — speaks SMTP over TLS using Node's built-in tls module.
// Off unless ENABLE_NOTIFY=1 and the SMTP_* / NOTIFY_* env vars are set.
//
// Gmail example (.env):
//   ENABLE_NOTIFY=1
//   SMTP_HOST=smtp.gmail.com
//   SMTP_PORT=465
//   SMTP_USER=you@gmail.com
//   SMTP_PASS=your-16-char-app-password   # NOT your login password — use an App Password
//   NOTIFY_TO=you@gmail.com
const fs = require('fs');
const path = require('path');
const tls = require('tls');
const { load } = require('../core/tracker');

function newJobsSummary(dir) {
  const resultsPath = path.join(dir, 'results.json');
  if (!fs.existsSync(resultsPath)) return { count: 0, lines: [] };
  const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
  const fresh = results.filter((j) => j.isNew);
  const lines = fresh.slice(0, 15).map(
    (j) => `  ${String(j.score).padStart(3)}  ${j.title} — ${j.company} (${j.location || 'N/A'})\n       ${j.url}`
  );
  return { count: fresh.length, lines };
}

// Minimal SMTP-over-TLS send. Enough for Gmail/Outlook with an app password.
function smtpSend({ host, port, user, pass, from, to, subject, body }) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host, port: Number(port), servername: host }, () => {});
    socket.setEncoding('utf8');
    let step = 0;
    const b64 = (s) => Buffer.from(s).toString('base64');
    const cmds = [
      `EHLO localhost`,
      `AUTH LOGIN`,
      b64(user),
      b64(pass),
      `MAIL FROM:<${from}>`,
      `RCPT TO:<${to}>`,
      `DATA`,
      `From: Job Hunt Assistant <${from}>\r\nTo: ${to}\r\nSubject: ${subject}\r\n\r\n${body}\r\n.`,
      `QUIT`,
    ];
    let buf = '';
    socket.on('data', (chunk) => {
      buf += chunk;
      if (!/\r\n$/.test(buf)) return;
      const code = parseInt(buf.slice(0, 3), 10);
      if (code >= 400) { socket.destroy(); return reject(new Error(`SMTP ${buf.trim()}`)); }
      buf = '';
      if (step < cmds.length) socket.write(cmds[step++] + '\r\n');
      else resolve();
    });
    socket.on('error', reject);
    socket.setTimeout(20000, () => { socket.destroy(); reject(new Error('SMTP timeout')); });
  });
}

async function main() {
  if (process.env.ENABLE_NOTIFY !== '1') {
    console.log('[notify] disabled (set ENABLE_NOTIFY=1 to enable).');
    return;
  }
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, NOTIFY_TO } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !NOTIFY_TO) {
    console.warn('[notify] missing SMTP_* / NOTIFY_TO env vars; skipping.');
    return;
  }

  const dir = path.join(__dirname, '..');
  const { count, lines } = newJobsSummary(dir);
  if (count === 0) { console.log('[notify] no new jobs; no email sent.'); return; }

  const subject = `${count} new job match${count === 1 ? '' : 'es'} today`;
  const body =
    `${count} new match${count === 1 ? '' : 'es'} since your last run:\n\n` +
    lines.join('\n') +
    `\n\nOpen report.html for the full ranked list.\n` +
    `(Reminder: you review and submit each application yourself.)`;

  try {
    await smtpSend({
      host: SMTP_HOST, port: SMTP_PORT, user: SMTP_USER, pass: SMTP_PASS,
      from: SMTP_USER, to: NOTIFY_TO, subject, body,
    });
    console.log(`[notify] emailed ${NOTIFY_TO}: ${subject}`);
  } catch (e) {
    console.warn(`[notify] email failed: ${e.message}`);
  }
}

main();
