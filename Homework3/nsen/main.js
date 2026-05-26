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
const keyHeight = 20;

// Animation duration (ms)
const animDur = 175;

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

// Type to color dictionary
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

// Type to color mapping
const typeColors = d3
  .scaleOrdinal()
  .domain(Object.keys(typeColorDict))
  .range(Object.values(typeColorDict));

// Dynamially resize svg height and width on page refresh
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

  // Create type filtering behavior
  const activeCategories = new Set(Object.keys(typeColorDict));

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

  // Plot Title
  barSvg
    .append("text")
    .attr("x", chartDims.bar.width / 2)
    .attr("y", margins.top - 20)
    .attr("text-anchor", "middle")
    .style("font-size", `${chartDims.bar.innerWidth / 504.1666666667}rem`)
    .style("font-weight", "bold")
    .text("Type 1 vs Frequency");

  // Help indicator text
  barSvg
    .append("text")
    .attr("text-anchor", "middle")
    .style("font-size", `${chartDims.bar.innerWidth / 756.25}rem`)
    .style("font-weight", "bold")
    .text(`*Select bars to filter`)
    .attr("x", chartDims.bar.innerWidth)
    .attr("y", margins.top)
    .append("tspan")
    .text(`data by Type 1`)
    .attr("x", chartDims.bar.innerWidth)
    .attr("y", margins.top + chartDims.bar.innerWidth / 40);

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
    .attr("font-size", `${chartDims.bar.innerWidth / 1210}rem`)
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
  const rect = barSvg
    .append("g")
    .classed("mark", true)
    .selectAll("rect")
    .data(barData)
    .join("rect")
    .attr("class", "bars")
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

  // Bar tooltips
  rect.append("title").text((d) => `Type 1: ${d.Type_1}\nFrequency: ${d.freq}`);

  // plot 2: Scatterplot

  // Select the scatter-svg
  const scatterSvg = d3
    .selectAll("#scatter-svg")
    .append("g")
    .attr("width", chartDims.scatter.width)
    .attr("height", chartDims.scatter.height);

  // Filter data attributes for scatterplot
  const scatterData = data.map((d) => ({
    Total: parseInt(d.Total),
    Catch_Rate: parseInt(d.Catch_Rate),
    Type_1: d.Type_1,
    Number: d.Number,
    Name: d.Name,
  }));

  // Plot Title
  scatterSvg
    .append("text")
    .attr("x", chartDims.scatter.width / 2)
    .attr("y", margins.top - 20)
    .attr("text-anchor", "middle")
    .style("font-size", `${chartDims.scatter.innerWidth / 504.1666666667}rem`)
    .style("font-weight", "bold")
    .text("Total Stats vs Catch Rate");

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
    .text("Catch Rate");

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
    .style("fill-opacity", 0.9)
    .style("stroke", "black")
    .style("stroke-width", 0.8);

  // Circle tooltips
  circles
    .append("title")
    .text(
      (d) =>
        `Name: ${d.Name}\nTotal Stats: ${d.Total}\nCatch Rate: ${d.Catch_Rate}`,
    );

  // plot 3: Parallel Coordinates Plot
  // Source: https://observablehq.com/@d3/brushable-parallel-coordinates?collection=@d3/d3-brush

  // Select the parallel-svg
  const parallelSvg = d3
    .selectAll("#parallel-svg")
    .append("g")
    .attr("width", chartDims.parallel.width)
    .attr("height", chartDims.parallel.height);

  // All relevant keys for the chart
  const keys = [
    "Total",
    "HP",
    "Attack",
    "Defense",
    "Sp_Atk",
    "Sp_Def",
    "Speed",
  ];

  // Filter data attributes for parallel coords plot
  const parallelData = data.map((d) => ({
    Total: parseInt(d.Total),
    HP: parseInt(d.HP),
    Attack: parseInt(d.Attack),
    Defense: parseInt(d.Defense),
    Sp_Atk: parseInt(d.Sp_Atk),
    Sp_Def: parseInt(d.Sp_Def),
    Speed: parseInt(d.Speed),
    Type_1: d.Type_1,
    Number: d.Number,
  }));

  // Plot Title
  parallelSvg
    .append("text")
    .attr("x", chartDims.parallel.width / 2)
    .attr("y", margins.top + keyHeight - 30)
    .attr("text-anchor", "middle")
    .style("font-size", `${chartDims.parallel.innerWidth / 504.1666666667}rem`)
    .style("font-weight", "bold")
    .text("Distribution of Base Stats");

  // Help indicator text
  parallelSvg
    .append("text")
    .attr("text-anchor", "middle")
    .style("font-size", `${chartDims.parallel.innerWidth / 756.25}rem`)
    .style("font-weight", "bold")
    .text(`*Brush along any axis`)
    .attr("x", chartDims.parallel.innerWidth)
    .attr("y", margins.top - 15)
    .append("tspan")
    .text(`to filter by data points`)
    .attr("x", chartDims.parallel.innerWidth)
    .attr("y", margins.top + chartDims.parallel.innerWidth / 40 - 15);

  // Create the horizontal axis scale for each key
  const parallelXAxis = new Map(
    Array.from(keys, (key) => [
      key,
      d3.scaleLinear(
        d3.extent(parallelData, (d) => d[key]),
        [margins.left, margins.left + chartDims.parallel.innerWidth],
      ),
    ]),
  );

  // Create the vertical scale
  const parallelYAxis = d3.scalePoint(keys, [
    margins.top + keyHeight,
    chartDims.parallel.height - margins.bottom,
  ]);

  // Compute the paths from data set
  const line = d3
    .line()
    .defined(([, value]) => value != null)
    .x(([key, value]) => parallelXAxis.get(key)(value))
    .y(([key]) => parallelYAxis(key));

  // Draw the paths
  const path = parallelSvg
    .append("g")
    .attr("fill", "none")
    .attr("stroke-width", 1.5)
    .attr("stroke-opacity", 0.4)
    .selectAll("path")
    .data(parallelData)
    .join("path")
    .attr("stroke", (d) =>
      activeCategories.has(d.Type_1) ? typeColors(d.Type_1) : deselectedColor,
    )
    .attr("d", (d) => line(d3.cross(keys, [d], (key, d) => [key, d[key]])))
    .call((path) => path.append("title").text((d) => d.name));

  // Append the axis for each key.
  const axes = parallelSvg
    .append("g")
    .selectAll("g")
    .data(keys)
    .join("g")
    .attr("transform", (d) => `translate(0,${parallelYAxis(d)})`)
    .each(function (d) {
      d3.select(this).call(d3.axisBottom(parallelXAxis.get(d)));
    })
    .call((g) =>
      g
        .append("text")
        .attr("x", margins.left)
        .attr("y", -6)
        .attr("text-anchor", "start")
        .attr("fill", "currentColor")
        .text((d) => d),
    )
    .call((g) =>
      g
        .selectAll("text")
        .clone(true)
        .lower()
        .attr("fill", "none")
        .attr("stroke-width", 5)
        .attr("stroke-linejoin", "round")
        .attr("stroke", "white"),
    );

  // Create the brush behavior.
  const deselectedColor = "#c8d7bd";
  const brushHeight = 50;

  // Create brush object to fit axis dimensions and hook up callback
  const brush = d3
    .brushX()
    .extent([
      [margins.left, -(brushHeight / 2)],
      [margins.left + chartDims.parallel.innerWidth, brushHeight / 2],
    ])
    .on("start brush end", brushed);

  // Enable brushing
  axes.call(brush);

  const selections = new Map();
  let activePoints = new Set(rawData.map((d) => d.Number));

  function brushed({ selection }, key) {
    if (selection === null) selections.delete(key);
    else selections.set(key, selection.map(parallelXAxis.get(key).invert));
    const selected = [];
    activePoints = new Set();
    path.each(function (d) {
      const active = Array.from(selections).every(
        ([key, [min, max]]) => d[key] >= min && d[key] <= max,
      );
      // Transition paths based on filtering
      d3.select(this)
        .transition("brush")
        .duration(animDur)
        .style(
          "stroke",
          active && activeCategories.has(d.Type_1)
            ? typeColors(d.Type_1)
            : deselectedColor,
        );
      if (active) {
        // Rerender paths on top to cycle occlusion
        d3.select(this).raise();
        selected.push(d);
        activePoints.add(d.Number);
      }
    });
    scatterSelect();
    parallelSvg.property("value", selected).dispatch("input");
  }

  // Add select feature for bars
  const bars = barSvg.selectAll(".bars").on("click", function (event, d) {
    if (activeCategories.has(d.Type_1)) {
      activeCategories.delete(d.Type_1);

      // Transition bars based on filtering
      d3.select(this)
        .transition("bars-select")
        .duration(animDur)
        .style("opacity", 0.3);
    } else {
      activeCategories.add(d.Type_1);
      // Transition bars based on filtering
      d3.select(this)
        .transition("bars-deselect")
        .duration(animDur)
        .style("opacity", 1);
    }

    path.each(function (d) {
      // Transition paths based on filtering
      d3.select(this)
        .transition("paths")
        .duration(animDur)
        .style(
          "stroke",
          activePoints.has(d.Number) && activeCategories.has(d.Type_1)
            ? typeColors(d.Type_1)
            : deselectedColor,
        );
    });
    scatterSelect();
  });

  function scatterSelect() {
    // Transition dots based on filtering
    const dots = scatterSvg
      .selectAll(".mark-circle")
      .transition("scatter")
      .duration(animDur)
      .style("fill-opacity", (d) =>
        activeCategories.has(d.Type_1) && activePoints.has(d.Number) ? 0.9 : 0,
      )
      .style("stroke-opacity", (d) =>
        activeCategories.has(d.Type_1) && activePoints.has(d.Number) ? 1 : 0,
      );
  }
});
