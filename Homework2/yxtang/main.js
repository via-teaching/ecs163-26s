var selectedType = "All";
var allData = [];

var color = d3.scaleOrdinal()
  .domain(["Normal", "Fire", "Water", "Electric", "Grass", "Ice", "Fighting",
           "Poison", "Ground", "Flying", "Psychic", "Bug", "Rock", "Ghost",
           "Dragon", "Dark", "Steel", "Fairy"])
  .range(["#8a817c", "#e4572e", "#2f80ed", "#f2c94c", "#219653", "#56ccf2",
          "#c0392b", "#9b51e0", "#b7791f", "#6c8ebf", "#d94686", "#7cb342",
          "#8d6e63", "#6f42c1", "#2f5597", "#4a5568", "#718096", "#eb80b1"]);

// Parse the Data
d3.csv("data/pokemon_alopez247.csv", function(data) {
  data.forEach(function(d) {
    d.Total = +d.Total;
    d.HP = +d.HP;
    d.Attack = +d.Attack;
    d.Defense = +d.Defense;
    d.Sp_Atk = +d.Sp_Atk;
    d.Sp_Def = +d.Sp_Def;
    d.Speed = +d.Speed;
  });

  allData = data;
  drawBarChart();
  drawScatterPlot();
  drawParallelCoordinates();
});

function getFilteredData() {
  if (selectedType == "All") {
    return allData;
  }

  return allData.filter(function(d) {
    return d.Type_1 == selectedType;
  });
}

function drawBarChart() {
  d3.select("#bar_dataviz").selectAll("*").remove();

  // set the dimensions and margins of the graph
  var margin = {top: 55, right: 20, bottom: 85, left: 60},
      width = 440 - margin.left - margin.right,
      height = 660 - margin.top - margin.bottom;

  // append the svg object to the body of the page
  var svg = d3.select("#bar_dataviz")
    .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

  var typeCounts = d3.nest()
    .key(function(d) { return d.Type_1; })
    .rollup(function(v) { return v.length; })
    .entries(allData)
    .map(function(d) {
      return { Type_1: d.key, Count: d.value };
    })
    .sort(function(a, b) {
      return b.Count - a.Count;
    });

  d3.select("#bar_dataviz svg")
    .append("text")
      .attr("class", "title")
      .attr("x", 18)
      .attr("y", 24)
      .text("Overview: Pokemon by Primary Type");

  d3.select("#bar_dataviz svg")
    .append("text")
      .attr("x", 18)
      .attr("y", 42)
      .attr("fill", "#666")
      .text("Click one bar to filter the other charts.");

  // X axis
  var x = d3.scaleBand()
    .range([0, width])
    .domain(typeCounts.map(function(d) { return d.Type_1; }))
    .padding(0.2);
  svg.append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x))
    .selectAll("text")
      .attr("transform", "translate(-10,0)rotate(-45)")
      .style("text-anchor", "end");

  // Add Y axis
  var y = d3.scaleLinear()
    .domain([0, d3.max(typeCounts, function(d) { return d.Count; })])
    .nice()
    .range([height, 0]);
  svg.append("g")
    .call(d3.axisLeft(y));

  // Bars
  svg.selectAll("mybar")
    .data(typeCounts)
    .enter()
    .append("rect")
      .attr("x", function(d) { return x(d.Type_1); })
      .attr("y", function(d) { return y(d.Count); })
      .attr("width", x.bandwidth())
      .attr("height", function(d) { return height - y(d.Count); })
      .attr("fill", function(d) { return color(d.Type_1); })
      .attr("stroke", function(d) {
        return selectedType == d.Type_1 ? "black" : "none";
      })
      .attr("stroke-width", 2)
      .on("click", function(d) {
        selectedType = selectedType == d.Type_1 ? "All" : d.Type_1;
        drawBarChart();
        drawScatterPlot();
        drawParallelCoordinates();
      })
      .append("title")
        .text(function(d) { return d.Type_1 + ": " + d.Count + " Pokemon"; });

  // Axis labels
  svg.append("text")
    .attr("class", "axis-label")
    .attr("x", width / 2)
    .attr("y", height + 75)
    .attr("text-anchor", "middle")
    .text("Primary type");

  svg.append("text")
    .attr("class", "axis-label")
    .attr("x", -height / 2)
    .attr("y", -42)
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("Number of Pokemon");
}

function drawScatterPlot() {
  d3.select("#scatter_dataviz").selectAll("*").remove();

  // set the dimensions and margins of the graph
  var margin = {top: 55, right: 145, bottom: 55, left: 60},
      width = 805 - margin.left - margin.right,
      height = 330 - margin.top - margin.bottom;

  // append the svg object to the body of the page
  var svg = d3.select("#scatter_dataviz")
    .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

  var data = getFilteredData();

  d3.select("#scatter_dataviz svg")
    .append("text")
      .attr("class", "title")
      .attr("x", 18)
      .attr("y", 24)
      .text("Focus: Attack vs. Defense");

  d3.select("#scatter_dataviz svg")
    .append("text")
      .attr("x", 18)
      .attr("y", 42)
      .attr("fill", "#666")
      .text(selectedType == "All" ? "All Pokemon shown." : selectedType + " Pokemon shown.");

  // Add X axis
  var x = d3.scaleLinear()
    .domain([0, d3.max(allData, function(d) { return d.Attack; })])
    .nice()
    .range([0, width]);
  svg.append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x));

  // Add Y axis
  var y = d3.scaleLinear()
    .domain([0, d3.max(allData, function(d) { return d.Defense; })])
    .nice()
    .range([height, 0]);
  svg.append("g")
    .call(d3.axisLeft(y));

  var r = d3.scaleSqrt()
    .domain(d3.extent(allData, function(d) { return d.Total; }))
    .range([3, 10]);
  // Add dots
  svg.append("g")
    .selectAll("dot")
    .data(data)
    .enter()
    .append("circle")
      .attr("cx", function(d) { return x(d.Attack); })
      .attr("cy", function(d) { return y(d.Defense); })
      .attr("r", function(d) { return r(d.Total); })
      .style("fill", function(d) { return color(d.Type_1); })
      .style("opacity", 0.72)
      .style("stroke", function(d) {
        return d.isLegendary == "True" ? "black" : "white";
      })
      .style("stroke-width", function(d) {
        return d.isLegendary == "True" ? 2 : 0.7;
      })
      .append("title")
        .text(function(d) {
          return d.Name + "\nAttack: " + d.Attack + "\nDefense: " + d.Defense + "\nTotal: " + d.Total;
        });
  // Axis labels
  svg.append("text")
    .attr("class", "axis-label")
    .attr("x", width / 2)
    .attr("y", height + 42)
    .attr("text-anchor", "middle")
    .text("Attack");
  svg.append("text")
    .attr("class", "axis-label")
    .attr("x", -height / 2)
    .attr("y", -42)
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("Defense");

  // Legend
  var legend = svg.append("g")
    .attr("transform", "translate(" + (width + 35) + ",10)");

  legend.append("text")
    .attr("font-weight", "bold")
    .text("Legend");

  legend.append("circle")
    .attr("cx", 8)
    .attr("cy", 28)
    .attr("r", 6)
    .attr("fill", "#6c91e8")
    .attr("stroke", "white");

  legend.append("text")
    .attr("x", 24)
    .attr("y", 32)
    .text("Pokemon");

  legend.append("circle")
    .attr("cx", 8)
    .attr("cy", 58)
    .attr("r", 7)
    .attr("fill", "#6c91e8")
    .attr("stroke", "black")
    .attr("stroke-width", 2);

  legend.append("text")
    .attr("x", 24)
    .attr("y", 62)
    .text("Legendary");

  legend.append("circle")
    .attr("cx", 8)
    .attr("cy", 88)
    .attr("r", r(620))
    .attr("fill", "none")
    .attr("stroke", "#777");

  legend.append("text")
    .attr("x", 24)
    .attr("y", 92)
    .text("size = total stats");
}

function drawParallelCoordinates() {
  d3.select("#parallel_dataviz").selectAll("*").remove();

  // set the dimensions and margins of the graph
  var margin = {top: 55, right: 30, bottom: 20, left: 30},
      width = 805 - margin.left - margin.right,
      height = 330 - margin.top - margin.bottom;

  // append the svg object to the body of the page
  var svg = d3.select("#parallel_dataviz")
    .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
    .append("g")
      .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

  var data = getFilteredData();
  var dimensions = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];

  d3.select("#parallel_dataviz svg")
    .append("text")
      .attr("class", "title")
      .attr("x", 18)
      .attr("y", 24)
      .text("Advanced: Parallel Coordinates of Battle Stats");

  d3.select("#parallel_dataviz svg")
    .append("text")
      .attr("x", 18)
      .attr("y", 42)
      .attr("fill", "#666")
      .text(selectedType == "All" ? "Each line is one Pokemon." : "Each line is one " + selectedType + " Pokemon.");

  // For each dimension, build a linear scale and store it in the y object
  var y = {};
  for (i in dimensions) {
    name = dimensions[i];
    y[name] = d3.scaleLinear()
      .domain(d3.extent(allData, function(d) { return +d[name]; }))
      .range([height, 0]);
  }

  // Build the X scale to find the position of each Y axis
  var x = d3.scalePoint()
    .range([0, width])
    .padding(1)
    .domain(dimensions);

  // The path function takes a row of the csv as input and returns line coordinates
  function path(d) {
    return d3.line()(dimensions.map(function(p) {
      return [x(p), y[p](d[p])];
    }));
  }

  // Draw the lines
  svg
    .selectAll("myPath")
    .data(data)
    .enter().append("path")
      .attr("d", path)
      .style("fill", "none")
      .style("stroke", function(d) { return color(d.Type_1); })
      .style("opacity", selectedType == "All" ? 0.18 : 0.45);

  // Draw the axis
  svg.selectAll("myAxis")
    // For each dimension of the dataset I add a 'g' element:
    .data(dimensions).enter()
    .append("g")
      .attr("transform", function(d) { return "translate(" + x(d) + ")"; })
      .each(function(d) { d3.select(this).call(d3.axisLeft().scale(y[d])); })
    .append("text")
      .style("text-anchor", "middle")
      .attr("y", -9)
      .text(function(d) { return d; })
      .style("fill", "black");

  // Legend
  var legend = svg.append("g")
    .attr("transform", "translate(" + (width - 150) + ",-34)");

  legend.append("rect")
    .attr("width", 11)
    .attr("height", 11)
    .attr("fill", selectedType == "All" ? "#777" : color(selectedType));

  legend.append("text")
    .attr("x", 17)
    .attr("y", 10)
    .text(selectedType == "All" ? "Color = primary type" : selectedType);
}
