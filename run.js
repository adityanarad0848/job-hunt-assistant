#!/usr/bin/env node
// Orchestrator: fetch -> normalize -> score -> report.
//
//   node run.js            fetch live from configured sources (needs internet + keys)
//   node run.js --demo     run the full pipeline on bundled sample data (offline)
//
// Output: report.html + results.json in this folder.
const fs = require('fs');
const path = require('path');

const config = require('./config');
const { normalize } = require('./core/normalize');
const { scoreAll } = require('./core/score');
const report = require('./core/report');
const tracker = require('./core/tracker');

const sources = {
  adzuna: require('./sources/adzuna'),
  greenhouse: require('./sources/greenhouse'),
  lever: require('./sources/lever'),
  workday: require('./sources/workday'),
  ashby: require('./sources/ashby'),
  smartrecruiters: require('./sources/smartrecruiters'),
};

function loadProfile() {
  const p = path.join(__dirname, 'profile', 'aditya.json');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

async function fetchLive() {
  const raw = [];
  const used = [];
  for (const [name, mod] of Object.entries(sources)) {
    process.stdout.write(`• fetching ${name}... `);
    try {
      const jobs = await mod.fetch(config);
      console.log(`${jobs.length} jobs`);
      if (jobs.length) used.push(name);
      raw.push(...jobs);
    } catch (e) {
      console.log(`failed: ${e.message}`);
    }
  }
  return { raw, used };
}

async function main() {
  const demo = process.argv.includes('--demo');
  const profile = loadProfile();

  console.log(`\nJob Hunt Assistant — ${profile.name}`);
  console.log(demo ? 'Mode: DEMO (bundled sample data, offline)\n' : 'Mode: LIVE\n');

  let raw, used;
  if (demo) {
    raw = require('./demo/sampleJobs');
    used = ['demo'];
    console.log(`• loaded ${raw.length} sample jobs`);
  } else {
    ({ raw, used } = await fetchLive());
  }

  const normalized = normalize(raw);
  console.log(`\n• ${raw.length} fetched -> ${normalized.length} after dedupe`);

  const scored = scoreAll(normalized, profile, config);
  console.log(`• ${scored.length} above min score (${config.minScore})`);

  // Reconcile against what you've seen/applied/skipped before.
  const { annotated } = tracker.reconcile(__dirname, scored);
  const counts = tracker.summary(annotated);
  console.log(`• tracking: ${counts.new} new, ${counts.seen} seen, ${counts.applied} applied, ${counts.skipped} skipped\n`);

  // By default hide jobs you've applied to or skipped; --all shows everything.
  const showAll = process.argv.includes('--all');
  const visible = showAll
    ? annotated
    : annotated.filter((j) => j.state !== 'applied' && j.state !== 'skipped');
  // New jobs first, then by score.
  visible.sort((a, b) => (b.isNew - a.isNew) || (b.score - a.score));

  const meta = {
    generatedAt: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
    sources: used.length ? used : ['none'],
    demo,
    counts,
    showAll,
  };
  const { htmlPath, jsonPath } = report.write(visible, profile, config, meta, __dirname);

  // Console preview — new jobs flagged.
  if (counts.new) console.log(`🆕 ${counts.new} NEW since last run:`);
  for (const j of visible.filter((x) => x.isNew).slice(0, 10)) {
    console.log(`  ${String(j.score).padStart(3)}  ${j.title}  —  ${j.company} (${j.location || 'N/A'})`);
  }
  console.log('\nTop matches:');
  for (const j of visible.slice(0, 10)) {
    const tag = j.isNew ? '🆕' : '  ';
    console.log(`  ${tag} ${String(j.score).padStart(3)}  ${j.title}  —  ${j.company}`);
  }

  console.log(`\n✓ Dashboard: ${htmlPath}`);
  console.log(`✓ JSON:      ${jsonPath}`);
  console.log('  Mark jobs:  node applied.js <rank> applied|skip|seen');
  console.log(demo
    ? '\nThis was demo data. On a machine with internet, add API keys (.env) and run: node run.js'
    : '');
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
