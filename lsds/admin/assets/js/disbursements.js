/* ============================================================================
 * LSDS Admin - Disbursements
 * ========================================================================== */
(function (window, document) {
  'use strict';

  var LSDS = window.LSDS;
  var ui = LSDS.ui;

  var STATUS_OPTIONS = [
    { v: '', l: 'All statuses' }, { v: 'pending', l: 'Pending' },
    { v: 'completed', l: 'Completed' }, { v: 'failed', l: 'Failed' }, { v: 'reversed', l: 'Reversed' }
  ];
  var METHOD_OPTIONS = [
    { v: '', l: 'All methods' }, { v: 'bank_transfer', l: 'Bank Transfer' },
    { v: 'cash', l: 'Cash' }, { v: 'cheque', l: 'Cheque' }, { v: 'other', l: 'Other' }
  ];

  var all = [];
  var totals = { released: 0, this_month: 0, pending: 0 };
  var state = { q: '', status: '', method: '' };

  function statsBlock() {
    return '<div class="grid stats">' +
      ui.statCard({ label: 'Payments recorded', value: all.length, icon: 'banknote', tone: 'blue', foot: 'Across all applications' }) +
      ui.statCard({ label: 'Total released', value: totals.released, format: 'currency', icon: 'wallet', tone: 'green', foot: 'All completed payments' }) +
      ui.statCard({ label: 'Released this month', value: totals.this_month, format: 'currency', icon: 'calendar', tone: 'violet', foot: 'Current calendar month' }) +
      ui.statCard({ label: 'Pending release', value: totals.pending, format: 'currency', icon: 'clock', tone: 'amber', foot: 'Not yet completed' }) +
    '</div>';
  }

  function shell() {
    document.getElementById('page-content').innerHTML =
      '<div class="page-head">' +
        '<div><h1>Disbursements</h1>' +
          '<p class="sub">Payment releases recorded against authorized training expenditure.</p></div>' +
        '<div class="page-actions"><button class="btn btn-secondary" id="btn-export">' + ui.icon('download', '') + 'Export</button></div>' +
      '</div>' +
      statsBlock() +
      '<div class="card" style="margin-top:22px">' +
        '<div class="toolbar">' +
          '<label class="search-inline">' + ui.icon('search', '') +
            '<input id="f-q" type="search" placeholder="Search payment or application reference\u2026"></label>' +
          '<select class="select-sm" id="f-status">' + STATUS_OPTIONS.map(function (o) {
            return '<option value="' + o.v + '">' + o.l + '</option>'; }).join('') + '</select>' +
          '<select class="select-sm" id="f-method">' + METHOD_OPTIONS.map(function (o) {
            return '<option value="' + o.v + '">' + o.l + '</option>'; }).join('') + '</select>' +
          '<span class="grow"></span>' +
          '<span class="muted" id="result-count"></span>' +
        '</div>' +
        '<div id="table-host"></div>' +
      '</div>';

    ui.qs('#btn-export').addEventListener('click', function () {
      ui.toast({ type: 'info', title: 'Export queued', message: 'A payment schedule will be emailed when ready.' });
    });
    ui.qs('#f-q').addEventListener('input', ui.debounce(function (e) { state.q = e.target.value.trim(); draw(); }, 240));
    ui.qs('#f-status').addEventListener('change', function (e) { state.status = e.target.value; draw(); });
    ui.qs('#f-method').addEventListener('change', function (e) { state.method = e.target.value; draw(); });
  }

  function filtered() {
    var q = state.q.toLowerCase();
    return all.filter(function (d) {
      if (state.status && d.status !== state.status) return false;
      if (state.method && d.payment_method !== state.method) return false;
      if (q && (d.payment_reference + ' ' + d.reference_no + ' ' + d.applicant_name).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }

  function draw() {
    var list = filtered();
    var sum = list.reduce(function (t, d) { return t + d.amount; }, 0);
    ui.qs('#result-count').textContent = list.length + ' payment' + (list.length === 1 ? '' : 's') + ' \u00b7 ' + ui.formatCurrency(sum, true);
    var host = ui.qs('#table-host');
    if (!list.length) {
      host.innerHTML = '<div class="empty-state"><div class="e-ico">' + ui.icon('banknote', '') + '</div>' +
        '<h3>No disbursements found</h3><p>Adjust the filters to widen your search.</p></div>';
      return;
    }
    var rows = list.map(function (d) {
      return '<tr class="row-link" data-id="' + d.application_id + '">' +
        '<td><span class="ref">' + ui.escapeHtml(d.payment_reference) + '</span>' +
          '<div class="s muted">' + ui.escapeHtml(d.reference_no) + '</div></td>' +
        '<td><div class="t" style="font-weight:600">' + ui.escapeHtml(d.programme_title) + '</div>' +
          '<div class="s muted">' + ui.escapeHtml(d.applicant_name) + ' &middot; ' + ui.escapeHtml(d.department) + '</div></td>' +
        '<td class="nowrap" style="font-weight:650">' + ui.formatCurrency(d.amount) + '</td>' +
        '<td class="nowrap">' + ui.formatDate(d.payment_date) + '</td>' +
        '<td class="nowrap"><span class="badge badge-sky">' + ui.escapeHtml(ui.titleCase(d.payment_method)) + '</span></td>' +
        '<td>' + ui.badge(d.status) + '</td>' +
        '<td class="nowrap faint">' + ui.escapeHtml(d.recorded_by_name) + '</td>' +
      '</tr>';
    }).join('');
    host.innerHTML = '<div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>Payment</th><th>Application</th><th>Amount</th><th>Date</th><th>Method</th><th>Status</th><th>Recorded by</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>';

    ui.qsa('tr[data-id]', host).forEach(function (tr) {
      tr.addEventListener('click', function (e) {
        if (e.target.closest('a')) return;
        window.location.href = 'application.html?id=' + tr.getAttribute('data-id');
      });
    });
  }

  function init() {
    var user = LSDS.layout.init({ active: 'disbursements', title: 'Disbursements' });
    if (!user) return;
    document.getElementById('page-content').innerHTML =
      '<div class="stack"><div class="grid stats">' +
      '<div class="skeleton" style="height:100px"></div><div class="skeleton" style="height:100px"></div>' +
      '<div class="skeleton" style="height:100px"></div><div class="skeleton" style="height:100px"></div></div>' +
      '<div class="skeleton" style="height:300px"></div></div>';
    LSDS.api.disbursements.list().then(function (res) {
      all = res.data || [];
      totals = res.totals || totals;
      shell();
      draw();
    }).catch(function (err) {
      document.getElementById('page-content').innerHTML =
        '<div class="empty-state"><div class="e-ico" style="color:var(--red-500)">' + ui.icon('alertTriangle', '') + '</div>' +
        '<h3>Could not load disbursements</h3><p>' + ui.escapeHtml(err.message) + '</p></div>';
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
