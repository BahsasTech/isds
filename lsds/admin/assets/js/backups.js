/* ============================================================================
 * LSDS Admin - Backups
 * ========================================================================== */
(function (window, document) {
  'use strict';

  var LSDS = window.LSDS;
  var ui = LSDS.ui;

  var rows = [];
  var totals = { count: 0, completed: 0, failed: 0, last_size: 0 };
  var statusCounts = {};
  var typeCounts = {};
  var state = { status: '', type: '' };
  var built = false;

  function formatBytes(bytes) {
    if (!bytes) return '\u2014';
    var units = ['B', 'KB', 'MB', 'GB', 'TB'];
    var i = 0, n = bytes;
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
    return (i === 0 ? n : n.toFixed(1)) + ' ' + units[i];
  }

  function statusTone(s) {
    return s === 'completed' ? 'green' : s === 'failed' ? 'red' : s === 'running' ? 'sky' : 'gray';
  }

  function stats() {
    return '<div class="grid stats">' +
      ui.statCard({ label: 'Total backups', value: totals.count, icon: 'database', tone: 'blue', foot: totals.completed + ' completed' }) +
      ui.statCard({ label: 'Completed', value: totals.completed, icon: 'checkCircle', tone: 'green', foot: 'Last: ' + formatBytes(totals.last_size) }) +
      ui.statCard({ label: 'Failed', value: totals.failed, icon: 'alertTriangle', tone: 'red', foot: 'Requires attention' }) +
      ui.statCard({ label: 'Snapshot size', value: formatBytes(totals.last_size), icon: 'database', tone: 'violet', foot: 'Most recent full backup' }) +
    '</div>';
  }

  function shell() {
    var statuses = ['completed', 'running', 'failed'];
    var types = Object.keys(typeCounts).sort();
    document.getElementById('page-content').innerHTML =
      '<div class="page-head">' +
        '<div><h1>Backups</h1><p class="sub">Scheduled and on-demand snapshots of the database, documents, videos and configuration.</p></div>' +
        '<div class="page-actions"><button class="btn btn-primary" id="btn-run">' + ui.icon('refresh', '') + 'Run Backup</button></div>' +
      '</div>' +
      stats() +
      '<div class="card" style="margin-top:22px">' +
        '<div class="toolbar">' +
          '<span class="tb-title">Backup history</span>' +
          '<span class="grow"></span>' +
          '<select class="select-sm" id="f-status"><option value="">All statuses</option>' +
            statuses.map(function (s) { return '<option value="' + s + '">' + ui.escapeHtml(ui.titleCase(s)) + '</option>'; }).join('') + '</select>' +
          '<select class="select-sm" id="f-type"><option value="">All types</option>' +
            types.map(function (t) { return '<option value="' + ui.escapeHtml(t) + '">' + ui.escapeHtml(ui.titleCase(t)) + '</option>'; }).join('') + '</select>' +
        '</div>' +
        '<div id="table-host"></div>' +
      '</div>';

    ui.qs('#f-status').addEventListener('change', function (e) { state.status = e.target.value; load(); });
    ui.qs('#f-type').addEventListener('change', function (e) { state.type = e.target.value; load(); });
    ui.qs('#btn-run').addEventListener('click', function () {
      ui.confirm({ title: 'Run backup now', message: 'Start an on-demand full backup of the LSDS database? This may take a few minutes.', confirmLabel: 'Run backup' })
        .then(function (ok) {
          if (ok) ui.toast({ type: 'success', title: 'Backup started', message: 'A full backup has been queued.' });
        });
    });
  }

  function drawTable() {
    var host = ui.qs('#table-host');
    if (!rows.length) {
      host.innerHTML = '<div class="empty-state"><div class="e-ico">' + ui.icon('database', '') + '</div><h3>No backups found</h3><p>Try a different filter.</p></div>';
      return;
    }
    var body = rows.map(function (b) {
      var scheduled = b.triggered_by_name === 'Scheduled' || !b.triggered_by;
      return '<tr>' +
        '<td class="nowrap"><div class="t">' + ui.formatDateTime(b.started_at) + '</div><div class="s muted">' + ui.relativeTime(b.started_at) + '</div></td>' +
        '<td class="nowrap"><span class="badge badge-sky">' + ui.escapeHtml(ui.titleCase(b.backup_type)) + '</span></td>' +
        '<td class="nowrap"><span class="badge badge-' + statusTone(b.status) + '">' + ui.escapeHtml(ui.titleCase(b.status)) + '</span></td>' +
        '<td class="nowrap">' + formatBytes(b.file_size_bytes) + '</td>' +
        '<td class="nowrap muted">' + (b.duration_minutes ? b.duration_minutes + ' min' : '\u2014') + '</td>' +
        '<td>' + (b.error_message
            ? '<span style="color:var(--red-600);font-size:.84rem">' + ui.escapeHtml(b.error_message) + '</span>'
            : '<code style="font-size:.74rem;color:var(--gray-500)">' + ui.escapeHtml(b.file_path || '\u2014') + '</code>') + '</td>' +
        '<td class="nowrap"><span class="badge badge-' + (scheduled ? 'gray' : 'violet') + '">' + ui.escapeHtml(b.triggered_by_name) + '</span></td>' +
      '</tr>';
    }).join('');
    host.innerHTML = '<div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>Started</th><th>Type</th><th>Status</th><th>Size</th><th>Duration</th><th>Destination / Notes</th><th>Triggered by</th>' +
      '</tr></thead><tbody>' + body + '</tbody></table></div>';
  }

  function load() {
    LSDS.api.backups.list({ status: state.status, type: state.type })
      .then(function (res) {
        rows = res.data || [];
        totals = res.totals || totals;
        statusCounts = res.counts || {};
        typeCounts = res.types || {};
        if (!built) { shell(); built = true; }
        ui.qs('.grid.stats').outerHTML = stats();
        drawTable();
      }).catch(function (err) {
        document.getElementById('page-content').innerHTML =
          '<div class="empty-state"><div class="e-ico" style="color:var(--red-500)">' + ui.icon('alertTriangle', '') + '</div>' +
          '<h3>Could not load backups</h3><p>' + ui.escapeHtml(err.message) + '</p></div>';
      });
  }

  function init() {
    var user = LSDS.layout.init({ active: 'backups', title: 'Backups' });
    if (!user) return;
    load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
