// ECS 163 HW3 - mccyeung. bar chart + brushing, heatmap + filter, radar + click focus

// type colors
const TYPE_COLORS = {
    Bug:      "hsl(66, 70%, 42%)",  Dark:     "hsl(24, 22%, 36%)",   Dragon:   "hsl(258, 93%, 60%)",
    Electric: "hsl(48, 94%, 58%)",  Fairy:    "hsl(347, 71%, 77%)",  Fighting: "hsl(3, 66%, 46%)",
    Fire:     "hsl(25, 87%, 56%)",  Flying:   "hsl(255, 76%, 75%)",  Ghost:    "hsl(263, 27%, 47%)",
    Grass:    "hsl(100, 52%, 55%)", Ground:   "hsl(44, 66%, 64%)",   Ice:      "hsl(180, 45%, 72%)",
    Normal:   "hsl(60, 22%, 56%)",  Poison:   "hsl(300, 43%, 44%)",  Psychic:  "hsl(342, 92%, 66%)",
    Rock:     "hsl(49, 53%, 47%)",  Steel:    "hsl(240, 20%, 77%)",  Water:    "hsl(222, 82%, 67%)"
};
const TYPE_ORDER = Object.keys(TYPE_COLORS).sort();
const colorScale = d3.scaleOrdinal()
    .domain(TYPE_ORDER)
    .range(TYPE_ORDER.map(t => TYPE_COLORS[t]));

// shared state
let brushedTypes = new Set();
let heatmapRows  = null;

function getPanelSize(selector) {
    const rect = document.querySelector(selector).getBoundingClientRect();
    return { width: rect.width, height: rect.height };
}

d3.csv("data/pokemon.csv").then(rawData => {
    const STAT_KEYS = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];
    rawData.forEach(d => {
        STAT_KEYS.forEach(k => { d[k] = +d[k]; });
        d.Total = +d.Total;
    });

    drawBarChart(rawData);
    drawDualTypeHeatmap(rawData);
    drawRadarSmallMultiples(rawData, STAT_KEYS);

    // redraw on resize
    let resizeTimer;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            brushedTypes = new Set();
            heatmapRows  = null;
            d3.select("#view-parallel svg").on("click.focus", null);
            d3.selectAll(".panel svg").selectAll("*").remove();
            drawBarChart(rawData);
            drawDualTypeHeatmap(rawData);
            drawRadarSmallMultiples(rawData, STAT_KEYS);
        }, 150);
    });
}).catch(err => console.error("Failed to load data/pokemon.csv:", err));


// plot 1: Bar Chart - brushX to filter heatmap rows
function drawBarChart(data) {
    const counts = d3.nest()
        .key(d => d.Type_1)
        .rollup(v => v.length)
        .entries(data)
        .sort((a, b) => d3.descending(a.value, b.value));

    const { width, height } = getPanelSize("#view-bar");
    const margin = { top: 40, right: 20, bottom: 60, left: 50 };
    const innerW = width  - margin.left - margin.right;
    const innerH = height - margin.top  - margin.bottom;

    const svg = d3.select("#view-bar svg");
    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    svg.append("text")
        .attr("class", "chart-title")
        .attr("x", margin.left).attr("y", 22)
        .text("Pokémon Count by Primary Type  (overview - drag to filter)");

    // live counter - shows how many types are selected by the brush
    const selLabel = svg.append("text")
        .attr("class", "legend-label")
        .attr("x", width - 12).attr("y", 16)
        .attr("text-anchor", "end")
        .attr("fill", "hsl(222, 37%, 45%)")
        .text("drag to filter heatmap");

    const x = d3.scaleBand()
        .domain(counts.map(d => d.key))
        .range([0, innerW])
        .padding(0.15);

    const y = d3.scaleLinear()
        .domain([0, d3.max(counts, d => d.value)]).nice()
        .range([innerH, 0]);

    // x axis
    g.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${innerH})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
            .attr("transform", "rotate(-40)")
            .attr("text-anchor", "end")
            .attr("dx", "-0.5em")
            .attr("dy", "0.4em");

    // y axis
    g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(6));

    g.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("x", innerW / 2).attr("y", innerH + 50)
        .text("Primary Type");

    g.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerH / 2).attr("y", -36)
        .text("Number of Pokémon");

    // bars
    const bars = g.selectAll("rect.bar")
        .data(counts)
        .enter().append("rect")
            .attr("class", "bar")
            .attr("x", d => x(d.key))
            .attr("y", d => y(d.value))
            .attr("width", x.bandwidth())
            .attr("height", d => innerH - y(d.value))
            .attr("fill", d => colorScale(d.key))
            .attr("stroke", "hsl(0, 0%, 20%)")
            .attr("stroke-width", 0.4);

    const barvals = g.selectAll("text.barval")
        .data(counts)
        .enter().append("text")
            .attr("class", "barval")
            .attr("x", d => x(d.key) + x.bandwidth() / 2)
            .attr("y", d => y(d.value) - 4)
            .attr("text-anchor", "middle")
            .attr("font-size", "10px")
            .attr("fill", "hsl(0, 0%, 20%)")
            .text(d => d.value);

    // brushX - interaction 1: brushing
    function onBrush() {
        const sel = d3.event.selection;
        if (!sel) {
            brushedTypes = new Set();
        } else {
            const [x0, x1] = sel;
            brushedTypes = new Set(
                counts
                    .filter(d => {
                        const mid = x(d.key) + x.bandwidth() / 2;
                        return mid >= x0 && mid <= x1;
                    })
                    .map(d => d.key)
            );
        }
        // dim unselected bars - filtering transition
        bars.transition().duration(250)
            .attr("opacity", d => (!brushedTypes.size || brushedTypes.has(d.key)) ? 1 : 0.2);
        barvals.transition().duration(250)
            .attr("opacity", d => (!brushedTypes.size || brushedTypes.has(d.key)) ? 1 : 0.2);
        selLabel.text(brushedTypes.size ? `${brushedTypes.size} types selected` : "drag to filter heatmap");
        updateHeatmapFilter(brushedTypes);
    }

    const brush = d3.brushX()
        .extent([[0, 0], [innerW, innerH]])
        .on("brush", onBrush)
        .on("end", onBrush);

    g.append("g").attr("class", "brush").call(brush);
}


// filtering transition on heatmap rows - triggered by brush
function updateHeatmapFilter(selectedTypes) {
    if (!heatmapRows) return;
    heatmapRows.transition().duration(400)
        .attr("opacity", function() {
            const t = d3.select(this).attr("data-t1");
            return (!selectedTypes.size || selectedTypes.has(t)) ? 1 : 0.1;
        });
}


// plot 2: Heatmap - rows grouped by Type_1 for animated filtering
function drawDualTypeHeatmap(data) {
    const dual = data.filter(d => d.Type_2 && d.Type_2.trim() !== "");

    const countMap = {};
    dual.forEach(d => {
        if (!countMap[d.Type_1]) countMap[d.Type_1] = {};
        countMap[d.Type_1][d.Type_2] = (countMap[d.Type_1][d.Type_2] || 0) + 1;
    });
    const maxCount = d3.max(
        Object.values(countMap).flatMap(row => Object.values(row))
    );

    const { width, height } = getPanelSize("#view-scatter");
    const margin = { top: 40, right: 105, bottom: 75, left: 75 };
    const innerW = width  - margin.left - margin.right;
    const innerH = height - margin.top  - margin.bottom;

    const svg = d3.select("#view-scatter svg");
    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    svg.append("text")
        .attr("class", "chart-title")
        .attr("x", margin.left).attr("y", 22)
        .text("Dual-Type Combinations  (rows = primary, columns = secondary, color = count)");

    const x = d3.scaleBand().domain(TYPE_ORDER).range([0, innerW]).padding(0.05);
    const y = d3.scaleBand().domain(TYPE_ORDER).range([0, innerH]).padding(0.05);
    const cellFill = d3.scaleSequential(d3.interpolateBlues).domain([0, maxCount]);

    // cells grouped by Type_1 row so brush can filter entire rows
    heatmapRows = g.selectAll(".heatmap-row")
        .data(TYPE_ORDER)
        .enter().append("g")
            .attr("class", "heatmap-row")
            .attr("data-t1", t1 => t1);

    heatmapRows.each(function(t1) {
        const rowG = d3.select(this);
        TYPE_ORDER.forEach(t2 => {
            const count = (countMap[t1] && countMap[t1][t2]) ? countMap[t1][t2] : 0;
            rowG.append("rect")
                .attr("x", x(t2))
                .attr("y", y(t1))
                .attr("width", x.bandwidth())
                .attr("height", y.bandwidth())
                .attr("fill", count ? cellFill(count) : "hsl(240, 12%, 95%)")
                .attr("stroke", "hsl(0, 0%, 100%)")
                .attr("stroke-width", 0.5);

            // count label, white text on dark cells
            if (count >= 3) {
                rowG.append("text")
                    .attr("x", x(t2) + x.bandwidth() / 2)
                    .attr("y", y(t1) + y.bandwidth() / 2 + 3)
                    .attr("text-anchor", "middle")
                    .attr("font-size", "9px")
                    .attr("fill", count > maxCount * 0.55 ? "hsl(0, 0%, 100%)" : "hsl(0, 0%, 13%)")
                    .text(count);
            }
        });
    });

    // x axis
    g.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${innerH})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
            .attr("transform", "rotate(-45)")
            .attr("text-anchor", "end")
            .attr("dx", "-0.5em")
            .attr("dy", "0.4em");

    // y axis
    g.append("g").attr("class", "axis").call(d3.axisLeft(y));

    g.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("x", innerW / 2).attr("y", innerH + 60)
        .text("Type 2 (secondary)");

    g.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerH / 2).attr("y", -55)
        .text("Type 1 (primary)");

    drawCountLegend(svg, width - margin.right + 12, margin.top, maxCount, cellFill);
}


// color bar legend
function drawCountLegend(svg, x, y, maxCount, colorFn) {
    const barH = 140, barW = 12;
    const legend = svg.append("g").attr("transform", `translate(${x},${y})`);

    legend.append("text")
        .attr("class", "axis-label")
        .attr("x", 0).attr("y", -6)
        .attr("font-weight", "600")
        .text("Count");

    const gradId = "heatmap-grad";
    const defs = svg.append("defs");
    const grad = defs.append("linearGradient")
        .attr("id", gradId).attr("x1", 0).attr("y1", 1).attr("x2", 0).attr("y2", 0);
    d3.range(0, 1.001, 0.1).forEach(t => {
        grad.append("stop")
            .attr("offset", `${t * 100}%`)
            .attr("stop-color", colorFn(t * maxCount));
    });

    legend.append("rect")
        .attr("width", barW).attr("height", barH)
        .attr("fill", `url(#${gradId})`)
        .attr("stroke", "hsl(0, 0%, 53%)")
        .attr("stroke-width", 0.5);

    // ticks
    [0, Math.round(maxCount / 2), maxCount].forEach((v, i) => {
        legend.append("text")
            .attr("class", "legend-label")
            .attr("x", barW + 4)
            .attr("y", barH - (i / 2) * barH + 3)
            .text(v);
    });

    legend.append("rect")
        .attr("x", 0).attr("y", barH + 10)
        .attr("width", 11).attr("height", 11)
        .attr("fill", "hsl(240, 12%, 95%)")
        .attr("stroke", "hsl(0, 0%, 53%)")
        .attr("stroke-width", 0.5);
    legend.append("text")
        .attr("class", "legend-label")
        .attr("x", 16).attr("y", barH + 20)
        .text("no combo");
}


// plot 3: Radar Small Multiples - click cell to expand (view transition)
function drawRadarSmallMultiples(data, statKeys) {
    const { width, height } = getPanelSize("#view-parallel");
    const margin = { top: 40, right: 10, bottom: 10, left: 10 };
    const innerW = width  - margin.left - margin.right;
    const innerH = height - margin.top  - margin.bottom;

    const svg = d3.select("#view-parallel svg");

    const titleText = svg.append("text")
        .attr("class", "chart-title")
        .attr("x", margin.left).attr("y", 22)
        .text("Average Stat Profile by Type  (radar small multiples: shape = stat distribution, size = total strength)");

    const typeProfiles = d3.nest()
        .key(d => d.Type_1)
        .entries(data)
        .map(grp => {
            const profile = { type: grp.key };
            statKeys.forEach(k => { profile[k] = d3.mean(grp.values, d => d[k]); });
            return profile;
        })
        .sort((a, b) => d3.ascending(a.type, b.type));

    const globalMax = d3.max(typeProfiles, p => d3.max(statKeys, k => p[k]));

    const cols = 6, rows = 3;
    const cellW = innerW / cols;
    const cellH = innerH / rows;
    const radius = Math.max(10, Math.min(cellW, cellH) / 2 - 28);

    const angleFor = i => (Math.PI * 2 * i / statKeys.length) - Math.PI / 2;
    const pointAtR = (r, i) => [r * Math.cos(angleFor(i)), r * Math.sin(angleFor(i))];
    const pointAt  = (i, v) => pointAtR((v / globalMax) * radius, i);

    const SHORT = { HP: "HP", Attack: "Atk", Defense: "Def",
                    Sp_Atk: "SpA", Sp_Def: "SpD", Speed: "Spe" };

    // overview group - all 18 cells
    const overviewG = svg.append("g")
        .attr("class", "radar-overview")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    typeProfiles.forEach((profile, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const cx = cellW * col + cellW / 2;
        const cy = cellH * row + cellH / 2;

        const cell = overviewG.append("g")
            .attr("class", "radar-cell")
            .attr("transform", `translate(${cx},${cy})`)
            .style("cursor", "pointer");

        // rings
        [0.25, 0.5, 0.75, 1.0].forEach(t => {
            cell.append("circle")
                .attr("r", radius * t)
                .attr("fill", "none")
                .attr("stroke", "hsl(0, 0%, 87%)")
                .attr("stroke-width", 0.5);
        });

        // spokes
        statKeys.forEach((_, i) => {
            const [sx, sy] = pointAtR(radius, i);
            cell.append("line")
                .attr("x1", 0).attr("y1", 0)
                .attr("x2", sx).attr("y2", sy)
                .attr("stroke", "hsl(0, 0%, 80%)")
                .attr("stroke-width", 0.5);
        });

        // polygon
        const polyPoints = statKeys
            .map((k, i) => pointAt(i, profile[k]))
            .map(p => p.join(","))
            .join(" ");
        cell.append("polygon")
            .attr("points", polyPoints)
            .attr("fill", colorScale(profile.type))
            .attr("fill-opacity", 0.55)
            .attr("stroke", colorScale(profile.type))
            .attr("stroke-width", 1.4);

        // stat labels
        statKeys.forEach((k, i) => {
            const [lx, ly] = pointAtR(radius, i);
            cell.append("text")
                .attr("x", lx * 1.22).attr("y", ly * 1.22)
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .attr("font-size", "9px")
                .attr("fill", "hsl(0, 0%, 33%)")
                .text(SHORT[k]);
        });

        // type label - pushed below the SpA axis label (SpA points straight down)
        cell.append("text")
            .attr("x", 0)
            .attr("y", radius * 1.22 + 20)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .attr("font-weight", "600")
            .attr("fill", colorScale(profile.type))
            .text(profile.type);

        // hover ring
        const hoverRing = cell.append("circle")
            .attr("r", radius * 1.28)
            .attr("fill", "none")
            .attr("stroke", "none");

        cell.on("mouseover", () => hoverRing
            .attr("stroke", colorScale(profile.type))
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "4,3"));
        cell.on("mouseout", () => hoverRing.attr("stroke", "none"));

        // click to expand - interaction 2: selection / view transition
        cell.on("click", () => {
            d3.event.stopPropagation(); // stop click from bubbling to svg click.focus handler
            showRadarFocus(profile, statKeys, globalMax, SHORT,
                           svg, overviewG, titleText, width, height, margin);
        });
    });

    // scale reference
    const ref = svg.append("g")
        .attr("class", "radar-scale-ref")
        .attr("transform", `translate(${width - 200},${margin.top - 6})`);
    ref.append("text")
        .attr("class", "legend-label")
        .attr("x", 0).attr("y", -2)
        .attr("font-weight", "600")
        .text(`Radial scale: 0 to ${Math.round(globalMax)}`);
    ref.append("text")
        .attr("class", "legend-label")
        .attr("x", 0).attr("y", 12)
        .text("rings at 25 / 50 / 75 / 100%");
    ref.append("text")
        .attr("class", "legend-label")
        .attr("x", 0).attr("y", 26)
        .attr("fill", "hsl(222, 37%, 45%)")
        .text("click a cell to expand");
}


// view transition: fade overview out, animate large focus radar in, click to return
function showRadarFocus(profile, statKeys, globalMax, SHORT,
                        svg, overviewG, titleText, width, height, margin) {

    const focusR = Math.min(
        (width  - margin.left - margin.right) / 2 - 70,
        (height - margin.top  - margin.bottom) / 2 - 55
    );
    const cx = width  / 2;
    const cy = margin.top + (height - margin.top - margin.bottom) / 2;

    const angleFor = i => (Math.PI * 2 * i / statKeys.length) - Math.PI / 2;
    const pointAtR = (r, i) => [r * Math.cos(angleFor(i)), r * Math.sin(angleFor(i))];
    const pointAt  = (i, v) => pointAtR((v / globalMax) * focusR, i);

    // fade overview out (view transition start)
    overviewG.transition().duration(300).attr("opacity", 0)
        .on("end", () => overviewG.attr("pointer-events", "none"));
    titleText.transition().duration(300).attr("opacity", 0);
    svg.select(".radar-scale-ref").transition().duration(300).attr("opacity", 0);

    // focus wrapper
    const focusWrap = svg.append("g")
        .attr("class", "radar-focus-wrap")
        .attr("opacity", 0);

    // full-panel white backdrop so all focus text is readable with no overlap
    focusWrap.append("rect")
        .attr("x", 0).attr("y", 0)
        .attr("width", width).attr("height", height)
        .attr("fill", "hsl(0, 0%, 100%)");

    focusWrap.append("text")
        .attr("class", "chart-title")
        .attr("x", margin.left).attr("y", 22)
        .text(`${profile.type}: Average Stat Profile  (click to return)`);

    const focusG = focusWrap.append("g")
        .attr("transform", `translate(${cx},${cy})`);

    // rings with value labels placed between HP and Atk spokes so they never
    // share space with a vertex value label (HP points straight up, Atk is upper-right)
    const ringLabelAngle = -Math.PI / 3; // midpoint between HP (-90°) and Atk (-30°)
    [0.25, 0.5, 0.75, 1.0].forEach(t => {
        focusG.append("circle")
            .attr("r", focusR * t)
            .attr("fill", "none")
            .attr("stroke", "hsl(0, 0%, 83%)")
            .attr("stroke-width", 0.8);
        focusG.append("text")
            .attr("x", Math.cos(ringLabelAngle) * focusR * t + 4)
            .attr("y", Math.sin(ringLabelAngle) * focusR * t)
            .attr("font-size", "10px")
            .attr("fill", "hsl(0, 0%, 60%)")
            .attr("text-anchor", "start")
            .text(Math.round(globalMax * t));
    });

    // spokes
    statKeys.forEach((_, i) => {
        const [sx, sy] = pointAtR(focusR, i);
        focusG.append("line")
            .attr("x1", 0).attr("y1", 0)
            .attr("x2", sx).attr("y2", sy)
            .attr("stroke", "hsl(0, 0%, 73%)")
            .attr("stroke-width", 0.8);
    });

    // polygon - animates from center outward (view transition animation)
    const polyPoints = statKeys.map((k, i) => pointAt(i, profile[k])).map(p => p.join(",")).join(" ");
    const zeroPoints = statKeys.map(() => "0,0").join(" ");

    focusG.append("polygon")
        .attr("points", zeroPoints)
        .attr("fill", colorScale(profile.type))
        .attr("fill-opacity", 0.4)
        .attr("stroke", colorScale(profile.type))
        .attr("stroke-width", 2)
        .transition().duration(550).delay(250)
        .attr("points", polyPoints);

    // stat axis labels - placed at 1.24x radius so they clear the polygon vertices
    statKeys.forEach((k, i) => {
        const [lx, ly] = pointAtR(focusR, i);
        focusG.append("text")
            .attr("x", lx * 1.24).attr("y", ly * 1.24)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .attr("font-size", "13px")
            .attr("font-weight", "600")
            .attr("fill", "hsl(0, 0%, 27%)")
            .text(SHORT[k]);
    });

    // avg values near polygon vertices - appear after polygon finishes
    statKeys.forEach((k, i) => {
        const [vx, vy] = pointAt(i, profile[k]);
        focusG.append("text")
            .attr("x", vx * 1.1).attr("y", vy * 1.1)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .attr("font-size", "11px")
            .attr("fill", colorScale(profile.type))
            .attr("opacity", 0)
            .text(Math.round(profile[k]))
            .transition().duration(300).delay(660)
            .attr("opacity", 1);
    });

    // type name - placed below the SpA axis label (SpA points straight down at 1.24x)
    focusG.append("text")
        .attr("x", 0).attr("y", focusR * 1.24 + 22)
        .attr("text-anchor", "middle")
        .attr("font-size", "20px")
        .attr("font-weight", "700")
        .attr("fill", colorScale(profile.type))
        .text(profile.type);

    // fade focus in (view transition end state)
    focusWrap.transition().duration(400).delay(200).attr("opacity", 1);

    // click anywhere to return to overview
    svg.on("click.focus", () => {
        svg.on("click.focus", null);
        focusWrap.transition().duration(300).attr("opacity", 0)
            .on("end", () => focusWrap.remove());
        overviewG.attr("pointer-events", null)
            .transition().duration(350).delay(150).attr("opacity", 1);

        titleText.transition().duration(350).delay(150).attr("opacity", 1);
        svg.select(".radar-scale-ref")
            .transition().duration(350).delay(150).attr("opacity", 1);
    });
}
