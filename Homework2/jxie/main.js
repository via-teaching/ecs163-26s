// Load the Pokemon dataset using d3.csv
d3.csv("data/pokemon_alopez247.csv", d3.autoType).then(data => {
    // Data processing
    // Create proc data to account for Pokemon with two types
    let procData = [];
    data.forEach(d => {
        // first type
        procData.push({ ...d, Type: d.Type_1 });
        // add a second type if exists
        if (d.Type_2) {
            procData.push({ ...d, Type: d.Type_2 });
        }
    });

    // Get sorted list of all pokemon types
    const allTypes = Array.from(new Set(procData.map(d => d.Type))).sort();
    // Define generation range
    const gens = [1, 2, 3, 4, 5, 6];

    // Calculate average total stat per Type for the Bar Chart
    let typeAverages = allTypes.map(t => {
        // Filter the proc data for the current type
        let rows = procData.filter(d => d.Type === t);
        // Calculate the average 
        return { 
            name: t, 
            avg: d3.mean(rows, d => d.Total) };
    }).sort((a, b) => b.avg - a.avg); // Sort to show strongest types first

    // Calculate Type averages across Generations for the Heatmap
    let typeGenData = [];
    allTypes.forEach(t => {
        gens.forEach(g => {
            // Filter data for specific Type and Generation
            let rows = procData.filter(d => d.Type === t && d.Generation === g);
            // Push an object for each heatmap cell
            typeGenData.push({ 
                type: t, 
                gen: g, 
                val: d3.mean(rows, d => d.Total) || 0 });
        });
    });

    // Get top 18 Pokemon by Total stats for Parallel Coordinates Plot
    let top18 = data.sort((a, b) => b.Total - a.Total).slice(0, 18);

    // draw visualizations
    barChart(typeAverages);
    heatMap(typeGenData, allTypes, gens);
    parallelCoords(top18);
});

// Bar Chart (Fundamental)
function barChart(chartData) {
    // Choose HTML container and get its dimensions
    const container = d3.select("#vis1");
    const width = container.node().clientWidth;
    const height = container.node().clientHeight - 30;
    const margin = {top: 20, right: 30, bottom: 50, left: 110}; 

    // Create SVG 
    const svg = container.append("svg").attr("width", width).attr("height", height);
    
    // X Scale: stat values 
    const x = d3.scaleLinear()
        .domain([0, d3.max(chartData, d => d.avg)])
        .range([margin.left, width - margin.right]);

    // Y Scale: Type names 
    const y = d3.scaleBand()
        .domain(chartData.map(d => d.name))
        .range([margin.top, height - margin.bottom])
        .padding(0.2);

    // draw rectangles for the bars
    svg.selectAll("rect")
        .data(chartData)
        .join("rect")
        .attr("x", x(0))
        .attr("y", d => y(d.name))
        .attr("width", d => x(d.avg) - x(0))
        .attr("height", y.bandwidth())
        .attr("fill", "#716f9e");

    // Draw the X-Axis and add label
    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(5))
        .append("text")
        .attr("x", margin.left + (width - margin.left - margin.right) / 2)
        .attr("y", 35).attr("fill", "black")
        .style("font-size", "12px")
        .text("Avg Base Stat Total");

    // Draw the Y-Axis and add Type label
    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -70)
        .attr("x", -(height / 2))
        .attr("fill", "black")
        .attr("text-anchor", "middle")
        .style("font-weight", "bold")
        .text("Type");
}

// Heatmap (Fundamental)
function heatMap(cells, types, gens) {
    // Choose HTML container and get its dimensions
    const container = d3.select("#vis2");
    const width = container.node().clientWidth;
    const height = container.node().clientHeight - 30;
    const margin = {top: 40, right: 100, bottom: 40, left: 110}; 

    // Create SVG
    const svg = container.append("svg").attr("width", width).attr("height", height);

    // X Scale: Generations
    const x = d3.scaleBand()
        .domain(gens)
        .range([margin.left, width - margin.right])
        .padding(0.05);

    // Y Scale: Types 
    const y = d3.scaleBand()
        .domain(types)
        .range([margin.top, height - margin.bottom])
        .padding(0.05);

    // Color: Yellow to Red for stat values of color intensity
    const color = d3.scaleSequential(d3.interpolateYlOrRd).domain([350, 550]);

    // Draw the heatmap rects
    svg.selectAll("rect")
        .data(cells)
        .join("rect")
        .attr("x", d => x(d.gen))
        .attr("y", d => y(d.type))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("fill", d => color(d.val));

    // Top Axis for Generations
    svg.append("g")
        .attr("transform", `translate(0,${margin.top})`)
        .call(d3.axisTop(x));
    
    // Left axis with Type label
    svg.append("g").attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -70).attr("x", -(height / 2))
        .attr("fill", "black")
        .attr("text-anchor", "middle")
        .style("font-weight", "bold")
        .text("Type");

    // Center label for X-axis
    svg.append("text")
        .attr("x", margin.left + (width - margin.left - margin.right)/2)
        .attr("y", 15).attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Generation");

    // Heatmap Color Legend
    const legendWidth = 15;
    const legendHeight = 150;
    const legend = svg.append("g")
        .attr("transform", `translate(${width - margin.right + 20}, ${margin.top + 20})`);

    // Create Gradient for legend
    const defs = svg.append("defs");
    const linearGradient = defs.append("linearGradient")
    .attr("id", "heat-gradient")
    .attr("x1", "0%")
    .attr("y1", "100%")
    .attr("x2", "0%")
    .attr("y2", "0%");
    
    linearGradient.append("stop")
    .attr("offset", "0%")
    .attr("stop-color", d3.interpolateYlOrRd(0));

    linearGradient.append("stop")
    .attr("offset", "100%")
    .attr("stop-color", d3.interpolateYlOrRd(1));

    legend.append("rect")
        .attr("width", legendWidth).attr("height", legendHeight)
        .style("fill", "url(#heat-gradient)");

    // Legend Axis/Labels
    const legendScale = d3.scaleLinear().domain([350, 550]).range([legendHeight, 0]);
    legend.append("g")
        .attr("transform", `translate(${legendWidth}, 0)`)
        .call(d3.axisRight(legendScale).ticks(5));
    
    legend.append("text")
        .attr("x", -10)
        .attr("y", -10)
        .style("font-size", "10px")
        .style("font-weight", "bold")
        .text("Avg Stat");
}

// Parallel Coordinates Plot (Advanced)
function parallelCoords(chartData) {
    // Choose HTML container and get its dimensions
    const container = d3.select("#vis3");
    const width = container.node().clientWidth;
    const height = container.node().clientHeight - 30;
    const margin = {top: 80, right: 180, bottom: 40, left: 60}; 

    // The stats to compare side by side
    const stat = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];
    const svg = container.append("svg").attr("width", width).attr("height", height);

    // X Scale: spacing
    const x = d3.scalePoint()
        .domain(stat)
        .range([margin.left, width - margin.right]);
    // Y Scale: stat range
    const y = d3.scaleLinear()
        .domain([0, 200])
        .range([height - margin.bottom, margin.top]);
    
    // Color for each pokemon
    const color = d3.scaleOrdinal().range(d3.schemeTableau10.concat(d3.schemeAccent))

    // connect lines / points
    const line = d3.line();

    // Draw paths for each Pokemon
    svg.selectAll("path")
        .data(chartData)
        .join("path")
        .attr("d", d => line(stat.map(k => [x(k), y(d[k])])))
        .attr("fill", "none")
        .attr("stroke", d => color(d.Name))
        .attr("stroke-width", 3)
        .attr("opacity", 0.7);

    // Draw vertical axis for each stat 
    svg.selectAll("g.axis")
        .data(stat)
        .join("g")
        .attr("transform", d => `translate(${x(d)},0)`)
        .each(function(d) { d3.select(this).call(d3.axisLeft(y)); })
        .append("text")
        .attr("y", margin.top - 15) 
        .attr("text-anchor", "middle")
        .attr("fill", "black")
        .style("font-weight", "bold")
        .style("font-size", "13px")
        .text(d => d);

    // Chart Title
    svg.append("text")
        .attr("x", margin.left + (width - margin.left - margin.right) / 2)
        .attr("y", margin.top - 45).attr("text-anchor", "middle")
        .attr("fill", "black")
        .style("font-weight", "bold").style("font-size", "16px")
        .text("Top 18 Pokemon Base Stat Profiles");

    // Label Stat Value 
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 20).attr("x", -(margin.top + (height - margin.top - margin.bottom) / 2))
        .attr("text-anchor", "middle")
        .attr("fill", "black")
        .style("font-size", "12px")
        .text("Stat Value");

    // Legend for top pokemon
    svg.append("text")
        .attr("x", width - margin.right + 40).attr("y", margin.top - 15)
        .style("font-weight", "bold")
        .style("font-size", "12px")
        .text("Top 18 Pokemon");

    const legend = svg.append("g")
        .attr("transform", `translate(${width - margin.right + 40}, ${margin.top})`);
        
    // Create Legend with a loop
    chartData.forEach((d, i) => {
        const g = legend.append("g").attr("transform", `translate(0, ${i * 22})`);
        g.append("rect")
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", color(d.Name));

        g.append("text")
        .attr("x", 20)
        .attr("y", 11)
        .style("font-size", "11px")
        .text(d.Name);
    });
}