const EXPERIENCE_LABEL = { EN: "Entry", MI: "Mid", SE: "Senior", EX: "Executive" };
const EXPERIENCE_ORDER = ["EN", "MI", "SE", "EX"];      // ordinal ranking
const SIZE_LABEL  = { S: "Small", M: "Medium", L: "Large" };
const SIZE_ORDER  = ["S", "M", "L"];

// Shared sequential palette for experience level — reused across all views so
// the same color always means the same thing.
const experienceColor = d3.scaleOrdinal()
  .domain(EXPERIENCE_ORDER)
  .range(["#bdd7e7", "#6baed6", "#3182bd", "#08519c"]);

// Tooltip — one DOM node shared across views.
const tooltip = d3.select("#tooltip");
function showTooltip(html, event) {
  tooltip
    .style("opacity", 1)
    .html(html)
    .style("left", (event.pageX + 12) + "px")
    .style("top",  (event.pageY + 12) + "px");
}
function moveTooltip(event) {
  tooltip
    .style("left", (event.pageX + 12) + "px")
    .style("top",  (event.pageY + 12) + "px");
}
function hideTooltip() { tooltip.style("opacity", 0); }

const fmtUSD = d3.format("$,.0f");
const fmtInt = d3.format(",");
const fmtUSDShort = d => "$" + d3.format(".2~s")(d).replace("G", "B");

// Shared transition timings — single source of truth, easier to tune.
const T_FILTER = d3.transition().duration(550).ease(d3.easeCubicInOut);
const T_ORDER  = d3.transition().duration(750).ease(d3.easeCubicInOut);

// Helpers for fresh transitions (the constants above are not chainable for new selections).
const tFilter = () => d3.transition("filter").duration(550).ease(d3.easeCubicInOut);
const tOrder  = () => d3.transition("order").duration(750).ease(d3.easeCubicInOut);

// Shared state — single source of truth for the active filter
const state = {
  selectedExp:  null,           // null | "EN" | "MI" | "SE" | "EX"
  brushExtent:  null,           // null | { yearMin, yearMax, salMin, salMax }
  selectedYear: null,           // null (= all years) | 2020..2023 — used by Year dropdown / Play timeline
  sortMode:     "experience"    // "experience" | "salary-desc" | "salary-asc"
};

// Apply current filters to a full dataset, returning the filtered subset.
function applyFilter(full) {
  return full.filter(d => {
    if (state.selectedExp  && d.experience_level !== state.selectedExp)  return false;
    if (state.selectedYear && d.work_year         !== state.selectedYear) return false;
    if (state.brushExtent) {
      const { yearMin, yearMax, salMin, salMax } = state.brushExtent;
      if (d.work_year     < yearMin || d.work_year     > yearMax) return false;
      if (d.salary_in_usd < salMin  || d.salary_in_usd > salMax)  return false;
    }
    return true;
  });
}

// Update the "Showing N jobs (filter)" readout below the header.
function updateFilterReadout(filtered, full) {
  const parts = [];
  if (state.selectedExp)  parts.push(EXPERIENCE_LABEL[state.selectedExp]);
  if (state.selectedYear) parts.push(`Year ${state.selectedYear}`);
  if (state.brushExtent) {
    const { yearMin, yearMax, salMin, salMax } = state.brushExtent;
    parts.push(`brush ${yearMin}–${yearMax}`);
    parts.push(`${fmtUSDShort(salMin)}–${fmtUSDShort(salMax)}`);
  }
  const label = parts.length ? `filter: ${parts.join(" · ")}` : "no filter applied";
  d3.select("#filter-count").text(fmtInt(filtered.length));
  d3.select("#filter-readout").html(
    `Showing <strong id="filter-count">${fmtInt(filtered.length)}</strong> of ${fmtInt(full.length)} jobs (${label})`
  );
}

// Data load + bootstrap

d3.csv("ds_salaries.csv", d => ({
  work_year: +d.work_year,
  experience_level: d.experience_level,
  employment_type: d.employment_type,
  job_title: d.job_title,
  salary_in_usd: +d.salary_in_usd,
  remote_ratio: +d.remote_ratio,
  company_size: d.company_size
})).then(data => {
  // Keep full-time only for a clean comparison; CT/PT/FL are tiny slices.
  const ft = data.filter(d => d.employment_type === "FT");

  // Attach stable per-row jitter once. Used by the scatterplot so dots don't
  // pile on top of each other on the discrete work_year axis. Storing on the
  // datum keeps jitter stable across re-renders (otherwise dots would jiggle).
  ft.forEach(d => { d.__jitter = (Math.random() - 0.5) * 0.7; });

  // Initialize each view (one-time scaffolding).
  BarChart.init(ft);
  Scatter.init(ft);
  Sankey.init(ft);

  // First render = full data, no filter.
  refresh(ft);

  // Wire global controls.
  d3.select("#sort-mode").on("change", function() {
    state.sortMode = this.value;
    BarChart.updateOrder();  // ordering animation only — no need to refresh others
  });

  // Year dropdown (Timestep filter)
  d3.select("#year-select").on("change", function() {
    state.selectedYear = (this.value === "all") ? null : +this.value;
    // Manual year change stops any active playback so the user is back in control.
    Timeline.stop();
    Scatter.setYearSpotlight(state.selectedYear);
    refresh(ft);
  });

  // Play / Pause button (Timestep animation)
  d3.select("#play-btn").on("click", () => {
    if (Timeline.isPlaying()) Timeline.stop();
    else Timeline.start(ft);
  });

  d3.select("#reset-btn").on("click", () => {
    state.selectedExp  = null;
    state.brushExtent  = null;
    state.selectedYear = null;
    d3.select("#year-select").property("value", "all");
    Timeline.stop();
    Scatter.setYearSpotlight(null);
    Scatter.clearBrush();
    refresh(ft);
  });

  // Re-render on resize (debounced). We tear down and re-init because scales
  // depend on container size; the dashboard always reflects the full state.
  window.addEventListener("resize", debounce(() => {
    d3.selectAll(".chart-container > svg").remove();
    BarChart.init(ft);
    Scatter.init(ft);
    Sankey.init(ft);
    Scatter.setYearSpotlight(state.selectedYear);
    refresh(ft);
  }, 200));
}).catch(err => {
  console.error("Failed to load dataset:", err);
  d3.select("body").append("p")
    .style("color", "red")
    .style("padding", "20px")
    .text("Could not load ds_salaries.csv. Serve this folder over http (e.g. `python -m http.server`).");
});

// Master refresh — recompute filtered data, push to every view, update readout.
function refresh(full) {
  const filtered = applyFilter(full);
  updateFilterReadout(filtered, full);
  BarChart.update(filtered, full);
  Scatter.update(filtered, full);
  Sankey.update(filtered, full);
}

function debounce(fn, wait) {
  let t;
  return function() {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, arguments), wait);
  };
}

// VIEW 1 — Bar chart (overview)
//   * Selection: click a bar to filter on that experience level (toggle).
//   * Ordering animation: bars tween x positions when sort mode changes.
//   * Filtering animation: bar heights tween to new averages under filter.

const BarChart = (() => {
  // Module-level state so update() and updateOrder() share scales/refs.
  let svg, g, x, y, w, h, margin, W, H;
  let full;            // unfiltered FT dataset, for re-aggregation
  let currentAvg;      // current per-experience averages (used for sorting)

  function init(fullData) {
    full = fullData;

    const container = document.getElementById("chart-bar");
    W = container.clientWidth; H = container.clientHeight;
    margin = { top: 8, right: 14, bottom: 38, left: 58 };
    w = W - margin.left - margin.right;
    h = H - margin.top  - margin.bottom;

    svg = d3.select("#chart-bar").append("svg")
      .attr("viewBox", `0 0 ${W} ${H}`)
      .attr("preserveAspectRatio", "xMidYMid meet");
    g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // y-scale uses the full-data maximum so bars don't suddenly outgrow the
    // axis when a filter raises the average (e.g., Executive-only). Animating
    // a stable axis is far less confusing than animating a moving axis.
    const fullAvgMax = d3.max(EXPERIENCE_ORDER, exp =>
      d3.mean(full.filter(d => d.experience_level === exp), d => d.salary_in_usd)
    );
    y = d3.scaleLinear().domain([0, fullAvgMax * 1.15]).nice().range([h, 0]);

    // x-scale starts in experience order — domain order changes when re-sorted.
    x = d3.scaleBand()
      .domain(EXPERIENCE_ORDER.slice())
      .range([0, w])
      .padding(0.25);

    // Axes (drawn once; x-axis ticks animate on order change).
    g.append("g")
      .attr("class", "axis axis-x")
      .attr("transform", `translate(0,${h})`)
      .call(d3.axisBottom(x).tickFormat(c => EXPERIENCE_LABEL[c]));

    g.append("g")
      .attr("class", "axis axis-y")
      .call(d3.axisLeft(y).ticks(5).tickFormat(fmtUSDShort));

    // Axis labels.
    svg.append("text").attr("class", "axis-label")
      .attr("x", margin.left + w / 2).attr("y", H - 4)
      .attr("text-anchor", "middle").text("Experience Level");
    svg.append("text").attr("class", "axis-label")
      .attr("transform", `translate(12, ${margin.top + h / 2}) rotate(-90)`)
      .attr("text-anchor", "middle").text("Average Salary (USD)");

    // One rect per experience level — created once, keyed by experience code so
    // d3 can match them across re-renders and ordering animations.
    g.selectAll(".bar")
      .data(EXPERIENCE_ORDER, k => k)
      .enter().append("rect")
        .attr("class", "bar")
        .attr("x", k => x(k))
        .attr("width", x.bandwidth())
        .attr("y", h)               // start at baseline; first update() raises them
        .attr("height", 0)
        .attr("fill", k => experienceColor(k))
        .on("click", (event, k) => {
          // Toggle selection — clicking the already-selected bar clears it.
          state.selectedExp = (state.selectedExp === k) ? null : k;
          refresh(full);
        })
        .on("mouseover", (event, k) => {
          const v = currentAvg.get(k);
          showTooltip(
            `<strong>${EXPERIENCE_LABEL[k]}</strong><br/>
             Avg salary (current filter): ${v == null ? "n/a" : fmtUSD(v)}<br/>
             Click to ${state.selectedExp === k ? "clear" : "filter by"} this level`,
            event
          );
        })
        .on("mousemove", moveTooltip)
        .on("mouseout", hideTooltip);

    // Value labels — also keyed by experience.
    g.selectAll(".bar-label")
      .data(EXPERIENCE_ORDER, k => k)
      .enter().append("text")
        .attr("class", "bar-label")
        .attr("x", k => x(k) + x.bandwidth() / 2)
        .attr("y", h - 4)
        .text("");
  }

  // Recompute per-experience averages from the current sort-order list.
  function recomputeAverages(filtered) {
    const m = new Map();
    EXPERIENCE_ORDER.forEach(exp => {
      const subset = filtered.filter(d => d.experience_level === exp);
      m.set(exp, subset.length ? d3.mean(subset, d => d.salary_in_usd) : 0);
    });
    return m;
  }

  // Filtering animation — bars tween height to new averages.
  function update(filtered) {
    currentAvg = recomputeAverages(filtered);

    g.selectAll(".bar")
      .each(function(k) {
        // Update the selected/dimmed classes (CSS handles the visual change).
        const sel = d3.select(this);
        sel.classed("selected", state.selectedExp === k);
        sel.classed("dimmed",  state.selectedExp != null && state.selectedExp !== k);
      })
      .transition(tFilter())
        .attr("y", k => y(currentAvg.get(k)))
        .attr("height", k => h - y(currentAvg.get(k)));

    g.selectAll(".bar-label")
      .transition(tFilter())
        .attr("y", k => y(currentAvg.get(k)) - 4)
        .tween("text", function(k) {
          // Numeric tween so the dollar number rolls up to its new value.
          const node = d3.select(this);
          const start = +(node.attr("data-val") || 0);
          const end = currentAvg.get(k) || 0;
          const interp = d3.interpolateNumber(start, end);
          return t => {
            const v = interp(t);
            node.text(v ? fmtUSD(v) : "");
            node.attr("data-val", v);
          };
        });
  }

  // Ordering animation — bars tween to new x positions according to sort mode.
  function updateOrder() {
    const order = orderedKeys();
    x.domain(order);

    g.selectAll(".bar")
      .transition(tOrder())
        .attr("x", k => x(k));

    g.selectAll(".bar-label")
      .transition(tOrder())
        .attr("x", k => x(k) + x.bandwidth() / 2);

    // Animate the x-axis tick reorder too, so the labels track the bars.
    g.select(".axis-x")
      .transition(tOrder())
      .call(d3.axisBottom(x).tickFormat(c => EXPERIENCE_LABEL[c]));
  }

  function orderedKeys() {
    if (state.sortMode === "experience") return EXPERIENCE_ORDER.slice();
    const arr = EXPERIENCE_ORDER.slice();
    if (state.sortMode === "salary-desc") {
      arr.sort((a, b) => d3.descending(currentAvg.get(a) || 0, currentAvg.get(b) || 0));
    } else if (state.sortMode === "salary-asc") {
      arr.sort((a, b) => d3.ascending(currentAvg.get(a) || 0, currentAvg.get(b) || 0));
    }
    return arr;
  }

  return { init, update, updateOrder };
})();

// VIEW 2 — Scatterplot (context, brushable)
//   * Brushing: 2D d3.brush selects a year × salary box; updates global filter.
//   * Filtering animation: dots fade in/out when filter changes (other views).
//   * Selection visual: dots also dim when an experience is selected via View 1.

const Scatter = (() => {
  let svg, g, x, y, w, h, margin, W, H;
  let full;
  let brush, brushG;
  let spotlightText;          // big watermark year label shown during timestep playback

  function init(fullData) {
    full = fullData;

    const container = document.getElementById("chart-scatter");
    W = container.clientWidth; H = container.clientHeight;
    margin = { top: 10, right: 14, bottom: 38, left: 70 };
    w = W - margin.left - margin.right;
    h = H - margin.top  - margin.bottom;

    svg = d3.select("#chart-scatter").append("svg")
      .attr("viewBox", `0 0 ${W} ${H}`)
      .attr("preserveAspectRatio", "xMidYMid meet");
    g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Year is a small integer range — use a linear scale centered on each year
    // so jitter looks even. Padding keeps points away from the axis edges.
    const yearExtent = d3.extent(full, d => d.work_year);
    x = d3.scaleLinear()
      .domain([yearExtent[0] - 0.5, yearExtent[1] + 0.5])
      .range([0, w]);

    // Salary y-axis: cap at the 99th percentile so a couple of $400K+ outliers
    // don't compress the rest of the points into a thin band at the bottom.
    const sals = full.map(d => d.salary_in_usd).sort(d3.ascending);
    const yMax = d3.quantile(sals, 0.99);
    y = d3.scaleLinear().domain([0, yMax]).nice().range([h, 0]);

    g.append("g").attr("class", "axis")
      .attr("transform", `translate(0,${h})`)
      .call(d3.axisBottom(x).tickValues(d3.range(yearExtent[0], yearExtent[1] + 1)).tickFormat(d3.format("d")));

    g.append("g").attr("class", "axis")
      .call(d3.axisLeft(y).ticks(5).tickFormat(fmtUSDShort));

    // Axis labels.
    svg.append("text").attr("class", "axis-label")
      .attr("x", margin.left + w / 2).attr("y", H - 4)
      .attr("text-anchor", "middle").text("Work Year");
    svg.append("text").attr("class", "axis-label")
      .attr("transform", `translate(14, ${margin.top + h / 2}) rotate(-90)`)
      .attr("text-anchor", "middle").text("Salary (USD)");

    // Draw dots once (keyed by index so we never re-create them). All points
    // are always present in the DOM — filter changes animate their opacity,
    // they aren't removed.
    g.append("g").attr("class", "dots-layer")
      .selectAll(".scatter-dot")
      .data(full, (d, i) => i)
      .enter().append("circle")
        .attr("class", "scatter-dot")
        .attr("r", 2.6)
        .attr("cx", d => x(d.work_year + d.__jitter))
        .attr("cy", d => y(Math.min(d.salary_in_usd, yMax)))   // clip extreme outliers to top
        .attr("fill", d => experienceColor(d.experience_level))
        .attr("opacity", 0.85)
        .on("mouseover", (event, d) => showTooltip(
          `<strong>${d.job_title}</strong><br/>
           ${EXPERIENCE_LABEL[d.experience_level]} · ${SIZE_LABEL[d.company_size]} co · ${d.work_year}<br/>
           ${fmtUSD(d.salary_in_usd)}`,
          event))
        .on("mousemove", moveTooltip)
        .on("mouseout", hideTooltip);

    // Big watermark year label sits between dots and the brush layer so it
    // doesn't intercept pointer events. Hidden by default; shown via
    // setYearSpotlight() when a year filter is active or playback is running.
    spotlightText = g.append("text")
      .attr("class", "year-spotlight")
      .attr("x", w / 2)
      .attr("y", h / 2 + 18)        // visually centered
      .attr("opacity", 0)
      .text("");

    // Brush layer sits above the dots. brush-end commits the selection.
    brush = d3.brush()
      .extent([[0, 0], [w, h]])
      .on("end", brushed);

    brushG = g.append("g").attr("class", "brush").call(brush);

    // Make sure the brush overlay sits ABOVE the dots so it captures drags,
    // but circles below still receive mouseover for tooltips. d3-brush by
    // default sets pointer-events on its overlay; we let it stay on top.

    function brushed({ selection, sourceEvent }) {
      if (!sourceEvent) return;
      if (!selection) {
        state.brushExtent = null;
      } else {
        const [[x0, y0], [x1, y1]] = selection;
        // Invert the pixel rect back to data space.
        const yearMin = Math.ceil(x.invert(x0));
        const yearMax = Math.floor(x.invert(x1));
        const salMin  = Math.max(0, y.invert(y1));   // y is inverted (top = high)
        const salMax  = y.invert(y0);
        // Guard against degenerate / out-of-range selections.
        if (yearMin > yearMax || salMin >= salMax) {
          state.brushExtent = null;
        } else {
          state.brushExtent = { yearMin, yearMax, salMin, salMax };
        }
      }
      refresh(full);
    }
  }

  // Filtering animation — dots fade based on whether they pass the active filter.
  function update(filtered) {
    // Build a set of filtered indexes for O(1) lookup during the join.
    const passing = new Set(filtered);
    g.selectAll(".scatter-dot")
      .transition(tFilter())
        .attr("opacity", d => passing.has(d) ? 0.85 : 0.08)
        .attr("r", d => passing.has(d) ? 2.8 : 1.8);
  }

  // Called by the Reset button — wipe the brush rectangle without firing brushed.
  function clearBrush() {
    if (brushG && brush) brushG.call(brush.move, null);
  }

  // Show/hide the big year watermark. Pass a year to spotlight, or null to hide.
  function setYearSpotlight(year) {
    if (!spotlightText) return;
    if (year == null) {
      spotlightText.transition(tFilter()).attr("opacity", 0).text("");
    } else {
      spotlightText
        .text(String(year))
        .transition(tFilter())
        .attr("opacity", 1);
    }
  }

  return { init, update, clearBrush, setYearSpotlight };
})();

// VIEW 3 — Sankey (focus, advanced)
//   * Filtering animation: when the active filter changes, the Sankey
//     recomputes its layout and animates link widths + node positions.
//   * Top-N roles are computed from the FULL dataset (not the filter) so
//     the column structure stays stable as the user drills in.

const Sankey = (() => {
  let svg, g, w, h, margin, W, H;
  let sankeyGen;
  let topRoles, nodeNames, nodeIndex;
  let full;

  function init(fullData) {
    full = fullData;

    const container = document.getElementById("chart-sankey");
    W = container.clientWidth; H = container.clientHeight;
    margin = { top: 22, right: 110, bottom: 26, left: 70 };
    w = W - margin.left - margin.right;
    h = H - margin.top  - margin.bottom;

    svg = d3.select("#chart-sankey").append("svg")
      .attr("viewBox", `0 0 ${W} ${H}`)
      .attr("preserveAspectRatio", "xMidYMid meet");
    g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Stable Top-N role list from the FULL dataset.
    const TOP_N = 8;
    topRoles = Array.from(
      d3.rollup(full, v => v.length, d => d.job_title),
      ([k, v]) => ({ k, v })
    ).sort((a, b) => d3.descending(a.v, b.v)).slice(0, TOP_N).map(d => d.k);

    // Stable node id list — same set of nodes regardless of filter, so the
    // layout doesn't reshuffle dramatically when a single experience is selected.
    nodeNames = [
      ...EXPERIENCE_ORDER.map(e => "exp::" + e),
      ...topRoles.map(r => "role::" + r),
      ...SIZE_ORDER.map(s => "size::" + s)
    ];
    nodeIndex = new Map(nodeNames.map((n, i) => [n, i]));

    sankeyGen = d3.sankey()
      .nodeWidth(14)
      .nodePadding(10)
      .extent([[0, 0], [w, h]]);

    // Column headers (drawn once).
    const colHeader = [
      { x: 0,     label: "Experience" },
      { x: w / 2, label: "Job Title (Top 8 overall)" },
      { x: w,     label: "Company Size" }
    ];
    svg.append("g").attr("transform", `translate(${margin.left}, ${margin.top - 6})`)
      .selectAll("text")
      .data(colHeader)
      .enter().append("text")
        .attr("x", d => d.x).attr("y", 0)
        .attr("text-anchor", (d, i) => i === 0 ? "start" : (i === 2 ? "end" : "middle"))
        .attr("class", "legend-title")
        .text(d => d.label);

    // Legend (drawn once).
    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${W - margin.right + 10}, ${margin.top + 4})`);
    legend.append("text").attr("class", "legend-title")
      .attr("x", 0).attr("y", 0).text("Experience Level");
    EXPERIENCE_ORDER.forEach((exp, i) => {
      const row = legend.append("g").attr("transform", `translate(0, ${10 + i * 16})`);
      row.append("rect").attr("width", 12).attr("height", 12).attr("fill", experienceColor(exp));
      row.append("text").attr("x", 16).attr("y", 10).text(EXPERIENCE_LABEL[exp]);
    });
    legend.append("g").attr("transform", `translate(0, ${10 + EXPERIENCE_ORDER.length * 16 + 6})`)
      .call(g2 => {
        g2.append("rect").attr("width", 12).attr("height", 12).attr("fill", "#cbd2da");
        g2.append("text").attr("x", 16).attr("y", 10).text("Role → Size flow");
      });

    // Two layers — links beneath, nodes above.
    g.append("g").attr("class", "links-layer");
    g.append("g").attr("class", "nodes-layer");
    g.append("g").attr("class", "node-labels-layer");
    g.append("g").attr("class", "empty-layer");
  }

  // Build a fresh {nodes, links} graph from a filtered dataset.
  function buildGraph(filtered) {
    // We always include the full node set so positions stay stable.
    const nodes = nodeNames.map(n => ({ name: n }));

    const data = filtered.filter(d => topRoles.includes(d.job_title));

    const expRole = d3.rollups(data, v => v.length,
      d => d.experience_level, d => d.job_title);
    const roleSize = d3.rollups(data, v => v.length,
      d => d.job_title, d => d.company_size);

    const links = [];
    expRole.forEach(([exp, list]) => list.forEach(([role, count]) => {
      links.push({
        source: nodeIndex.get("exp::" + exp),
        target: nodeIndex.get("role::" + role),
        value: count,
        expKey: exp,
        key: `exp::${exp}|role::${role}`
      });
    }));
    roleSize.forEach(([role, list]) => list.forEach(([size, count]) => {
      links.push({
        source: nodeIndex.get("role::" + role),
        target: nodeIndex.get("size::" + size),
        value: count,
        expKey: null,
        key: `role::${role}|size::${size}`
      });
    }));

    return { nodes, links };
  }

  // Update — recompute layout and animate.
  function update(filtered) {
    // Empty-state guard: if the filter wipes out everything, show a message.
    const emptyLayer = g.select(".empty-layer");
    emptyLayer.selectAll("*").remove();
    if (!filtered.length) {
      g.select(".links-layer").selectAll("*").transition(tFilter()).attr("opacity", 0).remove();
      g.select(".nodes-layer").selectAll("*").transition(tFilter()).attr("opacity", 0).remove();
      g.select(".node-labels-layer").selectAll("*").transition(tFilter()).attr("opacity", 0).remove();
      emptyLayer.append("text")
        .attr("class", "empty-hint")
        .attr("x", w / 2).attr("y", h / 2)
        .attr("text-anchor", "middle")
        .text("No jobs match the current filter — try Reset or widening the brush.");
      return;
    }

    const graph = sankeyGen({
      nodes: nodeNames.map(n => ({ name: n })),
      links: buildGraph(filtered).links.map(l => Object.assign({}, l))
    });

    const linkPath = d3.sankeyLinkHorizontal();

    // Links: keyed join so d3 matches links across renders.
    const linkSel = g.select(".links-layer")
      .selectAll("path.sankey-link")
      .data(graph.links, d => d.key);

    // EXIT — fade out, then remove.
    linkSel.exit()
      .transition(tFilter())
        .attr("stroke-opacity", 0)
        .attr("stroke-width", 0)
        .remove();

    // ENTER — start invisible at zero width, then grow.
    const linkEnter = linkSel.enter().append("path")
      .attr("class", "sankey-link")
      .attr("d", linkPath)
      .attr("fill", "none")
      .attr("stroke", d => d.expKey ? experienceColor(d.expKey) : "#cbd2da")
      .attr("stroke-opacity", 0)
      .attr("stroke-width", 0)
      .on("mouseover", (event, d) => {
        const src = humanNodeName(graph.nodes[d.source.index].name);
        const tgt = humanNodeName(graph.nodes[d.target.index].name);
        showTooltip(`<strong>${src} → ${tgt}</strong><br/>${fmtInt(d.value)} jobs`, event);
      })
      .on("mousemove", moveTooltip)
      .on("mouseout", hideTooltip);

    // UPDATE (+ enter merge) tween path d and stroke-width together.
    linkEnter.merge(linkSel)
      .transition(tFilter())
        .attr("d", linkPath)
        .attr("stroke", d => d.expKey ? experienceColor(d.expKey) : "#cbd2da")
        .attr("stroke-opacity", 0.45)
        .attr("stroke-width", d => Math.max(1, d.width));

    // Nodes: keyed by node name.
    const nodeSel = g.select(".nodes-layer")
      .selectAll("rect.sankey-node-rect")
      .data(graph.nodes, d => d.name);

    nodeSel.exit().remove();   // node set is stable, but be defensive

    const nodeEnter = nodeSel.enter().append("rect")
      .attr("class", "sankey-node-rect")
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("width", d => d.x1 - d.x0)
      .attr("height", d => Math.max(1, d.y1 - d.y0))
      .attr("fill", d => nodeColor(d.name))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .on("mouseover", (event, d) => showTooltip(
        `<strong>${humanNodeName(d.name)}</strong><br/>${fmtInt(d.value || 0)} jobs`, event))
      .on("mousemove", moveTooltip)
      .on("mouseout", hideTooltip);

    nodeEnter.merge(nodeSel)
      .transition(tFilter())
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => Math.max(1, d.y1 - d.y0))
        .attr("opacity", d => {
          // Dim experience-level nodes that are filtered out.
          if (state.selectedExp && d.name === "exp::" + state.selectedExp) return 1;
          if (state.selectedExp && d.name.startsWith("exp::")) return 0.25;
          return 1;
        });

    // Node labels.
    const labelSel = g.select(".node-labels-layer")
      .selectAll("text.sankey-node-label")
      .data(graph.nodes, d => d.name);

    labelSel.exit().remove();

    const labelEnter = labelSel.enter().append("text")
      .attr("class", "sankey-node-label")
      .attr("dy", "0.35em")
      .attr("font-size", 10)
      .attr("fill", "#1a2330")
      .style("pointer-events", "none");

    labelEnter.merge(labelSel)
      .text(d => humanNodeName(d.name))
      .transition(tFilter())
        .attr("x", d => d.x0 < w / 2 ? d.x1 + 4 : d.x0 - 4)
        .attr("y", d => (d.y0 + d.y1) / 2)
        .attr("text-anchor", d => d.x0 < w / 2 ? "start" : "end")
        .attr("opacity", d => {
          if (state.selectedExp && d.name.startsWith("exp::") &&
              d.name !== "exp::" + state.selectedExp) return 0.35;
          return 1;
        });
  }

  function nodeColor(name) {
    const [kind, code] = name.split("::");
    if (kind === "exp")  return experienceColor(code);
    if (kind === "size") return "#7a8896";
    return "#9aaab9";
  }

  return { init, update };
})();

// Timeline — the Timestep animation. Cycles state.selectedYear through
// 2020 → 2023 on a loop while playing, calling refresh() each tick so
// every view animates to the next year's filtered slice.

const Timeline = (() => {
  const YEARS = [2020, 2021, 2022, 2023];
  const STEP_MS = 1400;          // dwell time per year — long enough for the
                                 // filter transition (550ms) to complete and
                                 // for the user to read the year, but not so
                                 // long that the loop feels sluggish.
  let timer = null;
  let fullRef = null;            // captured full FT dataset for refresh()

  function isPlaying() { return timer != null; }

  function start(full) {
    if (timer) return;            // already playing — no-op
    fullRef = full;
    // If we're starting from "All years", jump to 2020 first; otherwise pick
    // up from the current year so users can resume mid-timeline.
    if (state.selectedYear == null) state.selectedYear = 2020;
    syncControls();
    Scatter.setYearSpotlight(state.selectedYear);
    refresh(fullRef);
    d3.select("#play-btn")
      .text("⏸ Pause timeline")
      .classed("playing", true);
    timer = setInterval(step, STEP_MS);
  }

  function step() {
    const cur = state.selectedYear;
    const idx = YEARS.indexOf(cur);
    // Advance and loop. (% length handles the wrap from 2023 → 2020.)
    state.selectedYear = YEARS[(idx + 1) % YEARS.length];
    syncControls();
    Scatter.setYearSpotlight(state.selectedYear);
    refresh(fullRef);
  }

  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
    d3.select("#play-btn")
      .text("▶ Play timeline")
      .classed("playing", false);
  }

  // Keep the year dropdown in sync with state during playback so the UI doesn't lie.
  function syncControls() {
    d3.select("#year-select").property(
      "value",
      state.selectedYear == null ? "all" : String(state.selectedYear)
    );
  }

  return { start, stop, isPlaying };
})();

// Helper: pretty-print a node id.
function humanNodeName(raw) {
  const [kind, code] = raw.split("::");
  if (kind === "exp")  return EXPERIENCE_LABEL[code] || code;
  if (kind === "size") return SIZE_LABEL[code] + " company";
  return code;
}
