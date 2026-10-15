#!/usr/bin/env node
// Mark a job's state so the dashboard can hide/flag it on future runs.
//
//   node applied.js                 list current tracked jobs by state
//   node applied.js 3 applied       mark rank #3 (from results.json) as applied
//   node applied.js 5 skip          mark rank #5 as skipped
//   node applied.js 2 seen          mark rank #2 as seen
//
// States: new | seen | applied | skipped  ("skip" is accepted as an alias)
const fs = require('fs');
const path = require('path');
const tracker = require('./core/tracker');

function loadResults() {
  const p = path.join(__dirname, 'results.json');
  if (!fs.existsSync(p)) {
    console.error('No results.json yet. Run "node run.js" (or --demo) first.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function list() {
  const state = tracker.load(__dirname);
  const entries = Object.entries(state.jobs);
  if (!entries.length) { console.log('No tracked jobs yet. Run the pipeline first.'); return; }
  const byState = { applied: [], skipped: [], seen: [], new: [] };
  for (const [, j] of entries) (byState[j.state] || (byState[j.state] = [])).push(j);
  for (const st of ['applied', 'skipped', 'seen', 'new']) {
    const items = byState[st] || [];
    if (!items.length) continue;
    console.log(`\n${st.toUpperCase()} (${items.length})`);
    for (const j of items) console.log(`  • ${j.title || '?'} @ ${j.company || '?'}`);
  }
  console.log(`\nLast run: ${state.lastRun || 'never'}`);
}

function main() {
  const args = process.argv.slice(2);
  if (!args.length) return list();

  const [rank, rawState] = args;
  const stateMap = { skip: 'skipped', apply: 'applied' };
  const newState = stateMap[rawState] || rawState;

  try {
    const results = loadResults();
    const { label, state } = tracker.setState(__dirname, rank, newState, results);
    console.log(`✓ Marked "${label}" as ${state}.`);
    console.log('It will be reflected next time you run "node run.js".');
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
}

main();
