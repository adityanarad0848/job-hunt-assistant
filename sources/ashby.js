// Ashby connector — public job-board API used by many newer companies (Ramp, Plaid, etc.):
//   GET https://api.ashbyhq.com/posting-api/job-board/<org>?includeCompensation=true
// No key required. Configure orgs in config.ashbyBoards.
const { getJson } = require('../core/http');

async function fetch(config) {
  const all = [];
  for (const org of config.ashbyBoards || []) {
    const url = `https://api.ashbyhq.com/posting-api/job-board/${org}?includeCompensation=true`;
    try {
      const data = await getJson(url, { timeoutMs: config.requestTimeoutMs,
        headers: { 'User-Agent': config.userAgent } });
      for (const j of data.jobs || []) {
        all.push({
          title: j.title,
          company: org,
          location: j.location || (j.address && j.address.postalAddress && j.address.postalAddress.addressLocality) || '',
          url: j.jobUrl || j.applyUrl || '',
          description: (j.descriptionPlain || '').slice(0, 4000),
          source: 'ashby',
          postedDate: j.publishedAt || '',
        });
      }
    } catch (e) {
      console.warn(`  [ashby] ${org}: ${e.message}`);
    }
  }
  return all;
}

module.exports = { fetch };
