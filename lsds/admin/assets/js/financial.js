/* ============================================================================
 * LSDS Admin - Training Financial Records
 * ========================================================================== */
(function (window, document) {
  'use strict';

  var LSDS = window.LSDS;
  var ui = LSDS.ui;

  var STATUS_OPTIONS = [
    { v: '', l: 'All statuses' }, { v: 'pending_review', l: 'Pending Review' },
    { v: 'authorized', l: 'Authorized' }, { v: 'partially_disbursed', l: 'Partially Disbursed' },
    { v: 'disbursed', l: 'Disbursed' }, { v: 'rejected', l: 'Rejected' }, { v: 'cancelled', l: 'Cancelled' }
  ];

  var all = [];
  var totals = { count: 0, authorized: 0, disbursed: 0, outstanding: 0 };
  var departments = [];
  var state = { q: '', status: '', department: '' };

  function statsBlock() {
    var rate = totals.authorized ? Math.round((totals.disbursed / totals.authorized) * 100) : 0;
    return '<div class="grid stats">' +
      ui.statCard({ label: 'Financial records', value: totals.count, icon: 'fileText', tone: 'blue', foot: 'Funded applications' }) +
      ui.statCard({ label: 'Authorized', value: totals.authorized, format: 'currency', icon: 'banknote', tone: 'violet', foot: 'Approved by Finance' }) +
      ui.statCard({ label: 'Disbursed', value: totals.disbursed, format: 'currency', icon: 'wallet', tone: 'green', foot: rate + '% of authorized' }) +
      ui.statCard({ label: 'Outstanding', value: totals.outstanding, format: 'currency', icon: 'clock', tone: 'amber', foot: 'Awaiting release' }) +
    '</div>';
  }

  function shell() {
    document.getElementById('page-content').innerHTML =
      '<div class="page-head">' +
        '<div><h1>Financial Records</h1>' +
          '<p class="sub">Authorized training expenditure, budget references and release status.</p></div>' +
        '<div class="page-actions"><button class="btn btn-secondary" id="btn-export">' + ui.icon('download', '') + 'Export</button></div>' +
      '</div>' +
      statsBlock() +
      '<div class="card" style="margin-top:22px">' +
        '<div class="toolbar">' +
          '<label class="search-inline">' + ui.icon('search', '') +
            '<input id="f-q" type="search" placeholder="Search reference, applicant or programme\u2026"></label>' +
          '<select class="select-sm" id="f-status">' + STATUS_OPTIONS.map(function (o) {
            return '<option value="' + o.v + '">' + o.l + '</option>'; }).join('') + '</select>' +
          '<select class="select-sm" id="f-dept"><option value="">All departments</option>' +
            departments.map(function (d) { return '<option value="' + d.code + '">' + ui.escapeHtml(d.name) + '</option>'; }).join('') +
          '</select>' +
          '<span class="grow"></span>' +
          '<span class="muted" id="result-count"></span>' +
        '</div>' +
        '<div id="table-host"></div>' +
      '</div>';

    ui.qs('#btn-export').addEventListener('click', function () {
      ui.toast({ type: 'info', title: 'Export queued', message: 'A ledger export will be emailed when ready.' });
    });
    ui.qs('#f-q').addEventListener('input', ui.debounce(function (e) { state.q = e.target.value.trim(); draw(); }, 240));
    ui.qs('#f-status').addEventListener('change', function (e) { state.status = e.target.value; draw(); });
    ui.qs('#f-dept').addEventListener('change', function (e) { state.department = e.target.value; draw(); });
  }

  function filtered() {
    var q = state.q.toLowerCase();
    return all.filter(function (r) {
      if (state.status && r.financial_status !== state.status) return false;
      if (state.department && r.department_code !== state.department) return false;
      if (q && (r.reference_no + ' ' + r.applicant_name + ' ' + r.programme_title).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }

  function releaseBar(r) {
    var pct = r.approved_amount ? Math.round((r.disbursed_total / r.approved_amount) * 100) : 0;
    var tone = pct >= 100 ? 'background:var(--green-500)' : pct > 0 ? '' : 'background:var(--gray-300)';
    return '<div style="min-width:150px">' +
      '<div style="display:flex;justify-content:space-between;font-size:.76rem;margin-bottom:5px">' +
        '<span class="muted">' + ui.formatCurrency(r.disbursed_total, true) + '</span>' +
        '<b>' + pct + '%</b></div>' +
      '<div class="bar"><span style="width:' + pct + '%;' + tone + '"></span></div></div>';
  }

  function draw() {
    var list = filtered();
    ui.qs('#result-count').textContent = list.length + ' record' + (list.length === 1 ? '' : 's');
    var host = ui.qs('#table-host');
    if (!list.length) {
      host.innerHTML = '<div class="empty-state"><div class="e-ico">' + ui.icon('wallet', '') + '</div>' +
        '<h3>No financial records found</h3><p>Adjust the filters to widen your search.</p></div>';
      return;
    }
    var rows = list.map(function (r) {
      return '<tr class="row-link" data-id="' + r.application_id + '">' +
        '<td><span class="ref">' + ui.escapeHtml(r.reference_no) + '</span>' +
          '<div class="s muted">' + ui.escapeHtml(r.budget_reference || '') + '</div></td>' +
        '<td><div class="t" style="font-weight:600">' + ui.escapeHtml(r.programme_title) + '</div>' +
          '<div class="s muted">' + ui.escapeHtml(r.applicant_name) + ' &middot; ' + ui.escapeHtml(r.department) + '</div></td>' +
        '<td class="nowrap" style="font-weight:650">' + ui.formatCurrency(r.approved_amount) + '</td>' +
        '<td>' + releaseBar(r) + '</td>' +
        '<td class="nowrap" style="font-weight:600;color:' + (r.outstanding > 0 ? 'var(--amber-600)' : 'var(--green-600)') + '">' +
          ui.formatCurrency(r.outstanding) + '</td>' +
        '<td>' + ui.badge(r.financial_status) + '</td>' +
        '<td class="nowrap faint">' + ui.relativeTime(r.authorized_at) + '</td>' +
      '</tr>';
    }).join('');
    host.innerHTML = '<div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>Reference</th><th>Programme</th><th>Approved</th><th>Released</th><th>Outstanding</th><th>Status</th><th>Authorized</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>';

    ui.qsa('tr[data-id]', host).forEach(function (tr) {
      tr.addEventListener('click', function (e) {
        if (e.target.closest('a')) return;
        window.location.href = 'application.html?id=' + tr.getAttribute('data-id');
      });
    });
  }

  function skeleton() {
    document.getElementById('page-content').innerHTML =
      '<div class="stack"><div class="grid stats">' +
      '<div class="skeleton" style="height:100px"></div><div class="skeleton" style="height:100px"></div>' +
      '<div class="skeleton" style="height:100px"></div><div class="skeleton" style="height:100px"></div></div>' +
      '<div class="skeleton" style="height:300px"></div></div>';
  }

  function init() {
    var user = LSDS.layout.init({ active: 'financial', title: 'Financial Records' });
    if (!user) return;
    skeleton();
    Promise.all([LSDS.api.financial.list(), LSDS.api.departments.list()]).then(function (res) {
      all = res[0].data || [];
      totals = res[0].totals || totals;
      departments = res[1].data || [];
      shell();
      draw();
    }).catch(function (err) {
      document.getElementById('page-content').innerHTML =
        '<div class="empty-state"><div class="e-ico" style="color:var(--red-500)">' + ui.icon('alertTriangle', '') + '</div>' +
        '<h3>Could not load financial records</h3><p>' + ui.escapeHtml(err.message) + '</p></div>';
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
