/* ============================================================================
 * LSDS Admin - Content review decisions
 * ----------------------------------------------------------------------------
 * Shared approve / return / reject behaviour used by the Documents page, the
 * Video Library and the Content Review queue. Exposes window.LSDS.review.
 * ========================================================================== */
(function (window, document) {
  'use strict';

  var LSDS = (window.LSDS = window.LSDS || {});
  var ui = LSDS.ui;

  var REVIEW_ROLES = ['sysadmin', 'knowledge_manager'];

  var PENDING = {
    document: ['submitted_for_review', 'under_review'],
    video: ['pending_review', 'under_review']
  };

  var LABELS = {
    published: 'Published',
    approved: 'Approved',
    under_review: 'Under review',
    submitted_for_review: 'Submitted for review',
    pending_review: 'Pending review',
    returned: 'Returned',
    rejected: 'Rejected',
    draft: 'Draft',
    archived: 'Archived'
  };

  var KINDS = {
    approve: { decision: 'approved', comment: false, btn: 'btn-primary', confirm: 'Confirm approval' },
    'return': { decision: 'returned', comment: true, btn: 'btn-secondary', confirm: 'Return for correction' },
    reject: { decision: 'rejected', comment: true, btn: 'btn-danger', confirm: 'Reject' }
  };

  function canReview() {
    return !!(LSDS.auth && LSDS.auth.hasAnyRole(REVIEW_ROLES));
  }

  function isPending(type, status) {
    var list = PENDING[type] || [];
    return list.indexOf(status) !== -1;
  }

  function statusLabel(status) {
    if (!status) return '\u2014';
    return LABELS[status] || ui.titleCase(String(status).replace(/_/g, ' '));
  }

  function noun(type) { return type === 'video' ? 'video' : 'document'; }

  /** Inline action links for a list row or detail header. */
  function actionsHtml(type, item, kinds) {
    if (!canReview() || !isPending(type, item.review_status)) return '';
    var list = kinds || ['approve', 'reject'];
    var labels = { approve: 'Approve', 'return': 'Return', reject: 'Reject' };
    var attrs = ' data-rv-type="' + type + '" data-rv-id="' + ui.escapeHtml(String(item.id)) +
      '" data-rv-title="' + ui.escapeHtml(item.title || '') + '"';
    return list.map(function (kind) {
      var style = kind === 'reject' ? ' style="color:var(--red-600)"' : '';
      return ' <span class="muted">\u00b7</span> ' +
        '<a class="link-strong" href="#"' + style + ' data-rv="' + kind + '"' + attrs + '>' +
        (labels[kind] || ui.titleCase(kind)) + '</a>';
    }).join('');
  }

  /** Wire every [data-rv] link inside `host`. `onDone(res)` fires after a decision. */
  function bindActions(host, onDone) {
    if (!host) return;
    ui.qsa('[data-rv]', host).forEach(function (el) {
      if (el.getAttribute('data-rv-bound')) return;
      el.setAttribute('data-rv-bound', '1');
      el.addEventListener('click', function (e) {
        e.preventDefault();
        decide(el.getAttribute('data-rv'), {
          type: el.getAttribute('data-rv-type'),
          id: el.getAttribute('data-rv-id'),
          title: el.getAttribute('data-rv-title')
        }, onDone);
      });
    });
  }

  /** Open the decision dialog and record the choice against the item. */
  function decide(kind, item, onDone) {
    var cfg = KINDS[kind];
    if (!cfg) return;
    if (!item || !item.id || !item.type) return;
    if (!canReview()) {
      ui.toast({ type: 'error', title: 'Not permitted', message: 'Your role cannot make review decisions.' });
      return;
    }

    var what = noun(item.type);
    var titles = {
      approve: 'Approve ' + what,
      'return': 'Return ' + what + ' for correction',
      reject: 'Reject ' + what
    };

    ui.modal({
      title: titles[kind] || 'Review decision',
      size: 'md',
      body:
        '<p class="muted" style="margin-bottom:14px">' + ui.escapeHtml(item.title || '') + '</p>' +
        '<label class="field"><span class="label">Comments' +
          (cfg.comment ? ' <b style="color:var(--red-600)">*</b>' : ' (optional)') + '</span>' +
        '<textarea id="rv-comment" class="textarea" rows="4" placeholder="' +
          (cfg.comment ? 'Explain your decision\u2026' : 'Add a note for the record\u2026') + '"></textarea></label>',
      actions: [
        { label: 'Cancel', class: 'btn-secondary', onClick: function (h) { h.close(); } },
        {
          label: cfg.confirm,
          class: cfg.btn,
          onClick: function (h) {
            var ta = ui.qs('#rv-comment', h.card);
            var comment = ta ? ta.value.trim() : '';
            if (cfg.comment && comment.length < 3) {
              if (ta) { ta.focus(); ta.style.borderColor = 'var(--red-500)'; }
              ui.toast({ type: 'error', title: 'Comment required', message: 'Please provide a brief reason.' });
              return;
            }
            var buttons = ui.qsa('.modal-foot .btn', h.card);
            buttons.forEach(function (b) { b.disabled = true; });
            LSDS.api.reviews.decide({
              reviewable_type: item.type,
              reviewable_id: Number(item.id),
              decision: cfg.decision,
              comments: comment || null
            }).then(function (res) {
              h.close();
              ui.toast({
                type: 'success',
                title: 'Decision recorded',
                message: (item.title || 'Item') + ' is now ' + statusLabel(res.review_status) + '.'
              });
              if (typeof onDone === 'function') onDone(res);
            }).catch(function (err) {
              buttons.forEach(function (b) { b.disabled = false; });
              ui.toast({ type: 'error', title: 'Could not record decision', message: err.message });
            });
          }
        }
      ]
    });
  }

  LSDS.review = {
    canReview: canReview,
    isPending: isPending,
    statusLabel: statusLabel,
    actionsHtml: actionsHtml,
    bindActions: bindActions,
    decide: decide
  };
})(window, document);
