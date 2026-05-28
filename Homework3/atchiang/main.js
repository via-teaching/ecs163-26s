// ════════════════════════════════════════════════════════════════════════════
// ECS 163 Homework 3 — Music & Mental Health Interactive Dashboard
// Interactions : (1) Brushing + click on bar chart
//                (2) Click-selection on star plot legend
// Transitions  : Filtering (opacity fade on selection change)
//                Ordering  (bar position animation on sort toggle)
// ════════════════════════════════════════════════════════════════════════════

// ── Shared state ─────────────────────────────────────────────────────────────
// selectedGenres tracks which genres are currently highlighted across all views
let selectedGenres = new Set();
let allGenres      = [];          // full sorted genre list, set after data loads
let sortMode       = "count";     // "count" | "anxiety" — bar chart sort order
let chartData      = null;        // stored so the resize handler can redraw

// ── Shared muted color palette — used by ALL three views for genre color ──────
// Desaturated to avoid clashing when polygons overlap in the star plot
const MUTED_COLORS = [
    "#7eafc4", "#f0a070", "#88bb88", "#c8a0c8",
    "#d4b86a", "#a8c8b8", "#d49090", "#9090c8",
    "#c8b870", "#90b8c8", "#b8a090", "#c8c890",
    "#a8b8d8", "#d8a8b8", "#90c8a8", "#c8b0a0"
];
// Single ordinal color scale shared across all draw functions for consistency
const genreColor = d3.scaleOrdinal().range(MUTED_COLORS);

// ── Module-level D3 selection references — set during initial draw ────────────
// Kept at module scope so onSelectionChange() can update marks without redrawing
let barRects, barXScale, barGenreData, barXAxisG;   // bar chart
let barBrush, barBrushG;                             // exposed so reset button can clear brush
let heatCells, heatRowLabels;                        // heatmap
let starPolygons, starLegendItems;                   // star plot

// ── Shared transition duration (ms) — kept consistent across all animations ──
const T_DUR = 350;

// ── Helper: measure the usable SVG area inside a flex panel ──────────────────
// SVG elements do not reliably report clientHeight when sized via flex:1.
// Instead we measure the panel container and subtract the space taken by
// its non-SVG children (h3, .subtitle) so the SVG height is always correct.
function panelInnerSize(containerId) {
    const el = document.getElementById(containerId);
    let usedH = 0;
    el.querySelectorAll("h3, .subtitle").forEach(child => {
        // getBoundingClientRect() is reliable for block children after layout
        usedH += child.getBoundingClientRect().height
               + parseFloat(getComputedStyle(child).marginBottom || 0);
    });
    return {
        W: el.clientWidth  - 20,        // 20 = panel left + right padding
        H: el.clientHeight - usedH - 16 // 16 = panel top + bottom padding
    };
}

// ════════════════════════════════════════════════════════════════════════════
// DATA LOADING
// d3.csv() fetches and parses the CSV; the .then() callback receives the row
// array and kicks off all three draw functions.
// ════════════════════════════════════════════════════════════════════════════
d3.csv("data/mxmh_survey_results.csv").then(raw => {

    // ── Coerce strings → numbers for every numeric column used ───────────
    raw.forEach(d => {
        d.Age          = +d["Age"];            // respondent age
        d.hoursPerDay  = +d["Hours per day"];  // daily listening hours
        d.anxiety      = +d["Anxiety"];        // self-reported 0–10 score
        d.depression   = +d["Depression"];
        d.insomnia     = +d["Insomnia"];
        d.ocd          = +d["OCD"];
        d.primaryGenre = d["Fav genre"];       // categorical — main grouping key
    });

    // ── Drop rows where any visualised field is missing or unparseable ────
    const data = raw.filter(d =>
        d.primaryGenre &&
        !isNaN(d.Age)      && !isNaN(d.hoursPerDay) &&
        !isNaN(d.anxiety)  && !isNaN(d.depression)  &&
        !isNaN(d.insomnia) && !isNaN(d.ocd)
    );

    // ── Derive genre list and set the shared color scale domain ──────────
    allGenres = Array.from(new Set(data.map(d => d.primaryGenre))).sort();
    genreColor.domain(allGenres); // must be set before any draw call uses it
    selectedGenres = new Set(); // empty = no filter, all genres shown at full opacity

    // ── Store data for the resize handler, then draw all three views ──────
    chartData = data;
    drawBar(data);
    drawHeatmap(data);
    drawStarPlot(data);

    // ── Sort toggle button — triggers the Ordering animated transition ────
    d3.select("#sort-btn").on("click", () => {
        sortMode = sortMode === "count" ? "anxiety" : "count";
        d3.select("#sort-btn")
            .text(sortMode === "count" ? "Sort by: Count ▾" : "Sort by: Anxiety ▾");
        applyBarSort();
    });

    // ── Reset button — restores all genres and clears the brush ──────────
    d3.select("#reset-btn").on("click", () => {
        selectedGenres = new Set(); // empty = show all
        if (barBrushG && barBrush) barBrushG.call(barBrush.move, null);
        onSelectionChange();
    });

    // ── FIX 5: Window resize handler — redraws all views on resize ────────
    // Debounced at 250ms so rapid resize events don't thrash the DOM.
    let _resizeTimer;
    window.addEventListener("resize", () => {
        clearTimeout(_resizeTimer);
        _resizeTimer = setTimeout(() => {
            // Clear all SVG contents before redrawing at new dimensions
            d3.select("#svg-bar").selectAll("*").remove();
            d3.select("#svg-heat").selectAll("*").remove();
            d3.select("#svg-star").selectAll("*").remove();
            drawBar(chartData);
            drawHeatmap(chartData);
            drawStarPlot(chartData);
        }, 250);
    });

}).catch(err => console.error("Failed to load CSV:", err));


// ════════════════════════════════════════════════════════════════════════════
// SELECTION CHANGE HANDLER
// Called whenever selectedGenres changes (brush, click, legend click, reset).
// Applies a Filtering transition — non-selected marks fade out.
//
// Selection model:
//   selectedGenres.size === 0  →  no filter; all genres shown at full opacity
//   selectedGenres.size  >  0  →  only those genres are highlighted; rest fade
// ════════════════════════════════════════════════════════════════════════════
function onSelectionChange() {
    // When nothing is explicitly selected, treat every genre as "active"
    const none = selectedGenres.size === 0;
    const active = d => none || selectedGenres.has(d);

    // Fade bars — deselected genres drop to low opacity
    barRects
        .transition().duration(T_DUR)
        .attr("opacity", d => active(d.genre) ? 1 : 0.18);

    // Fade heatmap cells — entire rows dim for non-selected genres
    heatCells
        .transition().duration(T_DUR)
        .attr("opacity", d => active(d.genre) ? 1 : 0.08);

    // Fade y-axis genre labels alongside their rows
    // (d3 axis binds the tick string value to each text node)
    heatRowLabels
        .transition().duration(T_DUR)
        .attr("opacity", d => active(d) ? 1 : 0.15);

    // Fade non-selected star polygons to near-invisible
    starPolygons
        .transition().duration(T_DUR)
        .attr("stroke-opacity", d => active(d.genre) ? 0.85 : 0.05)
        .attr("fill-opacity",   d => active(d.genre) ? 0.15 : 0);

    // Sync legend swatch + label weight with selection state
    starLegendItems.each(function(d) {
        const on = active(d.genre);
        d3.select(this).select("rect")
            .transition().duration(T_DUR)
            .attr("opacity", on ? 1 : 0.25);
        d3.select(this).select("text")
            .transition().duration(T_DUR)
            .attr("opacity",     on ? 1     : 0.35)
            .attr("font-weight", on ? "600" : "400");
    });
}


// ════════════════════════════════════════════════════════════════════════════
// VIEW 1 — BAR CHART (overview)
// Shows respondent count per genre, sorted by count or avg anxiety score.
// Interaction: d3.brushX() for range selection; narrow brush (< 6px) is
//              treated as a single-bar click to fix the event-capture bug.
// Transition:  Ordering — bars slide to new positions on sort change.
// ════════════════════════════════════════════════════════════════════════════
function drawBar(data) {
    // FIX 1: Use panelInnerSize() instead of svg.clientHeight (which returns
    // 0 on flex-1 SVGs in some browsers) to get reliable chart dimensions.
    const { W, H } = panelInnerSize("panel-bar");

    const margin = { top: 8, right: 16, bottom: 72, left: 46 };
    const iW = W - margin.left - margin.right;
    const iH = H - margin.top  - margin.bottom;

    // ── Compute count and avg anxiety per genre ───────────────────────────
    const counts = d3.rollup(data, v => v.length,                   d => d.primaryGenre);
    const avgAnx = d3.rollup(data, v => d3.mean(v, r => r.anxiety), d => d.primaryGenre);

    // barGenreData is module-level so applyBarSort() can sort and re-use it
    barGenreData = Array.from(counts, ([genre, count]) => ({
        genre,
        count,
        avgAnxiety: +avgAnx.get(genre).toFixed(2)
    })).sort((a, b) => b.count - a.count); // default: sort by count desc

    // ── Scales ───────────────────────────────────────────────────────────
    // barXScale is module-level so applyBarSort() can update its domain
    barXScale = d3.scaleBand()
        .domain(barGenreData.map(d => d.genre))
        .range([0, iW])
        .padding(0.25);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(barGenreData, d => d.count)])
        .nice()
        .range([iH, 0]);

    // ── SVG root ─────────────────────────────────────────────────────────
    const svg = d3.select("#svg-bar")
        .attr("width",  W)
        .attr("height", H);

    // Inner group offset by margins
    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // ── X axis ───────────────────────────────────────────────────────────
    // barXAxisG is module-level so applyBarSort() can re-render it
    barXAxisG = g.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${iH})`)
        .call(d3.axisBottom(barXScale));

    // Rotate and color tick labels — colored labels serve as the genre legend
    // (FIX 4: colors the x-axis tick text to match each bar, making a separate
    // legend unnecessary without consuming extra space)
    barXAxisG.selectAll("text")
        .attr("transform", "rotate(-38)")
        .attr("text-anchor", "end")
        .attr("dx", "-0.4em")
        .attr("dy", "0.3em")
        .style("fill", d => genreColor(d)); // each label tinted with its genre color

    // ── Y axis ───────────────────────────────────────────────────────────
    g.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(yScale).ticks(5));

    // ── Axis labels ──────────────────────────────────────────────────────
    // X axis label
    g.append("text")
        .attr("x", iW / 2).attr("y", iH + margin.bottom - 4)
        .attr("text-anchor", "middle").attr("font-size", 11).attr("fill", "#555")
        .text("Favorite Genre");

    // Y axis label, rotated 90°
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -iH / 2).attr("y", -34)
        .attr("text-anchor", "middle").attr("font-size", 11).attr("fill", "#555")
        .text("Respondents");

    // ── Bars ─────────────────────────────────────────────────────────────
    // barRects is module-level so onSelectionChange() can update their opacity
    barRects = g.selectAll(".bar")
        .data(barGenreData)
        .join("rect")
            .attr("class",  "bar")
            .attr("x",      d => barXScale(d.genre))
            .attr("y",      d => yScale(d.count))
            .attr("width",  barXScale.bandwidth())
            .attr("height", d => iH - yScale(d.count))
            .attr("fill",   d => genreColor(d.genre))
            .attr("rx", 2)
            .attr("opacity", 1);

    // ── Brush + click handler ─────────────────────────────────────────────
    // The brush overlay sits on top of the bars and captures all pointer events,
    // so a separate .on("click") on barRects can never fire.
    //
    // Both interactions are handled inside the brush "end" event:
    //
    //   Pure click → event.selection is null; read click x from event.sourceEvent.
    //                Toggle the clicked genre in the multi-selection. Clicking a
    //                selected genre removes it; clicking the last selected genre
    //                clears the selection (empty set = show all).
    //
    //   Slight drag (< 10px) → treat the same as a click using the midpoint.
    //
    //   Real drag (≥ 10px) → range selection: select genres whose bar center
    //                         falls inside the brush extent.

    barBrush = d3.brushX()
        .extent([[0, 0], [iW, iH]]) // constrain brush to the inner chart area
        .on("end", brushEnded);

    // barBrushG is module-level so the reset button can clear it
    barBrushG = g.append("g")
        .attr("class", "brush")
        .call(barBrush);

    function toggleGenre(genre) {
        // Add genre if not selected; remove it if already selected.
        // When the last genre is deselected, the set becomes empty which
        // means "no filter" — all genres return to full opacity.
        if (selectedGenres.has(genre)) {
            selectedGenres.delete(genre);
        } else {
            selectedGenres.add(genre);
        }
    }

    function brushEnded(event) {
        if (!event.selection) {
            // ── Pure click: event.selection is null ───────────────────────
            // Read the click position from event.sourceEvent (the raw DOM event).
            // Without sourceEvent it was a programmatic clear (e.g. reset button).
            if (event.sourceEvent) {
                const [mouseX] = d3.pointer(event.sourceEvent, g.node());
                const hit = barGenreData.find(d =>
                    mouseX >= barXScale(d.genre) &&
                    mouseX <= barXScale(d.genre) + barXScale.bandwidth()
                );
                if (hit) {
                    toggleGenre(hit.genre);
                } else {
                    // Clicked on empty space — clear the whole selection
                    selectedGenres = new Set();
                }
            } else {
                // Programmatic clear — handled by the reset button
                selectedGenres = new Set();
            }
            onSelectionChange();
            return;
        }

        const [x0, x1] = event.selection;

        // ── Slight drag (< 10px) — treat as a click ───────────────────────
        if (x1 - x0 < 10) {
            barBrushG.call(barBrush.move, null); // clear the tiny brush rectangle
            const midX = (x0 + x1) / 2;
            const hit  = barGenreData.find(d =>
                midX >= barXScale(d.genre) &&
                midX <= barXScale(d.genre) + barXScale.bandwidth()
            );
            if (hit) {
                toggleGenre(hit.genre);
            } else {
                selectedGenres = new Set();
            }
            onSelectionChange();
            return;
        }

        // ── Real drag — replace selection with genres in the brushed range ─
        selectedGenres = new Set(
            barGenreData
                .filter(d => {
                    const cx = barXScale(d.genre) + barXScale.bandwidth() / 2;
                    return cx >= x0 && cx <= x1;
                })
                .map(d => d.genre)
        );
        onSelectionChange();
    }
}


// ── Ordering transition ───────────────────────────────────────────────────────
// Animates bars and the x-axis to new positions when the sort mode changes.
// Called by the sort toggle button in the header.
function applyBarSort() {
    // Re-sort barGenreData in place based on the current sortMode
    if (sortMode === "count") {
        barGenreData.sort((a, b) => b.count      - a.count);
    } else {
        barGenreData.sort((a, b) => b.avgAnxiety - a.avgAnxiety);
    }

    // Update the x scale's domain — this moves the band positions
    barXScale.domain(barGenreData.map(d => d.genre));

    // Animate each bar sliding to its new x position
    barRects
        .transition().duration(550).ease(d3.easeCubicInOut)
        .attr("x", d => barXScale(d.genre));

    // Animate the x-axis tick labels to follow the new positions
    barXAxisG
        .transition().duration(550).ease(d3.easeCubicInOut)
        .call(d3.axisBottom(barXScale))
        .selectAll("text")
            .attr("transform", "rotate(-38)")
            .attr("text-anchor", "end")
            .attr("dx", "-0.4em")
            .attr("dy", "0.3em")
            .style("fill", d => genreColor(d)); // re-apply colored labels after axis update
}


// ════════════════════════════════════════════════════════════════════════════
// VIEW 2 — HEATMAP (context)
// Shows avg mental health score per genre × condition (4 conditions).
// Responds to brush/click in other views via onSelectionChange().
// ════════════════════════════════════════════════════════════════════════════
function drawHeatmap(data) {
    // FIX 1: reliable dimensions via panelInnerSize()
    const { W, H } = panelInnerSize("panel-heat");

    // ── Compute avg score for every (genre × condition) cell ─────────────
    const conditions = ["anxiety",   "depression", "insomnia",  "ocd"];
    const condLabels = ["Anxiety",   "Depression", "Insomnia",  "OCD"];
    const genres     = allGenres; // shared sorted genre list

    const cells = [];
    genres.forEach(genre => {
        const subset = data.filter(d => d.primaryGenre === genre);
        conditions.forEach((cond, ci) => {
            const avg = d3.mean(subset, d => d[cond]);
            cells.push({ genre, cond: condLabels[ci], value: +avg.toFixed(2) });
        });
    });

    const margin = { top: 8, right: 16, bottom: 70, left: 105 };
    const iW = W - margin.left - margin.right;
    const iH = H - margin.top  - margin.bottom;

    // ── Scales ───────────────────────────────────────────────────────────
    // Band scale maps condition labels to x columns
    const xBand = d3.scaleBand().domain(condLabels).range([0, iW]).padding(0.05);
    // Band scale maps genre names to y rows
    const yBand = d3.scaleBand().domain(genres).range([0, iH]).padding(0.05);

    // Sequential color: low avg score (0) = light yellow, high (10) = deep red
    const heatColor = d3.scaleSequential()
        .domain([0, 10])
        .interpolator(d3.interpolateYlOrRd);

    // ── SVG root ─────────────────────────────────────────────────────────
    const svg = d3.select("#svg-heat")
        .attr("width",  W)
        .attr("height", H);

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // ── X axis — condition names along the bottom ─────────────────────────
    g.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${iH})`)
        .call(d3.axisBottom(xBand));

    // ── Y axis — genre names on the left ─────────────────────────────────
    const yAxisG = g.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(yBand));

    // heatRowLabels references the y-axis text nodes; used in onSelectionChange()
    // to fade labels of deselected genres. d3 axis binds the tick value (genre
    // string) to each text node, so selectedGenres.has(d) works correctly.
    heatRowLabels = yAxisG.selectAll("text");

    // ── Axis labels ──────────────────────────────────────────────────────
    // X axis label
    g.append("text")
        .attr("x", iW / 2).attr("y", iH + margin.bottom - 6)
        .attr("text-anchor", "middle").attr("font-size", 11).attr("fill", "#555")
        .text("Mental Health Condition");

    // Y axis label, rotated
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -iH / 2).attr("y", -92)
        .attr("text-anchor", "middle").attr("font-size", 11).attr("fill", "#555")
        .text("Favorite Genre");

    // ── Heatmap cells — one rect per (genre × condition) pair ────────────
    // heatCells is module-level so onSelectionChange() can animate opacity
    heatCells = g.selectAll(".heat-cell")
        .data(cells)
        .join("rect")
            .attr("class",  "heat-cell")
            .attr("x",      d => xBand(d.cond))
            .attr("y",      d => yBand(d.genre))
            .attr("width",  xBand.bandwidth())
            .attr("height", yBand.bandwidth())
            .attr("fill",   d => heatColor(d.value))
            .attr("opacity", 1);

    // ── Cell value labels — avg score printed inside each cell ────────────
    g.selectAll(".cell-label")
        .data(cells)
        .join("text")
            .attr("class", "cell-label")
            .attr("x", d => xBand(d.cond)  + xBand.bandwidth() / 2)
            .attr("y", d => yBand(d.genre) + yBand.bandwidth() / 2)
            .attr("fill", d => d.value > 6 ? "#fff" : "#333") // contrast switch
            .text(d => d.value);

    // ── Color legend — gradient bar at the bottom ─────────────────────────
    const legendW = Math.min(iW, 180);
    const legendG = svg.append("g")
        .attr("transform", `translate(${margin.left},${H - 28})`);

    // Define a horizontal linear gradient using the same heatColor scale
    const defs   = svg.append("defs");
    const gradId = "heatGrad";
    const grad   = defs.append("linearGradient").attr("id", gradId);
    grad.selectAll("stop")
        .data(d3.range(0, 1.01, 0.1))
        .join("stop")
        .attr("offset",     d => `${d * 100}%`)
        .attr("stop-color", d => heatColor(d * 10));

    // Gradient-filled rectangle for the color legend
    legendG.append("rect")
        .attr("width", legendW).attr("height", 10)
        .style("fill", `url(#${gradId})`);

    // Legend endpoint labels
    legendG.append("text").attr("x", 0).attr("y", 22)
        .attr("font-size", 10).attr("fill", "#555").text("0 — Low");
    legendG.append("text").attr("x", legendW).attr("y", 22)
        .attr("font-size", 10).attr("text-anchor", "end").attr("fill", "#555").text("10 — High");
    legendG.append("text").attr("x", legendW / 2).attr("y", 22)
        .attr("font-size", 10).attr("text-anchor", "middle").attr("fill", "#555").text("Avg Score");
}


// ════════════════════════════════════════════════════════════════════════════
// VIEW 3 — STAR / RADAR PLOT (focus · advanced visualization)
// Overlaid radar chart with 6 axes:
//   Anxiety, Depression, Insomnia, OCD, Age, Hrs/Day
// Each axis has its own scale (per-axis domain) so mixed units are correct.
// Interaction: clicking a legend item toggles that genre in selectedGenres.
// ════════════════════════════════════════════════════════════════════════════
function drawStarPlot(data) {
    // FIX 1: reliable dimensions via panelInnerSize()
    const { W, H } = panelInnerSize("panel-star");

    // ── Axis definitions — label, data key, and domain for each spoke ────
    // Age and hoursPerDay use data-driven ceilings so the scale is honest
    const axes = [
        { key: "anxiety",     label: "Anxiety",    domain: [0, 10] },
        { key: "depression",  label: "Depression", domain: [0, 10] },
        { key: "insomnia",    label: "Insomnia",   domain: [0, 10] },
        { key: "ocd",         label: "OCD",        domain: [0, 10] },
        { key: "Age",         label: "Age",
          domain: [0, Math.ceil(d3.max(data, d => d.Age) / 10) * 10] },
        { key: "hoursPerDay", label: "Hrs/Day",
          domain: [0, Math.ceil(d3.max(data, d => d.hoursPerDay))] },
    ];
    const numAxes = axes.length;

    // ── Compute per-genre average value for every axis ────────────────────
    const genreAvgs = allGenres.map(genre => {
        const subset = data.filter(d => d.primaryGenre === genre);
        const vals   = axes.map(ax => d3.mean(subset, d => d[ax.key]));
        return { genre, vals };
    });

    // ── Layout: reserve the right side for the genre legend ──────────────
    const legendW = 125;
    const margin  = { top: 28, right: legendW + 12, bottom: 16, left: 28 };
    const plotW   = W - margin.left - margin.right;
    const plotH   = H - margin.top  - margin.bottom;
    const cx      = plotW / 2;  // radar center x within the inner plot area
    const cy      = plotH / 2;  // radar center y
    const radius  = Math.min(cx, cy) * 0.76; // outer radius of the radar

    // ── Per-axis radial scales ────────────────────────────────────────────
    // Each axis maps its own domain → [0, radius].
    // Without per-axis scales, Age (0–80) and Hrs/Day (0–24) would produce
    // misleadingly long spokes compared to the 0–10 condition axes.
    const axisScales = axes.map(ax =>
        d3.scaleLinear().domain(ax.domain).range([0, radius]).clamp(true)
    );

    // ── Angle of each axis spoke (evenly distributed, first axis at top) ──
    const angleOf = i => (i / numAxes) * 2 * Math.PI - Math.PI / 2;

    // ── Helper: value array → SVG polygon point list ──────────────────────
    function radarPoints(vals) {
        return vals.map((v, i) => {
            const r   = axisScales[i](v);        // pixel radius for this value
            const ang = angleOf(i);               // angle for this axis
            return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
        });
    }

    // ── SVG root ─────────────────────────────────────────────────────────
    const svg = d3.select("#svg-star")
        .attr("width",  W)
        .attr("height", H);

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // ── Background grid circles — 5 evenly-spaced dashed reference rings ──
    const levels = 5;
    d3.range(1, levels + 1).forEach(lvl => {
        g.append("circle")
            .attr("cx", cx).attr("cy", cy)
            .attr("r", radius * lvl / levels)
            .attr("fill", "none")
            .attr("stroke", "#ddd")
            .attr("stroke-dasharray", "3,3");
    });

    // ── Axis spokes + labels ──────────────────────────────────────────────
    axes.forEach((ax, i) => {
        const ang  = angleOf(i);
        const tipX = cx + radius * Math.cos(ang);
        const tipY = cy + radius * Math.sin(ang);

        // Spoke line from the center out to the tip
        g.append("line")
            .attr("x1", cx).attr("y1", cy)
            .attr("x2", tipX).attr("y2", tipY)
            .attr("stroke", "#ccc").attr("stroke-width", 1);

        // Position axis label just beyond the spoke tip
        const pad = 16;
        const lx  = cx + (radius + pad) * Math.cos(ang);
        const ly  = cy + (radius + pad) * Math.sin(ang);

        // text-anchor depends on which side of the center the label falls
        const anchor = Math.abs(Math.cos(ang)) < 0.15 ? "middle"
                     : Math.cos(ang) > 0               ? "start"
                     : "end";

        // Axis name label (e.g., "Anxiety", "Age")
        g.append("text")
            .attr("x", lx).attr("y", ly - 5)
            .attr("text-anchor", anchor)
            .attr("dominant-baseline", "central")
            .attr("font-size", 10).attr("font-weight", "600").attr("fill", "#444")
            .text(ax.label);

        // Max-value annotation below the name so the reader knows each axis scale
        g.append("text")
            .attr("x", lx).attr("y", ly + 7)
            .attr("text-anchor", anchor)
            .attr("dominant-baseline", "central")
            .attr("font-size", 9).attr("fill", "#999")
            .text(`max: ${ax.domain[1]}`);
    });

    // ── Genre polygons ────────────────────────────────────────────────────
    // One polygon per genre, all overlaid on the same radar.
    // starPolygons is module-level so onSelectionChange() can animate opacity.
    starPolygons = g.selectAll(".radar-poly")
        .data(genreAvgs)
        .join("polygon")
            .attr("class",         "radar-poly")
            .attr("points",        d => radarPoints(d.vals).join(" "))
            .attr("fill",          d => genreColor(d.genre))
            .attr("fill-opacity",  0)    // transparent by default; shown on select/hover
            .attr("stroke",        d => genreColor(d.genre))
            .attr("stroke-width",  1.6)
            .attr("stroke-opacity", 0.6)
            .style("cursor", "pointer");

    // ── Polygon hover — temporary highlight without changing selection ─────
    starPolygons
        .on("mouseover", (event, d) => {
            // Only skip hover if there IS an active selection and this genre is
            // not in it. When nothing is selected (size === 0) all polygons are
            // active, so hover should work on all of them.
            if (selectedGenres.size > 0 && !selectedGenres.has(d.genre)) return;
            d3.select(event.currentTarget)
                .attr("fill-opacity",   0.28)
                .attr("stroke-width",   2.8)
                .attr("stroke-opacity", 1);
        })
        .on("mouseout", (event, d) => {
            // Restore to the correct resting state for this genre:
            //   nothing selected  → fill: 0,    stroke-opacity: 0.6  (all visible equally)
            //   this genre active → fill: 0.15, stroke-opacity: 0.85 (highlighted)
            //   this genre dimmed → fill: 0,    stroke-opacity: 0.05 (faded)
            const isActive = selectedGenres.size === 0 || selectedGenres.has(d.genre);
            d3.select(event.currentTarget)
                .attr("fill-opacity",   isActive && selectedGenres.size > 0 ? 0.15 : 0)
                .attr("stroke-width",   1.6)
                .attr("stroke-opacity", isActive ? (selectedGenres.size > 0 ? 0.85 : 0.6) : 0.05);
        });

    // ── Legend ────────────────────────────────────────────────────────────
    const legendG = svg.append("g")
        .attr("transform", `translate(${margin.left + plotW + 12}, ${margin.top})`);

    // Legend heading
    legendG.append("text")
        .attr("x", 0).attr("y", -8)
        .attr("font-size", 11).attr("font-weight", "700").attr("fill", "#333")
        .text("Genre");

    // Instruction hint below the heading
    legendG.append("text")
        .attr("x", 0).attr("y", 4)
        .attr("font-size", 9).attr("fill", "#999")
        .text("(click to select)");

    // One row per genre — starLegendItems is module-level for onSelectionChange()
    starLegendItems = legendG.selectAll(".legend-item")
        .data(genreAvgs)
        .join("g")
            .attr("class", "legend-item")
            .attr("transform", (d, i) => `translate(0, ${16 + i * 15})`)
            .style("cursor", "pointer");

    // Color swatch rectangle
    starLegendItems.append("rect")
        .attr("width", 10).attr("height", 10).attr("y", -1)
        .attr("fill", d => genreColor(d.genre))
        .attr("rx", 2);

    // Genre name text label
    starLegendItems.append("text")
        .attr("class", "legend-label")
        .attr("x", 14).attr("y", 8)
        .attr("fill", "#333").attr("font-size", 10)
        .text(d => d.genre);

    // ── Legend click — Selection interaction ──────────────────────────────
    // Clicking adds a genre to the selection; clicking again removes it.
    // When the selection is empty all genres return to full opacity.
    starLegendItems.on("click", (event, d) => {
        if (selectedGenres.has(d.genre)) {
            selectedGenres.delete(d.genre); // deselect — removes from highlight
        } else {
            selectedGenres.add(d.genre);    // select — adds to highlight
        }
        onSelectionChange();
    });
}
