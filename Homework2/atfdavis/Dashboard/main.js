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
let barMargin = { top: 50, right: 20, bottom: 90, left: 70 };
let barWidth  = Math.round(width * 0.55) - barMargin.left - barMargin.right;
let barHeight = Math.round(height * 0.5) - barMargin.top  - barMargin.bottom;

// pie chart
let pieAreaX  = Math.round(width * 0.55);
let pieAreaW  = width - pieAreaX;
let pieAreaH  = Math.round(height * 0.5);
let pieRadius = Math.min(pieAreaW, pieAreaH) / 2 - 50;

// parallel coordinates
let pcMargin  = { top: 50, right: 220, bottom: 50, left: 60 };
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


    // bar chart

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
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .text("Pokemon Count by Primary Type");

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

    // one bar per type, colored by type
    g1.selectAll("rect")
        .data(typeCounts)
        .enter().append("rect")
            .attr("x",      d => xBar(d.key))
            .attr("y",      d => yBar(d.value))
            .attr("width",  xBar.bandwidth())
            .attr("height", d => barHeight - yBar(d.value))
            .attr("fill",   d => typeColorMap[d.key] || "#aaa");

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


    // pie chart

    // count per generation, sorted 1–6
    const genCounts = d3.nest()
        .key(d => d.Generation)
        .rollup(v => v.length)
        .entries(rawData)
        .sort((a, b) => +a.key - +b.key);

    // ordinal color scale for 6 generations
    const genColor = d3.scaleOrdinal()
        .domain(genCounts.map(d => d.key))
        .range(d3.schemeTableau10);

    // chart group centered in top-right quadrant
    const g2 = svg.append("g")
        .attr("transform", `translate(${pieAreaX + pieAreaW / 2}, ${pieAreaH / 2})`);

    // chart title
    g2.append("text")
        .attr("x", 0)
        .attr("y", -(pieRadius + 22))
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .text("Pokemon Distribution by Generation");

    // pie layout w/ angles from data values
    const pie = d3.pie().value(d => d.value).sort(null);

    // arc generator for slice bodies
    const arc = d3.arc().innerRadius(0).outerRadius(pieRadius);

    // smaller arc for label centroid positions
    const arcLabel = d3.arc()
        .innerRadius(pieRadius * 0.6)
        .outerRadius(pieRadius * 0.6);

    // one path per generation
    g2.selectAll("path")
        .data(pie(genCounts))
        .enter().append("path")
            .attr("d",            arc)
            .attr("fill",         d => genColor(d.data.key))
            .attr("stroke",       "white")
            .attr("stroke-width", 1.5);

    // count label at arc centroid
    g2.selectAll(".pie-label")
        .data(pie(genCounts))
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
    const gLegY = -(genCounts.length * 22) / 2;

    genCounts.forEach((d, i) => {
        // color swatch
        g2.append("rect")
            .attr("x",      gLegX)
            .attr("y",      gLegY + i * 22)
            .attr("width",  14)
            .attr("height", 14)
            .attr("fill",   genColor(d.key));

        // generation label
        g2.append("text")
            .attr("x",         gLegX + 20)
            .attr("y",         gLegY + i * 22 + 11)
            .attr("font-size", "12px")
            .text(`Gen ${d.key}  (${d.value})`);
    });


    // parallel coordinates

    // types selected for contrasting stat profiles
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

    // chart title
    g3.append("text")
        .attr("x",           pcWidth / 2)
        .attr("y",           -28)
        .attr("text-anchor", "middle")
        .attr("font-size",   "16px")
        .attr("font-weight", "bold")
        .text("Average Base Stats — 5 Contrasting Types");

    // x scale equally spaced each stat axis
    const xPC = d3.scalePoint()
        .domain(pcDimensions)
        .range([0, pcWidth])
        .padding(0.1);

    // independent y scale per stat
    const yPC = {};
    pcDimensions.forEach(dim => {
        yPC[dim] = d3.scaleLinear()
            .domain([0, d3.max(typeAvgs, d => d.value[dim])])
            .range([pcHeight, 0])
            .nice();
    });

    // returns svg path for one type's profile across all 6 axes
    function pcPath(d) {
        return d3.line()(pcDimensions.map(dim => [xPC(dim), yPC[dim](d.value[dim])]));
    }

    // one bold line per type
    g3.selectAll(".pc-line")
        .data(typeAvgs)
        .enter().append("path")
            .attr("class",        "pc-line")
            .attr("d",            pcPath)
            .attr("fill",         "none")
            .attr("stroke",       d => typeColorMap[d.key] || "#aaa")
            .attr("stroke-width", 2.5)
            .attr("opacity",      0.85);

    // type name label at the right end of each line
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
            .text(d => d.key);

    // vertical axis and label for each dimension
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
    });

}).catch(error => {
    console.log(error);
});
