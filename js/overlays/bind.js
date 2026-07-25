/**
 * bind.js — Selective print/bind picker.
 * Tree UI rooted at the current notebook's subject. Toggle checkboxes to include
 * only chosen sections/chapters/topics/subtopics/passages in the print output.
 * Checking a parent auto-checks descendants; the print dims everything unchecked.
 */
window.NBBind = (() => {
  const state = new Map(); // node/passage -> boolean

  function build(el) {
    const root = NBPassages.getRootNode();
    const nb = NBPassages.getCurrentNotebook();
    if (!root || !nb) {
      el.innerHTML = '<div class="fl-overlay-card"><div class="fl-overlay-inner"></div><div style="padding:80px;text-align:center;">No notebook loaded.</div></div>';
      return;
    }

    state.clear();
    seedState(root, true); // default: everything checked

    el.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'fl-overlay-card';
    card.innerHTML =
      '<div class="fl-overlay-inner"></div>' +
      '<div class="fl-overlay-head">' +
        '<div class="fl-overlay-head-title">Bind — pick what to print</div>' +
        '<div class="fl-overlay-ctrls">' +
          '<button class="fl-btn" data-act="all">All</button>' +
          '<button class="fl-btn" data-act="none">None</button>' +
          '<button class="fl-btn solid" data-act="bind">Bind ⤓</button>' +
          '<button class="fl-btn" data-act="close">Close</button>' +
        '</div>' +
      '</div>' +
      '<div class="bind-body">' +
        '<div class="bind-subhead">' + escapeHTML(nb.subject || '') + '</div>' +
        '<div class="bind-tree" id="bind-tree"></div>' +
        '<div class="bind-hint" id="bind-hint"></div>' +
      '</div>';
    el.appendChild(card);

    const treeHost = card.querySelector('#bind-tree');
    treeHost.appendChild(renderBranch(root, 0));
    updateHint();

    card.querySelector('[data-act="all"]').onclick   = () => setAll(true);
    card.querySelector('[data-act="none"]').onclick  = () => setAll(false);
    card.querySelector('[data-act="close"]').onclick = () => close(el);
    card.querySelector('[data-act="bind"]').onclick  = () => doBind(el);
  }

  function seedState(node, on) {
    state.set(node, on);
    for (const p of node.passages || []) state.set(p, on);
    for (const c of node.children || []) seedState(c, on);
  }

  function renderBranch(node, depth) {
    const wrap = document.createElement('div');
    wrap.className = 'bind-node depth-' + depth;

    const row = document.createElement('div');
    row.className = 'bind-row';
    row.style.paddingLeft = (depth * 18) + 'px';

    const hasChildren = (node.children && node.children.length) || (node.passages && node.passages.length);
    const caret = document.createElement('span');
    caret.className = 'bind-caret';
    caret.textContent = hasChildren ? '▶' : '·';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!state.get(node);
    cb.className = 'bind-cb';

    const label = document.createElement('span');
    label.className = 'bind-label';
    const kindLabel = node.kind === 'notebook' ? 'Notebook' : NBPassages.getLevelLabel(node.kind);
    label.innerHTML =
      '<span class="bind-kind">' + escapeHTML(kindLabel) + '</span>' +
      '<span class="bind-title">' + escapeHTML(node.title) + '</span>';

    row.appendChild(caret);
    row.appendChild(cb);
    row.appendChild(label);
    wrap.appendChild(row);

    const kidsHost = document.createElement('div');
    kidsHost.className = 'bind-kids' + (depth === 0 ? ' open' : '');
    if (hasChildren) {
      for (const p of node.passages || []) kidsHost.appendChild(renderPassage(p, depth + 1));
      for (const c of node.children || []) kidsHost.appendChild(renderBranch(c, depth + 1));
    }
    wrap.appendChild(kidsHost);

    const toggleOpen = () => {
      if (!hasChildren) return;
      const open = kidsHost.classList.toggle('open');
      caret.classList.toggle('open', open);
    };
    caret.onclick = toggleOpen;
    label.onclick = toggleOpen;

    cb.onchange = () => {
      const on = cb.checked;
      state.set(node, on);
      cascade(node, on, wrap);
      updateHint();
    };

    return wrap;
  }

  function renderPassage(pm, depth) {
    const row = document.createElement('div');
    row.className = 'bind-row bind-leaf';
    row.style.paddingLeft = (depth * 18) + 'px';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!state.get(pm);
    cb.className = 'bind-cb';

    const label = document.createElement('span');
    label.className = 'bind-label';
    label.innerHTML =
      '<span class="bind-kind">№' + escapeHTML(String(pm.no)) + '</span>' +
      '<span class="bind-title">' + escapeHTML(pm.title) + '</span>';

    row.appendChild(document.createElement('span')); // spacer for caret column
    row.appendChild(cb);
    row.appendChild(label);

    cb.onchange = () => { state.set(pm, cb.checked); updateHint(); };
    label.onclick = () => { cb.checked = !cb.checked; cb.dispatchEvent(new Event('change')); };

    return row;
  }

  function cascade(node, on, dom) {
    seedState(node, on);
    for (const cb of dom.querySelectorAll('input.bind-cb')) cb.checked = on;
  }

  function setAll(on) {
    const root = NBPassages.getRootNode();
    if (!root) return;
    seedState(root, on);
    for (const cb of document.querySelectorAll('#bind-tree input.bind-cb')) cb.checked = on;
    updateHint();
  }

  function selectedPassages() {
    return NBPassages.getAllPassages().filter(p => state.get(p));
  }

  function updateHint() {
    const hint = document.getElementById('bind-hint');
    if (!hint) return;
    const n = selectedPassages().length;
    hint.textContent = n === 0
      ? 'Nothing selected — Bind will print an empty page.'
      : n + ' passage' + (n === 1 ? '' : 's') + ' will be bound.';
  }

  function doBind(overlayEl) {
    const chosen = new Set(selectedPassages().map(p => p.id));

    // Mark unselected articles as hidden for print, then trigger print,
    // then restore. Reveal-animation elements must be forced visible for print.
    const hidden = [];
    document.querySelectorAll('article').forEach(a => {
      if (!chosen.has(a.id)) {
        a.classList.add('nb-print-hide');
        hidden.push(a);
      }
    });
    document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('seen'));

    close(overlayEl);
    setTimeout(() => {
      window.print();
      // Clean up after the print dialog closes / on next tick
      setTimeout(() => hidden.forEach(a => a.classList.remove('nb-print-hide')), 300);
    }, 120);
  }

  function close(el) { el.style.display = 'none'; }

  function escapeHTML(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  return { build };
})();
