// Pure matching helpers shared by the browser filler and the Node tests.
// No DOM access here — just string logic — so it can be unit-tested offline.
// (The browser filler.js inlines equivalent logic; this module is the source of
//  truth for the matching RULES and is what the tests exercise.)

var ALIASES = {
  firstname: ['first name', 'firstname', 'given name', 'legal first name'],
  lastname: ['last name', 'lastname', 'family name', 'surname', 'legal last name'],
  fullname: ['full name', 'name', 'legal name', 'your name'],
  email: ['email', 'e-mail', 'email address'],
  phone: ['phone', 'mobile', 'telephone', 'phone number', 'contact number'],
  city: ['city', 'town'],
  state: ['state', 'province', 'region'],
  country: ['country'],
  postalcode: ['zip', 'postal', 'postal code', 'pincode', 'pin code'],
  linkedin: ['linkedin', 'linkedin url', 'linkedin profile'],
  currentcompany: ['current company', 'current employer', 'employer'],
  currenttitle: ['current title', 'job title', 'current role', 'position'],
  noticeperiod: ['notice period', 'notice'],
  expectedctc: ['expected salary', 'expected ctc', 'salary expectation', 'desired salary', 'expected compensation'],
  currentctc: ['current salary', 'current ctc', 'current compensation'],
  yearsofexperience: ['years of experience', 'total experience', 'experience'],
  requiresponsorshipindia: ['require sponsorship', 'need sponsorship', 'visa sponsorship', 'sponsorship'],
  authorizedtoworkinindia: ['authorized to work', 'legally authorized', 'work authorization', 'right to work'],
  whythiscompany: ['why do you want to work', 'why this company', 'why are you interested', 'motivation'],
  whythisrole: ['why this role', 'why are you a good fit', 'why should we'],
  shortbio: ['tell us about yourself', 'summary', 'about you', 'cover letter', 'additional information'],
};

var SENSITIVE_RE = /gender|race|ethnic|disab|veteran|lgbt|sexual orientation|pronoun|diversity|certify|i agree|i acknowledge|attest|consent|terms and conditions|privacy policy|accurate and complete/;

function normalize(s) { return (s || '').toLowerCase().replace(/\s+/g, ' ').trim(); }

function isSensitive(label) { return SENSITIVE_RE.test(normalize(label)); }

// Given a flat answers map and a field label, resolve the value to fill.
function valueForLabel(label, answers) {
  label = normalize(label);
  for (var key in ALIASES) {
    if (!answers[key]) continue;
    for (var i = 0; i < ALIASES[key].length; i++) {
      if (label.indexOf(ALIASES[key][i]) > -1) return answers[key];
    }
  }
  for (var k in answers) { if (label.indexOf(k) > -1) return answers[k]; }
  return null;
}

// Score how well an option's text matches a wanted value.
function optionScore(optText, want) {
  var o = normalize(optText), w = normalize(want);
  if (!o || /select|choose|^-+$/.test(o)) return 0;
  if (o === w) return 100;
  if (o.indexOf(w) > -1 || w.indexOf(o) > -1) return 60;
  var score = 0;
  w.split(' ').forEach(function (t) { if (t.length > 1 && o.indexOf(t) > -1) score += 10; });
  return score;
}

// Pick the best option text from a list for a wanted value (>=20 to accept).
function bestOption(optionTexts, want) {
  var best = null, bestScore = 0;
  optionTexts.forEach(function (t) {
    var s = optionScore(t, want);
    if (s > bestScore) { bestScore = s; best = t; }
  });
  return bestScore >= 20 ? best : null;
}

// Does an option label match a wanted Yes/No-ish value?
function radioMatches(optionLabel, want) {
  var o = normalize(optionLabel), w = normalize(want);
  if (o === w || w.indexOf(o) > -1 || o.indexOf(w) > -1) return true;
  if (/\byes\b/.test(w) && /\byes\b/.test(o)) return true;
  if (/\bno\b/.test(w) && /\bno\b/.test(o)) return true;
  return false;
}

module.exports = {
  ALIASES, normalize, isSensitive, valueForLabel, optionScore, bestOption, radioMatches,
};
