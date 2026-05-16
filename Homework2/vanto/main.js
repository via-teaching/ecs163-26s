const W = window.innerWidth;
const H = window.innerHeight;

// Layout
const TITLE_H = 40;
const TOP_H = Math.floor((H - TITLE_H) * 0.55);
const BOT_H = H - TITLE_H - TOP_H;
const LEFT_W = Math.floor(W * 0.42);
const RIGHT_W = W - LEFT_W;

// Top job titles to show in heatmap 
const TOP_N_JOBS = 10; // I chose to stick with top 10 to keep it simple

// Experience level labels
const EXP_LABELS = { EN: "Entry", MI: "Mid", SE: "Senior", EX: "Executive" };
const EXP_ORDER = ["EN", "MI", "SE", "EX"];

// Color for experience levels 
const expColor = d3.scaleOrdinal()
    .domain(EXP_ORDER)
    .range(["#74b9ff", "#0984e3", "#fdcb6e", "#e17055"]);

const svg = d3.select("#main-svg");
const tooltip = d3.select("#tooltip");

// Load data
d3.csv("ds_salaries.csv").then(function (rawData) {

    // Parse numerics
    rawData.forEach(function (d) {
        d.salary_in_usd = +d.salary_in_usd;
        d.remote_ratio = +d.remote_ratio;
        d.work_year = +d.work_year;
    });

    // Title of webpage
    svg.append("text")
        .attr("x", W / 2)
        .attr("y", TITLE_H / 2 + 6)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .attr("font-weight", "bold")
        .attr("fill", "#2d3436")
        .text("Data Science Salaries Visualization");

    // I split them into 3 functions to create 3 visualizations
    drawHeatmap(rawData);
    drawParallelCoords(rawData);
    drawBarChart(rawData);

}).catch(function (err) {
    console.error("Failed to load data:", err);
});


//  VIEW 1 – Heatmap  (top-left)

function drawHeatmap(data) {

    const margin = { top: 50, right: 20, bottom: 20, left: 160 };
    const gW = LEFT_W - margin.left - margin.right;
    const gH = TOP_H - margin.top - margin.bottom;

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${TITLE_H + margin.top})`);

    // Count occurrences to find 10 job titles
    const jobCounts = d3.nest()
        .key(d => d.job_title)
        .rollup(v => v.length)
        .entries(data);
    jobCounts.sort((a, b) => b.value - a.value);
    const topJobs = jobCounts.slice(0, TOP_N_JOBS).map(d => d.key);

    // Filter to top jobs and compute median salary 
    const filtered = data.filter(d => topJobs.includes(d.job_title));

    const nested = d3.nest()
        .key(d => d.job_title)
        .key(d => d.experience_level)
        .rollup(v => d3.median(v, d => d.salary_in_usd))
        .entries(filtered);

    // Flatten into array of { job, exp, median }
    const cells = [];
    nested.forEach(function (jobEntry) {
        jobEntry.values.forEach(function (expEntry) {
            cells.push({
                job: jobEntry.key,
                exp: expEntry.key,
                median: expEntry.value
            });
        });
    });

    const x = d3.scaleBand()
        .domain(EXP_ORDER)
        .range([0, gW])
        .padding(0.05);

    const y = d3.scaleBand()
        .domain(topJobs)
        .range([0, gH])
        .padding(0.05);

    const colorScale = d3.scaleSequential()
        .domain([0, d3.max(cells, d => d.median)])
        .interpolator(d3.interpolateBlues);

    g.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0, 0)`)
        .call(d3.axisTop(x).tickFormat(d => EXP_LABELS[d]));

    g.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y));

    g.selectAll("rect.cell")
        .data(cells)
        .enter().append("rect")
        .attr("class", "cell")
        .attr("x", d => x(d.exp))
        .attr("y", d => y(d.job))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("fill", d => colorScale(d.median))
        .attr("rx", 2)
        .on("mouseover", function (d) {
            tooltip.style("opacity", 1)
                .html(`<strong>${d.job}</strong><br>${EXP_LABELS[d.exp]}<br>Median: $${d3.format(",")(Math.round(d.median))}`);
        })
        .on("mousemove", function () {
            tooltip
                .style("left", (d3.event.pageX + 12) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function () {
            tooltip.style("opacity", 0);
        });

    // Cell labels 
    g.selectAll("text.cell-label")
        .data(cells)
        .enter().append("text")
        .attr("class", "cell-label")
        .attr("x", d => x(d.exp) + x.bandwidth() / 2)
        .attr("y", d => y(d.job) + y.bandwidth() / 2 + 4)
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("fill", d => d.median > 150000 ? "#fff" : "#333")
        .text(d => "$" + d3.format(".0s")(d.median));

    // Chart title 
    g.append("text")
        .attr("x", gW / 2)
        .attr("y", -35)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .attr("font-weight", "bold")
        .attr("fill", "#2d3436")
        .text("Median Salary by Job Title & Experience Level");

    //  Legend
    const legendW = 120, legendH = 10;
    const legendX = gW - legendW;
    const legendY = gH + 5;

    const defs = svg.append("defs");
    const grad = defs.append("linearGradient").attr("id", "heatLegend");
    grad.append("stop").attr("offset", "0%").attr("stop-color", colorScale(0));
    grad.append("stop").attr("offset", "100%").attr("stop-color", colorScale(d3.max(cells, d => d.median)));

    g.append("rect")
        .attr("x", legendX).attr("y", legendY)
        .attr("width", legendW).attr("height", legendH)
        .style("fill", "url(#heatLegend)");

    g.append("text").attr("class", "legend-text")
        .attr("x", legendX).attr("y", legendY + 22)
        .text("$0");
    g.append("text").attr("class", "legend-text")
        .attr("x", legendX + legendW).attr("y", legendY + 22)
        .attr("text-anchor", "end")
        .text("$" + d3.format(".0s")(d3.max(cells, d => d.median)));
    g.append("text").attr("class", "legend-text")
        .attr("x", legendX + legendW / 2).attr("y", legendY + 22)
        .attr("text-anchor", "middle")
        .text("Median USD");
}

//  VIEW 2 – Parallel Coordinates  (top-right)

function drawParallelCoords(data) {

    const margin = { top: 50, right: 40, bottom: 20, left: 40 };
    const gW = RIGHT_W - margin.left - margin.right;
    const gH = TOP_H - margin.top - margin.bottom;

    const g = svg.append("g")
        .attr("transform", `translate(${LEFT_W + margin.left}, ${TITLE_H + margin.top})`);

    // I used ordinal encoding for categorical axes
    const dimensions = ["experience_level", "remote_ratio", "company_size", "salary_in_usd"];

    const dimLabels = {
        experience_level: "Experience",
        remote_ratio: "Remote %",
        company_size: "Company Size",
        salary_in_usd: "Salary (USD)"
    };

    // Build a scale per dimension
    const yScales = {};

    yScales["experience_level"] = d3.scalePoint()
        .domain(EXP_ORDER)
        .range([gH, 0])
        .padding(0.2);

    yScales["remote_ratio"] = d3.scalePoint()
        .domain(["0", "50", "100"])
        .range([gH, 0])
        .padding(0.2);

    yScales["company_size"] = d3.scalePoint()
        .domain(["S", "M", "L"])
        .range([gH, 0])
        .padding(0.2);

    yScales["salary_in_usd"] = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.salary_in_usd)])
        .range([gH, 0])
        .nice();

    // X position of each axis
    const x = d3.scalePoint()
        .domain(dimensions)
        .range([0, gW])
        .padding(0.1);

    function path(d) {
        return d3.line()(dimensions.map(function (dim) {
            const val = dim === "remote_ratio" ? String(d[dim]) : d[dim];
            return [x(dim), yScales[dim](val)];
        }));
    }

    const lines = g.append("g").attr("class", "lines");

    lines.selectAll("path")
        .data(data)
        .enter().append("path")
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", d => expColor(d.experience_level))
        .attr("stroke-opacity", 0.25)
        .attr("stroke-width", 1)
        .on("mouseover", function (d) {
            d3.select(this).attr("stroke-opacity", 1).attr("stroke-width", 2).raise();
            tooltip.style("opacity", 1)
                .html(`<strong>${d.job_title}</strong><br>
                       ${EXP_LABELS[d.experience_level]} | Remote: ${d.remote_ratio}%<br>
                       Size: ${d.company_size} | Salary: $${d3.format(",")(d.salary_in_usd)}`);
        })
        .on("mousemove", function () {
            tooltip
                .style("left", (d3.event.pageX + 12) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function () {
            d3.select(this).attr("stroke-opacity", 0.25).attr("stroke-width", 1);
            tooltip.style("opacity", 0);
        });

    const brushSelections = {};

    function updateLines() {
        lines.selectAll("path").attr("stroke-opacity", function (d) {
            // Check if this row passes all active brushes
            const passes = dimensions.every(function (dim) {
                if (!brushSelections[dim]) return true;
                const [lo, hi] = brushSelections[dim];
                const val = dim === "remote_ratio" ? String(d[dim]) : d[dim];
                const pos = yScales[dim](val);
                return pos >= lo && pos <= hi;
            });
            return passes ? 0.7 : 0.04;
        });
    }

    const axisG = g.selectAll(".axis-group")
        .data(dimensions)
        .enter().append("g")
        .attr("class", "axis-group")
        .attr("transform", d => `translate(${x(d)}, 0)`);

    // Draw axis lines + ticks
    axisG.each(function (dim) {
        const ax = dim === "salary_in_usd"
            ? d3.axisLeft(yScales[dim]).ticks(5).tickFormat(d => "$" + d3.format(".0s")(d))
            : d3.axisLeft(yScales[dim]);
        d3.select(this).append("g").attr("class", "axis").call(ax);
    });

    // Axis labels
    axisG.append("text")
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("font-weight", "bold")
        .attr("fill", "#2d3436")
        .text(d => dimLabels[d]);

    // Adding brush to each axis
    axisG.each(function (dim) {
        const brush = d3.brushY()
            .extent([[-12, 0], [12, gH]])
            .on("brush end", function () {
                if (d3.event.selection) {
                    brushSelections[dim] = d3.event.selection;
                } else {
                    delete brushSelections[dim];
                }
                updateLines();
            });
        d3.select(this).append("g").attr("class", "brush").call(brush);
    });

    // Chart title
    g.append("text")
        .attr("x", gW / 2)
        .attr("y", -35)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .attr("font-weight", "bold")
        .attr("fill", "#2d3436")
        .text("Parallel Coordinates: Experience → Remote → Size → Salary");

    g.append("text")
        .attr("x", gW / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("fill", "#636e72")
        .text("Drag on any axis to filter. Hover a line for details.");

    // Legend
    const legG = g.append("g").attr("transform", `translate(${gW - 130}, ${gH - 80})`);

    legG.append("rect")
        .attr("x", -8).attr("y", -14)
        .attr("width", 135).attr("height", EXP_ORDER.length * 18 + 10)
        .attr("fill", "#fff").attr("opacity", 0.85)
        .attr("rx", 4).attr("stroke", "#ddd");

    EXP_ORDER.forEach(function (exp, i) {
        legG.append("rect")
            .attr("x", 0).attr("y", i * 18)
            .attr("width", 12).attr("height", 12)
            .attr("fill", expColor(exp));
        legG.append("text")
            .attr("class", "legend-text")
            .attr("x", 18).attr("y", i * 18 + 10)
            .text(EXP_LABELS[exp]);
    });
}

//  VIEW 3 – Grouped Bar Chart  (bottom full-width)

function drawBarChart(data) {

    const margin = { top: 50, right: 30, bottom: 50, left: 70 };
    const gW = W - margin.left - margin.right;
    const gH = BOT_H - margin.top - margin.bottom;
    const topY = TITLE_H + TOP_H;

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${topY + margin.top})`);

    // Collect the median salary per (year, experience)
    const nested = d3.nest()
        .key(d => d.work_year)
        .key(d => d.experience_level)
        .rollup(v => d3.median(v, d => d.salary_in_usd))
        .entries(data);

    const years = ["2020", "2021", "2022", "2023"];

    // Flatten
    const barData = [];
    nested.forEach(function (yearEntry) {
        yearEntry.values.forEach(function (expEntry) {
            barData.push({
                year: yearEntry.key,
                exp: expEntry.key,
                median: expEntry.value
            });
        });
    });

    const x0 = d3.scaleBand()
        .domain(years)
        .range([0, gW])
        .paddingInner(0.2)
        .paddingOuter(0.1);

    const x1 = d3.scaleBand()
        .domain(EXP_ORDER)
        .range([0, x0.bandwidth()])
        .padding(0.05);

    const y = d3.scaleLinear()
        .domain([0, d3.max(barData, d => d.median) * 1.1])
        .range([gH, 0])
        .nice();

    g.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0, ${gH})`)
        .call(d3.axisBottom(x0));

    g.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y).ticks(5).tickFormat(d => "$" + d3.format(".0s")(d)));

    // X label
    g.append("text")
        .attr("x", gW / 2)
        .attr("y", gH + 40)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("fill", "#444")
        .text("Year");

    // Y label
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -gH / 2)
        .attr("y", -55)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("fill", "#444")
        .text("Median Salary (USD)");

    // Year groups
    const yearGroups = g.selectAll(".year-group")
        .data(years)
        .enter().append("g")
        .attr("class", "year-group")
        .attr("transform", d => `translate(${x0(d)}, 0)`);

    // Bars 
    yearGroups.selectAll("rect")
        .data(function (year) {
            return EXP_ORDER.map(function (exp) {
                const match = barData.find(d => d.year === year && d.exp === exp);
                return { year: year, exp: exp, median: match ? match.median : 0 };
            });
        })
        .enter().append("rect")
        .attr("x", d => x1(d.exp))
        .attr("y", d => y(d.median))
        .attr("width", x1.bandwidth())
        .attr("height", d => gH - y(d.median))
        .attr("fill", d => expColor(d.exp))
        .attr("rx", 2)
        .on("mouseover", function (d) {
            d3.select(this).attr("opacity", 0.75);
            tooltip.style("opacity", 1)
                .html(`<strong>${d.year} – ${EXP_LABELS[d.exp]}</strong><br>Median: $${d3.format(",")(Math.round(d.median))}`);
        })
        .on("mousemove", function () {
            tooltip
                .style("left", (d3.event.pageX + 12) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function () {
            d3.select(this).attr("opacity", 1);
            tooltip.style("opacity", 0);
        });

    // Chart title
    g.append("text")
        .attr("x", gW / 2)
        .attr("y", -30)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .attr("font-weight", "bold")
        .attr("fill", "#2d3436")
        .text("Median Salary by Year & Experience Level");

    // Legend
    const legG = g.append("g").attr("transform", `translate(${gW - 140}, 0)`);

    legG.append("rect")
        .attr("x", -8).attr("y", -4)
        .attr("width", 140).attr("height", EXP_ORDER.length * 18 + 10)
        .attr("fill", "#fff").attr("opacity", 0.85)
        .attr("rx", 4).attr("stroke", "#ddd");

    EXP_ORDER.forEach(function (exp, i) {
        legG.append("rect")
            .attr("x", 0).attr("y", i * 18)
            .attr("width", 12).attr("height", 12)
            .attr("fill", expColor(exp));
        legG.append("text")
            .attr("class", "legend-text")
            .attr("x", 18).attr("y", i * 18 + 10)
            .text(EXP_LABELS[exp]);
    });
}
