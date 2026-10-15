// The match engine. Produces a 0-100 score per job from two weighted halves
// (TIGHT niche fit 50% + BROAD senior-PM fit 50%), plus seniority/location/MNC gates.

function countKeyword(haystack, keyword) {
  // Whole-ish word/phrase occurrence count, case-insensitive.
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'gi');
  const m = haystack.match(re);
  return m ? m.length : 0;
}

function halfScore(haystack, weights) {
  // Weighted presence, capped so one spammy keyword can't dominate.
  let raw = 0;
  let maxPossible = 0;
  const hits = [];
  for (const [kw, weight] of Object.entries(weights)) {
    maxPossible += weight;
    const n = countKeyword(haystack, kw);
    if (n > 0) {
      raw += weight * Math.min(1 + Math.log2(n), 2); // diminishing returns
      hits.push(kw);
    }
  }
  // Normalize to 0..50 (each half is worth 50 of the 100 total).
  const normalized = maxPossible === 0 ? 0 : Math.min(50, (raw / maxPossible) * 90);
  return { points: normalized, hits };
}

function isMnc(company, mncAllowList) {
  const c = company.toLowerCase();
  return mncAllowList.some((m) => c.includes(m));
}

function matchesLocation(location, allow, strict) {
  const l = location.toLowerCase();
  if (!l) {
    // Unknown/empty location: in strict mode exclude it, otherwise allow scoring to decide
    return !strict;
  }
  return allow.some((a) => l.includes(a));
}

function seniorityAdjust(title, profile) {
  const t = ` ${title.toLowerCase()} `;
  let adj = 0;
  const notes = [];
  for (const [word, boost] of Object.entries(profile.seniorityBoost || {})) {
    if (t.includes(` ${word} `) || t.includes(`${word} `)) { adj += boost; notes.push(`+${boost} ${word}`); }
  }
  for (const [word, pen] of Object.entries(profile.seniorityPenalty || {})) {
    if (t.includes(word)) { adj += pen; notes.push(`${pen} ${word}`); }
  }
  return { adj, notes };
}

function scoreJob(job, profile, config) {
  const haystack = `${job.title} ${job.title} ${job.description}`.toLowerCase();
  // title weighted twice so the role name matters more than body text.

  const tight = halfScore(haystack, profile.keywords.tight);
  const broad = halfScore(haystack, profile.keywords.broad);
  const sen = seniorityAdjust(job.title, profile);

  const mnc = isMnc(job.company, config.mncAllowList);
  const locOk = matchesLocation(job.location, config.location.allow, config.location.strict);

  // Location gate: in strict mode, exclude non-India jobs entirely
  if (config.location.strict && !locOk) return null;

  let score = tight.points + broad.points + sen.adj;

  // MNC handling
  if (!mnc) {
    if (config.mncOnly) return null; // dropped entirely
    score -= config.mncDownrank;
  }
  // Location penalty (only applies in non-strict mode)
  if (!config.location.strict && !locOk) score -= 20;

  score = Math.max(0, Math.min(100, Math.round(score)));

  const reasons = [];
  if (tight.hits.length) reasons.push(`niche: ${tight.hits.slice(0, 5).join(', ')}`);
  if (broad.hits.length) reasons.push(`pm: ${broad.hits.slice(0, 4).join(', ')}`);
  if (sen.notes.length) reasons.push(`level: ${sen.notes.join(' ')}`);
  reasons.push(mnc ? 'MNC ✓' : 'non-MNC');
  reasons.push(locOk ? 'location ✓' : 'out-of-location');

  return {
    ...job,
    score,
    scoreBreakdown: {
      tight: Math.round(tight.points),
      broad: Math.round(broad.points),
      seniority: sen.adj,
      mnc,
      locationOk: locOk,
    },
    reasons,
  };
}

function scoreAll(jobs, profile, config) {
  return jobs
    .map((j) => scoreJob(j, profile, config))
    .filter((j) => j && j.score >= config.minScore)
    .sort((a, b) => b.score - a.score);
}

module.exports = { scoreAll, scoreJob };
