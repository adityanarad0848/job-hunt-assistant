/*
 * Autofill content script (runs INSIDE your own browser, only when YOU trigger it).
 *
 * This is NOT a bot. It does not log in, navigate, or submit. It fills the
 * visible fields of a form that YOU already opened, then stops so you can
 * review and submit yourself. Works on Workday, Greenhouse, Lever, and
 * generic forms by matching field labels/attributes to your vault answers.
 *
 * It is injected two ways (see build-bookmarklet.js):
 *   1) as a bookmarklet (click a bookmark), or
 *   2) pasted into the DevTools console.
 *
 * The vault object is injected as window.__JHA_VAULT__ by the builder.
 */
(function () {
  var V = window.__JHA_VAULT__;
  if (!V) { alert('Autofill: no vault loaded.'); return; }

  // Flatten vault sections into a label->value map, skipping comments and
  // anything still containing a <FILL / <optional placeholder.
  var answers = {};
  Object.keys(V).forEach(function (section) {
    if (section[0] === '_' || typeof V[section] !== 'object') return;
    Object.keys(V[section]).forEach(function (key) {
      if (key[0] === '_') return;
      var val = V[section][key];
      if (typeof val !== 'string') return;
      if (val.indexOf('<FILL') > -1 || val.indexOf('<optional') > -1) return;
      answers[key.toLowerCase()] = val;
    });
  });

  // Map many possible form-field names/labels to our vault keys.
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
    portfolio: ['portfolio', 'website', 'personal site'],
    github: ['github'],
    currentcompany: ['current company', 'current employer', 'company', 'employer'],
    currenttitle: ['current title', 'job title', 'current role', 'position'],
    noticeperiod: ['notice period', 'notice'],
    expectedctc: ['expected salary', 'expected ctc', 'salary expectation', 'desired salary', 'expected compensation'],
    currentctc: ['current salary', 'current ctc', 'current compensation'],
    yearsofexperience: ['years of experience', 'total experience', 'experience'],
    whythiscompany: ['why do you want to work', 'why this company', 'why are you interested', 'motivation'],
    whythisrole: ['why this role', 'why are you a good fit', 'why should we'],
    shortbio: ['tell us about yourself', 'summary', 'about you', 'cover letter', 'additional information']
  };

  function normalize(s) { return (s || '').toLowerCase().replace(/\s+/g, ' ').trim(); }

  // Find the human label associated with an input element.
  function labelFor(el) {
    var txt = '';
    if (el.id) {
      var l = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
      if (l) txt += ' ' + l.textContent;
    }
    if (el.getAttribute('aria-label')) txt += ' ' + el.getAttribute('aria-label');
    if (el.getAttribute('aria-labelledby')) {
      el.getAttribute('aria-labelledby').split(/\s+/).forEach(function (id) {
        var n = document.getElementById(id); if (n) txt += ' ' + n.textContent;
      });
    }
    if (el.placeholder) txt += ' ' + el.placeholder;
    if (el.name) txt += ' ' + el.name;
    // Walk up to a labelled wrapper (Workday uses data-automation-id labels).
    var p = el.closest('[data-automation-id], .field, .form-group, label');
    if (p) txt += ' ' + (p.getAttribute('data-automation-id') || '') + ' ' + (p.querySelector('label') ? p.querySelector('label').textContent : '');
    return normalize(txt);
  }

  // Resolve a vault value for a given field label.
  function valueForLabel(label) {
    for (var key in ALIASES) {
      if (!answers[key]) continue;
      var hit = ALIASES[key].some(function (a) { return label.indexOf(a) > -1; });
      if (hit) return answers[key];
    }
    // Direct key match fallback.
    for (var k in answers) { if (label.indexOf(k) > -1) return answers[k]; }
    return null;
  }

  function setValue(el, value) {
    var proto = el.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    var setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(el, value);
    // Fire events so React/Angular/Workday register the change.
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.style.outline = '2px solid #1f883d';
  }

  var filled = 0, skipped = 0;
  var inputs = document.querySelectorAll(
    'input[type=text], input[type=email], input[type=tel], input[type=url], input:not([type]), textarea'
  );
  inputs.forEach(function (el) {
    if (el.disabled || el.readOnly || el.offsetParent === null) return;
    if (el.value && el.value.trim()) return; // never overwrite what you already typed
    var val = valueForLabel(labelFor(el));
    if (val) { setValue(el, val); filled++; } else { skipped++; }
  });

  // A small, dismissable summary banner — and an explicit reminder.
  var bar = document.createElement('div');
  bar.style.cssText = 'position:fixed;z-index:2147483647;bottom:16px;left:50%;transform:translateX(-50%);background:#24292f;color:#fff;padding:12px 18px;border-radius:10px;font:14px -apple-system,Segoe UI,Roboto,Arial;box-shadow:0 4px 16px rgba(0,0,0,.3);max-width:90vw';
  bar.innerHTML = 'Autofill: filled <b>' + filled + '</b> field(s), skipped ' + skipped +
    '. <b>Review everything</b> (especially work authorization, salary, and any required dropdowns/attestations) before you submit. ' +
    '<span style="cursor:pointer;text-decoration:underline" onclick="this.parentElement.remove()">dismiss</span>';
  document.body.appendChild(bar);
})();
