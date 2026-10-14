// Lever connector — public postings API:
//   https://api.lever.co/v0/postings/<slug>?mode=json
// No key required. Configure company slugs in config.leverBoards.
const { getJson } = require('../core/http');

async function fetch(config) {
  const all = [];
  for (const slug of config.leverBoards) {
    const url = `https://api.lever.co/v0/postings/${slug}?mode=json`;
    try {
      const data = await getJson(url, { timeoutMs: config.requestTimeoutMs,
        headers: { 'User-Agent': config.userAgent } });
      for (const j of data || []) {
        all.push({
          title: j.text,
          company: slug,
          location: (j.categories && j.categories.location) || '',
          url: j.hostedUrl,
          description: (j.descriptionPlain || '').slice(0, 4000),
          source: 'lever',
          postedDate: j.createdAt ? new Date(j.createdAt).toISOString() : '',
        });
      }
    } catch (e) {
      console.warn(`  [lever] ${slug}: ${e.message}`);
    }
  }
  return all;
}

module.exports = { fetch };
