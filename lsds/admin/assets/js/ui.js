/* ============================================================================
 * LSDS Admin - UI helpers
 * ----------------------------------------------------------------------------
 * Formatting, icon set, status badges, toasts and small DOM helpers.
 * Exposes window.LSDS.ui.
 * ========================================================================== */
(function (window, document) {
  'use strict';

  var LSDS = (window.LSDS = window.LSDS || {});
  var cfg = LSDS.config;

  /* --- DOM ---------------------------------------------------------------- */
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, attrs, html) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') node.className = attrs[k];
      else if (k === 'dataset') Object.keys(attrs[k]).forEach(function (d) { node.dataset[d] = attrs[k][d]; });
      else node.setAttribute(k, attrs[k]);
    });
    if (html != null) node.innerHTML = html;
    return node;
  }
  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* --- Formatting --------------------------------------------------------- */
  function formatNumber(n) {
    if (n == null || isNaN(n)) return '0';
    return new Intl.NumberFormat(cfg.locale || 'en-NG').format(n);
  }
  function formatCurrency(n, compact) {
    if (n == null || isNaN(n)) return cfg.currencySymbol + '0';
    if (compact && Math.abs(n) >= 1000000) {
      return cfg.currencySymbol + (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
    }
    if (compact && Math.abs(n) >= 1000) {
      return cfg.currencySymbol + (n / 1000).toFixed(0) + 'k';
    }
    return cfg.currencySymbol + new Intl.NumberFormat(cfg.locale || 'en-NG', { maximumFractionDigits: 0 }).format(n);
  }
  function parseDate(iso) {
    if (!iso) return null;
    var d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  }
  function formatDate(iso, opts) {
    var d = parseDate(iso);
    if (!d) return '\u2014';
    return d.toLocaleDateString(cfg.locale || 'en-NG', opts || { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function formatDateTime(iso) {
    var d = parseDate(iso);
    if (!d) return '\u2014';
    return d.toLocaleDateString(cfg.locale || 'en-NG', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ', ' + d.toLocaleTimeString(cfg.locale || 'en-NG', { hour: '2-digit', minute: '2-digit' });
  }
  function relativeTime(iso) {
    var d = parseDate(iso);
    if (!d) return '';
    var diff = (Date.now() - d.getTime()) / 1000;
    var future = diff < 0;
    diff = Math.abs(diff);
    var units = [
      ['year', 31536000], ['month', 2592000], ['day', 86400],
      ['hour', 3600], ['minute', 60], ['second', 1]
    ];
    for (var i = 0; i < units.length; i++) {
      var amount = Math.floor(diff / units[i][1]);
      if (amount >= 1) {
        var label = amount + ' ' + units[i][0] + (amount > 1 ? 's' : '');
        return future ? 'in ' + label : label + ' ago';
      }
    }
    return 'just now';
  }
  function initials(name) {
    if (!name) return '?';
    var parts = String(name).trim().split(/\s+/);
    return ((parts[0] || '')[0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }
  function titleCase(str) {
    return String(str || '').replace(/_/g, ' ').replace(/\w\S*/g, function (t) {
      return t.charAt(0).toUpperCase() + t.substr(1).toLowerCase();
    });
  }

  /* --- Status metadata ---------------------------------------------------- */
  var STATUS_META = {
    draft:                         { label: 'Draft',                 tone: 'gray' },
    submitted:                     { label: 'Submitted',             tone: 'sky' },
    pending_principal_manager:     { label: 'Principal Manager',     tone: 'amber' },
    pending_agm:                   { label: 'AGM Review',            tone: 'amber' },
    pending_gm:                    { label: 'GM Review',             tone: 'amber' },
    pending_learning_development:  { label: 'L&D Review',            tone: 'amber' },
    returned_for_correction:       { label: 'Returned',              tone: 'red' },
    pending_financial_review:      { label: 'Financial Review',      tone: 'violet' },
    financially_approved:          { label: 'Financially Approved',  tone: 'green' },
    pending_disbursement:          { label: 'Pending Disbursement',  tone: 'violet' },
    partially_disbursed:           { label: 'Partially Disbursed',   tone: 'sky' },
    disbursed:                     { label: 'Disbursed',             tone: 'green' },
    approved:                      { label: 'Approved',              tone: 'green' },
    rejected:                      { label: 'Rejected',              tone: 'red' },
    completed:                     { label: 'Completed',             tone: 'green' },
    cancelled:                     { label: 'Cancelled',             tone: 'gray' },
    published:                     { label: 'Published',             tone: 'green' },
    postponed:                     { label: 'Postponed',             tone: 'amber' },
    open:                          { label: 'Open',                  tone: 'amber' },
    assigned:                      { label: 'Assigned',              tone: 'sky' },
    in_progress:                   { label: 'In Progress',           tone: 'sky' },
    pending_user_response:         { label: 'Awaiting User',         tone: 'amber' },
    resolved:                      { label: 'Resolved',              tone: 'green' },
    closed:                        { label: 'Closed',                tone: 'gray' },
    live:                          { label: 'Live',                  tone: 'red' },
    scheduled:                     { label: 'Scheduled',             tone: 'blue' },
    ended:                         { label: 'Ended',                 tone: 'gray' },
    pending_review:                { label: 'Pending Review',        tone: 'amber' },
    under_review:                  { label: 'Under Review',          tone: 'amber' },
    authorized:                    { label: 'Authorized',            tone: 'green' }
  };
  function statusMeta(status) {
    return STATUS_META[status] || { label: titleCase(status), tone: 'gray' };
  }
  function badge(status) {
    var m = statusMeta(status);
    return '<span class="badge badge-' + m.tone + '"><span class="badge-dot"></span>' + escapeHtml(m.label) + '</span>';
  }

  /* --- Icons -------------------------------------------------------------- */
  var PATHS = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
    fileText: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    checkCircle: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    badgeCheck: '<path d="M12 2l2.4 2.1 3.2-.4 1.2 3 2.8 1.6-1 3.1 1 3.1-2.8 1.6-1.2 3-3.2-.4L12 22l-2.4-2.1-3.2.4-1.2-3L2.4 15.7l1-3.1-1-3.1L5.2 8l1.2-3 3.2.4z"/><polyline points="9 12 11 14 15 10"/>',
    wallet: '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
    banknote: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
    presentation: '<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    video: '<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
    folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
    play: '<circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    lifeBuoy: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="4.93" y1="4.93" x2="9.17" y2="9.17"/><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"/><line x1="14.83" y1="9.17" x2="19.07" y2="4.93"/><line x1="9.17" y1="14.83" x2="4.93" y2="19.07"/>',
    barChart: '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    building: '<rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01"/>',
    gitBranch: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="6" r="3"/><path d="M18 9v3a3 3 0 0 1-3 3H9"/><line x1="6" y1="9" x2="6" y2="15"/>',
    sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
    search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
    chevronDown: '<polyline points="6 9 12 15 18 9"/>',
    logOut: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    mapPin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    arrowUp: '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>',
    arrowDown: '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
    alertTriangle: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
    externalLink: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>'
  };
  function icon(name, cls) {
    var p = PATHS[name] || '';
    return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }
  function logoMark(cls) {
    return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<path d="M12 3 2 8l10 5 8-4v6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M6 10.5V15c0 1.66 2.69 3 6 3s6-1.34 6-3v-4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  /* --- Toasts ------------------------------------------------------------- */
  var toastHost = null;
  function toastHostRef() {
    if (!toastHost) {
      toastHost = el('div', { class: 'toasts', 'aria-live': 'polite' });
      document.body.appendChild(toastHost);
    }
    return toastHost;
  }
  function toast(opts) {
    if (typeof opts === 'string') opts = { message: opts };
    opts = opts || {};
    var type = opts.type || 'info';
    var iconName = type === 'success' ? 'check' : type === 'error' ? 'alertTriangle' : 'bell';
    var node = el('div', { class: 'toast ' + type },
      '<span class="t-ico">' + icon(iconName, '') + '</span>' +
      '<div><b>' + escapeHtml(opts.title || titleCase(type)) + '</b>' +
      (opts.message ? '<p>' + escapeHtml(opts.message) + '</p>' : '') + '</div>');
    toastHostRef().appendChild(node);
    setTimeout(function () {
      node.style.transition = 'opacity .25s, transform .25s';
      node.style.opacity = '0';
      node.style.transform = 'translateY(6px)';
      setTimeout(function () { node.remove(); }, 260);
    }, opts.duration || 4200);
  }

  /* --- Popovers ----------------------------------------------------------- */
  function wirePopover(root) {
    var toggles = qsa('[data-pop]', root || document);
    toggles.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = btn.getAttribute('data-pop');
        var menu = document.getElementById(id);
        if (!menu) return;
        var open = !menu.classList.contains('hidden');
        closeAllPopovers();
        if (!open) menu.classList.remove('hidden');
        btn.setAttribute('aria-expanded', String(!open));
      });
    });
  }
  function closeAllPopovers() {
    qsa('.pop-menu').forEach(function (m) { m.classList.add('hidden'); });
    qsa('[data-pop]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
  }
  document.addEventListener('click', function (e) {
    if (!e.target.closest || !e.target.closest('.pop')) closeAllPopovers();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAllPopovers();
  });

  /* --- KPI stat card ------------------------------------------------------- */
  function statCard(s) {
    var value;
    if (typeof s.value === 'number') value = s.format === 'currency' ? formatCurrency(s.value, true) : formatNumber(s.value);
    else value = escapeHtml(s.value === undefined || s.value === null ? '\u2014' : String(s.value));
    var trend = s.trend
      ? '<span class="trend ' + s.trend.dir + '">' + icon(s.trend.dir === 'up' ? 'arrowUp' : 'arrowDown', '') + escapeHtml(s.trend.text) + '</span>'
      : '';
    var foot = trend || s.foot ? '<div class="stat-foot">' + trend + (s.foot ? '<span class="muted">' + escapeHtml(s.foot) + '</span>' : '') + '</div>' : '';
    return '<article class="stat">' +
      '<div class="stat-top">' +
        '<span class="stat-label" style="margin:0">' + escapeHtml(s.label) + '</span>' +
        '<span class="stat-ico ico-' + escapeHtml(s.tone || 'blue') + '">' + icon(s.icon || 'barChart', '') + '</span>' +
      '</div>' +
      '<div class="stat-value">' + value + '</div>' + foot +
    '</article>';
  }

  /* --- Misc helpers ------------------------------------------------------- */
  function debounce(fn, ms) {
    var t;
    return function () {
      var ctx = this, args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, ms || 250);
    };
  }
  function param(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  /* --- Modal -------------------------------------------------------------- */
  function modal(opts) {
    opts = opts || {};
    var overlay = el('div', { class: 'modal-overlay' });
    var card = el('div', { class: 'modal ' + (opts.size || '') });
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.innerHTML =
      '<div class="modal-head"><h3>' + escapeHtml(opts.title || '') + '</h3>' +
        '<button class="modal-x" data-close aria-label="Close">' + icon('x', '') + '</button></div>' +
      '<div class="modal-body">' + (opts.body || '') + '</div>' +
      (opts.actions && opts.actions.length ? '<div class="modal-foot"></div>' : '');
    overlay.appendChild(card);

    var handle = { close: close, card: card };
    function close() {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape' && opts.dismissable !== false) close(); }

    if (opts.actions) {
      var foot = qs('.modal-foot', card);
      opts.actions.forEach(function (a) {
        var btn = el('button', { class: 'btn ' + (a.class || 'btn-secondary') }, escapeHtml(a.label));
        if (a.id) btn.id = a.id;
        btn.addEventListener('click', function () { if (a.onClick) a.onClick(handle); });
        foot.appendChild(btn);
      });
    }
    var xBtn = qs('[data-close]', card);
    if (xBtn) xBtn.addEventListener('click', close);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay && opts.dismissable !== false) close();
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
    if (opts.onOpen) opts.onOpen(card, handle);
    return handle;
  }

  function confirm(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      modal({
        title: opts.title || 'Please confirm',
        body: '<p class="muted">' + escapeHtml(opts.message || '') + '</p>',
        actions: [
          { label: opts.cancelLabel || 'Cancel', class: 'btn-secondary', onClick: function (h) { h.close(); resolve(false); } },
          { label: opts.confirmLabel || 'Confirm', class: opts.danger ? 'btn-danger' : 'btn-primary', onClick: function (h) { h.close(); resolve(true); } }
        ]
      });
    });
  }

  /* --- Pagination --------------------------------------------------------- */
  function pageList(page, pages) {
    var out = [];
    if (pages <= 7) { for (var i = 1; i <= pages; i++) out.push(i); return out; }
    out.push(1);
    var start = Math.max(2, page - 1), end = Math.min(pages - 1, page + 1);
    if (start > 2) out.push('\u2026');
    for (var j = start; j <= end; j++) out.push(j);
    if (end < pages - 1) out.push('\u2026');
    out.push(pages);
    return out;
  }
  function pagination(info) {
    var wrap = el('div', { class: 'pager' });
    function draw() {
      var from = info.total ? (info.page - 1) * info.perPage + 1 : 0;
      var to = Math.min(info.total, info.page * info.perPage);
      var nums = pageList(info.page, Math.max(1, info.pages)).map(function (p) {
        if (p === '\u2026') return '<span class="ellipsis">\u2026</span>';
        return '<button type="button" data-page="' + p + '"' + (p === info.page ? ' class="active"' : '') + '>' + p + '</button>';
      }).join('');
      wrap.innerHTML =
        '<span class="info">Showing <b>' + from + '\u2013' + to + '</b> of <b>' + info.total + '</b></span>' +
        '<span class="pages">' +
          '<button type="button" data-page="' + (info.page - 1) + '"' + (info.page <= 1 ? ' disabled' : '') + ' aria-label="Previous">\u2039</button>' +
          nums +
          '<button type="button" data-page="' + (info.page + 1) + '"' + (info.page >= info.pages ? ' disabled' : '') + ' aria-label="Next">\u203a</button>' +
        '</span>';
      qsa('button[data-page]', wrap).forEach(function (b) {
        b.addEventListener('click', function () {
          var p = parseInt(b.getAttribute('data-page'), 10);
          if (isNaN(p) || p < 1 || p > info.pages || p === info.page) return;
          info.page = p;
          info.onChange && info.onChange(p);
        });
      });
    }
    draw();
    return { el: wrap, update: function (next) { Object.assign(info, next); draw(); } };
  }

  /* --- Form modal --------------------------------------------------------- */
  function fieldControl(f) {
    var id = 'fm-' + f.name;
    var val = f.value == null ? '' : f.value;
    if (f.type === 'textarea') {
      return '<textarea class="textarea" id="' + id + '" data-field="' + f.name + '" rows="' + (f.rows || 4) + '"' +
        (f.placeholder ? ' placeholder="' + escapeHtml(f.placeholder) + '"' : '') + '>' + escapeHtml(val) + '</textarea>';
    }
    if (f.type === 'select') {
      return '<select class="select" id="' + id + '" data-field="' + f.name + '">' +
        (f.options || []).map(function (o) {
          var v = o && o.v != null ? o.v : o;
          var l = o && o.l != null ? o.l : o;
          return '<option value="' + escapeHtml(v) + '"' + (String(v) === String(val) ? ' selected' : '') + '>' + escapeHtml(l) + '</option>';
        }).join('') + '</select>';
    }
    if (f.type === 'checkbox') {
      return '<label class="checkbox"><input type="checkbox" id="' + id + '" data-field="' + f.name + '"' +
        (val ? ' checked' : '') + '> ' + escapeHtml(f.checkboxLabel || '') + '</label>';
    }
    var attrs = '';
    if (f.min != null) attrs += ' min="' + f.min + '"';
    if (f.max != null) attrs += ' max="' + f.max + '"';
    if (f.step != null) attrs += ' step="' + f.step + '"';
    return '<input class="input" id="' + id + '" data-field="' + f.name + '" type="' + (f.type || 'text') + '" value="' + escapeHtml(val) + '"' +
      (f.placeholder ? ' placeholder="' + escapeHtml(f.placeholder) + '"' : '') + attrs + '>';
  }

  function formModal(opts) {
    opts = opts || {};
    var fields = opts.fields || [];
    var body = '<form class="lsds-form" novalidate><div class="form-error hidden" data-form-error></div>' +
      '<div class="form-grid">' +
      fields.map(function (f) {
        return '<div class="field' + (f.half ? '' : ' span-2') + '">' +
          '<label class="label" for="fm-' + f.name + '">' + escapeHtml(f.label || '') +
            (f.required ? ' <b style="color:var(--red-600)">*</b>' : '') + '</label>' +
          fieldControl(f) +
          (f.hint ? '<div class="help">' + escapeHtml(f.hint) + '</div>' : '') +
        '</div>';
      }).join('') + '</div></form>';

    function submit(h, force) {
      var card = h.card;
      var errorBox = qs('[data-form-error]', card);
      var values = {};
      var missing = null;
      fields.forEach(function (f) {
        var el = qs('[data-field="' + f.name + '"]', card);
        if (!el) return;
        var v = f.type === 'checkbox' ? el.checked : el.value;
        if (f.type === 'number' && v !== '') v = Number(v);
        values[f.name] = v;
        if (f.required && (v === '' || v === null || v === undefined) && !missing) missing = f;
      });
      if (missing && !force) {
        if (errorBox) { errorBox.textContent = (missing.label || 'This field') + ' is required.'; errorBox.classList.remove('hidden'); }
        return;
      }
      if (errorBox) errorBox.classList.add('hidden');
      var result = opts.onSubmit(values, h);
      if (result && typeof result.then === 'function') {
        var btns = qsa('.modal-foot .btn', card);
        btns.forEach(function (b) { b.disabled = true; });
        result.then(function () { h.close(); }).catch(function (err) {
          btns.forEach(function (b) { b.disabled = false; });
          if (errorBox) {
            errorBox.textContent = (err && err.message) || 'Could not save. Please try again.';
            errorBox.classList.remove('hidden');
          }
        });
      } else {
        h.close();
      }
    }

    return modal({
      title: opts.title || '',
      size: opts.size || 'lg',
      body: body,
      dismissable: false,
      actions: [
        { label: opts.cancelLabel || 'Cancel', class: 'btn-secondary', onClick: function (h) { h.close(); } },
        { label: opts.submitLabel || 'Save', class: 'btn-primary', onClick: function (h) { submit(h, false); } }
      ],
      onOpen: function (card, h) {
        var form = qs('.lsds-form', card);
        if (form) form.addEventListener('submit', function (e) { e.preventDefault(); submit(h, false); });
        var first = qs('[data-field]', card);
        if (first) first.focus();
      }
    });
  }

  LSDS.ui = {
    qs: qs, qsa: qsa, el: el, escapeHtml: escapeHtml,
    formatNumber: formatNumber, formatCurrency: formatCurrency,
    formatDate: formatDate, formatDateTime: formatDateTime,
    relativeTime: relativeTime, initials: initials, titleCase: titleCase,
    statusMeta: statusMeta, badge: badge, statCard: statCard,
    icon: icon, logoMark: logoMark,
    toast: toast, wirePopover: wirePopover, closeAllPopovers: closeAllPopovers,
    debounce: debounce, param: param, modal: modal, confirm: confirm, formModal: formModal, pagination: pagination
  };
})(window, document);
