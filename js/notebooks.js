/**
 * notebooks.js — Multi-notebook manifest, top-bar switcher, current-notebook routing.
 * URL: ?nb=<slug> selects a notebook. Absent → first notebook in manifest.
 */
window.NBNotebooks = (() => {
  const MANIFEST = 'passages/notebooks.json';
  let manifest = null;
  let currentSlug = null;

  async function init() {
    manifest = await fetchJSON(MANIFEST);
    const list = manifest.notebooks || [];
    if (!list.length) throw new Error('No notebooks in ' + MANIFEST);

    const params = new URLSearchParams(location.search);
    const requested = params.get('nb');
    currentSlug = list.find(n => n.slug === requested) ? requested : list[0].slug;

    renderSwitcher();
    return currentNotebook();
  }

  function renderSwitcher() {
    const host = document.getElementById('fl-notebooks');
    if (!host) return;
    host.innerHTML = '';
    for (const nb of manifest.notebooks) {
      const tab = document.createElement('button');
      tab.className = 'fl-btn nb-tab' + (nb.slug === currentSlug ? ' solid' : '');
      tab.textContent = nb.title;
      tab.title = nb.subject ? nb.subject + ' · ' + (nb.description || '') : (nb.description || '');
      tab.onclick = () => setNotebook(nb.slug);
      host.appendChild(tab);
    }
  }

  function setNotebook(slug) {
    if (slug === currentSlug) return;
    const url = new URL(location.href);
    url.searchParams.set('nb', slug);
    url.hash = '';
    location.href = url.toString();
  }

  function currentNotebook() {
    return manifest.notebooks.find(n => n.slug === currentSlug);
  }

  function list() { return (manifest && manifest.notebooks) || []; }

  async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load ' + url + ': ' + res.status);
    return res.json();
  }

  return { init, currentNotebook, list, setNotebook };
})();
