// guide.js — In-app guidance / interactive tour mode
// Activation (runtime parameter): open the mockup with  ?guide=1  (also accepts
// guide=true or tour=1), e.g.  index.html?guide=1  — works from file://.
// When enabled: a "Guided tour" button appears (and 'G' starts the tour for the
// CURRENT screen). Coachmarks spotlight each UI element with an explanation.
// Esc exits · ← / → navigate. Independent of presenter mode (P / arrow rail).
(function () {
  'use strict';

  // --- Runtime parameter gate ---
  var params = new URLSearchParams(window.location.search);
  var raw = (params.get('guide') || params.get('tour') || '').toLowerCase();
  var ENABLED = raw === '1' || raw === 'true' || raw === 'yes';
  if (!ENABLED) { return; }

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };

  // --- Tour definitions: per-screen, element-level ---
  // Each step: sel (first match wins), title, text. Missing elements are
  // skipped gracefully (e.g. error panel before a blocked submit).
  var TOURS = {
    'worklist': [
      { sel: '.shell-header__nav', title: 'Navigation', text: 'Switch between the work areas. Analysts live in the Worklist; reviewers in the Review Queue; administrators also see Admin and Catalog. In the product, each user only sees the areas their role allows.' },
      { sel: '.shell-header__context', title: 'Period & user', text: 'The quarter you are working in and who you are signed in as. Every action is recorded under this user — including the electronic signature at submission.' },
      { sel: '#kpi-strip', title: 'Status at a glance', text: 'Live counts across your checklists: open, due this week, submitted, completed. The numbers update as checklists move through the workflow.' },
      { sel: '#filter-row', title: 'Filters', text: 'Narrow the list by LOB, Market Segment and status. The segment list cascades from the selected LOB — picking MIC2 offers only MIC2 segments. Whole-LOB CSR checklists show segment "All".' },
      { sel: '#worklist-table', title: 'Your checklists', text: 'One row per checklist instance: type, scope, period, assigned analyst, due date, completion progress, AI flags and status. Status is always shown as text — Not Started, In Progress, Submitted, Under Review, Returned, Completed.' },
      { sel: '#worklist-table .status-chip', title: 'Status chip', text: 'The lifecycle state of this checklist. Completed checklists are locked forever; Returned ones carry the reviewer’s notes back to the analyst.' },
      { sel: '#worklist-table .ai-badge', title: 'AI flags', text: 'Advisory findings from the AI pre-review. They highlight responses worth a second look — they never block anything.' },
      { sel: '#worklist-table tbody tr', title: 'Open a checklist', text: 'Click any row to open the checklist and work on it. Try it after the tour — the In Progress row is a good start.' }
    ],
    'detail': [
      { sel: '.breadcrumb', title: 'Where you are', text: 'Breadcrumb back to the Worklist. Your draft is saved automatically before you leave.' },
      { sel: '#detail-header', title: 'Checklist header', text: 'Scope (type, LOB, segment), period, assigned analyst, due date, the bound catalog version, progress and status. The catalog version pins exactly which questions this quarter answers — the audit trail depends on it.' },
      { sel: '#detail-notes-panel', title: 'Instructions / Notes', text: 'The guidance that used to hide on a separate worksheet tab. Collapsed once you know it; expanded automatically on first open.' },
      { sel: '.procedure-card', title: 'Procedure card', text: 'One card per audit procedure, numbered in order. The indicator on the right shows its state: open, answered, or N/A.' },
      { sel: '.procedure-card__text', title: 'Requirement', text: 'The full requirement text — word for word from your checklist template. Long texts are collapsed to three lines; "Show more" expands them.' },
      { sel: '.example-panel', title: 'Worked example', text: 'The template’s example column, one click away — exactly the help analysts reach for mid-procedure.' },
      { sel: '.response-area, .procedure-card textarea', title: 'Your response (green)', text: 'Describe the procedures you performed — the green field mirrors the template’s green input cells. Drafts autosave as you type.' },
      { sel: '.na-toggle', title: 'Not Applicable', text: 'Where the template explicitly permits N/A, this switch marks the procedure not applicable and disables the response. Where it doesn’t, the switch simply isn’t offered.' },
      { sel: '.attach-area__label, .attach-area__add', title: 'Evidence (yellow)', text: 'Attach supporting files to the exact procedure they evidence — the yellow area mirrors the template’s yellow attachment cells. "Required evidence" must be present before submission; "Optional Attachments" never blocks.' },
      { sel: '#detail-footer .btn--primary', title: 'Sign & Submit', text: 'One click validates everything. Anything incomplete blocks submission with an itemized list; when all requirements are met, the checklist is signed with your user and the server timestamp, then locked.' },
      { sel: '#autosave-pulse', title: 'Autosave', text: 'Every pause in typing saves the draft — no more lost spreadsheet edits, no manual save button.' }
    ],
    'review-queue': [
      { sel: '#review-queue-table', title: 'Submitted checklists', text: 'Everything awaiting review, sorted so the highest AI-flag counts surface first — triage before you open a single one.' },
      { sel: '#review-queue-table .ai-badge', title: 'AI pre-review', text: 'The AI has already read each submission against its requirements and flagged weak spots. Advisory only — the reviewer decides.' },
      { sel: '#review-queue-table tbody tr', title: 'Start a review', text: 'Open a submitted checklist to review it. The checklist moves to Under Review so colleagues see it’s being handled.' }
    ],
    'review-detail': [
      { sel: '#review-header', title: 'Reviewing a submission', text: 'The analyst’s signed submission — who signed, and exactly when (server time). Everything below is read-only for the reviewer.' },
      { sel: '#review-ai-panel', title: 'AI findings', text: 'Advisory flags with severity, each referencing the procedure it concerns — sample sizes that miss the threshold, stale attachments, inconsistent narratives. The AI never approves or rejects; it directs the reviewer’s attention.' },
      { sel: '.ai-panel__disclaimer', title: 'Advisory only', text: 'Stated on the panel itself: AI flags never block submission and nothing is auto-approved. The human reviewer owns the outcome.' },
      { sel: '#review-cards .procedure-card', title: 'Responses & evidence', text: 'The analyst’s responses and attached evidence, procedure by procedure, read-only.' },
      { sel: '#review-footer .btn--danger', title: 'Return to Analyst', text: 'Sends the checklist back with mandatory notes. The analyst sees your notes in a banner, fixes, and resubmits — the full loop is recorded.' },
      { sel: '#review-footer .btn--success', title: 'Complete Review', text: 'Accepts the submission. The checklist becomes Completed — locked permanently as audit evidence.' }
    ],
    'admin': [
      { sel: '#admin-matrix', title: 'Period status matrix', text: 'The whole quarter on one screen: every checklist by LOB and status. The chasing Ray used to do by opening spreadsheets one by one — replaced by a glance.' },
      { sel: '#admin-actions', title: 'Generate next quarter', text: 'One action creates all of next quarter’s checklists from the released question catalog, assigned to the right analysts. The quarterly setup ritual becomes a button.' },
      { sel: '#admin-reassign-table', title: 'Reassign', text: 'Analyst out sick at quarter close? Reassign their checklist here — the work and its history stay intact.' }
    ],
    'catalog': [
      { sel: '.catalog-version-card', title: 'Versioned questions', text: 'The question catalog is versioned. Released versions are frozen forever — every historical checklist stays answerable against exactly the questions it was asked. That’s the audit guarantee.' },
      { sel: '.catalog-version-card:last-child, .catalog-version-card', title: 'Draft for next year', text: 'The annual audit-driven update happens in a Draft copy: edit freely, nothing live is affected until release.' },
      { sel: '#catalog-list .btn--primary', title: 'Release', text: 'Releasing a version sets its valid-from date and locks it. Next quarter’s checklists are generated from it automatically.' }
    ]
  };

  // --- Engine state ---
  var active = false;
  var steps = [];
  var idx = 0;

  // --- DOM: backdrop, spotlight, tip (created once) ---
  var backdrop = document.createElement('div');
  backdrop.className = 'guide-backdrop';
  var spotlight = document.createElement('div');
  spotlight.className = 'guide-spotlight';
  var tip = document.createElement('div');
  tip.className = 'guide-tip';
  tip.setAttribute('role', 'dialog');
  tip.setAttribute('aria-live', 'polite');

  var fab = document.createElement('button');
  fab.className = 'guide-fab';
  fab.id = 'guide-fab';
  fab.innerHTML = '&#9432; Guided tour <span class="guide-fab__key">G</span>';
  fab.addEventListener('click', function () { active ? end() : start(); });

  function currentScreen() {
    var s = $('.screen.active');
    return s ? s.id.replace('screen-', '') : 'worklist';
  }

  function resolveSteps() {
    var defs = TOURS[currentScreen()] || [];
    return defs.filter(function (d) { return !!$(d.sel); });
  }

  function start() {
    steps = resolveSteps();
    if (!steps.length) { return; }
    active = true;
    idx = 0;
    document.body.appendChild(backdrop);
    document.body.appendChild(spotlight);
    document.body.appendChild(tip);
    fab.classList.add('active');
    show();
  }

  function end() {
    active = false;
    [backdrop, spotlight, tip].forEach(function (n) {
      if (n.parentNode) { n.parentNode.removeChild(n); }
    });
    fab.classList.remove('active');
    fab.focus();
  }

  function show() {
    var step = steps[idx];
    var target = $(step.sel);
    if (!target) { return next(); }

    target.scrollIntoView({ block: 'center', behavior: 'instant' in Element.prototype ? 'auto' : 'auto' });

    var r = target.getBoundingClientRect();
    var pad = 8;
    spotlight.style.top = (r.top - pad) + 'px';
    spotlight.style.left = (r.left - pad) + 'px';
    spotlight.style.width = (r.width + pad * 2) + 'px';
    spotlight.style.height = (r.height + pad * 2) + 'px';

    tip.innerHTML =
      '<div class="guide-tip__step">Step ' + (idx + 1) + ' of ' + steps.length + ' — ' + screenLabel() + '</div>' +
      '<div class="guide-tip__title">' + step.title + '</div>' +
      '<div class="guide-tip__text">' + step.text + '</div>' +
      '<div class="guide-tip__footer">' +
        '<span class="guide-tip__hint">Esc to exit</span>' +
        '<span class="guide-tip__btns">' +
          (idx > 0 ? '<button class="btn btn--ghost" data-guide="back">&larr; Back</button>' : '') +
          (idx < steps.length - 1
            ? '<button class="btn btn--primary" data-guide="next">Next &rarr;</button>'
            : '<button class="btn btn--primary" data-guide="done">Done</button>') +
        '</span>' +
      '</div>';

    // Position the tip below or above the spotlight, clamped to viewport
    var vw = window.innerWidth, vh = window.innerHeight;
    var tipW = Math.min(420, vw - 32);
    tip.style.width = tipW + 'px';
    var left = Math.max(16, Math.min(r.left, vw - tipW - 16));
    tip.style.left = left + 'px';
    // measure after width set
    tip.style.top = '0px';
    var tipH = tip.offsetHeight || 180;
    var below = r.bottom + pad + 12;
    if (below + tipH < vh - 16) {
      tip.style.top = below + 'px';
    } else {
      tip.style.top = Math.max(16, r.top - pad - tipH - 12) + 'px';
    }

    var btnNext = tip.querySelector('[data-guide="next"], [data-guide="done"]');
    if (btnNext) { btnNext.addEventListener('click', next); btnNext.focus(); }
    var btnBack = tip.querySelector('[data-guide="back"]');
    if (btnBack) { btnBack.addEventListener('click', back); }
  }

  function screenLabel() {
    var map = {
      'worklist': 'Worklist', 'detail': 'Checklist', 'review-queue': 'Review Queue',
      'review-detail': 'Review', 'admin': 'Administration', 'catalog': 'Catalog'
    };
    return map[currentScreen()] || '';
  }

  function next() {
    if (idx < steps.length - 1) { idx += 1; show(); } else { end(); }
  }
  function back() {
    if (idx > 0) { idx -= 1; show(); }
  }

  // Keyboard: capture phase so presenter-rail arrows don't double-fire
  document.addEventListener('keydown', function (e) {
    if (!active) {
      if ((e.key === 'g' || e.key === 'G') && !/input|textarea|select/i.test(e.target.tagName)) {
        start();
      }
      return;
    }
    if (e.key === 'Escape') { end(); }
    else if (e.key === 'ArrowRight') { next(); }
    else if (e.key === 'ArrowLeft') { back(); }
    else { return; }
    e.stopPropagation();
    e.preventDefault();
  }, true);

  // Reposition on resize; end cleanly if the screen changes under us
  window.addEventListener('resize', function () { if (active) { show(); } });
  var nav = document.querySelectorAll('.shell-header__nav-btn');
  nav.forEach(function (b) { b.addEventListener('click', function () { if (active) { end(); } }); });

  // Mount the FAB once the shell exists
  document.body.appendChild(fab);
})();
