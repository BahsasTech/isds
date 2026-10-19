/* ============================================================================
 * LSDS Admin - API layer
 * ----------------------------------------------------------------------------
 * One façade for every server call. When LSDS.config.useMock is true the
 * calls are served from an in-memory dataset below; when false they are sent
 * to the PHP/PDO JSON API at LSDS.config.apiBase using these same paths:
 *
 *   POST   /auth/login          { email, password, remember }
 *   POST   /auth/logout
 *   GET    /auth/session
 *   POST   /auth/forgot-password { email }
 *   GET    /dashboard/summary
 *   GET    /notifications
 *   GET    /applications            ?status&scope&department&type&q&sort&page&per_page
 *   GET    /applications/:id
 *   POST   /applications/:id/decision { decision, comments }
 *   GET    /approvals/queue          ?stage
 *   GET    /users                    ?status&role&department&q
 *   GET    /roles
 *   GET    /departments
 *   POST   /departments             { code, name, description, is_active }
 *   GET    /reviews/queue           pending documents + videos awaiting a decision
 *   POST   /reviews                 { reviewable_type, reviewable_id, decision, comments }
 *   GET    /sessions                 ?status&scope&department&q
 *   GET    /sessions/:id
 *   GET    /financial                ?status&department&q
 *   GET    /disbursements            ?status&method&q
 *   GET    /reports/summary
 *   GET    /documents                ?status&category&department&access&q
 *   GET    /documents/:id
 *   GET    /videos                   ?status&category&department&q
 *   GET    /videos/:id
 *   GET    /discussions              ?status&category&department&q
 *   GET    /discussions/:id
 *   GET    /tickets                  ?status&priority&category&department&q
 *   GET    /tickets/:id
 *   GET    /courses                  ?status&category&department&difficulty&q
 *   GET    /courses/:id
 *   GET    /meetings                 ?status&provider&department&scope&q
 *   GET    /meetings/:id
 *   GET    /workflow
 *   GET    /settings
 *   GET    /audit-logs               ?action&entity&user&q&page&per_page
 *   GET    /backups                  ?status&type
 *
 * Exposes window.LSDS.api. All methods return a Promise.
 * ========================================================================== */
(function (window) {
  'use strict';

  var LSDS = (window.LSDS = window.LSDS || {});
  var cfg = LSDS.config;

  /* ------------------------------------------------------------------ *
   * Transport
   * ------------------------------------------------------------------ */
  function request(method, path, body) {
    if (cfg.useMock) return mock(method, path, body);

    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, cfg.requestTimeoutMs) : null;

    return fetch(cfg.apiBase + path, {
      method: method,
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      if (timer) clearTimeout(timer);
      var type = res.headers && res.headers.get ? (res.headers.get('content-type') || '') : '';
      if (type.indexOf('application/json') === -1) {
        /* The path did not return JSON, so there is no PHP API behind this
         * host (the admin is served statically). Fall back to demo data. */
        return demoFallback(method, path, body);
      }
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (res.status === 401) {
          handleUnauthorized();
        }
        if (!res.ok) {
          var err = new Error(data.message || ('Request failed (' + res.status + ')'));
          err.status = res.status;
          err.data = data;
          throw err;
        }
        return data;
      });
    }).catch(function (err) {
      if (err && err.status) throw err;   /* genuine API error response */
      return demoFallback(method, path, body);
    });
  }

  /* Called when the PHP API cannot be reached (static hosting or an outage).
   * Persistently switch this browsing session to the in-memory demo dataset so
   * every page keeps working, and warn once in the console. */
  function demoFallback(method, path, body) {
    if (!cfg.useMock) {
      cfg.useMock = true;
      cfg.demoFallback = true;
      try {
        console.warn('LSDS: API at ' + cfg.apiBase + ' is unreachable - using offline demo data.');
      } catch (e) { /* console unavailable */ }
    }
    return mock(method, path, body);
  }

  /* Called when the live API reports an expired/absent session (HTTP 401).
   * Clears the cached session and returns the user to the login page. */
  function handleUnauthorized() {
    try {
      window.localStorage.removeItem(cfg.sessionKey);
      window.sessionStorage.removeItem(cfg.sessionKey);
    } catch (e) { /* storage unavailable */ }
    var page = window.location.pathname.split('/').pop() || '';
    if (page && page !== 'index.html') {
      window.location.replace('index.html?next=' + encodeURIComponent(page));
    }
  }

  /* ------------------------------------------------------------------ *
   * Mock dataset
   * ------------------------------------------------------------------ */
  var DEMO_USERS = {
    'admin@lsds.gov.ng':   { name: 'Aisha Bello',    roles: ['sysadmin'],                          designation: 'System Administrator',        department: 'Information & Communication Technology' },
    'ld.officer@lsds.gov.ng': { name: 'Chinedu Okafor', roles: ['ld_officer', 'knowledge_manager'],   designation: 'Learning & Development Officer', department: 'Human Resources' },
    'finance@lsds.gov.ng': { name: 'Fatima Yusuf',   roles: ['finance_officer'],                    designation: 'Finance Officer',             department: 'Finance & Accounts' },
    'auditor@lsds.gov.ng': { name: 'Emeka Nwosu',    roles: ['auditor'],                            designation: 'Internal Auditor',            department: 'Internal Audit' },
    'staff@lsds.gov.ng':   { name: 'Ngozi Adeyemi',  roles: ['staff'],                              designation: 'Administrative Officer',      department: 'Operations' }
  };

  function slugEmail(email) { return String(email || '').trim().toLowerCase(); }

  function fail(message, status) {
    var e = new Error(message);
    e.status = status || 400;
    return e;
  }

  function wait(payload, ms) {
    return new Promise(function (resolve) { setTimeout(function () { resolve(payload); }, ms || 420); });
  }
  function reject(err, ms) {
    return new Promise(function (_, rej) { setTimeout(function () { rej(err); }, ms || 380); });
  }

  function buildSession(email, remember) {
    var u = DEMO_USERS[email];
    return {
      token: 'demo-' + Math.random().toString(36).slice(2),
      remember: !!remember,
      issuedAt: new Date().toISOString(),
      user: {
        id: Object.keys(DEMO_USERS).indexOf(email) + 1,
        name: u.name,
        email: email,
        username: email.split('@')[0],
        roles: u.roles,
        designation: u.designation,
        department: u.department,
        mustChangePassword: false
      }
    };
  }

  function summary() {
    return {
      generatedAt: new Date().toISOString(),
      stats: [
        { key: 'pending',   label: 'Pending My Approval', value: 14,       icon: 'checkCircle', tone: 'amber',  trend: { dir: 'up',   text: '+3 today' },   foot: 'Across 5 departments' },
        { key: 'apps',      label: 'Applications (Month)', value: 47,      icon: 'fileText',    tone: 'blue',   trend: { dir: 'up',   text: '12%' },        foot: 'vs. 42 last month' },
        { key: 'approved',  label: 'Approved (Month)',     value: 23,      icon: 'badgeCheck',  tone: 'green',  trend: { dir: 'up',   text: '8%' },         foot: 'Approval rate 49%' },
        { key: 'disbursed', label: 'Disbursed (Month)',    value: 18450000, format: 'currency', icon: 'wallet', tone: 'violet', trend: { dir: 'down', text: '4%' }, foot: 'of \u20a621.4m authorized' }
      ],
      pipeline: [
        { stage: 1, label: 'Principal Manager Review',        count: 6 },
        { stage: 2, label: 'Assistant General Manager',       count: 4 },
        { stage: 3, label: 'General Manager Review',          count: 2 },
        { stage: 4, label: 'Learning & Development Review',   count: 5 },
        { stage: 5, label: 'Financial Review',                count: 3 },
        { stage: 6, label: 'Disbursement',                    count: 1 }
      ],
      monthly: [
        { month: 'Mar', applications: 28, approved: 15 },
        { month: 'Apr', applications: 33, approved: 19 },
        { month: 'May', applications: 30, approved: 17 },
        { month: 'Jun', applications: 41, approved: 24 },
        { month: 'Jul', applications: 38, approved: 21 },
        { month: 'Aug', applications: 44, approved: 26 },
        { month: 'Sep', applications: 49, approved: 28 },
        { month: 'Oct', applications: 47, approved: 23 }
      ],
      recentApplications: [
        { id: 2041, reference_no: 'LSDS/TR/2026/2041', applicant_name: 'Tunde Bakare',      department: 'Information & Communication Technology', programme_title: 'Certified Information Systems Security Professional (CISSP)', type: 'professional_certification', scope: 'international', amount: 2850000, status: 'pending_financial_review', updated_at: '2026-10-15T09:12:00' },
        { id: 2040, reference_no: 'LSDS/TR/2026/2040', applicant_name: 'Hauwa Mohammed',    department: 'Finance & Accounts',                    programme_title: 'Leadership and Change Management',                          type: 'professional_workshop',       scope: 'national',      amount: 450000,  status: 'pending_gm',               updated_at: '2026-10-15T08:40:00' },
        { id: 2039, reference_no: 'LSDS/TR/2026/2039', applicant_name: 'Segun Alabi',       department: 'Operations',                            programme_title: 'Occupational Health and Safety Compliance',                type: 'technical_seminar',           scope: 'national',      amount: 320000,  status: 'pending_agm',              updated_at: '2026-10-14T16:05:00' },
        { id: 2038, reference_no: 'LSDS/TR/2026/2038', applicant_name: 'Blessing Ojo',      department: 'Corporate Communications',              programme_title: 'Data Analytics with Power BI',                             type: 'professional_workshop',       scope: 'national',      amount: 510000,  status: 'pending_principal_manager', updated_at: '2026-10-14T14:22:00' },
        { id: 2037, reference_no: 'LSDS/TR/2026/2037', applicant_name: 'Ibrahim Sani',      department: 'Legal Services',                        programme_title: 'Advanced Contract Negotiation',                            type: 'national_conference',         scope: 'national',      amount: 265000,  status: 'approved',                 updated_at: '2026-10-14T11:48:00' },
        { id: 2036, reference_no: 'LSDS/TR/2026/2036', applicant_name: 'Ngozi Adeyemi',     department: 'Operations',                            programme_title: 'Cloud Infrastructure with AWS',                            type: 'professional_certification', scope: 'international', amount: 1420000, status: 'financially_approved',     updated_at: '2026-10-13T15:30:00' }
      ],
      upcomingSessions: [
        { id: 88, title: 'Zero Trust Network Architecture',        presenter: 'Engr. Bala Suleiman', date: '2026-10-18', time: '10:00', mode: 'Hybrid',    registered: 42, capacity: 50, status: 'published' },
        { id: 89, title: 'New Public Procurement Guidelines',      presenter: 'Barr. Amina Grema',   date: '2026-10-21', time: '14:00', mode: 'Online',    registered: 88, capacity: 100, status: 'published' },
        { id: 90, title: 'Incident Response Tabletop Exercise',    presenter: 'Emeka Nwosu',         date: '2026-10-24', time: '09:30', mode: 'In-person', registered: 19, capacity: 25, status: 'published' },
        { id: 91, title: 'Records Management & Data Protection',   presenter: 'Grace Adamu',         date: '2026-10-29', time: '11:00', mode: 'Online',    registered: 61, capacity: 60, status: 'published' },
        { id: 92, title: 'Customer Service Excellence',            presenter: 'Kemi Olawale',        date: '2026-11-04', time: '13:00', mode: 'Hybrid',    registered: 12, capacity: 40, status: 'draft' }
      ],
      activity: [
        { actor: 'Fatima Yusuf',   action: 'authorized funding for',   target: 'LSDS/TR/2026/2036', icon: 'wallet',      tone: 'green',  at: '2026-10-15T09:31:00' },
        { actor: 'Chinedu Okafor', action: 'recommended approval of',  target: 'LSDS/TR/2026/2038', icon: 'checkCircle', tone: 'blue',   at: '2026-10-15T09:02:00', icon: 'checkCircle' },
        { actor: 'Hauwa Mohammed', action: 'submitted application',    target: 'LSDS/TR/2026/2040', icon: 'fileText',    tone: 'sky',    at: '2026-10-15T08:40:00' },
        { actor: 'Tunde Bakare',   action: 'uploaded programme brochure for', target: 'LSDS/TR/2026/2041', icon: 'upload', tone: 'violet', at: '2026-10-15T08:21:00' },
        { actor: 'System',         action: 'recorded disbursement against', target: 'LSDS/TR/2026/2035', icon: 'banknote', tone: 'green', at: '2026-10-14T17:12:00' },
        { actor: 'Grace Adamu',    action: 'published knowledge session', target: 'Records Management & Data Protection', icon: 'presentation', tone: 'amber', at: '2026-10-14T16:44:00' }
      ],
      announcements: [
        { title: '2027 Training Budget Planning Begins', audience: 'All Staff', body: 'Departments are invited to submit training needs for the 2027 fiscal year. Consolidated plans are due to Learning & Development by 30 November 2026.', published_at: '2026-10-13T09:00:00', pinned: true },
        { title: 'Mandatory Information Security Refresher', audience: 'All Staff', body: 'All staff must complete the annual information security refresher course before 15 December 2026. Completion is tracked automatically.', published_at: '2026-10-10T10:30:00' },
        { title: 'New Knowledge Sharing Venue', audience: 'All Staff', body: 'Knowledge sharing sessions now hold in the newly refurbished Auditorium (Block C, 2nd Floor) with hybrid streaming.', published_at: '2026-10-06T14:15:00' }
      ],
      departments: [
        { name: 'Information & Communication Technology', spend: 6420000, applications: 14 },
        { name: 'Finance & Accounts',                     spend: 3180000, applications: 9 },
        { name: 'Operations',                             spend: 2475000, applications: 11 },
        { name: 'Legal Services',                         spend: 1830000, applications: 6 },
        { name: 'Human Resources',                        spend: 1290000, applications: 8 },
        { name: 'Corporate Communications',               spend: 980000,  applications: 5 }
      ],
      notifications: [
        { id: 'n1', type: 'approval',   title: 'Application awaiting your review', body: 'LSDS/TR/2026/2038 needs Principal Manager review.', at: '2026-10-15T09:05:00', unread: true, tone: 'amber', icon: 'checkCircle' },
        { id: 'n2', type: 'finance',    title: 'Funding authorized',               body: 'LSDS/TR/2026/2036 was financially approved.',        at: '2026-10-15T08:50:00', unread: true, tone: 'green', icon: 'wallet' },
        { id: 'n3', type: 'session',    title: 'Session starts in 3 days',         body: 'Zero Trust Network Architecture on 18 Oct.',         at: '2026-10-15T07:00:00', unread: true, tone: 'blue',  icon: 'presentation' },
        { id: 'n4', type: 'ticket',     title: 'Support ticket escalated',         body: 'TK-2026-0417 marked high priority.',                 at: '2026-10-14T16:20:00', unread: false, tone: 'red',  icon: 'lifeBuoy' }
      ]
    };
  }

  /* ------------------------------------------------------------------ *
   * Mock router
   * ------------------------------------------------------------------ */
  function readSession() {
    var raw = window.localStorage.getItem(cfg.sessionKey) || window.sessionStorage.getItem(cfg.sessionKey);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  /* Lazily-built shared dataset (data.js) that mock mutations act on. */
  var DB = null;
  function db() { if (!DB) DB = LSDS.data.build(); return DB; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function toQuery(params) {
    if (!params) return '';
    var parts = [];
    Object.keys(params).forEach(function (k) {
      var v = params[k];
      if (v === undefined || v === null || v === '') return;
      parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
    });
    return parts.length ? '?' + parts.join('&') : '';
  }

  function parsePath(raw) {
    var q = {}, p = raw, qi = raw.indexOf('?');
    if (qi !== -1) {
      p = raw.slice(0, qi);
      raw.slice(qi + 1).split('&').forEach(function (pair) {
        if (!pair) return;
        var kv = pair.split('=');
        q[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
      });
    }
    return { path: p, query: q };
  }
  function toInt(v, fallback) { var n = parseInt(v, 10); return isNaN(n) ? fallback : n; }
  function match(text, needle) { return String(text || '').toLowerCase().indexOf(needle) !== -1; }

  var PENDING_STATUSES = ['submitted', 'pending_principal_manager', 'pending_agm', 'pending_gm',
    'pending_learning_development', 'pending_financial_review'];
  var STATUS_FLOW = {
    submitted: 'pending_principal_manager',
    pending_principal_manager: 'pending_agm',
    pending_agm: 'pending_gm',
    pending_gm: 'pending_learning_development',
    pending_learning_development: 'pending_financial_review',
    pending_financial_review: 'financially_approved',
    financially_approved: 'disbursed'
  };

  function filterApplications(query) {
    var list = db().applications.filter(function (a) {
      if (query.status) {
        if (query.status === 'pending') { if (PENDING_STATUSES.indexOf(a.status) === -1) return false; }
        else if (query.status === 'finance') {
          if (['pending_financial_review', 'financially_approved', 'disbursed', 'partially_disbursed', 'completed'].indexOf(a.status) === -1) return false;
        } else if (a.status !== query.status) return false;
      }
      if (query.scope && a.scope !== query.scope) return false;
      if (query.department && a.department_code !== query.department) return false;
      if (query.type && a.application_type !== query.type) return false;
      if (query.q) {
        var n = query.q.toLowerCase();
        if (!match(a.reference_no, n) && !match(a.applicant_name, n) && !match(a.programme_title, n) && !match(a.department, n)) return false;
      }
      return true;
    });
    var sort = query.sort || 'updated';
    list.sort(function (x, y) {
      if (sort === 'amount') return y.requested_amount - x.requested_amount;
      if (sort === 'applicant') return x.applicant_name.localeCompare(y.applicant_name);
      return new Date(y.updated_at) - new Date(x.updated_at);
    });
    return list;
  }

  function reviewerNameForStage(stageKey) {
    var roleMap = {
      principal_manager: 'principal_manager', agm: 'agm', gm: 'gm',
      learning_development: 'ld_officer', finance_review: 'finance_officer', disbursement: 'finance_officer'
    };
    var role = roleMap[stageKey];
    if (!role) return null;
    var u = db().users.filter(function (x) { return x.roles.indexOf(role) !== -1; })[0];
    return u ? u.name : null;
  }

  function paginate(list, query) {
    var perPage = toInt(query.per_page, 10);
    var page = Math.max(1, toInt(query.page, 1));
    var pages = Math.max(1, Math.ceil(list.length / perPage));
    if (page > pages) page = pages;
    var start = (page - 1) * perPage;
    return {
      data: list.slice(start, start + perPage),
      total: list.length,
      page: page,
      per_page: perPage,
      pages: pages
    };
  }

  function isUpcoming(session) {
    return new Date(session.session_date + 'T23:59:59').getTime() >= Date.now();
  }

  function sum(list, pick) { return list.reduce(function (s, x) { return s + pick(x); }, 0); }

  function groupCount(list, pick) {
    var m = {};
    list.forEach(function (x) { var k = pick(x); m[k] = (m[k] || 0) + 1; });
    return m;
  }

  function reportSummary() {
    var apps = db().applications;
    var financial = db().financialRecords;
    var disb = db().disbursements;
    var sessions = db().sessions;

    var authorized = sum(financial, function (r) { return r.approved_amount; });
    var released = sum(disb, function (d) { return d.amount; });
    var completedApps = apps.filter(function (a) {
      return ['rejected', 'cancelled'].indexOf(a.status) === -1;
    }).length;

    var byDepartment = db().departments.map(function (d) {
      var mine = apps.filter(function (a) { return a.department_code === d.code; });
      var spend = financial.filter(function (r) { return r.department_code === d.code; })
        .reduce(function (s, r) { return s + r.disbursed_total; }, 0);
      return { code: d.code, name: d.name, applications: mine.length, spend: spend,
        pending: mine.filter(function (a) { return PENDING_STATUSES.indexOf(a.status) !== -1; }).length };
    }).sort(function (x, y) { return y.spend - x.spend; });

    var byScope = ['national', 'international'].map(function (k) {
      return { key: k, count: apps.filter(function (a) { return a.scope === k; }).length,
        amount: sum(apps.filter(function (a) { return a.scope === k; }), function (a) { return a.requested_amount; }) };
    });

    var byStatus = Object.keys(groupCount(apps, function (a) { return a.status; }))
      .map(function (k) { return { key: k, count: apps.filter(function (a) { return a.status === k; }).length }; })
      .sort(function (x, y) { return y.count - x.count; });

    var byType = Object.keys(groupCount(apps, function (a) { return a.application_type; }))
      .map(function (k) { return { key: k, count: apps.filter(function (a) { return a.application_type === k; }).length }; })
      .sort(function (x, y) { return y.count - x.count; });

    var delivered = sessions.filter(function (s) { return s.status === 'completed'; });
    var rated = delivered.filter(function (s) { return s.feedback_count > 0; });

    return {
      generatedAt: new Date().toISOString(),
      monthly: summary().monthly,
      kpis: {
        applications: apps.length,
        pending: apps.filter(function (a) { return PENDING_STATUSES.indexOf(a.status) !== -1; }).length,
        completion_rate: apps.length ? Math.round((completedApps / apps.length) * 100) : 0,
        authorized: authorized,
        released: released,
        outstanding: authorized - released,
        sessions_delivered: delivered.length,
        avg_feedback: rated.length ? Math.round((sum(rated, function (s) { return s.avg_rating; }) / rated.length) * 10) / 10 : 0
      },
      byDepartment: byDepartment,
      byScope: byScope,
      byStatus: byStatus,
      byType: byType,
      disbursements: {
        count: disb.length,
        by_method: groupCount(disb, function (d) { return d.payment_method; }),
        by_status: groupCount(disb, function (d) { return d.status; })
      },
      sessions: {
        total: sessions.length,
        published: sessions.filter(function (s) { return s.status === 'published'; }).length,
        upcoming: sessions.filter(function (s) { return s.status === 'published' && isUpcoming(s); }).length,
        registrations: sum(sessions, function (s) { return s.registered; }),
        attendance: sum(sessions, function (s) { return s.attended; })
      },
      users: { total: db().users.length, active: db().users.filter(function (u) { return u.account_status === 'active'; }).length }
    };
  }

  function nextId(list) {
    return list.reduce(function (m, x) { return Math.max(m, x.id || 0); }, 0) + 1;
  }
  function nowIso() { return new Date().toISOString(); }
  function today() { return nowIso().slice(0, 10); }
  function deptByCode(code) {
    return db().departments.filter(function (d) { return d.code === code; })[0] || db().departments[0];
  }
  function deptCodeForUser(user) {
    if (!user) return null;
    var d = db().departments.filter(function (x) { return x.name === user.department; })[0];
    return d ? d.code : null;
  }
  function currentActor() {
    var s = readSession();
    return s && s.user ? s.user : { id: null, name: 'You', department: null };
  }
  function splitList(value) {
    if (Array.isArray(value)) return value;
    return String(value == null ? '' : value)
      .split(/[\n,]+/)
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
  }
  function categoryFor(name, entityType) {
    name = String(name == null ? '' : name).trim();
    return db().categories.filter(function (c) {
      return c.name === name && (c.entity_type === entityType || c.entity_type === 'any');
    })[0] || null;
  }

  /* Common shape for a document/video waiting for a review decision. */
  function reviewItem(type, item) {
    var folder = type === 'document' ? 'documents' : 'videos';
    return {
      type: type,
      id: item.id,
      title: item.title,
      description: item.description || '',
      category: item.category || null,
      department: item.department || null,
      department_code: item.department_code || null,
      author_name: type === 'document' ? (item.owner_name || null) : (item.uploader_name || null),
      review_status: item.review_status,
      access_classification: item.access_classification || 'internal',
      file_name: item.file_name || null,
      file_path: item.file_path || (item.stored_file_name ? 'storage/' + folder + '/' + item.stored_file_name : null),
      mime_type: item.mime_type || null,
      file_size_bytes: item.file_size_bytes || 0,
      duration_seconds: item.duration_seconds || 0,
      submitted_at: item.submitted_at || item.created_at,
      tags: item.tags || []
    };
  }
  function mock(method, path, body) {
    if (path === '/auth/login' && method === 'POST') {
      var email = slugEmail(body && body.email);
      var password = (body && body.password) || '';
      if (!email || !password) return reject(fail('Email and password are required.', 422));
      if (password.length < 6) return reject(fail('Invalid credentials. Please try again.', 401));
      if (!DEMO_USERS[email]) return reject(fail('No account is registered with that email address.', 401));
      var session = buildSession(email, body.remember);
      var store = body.remember ? window.localStorage : window.sessionStorage;
      store.setItem(cfg.sessionKey, JSON.stringify(session));
      return wait(session);
    }

    if (path === '/auth/logout' && method === 'POST') {
      window.localStorage.removeItem(cfg.sessionKey);
      window.sessionStorage.removeItem(cfg.sessionKey);
      return wait({ ok: true });
    }

    if (path === '/auth/session' && method === 'GET') {
      var s = readSession();
      return wait(s, 120);
    }

    if (path === '/auth/forgot-password' && method === 'POST') {
      return wait({ ok: true, message: 'If the address is registered, a reset link has been sent.' });
    }

    if (path === '/dashboard/summary' && method === 'GET') {
      return wait(summary());
    }

    if (path === '/notifications' && method === 'GET') {
      return wait({ notifications: summary().notifications });
    }

    /* ---- Applications -------------------------------------------------- */
    var route = parsePath(path);

    if (route.path === '/applications' && method === 'GET') {
      return wait(paginate(filterApplications(route.query), route.query));
    }

    var appMatch = route.path.match(/^\/applications\/(\d+)$/);
    if (appMatch && method === 'GET') {
      var app = db().applications.filter(function (a) { return a.id === toInt(appMatch[1], 0); })[0];
      if (!app) return reject(fail('Application not found.', 404));
      return wait(clone(app));
    }

    var decisionMatch = route.path.match(/^\/applications\/(\d+)\/decision$/);
    if (decisionMatch && method === 'POST') {
      var target = db().applications.filter(function (a) { return a.id === toInt(decisionMatch[1], 0); })[0];
      if (!target) return reject(fail('Application not found.', 404));
      var decision = (body && body.decision) || '';
      var session = readSession();
      var actor = session && session.user ? session.user : { name: 'You', roles: [] };
      var reviewerRole = (actor.roles && actor.roles[0]) || 'staff';

      if (decision === 'approve') {
        var next = STATUS_FLOW[target.status];
        if (!next) return reject(fail('This application is not awaiting a decision.', 409));
        target.status = next;
      } else if (decision === 'reject') {
        target.status = 'rejected';
      } else if (decision === 'return') {
        target.status = 'returned_for_correction';
      } else {
        return reject(fail('Unsupported decision.', 422));
      }

      var stageKey = target.current_stage_key || 'principal_manager';
      target.approval_actions = target.approval_actions || [];
      target.approval_actions.push({
        stage_key: stageKey,
        decision: decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'returned',
        reviewer_user_id: actor.id || 0,
        reviewer_name: actor.name,
        reviewer_role_key: reviewerRole,
        comments: (body && body.comments) || (decision === 'approve' ? 'Approved.' : 'No comment provided.'),
        is_visible_to_applicant: 1,
        acted_at: new Date().toISOString()
      });
      target.updated_at = new Date().toISOString();
      target.current_stage_order = (target.current_stage_order || 0) + (decision === 'approve' ? 1 : 0);
      target.current_stage_key = LSDS.data.stageKeyForStatus(target.status);
      target.pending_reviewer_name = reviewerNameForStage(target.current_stage_key);
      if (decision === 'approve' && target.status === 'financially_approved' && !target.financial) {
        target.financial = {
          approved_title: target.programme_title,
          approved_amount: Math.round(target.requested_amount * 0.98 / 500) * 500,
          currency: target.currency,
          financial_status: 'authorized',
          authorized_at: new Date().toISOString(),
          authorized_by_name: actor.name
        };
      }
      return wait(clone(target));
    }

    /* ---- Approval queue ------------------------------------------------ */
    if (route.path === '/approvals/queue' && method === 'GET') {
      var scoped = filterApplications({ status: 'pending' });
      if (route.query.stage) scoped = scoped.filter(function (a) { return a.current_stage_key === route.query.stage; });
      scoped = scoped.map(function (a) {
        var days = Math.max(0, Math.round((Date.now() - new Date(a.updated_at).getTime()) / 86400000));
        return Object.assign({ days_waiting: days }, a);
      }).sort(function (x, y) { return y.days_waiting - x.days_waiting; });
      var counts = {};
      scoped.forEach(function (a) { counts[a.current_stage_key] = (counts[a.current_stage_key] || 0) + 1; });
      return wait({ data: scoped, total: scoped.length, counts: counts });
    }

    /* ---- Users / roles / departments ----------------------------------- */
    if (route.path === '/users' && method === 'GET') {
      var users = db().users.filter(function (u) {
        if (route.query.status && u.account_status !== route.query.status) return false;
        if (route.query.role && u.roles.indexOf(route.query.role) === -1) return false;
        if (route.query.department && u.department_code !== route.query.department) return false;
        if (route.query.q) {
          var nq = route.query.q.toLowerCase();
          if (!match(u.name, nq) && !match(u.email, nq) && !match(u.designation, nq)) return false;
        }
        return true;
      }).sort(function (x, y) { return x.name.localeCompare(y.name); });
      return wait({ data: users, total: users.length });
    }

    if (route.path === '/roles' && method === 'GET') {
      return wait({ data: db().roles, total: db().roles.length });
    }

    if (route.path === '/departments' && method === 'GET') {
      var apps = db().applications;
      var depts = db().departments.map(function (d) {
        var mine = apps.filter(function (a) { return a.department_code === d.code; });
        var spend = mine.reduce(function (s, a) {
          if (a.financial && ['disbursed', 'completed', 'partially_disbursed'].indexOf(a.status) !== -1) return s + a.financial.approved_amount;
          return s;
        }, 0);
        var pending = mine.filter(function (a) { return PENDING_STATUSES.indexOf(a.status) !== -1; }).length;
        return Object.assign({}, d, { applications: mine.length, pending: pending, spend: spend });
      }).sort(function (x, y) { return y.applications - x.applications; });
      return wait({ data: depts, total: depts.length });
    }

    /* ---- Departments: create -------------------------------------------- */
    if (route.path === '/departments' && method === 'POST') {
      var depb = body || {};
      var depCode = String(depb.code || '').trim().toUpperCase();
      var depName = String(depb.name || '').trim();
      if (!depCode || !depName) return reject(fail('Department code and name are required.', 422));
      if (db().departments.some(function (d) { return d.code === depCode || d.name === depName; })) {
        return reject(fail('A department with that code or name already exists.', 409));
      }
      var depId = nextId(db().departments);
      var depNew = {
        id: depId,
        code: depCode,
        name: depName,
        description: depb.description || '',
        head: null,
        staff_count: 0,
        applications: 0,
        pending: 0,
        spend: 0,
        is_active: depb.is_active === false || depb.is_active === 0 ? 0 : 1,
        created_at: nowIso()
      };
      db().departments.unshift(depNew);
      return wait(clone(depNew), 260);
    }

    /* ---- Knowledge sharing sessions ------------------------------------- */
    if (route.path === '/sessions' && method === 'GET') {
      var sList = db().sessions.filter(function (s) {
        if (route.query.status && s.status !== route.query.status) return false;
        if (route.query.department && s.department_code !== route.query.department) return false;
        if (route.query.scope === 'upcoming' && !isUpcoming(s)) return false;
        if (route.query.scope === 'past' && isUpcoming(s)) return false;
        if (route.query.q) {
          var sq = route.query.q.toLowerCase();
          if (!match(s.title, sq) && !match(s.presenter_name, sq) && !match(s.topic, sq) && !match(s.organizing_department, sq)) return false;
        }
        return true;
      }).sort(function (x, y) { return new Date(x.session_date) - new Date(y.session_date); });
      return wait({ data: clone(sList), total: sList.length, counts: groupCount(db().sessions, function (s) { return s.status; }) });
    }

    var sessMatch = route.path.match(/^\/sessions\/(\d+)$/);
    if (sessMatch && method === 'GET') {
      var sess = db().sessions.filter(function (s) { return s.id === toInt(sessMatch[1], 0); })[0];
      if (!sess) return reject(fail('Session not found.', 404));
      return wait(clone(sess));
    }

    /* ---- Financial records ---------------------------------------------- */
    if (route.path === '/financial' && method === 'GET') {
      var fList = db().financialRecords.filter(function (r) {
        if (route.query.status && r.financial_status !== route.query.status) return false;
        if (route.query.department && r.department_code !== route.query.department) return false;
        if (route.query.q) {
          var fq = route.query.q.toLowerCase();
          if (!match(r.reference_no, fq) && !match(r.applicant_name, fq) && !match(r.programme_title, fq)) return false;
        }
        return true;
      }).sort(function (x, y) { return new Date(y.authorized_at || 0) - new Date(x.authorized_at || 0); });
      var fTotals = {
        count: db().financialRecords.length,
        authorized: sum(db().financialRecords, function (r) { return r.approved_amount; }),
        disbursed: sum(db().financialRecords, function (r) { return r.disbursed_total; }),
        outstanding: sum(db().financialRecords, function (r) { return r.outstanding; })
      };
      return wait({
        data: clone(fList), total: fList.length,
        counts: groupCount(db().financialRecords, function (r) { return r.financial_status; }),
        totals: fTotals
      });
    }

    /* ---- Disbursements --------------------------------------------------- */
    if (route.path === '/disbursements' && method === 'GET') {
      var dList = db().disbursements.filter(function (d) {
        if (route.query.status && d.status !== route.query.status) return false;
        if (route.query.method && d.payment_method !== route.query.method) return false;
        if (route.query.q) {
          var dq = route.query.q.toLowerCase();
          if (!match(d.payment_reference, dq) && !match(d.reference_no, dq) && !match(d.applicant_name, dq)) return false;
        }
        return true;
      });
      var thisMonth = db().disbursements.filter(function (d) {
        var dt = new Date(d.payment_date + 'T00:00:00'), now = new Date();
        return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
      });
      return wait({
        data: clone(dList), total: dList.length,
        counts: groupCount(db().disbursements, function (d) { return d.status; }),
        methods: groupCount(db().disbursements, function (d) { return d.payment_method; }),
        totals: {
          released: sum(db().disbursements, function (d) { return d.amount; }),
          this_month: sum(thisMonth, function (d) { return d.amount; }),
          pending: sum(db().disbursements.filter(function (d) { return d.status === 'pending'; }), function (d) { return d.amount; })
        }
      });
    }

    /* ---- Reports --------------------------------------------------------- */
    if (route.path === '/reports/summary' && method === 'GET') {
      return wait(reportSummary());
    }

    /* ---- Knowledge documents -------------------------------------------- */
    if (route.path === '/documents' && method === 'GET') {
      var docList = db().documents.filter(function (d) {
        if (route.query.status && d.review_status !== route.query.status) return false;
        if (route.query.category && d.category !== route.query.category) return false;
        if (route.query.department && d.department_code !== route.query.department) return false;
        if (route.query.access && d.access_classification !== route.query.access) return false;
        if (route.query.q) {
          var dq = route.query.q.toLowerCase();
          if (!match(d.title, dq) && !match(d.description, dq) && !match(d.owner_name, dq) &&
            !(d.tags || []).some(function (t) { return match(t, dq); })) return false;
        }
        return true;
      }).sort(function (x, y) { return new Date(y.updated_at) - new Date(x.updated_at); });
      return wait({
        data: clone(docList), total: docList.length,
        counts: groupCount(db().documents, function (d) { return d.review_status; }),
        totals: {
          count: db().documents.length,
          published: db().documents.filter(function (d) { return d.review_status === 'published'; }).length,
          pending: db().documents.filter(function (d) { return d.review_status !== 'published' && d.review_status !== 'archived'; }).length
        }
      });
    }

    var docMatch = route.path.match(/^\/documents\/(\d+)$/);
    if (docMatch && method === 'GET') {
      var doc = db().documents.filter(function (d) { return d.id === toInt(docMatch[1], 0); })[0];
      if (!doc) return reject(fail('Document not found.', 404));
      return wait(clone(doc));
    }

    /* ---- Knowledge videos ----------------------------------------------- */
    if (route.path === '/videos' && method === 'GET') {
      var vidList = db().videos.filter(function (v) {
        if (route.query.status && v.review_status !== route.query.status) return false;
        if (route.query.category && v.category !== route.query.category) return false;
        if (route.query.department && v.department_code !== route.query.department) return false;
        if (route.query.q) {
          var vq = route.query.q.toLowerCase();
          if (!match(v.title, vq) && !match(v.description, vq) && !match(v.uploader_name, vq) &&
            !(v.tags || []).some(function (t) { return match(t, vq); })) return false;
        }
        return true;
      }).sort(function (x, y) { return new Date(y.updated_at) - new Date(x.updated_at); });
      return wait({
        data: clone(vidList), total: vidList.length,
        counts: groupCount(db().videos, function (v) { return v.review_status; }),
        totals: {
          count: db().videos.length,
          published: db().videos.filter(function (v) { return v.review_status === 'published'; }).length,
          views: sum(db().videos, function (v) { return v.views_count; })
        }
      });
    }

    var vidMatch = route.path.match(/^\/videos\/(\d+)$/);
    if (vidMatch && method === 'GET') {
      var vid = db().videos.filter(function (v) { return v.id === toInt(vidMatch[1], 0); })[0];
      if (!vid) return reject(fail('Video not found.', 404));
      return wait(clone(vid));
    }

    /* ---- Content review: pending queue ---------------------------------- */
    if (route.path === '/reviews/queue' && method === 'GET') {
      var rDocs = db().documents
        .filter(function (d) { return ['submitted_for_review', 'under_review'].indexOf(d.review_status) !== -1; })
        .map(function (d) { return reviewItem('document', d); });
      var rVids = db().videos
        .filter(function (v) { return ['pending_review', 'under_review'].indexOf(v.review_status) !== -1; })
        .map(function (v) { return reviewItem('video', v); });
      var rItems = rDocs.concat(rVids).sort(function (a, b) {
        return new Date(a.submitted_at || 0) - new Date(b.submitted_at || 0);
      });
      return wait({
        data: clone(rItems),
        total: rItems.length,
        totals: { documents: rDocs.length, videos: rVids.length, total: rItems.length }
      }, 320);
    }

    /* ---- Content review: record a decision ------------------------------ */
    if (route.path === '/reviews' && method === 'POST') {
      var rvb = body || {};
      var rvType = rvb.reviewable_type;
      var rvId = toInt(rvb.reviewable_id, 0);
      var rvDecision = rvb.decision;
      var rvComments = rvb.comments == null ? null : (String(rvb.comments).trim() || null);

      if (['document', 'video'].indexOf(rvType) === -1) return reject(fail('Unsupported review target.', 422));
      if (['approved', 'rejected', 'returned'].indexOf(rvDecision) === -1) return reject(fail('Unsupported decision.', 422));
      if (rvDecision !== 'approved' && !rvComments) {
        return reject(fail('A comment is required when returning or rejecting content.', 422));
      }

      var rvList = rvType === 'document' ? db().documents : db().videos;
      var rvItem = rvList.filter(function (x) { return x.id === rvId; })[0];
      if (!rvItem) return reject(fail(rvType === 'document' ? 'Document not found.' : 'Video not found.', 404));

      var rvPending = rvType === 'document' ? ['submitted_for_review', 'under_review'] : ['pending_review', 'under_review'];
      if (rvPending.indexOf(rvItem.review_status) === -1) {
        return reject(fail('This item is not awaiting a review decision.', 409));
      }

      var rvNew = rvDecision === 'approved'
        ? 'published'
        : (rvType === 'document' ? 'returned' : (rvDecision === 'rejected' ? 'rejected' : 'returned'));
      var rvActor = currentActor();
      var rvNow = nowIso();

      rvItem.review_status = rvNew;
      rvItem.review_comments = rvComments;
      rvItem.reviewed_by_name = rvActor.name || null;
      rvItem.reviewed_at = rvNow;
      rvItem.published_at = rvDecision === 'approved' ? rvNow : null;
      rvItem.updated_at = rvNow;

      return wait({
        reviewable_type: rvType,
        reviewable_id: rvId,
        decision: rvDecision,
        review_status: rvNew,
        reviewed_by: rvActor.name || null,
        reviewed_at: rvNow,
        comments: rvComments
      }, 300);
    }

    /* ---- Discussion forum ----------------------------------------------- */
    if (route.path === '/discussions' && method === 'GET') {
      var discList = db().discussions.filter(function (d) {
        if (route.query.status && d.status !== route.query.status) return false;
        if (route.query.category && d.category !== route.query.category) return false;
        if (route.query.department && d.department_code !== route.query.department) return false;
        if (route.query.q) {
          var dqq = route.query.q.toLowerCase();
          if (!match(d.title, dqq) && !match(d.author_name, dqq)) return false;
        }
        return true;
      }).sort(function (x, y) {
        if (y.is_pinned !== x.is_pinned) return y.is_pinned - x.is_pinned;
        return new Date(y.last_activity_at) - new Date(x.last_activity_at);
      });
      return wait({
        data: clone(discList), total: discList.length,
        counts: groupCount(db().discussions, function (d) { return d.status; }),
        totals: {
          threads: db().discussions.length,
          replies: sum(db().discussions, function (d) { return d.reply_count; }),
          pinned: db().discussions.filter(function (d) { return d.is_pinned; }).length
        }
      });
    }

    var discMatch = route.path.match(/^\/discussions\/(\d+)$/);
    if (discMatch && method === 'GET') {
      var disc = db().discussions.filter(function (d) { return d.id === toInt(discMatch[1], 0); })[0];
      if (!disc) return reject(fail('Discussion not found.', 404));
      return wait(clone(disc));
    }

    /* ---- Support tickets ------------------------------------------------- */
    if (route.path === '/tickets' && method === 'GET') {
      var tickList = db().tickets.filter(function (t) {
        if (route.query.status && t.status !== route.query.status) return false;
        if (route.query.priority && t.priority !== route.query.priority) return false;
        if (route.query.category && t.issue_category !== route.query.category) return false;
        if (route.query.department && t.department_code !== route.query.department) return false;
        if (route.query.q) {
          var tq = route.query.q.toLowerCase();
          if (!match(t.subject, tq) && !match(t.reference_no, tq) && !match(t.requester_name, tq) && !match(t.assignee_name, tq)) return false;
        }
        return true;
      }).sort(function (x, y) { return new Date(y.updated_at) - new Date(x.updated_at); });
      return wait({
        data: clone(tickList), total: tickList.length,
        counts: groupCount(db().tickets, function (t) { return t.status; }),
        priorities: groupCount(db().tickets, function (t) { return t.priority; }),
        totals: {
          count: db().tickets.length,
          open: db().tickets.filter(function (t) { return ['open', 'assigned', 'in_progress', 'pending_user_response'].indexOf(t.status) !== -1; }).length,
          resolved: db().tickets.filter(function (t) { return ['resolved', 'closed'].indexOf(t.status) !== -1; }).length
        }
      });
    }

    var tickMatch = route.path.match(/^\/tickets\/(\d+)$/);
    if (tickMatch && method === 'GET') {
      var tick = db().tickets.filter(function (t) { return t.id === toInt(tickMatch[1], 0); })[0];
      if (!tick) return reject(fail('Ticket not found.', 404));
      return wait(clone(tick));
    }

    /* ---- E-Learning courses --------------------------------------------- */
    if (route.path === '/courses' && method === 'GET') {
      var courseList = db().courses.filter(function (c) {
        if (route.query.status && c.status !== route.query.status) return false;
        if (route.query.category && c.category !== route.query.category) return false;
        if (route.query.department && c.department_code !== route.query.department) return false;
        if (route.query.difficulty && c.difficulty_level !== route.query.difficulty) return false;
        if (route.query.q) {
          var cq = route.query.q.toLowerCase();
          if (!match(c.title, cq) && !match(c.code, cq) && !match(c.instructor_name, cq) && !match(c.description, cq)) return false;
        }
        return true;
      }).sort(function (x, y) { return new Date(y.updated_at) - new Date(x.updated_at); });
      var totalEnrolled = sum(db().courses, function (c) { return c.enrollment_summary.total; });
      var totalCompleted = sum(db().courses, function (c) { return c.enrollment_summary.completed; });
      return wait({
        data: clone(courseList), total: courseList.length,
        counts: groupCount(db().courses, function (c) { return c.status; }),
        totals: {
          count: db().courses.length,
          published: db().courses.filter(function (c) { return c.status === 'published'; }).length,
          enrolled: totalEnrolled,
          completion_rate: totalEnrolled ? Math.round((totalCompleted / totalEnrolled) * 100) : 0
        }
      });
    }

    var courseMatch = route.path.match(/^\/courses\/(\d+)$/);
    if (courseMatch && method === 'GET') {
      var course = db().courses.filter(function (c) { return c.id === toInt(courseMatch[1], 0); })[0];
      if (!course) return reject(fail('Course not found.', 404));
      return wait(clone(course));
    }

    /* ---- Meetings -------------------------------------------------------- */
    if (route.path === '/meetings' && method === 'GET') {
      var meetingList = db().meetings.filter(function (m) {
        if (route.query.status && m.status !== route.query.status) return false;
        if (route.query.provider && m.provider !== route.query.provider) return false;
        if (route.query.department && m.department_code !== route.query.department) return false;
        if (route.query.scope === 'upcoming' && new Date(m.start_at).getTime() < Date.now()) return false;
        if (route.query.scope === 'past' && new Date(m.start_at).getTime() >= Date.now()) return false;
        if (route.query.q) {
          var mq = route.query.q.toLowerCase();
          if (!match(m.title, mq) && !match(m.host_name, mq) && !match(m.department, mq)) return false;
        }
        return true;
      }).sort(function (x, y) { return new Date(x.start_at) - new Date(y.start_at); });
      return wait({
        data: clone(meetingList), total: meetingList.length,
        counts: groupCount(db().meetings, function (m) { return m.status; }),
        providers: groupCount(db().meetings, function (m) { return m.provider; }),
        totals: {
          count: db().meetings.length,
          live: db().meetings.filter(function (m) { return m.status === 'live'; }).length,
          scheduled: db().meetings.filter(function (m) { return m.status === 'scheduled'; }).length,
          recordings: sum(db().meetings, function (m) { return (m.recordings || []).length; })
        }
      });
    }

    var meetingMatch = route.path.match(/^\/meetings\/(\d+)$/);
    if (meetingMatch && method === 'GET') {
      var meeting = db().meetings.filter(function (m) { return m.id === toInt(meetingMatch[1], 0); })[0];
      if (!meeting) return reject(fail('Meeting not found.', 404));
      return wait(clone(meeting));
    }

    /* ---- Approval workflow configuration --------------------------------- */
    if (route.path === '/workflow' && method === 'GET') {
      var wf = db().workflow;
      return wait({
        steps: clone(wf.steps),
        approvers: clone(wf.approvers),
        delegations: clone(wf.delegations),
        totals: {
          steps: wf.steps.length,
          approvers: wf.approvers.length,
          active_approvers: wf.approvers.filter(function (a) { return a.is_active; }).length,
          delegations: wf.delegations.filter(function (d) { return d.status === 'active'; }).length
        }
      });
    }

    /* ---- System settings ------------------------------------------------- */
    if (route.path === '/settings' && method === 'GET') {
      var settings = db().settings;
      var groups = {};
      settings.forEach(function (s) { (groups[s.setting_group] = groups[s.setting_group] || []).push(s); });
      return wait({ data: clone(settings), total: settings.length, groups: Object.keys(groups), group_map: clone(groups) });
    }

    /* ---- Audit logs ------------------------------------------------------ */
    if (route.path === '/audit-logs' && method === 'GET') {
      var logs = db().auditLogs.filter(function (l) {
        if (route.query.action && l.action !== route.query.action) return false;
        if (route.query.entity && l.entity_type !== route.query.entity) return false;
        if (route.query.user && String(l.user_id) !== String(route.query.user)) return false;
        if (route.query.q) {
          var aq = route.query.q.toLowerCase();
          if (!match(l.description, aq) && !match(l.user_name, aq) && !match(l.action, aq) && !match(l.ip_address, aq)) return false;
        }
        return true;
      }).sort(function (x, y) { return new Date(y.created_at) - new Date(x.created_at); });
      var page = paginate(logs, route.query);
      page.counts = groupCount(db().auditLogs, function (l) { return l.action; });
      page.entities = groupCount(db().auditLogs, function (l) { return l.entity_type; });
      return wait(page);
    }

    /* ---- Backups --------------------------------------------------------- */
    if (route.path === '/backups' && method === 'GET') {
      var backupList = db().backups.filter(function (b) {
        if (route.query.status && b.status !== route.query.status) return false;
        if (route.query.type && b.backup_type !== route.query.type) return false;
        return true;
      }).sort(function (x, y) { return new Date(y.started_at) - new Date(x.started_at); });
      var completed = db().backups.filter(function (b) { return b.status === 'completed'; });
      return wait({
        data: clone(backupList), total: backupList.length,
        counts: groupCount(db().backups, function (b) { return b.status; }),
        types: groupCount(db().backups, function (b) { return b.backup_type; }),
        totals: {
          count: db().backups.length,
          completed: completed.length,
          failed: db().backups.filter(function (b) { return b.status === 'failed'; }).length,
          last_size: completed.length ? completed[0].file_size_bytes : 0
        }
      });
    }

    /* =====================================================================
     * Write endpoints (create / update). Mirrored by the PHP controllers so
     * the same forms work against the live API and the offline demo dataset.
     * ===================================================================== */

    /* ---- Training applications: create ---------------------------------- */
    if (route.path === '/applications' && method === 'POST') {
      var ab = body || {};
      var aTitle = String(ab.programme_title || '').trim();
      if (!aTitle) return reject(fail('Programme title is required.', 422));
      var actor = currentActor();
      var aDept = deptByCode(ab.department_code || deptCodeForUser(actor) || 'OPS');
      var aAmount = Number(ab.requested_amount) || 0;
      var aStatus = ab.status === 'draft' ? 'draft' : 'pending_principal_manager';
      var aId = nextId(db().applications);
      var aNow = nowIso();
      var application = {
        id: aId,
        reference_no: 'LSDS/TR/2026/' + aId,
        applicant_user_id: actor.id,
        applicant_name: actor.name,
        applicant_designation: actor.designation || null,
        applicant_email: actor.email || null,
        department_id: aDept.id,
        department: aDept.name,
        department_code: aDept.code,
        supervisor_name: aDept.approvers ? aDept.approvers.principal_manager : null,
        application_type: ab.application_type || 'professional_workshop',
        scope: ab.scope || 'national',
        programme_title: aTitle,
        training_provider: ab.training_provider || '',
        country: ab.country || 'Nigeria',
        venue: ab.venue || null,
        programme_website: null,
        start_date: ab.start_date || null,
        end_date: ab.end_date || null,
        registration_deadline: ab.registration_deadline || null,
        programme_objectives: ab.programme_objectives || '',
        skills_to_acquire: splitList(ab.skills_to_acquire),
        relevance_to_duties: ab.relevance_to_duties || '',
        departmental_benefits: ab.departmental_benefits || '',
        estimated_total_cost: Math.round(aAmount * 1.05),
        requested_amount: aAmount,
        currency: 'NGN',
        funding_justification: ab.funding_justification || '',
        post_training_knowledge_sharing: ab.post_training_knowledge_sharing || '',
        status: aStatus,
        current_stage_order: aStatus === 'draft' ? 0 : 1,
        current_stage_key: LSDS.data.stageKeyForStatus(aStatus),
        pending_reviewer_name: aStatus === 'draft' ? null : 'Hauwa Mohammed',
        submitted_at: aStatus === 'draft' ? null : nowIso(),
        created_at: nowIso(),
        updated_at: nowIso(),
        cost_items: [],
        documents: [],
        approval_actions: [],
        financial: null,
        disbursements: []
      };
      db().applications.unshift(application);
      return wait(clone(application));
    }

    /* ---- Knowledge sessions: create ------------------------------------- */
    if (route.path === '/sessions' && method === 'POST') {
      var sb = body || {};
      var sTitle = String(sb.title || '').trim();
      if (!sTitle) return reject(fail('Session title is required.', 422));
      var sActor = currentActor();
      var sDept = deptByCode(sb.department_code || deptCodeForUser(sActor) || 'HRM');
      var sMode = sb.mode || 'Online';
      var sStatus = sb.status === 'draft' ? 'draft' : 'published';
      var sId = nextId(db().sessions);
      var sNow = nowIso();
      var session = {
        id: sId,
        title: sTitle,
        topic: sb.topic || '',
        description: sb.description || (sTitle + ' \u2014 knowledge sharing session.'),
        session_date: sb.session_date || today(),
        start_time: sb.start_time || '10:00',
        end_time: sb.end_time || '12:00',
        mode: sMode,
        venue: sMode === 'Online' ? null : (sb.venue || 'Auditorium, Block C'),
        online_meeting_url: sMode === 'In-person' ? null : ('https://meet.example.org/lsds/session-' + sId),
        presenter_name: sb.presenter_name || sActor.name || 'To be confirmed',
        presenter_user_id: null,
        organizing_department: sDept.name,
        department_code: sDept.code,
        target_audience: sb.target_audience || 'All Staff',
        registration_deadline: sb.registration_deadline || null,
        max_attendance: Number(sb.max_attendance) || 0,
        registered: 0,
        attended: 0,
        avg_rating: 0,
        feedback_count: 0,
        fill_pct: 0,
        status: sStatus,
        created_by: sActor.id,
        published_at: sStatus === 'draft' ? null : sNow,
        created_at: sNow,
        updated_at: sNow
      };
      db().sessions.unshift(session);
      return wait(clone(session));
    }

    /* ---- E-Learning courses: create ------------------------------------- */
    if (route.path === '/courses' && method === 'POST') {
      var cb = body || {};
      var cTitle = String(cb.title || '').trim();
      if (!cTitle) return reject(fail('Course title is required.', 422));
      var cActor = currentActor();
      var cDept = deptByCode(cb.department_code || deptCodeForUser(cActor) || 'HRM');
      var cCat = categoryFor(cb.category || 'General', 'course');
      var cId = nextId(db().courses);
      var cNow = nowIso();
      var course = {
        id: cId,
        code: cb.code || ('CSE-' + String(100 + cId)),
        title: cTitle,
        description: cb.description || '',
        category: cb.category || (cCat ? cCat.name : 'General'),
        category_id: cCat ? cCat.id : null,
        department: cDept.name,
        department_code: cDept.code,
        instructor_user_id: null,
        instructor_name: cb.instructor_name || cActor.name || 'Internal facilitator',
        difficulty_level: cb.difficulty_level || 'intermediate',
        estimated_hours: Number(cb.estimated_hours) || 0,
        status: cb.status === 'draft' ? 'draft' : 'published',
        created_at: cNow,
        updated_at: cNow,
        modules: [],
        enrollment_summary: { total: 0, enrolled: 0, in_progress: 0, completed: 0, completion_rate: 0 }
      };
      db().courses.unshift(course);
      return wait(clone(course));
    }

    /* ---- Meetings: create ----------------------------------------------- */
    if (route.path === '/meetings' && method === 'POST') {
      var mb = body || {};
      var mTitle = String(mb.title || '').trim();
      if (!mTitle) return reject(fail('Meeting title is required.', 422));
      var mActor = currentActor();
      var mDept = deptByCode(mb.department_code || deptCodeForUser(mActor) || 'HRM');
      var mId = nextId(db().meetings);
      var mNow = nowIso();
      var meeting = {
        id: mId,
        title: mTitle,
        description: mb.description || '',
        agenda: mb.agenda || '',
        host_user_id: mActor.id,
        host_name: mb.host_name || mActor.name,
        department: mDept.name,
        department_code: mDept.code,
        start_at: mb.start_at || mNow,
        duration_minutes: Number(mb.duration_minutes) || 60,
        provider: mb.provider || 'teams',
        meeting_url: (String(mb.meeting_url || '').trim() || ('https://meet.example.org/lsds/meeting-' + mId)),
        access_code: String(100000 + mId).slice(-6),
        access_restriction: mb.access_restriction || 'invite_only',
        recording_enabled: mb.recording_enabled ? 1 : 0,
        status: 'scheduled',
        ended_at: null,
        participant_count: 0,
        participants: [],
        recordings: [],
        created_at: mNow,
        updated_at: mNow
      };
      db().meetings.unshift(meeting);
      return wait(clone(meeting));
    }

    /* ---- Knowledge documents: create ------------------------------------ */
    if (route.path === '/documents' && method === 'POST') {
      var docb = body || {};
      var dTitle = String(docb.title || '').trim();
      if (!dTitle) return reject(fail('Document title is required.', 422));
      var dActor = currentActor();
      var dDept = deptByCode(docb.department_code || deptCodeForUser(dActor) || 'HRM');
      var dCat = categoryFor(docb.category || 'General', 'document');
      var dId = nextId(db().documents);
      var dNow = nowIso();
      var dFileName = docb.file_name ||
        (dTitle.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() + '.pdf');
      var document = {
        id: dId,
        title: dTitle,
        description: docb.description || '',
        category: docb.category || (dCat ? dCat.name : 'General'),
        category_id: dCat ? dCat.id : null,
        department: dDept.name,
        department_code: dDept.code,
        owner_user_id: dActor.id,
        owner_name: dActor.name,
        file_name: dFileName,
        stored_file_name: dId + '-' + dFileName,
        file_path: 'storage/documents/' + (dId + '-' + dFileName),
        mime_type: 'application/pdf',
        file_size_bytes: Number(docb.file_size_bytes) || 512 * 1024,
        current_version_no: 1,
        access_classification: docb.access_classification || 'internal',
        review_status: 'submitted_for_review',
        tags: splitList(docb.tags),
        submitted_at: dNow,
        published_at: null,
        reviewed_by_name: null,
        reviewed_at: null,
        review_comments: null,
        review_due_date: null,
        expiry_date: null,
        created_at: dNow,
        updated_at: dNow
      };
      db().documents.unshift(document);
      return wait(clone(document));
    }

    /* ---- Knowledge videos: create --------------------------------------- */
    if (route.path === '/videos' && method === 'POST') {
      var vb = body || {};
      var vTitle = String(vb.title || '').trim();
      if (!vTitle) return reject(fail('Video title is required.', 422));
      var vActor = currentActor();
      var vDept = deptByCode(vb.department_code || deptCodeForUser(vActor) || 'HRM');
      var vCat = categoryFor(vb.category || 'General', 'video');
      var vId = nextId(db().videos);
      var vNow = nowIso();
      var video = {
        id: vId,
        title: vTitle,
        description: vb.description || '',
        category: vb.category || (vCat ? vCat.name : 'General'),
        category_id: vCat ? vCat.id : null,
        department: vDept.name,
        department_code: vDept.code,
        uploaded_by: vActor.id,
        uploader_name: vActor.name,
        language: 'English',
        duration_seconds: Number(vb.duration_seconds) || (Number(vb.duration_minutes) || 15) * 60,
        views_count: 0,
        upload_status: 'ready',
        review_status: 'pending_review',
        access_classification: vb.access_classification || 'internal',
        tags: splitList(vb.tags),
        file_name: vb.file_name || (vTitle.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'video') + '.mp4',
        stored_file_name: vId + '-video.mp4',
        mime_type: 'video/mp4',
        file_size_bytes: Number(vb.file_size_bytes) || 40 * 1024 * 1024,
        published_at: null,
        created_at: vNow,
        updated_at: vNow
      };
      db().videos.unshift(video);
      return wait(clone(video));
    }

    /* ---- Discussion forum: create thread -------------------------------- */
    if (route.path === '/discussions' && method === 'POST') {
      var fb = body || {};
      var threadTitle = String(fb.title || '').trim();
      if (!threadTitle) return reject(fail('Thread title is required.', 422));
      var fActor = currentActor();
      var fDept = deptByCode(fb.department_code || deptCodeForUser(fActor) || 'HRM');
      var fCat = categoryFor(fb.category || 'General', 'discussion');
      var fId = nextId(db().discussions);
      var fNow = nowIso();
      var thread = {
        id: fId,
        title: threadTitle,
        body: fb.body || '',
        author_user_id: fActor.id,
        author_name: fActor.name,
        category: fb.category || (fCat ? fCat.name : 'General'),
        category_id: fCat ? fCat.id : null,
        department: fDept.name,
        department_code: fDept.code,
        is_pinned: (fb.is_sticky || fb.is_pinned) ? 1 : 0,
        status: ['open', 'locked', 'archived'].indexOf(fb.status) !== -1 ? fb.status : 'open',
        tags: splitList(fb.tags),
        reply_count: 0,
        view_count: 0,
        accepted_reply_id: null,
        last_activity_at: fNow,
        created_at: fNow,
        updated_at: fNow,
        replies: []
      };
      db().discussions.unshift(thread);
      return wait(clone(thread));
    }

    /* ---- Support tickets: create ---------------------------------------- */
    if (route.path === '/tickets' && method === 'POST') {
      var tb = body || {};
      var tSubject = String(tb.subject || '').trim();
      if (!tSubject) return reject(fail('Subject is required.', 422));
      var tActor = currentActor();
      var tDept = deptByCode(tb.department_code || deptCodeForUser(tActor) || 'HRM');
      var tId = nextId(db().tickets);
      var tNow = nowIso();
      var ticket = {
        id: tId,
        reference_no: 'TK-2026-' + String(1000 + tId).slice(-4),
        user_id: tActor.id,
        requester_name: tActor.name,
        department: tDept.name,
        department_code: tDept.code,
        subject: tSubject,
        issue_category: tb.issue_category || 'other',
        problem_description: tb.problem_description || '',
        priority: tb.priority || 'medium',
        assigned_to: null,
        assignee_name: null,
        status: 'open',
        resolution_notes: null,
        resolved_at: null,
        closed_at: null,
        comments: [],
        created_at: tNow,
        updated_at: tNow
      };
      db().tickets.unshift(ticket);
      return wait(clone(ticket));
    }

    /* ---- Users: provision ----------------------------------------------- */
    if (route.path === '/users' && method === 'POST') {
      var ub = body || {};
      var uName = String(ub.name || '').trim();
      var uEmail = String(ub.email || '').trim();
      if (!uName || !uEmail) return reject(fail('Name and email are required.', 422));
      var uDept = deptByCode(ub.department_code || 'HRM');
      var uId = nextId(db().users);
      var user = {
        id: uId,
        name: uName,
        email: uEmail,
        username: uEmail.split('@')[0],
        roles: splitList(ub.roles).length ? splitList(ub.roles) : ['staff'],
        designation: ub.designation || null,
        department: uDept.name,
        department_code: uDept.code,
        account_status: 'active',
        pn: 'PN-' + (10000 + uId),
        oracle_number: 'ORA-' + (78000 + uId),
        phone: ub.phone || null,
        last_login_at: null,
        must_change_password: true,
        created_at: nowIso()
      };
      db().users.unshift(user);
      return wait(clone(user));
    }

    /* ---- Approval workflow: save ---------------------------------------- */
    if (route.path === '/workflow' && method === 'PUT') {
      var wb = body || {};
      var steps = db().workflow.steps;
      if (Array.isArray(wb.steps)) {
        wb.steps.forEach(function (incoming) {
          var step = steps.filter(function (s) { return s.stage_key === incoming.stage_key; })[0];
          if (!step) return;
          if (incoming.stage_label != null) step.stage_label = incoming.stage_label;
          if (incoming.description != null) step.description = incoming.description;
          if (incoming.is_mandatory != null) step.is_mandatory = incoming.is_mandatory ? 1 : 0;
          if (incoming.allow_delegate != null) step.allow_delegate = incoming.allow_delegate ? 1 : 0;
        });
      }
      var wf = db().workflow;
      return wait({
        steps: clone(wf.steps),
        approvers: clone(wf.approvers),
        delegations: clone(wf.delegations),
        totals: {
          steps: wf.steps.length,
          approvers: wf.approvers.length,
          active_approvers: wf.approvers.filter(function (a) { return a.is_active; }).length,
          delegations: wf.delegations.filter(function (d) { return d.status === 'active'; }).length
        }
      });
    }

    return reject(fail('Unknown endpoint: ' + method + ' ' + path, 404));
  }

  /* ------------------------------------------------------------------ *
   * Public façade
   * ------------------------------------------------------------------ */
  LSDS.api = {
    request: request,
    auth: {
      login: function (email, password, remember) {
        return request('POST', '/auth/login', { email: email, password: password, remember: !!remember });
      },
      logout: function () { return request('POST', '/auth/logout'); },
      session: function () { return request('GET', '/auth/session'); },
      forgotPassword: function (email) { return request('POST', '/auth/forgot-password', { email: email }); }
    },
    dashboard: {
      summary: function () { return request('GET', '/dashboard/summary'); }
    },
    notifications: {
      list: function () { return request('GET', '/notifications'); }
    },
    applications: {
      list: function (params) { return request('GET', '/applications' + toQuery(params)); },
      get: function (id) { return request('GET', '/applications/' + id); },
      create: function (payload) { return request('POST', '/applications', payload); },
      decide: function (id, decision, comments) {
        return request('POST', '/applications/' + id + '/decision', { decision: decision, comments: comments });
      }
    },
    approvals: {
      queue: function (params) { return request('GET', '/approvals/queue' + toQuery(params)); }
    },
    users: {
      list: function (params) { return request('GET', '/users' + toQuery(params)); },
      create: function (payload) { return request('POST', '/users', payload); }
    },
    roles: {
      list: function () { return request('GET', '/roles'); }
    },
    departments: {
      list: function () { return request('GET', '/departments'); },
      create: function (payload) { return request('POST', '/departments', payload); }
    },
    reviews: {
      queue: function (params) { return request('GET', '/reviews/queue' + toQuery(params)); },
      decide: function (payload) { return request('POST', '/reviews', payload); }
    },
    sessions: {
      list: function (params) { return request('GET', '/sessions' + toQuery(params)); },
      get: function (id) { return request('GET', '/sessions/' + id); },
      create: function (payload) { return request('POST', '/sessions', payload); }
    },
    financial: {
      list: function (params) { return request('GET', '/financial' + toQuery(params)); }
    },
    disbursements: {
      list: function (params) { return request('GET', '/disbursements' + toQuery(params)); }
    },
    reports: {
      summary: function () { return request('GET', '/reports/summary'); }
    },
    documents: {
      list: function (params) { return request('GET', '/documents' + toQuery(params)); },
      get: function (id) { return request('GET', '/documents/' + id); },
      create: function (payload) { return request('POST', '/documents', payload); }
    },
    videos: {
      list: function (params) { return request('GET', '/videos' + toQuery(params)); },
      get: function (id) { return request('GET', '/videos/' + id); },
      create: function (payload) { return request('POST', '/videos', payload); }
    },
    discussions: {
      list: function (params) { return request('GET', '/discussions' + toQuery(params)); },
      get: function (id) { return request('GET', '/discussions/' + id); },
      create: function (payload) { return request('POST', '/discussions', payload); }
    },
    tickets: {
      list: function (params) { return request('GET', '/tickets' + toQuery(params)); },
      get: function (id) { return request('GET', '/tickets/' + id); },
      create: function (payload) { return request('POST', '/tickets', payload); }
    },
    courses: {
      list: function (params) { return request('GET', '/courses' + toQuery(params)); },
      get: function (id) { return request('GET', '/courses/' + id); },
      create: function (payload) { return request('POST', '/courses', payload); }
    },
    meetings: {
      list: function (params) { return request('GET', '/meetings' + toQuery(params)); },
      get: function (id) { return request('GET', '/meetings/' + id); },
      create: function (payload) { return request('POST', '/meetings', payload); }
    },
    workflow: {
      get: function () { return request('GET', '/workflow'); },
      save: function (payload) { return request('PUT', '/workflow', payload); }
    },
    settings: {
      list: function () { return request('GET', '/settings'); }
    },
    audit: {
      list: function (params) { return request('GET', '/audit-logs' + toQuery(params)); }
    },
    backups: {
      list: function (params) { return request('GET', '/backups' + toQuery(params)); }
    }
  };
})(window);
