// HW2 Pokemon Dashboard
// Dataset: Pokemon
// Idea: Explore what makes Pokemon powerful and rare
// View 1: Scatter plot (Catch Rate vs Total) - context overview
// View 2: Parallel coords (Generation, Total, Weight, Speed) - focus on top legendaries
// View 3: Stacked bar (legendary type breakdown per generation) - focus on composition


// axes for parallel coordinates
let statDims = ["Generation", "Total", "Weight_kg", "Speed"];

// color scheme for legendary vs regular Pokemon
const legendaryColor = {
    false: "#6a9bd8",  // steel blue for regular
    true:  "#FFD700"   // gold for legendary
};

// colors map to Pokemon types
const typeColor = {
    "Normal": "#A8A878",
    "Fire": "#F08030",
    "Water": "#149EFF",
    "Electric": "#F8D030",
    "Grass": "#2DCD45",
    "Ice": "#98D8D8",
    "Fighting": "#94352D",
    "Poison": "#883688",
    "Ground": "#E0C068",
    "Flying": "#A890F0",
    "Psychic": "#FF6996",
    "Bug": "#A8B820",
    "Rock": "#B8A038",
    "Ghost": "#614C83",
    "Dragon": "#700AEE",
    "Dark": "#5C483B",
    "Steel": "#B8B8D0",
    "Fairy": "#EE99AC"
};

let allData = null;  //cached dataset for resize

// draw function renders all views
function draw(){
    const width  = window.innerWidth  - 40;  // 20px frame on left/right
    const height = window.innerHeight - 40;  // 20px frame top/bottom

    // View 1 scatter plot dimensions (top left)
    let s1Margin = { top: 50, right: 20, bottom: 60, left: 65 };
    let s1Width  = Math.floor(width  * 0.27) - s1Margin.left - s1Margin.right;
    let s1Height = Math.floor(height * 0.46) - s1Margin.top  - s1Margin.bottom;

    // View 3 bar chart dimensions (top right)
    let s3Left   = Math.floor(width * 0.27);  // adjusting size
    let s3Margin = { top: 50, right: 20, bottom: 90, left: 65 };
    let s3Width  = width - s3Left - s3Margin.left - s3Margin.right;
    let s3Height = Math.floor(height * 0.46) - s3Margin.top  - s3Margin.bottom;

    // View 2 parallel coords dimensions (bottom)
    let s2Top    = Math.floor(height * 0.51);  // gap between rows
    let s2Margin = { top: 55, right: 30, bottom: 90, left: 65 };
    let s2Width  = width - s2Margin.left - s2Margin.right;
    let s2Height = height - s2Top - s2Margin.top - s2Margin.bottom;

    const rawData = allData;  // use cached dataset

    const svg = d3.select("svg");  // root SVG
    svg.selectAll("*").remove();  // clear before redraw

    const frame = svg.append("g")  // wrapper group for 20px frame
        .attr("transform", "translate(20, 20)");



    // View 1 scatter plot
    const g1 = frame.append("g")  // container group
        .attr("transform", `translate(${s1Margin.left}, ${s1Margin.top})`);

    g1.append("text")  // title
        .attr("x", s1Width / 2).attr("y", -28)
        .attr("text-anchor", "middle").attr("font-size", "12px").attr("font-weight", "bold")
        .text("Catch Rate vs. Total Stats (Overview)");

    const xScatter = d3.scaleLinear()  // x scale for Catch_Rate
        .domain([0, d3.max(rawData, d => d.Catch_Rate) + 5]).range([0, s1Width]);

    const yScatter = d3.scaleLinear()  // y scale for Total
        .domain([0, d3.max(rawData, d => d.Total) + 10]).range([s1Height, 0]);

    g1.append("g")  // x axis
        .attr("transform", `translate(0, ${s1Height})`)
        .call(d3.axisBottom(xScatter).ticks(5));

    g1.append("text")  // x label
        .attr("x", s1Width / 2).attr("y", s1Height + 50)
        .attr("text-anchor", "middle").attr("font-size", "11px")
        .text("Catch Rate (higher = easier to catch)");

    g1.append("g")  // y axis
        .call(d3.axisLeft(yScatter).ticks(5));

    g1.append("text")  // y label
        .attr("transform", "rotate(-90)").attr("x", -(s1Height / 2)).attr("y", -50)
        .attr("text-anchor", "middle").attr("font-size", "11px")
        .text("Total Base Stats");

    g1.selectAll("circle")  // one circle per Pokemon
        .data(rawData)
        .enter().append("circle")
        .attr("cx",      d => xScatter(d.Catch_Rate))  // x position
        .attr("cy",      d => yScatter(d.Total))  // y position
        .attr("r",       3)  // radius
        .attr("fill",    d => legendaryColor[d.isLegendary])  // color by rarity
        .attr("opacity", 0.55);  // semi-transparent

    // legen for rarity
    const lgS = g1.append("g")  // legend group
        .attr("transform", `translate(${s1Width - 105}, 5)`);

    lgS.append("text")  // legend title
        .attr("font-size", "10px").attr("font-weight", "bold").text("Rarity:");

    [true, false].forEach(function(val, i) {
        lgS.append("circle")  // color swatch
            .attr("cx", 6).attr("cy", i * 16 + 16)
            .attr("r", 5).attr("fill", legendaryColor[val]);
        lgS.append("text")  // label
            .attr("x", 15).attr("y", i * 16 + 20)
            .attr("font-size", "10px")
            .text(val ? "Legendary" : "Regular");
    });


    // View 2 parallel coords
    // find strongest legendary per type, then take top 10
    const bestLegByType = {};  // track best legendary per type
    rawData.filter(d => d.isLegendary).forEach(function(d) {
        if (!bestLegByType[d.Type_1] || d.Total > bestLegByType[d.Type_1].Total) {
            bestLegByType[d.Type_1] = d;  // keep highest Total
        }
    });
    const topPokemon = Object.values(bestLegByType)
        .sort((a, b) => b.Total - a.Total)  // sort by Total
        .slice(0, 10);  // top 10

    const g2 = frame.append("g")  // container group
        .attr("transform", `translate(${s2Margin.left}, ${s2Top + s2Margin.top})`);

    g2.append("text")  // title
        .attr("x", s2Width / 2).attr("y", -35)
        .attr("text-anchor", "middle").attr("font-size", "14px").attr("font-weight", "bold")
        .text("Top 10 Legendary Pokemon: Generation, Total Stats, Weight and Speed");

    // cap axis spread for readability
    const pcAxisWidth = Math.min(s2Width, 950);
    const pcOffset    = (s2Width - pcAxisWidth) / 2;  // center axes

    const xPC = d3.scalePoint()  // x scale for axis positions
        .domain(statDims).range([pcOffset, pcOffset + pcAxisWidth]).padding(0.1);

    // one y scale per axis
    const yPC = {};
    statDims.forEach(function(dim) {
        yPC[dim] = d3.scaleLinear()  // y scale for this dimension
            .domain([d3.min(rawData, d => d[dim]), d3.max(rawData, d => d[dim])])
            .range([s2Height, 0]);
    });

    g2.selectAll(".line-top")  // one line per Pokemon
        .data(topPokemon)
        .enter().append("path")
        .attr("class", "line-top")
        .attr("fill", "none")
        .attr("stroke",       d => typeColor[d.Type_1] || "#aaa")  // color by type
        .attr("stroke-width", 2)
        .attr("opacity",      0.85)
        .attr("d", function(d) {
            return d3.line()(statDims.map(function(dim) {  // map to coordinates
                return [xPC(dim), yPC[dim](d[dim])];
            }));
        });

    statDims.forEach(function(dim) {
        const axG = g2.append("g")  // group for axis
            .attr("transform", `translate(${xPC(dim)}, 0)`);
        const ticks = dim === "Generation" ? 6 : 5;  // more ticks for Generation
        axG.call(d3.axisLeft(yPC[dim]).ticks(ticks));  // vertical axis
        axG.append("text")  // axis label
            .attr("y", -12).attr("text-anchor", "middle")
            .attr("font-size", "12px").attr("font-weight", "bold").attr("fill", "#222")
            .text(dim === "Weight_kg" ? "Weight (kg)" : dim === "Total" ? "Total Stats" : dim === "Generation" ? "Generation" : "Speed");
    });

    // legend for top 10 Pokemon
    const lgPC = g2.append("g")  // legend group
        .attr("transform", `translate(${pcOffset}, ${s2Height + 14})`);

    lgPC.append("text")  // legend title
        .attr("font-size", "11px").attr("font-weight", "bold").text("Top 10 Legendary Pokemon (line color = Type):");

    topPokemon.forEach(function(poke, i) {
        const col = Math.floor(i / 2);  // 5 columns
        const row = i % 2;  // 2 rows
        lgPC.append("line")  // color swatch
            .attr("x1", col * 175 + 0).attr("x2", col * 175 + 16)
            .attr("y1", row * 15 + 16).attr("y2", row * 15 + 16)
            .attr("stroke", typeColor[poke.Type_1] || "#aaa").attr("stroke-width", 2.5);
        lgPC.append("text")  // Pokemon name and type
            .attr("x", col * 175 + 20).attr("y", row * 15 + 20)
            .attr("font-size", "9px").text(poke.Name + " (" + poke.Type_1 + ")");
    });


    // View 3 Stacked bar chart
    // count legendary Pokemon per generation by type
    const typeSeen = {};
    rawData.forEach(function(d) { if (d.isLegendary) typeSeen[d.Type_1] = true; });
    const legendaryTypes = Object.keys(typeSeen).sort();  // unique types of legendary Pokemon
    const genTypeCounts = {};  // track counts
    rawData.filter(d => d.isLegendary).forEach(function(d) {
        if (!genTypeCounts[d.Generation]) {
            genTypeCounts[d.Generation] = {};
            legendaryTypes.forEach(t => { genTypeCounts[d.Generation][t] = 0; });
        }
        genTypeCounts[d.Generation][d.Type_1]++;
    });

    const generations = Object.keys(genTypeCounts).sort();  // sorted generations
    const stackData = generations.map(function(gen) {  // format for d3.stack
        const row = { gen: gen };
        legendaryTypes.forEach(t => { row[t] = genTypeCounts[gen][t] || 0; });
        return row;
    });

    const stack = d3.stack().keys(legendaryTypes);  // stack generator
    const stacked = stack(stackData);

    const g3 = frame.append("g")  // container group
        .attr("transform", `translate(${s3Left + s3Margin.left}, ${s3Margin.top})`);

    g3.append("text")  // title
        .attr("x", s3Width / 2).attr("y", -20)
        .attr("text-anchor", "middle").attr("font-size", "14px").attr("font-weight", "bold")
        .text("Legendary Pokemon per Generation: Breakdown by Type");

    const xBar = d3.scaleBand()  // x scale for generations
        .domain(generations).range([0, s3Width]).padding(0.3);

    const yBar = d3.scaleLinear()  // y scale for counts
        .domain([0, d3.max(stackData, d => legendaryTypes.reduce((s, t) => s + d[t], 0))])
        .range([s3Height, 0]).nice();

    g3.append("g")  // x axis
        .attr("transform", `translate(0, ${s3Height})`)
        .call(d3.axisBottom(xBar).tickFormat(d => "Gen " + d));

    g3.append("text")  // x label
        .attr("x", s3Width / 2).attr("y", s3Height + 42)
        .attr("text-anchor", "middle").attr("font-size", "12px")
        .text("Generation");

    g3.append("g")  // y axis
        .call(d3.axisLeft(yBar).ticks(6));

    g3.append("text")  // y label
        .attr("transform", "rotate(-90)").attr("x", -(s3Height / 2)).attr("y", -50)
        .attr("text-anchor", "middle").attr("font-size", "12px")
        .text("Number of Legendary Pokemon");

    stacked.forEach(function(series) {  // one layer per type
        g3.selectAll(".bar-" + series.key)
            .data(series)
            .enter().append("rect")
            .attr("class",  "bar-" + series.key)  // rect for each generation
            .attr("x",      d => xBar(d.data.gen))  // x position
            .attr("y",      d => yBar(d[1]))  // top of segment
            .attr("height", d => Math.max(0, yBar(d[0]) - yBar(d[1])))  // height
            .attr("width",  xBar.bandwidth())  // width
            .attr("fill",   typeColor[series.key] || "#aaa");  // color by type
    });

    // total count labels above bars
    stackData.forEach(function(d) {
        const total = legendaryTypes.reduce((s, t) => s + d[t], 0);
        g3.append("text")  // count label above bar
            .attr("x", xBar(d.gen) + xBar.bandwidth() / 2)  // centered
            .attr("y", yBar(total) - 4)  // above bar
            .attr("text-anchor", "middle").attr("font-size", "11px")
            .text(total);
    });

    // legend for types
    const lgBar = g3.append("g")  // legend group
        .attr("transform", `translate(0, ${s3Height + 55})`);

    lgBar.append("text")  // legend title
        .attr("font-size", "10px").attr("font-weight", "bold").text("Legendary Type:");

    legendaryTypes.forEach(function(type, i) {
        const col = Math.floor(i / 3);  // 3 rows
        const row = i % 3;
        lgBar.append("rect")  // color swatch
            .attr("x", col * 105 + 105).attr("y", row * 14 + 2)
            .attr("width", 10).attr("height", 9)
            .attr("fill", typeColor[type] || "#aaa");
        lgBar.append("text")  // type label
            .attr("x", col * 105 + 118).attr("y", row * 14 + 10)
            .attr("font-size", "9px").text(type);
    });

}

// load CSV and parse data
d3.csv("data/pokemon.csv").then(rawData =>{
    // convert strings to numbers and booleans
    rawData.forEach(function(d){
        d.HP = Number(d.HP);  d.Attack = Number(d.Attack);  d.Defense = Number(d.Defense);
        d.Sp_Atk = Number(d.Sp_Atk);  d.Sp_Def = Number(d.Sp_Def);  d.Speed = Number(d.Speed);
        d.Total = Number(d.Total);  d.Generation = Number(d.Generation);
        d.Weight_kg = Number(d.Weight_kg);  d.Catch_Rate = Number(d.Catch_Rate);
        d.isLegendary = d.isLegendary === "True";  // string to boolean
    });

    allData = rawData;  // cache for resize
    draw();

    }).catch(function(error){
    console.log(error);
});

// redraw on resize
window.addEventListener("resize", function(){
    if (allData) draw();
});
