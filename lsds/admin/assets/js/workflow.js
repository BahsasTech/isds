/* ============================================================================
 * LSDS Admin - Approval Workflow Configuration
 * ========================================================================== */
(function (window, document) {
  'use strict';

  var LSDS = window.LSDS;
  var ui = LSDS.ui;

  var data = { steps: [], approvers: [], delegations: [], totals: {} };

  function stats() {
    var t = data.totals || {};
    return '<div class="grid stats">' +
      ui.statCard({ label: 'Workflow stages', value: t.steps || data.steps.length, icon: 'gitBranch', tone: 'blue' }) +
      ui.statCard({ label: 'Active approvers', value: t.active_approvers || 0, icon: 'users', tone: 'sky', foot: (t.approvers || 0) + ' assigned' }) +
      ui.statCard({ label: 'Active delegations', value: t.delegations || 0, icon: 'refresh', tone: 'violet' }) +
      ui.statCard({ label: 'Departments covered', value: uniqueDepts(), icon: 'building', tone: 'green' }) +
    '</div>';
  }

  function uniqueDepts() {
    var seen = {};
    data.approvers.forEach(function (a) { seen[a.department_code] = 1; });
    return Object.keys(seen).length;
  }

  function stepTimeline() {
    var items = data.steps.map(function (s, i) {
      var isFirst = i === 0;
      var isLast = i === data.steps.length - 1;
      return '<div class="tl-item">' +
        '<span class="tl-dot ' + (isFirst ? 'current' : isLast ? 'done' : '') + '">' +
          ui.icon(isFirst ? 'fileText' : isLast ? 'check' : 'checkCircle', '') + '</span>' +
        '<div class="tl-body">' +
          '<div class="t">' + (s.stage_order) + '. ' + ui.escapeHtml(s.stage_label) + '</div>' +
          '<div class="s">' + ui.escapeHtml(s.role_label || s.required_role_key) + ' \u00b7 ' +
            '<span class="badge badge-' + (s.scope === 'organization' ? 'violet' : 'sky') + '">' + ui.escapeHtml(s.scope) + '</span>' +
            (s.is_mandatory ? '' : ' <span class="badge badge-gray">Optional</span>') +
            (s.allow_delegate ? ' <span class="badge badge-gray">Delegable</span>' : '') + '</div>' +
          '<div class="tl-comment">' + ui.escapeHtml(s.description) + '</div>' +
        '</div>' +
      '</div>';
    }).join('');
    return '<div class="tl">' + items + '</div>';
  }

  function approversTable() {
    var rows = data.approvers.map(function (a) {
      return '<tr>' +
        '<td><div class="t">' + ui.escapeHtml(a.department) + '</div><div class="s muted">' + ui.escapeHtml(a.department_code) + '</div></td>' +
        '<td class="nowrap"><span class="badge badge-sky">' + ui.escapeHtml(a.position_label) + '</span></td>' +
        '<td><div class="cell-main"><span class="avatar sm">' + ui.escapeHtml(ui.initials(a.approver_name || '?')) + '</span>' +
          '<div class="t">' + ui.escapeHtml(a.approver_name || '\u2014') + '</div></div></td>' +
        '<td class="nowrap muted">' + ui.formatDate(a.start_date) + '</td>' +
        '<td class="nowrap">' + (a.is_active ? '<span class="badge badge-green">Active</span>' : '<span class="badge badge-gray">Inactive</span>') + '</td>' +
      '</tr>';
    }).join('');
    return '<div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>Department</th><th>Position</th><th>Approver</th><th>Since</th><th>Status</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function delegationsTable() {
    if (!data.delegations.length) return '<div class="empty-state"><p>No delegation records.</p></div>';
    var rows = data.delegations.map(function (d) {
      return '<tr>' +
        '<td><div class="t">' + ui.escapeHtml(d.delegator_name) + '</div><div class="s muted">' + ui.escapeHtml(d.position) + '</div></td>' +
        '<td><div class="cell-main"><span class="icon-arrow">' + ui.icon('arrowUp', '') + '</span>' +
          '<div class="t">' + ui.escapeHtml(d.delegate_name) + '</div></div></td>' +
        '<td class="nowrap"><div class="t">' + ui.formatDate(d.start_at) + '</div><div class="s muted">to ' + ui.formatDate(d.end_at) + '</div></td>' +
        '<td>' + ui.escapeHtml(d.reason || '\u2014') + '</td>' +
        '<td class="nowrap"><span class="badge badge-' + (d.status === 'active' ? 'green' : d.status === 'pending' ? 'amber' : 'gray') + '">' + ui.escapeHtml(d.status) + '</span></td>' +
      '</tr>';
    }).join('');
    return '<div class="table-wrap"><table class="data"><thead><tr>' +
      '<th>Delegator</th><th>Delegate</th><th>Window</th><th>Reason</th><th>Status</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function render() {
    document.getElementById('page-content').innerHTML =
      '<div class="page-head">' +
        '<div><h1>Approval Workflow</h1><p class="sub">Configure the training application approval stages, departmental approvers and delegated authority.</p></div>' +
        '<div class="page-actions"><button class="btn btn-secondary" id="btn-edit">' + ui.icon('sliders', '') + 'Edit Workflow</button></div>' +
      '</div>' +
      stats() +
      '<div class="detail-grid" style="margin-top:22px">' +
        '<div class="card"><div class="card-body">' +
          '<div class="section-title">Workflow stages</div>' + stepTimeline() +
        '</div></div>' +
        '<div class="stack-sm">' +
          '<div class="card"><div class="card-body">' +
            '<div class="section-title">Delegated authority</div>' + delegationsTable() +
          '</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="card" style="margin-top:18px">' +
        '<div class="card-head"><h3>Department approvers</h3></div>' +
        approversTable() +
      '</div>';

    ui.qs('#btn-edit').addEventListener('click', function () {
      ui.toast({ type: 'info', title: 'Coming soon', message: 'Workflow editing will be enabled in a later build.' });
    });
  }

  function load() {
    document.getElementById('page-content').innerHTML =
      '<div class="stack"><div class="grid stats">' +
        '<div class="skeleton" style="height:100px"></div><div class="skeleton" style="height:100px"></div>' +
        '<div class="skeleton" style="height:100px"></div><div class="skeleton" style="height:100px"></div></div>' +
        '<div class="skeleton" style="height:340px"></div></div>';
    LSDS.api.workflow.get().then(function (res) {
      data = res;
      render();
    }).catch(function (err) {
      document.getElementById('page-content').innerHTML =
        '<div class="empty-state"><div class="e-ico" style="color:var(--red-500)">' + ui.icon('alertTriangle', '') + '</div>' +
        '<h3>Could not load workflow</h3><p>' + ui.escapeHtml(err.message) + '</p></div>';
    });
  }

  function init() {
    var user = LSDS.layout.init({ active: 'workflow', title: 'Approval Workflow' });
    if (!user) return;
    load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
