/* ============================================================================
 * LSDS Admin - Training Applications (list)
 * ========================================================================== */
(function (window, document) {
  'use strict';

  var LSDS = window.LSDS;
  var ui = LSDS.ui;

  var STATUS_OPTIONS = [
    { v: '', l: 'All statuses' },
    { v: 'pending', l: 'Pending (any stage)' },
    { v: 'pending_principal_manager', l: 'Pending: Principal Manager' },
    { v: 'pending_agm', l: 'Pending: AGM' },
    { v: 'pending_gm', l: 'Pending: GM' },
    { v: 'pending_learning_development', l: 'Pending: Learning & Development' },
    { v: 'pending_financial_review', l: 'Pending: Financial Review' },
    { v: 'financially_approved', l: 'Financially Approved' },
    { v: 'disbursed', l: 'Disbursed' },
    { v: 'completed', l: 'Completed' },
    { v: 'rejected', l: 'Rejected' },
    { v: 'returned_for_correction', l: 'Returned for Correction' },
    { v: 'draft', l: 'Draft' }
  ];
  var SCOPE_OPTIONS = [
    { v: '', l: 'All scopes' },
    { v: 'national', l: 'National' },
    { v: 'international', l: 'International' }
  ];

  var state = { q: '', status: '', scope: '', department: '', sort: 'updated', page: 1, per_page: 10 };
  var departments = [];

  function options(list, current) {
    return list.map(function (o) {
      return '<option value="' + ui.escapeHtml(o.v) + '"' + (o.v === current ? ' selected' : '') + '>' +
        ui.escapeHtml(o.l) + '</option>';
    }).join('');
  }

  function shell() {
    document.getElementById('page-content').innerHTML =
      '<div class="page-head">' +
        '<div><h1>Training Applications</h1>' +
          '<p class="sub">All national and international training and conference requests.</p></div>' +
        '<div class="page-actions">' +
          '<button class="btn btn-secondary" id="btn-export">' + ui.icon('download', '') + 'Export CSV</button>' +
          '<button class="btn btn-primary" id="btn-new">' + ui.icon('plus', '') + 'New Application</button>' +
        '</div>' +
      '</div>' +
      '<div class="card">' +
        '<div class="toolbar">' +
          '<label class="search-inline">' + ui.icon('search', '') +
            '<input id="f-q" type="search" placeholder="Search reference, applicant or programme\u2026" value="' + ui.escapeHtml(state.q) + '"></label>' +
          '<select class="select-sm" id="f-status">' + options(STATUS_OPTIONS, state.status) + '</select>' +
          '<select class="select-sm" id="f-scope">' + options(SCOPE_OPTIONS, state.scope) + '</select>' +
          '<select class="select-sm" id="f-dept"><option value="">All departments</option></select>' +
          '<span class="grow"></span>' +
          '<select class="select-sm" id="f-sort">' +
            '<option value="updated">Sort: Recently updated</option>' +
            '<option value="amount">Sort: Highest amount</option>' +
            '<option value="applicant">Sort: Applicant A\u2013Z</option>' +
          '</select>' +
        '</div>' +
        '<div id="table-host"></div>' +
        '<div id="pager-host"></div>' +
      '</div>';

    ui.qs('#btn-new').addEventListener('click', function () {
      window.location.href = 'new-application.html';
    });
    ui.qs('#btn-export').addEventListener('click', function () {
      ui.toast({ type: 'info', title: 'Export queued', message: 'A CSV of the current filter will be emailed shortly.' });
    });

    var reload = function () { state.page = 1; load(); };
    ui.qs('#f-q').addEventListener('input', ui.debounce(function (e) { state.q = e.target.value.trim(); state.page = 1; load(); }, 280));
    ui.qs('#f-status').addEventListener('change', function (e) { state.status = e.target.value; reload(); });
    ui.qs('#f-scope').addEventListener('change', function (e) { state.scope = e.target.value; reload(); });
    ui.qs('#f-dept').addEventListener('change', function (e) { state.department = e.target.value; reload(); });
    ui.qs('#f-sort').addEventListener('change', function (e) { state.sort = e.target.value; reload(); });
  }

  function rows(list) {
    return list.map(function (a) {
      return '<tr class="row-link" data-id="' + a.id + '">' +
        '<td><span class="ref">' + ui.escapeHtml(a.reference_no) + '</span></td>' +
        '<td><div class="cell-main"><span class="avatar sm">' + ui.escapeHtml(ui.initials(a.applicant_name)) + '</span>' +
          '<div><div class="t">' + ui.escapeHtml(a.applicant_name) + '</div>' +
          '<div class="s">' + ui.escapeHtml(a.department) + '</div></div></div></td>' +
        '<td><div class="t truncate" style="font-weight:600;max-width:320px">' + ui.escapeHtml(a.programme_title) + '</div>' +
          '<div class="s">' + ui.escapeHtml(ui.titleCase(a.application_type)) + '</div></td>' +
        '<td class="nowrap"><span class="badge badge-' + (a.scope === 'international' ? 'violet' : 'sky') + '">' + ui.escapeHtml(ui.titleCase(a.scope)) + '</span></td>' +
        '<td class="nowrap" style="font-weight:600">' + ui.formatCurrency(a.requested_amount, true) + '</td>' +
        '<td>' + ui.badge(a.status) + '</td>' +
        '<td class="nowrap faint">' + ui.relativeTime(a.updated_at) + '</td>' +
        '<td class="nowrap text-right"><a class="link-strong" href="application.html?id=' + a.id + '">View</a></td>' +
      '</tr>';
    }).join('');
  }

  function table(res) {
    var host = ui.qs('#table-host');
    if (!res.data.length) {
      host.innerHTML = '<div class="empty-state">' +
        '<div class="e-ico">' + ui.icon('search', '') + '</div>' +
        '<h3>No applications found</h3><p>Try adjusting the filters or search terms.</p></div>';
      return;
    }
    host.innerHTML = '<div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>Reference</th><th>Applicant</th><th>Programme</th><th>Scope</th><th>Amount</th><th>Status</th><th>Updated</th><th></th>' +
      '</tr></thead><tbody>' + rows(res.data) + '</tbody></table></div>';

    ui.qsa('tr[data-id]', host).forEach(function (tr) {
      tr.addEventListener('click', function (e) {
        if (e.target.closest('a')) return;
        window.location.href = 'application.html?id=' + tr.getAttribute('data-id');
      });
    });
  }

  function load() {
    var host = ui.qs('#table-host');
    host.innerHTML = '<div style="padding:20px"><div class="skeleton" style="height:220px"></div></div>';
    LSDS.api.applications.list(state).then(function (res) {
      table(res);
      var pagerHost = ui.qs('#pager-host');
      pagerHost.innerHTML = '';
      if (res.pages > 1 || res.total > 0) {
        var pager = ui.pagination({
          page: res.page, pages: res.pages, total: res.total, perPage: res.per_page,
          onChange: function (p) { state.page = p; load(); }
        });
        pagerHost.appendChild(pager.el);
      }
    }).catch(function (err) {
      host.innerHTML = '<div class="empty-state"><div class="e-ico" style="color:var(--red-500)">' + ui.icon('alertTriangle', '') + '</div>' +
        '<h3>Could not load applications</h3><p>' + ui.escapeHtml(err.message) + '</p></div>';
    });
  }

  function init() {
    var user = LSDS.layout.init({ active: 'applications', title: 'Training Applications' });
    if (!user) return;
    shell();
    LSDS.api.departments.list().then(function (res) {
      departments = res.data || [];
      var sel = ui.qs('#f-dept');
      departments.forEach(function (d) {
        var o = document.createElement('option');
        o.value = d.code; o.textContent = d.name;
        sel.appendChild(o);
      });
    }).catch(function () {});
    load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
