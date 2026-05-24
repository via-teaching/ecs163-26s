let allData = [];
let selectedGenres = [];
let genreCounts = [];

// Colors
const barColor = "#3b82f6";
const barSelectedColor = "#C36279";

const effectColors = d3.scaleOrdinal()
    .domain(["Improve", "No effect", "Worsen"])
    .range(["#398117", "#8D8781", "#A9364D"]);

d3.csv("data/mxmh_survey_results.csv").then(rawData => {
    // Process and clean data
    allData = rawData.filter(d =>
        d["Age"] && d["Hours per day"] && d["Fav genre"] &&
        d["Anxiety"] && d["Depression"] && d["Insomnia"] &&
        d["OCD"] && d["Music effects"] && d["Primary streaming service"]
    ).map(d => ({
        age: +d["Age"],
        hours: +d["Hours per day"],
        genre: d["Fav genre"],
        anxiety: +d["Anxiety"],
        depression: +d["Depression"],
        insomnia: +d["Insomnia"],
        ocd: +d["OCD"],
        effect: d["Music effects"],
        service: d["Primary streaming service"]
    })).filter(d => d.age < 100 && d.hours <= 24);

    genreCounts = d3.nest()
        .key(d => d.genre)
        .rollup(v => v.length)
        .entries(allData)
        .sort((a, b) => b.value - a.value);

    initBarChart();
    updateDashboard();
});

// Re-renders downstream focus charts based on selected metrics
function updateDashboard() {
    // Context + Focus filtering step
    const dataToUse = selectedGenres.length > 0 ? allData.filter(d => selectedGenres.includes(d.genre)) : allData;

    updateBarChart();
    drawDonutChart(dataToUse);
    drawSankey(dataToUse);
}

let xBarScale, yBarScale;

function initBarChart() {
    const container = d3.select("#bar-chart");
    const rect = container.node().getBoundingClientRect();
    container.selectAll("*").remove();
    const margin = { top: 20, right: 20, bottom: 60, left: 50 };
    const width = rect.width - margin.left - margin.right;
    const height = rect.height - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", rect.width)
        .attr("height", rect.height)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    xBarScale = d3.scaleBand()
        .domain(genreCounts.map(d => d.key))
        .range([0, width])
        .padding(0.2);

    yBarScale = d3.scaleLinear()
        .domain([0, d3.max(genreCounts, d => d.value)])
        .nice()
        .range([height, 0]);

    // Axes
    svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xBarScale))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    svg.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(yBarScale).ticks(5));

    // Y-Axis Title
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 15)
        .attr("x", -height / 2)
        .attr("fill", "#94a3b8")
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Number of Respondents");

    // Draw Base Bars
    svg.selectAll(".bar")
        .data(genreCounts)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("id", d => `bar-${d.key.replace(/\s+/g, '-')}`)
        .attr("x", d => xBarScale(d.key))
        .attr("y", d => yBarScale(d.value))
        .attr("width", xBarScale.bandwidth())
        .attr("height", d => height - yBarScale(d.value))
        .attr("fill", barColor);

    // FIX: Add Brushing Overlay Layer cleanly
    const brush = d3.brushX()
        .extent([[0, 0], [width, height]])
        .on("brush end", brushed); // Updates instantly while dragging!

    svg.append("g")
        .attr("class", "brush")
        .call(brush);

    function brushed() {
        const selection = d3.event.selection;
        if (!selection) {
            selectedGenres = [];
        } else {
            const [x0, x1] = selection;
            selectedGenres = genreCounts.filter(d => {
                const barX = xBarScale(d.key);
                const barWidth = xBarScale.bandwidth();
                // Check if the brush selections intersect the structural layout band
                return (barX + barWidth >= x0 && barX <= x1);
            }).map(d => d.key);
        }
        updateDashboard();
    }
}

function updateBarChart() {
    // Transitions highlights using Heer & Robertson UI Guidelines (Grouping common states)
    d3.select("#bar-chart").selectAll(".bar")
        .transition().duration(300)
        .attr("fill", d => selectedGenres.includes(d.key) ? barSelectedColor : barColor);
}

function drawDonutChart(data) {
    const container = d3.select("#scatter-plot");
    const rect = container.node().getBoundingClientRect();

    // Clear elements safely but keep parent elements if rebuilding frequently
    container.selectAll("*").remove();

    if (data.length === 0) return;
    const width = rect.width;
    const height = rect.height;
    const radius = Math.min(width, height) / 2 - 30;

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`);

    const counts = d3.nest()
        .key(d => d.effect)
        .rollup(v => v.length)
        .entries(data);

    const pie = d3.pie()
        .value(d => d.value)
        .sort((a, b) => b.key.localeCompare(a.key)); // Preserve sorting identity structure

    const data_ready = pie(counts);

    const arc = d3.arc()
        .innerRadius(radius * 0.5)
        .outerRadius(radius);

    const tooltip = d3.select("#tooltip");

    // Dynamic Filter Morph Transitions
    svg.selectAll('slices')
        .data(data_ready)
        .enter()
        .append('path')
        .attr('fill', d => effectColors(d.data.key))
        .attr("stroke", "rgba(30, 41, 59, 0.85)")
        .style("stroke-width", "2px")
        .style("opacity", 0.9)
        .on("mouseover", function (d) {
            d3.select(this).style("opacity", 1).attr("stroke", "#fff");
            tooltip.style("opacity", 1)
                .html(`<strong>Effect:</strong> ${d.data.key}<br/><strong>Count:</strong> ${d.data.value}`)
                .style("left", (d3.event.pageX + 10) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function (d) {
            d3.select(this).style("opacity", 0.9).attr("stroke", "rgba(30, 41, 59, 0.85)");
            tooltip.style("opacity", 0);
        })
        .transition().duration(600)
        .attrTween("d", function (d) {
            const i = d3.interpolate({ startAngle: d.startAngle, endAngle: d.startAngle }, d);
            return function (t) { return arc(i(t)); };
        });

    // Outer labeling parameters
    const outerArc = d3.arc()
        .innerRadius(radius * 0.85)
        .outerRadius(radius * 0.85);

    svg.selectAll('labels')
        .data(data_ready)
        .enter()
        .append('text')
        .text(d => `${d.data.key} (${d.data.value})`)
        .attr('transform', function (d) {
            const pos = outerArc.centroid(d);
            const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
            pos[0] = radius * 0.95 * (midangle < Math.PI ? 1 : -1);
            return `translate(${pos})`;
        })
        .style('text-anchor', function (d) {
            const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
            return (midangle < Math.PI ? 'start' : 'end');
        })
        .style('font-size', '11px')
        .style('font-weight', '600')
        .attr('fill', d => effectColors(d.data.key))
        .style("opacity", 0)
        .transition().duration(600).delay(200)
        .style("opacity", 1);

    // Total Count Center Text
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("y", -5)
        .style("font-size", "1.8em")
        .style("font-weight", "bold")
        .attr("fill", "#e2e8f0")
        .text(data.length);
}

function drawSankey(data) {
    const container = d3.select("#parallel-coords");
    const rect = container.node().getBoundingClientRect();
    container.selectAll("*").remove();

    if (data.length === 0) return;
    const margin = { top: 30, right: 120, bottom: 20, left: 120 };
    const width = rect.width - margin.left - margin.right;
    const height = rect.height - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", rect.width)
        .attr("height", rect.height);

    // Target tracking capture container
    const bgRect = svg.append("rect")
        .attr("width", rect.width)
        .attr("height", rect.height)
        .style("fill", "none")
        .style("pointer-events", "all");

    const marginGroup = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const zoomGroup = marginGroup.append("g");

    // REQUIREMENT: Setup clean Pan & Zoom
    const zoom = d3.zoom()
        .scaleExtent([0.7, 3]) // Limit zoom threshold to prevent parsing issues
        .extent([[0, 0], [rect.width, rect.height]])
        .on("zoom", () => {
            zoomGroup.attr("transform", d3.event.transform);
        });

    svg.call(zoom);

    // Quick Reset Handler (Double click to reset positioning context)
    bgRect.on("dblclick", () => {
        svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
    });

    // Setup network nodes mapping
    let linksMap = {};
    data.forEach(d => {
        let s1 = d.service;
        let g = d.genre;
        let e = d.effect;
        if (!s1 || !g || !e) return;

        let k1 = `S_${s1}|G_${g}`;
        linksMap[k1] = (linksMap[k1] || 0) + 1;

        let k2 = `G_${g}|E_${e}`;
        linksMap[k2] = (linksMap[k2] || 0) + 1;
    });

    let nodesMap = {};
    let sankeyLinks = [];

    Object.keys(linksMap).forEach(k => {
        let parts = k.split("|");
        let src = parts[0];
        let tgt = parts[1];
        if (!nodesMap[src]) nodesMap[src] = { name: src };
        if (!nodesMap[tgt]) nodesMap[tgt] = { name: tgt };

        sankeyLinks.push({ source: src, target: tgt, value: linksMap[k] });
    });

    let sankeyNodes = Object.values(nodesMap);
    let nodeIndex = {};
    sankeyNodes.forEach((n, i) => { nodeIndex[n.name] = i; });

    sankeyLinks.forEach(l => {
        l.source = nodeIndex[l.source];
        l.target = nodeIndex[l.target];
    });

    if (sankeyNodes.length === 0 || sankeyLinks.length === 0) return;

    const sankey = d3.sankey()
        .nodeWidth(24)
        .nodePadding(20)
        .extent([[1, 1], [width - 1, height - 5]]);

    const { nodes: sNodes, links: sLinks } = sankey({
        nodes: sankeyNodes.map(d => Object.assign({}, d)),
        links: sankeyLinks.map(d => Object.assign({}, d))
    });

    const formatName = name => name.substring(2);

    const genericColor = d3.scaleOrdinal(d3.schemeTableau10);
    const color = name => {
        if (["Improve", "No effect", "Worsen"].includes(name)) return effectColors(name);
        if (selectedGenres.includes(name)) return barSelectedColor;
        return genericColor(name);
    };

    // Staging Transition for structural view layout
    const nodeGroups = zoomGroup.append("g")
        .selectAll("g")
        .data(sNodes)
        .enter().append("g");

    nodeGroups.append("rect")
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0)
        .attr("fill", d => color(formatName(d.name)))
        .attr("opacity", 0)
        .transition().duration(500)
        .attr("opacity", 0.85);

    // Node Text Elements
    nodeGroups.append("text")
        .attr("x", d => d.x0 < width / 2 ? d.x1 + 8 : d.x0 - 8)
        .attr("y", d => (d.y1 + d.y0) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
        .text(d => `${formatName(d.name)} (${d.value})`)
        .style("font-size", "11px")
        .style("fill", "#e2e8f0")
        .style("pointer-events", "none");

    // Setup Link Paths + Gradients
    const defs = svg.append("defs");

    const linkGroup = zoomGroup.append("g")
        .attr("fill", "none")
        .selectAll("path")
        .data(sLinks)
        .enter().append("path")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke", (d, i) => {
            const gradId = `grad-${i}`;
            const grad = defs.append("linearGradient")
                .attr("id", gradId)
                .attr("gradientUnits", "userSpaceOnUse")
                .attr("x1", d.source.x1)
                .attr("x2", d.target.x0);

            grad.append("stop").attr("offset", "0%").attr("stop-color", color(formatName(d.source.name)));
            grad.append("stop").attr("offset", "100%").attr("stop-color", color(formatName(d.target.name)));

            return `url(#${gradId})`;
        })
        .attr("stroke-width", d => Math.max(1, d.width))
        .attr("stroke-opacity", 0)
        .on("mouseover", function () { d3.select(this).style("stroke-opacity", 0.7); })
        .on("mouseout", function () { d3.select(this).style("stroke-opacity", 0.35); })
        .transition().duration(600).delay(200)
        .style("stroke-opacity", 0.35);

    linkGroup.append("title")
        .text(d => `${formatName(d.source.name)} → ${formatName(d.target.name)}\n${d.value} Respondents`);
}