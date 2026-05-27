/* 
   Data Science Salaries Dashboard
   - View 1 (context, overview): Bar chart — avg salary by experience level
   - View 2 (context):           2D Heatmap — experience x company size
   - View 3 (focus, advanced):   Sankey diagram — experience -> role -> size
   All three views read from the same CSV and use D3 v7.
 */

// ---------- Shared lookup tables ----------
// Map experience codes in the CSV to human-readable labels for axis/legend display.
const EXPERIENCE_LABEL = {
  EN: "Entry",
  MI: "Mid",
  SE: "Senior",
  EX: "Executive"
};
const EXPERIENCE_ORDER = ["EN", "MI", "SE", "EX"];          // ordinal ranking
const SIZE_LABEL = { S: "Small", M: "Medium", L: "Large" };
const SIZE_ORDER = ["S", "M", "L"];

// A single ordinal palette for experience level, reused across all three views
// so that "EN" looks the same blue everywhere — consistent encoding.
const experienceColor = d3.scaleOrdinal()
  .domain(EXPERIENCE_ORDER)
  .range(["#bdd7e7", "#6baed6", "#3182bd", "#08519c"]); // sequential blues

// Tooltip helper — single DOM element reused by all views.
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
function hideTooltip() {
  tooltip.style("opacity", 0);
}

// USD formatter for tooltips and labels
const fmtUSD = d3.format("$,.0f");
const fmtInt = d3.format(",");

// ---------- Load the CSV, then build all three views ----------
d3.csv("ds_salaries.csv", d => ({
  // Coerce numeric columns; keep categorical fields as strings.
  work_year: +d.work_year,
  experience_level: d.experience_level,
  employment_type: d.employment_type,
  job_title: d.job_title,
  salary_in_usd: +d.salary_in_usd,
  remote_ratio: +d.remote_ratio,
  company_size: d.company_size
})).then(data => {
  // Filter to full-time only to keep the comparison clean (CT/PT/FL are tiny slices).
  const ft = data.filter(d => d.employment_type === "FT");

  // Kick off each view; each function appends its own SVG into its container.
  drawBarChart(ft);
  drawHeatmap(ft);
  drawSankey(ft);

  // Re-render on resize so each chart adapts to new container size.
  window.addEventListener("resize", debounce(() => {
    d3.selectAll(".chart-container > svg").remove();
    drawBarChart(ft);
    drawHeatmap(ft);
    drawSankey(ft);
  }, 200));
}).catch(err => {
  console.error("Failed to load dataset:", err);
  d3.select("body").append("p")
    .style("color", "red")
    .text("Could not load ds_salaries.csv. Serve this folder over http (e.g. `python -m http.server`).");
});

// Simple debounce used by the resize handler.
function debounce(fn, wait) {
  let t;
  return function() {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, arguments), wait);
  };
}

/*
   VIEW 1: Bar chart — Average Salary by Experience Level (OVERVIEW)
   Encoding: experience level -> x position (ordinal),
             avg salary in USD -> bar height (quantitative),
             experience level  -> fill (sequential ordinal, consistent w/ Sankey).
   Why a bar chart for the overview: gives an immediate at-a-glance read of
   the single strongest salary driver, before the user dives into the focus view.
*/
function drawBarChart(data) {
  const container = document.getElementById("chart-bar");
  const { clientWidth: W, clientHeight: H } = container;
  const margin = { top: 8, right: 14, bottom: 38, left: 58 };
  const w = W - margin.left - margin.right;
  const h = H - margin.top - margin.bottom;

  // Aggregate: average salary in USD per experience level.
  const avgByExp = d3.rollups(
    data,
    v => d3.mean(v, d => d.salary_in_usd),
    d => d.experience_level
  ).map(([k, v]) => ({ key: k, value: v, count: data.filter(d => d.experience_level === k).length }));

  // Sort to follow the ordinal ranking EN -> MI -> SE -> EX.
  avgByExp.sort((a, b) => EXPERIENCE_ORDER.indexOf(a.key) - EXPERIENCE_ORDER.indexOf(b.key));

  // Create the root SVG inside the panel.
  const svg = d3.select("#chart-bar").append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  // A <g> offset by the margins — all chart content sits inside this group.
  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // x: ordinal scale over the four experience codes.
  const x = d3.scaleBand()
    .domain(EXPERIENCE_ORDER)
    .range([0, w])
    .padding(0.25);

  // y: linear scale; nice() rounds the upper bound for readable ticks.
  const y = d3.scaleLinear()
    .domain([0, d3.max(avgByExp, d => d.value) * 1.1])
    .nice()
    .range([h, 0]);

  // X axis — draw bottom axis, tick labels are human-readable names.
  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${h})`)
    .call(d3.axisBottom(x).tickFormat(c => EXPERIENCE_LABEL[c]));

  // Y axis — tick values formatted as $K for compact readability.
  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(5).tickFormat(d => "$" + d3.format(".2~s")(d).replace("G", "B")));

  // Axis labels for legibility.
  svg.append("text")
    .attr("class", "axis-label")
    .attr("x", margin.left + w / 2)
    .attr("y", H - 4)
    .attr("text-anchor", "middle")
    .text("Experience Level");

  svg.append("text")
    .attr("class", "axis-label")
    .attr("transform", `translate(12, ${margin.top + h / 2}) rotate(-90)`)
    .attr("text-anchor", "middle")
    .text("Average Salary (USD)");

  // Bars — one rect per experience level, colored by the shared experience palette.
  g.selectAll(".bar")
    .data(avgByExp)
    .enter().append("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.key))
      .attr("y", d => y(d.value))
      .attr("width", x.bandwidth())
      .attr("height", d => h - y(d.value))
      .attr("fill", d => experienceColor(d.key))
      .on("mouseover", (event, d) => showTooltip(
        `<strong>${EXPERIENCE_LABEL[d.key]}</strong><br/>
         Avg salary: ${fmtUSD(d.value)}<br/>
         Jobs in sample: ${fmtInt(d.count)}`, event))
      .on("mousemove", moveTooltip)
      .on("mouseout", hideTooltip);

  // Value labels on top of each bar so exact numbers are readable without hover.
  g.selectAll(".bar-label")
    .data(avgByExp)
    .enter().append("text")
      .attr("class", "bar-label")
      .attr("x", d => x(d.key) + x.bandwidth() / 2)
      .attr("y", d => y(d.value) - 4)
      .attr("text-anchor", "middle")
      .style("font-size", "10px")
      .style("fill", "#1a2330")
      .text(d => fmtUSD(d.value));
}

/*
   VIEW 2: Heatmap — Experience Level × Company Size (CONTEXT)
   Encoding: experience level -> x position,
             company size     -> y position,
             avg salary (USD) -> cell fill (sequential YlOrRd).
   A 2D matrix is the right fit when crossing two ordinal categoricals
   and showing a quantitative magnitude per cell.
   */
function drawHeatmap(data) {
  const container = document.getElementById("chart-heatmap");
  const { clientWidth: W, clientHeight: H } = container;
  // Leave room on the right for a vertical color-scale legend.
  const margin = { top: 16, right: 90, bottom: 38, left: 70 };
  const w = W - margin.left - margin.right;
  const h = H - margin.top - margin.bottom;

  // Build all (experience x size) cells with mean salary + count.
  const cells = [];
  EXPERIENCE_ORDER.forEach(exp => {
    SIZE_ORDER.forEach(size => {
      const subset = data.filter(d => d.experience_level === exp && d.company_size === size);
      cells.push({
        exp, size,
        mean: subset.length ? d3.mean(subset, d => d.salary_in_usd) : null,
        count: subset.length
      });
    });
  });

  const svg = d3.select("#chart-heatmap").append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Scales: ordinal x (experience) and ordinal y (company size).
  const x = d3.scaleBand().domain(EXPERIENCE_ORDER).range([0, w]).padding(0.04);
  const y = d3.scaleBand().domain(SIZE_ORDER).range([0, h]).padding(0.04);

  // Sequential color scale for salary magnitude — YlOrRd is perceptually ordered.
  const meanExtent = d3.extent(cells.filter(c => c.mean != null), c => c.mean);
  const color = d3.scaleSequential(d3.interpolateYlOrRd).domain(meanExtent);

  // Axes.
  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${h})`)
    .call(d3.axisBottom(x).tickFormat(c => EXPERIENCE_LABEL[c]));

  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).tickFormat(c => SIZE_LABEL[c]));

  svg.append("text")
    .attr("class", "axis-label")
    .attr("x", margin.left + w / 2)
    .attr("y", H - 4)
    .attr("text-anchor", "middle")
    .text("Experience Level");

  svg.append("text")
    .attr("class", "axis-label")
    .attr("transform", `translate(14, ${margin.top + h / 2}) rotate(-90)`)
    .attr("text-anchor", "middle")
    .text("Company Size");

  // Draw one rect per cell.
  g.selectAll(".heatmap-cell")
    .data(cells)
    .enter().append("rect")
      .attr("class", "heatmap-cell")
      .attr("x", d => x(d.exp))
      .attr("y", d => y(d.size))
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      // Empty cells (no data) get a neutral grey so they read as "no data" not "low".
      .attr("fill", d => d.mean == null ? "#e9ecef" : color(d.mean))
      .on("mouseover", (event, d) => showTooltip(
        `<strong>${EXPERIENCE_LABEL[d.exp]} · ${SIZE_LABEL[d.size]} company</strong><br/>
         Avg salary: ${d.mean == null ? "n/a" : fmtUSD(d.mean)}<br/>
         Jobs: ${fmtInt(d.count)}`, event))
      .on("mousemove", moveTooltip)
      .on("mouseout", hideTooltip);

  // In-cell numeric label so the user can read magnitudes without hover.
  g.selectAll(".heatmap-label")
    .data(cells)
    .enter().append("text")
      .attr("class", "heatmap-label")
      .attr("x", d => x(d.exp) + x.bandwidth() / 2)
      .attr("y", d => y(d.size) + y.bandwidth() / 2 + 3)
      // Switch text color to white on dark backgrounds to maintain contrast.
      .attr("fill", d => {
        if (d.mean == null) return "#888";
        const t = (d.mean - meanExtent[0]) / (meanExtent[1] - meanExtent[0]);
        return t > 0.55 ? "#fff" : "#1a2330";
      })
      .text(d => d.mean == null ? "n/a" : "$" + d3.format(".2~s")(d.mean));

  // ---------- Color legend (vertical gradient bar) ----------
  const legendW = 14;
  const legendH = h;
  const legendX = w + 28;

  // Define a linear gradient that mirrors the color scale.
  const defs = svg.append("defs");
  const grad = defs.append("linearGradient")
    .attr("id", "heatmap-gradient")
    .attr("x1", "0%").attr("y1", "100%")
    .attr("x2", "0%").attr("y2", "0%");
  d3.range(0, 1.0001, 0.1).forEach(t => {
    grad.append("stop")
      .attr("offset", `${t * 100}%`)
      .attr("stop-color", color(meanExtent[0] + t * (meanExtent[1] - meanExtent[0])));
  });

  const legendG = g.append("g").attr("class", "legend")
    .attr("transform", `translate(${legendX},0)`);

  legendG.append("rect")
    .attr("width", legendW)
    .attr("height", legendH)
    .style("fill", "url(#heatmap-gradient)");

  // Legend scale + axis ticks
  const legendScale = d3.scaleLinear().domain(meanExtent).range([legendH, 0]);
  legendG.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${legendW},0)`)
    .call(d3.axisRight(legendScale)
      .ticks(4)
      .tickFormat(d => "$" + d3.format(".2~s")(d)));

  legendG.append("text")
    .attr("class", "legend-title")
    .attr("x", 0)
    .attr("y", -4)
    .text("Avg Salary");
}

/*
   VIEW 3: Sankey diagram — Experience -> Role -> Company Size (FOCUS, ADVANCED)
   Encoding: each flow's width = number of jobs taking that path.
   Color: experience level color carried along its outgoing flows.
   Why Sankey: this view shows multi-step categorical relationships
   (which roles entry-level workers land in, where senior workers concentrate,
   and what size companies dominate each route) — something a bar/heatmap
   cannot show in a single mark.
   */
function drawSankey(data) {
  const container = document.getElementById("chart-sankey");
  const { clientWidth: W, clientHeight: H } = container;
  const margin = { top: 16, right: 110, bottom: 26, left: 70 };
  const w = W - margin.left - margin.right;
  const h = H - margin.top - margin.bottom;

  // Keep only the top N job titles so the diagram stays readable.
  const TOP_N = 8;
  const topRoles = Array.from(
    d3.rollup(data, v => v.length, d => d.job_title),
    ([k, v]) => ({ k, v })
  ).sort((a, b) => d3.descending(a.v, b.v)).slice(0, TOP_N).map(d => d.k);

  const filtered = data.filter(d => topRoles.includes(d.job_title));

  // Build node + link arrays in the shape d3-sankey expects.
  // Three "columns" of nodes: experience -> role -> size.
  const nodeNames = [
    ...EXPERIENCE_ORDER.map(e => "exp::" + e),
    ...topRoles.map(r => "role::" + r),
    ...SIZE_ORDER.map(s => "size::" + s)
  ];
  const nodeIndex = new Map(nodeNames.map((n, i) => [n, i]));
  const nodes = nodeNames.map(n => ({ name: n }));

  // Aggregate counts for experience -> role.
  const expRole = d3.rollups(
    filtered,
    v => v.length,
    d => d.experience_level,
    d => d.job_title
  );
  // Aggregate counts for role -> size.
  const roleSize = d3.rollups(
    filtered,
    v => v.length,
    d => d.job_title,
    d => d.company_size
  );

  const links = [];
  expRole.forEach(([exp, roleList]) => {
    roleList.forEach(([role, count]) => {
      links.push({
        source: nodeIndex.get("exp::" + exp),
        target: nodeIndex.get("role::" + role),
        value: count,
        // Carry the originating experience level so we can color the flow consistently.
        expKey: exp
      });
    });
  });
  roleSize.forEach(([role, sizeList]) => {
    sizeList.forEach(([size, count]) => {
      // For role->size links we color them grey (no single experience owns them).
      links.push({
        source: nodeIndex.get("role::" + role),
        target: nodeIndex.get("size::" + size),
        value: count,
        expKey: null
      });
    });
  });

  // Set up the d3-sankey generator with a small node padding/width.
  const sankey = d3.sankey()
    .nodeWidth(14)
    .nodePadding(10)
    .extent([[0, 0], [w, h]]);

  // sankey() mutates nodes/links in place, adding x0/y0/x1/y1 and link layout fields.
  const graph = sankey({
    nodes: nodes.map(d => Object.assign({}, d)),
    links: links.map(d => Object.assign({}, d))
  });

  const svg = d3.select("#chart-sankey").append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // ---------- Links (drawn first so nodes sit on top) ----------
  g.append("g")
    .selectAll("path")
    .data(graph.links)
    .enter().append("path")
      .attr("class", "sankey-link")
      // d3-sankey provides a horizontal link generator.
      .attr("d", d3.sankeyLinkHorizontal())
      .attr("stroke", d => d.expKey ? experienceColor(d.expKey) : "#cbd2da")
      .attr("stroke-width", d => Math.max(1, d.width))
      .on("mouseover", (event, d) => {
        const src = humanNodeName(graph.nodes[d.source.index].name);
        const tgt = humanNodeName(graph.nodes[d.target.index].name);
        showTooltip(`<strong>${src} → ${tgt}</strong><br/>${fmtInt(d.value)} jobs`, event);
      })
      .on("mousemove", moveTooltip)
      .on("mouseout", hideTooltip);

  // ---------- Nodes ----------
  const nodeG = g.append("g")
    .selectAll(".sankey-node")
    .data(graph.nodes)
    .enter().append("g")
      .attr("class", "sankey-node");

  nodeG.append("rect")
    .attr("x", d => d.x0)
    .attr("y", d => d.y0)
    .attr("height", d => Math.max(1, d.y1 - d.y0))
    .attr("width", d => d.x1 - d.x0)
    // Color experience-level nodes with the shared palette; others get neutral fills.
    .attr("fill", d => {
      const [kind, code] = d.name.split("::");
      if (kind === "exp")  return experienceColor(code);
      if (kind === "size") return "#7a8896";
      return "#9aaab9";
    })
    .on("mouseover", (event, d) => showTooltip(
      `<strong>${humanNodeName(d.name)}</strong><br/>${fmtInt(d.value)} jobs`, event))
    .on("mousemove", moveTooltip)
    .on("mouseout", hideTooltip);

  // Node labels — placed to the right of left/middle nodes and to the left of right-most nodes
  // so they never collide with the chart edges.
  nodeG.append("text")
    .attr("x", d => d.x0 < w / 2 ? d.x1 + 4 : d.x0 - 4)
    .attr("y", d => (d.y0 + d.y1) / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", d => d.x0 < w / 2 ? "start" : "end")
    .text(d => humanNodeName(d.name));

  // ---------- Column headers, since Sankey columns are otherwise unlabeled ----------
  const colHeader = [
    { x: 0,             label: "Experience" },
    { x: w / 2,         label: "Job Title (Top 8)" },
    { x: w,             label: "Company Size" }
  ];
  svg.append("g").attr("transform", `translate(${margin.left},${margin.top - 2})`)
    .selectAll("text")
    .data(colHeader)
    .enter().append("text")
      .attr("x", d => d.x)
      .attr("y", 0)
      .attr("text-anchor", (d, i) => i === 0 ? "start" : (i === 2 ? "end" : "middle"))
      .attr("class", "legend-title")
      .text(d => d.label);

  // ---------- Legend for the experience-level color scale ----------
  // Placed on the far right inside the panel.
  const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${W - margin.right + 10}, ${margin.top + 4})`);

  legend.append("text")
    .attr("class", "legend-title")
    .attr("x", 0).attr("y", 0)
    .text("Experience Level");

  EXPERIENCE_ORDER.forEach((exp, i) => {
    const row = legend.append("g").attr("transform", `translate(0, ${10 + i * 16})`);
    row.append("rect")
      .attr("width", 12).attr("height", 12)
      .attr("fill", experienceColor(exp));
    row.append("text")
      .attr("x", 16).attr("y", 10)
      .text(EXPERIENCE_LABEL[exp]);
  });

  // Note about role->size grey flows.
  legend.append("g").attr("transform", `translate(0, ${10 + EXPERIENCE_ORDER.length * 16 + 6})`)
    .call(g2 => {
      g2.append("rect").attr("width", 12).attr("height", 12).attr("fill", "#cbd2da");
      g2.append("text").attr("x", 16).attr("y", 10).text("Role → Size flow");
    });
}

// Helper: pretty-print a node id like "exp::SE" -> "Senior", "role::Data Engineer" -> "Data Engineer".
function humanNodeName(raw) {
  const [kind, code] = raw.split("::");
  if (kind === "exp")  return EXPERIENCE_LABEL[code] || code;
  if (kind === "size") return SIZE_LABEL[code] + " company";
  return code;
}
