/* ============================================================================
 * LSDS Admin - Audit Logs
 * ========================================================================== */
(function (window, document) {
  'use strict';

  var LSDS = window.LSDS;
  var ui = LSDS.ui;

  var rows = [];
  var actionKeys = [];
  var entityKeys = [];
  var pageInfo = { total: 0, page: 1, perPage: 15, pages: 1 };
  var totalEvents = 0;
  var state = { q: '', action: '', entity: '', page: 1, perPage: 15 };
  var built = false;

  function actionTone(a) {
    if (/(reject|fail|deactivat|delete|suspend)/.test(a)) return 'red';
    if (/(approv|complet|publish|resolv|creat)/.test(a) && a.indexOf('reject') === -1) return 'green';
    if (/(submit|login|upload|assign)/.test(a)) return 'sky';
    if (/(update|edit|comment|review)/.test(a)) return 'amber';
    return 'gray';
  }

  function stats() {
    return '<div class="grid stats">' +
      ui.statCard({ label: 'Total events', value: totalEvents, icon: 'shield', tone: 'blue', foot: 'All recorded activity' }) +
      ui.statCard({ label: 'Action types', value: actionKeys.length, icon: 'gitBranch', tone: 'sky' }) +
      ui.statCard({ label: 'Entity types', value: entityKeys.length, icon: 'database', tone: 'violet' }) +
      ui.statCard({ label: 'Matching', value: pageInfo.total, icon: 'fileText', tone: 'green', foot: 'Filtered results' }) +
    '</div>';
  }

  function build() {
    document.getElementById('page-content').innerHTML =
      '<div class="page-head">' +
        '<div><h1>Audit Logs</h1><p class="sub">Immutable trail of user and system activity for oversight and compliance.</p></div>' +
        '<div class="page-actions"><button class="btn btn-secondary" id="btn-export">' + ui.icon('download', '') + 'Export CSV</button></div>' +
      '</div>' +
      '<div id="stats-host"></div>' +
      '<div class="card" style="margin-top:22px">' +
        '<div class="toolbar">' +
          '<label class="search-inline">' + ui.icon('search', '') + '<input id="f-q" placeholder="Search description, user or IP\u2026"></label>' +
          '<select class="select-sm" id="f-action"><option value="">All actions</option>' +
            actionKeys.map(function (a) { return '<option value="' + ui.escapeHtml(a) + '">' + ui.escapeHtml(ui.titleCase(a)) + '</option>'; }).join('') + '</select>' +
          '<select class="select-sm" id="f-entity"><option value="">All entities</option>' +
            entityKeys.map(function (e) { return '<option value="' + ui.escapeHtml(e) + '">' + ui.escapeHtml(ui.titleCase(e)) + '</option>'; }).join('') + '</select>' +
          '<span class="grow"></span><span class="muted" id="result-count"></span>' +
        '</div>' +
        '<div id="table-host"></div>' +
        '<div id="pager-host"></div>' +
      '</div>';

    ui.qs('#f-q').addEventListener('input', ui.debounce(function (e) { state.q = e.target.value.trim(); state.page = 1; load(); }, 260));
    ui.qs('#f-action').addEventListener('change', function (e) { state.action = e.target.value; state.page = 1; load(); });
    ui.qs('#f-entity').addEventListener('change', function (e) { state.entity = e.target.value; state.page = 1; load(); });
    ui.qs('#btn-export').addEventListener('click', function () {
      ui.toast({ type: 'info', title: 'Export', message: 'CSV export will be enabled in a later build.' });
    });
    built = true;
  }

  function refresh() {
    ui.qs('#stats-host').innerHTML = stats();
    ui.qs('#result-count').textContent = pageInfo.total + ' event' + (pageInfo.total === 1 ? '' : 's');

    var host = ui.qs('#table-host');
    if (!rows.length) {
      host.innerHTML = '<div class="empty-state"><div class="e-ico">' + ui.icon('shield', '') + '</div>' +
        '<h3>No activity found</h3><p>Adjust the filters to widen your search.</p></div>';
      ui.qs('#pager-host').innerHTML = '';
      return;
    }
    var body = rows.map(function (l) {
      return '<tr>' +
        '<td class="nowrap"><div class="t">' + ui.formatDateTime(l.created_at) + '</div><div class="s muted">' + ui.relativeTime(l.created_at) + '</div></td>' +
        '<td><div class="cell-main"><span class="avatar sm">' + ui.escapeHtml(ui.initials(l.user_name)) + '</span>' +
          '<div><div class="t">' + ui.escapeHtml(l.user_name) + '</div><div class="s muted">' + ui.escapeHtml(l.user_email || '') + '</div></div></div></td>' +
        '<td class="nowrap"><span class="badge badge-' + actionTone(l.action) + '">' + ui.escapeHtml(l.action) + '</span></td>' +
        '<td class="nowrap muted">' + ui.escapeHtml(l.entity_type || '\u2014') + (l.entity_id ? ' #' + l.entity_id : '') + '</td>' +
        '<td>' + ui.escapeHtml(l.description) + '</td>' +
        '<td class="nowrap"><code style="font-size:.76rem;color:var(--gray-500)">' + ui.escapeHtml(l.ip_address || '') + '</code></td>' +
      '</tr>';
    }).join('');
    host.innerHTML = '<div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>When</th><th>User</th><th>Action</th><th>Entity</th><th>Description</th><th>IP</th>' +
      '</tr></thead><tbody>' + body + '</tbody></table></div>';

    var pagerHost = ui.qs('#pager-host');
    pagerHost.innerHTML = '';
    pagerHost.appendChild(ui.pagination({
      total: pageInfo.total, page: pageInfo.page, perPage: pageInfo.perPage, pages: pageInfo.pages,
      onChange: function (p) { state.page = p; load(); }
    }).el);
  }

  function load() {
    LSDS.api.audit.list({ page: state.page, per_page: state.perPage, q: state.q, action: state.action, entity: state.entity })
      .then(function (res) {
        rows = res.data || [];
        pageInfo = { total: res.total, page: res.page, perPage: res.per_page, pages: res.pages };
        if (!built) {
          actionKeys = Object.keys(res.counts || {}).sort();
          entityKeys = Object.keys(res.entities || {}).sort();
          totalEvents = actionKeys.reduce(function (s, k) { return s + res.counts[k]; }, 0);
          build();
        }
        refresh();
      }).catch(function (err) {
        document.getElementById('page-content').innerHTML =
          '<div class="empty-state"><div class="e-ico" style="color:var(--red-500)">' + ui.icon('alertTriangle', '') + '</div>' +
          '<h3>Could not load audit logs</h3><p>' + ui.escapeHtml(err.message) + '</p></div>';
      });
  }

  function init() {
    var user = LSDS.layout.init({ active: 'audit', title: 'Audit Logs' });
    if (!user) return;
    load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
