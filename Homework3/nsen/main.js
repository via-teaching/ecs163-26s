// Window dimensions
const width = window.innerWidth;
const height = window.innerHeight;

// Margins
const margins = {
  top: 50,
  bottom: 40,
  left: 80,
  right: 50,
};

// Title Height
const headerHeight = 100;
const keyHeight = 40;

// Dimensions for all three charts
const chartDims = {
  bar: {
    width: width / 2,
    height: height / 2 - headerHeight / 2,
    innerWidth: width / 2 - margins.left - margins.right,
    innerHeight: height / 2 - headerHeight / 2 - margins.top - margins.bottom,
  },
  scatter: {
    width: width / 2,
    height: height / 2 - headerHeight / 2,
    innerWidth: width / 2 - margins.left - margins.right,
    innerHeight: height / 2 - headerHeight / 2 - margins.top - margins.bottom,
  },
  parallel: {
    width: width / 2,
    height: height - headerHeight,
    innerWidth: width / 2 - margins.left - margins.right,
    innerHeight:
      height - headerHeight - margins.top - margins.bottom - keyHeight,
  },
};

const typeColorDict = {
  Grass: "#8cc260",
  Fire: "#e38643",
  Water: "#748cc8",
  Bug: "#abb542",
  Normal: "#a8a67d",
  Poison: "#924a96",
  Electric: "#f3d153",
  Ground: "#dbbf75",
  Fairy: "#ffffff",
  Fighting: "#b13d30",
  Psychic: "#e66289",
  Rock: "#b2a04a",
  Ghost: "#6d5b95",
  Ice: "#a5d7d8",
  Dragon: "#524e9b",
  Dark: "#6c594a",
  Steel: "#b8b9ce",
  Flying: "#a192c9",
};

const typeColors = d3
  .scaleOrdinal()
  .domain(Object.keys(typeColorDict))
  .range(Object.values(typeColorDict));

// d3.select("#bar-svg")
//   .style("height", `${chartDims.bar.height}px`)
//   .style("width", `${chartDims.bar.width}px`);
d3.select(".left-col")
  .style("height", `${chartDims.parallel.height}px`)
  .style("width", `${chartDims.parallel.width}px`);
d3.select(".right-top")
  .style("height", `${chartDims.bar.height}px`)
  .style("width", `${chartDims.bar.width}px`);
d3.select(".right-bot")
  .style("height", `${chartDims.scatter.height}px`)
  .style("width", `${chartDims.scatter.width}px`);

// Load the dataset and build svg's
d3.csv("data/pokemon_data.csv").then((rawData) => {
  console.log("rawData", rawData);

  // Reassign in case processing is needed later
  const data = rawData;
  // console.log("data", data);

  // plot 1: Bar chart

  // Select the bar-svg
  const barSvg = d3
    .selectAll("#bar-svg")
    .append("g")
    .attr("width", chartDims.bar.width)
    .attr("height", chartDims.bar.height);

  // Reduce data to Type_1 frequencies
  const barData = Array.from(
    d3.rollup(
      data,
      (v) => v.length,
      (d) => d.Type_1,
    ),
    ([Type_1, freq]) => ({ Type_1, freq }),
  );
  // console.log("barData", barData);

  // Create x and y axis

  // Compute x axis
  const barX1 = d3
    .scaleBand()
    .domain(barData.map((d) => d.Type_1))
    .range([margins.left, margins.left + chartDims.bar.innerWidth])
    .padding(0.08);

  // Draw x axis
  barSvg
    .append("g")
    .attr(
      "transform",
      `translate(${0}, ${margins.top + chartDims.bar.innerHeight})`,
    )
    .call(d3.axisBottom(barX1))
    .selectAll("text")
    .attr("transform", `translate(0, 0) rotate(0)`)
    .attr("text-anchor", "center");

  // Label x axis
  barSvg
    .append("text")
    .attr("x", chartDims.bar.width / 2)
    .attr("y", chartDims.bar.height - 5)
    .attr("font-size", "14px")
    .attr("text-anchor", "middle")
    .text("Type 1");

  // Compute y axis
  const barY1 = d3
    .scaleLinear()
    .domain([0, d3.max(barData, (d) => d.freq)])
    .range([margins.top + chartDims.bar.innerHeight, margins.top]);

  // Draw y axis
  barSvg
    .append("g")
    .attr("transform", `translate(${margins.left}, ${0})`)
    .call(d3.axisLeft(barY1))
    .selectAll("text")
    .attr("transform", `translate(0, 0) rotate(0)`)
    .attr("text-anchor", "end");

  // Label y axis
  barSvg
    .append("text")
    .attr(
      "transform",
      `translate(${margins.left - 30}, ${margins.top + chartDims.bar.innerHeight / 2}) rotate(-90)`,
    )
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .text("Frequency");

  // Draw bars
  const barColor = "#77ACA2";
  const highlightColor = "orange";
  const rect = barSvg
    .append("g")
    .classed("mark", true)
    .selectAll("rect")
    .data(barData)
    .join("rect")
    .attr("x", (d) => barX1(d.Type_1))
    .attr("y", (d) => barY1(d.freq))
    .attr("width", barX1.bandwidth())
    .attr(
      "height",
      (d) => margins.top + chartDims.bar.innerHeight - barY1(d.freq),
    )
    .style("fill", (d) => typeColors(d.Type_1))
    .attr("stroke", "black")
    .attr("stroke-width", 1);

  // Bar title
  rect.append("title").text((d) => `Type 1: ${d.Type_1}\nFrequency: ${d.freq}`);

  // plot 2: Scatterplot

  // Select the scatter-svg
  const scatterSvg = d3
    .selectAll("#scatter-svg")
    .append("g")
    .attr("width", chartDims.scatter.width)
    .attr("height", chartDims.scatter.height);
  // .attr("viewbox", "-5 -5 10 10");

  const scatterData = data.map((d) => ({
    Total: d.Total,
    Catch_Rate: parseInt(d.Catch_Rate),
    Type_1: d.Type_1,
  }));

  // Create x and y axis

  // Compute x axis
  const scatterX1 = d3
    .scaleLinear()
    .domain([0, Math.round(d3.max(scatterData, (d) => d.Total) / 50 + 1) * 50])
    .range([margins.left, margins.left + chartDims.scatter.innerWidth]);

  // Draw x axis
  scatterSvg
    .append("g")
    .attr(
      "transform",
      `translate(${0}, ${margins.top + chartDims.scatter.innerHeight})`,
    )
    .call(d3.axisBottom(scatterX1))
    .selectAll("text")
    .attr("transform", `translate(0, 0) rotate(0)`)
    .attr("text-anchor", "center");

  // Label x axis
  scatterSvg
    .append("text")
    .attr("x", chartDims.scatter.width / 2)
    .attr("y", chartDims.scatter.height - 5)
    .attr("font-size", "14px")
    .attr("text-anchor", "middle")
    .text("Total Stats");
  console.log(
    "max catch rate",
    d3.max(scatterData, (d) => d.Catch_Rate),
  );
  // Compute y axis
  const scatterY1 = d3
    .scaleLinear()
    .domain([0, d3.max(scatterData, (d) => d.Catch_Rate)])
    .range([margins.top + chartDims.scatter.innerHeight, margins.top]);

  // Draw y axis
  scatterSvg
    .append("g")
    .attr("transform", `translate(${margins.left}, ${0})`)
    .call(d3.axisLeft(scatterY1))
    .selectAll("text")
    .attr("transform", `translate(0, 0) rotate(0)`)
    .attr("text-anchor", "end");

  // Label y axis
  scatterSvg
    .append("text")
    .attr(
      "transform",
      `translate(${margins.left - 30}, ${margins.top + chartDims.scatter.innerHeight / 2}) rotate(-90)`,
    )
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .text("Catch Rate %");

  // Draw circles
  const r = 5;
  const circles = scatterSvg
    .append("g")
    .classed("mark", true)
    .selectAll("circle")
    .data(scatterData)
    .join("circle")
    .classed("mark-circle", true)
    .attr("cx", (d) => scatterX1(d.Total))
    .attr("cy", (d) => scatterY1(d.Catch_Rate))
    .attr("r", (d) => r)
    .style("fill", (d) => typeColors(d.Type_1))
    .style("fill-opacity", 0.7)
    .style("stroke", "black")
    .style("stroke-width", 0.8);
});
