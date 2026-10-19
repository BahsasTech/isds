/* ============================================================================
 * LSDS Admin - Documents (Knowledge Repository)
 * ========================================================================== */
(function (window, document) {
  'use strict';

  var LSDS = window.LSDS;
  var ui = LSDS.ui;

  var STATUS_OPTIONS = [
    { v: '', l: 'All status' },
    { v: 'published', l: 'Published' },
    { v: 'under_review', l: 'Under Review' },
    { v: 'submitted_for_review', l: 'Submitted for Review' },
    { v: 'returned', l: 'Returned' },
    { v: 'draft', l: 'Draft' },
    { v: 'approved', l: 'Approved' },
    { v: 'archived', l: 'Archived' }
  ];

  var ACCESS_OPTIONS = [
    { v: '', l: 'All access' },
    { v: 'internal', l: 'Internal' },
    { v: 'restricted', l: 'Restricted' },
    { v: 'confidential', l: 'Confidential' }
  ];

  var CATEGORIES = [];
  var all = [];
  var state = { q: '', status: '', category: '', department: '', access: '' };

  function stats(list, totals) {
    return '<div class="grid stats">' +
      ui.statCard({ label: 'Total documents', value: totals.count, icon: 'folder', tone: 'blue', foot: 'In repository' }) +
      ui.statCard({ label: 'Published', value: totals.published, icon: 'checkCircle', tone: 'green', foot: 'Live documents' }) +
      ui.statCard({ label: 'Pending review', value: totals.pending, icon: 'clock', tone: 'amber', foot: 'Draft/review flow' }) +
      ui.statCard({ label: 'Restricted/Confidential', value: list.filter(function (d) { return d.access_classification !== 'internal'; }).length, icon: 'shield', tone: 'violet', foot: 'Controlled access' }) +
    '</div>';
  }

  function shell() {
    document.getElementById('page-content').innerHTML =
      '<div class="page-head">' +
        '<div><h1>Documents</h1>' +
          '<p class="sub">Policy documents, procedures and reference materials in the Knowledge Repository.</p></div>' +
        '<div class="page-actions"><button class="btn btn-primary" id="btn-upload">' + ui.icon('upload', '') + 'Upload Document</button></div>' +
      '</div>' +
      stats(all, (LSDS.api.__lastDocs && LSDS.api.__lastDocs.totals) || { count: all.length, published: all.filter(function (d) { return d.review_status === 'published'; }).length, pending: 0 }) +
      '<div class="card" style="margin-top:22px">' +
        '<div class="toolbar">' +
          '<label class="search-inline">' + ui.icon('search', '') +
            '<input id="f-q" type="search" placeholder="Search title, tags or owner\u2026"></label>' +
          '<select class="select-sm" id="f-status">' + STATUS_OPTIONS.map(function (o) { return '<option value="' + o.v + '">' + o.l + '</option>'; }).join('') + '</select>' +
          '<select class="select-sm" id="f-category"><option value="">All categories</option>' + CATEGORIES.map(function (c) { return '<option value="' + ui.escapeHtml(c) + '">' + ui.escapeHtml(c) + '</option>'; }).join('') + '</select>' +
          '<select class="select-sm" id="f-dept"><option value="">All departments</option>' +
            departments.map(function (d) { return '<option value="' + d.code + '">' + ui.escapeHtml(d.name) + '</option>'; }).join('') +
          '</select>' +
          '<select class="select-sm" id="f-access">' + ACCESS_OPTIONS.map(function (o) { return '<option value="' + o.v + '">' + o.l + '</option>'; }).join('') + '</select>' +
          '<span class="grow"></span>' +
          '<span class="muted" id="result-count"></span>' +
        '</div>' +
        '<div id="list-host"></div>' +
      '</div>';

    ui.qs('#btn-upload').addEventListener('click', openCreate);
    ui.qs('#f-q').addEventListener('input', ui.debounce(function (e) { state.q = e.target.value.trim(); draw(); }, 240));
    ui.qs('#f-status').addEventListener('change', function (e) { state.status = e.target.value; draw(); });
    ui.qs('#f-category').addEventListener('change', function (e) { state.category = e.target.value; draw(); });
    ui.qs('#f-dept').addEventListener('change', function (e) { state.department = e.target.value; draw(); });
    ui.qs('#f-access').addEventListener('change', function (e) { state.access = e.target.value; draw(); });
  }

  var departments = [];
  function filtered() {
    var q = state.q.toLowerCase();
    return all.filter(function (d) {
      if (state.status && d.review_status !== state.status) return false;
      if (state.category && d.category !== state.category) return false;
      if (state.department && d.department_code !== state.department) return false;
      if (state.access && d.access_classification !== state.access) return false;
      if (q) {
        var text = (d.title + ' ' + (d.description || '') + ' ' + (d.owner_name || '') + ' ' + (d.tags || []).join(' ')).toLowerCase();
        if (text.indexOf(q) === -1) return false;
      }
      return true;
    }).sort(function (x, y) { return new Date(y.updated_at) - new Date(x.updated_at); });
  }

  function iconFor(doc) {
    var ext = (doc.file_name || '').split('.').pop().toLowerCase();
    if (ext === 'pdf') return 'fileText';
    return 'folder';
  }

  function draw() {
    var list = filtered();
    ui.qs('#result-count').textContent = list.length + ' document' + (list.length === 1 ? '' : 's');
    var host = ui.qs('#list-host');
    if (!list.length) {
      host.innerHTML = '<div class="empty-state"><div class="e-ico">' + ui.icon('folder', '') + '</div>' +
        '<h3>No documents found</h3><p>Adjust the filters to widen your search.</p></div>';
      return;
    }
    var rows = list.map(function (d) {
      var size = d.file_size_bytes ? (d.file_size_bytes / 1024).toFixed(0) + ' KB' : '\u2014';
      return '<div class="doc-row">' +
        '<span class="doc-ico">' + ui.icon(iconFor(d), '') + '</span>' +
        '<div class="doc-main">' +
          '<div class="t">' + ui.escapeHtml(d.title) + '</div>' +
          '<div class="s muted">' + ui.escapeHtml(d.category || '\u2014') + ' \u00b7 ' + ui.escapeHtml(d.department) + ' \u00b7 v' + d.current_version_no + ' \u00b7 ' + size + '</div>' +
          '<div class="s muted" style="margin-top:2px">Owner: ' + ui.escapeHtml(d.owner_name) + ' \u00b7 ' + ui.formatDate(d.updated_at) + '</div>' +
        '</div>' +
        '<div class="nowrap">' + ui.badge(d.review_status) + '</div>' +
        '<div class="nowrap"><span class="badge badge-gray">' + ui.escapeHtml(d.access_classification) + '</span></div>' +
        '<div class="nowrap">' +
          '<a class="link-strong" data-open="' + d.id + '">View</a>' +
          ' <span class="muted">\u00b7</span> ' +
          '<a class="link-strong" data-view="' + d.id + '">Details</a>' +
          (LSDS.review ? LSDS.review.actionsHtml('document', d) : '') +
        '</div>' +
      '</div>';
    }).join('');
    host.innerHTML = '<div style="padding:0 18px">' + rows + '</div>';

    ui.qsa('[data-view]', host).forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        openDetail(a.getAttribute('data-view'));
      });
    });
    ui.qsa('[data-open]', host).forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        openViewer(find(a.getAttribute('data-open')));
      });
    });
    if (LSDS.review) {
      LSDS.review.bindActions(host, function () { load(); });
    }
  }

  function find(id) {
    for (var i = 0; i < all.length; i++) {
      if (String(all[i].id) === String(id)) return all[i];
    }
    return null;
  }

  function openDetail(id) {
    var current = null;
    var handle = ui.modal({
      title: 'Document details',
      size: 'lg',
      body: '<div class="skeleton" style="height:100px"></div>',
      actions: [
        { label: 'View document', class: 'btn-primary', onClick: function (h) { if (current) { h.close(); openViewer(current); } } },
        { label: 'Close', class: 'btn-secondary', onClick: function (h) { h.close(); } }
      ]
    });
    LSDS.api.documents.get(id).then(function (d) {
      current = d;
      var tags = (d.tags || []).map(function (t) { return '<span class="chip">' + ui.escapeHtml(t) + '</span>'; }).join('');
      var body =
        '<div class="stack-sm">' +
          '<div><div style="font-size:1.02rem;font-weight:650;color:var(--gray-900)">' + ui.escapeHtml(d.title) + '</div>' +
            '<div style="margin-top:6px">' + ui.badge(d.review_status) + ' <span class="badge badge-gray">' + ui.escapeHtml(d.access_classification) + '</span>' +
            (LSDS.review ? LSDS.review.actionsHtml('document', d) : '') + '</div></div>' +
          (d.description ? '<p class="prose">' + ui.escapeHtml(d.description) + '</p>' : '') +
          '<dl class="kv">' +
            '<dt>Category</dt><dd>' + ui.escapeHtml(d.category || '\u2014') + '</dd>' +
            '<dt>Department</dt><dd>' + ui.escapeHtml(d.department) + '</dd>' +
            '<dt>Owner</dt><dd>' + ui.escapeHtml(d.owner_name) + '</dd>' +
            '<dt>File</dt><dd>' + ui.escapeHtml(d.file_name) + ' \u00b7 v' + d.current_version_no + '</dd>' +
            '<dt>Size</dt><dd>' + (d.file_size_bytes ? (d.file_size_bytes / 1024).toFixed(0) + ' KB' : '\u2014') + '</dd>' +
            '<dt>MIME</dt><dd>' + ui.escapeHtml(d.mime_type || '\u2014') + '</dd>' +
            '<dt>Submitted</dt><dd>' + ui.formatDate(d.submitted_at) + '</dd>' +
            '<dt>Published</dt><dd>' + ui.formatDate(d.published_at) + '</dd>' +
            '<dt>Reviewed by</dt><dd>' + ui.escapeHtml(d.reviewed_by_name || '\u2014') + ' ' + ui.formatDate(d.reviewed_at) + '</dd>' +
            '<dt>Review due</dt><dd>' + ui.formatDate(d.review_due_date) + '</dd>' +
            '<dt>Expiry</dt><dd>' + ui.formatDate(d.expiry_date) + '</dd>' +
            '<dt>Tags</dt><dd>' + (tags || '\u2014') + '</dd>' +
            '<dt>Review comments</dt><dd>' + ui.escapeHtml(d.review_comments || '\u2014') + '</dd>' +
          '</dl>' +
        '</div>';
      var bodyEl = handle.card.querySelector('.modal-body');
      if (bodyEl) {
        bodyEl.innerHTML = body;
        if (LSDS.review) {
          LSDS.review.bindActions(bodyEl, function () { handle.close(); load(); });
        }
      }
    }).catch(function (err) {
      var bodyEl = handle.card.querySelector('.modal-body');
      if (bodyEl) bodyEl.innerHTML = '<p class="muted">' + ui.escapeHtml(err.message) + '</p>';
    });
  }

  /* --- Document viewer ---------------------------------------------------- */
  function fileUrl(d) {
    var p = d.file_path || (d.stored_file_name ? 'storage/documents/' + d.stored_file_name : '');
    if (!p) return '';
    if (/^https?:\/\//i.test(p) || p.charAt(0) === '/') return p;
    var base = (LSDS.config && LSDS.config.apiBase) || '/lsds/api';
    return base.replace(/\/api\/?$/, '/') + String(p).replace(/^\/+/, '');
  }

  /** Only offer open/download when the stored file is really reachable. */
  function fileAvailable(url) {
    if (!url || window.location.protocol === 'file:') return Promise.resolve(false);
    return fetch(url, { method: 'HEAD', credentials: 'include' })
      .then(function (r) {
        if (!r.ok) return false;
        var type = (r.headers && r.headers.get) ? (r.headers.get('content-type') || '') : '';
        /* The router answers unknown paths with the app shell, not a file. */
        return type.indexOf('text/html') === -1;
      })
      .catch(function () { return false; });
  }

  function fileNote(message) {
    return '<div class="player-fallback" style="border:1px dashed var(--border);border-radius:10px;padding:22px 16px;text-align:center">' +
      '<div style="font-size:1.5rem;color:var(--brand-600)">' + ui.icon('fileText', '') + '</div>' +
      '<p class="muted" style="margin:8px 0 0">' + ui.escapeHtml(message) + '</p></div>';
  }

  function openViewer(d) {
    if (!d) return;
    var url = fileUrl(d);
    var tags = (d.tags || []).map(function (t) { return '<span class="chip">' + ui.escapeHtml(t) + '</span>'; }).join('');
    var body =
      '<div class="stack-sm">' +
        '<div><div style="font-size:1.02rem;font-weight:650;color:var(--gray-900)">' + ui.escapeHtml(d.title) + '</div>' +
          '<div style="margin-top:6px">' + ui.badge(d.review_status) + ' <span class="badge badge-gray">' + ui.escapeHtml(d.access_classification) + '</span></div></div>' +
        '<div data-doc-file><div class="muted" style="text-align:center;padding:22px 0">Checking file availability\u2026</div></div>' +
        (d.description ? '<p class="prose">' + ui.escapeHtml(d.description) + '</p>' : '') +
        '<dl class="kv">' +
          '<dt>File</dt><dd>' + ui.escapeHtml(d.file_name || d.stored_file_name || '\u2014') + '</dd>' +
          '<dt>Size</dt><dd>' + (d.file_size_bytes ? (d.file_size_bytes / 1024).toFixed(0) + ' KB' : '\u2014') + '</dd>' +
          '<dt>Type</dt><dd>' + ui.escapeHtml(d.mime_type || '\u2014') + '</dd>' +
          '<dt>Category</dt><dd>' + ui.escapeHtml(d.category || '\u2014') + '</dd>' +
          '<dt>Department</dt><dd>' + ui.escapeHtml(d.department || '\u2014') + '</dd>' +
          '<dt>Owner</dt><dd>' + ui.escapeHtml(d.owner_name || '\u2014') + '</dd>' +
          '<dt>Version</dt><dd>v' + (d.current_version_no || 1) + '</dd>' +
          '<dt>Tags</dt><dd>' + (tags || '\u2014') + '</dd>' +
          '<dt>Updated</dt><dd>' + ui.formatDate(d.updated_at) + '</dd>' +
        '</dl>' +
      '</div>';

    ui.modal({
      title: 'View document',
      size: 'lg',
      body: body,
      actions: [
        { label: 'Close', class: 'btn-secondary', onClick: function (h) { h.close(); } }
      ],
      onOpen: function (card) {
        var host = card.querySelector('[data-doc-file]');
        if (!host) return;
        if (!url) {
          host.innerHTML = fileNote('No file reference is recorded for this document \u2014 only its metadata is available.');
          return;
        }
        fileAvailable(url).then(function (ok) {
          if (!card.contains(host)) return;
          if (!ok) {
            host.innerHTML = fileNote('The file is not stored on this server yet \u2014 only its metadata is available.');
            return;
          }
          host.innerHTML =
            '<iframe src="' + ui.escapeHtml(url) + '" title="' + ui.escapeHtml(d.title || 'Document') + '"' +
              ' style="width:100%;height:430px;border:1px solid var(--border);border-radius:10px;background:#fff"></iframe>' +
            '<div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap">' +
              '<a class="btn btn-secondary" href="' + ui.escapeHtml(url) + '" target="_blank" rel="noopener">' + ui.icon('externalLink', '') + 'Open in new tab</a>' +
              '<a class="btn btn-secondary" href="' + ui.escapeHtml(url) + '" download>' + ui.icon('download', '') + 'Download</a>' +
            '</div>';
        });
      }
    });
  }

  function openCreate() {
    LSDS.api.departments.list().then(function (res) {
      var depts = (res.data || []).map(function (d) { return { v: d.code, l: d.name }; });
      var cats = CATEGORIES.length ? CATEGORIES.slice() : ['Standard Operating Procedures', 'Organizational Policies', 'Research and Reports'];
      ui.formModal({
        title: 'Upload document',
        submitLabel: 'Upload document',
        fields: [
          { name: 'title', label: 'Title', required: true, placeholder: 'e.g. ICT Security Policy 2026' },
          { name: 'category', label: 'Category', type: 'select', half: true,
            options: [{ v: '', l: 'Select a category\u2026' }].concat(cats.map(function (c) { return { v: c, l: c }; })) },
          { name: 'access_classification', label: 'Access classification', type: 'select', half: true, value: 'internal',
            options: [{ v: 'internal', l: 'Internal' }, { v: 'restricted', l: 'Restricted' }, { v: 'confidential', l: 'Confidential' }] },
          { name: 'department_code', label: 'Owning department', type: 'select', half: true, options: depts },
          { name: 'file', label: 'File', type: 'file', half: true, required: true },
          { name: 'tags', label: 'Tags', placeholder: 'Comma or newline separated', hint: 'Used for search and discovery.' },
          { name: 'description', label: 'Description', type: 'textarea', rows: 3, placeholder: 'What does this document cover?' }
        ],
        onSubmit: function (values, h) {
          var input = h.card.querySelector('[data-field="file"]');
          var f = input && input.files && input.files[0];
          if (f) { values.file_name = f.name; values.file_size_bytes = f.size; }
          delete values.file;
          return LSDS.api.documents.create(values).then(function (created) {
            ui.toast({ type: 'success', title: 'Document uploaded', message: created.title + ' was submitted for review.' });
            load();
          });
        }
      });
    }).catch(function (err) {
      ui.toast({ type: 'error', title: 'Could not open form', message: err.message });
    });
  }

  function load() {
    document.getElementById('page-content').innerHTML =
      '<div class="stack"><div class="grid stats">' +
        '<div class="skeleton" style="height:100px"></div><div class="skeleton" style="height:100px"></div>' +
        '<div class="skeleton" style="height:100px"></div><div class="skeleton" style="height:100px"></div></div>' +
        '<div class="skeleton" style="height:300px"></div></div>';

    Promise.all([
      LSDS.api.documents.list(),
      LSDS.data.build ? Promise.resolve(LSDS.data.build()) : LSDS.api.departments.list().then(function (r) { return { departments: r.data || [] }; })
    ]).then(function (results) {
      var res = results[0];
      var db = results[1];
      all = res.data || [];
      LSDS.api.__lastDocs = res;
      departments = db.departments || [];
      CATEGORIES = [];
      all.forEach(function (d) {
        if (d.category && CATEGORIES.indexOf(d.category) === -1) CATEGORIES.push(d.category);
      });
      CATEGORIES.sort();
      shell();
      draw();
    }).catch(function (err) {
      document.getElementById('page-content').innerHTML =
        '<div class="empty-state"><div class="e-ico" style="color:var(--red-500)">' + ui.icon('alertTriangle', '') + '</div>' +
        '<h3>Could not load documents</h3><p>' + ui.escapeHtml(err.message) + '</p></div>';
    });
  }

  function init() {
    if (!LSDS.layout) return;
    var user = LSDS.layout.init({ active: 'documents', title: 'Documents' });
    if (!user) return;
    load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
