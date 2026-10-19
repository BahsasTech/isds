/* ============================================================================
 * LSDS Admin - Reports & Analytics
 * ========================================================================== */
(function (window, document) {
  'use strict';

  var LSDS = window.LSDS;
  var ui = LSDS.ui;

  var data = null;

  function kpis(d) {
    var k = d.kpis;
    return '<div class="grid stats">' +
      ui.statCard({ label: 'Applications', value: k.applications, icon: 'fileText', tone: 'blue', foot: k.pending + ' pending approval' }) +
      ui.statCard({ label: 'Completion rate', value: k.completion_rate + '%', icon: 'badgeCheck', tone: 'green', foot: 'Applications not rejected' }) +
      ui.statCard({ label: 'Authorized', value: k.authorized, format: 'currency', icon: 'banknote', tone: 'violet', foot: 'Funding approved' }) +
      ui.statCard({ label: 'Released', value: k.released, format: 'currency', icon: 'wallet', tone: 'green', foot: 'Paid to date' }) +
      ui.statCard({ label: 'Outstanding', value: k.outstanding, format: 'currency', icon: 'clock', tone: 'amber', foot: 'Still to be released' }) +
      ui.statCard({ label: 'Avg. session feedback', value: k.avg_feedback, icon: 'presentation', tone: 'sky', foot: d.sessions.delivered + ' sessions delivered' }) +
    '</div>';
  }

  function barChart(monthly) {
    var max = monthly.reduce(function (m, r) { return Math.max(m, r.applications); }, 1);
    var cols = monthly.map(function (r) {
      var hApp = Math.max(4, Math.round((r.applications / max) * 100));
      var hOk = Math.max(0, Math.round((r.approved / max) * 100));
      return '<div class="bar-col">' +
        '<span class="bar-val">' + r.applications + '</span>' +
        '<div class="bar-stack" title="' + r.applications + ' submitted, ' + r.approved + ' approved">' +
          '<div class="bar" style="height:' + hApp + '%"></div>' +
          '<div class="bar alt" style="height:' + hOk + '%"></div>' +
        '</div>' +
        '<span class="bar-x">' + ui.escapeHtml(r.month) + '</span>' +
      '</div>';
    }).join('');
    return '<div class="chart">' + cols + '</div>' +
      '<div class="legend" style="margin-top:14px;justify-content:center">' +
        '<span class="key"><span class="swatch" style="background:linear-gradient(180deg,var(--brand-500),var(--brand-700))"></span>Submitted</span>' +
        '<span class="key"><span class="swatch" style="background:linear-gradient(180deg,var(--brand-300),var(--brand-500))"></span>Approved</span>' +
      '</div>';
  }

  function hbars(rows) {
    if (!rows.length) return '<p class="muted">No data.</p>';
    var max = rows.reduce(function (m, r) { return Math.max(m, r.value); }, 1);
    return '<div class="pipeline">' + rows.map(function (r) {
      var pct = Math.max(4, Math.round((r.value / max) * 100));
      return '<div class="pipeline-row">' +
        '<span class="p-label" title="' + ui.escapeHtml(r.label) + '">' + ui.escapeHtml(r.label) + '</span>' +
        '<span class="p-count">' + ui.escapeHtml(r.display) + '</span>' +
        '<div class="pipeline-track"><i style="width:' + pct + '%;background:' + (r.tone || 'var(--brand-500)') + '"></i></div>' +
      '</div>';
    }).join('') + '</div>';
  }

  function moneyRow(label, value, cls) {
    return '<div class="money-row' + (cls ? ' ' + cls : '') + '"><span class="m-label">' + ui.escapeHtml(label) + '</span>' +
      '<span class="m-value">' + ui.formatCurrency(value) + '</span></div>';
  }

  function render(d) {
    data = d;
    var generated = ui.formatDateTime(d.generatedAt);
    var deptRows = d.byDepartment.map(function (x) {
      return { label: x.name, value: x.applications, display: x.applications + ' \u00b7 ' + ui.formatCurrency(x.spend, true) };
    });
    var statusRows = d.byStatus.map(function (x) {
      return { label: ui.statusMeta(x.key).label, value: x.count, display: String(x.count) };
    });
    var typeRows = d.byType.map(function (x) {
      return { label: ui.titleCase(x.key), value: x.count, display: String(x.count) };
    });
    var methodRows = Object.keys(d.disbursements.by_method || {}).map(function (k) {
      return { label: ui.titleCase(k), value: d.disbursements.by_method[k], display: String(d.disbursements.by_method[k]) };
    });

    document.getElementById('page-content').innerHTML =
      '<div class="page-head">' +
        '<div><h1>Reports &amp; Analytics</h1>' +
          '<p class="sub">Consolidated insight across training, finance and knowledge sharing &middot; generated ' + generated + '</p></div>' +
        '<div class="page-actions">' +
          '<button class="btn btn-secondary" id="rp-export">' + ui.icon('download', '') + 'Export PDF</button>' +
          '<button class="btn btn-primary" id="rp-print">' + ui.icon('fileText', '') + 'Print</button>' +
        '</div>' +
      '</div>' +
      kpis(d) +

      '<section class="grid cols-2" style="margin-top:18px">' +
        '<div class="card"><div class="card-head"><div><h3>Applications Trend</h3>' +
          '<div class="sub">Submitted vs approved, last 8 months</div></div></div>' +
          '<div class="card-body">' + barChart(d.monthly) + '</div></div>' +
        '<div class="card"><div class="card-head"><div><h3>Training by Scope</h3>' +
          '<div class="sub">National vs international requests</div></div></div>' +
          '<div class="card-body">' + hbars(d.byScope.map(function (x) {
            return { label: ui.titleCase(x.key) + ' (' + x.count + ')', value: x.amount, display: ui.formatCurrency(x.amount, true) };
          })) +
          '<div style="margin-top:16px" class="money-row"><span class="m-label">International share of requested value</span>' +
            '<span class="m-value">' + Math.round((d.byScope[1].amount / Math.max(1, d.byScope[0].amount + d.byScope[1].amount)) * 100) + '%</span></div>' +
          '</div></div>' +
      '</section>' +

      '<section class="grid cols-2" style="margin-top:18px">' +
        '<div class="card"><div class="card-head"><div><h3>Applications by Department</h3>' +
          '<div class="sub">Volume and approved spend</div></div></div>' +
          '<div class="card-body">' + hbars(deptRows) + '</div></div>' +
        '<div class="card"><div class="card-head"><div><h3>Applications by Status</h3>' +
          '<div class="sub">Where requests currently sit</div></div></div>' +
          '<div class="card-body">' + hbars(statusRows) + '</div></div>' +
      '</section>' +

      '<section class="grid cols-2" style="margin-top:18px">' +
        '<div class="card"><div class="card-head"><div><h3>Applications by Type</h3>' +
          '<div class="sub">Programme category mix</div></div></div>' +
          '<div class="card-body">' + hbars(typeRows) + '</div></div>' +
        '<div class="card"><div class="card-head"><div><h3>Financial Summary</h3>' +
          '<div class="sub">Authorized, released and outstanding</div></div></div>' +
          '<div class="card-body">' +
            moneyRow('Authorized', d.kpis.authorized) +
            moneyRow('Released', d.kpis.released) +
            moneyRow('Outstanding', d.kpis.outstanding) +
            moneyRow('Release rate', Math.round((d.kpis.released / Math.max(1, d.kpis.authorized)) * 100) + '%') +
            '<div class="section-title" style="margin-top:18px">Payments by method</div>' +
            hbars(methodRows) +
          '</div></div>' +
      '</section>' +

      '<section class="grid" style="margin-top:18px">' +
        '<div class="card"><div class="card-head"><div><h3>Knowledge Sharing</h3>' +
          '<div class="sub">Session delivery and engagement</div></div></div>' +
          '<div class="card-body">' +
            '<div class="money-row"><span class="m-label">Sessions recorded</span><span class="m-value">' + ui.formatNumber(d.sessions.total) + '</span></div>' +
            '<div class="money-row"><span class="m-label">Published &amp; scheduled</span><span class="m-value">' + ui.formatNumber(d.sessions.upcoming) + '</span></div>' +
            '<div class="money-row"><span class="m-label">Total registrations</span><span class="m-value">' + ui.formatNumber(d.sessions.registrations) + '</span></div>' +
            '<div class="money-row"><span class="m-label">Attendees recorded</span><span class="m-value">' + ui.formatNumber(d.sessions.attendance) + '</span></div>' +
            '<div class="money-row total"><span class="m-label">Active users</span>' +
              '<span class="m-value">' + ui.formatNumber(d.users.active) + ' of ' + ui.formatNumber(d.users.total) + '</span></div>' +
          '</div></div>' +
      '</section>';

    ui.qs('#rp-print').addEventListener('click', function () { window.print(); });
    ui.qs('#rp-export').addEventListener('click', function () {
      ui.toast({ type: 'info', title: 'Report queued', message: 'The PDF report will be emailed when ready.' });
    });
  }

  function init() {
    var user = LSDS.layout.init({ active: 'reports', title: 'Reports & Analytics' });
    if (!user) return;
    document.getElementById('page-content').innerHTML =
      '<div class="stack"><div class="grid stats">' +
      '<div class="skeleton" style="height:100px"></div><div class="skeleton" style="height:100px"></div>' +
      '<div class="skeleton" style="height:100px"></div><div class="skeleton" style="height:100px"></div>' +
      '<div class="skeleton" style="height:100px"></div><div class="skeleton" style="height:100px"></div></div>' +
      '<div class="grid cols-2"><div class="skeleton" style="height:300px"></div><div class="skeleton" style="height:300px"></div></div>' +
      '</div>';
    LSDS.api.reports.summary().then(render).catch(function (err) {
      document.getElementById('page-content').innerHTML =
        '<div class="empty-state"><div class="e-ico" style="color:var(--red-500)">' + ui.icon('alertTriangle', '') + '</div>' +
        '<h3>Could not build the report</h3><p>' + ui.escapeHtml(err.message) + '</p></div>';
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
