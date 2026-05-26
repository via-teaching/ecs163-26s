
const W  = window.innerWidth;
const VH = window.innerHeight;
const H  = VH;                          
const svg = d3.select("#dashboard")
    .attr("height", H)
    .attr("viewBox", `0 0 ${W} ${H}`);

const GENRE_PALETTE = [
    "#4E79A7", "#F28E2B", "#E15759", "#76B7B2", "#59A14F", "#EDC948",
    "#B07AA1", "#FF9DA7", "#9C755F", "#BAB0AC", "#1F77B4", "#D62728",
    "#9467BD", "#8C564B", "#17BECF", "#7F7F7F"
];

const HEADER_H = 76;
const ROW_TOP_H = Math.max(220, (VH - HEADER_H) * 0.45);
const ROW_BOT_H = (VH - HEADER_H) - ROW_TOP_H;
const HALF_W    = W / 2;

const Y_LINE = HEADER_H;
const Y_BAR  = HEADER_H;
const Y_PC   = HEADER_H + ROW_TOP_H;

const sLegendW = 140;
const sM = { top: 36, right: sLegendW + 20, bottom: 44, left: 56 };
const sW = HALF_W - sM.left - sM.right;
const sH = ROW_TOP_H - sM.top - sM.bottom;

const bM = { top: 36, right: 24, bottom: 76, left: 56 };
const bW = HALF_W - bM.left - bM.right;
const bH = ROW_TOP_H - bM.top - bM.bottom;

const pLegendW = 170;
const pM = { top: 50, right: pLegendW + 24, bottom: 28, left: 56 };
const pW = W - pM.left - pM.right;
const pH = ROW_BOT_H - pM.top - pM.bottom;

const FADE_MS = 300;
const MORPH_MS = 500;
const HOVER_MS = 150;

// Filter state shared by all three views.
const state = {
    selectedGenres: new Set(),   // empty = no genre filter
    pcBrushes: {},               // dim -> [lo, hi] in data units
    total: 0
};

function genreMatches(d) {
    return state.selectedGenres.size === 0 || state.selectedGenres.has(d.Genre);
}
function brushMatches(d) {
    for (const dim in state.pcBrushes) {
        const [lo, hi] = state.pcBrushes[dim];
        if (d[dim] < lo || d[dim] > hi) return false;
    }
    return true;
}
function matches(d) { return genreMatches(d) && brushMatches(d); }
function hasFilter() {
    return state.selectedGenres.size > 0 || Object.keys(state.pcBrushes).length > 0;
}

// Each draw function registers an updater; applyFilter() fans out to all three.
const updaters = [];
function applyFilter() { updaters.forEach(fn => fn()); updateStatus(); }


d3.csv("data/mxmh_survey_results.csv").then(raw => {
    raw.forEach(d => {
        d.Age        = +d.Age;
        d.Hours      = +d["Hours per day"];
        d.Anxiety    = +d.Anxiety;
        d.Depression = +d.Depression;
        d.Insomnia   = +d.Insomnia;
        d.OCD        = +d.OCD;
        d.Genre      = d["Fav genre"];
    });

    const data = raw.filter(d =>
        Number.isFinite(d.Hours)      &&
        Number.isFinite(d.Anxiety)    &&
        Number.isFinite(d.Depression) &&
        Number.isFinite(d.Insomnia)   &&
        Number.isFinite(d.OCD)        &&
        d.Genre && d.Genre.trim() !== ""
    );

    state.total = data.length;

    const genreCounts = d3.nest()
        .key(d => d.Genre)
        .rollup(v => v.length)
        .entries(data)
        .sort((a, b) => b.value - a.value);
    const genres = genreCounts.map(d => d.key);
    const color = d3.scaleOrdinal().domain(genres).range(GENRE_PALETTE);

    drawHeader();
    drawShadedLine(data);
    drawBar(data, genreCounts, color);
    drawParallelCoords(data, color);

    drawLegend(svg, genres, color,
        pM.left + pW + 30, Y_PC + pM.top, "Favorite genre",
        genre => {
            // Hover preview — does not mutate state.
            svg.selectAll("path.pc")
                .interrupt("hover")
                .transition("hover").duration(HOVER_MS)
                .attr("stroke-opacity", function(d) {
                    if (!matches(d)) return 0.02;
                    return d.Genre === genre ? 0.9 : 0.04;
                })
                .attr("stroke-width", d => d.Genre === genre ? 2.0 : 0.4);
            svg.selectAll("path.pc").filter(d => d.Genre === genre).raise();
        },
        () => {
            applyPCStyles(true);
        });

    updateStatus();
}).catch(err => console.error(err));


function drawHeader() {
    const g = svg.append("g").attr("transform", `translate(20, 20)`);

    g.append("text").attr("class", "hint hint-strong")
        .attr("y", 0)
        .text("Music & Mental Health — interactive dashboard");

    g.append("text").attr("class", "hint")
        .attr("y", 18)
        .text("Click a bar to filter by genre (shift-click adds). Drag along any axis in the bottom view to brush a range.");

    const btn = svg.append("g")
        .attr("class", "reset-btn")
        .attr("transform", `translate(${W - 120}, 8)`)
        .on("click", () => location.reload());
    btn.append("rect")
        .attr("width", 100).attr("height", 24).attr("rx", 4);
    btn.append("text")
        .attr("x", 50).attr("y", 16)
        .attr("text-anchor", "middle")
        .text("Reset filters");

    svg.append("text")
        .attr("class", "status")
        .attr("id", "status-text")
        .attr("x", 20)
        .attr("y", 60)
        .text("");
}

function updateStatus() {
    const t = svg.select("#status-text");
    if (!hasFilter()) { t.text(`No filters — showing all ${state.total} respondents.`); return; }
    const parts = [];
    if (state.selectedGenres.size > 0) {
        parts.push(`Genres: ${[...state.selectedGenres].join(", ")}`);
    }
    Object.entries(state.pcBrushes).forEach(([dim, [lo, hi]]) => {
        parts.push(`${dim} ∈ [${lo.toFixed(1)}, ${hi.toFixed(1)}]`);
    });
    t.text("Filters: " + parts.join(" · "));
}


function drawShadedLine(data) {
    const g = svg.append("g")
        .attr("transform", `translate(${sM.left}, ${Y_LINE + sM.top})`);

    g.append("text").attr("class", "view-title")
        .attr("x", sW / 2).attr("y", -16)
        .attr("text-anchor", "middle")
        .text("Anxiety vs. Hours of music per day (median + IQR)");

    // X domain fixed to full-data extent so substrate stays stable across filters
    // (smooth, predictable transitions; matches "filtering" semantics rather than rescale).
    const allHours = data.map(d => Math.round(d.Hours));
    const x = d3.scaleLinear()
        .domain([d3.min(allHours), d3.max(allHours)]).nice()
        .range([0, sW]);
    const y = d3.scaleLinear().domain([0, 10]).range([sH, 0]);

    g.append("g").attr("class", "axis")
        .attr("transform", `translate(0, ${sH})`)
        .call(d3.axisBottom(x).ticks(10));
    g.append("g").attr("class", "axis")
        .call(d3.axisLeft(y).ticks(10));

    g.append("text").attr("class", "axis-label")
        .attr("x", sW / 2).attr("y", sH + 34)
        .attr("text-anchor", "middle")
        .text("Hours of music per day");
    g.append("text").attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -sH / 2).attr("y", -40)
        .attr("text-anchor", "middle")
        .text("Anxiety (0–10)");

    const LINE_COLOR = "#4E79A7";

    const bandGen = d3.area()
        .x(d => x(d.hours))
        .y0(d => y(d.q1))
        .y1(d => y(d.q3))
        .curve(d3.curveMonotoneX);

    const lineGen = d3.line()
        .x(d => x(d.hours))
        .y(d => y(d.median))
        .curve(d3.curveMonotoneX);

    const bandPath = g.append("path").attr("class", "band")
        .attr("fill", LINE_COLOR).attr("fill-opacity", 0.22);
    const linePath = g.append("path").attr("class", "median")
        .attr("fill", "none").attr("stroke", LINE_COLOR).attr("stroke-width", 2.5);

    const markersG = g.append("g").attr("class", "markers");

    const rScale = d3.scaleSqrt().range([3, 12]);

    function computeBins() {
        const filtered = data.filter(matches);
        const bins = d3.nest()
            .key(d => Math.round(d.Hours))
            .rollup(v => {
                const sorted = v.map(d => d.Anxiety).sort(d3.ascending);
                return {
                    median: d3.quantile(sorted, 0.5),
                    q1:     d3.quantile(sorted, 0.25),
                    q3:     d3.quantile(sorted, 0.75),
                    count:  v.length
                };
            })
            .entries(filtered)
            .map(e => ({ hours: +e.key, ...e.value }))
            .filter(d => d.count >= 3)
            .sort((a, b) => a.hours - b.hours);
        return bins;
    }

    function render(animate) {
        const bins = computeBins();
        rScale.domain([0, d3.max(bins, d => d.count) || 1]);

        const morphMs = animate ? MORPH_MS : 0;
        const fadeMs = animate ? FADE_MS : 0;

        // Filtering transition — snap path data, pulse fill opacity so the
        // change is visible without chaining fades (which felt choppy).
        bandPath.attr("d", bandGen(bins));
        linePath.attr("d", lineGen(bins));

        bandPath.transition("pulse").duration(fadeMs)
            .attrTween("fill-opacity", () => d3.interpolateNumber(0.05, 0.22));
        linePath.transition("pulse").duration(fadeMs)
            .attrTween("stroke-opacity", () => d3.interpolateNumber(0.3, 1));

        const m = markersG.selectAll("circle.mark").data(bins, d => d.hours);

        m.exit()
            .transition("filter").duration(fadeMs)
            .attr("r", 0).attr("fill-opacity", 0)
            .remove();

        const enter = m.enter().append("circle")
            .attr("class", "mark")
            .attr("cx", d => x(d.hours))
            .attr("cy", d => y(d.median))
            .attr("r", 0)
            .attr("fill", LINE_COLOR)
            .attr("stroke", "white").attr("stroke-width", 1.5);

        enter.merge(m)
            .transition("filter").duration(morphMs)
            .attr("cx", d => x(d.hours))
            .attr("cy", d => y(d.median))
            .attr("r", d => rScale(d.count));
    }

    updaters.push(() => render(true));
    render(false);

    // Encoding legend.
    const legX = sM.left + sW + 16;
    const legY = Y_LINE + sM.top;
    const legend = svg.append("g").attr("transform", `translate(${legX}, ${legY})`);
    legend.append("text").attr("font-weight", 600).attr("font-size", "11px")
        .attr("y", -6).attr("fill", "#f0f1f3").text("Encoding");
    legend.append("rect").attr("x", 0).attr("y", 6).attr("width", 22).attr("height", 12)
        .attr("fill", LINE_COLOR).attr("fill-opacity", 0.32);
    legend.append("text").attr("x", 28).attr("y", 16)
        .attr("font-size", "11px").attr("fill", "#d0d3d8")
        .text("IQR (Q1–Q3)");
    legend.append("line").attr("x1", 0).attr("x2", 22).attr("y1", 32).attr("y2", 32)
        .attr("stroke", LINE_COLOR).attr("stroke-width", 2.5);
    legend.append("text").attr("x", 28).attr("y", 36)
        .attr("font-size", "11px").attr("fill", "#d0d3d8")
        .text("Median");
    legend.append("circle").attr("cx", 11).attr("cy", 52).attr("r", 5)
        .attr("fill", LINE_COLOR).attr("stroke", "#e8eaee").attr("stroke-width", 1.5);
    legend.append("text").attr("x", 28).attr("y", 56)
        .attr("font-size", "11px").attr("fill", "#d0d3d8")
        .text("Size ∝ count");
    legend.append("text").attr("x", 0).attr("y", 78)
        .attr("font-size", "10px").attr("fill", "#9ca0a6")
        .text("Bins <3 excluded.");
}


function drawBar(data, genreCounts, color) {
    const g = svg.append("g")
        .attr("transform", `translate(${HALF_W + bM.left}, ${Y_BAR + bM.top})`);

    g.append("text").attr("class", "view-title")
        .attr("x", bW / 2).attr("y", -16)
        .attr("text-anchor", "middle")
        .text("Respondents by favorite genre · click to filter (shift-click adds)");

    const x = d3.scaleBand()
        .domain(genreCounts.map(d => d.key))
        .range([0, bW])
        .padding(0.25);

    // Y domain locked to full-data max so filtered heights are read in context
    // (substrate stable -> filtering animation is unambiguous).
    const yMax = d3.max(genreCounts, d => d.value);
    const y = d3.scaleLinear().domain([0, yMax]).nice().range([bH, 0]);

    g.append("g").attr("class", "axis")
        .attr("transform", `translate(0, ${bH})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
            .attr("y", 6).attr("x", -6)
            .attr("text-anchor", "end")
            .attr("transform", "rotate(-45)")
            .attr("font-size", "10px");
    g.append("g").attr("class", "axis")
        .call(d3.axisLeft(y).ticks(6));

    g.append("text").attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -bH / 2).attr("y", -40)
        .attr("text-anchor", "middle")
        .text("Respondents");

    // Ghost bars show the full count behind the filtered count (gives context
    // for how much the brush has filtered out within each genre).
    g.selectAll("rect.ghost").data(genreCounts).enter().append("rect")
        .attr("class", "ghost")
        .attr("x", d => x(d.key))
        .attr("y", d => y(d.value))
        .attr("width", x.bandwidth())
        .attr("height", d => bH - y(d.value))
        .attr("fill", "rgba(255,255,255,0.06)");

    const bw = x.bandwidth();
    const bars = g.selectAll("rect.bar").data(genreCounts).enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.key))
        .attr("y", d => y(d.value))
        .attr("width", bw)
        .attr("height", d => bH - y(d.value))
        .attr("fill", d => color(d.key))
        .on("click", function(d) {
            // Toggle / multi-select. No shift = pick exactly this (or clear if same).
            const sel = state.selectedGenres;
            if (d3.event.shiftKey) {
                if (sel.has(d.key)) sel.delete(d.key); else sel.add(d.key);
            } else {
                if (sel.size === 1 && sel.has(d.key)) sel.clear();
                else { sel.clear(); sel.add(d.key); }
            }
            applyFilter();
        })
        .on("mouseenter", function(d) {
            const target = d.key;
            // Hovered bar grows; neighbors shrink toward their centers.
            const cx = x(target) + bw / 2;
            const growW = bw + 8;
            const shrinkW = Math.max(3, bw - 10);
            bars.transition("hover").duration(HOVER_MS)
                .attr("width", d2 => d2.key === target ? growW : shrinkW)
                .attr("x", d2 => {
                    const c = x(d2.key) + bw / 2;
                    return d2.key === target ? (cx - growW / 2) : (c - shrinkW / 2);
                });
            // Cross-view linking: same shrink semantics in view 3.
            svg.selectAll("path.pc").interrupt("hover")
                .transition("hover").duration(HOVER_MS)
                .attr("stroke-opacity", d2 =>
                    !matches(d2) ? 0.02 : (d2.Genre === target ? 0.9 : 0.04))
                .attr("stroke-width", d2 =>
                    !matches(d2) ? 0.4 : (d2.Genre === target ? 2.0 : 0.4));
            svg.selectAll("path.pc").filter(d2 => d2.Genre === target).raise();
        })
        .on("mouseleave", function(d) {
            bars.transition("hover").duration(HOVER_MS)
                .attr("x", d2 => x(d2.key))
                .attr("width", bw);
            applyPCStyles(true);
        });

    const valueLabels = g.selectAll("text.bar-value").data(genreCounts).enter().append("text")
        .attr("class", "bar-value")
        .attr("x", d => x(d.key) + x.bandwidth() / 2)
        .attr("y", d => y(d.value) - 4)
        .attr("text-anchor", "middle")
        .attr("font-size", "10px").attr("fill", "#d0d2d6")
        .text(d => d.value);

    function render() {
        const filtered = data.filter(brushMatches);   // bar shows brush-filtered counts
        const counts = d3.nest()
            .key(d => d.Genre)
            .rollup(v => v.length)
            .entries(filtered);
        const countMap = new Map(counts.map(c => [c.key, c.value]));

        bars.each(function(d) { d.filtered = countMap.get(d.key) || 0; });

        // Selection styling (immediate — clicking should feel instant).
        bars.classed("dim", d => state.selectedGenres.size > 0 && !state.selectedGenres.has(d.key))
            .classed("selected", d => state.selectedGenres.has(d.key));

        // Filtering transition — bar heights tween to new counts.
        bars.transition().duration(MORPH_MS)
            .attr("y", d => y(d.filtered))
            .attr("height", d => bH - y(d.filtered));

        valueLabels.transition().duration(MORPH_MS)
            .attr("y", d => y(d.filtered) - 6)
            .tween("text", function(d) {
                const i = d3.interpolateNumber(+this.textContent || 0, d.filtered);
                return t => { this.textContent = Math.round(i(t)); };
            });
    }

    updaters.push(render);
}


function drawParallelCoords(data, color) {
    const g = svg.append("g")
        .attr("transform", `translate(${pM.left}, ${Y_PC + pM.top})`);

    g.append("text").attr("class", "view-title")
        .attr("x", pW / 2).attr("y", -28)
        .attr("text-anchor", "middle")
        .text("Per-respondent profile · drag along any axis to brush a range");

    const dims = ["Hours", "Anxiety", "Depression", "Insomnia", "OCD"];
    const labels = {
        Hours:      "Hours/day",
        Anxiety:    "Anxiety (0–10)",
        Depression: "Depression (0–10)",
        Insomnia:   "Insomnia (0–10)",
        OCD:        "OCD (0–10)"
    };
    const domains = {
        Hours:      [0, d3.max(data, d => d.Hours)],
        Anxiety:    [0, 10],
        Depression: [0, 10],
        Insomnia:   [0, 10],
        OCD:        [0, 10]
    };

    const xPC = d3.scalePoint().domain(dims).range([0, pW]).padding(0.5);
    const yPC = {};
    dims.forEach(dim => {
        yPC[dim] = d3.scaleLinear().domain(domains[dim]).nice().range([pH, 0]);
    });

    const lineGen = d => d3.line()(dims.map(dim => [xPC(dim), yPC[dim](d[dim])]));

    g.selectAll("path.pc").data(data).enter().append("path")
        .attr("class", "pc")
        .attr("d", lineGen)
        .attr("fill", "none")
        .attr("stroke", d => color(d.Genre))
        .attr("stroke-opacity", 0.22)
        .attr("stroke-width", 1.1);

    // One brushY per axis. d3.event.selection is in pixel space; invert through yPC.
    dims.forEach(dim => {
        const axisG = g.append("g")
            .attr("class", "axis")
            .attr("transform", `translate(${xPC(dim)}, 0)`)
            .call(d3.axisLeft(yPC[dim]).ticks(6));

        axisG.append("text").attr("class", "axis-label")
            .attr("y", -10).attr("text-anchor", "middle")
            .attr("fill", "#f0f1f3").attr("font-size", "12px")
            .text(labels[dim]);

        const brush = d3.brushY()
            .extent([[-18, 0], [18, pH]])
            .on("end", () => {
                const sel = d3.event.selection;
                if (sel == null) {
                    delete state.pcBrushes[dim];
                } else {
                    // sel = [y0, y1] in pixels (y0 < y1); higher pixel = lower data.
                    const hi = yPC[dim].invert(sel[0]);
                    const lo = yPC[dim].invert(sel[1]);
                    state.pcBrushes[dim] = [lo, hi];
                }
                applyFilter();
            });

        const brushG = g.append("g")
            .attr("class", "brush pc-brush")
            .attr("transform", `translate(${xPC(dim)}, 0)`)
            .call(brush);

        brushG.property("__brush_obj", brush);   // referenced by Reset button
    });

    // Single update that retargets opacity based on current filter.
    function render() {
        applyPCStyles(true);
    }

    updaters.push(render);
}

// Shared PC restyling (used by filter updates + legend mouseleave).
function applyPCStyles(animate) {
    const sel = svg.selectAll("path.pc").interrupt("hover");
    const t = animate ? sel.transition("filter").duration(FADE_MS) : sel;
    t.attr("stroke-opacity", d => matches(d) ? (hasFilter() ? 0.55 : 0.22) : 0.03)
     .attr("stroke-width",   d => matches(d) ? (hasFilter() ? 1.4  : 1.1)  : 0.8);
}


function drawLegend(parent, items, color, x, y, title, onEnter, onLeave) {
    const g = parent.append("g").attr("transform", `translate(${x}, ${y})`);

    g.append("text").attr("class", "legend-item")
        .attr("font-weight", 600).attr("font-size", "11px")
        .attr("y", -6)
        .text(title);

    const rowH = 15;
    const row = g.selectAll("g.legend-row").data(items).enter().append("g")
        .attr("class", "legend-row")
        .attr("transform", (_, i) => `translate(0, ${i * rowH})`);

    row.append("rect")
        .attr("x", -4).attr("y", -2)
        .attr("width", 160).attr("height", rowH)
        .attr("fill", "transparent");

    row.append("rect")
        .attr("width", 11).attr("height", 11)
        .attr("fill", d => color(d));
    row.append("text").attr("class", "legend-item")
        .attr("x", 18).attr("y", 10)
        .attr("font-size", "11px")
        .text(d => d);

    if (onEnter || onLeave) {
        row.style("cursor", "pointer")
            .on("mouseenter", function(d) {
                d3.select(this).select("text").attr("font-weight", 700);
                if (onEnter) onEnter(d);
            })
            .on("mouseleave", function(d) {
                d3.select(this).select("text").attr("font-weight", null);
                if (onLeave) onLeave(d);
            });
    }
}
