/**
 * main.js — Entry point. Initializes all modules.
 */
(async function () {
  'use strict';

  // 1. Auth
  NBAuth.init();

  // 2. Load all passages and render page
  const { allPassages } = await NBPassages.loadAll();

  // 3. Init admin (needs passage metadata for save paths)
  const adminMeta = {};
  allPassages.forEach(p => {
    adminMeta[p.id] = { path: 'passages/machine-learning/' + getChapterSlug(p) + '/' + p.id + '.html' };
  });
  NBAdmin.init(adminMeta);

  // 4. Search
  NBSearch.init();

  // 5. Render diagrams
  try { NBRoughDiagrams.renderAll(); } catch (e) { console.warn('Rough.js diagrams:', e); }
  try { NBD3Plots.renderAll(); } catch (e) { console.warn('D3.js plots:', e); }
  try { NBMetricsViz.renderAll(); } catch (e) { console.warn('Metrics viz:', e); }

  // 6. KaTeX auto-render
  if (typeof renderMathInElement !== 'undefined') {
    renderMathInElement(document.body, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\(', right: '\\)', display: false },
        { left: '\\[', right: '\\]', display: true }
      ],
      throwOnError: false
    });
  }

  // 7. Reveal animation
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('seen'); io.unobserve(en.target); } });
  }, { threshold: 0.1 });
  document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));

  // 8. Overlay buttons
  document.getElementById('fbtn-atlas').onclick = () => {
    const el = document.getElementById('fl-atlas');
    const open = el.style.display !== 'none';
    closeAllOverlays();
    if (!open) { el.style.display = 'flex'; NBAtlas.build(el, allPassages); }
  };
  document.getElementById('fbtn-orrery').onclick = () => {
    const el = document.getElementById('fl-orrery');
    const open = el.style.display !== 'none';
    closeAllOverlays();
    if (!open) { el.style.display = 'flex'; NBOrrery.build(el, allPassages); }
  };
  document.getElementById('fbtn-chron').onclick = () => {
    const el = document.getElementById('fl-chron');
    const open = el.style.display !== 'none';
    closeAllOverlays();
    if (!open) { el.style.display = 'flex'; NBChronicle.build(el, allPassages); }
  };
  document.getElementById('fbtn-cal').onclick = () => {
    const el = document.getElementById('fl-cal');
    const open = el.style.display !== 'none';
    closeAllOverlays();
    if (!open) { el.style.display = 'flex'; NBCalendar.build(el, allPassages); }
  };

  // 9. Escape key closes overlays
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllOverlays(); });

  // 10. Print
  document.getElementById('fbtn-bind').onclick = () => {
    closeAllOverlays();
    document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('seen'));
    document.querySelectorAll('article').forEach(el => el.classList.remove('dimmed'));
    setTimeout(() => window.print(), 120);
  };

  // 11. Internal links
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    if (document.getElementById(id)) {
      e.preventDefault();
      closeAllOverlays();
      NBNav.jump(id);
    }
  });

  function closeAllOverlays() {
    ['fl-atlas', 'fl-orrery', 'fl-chron', 'fl-cal'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }

  function getChapterSlug(passage) {
    // Determine chapter slug from passage id
    if (passage.id.startsWith('ml001') || passage.id.startsWith('ml002')) return '01-foundations';
    if (passage.id.startsWith('ml003') || passage.id.startsWith('ml004')) return '02-regression';
    if (passage.id.startsWith('ml005')) return '03-evaluation';
    return '00-uncategorised';
  }

})();
