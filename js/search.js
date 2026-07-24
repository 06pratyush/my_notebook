/**
 * search.js — Text search across passages
 */
window.NBSearch = (() => {
  let fSearch = '';
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  function init() {
    const input = document.getElementById('fl-search');
    if (input) input.addEventListener('input', (e) => { fSearch = e.target.value.trim().toLowerCase(); applyFilters(); });
  }

  function clearMarks() {
    document.querySelectorAll('article mark').forEach(m => m.parentNode.replaceChild(document.createTextNode(m.textContent), m));
    document.querySelectorAll('article p').forEach(p => p.normalize());
  }

  function highlight(q) {
    if (!q) return;
    const re = new RegExp('(' + esc(q) + ')', 'i');
    document.querySelectorAll('article:not(.dimmed) p').forEach(p => {
      const walk = (node) => {
        if (node.nodeType === 3) {
          if (node.parentNode.closest('a, mark, .drill')) return;
          const m = re.exec(node.nodeValue); if (!m) return;
          const after = node.splitText(m.index), rest = after.splitText(m[0].length);
          const mk = document.createElement('mark'); mk.textContent = m[0];
          after.parentNode.replaceChild(mk, after); walk(rest);
        } else if (node.nodeType === 1) Array.prototype.slice.call(node.childNodes).forEach(walk);
      };
      walk(p);
    });
  }

  function applyFilters() {
    document.querySelectorAll('article').forEach(art => {
      if (!fSearch) { art.classList.remove('dimmed'); return; }
      const match = art.textContent.toLowerCase().indexOf(fSearch) >= 0;
      art.classList.toggle('dimmed', !match);
    });
    clearMarks(); highlight(fSearch);
  }

  return { init, applyFilters };
})();
