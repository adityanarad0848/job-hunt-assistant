// Workday connector.
// Each company runs its own isolated Workday tenant. The public careers page
// calls a JSON endpoint we can call directly (no login, no scraping of HTML):
//
//   POST https://<tenant>.<pod>.myworkdayjobs.com/wday/cxs/<tenant>/<site>/jobs
//   body: { appliedFacets:{}, limit, offset, searchText }
//
// This is the same public API the browser uses. We do NOT log in or submit here.
const { postJson } = require('../core/http');

function apiUrl({ tenant, pod, site }) {
  return `https://${tenant}.${pod}.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`;
}

function externalUrl({ tenant, pod, site }, externalPath) {
  // externalPath looks like "/job/Pune/Senior-PM_JR123" -> build the human apply URL
  const base = `https://${tenant}.${pod}.myworkdayjobs.com/${site}`;
  return externalPath ? base + externalPath : base;
}

async function fetchTenant(tenantCfg, searchText, { timeoutMs, userAgent }) {
  const url = apiUrl(tenantCfg);
  const headers = { 'User-Agent': userAgent };
  const jobs = [];
  const pageSize = 20;

  // Pull up to 3 pages (60 jobs) per search term per tenant to stay polite.
  for (let page = 0; page < 3; page++) {
    const body = { appliedFacets: {}, limit: pageSize, offset: page * pageSize, searchText };
    let data;
    try {
      data = await postJson(url, body, { headers, timeoutMs });
    } catch (e) {
      // One tenant failing should not kill the whole run.
      if (page === 0) console.warn(`  [workday] ${tenantCfg.company}: ${e.message}`);
      break;
    }
    const postings = data.jobPostings || [];
    for (const p of postings) {
      jobs.push({
        title: p.title,
        company: tenantCfg.company,
        location: p.locationsText || '',
        url: externalUrl(tenantCfg, p.externalPath),
        description: p.bulletFields ? p.bulletFields.join(' ') : '',
        source: 'workday',
        postedDate: p.postedOn || '',
      });
    }
    if (postings.length < pageSize) break;
  }
  return jobs;
}

async function fetch(config) {
  const all = [];
  for (const tenant of config.workdayTenants) {
    for (const term of config.searchTerms) {
      const jobs = await fetchTenant(tenant, term, {
        timeoutMs: config.requestTimeoutMs,
        userAgent: config.userAgent,
      });
      all.push(...jobs);
    }
  }
  return all;
}

module.exports = { fetch, apiUrl };
