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
  var M = window.__JHA_MATCHER__; // tested matching rules, injected by the builder
  if (!V || !M) { alert('Autofill: vault/matcher not loaded.'); return; }

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

  var normalize = M.normalize;

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

  // Resolve a vault value for a given field label (delegates to tested rules).
  function valueForLabel(label) { return M.valueForLabel(label, answers); }

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

  // DELIBERATELY SKIP legally-sensitive controls — these are yours to answer.
  // EEO/diversity questions and "I certify/agree" attestations are left untouched
  // and reported so you handle them yourself. (Rule lives in matcher.js, tested.)
  var isSensitive = M.isSensitive;

  var filled = 0, skipped = 0, sensitive = 0;

  // ---- Text / email / phone / url / textarea ----
  var inputs = document.querySelectorAll(
    'input[type=text], input[type=email], input[type=tel], input[type=url], input:not([type]), textarea'
  );
  inputs.forEach(function (el) {
    if (el.disabled || el.readOnly || el.offsetParent === null) return;
    if (el.value && el.value.trim()) return; // never overwrite what you already typed
    var label = labelFor(el);
    if (isSensitive(label)) { sensitive++; return; }
    var val = valueForLabel(label);
    if (val) { setValue(el, val); filled++; } else { skipped++; }
  });

  // ---- Native <select> dropdowns ----
  // Pick the option whose text best matches the vault value (tested rule).
  function selectBestOption(sel, want) {
    var texts = [].map.call(sel.options, function (o) { return o.textContent; });
    var bestText = M.bestOption(texts, want);
    if (bestText === null) return false;
    for (var i = 0; i < sel.options.length; i++) {
      if (normalize(sel.options[i].textContent) === normalize(bestText)) {
        sel.value = sel.options[i].value;
        sel.dispatchEvent(new Event('input', { bubbles: true }));
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        sel.style.outline = '2px solid #1f883d';
        return true;
      }
    }
    return false;
  }
  document.querySelectorAll('select').forEach(function (sel) {
    if (sel.disabled || sel.offsetParent === null) return;
    if (sel.value && sel.selectedIndex > 0) return; // already chosen
    var label = labelFor(sel);
    if (isSensitive(label)) { sensitive++; return; }
    var val = valueForLabel(label);
    if (val && selectBestOption(sel, val)) filled++; else skipped++;
  });

  // ---- Radio groups and standalone checkboxes (Yes/No questions) ----
  // Group radios by name, resolve a vault value for the group's label, then
  // click the radio whose own label text matches that value (e.g. "No").
  function groupLabel(radio) {
    // Prefer a fieldset/legend or a container label over the radio's own tiny label.
    var fs = radio.closest('fieldset');
    var txt = '';
    if (fs) { var lg = fs.querySelector('legend'); if (lg) txt += ' ' + lg.textContent; }
    var container = radio.closest('[role=group], .field, .form-group, [data-automation-id]');
    if (container) txt += ' ' + (container.getAttribute('data-automation-id') || '');
    return normalize(txt + ' ' + labelFor(radio));
  }
  function optionLabel(radio) {
    if (radio.id) {
      var l = document.querySelector('label[for="' + CSS.escape(radio.id) + '"]');
      if (l) return normalize(l.textContent);
    }
    var p = radio.closest('label');
    if (p) return normalize(p.textContent);
    return normalize(radio.value);
  }
  var seenGroups = {};
  document.querySelectorAll('input[type=radio]').forEach(function (radio) {
    var name = radio.name || radio.id;
    if (!name || seenGroups[name]) return;
    seenGroups[name] = true;
    var group = document.querySelectorAll('input[type=radio][name="' + CSS.escape(radio.name || '') + '"]');
    if (!group.length) group = [radio];
    if ([].some.call(group, function (r) { return r.checked; })) return; // already answered
    var label = groupLabel(radio);
    if (isSensitive(label)) { sensitive++; return; }
    var want = valueForLabel(label);
    if (!want) { skipped++; return; }
    var picked = null;
    [].forEach.call(group, function (r) {
      if (!picked && M.radioMatches(optionLabel(r), want)) picked = r;
    });
    if (picked) {
      picked.checked = true;
      picked.dispatchEvent(new Event('click', { bubbles: true }));
      picked.dispatchEvent(new Event('change', { bubbles: true }));
      var pl = picked.closest('label') || picked.parentElement;
      if (pl) pl.style.outline = '2px solid #1f883d';
      filled++;
    } else { skipped++; }
  });

  // A small, dismissable summary banner — and an explicit reminder.
  var bar = document.createElement('div');
  bar.style.cssText = 'position:fixed;z-index:2147483647;bottom:16px;left:50%;transform:translateX(-50%);background:#24292f;color:#fff;padding:12px 18px;border-radius:10px;font:14px -apple-system,Segoe UI,Roboto,Arial;box-shadow:0 4px 16px rgba(0,0,0,.3);max-width:90vw';
  bar.innerHTML = 'Autofill: filled <b>' + filled + '</b> field(s), skipped ' + skipped +
    ', left <b>' + sensitive + '</b> sensitive field(s) for you. ' +
    '<b>Review everything</b> — especially work authorization, salary, EEO questions, and any "I certify" attestations — before you submit. ' +
    '<span style="cursor:pointer;text-decoration:underline" onclick="this.parentElement.remove()">dismiss</span>';
  document.body.appendChild(bar);
})();
