const width = window.innerWidth;
const height = window.innerHeight;
const colW = Math.floor(width / 3);

d3.select("#main-svg")
  .attr("width", width)
  .attr("height", height);

// Have to set before using
let barMargin      = { top: 40, right: 20, bottom: 120, left: 55 };
let scatterMargin  = { top: 40, right: 20, bottom: 55,  left: 55 };
let parallelMargin = { top: 50, right: 40, bottom: 20,  left: 40 };
// REPLACE sizing lines with:
// Instead of hard code, use example from WS1
let barWidth  = colW - barMargin.left - barMargin.right;
let barHeight = height - 100 - barMargin.top - barMargin.bottom;
let barLeft   = 0;

let scatterWidth  = colW - scatterMargin.left - scatterMargin.right;
let scatterHeight = height - 100 - scatterMargin.top - scatterMargin.bottom;
let scatterLeft   = colW;

let parallelWidth  = width - colW * 2 - parallelMargin.left - parallelMargin.right;
let parallelHeight = height - 100 - parallelMargin.top - parallelMargin.bottom;
let parallelLeft   = colW * 2;

// Pokémon type -> color lookup table
const TYPE_COLORS = {
  Normal:"#A8A878", Fire:"#F08030",   Water:"#6890F0",  Grass:"#78C850",
  Electric:"#F8D030", Ice:"#98D8D8", Fighting:"#C03028", Poison:"#A040A0",
  Ground:"#E0C068", Flying:"#A890F0", Psychic:"#F85888", Bug:"#A8B820",
  Rock:"#B8A038",  Ghost:"#705898",  Dragon:"#7038F8",  Dark:"#705848",
  Steel:"#B8B8D0", Fairy:"#EE99AC"
};
const TYPES = Object.keys(TYPE_COLORS);

// Grab type color, default to gray if missing
function typeColor(t) { return TYPE_COLORS[t] || "#aaa"; }

// Tooltip helpers
const tip = d3.select("#tooltip");
function showTip(html, evt) {
  tip.html(html).style("opacity", 1)
     .style("left", (evt.clientX + 12) + "px")
     .style("top",  (evt.clientY - 8)  + "px");
}
function moveTip(evt) {
  tip.style("left", (evt.clientX + 12) + "px")
     .style("top",  (evt.clientY - 8)  + "px");
}
function hideTip() { tip.style("opacity", 0); }

// load data
d3.csv("data/pokemon_alopez247.csv").then(function(data) {

  // Convert numeric values from strings
  data.forEach(function(d) {
    d.HP          = +d.HP;
    d.Attack      = +d.Attack;
    d.Defense     = +d.Defense;
    d.Sp_Atk      = +d.Sp_Atk;
    d.Sp_Def      = +d.Sp_Def;
    d.Speed       = +d.Speed;
    d.Total       = +d.Total;
    d.Generation  = +d.Generation;
    d.isLegendary = d.isLegendary === "True";
  });

  const svg = d3.select("svg");
  buildBarChart(svg, data);
  buildScatter(svg, data);
  buildParallel(svg, data);
  buildLegend();

}).catch(function(error) {
  console.log(error);
});

// Bar chart
function buildBarChart(svg, data) {

  const g = svg.append("g")
    .attr("transform", `translate(${barLeft + barMargin.left}, ${barMargin.top})`);
  // Count Pokémon by primary type and sort highest first
  let counts = d3.nest()
    .key(d => d.Type_1)
    .rollup(v => v.length)
    .entries(data)
    .sort((a, b) => b.value - a.value);

  // Chart title
  svg.append("text")
    .attr("x", barLeft + barMargin.left + barWidth / 2)
    .attr("y", 22)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .text("Pokémon Count by Primary Type");

  // Position each type along the x-axis
  const x = d3.scaleBand()
    .domain(counts.map(d => d.key))
    .range([0, barWidth])
    .padding(0.2);

  // Scale for Pokémon count
  const y = d3.scaleLinear()
    .domain([0, d3.max(counts, d => d.value)])
    .range([barHeight, 0])
    .nice();

  // Draw bars using type colors
  g.selectAll("rect")
    .data(counts)
    .enter().append("rect")
      .attr("x", d => x(d.key))
      .attr("y", d => y(d.value))
      .attr("width", x.bandwidth())
      .attr("height", d => barHeight - y(d.value))
      .attr("fill", d => typeColor(d.key))
    .on("mouseover", function(d) {
      d3.select(this).attr("opacity", 0.7);
      showTip("<b>" + d.key + "</b><br>Count: " + d.value, d3.event);
    })
    .on("mousemove", function() { moveTip(d3.event); })
    .on("mouseout", function() {
      d3.select(this).attr("opacity", 1);
      hideTip();
    });

  // Rotate labels so all type names fit
  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0, ${barHeight})`)
    .call(d3.axisBottom(x).tickSize(0))
    .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")
      .attr("dx", "-0.5em").attr("dy", "0.1em")
      .style("font-size", "9px")
      .style("fill", d => typeColor(d));

  // Add y-axis
  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(5));

  // Y-axis label
  g.append("text")
    .attr("transform", `translate(-40, ${barHeight / 2}) rotate(-90)`)
    .attr("text-anchor", "middle")
    .style("font-size", "11px").style("fill", "#555")
    .text("Number of Pokémon");

  // X-axis label
  g.append("text")
    .attr("x", barWidth / 2)
    .attr("y", barHeight + barMargin.bottom - 8)
    .attr("text-anchor", "middle")
    .style("font-size", "11px").style("fill", "#555")
    .text("Primary Type");
}

// Scatter plot
function buildScatter(svg, data) {

  const g = svg.append("g")
    .attr("transform", `translate(${scatterLeft + scatterMargin.left}, ${scatterMargin.top})`);
  // Chart title
  svg.append("text")
    .attr("x", scatterLeft + scatterMargin.left + scatterWidth / 2)
    .attr("y", 22)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .text("Attack vs. Speed by Type");

  // Scale attack and speed values
  const x = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.Attack) + 10])
    .range([0, scatterWidth]).nice();

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.Speed) + 10])
    .range([scatterHeight, 0]).nice();

  // Draw normal Pokémon first so legendary ones stay visible
  const nonLeg = data.filter(d => !d.isLegendary);
  const leg    = data.filter(d =>  d.isLegendary);

  // Draw Pokémon points
  function drawDots(subset, radius, strokeCol) {
    g.selectAll(null)
      .data(subset)
      .enter().append("circle")
        .attr("cx", d => x(d.Attack))
        .attr("cy", d => y(d.Speed))
        .attr("r", radius)
        .attr("fill", d => typeColor(d.Type_1))
        .attr("opacity", 0.65)
        .attr("stroke", strokeCol || "none")
        .attr("stroke-width", strokeCol ? 1.5 : 0)
      .on("mouseover", function(d) {
        d3.select(this).raise().attr("r", radius * 2).attr("opacity", 1);
        showTip(
          "<b>" + d.Name + "</b><br>" +
          "Type: " + d.Type_1 + (d.Type_2 ? "/" + d.Type_2 : "") + "<br>" +
          "Attack: " + d.Attack + "  Speed: " + d.Speed +
          (d.isLegendary ? "<br>★ Legendary" : ""),
          d3.event
        );
      })
      .on("mousemove", function() { moveTip(d3.event); })
      .on("mouseout", function() {
        d3.select(this).attr("r", radius).attr("opacity", 0.65);
        hideTip();
      });
  }

  drawDots(nonLeg, 3, null);

  // Add a red border around legendary Pokémon
  drawDots(leg, 4.5, "#e60000");

  
  // legend_ary legend
  const legLabelX = scatterWidth - 10;

  // Non-legendary dot
  g.append("circle")
    .attr("cx", legLabelX - 64).attr("cy", -6)
    .attr("r", 4).attr("fill", "#aaa").attr("opacity", 0.65);
  g.append("text")
    .attr("x", legLabelX - 57).attr("y", -2)
    .style("font-size", "10px").style("fill", "#555")
    .text("Normal");

  // Legendary dot with red outline
  g.append("circle")
    .attr("cx", legLabelX - 10).attr("cy", -6)
    .attr("r", 4).attr("fill", "#aaa").attr("opacity", 0.65)
    .attr("stroke", "#e60000").attr("stroke-width", 1.5);
  g.append("text")
    .attr("x", legLabelX - 3).attr("y", -2)
    .style("font-size", "10px").style("fill", "#e60000")
    .text("Legendary");

  // Add axes
  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0, ${scatterHeight})`)
    .call(d3.axisBottom(x).ticks(6));

  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(6));

  // Axis labels
  g.append("text")
    .attr("x", scatterWidth / 2).attr("y", scatterHeight + 40)
    .attr("text-anchor", "middle")
    .style("font-size", "11px").style("fill", "#555")
    .text("Attack");

  g.append("text")
    .attr("transform", `translate(-43, ${scatterHeight / 2}) rotate(-90)`)
    .attr("text-anchor", "middle")
    .style("font-size", "11px").style("fill", "#555")
    .text("Speed");
}

// Parallel coordinates chart
function buildParallel(svg, data) {

  const g = svg.append("g")
    .attr("transform", `translate(${parallelLeft + parallelMargin.left}, ${parallelMargin.top})`);
  // Stats shown in the parallel coordinates chart
  const dims = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];

  // Chart title
  svg.append("text")
    .attr("x", parallelLeft + parallelMargin.left + parallelWidth / 2)
    .attr("y", 22)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .text("Six-Stat Profile (Parallel Coordinates)");

  // y label for parallel
  g.append("text")
    .attr("transform", `translate(-28, ${parallelHeight / 2}) rotate(-90)`)
    .attr("text-anchor", "middle")
    .style("font-size", "11px").style("fill", "#555")
    .text("Stat Value");

  // Position stat dimensions
  const xPos = d3.scalePoint()
    .domain(dims)
    .range([0, parallelWidth])
    .padding(0.1);

  // Create scales for each stat
  const yScales = {};
  dims.forEach(function(dim) {
    yScales[dim] = d3.scaleLinear()
      .domain([0, d3.max(data, d => d[dim])])
      .range([parallelHeight, 0])
      .nice();
  });

  // Build a path for a single Pokémon stat profile
  function pathFor(d) {
    return d3.line()(
      dims.map(dim => [xPos(dim), yScales[dim](d[dim])])
    );
  }

  // Draw each Pokémon stat profile
  const lines = g.append("g")
    .selectAll("path")
    .data(data)
    .enter().append("path")
      .attr("d", pathFor)
      .attr("fill", "none")
      .attr("stroke", d => typeColor(d.Type_1))
      .attr("stroke-width", 0.8)
      .attr("opacity", 0.18);

  // Highlight current Pokémon on hover
  lines
    .on("mouseover", function(d) {
      d3.select(this).raise()
        .attr("stroke-width", 2.5).attr("opacity", 1);
      showTip(
        "<b>" + d.Name + "</b><br>" +
        "Type: " + d.Type_1 + (d.Type_2 ? "/" + d.Type_2 : "") + "<br>" +
        "HP:" + d.HP + " ATK:" + d.Attack + " DEF:" + d.Defense + "<br>" +
        "SpA:" + d.Sp_Atk + " SpD:" + d.Sp_Def + " SPE:" + d.Speed,
        d3.event
      );
    })
    .on("mousemove", function() { moveTip(d3.event); })
    .on("mouseout", function() {
      d3.select(this).attr("stroke-width", 0.8).attr("opacity", 0.18);
      hideTip();
    });

  // Add one axis for each stat
  dims.forEach(function(dim) {
    const axisG = g.append("g")
      .attr("transform", `translate(${xPos(dim)}, 0)`);

    axisG.call(d3.axisLeft(yScales[dim]).ticks(5));

    // Add axis labels
    axisG.append("text")
      .attr("y", -14)
      .attr("text-anchor", "middle")
      .style("font-size", "11px")
      .style("font-weight", "bold")
      .style("fill", "#333")
      .text(dim);
  });
}

// Build type legend
function buildLegend() {
  const legend = d3.select("#legend");
  TYPES.forEach(function(type) {
    const item = legend.append("div").attr("class", "legend-item");
    item.append("span").attr("class", "legend-dot")
      .style("background", typeColor(type));
    item.append("span").text(type);
  });
}
