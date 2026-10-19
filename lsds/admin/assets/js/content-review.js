/* ============================================================================
 * LSDS Admin - Content Review (unified queue of uploads awaiting a decision)
 * ========================================================================== */
(function (window, document) {
  'use strict';

  var LSDS = window.LSDS;
  var ui = LSDS.ui;

  var items = [];
  var totals = { documents: 0, videos: 0, total: 0 };
  var state = { type: '', q: '' };

  function daysWaiting(iso) {
    if (!iso) return 0;
    var then = new Date(iso).getTime();
    if (isNaN(then)) return 0;
    return Math.max(0, Math.floor((Date.now() - then) / 86400000));
  }

  function daysBadge(n) {
    if (n <= 1) return '<span class="badge badge-green">' + n + 'd</span>';
    if (n <= 5) return '<span class="badge badge-amber">' + n + 'd</span>';
    return '<span class="badge badge-red">' + n + 'd</span>';
  }

  function statCards(list) {
    var oldest = list.reduce(function (m, it) { return Math.max(m, daysWaiting(it.submitted_at)); }, 0);
    var items4 = [
      { label: 'Awaiting decision', value: list.length, icon: 'clock', tone: 'amber', foot: 'Documents and videos' },
      { label: 'Documents', value: totals.documents, icon: 'folder', tone: 'blue', foot: 'Pending in repository' },
      { label: 'Videos', value: totals.videos, icon: 'play', tone: 'violet', foot: 'Pending in library' },
      { label: 'Oldest waiting', value: oldest + 'd', icon: 'alertTriangle', tone: 'red', foot: 'Longest in queue' }
    ];
    return '<div class="grid stats">' + items4.map(function (s) {
      return ui.statCard({ label: s.label, value: s.value, icon: s.icon, tone: s.tone, foot: s.foot });
    }).join('') + '</div>';
  }

  function shell() {
    document.getElementById('page-content').innerHTML =
      '<div class="page-head">' +
        '<div><h1>Content Review</h1>' +
          '<p class="sub">Uploaded documents and videos waiting for an approve, return or reject decision.</p></div>' +
        '<div class="page-actions"><button class="btn btn-secondary" id="btn-refresh">' + ui.icon('refresh', '') + 'Refresh</button></div>' +
      '</div>' +
      '<div id="stats-host"></div>' +
      '<div class="card" style="margin-top:22px">' +
        '<div class="toolbar">' +
          '<label class="search-inline">' + ui.icon('search', '') +
            '<input id="f-q" type="search" placeholder="Search title, owner or department\u2026"></label>' +
          '<select class="select-sm" id="f-type">' +
            '<option value="">All content</option>' +
            '<option value="document">Documents</option>' +
            '<option value="video">Videos</option>' +
          '</select>' +
          '<span class="grow"></span>' +
          '<span class="muted" id="result-count"></span>' +
        '</div>' +
        '<div id="table-host"></div>' +
      '</div>';

    ui.qs('#btn-refresh').addEventListener('click', load);
    ui.qs('#f-q').addEventListener('input', ui.debounce(function (e) { state.q = e.target.value.trim(); draw(); }, 240));
    ui.qs('#f-type').addEventListener('change', function (e) { state.type = e.target.value; draw(); });
  }

  function filtered() {
    var q = state.q.toLowerCase();
    return items.filter(function (it) {
      if (state.type && it.type !== state.type) return false;
      if (q) {
        var text = (it.title + ' ' + (it.author_name || '') + ' ' + (it.department || '') + ' ' +
          (it.tags || []).join(' ')).toLowerCase();
        if (text.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function draw() {
    var list = filtered();
    var countEl = ui.qs('#result-count');
    if (countEl) countEl.textContent = list.length + ' item' + (list.length === 1 ? '' : 's');
    var statsHost = ui.qs('#stats-host');
    if (statsHost) statsHost.innerHTML = statCards(items);

    var host = ui.qs('#table-host');
    if (!host) return;
    if (!list.length) {
      host.innerHTML = '<div class="empty-state"><div class="e-ico" style="color:var(--green-500)">' + ui.icon('checkCircle', '') + '</div>' +
        '<h3>Nothing awaiting review</h3><p>' +
        (items.length ? 'No items match the current filters.' : 'Every uploaded document and video has had a decision.') +
        '</p></div>';
      return;
    }

    var rows = list.map(function (it) {
      var tags = (it.tags || []).slice(0, 3).map(function (t) { return '<span class="chip">' + ui.escapeHtml(t) + '</span>'; }).join(' ');
      return '<tr>' +
        '<td><div class="t truncate" style="font-weight:600;max-width:300px">' + ui.escapeHtml(it.title) + '</div>' +
          '<div class="s">' + ui.escapeHtml(it.category || '\u2014') + ' \u00b7 ' + ui.escapeHtml(it.author_name || '\u2014') +
          (tags ? ' \u00b7 ' + tags : '') + '</div></td>' +
        '<td class="nowrap"><span class="badge ' + (it.type === 'video' ? 'badge-violet' : 'badge-sky') + '">' +
          (it.type === 'video' ? 'Video' : 'Document') + '</span></td>' +
        '<td class="nowrap">' + ui.escapeHtml(it.department || '\u2014') + '</td>' +
        '<td class="nowrap">' + ui.formatDate(it.submitted_at) + '</td>' +
        '<td class="nowrap">' + daysBadge(daysWaiting(it.submitted_at)) + '</td>' +
        '<td class="nowrap text-right">' +
          (LSDS.review ? LSDS.review.actionsHtml(it.type, it, ['approve', 'return', 'reject']) : '') +
        '</td>' +
      '</tr>';
    }).join('');

    host.innerHTML = '<div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>Content</th><th>Type</th><th>Department</th><th>Submitted</th><th>Waiting</th><th class="text-right">Decision</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>';

    if (LSDS.review) {
      LSDS.review.bindActions(host, function () { load(); });
    }
  }

  function denied() {
    document.getElementById('page-content').innerHTML =
      '<div class="empty-state"><div class="e-ico" style="color:var(--red-500)">' + ui.icon('lock', '') + '</div>' +
      '<h3>You cannot review content</h3><p>Only the System Administrator and the Knowledge Manager can make review decisions.</p></div>';
  }

  function load() {
    var host = ui.qs('#table-host');
    if (host) host.innerHTML = '<div style="padding:20px"><div class="skeleton" style="height:180px"></div></div>';
    LSDS.api.reviews.queue().then(function (res) {
      items = res.data || [];
      totals = res.totals || { documents: 0, videos: 0, total: items.length };
      if (LSDS.layout && LSDS.layout.setBadge) LSDS.layout.setBadge('review', items.length);
      draw();
    }).catch(function (err) {
      if (host) {
        host.innerHTML = '<div class="empty-state"><div class="e-ico" style="color:var(--red-500)">' + ui.icon('alertTriangle', '') + '</div>' +
          '<h3>Could not load the review queue</h3><p>' + ui.escapeHtml(err.message) + '</p></div>';
      }
    });
  }

  function init() {
    var user = LSDS.layout.init({ active: 'review', title: 'Content Review' });
    if (!user) return;
    if (!LSDS.review || !LSDS.review.canReview()) { denied(); return; }
    shell();
    load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
