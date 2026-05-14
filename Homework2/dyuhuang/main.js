let abFilter = 25;
const width = window.innerWidth;
const height = window.innerHeight;

let scatterLeft = 0, scatterTop = 0;
let scatterMargin = {top: 40, right: 30, bottom: 50, left: 60},
    scatterWidth = width / 2 - scatterMargin.left - scatterMargin.right,
    scatterHeight = height * 0.55 - scatterMargin.top - scatterMargin.bottom;

let distrLeft = width / 2, distrTop = 0;
let distrMargin = {top: 40, right: 50, bottom: 50, left: 60},
    distrWidth = width / 2 - distrMargin.left - distrMargin.right,
    distrHeight = height * 0.55 - distrMargin.top - distrMargin.bottom;

let teamLeft = 0, teamTop = height * 0.55;
let teamMargin = {top: 40, right: 30, bottom: 70, left: 60},
    teamWidth = width - teamMargin.left - teamMargin.right,
    teamHeight = height * 0.45 - teamMargin.top - teamMargin.bottom;

// plots
d3.csv("pokemon_alopez247.csv").then(rawData =>{
    console.log("rawData", rawData);

rawData.forEach(function(d){
    d.HP = Number(d.HP);
    d.Attack = Number(d.Attack);
    d.Defense = Number(d.Defense);
    d.Sp_Atk = Number(d.Sp_Atk);
    d.Sp_Def = Number(d.Sp_Def);
    d.Speed = Number(d.Speed);
    });


const processedData = rawData.filter(d =>
    d.Type_1 && !isNaN(d.Attack) && !isNaN(d.Defense)
);

//Useful for later: get the unique types for the color scale
const types = Array.from(new Set(processedData.map(d => d.Type_1))).sort();

// Color scale for types 
const typeColor = d3.scaleOrdinal()
    .domain(types)
    .range(d3.schemeCategory10.concat(d3.schemeSet3));
    console.log("processedData", processedData);

    //plot 1: Scatter Plot
    const svg = d3.select("svg");

    const g1 = svg.append("g")
                .attr("width", scatterWidth + scatterMargin.left + scatterMargin.right)
                .attr("height", scatterHeight + scatterMargin.top + scatterMargin.bottom)
                .attr("transform", `translate(${scatterMargin.left}, ${scatterMargin.top})`);
    
    // Add a title for each of the scatter plots
    g1.append("text")
    .attr("x", scatterWidth / 2)
    .attr("y", -5)
    .attr("text-anchor", "middle")
    .attr("font-weight", "bold")
    .text("Focus View 1: Attack vs Defense");

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
    // CHange to Defense, instead of SO_AB.
    const y1 = d3.scaleLinear()
    .domain([0, d3.max(processedData, d => d.Defense)])
    .range([scatterHeight, 0]);

    const yAxisCall = d3.axisLeft(y1)
                        .ticks(13);
    g1.append("g").call(yAxisCall);

    // circles
    const circles = g1.selectAll("circle").data(processedData);

    circles.enter().append("circle")
        .attr("cx", d => x1(d.Attack))
        .attr("cy", d => y1(d.Defense))
         .attr("r", 5)
         //Set the fill color based on the type of the pokemon using the color scale
        .attr("fill", d => typeColor(d.Type_1));


    const legend = g1.selectAll(".legend")
        .data(types)
        .enter().append("g")
        .attr("class", "legend")
        .attr("transform", function(d, i) {
            const col = Math.floor(i / 9);
            const row = i % 9;
            return `translate(${scatterWidth - 110 + col * 60}, ${row * 14})`;
        });

    legend.append("rect")
        .attr("width", 10)
        .attr("height", 10)
        .attr("fill", d => typeColor(d));

    // Legend name
    legend.append("text")
        .attr("x", 14)
        .attr("y", 9)
        .style("font-size", "10px")
        .text(d => d);
    
    const g2 = svg.append("g")
                .attr("width", distrWidth + distrMargin.left + distrMargin.right)
                .attr("height", distrHeight + distrMargin.top + distrMargin.bottom)
                .attr("transform", `translate(${distrLeft}, ${distrTop})`);

    //plot 2: Bar Chart for Team Player Count
    // THis is the Pokeman type.
    // Count the number of type_1 for each pokemon type
    const typeCounts = {};
    processedData.forEach(function(d) {
        typeCounts[d.Type_1] = (typeCounts[d.Type_1] || 0) + 1;
    });

    // Convert the typeCounts object into an array of objects for easier plotting
    const teamData = Object.keys(typeCounts).map(key => ({
    teamID: key,           
    count: typeCounts[key]
    }))

    teamData.sort((a, b) => b.count - a.count);

    // Add a title for the parallel coordinates plot
    g2.append("text")
    .attr("x", distrWidth / 2)
    .attr("y", -5)
    .attr("text-anchor", "middle")
    .attr("font-weight", "bold")
    .text("Focus View 2 (Advanced): Six Stats Parallel Coordinates");

    // WE need to show six different ability
    const dimensions = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];

    // Create a y scale for each dimension
    const yScales = {};
    dimensions.forEach(function(dim) {
        yScales[dim] = d3.scaleLinear()
            .domain(d3.extent(processedData, d => d[dim]))  // extent返回[最小,最大]
            .range([distrHeight, 0]);
    });

    // Create an x scale for the parallel coordinates
    const xParallel = d3.scalePoint()
        .domain(dimensions)
        .range([0, distrWidth])
        .padding(0.5)

     // Helper function: turn one Pokemon into a polyline path string
    function parallelPath(d) {
        return d3.line()(dimensions.map(function(dim) {
            return [xParallel(dim), yScales[dim](d[dim])];
        }));
    }

    // Draw one line for each Pokemon
    const lines = g2.selectAll("path.pokemon-line").data(processedData);
    lines.enter().append("path")
        .attr("class", "pokemon-line")
        .attr("d", parallelPath)
        .attr("fill", "none")
        .attr("stroke", d => typeColor(d.Type_1))
        .attr("stroke-width", 0.8)
        .attr("opacity", 0.25);
    
    // Draw one vertical axis for each dimension
    const dimensionGroups = g2.selectAll(".dimension")
        .data(dimensions)
        .enter().append("g")
        .attr("class", "dimension")
        .attr("transform", d => `translate(${xParallel(d)}, 0)`);

    // Add tick marks on each vertical axis
    dimensionGroups.each(function(d) {
        d3.select(this).call(d3.axisLeft(yScales[d]).ticks(4));
    });

    // Add dimension name on top of each axis
    dimensionGroups.append("text")
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .attr("fill", "black")
        .style("font-size", "13px")
        .style("font-weight", "bold")
        .text(d => d);

    const g3 = svg.append("g")
                .attr("width", teamWidth + teamMargin.left + teamMargin.right)
                .attr("height", teamHeight + teamMargin.top + teamMargin.bottom)
                .attr("transform", `translate(${teamMargin.left}, ${teamTop})`);

    //g3 title
    g3.append("text")
    .attr("x", teamWidth / 2)
    .attr("y", -5)
    .attr("text-anchor", "middle")
    .attr("font-weight", "bold")
    .text("Overview: Number of Pokemon by Primary Type");


    // X label
    // Change to primary type, instead of teamID.
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
    .text("Number of Pokemon");

    // X ticks
    const x2 = d3.scaleBand()
    .domain(teamData.map(d => d.teamID))
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
    .domain([0, d3.max(teamData, d => d.count)])
    .range([teamHeight, 0])
    .nice();

    const yAxisCall2 = d3.axisLeft(y2)
                        .ticks(6);
    g3.append("g").call(yAxisCall2);

    // bars
    const bars = g3.selectAll("rect").data(teamData);

    bars.enter().append("rect")
    .attr("y", d => y2(d.count))
    .attr("x", d => x2(d.teamID))
    .attr("width", x2.bandwidth())
    .attr("height", d => teamHeight - y2(d.count))
    .attr("fill", d => typeColor(d.teamID));


    }).catch(function(error){
    console.log(error);
});