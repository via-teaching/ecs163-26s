function drawNodeLink(processedData) {
    
    // This section selects the main SVG container for the node-link visualization
    const svg = d3.select("svg");
    const linkCounts = {}; 

    // This section counts the frequency of connections between terrorism regions and attack types
    processedData.forEach(d => {
        const key = d.region + "||" + d.attackType;

        if (!linkCounts[key]) {
            linkCounts[key] = {
                source: d.region,
                target: d.attackType,
                count: 0
            };
        }
    // This section creates the strongest links and generates the unique node list for the node-link diagram
        linkCounts[key].count++;
    });

    // This section selects the top 30 strongest connections between regions and attack types for the node-link diagram
    const links = Object.values(linkCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 30);

    // This section creates the unique node list by extracting all region and attack type names from the selected links
    const nodeNames = Array.from(new Set(
        links.flatMap(d => [d.source, d.target])
    ));

// This section converts the node names into node objects
// and stores all unique terrorism regions for color encoding
    const nodes = nodeNames.map(name => ({ id: name }));
    const regions = Array.from(new Set(processedData.map(d => d.region)));

// This section creates the container group and title
// for the node-link diagram visualization
    const g3 = svg.append("g")
        .attr("transform", "translate(620, 100)");

    g3.append("text")
        .attr("x", 250)
        .attr("y", -50)
        .attr("font-size", "22px")
        .attr("text-anchor", "middle")
        .text("Node-Link Diagram: Terrorism Regions and Types");

// This section creates the information box container used to display details about selected nodes
    const infoBox = g3.append("g")
        .attr("class", "node-info-box");

// This section creates the force simulation layout that positions
// nodes and links using attraction, repulsion, and centering forces
    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(120))
        .force("charge", d3.forceManyBody().strength(-250))
        .force("center", d3.forceCenter(250, 200));

// This section creates and styles the links connecting
// terrorism regions and attack types in the node-link diagram
    const link = g3.selectAll(".node-link-line")
        .data(links)
        .enter()
        .append("line")
        .attr("class", "node-link-line")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .attr("stroke-width", d => Math.sqrt(d.count) / 15);

// This section creates interactive nodes representing terrorism
// regions and attack types with different color encodings
    const node = g3.selectAll(".node-circle")
        .data(nodes)
        .enter()
        .append("circle")
        .attr("class", "node-circle")
        .attr("r", 8)
        .attr("fill", d => regions.includes(d.id) ? "#b22222" : "#ff8c00")
        .style("cursor", "pointer");

// This section creates text labels for each node
// to identify regions and attack types in the visualization
    const label = g3.selectAll(".node-label")
        .data(nodes)
        .enter()
        .append("text")
        .attr("class", "node-label")
        .text(d => d.id)
        .attr("font-size", "10px")
        .attr("dx", 10)
        .attr("dy", 4);

// This section enables node selection interaction by identifying
// all nodes and links connected to the clicked node
    node.on("click", function(clickedNode) {
        const connectedNodeIds = new Set();

// This section checks each link in the network and stores
// the nodes connected to the selected node interaction
    links.forEach(l => {
        const sourceId = typeof l.source === "object" ? l.source.id : l.source;
        const targetId = typeof l.target === "object" ? l.target.id : l.target;

        if (sourceId === clickedNode.id || targetId === clickedNode.id) {
            connectedNodeIds.add(sourceId);
            connectedNodeIds.add(targetId);
        }
    });

// This section determines whether the selected node represents
// a terrorism region or attack type and filters matching dataset rows
    const isRegion = regions.includes(clickedNode.id);

    const matchingRows = processedData.filter(d => {
        return isRegion ? d.region === clickedNode.id : d.attackType === clickedNode.id;
    });

    // This section counts the connected categories for the selected node
    const connectionCounts = {};
    matchingRows.forEach(d => {
        const key = isRegion ? d.attackType : d.region;
        connectionCounts[key] = (connectionCounts[key] || 0) + 1;
    });

    // This section finds the most frequent connected category for the selected node
    const topConnection = Object.entries(connectionCounts)
        .sort((a, b) => b[1] - a[1])[0];

    // This section calculates casualty totals for the selected node
    const totalKilled = d3.sum(matchingRows, d => d.killed);
    const totalWounded = d3.sum(matchingRows, d => d.wounded);

    // This section clears the previous information box before drawing updated details
    infoBox.selectAll("*").remove();

    // This section draws the background rectangle for the selected node information box
    infoBox.append("rect")
        .attr("x", -110)
        .attr("y", 10)
        .attr("width", 265)
        .attr("height", 85)
        .attr("fill", "white")
        .attr("stroke", "black")
        .attr("rx", 8)
        .attr("opacity", 0.95);

    // This section adds the selected node name to the information box
    infoBox.append("text")
        .attr("x", 200)
        .attr("y", 10)
        .attr("font-size", "15px")
        .attr("font-weight", "bold")
        .text(clickedNode.id);

    // This section adds the selected node type to the information box
    infoBox.append("text")
        .attr("x", -100)
        .attr("y", 30)
        .attr("font-size", "12px")
        .text("Type: " + (isRegion ? "Region" : "Attack Type"));

    // This section adds the total attack count for the selected node
    infoBox.append("text")
        .attr("x", -100)
        .attr("y", 50)
        .attr("font-size", "12px")
        .text("Total attacks in dataset: " + matchingRows.length.toLocaleString());

    // This section adds the strongest connected category for the selected node
    infoBox.append("text")
        .attr("x", -105)
        .attr("y", 70)
        .attr("font-size", "12px")
        .text("Top connection: " + (topConnection ? topConnection[0] + " (" + topConnection[1].toLocaleString() + ")" : "None"));

    // This section adds killed and wounded totals for the selected node
    infoBox.append("text")
        .attr("x", -100)
        .attr("y", 85)
        .attr("font-size", "12px")
        .text("Killed: " + totalKilled.toLocaleString() + " | Wounded: " + totalWounded.toLocaleString());
    });

    // This section resets node, label, and link styling when a node is double-clicked
    node.on("dblclick", function() {
        node.transition().duration(500).attr("opacity", 1).attr("r", 8);
        label.transition().duration(500).attr("opacity", 1);
        link.transition().duration(500)
            .attr("stroke-opacity", 0.6)
            .attr("stroke-width", d => Math.sqrt(d.count) / 15);

        infoBox.selectAll("*").remove();
    });

    // This section updates link, node, and label positions on every force simulation tick
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

    // This section adds the legend marker for region nodes
    g3.append("circle").attr("cx", 490).attr("cy", -20).attr("r", 7).attr("fill", "#b22222");
    // This section adds the legend label for region nodes
    g3.append("text").attr("x", 510).attr("y", -15).text("Region").attr("font-size", "12px");

    // This section adds the legend marker for attack type nodes
    g3.append("circle").attr("cx", 490).attr("cy", 5).attr("r", 7).attr("fill", "#ff8c00");
    // This section adds the legend label for attack type nodes
    g3.append("text").attr("x", 510).attr("y", 10).text("Attack Type").attr("font-size", "12px");

    // This section adds the legend line showing that thicker links represent higher frequency
    g3.append("line").attr("x1",490).attr("y1", 30).attr("x2", 510).attr("y2", 30).attr("stroke", "#999").attr("stroke-width", 4);
    // This section adds the explanatory legend text for link thickness
    g3.append("text").attr("x", 520).attr("y", 35).text("Thicker line = more Frequency").attr("font-size", "12px");
    }