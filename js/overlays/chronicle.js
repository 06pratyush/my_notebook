/**
 * chronicle.js — Weekly almanac of when passages were entered.
 */
window.NBChronicle = (() => {
  const WEEK_NAMES = [
    'First Frost','Deep Quiet','Long Dark','Cold Hearth',"Thaw's Eve",'First Thaw','Waking Ground','Stirring','Snowmelt','First Green','Sap Rising','Quickening',"Bud's Promise",
    'First Bloom','Greening','Lengthening','Blossomfall','Sweet Air','Full Leaf','Meadowlight','Daysrise','Solstice','High Sun','Goldenhour','Haymaking','Riverlow',
    'Full Zenith',"Heat's Crown",'Still Noon','Dog Days','Ripening','Harvestide','Reaping','Grainfall','Amberlight','Equinox','First Falling','Leafturn','Emberwood',
    'Last Harvest','Mistfall',"Hunter's Moon",'Bare Branch','First Rime','Long Shadow','Frostgate','Deepening','Solstice Deep','Midwinter','Still Hollow',"Year's Ebb",'Last Watch'
  ];
  const SEASONS = [
    { name: 'Kindling', sub: 'weeks I–XIII' },
    { name: 'Flourish', sub: 'weeks XIV–XXVI' },
    { name: 'Zenith', sub: 'weeks XXVII–XXXIX' },
    { name: 'Ember', sub: 'weeks XL–LII' }
  ];
  const ROMAN = (n) => { const m = [['X',10],['IX',9],['V',5],['IV',4],['I',1]]; let r = ''; m.forEach(([s, v]) => { while (n >= v) { r += s; n -= v; } }); return r; };
  const dayOfYear = (dt) => Math.floor((dt - new Date(dt.getFullYear(), 0, 0)) / 86400000);
  const weekOf = (iso) => Math.min(51, Math.floor((dayOfYear(new Date(iso + 'T00:00')) - 1) / 7));

  function build(host, passages) {
    host.innerHTML = '';
    const W = 1000, H = 700;
    const card = document.createElement('div');
    card.className = 'fl-overlay-card';
    card.innerHTML = '<div class="fl-overlay-inner"></div>'
      + '<div class="fl-overlay-head"><div class="fl-overlay-head-title">The Chronicle — an Almanac of Weeks</div>'
      + '<div class="fl-overlay-ctrls"><button class="fl-btn nb-close">Close ✕</button></div></div>'
      + '<div class="fl-overlay-hint">Click a mark to visit its passage.</div>';
    host.appendChild(card);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%');
    card.insertBefore(svg, card.children[2]);

    const mk = (tag, attrs) => { const e = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
    const today = new Date().toISOString().slice(0, 10);
    const chYear = today.slice(0, 4);
    const chQtr = Math.floor(weekOf(today) / 13);

    const L = 64, Rr = W - 64, axisY = 634;
    const w0 = chQtr * 13;
    const colW = (Rr - L) / 13;
    const colX = (w) => L + (w - w0 + 0.5) * colW;

    // Axis + week columns
    svg.appendChild(mk('line', { x1: L, x2: Rr, y1: axisY, y2: axisY, stroke: '#16150f', 'stroke-width': 1.4 }));
    for (let w = w0; w < w0 + 13; w++) {
      const x = colX(w);
      svg.appendChild(mk('line', { x1: x, x2: x, y1: axisY - 4, y2: axisY + 4, stroke: '#16150f', 'stroke-width': .8 }));
      const t = mk('text', { x: x, y: axisY + 22, 'text-anchor': 'middle', fill: '#6b675a', 'font-family': 'IM Fell English SC, serif', 'font-size': 12, 'letter-spacing': 1 });
      t.textContent = ROMAN(w + 1); svg.appendChild(t);
    }

    // Today line
    const xNow = colX(weekOf(today));
    svg.appendChild(mk('line', { x1: xNow, x2: xNow, y1: 172, y2: axisY, stroke: '#16150f', 'stroke-width': .8, 'stroke-dasharray': '1 6' }));
    const nowT = mk('text', { x: xNow, y: 166, 'text-anchor': 'middle', fill: '#16150f', 'font-family': 'IM Fell English SC, serif', 'font-size': 11, 'letter-spacing': 3 });
    nowT.textContent = 'TO-DAY'; svg.appendChild(nowT);

    // Passage entries
    const byWeek = {};
    passages.forEach(p => {
      if (!p.date) return;
      const w = weekOf(p.date);
      const qtr = Math.floor(w / 13);
      if (qtr === chQtr && p.date.slice(0, 4) === chYear) {
        (byWeek[w] = byWeek[w] || []).push(p);
      }
    });
    Object.keys(byWeek).forEach(wk => {
      const list = byWeek[wk];
      list.forEach((p, i) => {
        const x = colX(+wk) + (i - (list.length - 1) / 2) * 22;
        const markerY = 452 + (i % 2) * 34;
        const g = mk('g', {}); g.style.cursor = 'pointer';
        g.appendChild(mk('line', { x1: x, x2: x, y1: axisY, y2: markerY, stroke: '#16150f', 'stroke-width': .6, opacity: .4 }));
        g.appendChild(mk('circle', { cx: x, cy: axisY, r: 2.4, fill: '#16150f' }));
        g.appendChild(mk('circle', { cx: x, cy: markerY, r: 12, fill: '#fcfbf7', stroke: '#16150f', 'stroke-width': 1.2 }));
        const gl = mk('text', { x: x, y: markerY + 5, 'text-anchor': 'middle', fill: '#16150f', 'font-family': 'IM Fell English, serif', 'font-size': 14 });
        gl.textContent = '·'; g.appendChild(gl);
        const ty = markerY - 18;
        let short = p.title; const maxC = Math.floor((ty - 180) / 8.6); if (short.length > maxC) short = short.slice(0, maxC - 1) + '…';
        const title = mk('text', { x: x, y: ty, 'text-anchor': 'start', fill: '#16150f', 'font-family': 'IM Fell English, serif', 'font-size': 15, transform: 'rotate(-90 ' + x + ' ' + ty + ')' });
        title.textContent = short; g.appendChild(title);
        g.onclick = () => { NBChronicle.close(); NBNav.jump(p.id); };
        svg.appendChild(g);
      });
    });

    card.querySelector('.nb-close').onclick = close;
  }

  function close() {
    const el = document.getElementById('fl-chron');
    if (el) el.style.display = 'none';
  }

  return { build, close };
})();
