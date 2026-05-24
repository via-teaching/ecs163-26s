// ECS 163 HW2 - mccyeung. bar chart, heatmap, radar small multiples

// type colors
const TYPE_COLORS = {
    Bug:      "hsl(66, 70%, 42%)", Dark:     "hsl(24, 22%, 36%)", Dragon:   "hsl(258, 93%, 60%)",
    Electric: "hsl(48, 94%, 58%)", Fairy:    "hsl(347, 71%, 77%)", Fighting: "hsl(3, 66%, 46%)",
    Fire:     "hsl(25, 87%, 56%)", Flying:   "hsl(255, 76%, 75%)", Ghost:    "hsl(263, 27%, 47%)",
    Grass:    "hsl(100, 52%, 55%)", Ground:   "hsl(44, 66%, 64%)", Ice:      "hsl(180, 45%, 72%)",
    Normal:   "hsl(60, 22%, 56%)", Poison:   "hsl(300, 43%, 44%)", Psychic:  "hsl(342, 92%, 66%)",
    Rock:     "hsl(49, 53%, 47%)", Steel:    "hsl(240, 20%, 77%)", Water:    "hsl(222, 82%, 67%)"
};
const TYPE_ORDER = Object.keys(TYPE_COLORS).sort();
const colorScale = d3.scaleOrdinal()
    .domain(TYPE_ORDER)
    .range(TYPE_ORDER.map(t => TYPE_COLORS[t]));


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
            d3.selectAll(".panel svg").selectAll("*").remove();
            drawBarChart(rawData);
            drawDualTypeHeatmap(rawData);
            drawRadarSmallMultiples(rawData, STAT_KEYS);
        }, 150);
    });
}).catch(err => console.error("Failed to load data/pokemon.csv:", err));


// plot 1: Bar Chart
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
        .text("Pokémon Count by Primary Type  (overview)");

    const x = d3.scaleBand()
        .domain(counts.map(d => d.key))
        .range([0, innerW])
        .padding(0.15);

    const y = d3.scaleLinear()
        .domain([0, d3.max(counts, d => d.value)]).nice()
        .range([innerH, 0]);

    g.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${innerH})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
            .attr("transform", "rotate(-40)")
            .attr("text-anchor", "end")
            .attr("dx", "-0.5em")
            .attr("dy", "0.4em");

    g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(6));

    g.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("x", innerW / 2)
        .attr("y", innerH + 50)
        .text("Primary Type");

    g.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("transform", `rotate(-90)`)
        .attr("x", -innerH / 2)
        .attr("y", -36)
        .text("Number of Pokémon");

    // bars
    g.selectAll("rect.bar")
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

    g.selectAll("text.barval")
        .data(counts)
        .enter().append("text")
            .attr("class", "barval")
            .attr("x", d => x(d.key) + x.bandwidth() / 2)
            .attr("y", d => y(d.value) - 4)
            .attr("text-anchor", "middle")
            .attr("font-size", "10px")
            .attr("fill", "hsl(0, 0%, 20%)")
            .text(d => d.value);
}


// plot 2: Heatmap
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

    // cells
    TYPE_ORDER.forEach(t1 => {
        TYPE_ORDER.forEach(t2 => {
            const count = (countMap[t1] && countMap[t2]) ? countMap[t1][t2] : 0;
            const isEmpty = !count;
            g.append("rect")
                .attr("x", x(t2))
                .attr("y", y(t1))
                .attr("width", x.bandwidth())
                .attr("height", y.bandwidth())
                .attr("fill", isEmpty ? "hsl(240, 12%, 95%)" : cellFill(count))
                .attr("stroke", "hsl(0, 0%, 100%)")
                .attr("stroke-width", 0.5);

            // count label, white text on dark cells
            if (count >= 3) {
                g.append("text")
                    .attr("x", x(t2) + x.bandwidth() / 2)
                    .attr("y", y(t1) + y.bandwidth() / 2 + 3)
                    .attr("text-anchor", "middle")
                    .attr("font-size", "9px")
                    .attr("fill", count > maxCount * 0.55 ? "hsl(0, 0%, 100%)" : "hsl(0, 0%, 13%)")
                    .text(count);
            }
        });
    });

    g.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${innerH})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
            .attr("transform", "rotate(-45)")
            .attr("text-anchor", "end")
            .attr("dx", "-0.5em")
            .attr("dy", "0.4em");

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


// plot 3: Radar Small Multiples
function drawRadarSmallMultiples(data, statKeys) {
    const { width, height } = getPanelSize("#view-parallel");
    const margin = { top: 40, right: 10, bottom: 10, left: 10 };
    const innerW = width  - margin.left - margin.right;
    const innerH = height - margin.top  - margin.bottom;

    const svg = d3.select("#view-parallel svg");
    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    svg.append("text")
        .attr("class", "chart-title")
        .attr("x", margin.left).attr("y", 22)
        .text("Average Stat Profile by Primary Type  (radar small multiples: shape = stat distribution, size = total strength)");

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
    const pointAt = (i, v) => {
        const r = (v / globalMax) * radius;
        return [r * Math.cos(angleFor(i)), r * Math.sin(angleFor(i))];
    };

    const SHORT = { HP: "HP", Attack: "Atk", Defense: "Def",
                    Sp_Atk: "SpA", Sp_Def: "SpD", Speed: "Spe" };

    typeProfiles.forEach((profile, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const cx  = cellW * col + cellW / 2;
        const cy  = cellH * row + cellH / 2;

        const cell = g.append("g")
            .attr("transform", `translate(${cx},${cy})`);

        [0.25, 0.5, 0.75, 1.0].forEach(t => {
            cell.append("circle")
                .attr("r", radius * t)
                .attr("fill", "none")
                .attr("stroke", "hsl(0, 0%, 87%)")
                .attr("stroke-width", 0.5);
        });

        statKeys.forEach((_, i) => {
            const [x, y] = pointAt(i, globalMax);
            cell.append("line")
                .attr("x1", 0).attr("y1", 0)
                .attr("x2", x).attr("y2", y)
                .attr("stroke", "hsl(0, 0%, 80%)")
                .attr("stroke-width", 0.5);
        });

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

        statKeys.forEach((k, i) => {
            const [x, y] = pointAt(i, globalMax);
            cell.append("text")
                .attr("x", x * 1.22).attr("y", y * 1.22)
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .attr("font-size", "9px")
                .attr("fill", "hsl(0, 0%, 33%)")
                .text(SHORT[k]);
        });

        // type label
        cell.append("text")
            .attr("x", 0)
            .attr("y", radius * 1.22 + 14)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .attr("font-weight", "600")
            .attr("fill", colorScale(profile.type))
            .text(profile.type);
    });

    const ref = svg.append("g")
        .attr("transform", `translate(${width - 180},${margin.top - 6})`);
    ref.append("text")
        .attr("class", "legend-label")
        .attr("x", 0).attr("y", -2)
        .attr("font-weight", "600")
        .text(`Radial scale: 0 → ${Math.round(globalMax)}`);
    ref.append("text")
        .attr("class", "legend-label")
        .attr("x", 0).attr("y", 12)
        .text("rings at 25 / 50 / 75 / 100%");
}


