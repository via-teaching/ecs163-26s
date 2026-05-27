// ECS 163 HW3 - Music & Mental Health dashboard
// Extends HW2 with bar-click selection, PCP axis brushing, and animated
// filter/sort transitions. D3 v5 only.

const CONDITIONS = ["Anxiety", "Depression", "Insomnia", "OCD"];
const PCP_DIMS = ["Age", "Hours per day", "Anxiety", "Depression", "Insomnia", "OCD"];

const EFFECT_ORDER = ["Improve", "No effect", "Worsen"];
const effectColor = d3.scaleOrdinal()
    .domain(EFFECT_ORDER)
    .range(["#2ca02c", "#9e9e9e", "#d62728"]);

// Per-class opacity for lines that pass the filter. Class-balanced
// because Improve has 540+ rows and Worsen only ~17.
const EFFECT_OPACITY = { "Improve": 0.20, "No effect": 0.32, "Worsen": 0.85 };
const OUT_OPACITY = 0.025;

const BAR_SHELL = "#cfd8e3";
const BAR_FILL  = "#4C78A8";
const BAR_FADED = "#dfe5ec";
const NO_DATA   = "#eeeeee";

const PAD = 14;
const HEADER_H = 32;
const ANIM_MS = 650;
const ANIM_EASE = d3.easeCubicInOut;

let respondents = [];
let genreCounts = [];
let genreOrder = [];

let selectedGenres = new Set();
let axisBrushes = {};
let sortKey = null;
let sortDir = "desc";

let updateBar, updateHeatmap, updatePCP, updateHeader;
let pcpBrushes = {};


d3.csv("data/mxmh_survey_results.csv").then(raw => {

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
        // cap hrs/day at 12, 24h/day of music is a data-entry error
        Number.isFinite(d["Age"]) && d["Age"] > 0 && d["Age"] <= 100 &&
        Number.isFinite(d["Hours per day"]) &&
        d["Hours per day"] >= 0 && d["Hours per day"] <= 12 &&
        CONDITIONS.every(c => Number.isFinite(d[c])) &&
        d["Fav genre"] !== "" &&
        EFFECT_ORDER.indexOf(d["Music effects"]) !== -1
    );

    const cnt = {};
    respondents.forEach(d => { cnt[d["Fav genre"]] = (cnt[d["Fav genre"]] || 0) + 1; });
    genreCounts = Object.keys(cnt)
        .map(g => ({ genre: g, count: cnt[g] }))
        .sort((a, b) => b.count - a.count);
    genreOrder = genreCounts.map(d => d.genre);

    redraw();
    let t = null;
    window.addEventListener("resize", () => {
        clearTimeout(t);
        t = setTimeout(redraw, 150);
    });
    window.addEventListener("keydown", e => { if (e.key === "Escape") resetAll(); });

}).catch(err => {
    console.error("csv load failed", err);
    d3.select("svg").append("text")
        .attr("x", 30).attr("y", 40).attr("fill", "#b00020")
        .text("Could not load data/mxmh_survey_results.csv");
});


function inFilter(d) {
    if (selectedGenres.size > 0 && !selectedGenres.has(d["Fav genre"])) return false;
    for (const dim in axisBrushes) {
        const [lo, hi] = axisBrushes[dim];
        if (d[dim] < lo || d[dim] > hi) return false;
    }
    return true;
}

function countsByGenre() {
    const out = {};
    genreOrder.forEach(g => { out[g] = 0; });
    respondents.forEach(d => { if (inFilter(d)) out[d["Fav genre"]]++; });
    return out;
}

function heatRows() {
    const buckets = {};
    genreOrder.forEach(g => { buckets[g] = []; });
    respondents.forEach(d => { if (inFilter(d)) buckets[d["Fav genre"]].push(d); });
    return genreOrder.map(g => {
        const rec = { genre: g, n: buckets[g].length };
        CONDITIONS.forEach(c => {
            rec[c] = buckets[g].length ? d3.mean(buckets[g], r => r[c]) : null;
        });
        return rec;
    });
}

function sortedOrder(rows) {
    if (!sortKey) return genreOrder.slice();
    const v = {};
    rows.forEach(r => { v[r.genre] = r[sortKey]; });
    return genreOrder.slice().sort((a, b) => {
        const va = v[a], vb = v[b];
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        return sortDir === "desc" ? vb - va : va - vb;
    });
}


function toggleGenre(g) {
    if (selectedGenres.has(g)) selectedGenres.delete(g);
    else selectedGenres.add(g);
    applyFilters();
}

function setBrush(dim, range) {
    if (range == null) delete axisBrushes[dim];
    else axisBrushes[dim] = range;
    applyFilters();
}

function setSort(key) {
    if (sortKey === key) {
        if (sortDir === "desc") sortDir = "asc";
        else { sortKey = null; sortDir = "desc"; }
    } else {
        sortKey = key;
        sortDir = "desc";
    }
    applyFilters();
}

function resetAll() {
    selectedGenres = new Set();
    axisBrushes = {};
    sortKey = null;
    sortDir = "desc";
    Object.keys(pcpBrushes).forEach(dim => {
        const { brush, group } = pcpBrushes[dim];
        group.call(brush.move, null);
    });
    applyFilters();
}

function applyFilters() {
    if (updateHeader) updateHeader();
    if (updateBar) updateBar();
    if (updateHeatmap) updateHeatmap();
    if (updatePCP) updatePCP();
}


function redraw() {
    const W = window.innerWidth, H = window.innerHeight;
    const svg = d3.select("svg").attr("width", W).attr("height", H);
    svg.selectAll("*").remove();

    const gHdr = svg.append("g").attr("transform", `translate(${PAD}, ${PAD})`);
    drawHeader(gHdr, W - 2 * PAD, HEADER_H);

    const innerTop = PAD + HEADER_H + 4;
    const innerH = H - innerTop - PAD;
    const topH = Math.max(260, innerH * 0.52);
    const botH = innerH - topH;
    const leftW = Math.max(320, W * 0.42);

    const gP = svg.append("g").attr("transform", `translate(${PAD}, ${innerTop})`);
    drawParallel(gP, W - 2 * PAD, topH);

    const gB = svg.append("g").attr("transform", `translate(${PAD}, ${innerTop + topH})`);
    drawBar(gB, leftW - 2 * PAD, botH);

    const gH = svg.append("g").attr("transform", `translate(${leftW + PAD}, ${innerTop + topH})`);
    drawHeatmap(gH, W - leftW - 2 * PAD, botH);

    applyFilters();
}


// header
function drawHeader(g, w, h) {
    g.append("text")
        .attr("class", "view-title")
        .attr("x", 0).attr("y", 18)
        .text("Music & Mental Health Dashboard (HW3)");

    const status = g.append("text")
        .attr("class", "view-subtitle")
        .attr("x", 0).attr("y", 30);

    const bw = 96, bh = 22;
    const btn = g.append("g")
        .attr("class", "reset-btn")
        .attr("transform", `translate(${w - bw}, 4)`)
        .on("click", resetAll);
    btn.append("rect")
        .attr("width", bw).attr("height", bh).attr("rx", 4).attr("ry", 4)
        .attr("fill", "#f3f4f6").attr("stroke", "#c7cbd1");
    btn.append("text")
        .attr("x", bw / 2).attr("y", bh / 2 + 4)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Reset filters (Esc)");

    updateHeader = function () {
        const parts = [];
        if (selectedGenres.size > 0) parts.push("genre: " + Array.from(selectedGenres).join(", "));
        const bk = Object.keys(axisBrushes);
        if (bk.length > 0) {
            parts.push("brush: " + bk.map(k => {
                const [lo, hi] = axisBrushes[k];
                return k + " [" + lo.toFixed(1) + "-" + hi.toFixed(1) + "]";
            }).join(", "));
        }
        if (sortKey) parts.push("sort: " + sortKey + " " + sortDir);
        const n = respondents.filter(inFilter).length;
        const head = n + " / " + respondents.length + " respondents";
        status.text(parts.length ? head + " - " + parts.join("  ") : head + " - no filters");
    };
}


// bar chart (overview + selection)
function drawBar(g, w, h) {
    const m = { top: 46, right: 16, bottom: 84, left: 56 };
    const iw = Math.max(10, w - m.left - m.right);
    const ih = Math.max(10, h - m.top - m.bottom);

    g.append("text")
        .attr("class", "view-title")
        .attr("x", m.left).attr("y", 22)
        .text("Respondents by Favorite Genre (overview)");

    const plot = g.append("g").attr("transform", `translate(${m.left}, ${m.top})`);
    const x = d3.scaleBand().range([0, iw]).padding(0.2);
    const y = d3.scaleLinear()
        .domain([0, d3.max(genreCounts, d => d.count)]).nice()
        .range([ih, 0]);

    const xAxisG = plot.append("g").attr("transform", `translate(0, ${ih})`);
    plot.append("g").call(d3.axisLeft(y).ticks(6).tickFormat(d3.format("d")));

    // shell = total per genre, fill = focused count
    const shells = plot.selectAll("rect.shell")
        .data(genreCounts, d => d.genre)
        .enter().append("rect")
        .attr("class", "shell")
        .attr("y", d => y(d.count))
        .attr("height", d => ih - y(d.count))
        .attr("fill", BAR_SHELL)
        .attr("pointer-events", "none");

    const fills = plot.selectAll("rect.bar")
        .data(genreCounts, d => d.genre)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("y", d => y(d.count))
        .attr("height", d => ih - y(d.count))
        .attr("fill", BAR_FILL)
        .on("click", d => toggleGenre(d.genre));

    plot.append("text").attr("class", "axis-label")
        .attr("x", iw / 2).attr("y", ih + m.bottom - 8)
        .attr("text-anchor", "middle").text("Favorite genre");
    plot.append("text").attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -ih / 2).attr("y", -m.left + 16)
        .attr("text-anchor", "middle").text("Number of respondents");

    updateBar = function () {
        const order = sortedOrder(heatRows());
        const cnt = countsByGenre();
        x.domain(order);

        xAxisG.transition().duration(ANIM_MS).ease(ANIM_EASE)
            .call(d3.axisBottom(x))
            .selection().selectAll("text")
            .attr("transform", "rotate(-40)")
            .attr("text-anchor", "end")
            .attr("dx", "-0.4em").attr("dy", "0.3em");

        shells.transition().duration(ANIM_MS).ease(ANIM_EASE)
            .attr("x", d => x(d.genre))
            .attr("width", x.bandwidth());

        fills.transition().duration(ANIM_MS).ease(ANIM_EASE)
            .attr("x", d => x(d.genre))
            .attr("width", x.bandwidth())
            .attr("y", d => y(cnt[d.genre]))
            .attr("height", d => ih - y(cnt[d.genre]))
            .attr("fill", d => {
                if (selectedGenres.size === 0) return BAR_FILL;
                return selectedGenres.has(d.genre) ? BAR_FILL : BAR_FADED;
            })
            .attr("stroke", d => selectedGenres.has(d.genre) ? "#1f3a5f" : "none")
            .attr("stroke-width", d => selectedGenres.has(d.genre) ? 2 : 0);
    };
}


// heatmap (focus + sort)
function drawHeatmap(g, w, h) {
    const m = { top: 60, right: 92, bottom: 40, left: 116 };
    const iw = Math.max(10, w - m.left - m.right);
    const ih = Math.max(10, h - m.top - m.bottom);

    g.append("text").attr("class", "view-title")
        .attr("x", m.left).attr("y", 22)
        .text("Mean Mental-Health Score by Favorite Genre");
    g.append("text").attr("class", "view-subtitle")
        .attr("x", m.left).attr("y", 38)
        .text("click a column header to sort by that condition");

    const plot = g.append("g").attr("transform", `translate(${m.left}, ${m.top})`);
    const x = d3.scaleBand().domain(CONDITIONS).range([0, iw]).padding(0.06);
    const y = d3.scaleBand().domain(genreOrder).range([0, ih]).padding(0.06);

    // fix color domain to the unfiltered extent so individual cell shifts
    // show up as real brightness moves
    const all = [];
    heatRows().forEach(r => CONDITIONS.forEach(c => { if (r[c] != null) all.push(r[c]); }));
    const ext = d3.extent(all);
    const color = d3.scaleSequential(d3.interpolateYlOrRd).domain(ext);

    const cells = [];
    genreOrder.forEach(gn => CONDITIONS.forEach(c =>
        cells.push({ genre: gn, condition: c, value: null, n: 0 })));

    const cellSel = plot.selectAll("rect.cell")
        .data(cells, d => d.genre + "|" + d.condition)
        .enter().append("rect")
        .attr("class", "cell")
        .attr("x", d => x(d.condition))
        .attr("y", d => y(d.genre))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("fill", NO_DATA);

    const cellText = plot.selectAll("text.cell-text")
        .data(cells, d => d.genre + "|" + d.condition)
        .enter().append("text")
        .attr("class", "cell-text")
        .attr("x", d => x(d.condition) + x.bandwidth() / 2)
        .attr("y", d => y(d.genre) + y.bandwidth() / 2)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central");

    const headers = plot.selectAll("g.col-header")
        .data(CONDITIONS)
        .enter().append("g")
        .attr("class", "col-header")
        .attr("transform", d => `translate(${x(d) + x.bandwidth() / 2}, -8)`)
        .on("click", d => setSort(d));

    headers.append("text")
        .attr("text-anchor", "middle").attr("dy", "-2")
        .style("font-size", "12px").style("font-weight", "600")
        .text(d => d);

    const arrows = headers.append("text")
        .attr("class", "sort-arrow")
        .attr("text-anchor", "middle").attr("dy", "10")
        .style("font-size", "11px")
        .text("");

    const rowLabels = plot.selectAll("text.row-label")
        .data(genreOrder, d => d)
        .enter().append("text")
        .attr("class", "row-label")
        .attr("x", -8)
        .attr("y", d => y(d) + y.bandwidth() / 2)
        .attr("text-anchor", "end")
        .attr("dominant-baseline", "central")
        .style("font-size", "11px")
        .text(d => d);

    plot.append("text").attr("class", "axis-label")
        .attr("x", iw / 2).attr("y", ih + 30)
        .attr("text-anchor", "middle").text("Mental-health condition");
    plot.append("text").attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -ih / 2).attr("y", -m.left + 14)
        .attr("text-anchor", "middle").text("Favorite genre");

    // color legend
    const lh = Math.max(60, ih * 0.7), lw = 14;
    const legend = g.append("g").attr("transform", `translate(${m.left + iw + 28}, ${m.top})`);
    const defs = g.append("defs");
    const grad = defs.append("linearGradient")
        .attr("id", "heat-grad")
        .attr("x1", "0%").attr("y1", "100%")
        .attr("x2", "0%").attr("y2", "0%");
    d3.range(0, 1.01, 0.1).forEach(t => {
        grad.append("stop")
            .attr("offset", (t * 100) + "%")
            .attr("stop-color", d3.interpolateYlOrRd(t));
    });
    legend.append("rect")
        .attr("width", lw).attr("height", lh)
        .attr("fill", "url(#heat-grad)").attr("stroke", "#999");
    const ls = d3.scaleLinear().domain(ext).range([lh, 0]);
    legend.append("g")
        .attr("transform", `translate(${lw}, 0)`)
        .call(d3.axisRight(ls).ticks(5).tickFormat(d3.format(".1f")));
    legend.append("text").attr("class", "legend-label")
        .attr("x", -4).attr("y", -10).text("Mean score");

    updateHeatmap = function () {
        const rows = heatRows();
        const order = sortedOrder(rows);

        const byG = {};
        rows.forEach(r => { byG[r.genre] = r; });
        cells.forEach(c => {
            const r = byG[c.genre];
            c.value = r ? r[c.condition] : null;
            c.n = r ? r.n : 0;
        });

        y.domain(order);

        cellSel.transition().duration(ANIM_MS).ease(ANIM_EASE)
            .attr("y", d => y(d.genre))
            .attr("height", y.bandwidth())
            .attr("fill", d => d.value == null ? NO_DATA : color(d.value));

        cellText.transition().duration(ANIM_MS).ease(ANIM_EASE)
            .attr("y", d => y(d.genre) + y.bandwidth() / 2)
            .attr("fill", d => {
                if (d.value == null) return "#999";
                const t = (d.value - ext[0]) / (ext[1] - ext[0]);
                return t > 0.6 ? "#fff" : "#222";
            })
            .tween("text", function (d) {
                // tween the printed number alongside the fill color
                const node = this;
                const prev = parseFloat(node.textContent);
                const start = Number.isFinite(prev) ? prev : (d.value == null ? 0 : d.value);
                const end = d.value == null ? null : d.value;
                if (end == null) return () => { node.textContent = ""; };
                const interp = d3.interpolateNumber(start, end);
                return t => { node.textContent = interp(t).toFixed(1); };
            });

        rowLabels.transition().duration(ANIM_MS).ease(ANIM_EASE)
            .attr("y", d => y(d) + y.bandwidth() / 2)
            .style("font-weight", d => selectedGenres.has(d) ? 700 : 400)
            .style("fill", d => {
                if (selectedGenres.size === 0) return "#000";
                return selectedGenres.has(d) ? "#000" : "#999";
            });

        arrows.text(d => d !== sortKey ? "" : (sortDir === "desc" ? "▼" : "▲"));
    };
}


// parallel coordinates (advanced + brushing)
function drawParallel(g, w, h) {
    const m = { top: 56, right: 150, bottom: 30, left: 40 };
    const iw = Math.max(10, w - m.left - m.right);
    const ih = Math.max(10, h - m.top - m.bottom);

    g.append("text").attr("class", "view-title")
        .attr("x", m.left).attr("y", 22)
        .text("Listening & Mental-Health Profiles (advanced: parallel coordinates, drag any axis to brush)");

    const plot = g.append("g").attr("transform", `translate(${m.left}, ${m.top})`);
    const xPos = d3.scalePoint().domain(PCP_DIMS).range([0, iw]);

    const y = {};
    PCP_DIMS.forEach(dim => {
        const dom = CONDITIONS.indexOf(dim) !== -1 ? [0, 10] : d3.extent(respondents, d => d[dim]);
        y[dim] = d3.scaleLinear().domain(dom).nice().range([ih, 0]);
    });

    const line = d3.line()
        .defined(p => p[1] != null)
        .x(p => p[0])
        .y(p => p[1]);
    const pts = d => PCP_DIMS.map(dim => [xPos(dim), y[dim](d[dim])]);

    // draw Improve first, Worsen last so the 17 red lines stay on top
    const ordered = respondents.slice().sort(
        (a, b) => EFFECT_ORDER.indexOf(a["Music effects"]) - EFFECT_ORDER.indexOf(b["Music effects"]));

    const paths = plot.selectAll("path.profile")
        .data(ordered)
        .enter().append("path")
        .attr("class", "profile")
        .attr("d", d => line(pts(d)))
        .attr("fill", "none")
        .attr("stroke", d => effectColor(d["Music effects"]))
        .attr("stroke-width", 1)
        .attr("stroke-opacity", d => EFFECT_OPACITY[d["Music effects"]]);

    const dimG = plot.selectAll("g.dim")
        .data(PCP_DIMS)
        .enter().append("g")
        .attr("class", "dim")
        .attr("transform", p => `translate(${xPos(p)}, 0)`);

    dimG.append("g").each(function (p) { d3.select(this).call(d3.axisLeft(y[p]).ticks(6)); });
    dimG.append("text").attr("class", "axis-label")
        .attr("x", 0).attr("y", -12)
        .attr("text-anchor", "middle").attr("fill", "#000")
        .text(p => p);

    pcpBrushes = {};
    dimG.each(function (p) {
        const ys = y[p];
        const brush = d3.brushY()
            .extent([[-10, 0], [10, ih]])
            .on("brush end", function () {
                const sel = d3.event ? d3.event.selection : null;
                if (!sel) { setBrush(p, null); return; }
                // y is inverted (top of screen = max), so flip
                const lo = ys.invert(sel[1]);
                const hi = ys.invert(sel[0]);
                setBrush(p, [Math.min(lo, hi), Math.max(lo, hi)]);
            });
        const bg = d3.select(this).append("g").attr("class", "brush pcp-brush").call(brush);
        pcpBrushes[p] = { brush: brush, group: bg };
    });

    const legend = g.append("g")
        .attr("transform", `translate(${m.left + iw + 36}, ${m.top + 6})`);
    legend.append("text").attr("class", "legend-label")
        .attr("x", 0).attr("y", 0).style("font-weight", "600")
        .text("Music effects");
    const item = legend.selectAll("g.li")
        .data(EFFECT_ORDER).enter().append("g")
        .attr("class", "li")
        .attr("transform", (d, i) => `translate(0, ${14 + i * 22})`);
    item.append("rect")
        .attr("width", 16).attr("height", 16)
        .attr("fill", d => effectColor(d))
        .attr("fill-opacity", d => Math.min(1, EFFECT_OPACITY[d] * 3 + 0.25));
    item.append("text").attr("class", "legend-label")
        .attr("x", 22).attr("y", 13).text(d => d);

    updatePCP = function () {
        paths.transition().duration(ANIM_MS).ease(ANIM_EASE)
            .attr("stroke-opacity", d => inFilter(d) ? EFFECT_OPACITY[d["Music effects"]] : OUT_OPACITY)
            .attr("stroke-width", d => inFilter(d) ? 1 : 0.6);
    };
}
