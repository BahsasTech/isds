/* ============================================================================
 * LSDS Admin - Configuration
 * ----------------------------------------------------------------------------
 * Single place to point the UI at the PHP backend and to describe the
 * navigation model. Loaded first; exposes window.LSDS.config.
 * ========================================================================== */
(function (window) {
  'use strict';

  var LSDS = (window.LSDS = window.LSDS || {});

  /* Decide whether to call the PHP API or the in-browser mock.
   * The static pages have no server side, so when they are opened straight
   * from disk (file://) there is nothing to call and the mock is used. When
   * they are served by a web server the live PHP/PDO API at apiBase is used.
   * An explicit override is available for testing: ?mock=1 or ?mock=0. */
  function resolveUseMock() {
    var override = null;
    try {
      override = new URLSearchParams(window.location.search).get('mock');
    } catch (e) { override = null; }
    if (override === '1') return true;
    if (override === '0') return false;
    return window.location.protocol === 'file:';
  }

  LSDS.config = {
    appName: 'Learning and Staff Development System',
    shortName: 'LSDS',
    organisation: 'Corporate Services Group',
    version: '1.0.0',

    /* Base URL of the PHP/PDO JSON API.
     * When useMock is false, every call goes to apiBase + path, e.g.
     *   POST {apiBase}/auth/login
     * The mock layer (api.js) mirrors these exact endpoints. */
    apiBase: '/lsds/api',
    useMock: resolveUseMock(),

    currency: 'NGN',
    currencySymbol: '\u20a6',
    locale: 'en-NG',
    requestTimeoutMs: 15000,

    sessionKey: 'lsds.session',
    themeKey: 'lsds.theme'
  };

  /* Sidebar navigation. `roles` (optional) restricts visibility to users
   * holding at least one of the listed role keys. Items without a built page
   * yet carry soon:true and simply raise a notice. */
  LSDS.config.nav = [
    {
      group: 'Overview',
      items: [
        { key: 'dashboard', label: 'Dashboard', icon: 'grid', href: 'dashboard.html' }
      ]
    },
    {
      group: 'Learning & Development',
      items: [
        { key: 'applications', label: 'Training Applications', icon: 'fileText', href: 'applications.html' },
        { key: 'approvals', label: 'Approval Queue', icon: 'checkCircle', href: 'approvals.html', badge: 'pending', roles: ['principal_manager', 'agm', 'gm', 'ld_officer', 'finance_officer', 'sysadmin'] },
        { key: 'sessions', label: 'Knowledge Sessions', icon: 'presentation', href: 'sessions.html' },
        { key: 'courses', label: 'Courses & E-Learning', icon: 'book', href: 'courses.html' },
        { key: 'meetings', label: 'Meetings', icon: 'video', href: 'meetings.html' }
      ]
    },
    {
      group: 'Finance',
      roles: ['sysadmin', 'finance_officer', 'auditor', 'gm', 'agm'],
      items: [
        { key: 'financial', label: 'Financial Records', icon: 'wallet', href: 'financial.html' },
        { key: 'disbursements', label: 'Disbursements', icon: 'banknote', href: 'disbursements.html' }
      ]
    },
    {
      group: 'Knowledge Repository',
      items: [
        { key: 'documents', label: 'Documents', icon: 'folder', href: 'documents.html' },
        { key: 'videos', label: 'Video Library', icon: 'play', href: 'videos.html' },
        { key: 'review', label: 'Content Review', icon: 'checkCircle', href: 'review.html', badge: 'pending', roles: ['sysadmin', 'knowledge_manager'] }
      ]
    },
    {
      group: 'Collaboration',
      items: [
        { key: 'forum', label: 'Discussion Forum', icon: 'message', href: 'forum.html' },
        { key: 'tickets', label: 'Support Tickets', icon: 'lifeBuoy', href: 'tickets.html', roles: ['sysadmin', 'support_technician'] }
      ]
    },
    {
      group: 'Insight',
      items: [
        { key: 'reports', label: 'Reports & Analytics', icon: 'barChart', href: 'reports.html', roles: ['sysadmin', 'ld_officer', 'finance_officer', 'auditor', 'gm'] }
      ]
    },
    {
      group: 'Administration',
      roles: ['sysadmin'],
      items: [
        { key: 'users', label: 'Users & Roles', icon: 'users', href: 'users.html' },
        { key: 'departments', label: 'Departments', icon: 'building', href: 'departments.html' },
        { key: 'workflow', label: 'Approval Workflow', icon: 'gitBranch', href: 'workflow.html' },
        { key: 'settings', label: 'System Settings', icon: 'sliders', href: 'settings.html' },
        { key: 'audit', label: 'Audit Logs', icon: 'shield', href: 'audit.html' },
        { key: 'backups', label: 'Backups', icon: 'database', href: 'backups.html' }
      ]
    }
  ];
})(window);
