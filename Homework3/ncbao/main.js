// -------------------------------------------------------
// Global data — filled once when the CSV loads
// -------------------------------------------------------
var loadedData = null; // cleaned array of respondent objects
var loadedGenres = null; // sorted array of unique genre strings
var colorScale = null; // ordinal scale mapping genre → color

// -------------------------------------------------------
// Interaction state — updated by click and brush handlers
// -------------------------------------------------------
var selectedGenre = null; // currently selected genre string, null = all genres shown
var activeBrushes = {}; // keyed by dimension name → [lo, hi] in data space

// -------------------------------------------------------
// Module-level references set by draw() so the update
// functions can reach into the live SVG without redrawing
// -------------------------------------------------------
var g1, g2, g3; // SVG groups for each view
var x1, y1, v1H, v1W; // bar chart scales + inner dimensions
var x2, v2H, yScales; // parallel coords x scale, height, per-axis y scales
var dims; // array of dimension names used by parallel coords + brushes
var y3; // heatmap y (genre) scale
var brushInstances = {}; // d3.brushY() instance per dimension — needed to clear them
var brushGroups = {}; // the g element each brush lives in — needed to call .move on

// select the root SVG once — contents are cleared and rebuilt on every draw()
var svg = d3.select("#main-svg");

// -------------------------------------------------------
// Load CSV once, clean it, then kick off the first draw
// -------------------------------------------------------
d3.csv("data/mxmh_survey_results.csv")
  .then(function (rawData) {
    // convert string columns to numbers where needed
    rawData.forEach(function (d) {
      d.Age = +d["Age"];
      d.HoursPerDay = +d["Hours per day"];
      d.BPM = +d["BPM"];
      d.Anxiety = +d["Anxiety"];
      d.Depression = +d["Depression"];
      d.Insomnia = +d["Insomnia"];
      d.OCD = +d["OCD"];
      d.Genre = d["Fav genre"];
    });

    // drop rows with a missing genre or bad numeric values
    // remove very high BPM values since they are likely data entry errors
    loadedData = rawData.filter(function (d) {
      return (
        d.Genre &&
        d.Genre.trim() !== "" &&
        !isNaN(d.HoursPerDay) &&
        d.HoursPerDay >= 0 &&
        !isNaN(d.BPM) &&
        d.BPM > 0 &&
        d.BPM < 500 &&
        !isNaN(d.Anxiety) &&
        !isNaN(d.Depression) &&
        !isNaN(d.Insomnia) &&
        !isNaN(d.OCD)
      );
    });

    // sorted list of unique genres — shared across all three views and the color scale
    loadedGenres = Array.from(
      new Set(
        loadedData.map(function (d) {
          return d.Genre;
        }),
      ),
    ).sort();

    // combine Tableau10 and the first 6 of Paired to get 16 well-separated categorical colors
    // using categorical colors so genres are easier to tell apart
    var palette = d3.schemeTableau10.concat(d3.schemePaired.slice(0, 6));
    colorScale = d3.scaleOrdinal().domain(loadedGenres).range(palette);

    draw();
  })
  .catch(function (err) {
    console.error("Could not load the dataset:", err);
  });

// redraw the full dashboard whenever the window is resized
// 150ms debounce so it doesn't fire on every pixel while dragging
// also resets interaction state so brushes don't carry over to a different layout
var resizeTimer;
window.addEventListener("resize", function () {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function () {
    if (loadedData) {
      selectedGenre = null;
      activeBrushes = {};
      draw();
    }
  }, 150);
});

// -------------------------------------------------------
// draw() wipes the SVG and redraws all three views using
// the current window size — also sets the module-level refs
// the update functions need. called on load and on resize.
// -------------------------------------------------------
function draw() {
  // wipe everything from the previous draw
  svg.selectAll("*").remove();

  var totalWidth = window.innerWidth;
  var totalHeight = window.innerHeight;

  // height of the dark header bar at the very top
  var headerH = 46;

  // left 37% = view 1 (bar chart), right 63% = view 2 (parallel coords)
  // splitY is measured from SVG top so it accounts for the header
  var splitX = Math.floor(totalWidth * 0.37);
  var splitY = headerH + Math.floor((totalHeight - headerH) * 0.55);

  // margins for view 1 — top clears the title + subtitle above the chart area
  var m1 = { top: 70, right: 20, bottom: 90, left: 70 };
  v1W = splitX - m1.left - m1.right;
  v1H = splitY - headerH - m1.top - m1.bottom;

  // margins for view 2 — right margin holds the genre legend
  var m2 = { top: 70, right: 168, bottom: 30, left: 55 };
  var v2W = totalWidth - splitX - m2.left - m2.right;
  v2H = splitY - headerH - m2.top - m2.bottom;

  // margins for view 3 — left margin is wide because genre names are long
  var m3 = { top: 58, right: 90, bottom: 50, left: 135 };
  var v3W = totalWidth - m3.left - m3.right;
  var v3H = totalHeight - splitY - m3.top - m3.bottom;

  // dimension names used by both parallel coords and the brush logic
  dims = ["HoursPerDay", "BPM", "Anxiety", "Depression", "Insomnia", "OCD"];

  // ── Background & Layout ────────────────────────────────

  // light gray fill behind all panels
  svg
    .append("rect")
    .attr("width", totalWidth)
    .attr("height", totalHeight)
    .attr("fill", "#f0f2f5");

  // dark header bar spanning the full width
  svg
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", totalWidth)
    .attr("height", headerH)
    .attr("fill", "#2d3436");

  // main dashboard title in the header
  svg
    .append("text")
    .attr("x", 20)
    .attr("y", 30)
    .attr("font-size", "17px")
    .attr("font-weight", "bold")
    .attr("fill", "#ffffff")
    .attr("font-family", "Arial, sans-serif")
    .text("Music & Mental Health Dashboard");

  // subtitle explaining what the dashboard is about
  svg
    .append("text")
    .attr("x", 320)
    .attr("y", 30)
    .attr("font-size", "12px")
    .attr("fill", "#b2bec3")
    .attr("font-family", "Arial, sans-serif")
    .text("Exploring how listening habits relate to mental health outcomes");

  // right-aligned interaction hint — offset left enough to clear the Reset Brushes button
  svg
    .append("text")
    .attr("x", totalWidth - 145)
    .attr("y", 30)
    .attr("text-anchor", "end")
    .attr("font-size", "11px")
    .attr("fill", "#b2bec3")
    .attr("font-family", "Arial, sans-serif")
    .text("Click a bar to filter by genre  ·  Drag an axis to brush a range");

  // white card behind view 1
  svg
    .append("rect")
    .attr("x", 1)
    .attr("y", headerH + 1)
    .attr("width", splitX - 2)
    .attr("height", splitY - headerH - 2)
    .attr("fill", "#ffffff")
    .attr("stroke", "#dee2e6")
    .attr("stroke-width", 1);

  // white card behind view 2
  svg
    .append("rect")
    .attr("x", splitX + 1)
    .attr("y", headerH + 1)
    .attr("width", totalWidth - splitX - 2)
    .attr("height", splitY - headerH - 2)
    .attr("fill", "#ffffff")
    .attr("stroke", "#dee2e6")
    .attr("stroke-width", 1);

  // white card behind view 3
  svg
    .append("rect")
    .attr("x", 1)
    .attr("y", splitY + 1)
    .attr("width", totalWidth - 2)
    .attr("height", totalHeight - splitY - 2)
    .attr("fill", "#ffffff")
    .attr("stroke", "#dee2e6")
    .attr("stroke-width", 1);

  // CONTEXT badge on view 1 — tells the reader this is the overview panel
  var b1 = svg
    .append("g")
    .attr("transform", "translate(8," + (headerH + 8) + ")");
  // badge pill background
  b1.append("rect")
    .attr("width", 62)
    .attr("height", 18)
    .attr("rx", 3)
    .attr("fill", "#74b9ff");
  // badge label
  b1.append("text")
    .attr("x", 31)
    .attr("y", 13)
    .attr("text-anchor", "middle")
    .attr("font-size", "9px")
    .attr("font-weight", "bold")
    .attr("fill", "#fff")
    .attr("font-family", "Arial, sans-serif")
    .text("CONTEXT");

  // FOCUS badge on view 2 — marks it as a detail panel
  var b2 = svg
    .append("g")
    .attr("transform", "translate(" + (splitX + 8) + "," + (headerH + 8) + ")");
  // badge pill background
  b2.append("rect")
    .attr("width", 50)
    .attr("height", 18)
    .attr("rx", 3)
    .attr("fill", "#e17055");
  // badge label
  b2.append("text")
    .attr("x", 25)
    .attr("y", 13)
    .attr("text-anchor", "middle")
    .attr("font-size", "9px")
    .attr("font-weight", "bold")
    .attr("fill", "#fff")
    .attr("font-family", "Arial, sans-serif")
    .text("FOCUS");

  // FOCUS badge on view 3 — marks it as a detail panel
  var b3 = svg
    .append("g")
    .attr("transform", "translate(8," + (splitY + 8) + ")");
  // badge pill background
  b3.append("rect")
    .attr("width", 50)
    .attr("height", 18)
    .attr("rx", 3)
    .attr("fill", "#e17055");
  // badge label
  b3.append("text")
    .attr("x", 25)
    .attr("y", 13)
    .attr("text-anchor", "middle")
    .attr("font-size", "9px")
    .attr("font-weight", "bold")
    .attr("fill", "#fff")
    .attr("font-family", "Arial, sans-serif")
    .text("FOCUS");

  // -------------------------------------------------------
  // VIEW 1 — Bar Chart (CONTEXT)
  // Shows how many people listed each genre as their favorite.
  // Serves as the dataset overview — clicking a bar triggers
  // the selection interaction that filters views 2 and 3.
  // -------------------------------------------------------

  // count respondents per genre, sorted most to least popular
  var genreCountsBase = d3
    .nest()
    .key(function (d) {
      return d.Genre;
    })
    .rollup(function (v) {
      return v.length;
    })
    .entries(loadedData)
    .sort(function (a, b) {
      return b.value - a.value;
    });

  // group anchored in the top-left panel
  g1 = svg
    .append("g")
    .attr("class", "view1-group")
    .attr("transform", "translate(" + m1.left + "," + (headerH + m1.top) + ")");

  // chart title positioned below the CONTEXT badge
  g1.append("text")
    .attr("x", v1W / 2)
    .attr("y", -42)
    .attr("text-anchor", "middle")
    .attr("font-size", "13px")
    .attr("font-weight", "bold")
    .attr("fill", "#2d3436")
    .attr("font-family", "Arial, sans-serif")
    .text("Respondents by Favorite Genre");

  // subtitle reminding users that bar colors match the parallel coords legend
  g1.append("text")
    .attr("x", v1W / 2)
    .attr("y", -25)
    .attr("text-anchor", "middle")
    .attr("font-size", "10px")
    .attr("fill", "#999")
    .attr("font-family", "Arial, sans-serif")
    .text(
      "Bar colors match the Genre legend in the parallel coordinates panel →",
    );

  // x scale — one band per genre, ordered by popularity
  x1 = d3
    .scaleBand()
    .domain(
      genreCountsBase.map(function (d) {
        return d.key;
      }),
    )
    .range([0, v1W])
    .padding(0.25);

  // y scale — linear from 0 to the highest genre count
  y1 = d3
    .scaleLinear()
    .domain([
      0,
      d3.max(genreCountsBase, function (d) {
        return d.value;
      }),
    ])
    .range([v1H, 0])
    .nice();

  // faint horizontal grid lines so bar heights are easy to read
  g1.selectAll(".grid-line")
    .data(y1.ticks(5))
    .enter()
    .append("line")
    .attr("class", "grid-line")
    .attr("x1", 0)
    .attr("x2", v1W)
    .attr("y1", function (d) {
      return y1(d);
    })
    .attr("y2", function (d) {
      return y1(d);
    })
    .attr("stroke", "#f0f0f0")
    .attr("stroke-width", 1);

  // x axis at the bottom — genre labels angled so they don't overlap
  g1.append("g")
    .attr("class", "x-axis")
    .attr("transform", "translate(0," + v1H + ")")
    .call(d3.axisBottom(x1).tickSize(0))
    .call(function (g) {
      g.select(".domain").attr("stroke", "#ccc");
    })
    .selectAll("text")
    .attr("transform", "rotate(-40)")
    .attr("text-anchor", "end")
    .attr("dx", "-0.4em")
    .attr("dy", "0.15em")
    .attr("font-size", "10px")
    .attr("fill", "#555");

  // y axis on the left with respondent count ticks
  g1.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(y1).ticks(5))
    .call(function (g) {
      g.select(".domain").remove();
      g.selectAll(".tick line").attr("stroke", "#f0f0f0");
      g.selectAll(".tick text").attr("fill", "#555").attr("font-size", "10px");
    });

  // x axis label
  g1.append("text")
    .attr("x", v1W / 2)
    .attr("y", v1H + m1.bottom - 5)
    .attr("text-anchor", "middle")
    .attr("font-size", "11px")
    .attr("fill", "#666")
    .attr("font-family", "Arial, sans-serif")
    .text("Favorite Genre");

  // y axis label, rotated to run vertically
  g1.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -(v1H / 2))
    .attr("y", -54)
    .attr("text-anchor", "middle")
    .attr("font-size", "11px")
    .attr("fill", "#666")
    .attr("font-family", "Arial, sans-serif")
    .text("Number of Respondents");

  // one bar per genre — colored by the shared genre color scale
  // clicking a bar triggers the selection interaction
  g1.selectAll(".bar")
    .data(genreCountsBase)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", function (d) {
      return x1(d.key);
    })
    .attr("y", function (d) {
      return y1(d.value);
    })
    .attr("width", x1.bandwidth())
    .attr("height", function (d) {
      return v1H - y1(d.value);
    })
    .attr("fill", function (d) {
      return colorScale(d.key);
    })
    .attr("rx", 2)
    .style("cursor", "pointer")
    .on("click", function (d) {
      // clicking the already-selected genre toggles it off (reset to all)
      selectedGenre = selectedGenre === d.key ? null : d.key;
      updateBarHighlight();
      updateParallelCoords();
      updateHeatmap();
    });

  // -------------------------------------------------------
  // VIEW 2 — Parallel Coordinates (FOCUS)
  // Every line is one respondent colored by their favorite genre.
  // Shows how individual listening habits connect to mental health scores.
  // Each axis has a brush — dragging selects a range and filters view 1.
  // -------------------------------------------------------

  // human-readable label for each axis
  var dimLabels = {
    HoursPerDay: "Hrs / Day",
    BPM: "BPM",
    Anxiety: "Anxiety",
    Depression: "Depression",
    Insomnia: "Insomnia",
    OCD: "OCD",
  };

  // group anchored in the top-right panel
  g2 = svg
    .append("g")
    .attr("class", "view2-group")
    .attr(
      "transform",
      "translate(" + (splitX + m2.left) + "," + (headerH + m2.top) + ")",
    );

  // chart title positioned below the FOCUS badge
  g2.append("text")
    .attr("x", v2W / 2)
    .attr("y", -42)
    .attr("text-anchor", "middle")
    .attr("font-size", "13px")
    .attr("font-weight", "bold")
    .attr("fill", "#2d3436")
    .attr("font-family", "Arial, sans-serif")
    .text("Listening Habits vs. Mental Health Scores (Parallel Coordinates)");

  // x scale — evenly spaces each dimension axis across the plot width
  x2 = d3.scalePoint().domain(dims).range([0, v2W]);

  // one y scale per dimension, each covering its own data range
  yScales = {};
  dims.forEach(function (dim) {
    yScales[dim] = d3
      .scaleLinear()
      .domain(
        d3.extent(loadedData, function (d) {
          return d[dim];
        }),
      )
      .range([v2H, 0])
      .nice();
  });

  // converts one respondent row into an SVG path by
  // connecting their value on each dimension axis in order
  function buildPath(d) {
    var points = dims
      .filter(function (dim) {
        return !isNaN(d[dim]);
      })
      .map(function (dim) {
        return [x2(dim), yScales[dim](d[dim])];
      });
    return d3.line()(points);
  }

  // draw each respondent as a thin semi-transparent colored line
  // low opacity helps reduce clutter when many lines overlap
  g2.selectAll(".pc-line")
    .data(loadedData)
    .enter()
    .append("path")
    .attr("class", "pc-line")
    .attr("d", buildPath)
    .attr("fill", "none")
    .attr("stroke", function (d) {
      return colorScale(d.Genre);
    })
    .attr("stroke-width", 1)
    .attr("opacity", 0.2);

  // draw a vertical axis for each dimension and attach a brush to it
  dims.forEach(function (dim) {
    var axisG = g2
      .append("g")
      .attr("class", "axis-" + dim)
      .attr("transform", "translate(" + x2(dim) + ",0)")
      .call(d3.axisLeft(yScales[dim]).ticks(5));

    // style axis line and tick marks to be subtle
    axisG.select(".domain").attr("stroke", "#aaa");
    axisG.selectAll(".tick line").attr("stroke", "#aaa");
    axisG
      .selectAll(".tick text")
      .attr("fill", "#555")
      .attr("font-size", "10px");

    // highlight the axis line on hover so it's clear this axis is draggable
    axisG
      .on("mouseover", function () {
        d3.select(this)
          .select(".domain")
          .attr("stroke", "#2d3436")
          .attr("stroke-width", 2);
      })
      .on("mouseout", function () {
        d3.select(this)
          .select(".domain")
          .attr("stroke", "#aaa")
          .attr("stroke-width", 1);
      });

    // dimension name label above each axis
    axisG
      .append("text")
      .attr("y", -20)
      .attr("text-anchor", "middle")
      .attr("font-size", "11px")
      .attr("font-weight", "bold")
      .attr("fill", "#444")
      .attr("font-family", "Arial, sans-serif")
      .text(dimLabels[dim]);

    // brushY on each axis — narrow width (±10px) so it hugs the axis line
    // when a range is dragged, activeBrushes is updated and both views refresh
    var brush = d3
      .brushY()
      .extent([
        [-10, 0],
        [10, v2H],
      ])
      .on("brush end", function () {
        if (d3.event.selection) {
          // convert the pixel selection back into data-space values
          activeBrushes[dim] = d3.event.selection.map(yScales[dim].invert);
        } else {
          // brush was cleared — remove this dimension from the active filter set
          delete activeBrushes[dim];
        }
        // update all three views when the brush changes
        updateParallelCoords();
        updateBarChart();
        updateHeatmap();
      });

    // append the brush group on top of the axis so it captures drag events
    // store both the instance and the group so resetBrushes() can clear them
    brushInstances[dim] = brush;
    brushGroups[dim] = axisG
      .append("g")
      .attr("class", "brush brush-" + dim)
      .call(brush);
  });

  // genre color legend to the right of the axes
  var legendG = g2
    .append("g")
    .attr("transform", "translate(" + (v2W + 22) + ",0)");

  // legend section title
  legendG
    .append("text")
    .attr("x", 0)
    .attr("y", -20)
    .attr("font-size", "11px")
    .attr("font-weight", "bold")
    .attr("fill", "#444")
    .attr("font-family", "Arial, sans-serif")
    .text("Genre");

  // one colored square + label per genre, spaced 16px apart vertically
  loadedGenres.forEach(function (genre, i) {
    var iy = i * 16;

    // color swatch square for this genre
    legendG
      .append("rect")
      .attr("x", 0)
      .attr("y", iy)
      .attr("width", 11)
      .attr("height", 11)
      .attr("rx", 2)
      .attr("fill", colorScale(genre));

    // genre name text next to the swatch
    legendG
      .append("text")
      .attr("x", 15)
      .attr("y", iy + 9)
      .attr("font-size", "10px")
      .attr("fill", "#444")
      .attr("font-family", "Arial, sans-serif")
      .text(genre);
  });

  // -------------------------------------------------------
  // VIEW 3 — Heatmap (FOCUS)
  // Average mental health score for every genre × condition combo.
  // Color encodes severity: pale yellow = low, dark red = high.
  // Dimmed by the selection interaction when a genre is clicked.
  // -------------------------------------------------------

  // the four mental health conditions used as heatmap columns
  var conditions = ["Anxiety", "Depression", "Insomnia", "OCD"];

  // pre-compute the full-dataset average for every (genre, condition) pair
  var heatData = [];
  loadedGenres.forEach(function (genre) {
    var subset = loadedData.filter(function (d) {
      return d.Genre === genre;
    });
    conditions.forEach(function (cond) {
      heatData.push({
        genre: genre,
        condition: cond,
        avg: d3.mean(subset, function (d) {
          return d[cond];
        }),
      });
    });
  });

  // group anchored in the bottom full-width panel
  g3 = svg
    .append("g")
    .attr("class", "view3-group")
    .attr("transform", "translate(" + m3.left + "," + (splitY + m3.top) + ")");

  // chart title positioned below the FOCUS badge
  g3.append("text")
    .attr("x", v3W / 2)
    .attr("y", -28)
    .attr("text-anchor", "middle")
    .attr("font-size", "13px")
    .attr("font-weight", "bold")
    .attr("fill", "#2d3436")
    .attr("font-family", "Arial, sans-serif")
    .text("Avg Mental Health Score by Genre & Condition");

  // x scale — one band per mental health condition
  var x3 = d3.scaleBand().domain(conditions).range([0, v3W]).padding(0.08);

  // y scale — one band per genre
  y3 = d3.scaleBand().domain(loadedGenres).range([0, v3H]).padding(0.08);

  // sequential color: pale yellow = lower score, dark red = higher score
  var heatColor = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, 10]);

  // x axis along the bottom showing condition names
  g3.append("g")
    .attr("transform", "translate(0," + v3H + ")")
    .call(d3.axisBottom(x3).tickSize(0))
    .call(function (g) {
      g.select(".domain").attr("stroke", "#ccc");
    })
    .selectAll("text")
    .attr("font-size", "12px")
    .attr("fill", "#555");

  // y axis on the left showing genre names
  g3.append("g")
    .call(d3.axisLeft(y3).tickSize(0))
    .call(function (g) {
      g.select(".domain").attr("stroke", "#ccc");
    })
    .selectAll("text")
    .attr("font-size", "10px")
    .attr("fill", "#555");

  // x axis label
  g3.append("text")
    .attr("x", v3W / 2)
    .attr("y", v3H + 38)
    .attr("text-anchor", "middle")
    .attr("font-size", "11px")
    .attr("fill", "#666")
    .attr("font-family", "Arial, sans-serif")
    .text("Mental Health Condition");

  // y axis label, rotated to run vertically
  g3.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -(v3H / 2))
    .attr("y", -118)
    .attr("text-anchor", "middle")
    .attr("font-size", "11px")
    .attr("fill", "#666")
    .attr("font-family", "Arial, sans-serif")
    .text("Favorite Genre");

  // one colored rectangle per (genre, condition) pair
  g3.selectAll(".cell")
    .data(heatData)
    .enter()
    .append("rect")
    .attr("class", "cell")
    .attr("x", function (d) {
      return x3(d.condition);
    })
    .attr("y", function (d) {
      return y3(d.genre);
    })
    .attr("width", x3.bandwidth())
    .attr("height", y3.bandwidth())
    .attr("rx", 2)
    .attr("fill", function (d) {
      return heatColor(d.avg);
    });

  // score text inside each cell
  // white text on dark cells, dark text on light cells so it stays legible
  g3.selectAll(".cell-label")
    .data(heatData)
    .enter()
    .append("text")
    .attr("class", "cell-label")
    .attr("x", function (d) {
      return x3(d.condition) + x3.bandwidth() / 2;
    })
    .attr("y", function (d) {
      return y3(d.genre) + y3.bandwidth() / 2 + 4;
    })
    .attr("text-anchor", "middle")
    .attr("font-size", "10px")
    .attr("font-family", "Arial, sans-serif")
    .attr("fill", function (d) {
      return d.avg > 6.5 ? "#fff" : "#333";
    })
    .text(function (d) {
      return d.avg.toFixed(1);
    });

  // vertical gradient bar legend to the right of the heatmap
  var hmLegendX = v3W + 20;
  var hmLegendW = 14;

  // SVG gradient definition: bottom stop = score 0 (pale), top stop = score 10 (dark red)
  var defs = svg.append("defs");
  var grad = defs
    .append("linearGradient")
    .attr("id", "hm-gradient")
    .attr("x1", "0%")
    .attr("y1", "100%")
    .attr("x2", "0%")
    .attr("y2", "0%");

  // five evenly spaced stops to smoothly fill the full 0–10 range
  [0, 0.25, 0.5, 0.75, 1].forEach(function (t) {
    grad
      .append("stop")
      .attr("offset", t * 100 + "%")
      .attr("stop-color", heatColor(t * 10));
  });

  // rectangle filled by the gradient definition above
  g3.append("rect")
    .attr("x", hmLegendX)
    .attr("y", 0)
    .attr("width", hmLegendW)
    .attr("height", v3H)
    .attr("rx", 2)
    .attr("fill", "url(#hm-gradient)");

  // numeric scale axis to the right of the gradient bar showing the 0–10 range
  var hmScale = d3.scaleLinear().domain([0, 10]).range([v3H, 0]);
  g3.append("g")
    .attr("transform", "translate(" + (hmLegendX + hmLegendW) + ",0)")
    .call(d3.axisRight(hmScale).ticks(5))
    .call(function (g) {
      g.select(".domain").attr("stroke", "#ccc");
      g.selectAll(".tick text").attr("fill", "#555").attr("font-size", "10px");
    });

  // label above the gradient bar
  g3.append("text")
    .attr("x", hmLegendX + hmLegendW / 2)
    .attr("y", -10)
    .attr("text-anchor", "middle")
    .attr("font-size", "10px")
    .attr("fill", "#666")
    .attr("font-family", "Arial, sans-serif")
    .text("Avg Score");
}

// updateBarHighlight() — dims bars that don't match the selected genre
// and adds a border on the one that does, no data or scale changes here
function updateBarHighlight() {
  g1.selectAll(".bar")
    .transition()
    .duration(300)
    .ease(d3.easeCubicInOut)
    // selected bar stays full opacity, everything else drops to 30%
    .attr("opacity", function (d) {
      if (!selectedGenre) return 1;
      return d.key === selectedGenre ? 1 : 0.3;
    })
    // dark border on the selected bar so it's easy to spot
    .attr("stroke", function (d) {
      return d.key === selectedGenre ? "#2d3436" : "none";
    })
    .attr("stroke-width", 2);
}

// updateParallelCoords() — fades lines in/out based on the selected genre
// and any active brushes — only shows lines that pass both
function updateParallelCoords() {
  g2.selectAll(".pc-line")
    .transition()
    .duration(300)
    .ease(d3.easeCubicInOut)
    .attr("opacity", function (d) {
      // check if this respondent falls inside all active brush ranges
      var inBrush = Object.keys(activeBrushes).every(function (dim) {
        var range = activeBrushes[dim];
        // y axis is inverted so range[0] might be larger — min/max handles that
        var lo = Math.min(range[0], range[1]);
        var hi = Math.max(range[0], range[1]);
        return d[dim] >= lo && d[dim] <= hi;
      });

      // also check genre if one is selected
      var matchesGenre = !selectedGenre || d.Genre === selectedGenre;

      // only show lines that pass both
      return matchesGenre && inBrush ? 0.65 : 0.03;
    });
}

// updateBarChart() — recomputes genre counts from just the brushed respondents,
// rescales y, and animates the bars to match
function updateBarChart() {
  // only keep respondents that pass every active brush
  var filtered = loadedData.filter(function (d) {
    return Object.keys(activeBrushes).every(function (dim) {
      var range = activeBrushes[dim];
      var lo = Math.min(range[0], range[1]);
      var hi = Math.max(range[0], range[1]);
      return d[dim] >= lo && d[dim] <= hi;
    });
  });

  // count how many filtered respondents are in each genre
  // start every genre at 0 so bars that hit zero still animate down
  var counts = {};
  loadedGenres.forEach(function (g) {
    counts[g] = 0;
  });
  filtered.forEach(function (d) {
    counts[d.Genre]++;
  });

  // rescale y so the tallest bar still fills the panel
  // fall back to 1 if everything gets filtered out so the scale doesn't break
  var maxCount = d3.max(loadedGenres, function (g) {
    return counts[g];
  });
  y1.domain([0, maxCount || 1]).nice();

  // animate bars to their new heights
  g1.selectAll(".bar")
    .transition()
    .duration(500)
    .ease(d3.easeCubicInOut)
    .attr("y", function (d) {
      return y1(counts[d.key] || 0);
    })
    .attr("height", function (d) {
      return v1H - y1(counts[d.key] || 0);
    });

  // transition the y axis ticks to match the rescaled domain
  g1.select(".y-axis")
    .transition()
    .duration(500)
    .ease(d3.easeCubicInOut)
    .call(d3.axisLeft(y1).ticks(5));

  // move grid lines to match the new y tick positions
  var gridUpdate = g1.selectAll(".grid-line").data(y1.ticks(5));

  // add new lines if there are more ticks now
  gridUpdate
    .enter()
    .append("line")
    .attr("class", "grid-line")
    .attr("x1", 0)
    .attr("x2", v1W)
    .attr("stroke", "#f0f0f0")
    .attr("stroke-width", 1)
    .attr("y1", function (d) {
      return y1(d);
    })
    .attr("y2", function (d) {
      return y1(d);
    })
    .merge(gridUpdate)
    .transition()
    .duration(500)
    .ease(d3.easeCubicInOut)
    .attr("y1", function (d) {
      return y1(d);
    })
    .attr("y2", function (d) {
      return y1(d);
    });

  // remove extra lines if there are fewer ticks now
  gridUpdate.exit().remove();
}

// resetBrushes() — clears all active brushes, resets the visual handles,
// and updates all three views back to the full dataset
function resetBrushes() {
  activeBrushes = {};
  // programmatically clear each brush rectangle so the handles disappear
  dims.forEach(function (dim) {
    if (brushGroups[dim]) {
      brushGroups[dim].call(brushInstances[dim].move, null);
    }
  });
  updateParallelCoords();
  updateBarChart();
  updateHeatmap();
}

// wire the reset button to resetBrushes()
document.getElementById("reset-btn").addEventListener("click", resetBrushes);

// updateHeatmap() — recomputes avg scores from the brushed respondents and
// animates cell colors to match — also dims rows that don't match the selected genre
function updateHeatmap() {
  var conditions = ["Anxiety", "Depression", "Insomnia", "OCD"];

  // same color scale used in draw() — recreating it here is fine since it's stateless
  var heatColor = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, 10]);

  // only keep respondents that pass every active brush (same filter as updateBarChart)
  var filtered = loadedData.filter(function (d) {
    return Object.keys(activeBrushes).every(function (dim) {
      var range = activeBrushes[dim];
      var lo = Math.min(range[0], range[1]);
      var hi = Math.max(range[0], range[1]);
      return d[dim] >= lo && d[dim] <= hi;
    });
  });

  // recompute the avg for every (genre, condition) pair from the filtered set
  // null means no respondents for that genre survived the brush
  var newAvgs = {};
  loadedGenres.forEach(function (genre) {
    var subset = filtered.filter(function (d) {
      return d.Genre === genre;
    });
    conditions.forEach(function (cond) {
      newAvgs[genre + "_" + cond] =
        subset.length > 0
          ? d3.mean(subset, function (d) {
              return d[cond];
            })
          : null;
    });
  });

  // animate cell fill colors to the new averages
  // gray out cells where no respondents passed the brush
  g3.selectAll(".cell")
    .transition()
    .duration(400)
    .ease(d3.easeCubicInOut)
    .attr("fill", function (d) {
      var avg = newAvgs[d.genre + "_" + d.condition];
      return avg != null ? heatColor(avg) : "#e8e8e8";
    })
    // selected genre row stays full opacity, everything else drops to 15%
    .attr("opacity", function (d) {
      if (!selectedGenre) return 1;
      return d.genre === selectedGenre ? 1 : 0.15;
    });

  // update the score text and dim labels to match their cell
  g3.selectAll(".cell-label")
    .transition()
    .duration(400)
    .ease(d3.easeCubicInOut)
    .text(function (d) {
      var avg = newAvgs[d.genre + "_" + d.condition];
      // show a dash when no data exists for this genre in the current brush range
      return avg != null ? avg.toFixed(1) : "—";
    })
    // keep text readable — white on dark cells, dark on light, gray on empty
    .attr("fill", function (d) {
      var avg = newAvgs[d.genre + "_" + d.condition];
      if (avg == null) return "#999";
      return avg > 6.5 ? "#fff" : "#333";
    })
    .attr("opacity", function (d) {
      if (!selectedGenre) return 1;
      return d.genre === selectedGenre ? 1 : 0.15;
    });
}
