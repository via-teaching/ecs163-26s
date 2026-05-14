let allData = [];
let selectedGenre = null;

// Colors
const barColor = "#3b82f6";
const barHoverColor = "#60a5fa";
const barSelectedColor = "#C36279";

const effectColors = d3.scaleOrdinal()
    .domain(["Improve", "No effect", "Worsen"])
    .range(["#398117", "#8D8781", "#A9364D"]); // Bright Green, Slate, Bright Red

d3.csv("data/mxmh_survey_results.csv").then(rawData => {
    // Process and clean data
    allData = rawData.filter(d =>
        d["Age"] &&
        d["Hours per day"] &&
        d["Fav genre"] &&
        d["Anxiety"] &&
        d["Depression"] &&
        d["Insomnia"] &&
        d["OCD"] &&
        d["Music effects"] &&
        d["Primary streaming service"]
    ).map(d => ({
        age: +d["Age"],
        hours: +d["Hours per day"],
        genre: d["Fav genre"],
        anxiety: +d["Anxiety"],
        depression: +d["Depression"],
        insomnia: +d["Insomnia"],
        ocd: +d["OCD"],
        effect: d["Music effects"],
        service: d["Primary streaming service"],
        instrumentalist: d["Instrumentalist"],
        composer: d["Composer"],
        exploratory: d["Exploratory"]
    })).filter(d => d.age < 100 && d.hours <= 24); // Remove extreme outliers

    updateDashboard();
});

// Re-renders the dashboard based on the selected genre filter
function updateDashboard() {
    const dataToUse = selectedGenre ? allData.filter(d => d.genre === selectedGenre) : allData;

    drawBarChart(allData); // Always show all genres on the bar chart, but highlight the selected one
    drawDonutChart(dataToUse);
    drawSankey(dataToUse);
}

function drawBarChart(data) {
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

    // Aggregate Data
    const genreCounts = d3.nest()
        .key(d => d.genre)
        .rollup(v => v.length)
        .entries(data)
        .sort((a, b) => b.value - a.value);

    // Scales
    const x = d3.scaleBand()
        .domain(genreCounts.map(d => d.key))
        .range([0, width])
        .padding(0.2);

    const y = d3.scaleLinear()
        .domain([0, d3.max(genreCounts, d => d.value)])
        .nice()
        .range([height, 0]);

    // Axes
    svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    svg.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y).ticks(5));

    // Y-Axis Title
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 15)
        .attr("x", -height / 2)
        .attr("fill", "#94a3b8")
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Number of Respondents");

    const tooltip = d3.select("#tooltip");

    // Draw Bars
    svg.selectAll(".bar")
        .data(genreCounts)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.key))
        .attr("y", d => y(d.value))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d.value))
        .attr("fill", d => selectedGenre === d.key ? barSelectedColor : barColor)
        .style("cursor", "pointer")
        .on("mouseover", function (d) {
            d3.select(this).attr("fill", d.key === selectedGenre ? barSelectedColor : barHoverColor);
            tooltip.style("opacity", 1)
                .html(`<strong>Genre:</strong> ${d.key}<br/><strong>Count:</strong> ${d.value}`)
                .style("left", (d3.event.pageX + 10) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function (d) {
            d3.select(this).attr("fill", d.key === selectedGenre ? barSelectedColor : barColor);
            tooltip.style("opacity", 0);
        })
        .on("click", function (d) {
            // Toggle selection
            selectedGenre = selectedGenre === d.key ? null : d.key;
            updateDashboard();
        });
}

function drawDonutChart(data) {
    const container = d3.select("#scatter-plot");
    const rect = container.node().getBoundingClientRect();
    container.selectAll("*").remove();

    if (data.length === 0) return;
    const margin = 20;
    const width = rect.width;
    const height = rect.height;
    const radius = Math.min(width, height) / 2 - margin;

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`);

    // Aggregate data by effect
    const counts = d3.nest()
        .key(d => d.effect)
        .rollup(v => v.length)
        .entries(data);

    // Compute pie slices
    const pie = d3.pie()
        .value(d => d.value)
        .sort(null);
    const data_ready = pie(counts);

    // Arc generator (donut hole is innerRadius)
    const arc = d3.arc()
        .innerRadius(radius * 0.5) // This makes it a donut
        .outerRadius(radius);

    const tooltip = d3.select("#tooltip");

    // Build the pie chart
    svg.selectAll('allSlices')
        .data(data_ready)
        .enter()
        .append('path')
        .attr('d', arc)
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
        });

    // Add labels
    const outerArc = d3.arc()
        .innerRadius(radius * 0.8)
        .outerRadius(radius * 0.8);

    svg.selectAll('allLabels')
        .data(data_ready)
        .enter()
        .append('text')
        .text(d => d.data.key)
        .attr('transform', function (d) {
            const pos = outerArc.centroid(d);
            // push the text out slightly depending on angle
            const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
            pos[0] = radius * 0.85 * (midangle < Math.PI ? 1 : -1);
            return `translate(${pos})`;
        })
        .style('text-anchor', function (d) {
            const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
            return (midangle < Math.PI ? 'start' : 'end');
        })
        .style('font-size', '12px')
        .style('font-weight', '600')
        .attr('fill', d => effectColors(d.data.key));

    // Connect lines for labels
    svg.selectAll('allPolylines')
        .data(data_ready)
        .enter()
        .append('polyline')
        .attr("stroke", d => effectColors(d.data.key))
        .style("fill", "none")
        .attr("stroke-width", 1)
        .attr('points', function (d) {
            const posA = arc.centroid(d); // line insertion in the slice
            const posB = outerArc.centroid(d); // line break: we use the other arc generator that has been built only for that
            const posC = outerArc.centroid(d); // Label position = almost the same as posB
            const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
            posC[0] = radius * 0.8 * (midangle < Math.PI ? 1 : -1);
            return [posA, posB, posC];
        });

    // Total text in the middle
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("y", -5)
        .style("font-size", "2em")
        .style("font-weight", "bold")
        .attr("fill", "#e2e8f0")
        .text(data.length);

    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("y", 15)
        .style("font-size", "12px")
        .attr("fill", "#94a3b8")
        .text("Respondents");
}

function drawSankey(data) {
    const container = d3.select("#parallel-coords");
    const rect = container.node().getBoundingClientRect();
    container.selectAll("*").remove();

    if (data.length === 0) return;
    const margin = { top: 30, right: 100, bottom: 20, left: 50 };
    const width = rect.width - margin.left - margin.right;
    const height = rect.height - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", rect.width)
        .attr("height", rect.height)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Prepare data for Sankey
    let linksMap = {};
    data.forEach(d => {
        let s1 = d.service;
        let g = d.genre;
        let e = d.effect;

        if (!s1 || !g || !e) return;

        // streaming service -> genre
        let k1 = `S_${s1}|G_${g}`;
        linksMap[k1] = (linksMap[k1] || 0) + 1;

        // genre -> effect
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

        sankeyLinks.push({
            source: src,
            target: tgt,
            value: linksMap[k]
        });
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
        .nodeWidth(20)
        .nodePadding(15)
        .extent([[1, 1], [width - 1, height - 5]]);

    const { nodes: sNodes, links: sLinks } = sankey({
        nodes: sankeyNodes.map(d => Object.assign({}, d)),
        links: sankeyLinks.map(d => Object.assign({}, d))
    });

    const formatName = name => name.substring(2);

    const genericColor = d3.scaleOrdinal(d3.schemeSet3);
    const color = name => {
        if (["Improve", "No effect", "Worsen"].includes(name)) return effectColors(name);
        if (name === selectedGenre) return barSelectedColor;
        return genericColor(name);
    };

    svg.append("g")
        .selectAll("rect")
        .data(sNodes)
        .enter().append("rect")
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("height", d => d.y1 - d.y0)
        .attr("width", d => d.x1 - d.x0)
        .attr("fill", d => color(formatName(d.name)))
        .attr("opacity", 0.8)
        .append("title")
        .text(d => `${formatName(d.name)}\n${d.value}`);

    const defs = svg.append("defs");

    const linkGroup = svg.append("g")
        .attr("fill", "none")
        .selectAll("g")
        .data(sLinks)
        .enter().append("g");

    const gradient = linkGroup.append("linearGradient")
        .attr("id", (d, i) => {
            d.uid = `gradient-${i}`;
            return d.uid;
        })
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", d => d.source.x1)
        .attr("x2", d => d.target.x0);

    gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", d => color(formatName(d.source.name)));

    gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", d => color(formatName(d.target.name)));

    linkGroup.append("path")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke", d => `url(#${d.uid})`)
        .attr("stroke-width", d => Math.max(1, d.width))
        .attr("stroke-opacity", 0.5)
        .on("mouseover", function () {
            d3.select(this).attr("stroke-opacity", 0.8);
        })
        .on("mouseout", function () {
            d3.select(this).attr("stroke-opacity", 0.5);
        })
        .append("title")
        .text(d => `${formatName(d.source.name)} → ${formatName(d.target.name)}\n${d.value} Respondents`);

    svg.append("g")
        .style("font-size", "11px")
        .style("fill", "#e2e8f0")
        .selectAll("text")
        .data(sNodes)
        .enter().append("text")
        .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
        .attr("y", d => (d.y1 + d.y0) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
        .text(d => formatName(d.name));
}