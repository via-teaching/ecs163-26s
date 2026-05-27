/* Line Chart */
const LINE_CHART_YEARS = [2020, 2021, 2022, 2023];
const LINE_LEVEL_NAMES = {
    EN: "Entry",
    MI: "Mid",
    SE: "Senior",
    EX: "Executive"
};

function buildLineData(rows) {
    const grouped = d3.nest()
        .key(function (d) { return d.work_year; })
        .key(function (d) { return d.experience_level; })
        .rollup(function (values) {
            return d3.mean(values, function (d) { return d.salary_in_usd; });
        })
        .entries(rows);

    const yearToLevelMeans = {};
    grouped.forEach(function (yearGroup) {
        const y = +yearGroup.key;
        yearToLevelMeans[y] = {};
        yearGroup.values.forEach(function (entry) {
            yearToLevelMeans[y][entry.key] = entry.value;
        });
    });

    return EXP_ORDER.map(function (level) {
        return {
            level: level,
            label: LINE_LEVEL_NAMES[level],
            values: LINE_CHART_YEARS.map(function (year) {
                var means = yearToLevelMeans[year];
                var salary = means && means[level] != null ? means[level] : null;
                return { year: year, salary: salary };
            })
        };
    });
}

function yearBandBounds(year, xScale) {
    const center = xScale(String(year));
    const halfStep = xScale.step() / 2;
    return [center - halfStep, center + halfStep];
}

function yearsFromBrushSelection(selection, xScale) {
    if (!selection) {
        return null;
    }

    const x0 = selection[0];
    const x1 = selection[1];
    const years = LINE_CHART_YEARS.filter(function (year) {
        const bounds = yearBandBounds(year, xScale);
        return bounds[1] >= x0 && bounds[0] <= x1;
    });

    return years.length ? years : null;
}

function brushSelectionForYears(years, xScale) {
    if (!years || !years.length) {
        return null;
    }

    const startBounds = yearBandBounds(years[0], xScale);
    const endBounds = yearBandBounds(years[years.length - 1], xScale);
    return [startBounds[0], endBounds[1]];
}

function yearRangeFromYears(years) {
    if (!years || !years.length) {
        return null;
    }
    return { start: years[0], end: years[years.length - 1] };
}

function applyLineChartHighlight(g, yearRange) {
    const meta = g.datum();
    const xScale = meta.xScale;
    const height = meta.plotHeight;
    const selection = yearRange
        ? brushSelectionForYears(
            LINE_CHART_YEARS.filter(function (year) {
                return year >= yearRange.start && year <= yearRange.end;
            }),
            xScale
        )
        : null;

    g.select(".brush-highlight")
        .transition()
        .duration(TRANSITION_MS)
        .attr("x", selection ? selection[0] : 0)
        .attr("width", selection ? Math.max(0, selection[1] - selection[0]) : 0)
        .style("fill-opacity", selection ? 0.2 : 0);

    g.selectAll(".line-series")
        .transition()
        .duration(TRANSITION_MS)
        .attr("opacity", function (d) {
            if (!yearRange) {
                return 1;
            }
            return d.values.some(function (point) {
                return point.salary != null &&
                    point.year >= yearRange.start &&
                    point.year <= yearRange.end;
            }) ? 1 : 0.18;
        });

    g.selectAll(".line-dot")
        .transition()
        .duration(TRANSITION_MS)
        .attr("opacity", function (d) {
            if (!yearRange) {
                return 1;
            }
            return d.year >= yearRange.start && d.year <= yearRange.end ? 1 : 0.18;
        })
        .attr("r", function (d) {
            if (!yearRange) {
                return 4;
            }
            return d.year >= yearRange.start && d.year <= yearRange.end ? 5 : 3;
        });

    g.select(".brush-hint")
        .text(yearRange
            ? "Showing " + yearRange.start + "\u2013" + yearRange.end + " (double-click chart to reset)"
            : "Drag across years to filter the dashboard");
}

function updateLineChartHighlight(svg, yearRange) {
    const g = svg.select(".line-chart-layer");
    if (g.empty()) {
        return;
    }

    applyLineChartHighlight(g, yearRange);

    const xScale = g.datum().xScale;
    const brush = g.datum().brush;
    const selection = yearRange
        ? brushSelectionForYears(
            LINE_CHART_YEARS.filter(function (year) {
                return year >= yearRange.start && year <= yearRange.end;
            }),
            xScale
        )
        : null;

    g.select(".year-brush")
        .call(brush.move, selection);
}

function drawLineChart(svg, rows, layout, initialYearRange, onYearRangeChange) {
    const margin = { top: 48, right: 24, bottom: 52, left: 104 };
    const width = layout.width - margin.left - margin.right;
    const height = layout.height - margin.top - margin.bottom;

    const g = svg.append("g")
        .attr("class", "line-chart-layer")
        .attr("transform", "translate(" + (layout.left + margin.left) + "," + (layout.top + margin.top) + ")");

    g.append("text")
        .attr("class", "chart-title")
        .attr("x", width / 2)
        .attr("y", -24)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "600")
        .text("Average Salary Over Time by Experience Level");

    g.append("text")
        .attr("class", "brush-hint")
        .attr("x", width / 2)
        .attr("y", height + 56)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("fill", "#5c6770")
        .text("Drag across years to filter the dashboard");

    const series = buildLineData(rows);

    var salaryValues = [];
    series.forEach(function (s) {
        s.values.forEach(function (d) {
            if (d.salary != null) {
                salaryValues.push(d.salary);
            }
        });
    });
    const maxSalary = salaryValues.length ? d3.max(salaryValues) : 0;

    const x = d3.scalePoint()
        .domain(LINE_CHART_YEARS.map(String))
        .range([0, width])
        .padding(0.45);

    const y = d3.scaleLinear()
        .domain([0, Math.max(maxSalary * 1.05, 1)])
        .nice()
        .range([height, 0]);

    const line = d3.line()
        .defined(function (d) { return d.salary != null; })
        .x(function (d) { return x(String(d.year)); })
        .y(function (d) { return y(d.salary); });

    g.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("font-size", "11px");

    g.append("g")
        .call(d3.axisLeft(y).ticks(6).tickFormat(function (d) { return formatSalary(d); }))
        .selectAll("text")
        .attr("font-size", "11px");

    g.append("text")
        .attr("x", width / 2)
        .attr("y", height + 42)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .text("Year");

    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -88)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .text("Average Salary");

    g.append("rect")
        .attr("class", "brush-highlight")
        .attr("y", 0)
        .attr("height", height)
        .attr("fill", "#4dabf7")
        .style("fill-opacity", 0)
        .attr("pointer-events", "none");

    series.forEach(function (s) {
        g.append("path")
            .datum(s.values)
            .attr("class", "line-series")
            .attr("fill", "none")
            .attr("stroke", EXP_COLORS[s.level])
            .attr("stroke-width", 2.5)
            .attr("d", line);

        g.selectAll(".dot-" + s.level)
            .data(s.values.filter(function (d) { return d.salary != null; }))
            .enter()
            .append("circle")
            .attr("class", "line-dot dot-" + s.level)
            .attr("cx", function (d) { return x(String(d.year)); })
            .attr("cy", function (d) { return y(d.salary); })
            .attr("r", 4)
            .attr("fill", EXP_COLORS[s.level])
            .attr("stroke", "#fff")
            .attr("stroke-width", 1);
    });

    const legend = g.append("g")
        .attr("transform", "translate(0, -8)");

    series.forEach(function (s, i) {
        const item = legend.append("g")
            .attr("transform", "translate(" + (i * 92) + ", 0)");

        item.append("line")
            .attr("x1", 0)
            .attr("x2", 18)
            .attr("y1", 6)
            .attr("y2", 6)
            .attr("stroke", EXP_COLORS[s.level])
            .attr("stroke-width", 2.5);

        item.append("text")
            .attr("x", 22)
            .attr("y", 10)
            .attr("font-size", "11px")
            .text(s.label);
    });

    const brush = d3.brushX()
        .extent([[0, 0], [width, height]])
        .on("brush", function () {
            const selection = d3.event.selection;
            const years = yearsFromBrushSelection(selection, x);
            applyLineChartHighlight(g, yearRangeFromYears(years));
        })
        .on("end", function () {
            if (!d3.event.sourceEvent) {
                return;
            }

            if (!d3.event.selection) {
                onYearRangeChange(null);
                applyLineChartHighlight(g, null);
                return;
            }

            const years = yearsFromBrushSelection(d3.event.selection, x);
            const snapped = brushSelectionForYears(years, x);
            g.select(".year-brush").call(brush.move, snapped);
            onYearRangeChange(yearRangeFromYears(years));
        });

    const brushGroup = g.append("g")
        .attr("class", "year-brush")
        .call(brush);

    brushGroup.selectAll(".overlay")
        .attr("cursor", "crosshair");

    brushGroup.selectAll(".selection")
        .attr("fill", "#228be6")
        .style("fill-opacity", 0)
        .attr("stroke", "#228be6")
        .style("stroke-opacity", 0.55)
        .attr("stroke-width", 1.5);

    g.datum({
        xScale: x,
        yScale: y,
        plotHeight: height,
        brush: brush,
        line: line,
        series: series
    });

    g.on("dblclick", function () {
        g.select(".year-brush").call(brush.move, null);
        onYearRangeChange(null);
        applyLineChartHighlight(g, null);
    });

    if (initialYearRange) {
        const initialYears = LINE_CHART_YEARS.filter(function (year) {
            return year >= initialYearRange.start && year <= initialYearRange.end;
        });
        const initialSelection = brushSelectionForYears(initialYears, x);
        g.select(".year-brush").call(brush.move, initialSelection);
        applyLineChartHighlight(g, initialYearRange);
    }
}
