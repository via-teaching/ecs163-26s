// ecs163 hw3 - interactive pokemon stats dashboard (d3 v5)

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

const T = 450; // transition duration

// standard pokemon type colors so red = fire, blue = water, etc.
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

// interaction state - null means "no filter of this kind"
let allData = [];
let selectedType = null;
let brushedSet = null;
let barOrder = [];
let sortMode = "count";

function passType(d) { return selectedType === null || d["Type 1"] === selectedType; }
function passBrush(d) { return brushedSet === null || brushedSet.has(d); }
function isActive(d) { return passType(d) && passBrush(d); }
function hasSelection() { return selectedType !== null || brushedSet !== null; }

// filled on first render so the update fns can restyle existing marks
let dots, pcLines, scatX, scatY;
let barG, barX, barY, barXAxisG;
let brush, brushG;

const svg = d3.select("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

svg.append("text")
    .attr("class", "dashboard-title")
    .attr("x", W / 2)
    .attr("y", 26)
    .attr("text-anchor", "middle")
    .text("Pokemon Battle Stats Dashboard — by Type");

// legend across the top, also acts as a type selector
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
    .attr("transform", (d, i) => `translate(${legendStartX + i * legendItemW}, 20)`)
    .on("click", d => selectType(d));

legendItem.append("rect")
    .attr("width", 14)
    .attr("height", 14)
    .attr("rx", 2)
    .attr("fill", d => colorScale(d));

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
    allData = rawData;

    drawBarChart();
    drawScatter();
    drawParallel();
    wireControls();
}).catch(err => {
    console.log(err);
});


// counts per primary type, restricted to the current brush subset
function currentCounts() {
    const subset = allData.filter(passBrush);
    const m = d3.nest().key(d => d["Type 1"]).rollup(v => v.length).object(subset);
    return barOrder.map(t => ({ type: t, count: m[t] || 0 }));
}


function drawBarChart() {
    const fullCounts = d3.nest()
        .key(d => d["Type 1"]).rollup(v => v.length).entries(allData)
        .map(o => ({ type: o.key, count: o.value }))
        .sort((a, b) => d3.descending(a.count, b.count));
    barOrder = fullCounts.map(d => d.type);
    const fullMax = d3.max(fullCounts, d => d.count);

    barG = svg.append("g")
        .attr("transform", `translate(${barOX + barMargin.left}, ${barOY + barMargin.top})`);

    svg.append("rect")
        .attr("class", "panel-border")
        .attr("x", barOX + 6).attr("y", barOY + 6)
        .attr("width", barPanelW - 12).attr("height", topRowH - 12);

    barG.append("text")
        .attr("class", "view-title")
        .attr("x", barInnerW / 2).attr("y", -18)
        .attr("text-anchor", "middle")
        .text("Pokemon Count by Primary Type");

    barX = d3.scaleBand()
        .domain(barOrder)
        .range([0, barInnerW])
        .paddingInner(0.2).paddingOuter(0.1);

    // y fixed to the full-data max so bars visibly shrink/grow when brushing
    barY = d3.scaleLinear()
        .domain([0, fullMax]).range([barInnerH, 0]).nice();

    barXAxisG = barG.append("g")
        .attr("transform", `translate(0, ${barInnerH})`)
        .call(d3.axisBottom(barX));
    styleBarXAxis();

    barG.append("g").call(d3.axisLeft(barY).ticks(6));

    barG.append("text")
        .attr("class", "axis-label")
        .attr("x", barInnerW / 2).attr("y", barInnerH + 72)
        .attr("text-anchor", "middle").text("Primary Type");

    barG.append("text")
        .attr("class", "axis-label")
        .attr("x", -barInnerH / 2).attr("y", -42)
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)").text("Number of Pokemon");

    const counts = currentCounts();

    barG.selectAll("rect.bar")
        .data(counts, d => d.type)
        .enter().append("rect")
            .attr("class", "bar")
            .attr("x", d => barX(d.type))
            .attr("y", d => barY(d.count))
            .attr("width", barX.bandwidth())
            .attr("height", d => barInnerH - barY(d.count))
            .attr("fill", d => colorScale(d.type))
            .attr("stroke", "#333").attr("stroke-width", 0.4)
            .on("click", d => selectType(d.type));

    barG.selectAll("text.bar-label")
        .data(counts, d => d.type)
        .enter().append("text")
            .attr("class", "bar-label")
            .attr("x", d => barX(d.type) + barX.bandwidth() / 2)
            .attr("y", d => barY(d.count) - 4)
            .attr("text-anchor", "middle")
            .attr("font-size", "10px").attr("fill", "#222")
            .text(d => d.count);
}

// rotate the 18 type labels so they fit under the bars
function styleBarXAxis() {
    barXAxisG.selectAll("text")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-40)")
        .attr("dx", "-0.5em").attr("dy", "0.4em");
}


function drawScatter() {
    const g = svg.append("g")
        .attr("transform", `translate(${scatOX + scatMargin.left}, ${scatOY + scatMargin.top})`);

    svg.append("rect")
        .attr("class", "panel-border")
        .attr("x", scatOX + 6).attr("y", scatOY + 6)
        .attr("width", scatPanelW - 12).attr("height", topRowH - 12);

    g.append("text")
        .attr("class", "view-title")
        .attr("x", scatInnerW / 2).attr("y", -18)
        .attr("text-anchor", "middle")
        .text("Attack vs Defense — drag to brush a subset");

    scatX = d3.scaleLinear()
        .domain([0, d3.max(allData, d => d.Attack) * 1.02])
        .range([0, scatInnerW]).nice();

    scatY = d3.scaleLinear()
        .domain([0, d3.max(allData, d => d.Defense) * 1.02])
        .range([scatInnerH, 0]).nice();

    g.append("g")
        .attr("transform", `translate(0, ${scatInnerH})`)
        .call(d3.axisBottom(scatX).ticks(10));
    g.append("g").call(d3.axisLeft(scatY).ticks(8));

    g.append("text")
        .attr("class", "axis-label")
        .attr("x", scatInnerW / 2).attr("y", scatInnerH + 42)
        .attr("text-anchor", "middle").text("Attack");

    g.append("text")
        .attr("class", "axis-label")
        .attr("x", -scatInnerH / 2).attr("y", -45)
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)").text("Defense");

    dots = g.selectAll("circle.dot")
        .data(allData)
        .enter().append("circle")
            .attr("class", "dot")
            .attr("cx", d => scatX(d.Attack))
            .attr("cy", d => scatY(d.Defense))
            .attr("r", d => d.Legendary ? 5 : 3.5)
            .attr("fill", d => colorScale(d["Type 1"]))
            .attr("fill-opacity", 0.78)
            .attr("stroke", d => d.Legendary ? "#111" : "#fff")
            .attr("stroke-width", d => d.Legendary ? 1.6 : 0.5);

    const subLegend = g.append("g")
        .attr("transform", `translate(${scatInnerW - 170}, 4)`);
    subLegend.append("rect")
        .attr("x", -4).attr("y", -2).attr("width", 175).attr("height", 22).attr("rx", 3)
        .attr("fill", "#ffffff").attr("fill-opacity", 0.88)
        .attr("stroke", "#ddd").attr("stroke-width", 0.5);
    subLegend.append("circle")
        .attr("cx", 6).attr("cy", 8).attr("r", 3.5)
        .attr("fill", "#999").attr("stroke", "#fff").attr("stroke-width", 0.5);
    subLegend.append("text")
        .attr("x", 16).attr("y", 12).attr("font-size", "11px").attr("fill", "#333")
        .text("Non-legendary");
    subLegend.append("circle")
        .attr("cx", 96).attr("cy", 8).attr("r", 5)
        .attr("fill", "#999").attr("stroke", "#111").attr("stroke-width", 1.6);
    subLegend.append("text")
        .attr("x", 108).attr("y", 12).attr("font-size", "11px").attr("fill", "#333")
        .text("Legendary");

    brush = d3.brush()
        .extent([[0, 0], [scatInnerW, scatInnerH]])
        .on("brush end", brushed);

    brushG = g.append("g").attr("class", "brush").call(brush);
}

function brushed() {
    const sel = d3.event.selection;
    if (!sel) {
        brushedSet = null;
    } else {
        const [[x0, y0], [x1, y1]] = sel;
        brushedSet = new Set(allData.filter(d => {
            const cx = scatX(d.Attack), cy = scatY(d.Defense);
            return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
        }));
    }
    updateAll();
}


function drawParallel() {
    const g = svg.append("g")
        .attr("transform", `translate(${pcOX + pcMargin.left}, ${pcOY + pcMargin.top})`);

    svg.append("rect")
        .attr("class", "panel-border")
        .attr("x", pcOX + 6).attr("y", pcOY + 6)
        .attr("width", W - 12).attr("height", bottomH - 12);

    g.append("text")
        .attr("class", "view-title")
        .attr("x", pcInnerW / 2).attr("y", -22)
        .attr("text-anchor", "middle")
        .text("Parallel Coordinates: 6 Base Stats — focuses on the selected / brushed Pokemon");

    const xPos = d3.scalePoint()
        .domain(statDims).range([0, pcInnerW]).padding(0.5);

    // one y scale per stat since each stat has its own range
    const yByStat = {};
    statDims.forEach(stat => {
        yByStat[stat] = d3.scaleLinear()
            .domain([0, d3.max(allData, d => d[stat]) * 1.02])
            .range([pcInnerH, 0]).nice();
    });

    const line = d3.line();
    function pcPath(d) {
        return line(statDims.map(stat => [xPos(stat), yByStat[stat](d[stat])]));
    }

    // faint by default - ~800 overlapping lines would otherwise be a solid blob
    pcLines = g.append("g")
        .attr("class", "pc-lines")
        .selectAll("path")
        .data(allData)
        .enter().append("path")
            .attr("d", pcPath)
            .attr("fill", "none")
            .attr("stroke", d => colorScale(d["Type 1"]))
            .attr("stroke-width", 1)
            .attr("opacity", 0.16);

    const axisG = g.selectAll("g.pc-axis")
        .data(statDims)
        .enter().append("g")
            .attr("class", "pc-axis")
            .attr("transform", stat => `translate(${xPos(stat)}, 0)`);

    axisG.each(function(stat) {
        d3.select(this).call(d3.axisLeft(yByStat[stat]).ticks(6));
    });

    axisG.append("text")
        .attr("class", "axis-label")
        .attr("y", -10).attr("text-anchor", "middle")
        .attr("font-weight", "600").attr("fill", "#222")
        .text(stat => stat);
}


// clicking a type toggles it on/off
function selectType(type) {
    selectedType = (selectedType === type) ? null : type;
    updateAll();
}

function updateAll() {
    updateBars();
    updateScatter();
    updateParallel();
}

// heights follow the brushed subset (filtering); the selected type is emphasized
function updateBars() {
    const counts = currentCounts();

    barG.selectAll("rect.bar")
        .data(counts, d => d.type)
        .transition().duration(T)
            .attr("x", d => barX(d.type))
            .attr("y", d => barY(d.count))
            .attr("width", barX.bandwidth())
            .attr("height", d => barInnerH - barY(d.count))
            .attr("fill-opacity", d => (selectedType && d.type !== selectedType) ? 0.28 : 1)
            .attr("stroke", d => d.type === selectedType ? "#111" : "#333")
            .attr("stroke-width", d => d.type === selectedType ? 2 : 0.4);

    barG.selectAll("text.bar-label")
        .data(counts, d => d.type)
        .transition().duration(T)
            .attr("x", d => barX(d.type) + barX.bandwidth() / 2)
            .attr("y", d => barY(d.count) - 4)
            .tween("text", function(d) {
                const i = d3.interpolateRound(+this.textContent || 0, d.count);
                return t => { this.textContent = i(t); };
            });
}

function updateScatter() {
    const sel = hasSelection();
    dots.transition().duration(T)
        .attr("fill-opacity", d => !sel ? 0.78 : (isActive(d) ? 0.9 : 0.05))
        .attr("stroke-opacity", d => !sel ? 1 : (isActive(d) ? 1 : 0.15))
        .attr("r", d => {
            const base = d.Legendary ? 5 : 3.5;
            return !sel ? base : (isActive(d) ? base + 1 : 2);
        });
}

function updateParallel() {
    const sel = hasSelection();
    pcLines.transition().duration(T)
        .attr("opacity", d => !sel ? 0.16 : (isActive(d) ? 0.55 : 0.012))
        .attr("stroke-width", d => (sel && isActive(d)) ? 1.4 : 1);
}


function wireControls() {
    d3.select("#clear-btn").on("click", () => {
        selectedType = null;
        brushedSet = null;
        if (brushG) brushG.call(brush.move, null); // also fires brushed()
        updateAll();
    });

    d3.select("#sort-btn").on("click", function() {
        sortMode = (sortMode === "count") ? "alpha" : "count";
        const counts = currentCounts();
        if (sortMode === "alpha") {
            barOrder = barOrder.slice().sort(d3.ascending);
        } else {
            barOrder = counts.slice().sort((a, b) => d3.descending(a.count, b.count)).map(d => d.type);
        }
        barX.domain(barOrder);
        d3.select(this).text(sortMode === "count" ? "Sort: By count" : "Sort: A–Z");

        // bars + labels glide to new x positions (ordering transition)
        barXAxisG.transition().duration(T).call(d3.axisBottom(barX)).on("end", styleBarXAxis);
        barG.selectAll("rect.bar").transition().duration(T)
            .attr("x", d => barX(d.type));
        barG.selectAll("text.bar-label").transition().duration(T)
            .attr("x", d => barX(d.type) + barX.bandwidth() / 2);
    });
}
