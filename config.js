// Central configuration. Edit this to change targeting, sources, and filters.
// No secrets live here — API keys come from environment variables (see .env.example).

module.exports = {
  // ---- Search terms sent to the job APIs ----
  searchTerms: [
    'senior product manager',
    'principal product manager',
    'technical product manager',
    'platform product manager',
    'product manager identity',
  ],

  // ---- Location targeting ----
  location: {
    city: 'Pune',
    country: 'in', // Adzuna country code (India)
    // INDIA-ONLY: A job must contain "india" OR one of these Indian cities (case-insensitive).
    // "Remote" alone is NOT enough — it must be "Remote, India" or have an Indian city.
    requireIndia: true,  // Require "india" keyword OR an Indian city
    indianCities: ['pune', 'bengaluru', 'bangalore', 'hyderabad', 'mumbai', 'delhi', 'chennai', 'kolkata', 'gurugram', 'gurgaon', 'noida'],
    // Strict mode: if true, jobs without India/Indian-city are excluded entirely.
    strict: true,
  },

  // ---- Minimum score (0-100) to appear in the dashboard ----
  minScore: 25,

  // ---- Only show MNCs? If true, non-MNC jobs are dropped. If false, they're kept but down-ranked. ----
  mncOnly: false,
  mncDownrank: 15, // points subtracted from non-MNC employers when mncOnly=false

  // ---- MNC allow-list (lowercased substrings matched against company name). Prune/extend freely. ----
  mncAllowList: [
    'microsoft', 'google', 'amazon', 'aws', 'salesforce', 'sap', 'oracle',
    'cisco', 'okta', 'vmware', 'atlassian', 'servicenow', 'paypal',
    'mastercard', 'visa', 'adobe', 'nvidia', 'ibm', 'dell', 'intel',
    'jpmorgan', 'jp morgan', 'goldman', 'morgan stanley', 'american express',
    'optum', 'unitedhealth', 'walmart', 'uber', 'linkedin', 'workday',
    'cloudflare', 'twilio', 'stripe', 'red hat', 'thoughtworks', 'accenture',
    'deloitte', 'citi', 'citigroup', 'barclays', 'wells fargo', 'hsbc',
    'siemens', 'philips', 'honeywell', 'qualcomm', 'samsung', 'cognizant',
  ],

  // ---- Workday tenants to pull from. Format verified against the public cxs JSON endpoint.
  //      Find a company's values from its careers URL:
  //      https://<tenant>.<pod>.myworkdayjobs.com/<site>
  //      e.g. salesforce.wd12.myworkdayjobs.com/External_Career_Site
  //           -> tenant: 'salesforce', pod: 'wd12', site: 'External_Career_Site'
  //      MNCs matched to your IAM / cloud / API-platform niche are seeded below.
  //      Confidence tags: [verified] = tenant/pod/site confirmed from a live source,
  //      [check-site] = pod or site path likely but confirm on the company's careers page,
  //      because Workday pods (wdN) and site slugs can change per tenant.
  workdayTenants: [
    { company: 'Salesforce', tenant: 'salesforce', pod: 'wd12', site: 'External_Career_Site' },     // [verified]
    { company: 'NVIDIA',     tenant: 'nvidia',     pod: 'wd5',  site: 'NVIDIAExternalCareerSite' },  // [verified]
    { company: 'Cisco',      tenant: 'cisco',      pod: 'wd5',  site: 'external' },                  // [verified pod] confirm site slug
    { company: 'Adobe',      tenant: 'adobe',      pod: 'wd5',  site: 'external_experienced' },      // [verified]
    { company: 'Mastercard', tenant: 'mastercard', pod: 'wd1',  site: 'CorporateCareers' },          // [verified]
    { company: 'Dell',       tenant: 'dell',       pod: 'wd1',  site: 'External' },                  // [check-site]
    { company: 'PayPal',     tenant: 'paypal',     pod: 'wd1',  site: 'jobs' },                      // [check-site]
    { company: 'SAP',        tenant: 'sap',        pod: 'wd3',  site: 'SAP_SuccessFactors' },        // [check-site]
    { company: 'Qualcomm',   tenant: 'qualcomm',   pod: 'wd5',  site: 'External' },                  // [check-site]
    // Add more: open the company careers page, find the myworkdayjobs URL, read tenant/pod/site.
  ],

  // ---- Greenhouse board tokens (the slug in boards.greenhouse.io/<token>). No key needed. ----
  greenhouseBoards: [
    'okta',            // [verified] Identity & Access Management — your core niche
    'recordedfuture',  // [verified] security / threat intelligence
    'axon',            // [verified] public-safety tech platform
    'stripe',          // [check-slug] payments/API platform (large Greenhouse board)
    'databricks',      // [check-slug] data + cloud platform
    'cloudflare',      // [check-slug] security / edge cloud platform
    'hashicorp',       // [check-slug] cloud infra / identity (Vault/Boundary)
    'gitlab',          // [check-slug] devops platform
  ],

  // ---- Lever board slugs (jobs.lever.co/<slug>). No key needed. ----
  leverBoards: [
    'palantir',  // [check-slug] data/security platform
    'netflix',   // [check-slug] large product org
    'plaid',     // [check-slug] fintech API platform (may be on Ashby — see below)
  ],

  // ---- Ashby boards (api.ashbyhq.com/posting-api/job-board/<org>). No key needed. ----
  ashbyBoards: [
    'ramp',   // [check-slug] fintech platform
    'plaid',  // [check-slug] fintech API platform
  ],

  // ---- SmartRecruiters companies (api.smartrecruiters.com/v1/companies/<company>/postings). No key. ----
  smartRecruitersCompanies: [
    'Visa',  // [check-slug] payments network — IAM/security roles
  ],

  // ---- Output ----
  output: {
    html: 'report.html',
    json: 'results.json',
    topTailored: 10, // generate cover-letter drafts for the top N matches
  },

  // ---- Networking ----
  requestTimeoutMs: 15000,
  userAgent: 'job-hunt-assistant/1.0 (personal job search)',
};
