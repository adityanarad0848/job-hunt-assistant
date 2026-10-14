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
  console.log(`• ${scored.length} above min score (${config.minScore})\n`);

  const meta = {
    generatedAt: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
    sources: used.length ? used : ['none'],
    demo,
  };
  const { htmlPath, jsonPath } = report.write(scored, profile, config, meta, __dirname);

  // Console preview of the top matches.
  console.log('Top matches:');
  for (const j of scored.slice(0, 10)) {
    console.log(`  ${String(j.score).padStart(3)}  ${j.title}  —  ${j.company} (${j.location || 'N/A'})`);
  }

  console.log(`\n✓ Dashboard: ${htmlPath}`);
  console.log(`✓ JSON:      ${jsonPath}`);
  console.log(demo
    ? '\nThis was demo data. On a machine with internet, add API keys (.env) and run: node run.js'
    : '');
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
