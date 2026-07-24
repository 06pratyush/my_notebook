/**
 * orrery.js — Orbital view of passages by proximity.
 */
window.NBOrrery = (() => {
  let raf = null;

  function build(host, passages) {
    host.innerHTML = '';
    const W = 1000, H = 700, cx = 500, cy = 358;
    const card = document.createElement('div');
    card.className = 'fl-overlay-card';
    card.innerHTML = '<div class="fl-overlay-inner"></div>'
      + '<div class="fl-overlay-head"><div class="fl-overlay-head-title">The Orrery — Passages in Orbit</div>'
      + '<div class="fl-overlay-ctrls"><button class="fl-btn nb-close">Close ✕</button></div></div>'
      + '<div class="fl-overlay-hint">Click a body to descend to its passage.</div>';
    host.appendChild(card);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%');
    card.insertBefore(svg, card.children[2]);

    // Rings
    const ringR = 140;
    [1, 1.6, 2.2].forEach(r => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      el.setAttribute('cx', cx); el.setAttribute('cy', cy);
      el.setAttribute('rx', ringR * r * 1.45); el.setAttribute('ry', ringR * r * .8);
      el.setAttribute('fill', 'none'); el.setAttribute('stroke', '#16150f');
      el.setAttribute('stroke-width', '.7'); el.setAttribute('stroke-dasharray', '2 4'); el.setAttribute('opacity', '.4');
      svg.appendChild(el);
    });

    // Heart
    const h1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    h1.setAttribute('cx', cx); h1.setAttribute('cy', cy); h1.setAttribute('r', 26);
    h1.setAttribute('fill', 'none'); h1.setAttribute('stroke', '#16150f'); h1.setAttribute('stroke-width', '1.6');
    svg.appendChild(h1);
    const h2 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    h2.setAttribute('x', cx); h2.setAttribute('y', cy + 7); h2.setAttribute('text-anchor', 'middle');
    h2.setAttribute('font-size', '20'); h2.setAttribute('fill', '#16150f'); h2.textContent = '❦';
    svg.appendChild(h2);

    // Bodies
    const bodies = passages.map((p, i) => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.style.cursor = 'pointer';
      const r = 9;
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('r', r); c.setAttribute('fill', '#fcfbf7');
      c.setAttribute('stroke', '#16150f'); c.setAttribute('stroke-width', '1.5');
      const tx = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      const short = p.title.length > 24 ? p.title.slice(0, 22) + '…' : p.title;
      tx.setAttribute('x', 0); tx.setAttribute('y', r + 16); tx.setAttribute('text-anchor', 'middle');
      tx.setAttribute('fill', '#16150f'); tx.setAttribute('font-family', 'IM Fell English, serif'); tx.setAttribute('font-size', '13');
      tx.textContent = short;
      g.appendChild(c); g.appendChild(tx);
      g.onclick = () => { close(); NBNav.jump(p.id); };
      svg.appendChild(g);
      const ring = 100 + (i % 3) * 80;
      return { g, ring, speed: 0.0001 + (i % 3) * 0.00005, base: (i / passages.length) * Math.PI * 2 };
    });

    const t0 = performance.now();
    const loop = (t) => {
      if (host.style.display === 'none' || !document.body.contains(svg)) return;
      bodies.forEach(b => {
        const a = b.base + (t - t0) * b.speed;
        const x = cx + b.ring * 1.45 * Math.cos(a), y = cy + b.ring * .8 * Math.sin(a);
        b.g.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')');
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    card.querySelector('.nb-close').onclick = close;
  }

  function close() {
    const el = document.getElementById('fl-orrery');
    if (el) el.style.display = 'none';
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  return { build, close };
})();
