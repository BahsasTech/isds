/* ============================================================================
 * LSDS Admin - Application detail & approval workflow
 * ========================================================================== */
(function (window, document) {
  'use strict';

  var LSDS = window.LSDS;
  var ui = LSDS.ui;

  var STAGE_LABELS = {
    principal_manager: 'Principal Manager Review',
    agm: 'Assistant General Manager Review',
    gm: 'General Manager Review',
    learning_development: 'Learning and Development Review',
    finance_review: 'Financial Review',
    disbursement: 'Disbursement'
  };
  var STAGE_ROLE = {
    principal_manager: 'principal_manager', agm: 'agm', gm: 'gm',
    learning_development: 'ld_officer', finance_review: 'finance_officer', disbursement: 'finance_officer'
  };
  var COST_LABELS = {
    registration_tuition: 'Registration & Tuition', transportation: 'Transportation',
    accommodation: 'Accommodation', daily_allowance: 'Daily Allowance', other: 'Other Expenses'
  };
  var DOC_LABELS = {
    invitation_letter: 'Invitation Letter', programme_brochure: 'Programme Brochure',
    provider_quotation: 'Provider Quotation', cost_breakdown: 'Cost Breakdown'
  };
  var ACTION_META = {
    submitted: { cls: '', icon: 'fileText', label: 'Submitted' },
    approved: { cls: 'done', icon: 'check', label: 'Approved' },
    rejected: { cls: 'reject', icon: 'x', label: 'Rejected' },
    returned: { cls: 'reject', icon: 'refresh', label: 'Returned for correction' }
  };

  var app = null;
  var user = null;
  var canDecide = false;

  function formatBytes(n) {
    if (!n) return '\u2014';
    var units = ['B', 'KB', 'MB', 'GB'], i = 0;
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
    return (i ? n.toFixed(1) : n) + ' ' + units[i];
  }
  function money(n) { return ui.formatCurrency(n); }

  function decideRole() {
    if (!app || !app.status) return null;
    var key = LSDS.data.stageKeyForStatus(app.status);
    return key ? STAGE_ROLE[key] : null;
  }
  function isPending() {
    return ['submitted', 'pending_principal_manager', 'pending_agm', 'pending_gm',
      'pending_learning_development', 'pending_financial_review'].indexOf(app.status) !== -1;
  }

  /* --- Sections ----------------------------------------------------------- */
  function headSection() {
    var actions = '';
    if (canDecide) {
      actions =
        '<button class="btn btn-secondary" id="act-return">' + ui.icon('refresh', '') + 'Return</button>' +
        '<button class="btn btn-danger" id="act-reject">' + ui.icon('x', '') + 'Reject</button>' +
        '<button class="btn btn-primary" id="act-approve">' + ui.icon('check', '') + 'Approve</button>';
    }
    return '<div class="page-head">' +
      '<div>' +
        '<a class="link-strong" href="applications.html" style="display:inline-flex;align-items:center;gap:6px;margin-bottom:10px">' +
          'Back to applications</a>' +
        '<h1 style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">' + ui.escapeHtml(app.reference_no) + ' ' + ui.badge(app.status) + '</h1>' +
        '<p class="sub">' + ui.escapeHtml(app.programme_title) + ' &middot; ' + ui.escapeHtml(app.training_provider) + '</p>' +
      '</div>' +
      (actions ? '<div class="page-actions">' + actions + '</div>' : '') +
    '</div>';
  }

  function programmeCard() {
    var rows = [
      ['Programme', app.programme_title],
      ['Type', ui.titleCase(app.application_type)],
      ['Provider', app.training_provider],
      ['Scope', ui.titleCase(app.scope)],
      ['Country', app.country],
      ['Venue', app.venue],
      ['Start date', ui.formatDate(app.start_date)],
      ['End date', ui.formatDate(app.end_date)],
      ['Registration deadline', ui.formatDate(app.registration_deadline)],
      ['Website', app.programme_website ? '<a class="link-strong" href="' + ui.escapeHtml(app.programme_website) + '" target="_blank" rel="noopener">' + ui.escapeHtml(app.programme_website.replace(/^https?:\/\//, '')) + '</a>' : '\u2014']
    ];
    return '<div class="card"><div class="card-head"><h3>Programme details</h3></div>' +
      '<div class="card-body"><dl class="kv">' +
      rows.map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + (r[1] || '\u2014') + '</dd>'; }).join('') +
      '</dl></div></div>';
  }

  function narrativeCard() {
    var skills = (app.skills_to_acquire || []).map(function (s) { return '<span class="badge badge-sky">' + ui.escapeHtml(s) + '</span>'; }).join('');
    return '<div class="card"><div class="card-head"><h3>Justification &amp; objectives</h3></div><div class="card-body stack-sm">' +
      '<div><div class="section-title">Objectives</div><p class="prose">' + ui.escapeHtml(app.programme_objectives) + '</p></div>' +
      '<div><div class="section-title">Skills to acquire</div><div class="chips">' + skills + '</div></div>' +
      '<div><div class="section-title">Relevance to duties</div><p class="prose">' + ui.escapeHtml(app.relevance_to_duties) + '</p></div>' +
      '<div><div class="section-title">Departmental benefits</div><p class="prose">' + ui.escapeHtml(app.departmental_benefits) + '</p></div>' +
      '<div><div class="section-title">Funding justification</div><p class="prose">' + ui.escapeHtml(app.funding_justification) + '</p></div>' +
      '<div><div class="section-title">Knowledge sharing plan</div><p class="prose">' + ui.escapeHtml(app.post_training_knowledge_sharing) + '</p></div>' +
      '</div></div>';
  }

  function costCard() {
    var items = app.cost_items || [];
    var body = items.map(function (c) {
      return '<tr><td>' + ui.escapeHtml(COST_LABELS[c.item_type] || ui.titleCase(c.item_type)) + '</td>' +
        '<td class="text-right">' + money(c.amount) + '</td></tr>';
    }).join('');
    return '<div class="card"><div class="card-head"><h3>Cost breakdown</h3>' +
      '<span class="badge badge-green">' + money(app.requested_amount) + '</span></div>' +
      '<div class="table-wrap"><table class="data"><thead><tr><th>Item</th><th class="text-right">Amount</th></tr></thead>' +
      '<tbody>' + body +
      '<tr><td style="font-weight:650">Total requested</td><td class="text-right" style="font-weight:700">' + money(app.requested_amount) + '</td></tr>' +
      '<tr><td class="muted">Estimated total (incl. incidentals)</td><td class="text-right muted">' + money(app.estimated_total_cost) + '</td></tr>' +
      '</tbody></table></div></div>';
  }

  function timelineCard() {
    var actions = (app.approval_actions || []).slice();
    var items = actions.map(function (a) {
      var meta = ACTION_META[a.decision] || ACTION_META.submitted;
      return '<div class="tl-item">' +
        '<span class="tl-dot ' + meta.cls + '">' + ui.icon(meta.icon, '') + '</span>' +
        '<div class="tl-body">' +
          '<div class="t">' + ui.escapeHtml(meta.label) + ' \u2014 ' + ui.escapeHtml(a.reviewer_name || '') + '</div>' +
          '<div class="s">' + ui.escapeHtml(ui.titleCase(a.reviewer_role_key || '')) + ' &middot; ' + ui.formatDateTime(a.acted_at) + '</div>' +
          (a.comments ? '<div class="tl-comment">' + ui.escapeHtml(a.comments) + '</div>' : '') +
        '</div></div>';
    });
    if (isPending()) {
      items.push('<div class="tl-item">' +
        '<span class="tl-dot current">' + ui.icon('clock', '') + '</span>' +
        '<div class="tl-body"><div class="t">Awaiting ' + ui.escapeHtml(STAGE_LABELS[app.current_stage_key] || 'review') + '</div>' +
        '<div class="s">With ' + ui.escapeHtml(app.pending_reviewer_name || 'the next reviewer') + '</div></div></div>');
    }
    return '<div class="card"><div class="card-head"><h3>Approval history</h3></div><div class="card-body">' +
      (items.length ? '<div class="timeline">' + items.join('') + '</div>' : '<p class="muted">No workflow activity yet.</p>') +
      '</div></div>';
  }

  function applicantCard() {
    return '<div class="card"><div class="card-head"><h3>Applicant</h3></div><div class="card-body stack-sm">' +
      '<div class="person"><span class="avatar lg">' + ui.escapeHtml(ui.initials(app.applicant_name)) + '</span>' +
        '<div><div class="p-name">' + ui.escapeHtml(app.applicant_name) + '</div>' +
        '<div class="p-sub">' + ui.escapeHtml(app.applicant_designation) + '</div></div></div>' +
      '<dl class="kv">' +
        '<dt>Department</dt><dd>' + ui.escapeHtml(app.department) + '</dd>' +
        '<dt>Email</dt><dd>' + ui.escapeHtml(app.applicant_email) + '</dd>' +
        '<dt>Line manager</dt><dd>' + ui.escapeHtml(app.supervisor_name || '\u2014') + '</dd>' +
        '<dt>Submitted</dt><dd>' + ui.formatDateTime(app.submitted_at) + '</dd>' +
        '<dt>Last updated</dt><dd>' + ui.formatDateTime(app.updated_at) + '</dd>' +
      '</dl></div></div>';
  }

  function financialCard() {
    if (!app.financial) return '';
    var f = app.financial;
    var rows = [
      ['Approved amount', money(f.approved_amount)],
      ['Financial status', ui.badge(f.financial_status || 'authorized')],
      ['Cost centre', f.cost_centre || '\u2014'],
      ['Budget reference', f.budget_reference || '\u2014'],
      ['Authorized by', f.authorized_by_name || '\u2014'],
      ['Authorized on', f.authorized_at ? ui.formatDate(f.authorized_at) : '\u2014']
    ];
    var disb = (app.disbursements || []).map(function (d) {
      return '<div class="money-row"><span class="m-label">' + ui.escapeHtml(d.payment_reference) + ' &middot; ' + ui.formatDate(d.payment_date) + '</span>' +
        '<span class="m-value">' + money(d.amount) + '</span></div>';
    }).join('');
    return '<div class="card"><div class="card-head"><h3>Financial</h3></div><div class="card-body">' +
      rows.map(function (r) { return '<div class="money-row"><span class="m-label">' + r[0] + '</span><span class="m-value">' + r[1] + '</span></div>'; }).join('') +
      (disb ? '<div class="section-title" style="margin-top:16px">Disbursements</div>' + disb : '') +
      '</div></div>';
  }

  function documentsCard() {
    var docs = app.documents || [];
    var body;
    if (!docs.length) {
      body = '<p class="muted">No documents attached.</p>';
    } else {
      body = docs.map(function (d) {
        return '<div class="doc-row">' +
          '<span class="doc-ico">' + ui.icon('fileText', '') + '</span>' +
          '<div class="doc-main"><div class="t">' + ui.escapeHtml(DOC_LABELS[d.doc_type] || ui.titleCase(d.doc_type)) + '</div>' +
            '<div class="s muted">' + ui.escapeHtml(d.original_file_name) + ' &middot; ' + formatBytes(d.file_size_bytes) + '</div></div>' +
          '<span class="badge badge-' + (d.scan_status === 'clean' ? 'green' : 'amber') + '">' + ui.escapeHtml(ui.titleCase(d.scan_status)) + '</span>' +
        '</div>';
      }).join('');
    }
    return '<div class="card"><div class="card-head"><h3>Documents <span class="muted">(' + docs.length + ')</span></h3></div>' +
      '<div class="card-body">' + body + '</div></div>';
  }

  function render() {
    canDecide = isPending() && !!decideRole() && (user.roles.indexOf(decideRole()) !== -1 || user.roles.indexOf('sysadmin') !== -1);
    document.getElementById('page-content').innerHTML =
      headSection() +
      '<div class="detail-grid">' +
        '<div class="stack">' + programmeCard() + narrativeCard() + costCard() + timelineCard() + '</div>' +
        '<div class="stack">' + applicantCard() + financialCard() + documentsCard() + '</div>' +
      '</div>';

    if (canDecide) {
      ui.qs('#act-approve').addEventListener('click', function () { openDecision('approve'); });
      ui.qs('#act-return').addEventListener('click', function () { openDecision('return'); });
      ui.qs('#act-reject').addEventListener('click', function () { openDecision('reject'); });
    }
  }

  function openDecision(kind) {
    var titles = { approve: 'Approve application', return: 'Return for correction', reject: 'Reject application' };
    var needComment = kind !== 'approve';
    ui.modal({
      title: titles[kind],
      body:
        '<p class="muted" style="margin-bottom:14px">' + ui.escapeHtml(app.reference_no) + ' \u2014 ' + ui.escapeHtml(app.programme_title) + '</p>' +
        '<label class="field"><span class="label">Comments' + (needComment ? ' <b style="color:var(--red-600)">*</b>' : ' (optional)') + '</span>' +
        '<textarea id="dc-comment" class="textarea" rows="4" placeholder="' + (needComment ? 'Explain your decision\u2026' : 'Add a note for the record\u2026') + '"></textarea></label>',
      actions: [
        { label: 'Cancel', class: 'btn-secondary', onClick: function (h) { h.close(); } },
        { label: kind === 'approve' ? 'Confirm approval' : kind === 'return' ? 'Return application' : 'Reject application',
          class: kind === 'approve' ? 'btn-primary' : 'btn-danger',
          onClick: function (h) {
            var ta = ui.qs('#dc-comment', h.card);
            var comment = ta ? ta.value.trim() : '';
            if (needComment && comment.length < 3) {
              if (ta) { ta.focus(); ta.style.borderColor = 'var(--red-500)'; }
              ui.toast({ type: 'error', title: 'Comment required', message: 'Please provide a brief reason.' });
              return;
            }
            h.close();
            submit(kind, comment);
          } }
      ]
    });
  }

  function submit(kind, comment) {
    var overlay = ui.el('div', { class: 'modal-overlay' });
    overlay.innerHTML = '<div class="modal" style="max-width:320px"><div class="modal-body" style="text-align:center">' +
      ui.icon('clock', '') + '<p style="margin-top:10px">Recording decision\u2026</p></div></div>';
    document.body.appendChild(overlay);
    LSDS.api.applications.decide(app.id, kind, comment).then(function (updated) {
      overlay.remove();
      app = updated;
      ui.toast({ type: 'success', title: 'Decision recorded', message: app.reference_no + ' is now ' + ui.statusMeta(app.status).label + '.' });
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }).catch(function (err) {
      overlay.remove();
      ui.toast({ type: 'error', title: 'Could not record decision', message: err.message });
    });
  }

  function load() {
    document.getElementById('page-content').innerHTML =
      '<div class="stack"><div class="skeleton" style="height:90px"></div><div class="skeleton" style="height:360px"></div></div>';
    LSDS.api.applications.get(app.id).then(function (data) {
      app = data;
      render();
    }).catch(function (err) {
      document.getElementById('page-content').innerHTML =
        '<div class="empty-state"><div class="e-ico" style="color:var(--red-500)">' + ui.icon('alertTriangle', '') + '</div>' +
        '<h3>Application unavailable</h3><p>' + ui.escapeHtml(err.message) + '</p>' +
        '<p style="margin-top:16px"><a class="btn btn-secondary" href="applications.html">Back to applications</a></p></div>';
    });
  }

  function init() {
    user = LSDS.layout.init({ active: 'applications', title: 'Application' });
    if (!user) return;
    var id = ui.param('id');
    if (!id) {
      document.getElementById('page-content').innerHTML =
        '<div class="empty-state"><h3>No application selected</h3><p><a class="link-strong" href="applications.html">Browse applications</a></p></div>';
      return;
    }
    app = { id: id };
    load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
