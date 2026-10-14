// Template-based cover-letter drafter. No API key, no LLM required.
// It picks the achievements from your profile that best match the job's keywords
// and assembles a proven cover-letter structure. THESE ARE DRAFTS — edit before sending.

function pickAchievements(job, profile, n = 3) {
  const text = `${job.title} ${job.description}`.toLowerCase();
  const scored = profile.achievements.map((a) => {
    const al = a.toLowerCase();
    let s = 0;
    for (const kw of Object.keys(profile.keywords.tight)) {
      if (text.includes(kw) && al.includes(kw)) s += 3;
    }
    for (const kw of Object.keys(profile.keywords.broad)) {
      if (text.includes(kw) && al.includes(kw)) s += 1;
    }
    return { a, s };
  });
  scored.sort((x, y) => y.s - x.s);
  const picked = scored.slice(0, n).map((x) => x.a);
  // If nothing matched, fall back to the strongest default achievements.
  return picked.length ? picked : profile.achievements.slice(0, n);
}

function coverLetter(job, profile) {
  const achievements = pickAchievements(job, profile, 3);
  const bullets = achievements.map((a) => `  • ${a}`).join('\n');
  const certs = profile.certifications.join(', ');

  return `Dear ${job.company} Hiring Team,

I'm applying for the ${job.title} role. As a ${profile.title} with ${profile.yearsExperience}+ years building enterprise platform products across Identity & Access Management, cloud platforms, and API ecosystems, I believe my background maps closely to what this role needs.

A few results I'd bring:
${bullets}

I hold ${certs}, and I partner closely with engineering, security, and business stakeholders to turn complex platform requirements into shipped, scalable outcomes.

I'd welcome the chance to discuss how I can contribute to ${job.company}'s product goals.

Best regards,
${profile.name}
${profile.email} | ${profile.phone} | ${profile.location}

---
[DRAFT — review and personalize the "${job.company}" paragraph before sending.]`;
}

module.exports = { coverLetter, pickAchievements };
