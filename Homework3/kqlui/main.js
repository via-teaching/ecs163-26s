// Get the width and height of the user's browser window
const width = window.innerWidth;
const height = window.innerHeight;

// Layout setup (focus + context)
const leftColWidth = width * 0.35;
const rightColWidth = width * 0.65;

let barMargin = {top: 50, right: 30, bottom: 80, left: 60},
    barWidth = leftColWidth - barMargin.left - barMargin.right,
    barHeight = (height / 2) - barMargin.top - barMargin.bottom;

let scatterMargin = {top: 50, right: 30, bottom: 60, left: 60}, 
    scatterWidth = leftColWidth - scatterMargin.left - scatterMargin.right,
    scatterHeight = (height / 2) - scatterMargin.top - scatterMargin.bottom;

let sankeyMargin = {top: 80, right: 150, bottom: 50, left: 50},
    sankeyWidth = rightColWidth - sankeyMargin.left - sankeyMargin.right,
    sankeyHeight = height - sankeyMargin.top - sankeyMargin.bottom;

// Select the svg element and make it responsive
const svg = d3.select("svg")
              .attr("viewBox", `0 0 ${width} ${height}`)
              .attr("preserveAspectRatio", "xMidYMid meet");

// Create a color scale for "music effects" to visually link our context and focus views
const colorScale = d3.scaleOrdinal()
    .domain(["Improve", "No effect", "Worsen"])
    .range(["#4CAF50", "#9E9E9E", "#F44336"]);

// State object keeps track of our current filters from interactions
let state = {
    selectedGenre: null,
    brushedRange: null  
};

// Load data
d3.csv("data/mxmh_survey_results.csv").then(rawData => {
    
    // Clean data: we add a unique id to each row for object constancy during transitions
    let cleanData = rawData.map((d, i) => {
        return {
            id: i, 
            genre: d["Fav genre"],
            hours: Number(d["Hours per day"]),
            depression: Number(d["Depression"]),
            effects: d["Music effects"],
            // We calculate the random jitter once here so dots don't shake wildly during animations
            jitterHours: Number(d["Hours per day"]) + (Math.random() - 0.5) * 0.8,
            jitterDep: Number(d["Depression"]) + (Math.random() - 0.5) * 1.5
        };
    }).filter(d => d.genre && !isNaN(d.hours) && !isNaN(d.depression) && d.effects);
    
    // View 1: context 1 (bar chart + selection interaction)
    const genreCounts = cleanData.reduce((acc, d) => {
        acc[d.genre] = (acc[d.genre] || 0) + 1;
        return acc;
    }, {});
    
    let genreData = Object.keys(genreCounts).map(key => ({ genre: key, count: genreCounts[key] }));
    genreData.sort((a, b) => b.count - a.count);

    const g1 = svg.append("g").attr("transform", `translate(${barMargin.left}, ${barMargin.top})`);
    g1.append("text").attr("x", barWidth / 2).attr("y", -20).attr("text-anchor", "middle").attr("font-size", "16px").text("Context: Click a Genre to Filter");

    const x1 = d3.scaleBand().domain(genreData.map(d => d.genre)).range([0, barWidth]).padding(0.2);
    const y1 = d3.scaleLinear().domain([0, d3.max(genreData, d => d.count)]).range([barHeight, 0]).nice();

    g1.append("g").attr("transform", `translate(0, ${barHeight})`).call(d3.axisBottom(x1))
        .selectAll("text").attr("transform", "rotate(-45)").attr("text-anchor", "end").attr("dx", "-5px").attr("dy", "5px"); 
    g1.append("g").call(d3.axisLeft(y1));

    // Add the y-axis label
    g1.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -barHeight / 2)
    .attr("y", -barMargin.left + 25)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .attr("fill", "#000")
    .text("Number of People");

    // Interaction 1: selection via clicking
    g1.selectAll("rect").data(genreData).enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => x1(d.genre)).attr("y", d => y1(d.count))
        .attr("width", x1.bandwidth()).attr("height", d => barHeight - y1(d.count))
        .attr("fill", "#BBDFBB")
        .style("cursor", "pointer") 
        .on("click", function(event, d) {
            // Toggle logic: if clicking the already selected genre, turn it off, otherwise select it
            if (state.selectedGenre === d.genre) {
                state.selectedGenre = null;
                g1.selectAll(".bar").attr("opacity", 1); 
            } else {
                state.selectedGenre = d.genre;
                g1.selectAll(".bar").attr("opacity", 0.3); 
                d3.select(this).attr("opacity", 1); 
            }
            // Trigger the update functions to animate the other views
            updateScatter();
            updateSankey();
        });

    // View 2: context 2 (scatter plot + brushing interaction)
    const g2 = svg.append("g").attr("transform", `translate(${scatterMargin.left}, ${(height / 2) + scatterMargin.top})`);
    g2.append("text").attr("x", scatterWidth / 2).attr("y", -20).attr("text-anchor", "middle").attr("font-size", "16px").text("Context: Drag to Brush (Filter by Hours/Depression)");

    // Configure the linear scales and enable clamping so dots cannot spill past the boundaries
    const x2 = d3.scaleLinear().domain([0, d3.max(cleanData, d => d.hours)]).range([0, scatterWidth]).nice().clamp(true);
    const y2 = d3.scaleLinear().domain([0, 10]).range([scatterHeight, 0]).clamp(true);

    g2.append("g").attr("transform", `translate(0, ${scatterHeight})`).call(d3.axisBottom(x2));
    g2.append("g").call(d3.axisLeft(y2));

    // Add the x-axis label
    g2.append("text")
    .attr("x", scatterWidth / 2)
    .attr("y", scatterHeight + scatterMargin.bottom - 15)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .attr("fill", "#000")
    .text("Hours per day");

    // Add the y-axis label
    g2.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -scatterHeight / 2)
    .attr("y", -scatterMargin.left + 25)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .attr("fill", "#000")
    .text("Depression score (0-10)");
    
    // Group specifically for circles so the brush doesn't accidentally cover them
    const scatterDotsGroup = g2.append("g").attr("class", "dots-group");

    // Interaction 2: brushing
    const brush = d3.brush()
        .extent([[0, 0], [scatterWidth, scatterHeight]])
        .on("end", (event) => {
            if (!event.selection) {
                state.brushedRange = null; 
            } else {
                // Convert pixel coordinates of the brush box back into data values
                const [[px0, py0], [px1, py1]] = event.selection;
                state.brushedRange = {
                    x0: x2.invert(px0),
                    x1: x2.invert(px1),
                    y0: y2.invert(py1), 
                    y1: y2.invert(py0)
                };
            }
            updateSankey(); 
        });
    g2.append("g").attr("class", "brush").call(brush); 

    // View 3: focus (sankey diagram group setup)
    const g3 = svg.append("g").attr("transform", `translate(${leftColWidth + sankeyMargin.left}, ${sankeyMargin.top})`);
    g3.append("text").attr("x", sankeyWidth / 2).attr("y", -40).attr("text-anchor", "middle").attr("font-size", "22px").attr("font-weight", "bold")
        .text("Focus: Flow into Mental Health Effects");

    // Configure the sankey math generator once
    const sankeyGenerator = d3.sankey()
        .nodeWidth(20).nodePadding(15)
        .extent([[0, 0], [sankeyWidth, sankeyHeight]]);

    // Legend
    const legend = g3.append("g").attr("transform", `translate(${sankeyWidth + 10}, 0)`);
    legend.append("text").attr("x", 10).attr("font-weight", "bold").attr("font-size", "14px").attr("y", -10).text("Music Effects");
    const effectsList = ["Improve", "No effect", "Worsen"];
    effectsList.forEach((effect, i) => {
        legend.append("circle").attr("cx", 15).attr("cy", 10 + i * 25).attr("r", 6).attr("fill", colorScale(effect));
        legend.append("text").attr("x", 30).attr("y", 15 + i * 25).text(effect).attr("font-size", "14px");
    });

    // Animation and update functions
    function updateScatter() {
        // Filter data if a genre is selected
        const filteredData = state.selectedGenre ? cleanData.filter(d => d.genre === state.selectedGenre) : cleanData;

        // Animation: filtering transition
        scatterDotsGroup.selectAll("circle")
            .data(filteredData, d => d.id) 
            .join(
                enter => enter.append("circle")
                    .attr("cx", d => x2(d.jitterHours))
                    .attr("cy", d => y2(d.jitterDep))
                    .attr("r", 4).attr("fill", d => colorScale(d.effects))
                    .attr("opacity", 0) 
                    .call(enter => enter.transition().duration(500).attr("opacity", 0.6)), 
                update => update, 
                exit => exit.call(exit => exit.transition().duration(500)
                    .attr("opacity", 0).remove()) 
            );
    }

    function updateSankey() {
        // Filter data based on both state variables
        let filteredData = cleanData;
        if (state.selectedGenre) {
            filteredData = filteredData.filter(d => d.genre === state.selectedGenre);
        }
        if (state.brushedRange) {
            filteredData = filteredData.filter(d => 
                d.hours >= state.brushedRange.x0 && d.hours <= state.brushedRange.x1 &&
                d.depression >= state.brushedRange.y0 && d.depression <= state.brushedRange.y1
            );
        }

        // If filtering leaves no data, clear the sankey smoothly and remove elements
        if (filteredData.length === 0) {
            g3.selectAll(".sankey-link").transition().duration(500).attr("stroke-width", 0).remove();
            g3.selectAll(".sankey-node").transition().duration(500).attr("height", 0).remove();
            g3.selectAll(".sankey-label").transition().duration(500).attr("opacity", 0).remove();
            return;
        }

        // Prep fresh nodes and links from the new subset
        const allGenres = Array.from(new Set(filteredData.map(d => d.genre)));
        const allEffects = ["Improve", "No effect", "Worsen"];
        const nodes = [...allGenres, ...allEffects].map(name => ({ name }));
        const nodeMap = new Map(nodes.map((node, i) => [node.name, i]));

        const linkRollup = d3.rollup(filteredData, v => v.length, d => d.genre, d => d.effects);
        const links = [];
        for (const [genre, effectMap] of linkRollup) {
            for (const [effect, count] of effectMap) {
                links.push({ source: nodeMap.get(genre), target: nodeMap.get(effect), value: count });
            }
        }

        // Generate new layout coordinates
        const { nodes: sNodes, links: sLinks } = sankeyGenerator({ nodes, links });

        // Animation: substrate / data schema change
        g3.selectAll(".sankey-link")
            .data(sLinks, d => d.source.name + "-" + d.target.name)
            .join(
                enter => enter.append("path").attr("class", "sankey-link")
                    .attr("d", d3.sankeyLinkHorizontal())
                    .attr("stroke", d => colorScale(d.target.name)).attr("fill", "none").attr("opacity", 0.4)
                    .attr("stroke-width", 0) 
                    .call(e => e.transition().duration(750).attr("stroke-width", d => Math.max(1, d.width))), 
                update => update.call(u => u.transition().duration(750)
                    .attr("d", d3.sankeyLinkHorizontal())
                    .attr("stroke-width", d => Math.max(1, d.width))), 
                exit => exit.call(e => e.transition().duration(750).attr("stroke-width", 0).remove())
            );

        // Update rectangles (nodes)
        g3.selectAll(".sankey-node")
            .data(sNodes, d => d.name)
            .join(
                enter => enter.append("rect").attr("class", "sankey-node")
                    .attr("fill", d => allEffects.includes(d.name) ? colorScale(d.name) : "#555").attr("stroke", "#000")
                    .attr("x", d => d.x0).attr("width", d => d.x1 - d.x0)
                    .attr("y", d => d.y0).attr("height", 0)
                    .call(e => e.transition().duration(750).attr("height", d => Math.max(1, d.y1 - d.y0))),
                update => update.call(u => u.transition().duration(750)
                    .attr("y", d => d.y0).attr("height", d => Math.max(1, d.y1 - d.y0))),
                exit => exit.call(e => e.transition().duration(750).attr("height", 0).remove())
            );

        // Update text labels
        g3.selectAll(".sankey-label")
            .data(sNodes, d => d.name)
            .join(
                enter => enter.append("text").attr("class", "sankey-label")
                    .attr("dy", "0.35em").text(d => d.name).attr("font-size", "12px").attr("font-weight", "bold")
                    .attr("x", d => d.x0 < sankeyWidth / 2 ? d.x1 + 6 : d.x0 - 6)
                    .attr("text-anchor", d => d.x0 < sankeyWidth / 2 ? "start" : "end")
                    .attr("y", d => (d.y1 + d.y0) / 2)
                    .attr("opacity", 0).call(e => e.transition().duration(750).attr("opacity", 1)),
                update => update.call(u => u.transition().duration(750)
                    .attr("y", d => (d.y1 + d.y0) / 2)
                    .attr("x", d => d.x0 < sankeyWidth / 2 ? d.x1 + 6 : d.x0 - 6)),
                exit => exit.call(e => e.transition().duration(750).attr("opacity", 0).remove())
            );
    }

    // Initial draw
    updateScatter();
    updateSankey();

}).catch(error => console.log(error));