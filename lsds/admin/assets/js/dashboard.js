/* ============================================================================
 * LSDS Admin - Dashboard page controller
 * ----------------------------------------------------------------------------
 * Loads the dashboard summary and renders KPI cards, the applications trend,
 * the approval pipeline, recent applications, upcoming sessions, activity and
 * announcements. Depends on config.js, ui.js, api.js, auth.js and layout.js.
 * ========================================================================== */
(function (window, document) {
  'use strict';

  var LSDS = window.LSDS;
  var ui = LSDS.ui;

  function greeting() {
    var h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  /* --- Pieces ------------------------------------------------------------- */
  function statCard(s) {
    var value = s.format === 'currency' ? ui.formatCurrency(s.value, true) : ui.formatNumber(s.value);
    var trend = '';
    if (s.trend) {
      trend = '<span class="trend ' + s.trend.dir + '">' +
        ui.icon(s.trend.dir === 'up' ? 'arrowUp' : 'arrowDown', '') + ui.escapeHtml(s.trend.text) + '</span>';
    }
    return '<article class="stat">' +
      '<div class="stat-top">' +
        '<span class="stat-label" style="margin:0">' + ui.escapeHtml(s.label) + '</span>' +
        '<span class="stat-ico ico-' + ui.escapeHtml(s.tone || 'blue') + '">' + ui.icon(s.icon || 'barChart', '') + '</span>' +
      '</div>' +
      '<div class="stat-value">' + value + '</div>' +
      '<div class="stat-foot">' + trend + (s.foot ? '<span class="muted">' + ui.escapeHtml(s.foot) + '</span>' : '') + '</div>' +
    '</article>';
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

  function pipeline(pipeline) {
    var max = pipeline.reduce(function (m, r) { return Math.max(m, r.count); }, 1);
    return '<div class="pipeline">' + pipeline.map(function (r) {
      var pct = Math.round((r.count / max) * 100);
      return '<div class="pipeline-row">' +
        '<span class="p-label">' + ui.icon('arrowDown', '') + ui.escapeHtml(r.label) + '</span>' +
        '<span class="p-count">' + r.count + '</span>' +
        '<div class="pipeline-track"><i style="width:' + Math.max(4, pct) + '%"></i></div>' +
      '</div>';
    }).join('') + '</div>';
  }

  function recentTable(rows) {
    var body = rows.map(function (a) {
      return '<tr>' +
        '<td><div class="cell-main"><span class="avatar sm">' + ui.escapeHtml(ui.initials(a.applicant_name)) + '</span>' +
          '<div><div class="t">' + ui.escapeHtml(a.applicant_name) + '</div>' +
          '<div class="s">' + ui.escapeHtml(a.department) + '</div></div></div></td>' +
        '<td><div class="t" style="font-weight:600">' + ui.escapeHtml(a.programme_title) + '</div>' +
          '<div class="s mono">' + ui.escapeHtml(a.reference_no) + '</div></td>' +
        '<td class="nowrap"><span class="badge badge-' + (a.scope === 'international' ? 'violet' : 'sky') + '">' +
          ui.escapeHtml(ui.titleCase(a.scope)) + '</span></td>' +
        '<td class="nowrap" style="font-weight:600">' + ui.formatCurrency(a.amount, true) + '</td>' +
        '<td>' + ui.badge(a.status) + '</td>' +
        '<td class="nowrap faint">' + ui.relativeTime(a.updated_at) + '</td>' +
      '</tr>';
    }).join('');
    return '<div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>Applicant</th><th>Programme</th><th>Scope</th><th>Amount</th><th>Status</th><th>Updated</th>' +
      '</tr></thead><tbody>' + body + '</tbody></table></div>';
  }

  function sessionRow(s) {
    var pct = s.capacity ? Math.min(100, Math.round((s.registered / s.capacity) * 100)) : 0;
    var tone = pct >= 100 ? 'full' : pct >= 80 ? 'warn' : '';
    return '<div class="session-item">' +
      '<div class="s-top">' +
        '<div><div class="s-title">' + ui.escapeHtml(s.title) + '</div>' +
          '<div class="s-meta">' +
            '<span>' + ui.icon('calendar', '') + ' ' + ui.formatDate(s.date) + '</span>' +
            '<span>' + ui.icon('clock', '') + ' ' + ui.escapeHtml(s.time) + '</span>' +
            '<span>' + ui.escapeHtml(s.mode) + '</span>' +
          '</div></div>' +
        ui.badge(s.status) +
      '</div>' +
      '<div class="capacity"><div class="cap-top"><span>' + ui.escapeHtml(s.presenter) + '</span>' +
        '<span>' + s.registered + ' / ' + s.capacity + '</span></div>' +
        '<div class="cap-track"><i class="' + tone + '" style="width:' + pct + '%"></i></div></div>' +
    '</div>';
  }

  function activityFeed(items) {
    return '<div class="feed">' + items.map(function (a) {
      return '<div class="feed-item">' +
        '<span class="f-ico ico-' + ui.escapeHtml(a.tone || 'blue') + '">' + ui.icon(a.icon || 'refresh', '') + '</span>' +
        '<div class="f-body"><p><b>' + ui.escapeHtml(a.actor) + '</b> ' + ui.escapeHtml(a.action) +
          ' <b>' + ui.escapeHtml(a.target) + '</b></p>' +
          '<div class="f-time">' + ui.relativeTime(a.at) + '</div></div>' +
      '</div>';
    }).join('') + '</div>';
  }

  function announcementList(items) {
    return items.map(function (a) {
      return '<div class="announce">' +
        '<div class="a-head">' +
          (a.pinned ? '<span class="badge badge-amber">Pinned</span>' : '') +
          '<span class="t">' + ui.escapeHtml(a.title) + '</span>' +
        '</div>' +
        '<p>' + ui.escapeHtml(a.body) + '</p>' +
        '<div class="a-meta">' + ui.escapeHtml(a.audience) + ' &middot; ' + ui.formatDate(a.published_at) + '</div>' +
      '</div>';
    }).join('');
  }

  function departmentRows(rows) {
    var max = rows.reduce(function (m, r) { return Math.max(m, r.spend); }, 1);
    var body = rows.map(function (d) {
      var pct = Math.round((d.spend / max) * 100);
      return '<tr>' +
        '<td><div class="t" style="font-weight:600">' + ui.escapeHtml(d.name) + '</div>' +
          '<div class="pipeline-track" style="margin:6px 0 0"><i style="width:' + pct + '%"></i></div></td>' +
        '<td class="nowrap text-right">' + d.applications + '</td>' +
        '<td class="nowrap text-right" style="font-weight:600">' + ui.formatCurrency(d.spend, true) + '</td>' +
      '</tr>';
    }).join('');
    return '<div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>Department</th><th class="text-right">Apps</th><th class="text-right">Spend</th>' +
      '</tr></thead><tbody>' + body + '</tbody></table></div>';
  }

  /* --- Render ------------------------------------------------------------- */
  function render(data, user) {
    var host = document.getElementById('page-content');
    var today = new Date().toLocaleDateString(LSDS.config.locale || 'en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    host.innerHTML =
      '<div class="page-head">' +
        '<div><h1>' + greeting() + ', ' + ui.escapeHtml((user.name || '').split(' ')[0]) + '</h1>' +
          '<p class="sub">' + ui.escapeHtml(user.designation || 'Staff') + ' &middot; ' + ui.escapeHtml(today) + '</p></div>' +
        '<div class="page-actions">' +
          '<button class="btn btn-secondary" id="dash-export">' + ui.icon('download', '') + 'Export</button>' +
          '<button class="btn btn-primary" id="dash-new">' + ui.icon('plus', '') + 'New Application</button>' +
        '</div>' +
      '</div>' +

      '<section class="grid stats">' + data.stats.map(statCard).join('') + '</section>' +

      '<section class="grid cols-2" style="margin-top:18px">' +
        '<div class="card"><div class="card-head"><div><h3>Applications Trend</h3>' +
          '<div class="sub">Submitted vs approved, last 8 months</div></div>' +
          '<span class="badge badge-green">On track</span></div>' +
          '<div class="card-body">' + barChart(data.monthly) + '</div></div>' +
        '<div class="card"><div class="card-head"><div><h3>Approval Pipeline</h3>' +
          '<div class="sub">Applications in each review stage</div></div>' +
          '<a href="approvals.html" style="font-size:.82rem;font-weight:600">Open queue</a></div>' +
          '<div class="card-body">' + pipeline(data.pipeline) + '</div></div>' +
      '</section>' +

      '<section class="grid cols-2" style="margin-top:18px">' +
        '<div class="card"><div class="card-head"><div><h3>Recent Applications</h3>' +
          '<div class="sub">Latest submissions across departments</div></div>' +
          '<a href="applications.html" style="font-size:.82rem;font-weight:600">View all</a></div>' +
          '<div class="card-body p-0">' + recentTable(data.recentApplications) + '</div></div>' +
        '<div class="card"><div class="card-head"><div><h3>Upcoming Sessions</h3>' +
          '<div class="sub">Knowledge sharing schedule</div></div>' +
          '<a href="sessions.html" style="font-size:.82rem;font-weight:600">Calendar</a></div>' +
          '<div class="card-body p-0">' + data.upcomingSessions.map(sessionRow).join('') + '</div></div>' +
      '</section>' +

      '<section class="grid cols-2" style="margin-top:18px">' +
        '<div class="card"><div class="card-head"><div><h3>Recent Activity</h3>' +
          '<div class="sub">Across applications, finance and knowledge</div></div></div>' +
          '<div class="card-body p-0">' + activityFeed(data.activity) + '</div></div>' +
        '<div class="card"><div class="card-head"><h3>Announcements</h3>' +
          '<a href="#" style="font-size:.82rem;font-weight:600">Manage</a></div>' +
          '<div class="card-body p-0">' + announcementList(data.announcements) + '</div></div>' +
      '</section>' +

      '<section class="grid" style="margin-top:18px">' +
        '<div class="card"><div class="card-head"><div><h3>Spend by Department</h3>' +
          '<div class="sub">Approved training expenditure this quarter</div></div>' +
          '<a href="departments.html" style="font-size:.82rem;font-weight:600">Full report</a></div>' +
          '<div class="card-body p-0">' + departmentRows(data.departments) + '</div></div>' +
      '</section>';

    var exportBtn = ui.qs('#dash-export', host);
    if (exportBtn) exportBtn.addEventListener('click', function () {
      ui.toast({ type: 'info', title: 'Export queued', message: 'Your dashboard report will be emailed when ready.' });
    });
    var newBtn = ui.qs('#dash-new', host);
    if (newBtn) newBtn.addEventListener('click', function () {
      window.location.href = 'new-application.html';
    });
  }

  function skeleton() {
    var host = document.getElementById('page-content');
    if (!host) return;
    var cards = '';
    for (var i = 0; i < 4; i++) {
      cards += '<div class="stat"><div class="skeleton" style="height:42px;width:42px;border-radius:12px"></div>' +
        '<div class="skeleton" style="height:12px;width:60%;margin-top:16px"></div>' +
        '<div class="skeleton" style="height:26px;width:45%;margin-top:10px"></div>' +
        '<div class="skeleton" style="height:10px;width:80%;margin-top:12px"></div></div>';
    }
    host.innerHTML = '<div class="page-head"><div><div class="skeleton" style="height:26px;width:280px"></div>' +
      '<div class="skeleton" style="height:12px;width:200px;margin-top:10px"></div></div></div>' +
      '<section class="grid stats">' + cards + '</section>' +
      '<section class="grid cols-2" style="margin-top:18px">' +
        '<div class="card"><div class="skeleton" style="height:240px;margin:20px"></div></div>' +
        '<div class="card"><div class="skeleton" style="height:240px;margin:20px"></div></div>' +
      '</section>';
  }

  function init() {
    var user = LSDS.layout.init({ active: 'dashboard', title: 'Dashboard' });
    if (!user) return;
    skeleton();
    LSDS.api.dashboard.summary().then(function (data) {
      render(data, user);
      var pending = (data.stats.filter(function (s) { return s.key === 'pending'; })[0] || {}).value;
      if (pending) LSDS.layout.setBadge('approvals', pending);
    }).catch(function (err) {
      document.getElementById('page-content').innerHTML =
        '<div class="card"><div class="card-body" style="text-align:center;padding:48px">' +
        '<div style="color:var(--red-500);width:44px;height:44px;margin:0 auto 12px">' + ui.icon('alertTriangle', '') + '</div>' +
        '<h3>Unable to load the dashboard</h3>' +
        '<p class="muted" style="margin-top:6px">' + ui.escapeHtml(err && err.message ? err.message : 'Please try again.') + '</p>' +
        '<button class="btn btn-secondary" style="margin-top:16px" onclick="location.reload()">Retry</button>' +
        '</div></div>';
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
