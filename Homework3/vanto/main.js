// HW3
var W = window.innerWidth;
var H = window.innerHeight;

// Layout
var TITLE_H = 40;
var TOP_H = Math.floor((H - TITLE_H) * 0.55);
var BOT_H = H - TITLE_H - TOP_H;
var LEFT_W = Math.floor(W * 0.42);
var RIGHT_W = W - LEFT_W;

// Experience level labels
var EXP_ORDER = ["EN", "MI", "SE", "EX"];
var EXP_LABELS = { EN: "Entry", MI: "Mid", SE: "Senior", EX: "Executive" };

// Color for experience levels
var expColor = d3.scaleOrdinal()
    .domain(EXP_ORDER)
    .range(["#74b9ff", "#0984e3", "#fdcb6e", "#e17055"]);

var svg = d3.select("#main-svg");
var tooltip = d3.select("#tooltip");

// selectedJob is null (show all) or a job title string
var selectedJob = null;

// barChart update function — set after drawBarChart runs
var updateBarChart = null;

// Helpers 
function groupBy(arr, keyFn) {
    var result = {};
    arr.forEach(function (d) {
        var k = keyFn(d);
        if (!result[k]) result[k] = [];
        result[k].push(d);
    });
    return result;
}

function median(arr) {
    var sorted = arr.slice().sort(function (a, b) { return a - b; });
    var mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Load data 
d3.csv("ds_salaries.csv").then(function (rawData) {

    rawData.forEach(function (d) {
        d.salary_in_usd = +d.salary_in_usd;
        d.remote_ratio = +d.remote_ratio;
        d.work_year = +d.work_year;
    });

    // Title
    svg.append("text")
        .attr("x", W / 2).attr("y", TITLE_H / 2 + 6)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px").attr("font-weight", "bold").attr("fill", "#2d3436")
        .text("Data Science Salaries Dashboard");

    // Dividers
    svg.append("line")
        .attr("x1", 0).attr("y1", TITLE_H + TOP_H)
        .attr("x2", W).attr("y2", TITLE_H + TOP_H)
        .attr("stroke", "#ccc").attr("stroke-width", 1);
    svg.append("line")
        .attr("x1", LEFT_W).attr("y1", TITLE_H)
        .attr("x2", LEFT_W).attr("y2", TITLE_H + TOP_H)
        .attr("stroke", "#ccc").attr("stroke-width", 1);

    drawHeatmap(rawData);
    drawParallelCoords(rawData);
    drawBarChart(rawData);

}).catch(function (err) {
    svg.append("text")
        .attr("x", W / 2).attr("y", H / 2)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px").attr("fill", "red")
        .text("ERROR loading data: " + err);
    console.error(err);
});


//  VIEW 1 – Heatmap, Click a cell → filters the bar chart (Selection interaction)

function drawHeatmap(data) {

    var margin = { top: 55, right: 20, bottom: 30, left: 160 };
    var gW = LEFT_W - margin.left - margin.right;
    var gH = TOP_H - margin.top - margin.bottom;

    var g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + (TITLE_H + margin.top) + ")");

    // Top-10 job titles by count
    var jobCount = {};
    data.forEach(function (d) {
        jobCount[d.job_title] = (jobCount[d.job_title] || 0) + 1;
    });
    var topJobs = Object.keys(jobCount)
        .sort(function (a, b) { return jobCount[b] - jobCount[a]; })
        .slice(0, 10);

    var filtered = data.filter(function (d) { return topJobs.indexOf(d.job_title) !== -1; });

    // Compute median per (job, exp) cell
    var cells = [];
    topJobs.forEach(function (job) {
        EXP_ORDER.forEach(function (exp) {
            var rows = filtered.filter(function (d) {
                return d.job_title === job && d.experience_level === exp;
            });
            if (rows.length > 0) {
                cells.push({
                    job: job,
                    exp: exp,
                    median: median(rows.map(function (d) { return d.salary_in_usd; }))
                });
            }
        });
    });

    var x = d3.scaleBand().domain(EXP_ORDER).range([0, gW]).padding(0.05);
    var y = d3.scaleBand().domain(topJobs).range([0, gH]).padding(0.05);
    var maxVal = d3.max(cells, function (d) { return d.median; });
    var colorScale = d3.scaleSequential(d3.interpolateBlues).domain([0, maxVal]);

    // Axes
    g.append("g").attr("class", "axis")
        .call(d3.axisTop(x).tickFormat(function (d) { return EXP_LABELS[d]; }));
    g.append("g").attr("class", "axis").call(d3.axisLeft(y));

    // Instruction label
    g.append("text")
        .attr("x", gW / 2).attr("y", -27)
        .attr("text-anchor", "middle").attr("font-size", "12px").attr("fill", "#636e72")
        .text("Selection Interaction: Click a cell to filter the bar chart. Click again to reset.");

    // Cells with SELECTION interaction 
    var cellRects = g.selectAll("rect.cell").data(cells).enter()
        .append("rect").attr("class", "cell")
        .attr("x", function (d) { return x(d.exp); })
        .attr("y", function (d) { return y(d.job); })
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("fill", function (d) { return colorScale(d.median); })
        .attr("rx", 2)
        .attr("cursor", "pointer")
        .attr("stroke", "none")
        .attr("stroke-width", 2)
        // SELECTION: click to filter bar chart
        .on("click", function (d) {
            if (selectedJob === d.job) {
                // Deselect — reset to all data
                selectedJob = null;
                // Remove highlight from all cells
                g.selectAll("rect.cell")
                    .attr("stroke", "none")
                    .attr("opacity", 1);
            } else {
                selectedJob = d.job;
                // Highlight selected cell, dim others
                g.selectAll("rect.cell")
                    .attr("stroke", function (c) { return c.job === selectedJob ? "#e74c3c" : "none"; })
                    .attr("opacity", function (c) { return c.job === selectedJob ? 1 : 0.4; });
            }
            // Trigger animation update
            if (updateBarChart) updateBarChart(selectedJob);
        })
        .on("mouseover", function (d) {
            tooltip.style("opacity", 1)
                .html("<strong>" + d.job + "</strong><br>" + EXP_LABELS[d.exp] + "<br>Median: $" + d3.format(",")(Math.round(d.median)));
        })
        .on("mousemove", function () {
            tooltip.style("left", (d3.event.pageX + 12) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function () { tooltip.style("opacity", 0); });

    // Cell value labels
    g.selectAll("text.cell-label").data(cells).enter()
        .append("text").attr("class", "cell-label")
        .attr("x", function (d) { return x(d.exp) + x.bandwidth() / 2; })
        .attr("y", function (d) { return y(d.job) + y.bandwidth() / 2 + 4; })
        .attr("text-anchor", "middle").attr("font-size", "10px")
        .attr("pointer-events", "none")
        .attr("fill", function (d) { return d.median > 150000 ? "#fff" : "#333"; })
        .text(function (d) { return "$" + d3.format(".0s")(d.median); });

    // Chart title
    g.append("text")
        .attr("x", gW / 2).attr("y", -45)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px").attr("font-weight", "bold").attr("fill", "#2d3436")
        .text("Heatmap: Median Salary by Job Title & Experience Level");

    // Color legend
    var legW = 120, legH = 10;
    var legX = gW - legW, legY = gH + 5;
    var defs = svg.append("defs");
    var grad = defs.append("linearGradient").attr("id", "heatLegend");
    grad.append("stop").attr("offset", "0%").attr("stop-color", colorScale(0));
    grad.append("stop").attr("offset", "100%").attr("stop-color", colorScale(maxVal));
    g.append("rect").attr("x", legX).attr("y", legY)
        .attr("width", legW).attr("height", legH)
        .style("fill", "url(#heatLegend)");
    g.append("text").attr("class", "legend-text")
        .attr("x", legX).attr("y", legY + 22).text("$0");
    g.append("text").attr("class", "legend-text")
        .attr("x", legX + legW + 10).attr("y", legY + 22).attr("text-anchor", "end")
        .text("$" + d3.format(".0s")(maxVal));
    g.append("text").attr("class", "legend-text")
        .attr("x", legX + legW / 2).attr("y", legY + 22).attr("text-anchor", "middle")
        .text("Median USD");
}


//  VIEW 2 – Parallel Coordinates, Brushing interaction on each axis

function drawParallelCoords(data) {

    var margin = { top: 55, right: 40, bottom: 20, left: 40 };
    var gW = RIGHT_W - margin.left - margin.right;
    var gH = TOP_H - margin.top - margin.bottom;

    var g = svg.append("g")
        .attr("transform", "translate(" + (LEFT_W + margin.left) + "," + (TITLE_H + margin.top) + ")");

    // I used ordinal encoding for categorical axes
    var dimensions = ["experience_level", "remote_ratio", "company_size", "salary_in_usd"];
    var dimLabels = {
        experience_level: "Experience",
        remote_ratio: "Remote %",
        company_size: "Company Size",
        salary_in_usd: "Salary (USD)"
    };

    // Build a scale per dimension
    var yScales = {};
    yScales["experience_level"] = d3.scalePoint().domain(EXP_ORDER).range([gH, 0]).padding(0.2);
    yScales["remote_ratio"] = d3.scalePoint().domain(["0", "50", "100"]).range([gH, 0]).padding(0.2);
    yScales["company_size"] = d3.scalePoint().domain(["S", "M", "L"]).range([gH, 0]).padding(0.2);
    yScales["salary_in_usd"] = d3.scaleLinear()
        .domain([0, d3.max(data, function (d) { return d.salary_in_usd; })])
        .range([gH, 0]).nice();

    var x = d3.scalePoint().domain(dimensions).range([0, gW]).padding(0.1);

    function path(d) {
        return d3.line()(dimensions.map(function (dim) {
            var val = (dim === "remote_ratio") ? String(d[dim]) : d[dim];
            return [x(dim), yScales[dim](val)];
        }));
    }

    var linesG = g.append("g");
    linesG.selectAll("path").data(data).enter()
        .append("path")
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", function (d) { return expColor(d.experience_level); })
        .attr("stroke-opacity", 0.2)
        .attr("stroke-width", 1)
        .on("mouseover", function (d) {
            d3.select(this).attr("stroke-opacity", 1).attr("stroke-width", 2).raise();
            tooltip.style("opacity", 1)
                .html("<strong>" + d.job_title + "</strong><br>" +
                    EXP_LABELS[d.experience_level] + " | Remote: " + d.remote_ratio + "%<br>" +
                    "Size: " + d.company_size + " | $" + d3.format(",")(d.salary_in_usd));
        })
        .on("mousemove", function () {
            tooltip.style("left", (d3.event.pageX + 12) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function () {
            d3.select(this).attr("stroke-opacity", 0.2).attr("stroke-width", 1);
            tooltip.style("opacity", 0);
        });

    // Brushing interaction 
    var brushSelections = {};

    function updateLines() {
        linesG.selectAll("path")
            // Animate the opacity change (Filtering transition)
            .transition().duration(200)
            .attr("stroke-opacity", function (d) {
                var passes = dimensions.every(function (dim) {
                    if (!brushSelections[dim]) return true;
                    var lo = brushSelections[dim][0];
                    var hi = brushSelections[dim][1];
                    var val = (dim === "remote_ratio") ? String(d[dim]) : d[dim];
                    var pos = yScales[dim](val);
                    return pos >= lo && pos <= hi;
                });
                return passes ? 0.65 : 0.03;
            });
    }

    dimensions.forEach(function (dim) {
        var axG = g.append("g").attr("transform", "translate(" + x(dim) + ",0)");

        var axCall = (dim === "salary_in_usd")
            ? d3.axisLeft(yScales[dim]).ticks(5).tickFormat(function (d) { return "$" + d3.format(".0s")(d); })
            : d3.axisLeft(yScales[dim]);

        axG.append("g").attr("class", "axis").call(axCall);

        axG.append("text")
            .attr("y", -12).attr("text-anchor", "middle")
            .attr("font-size", "11px").attr("font-weight", "bold").attr("fill", "#2d3436")
            .text(dimLabels[dim]);

        var brush = d3.brushY()
            .extent([[-12, 0], [12, gH]])
            .on("brush end", function () {
                if (d3.event.selection) {
                    brushSelections[dim] = d3.event.selection;
                } else {
                    delete brushSelections[dim];
                }
                updateLines();
            });
        axG.append("g").attr("class", "brush").call(brush);
    });

    // Title
    g.append("text")
        .attr("x", gW / 2).attr("y", -45)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px").attr("font-weight", "bold").attr("fill", "#2d3436")
        .text("Parallel Coordinates: Experience → Remote → Size → Salary");
    g.append("text")
        .attr("x", gW / 2).attr("y", -30)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px").attr("fill", "#636e72")
        .text("Brushing Interaction: Drag on any axis to filter lines. Hover a line for details.");

    // Legend
    var legG = g.append("g").attr("transform", "translate(" + (gW - 130) + "," + (gH - 85) + ")");
    legG.append("rect").attr("x", -8).attr("y", -14)
        .attr("width", 132).attr("height", EXP_ORDER.length * 18 + 10)
        .attr("fill", "#fff").attr("opacity", 0.85).attr("rx", 4).attr("stroke", "#ddd");
    EXP_ORDER.forEach(function (exp, i) {
        legG.append("rect").attr("x", 0).attr("y", i * 18)
            .attr("width", 12).attr("height", 12).attr("fill", expColor(exp));
        legG.append("text").attr("class", "legend-text")
            .attr("x", 18).attr("y", i * 18 + 10).text(EXP_LABELS[exp]);
    });
}


//  VIEW 3 – Grouped Bar Chart, Animated filtering transition when heatmap cell is clicked

function drawBarChart(data) {

    var margin = { top: 50, right: 160, bottom: 50, left: 70 };
    var gW = W - margin.left - margin.right;
    var gH = BOT_H - margin.top - margin.bottom;
    var topY = TITLE_H + TOP_H;

    var g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + (topY + margin.top) + ")");

    var years = ["2020", "2021", "2022", "2023"];

    // Precompute bar data for ALL data (used for reset)
    function computeBarData(subset) {
        var result = [];
        years.forEach(function (yr) {
            EXP_ORDER.forEach(function (exp) {
                var rows = subset.filter(function (d) {
                    return String(d.work_year) === yr && d.experience_level === exp;
                });
                result.push({
                    year: yr,
                    exp: exp,
                    median: rows.length > 0 ? median(rows.map(function (d) { return d.salary_in_usd; })) : 0
                });
            });
        });
        return result;
    }

    var allBarData = computeBarData(data);

    // Scales
    var x0 = d3.scaleBand().domain(years).range([0, gW]).paddingInner(0.25).paddingOuter(0.1);
    var x1 = d3.scaleBand().domain(EXP_ORDER).range([0, x0.bandwidth()]).padding(0.05);
    var maxMedian = d3.max(allBarData, function (d) { return d.median; });
    var y = d3.scaleLinear().domain([0, maxMedian * 1.1]).range([gH, 0]).nice();

    // Axes
    var xAxisG = g.append("g").attr("class", "axis")
        .attr("transform", "translate(0," + gH + ")")
        .call(d3.axisBottom(x0));
    g.append("g").attr("class", "axis")
        .call(d3.axisLeft(y).ticks(5).tickFormat(function (d) { return "$" + d3.format(".0s")(d); }));

    // Axis labels
    g.append("text")
        .attr("x", gW / 2).attr("y", gH + 40)
        .attr("text-anchor", "middle").attr("font-size", "12px").attr("fill", "#444")
        .text("Year");
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -gH / 2).attr("y", -55)
        .attr("text-anchor", "middle").attr("font-size", "12px").attr("fill", "#444")
        .text("Median Salary (USD)");

    // Chart title — will be updated on selection
    var chartTitle = g.append("text")
        .attr("x", gW / 2).attr("y", -28)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px").attr("font-weight", "bold").attr("fill", "#2d3436")
        .text("Grouped Bar Chart: Median Salary by Year & Experience Level  (All Jobs)");

    g.append("text")
        .attr("x", gW / 2).attr("y", -10)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px").attr("fill", "#636e72")
        .text("Animation: Filtering based on Job Title.");


    // Year groups
    var yearGroups = g.selectAll(".year-group")
        .data(years).enter()
        .append("g").attr("class", "year-group")
        .attr("transform", function (yr) { return "translate(" + x0(yr) + ",0)"; });

    // Draw initial bars (start at height 0 for entrance animation)
    yearGroups.selectAll("rect")
        .data(function (yr) {
            return allBarData.filter(function (d) { return d.year === yr; });
        })
        .enter().append("rect")
        .attr("x", function (d) { return x1(d.exp); })
        .attr("width", x1.bandwidth())
        .attr("rx", 2)
        .attr("fill", function (d) { return expColor(d.exp); })
        // Start at bottom (entrance animation)
        .attr("y", gH)
        .attr("height", 0)
        // Animate bars growing up on load
        .transition().duration(600).ease(d3.easeCubicOut)
        .attr("y", function (d) { return y(d.median); })
        .attr("height", function (d) { return gH - y(d.median); });

    // Add mouse events after transition (use selection, not transition)
    yearGroups.selectAll("rect")
        .on("mouseover", function (d) {
            d3.select(this).attr("opacity", 0.75);
            tooltip.style("opacity", 1)
                .html("<strong>" + d.year + " – " + EXP_LABELS[d.exp] + "</strong><br>Median: $" + d3.format(",")(Math.round(d.median)));
        })
        .on("mousemove", function () {
            tooltip.style("left", (d3.event.pageX + 12) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function () {
            d3.select(this).attr("opacity", 1);
            tooltip.style("opacity", 0);
        });

    // Legend
    var legG = g.append("g").attr("transform", "translate(" + (gW + 20) + ",0)");
    legG.append("rect").attr("x", -8).attr("y", -4)
        .attr("width", 132).attr("height", EXP_ORDER.length * 22 + 10)
        .attr("fill", "#fff").attr("opacity", 0.85).attr("rx", 4).attr("stroke", "#ddd");
    EXP_ORDER.forEach(function (exp, i) {
        legG.append("rect").attr("x", 0).attr("y", i * 22)
            .attr("width", 14).attr("height", 14).attr("fill", expColor(exp));
        legG.append("text").attr("class", "legend-text")
            .attr("x", 20).attr("y", i * 22 + 11).text(EXP_LABELS[exp]);
    });

    // Animated Filtering
    // Called by heatmap when user clicks a cell
    // jobFilter = null means show all; string means filter to that job
    updateBarChart = function (jobFilter) {

        // Compute new bar data for the filtered subset
        var subset = jobFilter
            ? data.filter(function (d) { return d.job_title === jobFilter; })
            : data;
        var newBarData = computeBarData(subset);

        // Update chart title with smooth fade
        chartTitle
            .transition().duration(200)
            .attr("opacity", 0)
            .transition().duration(200)
            .attr("opacity", 1)
            .text(jobFilter
                ? "Grouped Bar Chart: Median Salary by Year & Experience Level  (" + jobFilter + ")"
                : "Grouped Bar Chart: Median Salary by Year & Experience Level  (All Jobs)");

        // Filtering transition
        yearGroups.each(function (yr) {
            d3.select(this).selectAll("rect")
                .each(function (d) {
                    var match = newBarData.filter(function (nd) {
                        return nd.year === d.year && nd.exp === d.exp;
                    })[0];
                    var newMedian = (match && match.median > 0) ? match.median : 0;

                    d3.select(this)
                        .transition().duration(500).ease(d3.easeCubicInOut)
                        .attr("y", newMedian > 0 ? y(newMedian) : gH)
                        .attr("height", newMedian > 0 ? gH - y(newMedian) : 0)
                        .attr("opacity", newMedian > 0 ? 1 : 0.15);
                });
        });
    };
}
