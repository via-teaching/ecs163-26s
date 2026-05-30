// I used claude to help me with this assignment
// I created three visualizations, each corresponding with a research question I had. For my overview, I did a bar chart, as my question was how many of each type of pokemon is represented in the data set? I believe this is important since type is the most general filter. For interactivity, I added one to the bar chart, so if you click on a bar, all three graphs change and show the data for that kind of pokemon. My second question was how does each pokemon type differ in special attack and speed compared to their overall stats? I made a bubble chart for this, and added interactivity through being able to pan and zoom on the chart, and each bubble information is shown when the cursor hovers. For my final visualization, I wanted to display an entire full stats display for each pokemon, so I chose to do parallel coordinates as my advanced. There are also fade animation transition for all three graphs when a type is selected on the bar chart. 


const totalWidth  = document.documentElement.clientWidth;
const totalHeight = document.documentElement.clientHeight;

const titleHeight = 40;

const topHeight    = Math.floor((totalHeight - titleHeight) * 0.47);
const bottomHeight = (totalHeight - titleHeight) - topHeight;
const topY         = titleHeight;

// This section of code is to make the top, bottom, y axis and x axis margins for the bar chart 
const barMargin = { top: 50, right: 20, bottom: 75, left: 60 };
const barWidth  = Math.floor(totalWidth * 0.52) - barMargin.left - barMargin.right;
const barHeight = topHeight - barMargin.top - barMargin.bottom;
// this code does the same, but for the bubble chart 
const bubMargin = { top: 50, right: 20, bottom: 50, left: 65 };
const bubWidth  = Math.floor(totalWidth * 0.48) - bubMargin.left - bubMargin.right - 120;
const bubHeight = topHeight - bubMargin.top - bubMargin.bottom;
// this is also the same, but for the parallel coordinates
const pcMargin = { top: 80, right: 40, bottom: 70, left: 60 };
const pcWidth  = totalWidth - pcMargin.left - pcMargin.right;
const pcHeight = bottomHeight - pcMargin.top - pcMargin.bottom;
// these name the columns that are going to be used in the parallel coordinates graph
const dimensions = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];
// this changes the csv names to labels on the graph that are more readable and easy to understand
const dimLabels = {
  "HP": "HP", "Attack": "Attack", "Defense": "Defense",
  "Sp_Atk": "Special Attack", "Sp_Def": "Special Defense", "Speed": "Speed"
};
// this assigns each kind of pokemon type a special, unique color, so when the interactivity is used, the same color for each type is  presented and kept consistent

const typeColors = {
  "Normal":   "#A8A878",
  "Fire":     "#F08030",
  "Water":    "#6890F0",
  "Electric": "#F8D030",
  "Grass":    "#78C850",
  "Ice":      "#98D8D8",
  "Fighting": "#C03028",
  "Poison":   "#A040A0",
  "Ground":   "#E0C068",
  "Flying":   "#A890F0",
  "Psychic":  "#F85888",
  "Bug":      "#A8B820",
  "Rock":     "#B8A038",
  "Ghost":    "#705898",
  "Dragon":   "#7038F8",
  "Dark":     "#705848",
  "Steel":    "#B8B8D0",
  "Fairy":    "#EE99AC"
};
// when the user selects a type in the bar graph, this keeps track of this and if no type is chosen at all

let selectedType = null;
//this draws a chart inside the svg element that i previously defined

const svg = d3.select("svg");
// i wanted each of the visualiizations to have a different background from each other so they are easy to seperate from each other, this is for the bar chart

svg.append("rect")
  .attr("x", 0).attr("y", topY)
  .attr("width", Math.floor(totalWidth * 0.52))
  .attr("height", topHeight)
  .attr("fill", "#f9f9fc");

// background but for the bubble chart 
svg.append("rect")
  .attr("x", Math.floor(totalWidth * 0.52)).attr("y", topY)
  .attr("width", Math.ceil(totalWidth * 0.48))
  .attr("height", topHeight)
  .attr("fill", "#fffdf7");

// backgroumd but for the parallel coordinates viewpoint
svg.append("rect")
  .attr("x", 0).attr("y", topY + topHeight)
  .attr("width", totalWidth).attr("height", bottomHeight)
  .attr("fill", "#f7f9ff");
// this creates a line between the bubble chart and bar chart 

svg.append("line")
  .attr("x1", Math.floor(totalWidth * 0.52))
  .attr("x2", Math.floor(totalWidth * 0.52))
  .attr("y1", topY).attr("y2", topY + topHeight)
  .attr("stroke", "#ddd").attr("stroke-width", 1.5);

//this creates a line between the parallel coordinates chart and the top ones
svg.append("line")
  .attr("x1", 0).attr("x2", totalWidth)
  .attr("y1", topY + topHeight).attr("y2", topY + topHeight)
  .attr("stroke", "#ddd").attr("stroke-width", 1.5);

// this is for the title 
svg.append("text")
  .attr("x", totalWidth / 2)
  .attr("y", titleHeight * 0.72)
  .attr("text-anchor", "middle")
  .attr("font-size", "18px").attr("font-weight", "bold")
  .attr("font-family", "Georgia, serif").attr("fill", "#1a1a2e")
  .text("Stats Dashboard for Pokemon Combat");

// i added a seperator here from the title and everything else 
svg.append("line")
  .attr("x1", 0).attr("x2", totalWidth)
  .attr("y1", titleHeight).attr("y2", titleHeight)
  .attr("stroke", "#ccc").attr("stroke-width", 1);

// Instruction text at the bottom of the top row telling the user how to interact with the dashboard
// placed in the bottom panel above the parallel coordinates so it doesn't overlap the axis labels
svg.append("text")
  .attr("x", totalWidth / 2)
  .attr("y", topY + topHeight + 15)
  .attr("text-anchor", "middle")
  .attr("font-size", "10px").attr("fill", "#aaa")
  .text("To filter by type, click a bar. To pan and zoom in the bubble chart, scroll or drag. Each bubble provides details when hovered upon. To exit each type, click bar again.");
// this loads the actual data set to pull data for and creates the function
d3.csv("data/pokemon_alopez247.csv").then(function(rawData) {
  // since everything is text, this converts to numbers
  
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
  //this filters out the data set when making the parallel coordinates graph to around 500, removing legendary pokemon and weak
  
  const filteredData = rawData.filter(function(d) {
    return d.Total >= 500 && d.isLegendary === "False";
  });
  //this uses a fade animation when a type is clicked in the bar chart and changes all three dashboards

  function updateViews() {
    // this adds the animation and changes the bubbles to match selected type 
    bubInner.selectAll(".bubble")
      .transition().duration(400)
      .attr("opacity", function(d) {
        if (!selectedType) return 0.75;
        return d.Type_1 === selectedType ? 0.9 : 0.05;
      })
      .style("pointer-events", function(d) {
        // this makes sure that when hovering for details, only the selected type appears
        if (!selectedType) return "all";
        return d.Type_1 === selectedType ? "all" : "none";
      });
      // this makes sure the animation for the parralel coordinates matches the bubbles 
     
    pcG.selectAll(".pc-line")
      .transition().duration(400)
      .attr("stroke-width", function(d) {
        if (!selectedType) return 1.1;
        return d.Type_1 === selectedType ? 2.0 : 0.8;
      })
      .attr("opacity", function(d) {
        if (!selectedType) return 0.32;
        return d.Type_1 === selectedType ? 0.8 : 0.04;
      });

    // this animation dims down the color of all the other types that were not selected in the bar chart 
    barG.selectAll(".bar")
      .transition().duration(400)
      .attr("opacity", function(d) {
        if (!selectedType) return 0.88;
        return d.key === selectedType ? 1.0 : 0.2;
      });
  }
  // this finds the primary type of pokemon then groups them, then counts how many there are

  const typeCounts = d3.nest()
    .key(function(d) { return d.Type_1; })
    .rollup(function(v) { return v.length; })
    .entries(rawData)
    .sort(function(a, b) { return b.value - a.value; });
// container for the bar chart 
  
  const barG = svg.append("g")
    .attr("transform", "translate(" + barMargin.left + "," + (topY + barMargin.top) + ")");

  // this creates a title for the barchart 
  barG.append("text")
    .attr("x", barWidth / 2).attr("y", -30)
    .attr("text-anchor", "middle")
    .attr("font-size", "13px").attr("font-weight", "bold").attr("fill", "#333")
    .text("Number of each Pokemon per Pokemon Type");

  // this adds the subtitle 
  barG.append("text")
    .attr("x", barWidth / 2).attr("y", -14)
    .attr("text-anchor", "middle")
    .attr("font-size", "10px").attr("fill", "#888")
    .text("Overview — In order to filter by type, click on a bar");

  // this creates a scale for the x axis using scaleBand
  const xBar = d3.scaleBand()
    .domain(typeCounts.map(function(d) { return d.key; }))
    .range([0, barWidth])
    .padding(0.22);

  // this creates a scale for the y axis on the barchart 
  const yBar = d3.scaleLinear()
    .domain([0, d3.max(typeCounts, function(d) { return d.value; }) + 8])
    .range([barHeight, 0]);

  // this draws the x axis on the bar chart 
  barG.append("g")
    .attr("transform", "translate(0," + barHeight + ")")
    .call(d3.axisBottom(xBar))
    .selectAll("text")
      .attr("transform", "rotate(-38)")
      .attr("text-anchor", "end")
      .attr("dx", "-0.4em").attr("dy", "0.5em")
      .attr("font-size", "11px");

  // this draws the y axis 
  barG.append("g")
    .call(d3.axisLeft(yBar).ticks(6));

  //this labels the x axis 
  barG.append("text")
    .attr("x", barWidth / 2).attr("y", barHeight + 65)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px").attr("fill", "#555")
    .text("Pokemon Type");

  // this labels the y axis 
  barG.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -(barHeight / 2)).attr("y", -45)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px").attr("fill", "#555")
    .text("# of Pokemon");

  // this draws the bar for each type, with height and color for identity 

  barG.selectAll(".bar")
    .data(typeCounts)
    .enter()
    .append("rect")
      .attr("class", "bar")
      .attr("x", function(d) { return xBar(d.key); })
      .attr("y", function(d) { return yBar(d.value); })
      .attr("width", xBar.bandwidth())
      .attr("height", function(d) { return barHeight - yBar(d.value); })
      .attr("fill", function(d) { return typeColors[d.key] || "#aaa"; })
      .attr("opacity", 0.88)
      .style("cursor", "pointer")
      // this adds the first interaction, filtering by clicking on a bar
      .on("click", function(d) {
        selectedType = (selectedType === d.key) ? null : d.key;
        updateViews();
      });

  // places exact value above the bars 
  barG.selectAll(".bar-label")
    .data(typeCounts)
    .enter()
    .append("text")
      .attr("class", "bar-label")
      .attr("x", function(d) { return xBar(d.key) + xBar.bandwidth() / 2; })
      .attr("y", function(d) { return yBar(d.value) - 3; })
      .attr("text-anchor", "middle")
      .attr("font-size", "9px").attr("fill", "#444")
      .text(function(d) { return d.value; });

  // this pushes the bubble chart to the correct panel
  const bubOffsetX = Math.floor(totalWidth * 0.52) + bubMargin.left;
  const bubG = svg.append("g")
    .attr("transform", "translate(" + bubOffsetX + "," + (topY + bubMargin.top) + ")");

  // title for bubble chart 
  bubG.append("text")
    .attr("x", bubWidth / 2).attr("y", -30)
    .attr("text-anchor", "middle")
    .attr("font-size", "13px").attr("font-weight", "bold").attr("fill", "#333")
    .text("Comparing Speed vs Special Attack vs Total Stat Number");

  // subtitle for bubble chart 
  bubG.append("text")
    .attr("x", bubWidth / 2).attr("y", -14)
    .attr("text-anchor", "middle")
    .attr("font-size", "10px").attr("fill", "#888")
    .text("Drag to pan, hover for details, scroll to zoom.");

  // this creates the scale for bubble chart x axis 
  const xBub = d3.scaleLinear()
    .domain([0, d3.max(rawData, function(d) { return d.Speed; }) + 10])
    .range([0, bubWidth]);

  //this creates the scale for bubble chart y axis 
  const yBub = d3.scaleLinear()
    .domain([0, d3.max(rawData, function(d) { return d.Sp_Atk; }) + 10])
    .range([bubHeight, 0]);

  // this creates a scale for the radius of the bubbles matching overall stat 
  const rBub = d3.scaleSqrt()
    .domain([0, d3.max(rawData, function(d) { return d.Total; })])
    .range([1.5, 13]);

  // this makes sure that when panning and zooming is occuring, the bubbles say within the boundary 
  svg.append("defs").append("clipPath")
    .attr("id", "bub-clip")
    .append("rect")
      .attr("x", 0).attr("y", 0)
      .attr("width", bubWidth).attr("height", bubHeight);

  // makes the x axis stored as a variable to accomodate zoom changes
  const xBubAxisG = bubG.append("g")
    .attr("transform", "translate(0," + bubHeight + ")")
    .call(d3.axisBottom(xBub).ticks(6));

  // same but for y axis 
  const yBubAxisG = bubG.append("g")
    .call(d3.axisLeft(yBub).ticks(6));

  // this adds the label for x axis 
  bubG.append("text")
    .attr("x", bubWidth / 2).attr("y", bubHeight + 38)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px").attr("fill", "#555")
    .text("Speed");

  //y axis label
  bubG.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -(bubHeight / 2)).attr("y", -50)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px").attr("fill", "#555")
    .text("Special Attack");
// this is for when you hover a bubble, a tooltip div will appear near cursor 
 
  const tooltip = d3.select("body").append("div")
    .style("position", "absolute")
    .style("background", "rgba(0,0,0,0.78)")
    .style("color", "#fff")
    .style("padding", "8px 12px")
    .style("border-radius", "6px")
    .style("font-size", "12px")
    .style("line-height", "1.6")
    .style("pointer-events", "none")
    .style("opacity", 0);

  // this is my second interaction, bubble chart pan and zoom
  const zoom = d3.zoom()
    .scaleExtent([1, 10])
    .translateExtent([[0, 0], [bubWidth, bubHeight]])
    .extent([[0, 0], [bubWidth, bubHeight]])
    .on("zoom", function() {
      const transform = d3.event.transform;

      // this rescales the x and y axis to match zooms in 
      const newXScale = transform.rescaleX(xBub);
      const newYScale = transform.rescaleY(yBub);

      // this updates the labels and ticks to match zoom
      xBubAxisG.call(d3.axisBottom(newXScale).ticks(6));
      yBubAxisG.call(d3.axisLeft(newYScale).ticks(6));

      // moves the bubbles to stay consistent when zoomed 
      bubInner.selectAll(".bubble")
        .attr("cx", function(d) { return newXScale(d.Speed); })
        .attr("cy", function(d) { return newYScale(d.Sp_Atk); });
    });

  // inner group container for the bubbles 
  const bubInner = bubG.append("g")
    .attr("clip-path", "url(#bub-clip)")
    .style("cursor", "move")
    .call(zoom);
// tracks drags and scrolls to make zoom interaction
  bubInner.append("rect")
    .attr("width", bubWidth)
    .attr("height", bubHeight)
    .attr("fill", "none")
    .attr("pointer-events", "all");

  // this draws the bubble, using position, color, size to identify each pokemon
  bubInner.selectAll(".bubble")
    .data(rawData)
    .enter()
    .append("circle")
      .attr("class", "bubble")
      .attr("cx", function(d) { return xBub(d.Speed); })
      .attr("cy", function(d) { return yBub(d.Sp_Atk); })
      .attr("r",  function(d) { return rBub(d.Total); })
      .attr("fill", function(d) { return typeColors[d.Type_1] || "#aaa"; })
      .attr("opacity", 0.75)
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.4)
      // this it to make the tool tip with type name and stats when hovering
      .on("mouseover", function(d) {
        tooltip.transition().duration(150).style("opacity", 1);
        tooltip.html(
          "<strong>" + d.Name + "</strong><br/>" +
          "Type: " + d.Type_1 + (d.Type_2 ? " / " + d.Type_2 : "") + "<br/>" +
          "Speed: " + d.Speed + "<br/>" +
          "Sp. Attack: " + d.Sp_Atk + "<br/>" +
          "Total: " + d.Total
        )
        .style("left", (d3.event.pageX + 12) + "px")
        .style("top",  (d3.event.pageY - 28) + "px");
      })
      // makes sure tooltip follows mouse in bubble
      .on("mousemove", function() {
        tooltip
          .style("left", (d3.event.pageX + 12) + "px")
          .style("top",  (d3.event.pageY - 28) + "px");
      })
      // make sure tooltip leaves when mouse leaves bubble 
      .on("mouseout", function() {
        tooltip.transition().duration(200).style("opacity", 0);
      });

  // loads all the types so it can make the legend
  const legendTypes = Object.keys(typeColors);
  const legCols = 2;
  const legRowH = 15;
  const legX    = bubWidth + 14;
  const legY    = 0;

  // legend lable 
  bubG.append("text")
    .attr("x", legX).attr("y", legY + 2)
    .attr("font-size", "10px").attr("font-weight", "bold").attr("fill", "#333")
    .text("Type");

  //adds colored dot and name for each type in legend
  legendTypes.forEach(function(type, i) {
    const col = i % legCols;
    const row = Math.floor(i / legCols);
    const lx  = legX + col * 52;
    const ly  = legY + 16 + row * legRowH;

    bubG.append("circle")
      .attr("cx", lx + 4).attr("cy", ly)
      .attr("r", 5)
      .attr("fill", typeColors[type])
      .attr("opacity", 0.75);

    bubG.append("text")
      .attr("x", lx + 12).attr("y", ly + 4)
      .attr("font-size", "9px").attr("fill", "#333")
      .text(type);
  });

  // example stats per size in legend 
  const totVals = [200, 400, 600, 720];
  const szLegY  = legY + 16 + Math.ceil(legendTypes.length / legCols) * legRowH + 16;

  // label for size legend
  bubG.append("text")
    .attr("x", legX).attr("y", szLegY)
    .attr("font-size", "10px").attr("font-weight", "bold").attr("fill", "#444")
    .text("Total Stat:");

  // circles for size legend
  totVals.forEach(function(val, i) {
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

  // paralell coordinates group container
  const pcG = svg.append("g")
    .attr("transform", "translate(" + pcMargin.left + "," + (topY + topHeight + pcMargin.top) + ")");

  // parallel coordinates lable
  pcG.append("text")
    .attr("x", pcWidth / 2).attr("y", -50)
    .attr("text-anchor", "middle")
    .attr("font-size", "13px").attr("font-weight", "bold").attr("fill", "#333")
    .text("Full Pokemon Profile");

  // subtitle 
  pcG.append("text")
    .attr("x", pcWidth / 2).attr("y", -32)
    .attr("text-anchor", "middle")
    .attr("font-size", "10px").attr("fill", "#888")
    .text("Each line represents a Pokemon. Color represents type of Pokemon. The peaks in the graph are strengths, and the lows are weaknesses.");

  // creates a y scale for each individual stat 
  const yScales = {};
  dimensions.forEach(function(dim) {
    yScales[dim] = d3.scaleLinear()
      .domain([0, d3.max(rawData, function(d) { return d[dim]; })])
      .range([pcHeight, 0]);
  });

  // creates x scale with 6 even factors 
  const xPC = d3.scalePoint()
    .domain(dimensions)
    .range([0, pcWidth])
    .padding(0.15);
// takes pokemon stat values and converts to an svg path 
  
  function pcLine(d) {
    return d3.line()(
      dimensions.map(function(dim) {
        return [xPC(dim), yScales[dim](d[dim])];
      })
    );
  }

  // makes a low opacity line for the filtered pokemon, one per each

  pcG.selectAll(".pc-line")
    .data(filteredData)
    .enter()
    .append("path")
      .attr("class", "pc-line")
      .attr("d", pcLine)
      .attr("fill", "none")
      .attr("stroke", function(d) { return typeColors[d.Type_1] || "#aaa"; })
      .attr("stroke-width", 1.1)
      .attr("opacity", 0.32);

  // created vertical axis 
 
  dimensions.forEach(function(dim) {
    const axisG = pcG.append("g")
      .attr("transform", "translate(" + xPC(dim) + ",0)");

    // makes sure no more than four ticks 
    axisG.call(d3.axisLeft(yScales[dim]).ticks(4));

    // changes raw cvc tables to readablr human ones 
    axisG.append("text")
      .attr("y", -14)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px").attr("font-weight", "bold").attr("fill", "#333")
      .text(dimLabels[dim]);
  });

  // Shows how many pokemon is in the data set 
  pcG.append("text")
    .attr("x", pcWidth).attr("y", pcHeight + 14)
    .attr("text-anchor", "end")
    .attr("font-size", "10px").attr("fill", "#bbb")
    .text("n = " + filteredData.length + " Pokemon (Total ≥ 500, non-legendary)");

  // variables for the layout of the legend
  const pcLegCols = 6;
  const pcLegRowH = 16;
  const pcLegX    = 0;
  const pcLegY    = pcHeight + 22;

  // legend title 
  pcG.append("text")
    .attr("x", pcLegX).attr("y", pcLegY)
    .attr("font-size", "10px").attr("font-weight", "bold").attr("fill", "#333")
    .text("Type:");

  // draws a colored dot and labels them for the legend 
  Object.keys(typeColors).forEach(function(type, i) {
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