const width  = window.innerWidth;
const height = window.innerHeight;

// official pokemon type colors
const typeColorMap = {
    "Normal":   "#A8A878", "Fire":     "#F08030",
    "Water":    "#6890F0", "Electric": "#F8D030",
    "Grass":    "#78C850", "Ice":      "#98D8D8",
    "Fighting": "#C03028", "Poison":   "#A040A0",
    "Ground":   "#E0C068", "Flying":   "#A890F0",
    "Psychic":  "#F85888", "Bug":      "#A8B820",
    "Rock":     "#B8A038", "Ghost":    "#705898",
    "Dragon":   "#7038F8", "Dark":     "#705848",
    "Steel":    "#B8B8D0", "Fairy":    "#EE99AC"
};

// bar chart
let barMargin = { top: 55, right: 20, bottom: 90, left: 70 };
let barWidth  = Math.round(width * 0.55) - barMargin.left - barMargin.right;
let barHeight = Math.round(height * 0.5) - barMargin.top  - barMargin.bottom;

// pie chart
let pieAreaX  = Math.round(width * 0.55);
let pieAreaW  = width - pieAreaX;
let pieAreaH  = Math.round(height * 0.5);
let pieRadius = Math.min(pieAreaW, pieAreaH) / 2 - 50;

// parallel coordinates
let pcMargin  = { top: 55, right: 220, bottom: 50, left: 60 };
let pcOffsetY = Math.round(height * 0.5);
let pcWidth   = width  - pcMargin.left - pcMargin.right;
let pcHeight  = height - pcOffsetY - pcMargin.top - pcMargin.bottom;

// the six base stat axes
const pcDimensions = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];

// data load
d3.csv("Pokemon/pokemon_alopez247.csv").then(rawData => {

    // parse numeric columns from csv strings
    rawData.forEach(d => {
        d.HP         = +d.HP;
        d.Attack     = +d.Attack;
        d.Defense    = +d.Defense;
        d.Sp_Atk     = +d.Sp_Atk;
        d.Sp_Def     = +d.Sp_Def;
        d.Speed      = +d.Speed;
        d.Total      = +d.Total;
        d.Generation = +d.Generation;
    });

    const svg = d3.select("svg");

    // subtle dividers separating the three chart regions
    svg.append("line")
        .attr("x1", 0).attr("y1", height * 0.5)
        .attr("x2", width).attr("y2", height * 0.5)
        .attr("stroke", "#ccc").attr("stroke-width", 1);

    svg.append("line")
        .attr("x1", width * 0.55).attr("y1", 0)
        .attr("x2", width * 0.55).attr("y2", height * 0.5)
        .attr("stroke", "#ccc").attr("stroke-width", 1);


    // currently-selected type from bar chart (null = show all / default views)
    let selectedType  = null;
    // active brush ranges keyed by PC axis name: { dim: [lo, hi] }
    let activeBrushes = {};


    // BAR CHART 

    // count per type, sorted descending
    const typeCounts = d3.nest()
        .key(d => d.Type_1)
        .rollup(v => v.length)
        .entries(rawData)
        .sort((a, b) => b.value - a.value);

    // chart group at top-left
    const g1 = svg.append("g")
        .attr("transform", `translate(${barMargin.left}, ${barMargin.top})`);

    // chart title
    g1.append("text")
        .attr("x", barWidth / 2)
        .attr("y", -22)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .text("Pokemon Count by Primary Type");

    // interaction hint — tells user about the click-to-select behavior
    g1.append("text")
        .attr("x", barWidth / 2)
        .attr("y", -7)
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("fill", "#888")
        .text("Click a bar to drill into that type ↓");

    // x scale
    const xBar = d3.scaleBand()
        .domain(typeCounts.map(d => d.key))
        .range([0, barWidth])
        .paddingInner(0.2)
        .paddingOuter(0.1);

    // x axis, labels rotated
    g1.append("g")
        .attr("transform", `translate(0, ${barHeight})`)
        .call(d3.axisBottom(xBar))
        .selectAll("text")
            .attr("text-anchor", "end")
            .attr("transform", "rotate(-40)")
            .attr("x", -5)
            .attr("y", 10);

    // x axis label
    g1.append("text")
        .attr("x", barWidth / 2)
        .attr("y", barHeight + 80)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .text("Primary Type");

    // y scale linear, 0 to max count
    const yBar = d3.scaleLinear()
        .domain([0, d3.max(typeCounts, d => d.value)])
        .range([barHeight, 0])
        .nice();

    // y axis
    g1.append("g").call(d3.axisLeft(yBar).ticks(6));

    // y axis label
    g1.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -(barHeight / 2))
        .attr("y", -55)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .text("Number of Pokemon");

    // class "bar" allows bulk highlight updates
    // Interaction 1 —> Selection: clicking a bar focuses that type across all three views
    g1.selectAll(".bar")
        .data(typeCounts)
        .enter().append("rect")
            .attr("class",  "bar")
            .attr("x",      d => xBar(d.key))
            .attr("y",      d => yBar(d.value))
            .attr("width",  xBar.bandwidth())
            .attr("height", d => barHeight - yBar(d.value))
            .attr("fill",   d => typeColorMap[d.key] || "#aaa")
            .style("cursor", "pointer")
            .on("click", function(d) {
                // toggle: clicking the already-selected type deselects it
                selectedType = (selectedType === d.key) ? null : d.key;
                updateBarHighlight();
                clearBrushes();   // reset stale PC brushes whenever type changes
                updatePC();
                updatePie();
            });

    // count label above each bar
    g1.selectAll(".bar-label")
        .data(typeCounts)
        .enter().append("text")
            .attr("class", "bar-label")
            .attr("x",           d => xBar(d.key) + xBar.bandwidth() / 2)
            .attr("y",           d => yBar(d.value) - 3)
            .attr("text-anchor", "middle")
            .attr("font-size",   "9px")
            .text(d => d.value);

    // dim non-selected bars and their labels; outline the active selection
    function updateBarHighlight() {
        g1.selectAll(".bar")
            .transition().duration(250)
            .attr("opacity",      d => !selectedType || selectedType === d.key ? 1 : 0.25)
            .attr("stroke",       d => selectedType === d.key ? "#333" : null)
            .attr("stroke-width", d => selectedType === d.key ? 2 : null);

        g1.selectAll(".bar-label")
            .transition().duration(250)
            .attr("opacity", d => !selectedType || selectedType === d.key ? 1 : 0.25);
    }


    // PIE CHART

    // returns key : value for any subset of rawData
    // all 6 generations are always present so the pie arcs don't appear/disappear abruptly
    function buildGenCounts(data) {
        const map = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0 };
        data.forEach(d => { map[String(d.Generation)]++; });
        return Object.entries(map)
            .map(([key, value]) => ({ key, value }))
            .sort((a, b) => +a.key - +b.key);
    }

    // ordinal color scale for 6 generations, same domain used for legend and arcs
    const genColor = d3.scaleOrdinal()
        .domain(["1","2","3","4","5","6"])
        .range(d3.schemeTableau10);

    // chart group centered in top-right quadrant
    const g2 = svg.append("g")
        .attr("transform", `translate(${pieAreaX + pieAreaW / 2}, ${pieAreaH / 2})`);

    // updatable chart title where text changes when a type filter is active
    const pieTitle = g2.append("text")
        .attr("x", 0)
        .attr("y", -(pieRadius + 22))
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .text("Pokemon Distribution by Generation");

    // pie layout with angles from data values
    const pie = d3.pie().value(d => d.value).sort(null);

    // arc generator for slice bodies
    const arc = d3.arc().innerRadius(0).outerRadius(pieRadius);

    // smaller arc used only to position centroid labels
    const arcLabel = d3.arc()
        .innerRadius(pieRadius * 0.6)
        .outerRadius(pieRadius * 0.6);

    const initialGenCounts = buildGenCounts(rawData);

    // one path per generation 
    g2.selectAll("path")
        .data(pie(initialGenCounts))
        .enter().append("path")
            .attr("d",            arc)
            .attr("fill",         d => genColor(d.data.key))
            .attr("stroke",       "white")
            .attr("stroke-width", 1.5)
            .each(function(d) { this._current = d; }); 

    // count label at arc centroid
    g2.selectAll(".pie-label")
        .data(pie(initialGenCounts))
        .enter().append("text")
            .attr("class",       "pie-label")
            .attr("transform",   d => `translate(${arcLabel.centroid(d)})`)
            .attr("text-anchor", "middle")
            .attr("font-size",   "12px")
            .attr("fill",        "white")
            .attr("font-weight", "bold")
            .text(d => d.data.value);

    // generation legend to the right of the pie
    const gLegX = pieRadius + 15;
    const gLegY = -(initialGenCounts.length * 22) / 2;

    initialGenCounts.forEach((d, i) => {
        // color swatch
        g2.append("rect")
            .attr("x",      gLegX)
            .attr("y",      gLegY + i * 22)
            .attr("width",  14)
            .attr("height", 14)
            .attr("fill",   genColor(d.key));

        // label with count
        g2.append("text")
            .attr("class",     `gen-legend gen-legend-${d.key}`)
            .attr("x",         gLegX + 20)
            .attr("y",         gLegY + i * 22 + 11)
            .attr("font-size", "12px")
            .text(`Gen ${d.key}  (${d.value})`);
    });

    // Animated Transition —> Filtering: arc-tween smoothly reshapes slices to new generation counts
    function updatePie() {
        const subset    = selectedType ? rawData.filter(d => d.Type_1 === selectedType) : rawData;
        const newCounts = buildGenCounts(subset);

        // update title to reflect current filter
        pieTitle.text(selectedType
            ? `${selectedType} — Distribution by Generation`
            : "Pokemon Distribution by Generation");

        // smooth arc tween interpolates start/end angles for each slice
        g2.selectAll("path")
            .data(pie(newCounts))
            .transition().duration(600)
            .attrTween("d", function(d) {
                const interp  = d3.interpolate(this._current, d);
                this._current = d;         // update stored state for the next tween
                return t => arc(interp(t));
            });

        // slide centroid labels to their new positions
        g2.selectAll(".pie-label")
            .data(pie(newCounts))
            .transition().duration(600)
            .attr("transform", d => `translate(${arcLabel.centroid(d)})`)
            .text(d => d.data.value > 0 ? d.data.value : "");

        // update legend counts to match the current subset
        newCounts.forEach(d => {
            g2.select(`.gen-legend-${d.key}`)
                .text(`Gen ${d.key}  (${d.value})`);
        });
    }


    // PARALLEL COORDINATES 

    // type averages for 5 contrasting types 
    const featuredTypes = ["Dragon", "Steel", "Fighting", "Psychic", "Bug"];

    // mean of each stat per type, filtered to 5 featured types
    const typeAvgs = d3.nest()
        .key(d => d.Type_1)
        .rollup(v => {
            const avg = {};
            pcDimensions.forEach(dim => { avg[dim] = d3.mean(v, d => d[dim]); });
            return avg;
        })
        .entries(rawData)
        .filter(d => featuredTypes.includes(d.key));

    // chart group in bottom half
    const g3 = svg.append("g")
        .attr("transform", `translate(${pcMargin.left}, ${pcOffsetY + pcMargin.top})`);

    // updatable chart title
    const pcTitle = g3.append("text")
        .attr("class",       "pc-title")
        .attr("x",           pcWidth / 2)
        .attr("y",           -30)
        .attr("text-anchor", "middle")
        .attr("font-size",   "16px")
        .attr("font-weight", "bold")
        .text("Average Base Stats — 5 Contrasting Types");

    // interaction hint for the brushing interaction
    g3.append("text")
        .attr("x",           pcWidth / 2)
        .attr("y",           -13)
        .attr("text-anchor", "middle")
        .attr("font-size",   "10px")
        .attr("fill",        "#888")
        .text("Drag on an axis to brush-filter lines");

    // x scale w/ equally spaced stat axes
    const xPC = d3.scalePoint()
        .domain(pcDimensions)
        .range([0, pcWidth])
        .padding(0.1);

    // y scale per stat w/ domain from full dataset so axes stay fixed when switching views
    const yPC = {};
    pcDimensions.forEach(dim => {
        yPC[dim] = d3.scaleLinear()
            .domain([0, d3.max(rawData, d => d[dim])])
            .range([pcHeight, 0])
            .nice();
    });

    // svg path string for a type-average row
    function pcPathAvg(d) {
        return d3.line()(pcDimensions.map(dim => [xPC(dim), yPC[dim](d.value[dim])]));
    }

    // svg path string for an individual Pokemon row
    function pcPathIndiv(d) {
        return d3.line()(pcDimensions.map(dim => [xPC(dim), yPC[dim](d[dim])]));
    }

    // per-axis brushY instances and their container groups
    const brushes = {};
    const brushGs = {};

    pcDimensions.forEach(dim => {
        // axis group at this dimension's x position
        const axisG = g3.append("g")
            .attr("transform", `translate(${xPC(dim)}, 0)`);

        // tick axis for this stat
        axisG.call(d3.axisLeft(yPC[dim]).ticks(5));

        // stat name above axis
        axisG.append("text")
            .attr("y",           -12)
            .attr("text-anchor", "middle")
            .attr("font-size",   "13px")
            .attr("fill",        "black")
            .text(dim);

        // Interaction 2 —> Brushing: narrow band so the brush handle doesn't hide the lines
        brushes[dim] = d3.brushY()
            .extent([[-8, 0], [8, pcHeight]])
            .on("brush", updateBrushHighlight)
            .on("end",   updateBrushHighlight);

        brushGs[dim] = axisG.append("g")
            .attr("class", `brush-axis-${dim}`)
            .call(brushes[dim]);
    });

    // draw lines and labels for the current selectedType state (averages or individuals)
    function drawPCLines() {
        const isIndiv  = selectedType !== null;
        const data     = isIndiv ? rawData.filter(d => d.Type_1 === selectedType) : typeAvgs;
        const pathFn   = isIndiv ? pcPathIndiv : pcPathAvg;
        const colorFn  = isIndiv
            ? () => typeColorMap[selectedType] || "#aaa"
            : d  => typeColorMap[d.key] || "#aaa";

        // individual view uses thinner, more transparent lines to handle many overlapping paths
        const strokeW  = isIndiv ? 1.5  : 2.5;
        const targetOp = isIndiv ? 0.35 : 0.85;

        // lines enter at opacity 0 then fade in 
        g3.selectAll(".pc-line")
            .data(data)
            .enter().append("path")
                .attr("class",        "pc-line")
                .attr("d",            pathFn)
                .attr("fill",         "none")
                .attr("stroke",       colorFn)
                .attr("stroke-width", strokeW)
                .attr("opacity",      0)
                .transition().duration(400)
                .attr("opacity",      targetOp);

        if (isIndiv) {
            // sample-count badge replaces type labels in individual view
            g3.append("text")
                .attr("class",       "pc-label")
                .attr("x",           xPC("Speed") + 10)
                .attr("y",           pcHeight / 2)
                .attr("dy",          "0.35em")
                .attr("font-size",   "11px")
                .attr("fill",        typeColorMap[selectedType] || "#aaa")
                .attr("font-weight", "bold")
                .attr("opacity",     0)
                .text(`n = ${data.length}`)
                .transition().duration(400)
                .attr("opacity",     1);
        } else {
            // type-name label at the right end of each average line
            g3.selectAll(".pc-label")
                .data(typeAvgs)
                .enter().append("text")
                    .attr("class",       "pc-label")
                    .attr("x",           xPC("Speed") + 8)
                    .attr("y",           d => yPC["Speed"](d.value["Speed"]))
                    .attr("dy",          "0.35em")
                    .attr("font-size",   "10px")
                    .attr("fill",        d => typeColorMap[d.key] || "#aaa")
                    .attr("font-weight", "bold")
                    .attr("opacity",     0)
                    .text(d => d.key)
                    .transition().duration(400)
                    .attr("opacity",     1);
        }

        // reflect current state in chart title
        pcTitle.text(isIndiv
            ? `Base Stats — ${selectedType}-type Pokémon`
            : "Average Base Stats — 5 Contrasting Types");
    }

    // Animated Transition —> Filtering: old lines fade out, new lines fade in
    function updatePC() {
        // fade out and remove existing lines and labels
        g3.selectAll(".pc-line, .pc-label")
            .transition().duration(300)
            .attr("opacity", 0)
            .remove();

        // draw new lines after the fade-out completes
        setTimeout(drawPCLines, 350);
    }

    // re-evaluate which lines fall inside every active brush range and adjust their opacity
    function updateBrushHighlight() {
        // rebuild activeBrushes from current UI state of each brush handle
        activeBrushes = {};
        pcDimensions.forEach(dim => {
            const sel = d3.brushSelection(brushGs[dim].node());
            if (sel) {
                // sel = [pixelTop, pixelBottom]; invert so we get [lo, hi] data values
                activeBrushes[dim] = [yPC[dim].invert(sel[1]), yPC[dim].invert(sel[0])];
            }
        });

        const dims    = Object.keys(activeBrushes);
        const isIndiv = selectedType !== null;
        const baseOp  = isIndiv ? 0.35 : 0.85;
        const baseW   = isIndiv ? 1.5  : 2.5;

        g3.selectAll(".pc-line").each(function(d) {
            // check whether this line's values satisfy every active brush range
            const inside = dims.length === 0 || dims.every(dim => {
                const v = isIndiv ? d[dim] : d.value[dim];
                return v >= activeBrushes[dim][0] && v <= activeBrushes[dim][1];
            });

            d3.select(this)
                .attr("opacity",      inside ? (dims.length ? 1 : baseOp) : 0.05)
                .attr("stroke-width", inside ? (dims.length ? baseW * 1.4 : baseW) : 0.5);
        });
    }

    // move all brush handles to null and reset activeBrushes state
    function clearBrushes() {
        pcDimensions.forEach(dim => {
            brushGs[dim].call(brushes[dim].move, null);
        });
        activeBrushes = {};
    }

    // initial PC render
    drawPCLines();

}).catch(error => {
    console.log(error);
});