// 1. Layout Constants
let abFilter = 25;
const width = window.innerWidth;
const height = window.innerHeight;

// View 4: Bar Chart Setup (Animation)
let scatterMargin = {top: 40, right: 30, bottom: 150, left: 60}, 
    scatterWidth = (width / 2) - scatterMargin.left - scatterMargin.right,
    scatterHeight = (height / 2) - scatterMargin.top - scatterMargin.bottom;

// View 5: Donut Chart Setup (with Animation)
let distrMargin = {top: 40, right: 30, bottom: 40, left: 60},
    distrWidth = (width / 2) - distrMargin.left - distrMargin.right,
    distrHeight = (height / 2) - distrMargin.top - distrMargin.bottom;
const radius = Math.min(distrWidth, distrHeight) / 2;

// View 6: Sankey Diagram Setup (with Animation)
let sankeyMargin = {top: 40, right: 100, bottom: 40, left: 40},
    sankeyWidth = width - sankeyMargin.left - sankeyMargin.right,
    sankeyHeight = (height / 2) - sankeyMargin.top - sankeyMargin.bottom;

// 2. Create SVG Containers
const svgBar = d3.select("#view4")
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `0 0 ${scatterWidth + scatterMargin.left + scatterMargin.right} ${scatterHeight + scatterMargin.top + scatterMargin.bottom}`)
    .append("g")
    .attr("transform", `translate(${scatterMargin.left}, ${scatterMargin.top})`);

const svgDistr = d3.select("#view5")
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `0 0 ${distrWidth + distrMargin.left + distrMargin.right} ${distrHeight + distrMargin.top + distrMargin.bottom}`)
    .append("g")
    .attr("transform", `translate(${(distrWidth / 2) + distrMargin.left}, ${(distrHeight / 2) + distrMargin.top})`);

const svgSankey = d3.select("#view6")
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `0 0 ${sankeyWidth + sankeyMargin.left + sankeyMargin.right} ${sankeyHeight + sankeyMargin.top + sankeyMargin.bottom}`)
    .append("g")
    .attr("transform", `translate(${sankeyMargin.left}, ${sankeyMargin.top})`);

// 3. Load and Process Data
JavaScript
// ... [Keep your Layout Constants and SVG Containers as they are] ...
// ... [Keep Layout Constants and SVG Containers as they are] ...

d3.csv("data/fitness.csv").then(function(data) {
    
    // --- 1. DONUT CHART (VIEW 5) ---
    let counts = {};
    data.forEach(d => {
        let key = d["How often do you exercise in a week?"];
        if (key) counts[key] = (counts[key] || 0) + 1;
    });

    let formattedData = Object.keys(counts).map(key => ({
        label: key,
        value: counts[key]
    }));

    const color = d3.scaleOrdinal(d3.schemeTableau10);
    const pie = d3.pie().value(d => d.value).sort(null);
    const arc = d3.arc().innerRadius(radius * 0.5).outerRadius(radius);

    let hiddenCategories = new Set();
    let selectedSlice = null; 

    function updateDonut() {
        let filteredData = formattedData.filter(d => {
            // Only keep these two checks
            const isIsolated = selectedSlice === null || selectedSlice === d.label;
            const isNotHidden = !hiddenCategories.has(d.label);
            
            return isIsolated && isNotHidden;
        });

        const arcsData = pie(filteredData);

        // Path Join
        const path = svgDistr.selectAll("path.arc-path")
            .data(arcsData, d => d.data.label);

        path.exit()
            .transition().duration(500)
            .attr("opacity", 0)
            .remove();

        const pathEnter = path.enter()
            .append("path")
            .attr("class", "arc-path")
            .attr("fill", d => color(d.data.label))
            .attr("stroke", "white")
            .style("stroke-width", "2px")
            .style("cursor", "pointer")
            .each(function(d) { this._current = d; })
            .on("click", (event, d) => {
                selectedSlice = (selectedSlice === d.data.label) ? null : d.data.label;
                updateDonut();
            });

        pathEnter.merge(path)
            .transition().duration(750)
            .attrTween("d", function(d) {
                const interpolate = d3.interpolate(this._current, d);
                this._current = interpolate(0);
                return t => arc(interpolate(t));
            });

        // Labels Join
        const labels = svgDistr.selectAll(".slice-label")
            .data(arcsData, d => d.data.label);

        labels.exit().remove();

        labels.enter()
            .append("text")
            .attr("class", "slice-label")
            .attr("text-anchor", "middle")
            .style("pointer-events", "none")
            .style("fill", "white")
            .style("font-size", "12px")
            .merge(labels)
            .transition().duration(750)
            .attr("transform", d => `translate(${arc.centroid(d)})`)
            .text(d => d.data.value);
    }

    // Legend
    const legend = svgDistr.append("g")
        .attr("transform", `translate(${radius + 20}, ${-radius / 2})`);

    formattedData.forEach((d, i) => {
        const legendRow = legend.append("g")
            .attr("transform", `translate(0, ${i * 20})`)
            .style("cursor", "pointer")
            .on("click", function() {
                if (hiddenCategories.has(d.label)) {
                    hiddenCategories.delete(d.label);
                    d3.select(this).style("opacity", 1);
                } else {
                    hiddenCategories.add(d.label);
                    d3.select(this).style("opacity", 0.3);
                }
                updateDonut();
            });

        legendRow.append("rect").attr("width", 12).attr("height", 12).attr("fill", color(d.label));
        legendRow.append("text").attr("x", 20).attr("y", 10).style("font-size", "11px").text(d.label);
    });
    updateDonut();

    // --- 2. BAR CHART (VIEW 4) ---
    let impactCounts = {};
    data.forEach(d => {
        let key = d["How has the fitness wearable impacted your fitness routine?"];
        if (key) impactCounts[key] = (impactCounts[key] || 0) + 1;
    });

    let barData = Object.keys(impactCounts).map(key => ({
        category: key,
        value: impactCounts[key]
    }));

    const x = d3.scaleBand()
        .domain(barData.map(d => d.category))
        .range([0, scatterWidth])
        .padding(0.2);

    const y = d3.scaleLinear()
        .domain([0, d3.max(barData, d => d.value)])
        .nice()
        .range([scatterHeight, 0]);

    svgBar.selectAll(".bar")
        .data(barData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.category))
        .attr("y", d => y(d.value))
        .attr("width", x.bandwidth())
        .attr("height", d => scatterHeight - y(d.value))
        .attr("fill", "#4e79a7");

    svgBar.append("g")
        .attr("transform", `translate(0,${scatterHeight})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "translate(-10,0)rotate(-45)")
        .style("text-anchor", "end");

    svgBar.append("g").call(d3.axisLeft(y));

    svgBar.append("text")
        .attr("x", scatterWidth / 2).attr("y", -10).attr("text-anchor", "middle")
        .style("font-weight", "bold").text("Impact of Wearable on Routine");

    // --- 3. SANKEY DIAGRAM (VIEW 6) ---
    const sankeyNodes = [];
    const sankeyLinks = [];
    const nodeMap = new Map();

    const cols = [
        "What is your gender?",
        "How often do you track fitness data using wearable?",
        "How has the fitness wearable impacted your fitness routine?",
        "Has the fitness wearable helped you stay motivated to exercise?"
    ];

    function getNode(level, name) {
        const key = `${level}-${name}`;
        if (!nodeMap.has(key)) {
            nodeMap.set(key, sankeyNodes.length);
            sankeyNodes.push({ name: name });
        }
        return nodeMap.get(key);
    }

    cols.forEach((col, i) => {
        if (i === cols.length - 1) return;
        let nextCol = cols[i+1];
        let linkCounts = d3.rollup(data, v => v.length, d => d[col], d => d[nextCol]);
        linkCounts.forEach((targets, sourceName) => {
            targets.forEach((count, targetName) => {
                sankeyLinks.push({
                    source: getNode(i, sourceName),
                    target: getNode(i+1, targetName),
                    value: count
                });
            });
        });
    });

    const sankeyGenerator = d3.sankey()
        .nodeWidth(15)
        .nodePadding(15)
        .extent([[1, 1], [sankeyWidth - 1, sankeyHeight - 5]]);

    const { nodes, links } = sankeyGenerator({
        nodes: sankeyNodes.map(d => Object.assign({}, d)),
        links: sankeyLinks.map(d => Object.assign({}, d))
    });

    svgSankey.append("g")
        .attr("fill", "none")
        .attr("stroke-opacity", 0.3)
      .selectAll("path")
      .data(links)
      .enter().append("path")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke", d => color(d.source.name))
        .attr("stroke-width", d => Math.max(1, d.width));

    const node = svgSankey.append("g")
      .selectAll("g")
      .data(nodes)
      .enter().append("g");

    node.append("rect")
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("height", d => d.y1 - d.y0)
        .attr("width", d => d.x1 - d.x0)
        .attr("fill", d => color(d.name))
        .attr("stroke", "#000");

    node.append("text")
        .attr("x", d => d.x0 < sankeyWidth / 2 ? d.x1 + 6 : d.x0 - 6)
        .attr("y", d => (d.y1 + d.y0) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", d => d.x0 < sankeyWidth / 2 ? "start" : "end")
        .text(d => d.name)
        .style("font-size", "10px");

    svgSankey.append("text")
        .attr("x", sankeyWidth / 2).attr("y", -10).attr("text-anchor", "middle")
        .style("font-weight", "bold").text("Gender → Tracking → Impact → Motivation Flow");

}).catch(error => console.error("Error:", error));