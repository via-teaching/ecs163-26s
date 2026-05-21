/*
    DISCLOSURE:
    Generative AI was used to create the initial template, to debug and fix errors, and to find appropriate libraries and functions.
    Gen AI was used alongside manual correction and additions to turn the template into a final product. All decisions regarding chart type,
    layout, information explored, and certain color schemes was made by the human author. Gen AI was given specific instructions to execute
    for writing code, and was not allowed to make independent decisions regarding code.

    All code was reviewed manually before submission. Comments were either modified or manually created.
*/

// Global variables to store data and areas
let globalWorldData, globalRawData;
let mapArea, pieArea, sankeyArea;

// Code for tooltips
const tooltip = d3.select("body").append("div").attr("class", "tooltip");
const formatComma = d3.format(",");

// Data processing function
function dataProcessor(d) {
    // Logic to calculate kill counts
    const nkill = d.nkill ? +d.nkill : 0;

    // Sort kill counts into bins for the Sankey graph
    let deathBins = "0 Deaths";
    if (nkill > 0 && nkill <= 5) deathBins = "1-5 Deaths";
    else if (nkill > 5 && nkill <= 20) deathBins = "6-20 Deaths";
    else if (nkill > 20) deathBins = "21+ Deaths";

    return {
        success: +d.success === 1 ? "Successful" : "Unsuccessful",
        attackType: d.attacktype1_txt || "Unknown",
        region: d.region_txt || "Unknown",
        nkill: nkill,
        latitude: d.latitude ? +d.latitude : null,
        longitude: d.longitude ? +d.longitude : null,
        killBin: deathBins
    };
}

// Run data processing function and pass to functions
Promise.all([
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"),
    d3.csv("data/globalterrorismdb_0718dist.csv", dataProcessor)
]).then(([worldData, rawData]) => {
    globalWorldData = worldData;
    globalRawData = rawData;
    renderAll();
});

// Resize listener, used for dynamic rendering of SVG when window size changes
window.addEventListener("resize", renderAll);

// Declare shared SVG
const svg = d3.select("#main-svg");

// Draw shared SVG, designed to be easily callable for dynamic resizing
function renderAll() {
    // Clear previous elements
    svg.selectAll("*").remove();

    // Define dimensions for each graph
    const width = window.innerWidth;
    const height = window.innerHeight;

    const leftWidth = width * 0.45;
    const rightWidth = width * 0.55;
    mapArea = { x: 0, y: 0, w: leftWidth, h: height * 0.5 };
    pieArea = { x: 0, y: height * 0.5, w: leftWidth, h: height * 0.5 };
    sankeyArea = { x: leftWidth + 40, y: 60, w: rightWidth - 80, h: height - 120 };

    // Draw all three charts if data is done being processed (Needed because data crunching takes a while)
    if (globalWorldData && globalRawData) {
        drawMap(globalWorldData, globalRawData);
        drawSankey(globalRawData);
        drawPieChart(globalRawData);
    }
}

// Chart 1: World map of all attack locations
function drawMap(world, data) {
    // Define main SVG group
    const g = svg.append("g").attr("transform", `translate(${mapArea.x}, ${mapArea.y + 60})`);

    // Add a clipping path to prevent map from drawing over other UI elements when zoomed
    svg.append("defs").append("clipPath")
        .attr("id", "map-clip")
        .append("rect")
        .attr("width", mapArea.w)
        .attr("height", mapArea.h - 60);

    const mapContainer = g.append("g")
        .attr("clip-path", "url(#map-clip)");

    // Transparent rect to capture zoom and pan events over the entire map area
    mapContainer.append("rect")
        .attr("width", mapArea.w)
        .attr("height", mapArea.h - 60)
        .attr("fill", "transparent")
        .style("cursor", "grab");

    const zoomGroup = mapContainer.append("g");

    // Canvas overlay for high-performance point rendering
    const dpr = window.devicePixelRatio || 1;
    const canvas = mapContainer.append("foreignObject")
        .attr("width", mapArea.w)
        .attr("height", mapArea.h - 60)
        .style("pointer-events", "none")
        .append("xhtml:canvas")
        .attr("width", mapArea.w * dpr)
        .attr("height", (mapArea.h - 60) * dpr)
        .style("width", `${mapArea.w}px`)
        .style("height", `${mapArea.h - 60}px`);

    const context = canvas.node().getContext("2d", { alpha: true });
    context.scale(dpr, dpr);

    // Load blank map and projection
    const projection = d3.geoNaturalEarth1()
        .scale(mapArea.w / 6)
        .translate([mapArea.w / 2, mapArea.h / 2.5]);
    const path = d3.geoPath().projection(projection);

    // Pre-calculate projections for performance
    const projectedPoints = [];
    data.forEach(d => {
        if (d.latitude && d.longitude) {
            const coords = projection([d.longitude, d.latitude]);
            if (coords) projectedPoints.push({ x: coords[0], y: coords[1] });
        }
    });

    function drawPoints(transform) {
        context.clearRect(0, 0, mapArea.w, mapArea.h - 60);
        // Fully opaque tomato color
        context.fillStyle = "tomato";
        
        const k = transform.k;
        const tx = transform.x;
        const ty = transform.y;
        
        // Base size expands a bit as we zoom in (k goes from 1 to 8)
        const size = 1.6 + (k - 1) * 0.25; 
        const halfSize = size / 2;

        context.beginPath();
        for (let i = 0; i < projectedPoints.length; i++) {
            const px = projectedPoints[i].x * k + tx;
            const py = projectedPoints[i].y * k + ty;
            
            if (px < -size || px > mapArea.w + size || py < -size || py > mapArea.h - 60 + size) continue;
            
            context.rect(px - halfSize, py - halfSize, size, size);
        }
        context.fill();
    }

    // Define zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on("zoom", (event) => {
            zoomGroup.attr("transform", event.transform);
            zoomGroup.selectAll(".country").attr("stroke-width", 1 / event.transform.k);
            drawPoints(event.transform);
        })
        .on("end", (event) => {
            // When fully zoomed out, gradually recenter
            if (event.transform.k === 1 && (event.transform.x !== 0 || event.transform.y !== 0)) {
                mapContainer.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
            }
        });

    mapContainer.call(zoom);

    // Initial canvas draw
    drawPoints(d3.zoomIdentity);

    // Visual Zoom Controls
    const zoomControls = g.append("g")
        .attr("transform", `translate(${mapArea.w - 30}, 20)`);

    zoomControls.append("rect")
        .attr("width", 20).attr("height", 20)
        .attr("fill", "#333").attr("stroke", "gray").attr("rx", 3)
        .style("cursor", "pointer")
        .on("click", () => zoom.scaleBy(mapContainer.transition().duration(250), 1.3));
    zoomControls.append("text").text("+").attr("x", 10).attr("y", 15).attr("text-anchor", "middle").attr("fill", "white").style("pointer-events", "none").style("font-weight", "bold");

    zoomControls.append("rect")
        .attr("y", 25)
        .attr("width", 20).attr("height", 20)
        .attr("fill", "#333").attr("stroke", "gray").attr("rx", 3)
        .style("cursor", "pointer")
        .on("click", () => zoom.scaleBy(mapContainer.transition().duration(250), 1 / 1.3));
    zoomControls.append("text").text("-").attr("x", 10).attr("y", 40).attr("text-anchor", "middle").attr("fill", "white").style("pointer-events", "none").style("font-weight", "bold");

    // Draw countries
    zoomGroup.selectAll(".country")
        .data(topojson.feature(world, world.objects.countries).features)
        .enter().append("path")
        .attr("d", path)
        .attr("fill", "darkslategray")
        .attr("stroke", "gray")
        .attr("stroke-width", 1)
        .attr("vector-effect", "non-scaling-stroke");

    // Chart title 
    g.append("text").attr("class", "chart-title")
        .attr("x", mapArea.w / 2).attr("y", -30).text("Global Incident Hotspots");

    // Chart legend
    g.append("text")
        .attr("x", mapArea.w / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "lightgray")
        .text("Each red dot represents a single terrorist attack (Scroll to zoom, drag to pan).");
}

// Chart 2: Pie chart showing regional deaths
function drawPieChart(data) {
    // Define main svg group
    const g = svg.append("g")
        .attr("transform", `translate(${pieArea.x + pieArea.w / 3}, ${pieArea.y + pieArea.h / 2 + 30})`);

    // Aggregate data (death tolls per region)
    const aggregated = d3.rollups(data, v => d3.sum(v, d => d.nkill), d => d.region)
        .sort((a, b) => b[1] - a[1]);

    // Perform calculations for arcs relative to aggregated data
    const radius = Math.min(pieArea.w, pieArea.h) / 2.5;
    const pie = d3.pie().value(d => d[1]);
    const arc = d3.arc().innerRadius(radius * 0.5).outerRadius(radius);

    // Exactly 12 named CSS colors for the 12 regions in the dataset
    const customColors = [
        "crimson",
        "darkorange",
        "gold",
        "forestgreen",
        "teal",
        "dodgerblue",
        "mediumpurple",
        "hotpink",
        "sienna",
        "darkgray",
        "mediumaquamarine",
        "khaki"
    ];
    const color = d3.scaleOrdinal(customColors);

    // Draw arcs based on relative size
    const arcs = g.selectAll(".arc")
        .data(pie(aggregated))
        .enter().append("g");

    arcs.append("path")
        .attr("d", arc)
        .attr("fill", d => color(d.data[0]))
        .attr("stroke", "black")
        .style("stroke-width", "2px")
        .style("cursor", "pointer")

        // Used to define tooltip events
        .on("mouseover", function (event, d) {
            d3.select(this).style("opacity", 0.8);
            tooltip.style("visibility", "visible")
                .html(`<strong>Region:</strong> ${d.data[0]}<br/>
                          <strong>Total Fatalities:</strong> ${formatComma(d.data[1])}`);
        })
        .on("mousemove", function (event) {
            tooltip.style("top", (event.pageY - 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", function () {
            d3.select(this).style("opacity", 1);
            tooltip.style("visibility", "hidden");
        });

    // Chart label
    g.append("text")
        .attr("class", "chart-title")
        .attr("y", -radius - 40)
        .text("Fatalities by Region");

    // Legend
    const legend = g.append("g").attr("transform", `translate(${radius + 40}, -${radius})`);
    aggregated.forEach((d, i) => {
        const legendRow = legend.append("g")
            .attr("transform", `translate(0, ${i * 18})`);

        legendRow.append("rect")
            .attr("width", 12)
            .attr("height", 12)
            .attr("fill", color(d[0]));

        legendRow.append("text")
            .attr("x", 20)
            .attr("y", 10)
            .text(`${d[0]} (${formatComma(d[1])})`)
            .style("font-size", "11px")
            .attr("fill", "lightgray");
    });
}

// Chart 3: Sankey chart showing progression of attacks
function drawSankey(data) {
    // Define main svg group
    const g = svg.append("g").attr("transform", `translate(${sankeyArea.x}, ${sankeyArea.y})`);

    // Create links
    let links = [];

    // AttackType to success/failure
    const flow1 = d3.rollups(data, v => v.length, d => d.attackType, d => d.success);
    flow1.forEach(([src, targets]) => {
        targets.forEach(([tgt, val]) => {
            const uniqueTarget = `${src}: ${tgt}`;
            links.push({ source: src, target: uniqueTarget, value: val, category: src, outcome: tgt });
        });
    });

    // Kill counts for successful vs failed attack types
    const flow2 = d3.rollups(data, v => v.length, d => d.attackType, d => d.success, d => d.killBin);
    flow2.forEach(([attackType, successGroups]) => {
        successGroups.forEach(([success, killBins]) => {
            const uniqueSource = `${attackType}: ${success}`;
            killBins.forEach(([killBin, val]) => {
                links.push({ source: uniqueSource, target: killBin, value: val, category: attackType, outcome: success });
            });
        });
    });

    // Generate unique nodes
    const nodes = Array.from(new Set(links.flatMap(d => [d.source, d.target])), name => ({ name }));
    const nodeMap = new Map(nodes.map((d, i) => [d.name, i]));
    const formattedLinks = links.map(d => ({
        source: nodeMap.get(d.source),
        target: nodeMap.get(d.target),
        value: d.value,
        category: d.category,
        outcome: d.outcome
    }));

    // Custom ordering for death count
    const deathCountBins = ["0 Deaths", "1-5 Deaths", "6-20 Deaths", "21+ Deaths"];

    // Define sankey graph parameters
    const sankey = d3.sankey()
        .nodeWidth(20)
        .nodePadding(12)
        .extent([[0, 20], [sankeyArea.w, sankeyArea.h - 20]])
        .nodeSort((a, b) => {
            if (deathCountBins.includes(a.name) && deathCountBins.includes(b.name)) {
                return deathCountBins.indexOf(a.name) - deathCountBins.indexOf(b.name);
            }
            return a.name.localeCompare(b.name);
        });

    const graph = sankey({
        nodes: nodes.map(d => Object.assign({}, d)),
        links: formattedLinks.map(d => Object.assign({}, d))
    });

    let selectedNode = null;
    let linkPaths, nodeElements;

    function updateSankeyFocus() {
        if (!selectedNode) {
            linkPaths.style("stroke-opacity", 0.3).style("stroke", "gray");
            nodeElements.select("rect").style("opacity", 1);
            return;
        }

        const connectedLinks = new Set();
        const connectedNodes = new Set([selectedNode]);

        let qForward = [selectedNode];
        while (qForward.length > 0) {
            let curr = qForward.pop();
            graph.links.forEach(l => {
                if (l.source === curr) {
                    connectedLinks.add(l);
                    if (!connectedNodes.has(l.target)) {
                        connectedNodes.add(l.target);
                        qForward.push(l.target);
                    }
                }
            });
        }

        let qBackward = [selectedNode];
        while (qBackward.length > 0) {
            let curr = qBackward.pop();
            graph.links.forEach(l => {
                if (l.target === curr) {
                    connectedLinks.add(l);
                    if (!connectedNodes.has(l.source)) {
                        connectedNodes.add(l.source);
                        qBackward.push(l.source);
                    }
                }
            });
        }

        linkPaths
            .style("stroke-opacity", d => connectedLinks.has(d) ? 0.7 : 0.05)
            .style("stroke", d => connectedLinks.has(d) ? "red" : "gray");
        
        nodeElements.select("rect")
            .style("opacity", d => connectedNodes.has(d) ? 1 : 0.2);
    }

    // Draw Links
    linkPaths = g.append("g").attr("class", "links")
        .selectAll("path").data(graph.links).enter().append("path")
        .attr("class", "link")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke-width", d => Math.max(1, d.width))
        .style("stroke", "gray")
        .on("mouseover", function (event, d) {
            if (!selectedNode) {
                d3.select(this).style("stroke-opacity", 0.7).style("stroke", "red");
            } else if (d3.select(this).style("stroke") === "red") {
                d3.select(this).style("stroke-opacity", 1.0);
            }

            const sourceName = d.source.name.includes(": ") ? `${d.source.name.split(": ")[1]} (${d.source.name.split(": ")[0]})` : d.source.name;
            const targetName = d.target.name.includes(": ") ? `${d.target.name.split(": ")[1]} (${d.target.name.split(": ")[0]})` : d.target.name;

            tooltip.style("visibility", "visible")
                .html(`<strong>Flow:</strong> ${sourceName} &rarr; ${targetName}<br/>
                          <strong>Value:</strong> ${formatComma(d.value)}`);
        })
        .on("mousemove", function (event) {
            tooltip.style("top", (event.pageY - 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", function () {
            if (!selectedNode) {
                d3.select(this).style("stroke-opacity", 0.3).style("stroke", "gray");
            } else {
                updateSankeyFocus();
            }
            tooltip.style("visibility", "hidden");
        });

    // Draw Nodes
    nodeElements = g.append("g").attr("class", "nodes")
        .selectAll("g").data(graph.nodes).enter().append("g")
        .attr("class", "node")
        .style("cursor", "pointer")

        // Code for interactive tooltips and selection
        .on("click", function (event, d) {
            if (selectedNode === d) {
                selectedNode = null;
            } else {
                selectedNode = d;
            }
            updateSankeyFocus();
        })
        .on("mouseover", function (event, d) {
            if (!selectedNode || selectedNode === d) {
                d3.select(this).select("rect").style("opacity", 0.8);
            }

            let displayName = d.name;
            if (d.name.includes(": ")) {
                const [cat, outcome] = d.name.split(": ");
                displayName = `<strong>${outcome}</strong> (${cat})`;
            }

            tooltip.style("visibility", "visible")
                .html(`<strong>Node:</strong> ${displayName}<br/>
                          <strong>Total Value:</strong> ${formatComma(d.value)}<br/>
                          <span style="color:gray; font-size:11px;">(Click to focus on this flow)</span>`);
        })
        .on("mousemove", function (event) {
            tooltip.style("top", (event.pageY - 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", function () {
            if (!selectedNode) {
                d3.select(this).select("rect").style("opacity", 1);
            } else {
                updateSankeyFocus(); // Reset to selection state
            }
            tooltip.style("visibility", "hidden");
        });

    // Categorical color scale for attack types
    const color = d3.scaleOrdinal(d3.schemeTableau10);

    // Chart label 
    g.append("text").attr("class", "chart-title").attr("x", sankeyArea.w / 2).attr("y", 0)
        .text("Attack Lifecycle: Method → Outcome → Fatalities");

    // Rectangles for successful vs unsuccessful nodes
    nodeElements.append("rect")
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("height", d => d.y1 - d.y0)
        .attr("width", d => d.x1 - d.x0)
        .attr("fill", d => {
            if (d.name.includes("Unsuccessful")) return "dodgerblue";
            if (d.name.includes("Successful")) return "crimson";
            return color(d.name);
        })
        .attr("stroke", "white")
        .attr("stroke-width", 0.5);

    // Attack method and death bin labels
    nodeElements.append("text")
        .attr("x", d => d.x0 < sankeyArea.w / 2 ? d.x1 + 6 : d.x0 - 6)
        .attr("y", d => (d.y1 + d.y0) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", d => d.x0 < sankeyArea.w / 2 ? "start" : "end")
        .text(d => d.name.includes(": ") ? d.name.split(": ")[1] : d.name)
        .style("fill", "whitesmoke");
}