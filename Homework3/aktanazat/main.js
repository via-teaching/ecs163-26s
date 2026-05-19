// D3 dashboard for ECS 163 Homework 3 (interactivity + animated transitions).
// Dataset: Sephora skincare catalog (Kaggle: kingabzpro/cosmetics-datasets).
// Only D3 v5 is loaded. Every element D3 adds to the DOM has a comment above it.

const DATA_URL = "data/cosmetics.csv";

// The six product categories in the Label column.
const CATEGORIES = ["Moisturizer", "Cleanser", "Treatment", "Face Mask", "Eye cream", "Sun protect"];

// The five binary skin-type columns.
const SKIN_TYPES = ["Combination", "Dry", "Normal", "Oily", "Sensitive"];

// Categorical color per category; muted and print-safe, no neon.
const categoryColor = d3.scaleOrdinal()
  .domain(CATEGORIES)
  .range(["#2a9d8f", "#e76f51", "#e9c46a", "#264653", "#8a5a83", "#4a7c59"]);

// Sequential ramp for the heatmap. Ratings sit in roughly 3 to 5, so the
// domain is clamped there to keep the color contrast meaningful.
const heatColor = d3.scaleLinear().domain([3, 5]).range(["#f1eee8", "#264653"]).clamp(true);
const EMPTY_FILL = "#f6f4ef"; // a cell with no products in the selection

const money = d3.format("$,.0f");
const oneDec = d3.format(".1f");
const tooltip = d3.select("#tooltip");
const detail = d3.select("#detail");

let products = [];           // parsed, filtered product rows
let pinned = null;           // product locked by a click, or null
let brushDomain = null;      // {price:[lo,hi], rank:[lo,hi]} in data space, or null
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
    // Rank 0 means "not yet rated"; those rows would pile on the axis at 0.
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

// Push the current selection into all three views and the detail card.
function refresh() {
  const sel = currentSelection();
  scatterHighlight(sel);
  heatmapUpdate(sel);
  barsUpdate(sel);
  renderDetail();
}

function getChartBox(selector) {
  const bounds = document.querySelector(selector).getBoundingClientRect();
  return { width: Math.max(300, bounds.width), height: Math.max(150, bounds.height) };
}

// ---------------------------------------------------------------------------
// View 1 (overview / context): price vs. rating scatter.
// Interactions: d3-brush selection, wheel d3-zoom, double-click reset, click-to-pin.
// ---------------------------------------------------------------------------
function drawScatter(data) {
  const selector = "#scatter-chart";
  const svg = d3.select(selector);
  svg.selectAll("*").remove();

  const { width, height } = getChartBox(selector);
  const isCompact = width < 520;
  // Compact screens reserve top space for a two-row legend + the annotation
  // so neither sits over the points.
  const margin = isCompact
    ? { top: 58, right: 14, bottom: 34, left: 42 }
    : { top: 20, right: 150, bottom: 46, left: 56 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  svg.attr("viewBox", `0 0 ${width} ${height}`);

  // Base scales; the zoom transform rescales copies of these.
  const xBase = d3.scaleLinear().domain([0, d3.max(data, d => d.price)]).nice().range([0, innerWidth]);
  const yBase = d3.scaleLinear().domain([0, d3.max(data, d => d.rank)]).nice().range([innerHeight, 0]);
  let x = xBase;
  let y = yBase;

  // Clip-path rect so zoomed-in points never spill outside the plot frame.
  svg.append("defs").append("clipPath").attr("id", "scatter-clip")
    .append("rect").attr("width", innerWidth).attr("height", innerHeight);

  // Plot group inset by the margins.
  const chart = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // Horizontal gridlines for the rating axis.
  const gridG = chart.append("g").attr("class", "gridline")
    .call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(""));

  // Transparent rect so the wheel keeps zooming even over empty space.
  chart.append("rect").attr("class", "zoom-capture")
    .attr("width", innerWidth).attr("height", innerHeight);

  // Clipped layer holding one circle per product.
  const pointsLayer = chart.append("g").attr("clip-path", "url(#scatter-clip)");

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
    .on("click", d => pinProduct(d));

  // Bottom axis: price.
  const xAxisG = chart.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(isCompact ? 4 : 6).tickFormat(money));

  // Left axis: rating.
  const yAxisG = chart.append("g").attr("class", "axis")
    .call(d3.axisLeft(y).ticks(5));

  // x-axis label.
  chart.append("text").attr("class", "axis-label")
    .attr("x", innerWidth / 2).attr("y", innerHeight + (isCompact ? 30 : 38))
    .attr("text-anchor", "middle").text("Price (USD)");

  // y-axis label.
  chart.append("text").attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2).attr("y", isCompact ? -30 : -42)
    .attr("text-anchor", "middle").text("User rating (0 to 5)");

  // Usage annotation.
  chart.append("text").attr("class", "annotation")
    .attr("x", 0).attr("y", -6)
    .text(isCompact ? "Drag = brush · wheel = zoom · 2-click = reset" : "Drag to brush a subset · scroll to zoom · double-click to reset · click a point to pin its detail");

  // Category color legend (kept on every screen size so the colors stay readable).
  drawCategoryLegend(svg, width, margin, isCompact);

  // Brush layer sits above the points so a drag draws a selection rectangle.
  const brush = d3.brush().extent([[0, 0], [innerWidth, innerHeight]]).on("end", brushEnded);

  // Group that hosts the brush overlay and handles.
  const brushG = chart.append("g").attr("class", "brush").call(brush);

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
      pinned = null;
    }
    refresh();
  }

  // Wheel-only zoom so it never fights the brush drag. Direct manipulation,
  // so the points track the cursor with no easing.
  const zoom = d3.zoom().scaleExtent([1, 12])
    .filter(() => d3.event.type === "wheel")
    .on("zoom", zoomed);

  // Attach the zoom behavior to the SVG.
  svg.call(zoom);
  svg.on("dblclick.zoom", null);

  // Double-click eases the camera back to the full view (a view transition).
  svg.on("dblclick", () => {
    svg.transition().duration(450).call(zoom.transform, d3.zoomIdentity);
  });

  function zoomed() {
    x = d3.event.transform.rescaleX(xBase);
    y = d3.event.transform.rescaleY(yBase);

    // Reposition every point under the new camera.
    points.attr("cx", d => x(d.price)).attr("cy", d => y(d.rank));

    // Rescale the price axis.
    xAxisG.call(d3.axisBottom(x).ticks(isCompact ? 4 : 6).tickFormat(money));
    // Rescale the rating axis.
    yAxisG.call(d3.axisLeft(y).ticks(5));
    // Rescale the gridlines to match.
    gridG.call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(""));

    // The brush is stored in data space, so it survives zoom: move the
    // rectangle to the new pixel coords and keep the same selection.
    if (brushDomain) {
      const [p0, p1] = brushDomain.price;
      const [r0, r1] = brushDomain.rank;
      suppressBrush = true;
      brushG.call(brush.move, [[x(p0), y(r1)], [x(p1), y(r0)]]);
      suppressBrush = false;
    }
  }

  // Reapply scatter muting + the pinned ring whenever the selection changes.
  scatterHighlight = function (sel) {
    const inSet = new Set(sel.map(d => d.id));
    points
      .classed("is-muted", d => brushDomain ? !inSet.has(d.id) : false)
      .classed("is-pinned", d => pinned !== null && d.id === pinned.id);
  };
}

// ---------------------------------------------------------------------------
// View 2 (advanced): category x skin-type matrix of MEAN RATING.
// Color and number tween on every selection change (filtering / timestep).
// Mean rating, not raw count, so the matrix reads as "how well do products
// here suit this skin type" instead of just "how many are left".
// ---------------------------------------------------------------------------
function buildHeatmap() {
  const selector = "#heatmap-chart";
  const svg = d3.select(selector);
  svg.selectAll("*").remove();

  const { width, height } = getChartBox(selector);
  const isCompact = width < 520;
  const margin = isCompact
    ? { top: 22, right: 12, bottom: 30, left: 80 }
    : { top: 28, right: 28, bottom: 52, left: 104 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  svg.attr("viewBox", `0 0 ${width} ${height}`);

  // Columns = skin types, rows = categories.
  const xScale = d3.scaleBand().domain(SKIN_TYPES).range([0, innerWidth]).padding(0.06);
  const yScale = d3.scaleBand().domain(CATEGORIES).range([0, innerHeight]).padding(0.06);

  // Plot group inset by the margins.
  const chart = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // Keyed cell list so every rect and label persists across updates.
  const cellKeys = [];
  CATEGORIES.forEach(cat => SKIN_TYPES.forEach(skin => cellKeys.push({ cat, skin })));

  // One rect per (category, skin type) cell.
  const cells = chart.selectAll("rect.heat-cell")
    .data(cellKeys, d => `${d.cat}|${d.skin}`)
    .enter()
    .append("rect")
    .attr("class", "heat-cell")
    .attr("x", d => xScale(d.skin))
    .attr("y", d => yScale(d.cat))
    .attr("width", xScale.bandwidth())
    .attr("height", yScale.bandwidth())
    .attr("fill", EMPTY_FILL)
    .attr("stroke", "#ffffff")
    .on("mouseenter", function (d) { showCellTooltip(d, this); })
    .on("mousemove", moveTooltip)
    .on("mouseleave", function () {
      d3.select(this).classed("is-active", false);
      hideTooltip();
    });

  // In-cell mean-rating labels (updated with a counting tween).
  const cellText = chart.selectAll("text.cell-count")
    .data(cellKeys, d => `${d.cat}|${d.skin}`)
    .enter()
    .append("text")
    .attr("class", "cell-count")
    .attr("x", d => xScale(d.skin) + xScale.bandwidth() / 2)
    .attr("y", d => yScale(d.cat) + yScale.bandwidth() / 2 + 4)
    .attr("text-anchor", "middle")
    .text("");

  // Bottom axis: skin types.
  chart.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale).tickSize(0));

  // Left axis: categories.
  chart.append("g").attr("class", "axis")
    .call(d3.axisLeft(yScale).tickSize(0));

  // x-axis label.
  chart.append("text").attr("class", "axis-label")
    .attr("x", innerWidth / 2).attr("y", innerHeight + (isCompact ? 22 : 34))
    .attr("text-anchor", "middle").text("Skin type");

  // y-axis label.
  chart.append("text").attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2).attr("y", -margin.left + 14)
    .attr("text-anchor", "middle").text("Product category");

  // Annotation tying the matrix to the brush.
  chart.append("text").attr("class", "annotation")
    .attr("x", 0).attr("y", -10)
    .text(isCompact ? "Mean rating in the brushed subset" : "Mean rating of products suited to each skin type, in the brushed subset; color tweens as you brush");

  // Legend group anchored under the matrix.
  const legend = svg.append("g").attr("transform", `translate(${margin.left},${height - 14})`);

  // Gradient definition for the legend swatch.
  const grad = svg.append("defs").append("linearGradient").attr("id", "heat-grad");
  // Low-rating stop (light end of the ramp).
  grad.append("stop").attr("offset", "0%").attr("stop-color", heatColor(3));
  // High-rating stop (dark end of the ramp).
  grad.append("stop").attr("offset", "100%").attr("stop-color", heatColor(5));

  // Legend swatch.
  legend.append("rect").attr("width", Math.min(150, innerWidth)).attr("height", 8)
    .attr("fill", "url(#heat-grad)");

  // Legend low label.
  legend.append("text").attr("class", "legend-label").attr("x", 0).attr("y", -4).text("rating 3");

  // Legend high label.
  legend.append("text").attr("class", "legend-label")
    .attr("x", Math.min(150, innerWidth)).attr("y", -4)
    .attr("text-anchor", "end").text("5");

  // Recompute the mean rating per cell for the selection, then tween.
  heatmapUpdate = function (sel) {
    const acc = {};
    cellKeys.forEach(k => { acc[`${k.cat}|${k.skin}`] = { sum: 0, n: 0 }; });
    sel.forEach(p => {
      SKIN_TYPES.forEach(skin => {
        if (p.skin[skin] === 1) {
          const a = acc[`${p.label}|${skin}`];
          a.sum += p.rank;
          a.n += 1;
        }
      });
    });
    const meanOf = d => {
      const a = acc[`${d.cat}|${d.skin}`];
      return a.n ? a.sum / a.n : null;
    };

    // Cells ease to the new color (filtering / timestep transition).
    cells.transition().duration(650).ease(d3.easeCubicInOut)
      .attr("fill", d => { const m = meanOf(d); return m === null ? EMPTY_FILL : heatColor(m); });

    // Labels roll to the new mean and flip to white on the dark cells.
    cellText.transition().duration(650).ease(d3.easeCubicInOut)
      .style("fill", d => { const m = meanOf(d); return m !== null && m >= 4.4 ? "#ffffff" : "#111111"; })
      .tween("text", function (d) {
        const node = this;
        const m = meanOf(d);
        if (m === null) return t => { if (t === 1) node.textContent = ""; };
        const start = parseFloat(node.textContent) || 3;
        const i = d3.interpolateNumber(start, m);
        return t => { node.textContent = oneDec(i(t)); };
      });

    // Cache count + mean for tooltips.
    cells.each(function (d) {
      const a = acc[`${d.cat}|${d.skin}`];
      d.value = a.n;
      d.mean = a.n ? a.sum / a.n : null;
    });
  };
}

// ---------------------------------------------------------------------------
// View 3 (focus): top brands by mean rating.
// Bars reorder, grow in, and shrink out on every selection change
// (ordering + filtering) with slow-in slow-out easing.
// ---------------------------------------------------------------------------
function buildBars() {
  const selector = "#bars-chart";
  const svg = d3.select(selector);
  svg.selectAll("*").remove();

  const { width, height } = getChartBox(selector);
  const isCompact = width < 520;
  const margin = isCompact
    ? { top: 18, right: 44, bottom: 32, left: 92 }
    : { top: 20, right: 64, bottom: 40, left: 150 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const topN = isCompact ? 8 : 12;
  const minSample = 3; // ignore brands with too few products to rank fairly

  svg.attr("viewBox", `0 0 ${width} ${height}`);

  // x = mean rating (0 to 5), fixed so bar length is comparable across selections.
  const xScale = d3.scaleLinear().domain([0, 5]).range([0, innerWidth]);
  const yScale = d3.scaleBand().range([0, innerHeight]).padding(0.18);

  // Plot group inset by the margins.
  const chart = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // Vertical gridlines for rating.
  chart.append("g").attr("class", "gridline")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale).ticks(5).tickSize(-innerHeight).tickFormat(""));

  // Static bottom axis: rating.
  chart.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(xScale).ticks(5));

  // Mutable left axis: brand names (re-rendered as the ranking changes).
  const yAxisG = chart.append("g").attr("class", "axis");

  // Layer holding the bars.
  const barsLayer = chart.append("g");
  // Layer holding the value labels.
  const labelLayer = chart.append("g");

  // x-axis label.
  chart.append("text").attr("class", "axis-label")
    .attr("x", innerWidth / 2).attr("y", innerHeight + (isCompact ? 26 : 34))
    .attr("text-anchor", "middle").text("Mean user rating");

  // Annotation describing the reordering animation.
  chart.append("text").attr("class", "annotation")
    .attr("x", 0).attr("y", -6)
    .text(isCompact ? `Top ${topN} brands · ≥${minSample} products` : `Brands with at least ${minSample} products in the selection, top ${topN} by mean rating; bars reorder as you brush`);

  barsUpdate = function (sel) {
    // Aggregate per brand, keep brands with enough products, rank by mean rating.
    let byBrand = d3.nest()
      .key(d => d.brand)
      .rollup(v => ({ count: v.length, meanRank: d3.mean(v, d => d.rank), meanPrice: d3.mean(v, d => d.price) }))
      .entries(sel)
      .map(e => ({ brand: e.key, count: e.value.count, meanRank: e.value.meanRank, meanPrice: e.value.meanPrice }))
      .filter(d => d.count >= minSample);

    // Tiny selections rarely clear the sample floor; fall back so the view
    // is never blank.
    if (byBrand.length === 0) {
      byBrand = d3.nest()
        .key(d => d.brand)
        .rollup(v => ({ count: v.length, meanRank: d3.mean(v, d => d.rank), meanPrice: d3.mean(v, d => d.price) }))
        .entries(sel)
        .map(e => ({ brand: e.key, count: e.value.count, meanRank: e.value.meanRank, meanPrice: e.value.meanPrice }));
    }

    byBrand = byBrand.sort((a, b) => d3.descending(a.meanRank, b.meanRank)).slice(0, topN);
    yScale.domain(byBrand.map(d => d.brand));

    const t = d3.transition().duration(720).ease(d3.easeCubicInOut);

    // Cancel any in-flight tweens so an interrupted exit can never get stuck
    // in the DOM at width 0.
    barsLayer.selectAll("rect.brand-bar").interrupt();
    labelLayer.selectAll("text.bar-value").interrupt();

    // Left axis slides its labels into the new order.
    yAxisG.transition(t).call(d3.axisLeft(yScale).tickSize(0));

    // BARS, keyed by brand for object constancy.
    const bars = barsLayer.selectAll("rect.brand-bar").data(byBrand, d => d.brand);

    // Exit: shrink to zero width, fade, then remove (filtering out).
    bars.exit().transition(t).attr("width", 0).attr("opacity", 0).remove();

    // Enter: a new bar starts collapsed at its target row.
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
    barsEnter.merge(bars).transition(t)
      .attr("y", d => yScale(d.brand))
      .attr("height", yScale.bandwidth())
      .attr("width", d => xScale(d.meanRank))
      .attr("opacity", 0.9);

    // VALUE LABELS, keyed to move with their bars (common fate).
    const labels = labelLayer.selectAll("text.bar-value").data(byBrand, d => d.brand);

    // Exit labels fade out with their bars.
    labels.exit().transition(t).attr("opacity", 0).remove();

    // Enter labels at the new row.
    const labelsEnter = labels.enter()
      .append("text")
      .attr("class", "bar-value legend-label")
      .attr("x", 4)
      .attr("y", d => yScale(d.brand) + yScale.bandwidth() / 2 + 4)
      .attr("opacity", 0);

    // Update + enter: follow the bar, show "rating · n products".
    labelsEnter.merge(labels)
      .text(d => `${oneDec(d.meanRank)} · ${d.count}`)
      .transition(t)
      .attr("x", d => xScale(d.meanRank) + 6)
      .attr("y", d => yScale(d.brand) + yScale.bandwidth() / 2 + 4)
      .attr("opacity", 1);
  };
}

// Shared category color legend used by the scatter view.
function drawCategoryLegend(svg, width, margin, isCompact) {
  // Compact screens get a single wrapped row at the top; wide screens get a
  // vertical key to the right of the plot.
  const legend = svg.append("g")
    .attr("transform", isCompact
      ? `translate(${margin.left},6)`
      : `translate(${width - margin.right + 24},${margin.top + 6})`);

  // One group (swatch + label) per category.
  const row = legend.selectAll("g")
    .data(CATEGORIES)
    .enter()
    .append("g")
    .attr("transform", (d, i) => isCompact
      ? `translate(${(i % 3) * 92},${Math.floor(i / 3) * 15})`
      : `translate(0,${i * 19})`);

  // Color swatch.
  row.append("rect")
    .attr("width", isCompact ? 9 : 11)
    .attr("height", isCompact ? 9 : 11)
    .attr("fill", d => categoryColor(d));

  // Category label.
  row.append("text")
    .attr("class", "legend-label")
    .attr("x", isCompact ? 13 : 16)
    .attr("y", isCompact ? 8 : 10)
    .text(d => d);
}

// Detail card: the focus end of the drill-down for a single pinned product.
function renderDetail() {
  if (!pinned) {
    detail.classed("is-open", false).attr("aria-hidden", "true").html("");
    return;
  }
  const fits = SKIN_TYPES.filter(s => pinned.skin[s] === 1);
  detail
    .classed("is-open", true)
    .attr("aria-hidden", "false")
    .html(
      `<button class="detail-close" aria-label="Close detail">×</button>` +
      `<p class="detail-eyebrow">${pinned.label}</p>` +
      `<p class="detail-name">${pinned.brand} — ${pinned.name}</p>` +
      `<p class="detail-stats">${money(pinned.price)} · ${oneDec(pinned.rank)}/5 rating</p>` +
      `<p class="detail-skin">Suited to: ${fits.length ? fits.join(", ") : "no skin type flagged"}</p>`
    );
  // Close button clears the pin.
  detail.select(".detail-close").on("click", () => { pinned = null; refresh(); });
}

function showProductTooltip(d) {
  tooltip
    .style("opacity", 1)
    .html(`<strong>${d.brand} — ${d.name}</strong>${d.label} · ${money(d.price)} · ${oneDec(d.rank)}/5<br>Click to pin its detail.`);
  moveTooltip();
}

function showCellTooltip(d, node) {
  d3.select(node).classed("is-active", true);
  const mean = d.mean === null || d.mean === undefined ? "no products" : `${oneDec(d.mean)}/5 over ${d.value} products`;
  tooltip
    .style("opacity", 1)
    .html(`<strong>${d.cat} · ${d.skin}</strong>Mean rating for ${d.skin.toLowerCase()} skin: ${mean}.`);
  moveTooltip();
}

function moveTooltip() {
  tooltip.style("left", `${d3.event.clientX}px`).style("top", `${d3.event.clientY}px`);
}

function hideTooltip() {
  tooltip.style("opacity", 0);
}

// Click pins (or unpins) a product and opens the detail card.
function pinProduct(d) {
  pinned = pinned && pinned.id === d.id ? null : d;
  refresh();
}
