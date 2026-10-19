/* ============================================================================
 * LSDS Admin - Video Library
 * ========================================================================== */
(function (window, document) {
  'use strict';

  var LSDS = window.LSDS;
  var ui = LSDS.ui;

  var STATUS_OPTIONS = [
    { v: '', l: 'All status' },
    { v: 'published', l: 'Published' },
    { v: 'pending_review', l: 'Pending Review' },
    { v: 'under_review', l: 'Under Review' },
    { v: 'draft', l: 'Draft' },
    { v: 'archived', l: 'Archived' },
    { v: 'rejected', l: 'Rejected' }
  ];

  var CATEGORIES = [];
  var all = [];
  var departments = [];
  var state = { q: '', status: '', category: '', department: '' };

  function stats(list, totals) {
    return '<div class="grid stats">' +
      ui.statCard({ label: 'Total videos', value: totals.count, icon: 'play', tone: 'blue' }) +
      ui.statCard({ label: 'Published', value: totals.published, icon: 'checkCircle', tone: 'green' }) +
      ui.statCard({ label: 'Total views', value: totals.views, icon: 'eye', tone: 'sky' }) +
      ui.statCard({ label: 'Pending review', value: list.filter(function (v) { return v.review_status !== 'published' && v.review_status !== 'archived' && v.review_status !== 'draft'; }).length, icon: 'clock', tone: 'amber' }) +
    '</div>';
  }

  function formatDuration(s) {
    if (!s) return '\u2014';
    var m = Math.floor(s / 60), r = s % 60;
    return m + ':' + (r < 10 ? '0' + r : r);
  }

  function playableUrl(v) {
    var p = v.file_path || (v.stored_file_name ? 'storage/videos/' + v.stored_file_name : '') || v.file_name || '';
    if (!p) return '';
    if (/^https?:\/\//i.test(p)) return p;
    var base = (LSDS.config && LSDS.config.apiBase) || '/lsds/api';
    return base.replace(/\/api\/?$/, '/') + String(p).replace(/^\/+/, '');
  }

  function find(id) {
    for (var i = 0; i < all.length; i++) {
      if (String(all[i].id) === String(id)) return all[i];
    }
    return null;
  }

  function watch(v) {
    if (!v) return;
    var url = playableUrl(v);
    var poster = v.thumbnail_path ? ' poster="' + ui.escapeHtml(v.thumbnail_path) + '"' : '';
    var player = url
      ? '<video controls preload="metadata" playsinline' + poster + ' src="' + ui.escapeHtml(url) + '"' +
          ' style="width:100%;max-height:420px;background:#000;border-radius:10px">Your browser does not support the video tag.</video>'
      : '';
    var meta =
      '<dl class="kv">' +
        '<dt>Category</dt><dd>' + ui.escapeHtml(v.category || '\u2014') + '</dd>' +
        '<dt>Department</dt><dd>' + ui.escapeHtml(v.department) + '</dd>' +
        '<dt>Uploader</dt><dd>' + ui.escapeHtml(v.uploader_name) + '</dd>' +
        '<dt>Duration</dt><dd>' + formatDuration(v.duration_seconds) + '</dd>' +
        '<dt>Views</dt><dd>' + ui.formatNumber(v.views_count) + '</dd>' +
        '<dt>Access</dt><dd>' + ui.escapeHtml(v.access_classification) + '</dd>' +
        '<dt>File</dt><dd>' + ui.escapeHtml(v.file_name || v.stored_file_name || '\u2014') + '</dd>' +
      '</dl>';
    var transcript = v.transcript
      ? '<div class="section-title">Transcript</div><p class="prose" style="white-space:pre-line">' + ui.escapeHtml(v.transcript) + '</p>'
      : '';
    var body =
      '<div class="stack-sm">' +
        '<div><div style="font-size:1.02rem;font-weight:650;color:var(--gray-900)">' + ui.escapeHtml(v.title) + '</div>' +
          '<div style="margin-top:6px">' + ui.badge(v.review_status) + ' <span class="badge badge-sky">' + ui.escapeHtml(v.upload_status) + '</span> <span class="badge badge-gray">' + ui.escapeHtml(v.access_classification) + '</span></div></div>' +
        player +
        '<div data-player-fallback class="player-fallback" style="border:1px dashed var(--border);border-radius:10px;padding:22px 16px;text-align:center">' +
          '<div style="font-size:1.5rem;color:var(--brand-600)">' + ui.icon('play', '') + '</div>' +
          '<p class="muted" style="margin:8px 0 0">Playback is not available yet \u2014 video files are stored as metadata only in this build.</p>' +
        '</div>' +
        (v.description ? '<p class="prose">' + ui.escapeHtml(v.description) + '</p>' : '') +
        meta +
        transcript +
      '</div>';
    ui.modal({
      title: 'Watch video',
      size: 'lg',
      body: body,
      onOpen: function (card) {
        var vid = card.querySelector('video');
        var fb = card.querySelector('[data-player-fallback]');
        if (!vid || !fb) return;
        vid.addEventListener('loadeddata', function () { fb.classList.add('hidden'); });
        vid.addEventListener('error', function () { vid.classList.add('hidden'); fb.classList.remove('hidden'); });
      }
    });
  }

  function shell() {
    document.getElementById('page-content').innerHTML =
      '<div class="page-head">' +
        '<div><h1>Video Library</h1><p class="sub">On-demand recordings, tutorials and knowledge transfer videos.</p></div>' +
        '<div class="page-actions"><button class="btn btn-primary" id="btn-upload">' + ui.icon('upload', '') + 'Upload Video</button></div>' +
      '</div>' +
      stats(all, LSDS.api.__lastVideos || { count: all.length, published: all.filter(function (v) { return v.review_status === 'published'; }).length, views: 0 }) +
      '<div class="card" style="margin-top:22px">' +
        '<div class="toolbar">' +
          '<label class="search-inline">' + ui.icon('search', '') + '<input id="f-q" placeholder="Search title, tags or uploader\u2026"></label>' +
          '<select class="select-sm" id="f-status">' + STATUS_OPTIONS.map(function (o) { return '<option value="' + o.v + '">' + o.l + '</option>'; }).join('') + '</select>' +
          '<select class="select-sm" id="f-category"><option value="">All categories</option>' + CATEGORIES.map(function (c) { return '<option value="' + ui.escapeHtml(c) + '">' + ui.escapeHtml(c) + '</option>'; }).join('') + '</select>' +
          '<select class="select-sm" id="f-dept"><option value="">All departments</option>' + departments.map(function (d) { return '<option value="' + d.code + '">' + ui.escapeHtml(d.name) + '</option>'; }).join('') + '</select>' +
          '<span class="grow"></span><span class="muted" id="result-count"></span>' +
        '</div>' +
        '<div id="list-host"></div>' +
      '</div>';

    ui.qs('#btn-upload').addEventListener('click', openCreate);
    ui.qs('#f-q').addEventListener('input', ui.debounce(function (e) { state.q = e.target.value.trim(); draw(); }, 240));
    ui.qs('#f-status').addEventListener('change', function (e) { state.status = e.target.value; draw(); });
    ui.qs('#f-category').addEventListener('change', function (e) { state.category = e.target.value; draw(); });
    ui.qs('#f-dept').addEventListener('change', function (e) { state.department = e.target.value; draw(); });
  }

  function filtered() {
    var q = state.q.toLowerCase();
    return all.filter(function (v) {
      if (state.status && v.review_status !== state.status) return false;
      if (state.category && v.category !== state.category) return false;
      if (state.department && v.department_code !== state.department) return false;
      if (q) {
        var text = (v.title + ' ' + (v.uploader_name || '') + ' ' + (v.tags || []).join(' ')).toLowerCase();
        if (text.indexOf(q) === -1) return false;
      }
      return true;
    }).sort(function (x, y) { return new Date(y.updated_at) - new Date(x.updated_at); });
  }

  function draw() {
    var list = filtered();
    ui.qs('#result-count').textContent = list.length + ' video' + (list.length === 1 ? '' : 's');
    var host = ui.qs('#list-host');
    if (!list.length) {
      host.innerHTML = '<div class="empty-state"><div class="e-ico">' + ui.icon('play', '') + '</div><h3>No videos found</h3><p>Adjust the filters to widen your search.</p></div>';
      return;
    }
    var rows = list.map(function (v) {
      var tags = (v.tags || []).map(function (t) { return '<span class="chip">' + ui.escapeHtml(t) + '</span>'; }).join(' ');
      return '<div class="doc-row">' +
        '<span class="doc-ico" data-watch="' + v.id + '" role="button" title="Watch" style="cursor:pointer">' + ui.icon('play', '') + '</span>' +
        '<div class="doc-main">' +
          '<div class="t">' + ui.escapeHtml(v.title) + '</div>' +
          '<div class="s muted">' + ui.escapeHtml(v.category || '\u2014') + ' \u00b7 ' + ui.escapeHtml(v.department) + ' \u00b7 ' + formatDuration(v.duration_seconds) + ' \u00b7 ' + ui.formatNumber(v.views_count) + ' views</div>' +
          '<div class="s muted" style="margin-top:4px">By ' + ui.escapeHtml(v.uploader_name) + ' \u00b7 ' + ui.formatDate(v.updated_at) + (tags ? ' \u00b7 ' + tags : '') + '</div>' +
        '</div>' +
        '<div class="nowrap">' + ui.badge(v.review_status) + '</div>' +
        '<div class="nowrap"><span class="badge badge-gray">' + ui.escapeHtml(v.access_classification) + '</span></div>' +
        '<div class="nowrap"><a class="link-strong" data-watch="' + v.id + '">Watch</a></div>' +
        '<div class="nowrap"><a class="link-strong" data-view="' + v.id + '">Details</a>' +
          (LSDS.review ? LSDS.review.actionsHtml('video', v) : '') + '</div>' +
      '</div>';
    }).join('');
    host.innerHTML = '<div style="padding:0 18px">' + rows + '</div>';

    ui.qsa('[data-view]', host).forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        openDetail(a.getAttribute('data-view'));
      });
    });
    ui.qsa('[data-watch]', host).forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        watch(find(a.getAttribute('data-watch')));
      });
    });
    if (LSDS.review) {
      LSDS.review.bindActions(host, function () { load(); });
    }
  }

  function openDetail(id) {
    var current = null;
    var handle = ui.modal({
      title: 'Video details',
      size: 'lg',
      body: '<div class="skeleton" style="height:90px"></div>',
      actions: [
        { label: 'Watch', class: 'btn-primary', onClick: function (h) { if (current) { h.close(); watch(current); } } }
      ]
    });
    LSDS.api.videos.get(id).then(function (v) {
      current = v;
      var tags = (v.tags || []).map(function (t) { return '<span class="chip">' + ui.escapeHtml(t) + '</span>'; }).join(' ');
      var body =
        '<div class="stack-sm">' +
          '<div><div style="font-size:1.02rem;font-weight:650;color:var(--gray-900)">' + ui.escapeHtml(v.title) + '</div>' +
          '<div style="margin-top:6px">' + ui.badge(v.review_status) + ' <span class="badge badge-sky">' + ui.escapeHtml(v.upload_status) + '</span> <span class="badge badge-gray">' + ui.escapeHtml(v.access_classification) + '</span>' +
            (LSDS.review ? LSDS.review.actionsHtml('video', v) : '') + '</div></div>' +
          (v.description ? '<p class="prose">' + ui.escapeHtml(v.description) + '</p>' : '') +
          '<dl class="kv">' +
            '<dt>Category</dt><dd>' + ui.escapeHtml(v.category || '\u2014') + '</dd>' +
            '<dt>Department</dt><dd>' + ui.escapeHtml(v.department) + '</dd>' +
            '<dt>Uploader</dt><dd>' + ui.escapeHtml(v.uploader_name) + '</dd>' +
            '<dt>Duration</dt><dd>' + formatDuration(v.duration_seconds) + '</dd>' +
            '<dt>Views</dt><dd>' + ui.formatNumber(v.views_count) + '</dd>' +
            '<dt>File</dt><dd>' + ui.escapeHtml(v.file_name || v.stored_file_name) + '</dd>' +
            '<dt>Language</dt><dd>' + ui.escapeHtml(v.language) + '</dd>' +
            '<dt>Published</dt><dd>' + ui.formatDate(v.published_at) + '</dd>' +
            '<dt>Created</dt><dd>' + ui.formatDate(v.created_at) + '</dd>' +
            '<dt>Updated</dt><dd>' + ui.formatDate(v.updated_at) + '</dd>' +
            '<dt>Tags</dt><dd>' + (tags || '\u2014') + '</dd>' +
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

  function openCreate() {
    LSDS.api.departments.list().then(function (res) {
      var depts = (res.data || []).map(function (d) { return { v: d.code, l: d.name }; });
      var cats = CATEGORIES.length ? CATEGORIES.slice() : ['Information Security', 'Training Materials', 'Technical Support'];
      ui.formModal({
        title: 'Upload video',
        submitLabel: 'Upload video',
        fields: [
          { name: 'title', label: 'Title', required: true, placeholder: 'e.g. Phishing Awareness Walkthrough' },
          { name: 'category', label: 'Category', type: 'select', half: true,
            options: [{ v: '', l: 'Select a category\u2026' }].concat(cats.map(function (c) { return { v: c, l: c }; })) },
          { name: 'access_classification', label: 'Access classification', type: 'select', half: true, value: 'internal',
            options: [{ v: 'internal', l: 'Internal' }, { v: 'restricted', l: 'Restricted' }, { v: 'confidential', l: 'Confidential' }] },
          { name: 'department_code', label: 'Owning department', type: 'select', half: true, options: depts },
          { name: 'file', label: 'Video file', type: 'file', half: true, required: true },
          { name: 'duration_minutes', label: 'Duration (minutes)', type: 'number', half: true, min: 0, step: 1, value: '5' },
          { name: 'tags', label: 'Tags', placeholder: 'Comma or newline separated', hint: 'Used for search and discovery.' },
          { name: 'description', label: 'Description', type: 'textarea', rows: 3, placeholder: 'What does this video cover?' }
        ],
        onSubmit: function (values, h) {
          var input = h.card.querySelector('[data-field="file"]');
          var f = input && input.files && input.files[0];
          if (f) { values.file_name = f.name; values.file_size_bytes = f.size; }
          delete values.file;
          values.duration_seconds = Math.round(Number(values.duration_minutes) || 0) * 60;
          delete values.duration_minutes;
          return LSDS.api.videos.create(values).then(function (created) {
            ui.toast({ type: 'success', title: 'Video uploaded', message: created.title + ' was submitted for review.' });
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
      LSDS.api.videos.list(),
      LSDS.data.build()
    ]).then(function (results) {
      var res = results[0], db = results[1];
      all = res.data || [];
      LSDS.api.__lastVideos = res;
      departments = db.departments || [];
      CATEGORIES = [];
      all.forEach(function (v) { if (v.category && CATEGORIES.indexOf(v.category) === -1) CATEGORIES.push(v.category); });
      CATEGORIES.sort();
      shell();
      draw();
    }).catch(function (err) {
      document.getElementById('page-content').innerHTML =
        '<div class="empty-state"><div class="e-ico" style="color:var(--red-500)">' + ui.icon('alertTriangle', '') + '</div>' +
        '<h3>Could not load videos</h3><p>' + ui.escapeHtml(err.message) + '</p></div>';
    });
  }

  function init() {
    var user = LSDS.layout.init({ active: 'videos', title: 'Video Library' });
    if (!user) return;
    load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
