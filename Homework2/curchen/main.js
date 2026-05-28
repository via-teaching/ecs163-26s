const TYPE_COLORS = {
  Normal: "#A8A77A", Fire: "#EE8130", Water: "#6390F0", Electric: "#F7D02C",
  Grass:  "#7AC74C", Ice:  "#96D9D6", Fighting: "#C22E28", Poison: "#A33EA1",
  Ground: "#E2BF65", Flying: "#A98FF3", Psychic: "#F95587", Bug: "#A6B91A",
  Rock:   "#B6A136", Ghost: "#735797", Dragon: "#6F35FC", Dark: "#705746",
  Steel:  "#B7B7CE", Fairy: "#D685AD"
};
const TYPES = Object.keys(TYPE_COLORS);

const tooltip = d3.select("#tooltip");

// preprocess the data
function preprocess(rawData) {
  const data = rawData.map(d => ({
    name: d.Name,
    type1: d.Type_1,
    type2: d.Type_2 && d.Type_2.length ? d.Type_2 : null,
    bst: +d.Total,  // CSV already has Total = sum of 6 stats
    eg1: d.Egg_Group_1 || null,
    eg2: d.Egg_Group_2 && d.Egg_Group_2.length ? d.Egg_Group_2 : null,
    catchRate: +d.Catch_Rate,
    // used ai to figure out best way to visualize pokemon with overlapping BST and catch rate
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
      eggMatrix[i][i] += 1; // self-loop for single-group species
    }
  });

  return { data, typeMatrix, eggGroups, eggMatrix, eggTotals };
}

// view 1: type co-occurrence heatmap
function renderHeatmap(prep) {
  const svgEl = document.getElementById("heatmap-svg");
  const W = svgEl.clientWidth, H = svgEl.clientHeight;
  const svg = d3.select(svgEl); svg.selectAll("*").remove();

  const margin = { top: 18, right: 70, bottom: 60, left: 64 };
  const innerW = Math.max(50, W - margin.left - margin.right);
  const innerH = Math.max(50, H - margin.top - margin.bottom);
  // fill the whole inner area, cells can be rectangular if panel is wider than tall
  const gridW = innerW;
  const gridH = innerH;

  const offsetX = margin.left;
  const offsetY = margin.top;
  // main g, shifted by margins
  const g = svg.append("g").attr("transform", `translate(${offsetX},${offsetY})`);

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
      tooltip.style("opacity", 1)
        .html(`<strong>${d.t1}</strong> + <strong>${d.t2}</strong><br>Count: ${d.v}`)
        .style("left", (event.clientX + 14) + "px")
        .style("top", (event.clientY + 14) + "px");
    })
    .on("mouseleave", function() {
      tooltip.style("opacity", 0);
    });

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
    .attr("x", gridW / 2).attr("y", gridH + 50)
    .attr("text-anchor", "middle").text("Type 2: Secondary Type");
  g.append("text").attr("class", "axis-label")
    .attr("transform", `translate(-54,${gridH / 2}) rotate(-90)`)
    .attr("text-anchor", "middle").text("Type 1: Primary Type");

  // legend on the right
  const legend = svg.append("g")
    .attr("transform", `translate(${offsetX + gridW + 16},${offsetY})`);
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

  const chordGen = d3.chord().padAngle(0.04).sortSubgroups(d3.descending);
  const chords = chordGen(prep.eggMatrix);

  const eggColors = [
    "#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231",
    "#911eb4", "#42d4f4", "#f032e6", "#bfef45", "#fabebe",
    "#469990", "#dcbeff", "#9a6324", "#fffac8", "#800000"
  ];
  const groupColor = d3.scaleOrdinal().domain(prep.eggGroups).range(eggColors);

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
      ribbons.style("opacity", r => (r.source.index === d.index || r.target.index === d.index) ? 0.85 : 0.05);
      group.selectAll("path").style("opacity", g2 => g2.index === d.index ? 1 : 0.35);
      tooltip.style("opacity", 1)
        .html(`<strong>${prep.eggGroups[d.index]}</strong><br>${prep.eggTotals[d.index]} Pokemon`)
        .style("left", (event.clientX + 14) + "px")
        .style("top", (event.clientY + 14) + "px");
    })
    .on("mousemove", function(event) {
      tooltip.style("left", (event.clientX + 14) + "px")
             .style("top", (event.clientY + 14) + "px");
    })
    .on("mouseleave", function() {
      ribbons.style("opacity", 0.65);
      group.selectAll("path").style("opacity", 1);
      tooltip.style("opacity", 0);
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
        tooltip.style("opacity", 1)
          .html(msg)
          .style("left", (event.clientX + 14) + "px")
          .style("top", (event.clientY + 14) + "px");
      })
      .on("mouseleave", function() {
        tooltip.style("opacity", 0);
      });

}

// view 3: catch rate vs BST scatter
function renderScatter(prep) {
  const svgEl = document.getElementById("scatter-svg");
  const W = svgEl.clientWidth, H = svgEl.clientHeight;
  const svg = d3.select(svgEl); svg.selectAll("*").remove();

  const margin = { top: 18, right: 130, bottom: 46, left: 52 };
  const innerW = Math.max(60, W - margin.left - margin.right);
  const innerH = Math.max(60, H - margin.top - margin.bottom);

  // Catch_Rate ranges 3 (legendaries, very hard to catch) to 255 (easy).
  const pts = prep.data.filter(d =>
    TYPES.includes(d.type1) && Number.isFinite(d.catchRate));

  // main g, shifted by margins
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear().domain([0, 255]).range([0, innerW]);
  const y = d3.scaleLinear()
              .domain(d3.extent(pts, d => d.bst)).nice()
              .range([innerH, 0]);

  // x axis (catch rate)
  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).tickValues([3, 45, 90, 150, 200, 255]));
  // y axis (BST)
  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(6));

  // x axis label
  g.append("text").attr("class", "axis-label")
    .attr("x", innerW / 2).attr("y", innerH + 38)
    .attr("text-anchor", "middle").text("Catch Rate (3 = hardest, 255 = easiest)");
  // y axis label
  g.append("text").attr("class", "axis-label")
    .attr("transform", `translate(-38,${innerH / 2}) rotate(-90)`)
    .attr("text-anchor", "middle").text("Base Stat Total");

  // linear regression of BST vs catch rate
  if (pts.length >= 2) {
    const xs = pts.map(d => d.catchRate);
    const ys = pts.map(d => d.bst);
    const meanX = d3.mean(xs), meanY = d3.mean(ys);
    let num = 0, den = 0;
    for (let i = 0; i < xs.length; i++) {
      num += (xs[i] - meanX) * (ys[i] - meanY);
      den += (xs[i] - meanX) ** 2;
    }
    const slope = den === 0 ? 0 : num / den;
    const intercept = meanY - slope * meanX;
    g.append("line")
      .attr("x1", x(3)).attr("y1", y(intercept + slope * 3))
      .attr("x2", x(255)).attr("y2", y(intercept + slope * 255))
      .attr("stroke", "#374151")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "4 3");
  }

  // small horizontal jitter so dots at the same catch rate (esp. catch=3 legendaries) don't all stack
  const JITTER_PX = 4;
  g.append("g").selectAll("circle").data(pts).enter().append("circle")
    .attr("cx", d => x(d.catchRate) + d.jitter * JITTER_PX)
    .attr("cy", d => y(d.bst))
    .attr("r", 3.2)
    .attr("fill", d => TYPE_COLORS[d.type1])
    .attr("stroke", "#1f2933")
    .attr("stroke-width", 0.3)
    .attr("opacity", 0.8)
    .on("mousemove", function(event, d) {
      const types = d.type2 ? `${d.type1} / ${d.type2}` : d.type1;
      tooltip.style("opacity", 1)
        .html(`<strong>${d.name}</strong><br>${types}<br>BST: ${d.bst}<br>Catch Rate: ${d.catchRate}`)
        .style("left", (event.clientX + 14) + "px")
        .style("top", (event.clientY + 14) + "px");
    })
    .on("mouseleave", function() {
      tooltip.style("opacity", 0);
    });

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
  const trendY = 10 + Math.ceil(TYPES.length / cols) * rowH + 6;
  legend.append("line")
    .attr("x1", 0).attr("x2", 18).attr("y1", trendY).attr("y2", trendY)
    .attr("stroke", "#374151").attr("stroke-width", 1.5).attr("stroke-dasharray", "4 3");
  // label for the trend line sample
  legend.append("text").attr("class", "legend-text")
    .attr("x", 22).attr("y", trendY + 3).text("Linear trend");
}

function renderAll(prep) {
  renderChord(prep);
  renderHeatmap(prep);
  renderScatter(prep);
}

d3.csv("data/pokemon_alopez247.csv").then(raw => {
  const prep = preprocess(raw);
  renderAll(prep);

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
}).catch(err => console.log(err));
