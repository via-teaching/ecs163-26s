let abFilter = 25;
const width = window.innerWidth;
const height = window.innerHeight;

let scatterLeft = 0, scatterTop = 0;
let scatterMargin = {top: 40, right: 30, bottom: 30, left: 60},
    scatterWidth = 400 - scatterMargin.left - scatterMargin.right,
    scatterHeight = 350 - scatterMargin.top - scatterMargin.bottom;

let distrLeft = 400, distrTop = 0;
let distrMargin = {top: 10, right: 30, bottom: 30, left: 60},
    distrWidth = 400 - distrMargin.left - distrMargin.right,
    distrHeight = 350 - distrMargin.top - distrMargin.bottom;

let teamLeft = 0, teamTop = 400;
let teamMargin = {top: 10, right: 30, bottom: 120, left: 60},
    teamWidth = width - teamMargin.left - teamMargin.right,
    teamHeight = height-450 - teamMargin.top - teamMargin.bottom;

// plots
d3.csv("globalterrorismdb_0718dist.csv").then(rawData =>{
    console.log("rawData", rawData);

    // Extract columns needed
    const processedData = rawData.map(d => {
        return {
            targetType: d.targtype1_txt,
            year: Number(d.iyear),
            attackType: d.attacktype1_txt,
            weaponType: d.weaptype1_txt   
        };
    }).filter(d => d.targetType); // Filter out empty rows

    // Count occurrences of each target type
    const targetCounts = processedData.reduce((s, { targetType }) => (s[targetType] = (s[targetType] || 0) + 1, s), {});
    
    // Top 10 most common targets
    let targetData = Object.keys(targetCounts).map((key) => ({ 
        targetType: key,
        count: targetCounts[key] 
    }));
    targetData.sort((a, b) => b.count - a.count);
    targetData = targetData.slice(0, 10);
    console.log("processedData", processedData);

    // plot 2: timeline line chart
    // Process data for timeline, count incidents per year
    const yearCounts = processedData.reduce((s, { year }) => (s[year] = (s[year] || 0) + 1, s), {});
    let yearData = Object.keys(yearCounts).map(key => ({ year: Number(key), count: yearCounts[key] }));
    
    // Sort chronologically
    yearData.sort((a, b) => a.year - b.year); 

    // Set up SVG group
    const svg = d3.select("svg");
    const gTime = svg.append("g")
        .attr("width", scatterWidth + scatterMargin.left + scatterMargin.right)
        .attr("height", scatterHeight + scatterMargin.top + scatterMargin.bottom)
        .attr("transform", `translate(${scatterMargin.left}, ${scatterMargin.top})`);

    // Chart title
    gTime.append("text")
        .attr("x", scatterWidth / 2)
        .attr("y", -10)
        .attr("font-size", "18px")
        .attr("text-anchor", "middle")
        .text("Global Incident Frequency Over Time");

    // X Axis (Years)
    const xTime = d3.scaleLinear()
        .domain(d3.extent(yearData, d => d.year))
        .range([0, scatterWidth]);

    // Prevent years from displaying with commas
    const xAxisTime = d3.axisBottom(xTime).tickFormat(d3.format("d")); 

    gTime.append("g")
        .attr("transform", `translate(0, ${scatterHeight})`)
        .call(xAxisTime);

    // Y Axis (Incident Count)
    const yTime = d3.scaleLinear()
        .domain([0, d3.max(yearData, d => d.count)])
        .range([scatterHeight, 0]);

    const yAxisTime = d3.axisLeft(yTime);
    gTime.append("g").call(yAxisTime);

    const line = d3.line()
        .x(d => xTime(d.year))
        .y(d => yTime(d.count));

    gTime.append("path")
        .datum(yearData)
        .attr("fill", "none")
        .attr("stroke", "#d95f02")
        .attr("stroke-width", 2.5)
        .attr("d", line);

    // Labels
    gTime.append("text")
        .attr("x", scatterWidth / 2)
        .attr("y", scatterHeight + 40)
        .attr("font-size", "16px")
        .attr("text-anchor", "middle")
        .text("Year");

    gTime.append("text")
        .attr("x", -(scatterHeight / 2))
        .attr("y", -45)
        .attr("font-size", "16px")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text("Number of Incidents");
        

    //plot 2: Bar Chart for Team Player Count

    const teamCounts = processedData.reduce((s, { teamID }) => (s[teamID] = (s[teamID] || 0) + 1, s), {});
    const teamData = Object.keys(teamCounts).map((key) => ({ teamID: key, count: teamCounts[key] }));
    console.log("teamData", teamData);


    const g3 = svg.append("g")
                .attr("width", teamWidth + teamMargin.left + teamMargin.right)
                .attr("height", teamHeight + teamMargin.top + teamMargin.bottom)
                .attr("transform", `translate(${teamMargin.left}, ${teamTop})`);

    // Chart title
    g3.append("text")
    .attr("x", teamWidth / 2)
    .attr("y", -10)
    .attr("font-size", "18px")
    .attr("text-anchor", "middle")
    .text("Most Frequently Targeted Sectors");

    // X label
    g3.append("text")
    .attr("x", teamWidth / 2)
    .attr("y", teamHeight + 100)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .text("Target Type");


    // Y label
    g3.append("text")
    .attr("x", -(teamHeight / 2))
    .attr("y", -40)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("Number of Incidents");

    // X ticks
    const x2 = d3.scaleBand()
    .domain(targetData.map(d => d.targetType))
    .range([0, teamWidth])
    .paddingInner(0.3)
    .paddingOuter(0.2);

    const xAxisCall2 = d3.axisBottom(x2);
    g3.append("g")
    .attr("transform", `translate(0, ${teamHeight})`)
    .call(xAxisCall2)
    .selectAll("text")
        .attr("y", "10")
        .attr("x", "-5")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-40)");

    // Y ticks
    const y2 = d3.scaleLinear()
    .domain([0, d3.max(targetData, d => d.count)])
    .range([teamHeight, 0])
    .nice();

    const yAxisCall2 = d3.axisLeft(y2)
                        .ticks(6);
    g3.append("g").call(yAxisCall2);

    // bars
    const bars = g3.selectAll("rect").data(targetData);

    bars.enter().append("rect")
    .attr("y", d => y2(d.count))
    .attr("x", d => x2(d.targetType))
    .attr("width", x2.bandwidth())
    .attr("height", d => teamHeight - y2(d.count))
    .attr("fill", "steelblue");

    // Set up Sankey canvas
    let flowWidth = (width / 2) - 50;
    let flowHeight = 350;
    const gFlow = svg.append("g").attr("transform", `translate(${width / 2}, 40)`);
    // plot 3
    function drawFlowChart(data) {
    console.log("Drawing flow chart...");

    // Attack type and weapon type
    // Clean unknowns
    const validData = data.filter(d =>
        d.attackType && d.attackType !== "Unknown" &&
        d.weaponType && d.weaponType !== "Unknown"
    );

    // Count occurrences of each attack to weapon
    const flowCounts = {};
    validData.forEach(d => {
        const linkName = d.attackType + "|||" + d.weaponType;
        flowCounts[linkName] = (flowCounts[linkName] || 0) + 1;
    });

    // Top 15 most common flows
    let flowArray = Object.keys(flowCounts).map(key => {
        let parts = key.split("|||");
        return { source: parts[0], target: parts[1], value: flowCounts[key] };
    }).sort((a, b) => b.value - a.value).slice(0, 15);

    // Unique nodes list
    const nodesMap = {};
    flowArray.forEach(d => {
        nodesMap[d.source] = true;
        nodesMap[d.target] = true;
    });
    const nodes = Object.keys(nodesMap).map(name => ({ name: name }));

    // Map the string names back to their node
    const links = flowArray.map(d => ({
        source: nodes.findIndex(n => n.name === d.source),
        target: nodes.findIndex(n => n.name === d.target),
        value: d.value
    }));

    const sankeyData = { nodes, links };

    // Sankey
    const sankey = d3.sankey()
        .nodeWidth(20)
        .nodePadding(15)
        .extent([[0, 0], [flowWidth - 100, flowHeight - 50]]);

    const { nodes: sankeyNodes, links: sankeyLinks } = sankey(sankeyData);

    // Draw Sankey links
    const link = gFlow.append("g")
        .selectAll(".link")
        .data(sankeyLinks)
        .enter().append("path")
        .attr("class", "link")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke", "#b0c4de")
        .attr("stroke-width", d => Math.max(1, d.width))
        .attr("fill", "none")
        .style("opacity", 0.6);

    // Draw nodes (vertical colored bars)
    const node = gFlow.append("g")
        .selectAll(".node")
        .data(sankeyNodes)
        .enter().append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${d.x0},${d.y0})`);

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    node.append("rect")
        .attr("height", d => d.y1 - d.y0)
        .attr("width", sankey.nodeWidth())
        .attr("fill", d => color(d.name))
        .attr("stroke", "#333");

    // Node labels
    node.append("text")
        .attr("x", -8)
        .attr("y", d => (d.y1 - d.y0) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "end")
        .attr("font-size", "12px")
        .attr("font-family", "sans-serif")
        .text(d => d.name)
        // Left node has left text, vice versa
        .filter(d => d.x0 < flowWidth / 2)
        .attr("x", 8 + sankey.nodeWidth())
        .attr("text-anchor", "start");

    // Chart title
    gFlow.append("text")
        .attr("x", flowWidth / 2)
        .attr("y", -20)
        .attr("font-size", "18px")
        .attr("text-anchor", "middle")
        .text("Attack Type to Weapon Used");
    }

    drawFlowChart(processedData);

    }).catch(function(error){
    console.log(error);
});