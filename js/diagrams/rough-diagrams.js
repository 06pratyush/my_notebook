/**
 * rough-diagrams.js — Hand-drawn diagrams using Rough.js
 * Renders into .diagram-container elements that have a data-diagram attribute.
 */
window.NBRoughDiagrams = (() => {
  function renderAll() {
    document.querySelectorAll('[data-diagram]').forEach(container => {
      const id = container.getAttribute('data-diagram');
      if (id === 'ml001') drawPipeline(container);
      else if (id === 'ml002') drawTypesTree(container);
    });
  }

  function drawPipeline(container) {
    const W = 740, H = 320;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('width', '100%');
    container.appendChild(svg);

    const rc = rough.svg(svg);
    const boxStyle = { fill: '#fcfbf7', stroke: '#16150f', strokeWidth: 1.5, roughness: 1.5, fillStyle: 'solid' };
    const textStyle = 'font-family: IM Fell English SC, serif; font-size: 12px; fill: #16150f; text-anchor: middle; letter-spacing: 1px;';

    const boxes = [
      { x: 20, y: 125, w: 100, h: 50, label: 'DATASET' },
      { x: 190, y: 45, w: 120, h: 50, label: 'TRAIN 70%' },
      { x: 190, y: 215, w: 120, h: 50, label: 'TEST 30%' },
      { x: 390, y: 45, w: 130, h: 50, label: 'MODEL BUILD' },
      { x: 600, y: 45, w: 120, h: 50, label: 'PREDICT' },
      { x: 420, y: 215, w: 120, h: 50, label: 'EVALUATE' },
      { x: 620, y: 215, w: 100, h: 50, label: 'DEPLOY' },
    ];

    boxes.forEach(b => {
      svg.appendChild(rc.rectangle(b.x, b.y, b.w, b.h, boxStyle));
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', b.x + b.w / 2); t.setAttribute('y', b.y + b.h / 2 + 4);
      t.setAttribute('style', textStyle); t.textContent = b.label;
      svg.appendChild(t);
    });

    const arrowStyle = { stroke: '#16150f', strokeWidth: 1.2, roughness: 1 };
    const arrows = [
      [120, 150, 190, 70],    // DATASET → TRAIN
      [120, 150, 190, 240],   // DATASET → TEST
      [310, 70, 390, 70],     // TRAIN → MODEL BUILD
      [520, 70, 600, 70],     // MODEL BUILD → PREDICT
      [660, 95, 480, 215],    // PREDICT → EVALUATE
      [310, 240, 420, 240],   // TEST → EVALUATE
      [540, 240, 620, 240],   // EVALUATE → DEPLOY
      [480, 215, 455, 95],    // EVALUATE → MODEL BUILD (fail, dashed)
    ];
    arrows.forEach(([x1, y1, x2, y2], i) => {
      const style = i === arrows.length - 1
        ? { ...arrowStyle, strokeLineDash: [6, 4] }
        : arrowStyle;
      svg.appendChild(rc.line(x1, y1, x2, y2, style));
      // Arrowhead
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const ax = x2 - 8 * Math.cos(angle - 0.4), ay = y2 - 8 * Math.sin(angle - 0.4);
      const bx = x2 - 8 * Math.cos(angle + 0.4), by = y2 - 8 * Math.sin(angle + 0.4);
      svg.appendChild(rc.line(x2, y2, ax, ay, style));
      svg.appendChild(rc.line(x2, y2, bx, by, style));
    });

    // Label: "fail → retrain"
    const failT = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    failT.setAttribute('x', 430); failT.setAttribute('y', 155);
    failT.setAttribute('style', 'font-family: IM Fell English, serif; font-size: 11px; fill: #6b675a; font-style: italic; text-anchor: middle;');
    failT.textContent = 'fail → retrain'; svg.appendChild(failT);
  }

  function drawTypesTree(container) {
    const W = 700, H = 300;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('width', W); svg.setAttribute('height', H);
    container.appendChild(svg);

    const rc = rough.svg(svg);
    const boxStyle = { fill: '#fcfbf7', stroke: '#16150f', strokeWidth: 1.5, roughness: 1.5, fillStyle: 'solid' };
    const textStyle = 'font-family: IM Fell English SC, serif; font-size: 12px; fill: #16150f; text-anchor: middle; letter-spacing: 1px;';
    const subStyle = 'font-family: IM Fell English, serif; font-size: 11px; fill: #6b675a; text-anchor: middle; font-style: italic;';

    // Root
    svg.appendChild(rc.rectangle(270, 20, 160, 45, boxStyle));
    const rootT = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    rootT.setAttribute('x', 350); rootT.setAttribute('y', 48);
    rootT.setAttribute('style', textStyle); rootT.textContent = 'MACHINE LEARNING';
    svg.appendChild(rootT);

    const children = [
      { x: 60, y: 130, w: 150, h: 45, label: 'SUPERVISED', sub: 'labelled data', cx: 350 },
      { x: 275, y: 130, w: 150, h: 45, label: 'UNSUPERVISED', sub: 'unlabelled data', cx: 350 },
      { x: 490, y: 130, w: 150, h: 45, label: 'REINFORCEMENT', sub: 'agent + rewards', cx: 350 },
    ];

    const lineStyle = { stroke: '#16150f', strokeWidth: 1, roughness: 1 };
    children.forEach(ch => {
      svg.appendChild(rc.rectangle(ch.x, ch.y, ch.w, ch.h, boxStyle));
      svg.appendChild(rc.line(ch.cx, 65, ch.x + ch.w / 2, ch.y, lineStyle));
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', ch.x + ch.w / 2); t.setAttribute('y', ch.y + 20);
      t.setAttribute('style', textStyle); t.textContent = ch.label;
      svg.appendChild(t);
      const s = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      s.setAttribute('x', ch.x + ch.w / 2); s.setAttribute('y', ch.y + 36);
      s.setAttribute('style', subStyle); s.textContent = ch.sub;
      svg.appendChild(s);
    });

    // Examples
    const examples = [
      { x: 60, y: 220, text: 'Classification, Regression' },
      { x: 275, y: 220, text: 'Clustering, PCA' },
      { x: 490, y: 220, text: 'Game AI, Robotics' },
    ];
    examples.forEach(ex => {
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', ex.x + 75); t.setAttribute('y', ex.y);
      t.setAttribute('style', subStyle); t.textContent = ex.text;
      svg.appendChild(t);
      svg.appendChild(rc.line(ex.x + 75, 175, ex.x + 75, ex.y - 8, { stroke: '#6b675a', strokeWidth: .5, roughness: .5 }));
    });
  }

  return { renderAll };
})();
