// Global variables to store data and areas
let globalWorldData, globalRawData;
let mapArea, pieArea, sankeyArea;

// Code for tooltips
const tooltip = d3.select("body").append("div").attr("class", "tooltip");
const formatComma = d3.format(",");

// Data processing function
function dataProcessor(d) {
    const nkill = d.nkill ? +d.nkill : 0;
    const nwound = d.nwound ? +d.nwound : 0;
    const casualties = nkill + nwound;

    let killBin = "0 Deaths";
    if (nkill > 0 && nkill <= 5) killBin = "1-5 Deaths";
    else if (nkill > 5 && nkill <= 20) killBin = "6-20 Deaths";
    else if (nkill > 20) killBin = "21+ Deaths";

    return {
        success: +d.success === 1 ? "Successful" : "Unsuccessful",
        attackType: d.attacktype1_txt || "Unknown",
        region: d.region_txt || "Unknown",
        nkill: nkill,
        latitude: d.latitude ? +d.latitude : null,
        longitude: d.longitude ? +d.longitude : null,
        killBin: killBin,
        severity: casualties > 10 ? "High Casualty" : "Low/No Casualty"
    };
}

const svg = d3.select("#main-svg");

// Run data processing function and pass to functions
Promise.all([
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"),
    d3.csv("data/globalterrorismdb_0718dist.csv", dataProcessor)
]).then(([worldData, rawData]) => {
    globalWorldData = worldData;
    globalRawData = rawData;
    renderAll();
});

// Resize listener
window.addEventListener("resize", renderAll);

function renderAll() {
    // Clear previous elements
    svg.selectAll("*").remove();

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Update display areas
    const leftWidth = width * 0.45;
    const rightWidth = width * 0.55;
    mapArea = { x: 0, y: 0, w: leftWidth, h: height * 0.5 };
    pieArea = { x: 0, y: height * 0.5, w: leftWidth, h: height * 0.5 };
    sankeyArea = { x: leftWidth + 40, y: 60, w: rightWidth - 80, h: height - 120 };

    if (globalWorldData && globalRawData) {
        drawMap(globalWorldData, globalRawData);
        drawSankey(globalRawData);
        drawPieChart(globalRawData);
    }
}

// Chart 1: World map of all attack locations
function drawMap(world, data) {
    const g = svg.append("g").attr("transform", `translate(${mapArea.x}, ${mapArea.y + 60})`);

    const projection = d3.geoNaturalEarth1()
        .scale(mapArea.w / 6)
        .translate([mapArea.w / 2, mapArea.h / 2.5]);

    const path = d3.geoPath().projection(projection);

    // Map Background
    g.selectAll(".country")
        .data(topojson.feature(world, world.objects.countries).features)
        .enter().append("path")
        .attr("d", path)
        .attr("fill", "darkslategray")
        .attr("stroke", "gray");

    // Attacks
    g.selectAll("circle")
        .data(data.filter(d => d.latitude && d.longitude))
        .enter().append("circle")
        .attr("cx", d => projection([d.longitude, d.latitude])[0])
        .attr("cy", d => projection([d.longitude, d.latitude])[1])
        .attr("r", 1.5)
        .attr("fill", "tomato")
        .attr("opacity", 0.4);

    g.append("text").attr("class", "chart-title")
        .attr("x", mapArea.w / 2).attr("y", -30).text("Global Incident Hotspots");

    g.append("text")
        .attr("x", mapArea.w / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "lightgray")
        .text("Each red dot represents a single terrorist attack.");
}

// Chart 2: Pie chart showing regional deaths
function drawPieChart(data) {
    const radius = Math.min(pieArea.w, pieArea.h) / 2.5;
    const g = svg.append("g")
        .attr("transform", `translate(${pieArea.x + pieArea.w / 3}, ${pieArea.y + pieArea.h / 2 + 30})`);

    const aggregated = d3.rollups(data, v => d3.sum(v, d => d.nkill), d => d.region)
        .sort((a, b) => b[1] - a[1]);

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

    g.append("text")
        .attr("class", "chart-title")
        .attr("y", -radius - 40)
        .text("Fatalities by Region");
}

// Chart 3: Sankey chart showing progression of attacks
function drawSankey(data) {
    const g = svg.append("g").attr("transform", `translate(${sankeyArea.x}, ${sankeyArea.y})`);

    // Prepare Sankey data by aggregating (crucial for clean lines)
    const sample = data.slice(0, 2000);
    let links = [];

    // Create links: AttackType -> (AttackType: Success)
    const flow1 = d3.rollups(sample, v => v.length, d => d.attackType, d => d.success);
    flow1.forEach(([src, targets]) => {
        targets.forEach(([tgt, val]) => {
            const uniqueTarget = `${src}: ${tgt}`;
            links.push({ source: src, target: uniqueTarget, value: val, category: src, outcome: tgt });
        });
    });

    // Create links: (AttackType: Success) -> KillBin
    const flow2 = d3.rollups(sample, v => v.length, d => d.attackType, d => d.success, d => d.killBin);
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

    const killBinOrder = ["0 Deaths", "1-5 Deaths", "6-20 Deaths", "21+ Deaths"];

    const sankey = d3.sankey()
        .nodeWidth(20)
        .nodePadding(12)
        .extent([[0, 20], [sankeyArea.w, sankeyArea.h - 20]])
        .nodeSort((a, b) => {
            if (killBinOrder.includes(a.name) && killBinOrder.includes(b.name)) {
                return killBinOrder.indexOf(a.name) - killBinOrder.indexOf(b.name);
            }
            return a.name.localeCompare(b.name);
        });

    const graph = sankey({
        nodes: nodes.map(d => Object.assign({}, d)),
        links: formattedLinks.map(d => Object.assign({}, d))
    });

    // Draw Links
    g.append("g").attr("class", "links")
        .selectAll("path").data(graph.links).enter().append("path")
        .attr("class", "link")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke-width", d => Math.max(1, d.width))
        .on("mouseover", function (event, d) {
            d3.select(this).style("stroke-opacity", 0.7);

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
            d3.select(this).style("stroke-opacity", 0.3);
            tooltip.style("visibility", "hidden");
        });

    // Draw Nodes
    const node = g.append("g").attr("class", "nodes")
        .selectAll("g").data(graph.nodes).enter().append("g")
        .attr("class", "node")
        .on("mouseover", function (event, d) {
            d3.select(this).select("rect").style("opacity", 0.8);

            // Clean up name for tooltip if it's a split outcome node
            let displayName = d.name;
            if (d.name.includes(": ")) {
                const [cat, outcome] = d.name.split(": ");
                displayName = `<strong>${outcome}</strong> (${cat})`;
            }

            tooltip.style("visibility", "visible")
                .html(`<strong>Node:</strong> ${displayName}<br/>
                          <strong>Total Value:</strong> ${formatComma(d.value)}`);
        })
        .on("mousemove", function (event) {
            tooltip.style("top", (event.pageY - 10) + "px")
                .style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", function () {
            d3.select(this).select("rect").style("opacity", 1);
            tooltip.style("visibility", "hidden");
        });

    const color = d3.scaleOrdinal(d3.schemeTableau10);

    node.append("rect")
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("height", d => d.y1 - d.y0)
        .attr("width", d => d.x1 - d.x0)
        .attr("fill", d => {
            if (d.name.includes("Unsuccessful")) return "dodgerblue";
            if (d.name.includes("Successful")) return "crimson";
            return color(d.name);
        })
        .attr("stroke", "#fff")
        .attr("stroke-width", 0.5);

    node.append("text")
        .attr("x", d => d.x0 < sankeyArea.w / 2 ? d.x1 + 6 : d.x0 - 6)
        .attr("y", d => (d.y1 + d.y0) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", d => d.x0 < sankeyArea.w / 2 ? "start" : "end")
        .text(d => d.name.includes(": ") ? d.name.split(": ")[1] : d.name)
        .style("fill", "whitesmoke");

    g.append("text").attr("class", "chart-title").attr("x", sankeyArea.w / 2).attr("y", 0)
        .text("Attack Lifecycle: Method → Outcome → Fatalities");
}