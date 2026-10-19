/* ============================================================================
 * LSDS Admin - Discussion Forum
 * ========================================================================== */
(function (window, document) {
  'use strict';

  var LSDS = window.LSDS;
  var ui = LSDS.ui;

  var STATUS_OPTIONS = [
    { v: '', l: 'All status' },
    { v: 'open', l: 'Open' },
    { v: 'locked', l: 'Locked' },
    { v: 'archived', l: 'Archived' }
  ];

  var CATEGORIES = [];
  var all = [];
  var departments = [];
  var state = { q: '', status: '', category: '', department: '' };

  function stats(list, totals) {
    return '<div class="grid stats">' +
      ui.statCard({ label: 'Threads', value: totals.threads, icon: 'message', tone: 'blue' }) +
      ui.statCard({ label: 'Replies', value: totals.replies, icon: 'users', tone: 'sky' }) +
      ui.statCard({ label: 'Pinned', value: totals.pinned, icon: 'badgeCheck', tone: 'violet' }) +
      ui.statCard({ label: 'Open', value: list.filter(function (d) { return d.status === 'open'; }).length, icon: 'clock', tone: 'green' }) +
    '</div>';
  }

  function shell() {
    document.getElementById('page-content').innerHTML =
      '<div class="page-head">' +
        '<div><h1>Discussion Forum</h1><p class="sub">Staff discussions, Qs and knowledge sharing across the organisation.</p></div>' +
        '<div class="page-actions"><button class="btn btn-primary" id="btn-new">' + ui.icon('plus', '') + 'New Thread</button></div>' +
      '</div>' +
      stats(all, LSDS.api.__lastForum || { threads: all.length, replies: 0, pinned: all.filter(function (d) { return d.is_pinned; }).length }) +
      '<div class="card" style="margin-top:22px">' +
        '<div class="toolbar">' +
          '<label class="search-inline">' + ui.icon('search', '') + '<input id="f-q" placeholder="Search title or author\u2026"></label>' +
          '<select class="select-sm" id="f-status">' + STATUS_OPTIONS.map(function (o) { return '<option value="' + o.v + '">' + o.l + '</option>'; }).join('') + '</select>' +
          '<select class="select-sm" id="f-category"><option value="">All categories</option>' + CATEGORIES.map(function (c) { return '<option value="' + ui.escapeHtml(c) + '">' + ui.escapeHtml(c) + '</option>'; }).join('') + '</select>' +
          '<select class="select-sm" id="f-dept"><option value="">All departments</option>' + departments.map(function (d) { return '<option value="' + d.code + '">' + ui.escapeHtml(d.name) + '</option>'; }).join('') + '</select>' +
          '<span class="grow"></span><span class="muted" id="result-count"></span>' +
        '</div>' +
        '<div id="list-host"></div>' +
      '</div>';

    ui.qs('#btn-new').addEventListener('click', openCreate);
    ui.qs('#f-q').addEventListener('input', ui.debounce(function (e) { state.q = e.target.value.trim(); draw(); }, 240));
    ui.qs('#f-status').addEventListener('change', function (e) { state.status = e.target.value; draw(); });
    ui.qs('#f-category').addEventListener('change', function (e) { state.category = e.target.value; draw(); });
    ui.qs('#f-dept').addEventListener('change', function (e) { state.department = e.target.value; draw(); });
  }

  function filtered() {
    var q = state.q.toLowerCase();
    return all.filter(function (d) {
      if (state.status && d.status !== state.status) return false;
      if (state.category && d.category !== state.category) return false;
      if (state.department && d.department_code !== state.department) return false;
      if (q && (d.title + ' ' + d.author_name).toLowerCase().indexOf(q) === -1) return false;
      return true;
    }).sort(function (x, y) {
      if (y.is_pinned !== x.is_pinned) return y.is_pinned - x.is_pinned;
      return new Date(y.last_activity_at) - new Date(x.last_activity_at);
    });
  }

  function draw() {
    var list = filtered();
    ui.qs('#result-count').textContent = list.length + ' thread' + (list.length === 1 ? '' : 's');
    var host = ui.qs('#list-host');
    if (!list.length) {
      host.innerHTML = '<div class="empty-state"><div class="e-ico">' + ui.icon('message', '') + '</div><h3>No threads found</h3><p>Adjust the filters to widen your search.</p></div>';
      return;
    }
    var rows = list.map(function (d) {
      var badgePinned = d.is_pinned ? ' <span class="badge badge-violet">Pinned</span>' : '';
      return '<div class="doc-row">' +
        '<span class="doc-ico">' + ui.icon('message', '') + '</span>' +
        '<div class="doc-main">' +
          '<div class="t">' + ui.escapeHtml(d.title) + badgePinned + '</div>' +
          '<div class="s muted">' + ui.escapeHtml(d.category || '\u2014') + ' \u00b7 ' + ui.escapeHtml(d.department) + ' \u00b7 by ' + ui.escapeHtml(d.author_name) + '</div>' +
          '<div class="s muted" style="margin-top:2px">' + d.reply_count + ' replies \u00b7 ' + ui.formatNumber(d.view_count) + ' views \u00b7 Last activity: ' + ui.relativeTime(d.last_activity_at) + '</div>' +
        '</div>' +
        '<div class="nowrap">' + ui.badge(d.status) + '</div>' +
        '<div class="nowrap"><a class="link-strong" data-view="' + d.id + '">Details</a></div>' +
      '</div>';
    }).join('');
    host.innerHTML = '<div style="padding:0 18px">' + rows + '</div>';

    ui.qsa('[data-view]', host).forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        openDetail(a.getAttribute('data-view'));
      });
    });
  }

  function openDetail(id) {
    ui.modal({ title: 'Thread details', size: 'lg', body: '<div class="skeleton" style="height:120px"></div>' });
    LSDS.api.discussions.get(id).then(function (d) {
      var replies = (d.replies || []).map(function (r) {
        return '<div style="border-top:1px solid var(--border);padding:14px 0">' +
          '<div class="person" style="margin-bottom:8px"><span class="avatar sm">' + ui.escapeHtml(ui.initials(r.author_name)) + '</span>' +
            '<div><div class="p-name">' + ui.escapeHtml(r.author_name) + '</div><div class="p-sub">' + ui.relativeTime(r.created_at) + (r.is_accepted_answer ? ' \u00b7 Accepted answer' : '') + '</div></div>' +
          '</div>' +
          '<div class="prose">' + ui.escapeHtml(r.body) + '</div>' +
        '</div>';
      }).join('');
      var body =
        '<div class="stack-sm">' +
          '<div><div style="font-size:1.02rem;font-weight:650;color:var(--gray-900)">' + ui.escapeHtml(d.title) + '</div>' +
            '<div style="margin-top:6px">' + ui.badge(d.status) + (d.is_pinned ? ' <span class="badge badge-violet">Pinned</span>' : '') + '</div></div>' +
          '<p class="prose">' + ui.escapeHtml(d.body) + '</p>' +
          '<div class="muted" style="font-size:.84rem">By ' + ui.escapeHtml(d.author_name) + ' \u00b7 ' + ui.escapeHtml(d.department) + ' \u00b7 ' + ui.formatDateTime(d.created_at) + ' \u00b7 ' + d.reply_count + ' replies</div>' +
          '<div style="margin-top:10px"><div class="section-title">Replies</div>' + (replies || '<p class="muted">No replies yet.</p>') + '</div>' +
        '</div>';
      var overlay = document.querySelector('.modal-overlay .modal');
      if (overlay) {
        var bodyEl = overlay.querySelector('.modal-body');
        if (bodyEl) bodyEl.innerHTML = body;
        var head = overlay.querySelector('.modal-head h3');
        if (head) head.textContent = 'Thread details';
      }
    }).catch(function (err) {
      var bodyEl = document.querySelector('.modal-overlay .modal-body');
      if (bodyEl) bodyEl.innerHTML = '<p class="muted">' + ui.escapeHtml(err.message) + '</p>';
    });
  }

  function openCreate() {
    LSDS.api.departments.list().then(function (res) {
      var depts = (res.data || []).map(function (d) { return { v: d.code, l: d.name }; });
      var cats = CATEGORIES.length ? CATEGORIES.slice() : ['Staff Training and Development', 'Technical Support', 'Information Security'];
      ui.formModal({
        title: 'New thread',
        submitLabel: 'Post thread',
        fields: [
          { name: 'title', label: 'Title', required: true, placeholder: 'e.g. Best practices for the approval workflow' },
          { name: 'category', label: 'Category', type: 'select', half: true,
            options: [{ v: '', l: 'Select a category\u2026' }].concat(cats.map(function (c) { return { v: c, l: c }; })) },
          { name: 'department_code', label: 'Department', type: 'select', half: true, options: depts },
          { name: 'status', label: 'Status', type: 'select', half: true, value: 'open',
            options: [{ v: 'open', l: 'Open' }, { v: 'locked', l: 'Locked' }, { v: 'archived', l: 'Archived' }] },
          { name: 'tags', label: 'Tags', half: true, placeholder: 'Comma or newline separated' },
          { name: 'body', label: 'Message', type: 'textarea', rows: 5, required: true, placeholder: 'Share your question or update\u2026' },
          { name: 'is_sticky', label: 'Pin', type: 'checkbox', checkboxLabel: 'Pin this thread to the top' }
        ],
        onSubmit: function (values) {
          return LSDS.api.discussions.create(values).then(function (created) {
            ui.toast({ type: 'success', title: 'Thread posted', message: created.title + ' is now live.' });
            load();
          });
        }
      });
    }).catch(function (err) {
      ui.toast({ type: 'error', title: 'Could not open form', message: err.message });
    });
  }

  function load() {
    document.getElementById('page-content').innerHTML =
      '<div class="stack"><div class="grid stats">' +
        '<div class="skeleton" style="height:100px"></div><div class="skeleton" style="height:100px"></div>' +
        '<div class="skeleton" style="height:100px"></div><div class="skeleton" style="height:100px"></div></div>' +
        '<div class="skeleton" style="height:300px"></div></div>';

    Promise.all([
      LSDS.api.discussions.list(),
      LSDS.data.build()
    ]).then(function (results) {
      var res = results[0], db = results[1];
      all = res.data || [];
      LSDS.api.__lastForum = res;
      departments = db.departments || [];
      CATEGORIES = [];
      all.forEach(function (d) { if (d.category && CATEGORIES.indexOf(d.category) === -1) CATEGORIES.push(d.category); });
      CATEGORIES.sort();
      shell();
      draw();
    }).catch(function (err) {
      document.getElementById('page-content').innerHTML =
        '<div class="empty-state"><div class="e-ico" style="color:var(--red-500)">' + ui.icon('alertTriangle', '') + '</div>' +
        '<h3>Could not load discussions</h3><p>' + ui.escapeHtml(err.message) + '</p></div>';
    });
  }

  function init() {
    var user = LSDS.layout.init({ active: 'forum', title: 'Discussion Forum' });
    if (!user) return;
    load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
