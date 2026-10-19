/* ============================================================================
 * LSDS Admin - New training application form
 * ========================================================================== */
(function (window, document) {
  'use strict';

  var LSDS = window.LSDS;
  var ui = LSDS.ui;

  var TYPE_OPTIONS = [
    { v: 'professional_workshop', l: 'Professional Workshop' },
    { v: 'technical_seminar', l: 'Technical Seminar' },
    { v: 'professional_certification', l: 'Professional Certification' },
    { v: 'national_training', l: 'National Training' },
    { v: 'international_training', l: 'International Training' },
    { v: 'national_conference', l: 'National Conference' },
    { v: 'international_conference', l: 'International Conference' },
    { v: 'academic_conference', l: 'Academic Conference' },
    { v: 'other', l: 'Other' }
  ];
  var SCOPE_OPTIONS = [
    { v: 'national', l: 'National (within Nigeria)' },
    { v: 'international', l: 'International' }
  ];
  var CURRENCY_OPTIONS = [
    { v: 'NGN', l: 'NGN \u2014 Naira' },
    { v: 'USD', l: 'USD \u2014 US Dollar' },
    { v: 'GBP', l: 'GBP \u2014 Pound Sterling' },
    { v: 'EUR', l: 'EUR \u2014 Euro' }
  ];
  var COST_TYPE_OPTIONS = [
    { v: 'registration_tuition', l: 'Registration & Tuition' },
    { v: 'transportation', l: 'Transportation' },
    { v: 'accommodation', l: 'Accommodation' },
    { v: 'daily_allowance', l: 'Daily Allowance' },
    { v: 'other', l: 'Other Expenses' }
  ];

  var user = null;
  var departments = [];
  var saving = false;

  /* --- Field helpers ------------------------------------------------------ */
  function optionsHtml(list, current) {
    return list.map(function (o) {
      var v = o && o.v != null ? o.v : o;
      var l = o && o.l != null ? o.l : o;
      return '<option value="' + ui.escapeHtml(v) + '"' + (String(v) === String(current) ? ' selected' : '') + '>' +
        ui.escapeHtml(l) + '</option>';
    }).join('');
  }

  function control(f) {
    var id = 'nf-' + f.name;
    var val = f.value == null ? '' : f.value;
    var attrs = ' id="' + id + '" name="' + f.name + '" data-field="' + f.name + '"';
    if (f.type === 'textarea') {
      return '<textarea class="textarea"' + attrs + ' rows="' + (f.rows || 3) + '"' +
        (f.placeholder ? ' placeholder="' + ui.escapeHtml(f.placeholder) + '"' : '') + '>' + ui.escapeHtml(val) + '</textarea>';
    }
    if (f.type === 'select') {
      return '<select class="select"' + attrs + '>' + optionsHtml(f.options || [], val) + '</select>';
    }
    var extra = '';
    if (f.type === 'number') {
      extra += ' min="' + (f.min != null ? f.min : 0) + '" step="' + (f.step != null ? f.step : '0.01') + '"';
    }
    return '<input class="input"' + attrs + ' type="' + (f.type || 'text') + '" value="' + ui.escapeHtml(val) + '"' +
      (f.placeholder ? ' placeholder="' + ui.escapeHtml(f.placeholder) + '"' : '') + extra + '>';
  }

  function field(f) {
    return '<div class="field' + (f.half ? '' : ' span-2') + '">' +
      '<label class="label" for="nf-' + f.name + '">' + ui.escapeHtml(f.label) +
        (f.required ? ' <b style="color:var(--red-600)">*</b>' : '') + '</label>' +
      control(f) +
      (f.hint ? '<div class="help">' + ui.escapeHtml(f.hint) + '</div>' : '') +
    '</div>';
  }

  function costRow(item) {
    item = item || {};
    return '<div class="cost-row" data-row style="display:grid;grid-template-columns:1.3fr 2fr 1fr auto;gap:8px;align-items:center;margin-bottom:8px">' +
      '<select class="select" data-cost="item_type">' + optionsHtml(COST_TYPE_OPTIONS, item.item_type || 'registration_tuition') + '</select>' +
      '<input class="input" type="text" data-cost="description" placeholder="Description (optional)" value="' + ui.escapeHtml(item.description || '') + '">' +
      '<input class="input" type="number" min="0" step="0.01" data-cost="amount" placeholder="0.00" value="' + ui.escapeHtml(item.amount != null ? item.amount : '') + '">' +
      '<button type="button" class="icon-btn" data-remove aria-label="Remove line">' + ui.icon('x', '') + '</button>' +
    '</div>';
  }

  /* --- Shell -------------------------------------------------------------- */
  function shell() {
    var currency = 'NGN';
    document.getElementById('page-content').innerHTML =
      '<div class="page-head">' +
        '<div>' +
          '<a class="link-strong" href="applications.html" style="display:inline-flex;align-items:center;gap:6px;margin-bottom:10px">' +
            'Back to applications</a>' +
          '<h1>New Training Application</h1>' +
          '<p class="sub">Request sponsorship for a national or international training, conference or workshop.</p>' +
        '</div>' +
        '<div class="page-actions">' +
          '<button class="btn btn-secondary" id="nf-draft">' + ui.icon('fileText', '') + 'Save draft</button>' +
          '<button class="btn btn-primary" id="nf-submit">' + ui.icon('check', '') + 'Submit for review</button>' +
        '</div>' +
      '</div>' +

      '<form class="lsds-form" id="nf-form" novalidate>' +
        '<div class="form-error hidden" id="nf-error"></div>' +

        '<div class="card"><div class="card-head"><h3>Applicant &amp; department</h3></div><div class="card-body">' +
          '<div class="person" style="margin-bottom:18px"><span class="avatar lg">' + ui.escapeHtml(ui.initials(user.name)) + '</span>' +
            '<div><div class="p-name">' + ui.escapeHtml(user.name) + '</div>' +
            '<div class="p-sub">' + ui.escapeHtml(user.designation || 'Staff') + '</div></div></div>' +
          '<div class="form-grid">' +
            field({ name: 'department_code', label: 'Department', type: 'select', half: true, required: true, options: [{ v: '', l: 'Select department\u2026' }] }) +
            field({ name: 'application_type', label: 'Application type', type: 'select', half: true, required: true, value: 'professional_workshop', options: TYPE_OPTIONS }) +
            field({ name: 'scope', label: 'Scope', type: 'select', half: true, required: true, value: 'national', options: SCOPE_OPTIONS }) +
            field({ name: 'supervisor_user_id', label: 'Line manager (optional)', type: 'number', half: true, placeholder: 'Leave blank to use department manager' }) +
          '</div>' +
        '</div></div>' +

        '<div class="card" style="margin-top:18px"><div class="card-head"><h3>Programme details</h3></div><div class="card-body">' +
          '<div class="form-grid">' +
            field({ name: 'programme_title', label: 'Programme title', required: true, placeholder: 'e.g. Advanced Data Analytics for Public Sector Leaders' }) +
            field({ name: 'training_provider', label: 'Training provider', half: true, required: true, placeholder: 'e.g. Lagos Business School' }) +
            field({ name: 'programme_website', label: 'Programme website', half: true, placeholder: 'https://\u2026' }) +
            field({ name: 'country', label: 'Country', half: true, value: 'Nigeria' }) +
            field({ name: 'venue', label: 'Venue / city', half: true, placeholder: 'e.g. Victoria Island, Lagos' }) +
            field({ name: 'start_date', label: 'Start date', type: 'date', half: true, required: true }) +
            field({ name: 'end_date', label: 'End date', type: 'date', half: true, required: true }) +
            field({ name: 'registration_deadline', label: 'Registration deadline', type: 'date', half: true }) +
          '</div>' +
        '</div></div>' +

        '<div class="card" style="margin-top:18px"><div class="card-head"><h3>Justification &amp; objectives</h3></div><div class="card-body">' +
          '<div class="form-grid">' +
            field({ name: 'programme_objectives', label: 'Programme objectives', type: 'textarea', rows: 3, placeholder: 'What will the programme cover?' }) +
            field({ name: 'skills_to_acquire', label: 'Skills to acquire', type: 'textarea', rows: 3, placeholder: 'One skill per line, or comma separated' }) +
            field({ name: 'relevance_to_duties', label: 'Relevance to current duties', type: 'textarea', rows: 3 }) +
            field({ name: 'departmental_benefits', label: 'Departmental benefits', type: 'textarea', rows: 3 }) +
          '</div>' +
        '</div></div>' +

        '<div class="card" style="margin-top:18px"><div class="card-head"><h3>Financial</h3></div><div class="card-body">' +
          '<div class="form-grid">' +
            field({ name: 'currency', label: 'Currency', type: 'select', half: true, value: currency, options: CURRENCY_OPTIONS }) +
            field({ name: 'requested_amount', label: 'Requested amount', type: 'number', half: true, required: true, placeholder: '0.00' }) +
            field({ name: 'estimated_total_cost', label: 'Estimated total cost (incl. incidentals)', type: 'number', half: true, hint: 'Leave blank to estimate automatically (+5%).' }) +
            field({ name: 'funding_justification', label: 'Funding justification', type: 'textarea', rows: 3 }) +
          '</div>' +
          '<div class="section-title" style="margin-top:6px">Cost breakdown</div>' +
          '<div id="cost-rows" class="cost-rows"></div>' +
          '<button type="button" class="btn btn-secondary" id="cost-add" style="margin-top:10px">' + ui.icon('plus', '') + 'Add cost line</button>' +
        '</div></div>' +

        '<div class="card" style="margin-top:18px"><div class="card-head"><h3>Post-training</h3></div><div class="card-body">' +
          '<div class="form-grid">' +
            field({ name: 'post_training_knowledge_sharing', label: 'Knowledge sharing plan', type: 'textarea', rows: 3, placeholder: 'How will you share what you learn?' }) +
            field({ name: 'post_training_report_plan', label: 'Report plan', type: 'textarea', rows: 3, placeholder: 'What report will you submit?' }) +
            field({ name: 'expected_organizational_benefits', label: 'Expected organisational benefits', type: 'textarea', rows: 3 }) +
            field({ name: 'submission_comments', label: 'Submission note (optional)', type: 'textarea', rows: 2, placeholder: 'Add a note for the first reviewer' }) +
          '</div>' +
        '</div></div>' +

        '<div class="form-actions" style="margin-top:20px;display:flex;gap:10px;justify-content:flex-end">' +
          '<a class="btn btn-secondary" href="applications.html">Cancel</a>' +
          '<button type="button" class="btn btn-secondary" id="nf-draft2">' + ui.icon('fileText', '') + 'Save draft</button>' +
          '<button type="submit" class="btn btn-primary" id="nf-submit2">' + ui.icon('check', '') + 'Submit for review</button>' +
        '</div>' +
      '</form>';
  }

  /* --- Cost rows ---------------------------------------------------------- */
  function addCostRow(item) {
    var host = ui.qs('#cost-rows');
    var wrap = ui.el('div', {}, costRow(item));
    var row = wrap.firstChild;
    host.appendChild(row);
  }
  function collectCosts() {
    var rows = [];
    ui.qsa('#cost-rows [data-row]').forEach(function (row) {
      var amount = row.querySelector('[data-cost="amount"]').value;
      var type = row.querySelector('[data-cost="item_type"]').value;
      var desc = row.querySelector('[data-cost="description"]').value;
      if ((amount === '' || Number(amount) === 0) && !desc) return;
      rows.push({ item_type: type, description: desc, amount: Number(amount) || 0, currency: ui.qs('[data-field="currency"]').value });
    });
    return rows;
  }

  /* --- Form IO ------------------------------------------------------------ */
  function readValues() {
    var values = {};
    ui.qsa('#nf-form [data-field]').forEach(function (el) {
      values[el.getAttribute('data-field')] = el.value;
    });
    return values;
  }

  function showError(msg) {
    var box = ui.qs('#nf-error');
    box.textContent = msg;
    box.classList.remove('hidden');
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function clearError() { ui.qs('#nf-error').classList.add('hidden'); }

  function validate(isDraft) {
    var v = readValues();
    if (!v.programme_title.trim()) return 'Programme title is required.';
    if (isDraft) return null;
    if (!v.department_code) return 'Please choose a department.';
    if (!v.training_provider.trim()) return 'Training provider is required.';
    if (!v.start_date || !v.end_date) return 'Start and end dates are required.';
    if (v.end_date < v.start_date) return 'End date cannot be before the start date.';
    if (v.requested_amount === '' || Number(v.requested_amount) < 0) return 'A valid requested amount is required.';
    return null;
  }

  function submit(isDraft) {
    if (saving) return;
    clearError();
    var err = validate(isDraft);
    if (err) { showError(err); return; }

    var v = readValues();
    var payload = {
      programme_title: v.programme_title.trim(),
      application_type: v.application_type,
      scope: v.scope,
      department_code: v.department_code || undefined,
      supervisor_user_id: v.supervisor_user_id || undefined,
      training_provider: v.training_provider.trim(),
      programme_website: v.programme_website.trim() || undefined,
      country: v.country.trim() || undefined,
      venue: v.venue.trim() || undefined,
      start_date: v.start_date || undefined,
      end_date: v.end_date || undefined,
      registration_deadline: v.registration_deadline || undefined,
      programme_objectives: v.programme_objectives.trim() || undefined,
      skills_to_acquire: v.skills_to_acquire.trim() || undefined,
      relevance_to_duties: v.relevance_to_duties.trim() || undefined,
      departmental_benefits: v.departmental_benefits.trim() || undefined,
      estimated_total_cost: v.estimated_total_cost !== '' ? Number(v.estimated_total_cost) : undefined,
      requested_amount: v.requested_amount !== '' ? Number(v.requested_amount) : undefined,
      currency: v.currency,
      funding_justification: v.funding_justification.trim() || undefined,
      post_training_knowledge_sharing: v.post_training_knowledge_sharing.trim() || undefined,
      post_training_report_plan: v.post_training_report_plan.trim() || undefined,
      expected_organizational_benefits: v.expected_organizational_benefits.trim() || undefined,
      submission_comments: v.submission_comments.trim() || undefined,
      cost_items: collectCosts(),
      status: isDraft ? 'draft' : 'submitted'
    };

    saving = true;
    setBusy(true);
    LSDS.api.applications.create(payload).then(function (created) {
      ui.toast({ type: 'success', title: isDraft ? 'Draft saved' : 'Application submitted',
        message: (created.reference_no || 'The application') + (isDraft ? ' saved as a draft.' : ' is now in the approval queue.') });
      window.location.href = 'application.html?id=' + created.id;
    }).catch(function (e) {
      saving = false;
      setBusy(false);
      showError((e && e.message) || 'Could not save the application. Please try again.');
    });
  }

  function setBusy(on) {
    ['#nf-draft', '#nf-submit', '#nf-draft2', '#nf-submit2'].forEach(function (sel) {
      var b = ui.qs(sel);
      if (b) b.disabled = on;
    });
    var submit = ui.qs('#nf-submit2');
    if (submit) submit.innerHTML = on ? ui.icon('clock', '') + 'Saving\u2026' : ui.icon('check', '') + 'Submit for review';
  }

  /* --- Wiring ------------------------------------------------------------- */
  function loadDepartments() {
    return LSDS.api.departments.list().then(function (res) {
      departments = res.data || [];
      var sel = ui.qs('[data-field="department_code"]');
      var preferred = user.department_code;
      if (!preferred && user.department) {
        var m = departments.filter(function (d) { return d.name === user.department; })[0];
        preferred = m ? m.code : null;
      }
      departments.forEach(function (d) {
        var o = document.createElement('option');
        o.value = d.code;
        o.textContent = d.name;
        if (d.code === preferred) o.selected = true;
        sel.appendChild(o);
      });
    }).catch(function () {});
  }

  function wire() {
    ui.qs('#cost-add').addEventListener('click', function () { addCostRow(); });
    ui.qs('#cost-rows').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-remove]');
      if (btn) btn.closest('[data-row]').remove();
    });
    ui.qs('#nf-submit').addEventListener('click', function () { submit(false); });
    ui.qs('#nf-draft').addEventListener('click', function () { submit(true); });
    ui.qs('#nf-submit2').addEventListener('click', function () { submit(false); });
    ui.qs('#nf-draft2').addEventListener('click', function () { submit(true); });
    ui.qs('#nf-form').addEventListener('submit', function (e) { e.preventDefault(); submit(false); });
  }

  function init() {
    user = LSDS.layout.init({ active: 'applications', title: 'New Application' });
    if (!user) return;
    shell();
    addCostRow();
    wire();
    loadDepartments();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
