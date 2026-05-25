const width = window.innerWidth;
const height = window.innerHeight;
const sankeyWidth = width * 0.9;
const sankeyHeight = height * 0.3;
const barWidth = width * 0.4;
const barHeight = height * 0.35;
const pieWidth = width * 0.22;
const pieHeight = width * 0.22;
const pieRadius = Math.min(pieWidth, pieHeight) / 2;

// svg for the whole page
const svg = d3.select("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%")
    .style("height", "100vh")
    .style("background-color", "#f8f9fa");

// adds the header text
svg.append("text")
    .attr("x", 40)
    .attr("y", 35)
    .attr("font-size", "24px")
    .attr("font-weight", "700")
    .attr("fill", "#222")
    .text("Global Data Science Salaries Dashboard");

// adds a dividing line between header and the graphics
svg.append("line")
    .attr("x1", 0)
    .attr("y1", 55)
    .attr("x2", width)
    .attr("y2", 55)
    .attr("stroke", "#d9d9d9")
    .attr("stroke-width", 2);

// moves each graphic group to their position
const sankeyGroup = svg.append("g")
    .attr("transform", `translate(50, 500)`);

const barGroup = svg.append("g")
    .attr("transform", `translate(110, 120)`);

const pieGroup = svg.append("g")
    .attr("transform", `translate(1100, 280)`);

// data processing and visualization for all three graphics
d3.csv("./data/ds_salaries.csv").then(rawData => {

    const linksMap = new Map();
    
    function addLink(source, target) {
        const key = source + "||" + target;
        if (linksMap.has(key)) {
            linksMap.get(key).value += 1;
        } else {
            linksMap.set(key, {
                source: source,
                target: target,
                value: 1
            });
        }
    }

    rawData.forEach(d => {
        const exp = d.experience_level;
        const emp = d.employment_type;
        const size = d.company_size;
        addLink(exp, emp);
        addLink(emp, size);
    });

    const links = Array.from(linksMap.values());
    const nodeNames = new Set();

    links.forEach(d => {
        nodeNames.add(d.source);
        nodeNames.add(d.target);
    });

    const nodes = Array.from(nodeNames).map(d => ({
        name: d
    }));

    links.forEach(link => {
        link.source = nodes.findIndex(
            d => d.name === link.source
        );
        link.target = nodes.findIndex(
            d => d.name === link.target
        );
    });

    // initializes the sankey plot
    const sankey = d3.sankey()
        .nodeWidth(25)
        .nodePadding(25)
        .extent([[0, 0], [sankeyWidth, sankeyHeight]]);

    const sankeyData = sankey({
        nodes: nodes.map(d => Object.assign({}, d)),
        links: links.map(d => Object.assign({}, d))
    });

    // colors for the sankey plot
    const color = d3.scaleOrdinal()
        .domain(nodes.map(d => d.name))
        .range([
            "#4e79a7",
            "#f28e2b",
            "#e15759",
            "#76b7b2",
            "#59a14f",
            "#edc949",
            "#af7aa1",
            "#ff9da7",
            "#9c755f",
            "#bab0ab"
        ]);

    // sankey plot title
    sankeyGroup.append("text")
        .attr("x", 0)
        .attr("y", -20)
        .attr("font-size", "24px")
        .attr("font-weight", "600")
        .attr("fill", "#222")
        .text("Career Flow Relationships (Experience -> Job Type -> Company Size)");

    // adds the sankey plot paths
    sankeyGroup.append("g")
        .selectAll("path")
        .data(sankeyData.links)
        .enter()
        .append("path")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("fill", "none")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.35)
        .attr("stroke-width", d => Math.max(1, d.width));

    // creates nodes for each category in the sankey plot
    const node = sankeyGroup.append("g")
        .selectAll("g")
        .data(sankeyData.nodes)
        .enter()
        .append("g");

    // makes the nodes into rectangles
    node.append("rect")
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("height", d => d.y1 - d.y0)
        .attr("width", d => d.x1 - d.x0)
        .attr("fill", d => color(d.name))
        .attr("stroke", "#444");

    // adds labels to the side of each rectangle node
    node.append("text")
        .attr("x", d => d.x0 - 10)
        .attr("y", d => (d.y0 + d.y1) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "end")
        .attr("font-size", "14px")
        .attr("fill", "#222")
        .text(d => d.name)
        .filter(d => d.x0 < sankeyWidth / 2)
        .attr("x", d => d.x1 + 10)
        .attr("text-anchor", "start");

    const groupedData = d3.nest()
        .key(d => d.experience_level)
        .entries(rawData);
    
    const grouped = groupedData.map(d => {
        return [
            d.key,
            d3.mean(d.values, v => +v.salary_in_usd)
        ];
    });

    const order = ["EN", "MI", "SE", "EX"];

    grouped.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));

    const barData = grouped.map(d => ({
        experience: d[0],
        salary: d[1]
    }));

    // clip paths for zooming
    const defs = svg.append("defs");

    defs.append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", barWidth)
        .attr("height", barHeight);

    defs.append("clipPath")
        .attr("id", "x-axis-clip")
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", barWidth)
        .attr("height", 60);

    // create a group for the bars and apply the clip path
    const barsContainer = barGroup.append("g")
        .attr("clip-path", "url(#clip)");

    // title for the bar graph
    barGroup.append("text")
        .attr("x", barWidth / 2)
        .attr("y", -25)
        .attr("text-anchor", "middle")
        .attr("font-size", "24px")
        .attr("font-weight", "600")
        .text("Average salary by Experience level (Movable)");

    // sets the scale for the x-axis
    const x = d3.scaleBand()
        .domain(barData.map(d => d.experience))
        .range([0, barWidth])
        .padding(0.3);

    // sets the scale for the y-axis
    const y = d3.scaleLinear()
        .domain([0, d3.max(barData, d => d.salary)])
        .nice()
        .range([barHeight, 0]);
        
    // adds the x-axis to the bottom of the chart
    barGroup.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${barHeight})`)
        .attr("clip-path", "url(#x-axis-clip)")
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("font-size", "14px");

    // adds the y-axis to the side of the chart
    barGroup.append("g")
        .call(
            d3.axisLeft(y)
                .ticks(6)
                .tickFormat(d => "$" + d3.format(".2s")(d))
        );

    // adds a title for the x-axis
    barGroup.append("text")
        .attr("x", barWidth / 2)
        .attr("y", barHeight + 40)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .text("Experience Level");

    // adds a title for the y-axis
    barGroup.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -barHeight / 2)
        .attr("y", -55)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .text("Average Salary (USD)");

    // adds the bars for each experience level inside the clipped container
    barsContainer.selectAll(".bar")
        .data(barData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.experience))
        .attr("y", d => y(d.salary))
        .attr("width", x.bandwidth())
        .attr("height", d => barHeight - y(d.salary))
        .attr("fill", "#4e79a7");

    // zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([1, 6])
        .extent([[0, 0], [barWidth, barHeight]])
        .on("zoom", zoomed);
    
    barGroup.call(zoom)

    function zoomed() {
        const transform = d3.event.transform;
        x.range([0, barWidth].map(d => transform.applyX(d)));
        barsContainer.selectAll(".bar")
            .attr("x", d => x(d.experience))
            .attr("width", x.bandwidth());
        barGroup.select(".x-axis").call(d3.axisBottom(x));
    }

    const locationCounts = {};
    rawData.forEach(d => {
        const loc = d.company_location;
        if (locationCounts[loc]) {
            locationCounts[loc] += 1;
        } else {
            locationCounts[loc] = 1;
        }
    });

    const sortedLocations = Object.entries(locationCounts).sort((a, b) => b[1] - a[1]);
    const topLocations = sortedLocations.slice(0, 4);
    const otherTotal = sortedLocations.slice(4).reduce((sum, d) => sum + d[1], 0);
    topLocations.push(["Other", otherTotal]);

    const pieData = topLocations.map(d => ({
        location: d[0],
        count: d[1],
        enabled: true
    }));

    const total = d3.sum(pieData, d => d.count);

    // title for the pie chart
    pieGroup.append("text")
        .attr("x", 0)
        .attr("y", -190)
        .attr("text-anchor", "middle")
        .attr("font-size", "24px")
        .attr("font-weight", "bold")
        .text("Company Locations");

    // colors for the pie chart
    const pieColor = d3.scaleOrdinal()
        .domain(pieData.map(d => d.location))
        .range(d3.schemeCategory10);

    // initializes the pie chart
    const pie = d3.pie()
        .value(d => d.count);

    // sets the radii for the arcs of the pie chart
    const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(pieRadius);
    
    const legendHeight = pieData.length * 25 + 40;

    // re-renders the enabled slices of the pie whenever called
    function updatePie() {
        const activeData = pieData.filter(d => d.enabled);
    
        const pieSlices = pieGroup.selectAll(".pie-slice")
            .data(pie(activeData), d => d.data.location);
    
        pieSlices.enter()
            .append("path")
            .attr("class", "pie-slice")
            .each(function(d) { this._current = d; })
            .merge(pieSlices)
            .transition()
            .duration(750)
            .attrTween("d", function(d) {
                const interpolate = d3.interpolate(this._current || d, d);
                this._current = interpolate(1);
                return function(t) {
                    return arc(interpolate(t));
                };
            })
            .attr("fill", d => pieColor(d.data.location))
            .attr("stroke", "white")
            .style("stroke-width", "2px");
    
        pieSlices.exit().remove();
    }
    
    updatePie();

    // legend container
    const legend = pieGroup.append("g")
        .attr("transform", `translate(${pieRadius + 40}, ${-pieRadius + 20})`);

    // legend outline box
    legend.append("rect")
        .attr("width", 160)
        .attr("height", legendHeight)
        .attr("fill", "white")
        .attr("stroke", "black")
        .attr("x", -10)
        .attr("y", -40)
        .attr("rx", 6);

    // legend title
    legend.append("text")
        .attr("x", 45)
        .attr("y", -20)
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text("Legend");

    // create one legend row per category
    const legendItems = legend.selectAll(".legend-item")
        .data(pieData)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 25})`);

    // colored square
    legendItems.append("rect")
        .attr("width", 16)
        .attr("height", 16)
        .attr("fill", d => pieColor(d.location));

    // location name
    legendItems.append("text")
        .attr("x", 24)
        .attr("y", 12)
        .style("font-size", "14px")
        .style("fill", "black")
        .text(d => d.location);

    // percentage text
    legendItems.append("text")
        .attr("x", 110)
        .attr("y", 12)
        .style("font-size", "14px")
        .style("fill", "black")
        .style("text-anchor", "end")
        .text(d => `${((d.count / total) * 100).toFixed(1)}%`);

    // selection box
    legendItems.append("rect")
        .attr("x", 125)
        .attr("y", 0)
        .attr("width", 16)
        .attr("height", 16)
        .attr("fill", "white")
        .attr("stroke", "black")
        .style("cursor", "pointer")
        .on("click", function(d) {
            d.enabled = !d.enabled;

            d3.select(this.nextSibling)
                .style("display", d.enabled ? null : "none");

            updatePie();
        });

    // styling for the filled in box
    legendItems.append("rect")
        .attr("x", 128)
        .attr("y", 3)
        .attr("width", 10)
        .attr("height", 10)
        .attr("fill", "black")
        .style("pointer-events", "none");

});