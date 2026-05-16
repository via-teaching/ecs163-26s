const colours = {
    normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C',
    grass: '#7AC74C', ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1',
    ground: '#E2BF65', flying: '#A98FF3', psychic: '#F95587', bug: '#A6B91A',
    rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', dark: '#705746',
    steel: '#B7B7CE', fairy: '#D685AD'
};

const pcLabelMap = {
    "HP": "HP", "Attack": "Attack", "Defense": "Defense",
    "Sp_Atk": "Special Attack", "Sp_Def": "Special Defense", "Speed": "Speed"
};

const getPokemonColor = (type) => colours[type?.toLowerCase()] || "#ccc";

d3.csv("pokemon_alopez247.csv").then(data => {
    const render = () => {
        d3.selectAll("svg").remove();
        drawBarChart(data);
        drawScatterPlot(data);
        drawParallelCoordinates(data);
    };

    render();
    window.addEventListener("resize", render);
});

function drawDashboard(data) {
    // Clear everything before redrawing to prevent overflow/stacking
    d3.selectAll("svg").remove();

    drawBarChart(data);
    drawScatterPlot(data);
    drawParallelCoordinates(data);
}

function drawBarChart(data) {
    const container = d3.select("#bar-chart").node().getBoundingClientRect();
    const margins = {top: 50, right: 30, bottom: 100, left: 80};
    const width = container.width - margins.left - margins.right;
    const height = container.height - margins.top - margins.bottom;

    const svg = d3.select("#bar-chart").append("svg")
        .attr("width", "100%").attr("height", "100%")
        .append("g").attr("transform", `translate(${margins.left},${margins.top})`);

    const typeCount = d3.rollup(data, v => v.length, d => d.Type_1);
    const chartData = Array.from(typeCount, ([type, count]) => ({type, count}));

    // X and Y scales
    const x = d3.scaleBand().domain(chartData.map(d => d.type)).range([0, width]).padding(0.2);
    const y = d3.scaleLinear().domain([0, d3.max(chartData, d => d.count)]).nice().range([height, 0]);

    svg.selectAll(".bar").data(chartData).enter().append("rect")
        .attr("x", d => x(d.type)).attr("y", d => y(d.count))
        .attr("width", x.bandwidth()).attr("height", d => height - y(d.count))
        .attr("fill", d => getPokemonColor(d.type));

    // Drawing the scales
    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x))
        .selectAll("text").attr("transform", "rotate(-45)").style("text-anchor", "end");
    
    svg.append("g").call(d3.axisLeft(y));

    // X-Axis Label
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + margins.bottom - 30)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Types");
    
    // Y-Axis Label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -margins.left + 30)
        .attr("x", -height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Number of Pokemon");
}

function drawScatterPlot(data) {
    const container = d3.select("#scatter-plot").node().getBoundingClientRect();
    const margins = {top: 50, right: 30, bottom: 80, left: 70};
    const width = container.width - margins.left - margins.right;
    const height = container.height - margins.top - margins.bottom;

    const svg = d3.select("#scatter-plot").append("svg")
        .attr("width", "100%").attr("height", "100%")
        .append("g").attr("transform", `translate(${margins.left},${margins.top})`);

    // X scale is categorical (Type)
    const xScale = d3.scalePoint()
        .domain(Object.keys(colours).map(t => t.charAt(0).toUpperCase() + t.slice(1)))
        .range([0, width]).padding(0.5);

    // Y scale is numerical
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => +d.Catch_Rate)])
        .range([height, 0]).nice();

    // Draw dots
    svg.selectAll("circle").data(data).enter().append("circle")
        .attr("cx", d => xScale(d.Type_1))
        .attr("cy", d => yScale(+d.Catch_Rate))
        .attr("r", 4)
        .style("fill", d => getPokemonColor(d.Type_1))
        .style("opacity", 0.6);

    // Drawing X and Y scales
    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(xScale))
        .selectAll("text").attr("transform", "rotate(-45)").style("text-anchor", "end");
    
    svg.append("g").call(d3.axisLeft(yScale));

    // Y-Axis Label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -margins.left + 25)
        .attr("x", -height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Catch Rate");

    // X-Axis Label
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + margins.bottom - 10)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Pokemon Type");
}
function drawParallelCoordinates(data) {
    const container = d3.select("#advanced-view").node().getBoundingClientRect();
    const margins = {top: 60, right: 180, bottom: 50, left: 50}; // Large right margin for legend
    const width = container.width - margins.left - margins.right;
    const height = container.height - margins.top - margins.bottom;

    const svg = d3.select("#advanced-view").append("svg")
        .attr("width", "100%").attr("height", "100%")
        .append("g").attr("transform", `translate(${margins.left},${margins.top})`);

    const dimensions = Object.keys(pcLabelMap);
    const yScales = {};
    dimensions.forEach(d => yScales[d] = d3.scaleLinear().domain(d3.extent(data, p => +p[d])).range([height, 0]));

    const xScale = d3.scalePoint().range([0, width]).domain(dimensions);
    const line = d3.line();

    // Draw Paths
    svg.selectAll("path").data(data).enter().append("path")
        .attr("d", d => line(dimensions.map(p => [xScale(p), yScales[p](d[p])])))
        .style("fill", "none").style("stroke", d => getPokemonColor(d.Type_1)).style("opacity", 0.15);

    // Draw Axes
    svg.selectAll("g.axis").data(dimensions).enter().append("g")
        .attr("transform", d => `translate(${xScale(d)})`)
        .each(function(d) { d3.select(this).call(d3.axisLeft(yScales[d])); })
        .append("text").style("text-anchor", "middle").attr("y", -15)
        .text(d => pcLabelMap[d]).style("fill", "black").style("font-weight", "bold");

    // Two-Column Legend
    const legend = svg.append("g").attr("transform", `translate(${width + 30}, 0)`);
    Object.keys(colours).forEach((type, i) => {
        const col = Math.floor(i / 9);
        const row = i % 9;
        const g = legend.append("g").attr("transform", `translate(${col * 75}, ${row * 20})`);
        g.append("rect").attr("width", 12).attr("height", 12).attr("fill", getPokemonColor(type));
        g.append("text").attr("x", 18).attr("y", 10).style("font-size", "11px").text(type);
    });
}