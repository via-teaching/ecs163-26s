/*
 * ECS 163 - Homework 2: Visualization Dashboard
 * Dataset: Student Mental Health 
 */
const width = window.innerWidth;
const height = window.innerHeight;

// Top-left: stacked bar chart 
const barMargin = { top: 75, right: 30, bottom: 90, left: 60 };
const barLeft = 0;
const barTop = 0;
const barOuterW = Math.max(420, width * 0.58);
const barOuterH = Math.max(300, height * 0.45);
const barWidth = barOuterW - barMargin.left - barMargin.right;
const barHeight = barOuterH - barMargin.top - barMargin.bottom;

// Top-right: donut chart 
const donutMargin = { top: 50, right: 30, bottom: 30, left: 30 };
const donutLeft = barOuterW;
const donutTop = 0;
const donutOuterW = width - barOuterW;
const donutOuterH = barOuterH;
const donutWidth = donutOuterW - donutMargin.left - donutMargin.right;
const donutHeight = donutOuterH - donutMargin.top - donutMargin.bottom;
const donutRadius = Math.min(donutWidth, donutHeight) / 2 - 20;

// Bottom: parallel coordinates plot
const pcMargin = { top: 50, right: 60, bottom: 60, left: 60 };
const pcLeft = 0;
const pcTop = barOuterH;
const pcOuterW = width;
const pcOuterH = height - barOuterH;
const pcWidth = pcOuterW - pcMargin.left - pcMargin.right;
const pcHeight = pcOuterH - pcMargin.top - pcMargin.bottom;

const svg = d3.select("svg");

function rollupMap(arr, reducer, keyFn) {
    const groups = new Map();
    for (const x of arr) {
        const k = keyFn(x);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(x);
    }
    const out = new Map();
    for (const [k, vs] of groups) out.set(k, reducer(vs));
    return out;
}
function rollupEntries(arr, reducer, ...keyFns) {
    function recurse(items, depth) {
        if (depth === keyFns.length) return reducer(items);
        const groups = new Map();
        for (const it of items) {
            const k = keyFns[depth](it);
            if (!groups.has(k)) groups.set(k, []);
            groups.get(k).push(it);
        }
        return Array.from(groups, ([k, vs]) => [k, recurse(vs, depth + 1)]);
    }
    return recurse(arr, 0);
}


d3.csv("Student Mental health.csv").then(rawData => {

    // Normalize categorical fields: the raw CSV has inconsistent casing
    const titleCase = s => s ? s.trim().replace(/\b\w/g, c => c.toUpperCase()) : s;

    const data = rawData
        .filter(d => d["Choose your gender"] && d["Your current year of Study"])
        .map(d => ({
            gender: d["Choose your gender"].trim(),
            age: d["Age"] ? +d["Age"] : null,
            course: d["What is your course?"] ? d["What is your course?"].trim() : "Unknown",
            year: titleCase(d["Your current year of Study"]),       // "Year 1" .. "Year 4"
            cgpa: d["What is your CGPA?"].trim(),                    // "3.00 - 3.49", etc.
            married: d["Marital status"].trim(),
            depression: d["Do you have Depression?"].trim(),
            anxiety: d["Do you have Anxiety?"].trim(),
            panic: d["Do you have Panic attack?"].trim(),
            treatment: d["Did you seek any specialist for a treatment?"].trim(),
        }));

    console.log("rows after clean:", data.length, data[0]);

    const COURSE_MIN = 3;
    const courseCount = rollupMap(data, v => v.length, d => d.course);
    const courseLabel = c => (courseCount.get(c) >= COURSE_MIN ? c : "Other");

    // Container group for the bar chart, offset by its margins
    const g1 = svg.append("g")
        .attr("transform", `translate(${barLeft + barMargin.left}, ${barTop + barMargin.top})`);

    // Title
    svg.append("text")
        .attr("x", barLeft + barMargin.left)
        .attr("y", barTop + 25)
        .text("Overview — Students by Course");

    // Aggregate: for each (course, depression) pair, count students
    const stackedRollup = rollupEntries(
        data,
        v => v.length,
        d => courseLabel(d.course),
        d => d.depression
    );
    // [[course, [[depression, count], ...]], ...]
    const courseAgg = stackedRollup.map(([course, arr]) => {
        const yes = (arr.find(a => a[0] === "Yes") || [, 0])[1];
        const no = (arr.find(a => a[0] === "No") || [, 0])[1];
        return { course, Yes: yes, No: no, total: yes + no };
    }).sort((a, b) => d3.descending(a.total, b.total));

    // Push "Other" to the end regardless of size
    const other = courseAgg.find(d => d.course === "Other");
    if (other) {
        const without = courseAgg.filter(d => d.course !== "Other");
        courseAgg.length = 0;
        courseAgg.push(...without, other);
    }

    const xBar = d3.scaleBand()
        .domain(courseAgg.map(d => d.course))
        .range([0, barWidth])
        .paddingInner(0.25)
        .paddingOuter(0.15);

    const yBar = d3.scaleLinear()
        .domain([0, d3.max(courseAgg, d => d.total)]).nice()
        .range([barHeight, 0]);

    // Depression color encoding: orange = Yes (signal), gray = No (baseline).
    // Used here and in the parallel coordinates legend for consistency.
    const depressionColor = d3.scaleOrdinal()
        .domain(["Yes", "No"])
        .range(["#e07a3c", "#9aa0a6"]);

    // Stacked bars: No on bottom, Yes on top
    g1.selectAll(".bar-no")
        .data(courseAgg).enter().append("rect")
        .attr("x", d => xBar(d.course))
        .attr("y", d => yBar(d.No))
        .attr("width", xBar.bandwidth())
        .attr("height", d => yBar(0) - yBar(d.No))
        .attr("fill", depressionColor("No"));

    g1.selectAll(".bar-yes")
        .data(courseAgg).enter().append("rect")
        .attr("x", d => xBar(d.course))
        .attr("y", d => yBar(d.total))
        .attr("width", xBar.bandwidth())
        .attr("height", d => yBar(d.No) - yBar(d.total))
        .attr("fill", depressionColor("Yes"));

    // X axis
    g1.append("g")
        .attr("transform", `translate(0, ${barHeight})`)
        .call(d3.axisBottom(xBar))
        .selectAll("text")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-35)")
        .attr("dx", "-0.5em")
        .attr("dy", "0.5em");

    // Y axis
    g1.append("g").call(d3.axisLeft(yBar).ticks(6));

    // X label
    g1.append("text")
        .attr("x", barWidth / 2)
        .attr("y", barHeight + 75)
        .attr("text-anchor", "middle")
        .text("Course");

    // Y label
    g1.append("text")
        .attr("x", -barHeight / 2)
        .attr("y", -42)
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text("Number of Students");

    // Legend — own row, directly below the title and above the bars.
    // Horizontal layout, left aligned so it never competes for space with the
    // title or the donut chart's title to the right.
    const barLegend = g1.append("g").attr("transform", `translate(0, -28)`);
    [["Yes", "Depression: Yes"], ["No", "Depression: No"]].forEach((d, i) => {
        const row = barLegend.append("g").attr("transform", `translate(${i * 130}, 0)`);
        row.append("rect").attr("width", 14).attr("height", 14)
            .attr("fill", depressionColor(d[0]));
        row.append("text")
            .attr("x", 20).attr("y", 11).text(d[1]);
    });


    const yearOrder = ["Year 1", "Year 2", "Year 3", "Year 4"];
    const yearCounts = rollupEntries(data, v => v.length, d => d.year)
        .filter(([y]) => yearOrder.includes(y))
        .sort((a, b) => yearOrder.indexOf(a[0]) - yearOrder.indexOf(b[0]));
    const yearTotal = d3.sum(yearCounts, d => d[1]);
    // Container group for the donut chart, centered in its allocated region
    const g2 = svg.append("g")
        .attr("transform",
            `translate(${donutLeft + donutMargin.left + donutWidth / 2}, ${donutTop + donutMargin.top + donutHeight / 2})`);

    // Title
    svg.append("text")
        .attr("x", donutLeft + donutMargin.left)
        .attr("y", donutTop + 25)
        .text("Composition by Year of Study");

    const yearColor = d3.scaleOrdinal()
        .domain(yearOrder)
        .range(["#4c78a8", "#72b7b2", "#54a24b", "#eeca3b"]);

    const pie = d3.pie().value(d => d[1]).sort(null);
    const arc = d3.arc().innerRadius(donutRadius * 0.55).outerRadius(donutRadius);

    // Donut arc paths — one per year, filled with the year's categorical color
    g2.selectAll("path")
        .data(pie(yearCounts)).enter().append("path")
        .attr("d", arc)
        .attr("fill", d => yearColor(d.data[0]))
        .attr("stroke", "white")
        .style("stroke-width", "2px");

    // Percent labels inside slices
    g2.selectAll(".slice-label")
        .data(pie(yearCounts)).enter().append("text")
        .attr("transform", d => `translate(${arc.centroid(d)})`)
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .style("font-size", "12px")
        .style("fill", "white")
        .style("font-weight", "600")
        .text(d => `${Math.round((d.data[1] / yearTotal) * 100)}%`);

    // Center label: total N
    g2.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "-0.2em")
        .style("font-size", "22px")
        .style("font-weight", "600")
        .text(yearTotal);
    g2.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "1.1em")
        .style("font-size", "11px")
        .style("fill", "#666")
        .text("students");

    // Legend for donut: place to the right of the donut
    const donutLegend = svg.append("g")
        .attr("transform",
            `translate(${donutLeft + donutMargin.left + donutWidth / 2 + donutRadius + 25}, ${donutTop + donutMargin.top + 30})`);
    yearCounts.forEach((d, i) => {
        const row = donutLegend.append("g").attr("transform", `translate(0, ${i * 20})`);
        row.append("rect").attr("width", 14).attr("height", 14).attr("fill", yearColor(d[0]));
        row.append("text")
            .attr("x", 20).attr("y", 11)
            .text(`${d[0]}  (n = ${d[1]})`);
    });

    // Container group for the parallel coordinates plot
    const g3 = svg.append("g")
        .attr("transform", `translate(${pcLeft + pcMargin.left}, ${pcTop + pcMargin.top})`);

    // Title
    svg.append("text")
        .attr("x", pcLeft + pcMargin.left)
        .attr("y", pcTop + 25)
        .text("Multivariate View — Demographics × Mental-Health Outcomes (each line = 1 student)");

    // Define each axis: name, ordered domain, display label
    const dims = [
        { key: "gender", label: "Gender", domain: ["Female", "Male"] },
        { key: "year", label: "Year", domain: yearOrder },
        {
            key: "cgpa", label: "CGPA",
            domain: ["0 - 1.99", "2.00 - 2.49", "2.50 - 2.99", "3.00 - 3.49", "3.50 - 4.00"]
        },
        { key: "depression", label: "Depression", domain: ["No", "Yes"] },
        { key: "anxiety", label: "Anxiety", domain: ["No", "Yes"] },
        { key: "panic", label: "Panic Attack", domain: ["No", "Yes"] },
        { key: "treatment", label: "Sought Treatment", domain: ["No", "Yes"] },
    ];

    // A y scale per axis (categorical to ordered point positions)
    const yScales = {};
    dims.forEach(dim => {
        yScales[dim.key] = d3.scalePoint()
            .domain(dim.domain)
            .range([pcHeight, 0])
            .padding(0.5);
    });

    // X position of each axis
    const xPC = d3.scalePoint()
        .domain(dims.map(d => d.key))
        .range([0, pcWidth])
        .padding(0.5);

    // Deterministic per-(row,axis) jitter so heavily shared category positions
    // don't collapse to a single line. Seeded by row index so it's stable.
    const JITTER = 14;  // pixels
    const hashJitter = (i, axisIdx) => {
        const s = Math.sin((i + 1) * 9301 + (axisIdx + 1) * 49297) * 233280;
        return (s - Math.floor(s) - 0.5) * 2 * JITTER;  // [-JITTER, +JITTER]
    };

    // Line generator
    const linePath = (row, i) => {
        return d3.line()(
            dims.map((dim, idx) => [
                xPC(dim.key),
                yScales[dim.key](row[dim.key]) + hashJitter(i, idx),
            ])
        );
    };

    // Draw lines
    const sortedData = [...data].sort(
        (a, b) => (a.depression === "Yes" ? 1 : 0) - (b.depression === "Yes" ? 1 : 0)
    );

    g3.selectAll(".pc-line")
        .data(sortedData).enter().append("path")
        .attr("d", (d, i) => linePath(d, i))
        .attr("fill", "none")
        .attr("stroke", d => depressionColor(d.depression))
        .attr("stroke-width", 1.3)
        .attr("opacity", d => d.depression === "Yes" ? 0.75 : 0.35);

    // Draw axes
    dims.forEach(dim => {
        const ax = g3.append("g")
            .attr("transform", `translate(${xPC(dim.key)}, 0)`)
            .call(d3.axisLeft(yScales[dim.key]).tickSize(0).tickPadding(8));

        // Faint vertical guide line
        ax.append("line")
            .attr("y1", 0).attr("y2", pcHeight)
            .attr("stroke", "#bbb").attr("stroke-width", 1);

        // Axis title above the axis
        ax.append("text")
            .attr("y", -12)
            .attr("text-anchor", "middle")
            .style("font-weight", "600")
            .text(dim.label);
    });

    // Legend for parallel coordinates — horizontal, placed beloww the plot
    // so it never collides with the rightmost axis labels.
    const pcLegend = g3.append("g")
        .attr("transform", `translate(0, ${pcHeight + 38})`);
    pcLegend.append("text")
        .attr("x", 0).attr("y", 0)
        .style("font-weight", "600")
        .text("Line color:");
    [["Yes", "Has depression"], ["No", "No depression"]].forEach((d, i) => {
        const xOff = 80 + i * 170;
        pcLegend.append("line")
            .attr("x1", xOff).attr("x2", xOff + 24)
            .attr("y1", -4).attr("y2", -4)
            .attr("stroke", depressionColor(d[0]))
            .attr("stroke-width", 2.5)
            .attr("opacity", d[0] === "Yes" ? 0.85 : 0.5);
        pcLegend.append("text")
            .attr("x", xOff + 30).attr("y", 0).text(d[1]);
    });

}).catch(err => {
    console.error("Failed to load CSV:", err);
});