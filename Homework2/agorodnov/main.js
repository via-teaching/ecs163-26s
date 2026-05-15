
const W  = window.innerWidth;
const VH = window.innerHeight;          
const H  = VH * 3;                      

const svg = d3.select("#dashboard")
    .attr("height", H)
    .attr("viewBox", `0 0 ${W} ${H}`);

const GENRE_PALETTE = [
    "#4E79A7", "#F28E2B", "#E15759", "#76B7B2", "#59A14F", "#EDC948",
    "#B07AA1", "#FF9DA7", "#9C755F", "#BAB0AC", "#1F77B4", "#D62728",
    "#9467BD", "#8C564B", "#17BECF", "#7F7F7F"
];

// Per-view vertical offsets.
const Y_LINE = 0;
const Y_BAR  = VH;
const Y_PC   = VH * 2;

// Shaded line graph (full-screen) — encoding key column on the right.
const sLegendW = 220;
const sM = { top: 80, right: sLegendW + 40, bottom: 80, left: 90 };
const sW = W  - sM.left - sM.right;
const sH = VH - sM.top  - sM.bottom;

// Bar chart (full-screen).
const bM = { top: 80, right: 60, bottom: 130, left: 90 };
const bW = W  - bM.left - bM.right;
const bH = VH - bM.top  - bM.bottom;

// Parallel coordinates (full-screen) — legend column on the right.
const pLegendW = 200;
const pM = { top: 100, right: pLegendW + 40, bottom: 70, left: 70 };
const pW = W  - pM.left - pM.right;
const pH = VH - pM.top  - pM.bottom;

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

    // Genres ordered by descending respondent count — shared across all views.
    const genreCounts = d3.nest()
        .key(d => d.Genre)
        .rollup(v => v.length)
        .entries(data)
        .sort((a, b) => b.value - a.value);
    const genres = genreCounts.map(d => d.key);

    const color = d3.scaleOrdinal().domain(genres).range(GENRE_PALETTE);

    drawShadedLine(data);
    drawBar(genreCounts, color);
    drawParallelCoords(data, color);

    drawLegend(svg, genres, color,
        pM.left + pW + 30, Y_PC + pM.top, "Favorite genre",
        genre => {
            const pcSel = svg.selectAll("path.pc");
            pcSel.attr("stroke-opacity", d => d.Genre === genre ? 0.85 : 0.04)
                 .attr("stroke-width",   d => d.Genre === genre ? 1.8  : 1.0);
            pcSel.filter(d => d.Genre === genre).raise();
        },
        () => {
            svg.selectAll("path.pc")
                .attr("stroke-opacity", 0.22)
                .attr("stroke-width",   1.1);
        });

}).catch(err => console.error(err));


function drawShadedLine(data) {
    const g = svg.append("g")
        .attr("transform", `translate(${sM.left}, ${Y_LINE + sM.top})`);

    g.append("text").attr("class", "view-title")
        .attr("x", sW / 2).attr("y", -40)
        .attr("text-anchor", "middle")
        .text("View 1 — Anxiety vs. Hours of music per day (median with IQR band)");

    // Bin respondents by integer hours/day; compute median + quartiles per bin.
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
        .entries(data)
        .map(e => ({ hours: +e.key, ...e.value }))
        .filter(d => d.count >= 3)
        .sort((a, b) => a.hours - b.hours);

    const x = d3.scaleLinear()
        .domain(d3.extent(bins, d => d.hours)).nice()
        .range([0, sW]);
    const y = d3.scaleLinear().domain([0, 10]).range([sH, 0]);

    g.append("g").attr("class", "axis")
        .attr("transform", `translate(0, ${sH})`)
        .call(d3.axisBottom(x).ticks(Math.min(10, bins.length)));
    g.append("g").attr("class", "axis")
        .call(d3.axisLeft(y).ticks(10));

    g.append("text").attr("class", "axis-label")
        .attr("x", sW / 2).attr("y", sH + 50)
        .attr("text-anchor", "middle")
        .text("Hours of music per day");
    g.append("text").attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -sH / 2).attr("y", -60)
        .attr("text-anchor", "middle")
        .text("Anxiety (0 = none, 10 = severe)");

    const LINE_COLOR = "#4E79A7";

    // Shaded IQR band (Q1 → Q3).
    const band = d3.area()
        .x(d => x(d.hours))
        .y0(d => y(d.q1))
        .y1(d => y(d.q3))
        .curve(d3.curveMonotoneX);

    g.append("path").datum(bins)
        .attr("d", band)
        .attr("fill", LINE_COLOR)
        .attr("fill-opacity", 0.22);

    // Median line.
    const line = d3.line()
        .x(d => x(d.hours))
        .y(d => y(d.median))
        .curve(d3.curveMonotoneX);

    g.append("path").datum(bins)
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", LINE_COLOR)
        .attr("stroke-width", 2.5);

    // Per-bin median markers — sized by respondent count.
    const rScale = d3.scaleSqrt()
        .domain([0, d3.max(bins, d => d.count)])
        .range([3, 12]);

    g.selectAll("circle.mark").data(bins).enter().append("circle")
        .attr("class", "mark")
        .attr("cx", d => x(d.hours))
        .attr("cy", d => y(d.median))
        .attr("r", d => rScale(d.count))
        .attr("fill", LINE_COLOR)
        .attr("stroke", "white").attr("stroke-width", 1.5);

    // Encoding legend.
    const legX = sM.left + sW + 30;
    const legY = Y_LINE + sM.top;
    const legend = svg.append("g").attr("transform", `translate(${legX}, ${legY})`);

    legend.append("text").attr("font-weight", 600).attr("font-size", "12px")
        .attr("y", -10).attr("fill", "#222")
        .text("Encoding");

    legend.append("rect").attr("x", 0).attr("y", 4)
        .attr("width", 28).attr("height", 16)
        .attr("fill", LINE_COLOR).attr("fill-opacity", 0.22);
    legend.append("text").attr("x", 36).attr("y", 16)
        .attr("font-size", "13px").attr("fill", "#333")
        .text("IQR (25th–75th percentile)");

    legend.append("line")
        .attr("x1", 0).attr("x2", 28)
        .attr("y1", 42).attr("y2", 42)
        .attr("stroke", LINE_COLOR).attr("stroke-width", 2.5);
    legend.append("text").attr("x", 36).attr("y", 46)
        .attr("font-size", "13px").attr("fill", "#333")
        .text("Median Anxiety");

    legend.append("circle").attr("cx", 14).attr("cy", 72)
        .attr("r", 7).attr("fill", LINE_COLOR)
        .attr("stroke", "white").attr("stroke-width", 1.5);
    legend.append("text").attr("x", 36).attr("y", 76)
        .attr("font-size", "13px").attr("fill", "#333")
        .text("Marker size ∝ respondents");

    legend.append("text").attr("x", 0).attr("y", 104)
        .attr("font-size", "11px").attr("fill", "#666")
        .text("Bins with < 3 respondents excluded.");
}


function drawBar(genreCounts, color) {
    const g = svg.append("g")
        .attr("transform", `translate(${bM.left}, ${Y_BAR + bM.top})`);

    g.append("text").attr("class", "view-title")
        .attr("x", bW / 2).attr("y", -40)
        .attr("text-anchor", "middle")
        .text("View 2 — Respondents by favorite genre (overview)");

    const x = d3.scaleBand()
        .domain(genreCounts.map(d => d.key))
        .range([0, bW])
        .padding(0.25);
    const y = d3.scaleLinear()
        .domain([0, d3.max(genreCounts, d => d.value)]).nice()
        .range([bH, 0]);

    g.append("g").attr("class", "axis")
        .attr("transform", `translate(0, ${bH})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
            .attr("y", 10).attr("x", -8)
            .attr("text-anchor", "end")
            .attr("transform", "rotate(-35)")
            .attr("font-size", "13px");
    g.append("g").attr("class", "axis")
        .call(d3.axisLeft(y).ticks(8));

    g.append("text").attr("class", "axis-label")
        .attr("x", bW / 2).attr("y", bH + 110)
        .attr("text-anchor", "middle")
        .text("Favorite genre");
    g.append("text").attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -bH / 2).attr("y", -60)
        .attr("text-anchor", "middle")
        .text("Number of respondents");

    g.selectAll("rect.bar").data(genreCounts).enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.key))
        .attr("y", d => y(d.value))
        .attr("width", x.bandwidth())
        .attr("height", d => bH - y(d.value))
        .attr("fill", d => color(d.key));

    // Value labels on top of each bar.
    g.selectAll("text.bar-value").data(genreCounts).enter().append("text")
        .attr("class", "bar-value")
        .attr("x", d => x(d.key) + x.bandwidth() / 2)
        .attr("y", d => y(d.value) - 6)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px").attr("fill", "#333")
        .text(d => d.value);
}


function drawParallelCoords(data, color) {
    const g = svg.append("g")
        .attr("transform", `translate(${pM.left}, ${Y_PC + pM.top})`);

    g.append("text").attr("class", "view-title")
        .attr("x", pW / 2).attr("y", -50)
        .attr("text-anchor", "middle")
        .text("View 3 — Per-respondent profile: listening hours and mental-health scales");

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

    dims.forEach(dim => {
        const ax = g.append("g").attr("class", "axis")
            .attr("transform", `translate(${xPC(dim)}, 0)`)
            .call(d3.axisLeft(yPC[dim]).ticks(8));
        ax.append("text").attr("class", "axis-label")
            .attr("y", -16).attr("text-anchor", "middle")
            .attr("fill", "#222").attr("font-size", "13px")
            .text(labels[dim]);
    });
}


function drawLegend(parent, items, color, x, y, title, onEnter, onLeave) {
    const g = parent.append("g").attr("transform", `translate(${x}, ${y})`);

    g.append("text").attr("class", "legend-item")
        .attr("font-weight", 600).attr("font-size", "12px")
        .attr("y", -10)
        .text(title);

    const row = g.selectAll("g.legend-row").data(items).enter().append("g")
        .attr("class", "legend-row")
        .attr("transform", (_, i) => `translate(0, ${i * 22})`);

    // Invisible hit-area widens the hover target across the full row.
    row.append("rect")
        .attr("x", -4).attr("y", -3)
        .attr("width", 180).attr("height", 22)
        .attr("fill", "transparent");

    row.append("rect")
        .attr("width", 16).attr("height", 16)
        .attr("fill", d => color(d));
    const labels = row.append("text").attr("class", "legend-item")
        .attr("x", 24).attr("y", 13)
        .attr("font-size", "13px")
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
