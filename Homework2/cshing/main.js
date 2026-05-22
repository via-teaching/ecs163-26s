// colors from coolors.co
// keeps the dashboard colors in one place so the charts feel consistent
const PALETTE = {
  cream: "#ede0d4",
  sand: "#e6ccb2",
  tan: "#ddb892",
  roseBrown: "#b08968",
  brown: "#7f5539",
  copper: "#9c6644",
  ink: "#39251a",

  chartLight: "#ebd4cb",
  chartPeach: "#da9f93",
  chartRed: "#b6465f",
  chartWine: "#890620",
  chartDark: "#2c0703",
  hoverRed: "#ff1f3d"
};

// chart registry, lets the dashboard swap focus and context views without rewriting render logic
const CHARTS = [
  {id: "scatter", title: "Alcohol Use Index vs Final Grade", kicker: "Overview", render: renderScatter},
  {id: "parallel", title: "Student Lifestyle Parallel Coordinates", kicker: "Advanced View", render: renderParallel},
  {id: "groupedBar", title: "Average Final Grade by Study Time and Alcohol Level", kicker: "Summary View",  render: renderGroupedBar }
];

let all_rows = [];
let active_chart_id = "scatter";
let student_id_counter = 0;

// tracks the hovered student so scatter and parallel views can link to the same row
let hovered_student_id = null;

// tracks the hovered alcohol group because the bar chart shows group averages, not individual students
let hovered_alcohol_group = null;

// d3 selects the three main containers once so render functions can reuse them
const focus_chart    = d3.select("#focusChart");
const tooltip        = d3.select("#tooltip");
const subject_filter = d3.select("#subjectFilter");

Promise.all([
  loadFlexibleCsv("data/student-mat.csv", "math"),
  loadFlexibleCsv("data/student-por.csv", "portuguese")
]).then(([math_rows, portuguese_rows]) => {
  all_rows = [...math_rows, ...portuguese_rows];

  // d3 listens for dropdown changes and redraws with the newly filtered dataset
  subject_filter.on("change", renderDashboard);

  // d3 makes each context card clickable so it swaps into the focus area
  d3.selectAll(".context-card")
    .on("click", function () {
      const slot = +d3.select(this).attr("data-chart-slot");
      active_chart_id = getMiniCharts()[slot].id;

      // clear hover state when layout changes so old highlights don't linger
      hovered_student_id    = null;
      hovered_alcohol_group = null;

      renderDashboard();
    })
    .on("keydown", function (event) {
      // lets keyboard users trigger the chart swap with enter or space
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        d3.select(this).dispatch("click");
      }
    });

  renderDashboard();
});

function loadFlexibleCsv(path, subject) {
  return d3.text(path).then(text => {
    // the UCI student dataset ships in both semicolon and comma variants depending
    // on where you download it from, so we sniff the delimiter rather than hardcoding
    const first_line = text.split(/\r?\n/)[0];
    const delimiter  = first_line.includes(";") ? ";" : ",";
    return d3.dsvFormat(delimiter).parse(text, row => cleanRow(row, subject));
  });
}

function cleanRow(row, subject) {
  const numeric_cols = [
    "age", "Medu", "Fedu", "traveltime", "studytime", "failures", "famrel",
    "freetime", "goout", "Dalc", "Walc", "health", "absences", "G1", "G2", "G3"
  ];

  // d3 parses csv values as strings so we convert each numeric column to a real number
  numeric_cols.forEach(col => { row[col] = +row[col]; });

  row.subject = subject;

  // stable id assigned here so the same student can be identified and highlighted across all three charts
  row.student_id = `${subject}-${student_id_counter}`;
  student_id_counter += 1;

  // combining weekday and weekend drinking into one index makes it easier to
  // place students on a single axis without losing the original breakdown in tooltips
  row.alcoholIndex = row.Dalc + row.Walc;
  row.alcoholGroup = row.alcoholIndex <= 3 ? "Low" : row.alcoholIndex <= 6 ? "Medium" : "High";

  return row;
}

function filteredRows() {
  const selected = subject_filter.property("value");
  return selected === "combined" ? all_rows : all_rows.filter(d => d.subject === selected);
}

function renderDashboard() {
  const data = filteredRows();
  const active_chart = CHARTS.find(c => c.id === active_chart_id);
  const mini_charts = getMiniCharts();

  // d3 updates the html title elements so the labels match whichever chart is in focus
  d3.select("#focusKicker").text(active_chart.kicker);
  d3.select("#focusTitle").text(active_chart.title);
  d3.select("#miniTitle0").text(mini_charts[0].title);
  d3.select("#miniTitle1").text(mini_charts[1].title);

  clearAndRender(focus_chart, data, active_chart, false);
  clearAndRender(d3.select("#miniChart0"), data, mini_charts[0], true);
  clearAndRender(d3.select("#miniChart1"), data, mini_charts[1], true);

  // reapply hover state after redraw so linked views stay in sync
  applyGlobalHighlight();
}

function getMiniCharts() {
  return CHARTS.filter(c => c.id !== active_chart_id);
}

function clearAndRender(container, data, chart, is_mini) {
  // d3 removes all old svg children so redraws don't stack on top of each other
  container.selectAll("*").remove();

  const bounds = container.node().getBoundingClientRect();

  // getBoundingClientRect returns 0 on first paint before layout settles,
  // so we clamp to a safe minimum rather than drawing a zero-size svg
  const width  = Math.max(320, bounds.width);
  const height = Math.max(is_mini ? 170 : 340, bounds.height);

  chart.render(container, data, width, height, is_mini);
}

function createSvg(container, width, height) {
  // viewBox lets the svg scale with the card without distorting the drawing coordinates
  return container.append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("width", "100%")
    .attr("height", "100%");
}

// --- scatter plot ---
// overview: individual students plotted by alcohol index and final grade
function renderScatter(container, data, width, height, is_mini) {
  const margin = is_mini
    ? { top: 12, right: 18,  bottom: 48, left: 52 }
    : { top: 20, right: 170, bottom: 62, left: 70 };

  const inner_width  = width  - margin.left - margin.right;
  const inner_height = height - margin.top  - margin.bottom;

  const svg  = createSvg(container, width, height);

  // d3 adds a plot group so all marks share the same margin offset
  const plot = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // x maps alcohol index to horizontal position, y maps final grade to vertical position
  const x = d3.scaleLinear().domain([2, 10]).range([0, inner_width]);
  const y = d3.scaleLinear().domain([0, 20]).range([inner_height, 0]);

  // sqrt scale so a student with 60 absences doesn't get a bubble that swamps
  // everyone else, area grows linearly with the value instead of radius
  const r = d3.scaleSqrt()
    .domain([0, d3.max(data, d => d.absences) || 1])
    .range(is_mini ? [2, 6] : [3, 11]);

  // ordinal color scale maps each study time level to a separate warm color
  const color = d3.scaleOrdinal()
    .domain(["1", "2", "3", "4"])
    .range([PALETTE.chartPeach, PALETTE.chartRed, PALETTE.chartWine, PALETTE.chartDark]);

  // d3 draws horizontal grid lines first so they sit behind the data points
  plot.append("g").attr("class", "grid")
    .call(d3.axisLeft(y).tickSize(-inner_width).tickFormat(""));

  // d3 draws the x axis for alcohol index along the bottom of the plot area
  plot.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${inner_height})`)
    .call(d3.axisBottom(x).ticks(is_mini ? 4 : 9));

  // d3 draws the y axis for final grade along the left side
  plot.append("g").attr("class", "axis")
    .call(d3.axisLeft(y).ticks(is_mini ? 4 : 6));

  // d3 joins one circle to each student row, encoding alcohol index, grade, absences, and study time
  plot.selectAll("circle.student-point")
    .data(data)
    .join("circle")
    .attr("class", d => `student-point alc-${d.alcoholGroup.toLowerCase()}`)
    .attr("data-student-id", d => d.student_id)
    .attr("data-alcohol-group", d => d.alcoholGroup)
    .attr("data-base-opacity", is_mini ? 0.58 : 0.72)
    .attr("data-base-stroke", "#fffaf4")
    .attr("data-base-stroke-width", 0.7)
    // jitter only on x so vertical grade comparisons stay honest,
    // but students with the same integer alcohol index become readable
    .attr("cx", d => x(d.alcoholIndex) + jitter(d, is_mini ? 3 : 7))
    .attr("cy", d => y(d.G3))
    .attr("r", d => r(d.absences))
    .attr("fill", d => color(String(d.studytime)))
    .attr("stroke", "#fffaf4")
    .attr("stroke-width", 0.7)
    .attr("opacity", is_mini ? 0.58 : 0.72)
    .on("mouseenter", function (event, d) {
      // store this student's id and group then sync highlighting across all charts
      hovered_student_id = d.student_id;
      hovered_alcohol_group = d.alcoholGroup;
      applyGlobalHighlight();
      showTooltip(event, studentTooltip(d));
    })
    .on("mousemove",  (event, d) => showTooltip(event, studentTooltip(d)))
    .on("mouseleave", function () {
      // clear the global hover state so all charts return to their default appearance
      hovered_student_id = null;
      hovered_alcohol_group = null;
      applyGlobalHighlight();
      hideTooltip();
    });

  if (is_mini) return;

  // d3 adds the x axis title below the ticks
  svg.append("text").attr("class", "axis-title")
    .attr("x", margin.left + inner_width / 2)
    .attr("y", height - 16)
    .attr("text-anchor", "middle")
    .text("Alcohol use index: Dalc + Walc");

  // d3 adds the y axis title rotated so it reads along the axis
  svg.append("text").attr("class", "axis-title")
    .attr("transform", `translate(18,${margin.top + inner_height / 2}) rotate(-90)`)
    .attr("text-anchor", "middle")
    .text("Final grade (G3)");

  // d3 creates the legend group positioned in the right margin
  const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${width - margin.right + 26},${margin.top + 12})`);

  // d3 adds the legend title above the color chips
  legend.append("text").attr("class", "chart-title-svg").attr("y", 0).text("Study time");

  const study_time_labels = ["<2 hrs", "2-5 hrs", "5-10 hrs", ">10 hrs"];

  // d3 creates one legend item for each study time category
  legend.selectAll("g.legend-item")
    .data(study_time_labels)
    .join("g")
    .attr("class", "legend-item")
    .attr("transform", (d, i) => `translate(0,${22 + i * 24})`)
    .call(g => {
      // d3 adds a circle color chip that matches the scatter point fill for that study level
      g.append("circle").attr("r", 6).attr("fill", (d, i) => color(String(i + 1)));
      g.append("text").attr("x", 14).attr("y", 4).text(d => d);
    });

  // d3 adds a note explaining what the bubble size encodes
  legend.append("text").attr("class", "annotation").attr("y", 138)
    .text("Bubble size = absences");

  // d3 adds guide text explaining the alcohol index columns from the dataset
  legend.append("text").attr("class", "annotation").attr("y", 166)
    .attr("fill", PALETTE.copper).attr("font-weight", 700).text("guide:");
  legend.append("text").attr("class", "annotation").attr("y", 182)
    .attr("fill", PALETTE.copper).text("Dalc = weekday alcohol");
  legend.append("text").attr("class", "annotation").attr("y", 196)
    .attr("fill", PALETTE.copper).text("Walc = weekend alcohol");
  legend.append("text").attr("class", "annotation").attr("y", 216)
    .attr("fill", PALETTE.copper).text("higher index means");
  legend.append("text").attr("class", "annotation").attr("y", 230)
    .attr("fill", PALETTE.copper).text("more alcohol use");

  // d3 adds a nudge directing users to the summary view next
  legend.append("text").attr("class", "annotation").attr("y", 258)
    .attr("fill", PALETTE.copper).attr("font-weight", 700).text("→ see summary view");
  legend.append("text").attr("class", "annotation").attr("y", 272)
    .attr("fill", PALETTE.copper).text("to compare groups");
}

// --- grouped bar chart ---
// summary: average final grades grouped by study time and alcohol level
function renderGroupedBar(container, data, width, height, is_mini) {
  // focus view gets extra top margin to make room for the hover takeaway text
  const margin = is_mini
    ? { top: 14, right: 18,  bottom: 48, left: 54 }
    : { top: 64, right: 150, bottom: 68, left: 72 };

  const inner_width  = width - margin.left - margin.right;
  const inner_height = height - margin.top  - margin.bottom;

  const svg = createSvg(container, width, height);

  const study_levels = ["1", "2", "3", "4"];
  const study_labels = { "1": "<2 hrs", "2": "2-5 hrs", "3": "5-10 hrs", "4": ">10 hrs" };
  const alcohol_groups = ["Low", "Medium", "High"];

  // d3 rollup creates a nested map: studytime then alcoholGroup then { avgG3, count }
  const grouped = d3.rollup(
    data,
    values => ({ avgG3: d3.mean(values, d => d.G3), count: values.length }),
    d => String(d.studytime),
    d => d.alcoholGroup
  );

  // pre-build every study × alcohol combo so gaps still reserve bar space,
  // without this missing combos would cause bar groups to shift width unpredictably
  const bars = study_levels.flatMap(study =>
    alcohol_groups.map(group => {
      const stats = grouped.get(study)?.get(group);
      return {
        study, studyLabel: study_labels[study], alcoholGroup: group,
        avgG3: stats?.avgG3 ?? 0, count: stats?.count ?? 0
      };
    })
  );

  // two-level band scale, x0 positions the study time groups and x1 positions alcohol bars inside each group
  const x0 = d3.scaleBand().domain(study_levels).range([0, inner_width]).paddingInner(0.18);
  const x1 = d3.scaleBand().domain(alcohol_groups).range([0, x0.bandwidth()]).padding(0.08);
  const y  = d3.scaleLinear()
    .domain([0, Math.max(20, d3.max(bars, d => d.avgG3) || 0)]).nice()
    .range([inner_height, 0]);

  // ordinal color scale for the three alcohol groups
  const color = d3.scaleOrdinal()
    .domain(alcohol_groups)
    .range([PALETTE.chartPeach, PALETTE.chartRed, PALETTE.chartWine]);

  // d3 creates a hidden group for the hover takeaway text above the chart
  const hover_summary = svg.append("g")
    .attr("class", "hover-summary")
    .style("pointer-events", "none")
    .style("opacity", 0);

  if (!is_mini) {
    // d3 adds the first takeaway line, updated dynamically when a bar is hovered
    hover_summary.append("text")
      .attr("class", "annotation hover-summary-title")
      .attr("x", margin.left + inner_width / 2)
      .attr("y", 24)
      .attr("text-anchor", "middle")
      .attr("fill", PALETTE.copper)
      .attr("font-weight", 800);

    // d3 adds the second takeaway line with supporting context
    hover_summary.append("text")
      .attr("class", "annotation hover-summary-line")
      .attr("x", margin.left + inner_width / 2)
      .attr("y", 42)
      .attr("text-anchor", "middle")
      .attr("fill", PALETTE.brown);
  }

  // d3 adds the main plot group shifted inward by the margins
  const plot = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // d3 draws horizontal grid lines behind the bars so average comparisons are easier
  plot.append("g").attr("class", "grid")
    .call(d3.axisLeft(y).tickSize(-inner_width).tickFormat(""));

  // d3 draws the x axis for study time categories
  plot.append("g").attr("class", "axis x-axis")
    .attr("transform", `translate(0,${inner_height})`)
    .call(d3.axisBottom(x0).tickFormat(d => study_labels[d]));

  if (is_mini) {
    // d3 rotates labels so they don't overlap in the narrow mini card
    plot.selectAll(".x-axis text")
      .attr("text-anchor", "end")
      .attr("dx", "-0.45em").attr("dy", "0.25em")
      .attr("transform", "rotate(-28)");
  }

  // d3 draws the y axis for average final grade
  plot.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(is_mini ? 4 : 6));

  // d3 creates one group element per study time level, each translated to its band position
  const study_groups = plot.selectAll("g.study-bar-group")
    .data(study_levels)
    .join("g")
    .attr("class", "study-bar-group")
    .attr("transform", d => `translate(${x0(d)},0)`);

  // d3 draws one bar per alcohol group inside each study time band
  study_groups.selectAll("rect.grouped-bar")
    .data(study => bars.filter(d => d.study === study))
    .join("rect")
    .attr("class", "grouped-bar")
    .attr("data-alcohol-group", d => d.alcoholGroup)
    .attr("data-study-time", d => d.study)
    .attr("data-base-opacity", d => d.count ? 0.92 : 0.18)
    .attr("x", d => x1(d.alcoholGroup))
    .attr("y", d => y(d.avgG3))
    .attr("width", x1.bandwidth())
    .attr("height", d => inner_height - y(d.avgG3))
    .attr("rx", is_mini ? 4 : 8)
    .attr("fill", d => color(d.alcoholGroup))
    // faded empty bars show the category exists rather than looking like missing data
    .attr("opacity", d => d.count ? 0.92 : 0.18)
    .on("mouseenter", function (event, d) {
      // bar chart shows group averages so we highlight by alcohol group, not individual student
      hovered_student_id    = null;
      hovered_alcohol_group = d.alcoholGroup;
      applyGlobalHighlight();
      if (!is_mini) showBarConclusion(hover_summary, d);
      showTooltip(event,
        `<strong>Study time:</strong> ${d.studyLabel}<br>` +
        `<strong>Alcohol group:</strong> ${d.alcoholGroup}<br>` +
        `<strong>Avg final grade:</strong> ${d.count ? d.avgG3.toFixed(1) : "No students"}<br>` +
        `<strong>Students:</strong> ${d.count}`
      );
    })
    .on("mousemove", (event, d) => showTooltip(event,
      `<strong>Study time:</strong> ${d.studyLabel}<br>` +
      `<strong>Alcohol group:</strong> ${d.alcoholGroup}<br>` +
      `<strong>Avg final grade:</strong> ${d.count ? d.avgG3.toFixed(1) : "No students"}<br>` +
      `<strong>Students:</strong> ${d.count}`
    ))
    .on("mouseleave", function () {
      // clear hover state and hide the takeaway text when the cursor leaves
      hovered_student_id    = null;
      hovered_alcohol_group = null;
      applyGlobalHighlight();
      hover_summary.style("opacity", 0);
      hideTooltip();
    });

  if (is_mini) return;

  // d3 adds average grade labels above each bar, only in focus view where there's room
  study_groups.selectAll("text.bar-label")
    .data(study => bars.filter(d => d.study === study && d.count > 0))
    .join("text")
    .attr("class", "bar-label")
    .attr("x", d => x1(d.alcoholGroup) + x1.bandwidth() / 2)
    .attr("y", d => y(d.avgG3) - 6)
    .attr("text-anchor", "middle")
    .attr("fill", PALETTE.brown)
    .attr("font-weight", 800)
    .attr("font-size", 12)
    .text(d => d.avgG3.toFixed(1));

  // d3 adds the x axis title below the ticks
  svg.append("text").attr("class", "axis-title")
    .attr("x", margin.left + inner_width / 2).attr("y", height - 18)
    .attr("text-anchor", "middle").text("Study time category");

  // d3 adds the y axis title rotated to read along the axis
  svg.append("text").attr("class", "axis-title")
    .attr("transform", `translate(20,${margin.top + inner_height / 2}) rotate(-90)`)
    .attr("text-anchor", "middle").text("Average final grade (G3)");

  // d3 creates the legend group in the right margin
  const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${width - margin.right + 26},${margin.top + 12})`);

  // d3 adds the legend title above the color chips
  legend.append("text").attr("class", "chart-title-svg").attr("y", 0).text("Alcohol group");

  // d3 creates one legend item for each alcohol group
  legend.selectAll("g.legend-item")
    .data(alcohol_groups)
    .join("g")
    .attr("class", "legend-item")
    .attr("transform", (d, i) => `translate(0,${24 + i * 26})`)
    .call(g => {
      // d3 adds a rect color chip that matches the bar fill for that alcohol group
      g.append("rect").attr("x", -6).attr("y", -10).attr("width", 14).attr("height", 14)
        .attr("rx", 4).attr("fill", d => color(d));
      g.append("text").attr("x", 16).attr("y", 2).text(d => d);
    });

  // d3 adds threshold labels explaining how the alcohol groups were calculated
  legend.append("text").attr("class", "annotation").attr("y", 124).text("Low: Dalc + Walc ≤ 3");
  legend.append("text").attr("class", "annotation").attr("y", 144).text("Medium: 4–6");
  legend.append("text").attr("class", "annotation").attr("y", 164).text("High: 7–10");

  // d3 adds a hover hint prompting users to interact with the bars
  legend.append("text").attr("class", "annotation").attr("y", 196)
    .attr("fill", PALETTE.copper).attr("font-weight", 700).text("hover bars");
  legend.append("text").attr("class", "annotation").attr("y", 210)
    .attr("fill", PALETTE.copper).text("for takeaways");

  // d3 adds a nudge directing users to the advanced parallel coordinates view
  legend.append("text").attr("class", "annotation").attr("y", 238)
    .attr("fill", PALETTE.copper).attr("font-weight", 700).text("→ advanced view");
  legend.append("text").attr("class", "annotation").attr("y", 252)
    .attr("fill", PALETTE.copper).text("shows each student");
}

// writes the takeaway text shown above the grouped bar chart when a bar is hovered
function showBarConclusion(hover_summary, d) {
  let title = "";
  let line  = "";

  if (d.alcoholGroup === "Low" && d.study === "4") {
    title = "takeaway: low alcohol use + more study time connects to stronger grades";
    line  = "this group has one of the clearest high-grade patterns in the summary view";
  } else if (d.alcoholGroup === "Low") {
    title = "takeaway: lower alcohol use generally lines up with stronger grades";
    line  = "compare this bar against medium and high alcohol groups in the same study level";
  } else if (d.alcoholGroup === "High" && (d.study === "1" || d.study === "2")) {
    title = "takeaway: higher alcohol use with less study time tends to lower grades";
    line  = "this combination points to weaker academic outcomes in the grouped summary";
  } else if (d.alcoholGroup === "High") {
    title = "takeaway: studying more may help, but high alcohol use still matters";
    line  = "look across this color to see whether grades recover as study time increases";
  } else if (d.study === "3" || d.study === "4") {
    title = "takeaway: more study time tends to support better grades";
    line  = "the middle alcohol group shows how study time can still shift the average upward";
  } else {
    title = "takeaway: this group sits in the middle of the pattern";
    line  = "compare left to right to see how study time changes the average grade";
  }

  // d3 updates the pre-existing text elements rather than appending new ones each hover
  hover_summary.style("opacity", 1);
  hover_summary.select(".hover-summary-title").text(title);
  hover_summary.select(".hover-summary-line").text(line);
}

// --- parallel coordinates ---
// advanced view: one line per student connecting values across lifestyle and grade dimensions
function renderParallel(container, data, width, height, is_mini) {
  const margin = is_mini
    ? { top: 26, right: 24,  bottom: 28, left: 32  }
    : width < 1050
      ? { top: 30, right: 60,  bottom: 54, left: 54  }
      : { top: 30, right: 190, bottom: 54, left: 130 };

  // hide the side guide and legend text when the chart is too narrow to fit them
  const show_guides = !is_mini && width >= 1050;
  const show_legend_text = !is_mini && width >= 1150;

  const inner_width  = width  - margin.left - margin.right;
  const inner_height = height - margin.top  - margin.bottom;

  const dimensions = ["Dalc", "Walc", "studytime", "goout", "freetime", "absences", "G3"];
  const labels = {
    Dalc: "Weekday Alc.", Walc: "Weekend Alc.", studytime: "Study Time",
    goout: "Going Out", freetime: "Free Time", absences: "Absences", G3: "Final Grade"
  };

  const svg  = createSvg(container, width, height);

  // d3 adds the plot group shifted inward by the margins
  const plot = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // scalePoint spaces the vertical axes evenly, padding keeps the outermost labels from clipping
  const x = d3.scalePoint().domain(dimensions).range([0, inner_width]).padding(0.28);

  // each dimension needs its own y scale because the variables live on totally
  // different ranges, absences can hit 90+ while Dalc only goes to 5
  const y_scales = new Map(dimensions.map(dim => [
    dim,
    d3.scaleLinear()
      .domain(dim === "G3" ? [0, 20] : d3.extent(data, d => d[dim]))
      .nice()
      .range([inner_height, 0])
  ]));

  // sequential color scale maps final grade to line color so high-grade students stand out
  const color = d3.scaleSequential()
    .domain([0, 20])
    .interpolator(d3.interpolateRgbBasis([
      PALETTE.chartPeach, PALETTE.chartRed, PALETTE.chartWine, PALETTE.chartDark
    ]));

  const line = d3.line()
    // .defined() skips NaN values so one missing field doesn't break the whole path,
    // without this a single bad row produces a line that shoots to 0,0
    .defined(([, v]) => Number.isFinite(v))
    .x(([dim])    => x(dim))
    .y(([dim, v]) => y_scales.get(dim)(v));

  // d3 draws one path per student connecting their values across all dimensions
  plot.selectAll("path.student-profile")
    .data(data)
    .join("path")
    .attr("class", "student-profile")
    .attr("data-student-id", d => d.student_id)
    .attr("data-alcohol-group", d => d.alcoholGroup)
    .attr("data-base-opacity", is_mini ? 0.18 : 0.30)
    .attr("data-base-stroke", d => color(d.G3))
    .attr("data-base-stroke-width", is_mini ? 0.65 : 1.15)
    .attr("d", d => line(dimensions.map(dim => [dim, d[dim]])))
    .attr("fill", "none")
    .attr("stroke", d => color(d.G3))
    .attr("stroke-width", is_mini ? 0.65 : 1.15)
    .attr("opacity", is_mini ? 0.18 : 0.30)
    .on("mouseenter", function (event, d) {
      // store this student's id and group then sync highlighting across all charts
      hovered_student_id    = d.student_id;
      hovered_alcohol_group = d.alcoholGroup;
      applyGlobalHighlight();
      // raise() brings this path to the front, svg has no z-index so draw order
      // determines what sits on top and raise() moves the element to the last child position
      d3.select(this).raise();
      showTooltip(event, studentTooltip(d));
    })
    .on("mousemove",  (event, d) => showTooltip(event, studentTooltip(d)))
    .on("mouseleave", function () {
      // clear global hover state so all charts return to their default appearance
      hovered_student_id    = null;
      hovered_alcohol_group = null;
      applyGlobalHighlight();
      hideTooltip();
    });

  // d3 creates one vertical axis group per dimension, each translated to its x position
  const axes = plot.selectAll("g.parallel-axis")
    .data(dimensions)
    .join("g")
    .attr("class", "parallel-axis")
    .attr("transform", d => `translate(${x(d)},0)`)
    .each(function (dim) {
      // each axis uses its own y scale because the variable ranges are all different
      d3.select(this).call(d3.axisLeft(y_scales.get(dim)).ticks(is_mini ? 3 : 5));
    });

  // d3 adds a readable label above each vertical axis
  axes.append("text")
    .attr("class", "parallel-label")
    .attr("y", -8)
    .attr("text-anchor", "middle")
    .attr("font-weight", 800)
    .text(d => is_mini ? shortLabel(labels[d]) : labels[d]);

  if (is_mini) return;

  if (show_guides) {
    const guide_x = 44;
    const guide_y = margin.top + 18;

    // d3 adds a reading guide on the left margin, only shown when there is enough room
    svg.append("text").attr("class", "annotation")
      .attr("x", guide_x).attr("y", guide_y)
      .attr("font-weight", 800).attr("fill", PALETTE.brown).style("font-size", "15px")
      .text("how to read:");
    svg.append("text").attr("class", "annotation")
      .attr("x", guide_x).attr("y", guide_y + 24).style("font-size", "14px")
      .text("each line is");
    svg.append("text").attr("class", "annotation")
      .attr("x", guide_x).attr("y", guide_y + 48).style("font-size", "14px")
      .text("one student.");
    svg.append("text").attr("class", "annotation")
      .attr("x", guide_x).attr("y", guide_y + 84).style("font-size", "14px")
      .text("hover a line");
    svg.append("text").attr("class", "annotation")
      .attr("x", guide_x).attr("y", guide_y + 108).style("font-size", "14px")
      .text("to connect it");
    svg.append("text").attr("class", "annotation")
      .attr("x", guide_x).attr("y", guide_y + 132).style("font-size", "14px")
      .text("to the scatter plot.");
  }

  // d3 adds a bottom caption explaining how to read the parallel coordinates view
  svg.append("text").attr("class", "annotation")
    .attr("x", margin.left).attr("y", height - 18).style("font-size", "13px")
    .text("Follow a line across axes to compare drinking, lifestyle, absences, and final grade.");

  // d3 adds the continuous color legend for final grade in the right margin
  const legend_x = margin.left + inner_width + 26;
  const legend_y = margin.top + 165;
  renderColorLegend(svg, color, legend_x, legend_y, 16, inner_height * 0.40, "G3");

  if (show_legend_text) {
    const legend_text_x = legend_x + 58;
    const legend_text_y = legend_y + 14;

    // d3 adds extra legend explanation text, only shown when the viewport is wide enough
    svg.append("text").attr("class", "annotation")
      .attr("x", legend_text_x).attr("y", legend_text_y)
      .attr("fill", PALETTE.brown).attr("font-weight", 800).style("font-size", "14px")
      .text("G3 = final");
    svg.append("text").attr("class", "annotation")
      .attr("x", legend_text_x).attr("y", legend_text_y + 20)
      .attr("fill", PALETTE.brown).style("font-size", "14px")
      .text("course grade");
    svg.append("text").attr("class", "annotation")
      .attr("x", legend_text_x).attr("y", legend_text_y + 50)
      .attr("fill", PALETTE.brown).style("font-size", "14px")
      .text("darker lines");
    svg.append("text").attr("class", "annotation")
      .attr("x", legend_text_x).attr("y", legend_text_y + 70)
      .attr("fill", PALETTE.brown).style("font-size", "14px")
      .text("mean higher");
    svg.append("text").attr("class", "annotation")
      .attr("x", legend_text_x).attr("y", legend_text_y + 90)
      .attr("fill", PALETTE.brown).style("font-size", "14px")
      .text("final grades");
  }
}

// syncs hover highlighting across all three chart containers at once
function applyGlobalHighlight() {
  const has_student = hovered_student_id    !== null;
  const has_group = hovered_alcohol_group !== null;

  // look up the full student row so the bar chart can match both alcohol group and study time
  const hovered_student = has_student
    ? all_rows.find(d => d.student_id === hovered_student_id)
    : null;

  // d3 updates scatter circle opacity and stroke based on the current hover state
  d3.selectAll("circle.student-point")
    .attr("opacity", function (d) {
      if (!has_student && !has_group) return +d3.select(this).attr("data-base-opacity");
      if (has_student) return d.student_id === hovered_student_id ? 1 : 0.12;
      return d.alcoholGroup === hovered_alcohol_group ? 0.95 : 0.18;
    })
    .attr("stroke", function (d) {
      if (has_student && d.student_id === hovered_student_id) return PALETTE.hoverRed;
      return d3.select(this).attr("data-base-stroke");
    })
    .attr("stroke-width", function (d) {
      if (has_student && d.student_id === hovered_student_id) return 2.4;
      return +d3.select(this).attr("data-base-stroke-width");
    });

  // d3 updates parallel line opacity and stroke based on the current hover state
  d3.selectAll("path.student-profile")
    .attr("opacity", function (d) {
      if (!has_student && !has_group) return +d3.select(this).attr("data-base-opacity");
      if (has_student) return d.student_id === hovered_student_id ? 1 : 0.035;
      return d.alcoholGroup === hovered_alcohol_group ? 0.45 : 0.05;
    })
    .attr("stroke", function (d) {
      if (has_student && d.student_id === hovered_student_id) return PALETTE.hoverRed;
      return d3.select(this).attr("data-base-stroke");
    })
    .attr("stroke-width", function (d) {
      if (has_student && d.student_id === hovered_student_id) return 3.5;
      return +d3.select(this).attr("data-base-stroke-width");
    })
    .each(function (d) {
      // raise() brings the selected path to the front so it's visible above all other lines,
      // svg layering is purely draw-order based so raise() is the only way to achieve this
      if (has_student && d.student_id === hovered_student_id) d3.select(this).raise();
    });

  // d3 updates grouped bar opacity and stroke, highlighting the exact study + alcohol combo
  // when hovering from scatter or parallel, or the whole alcohol group when hovering a bar
  d3.selectAll("rect.grouped-bar")
    .attr("opacity", function (d) {
      if (!has_student && !has_group) return +d3.select(this).attr("data-base-opacity");
      if (hovered_student) {
        const match = d.alcoholGroup === hovered_student.alcoholGroup &&
                      d.study === String(hovered_student.studytime);
        return match ? 1 : 0.15;
      }
      return d.alcoholGroup === hovered_alcohol_group ? 1 : 0.15;
    })
    .attr("stroke", function (d) {
      if (!hovered_student) return "none";
      const match = d.alcoholGroup === hovered_student.alcoholGroup &&
                    d.study === String(hovered_student.studytime);
      return match ? PALETTE.hoverRed : "none";
    })
    .attr("stroke-width", function (d) {
      if (!hovered_student) return 0;
      const match = d.alcoholGroup === hovered_student.alcoholGroup &&
                    d.study === String(hovered_student.studytime);
      return match ? 2.5 : 0;
    });
}

// vertical gradient legend used by the parallel coordinates view
function renderColorLegend(svg, color_scale, x, y, width, height, label) {
  // unique id prevents gradient conflicts when multiple svgs exist on the page after redraws
  const legend_id = `legend-gradient-${Math.random().toString(36).slice(2)}`;

  // d3 creates a vertical linear gradient definition that the rect below will reference by id
  const gradient = svg.append("defs").append("linearGradient")
    .attr("id", legend_id)
    .attr("x1", "0%").attr("x2", "0%")
    .attr("y1", "100%").attr("y2", "0%");

  // d3 samples the color scale at 11 evenly spaced stops, finer than this is imperceptible
  gradient.selectAll("stop")
    .data(d3.range(0, 1.01, 0.1))
    .join("stop")
    .attr("offset",     d => `${d * 100}%`)
    .attr("stop-color", d =>
      color_scale(color_scale.domain()[0] + d * (color_scale.domain()[1] - color_scale.domain()[0]))
    );

  // d3 draws the rectangle filled with the gradient so the legend has a visual bar
  svg.append("rect")
    .attr("x", x).attr("y", y)
    .attr("width", width).attr("height", height)
    .attr("rx", 8)
    .attr("fill", `url(#${legend_id})`);

  // d3 adds a numeric axis beside the gradient so users can read grade values off the color
  const legend_scale = d3.scaleLinear().domain(color_scale.domain()).range([height, 0]);

  svg.append("g").attr("class", "axis")
    .attr("transform", `translate(${x + width},${y})`)
    .call(d3.axisRight(legend_scale).ticks(5));

  // d3 adds a label above the gradient rect identifying what the color encodes
  svg.append("text").attr("class", "chart-title-svg")
    .attr("x", x - 5).attr("y", y - 8)
    .attr("text-anchor", "start").text(label);
}

// deterministic jitter so the same student lands in the same spot across re-renders,
// pure Math.random() would make points jump every time the filter changes
function jitter(d, spread) {
  const seed = (d.age * 13 + d.G1 * 7 + d.G2 * 5 + d.absences * 3) % 17;
  return ((seed / 16) - 0.5) * spread;
}

function shortLabel(label) {
  return label
    .replace("Weekday ", "Wkdy ")
    .replace("Weekend ", "Wknd ")
    .replace("Final Grade", "G3");
}

function studentTooltip(d) {
  return `<strong>${d.subject === "math" ? "Math" : "Portuguese"} student</strong><br>` +
    `<strong>Final grade:</strong> ${d.G3}<br>` +
    `<strong>Dalc / Walc:</strong> ${d.Dalc} / ${d.Walc}<br>` +
    `<strong>Study time:</strong> ${d.studytime}<br>` +
    `<strong>Going out:</strong> ${d.goout}<br>` +
    `<strong>Absences:</strong> ${d.absences}`;
}

function showTooltip(event, html) {
  tooltip
    .style("opacity", 1)
    .style("left",  `${event.clientX + 14}px`)
    .style("top",   `${event.clientY + 14}px`)
    .html(html);
}

function hideTooltip() {
  tooltip.style("opacity", 0);
}

// collapse/expand toggle for the subtitle on smaller screens
const subtitle = document.querySelector(".subtitle");

if (subtitle) {
  const subtitle_row = document.createElement("div");
  subtitle_row.className = "subtitle-row";
  subtitle.parentNode.insertBefore(subtitle_row, subtitle);
  subtitle_row.appendChild(subtitle);

  const description_button = document.createElement("button");
  description_button.type = "button";
  description_button.className = "description-toggle";
  description_button.innerHTML = "⌄";
  description_button.setAttribute("aria-label", "Expand dashboard description");
  subtitle_row.appendChild(description_button);

  description_button.addEventListener("click", () => {
    const is_expanded = subtitle.classList.toggle("is-expanded");
    description_button.classList.toggle("is-expanded", is_expanded);
    description_button.setAttribute("aria-label",
      is_expanded ? "Collapse dashboard description" : "Expand dashboard description"
    );
    // redraw after the header height changes so chart sizes stay correct
    if (all_rows.length) renderDashboard();
  });
}

window.addEventListener("resize", () => {
  if (all_rows.length) renderDashboard();
});