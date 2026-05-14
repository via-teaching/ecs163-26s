// ── Canonical Pokémon type colors used across all three views ──
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

// ── Shared application state ──
// All three views read from this object so filter changes propagate everywhere.
const state = {
  data:         [],   // full dataset, never mutated after load
  filtered:     [],   // subset currently shown in scatter + PCP (equals data when no filter)
  selectedType: null  // null = "show all types"; string = active type filter
};

// ── Cache header badge elements once; they never change after page load ──
const badgeEl = document.getElementById("filter-badge");
const labelEl = document.getElementById("filter-label");

// ── Stub update functions replaced in later sections ──
function updateScatter() {}
function updatePCP()     {}

// ── updateAll: recomputes state.filtered then refreshes every view ──
function updateAll() {
  // Filter the full dataset down to the selected type, or use everything
  state.filtered = state.selectedType
    ? state.data.filter(d => d.Type_1 === state.selectedType)
    : state.data;

  updateScatter();
  updatePCP();
  updateBarHighlight();

  // Show or hide the active-type badge in the header
  if (state.selectedType) {
    labelEl.textContent = state.selectedType;
    badgeEl.classList.remove("hidden");
  } else {
    badgeEl.classList.add("hidden");
  }
}

document.getElementById("clear-filter-btn").addEventListener("click", () => {
  state.selectedType = null;
  updateAll();
});

// ════════════════════════════════════════════════════════════
// VIEW 1 — Bar Chart (Overview / Context)
// Shows count of Pokémon per primary type across the full
// dataset. Clicking a bar activates a type filter that
// updates the scatter plot and parallel coordinates plot.
// ════════════════════════════════════════════════════════════

// Module-level references to bar chart elements that
// updateBarHighlight() needs to access after initial render.
let barSvg, barXScale, barYScale, barInnerW, barInnerH, barMargin;

function drawBar() {
  const container = document.getElementById("chart-bar");

  // Measure the panel so the SVG fills it exactly
  const { width, height } = container.getBoundingClientRect();
  barMargin = { top: 20, right: 16, bottom: 110, left: 50 };
  barInnerW  = width  - barMargin.left - barMargin.right;
  barInnerH  = height - barMargin.top  - barMargin.bottom;

  // Count Pokémon per primary type using d3.rollup,
  // then convert the Map to a sorted array (most → fewest)
  const typeCounts = Array.from(
    d3.rollup(state.data, v => v.length, d => d.Type_1),
    ([type, count]) => ({ type, count })
  ).sort((a, b) => b.count - a.count);

  // ── Scales ──

  // Band scale maps each type name to an x position
  barXScale = d3.scaleBand()
    .domain(typeCounts.map(d => d.type))
    .range([0, barInnerW])
    .padding(0.25);

  // Linear scale maps count values to vertical pixel positions
  barYScale = d3.scaleLinear()
    .domain([0, d3.max(typeCounts, d => d.count)])
    .range([barInnerH, 0])
    .nice();

  // ── SVG root ──

  // Remove any previous render (e.g. on window resize)
  d3.select("#chart-bar svg").remove();

  // Append the SVG canvas inside the panel
  barSvg = d3.select("#chart-bar")
    .append("svg")
    .attr("width",  width)
    .attr("height", height - 28) // subtract panel title height
    .append("g")
    .attr("transform", `translate(${barMargin.left},${barMargin.top})`);

  // ── X axis ──

  // Bottom axis using the band scale; labels rotated 45° to avoid overlap
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

  // X axis label
  barSvg.append("text")
    .attr("class", "axis-label")
    .attr("x", barInnerW / 2)
    .attr("y", barInnerH + barMargin.bottom - 4)
    .attr("text-anchor", "middle")
    .text("Primary Type");

  // ── Y axis ──

  // Left axis with gridlines extending the full inner width
  barSvg.append("g")
    .attr("class", "y-axis")
    .call(
      d3.axisLeft(barYScale)
        .ticks(6)
        .tickSize(-barInnerW)   // gridlines reach across the chart
    )
    .call(g => g.select(".domain").remove()) // remove the axis spine
    .call(g => g.selectAll(".tick line")
      .style("stroke", "#2e3148")
      .style("stroke-dasharray", "3,3"));

  // Y axis label (rotated, sitting to the left of the axis)
  barSvg.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -(barInnerH / 2))
    .attr("y", -38)
    .attr("text-anchor", "middle")
    .text("Number of Pokémon");

  // ── Bars ──

  // One rect per type, filled with the canonical type color
  barSvg.selectAll("rect.bar")
    .data(typeCounts)
    .join("rect")
      .attr("class", "bar")
      .attr("x",      d => barXScale(d.type))
      .attr("y",      d => barYScale(d.count))
      .attr("width",  barXScale.bandwidth())
      .attr("height", d => barInnerH - barYScale(d.count))
      .attr("fill",   d => TYPE_COLORS[d.type] || "#888")
      .attr("rx", 2)  // slight rounding on bar corners
      .style("cursor", "pointer")
      // Click toggles the type filter on/off
      .on("click", (event, d) => {
        state.selectedType = state.selectedType === d.type ? null : d.type;
        updateAll();
      });

  // ── Count labels on top of each bar ──

  // Small number showing the exact count above each bar
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

  // Apply highlight state immediately in case a filter is already active
  updateBarHighlight();
}

// ── updateBarHighlight: dims non-selected bars, outlines the active one ──
// Called by updateAll() every time the filter changes.
function updateBarHighlight() {
  if (!barSvg) return; // chart not yet drawn

  barSvg.selectAll("rect.bar")
    .transition().duration(300)
    // Full opacity for selected (or all when no filter); dimmed otherwise
    .attr("opacity", d =>
      !state.selectedType || d.type === state.selectedType ? 1 : 0.25
    )
    // White outline on the active bar to indicate selection
    .attr("stroke",       d => d.type === state.selectedType ? "#fff" : "none")
    .attr("stroke-width", d => d.type === state.selectedType ? 2 : 0);
}

// ════════════════════════════════════════════════════════════
// Data load + init
// ════════════════════════════════════════════════════════════

d3.csv("data/pokemon.csv").then(rawData => {

  // Convert numeric columns from CSV strings to JavaScript numbers.
  // D3 parses every CSV field as a string by default.
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

    // Convert "True"/"False" string to a real boolean
    d.isLegendary = d.isLegendary.toLowerCase() === "true";
  });

  state.data     = rawData;
  state.filtered = rawData;

  // Draw all views
  drawBar();

}).catch(err => console.error("Failed to load pokemon.csv:", err));
