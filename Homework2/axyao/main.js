/**
 * This dashboard explores mental health conditions (depression,
 * anxiety, and panic attacks) in terms of academic year, CGPA,
 * gender, and treatment-seeking behavior.
 *
 * View 1 (top-left): Grouped bar chart that displays an overview
 *                    of mental health condition prevalence by
 *                    year of study
 * View 2 (top-right): Parallel Coordinates Plot that displays
 *                     per-student multidimensional focus view
 * View 3 (bottom): Heatmap that shows the percentage of students
 *                  with each condition per CGPA range
 */

const svg = d3.select("svg");
const W = window.innerWidth;
const H = window.innerHeight;

// Assign a color to each condition to be consistently used across
// the dashboard
const conditionColors = {
  Depression: "#e05c5c",
  Anxiety: "#f0a500",
  "Panic attack": "#4a90d9",
};

// Define a range of colors for CGPA, which is used for the heatmap
const cgpaColors = d3
  .scaleOrdinal()
  .domain([
    "0 - 1.99",
    "2.00 - 2.49",
    "2.50 - 2.99",
    "3.00 - 3.49",
    "3.50 - 4.00",
  ])
  .range(["#c6dbef", "#9ecae1", "#6baed6", "#3182bd", "#08519c"]);

// Load the data and call the functions that draw the visualizations
d3.csv("data/student_mental_health.csv").then((rawData) => {
  rawData.forEach((d) => {
    // Capitalize all years
    d.year = d["Your current year of Study"]
      .trim()
      .toLowerCase()
      .replace(/^year /, "Year ");

    // Get rid of trailing spaces
    d.cgpa = d["What is your CGPA?"].trim();

    // Boolean flags for different variables
    d.depression = d["Do you have Depression?"] === "Yes" ? 1 : 0;
    d.anxiety = d["Do you have Anxiety?"] === "Yes" ? 1 : 0;
    d.panic = d["Do you have Panic attack?"] === "Yes" ? 1 : 0;
    d.treatment =
      d["Did you seek any specialist for a treatment?"] === "Yes" ? 1 : 0;
    d.gender = d["Choose your gender"];
    d.age = +d["Age"];
  });

  const years = ["Year 1", "Year 2", "Year 3", "Year 4"];
  const conditions = ["Depression", "Anxiety", "Panic attack"];

  // Map raw flag names to display labels
  const conditionKey = {
    Depression: "depression",
    Anxiety: "anxiety",
    "Panic attack": "panic",
  };

  // yearData is an array of {year, Depression, Anxiety, "Panic attack"} and
  // is used to draw the grouped bar chart
  const yearData = years.map((yr) => {
    const group = rawData.filter((d) => d.year === yr);
    const obj = { year: yr, total: group.length };
    conditions.forEach((c) => {
      obj[c] = group.filter((d) => d[conditionKey[c]] === 1).length;
    });

    return obj;
  });

  // CGPA order for heatmap
  const cgpaOrder = [
    "0 - 1.99",
    "2.00 - 2.49",
    "2.50 - 2.99",
    "3.00 - 3.49",
    "3.50 - 4.00",
  ];

  // Calculate the data for the heatmap, which is the percentage of students
  // with each condition per CGPA range
  const heatData = cgpaOrder.map((range) => {
    const group = rawData.filter((d) => d.cgpa === range);
    const n = group.length;
    const pct = (key) =>
      n > 0
        ? Math.round((group.filter((d) => d[key] === 1).length / n) * 100)
        : 0;

    return {
      cgpa: range,
      depression_pct: pct("depression"),
      anxiety_pct: pct("anxiety"),
      panic_pct: pct("panic"),
      treatment_pct: pct("treatment"),
      total: n,
    };
  });

  const pcData = rawData;

  // Call the functions that draw the visualizations
  drawGroupedBar(yearData);
  drawParallelCoords(pcData);
  drawHeatmap(heatData);
});

// Grouped bar chart
function drawGroupedBar(yearData) {
  const margin = { top: 50, right: 30, bottom: 60, left: 55 };
  const pw = W * 0.45 - margin.left - margin.right;
  const ph = H * 0.48 - margin.top - margin.bottom;

  // Append group, offset to top-left panel position
  const g = svg
    .append("g")
    .attr("id", "view1")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  const conditions = ["Depression", "Anxiety", "Panic attack"];
  const years = yearData.map((d) => d.year);

  // Year bands
  const x0 = d3
    .scaleBand()
    .domain(years)
    .range([0, pw])
    .paddingInner(0.25)
    .paddingOuter(0.15);

  // Condition sub-bands within each year
  const x1 = d3
    .scaleBand()
    .domain(conditions)
    .range([0, x0.bandwidth()])
    .padding(0.08);

  // Y = count
  const maxCount = d3.max(yearData, (d) => d3.max(conditions, (c) => d[c]));
  const y = d3
    .scaleLinear()
    .domain([0, maxCount + 2])
    .range([ph, 0])
    .nice();

  // X axis
  g.append("g")
    .attr("transform", `translate(0, ${ph})`)
    .call(d3.axisBottom(x0))
    .selectAll("text");

  // Y axis
  g.append("g").call(d3.axisLeft(y).ticks(6));

  // Axis labels
  g.append("text")
    .attr("x", pw / 2)
    .attr("y", ph + 48)
    .attr("text-anchor", "middle")
    .text("Year of Study");

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -(ph / 2))
    .attr("y", -42)
    .attr("text-anchor", "middle")
    .text("Number of Students");

  // Chart title
  g.append("text")
    .attr("x", pw / 2)
    .attr("y", -25)
    .attr("text-anchor", "middle")
    .attr("font-weight", "bold")
    .text("Mental Health Conditions by Year of Study");

  // Grouped bars: one group per year, three bars per group
  // (one for each condition)
  const yearGroups = g
    .selectAll(".year-group")
    .data(yearData)
    .enter()
    .append("g")
    .attr("class", "year-group")
    .attr("transform", (d) => `translate(${x0(d.year)}, 0)`);

  yearGroups
    .selectAll("rect")
    .data((d) => conditions.map((c) => ({ condition: c, value: d[c] })))
    .enter()
    .append("rect")
    .attr("x", (d) => x1(d.condition))
    .attr("y", (d) => y(d.value))
    .attr("width", x1.bandwidth())
    .attr("height", (d) => ph - y(d.value))
    .attr("fill", (d) => conditionColors[d.condition]);

  // Value labels on top of each bar
  yearGroups
    .selectAll(".bar-label")
    .data((d) => conditions.map((c) => ({ condition: c, value: d[c] })))
    .enter()
    .append("text")
    .attr("class", "bar-label")
    .attr("x", (d) => x1(d.condition) + x1.bandwidth() / 2)
    .attr("y", (d) => y(d.value) - 3)
    .attr("text-anchor", "middle")
    .text((d) => (d.value > 0 ? d.value : ""));

  const legend = g.append("g").attr("transform", `translate(${pw - 140}, 0)`);

  conditions.forEach((c, i) => {
    // Colored square
    legend
      .append("rect")
      .attr("x", 0)
      .attr("y", i * 20)
      .attr("width", 13)
      .attr("height", 13)
      .attr("fill", conditionColors[c]);
    // Label
    legend
      .append("text")
      .attr("x", 18)
      .attr("y", i * 20 + 11)
      .text(c);
  });
}

// Parallel coordinates plot
function drawParallelCoords(data) {
  const margin = { top: 50, right: 40, bottom: 60, left: 20 };
  const pw = W * 0.5 - margin.left - margin.right;
  const ph = H * 0.48 - margin.top - margin.bottom;

  // Offset to top-right panel
  const offsetX = W * 0.47 + margin.left;
  const offsetY = margin.top;

  const g = svg
    .append("g")
    .attr("id", "view2")
    .attr("transform", `translate(${offsetX}, ${offsetY})`);

  // Axes definitions
  const axes = [
    { key: "gender", label: "Gender", values: ["Female", "Male"] },
    {
      key: "year",
      label: "Year",
      values: ["Year 1", "Year 2", "Year 3", "Year 4"],
    },
    {
      key: "cgpa",
      label: "CGPA",
      values: [
        "0 - 1.99",
        "2.00 - 2.49",
        "2.50 - 2.99",
        "3.00 - 3.49",
        "3.50 - 4.00",
      ],
    },
    { key: "depression", label: "Depression", values: [0, 1] },
    { key: "anxiety", label: "Anxiety", values: [0, 1] },
    { key: "panic", label: "Panic Attack", values: [0, 1] },
    { key: "treatment", label: "Treatment", values: [0, 1] },
  ];

  // Build a point scale for each axis
  axes.forEach((ax) => {
    ax.scale = d3.scalePoint().domain(ax.values).range([ph, 0]).padding(0.2);
  });

  // X position of each axis
  const xScale = d3
    .scalePoint()
    .domain(axes.map((a) => a.key))
    .range([0, pw])
    .padding(0.1);

  // Returns SVG path string for one student across all
  // axes (a line in the parallel coordinates plot)
  function linePath(d) {
    return d3.line()(
      axes
        .filter(
          (ax) =>
            d[ax.key] !== undefined && d[ax.key] !== null && d[ax.key] !== ""
        )
        .map((ax) => [xScale(ax.key), ax.scale(d[ax.key])])
    );
  }

  // Color the lines based on whether the student has any condition
  function lineColor(d) {
    const count = d.depression + d.anxiety + d.panic;
    if (count === 0) return "#aaaaaa";
    if (count === 1) return "#f0a500";
    if (count === 2) return "#e05c5c";

    // If a student has all 3 conditions
    return "#7b2d8b";
  }

  // Draw student lines
  g.append("g")
    .attr("class", "lines")
    .selectAll("path")
    .data(data)
    .enter()
    .append("path")
    .attr("d", linePath)
    .attr("fill", "none")
    .attr("stroke", lineColor)
    .attr("stroke-width", 2.5)
    .attr("stroke-opacity", 0.55);

  // Draw each vertical axis
  axes.forEach((ax) => {
    const axG = g
      .append("g")
      .attr("class", "axis")
      .attr("transform", `translate(${xScale(ax.key)}, 0)`);

    // Axis line
    axG
      .append("line")
      .attr("y1", 0)
      .attr("y2", ph)
      .attr("stroke", "#666")
      .attr("stroke-width", 1.5);

    // Tick marks and labels
    ax.scale.domain().forEach((val) => {
      axG
        .append("text")
        .attr("x", 6)
        .attr("y", ax.scale(val))
        .attr("dy", "0.35em")
        .text(val === 0 ? "No" : val === 1 ? "Yes" : val);

      // Tick line
      axG
        .append("line")
        .attr("x1", -3)
        .attr("x2", 3)
        .attr("y1", ax.scale(val))
        .attr("y2", ax.scale(val))
        .attr("stroke", "#666");
    });

    // Axis label (below chart area)
    axG
      .append("text")
      .attr("y", ph + 18)
      .attr("text-anchor", "middle")
      .attr("font-weight", "bold")
      .text(ax.label);
  });

  // Chart title
  g.append("text")
    .attr("x", pw / 2)
    .attr("y", -25)
    .attr("text-anchor", "middle")
    .attr("font-weight", "bold")
    .text("Student Profiles");

  // Legend for line colors
  const legendData = [
    { label: "No conditions", color: "#aaaaaa" },
    { label: "1 condition", color: "#f0a500" },
    { label: "2 conditions", color: "#e05c5c" },
    { label: "3 conditions", color: "#7b2d8b" },
  ];

  const leg = g.append("g").attr("transform", `translate(${pw - 105}, ${-40})`);

  legendData.forEach((item, i) => {
    // Colored line segment
    leg
      .append("line")
      .attr("x1", 0)
      .attr("x2", 18)
      .attr("y1", i * 17 + 6)
      .attr("y2", i * 17 + 6)
      .attr("stroke", item.color)
      .attr("stroke-width", 2.5);
    // Label
    leg
      .append("text")
      .attr("x", 22)
      .attr("y", i * 17 + 10)
      .attr("font-size", "12px")
      .text(item.label);
  });
}

// 2D Heatmap
function drawHeatmap(heatData) {
  const margin = { top: 55, right: 200, bottom: 65, left: 105 };
  const pw = W - margin.left - margin.right;
  const ph = H * 0.45 - margin.top - margin.bottom;

  // Offset to bottom panel
  const offsetY = H * 0.52 + margin.top;

  const g = svg
    .append("g")
    .attr("id", "view3")
    .attr("transform", `translate(${margin.left}, ${offsetY})`);

  const cgpaOrder = [
    "0 - 1.99",
    "2.00 - 2.49",
    "2.50 - 2.99",
    "3.00 - 3.49",
    "3.50 - 4.00",
  ];

  // Display labels for each condition row
  const condLabels = [
    "Depression",
    "Anxiety",
    "Panic Attack",
    "Sought Treatment",
  ];

  const condKeys = ["depression", "anxiety", "panic", "treatment"];

  // X: CGPA bands
  const x = d3.scaleBand().domain(cgpaOrder).range([0, pw]).padding(0.05);

  // Y: condition rows
  const y = d3.scaleBand().domain(condLabels).range([0, ph]).padding(0.05);

  // Map percentages to a blue gradient using a specific interpolator
  const colorScale = d3
    .scaleSequential()
    .domain([0, 100])
    .interpolator(d3.interpolateBlues);

  // X axis (CGPA ranges along bottom)
  g.append("g")
    .attr("transform", `translate(0, ${ph})`)
    .call(d3.axisBottom(x))
    .selectAll("text");

  // Y axis (condition labels along left)
  g.append("g").call(d3.axisLeft(y)).selectAll("text");

  // Axis labels
  g.append("text")
    .attr("x", pw / 2)
    .attr("y", ph + 50)
    .attr("text-anchor", "middle")
    .text("CGPA Range");

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -(ph / 2))
    .attr("y", -90)
    .attr("text-anchor", "middle")
    .text("Condition");

  // Chart title
  g.append("text")
    .attr("x", pw / 2)
    .attr("y", -30)
    .attr("text-anchor", "middle")
    .attr("font-size", "15px")
    .attr("font-weight", "bold")
    .text("Condition Prevalence (%) by Cumulative GPA (CGPA) Range");

  // Flatten data into one object per cell
  const cells = [];
  heatData.forEach((row) => {
    condKeys.forEach((ck, i) => {
      cells.push({
        cgpa: row.cgpa,
        condLabel: condLabels[i],
        pct: row[ck + "_pct"],
        n: row.total,
      });
    });
  });

  // Draw heatmap rectangles, one cell per pair
  g.selectAll(".heatcell")
    .data(cells)
    .enter()
    .append("rect")
    .attr("class", "heatcell")
    .attr("x", (d) => x(d.cgpa))
    .attr("y", (d) => y(d.condLabel))
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("fill", (d) => colorScale(d.pct));

  // Percentage text label inside each cell
  g.selectAll(".cell-label")
    .data(cells)
    .enter()
    .append("text")
    .attr("class", "cell-label")
    .attr("x", (d) => x(d.cgpa) + x.bandwidth() / 2)
    .attr("y", (d) => y(d.condLabel) + y.bandwidth() / 2 + 4)
    .attr("text-anchor", "middle")
    .attr("fill", "#222")
    .text((d) => d.pct + "%");

  // Color legend
  const legendW = 140;
  const legendH = 12;
  const legG = g.append("g").attr("transform", `translate(${pw + 20}, 110)`);

  // Build gradient
  const defs = svg.append("defs");
  const gradId = "heatmap-gradient";
  const grad = defs
    .append("linearGradient")
    .attr("id", gradId)
    .attr("x1", "0%")
    .attr("x2", "100%");

  // Sample 10 stops across the color interpolator
  d3.range(0, 11).forEach((i) => {
    grad
      .append("stop")
      .attr("offset", i * 10 + "%")
      .attr("stop-color", colorScale(i * 10));
  });

  // Gradient rectangle
  legG
    .append("rect")
    .attr("width", legendW)
    .attr("height", legendH)
    .style("fill", `url(#${gradId})`);

  // Legend axis
  const legScale = d3.scaleLinear().domain([0, 100]).range([0, legendW]);
  legG
    .append("g")
    .attr("transform", `translate(0, ${legendH})`)
    .call(
      d3
        .axisBottom(legScale)
        .ticks(5)
        .tickFormat((d) => d + "%")
    )
    .selectAll("text");

  // Legend title
  legG
    .append("text")
    .attr("x", legendW / 2)
    .attr("y", -6)
    .attr("text-anchor", "middle")
    .text("% of students");
}
