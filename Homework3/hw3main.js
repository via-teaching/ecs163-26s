

// ── Numeric columns available for axes ──
const NUM_COLS = ["age","absences","G1","G2","G3",
                  "studytime","failures","freetime",
                  "goout","Dalc","Walc","health",
                  "traveltime","famrel",
                  "Medu","Fedu"];

// Columns available for heatmap (categorical / low-card)
const CAT_COLS_HEAT_ROW = ["school","sex","address","famsize","Pstatus",
                            "Mjob","Fjob","reason","guardian","schoolsup",
                            "famsup","paid","activities","nursery","higher",
                            "internet","romantic"];
const CAT_COLS_HEAT_COL = ["failures","studytime","goout","freetime",
                            "health","traveltime","Dalc","Walc","famrel",
                            "Medu","Fedu"];

// Star axes (always the numeric stat columns)
const STAR_DIMS = ["G1","G2","G3","studytime","failures","absences",
                   "freetime","goout","health","age"];

// Color palettes for categorical grouping
const COLOR_CATS = ["school","sex","address","famsize","Pstatus",
                    "Mjob","Fjob","reason","guardian","higher","internet","romantic"];

// ── Global state ──
let allData      = [];          // current dataset
let selectedIds  = new Set();   // indices of selected rows (scatter brush / star click)
let currentDS    = "mat";       // "mat" or "por"

// ── Tooltip helpers ──
const tip = d3.select("#tooltip");
function showTip(html, evt) {
  tip.html(html).style("opacity", 1)
     .style("left", (evt.clientX + 14) + "px")
     .style("top",  (evt.clientY - 10) + "px");
}
function moveTip(evt) {
  tip.style("left", (evt.clientX + 14) + "px")
     .style("top",  (evt.clientY - 10) + "px");
}
function hideTip() { tip.style("opacity", 0); }

// ── Status bar ──
function updateStatus() {
  const n = allData.length;
  const s = selectedIds.size;
  d3.select("#status-total").text("Total: " + n);
  d3.select("#status-selected").text(
    s === 0 ? "Selected: all (brush to filter)" : "Selected: " + s + " students"
  );
}

// ── Populate selects ──
function populateSelects() {
  function fill(id, arr, def) {
    const sel = d3.select("#" + id);
    sel.selectAll("option").remove();
    arr.forEach(function(c) {
      sel.append("option").attr("value", c).text(c)
         .property("selected", c === def);
    });
  }
  fill("sel-x",        NUM_COLS,        "G3");
  fill("sel-y",        NUM_COLS,        "absences");
  fill("sel-color",    COLOR_CATS,      "sex");
  fill("sel-heat-row", CAT_COLS_HEAT_ROW, "sex");
  fill("sel-heat-col", CAT_COLS_HEAT_COL, "failures");
}

// ── Color scale (categorical) ──
const colorScale = d3.scaleOrdinal(d3.schemeTableau10);

// ── Panel / SVG sizing ──
function panelSize(panelId) {
  const el = document.getElementById(panelId);
  return { w: el.clientWidth, h: el.clientHeight - 28 }; // subtract title bar
}


//  SCATTER PLOT  (overview)

let scatterZoom = null;
let scatterG    = null;
let scatterXScale, scatterYScale;
let scatterBrushG = null;

function buildScatter() {
  const { w, h } = panelSize("panel-scatter");
  const margin = { top: 20, right: 20, bottom: 50, left: 50 };
  const iW = w - margin.left - margin.right;
  const iH = h - margin.top  - margin.bottom;

  const xCol   = document.getElementById("sel-x").value;
  const yCol   = document.getElementById("sel-y").value;
  const colCol = document.getElementById("sel-color").value;

  const svg = d3.select("#svg-scatter")
    .attr("width", w).attr("height", h);
  svg.selectAll("*").remove();

  // ── Clip path so dots don't overflow on zoom ──
  svg.append("defs").append("clipPath").attr("id", "scatter-clip")
    .append("rect").attr("width", iW).attr("height", iH);

  const root = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Scales
  scatterXScale = d3.scaleLinear()
    .domain(d3.extent(allData, d => +d[xCol])).nice()
    .range([0, iW]);
  scatterYScale = d3.scaleLinear()
    .domain(d3.extent(allData, d => +d[yCol])).nice()
    .range([iH, 0]);

  colorScale.domain([...new Set(allData.map(d => d[colCol]))]);

  // Axes groups (will be updated on zoom)
  const xAxisG = root.append("g").attr("class","axis")
    .attr("transform", `translate(0,${iH})`);
  const yAxisG = root.append("g").attr("class","axis");

  function drawAxes(xs, ys) {
    xAxisG.call(d3.axisBottom(xs).ticks(6).tickSize(-iH))
      .selectAll(".tick line").attr("stroke","#eee");
    yAxisG.call(d3.axisLeft(ys).ticks(6).tickSize(-iW))
      .selectAll(".tick line").attr("stroke","#eee");
    xAxisG.select(".domain").remove();
    yAxisG.select(".domain").remove();
  }
  drawAxes(scatterXScale, scatterYScale);

  // Axis labels
  root.append("text").attr("x", iW/2).attr("y", iH + 40)
    .attr("text-anchor","middle").style("font-size","11px").style("fill","#555")
    .text(xCol);
  root.append("text")
    .attr("transform",`translate(-38,${iH/2}) rotate(-90)`)
    .attr("text-anchor","middle").style("font-size","11px").style("fill","#555")
    .text(yCol);

  // Dots group (clipped)
  const dotsG = root.append("g").attr("clip-path","url(#scatter-clip)").attr("id","dots-g");

  function renderDots(xs, ys) {
    const dots = dotsG.selectAll("circle").data(allData, (d,i) => i);

    // ENTER with animated arrival (Filtering/Data Schema transition)
    dots.enter().append("circle")
      .attr("cx", d => xs(+d[xCol]))
      .attr("cy", d => ys(+d[yCol]))
      .attr("r", 0)
      .attr("fill", d => colorScale(d[colCol]))
      .attr("opacity", 0.7)
      .attr("stroke", "#fff").attr("stroke-width", 0.6)
      .attr("data-idx", (d,i) => i)
    .on("click", function(d, i) {
      // Ctrl+click = multi-select (Selection interaction)
      if (d3.event.ctrlKey || d3.event.metaKey) {
        if (selectedIds.has(i)) selectedIds.delete(i);
        else selectedIds.add(i);
      } else {
        selectedIds.clear();
        selectedIds.add(i);
      }
      updateAllHighlights();
    })
    .on("mouseover", function(d, i) {
      d3.select(this).raise().attr("r", 7).attr("opacity", 1);
      showTip(
        `<b>Student #${i+1}</b><br>
         ${xCol}: ${d[xCol]}<br>
         ${yCol}: ${d[yCol]}<br>
         ${colCol}: ${d[colCol]}<br>
         G3: ${d.G3}  Failures: ${d.failures}`,
        d3.event
      );
    })
    .on("mousemove", function() { moveTip(d3.event); })
    .on("mouseout", function() {
      const idx = +d3.select(this).attr("data-idx");
      d3.select(this).attr("r", selectedIds.has(idx) ? 6 : 4).attr("opacity", selectedIds.has(idx) ? 1 : 0.7);
      hideTip();
    })
    .transition().duration(500)
      .attr("r", (d,i) => selectedIds.has(i) ? 6 : 4);

    // UPDATE (View/Substrate transform on zoom or axis change)
    dots.attr("fill", d => colorScale(d[colCol]))
      .transition().duration(400)
        .attr("cx", d => xs(+d[xCol]))
        .attr("cy", d => ys(+d[yCol]))
        .attr("r", (d,i) => selectedIds.has(i) ? 6 : 4)
        .attr("opacity", (d,i) => selectedIds.size === 0 || selectedIds.has(i) ? 0.75 : 0.18)
        .attr("stroke", (d,i) => selectedIds.has(i) ? "#1a1f2e" : "#fff")
        .attr("stroke-width", (d,i) => selectedIds.has(i) ? 1.5 : 0.5);

    dots.exit().transition().duration(300).attr("r",0).remove();
  }

  renderDots(scatterXScale, scatterYScale);

  // ── Zoom / Pan (View Transformation) ──
  scatterZoom = d3.zoom()
    .scaleExtent([0.5, 20])
    .translateExtent([[-iW, -iH],[iW*2, iH*2]])
    .on("zoom", function() {
      const t = d3.event.transform;
      const newX = t.rescaleX(scatterXScale);
      const newY = t.rescaleY(scatterYScale);
      // Substrate transformation: axis rescaling on zoom
      drawAxes(newX, newY);
      dotsG.selectAll("circle")
        .attr("cx", d => newX(+d[xCol]))
        .attr("cy", d => newY(+d[yCol]));
    });

  // ── Brush (Brushing interaction) ──
  const brush = d3.brush()
    .extent([[0,0],[iW,iH]])
    .on("end", function() {
      if (!d3.event.selection) return;
      const [[x0,y0],[x1,y1]] = d3.event.selection;
      // Get current zoom transform
      const t = d3.zoomTransform(svg.node());
      const curX = t.rescaleX(scatterXScale);
      const curY = t.rescaleY(scatterYScale);

      selectedIds.clear();
      allData.forEach(function(d, i) {
        const cx = curX(+d[xCol]);
        const cy = curY(+d[yCol]);
        if (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1) {
          selectedIds.add(i);
        }
      });
      updateAllHighlights();
      // Remove brush after selection
      brushG.call(brush.move, null);
    });

  const brushG = root.append("g").attr("class","brush").call(brush);

  // Put zoom on SVG but only when NOT brushing
  svg.call(scatterZoom);
  // Brush sits on top – ensure brush handles zoom-independent
  brushG.raise();

  scatterG = dotsG;
}


//  2D HEATMAP  (focus)

function buildHeatmap(animated) {
  const { w, h } = panelSize("panel-heat");
  const margin = { top: 18, right: 20, bottom: 70, left: 90 };
  const iW = w - margin.left - margin.right;
  const iH = h - margin.top  - margin.bottom;

  const rowCol = document.getElementById("sel-heat-row").value;
  const colCol = document.getElementById("sel-heat-col").value;

  const svg = d3.select("#svg-heat")
    .attr("width", w).attr("height", h);

  // Work out which students are "active"
  const active = selectedIds.size === 0 ? allData
                 : allData.filter((d,i) => selectedIds.has(i));

  // Aggregate: average G3 per (rowVal × colVal)
  const rowVals = [...new Set(active.map(d => d[rowCol]))].sort();
  const colVals = [...new Set(active.map(d => d[colCol]))].sort();

  const cellMap = {};
  rowVals.forEach(r => {
    colVals.forEach(c => {
      const sub = active.filter(d => d[rowCol] === r && d[colCol] === c);
      cellMap[r + "||" + c] = {
        row: r, col: c,
        avg: sub.length ? d3.mean(sub, d => +d.G3) : null,
        n:   sub.length
      };
    });
  });

  const cells = Object.values(cellMap).filter(d => d.avg !== null);

  const colorHeat = d3.scaleSequential(d3.interpolateYlOrRd)
    .domain([0, 20]);

  const xBand = d3.scaleBand().domain(colVals).range([0, iW]).padding(0.05);
  const yBand = d3.scaleBand().domain(rowVals).range([0, iH]).padding(0.05);

  // Only remove axes / labels, keep existing cells for smooth transition
  svg.selectAll(".heat-axis,.heat-label,.heat-title,.no-data-msg").remove();

  // Draw / update cells with animated transition (Filtering transition)
  let cellSel = svg.select("g.heat-root");
  if (cellSel.empty()) {
    cellSel = svg.append("g").attr("class","heat-root")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  } else {
    cellSel.attr("transform", `translate(${margin.left},${margin.top})`);
  }

  const rects = cellSel.selectAll("rect.hcell").data(cells, d => d.row + "||" + d.col);

  // ENTER
  const enterSel = rects.enter().append("rect").attr("class","hcell")
    .attr("x",      d => xBand(d.col))
    .attr("y",      d => yBand(d.row))
    .attr("width",  xBand.bandwidth())
    .attr("height", yBand.bandwidth())
    .attr("fill",   "#f0f2f5")
    .attr("opacity", 0);

  enterSel
    .on("mouseover", function(d) {
      d3.select(this).attr("stroke","#333").attr("stroke-width",1.5);
      showTip(
        `<b>${rowCol}</b>: ${d.row}<br>
         <b>${colCol}</b>: ${d.col}<br>
         Avg G3: <b>${d.avg ? d.avg.toFixed(2) : "—"}</b><br>
         N: ${d.n}`,
        d3.event
      );
    })
    .on("mousemove", function() { moveTip(d3.event); })
    .on("mouseout", function() {
      d3.select(this).attr("stroke","#fff").attr("stroke-width",0.5);
      hideTip();
    });

  // Animated transition – color morph (Filtering + Visualization Change)
  const dur = animated ? 600 : 0;
  const delay = animated ? (d,i) => i * 12 : 0;

  enterSel.merge(rects)
    .transition().duration(dur).delay(delay)
      .attr("x",       d => xBand(d.col))
      .attr("y",       d => yBand(d.row))
      .attr("width",   xBand.bandwidth())
      .attr("height",  yBand.bandwidth())
      .attr("fill",    d => colorHeat(d.avg))
      .attr("opacity", 1);

  rects.exit()
    .transition().duration(300)
      .attr("opacity", 0).remove();

  // Axes (re-draw each time)
  const xAxisG = svg.append("g").attr("class","heat-axis axis")
    .attr("transform", `translate(${margin.left},${margin.top + iH})`);
  xAxisG.call(d3.axisBottom(xBand).tickSize(0))
    .selectAll("text").attr("transform","rotate(-40)")
    .style("text-anchor","end").style("font-size","9px");
  xAxisG.select(".domain").remove();

  const yAxisG = svg.append("g").attr("class","heat-axis axis")
    .attr("transform", `translate(${margin.left},${margin.top})`);
  yAxisG.call(d3.axisLeft(yBand).tickSize(0))
    .selectAll("text").style("font-size","9px");
  yAxisG.select(".domain").remove();

  // Axis labels
  svg.append("text").attr("class","heat-label")
    .attr("x", margin.left + iW/2).attr("y", h - 8)
    .attr("text-anchor","middle").style("font-size","10px").style("fill","#555")
    .text(colCol);
  svg.append("text").attr("class","heat-label")
    .attr("transform",`translate(12,${margin.top + iH/2}) rotate(-90)`)
    .attr("text-anchor","middle").style("font-size","10px").style("fill","#555")
    .text(rowCol);

  // Color legend bar
  const lgW = Math.min(iW * 0.6, 120), lgH = 10;
  const lgX = margin.left + iW - lgW, lgY = h - 20;

  const defs = svg.select("defs").empty() ? svg.append("defs") : svg.select("defs");
  defs.selectAll("#heat-grad").remove();
  const grad = defs.append("linearGradient").attr("id","heat-grad")
    .attr("x1","0%").attr("x2","100%");
  [0, 0.25, 0.5, 0.75, 1].forEach(t => {
    grad.append("stop").attr("offset", t*100+"%")
      .attr("stop-color", colorHeat(t*20));
  });
  svg.selectAll(".heat-lgbar,.heat-lg-lo,.heat-lg-hi,.heat-lg-label").remove();
  svg.append("rect").attr("class","heat-lgbar")
    .attr("x",lgX).attr("y",lgY).attr("width",lgW).attr("height",lgH)
    .attr("fill","url(#heat-grad)").attr("rx",2);
  svg.append("text").attr("class","heat-lg-lo")
    .attr("x",lgX).attr("y",lgY-2).style("font-size","8px").style("fill","#777").text("0");
  svg.append("text").attr("class","heat-lg-hi")
    .attr("x",lgX+lgW).attr("y",lgY-2).attr("text-anchor","end")
    .style("font-size","8px").style("fill","#777").text("20");
  svg.append("text").attr("class","heat-lg-label")
    .attr("x",lgX+lgW/2).attr("y",lgY-2).attr("text-anchor","middle")
    .style("font-size","8px").style("fill","#777").text("Avg G3");

  if (cells.length === 0) {
    svg.append("text").attr("class","no-data-msg")
      .attr("x", w/2).attr("y", h/2).attr("text-anchor","middle")
      .style("font-size","13px").style("fill","#aaa")
      .text("No data for selection");
  }
}


//  STAR COORDINATES  (advanced)

let starZoomState = d3.zoomIdentity;

function buildStar() {
  const { w, h } = panelSize("panel-star");
  const cx = w / 2, cy = h / 2;
  const R  = Math.min(w, h) * 0.36;

  const svg = d3.select("#svg-star")
    .attr("width", w).attr("height", h);
  svg.selectAll("*").remove();

  const dims = STAR_DIMS.filter(d => allData[0] && d in allData[0]);
  const nDims = dims.length;

  // Axis angles evenly spaced
  function axisAngle(i) { return (2 * Math.PI * i / nDims) - Math.PI / 2; }
  function axisEnd(i)   { return { x: cx + R * Math.cos(axisAngle(i)),
                                    y: cy + R * Math.sin(axisAngle(i)) }; }

  // Per-dimension scale (0 → max)
  const dimScales = {};
  dims.forEach(dim => {
    dimScales[dim] = d3.scaleLinear()
      .domain([0, d3.max(allData, d => +d[dim]) || 1])
      .range([0, R]);
  });

  // Project a data point onto the star space
  // Star Coordinates: each data point projects to sum of scaled axis vectors
  function starProject(d) {
    let px = 0, py = 0;
    dims.forEach((dim, i) => {
      const s = dimScales[dim](+d[dim]);
      px += s * Math.cos(axisAngle(i));
      py += s * Math.sin(axisAngle(i));
    });
    return { x: cx + px / nDims, y: cy + py / nDims };
  }

  const colCol = document.getElementById("sel-color").value;
  colorScale.domain([...new Set(allData.map(d => d[colCol]))]);

  // ── Zoom group ──
  const zoomG = svg.append("g").attr("id","star-zoom-g");

  // Apply stored zoom state immediately (for re-renders)
  zoomG.attr("transform", starZoomState.toString());

  // Draw axes
  dims.forEach((dim, i) => {
    const end = axisEnd(i);
    zoomG.append("line").attr("class","star-axis")
      .attr("x1", cx).attr("y1", cy)
      .attr("x2", end.x).attr("y2", end.y);

    // Label at end of axis
    const angle = axisAngle(i);
    const lx = cx + (R + 14) * Math.cos(angle);
    const ly = cy + (R + 14) * Math.sin(angle);
    zoomG.append("text").attr("class","star-axis-label")
      .attr("x", lx).attr("y", ly)
      .attr("text-anchor", Math.abs(angle) > Math.PI/2 ? "end" : "start")
      .attr("dominant-baseline","middle")
      .text(dim);
  });

  // Center reference circle
  zoomG.append("circle")
    .attr("cx", cx).attr("cy", cy).attr("r", R)
    .attr("fill","none").attr("stroke","#e8ecf4").attr("stroke-width",1);
  zoomG.append("circle")
    .attr("cx", cx).attr("cy", cy).attr("r", R*0.5)
    .attr("fill","none").attr("stroke","#f0f2f5").attr("stroke-dasharray","3,3");

  // Dots
  const points = allData.map((d,i) => {
    const p = starProject(d);
    return { d, i, x: p.x, y: p.y };
  });

  const dotsG = zoomG.append("g").attr("id","star-dots");

  dotsG.selectAll("circle.star-dot")
    .data(points)
    .enter().append("circle").attr("class","star-dot")
      .attr("cx", p => p.x)
      .attr("cy", p => p.y)
      .attr("r",  0)
      .attr("fill",    p => colorScale(p.d[colCol]))
      .attr("opacity", p => selectedIds.size === 0 || selectedIds.has(p.i) ? 0.75 : 0.15)
      .attr("stroke",  p => selectedIds.has(p.i) ? "#1a1f2e" : "#fff")
      .attr("stroke-width", p => selectedIds.has(p.i) ? 1.5 : 0.4)
    .on("click", function(p) {
      // Selection interaction: Ctrl+click for multi-select
      if (d3.event.ctrlKey || d3.event.metaKey) {
        if (selectedIds.has(p.i)) selectedIds.delete(p.i);
        else selectedIds.add(p.i);
      } else {
        const wasSelected = selectedIds.has(p.i) && selectedIds.size === 1;
        selectedIds.clear();
        if (!wasSelected) selectedIds.add(p.i);
      }
      updateAllHighlights();
    })
    .on("mouseover", function(p) {
      d3.select(this).raise().attr("r", 7).attr("opacity",1);
      showTip(
        `<b>Student #${p.i+1}</b><br>
         G3: ${p.d.G3}  G2: ${p.d.G2}<br>
         Failures: ${p.d.failures}<br>
         Studytime: ${p.d.studytime}<br>
         Absences: ${p.d.absences}<br>
         ${colCol}: ${p.d[colCol]}`,
        d3.event
      );
    })
    .on("mousemove", function() { moveTip(d3.event); })
    .on("mouseout", function(p) {
      d3.select(this)
        .attr("r", selectedIds.has(p.i) ? 5.5 : 3.5)
        .attr("opacity", selectedIds.size === 0 || selectedIds.has(p.i) ? 0.75 : 0.15);
      hideTip();
    })
    // Animated entrance (Filtering transition)
    .transition().duration(600).delay((p,j) => j * 0.8)
      .attr("r", p => selectedIds.has(p.i) ? 5.5 : 3.5);

  // ── Pan & Zoom (View Transformation) ──
  const starZoom = d3.zoom()
    .scaleExtent([0.4, 12])
    .on("zoom", function() {
      starZoomState = d3.event.transform;
      zoomG.attr("transform", starZoomState.toString());
    });

  svg.call(starZoom);
  // Restore saved zoom
  svg.call(starZoom.transform, starZoomState);
}


//  CROSS-VIEW HIGHLIGHT

function updateAllHighlights() {
  updateStatus();

  // ── Scatter dot highlight (animated) ──
  d3.select("#dots-g").selectAll("circle")
    .transition().duration(300)
      .attr("r",       (d,i) => selectedIds.has(i) ? 6 : 3.5)
      .attr("opacity", (d,i) => selectedIds.size === 0 || selectedIds.has(i) ? 0.78 : 0.12)
      .attr("stroke",  (d,i) => selectedIds.has(i) ? "#1a1f2e" : "#fff")
      .attr("stroke-width", (d,i) => selectedIds.has(i) ? 1.5 : 0.5);

  // ── Star dot highlight (animated) ──
  d3.select("#star-dots").selectAll("circle")
    .transition().duration(300)
      .attr("r",       p => selectedIds.has(p.i) ? 5.5 : 3.5)
      .attr("opacity", p => selectedIds.size === 0 || selectedIds.has(p.i) ? 0.78 : 0.12)
      .attr("stroke",  p => selectedIds.has(p.i) ? "#1a1f2e" : "#fff")
      .attr("stroke-width", p => selectedIds.has(p.i) ? 1.5 : 0.4);

  // ── Heatmap: animated color refresh on selection (Filtering transition) ──
  buildHeatmap(true);
}


//  DATA LOAD & INIT

function loadData(ds) {
  const file = ds === "mat" ? "student-mat.csv" : "student-por.csv";
  d3.csv(file).then(function(data) {
    allData = data;
    selectedIds.clear();
    starZoomState = d3.zoomIdentity;

    // Normalize all numeric fields
    NUM_COLS.concat(["G1","G2","G3"]).forEach(function(c) {
      allData.forEach(d => { d[c] = isNaN(+d[c]) ? d[c] : +d[c]; });
    });

    updateStatus();
    buildScatter();
    buildHeatmap(false);
    buildStar();
  }).catch(function(err) {
    console.error("Failed to load " + file, err);
    d3.select("body").append("div")
      .style("position","fixed").style("top","50px").style("left","20px")
      .style("background","#fee").style("padding","12px").style("border-radius","4px")
      .style("font-size","13px").style("color","#900")
      .html("⚠ Could not load <b>" + file + "</b>.<br>Place CSV files in the same folder as index.html.");
  });
}


//  CONTROLS WIRING

function wireControls() {
  // Dataset toggle (Data Schema Change transition)
  d3.selectAll(".ds-btn").on("click", function() {
    d3.selectAll(".ds-btn").classed("active", false);
    d3.select(this).classed("active", true);
    currentDS = d3.select(this).attr("data-ds");
    loadData(currentDS);
  });

  // Scatter axis selects (Visualization Change / Data Schema Change)
  d3.select("#sel-x").on("change", function() {
    buildScatter();
  });
  d3.select("#sel-y").on("change", function() {
    buildScatter();
  });
  d3.select("#sel-color").on("change", function() {
    buildScatter();
    buildStar();
  });

  // Heatmap selects (Data Schema Change)
  d3.select("#sel-heat-row").on("change", function() { buildHeatmap(true); });
  d3.select("#sel-heat-col").on("change", function() { buildHeatmap(true); });

  // Reset
  d3.select("#btn-reset").on("click", function() {
    selectedIds.clear();
    updateAllHighlights();
  });

  // Resize
  window.addEventListener("resize", function() {
    buildScatter();
    buildHeatmap(false);
    buildStar();
  });
}


//  BOOT

populateSelects();
wireControls();
loadData("mat");