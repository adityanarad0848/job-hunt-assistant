# Job Hunt Assistant

A **human-in-the-loop** job matching assistant for Aditya Narad (Sr. Product Manager, Pune).
It fetches jobs from legal sources, scores them against your profile, ranks them, drafts
tailored cover letters, and produces a browser dashboard with direct **Apply** links.

> **It never logs into your accounts and never auto-submits applications.** You always
> make the final click. This keeps you compliant with LinkedIn/Workday terms and avoids
> account bans — and for a senior role, targeted quality beats volume anyway.

## Quick start

Requires **Node.js 18+**. No `npm install` needed — zero dependencies, pure Node built-ins.

```bash
# 1. See the whole pipeline run offline on sample data:
node run.js --demo

# 2. Open the generated dashboard:
open report.html        # macOS
# start report.html     # Windows
# xdg-open report.html  # Linux
```

For **live data**, add API keys and configure sources, then:

```bash
cp .env.example .env     # fill in Adzuna keys
# edit config.js         # add Workday tenants, Greenhouse/Lever boards
node run.js
```

## How it works

```
FETCH ──▶ NORMALIZE ──▶ SCORE & RANK ──▶ TAILOR ──▶ DASHBOARD ──▶ YOU APPLY
(APIs)    (dedupe)       (50:50 engine)   (drafts)    (report.html)   (final click)
```

1. **Fetch** — pulls postings from Adzuna, Greenhouse, Lever, and company **Workday** tenants.
   All are public/legal JSON APIs. No login, no scraping behind auth.
2. **Normalize** — flattens every source into one shape and removes duplicate postings.
3. **Score & rank** — each job gets a 0–100 score:
   - **TIGHT (50%)** — your niche: IAM, RBAC, authorization, identity, cloud, API platform…
   - **BROAD (50%)** — general senior-PM fit: roadmap, agile, SaaS, enterprise, stakeholder…
   - **Gates** — seniority (boost Senior/Principal/Group, penalize Associate/Intern),
     location (Pune/remote-India preferred), MNC (allow-list).
4. **Tailor** — top matches get a template-based cover-letter draft built from *your real
   achievements* (no API key needed). **Drafts — edit before sending.**
5. **Dashboard** — `report.html`: ranked, filterable, with Apply links and expandable drafts.
6. **You apply** — review, personalize, and submit yourself.

## Configure targeting — `config.js`

- `searchTerms` — what to search the APIs for.
- `location` — city/country and the allow-list of acceptable locations.
- `minScore` — hide weak matches.
- `mncOnly` / `mncDownrank` / `mncAllowList` — MNC filtering.
- `workdayTenants` — the big one. Each MNC's Workday feed. Find values from a company's
  careers URL: `https://<tenant>.<pod>.myworkdayjobs.com/<site>`
  (e.g. `salesforce.wd12.myworkdayjobs.com/External_Career_Site`
  → `tenant: salesforce, pod: wd12, site: External_Career_Site`).
- `greenhouseBoards` / `leverBoards` — company slugs on those boards.

## Tune the match — `profile/aditya.json`

Edit keyword weights under `keywords.tight` / `keywords.broad`, the seniority
boosts/penalties, and your `achievements` (used verbatim in cover-letter drafts).

## About the "auto-apply to LinkedIn/Workday" idea

Full auto-submit is intentionally **not** built, because:

- It violates LinkedIn and Workday terms (bot-driven logged-in actions) → real ban risk.
- Workday makes you create a separate account per company tenant.
- Applications include **legal attestations** (work authorization, EEO) and screening
  questions a bot should not answer on your behalf.

### v2 — Answers Vault (BUILT) — the Workday time-saver

~70% of Workday/company-form fields are the same every time (contact, work auth, notice
period, "why this company"). Store them once in `profile/answers-vault.json`, then generate
a per-job **fill sheet** you keep open beside the form and copy-paste from.

```bash
node run.js --demo        # (or live) produces results.json
node fillsheet.js         # fill sheets for ALL ranked jobs
node fillsheet.js 1       # just rank #1
node fillsheet.js 1 3 5   # ranks #1, #3, #5
open fillsheets/<slug>.html
```

Each fill sheet:
- Substitutes the real `<COMPANY>` / `<ROLE>` into your reusable screening answers.
- Has a **copy button** per field (HTML) plus a plain-text version.
- **Flags every legally-sensitive answer** (work authorization, salary, EEO/demographics)
  with `[REVIEW]` — you must re-check these each time; they're your responsibility.

It never fills or submits the form for you. You paste, you review, you click submit.

### v3 — Browser Autofill (BUILT) — fill the form, don't copy-paste

A **bookmarklet** that fills the application form for you. It runs **in your own browser,
only when you click it** — it does not log in, navigate, or submit. You open the Workday /
company page yourself, click the bookmark, the empty fields fill and turn green, and you
review the filled form and click submit.

```bash
node autofill/build-bookmarklet.js   # bakes your vault into autofill/install.html
open autofill/install.html           # drag the "⚡ Fill this job form" button to your bookmarks bar
```

Then, on any application page:
1. Sign in / open the form as you normally would.
2. Click the **⚡ Fill this job form** bookmark.
3. Empty text/email/phone/textarea fields matching your vault populate and highlight green;
   a banner reports how many were filled.
4. **Review everything** — especially work authorization, salary, required dropdowns, and
   attestations (the bookmarklet only fills text fields and never submits) — then submit.

Why a bookmarklet and not a headless bot: a bot that logs into your Workday/LinkedIn account
and clicks through violates their terms and risks a ban. A bookmarklet is just your own
browser, your own session, your own click — safe, and it still means **you only review a
filled form instead of typing**. Re-run the builder whenever you edit `answers-vault.json`.

### v4 — (optional, not built) Dropdown/radio + file-upload assist
Workday also has select menus, radios, and resume-upload steps a text-field filler can't
safely touch. A future version could pre-select obvious dropdowns and still pause for review.

## Project layout

```
job-hunt-assistant/
├── run.js                      orchestrator: fetch -> rank -> dashboard (--demo for offline)
├── fillsheet.js                v2: generate per-job answer fill sheets
├── config.js                   targeting + sources (Workday/Greenhouse/Lever/Ashby/SmartRecruiters)
├── profile/
│   ├── aditya.json             your structured profile + match weights
│   └── answers-vault.json      v2/v3: your reusable application answers
├── sources/                    adzuna, greenhouse, lever, workday, ashby, smartrecruiters
├── core/                       http, normalize, score, tailor, report, vault
├── autofill/                   v3: filler.js + build-bookmarklet.js (-> install.html)
├── demo/sampleJobs.js          real-shaped offline fixtures
├── .env.example                API key template
└── README.md
```

## Sources included

| Source | Auth | Configured for |
|---|---|---|
| Adzuna | free API key | Pune PM roles across many boards |
| Workday | none (public JSON) | Salesforce, NVIDIA, Cisco, Adobe, Mastercard, Dell, PayPal, SAP, Qualcomm |
| Greenhouse | none | Okta, Recorded Future, Axon, Stripe, Databricks, Cloudflare, HashiCorp, GitLab |
| Lever | none | Palantir, Netflix, Plaid |
| Ashby | none | Ramp, Plaid |
| SmartRecruiters | none | Visa |

Entries tagged `[check-site]` / `[check-slug]` in `config.js` need a quick confirm against
the company's live careers page (Workday pods and site slugs vary per tenant).
