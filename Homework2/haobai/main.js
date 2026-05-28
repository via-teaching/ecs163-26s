let selectedType = null;
let typeColor;
let allData = [];

d3.csv("data/pokemon.csv").then(data => {
  data.forEach(d => {
    d.Name = d.Name || "Unknown";
    d.Type_1 = d.Type_1 || "Unknown";
    d.Type_2 = d.Type_2 && d.Type_2.trim() !== "" ? d.Type_2 : "None";
    d.Total = +d.Total;
    d.HP = +d.HP;
    d.Attack = +d.Attack;
    d.Defense = +d.Defense;
    d.Sp_Atk = +d.Sp_Atk;
    d.Sp_Def = +d.Sp_Def;
    d.Speed = +d.Speed;
    d.Generation = +d.Generation;
  });

  allData = data;

  const types = Array.from(
    new Set(
      allData
        .flatMap(d => [d.Type_1, d.Type_2])
        .filter(d => d !== "None")
    )
  ).sort();

  const typePalette = {
    Normal: "#A8A77A",
    Fire: "#EE8130",
    Water: "#6390F0",
    Electric: "#F7D02C",
    Grass: "#7AC74C",
    Ice: "#96D9D6",
    Fighting: "#C22E28",
    Poison: "#A33EA1",
    Ground: "#E2BF65",
    Flying: "#A98FF3",
    Psychic: "#F95587",
    Bug: "#A6B91A",
    Rock: "#B6A136",
    Ghost: "#735797",
    Dragon: "#6F35FC",
    Dark: "#705746",
    Steel: "#B7B7CE",
    Fairy: "#D685AD",
    Unknown: "#999999"
  };

  typeColor = d3.scaleOrdinal()
    .domain(types)
    .range(types.map(type => typePalette[type] || "#999999"));

  d3.select("#reset-button").on("click", () => {
    selectedType = null;
    drawDashboard();
  });

  drawDashboard();
}).catch(error => {
  console.error(error);

  d3.select("body")
    .append("p")
    .style("color", "red")
    .style("text-align", "center")
    .text("Error loading data. Check that the file is named data/pokemon.csv.");
});

function drawDashboard() {
  d3.select("#selection-label")
    .text(`Current selection: ${selectedType ? selectedType : "All Types"}`);

  drawBarChart(allData);
  drawDualTypeHeatmap(allData);
  drawParallelCoordinates(allData);
}

function matchesSelectedType(d) {
  return !selectedType || d.Type_1 === selectedType || d.Type_2 === selectedType;
}

function isDualType(d) {
  return d.Type_2 && d.Type_2 !== "None";
}

function drawBarChart(data) {
  const svg = d3.select("#bar-chart");
  svg.selectAll("*").remove();

  const width = svg.node().clientWidth || 900;
  const height = svg.node().clientHeight || 220;

  const margin = {
    top: 30,
    right: 20,
    bottom: 64,
    left: 58
  };

  svg.attr("viewBox", `0 0 ${width} ${height}`);

  const typeCounts = Array.from(
    d3.rollup(data, values => values.length, d => d.Type_1),
    ([type, count]) => ({ type, count })
  ).sort((a, b) => d3.descending(a.count, b.count));

  const x = d3.scaleBand()
    .domain(typeCounts.map(d => d.type))
    .range([margin.left, width - margin.right])
    .padding(0.16);

  const y = d3.scaleLinear()
    .domain([0, d3.max(typeCounts, d => d.count) || 1])
    .nice()
    .range([height - margin.bottom, margin.top]);

  // Add the x-axis for Pokemon primary types.
  const xAxis = svg.append("g")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(x));

  xAxis.selectAll("text")
    .attr("transform", "rotate(-35)")
    .style("text-anchor", "end")
    .style("font-size", "10px");

  // Add the y-axis for the number of Pokemon.
  svg.append("g")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y).ticks(5));

  // Add one vertical bar for each primary type.
  svg.append("g")
    .selectAll("rect")
    .data(typeCounts)
    .join("rect")
    .attr("x", d => x(d.type))
    .attr("y", d => y(d.count))
    .attr("width", x.bandwidth())
    .attr("height", d => y(0) - y(d.count))
    .attr("fill", d => typeColor(d.type))
    .attr("stroke", d => selectedType === d.type ? "black" : "none")
    .attr("stroke-width", d => selectedType === d.type ? 2 : 0)
    .attr("opacity", d => !selectedType || selectedType === d.type ? 1 : 0.35)
    .style("cursor", "pointer")
    .on("click", function(event, d) {
      selectedType = selectedType === d.type ? null : d.type;
      drawDashboard();
    })
    .on("mouseover", function(event, d) {
      d3.select(this).attr("opacity", 0.75);

      showTooltip(event, `
        <strong>${d.type}</strong><br>
        Pokemon count: ${d.count}<br>
        Click to focus this type.
      `);
    })
    .on("mousemove", moveTooltip)
    .on("mouseout", function(event, d) {
      d3.select(this)
        .attr("opacity", !selectedType || selectedType === d.type ? 1 : 0.35);

      hideTooltip();
    });

  // Add numeric count labels above the bars.
  svg.append("g")
    .selectAll("text")
    .data(typeCounts)
    .join("text")
    .attr("x", d => x(d.type) + x.bandwidth() / 2)
    .attr("y", d => y(d.count) - 6)
    .attr("text-anchor", "middle")
    .attr("font-size", "10px")
    .attr("fill", "#333")
    .text(d => d.count);

  // Add the x-axis label.
  svg.append("text")
    .attr("class", "axis-label")
    .attr("x", (margin.left + width - margin.right) / 2)
    .attr("y", height - 4)
    .attr("text-anchor", "middle")
    .text("Primary Pokemon Type");

  // Add the y-axis label.
  svg.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", 16)
    .attr("text-anchor", "middle")
    .text("Number of Pokemon");
}

function drawDualTypeHeatmap(data) {
  const svg = d3.select("#heatmap-chart");
  svg.selectAll("*").remove();

  const width = svg.node().clientWidth || 520;
  const height = svg.node().clientHeight || 420;

  const margin = {
    top: 28,
    right: 78,
    bottom: 82,
    left: 74
  };

  svg.attr("viewBox", `0 0 ${width} ${height}`);

  const type1List = Array.from(new Set(data.map(d => d.Type_1))).sort();
  const type2List = Array.from(new Set(data.map(d => d.Type_2))).sort();

  const pairCountsMap = d3.rollup(
    data,
    values => values.length,
    d => d.Type_1,
    d => d.Type_2
  );

  const heatmapData = [];

  type1List.forEach(type1 => {
    type2List.forEach(type2 => {
      const count = pairCountsMap.get(type1)?.get(type2) || 0;
      heatmapData.push({ type1, type2, count });
    });
  });

  const x = d3.scaleBand()
    .domain(type2List)
    .range([margin.left, width - margin.right])
    .padding(0.05);

  const y = d3.scaleBand()
    .domain(type1List)
    .range([margin.top, height - margin.bottom])
    .padding(0.05);

  const color = d3.scaleSequential()
    .domain([0, d3.max(heatmapData, d => d.count) || 1])
    .interpolator(d3.interpolateBlues);

  // Add the x-axis for Type 2 categories.
  const xAxisGroup = svg.append("g")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(x));

  xAxisGroup.selectAll("text")
    .attr("transform", "rotate(-40)")
    .style("text-anchor", "end")
    .style("font-size", "9px");

  // Add the y-axis for Type 1 categories.
  svg.append("g")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y))
    .selectAll("text")
    .style("font-size", "9px");

  // Add one heatmap cell for each Type 1 and Type 2 combination.
  svg.append("g")
    .selectAll("rect")
    .data(heatmapData)
    .join("rect")
    .attr("x", d => x(d.type2))
    .attr("y", d => y(d.type1))
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("fill", d => d.count === 0 ? "#f1f1f1" : color(d.count))
    .attr("stroke", d => selectedType && (selectedType === d.type1 || selectedType === d.type2) ? "black" : "white")
    .attr("stroke-width", d => selectedType && (selectedType === d.type1 || selectedType === d.type2) ? 1.4 : 0.5)
    .attr("opacity", d => {
      if (!selectedType) {
        return 1;
      }
      return selectedType === d.type1 || selectedType === d.type2 ? 1 : 0.25;
    })
    .on("mouseover", function(event, d) {
      d3.select(this)
        .attr("stroke", "black")
        .attr("stroke-width", 2)
        .raise();

      showTooltip(event, `
        <strong>${d.type1} / ${d.type2}</strong><br>
        Pokemon count: ${d.count}<br>
        Type 1: ${d.type1}<br>
        Type 2: ${d.type2}
      `);
    })
    .on("mousemove", moveTooltip)
    .on("mouseout", function(event, d) {
      d3.select(this)
        .attr("stroke", selectedType && (selectedType === d.type1 || selectedType === d.type2) ? "black" : "white")
        .attr("stroke-width", selectedType && (selectedType === d.type1 || selectedType === d.type2) ? 1.4 : 0.5);

      hideTooltip();
    });

  // Add the x-axis label for Type 2.
  svg.append("text")
    .attr("class", "axis-label")
    .attr("x", (margin.left + width - margin.right) / 2)
    .attr("y", height - 6)
    .attr("text-anchor", "middle")
    .text("Type 2");

  // Add the y-axis label for Type 1.
  svg.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", 18)
    .attr("text-anchor", "middle")
    .text("Type 1");

  // Add an annotation explaining the heatmap color meaning.
  svg.append("text")
    .attr("class", "annotation")
    .attr("x", margin.left)
    .attr("y", margin.top - 10)
    .text("Darker cells mean more Pokemon have that type pair");

  const legendHeight = 80;
  const legendWidth = 10;
  const legendX = width - margin.right + 32;
  const legendY = margin.top + 20;

  const legendScale = d3.scaleLinear()
    .domain(color.domain())
    .range([legendHeight, 0]);

  // Add a defs element to store the heatmap color gradient.
  const defs = svg.append("defs");

  // Add a vertical linear gradient for the heatmap legend.
  const gradient = defs.append("linearGradient")
    .attr("id", "heatmap-gradient")
    .attr("x1", "0%")
    .attr("x2", "0%")
    .attr("y1", "100%")
    .attr("y2", "0%");

  // Add the low-count color stop to the gradient.
  gradient.append("stop")
    .attr("offset", "0%")
    .attr("stop-color", color(0));

  // Add the high-count color stop to the gradient.
  gradient.append("stop")
    .attr("offset", "100%")
    .attr("stop-color", color(d3.max(heatmapData, d => d.count) || 1));

  // Add the rectangle that displays the heatmap color gradient.
  svg.append("rect")
    .attr("x", legendX)
    .attr("y", legendY)
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .attr("fill", "url(#heatmap-gradient)");

  // Add the numeric legend axis for the heatmap color scale.
  svg.append("g")
    .attr("transform", `translate(${legendX + legendWidth}, ${legendY})`)
    .call(d3.axisRight(legendScale).ticks(4))
    .selectAll("text")
    .style("font-size", "9px");

  // Add the heatmap legend title.
  svg.append("text")
    .attr("class", "legend-title")
    .attr("x", legendX - 8)
    .attr("y", legendY - 8)
    .text("Count");
}

function drawParallelCoordinates(data) {
  const svg = d3.select("#parallel-chart");
  svg.selectAll("*").remove();

  const width = svg.node().clientWidth || 800;
  const height = svg.node().clientHeight || 420;

  const margin = {
    top: 46,
    right: 150,
    bottom: 28,
    left: 45
  };

  svg.attr("viewBox", `0 0 ${width} ${height}`);

  const stats = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];

  const statLabels = {
    HP: "HP",
    Attack: "Attack",
    Defense: "Defense",
    Sp_Atk: "Sp. Atk",
    Sp_Def: "Sp. Def",
    Speed: "Speed"
  };

  const x = d3.scalePoint()
    .domain(stats)
    .range([margin.left, width - margin.right])
    .padding(0.35);

  const y = {};

  stats.forEach(stat => {
    y[stat] = d3.scaleLinear()
      .domain(d3.extent(data, d => d[stat]))
      .nice()
      .range([height - margin.bottom, margin.top]);
  });

  const line = d3.line();

  function path(d) {
    return line(stats.map(stat => [x(stat), y[stat](d[stat])]));
  }

  // Add one polyline for each Pokemon stat profile.
  svg.append("g")
    .selectAll("path")
    .data(data)
    .join("path")
    .attr("d", path)
    .attr("fill", "none")
    .attr("stroke", d => typeColor(d.Type_1))
    .attr("stroke-width", d => {
      if (selectedType && matchesSelectedType(d)) {
        return 2.2;
      }
      return isDualType(d) ? 1.3 : 0.8;
    })
    .attr("stroke-dasharray", d => isDualType(d) ? "none" : "4 3")
    .attr("opacity", d => {
      if (!selectedType) {
        return isDualType(d) ? 0.32 : 0.16;
      }
      return matchesSelectedType(d) ? 0.85 : 0.025;
    })
    .on("mouseover", function(event, d) {
      d3.select(this)
        .attr("stroke-width", 3)
        .attr("opacity", 1)
        .raise();

      showTooltip(event, `
        <strong>${d.Name}</strong><br>
        Type 1: ${d.Type_1}<br>
        Type 2: ${d.Type_2}<br>
        ${isDualType(d) ? "Dual-type Pokemon" : "Single-type Pokemon"}<br>
        HP: ${d.HP}<br>
        Attack: ${d.Attack}<br>
        Defense: ${d.Defense}<br>
        Sp. Atk: ${d.Sp_Atk}<br>
        Sp. Def: ${d.Sp_Def}<br>
        Speed: ${d.Speed}<br>
        Total: ${d.Total}
      `);
    })
    .on("mousemove", moveTooltip)
    .on("mouseout", function(event, d) {
      d3.select(this)
        .attr("stroke-width", () => {
          if (selectedType && matchesSelectedType(d)) {
            return 2.2;
          }
          return isDualType(d) ? 1.3 : 0.8;
        })
        .attr("opacity", () => {
          if (!selectedType) {
            return isDualType(d) ? 0.32 : 0.16;
          }
          return matchesSelectedType(d) ? 0.85 : 0.025;
        });

      hideTooltip();
    });

  // Add one vertical axis group for each battle-stat dimension.
  const axisGroups = svg.append("g")
    .selectAll("g")
    .data(stats)
    .join("g")
    .attr("transform", d => `translate(${x(d)}, 0)`);

  // Draw each individual stat axis.
  axisGroups.each(function(stat) {
    d3.select(this).call(d3.axisLeft(y[stat]).ticks(5));
  });

  // Add the stat label above each vertical axis.
  axisGroups.append("text")
    .attr("class", "axis-label")
    .attr("y", margin.top - 16)
    .attr("text-anchor", "middle")
    .text(d => statLabels[d]);

  // Add an annotation explaining the line style encoding.
  svg.append("text")
    .attr("class", "annotation")
    .attr("x", margin.left)
    .attr("y", height - 6)
    .text("Solid lines = dual-type Pokemon; dashed lines = single-type Pokemon");

  drawTypeLegend(svg, typeColor.domain(), width - margin.right + 10, margin.top);

  const styleLegendY = Math.min(margin.top + 285, height - 70);

  // Add a line-style legend group.
  const styleLegend = svg.append("g")
    .attr("transform", `translate(${width - margin.right + 10}, ${styleLegendY})`);

  // Add the line-style legend title.
  styleLegend.append("text")
    .attr("class", "legend-title")
    .attr("x", 0)
    .attr("y", 0)
    .text("Line Style");

  // Add the solid-line legend mark for dual-type Pokemon.
  styleLegend.append("line")
    .attr("x1", 0)
    .attr("x2", 28)
    .attr("y1", 18)
    .attr("y2", 18)
    .attr("stroke", "#333")
    .attr("stroke-width", 2);

  // Add the solid-line legend text.
  styleLegend.append("text")
    .attr("class", "legend-text")
    .attr("x", 35)
    .attr("y", 22)
    .text("Dual type");

  // Add the dashed-line legend mark for single-type Pokemon.
  styleLegend.append("line")
    .attr("x1", 0)
    .attr("x2", 28)
    .attr("y1", 38)
    .attr("y2", 38)
    .attr("stroke", "#333")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "4 3");

  // Add the dashed-line legend text.
  styleLegend.append("text")
    .attr("class", "legend-text")
    .attr("x", 35)
    .attr("y", 42)
    .text("Single type");
}

function drawTypeLegend(svg, types, startX, startY) {
  const visibleTypes = types.slice(0, 18);

  // Add the main type-color legend group.
  const legend = svg.append("g")
    .attr("transform", `translate(${startX}, ${startY})`);

  // Add the type-color legend title.
  legend.append("text")
    .attr("class", "legend-title")
    .attr("x", 0)
    .attr("y", -8)
    .text("Type 1");

  // Add one legend item group for each Pokemon type.
  const legendItems = legend.selectAll(".legend-item")
    .data(visibleTypes)
    .join("g")
    .attr("class", "legend-item")
    .attr("transform", (d, i) => `translate(0, ${i * 14})`);

  // Add the colored square for each legend item.
  legendItems.append("rect")
    .attr("width", 8)
    .attr("height", 8)
    .attr("fill", d => typeColor(d))
    .attr("opacity", d => !selectedType || selectedType === d ? 1 : 0.25);

  // Add the text label for each legend item.
  legendItems.append("text")
    .attr("class", "legend-text")
    .attr("x", 12)
    .attr("y", 7)
    .attr("opacity", d => !selectedType || selectedType === d ? 1 : 0.35)
    .text(d => d);
}

function showTooltip(event, html) {
  d3.select("#tooltip")
    .style("opacity", 1)
    .html(html);

  moveTooltip(event);
}

function moveTooltip(event) {
  d3.select("#tooltip")
    .style("left", `${event.pageX + 12}px`)
    .style("top", `${event.pageY + 12}px`);
}

function hideTooltip() {
  d3.select("#tooltip")
    .style("opacity", 0);
}