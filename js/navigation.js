/**
 * navigation.js — Rail navigation + scroll spy + jump
 */
window.NBNav = (() => {
  const railItems = [];
  const railDots = {};
  let spyIds = [];

  function init(items) {
    railItems.length = 0;
    railItems.push(...items);
    spyIds = railItems.map(i => i.id);
    buildRail();
    window.addEventListener('scroll', spy, { passive: true });
    spy();
  }

  function buildRail() {
    const rail = document.getElementById('fl-rail');
    if (!rail) return;
    rail.innerHTML = '';
    railItems.forEach(it => {
      const row = document.createElement('div');
      row.className = 'rail-row';
      const lab = document.createElement('span');
      lab.className = 'rail-label';
      lab.textContent = it.label;
      const dot = document.createElement('span');
      dot.className = 'rail-dot';
      dot.textContent = it.glyph || '·';
      railDots[it.id] = dot;
      row.appendChild(lab);
      row.appendChild(dot);
      row.onclick = () => jump(it.id);
      rail.appendChild(row);
    });
  }

  function jump(id) {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 58, behavior: 'smooth' });
  }

  function spy() {
    let cur = spyIds[0];
    for (const id of spyIds) {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top <= 140) cur = id;
    }
    spyIds.forEach(id => {
      const d = railDots[id];
      if (d) {
        d.style.opacity = id === cur ? '1' : '.45';
        d.style.transform = id === cur ? 'scale(1.6)' : 'none';
      }
    });
  }

  return { init, jump };
})();
