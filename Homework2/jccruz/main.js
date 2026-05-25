const width = window.innerWidth;
const height = window.innerHeight;
const sankeyWidth = width * 0.9;
const sankeyHeight = height * 0.3;
const barWidth = width * 0.4;
const barHeight = height * 0.3;
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
    .attr("transform", `translate(110, 150)`);

const pieGroup = svg.append("g")
    .attr("transform", `translate(1160, 280)`)

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

    // title for the bar graph
    barGroup.append("text")
        .attr("x", barWidth / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .attr("font-size", "24px")
        .attr("font-weight", "600")
        .text("Average salary by Experience level");

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
        .attr("transform", `translate(0, ${barHeight})`)
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

    // adds the bars for each experience level
    barGroup.selectAll("rect")
        .data(barData)
        .enter()
        .append("rect")
        .attr("x", d => x(d.experience))
        .attr("y", d => y(d.salary))
        .attr("width", x.bandwidth())
        .attr("height", d => barHeight - y(d.salary))
        .attr("fill", "#4e79a7");

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
        count: d[1]
    }));

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

    // sets the radii for the labels of the slices
    const labelArc = d3.arc()
        .innerRadius(pieRadius)
        .outerRadius(pieRadius * 0.6);

    // adds the slices of the pie chart with the appropriate proportion
    pieGroup.selectAll("path")
        .data(pie(pieData))
        .enter()
        .append("path")
        .attr("d", arc)
        .attr("fill", d => pieColor(d.data.location))
        .attr("stroke", "white")
        .style("stroke-width", "2px");
    
    // adds the lavels of the slices at about the middle of a slice.
    pieGroup.selectAll(".pie-label")
        .data(pie(pieData))
        .enter()
        .append("text")
        .attr("class", "pie-label")
        .attr("transform", d => `translate(${labelArc.centroid(d)[0]}, ${labelArc.centroid(d)[1]})`)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "white")
        .style("font-weight", "600")
        .text(d => d.data.location);

});