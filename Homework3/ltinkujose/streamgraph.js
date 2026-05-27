function drawStreamGraph(processedData) {

    // This section selects the main SVG container for the streamgraph visualization
    const svg = d3.select("svg");

    const streamWidth = 570;
    const streamHeight = 280;

    // This section creates the group container for the streamgraph
    const g4 = svg.append("g")
        .attr("transform", "translate(100, 470)");

    // This section adds the title for the streamgraph visualization
    g4.append("text")
        .attr("x", streamWidth / 2)
        .attr("y", 20)
        .attr("font-size", "24px")
        .attr("text-anchor", "middle")
        .text("Stream Graph: Terrorism Attack Types Over Time");

    const selectedTypes = [
        "Bombing/Explosion",
        "Armed Assault",
        "Assassination",
        "Hostage Taking (Kidnapping)"
    ];

    // This section filters the dataset to include only selected terrorism attack types
    const filteredStreamData = processedData.filter(d =>
        selectedTypes.includes(d.attackType)
    );

    // This section extracts and sorts all years used in the streamgraph
    const years = Array.from(new Set(
        filteredStreamData.map(d => d.year)
    )).sort((a, b) => a - b);

    // This section creates yearly attack totals for each selected attack type
    const streamData = years.map(year => {
        const row = { year: year };

        selectedTypes.forEach(type => {
            row[type] = d3.sum(
                filteredStreamData.filter(d =>
                    d.year === year && d.attackType === type
                ),
                d => d.count || 1
            );
        });

        return row;
    });

    // This section stacks the attack type layers for streamgraph rendering
    const stack = d3.stack()
        .keys(selectedTypes)
        .offset(d3.stackOffsetWiggle);

    const stackedData = stack(streamData);

    // This section creates the horizontal scale for the yearly timeline
    const x3 = d3.scaleLinear()
        .domain(d3.extent(years))
        .range([0, streamWidth]);

    // This section creates the vertical scale for streamgraph attack frequencies
    const y3 = d3.scaleLinear()
        .domain([
            d3.min(stackedData, layer => d3.min(layer, d => d[0])),
            d3.max(stackedData, layer => d3.max(layer, d => d[1]))
        ])
        .range([streamHeight, 0]);

    // This section creates the area generator used to draw streamgraph layers
    const area = d3.area()
        .x(d => x3(d.data.year))
        .y0(d => y3(d[0]))
        .y1(d => y3(d[1]))
        .curve(d3.curveBasis);

    // This section creates the color scale for attack type categories
    const color = d3.scaleOrdinal()
        .domain(selectedTypes)
        .range(["#b22222", "#4682b4", "#2e8b57", "#ff8c00"]);

    // This section creates and draws the streamgraph layers for attack types
    const layers = g4.selectAll(".stream-layer")
        .data(stackedData)
        .enter()
        .append("path")
        .attr("class", "stream-layer")
        .attr("d", area)
        .attr("fill", d => color(d.key))
        .attr("opacity", 0.85);

    // This section creates the x-axis for the streamgraph timeline
    const xAxis3 = d3.axisBottom(x3)
        .tickFormat(d3.format("d"));

    // This section displays the horizontal x-axis below the streamgraph
    g4.append("g")
        .attr("transform", `translate(0, ${streamHeight})`)
        .call(xAxis3);

    // This section creates the vertical y-axis for attack frequency values
    const yAxis3 = d3.axisLeft(y3);

    // This section displays the vertical y-axis for the streamgraph
    g4.append("g")
        .call(yAxis3);

    // This section adds the x-axis label for the streamgraph
    g4.append("text")
        .attr("x", streamWidth / 2)
        .attr("y", streamHeight + 60)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .text("Year");

    // This section adds the y-axis label for the streamgraph
    g4.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -(streamHeight / 2))
        .attr("y", -60)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .text("Attack Frequency");

    const legendData = [
        { name: "Bombing/Explosion", key: "Bombing/Explosion", color: "#b22222" },
        { name: "Armed Assault", key: "Armed Assault", color: "#4682b4" },
        { name: "Assassination", key: "Assassination", color: "#2e8b57" },
        { name: "Hostage Taking", key: "Hostage Taking (Kidnapping)", color: "#ff8c00" }
    ];

    // This section creates the legend container for streamgraph attack type categories
    const legend = g4.selectAll(".stream-legend")
        .data(legendData)
        .enter()
        .append("g")
        .attr("class", "stream-legend")
        .attr("transform", (d, i) => `translate(${streamWidth + 45}, ${150 + i * 25})`);

    // This section adds colored legend markers for each attack type
    legend.append("circle")
        .attr("r", 7)
        .attr("fill", d => d.color);

    // This section adds text labels describing each streamgraph legend category
    legend.append("text")
        .attr("x", 15)
        .attr("y", 5)
        .text(d => d.name)
        .attr("font-size", "14px");

    // This section creates a horizontal brush so users can select a year range on the streamgraph
    const brush = d3.brushX()
        .extent([[0, 0], [streamWidth, streamHeight]])
        .on("brush end", brushed);

    // This section adds the brush interaction layer on top of the streamgraph
    g4.append("g")
        .attr("class", "stream-brush")
        .call(brush);

    // This section fades streamgraph layers based on the selected brushed year range
    function brushed() {
        const selection = d3.event.selection;

        if (!selection) {
            layers.transition()
                .duration(300)
                .attr("opacity", 0.85);
            return;
        }

        const selectedYears = selection.map(x3.invert);
        const startYear = Math.round(selectedYears[0]);
        const endYear = Math.round(selectedYears[1]);

        layers.transition()
            .duration(300)
            .attr("opacity", 1);

        g4.selectAll(".brush-label").remove();

        g4.append("text")
            .attr("class", "brush-label")
            .attr("x", selection[0])
            .attr("y", 40)
            .attr("font-size", "12px")
            .attr("font-weight", "bold")
            .text(`${startYear}–${endYear}`);
    }
}