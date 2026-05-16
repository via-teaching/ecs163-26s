const colours = {
    normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C',
    grass: '#7AC74C', ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1',
    ground: '#E2BF65', flying: '#A98FF3', psychic: '#F95587', bug: '#A6B91A',
    rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', dark: '#705746',
    steel: '#B7B7CE', fairy: '#D685AD'
};

// Helper function to get the color
const getPokemonColor = (type) => {
    if (!type) return "#ccc"; // Default gray if type is missing
    return colours[type.toLowerCase()] || "#ccc";
};

const labelMap = {
    "HP": "HP",
    "Attack": "Attack",
    "Defense": "Defense",
    "Sp_Atk": "Special Attack",
    "Sp_Def": "Special Defense",
    "Speed": "Speed"
};

d3.csv("pokemon_alopez247.csv").then( data => {
    /* Processing data for bar chart*/
    /*Count how many pokemnon are in each type, where v is the reducer by count*/
    const typeCount = d3.rollup(data, v => v.length, d => d.Type_1);
    const chartData = Array.from(typeCount, ([type, count]) => ({type, count}));

    /*Plot 1: Bar Chart*/
    const barChartContatiner = d3.select("#bar-chart").node().getBoundingClientRect();
    const barMargins = {top: 50, right: 30, bottom: 90, left: 60};
    const barWidth = barChartContatiner.width - barMargins.left - barMargins.right;
    const barHeight = barChartContatiner.height - barMargins.top - barMargins.bottom;

    const svg = d3.select("#bar-chart")
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .append("g")
        /* Move the coordinate from 0,0 top left to the coordinate of the margins*/
        .attr("transform", `translate(${barMargins.left},${barMargins.top})`);
    
    // X scale
    const xScale = d3.scaleBand()
        .domain(chartData.map(d => d.type))
        .range([0, barWidth])
        .padding(0.2);
    
    // Y scale
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(chartData, d => d.count) + 10])
        .range([barHeight, 0])

    svg.selectAll(".bar").data(chartData)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => xScale(d.type))
        .attr("y", d => yScale(d.count))
        .attr("width", xScale.bandwidth())
        .attr("height", d => barHeight - yScale(d.count))
        .attr("fill", "steelblue");

    // Add the X Axis
    svg.append("g")
        .attr("transform", `translate(0,${barHeight})`)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .attr("transform", "rotate(-45)") // Rotates labels so they don't overlap
        .style("text-anchor", "end");

    // Add the Y Axis
    svg.append("g")
        .call(d3.axisLeft(yScale));
    
    // X-Axis Label
    svg.append("text")
        .attr("x", barWidth / 2)
        .attr("y", barHeight + barMargins.bottom - 35)
        .attr("text-anchor", "middle")
        .text("Pokemon Type");

    // Y-Axis Label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -barMargins.left + 25)
        .attr("x", -barHeight / 2)
        .attr("text-anchor", "middle")
        .text("Number of Pokemon");

    

    /* Plot 2: Scatter Plot */
    const scatterContainer = d3.select("#scatter-plot").node().getBoundingClientRect();
    const scatterMargins = {top: 50, right: 30, bottom: 80, left: 60};
    const scatterWidth = scatterContainer.width - scatterMargins.left - scatterMargins.right;
    const scatterHeight = scatterContainer.height - scatterMargins.top - scatterMargins.bottom;

    const scatterSvg = d3.select("#scatter-plot")
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .append("g")
        .attr("transform", `translate(${scatterMargins.left},${scatterMargins.top})`);

    const xScatter = d3.scaleLinear()
        .domain([0, d3.max(data, d => +d.Attack)])
        .range([0, scatterWidth]);
    
    const yScatter = d3.scaleLinear()
        .domain([0, d3.max(data, d => +d.Defense)])
        .range([scatterHeight, 0]);
    
    scatterSvg.selectAll("circle")
        .data(data)
        .enter().append("circle")
        .attr("cx", d => xScatter(+d.Attack))
        .attr("cy", d => yScatter(+d.Defense))
        .attr("r", 4)
        .style("fill", "#0898e0cc")
        .style("opacity", 0.5)
    
    // Add the X Axis
    scatterSvg.append("g")
        .attr("transform", `translate(0,${scatterHeight})`)
        .call(d3.axisBottom(xScatter))

    // Add the Y Axis
    scatterSvg.append("g")
        .call(d3.axisLeft(yScatter));

    // X-label
     scatterSvg.append("text")
    .attr("x", scatterWidth / 2)
    .attr("y", scatterHeight + 40)
    .attr("text-anchor", "middle")
    .text("Attack Stat");

    // Y-label
    scatterSvg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -35)
        .attr("x", -(scatterHeight / 2))
        .attr("text-anchor", "middle")
        .text("Defense Stat");

    /* Plot 3: Parallel Coordinates */
    const pcContainer = d3.select("#advanced-view").node().getBoundingClientRect();
    const pcMargins = {top: 50, right:150, bottom: 50, left: 50};
    const pcWidth = pcContainer.width - pcMargins.left - pcMargins.right;
    const pcHeight = pcContainer.height - pcMargins.top - pcMargins.bottom;

    const pcSvg = d3.select("#advanced-view")
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .append("g")
        .attr("transform", `translate(${pcMargins.left},${pcMargins.top})`);
    
    // Dimensions for comparison
    const dimensions = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];

    // 2. For each dimension, build a corresponding Y linear scale
    const yScales = {};
    dimensions.forEach(name => {
        yScales[name] = d3.scaleLinear()
            .domain(d3.extent(data, d => +d[name])) // Get [min, max] for each stat
            .range([pcHeight, 0])
    });

    // X scale
    const xScalePC = d3.scalePoint()
        .domain(dimensions)
        .range([0, pcWidth]);
    
    // Function to draw the lines
    const lineGenerator = d3.line();
    function drawPath(d) {
        return lineGenerator(dimensions.map(p => [xScalePC(p), yScales[p](d[p])]));
    }

    // 5. Draw the lines
    pcSvg.selectAll("myPath")
        .data(data)
        .enter().append("path")
        .attr("d", drawPath)
        .style("fill", "none")
        .style("stroke", d => getPokemonColor(d.Type_1)) 
        .style("opacity", 0.2);

    // 6. Draw the vertical axes
    pcSvg.selectAll("myAxis")
        .data(dimensions).enter()
        .append("g")
        .attr("transform", d => `translate(${xScalePC(d)})`)
        .each(function(d) { d3.select(this).call(d3.axisLeft().scale(yScales[d])); })
        .append("text")
        .style("text-anchor", "middle")
        .attr("y", -15)
        .text(d => labelMap[d])
        .style("fill", "black")
        .style("font-weight", "bold");
    
    // Add a Legend for the PC
    const legendArea = pcSvg.append("g")
        .attr("transform", `translate(${pcWidth + 20}, 0)`);

    const allTypesOrdered = Object.keys(colours);

    allTypesOrdered.forEach((type, i) => {
        // Split legends into 2 column, 9 labels/ column
        const column = Math.floor(i / 9); 
        const row = i % 9;
        const xOffset = column * 70; // Adjust 70 based on the width of your type names
        const yOffset = row * 20;

        const legendRow = legendArea.append("g")
            .attr("transform", `translate(${xOffset}, ${yOffset})`);

        legendRow.append("rect")
            .attr("width", 10)
            .attr("height", 10)
            .attr("fill", getPokemonColor(type));

        legendRow.append("text")
            .attr("x", 15)
            .attr("y", 10)
            .style("font-size", "10px")
            .style("text-transform", "capitalize")
            .text(type);
    });
});
