// hw2 ecs163
// 3 graphs total - heatmap + scatter + parallel (prof wanted an "advanced" one)

var expOrder = ["EN", "MI", "SE", "EX"];
var sizeOrder = ["S", "M", "L"];

function parseRow(d) {
  return {
    work_year: +d.work_year,
    experience_level: d.experience_level,
    employment_type: d.employment_type,
    job_title: d.job_title,
    salary_in_usd: +d.salary_in_usd,
    remote_ratio: +d.remote_ratio,
    employee_residence: d.employee_residence,
    company_location: d.company_location,
    company_size: d.company_size,
  };
}

// parallel chart needs numbers not letters for exp level
function expToNum(level) {
  var i = expOrder.indexOf(level);
  if (i < 0) return NaN;
  return i;
}

function sizeToNum(sz) {
  var j = sizeOrder.indexOf(sz);
  if (j < 0) return NaN;
  return j;
}

var allRows = [];
var parallelRows = []; // after u brush scatter, this is what goes in parallel plot
var brushSelection = null;

var overviewRoot = d3.select("#panel-overview");
var scatterRoot = d3.select("#panel-scatter");
var parallelRoot = d3.select("#panel-parallel");

// === heatmap / overview thing ===
function drawOverviewHeatmap(rows, width, height) {
  overviewRoot.selectAll("*").remove();

  var margin = { top: 6, right: 120, bottom: 34, left: 52 };
  var innerW = width - margin.left - margin.right;
  var innerH = height - margin.top - margin.bottom;
  if (innerW < 0) innerW = 0;
  if (innerH < 0) innerH = 0;

  overviewRoot.append("h2").attr("class", "chart-title").text("Overview: median salary by exp level + company size");

  overviewRoot
    .append("p")
    .attr("class", "hint")
    .text("heatmap: blue = higher median pay. rows are experience, cols are company size");

  var wrap = overviewRoot.append("div").attr("class", "svg-wrap");

  var svg = wrap.append("svg").attr("width", width).attr("height", height); // whole chart

  var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")"); // inner part

  var rolled = d3.rollup(
    rows,
    function (v) {
      return d3.median(v, function (r) {
        return r.salary_in_usd;
      });
    },
    function (r) {
      return r.experience_level;
    },
    function (r) {
      return r.company_size;
    }
  );

  var cells = [];
  for (var a = 0; a < expOrder.length; a++) {
    for (var b = 0; b < sizeOrder.length; b++) {
      var exp = expOrder[a];
      var sz = sizeOrder[b];
      var innerMap = rolled.get(exp);
      var med = innerMap ? innerMap.get(sz) : undefined;
      cells.push({ experience_level: exp, company_size: sz, median: med });
    }
  }

  var nums = [];
  for (var k = 0; k < cells.length; k++) {
    if (typeof cells[k].median === "number") nums.push(cells[k].median);
  }
  var vmin = d3.min(nums);
  var vmax = d3.max(nums);
  if (vmin == null) vmin = 0;
  if (vmax == null) vmax = 1;

  var colorScale = d3.scaleSequential(d3.interpolateBlues).domain([vmin, vmax]); // blue = more $$

  var x = d3.scaleBand().domain(sizeOrder).range([0, innerW]).paddingInner(0.08).paddingOuter(0.02);
  var y = d3.scaleBand().domain(expOrder).range([0, innerH]).paddingInner(0.08).paddingOuter(0.02);

  g.selectAll("rect.cell") // each box
    .data(cells)
    .join("rect")
    .attr("class", "cell")
    .attr("x", function (d) {
      return x(d.company_size);
    })
    .attr("y", function (d) {
      return y(d.experience_level);
    })
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("rx", 3)
    .attr("ry", 3)
    .attr("fill", function (d) {
      if (typeof d.median === "number") return colorScale(d.median);
      return "#eef2f7";
    })
    .attr("stroke", "#fff")
    .attr("stroke-width", 1);

  g.selectAll("text.cell-label") // number in middle of box
    .data(cells)
    .join("text")
    .attr("class", "cell-label")
    .attr("x", function (d) {
      return x(d.company_size) + x.bandwidth() / 2;
    })
    .attr("y", function (d) {
      return y(d.experience_level) + y.bandwidth() / 2;
    })
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .attr("font-size", Math.min(11, 0.22 * Math.min(x.bandwidth(), y.bandwidth())))
    .attr("fill", function (d) {
      if (typeof d.median !== "number") return "#666";
      var t = (d.median - vmin) / (vmax - vmin || 1);
      if (t > 0.62) return "#fff";
      return "#111";
    })
    .text(function (d) {
      if (typeof d.median === "number") return d3.format("~s")(d.median);
      return "-";
    });

  var xAxis = d3.axisBottom(x).tickSizeOuter(0);
  var yAxis = d3.axisLeft(y).tickSizeOuter(0);

  var xg = g.append("g").attr("transform", "translate(0," + innerH + ")").call(xAxis);
  xg.selectAll("text").attr("font-size", 11);

  var yg = g.append("g").call(yAxis);
  yg.selectAll("text").attr("font-size", 11);

  g.append("text") // x label
    .attr("x", innerW / 2)
    .attr("y", innerH + 30)
    .attr("text-anchor", "middle")
    .attr("font-size", 12)
    .text("company size");

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2)
    .attr("y", -38)
    .attr("text-anchor", "middle")
    .attr("font-size", 12)
    .text("experience level"); // y label (sideways)

  // color bar on the side - followed a tutorial-ish thing for gradient
  var legendW = 16;
  var legendH = innerH;
  var defs = svg.append("defs");
  var grad = defs
    .append("linearGradient")
    .attr("id", "salaryGrad")
    .attr("x1", "0%")
    .attr("y1", "100%")
    .attr("x2", "0%")
    .attr("y2", "0%");

  var stops = 10;
  for (var s = 0; s <= stops; s++) {
    var t = s / stops;
    grad.append("stop").attr("offset", t * 100 + "%").attr("stop-color", colorScale(vmin + t * (vmax - vmin)));
  }

  var legG = g.append("g").attr("transform", "translate(" + (innerW + 18) + ",0)");

  legG.append("rect").attr("width", legendW).attr("height", legendH).attr("fill", "url(#salaryGrad)").attr("stroke", "#ccc");

  var legY = d3.scaleLinear().domain([vmin, vmax]).range([legendH, 0]);
  legG.append("g").attr("transform", "translate(" + legendW + ",0)").call(d3.axisRight(legY).ticks(4).tickFormat(function (v) { return d3.format("~s")(v); }));

  legG.append("text").attr("x", legendW + 34).attr("y", -6).attr("font-size", 11).text("median salary usd");
}

// === scatter ===
function drawScatter(rows, width, height, whenBrushDone) {
  scatterRoot.selectAll("*").remove();

  var margin = { top: 6, right: 18, bottom: 44, left: 64 };
  var innerW = Math.max(0, width - margin.left - margin.right);
  var innerH = Math.max(0, height - margin.top - margin.bottom);

  scatterRoot.append("h2").attr("class", "chart-title").text("scatter: salary vs remote % (you can brush)");

  scatterRoot.append("p").attr("class", "hint").text("dots = rows from csv. brushing updates the parallel coords chart");

  var wrap = scatterRoot.append("div").attr("class", "svg-wrap");
  var svg = wrap.append("svg").attr("width", width).attr("height", height);
  var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var x = d3
    .scaleLinear()
    .domain(d3.extent(rows, function (d) { return d.remote_ratio; }))
    .range([0, innerW])
    .nice();

  var y = d3
    .scaleLinear()
    .domain(d3.extent(rows, function (d) { return d.salary_in_usd; }))
    .range([innerH, 0])
    .nice();

  var catColors = d3.scaleOrdinal().domain(expOrder).range(["#7c3aed", "#2563eb", "#059669", "#d97706"]); // random colors that dont blend together too bad

  // grid behind dots (weird trick w axis ticks)
  var gx = g.append("g").attr("transform", "translate(0," + innerH + ")");
  gx.call(d3.axisBottom(x).ticks(6).tickSize(-innerH).tickFormat(""));
  gx.select(".domain").remove();
  gx.selectAll("line").attr("stroke", "#eee");

  var gy = g.append("g");
  gy.call(d3.axisLeft(y).ticks(6).tickSize(-innerW).tickFormat(""));
  gy.select(".domain").remove();
  gy.selectAll("line").attr("stroke", "#eee");

  g.selectAll("circle.pt") // dots
    .data(rows)
    .join("circle")
    .attr("class", "pt")
    .attr("cx", function (d) {
      return x(d.remote_ratio);
    })
    .attr("cy", function (d) {
      return y(d.salary_in_usd);
    })
    .attr("r", 2.2)
    .attr("fill", function (d) {
      return catColors(d.experience_level);
    })
    .attr("fill-opacity", 0.35)
    .attr("stroke", function (d) {
      return d3.color(catColors(d.experience_level)).darker(0.35);
    })
    .attr("stroke-opacity", 0.25);

  g.append("g").attr("transform", "translate(0," + innerH + ")").call(d3.axisBottom(x).ticks(6));
  g.append("g").call(d3.axisLeft(y).ticks(6).tickFormat(function (v) { return d3.format("~s")(v); }));

  g.append("text").attr("x", innerW / 2).attr("y", innerH + 36).attr("text-anchor", "middle").attr("font-size", 12).text("remote ratio %");

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2)
    .attr("y", -46)
    .attr("text-anchor", "middle")
    .attr("font-size", 12)
    .text("salary usd");

  var leg = svg.append("g").attr("transform", "translate(" + (margin.left + innerW - 150) + "," + (margin.top + 6) + ")"); // legend stuck in corner
  leg.append("text").attr("x", 0).attr("y", -2).attr("font-size", 11).text("experience");

  for (var i = 0; i < expOrder.length; i++) {
    var exp = expOrder[i];
    var rowg = leg.append("g").attr("transform", "translate(0," + i * 14 + ")");
    rowg.append("rect").attr("x", 0).attr("y", -8).attr("width", 10).attr("height", 10).attr("rx", 2).attr("fill", catColors(exp));
    rowg.append("text").attr("x", 14).attr("y", 0).attr("dominant-baseline", "middle").attr("font-size", 10).text(exp);
  }

  var brush = d3
    .brush()
    .extent([
      [0, 0],
      [innerW, innerH],
    ])
    .on("end", function (event) {
      var sel = event.selection;
      brushSelection = sel;
      if (!sel) {
        whenBrushDone(rows);
        return;
      }
      var x0 = sel[0][0];
      var y0 = sel[0][1];
      var x1 = sel[1][0];
      var y1 = sel[1][1];
      var rx0 = Math.min(x0, x1);
      var rx1 = Math.max(x0, x1);
      var ry0 = Math.min(y0, y1);
      var ry1 = Math.max(y0, y1);

      var xmin = x.invert(rx0);
      var xmax = x.invert(rx1);
      var ymin = y.invert(ry1); // y scale is flipped so had to mess w this a bit
      var ymax = y.invert(ry0);

      var out = [];
      for (var r = 0; r < rows.length; r++) {
        var d = rows[r];
        if (d.remote_ratio >= xmin && d.remote_ratio <= xmax && d.salary_in_usd >= ymin && d.salary_in_usd <= ymax) {
          out.push(d);
        }
      }
      whenBrushDone(out);
    });

  var brushG = g.append("g").attr("class", "brush").call(brush); // drag box thing
  if (brushSelection) {
    brushG.call(brush.move, brushSelection);
  }
}

// === parallel coords (counts as advanced) ===
function drawParallel(rows, width, height) {
  parallelRoot.selectAll("*").remove();

  // extra bottom room so legend isnt on top of axis ticks
  var margin = { top: 6, right: 24, bottom: 52, left: 34 };
  var innerW = Math.max(0, width - margin.left - margin.right);
  var innerH = Math.max(0, height - margin.top - margin.bottom);

  if (!rows.length) {
    parallelRoot.append("h2").attr("class", "chart-title").text("parallel coords");
    parallelRoot.append("p").attr("class", "hint").text("nothing selected - clear brush on scatter");
    return;
  }

  parallelRoot.append("h2").attr("class", "chart-title").text("parallel coordinates (advanced)");

  parallelRoot
    .append("p")
    .attr("class", "hint")
    .text(
      "showing " + rows.length + " of " + allRows.length + " lines. axes use full csv range (not just the brush) so it doesnt look broken"
    );

  var wrap = parallelRoot.append("div").attr("class", "svg-wrap");
  var svg = wrap.append("svg").attr("width", width).attr("height", height);
  var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var dims = [
    { key: "work_year", label: "year", get: function (d) { return d.work_year; } },
    { key: "exp_rank", label: "exp (0-3)", get: function (d) { return expToNum(d.experience_level); } },
    { key: "salary", label: "salary", get: function (d) { return d.salary_in_usd; } },
    { key: "remote", label: "remote %", get: function (d) { return d.remote_ratio; } },
    { key: "size_rank", label: "size (0-2)", get: function (d) { return sizeToNum(d.company_size); } },
  ];

  var keys = [];
  for (var kk = 0; kk < dims.length; kk++) keys.push(dims[kk].key);

  var xDim = d3.scalePoint().domain(keys).range([0, innerW]).padding(0.55);

  // if u only use brushed rows for domain the lines jump around and look wrong
  var yScales = {};
  for (var di = 0; di < dims.length; di++) {
    var dim = dims[di];
    var vals = [];
    for (var rr = 0; rr < allRows.length; rr++) {
      var v = dim.get(allRows[rr]);
      if (typeof v === "number" && !isNaN(v)) vals.push(v);
    }
    var lo = d3.min(vals);
    var hi = d3.max(vals);
    if (lo == null) lo = 0;
    if (hi == null) hi = 1;
    yScales[dim.key] = d3.scaleLinear().domain([lo, hi]).range([innerH, 0]).nice(); // per column y
  }

  var lineGen = d3
    .line()
    .defined(function (pt) {
      return typeof pt[1] === "number" && !isNaN(pt[1]);
    })
    .x(function (pt) {
      return xDim(pt[0]);
    })
    .y(function (pt) {
      return pt[1];
    });

  function makePath(d) {
    var pts = [];
    for (var ii = 0; ii < dims.length; ii++) {
      var dm = dims[ii];
      var val = dm.get(d);
      var yy = yScales[dm.key](val);
      pts.push([dm.key, yy]);
    }
    return lineGen(pts);
  }

  var colors2 = d3.scaleOrdinal().domain(expOrder).range(["#7c3aed", "#2563eb", "#059669", "#d97706"]); // should match scatter

  g.selectAll("path.pc") // spaghetti lines lol
    .data(rows)
    .join("path")
    .attr("class", "pc")
    .attr("d", makePath)
    .attr("fill", "none")
    .attr("stroke", function (d) {
      return colors2(d.experience_level);
    })
    .attr("stroke-opacity", 0.18)
    .attr("stroke-width", 1.1);

  var axisLayer = g.append("g");

  for (var ai = 0; ai < dims.length; ai++) {
    var dm2 = dims[ai];
    var xx = xDim(dm2.key);
    var ys = yScales[dm2.key];
    axisLayer.append("g").attr("transform", "translate(" + xx + ",0)").call(d3.axisLeft(ys).ticks(4)).selectAll("text").attr("font-size", 9); // ticks for that axis

    axisLayer.append("text").attr("x", xx).attr("y", -6).attr("text-anchor", "middle").attr("font-size", 10).text(dm2.label);
  }

  var leg2 = svg.append("g").attr("transform", "translate(" + (margin.left + 8) + "," + (margin.top + innerH + 10) + ")");
  leg2.append("text").attr("font-size", 11).attr("y", 10).text("legend (experience):");

  for (var j = 0; j < expOrder.length; j++) {
    var e = expOrder[j];
    var lx = j * 78;
    var ly = 24;
    var rg = leg2.append("g").attr("transform", "translate(" + lx + "," + ly + ")");
    rg.append("line").attr("x1", 0).attr("x2", 18).attr("y1", 0).attr("y2", 0).attr("stroke", colors2(e)).attr("stroke-width", 3);
    rg.append("text").attr("x", 22).attr("y", 0).attr("dominant-baseline", "middle").attr("font-size", 10).text(e);
  }
}

function getBox(el) {
  if (!el) return { width: 10, height: 10 };
  var r = el.getBoundingClientRect();
  // chop off some px for the title text at top of each panel (not perfect)
  var h = Math.floor(r.height - 56);
  var w = Math.floor(r.width - 16);
  if (h < 10) h = 10;
  if (w < 10) w = 10;
  return { width: w, height: h };
}

function layoutDashboard() {
  var ov = document.querySelector("#panel-overview");
  var sc = document.querySelector("#panel-scatter");
  var pc = document.querySelector("#panel-parallel");

  var b1 = getBox(ov);
  var b2 = getBox(sc);
  var b3 = getBox(pc);

  drawOverviewHeatmap(allRows, b1.width, b1.height);

  drawScatter(allRows, b2.width, b2.height, function (filtered) {
    parallelRows = filtered;
    drawParallel(parallelRows, b3.width, b3.height);
  });

  if (parallelRows.length > 0) {
    drawParallel(parallelRows, b3.width, b3.height);
  } else {
    drawParallel(allRows, b3.width, b3.height);
  }
}

d3.csv("data/ds_salaries.csv", parseRow).then(function (rows) {
  allRows = [];
  for (var i = 0; i < rows.length; i++) {
    var d = rows[i];
    if (!isFinite(d.salary_in_usd)) continue;
    if (!isFinite(d.remote_ratio)) continue;
    if (!isFinite(d.work_year)) continue;
    if (expOrder.indexOf(d.experience_level) < 0) continue;
    if (sizeOrder.indexOf(d.company_size) < 0) continue;
    allRows.push(d);
  }

  parallelRows = [];
  brushSelection = null;
  layoutDashboard();

  // on resize the brush rectangle gets messed up so i just reset it
  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      brushSelection = null;
      parallelRows = [];
      layoutDashboard();
    }, 150);
  });
});
