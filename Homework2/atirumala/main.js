// ============================================================
// ECS 163 Homework 2 — Pokemon Stats Dashboard
// Author: atirumala
//
// My three questions for each graph were first, how many pokemon are there of each type? This is the overview and will be a bar chart. My second was how the types themselves rank when comparing on special attack and speed, so I used a bubble chart as my focus. For my advanced, I wanted to do a full profile of the pokemon based on the six variables the data set gave, and I did this using parallel coordinates. 
// I used Claude to help me with the javascript. 
// ============================================================

const totalWidth  = document.documentElement.clientWidth;
const totalHeight = document.documentElement.clientHeight;

const titleHeight = 40;

const topHeight    = Math.floor((totalHeight - titleHeight) * 0.47);
const bottomHeight = (totalHeight - titleHeight) - topHeight;
const topY         = titleHeight;

const barMargin = { top: 50, right: 20, bottom: 75, left: 60 };
const barWidth  = Math.floor(totalWidth * 0.52) - barMargin.left - barMargin.right;
const barHeight = topHeight - barMargin.top - barMargin.bottom;

const bubMargin = { top: 50, right: 20, bottom: 50, left: 65 };
const bubWidth  = Math.floor(totalWidth * 0.48) - bubMargin.left - bubMargin.right - 120;
const bubHeight = topHeight - bubMargin.top - bubMargin.bottom;

const pcMargin = { top: 80, right: 40, bottom: 70, left: 60 };
const pcWidth  = totalWidth - pcMargin.left - pcMargin.right;
const pcHeight = bottomHeight - pcMargin.top - pcMargin.bottom;
const dimensions = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];

const dimLabels = {
  "HP": "HP",
  "Attack": "Attack",
  "Defense": "Defense",
  "Sp_Atk": "Special Attack",
  "Sp_Def": "Special Defense",
  "Speed": "Speed"
};

const typeColors = {
  "Normal":   "#A8A878", "Fire":     "#F08030", "Water":    "#6890F0",
  "Electric": "#F8D030", "Grass":    "#78C850", "Ice":      "#98D8D8",
  "Fighting": "#C03028", "Poison":   "#A040A0", "Ground":   "#E0C068",
  "Flying":   "#A890F0", "Psychic":  "#F85888", "Bug":      "#A8B820",
  "Rock":     "#B8A038", "Ghost":    "#705898", "Dragon":   "#7038F8",
  "Dark":     "#705848", "Steel":    "#B8B8D0", "Fairy":    "#EE99AC"
};

const svg = d3.select("svg");

svg.append("rect") //i wanted panels for each graph to distinguish the seperation for the three, so adds the first pane;
  .attr("x", 0).attr("y", topY)
  .attr("width", Math.floor(totalWidth * 0.52))
  .attr("height", topHeight)
  .attr("fill", "#f9f9fc");

svg.append("rect") //this adds the second panel
  .attr("x", Math.floor(totalWidth * 0.52)).attr("y", topY)
  .attr("width", Math.ceil(totalWidth * 0.48))
  .attr("height", topHeight)
  .attr("fill", "#fffdf7");

svg.append("rect") // this adds the third panel
  .attr("x", 0).attr("y", topY + topHeight)
  .attr("width", totalWidth).attr("height", bottomHeight)
  .attr("fill", "#f7f9ff");

svg.append("line") // this adds a line so the panels look properly divided
  .attr("x1", Math.floor(totalWidth * 0.52))
  .attr("x2", Math.floor(totalWidth * 0.52))
  .attr("y1", topY).attr("y2", topY + topHeight)
  .attr("stroke", "#ddd").attr("stroke-width", 1.5);

svg.append("line") // line so the panels look divided 
  .attr("x1", 0).attr("x2", totalWidth)
  .attr("y1", topY + topHeight).attr("y2", topY + topHeight)
  .attr("stroke", "#ddd").attr("stroke-width", 1.5);

svg.append("text") // this adds the title for the entire dashboard 
  .attr("x", totalWidth / 2)
  .attr("y", titleHeight * 0.72)
  .attr("text-anchor", "middle")
  .attr("font-size", "18px").attr("font-weight", "bold")
  .attr("font-family", "Georgia, serif").attr("fill", "#1a1a2e")
  .text("Stats Dashboard for Pokemon Combat");

svg.append("line") //title for the dashboard
  .attr("x1", 0).attr("x2", totalWidth)
  .attr("y1", titleHeight).attr("y2", titleHeight)
  .attr("stroke", "#ccc").attr("stroke-width", 1);


d3.csv("data/pokemon_alopez247.csv").then(function(rawData) {

  
  rawData.forEach(function(d) {
    d.HP         = +d.HP;
    d.Attack     = +d.Attack;
    d.Defense    = +d.Defense;
    d.Sp_Atk     = +d.Sp_Atk;
    d.Sp_Def     = +d.Sp_Def;
    d.Speed      = +d.Speed;
    d.Total      = +d.Total;
    d.Generation = +d.Generation;
  });


  // ============================================================
// For the first bar chart, I wanted the user to be able to see which types are shown the most/ not shown as much in the data as an overview, so they can then see which type has specific combat stats for the more focused views
  // This counts each pokemon by using their primary type
  const typeCounts = d3.nest()
    .key(function(d) { return d.Type_1; })
    .rollup(function(v) { return v.length; })
    .entries(rawData)
    .sort(function(a, b) { return b.value - a.value; });

  const barG = svg.append("g")
    .attr("transform", "translate(" + barMargin.left + "," + (topY + barMargin.top) + ")");

  
  barG.append("text") //this creates the title for the bar chart
    .attr("x", barWidth / 2).attr("y", -30)
    .attr("text-anchor", "middle")
    .attr("font-size", "13px").attr("font-weight", "bold").attr("fill", "#333")
    .text("Number of each Pokemon per Pokemon Type");

  
  barG.append("text") // subtitle for the bar chart
    .attr("x", barWidth / 2).attr("y", -14)
    .attr("text-anchor", "middle")
    .attr("font-size", "10px").attr("fill", "#888")
    .text("Overview");

  // This is to set up the x axis position for each bar
  const xBar = d3.scaleBand()
    .domain(typeCounts.map(function(d) { return d.key; }))
    .range([0, barWidth])
    .padding(0.22);

  // This is to set up the y axis position for each bar 
  const yBar = d3.scaleLinear()
    .domain([0, d3.max(typeCounts, function(d) { return d.value; }) + 8])
    .range([barHeight, 0]);

  // This draws the actual x axis and plots the labels for each type 
  barG.append("g")
    .attr("transform", "translate(0," + barHeight + ")")
    .call(d3.axisBottom(xBar))
    .selectAll("text")
      .attr("transform", "rotate(-38)")
      .attr("text-anchor", "end")
      .attr("dx", "-0.4em").attr("dy", "0.5em")
      .attr("font-size", "11px");

  // This draws the actual y axis for the graph 
  barG.append("g")
    .call(d3.axisLeft(yBar).ticks(6));

  
  barG.append("text") // is the x axis for the bar chart
    .attr("x", barWidth / 2).attr("y", barHeight + 65)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px").attr("fill", "#555")
    .text("Pokemon Type");

 
  barG.append("text") // y axis for thr bar chart 
    .attr("transform", "rotate(-90)")
    .attr("x", -(barHeight / 2)).attr("y", -45)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px").attr("fill", "#555")
    .text("# of Pokemon");

  
  barG.selectAll(".bar") //this is to draw the bars for each type, one per each
    .data(typeCounts)
    .enter()
    .append("rect")
      .attr("class", "bar")
      .attr("x", function(d) { return xBar(d.key); })
      .attr("y", function(d) { return yBar(d.value); })
      .attr("width", xBar.bandwidth())
      .attr("height", function(d) { return barHeight - yBar(d.value); })
      .attr("fill", function(d) { return typeColors[d.key] || "#aaa"; })
      .attr("opacity", 0.88);

  
  barG.selectAll(".bar-label") //this displays the total count for each bar
    .data(typeCounts)
    .enter()
    .append("text")
      .attr("class", "bar-label")
      .attr("x", function(d) { return xBar(d.key) + xBar.bandwidth() / 2; })
      .attr("y", function(d) { return yBar(d.value) - 3; })
      .attr("text-anchor", "middle")
      .attr("font-size", "9px").attr("fill", "#444")
      .text(function(d) { return d.value; });

// This is the code for the bubble chart, which focuses on the speed, the special attack, and their total statistics, so three dimensions are shown at once to the user, so the fastest and strongest special attackers are shown as the largest bubbles in the top right 
  const bubOffsetX = Math.floor(totalWidth * 0.52) + bubMargin.left;
  const bubG = svg.append("g") //this creates the group container for the buuble chart
    .attr("transform", "translate(" + bubOffsetX + "," + (topY + bubMargin.top) + ")");


  bubG.append("text") //this adds the title for the bubble chart graph
    .attr("x", bubWidth / 2).attr("y", -30)
    .attr("text-anchor", "middle")
    .attr("font-size", "13px").attr("font-weight", "bold").attr("fill", "#333")
    .text("Comparing Speed vs Special Attack vs Total Stat Number");

  
  bubG.append("text") //this adds a subtitle for bubble chart
    .attr("x", bubWidth / 2).attr("y", -14)
    .attr("text-anchor", "middle")
    .attr("font-size", "10px").attr("fill", "#888")
    .text("The larger the bubble, the higher the overall stat. The top right represent the fastest special attackers.");

  // The x axis is speed, and this d3 element takes the speed value, and then based on that calculates the position it will be displayed at on the chart
  const xBub = d3.scaleLinear()
    .domain([0, d3.max(rawData, function(d) { return d.Speed; }) + 10])
    .range([0, bubWidth]);

  // this does what i explained for the x axis, but this works for the y axis and is based on special attack
  const yBub = d3.scaleLinear()
    .domain([0, d3.max(rawData, function(d) { return d.Sp_Atk; }) + 10])
    .range([bubHeight, 0]);

  // This calculates the circle values in terms of area, not radius, and adjusts the size based on that, so the size in terms of proportionally make sense
  const rBub = d3.scaleSqrt()
    .domain([0, d3.max(rawData, function(d) { return d.Total; })])
    .range([1.5, 13]);

  //this draws the actual x axis 
  bubG.append("g")
    .attr("transform", "translate(0," + bubHeight + ")")
    .call(d3.axisBottom(xBub).ticks(6));

  // This draws the actual y axis
  bubG.append("g")
    .call(d3.axisLeft(yBub).ticks(6));

 
  bubG.append("text") //this adds the  x and y axis labels
    .attr("x", bubWidth / 2).attr("y", bubHeight + 38)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px").attr("fill", "#555")
    .text("Speed");

  bubG.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -(bubHeight / 2)).attr("y", -50)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px").attr("fill", "#555")
    .text("Special Attack");

 
  bubG.selectAll(".bubble") //this draws a bubble for each pokemon
    .data(rawData)
    .enter()
    .append("circle")
      .attr("class", "bubble")
      .attr("cx", function(d) { return xBub(d.Speed); })
      .attr("cy", function(d) { return yBub(d.Sp_Atk); })
      .attr("r",  function(d) { return rBub(d.Total); })
      .attr("fill", function(d) { return typeColors[d.Type_1] || "#aaa"; })
      .attr("opacity", 0.5)
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.4);

 
  const legendTypes = Object.keys(typeColors);
  const legCols = 2;
  const legRowH = 15;
  const legX    = bubWidth + 14;
  const legY    = 0;

  bubG.append("text") //this section is to create a legend for the bubble chart, this creates the title 
    .attr("x", legX).attr("y", legY + 2)
    .attr("font-size", "10px").attr("font-weight", "bold").attr("fill", "#333")
    .text("Type");

  legendTypes.forEach(function(type, i) { //this creates the legend through the for loop
    const col = i % legCols;
    const row = Math.floor(i / legCols);
    const lx  = legX + col * 52;
    const ly  = legY + 16 + row * legRowH;

    bubG.append("circle")
      .attr("cx", lx + 4).attr("cy", ly)
      .attr("r", 5).attr("fill", typeColors[type]);

    bubG.append("text") //this sizes the title for the legend
      .attr("x", lx + 12).attr("y", ly + 4)
      .attr("font-size", "9px").attr("fill", "#333")
      .text(type);
  });

  
  const totVals = [200, 400, 600, 720];
  const szLegY  = legY + 16 + Math.ceil(legendTypes.length / legCols) * legRowH + 16;

  bubG.append("text")
    .attr("x", legX).attr("y", szLegY)
    .attr("font-size", "10px").attr("font-weight", "bold").attr("fill", "#444")
    .text("Total Stat:");

  totVals.forEach(function(val, i) { //this determines the size for the label and legend title 
    const cx = legX + 10 + i * 28;
    const cy = szLegY + 18;
    bubG.append("circle")
      .attr("cx", cx).attr("cy", cy)
      .attr("r", rBub(val))
      .attr("fill", "#aaa").attr("opacity", 0.55);
    bubG.append("text")
      .attr("x", cx).attr("y", cy + rBub(val) + 10)
      .attr("text-anchor", "middle")
      .attr("font-size", "8px").attr("fill", "#666")
      .text(val);
  });


// This last view is for the parallel coordinates, and it shows each pokemon's type and six different attributes, filtered by stats over 500 and excluding not legendary to reduce visual clutter for the user 
  
  const filteredData = rawData.filter(function(d) {
    return d.Total >= 500 && d.isLegendary === "False";
  });

  const pcG = svg.append("g") //group container for the final visualization
    .attr("transform", "translate(" + pcMargin.left + "," + (topY + topHeight + pcMargin.top) + ")");

 
  pcG.append("text") //this adds the title to the parallel coordinates graph
    .attr("x", pcWidth / 2).attr("y", -50)
    .attr("text-anchor", "middle")
    .attr("font-size", "13px").attr("font-weight", "bold").attr("fill", "#333")
    .text("Full Pokemon Profile");

 
  pcG.append("text") //subtitle 
    .attr("x", pcWidth / 2).attr("y", -32)
    .attr("text-anchor", "middle")
    .attr("font-size", "10px").attr("fill", "#888")
    .text("Each line represents a Pokemon. Color represents type of Pokemon. The peaks in the graph are strengths, and the lows are weaknesses.");

  // This d3 aspect is meant to make individual scales for each element, since each element has different parameters, so each element needs to be scaled based off of their own parameters-- a single scale for all aspects wouldn't represent the data as well
  const yScales = {};
  dimensions.forEach(function(dim) {
    yScales[dim] = d3.scaleLinear()
      .domain([0, d3.max(rawData, function(d) { return d[dim]; })])
      .range([pcHeight, 0]);
  });

  // This is meant to make sure the x axis is evenly spaced out so the coordinates can be plot
  const xPC = d3.scalePoint()
    .domain(dimensions)
    .range([0, pcWidth])
    .padding(0.15);

  // This draws the line connecting for each pokemon, it draws the line between each coordinate
  function pcLine(d) {
    return d3.line()(
      dimensions.map(function(dim) {
        return [xPC(dim), yScales[dim](d[dim])];
      })
    );
  }

  
  pcG.selectAll(".pc-line") //this d3 aspect is also for drawing the line connecting each pokemon
    .data(filteredData)
    .enter()
    .append("path")
      .attr("class", "pc-line")
      .attr("d", pcLine)
      .attr("fill", "none")
      .attr("stroke", function(d) { return typeColors[d.Type_1] || "#aaa"; })
      .attr("stroke-width", 1.1)
      .attr("opacity", 0.32);


  dimensions.forEach(function(dim) {
    const axisG = pcG.append("g")
      .attr("transform", "translate(" + xPC(dim) + ",0)");

    
    axisG.call(d3.axisLeft(yScales[dim]).ticks(4)); // this draws the ticks for the y axis, and it limits it to four ticks to reduce clutter and stop the lines from being crowded

   
    axisG.append("text")
      .attr("y", -14)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px").attr("font-weight", "bold").attr("fill", "#333")
      .text(dimLabels[dim]);
  });

 
  pcG.append("text")
    .attr("x", pcWidth).attr("y", pcHeight + 14)
    .attr("text-anchor", "end")
    .attr("font-size", "10px").attr("fill", "#bbb")
    .text("n = " + filteredData.length + " Pokemon");

 
  const pcLegCols = 6;
  const pcLegRowH = 16;
  const pcLegX    = 0;
  const pcLegY    = pcHeight + 22;

  pcG.append("text")
    .attr("x", pcLegX).attr("y", pcLegY)
    .attr("font-size", "10px").attr("font-weight", "bold").attr("fill", "#333")
    .text("Type:");

  
  Object.keys(typeColors).forEach(function(type, i) { //this creates the legend for the color type in the parallel coordinates 
    const col = i % pcLegCols;
    const row = Math.floor(i / pcLegCols);
    const lx  = pcLegX + 42 + col * 95;
    const ly  = pcLegY - 4 + row * pcLegRowH;

    pcG.append("circle")
      .attr("cx", lx).attr("cy", ly)
      .attr("r", 5).attr("fill", typeColors[type]);

    pcG.append("text")
      .attr("x", lx + 8).attr("y", ly + 4)
      .attr("font-size", "9px").attr("fill", "#333")
      .text(type);
  });

}).catch(function(error) {
  console.error("Error loading CSV:", error);
});