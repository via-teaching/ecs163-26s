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
            let meanVal = d3.mean(rows, d => d.Total);
            if (!meanVal) {
                meanVal = 0;
            }
            typeGenData.push({ 
                type: t, 
                gen: g, 
                val: meanVal 
            });
        });
    });

    // Get top 100 Pokemon by Total stats for Sankey Diagram
    let top100 = data.sort((a, b) => b.Total - a.Total).slice(0, 100);

    // Track selected type for cross interaction
    let selectedType = null;

    // draw visualizations
    barChart(typeAverages);
    heatMap(typeGenData, allTypes, gens);
    sankeyChart(top100);

    // Update charts based on the selection from click or brush
    function selectInteract(typesList) {
        // Change heatmap blocks with an animation
        d3.select("#vis2").selectAll("rect.heatmap-cell")
            .transition()
            .duration(400)
            .ease(d3.easeCubicInOut) // slow fading timing
            .attr("opacity", function(d) {
                if (!typesList) {
                    return 1.0;
                }
                if (typesList.includes(d.type)) {
                    return 1.0;
                } else {
                    return 0.15; // Dim if not in list
                }
            })
            .attr("stroke", function(d) {
                if (typesList && typesList.includes(d.type)) {
                    return "#000";
                } else {
                    return "none";
                }
            })
            .attr("stroke-width", function(d) {
                if (typesList && typesList.includes(d.type)) {
                    return 1.5;
                } else {
                    return 0;
                }
            });

        // Change bar chart opacity to match selection
        d3.select("#vis1").selectAll("rect.bar-rect")
            .transition()
            .duration(400)
            .ease(d3.easeCubicInOut)
            .attr("opacity", function(d) {
                if (!typesList) {
                    return 1.0;
                }
                if (typesList.includes(d.name)) {
                    return 1.0;
                } else {
                    return 0.4;
                }
            });

        // Change sankey to match selection
        d3.select("#vis3").selectAll(".sankey-link")
            .transition()
            .duration(400)
            .ease(d3.easeCubicInOut)
            .style("stroke-opacity", function(d) {
                if (!typesList) {
                    return 0.4;
                }
                if (typesList.includes(d.source.name) || typesList.includes(d.target.name)) {
                    return 0.8;
                } else {
                    return 0.05;
                }
            });
    }

    // Bar Chart (Fundamental)
    function barChart(chartData) {
        // Choose HTML container and get its dimensions
        const container = d3.select("#vis1");
        const width = container.node().clientWidth;
        const height = container.node().clientHeight - 50;
        const margin = {top: 20, right: 30, bottom: 65, left: 110}; 

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
            .attr("class", "bar-rect")
            .attr("x", x(0))
            .attr("y", function(d) { 
                return y(d.name); 
            })
            .attr("width", function(d) { 
                return x(d.avg) - x(0); 
            })
            .attr("height", y.bandwidth())
            .attr("fill", "#716f9e")
            // Interaction 1: Selection with click 
            .on("click", (event, d) => {
                if (selectedType === d.name) {
                    selectedType = null;
                    selectInteract(null);
                } else {
                    selectedType = d.name;
                    selectInteract([d.name]);
                }
            });

        // Draw the X-Axis and add label
        const xAxisG = svg.append("g")
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x).ticks(5));

        xAxisG.append("text")
            .attr("x", margin.left + (width - margin.left - margin.right) / 2)
            .attr("y", 40).attr("fill", "black")
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

        // Horizontal brush along the x-axis
        const brush = d3.brushX()
            .extent([[margin.left, height - margin.bottom], [width - margin.right, height - margin.bottom + 30]])
            .on("brush end", (event) => {
                const selection = event.selection;
                if (!selection) {
                    selectInteract(null); // Reset filter if brush is removed
                    return;
                }
                const [x0, x1] = selection;
                const minVal = x.invert(x0); 
                const maxVal = x.invert(x1);

                // Find types that fit inside brushed range
                const brushedTypes = chartData
                    .filter(d => d.avg >= minVal && d.avg <= maxVal)
                    .map(d => d.name);

                selectInteract(brushedTypes);
            });

        // Add brush group to SVG
        svg.append("g")
            .attr("class", "axis-brush")
            .call(brush);
    }

    // Heatmap (Fundamental)
    function heatMap(cells, types, gens) {
        // Choose HTML container and get its dimensions
        const container = d3.select("#vis2");
        const width = container.node().clientWidth;
        const height = container.node().clientHeight - 50;
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
            .attr("class", "heatmap-cell")
            .attr("x", function(d) { 
                return x(d.gen); 
            })
            .attr("y", function(d) { 
                return y(d.type); 
            })
            .attr("width", x.bandwidth())
            .attr("height", y.bandwidth())
            .attr("fill", function(d) { 
                return color(d.val); 
            })
            .attr("opacity", 1.0);

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

    // Sankey Diagram (Advanced)
    function sankeyChart(chartData) {
        // Choose HTML container and get its dimensions
        const container = d3.select("#vis3");
        const width = container.node().clientWidth;
        const height = container.node().clientHeight - 50;
        const margin = {top: 40, right: 40, bottom: 20, left: 40};

        const svg = container.append("svg").attr("width", width).attr("height", height);

        // Back so pan and zoom works on empty space
        svg.append("rect")
            .attr("width", width)
            .attr("height", height)
            .style("fill", "none")
            .style("pointer-events", "all");

        // Create a group to hold everything that shifts during pan and zoom
        const zoomBox = svg.append("g").attr("class", "sankey-zoom-container");

        // Set up zoom and pan restrictions
        const zoomBehavior = d3.zoom()
            .scaleExtent([0.4, 4])
            .on("zoom", (event) => {
                zoomBox.attr("transform", event.transform);
            });

        // Apply zoom to the SVG 
        svg.call(zoomBehavior);

        // Sankey
        // create nodes for categories
        let nodes = [];
        let nodeMap = {};

        function addNode(name) {
            if (nodeMap[name] === undefined) {
                nodes.push({ name: name });
                nodeMap[name] = nodes.length - 1;
            }
            return nodeMap[name];
        }

        // sorted Gen 1 to Gen 6 vertically
        [1, 2, 3, 4, 5, 6].forEach(g => {
            addNode("Gen " + g);
        });

        let links = [];
        
        // Loop through data for connections
        chartData.forEach(d => {
            const genNodeStr = "Gen " + d.Generation;
            const typeNodeStr = d.Type_1;
            
            // legendaries
            let legNodeStr = "Standard";
            if (d.isLegendary === true || d.isLegendary === "True") {
                legNodeStr = "Legendary";
            }

            const idxGen = addNode(genNodeStr);
            const idxType = addNode(typeNodeStr);
            const idxLeg = addNode(legNodeStr);

            // Generation - Type track link
            let linkG2T = links.find(l => l.source === idxGen && l.target === idxType);
            if (!linkG2T) {
                linkG2T = { source: idxGen, target: idxType, value: 0 };
                links.push(linkG2T);
            }
            linkG2T.value += 1;

            // Type - Legendary track link
            let linkT2L = links.find(l => l.source === idxType && l.target === idxLeg);
            if (!linkT2L) {
                linkT2L = { source: idxType, target: idxLeg, value: 0 };
                links.push(linkT2L);
            }
            linkT2L.value += 1;
        });

        const graph = { 
            nodes: nodes, 
            links: links 
        };

        // Create layout with d3Sankey
        const sankeyGenerator = d3.sankey()
            .nodeWidth(24)
            .nodePadding(12)
            .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]]);

        // Connect data schema to coordinate marks
        sankeyGenerator(graph);

        // color schemes across nodes
        const color = d3.scaleOrdinal(d3.schemeTableau10);

        // Draw links connecting nodes
        zoomBox.append("g")
            .selectAll(".sankey-link")
            .data(graph.links)
            .join("path")
            .attr("class", "sankey-link")
            .attr("d", d3.sankeyLinkHorizontal())
            .attr("stroke", function(d) { 
                return color(d.source.name); 
            })
            .style("stroke-width", function(d) {
                let checkWidth = d.width;
                if (checkWidth < 1) {
                    return 1;
                } else {
                    return checkWidth;
                }
            });

        // Draw grouping containers for category elements
        const nodeG = zoomBox.append("g")
            .selectAll(".sankey-node")
            .data(graph.nodes)
            .join("g")
            .attr("class", "sankey-node")
            .attr("transform", function(d) { 
                return `translate(${d.x0},${d.y0})`; 
            });

        // Interaction 1: Selection / Highlights with Node click
        nodeG.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("height", function(d) { 
                return d.y1 - d.y0; 
            })
            .attr("width", function(d) { 
                return d.x1 - d.x0; 
            })
            .attr("fill", function(d) { 
                return color(d.name); 
            })
            .attr("stroke", "#333")
            .attr("stroke-width", 1)
            .on("click", (event, d) => {
                // cross interaction for select if click on type or context node
                if (allTypes.includes(d.name)) {
                    if (selectedType === d.name) {
                        selectedType = null;
                        selectInteract(null);
                    } else {
                        selectedType = d.name;
                        selectInteract([d.name]);
                    }
                }
            });

        // Add info category text
        nodeG.append("text")
            .attr("x", function(d) {
                if (d.x0 < width / 2) {
                    return 6 + (d.x1 - d.x0);
                } else {
                    return -6;
                }
            })
            .attr("y", function(d) {
                return (d.y1 - d.y0) / 2;
            })
            .attr("dy", "0.35em")
            .attr("text-anchor", function(d) {
                if (d.x0 < width / 2) {
                    return "start";
                } else {
                    return "end";
                }
            })
            .text(function(d) { 
                return `${d.name} (${d.value})`; 
            })
            .style("font-weight", "bold");

        // Column Labels 
        zoomBox.append("text")
            .attr("x", margin.left)
            .attr("y", margin.top - 15)
            .style("font-size", "12px")
            .style("font-weight", "bold")
            .text("Generation");

        zoomBox.append("text")
            .attr("x", width / 2)
            .attr("y", margin.top - 15)
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .style("font-weight", "bold")
            .text("Primary Type");

        zoomBox.append("text")
            .attr("x", width - margin.right)
            .attr("y", margin.top - 15)
            .attr("text-anchor", "end")
            .style("font-size", "12px")
            .style("font-weight", "bold")
            .text("Rarity");
    }
});