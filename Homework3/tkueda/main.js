// Setup
// Capture the current browser window dimensions
const WIDTH  = window.innerWidth;
const HEIGHT = window.innerHeight;

// Split the screen vertically 
const TOP_H    = Math.floor(HEIGHT * 0.52);
const BOTTOM_H = HEIGHT - TOP_H;

// Split the top section horizontally.
const LEFT_W  = Math.floor(WIDTH * 0.42);
const RIGHT_W = WIDTH - LEFT_W;

const DURATION = 450; // shared transition duration across all views

// Root SVG
const svg = d3.select("svg")
              .attr("width",  WIDTH)
              .attr("height", HEIGHT)
              .style("display", "block");

// Shared colour scale
const EXP_LEVELS = ["EN", "MI", "SE", "EX"];
const EXP_LABELS = { EN: "Entry", MI: "Mid", SE: "Senior", EX: "Executive" };
const expColor   = d3.scaleOrdinal()
                     .domain(EXP_LEVELS)
                     .range(["#4e79a7", "#f28e2b", "#59a14f", "#e15759"]);

// Loading data
d3.csv("data/ds_salaries.csv").then(rawData => {

    rawData.forEach(d => {
        d.salary_in_usd = +d.salary_in_usd;
        d.work_year     = +d.work_year;
        d.remote_ratio  = +d.remote_ratio;
    });

    // Shared mutable state
    let brushedData    = rawData;   // updated by parallel-coord brush
    let selectedTitle  = null;      // updated by bar click

    // Draw all three charts; each returns an update function
    const updateBox  = drawBoxPlot(rawData);           // top-left
    const updateBars = drawBarChart(rawData, onBarClick); // bottom
    drawParallelCoords(rawData, onBrush);              // top-right

    // Called when the salary brush changes in parallel coordinates.
    function onBrush(salaryRange) {
        brushedData = salaryRange
            ? rawData.filter(d =>
                d.salary_in_usd >= salaryRange[0] &&
                d.salary_in_usd <= salaryRange[1])
            : rawData;

        // Reset bar selection whenever the brush changes
        selectedTitle = null;
        updateBars(brushedData, null);
        updateBox(brushedData, null);
    }


    // Called when a bar is clicked in the bar chart.
    function onBarClick(title) {
        selectedTitle = title;
        // Filter the already-brushed data further by title
        const subset = title
            ? brushedData.filter(d => d.job_title === title)
            : brushedData;
        updateBox(subset, title);
    }

}).catch(err => console.error("CSV load error:", err));



// BOX PLOT  (top-left)
function drawBoxPlot(initialData) {

    // Margins create space for labels and axes.
    const margin = { top: 50, right: 20, bottom: 60, left: 70 };
    const w = LEFT_W  - margin.left - margin.right;
    const h = TOP_H   - margin.top  - margin.bottom;

    // Create a chart group translated by the margins
    const g = svg.append("g")
                 .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // ── Static axes shells
    const yScale = d3.scaleLinear().range([h, 0]);
    const xScale = d3.scaleBand()
                     .domain(EXP_LEVELS)
                     .range([0, w])
                     .paddingInner(0.4)
                     .paddingOuter(0.3);

    // Draw x-axis once because categories never change
    const xAxisG = g.append("g")
                    .attr("transform", `translate(0, ${h})`)
                    .call(d3.axisBottom(xScale).tickFormat(d => EXP_LABELS[d]));
    xAxisG.selectAll("text").attr("font-size", "12px");

    const yAxisG = g.append("g");

    // Axis labels
    g.append("text")
     .attr("x", w / 2).attr("y", h + 48)
     .attr("text-anchor", "middle").attr("font-size", "13px")
     .text("Experience Level");

    g.append("text")
     .attr("x", -(h / 2)).attr("y", -55)
     .attr("text-anchor", "middle").attr("font-size", "13px")
     .attr("transform", "rotate(-90)")
     .text("Salary (USD)");

    // Chart title (dynamic — changes when a title is selected)
    const titleText = g.append("text")
     .attr("x", w / 2).attr("y", -20)
     .attr("text-anchor", "middle")
     .attr("font-size", "15px").attr("font-weight", "bold").attr("fill", "#333")
     .text("Salary Distribution by Experience Level");

    // Legend
    const legend = g.append("g").attr("transform", `translate(0, ${h + 30})`);
    EXP_LEVELS.forEach((lvl, i) => {
        legend.append("rect")
              .attr("x", 0).attr("y", i * 20)
              .attr("width", 13).attr("height", 13)
              .attr("fill", expColor(lvl));
        legend.append("text")
              .attr("x", 18).attr("y", i * 20 + 10)
              .attr("font-size", "11px")
              .text(EXP_LABELS[lvl]);
    });

    // Container group for all box shapes (so we can update them)
    const boxGroup = g.append("g").attr("class", "box-group");

    // Draw initial state
    renderBoxes(initialData, null);

    // Inner render function 
    function renderBoxes(data, titleLabel) {

        // Update chart title
        titleText.text(titleLabel
            ? `Salary Distribution — "${titleLabel}"`
            : "Salary Distribution by Experience Level");

        // Compute stats per experience level
        const boxStats = EXP_LEVELS.map(lvl => {
            const vals = data
                           .filter(d => d.experience_level === lvl)
                           .map(d => d.salary_in_usd)
                           .sort(d3.ascending);

            if (vals.length < 4) {
                return { lvl, q1: 0, med: 0, q3: 0, lo: 0, hi: 0, empty: true };
            }
            // Box plots require enough points to compute quartiles.
            const q1  = d3.quantile(vals, 0.25);
            const med = d3.quantile(vals, 0.50);
            const q3  = d3.quantile(vals, 0.75);
            const iqr = q3 - q1;
            const lo  = Math.max(d3.min(vals), q1 - 1.5 * iqr);
            const hi  = Math.min(d3.max(vals), q3 + 1.5 * iqr);
            return { lvl, q1, med, q3, lo, hi, empty: false };
        });

        // Rescale Y so axis updates first then marks animate
        const maxHi = d3.max(boxStats, d => d.hi) || 1;
        yScale.domain([0, maxHi * 1.1]).nice();

        //  animate Y axis rescale
        yAxisG.transition().duration(DURATION).ease(d3.easeCubicInOut)
              .call(d3.axisLeft(yScale)
                      .ticks(6)
                      .tickFormat(d => `$${(d / 1000).toFixed(0)}k`));

        // animate box shapes (delayed slightly after axis)
        const bw = xScale.bandwidth();

        // Use one <g> per experience level, keyed by lvl
        const levelGs = boxGroup.selectAll(".box-level")
                                .data(boxStats, d => d.lvl);

        // ENTER
        const levelGsEnter = levelGs.enter()
                                    .append("g")
                                    .attr("class", "box-level")
                                    .attr("opacity", 0);

        // Whisker line (vertical stem)
        levelGsEnter.append("line").attr("class", "whisker-line");
        // Low cap
        levelGsEnter.append("line").attr("class", "cap-lo");
        // High cap
        levelGsEnter.append("line").attr("class", "cap-hi");
        // IQR box
        levelGsEnter.append("rect").attr("class", "iqr-box");
        // Median line
        levelGsEnter.append("line").attr("class", "median-line");

        // MERGE enter + update
        const allGs = levelGsEnter.merge(levelGs);

        // Fade-in/out based on whether we have data 
        allGs.transition().duration(DURATION).ease(d3.easeCubicInOut)
             .attr("opacity", d => d.empty ? 0 : 1);

        // Animate each shape inside the group
        allGs.each(function(s) {
            const lg  = d3.select(this);
            const cx  = xScale(s.lvl);
            const col = expColor(s.lvl);
            const t   = d3.transition().duration(DURATION).ease(d3.easeCubicInOut);

            // Whisker line
            lg.select(".whisker-line")
              .transition(t)
              .attr("x1", cx + bw / 2).attr("x2", cx + bw / 2)
              .attr("y1", yScale(s.lo)).attr("y2", yScale(s.hi))
              .attr("stroke", col).attr("stroke-width", 1.5);

            lg.select(".cap-lo")
              .transition(t)
              .attr("x1", cx + bw * 0.25).attr("x2", cx + bw * 0.75)
              .attr("y1", yScale(s.lo)).attr("y2", yScale(s.lo))
              .attr("stroke", col).attr("stroke-width", 1.5);

            lg.select(".cap-hi")
              .transition(t)
              .attr("x1", cx + bw * 0.25).attr("x2", cx + bw * 0.75)
              .attr("y1", yScale(s.hi)).attr("y2", yScale(s.hi))
              .attr("stroke", col).attr("stroke-width", 1.5);

            // IQR line
            lg.select(".iqr-box")
              .transition(t)
              .attr("x", cx)
              .attr("y", yScale(s.q3))
              .attr("width", bw)
              .attr("height", Math.max(0, yScale(s.q1) - yScale(s.q3)))
              .attr("fill", col).attr("opacity", 0.45)
              .attr("stroke", col).attr("stroke-width", 1.5);

            // Box line
            lg.select(".median-line")
              .transition(t)
              .attr("x1", cx).attr("x2", cx + bw)
              .attr("y1", yScale(s.med)).attr("y2", yScale(s.med))
              .attr("stroke", col).attr("stroke-width", 3);
        });

        // EXIT 
        levelGs.exit().transition().duration(DURATION)
               .attr("opacity", 0).remove();
    }

    // Return the update function for external wiring
    return function updateBox(data, titleLabel) {
        renderBoxes(data, titleLabel);
    };
}


// BAR CHART  (bottom, full width)
function drawBarChart(initialData, onBarClick) {

    const margin = { top: 50, right: 30, bottom: 100, left: 80 };
    const w = WIDTH  - margin.left - margin.right;
    const h = BOTTOM_H - margin.top - margin.bottom;

    const g = svg.append("g")
                 .attr("transform", `translate(${margin.left}, ${TOP_H + margin.top})`);

    // Compute the fixed set of top-12 titles from the full dataset
    const titleCounts = d3.rollup(initialData, v => v.length, d => d.job_title);
    const top12Titles = [...titleCounts.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 12)
                    .map(d => d[0]);

    // Helper: derive barData from any subset, keeping top12 titles fixed
    function deriveBarData(data) {
        return top12Titles.map(title => {
            const rows = data.filter(d => d.job_title === title);
            return {
                title,
                avgSalary: rows.length > 0 ? d3.mean(rows, d => d.salary_in_usd) : 0
            };
        }).sort((a, b) => b.avgSalary - a.avgSalary);
    }

    const initialBarData = deriveBarData(initialData);

    // Scales
    const xScale = d3.scaleBand()
                     .domain(initialBarData.map(d => d.title))
                     .range([0, w])
                     .paddingInner(0.3)
                     .paddingOuter(0.2);

    const yScale = d3.scaleLinear()
                     .domain([0, d3.max(initialBarData, d => d.avgSalary) * 1.1])
                     .range([h, 0])
                     .nice();

    // Axes, static shells, updated on data change
    const xAxisG = g.append("g").attr("transform", `translate(0, ${h})`);
    xAxisG.call(d3.axisBottom(xScale))
          .selectAll("text")
              .attr("y", 10).attr("x", -5)
              .attr("text-anchor", "end")
              .attr("transform", "rotate(-35)")
              .attr("font-size", "11px");

    const yAxisG = g.append("g")
                    .call(d3.axisLeft(yScale)
                            .ticks(6)
                            .tickFormat(d => `$${(d / 1000).toFixed(0)}k`));

    // Axis labels
    g.append("text")
     .attr("x", w / 2).attr("y", h + 90)
     .attr("text-anchor", "middle").attr("font-size", "13px")
     .text("Job Title");

    g.append("text")
     .attr("x", -(h / 2)).attr("y", -60)
     .attr("text-anchor", "middle").attr("font-size", "13px")
     .attr("transform", "rotate(-90)")
     .text("Average Salary (USD)");

    // Chart title + hint
    g.append("text")
     .attr("x", w / 2).attr("y", -28)
     .attr("text-anchor", "middle")
     .attr("font-size", "15px").attr("font-weight", "bold").attr("fill", "#333")
     .text("Average Salary (USD) by Job Title — Top 12 Roles");

    g.append("text")
     .attr("x", w / 2).attr("y", -10)
     .attr("text-anchor", "middle")
     .attr("font-size", "11px").attr("fill", "#888")
     .text("Click a bar to drill into salary distribution by experience level");

    // Draw initial bars
    g.selectAll(".bar")
     .data(initialBarData, d => d.title)
     .enter().append("rect")
         .attr("class", "bar")
         .attr("x",      d => xScale(d.title))
         .attr("y",      d => yScale(d.avgSalary))
         .attr("width",  xScale.bandwidth())
         .attr("height", d => h - yScale(d.avgSalary))
         .attr("fill",   "#4e79a7")
         .attr("opacity", 0.85)
         .style("cursor", "pointer")
         .on("click", function(event, d) {
             // Toggle selection
             const alreadySelected = d3.select(this).classed("selected");
             onBarClick(alreadySelected ? null : d.title);
         });

    // Draw initial value labels
    g.selectAll(".bar-label")
     .data(initialBarData, d => d.title)
     .enter().append("text")
         .attr("class", "bar-label")
         .attr("x", d => xScale(d.title) + xScale.bandwidth() / 2)
         .attr("y", d => yScale(d.avgSalary) - 5)
         .attr("text-anchor", "middle").attr("font-size", "10px").attr("fill", "#333")
         .text(d => d.avgSalary > 0 ? `$${(d.avgSalary / 1000).toFixed(0)}k` : "");

    // Update function
    return function updateBars(data, selectedTitle) {

        const barData = deriveBarData(data);

        // Re-sort domain to match new data order
        const sortedTitles = barData.map(d => d.title);
        xScale.domain(sortedTitles);

        // Rescale Y
        const newMax = d3.max(barData, d => d.avgSalary) || 1;
        yScale.domain([0, newMax * 1.1]).nice();

        // Animate Y axis
        yAxisG.transition().duration(DURATION).ease(d3.easeCubicInOut)
              .call(d3.axisLeft(yScale)
                      .ticks(6)
                      .tickFormat(d => `$${(d / 1000).toFixed(0)}k`));

        // Animate X axis labels
        xAxisG.transition().duration(DURATION).ease(d3.easeCubicInOut)
              .call(d3.axisBottom(xScale));
        xAxisG.selectAll("text")
              .attr("y", 10).attr("x", -5)
              .attr("text-anchor", "end")
              .attr("transform", "rotate(-35)")
              .attr("font-size", "11px");

        // Animate bars 
        g.selectAll(".bar")
         .data(barData, d => d.title)
         .join(
             enter => enter.append("rect")
                           .attr("class", "bar")
                           .attr("x",      d => xScale(d.title))
                           .attr("y",      h)
                           .attr("width",  xScale.bandwidth())
                           .attr("height", 0)
                           .attr("fill",   "#4e79a7")
                           .style("cursor", "pointer")
                           .on("click", function(event, d) {
                               const alreadySelected = d3.select(this).classed("selected");
                               onBarClick(alreadySelected ? null : d.title);
                           }),
             update => update,
             exit   => exit.transition().duration(DURATION).ease(d3.easeCubicInOut)
                           .attr("y", h).attr("height", 0).attr("opacity", 0)
                           .remove()
         )
         .classed("selected", d => d.title === selectedTitle)
         .transition().duration(DURATION).ease(d3.easeCubicInOut)
         .attr("x",      d => xScale(d.title))
         .attr("y",      d => yScale(d.avgSalary))
         .attr("width",  xScale.bandwidth())
         .attr("height", d => Math.max(0, h - yScale(d.avgSalary)))
         // Selected bar gets a highlighted stroke; others get standard fill
         .attr("fill",    d => d.title === selectedTitle ? "#e07b00" : "#4e79a7")
         .attr("opacity", d => {
             if (!selectedTitle) return 0.85;
             return d.title === selectedTitle ? 1.0 : 0.35;
         })
         .attr("stroke",       d => d.title === selectedTitle ? "#a05000" : "none")
         .attr("stroke-width", d => d.title === selectedTitle ? 2 : 0);

        // Animate value labels
        g.selectAll(".bar-label")
         .data(barData, d => d.title)
         .join(
             enter => enter.append("text")
                           .attr("class", "bar-label")
                           .attr("text-anchor", "middle")
                           .attr("font-size", "10px")
                           .attr("fill", "#333")
                           .attr("opacity", 0),
             update => update,
             exit   => exit.transition().duration(DURATION)
                           .attr("opacity", 0).remove()
         )
         .transition().duration(DURATION).ease(d3.easeCubicInOut)
         .attr("x", d => xScale(d.title) + xScale.bandwidth() / 2)
         .attr("y", d => yScale(d.avgSalary) - 5)
         .attr("opacity", 1)
         .text(d => d.avgSalary > 0 ? `$${(d.avgSalary / 1000).toFixed(0)}k` : "");
    };
}


// PARALLEL COORDINATES  (top-right)
function drawParallelCoords(data, onBrush) {

    const margin = { top: 50, right: 40, bottom: 60, left: 40 };
    const w = RIGHT_W - margin.left - margin.right;
    const h = TOP_H   - margin.top  - margin.bottom;

    const g = svg.append("g")
                 .attr("transform", `translate(${LEFT_W + margin.left}, ${margin.top})`);

    const pcData = data
                     .filter(d => EXP_LEVELS.includes(d.experience_level))
                     .slice(0, 600);

    // Salary scale stored separately so brush can invert it
    const salaryScale = d3.scaleLinear()
                          .domain([0, d3.max(pcData, d => d.salary_in_usd)])
                          .range([h, 0]).nice();

    const axes = [
        {
            key:    "experience_level",
            label:  "Experience",
            scale:  d3.scalePoint()
                      .domain(EXP_LEVELS)
                      .range([h, 0]).padding(0.3),
            format: d => EXP_LABELS[d]
        },
        {
            key:    "remote_ratio",
            label:  "Remote %",
            scale:  d3.scalePoint()
                      .domain(["0", "50", "100"])
                      .range([h, 0]).padding(0.3),
            format: d => d + "%"
        },
        {
            key:    "company_size",
            label:  "Company Size",
            scale:  d3.scalePoint()
                      .domain(["S", "M", "L"])
                      .range([h, 0]).padding(0.3),
            format: d => d
        },
        {
            key:    "salary_in_usd",
            label:  "Salary (USD)",
            scale:  salaryScale,
            format: d => `$${(d / 1000).toFixed(0)}k`
        },
    ];

    // Scaling needed
    const xScale = d3.scalePoint()
                     .domain(axes.map(a => a.key))
                     .range([0, w])
                     .padding(0.1);

    function yPos(axis, d) {
        const val = axis.key === "remote_ratio" ? String(d[axis.key]) : d[axis.key];
        return axis.scale(val);
    }

    function rowPath(d) {
        return d3.line()(axes.map(a => [xScale(a.key), yPos(a, d)]));
    }

    // Draw lines
    const lines = g.selectAll(".pc-line")
                   .data(pcData)
                   .enter().append("path")
                       .attr("class", "pc-line")
                       .attr("d", rowPath)
                       .attr("fill", "none")
                       .attr("stroke", d => expColor(d.experience_level))
                       .attr("stroke-width", 1)
                       .attr("opacity", 0.25);

    // Draw one vertical axis per dimension
    axes.forEach(axis => {
        const axisG = g.append("g")
                       .attr("transform", `translate(${xScale(axis.key)}, 0)`);

        axisG.call(
            d3.axisLeft(axis.scale)
              .ticks(5)
              .tickFormat(axis.format)
        );

        axisG.append("text")
             .attr("y", -14)
             .attr("text-anchor", "middle")
             .attr("fill", "#333")
             .attr("font-size", "12px").attr("font-weight", "bold")
             .text(axis.label);

        // Attach brush only to the Salary axis
        if (axis.key === "salary_in_usd") {
            const brush = d3.brushY()
                            .extent([[-18, 0], [18, h]])
                            .on("brush end", brushed);

            const brushG = axisG.append("g")
                                .attr("class", "brush")
                                .call(brush);

            // Style the brush selection rectangle
            brushG.select(".selection")
                  .attr("fill", "#aaa")
                  .attr("fill-opacity", 0.25)
                  .attr("stroke", "#555");

            // Hint text below the salary axis label
            axisG.append("text")
                 .attr("y", -2)
                 .attr("text-anchor", "middle")
                 .attr("fill", "#888")
                 .attr("font-size", "9px")
                 .text("drag to filter");

            function brushed(event) {
                if (!event.selection) {
                    // Brush cleared reset all lines with FILTERING fade
                    lines.transition().duration(DURATION).ease(d3.easeCubicInOut)
                         .attr("opacity", 0.25)
                         .attr("stroke-width", 1);
                    onBrush(null);
                    return;
                }

                const [y0, y1] = event.selection;
                // Invert pixel positions to salary values
                const salLo = salaryScale.invert(y1); 
                const salHi = salaryScale.invert(y0);

                // FILTERING transition
                lines.transition().duration(DURATION).ease(d3.easeCubicInOut)
                     .attr("opacity", d =>
                         d.salary_in_usd >= salLo && d.salary_in_usd <= salHi
                             ? 0.75 : 0.04)
                     .attr("stroke-width", d =>
                         d.salary_in_usd >= salLo && d.salary_in_usd <= salHi
                             ? 1.5 : 0.5);

                onBrush([salLo, salHi]);
            }
        }
    });

    // Title
    g.append("text")
     .attr("x", w / 2).attr("y", -28)
     .attr("text-anchor", "middle")
     .attr("font-size", "15px").attr("font-weight", "bold").attr("fill", "#333")
     .text("Experience → Remote % → Company Size → Salary");

    // Hint text — placed below the chart area, left-aligned
    g.append("text")
     .attr("x", 0).attr("y", h + 20)
     .attr("text-anchor", "start")
     .attr("font-size", "11px").attr("fill", "#888")
     .text("Above: Drag on the Salary axis to filter all charts by salary range");

    // Legend
    const legend = g.append("g")
                    .attr("transform", `translate(${w - 160}, ${h + 20})`);

    legend.append("text")
          .attr("x", 0).attr("y", -8)
          .attr("font-size", "11px").attr("font-weight", "bold")
          .text("Experience Level");

    EXP_LEVELS.forEach((lvl, i) => {
        legend.append("line")
              .attr("x1", 0).attr("x2", 18)
              .attr("y1", i * 18 + 2).attr("y2", i * 18 + 2)
              .attr("stroke", expColor(lvl)).attr("stroke-width", 2.5);
        legend.append("text")
              .attr("x", 24).attr("y", i * 18 + 6)
              .attr("font-size", "11px")
              .text(EXP_LABELS[lvl]);
    });
}