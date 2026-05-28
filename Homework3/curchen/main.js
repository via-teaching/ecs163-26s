const TYPE_COLORS = {
  Normal: "#A8A77A", Fire: "#EE8130", Water: "#6390F0", Electric: "#F7D02C",
  Grass:  "#7AC74C", Ice:  "#96D9D6", Fighting: "#C22E28", Poison: "#A33EA1",
  Ground: "#E2BF65", Flying: "#A98FF3", Psychic: "#F95587", Bug: "#A6B91A",
  Rock:   "#B6A136", Ghost: "#735797", Dragon: "#6F35FC", Dark: "#705746",
  Steel:  "#B7B7CE", Fairy: "#D685AD"
};
const TYPES = Object.keys(TYPE_COLORS);

const tooltip = d3.select("#tooltip");

const TOOLTIP_OFFSET = 14;

// catch rate range (3 = hardest to catch, 255 = easiest)
const CATCH_MIN = 3;
const CATCH_MAX = 255;

function showTooltip(event, html) {
  tooltip.style("opacity", 1).html(html);
  moveTooltip(event);
}
function moveTooltip(event) {
  tooltip.style("left", (event.clientX + TOOLTIP_OFFSET) + "px")
         .style("top", (event.clientY + TOOLTIP_OFFSET) + "px");
}
function hideTooltip() {
  tooltip.style("opacity", 0);
}

// generation playback state for the scatter
const ALL_GENS = 7; // slider value for "show every generation"
let currentGen = ALL_GENS;
let genPlaying = false;
let genTimer = null;
let scatterCtx = null; // scales + reusable selections for redrawing one gen

// egg-group arcs the user has clicked (max 2)
let chordSelection = [];

// preprocess the data
function preprocess(rawData) {
  const data = rawData.map(d => ({
    name: d.Name,
    type1: d.Type_1,
    type2: d.Type_2 && d.Type_2.length ? d.Type_2 : null,
    bst: +d.Total, // CSV already has Total = sum of 6 stats
    eg1: d.Egg_Group_1 || null,
    eg2: d.Egg_Group_2 && d.Egg_Group_2.length ? d.Egg_Group_2 : null,
    catchRate: +d.Catch_Rate,
    generation: +d.Generation,
    // used AI to figure out best way to visualize pokemon with overlapping BST and catch rate
    // pseudo-random horizontal jitter in [-1, 1], based on the pokedex number so it stays the same on resize. needed because ~50 legendaries all sit at catch rate 3
    jitter: Math.sin(+d.Number * 12.9898) * 0.5 + Math.sin(+d.Number * 78.233) * 0.5
  }));

  // Type co-occurrence matrix (type1 x type2). type2==null contributes to diagonal.
  const typeMatrix = {};
  TYPES.forEach(t1 => { typeMatrix[t1] = {}; TYPES.forEach(t2 => typeMatrix[t1][t2] = 0); });
  data.forEach(d => {
    if (!TYPES.includes(d.type1)) return;
    const t2 = d.type2 && TYPES.includes(d.type2) ? d.type2 : d.type1;
    typeMatrix[d.type1][t2]++;
  });

  // Egg group co-membership for chord. Symmetric matrix over the set of egg groups that appear in the data. Pokemon with only one egg group contribute to the diagonal.
  const eggGroupSet = new Set();
  data.forEach(d => { if (d.eg1) eggGroupSet.add(d.eg1); if (d.eg2) eggGroupSet.add(d.eg2); });
  const eggGroups = [...eggGroupSet].sort();

  const idx = new Map(eggGroups.map((g, i) => [g, i]));
  const n = eggGroups.length;
  const eggMatrix = Array.from({length: n}, () => new Array(n).fill(0));
  const eggTotals = new Array(n).fill(0);
  data.forEach(d => {
    if (!d.eg1) return;
    const i = idx.get(d.eg1);
    eggTotals[i]++;
    if (d.eg2) {
      const j = idx.get(d.eg2);
      eggMatrix[i][j] += 1;
      eggMatrix[j][i] += 1;
      eggTotals[j]++;
    } else {
      eggMatrix[i][i] += 1;  // self-loop for single-group species
    }
  });

  return { data, typeMatrix, eggGroups, eggMatrix, eggTotals };
}

// view 1: type co-occurrence heatmap
function renderHeatmap(prep) {
  const svgEl = document.getElementById("heatmap-svg");
  const W = svgEl.clientWidth, H = svgEl.clientHeight;
  const svg = d3.select(svgEl); svg.selectAll("*").remove();

  const margin = { top: 8, right: 70, bottom: 52, left: 64 }; // bottom holds the rotated labels + axis title
  const innerW = Math.max(50, W - margin.left - margin.right);
  const innerH = Math.max(50, H - margin.top - margin.bottom);
  // fill the whole inner area, cells can be rectangular if panel is wider than tall
  const gridW = innerW;
  const gridH = innerH;

  const offsetX = margin.left;
  const offsetY = margin.top;
  // main g, shifted by margins
  const g = svg.append("g").attr("transform", `translate(${offsetX},${offsetY})`);

  // band scales: one row/column per type
  const x = d3.scaleBand().domain(TYPES).range([0, gridW]);
  const y = d3.scaleBand().domain(TYPES).range([0, gridH]);

  const maxCount = d3.max(TYPES, t1 => d3.max(TYPES, t2 => prep.typeMatrix[t1][t2]));
  // shift the scale so even small counts come out a visible blue
  const color = d3.scaleLinear()
    .domain([0, maxCount])
    .range(["#c6dbef", "#08306b"]);

  const cells = [];
  TYPES.forEach(t1 => TYPES.forEach(t2 => cells.push({ t1, t2, v: prep.typeMatrix[t1][t2] })));

  // one rect per (type1, type2) cell, fill = count
  g.selectAll("rect.cell").data(cells).enter().append("rect")
    .attr("class", "cell")
    .attr("x", d => x(d.t2))
    .attr("y", d => y(d.t1))
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("fill", d => d.v === 0 ? "#f3f4f6" : color(d.v))
    .attr("stroke", "#fff")
    .attr("stroke-width", 0.5)
    .on("mousemove", function(event, d) {
      showTooltip(event, `<strong>${d.t1}</strong> + <strong>${d.t2}</strong><br>Count: ${d.v}`);
    })
    .on("mouseleave", function() { hideTooltip(); });

  // numeric labels in non-empty cells
  g.selectAll("text.cell-label").data(cells.filter(d => d.v > 0)).enter().append("text")
    .attr("class", "cell-label")
    .attr("x", d => x(d.t2) + x.bandwidth() / 2)
    .attr("y", d => y(d.t1) + y.bandwidth() / 2 + 3)
    .attr("text-anchor", "middle")
    .style("font-size", Math.max(7, Math.min(10, Math.min(x.bandwidth(), y.bandwidth()) * 0.45)) + "px")
    .style("pointer-events", "none")
    .style("fill", d => d.v > maxCount * 0.45 ? "#fff" : "#1f2933")
    .text(d => d.v);

  // x axis (Type 2)
  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${gridH})`)
    .call(d3.axisBottom(x).tickSize(0))
    .selectAll("text")
      .attr("transform", "translate(-6,4) rotate(-45)")
      .style("text-anchor", "end")
      .style("fill", d => TYPE_COLORS[d])
      .style("font-weight", 600);

  // y axis (Type 1)
  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).tickSize(0))
    .selectAll("text")
      .style("fill", d => TYPE_COLORS[d])
      .style("font-weight", 600);

  g.selectAll(".axis path, .axis line").remove();

  // axis labels
  g.append("text").attr("class", "axis-label")
    .attr("x", gridW / 2).attr("y", gridH + margin.bottom - 2)
    .attr("text-anchor", "middle").text("Type 2: Secondary Type");
  g.append("text").attr("class", "axis-label")
    .attr("transform", `translate(${-(margin.left - 10)},${gridH / 2}) rotate(-90)`)
    .attr("text-anchor", "middle").text("Type 1: Primary Type");

  // legend on the right
  const legend = svg.append("g")
    .attr("transform", `translate(${offsetX + gridW + 16},${offsetY + 16})`);
  // legend title
  legend.append("text").attr("class", "legend-title")
    .attr("x", 0).attr("y", 0).text("Count");

  const steps = 5;
  const swatchSize = 14;
  for (let i = 0; i < steps; i++) {
    const v = Math.round((maxCount * i) / (steps - 1));
    // color swatch for this step
    legend.append("rect")
      .attr("x", 0)
      .attr("y", 10 + i * (swatchSize + 4))
      .attr("width", swatchSize)
      .attr("height", swatchSize)
      .attr("fill", v === 0 ? "#f3f4f6" : color(v))
      .attr("stroke", "#9ca3af");
    // count number next to swatch
    legend.append("text")
      .attr("class", "legend-text")
      .attr("x", swatchSize + 6)
      .attr("y", 10 + i * (swatchSize + 4) + swatchSize - 3)
      .text(v);
  }
}

// view 2: egg group chord diagram
function renderChord(prep) {
  const svgEl = document.getElementById("chord-svg");
  const W = svgEl.clientWidth, H = svgEl.clientHeight;
  const svg = d3.select(svgEl); svg.selectAll("*").remove();

  const size = Math.min(W, H);
  const outerR = size / 2 - 90;
  const innerR = outerR - 14;
  if (outerR < 40) return;

  // shift origin to center of svg so we can draw the ring around (0,0)
  const g = svg.append("g").attr("transform", `translate(${W/2},${H/2})`);

  // chord layout from the egg-group co-membership matrix
  const chordGen = d3.chord().padAngle(0.04).sortSubgroups(d3.descending);
  const chords = chordGen(prep.eggMatrix);

  // one color per egg group
  const eggColors = [
    "#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231",
    "#911eb4", "#42d4f4", "#f032e6", "#bfef45", "#fabebe",
    "#469990", "#dcbeff", "#9a6324", "#fffac8", "#800000"
  ];
  const groupColor = d3.scaleOrdinal().domain(prep.eggGroups).range(eggColors);

  // arc (outer ring) and ribbon (inner links) generators
  const arc = d3.arc().innerRadius(innerR).outerRadius(outerR);
  const ribbon = d3.ribbon().radius(innerR);

  // a <g> per egg group, holds the arc and its label
  const group = g.append("g").selectAll("g").data(chords.groups).enter().append("g");

  // the arc itself
  group.append("path")
    .attr("class", "chord-arc")
    .attr("fill", d => groupColor(prep.eggGroups[d.index]))
    .attr("stroke", "#333")
    .attr("d", arc)
    .on("mouseenter", function(event, d) {
      // only hover-highlight when nothing is selected
      if (chordSelection.length === 0) {
        ribbons.style("opacity", r => (r.source.index === d.index || r.target.index === d.index) ? 0.85 : 0.05);
        group.selectAll("path").style("opacity", g2 => g2.index === d.index ? 1 : 0.35);
      }
      showTooltip(event, `<strong>${prep.eggGroups[d.index]}</strong><br>${prep.eggTotals[d.index]} Pokemon`);
    })
    .on("mousemove", function(event) { moveTooltip(event); })
    .on("mouseleave", function() {
      hideTooltip();
      // restore selection styling on leave
      if (chordSelection.length === 0) {
        ribbons.style("opacity", 0.65);
        group.selectAll("path").style("opacity", 1);
      } else {
        applyChordSelection();
      }
    })
    // click to select up to two egg groups (click again to deselect)
    .on("click", function(event, d) {
      const i = d.index;
      const pos = chordSelection.indexOf(i);
      if (pos !== -1) {
        chordSelection.splice(pos, 1);
      } else if (chordSelection.length < 2) {
        chordSelection.push(i);
      } else {
        chordSelection = [i]; // had two already, start fresh from this one
      }
      applyChordSelection();
    });

  // arc labels
  group.append("text")
    .each(d => { d.angle = (d.startAngle + d.endAngle) / 2; })
    .attr("dy", "0.35em")
    .attr("transform", d => `
        rotate(${(d.angle * 180 / Math.PI - 90)})
        translate(${outerR + 6})
        ${d.angle > Math.PI ? "rotate(180)" : ""}`)
    .attr("text-anchor", d => d.angle > Math.PI ? "end" : "start")
    .style("font-size", "13px")
    .style("font-weight", 600)
    .style("fill", "#1f2933")
    .text(d => prep.eggGroups[d.index]);

  // ribbons. color matches whichever endpoint egg group has more Pokemon
  const ribbons = g.append("g").attr("fill-opacity", 0.65)
    .selectAll("path")
    .data(chords)
    .enter().append("path")
      .attr("class", "chord-ribbon")
      .attr("d", ribbon)
      .style("opacity", 0.65)
      .attr("fill", function(d) {
        const bigger = prep.eggTotals[d.source.index] >= prep.eggTotals[d.target.index]
                       ? d.source.index : d.target.index;
        return groupColor(prep.eggGroups[bigger]);
      })
      .attr("stroke", "#333")
      .attr("stroke-width", 0.3)
      .on("mousemove", function(event, d) {
        const a = prep.eggGroups[d.source.index], b = prep.eggGroups[d.target.index];
        const count = d.source.value;
        const msg = a === b
            ? `<strong>${a}</strong> (single-group)<br>${count} Pokemon`
            : `<strong>${a}</strong> ↔ <strong>${b}</strong><br>${count} Pokemon`;
        showTooltip(event, msg);
      })
      .on("mouseleave", function() { hideTooltip(); });

  // update arcs/ribbons/readout for the current selection (0, 1, or 2 groups)
  function applyChordSelection() {
    const promptEl = document.getElementById("chord-prompt");
    const listEl = document.getElementById("chord-list");
    const arcs = group.selectAll("path");
    const sel = chordSelection;

    if (sel.length === 0) {
      arcs.transition().duration(250).style("opacity", 1);
      ribbons.transition().duration(250).style("opacity", 0.65);
      promptEl.innerHTML = "Tip: click two egg groups to list Pokemon shared by both";
      listEl.innerHTML = "";
      return;
    }

    if (sel.length === 1) {
      const a = sel[0];
      arcs.transition().duration(250).style("opacity", d => d.index === a ? 1 : 0.25);
      ribbons.transition().duration(250)
        .style("opacity", r => (r.source.index === a || r.target.index === a) ? 0.85 : 0.05);
      promptEl.innerHTML = `Selected <strong>${prep.eggGroups[a]}</strong>. Now click a second egg group&hellip;`;
      listEl.innerHTML = "";
      return;
    }

    // two groups selected: isolate the ribbon between them and list the shared Pokemon
    const a = sel[0], b = sel[1];
    const ga = prep.eggGroups[a], gb = prep.eggGroups[b];
    arcs.transition().duration(250).style("opacity", d => (d.index === a || d.index === b) ? 1 : 0.18);
    ribbons.transition().duration(250).style("opacity", r => {
      const connectsAB = (r.source.index === a && r.target.index === b) ||
                         (r.source.index === b && r.target.index === a);
      return connectsAB ? 0.95 : 0.05;
    });

    const shared = prep.data.filter(d =>
      (d.eg1 === ga && d.eg2 === gb) || (d.eg1 === gb && d.eg2 === ga));
    promptEl.innerHTML = `<strong>${ga}</strong> &harr; <strong>${gb}</strong>: ` +
      `${shared.length} Pokemon belong to both groups and can breed across them`;
    listEl.innerHTML = shared.length
      ? shared.map(d => `<li>${d.name}</li>`).join("")
      : "<li class='empty'>No Pokemon belong to both of these groups.</li>";
  }

  applyChordSelection(); // restore selection after a re-render
}

// least squares fit of BST on catch rate; own function since the animation recomputes it per gen
function regressionLine(pts, x, y) {
  if (pts.length < 2) return null;
  const xs = pts.map(d => d.catchRate), ys = pts.map(d => d.bst);
  const meanX = d3.mean(xs), meanY = d3.mean(ys);
  let num = 0, den = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;
  return {
    x1: x(CATCH_MIN), y1: y(intercept + slope * CATCH_MIN),
    x2: x(CATCH_MAX), y2: y(intercept + slope * CATCH_MAX)
  };
}

// view 3: catch rate vs BST scatter
// draws the static frame; dots + trend line are filled per generation by updateScatterGen
function renderScatter(prep) {
  const svgEl = document.getElementById("scatter-svg");
  const W = svgEl.clientWidth, H = svgEl.clientHeight;
  const svg = d3.select(svgEl); svg.selectAll("*").remove();

  const margin = { top: 24, right: 130, bottom: 46, left: 52 }; // top band holds the watermark
  const innerW = Math.max(60, W - margin.left - margin.right);
  const innerH = Math.max(60, H - margin.top - margin.bottom);

  // Catch_Rate ranges 3 (legendaries, very hard to catch) to 255 (easy).
  const allPts = prep.data.filter(d =>
    TYPES.includes(d.type1) && Number.isFinite(d.catchRate));

  // main g, shifted by margins
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // x = catch rate
  const x = d3.scaleLinear().domain([0, CATCH_MAX]).range([0, innerW]);
  // y = BST, fixed over all generations so positions stay comparable as the cloud shifts
  const y = d3.scaleLinear()
              .domain(d3.extent(allPts, d => d.bst)).nice()
              .range([innerH, 0]);

  // x axis (catch rate)
  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).tickValues([CATCH_MIN, 45, 90, 150, 200, CATCH_MAX]));
  // y axis (BST)
  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(6));

  // axis labels
  g.append("text").attr("class", "axis-label")
    .attr("x", innerW / 2).attr("y", innerH + margin.bottom - 8)
    .attr("text-anchor", "middle").text(`Catch Rate (${CATCH_MIN} = hardest, ${CATCH_MAX} = easiest)`);
  g.append("text").attr("class", "axis-label")
    .attr("transform", `translate(${-(margin.left - 14)},${innerH / 2}) rotate(-90)`)
    .attr("text-anchor", "middle").text("Base Stat Total");

  // faint generation label in the top margin band
  const genWatermark = g.append("text")
    .attr("x", 0).attr("y", -8)
    .style("font-size", "20px").style("font-weight", "bold")
    .style("fill", "#d1d5db").style("pointer-events", "none");

  // trend line, retargeted each generation
  const trendLine = g.append("line")
    .attr("stroke", "#374151").attr("stroke-width", 1.5).attr("stroke-dasharray", "4 3");

  // brush below the dots so dot tooltips still fire; drag empty space to select
  const brush = d3.brush()
    .extent([[0, 0], [innerW, innerH]])
    .on("start brush end", function(event) { scatterBrushed(event); });
  const brushG = g.append("g").attr("class", "brush").call(brush);

  // group that holds the dot marks
  const dotsG = g.append("g");

  // centroid: crosshair + dot at (mean catch, mean BST); drifts as generations advance
  const centroid = g.append("g").style("pointer-events", "none");
  const meanCrossV = centroid.append("line").attr("y1", 0).attr("y2", innerH)
    .attr("stroke", "#c026d3").attr("stroke-width", 1).attr("stroke-dasharray", "2 2").attr("opacity", 0.45);
  const meanCrossH = centroid.append("line").attr("x1", 0).attr("x2", innerW)
    .attr("stroke", "#c026d3").attr("stroke-width", 1).attr("stroke-dasharray", "2 2").attr("opacity", 0.45);
  const meanDot = centroid.append("circle").attr("r", 6)
    .attr("fill", "#c026d3").attr("stroke", "#fff").attr("stroke-width", 1.5);
  // label pinned in the empty top-right corner so the numbers stay readable
  const meanLabel = centroid.append("text")
    .attr("x", innerW - 4).attr("y", 12).attr("text-anchor", "end")
    .style("font-size", "12px").style("font-weight", "bold").style("fill", "#c026d3");
  meanLabel.append("tspan").attr("class", "mean-catch").attr("x", innerW - 4);
  meanLabel.append("tspan").attr("class", "mean-bst").attr("x", innerW - 4).attr("dy", "1.3em");

  // legend (type swatches)
  const legend = svg.append("g")
    .attr("transform", `translate(${margin.left + innerW + 16},${margin.top})`);
  // legend title
  legend.append("text").attr("class", "legend-title").attr("y", 0).text("Type");
  const cols = 2;
  const swatch = 9, rowH = 12;
  TYPES.forEach((t, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const gx = col * 56, gy = 10 + row * rowH;
    // swatch for this type
    legend.append("rect")
      .attr("x", gx).attr("y", gy)
      .attr("width", swatch).attr("height", swatch)
      .attr("fill", TYPE_COLORS[t]);
    // type namr next to swatch
    legend.append("text")
      .attr("class", "legend-text")
      .attr("x", gx + swatch + 4).attr("y", gy + swatch - 1)
      .text(t);
  });
  // trend line sample for the legend
  let legendY = 10 + Math.ceil(TYPES.length / cols) * rowH + 6;
  legend.append("line")
    .attr("x1", 0).attr("x2", 18).attr("y1", legendY).attr("y2", legendY)
    .attr("stroke", "#374151").attr("stroke-width", 1.5).attr("stroke-dasharray", "4 3");
  // label for the trend line sample
  legend.append("text").attr("class", "legend-text")
    .attr("x", 22).attr("y", legendY + 3).text("Linear trend");
  // centroid sample for the legend
  legendY += 14;
  legend.append("circle")
    .attr("cx", 6).attr("cy", legendY).attr("r", 5)
    .attr("fill", "#c026d3").attr("stroke", "#fff").attr("stroke-width", 1.5);
  legend.append("text").attr("class", "legend-text")
    .attr("x", 22).attr("y", legendY + 3).text("Avg (centroid)");

  // stash what updateScatterGen needs, then draw the current generation
  const JITTER_PX = 4; // small horizontal jitter so dots at the same catch rate don't all stack
  scatterCtx = { g, x, y, allPts, JITTER_PX, dotsG, trendLine, centroid,
                 meanCrossV, meanCrossH, meanDot, meanLabel, genWatermark, brush, brushG };
  updateScatterGen(currentGen, false);
}

// used AI to figure out how to do the animated transitions between generations
// redraw the scatter for one generation; animate tweens between steps (false on first draw/resize)
function updateScatterGen(gen, animate) {
  if (!scatterCtx) return;
  const x = scatterCtx.x, y = scatterCtx.y, allPts = scatterCtx.allPts;
  const JITTER_PX = scatterCtx.JITTER_PX, dotsG = scatterCtx.dotsG;
  // ALL_GENS shows the whole cloud; otherwise just one generation
  const isAll = gen >= ALL_GENS;
  const pts = isAll ? allPts : allPts.filter(d => d.generation === gen);
  const dur = animate ? 700 : 0;
  const cx = d => x(d.catchRate) + d.jitter * JITTER_PX;
  const cy = d => y(d.bst);

  // dots keyed by name: old gen fades out, new gen fades in (timestep transition)
  const dots = dotsG.selectAll("circle").data(pts, d => d.name);
  dots.exit().transition().duration(dur).attr("opacity", 0).remove();
  dots.enter().append("circle")
      .attr("r", 3.2)
      .attr("fill", d => TYPE_COLORS[d.type1])
      .attr("stroke", "#1f2933")
      .attr("stroke-width", 0.3)
      .attr("opacity", 0)
      .attr("cx", cx).attr("cy", cy)
      .on("mousemove", function(event, d) {
        const types = d.type2 ? `${d.type1} / ${d.type2}` : d.type1;
        showTooltip(event, `<strong>${d.name}</strong><br>${types}<br>BST: ${d.bst}<br>Catch Rate: ${d.catchRate}`);
      })
      .on("mouseleave", function() { hideTooltip(); })
    .merge(dots).transition().duration(dur)
      .attr("cx", cx).attr("cy", cy)
      .attr("opacity", 0.8);

  const reg = regressionLine(pts, x, y);
  if (reg) {
    scatterCtx.trendLine.style("display", null).transition().duration(dur)
      .attr("x1", reg.x1).attr("y1", reg.y1).attr("x2", reg.x2).attr("y2", reg.y2);
  } else {
    scatterCtx.trendLine.style("display", "none");
  }

  const meanCatch = d3.mean(pts, d => d.catchRate);
  const meanBst = d3.mean(pts, d => d.bst);
  if (Number.isFinite(meanCatch) && Number.isFinite(meanBst)) {
    const px = x(meanCatch), py = y(meanBst);
    scatterCtx.centroid.style("display", null);
    scatterCtx.meanCrossV.transition().duration(dur).attr("x1", px).attr("x2", px);
    scatterCtx.meanCrossH.transition().duration(dur).attr("y1", py).attr("y2", py);
    scatterCtx.meanDot.transition().duration(dur).attr("cx", px).attr("cy", py);
    scatterCtx.meanLabel.select(".mean-catch").text(`avg catch: ${meanCatch.toFixed(0)}`);
    scatterCtx.meanLabel.select(".mean-bst").text(`avg BST: ${meanBst.toFixed(0)}`);
  } else {
    scatterCtx.centroid.style("display", "none");
  }

  scatterCtx.genWatermark.text(isAll ? "All Gens" : "Gen " + gen);
}

// brush handler: highlight dots inside the box, dim the rest, report count + avg catch
function scatterBrushed(event) {
  if (!scatterCtx) return;
  const x = scatterCtx.x, y = scatterCtx.y;
  const JITTER_PX = scatterCtx.JITTER_PX, dotsG = scatterCtx.dotsG;
  const readout = document.getElementById("scatter-selection");
  const sel = event.selection;

  if (!sel) { // no selection: restore dots, clear readout
    dotsG.selectAll("circle").attr("opacity", 0.8);
    readout.innerHTML = "";
    return;
  }

  const x0 = sel[0][0], y0 = sel[0][1];
  const x1 = sel[1][0], y1 = sel[1][1];
  const selected = [];
  dotsG.selectAll("circle").attr("opacity", function(d) {
    const cx = x(d.catchRate) + d.jitter * JITTER_PX;
    const cy = y(d.bst);
    const inside = cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
    if (inside) selected.push(d);
    return inside ? 0.95 : 0.1;
  });

  readout.innerHTML = selected.length
    ? `<strong>${selected.length}</strong> selected &middot; avg catch rate ${d3.mean(selected, d => d.catchRate).toFixed(0)}`
    : "0 selected";
}

// clear the brush (dots change when the generation changes)
function clearScatterBrush() {
  if (scatterCtx && scatterCtx.brushG) scatterCtx.brushG.call(scatterCtx.brush.move, null);
}

function renderAll(prep) {
  renderChord(prep);
  renderHeatmap(prep);
  renderScatter(prep);
}

// wire up the play/pause button and generation slider
function setupGenControls() {
  const playBtn = document.getElementById("gen-play");
  const slider = document.getElementById("gen-slider");
  const label = document.getElementById("gen-label");

  // jump to a generation, optionally animating
  function setGen(gen, animate) {
    currentGen = gen;
    slider.value = gen;
    label.textContent = gen >= ALL_GENS ? "All Generations" : "Generation " + gen;
    updateScatterGen(gen, animate);
    clearScatterBrush(); // dots changed, drop stale selection
  }

  function stopPlay() {
    genPlaying = false;
    playBtn.textContent = "▶ Play";
    if (genTimer) { clearInterval(genTimer); genTimer = null; }
  }

  function startPlay() {
    genPlaying = true;
    playBtn.textContent = "⏸ Pause";
    setGen(1, true);
    genTimer = setInterval(() => {
      // step 1-6, then settle on All Generations and stop
      if (currentGen >= 6) { setGen(ALL_GENS, true); stopPlay(); return; }
      setGen(currentGen + 1, true);
    }, 1300);
  }

  playBtn.addEventListener("click", () => (genPlaying ? stopPlay() : startPlay()));
  // dragging the slider scrubs generations manually, so pause any running playback first
  slider.addEventListener("input", () => { stopPlay(); setGen(+slider.value, true); });
}

d3.csv("data/pokemon_alopez247.csv").then(raw => {
  const prep = preprocess(raw);
  renderAll(prep);
  setupGenControls();

  // rerender when window resizes. using rAF so we don't spam redraws while dragging
  let pending = false;
  window.addEventListener("resize", () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      renderAll(prep);
    });
  });
}).catch(err => console.error(err));
