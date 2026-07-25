/**
 * passages.js — Recursive hierarchy loader.
 * Loads one notebook: notebook > section > chapter > topic > sub-topic > passage.
 * Any intermediate level can be omitted; a level's _meta.json declares either
 * `children` (subfolder slugs) or `passages` (leaf entries) or both.
 */
window.NBPassages = (() => {
  const PASSAGES_ROOT = 'passages/';
  const LEVEL_LABELS = {
    notebook: 'Notebook',
    section:  'Section',
    chapter:  'Chapter',
    topic:    'Topic',
    subtopic: 'Sub-topic'
  };
  const LEVEL_HEADING_SIZES = {
    notebook: 48, section: 40, chapter: 32, topic: 26, subtopic: 22
  };
  const romanLabels = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI'];

  let allPassages = [];
  let flatTree = [];
  let rootNode = null;
  let currentNotebook = null;

  async function loadNotebook(notebookSlug) {
    reset();
    const content = document.getElementById('fl-content');
    if (!content) return { allPassages: [], flatTree: [] };

    const [frontHTML, indexHTML, colophonHTML] = await Promise.all([
      fetchHTML('components/frontispiece.html'),
      fetchHTML('components/index-section.html'),
      fetchHTML('components/colophon.html')
    ]);
    content.innerHTML = frontHTML + indexHTML;

    const notebookPath = PASSAGES_ROOT + notebookSlug;
    const rootMeta = await fetchJSON(notebookPath + '/_notebook.json');
    currentNotebook = { slug: notebookSlug, ...rootMeta };

    // Phase 1: walk the metadata tree, collecting branches + passage metadata.
    rootNode = await walkTree(notebookPath, rootMeta, 'notebook', 0);

    // Phase 2: fetch every passage HTML in parallel — this is what makes the load instant.
    await Promise.all(allPassages.map(async pm => {
      pm._html = await fetchHTML(pm._path);
    }));

    // Phase 3: render.
    renderNode(content, rootNode, notebookSlug);
    content.insertAdjacentHTML('beforeend',
      '<div class="divider"><span class="divider-line"></span><span class="divider-mark">❦</span><span class="divider-line"></span></div>'
    );
    content.insertAdjacentHTML('beforeend', colophonHTML);

    // Publish passage → file-path meta for admin.js
    const adminMeta = {};
    for (const p of allPassages) {
      adminMeta[p.id] = { path: p._path, no: p.no };
    }
    if (window.NBAdmin) NBAdmin.setPassageMeta(adminMeta);

    buildIndex();
    buildRailItems();
    buildBounds();

    return { allPassages, flatTree, currentNotebook };
  }

  function reset() {
    allPassages = [];
    flatTree = [];
    rootNode = null;
    currentNotebook = null;
  }

  async function walkTree(dirPath, meta, kindHint, depth) {
    const node = {
      dirPath,
      slug: dirPath.split('/').pop(),
      title: meta.title || '(untitled)',
      kind: meta.kind || kindHint || 'section',
      depth,
      children: [],
      passages: []
    };

    if (Array.isArray(meta.children)) {
      for (let i = 0; i < meta.children.length; i++) {
        const childSlug = meta.children[i];
        const childPath = dirPath + '/' + childSlug;
        const childMeta = await fetchJSON(childPath + '/_meta.json');
        const child = await walkTree(childPath, childMeta, undefined, depth + 1);
        child._ordinal = romanLabels[i] || String(i + 1);
        node.children.push(child);
      }
    }

    if (Array.isArray(meta.passages)) {
      for (const pm of meta.passages) {
        const pmFull = {
          ...pm,
          _path: dirPath + '/' + pm.id + '.html',
          _parentTitle: node.title,
          _parentKind: node.kind
        };
        node.passages.push(pmFull);
        allPassages.push(pmFull);
      }
    }

    if (node.kind !== 'notebook') flatTree.push(node);
    return node;
  }

  function renderNode(host, node, notebookSlug) {
    if (node.kind === 'notebook') {
      const wrapper = document.createElement('section');
      wrapper.id = 'notebook-' + notebookSlug;
      wrapper.style.padding = '0';
      wrapper.innerHTML =
        '<div class="subject-header">' +
          '<div style="font-family: \'IM Fell English SC\', serif; font-size: 14px; letter-spacing: 5px; color: #6b675a;">Notebook</div>' +
          '<h2>' + escapeHTML(node.title) + '</h2>' +
        '</div>';
      host.appendChild(wrapper);
      renderChildren(wrapper, node, notebookSlug);
    } else {
      const wrap = document.createElement('div');
      wrap.className = 'nb-level nb-level-' + node.kind;
      wrap.id = branchId(node);

      const label = LEVEL_LABELS[node.kind] || 'Section';
      const size = LEVEL_HEADING_SIZES[node.kind] || 22;
      const ordinal = node._ordinal ? label + ' ' + node._ordinal : label;
      wrap.innerHTML =
        '<div class="chapter-header" style="padding: ' + Math.max(14, 30 - node.depth * 4) + 'px 8vw 8px;">' +
          '<div style="font-family: \'IM Fell English SC\', serif; font-size: 13px; letter-spacing: 4px; color: #6b675a;">' + escapeHTML(ordinal) + '</div>' +
          '<h3 style="font-size: ' + size + 'px; margin: 6px 0 0;">' + escapeHTML(node.title) + '</h3>' +
        '</div>';

      host.appendChild(wrap);
      renderChildren(wrap, node, notebookSlug);

      host.insertAdjacentHTML('beforeend',
        '<div class="divider"><span class="divider-line"></span><span class="divider-mark">❦</span><span class="divider-line"></span></div>'
      );
    }
  }

  function renderChildren(host, node, notebookSlug) {
    for (let i = 0; i < node.passages.length; i++) {
      const pm = node.passages[i];
      const article = document.createElement('article');
      article.id = pm.id;
      article.innerHTML = '<div data-reveal>' + (pm._html || '') + '</div>';
      host.appendChild(article);
      if (i < node.passages.length - 1) {
        host.insertAdjacentHTML('beforeend',
          '<div class="divider"><span class="divider-line"></span><span class="divider-mark">❦</span><span class="divider-line"></span></div>'
        );
      }
    }
    for (const child of node.children) {
      renderNode(host, child, notebookSlug);
    }
  }

  function branchId(node) {
    return 'br-' + node.kind + '-' + node.slug;
  }

  function buildIndex() {
    const box = document.getElementById('fl-index');
    if (!box) return;
    box.innerHTML = '';

    const topBranches = flatTree.filter(n => n.depth === 1);

    for (const branch of topBranches) {
      const subj = document.createElement('div');
      subj.className = 'index-subject';
      const totalPass = countLeafPassages(branch);
      subj.innerHTML =
        '<span class="caret">▶</span>' +
        '<span class="subj-title">' + escapeHTML(branch.title) + '</span>' +
        '<span class="subj-count">' + totalPass + ' passages</span>';
      box.appendChild(subj);

      const inner = document.createElement('div');
      inner.className = 'index-chapters';
      renderIndexBranch(inner, branch, 1);
      box.appendChild(inner);

      subj.onclick = () => {
        const open = inner.classList.toggle('open');
        subj.classList.toggle('open', open);
      };
    }
  }

  function renderIndexBranch(host, node, depth) {
    if (node.passages.length) {
      const chHead = document.createElement('div');
      chHead.className = 'index-chapter';
      chHead.style.paddingLeft = (14 + depth * 14) + 'px';
      chHead.textContent = (LEVEL_LABELS[node.kind] || 'Section') + ' — ' + node.title;
      host.appendChild(chHead);
      for (const pm of node.passages) {
        const a = document.createElement('a');
        a.href = '#' + pm.id;
        a.className = 'index-passage';
        a.style.paddingLeft = (28 + depth * 14) + 'px';
        const tag = (pm.tags && pm.tags[0]) || '';
        a.innerHTML =
          '<span class="pass-title">' + escapeHTML(pm.title) + '</span>' +
          '<span class="pass-dots"></span>' +
          '<span class="pass-meta">' + escapeHTML(tag) + ' · №' + pm.no + '</span>';
        host.appendChild(a);
      }
    }
    for (const child of node.children) {
      renderIndexBranch(host, child, depth + 1);
    }
  }

  function countLeafPassages(node) {
    let n = node.passages.length;
    for (const c of node.children) n += countLeafPassages(c);
    return n;
  }

  function buildRailItems() {
    const items = [{ id: 'index', label: 'Index', glyph: '·' }];
    for (const branch of flatTree) {
      if (branch.passages.length) {
        items.push({ id: branchId(branch), label: branch.title, glyph: '§' });
        for (const pm of branch.passages) {
          items.push({ id: pm.id, label: '№' + pm.no + ' · ' + pm.title, glyph: '·' });
        }
      }
    }
    items.push({ id: 'colophon', label: 'Colophon', glyph: '·' });
    if (window.NBNav) NBNav.init(items);
  }

  function buildBounds() {
    for (const pm of allPassages) {
      const bound = document.getElementById('bound-' + pm.id);
      if (!bound) continue;
      bound.innerHTML = '';

      const label = document.createElement('span');
      label.className = 'bound-label';
      label.textContent = 'Bound to';
      bound.appendChild(label);

      const row = document.createElement('div');
      row.style.cssText = 'display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 8px;';

      for (const linkId of (pm.links || [])) {
        const target = allPassages.find(p => p.id === linkId);
        if (!target) continue;
        const a = document.createElement('a');
        a.href = '#' + linkId;
        a.className = 'bound-link';
        a.textContent = target.title + ' · №' + target.no;
        row.appendChild(a);
      }

      if (row.children.length) bound.appendChild(row);
    }
  }

  function getAllPassages() { return allPassages; }
  function getFlatTree() { return flatTree; }
  function getRootNode() { return rootNode; }
  function getCurrentNotebook() { return currentNotebook; }
  function getLevelLabel(kind) { return LEVEL_LABELS[kind] || 'Section'; }

  async function fetchHTML(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load ' + url + ': ' + res.status);
    return res.text();
  }

  async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load ' + url + ': ' + res.status);
    return res.json();
  }

  function escapeHTML(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  return { loadNotebook, getAllPassages, getFlatTree, getRootNode, getCurrentNotebook, getLevelLabel };
})();
