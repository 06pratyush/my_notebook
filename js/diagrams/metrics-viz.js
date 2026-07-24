/**
 * metrics-viz.js — Scatter plot with regression line, residuals, and live metric readout.
 * Renders into [data-diagram="metrics-viz"] containers.
 */
window.NBMetricsViz = (() => {

  const INK = '#16150f', ACCENT = '#6b675a', WARM = '#8b4513', PARCH = '#fcfbf7';

  function renderAll() {
    document.querySelectorAll('[data-diagram="metrics-viz"]').forEach(render);
  }

  function render(el) {
    el.innerHTML = '';

    /* ── Mock data ── */
    const raw = [
      [1,6.2],[1.8,7.9],[2.3,9.1],[2.8,8.4],[3.2,11.0],[3.9,12.8],
      [4.3,13.5],[4.8,14.1],[5.4,16.2],[5.9,17.0],[6.5,18.3],
      [7.0,19.8],[7.4,21.1],[7.9,20.5],[8.3,23.0]
    ];
    const data = raw.map(([x, y]) => ({ x, y }));
    const n = data.length;

    /* ── Linear regression ── */
    const sx  = data.reduce((s, d) => s + d.x, 0);
    const sy  = data.reduce((s, d) => s + d.y, 0);
    const sxy = data.reduce((s, d) => s + d.x * d.y, 0);
    const sx2 = data.reduce((s, d) => s + d.x * d.x, 0);
    const my  = sy / n, mx = sx / n;
    const b = (n * sxy - sx * sy) / (n * sx2 - sx * sx);
    const a = my - b * mx;

    const pred  = d => b * d.x + a;
    const resid = d => d.y - pred(d);

    /* ── Metrics ── */
    const ssRes = data.reduce((s, d) => s + resid(d) ** 2, 0);
    const ssTot = data.reduce((s, d) => s + (d.y - my) ** 2, 0);
    const R2    = 1 - ssRes / ssTot;
    const MSE   = ssRes / n;
    const RMSE  = Math.sqrt(MSE);
    const MAE   = data.reduce((s, d) => s + Math.abs(resid(d)), 0) / n;
    const num   = data.reduce((s, d) => s + (d.x - mx) * (d.y - my), 0);
    const r     = num / (Math.sqrt(data.reduce((s, d) => s + (d.x - mx) ** 2, 0))
                        * Math.sqrt(ssTot));

    /* ── Layout ── */
    const W = 820, H = 370;
    const pad = { t: 28, r: 195, b: 44, l: 52 };
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
    const xDom = [0, 9.5], yDom = [0, 26];
    const X = v => pad.l + (v - xDom[0]) / (xDom[1] - xDom[0]) * pw;
    const Y = v => pad.t + ph - (v - yDom[0]) / (yDom[1] - yDom[0]) * ph;

    /* ── SVG ── */
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('width', '100%');
    svg.style.cssText = 'display:block; margin:0 auto; font-family:"IM Fell English",serif; max-width:820px;';
    el.appendChild(svg);

    const ns = (tag, attrs) => {
      const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
      for (const k in attrs) e.setAttribute(k, attrs[k]);
      return e;
    };

    /* ── Grid ── */
    for (let xv = 1; xv <= 9; xv++) {
      svg.appendChild(ns('line', { x1: X(xv), y1: pad.t, x2: X(xv), y2: pad.t + ph,
        stroke: INK, 'stroke-width': .3, 'stroke-dasharray': '2 4', opacity: .25 }));
      const t = ns('text', { x: X(xv), y: pad.t + ph + 18, 'text-anchor': 'middle',
        fill: ACCENT, 'font-size': 11, 'font-family': '"IM Fell English SC",serif' });
      t.textContent = xv; svg.appendChild(t);
    }
    for (let yv = 5; yv <= 25; yv += 5) {
      svg.appendChild(ns('line', { x1: pad.l, y1: Y(yv), x2: pad.l + pw, y2: Y(yv),
        stroke: INK, 'stroke-width': .3, 'stroke-dasharray': '2 4', opacity: .25 }));
      const t = ns('text', { x: pad.l - 10, y: Y(yv) + 4, 'text-anchor': 'end',
        fill: ACCENT, 'font-size': 11, 'font-family': '"IM Fell English SC",serif' });
      t.textContent = yv; svg.appendChild(t);
    }

    /* ── Axes ── */
    svg.appendChild(ns('line', { x1: pad.l, y1: pad.t + ph, x2: pad.l + pw, y2: pad.t + ph, stroke: INK, 'stroke-width': 1.2 }));
    svg.appendChild(ns('line', { x1: pad.l, y1: pad.t, x2: pad.l, y2: pad.t + ph, stroke: INK, 'stroke-width': 1.2 }));

    const xLab = ns('text', { x: pad.l + pw / 2, y: H - 6, 'text-anchor': 'middle', fill: ACCENT, 'font-size': 13, 'font-style': 'italic' });
    xLab.textContent = 'x'; svg.appendChild(xLab);
    const yLab = ns('text', { x: 14, y: pad.t + ph / 2, 'text-anchor': 'middle', fill: ACCENT, 'font-size': 13, 'font-style': 'italic', transform: 'rotate(-90 14 ' + (pad.t + ph / 2) + ')' });
    yLab.textContent = 'y'; svg.appendChild(yLab);

    /* ── Regression line ── */
    svg.appendChild(ns('line', {
      x1: X(xDom[0]), y1: Y(pred({ x: xDom[0] })), x2: X(xDom[1]), y2: Y(pred({ x: xDom[1] })),
      stroke: ACCENT, 'stroke-width': 1.8
    }));

    /* ── Residuals ── */
    const residEls = [];
    data.forEach(d => {
      const l = ns('line', {
        x1: X(d.x), y1: Y(d.y), x2: X(d.x), y2: Y(pred(d)),
        stroke: WARM, 'stroke-width': 1.1, 'stroke-dasharray': '3 3', opacity: .45
      });
      svg.appendChild(l);
      residEls.push(l);
    });

    /* ── Data points ── */
    const dotEls = [];
    data.forEach((d, i) => {
      const c = ns('circle', { cx: X(d.x), cy: Y(d.y), r: 4.5,
        fill: PARCH, stroke: INK, 'stroke-width': 1.6, style: 'cursor:pointer' });
      svg.appendChild(c);
      dotEls.push(c);

      c.addEventListener('mouseenter', () => {
        c.setAttribute('r', 7); c.setAttribute('fill', INK);
        residEls[i].setAttribute('stroke-width', 2.5);
        residEls[i].setAttribute('opacity', .9);
        residEls[i].setAttribute('stroke-dasharray', 'none');
        showDetail(i);
      });
      c.addEventListener('mouseleave', () => {
        c.setAttribute('r', 4.5); c.setAttribute('fill', PARCH);
        residEls[i].setAttribute('stroke-width', 1.1);
        residEls[i].setAttribute('opacity', .45);
        residEls[i].setAttribute('stroke-dasharray', '3 3');
        hideDetail();
      });
    });

    /* ── Metrics panel ── */
    const px = pad.l + pw + 24, py = pad.t + 4;

    svg.appendChild(ns('rect', { x: px - 12, y: py - 8, width: 186, height: n === 0 ? 0 : 260,
      fill: 'none', stroke: INK, 'stroke-width': .7, rx: 2 }));

    const hdr = ns('text', { x: px, y: py + 14, fill: INK, 'font-size': 12,
      'font-family': '"IM Fell English SC",serif', 'letter-spacing': '3' });
    hdr.textContent = 'METRICS'; svg.appendChild(hdr);

    svg.appendChild(ns('line', { x1: px, y1: py + 22, x2: px + 162, y2: py + 22, stroke: INK, 'stroke-width': .4 }));

    const metrics = [
      ['R\u00B2',      R2.toFixed(4)],
      ['MSE',     MSE.toFixed(4)],
      ['RMSE',    RMSE.toFixed(4)],
      ['MAE',     MAE.toFixed(4)],
      ['r',       r.toFixed(4)],
      ['n',       String(n)],
    ];

    const valEls = [];
    metrics.forEach(([label, val], i) => {
      const my = py + 42 + i * 36;
      const lt = ns('text', { x: px, y: my, fill: '#3a382e', 'font-size': 11.5,
        'font-family': '"IM Fell English SC",serif', 'letter-spacing': '1' });
      lt.textContent = label; svg.appendChild(lt);

      const vt = ns('text', { x: px, y: my + 15, fill: INK, 'font-size': 13.5 });
      vt.textContent = val; svg.appendChild(vt);
      valEls.push(vt);

      if (i < metrics.length - 1)
        svg.appendChild(ns('line', { x1: px, y1: my + 25, x2: px + 162, y2: my + 25,
          stroke: INK, 'stroke-width': .25, 'stroke-dasharray': '2 3' }));
    });

    /* ── Equation ── */
    const eqY = py + 42 + metrics.length * 36 + 8;
    const eq = ns('text', { x: px, y: eqY, fill: ACCENT, 'font-size': 12, 'font-style': 'italic' });
    eq.textContent = 'y = ' + b.toFixed(2) + 'x + ' + a.toFixed(2);
    svg.appendChild(eq);

    /* ── Detail line (hover) ── */
    const detail = ns('text', { x: px, y: eqY + 20, fill: WARM, 'font-size': 11, 'font-style': 'italic', opacity: 0 });
    svg.appendChild(detail);

    function showDetail(i) {
      const d = data[i], r = resid(d);
      detail.textContent = 'residual = ' + r.toFixed(2) + (r > 0 ? ' (above)' : ' (below)');
      detail.setAttribute('opacity', 1);
    }
    function hideDetail() { detail.setAttribute('opacity', 0); }
  }

  return { renderAll };
})();
