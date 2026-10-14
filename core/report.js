// Builds a single self-contained report.html — ranked, filterable, with Apply links
// and expandable cover-letter drafts. Opens in any browser, no server needed.
const fs = require('fs');
const path = require('path');
const { coverLetter } = require('./tailor');

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function scoreColor(score) {
  if (score >= 70) return '#1a7f37';
  if (score >= 50) return '#9a6700';
  return '#636c76';
}

function build(jobs, profile, config, meta) {
  const topN = config.output.topTailored;
  const rows = jobs.map((j, i) => {
    const letter = i < topN ? coverLetter(j, profile) : null;
    return { ...j, letter, rank: i + 1 };
  });

  const cards = rows.map((j) => `
    <div class="card" data-score="${j.score}" data-company="${esc(j.company.toLowerCase())}">
      <div class="head">
        <span class="score" style="background:${scoreColor(j.score)}">${j.score}</span>
        <div class="titleblock">
          <div class="jtitle">${esc(j.title)}</div>
          <div class="meta">${esc(j.company)} · ${esc(j.location || 'Location N/A')} · <span class="src">${esc(j.source)}</span>${j.postedDate ? ' · ' + esc(String(j.postedDate).slice(0, 10)) : ''}</div>
        </div>
        <a class="apply" href="${esc(j.url)}" target="_blank" rel="noopener">Apply →</a>
      </div>
      <div class="reasons">${j.reasons.map((r) => `<span class="chip">${esc(r)}</span>`).join('')}</div>
      ${j.letter ? `<details><summary>Cover-letter draft</summary><textarea readonly>${esc(j.letter)}</textarea>
        <div class="hint">Fill sheet for this job: <code>node fillsheet.js ${j.rank}</code></div></details>` : ''}
    </div>`).join('\n');

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Job Matches — ${esc(profile.name)}</title>
<style>
  :root{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
  body{margin:0;background:#f6f8fa;color:#1f2328}
  header{background:#24292f;color:#fff;padding:18px 24px}
  header h1{margin:0;font-size:18px}
  header p{margin:4px 0 0;font-size:13px;opacity:.8}
  .controls{position:sticky;top:0;background:#fff;border-bottom:1px solid #d0d7de;padding:12px 24px;display:flex;gap:16px;align-items:center;flex-wrap:wrap;z-index:5}
  .controls label{font-size:13px;color:#636c76}
  .controls input{margin-left:6px}
  main{max-width:900px;margin:0 auto;padding:20px}
  .card{background:#fff;border:1px solid #d0d7de;border-radius:10px;padding:14px 16px;margin-bottom:12px}
  .head{display:flex;align-items:center;gap:12px}
  .score{color:#fff;font-weight:700;border-radius:8px;padding:6px 10px;min-width:34px;text-align:center}
  .titleblock{flex:1}
  .jtitle{font-weight:600;font-size:15px}
  .meta{font-size:12.5px;color:#636c76;margin-top:2px}
  .src{text-transform:uppercase;font-size:10px;letter-spacing:.5px;background:#eaeef2;padding:1px 5px;border-radius:4px}
  .apply{background:#1f883d;color:#fff;text-decoration:none;padding:7px 14px;border-radius:7px;font-size:13px;font-weight:600;white-space:nowrap}
  .apply:hover{background:#1a7f37}
  .reasons{margin-top:10px;display:flex;gap:6px;flex-wrap:wrap}
  .chip{font-size:11px;background:#eaeef2;color:#424a53;padding:3px 8px;border-radius:20px}
  details{margin-top:10px}
  summary{cursor:pointer;font-size:13px;color:#0969da}
  textarea{width:100%;height:260px;margin-top:8px;font-family:ui-monospace,Menlo,monospace;font-size:12px;border:1px solid #d0d7de;border-radius:6px;padding:10px;box-sizing:border-box}
  .hint{font-size:12px;color:#636c76;margin-top:6px}
  .hint code{background:#eaeef2;padding:2px 6px;border-radius:4px;font-size:11.5px}
  .count{font-size:13px;color:#636c76}
</style></head>
<body>
<header>
  <h1>Job Matches — ${esc(profile.name)}</h1>
  <p>${rows.length} matches · generated ${esc(meta.generatedAt)} · sources: ${esc(meta.sources.join(', '))}${meta.demo ? ' · <strong>DEMO DATA</strong>' : ''}</p>
</header>
<div class="controls">
  <label>Min score <input type="range" id="minScore" min="0" max="100" value="0"> <span id="minScoreVal">0</span></label>
  <label>Company <input type="text" id="companyFilter" placeholder="filter…"></label>
  <span class="count" id="count"></span>
</div>
<main id="list">
${cards}
</main>
<script>
  const cards = [...document.querySelectorAll('.card')];
  const minScore = document.getElementById('minScore');
  const minScoreVal = document.getElementById('minScoreVal');
  const companyFilter = document.getElementById('companyFilter');
  const count = document.getElementById('count');
  function apply(){
    const min = +minScore.value; minScoreVal.textContent = min;
    const q = companyFilter.value.toLowerCase();
    let shown = 0;
    for(const c of cards){
      const ok = (+c.dataset.score >= min) && (!q || c.dataset.company.includes(q));
      c.style.display = ok ? '' : 'none'; if(ok) shown++;
    }
    count.textContent = shown + ' shown';
  }
  minScore.addEventListener('input', apply);
  companyFilter.addEventListener('input', apply);
  apply();
</script>
</body></html>`;
}

function write(jobs, profile, config, meta, outDir) {
  const html = build(jobs, profile, config, meta);
  const htmlPath = path.join(outDir, config.output.html);
  const jsonPath = path.join(outDir, config.output.json);
  fs.writeFileSync(htmlPath, html, 'utf8');
  fs.writeFileSync(jsonPath, JSON.stringify(jobs, null, 2), 'utf8');
  return { htmlPath, jsonPath };
}

module.exports = { write, build };
