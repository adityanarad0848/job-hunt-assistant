#!/usr/bin/env node
// Generate an application fill sheet from the ranked results.
//
//   node fillsheet.js            generate for ALL jobs in results.json
//   node fillsheet.js 1          generate for rank #1
//   node fillsheet.js 1 3 5      generate for ranks #1, #3, #5
//
// Reads results.json (produced by run.js) and profile/answers-vault.json.
// Writes HTML + text fill sheets into ./fillsheets/.
const fs = require('fs');
const path = require('path');
const { generate } = require('./core/vault');

function load(file) {
  const p = path.join(__dirname, file);
  if (!fs.existsSync(p)) {
    console.error(`Missing ${file}. Run "node run.js --demo" (or live) first.`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function main() {
  const results = load('results.json');
  const vault = load('profile/answers-vault.json');

  const args = process.argv.slice(2).map(Number).filter((n) => !Number.isNaN(n));
  const jobs = args.length
    ? args.map((rank) => results[rank - 1]).filter(Boolean)
    : results;

  if (!jobs.length) { console.error('No matching jobs/ranks found.'); process.exit(1); }

  console.log(`Generating ${jobs.length} fill sheet(s)...\n`);
  for (const job of jobs) {
    const { htmlPath } = generate(job, vault, __dirname);
    console.log(`  ✓ ${job.title} @ ${job.company}`);
    console.log(`    ${htmlPath}`);
  }
  console.log('\nOpen a fill sheet in your browser, keep it beside the application form, and copy each field.');
  console.log('Re-check every "review"-flagged answer (work auth, salary, EEO) before you submit.');
}

main();
