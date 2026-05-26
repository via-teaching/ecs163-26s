/*
 * ECS 163 - Homework 3
 * Student Mental Health Dashboard
 * bescutia
 *
 * Three views:
 *   1. Scatter (overview / context, brushable)
 *   2. Bar chart (detail / focus, animates on selection change)
 *   3. Heatmap (advanced viz, click cells to select Course x Year)
 *
 * Interactions: brushing on scatter, click selection on heatmap.
 * Animations: bar heights + labels transition; scatter opacity transitions; cell highlight transitions.
 */

// ---------- shared state ----------
const cgpaMid = {
    "0 - 1.99": 1.0,
    "2.00 - 2.49": 2.25,
    "2.50 - 2.99": 2.75,
    "3.00 - 3.49": 3.25,
    "3.50 - 4.00": 3.75,
};
const yearOrder = ["Year 1", "Year 2", "Year 3", "Year 4"];

const depColor = d3.scaleOrdinal()
    .domain(["Yes", "No"])
    .range(["#e07a3c", "#9aa0a6"]);

// data + selection state
let allData = [];
let brushedIdx = null;      // Set of selected row indices from scatter brush, or null
let clickedCell = null;     // {course, year} from heatmap click, or null

// references we need across functions
let brushObj;               // the d3.brush instance (so we can clear it later)
let scatterPts;             // scatter circle selection
let scatterPos;             // function: (row, i) -> {cx, cy}
let heatCells;              // heatmap cell selection
let barG, barX, barY, barH; // bar chart state

// ---------- helpers ----------
function titleCase(s) {
    return s ? s.trim().replace(/\b\w/g, c => c.toUpperCase()) : s;
}

// Combine the two selection mechanisms.
function getSelected() {
    let subset = allData;
    if (brushedIdx !== null) {
        subset = subset.filter((d, i) => brushedIdx.has(i));
    }
    if (clickedCell !== null) {
        subset = subset.filter(d =>
            d.courseLabel === clickedCell.course && d.year === clickedCell.year
        );
    }
    return subset;
}

// ---------- load & start ----------
d3.csv("data.csv").then(raw => {
    allData = raw
        .filter(d => d["Choose your gender"] && d["Your current year of Study"] && d["Age"])
        .map(d => {
            const cgpaStr = d["What is your CGPA?"].trim();
            return {
                gender: d["Choose your gender"].trim(),
                age: +d["Age"],
                course: d["What is your course?"]
                    ? d["What is your course?"].trim()
                    : "Unknown",
                year: titleCase(d["Your current year of Study"]),
                cgpaNum: cgpaMid[cgpaStr] || 0,
                depression: d["Do you have Depression?"].trim(),
                anxiety: d["Do you have Anxiety?"].trim(),
                panic: d["Do you have Panic attack?"].trim(),
                treatment: d["Did you seek any specialist for a treatment?"].trim(),
            };
        })
        .filter(d => yearOrder.includes(d.year) && d.cgpaNum > 0 && !isNaN(d.age));

    // Group rare courses into "Other" so the heatmap is readable.
    const counts = {};
    allData.forEach(d => { counts[d.course] = (counts[d.course] || 0) + 1; });
    allData.forEach(d => {
        d.courseLabel = counts[d.course] >= 4 ? d.course : "Other";
    });

    drawScatter();
    drawBar();
    drawHeatmap();
}).catch(err => console.error("CSV load failed:", err));


// =====================================================
// View 1: Scatter plot (Overview / context, brushable)
// =====================================================
function drawScatter() {
    const svgW = 500, svgH = 350;
    const margin = { top: 35, right: 20, bottom: 50, left: 55 };
    const W = svgW - margin.left - margin.right;
    const H = svgH - margin.top - margin.bottom;

    const svg = d3.select("#scatter").append("svg")
        .attr("width", svgW).attr("height", svgH);

    svg.append("text")
        .attr("x", 10).attr("y", 20)
        .attr("class", "chart-title")
        .text("Overview: All Students (drag to brush)");

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
        .domain(d3.extent(allData, d => d.age)).nice()
        .range([0, W]);
    const y = d3.scaleLinear()
        .domain([0.5, 4]).range([H, 0]);

    g.append("g")
        .attr("transform", `translate(0,${H})`)
        .call(d3.axisBottom(x));
    g.append("g").call(d3.axisLeft(y));

    g.append("text")
        .attr("x", W / 2).attr("y", H + 40)
        .attr("text-anchor", "middle").text("Age");
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -H / 2).attr("y", -40)
        .attr("text-anchor", "middle").text("CGPA (mid of range)");

    // Deterministic jitter so overlapping rows are visible.
    function jit(i, seed) {
        const r = Math.sin((i + 1) * 9301 + seed * 49297) * 233280;
        return (r - Math.floor(r) - 0.5) * 8;
    }
    scatterPos = (d, i) => ({
        cx: x(d.age) + jit(i, 1),
        cy: y(d.cgpaNum) + jit(i, 2),
    });

    scatterPts = g.selectAll("circle.pt")
        .data(allData).enter().append("circle")
        .attr("class", "pt")
        .attr("cx", (d, i) => scatterPos(d, i).cx)
        .attr("cy", (d, i) => scatterPos(d, i).cy)
        .attr("r", 5)
        .attr("fill", d => depColor(d.depression))
        .attr("opacity", 0.7)
        .attr("stroke", "white")
        .attr("stroke-width", 1);

    // Brush.
    brushObj = d3.brush()
        .extent([[0, 0], [W, H]])
        .on("brush end", brushed);

    g.append("g").attr("class", "brush").call(brushObj);

    function brushed() {
        const sel = d3.event.selection;

        if (!sel) {
            // brush cleared
            brushedIdx = null;
            scatterPts.transition().duration(250).attr("opacity", 0.7);
        } else {
            const [[x0, y0], [x1, y1]] = sel;
            brushedIdx = new Set();
            allData.forEach((d, i) => {
                const p = scatterPos(d, i);
                if (p.cx >= x0 && p.cx <= x1 && p.cy >= y0 && p.cy <= y1) {
                    brushedIdx.add(i);
                }
            });
            // fade unselected, animated
            scatterPts.transition().duration(250)
                .attr("opacity", (d, i) => brushedIdx.has(i) ? 0.9 : 0.15);
        }

        // Clear any heatmap cell selection so the two interactions don't conflict.
        if (clickedCell) {
            clickedCell = null;
            heatCells.transition().duration(300).attr("opacity", 1);
        }

        updateBar();
    }

    // Color legend (top right of scatter).
    const legend = svg.append("g")
        .attr("transform", `translate(${margin.left + W - 135}, 30)`);
    ["Yes", "No"].forEach((v, i) => {
        const row = legend.append("g").attr("transform", `translate(0, ${i * 18})`);
        row.append("rect").attr("width", 12).attr("height", 12).attr("fill", depColor(v));
        row.append("text")
            .attr("x", 18).attr("y", 11)
            .attr("font-size", "12px")
            .text("Depression: " + v);
    });
}


// =====================================================
// View 2: Bar chart (Detail / focus)
//   Shows share-with-condition for the current selection.
//   Bars + value labels animate with .transition().
// =====================================================
function drawBar() {
    const svgW = 500, svgH = 350;
    const margin = { top: 35, right: 20, bottom: 60, left: 55 };
    const W = svgW - margin.left - margin.right;
    barH = svgH - margin.top - margin.bottom;

    const svg = d3.select("#bar").append("svg")
        .attr("width", svgW).attr("height", svgH);

    svg.append("text")
        .attr("x", 10).attr("y", 20)
        .attr("class", "chart-title")
        .attr("id", "bar-title")
        .text("Detail: Conditions in All Students");

    barG = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const conditions = ["Depression", "Anxiety", "Panic Attack", "Treatment"];
    barX = d3.scaleBand().domain(conditions).range([0, W]).padding(0.3);
    barY = d3.scaleLinear().domain([0, 1]).range([barH, 0]);

    barG.append("g").attr("class", "x-axis")
        .attr("transform", `translate(0,${barH})`)
        .call(d3.axisBottom(barX));
    barG.append("g").attr("class", "y-axis")
        .call(d3.axisLeft(barY).tickFormat(d3.format(".0%")));

    barG.append("text")
        .attr("x", W / 2).attr("y", barH + 45)
        .attr("text-anchor", "middle").text("Condition");
    barG.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -barH / 2).attr("y", -40)
        .attr("text-anchor", "middle").text("Share answering Yes");

    updateBar();
}

function updateBar() {
    const subset = getSelected();
    const total = subset.length;
    const conditions = ["Depression", "Anxiety", "Panic Attack", "Treatment"];
    const keys = ["depression", "anxiety", "panic", "treatment"];

    const data = conditions.map((label, i) => {
        const yes = subset.filter(d => d[keys[i]] === "Yes").length;
        return { label, yes, pct: total > 0 ? yes / total : 0 };
    });

    // Title reflects current selection.
    let titleText;
    if (total === allData.length) {
        titleText = `Detail: Conditions in All Students (n = ${total})`;
    } else if (total === 0) {
        titleText = `Detail: No students in selection`;
    } else {
        titleText = `Detail: Conditions in Selection (n = ${total})`;
    }
    d3.select("#bar-title").text(titleText);

    // BARS
    const bars = barG.selectAll("rect.bar").data(data, d => d.label);

    // enter
    bars.enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => barX(d.label))
        .attr("width", barX.bandwidth())
        .attr("y", barH)
        .attr("height", 0)
        .attr("fill", "#4c78a8")
        // update + enter together
        .merge(bars)
        .transition().duration(600)
        .attr("x", d => barX(d.label))
        .attr("width", barX.bandwidth())
        .attr("y", d => barY(d.pct))
        .attr("height", d => barH - barY(d.pct));

    // LABELS on top of each bar
    const labels = barG.selectAll("text.bar-label").data(data, d => d.label);

    labels.enter().append("text")
        .attr("class", "bar-label")
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("x", d => barX(d.label) + barX.bandwidth() / 2)
        .attr("y", barH)
        .merge(labels)
        .text(d => total > 0 ? `${d.yes} (${(d.pct * 100).toFixed(0)}%)` : "—")
        .transition().duration(600)
        .attr("x", d => barX(d.label) + barX.bandwidth() / 2)
        .attr("y", d => barY(d.pct) - 5);
}


// =====================================================
// View 3: Heatmap (Advanced visualization)
//   Course x Year, color = depression rate, click to filter.
// =====================================================
function drawHeatmap() {
    const svgW = 1020, svgH = 350;
    const margin = { top: 35, right: 130, bottom: 50, left: 140 };
    const W = svgW - margin.left - margin.right;
    const H = svgH - margin.top - margin.bottom;

    const svg = d3.select("#heatmap").append("svg")
        .attr("width", svgW).attr("height", svgH);

    svg.append("text")
        .attr("x", 10).attr("y", 20)
        .attr("class", "chart-title")
        .text("Advanced: Depression Rate by Course × Year (click a cell to filter)");

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Build the unique course list, ordered by total count, "Other" last.
    const courseTotals = {};
    allData.forEach(d => {
        courseTotals[d.courseLabel] = (courseTotals[d.courseLabel] || 0) + 1;
    });
    const courses = Object.keys(courseTotals).sort((a, b) => {
        if (a === "Other") return 1;
        if (b === "Other") return -1;
        return courseTotals[b] - courseTotals[a];
    });

    // One row per (course, year)
    const cellData = [];
    courses.forEach(c => {
        yearOrder.forEach(y => {
            const sub = allData.filter(d => d.courseLabel === c && d.year === y);
            const total = sub.length;
            const yes = sub.filter(d => d.depression === "Yes").length;
            cellData.push({
                course: c, year: y, total, yes,
                rate: total > 0 ? yes / total : 0,
            });
        });
    });

    const xScale = d3.scaleBand().domain(yearOrder).range([0, W]).padding(0.05);
    const yScale = d3.scaleBand().domain(courses).range([0, H]).padding(0.05);
    const color = d3.scaleLinear()
        .domain([0, 0.5, 1])
        .range(["#f4f4f4", "#fdae61", "#d7191c"]);

    g.append("g").call(d3.axisLeft(yScale));
    g.append("g")
        .attr("transform", `translate(0,${H})`)
        .call(d3.axisBottom(xScale));

    g.append("text")
        .attr("x", W / 2).attr("y", H + 40)
        .attr("text-anchor", "middle").text("Year of Study");

    heatCells = g.selectAll("rect.heat-cell").data(cellData)
        .enter().append("rect")
        .attr("class", "heat-cell")
        .attr("x", d => xScale(d.year))
        .attr("y", d => yScale(d.course))
        .attr("width", xScale.bandwidth())
        .attr("height", yScale.bandwidth())
        .attr("fill", d => d.total === 0 ? "#fafafa" : color(d.rate))
        .attr("stroke", "white")
        .attr("stroke-width", 2)
        .on("click", function (d) {
            if (d.total === 0) return; // ignore empty cells

            // Toggle: clicking the same cell again clears it.
            if (clickedCell
                && clickedCell.course === d.course
                && clickedCell.year === d.year) {
                clickedCell = null;
            } else {
                clickedCell = { course: d.course, year: d.year };
            }

            // Fade non-selected cells.
            heatCells.transition().duration(300)
                .attr("opacity", c => {
                    if (!clickedCell) return 1;
                    return (c.course === clickedCell.course
                        && c.year === clickedCell.year) ? 1 : 0.3;
                });

            // Selecting a cell clears any active brush so the two
            // interactions don't fight each other.
            if (brushedIdx !== null) {
                brushedIdx = null;
                d3.select(".brush").call(brushObj.move, null);
                scatterPts.transition().duration(250).attr("opacity", 0.7);
            }

            updateBar();
        });

    // Cell text: "yes/total"
    g.selectAll("text.cell-text").data(cellData)
        .enter().append("text")
        .attr("class", "cell-text")
        .attr("x", d => xScale(d.year) + xScale.bandwidth() / 2)
        .attr("y", d => yScale(d.course) + yScale.bandwidth() / 2 + 4)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("pointer-events", "none")
        .attr("fill", d => d.rate > 0.5 ? "white" : "#333")
        .text(d => d.total === 0 ? "–" : `${d.yes}/${d.total}`);

    // Color legend on the right.
    const legendG = svg.append("g")
        .attr("transform", `translate(${margin.left + W + 20}, ${margin.top})`);
    legendG.append("text")
        .attr("y", -5).attr("font-size", "12px")
        .style("font-weight", "600")
        .text("Depression rate");

    const stops = [0, 0.25, 0.5, 0.75, 1.0];
    stops.forEach((s, i) => {
        legendG.append("rect")
            .attr("x", 0).attr("y", i * 28)
            .attr("width", 18).attr("height", 26)
            .attr("fill", color(s));
        legendG.append("text")
            .attr("x", 24).attr("y", i * 28 + 18)
            .attr("font-size", "11px")
            .text(d3.format(".0%")(s));
    });
}