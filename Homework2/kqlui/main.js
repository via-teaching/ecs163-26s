// Get the width and height of the user's browser window
const width = window.innerWidth;
const height = window.innerHeight;

// --- Layout setup (focus + context) ---
// Left column (35% width) = context (peripheral, reduced size overviews)
// Right column (65% width) = focus (full size, detailed view)
const leftColWidth = width * 0.35;
const rightColWidth = width * 0.65;

// View 1: context 1 - bar chart (top left)
let barMargin = {top: 50, right: 30, bottom: 80, left: 60},
    barWidth = leftColWidth - barMargin.left - barMargin.right,
    barHeight = (height / 2) - barMargin.top - barMargin.bottom;

// View 2: context 2 - scatter plot (bottom left)
let scatterMargin = {top: 50, right: 30, bottom: 60, left: 60}, 
    scatterWidth = leftColWidth - scatterMargin.left - scatterMargin.right,
    scatterHeight = (height / 2) - scatterMargin.top - scatterMargin.bottom;

// View 3: focus - Sankey diagram (entire right column)
let sankeyMargin = {top: 80, right: 150, bottom: 50, left: 50},
    sankeyWidth = rightColWidth - sankeyMargin.left - sankeyMargin.right,
    sankeyHeight = height - sankeyMargin.top - sankeyMargin.bottom;

// Select the SVG element from our HTML and use viewBox to make it responsive
const svg = d3.select("svg")
              .attr("viewBox", `0 0 ${width} ${height}`)
              .attr("preserveAspectRatio", "xMidYMid meet");

// Create a color scale for "Music effects" to visually link our context and focus views.
const colorScale = d3.scaleOrdinal()
    .domain(["Improve", "No effect", "Worsen"])
    .range(["#4CAF50", "#9E9E9E", "#F44336"]); // Green, Grey, Red

// --- Load data ---
d3.csv("data/mxmh_survey_results.csv").then(rawData => {
    
    // Clean Data
    let cleanData = rawData.map(d => {
    return {
        genre: d["Fav genre"],
        hours: Number(d["Hours per day"]),
        depression: Number(d["Depression"]),
        effects: d["Music effects"]
    };
    }).filter(d => d.genre && !isNaN(d.hours) && !isNaN(d.depression) && d.effects);
    
    // ==========================================
    // View 1: Context (bar chart - demographics overview)
    // ==========================================
    
    const genreCounts = cleanData.reduce((acc, d) => {
        acc[d.genre] = (acc[d.genre] || 0) + 1;
        return acc;
    }, {});
    
    let genreData = Object.keys(genreCounts).map(key => ({ genre: key, count: genreCounts[key] }));
    genreData.sort((a, b) => b.count - a.count);

    const g1 = svg.append("g").attr("transform", `translate(${barMargin.left}, ${barMargin.top})`);
    g1.append("text").attr("x", barWidth / 2).attr("y", -20).attr("text-anchor", "middle").attr("font-size", "16px").text("Context: Popularity of Genres");

    const x1 = d3.scaleBand().domain(genreData.map(d => d.genre)).range([0, barWidth]).padding(0.2);
    const y1 = d3.scaleLinear().domain([0, d3.max(genreData, d => d.count)]).range([barHeight, 0]).nice();

    g1.append("g").attr("transform", `translate(0, ${barHeight})`).call(d3.axisBottom(x1))
        .selectAll("text").attr("transform", "rotate(-45)").attr("text-anchor", "end").attr("dx", "-5px").attr("dy", "5px"); 
    g1.append("g").call(d3.axisLeft(y1));
    g1.append("text").attr("x", -(barHeight / 2)).attr("y", -40).attr("transform", "rotate(-90)").attr("text-anchor", "middle").attr("font-size", "12px").text("Number of People");

    g1.selectAll("rect").data(genreData).enter().append("rect")
        .attr("x", d => x1(d.genre)).attr("y", d => y1(d.count))
        .attr("width", x1.bandwidth()).attr("height", d => barHeight - y1(d.count)).attr("fill", "#BBDFBB");

    // ==========================================
    // View 2: Context (scatter plot - listening habits)
    // ==========================================
    const g2 = svg.append("g").attr("transform", `translate(${scatterMargin.left}, ${(height / 2) + scatterMargin.top})`);
    g2.append("text").attr("x", scatterWidth / 2).attr("y", -20).attr("text-anchor", "middle").attr("font-size", "16px").text("Context: Hours Listened vs. Depression");

    const x2 = d3.scaleLinear().domain([0, d3.max(cleanData, d => d.hours)]).range([0, scatterWidth]).nice();
    const y2 = d3.scaleLinear().domain([0, 10]).range([scatterHeight, 0]);

    g2.append("g").attr("transform", `translate(0, ${scatterHeight})`).call(d3.axisBottom(x2));
    g2.append("text").attr("x", scatterWidth / 2).attr("y", scatterHeight + 35).attr("text-anchor", "middle").attr("font-size", "12px").text("Hours Listened per Day");
    g2.append("g").call(d3.axisLeft(y2));
    g2.append("text").attr("x", -(scatterHeight / 2)).attr("y", -30).attr("transform", "rotate(-90)").attr("text-anchor", "middle").attr("font-size", "12px").text("Depression Score (0-10)");

    g2.selectAll("circle").data(cleanData).enter().append("circle")
        .attr("cx", d => x2(d.hours) + (Math.random() - 0.5) * 5)
        .attr("cy", d => y2(d.depression) + (Math.random() - 0.5) * 10)
        .attr("r", 4).attr("fill", d => colorScale(d.effects)).attr("opacity", 0.6); 

    // ==========================================
    // View 3: Focus (Sankey diagram)
    // ==========================================
    const g3 = svg.append("g")
        .attr("transform", `translate(${leftColWidth + sankeyMargin.left}, ${sankeyMargin.top})`);

    g3.append("text").attr("x", sankeyWidth / 2).attr("y", -40).attr("text-anchor", "middle").attr("font-size", "22px").attr("font-weight", "bold")
        .text("Focus: How Music Genres Flow into Mental Health Effects");

    // Sankey data prep: Sankeys require an object with { nodes: [], links: [] }
    // 1. Create the nodes (every unique genre + the 3 effect types)
    const allGenres = Array.from(new Set(cleanData.map(d => d.genre)));
    const allEffects = ["Improve", "No effect", "Worsen"];
    const nodes = [...allGenres, ...allEffects].map(name => ({ name }));

    // Helper map to easily find the "index" (ID number) of a node based on its name
    const nodeMap = new Map(nodes.map((node, i) => [node.name, i]));

    // 2. Create the links (connections between a Genre node and an Effect node)
    // d3.rollup counts how many times each genre/effect combination happens
    const linkRollup = d3.rollup(cleanData, v => v.length, d => d.genre, d => d.effects);
    
    const links = [];
    for (const [genre, effectMap] of linkRollup) {
        for (const [effect, count] of effectMap) {
            links.push({
                source: nodeMap.get(genre), // The index of the genre node
                target: nodeMap.get(effect), // The index of the effect node
                value: count // How thick the flowing line should be
            });
        }
    }

    const sankeyData = { nodes, links };

    // Set up the Sankey generator
    const sankeyGenerator = d3.sankey()
        .nodeWidth(20) // Width of the rectangular nodes
        .nodePadding(15) // Vertical space between nodes
        .extent([[0, 0], [sankeyWidth, sankeyHeight]]); // The space it is allowed to draw in

    // Pass our data through the generator. This calculates all the x/y math for us!
    const { nodes: sNodes, links: sLinks } = sankeyGenerator(sankeyData);

    // Draw the flowing Links (paths)
    g3.append("g")
        .selectAll("path")
        .data(sLinks)
        .join("path")
        .attr("d", d3.sankeyLinkHorizontal()) // Draws the nice curved lines
        .attr("stroke", d => colorScale(d.target.name)) // Color the line based on the mental health effect
        .attr("stroke-width", d => Math.max(1, d.width)) // Line thickness based on number of people
        .attr("fill", "none")
        .attr("opacity", 0.4); // Keep them semi-transparent so they look like a flowing river

    // Draw the rectangular nodes
    g3.append("g")
        .selectAll("rect")
        .data(sNodes)
        .join("rect")
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => Math.max(1, d.y1 - d.y0))
        // If the node is an "Effect", color it using our scale. If it's a "Genre", make it grey.
        .attr("fill", d => allEffects.includes(d.name) ? colorScale(d.name) : "#555")
        .attr("stroke", "#000");

    // Add labels next to the nodes
    g3.append("g")
        .selectAll("text")
        .data(sNodes)
        .join("text")
        // If node is on the left (genres), put text to the right. If on the right (effects), put text to the left.
        .attr("x", d => d.x0 < sankeyWidth / 2 ? d.x1 + 6 : d.x0 - 6)
        .attr("y", d => (d.y1 + d.y0) / 2) // Vertically center the text
        .attr("dy", "0.35em")
        .attr("text-anchor", d => d.x0 < sankeyWidth / 2 ? "start" : "end")
        .text(d => d.name)
        .attr("font-size", "12px")
        .attr("font-weight", "bold");

    // ==========================================
    // Main legend (for focus view)
    // ==========================================
    // Place the legend in the right margin of the Sankey diagram
    const legend = g3.append("g")
        .attr("transform", `translate(${sankeyWidth + 10}, 0)`);

    // Legend title
    legend.append("text")
        .attr("x", 10)
        .attr("font-weight", "bold")
        .attr("font-size", "14px")
        .attr("y", -10)
        .text("Music Effects");
    
    // Loop through our effects and draw a colored circle and text for each
    const effectsList = ["Improve", "No effect", "Worsen"];
    effectsList.forEach((effect, i) => {
        // The colored circle
        legend.append("circle")
            .attr("cx", 15)
            .attr("cy", 10 + i * 25)
            .attr("r", 6)
            .attr("fill", colorScale(effect)); // Uses our global color scale
        
        // The text label
        legend.append("text")
            .attr("x", 30)
            .attr("y", 15 + i * 25)
            .text(effect)
            .attr("font-size", "14px");
    });

}).catch(error => console.log(error));