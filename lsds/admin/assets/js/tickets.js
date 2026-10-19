/* ============================================================================
 * LSDS Admin - Support Tickets
 * ========================================================================== */
(function (window, document) {
  'use strict';

  var LSDS = window.LSDS;
  var ui = LSDS.ui;

  var STATUS_OPTIONS = [
    { v: '', l: 'All status' },
    { v: 'open', l: 'Open' },
    { v: 'assigned', l: 'Assigned' },
    { v: 'in_progress', l: 'In Progress' },
    { v: 'pending_user_response', l: 'Awaiting User' },
    { v: 'resolved', l: 'Resolved' },
    { v: 'closed', l: 'Closed' }
  ];
  var PRIORITY_OPTIONS = [
    { v: '', l: 'All priorities' },
    { v: 'low', l: 'Low' },
    { v: 'medium', l: 'Medium' },
    { v: 'high', l: 'High' },
    { v: 'critical', l: 'Critical' }
  ];
  var CATEGORY_OPTIONS = [
    { v: '', l: 'All categories' },
    { v: 'hardware', l: 'Hardware' },
    { v: 'network', l: 'Network' },
    { v: 'software', l: 'Software' },
    { v: 'email', l: 'Email' },
    { v: 'account_access', l: 'Account Access' },
    { v: 'printing', l: 'Printing' },
    { v: 'conference_equipment', l: 'Conference Equipment' },
    { v: 'other', l: 'Other' }
  ];

  var all = [];
  var departments = [];
  var state = { q: '', status: '', priority: '', category: '', department: '' };

  function stats(list, totals, priorities) {
    return '<div class="grid stats">' +
      ui.statCard({ label: 'Total tickets', value: totals.count, icon: 'lifeBuoy', tone: 'blue' }) +
      ui.statCard({ label: 'Open / In progress', value: totals.open, icon: 'clock', tone: 'amber' }) +
      ui.statCard({ label: 'Resolved / Closed', value: totals.resolved, icon: 'checkCircle', tone: 'green' }) +
      ui.statCard({ label: 'High / Critical', value: (priorities.high || 0) + (priorities.critical || 0), icon: 'alertTriangle', tone: 'red' }) +
    '</div>';
  }

  function shell() {
    document.getElementById('page-content').innerHTML =
      '<div class="page-head">' +
        '<div><h1>Support Tickets</h1><p class="sub">IT support tickets, tracking and resolution.</p></div>' +
        '<div class="page-actions"><button class="btn btn-primary" id="btn-new">' + ui.icon('plus', '') + 'New Ticket</button></div>' +
      '</div>' +
      stats(all, LSDS.api.__lastTickets || { count: all.length, open: 0, resolved: 0 }, LSDS.api.__lastTickets && LSDS.api.__lastTickets.priorities ? LSDS.api.__lastTickets.priorities : {}) +
      '<div class="card" style="margin-top:22px">' +
        '<div class="toolbar">' +
          '<label class="search-inline">' + ui.icon('search', '') + '<input id="f-q" placeholder="Search subject, reference or requester\u2026"></label>' +
          '<select class="select-sm" id="f-status">' + STATUS_OPTIONS.map(function (o) { return '<option value="' + o.v + '">' + o.l + '</option>'; }).join('') + '</select>' +
          '<select class="select-sm" id="f-priority">' + PRIORITY_OPTIONS.map(function (o) { return '<option value="' + o.v + '">' + o.l + '</option>'; }).join('') + '</select>' +
          '<select class="select-sm" id="f-category">' + CATEGORY_OPTIONS.map(function (o) { return '<option value="' + o.v + '">' + o.l + '</option>'; }).join('') + '</select>' +
          '<select class="select-sm" id="f-dept"><option value="">All departments</option>' + departments.map(function (d) { return '<option value="' + d.code + '">' + ui.escapeHtml(d.name) + '</option>'; }).join('') + '</select>' +
          '<span class="grow"></span><span class="muted" id="result-count"></span>' +
        '</div>' +
        '<div id="list-host"></div>' +
      '</div>';

    ui.qs('#btn-new').addEventListener('click', openCreate);
    ui.qs('#f-q').addEventListener('input', ui.debounce(function (e) { state.q = e.target.value.trim(); draw(); }, 240));
    ui.qs('#f-status').addEventListener('change', function (e) { state.status = e.target.value; draw(); });
    ui.qs('#f-priority').addEventListener('change', function (e) { state.priority = e.target.value; draw(); });
    ui.qs('#f-category').addEventListener('change', function (e) { state.category = e.target.value; draw(); });
    ui.qs('#f-dept').addEventListener('change', function (e) { state.department = e.target.value; draw(); });
  }

  function filtered() {
    var q = state.q.toLowerCase();
    return all.filter(function (t) {
      if (state.status && t.status !== state.status) return false;
      if (state.priority && t.priority !== state.priority) return false;
      if (state.category && t.issue_category !== state.category) return false;
      if (state.department && t.department_code !== state.department) return false;
      if (q && (t.subject + ' ' + t.reference_no + ' ' + t.requester_name + ' ' + t.assignee_name).toLowerCase().indexOf(q) === -1) return false;
      return true;
    }).sort(function (x, y) { return new Date(y.updated_at) - new Date(x.updated_at); });
  }

  function draw() {
    var list = filtered();
    ui.qs('#result-count').textContent = list.length + ' ticket' + (list.length === 1 ? '' : 's');
    var host = ui.qs('#list-host');
    if (!list.length) {
      host.innerHTML = '<div class="empty-state"><div class="e-ico">' + ui.icon('lifeBuoy', '') + '</div><h3>No tickets found</h3><p>Adjust the filters to widen your search.</p></div>';
      return;
    }
    var rows = list.map(function (t) {
      var priorityTone = t.priority === 'high' || t.priority === 'critical' ? 'red' : t.priority === 'medium' ? 'amber' : 'gray';
      return '<div class="doc-row">' +
        '<span class="doc-ico">' + ui.icon('lifeBuoy', '') + '</span>' +
        '<div class="doc-main">' +
          '<div class="t">' + ui.escapeHtml(t.subject) + ' <span class="muted">(' + ui.escapeHtml(t.reference_no) + ')</span></div>' +
          '<div class="s muted">' + ui.titleCase(t.issue_category) + ' \u00b7 ' + ui.escapeHtml(t.department) + ' \u00b7 Requester: ' + ui.escapeHtml(t.requester_name) + ' \u00b7 Assignee: ' + (t.assignee_name || '\u2014') + '</div>' +
          '<div class="s muted" style="margin-top:2px">Created ' + ui.formatDate(t.created_at) + ' \u00b7 Updated ' + ui.relativeTime(t.updated_at) + '</div>' +
        '</div>' +
        '<div class="nowrap">' + ui.badge(t.status) + '</div>' +
        '<div class="nowrap"><span class="badge badge-' + priorityTone + '">' + ui.escapeHtml(t.priority) + '</span></div>' +
        '<div class="nowrap"><a class="link-strong" data-view="' + t.id + '">Details</a></div>' +
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
    ui.modal({ title: 'Ticket details', size: 'lg', body: '<div class="skeleton" style="height:140px"></div>' });
    LSDS.api.tickets.get(id).then(function (t) {
      var comments = (t.comments || []).map(function (c) {
        return '<div style="border-top:1px solid var(--border);padding:14px 0">' +
          '<div class="person" style="margin-bottom:6px"><span class="avatar sm">' + ui.escapeHtml(ui.initials(c.author_name)) + '</span>' +
            '<div><div class="p-name">' + ui.escapeHtml(c.author_name) + (c.is_internal ? ' <span class="muted">(Internal)</span>' : '') + '</div><div class="p-sub">' + ui.relativeTime(c.created_at) + '</div></div>' +
          '</div>' +
          '<div class="prose">' + ui.escapeHtml(c.comment) + '</div>' +
        '</div>';
      }).join('');
      var body =
        '<div class="stack-sm">' +
          '<div><div style="font-size:1.02rem;font-weight:650;color:var(--gray-900)">' + ui.escapeHtml(t.subject) + '</div>' +
            '<div style="margin-top:6px">' + ui.badge(t.status) + ' <span class="badge badge-gray">' + ui.escapeHtml(t.priority) + '</span> <span class="badge badge-sky">' + ui.titleCase(t.issue_category) + '</span></div></div>' +
          '<p class="prose">' + ui.escapeHtml(t.problem_description) + '</p>' +
          '<dl class="kv">' +
            '<dt>Reference</dt><dd>' + ui.escapeHtml(t.reference_no) + '</dd>' +
            '<dt>Requester</dt><dd>' + ui.escapeHtml(t.requester_name) + '</dd>' +
            '<dt>Department</dt><dd>' + ui.escapeHtml(t.department) + '</dd>' +
            '<dt>Assigned to</dt><dd>' + (t.assignee_name || '\u2014') + '</dd>' +
            '<dt>Created</dt><dd>' + ui.formatDateTime(t.created_at) + '</dd>' +
            '<dt>Updated</dt><dd>' + ui.formatDateTime(t.updated_at) + '</dd>' +
            '<dt>Resolved</dt><dd>' + ui.formatDateTime(t.resolved_at) + '</dd>' +
            '<dt>Closed</dt><dd>' + ui.formatDateTime(t.closed_at) + '</dd>' +
            '<dt>Resolution notes</dt><dd>' + ui.escapeHtml(t.resolution_notes || '\u2014') + '</dd>' +
          '</dl>' +
          '<div style="margin-top:10px"><div class="section-title">Comments</div>' + (comments || '<p class="muted">No comments yet.</p>') + '</div>' +
        '</div>';
      var overlay = document.querySelector('.modal-overlay .modal');
      if (overlay) {
        var bodyEl = overlay.querySelector('.modal-body');
        if (bodyEl) bodyEl.innerHTML = body;
        var head = overlay.querySelector('.modal-head h3');
        if (head) head.textContent = 'Ticket details';
      }
    }).catch(function (err) {
      var bodyEl = document.querySelector('.modal-overlay .modal-body');
      if (bodyEl) bodyEl.innerHTML = '<p class="muted">' + ui.escapeHtml(err.message) + '</p>';
    });
  }

  function openCreate() {
    LSDS.api.departments.list().then(function (res) {
      var depts = (res.data || []).map(function (d) { return { v: d.code, l: d.name }; });
      ui.formModal({
        title: 'New support ticket',
        submitLabel: 'Create ticket',
        fields: [
          { name: 'subject', label: 'Subject', required: true, placeholder: 'Brief summary of the issue' },
          { name: 'issue_category', label: 'Category', type: 'select', half: true, value: 'hardware',
            options: CATEGORY_OPTIONS.filter(function (o) { return o.v; }) },
          { name: 'priority', label: 'Priority', type: 'select', half: true, value: 'medium',
            options: PRIORITY_OPTIONS.filter(function (o) { return o.v; }) },
          { name: 'department_code', label: 'Department', type: 'select', half: true, options: depts },
          { name: 'problem_description', label: 'Description', type: 'textarea', rows: 5, required: true,
            placeholder: 'Describe what happened, steps to reproduce, and any error messages.' }
        ],
        onSubmit: function (values) {
          return LSDS.api.tickets.create(values).then(function (created) {
            ui.toast({ type: 'success', title: 'Ticket created', message: 'Reference ' + created.reference_no + ' raised.' });
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
      LSDS.api.tickets.list(),
      LSDS.data.build()
    ]).then(function (results) {
      var res = results[0], db = results[1];
      all = res.data || [];
      LSDS.api.__lastTickets = res;
      departments = db.departments || [];
      shell();
      draw();
    }).catch(function (err) {
      document.getElementById('page-content').innerHTML =
        '<div class="empty-state"><div class="e-ico" style="color:var(--red-500)">' + ui.icon('alertTriangle', '') + '</div>' +
        '<h3>Could not load tickets</h3><p>' + ui.escapeHtml(err.message) + '</p></div>';
    });
  }

  function init() {
    var user = LSDS.layout.init({ active: 'tickets', title: 'Support Tickets' });
    if (!user) return;
    load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
