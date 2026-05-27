function drawNorthAmericaYearSlider(processedData) {

    // This section selects the main SVG container for the animated bar chart visualization
    const svg = d3.select("svg");

    // This section defines the dimensions and margins for the North America attack type animation
    const chartWidth = 520;
    const chartHeight = 260;
    const margin = { top: 50, right: 30, bottom: 95, left: 65 };

    // This section creates the group container for the North America animated bar chart
    const g = svg.append("g")
        .attr("transform", "translate(900, 530)");

    // This section adds the title for the North America attack type animation
    g.append("text")
        .attr("x", chartWidth / 2)
        .attr("y", 15)
        .attr("font-size", "22px")
        // .attr("font-weight", "bold")
        .attr("text-anchor", "middle")
        .text("Bar Chart and Animation: North America Attacks(1970-2015)");

    // This section creates the legend container for attack type color categories
    const legend = g.append("g")
        .attr("transform", "translate(350, -100)");

    const legendData = [
        { label: "Bombing/Explosion", color: "#b22222" },
        { label: "Armed Assault", color: "#4682b4" },
        { label: "Assassination", color: "#2e8b57" },
        { label: "Facility/Infrastructure Attack", color: "#999999" },
        { label: "Hostage Taking", color: "#ff8c00" }
    ];

    // This section adds colored circles for each attack type legend category
    legend.selectAll(".legend-circle")
        .data(legendData)
        .enter()
        .append("circle")
        .attr("cx", 0)
        .attr("cy", (d, i) => i * 18)
        .attr("r", 6)
        .attr("fill", d => d.color);

    // This section adds text labels describing each legend category
    legend.selectAll(".legend-text")
        .data(legendData)
        .enter()
        .append("text")
        .attr("x", 12)
        .attr("y", (d, i) => i * 18 + 4)
        .text(d => d.label)
        .attr("font-size", "11px");
    
    // This section creates the plotting area for the animated bar chart
    const plot = g.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const innerWidth = chartWidth - margin.left - margin.right;
    const innerHeight = chartHeight - margin.top - margin.bottom;

    // This section filters the dataset to include North America terrorism attacks from 1970 to 2015
    const northAmericaData = processedData.filter(d =>
        d.region === "North America" &&
        d.year >= 1970 &&
        d.year <= 2015
    );

    // this section has a list of types for the legned
    const selectedTypes = [
        "Bombing/Explosion",
        "Armed Assault",
        "Assassination",
        "Facility/Infrastructure Attack",
        "Hostage Taking (Kidnapping)"
    ];

    // This section creates the yearly range used for the slider animation
    const years = d3.range(1970, 2016);

    // This section calculates yearly attack totals for each selected attack type
    function getYearData(year) {
        return selectedTypes.map(type => {
            return {
                type: type,
                count: northAmericaData.filter(d =>
                    d.year === year && d.attackType === type
                ).length
            };
        });
    }

    // This section calculates the maximum attack count used for scaling the bar chart
    const maxCount = d3.max(years, year =>
        d3.max(getYearData(year), d => d.count)
    );

    // This section creates the horizontal categorical scale for attack types
    const x = d3.scaleBand()
        .domain(selectedTypes)
        .range([0, innerWidth])
        .padding(0.25);

    // This section creates the vertical scale for attack counts
    const y = d3.scaleLinear()
        .domain([0, maxCount])
        .range([innerHeight, 0]);

    // This section creates the color scale for attack type categories
    const color = d3.scaleOrdinal()
        .domain(selectedTypes)
        .range(["#b22222", "#4682b4", "#2e8b57", "#999999", "#ff8c00"]);

    // This section creates and displays the x-axis for attack types
    const xAxis = plot.append("g")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(d3.axisBottom(x));

    // This section rotates and styles the x-axis labels for readability
    xAxis.selectAll("text")
        .attr("transform", "rotate(-35)")
        .attr("text-anchor", "end")
        .attr("font-size", "9px");

    // This section creates and displays the y-axis for attack counts
    plot.append("g")
        .call(d3.axisLeft(y).ticks(5));

    // This section adds the x-axis label for the animated bar chart
    g.append("text")
        .attr("x", margin.left + innerWidth / 2)
        .attr("y", chartHeight - 5)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .text("Attack Type");

    // This section adds the y-axis label for the animated bar chart
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -(margin.top + innerHeight / 2))
        .attr("y", 15)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .text("Number of Attacks");

    // This section creates the dynamic year label updated during slider interaction
    const yearLabel = g.append("text")
        .attr("x", margin.left + innerWidth / 2)
        .attr("y", 45)
        .attr("font-size", "16px")
        .attr("text-anchor", "middle")
        .text("Year: 1970");

    // This section creates the animated bars representing attack type frequencies
    const bars = plot.selectAll(".na-bar")
        .data(getYearData(1970))
        .enter()
        .append("rect")
        .attr("class", "na-bar")
        .attr("x", d => x(d.type))
        .attr("width", x.bandwidth())
        .attr("y", innerHeight)
        .attr("height", 0)
        .attr("fill", d => color(d.type));

    let selectedTypesSet = new Set();

    // This section enables multi-selection interaction for highlighting individual attack types
    bars.style("cursor", "pointer")
        .on("click", function(clickedData) {
            if (selectedTypesSet.has(clickedData.type)) {
                selectedTypesSet.delete(clickedData.type);
            } else {
                selectedTypesSet.add(clickedData.type);
            }

            bars.transition()
                .duration(300)
                .attr("opacity", d => {
                    if (selectedTypesSet.size === 0) return 1;
                    return selectedTypesSet.has(d.type) ? 1 : 0;
                });

            valueLabels.transition()
                .duration(300)
                .attr("opacity", d => {
                    if (d.count === 0) return 0;
                    if (selectedTypesSet.size === 0) return 1;
                    return selectedTypesSet.has(d.type) ? 1 : 0;
                });
    });

    // This section animates the initial growth of the bars when the chart loads
    bars.transition()
        .duration(800)
        .attr("y", d => y(d.count))
        .attr("height", d => innerHeight - y(d.count));

    // This section creates labels showing attack count values above each bar
    const valueLabels = plot.selectAll(".na-value-label")
        .data(getYearData(1970))
        .enter()
        .append("text")
        .attr("class", "na-value-label")
        .attr("x", d => x(d.type) + x.bandwidth() / 2)
        .attr("y", d => y(d.count) - 5)
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .text(d => d.count);

    // This section creates the container for the interactive year slider
    const sliderGroup = g.append("g")
        .attr("transform", `translate(${margin.left}, ${chartHeight + 25})`);

    // This section adds instructional text for the slider interaction
    sliderGroup.append("text")
        .attr("x", -110)
        .attr("y", -10)
        .attr("font-size", "12px")
        .attr("font-weight", "bold")
        .text("Slide through years:");

    // This section creates the interactive slider used to animate yearly changes
    sliderGroup.append("foreignObject")
        .attr("x", 0)
        .attr("y", -15)
        .attr("width", innerWidth)
        .attr("height", 45)
        .append("xhtml:input")
        .attr("type", "range")
        .attr("min", 1970)
        .attr("max", 2015)
        .attr("step", 1)
        .attr("value", 1970)
        .style("width", innerWidth + "px")
        .on("input", function() {
            const selectedYear = +this.value;
            updateYear(selectedYear);
        });

    // This section updates bar heights, labels, and transitions when the selected year changes
    function updateYear(selectedYear) {
        const updatedData = getYearData(selectedYear);
        yearLabel.text("Year: " + selectedYear);

        bars.data(updatedData)
            .transition()
            .duration(500)
            .attr("y", d => y(d.count))
            .attr("height", d => innerHeight - y(d.count))
            .attr("fill", d => color(d.type))
            .attr("opacity", d => {
                if (selectedTypesSet.size === 0) return 1;
                return selectedTypesSet.has(d.type) ? 1 : 0;
            });

        // this section updates the value labels above each bar to reflect the new counts for the selected year
        valueLabels.data(updatedData)
            .transition()
            .duration(500)
            .attr("y", d => y(d.count) - 5)
            .attr("opacity", d => {
                if (d.count === 0) return 0;
                if (selectedTypesSet.size === 0) return 1;
                return selectedTypesSet.has(d.type) ? 1 : 0;
            })
            .text(d => d.count);
    }
}

