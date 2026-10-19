/* ============================================================================
 * LSDS Admin - Courses & E-Learning
 * ========================================================================== */
(function (window, document) {
  'use strict';

  var LSDS = window.LSDS;
  var ui = LSDS.ui;

  var STATUS_OPTIONS = [
    { v: '', l: 'All status' }, { v: 'published', l: 'Published' },
    { v: 'draft', l: 'Draft' }, { v: 'archived', l: 'Archived' }
  ];
  var DIFFICULTY_OPTIONS = [
    { v: '', l: 'All levels' }, { v: 'beginner', l: 'Beginner' },
    { v: 'intermediate', l: 'Intermediate' }, { v: 'advanced', l: 'Advanced' }
  ];

  var CATEGORIES = [];
  var departments = [];
  var all = [];
  var state = { q: '', status: '', category: '', department: '', difficulty: '' };

  function stats(totals) {
    return '<div class="grid stats">' +
      ui.statCard({ label: 'Courses', value: totals.count, icon: 'book', tone: 'blue', foot: totals.published + ' published' }) +
      ui.statCard({ label: 'Enrollments', value: totals.enrolled, icon: 'users', tone: 'sky', foot: 'All learners' }) +
      ui.statCard({ label: 'Completion rate', value: totals.completion_rate + '%', icon: 'badgeCheck', tone: 'green', foot: 'Across all courses' }) +
      ui.statCard({ label: 'Published', value: totals.published, icon: 'checkCircle', tone: 'violet', foot: 'Available to staff' }) +
    '</div>';
  }

  function shell(res) {
    document.getElementById('page-content').innerHTML =
      '<div class="page-head">' +
        '<div><h1>Courses &amp; E-Learning</h1><p class="sub">Self-paced courses, modules and learner completion across the organisation.</p></div>' +
        '<div class="page-actions"><button class="btn btn-primary" id="btn-new">' + ui.icon('plus', '') + 'New Course</button></div>' +
      '</div>' +
      stats(res.totals || { count: all.length, enrolled: 0, completion_rate: 0, published: 0 }) +
      '<div class="card" style="margin-top:22px">' +
        '<div class="toolbar">' +
          '<label class="search-inline">' + ui.icon('search', '') + '<input id="f-q" placeholder="Search course, code or instructor\u2026"></label>' +
          '<select class="select-sm" id="f-status">' + STATUS_OPTIONS.map(function (o) { return '<option value="' + o.v + '">' + o.l + '</option>'; }).join('') + '</select>' +
          '<select class="select-sm" id="f-category"><option value="">All categories</option>' + CATEGORIES.map(function (c) { return '<option value="' + ui.escapeHtml(c) + '">' + ui.escapeHtml(c) + '</option>'; }).join('') + '</select>' +
          '<select class="select-sm" id="f-dept"><option value="">All departments</option>' + departments.map(function (d) { return '<option value="' + d.code + '">' + ui.escapeHtml(d.name) + '</option>'; }).join('') + '</select>' +
          '<select class="select-sm" id="f-difficulty">' + DIFFICULTY_OPTIONS.map(function (o) { return '<option value="' + o.v + '">' + o.l + '</option>'; }).join('') + '</select>' +
          '<span class="grow"></span><span class="muted" id="result-count"></span>' +
        '</div>' +
        '<div id="list-host"></div>' +
      '</div>';

    ui.qs('#btn-new').addEventListener('click', openCreate);
    ui.qs('#f-q').addEventListener('input', ui.debounce(function (e) { state.q = e.target.value.trim(); draw(); }, 240));
    ui.qs('#f-status').addEventListener('change', function (e) { state.status = e.target.value; draw(); });
    ui.qs('#f-category').addEventListener('change', function (e) { state.category = e.target.value; draw(); });
    ui.qs('#f-dept').addEventListener('change', function (e) { state.department = e.target.value; draw(); });
    ui.qs('#f-difficulty').addEventListener('change', function (e) { state.difficulty = e.target.value; draw(); });
  }

  function openCreate() {
    LSDS.api.departments.list().then(function (res) {
      var depts = (res.data || []).map(function (d) { return { v: d.code, l: d.name }; });
      var cats = CATEGORIES.slice();
      if (!cats.length) cats = ['Training Materials'];
      ui.formModal({
        title: 'Create course',
        submitLabel: 'Create course',
        fields: [
          { name: 'title', label: 'Course title', required: true, placeholder: 'e.g. Data Analytics with Power BI' },
          { name: 'code', label: 'Course code', half: true, placeholder: 'Leave blank to auto-generate' },
          { name: 'category', label: 'Category', type: 'select', half: true,
            options: cats.map(function (c) { return { v: c, l: c }; }) },
          { name: 'department_code', label: 'Department', type: 'select', half: true, options: depts },
          { name: 'difficulty_level', label: 'Difficulty', type: 'select', half: true, value: 'intermediate',
            options: [{ v: 'beginner', l: 'Beginner' }, { v: 'intermediate', l: 'Intermediate' }, { v: 'advanced', l: 'Advanced' }] },
          { name: 'estimated_hours', label: 'Estimated hours', type: 'number', half: true, min: 0, step: 0.5 },
          { name: 'status', label: 'Status', type: 'select', half: true, value: 'published',
            options: [{ v: 'published', l: 'Published' }, { v: 'draft', l: 'Save as draft' }, { v: 'archived', l: 'Archived' }] },
          { name: 'description', label: 'Description', type: 'textarea', rows: 3, placeholder: 'What does this course cover?' }
        ],
        onSubmit: function (values) {
          return LSDS.api.courses.create(values).then(function (created) {
            ui.toast({ type: 'success', title: 'Course created',
              message: created.title + ' has been ' + (created.status === 'draft' ? 'saved as a draft.' : 'created.') });
            load();
          });
        }
      });
    }).catch(function (err) {
      ui.toast({ type: 'error', title: 'Could not open form', message: err.message });
    });
  }

  function filtered() {
    var q = state.q.toLowerCase();
    return all.filter(function (c) {
      if (state.status && c.status !== state.status) return false;
      if (state.category && c.category !== state.category) return false;
      if (state.department && c.department_code !== state.department) return false;
      if (state.difficulty && c.difficulty_level !== state.difficulty) return false;
      if (q && (c.title + ' ' + c.code + ' ' + c.instructor_name).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }

  function progressBar(pct, tone) {
    pct = Math.min(100, pct || 0);
    return '<div style="min-width:130px">' +
      '<div style="display:flex;justify-content:space-between;font-size:.76rem;margin-bottom:5px">' +
        '<span class="muted">' + pct + '%</span></div>' +
      '<div class="bar"><span style="width:' + pct + '%;' + (tone || '') + '"></span></div></div>';
  }

  function draw() {
    var list = filtered();
    ui.qs('#result-count').textContent = list.length + ' course' + (list.length === 1 ? '' : 's');
    var host = ui.qs('#list-host');
    if (!list.length) {
      host.innerHTML = '<div class="empty-state"><div class="e-ico">' + ui.icon('book', '') + '</div><h3>No courses found</h3><p>Adjust the filters to widen your search.</p></div>';
      return;
    }
    var rows = list.map(function (c) {
      return '<tr class="row-link" data-id="' + c.id + '">' +
        '<td><div class="t" style="font-weight:600">' + ui.escapeHtml(c.title) + '</div>' +
          '<div class="s muted">' + ui.escapeHtml(c.code) + ' \u00b7 ' + ui.escapeHtml(c.category || '\u2014') + ' \u00b7 ' + c.modules.length + ' modules</div></td>' +
        '<td><div class="cell-main"><span class="avatar sm">' + ui.escapeHtml(ui.initials(c.instructor_name)) + '</span>' +
          '<div><div class="t">' + ui.escapeHtml(c.instructor_name) + '</div><div class="s muted">' + ui.escapeHtml(c.department) + '</div></div></div></td>' +
        '<td class="nowrap"><span class="badge badge-sky">' + ui.escapeHtml(c.difficulty_level) + '</span></td>' +
        '<td class="nowrap muted">' + c.estimated_hours + 'h</td>' +
        '<td>' + progressBar(c.enrollment_summary.completion_rate, c.enrollment_summary.completion_rate >= 75 ? '' : 'background:var(--amber-500)') + '</td>' +
        '<td class="nowrap">' + ui.badge(c.status) + '</td>' +
        '<td class="nowrap text-right"><a class="link-strong" data-view="' + c.id + '">Details</a></td>' +
      '</tr>';
    }).join('');
    host.innerHTML = '<div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>Course</th><th>Instructor</th><th>Level</th><th>Duration</th><th>Completion</th><th>Status</th><th></th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>';

    ui.qsa('tr[data-id]', host).forEach(function (tr) {
      tr.addEventListener('click', function (e) {
        if (e.target.closest('a')) e.preventDefault();
        openDetail(tr.getAttribute('data-id'));
      });
    });
    ui.qsa('[data-view]', host).forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); openDetail(a.getAttribute('data-view')); });
    });
  }

  function openDetail(id) {
    ui.modal({ title: 'Course details', size: 'lg', body: '<div class="skeleton" style="height:120px"></div>' });
    LSDS.api.courses.get(id).then(function (c) {
      var s = c.enrollment_summary;
      var modules = c.modules.map(function (m) {
        return '<div class="doc-row">' +
          '<span class="doc-ico">' + ui.icon('play', '') + '</span>' +
          '<div class="doc-main"><div class="t">' + (m.position) + '. ' + ui.escapeHtml(m.title) + '</div>' +
            '<div class="s muted">' + m.estimated_minutes + ' min \u00b7 ' + (m.is_mandatory ? 'Mandatory' : 'Optional') + '</div></div>' +
        '</div>';
      }).join('');
      var body =
        '<div class="stack-sm">' +
          '<div><div style="font-size:1.02rem;font-weight:650;color:var(--gray-900)">' + ui.escapeHtml(c.title) + '</div>' +
            '<div style="margin-top:6px">' + ui.badge(c.status) + ' <span class="badge badge-sky">' + ui.escapeHtml(c.difficulty_level) + '</span></div></div>' +
          '<p class="prose">' + ui.escapeHtml(c.description) + '</p>' +
          '<dl class="kv">' +
            '<dt>Code</dt><dd>' + ui.escapeHtml(c.code) + '</dd>' +
            '<dt>Instructor</dt><dd>' + ui.escapeHtml(c.instructor_name) + '</dd>' +
            '<dt>Department</dt><dd>' + ui.escapeHtml(c.department) + '</dd>' +
            '<dt>Duration</dt><dd>' + c.estimated_hours + ' hours</dd>' +
            '<dt>Modules</dt><dd>' + c.modules.length + '</dd>' +
          '</dl>' +
          '<div class="grid stats" style="margin-top:8px">' +
            ui.statCard({ label: 'Enrollments', value: s.total, icon: 'users', tone: 'blue' }) +
            ui.statCard({ label: 'Completed', value: s.completed, icon: 'checkCircle', tone: 'green' }) +
            ui.statCard({ label: 'In progress', value: s.in_progress, icon: 'clock', tone: 'amber' }) +
            ui.statCard({ label: 'Completion', value: s.completion_rate + '%', icon: 'badgeCheck', tone: 'violet' }) +
          '</div>' +
          '<div style="margin-top:10px"><div class="section-title">Modules</div>' + (modules || '<p class="muted">No modules.</p>') + '</div>' +
        '</div>';
      var overlay = document.querySelector('.modal-overlay .modal');
      if (overlay) {
        var bodyEl = overlay.querySelector('.modal-body');
        if (bodyEl) bodyEl.innerHTML = body;
        var head = overlay.querySelector('.modal-head h3');
        if (head) head.textContent = c.code + ' \u00b7 ' + c.title;
      }
    }).catch(function (err) {
      var bodyEl = document.querySelector('.modal-overlay .modal-body');
      if (bodyEl) bodyEl.innerHTML = '<p class="muted">' + ui.escapeHtml(err.message) + '</p>';
    });
  }

  function load() {
    document.getElementById('page-content').innerHTML =
      '<div class="stack"><div class="grid stats">' +
        '<div class="skeleton" style="height:100px"></div><div class="skeleton" style="height:100px"></div>' +
        '<div class="skeleton" style="height:100px"></div><div class="skeleton" style="height:100px"></div></div>' +
        '<div class="skeleton" style="height:300px"></div></div>';

    Promise.all([LSDS.api.courses.list(), LSDS.data.build()]).then(function (results) {
      var res = results[0], db = results[1];
      all = res.data || [];
      departments = db.departments || [];
      CATEGORIES = [];
      all.forEach(function (c) { if (c.category && CATEGORIES.indexOf(c.category) === -1) CATEGORIES.push(c.category); });
      CATEGORIES.sort();
      shell(res);
      draw();
    }).catch(function (err) {
      document.getElementById('page-content').innerHTML =
        '<div class="empty-state"><div class="e-ico" style="color:var(--red-500)">' + ui.icon('alertTriangle', '') + '</div>' +
        '<h3>Could not load courses</h3><p>' + ui.escapeHtml(err.message) + '</p></div>';
    });
  }

  function init() {
    var user = LSDS.layout.init({ active: 'courses', title: 'Courses & E-Learning' });
    if (!user) return;
    load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
