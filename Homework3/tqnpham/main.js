// Global State Management
const state = {
    allData: [],
    selectedType: null, // Tracked when a user clicks a bar
    brushedRange: null  // Tracked when a user brushes the scatter plot
};

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

// Load Data
d3.csv("pokemon_alopez247.csv").then(data => {
    state.allData = data;
    
    // Master render loop
    renderDashboard();
    window.addEventListener("resize", renderDashboard);
});

function renderDashboard() {
    // Clear out the SVGs on resize/refresh
    d3.selectAll("svg").remove();

    // Render each view independently
    drawBarChart();
    drawScatterPlot();
    drawParallelCoordinates();
}

function drawBarChart() {
    const container = d3.select("#bar-chart").node().getBoundingClientRect();
    const margins = {top: 40, right: 30, bottom: 100, left: 80};
    const width = container.width - margins.left - margins.right;
    const height = container.height - margins.top - margins.bottom;

    const svg = d3.select("#bar-chart").append("svg")
        .attr("width", "100%").attr("height", "100%")
        .append("g").attr("transform", `translate(${margins.left},${margins.top})`);

    const typeCount = d3.rollup(state.allData, v => v.length, d => d.Type_1);
    const chartData = Array.from(typeCount, ([type, count]) => ({type, count}));

    const x = d3.scaleBand().domain(chartData.map(d => d.type)).range([0, width]).padding(0.2);
    const y = d3.scaleLinear().domain([0, d3.max(chartData, d => d.count)]).nice().range([height, 0]);

    // Bind Data
    const bars = svg.selectAll(".bar").data(chartData).enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.type))
        .attr("y", d => y(d.count))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d.count))
        .attr("fill", d => getPokemonColor(d.type))
        .style("cursor", "pointer")
        // Apply consistent semantic mapping for opacity filtering
        .style("opacity", d => (state.selectedType === null || state.selectedType === d.type) ? 1 : 0.2);

    // CLICK INTERACTION (Selection)
    bars.on("click", function(event, d) {
        // Toggle selection if clicking the same bar twice
        state.selectedType = (state.selectedType === d.type) ? null : d.type;
        
        // Broadcast updates to all interactive views
        updateVisualHighlights();
    });

    // MOUSEOVER/MOUSEOUT Feedback
    bars.on("mouseover", function() {
        d3.select(this).style("stroke", "#000").style("stroke-width", "2px");
    }).on("mouseout", function() {
        d3.select(this).style("stroke", "none");
    });

    // Draw Axes & Labels
    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x))
        .selectAll("text").attr("transform", "rotate(-45)").style("text-anchor", "end");
    svg.append("g").call(d3.axisLeft(y));
    svg.append("text").attr("transform", "rotate(-90)").attr("y", -margins.left + 30).attr("x", -height / 2).attr("text-anchor", "middle").style("font-size", "12px").text("Number of Pokemon");
}

function drawScatterPlot() {
    const container = d3.select("#scatter-plot").node().getBoundingClientRect();
    const margins = {top: 40, right: 30, bottom: 80, left: 70};
    const width = container.width - margins.left - margins.right;
    const height = container.height - margins.top - margins.bottom;

    const svg = d3.select("#scatter-plot").append("svg")
        .attr("width", "100%").attr("height", "100%")
        .append("g").attr("transform", `translate(${margins.left},${margins.top})`);

    const xScale = d3.scalePoint()
        .domain(Object.keys(colours).map(t => t.charAt(0).toUpperCase() + t.slice(1)))
        .range([0, width]).padding(0.5);

    const yScale = d3.scaleLinear().domain([0, 255]).range([height, 0]);

    // Circles
    const circles = svg.selectAll("circle").data(state.allData).enter().append("circle")
        .attr("class", "dot")
        .attr("cx", d => xScale(d.Type_1))
        .attr("cy", d => yScale(+d.Catch_Rate))
        .attr("r", 4)
        .style("fill", d => getPokemonColor(d.Type_1));

    // Apply global filter immediately to circles
    circles.style("opacity", d => isPokemonActive(d) ? 0.6 : 0.05);

    // BRUSHING TECHNIQUE
    const brush = d3.brushY()
        .extent([[0, 0], [width, height]])
        .on("brush end", brushed);

    svg.append("g").attr("class", "brush").call(brush);

    function brushed(event) {
        const selection = event.selection;
        if (!selection) {
            state.brushedRange = null; // Cleared brush
        } else {
            // Convert pixel selections back to data stats via invert
            const y0 = yScale.invert(selection[1]);
            const y1 = yScale.invert(selection[0]);
            state.brushedRange = [y0, y1];
        }
        updateVisualHighlights();
    }

    // Standard Axes & Labels
    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(xScale)).selectAll("text").attr("transform", "rotate(-45)").style("text-anchor", "end");
    svg.append("g").call(d3.axisLeft(yScale));
    svg.append("text").attr("transform", "rotate(-90)").attr("y", -margins.left + 25).attr("x", -height / 2).attr("text-anchor", "middle").style("font-size", "12px").text("Catch Rate (0-255)");
}

function drawParallelCoordinates() {
    const container = d3.select("#advanced-view").node().getBoundingClientRect();
    const margins = {top: 60, right: 180, bottom: 50, left: 50};
    const width = container.width - margins.left - margins.right;
    const height = container.height - margins.top - margins.bottom;

    const svg = d3.select("#advanced-view").append("svg")
        .attr("width", "100%").attr("height", "100%")
        .append("g").attr("transform", `translate(${margins.left},${margins.top})`);

    const dimensions = Object.keys(pcLabelMap);
    const yScales = {};
    dimensions.forEach(d => yScales[d] = d3.scaleLinear().domain(d3.extent(state.allData, p => +p[d])).range([height, 0]));

    const xScale = d3.scalePoint().range([0, width]).domain(dimensions);
    const line = d3.line();

    // Draw lines
    const paths = svg.selectAll(".pc-line")
        .data(state.allData).enter().append("path")
        .attr("class", "pc-line")
        .attr("d", d => line(dimensions.map(p => [xScale(p), yScales[p](d[p])])))
        .style("fill", "none")
        .style("stroke", d => getPokemonColor(d.Type_1));

    // Handle initial transition/opacity setup
    paths.style("opacity", d => isPokemonActive(d) ? 0.2 : 0.02)
         .style("stroke-width", d => isPokemonActive(d) ? "1.5px" : "0.5px");

    // Standard Axes Drawing
    svg.selectAll("g.axis").data(dimensions).enter().append("g")
        .attr("transform", d => `translate(${xScale(d)})`)
        .each(function(d) { d3.select(this).call(d3.axisLeft(yScales[d])); })
        .append("text").style("text-anchor", "middle").attr("y", -15)
        .text(d => pcLabelMap[d]).style("fill", "black").style("font-weight", "bold");

    // Two-Column Static Legend
    const legend = svg.append("g").attr("transform", `translate(${width + 30}, 0)`);
    Object.keys(colours).forEach((type, i) => {
        const col = Math.floor(i / 9);
        const row = i % 9;
        const g = legend.append("g").attr("transform", `translate(${col * 75}, ${row * 20})`);
        g.append("rect").attr("width", 12).attr("height", 12).attr("fill", getPokemonColor(type));
        g.append("text").attr("x", 18).attr("y", 10).style("font-size", "11px").text(type);
    });
}

// Helper to evaluate if a record fits both structural selection filters
function isPokemonActive(d) {
    const matchesType = state.selectedType === null || d.Type_1 === state.selectedType;
    
    let matchesBrush = true;
    if (state.brushedRange !== null) {
        const rate = +d.Catch_Rate;
        matchesBrush = rate >= state.brushedRange[0] && rate <= state.brushedRange[1];
    }
    
    return matchesType && matchesBrush;
}

// Master coordinator for transitions
function updateVisualHighlights() {
    const durationTime = 400; // milliseconds

    // 1. Transition Bar Chart Opacity
    d3.selectAll(".bar")
        .transition().duration(durationTime)
        .style("opacity", d => (state.selectedType === null || state.selectedType === d.type) ? 1 : 0.2);

    // 2. Transition Scatter Plot Dots Opacity
    d3.selectAll(".dot")
        .transition().duration(durationTime)
        .style("opacity", d => isPokemonActive(d) ? 0.7 : 0)
        .attr("r", d => isPokemonActive(d) ? 5 : 2);

    // 3. Transition Parallel Coordinates Path Profiles
    d3.selectAll(".pc-line")
        .transition().duration(durationTime)
        .style("opacity", d => isPokemonActive(d) ? 0.25 : 0)
        .style("stroke-width", d => isPokemonActive(d) ? "1.8px" : "0.5px");
}