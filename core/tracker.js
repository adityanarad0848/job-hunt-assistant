// Tracks which jobs you've seen / applied to / skipped across runs.
// State lives in applied.json (gitignored — it's personal, per-machine).
//
// Each job gets a stable id from title+company so it's recognised across runs
// even though its position in the ranked list changes.
const fs = require('fs');
const path = require('path');

const STORE = 'applied.json';
const STATES = ['new', 'seen', 'applied', 'skipped'];

function storePath(dir) {
  return path.join(dir, STORE);
}

function jobId(job) {
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${norm(job.company)}__${norm(job.title)}`;
}

function load(dir) {
  const p = storePath(dir);
  if (!fs.existsSync(p)) return { jobs: {}, lastRun: null };
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.warn(`  [tracker] could not read ${STORE} (${e.message}); starting fresh.`);
    return { jobs: {}, lastRun: null };
  }
}

function save(dir, state) {
  fs.writeFileSync(storePath(dir), JSON.stringify(state, null, 2), 'utf8');
}

// Reconcile the fresh ranked results against stored state.
// Returns the jobs annotated with { id, state, isNew } and updates the store:
//   - unseen job      -> state 'new', isNew true
//   - previously 'new'/'seen' -> state 'seen'
//   - 'applied'/'skipped' preserved
function reconcile(dir, jobs) {
  const state = load(dir);
  const now = new Date().toISOString();
  const annotated = [];

  for (const job of jobs) {
    const id = jobId(job);
    const prev = state.jobs[id];
    let st, isNew;

    if (!prev) {
      st = 'new';
      isNew = true;
      state.jobs[id] = { state: 'new', title: job.title, company: job.company,
        url: job.url, firstSeen: now, lastSeen: now };
    } else {
      // Preserve a user decision; otherwise demote 'new' -> 'seen'.
      st = prev.state === 'applied' || prev.state === 'skipped'
        ? prev.state
        : (prev.state === 'new' ? 'seen' : prev.state);
      isNew = false;
      prev.state = st;
      prev.lastSeen = now;
      prev.title = job.title; prev.company = job.company; prev.url = job.url;
    }
    annotated.push({ ...job, id, state: st, isNew });
  }

  state.lastRun = now;
  save(dir, state);
  return { annotated, lastRun: state.lastRun };
}

// Set a job's state by its rank in the last results.json, or by id.
function setState(dir, idOrRank, newState, results) {
  if (!STATES.includes(newState)) {
    throw new Error(`Invalid state "${newState}". Use one of: ${STATES.join(', ')}`);
  }
  let id = idOrRank;
  if (/^\d+$/.test(String(idOrRank))) {
    const job = results[Number(idOrRank) - 1];
    if (!job) throw new Error(`No job at rank #${idOrRank}.`);
    id = jobId(job);
  }
  const state = load(dir);
  if (!state.jobs[id]) {
    // Allow marking even if not yet in store (seed a minimal record).
    state.jobs[id] = { state: newState, firstSeen: new Date().toISOString() };
  }
  const label = `${state.jobs[id].title || id} @ ${state.jobs[id].company || ''}`.trim();
  state.jobs[id].state = newState;
  state.jobs[id].decidedAt = new Date().toISOString();
  save(dir, state);
  return { id, label, state: newState };
}

function summary(annotated) {
  const counts = { new: 0, seen: 0, applied: 0, skipped: 0 };
  for (const j of annotated) counts[j.state] = (counts[j.state] || 0) + 1;
  return counts;
}

module.exports = { jobId, load, save, reconcile, setState, summary, STATES, STORE };
