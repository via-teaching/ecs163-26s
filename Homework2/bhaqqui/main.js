// ecs163 hw2 - pokemon stats dashboard
// 3 views: bar chart (overview), scatter, parallel coords (advanced)

const W = 1600;
const H = 900;

const titleH = 38;
const legendH = 56;
const topRowH = 340;
const bottomH = H - titleH - legendH - topRowH;

const barPanelW = 520;
const scatPanelW = W - barPanelW;

const barMargin = { top: 40, right: 20, bottom: 90, left: 60 };
const scatMargin = { top: 40, right: 30, bottom: 60, left: 70 };
const pcMargin = { top: 50, right: 40, bottom: 50, left: 60 };

const barOX = 0;
const barOY = titleH + legendH;
const scatOX = barPanelW;
const scatOY = titleH + legendH;
const pcOX = 0;
const pcOY = titleH + legendH + topRowH;

const barInnerW = barPanelW - barMargin.left - barMargin.right;
const barInnerH = topRowH - barMargin.top - barMargin.bottom;
const scatInnerW = scatPanelW - scatMargin.left - scatMargin.right;
const scatInnerH = topRowH - scatMargin.top - scatMargin.bottom;
const pcInnerW = W - pcMargin.left - pcMargin.right;
const pcInnerH = bottomH - pcMargin.top - pcMargin.bottom;

// using the standard pokemon type colors so red = fire, blue = water, etc.
const typeColors = {
    "Normal":   "#A8A77A",
    "Fire":     "#EE8130",
    "Water":    "#6390F0",
    "Electric": "#F7D02C",
    "Grass":    "#7AC74C",
    "Ice":      "#96D9D6",
    "Fighting": "#C22E28",
    "Poison":   "#A33EA1",
    "Ground":   "#E2BF65",
    "Flying":   "#A98FF3",
    "Psychic":  "#F95587",
    "Bug":      "#A6B91A",
    "Rock":     "#B6A136",
    "Ghost":    "#735797",
    "Dragon":   "#6F35FC",
    "Dark":     "#705746",
    "Steel":    "#B7B7CE",
    "Fairy":    "#D685AD"
};
const typeOrder = Object.keys(typeColors);

const colorScale = d3.scaleOrdinal()
    .domain(typeOrder)
    .range(typeOrder.map(t => typeColors[t]));

const statDims = ["HP", "Attack", "Defense", "Sp. Atk", "Sp. Def", "Speed"];

// viewBox so the dashboard scales w/ browser size and doesn't overflow
const svg = d3.select("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

// dashboard title at top
svg.append("text")
    .attr("class", "dashboard-title")
    .attr("x", W / 2)
    .attr("y", 26)
    .attr("text-anchor", "middle")
    .text("Pokemon Battle Stats Dashboard — by Type");

// shared type legend across the top (same colors used in all 3 views)
const legendG = svg.append("g")
    .attr("transform", `translate(0, ${titleH})`);

const legendItemW = 86;
const legendRowW = legendItemW * typeOrder.length;
const legendStartX = (W - legendRowW) / 2;

const legendItem = legendG.selectAll("g.legend-item")
    .data(typeOrder)
    .enter()
    .append("g")
    .attr("class", "legend-item")
    .attr("transform", (d, i) => `translate(${legendStartX + i * legendItemW}, 20)`);

// color swatches
legendItem.append("rect")
    .attr("width", 14)
    .attr("height", 14)
    .attr("rx", 2)
    .attr("fill", d => colorScale(d));

// type names next to each swatch
legendItem.append("text")
    .attr("class", "legend-label")
    .attr("x", 18)
    .attr("y", 11)
    .text(d => d);


d3.csv("data/pokemon.csv").then(rawData => {
    rawData.forEach(d => {
        d.HP = +d.HP;
        d.Attack = +d.Attack;
        d.Defense = +d.Defense;
        d["Sp. Atk"] = +d["Sp. Atk"];
        d["Sp. Def"] = +d["Sp. Def"];
        d.Speed = +d.Speed;
        d.Total = +d.Total;
        d.Generation = +d.Generation;
        d.Legendary = d.Legendary === "True";
    });

    console.log("loaded", rawData.length, "pokemon");

    drawBarChart(rawData);
    drawScatter(rawData);
    drawParallel(rawData);

}).catch(err => {
    console.log(err);
});


// view 1: bar chart - count of pokemon per primary type (the overview)
function drawBarChart(data) {
    // group + count by type 1, sort descending
    const counts = d3.nest()
        .key(d => d["Type 1"])
        .rollup(v => v.length)
        .entries(data)
        .map(o => ({ type: o.key, count: o.value }));

    counts.sort((a, b) => d3.descending(a.count, b.count));

    // bar chart panel (top-left)
    const g = svg.append("g")
        .attr("transform", `translate(${barOX + barMargin.left}, ${barOY + barMargin.top})`);

    // panel border
    svg.append("rect")
        .attr("class", "panel-border")
        .attr("x", barOX + 6)
        .attr("y", barOY + 6)
        .attr("width", barPanelW - 12)
        .attr("height", topRowH - 12);

    // view title
    g.append("text")
        .attr("class", "view-title")
        .attr("x", barInnerW / 2)
        .attr("y", -18)
        .attr("text-anchor", "middle")
        .text("Pokemon Count by Primary Type");

    const x = d3.scaleBand()
        .domain(counts.map(d => d.type))
        .range([0, barInnerW])
        .paddingInner(0.2)
        .paddingOuter(0.1);

    const y = d3.scaleLinear()
        .domain([0, d3.max(counts, d => d.count)])
        .range([barInnerH, 0])
        .nice();

    // x axis - rotate labels so 18 type names fit
    g.append("g")
        .attr("transform", `translate(0, ${barInnerH})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
            .attr("text-anchor", "end")
            .attr("transform", "rotate(-40)")
            .attr("dx", "-0.5em")
            .attr("dy", "0.4em");

    // y axis
    g.append("g").call(d3.axisLeft(y).ticks(6));

    // x label
    g.append("text")
        .attr("class", "axis-label")
        .attr("x", barInnerW / 2)
        .attr("y", barInnerH + 72)
        .attr("text-anchor", "middle")
        .text("Primary Type");

    // y label
    g.append("text")
        .attr("class", "axis-label")
        .attr("x", -barInnerH / 2)
        .attr("y", -42)
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text("Number of Pokemon");

    // bars
    g.selectAll("rect.bar")
        .data(counts)
        .enter()
        .append("rect")
            .attr("class", "bar")
            .attr("x", d => x(d.type))
            .attr("y", d => y(d.count))
            .attr("width", x.bandwidth())
            .attr("height", d => barInnerH - y(d.count))
            .attr("fill", d => colorScale(d.type))
            .attr("stroke", "#333")
            .attr("stroke-width", 0.4);

    // count label above each bar
    g.selectAll("text.bar-label")
        .data(counts)
        .enter()
        .append("text")
            .attr("class", "bar-label")
            .attr("x", d => x(d.type) + x.bandwidth() / 2)
            .attr("y", d => y(d.count) - 4)
            .attr("text-anchor", "middle")
            .attr("font-size", "10px")
            .attr("fill", "#222")
            .text(d => d.count);
}


// view 2: scatter - attack vs defense, color by type, ring for legendary
function drawScatter(data) {
    // scatter panel (top-right)
    const g = svg.append("g")
        .attr("transform", `translate(${scatOX + scatMargin.left}, ${scatOY + scatMargin.top})`);

    // panel border
    svg.append("rect")
        .attr("class", "panel-border")
        .attr("x", scatOX + 6)
        .attr("y", scatOY + 6)
        .attr("width", scatPanelW - 12)
        .attr("height", topRowH - 12);

    // view title
    g.append("text")
        .attr("class", "view-title")
        .attr("x", scatInnerW / 2)
        .attr("y", -18)
        .attr("text-anchor", "middle")
        .text("Attack vs Defense — colored by Type 1");

    const x = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.Attack) * 1.02])
        .range([0, scatInnerW])
        .nice();

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.Defense) * 1.02])
        .range([scatInnerH, 0])
        .nice();

    // x axis
    g.append("g")
        .attr("transform", `translate(0, ${scatInnerH})`)
        .call(d3.axisBottom(x).ticks(10));

    // y axis
    g.append("g").call(d3.axisLeft(y).ticks(8));

    // x label
    g.append("text")
        .attr("class", "axis-label")
        .attr("x", scatInnerW / 2)
        .attr("y", scatInnerH + 42)
        .attr("text-anchor", "middle")
        .text("Attack");

    // y label
    g.append("text")
        .attr("class", "axis-label")
        .attr("x", -scatInnerH / 2)
        .attr("y", -45)
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text("Defense");

    // dots - legendary ones get bigger marker + dark ring
    g.selectAll("circle.dot")
        .data(data)
        .enter()
        .append("circle")
            .attr("class", "dot")
            .attr("cx", d => x(d.Attack))
            .attr("cy", d => y(d.Defense))
            .attr("r", d => d.Legendary ? 5 : 3.5)
            .attr("fill", d => colorScale(d["Type 1"]))
            .attr("fill-opacity", 0.78)
            .attr("stroke", d => d.Legendary ? "#111" : "#fff")
            .attr("stroke-width", d => d.Legendary ? 1.6 : 0.5);

    // small legendary marker key (top-right of the plot)
    const subLegend = g.append("g")
        .attr("transform", `translate(${scatInnerW - 170}, 4)`);

    // white bg so dots dont show through the labels
    subLegend.append("rect")
        .attr("x", -4).attr("y", -2)
        .attr("width", 175).attr("height", 22)
        .attr("rx", 3)
        .attr("fill", "#ffffff")
        .attr("fill-opacity", 0.88)
        .attr("stroke", "#ddd")
        .attr("stroke-width", 0.5);

    // sample non-legendary dot
    subLegend.append("circle")
        .attr("cx", 6).attr("cy", 8).attr("r", 3.5)
        .attr("fill", "#999").attr("stroke", "#fff").attr("stroke-width", 0.5);

    subLegend.append("text")
        .attr("x", 16).attr("y", 12)
        .attr("font-size", "11px").attr("fill", "#333")
        .text("Non-legendary");

    // sample legendary dot
    subLegend.append("circle")
        .attr("cx", 96).attr("cy", 8).attr("r", 5)
        .attr("fill", "#999").attr("stroke", "#111").attr("stroke-width", 1.6);

    subLegend.append("text")
        .attr("x", 108).attr("y", 12)
        .attr("font-size", "11px").attr("fill", "#333")
        .text("Legendary");
}


// view 3: parallel coordinates (advanced) - 6 base stats, one line per pokemon
function drawParallel(data) {
    // parallel coords panel (bottom row)
    const g = svg.append("g")
        .attr("transform", `translate(${pcOX + pcMargin.left}, ${pcOY + pcMargin.top})`);

    // panel border
    svg.append("rect")
        .attr("class", "panel-border")
        .attr("x", pcOX + 6)
        .attr("y", pcOY + 6)
        .attr("width", W - 12)
        .attr("height", bottomH - 12);

    // view title
    g.append("text")
        .attr("class", "view-title")
        .attr("x", pcInnerW / 2)
        .attr("y", -22)
        .attr("text-anchor", "middle")
        .text("Parallel Coordinates: 6 Base Stats — one line per Pokemon, colored by Type 1");

    // x position for each of the 6 axes
    const xPos = d3.scalePoint()
        .domain(statDims)
        .range([0, pcInnerW])
        .padding(0.5);

    // separate y scale per stat since each stat has its own range
    const yByStat = {};
    statDims.forEach(stat => {
        yByStat[stat] = d3.scaleLinear()
            .domain([0, d3.max(data, d => d[stat]) * 1.02])
            .range([pcInnerH, 0])
            .nice();
    });

    const line = d3.line();
    function pcPath(d) {
        return line(statDims.map(stat => [xPos(stat), yByStat[stat](d[stat])]));
    }

    // one polyline per pokemon. low opacity is needed - with ~800 lines
    // anything more becomes a solid blob and you cant see the type patterns
    g.append("g")
        .attr("class", "pc-lines")
        .selectAll("path")
        .data(data)
        .enter()
        .append("path")
            .attr("d", pcPath)
            .attr("fill", "none")
            .attr("stroke", d => colorScale(d["Type 1"]))
            .attr("stroke-width", 1)
            .attr("opacity", 0.16);

    // one axis per stat
    const axisG = g.selectAll("g.pc-axis")
        .data(statDims)
        .enter()
        .append("g")
            .attr("class", "pc-axis")
            .attr("transform", stat => `translate(${xPos(stat)}, 0)`);

    axisG.each(function(stat) {
        d3.select(this).call(d3.axisLeft(yByStat[stat]).ticks(6));
    });

    // stat name above each axis
    axisG.append("text")
        .attr("class", "axis-label")
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .attr("font-weight", "600")
        .attr("fill", "#222")
        .text(stat => stat);
}
