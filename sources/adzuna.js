// Adzuna connector — large job aggregator with a free developer API and an India index.
// Get a free app_id + app_key at https://developer.adzuna.com/ and set them as env vars:
//   ADZUNA_APP_ID, ADZUNA_APP_KEY
const { getJson } = require('../core/http');

async function fetch(config) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    console.warn('  [adzuna] skipped — set ADZUNA_APP_ID and ADZUNA_APP_KEY to enable.');
    return [];
  }

  const country = config.location.country || 'in';
  const where = encodeURIComponent(config.location.city || '');
  const all = [];

  for (const term of config.searchTerms) {
    const what = encodeURIComponent(term);
    const url =
      `https://api.adzuna.com/v1/api/jobs/${country}/search/1` +
      `?app_id=${appId}&app_key=${appKey}` +
      `&results_per_page=50&what=${what}&where=${where}&max_days_old=30&content-type=application/json`;
    try {
      const data = await getJson(url, { timeoutMs: config.requestTimeoutMs,
        headers: { 'User-Agent': config.userAgent } });
      for (const j of data.results || []) {
        all.push({
          title: j.title,
          company: (j.company && j.company.display_name) || 'Unknown',
          location: (j.location && j.location.display_name) || '',
          url: j.redirect_url,
          description: j.description || '',
          source: 'adzuna',
          postedDate: j.created || '',
        });
      }
    } catch (e) {
      console.warn(`  [adzuna] "${term}": ${e.message}`);
    }
  }
  return all;
}

module.exports = { fetch };
