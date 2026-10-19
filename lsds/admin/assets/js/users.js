/* ============================================================================
 * LSDS Admin - Users & Roles
 * ========================================================================== */
(function (window, document) {
  'use strict';

  var LSDS = window.LSDS;
  var ui = LSDS.ui;

  var state = { q: '', role: '', department: '', status: '', page: 1, per_page: 10 };
  var all = [];

  function roleChips(roles) {
    return (roles || []).map(function (r) {
      return '<span class="badge badge-gray">' + ui.escapeHtml(LSDS.data.roleLabel(r)) + '</span>';
    }).join(' ');
  }

  function shell() {
    document.getElementById('page-content').innerHTML =
      '<div class="page-head">' +
        '<div><h1>Users &amp; Roles</h1><p class="sub">Staff accounts, role assignments and access status.</p></div>' +
        '<div class="page-actions"><button class="btn btn-primary" id="btn-add">' + ui.icon('plus', '') + 'Add User</button></div>' +
      '</div>' +
      '<div class="card">' +
        '<div class="toolbar">' +
          '<label class="search-inline">' + ui.icon('search', '') +
            '<input id="f-q" type="search" placeholder="Search name, email or designation\u2026"></label>' +
          '<select class="select-sm" id="f-role"><option value="">All roles</option></select>' +
          '<select class="select-sm" id="f-dept"><option value="">All departments</option></select>' +
          '<select class="select-sm" id="f-status">' +
            '<option value="">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option>' +
          '</select>' +
          '<span class="grow"></span>' +
          '<span class="muted" id="result-count"></span>' +
        '</div>' +
        '<div id="table-host"></div>' +
        '<div id="pager-host"></div>' +
      '</div>';

    ui.qs('#btn-add').addEventListener('click', openCreate);
    ui.qs('#f-q').addEventListener('input', ui.debounce(function (e) { state.q = e.target.value.trim(); state.page = 1; apply(); }, 260));
    ui.qs('#f-role').addEventListener('change', function (e) { state.role = e.target.value; state.page = 1; apply(); });
    ui.qs('#f-dept').addEventListener('change', function (e) { state.department = e.target.value; state.page = 1; apply(); });
    ui.qs('#f-status').addEventListener('change', function (e) { state.status = e.target.value; state.page = 1; apply(); });
  }

  function filtered() {
    var q = state.q.toLowerCase();
    return all.filter(function (u) {
      if (state.role && u.roles.indexOf(state.role) === -1) return false;
      if (state.department && u.department_code !== state.department) return false;
      if (state.status && u.account_status !== state.status) return false;
      if (q && (u.name + ' ' + u.email + ' ' + u.designation).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }

  function drawTable() {
    var list = filtered();
    var total = list.length;
    var pages = Math.max(1, Math.ceil(total / state.per_page));
    if (state.page > pages) state.page = pages;
    var start = (state.page - 1) * state.per_page;
    var slice = list.slice(start, start + state.per_page);

    ui.qs('#result-count').textContent = total + ' user' + (total === 1 ? '' : 's');

    var host = ui.qs('#table-host');
    if (!slice.length) {
      host.innerHTML = '<div class="empty-state"><div class="e-ico">' + ui.icon('users', '') + '</div>' +
        '<h3>No users found</h3><p>Adjust the filters to widen your search.</p></div>';
      ui.qs('#pager-host').innerHTML = '';
      return;
    }
    var rows = slice.map(function (u) {
      return '<tr>' +
        '<td><div class="cell-main"><span class="avatar sm">' + ui.escapeHtml(ui.initials(u.name)) + '</span>' +
          '<div><div class="t">' + ui.escapeHtml(u.name) + '</div><div class="s">' + ui.escapeHtml(u.email) + '</div></div></div></td>' +
        '<td><div class="t" style="font-weight:600">' + ui.escapeHtml(u.designation) + '</div>' +
          '<div class="s muted">' + ui.escapeHtml(u.department) + '</div></td>' +
        '<td><div class="chips">' + roleChips(u.roles) + '</div></td>' +
        '<td><span class="badge badge-' + (u.account_status === 'active' ? 'green' : 'red') + '">' + ui.escapeHtml(ui.titleCase(u.account_status)) + '</span></td>' +
        '<td class="nowrap faint">' + ui.relativeTime(u.last_login_at) + '</td>' +
        '<td class="nowrap"><span class="ref">' + ui.escapeHtml(u.pn) + '</span><div class="s muted">' + ui.escapeHtml(u.oracle_number) + '</div></td>' +
      '</tr>';
    }).join('');
    host.innerHTML = '<div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>Name</th><th>Designation</th><th>Roles</th><th>Status</th><th>Last login</th><th>Personnel no.</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>';

    var pagerHost = ui.qs('#pager-host');
    pagerHost.innerHTML = '';
    if (pages > 1) {
      pagerHost.appendChild(ui.pagination({
        page: state.page, pages: pages, total: total, perPage: state.per_page,
        onChange: function (p) { state.page = p; drawTable(); }
      }).el);
    }
  }

  function apply() { drawTable(); }

  function showCredentials(u) {
    var body = '<div class="stack-sm">' +
      '<p>User <b>' + ui.escapeHtml(u.name || u.email) + '</b> has been created.</p>' +
      '<dl class="kv">' +
        '<dt>Email</dt><dd>' + ui.escapeHtml(u.email) + '</dd>' +
        (u.temp_password ? '<dt>Temporary password</dt><dd><code>' + ui.escapeHtml(u.temp_password) + '</code></dd>' : '') +
      '</dl>' +
      '<p class="muted">' + (u.temp_password
        ? 'Share this temporary password securely. The user must change it at first login.'
        : 'The user must set a new password at first login.') + '</p>' +
    '</div>';
    ui.modal({ title: 'User created', size: 'sm', body: body });
  }

  function openCreate() {
    Promise.all([LSDS.api.roles.list(), LSDS.api.departments.list()]).then(function (results) {
      var roles = results[0].data || [];
      var depts = (results[1].data || []).map(function (d) { return { v: d.code, l: d.name }; });
      var roleKeys = roles.map(function (ro) { return ro.role_key; });
      var roleFields = roles.map(function (ro) {
        return { name: 'role_' + ro.role_key, label: ro.role_name, type: 'checkbox', half: true };
      });
      var fields = [
        { name: 'name', label: 'Full name', required: true, placeholder: 'e.g. Ada Obi' },
        { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'name@lsds.gov.ng' },
        { name: 'designation', label: 'Designation', half: true, placeholder: 'e.g. ICT Officer' },
        { name: 'department_code', label: 'Department', type: 'select', half: true,
          options: [{ v: '', l: 'Select department\u2026' }].concat(depts) },
        { name: 'phone', label: 'Phone', half: true, placeholder: '0803\u2026' },
        { name: 'password', label: 'Temporary password', type: 'password', half: true,
          hint: 'Leave blank to auto-generate a compliant password.' }
      ].concat(roleFields);

      ui.formModal({
        title: 'Add user',
        submitLabel: 'Create user',
        fields: fields,
        onSubmit: function (values) {
          values.roles = roleKeys.filter(function (k) { return values['role_' + k]; });
          roleKeys.forEach(function (k) { delete values['role_' + k]; });
          return LSDS.api.users.create(values).then(function (created) {
            load();
            showCredentials(created);
          });
        }
      });
    }).catch(function (err) {
      ui.toast({ type: 'error', title: 'Could not open form', message: err.message });
    });
  }

  function load() {
    ui.qs('#table-host').innerHTML = '<div style="padding:20px"><div class="skeleton" style="height:240px"></div></div>';
    LSDS.api.users.list().then(function (res) {
      all = res.data || [];
      drawTable();
    }).catch(function (err) {
      ui.qs('#table-host').innerHTML = '<div class="empty-state"><div class="e-ico" style="color:var(--red-500)">' + ui.icon('alertTriangle', '') + '</div>' +
        '<h3>Could not load users</h3><p>' + ui.escapeHtml(err.message) + '</p></div>';
    });
  }

  function init() {
    var user = LSDS.layout.init({ active: 'users', title: 'Users & Roles' });
    if (!user) return;
    shell();
    LSDS.api.roles.list().then(function (res) {
      var sel = ui.qs('#f-role');
      (res.data || []).forEach(function (r) {
        var o = document.createElement('option');
        o.value = r.role_key; o.textContent = r.role_name + ' (' + r.users_count + ')';
        sel.appendChild(o);
      });
    }).catch(function () {});
    LSDS.api.departments.list().then(function (res) {
      var sel = ui.qs('#f-dept');
      (res.data || []).forEach(function (d) {
        var o = document.createElement('option');
        o.value = d.code; o.textContent = d.name;
        sel.appendChild(o);
      });
    }).catch(function () {});
    load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
