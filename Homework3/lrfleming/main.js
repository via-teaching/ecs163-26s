const svg = d3.select("svg");
const tooltip = d3.select("#tooltip");

const width = window.innerWidth;
const height = window.innerHeight - 74;

// This timer lets the dashboard reload after resizing, instead of trying to redraw while the user is still dragging the window.
let resizeTimer;
window.addEventListener("resize", function() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function() {
    location.reload();
  }, 350);
});

// These layout values split the page into one overview and two focus views.
const leftWidth = width * 0.38;
const rightWidth = width * 0.62;
const topHeight = height * 0.52;
const bottomHeight = height * 0.48;

// Margins are shared so the charts line up in a simple dashboard layout.
const margin = {
  top: 45,
  right: 45,
  bottom: 60,
  left: 65
};

// This color scale keeps Pokemon type colors consistent in every view.
const typeColor = d3.scaleOrdinal(d3.schemeCategory10);

// These variables remember what the user has selected.
let allPokemon = [];
let allTypes = [];
let selectedType = null;
let brushedNumbers = new Set();
let currentSort = "name";

// These objects store chart pieces that need to be updated after interactions.
let barChart = {};
let scatterChart = {};
let parallelChart = {};
let detailChart = {};

// Load the Pokemon dataset from the local data folder.
d3.csv("data/pokemon_alopez247.csv").then(function(data) {
  // Convert stat columns from strings into numbers so the scales are correct.
  data.forEach(function(d) {
    d.Number = +d.Number;
    d.Total = +d.Total;
    d.HP = +d.HP;
    d.Attack = +d.Attack;
    d.Defense = +d.Defense;
    d.Sp_Atk = +d.Sp_Atk;
    d.Sp_Def = +d.Sp_Def;
    d.Speed = +d.Speed;
    d.Generation = +d.Generation;
    d.Height_m = +d.Height_m;
    d.Weight_kg = +d.Weight_kg;
  });

  allPokemon = data;
  allTypes = Array.from(new Set(data.map(d => d.Type_1))).sort();
  typeColor.domain(allTypes);

  drawOverviewBars();
  drawScatterPlot();
  drawParallelCoordinates();
  drawDetailPanel();
  updateDashboard();
}).catch(function(error) {
  console.log("Error loading the dataset:", error);
});

// Sort button changes the overview from alphabetical ordering back to A-Z.
d3.select("#sort-name").on("click", function() {
  currentSort = "name";
  updateDashboard();
});

// Sort button changes the overview ordering to show the largest types first.
d3.select("#sort-count").on("click", function() {
  currentSort = "count";
  updateDashboard();
});

// Reset button clears both the clicked type and the brushed scatterplot points.
d3.select("#reset").on("click", function() {
  selectedType = null;
  brushedNumbers = new Set();
  scatterChart.brushGroup.call(scatterChart.brush.move, null);
  updateDashboard();
});

function getTypeCounts() {
  // Count how many Pokemon belong to each primary type.
  const counts = allTypes.map(function(type) {
    return {
      type: type,
      count: allPokemon.filter(d => d.Type_1 === type).length
    };
  });

  if (currentSort === "count") {
    counts.sort((a, b) => d3.descending(a.count, b.count));
  } else {
    counts.sort((a, b) => d3.ascending(a.type, b.type));
  }

  return counts;
}

function getVisiblePokemon() {
  // The clicked type controls the main focus subset.
  if (selectedType === null) {
    return allPokemon;
  }

  return allPokemon.filter(d => d.Type_1 === selectedType);
}

function getBrushedPokemon() {
  // Brushing is optional, so this returns an empty list when there is no brush.
  if (brushedNumbers.size === 0) {
    return [];
  }

  return allPokemon.filter(d => brushedNumbers.has(d.Number));
}

function drawOverviewBars() {
  const chartWidth = leftWidth;
  const chartHeight = topHeight;
  const innerWidth = chartWidth - margin.left - margin.right;
  const innerHeight = chartHeight - margin.top - margin.bottom;

  // This group holds the overview chart.
  const g = svg.append("g")
    .attr("transform", "translate(0,0)");

  // This title explains the overview chart.
  g.append("text")
    .attr("class", "chart-title")
    .attr("x", chartWidth / 2)
    .attr("y", 24)
    .attr("text-anchor", "middle")
    .text("Overview: Pokemon by Primary Type");

  // This note tells the user that the bars are clickable.
  g.append("text")
    .attr("class", "small-note")
    .attr("x", chartWidth / 2)
    .attr("y", 39)
    .attr("text-anchor", "middle")
    .text("Click a bar to focus the dashboard on one type.");

  // This inner group keeps the bars inside the chart margins.
  const chart = g.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand()
    .range([0, innerWidth])
    .padding(0.2);

  const y = d3.scaleLinear()
    .range([innerHeight, 0]);

  // This group will hold the x-axis for type names.
  const xAxis = chart.append("g")
    .attr("transform", `translate(0,${innerHeight})`);

  // This group will hold the y-axis for Pokemon counts.
  const yAxis = chart.append("g");

  // This label names the x-axis.
  chart.append("text")
    .attr("class", "axis-label")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 52)
    .attr("text-anchor", "middle")
    .text("Primary Type");

  // This label names the y-axis.
  chart.append("text")
    .attr("class", "axis-label")
    .attr("x", -innerHeight / 2)
    .attr("y", -45)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .text("Number of Pokemon");

  barChart = {
    chart: chart,
    x: x,
    y: y,
    xAxis: xAxis,
    yAxis: yAxis,
    innerWidth: innerWidth,
    innerHeight: innerHeight
  };
}

function drawScatterPlot() {
  const chartWidth = rightWidth;
  const chartHeight = topHeight;
  const innerWidth = chartWidth - margin.left - 145;
  const innerHeight = chartHeight - margin.top - margin.bottom;

  // This group holds the focus scatterplot.
  const g = svg.append("g")
    .attr("transform", `translate(${leftWidth},0)`);

  // This title explains the scatterplot focus view.
  g.append("text")
    .attr("class", "chart-title")
    .attr("x", chartWidth / 2)
    .attr("y", 24)
    .attr("text-anchor", "middle")
    .text("Focus View: Attack vs Defense");

  // This note explains the brushing interaction.
  g.append("text")
    .attr("class", "small-note")
    .attr("x", chartWidth / 2)
    .attr("y", 39)
    .attr("text-anchor", "middle")
    .text("Brush a rectangle to compare only those Pokemon in the lower view.");

  // This inner group keeps scatterplot marks inside the margins.
  const chart = g.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
    .domain([0, d3.max(allPokemon, d => d.Attack)])
    .nice()
    .range([0, innerWidth]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(allPokemon, d => d.Defense)])
    .nice()
    .range([innerHeight, 0]);

  // This group draws horizontal grid lines behind the dots.
  chart.append("g")
    .attr("class", "grid")
    .attr("opacity", 0.14)
    .call(d3.axisLeft(y).tickSize(-innerWidth).tickFormat(""));

  // This group draws vertical grid lines behind the dots.
  chart.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(0,${innerHeight})`)
    .attr("opacity", 0.14)
    .call(d3.axisBottom(x).tickSize(-innerHeight).tickFormat(""));

  // This group draws the x-axis for Attack.
  chart.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x));

  // This group draws the y-axis for Defense.
  chart.append("g")
    .call(d3.axisLeft(y));

  // This label names the x-axis.
  chart.append("text")
    .attr("class", "axis-label")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 42)
    .attr("text-anchor", "middle")
    .text("Attack");

  // This label names the y-axis.
  chart.append("text")
    .attr("class", "axis-label")
    .attr("x", -innerHeight / 2)
    .attr("y", -45)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .text("Defense");

  // This group holds all scatterplot circles.
  const dots = chart.append("g")
    .attr("class", "dots")
    .selectAll(".pokemon-dot")
    .data(allPokemon)
    .enter()
    .append("circle")
    .attr("class", "pokemon-dot")
    .attr("cx", d => x(d.Attack))
    .attr("cy", d => y(d.Defense))
    .attr("r", d => d.isLegendary === "True" ? 5 : 3.3)
    .attr("fill", d => typeColor(d.Type_1))
    .attr("stroke", "#333")
    .attr("stroke-width", 0)
    .attr("opacity", 0.72)
    .on("mouseover", showTooltip)
    .on("mousemove", moveTooltip)
    .on("mouseout", hideTooltip);

  // This brush lets the user select Pokemon inside a rectangle.
  const brush = d3.brush()
    .extent([[0, 0], [innerWidth, innerHeight]])
    .on("brush end", brushed);

  // This group displays the brush rectangle above the dots.
  const brushGroup = chart.append("g")
    .attr("class", "brush")
    .call(brush);

  // This group holds the legend for Pokemon types.
  const legend = g.append("g")
    .attr("transform", `translate(${margin.left + innerWidth + 20},${margin.top})`);

  // This text labels the legend.
  legend.append("text")
    .attr("class", "axis-label")
    .attr("x", 0)
    .attr("y", -10)
    .text("Primary Type");

  // These groups create one legend row per type.
  const legendItems = legend.selectAll(".legend-item")
    .data(allTypes)
    .enter()
    .append("g")
    .attr("class", "legend-item")
    .attr("transform", function(d, i) {
      return `translate(0,${i * 17})`;
    });

  // These rectangles show each type color.
  legendItems.append("rect")
    .attr("width", 11)
    .attr("height", 11)
    .attr("fill", d => typeColor(d));

  // These labels name each type in the legend.
  legendItems.append("text")
    .attr("class", "legend-text")
    .attr("x", 17)
    .attr("y", 10)
    .text(d => d);

  scatterChart = {
    chart: chart,
    x: x,
    y: y,
    dots: dots,
    brush: brush,
    brushGroup: brushGroup
  };
}

function brushed() {
  const selection = d3.event.selection;
  const visible = getVisiblePokemon();
  brushedNumbers = new Set();

  // If the brush is empty, the dashboard goes back to only the type filter.
  if (selection === null) {
    updateDashboard();
    return;
  }

  const x0 = selection[0][0];
  const y0 = selection[0][1];
  const x1 = selection[1][0];
  const y1 = selection[1][1];

  // Store the Pokemon numbers that fall inside the brushed rectangle.
  visible.forEach(function(d) {
    const cx = scatterChart.x(d.Attack);
    const cy = scatterChart.y(d.Defense);

    if (x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1) {
      brushedNumbers.add(d.Number);
    }
  });

  updateDashboard();
}

function drawParallelCoordinates() {
  const chartWidth = width * 0.72;
  const chartHeight = bottomHeight;
  const innerWidth = chartWidth - margin.left - margin.right;
  const innerHeight = chartHeight - margin.top - margin.bottom;

  // This group holds the advanced parallel coordinates view.
  const g = svg.append("g")
    .attr("transform", `translate(0,${topHeight})`);

  // This title names the advanced view.
  g.append("text")
    .attr("class", "chart-title")
    .attr("x", chartWidth / 2)
    .attr("y", 24)
    .attr("text-anchor", "middle")
    .text("Advanced View: Parallel Coordinates of Battle Stats");

  // This note explains how the advanced view changes after brushing.
  g.append("text")
    .attr("class", "small-note")
    .attr("x", chartWidth / 2)
    .attr("y", 39)
    .attr("text-anchor", "middle")
    .text("Lines fade and thicken to show the current focus Pokemon.");

  const dimensions = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed", "Total"];

  const x = d3.scalePoint()
    .domain(dimensions)
    .range([0, innerWidth])
    .padding(0.5);

  const y = {};
  dimensions.forEach(function(dim) {
    y[dim] = d3.scaleLinear()
      .domain(d3.extent(allPokemon, d => d[dim]))
      .nice()
      .range([innerHeight, 0]);
  });

  // This inner group keeps the line chart inside the margins.
  const chart = g.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  function path(d) {
    return d3.line()(dimensions.map(function(dim) {
      return [x(dim), y[dim](d[dim])];
    }));
  }

  // These paths draw one parallel coordinates line per Pokemon.
  const lines = chart.append("g")
    .attr("class", "parallel-lines")
    .selectAll(".pokemon-line")
    .data(allPokemon)
    .enter()
    .append("path")
    .attr("class", "pokemon-line")
    .attr("d", path)
    .attr("fill", "none")
    .attr("stroke", d => typeColor(d.Type_1))
    .attr("stroke-width", 1)
    .attr("opacity", 0.16);

  // These groups hold one vertical axis for each stat.
  const dimensionGroups = chart.selectAll(".dimension")
    .data(dimensions)
    .enter()
    .append("g")
    .attr("class", "dimension")
    .attr("transform", d => `translate(${x(d)},0)`);

  // Each vertical axis uses the scale for that stat.
  dimensionGroups.each(function(d) {
    d3.select(this).call(d3.axisLeft(y[d]).ticks(5));
  });

  // These labels name each stat axis.
  dimensionGroups.append("text")
    .attr("class", "axis-label")
    .attr("x", 0)
    .attr("y", innerHeight + 20)
    .attr("text-anchor", "middle")
    .attr("font-size", "13px")
    .attr("font-weight", "bold")
    .attr("fill", "black")
    .text(function(d) {
      if (d === "Sp_Atk") return "Sp. Atk";
      if (d === "Sp_Def") return "Sp. Def";
      return d;
    });

  // This annotation gives a quick reading guide for the chart.
  chart.append("text")
    .attr("class", "small-note")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 42)
    .attr("text-anchor", "middle")
    .text("Each line is one Pokemon. Higher points on an axis mean a higher value.");

  parallelChart = {
    lines: lines
  };
}

function drawDetailPanel() {
  const panelX = width * 0.72;
  const panelWidth = width * 0.28;
  const panelHeight = bottomHeight;

  // This group holds text details about the current focus.
  const g = svg.append("g")
    .attr("transform", `translate(${panelX},${topHeight})`);

  // This background makes the detail panel separate from the charts.
  g.append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", panelWidth)
    .attr("height", panelHeight)
    .attr("fill", "#f7f9fb")
    .attr("stroke", "#d6dce2");

  // This title names the detail panel.
  g.append("text")
    .attr("class", "chart-title")
    .attr("x", 22)
    .attr("y", 30)
    .text("Selection Details");

  // This text summarizes the current type and brush selection.
  const summary = g.append("text")
    .attr("class", "axis-label")
    .attr("x", 22)
    .attr("y", 56);

  // This text shows a small ranked list from the current focus.
  const list = g.append("text")
    .attr("class", "axis-label")
    .attr("x", 22)
    .attr("y", 98);

  detailChart = {
    group: g,
    summary: summary,
    list: list,
    panelWidth: panelWidth
  };
}

function updateDashboard() {
  updateOverviewBars();
  updateScatterPlot();
  updateParallelCoordinates();
  updateDetailPanel();
}

function updateOverviewBars() {
  const typeCounts = getTypeCounts();

  barChart.x.domain(typeCounts.map(d => d.type));
  barChart.y.domain([0, d3.max(typeCounts, d => d.count)]).nice();

  // These bars show how many Pokemon belong to each primary type.
  const bars = barChart.chart.selectAll(".bar")
    .data(typeCounts, d => d.type);

  bars.enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", d => barChart.x(d.type))
    .attr("y", barChart.innerHeight)
    .attr("width", barChart.x.bandwidth())
    .attr("height", 0)
    .attr("fill", d => typeColor(d.type))
    .on("click", function(d) {
      selectedType = selectedType === d.type ? null : d.type;
      brushedNumbers = new Set();
      scatterChart.brushGroup.call(scatterChart.brush.move, null);
      updateDashboard();
    })
    .merge(bars)
    .transition()
    .duration(700)
    .ease(d3.easeCubicInOut)
    .attr("x", d => barChart.x(d.type))
    .attr("y", d => barChart.y(d.count))
    .attr("width", barChart.x.bandwidth())
    .attr("height", d => barChart.innerHeight - barChart.y(d.count))
    .attr("opacity", d => selectedType === null || selectedType === d.type ? 1 : 0.35)
    .attr("stroke", d => selectedType === d.type ? "#222" : "none")
    .attr("stroke-width", d => selectedType === d.type ? 2 : 0);

  bars.exit().remove();

  // This transition animates the x-axis when the bars are sorted.
  barChart.xAxis.transition()
    .duration(700)
    .ease(d3.easeCubicInOut)
    .call(d3.axisBottom(barChart.x))
    .selectAll("text")
    .attr("transform", "rotate(-40)")
    .attr("text-anchor", "end")
    .attr("x", -6)
    .attr("y", 8);

  // This transition updates the y-axis if the scale changes.
  barChart.yAxis.transition()
    .duration(700)
    .call(d3.axisLeft(barChart.y).ticks(5));
}

function updateScatterPlot() {
  const visibleNumbers = new Set(getVisiblePokemon().map(d => d.Number));
  const hasBrush = brushedNumbers.size > 0;

  // These circles animate between normal, dimmed, and brushed states.
  scatterChart.dots.transition()
    .duration(450)
    .attr("opacity", function(d) {
      if (!visibleNumbers.has(d.Number)) return 0.08;
      if (hasBrush && !brushedNumbers.has(d.Number)) return 0.16;
      return 0.78;
    })
    .attr("r", function(d) {
      if (hasBrush && brushedNumbers.has(d.Number)) return d.isLegendary === "True" ? 7 : 5;
      return d.isLegendary === "True" ? 5 : 3.3;
    })
    .attr("stroke-width", function(d) {
      if (hasBrush && brushedNumbers.has(d.Number)) return 1.5;
      return 0;
    });
}

function updateParallelCoordinates() {
  const visibleNumbers = new Set(getVisiblePokemon().map(d => d.Number));
  const hasBrush = brushedNumbers.size > 0;

  // These lines fade to keep context while making the selected Pokemon easier to follow.
  parallelChart.lines.transition()
    .duration(550)
    .attr("opacity", function(d) {
      if (!visibleNumbers.has(d.Number)) return 0.025;
      if (hasBrush && !brushedNumbers.has(d.Number)) return 0.035;
      return hasBrush ? 0.58 : 0.18;
    })
    .attr("stroke-width", function(d) {
      if (hasBrush && brushedNumbers.has(d.Number)) return 2.1;
      return 1;
    });
}

function updateDetailPanel() {
  const visible = getVisiblePokemon();
  const brushed = getBrushedPokemon();
  const focus = brushed.length > 0 ? brushed : visible;
  const typeText = selectedType === null ? "all types" : selectedType + " type";
  const brushText = brushed.length > 0 ? brushed.length + " brushed Pokemon" : "no brush selection";
  const averageTotal = d3.mean(focus, d => d.Total);

  // This summary tells the user what subset is currently being shown.
  detailChart.summary.text(`Focus: ${typeText}, ${brushText}. Avg. total stat: ${averageTotal.toFixed(1)}`);

  const topPokemon = focus.slice()
    .sort((a, b) => d3.descending(a.Total, b.Total))
    .slice(0, 6);

  detailChart.list.selectAll("tspan").remove();

  // This heading labels the ranked detail list.
  detailChart.list.append("tspan")
    .attr("x", 22)
    .attr("dy", 0)
    .attr("font-weight", "bold")
    .text("Highest total stats in focus:");

  topPokemon.forEach(function(d, i) {
    // Each tspan adds one Pokemon row to the detail list.
    detailChart.list.append("tspan")
      .attr("x", 22)
      .attr("dy", i === 0 ? 20 : 18)
      .text(`${i + 1}. ${d.Name} (${d.Type_1}) - ${d.Total}`);
  });
}

function showTooltip(d) {
  // This tooltip gives details for one hovered Pokemon point.
  tooltip.style("opacity", 1)
    .html(`<strong>${d.Name}</strong><br>Type: ${d.Type_1}<br>Attack: ${d.Attack}<br>Defense: ${d.Defense}<br>Total: ${d.Total}`);
}

function moveTooltip() {
  // This keeps the tooltip near the mouse while hovering.
  tooltip
    .style("left", (d3.event.pageX + 12) + "px")
    .style("top", (d3.event.pageY - 18) + "px");
}

function hideTooltip() {
  // This hides the tooltip after the mouse leaves a point.
  tooltip.style("opacity", 0);
}
