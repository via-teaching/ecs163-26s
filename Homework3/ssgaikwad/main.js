// HW3 Pokemon Dashboard
// Dataset: Pokemon
// Idea: Explore what makes Pokemon powerful and rare
// View 1: Scatter plot (Catch Rate vs Total) - context overview, pan+zoom + brush
// View 2: Parallel coords (Generation, Total, Weight, Speed) - focus, filters with brush
// View 3: Stacked bar (legendary type breakdown per generation) - focus, updates with brush


// axes for parallel coordinates
let statDims = ["Generation", "Total", "Weight_kg", "Speed"];

// color scheme for legendary vs regular Pokemon
const legendaryColor = {
    false: "#6a9bd8",  // steel blue for regular
    true:  "#FFD700"  // gold for legendary
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

let allData = null;  // cached dataset for resize
let selectedData = null;  // Pokemon selected by brush (null = no brush active)

// draw function renders all views
function draw(){
    const width  = window.innerWidth  - 40;  // 20px frame on left/right
    const height = window.innerHeight - 40;  // 20px frame top/bottom

    // View 1 scatter plot dimensions (top left)
    let s1Margin = { top: 50, right: 20, bottom: 60, left: 65 };
    let s1Width  = Math.floor(width  * 0.40) - s1Margin.left - s1Margin.right;
    let s1Height = Math.floor(height * 0.46) - s1Margin.top  - s1Margin.bottom;

    // View 3 bar chart dimensions (top right)
    let s3Left   = Math.floor(width * 0.40);  // start bar chart after scatter
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

    g1.append("text")  // interaction hint
        .attr("x", s1Width / 2).attr("y", -14)
        .attr("text-anchor", "middle").attr("font-size", "9px").attr("fill", "#888")
        .text("Scroll to zoom • Drag to select Pokemon");

    const xScatter = d3.scaleLinear()  // x scale for Catch_Rate
        .domain([0, d3.max(rawData, d => d.Catch_Rate) + 5]).range([0, s1Width]);

    const yScatter = d3.scaleLinear()  // y scale for Total
        .domain([0, d3.max(rawData, d => d.Total) + 10]).range([s1Height, 0]);

    const xAxisG = g1.append("g")  // x axis group, updated on zoom
        .attr("transform", `translate(0, ${s1Height})`)
        .call(d3.axisBottom(xScatter).ticks(5));

    g1.append("text")  // x label
        .attr("x", s1Width / 2).attr("y", s1Height + 50)
        .attr("text-anchor", "middle").attr("font-size", "11px")
        .text("Catch Rate (higher = easier to catch)");

    const yAxisG = g1.append("g")  // y axis group, updated on zoom
        .call(d3.axisLeft(yScatter).ticks(5));

    g1.append("text")  // y label
        .attr("transform", "rotate(-90)").attr("x", -(s1Height / 2)).attr("y", -50)
        .attr("text-anchor", "middle").attr("font-size", "11px")
        .text("Total Base Stats");

    // transparent background rect so zoom/brush respond anywhere in scatter area
    // g elements are invisible to pointer events by default (only children hit)
    g1.append("rect")
        .attr("width", s1Width).attr("height", s1Height)
        .attr("fill", "none").attr("pointer-events", "all");  // invisible but catches events

    // clip path keeps dots inside scatter bounds during zoom
    frame.append("defs").append("clipPath")  // define clipping rectangle
        .attr("id", "scatter-clip")
        .append("rect")
        .attr("width", s1Width).attr("height", s1Height);

    const dotsG = g1.append("g")  // dots group, clipped so zoomed dots don't overflow
        .attr("clip-path", "url(#scatter-clip)");

    dotsG.selectAll("circle")   // one circle per Pokemon
        .data(rawData)
        .enter().append("circle")
        .attr("cx",      d => xScatter(d.Catch_Rate))  // x position
        .attr("cy",      d => yScatter(d.Total))  // y position
        .attr("r",       3)  // radius
        .attr("fill",    d => legendaryColor[d.isLegendary])  // color by rarity
        .attr("opacity", 0.55);  // semi-transparent

    // zoom behavior: scroll wheel only (drag is reserved for brush)
    // filter limits zoom to wheel events so brush can freely use click+drag
    const scatterZoom = d3.zoom()
        .scaleExtent([1, 10])  // allow up to 10x zoom
        .filter(function() { return d3.event.type === "wheel"; })  // scroll only
        .on("zoom", function() {
            const t  = d3.event.transform;  // current zoom/pan transform
            const xZ = t.rescaleX(xScatter);  // rescaled x axis
            const yZ = t.rescaleY(yScatter);  // rescaled y axis
            xAxisG.call(d3.axisBottom(xZ).ticks(5));  // update x axis ticks
            yAxisG.call(d3.axisLeft(yZ).ticks(5));  // update y axis ticks
            dotsG.selectAll("circle")  // reposition all dots
                .attr("cx", d => xZ(d.Catch_Rate))
                .attr("cy", d => yZ(d.Total));

            // if brush is active, keep selection in sync with new zoom level
            const brushSel = d3.brushSelection(brushG.node());
            if (brushSel) {
                const bx0 = xZ.invert(brushSel[0][0]);  // reinvert brush bounds
                const bx1 = xZ.invert(brushSel[1][0]);
                const by0 = yZ.invert(brushSel[1][1]);
                const by1 = yZ.invert(brushSel[0][1]);
                selectedData = rawData.filter(function(d) {
                    return d.Catch_Rate >= bx0 && d.Catch_Rate <= bx1 &&
                           d.Total     >= by0 && d.Total     <= by1;
                });
                dotsG.selectAll("circle")  // reapply highlight
                    .attr("opacity", function(d) {
                        return d.Catch_Rate >= bx0 && d.Catch_Rate <= bx1 &&
                               d.Total     >= by0 && d.Total     <= by1 ? 0.9 : 0.1;
                    });
            }
        });

    g1.call(scatterZoom);  // attach zoom to scatter group

    // brush selection: drag to select a region of Pokemon
    const brushG = g1.append("g");  // group for brush, sits on top of dots

    const scatterBrush = d3.brush()
        .extent([[0, 0], [s1Width, s1Height]])  // brush can cover full scatter area
        .on("brush end", function() {
            const sel = d3.event.selection;  // [[x0,y0],[x1,y1]] or null if cleared

            if (!sel) {
                selectedData = null;  // no selection, clear filter
                dotsG.selectAll("circle").attr("opacity", 0.55);  // restore all dots
                updatePCLines(topPokemon, "Top 10 Legendary Pokemon: Generation, Total Stats, Weight and Speed");  // reset parallel coords
                updateBarChart(rawData, "Legendary Pokemon per Generation: Breakdown by Type");  // reset bar chart
                return;
            }

            // get current zoom transform so brush maps correctly when zoomed
            const t  = d3.zoomTransform(g1.node());
            const xZ = t.rescaleX(xScatter);  // zoomed x scale
            const yZ = t.rescaleY(yScatter);  // zoomed y scale

            // convert brush pixel bounds to data values
            const x0 = xZ.invert(sel[0][0]);  // left catch rate bound
            const x1 = xZ.invert(sel[1][0]);  // right catch rate bound
            const y0 = yZ.invert(sel[1][1]);  // lower total stats bound (y inverted)
            const y1 = yZ.invert(sel[0][1]);  // upper total stats bound

            // filter to Pokemon inside the brushed rectangle
            selectedData = rawData.filter(function(d) {
                return d.Catch_Rate >= x0 && d.Catch_Rate <= x1 &&
                       d.Total     >= y0 && d.Total     <= y1;
            });

            // highlight selected dots, fade out everything else
            dotsG.selectAll("circle")
                .attr("opacity", function(d) {
                    return d.Catch_Rate >= x0 && d.Catch_Rate <= x1 &&
                           d.Total     >= y0 && d.Total     <= y1 ? 0.9 : 0.1;
                });

            // take top 15 by Total from selection for parallel coords
            const displayData = selectedData.slice()
                .sort((a, b) => b.Total - a.Total)
                .slice(0, 15);
            const nLeg = selectedData.filter(d => d.isLegendary).length;  // legendary count
            updatePCLines(displayData,  // update parallel coords with animated fade
                `Brushed: ${selectedData.length} selected • showing top ${displayData.length} by Total Stats`);
            updateBarChart(selectedData,  // update bar chart with animated transitions
                `Legendary Breakdown: ${nLeg} of ${selectedData.length} selected are Legendary`);
        });

    brushG.call(scatterBrush);  // attach brush to its group

    // legend for rarity
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

    const pcTitle = g2.append("text")  // title, updated when brush changes
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

    g2.selectAll(".pc-line")  // one line per Pokemon
        .data(topPokemon, d => d.Name)
        .enter().append("path")
        .attr("class", "pc-line")  // class used by updatePCLines for enter/exit
        .attr("fill", "none")
        .attr("stroke",       d => typeColor[d.Type_1] || "#aaa")  // color by type
        .attr("stroke-width", 2)
        .attr("opacity",      0.85)
        .attr("d", function(d) {
            return d3.line()(statDims.map(function(dim) {  // map each dim to [x, y]
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

    const lgPCTitle = lgPC.append("text")  // legend title, updated on brush
        .attr("font-size", "11px").attr("font-weight", "bold").text("Top 10 Legendary Pokemon (line color = Type):");

    topPokemon.forEach(function(poke, i) {
        const col = Math.floor(i / 2);  // 5 columns
        const row = i % 2;  // 2 rows
        lgPC.append("line")  // color swatch
            .attr("x1", col * 175 + 0).attr("x2", col * 175 + 16)
            .attr("y1", row * 15 + 16).attr("y2", row * 15 + 16)
            .attr("stroke", typeColor[poke.Type_1] || "#aaa").attr("stroke-width", 2.5)
            .attr("class", "lg-line");  // class for legend line swatches
        lgPC.append("text")  // Pokemon name and type
            .attr("x", col * 175 + 20).attr("y", row * 15 + 20)
            .attr("font-size", "9px").attr("class", "lg-label")  // class for legend labels
            .text(poke.Name + " (" + poke.Type_1 + ")");
    });

    // update parallel coord lines with animated fade in/out transition
    // called from brush handler whenever selection changes
    function updatePCLines(displayData, titleText) {
        pcTitle.text(titleText);  // update chart title to reflect current data

        const pcLines = g2.selectAll(".pc-line")
            .data(displayData, d => d.Name);  // key by Name for object constancy

        // exit: fade out lines no longer in selection
        pcLines.exit()
            .transition().duration(400)
            .attr("opacity", 0)
            .remove();

        // enter: new lines start invisible then fade in
        pcLines.enter().append("path")
            .attr("class", "pc-line")
            .attr("fill", "none")
            .attr("stroke",       d => typeColor[d.Type_1] || "#aaa")  // color by type
            .attr("stroke-width", 2)
            .attr("opacity",      0)  // start invisible for fadein
            .attr("d", d => d3.line()(statDims.map(dim => [xPC(dim), yPC[dim](d[dim])])))  // polyline path
            .transition().duration(400)
            .attr("opacity", 0.85);  // fade in

        // update legend title to match current view
        lgPCTitle.text(titleText === "Top 10 Legendary Pokemon: Generation, Total Stats, Weight and Speed"
            ? "Top 10 Legendary Pokemon (line color = Type):"
            : "Brushed selection (line color = Type 1):");

        // clear old legend entries and redraw for current displayData
        lgPC.selectAll(".lg-line").remove();
        lgPC.selectAll(".lg-label").remove();

        displayData.slice(0, 10).forEach(function(poke, i) {  // show up to 10 in legend
            const col = Math.floor(i / 2);  // 5 columns
            const row = i % 2;  // 2 rows
            lgPC.append("line")  // color swatch
                .attr("class", "lg-line")
                .attr("x1", col * 175).attr("x2", col * 175 + 16)
                .attr("y1", row * 15 + 16).attr("y2", row * 15 + 16)
                .attr("stroke", typeColor[poke.Type_1] || "#aaa").attr("stroke-width", 2.5);
            lgPC.append("text")  // Pokemon name and type
                .attr("class", "lg-label")
                .attr("x", col * 175 + 20).attr("y", row * 15 + 20)
                .attr("font-size", "9px").text(poke.Name + " (" + poke.Type_1 + ")");
        });
    }


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

    const barTitle = g3.append("text")  // title, updated on brush
        .attr("x", s3Width / 2).attr("y", -20)
        .attr("text-anchor", "middle").attr("font-size", "14px").attr("font-weight", "bold")
        .text("Legendary Pokemon per Generation: Breakdown by Type");

    const xBar = d3.scaleBand()  // x scale for generations
        .domain(generations).range([0, s3Width]).padding(0.5);  // thinner bars

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

    const yAxisG3 = g3.append("g")  // y axis group, updated on brush
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
            .attr("class", "count-label")  // class so updateBarChart can remove/replace
            .attr("x", xBar(d.gen) + xBar.bandwidth() / 2)  // centered
            .attr("y", yBar(total) - 4)  // above bar
            .attr("text-anchor", "middle").attr("font-size", "11px")
            .text(total);
    });

    // update bar chart with animated transitions when brush selection changes
    // sourceData is the subset of rawData to display (legendaries within selection)
    function updateBarChart(sourceData, titleText) {
        barTitle.text(titleText);  // update chart title

        // recount legendary Pokemon per generation per type from sourceData
        const newCounts = {};
        generations.forEach(function(gen) {  // ensure all generations present
            newCounts[gen] = {};
            legendaryTypes.forEach(t => { newCounts[gen][t] = 0; });
        });
        sourceData.filter(d => d.isLegendary).forEach(function(d) {
            if (newCounts[d.Generation] && newCounts[d.Generation][d.Type_1] !== undefined) {
                newCounts[d.Generation][d.Type_1]++;  // count this legendary
            }
        });

        const newStackData = generations.map(function(gen) {  // format for d3.stack
            const row = { gen: gen };
            legendaryTypes.forEach(t => { row[t] = newCounts[gen][t]; });
            return row;
        });
        const newStacked = stack(newStackData);  // restack

        // rescale y axis to new max count
        const newMax = d3.max(newStackData, d => legendaryTypes.reduce((s, t) => s + d[t], 0));
        yBar.domain([0, Math.max(newMax, 1)]).nice();  // at least 1 to avoid flat axis
        yAxisG3.transition().duration(400).call(d3.axisLeft(yBar).ticks(6));  // animate axis

        // animate bar heights for each type layer
        newStacked.forEach(function(series) {
            g3.selectAll(".bar-" + series.key)
                .data(series)
                .transition().duration(400)
                .attr("y",      d => yBar(d[1]))  // top of segment
                .attr("height", d => Math.max(0, yBar(d[0]) - yBar(d[1])));  // segment height
        });

        // replace count labels with updated totals
        g3.selectAll(".count-label").remove();
        newStackData.forEach(function(d) {
            const total = legendaryTypes.reduce((s, t) => s + d[t], 0);
            g3.append("text")
                .attr("class", "count-label")
                .attr("x", xBar(d.gen) + xBar.bandwidth() / 2)  // centered above bar
                .attr("y", yBar(total) - 4)
                .attr("text-anchor", "middle").attr("font-size", "11px")
                .attr("opacity", 0)
                .transition().duration(400).attr("opacity", 1)  // fade in label
                .text(total);
        });
    }

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
