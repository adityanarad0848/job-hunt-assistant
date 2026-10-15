#!/usr/bin/env node
// Builds the autofill bookmarklet + console snippet from your vault + filler.js.
//
//   node autofill/build-bookmarklet.js
//
// Produces autofill/install.html — open it, drag the button to your bookmarks bar.
// Then: open any application form YOU navigated to, click the bookmark, review, submit.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const vault = JSON.parse(fs.readFileSync(path.join(root, 'profile', 'answers-vault.json'), 'utf8'));
const filler = fs.readFileSync(path.join(__dirname, 'filler.js'), 'utf8');
let matcher = fs.readFileSync(path.join(__dirname, 'matcher.js'), 'utf8');

// matcher.js is a CommonJS module (for the Node tests). For the browser, wrap it
// as an IIFE whose module.exports becomes window.__JHA_MATCHER__ — same code,
// so the unit tests cover exactly what runs in the browser.
const matcherBrowser =
  'window.__JHA_MATCHER__=(function(){var module={exports:{}};\n' +
  matcher +
  '\nreturn module.exports;})();';

// The payload: inject the vault + tested matcher, then run the filler IIFE.
const payload =
  'window.__JHA_VAULT__=' + JSON.stringify(vault) + ';\n' +
  matcherBrowser + '\n' +
  filler;

// Bookmarklet: base64-encode the ENTIRE payload. Base64 uses only [A-Za-z0-9+/=],
// so it contains no quotes, apostrophes, ampersands, spaces, or newlines — safe to
// drop straight into an href with zero escaping headaches. At click time we decode
// (atob + decode UTF-8) and eval it.
const b64 = Buffer.from(payload, 'utf8').toString('base64');
const bookmarkletSafe =
  'javascript:(function(){' +
  'var s=decodeURIComponent(escape(atob("' + b64 + '")));' +
  '(0,eval)(s);' +
  '})();';

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Install Autofill</title>
<style>
 body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:760px;margin:0 auto;padding:24px;color:#1f2328;background:#f6f8fa}
 h1{font-size:20px} h2{font-size:15px;margin-top:28px}
 .btn{display:inline-block;background:#1f883d;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700;font-size:15px}
 .warn{background:#fff8c5;border:1px solid #d4a72c;border-radius:8px;padding:12px 16px;font-size:13.5px;margin:16px 0}
 ol{line-height:1.7} code{background:#eaeef2;padding:2px 6px;border-radius:4px}
 textarea{width:100%;height:120px;font-family:ui-monospace,monospace;font-size:11px;border:1px solid #d0d7de;border-radius:6px;padding:8px;box-sizing:border-box}
</style></head><body>
<h1>Job Autofill — install</h1>
<div class="warn"><b>This runs in YOUR browser, only when you click it.</b> It does not log in, navigate, or submit.
It fills the visible empty fields of a form you already opened, highlights them green, then stops so you
<b>review and submit yourself</b>. Always re-check work authorization, salary, dropdowns, and attestations.</div>

<h2>Option 1 — Bookmarklet (recommended)</h2>
<ol>
 <li>Show your browser's bookmarks bar (<code>Ctrl/Cmd+Shift+B</code>).</li>
 <li>Drag this button onto the bookmarks bar:</li>
</ol>
<p><a class="btn" href="${esc(bookmarketHref())}">⚡ Fill this job form</a></p>
<ol start="3">
 <li>Open the Workday / company application page yourself and sign in as normal.</li>
 <li>Click the <b>⚡ Fill this job form</b> bookmark. Fields populate and turn green.</li>
 <li>Review the whole form, fix anything flagged, then click the site's Submit.</li>
</ol>

<h2>Option 2 — DevTools console</h2>
<p>Open the application page, press <code>F12</code> → Console, paste this, press Enter:</p>
<textarea readonly onclick="this.select()">${esc(payload)}</textarea>

<h2>When you change your answers</h2>
<p>Edit <code>profile/answers-vault.json</code>, re-run <code>node autofill/build-bookmarklet.js</code>,
and re-drag the button (the vault is baked into the bookmark).</p>
</body></html>`;

// The encoded payload contains no raw quotes/ampersands, so the href is safe as-is.
function bookmarketHref() {
  return bookmarkletSafe;
}

const out = path.join(__dirname, 'install.html');
fs.writeFileSync(out, html, 'utf8');
console.log('✓ Built autofill bookmarklet.');
console.log('  Open: ' + out);
console.log('  Then drag the "⚡ Fill this job form" button to your bookmarks bar.');
console.log('  Fields filled by the vault:', countFillable(vault));

function countFillable(v) {
  let n = 0;
  for (const sec of Object.keys(v)) {
    if (sec[0] === '_' || typeof v[sec] !== 'object') continue;
    for (const k of Object.keys(v[sec])) {
      if (k[0] === '_') continue;
      const val = v[sec][k];
      if (typeof val === 'string' && val.indexOf('<FILL') < 0 && val.indexOf('<optional') < 0) n++;
    }
  }
  return n;
}
