// app.js — CSR Auditing Application interactive mockup
// All phases: Worklist, Detail, Governance (blocked submit / sign / review / return / complete),
// Admin, Catalog teaser, Presenter rail

(function () {
  'use strict';

  // === Deep-clone the initial data so Reset Demo works ===
  let state;
  const INITIAL_JSON = JSON.stringify(DATA.CHECKLISTS);

  function resetState() {
    state = {
      checklists: JSON.parse(INITIAL_JSON),
      filters: { lob: '', status: '', type: '' },
      currentDetail: null,
      currentReview: null,
      presenterActive: false,
      presenterStep: -1,
      tourOverrides: {}
    };
  }

  resetState();

  // === Helpers ===

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => [...(ctx || document).querySelectorAll(sel)];

  function el(tag, attrs, ...children) {
    const e = document.createElement(tag);
    if (attrs) Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'className') e.className = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else e.setAttribute(k, v);
    });
    children.flat().forEach(c => {
      if (c == null) return;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatDateTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) +
      ' (server time)';
  }

  function timeStr() {
    const d = new Date();
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  }

  function statusChip(code) {
    const m = DATA.STATUS_META[code];
    return el('span', { className: `status-chip status-chip--${code}` }, m ? m.label : code);
  }

  function progressPercent(cl) {
    const total = cl.items.length;
    if (!total) return 0;
    const done = cl.items.filter(i => i.response || i.naFlag).length;
    return Math.round((done / total) * 100);
  }

  function aiFlagCount(cl) { return cl.aiFlags ? cl.aiFlags.length : 0; }
  function maxAiSeverity(cl) {
    if (!cl.aiFlags || !cl.aiFlags.length) return 'none';
    return cl.aiFlags.some(f => f.severity === 'High') ? 'high' : 'medium';
  }

  function toast(msg, type) {
    const t = $('#toast');
    t.textContent = msg;
    t.className = 'toast' + (type ? ' toast--' + type : '');
    requestAnimationFrame(() => t.classList.add('visible'));
    setTimeout(() => t.classList.remove('visible'), 3000);
  }

  function showAutosave() {
    const pulse = $('#autosave-pulse');
    $('#autosave-time').textContent = timeStr();
    pulse.classList.add('visible');
    setTimeout(() => pulse.classList.remove('visible'), 2000);
  }

  // === Navigation ===

  function navigate(screen, opts) {
    $$('.screen').forEach(s => s.classList.remove('active'));
    const target = $(`#screen-${screen}`);
    if (target) target.classList.add('active');

    $$('.shell-header__nav-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.nav === screen);
    });

    // hide autosave pulse on non-detail screens
    $('#autosave-pulse').classList.remove('visible');
    $('#detail-footer').innerHTML = '';

    if (screen === 'worklist') renderWorklist();
    else if (screen === 'detail') renderDetail(opts);
    else if (screen === 'review-queue') renderReviewQueue();
    else if (screen === 'review-detail') renderReviewDetail(opts);
    else if (screen === 'admin') renderAdmin();
    else if (screen === 'catalog') renderCatalog();

    window.scrollTo(0, 0);
  }

  // Nav buttons
  document.addEventListener('click', e => {
    const navBtn = e.target.closest('[data-nav]');
    if (navBtn) {
      navigate(navBtn.dataset.nav);
      e.preventDefault();
    }
  });

  // === WORKLIST ===

  function renderWorklist() {
    renderKPIs();
    renderFilters();
    renderWorklistTable();
  }

  function renderKPIs() {
    const cls = state.checklists;
    const open = cls.filter(c => ['NS', 'IP', 'RT'].includes(c.status)).length;
    const now = new Date();
    const weekLater = new Date(now.getTime() + 7 * 86400000);
    const dueThisWeek = cls.filter(c => {
      if (['CP'].includes(c.status)) return false;
      const d = new Date(c.dueDate);
      return d <= weekLater;
    }).length;
    const submitted = cls.filter(c => ['SB', 'UR'].includes(c.status)).length;
    const completed = cls.filter(c => c.status === 'CP').length;

    const strip = $('#kpi-strip');
    strip.innerHTML = '';
    [
      { cls: 'open', value: open, label: 'Open' },
      { cls: 'due', value: dueThisWeek, label: 'Due this week' },
      { cls: 'submitted', value: submitted, label: 'Submitted / Under Review' },
      { cls: 'completed', value: completed, label: 'Completed' }
    ].forEach(k => {
      strip.appendChild(el('div', { className: `kpi-card kpi-card--${k.cls}` },
        el('div', { className: 'kpi-card__value' }, String(k.value)),
        el('div', { className: 'kpi-card__label' }, k.label)
      ));
    });
  }

  function renderFilters() {
    const row = $('#filter-row');
    row.innerHTML = '';

    function makeSelect(label, id, options, value) {
      const grp = el('div', { className: 'filter-group' },
        el('label', { for: id }, label),
      );
      const sel = el('select', { id });
      sel.appendChild(el('option', { value: '' }, 'All'));
      options.forEach(o => {
        const opt = el('option', { value: o.value }, o.label);
        if (o.value === value) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.addEventListener('change', () => {
        state.filters[id.replace('filter-', '')] = sel.value;
        if (id === 'filter-lob') {
          state.filters.seg = '';
        }
        renderWorklistTable();
      });
      grp.appendChild(sel);
      return grp;
    }

    row.appendChild(makeSelect('LOB', 'filter-lob',
      DATA.LOBS.map(l => ({ value: l.lob, label: l.lob })),
      state.filters.lob
    ));

    row.appendChild(makeSelect('Status', 'filter-status',
      Object.entries(DATA.STATUS_META).map(([k, v]) => ({ value: k, label: v.label })),
      state.filters.status
    ));

    row.appendChild(makeSelect('Type', 'filter-type',
      Object.entries(DATA.CHKTYPE_LABELS).map(([k, v]) => ({ value: k, label: v })),
      state.filters.type
    ));
  }

  function filteredChecklists() {
    return state.checklists.filter(c => {
      if (state.filters.lob && c.lob !== state.filters.lob) return false;
      if (state.filters.status && c.status !== state.filters.status) return false;
      if (state.filters.type && c.chktype !== state.filters.type) return false;
      return true;
    });
  }

  function renderWorklistTable() {
    const container = $('#worklist-table');
    const cls = filteredChecklists();

    const table = el('table');
    const thead = el('thead', null, el('tr', null,
      el('th', null, 'Type'),
      el('th', null, 'LOB'),
      el('th', null, 'Segment'),
      el('th', null, 'Period'),
      el('th', null, 'Analyst'),
      el('th', null, 'Due Date'),
      el('th', null, 'Progress'),
      el('th', null, 'AI Flags'),
      el('th', null, 'Status')
    ));
    table.appendChild(thead);

    const tbody = el('tbody');
    cls.forEach(c => {
      const pct = progressPercent(c);
      const flags = aiFlagCount(c);
      const sev = maxAiSeverity(c);

      const tr = el('tr', { className: 'clickable', onClick: () => navigate('detail', { id: c.id }) },
        el('td', null, DATA.CHKTYPE_LABELS[c.chktype] || c.chktype),
        el('td', null, c.lob),
        el('td', null, c.marketSeg === 'ALL' ? 'All' : c.marketSeg),
        el('td', null, c.period),
        el('td', null, c.analyst),
        el('td', null, formatDate(c.dueDate)),
        el('td', null, progressBar(pct)),
        el('td', null, aiBadge(flags, sev)),
        el('td', null, statusChip(c.status))
      );
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    container.innerHTML = '';
    container.appendChild(table);
  }

  function progressBar(pct) {
    return el('div', { className: 'progress-bar' },
      el('div', { className: 'progress-bar__track' },
        el('div', { className: `progress-bar__fill${pct >= 100 ? ' progress-bar__fill--complete' : ''}`, style: { width: pct + '%' } })
      ),
      el('span', { className: 'progress-bar__label' }, pct + '%')
    );
  }

  function aiBadge(count, severity) {
    if (!count) return el('span', { className: 'ai-badge ai-badge--none' }, '—');
    return el('span', { className: `ai-badge ai-badge--${severity}` },
      el('em', { className: 'ai-badge__icon' }, '⚠'),
      String(count)
    );
  }

  // === CHECKLIST DETAIL ===

  function getChecklist(id) { return state.checklists.find(c => c.id === id); }

  function renderDetail(opts) {
    const cl = getChecklist(opts && opts.id || state.currentDetail);
    if (!cl) return navigate('worklist');
    state.currentDetail = cl.id;

    const isReadOnly = ['NS', 'SB', 'UR', 'CP'].includes(cl.status);
    const isReturned = cl.status === 'RT';
    const isSigned = !!cl.signedBy && ['SB', 'UR', 'CP'].includes(cl.status);

    // breadcrumb
    $('#detail-breadcrumb-label').textContent =
      `${DATA.CHKTYPE_LABELS[cl.chktype]} — ${cl.lob} — ${cl.period}`;

    // Return banner
    const bannerEl = $('#detail-return-banner');
    bannerEl.innerHTML = '';
    if (isReturned && cl.reviewNotes) {
      bannerEl.appendChild(el('div', { className: 'return-banner' },
        el('div', { className: 'return-banner__title' }, '⚠ Returned by reviewer'),
        el('div', { className: 'return-banner__notes' }, cl.reviewNotes)
      ));
    }

    // Signed banner
    const signedEl = $('#detail-signed-banner');
    signedEl.innerHTML = '';
    if (isSigned) {
      let txt = `Signed by ${cl.signedBy} · ${formatDateTime(cl.signedAt)}`;
      if (cl.completedBy) txt += `  |  Reviewed by ${cl.completedBy} · ${formatDateTime(cl.completedAt)}`;
      signedEl.appendChild(el('div', { className: 'signed-banner' }, '✓ ' + txt));
    }

    // Header
    renderDetailHeader(cl);

    // Error panel
    $('#detail-error-panel').innerHTML = '';

    // Notes panel
    renderNotesPanel(cl);

    // Procedure cards
    renderProcedureCards(cl, isReadOnly && !isReturned);

    // Footer
    renderDetailFooter(cl, isReadOnly && !isReturned);
  }

  function renderDetailHeader(cl) {
    const pct = progressPercent(cl);
    const circumference = 2 * Math.PI * 23;
    const offset = circumference - (pct / 100) * circumference;

    const header = $('#detail-header');
    header.innerHTML = '';
    header.appendChild(el('div', { className: 'detail-header__row' },
      el('div', { className: 'progress-ring' },
        el('svg', { className: 'progress-ring__svg', width: '56', height: '56', html: `
          <circle class="progress-ring__bg" cx="28" cy="28" r="23"/>
          <circle class="progress-ring__fill${pct >= 100 ? ' progress-ring__fill--complete' : ''}" cx="28" cy="28" r="23"
            stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"/>
        ` }),
        el('div', { className: 'progress-ring__text' }, pct + '%')
      ),
      el('div', { className: 'detail-header__field' },
        el('span', { className: 'detail-header__label' }, 'Type'),
        el('span', { className: 'detail-header__value' }, DATA.CHKTYPE_LABELS[cl.chktype])
      ),
      el('div', { className: 'detail-header__field' },
        el('span', { className: 'detail-header__label' }, 'LOB / Segment'),
        el('span', { className: 'detail-header__value' }, `${cl.lob} / ${cl.marketSeg === 'ALL' ? 'All' : cl.marketSeg}`)
      ),
      el('div', { className: 'detail-header__field' },
        el('span', { className: 'detail-header__label' }, 'Period'),
        el('span', { className: 'detail-header__value' }, cl.period)
      ),
      el('div', { className: 'detail-header__field' },
        el('span', { className: 'detail-header__label' }, 'Analyst'),
        el('span', { className: 'detail-header__value' }, cl.analyst)
      ),
      el('div', { className: 'detail-header__field' },
        el('span', { className: 'detail-header__label' }, 'Due Date'),
        el('span', { className: 'detail-header__value' }, formatDate(cl.dueDate))
      ),
      el('div', { className: 'detail-header__field' },
        el('span', { className: 'detail-header__label' }, 'Catalog Version'),
        el('span', { className: 'detail-header__value' }, cl.catalogVersion)
      ),
      el('div', { className: 'detail-header__field' },
        el('span', { className: 'detail-header__label' }, 'Status'),
        statusChip(cl.status)
      )
    ));
  }

  function renderNotesPanel(cl) {
    const notes = DATA.getNotes(cl.chktype);
    const panel = $('#detail-notes-panel');
    panel.innerHTML = '';

    const collapsible = el('div', { className: 'collapsible' });
    const header = el('button', { className: 'collapsible__header', onClick: () => collapsible.classList.toggle('open') },
      el('span', { className: 'collapsible__title' }, 'Instructions / Notes'),
      el('span', { className: 'collapsible__chevron' }, '▼')
    );
    const body = el('div', { className: 'collapsible__body' });
    notes.forEach(n => {
      body.appendChild(el('p', { style: { marginBottom: '0.75rem', whiteSpace: 'pre-line', fontSize: 'var(--font-size-sm)', lineHeight: '1.6' } },
        n.title ? el('strong', null, n.title + ': ') : null,
        n.text
      ));
    });
    collapsible.appendChild(header);
    collapsible.appendChild(body);
    panel.appendChild(collapsible);
  }

  function renderProcedureCards(cl, readOnly) {
    const container = $('#detail-cards');
    container.innerHTML = '';

    cl.items.forEach((item, idx) => {
      const card = buildProcedureCard(cl, item, idx, readOnly);
      container.appendChild(card);
    });
  }

  function buildProcedureCard(cl, item, idx, readOnly) {
    const cardClass = item.naFlag ? 'na' : (item.response ? 'answered' : 'open');
    const card = el('div', {
      className: `procedure-card procedure-card--${cardClass}`,
      id: `card-${item.questionId}`
    });

    // Header
    const indicatorClass = item.naFlag ? 'na' : (item.response ? 'answered' : 'open');
    const indicatorLabel = item.naFlag ? 'N/A' : (item.response ? '✓ Answered' : 'Open');
    card.appendChild(el('div', { className: 'procedure-card__header' },
      el('div', { className: 'procedure-card__number' },
        el('span', { className: 'procedure-card__seq' }, `#${idx + 1}`),
        el('span', { className: 'procedure-card__title' }, item.title)
      ),
      el('span', { className: `procedure-card__indicator procedure-card__indicator--${indicatorClass}` }, indicatorLabel)
    ));

    // Body
    const body = el('div', { className: 'procedure-card__body' });

    // Requirement text (clamped)
    const textEl = el('div', { className: 'procedure-card__text clamped' }, item.text);
    body.appendChild(textEl);

    const showMore = el('button', { className: 'show-more-btn', onClick: () => {
      textEl.classList.toggle('expanded');
      showMore.textContent = textEl.classList.contains('expanded') ? 'Show less' : 'Show more';
    } }, 'Show more');
    body.appendChild(showMore);

    // Example panel
    if (item.example) {
      const exPanel = el('div', { className: 'example-panel' });
      const exHeader = el('button', { className: 'example-panel__header', onClick: () => exPanel.classList.toggle('open') },
        '▶ Worked example'
      );
      const exBody = el('div', { className: 'example-panel__body' }, item.example);
      exPanel.appendChild(exHeader);
      exPanel.appendChild(exBody);
      body.appendChild(exPanel);
    }

    // N/A toggle (only if allowed)
    if (item.naAllowed) {
      const naToggle = el('div', { className: 'na-toggle' });
      const sw = el('button', {
        className: `na-toggle__switch${item.naFlag ? ' active' : ''}`,
        onClick: () => {
          if (readOnly) return;
          item.naFlag = !item.naFlag;
          if (item.naFlag) item.response = '';
          item.status = item.naFlag ? 'na' : (item.response ? 'answered' : 'open');
          renderDetail({ id: cl.id });
          triggerAutosave();
        }
      });
      naToggle.appendChild(sw);
      naToggle.appendChild(el('span', { className: 'na-toggle__label' }, 'Not Applicable'));
      if (readOnly) sw.disabled = true;
      body.appendChild(naToggle);
    }

    // Response textarea
    const respArea = el('div', { className: 'response-area' });
    respArea.appendChild(el('label', null, 'Description of Procedures Performed'));
    const textarea = el('textarea', {
      value: item.response || '',
      placeholder: readOnly ? '' : 'Describe the procedures you performed…'
    });
    textarea.value = item.response || '';
    if (readOnly || item.naFlag) {
      textarea.disabled = true;
      if (readOnly && item.response) textarea.classList.add('readonly');
    }

    let autosaveTimer = null;
    textarea.addEventListener('input', () => {
      item.response = textarea.value;
      item.status = item.response ? 'answered' : 'open';
      clearTimeout(autosaveTimer);
      autosaveTimer = setTimeout(() => {
        triggerAutosave();
        updateCardState(card, item);
        renderDetailHeader(cl);
      }, 800);
    });
    respArea.appendChild(textarea);
    body.appendChild(respArea);

    // Attachment area
    if (item.attachMode === 'O' || item.attachMode === 'R') {
      const attachArea = el('div', { className: `attach-area${item.attachMode === 'R' ? ' attach-area--required' : ''}` });
      attachArea.appendChild(el('div', { className: 'attach-area__label' },
        item.attachMode === 'R' ? 'Required evidence' : 'Optional Attachments'));

      const chipsContainer = el('div', { className: 'attach-area__chips' });
      (item.attachments || []).forEach((fname, fi) => {
        const chip = el('span', { className: 'attach-chip' },
          fname,
          readOnly ? null : el('button', { className: 'attach-chip__remove', onClick: () => {
            item.attachments.splice(fi, 1);
            renderDetail({ id: cl.id });
            triggerAutosave();
          } }, '×')
        );
        chipsContainer.appendChild(chip);
      });
      attachArea.appendChild(chipsContainer);

      if (!readOnly) {
        const fakeNames = [
          'LOB_MAO_consolidated.xlsx', 'Market_Segment_source.pptx',
          'KKA2_evidence.pdf', 'EBIT_analysis.xlsx', 'email_archive.zip',
          'random_selection_evidence.png', 'FPA_Template_Q3.xlsx'
        ];
        attachArea.appendChild(el('button', { className: 'attach-area__add', onClick: () => {
          if (!item.attachments) item.attachments = [];
          const name = fakeNames[item.attachments.length % fakeNames.length];
          item.attachments.push(name);
          renderDetail({ id: cl.id });
          triggerAutosave();
        } }, '+ Add file'));
      }

      body.appendChild(attachArea);
    }

    card.appendChild(body);
    return card;
  }

  function updateCardState(card, item) {
    card.className = `procedure-card procedure-card--${item.naFlag ? 'na' : (item.response ? 'answered' : 'open')}`;
    const indicator = card.querySelector('.procedure-card__indicator');
    if (indicator) {
      const cls = item.naFlag ? 'na' : (item.response ? 'answered' : 'open');
      indicator.className = `procedure-card__indicator procedure-card__indicator--${cls}`;
      indicator.textContent = item.naFlag ? 'N/A' : (item.response ? '✓ Answered' : 'Open');
    }
  }

  function triggerAutosave() {
    showAutosave();
  }

  function renderDetailFooter(cl, readOnly) {
    const footer = $('#detail-footer');
    footer.innerHTML = '';

    if (cl.status === 'IP' || cl.status === 'RT' || cl.status === 'NS') {
      footer.appendChild(el('div'));
      footer.appendChild(
        el('button', {
          className: 'btn btn--primary',
          onClick: () => attemptSubmit(cl)
        }, '✎ Sign & Submit')
      );
    }
  }

  // === GOVERNANCE: Blocked Submit + Sign ===

  function attemptSubmit(cl) {
    const errors = [];
    cl.items.forEach(item => {
      if (item.respRequired && !item.response && !item.naFlag) {
        errors.push({ type: 'response', questionId: item.questionId, title: item.title });
      }
      if (item.attachMode === 'R' && (!item.attachments || !item.attachments.length) && !item.naFlag) {
        errors.push({ type: 'attach', questionId: item.questionId, title: item.title });
      }
    });

    if (errors.length) {
      showBlockedSubmit(cl, errors);
      return;
    }

    performSign(cl);
  }

  function showBlockedSubmit(cl, errors) {
    const panel = $('#detail-error-panel');
    panel.innerHTML = '';

    const errorPanel = el('div', { className: 'error-panel animate-in' });
    errorPanel.appendChild(el('div', { className: 'error-panel__title' },
      `⛔ Submission blocked — ${errors.length} item${errors.length > 1 ? 's' : ''} require attention`));

    const list = el('ul', { className: 'error-panel__list' });
    errors.forEach(err => {
      const label = err.type === 'response'
        ? `Response required: ${err.title}`
        : `Required evidence missing: ${err.title}`;
      list.appendChild(el('li', { className: 'error-panel__item', onClick: () => {
        const card = $(`#card-${err.questionId}`);
        if (card) {
          card.classList.add('procedure-card--error');
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => card.classList.remove('procedure-card--error'), 3000);
        }
      } }, '• ' + label));
    });
    errorPanel.appendChild(list);
    panel.appendChild(errorPanel);
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Mark error state on cards
    cl.items.forEach(item => {
      const card = $(`#card-${item.questionId}`);
      if (!card) return;
      const hasError = errors.some(e => e.questionId === item.questionId);
      card.classList.toggle('procedure-card--error', hasError);
    });
  }

  function performSign(cl) {
    // Clear errors
    $('#detail-error-panel').innerHTML = '';
    cl.items.forEach(item => {
      const card = $(`#card-${item.questionId}`);
      if (card) card.classList.remove('procedure-card--error');
    });

    // Show signing overlay
    const overlay = $('#signing-overlay');
    overlay.classList.add('visible');

    setTimeout(() => {
      overlay.classList.remove('visible');
      cl.status = 'SB';
      cl.signedBy = 'J. Doe';
      cl.signedAt = new Date().toISOString();
      renderDetail({ id: cl.id });
      toast('Checklist signed and submitted successfully', 'success');
    }, 1500);
  }

  // === REVIEW QUEUE ===

  function renderReviewQueue() {
    const container = $('#review-queue-table');
    const reviewable = state.checklists.filter(c => ['SB', 'UR'].includes(c.status));
    reviewable.sort((a, b) => aiFlagCount(b) - aiFlagCount(a));

    const table = el('table');
    table.appendChild(el('thead', null, el('tr', null,
      el('th', null, 'Type'),
      el('th', null, 'LOB'),
      el('th', null, 'Analyst'),
      el('th', null, 'Submitted'),
      el('th', null, 'AI Flags'),
      el('th', null, 'Status')
    )));

    const tbody = el('tbody');
    reviewable.forEach(c => {
      const flags = aiFlagCount(c);
      const sev = maxAiSeverity(c);
      tbody.appendChild(el('tr', { className: 'clickable', onClick: () => {
        c.status = 'UR';
        navigate('review-detail', { id: c.id });
      } },
        el('td', null, DATA.CHKTYPE_LABELS[c.chktype]),
        el('td', null, c.lob),
        el('td', null, c.analyst),
        el('td', null, formatDateTime(c.signedAt)),
        el('td', null, aiBadge(flags, sev)),
        el('td', null, statusChip(c.status))
      ));
    });
    table.appendChild(tbody);

    container.innerHTML = '';
    if (!reviewable.length) {
      container.appendChild(el('div', { style: { padding: '2rem', textAlign: 'center', color: 'var(--ink-tertiary)' } }, 'No checklists awaiting review.'));
    } else {
      container.appendChild(table);
    }
  }

  // === REVIEW DETAIL ===

  function renderReviewDetail(opts) {
    const cl = getChecklist(opts && opts.id || state.currentReview);
    if (!cl) return navigate('review-queue');
    state.currentReview = cl.id;

    $('#review-breadcrumb-label').textContent =
      `${DATA.CHKTYPE_LABELS[cl.chktype]} — ${cl.lob} — ${cl.analyst}`;

    // Header (reuse detail header structure)
    renderReviewHeader(cl);

    // AI panel
    renderAIPanel(cl);

    // Cards (read-only)
    renderReviewCards(cl);

    // Footer
    renderReviewFooter(cl);
  }

  function renderReviewHeader(cl) {
    const pct = progressPercent(cl);
    const header = $('#review-header');
    header.innerHTML = '';
    header.appendChild(el('div', { className: 'detail-header__row' },
      el('div', { className: 'detail-header__field' },
        el('span', { className: 'detail-header__label' }, 'Analyst'),
        el('span', { className: 'detail-header__value' }, cl.analyst)
      ),
      el('div', { className: 'detail-header__field' },
        el('span', { className: 'detail-header__label' }, 'Signed'),
        el('span', { className: 'detail-header__value' }, formatDateTime(cl.signedAt))
      ),
      el('div', { className: 'detail-header__field' },
        el('span', { className: 'detail-header__label' }, 'Type'),
        el('span', { className: 'detail-header__value' }, DATA.CHKTYPE_LABELS[cl.chktype])
      ),
      el('div', { className: 'detail-header__field' },
        el('span', { className: 'detail-header__label' }, 'LOB'),
        el('span', { className: 'detail-header__value' }, cl.lob)
      ),
      el('div', { className: 'detail-header__field' },
        el('span', { className: 'detail-header__label' }, 'Status'),
        statusChip(cl.status)
      )
    ));
  }

  function renderAIPanel(cl) {
    const container = $('#review-ai-panel');
    container.innerHTML = '';

    if (!cl.aiFlags || !cl.aiFlags.length) return;

    const panel = el('div', { className: 'ai-panel' });
    panel.appendChild(el('div', { className: 'ai-panel__header' },
      el('div', { className: 'ai-panel__title' }, '⚙ AI Pre-Review Findings'),
      el('div', { className: 'ai-panel__disclaimer' }, 'Advisory only — never blocks submission')
    ));

    cl.aiFlags.forEach(flag => {
      panel.appendChild(el('div', { className: `ai-flag ai-flag--${flag.severity}` },
        el('span', { className: 'ai-flag__severity' }, flag.severity),
        el('span', { className: 'ai-flag__text' }, flag.text)
      ));
    });
    container.appendChild(panel);
  }

  function renderReviewCards(cl) {
    const container = $('#review-cards');
    container.innerHTML = '';
    cl.items.forEach((item, idx) => {
      container.appendChild(buildProcedureCard(cl, item, idx, true));
    });
  }

  function renderReviewFooter(cl) {
    const footer = $('#review-footer');
    footer.innerHTML = '';

    if (cl.status !== 'CP') {
      footer.appendChild(
        el('button', { className: 'btn btn--danger', onClick: () => showReturnDialog(cl) }, '↩ Return to Analyst')
      );
      footer.appendChild(
        el('button', { className: 'btn btn--success', onClick: () => completeReview(cl) }, '✓ Complete Review')
      );
    } else {
      footer.appendChild(el('div', { className: 'signed-banner', style: { width: '100%' } },
        `✓ Review completed by ${cl.completedBy || 'Reviewer'} · ${formatDateTime(cl.completedAt)}`
      ));
    }
  }

  function showReturnDialog(cl) {
    const modal = $('#modal');
    modal.innerHTML = '';
    modal.appendChild(el('div', { className: 'modal__title' }, 'Return to Analyst'));
    const body = el('div', { className: 'modal__body' });
    body.appendChild(el('p', { style: { marginBottom: '0.5rem', fontSize: 'var(--font-size-sm)', color: 'var(--ink-secondary)' } }, 'Notes are required. Explain what needs to be corrected.'));
    const textarea = el('textarea', { placeholder: 'Enter review notes…' });
    body.appendChild(textarea);
    modal.appendChild(body);

    const footer = el('div', { className: 'modal__footer' });
    footer.appendChild(el('button', { className: 'btn btn--secondary', onClick: closeModal }, 'Cancel'));
    footer.appendChild(el('button', { className: 'btn btn--danger', onClick: () => {
      if (!textarea.value.trim()) {
        textarea.classList.add('error');
        return;
      }
      cl.status = 'RT';
      cl.reviewNotes = textarea.value.trim();
      closeModal();
      toast('Checklist returned to analyst', 'error');
      navigate('review-queue');
    } }, 'Return'));
    modal.appendChild(footer);

    $('#modal-overlay').classList.add('visible');
  }

  function completeReview(cl) {
    cl.status = 'CP';
    cl.completedBy = 'P. Knowles';
    cl.completedAt = new Date().toISOString();
    renderReviewDetail({ id: cl.id });
    toast('Review completed successfully', 'success');
  }

  function closeModal() {
    $('#modal-overlay').classList.remove('visible');
  }

  // Close modal on overlay click
  $('#modal-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });

  // === ADMIN ===

  function renderAdmin() {
    renderAdminMatrix();
    renderAdminActions();
    renderAdminReassign();
  }

  function renderAdminMatrix() {
    const container = $('#admin-matrix');
    const statuses = ['NS', 'IP', 'SB', 'UR', 'RT', 'CP'];
    const cls = state.checklists;

    const table = el('table');
    const thead = el('thead', null, el('tr', null,
      el('th', null, 'LOB'),
      ...statuses.map(s => el('th', null, DATA.STATUS_META[s].label))
    ));
    table.appendChild(thead);

    const tbody = el('tbody');
    DATA.LOBS.forEach(lob => {
      const row = el('tr',null,
        el('td', { className: 'lob-label' }, lob.lob)
      );
      statuses.forEach(s => {
        const count = cls.filter(c => c.lob === lob.lob && c.status === s).length;
        row.appendChild(el('td', { className: 'count' }, String(count)));
      });
      tbody.appendChild(row);
    });

    // Totals row
    const totals = el('tr', null, el('td', { className: 'lob-label' }, 'Total'));
    statuses.forEach(s => {
      const count = cls.filter(c => c.status === s).length;
      totals.appendChild(el('td', { className: 'count', style: { fontWeight: '700' } }, String(count)));
    });
    tbody.appendChild(totals);

    table.appendChild(tbody);
    container.innerHTML = '';
    container.appendChild(table);
  }

  function renderAdminActions() {
    const container = $('#admin-actions');
    container.innerHTML = '';

    container.appendChild(el('button', { className: 'btn btn--primary', onClick: () => {
      // Simulate generating Q4 checklists
      const newCls = DATA.LOBS.map((lob, i) => ({
        id: 'CL_Q4_' + lob.lob,
        chktype: i < 2 ? 'CSRL' : 'QCLL',
        lob: lob.lob,
        marketSeg: 'ALL',
        period: '2026/Q4',
        analyst: '',
        reviewer: '',
        dueDate: '2027-02-01',
        status: 'NS',
        catalogVersion: '0001',
        signedBy: '',
        signedAt: '',
        reviewNotes: '',
        aiFlags: [],
        items: []
      }));
      newCls.forEach(c => {
        if (!state.checklists.find(x => x.id === c.id)) {
          state.checklists.push(c);
        }
      });
      toast(`Generated ${newCls.length} Q4 checklists`, 'success');
      renderAdminMatrix();
    } }, 'Generate Q4 Checklists'));
  }

  function renderAdminReassign() {
    const container = $('#admin-reassign-table');
    container.innerHTML = '';

    const analysts = ['Sarah Chen', 'Michael Torres', 'Jennifer Park', 'David Williams', 'Emily Rodriguez', 'James Morrison', 'Rachel Kim'];
    const activeCls = state.checklists.filter(c => !['CP'].includes(c.status) && c.period === '2026/Q3');

    const table = el('table');
    table.appendChild(el('thead', null, el('tr', null,
      el('th', null, 'Checklist'),
      el('th', null, 'LOB'),
      el('th', null, 'Current Analyst'),
      el('th', null, 'Reassign To'),
      el('th', null, 'Action')
    )));

    const tbody = el('tbody');
    activeCls.forEach(c => {
      const sel = el('select', { className: 'reassign-select' });
      sel.appendChild(el('option', { value: '' }, '(select)'));
      analysts.filter(a => a !== c.analyst).forEach(a => {
        sel.appendChild(el('option', { value: a }, a));
      });

      tbody.appendChild(el('tr', null,
        el('td', null, DATA.CHKTYPE_LABELS[c.chktype]),
        el('td', null, c.lob),
        el('td', null, c.analyst || '—'),
        el('td', null, sel),
        el('td', null, el('button', { className: 'btn btn--ghost', onClick: () => {
          if (sel.value) {
            c.analyst = sel.value;
            toast(`Reassigned to ${sel.value}`, 'success');
            renderAdminReassign();
          }
        } }, 'Reassign'))
      ));
    });
    table.appendChild(tbody);
    container.appendChild(table);
  }

  // === CATALOG ===

  function renderCatalog() {
    const container = $('#catalog-list');
    container.innerHTML = '';

    DATA.CATALOG_VERSIONS.forEach(v => {
      const card = el('div', { className: 'catalog-version-card' },
        el('div', { className: 'catalog-version-card__info' },
          el('span', { className: `version-chip version-chip--${v.status}` }, v.status),
          el('div', null,
            el('div', { style: { fontWeight: '700', marginBottom: '2px' } }, `Version ${v.version}`),
            el('div', { style: { fontSize: 'var(--font-size-sm)', color: 'var(--ink-secondary)' } },
              v.status === 'Released'
                ? `Valid from ${formatDate(v.validFrom)} · ${v.questionCount} questions · Released by ${v.releasedBy}`
                : `${v.questionCount} questions · Draft`
            )
          )
        ),
        el('div', { style: { display: 'flex', gap: '0.5rem' } },
          v.status === 'Draft'
            ? [
              el('button', { className: 'btn btn--ghost', onClick: () => toast('Edit mode would open here', '') }, 'Edit'),
              el('button', { className: 'btn btn--primary', onClick: () => showReleaseDialog(v) }, 'Release version…')
            ]
            : el('button', { className: 'btn btn--ghost', onClick: () => toast('View-only mode for released versions', '') }, 'View')
        )
      );
      container.appendChild(card);
    });

    // Questions preview
    const preview = el('div', { className: 'collapsible mt-lg', style: { marginTop: '1.5rem' } });
    preview.appendChild(el('button', { className: 'collapsible__header', onClick: () => preview.classList.toggle('open') },
      el('span', { className: 'collapsible__title' }, 'Question Catalog Preview (Version 0001)'),
      el('span', { className: 'collapsible__chevron' }, '▼')
    ));
    const previewBody = el('div', { className: 'collapsible__body' });
    const procedures = DATA.CATALOG.filter(c => c.inptype === 'I');
    procedures.forEach(p => {
      previewBody.appendChild(el('div', { style: { padding: '0.75rem 0', borderBottom: '1px solid var(--border-color)' } },
        el('div', { style: { fontWeight: '700', marginBottom: '2px' } }, `${p.id}: ${p.title}`),
        el('div', { style: { fontSize: 'var(--font-size-sm)', color: 'var(--ink-secondary)' } },
          `${DATA.CHKTYPE_LABELS[p.chktype]} · Seq ${p.seqnr} · Resp required: ${p.respRequired ? 'Yes' : 'No'} · Attach: ${p.attachMode}`)
      ));
    });
    preview.appendChild(previewBody);
    container.appendChild(preview);
  }

  function showReleaseDialog(v) {
    const modal = $('#modal');
    modal.innerHTML = '';
    modal.appendChild(el('div', { className: 'modal__title' }, `Release Version ${v.version}`));

    const body = el('div', { className: 'modal__body' });
    body.appendChild(el('p', { style: { marginBottom: '0.75rem' } },
      `This will release version ${v.version} with ${v.questionCount} questions. Released versions are immutable and will be used for all future checklist generation.`));
    body.appendChild(el('label', { style: { display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: '700', marginBottom: '4px' } }, 'Valid From'));
    const dateInput = el('input', { type: 'date', value: '2027-01-01', style: {
      fontFamily: 'var(--font-family)', fontSize: 'var(--font-size-md)',
      padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', width: '100%'
    } });
    body.appendChild(dateInput);
    modal.appendChild(body);

    const footer = el('div', { className: 'modal__footer' });
    footer.appendChild(el('button', { className: 'btn btn--secondary', onClick: closeModal }, 'Cancel'));
    footer.appendChild(el('button', { className: 'btn btn--primary', onClick: () => {
      v.status = 'Released';
      v.validFrom = dateInput.value;
      v.releasedBy = 'Admin';
      v.releasedAt = new Date().toISOString();
      closeModal();
      toast(`Version ${v.version} released`, 'success');
      renderCatalog();
    } }, 'Release'));
    modal.appendChild(footer);

    $('#modal-overlay').classList.add('visible');
  }

  // === PRESENTER RAIL ===

  function togglePresenter() {
    state.presenterActive = !state.presenterActive;
    $('#presenter-rail').classList.toggle('active', state.presenterActive);
    if (state.presenterActive && state.presenterStep < 0) {
      state.presenterStep = 0;
      executePresenterStep();
    }
    // Adjust footer for rail
    document.body.style.paddingBottom = state.presenterActive ? '48px' : '0';
  }

  function executePresenterStep() {
    const steps = DATA.TOUR_STEPS;
    const step = steps[state.presenterStep];
    if (!step) return;

    $('#presenter-caption').textContent = step.caption;
    $('#presenter-step').textContent = `${state.presenterStep + 1} / ${steps.length}`;
    $('#presenter-prev').disabled = state.presenterStep === 0;
    $('#presenter-next').disabled = state.presenterStep >= steps.length - 1;

    // Navigate to the right screen
    if (step.screen === 'worklist') {
      navigate('worklist');
    } else if (step.screen === 'detail') {
      if (step.action === 'fill') {
        // Auto-fill the remaining empty items on CL002
        const cl = getChecklist(step.target);
        if (cl && cl.status === 'IP') {
          cl.items.forEach((item, i) => {
            if (!item.response && !item.naFlag && i >= 2) {
              if (item.naAllowed) {
                item.naFlag = true;
                item.status = 'na';
              }
            }
          });
        }
        navigate('detail', { id: step.target });
      } else if (step.action === 'blocked-submit') {
        // Force incomplete state and trigger submit
        const cl = getChecklist(step.target);
        if (cl) {
          // Ensure some items are incomplete for the demo
          const emptyItems = cl.items.filter(i => !i.response && !i.naFlag);
          navigate('detail', { id: step.target });
          if (emptyItems.length) {
            setTimeout(() => attemptSubmit(cl), 500);
          }
        }
      } else if (step.action === 'fix-and-submit') {
        const cl = getChecklist(step.target);
        if (cl) {
          // Fill all remaining items
          cl.items.forEach(item => {
            if (!item.response && !item.naFlag) {
              if (item.naAllowed) {
                item.naFlag = true;
                item.status = 'na';
              } else {
                item.response = 'Procedures performed as documented. All required evidence attached and verified against source documentation.';
                item.status = 'answered';
                if (item.attachMode !== 'N' && (!item.attachments || !item.attachments.length)) {
                  item.attachments = ['supporting_evidence.pdf'];
                }
              }
            }
          });
          navigate('detail', { id: step.target });
          setTimeout(() => attemptSubmit(cl), 500);
        }
      } else {
        navigate('detail', { id: step.target });
      }
    } else if (step.screen === 'review-queue') {
      navigate('review-queue');
    } else if (step.screen === 'review-detail') {
      if (step.action === 'return') {
        const cl = getChecklist(step.target);
        if (cl) {
          navigate('review-detail', { id: step.target });
          setTimeout(() => {
            // Auto-fill return notes
            cl.status = 'RT';
            cl.reviewNotes = 'Procedure 1 (CSRL-P01): Sample size appears to be 7.7% (4 of 52), below the required 10% minimum. Please review the sample count and either add additional line items or provide justification.\n\nProcedure 3 (CSRL-P03): The attached De-books file references a previous quarter. Please confirm the file is for Q3 2026.';
            toast('Checklist returned to analyst', 'error');
            navigate('review-queue');
          }, 1500);
        }
      } else if (step.action === 'complete') {
        navigate('review-detail', { id: step.target });
        setTimeout(() => {
          const cl = getChecklist(step.target);
          if (cl) completeReview(cl);
        }, 1000);
      } else {
        navigate('review-detail', { id: step.target });
      }
    } else if (step.screen === 'admin') {
      navigate('admin');
    } else if (step.screen === 'catalog') {
      navigate('catalog');
    }
  }

  // Keyboard controls
  document.addEventListener('keydown', e => {
    if (e.key === 'p' || e.key === 'P') {
      if (document.activeElement && (document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'INPUT')) return;
      togglePresenter();
    }
    if (!state.presenterActive) return;

    if (e.key === 'ArrowRight' || e.key === 'Right') {
      e.preventDefault();
      if (state.presenterStep < DATA.TOUR_STEPS.length - 1) {
        state.presenterStep++;
        executePresenterStep();
      }
    } else if (e.key === 'ArrowLeft' || e.key === 'Left') {
      e.preventDefault();
      if (state.presenterStep > 0) {
        state.presenterStep--;
        executePresenterStep();
      }
    } else if (e.key === 'Escape') {
      togglePresenter();
    }
  });

  // Presenter rail buttons
  $('#presenter-prev').addEventListener('click', () => {
    if (state.presenterStep > 0) {
      state.presenterStep--;
      executePresenterStep();
    }
  });

  $('#presenter-next').addEventListener('click', () => {
    if (state.presenterStep < DATA.TOUR_STEPS.length - 1) {
      state.presenterStep++;
      executePresenterStep();
    }
  });

  // === Corner Menu ===

  $('#corner-menu-btn').addEventListener('click', () => {
    $('#corner-menu-dropdown').classList.toggle('visible');
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('#corner-menu')) {
      $('#corner-menu-dropdown').classList.remove('visible');
    }
  });

  $('#btn-reset-demo').addEventListener('click', () => {
    resetState();
    state.presenterActive = false;
    state.presenterStep = -1;
    $('#presenter-rail').classList.remove('active');
    document.body.style.paddingBottom = '0';
    navigate('worklist');
    toast('Demo reset to initial state', '');
    $('#corner-menu-dropdown').classList.remove('visible');
  });

  $('#btn-toggle-presenter').addEventListener('click', () => {
    togglePresenter();
    $('#corner-menu-dropdown').classList.remove('visible');
  });

  // === Init ===

  navigate('worklist');

})();
