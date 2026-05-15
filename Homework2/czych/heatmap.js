/* Heatmap */
function buildHeatmapData(rows) {
    const grouped = d3.nest()
        .key(function (d) { return d.experience_level; })
        .key(function (d) { return d.company_size; })
        .rollup(function (values) {
            return d3.mean(values, function (d) { return d.salary_in_usd; });
        })
        .entries(rows);

    const cells = [];
    grouped.forEach(function (expGroup) {
        expGroup.values.forEach(function (sizeGroup) {
            cells.push({
                experience: expGroup.key,
                companySize: sizeGroup.key,
                salary: sizeGroup.value
            });
        });
    });

    return cells;
}

function drawHeatmap(svg, rows, layout) {
    const margin = { top: 48, right: 88, bottom: 52, left: 96 };
    const width = layout.width - margin.left - margin.right;
    const height = layout.height - margin.top - margin.bottom;

    // Heatmap container
    const g = svg.append("g")
        .attr("transform", "translate(" + (layout.left + margin.left) + "," + (layout.top + margin.top) + ")");

    // Heatmap title
    g.append("text")
        .attr("class", "chart-title")
        .attr("x", width / 2)
        .attr("y", -24)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "600")
        .text("Average Salary by Experience and Company Size");

    const cells = buildHeatmapData(rows);
    const salaryExtent = d3.extent(cells, function (d) { return d.salary; });

    const x = d3.scaleBand()
        .domain(EXP_ORDER)
        .range([0, width])
        .padding(0.08);

    const y = d3.scaleBand()
        .domain(SIZE_ORDER)
        .range([0, height])
        .padding(0.08);

    const color = d3.scaleSequential(d3.interpolateYlOrRd)
        .domain(salaryExtent);

    // Heatmap cells
    g.selectAll("rect")
        .data(cells)
        .enter()
        .append("rect")
        .attr("x", function (d) { return x(d.experience); })
        .attr("y", function (d) { return y(d.companySize); })
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("fill", function (d) { return color(d.salary); })
        .attr("stroke", "#fff")
        .attr("stroke-width", 2);

    // Salary values inside cells
    g.selectAll(".cell-label")
        .data(cells)
        .enter()
        .append("text")
        .attr("class", "cell-label")
        .attr("x", function (d) { return x(d.experience) + x.bandwidth() / 2; })
        .attr("y", function (d) { return y(d.companySize) + y.bandwidth() / 2; })
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("font-size", "11px")
        .attr("fill", function (d) {
            return d.salary > (salaryExtent[0] + salaryExtent[1]) / 2 ? "#fff" : "#1a1a2e";
        })
        .text(function (d) { return formatSalary(d.salary); });

    // X axis: experience level
    g.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x).tickFormat(function (d) { return EXP_LABELS[d]; }))
        .selectAll("text")
        .attr("font-size", "11px");

    // Y axis: company size
    g.append("g")
        .call(d3.axisLeft(y).tickFormat(function (d) { return SIZE_LABELS[d]; }))
        .selectAll("text")
        .attr("font-size", "11px");

    // X axis label
    g.append("text")
        .attr("x", width / 2)
        .attr("y", height + 42)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .text("Experience Level");

    // Y axis label
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -72)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .text("Company Size");

    const legendHeight = height - 20;
    const legendScale = d3.scaleLinear()
        .domain(salaryExtent)
        .range([legendHeight, 0]);

    const legendAxis = d3.axisRight(legendScale)
        .ticks(5)
        .tickFormat(function (d) { return formatSalary(d); });

    // Color legend for salary scale
    const legend = g.append("g")
        .attr("transform", "translate(" + (width + 16) + ", 10)");

    // Gradient definition for legend bar
    const defs = svg.append("defs");
    const gradientId = "salary-gradient";
    const gradient = defs.append("linearGradient")
        .attr("id", gradientId)
        .attr("x1", "0%")
        .attr("x2", "0%")
        .attr("y1", "100%")
        .attr("y2", "0%");

    d3.range(0, 1.01, 0.05).forEach(function (t) {
        // Gradient color stops
        gradient.append("stop")
            .attr("offset", (t * 100) + "%")
            .attr("stop-color", color(salaryExtent[0] + t * (salaryExtent[1] - salaryExtent[0])));
    });

    // Legend color bar
    legend.append("rect")
        .attr("width", 14)
        .attr("height", legendHeight)
        .style("fill", "url(#" + gradientId + ")");

    // Legend axis
    legend.append("g")
        .attr("transform", "translate(14, 0)")
        .call(legendAxis)
        .selectAll("text")
        .attr("font-size", "10px");

    // Legend title
    legend.append("text")
        .attr("x", 7)
        .attr("y", -6)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .text("Avg Salary");
}
