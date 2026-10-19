/* ============================================================================
 * LSDS Admin - Application shell
 * ----------------------------------------------------------------------------
 * Renders the persistent sidebar and topbar, wires navigation, the
 * notification centre and the account menu. Exposes window.LSDS.layout and a
 * shared window.LSDS.state bag used to pass data between pages and the shell.
 * ========================================================================== */
(function (window, document) {
  'use strict';

  var LSDS = (window.LSDS = window.LSDS || {});
  var cfg = LSDS.config;
  var ui = LSDS.ui;
  var auth = LSDS.auth;

  LSDS.state = LSDS.state || { badges: {}, notifications: [] };

  var activeKey = 'dashboard';

  /* --- Sidebar ------------------------------------------------------------ */
  function buildNav() {
    var html = '';
    cfg.nav.forEach(function (group) {
      if (group.roles && !auth.hasAnyRole(group.roles)) return;
      var items = group.items.filter(function (it) { return !it.roles || auth.hasAnyRole(it.roles); });
      if (!items.length) return;
      html += '<div class="nav-group-label">' + ui.escapeHtml(group.group) + '</div>';
      items.forEach(function (it) {
        var badge = '';
        if (it.badge && LSDS.state.badges[it.key]) {
          badge = '<span class="count">' + ui.escapeHtml(LSDS.state.badges[it.key]) + '</span>';
        }
        var cls = 'nav-item';
        if (it.key === activeKey) cls += ' active';
        if (it.href === '#') cls += ' soon';
        html += '<a class="' + cls + '" href="' + it.href + '" data-nav="' + it.key + '">' +
          ui.icon(it.icon, 'ico') +
          '<span class="label">' + ui.escapeHtml(it.label) + '</span>' + badge + '</a>';
      });
    });
    return html;
  }

  function renderSidebar(host) {
    var user = auth.getUser();
    host.innerHTML =
      '<div class="sidebar-brand">' +
        '<span class="mark">' + ui.logoMark('') + '</span>' +
        '<span class="name">' + ui.escapeHtml(cfg.shortName) + '<small>' + ui.escapeHtml(cfg.organisation) + '</small></span>' +
      '</div>' +
      '<nav class="sidebar-nav" aria-label="Primary">' + buildNav() + '</nav>' +
      '<div class="sidebar-foot">' +
        '<div>v' + ui.escapeHtml(cfg.version) + ' &middot; ' + (cfg.useMock ? 'Demo data' : 'Live') + '</div>' +
        '<div style="margin-top:2px">Signed in as ' + ui.escapeHtml(user ? user.name : '\u2014') + '</div>' +
      '</div>';

    ui.qsa('[data-nav]', host).forEach(function (link) {
      link.addEventListener('click', function (e) {
        var key = link.getAttribute('data-nav');
        if (key === activeKey) { e.preventDefault(); return; }
        if (link.getAttribute('href') === '#') {
          e.preventDefault();
          var label = link.querySelector('.label').textContent;
          ui.toast({ type: 'info', title: 'Coming soon', message: label + ' will be available in a later build.' });
        }
      });
    });
  }

  /* --- Topbar ------------------------------------------------------------- */
  function renderNotificationItems() {
    var list = LSDS.state.notifications || [];
    if (!list.length) {
      return '<div class="pop-body"><div style="padding:34px 20px;text-align:center;color:var(--text-muted)">' +
        ui.icon('bell', '') + '<div style="margin-top:8px">You are all caught up.</div></div></div>';
    }
    var body = list.map(function (n) {
      return '<div class="notif-item ' + (n.unread ? 'unread' : '') + '" data-notif="' + ui.escapeHtml(n.id) + '">' +
        '<span class="n-ico ico-' + ui.escapeHtml(n.tone || 'blue') + '">' + ui.icon(n.icon || 'bell', '') + '</span>' +
        '<div class="n-body">' +
          '<p><b>' + ui.escapeHtml(n.title) + '</b></p>' +
          '<p class="muted">' + ui.escapeHtml(n.body) + '</p>' +
          '<div class="n-time">' + ui.relativeTime(n.at) + '</div>' +
        '</div></div>';
    }).join('');
    return '<div class="pop-body">' + body + '</div>' +
      '<div class="pop-foot"><a href="#" id="mark-all-read">Mark all as read</a></div>';
  }

  function renderTopbar(host) {
    var user = auth.getUser() || { name: 'User', email: '', roles: [] };
    var unread = (LSDS.state.notifications || []).filter(function (n) { return n.unread; }).length;

    host.innerHTML =
      '<button class="icon-btn mobile-only" id="nav-toggle" aria-label="Toggle navigation">' + ui.icon('menu', '') + '</button>' +
      '<label class="search">' + ui.icon('search', '') +
        '<input id="global-search" type="search" placeholder="Search applications, documents, people\u2026" aria-label="Search">' +
        '<kbd>/</kbd>' +
      '</label>' +
      '<span class="grow"></span>' +
      '<div class="pop">' +
        '<button class="icon-btn" data-pop="notif-menu" aria-haspopup="true" aria-expanded="false" aria-label="Notifications">' +
          ui.icon('bell', '') + (unread ? '<span class="dot" id="notif-dot"></span>' : '') +
        '</button>' +
        '<div class="pop-menu hidden" id="notif-menu" role="menu">' +
          '<div class="pop-head"><b>Notifications</b><span class="badge badge-blue">' + unread + ' new</span></div>' +
          renderNotificationItems() +
        '</div>' +
      '</div>' +
      '<div class="pop">' +
        '<button class="user-btn" data-pop="user-menu" aria-haspopup="true" aria-expanded="false">' +
          '<span class="avatar">' + ui.escapeHtml(ui.initials(user.name)) + '</span>' +
          '<span class="who"><b>' + ui.escapeHtml(user.name) + '</b><span>' + ui.escapeHtml(user.designation || 'Staff') + '</span></span>' +
          '<span style="color:var(--text-faint);width:18px;height:18px">' + ui.icon('chevronDown', '') + '</span>' +
        '</button>' +
        '<div class="pop-menu sm hidden" id="user-menu" role="menu">' +
          '<div class="menu-user">' +
            '<span class="avatar lg">' + ui.escapeHtml(ui.initials(user.name)) + '</span>' +
            '<div class="who"><b>' + ui.escapeHtml(user.name) + '</b><span>' + ui.escapeHtml(user.email) + '</span></div>' +
          '</div>' +
          '<div class="menu-sep"></div>' +
          '<a class="menu-item" href="#">' + ui.icon('user', 'ico') + 'My Profile</a>' +
          '<a class="menu-item" href="#">' + ui.icon('fileText', 'ico') + 'My Applications</a>' +
          '<a class="menu-item" href="#">' + ui.icon('settings', 'ico') + 'Account Settings</a>' +
          '<a class="menu-item" href="#">' + ui.icon('help', 'ico') + 'Help & Support</a>' +
          '<div class="menu-sep"></div>' +
          '<button class="menu-item danger" id="logout-btn">' + ui.icon('logOut', 'ico') + 'Sign out</button>' +
        '</div>' +
      '</div>';

    ui.wirePopover(host);

    var toggle = ui.qs('#nav-toggle', host);
    if (toggle) toggle.addEventListener('click', function () {
      document.body.classList.toggle('nav-open');
    });

    var logout = ui.qs('#logout-btn', host);
    if (logout) logout.addEventListener('click', function () {
      ui.closeAllPopovers();
      auth.logout('You have been signed out.');
    });

    var markAll = ui.qs('#mark-all-read', host);
    if (markAll) markAll.addEventListener('click', function (e) {
      e.preventDefault();
      LSDS.state.notifications.forEach(function (n) { n.unread = false; });
      var menu = ui.qs('#notif-menu');
      if (menu) {
        menu.querySelector('.pop-head').innerHTML = '<b>Notifications</b><span class="badge badge-gray">0 new</span>';
        var body = menu.querySelector('.pop-body');
        if (body) body.outerHTML = renderNotificationItems();
        var dot = ui.qs('#notif-dot');
        if (dot) dot.remove();
      }
      ui.toast({ type: 'success', title: 'Notifications cleared' });
    });

    var search = ui.qs('#global-search', host);
    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && !/input|textarea/i.test((document.activeElement || {}).tagName || '')) {
        e.preventDefault();
        if (search) search.focus();
      }
    });
  }

  /* --- Notification loading ---------------------------------------------- */
  function loadNotifications(force) {
    if (LSDS.state.notifications.length && !force) return Promise.resolve();
    return LSDS.api.notifications.list().then(function (res) {
      LSDS.state.notifications = (res && res.notifications) || [];
      var menu = ui.qs('#notif-menu');
      if (menu) {
        var unread = LSDS.state.notifications.filter(function (n) { return n.unread; }).length;
        var head = menu.querySelector('.pop-head');
        if (head) head.innerHTML = '<b>Notifications</b><span class="badge badge-' + (unread ? 'blue' : 'gray') + '">' + unread + ' new</span>';
        var body = menu.querySelector('.pop-body');
        if (body) {
          var tmp = ui.el('div', {}, renderNotificationItems());
          body.replaceWith(tmp.firstChild);
        }
        var dot = ui.qs('#notif-dot');
        if (dot && !unread) dot.remove();
      }
    }).catch(function () { /* notifications are non-critical */ });
  }

  /* --- Public init -------------------------------------------------------- */
  function init(opts) {
    opts = opts || {};
    activeKey = opts.active || 'dashboard';
    auth.requireAuth();
    if (opts.title) document.title = opts.title + ' \u00b7 ' + cfg.shortName;

    var sidebar = document.getElementById('sidebar');
    var topbar = document.getElementById('topbar');
    if (sidebar) renderSidebar(sidebar);
    if (topbar) { renderTopbar(topbar); loadNotifications(); }

    return auth.getUser();
  }

  LSDS.layout = {
    init: init,
    setBadge: function (key, value) {
      LSDS.state.badges[key] = value;
      var link = ui.qs('[data-nav="' + key + '"]');
      if (link) {
        var c = link.querySelector('.count');
        if (!c) { c = ui.el('span', { class: 'count' }); link.appendChild(c); }
        c.textContent = value;
      }
    },
    loadNotifications: loadNotifications
  };
})(window, document);
