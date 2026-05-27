const STAT_COLS = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];
const COLOR = d3.scaleOrdinal(d3.schemeTableau10);

let allData = [];
let selectedGeneration = null;
let brushedIds = new Set();
let sortOverviewByCount = false;
let zoomTransform = d3.zoomIdentity;

const margin = { top: 36, right: 22, bottom: 50, left: 58 };
const tooltip = d3.select("#tooltip");

function parseRow(d) {
  return {
    Number: +d.Number,
    Name: d.Name,
    Type_1: d.Type_1,
    Type_2: d.Type_2 || "",
    Total: +d.Total,
    HP: +d.HP,
    Attack: +d.Attack,
    Defense: +d.Defense,
    Sp_Atk: +d.Sp_Atk,
    Sp_Def: +d.Sp_Def,
    Speed: +d.Speed,
    Generation: +d.Generation,
    isLegendary: d.isLegendary === "True"
  };
}

function getDims() {
  const w = window.innerWidth;
  const h = window.innerHeight - 40;
  const pad = 12;
  const topH = Math.floor(h * 0.43);
  const leftW = Math.floor(w * 0.42);
  return {
    overview: { x: pad, y: pad, w: leftW, h: topH },
    parallel: { x: leftW + pad * 2, y: pad, w: w - leftW - pad * 3, h: topH },
    scatter: { x: pad, y: topH + pad * 2, w: w - pad * 2, h: h - topH - pad * 3 }
  };
}

function filteredByGeneration() {
  if (selectedGeneration == null) return allData;
  return allData.filter(d => d.Generation === selectedGeneration);
}

function filteredForFocusViews() {
  const base = filteredByGeneration();
  if (brushedIds.size === 0) return base;
  return base.filter(d => brushedIds.has(d.Number));
}

function setStatus() {
  const g = selectedGeneration == null ? "All generations" : `Generation ${selectedGeneration}`;
  const b = brushedIds.size === 0 ? "No brush filter" : `${brushedIds.size} brushed`;
  const o = sortOverviewByCount ? "Order: by count" : "Order: by generation";
  d3.select("#status-text").text(`${g} | ${b} | ${o}`);
}

function viewRoot(svg, id, box) {
  let g = svg.select(`#${id}`);
  if (g.empty()) g = svg.append("g").attr("id", id);
  g.attr("transform", `translate(${box.x},${box.y})`);
  return g;
}

function drawTitle(g, title, subtitle) {
  g.append("text")
    .attr("x", 0)
    .attr("y", 14)
    .attr("font-size", 14)
    .attr("font-weight", 700)
    .text(title);
  g.append("text")
    .attr("x", 0)
    .attr("y", 30)
    .attr("font-size", 11)
    .attr("fill", "#4b5563")
    .text(subtitle);
}

function drawOverview(svg, box) {
  const g = viewRoot(svg, "overview-view", box);
  g.selectAll("*").remove();
  drawTitle(
    g,
    "Overview: Pokemon Count by Generation",
    "Selection interaction: click bars to filter. Double-click title area toggles ordering transition."
  );

  const innerW = box.w - margin.left - margin.right;
  const innerH = box.h - margin.top - margin.bottom;
  const plot = g.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  let counts = d3.rollups(allData, v => v.length, d => d.Generation)
    .map(([generation, count]) => ({ generation, count }));

  counts = sortOverviewByCount
    ? counts.sort((a, b) => d3.descending(a.count, b.count))
    : counts.sort((a, b) => d3.ascending(a.generation, b.generation));

  const x = d3.scaleBand()
    .domain(counts.map(d => d.generation))
    .range([0, innerW])
    .padding(0.22);
  const y = d3.scaleLinear()
    .domain([0, d3.max(counts, d => d.count)]).nice()
    .range([innerH, 0]);

  const t = d3.transition().duration(700).ease(d3.easeCubicInOut);

  plot.append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).tickFormat(d => `Gen ${d}`));
  plot.append("g")
    .call(d3.axisLeft(y).ticks(5));

  plot.append("text")
    .attr("x", innerW / 2).attr("y", innerH + 40)
    .attr("text-anchor", "middle").attr("font-size", 12)
    .text("Generation");
  plot.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2).attr("y", -42)
    .attr("text-anchor", "middle").attr("font-size", 12)
    .text("Count");

  const bars = plot.selectAll("rect.gen-bar")
    .data(counts, d => d.generation)
    .join(
      enter => enter.append("rect")
        .attr("class", "gen-bar")
        .attr("x", d => x(d.generation))
        .attr("width", x.bandwidth())
        .attr("y", innerH)
        .attr("height", 0)
        .attr("fill", d => selectedGeneration === d.generation ? "#ef4444" : "#3b82f6"),
      update => update,
      exit => exit.transition(t).attr("y", innerH).attr("height", 0).remove()
    );

  bars
    .style("cursor", "pointer")
    .on("click", (_, d) => {
      selectedGeneration = selectedGeneration === d.generation ? null : d.generation;
      brushedIds.clear();
      zoomTransform = d3.zoomIdentity;
      render();
    })
    .on("mousemove", (event, d) => showTip(event, `Generation ${d.generation}<br>Pokemon: ${d.count}`))
    .on("mouseleave", hideTip)
    .transition(t)
    .attr("x", d => x(d.generation))
    .attr("width", x.bandwidth())
    .attr("y", d => y(d.count))
    .attr("height", d => innerH - y(d.count))
    .attr("fill", d => selectedGeneration === d.generation ? "#ef4444" : "#3b82f6");

  g.append("rect")
    .attr("x", 0).attr("y", 0).attr("width", box.w).attr("height", 34)
    .attr("fill", "transparent")
    .on("dblclick", () => {
      sortOverviewByCount = !sortOverviewByCount;
      render();
    });

  const legend = g.append("g").attr("transform", `translate(${margin.left},${box.h - 18})`);
  legend.append("rect").attr("width", 12).attr("height", 12).attr("fill", "#3b82f6");
  legend.append("text").attr("x", 18).attr("y", 10).attr("font-size", 11).text("Unselected generation");
  legend.append("rect").attr("x", 145).attr("width", 12).attr("height", 12).attr("fill", "#ef4444");
  legend.append("text").attr("x", 163).attr("y", 10).attr("font-size", 11).text("Selected generation");
}

function drawScatter(svg, box) {
  const g = viewRoot(svg, "scatter-view", box);
  g.selectAll("*").remove();
  drawTitle(
    g,
    "Focus: Attack vs Special Attack (Brush + Zoom/Pan)",
    "Brushing + zoom/pan interaction. Brushed subset drives linked filtering in the advanced view."
  );

  const baseData = filteredByGeneration();
  const innerW = box.w - margin.left - margin.right;
  const innerH = box.h - margin.top - margin.bottom;
  const plot = g.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const xBase = d3.scaleLinear()
    .domain(d3.extent(baseData.length ? baseData : allData, d => d.Attack)).nice()
    .range([0, innerW]);
  const yBase = d3.scaleLinear()
    .domain(d3.extent(baseData.length ? baseData : allData, d => d.Sp_Atk)).nice()
    .range([innerH, 0]);
  const x = zoomTransform.rescaleX(xBase);
  const y = zoomTransform.rescaleY(yBase);

  const r = d3.scaleSqrt()
    .domain(d3.extent(allData, d => d.Total))
    .range([3, 12]);

  const xAxis = plot.append("g").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x).ticks(8));
  const yAxis = plot.append("g").call(d3.axisLeft(y).ticks(8));

  plot.append("text")
    .attr("x", innerW / 2).attr("y", innerH + 40)
    .attr("text-anchor", "middle").attr("font-size", 12)
    .text("Attack");
  plot.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2).attr("y", -42)
    .attr("text-anchor", "middle").attr("font-size", 12)
    .text("Special Attack");

  const t = d3.transition().duration(550).ease(d3.easeCubicInOut);
  const circles = plot.selectAll("circle.p")
    .data(baseData, d => d.Number)
    .join(
      enter => enter.append("circle")
        .attr("class", "p")
        .attr("cx", d => x(d.Attack))
        .attr("cy", d => y(d.Sp_Atk))
        .attr("r", 0)
        .attr("fill", d => COLOR(d.Type_1))
        .attr("fill-opacity", 0.68),
      update => update,
      exit => exit.transition(t).attr("r", 0).remove()
    );

  circles
    .on("mousemove", (event, d) => {
      showTip(
        event,
        `${d.Name}<br>Gen ${d.Generation}<br>${d.Type_1}${d.Type_2 ? "/" + d.Type_2 : ""}<br>Atk ${d.Attack}, SpA ${d.Sp_Atk}`
      );
    })
    .on("mouseleave", hideTip)
    .transition(t)
    .attr("cx", d => x(d.Attack))
    .attr("cy", d => y(d.Sp_Atk))
    .attr("r", d => r(d.Total))
    .attr("fill", d => COLOR(d.Type_1))
    .attr("fill-opacity", d => brushedIds.size === 0 || brushedIds.has(d.Number) ? 0.72 : 0.13)
    .attr("stroke", d => brushedIds.has(d.Number) ? "#111827" : "none")
    .attr("stroke-width", 1.8);

  const brush = d3.brush()
    .extent([[0, 0], [innerW, innerH]])
    .on("brush end", ({ selection }) => {
      if (!selection) {
        brushedIds.clear();
      } else {
        const [[x0, y0], [x1, y1]] = selection;
        brushedIds = new Set(
          baseData
            .filter(d => {
              const px = x(d.Attack);
              const py = y(d.Sp_Atk);
              return px >= x0 && px <= x1 && py >= y0 && py <= y1;
            })
            .map(d => d.Number)
        );
      }
      render();
    });

  plot.append("g").attr("class", "brush-layer").call(brush);

  const zoom = d3.zoom()
    .scaleExtent([1, 10])
    .translateExtent([[0, 0], [innerW, innerH]])
    .extent([[0, 0], [innerW, innerH]])
    .on("zoom", event => {
      zoomTransform = event.transform;
      xAxis.call(d3.axisBottom(zoomTransform.rescaleX(xBase)).ticks(8));
      yAxis.call(d3.axisLeft(zoomTransform.rescaleY(yBase)).ticks(8));
      circles
        .attr("cx", d => zoomTransform.rescaleX(xBase)(d.Attack))
        .attr("cy", d => zoomTransform.rescaleY(yBase)(d.Sp_Atk));
    });

  plot.append("rect")
    .attr("x", 0).attr("y", 0).attr("width", innerW).attr("height", innerH)
    .attr("fill", "transparent")
    .lower()
    .call(zoom)
    .call(zoom.transform, zoomTransform);

  const legend = g.append("g").attr("transform", `translate(${margin.left},${box.h - 16})`);
  legend.append("circle").attr("r", 5).attr("fill", "#9ca3af");
  legend.append("text").attr("x", 10).attr("y", 4).attr("font-size", 11).text("size maps Total");
  legend.append("circle").attr("cx", 110).attr("r", 5).attr("fill", "#9ca3af").attr("stroke", "#111827").attr("stroke-width", 1.8);
  legend.append("text").attr("x", 120).attr("y", 4).attr("font-size", 11).text("brushed/selected");
}

function drawParallel(svg, box) {
  const g = viewRoot(svg, "parallel-view", box);
  g.selectAll("*").remove();

  const focusData = filteredForFocusViews();
  drawTitle(
    g,
    "Advanced View: Parallel Coordinates (Base Stats)",
    `Advanced chart with animated filtering transition. Linked filter result: ${focusData.length} Pokemon`
  );

  const innerW = box.w - margin.left - margin.right;
  const innerH = box.h - margin.top - margin.bottom;
  const plot = g.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scalePoint().domain(STAT_COLS).range([0, innerW]).padding(0.12);
  const yByCol = {};
  STAT_COLS.forEach(col => {
    yByCol[col] = d3.scaleLinear()
      .domain(d3.extent(allData, d => d[col]))
      .range([innerH, 0]);
  });

  const line = d3.line()
    .x((d, i) => x(STAT_COLS[i]))
    .y((d, i) => yByCol[STAT_COLS[i]](d));

  plot.selectAll("path.bg")
    .data(filteredByGeneration(), d => d.Number)
    .join("path")
    .attr("class", "bg")
    .attr("d", d => line(STAT_COLS.map(c => d[c])))
    .attr("fill", "none")
    .attr("stroke", "#cbd5e1")
    .attr("stroke-width", 0.8)
    .attr("stroke-opacity", 0.35);

  const t = d3.transition().duration(600).ease(d3.easeCubicInOut);
  const fg = plot.selectAll("path.fg")
    .data(focusData, d => d.Number)
    .join(
      enter => enter.append("path")
        .attr("class", "fg")
        .attr("d", d => line(STAT_COLS.map(c => d[c])))
        .attr("fill", "none")
        .attr("stroke", d => COLOR(d.Type_1))
        .attr("stroke-width", 1.6)
        .attr("stroke-opacity", 0),
      update => update,
      exit => exit.transition(t).attr("stroke-opacity", 0).remove()
    );

  fg.transition(t)
    .attr("d", d => line(STAT_COLS.map(c => d[c])))
    .attr("stroke", d => COLOR(d.Type_1))
    .attr("stroke-opacity", 0.7);

  STAT_COLS.forEach(col => {
    const axisG = plot.append("g").attr("transform", `translate(${x(col)},0)`);
    axisG.append("line").attr("y1", 0).attr("y2", innerH).attr("stroke", "#94a3b8");
    axisG.append("g").call(d3.axisLeft(yByCol[col]).ticks(4)).select(".domain").remove();
    axisG.append("text")
      .attr("y", innerH + 24)
      .attr("text-anchor", "middle")
      .attr("font-size", 11)
      .text(col);
  });

  const shownTypes = [...new Set(filteredByGeneration().map(d => d.Type_1))].slice(0, 8);
  const legend = g.append("g").attr("transform", `translate(${margin.left},${box.h - 16})`);
  shownTypes.forEach((tName, i) => {
    const lg = legend.append("g").attr("transform", `translate(${i * 66},0)`);
    lg.append("line").attr("x1", 0).attr("x2", 16).attr("y1", 5).attr("y2", 5).attr("stroke", COLOR(tName)).attr("stroke-width", 3);
    lg.append("text").attr("x", 20).attr("y", 9).attr("font-size", 10).text(tName);
  });
}

function showTip(event, html) {
  tooltip.style("visibility", "visible")
    .style("left", `${event.clientX + 12}px`)
    .style("top", `${event.clientY + 12}px`)
    .html(html);
}

function hideTip() {
  tooltip.style("visibility", "hidden");
}

function render() {
  const svg = d3.select("#dashboard");
  svg.attr("width", window.innerWidth).attr("height", window.innerHeight - 40);
  const dims = getDims();
  drawOverview(svg, dims.overview);
  drawParallel(svg, dims.parallel);
  drawScatter(svg, dims.scatter);
  setStatus();
}

d3.select("#reset-all").on("click", () => {
  selectedGeneration = null;
  brushedIds.clear();
  sortOverviewByCount = false;
  zoomTransform = d3.zoomIdentity;
  render();
});

d3.csv("data/pokemon_alopez247.csv").then(rows => {
  allData = rows.map(parseRow);
  COLOR.domain([...new Set(allData.map(d => d.Type_1))].sort());
  render();
  window.addEventListener("resize", render);
});
