//main.js
//ECS 163 Homework 2 - Student Alcohol Consumption Dashboard
//Dataset: student-por.csv (Portuguese class, 649 students)

//Creat color scheme for entire project
//Background colors
const COLOR_PAGE_BG    = "#12170f";
const COLOR_PANEL_BG   = "#151e13";

//Text and label colors
const COLOR_LABEL      = "#7a8099";
const COLOR_LABEL_BOLD = "#c8bfa8";

//Grid line color
const COLOR_GRIDLINE   = "#2a2d3a";

//Axis line color used in the parallel coordinates plot
const COLOR_AXIS_LINE  = "#3a3d4a";

//Stroke color drawn behind each circle to separate overlapping dots
const COLOR_DOT_STROKE = "#0f1117";

//Fill for the failure size-legend dots
const COLOR_SIZE_LEGEND_FILL   = "#555";
const COLOR_SIZE_LEGEND_STROKE = "#888";

//My goal is to create three charts, a bar chart, scatter plot, and parallel axis chart
//Start by making on color scale for all charts.
//Use 5 levels, pale to dark red.

// Allows access to data for all functions
var globalData = [];

// Stored by draw functions so update functions can reach them
var parallelLineGroup = null;
var scatterDotGroup   = null;
var parallelBuildPath = null;
var scatterX = null, scatterY = null, scatterR = null;

// Shared state for the parallel chart so draw, update, and event handlers
// all agree on what is selected and what is currently filtered in
var selectedStudent      = null;
var currentFilteredSet   = null; // null means no filter (all students visible)


const alcoholColor = d3.scaleSequential()
  .domain([1, 5])
  .interpolator(d3.interpolateYlOrRd);

//Create tooltip to be used through whole hw
const tooltip = d3.select("#tooltip");

function showTooltip(html, event) {
  // Don't show tooltips while the guided intro is running
  if (appState !== "explore") return;
  tooltip
    .style("opacity", 1)
    .html(html)
    .style("left", (event.pageX + 14) + "px")
    .style("top", (event.pageY - 28) + "px");
}

function hideTooltip() {
  tooltip.style("opacity", 0);
}

//Load the CSV, convert string fields to numbers, then draw everything
//Help from Claude - Anthropic to process dataset
d3.csv("data/student-por.csv").then(function(rawData) {

  rawData.forEach(function(d) {
    d.Dalc      = +d.Dalc;
    d.Walc      = +d.Walc;
    d.goout     = +d.goout;
    d.freetime  = +d.freetime;
    d.famrel    = +d.famrel;
    d.studytime = +d.studytime;
    d.G3        = +d.G3;
    d.absences  = +d.absences;
    d.failures  = +d.failures;
  });

  globalData = rawData;

  drawOverview(rawData);
  drawParallel(rawData);
  drawScatter(rawData);
  drawHeatMap(rawData);

  // Show the first annotation immediately (panel fades in with it)
  advanceIntroStep();

  // Wire Next button
  document.getElementById("intro-next-btn").addEventListener("click", advanceIntroStep);

  // Wire Explore button
  document.getElementById("explore-btn").addEventListener("click", startExploring);

}).catch(function(err) {
  console.error("Could not load student-por.csv:", err);
});

// Tracks whether we are in the guided intro or free exploration
var appState = "guided";

// Each step reveals one panel and shows one annotation
var introSteps = [
  {
    panel:    "panel-heatmap",
    label:    "01 / 04",
    headline: "The full picture",
    body:     "Each cell shows how many of the 649 students fall at a given weekend alcohol level and final grade. Darker red means more students. Most cluster at low alcohol and mid-range grades."
  },
  {
    panel:    "panel-overview",
    label:    "02 / 04",
    headline: "Most students drink lightly",
    body:     "Workday drinking (Dalc) is concentrated at level 1 for nearly every student. Weekend drinking (Walc) is more spread out, especially at levels 2 and 3."
  },
  {
    panel:    "panel-parallel",
    label:    "03 / 04",
    headline: "Going out predicts weekend drinking",
    body:     "Each line is one student. Lines colored dark red tend to score high on 'Goes Out' and 'Free Time', and low on 'Study Time'. Family relations show less of a pattern."
  },
  {
    panel:    "panel-scatter",
    label:    "04 / 04",
    headline: "Heavier drinkers earn lower grades",
    body:     "Each dot is a student. Color shows weekend alcohol level. Dots shift toward higher absences and lower grades as color darkens. Larger dots had more past failures."
  }
];

var currentStep = 0;

function advanceIntroStep() {
  var step = introSteps[currentStep];

  // Fade in the panel for this step
  document.getElementById(step.panel).classList.add("panel-visible");

  // Update the annotation card text
  document.getElementById("intro-step-label").textContent = step.label;
  document.getElementById("intro-headline").textContent   = step.headline;
  document.getElementById("intro-body").textContent       = step.body;

  currentStep++;

  // The scatter panel is bottom-left, so on the last step move both the card
  // AND the explore button to the top-left so nothing overlaps the chart
  var overlay = document.getElementById("intro-overlay");
  var exploreBtn = document.getElementById("explore-btn");
  if (currentStep >= introSteps.length) {
    overlay.style.alignItems = "flex-start";
    overlay.style.paddingTop = "80px";
    document.getElementById("intro-next-btn").style.display = "none";
    // Move explore button to top instead of its default bottom:32px
    exploreBtn.style.bottom = "auto";
    exploreBtn.style.top    = "220px";
    exploreBtn.style.display = "block";
  } else {
    overlay.style.alignItems = "flex-end";
    overlay.style.paddingTop = "32px";
  }
}

function startExploring() {
  appState = "explore";

  // Hide the overlay and explore button
  document.getElementById("intro-overlay").style.display = "none";
  document.getElementById("explore-btn").style.display   = "none";

  // Make sure all panels are fully visible in case anything was missed
  ["panel-heatmap","panel-overview","panel-parallel","panel-scatter"].forEach(function(id) {
    document.getElementById(id).classList.add("panel-visible");
  });
}


function drawHeatMap(data) {
  var svgEl  = document.getElementById("svg-heatmap");
  var W      = svgEl.clientWidth;
  var H      = svgEl.clientHeight;

  var margin = { top: 20, right: 20, bottom: 40, left: 70 };
  var innerW = W - margin.left - margin.right;
  var innerH = H - margin.top - margin.bottom;

  var svg = d3.select("#svg-heatmap")
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // Define grade buckets and alcohol levels for the two axes
  var gradeBuckets = ["0-4", "5-8", "9-12", "13-16", "17-20"];
  var walcLevels   = [1, 2, 3, 4, 5];

  // Assign each student to a grade bucket
  function getBucket(g3) {
    if (g3 <= 4)  return "0-4";
    if (g3 <= 8)  return "5-8";
    if (g3 <= 12) return "9-12";
    if (g3 <= 16) return "13-16";
    return "17-20";
  }

  // Count students per (walc, gradeBucket) cell
  var cellData = [];
  walcLevels.forEach(function(walc) {
    gradeBuckets.forEach(function(bucket) {
      var count = data.filter(function(d) {
        return d.Walc === walc && getBucket(d.G3) === bucket;
      }).length;
      cellData.push({ walc: walc, bucket: bucket, count: count });
    });
  });

  // X scale: one band per Walc level
  var x = d3.scaleBand()
    .domain(walcLevels)
    .range([0, innerW])
    .padding(0.05);

  // Y scale: one band per grade bucket, low grades at bottom
  var y = d3.scaleBand()
    .domain(gradeBuckets.slice().reverse())
    .range([0, innerH])
    .padding(0.05);

  // Color scale for cell count, white to dark red
  var maxCount = d3.max(cellData, function(d) { return d.count; });
  var cellColor = d3.scaleSequential()
    .domain([0, maxCount])
    .interpolator(d3.interpolateYlOrRd);

  // Draw one rect per cell
  svg.selectAll(".heatmap-cell")
    .data(cellData)
    .enter()
    .append("rect")
    .attr("class", "heatmap-cell")
    .attr("x",      function(d) { return x(d.walc); })
    .attr("y",      function(d) { return y(d.bucket); })
    .attr("width",  x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("rx", 2)
    .attr("fill", function(d) {
      return d.count === 0 ? "#1a1d26" : cellColor(d.count);
    })
    .on("mouseover", function(d) {
      showTooltip(
        "Walc " + d.walc + "  Grade " + d.bucket + "<br/>" + d.count + " students",
        d3.event
      );
    })
    .on("mousemove", function() {
      tooltip
        .style("left", (d3.event.pageX + 14) + "px")
        .style("top",  (d3.event.pageY - 28) + "px");
    })
    .on("mouseout", hideTooltip);

  // Count labels inside each cell (skip zeros to reduce clutter)
  svg.selectAll(".cell-label")
    .data(cellData)
    .enter()
    .append("text")
    .attr("class", "cell-label")
    .attr("x", function(d) { return x(d.walc) + x.bandwidth() / 2; })
    .attr("y", function(d) { return y(d.bucket) + y.bandwidth() / 2 + 4; })
    .attr("text-anchor", "middle")
    .attr("font-size", "9px")
    .attr("fill", function(d) { return d.count > maxCount * 0.5 ? "#fff" : COLOR_LABEL; })
    .text(function(d) { return d.count > 0 ? d.count : ""; });

  // X axis: Walc levels
  svg.append("g")
    .attr("transform", "translate(0," + innerH + ")")
    .call(d3.axisBottom(x).tickSize(0))
    .call(function(g) {
      g.select(".domain").remove();
      g.selectAll(".tick text").attr("fill", COLOR_LABEL).attr("font-size", "9px");
    });

  svg.append("text")
    .attr("x", innerW / 2)
    .attr("y", innerH + 32)
    .attr("text-anchor", "middle")
    .attr("fill", COLOR_LABEL)
    .attr("font-size", "10px")
    .text("Weekend Alcohol Level (Walc)");

  // Y axis: grade buckets
  svg.append("g")
    .call(d3.axisLeft(y).tickSize(0))
    .call(function(g) {
      g.select(".domain").remove();
      g.selectAll(".tick text").attr("fill", COLOR_LABEL).attr("font-size", "9px");
    });

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -(innerH / 2))
    .attr("y", -58)
    .attr("text-anchor", "middle")
    .attr("fill", COLOR_LABEL)
    .attr("font-size", "10px")
    .text("Final Grade (G3)");
}


// Use a bar chart for Chart 1
//This gives an overview of number of students who drink
//uses Dalc (weekday alcohol consumption) and Walc (weekend alcohol consumption)

//used Claude for syntax help
function drawOverview(data) {

  //Grab the SVG element's actual pixel size so bars fill the panel
  var svgEl  = document.getElementById("svg-overview");
  var W      = svgEl.clientWidth;
  var H      = svgEl.clientHeight;

  var margin = { top: 20, right: 120, bottom: 50, left: 50 };
  var innerW = W - margin.left - margin.right;
  var innerH = H - margin.top - margin.bottom;

  var svg = d3.select("#svg-overview")
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  //Count how many students are at each level for Dalc and Walc
  var levels = [1, 2, 3, 4, 5];
  var types  = ["Dalc", "Walc"];

  var counts = [];
  types.forEach(function(type) {
    levels.forEach(function(level) {
      counts.push({
        type:  type,
        level: level,
        count: data.filter(function(d) { return d[type] === level; }).length
      });
    });
  });

  //Outer band scale groups bars by Dalc vs Walc
  var x0 = d3.scaleBand()
    .domain(types)
    .range([0, innerW])
    .paddingInner(0.3)
    .paddingOuter(0.2);

  //Inner band scale spaces out the five levels within each group
  var x1 = d3.scaleBand()
    .domain(levels)
    .range([0, x0.bandwidth()])
    .padding(0.05);

  //Y maps student count to vertical position
  var y = d3.scaleLinear()
    .domain([0, d3.max(counts, function(d) { return d.count; })])
    .range([innerH, 0])
    .nice();

  //Draw the bottom axis showing Dalc and Walc labels
  svg.append("g")
    .attr("transform", "translate(0," + innerH + ")")
    .call(d3.axisBottom(x0).tickSize(0))
    .select(".domain").remove();

  //X axis label
  svg.append("text")
    .attr("x", innerW / 2)
    .attr("y", innerH + 42)
    .attr("text-anchor", "middle")
    .attr("fill", COLOR_LABEL)
    .attr("font-size", "11px")
    .text("Consumption Type  (Dalc = Workday  /  Walc = Weekend)");

  //Draw the left axis with light horizontal gridlines
  svg.append("g")
    .call(d3.axisLeft(y).ticks(5).tickSize(-innerW))
    .call(function(g) { g.select(".domain").remove(); })
    .call(function(g) {
      g.selectAll(".tick line").attr("stroke", COLOR_GRIDLINE);
      g.selectAll(".tick text").attr("fill", COLOR_LABEL).attr("font-size", "10px");
    });

  //Y axis label
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -(innerH / 2))
    .attr("y", -38)
    .attr("text-anchor", "middle")
    .attr("fill", COLOR_LABEL)
    .attr("font-size", "11px")
    .text("Number of Students");

  //One <g> per type (Dalc, Walc), shifted to its x0 position
  var groups = svg.selectAll(".bar-group")
    .data(types)
    .enter()
    .append("g")
    .attr("class", "bar-group")
    .attr("transform", function(type) { return "translate(" + x0(type) + ",0)"; });

  //Within each group, draw one bar per alcohol level 1-5
  groups.selectAll("rect")
    .data(function(type) {
      return counts.filter(function(d) { return d.type === type; });
    })
    .enter()
    .append("rect")
    .attr("x",      function(d) { return x1(d.level); })
    .attr("y",      function(d) { return y(d.count); })
    .attr("width",  x1.bandwidth())
    .attr("height", function(d) { return innerH - y(d.count); })
    .attr("fill",   function(d) { return alcoholColor(d.level); })
    .attr("rx", 2)
    .on("mouseover", function(d) {
      showTooltip(
        "<strong>" + d.type + "</strong> level " + d.level + "<br/>" + d.count + " students",
        d3.event
      );
      d3.select(this).attr("opacity", 0.75);
    })
    .on("mousemove", function() {
      tooltip
        .style("left", (d3.event.pageX + 14) + "px")
        .style("top",  (d3.event.pageY - 28) + "px");
    })
    .on("mouseout", function() {
      hideTooltip();
      d3.select(this).attr("opacity", 1);
    });

  // Brush is added over the full chart area so the user can drag across any bars
  var brush = d3.brushX()
    .extent([[0, 0], [innerW, innerH]])
    .on("end", function() {
      if (appState !== "explore") return;

      // No selection means the user clicked to clear, so restore all data
      if (!d3.event.selection) {
        updateParallel(globalData);
        updateScatter(globalData);
        return;
      }

      var sel = d3.event.selection;
      var brushCenter = (sel[0] + sel[1]) / 2;

      // Determine which group the center of the brush falls inside.
      // This is the user's intent — if they drag within Dalc, filter Dalc only.
      // Using the center prevents accidental bleed into the neighboring group.
      var activeType = null;
      types.forEach(function(type) {
        var groupLeft  = x0(type);
        var groupRight = groupLeft + x0.bandwidth();
        if (brushCenter >= groupLeft && brushCenter <= groupRight) {
          activeType = type;
        }
      });

      // If the center didn't land inside any group (dragged into the gap), reset
      if (!activeType) {
        updateParallel(globalData);
        updateScatter(globalData);
        return;
      }

      // Within the active group, clamp the selection to that group's pixel
      // bounds before checking bar midpoints. This means even if the user drags
      // past the group edge, bars in the neighboring group can never be caught.
      var groupOffset = x0(activeType);
      var groupLeft   = groupOffset;
      var groupRight  = groupOffset + x0.bandwidth();
      var clampedL    = Math.max(sel[0], groupLeft);
      var clampedR    = Math.min(sel[1], groupRight);

      var matchedLevels = [];
      levels.forEach(function(level) {
        var barMid = groupOffset + x1(level) + x1.bandwidth() / 2;
        if (barMid >= clampedL && barMid <= clampedR) {
          matchedLevels.push(level);
        }
      });

      if (matchedLevels.length === 0) {
        updateParallel(globalData);
        updateScatter(globalData);
        return;
      }

      // Filter only on the active type's field
      var filtered = globalData.filter(function(d) {
        return matchedLevels.indexOf(d[activeType]) !== -1;
      });

      updateParallel(filtered);
      updateScatter(filtered);
    });

  // Attach the brush to the SVG — it creates a transparent overlay rect
  svg.append("g")
    .attr("class", "brush")
    .call(brush);

  //Legend showing which color maps to which level
  var legend = svg.append("g")
    .attr("transform", "translate(" + (innerW + 16) + ", 10)");

  legend.append("text")
    .attr("font-size", "10px")
    .attr("fill", COLOR_LABEL)
    .text("LEVEL");

  levels.forEach(function(level, i) {
    var row = legend.append("g")
      .attr("transform", "translate(0," + (16 + i * 18) + ")");

    row.append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("rx", 2)
      .attr("fill", alcoholColor(level));

    row.append("text")
      .attr("x", 18)
      .attr("y", 10)
      .attr("font-size", "10px")
      .attr("fill", COLOR_LABEL)
      .text(level);
  });
}


//Chart 2 is a parallel axis chart
//The goal is to show student life for each individual student
function drawParallel(data) {

  var svgEl = document.getElementById("svg-parallel");
  var W = svgEl.clientWidth;
  var H = svgEl.clientHeight;

  var margin = { top: 40, right: 40, bottom: 50, left: 40 };
  var innerW = W - margin.left - margin.right;
  var innerH = H - margin.top - margin.bottom;

  var svg = d3.select("#svg-parallel")
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  //set up axis order
  var dimensions = ["studytime", "freetime", "goout", "famrel", "Dalc", "Walc"];

  var dimLabels = {
    studytime: "Study Time",
    freetime:  "Free Time",
    goout:     "Goes Out",
    famrel:    "Family Relations",
    Dalc:      "Workday Alcohol",
    Walc:      "Weekend Alcohol"
  };

  //Each axis gets its own y scale. All variables run 1-5 so the domain is the same.
  var yScales = {};
  dimensions.forEach(function(dim) {
    yScales[dim] = d3.scaleLinear()
      .domain([1, 5])
      .range([innerH, 0]);
  });

  //x positions the six axes evenly across the panel width
  var x = d3.scalePoint()
    .domain(dimensions)
    .range([0, innerW])
    .padding(0.1);

  //Builds the SVG path for one student by connecting their value on each axis
  parallelBuildPath = function(d) {
    return d3.line()(
      dimensions.map(function(dim) {
        return [x(dim), yScales[dim](d[dim])];
      })
    );
  };
  var buildPath = parallelBuildPath;

  // Track which student is currently selected (null means none).
  // Uses module-scope selectedStudent so updateParallel can read it too.

  //Draw all student lines at low opacity so patterns emerge from the overlap
  parallelLineGroup = svg.append("g").attr("class", "lines");
  var lineGroup = parallelLineGroup;

  lineGroup.selectAll("path")
    .data(data)
    .enter()
    .append("path")
    .attr("d", buildPath)
    .attr("fill", "none")
    .attr("stroke", function(d) { return alcoholColor(d.Walc); })
    .attr("stroke-width", 1)
    .attr("opacity", 0.35)
    .style("cursor", "pointer")
    .on("mouseover", function(d) {
      // Don't hover-highlight if a student is already click-selected
      if (selectedStudent !== null) return;
      // Don't hover-highlight if this line is filtered out
      if (currentFilteredSet !== null && !currentFilteredSet.has(d)) return;
      d3.select(this).attr("stroke-width", 2.5).attr("opacity", 1).raise();
      showTooltip(
        "Weekend alcohol: " + d.Walc + "  Workday: " + d.Dalc + "<br/>" +
        "Goes out: " + d.goout + "  Study time: " + d.studytime + "<br/>" +
        "Final grade: " + d.G3 + "  Absences: " + d.absences,
        d3.event
      );
    })
    .on("mousemove", function() {
      tooltip
        .style("left", (d3.event.pageX + 14) + "px")
        .style("top",  (d3.event.pageY - 28) + "px");
    })
    .on("mouseout", function(d) {
      if (selectedStudent !== null) return;
      // Restore to the correct opacity for this line's current filter state
      var baseOpacity = (currentFilteredSet === null || currentFilteredSet.has(d)) ? 0.35 : 0.04;
      d3.select(this).attr("stroke-width", 1).attr("opacity", baseOpacity);
      hideTooltip();
    })
    .on("click", function(d) {
      if (appState !== "explore") return;
      // Don't allow clicking a filtered-out line
      if (currentFilteredSet !== null && !currentFilteredSet.has(d)) return;

      // Clicking the already-selected line deselects everything
      if (selectedStudent === d) {
        selectedStudent = null;
        // Restore all lines to their current filter-aware opacity
        lineGroup.selectAll("path")
          .attr("stroke-width", 1)
          .attr("opacity", function(d) {
            return (currentFilteredSet === null || currentFilteredSet.has(d)) ? 0.35 : 0.04;
          });
        updateScatter(currentFilteredSet === null ? globalData : Array.from(currentFilteredSet));
        hideTooltip();
        return;
      }

      // Lock this student as selected
      selectedStudent = d;

      // Dim all lines, then highlight only this one
      lineGroup.selectAll("path")
        .attr("stroke-width", 1)
        .attr("opacity", 0.04);

      d3.select(this)
        .attr("stroke-width", 3)
        .attr("opacity", 1)
        .raise();

      // Show only this student in the scatter plot
      updateScatter([d]);

      showTooltip(
        "Weekend alcohol: " + d.Walc + "  Workday: " + d.Dalc + "<br/>" +
        "Goes out: " + d.goout + "  Study time: " + d.studytime + "<br/>" +
        "Final grade: " + d.G3 + "  Absences: " + d.absences,
        d3.event
      );
    });

  //Draw a vertical axis for each dimension with its label above
  dimensions.forEach(function(dim) {
    var axisGroup = svg.append("g")
      .attr("transform", "translate(" + x(dim) + ",0)");

    axisGroup.call(
      d3.axisLeft(yScales[dim]).ticks(5).tickSize(4)
    )
    .call(function(g) {
      g.select(".domain").attr("stroke", COLOR_AXIS_LINE);
      g.selectAll(".tick line").attr("stroke", COLOR_AXIS_LINE);
      g.selectAll(".tick text").attr("fill", COLOR_LABEL).attr("font-size", "9px");
    });

    axisGroup.append("text")
      .attr("y", -12)
      .attr("text-anchor", "middle")
      .attr("fill", COLOR_LABEL_BOLD)
      .attr("font-size", "10px")
      .text(dimLabels[dim]);
  });

  //Gradient legend bar at the bottom showing low to high Walc
  var legendW = 160;
  var legendH = 10;
  var legendX = innerW / 2 - legendW / 2;
  var legendY = innerH + 30;

  var defs = svg.append("defs");
  var gradient = defs.append("linearGradient").attr("id", "walc-gradient");

  [1, 2, 3, 4, 5].forEach(function(v) {
    gradient.append("stop")
      .attr("offset", ((v - 1) / 4 * 100) + "%")
      .attr("stop-color", alcoholColor(v));
  });

  svg.append("rect")
    .attr("x", legendX)
    .attr("y", legendY)
    .attr("width", legendW)
    .attr("height", legendH)
    .attr("rx", 3)
    .attr("fill", "url(#walc-gradient)");

  svg.append("text")
    .attr("x", legendX)
    .attr("y", legendY + 22)
    .attr("fill", COLOR_LABEL)
    .attr("font-size", "9px")
    .text("Low (1)");

  svg.append("text")
    .attr("x", legendX + legendW)
    .attr("y", legendY + 22)
    .attr("text-anchor", "end")
    .attr("fill", COLOR_LABEL)
    .attr("font-size", "9px")
    .text("High (5)");

  svg.append("text")
    .attr("x", legendX + legendW / 2)
    .attr("y", legendY - 4)
    .attr("text-anchor", "middle")
    .attr("fill", COLOR_LABEL)
    .attr("font-size", "9px")
    .text("Weekend alcohol level");
}


//Chart three should be a simple scatter plot
//but doing the element overlay got complicated so I used a lot of help from
//CLAUDE - courtesy of anthropic
function drawScatter(data) {

  var svgEl  = document.getElementById("svg-scatter");
  var W      = svgEl.clientWidth;
  var H      = svgEl.clientHeight;

  var margin = { top: 16, right: 120, bottom: 50, left: 50 };
  var innerW = W - margin.left - margin.right;
  var innerH = H - margin.top - margin.bottom;

  var svg = d3.select("#svg-scatter")
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  //X axis: number of absences
  var x = d3.scaleLinear()
    .domain([0, d3.max(data, function(d) { return d.absences; })])
    .range([0, innerW])
    .nice();

  //Y axis: final grade out of 20
  var y = d3.scaleLinear()
    .domain([0, 20])
    .range([innerH, 0]);

  //Circle radius encodes failures using a sqrt scale so area grows proportionally
  var r = d3.scaleSqrt()
    .domain([0, 4])
    .range([3, 10]);

  scatterX = x;
  scatterY = y;
  scatterR = r;

  // Store axis groups as variables so the zoom handler can redraw them in place.
  // These are the only axis elements — no separate static append before this.
  var xAxisGroup = svg.append("g")
    .attr("transform", "translate(0," + innerH + ")")
    .call(d3.axisBottom(x).ticks(8).tickSize(-innerH))
    .call(function(g) {
      g.select(".domain").remove();
      g.selectAll(".tick line").attr("stroke", COLOR_GRIDLINE);
      g.selectAll(".tick text").attr("fill", COLOR_LABEL).attr("font-size", "9px");
    });

  svg.append("text")
    .attr("x", innerW / 2)
    .attr("y", innerH + 40)
    .attr("text-anchor", "middle")
    .attr("fill", COLOR_LABEL)
    .attr("font-size", "11px")
    .text("Number of Absences");

  var yAxisGroup = svg.append("g")
    .call(d3.axisLeft(y).ticks(6).tickSize(-innerW))
    .call(function(g) {
      g.select(".domain").remove();
      g.selectAll(".tick line").attr("stroke", COLOR_GRIDLINE);
      g.selectAll(".tick text").attr("fill", COLOR_LABEL).attr("font-size", "9px");
    });

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -(innerH / 2))
    .attr("y", -38)
    .attr("text-anchor", "middle")
    .attr("fill", COLOR_LABEL)
    .attr("font-size", "11px")
    .text("Final Grade (G3)");

  // Clip path prevents dots from rendering outside the chart area during zoom
  var svgRoot = d3.select("#svg-scatter");
  svgRoot.append("defs")
    .append("clipPath")
    .attr("id", "scatter-clip")
    .append("rect")
    .attr("width",  innerW)
    .attr("height", innerH);

  //Sort so students with more failures (bigger dots) render first,
  //preventing them from covering smaller dots in the foreground
  var sorted = data.slice().sort(function(a, b) { return b.failures - a.failures; });

  // Wrap dots in a group with the clip path so they don't overflow during zoom
  scatterDotGroup = svg.append("g")
    .attr("class", "dots")
    .attr("clip-path", "url(#scatter-clip)");
  scatterDotGroup.selectAll("circle")
    .data(sorted)
    .enter()
    .append("circle")
    .attr("cx",     function(d) { return x(d.absences); })
    .attr("cy",     function(d) { return y(d.G3); })
    .attr("r",      function(d) { return r(d.failures); })
    .attr("fill",   function(d) { return alcoholColor(d.Walc); })
    .attr("opacity", 0.65)
    .attr("stroke", COLOR_DOT_STROKE)
    .attr("stroke-width", 0.5)
    .on("mouseover", function(d) {
      d3.select(this).attr("opacity", 1).attr("stroke-width", 1.5);
      showTooltip(
        "Grade: <strong>" + d.G3 + "</strong>  Absences: " + d.absences + "<br/>" +
        "Failures: " + d.failures + "  Weekend alcohol: " + d.Walc + "<br/>" +
        "Sex: " + d.sex + "  School: " + d.school,
        d3.event
      );
    })
    .on("mousemove", function() {
      tooltip
        .style("left", (d3.event.pageX + 14) + "px")
        .style("top",  (d3.event.pageY - 28) + "px");
    })
    .on("mouseout", function() {
      d3.select(this).attr("opacity", 0.65).attr("stroke-width", 0.5);
      hideTooltip();
    });

  //Right-side legend with two sections: color for Walc, size for failures
  var legend = svg.append("g")
    .attr("transform", "translate(" + (innerW + 16) + ", 0)");

  //Color legend for weekend alcohol level
  legend.append("text")
    .attr("font-size", "9px")
    .attr("fill", COLOR_LABEL)
    .text("WALC");

  [1, 2, 3, 4, 5].forEach(function(level, i) {
    var row = legend.append("g")
      .attr("transform", "translate(0," + (14 + i * 16) + ")");

    row.append("circle")
      .attr("r", 5)
      .attr("cx", 5)
      .attr("cy", 5)
      .attr("fill", alcoholColor(level));

    row.append("text")
      .attr("x", 16)
      .attr("y", 9)
      .attr("font-size", "9px")
      .attr("fill", COLOR_LABEL)
      .text(level);
  });

  //Size legend for number of past failures
  legend.append("text")
    .attr("y", 110)
    .attr("font-size", "9px")
    .attr("fill", COLOR_LABEL)
    .text("FAILURES");

  [0, 2, 4].forEach(function(f, i) {
    var row = legend.append("g")
      .attr("transform", "translate(0," + (124 + i * 22) + ")");

    row.append("circle")
      .attr("r",  r(f))
      .attr("cx", r(4))
      .attr("cy", r(4))
      .attr("fill", COLOR_SIZE_LEGEND_FILL)
      .attr("stroke", COLOR_SIZE_LEGEND_STROKE)
      .attr("stroke-width", 0.5);

    row.append("text")
      .attr("x", r(4) * 2 + 6)
      .attr("y", r(4) + 4)
      .attr("font-size", "9px")
      .attr("fill", COLOR_LABEL)
      .text(f);
  });

  // Store the original scales so zoom can reference them
  var xOrig = x.copy();
  var yOrig = y.copy();

  // Zoom behavior: rescale both axes and reposition all dots
  var zoom = d3.zoom()
    .scaleExtent([1, 12])
    .translateExtent([[0, 0], [innerW, innerH]])
    .on("zoom", function() {
      if (appState !== "explore") return; // disable during guided phase

      // Compute rescaled axis from the zoom transform
      var t  = d3.event.transform;
      var xz = t.rescaleX(xOrig);
      var yz = t.rescaleY(yOrig);

      // Update the stored scales so updateScatter uses them too
      scatterX = xz;
      scatterY = yz;

      // Redraw axes with new scale
      xAxisGroup.call(d3.axisBottom(xz).ticks(8).tickSize(-innerH))
        .call(function(g) {
          g.select(".domain").remove();
          g.selectAll(".tick line").attr("stroke", COLOR_GRIDLINE);
          g.selectAll(".tick text").attr("fill", COLOR_LABEL).attr("font-size", "9px");
        });

      yAxisGroup.call(d3.axisLeft(yz).ticks(6).tickSize(-innerW))
        .call(function(g) {
          g.select(".domain").remove();
          g.selectAll(".tick line").attr("stroke", COLOR_GRIDLINE);
          g.selectAll(".tick text").attr("fill", COLOR_LABEL).attr("font-size", "9px");
        });

      // Reposition all dots using the new scales
      scatterDotGroup.selectAll("circle")
        .attr("cx", function(d) { return xz(d.absences); })
        .attr("cy", function(d) { return yz(d.G3); });
    });

  // Attach zoom to the scatter SVG element
  svgRoot.call(zoom);
}

function updateParallel(data) {
  if (!parallelLineGroup) return;

  // Update the module-scope filter set so event handlers stay in sync.
  // null means all students are visible (no active brush).
  currentFilteredSet = (data === globalData) ? null : new Set(data);

  // Clear any active click-selection since the brush resets the chart context
  selectedStudent = null;

  // Keep all paths in the DOM to preserve event listeners.
  // Paths in the filtered set get full opacity; others fade to near-invisible.
  parallelLineGroup.selectAll("path")
    .transition().duration(400)
    .attr("stroke-width", 1)
    .attr("opacity", function(d) {
      return (currentFilteredSet === null || currentFilteredSet.has(d)) ? 0.35 : 0.04;
    })
    .attr("stroke", function(d) { return alcoholColor(d.Walc); });
}

function updateScatter(data) {
  if (!scatterDotGroup) return;

  var sorted = data.slice().sort(function(a, b) { return b.failures - a.failures; });

  var dots = scatterDotGroup.selectAll("circle")
    .data(sorted);

  // Fade out removed dots
  dots.exit()
    .transition().duration(300)
    .attr("r", 0)
    .remove();

  // Move existing dots to new positions with a smooth transition
  dots.transition().duration(400)
    .attr("cx",   function(d) { return scatterX(d.absences); })
    .attr("cy",   function(d) { return scatterY(d.G3); })
    .attr("r",    function(d) { return scatterR(d.failures); })
    .attr("fill", function(d) { return alcoholColor(d.Walc); });

  // Fade in new dots
  dots.enter()
    .append("circle")
    .attr("cx",     function(d) { return scatterX(d.absences); })
    .attr("cy",     function(d) { return scatterY(d.G3); })
    .attr("r",      0)
    .attr("fill",   function(d) { return alcoholColor(d.Walc); })
    .attr("opacity", 0.65)
    .attr("stroke",  COLOR_DOT_STROKE)
    .attr("stroke-width", 0.5)
    .transition().duration(400)
    .attr("r", function(d) { return scatterR(d.failures); });
}