const width = window.innerWidth;
const height = window.innerHeight;


let barLeft = 0, barTop = 0;
let barMargin = { top: 40, right: 20, bottom: 40, left: 200 },
    barWidth = (width * 0.45) - barMargin.left - barMargin.right,
    barHeight = (height * 0.48) - barMargin.top - barMargin.bottom;

let grpLeft = width * 0.45, grpTop = 0;
let grpMargin = { top: 40, right: 30, bottom: 50, left: 70 },
    grpWidth = (width * 0.55) - grpMargin.left - grpMargin.right,
    grpHeight = (height * 0.48) - grpMargin.top - grpMargin.bottom;

let pcpLeft = 0, pcpTop = height * 0.50;
let pcpMargin = { top: 50, right: 60, bottom: 20, left: 60 },
    pcpWidth = width - pcpMargin.left - pcpMargin.right,
    pcpHeight = (height * 0.48) - pcpMargin.top - pcpMargin.bottom;

// ── Lookup maps ───────────────────────────────────────────────
const EXP_MAP = { EN: "Entry", MI: "Mid", SE: "Senior", EX: "Executive" };
const EXP_ORDER = ["EN", "MI", "SE", "EX"];
const EXP_COLORS = { EN: "#4fc3f7", MI: "#81c784", SE: "#ffb74d", EX: "#f06292" };

const SIZE_MAP = { S: "Small", M: "Medium", L: "Large" };
const SIZE_ORDER = ["S", "M", "L"];
const SIZE_COLORS = { S: "#9c8fff", M: "#4dd0e1", L: "#f48fb1" };

const REMOTE_MAP = { "0": "On-site", "50": "Hybrid", "100": "Remote" };

// ── Tooltip ───────────────────────────────────────────────────
const tooltip = d3.select(".tooltip");

function showTip(html, event) {
    tooltip.html(html)
        .style("display", "block")
        .style("left", (event.clientX + 14) + "px")
        .style("top", (event.clientY - 10) + "px");
}
function moveTip(event) {
    tooltip.style("left", (event.clientX + 14) + "px")
        .style("top", (event.clientY - 10) + "px");
}
function hideTip() {
    tooltip.style("display", "none");
}

// ── Load data ─────────────────────────────────────────────────
d3.csv("data/ds_salaries.csv").then(function (rawData) {

    rawData.forEach(function (d) {
        d.salary_in_usd = Number(d.salary_in_usd);
        d.remote_ratio = Number(d.remote_ratio);
        d.work_year = Number(d.work_year);
    });

    const data = rawData.filter(d => d.salary_in_usd > 0);

    drawBarChart(data);
    drawGroupedBar(data);
    drawParallelCoords(data);

}).catch(function (error) {
    console.log(error);
});

// ══════════════════════════════════════════════════════════════
//  VIEW 1 · Bar Chart — Top 20 Job Titles by Avg Salary
//  Purpose: Overview / context of the salary landscape
// ══════════════════════════════════════════════════════════════
function drawBarChart(data) {
    const svg = d3.select("svg");

    // Aggregate average salary per job title, take top 20
    const byTitle = d3.rollup(data, v => d3.mean(v, d => d.salary_in_usd), d => d.job_title);
    const sorted = Array.from(byTitle, ([title, avg]) => ({ title, avg }))
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 20);

    const x = d3.scaleLinear()
        .domain([0, d3.max(sorted, d => d.avg) * 1.05])
        .range([0, barWidth]);

    const y = d3.scaleBand()
        .domain(sorted.map(d => d.title))
        .range([0, barHeight])
        .padding(0.25);

    const colorScale = d3.scaleSequential()
        .domain([d3.min(sorted, d => d.avg), d3.max(sorted, d => d.avg)])
        .interpolator(d3.interpolate("#1e3a5f", "#f0c040"));

    const g1 = svg.append("g")
        .attr("transform", `translate(${barLeft + barMargin.left}, ${barTop + barMargin.top})`);

    // Chart title
    g1.append("text")
        .attr("x", barWidth / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .attr("font-family", "monospace")
        .attr("fill", "#e6edf3")
        .text("Top 20 Job Titles by Average Salary (Overview)");

    // Grid lines
    g1.append("g")
        .attr("class", "grid")
        .call(d3.axisBottom(x).ticks(5).tickSize(barHeight).tickFormat(""))
        .select(".domain").remove();

    // Bars
    g1.selectAll("rect")
        .data(sorted)
        .enter().append("rect")
        .attr("x", 0)
        .attr("y", d => y(d.title))
        .attr("width", d => x(d.avg))
        .attr("height", y.bandwidth())
        .attr("fill", d => colorScale(d.avg))
        .attr("rx", 2)
        .on("mouseover", function (event, d) {
            showTip("<strong>" + d.title + "</strong><br/>Avg: $" + Math.round(d.avg).toLocaleString(), event);
        })
        .on("mousemove", moveTip)
        .on("mouseleave", hideTip);

    // Value labels
    g1.selectAll(".bar-label")
        .data(sorted)
        .enter().append("text")
        .attr("x", d => x(d.avg) + 4)
        .attr("y", d => y(d.title) + y.bandwidth() / 2 + 3.5)
        .attr("font-size", "9px")
        .attr("font-family", "monospace")
        .attr("fill", "#8b949e")
        .text(d => "$" + Math.round(d.avg / 1000) + "k");

    // Y axis
    g1.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y).tickSize(0))
        .select(".domain").remove();

    // X axis
    g1.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0, ${barHeight})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(d => "$" + d / 1000 + "k"))
        .select(".domain").remove();

    // X axis label
    g1.append("text")
        .attr("x", barWidth / 2)
        .attr("y", barHeight + 36)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("font-family", "monospace")
        .attr("fill", "#8b949e")
        .text("Average Salary (USD)");

    // Legend
    const legendData = [
        { label: "Lower salary", color: "#1e3a5f" },
        { label: "Higher salary", color: "#f0c040" }
    ];
    legendData.forEach(function (item, i) {
        g1.append("rect")
            .attr("x", barWidth - 130)
            .attr("y", i * 18)
            .attr("width", 12).attr("height", 12)
            .attr("fill", item.color).attr("rx", 2);
        g1.append("text")
            .attr("x", barWidth - 114)
            .attr("y", i * 18 + 10)
            .attr("font-size", "10px")
            .attr("font-family", "monospace")
            .attr("fill", "#8b949e")
            .text(item.label);
    });
}

// ══════════════════════════════════════════════════════════════
//  VIEW 2 · Grouped Bar — Salary by Experience x Company Size
//  Purpose: Detail view of how seniority and company scale interact
// ══════════════════════════════════════════════════════════════
function drawGroupedBar(data) {
    const svg = d3.select("svg");

    // Aggregate mean salary per experience level + company size
    const rollup = d3.rollup(
        data,
        v => d3.mean(v, d => d.salary_in_usd),
        d => d.experience_level,
        d => d.company_size
    );

    const rows = [];
    EXP_ORDER.forEach(function (exp) {
        const sizeMap = rollup.get(exp) || new Map();
        SIZE_ORDER.forEach(function (sz) {
            rows.push({ exp: exp, sz: sz, avg: sizeMap.get(sz) || 0 });
        });
    });

    const x0 = d3.scaleBand()
        .domain(EXP_ORDER)
        .range([0, grpWidth])
        .paddingInner(0.25)
        .paddingOuter(0.1);

    const x1 = d3.scaleBand()
        .domain(SIZE_ORDER)
        .range([0, x0.bandwidth()])
        .padding(0.08);

    const y = d3.scaleLinear()
        .domain([0, d3.max(rows, d => d.avg) * 1.1])
        .range([grpHeight, 0])
        .nice();

    const g2 = svg.append("g")
        .attr("transform", `translate(${grpLeft + grpMargin.left}, ${grpTop + grpMargin.top})`);

    // Chart title
    g2.append("text")
        .attr("x", grpWidth / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .attr("font-family", "monospace")
        .attr("fill", "#e6edf3")
        .text("Avg Salary by Experience Level & Company Size");

    // Grid lines
    g2.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(y).ticks(5).tickSize(-grpWidth).tickFormat(""))
        .select(".domain").remove();

    // Grouped bars
    const expGroups = g2.selectAll(".exp-group")
        .data(EXP_ORDER)
        .enter().append("g")
        .attr("class", "exp-group")
        .attr("transform", function (exp) { return `translate(${x0(exp)}, 0)`; });

    expGroups.selectAll("rect")
        .data(function (exp) {
            return SIZE_ORDER.map(function (sz) {
                return rows.find(function (r) { return r.exp === exp && r.sz === sz; });
            });
        })
        .enter().append("rect")
        .attr("x", d => x1(d.sz))
        .attr("y", d => y(d.avg))
        .attr("width", x1.bandwidth())
        .attr("height", d => grpHeight - y(d.avg))
        .attr("fill", d => SIZE_COLORS[d.sz])
        .attr("rx", 2)
        .on("mouseover", function (event, d) {
            showTip(
                "<strong>" + EXP_MAP[d.exp] + " · " + SIZE_MAP[d.sz] + " Co.</strong><br/>Avg: $" + Math.round(d.avg).toLocaleString(),
                event
            );
        })
        .on("mousemove", moveTip)
        .on("mouseleave", hideTip);

    // X axis
    g2.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0, ${grpHeight})`)
        .call(d3.axisBottom(x0).tickFormat(k => EXP_MAP[k]));

    // Y axis
    g2.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y).ticks(5).tickFormat(d => "$" + d / 1000 + "k"))
        .select(".domain").remove();

    // X axis label
    g2.append("text")
        .attr("x", grpWidth / 2)
        .attr("y", grpHeight + 44)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("font-family", "monospace")
        .attr("fill", "#8b949e")
        .text("Experience Level");

    // Y axis label
    g2.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -(grpHeight / 2))
        .attr("y", -55)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("font-family", "monospace")
        .attr("fill", "#8b949e")
        .text("Avg Salary (USD)");

    // Legend
    SIZE_ORDER.forEach(function (sz, i) {
        g2.append("rect")
            .attr("x", grpWidth - 100)
            .attr("y", i * 18)
            .attr("width", 12).attr("height", 12)
            .attr("fill", SIZE_COLORS[sz]).attr("rx", 2);
        g2.append("text")
            .attr("x", grpWidth - 84)
            .attr("y", i * 18 + 10)
            .attr("font-size", "10px")
            .attr("font-family", "monospace")
            .attr("fill", "#8b949e")
            .text(SIZE_MAP[sz]);
    });
}

// ══════════════════════════════════════════════════════════════
//  VIEW 3 · Parallel Coordinates — Multi-dimensional Explorer
//  Purpose: Focus view — trace individual records across all dims
//  Advanced visualization method
// ══════════════════════════════════════════════════════════════
function drawParallelCoords(data) {
    const svg = d3.select("svg");

    const dimensions = [
        { key: "experience_level", label: "Experience", type: "ordinal", domain: EXP_ORDER, format: d => EXP_MAP[d] || d },
        { key: "remote_ratio", label: "Remote %", type: "ordinal", domain: ["0", "50", "100"], format: d => REMOTE_MAP[d] || d },
        { key: "company_size", label: "Company Size", type: "ordinal", domain: SIZE_ORDER, format: d => SIZE_MAP[d] || d },
        { key: "salary_in_usd", label: "Salary (USD)", type: "linear", domain: null, format: d => "$" + Math.round(d / 1000) + "k" },
        { key: "work_year", label: "Year", type: "ordinal", domain: ["2020", "2021", "2022", "2023"], format: d => d },
    ];

    // Build a y-scale per dimension
    const yScales = {};
    dimensions.forEach(function (dim) {
        if (dim.type === "linear") {
            yScales[dim.key] = d3.scaleLinear()
                .domain(d3.extent(data, d => +d[dim.key]))
                .range([pcpHeight, 0])
                .nice();
        } else {
            yScales[dim.key] = d3.scalePoint()
                .domain(dim.domain)
                .range([pcpHeight, 0])
                .padding(0.3);
        }
    });

    // X position for each axis
    const xScale = d3.scalePoint()
        .domain(dimensions.map(d => d.key))
        .range([0, pcpWidth])
        .padding(0.1);

    // Sample up to 800 rows for performance
    const sample = data.length > 800 ? d3.shuffle(data.slice()).slice(0, 800) : data;

    const g3 = svg.append("g")
        .attr("transform", `translate(${pcpLeft + pcpMargin.left}, ${pcpTop + pcpMargin.top})`);

    // Chart title
    g3.append("text")
        .attr("x", pcpWidth / 2)
        .attr("y", -30)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .attr("font-family", "monospace")
        .attr("fill", "#e6edf3")
        .text("Parallel Coordinates — Salary Profile Explorer (Focus) · Drag axes to reorder · Colored by Experience Level");

    // Line path function
    function path(d) {
        return d3.line()(
            dimensions.map(function (dim) {
                const val = dim.type === "linear" ? String(+d[dim.key]) : String(d[dim.key]);
                return [xScale(dim.key), yScales[dim.key](dim.type === "linear" ? +d[dim.key] : val)];
            })
        );
    }

    // Draw lines
    const lines = g3.selectAll(".pcp-line")
        .data(sample)
        .enter().append("path")
        .attr("class", "pcp-line")
        .attr("d", path)
        .attr("stroke", d => EXP_COLORS[d.experience_level] || "#888")
        .on("mouseover", function (event, d) {
            d3.select(this).raise().attr("stroke-width", 2.5).attr("opacity", 1);
            showTip(
                "<strong>" + d.job_title + "</strong><br/>" +
                "Salary: $" + Number(d.salary_in_usd).toLocaleString() + "<br/>" +
                EXP_MAP[d.experience_level] + " · " + SIZE_MAP[d.company_size] + " Co. · " + REMOTE_MAP[String(d.remote_ratio)],
                event
            );
        })
        .on("mousemove", moveTip)
        .on("mouseleave", function () {
            d3.select(this).attr("stroke-width", 1.2).attr("opacity", 0.3);
            hideTip();
        });

    // Draw one axis per dimension
    let dragging = {};
    const dimKeys = dimensions.map(d => d.key);

    const axisGroups = g3.selectAll(".dim-axis")
        .data(dimensions)
        .enter().append("g")
        .attr("class", "dim-axis")
        .attr("transform", d => `translate(${xScale(d.key)}, 0)`);

    axisGroups.each(function (dim) {
        const ag = d3.select(this);
        let axFn;
        if (dim.type === "linear") {
            axFn = d3.axisLeft(yScales[dim.key]).ticks(5).tickFormat(dim.format);
        } else {
            axFn = d3.axisLeft(yScales[dim.key])
                .tickValues(dim.domain)
                .tickFormat(v => dim.format(v));
        }
        ag.append("g").attr("class", "axis").call(axFn);

        // Axis label
        ag.append("text")
            .attr("y", -16)
            .attr("text-anchor", "middle")
            .attr("font-size", "11px")
            .attr("font-family", "monospace")
            .attr("fill", "#e6edf3")
            .text(dim.label);
    });

    // Drag to reorder axes
    axisGroups.call(
        d3.drag()
            .on("start", function (event, d) {
                dragging[d.key] = xScale(d.key);
                d3.select(this).raise();
            })
            .on("drag", function (event, d) {
                dragging[d.key] = Math.max(0, Math.min(pcpWidth, event.x));
                dimKeys.sort((a, b) => position(a) - position(b));
                xScale.domain(dimKeys);
                axisGroups.attr("transform", dim => `translate(${position(dim.key)}, 0)`);
                lines.attr("d", path);
            })
            .on("end", function (event, d) {
                delete dragging[d.key];
                d3.select(this).transition().duration(300)
                    .attr("transform", `translate(${xScale(d.key)}, 0)`);
                lines.transition().duration(300).attr("d", path);
            })
    );

    function position(key) {
        return dragging[key] !== undefined ? dragging[key] : xScale(key);
    }

    // Legend
    EXP_ORDER.forEach(function (k, i) {
        g3.append("rect")
            .attr("x", pcpWidth - 130)
            .attr("y", i * 18)
            .attr("width", 12).attr("height", 12)
            .attr("fill", EXP_COLORS[k]).attr("rx", 2);
        g3.append("text")
            .attr("x", pcpWidth - 114)
            .attr("y", i * 18 + 10)
            .attr("font-size", "10px")
            .attr("font-family", "monospace")
            .attr("fill", "#8b949e")
            .text(EXP_MAP[k]);
    });
}
