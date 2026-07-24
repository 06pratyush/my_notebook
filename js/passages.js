/**
 * passages.js — Loads subjects, chapters, and passages from /passages/ directory.
 * Fetches HTML files and renders them into the page.
 */
window.NBPassages = (() => {
  const PASSAGES_ROOT = 'passages/';
  let allPassages = [];
  let allChapters = [];

  async function loadAll() {
    const content = document.getElementById('fl-content');
    if (!content) return;

    // Load frontispiece, index section
    const [frontHTML, indexHTML, colophonHTML] = await Promise.all([
      fetchHTML('components/frontispiece.html'),
      fetchHTML('components/index-section.html'),
      fetchHTML('components/colophon.html')
    ]);

    content.innerHTML = frontHTML + indexHTML;

    // Discover subjects
    const subjects = await fetchJSON(PASSAGES_ROOT + 'machine-learning/_subject.json');
    const subjectDir = 'machine-learning';

    // Subject header
    content.innerHTML += '<section id="subject-ml" style="padding: 0;">';
    content.innerHTML += '<div class="subject-header"><div style="font-family: \'IM Fell English SC\', serif; font-size: 14px; letter-spacing: 5px; color: #6b675a;">Subject</div><h2>' + subjects.title + '</h2></div>';

    // Load chapters
    const chapterMeta = [];
    const romanLabels = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    for (let ci = 0; ci < subjects.chapters.length; ci++) {
      const chSlug = subjects.chapters[ci];
      const chPath = PASSAGES_ROOT + subjectDir + '/' + chSlug + '/_chapter.json';
      const chapter = await fetchJSON(chPath);
      chapter.slug = chSlug;
      chapter._subjectTitle = subjects.title;
      chapter._chapterLabel = 'Chapter ' + (romanLabels[ci] || (ci + 1));
      allChapters.push(chapter);
      chapterMeta.push({ slug: chSlug, title: chapter.title, passages: chapter.passages });

      content.innerHTML += '<div class="chapter" id="ch-' + chSlug + '">';
      content.innerHTML += '<div class="chapter-header"><div style="font-family: \'IM Fell English SC\', serif; font-size: 13px; letter-spacing: 4px; color: #6b675a;">Chapter</div><h3>' + chapter.title + '</h3></div>';

      // Load passages
      for (let i = 0; i < chapter.passages.length; i++) {
        const pm = chapter.passages[i];
        allPassages.push(pm);

        const htmlPath = PASSAGES_ROOT + subjectDir + '/' + chSlug + '/' + pm.id + '.html';
        const passageHTML = await fetchHTML(htmlPath);

        // Store passage file path for admin saves
        NBAdmin.setPassageMeta({
          ...NBAdmin._passageMeta,
          [pm.id]: { path: htmlPath, no: pm.no }
        });

        const article = document.createElement('article');
        article.id = pm.id;
        article.innerHTML = '<div data-reveal>' + passageHTML + '</div>';
        content.appendChild(article);

        // Add divider between passages (not after last in chapter)
        if (i < chapter.passages.length - 1) {
          content.innerHTML += '<div class="divider"><span class="divider-line"></span><span class="divider-mark">❦</span><span class="divider-line"></span></div>';
        }
      }

      content.innerHTML += '</div>';

      // Divider between chapters
      content.innerHTML += '<div class="divider"><span class="divider-line"></span><span class="divider-mark">❦</span><span class="divider-line"></span></div>';
    }

    content.innerHTML += '</section>'; // close subject

    content.innerHTML += '<div class="divider"><span class="divider-line"></span><span class="divider-mark">❦</span><span class="divider-line"></span></div>';
    content.innerHTML += colophonHTML;

    // Build index
    buildIndex();

    // Build rail navigation
    buildRailItems();

    // Build bounds (passage links)
    buildBounds();

    return { allPassages, allChapters, chapterMeta };
  }

  function buildIndex() {
    const box = document.getElementById('fl-index');
    if (!box) return;
    box.innerHTML = '';

    for (const ch of allChapters) {
      // Subject (expandable)
      const subj = document.createElement('div');
      subj.className = 'index-subject';
      subj.innerHTML = '<span class="caret">▶</span>'
        + '<span class="subj-title">' + ch._subjectTitle + '</span>'
        + '<span class="subj-count">' + ch.passages.length + ' passages</span>';
      box.appendChild(subj);

      // Chapters container (collapsible)
      const chapters = document.createElement('div');
      chapters.className = 'index-chapters';

      // Chapter heading
      const chHead = document.createElement('div');
      chHead.className = 'index-chapter';
      chHead.textContent = ch._chapterLabel + ' — ' + ch.title;
      chapters.appendChild(chHead);

      // Passages
      for (const pm of ch.passages) {
        const a = document.createElement('a');
        a.href = '#' + pm.id;
        a.className = 'index-passage';
        a.innerHTML = '<span class="pass-title">' + pm.title + '</span>'
          + '<span class="pass-dots"></span>'
          + '<span class="pass-meta">' + pm.tags[0] + ' · №' + pm.no + '</span>';
        chapters.appendChild(a);
      }

      box.appendChild(chapters);

      // Toggle expand/collapse
      subj.onclick = () => {
        const isOpen = chapters.classList.toggle('open');
        subj.classList.toggle('open', isOpen);
      };
    }
  }

  function buildRailItems() {
    const items = [{ id: 'index', label: 'Index', glyph: '·' }];

    for (const ch of allChapters) {
      items.push({ id: 'ch-' + ch.slug, label: ch.title, glyph: '§' });
      for (const pm of ch.passages) {
        items.push({ id: pm.id, label: '№' + pm.no + ' · ' + pm.title, glyph: '·' });
      }
    }

    items.push({ id: 'colophon', label: 'Colophon', glyph: '·' });
    NBNav.init(items);
  }

  function buildBounds() {
    for (const pm of allPassages) {
      const bound = document.getElementById('bound-' + pm.id);
      if (!bound) continue;

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
  function getPassageMeta() {
    const meta = {};
    allPassages.forEach(p => { meta[p.id] = p; });
    return meta;
  }

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

  return { loadAll, getAllPassages, getPassageMeta };
})();
