// ============================================================
// Pokémon Stats Dashboard — main.js
// ECS 163 Homework 2  |  rlsayar
//
// Three views (focus + context paradigm):
//   1. Horizontal bar chart        — context / overview of type distribution
//   2. Attack vs Defense scatter   — focus: individual, type-average, or k-means
//   3. Parallel Coordinates        — advanced focus: individual, type-average, or k-means
//
// All three share a global type-color palette and a single clickable
// type legend that filters every view simultaneously.
// ============================================================

// ── Shared type color palette ────────────────────────────────
// Official Pokémon type colors, used consistently across all views
const TYPE_COLORS = {
  Normal:   '#A8A77A', Fire:     '#EE8130', Water:    '#6390F0',
  Electric: '#F7D02C', Grass:    '#7AC74C', Ice:      '#96D9D6',
  Fighting: '#C22E28', Poison:   '#A33EA1', Ground:   '#E2BF65',
  Flying:   '#A98FF3', Psychic:  '#F95587', Bug:      '#A6B91A',
  Rock:     '#B6A136', Ghost:    '#735797', Dragon:   '#6F35FC',
  Dark:     '#705746', Steel:    '#B7B7CE', Fairy:    '#D685AD'
};
function typeColor(t) { return TYPE_COLORS[t] ?? '#999'; }
const ALL_TYPES = Object.keys(TYPE_COLORS);

// The six base stats used in the PCP view
const STAT_KEYS   = ['hp', 'attack', 'defense', 'spAtk', 'spDef', 'speed'];
const STAT_LABELS = ['HP', 'Attack', 'Defense', 'Sp.Atk', 'Sp.Def', 'Speed'];

// Five distinct colors for k-means cluster lines / dots
const CLUSTER_COLORS = ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00'];

// Returns the rendered pixel size of a container element
function dims(id) {
  const el = document.getElementById(id);
  const r  = el.getBoundingClientRect();
  return { w: r.width || el.offsetWidth, h: r.height || el.offsetHeight };
}

// ── Global state ──────────────────────────────────────────────
const activeTypes = new Set(ALL_TYPES); // shared type filter across all views
let scatterMode = 'all';   // 'all' | 'type' | 'kmeans'
let pcpMode     = 'all';   // 'all' | 'type' | 'kmeans'
let pokemonData = [];
const updaters  = { bar: null, scatter: null, pcp: null };

// ── Global type toggle ────────────────────────────────────────
// Toggles a type in activeTypes and propagates to every chart updater.
function toggleType(type, itemG) {
  if (activeTypes.has(type)) {
    activeTypes.delete(type);
    itemG.classed('inactive', true);
  } else {
    activeTypes.add(type);
    itemG.classed('inactive', false);
  }
  if (updaters.bar)     updaters.bar();
  if (updaters.scatter) updaters.scatter();
  if (updaters.pcp)     updaters.pcp();
}

// ── Mode switches ─────────────────────────────────────────────
// Redraw only the affected panel when a toggle button is clicked.
function setScatterMode(mode) {
  scatterMode = mode;
  document.querySelectorAll('#scatter-controls .toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  document.getElementById('scatter-plot').innerHTML = '';
  drawScatter(pokemonData);
}

function setPCPMode(mode) {
  pcpMode = mode;
  document.querySelectorAll('#pcp-controls .toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  document.getElementById('pcp-chart').innerHTML = '';
  drawPCP(pokemonData);
}

// ── K-Means clustering ────────────────────────────────────────
// Groups all Pokémon into k clusters using their six normalized base stats.
// Returns { centroids: [{hp,attack,…,cluster,count,name,topTypes}], labels }
function kMeans(data, k, maxIter = 80) {
  const ranges = STAT_KEYS.map(key => ({
    min: d3.min(data, d => d[key]),
    max: d3.max(data, d => d[key])
  }));
  const norm = (val, i) =>
    (val - ranges[i].min) / Math.max(ranges[i].max - ranges[i].min, 1);

  const pts = data.map(d => STAT_KEYS.map((key, i) => norm(d[key], i)));
  let cents = Array.from({ length: k }, (_, ci) =>
    [...pts[Math.floor((ci / k) * pts.length)]]
  );
  let labels = new Array(pts.length).fill(0);

  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;
    pts.forEach((p, i) => {
      let best = 0, bestD = Infinity;
      cents.forEach((c, j) => {
        const d2 = p.reduce((s, v, di) => s + (v - c[di]) ** 2, 0);
        if (d2 < bestD) { bestD = d2; best = j; }
      });
      if (labels[i] !== best) { changed = true; labels[i] = best; }
    });
    if (!changed) break;
    cents = cents.map((prev, ci) => {
      const members = pts.filter((_, i) => labels[i] === ci);
      if (!members.length) return prev;
      return STAT_KEYS.map((_, di) => d3.mean(members, p => p[di]));
    });
  }

  // Descriptive cluster names based on the dominant stat
  const statName = {
    hp: 'Bulky', attack: 'Physical Atk', defense: 'Physical Wall',
    spAtk: 'Special Atk', spDef: 'Special Wall', speed: 'Swift'
  };

  const centroids = cents.map((c, ci) => {
    const stats = Object.fromEntries(
      STAT_KEYS.map((key, i) => [key, c[i] * (ranges[i].max - ranges[i].min) + ranges[i].min])
    );
    const top = STAT_KEYS.reduce((a, b) => stats[a] > stats[b] ? a : b);
    const members = data.filter((_, i) => labels[i] === ci);
    const tc = d3.rollup(members, v => v.length, d => d.type1);
    return {
      cluster: ci,
      count: members.length,
      name: `C${ci + 1}: ${statName[top]}`,
      topTypes: Array.from(tc, ([t, n]) => ({ t, n })).sort((a, b) => b.n - a.n).slice(0, 4),
      ...stats
    };
  });

  return { centroids, labels };
}

// ── Redraw all ────────────────────────────────────────────────
function redrawAll() {
  document.getElementById('bar-chart').innerHTML    = '';
  document.getElementById('scatter-plot').innerHTML = '';
  document.getElementById('pcp-chart').innerHTML    = '';
  d3.selectAll('.tooltip').remove();
  drawBarChart(pokemonData);
  drawScatter(pokemonData);
  drawPCP(pokemonData);
}

d3.csv('data/pokemon.csv', r => ({
  id:         +r.ID,         name:   r.Name,
  form:        r.Form.trim(), type1:  r.Type1,  type2: r.Type2.trim(),
  total:      +r.Total,
  hp:         +r.HP,         attack: +r.Attack, defense: +r.Defense,
  spAtk:      +r['Sp. Atk'], spDef:  +r['Sp. Def'], speed: +r.Speed,
  generation: +r.Generation
})).then(raw => {
  const seen = new Set();
  pokemonData = raw.filter(d => { if (seen.has(d.name)) return false; seen.add(d.name); return true; });
  requestAnimationFrame(redrawAll);
});

let resizeTimer;
window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(redrawAll, 150); });

// ─────────────────────────────────────────────────────────────
// View 1 — Horizontal Bar Chart  (Context / Overview)
// ─────────────────────────────────────────────────────────────
function drawBarChart(data) {
  const { w: W, h: H } = dims('bar-chart');
  const m  = { top: 8, right: 48, bottom: 32, left: 88 };
  const iW = W - m.left - m.right;
  const iH = H - m.top  - m.bottom;

  const svg = d3.select('#bar-chart').append('svg').attr('width', W).attr('height', H);
  const g   = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);

  const counts = Array.from(
    d3.rollup(data, v => v.length, d => d.type1),
    ([type, count]) => ({ type, count })
  ).sort((a, b) => b.count - a.count);

  const yScale = d3.scaleBand().domain(counts.map(d => d.type)).range([0, iH]).padding(0.22);
  const xScale = d3.scaleLinear().domain([0, d3.max(counts, d => d.count)]).range([0, iW]).nice();

  // Vertical grid lines
  g.selectAll('.x-grid').data(xScale.ticks(5)).join('line')
    .attr('class', 'x-grid')
    .attr('x1', d => xScale(d)).attr('x2', d => xScale(d))
    .attr('y1', 0).attr('y2', iH)
    .attr('stroke', '#eee').attr('stroke-dasharray', '3,3');

  // Bars — filled with the type's canonical color
  const bars = g.selectAll('.bar').data(counts).join('rect')
    .attr('class', 'bar')
    .attr('x', 0).attr('y', d => yScale(d.type))
    .attr('width', d => xScale(d.count)).attr('height', yScale.bandwidth())
    .attr('fill', d => typeColor(d.type)).attr('rx', 3);

  // Count labels to the right of each bar
  const barLabels = g.selectAll('.bar-label').data(counts).join('text')
    .attr('class', 'bar-label')
    .attr('x', d => xScale(d.count) + 4)
    .attr('y', d => yScale(d.type) + yScale.bandwidth() / 2)
    .attr('dy', '0.35em').attr('fill', '#555').attr('font-size', '11px')
    .text(d => d.count);

  // Y axis — type names
  const yAxis = g.append('g').attr('class', 'axis y-axis')
    .call(d3.axisLeft(yScale).tickSize(0).tickPadding(6))
    .call(a => a.select('.domain').remove());
  yAxis.selectAll('text').attr('fill', '#333').attr('font-size', '11px').attr('font-weight', '600');

  // X axis
  g.append('g').attr('class', 'axis x-axis')
    .attr('transform', `translate(0,${iH})`)
    .call(d3.axisBottom(xScale).ticks(5))
    .call(a => a.select('.domain').attr('stroke', '#ccc'))
    .selectAll('text').attr('fill', '#555');

  // X axis label
  g.append('text').attr('class', 'axis-label')
    .attr('x', iW / 2).attr('y', iH + 28)
    .attr('text-anchor', 'middle').attr('fill', '#777').attr('font-size', '11px')
    .text('Number of Pokémon (base forms only)');

  // Filter updater: fade inactive types
  updaters.bar = () => {
    bars.attr('opacity', d => activeTypes.has(d.type) ? 1 : 0.07);
    barLabels.attr('opacity', d => activeTypes.has(d.type) ? 1 : 0);
    yAxis.selectAll('.tick').attr('opacity', function(d) {
      return activeTypes.has(d) ? 1 : 0.15;
    });
  };
}

// ─────────────────────────────────────────────────────────────
// View 2 — Attack vs Defense Scatter  (Focus)
//
// Three modes (toggled by buttons above the panel):
//   'all'    — one dot per Pokémon, color = type, size = total stat
//   'type'   — one labeled dot per type at avg Attack / avg Defense
//   'kmeans' — five labeled cluster centroid dots
//
// The type legend is always shown on the right; clicking filters all views.
// ─────────────────────────────────────────────────────────────
function drawScatter(data) {
  const { w: W, h: H } = dims('scatter-plot');
  const m  = { top: 10, right: 152, bottom: 46, left: 52 };
  const iW = W - m.left - m.right;
  const iH = H - m.top  - m.bottom;

  // Shared floating tooltip
  const tip = d3.select('body')
    .selectAll('.tooltip').data([null]).join('div')
    .attr('class', 'tooltip').style('opacity', 0);

  const svg = d3.select('#scatter-plot').append('svg').attr('width', W).attr('height', H);
  const g   = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);

  // Scales are the same across all three modes so the axes don't jump
  const xScale = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.attack) + 15]).range([0, iW]);
  const yScale = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.defense) + 15]).range([iH, 0]);
  const rScale = d3.scaleSqrt()
    .domain(d3.extent(data, d => d.total)).range([2.5, 9]);

  // ATK = DEF diagonal reference line
  const refMax = Math.min(d3.max(data, d => d.attack), d3.max(data, d => d.defense));
  g.append('line')
    .attr('x1', xScale(0)).attr('y1', yScale(0))
    .attr('x2', xScale(refMax)).attr('y2', yScale(refMax))
    .attr('stroke', '#ccc').attr('stroke-dasharray', '5,4').attr('stroke-width', 1);
  g.append('text')
    .attr('x', xScale(refMax) - 4).attr('y', yScale(refMax) - 6)
    .attr('fill', '#aaa').attr('font-size', '10px').attr('text-anchor', 'end')
    .text('ATK = DEF');

  // ── Mode: Individual Pokémon ──────────────────────────────
  if (scatterMode === 'all') {
    // One dot per Pokémon; color = primary type, radius = total base stat
    const dots = g.selectAll('.dot').data(data).join('circle')
      .attr('class', 'dot')
      .attr('cx', d => xScale(d.attack)).attr('cy', d => yScale(d.defense))
      .attr('r',  d => rScale(d.total))
      .attr('fill', d => typeColor(d.type1)).attr('opacity', 0.65)
      .attr('stroke', '#fff').attr('stroke-width', 0.4)
      .attr('display', d => activeTypes.has(d.type1) ? null : 'none')
      .on('mouseover', function(event, d) {
        d3.select(this).raise().attr('stroke', '#222').attr('stroke-width', 1.8).attr('opacity', 1);
        tip.transition().duration(100).style('opacity', 0.95);
        tip.html(
          `<strong>${d.name}</strong><br>` +
          `Type: ${d.type1}${d.type2 ? ' / ' + d.type2 : ''}<br>` +
          `ATK&nbsp;${d.attack}&ensp;·&ensp;DEF&nbsp;${d.defense}&ensp;·&ensp;Total&nbsp;${d.total}`
        )
        .style('left', (event.pageX + 14) + 'px').style('top', (event.pageY - 34) + 'px');
      })
      .on('mousemove', event => {
        tip.style('left', (event.pageX + 14) + 'px').style('top', (event.pageY - 34) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this).attr('stroke', '#fff').attr('stroke-width', 0.4).attr('opacity', 0.65);
        tip.transition().duration(150).style('opacity', 0);
      });

    // Size legend below type legend
    const sizeG = g.append('g').attr('transform', `translate(${iW + 14}, ${9 * 14 + 30})`);
    sizeG.append('text').attr('y', -4)
      .attr('fill', '#555').attr('font-size', '11px').attr('font-weight', '600')
      .text('Total Stats');
    [{ val: 300, label: '300' }, { val: 600, label: '600' }].forEach((s, i) => {
      const rg = sizeG.append('g').attr('transform', `translate(0,${i * 20 + 10})`);
      rg.append('circle').attr('r', rScale(s.val)).attr('cx', rScale(s.val))
        .attr('fill', '#aaa').attr('opacity', 0.8);
      rg.append('text').attr('x', rScale(s.val) * 2 + 4).attr('dy', '0.35em')
        .attr('fill', '#666').attr('font-size', '10px').text(s.label);
    });

    // Filter updater for individual mode
    updaters.scatter = () => {
      dots.attr('display', d => activeTypes.has(d.type1) ? null : 'none');
    };
  }

  // ── Mode: Type Averages ───────────────────────────────────
  if (scatterMode === 'type') {
    // Compute average attack, defense, and total per primary type
    const typeAvgs = Array.from(
      d3.rollup(data, v => ({
        type:    v[0].type1,
        count:   v.length,
        attack:  d3.mean(v, d => d.attack),
        defense: d3.mean(v, d => d.defense),
        total:   d3.mean(v, d => d.total)
      }), d => d.type1),
      ([, avg]) => avg
    );

    // One dot per type at its average attack / defense position
    const typeDots = g.selectAll('.type-dot').data(typeAvgs).join('circle')
      .attr('class', 'type-dot')
      .attr('cx', d => xScale(d.attack)).attr('cy', d => yScale(d.defense))
      .attr('r', 10)
      .attr('fill', d => typeColor(d.type)).attr('opacity', 0.82)
      .attr('stroke', '#fff').attr('stroke-width', 1.5)
      .attr('display', d => activeTypes.has(d.type) ? null : 'none')
      .on('mouseover', function(event, d) {
        d3.select(this).raise().attr('r', 13).attr('opacity', 1);
        tip.transition().duration(100).style('opacity', 0.95);
        tip.html(
          `<strong style="color:${typeColor(d.type)}">${d.type} (avg)</strong><br>` +
          `${d.count} Pokémon<br>` +
          `ATK&nbsp;${d.attack.toFixed(1)}&ensp;·&ensp;DEF&nbsp;${d.defense.toFixed(1)}`
        )
        .style('left', (event.pageX + 14) + 'px').style('top', (event.pageY - 34) + 'px');
      })
      .on('mousemove', event => {
        tip.style('left', (event.pageX + 14) + 'px').style('top', (event.pageY - 34) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this).attr('r', 10).attr('opacity', 0.82);
        tip.transition().duration(150).style('opacity', 0);
      });

    // Type name labels above each dot
    const typeLabels = g.selectAll('.type-label').data(typeAvgs).join('text')
      .attr('class', 'type-label')
      .attr('x', d => xScale(d.attack))
      .attr('y', d => yScale(d.defense) - 13)
      .attr('text-anchor', 'middle')
      .attr('fill', d => typeColor(d.type))
      .attr('font-size', '10px').attr('font-weight', '600')
      .attr('display', d => activeTypes.has(d.type) ? null : 'none')
      .text(d => d.type);

    // Filter updater for type-averages mode
    updaters.scatter = () => {
      typeDots.attr('display',   d => activeTypes.has(d.type) ? null : 'none');
      typeLabels.attr('display', d => activeTypes.has(d.type) ? null : 'none');
    };
  }

  // ── Mode: K-Means Clusters ────────────────────────────────
  if (scatterMode === 'kmeans') {
    // Cluster all Pokémon and plot the centroid attack/defense positions
    const { centroids } = kMeans(data, 5);

    // Bubble size proportional to cluster member count
    const countScale = d3.scaleSqrt()
      .domain([0, d3.max(centroids, d => d.count)]).range([10, 26]);

    // One bubble per cluster centroid
    g.selectAll('.cluster-dot').data(centroids).join('circle')
      .attr('class', 'cluster-dot')
      .attr('cx', d => xScale(d.attack)).attr('cy', d => yScale(d.defense))
      .attr('r', d => countScale(d.count))
      .attr('fill', (_, i) => CLUSTER_COLORS[i]).attr('opacity', 0.75)
      .attr('stroke', '#fff').attr('stroke-width', 2)
      .on('mouseover', function(event, d) {
        const i = centroids.indexOf(d);
        d3.select(this).raise().attr('opacity', 1);
        tip.transition().duration(100).style('opacity', 0.95);
        tip.html(
          `<strong style="color:${CLUSTER_COLORS[i]}">${d.name}</strong><br>` +
          `${d.count} Pokémon<br>` +
          `Top types: ${d.topTypes.map(({ t, n }) => `${t} (${n})`).join(', ')}<br>` +
          `ATK&nbsp;${d.attack.toFixed(1)}&ensp;·&ensp;DEF&nbsp;${d.defense.toFixed(1)}`
        )
        .style('left', (event.pageX + 14) + 'px').style('top', (event.pageY - 34) + 'px');
      })
      .on('mousemove', event => {
        tip.style('left', (event.pageX + 14) + 'px').style('top', (event.pageY - 34) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this).attr('opacity', 0.75);
        tip.transition().duration(150).style('opacity', 0);
      });

    // Cluster name labels
    g.selectAll('.cluster-label').data(centroids).join('text')
      .attr('class', 'cluster-label')
      .attr('x', d => xScale(d.attack))
      .attr('y', d => yScale(d.defense) - countScale(d.count) - 4)
      .attr('text-anchor', 'middle')
      .attr('fill', (_, i) => CLUSTER_COLORS[i])
      .attr('font-size', '10px').attr('font-weight', '700')
      .text(d => d.name);

    // K-Means clusters are not filtered by type
    updaters.scatter = () => {};
  }

  // ── Shared axes (all modes) ───────────────────────────────
  g.append('g').attr('class', 'axis x-axis')
    .attr('transform', `translate(0,${iH})`)
    .call(d3.axisBottom(xScale).ticks(6))
    .call(a => a.select('.domain').attr('stroke', '#ccc'))
    .selectAll('text').attr('fill', '#555');
  g.append('g').attr('class', 'axis y-axis')
    .call(d3.axisLeft(yScale).ticks(6))
    .call(a => a.select('.domain').attr('stroke', '#ccc'))
    .selectAll('text').attr('fill', '#555');
  g.append('text').attr('class', 'axis-label')
    .attr('x', iW / 2).attr('y', iH + 38)
    .attr('text-anchor', 'middle').attr('fill', '#666').attr('font-size', '12px')
    .text('Attack');
  g.append('text').attr('class', 'axis-label')
    .attr('transform', 'rotate(-90)').attr('x', -iH / 2).attr('y', -40)
    .attr('text-anchor', 'middle').attr('fill', '#666').attr('font-size', '12px')
    .text('Defense');

  // ── Type legend (right, always shown, clickable) ──────────
  const legG = g.append('g').attr('transform', `translate(${iW + 14}, 0)`);
  legG.append('text').attr('y', -4)
    .attr('fill', '#555').attr('font-size', '11px').attr('font-weight', '600')
    .text('Type (click to filter)');
  const legColW = 68;
  ALL_TYPES.forEach((type, i) => {
    const col = Math.floor(i / 9);
    const row = i % 9;
    const itemG = legG.append('g')
      .attr('class', `legend-item${activeTypes.has(type) ? '' : ' inactive'}`)
      .attr('transform', `translate(${col * legColW}, ${row * 14 + 8})`);
    itemG.append('circle').attr('r', 5).attr('cx', 5)
      .attr('fill', typeColor(type)).attr('opacity', 0.9);
    itemG.append('text').attr('x', 13).attr('dy', '0.35em')
      .attr('fill', '#333').attr('font-size', '10px').text(type);
    itemG.on('click', () => toggleType(type, itemG));
  });
}

// ─────────────────────────────────────────────────────────────
// View 3 — Parallel Coordinates  (Advanced Focus)
//
// Three modes (toggled by buttons above the panel):
//   'all'    — one semi-transparent line per Pokémon, color = type
//   'type'   — one thick line per type showing average stats
//   'kmeans' — five thick lines showing k-means cluster centroids
// ─────────────────────────────────────────────────────────────
function drawPCP(data) {
  const { w: W, h: H } = dims('pcp-chart');
  const m  = { top: 36, right: 18, bottom: 55, left: 22 };
  const iW = W - m.left - m.right;
  const iH = H - m.top  - m.bottom;

  const tip = d3.select('.tooltip');

  const svg = d3.select('#pcp-chart').append('svg').attr('width', W).attr('height', H);
  const g   = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);

  // Stat dimensions (named statDims to avoid shadowing the global dims() helper)
  const statDims = [
    { key: 'hp',      label: 'HP'      },
    { key: 'attack',  label: 'Attack'  },
    { key: 'spAtk',   label: 'Sp.Atk'  },
    { key: 'defense', label: 'Defense' },
    { key: 'spDef',   label: 'Sp.Def'  },
    { key: 'speed',   label: 'Speed'   }
  ];

  // X scale: evenly spaces the six axes
  const xPos = d3.scalePoint()
    .domain(statDims.map(d => d.key)).range([0, iW]);

  // Shared Y scale across all axes so heights are directly comparable
  const globalMax = d3.max(data, d =>
    Math.max(d.hp, d.attack, d.spAtk, d.defense, d.spDef, d.speed)
  );
  const yOf = {};
  statDims.forEach(dim => {
    yOf[dim.key] = d3.scaleLinear().domain([0, globalMax]).range([iH, 0]);
  });

  // Converts a stat profile into a polyline path across all axes
  const linePath = d3.line();
  function profilePath(d) {
    return linePath(statDims.map(dim => [xPos(dim.key), yOf[dim.key](d[dim.key])]));
  }

  // ── Mode: All Pokémon ─────────────────────────────────────
  if (pcpMode === 'all') {
    // Semi-transparent lines — overlapping density reveals type patterns
    const lines = g.selectAll('.pcp-line').data(data).join('path')
      .attr('class', 'pcp-line')
      .attr('d', profilePath)
      .attr('fill', 'none')
      .attr('stroke', d => typeColor(d.type1))
      .attr('stroke-width', 0.9).attr('opacity', 0.20)
      .attr('display', d => activeTypes.has(d.type1) ? null : 'none')
      .on('mouseover', function(event, d) {
        d3.select(this).raise().attr('stroke-width', 2.8).attr('opacity', 1);
        tip.transition().duration(80).style('opacity', 0.95);
        tip.html(
          `<strong>${d.name}</strong>` +
          `&ensp;<span style="color:${typeColor(d.type1)}">${d.type1}` +
          `${d.type2 ? ' / ' + d.type2 : ''}</span><br>` +
          `HP&nbsp;${d.hp}&ensp;·&ensp;ATK&nbsp;${d.attack}&ensp;·&ensp;DEF&nbsp;${d.defense}<br>` +
          `SpA&nbsp;${d.spAtk}&ensp;·&ensp;SpD&nbsp;${d.spDef}&ensp;·&ensp;SPD&nbsp;${d.speed}`
        )
        .style('left', (event.pageX + 14) + 'px').style('top', (event.pageY - 36) + 'px');
      })
      .on('mousemove', event => {
        tip.style('left', (event.pageX + 14) + 'px').style('top', (event.pageY - 36) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this).attr('stroke-width', 0.9).attr('opacity', 0.20);
        tip.transition().duration(150).style('opacity', 0);
      });

    updaters.pcp = () => {
      lines.attr('display', d => activeTypes.has(d.type1) ? null : 'none');
    };
  }

  // ── Mode: Type Averages ───────────────────────────────────
  if (pcpMode === 'type') {
    // Compute average stats per primary type
    const typeAvgs = Array.from(
      d3.rollup(data, v => ({
        type:  v[0].type1,
        count: v.length,
        ...Object.fromEntries(STAT_KEYS.map(k => [k, d3.mean(v, d => d[k])]))
      }), d => d.type1),
      ([, avg]) => avg
    );

    // One thick line per type, filterable by the global type filter
    const typeLines = g.selectAll('.type-line').data(typeAvgs).join('path')
      .attr('class', 'type-line')
      .attr('d', profilePath)
      .attr('fill', 'none')
      .attr('stroke', d => typeColor(d.type))
      .attr('stroke-width', 2).attr('opacity', 0.80)
      .attr('display', d => activeTypes.has(d.type) ? null : 'none')
      .on('mouseover', function(event, d) {
        d3.select(this).raise().attr('stroke-width', 4).attr('opacity', 1);
        tip.transition().duration(80).style('opacity', 0.95);
        tip.html(
          `<strong style="color:${typeColor(d.type)}">${d.type} (avg)</strong>` +
          `&ensp;${d.count} Pokémon<br>` +
          STAT_KEYS.map((k, j) => `${STAT_LABELS[j]}: <b>${d[k].toFixed(1)}</b>`).join('&ensp;·&ensp;')
        )
        .style('left', (event.pageX + 14) + 'px').style('top', (event.pageY - 36) + 'px');
      })
      .on('mousemove', event => {
        tip.style('left', (event.pageX + 14) + 'px').style('top', (event.pageY - 36) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this).attr('stroke-width', 2).attr('opacity', 0.80);
        tip.transition().duration(150).style('opacity', 0);
      });

    updaters.pcp = () => {
      typeLines.attr('display', d => activeTypes.has(d.type) ? null : 'none');
    };
  }

  // ── Mode: K-Means Clusters ────────────────────────────────
  if (pcpMode === 'kmeans') {
    // Five cluster centroid profiles as thick distinct lines
    const { centroids } = kMeans(data, 5);

    g.selectAll('.cluster-line').data(centroids).join('path')
      .attr('class', 'cluster-line')
      .attr('d', profilePath)
      .attr('fill', 'none')
      .attr('stroke', (_, i) => CLUSTER_COLORS[i])
      .attr('stroke-width', 3).attr('opacity', 0.85)
      .on('mouseover', function(event, d) {
        const i = centroids.indexOf(d);
        d3.select(this).raise().attr('stroke-width', 5).attr('opacity', 1);
        tip.transition().duration(80).style('opacity', 0.95);
        tip.html(
          `<strong style="color:${CLUSTER_COLORS[i]}">${d.name}</strong>` +
          `&ensp;(${d.count} Pokémon)<br>` +
          `Top types: ${d.topTypes.map(({ t, n }) => `${t} (${n})`).join(', ')}<br>` +
          STAT_KEYS.map((k, j) => `${STAT_LABELS[j]}: <b>${d[k].toFixed(1)}</b>`).join('&ensp;·&ensp;')
        )
        .style('left', (event.pageX + 14) + 'px').style('top', (event.pageY - 36) + 'px');
      })
      .on('mousemove', event => {
        tip.style('left', (event.pageX + 14) + 'px').style('top', (event.pageY - 36) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this).attr('stroke-width', 3).attr('opacity', 0.85);
        tip.transition().duration(150).style('opacity', 0);
      });

    // Cluster legend at the bottom
    const clLeg = g.append('g').attr('transform', `translate(0,${iH + 16})`);
    centroids.forEach((c, i) => {
      const rowG = clLeg.append('g').attr('transform', `translate(${i * (iW / 5)},0)`);
      rowG.append('line').attr('x1', 0).attr('y1', 5).attr('x2', 18).attr('y2', 5)
        .attr('stroke', CLUSTER_COLORS[i]).attr('stroke-width', 3);
      rowG.append('text').attr('x', 22).attr('y', 5)
        .attr('fill', '#222').attr('font-size', '9px').attr('font-weight', '600')
        .attr('dominant-baseline', 'middle').text(c.name);
      rowG.append('text').attr('x', 22).attr('y', 17)
        .attr('fill', '#888').attr('font-size', '8px').text(`${c.count} Pokémon`);
    });

    // K-Means clusters cross types — not filtered by activeTypes
    updaters.pcp = () => {};
  }

  // ── Vertical axes (all modes) ─────────────────────────────
  statDims.forEach(dim => {
    const axG = g.append('g').attr('class', 'pcp-axis')
      .attr('transform', `translate(${xPos(dim.key)},0)`);
    axG.call(d3.axisLeft(yOf[dim.key]).ticks(4).tickSize(3))
      .call(a => a.select('.domain').attr('stroke', '#bbb'))
      .call(a => a.selectAll('.tick line').attr('stroke', '#bbb'))
      .call(a => a.selectAll('text').attr('fill', '#555').attr('font-size', '9px'));
    axG.append('text').attr('class', 'dim-label')
      .attr('y', -14).attr('text-anchor', 'middle')
      .attr('fill', '#222').attr('font-size', '12px').attr('font-weight', '600')
      .text(dim.label);
  });

  // ── Type color legend at bottom (hidden in k-means mode) ─
  if (pcpMode !== 'kmeans') {
    const legCols  = 9;
    const legItemW = iW / legCols;
    const legG = g.append('g').attr('transform', `translate(0,${iH + 16})`);
    legG.append('text')
      .attr('x', iW / 2).attr('y', -5)
      .attr('text-anchor', 'middle').attr('fill', '#777').attr('font-size', '10px')
      .text('Line color = Primary Type');
    ALL_TYPES.forEach((type, i) => {
      const col = i % legCols;
      const row = Math.floor(i / legCols);
      const entG = legG.append('g')
        .attr('transform', `translate(${col * legItemW + 2},${row * 14 + 2})`);
      entG.append('rect').attr('width', 10).attr('height', 10).attr('rx', 2)
        .attr('fill', typeColor(type));
      entG.append('text').attr('x', 13).attr('y', 9)
        .attr('fill', '#444').attr('font-size', '9px').text(type);
    });
  }
}
