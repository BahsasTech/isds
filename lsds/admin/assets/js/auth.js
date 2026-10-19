/* ============================================================================
 * LSDS Admin - Authentication & session
 * ----------------------------------------------------------------------------
 * Session persistence, route guard, role helpers and the login page
 * controller. Exposes window.LSDS.auth.
 * ========================================================================== */
(function (window, document) {
  'use strict';

  var LSDS = (window.LSDS = window.LSDS || {});
  var cfg = LSDS.config;
  var ui = LSDS.ui;

  function readRaw() {
    return window.localStorage.getItem(cfg.sessionKey) || window.sessionStorage.getItem(cfg.sessionKey);
  }
  function parse(raw) {
    if (!raw) return null;
    try {
      var s = JSON.parse(raw);
      return s && s.user ? s : null;
    } catch (e) { return null; }
  }

  function getSession() { return parse(readRaw()); }
  function getUser() { var s = getSession(); return s ? s.user : null; }

  function persist(session, remember) {
    (remember ? window.localStorage : window.sessionStorage).setItem(cfg.sessionKey, JSON.stringify(session));
  }
  function clear() {
    window.localStorage.removeItem(cfg.sessionKey);
    window.sessionStorage.removeItem(cfg.sessionKey);
  }

  function hasRole(role) {
    var u = getUser();
    return !!(u && u.roles && u.roles.indexOf(role) !== -1);
  }
  function hasAnyRole(roles) {
    if (!roles || !roles.length) return true;
    var u = getUser();
    if (!u || !u.roles) return false;
    return roles.some(function (r) { return u.roles.indexOf(r) !== -1; });
  }

  function requireAuth() {
    var s = getSession();
    if (!s) {
      var next = encodeURIComponent(window.location.pathname.split('/').pop() || 'dashboard.html');
      window.location.replace('index.html?next=' + next);
      return null;
    }
    return s.user;
  }

  function login(email, password, remember) {
    return LSDS.api.auth.login(email, password, remember).then(function (session) {
      if (session && session.user) persist(session, remember);
      return session;
    });
  }

  function logout(reason) {
    return LSDS.api.auth.logout().catch(function () {}).then(function () {
      clear();
      window.location.replace('index.html' + (reason ? '?notice=' + encodeURIComponent(reason) : ''));
    });
  }

  /* ------------------------------------------------------------------ *
   * Login page controller
   * ------------------------------------------------------------------ */
  function initLogin() {
    var form = ui.qs('#login-form');
    if (!form) return;

    if (getSession()) { window.location.replace('dashboard.html'); return; }

    var emailInput = ui.qs('#email', form);
    var passInput = ui.qs('#password', form);
    var remember = ui.qs('#remember', form);
    var toggle = ui.qs('#toggle-password', form);
    var submit = ui.qs('#login-submit', form);
    var errorBox = ui.qs('#login-error', form);

    var notice = new URLSearchParams(window.location.search).get('notice');
    if (notice) ui.toast({ type: 'info', title: 'Signed out', message: notice });

    if (toggle) {
      toggle.addEventListener('click', function () {
        var showing = passInput.type === 'text';
        passInput.type = showing ? 'password' : 'text';
        toggle.innerHTML = ui.icon(showing ? 'eye' : 'eyeOff', '');
        toggle.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
      });
    }

    function showError(msg) {
      errorBox.innerHTML = ui.icon('alertTriangle', '') + '<span>' + ui.escapeHtml(msg) + '</span>';
      errorBox.classList.remove('hidden');
    }
    function hideError() { errorBox.classList.add('hidden'); }

    function setLoading(on) {
      submit.disabled = on;
      submit.innerHTML = on
        ? '<span class="spinner"></span>Sending\u2026'
        : 'Sign in';
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      hideError();

      var email = (emailInput.value || '').trim();
      var password = passInput.value || '';
      if (!email || !password) { showError('Please enter your email and password.'); return; }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { showError('Enter a valid email address.'); return; }

      setLoading(true);
      login(email, password, remember && remember.checked)
        .then(function () {
          var next = new URLSearchParams(window.location.search).get('next');
          window.location.replace(next || 'dashboard.html');
        })
        .catch(function (err) {
          setLoading(false);
          showError(err && err.message ? err.message : 'Unable to sign in. Please try again.');
          passInput.value = '';
          passInput.focus();
        });
    });
  }

  LSDS.auth = {
    getSession: getSession,
    getUser: getUser,
    persist: persist,
    clear: clear,
    hasRole: hasRole,
    hasAnyRole: hasAnyRole,
    requireAuth: requireAuth,
    login: login,
    logout: logout,
    initLogin: initLogin
  };

  document.addEventListener('DOMContentLoaded', initLogin);
})(window, document);
