// ECS163 Homework 2 — Pokemon Dashboard
// Dataset: pokemon_alopez247.csv  
//
// Dashboard theme:
//    Overview: count All Pokemon by primary type.
//    Context: compare average Dragon and Steel stats with a radar chart.
//    Focus: compare individual Dragon and Steel stat profiles with
//    parallel coordinates.


// Root svg for the whole dashboard.
const svg = d3.select("#dashboard");

// Six stats used in the radar and parallel-coordinates views.
const statDimensions = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];

// All primary types used to build the overview counts.
const primaryTypeOrder = [
  "Normal", "Grass", "Fire", "Water", "Bug", "Flying", "Ground", "Electric",
  "Ice", "Poison", "Fighting", "Psychic", "Rock", "Ghost", "Dragon", "Dark", "Steel", "Fairy"
];

// The two types compared in the detailed views.
const comparisonTypes = ["Dragon", "Steel"];
const comparisonTypeSet = new Set(comparisonTypes);

// Keep the same colors across all three views.
const comparisonColorScale = d3.scaleOrdinal()
  .domain(comparisonTypes)
  .range(["#6F35FC", "#74d15a"]);

// Shared panel styling.
const panel = { fill: "#fffdf7", stroke: "#d7d0bf", rx: 25
 };


// Turn CSV strings into numbers and flags we can use later.
function parseRow(d) {
  return {
    Number:     +d.Number,
    Name:       d.Name,
    Type_1:     d.Type_1 || "Unknown",
    Total:       +d.Total,
    HP:          +d.HP,
    Attack:      +d.Attack,
    Defense:     +d.Defense,
    Sp_Atk:      +d.Sp_Atk,
    Sp_Def:      +d.Sp_Def,
    Speed:       +d.Speed,
    isLegendary: d.isLegendary === "True",
  };
}


// View 1: overview bar chart.
function drawOverview(layout, data) {
  const { x, y, width, height } = layout;

  // Leave room for axes and the legend.
  const margin = { top: 60, right: 20, bottom: 83, left: 75
   };
  const iw = width - margin.left - margin.right;
  const ih = height - margin.top - margin.bottom;

  // Outer group for this panel.
  const g = svg.append("g").attr("transform", `translate(${x}, ${y})`);

  // Panel box.
  g.append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("rx", panel.rx)
    .attr("fill", panel.fill)
    .attr("stroke", panel.stroke);

  // View title.
  g.append("text")
    .attr("x", width / 2)
    .attr("y", 28)
    .attr("text-anchor", "middle")
    .attr("font-size", 20)
    .attr("font-weight", 700)
    .attr("fill", "#1f2a30")
    .text("Overview: Pokemon Count by Primary Type");

  // Short note that the charts exclude legendary Pokemon.
  g.append("text")
    .attr("x", width / 2)
    .attr("y", 44)
    .attr("text-anchor", "middle")
    .attr("font-size", 12)
    .attr("fill", "#5e6265")
    .text("*Excluding Legendary Pokemon.");

  // Inner chart area.
  const chart = g.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // Count Pokemon by primary type.
  const countMap = data.reduce(function(acc, d) {
    acc[d.Type_1] = (acc[d.Type_1] || 0) + 1;
    return acc;
  }, {});

  // Build the bar list, then sort by count.
  const typeCounts = primaryTypeOrder.map(function(type) {
    return { type: type, count: countMap[type] || 0 };
  }).sort(function(a, b) {
    return d3.descending(a.count, b.count);
  });

  const maxCount = d3.max(typeCounts, function(d) { return d.count; }) || 1;

  // Bar lengths use the count scale.
  const xScale = d3.scaleLinear()
    .domain([0, maxCount])
    .nice()
    .range([0, iw]);

  // Each type gets one row.
  const yScale = d3.scaleBand()
    .domain(typeCounts.map(function(d) { return d.type; }))
    .range([ih, 0])
    .padding(0.22);

  // Bottom axis for counts.
  chart.append("g")
    .attr("class", "x-axis")
    .attr("transform", "translate(0," + ih + ")")
    .call(d3.axisBottom(xScale).ticks(8).tickFormat(d3.format("d")))
    .selectAll("text")
      .attr("font-size", 9);

  // Left axis for types.
  chart.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(yScale))
    .selectAll("text")
      .attr("font-size", 9);

  // X-axis label.
  chart.append("text")
    .attr("x", iw / 2)
    .attr("y", ih + 40)
    .attr("text-anchor", "middle")
    .attr("font-size", 14)
    .attr("fill", "#3a484f")
    .text("Number of Pokemon");

  // Y-axis label.
  chart.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -(ih / 2))
    .attr("y", -50)
    .attr("text-anchor", "middle")
    .attr("font-size", 14
    )
    .attr("fill", "#3a484f")
    .text("Pokemon Type");

  // Bars show the type counts.
  chart.selectAll(".overview-bar")
    .data(typeCounts)
    .enter()
    .append("rect")
      .attr("class", "overview-bar")
      .attr("x", 0)
      .attr("y", function(d) { return yScale(d.type); })
      .attr("width", function(d) { return xScale(d.count); })
      .attr("height", yScale.bandwidth())
      .attr("fill", function(d) { return comparisonTypeSet.has(d.type) ? comparisonColorScale(d.type) : "#2d2b27"; })
      .attr("stroke", function(d) { return comparisonTypeSet.has(d.type) ? "#1f2a30" : "#0f0e0d"; })
      .attr("stroke-width", function(d) { return comparisonTypeSet.has(d.type) ? 1.2 : 0.6; })

    // Tooltip for each bar.
    .append("title")
      .text(function(d) { return d.type + ": " + d.count + " Pokemon with this primary type"; });

  // Put exact counts at the end of each bar.
  chart.selectAll(".overview-count")
    .data(typeCounts)
    .enter()
    .append("text")
      .attr("class", "overview-count")
      .attr("x", function(d) { return xScale(d.count) + 6; })
      .attr("y", function(d) { return yScale(d.type) + yScale.bandwidth() / 2 + 3; })
      .attr("font-size", 9)
      .attr("fill", "#27343b")
      .text(function(d) { return d.count; });

  // Legend group.
  const legend = chart.append("g")
    .attr("transform", "translate(0," + (ih + 52) + ")");

  // Dragon swatch.
  legend.append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", 12)
    .attr("height", 12)
    .attr("fill", comparisonColorScale("Dragon"))
    .attr("stroke", "#1f2a30");

  // Dragon label.
  legend.append("text")
    .attr("x", 16)
    .attr("y", 10)
    .attr("font-size", 12)
    .attr("fill", "#27343b")
    .text("Dragon type");

  // Steel swatch.
  legend.append("rect")
    .attr("x", 132)
    .attr("y", 0)
    .attr("width", 12)
    .attr("height", 12)
    .attr("fill", comparisonColorScale("Steel"))
    .attr("stroke", "#1f2a30");

  // Steel label.
  legend.append("text")
    .attr("x", 148)
    .attr("y", 10)
    .attr("font-size", 12)
    .attr("fill", "#27343b")
    .text("Steel type");

  // Other-type swatch.
  legend.append("rect")
    .attr("x", 250)
    .attr("y", 0)
    .attr("width", 12)
    .attr("height", 12)
    .attr("fill", "#020202")
    .attr("stroke", "#b7ae9b");

  // Other-type label.
  legend.append("text")
    .attr("x", 265)
    .attr("y", 10)
    .attr("font-size", 12)
    .attr("fill", "#27343b")
    .text("Other");
}

// View 2: focus radar chart.
function drawComparisonRadar(layout, data) {
  const { x, y, width, height } = layout;

  // Leave room for the legend.
  const margin = { top: 56, right: 176, bottom: 24, left: 24 };
  const iw = width - margin.left - margin.right;
  const ih = height - margin.top - margin.bottom;

  // Outer group for this panel.
  const g = svg.append("g").attr("transform", `translate(${x}, ${y})`);

  // Panel box.
  g.append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("rx", panel.rx)
    .attr("fill", panel.fill)
    .attr("stroke", panel.stroke);

  // View title.
  g.append("text")
    .attr("x", width / 2)
    .attr("y", 28)
    .attr("text-anchor", "middle")
    .attr("font-size", 20)
    .attr("font-weight", 700)
    .attr("fill", "#1f2a30")
    .text("Average Stat Profiles of Dragon vs Steel Pokemon");

  // Quick note about what the polygons mean.
  g.append("text")
    .attr("x", width / 2)
    .attr("y", 44)
    .attr("text-anchor", "middle")
    .attr("font-size", 11)
    .attr("fill", "#5e6265")
    .text("Each shape is one average stat profile for non-legendary Dragon or Steel Pokemon.");

  // Inner radar area.
  const chart = g.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // Keep just the two comparison groups.
  const comparisonData = data.filter(function(d) {
    return comparisonTypeSet.has(d.Type_1);
  });

  // Average one stat profile per type.
  const profiles = comparisonTypes.map(function(type) {
    const subset = comparisonData.filter(function(d) {
      return d.Type_1 === type;
    });

    return {
      type: type,
      count: subset.length,
      averageTotal: d3.mean(subset, function(d) { return d.Total; }) || 0,
      values: statDimensions.map(function(stat) {
        const avg = d3.mean(subset, function(d) { return d[stat]; });
        return isNaN(avg) ? 0 : avg;
      })
    };
  });

  const cx = iw / 2;
  const cy = ih / 2;
  const radius = Math.min(iw, ih) * 0.42;

  // Keep the radar scale fixed so both types are easy to compare.
  const maxStat = 150;
  const radialScale = d3.scaleLinear()
    .domain([0, maxStat])
    .range([0, radius]);

  const axisCount = statDimensions.length;
  const angleStep = (Math.PI * 2) / axisCount;

  function getAngle(i) {
    return -Math.PI / 2 + i * angleStep;
  }

  function toPoint(value, axisIndex) {
    const a = getAngle(axisIndex);
    const r = radialScale(value);
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  }

  // Reference rings.
  const ringValues = [25, 50, 75, 100, 125];
  ringValues.forEach(function(value) {
    const ringPoints = statDimensions.map(function(_, i) {
      return toPoint(value, i);
    });

    // Ring outline.
    chart.append("path")
      .attr("d", d3.line().x(function(p) { return p[0]; }).y(function(p) { return p[1]; }).curve(d3.curveLinearClosed)(ringPoints))
      .attr("fill", "none")
      .attr("stroke", "#b3ac9d")
      .attr("stroke-width", 1);

    // Ring number.
    chart.append("text")
      .attr("x", cx + 10)
      .attr("y", cy - radialScale(value) +4)
      .attr("font-size", 10)
      .attr("fill", "#050505")
      .text(value);
  });

  // One spoke and one stat label per axis.
  statDimensions.forEach(function(stat, i) {
    const outer = toPoint(maxStat, i);

    // Spoke line.
    chart.append("line")
      .attr("x1", cx)
      .attr("y1", cy)
      .attr("x2", outer[0])
      .attr("y2", outer[1])
      .attr("stroke", "#c9c1b0")
      .attr("stroke-width", 0.8);

    // Stat label.
    chart.append("text")
      .attr("x", outer[0] + (outer[0] - cx) * 0.07)
      .attr("y", outer[1] + (outer[1] - cy) * 0.07)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("font-size", 10)
      .attr("fill", "#2b3940")
      .text(stat.replace("_", " "));
  });

  // Draw one average polygon per type.
  profiles.forEach(function(profile, index) {
    const points = profile.values.map(function(value, i) {
      return toPoint(value, i);
    });
    const color = comparisonColorScale(profile.type);

    // Average polygon.
    chart.append("path")
      .attr("d", d3.line().x(function(p) { return p[0]; }).y(function(p) { return p[1]; }).curve(d3.curveLinearClosed)(points))
      .attr("fill", color)
      .attr("fill-opacity", index === 0 ? 0.16 : 0.12)
      .attr("stroke", color)
      .attr("stroke-width", index === 0 ? 2.6 : 2.2)
      .attr("stroke-dasharray", profile.type === "Steel" ? "5,3" : null)

      // Tooltip for the polygon.
      .append("title")
        .text("Average " + profile.type + " primary-type stat profile");

    // Dots show the average value on each spoke.
    chart.selectAll(".point-" + profile.type)
      .data(points)
      .enter()
      .append("circle")
        .attr("class", "point-" + profile.type)
        .attr("cx", function(point) { return point[0]; })
        .attr("cy", function(point) { return point[1]; })
        .attr("r", 2.3)
        .attr("fill", color)
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 0.7);
  });

  // Legend group.
  const legend = g.append("g")
    .attr("transform", `translate(${width - 160}, 100)`);

  const totalFormat = d3.format(".1f");

  // Legend title.
  legend.append("text")
    .attr("x", 0)
    .attr("y", -8)
    .attr("font-size", 14)
    .attr("font-weight", 600)
    .attr("fill", "#2b3940")
    .text("Legend");

  // One legend row per type.
  profiles.forEach(function(profile, i) {
    const rowY = i * 58;

    // Legend line sample.
    legend.append("line")
      .attr("x1", 0)
      .attr("y1", rowY + 10)
      .attr("x2", 14)
      .attr("y2", rowY + 10)
      .attr("stroke", comparisonColorScale(profile.type))
      .attr("stroke-width", profile.type === "Dragon" ? 2.6 : 2.2)
      .attr("stroke-dasharray", profile.type === "Steel" ? "5,3" : null);

    // Type name.
    legend.append("text")
      .attr("x", 20)
      .attr("y", rowY + 13)
      .attr("font-size", 12)
      .attr("fill", "#2b3940")
      .text(profile.type + " average");

    // Average total for that type.
    legend.append("text")
      .attr("x", 0)
      .attr("y", rowY + 35)
      .attr("font-size", 12)
      .attr("fill", "#5b6a72")
      .text("Avg Total = " + totalFormat(profile.averageTotal));
  });
}


// View 3: advanced parallel coordinates.
function drawComparisonParallelCoordinates(layout, data) {
  const { x, y, width, height } = layout;

  // Leave room for the legend.
  const margin = { top: 56, right: 160, bottom: 24, left: 36 };
  const iw = width - margin.left - margin.right;
  const ih = height - margin.top - margin.bottom;

  // Outer group for this panel.
  const g = svg.append("g").attr("transform", `translate(${x}, ${y})`);

  // Panel box.
  g.append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("rx", panel.rx)
    .attr("fill", panel.fill)
    .attr("stroke", panel.stroke);

  // View title.
  g.append("text")
    .attr("x", width / 2)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .attr("font-size", 20)
    .attr("font-weight", 600)
    .attr("fill", "#1f2a30")
    .text(" Individual Dragon vs Steel Stat Profiles");

  

  // Inner chart area.
  const chart = g.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // Keep just the two comparison groups.
  const comparisonData = data.filter(function(d) {
    return comparisonTypeSet.has(d.Type_1);
  });

  // Put Type first, then the stat axes in the chosen order.
  const parallelStatDimensions = ["Speed", "Attack", "Sp_Atk", "HP", "Defense", "Sp_Def"];
  const axisDimensions = ["Type"].concat(parallelStatDimensions);

  // X positions for the vertical axes.
  const xScale = d3.scalePoint()
    .domain(axisDimensions)
    .range([0, iw])
    .padding(0.35);

  // Type gets its own categorical scale.
  const yScales = {};

  yScales.Type = d3.scalePoint()
    .domain(comparisonTypes)
    .range([0, ih])
    .padding(0.5);

  // All stat axes share one numeric scale.
  const sharedStatMax = d3.max(comparisonData, function(d) {
    return d3.max(parallelStatDimensions, function(stat) {
      return d[stat];
    });
  }) || 1;

  const sharedStatScale = d3.scaleLinear()
    .domain([0, sharedStatMax])
    .nice()
    .range([ih, 0]);

  parallelStatDimensions.forEach(function(stat) {
    yScales[stat] = sharedStatScale;
  });

  // Build one line across the type axis and stat axes.
  function buildLine(d) {
    const points = axisDimensions.map(function(dimension) {
      if (dimension === "Type") {
        return [xScale(dimension), yScales.Type(d.Type_1)];
      }

      return [xScale(dimension), yScales[dimension](d[dimension])];
    });

    return d3.line()
      .x(function(point) { return point[0]; })
      .y(function(point) { return point[1]; })(points);
  }

  // Draw one line per Pokemon.
  chart.selectAll(".pokemon-profile")
    .data(comparisonData)
    .enter()
    .append("path")
      .attr("class", "pokemon-profile")
      .attr("d", function(d) { return buildLine(d); })
      .attr("fill", "none")
      .attr("stroke", function(d) { return comparisonColorScale(d.Type_1); })
      .attr("stroke-width", 1.8)
      .attr("stroke-opacity", 0.52)

    // Tooltip for each Pokemon line.
    .append("title")
      .text(function(d) { return d.Name + " | " + d.Type_1 + " | Total: " + d.Total; });

  // Draw the type axis and the shared-scale stat axes.
  axisDimensions.forEach(function(dimension) {
    const axisGroup = chart.append("g")
      .attr("transform", `translate(${xScale(dimension)}, 0)`);

    // Draw the axis. Type tick labels stay hidden because the legend already names the groups.
    if (dimension === "Type") {
      axisGroup.call(d3.axisLeft(yScales.Type).tickSize(6).tickFormat(function() { return ""; }));
    } else {
      axisGroup.call(d3.axisLeft(yScales[dimension]).ticks(5));
    }

    axisGroup.selectAll("text")
      .attr("font-size", 10)
      .attr("fill", "#55636a");

    axisGroup.selectAll("path, line")
      .attr("stroke", "#5f5c55");

    // Axis title.
    axisGroup.append("text")
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .attr("font-size", 11)
      .attr("font-weight", 700)
      .attr("fill", "#27343b")
      .text(dimension === "Type" ? "Type" : dimension.replace("_", " "));
  });

  // Legend group.
  const legend = g.append("g")
    .attr("transform", `translate(${width - 138}, 80)`);

  // Legend title.
  legend.append("text")
    .attr("x", 0)
    .attr("y", -10)
    .attr("font-size", 14)
    .attr("font-weight", 600)
    .attr("fill", "#27343b")
    .text("Type legend");

  const typeCounts = comparisonTypes.map(function(type) {
    return {
      type: type,
      count: comparisonData.filter(function(d) { return d.Type_1 === type; }).length
    };
  });

  // One legend row per type.
  typeCounts.forEach(function(item, i) {
    const rowY = i * 24;

    // Line sample.
    legend.append("line")
      .attr("x1", 0)
      .attr("y1", rowY + 5)
      .attr("x2", 14)
      .attr("y2", rowY + 5)
      .attr("stroke", comparisonColorScale(item.type))
      .attr("stroke-width", 3);

    // Type label and count.
    legend.append("text")
      .attr("x", 18)
      .attr("y", rowY + 10)
      .attr("font-size", 14)
      .attr("fill", "#27343b")
      .text(item.type );
  });
}


// Recompute the layout and redraw all three panels.
function render(data) {
  const W = document.documentElement.clientWidth;
  const H = document.documentElement.clientHeight;

  // Fill the browser window.
  svg.attr("width", W).attr("height", H);

  // Clear the old drawing before redrawing.
  svg.selectAll("*").remove();

  // Shared layout numbers.
  const pad  = 14;
  const gap  = 5;
  const topH = Math.round(H * 0.50);
  const botH = H - pad * 2 - topH - gap;
  const totW = W - pad * 2;

  // Split the top row between overview and focus.
  const overviewW = Math.round(totW * 0.45);
  const focusW    = totW - overviewW - gap;

  const overviewLayout = { x: pad,                   y: pad,              width: overviewW, height: topH };
  const focusLayout    = { x: pad + overviewW + gap,  y: pad,              width: focusW,    height: topH };
  const advancedLayout = { x: pad,                   y: pad + topH + gap, width: totW,      height: botH };

  // Draw the three views.
  drawOverview(overviewLayout, data);
  drawComparisonRadar(focusLayout, data);
  drawComparisonParallelCoordinates(advancedLayout, data);
}


// Load the CSV, drop rows we do not want, then render.
d3.csv("pokemon_alopez247.csv", parseRow)
  .then(function(data) {
    // Keep only non-legendary rows with all required numbers.
    const clean = data.filter(function(d) {
      return d.Type_1
        && !d.isLegendary
        && !isNaN(d.Total)
        && statDimensions.every(function(stat) { return !isNaN(d[stat]); });
    });

    render(clean);

    // Redraw on resize so the dashboard stays fullscreen.
    window.addEventListener("resize", function() { render(clean); });
  });