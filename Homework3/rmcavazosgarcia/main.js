// ═══════════════════════════════════════════════════════════════════════════
//  ECS 163 – Homework 3: Visualization Dashboard Part 2 (Interactivity)
//  Author  : rmcavazosgarcia
//  Dataset : ds_salaries.csv  (3,755 data science job records, 2020–2023)
//
//  Dashboard layout (focus + context paradigm):
//    View 1 (top-left)  – Horizontal Bar Chart: Top 20 Job Titles by Avg Salary
//                         CONTEXT / OVERVIEW of the salary landscape
//    View 2 (top-right) – Grouped Bar Chart: Avg Salary by Experience × Company Size
//                         FOCUS view – shows how seniority and company scale interact
//    View 3 (bottom)    – Parallel Coordinates: multi-dimensional salary profiler
//                         FOCUS / ADVANCED view – trace individual records across dims
//
//  ── Interaction 1: BRUSHING (d3-brush) ───────────────────────────────────
//    A horizontal brush on the Bar Chart's x-axis lets users select a salary
//    range. Both the Grouped Bar and the PCP update in real time, filtering
//    data to only those records within the brushed range.
//    This implements the "Filtering" transition type from the HW spec.
//
//  ── Interaction 2: SELECTION (click) ─────────────────────────────────────
//    Clicking a bar in View 1 selects a job title; clicking a bar group in
//    View 2 selects an experience level. The PCP then highlights matching
//    lines and dims unrelated ones with a smooth opacity transition.
//    This implements a "Filtering / focus" transition on the PCP.
//
//  ── Animated Transitions ─────────────────────────────────────────────────
//    • Bar width/height animates on filter dropdown changes (Filtering)
//    • PCP line opacity fades smoothly on selection change (Filtering)
//    • Enter bars animate from zero width/height (avoids pop-in)
//    • Exit bars shrink before removal (Filtering)
// ═══════════════════════════════════════════════════════════════════════════

// ── Lookup maps and display orders ────────────────────────────────────────
const EXP_MAP    = { EN: "Entry", MI: "Mid", SE: "Senior", EX: "Executive" };
const EXP_ORDER  = ["EN", "MI", "SE", "EX"];
// Distinct color per experience level, used in PCP and legends
const EXP_COLORS = { EN: "#4fc3f7", MI: "#81c784", SE: "#ffb74d", EX: "#f06292" };

const SIZE_MAP    = { S: "Small", M: "Medium", L: "Large" };
const SIZE_ORDER  = ["S", "M", "L"];
// Distinct color per company size, used in Grouped Bar
const SIZE_COLORS = { S: "#9c8fff", M: "#4dd0e1", L: "#f48fb1" };

const REMOTE_MAP = { "0": "On-site", "50": "Hybrid", "100": "Remote" };

// Duration (ms) for all animated transitions — 500ms is long enough to track
// changes but short enough not to feel sluggish (HW spec guideline)
const TRANSITION_DURATION = 500;

// ── Application state ─────────────────────────────────────────────────────
let allData      = [];   // full parsed dataset
let filteredData = [];   // current subset after dropdowns + brush

// Brush state: [minSalary, maxSalary] or null when no brush is active
let brushRange    = null;
// Selection state: at most one of these is non-null at a time
let selectedTitle = null;  // job_title string from View 1 click
let selectedExp   = null;  // experience_level key from View 2 click

// ── Tooltip (shared across all views) ─────────────────────────────────────
const tooltip = d3.select("#tooltip");

// Show tooltip near the cursor with arbitrary HTML content
function showTip(html, event) {
  tooltip.html(html)
    .style("display", "block")
    .style("left", (event.clientX + 14) + "px")
    .style("top",  (event.clientY - 10) + "px");
}
// Track cursor movement so tooltip follows the mouse
function moveTip(event) {
  tooltip
    .style("left", (event.clientX + 14) + "px")
    .style("top",  (event.clientY - 10) + "px");
}
function hideTip() { tooltip.style("display", "none"); }

// ── Layout geometry ───────────────────────────────────────────────────────
// Computes pixel dimensions for each view based on current window size.
// Called at build time; not reactive to resize (intentional for simplicity).
function getDims() {
  const W = document.getElementById("main-svg").clientWidth  || window.innerWidth;
  const H = document.getElementById("main-svg").clientHeight || (window.innerHeight - 84);

  // Margins follow the D3 margin convention: {top, right, bottom, left}
  const barM = { top: 48, right: 24, bottom: 58, left: 200 };
  const grpM = { top: 48, right: 32, bottom: 58, left: 72  };
  const pcpM = { top: 58, right: 60, bottom: 24, left: 60  };

  return {
    W, H,
    // View 1: left 44% of width, top 50% of height
    bar: { x: 0,        y: 0,       m: barM,
           w: W*0.44 - barM.left - barM.right,
           h: H*0.50 - barM.top  - barM.bottom },
    // View 2: right 56% of width, top 50% of height
    grp: { x: W*0.44,  y: 0,       m: grpM,
           w: W*0.56 - grpM.left - grpM.right,
           h: H*0.50 - grpM.top  - grpM.bottom },
    // View 3: full width, bottom 48% of height
    pcp: { x: 0,        y: H*0.52,  m: pcpM,
           w: W        - pcpM.left - pcpM.right,
           h: H*0.46 - pcpM.top  - pcpM.bottom },
  };
}

// ── Status bar text ───────────────────────────────────────────────────────
// Updates the top-right text to reflect current filter/selection state
function updateInfo() {
  const n = filteredData.length;
  let msg = `Showing ${n.toLocaleString()} of ${allData.length.toLocaleString()} records`;
  if (brushRange)    msg += `  ·  salary brush $${Math.round(brushRange[0]/1000)}k – $${Math.round(brushRange[1]/1000)}k`;
  if (selectedTitle) msg += `  ·  selected: ${selectedTitle}`;
  if (selectedExp)   msg += `  ·  exp filter: ${EXP_MAP[selectedExp]}`;
  d3.select("#sel-info").text(msg);
}

// ── Filter logic ──────────────────────────────────────────────────────────
// Rebuilds filteredData from the dropdown values and the active brush range.
// Called every time any filter changes before redrawing views.
function refilter() {
  const exp  = document.getElementById("exp-filter").value;
  const year = document.getElementById("year-filter").value;
  const size = document.getElementById("size-filter").value;

  filteredData = allData.filter(d => {
    if (exp  !== "ALL" && d.experience_level !== exp)          return false;
    if (year !== "ALL" && String(d.work_year) !== year)         return false;
    if (size !== "ALL" && d.company_size      !== size)         return false;
    if (brushRange &&
        (d.salary_in_usd < brushRange[0] ||
         d.salary_in_usd > brushRange[1]))                     return false;
    return true;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
//  DATA LOAD & EVENT WIRING
// ═══════════════════════════════════════════════════════════════════════════
d3.csv("data/ds_salaries.csv").then(function(raw) {

  // Coerce numeric columns once at load time
  raw.forEach(d => {
    d.salary_in_usd = +d.salary_in_usd;
    d.remote_ratio  = +d.remote_ratio;
    d.work_year     = +d.work_year;
  });
  // Remove any rows with missing/zero salary
  allData      = raw.filter(d => d.salary_in_usd > 0);
  filteredData = allData.slice();

  // Build the three views for the first time
  buildCharts();

  // ── Dropdown filter listeners ──
  // Each change clears any active brush (to avoid compounding filters that
  // confuse the user) and redraws all three views with animation.
  ["exp-filter", "year-filter", "size-filter"].forEach(id => {
    document.getElementById(id).addEventListener("change", () => {
      brushRange = null;       // clear brush range so it doesn't compound
      clearBrushVisual();      // remove the brush rectangle from the DOM
      refilter();
      updateBarChart(true);    // true = animate the transition
      updateGroupedBar(true);
      updatePCP();
      updateInfo();
    });
  });

  // ── Reset button ──
  // Clears all state and restores the full unfiltered view
  document.getElementById("reset-btn").addEventListener("click", () => {
    brushRange    = null;
    selectedTitle = null;
    selectedExp   = null;
    document.getElementById("exp-filter").value  = "ALL";
    document.getElementById("year-filter").value = "ALL";
    document.getElementById("size-filter").value = "ALL";
    clearBrushVisual();
    refilter();
    updateBarChart(true);
    updateGroupedBar(true);
    updatePCP();
    updateInfo();
  });

}).catch(err => console.error("CSV load error:", err));

// ═══════════════════════════════════════════════════════════════════════════
//  INITIAL BUILD — creates the SVG skeleton once
// ═══════════════════════════════════════════════════════════════════════════
function buildCharts() {
  const dims = getDims();
  const svg  = d3.select("#main-svg");
  svg.selectAll("*").remove(); // wipe any previous render

  buildBarChart(svg, dims);
  buildGroupedBar(svg, dims);
  buildPCP(svg, dims);
  updateInfo();
}

// ═══════════════════════════════════════════════════════════════════════════
//  VIEW 1 — Horizontal Bar Chart (Overview / Context)
//  Shows the top 20 job titles ranked by average salary.
//  Interaction: brushX on the salary axis to filter all other views.
//  Interaction: click a bar to select that job title → highlights PCP lines.
// ═══════════════════════════════════════════════════════════════════════════

// Module-level references so updateBarChart can mutate them
let barXScale, barYScale, barColorScale, barG, barSorted;

function buildBarChart(svg, dims) {
  const { bar } = dims;

  // Root group translated by margin to leave room for axes and title
  barG = svg.append("g")
    .attr("id", "g-bar")
    .attr("transform", `translate(${bar.x + bar.m.left},${bar.y + bar.m.top})`);

  // Chart title — identifies the view and the interaction affordance
  barG.append("text").attr("class", "chart-title")
    .attr("x", bar.w / 2).attr("y", -28).attr("text-anchor", "middle")
    .text("Top 20 Job Titles by Average Salary  [Overview]");

  // Sub-annotation explaining the brush interaction
  barG.append("text").attr("class", "anno")
    .attr("id", "brush-hint")
    .attr("x", bar.w / 2).attr("y", -13).attr("text-anchor", "middle")
    .text("Drag on the chart to brush a salary range → filters all views");

  // Placeholder groups for axes (populated by updateBarChart)
  barG.append("g").attr("class", "axis x-axis")
    .attr("transform", `translate(0,${bar.h})`);
  barG.append("g").attr("class", "axis y-axis");

  // Grid lines behind bars — populated by updateBarChart
  barG.append("g").attr("class", "grid x-grid")
    .attr("transform", `translate(0,${bar.h})`);

  // X-axis label
  barG.append("text").attr("class", "axis-label")
    .attr("x", bar.w / 2).attr("y", bar.h + 50).attr("text-anchor", "middle")
    .text("Average Salary (USD)");

  // Color legend for the sequential salary color scale
  [["#1e3a5f", "Lower salary"], ["#f0c040", "Higher salary"]].forEach(([c, l], i) => {
    barG.append("rect")
      .attr("x", bar.w - 130).attr("y", i * 18)
      .attr("width", 12).attr("height", 12).attr("fill", c).attr("rx", 2);
    barG.append("text").attr("class", "anno")
      .attr("x", bar.w - 114).attr("y", i * 18 + 10).text(l);
  });

  // Do the first data-driven render (no animation on initial load)
  updateBarChart(false);

  // ── BRUSHING interaction ──────────────────────────────────────────────
  // brushX constrains dragging to the horizontal axis.
  // The extent covers the entire chart area so users can brush anywhere on
  // the bars, making the interaction more discoverable than a thin strip.
  const brush = d3.brushX()
    .extent([[0, 0], [bar.w, bar.h]])
    .on("brush", onBrush)
    .on("end",   onBrushEnd);

  // The brush group must be appended AFTER the bars so it sits on top and
  // can capture pointer events; otherwise bar clicks block brush dragging.
  const brushG = barG.append("g").attr("class", "brush-group");
  brushG.call(brush);

  // Expose brush references so clearBrushVisual() can clear the selection
  window._barBrush  = brush;
  window._barBrushG = brushG;

  // Called continuously while the user is dragging — gives live feedback
  function onBrush(event) {
    if (!event.selection) return;
    const [x0, x1] = event.selection;
    // Convert pixel positions back to salary values using the inverse scale
    brushRange = [barXScale.invert(x0), barXScale.invert(x1)];
    refilter();
    updateGroupedBar(true);  // animate grouped bars to new filtered values
    updatePCP();             // fade PCP lines in/out
    updateInfo();
  }

  // Called when the user releases the mouse — also handles click-to-clear
  function onBrushEnd(event) {
    if (!event.selection) {
      // User clicked without dragging: treat as clearing the brush
      brushRange = null;
      refilter();
      updateGroupedBar(true);
      updatePCP();
      updateInfo();
    }
  }
}

// Programmatically removes the brush selection rectangle (used on Reset and
// when a dropdown change clears brushRange to avoid stale visual state)
function clearBrushVisual() {
  if (window._barBrushG && window._barBrush) {
    window._barBrushG.call(window._barBrush.move, null);
  }
}

// updateBarChart: data-driven update of bars, axes, and labels.
// animate=true uses TRANSITION_DURATION; animate=false is instant (first render).
function updateBarChart(animate) {
  const { bar } = getDims();

  // Aggregate: mean salary per job title, keep top 20 by average
  const byTitle = d3.rollup(
    filteredData, v => d3.mean(v, r => r.salary_in_usd), r => r.job_title
  );
  barSorted = Array.from(byTitle, ([title, avg]) => ({ title, avg }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 20);

  // X scale: salary → pixel width (left-to-right)
  barXScale = d3.scaleLinear()
    .domain([0, d3.max(barSorted, r => r.avg) * 1.05 || 1])
    .range([0, bar.w]);

  // Y scale: job title → vertical band position
  barYScale = d3.scaleBand()
    .domain(barSorted.map(r => r.title))
    .range([0, bar.h])
    .padding(0.25);

  // Sequential color: low salary = dark blue, high salary = gold
  barColorScale = d3.scaleSequential()
    .domain([d3.min(barSorted, r => r.avg), d3.max(barSorted, r => r.avg)])
    .interpolator(d3.interpolate("#1e3a5f", "#f0c040"));

  const g = barG;
  // Shared transition object — all updates in this call use the same duration
  const t = animate
    ? d3.transition().duration(TRANSITION_DURATION).ease(d3.easeCubicInOut)
    : d3.transition().duration(0);

  // Update x-axis with animated rescaling (Substrate Transformation)
  g.select(".x-axis").transition(t)
    .call(d3.axisBottom(barXScale).ticks(5).tickFormat(v => "$" + v / 1000 + "k"));
  // Update y-axis (job title labels)
  g.select(".y-axis").transition(t)
    .call(d3.axisLeft(barYScale).tickSize(0));
  // Remove axis domain lines (cosmetic — matches dark theme)
  g.select(".x-axis .domain").remove();
  g.select(".y-axis .domain").remove();
  // Vertical grid lines aligned with x-axis ticks
  g.select(".x-grid").transition(t)
    .call(d3.axisBottom(barXScale).ticks(5).tickSize(-bar.h).tickFormat(""))
    .select(".domain").remove();

  // ── Bars: enter / update / exit with animated transitions ────────────
  // Key function = job title so D3 can match bars across updates correctly
  // (Semantic Correspondence: same bar = same job title across transitions)
  const rects = g.selectAll("rect.bar").data(barSorted, r => r.title);

  // ENTER: new bars start at width=0 and grow to the right (Filtering)
  rects.enter().append("rect")
    .attr("class", "bar")
    .attr("x", 0)
    .attr("y", r => barYScale(r.title))
    .attr("height", barYScale.bandwidth())
    .attr("width", 0)               // start collapsed — animates to full width
    .attr("rx", 2)
    .attr("fill", r => barColorScale(r.avg))
    .on("mouseover", function(event, r) {
      showTip(`<strong>${r.title}</strong><br/>Avg: $${Math.round(r.avg).toLocaleString()}`, event);
    })
    .on("mousemove", moveTip)
    .on("mouseleave", hideTip)
    // SELECTION interaction: click toggles this title as the active selection
    .on("click", function(event, r) { handleBarClick(r.title); })
    .merge(rects)
    // UPDATE: animate position, size, color, and selection outline
    .transition(t)
      .attr("y",      r => barYScale(r.title))
      .attr("height", barYScale.bandwidth())
      .attr("width",  r => barXScale(r.avg))
      .attr("fill",   r => barColorScale(r.avg))
      // Gold outline on the selected bar so user knows what is active
      .attr("stroke",       r => r.title === selectedTitle ? "#f0c040" : "none")
      .attr("stroke-width", r => r.title === selectedTitle ? 2 : 0);

  // EXIT: shrink to zero width before removal (Filtering — avoids abrupt pop)
  rects.exit().transition(t).attr("width", 0).remove();

  // ── Value labels on the right side of each bar ────────────────────────
  const labels = g.selectAll("text.bar-label").data(barSorted, r => r.title);
  labels.enter().append("text").attr("class", "bar-label anno")
    .attr("x", r => barXScale(r.avg) + 4)
    .attr("y", r => barYScale(r.title) + barYScale.bandwidth() / 2 + 3.5)
    .text(r => "$" + Math.round(r.avg / 1000) + "k")
    .merge(labels)
    .transition(t)
      .attr("x", r => barXScale(r.avg) + 4)
      .attr("y", r => barYScale(r.title) + barYScale.bandwidth() / 2 + 3.5)
      .text(r => "$" + Math.round(r.avg / 1000) + "k");
  labels.exit().remove();
}

// Handle click on a bar in View 1: toggle selectedTitle, clear exp selection
function handleBarClick(title) {
  selectedTitle = (selectedTitle === title) ? null : title;
  selectedExp   = null;
  // Animate the selected bar outline without a full redraw
  barG.selectAll("rect.bar")
    .transition().duration(200)
    .attr("stroke",       r => r.title === selectedTitle ? "#f0c040" : "none")
    .attr("stroke-width", r => r.title === selectedTitle ? 2 : 0);
  updatePCP();   // highlight matching PCP lines
  updateInfo();
}

// ═══════════════════════════════════════════════════════════════════════════
//  VIEW 2 — Grouped Bar Chart (Focus)
//  Shows average salary broken down by experience level (x-axis groups) and
//  company size (color within each group).
//  Interaction: click an experience group to set selectedExp → highlights PCP.
//  Transition: bar heights animate on filter/brush changes (Filtering).
// ═══════════════════════════════════════════════════════════════════════════

let grpG; // root <g> element for View 2 — persists across updates

function buildGroupedBar(svg, dims) {
  const { grp } = dims;

  // Root group positioned at View 2's top-left corner (after margin)
  grpG = svg.append("g")
    .attr("id", "g-grp")
    .attr("transform", `translate(${grp.x + grp.m.left},${grp.y + grp.m.top})`);

  // Chart title
  grpG.append("text").attr("class", "chart-title")
    .attr("x", grp.w / 2).attr("y", -28).attr("text-anchor", "middle")
    .text("Avg Salary by Experience Level & Company Size  [Focus]");

  // Sub-annotation
  grpG.append("text").attr("class", "anno")
    .attr("x", grp.w / 2).attr("y", -13).attr("text-anchor", "middle")
    .text("Click an experience group to highlight matching records in PCP");

  // Axis placeholder groups (filled by updateGroupedBar)
  grpG.append("g").attr("class", "axis x-axis")
    .attr("transform", `translate(0,${grp.h})`);
  grpG.append("g").attr("class", "axis y-axis");
  // Horizontal grid lines for the y-axis
  grpG.append("g").attr("class", "grid y-grid");

  // Axis labels
  grpG.append("text").attr("class", "axis-label")
    .attr("x", grp.w / 2).attr("y", grp.h + 50).attr("text-anchor", "middle")
    .text("Experience Level");
  grpG.append("text").attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -(grp.h / 2)).attr("y", -58).attr("text-anchor", "middle")
    .text("Avg Salary (USD)");

  // Company-size color legend
  SIZE_ORDER.forEach((sz, i) => {
    grpG.append("rect")
      .attr("x", grp.w - 100).attr("y", i * 18)
      .attr("width", 12).attr("height", 12).attr("fill", SIZE_COLORS[sz]).attr("rx", 2);
    grpG.append("text").attr("class", "anno")
      .attr("x", grp.w - 84).attr("y", i * 18 + 10).text(SIZE_MAP[sz]);
  });

  updateGroupedBar(false); // initial render, no animation
}

function updateGroupedBar(animate) {
  const { grp } = getDims();
  const g = grpG;
  const t = animate
    ? d3.transition().duration(TRANSITION_DURATION).ease(d3.easeCubicInOut)
    : d3.transition().duration(0);

  // Aggregate: mean salary grouped by experience level, then by company size
  const rollup = d3.rollup(
    filteredData,
    v => d3.mean(v, r => r.salary_in_usd),
    r => r.experience_level,
    r => r.company_size
  );

  // Flatten into a rows array for easy D3 binding
  const rows = [];
  EXP_ORDER.forEach(exp => {
    const sizeMap = rollup.get(exp) || new Map();
    SIZE_ORDER.forEach(sz => rows.push({ exp, sz, avg: sizeMap.get(sz) || 0 }));
  });

  // Outer x-scale: experience level → group band position
  const x0 = d3.scaleBand().domain(EXP_ORDER).range([0, grp.w])
    .paddingInner(0.25).paddingOuter(0.1);
  // Inner x-scale: company size → position within each experience group
  const x1 = d3.scaleBand().domain(SIZE_ORDER).range([0, x0.bandwidth()]).padding(0.08);
  // Y scale: salary → vertical position
  const y  = d3.scaleLinear()
    .domain([0, d3.max(rows, r => r.avg) * 1.1 || 1])
    .range([grp.h, 0]).nice();

  // Animate axis and grid rescaling (Substrate Transformation)
  g.select(".x-axis").transition(t)
    .call(d3.axisBottom(x0).tickFormat(k => EXP_MAP[k]));
  g.select(".y-axis").transition(t)
    .call(d3.axisLeft(y).ticks(5).tickFormat(v => "$" + v / 1000 + "k"))
    .select(".domain").remove();
  g.select(".y-grid").transition(t)
    .call(d3.axisLeft(y).ticks(5).tickSize(-grp.w).tickFormat(""))
    .select(".domain").remove();

  // ── One <g> per experience level group ───────────────────────────────
  // Key = exp level so groups stay stable across filter changes
  const groups = g.selectAll("g.exp-group").data(EXP_ORDER, k => k);
  const gAll   = groups.enter().append("g").attr("class", "exp-group")
    .merge(groups);
  gAll.transition(t).attr("transform", exp => `translate(${x0(exp)},0)`);
  groups.exit().remove();

  // ── Bars inside each group ────────────────────────────────────────────
  gAll.each(function(exp) {
    const eg      = d3.select(this);
    // Gather the three size rows for this experience level
    const expRows = SIZE_ORDER.map(sz => rows.find(r => r.exp === exp && r.sz === sz));

    const barSel = eg.selectAll("rect.bar").data(expRows, r => r.sz);

    // ENTER: bars start at the baseline (height=0) and grow upward
    barSel.enter().append("rect")
      .attr("class", "bar")
      .attr("x", r => x1(r.sz))
      .attr("y", grp.h)          // start at baseline
      .attr("width",  x1.bandwidth())
      .attr("height", 0)          // start collapsed
      .attr("rx", 2)
      .attr("fill", r => SIZE_COLORS[r.sz])
      .on("mouseover", function(event, r) {
        showTip(
          `<strong>${EXP_MAP[r.exp]} · ${SIZE_MAP[r.sz]} Co.</strong><br/>` +
          `Avg: $${Math.round(r.avg).toLocaleString()}`, event
        );
      })
      .on("mousemove", moveTip)
      .on("mouseleave", hideTip)
      // SELECTION interaction: click toggles this experience level
      .on("click", function(event, r) { handleExpClick(r.exp); })
      .merge(barSel)
      // UPDATE: animate bar height change (Filtering transition)
      .transition(t)
        .attr("x",      r => x1(r.sz))
        .attr("y",      r => y(r.avg))
        .attr("width",  x1.bandwidth())
        .attr("height", r => grp.h - y(r.avg))
        // Gold outline when this experience level is selected
        .attr("stroke",       r => r.exp === selectedExp ? "#f0c040" : "none")
        .attr("stroke-width", r => r.exp === selectedExp ? 2 : 0);

    // EXIT: shrink bars down before removing them
    barSel.exit().transition(t).attr("height", 0).attr("y", grp.h).remove();
  });
}

// Handle click on an experience group in View 2
function handleExpClick(exp) {
  selectedExp   = (selectedExp === exp) ? null : exp;
  selectedTitle = null; // clear any title selection to avoid conflicting state
  updateGroupedBar(false); // re-outline without animating heights
  updatePCP();   // fade PCP lines matching / not matching selectedExp
  updateInfo();
}

// ═══════════════════════════════════════════════════════════════════════════
//  VIEW 3 — Parallel Coordinates Plot (Advanced / Focus)
//  Each line represents one data record traced across five dimensions.
//  Lines are colored by experience level.
//  Interaction: drag axis headers to reorder dimensions.
//  Transition: opacity of lines fades smoothly when selection changes.
// ═══════════════════════════════════════════════════════════════════════════

// Module-level references used by updatePCP
let pcpG, pcpDimKeys, pcpDimensions;

function buildPCP(svg, dims) {
  const { pcp } = dims;

  // Root group for the PCP
  pcpG = svg.append("g")
    .attr("id", "g-pcp")
    .attr("transform", `translate(${pcp.x + pcp.m.left},${pcp.y + pcp.m.top})`);

  // Chart title
  pcpG.append("text").attr("class", "chart-title")
    .attr("x", pcp.w / 2).attr("y", -38).attr("text-anchor", "middle")
    .text("Parallel Coordinates — Salary Profile Explorer  [Advanced · Focus]");

  // Sub-annotation explaining interaction affordances
  pcpG.append("text").attr("class", "anno")
    .attr("x", pcp.w / 2).attr("y", -22).attr("text-anchor", "middle")
    .text("Lines highlight on selection · colored by Experience Level · drag axis label to reorder");

  // Dimension definitions — each describes one axis of the PCP
  pcpDimensions = [
    // Ordinal dimensions use scalePoint; linear use scaleLinear
    { key: "experience_level", label: "Experience",   type: "ordinal",
      domain: EXP_ORDER,                   format: d => EXP_MAP[d] || d },
    { key: "remote_ratio",     label: "Remote %",     type: "ordinal",
      domain: ["0", "50", "100"],           format: d => REMOTE_MAP[d] || d },
    { key: "company_size",     label: "Company Size", type: "ordinal",
      domain: SIZE_ORDER,                   format: d => SIZE_MAP[d] || d },
    { key: "salary_in_usd",    label: "Salary (USD)", type: "linear",
      domain: null,                         format: d => "$" + Math.round(d / 1000) + "k" },
    { key: "work_year",        label: "Year",         type: "ordinal",
      domain: ["2020", "2021", "2022", "2023"], format: d => d },
  ];
  // Keep a mutable ordered array of keys for drag-to-reorder
  pcpDimKeys = pcpDimensions.map(d => d.key);

  // Experience-level color legend
  EXP_ORDER.forEach((k, i) => {
    pcpG.append("rect")
      .attr("x", pcp.w - 130).attr("y", i * 18)
      .attr("width", 12).attr("height", 12).attr("fill", EXP_COLORS[k]).attr("rx", 2);
    pcpG.append("text").attr("class", "anno")
      .attr("x", pcp.w - 114).attr("y", i * 18 + 10).text(EXP_MAP[k]);
  });

  updatePCP(); // initial render
}

function updatePCP() {
  const { pcp } = getDims();
  const g = pcpG;

  // ── Build per-dimension y-scales ──────────────────────────────────────
  const yScales = {};
  pcpDimensions.forEach(dim => {
    if (dim.type === "linear") {
      // Linear scale rescaled to current filtered extent
      yScales[dim.key] = d3.scaleLinear()
        .domain(d3.extent(filteredData, r => +r[dim.key]))
        .range([pcp.h, 0]).nice();
    } else {
      // Point scale for ordinal dimensions — fixed domain so axis doesn't jump
      yScales[dim.key] = d3.scalePoint()
        .domain(dim.domain)
        .range([pcp.h, 0]).padding(0.3);
    }
  });

  // X scale: maps dimension keys to horizontal positions
  const xScale = d3.scalePoint()
    .domain(pcpDimKeys)
    .range([0, pcp.w]).padding(0.1);

  // Sample up to 900 rows for rendering performance (full dataset is 3755)
  const sample = filteredData.length > 900
    ? d3.shuffle(filteredData.slice()).slice(0, 900)
    : filteredData;

  // Line path function: converts one data row to an SVG polyline across axes
  function linePath(row) {
    return d3.line()(
      pcpDimensions.map(dim => {
        const val = dim.type === "linear" ? +row[dim.key] : String(row[dim.key]);
        return [xScale(dim.key), yScales[dim.key](val)];
      })
    );
  }

  // Determine whether a row should be highlighted given current selection
  function isHighlighted(row) {
    if (selectedTitle) return row.job_title       === selectedTitle;
    if (selectedExp)   return row.experience_level === selectedExp;
    return false; // no selection active
  }
  const anySelection = !!(selectedTitle || selectedExp);

  // ── Lines (one per sampled record) ───────────────────────────────────
  // Key by array index — we accept that index-based keys cause full re-bind
  // on sample change; correctness matters more than churn minimization here.
  const lines = g.selectAll("path.pcp-line").data(sample, (d, i) => i);

  // ENTER: lines appear immediately at their initial position and opacity
  lines.enter().append("path")
    .attr("class", "pcp-line")
    .attr("d", linePath)
    .attr("stroke", r => EXP_COLORS[r.experience_level] || "#888")
    .attr("opacity", r => {
      if (!anySelection) return 0.28;
      return isHighlighted(r) ? 1 : 0.06;
    })
    .merge(lines)
    // UPDATE: animate opacity change when selection or filter changes (Filtering)
    // This is the primary animated transition for View 3.
    .transition().duration(TRANSITION_DURATION).ease(d3.easeCubicInOut)
      .attr("d", linePath)
      .attr("stroke",       r => EXP_COLORS[r.experience_level] || "#888")
      .attr("stroke-width", r => (!anySelection || isHighlighted(r)) ? 1.2 : 0.8)
      .attr("opacity",      r => {
        if (!anySelection) return 0.28;
        return isHighlighted(r) ? 1 : 0.06;  // highlighted=full, dimmed=near-invisible
      });

  // EXIT: fade out lines that are no longer in the sample
  lines.exit()
    .transition().duration(TRANSITION_DURATION / 2)
    .attr("opacity", 0)
    .remove();

  // ── One axis <g> per dimension ────────────────────────────────────────
  let dragging = {}; // tracks pixel offset while dragging an axis

  const axisGs  = g.selectAll("g.dim-axis").data(pcpDimensions, d => d.key);
  const axisAll = axisGs.enter().append("g").attr("class", "dim-axis")
    .attr("transform", dim => `translate(${xScale(dim.key)},0)`)
    .merge(axisGs);

  // Animate axis horizontal repositioning when order changes
  axisAll.transition().duration(TRANSITION_DURATION)
    .attr("transform", dim => `translate(${xScale(dim.key)},0)`);

  // Re-render each axis tick marks and label (scales may have changed)
  axisAll.each(function(dim) {
    const ag = d3.select(this);
    ag.selectAll("g.inner-axis").remove();   // clear stale ticks
    ag.selectAll("text.dim-label").remove(); // clear stale label

    // Choose appropriate axis tick formatter
    const axFn = dim.type === "linear"
      ? d3.axisLeft(yScales[dim.key]).ticks(5).tickFormat(dim.format)
      : d3.axisLeft(yScales[dim.key]).tickValues(dim.domain).tickFormat(v => dim.format(v));

    ag.append("g").attr("class", "axis inner-axis").call(axFn);

    // Axis dimension label — doubles as the drag handle for reordering
    ag.append("text").attr("class", "chart-title dim-label")
      .attr("y", -14).attr("text-anchor", "middle")
      .style("cursor", "ew-resize")         // cursor hints at drag affordance
      .text(dim.label);
  });

  axisGs.exit().remove();

  // ── Drag to reorder axes (Ordering transition) ────────────────────────
  // Dragging an axis header left/right reorders the pcpDimKeys array,
  // snapping the axis into its new slot when released.
  axisAll.call(
    d3.drag()
      .on("start", function(event, dim) {
        // Record starting pixel position for this axis
        dragging[dim.key] = xScale(dim.key);
        d3.select(this).raise(); // bring dragged axis to front
      })
      .on("drag", function(event, dim) {
        // Clamp within plot area and update live position
        dragging[dim.key] = Math.max(0, Math.min(pcp.w, event.x));
        // Re-sort dimension order by current pixel position
        pcpDimKeys.sort((a, b) => position(a) - position(b));
        xScale.domain(pcpDimKeys);
        // Move all axes and redraw all lines immediately (no transition while dragging)
        axisAll.attr("transform", dm => `translate(${position(dm.key)},0)`);
        g.selectAll("path.pcp-line").attr("d", linePath);
      })
      .on("end", function(event, dim) {
        delete dragging[dim.key]; // snap back to computed grid position
        // Smooth snap-to-grid transition for the released axis
        d3.select(this).transition().duration(300)
          .attr("transform", `translate(${xScale(dim.key)},0)`);
        // Also smooth the lines to their final positions
        g.selectAll("path.pcp-line").transition().duration(300).attr("d", linePath);
      })
  );

  // Returns the current x position of a dimension key (dragged or computed)
  function position(key) {
    return dragging[key] !== undefined ? dragging[key] : xScale(key);
  }
}
