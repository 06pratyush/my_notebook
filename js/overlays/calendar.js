/**
 * calendar.js — Year grid showing when the notebook was fed.
 */
window.NBCalendar = (() => {
  function build(host, passages) {
    host.innerHTML = '';
    const W = 1000, H = 700;
    const card = document.createElement('div');
    card.className = 'fl-overlay-card';
    card.innerHTML = '<div class="fl-overlay-inner"></div>'
      + '<div class="fl-overlay-head"><div class="fl-overlay-head-title">The Commonplace Calendar — a Year in Ink</div>'
      + '<div class="fl-overlay-ctrls"><button class="fl-btn nb-close">Close ✕</button></div></div>'
      + '<div class="fl-overlay-hint">Darker cells hold more entries. Click to visit.</div>';
    host.appendChild(card);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%');
    card.insertBefore(svg, card.children[2]);

    const mk = (tag, attrs) => { const e = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
    const today = new Date().toISOString().slice(0, 10);
    const calYear = today.slice(0, 4);

    // Build ink map
    const ink = {};
    passages.forEach(p => {
      if (p.date) { (ink[p.date] = ink[p.date] || []).push(p); }
    });

    // Grid layout
    const cols = 4, rows = 3, monthGap = 20;
    const gridTop = 72, gridBottom = 640;
    const gridW = 940, gridLeft = (W - gridW) / 2;
    const monthW = (gridW - (cols - 1) * monthGap) / cols;
    const monthH = (gridBottom - gridTop - (rows - 1) * monthGap) / rows;
    const cellGap = 3, nameH = 26, dowH = 18;
    const insideH = monthH - nameH - dowH - 4;
    const insideW = monthW - 4;
    const cellW = Math.floor((insideW - 6 * cellGap) / 7);
    const cellH = Math.floor((insideH - 5 * cellGap) / 6);
    const cellGridW = 7 * cellW + 6 * cellGap;
    const cellStartXOff = (monthW - cellGridW) / 2;
    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    for (let mi = 0; mi < 12; mi++) {
      const col = mi % cols, row = Math.floor(mi / cols);
      const mx = gridLeft + col * (monthW + monthGap);
      const my = gridTop + row * (monthH + monthGap);

      const nm = mk('text', { x: mx + monthW / 2, y: my + 15, 'text-anchor': 'middle', fill: '#16150f', 'font-family': 'IM Fell English SC, serif', 'font-size': 14, 'letter-spacing': 3 });
      nm.textContent = new Date(2000, mi, 1).toLocaleDateString('en-GB', { month: 'long' }).toUpperCase();
      svg.appendChild(nm);
      svg.appendChild(mk('line', { x1: mx + cellStartXOff, x2: mx + cellStartXOff + cellGridW, y1: my + nameH - 4, y2: my + nameH - 4, stroke: '#16150f', 'stroke-width': .5, opacity: .35 }));

      for (let d = 0; d < 7; d++) {
        const dx = mx + cellStartXOff + d * (cellW + cellGap) + cellW / 2;
        const t = mk('text', { x: dx, y: my + nameH + 11, 'text-anchor': 'middle', fill: '#6b675a', 'font-family': 'IM Fell English SC, serif', 'font-size': 11 });
        t.textContent = dayNames[d]; svg.appendChild(t);
      }

      const first = new Date(+calYear, mi, 1);
      const startDow = first.getDay();
      const lastDay = new Date(+calYear, mi + 1, 0).getDate();
      for (let d = 1; d <= lastDay; d++) {
        const pos = startDow + d - 1;
        const dCol = pos % 7, dRow = Math.floor(pos / 7);
        const x = mx + cellStartXOff + dCol * (cellW + cellGap);
        const y = my + nameH + dowH + dRow * (cellH + cellGap);
        const iso = new Date(+calYear, mi, d).toISOString().slice(0, 10);
        const evs = ink[iso] || [];
        const level = Math.min(4, evs.length);
        const op = level === 0 ? 0 : 0.22 + level * 0.19;
        const rect = mk('rect', { x, y, width: cellW, height: cellH, rx: 2, fill: level ? '#16150f' : '#fcfbf7', 'fill-opacity': level ? op : 1, stroke: '#16150f', 'stroke-width': level ? 0 : .6, 'stroke-opacity': .3 });
        if (level) { rect.style.cursor = 'pointer'; rect.onclick = () => { close(); NBNav.jump(evs[0].id); }; }
        svg.appendChild(rect);
        if (cellW >= 20 && cellH >= 16) {
          const numT = mk('text', { x: x + cellW - 3, y: y + 10, 'text-anchor': 'end', fill: level ? '#fcfbf7' : '#b8b3a2', 'font-family': 'IM Fell English, serif', 'font-size': 10, 'pointer-events': 'none' });
          numT.textContent = d; svg.appendChild(numT);
        }
      }
    }

    // Legend
    const legY = 668;
    svg.appendChild(Object.assign(mk('text', { x: gridLeft, y: legY + 12, fill: '#6b675a', 'font-family': 'IM Fell English SC, serif', 'font-size': 11, 'letter-spacing': 1 }), { textContent: 'LESS' }));
    for (let l = 0; l <= 4; l++) svg.appendChild(mk('rect', { x: gridLeft + 44 + l * 22, y: legY, width: 15, height: 15, rx: 2, fill: l ? '#16150f' : '#fcfbf7', 'fill-opacity': l ? 0.22 + l * 0.19 : 1, stroke: '#16150f', 'stroke-width': l ? 0 : .6, 'stroke-opacity': .3 }));
    svg.appendChild(Object.assign(mk('text', { x: gridLeft + 44 + 5 * 22 + 6, y: legY + 12, fill: '#6b675a', 'font-family': 'IM Fell English SC, serif', 'font-size': 11, 'letter-spacing': 1 }), { textContent: 'MORE' }));

    card.querySelector('.nb-close').onclick = close;
  }

  function close() {
    const el = document.getElementById('fl-cal');
    if (el) el.style.display = 'none';
  }

  return { build, close };
})();
