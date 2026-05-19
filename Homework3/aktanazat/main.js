// D3 dashboard for ECS 163 Homework 3 (interactivity + animated transitions).
// Dataset: Sephora skincare catalog (Kaggle: kingabzpro/cosmetics-datasets).
// Only D3 v5 is used; every element added by D3 is commented below.

const DATA_URL = "data/cosmetics.csv";

// The six product categories in the Label column.
const CATEGORIES = ["Moisturizer", "Cleanser", "Treatment", "Face Mask", "Eye cream", "Sun protect"];

// The five binary skin-type columns.
const SKIN_TYPES = ["Combination", "Dry", "Normal", "Oily", "Sensitive"];

// Categorical color per category; muted and print-safe, no neon.
const categoryColor = d3.scaleOrdinal()
  .domain(CATEGORIES)
  .range(["#2a9d8f", "#e76f51", "#e9c46a", "#264653", "#8a5a83", "#4a7c59"]);

// Sequential ramp for the heatmap: neutral paper to dark slate.
const heatColor = d3.scaleLinear().range(["#f1eee8", "#264653"]);

const money = d3.format("$,.0f");
const oneDec = d3.format(".1f");
const tooltip = d3.select("#tooltip");

let products = [];           // parsed, filtered product rows
let pinnedId = null;         // product locked by a click, or null
let brushDomain = null;      // {price:[lo,hi], rank:[lo,hi]} in data space, or null
let zoomTransform = d3.zoomIdentity; // current scatter zoom/pan transform
let suppressBrush = false;   // guards programmatic brush.move calls
let resizeTimer;

// Update closures populated by the build step and called on every selection change.
let scatterHighlight = () => {};
let heatmapUpdate = () => {};
let barsUpdate = () => {};

// Load the CSV, coerce numbers, drop unrated rows, then render.
d3.csv(DATA_URL).then(raw => {
  products = raw
    .map((d, i) => ({
      id: i,
      label: d.Label,
      brand: (d.Brand || "Unknown").trim(),
      name: d.Name,
      price: +d.Price,
      rank: +d.Rank,
      skin: {
        Combination: +d.Combination,
        Dry: +d.Dry,
        Normal: +d.Normal,
        Oily: +d.Oily,
        Sensitive: +d.Sensitive
      }
    }))
    // Rank 0 means "not yet rated"; those rows would pile on the axis and add no insight.
    .filter(d => CATEGORIES.indexOf(d.label) !== -1 && Number.isFinite(d.price) && d.rank > 0);

  renderAll();
}).catch(error => {
  console.error("Could not load cosmetics data:", error);
});

// Rebuild every view on resize so panels keep their proportions and never overlap.
window.addEventListener("resize", () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    renderAll();
    refresh();
  }, 170);
});

function renderAll() {
  drawScatter(products);
  buildHeatmap();
  buildBars();
  refresh();
}

// Products implied by the current brush (or all products when nothing is brushed).
function currentSelection() {
  if (!brushDomain) return products;
  const [p0, p1] = brushDomain.price;
  const [r0, r1] = brushDomain.rank;
  return products.filter(d => d.price >= p0 && d.price <= p1 && d.rank >= r0 && d.rank <= r1);
}

// Push the current selection into all three views.
function refresh() {
  const sel = currentSelection();
  scatterHighlight(sel);
  heatmapUpdate(sel);
  barsUpdate(sel);
}

function getChartBox(selector) {
  const bounds = document.querySelector(selector).getBoundingClientRect();
  return { width: Math.max(320, bounds.width), height: Math.max(200, bounds.height) };
}

// ---------------------------------------------------------------------------
// View 1 (overview/context): price vs. rating scatter.
// Interactions: d3-brush selection, wheel pan/zoom, double-click reset, click-to-pin.
// ---------------------------------------------------------------------------
function drawScatter(data) {
  const selector = "#scatter-chart";
  const svg = d3.select(selector);
  svg.selectAll("*").remove();

  const { width, height } = getChartBox(selector);
  const isCompact = width < 520;
  const margin = isCompact
    ? { top: 16, right: 16, bottom: 36, left: 44 }
    : { top: 20, right: 150, bottom: 48, left: 58 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  svg.attr("viewBox", `0 0 ${width} ${height}`);

  // Base scales; the zoom transform rescales copies of these.
  const xBase = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.price)]).nice()
    .range([0, innerWidth]);
  const yBase = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.rank)]).nice()
    .range([innerHeight, 0]);

  let x = xBase;
  let y = yBase;

  // Clip path so zoomed-in points never spill outside the plot frame.
  svg.append("defs").append("clipPath")
    .attr("id", "scatter-clip")
    .append("rect")
    .attr("width", innerWidth)
    .attr("height", innerHeight);

  // Plot group inset by the margins.
  const chart = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Horizontal gridlines for rating.
  const gridG = chart.append("g")
    .attr("class", "gridline")
    .call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(""));

  // Transparent capture rect: keeps wheel-zoom active even over empty space.
  chart.append("rect")
    .attr("class", "zoom-capture")
    .attr("width", innerWidth)
    .attr("height", innerHeight);

  // Clipped layer holding one circle per product.
  const pointsLayer = chart.append("g")
    .attr("clip-path", "url(#scatter-clip)");

  // Circles: x = price, y = rating, fill = category.
  const points = pointsLayer.selectAll("circle")
    .data(data, d => d.id)
    .enter()
    .append("circle")
    .attr("class", "product-point")
    .attr("cx", d => x(d.price))
    .attr("cy", d => y(d.rank))
    .attr("r", isCompact ? 3 : 3.6)
    .attr("fill", d => categoryColor(d.label))
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 0.6)
    .attr("opacity", 0.72)
    .on("mouseenter", d => showProductTooltip(d))
    .on("mousemove", moveTooltip)
    .on("mouseleave", hideTooltip)
    .on("click", d => pinProduct(d.id));

  // Bottom axis: price.
  const xAxisG = chart.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(isCompact ? 4 : 6).tickFormat(money));

  // Left axis: rating.
  const yAxisG = chart.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(5));

  // x-axis label.
  chart.append("text")
    .attr("class", "axis-label")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + (isCompact ? 30 : 40))
    .attr("text-anchor", "middle")
    .text("Price (USD)");

  // y-axis label.
  chart.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", isCompact ? -32 : -42)
    .attr("text-anchor", "middle")
    .text("User rating (0 to 5)");

  // Usage annotation.
  chart.append("text")
    .attr("class", "annotation")
    .attr("x", 0)
    .attr("y", -6)
    .text(isCompact ? "Drag = brush · wheel = zoom · 2-click = reset" : "Drag to brush a subset · scroll to zoom · double-click to reset · click a point to pin it");

  // Category color legend (full-width screens only, to the right of the plot).
  if (!isCompact) drawCategoryLegend(svg, width - margin.right + 24, margin.top + 6);

  // Brush layer sits above the points so a drag draws a selection rectangle.
  const brush = d3.brush()
    .extent([[0, 0], [innerWidth, innerHeight]])
    .on("end", brushEnded);

  const brushG = chart.append("g")
    .attr("class", "brush")
    .call(brush);

  // Translate the pixel brush extent into data space so it survives zooming.
  function brushEnded() {
    if (suppressBrush) return;
    const s = d3.event.selection;
    if (!s) {
      brushDomain = null;
    } else {
      brushDomain = {
        price: [x.invert(s[0][0]), x.invert(s[1][0])],
        rank: [y.invert(s[1][1]), y.invert(s[0][1])]
      };
      pinnedId = null;
    }
    refresh();
  }

  // Zoom rescales both axes (pan-and-zoom "camera"); wheel only, so it never
  // fights the brush drag. Direct manipulation, so no easing here.
  const zoom = d3.zoom()
    .scaleExtent([1, 10])
    .filter(() => d3.event.type === "wheel")
    .on("zoom", zoomed);

  svg.call(zoom);
  svg.on("dblclick.zoom", null);

  // Double-click eases the camera back to the full view (a view transition).
  svg.on("dblclick", () => {
    svg.transition().duration(450).call(zoom.transform, d3.zoomIdentity);
  });

  function zoomed() {
    zoomTransform = d3.event.transform;
    x = zoomTransform.rescaleX(xBase);
    y = zoomTransform.rescaleY(yBase);

    // Reposition every point under the new camera.
    points.attr("cx", d => x(d.price)).attr("cy", d => y(d.rank));

    // Rescale axes and gridlines to match.
    xAxisG.call(d3.axisBottom(x).ticks(isCompact ? 4 : 6).tickFormat(money));
    yAxisG.call(d3.axisLeft(y).ticks(5));
    gridG.call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(""));

    // Zoom is navigation: clear any brush so selection is re-made in the new view.
    if (brushDomain || d3.brushSelection(brushG.node())) {
      suppressBrush = true;
      brushG.call(brush.move, null);
      suppressBrush = false;
      brushDomain = null;
      refresh();
    }
  }

  // Reapply the scatter highlight whenever the selection changes.
  scatterHighlight = function (sel) {
    const inSet = new Set(sel.map(d => d.id));
    points
      .classed("is-muted", d => brushDomain ? !inSet.has(d.id) : false)
      .classed("is-pinned", d => d.id === pinnedId);
  };
}

// ---------------------------------------------------------------------------
// View 2 (advanced): category x skin-type heatmap.
// Animated transition: cells tween fill color and counts on every selection change.
// ---------------------------------------------------------------------------
function buildHeatmap() {
  const selector = "#heatmap-chart";
  const svg = d3.select(selector);
  svg.selectAll("*").remove();

  const { width, height } = getChartBox(selector);
  const isCompact = width < 520;
  const margin = isCompact
    ? { top: 22, right: 14, bottom: 28, left: 78 }
    : { top: 30, right: 30, bottom: 52, left: 104 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  svg.attr("viewBox", `0 0 ${width} ${height}`);

  // Columns = skin types, rows = categories.
  const xScale = d3.scaleBand().domain(SKIN_TYPES).range([0, innerWidth]).padding(0.06);
  const yScale = d3.scaleBand().domain(CATEGORIES).range([0, innerHeight]).padding(0.06);

  // Plot group inset by the margins.
  const chart = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // One rect per (category, skin type) cell, keyed so it persists across updates.
  const cellKeys = [];
  CATEGORIES.forEach(cat => SKIN_TYPES.forEach(skin => cellKeys.push({ cat, skin })));

  const cells = chart.selectAll("rect.heat-cell")
    .data(cellKeys, d => `${d.cat}|${d.skin}`)
    .enter()
    .append("rect")
    .attr("class", "heat-cell")
    .attr("x", d => xScale(d.skin))
    .attr("y", d => yScale(d.cat))
    .attr("width", xScale.bandwidth())
    .attr("height", yScale.bandwidth())
    .attr("fill", heatColor(0))
    .attr("stroke", "#ffffff")
    .on("mouseenter", function (d) { showCellTooltip(d, this); })
    .on("mousemove", moveTooltip)
    .on("mouseleave", function (d) {
      d3.select(this).classed("is-active", false);
      hideTooltip();
    });

  // In-cell count labels (updated with a counting tween).
  const cellText = chart.selectAll("text.cell-count")
    .data(cellKeys, d => `${d.cat}|${d.skin}`)
    .enter()
    .append("text")
    .attr("class", "cell-count")
    .attr("x", d => xScale(d.skin) + xScale.bandwidth() / 2)
    .attr("y", d => yScale(d.cat) + yScale.bandwidth() / 2 + 4)
    .attr("text-anchor", "middle")
    .text("0");

  // Bottom axis: skin types.
  chart.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale).tickSize(0));

  // Left axis: categories.
  chart.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(yScale).tickSize(0));

  // x-axis label.
  chart.append("text")
    .attr("class", "axis-label")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + (isCompact ? 24 : 36))
    .attr("text-anchor", "middle")
    .text("Skin type");

  // Annotation tying the matrix to the brush.
  chart.append("text")
    .attr("class", "annotation")
    .attr("x", 0)
    .attr("y", -10)
    .text(isCompact ? "Counts follow the brushed subset" : "Cell = products in the brushed subset suited to that skin type; color tweens as you brush");

  // Sequential color legend (gradient swatch with min/max ticks).
  const legend = svg.append("g")
    .attr("transform", `translate(${margin.left},${height - 16})`);

  // Gradient definition for the legend swatch.
  const grad = svg.append("defs").append("linearGradient").attr("id", "heat-grad");
  grad.append("stop").attr("offset", "0%").attr("stop-color", heatColor(0));
  grad.append("stop").attr("offset", "100%").attr("stop-color", heatColor(1));

  // Legend swatch.
  legend.append("rect")
    .attr("width", Math.min(160, innerWidth))
    .attr("height", 8)
    .attr("fill", "url(#heat-grad)");

  // Legend low label.
  legend.append("text").attr("class", "legend-label").attr("x", 0).attr("y", -4).text("fewer");

  // Legend high label.
  legend.append("text")
    .attr("class", "legend-label")
    .attr("x", Math.min(160, innerWidth))
    .attr("y", -4)
    .attr("text-anchor", "end")
    .text("more products");

  // Recompute counts for the selection and tween cells + labels.
  heatmapUpdate = function (sel) {
    const counts = {};
    cellKeys.forEach(k => { counts[`${k.cat}|${k.skin}`] = 0; });
    sel.forEach(p => {
      SKIN_TYPES.forEach(skin => {
        if (p.skin[skin] === 1) counts[`${p.label}|${skin}`] += 1;
      });
    });

    const maxCount = d3.max(Object.values(counts)) || 1;
    heatColor.domain([0, maxCount]);

    // Cells ease to the new color (filtering / timestep transition).
    cells.transition()
      .duration(650)
      .ease(d3.easeCubicInOut)
      .attr("fill", d => heatColor(counts[`${d.cat}|${d.skin}`]));

    // Labels count up/down to the new value over the same window.
    cellText.transition()
      .duration(650)
      .ease(d3.easeCubicInOut)
      .tween("text", function (d) {
        const node = this;
        const start = +node.textContent || 0;
        const end = counts[`${d.cat}|${d.skin}`];
        const i = d3.interpolateRound(start, end);
        return t => { node.textContent = i(t); };
      });

    // Cache counts for tooltips.
    cells.each(function (d) { d.value = counts[`${d.cat}|${d.skin}`]; });
  };
}

// ---------------------------------------------------------------------------
// View 3 (focus): top brands by mean rating.
// Animated transition: bars reorder (slide) and grow/shrink on every selection.
// ---------------------------------------------------------------------------
function buildBars() {
  const selector = "#bars-chart";
  const svg = d3.select(selector);
  svg.selectAll("*").remove();

  const { width, height } = getChartBox(selector);
  const isCompact = width < 520;
  const margin = isCompact
    ? { top: 18, right: 44, bottom: 34, left: 96 }
    : { top: 20, right: 64, bottom: 42, left: 150 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const topN = isCompact ? 8 : 12;

  svg.attr("viewBox", `0 0 ${width} ${height}`);

  // x = mean rating (0 to 5), fixed so bar length is comparable across selections.
  const xScale = d3.scaleLinear().domain([0, 5]).range([0, innerWidth]);
  const yScale = d3.scaleBand().range([0, innerHeight]).padding(0.18);

  // Plot group inset by the margins.
  const chart = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Vertical gridlines for rating.
  chart.append("g")
    .attr("class", "gridline")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale).ticks(5).tickSize(-innerHeight).tickFormat(""));

  // Static bottom axis: rating.
  chart.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale).ticks(5));

  // Mutable left axis: brand names (re-rendered as the ranking changes).
  const yAxisG = chart.append("g").attr("class", "axis");

  // Layer holding the bars.
  const barsLayer = chart.append("g");

  // Layer holding the value labels.
  const labelLayer = chart.append("g");

  // x-axis label.
  chart.append("text")
    .attr("class", "axis-label")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + (isCompact ? 28 : 36))
    .attr("text-anchor", "middle")
    .text("Mean user rating");

  // Annotation describing the reordering animation.
  chart.append("text")
    .attr("class", "annotation")
    .attr("x", 0)
    .attr("y", -6)
    .text(isCompact ? `Top ${topN} brands · reorders on brush` : `Top ${topN} brands by product count, ranked by mean rating; bars reorder as you brush`);

  barsUpdate = function (sel) {
    // Aggregate per brand, keep the most-stocked brands, rank by mean rating.
    const byBrand = d3.nest()
      .key(d => d.brand)
      .rollup(v => ({
        count: v.length,
        meanRank: d3.mean(v, d => d.rank),
        meanPrice: d3.mean(v, d => d.price)
      }))
      .entries(sel)
      .map(e => ({ brand: e.key, count: e.value.count, meanRank: e.value.meanRank, meanPrice: e.value.meanPrice }))
      .sort((a, b) => d3.descending(a.count, b.count))
      .slice(0, topN)
      .sort((a, b) => d3.descending(a.meanRank, b.meanRank));

    yScale.domain(byBrand.map(d => d.brand));
    const t = d3.transition().duration(750).ease(d3.easeCubicInOut);

    // Left axis slides its labels into the new order.
    yAxisG.transition(t).call(d3.axisLeft(yScale).tickSize(0));

    // BARS: object constancy by brand so updates animate position + length.
    const bars = barsLayer.selectAll("rect.brand-bar").data(byBrand, d => d.brand);

    // Exit: shrink to zero width and fade before removal (filtering out).
    bars.exit()
      .transition(t)
      .attr("width", 0)
      .attr("opacity", 0)
      .remove();

    // Enter: start collapsed at the right row, then grow with the merged update.
    const barsEnter = bars.enter()
      .append("rect")
      .attr("class", "brand-bar")
      .attr("x", 0)
      .attr("y", d => yScale(d.brand))
      .attr("height", yScale.bandwidth())
      .attr("width", 0)
      .attr("opacity", 0.9)
      .attr("fill", "#264653");

    // Update + enter: slide to the new row (ordering) and tween width (value).
    barsEnter.merge(bars)
      .transition(t)
      .attr("y", d => yScale(d.brand))
      .attr("height", yScale.bandwidth())
      .attr("width", d => xScale(d.meanRank))
      .attr("opacity", 0.9);

    // VALUE LABELS: mirror the bars so the group moves with common fate.
    const labels = labelLayer.selectAll("text.bar-value").data(byBrand, d => d.brand);

    // Exit labels fade out with their bars.
    labels.exit().transition(t).attr("opacity", 0).remove();

    // Enter labels at the new row.
    const labelsEnter = labels.enter()
      .append("text")
      .attr("class", "bar-value legend-label")
      .attr("y", d => yScale(d.brand) + yScale.bandwidth() / 2 + 4)
      .attr("opacity", 0);

    // Update + enter: follow the bar and show "rating · n products".
    labelsEnter.merge(labels)
      .text(d => `${oneDec(d.meanRank)} · ${d.count}`)
      .transition(t)
      .attr("x", d => xScale(d.meanRank) + 6)
      .attr("y", d => yScale(d.brand) + yScale.bandwidth() / 2 + 4)
      .attr("opacity", 1);
  };
}

// Shared category color legend used by the scatter view.
function drawCategoryLegend(svg, x, y) {
  // Legend group anchored to the right of the plot.
  const legend = svg.append("g").attr("transform", `translate(${x},${y})`);

  // One row (swatch + label) per category.
  const row = legend.selectAll("g")
    .data(CATEGORIES)
    .enter()
    .append("g")
    .attr("transform", (d, i) => `translate(0,${i * 19})`);

  // Color swatch.
  row.append("rect")
    .attr("width", 11)
    .attr("height", 11)
    .attr("fill", d => categoryColor(d));

  // Category label.
  row.append("text")
    .attr("class", "legend-label")
    .attr("x", 16)
    .attr("y", 10)
    .text(d => d);
}

function showProductTooltip(d) {
  tooltip
    .style("opacity", 1)
    .html(`<strong>${d.brand} — ${d.name}</strong>${d.label} · ${money(d.price)} · ${oneDec(d.rank)}/5<br>Click to pin across the views.`);
  moveTooltip();
}

function showCellTooltip(d, node) {
  d3.select(node).classed("is-active", true);
  tooltip
    .style("opacity", 1)
    .html(`<strong>${d.cat} · ${d.skin}</strong>${d.value || 0} products in the current selection suit ${d.skin.toLowerCase()} skin.`);
  moveTooltip();
}

function moveTooltip() {
  tooltip
    .style("left", `${d3.event.clientX}px`)
    .style("top", `${d3.event.clientY}px`);
}

function hideTooltip() {
  tooltip.style("opacity", 0);
}

// Click pins (or unpins) a single product and re-applies the highlight.
function pinProduct(id) {
  pinnedId = pinnedId === id ? null : id;
  scatterHighlight(currentSelection());
}
