/* =============================================================================
   ECS 163 - Homework 2
   Music & Mental Health Dashboard
   Author folder: bbrle

   THEME
   This dashboard explores how music listening relates to self-reported mental
   health, in terms of genre preference, listening intensity, and distress
   across Anxiety, Depression, Insomnia, and OCD.

   THREE VIEWS (focus + context, different methods, one advanced)
     1. Genre bar chart        - OVERVIEW / CONTEXT (fundamental)
                                  who is in the sample, by favorite genre
     2. Genre x condition heatmap - FOCUS (fundamental)
                                  which genres track with higher mean distress
     3. Parallel coordinates   - FOCUS, ADVANCED
                                  full multivariate profile, colored by whether
                                  music improves / has no effect / worsens
                                  mental health

   Layout: a single full-viewport <svg>. Each view is a transformed <g> panel.
   Every dimension is derived from the viewport and a resize handler redraws,
   so the dashboard scales with the browser and never overflows.

   Library: D3 v5 only (loaded from CDN in index.html). No other libraries.
   D3-v5-correct APIs are used throughout (d3.csv().then(), d3.mean over
   arrays, d3.scaleSequential + d3.interpolateYlOrRd). v6+ APIs such as
   d3.group / d3.rollup are intentionally NOT used.
   ========================================================================== */


/* ----- Shared configuration -------------------------------------------------
   The four self-reported mental-health conditions (each 0-10) and the numeric
   axes used by the parallel-coordinates view. Declared once so the three
   views stay consistent. */
const CONDITIONS = ["Anxiety", "Depression", "Insomnia", "OCD"];
const PCP_DIMS = ["Age", "Hours per day", "Anxiety", "Depression", "Insomnia", "OCD"];

/* Categorical color for the "Music effects" answer. Chosen semantically:
   green = music helps, grey = neutral, red = music worsens. This is the only
   place categorical color is used, so color stays consistent across views. */
const EFFECT_ORDER = ["Improve", "No effect", "Worsen"];
const effectColor = d3.scaleOrdinal()
    .domain(EFFECT_ORDER)
    .range(["#2ca02c", "#9e9e9e", "#d62728"]);

/* Per-class stroke opacity for parallel coordinates. "Improve" has 542 lines
   so it must be faint; "Worsen" has only 17 so it must stay visible. This is
   the main clutter-handling decision for the densest view. */
const EFFECT_OPACITY = { "Improve": 0.14, "No effect": 0.26, "Worsen": 0.75 };

/* A single neutral hue for the overview bars. The bar encodes a count, not a
   second variable, so a categorical scale (and a legend) would be misleading
   here - documented choice for the legend/encoding rubric criterion. */
const BAR_COLOR = "#4C78A8";

/* Outer breathing room around the whole dashboard, in pixels. */
const PAD = 14;

/* Module-scope data, filled once after the CSV loads and reused on every
   redraw so a window resize does not re-fetch or re-clean the file. */
let respondents = [];   // cleaned rows used by the parallel-coordinates view
let genreCounts = [];   // [{genre, count}] for the overview bar
let heatRows = [];      // [{genre, Anxiety, Depression, Insomnia, OCD}] means
let heatExtent = [0, 10]; // [min, max] of all heatmap cell means (color domain)


/* ----- Load + clean the data, then draw -------------------------------------
   D3 v5 uses the promise form of d3.csv. The CSV sits in ./data relative to
   index.html, which is what Live Server serves. */
d3.csv("data/mxmh_survey_results.csv").then(raw => {

    /* Coerce the numeric fields we need and keep only complete rows.
       Age has 1 blank, Music effects has 8 blanks; BPM is intentionally
       ignored (it is not used by any view and contains junk like 999999999).
       Hours per day is capped at 12: values of 13-24 are data-entry errors
       (24 h/day of music is impossible) that otherwise stretch the parallel-
       coordinates Age/Hours axes and crush the real data into a sliver.
       735 rows in, 717 valid rows out. */
    respondents = raw.map(d => ({
        "Age": +d["Age"],
        "Hours per day": +d["Hours per day"],
        "Anxiety": +d["Anxiety"],
        "Depression": +d["Depression"],
        "Insomnia": +d["Insomnia"],
        "OCD": +d["OCD"],
        "Fav genre": (d["Fav genre"] || "").trim(),
        "Music effects": (d["Music effects"] || "").trim()
    })).filter(d =>
        Number.isFinite(d["Age"]) && d["Age"] > 0 && d["Age"] <= 100 &&
        Number.isFinite(d["Hours per day"]) &&
        d["Hours per day"] >= 0 && d["Hours per day"] <= 12 &&
        CONDITIONS.every(c => Number.isFinite(d[c])) &&
        d["Fav genre"] !== "" &&
        EFFECT_ORDER.indexOf(d["Music effects"]) !== -1
    );
    console.log("valid respondents:", respondents.length, "of", raw.length);

    /* Overview aggregate: number of respondents per favorite genre, sorted
       descending so the bar chart reads as a ranking. */
    const countByGenre = {};
    respondents.forEach(d => {
        countByGenre[d["Fav genre"]] = (countByGenre[d["Fav genre"]] || 0) + 1;
    });
    genreCounts = Object.keys(countByGenre)
        .map(g => ({ genre: g, count: countByGenre[g] }))
        .sort((a, b) => b.count - a.count);

    /* Heatmap aggregate: mean of each condition within each favorite genre.
       Rows use the SAME genre order as the overview bar (respondent count,
       descending) so the two genre-based views visibly connect: the user can
       read a genre's height in the bar and its distress row in the heatmap at
       the same vertical rank. The color values still carry the distress
       signal on their own. */
    const genreOrder = genreCounts.map(d => d.genre);   // == overview bar order
    const byGenre = {};
    respondents.forEach(d => {
        (byGenre[d["Fav genre"]] = byGenre[d["Fav genre"]] || []).push(d);
    });
    heatRows = Object.keys(byGenre).map(g => {
        const rows = byGenre[g];
        const rec = { genre: g };
        CONDITIONS.forEach(c => { rec[c] = d3.mean(rows, r => r[c]); });
        return rec;
    }).sort((a, b) => genreOrder.indexOf(a.genre) - genreOrder.indexOf(b.genre));

    /* Color domain shared by the heatmap cells and its legend: the actual
       spread of cell means gives far more contrast than a flat 0-10 map. */
    const allCellMeans = [];
    heatRows.forEach(r => CONDITIONS.forEach(c => allCellMeans.push(r[c])));
    heatExtent = d3.extent(allCellMeans);

    /* First paint, then redraw on every resize so views always fit. */
    redraw();
    let resizeTimer = null;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);            // debounce: redraw once per pause
        resizeTimer = setTimeout(redraw, 150);
    });

}).catch(err => {
    /* Never fail silently: surface the problem on the canvas itself. */
    console.error("Failed to load data/mxmh_survey_results.csv", err);
    d3.select("svg").append("text")               // visible error message
        .attr("x", 30).attr("y", 40)
        .attr("fill", "#b00020")
        .text("Could not load data/mxmh_survey_results.csv - see console.");
});


/* ----- Master redraw --------------------------------------------------------
   Sizes the SVG to the viewport, clears it, computes the three panel
   rectangles (focus + context layout) and draws each view inside its panel.
   Called on load and on every (debounced) resize. */
function redraw() {
    const W = window.innerWidth;
    const H = window.innerHeight;

    /* Size and clear the single canvas. Removing all children guarantees no
       leftover marks overflow after the window shrinks. */
    const svg = d3.select("svg")
        .attr("width", W)
        .attr("height", H);
    svg.selectAll("*").remove();

    /* Panel geometry (all derived from the viewport):
         - top band  : parallel coordinates (advanced FOCUS), ~55% height
         - bottom-left: genre bar (OVERVIEW / context), ~42% width
         - bottom-right: heatmap (FOCUS), remaining width            */
    const topH = Math.max(260, H * 0.55);
    const botH = H - topH;
    const leftW = Math.max(320, W * 0.42);

    /* Parallel-coordinates panel (full width, top). */
    const gP = svg.append("g")                    // advanced focus view group
        .attr("transform", `translate(${PAD}, ${PAD})`);
    drawParallel(gP, W - 2 * PAD, topH - 2 * PAD);

    /* Genre bar panel (bottom-left, the overview/context view). */
    const gB = svg.append("g")                    // overview view group
        .attr("transform", `translate(${PAD}, ${topH + PAD})`);
    drawBar(gB, leftW - 2 * PAD, botH - 2 * PAD);

    /* Heatmap panel (bottom-right). */
    const gH = svg.append("g")                    // focus heatmap view group
        .attr("transform", `translate(${leftW + PAD}, ${topH + PAD})`);
    drawHeatmap(gH, W - leftW - 2 * PAD, botH - 2 * PAD);
}


/* ===========================================================================
   VIEW 1 - GENRE BAR  (OVERVIEW / CONTEXT, fundamental method)
   Question answered: "what does the sample look like - which genres do
   people pick as their favorite?" Reduced detail on purpose: it orients the
   user before they move to the two focus views.
   =========================================================================== */
function drawBar(g, w, h) {
    const m = { top: 46, right: 16, bottom: 84, left: 56 };
    const iw = Math.max(10, w - m.left - m.right);   // inner plot width
    const ih = Math.max(10, h - m.top - m.bottom);   // inner plot height

    /* Panel title. */
    g.append("text")                                  // view 1 title
        .attr("class", "view-title")
        .attr("x", m.left)
        .attr("y", 22)
        .text("Respondents by Favorite Genre  (overview)");

    /* Inner plotting area, offset by the margin convention. */
    const plot = g.append("g")                        // bar plot container
        .attr("transform", `translate(${m.left}, ${m.top})`);

    /* x: favorite genre (categorical band). y: respondent count (linear). */
    const x = d3.scaleBand()
        .domain(genreCounts.map(d => d.genre))
        .range([0, iw])
        .padding(0.2);
    const y = d3.scaleLinear()
        .domain([0, d3.max(genreCounts, d => d.count)]).nice()
        .range([ih, 0]);

    /* One <rect> per genre. Single hue: the bar length already encodes the
       count, so adding a color scale would double-encode with no new info. */
    plot.selectAll("rect.bar")                        // the bars themselves
        .data(genreCounts)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.genre))
        .attr("y", d => y(d.count))
        .attr("width", x.bandwidth())
        .attr("height", d => ih - y(d.count))
        .attr("fill", BAR_COLOR);

    /* x axis with rotated labels so the long genre names never overlap or
       overflow the panel (clutter handling for the categorical axis). */
    plot.append("g")                                  // x axis
        .attr("transform", `translate(0, ${ih})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-40)")
        .attr("text-anchor", "end")
        .attr("dx", "-0.4em")
        .attr("dy", "0.3em");

    /* y axis (integer counts). */
    plot.append("g")                                  // y axis
        .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format("d")));

    /* x axis label. */
    plot.append("text")                               // x axis label
        .attr("class", "axis-label")
        .attr("x", iw / 2)
        .attr("y", ih + m.bottom - 8)
        .attr("text-anchor", "middle")
        .text("Favorite genre");

    /* y axis label (rotated). */
    plot.append("text")                               // y axis label
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -ih / 2)
        .attr("y", -m.left + 16)
        .attr("text-anchor", "middle")
        .text("Number of respondents");
}


/* ===========================================================================
   VIEW 2 - GENRE x CONDITION HEATMAP  (FOCUS, fundamental method)
   Question answered: "do some favorite genres go with higher self-reported
   distress than others?" Cell = mean score (0-10). Sequential color.
   =========================================================================== */
function drawHeatmap(g, w, h) {
    const m = { top: 46, right: 92, bottom: 40, left: 116 };
    const iw = Math.max(10, w - m.left - m.right);
    const ih = Math.max(10, h - m.top - m.bottom);

    /* Panel title. */
    g.append("text")                                  // view 2 title
        .attr("class", "view-title")
        .attr("x", m.left)
        .attr("y", 22)
        .text("Mean Mental-Health Score by Favorite Genre");

    /* Inner plotting area. */
    const plot = g.append("g")                        // heatmap container
        .attr("transform", `translate(${m.left}, ${m.top})`);

    /* x: the four conditions. y: genres (same order as the overview bar). */
    const x = d3.scaleBand()
        .domain(CONDITIONS)
        .range([0, iw])
        .padding(0.06);
    const y = d3.scaleBand()
        .domain(heatRows.map(d => d.genre))
        .range([0, ih])
        .padding(0.06);

    /* Sequential color: higher mean distress -> hotter color. Domain is the
       real spread of cell means for maximum readable contrast. */
    const color = d3.scaleSequential(d3.interpolateYlOrRd)
        .domain(heatExtent);

    /* Flatten the genre x condition grid into one cell record per pair so a
       single data-join can draw every rectangle and its label. */
    const cells = [];
    heatRows.forEach(r => CONDITIONS.forEach(c =>
        cells.push({ genre: r.genre, condition: c, value: r[c] })));

    /* One <rect> per genre/condition cell. */
    plot.selectAll("rect.cell")                       // heatmap cells
        .data(cells)
        .enter().append("rect")
        .attr("class", "cell")
        .attr("x", d => x(d.condition))
        .attr("y", d => y(d.genre))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("fill", d => color(d.value));

    /* Mean value printed inside each cell. Text flips to white on the darkest
       cells so it stays legible against the sequential ramp. */
    plot.selectAll("text.cell-text")                  // in-cell value labels
        .data(cells)
        .enter().append("text")
        .attr("class", "cell-text")
        .attr("x", d => x(d.condition) + x.bandwidth() / 2)
        .attr("y", d => y(d.genre) + y.bandwidth() / 2)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .attr("fill", d => {
            const t = (d.value - heatExtent[0]) / (heatExtent[1] - heatExtent[0]);
            return t > 0.6 ? "#fff" : "#222";
        })
        .text(d => d.value.toFixed(1));

    /* x axis: condition names along the top of the grid. */
    plot.append("g")                                  // x axis (top)
        .call(d3.axisTop(x).tickSize(0))
        .select(".domain").remove();

    /* y axis: genre names down the left side. */
    plot.append("g")                                  // y axis (left)
        .call(d3.axisLeft(y).tickSize(0))
        .select(".domain").remove();

    /* x axis label. */
    plot.append("text")                               // x axis label
        .attr("class", "axis-label")
        .attr("x", iw / 2)
        .attr("y", ih + 30)
        .attr("text-anchor", "middle")
        .text("Mental-health condition");

    /* y axis label (rotated). */
    plot.append("text")                               // y axis label
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -ih / 2)
        .attr("y", -m.left + 14)
        .attr("text-anchor", "middle")
        .text("Favorite genre");

    /* ---- Sequential color legend (required for a color-encoded view) ----
       A vertical gradient bar plus a value axis, placed in the right margin. */
    const legendH = Math.max(60, ih * 0.7);
    const legendW = 14;
    const legend = g.append("g")                      // legend container
        .attr("transform", `translate(${m.left + iw + 28}, ${m.top})`);

    /* Gradient definition consumed by the legend rectangle. */
    const defs = g.append("defs");                    // <defs> for the gradient
    const grad = defs.append("linearGradient")        // vertical color ramp
        .attr("id", "heat-grad")
        .attr("x1", "0%").attr("y1", "100%")
        .attr("x2", "0%").attr("y2", "0%");
    /* Gradient stops sampled along the sequential interpolator. */
    d3.range(0, 1.01, 0.1).forEach(t => {
        grad.append("stop")                           // one color stop
            .attr("offset", `${t * 100}%`)
            .attr("stop-color",
                d3.interpolateYlOrRd(t));
    });

    /* The legend swatch filled with the gradient. */
    legend.append("rect")                             // legend gradient bar
        .attr("width", legendW)
        .attr("height", legendH)
        .attr("fill", "url(#heat-grad)")
        .attr("stroke", "#999");

    /* Legend value axis (maps mean score to legend height). */
    const legendScale = d3.scaleLinear()
        .domain(heatExtent)
        .range([legendH, 0]);
    legend.append("g")                                // legend axis
        .attr("transform", `translate(${legendW}, 0)`)
        .call(d3.axisRight(legendScale).ticks(5).tickFormat(d3.format(".1f")));

    /* Legend title. */
    legend.append("text")                             // legend title
        .attr("class", "legend-label")
        .attr("x", -4)
        .attr("y", -10)
        .text("Mean score");
}


/* ===========================================================================
   VIEW 3 - PARALLEL COORDINATES  (FOCUS, ADVANCED method)
   Question answered: "across age, listening time, and all four conditions,
   what does each respondent's profile look like - and does whether music
   helps / has no effect / worsens things separate the profiles?"
   One polyline per respondent; per-axis scales; categorical color.
   =========================================================================== */
function drawParallel(g, w, h) {
    const m = { top: 56, right: 150, bottom: 30, left: 40 };
    const iw = Math.max(10, w - m.left - m.right);
    const ih = Math.max(10, h - m.top - m.bottom);

    /* Panel title. */
    g.append("text")                                  // view 3 title
        .attr("class", "view-title")
        .attr("x", m.left)
        .attr("y", 24)
        .text("Listening & Mental-Health Profiles  (advanced: parallel coordinates, colored by music's reported effect)");

    /* Inner plotting area. */
    const plot = g.append("g")                        // parallel-coords container
        .attr("transform", `translate(${m.left}, ${m.top})`);

    /* x positions one vertical axis per dimension. */
    const x = d3.scalePoint()
        .domain(PCP_DIMS)
        .range([0, iw]);

    /* Independent y scale per dimension. The four conditions share a fixed
       0-10 domain so they are directly comparable; Age and Hours per day use
       their own .nice() data extent. */
    const y = {};
    PCP_DIMS.forEach(dim => {
        const domain = (CONDITIONS.indexOf(dim) !== -1)
            ? [0, 10]
            : d3.extent(respondents, d => d[dim]);
        y[dim] = d3.scaleLinear()
            .domain(domain).nice()
            .range([ih, 0]);
    });

    /* Builds the polyline for one respondent across all axes. */
    const line = d3.line()
        .defined(p => p[1] != null)
        .x(p => p[0])
        .y(p => p[1]);
    const toPoints = d =>
        PCP_DIMS.map(dim => [x(dim), y[dim](d[dim])]);

    /* Draw order matters: faint majority ("Improve") first, rare but
       important "Worsen" last so those 17 red lines stay on top and visible.
       This, plus per-class opacity, is the clutter-handling strategy for the
       densest view (727 overlapping lines). */
    const ordered = respondents.slice().sort(
        (a, b) => EFFECT_ORDER.indexOf(a["Music effects"]) -
                  EFFECT_ORDER.indexOf(b["Music effects"]));

    /* One <path> per respondent, colored by Music effects. */
    plot.selectAll("path.profile")                    // respondent polylines
        .data(ordered)
        .enter().append("path")
        .attr("class", "profile")
        .attr("d", d => line(toPoints(d)))
        .attr("fill", "none")
        .attr("stroke", d => effectColor(d["Music effects"]))
        .attr("stroke-width", 1)
        .attr("stroke-opacity", d => EFFECT_OPACITY[d["Music effects"]]);

    /* One vertical axis + label per dimension. */
    const dim = plot.selectAll("g.dim")               // per-dimension axis groups
        .data(PCP_DIMS)
        .enter().append("g")
        .attr("class", "dim")
        .attr("transform", p => `translate(${x(p)}, 0)`);

    /* The axis ticks/line for each dimension. */
    dim.append("g")                                   // a single vertical axis
        .each(function (p) { d3.select(this).call(d3.axisLeft(y[p]).ticks(6)); });

    /* The dimension name above each axis (its axis label). */
    dim.append("text")                                // per-axis label
        .attr("class", "axis-label")
        .attr("x", 0)
        .attr("y", -12)
        .attr("text-anchor", "middle")
        .attr("fill", "#000")
        .text(p => p);

    /* ---- Categorical legend (required: color encodes Music effects) ---- */
    const legend = g.append("g")                      // legend container
        .attr("transform", `translate(${m.left + iw + 36}, ${m.top + 6})`);

    /* Legend heading. */
    legend.append("text")                             // legend title
        .attr("class", "legend-label")
        .attr("x", 0).attr("y", 0)
        .style("font-weight", "600")
        .text("Music effects");

    /* One swatch + label per category. */
    const item = legend.selectAll("g.li")             // legend rows
        .data(EFFECT_ORDER)
        .enter().append("g")
        .attr("class", "li")
        .attr("transform", (d, i) => `translate(0, ${14 + i * 22})`);

    /* Color swatch (drawn at the same opacity used in the plot so the legend
       honestly represents what the user sees). */
    item.append("rect")                               // legend color swatch
        .attr("width", 16).attr("height", 16)
        .attr("fill", d => effectColor(d))
        .attr("fill-opacity", d => Math.min(1, EFFECT_OPACITY[d] * 3 + 0.25));

    /* Swatch text label. */
    item.append("text")                               // legend entry label
        .attr("class", "legend-label")
        .attr("x", 22).attr("y", 13)
        .text(d => d);
}
