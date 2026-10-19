/* ============================================================================
 * LSDS Admin - Meetings
 * ========================================================================== */
(function (window, document) {
  'use strict';

  var LSDS = window.LSDS;
  var ui = LSDS.ui;

  var STATUS_OPTIONS = [
    { v: '', l: 'All status' }, { v: 'scheduled', l: 'Scheduled' },
    { v: 'live', l: 'Live' }, { v: 'ended', l: 'Ended' }, { v: 'cancelled', l: 'Cancelled' }
  ];
  var PROVIDER_OPTIONS = [
    { v: '', l: 'All providers' }, { v: 'jitsi', l: 'Jitsi' },
    { v: 'zoom', l: 'Zoom' }, { v: 'teams', l: 'Microsoft Teams' }, { v: 'other', l: 'Other' }
  ];
  var TIMING_OPTIONS = [
    { v: '', l: 'All dates' }, { v: 'upcoming', l: 'Upcoming' }, { v: 'past', l: 'Past' }
  ];

  var departments = [];
  var all = [];
  var state = { q: '', status: '', provider: '', department: '', timing: '' };

  function providerTone(p) {
    return p === 'zoom' ? 'blue' : p === 'teams' ? 'violet' : p === 'jitsi' ? 'sky' : 'gray';
  }

  function stats(res) {
    var t = res.totals || { count: all.length, live: 0, scheduled: 0, recordings: 0 };
    return '<div class="grid stats">' +
      ui.statCard({ label: 'Meetings', value: t.count, icon: 'video', tone: 'blue' }) +
      ui.statCard({ label: 'Scheduled', value: t.scheduled, icon: 'calendar', tone: 'sky' }) +
      ui.statCard({ label: 'Live now', value: t.live, icon: 'presentation', tone: 'red' }) +
      ui.statCard({ label: 'Recordings', value: t.recordings, icon: 'play', tone: 'violet' }) +
    '</div>';
  }

  function shell(res) {
    document.getElementById('page-content').innerHTML =
      '<div class="page-head">' +
        '<div><h1>Meetings</h1><p class="sub">Video-conferencing meetings, participants and recordings.</p></div>' +
        '<div class="page-actions"><button class="btn btn-primary" id="btn-new">' + ui.icon('plus', '') + 'Schedule Meeting</button></div>' +
      '</div>' +
      stats(res) +
      '<div class="card" style="margin-top:22px">' +
        '<div class="toolbar">' +
          '<label class="search-inline">' + ui.icon('search', '') + '<input id="f-q" placeholder="Search title, host or department\u2026"></label>' +
          '<select class="select-sm" id="f-status">' + STATUS_OPTIONS.map(function (o) { return '<option value="' + o.v + '">' + o.l + '</option>'; }).join('') + '</select>' +
          '<select class="select-sm" id="f-provider">' + PROVIDER_OPTIONS.map(function (o) { return '<option value="' + o.v + '">' + o.l + '</option>'; }).join('') + '</select>' +
          '<select class="select-sm" id="f-dept"><option value="">All departments</option>' + departments.map(function (d) { return '<option value="' + d.code + '">' + ui.escapeHtml(d.name) + '</option>'; }).join('') + '</select>' +
          '<select class="select-sm" id="f-timing">' + TIMING_OPTIONS.map(function (o) { return '<option value="' + o.v + '">' + o.l + '</option>'; }).join('') + '</select>' +
          '<span class="grow"></span><span class="muted" id="result-count"></span>' +
        '</div>' +
        '<div id="table-host"></div>' +
      '</div>';

    ui.qs('#btn-new').addEventListener('click', openCreate);
    ui.qs('#f-q').addEventListener('input', ui.debounce(function (e) { state.q = e.target.value.trim(); draw(); }, 240));
    ui.qs('#f-status').addEventListener('change', function (e) { state.status = e.target.value; draw(); });
    ui.qs('#f-provider').addEventListener('change', function (e) { state.provider = e.target.value; draw(); });
    ui.qs('#f-dept').addEventListener('change', function (e) { state.department = e.target.value; draw(); });
    ui.qs('#f-timing').addEventListener('change', function (e) { state.timing = e.target.value; draw(); });
  }

  function isFuture(m) { return new Date(m.start_at).getTime() >= Date.now(); }

  /* A meeting can be joined while it is scheduled or live and has a link. */
  function canJoin(m) {
    return !!m.meeting_url && (m.status === 'live' || m.status === 'scheduled');
  }

  function joinMeeting(m) {
    if (!m || !m.meeting_url) {
      ui.toast({ type: 'info', title: 'No meeting link', message: 'This meeting does not have a join link yet.' });
      return;
    }
    window.open(m.meeting_url, '_blank', 'noopener');
  }

  function filtered() {
    var q = state.q.toLowerCase();
    return all.filter(function (m) {
      if (state.status && m.status !== state.status) return false;
      if (state.provider && m.provider !== state.provider) return false;
      if (state.department && m.department_code !== state.department) return false;
      if (state.timing === 'upcoming' && !isFuture(m)) return false;
      if (state.timing === 'past' && isFuture(m)) return false;
      if (q && (m.title + ' ' + m.host_name + ' ' + m.department).toLowerCase().indexOf(q) === -1) return false;
      return true;
    }).sort(function (x, y) { return new Date(x.start_at) - new Date(y.start_at); });
  }

  function draw() {
    var list = filtered();
    ui.qs('#result-count').textContent = list.length + ' meeting' + (list.length === 1 ? '' : 's');
    var host = ui.qs('#table-host');
    if (!list.length) {
      host.innerHTML = '<div class="empty-state"><div class="e-ico">' + ui.icon('video', '') + '</div><h3>No meetings found</h3><p>Adjust the filters to widen your search.</p></div>';
      return;
    }
    var rows = list.map(function (m) {
      return '<tr class="row-link" data-id="' + m.id + '">' +
        '<td><div class="t" style="font-weight:600">' + ui.escapeHtml(m.title) + '</div>' +
          '<div class="s muted">' + ui.escapeHtml(m.department) + ' \u00b7 ' + m.duration_minutes + ' min</div></td>' +
        '<td class="nowrap"><div class="t">' + ui.formatDateTime(m.start_at) + '</div></td>' +
        '<td><div class="cell-main"><span class="avatar sm">' + ui.escapeHtml(ui.initials(m.host_name)) + '</span>' +
          '<div class="t">' + ui.escapeHtml(m.host_name) + '</div></div></td>' +
        '<td class="nowrap"><span class="badge badge-' + providerTone(m.provider) + '">' + ui.escapeHtml(m.provider) + '</span></td>' +
        '<td class="nowrap muted">' + m.participant_count + ' invited</td>' +
        '<td class="nowrap">' + ui.badge(m.status) + '</td>' +
        '<td class="nowrap text-right">' +
          (canJoin(m) ? '<button class="btn btn-primary btn-sm" data-join="' + m.id + '">' + ui.icon('video', '') + 'Join</button> ' : '') +
          '<a class="link-strong" data-view="' + m.id + '">Details</a>' +
        '</td>' +
      '</tr>';
    }).join('');
    host.innerHTML = '<div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>Meeting</th><th>When</th><th>Host</th><th>Provider</th><th>Participants</th><th>Status</th><th></th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>';

    ui.qsa('tr[data-id]', host).forEach(function (tr) {
      tr.addEventListener('click', function (e) {
        if (e.target.closest('a')) e.preventDefault();
        openDetail(tr.getAttribute('data-id'));
      });
    });

    ui.qsa('[data-join]', host).forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var m = all.filter(function (x) { return String(x.id) === btn.getAttribute('data-join'); })[0];
        joinMeeting(m);
      });
    });
  }

  function openDetail(id) {
    var current = null;
    var handle = ui.modal({
      title: 'Meeting details',
      size: 'lg',
      body: '<div class="skeleton" style="height:120px"></div>',
      actions: [
        { label: 'Join meeting', class: 'btn-primary', id: 'mt-join', onClick: function () { joinMeeting(current); } },
        { label: 'Close', class: 'btn-secondary', onClick: function (h) { h.close(); } }
      ]
    });
    var joinBtn = handle.card.querySelector('#mt-join');
    if (joinBtn) joinBtn.disabled = true;

    LSDS.api.meetings.get(id).then(function (m) {
      current = m;
      var participants = m.participants.map(function (p) {
        return '<div class="doc-row">' +
          '<span class="avatar sm">' + ui.escapeHtml(ui.initials(p.name)) + '</span>' +
          '<div class="doc-main"><div class="t">' + ui.escapeHtml(p.name) + (p.participant_role !== 'participant' ? ' <span class="muted">(' + p.participant_role + ')</span>' : '') + '</div>' +
            '<div class="s muted">' + ui.escapeHtml(p.designation) + ' \u00b7 ' + ui.escapeHtml(p.department) + '</div></div>' +
          '<div class="nowrap">' + ui.badge(p.invite_status === 'accepted' ? 'approved' : p.invite_status === 'declined' ? 'rejected' : 'pending_review') + '</div>' +
        '</div>';
      }).join('');
      var recordings = (m.recordings || []).map(function (r) {
        return '<div class="doc-row">' +
          '<span class="doc-ico">' + ui.icon('play', '') + '</span>' +
          '<div class="doc-main"><div class="t">' + ui.escapeHtml(r.title) + '</div>' +
            '<div class="s muted">' + ui.escapeHtml(r.recording_status) + (r.duration_seconds ? ' \u00b7 ' + Math.round(r.duration_seconds / 60) + ' min' : '') + (r.consent_obtained ? ' \u00b7 consent recorded' : '') + '</div></div>' +
        '</div>';
      }).join('');
      var body =
        '<div class="stack-sm">' +
          '<div><div style="font-size:1.02rem;font-weight:650;color:var(--gray-900)">' + ui.escapeHtml(m.title) + '</div>' +
            '<div style="margin-top:6px">' + ui.badge(m.status) + ' <span class="badge badge-' + providerTone(m.provider) + '">' + ui.escapeHtml(m.provider) + '</span> <span class="badge badge-gray">' + ui.escapeHtml(m.access_restriction) + '</span></div></div>' +
          '<dl class="kv">' +
            '<dt>Host</dt><dd>' + ui.escapeHtml(m.host_name) + '</dd>' +
            '<dt>Department</dt><dd>' + ui.escapeHtml(m.department) + '</dd>' +
            '<dt>When</dt><dd>' + ui.formatDateTime(m.start_at) + ' \u00b7 ' + m.duration_minutes + ' min</dd>' +
            '<dt>Meeting link</dt><dd>' + (m.meeting_url
              ? '<a class="link-strong" href="' + ui.escapeHtml(m.meeting_url) + '" target="_blank" rel="noopener">' +
                  ui.icon('externalLink', '') + ' ' + ui.escapeHtml(m.meeting_url.replace(/^https?:\/\//, '')) + '</a>'
              : '\u2014') + '</dd>' +
            '<dt>Access code</dt><dd>' + ui.escapeHtml(m.access_code || '\u2014') + '</dd>' +
            '<dt>Recording</dt><dd>' + (m.recording_enabled ? 'Enabled' : 'Disabled') + '</dd>' +
            '<dt>Ended</dt><dd>' + ui.formatDateTime(m.ended_at) + '</dd>' +
          '</dl>' +
          (m.agenda ? '<div><div class="section-title">Agenda</div><p class="prose" style="white-space:pre-line">' + ui.escapeHtml(m.agenda) + '</p></div>' : '') +
          '<div><div class="section-title">Participants (' + m.participants.length + ')</div>' + (participants || '<p class="muted">No participants.</p>') + '</div>' +
          (recordings ? '<div><div class="section-title">Recordings</div>' + recordings + '</div>' : '') +
        '</div>';
      var bodyEl = handle.card.querySelector('.modal-body');
      if (bodyEl) bodyEl.innerHTML = body;
      var head = handle.card.querySelector('.modal-head h3');
      if (head) head.textContent = m.title;
      if (joinBtn) {
        if (canJoin(m)) {
          joinBtn.disabled = false;
        } else {
          joinBtn.remove();
        }
      }
    }).catch(function (err) {
      var bodyEl = handle.card.querySelector('.modal-body');
      if (bodyEl) bodyEl.innerHTML = '<p class="muted">' + ui.escapeHtml(err.message) + '</p>';
    });
  }

  function defaultStart() {
    var d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':00';
  }

  function openCreate() {
    LSDS.api.departments.list().then(function (res) {
      var depts = (res.data || []).map(function (d) { return { v: d.code, l: d.name }; });
      ui.formModal({
        title: 'Schedule meeting',
        submitLabel: 'Schedule meeting',
        fields: [
          { name: 'title', label: 'Title', required: true, placeholder: 'e.g. Monthly ICT governance review' },
          { name: 'department_code', label: 'Owning department', type: 'select', half: true, options: depts },
          { name: 'start_at', label: 'Start', type: 'datetime-local', half: true, required: true, value: defaultStart() },
          { name: 'duration_minutes', label: 'Duration (minutes)', type: 'number', half: true, min: 0, step: 1, value: '60' },
          { name: 'provider', label: 'Provider', type: 'select', half: true, value: 'jitsi',
            options: [{ v: 'jitsi', l: 'Jitsi' }, { v: 'zoom', l: 'Zoom' }, { v: 'teams', l: 'Microsoft Teams' }, { v: 'other', l: 'Other' }] },
          { name: 'access_restriction', label: 'Access', type: 'select', half: true, value: 'invite_only',
            options: [{ v: 'invite_only', l: 'Invite only' }, { v: 'department', l: 'Department' }, { v: 'public', l: 'Public' }] },
          { name: 'meeting_url', label: 'Meeting link', placeholder: 'https://zoom.us/j/123456789',
            hint: 'Paste the join link from Zoom, Teams, Jitsi, etc. Leave blank to auto-generate one. Staff use this link with the Join meeting button.' },
          { name: 'recording_enabled', label: 'Recording', type: 'checkbox', checkboxLabel: 'Enable recording', value: true },
          { name: 'agenda', label: 'Agenda', type: 'textarea', rows: 3, placeholder: 'One item per line' },
          { name: 'description', label: 'Description', type: 'textarea', rows: 3, placeholder: 'Purpose of the meeting' }
        ],
        onSubmit: function (values) {
          return LSDS.api.meetings.create(values).then(function (created) {
            ui.toast({ type: 'success', title: 'Meeting scheduled', message: created.title + ' is scheduled.' });
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

    Promise.all([LSDS.api.meetings.list(), LSDS.data.build()]).then(function (results) {
      var res = results[0], db = results[1];
      all = res.data || [];
      departments = db.departments || [];
      shell(res);
      draw();
    }).catch(function (err) {
      document.getElementById('page-content').innerHTML =
        '<div class="empty-state"><div class="e-ico" style="color:var(--red-500)">' + ui.icon('alertTriangle', '') + '</div>' +
        '<h3>Could not load meetings</h3><p>' + ui.escapeHtml(err.message) + '</p></div>';
    });
  }

  function init() {
    var user = LSDS.layout.init({ active: 'meetings', title: 'Meetings' });
    if (!user) return;
    load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
