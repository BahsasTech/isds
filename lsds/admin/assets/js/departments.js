/* ============================================================================
 * LSDS Admin - Departments
 * ========================================================================== */
(function (window, document) {
  'use strict';

  var LSDS = window.LSDS;
  var ui = LSDS.ui;

  function statCards(depts) {
    var staff = depts.reduce(function (s, d) { return s + (d.staff_count || 0); }, 0);
    var apps = depts.reduce(function (s, d) { return s + (d.applications || 0); }, 0);
    var spend = depts.reduce(function (s, d) { return s + (d.spend || 0); }, 0);
    var items = [
      { label: 'Departments', value: depts.length, icon: 'building', tone: 'blue' },
      { label: 'Total staff', value: staff, icon: 'users', tone: 'sky' },
      { label: 'Applications', value: apps, icon: 'fileText', tone: 'violet' },
      { label: 'Approved spend', value: ui.formatCurrency(spend, true), icon: 'wallet', tone: 'green' }
    ];
    return '<div class="grid stats">' + items.map(function (s) {
      return '<div class="stat"><div class="stat-top">' +
        '<span class="stat-ico ico-' + s.tone + '">' + ui.icon(s.icon, '') + '</span>' +
        '<span class="stat-label">' + ui.escapeHtml(s.label) + '</span></div>' +
        '<div class="stat-value">' + ui.escapeHtml(String(s.value)) + '</div></div>';
    }).join('') + '</div>';
  }

  function card(d, maxSpend) {
    var pct = maxSpend ? Math.round((d.spend / maxSpend) * 100) : 0;
    return '<div class="card"><div class="card-body dept-card">' +
      '<div class="dept-top">' +
        '<div style="display:flex;gap:12px;align-items:flex-start">' +
          '<span class="dept-ico">' + ui.icon('building', '') + '</span>' +
          '<div><div class="dept-name">' + ui.escapeHtml(d.name) + '</div>' +
            '<div class="dept-head">Head: ' + ui.escapeHtml(d.head || 'Not assigned') + '</div></div>' +
        '</div>' +
        '<span class="badge badge-sky">' + ui.escapeHtml(d.code) + '</span>' +
      '</div>' +
      '<div class="dept-metrics">' +
        '<div><div class="m-n">' + d.staff_count + '</div><div class="m-l">Staff</div></div>' +
        '<div><div class="m-n">' + d.applications + '</div><div class="m-l">Applications</div></div>' +
        '<div><div class="m-n">' + d.pending + '</div><div class="m-l">Pending</div></div>' +
      '</div>' +
      '<div>' +
        '<div style="display:flex;justify-content:space-between;font-size:.8rem;margin-bottom:7px">' +
          '<span class="muted">Approved &amp; disbursed spend</span>' +
          '<b>' + ui.formatCurrency(d.spend, true) + '</b></div>' +
        '<div class="bar"><span style="width:' + pct + '%"></span></div>' +
      '</div>' +
    '</div></div>';
  }

  function render(depts) {
    var maxSpend = depts.reduce(function (m, d) { return Math.max(m, d.spend || 0); }, 0);
    document.getElementById('page-content').innerHTML =
      '<div class="page-head">' +
        '<div><h1>Departments</h1><p class="sub">Training activity, headcount and spend by department.</p></div>' +
        '<div class="page-actions"><button class="btn btn-primary" id="btn-add-dept">' + ui.icon('plus', '') + 'Add Department</button></div>' +
      '</div>' +
      statCards(depts) +
      '<div style="height:22px"></div>' +
      '<div class="dept-grid">' + depts.map(function (d) { return card(d, maxSpend); }).join('') + '</div>';

    var addBtn = ui.qs('#btn-add-dept');
    if (addBtn) addBtn.addEventListener('click', openCreate);
  }

  function openCreate() {
    ui.formModal({
      title: 'Add department',
      submitLabel: 'Create department',
      fields: [
        { name: 'code', label: 'Department code', type: 'text', required: true, half: true,
          placeholder: 'e.g. QMS', hint: '2-20 characters: letters, numbers, hyphens, underscores.' },
        { name: 'name', label: 'Department name', type: 'text', required: true, half: true,
          placeholder: 'e.g. Quality Management Services' },
        { name: 'description', label: 'Description', type: 'textarea', rows: 3,
          placeholder: 'What this department is responsible for\u2026' },
        { name: 'is_active', label: 'Status', type: 'checkbox', value: true,
          checkboxLabel: 'Active (shown in dropdowns and reports)' }
      ],
      onSubmit: function (values) {
        var code = String(values.code || '').trim().toUpperCase();
        var name = String(values.name || '').trim();
        if (!/^[A-Z0-9_-]{2,20}$/.test(code)) {
          return Promise.reject(new Error('Use 2-20 letters, numbers, hyphens or underscores for the code.'));
        }
        if (name.length < 2) {
          return Promise.reject(new Error('Enter a department name of at least 2 characters.'));
        }
        return LSDS.api.departments.create({
          code: code,
          name: name,
          description: String(values.description || '').trim(),
          is_active: values.is_active ? 1 : 0
        }).then(function (created) {
          ui.toast({ type: 'success', title: 'Department created', message: created.name + ' (' + created.code + ') is now available.' });
          load();
        }).catch(function (err) {
          ui.toast({ type: 'error', title: 'Could not create department', message: err.message });
          throw err;
        });
      }
    });
  }

  function load() {
    document.getElementById('page-content').innerHTML =
      '<div class="stack"><div class="grid stats">' +
      '<div class="skeleton" style="height:100px"></div><div class="skeleton" style="height:100px"></div>' +
      '<div class="skeleton" style="height:100px"></div><div class="skeleton" style="height:100px"></div></div>' +
      '<div class="skeleton" style="height:280px"></div></div>';
    LSDS.api.departments.list().then(function (res) {
      render(res.data || []);
    }).catch(function (err) {
      document.getElementById('page-content').innerHTML =
        '<div class="empty-state"><div class="e-ico" style="color:var(--red-500)">' + ui.icon('alertTriangle', '') + '</div>' +
        '<h3>Could not load departments</h3><p>' + ui.escapeHtml(err.message) + '</p></div>';
    });
  }

  function init() {
    var user = LSDS.layout.init({ active: 'departments', title: 'Departments' });
    if (!user) return;
    load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
