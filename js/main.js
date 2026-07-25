/**
 * main.js — Entry point. Initializes all modules.
 */
(async function () {
  'use strict';

  // 1. Auth
  NBAuth.init();

  // 2. Notebook switcher (reads manifest, decides current notebook from ?nb=)
  const nb = await NBNotebooks.init();

  // 3. Init admin early so setPassageMeta calls from NBPassages land
  NBAdmin.init({});

  // 4. Load the current notebook and render page
  const { allPassages } = await NBPassages.loadNotebook(nb.slug);

  // 5. Re-arm admin edit controls now that DOM exists
  if (NBAuth.isAdmin()) NBAdmin.addEditControls();

  // 6. Search
  NBSearch.init();

  // 7. Render diagrams
  try { NBRoughDiagrams.renderAll(); } catch (e) { console.warn('Rough.js diagrams:', e); }
  try { NBD3Plots.renderAll(); } catch (e) { console.warn('D3.js plots:', e); }
  try { NBMetricsViz.renderAll(); } catch (e) { console.warn('Metrics viz:', e); }

  // 8. KaTeX auto-render
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

  // 9. Reveal animation
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('seen'); io.unobserve(en.target); } });
  }, { threshold: 0.1 });
  document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));

  // 10. Overlay buttons
  document.getElementById('fbtn-atlas').onclick = () => {
    const el = document.getElementById('fl-atlas');
    const isOpen = el.style.display === 'flex';
    closeAllOverlays();
    if (!isOpen) { el.style.display = 'flex'; NBAtlas.build(el, allPassages); }
  };
  document.getElementById('fbtn-orrery').onclick = () => {
    const el = document.getElementById('fl-orrery');
    const isOpen = el.style.display === 'flex';
    closeAllOverlays();
    if (!isOpen) { el.style.display = 'flex'; NBOrrery.build(el, allPassages); }
  };
  document.getElementById('fbtn-chron').onclick = () => {
    const el = document.getElementById('fl-chron');
    const isOpen = el.style.display === 'flex';
    closeAllOverlays();
    if (!isOpen) { el.style.display = 'flex'; NBChronicle.build(el, allPassages); }
  };
  document.getElementById('fbtn-cal').onclick = () => {
    const el = document.getElementById('fl-cal');
    const isOpen = el.style.display === 'flex';
    closeAllOverlays();
    if (!isOpen) { el.style.display = 'flex'; NBCalendar.build(el, allPassages); }
  };

  // 11. Escape closes overlays
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllOverlays(); });

  // 12. Bind — tree picker overlay for selective print
  document.getElementById('fbtn-bind').onclick = () => {
    const el = document.getElementById('fl-bind');
    const isOpen = el.style.display === 'flex';
    closeAllOverlays();
    if (!isOpen) { el.style.display = 'flex'; NBBind.build(el); }
  };

  // 13. Internal links (in-page anchor navigation)
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

  // 14. If URL loaded with a hash (e.g. from a shared link), jump to it after render
  if (location.hash) {
    const id = location.hash.slice(1);
    if (document.getElementById(id)) setTimeout(() => NBNav.jump(id), 50);
  }

  function closeAllOverlays() {
    ['fl-atlas', 'fl-orrery', 'fl-chron', 'fl-cal', 'fl-bind'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }
})();
