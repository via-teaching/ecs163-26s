let abFilter = 25;
const width = window.innerWidth;
const height = window.innerHeight;

let scatterLeft = 0, scatterTop = 0;
let scatterMargin = {top: 10, right: 30, bottom: 30, left: 60},
    scatterWidth = 400 - scatterMargin.left - scatterMargin.right,
    scatterHeight = 350 - scatterMargin.top - scatterMargin.bottom;

let distrLeft = 400, distrTop = 0;
let distrMargin = {top: 10, right: 30, bottom: 30, left: 60},
    distrWidth = 700 - distrMargin.left - distrMargin.right;
    distrHeight = 350 - distrMargin.top - distrMargin.bottom;

let teamLeft = 0, teamTop = 400;
let teamMargin = {top: 10, right: 30, bottom: 30, left: 60},
    teamWidth = width - teamMargin.left - teamMargin.right,
    teamHeight = height-450 - teamMargin.top - teamMargin.bottom;

// plots

d3.csv("data/pokemon_alopez247.csv").then(rawData => {
    console.log("rawData", rawData);

    rawData.forEach(function(d){
        d.HP = +d.HP;
        d.Attack = +d.Attack;
        d.Defense = +d.Defense;
        d.Sp_Atk = +d.Sp_Atk;
        d.Sp_Def = +d.Sp_Def;
        d.Speed = +d.Speed;
        d.Total = +d.Total;
        d.Generation = +d.Generation;
        d.Weight_kg = +d.Weight_kg;
        d.Height_m = +d.Height_m;
    });


    const processedData = rawData;
    console.log("processedData", processedData);
    const color = d3.scaleOrdinal()
        .domain([...new Set(processedData.map(d => d.Type_1))])
        .range(d3.schemeTableau10);

    //plot 1: Scatter Plot
    const svg = d3.select("svg");

    const g1 = svg.append("g")
                .attr("width", scatterWidth + scatterMargin.left + scatterMargin.right)
                .attr("height", scatterHeight + scatterMargin.top + scatterMargin.bottom)
                .attr("transform", `translate(${scatterMargin.left}, ${scatterMargin.top})`);

    // X label
    g1.append("text")
    .attr("x", scatterWidth / 2)
    .attr("y", scatterHeight + 50)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .text("Attack");


    // Y label
    g1.append("text")
    .attr("x", -(scatterHeight / 2))
    .attr("y", -40)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("Defense");

    // X ticks
    const x1 = d3.scaleLinear()
    .domain([0, d3.max(processedData, d => d.Attack)])
    .range([0, scatterWidth]);

    const xAxisCall = d3.axisBottom(x1)
                        .ticks(7);
    g1.append("g")
    .attr("transform", `translate(0, ${scatterHeight})`)
    .call(xAxisCall)
    .selectAll("text")
        .attr("y", "10")
        .attr("x", "-5")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-40)");

    // Y ticks
    const y1 = d3.scaleLinear()
    .domain([0, d3.max(processedData, d => d.Defense)])
    .range([scatterHeight, 0]);

    const yAxisCall = d3.axisLeft(y1)
                        .ticks(13);
    g1.append("g").call(yAxisCall);

    // circles
    const circles = g1.selectAll("circle").data(processedData);
// Add circles to represent each Pokémon in the scatterplot
    circles.enter().append("circle")
         .attr("cx", d => x1(d.Attack))
         .attr("cy", d => y1(d.Defense))
         .attr("r", 5)
         .attr("fill", d => color(d.Type_1));
    // Add legend for Pokémon primary types
const legendTypes = color.domain();

const legend = g1.append("g")
    .attr("transform", `translate(${scatterWidth + 20}, 30)`);

legend.selectAll("legendDots")
    .data(legendTypes)
    .enter()
    .append("circle")
    .attr("cx", 0)
    .attr("cy", (d, i) => i * 18)
    .attr("r", 5)
    .attr("fill", d => color(d));

legend.selectAll("legendLabels")
    .data(legendTypes)
    .enter()
    .append("text")
    .attr("x", 10)
    .attr("y", (d, i) => i * 18 + 4)
    .attr("font-size", "11px")
    .text(d => d);
// plot 2: Parallel Coordinates
// Create SVG group for the advanced parallel coordinates visualization
// Define dimensions/statistics shown in the parallel coordinates plot
    const g2 = svg.append("g")
                .attr("width", distrWidth + distrMargin.left + distrMargin.right)
                .attr("height", distrHeight + distrMargin.top + distrMargin.bottom)
                .attr("transform", `translate(${distrLeft}, ${distrTop})`);
    g2.append("text")
        .attr("x", distrWidth + 100/ 2)
        .attr("y", 20)
        .attr("font-size", "18px")
        .attr("text-anchor", "middle")
        .text("Pokemon Stats Parallel Coordinates");

// Define the Pokemon statistics shown in the parallel coordinates plot
    const dimensions = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];

// Create horizontal positioning scale for each dimension
    const xParallel = d3.scalePoint()
        .domain(dimensions)
        .range([60, distrWidth + 500]);

// Create a separate vertical scale for each Pokémon statistic
    const yParallel = {};

    dimensions.forEach(dim => {
        yParallel[dim] = d3.scaleLinear()
            .domain([0, d3.max(processedData, d => d[dim])])
            .range([distrHeight, 50])
            .nice();
    });
// Function used to generate a line path across all dimensions
    function path(d) {
        return d3.line()(
            dimensions.map(dim => [xParallel(dim), yParallel[dim](d[dim])])
        );
    }
// Draw one line per Pokemon across all dimensions
    g2.selectAll(".parallelLine")
        .data(processedData)
        .enter()
        .append("path")
        .attr("class", "parallelLine")
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", "#69b3a2")
        .attr("stroke-width", 1)
        .attr("opacity", 0.25);

    dimensions.forEach(dim => {
        const axisGroup = g2.append("g")
            .attr("transform", `translate(${xParallel(dim)}, 0)`)
            .call(d3.axisLeft(yParallel[dim]).ticks(5));

        axisGroup.append("text")
            .attr("y", 40)
            .attr("text-anchor", "middle")
            .attr("fill", "black")
            .attr("font-size", "12px")
            .text(dim);
});

    //plot 3

    const typeCounts = d3.rollups(
        processedData,
        v => v.length,
        d => d.Type_1
    );

    const typeData = typeCounts.map(d => ({
        type: d[0],
        count: d[1]
    }));


    const g3 = svg.append("g")
                .attr("width", teamWidth + teamMargin.left + teamMargin.right)
                .attr("height", teamHeight + teamMargin.top + teamMargin.bottom)
                .attr("transform", `translate(${teamMargin.left}, ${teamTop})`);

    // X label
    g3.append("text")
    .attr("x", teamWidth / 2)
    .attr("y", teamHeight + 50)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .text("Primary Type");


    // Y label
    g3.append("text")
    .attr("x", -(teamHeight / 2))
    .attr("y", -40)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("Number of Pokémon");

    // X ticks
    const x2 = d3.scaleBand()
    .domain(typeData.map(d => d.type))
    .range([0, teamWidth])
    .paddingInner(0.3)
    .paddingOuter(0.2);

    const xAxisCall2 = d3.axisBottom(x2);
    g3.append("g")
    .attr("transform", `translate(0, ${teamHeight})`)
    .call(xAxisCall2)
    .selectAll("text")
        .attr("y", "10")
        .attr("x", "-5")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-40)");

    // Y ticks
    const y2 = d3.scaleLinear()
    .domain([0, d3.max(typeData, d => d.count)])
    .range([teamHeight, 0])
    .nice();

    const yAxisCall2 = d3.axisLeft(y2)
                        .ticks(6);
    g3.append("g").call(yAxisCall2);

    // bars
    const bars = g3.selectAll("rect").data(typeData);

    bars.enter().append("rect")
    .attr("y", d => y2(d.count))
    .attr("x", d => x2(d.type))
    .attr("width", x2.bandwidth())
    .attr("height", d => teamHeight - y2(d.count))
    .attr("fill", "steelblue");


    }).catch(function(error){
    console.log(error);
});