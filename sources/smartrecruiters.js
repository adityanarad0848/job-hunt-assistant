// SmartRecruiters connector — public postings API (used by Visa and other enterprises):
//   GET https://api.smartrecruiters.com/v1/companies/<company>/postings?limit=100&offset=0
// No key required. Configure companies in config.smartRecruitersCompanies.
const { getJson } = require('../core/http');

async function fetchCompany(company, config) {
  const jobs = [];
  const limit = 100;
  for (let offset = 0; offset < 300; offset += limit) {
    const url = `https://api.smartrecruiters.com/v1/companies/${company}/postings?limit=${limit}&offset=${offset}`;
    let data;
    try {
      data = await getJson(url, { timeoutMs: config.requestTimeoutMs,
        headers: { 'User-Agent': config.userAgent } });
    } catch (e) {
      if (offset === 0) console.warn(`  [smartrecruiters] ${company}: ${e.message}`);
      break;
    }
    const content = data.content || [];
    for (const j of content) {
      const loc = j.location || {};
      jobs.push({
        title: j.name,
        company,
        location: [loc.city, loc.region, loc.country].filter(Boolean).join(', '),
        url: j.ref || (j.id ? `https://jobs.smartrecruiters.com/${company}/${j.id}` : ''),
        description: (j.jobAd && j.jobAd.sections && j.jobAd.sections.jobDescription
          && j.jobAd.sections.jobDescription.text) || '',
        source: 'smartrecruiters',
        postedDate: j.releasedDate || '',
      });
    }
    if (content.length < limit) break;
  }
  return jobs;
}

async function fetch(config) {
  const all = [];
  for (const company of config.smartRecruitersCompanies || []) {
    all.push(...(await fetchCompany(company, config)));
  }
  return all;
}

module.exports = { fetch };
