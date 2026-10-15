// Offline unit tests for the autofill matching rules (no DOM, no network).
// Run: node autofill/matcher.test.js
const m = require('./matcher');
const assert = require('assert');

let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log(`  ✓ ${name}`); }
  catch (e) { fail++; console.log(`  ✗ ${name}\n      ${e.message}`); }
}

const answers = {
  firstname: 'Aditya', lastname: 'Narad', email: 'a@b.com', phone: '+91 123',
  city: 'Pune', country: 'India', noticeperiod: '60 days',
  expectedctc: '45 LPA', yearsofexperience: '11+',
  requiresponsorshipindia: 'No', authorizedtoworkinindia: 'Yes',
  whythiscompany: 'Because platform scale.',
};

console.log('\nmatcher — label resolution');
t('first name field -> firstname', () => assert.equal(m.valueForLabel('First Name', answers), 'Aditya'));
t('legal first name -> firstname', () => assert.equal(m.valueForLabel('Legal First Name', answers), 'Aditya'));
t('email address -> email', () => assert.equal(m.valueForLabel('Email Address', answers), 'a@b.com'));
t('mobile -> phone', () => assert.equal(m.valueForLabel('Mobile Number', answers), '+91 123'));
t('notice period -> noticeperiod', () => assert.equal(m.valueForLabel('What is your notice period?', answers), '60 days'));
t('expected salary -> expectedctc', () => assert.equal(m.valueForLabel('Expected Salary', answers), '45 LPA'));
t('authorized to work -> yes', () => assert.equal(m.valueForLabel('Are you legally authorized to work?', answers), 'Yes'));
t('require sponsorship -> no', () => assert.equal(m.valueForLabel('Will you require visa sponsorship?', answers), 'No'));
t('unknown field -> null', () => assert.equal(m.valueForLabel('Favourite colour', answers), null));

console.log('\nmatcher — sensitive detection (must be left for the human)');
['Gender', 'Race / Ethnicity', 'Disability Status', 'Veteran Status',
 'I certify the above is true', 'I agree to the terms and conditions',
 'Please confirm the information is accurate and complete'
].forEach((s) => t(`sensitive: "${s}"`, () => assert.equal(m.isSensitive(s), true)));
['First Name', 'Notice Period', 'Expected Salary'].forEach((s) =>
  t(`NOT sensitive: "${s}"`, () => assert.equal(m.isSensitive(s), false)));

console.log('\nmatcher — <select> option picking');
t('country select picks India', () =>
  assert.equal(m.bestOption(['Select...', 'United States', 'India', 'Canada'], 'India'), 'India'));
t('authorized select picks Yes variant', () =>
  assert.equal(m.bestOption(['Please select', 'Yes', 'No'], 'Yes'), 'Yes'));
t('experience picks closest bucket', () =>
  assert.ok(['11+ years', '10+ years'].includes(
    m.bestOption(['1-3 years', '4-6 years', '10+ years', '11+ years'], '11+'))));
t('no reasonable match -> null', () =>
  assert.equal(m.bestOption(['Red', 'Green', 'Blue'], 'India'), null));
t('placeholder never chosen', () =>
  assert.equal(m.bestOption(['-- Select --', 'Choose one'], 'India'), null));

console.log('\nmatcher — radio Yes/No matching');
t('want No matches "No" option', () => assert.equal(m.radioMatches('No', 'No'), true));
t('want No matches "No, I do not" option', () => assert.equal(m.radioMatches('No, I do not require sponsorship', 'No'), true));
t('want Yes does NOT match "No"', () => assert.equal(m.radioMatches('No', 'Yes'), false));
t('exact phrase matches', () => assert.equal(m.radioMatches('Yes — Indian citizen', 'Yes — Indian citizen'), true));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
