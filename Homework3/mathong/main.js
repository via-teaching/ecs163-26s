const TYPE_COLORS = {
  Fire:     "#F08030",
  Water:    "#6890F0",
  Grass:    "#78C850",
  Electric: "#F8D030",
  Ice:      "#98D8D8",
  Fighting: "#C03028",
  Poison:   "#A040A0",
  Ground:   "#E0C068",
  Flying:   "#A890F0",
  Psychic:  "#F85888",
  Bug:      "#A8B820",
  Rock:     "#B8A038",
  Ghost:    "#705898",
  Dragon:   "#7038F8",
  Dark:     "#705848",
  Steel:    "#B8B8D0",
  Fairy:    "#EE99AC",
  Normal:   "#A8A878"
};

// shared state — all views read from here so filter changes propagate
const state = {
  data:         [],
  filtered:     [],
  selectedType: null,
  brushedNumbers: null,   // Set<number> of brushed pokemon IDs, null = no active brush
  scatterMode:    "brush" // "brush" | "zoom"
};

// cache badge elements so we're not querying the DOM on every filter change
const badgeEl = document.getElementById("filter-badge");
const labelEl = document.getElementById("filter-label");

function updateAll() {
  // clear any brush selection when the type filter changes — pixel coords are stale
  if (state.brushedNumbers !== null) {
    state.brushedNumbers = null;
    if (scatterBrushG) scatterBrushG.call(brushBehavior.move, null);
  }

  state.filtered = state.selectedType
    ? state.data.filter(d => d.Type_1 === state.selectedType)
    : state.data;

  updateScatter();
  updateBarHighlight();
  updateRadar();
  updateStream();
  updateBrushBadge();

  // show/hide the active filter badge in the header
  if (state.selectedType) {
    labelEl.textContent = state.selectedType;
    badgeEl.classList.remove("hidden");
  } else {
    badgeEl.classList.add("hidden");
  }
}

function updateBrushBadge() {
  const badge = document.getElementById("brush-badge");
  if (state.brushedNumbers && state.brushedNumbers.size > 0) {
    badge.textContent = `${state.brushedNumbers.size} selected`;
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }
}

document.getElementById("clear-filter-btn").addEventListener("click", () => {
  state.selectedType = null;
  updateAll();
});

// -------------------------------------------------------------------
// VIEW 1: Bar chart — overview of pokemon count by primary type
// -------------------------------------------------------------------

let barSvg, barXScale, barYScale, barInnerW, barInnerH, barMargin;

function drawBar() {
  const container = document.getElementById("chart-bar");
  const { width, height } = container.getBoundingClientRect();

  barMargin = { top: 12, right: 16, bottom: 175, left: 50 };
  barInnerW  = width          - barMargin.left - barMargin.right;
  barInnerH  = (height - 26) - barMargin.top  - barMargin.bottom;

  // rollup counts pokemon per type, then sort highest to lowest
  const typeCounts = Array.from(
    d3.rollup(state.data, v => v.length, d => d.Type_1),
    ([type, count]) => ({ type, count })
  ).sort((a, b) => b.count - a.count);

  // x: one band per type
  barXScale = d3.scaleBand()
    .domain(typeCounts.map(d => d.type))
    .range([0, barInnerW])
    .padding(0.25);

  // y: count → pixel height
  barYScale = d3.scaleLinear()
    .domain([0, d3.max(typeCounts, d => d.count)])
    .range([barInnerH, 0])
    .nice();

  d3.select("#chart-bar svg").remove();

  // root svg + inner group offset by margins
  barSvg = d3.select("#chart-bar")
    .append("svg")
    .attr("width",  width)
    .attr("height", height - 26)
    .append("g")
    .attr("transform", `translate(${barMargin.left},${barMargin.top})`);

  // x axis with rotated labels so type names don't overlap
  barSvg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${barInnerH})`)
    .call(d3.axisBottom(barXScale))
    .selectAll("text")
      .attr("transform", "rotate(-45)")
      .attr("text-anchor", "end")
      .attr("dx", "-0.4em")
      .attr("dy", "0.15em")
      .style("fill", "#7b7f9e")
      .style("font-size", "11px");

  // x axis label
  barSvg.append("text")
    .attr("class", "axis-label")
    .attr("x", barInnerW / 2)
    .attr("y", barInnerH + barMargin.bottom - 4)
    .attr("text-anchor", "middle")
    .text("Primary Type");

  // y axis with dashed gridlines spanning the full chart width
  barSvg.append("g")
    .attr("class", "y-axis")
    .call(
      d3.axisLeft(barYScale)
        .ticks(6)
        .tickSize(-barInnerW)
    )
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick line")
      .style("stroke", "#2e3148")
      .style("stroke-dasharray", "3,3"));

  // y axis label
  barSvg.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -(barInnerH / 2))
    .attr("y", -38)
    .attr("text-anchor", "middle")
    .text("Number of Pokémon");

  // one bar per type, colored by type
  barSvg.selectAll("rect.bar")
    .data(typeCounts)
    .join("rect")
      .attr("class", "bar")
      .attr("x",      d => barXScale(d.type))
      .attr("y",      d => barYScale(d.count))
      .attr("width",  barXScale.bandwidth())
      .attr("height", d => barInnerH - barYScale(d.count))
      .attr("fill",   d => TYPE_COLORS[d.type] || "#888")
      .attr("rx", 2)
      .style("cursor", "pointer")
      // clicking a bar toggles the type filter
      .on("click", (event, d) => {
        state.selectedType = state.selectedType === d.type ? null : d.type;
        updateAll();
      });

  // count label above each bar
  barSvg.selectAll("text.bar-label")
    .data(typeCounts)
    .join("text")
      .attr("class", "bar-label")
      .attr("x", d => barXScale(d.type) + barXScale.bandwidth() / 2)
      .attr("y", d => barYScale(d.count) - 4)
      .attr("text-anchor", "middle")
      .style("fill", "#7b7f9e")
      .style("font-size", "9px")
      .text(d => d.count);

  // color legend — one swatch per type, two columns, positioned below the x-axis
  const legendG = barSvg.append("g")
    .attr("transform", `translate(0, ${barInnerH + 52})`);

  typeCounts.forEach((d, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const lx  = col * (barInnerW / 2);
    const ly  = row * 13;

    // colored swatch matching the bar
    legendG.append("rect")
      .attr("x", lx).attr("y", ly - 1)
      .attr("width", 8).attr("height", 8).attr("rx", 1)
      .attr("fill", TYPE_COLORS[d.type] || "#888");

    // type name next to swatch
    legendG.append("text")
      .attr("x", lx + 11).attr("y", ly + 6)
      .style("fill", "#6b7094").style("font-size", "9px")
      .text(d.type);
  });

  updateBarHighlight();
}

// dims non-selected bars and outlines the active one
function updateBarHighlight() {
  if (!barSvg) return;

  barSvg.selectAll("rect.bar")
    .transition().duration(300)
    .attr("opacity", d =>
      !state.selectedType || d.type === state.selectedType ? 1 : 0.25
    )
    .attr("stroke",       d => d.type === state.selectedType ? "#fff" : "none")
    .attr("stroke-width", d => d.type === state.selectedType ? 2 : 0);
}

// -------------------------------------------------------------------
// VIEW 2: Scatter plot — attack vs defense, colored by type
// -------------------------------------------------------------------

let scatterSvgG, scatterXScale, scatterYScale, scatterInnerW, scatterInnerH;
let scatterSvgRoot = null;  // the <svg> element — needed to apply zoom
let scatterBrushG  = null;  // <g> holding the d3.brush overlay
let brushBehavior  = null;
let zoomBehavior   = null;

const tooltip = d3.select("#tooltip");

function drawScatter() {
  const container = document.getElementById("chart-scatter");
  const { width, height } = container.getBoundingClientRect();
  const margin = { top: 20, right: 24, bottom: 50, left: 52 };
  scatterInnerW = width          - margin.left - margin.right;
  scatterInnerH = (height - 26) - margin.top  - margin.bottom;

  d3.select("#chart-scatter svg").remove();

  const svg = d3.select("#chart-scatter")
    .append("svg")
    .attr("width",  width)
    .attr("height", height - 26);

  scatterSvgG = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // x: attack, y: defense — fixed domains so axes don't shift on filter
  scatterXScale = d3.scaleLinear().domain([0, 220]).range([0, scatterInnerW]);
  scatterYScale = d3.scaleLinear().domain([0, 240]).range([scatterInnerH, 0]);

  // horizontal gridlines
  scatterSvgG.append("g")
    .attr("class", "grid")
    .call(
      d3.axisLeft(scatterYScale)
        .ticks(6)
        .tickSize(-scatterInnerW)
        .tickFormat("")
    )
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick line")
      .style("stroke", "#2e3148")
      .style("stroke-dasharray", "3,3"));

  // x axis
  scatterSvgG.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${scatterInnerH})`)
    .call(d3.axisBottom(scatterXScale).ticks(8));

  // y axis
  scatterSvgG.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(scatterYScale).ticks(6));

  // axis labels
  scatterSvgG.append("text")
    .attr("class", "axis-label")
    .attr("x", scatterInnerW / 2)
    .attr("y", scatterInnerH + 42)
    .attr("text-anchor", "middle")
    .text("Attack");

  scatterSvgG.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -(scatterInnerH / 2))
    .attr("y", -40)
    .attr("text-anchor", "middle")
    .text("Defense");

  // legend — anchored to bottom-right of the inner chart area
  const legend = scatterSvgG.append("g")
    .attr("transform", `translate(${scatterInnerW - 110}, ${scatterInnerH - 56})`);

  // header
  legend.append("text")
    .attr("x", 0).attr("y", 0)
    .style("fill", "#6b7094").style("font-size", "10px").style("font-weight", "600")
    .text("Color = Primary Type");

  // regular pokemon dot
  legend.append("circle")
    .attr("cx", 6).attr("cy", 16).attr("r", 4)
    .attr("fill", "#6b7094");
  legend.append("text")
    .attr("x", 16).attr("y", 20)
    .style("fill", "#6b7094").style("font-size", "10px")
    .text("Regular");

  // legendary pokemon dot (larger, white outline)
  legend.append("circle")
    .attr("cx", 6).attr("cy", 36).attr("r", 6)
    .attr("fill", "#6b7094")
    .attr("stroke", "#fff").attr("stroke-width", 1.5);
  legend.append("text")
    .attr("x", 16).attr("y", 40)
    .style("fill", "#6b7094").style("font-size", "10px")
    .text("Legendary");

  // clip path keeps dots and brush inside the axis area
  scatterSvgG.append("clipPath").attr("id", "scatter-clip")
    .append("rect").attr("width", scatterInnerW).attr("height", scatterInnerH);

  // dots group (clipped) — updateScatter selects into this
  scatterSvgG.append("g").attr("class", "dots-group")
    .attr("clip-path", "url(#scatter-clip)");

  // brush overlay group (clipped, above dots so it captures pointer events)
  scatterBrushG = scatterSvgG.append("g").attr("class", "brush")
    .attr("clip-path", "url(#scatter-clip)");

  // store root svg for zoom
  scatterSvgRoot = d3.select("#chart-scatter svg");

  // build brush — extent matches inner chart area
  brushBehavior = d3.brush()
    .extent([[0, 0], [scatterInnerW, scatterInnerH]])
    .on("brush end", handleBrush);

  // build zoom — applied only in zoom mode
  zoomBehavior = d3.zoom()
    .scaleExtent([0.5, 12])
    .on("zoom", handleZoom);

  applyScatterMode(state.scatterMode);
  updateScatter();
}

// opacity rule shared by enter and update
function dotOpacity(d) {
  if (state.brushedNumbers && state.brushedNumbers.size > 0)
    return state.brushedNumbers.has(d.Number) ? 0.9 : 0.06;
  return !state.selectedType ? 0.7
       : d.Type_1 === state.selectedType ? 0.85 : 0.08;
}

function updateScatter() {
  if (!scatterSvgG) return;

  // dots live inside the clipped dots-group so they don't bleed past the axes
  scatterSvgG.select(".dots-group")
    .selectAll("circle.dot")
    .data(state.filtered, d => d.Number)
    .join(
      enter => enter.append("circle")
        .attr("class", "dot")
        .attr("cx", d => scatterXScale(d.Attack))
        .attr("cy", d => scatterYScale(d.Defense))
        .attr("r",            d => d.isLegendary ? 6 : 4)
        .attr("fill",         d => TYPE_COLORS[d.Type_1] || "#888")
        .attr("stroke",       d => d.isLegendary ? "#fff" : "none")
        .attr("stroke-width", d => d.isLegendary ? 1.5 : 0)
        .attr("opacity", 0)
        .style("cursor", "pointer")
        .on("mouseover", (event, d) => {
          tooltip.classed("hidden", false)
            .html(`
              <strong>${d.Name}</strong><br>
              Type: ${d.Type_1}${d.Type_2 ? " / " + d.Type_2 : " / —"}<br>
              HP: ${d.HP} &nbsp; Atk: ${d.Attack} &nbsp; Def: ${d.Defense}<br>
              Sp.Atk: ${d.Sp_Atk} &nbsp; Sp.Def: ${d.Sp_Def} &nbsp; Spd: ${d.Speed}
              ${d.isLegendary ? "<br><strong>★ Legendary</strong>" : ""}
            `);
        })
        .on("mousemove", event => {
          tooltip
            .style("left", (event.clientX + 14) + "px")
            .style("top",  (event.clientY - 28) + "px");
        })
        .on("mouseleave", () => tooltip.classed("hidden", true))
        .call(enter => enter.transition().duration(400).attr("opacity", dotOpacity)),

      update => update
        .transition().duration(400)
        .attr("opacity", dotOpacity),

      exit => exit.transition().duration(400).attr("opacity", 0).remove()
    );
}

// -------------------------------------------------------------------
// VIEW 3: Radar plot — average stat profile per type (advanced)
// All 18 type polygons shown faintly when no filter is active.
// Selecting a type highlights it and draws the overall average
// as a reference shape so you can see how it compares.
// -------------------------------------------------------------------

const RADAR_DIMS   = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];
const RADAR_LABELS = ["HP", "Atk", "Def", "Sp.Atk", "Sp.Def", "Spd"];

let radarSvgG, radarRadius, radarCx, radarCy, radarScale, typeAverages, overallAvg;

// compute average stats for every type and for all pokemon combined
function computeAverages() {
  const grouped = d3.group(state.data, d => d.Type_1);

  typeAverages = {};
  grouped.forEach((pokemon, type) => {
    typeAverages[type] = {};
    RADAR_DIMS.forEach(dim => {
      typeAverages[type][dim] = d3.mean(pokemon, d => d[dim]);
    });
  });

  overallAvg = {};
  RADAR_DIMS.forEach(dim => {
    overallAvg[dim] = d3.mean(state.data, d => d[dim]);
  });
}

// converts a stats object into an array of [x, y] polygon points
function radarPoints(stats) {
  return RADAR_DIMS.map((dim, i) => {
    const angle = (2 * Math.PI * i / RADAR_DIMS.length) - Math.PI / 2;
    const r = radarScale(stats[dim]);
    return [radarCx + r * Math.cos(angle), radarCy + r * Math.sin(angle)];
  });
}

function drawRadar() {
  const container = document.getElementById("chart-pcp");
  const { width, height } = container.getBoundingClientRect();
  const svgH = height - 26;

  d3.select("#chart-pcp svg").remove();

  const svg = d3.select("#chart-pcp")
    .append("svg")
    .attr("width", width)
    .attr("height", svgH);

  radarSvgG = svg.append("g");

  // size the radar to fill the panel in both dimensions
  const padX = 52, padY = 38;
  radarRadius = Math.min((width - padX * 2) / 2, (svgH - padY * 2) / 2);
  radarCx = width / 2;
  radarCy = svgH / 2;

  computeAverages();

  // outer ring = highest BST in the dataset (Arceus, 720) divided by 6 stats = 120
  // gives a natural ceiling: "what each stat would be if perfectly distributed"
  const maxBST = d3.max(state.data, d => d.Total);
  const scaleMax = maxBST / RADAR_DIMS.length;   // 720 / 6 = 120
  radarScale = d3.scaleLinear().domain([0, scaleMax]).range([0, radarRadius]);

  // concentric grid rings at 25/50/75/100% with value labels on the right
  [0.25, 0.5, 0.75, 1].forEach(t => {
    radarSvgG.append("circle")
      .attr("cx", radarCx).attr("cy", radarCy)
      .attr("r", radarRadius * t)
      .attr("fill", "none")
      .attr("stroke", t === 1 ? "#3a3e58" : "#252840")
      .attr("stroke-width", t === 1 ? 1.5 : 1)
      .attr("stroke-dasharray", t === 1 ? null : "3,3");

    radarSvgG.append("text")
      .attr("x", radarCx + radarRadius * t + 5)
      .attr("y", radarCy)
      .attr("dominant-baseline", "middle")
      .style("fill", "#4a5070")
      .style("font-size", "12px")
      .style("font-weight", "500")
      .text(Math.round(scaleMax * t));
  });

  // one radial spoke per stat
  RADAR_DIMS.forEach((dim, i) => {
    const angle = (2 * Math.PI * i / RADAR_DIMS.length) - Math.PI / 2;
    const x2 = radarCx + radarRadius * Math.cos(angle);
    const y2 = radarCy + radarRadius * Math.sin(angle);

    radarSvgG.append("line")
      .attr("x1", radarCx).attr("y1", radarCy)
      .attr("x2", x2).attr("y2", y2)
      .attr("stroke", "#252840");

    const labelR = radarRadius + 18;
    radarSvgG.append("text")
      .attr("x", radarCx + labelR * Math.cos(angle))
      .attr("y", radarCy + labelR * Math.sin(angle))
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .style("fill", "#dde1f0")
      .style("font-size", "11px")
      .style("font-weight", "700")
      .text(RADAR_LABELS[i]);
  });

  // legend: dashed = all-type avg, solid = selected type
  const radarLegend = svg.append("g").attr("transform", "translate(10, 10)");

  radarLegend.append("line")
    .attr("x1", 0).attr("x2", 18).attr("y1", 6).attr("y2", 6)
    .attr("stroke", "#6b7094").attr("stroke-width", 1.5)
    .attr("stroke-dasharray", "4,3");
  radarLegend.append("text")
    .attr("x", 22).attr("y", 10)
    .style("fill", "#6b7094").style("font-size", "10px")
    .text("All-type avg");

  radarLegend.append("line")
    .attr("x1", 0).attr("x2", 18).attr("y1", 22).attr("y2", 22)
    .attr("stroke", "#dde1f0").attr("stroke-width", 2);
  radarLegend.append("text")
    .attr("x", 22).attr("y", 26)
    .style("fill", "#6b7094").style("font-size", "10px")
    .text("Selected type");

  updateRadar();
}

function updateRadar() {
  if (!radarSvgG) return;

  // remove previous polygons so we redraw cleanly on filter change
  radarSvgG.selectAll("polygon.radar-type").remove();
  radarSvgG.selectAll("polygon.radar-avg").remove();

  if (state.selectedType) {
    // all other types as faint context shapes
    Object.entries(typeAverages).forEach(([type, stats]) => {
      if (type === state.selectedType) return;
      radarSvgG.append("polygon")
        .attr("class", "radar-type")
        .attr("points", radarPoints(stats).join(" "))
        .attr("fill", TYPE_COLORS[type] || "#888")
        .attr("fill-opacity", 0.06)
        .attr("stroke", TYPE_COLORS[type] || "#888")
        .attr("stroke-opacity", 0.2)
        .attr("stroke-width", 1);
    });

    // dashed overall-average as reference
    radarSvgG.append("polygon")
      .attr("class", "radar-avg")
      .attr("points", radarPoints(overallAvg).join(" "))
      .attr("fill", "none")
      .attr("stroke", "#6b7094")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "4,3");

    // highlighted polygon for the selected type
    const selColor = TYPE_COLORS[state.selectedType] || "#888";
    const selStats = typeAverages[state.selectedType];

    radarSvgG.append("polygon")
      .attr("class", "radar-type")
      .attr("points", radarPoints(selStats).join(" "))
      .attr("fill", selColor)
      .attr("fill-opacity", 0.35)
      .attr("stroke", selColor)
      .attr("stroke-width", 3);

    // stat value labels at each vertex of the selected type's polygon
    RADAR_DIMS.forEach((dim, i) => {
      const angle = (2 * Math.PI * i / RADAR_DIMS.length) - Math.PI / 2;
      const r = radarScale(selStats[dim]);
      const vx = radarCx + r * Math.cos(angle);
      const vy = radarCy + r * Math.sin(angle);

      radarSvgG.append("text")
        .attr("x", vx + 8 * Math.cos(angle))
        .attr("y", vy + 8 * Math.sin(angle))
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .style("fill", selColor)
        .style("font-size", "11px")
        .style("font-weight", "600")
        .text(Math.round(selStats[dim]));
    });

  } else {
    // no filter — all 18 types faintly in the background
    Object.entries(typeAverages).forEach(([type, stats]) => {
      radarSvgG.append("polygon")
        .attr("class", "radar-type")
        .attr("points", radarPoints(stats).join(" "))
        .attr("fill", TYPE_COLORS[type] || "#888")
        .attr("fill-opacity", 0.05)
        .attr("stroke", TYPE_COLORS[type] || "#888")
        .attr("stroke-opacity", 0.25)
        .attr("stroke-width", 0.8);
    });

    // overall average shown prominently when nothing is selected
    radarSvgG.append("polygon")
      .attr("class", "radar-avg")
      .attr("points", radarPoints(overallAvg).join(" "))
      .attr("fill", "#7c83fd")
      .attr("fill-opacity", 0.2)
      .attr("stroke", "#7c83fd")
      .attr("stroke-width", 2.5);

    // stat value labels at each vertex of the overall average polygon
    RADAR_DIMS.forEach((dim, i) => {
      const angle = (2 * Math.PI * i / RADAR_DIMS.length) - Math.PI / 2;
      const r = radarScale(overallAvg[dim]);
      const vx = radarCx + r * Math.cos(angle);
      const vy = radarCy + r * Math.sin(angle);

      // small label showing the average value at that vertex
      radarSvgG.append("text")
        .attr("x", vx + 8 * Math.cos(angle))
        .attr("y", vy + 8 * Math.sin(angle))
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .style("fill", "#7c83fd")
        .style("font-size", "11px")
        .style("font-weight", "600")
        .text(Math.round(overallAvg[dim]));
    });
  }
}

// -------------------------------------------------------------------
// VIEW 4: Stream graph — type count across generations (advanced)
// Shows how many pokemon of each type were introduced per generation.
// Highlights the selected type's stream when a filter is active.
// -------------------------------------------------------------------

let streamSvgG, streamXScale, streamInnerW, streamInnerH, streamSeries;

function drawStream() {
  const container = document.getElementById("chart-stream");
  const { width, height } = container.getBoundingClientRect();
  const margin = { top: 16, right: 16, bottom: 36, left: 44 };
  streamInnerW = width          - margin.left - margin.right;
  streamInnerH = (height - 26) - margin.top  - margin.bottom;

  d3.select("#chart-stream svg").remove();

  const svg = d3.select("#chart-stream")
    .append("svg")
    .attr("width", width)
    .attr("height", height - 26);

  streamSvgG = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const gens  = [1, 2, 3, 4, 5, 6];
  const types = Object.keys(TYPE_COLORS);

  // count pokemon per type per generation
  const counts = {};
  gens.forEach(g => {
    counts[g] = {};
    types.forEach(t => { counts[g][t] = 0; });
  });
  state.data.forEach(d => {
    if (counts[d.Generation]) counts[d.Generation][d.Type_1]++;
  });

  // reshape into row-per-generation array for d3.stack
  const stackData = gens.map(g => ({ generation: g, ...counts[g] }));

  // stack with wiggle offset produces the flowing streamgraph shape
  const stack = d3.stack()
    .keys(types)
    .offset(d3.stackOffsetWiggle)
    .order(d3.stackOrderInsideOut);

  streamSeries = stack(stackData);

  // x: generation number, y: stacked extent
  streamXScale = d3.scaleLinear().domain([1, 6]).range([0, streamInnerW]);
  const yScale = d3.scaleLinear()
    .domain([
      d3.min(streamSeries, s => d3.min(s, d => d[0])),
      d3.max(streamSeries, s => d3.max(s, d => d[1]))
    ])
    .range([streamInnerH, 0]);

  // smooth area generator with catmull-rom curves
  const area = d3.area()
    .x(d => streamXScale(d.data.generation))
    .y0(d => yScale(d[0]))
    .y1(d => yScale(d[1]))
    .curve(d3.curveCatmullRom);

  // one filled path per type
  streamSvgG.selectAll("path.stream")
    .data(streamSeries)
    .join("path")
      .attr("class", "stream")
      .attr("fill", s => TYPE_COLORS[s.key] || "#888")
      .attr("opacity", 0.75)
      .attr("d", area);

  // x axis showing generation numbers
  streamSvgG.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${streamInnerH})`)
    .call(
      d3.axisBottom(streamXScale)
        .ticks(6)
        .tickFormat(d => `Gen ${d}`)
    );

  // x axis label
  streamSvgG.append("text")
    .attr("class", "axis-label")
    .attr("x", streamInnerW / 2)
    .attr("y", streamInnerH + 32)
    .attr("text-anchor", "middle")
    .text("Generation");

  // y axis label (counts are stacked/wiggled so no numeric y axis needed)
  streamSvgG.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -(streamInnerH / 2))
    .attr("y", -32)
    .attr("text-anchor", "middle")
    .text("Pokémon Count");

  // legend note — color = type, matching the bar chart
  streamSvgG.append("text")
    .attr("x", streamInnerW)
    .attr("y", -4)
    .attr("text-anchor", "end")
    .style("fill", "#6b7094")
    .style("font-size", "10px")
    .text("Color = Primary Type (see bar chart)");

  updateStream();
}

// highlights the selected type's stream, dims all others
function updateStream() {
  if (!streamSvgG) return;

  streamSvgG.selectAll("path.stream")
    .transition().duration(400)
    .attr("opacity", s =>
      !state.selectedType ? 0.75
      : s.key === state.selectedType ? 0.95
      : 0.12
    );
}

// -------------------------------------------------------------------
// INTERACTION: brush + zoom mode toggle for scatter plot
// -------------------------------------------------------------------

function applyScatterMode(mode) {
  state.scatterMode = mode;
  document.getElementById("btn-brush-mode").classList.toggle("active", mode === "brush");
  document.getElementById("btn-zoom-mode").classList.toggle("active",  mode === "zoom");
  const resetBtn = document.getElementById("reset-zoom-btn");

  if (mode === "brush") {
    // remove zoom, show brush overlay
    if (scatterSvgRoot) scatterSvgRoot.on(".zoom", null);
    scatterBrushG.style("display", null).call(brushBehavior);
    resetBtn.classList.add("hidden");
  } else {
    // clear + hide brush, apply zoom to svg root
    scatterBrushG.call(brushBehavior.move, null);
    scatterBrushG.style("display", "none");
    if (state.brushedNumbers !== null) {
      state.brushedNumbers = null;
      updateScatter(); updateRadar(); updateBrushBadge();
    }
    scatterSvgRoot.call(zoomBehavior);
    resetBtn.classList.remove("hidden");
  }
}

// called by d3.brush on brush and end events
function handleBrush(event) {
  const sel = event.selection;
  if (!sel) {
    state.brushedNumbers = null;
  } else {
    const [[px0, py0], [px1, py1]] = sel;
    const x0 = scatterXScale.invert(px0), x1 = scatterXScale.invert(px1);
    // py1 > py0 in pixels but maps to lower values (y-axis is flipped)
    const y0 = scatterYScale.invert(py1),  y1 = scatterYScale.invert(py0);
    const source = state.selectedType
      ? state.data.filter(d => d.Type_1 === state.selectedType)
      : state.data;
    const brushed = source.filter(d =>
      d.Attack >= x0 && d.Attack <= x1 && d.Defense >= y0 && d.Defense <= y1
    );
    state.brushedNumbers = new Set(brushed.map(d => d.Number));
  }
  updateScatter();
  updateRadar();
  updateBrushBadge();
}

// called by d3.zoom on zoom events
function handleZoom(event) {
  const newX = event.transform.rescaleX(scatterXScale);
  const newY = event.transform.rescaleY(scatterYScale);
  scatterSvgG.select(".x-axis").call(d3.axisBottom(newX).ticks(8));
  scatterSvgG.select(".y-axis").call(d3.axisLeft(newY).ticks(6));
  scatterSvgG.select(".dots-group").selectAll("circle.dot")
    .attr("cx", d => newX(d.Attack))
    .attr("cy", d => newY(d.Defense));
}

// mode toggle button listeners (wired once; survive drawScatter redraws)
document.getElementById("btn-brush-mode").addEventListener("click", () => {
  if (state.scatterMode !== "brush") applyScatterMode("brush");
});
document.getElementById("btn-zoom-mode").addEventListener("click", () => {
  if (state.scatterMode !== "zoom") applyScatterMode("zoom");
});
document.getElementById("reset-zoom-btn").addEventListener("click", () => {
  if (scatterSvgRoot)
    scatterSvgRoot.transition().duration(400)
      .call(zoomBehavior.transform, d3.zoomIdentity);
});

// -------------------------------------------------------------------
// load data and kick off all views
// -------------------------------------------------------------------

d3.csv("data/pokemon.csv").then(rawData => {

  // d3 reads everything as strings — convert numeric columns
  rawData.forEach(d => {
    d.HP         = +d.HP;
    d.Attack     = +d.Attack;
    d.Defense    = +d.Defense;
    d.Sp_Atk     = +d.Sp_Atk;
    d.Sp_Def     = +d.Sp_Def;
    d.Speed      = +d.Speed;
    d.Total      = +d.Total;
    d.Generation = +d.Generation;
    d.Number     = +d.Number;
    d.isLegendary = d.isLegendary.toLowerCase() === "true";
  });

  state.data     = rawData;
  state.filtered = rawData;

  drawBar();
  drawScatter();
  drawRadar();
  drawStream();

}).catch(err => console.error("Failed to load pokemon.csv:", err));

// redraw all charts when the window is resized
// debounced so we don't thrash on every pixel during drag
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    drawBar();
    drawScatter();
    drawRadar();
    drawStream();
  }, 150);
});
