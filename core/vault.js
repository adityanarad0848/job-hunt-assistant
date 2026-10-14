// Answers Vault generator.
// Produces a per-job "fill sheet": your standard answers with <COMPANY>/<ROLE>
// substituted, so you copy-paste into the Workday/company form instead of retyping.
// NOTHING here is auto-submitted. You paste and you click submit.
const fs = require('fs');
const path = require('path');

function substitute(text, job) {
  return String(text)
    .replace(/<COMPANY>/g, job.company)
    .replace(/<ROLE>/g, job.title);
}

// Flatten the vault into labeled rows, skipping comment/note keys.
function toRows(vault, job) {
  const rows = [];
  const skip = (k) => k.startsWith('_');
  for (const [section, fields] of Object.entries(vault)) {
    if (skip(section) || typeof fields !== 'object') continue;
    for (const [key, val] of Object.entries(fields)) {
      if (skip(key) || typeof val !== 'string') continue;
      rows.push({
        section,
        label: key,
        value: substitute(val, job),
        needsReview:
          section === 'workAuthorization' ||
          section === 'demographics' ||
          val.includes('<FILL') ||
          val.includes('<optional'),
      });
    }
  }
  return rows;
}

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function buildHtml(job, rows) {
  const sections = {};
  for (const r of rows) (sections[r.section] ||= []).push(r);

  const blocks = Object.entries(sections).map(([name, items]) => `
    <h2>${esc(name)}</h2>
    <table>
      ${items.map((r) => `
      <tr class="${r.needsReview ? 'review' : ''}">
        <td class="label">${esc(r.label)}${r.needsReview ? ' <span class="flag">review</span>' : ''}</td>
        <td class="val"><span class="txt">${esc(r.value)}</span>
          <button onclick="copyText(this)">copy</button></td>
      </tr>`).join('')}
    </table>`).join('\n');

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Fill Sheet — ${esc(job.title)} @ ${esc(job.company)}</title>
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:860px;margin:0 auto;padding:20px;color:#1f2328;background:#f6f8fa}
  header{background:#24292f;color:#fff;padding:16px 20px;border-radius:10px;margin-bottom:8px}
  header h1{margin:0;font-size:17px}
  header a{color:#7fd3ff}
  .warn{background:#fff8c5;border:1px solid #d4a72c;border-radius:8px;padding:10px 14px;font-size:13px;margin:12px 0}
  h2{font-size:14px;text-transform:capitalize;margin:22px 0 6px;color:#424a53}
  table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #d0d7de;border-radius:8px;overflow:hidden}
  td{padding:9px 12px;border-top:1px solid #eaeef2;vertical-align:top;font-size:13.5px}
  tr:first-child td{border-top:none}
  .label{width:34%;color:#636c76;font-weight:600}
  .val{display:flex;gap:8px;align-items:flex-start;justify-content:space-between}
  .txt{flex:1;white-space:pre-wrap}
  button{background:#0969da;color:#fff;border:0;border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;white-space:nowrap}
  button:hover{background:#0860ca}
  tr.review .label{color:#9a6700}
  .flag{background:#fff1c2;color:#7a5c00;font-size:10px;padding:1px 5px;border-radius:4px;font-weight:700;text-transform:uppercase}
  .apply{display:inline-block;margin-top:8px;background:#1f883d;color:#fff;text-decoration:none;padding:8px 16px;border-radius:7px;font-weight:600;font-size:13px}
</style></head><body>
<header>
  <h1>${esc(job.title)} — ${esc(job.company)}</h1>
  <a class="apply" href="${esc(job.url)}" target="_blank" rel="noopener">Open application ↗</a>
</header>
<div class="warn"><strong>You submit, not the tool.</strong> Keep this open beside the form, copy each field, and
<strong>re-check every "review"-flagged answer</strong> (work authorization, salary, EEO) before you submit — these are your responsibility.</div>
${blocks}
<script>
  function copyText(btn){
    const t = btn.parentElement.querySelector('.txt').textContent;
    navigator.clipboard.writeText(t).then(()=>{const o=btn.textContent;btn.textContent='copied ✓';setTimeout(()=>btn.textContent=o,1200);});
  }
</script>
</body></html>`;
}

function buildText(job, rows) {
  let out = `FILL SHEET — ${job.title} @ ${job.company}\nApply: ${job.url}\n`;
  out += `(You paste these; you submit. Re-check [REVIEW] answers every time.)\n`;
  let section = '';
  for (const r of rows) {
    if (r.section !== section) { section = r.section; out += `\n## ${section}\n`; }
    out += `${r.needsReview ? '[REVIEW] ' : ''}${r.label}: ${r.value}\n`;
  }
  return out;
}

// Generate a fill sheet for one job into outDir/fillsheets/.
function generate(job, vault, outDir) {
  const rows = toRows(vault, job);
  const dir = path.join(outDir, 'fillsheets');
  fs.mkdirSync(dir, { recursive: true });
  const slug = `${job.company}-${job.title}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
  const htmlPath = path.join(dir, `${slug}.html`);
  const txtPath = path.join(dir, `${slug}.txt`);
  fs.writeFileSync(htmlPath, buildHtml(job, rows), 'utf8');
  fs.writeFileSync(txtPath, buildText(job, rows), 'utf8');
  return { htmlPath, txtPath, slug };
}

module.exports = { generate, toRows, substitute };
