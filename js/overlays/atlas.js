/**
 * atlas.js — Force-directed graph overlay showing passage connections.
 */
window.NBAtlas = (() => {
  let raf = null;

  function build(host, passages) {
    host.innerHTML = '';
    const W = 1000, H = 700;
    const card = document.createElement('div');
    card.className = 'fl-overlay-card';
    card.innerHTML = '<div class="fl-overlay-inner"></div>'
      + '<div class="fl-overlay-head"><div class="fl-overlay-head-title">The Atlas — a Chart of Bindings</div>'
      + '<div class="fl-overlay-ctrls"><button class="fl-btn nb-shake">↯ Shake</button><button class="fl-btn nb-close">Close ✕</button></div></div>'
      + '<div class="fl-overlay-hint">A living chart — drag a passage and the web follows. Click to leap.</div>';
    host.appendChild(card);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.cssText = 'touch-action:none;';
    card.insertBefore(svg, card.children[2]);

    // Graph data
    const cx = W / 2, cy = H / 2 + 10;
    const byId = {};
    passages.forEach(p => byId[p.id] = p);

    const nodes = passages.map((p, i) => {
      const a = (i / passages.length) * Math.PI * 2;
      const deg = (p.links || []).length;
      return { p, x: cx + 180 * Math.cos(a) + (Math.random() - .5) * 60, y: cy + 140 * Math.sin(a) + (Math.random() - .5) * 60, vx: 0, vy: 0, r: 8 + Math.min(8, deg * 1.6), drag: false };
    });
    const nById = {}; nodes.forEach(n => nById[n.p.id] = n);

    const edges = [];
    const seen = {};
    passages.forEach(p => (p.links || []).forEach(l => {
      if (!nById[l]) return;
      const key = [p.id, l].sort().join('-');
      if (seen[key]) return; seen[key] = 1;
      edges.push({ a: nById[p.id], b: nById[l] });
    }));

    const neighbors = {};
    passages.forEach(p => neighbors[p.id] = {});
    edges.forEach(e => { neighbors[e.a.p.id][e.b.p.id] = 1; neighbors[e.b.p.id][e.a.p.id] = 1; });

    // Build DOM
    const edgeEls = edges.map(e => {
      const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      ln.setAttribute('stroke', '#16150f'); ln.setAttribute('stroke-width', '.9');
      svg.appendChild(ln); return ln;
    });

    let hover = null;
    const nodeEls = nodes.map(n => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.style.cursor = 'grab';
      const halo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      halo.setAttribute('r', n.r + 8); halo.setAttribute('fill', 'none');
      halo.setAttribute('stroke', '#16150f'); halo.setAttribute('stroke-width', '.6'); halo.setAttribute('opacity', '0');
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('r', n.r); c.setAttribute('fill', '#fcfbf7');
      c.setAttribute('stroke', '#16150f'); c.setAttribute('stroke-width', '1.8');
      g.appendChild(halo); g.appendChild(c);

      const tx = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      const short = n.p.title.length > 30 ? n.p.title.slice(0, 28) + '…' : n.p.title;
      tx.setAttribute('x', 0); tx.setAttribute('y', n.r + 20); tx.setAttribute('text-anchor', 'middle');
      tx.setAttribute('fill', '#16150f'); tx.setAttribute('font-family', 'IM Fell English, serif'); tx.setAttribute('font-size', '15');
      tx.textContent = short;
      const no = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      no.setAttribute('x', 0); no.setAttribute('y', n.r + 37); no.setAttribute('text-anchor', 'middle');
      no.setAttribute('fill', '#6b675a'); no.setAttribute('font-family', 'IM Fell English SC, serif'); no.setAttribute('font-size', '11');
      no.textContent = '№' + n.p.no;
      g.appendChild(tx); g.appendChild(no);

      g.addEventListener('mouseenter', () => { hover = n.p.id; halo.setAttribute('opacity', '.7'); });
      g.addEventListener('mouseleave', () => { hover = null; halo.setAttribute('opacity', '0'); });
      svg.appendChild(g);
      return g;
    });

    // Interaction
    const toSvg = (ev) => { const r = svg.getBoundingClientRect(); return [(ev.clientX - r.left) * (W / r.width), (ev.clientY - r.top) * (H / r.height)]; };
    let dragging = null, moved = 0;
    nodeEls.forEach((g, i) => {
      g.addEventListener('pointerdown', (ev) => {
        ev.preventDefault(); dragging = nodes[i]; dragging.drag = true; moved = 0;
        g.style.cursor = 'grabbing'; g.setPointerCapture && g.setPointerCapture(ev.pointerId);
      });
    });
    svg.addEventListener('pointermove', (ev) => {
      if (!dragging) return;
      const [x, y] = toSvg(ev);
      moved += Math.abs(x - dragging.x) + Math.abs(y - dragging.y);
      dragging.x = x; dragging.y = y; dragging.vx = 0; dragging.vy = 0;
      heat = Math.max(heat, .6);
    });
    svg.addEventListener('pointerup', () => {
      if (!dragging) return;
      const n = dragging; dragging = null; n.drag = false;
      nodeEls.forEach(g => g.style.cursor = 'grab');
      if (moved < 6) { close(); NBNav.jump(n.p.id); }
    });
    svg.addEventListener('pointercancel', () => { dragging = null; });

    // Physics
    let heat = 1;
    const stepPhysics = () => {
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        let dx = a.x - b.x, dy = a.y - b.y;
        let d2 = dx * dx + dy * dy; if (d2 < 1) { dx = Math.random() - .5; dy = Math.random() - .5; d2 = 1; }
        const d = Math.sqrt(d2); const f = Math.min(9, 34000 / d2);
        const fx = (dx / d) * f, fy = (dy / d) * f;
        a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
      }
      edges.forEach(e => {
        const dx = e.b.x - e.a.x, dy = e.b.y - e.a.y;
        const d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const f = (d - 185) * 0.012;
        e.a.vx += (dx / d) * f; e.a.vy += (dy / d) * f;
        e.b.vx -= (dx / d) * f; e.b.vy -= (dy / d) * f;
      });
      nodes.forEach(n => {
        n.vx += (cx - n.x) * 0.004; n.vy += (cy - n.y) * 0.004;
        if (n.drag) return;
        n.vx *= 0.86; n.vy *= 0.86;
        n.x += n.vx * heat; n.y += n.vy * heat;
        n.x = Math.max(56, Math.min(W - 56, n.x));
        n.y = Math.max(72, Math.min(H - 84, n.y));
      });
      heat = Math.max(0.06, heat * 0.995);
    };
    for (let k = 0; k < 90; k++) stepPhysics();

    const render = () => {
      edges.forEach((e, i) => {
        const ln = edgeEls[i];
        ln.setAttribute('x1', e.a.x); ln.setAttribute('y1', e.a.y);
        ln.setAttribute('x2', e.b.x); ln.setAttribute('y2', e.b.y);
        const lit = !hover || e.a.p.id === hover || e.b.p.id === hover;
        ln.setAttribute('opacity', hover ? (lit ? '1' : '.08') : '.75');
      });
      nodes.forEach((n, i) => {
        nodeEls[i].setAttribute('transform', 'translate(' + n.x.toFixed(1) + ' ' + n.y.toFixed(1) + ')');
        const lit = !hover || n.p.id === hover || (neighbors[hover] && neighbors[hover][n.p.id]);
        nodeEls[i].setAttribute('opacity', lit ? '1' : '.14');
      });
    };

    const loop = () => {
      if (host.style.display === 'none' || !document.body.contains(svg)) return;
      stepPhysics(); render();
      raf = requestAnimationFrame(loop);
    };

    card.querySelector('.nb-shake').onclick = () => { heat = 1.4; nodes.forEach(n => { n.vx += (Math.random() - .5) * 26; n.vy += (Math.random() - .5) * 26; }); };
    card.querySelector('.nb-close').onclick = close;

    render(); loop();
  }

  function close() {
    const el = document.getElementById('fl-atlas');
    if (el) el.style.display = 'none';
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  return { build, close };
})();
