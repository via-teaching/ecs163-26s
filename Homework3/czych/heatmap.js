/* Heatmap */
function heatmapCellKey(d) {
    return d.experience + "-" + d.companySize;
}

function applyHeatmapCellSelection(g) {
    const meta = g.datum();
    const selected = meta.selectedCell;
    const selectedKey = selected ? heatmapCellKey(selected) : null;

    g.selectAll(".heatmap-cell")
        .transition()
        .duration(TRANSITION_MS)
        .style("opacity", function (d) {
            if (!selectedKey) {
                return 1;
            }
            return heatmapCellKey(d) === selectedKey ? 1 : 0.22;
        })
        .attr("stroke", function (d) {
            if (!selectedKey) {
                return "#fff";
            }
            return heatmapCellKey(d) === selectedKey ? "#1a1a2e" : "#fff";
        })
        .attr("stroke-width", function (d) {
            if (!selectedKey) {
                return 2;
            }
            return heatmapCellKey(d) === selectedKey ? 3 : 2;
        });

    g.selectAll(".cell-label")
        .transition()
        .duration(TRANSITION_MS)
        .style("opacity", function (d) {
            if (!selectedKey) {
                return 1;
            }
            return heatmapCellKey(d) === selectedKey ? 1 : 0.3;
        });
}

function onHeatmapCellClick(g, cell) {
    const meta = g.datum();
    const current = meta.selectedCell;

    if (current && heatmapCellKey(current) === heatmapCellKey(cell)) {
        meta.selectedCell = null;
        dashboardState.heatmapSelectedCell = null;
    } else {
        meta.selectedCell = {
            experience: cell.experience,
            companySize: cell.companySize
        };
        dashboardState.heatmapSelectedCell = meta.selectedCell;
    }

    g.datum(meta);
    applyHeatmapCellSelection(g);
}

function clearHeatmapCellSelection(g) {
    const meta = g.datum();
    meta.selectedCell = null;
    dashboardState.heatmapSelectedCell = null;
    g.datum(meta);
    applyHeatmapCellSelection(g);
}

function attachHeatmapCellHandlers(g) {
    g.selectAll(".heatmap-cell")
        .style("cursor", "pointer")
        .on("click", function (d) {
            d3.event.stopPropagation();
            onHeatmapCellClick(g, d);
        });
}

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

function drawHeatmap(svg, rows, layout, animate) {
    const margin = { top: 48, right: 88, bottom: 52, left: 96 };
    const width = layout.width - margin.left - margin.right;
    const height = layout.height - margin.top - margin.bottom;

    // Heatmap container
    const g = svg.append("g")
        .attr("class", "heatmap-layer")
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

    g.append("text")
        .attr("class", "heatmap-hint")
        .attr("x", width / 2)
        .attr("y", height + 56)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("fill", "#5c6770")
        .text("Click a cell to focus (click again to reset)");

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

    g.datum({
        salaryExtent: salaryExtent,
        color: color,
        x: x,
        y: y,
        width: width,
        height: height,
        selectedCell: dashboardState.heatmapSelectedCell
    });

    g.insert("rect", ".heatmap-cell")
        .attr("class", "heatmap-bg")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "transparent")
        .on("click", function () {
            clearHeatmapCellSelection(g);
        });

    // Heatmap cells
    g.selectAll("rect.heatmap-cell")
        .data(cells, function (d) { return d.experience + "-" + d.companySize; })
        .enter()
        .append("rect")
        .attr("class", "heatmap-cell")
        .attr("x", function (d) { return x(d.experience); })
        .attr("y", function (d) { return y(d.companySize); })
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("fill", function (d) { return color(d.salary); })
        .attr("stroke", "#fff")
        .attr("stroke-width", 2);

    // Salary values inside cells
    g.selectAll(".cell-label")
        .data(cells, function (d) { return d.experience + "-" + d.companySize; })
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

    attachHeatmapCellHandlers(g);
    applyHeatmapCellSelection(g);

    // X axis: experience level
    g.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x).tickFormat(function (d) { return EXP_LABELS[d]; }))
        .selectAll("text")
        .attr("font-size", "11px");

    // Y axis: company size
    g.append("g")
        .attr("class", "heatmap-y-axis")
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
        .attr("class", "heatmap-legend")
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
        gradient.append("stop")
            .attr("offset", (t * 100) + "%")
            .attr("stop-color", color(salaryExtent[0] + t * (salaryExtent[1] - salaryExtent[0])));
    });

    // Legend color bar
    legend.append("rect")
        .attr("class", "heatmap-legend-bar")
        .attr("width", 14)
        .attr("height", legendHeight)
        .style("fill", "url(#" + gradientId + ")");

    // Legend axis
    legend.append("g")
        .attr("class", "heatmap-legend-axis")
        .attr("transform", "translate(14, 0)")
        .call(legendAxis)
        .selectAll("text")
        .attr("font-size", "10px");

    // Legend title
    legend.append("text")
        .attr("class", "heatmap-legend-title")
        .attr("x", 7)
        .attr("y", -6)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .text("Avg Salary");

    if (animate) {
        g.selectAll(".heatmap-cell, .cell-label")
            .style("opacity", 0)
            .transition()
            .duration(TRANSITION_MS)
            .style("opacity", 1);
    }
}

function updateHeatmapGradient(svg, salaryExtent, color) {
    const gradient = svg.select("#salary-gradient");
    if (gradient.empty()) {
        return;
    }

    gradient.selectAll("stop").remove();
    d3.range(0, 1.01, 0.05).forEach(function (t) {
        gradient.append("stop")
            .attr("offset", (t * 100) + "%")
            .attr("stop-color", color(salaryExtent[0] + t * (salaryExtent[1] - salaryExtent[0])));
    });
}

function updateHeatmapChart(svg, rows, layout, animate) {
    const g = svg.select(".heatmap-layer");
    if (g.empty()) {
        drawHeatmap(svg, rows, layout, animate);
        return;
    }

    const meta = g.datum();
    const cells = buildHeatmapData(rows);
    const salaryExtent = d3.extent(cells, function (d) { return d.salary; });
    const color = d3.scaleSequential(d3.interpolateYlOrRd)
        .domain(salaryExtent);
    const x = meta.x;
    const y = meta.y;

    g.datum(Object.assign({}, meta, {
        salaryExtent: salaryExtent,
        color: color,
        selectedCell: dashboardState.heatmapSelectedCell
    }));

    updateHeatmapGradient(svg, salaryExtent, color);

    const legendHeight = g.select(".heatmap-legend-bar").attr("height");
    const legendScale = d3.scaleLinear()
        .domain(salaryExtent)
        .range([+legendHeight, 0]);

    const legendAxis = d3.axisRight(legendScale)
        .ticks(5)
        .tickFormat(function (d) { return formatSalary(d); });

    const cellSelection = g.selectAll(".heatmap-cell")
        .data(cells, function (d) { return d.experience + "-" + d.companySize; });

    cellSelection.exit()
        .transition()
        .duration(animate ? TRANSITION_MS : 0)
        .style("opacity", 0)
        .remove();

    const cellEnter = cellSelection.enter()
        .append("rect")
        .attr("class", "heatmap-cell")
        .attr("x", function (d) { return x(d.experience); })
        .attr("y", function (d) { return y(d.companySize); })
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("stroke", "#fff")
        .attr("stroke-width", 2)
        .attr("fill", function (d) { return color(d.salary); })
        .style("opacity", animate ? 0 : 1);

    const cellMerge = cellEnter.merge(cellSelection);
    const cellTransition = animate
        ? cellMerge.transition().duration(TRANSITION_MS)
        : cellMerge;

    cellTransition
        .attr("fill", function (d) { return color(d.salary); });

    attachHeatmapCellHandlers(g);

    const labelSelection = g.selectAll(".cell-label")
        .data(cells, function (d) { return d.experience + "-" + d.companySize; });

    labelSelection.exit()
        .transition()
        .duration(animate ? TRANSITION_MS : 0)
        .style("opacity", 0)
        .remove();

    const labelEnter = labelSelection.enter()
        .append("text")
        .attr("class", "cell-label")
        .attr("x", function (d) { return x(d.experience) + x.bandwidth() / 2; })
        .attr("y", function (d) { return y(d.companySize) + y.bandwidth() / 2; })
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("font-size", "11px")
        .text(function (d) { return formatSalary(d.salary); })
        .style("opacity", animate ? 0 : 1);

    const labelMerge = labelEnter.merge(labelSelection);
    const labelTransition = animate
        ? labelMerge.transition().duration(TRANSITION_MS)
        : labelMerge;

    labelTransition
        .attr("fill", function (d) {
            return d.salary > (salaryExtent[0] + salaryExtent[1]) / 2 ? "#fff" : "#1a1a2e";
        });

    if (animate) {
        labelTransition.tween("text", function (d) {
            const previous = +this.textContent.replace(/[$,]/g, "") || d.salary;
            const interpolate = d3.interpolateNumber(previous, d.salary);
            const self = this;
            return function (t) {
                self.textContent = formatSalary(interpolate(t));
            };
        });
    } else {
        labelMerge.text(function (d) { return formatSalary(d.salary); });
    }

    const axisTransition = animate
        ? g.select(".heatmap-legend-axis").transition().duration(TRANSITION_MS)
        : g.select(".heatmap-legend-axis");

    axisTransition.call(legendAxis);

    applyHeatmapCellSelection(g);
}
