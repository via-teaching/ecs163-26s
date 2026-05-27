const svg = d3.select("svg");

const width = window.innerWidth;
const height = window.innerHeight - 58;

// These layout values split the screen into a dashboard instead of a report.
const leftWidth = width * 0.42;
const rightWidth = width * 0.58;
const topHeight = height * 0.48;
const bottomHeight = height * 0.50;

// Basic margins used inside each chart.
const margin = {
  top: 45,
  right: 45,
  bottom: 55,
  left: 65
};

// This color scale keeps Pokemon type colors consistent across the dashboard.
const typeColor = d3.scaleOrdinal(d3.schemeCategory10);

// Load the Pokemon dataset from the required data folder.
d3.csv("data/pokemon_alopez247.csv").then(function(data) {

  // Convert stat columns from strings into numbers so D3 scales work correctly.
  data.forEach(function(d) {
    d.Total = +d.Total;
    d.HP = +d.HP;
    d.Attack = +d.Attack;
    d.Defense = +d.Defense;
    d.Sp_Atk = +d.Sp_Atk;
    d.Sp_Def = +d.Sp_Def;
    d.Speed = +d.Speed;
    d.Generation = +d.Generation;
  });

  // Sort the type list so colors and legends stay stable.
  const types = Array.from(new Set(data.map(d => d.Type_1))).sort();
  typeColor.domain(types);

  drawBarChart(data, types);
  drawScatterPlot(data, types);
  drawParallelCoordinates(data, types);

}).catch(function(error) {
  console.log("Error loading the dataset:", error);
});

function drawBarChart(data, types) {
  // This group holds the overview bar chart.
  const chartWidth = leftWidth;
  const chartHeight = topHeight;

  const innerWidth = chartWidth - margin.left - margin.right;
  const innerHeight = chartHeight - margin.top - margin.bottom;

  const g = svg.append("g")
    .attr("transform", "translate(0,0)");

  // Add chart title.
  g.append("text")
    .attr("class", "chart-title")
    .attr("x", chartWidth / 2)
    .attr("y", 24)
    .attr("text-anchor", "middle")
    .text("Overview: Number of Pokemon by Primary Type");

  // Count how many Pokemon belong to each primary type.
  const typeCounts = types.map(function(type) {
    return {
      type: type,
      count: data.filter(d => d.Type_1 === type).length
    };
  });

  // X scale places each type as a separate bar.
  const x = d3.scaleBand()
    .domain(typeCounts.map(d => d.type))
    .range([0, innerWidth])
    .padding(0.2);

  // Y scale maps Pokemon counts to bar height.
  const y = d3.scaleLinear()
    .domain([0, d3.max(typeCounts, d => d.count)])
    .nice()
    .range([innerHeight, 0]);

  const chart = g.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Draw one bar for each Pokemon type.
  chart.selectAll("rect")
    .data(typeCounts)
    .enter()
    .append("rect")
    .attr("x", d => x(d.type))
    .attr("y", d => y(d.count))
    .attr("width", x.bandwidth())
    .attr("height", d => innerHeight - y(d.count))
    .attr("fill", d => typeColor(d.type));

  // Add x-axis with rotated labels so type names fit.
  chart.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-40)")
    .attr("text-anchor", "end")
    .attr("x", -6)
    .attr("y", 8);

  // Add y-axis for the Pokemon count.
  chart.append("g")
    .call(d3.axisLeft(y).ticks(5));

  // Add x-axis label.
  chart.append("text")
    .attr("class", "axis-label")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 48)
    .attr("text-anchor", "middle")
    .text("Primary Type");

  // Add y-axis label.
  chart.append("text")
    .attr("class", "axis-label")
    .attr("x", -innerHeight / 2)
    .attr("y", -45)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .text("Number of Pokemon");
}

function drawScatterPlot(data, types) {
  // This group holds the main focus view: Attack vs Defense.
  const chartWidth = rightWidth;
  const chartHeight = topHeight;

  const innerWidth = chartWidth - margin.left - 145;
  const innerHeight = chartHeight - margin.top - margin.bottom;

  const g = svg.append("g")
    .attr("transform", `translate(${leftWidth},0)`);

  // Add chart title.
  g.append("text")
    .attr("class", "chart-title")
    .attr("x", chartWidth / 2)
    .attr("y", 24)
    .attr("text-anchor", "middle")
    .text("Focus View: Attack vs Defense");

  // X scale maps Attack stat to horizontal position.
  const x = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.Attack)])
    .nice()
    .range([0, innerWidth]);

  // Y scale maps Defense stat to vertical position.
  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.Defense)])
    .nice()
    .range([innerHeight, 0]);

  const chart = g.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Add a light grid to make comparison easier.
  chart.append("g")
    .attr("opacity", 0.15)
    .call(d3.axisLeft(y).tickSize(-innerWidth).tickFormat(""));

  chart.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .attr("opacity", 0.15)
    .call(d3.axisBottom(x).tickSize(-innerHeight).tickFormat(""));

  // Draw one circle for each Pokemon.
  chart.selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", d => x(d.Attack))
    .attr("cy", d => y(d.Defense))
    .attr("r", d => d.isLegendary === "True" ? 5 : 3)
    .attr("fill", d => typeColor(d.Type_1))
    .attr("opacity", 0.72);

  // Add x-axis for Attack.
  chart.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x));

  // Add y-axis for Defense.
  chart.append("g")
    .call(d3.axisLeft(y));

  // Add x-axis label.
  chart.append("text")
    .attr("class", "axis-label")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 42)
    .attr("text-anchor", "middle")
    .text("Attack");

  // Add y-axis label.
  chart.append("text")
    .attr("class", "axis-label")
    .attr("x", -innerHeight / 2)
    .attr("y", -45)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .text("Defense");

  // Add legend explaining the color encoding by Pokemon type.
  const legend = g.append("g")
    .attr("transform", `translate(${margin.left + innerWidth + 20},${margin.top})`);

  legend.append("text")
    .attr("class", "axis-label")
    .attr("x", 0)
    .attr("y", -10)
    .text("Primary Type");

  const legendItems = legend.selectAll(".legend-item")
    .data(types)
    .enter()
    .append("g")
    .attr("transform", function(d, i) {
      return `translate(0,${i * 17})`;
    });

  // Legend color boxes.
  legendItems.append("rect")
    .attr("width", 11)
    .attr("height", 11)
    .attr("fill", d => typeColor(d));

  // Legend type names.
  legendItems.append("text")
    .attr("class", "legend-text")
    .attr("x", 17)
    .attr("y", 10)
    .text(d => d);
}

function drawParallelCoordinates(data, types) {
  // This group holds the advanced visualization.
  const chartWidth = width;
  const chartHeight = bottomHeight;

  const innerWidth = chartWidth - margin.left - margin.right;
  const innerHeight = chartHeight - margin.top - margin.bottom;

  const g = svg.append("g")
    .attr("transform", `translate(0,${topHeight})`);

  // Add chart title.
  g.append("text")
    .attr("class", "chart-title")
    .attr("x", chartWidth / 2)
    .attr("y", 24)
    .attr("text-anchor", "middle")
    .text("Advanced View: Parallel Coordinates of Pokemon Battle Stats");

  // These are the numerical attributes compared in the advanced chart.
  const dimensions = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed", "Total"];

  // X scale gives each stat its own vertical axis.
  const x = d3.scalePoint()
    .domain(dimensions)
    .range([0, innerWidth])
    .padding(0.5);

  // Each stat needs its own y-scale because the ranges can differ.
  const y = {};
  dimensions.forEach(function(dim) {
    y[dim] = d3.scaleLinear()
      .domain(d3.extent(data, d => d[dim]))
      .nice()
      .range([innerHeight, 0]);
  });

  const chart = g.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // This helper function creates the connected line path for one Pokemon.
  function path(d) {
    return d3.line()(dimensions.map(function(dim) {
      return [x(dim), y[dim](d[dim])];
    }));
  }

  // Draw one line per Pokemon across all stat axes.
  chart.selectAll(".pokemon-line")
    .data(data)
    .enter()
    .append("path")
    .attr("class", "pokemon-line")
    .attr("d", path)
    .attr("fill", "none")
    .attr("stroke", d => typeColor(d.Type_1))
    .attr("stroke-width", 1)
    .attr("opacity", 0.18);

  // Add one vertical axis for each stat dimension.
  const dimensionGroups = chart.selectAll(".dimension")
    .data(dimensions)
    .enter()
    .append("g")
    .attr("class", "dimension")
    .attr("transform", d => `translate(${x(d)},0)`);

  // Draw each stat axis.
  dimensionGroups.each(function(d) {
    d3.select(this).call(d3.axisLeft(y[d]).ticks(5));
  });

  // Add stat labels below each vertical axis.
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
  
  // Add a note explaining how to read the parallel coordinates plot.
  chart.append("text")
    .attr("class", "axis-label")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 38)
    .attr("text-anchor", "middle")
    .text("Each line is one Pokemon. Higher points on an axis mean a higher value for that stat.");

  // Add a small annotation to explain why this view is useful.
  chart.append("text")
    .attr("class", "axis-label")
    .attr("x", 0)
    .attr("y", -15)
    .text("This advanced view compares multiple battle stats at the same time.");
}