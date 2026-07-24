/**
 * d3-plots.js — Data visualizations using D3.js
 * Renders into .diagram-container elements with data-diagram="ml003" or "ml004".
 */
window.NBD3Plots = (() => {
  function renderAll() {
    document.querySelectorAll('[data-diagram]').forEach(container => {
      const id = container.getAttribute('data-diagram');
      if (id === 'ml003') drawRegression(container);
      else if (id === 'ml004') drawResiduals(container);
    });
  }

  function drawRegression(container) {
    const W = 600, H = 320, M = { t: 30, r: 30, b: 50, l: 60 };
    const w = W - M.l - M.r, h = H - M.t - M.b;

    const svg = d3.select(container).append('svg')
      .attr('viewBox', '0 0 ' + W + ' ' + H)
      .attr('width', W).attr('height', H);
    const g = svg.append('g').attr('transform', 'translate(' + M.l + ',' + M.t + ')');

    const data = [
      {x:0,y:0},{x:1,y:2},{x:2,y:5},{x:3,y:9},{x:4,y:15},{x:5,y:21}
    ];
    const x = d3.scaleLinear().domain([0, 5.5]).range([0, w]);
    const y = d3.scaleLinear().domain([0, 24]).range([h, 0]);

    // Axes
    g.append('g').attr('transform', 'translate(0,' + h + ')').call(d3.axisBottom(x).ticks(6))
      .selectAll('text').style('font-family', 'IM Fell English SC, serif').style('font-size', '11px');
    g.append('g').call(d3.axisLeft(y).ticks(6))
      .selectAll('text').style('font-family', 'IM Fell English SC, serif').style('font-size', '11px');

    g.append('text').attr('x', w / 2).attr('y', h + 40).attr('text-anchor', 'middle')
      .style('font-family', 'IM Fell English SC, serif').style('font-size', '12px').style('fill', '#6b675a').text('x');
    g.append('text').attr('transform', 'rotate(-90)').attr('x', -h / 2).attr('y', -45).attr('text-anchor', 'middle')
      .style('font-family', 'IM Fell English SC, serif').style('font-size', '12px').style('fill', '#6b675a').text('y');

    // Regression line (y = 4x - 2 roughly)
    const lineData = [{x:0,y:-2},{x:5.5,y:20}];
    const line = d3.line().x(d => x(d.x)).y(d => y(d.y));
    g.append('path').datum(lineData).attr('d', line).attr('fill', 'none')
      .attr('stroke', '#16150f').attr('stroke-width', 1.5).attr('stroke-dasharray', '6 3');

    // Residual lines
    data.forEach(d => {
      const pred = 4 * d.x - 2;
      g.append('line')
        .attr('x1', x(d.x)).attr('y1', y(d.y))
        .attr('x2', x(d.x)).attr('y2', y(Math.max(0, pred)))
        .attr('stroke', '#a00').attr('stroke-width', 1).attr('stroke-dasharray', '3 2').attr('opacity', .6);
    });

    // Data points
    g.selectAll('.dot').data(data).enter().append('circle')
      .attr('cx', d => x(d.x)).attr('cy', d => y(d.y)).attr('r', 5)
      .attr('fill', '#fcfbf7').attr('stroke', '#16150f').attr('stroke-width', 1.8);

    // Label
    g.append('text').attr('x', w - 10).attr('y', 10).attr('text-anchor', 'end')
      .style('font-family', 'IM Fell English, serif').style('font-size', '13px').style('fill', '#6b675a').style('font-style', 'italic')
      .text('ŷ = mx + c · residuals in red');
  }

  function drawResiduals(container) {
    const W = 700, H = 300;
    const svg = d3.select(container).append('svg')
      .attr('viewBox', '0 0 ' + W + ' ' + H)
      .attr('width', W).attr('height', H);

    // Two side-by-side plots
    const plotW = 280, plotH = 200, gap = 60, startY = 60;
    const labels = ['Homoscedastic', 'Heteroscedastic'];
    const offsets = [(W - 2 * plotW - gap) / 2, (W - 2 * plotW - gap) / 2 + plotW + gap];

    labels.forEach((label, idx) => {
      const ox = offsets[idx], oy = startY;
      const pg = svg.append('g').attr('transform', 'translate(' + ox + ',' + oy + ')');

      const x = d3.scaleLinear().domain([0, 10]).range([0, plotW]);
      const y = d3.scaleLinear().domain([-8, 8]).range([plotH, 0]);

      pg.append('g').attr('transform', 'translate(0,' + plotH + ')').call(d3.axisBottom(x).ticks(5))
        .selectAll('text').style('font-family', 'IM Fell English SC, serif').style('font-size', '10px');
      pg.append('g').call(d3.axisLeft(y).ticks(5))
        .selectAll('text').style('font-family', 'IM Fell English SC, serif').style('font-size', '10px');

      // Zero line
      pg.append('line').attr('x1', 0).attr('x2', plotW).attr('y1', y(0)).attr('y2', y(0))
        .attr('stroke', '#16150f').attr('stroke-width', .8).attr('stroke-dasharray', '4 3');

      // Generate data
      const pts = [];
      for (let i = 0; i < 40; i++) {
        const xv = Math.random() * 9 + 0.5;
        let noise;
        if (idx === 0) {
          noise = (Math.random() - 0.5) * 4; // constant variance
        } else {
          noise = (Math.random() - 0.5) * xv * 1.2; // fan shape
        }
        pts.push({ x: xv, y: noise });
      }

      pg.selectAll('.dot').data(pts).enter().append('circle')
        .attr('cx', d => x(d.x)).attr('cy', d => y(d.y)).attr('r', 3.5)
        .attr('fill', idx === 0 ? '#16150f' : '#a00').attr('opacity', .7);

      // Title
      pg.append('text').attr('x', plotW / 2).attr('y', -12).attr('text-anchor', 'middle')
        .style('font-family', 'IM Fell English SC, serif').style('font-size', '13px').style('fill', '#16150f').style('letter-spacing', '1px')
        .text(label);

      // Axis labels
      pg.append('text').attr('x', plotW / 2).attr('y', plotH + 38).attr('text-anchor', 'middle')
        .style('font-family', 'IM Fell English, serif').style('font-size', '11px').style('fill', '#6b675a').style('font-style', 'italic')
        .text('x (input)');
      if (idx === 0) {
        pg.append('text').attr('transform', 'rotate(-90)').attr('x', -plotH / 2).attr('y', -42).attr('text-anchor', 'middle')
          .style('font-family', 'IM Fell English, serif').style('font-size', '11px').style('fill', '#6b675a').style('font-style', 'italic')
          .text('residuals');
      }
    });
  }

  return { renderAll };
})();
