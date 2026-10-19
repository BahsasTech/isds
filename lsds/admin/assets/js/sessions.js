/* ============================================================================
 * LSDS Admin - Knowledge Sharing Sessions
 * ========================================================================== */
(function (window, document) {
  'use strict';

  var LSDS = window.LSDS;
  var ui = LSDS.ui;

  var STATUS_OPTIONS = [
    { v: '', l: 'All statuses' }, { v: 'draft', l: 'Draft' }, { v: 'published', l: 'Published' },
    { v: 'postponed', l: 'Postponed' }, { v: 'cancelled', l: 'Cancelled' }, { v: 'completed', l: 'Completed' }
  ];
  var TIMING_OPTIONS = [
    { v: '', l: 'All dates' }, { v: 'upcoming', l: 'Upcoming' }, { v: 'past', l: 'Past' }
  ];

  var all = [];
  var state = { q: '', status: '', timing: '' };

  function isUpcoming(s) { return new Date(s.session_date + 'T23:59:59').getTime() >= Date.now(); }

  function stats(list) {
    var upcoming = list.filter(function (s) { return s.status === 'published' && isUpcoming(s); }).length;
    var registrations = list.reduce(function (t, s) { return t + s.registered; }, 0);
    var rated = list.filter(function (s) { return s.status === 'completed' && s.feedback_count > 0; });
    var avg = rated.length ? Math.round((rated.reduce(function (t, s) { return t + s.avg_rating; }, 0) / rated.length) * 10) / 10 : '\u2014';
    return '<div class="grid stats">' +
      ui.statCard({ label: 'Total sessions', value: list.length, icon: 'presentation', tone: 'blue', foot: 'Across all departments' }) +
      ui.statCard({ label: 'Upcoming', value: upcoming, icon: 'calendar', tone: 'violet', foot: 'Published and scheduled' }) +
      ui.statCard({ label: 'Registrations', value: registrations, icon: 'users', tone: 'sky', foot: 'All time' }) +
      ui.statCard({ label: 'Avg. feedback', value: avg, icon: 'badgeCheck', tone: 'green', foot: 'Rated sessions only' }) +
    '</div>';
  }

  function shell() {
    document.getElementById('page-content').innerHTML =
      '<div class="page-head">' +
        '<div><h1>Knowledge Sessions</h1>' +
          '<p class="sub">Workshops, briefings and knowledge transfer sessions across the organisation.</p></div>' +
        '<div class="page-actions"><button class="btn btn-primary" id="btn-new">' + ui.icon('plus', '') + 'New Session</button></div>' +
      '</div>' +
      stats(all) +
      '<div class="card" style="margin-top:22px">' +
        '<div class="toolbar">' +
          '<label class="search-inline">' + ui.icon('search', '') +
            '<input id="f-q" type="search" placeholder="Search title, topic or presenter\u2026"></label>' +
          '<select class="select-sm" id="f-status">' + STATUS_OPTIONS.map(function (o) {
            return '<option value="' + o.v + '">' + o.l + '</option>'; }).join('') + '</select>' +
          '<select class="select-sm" id="f-timing">' + TIMING_OPTIONS.map(function (o) {
            return '<option value="' + o.v + '">' + o.l + '</option>'; }).join('') + '</select>' +
          '<span class="grow"></span>' +
          '<span class="muted" id="result-count"></span>' +
        '</div>' +
        '<div id="table-host"></div>' +
      '</div>';

    ui.qs('#btn-new').addEventListener('click', openCreate);
    ui.qs('#f-q').addEventListener('input', ui.debounce(function (e) { state.q = e.target.value.trim(); draw(); }, 240));
    ui.qs('#f-status').addEventListener('change', function (e) { state.status = e.target.value; draw(); });
    ui.qs('#f-timing').addEventListener('change', function (e) { state.timing = e.target.value; draw(); });
  }

  function filtered() {
    var q = state.q.toLowerCase();
    return all.filter(function (s) {
      if (state.status && s.status !== state.status) return false;
      if (state.timing === 'upcoming' && !isUpcoming(s)) return false;
      if (state.timing === 'past' && isUpcoming(s)) return false;
      if (q && (s.title + ' ' + s.topic + ' ' + s.presenter_name + ' ' + s.organizing_department).toLowerCase().indexOf(q) === -1) return false;
      return true;
    }).sort(function (x, y) { return new Date(x.session_date) - new Date(y.session_date); });
  }

  function capacityBar(s) {
    var pct = Math.min(100, s.fill_pct);
    var tone = s.fill_pct >= 100 ? 'background:var(--red-500)' : s.fill_pct >= 85 ? 'background:var(--amber-500)' : '';
    return '<div style="min-width:130px">' +
      '<div style="display:flex;justify-content:space-between;font-size:.76rem;margin-bottom:5px">' +
        '<span class="muted">' + s.registered + ' / ' + s.max_attendance + '</span>' +
        '<b style="color:' + (s.fill_pct >= 100 ? 'var(--red-600)' : 'var(--gray-700)') + '">' + s.fill_pct + '%</b></div>' +
      '<div class="bar"><span style="width:' + pct + '%;' + tone + '"></span></div></div>';
  }

  function draw() {
    var list = filtered();
    ui.qs('#result-count').textContent = list.length + ' session' + (list.length === 1 ? '' : 's');
    var host = ui.qs('#table-host');
    if (!list.length) {
      host.innerHTML = '<div class="empty-state"><div class="e-ico">' + ui.icon('presentation', '') + '</div>' +
        '<h3>No sessions found</h3><p>Adjust the filters to widen your search.</p></div>';
      return;
    }
    var rows = list.map(function (s) {
      return '<tr class="row-link" data-id="' + s.id + '">' +
        '<td><div class="t" style="font-weight:600">' + ui.escapeHtml(s.title) + '</div>' +
          '<div class="s muted">' + ui.escapeHtml(s.topic) + ' &middot; ' + ui.escapeHtml(s.organizing_department) + '</div></td>' +
        '<td class="nowrap"><div class="t">' + ui.formatDate(s.session_date) + '</div>' +
          '<div class="s muted">' + ui.escapeHtml(s.start_time) + '\u2013' + ui.escapeHtml(s.end_time) + '</div></td>' +
        '<td><div class="cell-main"><span class="avatar sm">' + ui.escapeHtml(ui.initials(s.presenter_name)) + '</span>' +
          '<div class="t">' + ui.escapeHtml(s.presenter_name) + '</div></div></td>' +
        '<td class="nowrap"><span class="badge badge-' + (s.mode === 'Online' ? 'violet' : s.mode === 'Hybrid' ? 'blue' : 'sky') + '">' +
          ui.escapeHtml(s.mode) + '</span></td>' +
        '<td>' + capacityBar(s) + '</td>' +
        '<td>' + ui.badge(s.status) + '</td>' +
        '<td class="nowrap text-right"><a class="link-strong" data-view="' + s.id + '">Details</a></td>' +
      '</tr>';
    }).join('');
    host.innerHTML = '<div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>Session</th><th>Schedule</th><th>Presenter</th><th>Mode</th><th>Capacity</th><th>Status</th><th></th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>';

    ui.qsa('tr[data-id]', host).forEach(function (tr) {
      tr.addEventListener('click', function (e) {
        if (e.target.closest('a')) e.preventDefault();
        openDetail(tr.getAttribute('data-id'));
      });
    });
  }

  function openDetail(id) {
    ui.modal({
      title: 'Session details',
      size: 'lg',
      body: '<div style="padding:4px 0 8px"><div class="skeleton" style="height:120px"></div></div>',
      actions: [{ label: 'Close', class: 'btn-secondary', onClick: function (h) { h.close(); } }]
    });
    LSDS.api.sessions.get(id).then(function (s) {
      var loc = s.venue || s.online_meeting_url;
      var pct = Math.min(100, s.fill_pct);
      var body =
        '<div style="margin-bottom:16px"><div style="font-size:1.05rem;font-weight:650;color:var(--gray-900)">' + ui.escapeHtml(s.title) + '</div>' +
          '<div style="margin-top:8px">' + ui.badge(s.status) + ' <span class="badge badge-sky">' + ui.escapeHtml(s.mode) + '</span></div></div>' +
        '<p class="prose">' + ui.escapeHtml(s.description) + '</p>' +
        '<dl class="kv" style="margin-top:16px">' +
          '<dt>Topic</dt><dd>' + ui.escapeHtml(s.topic) + '</dd>' +
          '<dt>Presenter</dt><dd>' + ui.escapeHtml(s.presenter_name) + '</dd>' +
          '<dt>Department</dt><dd>' + ui.escapeHtml(s.organizing_department) + '</dd>' +
          '<dt>When</dt><dd>' + ui.formatDate(s.session_date) + ', ' + ui.escapeHtml(s.start_time) + '\u2013' + ui.escapeHtml(s.end_time) + '</dd>' +
          '<dt>' + (s.venue ? 'Venue' : 'Meeting link') + '</dt><dd>' + ui.escapeHtml(loc || '\u2014') + '</dd>' +
          '<dt>Audience</dt><dd>' + ui.escapeHtml(s.target_audience) + '</dd>' +
          '<dt>Registration closes</dt><dd>' + ui.formatDate(s.registration_deadline) + '</dd>' +
          '<dt>Feedback</dt><dd>' + (s.feedback_count ? ui.formatNumber(s.avg_rating) + ' / 5 (' + s.feedback_count + ' responses)' : 'No feedback yet') + '</dd>' +
        '</dl>' +
        '<div style="margin-top:18px">' +
          '<div style="display:flex;justify-content:space-between;font-size:.82rem;margin-bottom:6px">' +
            '<span class="muted">Capacity</span><b>' + s.registered + ' registered of ' + s.max_attendance + '</b></div>' +
          '<div class="bar"><span style="width:' + pct + '%"></span></div>' +
          (s.attended ? '<div class="muted" style="font-size:.8rem;margin-top:8px">' + s.attended + ' attended \u00b7 ' +
            Math.round((s.attended / (s.registered || 1)) * 100) + '% attendance</div>' : '') +
        '</div>';
      var overlay = document.querySelector('.modal-overlay .modal');
      if (overlay) {
        var bodyEl = overlay.querySelector('.modal-body');
        if (bodyEl) bodyEl.innerHTML = body;
        var head = overlay.querySelector('.modal-head h3');
        if (head) head.textContent = s.title;
      }
    }).catch(function (err) {
      var overlay = document.querySelector('.modal-overlay .modal-body');
      if (overlay) overlay.innerHTML = '<p class="muted">' + ui.escapeHtml(err.message) + '</p>';
    });
  }

  function openCreate() {
    LSDS.api.departments.list().then(function (res) {
      var depts = (res.data || []).map(function (d) { return { v: d.code, l: d.name }; });
      ui.formModal({
        title: 'Schedule knowledge session',
        submitLabel: 'Create session',
        fields: [
          { name: 'title', label: 'Session title', required: true, placeholder: 'e.g. Zero Trust Network Architecture' },
          { name: 'topic', label: 'Topic', half: true, placeholder: 'e.g. Network security' },
          { name: 'mode', label: 'Mode', type: 'select', half: true, value: 'Online',
            options: [{ v: 'Online', l: 'Online' }, { v: 'In-person', l: 'In-person' }, { v: 'Hybrid', l: 'Hybrid' }] },
          { name: 'session_date', label: 'Session date', type: 'date', half: true },
          { name: 'start_time', label: 'Start time', type: 'time', half: true, value: '10:00' },
          { name: 'end_time', label: 'End time', type: 'time', half: true, value: '12:00' },
          { name: 'venue', label: 'Venue (in-person / hybrid)', half: true, placeholder: 'Auditorium, Block C' },
          { name: 'presenter_name', label: 'Presenter', half: true, placeholder: 'Defaults to you' },
          { name: 'department_code', label: 'Organising department', type: 'select', half: true, options: depts },
          { name: 'target_audience', label: 'Target audience', half: true, value: 'All Staff' },
          { name: 'registration_deadline', label: 'Registration deadline', type: 'date', half: true },
          { name: 'max_attendance', label: 'Maximum attendance', type: 'number', half: true, min: 0, step: 1 },
          { name: 'status', label: 'Status', type: 'select', half: true, value: 'published',
            options: [{ v: 'published', l: 'Published' }, { v: 'draft', l: 'Save as draft' }] },
          { name: 'description', label: 'Description', type: 'textarea', rows: 3, placeholder: 'What will the session cover?' }
        ],
        onSubmit: function (values) {
          return LSDS.api.sessions.create(values).then(function (created) {
            ui.toast({ type: 'success', title: 'Session created',
              message: created.title + ' has been ' + (created.status === 'draft' ? 'saved as a draft.' : 'published.') });
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
    LSDS.api.sessions.list().then(function (res) {
      all = res.data || [];
      shell();
      draw();
    }).catch(function (err) {
      document.getElementById('page-content').innerHTML =
        '<div class="empty-state"><div class="e-ico" style="color:var(--red-500)">' + ui.icon('alertTriangle', '') + '</div>' +
        '<h3>Could not load sessions</h3><p>' + ui.escapeHtml(err.message) + '</p></div>';
    });
  }

  function init() {
    var user = LSDS.layout.init({ active: 'sessions', title: 'Knowledge Sessions' });
    if (!user) return;
    load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
