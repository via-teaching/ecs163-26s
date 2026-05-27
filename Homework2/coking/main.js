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
const alcoholColor = d3.scaleSequential()
  .domain([1, 5])
  .interpolator(d3.interpolateYlOrRd);

//Create tooltip to be used through whole hw
const tooltip = d3.select("#tooltip");

function showTooltip(html, event) {
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

  drawOverview(rawData);
  drawParallel(rawData);
  drawScatter(rawData);

}).catch(function(err) {
  console.error("Could not load student-por.csv:", err);
});


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
  function buildPath(d) {
    return d3.line()(
      dimensions.map(function(dim) {
        return [x(dim), yScales[dim](d[dim])];
      })
    );
  }

  //Draw all student lines at low opacity so patterns emerge from the overlap
  var lineGroup = svg.append("g").attr("class", "lines");

  lineGroup.selectAll("path")
    .data(data)
    .enter()
    .append("path")
    .attr("d", buildPath)
    .attr("fill", "none")
    .attr("stroke", function(d) { return alcoholColor(d.Walc); })
    .attr("stroke-width", 1)
    .attr("opacity", 0.35)
    .on("mouseover", function(d) {
      d3.select(this)
        .attr("stroke-width", 2.5)
        .attr("opacity", 1)
        .raise();
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
    .on("mouseout", function() {
      d3.select(this)
        .attr("stroke-width", 1)
        .attr("opacity", 0.35);
      hideTooltip();
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

  //Bottom axis with light gridlines going up
  svg.append("g")
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

  //Left axis
  svg.append("g")
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

  //Sort so students with more failures (bigger dots) render first,
  //preventing them from covering smaller dots in the foreground
  var sorted = data.slice().sort(function(a, b) { return b.failures - a.failures; });

  svg.selectAll("circle")
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
}