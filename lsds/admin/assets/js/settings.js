/* ============================================================================
 * LSDS Admin - System Settings
 * ========================================================================== */
(function (window, document) {
  'use strict';

  var LSDS = window.LSDS;
  var ui = LSDS.ui;

  var all = [];
  var groups = [];

  function stats() {
    var security = all.filter(function (s) { return s.setting_group === 'Security'; }).length;
    var latest = all.reduce(function (m, s) { return !m || new Date(s.updated_at) > new Date(m) ? s.updated_at : m; }, null);
    return '<div class="grid stats">' +
      ui.statCard({ label: 'Settings', value: all.length, icon: 'sliders', tone: 'blue', foot: groups.length + ' groups' }) +
      ui.statCard({ label: 'Groups', value: groups.length, icon: 'grid', tone: 'sky' }) +
      ui.statCard({ label: 'Security controls', value: security, icon: 'shield', tone: 'violet' }) +
      ui.statCard({ label: 'Last updated', value: ui.formatDate(latest), icon: 'clock', tone: 'green' }) +
    '</div>';
  }

  function field(s) {
    var id = 'set-' + s.setting_key;
    var control;
    if (s.setting_type === 'boolean') {
      control = '<label class="switch"><input type="checkbox" id="' + id + '"' + (s.setting_value === 'true' ? ' checked' : '') + '><span class="switch-track"></span>' +
        '<span class="switch-label">' + (s.setting_value === 'true' ? 'Enabled' : 'Disabled') + '</span></label>';
    } else if (s.setting_type === 'integer') {
      control = '<input class="input" id="' + id + '" type="number" value="' + ui.escapeHtml(s.setting_value) + '" style="max-width:140px">';
    } else if (s.setting_type === 'json') {
      control = '<input class="input" id="' + id + '" type="text" value="' + ui.escapeHtml(s.setting_value) + '" style="max-width:320px;font-family:var(--font-mono)">';
    } else {
      control = '<input class="input" id="' + id + '" type="text" value="' + ui.escapeHtml(s.setting_value) + '" style="max-width:320px">';
    }
    return '<div class="setting-row">' +
      '<div class="setting-info">' +
        '<div class="t">' + ui.escapeHtml(s.description) + '</div>' +
        '<code class="setting-key">' + ui.escapeHtml(s.setting_key) + '</code>' +
        '<span class="badge badge-gray">' + ui.escapeHtml(s.setting_type) + '</span>' +
      '</div>' +
      '<div class="setting-control">' + control + '</div>' +
    '</div>';
  }

  function groupCards() {
    return groups.map(function (g) {
      var items = all.filter(function (s) { return s.setting_group === g; });
      return '<div class="card" style="margin-bottom:18px">' +
        '<div class="card-head"><h3>' + ui.escapeHtml(g) + '</h3><div class="sub">' + items.length + ' settings</div></div>' +
        '<div class="card-body">' + items.map(field).join('') + '</div>' +
      '</div>';
    }).join('');
  }

  function render() {
    document.getElementById('page-content').innerHTML =
      '<div class="page-head">' +
        '<div><h1>System Settings</h1><p class="sub">Platform-wide configuration for applications, notifications, security and storage.</p></div>' +
        '<div class="page-actions">' +
          '<button class="btn btn-secondary" id="btn-reset">' + ui.icon('refresh', '') + 'Reset</button>' +
          '<button class="btn btn-primary" id="btn-save">' + ui.icon('check', '') + 'Save Changes</button>' +
        '</div>' +
      '</div>' +
      stats() +
      '<div style="height:22px"></div>' +
      groupCards();

    ui.qsa('.switch input').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var label = cb.parentNode.querySelector('.switch-label');
        if (label) label.textContent = cb.checked ? 'Enabled' : 'Disabled';
      });
    });
    ui.qs('#btn-save').addEventListener('click', function () {
      ui.toast({ type: 'success', title: 'Saved', message: 'System settings updated successfully.' });
    });
    ui.qs('#btn-reset').addEventListener('click', function () {
      ui.confirm({ title: 'Reset changes', message: 'Reload the settings from the server and discard unsaved edits?', confirmLabel: 'Reset', danger: true })
        .then(function (ok) { if (ok) load(); });
    });
  }

  function load() {
    document.getElementById('page-content').innerHTML =
      '<div class="stack"><div class="grid stats">' +
        '<div class="skeleton" style="height:100px"></div><div class="skeleton" style="height:100px"></div>' +
        '<div class="skeleton" style="height:100px"></div><div class="skeleton" style="height:100px"></div></div>' +
        '<div class="skeleton" style="height:320px"></div></div>';
    LSDS.api.settings.list().then(function (res) {
      all = res.data || [];
      groups = res.groups || [];
      render();
    }).catch(function (err) {
      document.getElementById('page-content').innerHTML =
        '<div class="empty-state"><div class="e-ico" style="color:var(--red-500)">' + ui.icon('alertTriangle', '') + '</div>' +
        '<h3>Could not load settings</h3><p>' + ui.escapeHtml(err.message) + '</p></div>';
    });
  }

  function init() {
    var user = LSDS.layout.init({ active: 'settings', title: 'System Settings' });
    if (!user) return;
    load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
