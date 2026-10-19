/* ============================================================================
 * LSDS Admin - Approval Queue
 * ========================================================================== */
(function (window, document) {
  'use strict';

  var LSDS = window.LSDS;
  var ui = LSDS.ui;

  var STAGE_ORDER = ['principal_manager', 'agm', 'gm', 'learning_development', 'finance_review', 'disbursement'];
  var STAGE_LABELS = {
    principal_manager: 'Principal Manager', agm: 'Assistant GM', gm: 'General Manager',
    learning_development: 'Learning & Development', finance_review: 'Financial Review', disbursement: 'Disbursement'
  };

  var stage = '';

  function shell() {
    document.getElementById('page-content').innerHTML =
      '<div class="page-head">' +
        '<div><h1>Approval Queue</h1>' +
          '<p class="sub">Applications awaiting a decision, grouped by workflow stage.</p></div>' +
        '<div class="page-actions"><button class="btn btn-secondary" id="btn-refresh">' + ui.icon('refresh', '') + 'Refresh</button></div>' +
      '</div>' +
      '<div class="card">' +
        '<div class="chips-bar" id="stage-chips"></div>' +
        '<div id="table-host"></div>' +
      '</div>';

    ui.qs('#btn-refresh').addEventListener('click', load);
  }

  function chips(counts, total) {
    var html = '<button class="chip' + (stage === '' ? ' active' : '') + '" data-stage="">All stages <span class="c">' + total + '</span></button>';
    STAGE_ORDER.forEach(function (k) {
      var n = counts[k] || 0;
      html += '<button class="chip' + (stage === k ? ' active' : '') + '" data-stage="' + k + '">' +
        ui.escapeHtml(STAGE_LABELS[k]) + ' <span class="c">' + n + '</span></button>';
    });
    var host = ui.qs('#stage-chips');
    host.innerHTML = html;
    ui.qsa('[data-stage]', host).forEach(function (b) {
      b.addEventListener('click', function () {
        stage = b.getAttribute('data-stage');
        ui.qsa('[data-stage]', host).forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        load();
      });
    });
  }

  function daysBadge(d) {
    if (d <= 1) return '<span class="badge badge-green">' + d + 'd</span>';
    if (d <= 5) return '<span class="badge badge-amber">' + d + 'd</span>';
    return '<span class="badge badge-red">' + d + 'd</span>';
  }

  function table(res) {
    var host = ui.qs('#table-host');
    if (!res.data.length) {
      host.innerHTML = '<div class="empty-state"><div class="e-ico">' + ui.icon('checkCircle', '') + '</div>' +
        '<h3>Nothing awaiting approval</h3><p>There are no applications at this stage.</p></div>';
      return;
    }
    var rows = res.data.map(function (a) {
      return '<tr class="row-link" data-id="' + a.id + '">' +
        '<td><span class="ref">' + ui.escapeHtml(a.reference_no) + '</span></td>' +
        '<td><div class="cell-main"><span class="avatar sm">' + ui.escapeHtml(ui.initials(a.applicant_name)) + '</span>' +
          '<div><div class="t">' + ui.escapeHtml(a.applicant_name) + '</div>' +
          '<div class="s">' + ui.escapeHtml(a.department) + '</div></div></div></td>' +
        '<td><div class="t truncate" style="font-weight:600;max-width:280px">' + ui.escapeHtml(a.programme_title) + '</div>' +
          '<div class="s">' + ui.escapeHtml(ui.titleCase(a.scope)) + '</div></td>' +
        '<td class="nowrap" style="font-weight:600">' + ui.formatCurrency(a.requested_amount, true) + '</td>' +
        '<td><span class="badge badge-sky">' + ui.escapeHtml(STAGE_LABELS[a.current_stage_key] || ui.titleCase(a.current_stage_key || '')) + '</span></td>' +
        '<td class="nowrap">' + ui.escapeHtml(a.pending_reviewer_name || '\u2014') + '</td>' +
        '<td class="nowrap">' + daysBadge(a.days_waiting) + '</td>' +
        '<td class="nowrap text-right"><a class="link-strong" href="application.html?id=' + a.id + '">Review</a></td>' +
      '</tr>';
    }).join('');
    host.innerHTML = '<div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>Reference</th><th>Applicant</th><th>Programme</th><th>Amount</th><th>Stage</th><th>With</th><th>Waiting</th><th></th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>';
    ui.qsa('tr[data-id]', host).forEach(function (tr) {
      tr.addEventListener('click', function (e) {
        if (e.target.closest('a')) return;
        window.location.href = 'application.html?id=' + tr.getAttribute('data-id');
      });
    });
  }

  function load() {
    var host = ui.qs('#table-host');
    host.innerHTML = '<div style="padding:20px"><div class="skeleton" style="height:180px"></div></div>';
    LSDS.api.approvals.queue().then(function (res) {
      var counts = res.counts || {};
      var total = res.data.length;
      var list = stage ? res.data.filter(function (a) { return a.current_stage_key === stage; }) : res.data;
      table({ data: list });
      chips(counts, total);
    }).catch(function (err) {
      host.innerHTML = '<div class="empty-state"><div class="e-ico" style="color:var(--red-500)">' + ui.icon('alertTriangle', '') + '</div>' +
        '<h3>Could not load the queue</h3><p>' + ui.escapeHtml(err.message) + '</p></div>';
    });
  }

  function init() {
    var user = LSDS.layout.init({ active: 'approvals', title: 'Approval Queue' });
    if (!user) return;
    shell();
    load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
