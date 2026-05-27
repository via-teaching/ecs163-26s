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

function drawLineChart(svg, rows, layout) {
    const margin = { top: 48, right: 24, bottom: 52, left: 104 };
    const width = layout.width - margin.left - margin.right;
    const height = layout.height - margin.top - margin.bottom;

    // Line chart container
    const g = svg.append("g")
        .attr("transform", "translate(" + (layout.left + margin.left) + "," + (layout.top + margin.top) + ")");

    // Line chart title
    g.append("text")
        .attr("class", "chart-title")
        .attr("x", width / 2)
        .attr("y", -24)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "600")
        .text("Average Salary Over Time by Experience Level");

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

    // X-axis: one band per calendar year 
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

    // Y axis: average salary
    g.append("g")
        .call(d3.axisLeft(y).ticks(6).tickFormat(function (d) { return formatSalary(d); }))
        .selectAll("text")
        .attr("font-size", "11px");

    // X axis label
    g.append("text")
        .attr("x", width / 2)
        .attr("y", height + 42)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .text("Year");

    // Y axis label 
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -88)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .text("Average Salary");

    series.forEach(function (s) {
        // One line per experience level
        g.append("path")
            .datum(s.values)
            .attr("fill", "none")
            .attr("stroke", EXP_COLORS[s.level])
            .attr("stroke-width", 2.5)
            .attr("d", line);

        // Points where data exists for that year
        g.selectAll(".dot-" + s.level)
            .data(s.values.filter(function (d) { return d.salary != null; }))
            .enter()
            .append("circle")
            .attr("class", "dot-" + s.level)
            .attr("cx", function (d) { return x(String(d.year)); })
            .attr("cy", function (d) { return y(d.salary); })
            .attr("r", 4)
            .attr("fill", EXP_COLORS[s.level])
            .attr("stroke", "#fff")
            .attr("stroke-width", 1);
    });

    // Legend: Entry, Mid, Senior, Executive
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
}
