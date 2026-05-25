const WIDTH  = window.innerWidth;
const HEIGHT = window.innerHeight;
 

const TOP_H    = Math.floor(HEIGHT * 0.52);
const BOTTOM_H = HEIGHT - TOP_H;
 
// Left/right split for the top row
const LEFT_W  = Math.floor(WIDTH * 0.42);
const RIGHT_W = WIDTH - LEFT_W;
 
// Root SVG
const svg = d3.select("svg")
              .attr("width",  WIDTH)
              .attr("height", HEIGHT)
              .style("display", "block");
 
// Shared colour scale used by all three charts
const EXP_LEVELS = ["EN", "MI", "SE", "EX"];
const EXP_LABELS = { EN: "Entry", MI: "Mid", SE: "Senior", EX: "Executive" };
const expColor   = d3.scaleOrdinal()
                     .domain(EXP_LEVELS)
                     .range(["#4e79a7", "#f28e2b", "#59a14f", "#e15759"]);


// get data
d3.csv("data/ds_salaries.csv").then(rawData => {
 
    // Convert numeric strings to numbers (mirrors template forEach block)
    rawData.forEach(d => {
        d.salary_in_usd = +d.salary_in_usd;
        d.work_year     = +d.work_year;
        d.remote_ratio  = +d.remote_ratio;
    });
 
    drawBoxPlot(rawData);         // top-left
    drawParallelCoords(rawData);  // top-right
    drawBarChart(rawData);        // bottom, full width
 
}).catch(err => console.error("CSV load error:", err));

// Bar Chart
// Average salary by job title
function drawBarChart(data) {
 
    const margin = { top: 50, right: 30, bottom: 100, left: 80 };
    const w = WIDTH  - margin.left - margin.right;
    const h = BOTTOM_H - margin.top - margin.bottom;
 
    // Append group, offset to the bottom row
    const g = svg.append("g")
                 .attr("transform", `translate(${margin.left}, ${TOP_H + margin.top})`);
 
    //Derive: top 12 titles by count, sorted by avg salary
    const titleCounts = d3.rollup(data, v => v.length, d => d.job_title);
    const top12 = [...titleCounts.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 12)
                    .map(d => d[0]);
 
    const barData = top12.map(title => {
        const rows = data.filter(d => d.job_title === title);
        return { title, avgSalary: d3.mean(rows, d => d.salary_in_usd) };
    }).sort((a, b) => b.avgSalary - a.avgSalary);
 
    // X: job title bands (same scaleBand pattern as template)
    const xScale = d3.scaleBand()
                     .domain(barData.map(d => d.title))
                     .range([0, w])
                     .paddingInner(0.3)
                     .paddingOuter(0.2);
 
    // Y: salary (same scaleLinear pattern as template)
    const yScale = d3.scaleLinear()
                     .domain([0, d3.max(barData, d => d.avgSalary) * 1.1])
                     .range([h, 0])
                     .nice();
 
    // Axes
    g.append("g")
     .attr("transform", `translate(0, ${h})`)
     .call(d3.axisBottom(xScale))
     .selectAll("text")
         .attr("y", 10).attr("x", -5)
         .attr("text-anchor", "end")
         .attr("transform", "rotate(-35)")
         .attr("font-size", "11px");
 
    g.append("g")
     .call(d3.axisLeft(yScale)
             .ticks(6)
             .tickFormat(d => `$${(d / 1000).toFixed(0)}k`));
 
    //Axis labels
    g.append("text")                      
     .attr("x", w / 2).attr("y", h + 90)
     .attr("text-anchor", "middle").attr("font-size", "13px")
     .text("Job Title");
 
    g.append("text")                   
     .attr("x", -(h / 2)).attr("y", -60)
     .attr("text-anchor", "middle").attr("font-size", "13px")
     .attr("transform", "rotate(-90)")
     .text("Average Salary (USD)");
 
    //Chart title
    g.append("text")
     .attr("x", w / 2).attr("y", -20)
     .attr("text-anchor", "middle")
     .attr("font-size", "15px").attr("font-weight", "bold").attr("fill", "#333")
     .text("Average Salary (USD) by Job Title — Top 12 Roles");
 
    
    g.selectAll("rect")
     .data(barData)
     .enter().append("rect")
         .attr("x",      d => xScale(d.title))
         .attr("y",      d => yScale(d.avgSalary))
         .attr("width",  xScale.bandwidth())
         .attr("height", d => h - yScale(d.avgSalary))
         .attr("fill",   "#4e79a7")
         .attr("opacity", 0.85);
 
    //Value labels
    g.selectAll(".bar-label")
     .data(barData)
     .enter().append("text")
         .attr("class", "bar-label")
         .attr("x", d => xScale(d.title) + xScale.bandwidth() / 2)
         .attr("y", d => yScale(d.avgSalary) - 5)
         .attr("text-anchor", "middle").attr("font-size", "10px").attr("fill", "#333")
         .text(d => `$${(d.avgSalary / 1000).toFixed(0)}k`);
}


// Boxplot
// Salary per experience level
function drawBoxPlot(data) {
 
    const margin = { top: 50, right: 20, bottom: 60, left: 70 };
    const w = LEFT_W  - margin.left - margin.right;
    const h = TOP_H   - margin.top  - margin.bottom;
 
    // Append group, offset to the top-left region
    const g = svg.append("g")
                 .attr("transform", `translate(${margin.left}, ${margin.top})`);
 
    // ── Derive: quartile stats per experience level ──
    const boxStats = EXP_LEVELS.map(lvl => {
        const vals = data
                       .filter(d => d.experience_level === lvl)
                       .map(d => d.salary_in_usd)
                       .sort(d3.ascending);
        const q1  = d3.quantile(vals, 0.25);
        const med = d3.quantile(vals, 0.50);
        const q3  = d3.quantile(vals, 0.75);
        const iqr = q3 - q1;
        const lo  = Math.max(d3.min(vals), q1 - 1.5 * iqr);
        const hi  = Math.min(d3.max(vals), q3 + 1.5 * iqr);
        return { lvl, q1, med, q3, lo, hi };
    });
 
    // Scales
    const xScale = d3.scaleBand()
                     .domain(EXP_LEVELS)
                     .range([0, w])
                     .paddingInner(0.4)
                     .paddingOuter(0.3);
 
    const yScale = d3.scaleLinear()
                     .domain([0, d3.max(boxStats, d => d.hi) * 1.1])
                     .range([h, 0])
                     .nice();
 
    // Axes
    g.append("g")
     .attr("transform", `translate(0, ${h})`)
     .call(d3.axisBottom(xScale).tickFormat(d => EXP_LABELS[d]))
     .selectAll("text").attr("font-size", "12px");
 
    g.append("g")
     .call(d3.axisLeft(yScale)
             .ticks(6)
             .tickFormat(d => `$${(d / 1000).toFixed(0)}k`));
 
    // Axis Labels
    g.append("text")
     .attr("x", w / 2).attr("y", h + 48)
     .attr("text-anchor", "middle").attr("font-size", "13px")
     .text("Experience Level");
 
    g.append("text")
     .attr("x", -(h / 2)).attr("y", -55)
     .attr("text-anchor", "middle").attr("font-size", "13px")
     .attr("transform", "rotate(-90)")
     .text("Salary (USD)");
 
    // Chart Title
    g.append("text")
     .attr("x", w / 2).attr("y", -20)
     .attr("text-anchor", "middle")
     .attr("font-size", "15px").attr("font-weight", "bold").attr("fill", "#333")
     .text("Salary Distribution by Experience Level");
 
    // Box plot shapes
    const bw = xScale.bandwidth();
 
    boxStats.forEach(s => {
        const cx  = xScale(s.lvl);
        const col = expColor(s.lvl);
 
        
        g.append("line")
         .attr("x1", cx + bw / 2).attr("x2", cx + bw / 2)
         .attr("y1", yScale(s.lo)).attr("y2", yScale(s.hi))
         .attr("stroke", col).attr("stroke-width", 1.5);
 
        
        [s.lo, s.hi].forEach(v => {
            g.append("line")
             .attr("x1", cx + bw * 0.25).attr("x2", cx + bw * 0.75)
             .attr("y1", yScale(v)).attr("y2", yScale(v))
             .attr("stroke", col).attr("stroke-width", 1.5);
        });
 
        // IQR 
        g.append("rect")
         .attr("x", cx).attr("y", yScale(s.q3))
         .attr("width", bw).attr("height", yScale(s.q1) - yScale(s.q3))
         .attr("fill", col).attr("opacity", 0.45)
         .attr("stroke", col).attr("stroke-width", 1.5);
 
        // Median line
        g.append("line")
         .attr("x1", cx).attr("x2", cx + bw)
         .attr("y1", yScale(s.med)).attr("y2", yScale(s.med))
         .attr("stroke", col).attr("stroke-width", 3);
    });
 
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
}


// Parallel Coordinates
// Experience Level -> Remote -> Company Size -> Salary

function drawParallelCoords(data) {
 
    const margin = { top: 50, right: 40, bottom: 60, left: 40 };
    const w = RIGHT_W - margin.left - margin.right;
    const h = TOP_H   - margin.top  - margin.bottom;
 
    // Append group, offset to the top-right region
    const g = svg.append("g")
                 .attr("transform", `translate(${LEFT_W + margin.left}, ${margin.top})`);
 
    
    const pcData = data
                     .filter(d => EXP_LEVELS.includes(d.experience_level))
                     .slice(0, 600);
 
    // Axes
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
            scale:  d3.scaleLinear()
                      .domain([0, d3.max(pcData, d => d.salary_in_usd)])
                      .range([h, 0]).nice(),
            format: d => `$${(d / 1000).toFixed(0)}k`
        },
    ];
 
    // X position for each axis
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
 
    // Lines
    g.selectAll(".pc-line")
     .data(pcData)
     .enter().append("path")
         .attr("class", "pc-line")
         .attr("d", rowPath)
         .attr("fill", "none")
         .attr("stroke", d => expColor(d.experience_level))
         .attr("stroke-width", 1)
         .attr("opacity", 0.25);
 
    // One vertical axis per dimension
    axes.forEach(axis => {
        const axisG = g.append("g")
                       .attr("transform", `translate(${xScale(axis.key)}, 0)`);
 
        axisG.call(
            d3.axisLeft(axis.scale)
              .ticks(5)
              .tickFormat(axis.format)
        );
 
        // Axis label above the axis line
        axisG.append("text")
             .attr("y", -14)
             .attr("text-anchor", "middle")
             .attr("fill", "#333")
             .attr("font-size", "12px").attr("font-weight", "bold")
             .text(axis.label);
    });
 
    // Title
    g.append("text")
     .attr("x", w / 2).attr("y", -28)
     .attr("text-anchor", "middle")
     .attr("font-size", "15px").attr("font-weight", "bold").attr("fill", "#333")
     .text("Experience -> Remote % -> Company Size -> Salary");
 
    // ── Legend ──
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

