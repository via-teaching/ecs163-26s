let abFilter = 25;
const width = window.innerWidth;
const height = window.innerHeight;

let scatterLeft = 0, scatterTop = 0;
let scatterMargin = {top: 10, right: 30, bottom: 30, left: 60},
    scatterWidth = 400 - scatterMargin.left - scatterMargin.right,
    scatterHeight = 350 - scatterMargin.top - scatterMargin.bottom;

let distrLeft = 400, distrTop = 0;
let distrMargin = {top: 10, right: 30, bottom: 30, left: 60},
    distrWidth = 400 - distrMargin.left - distrMargin.right,
    distrHeight = 350 - distrMargin.top - distrMargin.bottom;

let teamLeft = 0, teamTop = 400;
let teamMargin = {top: 10, right: 30, bottom: 30, left: 60},
    teamWidth = width - teamMargin.left - teamMargin.right,
    teamHeight = height-450 - teamMargin.top - teamMargin.bottom;

// Plots
d3.csv("globalterrorism.csv").then(rawData =>{
    console.log("rawData", rawData);
    rawData.forEach(function(d){
    d.iyear = Number(d.iyear);
    d.nkill = Number(d.nkill) || 0;
    d.nwound = Number(d.nwound) || 0;
    });

    const filteredData = rawData;
    const processedData = filteredData.map(d => {
    return {
        year: d.iyear,
        region: d.region_txt,
        attackType: d.attacktype1_txt,
        killed: d.nkill,
        wounded: d.nwound
    };
    });
    console.log("processedData", processedData);

    const yearCounts = {};

    processedData.forEach(d => {
        if (!yearCounts[d.year]) {
            yearCounts[d.year] = 0;
        }
        yearCounts[d.year]++;
    });

// This section prepares yearly attack totals for the line chart overview visualization
    const attacksByYear = Object.keys(yearCounts).map(year => {
        return {
            year: Number(year),
            count: yearCounts[year]
        };
    }).sort((a, b) => a.year - b.year);

    console.log("attacksByYear", attacksByYear);

    //Plot 1: Line Chart
    const svg = d3.select("svg");

// Create SVG group container for the overview line chart layout
    const g1 = svg.append("g")
                .attr("width", scatterWidth + scatterMargin.left + scatterMargin.right)
                .attr("height", scatterHeight + scatterMargin.top + scatterMargin.bottom)
                .attr("transform", `translate(100, 60)`);

// This section adds the title describing the overall terrorism trend visualization
    g1.append("text")
        .attr("x", 260)
        .attr("y", -2)
        .attr("font-size", "24px")
        .attr("text-anchor", "middle")
        .text("Line chart: Global Terrorism Attacks over the years");
    
// X label
    g1.append("text")
    .attr("x", scatterWidth / 2)
    .attr("y", scatterHeight + 60)
    .attr("font-size", "16px")
    .attr("text-anchor", "middle")
    .text("Year");

// Y label
    g1.append("text")
    .attr("x", -(scatterHeight / 2))
    .attr("y", -50)
    .attr("font-size", "16px")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("Number of Attacks");

// X ticks
    const x1 = d3.scaleLinear()
    // .domain(d3.extent(attacksByYear, d => d.year))
    .domain([1970, 2017])
    .range([0, scatterWidth]);

// This section creates and formats the x-axis labels for the line chart timeline
    const xAxisCall = d3.axisBottom(x1)
                        .tickValues([1970, 1975, 1980, 1985, 1990, 1995, 2000, 2005, 2010, 2015])
                        .tickFormat(d3.format("d"));
    g1.append("g")
    .attr("transform", `translate(0, ${scatterHeight})`)
    .call(xAxisCall)
    .selectAll("text")
        .attr("y", "10")
        .attr("x", "-5")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-40)");

// This section creates the y-axis scale and generates the line path for yearly attack counts
    const y1 = d3.scaleLinear()
    .domain([0, d3.max(attacksByYear, d => d.count)])
    .range([scatterHeight, 0]);

    const yAxisCall = d3.axisLeft(y1)
                        .ticks(13);
    g1.append("g").call(yAxisCall);

    const line = d3.line()
    .x(d => x1(d.year))
    .y(d => y1(d.count));

// This section draws the attack trend line and adds a legend
    g1.append("path")
        .datum(attacksByYear)
        .attr("fill", "none")
        .attr("stroke", "red")
        .attr("stroke-width", 2)
        .attr("d", line);
    
    g1.append("line")
        .attr("x1", 360)
        .attr("y1", 20)
        .attr("x2", 390)
        .attr("y2", 20)
        .attr("stroke", "red")
        .attr("stroke-width", 3);

    g1.append("text")
        .attr("x", 400)
        .attr("y", 25)
        .text("Total Attacks")
        .attr("font-size", "12px");

// This section creates the container for additional dashboard visualizations
    const g2 = svg.append("g")
                .attr("width", distrWidth + distrMargin.left + distrMargin.right)
                .attr("height", distrHeight + distrMargin.top + distrMargin.bottom)
                .attr("transform", `translate(${distrLeft}, ${distrTop})`);

//Plot 2: Node-Link Diagram
    const linkCounts = {};

// This section counts connections between regions and attack types
    processedData.forEach(d => {
        const key = d.region + "||" + d.attackType;

        if (!linkCounts[key]) {
            linkCounts[key] = {
                source: d.region,
                target: d.attackType,
                count: 0
            };
        }

        linkCounts[key].count++;
    });

// This section creates the nodes and strongest links for the node-link diagram
    const links = Object.values(linkCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 30);

    console.log("node-link links", links);
    const nodeNames = Array.from(new Set(
    links.flatMap(d => [d.source, d.target])
    ));

    const nodes = nodeNames.map(name => {
        return { id: name };
    });

    console.log("node-link nodes", nodes);

    const g3 = svg.append("g") // to move plot as a whole
    .attr("transform", "translate(950, 100)");

// This section adds the title for the node-link visualization
    g3.append("text")
    .attr("x", 250)
    .attr("y", -40)
    .attr("font-size", "22px")
    .attr("text-anchor", "middle")
    .text("Node-Link Diagram: Terrorism Regions and Types");

// This section creates the force simulation layout for the node-link diagram
    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links)
            .id(d => d.id)
            .distance(120))
        .force("charge", d3.forceManyBody().strength(-250))
        .force("center", d3.forceCenter(250, 200));

// This section draws the links connecting regions and attack types
    const link = g3.selectAll("line")
        .data(links)
        .enter()
        .append("line")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .attr("stroke-width", d => Math.sqrt(d.count) / 15);

// This section colors and labels the nodes for regions and attack types
    const node = g3.selectAll("circle")
        .data(nodes)
        .enter()
        .append("circle")
        .attr("r", 8)
        .attr("fill", d => {
            const regions = processedData.map(p => p.region);
            if (regions.includes(d.id)) {
                return "#b22222";
            } else {
                return "#ff8c00";
            }
        });

    const label = g3.selectAll("text")
        .data(nodes)
        .enter()
        .append("text")
        .text(d => d.id)
        .attr("font-size", "10px")
        .attr("dx", 10)
        .attr("dy", 4);
    
// This section updates node and link positions during the force simulation
    simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);

        label
            .attr("x", d => d.x)
            .attr("y", d => d.y);
    });

// This section adds legend color-text pairs for regions, attack types, and link frequency
    g3.append("circle")
        .attr("cx", -40)
        .attr("cy", -20)
        .attr("r", 7)
        .attr("fill", "#b22222");

    g3.append("text")
        .attr("x", -20)
        .attr("y", -15)
        .text("Region")
        .attr("font-size", "12px");

    g3.append("circle")
        .attr("cx", -40)
        .attr("cy", 5)
        .attr("r", 7)
        .attr("fill", "#ff8c00");

    g3.append("text")
        .attr("x", -20)
        .attr("y", 10)
        .text("Attack Type")
        .attr("font-size", "12px");

    g3.append("line")
        .attr("x1", -45)
        .attr("y1", 30)
        .attr("x2", -15)
        .attr("y2", 30)
        .attr("stroke", "#999")
        .attr("stroke-width", 4);

    g3.append("text")
        .attr("x", -5)
        .attr("y", 35)
        .text("Thicker line = more Frequency")
        .attr("font-size", "12px");
    console.log("node-link nodes", nodes);

    // Plot 3: Streamgraph
    const g4 = svg.append("g")
        .attr("transform", "translate(100, 450)"); // to move plot as a whole

// This section adds the streamgraph title and selects major attack types to visualize
    g4.append("text")
        .attr("x", 470)
        .attr("y", 10)
        .attr("font-size", "24px")
        .attr("text-anchor", "middle")
        .text("Stream Graph: Terrorism Attack Types Over Time");

    const selectedTypes = [
        "Bombing/Explosion",
        "Armed Assault",
        "Assassination",
        "Hostage Taking (Kidnapping)"
    ];

// This section groups attack type counts by year for the streamgraph
    const filteredStreamData = processedData.filter(d =>
        selectedTypes.includes(d.attackType)
    ); 

    const years = Array.from(new Set(
        filteredStreamData.map(d => d.year)
    )).sort((a, b) => a - b);

    const streamData = years.map(year => {
        const row = { year: year };

        selectedTypes.forEach(type => {
            row[type] = filteredStreamData.filter(d =>
                d.year === year && d.attackType === type
            ).length;
        });

        return row;
    });

    console.log("streamData", streamData);

    const stack = d3.stack()
    .keys(selectedTypes)
    .offset(d3.stackOffsetWiggle);
    const stackedData = stack(streamData);

// This section creates the x and y scales for the streamgraph axes
    const x3 = d3.scaleLinear()
        .domain(d3.extent(years))
        .range([0, 800]);

    const y3 = d3.scaleLinear()
        .domain([
            d3.min(stackedData, layer => d3.min(layer, d => d[0])),
            d3.max(stackedData, layer => d3.max(layer, d => d[1]))
        ])
        .range([300, 0]);

// This section creates colored streamgraph layers for each attack type
    const area = d3.area()
    .x(d => x3(d.data.year))
    .y0(d => y3(d[0]))
    .y1(d => y3(d[1]))
    .curve(d3.curveBasis);

    const color = d3.scaleOrdinal()
        .domain(selectedTypes)
        .range(["#b22222", "#4682b4", "#2e8b57", "#ff8c00"]);
    
        g4.selectAll(".stream-layer")
        .data(stackedData)
        .enter()
        .append("path")
        .attr("class", "stream-layer")
        .attr("d", area)
        .attr("fill", d => color(d.key))
        .attr("opacity", 0.85);
    
    // Legend
    const legendData = [
        { name: "Bombing/Explosion", color: "#b22222" },
        { name: "Armed Assault", color: "#4682b4" },
        { name: "Assassination", color: "#2e8b57" },
        { name: "Hostage Taking", color: "#ff8c00" }
    ];

// This section adds legend color-text pairs for the streamgraph attack types
    const legend = g4.selectAll(".stream-legend")
        .data(legendData)
        .enter()
        .append("g")
        .attr("transform", (d, i) => `translate(880, ${160 +i * 25})`);

    legend.append("circle")
        .attr("r", 7)
        .attr("fill", d => d.color);

    legend.append("text")
        .attr("x", 15)
        .attr("y", 10)
        .text(d => d.name)
        .attr("font-size", "14px");

// This section creates and displays the streamgraph x and y axes
    const xAxis3 = d3.axisBottom(x3)
        .tickFormat(d3.format("d"));

    g4.append("g")
        .attr("transform", "translate(0, 300)")
        .call(xAxis3);

    const yAxis3 = d3.axisLeft(y3);

    g4.append("g")
        .call(yAxis3);
    
    // X Label
    g4.append("text")
        .attr("x", 500)
        .attr("y", 350)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .text("Year");

    // Y Label
    g4.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -200)
        .attr("y", -60)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .text("Attack Frequency");
    
    }).catch(function(error){
    console.log(error);
});