// ── Data loading ────────────────────────────────────────────────────────────
d3.csv("data/mxmh_survey_results.csv").then(raw => {

    // Parse numeric fields
    raw.forEach(d => {
        d.Age             = +d["Age"];
        d.hoursPerDay     = +d["Hours per day"];
        d.anxiety         = +d["Anxiety"];
        d.depression      = +d["Depression"];
        d.insomnia        = +d["Insomnia"];
        d.ocd             = +d["OCD"];
        d.primaryGenre    = d["Fav genre"];
    });

    const data = raw.filter(d =>
        d.primaryGenre &&
        !isNaN(d.Age) && !isNaN(d.hoursPerDay) &&
        !isNaN(d.anxiety) && !isNaN(d.depression) &&
        !isNaN(d.insomnia) && !isNaN(d.ocd)
    );

    // Shared color scale — built once so bar chart and star plot map the same
    // genre to the same color, letting readers cross-reference across views
    const genres = Array.from(new Set(data.map(d => d.primaryGenre))).sort();
    const mutedColors = [
        "#7eafc4", "#f0a070", "#88bb88", "#c8a0c8",
        "#d4b86a", "#a8c8b8", "#d49090", "#9090c8",
        "#c8b870", "#90b8c8", "#b8a090", "#c8c890",
        "#a8b8d8", "#d8a8b8", "#90c8a8", "#c8b0a0"
    ];
    const genreColorScale = d3.scaleOrdinal().domain(genres).range(mutedColors);

    function render() {
        // Clear all SVGs before redrawing so elements don't stack on resize
        d3.select("#svg-bar").selectAll("*").remove();
        d3.select("#svg-heat").selectAll("*").remove();
        d3.select("#svg-pcp").selectAll("*").remove();

        drawBar(data, genreColorScale);
        drawHeatmap(data);
        drawStarPlot(data, genreColorScale);
    }

    render();

    // Debounced resize handler — redraws all views after the window settles
    let resizeTimer;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(render, 200);
    });

}).catch(err => console.error("Could not load CSV:", err));


// ── View 1: Bar chart (overview / context) ───────────────────────────────────
function drawBar(data, genreColorScale) {
    const container = document.getElementById("panel-bar");
    const titleH    = container.querySelector("h3").getBoundingClientRect().height;
    const W = container.clientWidth  - 20;
    const H = container.clientHeight - titleH - 20;

    const margin = { top: 10, right: 20, bottom: 80, left: 50 };
    const iW = W - margin.left - margin.right;
    const iH = H - margin.top  - margin.bottom;

    // Root SVG sized to fill the panel
    const svg = d3.select("#svg-bar")
        .attr("width",  W)
        .attr("height", H);

    // Translate group applies the margin offset so axes sit inside the plot area
    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Count respondents per genre and sort descending so the most-represented genres appear first
    const counts = d3.rollup(data, v => v.length, d => d.primaryGenre);
    const genreData = Array.from(counts, ([genre, count]) => ({ genre, count }))
                          .sort((a, b) => b.count - a.count);

    // Horizontal band scale — one band per genre, with padding between bars
    const x = d3.scaleBand()
        .domain(genreData.map(d => d.genre))
        .range([0, iW])
        .padding(0.25);

    // Vertical linear scale — maps respondent count to pixel height, 0 at bottom
    const y = d3.scaleLinear()
        .domain([0, d3.max(genreData, d => d.count)])
        .nice()
        .range([iH, 0]);

    // Use the shared genreColorScale so bar colors match the star plot legend
    const color = genreColorScale;

    // Bottom axis — genre labels rotated to prevent overlap
    g.append("g").attr("class", "axis")
        .attr("transform", `translate(0,${iH})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
            .attr("transform", "rotate(-40)")
            .attr("text-anchor", "end")
            .attr("dx", "-0.5em")
            .attr("dy", "0.3em");

    // Left axis — respondent count tick marks
    g.append("g").attr("class", "axis")
        .call(d3.axisLeft(y).ticks(6));

    // X-axis title centered below the genre labels
    g.append("text")
        .attr("x", iW / 2).attr("y", iH + margin.bottom - 5)
        .attr("text-anchor", "middle").attr("font-size", 11)
        .text("Favorite Genre");

    // Y-axis title rotated 90° so it reads upward alongside the left axis
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -iH / 2).attr("y", -38)
        .attr("text-anchor", "middle").attr("font-size", 11)
        .text("Number of Respondents");

    // Color legend note — the x-axis label beneath each bar already names its genre,
    // so the color swatch is redundant; this note clarifies cross-view consistency
    g.append("text")
        .attr("x", iW).attr("y", -2)
        .attr("text-anchor", "end")
        .attr("font-size", 9)
        .attr("fill", "#888")
        .attr("font-style", "italic")
        .text("Color matches star plot legend");

    // One rect per genre — height encodes count, fill encodes genre identity
    g.selectAll("rect").data(genreData).join("rect")
        .attr("x",      d => x(d.genre))
        .attr("y",      d => y(d.count))
        .attr("width",  x.bandwidth())
        .attr("height", d => iH - y(d.count))
        .attr("fill",   d => color(d.genre))
        .attr("rx", 2); // slight rounding for visual polish
}


// ── View 2: Heatmap (context) ────────────────────────────────────────────────
function drawHeatmap(data) {
    const container = document.getElementById("panel-heat");
    const titleH    = container.querySelector("h3").getBoundingClientRect().height;
    const W = container.clientWidth  - 20;
    const H = container.clientHeight - titleH - 20;

    const conditions = ["anxiety", "depression", "insomnia", "ocd"];
    const condLabels  = ["Anxiety", "Depression", "Insomnia", "OCD"];

    const genres = Array.from(new Set(data.map(d => d.primaryGenre))).sort();

    // Compute avg score per (genre, condition) pair — one cell value per matrix entry
    const cells = [];
    genres.forEach(genre => {
        const subset = data.filter(d => d.primaryGenre === genre);
        conditions.forEach((cond, ci) => {
            const avg = d3.mean(subset, d => d[cond]);
            cells.push({ genre, cond: condLabels[ci], value: +avg.toFixed(2) });
        });
    });

    // bottom margin reserves space for axis tick labels (~22px), axis title (~18px),
    // a small gap, and the gradient legend bar + labels (~35px)
    const margin = { top: 10, right: 20, bottom: 95, left: 110 };
    const iW = W - margin.left - margin.right;
    const iH = H - margin.top  - margin.bottom;

    // Root SVG sized to fill the panel
    const svg = d3.select("#svg-heat")
        .attr("width",  W)
        .attr("height", H);

    // Translate group applies the margin offset
    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Horizontal band scale — one band per condition column
    const x = d3.scaleBand().domain(condLabels).range([0, iW]).padding(0.05);

    // Vertical band scale — one band per genre row
    const y = d3.scaleBand().domain(genres).range([0, iH]).padding(0.05);

    // Sequential color scale — maps avg score (0–10) to yellow→orange→red
    const colorScale = d3.scaleSequential()
        .domain([0, 10])
        .interpolator(d3.interpolateYlOrRd);

    // Bottom axis — condition names along the x axis
    g.append("g").attr("class", "axis")
        .attr("transform", `translate(0,${iH})`)
        .call(d3.axisBottom(x));

    // Left axis — genre names along the y axis
    g.append("g").attr("class", "axis")
        .call(d3.axisLeft(y));

    // X-axis title — positioned 24px below the axis line, well above the legend
    g.append("text")
        .attr("x", iW / 2).attr("y", iH + 24)
        .attr("text-anchor", "middle").attr("font-size", 11)
        .text("Mental Health Condition");

    // Y-axis title rotated so it reads upward alongside the genre labels
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -iH / 2).attr("y", -95)
        .attr("text-anchor", "middle").attr("font-size", 11)
        .text("Favorite Genre");

    // Matrix cells — one rect per (genre, condition) pair; fill encodes avg score
    g.selectAll("rect").data(cells).join("rect")
        .attr("x",      d => x(d.cond))
        .attr("y",      d => y(d.genre))
        .attr("width",  x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("fill",   d => colorScale(d.value));

    // Numeric value labels centered inside each cell for precise reading
    g.selectAll(".cell-label").data(cells).join("text")
        .attr("class", "cell-label")
        .attr("x", d => x(d.cond)  + x.bandwidth() / 2)
        .attr("y", d => y(d.genre) + y.bandwidth() / 2)
        .text(d => d.value);

    // ── Color legend ──
    const legendW = Math.min(iW, 200);

    // Container group for the gradient bar and its labels — anchored 48px below
    // the bottom axis line so it sits within the margin regardless of panel height
    const legendG = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top + iH + 52})`);

    // SVG defs block holds the reusable gradient definition
    const defs = svg.append("defs");
    const gradId = "heatGrad";

    // Linear gradient definition — sampled at 11 evenly spaced stops across the color scale
    const grad = defs.append("linearGradient").attr("id", gradId);
    grad.selectAll("stop")
        .data(d3.range(0, 1.01, 0.1))
        .join("stop")
        .attr("offset",     d => `${d * 100}%`)
        .attr("stop-color", d => colorScale(d * 10));

    // Gradient bar rect — filled via the linearGradient defined above
    legendG.append("rect")
        .attr("width", legendW).attr("height", 10)
        .style("fill", `url(#${gradId})`);

    // Low-end label at the left of the gradient bar
    legendG.append("text").attr("x", 0).attr("y", 22)
        .attr("font-size", 10).text("0 (Low)");

    // High-end label at the right of the gradient bar
    legendG.append("text").attr("x", legendW).attr("y", 22)
        .attr("font-size", 10).attr("text-anchor", "end").text("10 (High)");

    // Center label clarifying the gradient represents average score
    legendG.append("text").attr("x", legendW / 2).attr("y", 22)
        .attr("font-size", 10).attr("text-anchor", "middle").text("Avg Score");
}


// ── View 3: Star / Radar Plot (focused) ─────────────────────────────
function drawStarPlot(data, genreColorScale) {
    const container = document.getElementById("panel-pcp");
    const titleH    = container.querySelector("h3").getBoundingClientRect().height;
    const W = container.clientWidth  - 20;
    const H = container.clientHeight - titleH - 20;

    // 6 axes: 4 mental-health scores + Age + Hrs/Day — makes this view a full
    // listener profile rather than a duplicate of the heatmap's condition summary
    const axes    = ["Anxiety", "Depression", "Insomnia", "OCD", "Age", "Hrs/Day"];
    const keys    = ["anxiety", "depression", "insomnia", "ocd", "Age", "hoursPerDay"];
    const numAxes = axes.length;

    // Per-axis maximum — conditions are 0-10; Age and hoursPerDay use data-driven max
    // so each spoke spans its natural range rather than a shared scale
    const axisMaxes = [
        10, 10, 10, 10,
        Math.ceil(d3.max(data, d => d.Age) / 10) * 10,
        Math.ceil(d3.max(data, d => d.hoursPerDay))
    ];

    const genres = Array.from(new Set(data.map(d => d.primaryGenre))).sort();
    // Use the shared color scale so star plot strokes match bar chart fill colors
    const color  = genreColorScale;

    // Compute per-genre averages for all 6 axes
    const genreAvgs = genres.map(genre => {
        const subset = data.filter(d => d.primaryGenre === genre);
        const vals   = keys.map(k => d3.mean(subset, d => d[k]));
        return { genre, vals };
    });

    // Layout — reserve right side for legend
    const legendW  = 130;
    const margin   = { top: 30, right: legendW + 10, bottom: 20, left: 30 };
    const plotW    = W - margin.left - margin.right;
    const plotH    = H - margin.top  - margin.bottom;
    const cx       = plotW / 2;
    const cy       = plotH / 2;
    const radius   = Math.min(cx, cy) * 0.82;

    // Root SVG sized to fill the panel
    const svg = d3.select("#svg-pcp")
        .attr("width",  W)
        .attr("height", H);

    // Translate group centers the radar plot within the margin
    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // One radial scale per axis — each maps [0, axisMax] → [0, radius]
    // so the spoke tip always represents 100% of that variable's range
    const rScales = axisMaxes.map(maxVal =>
        d3.scaleLinear().domain([0, maxVal]).range([0, radius])
    );

    // Evenly distributes axes around the full circle; offset by -π/2 puts axis 0 at the top
    const angleSlice = (2 * Math.PI) / numAxes;
    function angleOf(i) { return i * angleSlice - Math.PI / 2; }

    // ── Grid circles — rings at 20 % intervals of each axis's range ──
    const levels = 5;
    d3.range(1, levels + 1).forEach(lvl => {
        // Concentric dashed ring — provides a scale reference without cluttering the polygons
        g.append("circle")
            .attr("cx", cx).attr("cy", cy)
            .attr("r", radius * lvl / levels)
            .attr("fill", "none")
            .attr("stroke", "#ccc")
            .attr("stroke-dasharray", "3,3");
    });

    // "100%" label near the outermost ring tells readers the rim = each axis's max value
    g.append("text")
        .attr("x", cx + 4)
        .attr("y", cy - radius + 3)
        .attr("font-size", 8)
        .attr("fill", "#aaa")
        .text("100%");

    // ── Axis spokes, labels, and per-axis max annotation ──
    axes.forEach((label, i) => {
        const angle = angleOf(i);
        const x2    = cx + radius * Math.cos(angle);
        const y2    = cy + radius * Math.sin(angle);

        // Spoke line from center out to the axis tip
        g.append("line")
            .attr("x1", cx).attr("y1", cy)
            .attr("x2", x2).attr("y2", y2)
            .attr("stroke", "#bbb").attr("stroke-width", 1);

        // Axis name — placed just beyond the spoke tip; anchor flips based on side of chart
        const labelR = radius + 14;
        const lx = cx + labelR * Math.cos(angle);
        const ly = cy + labelR * Math.sin(angle);
        const anchor = Math.abs(Math.cos(angle)) < 0.1 ? "middle"
                     : Math.cos(angle) > 0 ? "start" : "end";

        g.append("text")
            .attr("x", lx).attr("y", ly)
            .attr("text-anchor", anchor)
            .attr("dominant-baseline", "central")
            .attr("font-size", 11)
            .attr("font-weight", "600")
            .attr("fill", "#333")
            .text(label);

        // Per-axis max annotation — clarifies the absolute scale since axes use different ranges
        const maxLabelR = radius + 26;
        const mlx = cx + maxLabelR * Math.cos(angle);
        const mly = cy + maxLabelR * Math.sin(angle);

        g.append("text")
            .attr("x", mlx).attr("y", mly + 11)
            .attr("text-anchor", anchor)
            .attr("dominant-baseline", "central")
            .attr("font-size", 8)
            .attr("fill", "#aaa")
            .text(`(0–${axisMaxes[i]})`);
    });

    // Converts a genre's avg-value array into (x, y) polygon vertices using per-axis scales
    function radarPoints(vals) {
        return vals.map((v, i) => {
            const angle = angleOf(i);
            return [
                cx + rScales[i](v) * Math.cos(angle),
                cy + rScales[i](v) * Math.sin(angle)
            ];
        });
    }

    // One polygon per genre — fill is transparent by default, revealed on hover to reduce clutter
    const polygons = g.selectAll(".radar-poly")
        .data(genreAvgs)
        .join("polygon")
            .attr("class", "radar-poly")
            .attr("points", d => radarPoints(d.vals).join(" "))
            .attr("fill",         d => color(d.genre))
            .attr("fill-opacity", 0)    // transparent until hovered so overlapping shapes stay readable
            .attr("stroke",       d => color(d.genre))
            .attr("stroke-width", 1.8)
            .attr("stroke-opacity", 0.55)
            .style("cursor", "pointer");

    // Brings the hovered genre forward: fills its polygon and fades all others
    function highlight(genre) {
        polygons
            .attr("fill-opacity",    d => d.genre === genre ? 0.25 : 0)
            .attr("stroke-opacity",  d => d.genre === genre ? 1    : 0.18)
            .attr("stroke-width",    d => d.genre === genre ? 2.8  : 1.8);

        // Mirror highlight in the legend so the selected genre stands out there too
        legendItems.selectAll("rect")
            .attr("opacity", d => d.genre === genre ? 1 : 0.35);
        legendItems.selectAll("text")
            .attr("font-weight", d => d.genre === genre ? "700" : "400")
            .attr("fill",        d => d.genre === genre ? "#111" : "#555");
    }

    // Restores all polygons and legend items to their default un-highlighted state
    function resetHighlight() {
        polygons
            .attr("fill-opacity",   0)
            .attr("stroke-opacity", 0.55)
            .attr("stroke-width",   1.8);

        legendItems.selectAll("rect").attr("opacity", 1);
        legendItems.selectAll("text")
            .attr("font-weight", "400")
            .attr("fill", "#333");
    }

    // Attach hover events to each polygon so hovering one isolates it visually
    polygons
        .on("mouseover", (event, d) => highlight(d.genre))
        .on("mouseout",  resetHighlight);

    // ── Legend — positioned to the right of the radar plot ──
    const legendG = svg.append("g")
        .attr("transform", `translate(${margin.left + plotW + 10}, ${margin.top})`);

    // Legend title above the genre list
    legendG.append("text")
        .attr("x", 0).attr("y", -8)
        .attr("font-size", 11).attr("font-weight", "600").attr("fill", "#333")
        .text("Genre");

    // Dynamic row height — shrinks when panel height is small so all 16 genres stay visible
    // clamp between 11px (minimum readable) and 16px (comfortable)
    const legendItemH = Math.max(11, Math.min(16, Math.floor((H - margin.top - 20) / genres.length)));
    // Scale font size down proportionally when rows are compressed
    const legendFontSize = legendItemH <= 12 ? 9 : 10;

    // One legend row per genre — hovering a row triggers the same highlight as the polygon
    const legendItems = legendG.selectAll(".legend-item")
        .data(genreAvgs)
        .join("g")
            .attr("class", "legend-item")
            .attr("transform", (d, i) => `translate(0, ${i * legendItemH})`)
            .style("cursor", "pointer")
            .on("mouseover", (event, d) => highlight(d.genre))
            .on("mouseout",  resetHighlight);

    // Color swatch matching the polygon stroke for this genre
    legendItems.append("rect")
        .attr("width", 9).attr("height", 9).attr("y", -1)
        .attr("fill", d => color(d.genre))
        .attr("rx", 2);

    // Genre name label to the right of the swatch
    legendItems.append("text")
        .attr("class", "legend-label")
        .attr("x", 13).attr("y", legendItemH * 0.65)
        .attr("font-size", legendFontSize)
        .attr("fill", "#333")
        .text(d => d.genre);
}
