// Greenhouse connector — many product companies expose a public board JSON API:
//   https://boards-api.greenhouse.io/v1/boards/<token>/jobs?content=true
// No key required. Configure board tokens in config.greenhouseBoards.
const { getJson } = require('../core/http');

function stripHtml(s) {
  return (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function fetch(config) {
  const all = [];
  for (const token of config.greenhouseBoards) {
    const url = `https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`;
    try {
      const data = await getJson(url, { timeoutMs: config.requestTimeoutMs,
        headers: { 'User-Agent': config.userAgent } });
      for (const j of data.jobs || []) {
        all.push({
          title: j.title,
          company: token,
          location: (j.location && j.location.name) || '',
          url: j.absolute_url,
          description: stripHtml(j.content).slice(0, 4000),
          source: 'greenhouse',
          postedDate: j.updated_at || '',
        });
      }
    } catch (e) {
      console.warn(`  [greenhouse] ${token}: ${e.message}`);
    }
  }
  return all;
}

module.exports = { fetch };
