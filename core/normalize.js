// Flattens all sources into one shape and removes duplicates.
// A normalized job: { title, company, location, url, description, source, postedDate }

function clean(job) {
  return {
    title: (job.title || '').trim(),
    company: (job.company || 'Unknown').trim(),
    location: (job.location || '').trim(),
    url: (job.url || '').trim(),
    description: (job.description || '').trim(),
    source: job.source || 'unknown',
    postedDate: job.postedDate || '',
  };
}

function dedupeKey(job) {
  // Same role often appears on multiple boards. Key on normalized title+company.
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return `${norm(job.title)}::${norm(job.company)}`;
}

function normalize(rawJobs) {
  const seen = new Map();
  for (const raw of rawJobs) {
    const job = clean(raw);
    if (!job.title || !job.url) continue; // must be actionable
    const key = dedupeKey(job);
    if (!seen.has(key)) {
      seen.set(key, job);
    } else {
      // Keep the one with the richer description.
      const existing = seen.get(key);
      if (job.description.length > existing.description.length) seen.set(key, job);
    }
  }
  return [...seen.values()];
}

module.exports = { normalize, dedupeKey };
