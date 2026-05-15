// these are filled once the CSV loads and reused on every resize
var loadedData   = null;
var loadedGenres = null;
var colorScale   = null;

// select the main SVG once — contents get cleared and redrawn on resize
const svg = d3.select("#main-svg");

// load and process the data one time, then kick off the first draw
d3.csv("data/mxmh_survey_results.csv").then(function(rawData) {

  // convert string columns to numbers where needed
  rawData.forEach(function(d) {
    d.Age         = +d["Age"];
    d.HoursPerDay = +d["Hours per day"];
    d.BPM         = +d["BPM"];
    d.Anxiety     = +d["Anxiety"];
    d.Depression  = +d["Depression"];
    d.Insomnia    = +d["Insomnia"];
    d.OCD         = +d["OCD"];
    d.Genre       = d["Fav genre"];
  });

  // drop rows missing a genre or with bad numeric values
  // also cut BPM outliers — anything over 500 is clearly a typo
  loadedData = rawData.filter(function(d) {
    return d.Genre && d.Genre.trim() !== "" &&
           !isNaN(d.HoursPerDay) && d.HoursPerDay >= 0 &&
           !isNaN(d.BPM) && d.BPM > 0 && d.BPM < 500 &&
           !isNaN(d.Anxiety) && !isNaN(d.Depression) &&
           !isNaN(d.Insomnia) && !isNaN(d.OCD);
  });

  // sorted list of unique genres shared across all three views
  loadedGenres = Array.from(new Set(loadedData.map(function(d) { return d.Genre; }))).sort();

  // combine Tableau10 and the first 6 of Paired to get 16 well-separated categorical colors
  // these two schemes are designed for distinction, unlike a continuous rainbow
  var palette = d3.schemeTableau10.concat(d3.schemePaired.slice(0, 6));
  colorScale = d3.scaleOrdinal()
    .domain(loadedGenres)
    .range(palette);

  draw();

}).catch(function(err) {
  console.error("Could not load the dataset:", err);
});

// redraw the full dashboard whenever the window is resized
// 150ms debounce so it doesn't fire on every pixel while dragging
var resizeTimer;
window.addEventListener("resize", function() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function() {
    if (loadedData) draw();
  }, 150);
});

// -------------------------------------------------------
// draw() wipes the SVG and redraws all three views using
// the current window size, so nothing ever overflows
// -------------------------------------------------------
function draw() {

  // clear everything from the previous draw
  svg.selectAll("*").remove();

  // recalculate dimensions from the current window size
  var totalWidth  = window.innerWidth;
  var totalHeight = window.innerHeight;

  // height of the dark header bar at the very top
  var headerH = 46;

  // where the screen splits: left 37% / right 63%, top 55% / bottom 45%
  // splitY is measured from the top of the SVG so it accounts for the header
  var splitX = Math.floor(totalWidth * 0.37);
  var splitY = headerH + Math.floor((totalHeight - headerH) * 0.55);

  // margins for view 1 — bar chart, top-left panel
  // top margin is tall enough to fit the title + subtitle above the chart area
  var m1 = { top: 70, right: 20, bottom: 90, left: 70 };
  var v1W = splitX - m1.left - m1.right;
  var v1H = (splitY - headerH) - m1.top - m1.bottom;

  // margins for view 2 — parallel coordinates, top-right panel
  // right margin holds the genre legend; top margin clears the badge and title
  var m2 = { top: 70, right: 168, bottom: 30, left: 55 };
  var v2W = (totalWidth - splitX) - m2.left - m2.right;
  var v2H = (splitY - headerH) - m2.top - m2.bottom;

  // margins for view 3 — heatmap, bottom full-width panel
  // left margin is wider because genre names are long
  var m3 = { top: 58, right: 90, bottom: 50, left: 135 };
  var v3W = totalWidth - m3.left - m3.right;
  var v3H = (totalHeight - splitY) - m3.top - m3.bottom;

  // light gray background behind all panels
  svg.append("rect")
    .attr("width", totalWidth).attr("height", totalHeight)
    .attr("fill", "#f0f2f5");

  // dark header bar across the full top
  svg.append("rect")
    .attr("x", 0).attr("y", 0)
    .attr("width", totalWidth).attr("height", headerH)
    .attr("fill", "#2d3436");

  // dashboard title in the header
  svg.append("text")
    .attr("x", 20).attr("y", 30)
    .attr("font-size", "17px").attr("font-weight", "bold")
    .attr("fill", "#ffffff").attr("font-family", "Arial, sans-serif")
    .text("Music & Mental Health Dashboard");

  // subtitle in the header explaining what the dashboard is about
  svg.append("text")
    .attr("x", 320).attr("y", 30)
    .attr("font-size", "12px").attr("fill", "#b2bec3")
    .attr("font-family", "Arial, sans-serif")
    .text("Exploring how listening habits relate to mental health outcomes");

  // white card for view 1
  svg.append("rect")
    .attr("x", 1).attr("y", headerH + 1)
    .attr("width", splitX - 2).attr("height", splitY - headerH - 2)
    .attr("fill", "#ffffff").attr("stroke", "#dee2e6").attr("stroke-width", 1);

  // white card for view 2
  svg.append("rect")
    .attr("x", splitX + 1).attr("y", headerH + 1)
    .attr("width", totalWidth - splitX - 2).attr("height", splitY - headerH - 2)
    .attr("fill", "#ffffff").attr("stroke", "#dee2e6").attr("stroke-width", 1);

  // white card for view 3
  svg.append("rect")
    .attr("x", 1).attr("y", splitY + 1)
    .attr("width", totalWidth - 2).attr("height", totalHeight - splitY - 2)
    .attr("fill", "#ffffff").attr("stroke", "#dee2e6").attr("stroke-width", 1);

  // blue CONTEXT badge on view 1 — tells the reader this is the overview panel
  var b1 = svg.append("g").attr("transform", "translate(8," + (headerH + 8) + ")");
  // badge background pill
  b1.append("rect").attr("width", 62).attr("height", 18).attr("rx", 3).attr("fill", "#74b9ff");
  // badge label text
  b1.append("text")
    .attr("x", 31).attr("y", 13).attr("text-anchor", "middle")
    .attr("font-size", "9px").attr("font-weight", "bold")
    .attr("fill", "#fff").attr("font-family", "Arial, sans-serif")
    .text("CONTEXT");

  // orange FOCUS badge on view 2 — marks it as a detail panel
  var b2 = svg.append("g").attr("transform", "translate(" + (splitX + 8) + "," + (headerH + 8) + ")");
  // badge background pill
  b2.append("rect").attr("width", 50).attr("height", 18).attr("rx", 3).attr("fill", "#e17055");
  // badge label text
  b2.append("text")
    .attr("x", 25).attr("y", 13).attr("text-anchor", "middle")
    .attr("font-size", "9px").attr("font-weight", "bold")
    .attr("fill", "#fff").attr("font-family", "Arial, sans-serif")
    .text("FOCUS");

  // orange FOCUS badge on view 3 — marks it as a detail panel
  var b3 = svg.append("g").attr("transform", "translate(8," + (splitY + 8) + ")");
  // badge background pill
  b3.append("rect").attr("width", 50).attr("height", 18).attr("rx", 3).attr("fill", "#e17055");
  // badge label text
  b3.append("text")
    .attr("x", 25).attr("y", 13).attr("text-anchor", "middle")
    .attr("font-size", "9px").attr("font-weight", "bold")
    .attr("fill", "#fff").attr("font-family", "Arial, sans-serif")
    .text("FOCUS");


  // -------------------------------------------------------
  // VIEW 1 — Bar Chart (CONTEXT)
  // How many people listed each genre as their favorite —
  // this is the simplified overview of the full dataset
  // -------------------------------------------------------

  // count respondents per genre, sorted most to least popular
  var genreCounts = d3.nest()
    .key(function(d) { return d.Genre; })
    .rollup(function(v) { return v.length; })
    .entries(loadedData)
    .sort(function(a, b) { return b.value - a.value; });

  // group positioned in the top-left panel
  var g1 = svg.append("g")
    .attr("transform", "translate(" + m1.left + "," + (headerH + m1.top) + ")");

  // chart title — sits well below the CONTEXT badge
  g1.append("text")
    .attr("x", v1W / 2).attr("y", -42)
    .attr("text-anchor", "middle")
    .attr("font-size", "13px").attr("font-weight", "bold")
    .attr("fill", "#2d3436").attr("font-family", "Arial, sans-serif")
    .text("Respondents by Favorite Genre");

  // note that bar colors match the parallel coordinates legend
  g1.append("text")
    .attr("x", v1W / 2).attr("y", -25)
    .attr("text-anchor", "middle")
    .attr("font-size", "10px").attr("fill", "#999")
    .attr("font-family", "Arial, sans-serif")
    .text("Bar colors match the Genre legend in the parallel coordinates panel \u2192");

  // x scale — one band per genre
  var x1 = d3.scaleBand()
    .domain(genreCounts.map(function(d) { return d.key; }))
    .range([0, v1W])
    .padding(0.25);

  // y scale — linear from 0 up to the highest genre count
  var y1 = d3.scaleLinear()
    .domain([0, d3.max(genreCounts, function(d) { return d.value; })])
    .range([v1H, 0])
    .nice();

  // faint horizontal grid lines so bar heights are easy to read
  g1.selectAll(".grid-line")
    .data(y1.ticks(5))
    .enter().append("line")
      .attr("class", "grid-line")
      .attr("x1", 0).attr("x2", v1W)
      .attr("y1", function(d) { return y1(d); })
      .attr("y2", function(d) { return y1(d); })
      .attr("stroke", "#f0f0f0").attr("stroke-width", 1);

  // x axis at the bottom — labels angled so they don't overlap each other
  g1.append("g")
    .attr("transform", "translate(0," + v1H + ")")
    .call(d3.axisBottom(x1).tickSize(0))
    .call(function(g) { g.select(".domain").attr("stroke", "#ccc"); })
    .selectAll("text")
      .attr("transform", "rotate(-40)")
      .attr("text-anchor", "end")
      .attr("dx", "-0.4em").attr("dy", "0.15em")
      .attr("font-size", "10px").attr("fill", "#555");

  // y axis on the left with count values
  g1.append("g")
    .call(d3.axisLeft(y1).ticks(5))
    .call(function(g) {
      g.select(".domain").remove();
      g.selectAll(".tick line").attr("stroke", "#f0f0f0");
      g.selectAll(".tick text").attr("fill", "#555").attr("font-size", "10px");
    });

  // x axis label
  g1.append("text")
    .attr("x", v1W / 2).attr("y", v1H + m1.bottom - 5)
    .attr("text-anchor", "middle")
    .attr("font-size", "11px").attr("fill", "#666")
    .attr("font-family", "Arial, sans-serif")
    .text("Favorite Genre");

  // y axis label, rotated vertically
  g1.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -(v1H / 2)).attr("y", -54)
    .attr("text-anchor", "middle")
    .attr("font-size", "11px").attr("fill", "#666")
    .attr("font-family", "Arial, sans-serif")
    .text("Number of Respondents");

  // one bar per genre, colored by the shared genre color scale
  g1.selectAll(".bar")
    .data(genreCounts)
    .enter().append("rect")
      .attr("class", "bar")
      .attr("x", function(d) { return x1(d.key); })
      .attr("y", function(d) { return y1(d.value); })
      .attr("width", x1.bandwidth())
      .attr("height", function(d) { return v1H - y1(d.value); })
      .attr("fill", function(d) { return colorScale(d.key); })
      .attr("rx", 2);


  // -------------------------------------------------------
  // VIEW 2 — Parallel Coordinates (FOCUS)
  // Every line is one respondent colored by their favorite
  // genre — shows how individual listening habits connect
  // to each person's anxiety, depression, insomnia, and OCD
  // -------------------------------------------------------

  // the six dimensions shown as vertical axes across the plot
  var dims = ["HoursPerDay", "BPM", "Anxiety", "Depression", "Insomnia", "OCD"];

  // what each axis label should say
  var dimLabels = {
    HoursPerDay: "Hrs / Day",
    BPM:         "BPM",
    Anxiety:     "Anxiety",
    Depression:  "Depression",
    Insomnia:    "Insomnia",
    OCD:         "OCD"
  };

  // group positioned in the top-right panel
  var g2 = svg.append("g")
    .attr("transform", "translate(" + (splitX + m2.left) + "," + (headerH + m2.top) + ")");

  // chart title — sits below the FOCUS badge with enough breathing room
  g2.append("text")
    .attr("x", v2W / 2).attr("y", -42)
    .attr("text-anchor", "middle")
    .attr("font-size", "13px").attr("font-weight", "bold")
    .attr("fill", "#2d3436").attr("font-family", "Arial, sans-serif")
    .text("Listening Habits vs. Mental Health Scores (Parallel Coordinates)");

  // x scale places each axis evenly across the plot width
  var x2 = d3.scalePoint()
    .domain(dims)
    .range([0, v2W]);

  // one y scale per dimension — each covers its own data range
  var yScales = {};
  dims.forEach(function(dim) {
    yScales[dim] = d3.scaleLinear()
      .domain(d3.extent(loadedData, function(d) { return d[dim]; }))
      .range([v2H, 0])
      .nice();
  });

  // turns one row into an SVG path by connecting that person's value on each axis
  function buildPath(d) {
    var points = dims
      .filter(function(dim) { return !isNaN(d[dim]); })
      .map(function(dim) { return [x2(dim), yScales[dim](d[dim])]; });
    return d3.line()(points);
  }

  // draw each respondent as a thin semi-transparent colored line
  // low opacity means overlapping lines show density rather than clutter
  g2.selectAll(".pc-line")
    .data(loadedData)
    .enter().append("path")
      .attr("class", "pc-line")
      .attr("d", buildPath)
      .attr("fill", "none")
      .attr("stroke", function(d) { return colorScale(d.Genre); })
      .attr("stroke-width", 1)
      .attr("opacity", 0.2);

  // draw a vertical axis for each dimension
  dims.forEach(function(dim) {
    var axisG = g2.append("g")
      .attr("transform", "translate(" + x2(dim) + ",0)")
      .call(d3.axisLeft(yScales[dim]).ticks(5));

    // style axis lines and tick marks
    axisG.select(".domain").attr("stroke", "#aaa");
    axisG.selectAll(".tick line").attr("stroke", "#aaa");
    axisG.selectAll(".tick text").attr("fill", "#555").attr("font-size", "10px");

    // dimension name above each axis — positioned high enough to not overlap the lines
    axisG.append("text")
      .attr("y", -20)
      .attr("text-anchor", "middle")
      .attr("font-size", "11px").attr("font-weight", "bold")
      .attr("fill", "#444").attr("font-family", "Arial, sans-serif")
      .text(dimLabels[dim]);
  });

  // genre color legend to the right of the axes
  var legendG = g2.append("g")
    .attr("transform", "translate(" + (v2W + 22) + ",0)");

  // legend title
  legendG.append("text")
    .attr("x", 0).attr("y", -20)
    .attr("font-size", "11px").attr("font-weight", "bold")
    .attr("fill", "#444").attr("font-family", "Arial, sans-serif")
    .text("Genre");

  // one colored square + label per genre
  loadedGenres.forEach(function(genre, i) {
    var iy = i * 16;

    // color swatch
    legendG.append("rect")
      .attr("x", 0).attr("y", iy)
      .attr("width", 11).attr("height", 11).attr("rx", 2)
      .attr("fill", colorScale(genre));

    // genre name next to the swatch
    legendG.append("text")
      .attr("x", 15).attr("y", iy + 9)
      .attr("font-size", "10px").attr("fill", "#444")
      .attr("font-family", "Arial, sans-serif")
      .text(genre);
  });


  // -------------------------------------------------------
  // VIEW 3 — Heatmap (FOCUS)
  // Average mental health score for every genre × condition
  // combo — makes it easy to see which genres go with
  // higher or lower scores on each mental health dimension
  // -------------------------------------------------------

  // the four mental health conditions used as columns in the heatmap
  var conditions = ["Anxiety", "Depression", "Insomnia", "OCD"];

  // compute the average score for every (genre, condition) pair
  var heatData = [];
  loadedGenres.forEach(function(genre) {
    var subset = loadedData.filter(function(d) { return d.Genre === genre; });
    conditions.forEach(function(cond) {
      heatData.push({
        genre:     genre,
        condition: cond,
        avg:       d3.mean(subset, function(d) { return d[cond]; })
      });
    });
  });

  // group positioned in the bottom panel
  var g3 = svg.append("g")
    .attr("transform", "translate(" + m3.left + "," + (splitY + m3.top) + ")");

  // chart title — sits below the FOCUS badge
  g3.append("text")
    .attr("x", v3W / 2).attr("y", -28)
    .attr("text-anchor", "middle")
    .attr("font-size", "13px").attr("font-weight", "bold")
    .attr("fill", "#2d3436").attr("font-family", "Arial, sans-serif")
    .text("Avg Mental Health Score by Genre & Condition");

  // x scale — one band per mental health condition
  var x3 = d3.scaleBand()
    .domain(conditions)
    .range([0, v3W])
    .padding(0.08);

  // y scale — one band per genre
  var y3 = d3.scaleBand()
    .domain(loadedGenres)
    .range([0, v3H])
    .padding(0.08);

  // sequential color scale: pale yellow = low (healthier), dark red = high
  var heatColor = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, 10]);

  // x axis along the bottom showing condition names
  g3.append("g")
    .attr("transform", "translate(0," + v3H + ")")
    .call(d3.axisBottom(x3).tickSize(0))
    .call(function(g) { g.select(".domain").attr("stroke", "#ccc"); })
    .selectAll("text")
      .attr("font-size", "12px").attr("fill", "#555");

  // y axis on the left showing genre names
  g3.append("g")
    .call(d3.axisLeft(y3).tickSize(0))
    .call(function(g) { g.select(".domain").attr("stroke", "#ccc"); })
    .selectAll("text")
      .attr("font-size", "10px").attr("fill", "#555");

  // x axis label
  g3.append("text")
    .attr("x", v3W / 2).attr("y", v3H + 38)
    .attr("text-anchor", "middle")
    .attr("font-size", "11px").attr("fill", "#666")
    .attr("font-family", "Arial, sans-serif")
    .text("Mental Health Condition");

  // y axis label, rotated vertically
  g3.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -(v3H / 2)).attr("y", -118)
    .attr("text-anchor", "middle")
    .attr("font-size", "11px").attr("fill", "#666")
    .attr("font-family", "Arial, sans-serif")
    .text("Favorite Genre");

  // one colored rectangle per (genre, condition) pair
  g3.selectAll(".cell")
    .data(heatData)
    .enter().append("rect")
      .attr("class", "cell")
      .attr("x", function(d) { return x3(d.condition); })
      .attr("y", function(d) { return y3(d.genre); })
      .attr("width", x3.bandwidth())
      .attr("height", y3.bandwidth())
      .attr("rx", 2)
      .attr("fill", function(d) { return heatColor(d.avg); });

  // score written inside each cell
  // white text on dark cells, dark text on light cells so it's always legible
  g3.selectAll(".cell-label")
    .data(heatData)
    .enter().append("text")
      .attr("class", "cell-label")
      .attr("x", function(d) { return x3(d.condition) + x3.bandwidth() / 2; })
      .attr("y", function(d) { return y3(d.genre) + y3.bandwidth() / 2 + 4; })
      .attr("text-anchor", "middle")
      .attr("font-size", "10px").attr("font-family", "Arial, sans-serif")
      .attr("fill", function(d) { return d.avg > 6.5 ? "#fff" : "#333"; })
      .text(function(d) { return d.avg.toFixed(1); });

  // vertical gradient bar legend to the right of the heatmap
  var hmLegendX = v3W + 20;
  var hmLegendW = 14;

  // SVG gradient definition — bottom = score 0 (pale yellow), top = score 10 (dark red)
  var defs = svg.append("defs");
  var grad = defs.append("linearGradient")
    .attr("id", "hm-gradient")
    .attr("x1", "0%").attr("y1", "100%")
    .attr("x2", "0%").attr("y2", "0%");

  // five evenly spaced stops covering the full 0–10 range
  [0, 0.25, 0.5, 0.75, 1].forEach(function(t) {
    grad.append("stop")
      .attr("offset", (t * 100) + "%")
      .attr("stop-color", heatColor(t * 10));
  });

  // rectangle filled with the gradient
  g3.append("rect")
    .attr("x", hmLegendX).attr("y", 0)
    .attr("width", hmLegendW).attr("height", v3H)
    .attr("rx", 2).attr("fill", "url(#hm-gradient)");

  // axis on the right of the gradient bar showing the 0–10 scale
  var hmScale = d3.scaleLinear().domain([0, 10]).range([v3H, 0]);
  g3.append("g")
    .attr("transform", "translate(" + (hmLegendX + hmLegendW) + ",0)")
    .call(d3.axisRight(hmScale).ticks(5))
    .call(function(g) {
      g.select(".domain").attr("stroke", "#ccc");
      g.selectAll(".tick text").attr("fill", "#555").attr("font-size", "10px");
    });

  // label above the gradient bar
  g3.append("text")
    .attr("x", hmLegendX + hmLegendW / 2).attr("y", -10)
    .attr("text-anchor", "middle")
    .attr("font-size", "10px").attr("fill", "#666")
    .attr("font-family", "Arial, sans-serif")
    .text("Avg Score");
}
