/*
ECS 163 Homework 2 - Pokemon Type Dashboard
Explores Pokemon primary types through type distribution, average battle stat profiles,
and Legendary typing patterns.
*/

// Pokemon type colors used consistently across all dashboard views.
const typeColors = {
  Water: "#6390F0",
  Normal: "#A8A77A",
  Grass: "#7AC74C",
  Bug: "#A6B91A",
  Fire: "#EE8130",
  Psychic: "#F95587",
  Rock: "#B6A136",
  Electric: "#FFD700",
  Ground: "#E2BF65",
  Poison: "#A33EA1",
  Dark: "#705746",
  Fighting: "#C22E28",
  Dragon: "#6F35FC",
  Ghost: "#735797",
  Ice: "#96D9D6",
  Steel: "#B7B7CE",
  Fairy: "#D685AD",
  Flying: "#8497F0",
  None: "#CCCCCC"
};

// Shared tooltip used by all visualizations.
const tooltip = d3.select("#tooltip");

// Load and normalize the Pokemon data before drawing the dashboard views.
d3.csv("data/pokemon.csv").then(function(data) {
  data.forEach(d => {
    d.Total = +d.Total;
    d.HP = +d.HP;
    d.Attack = +d.Attack;
    d.Defense = +d.Defense;
    d.Sp_Atk = +d.Sp_Atk;
    d.Sp_Def = +d.Sp_Def;
    d.Speed = +d.Speed;
    d.isLegendary = d.isLegendary === "true" || d.isLegendary === "True" || d.isLegendary === "1";
    d.Type_2 = d.Type_2 && d.Type_2.trim() !== "" ? d.Type_2 : "None";
  });

  drawPrimaryTypeBarChart(data);
  drawTypeStatHeatmap(data);
  drawLegendarySankey(data);
});

// View 1: Context view showing how many Pokemon belong to each primary type.
function drawPrimaryTypeBarChart(data) {
  const container = d3.select("#chart1");
  container.selectAll("*").remove();

  const margin = { top: 45, right: 20, bottom: 90, left: 55 };
  const width = 520 - margin.left - margin.right;
  const height = 330 - margin.top - margin.bottom;

  const typeCounts = d3.rollups(data, v => v.length, d => d.Type_1)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => d3.descending(a.count, b.count));

  // SVG canvas for the primary-type bar chart.
  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`);

  // Plot group translated inside the chart margins.
  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand()
    .domain(typeCounts.map(d => d.type))
    .range([0, width])
    .padding(0.22);

  const y = d3.scaleLinear()
    .domain([0, d3.max(typeCounts, d => d.count)])
    .nice()
    .range([height, 0]);

  // Chart title identifying the overview view.
  svg.append("text")
    .attr("x", margin.left)
    .attr("y", 24)
    .attr("font-size", "18px")
    .attr("font-weight", "bold")
    .text("Most Common Primary Types in Pokemon");

  // Legend container for the bar color encoding.
  const legend = svg.append("g")
    .attr("transform", `translate(${margin.left + width - 170}, 52)`);

  // Legend background box for readability over the page image.
  legend.append("rect")
    .attr("width", 165)
    .attr("height", 42)
    .attr("rx", 6)
    .attr("fill", "rgba(255,255,255,0.86)")
    .attr("stroke", "#ccc");

  // Legend title.
  legend.append("text")
    .attr("x", 8)
    .attr("y", 16)
    .attr("font-size", "11px")
    .attr("font-weight", "bold")
    .text("Legend");

  // Legend color swatch showing that bar color encodes primary type.
  legend.append("rect")
    .attr("x", 8)
    .attr("y", 24)
    .attr("width", 12)
    .attr("height", 12)
    .attr("fill", "#6390F0")
    .attr("stroke", "#333")
    .attr("stroke-width", 0.5);

  // Legend text describing the bar color encoding.
  legend.append("text")
    .attr("x", 26)
    .attr("y", 34)
    .attr("font-size", "11px")
    .text("Color = primary type");

  // Bars showing the number of Pokemon in each primary type.
  g.selectAll("rect")
    .data(typeCounts)
    .enter()
    .append("rect")
    .attr("x", d => x(d.type))
    .attr("y", d => y(d.count))
    .attr("width", x.bandwidth())
    .attr("height", d => height - y(d.count))
    .attr("fill", d => typeColors[d.type])
    .attr("stroke", "#333")
    .attr("stroke-width", 0.5)
    .on("mousemove", function(event, d) {
      tooltip
        .style("opacity", 1)
        .style("left", event.pageX + 12 + "px")
        .style("top", event.pageY - 28 + "px")
        .html(`<strong>${d.type}</strong><br>${d.count} Pokemon`);
    })
    .on("mouseleave", function() {
      tooltip.style("opacity", 0);
    });

  // X-axis showing primary type names.
  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end")
    .attr("font-size", "12px");

  // Y-axis showing Pokemon counts.
  g.append("g")
    .call(d3.axisLeft(y).ticks(5));

  // Y-axis label for the count measure.
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -margin.top - height / 2)
    .attr("y", 16)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .text("Number of Pokemon");

  // X-axis label for primary type categories.
  svg.append("text")
    .attr("x", margin.left + width / 2)
    .attr("y", margin.top + height + 64)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .text("Primary Type");
}

// View 2: Focus view comparing average battle stats for each primary type.
function drawTypeStatHeatmap(data) {
  const container = d3.select("#chart2");
  container.selectAll("*").remove();

  const margin = { top: 76, right: 78, bottom: 60, left: 108 };
  const width = 680 - margin.left - margin.right;
  const height = 690 - margin.top - margin.bottom;
  const stats = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];
  const statLabels = {
    HP: "HP",
    Attack: "Attack",
    Defense: "Defense",
    Sp_Atk: "Sp. Atk",
    Sp_Def: "Sp. Def",
    Speed: "Speed"
  };

  const typeStats = d3.rollups(
    data,
    values => {
      const summary = { type: values[0].Type_1, count: values.length };
      stats.forEach(stat => {
        summary[stat] = d3.mean(values, d => d[stat]);
      });
      return summary;
    },
    d => d.Type_1
  )
    .map(d => d[1])
    .sort((a, b) => d3.descending(d3.mean(stats, stat => a[stat]), d3.mean(stats, stat => b[stat])));

  const heatmapCells = typeStats.flatMap(typeRow => stats.map(stat => ({
    type: typeRow.type,
    stat,
    value: typeRow[stat],
    count: typeRow.count
  })));

  // SVG canvas for the type-by-stat heatmap.
  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`);

  // Plot group translated inside the heatmap margins.
  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand()
    .domain(stats)
    .range([0, width])
    .padding(0.05);

  const y = d3.scaleBand()
    .domain(typeStats.map(d => d.type))
    .range([0, height])
    .padding(0.05);

  const color = d3.scaleSequential()
    .domain(d3.extent(heatmapCells, d => d.value))
    .interpolator(d3.interpolateYlGnBu);

  // Chart title identifying the heatmap focus view.
  svg.append("text")
    .attr("x", margin.left)
    .attr("y", 28)
    .attr("font-size", "20px")
    .attr("font-weight", "bold")
    .text("Average Battle Stats by Primary Type");

  // Subtitle explaining the heatmap color encoding.
  svg.append("text")
    .attr("x", margin.left)
    .attr("y", 49)
    .attr("font-size", "14px")
    .attr("fill", "#555")
    .text("Darker cells indicate higher average stat values for that primary type.");

  // Heatmap cells showing average stat value for each primary-type/stat pair.
  g.selectAll("rect")
    .data(heatmapCells)
    .enter()
    .append("rect")
    .attr("x", d => x(d.stat))
    .attr("y", d => y(d.type))
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("fill", d => color(d.value))
    .attr("stroke", "rgba(255,255,255,0.8)")
    .attr("stroke-width", 1)
    .on("mousemove", function(event, d) {
      tooltip
        .style("opacity", 1)
        .style("left", event.pageX + 12 + "px")
        .style("top", event.pageY - 28 + "px")
        .html(
          `<strong>${d.type}</strong><br>
          ${statLabels[d.stat]} average: ${d.value.toFixed(1)}<br>
          Pokemon count: ${d.count}`
        );
    })
    .on("mouseleave", function() {
      tooltip.style("opacity", 0);
    });

  // X-axis showing battle stat names.
  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d => statLabels[d]))
    .selectAll("text")
    .attr("font-size", "12px")
    .attr("transform", "rotate(-22)")
    .style("text-anchor", "end");

  // Y-axis showing primary types.
  g.append("g")
    .call(d3.axisLeft(y))
    .selectAll("text")
    .attr("font-size", "11px");

  // X-axis label for battle stat columns.
  svg.append("text")
    .attr("x", margin.left + width / 2)
    .attr("y", margin.top + height + 50)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .text("Battle Stat");

  // Y-axis label for primary type rows.
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -margin.top - height / 2)
    .attr("y", 24)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .text("Primary Type");

  const legendWidth = 14;
  const legendHeight = 180;
  const legendX = margin.left + width + 28;
  const legendY = margin.top + 38;
  const legendScale = d3.scaleLinear()
    .domain(color.domain())
    .range([legendHeight, 0]);

  // SVG defs holding the heatmap legend gradient.
  const defs = svg.append("defs");

  // Linear gradient used by the average-stat legend.
  const gradient = defs.append("linearGradient")
    .attr("id", "stat-heatmap-gradient")
    .attr("x1", "0%")
    .attr("x2", "0%")
    .attr("y1", "100%")
    .attr("y2", "0%");

  d3.range(0, 1.01, 0.1).forEach(t => {
    const value = color.domain()[0] + t * (color.domain()[1] - color.domain()[0]);

    // Gradient stop matching the heatmap color scale.
    gradient.append("stop")
      .attr("offset", `${t * 100}%`)
      .attr("stop-color", color(value));
  });

  // Legend group for average stat color values.
  const legend = svg.append("g")
    .attr("transform", `translate(${legendX},${legendY})`);

  // Legend title.
  legend.append("text")
    .attr("x", 0)
    .attr("y", -24)
    .attr("font-size", "11px")
    .attr("font-weight", "bold")
    .text("Legend");

  // Legend subtitle kept beside the gradient instead of floating below the chart.
  legend.append("text")
    .attr("x", 0)
    .attr("y", -10)
    .attr("font-size", "10px")
    .text("Avg. stat");

  // Color ramp showing low-to-high average stat values.
  legend.append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .attr("fill", "url(#stat-heatmap-gradient)")
    .attr("stroke", "#999");

  // Numeric legend axis for average stat values.
  legend.append("g")
    .attr("transform", `translate(${legendWidth},0)`)
    .call(d3.axisRight(legendScale).ticks(5));
}

// View 3: Advanced view showing Legendary Pokemon flow from primary type to secondary type.
function drawLegendarySankey(data) {
  const container = d3.select("#chart3");
  container.selectAll("*").remove();

  const margin = { top: 48, right: 18, bottom: 18, left: 18 };
  const width = 520 - margin.left - margin.right;
  const height = 390 - margin.top - margin.bottom;
  const legendaryData = data.filter(d => d.isLegendary);

  const links = [];
  d3.rollups(legendaryData, v => v.length, d => `Primary: ${d.Type_1}`, d => `Secondary: ${d.Type_2}`)
    .forEach(([source, targets]) => {
      targets.forEach(([target, value]) => links.push({ source, target, value }));
    });

  d3.rollups(legendaryData, v => v.length, d => `Secondary: ${d.Type_2}`, d => "Legendary")
    .forEach(([source, targets]) => {
      targets.forEach(([target, value]) => links.push({ source, target, value }));
    });

  const nodeNames = Array.from(new Set(links.flatMap(d => [d.source, d.target])));
  const nodes = nodeNames.map(name => ({ name }));
  const nodeIndex = new Map(nodes.map((d, i) => [d.name, i]));
  const sankeyLinks = links.map(d => ({
    source: nodeIndex.get(d.source),
    target: nodeIndex.get(d.target),
    value: d.value
  }));

  // SVG canvas for the Legendary typing Sankey diagram.
  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`);

  // SVG defs holding the Legendary gold gradient.
  const defs = svg.append("defs");

  // Linear gradient used by the Legendary node and legend swatch.
  const legendaryGradient = defs.append("linearGradient")
    .attr("id", "legendary-gradient")
    .attr("x1", "0%")
    .attr("x2", "100%")
    .attr("y1", "0%")
    .attr("y2", "100%");

  [
    { offset: "0%", color: "#FFF7B2" },
    { offset: "35%", color: "#FFD700" },
    { offset: "70%", color: "#FFF2A6" },
    { offset: "100%", color: "#E6BE3A" }
  ].forEach(stop => {
    // Gradient stop creating the shiny Legendary color ramp.
    legendaryGradient.append("stop")
      .attr("offset", stop.offset)
      .attr("stop-color", stop.color);
  });

  // Plot group translated inside the Sankey margins.
  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Chart title identifying the advanced view.
  svg.append("text")
    .attr("x", margin.left)
    .attr("y", 24)
    .attr("font-size", "18px")
    .attr("font-weight", "bold")
    .text("Legendary Pokemon Typing Flow");

  // Subtitle explaining the Sankey path direction.
  svg.append("text")
    .attr("x", margin.left)
    .attr("y", 42)
    .attr("font-size", "13px")
    .attr("fill", "#555")
    .text("Flow shows Primary Type to Secondary Type to Legendary status.");

  const sankey = d3.sankey()
    .nodeWidth(12)
    .nodePadding(7)
    .extent([[0, 0], [width, height]]);

  const graph = sankey({
    nodes: nodes.map(d => Object.assign({}, d)),
    links: sankeyLinks.map(d => Object.assign({}, d))
  });

  function nodeColor(name) {
    if (name === "Legendary") {
      return "url(#legendary-gradient)";
    }

    const cleanName = name.replace("Primary: ", "").replace("Secondary: ", "");
    return typeColors[cleanName] || "#BBBBBB";
  }

  // Sankey links whose thickness encodes the number of Legendary Pokemon in each flow.
  g.append("g")
    .selectAll("path")
    .data(graph.links)
    .enter()
    .append("path")
    .attr("d", d3.sankeyLinkHorizontal())
    .attr("stroke", d => nodeColor(d.source.name))
    .attr("stroke-width", d => Math.max(1, d.width))
    .attr("fill", "none")
    .attr("opacity", 0.34)
    .on("mousemove", function(event, d) {
      tooltip
        .style("opacity", 1)
        .style("left", event.pageX + 12 + "px")
        .style("top", event.pageY - 28 + "px")
        .html(
          `<strong>${d.source.name}</strong> to <strong>${d.target.name}</strong><br>
          ${d.value} Legendary Pokemon`
        );
    })
    .on("mouseleave", function() {
      tooltip.style("opacity", 0);
    });

  // Node groups for primary types, secondary types, and the final Legendary status.
  const node = g.append("g")
    .selectAll("g")
    .data(graph.nodes)
    .enter()
    .append("g");

  // Node rectangles colored by type or Legendary status.
  node.append("rect")
    .attr("x", d => d.x0)
    .attr("y", d => d.y0)
    .attr("height", d => d.y1 - d.y0)
    .attr("width", d => d.x1 - d.x0)
    .attr("fill", d => nodeColor(d.name))
    .attr("stroke", "#333")
    .attr("stroke-width", 0.5)
    .on("mousemove", function(event, d) {
      tooltip
        .style("opacity", 1)
        .style("left", event.pageX + 12 + "px")
        .style("top", event.pageY - 28 + "px")
        .html(`<strong>${d.name}</strong><br>Value: ${d.value}`);
    })
    .on("mouseleave", function() {
      tooltip.style("opacity", 0);
    });

  // Node labels placed beside type nodes and above the final Legendary node.
  node.append("text")
    .attr("x", function(d) {
      if (d.name === "Legendary") {
        return (d.x0 + d.x1) / 2;
      }
      return d.x0 < width / 2 ? d.x1 + 5 : d.x0 - 5;
    })
    .attr("y", function(d) {
      if (d.name === "Legendary") {
        return d.y0 - 7;
      }
      return (d.y0 + d.y1) / 2;
    })
    .attr("dy", "0.35em")
    .attr("text-anchor", function(d) {
      if (d.name === "Legendary") {
        return "middle";
      }
      return d.x0 < width / 2 ? "start" : "end";
    })
    .attr("font-size", "10px")
    .text(d => d.name.replace("Primary: ", "").replace("Secondary: ", ""));

  // Compact Sankey legend group kept in the lower-right corner.
  const legend = svg.append("g")
    .attr("transform", `translate(${margin.left + width - 102}, ${margin.top + height - 42})`);

  // Legend background box for readability over links.
  legend.append("rect")
    .attr("width", 114)
    .attr("height", 46)
    .attr("rx", 6)
    .attr("fill", "rgba(255,255,255,0.86)")
    .attr("stroke", "#ccc");

  // Legend title.
  legend.append("text")
    .attr("x", 7)
    .attr("y", 12)
    .attr("font-size", "10px")
    .attr("font-weight", "bold")
    .text("Legend");

  // Legend swatch for Pokemon type colors.
  legend.append("rect")
    .attr("x", 7)
    .attr("y", 17)
    .attr("width", 10)
    .attr("height", 10)
    .attr("fill", "#6390F0")
    .attr("stroke", "#333")
    .attr("stroke-width", 0.5);

  // Legend label for type colors.
  legend.append("text")
    .attr("x", 23)
    .attr("y", 26)
    .attr("font-size", "10px")
    .text("Type color");

  // Legend swatch for Legendary status.
  legend.append("rect")
    .attr("x", 7)
    .attr("y", 31)
    .attr("width", 10)
    .attr("height", 10)
    .attr("fill", "url(#legendary-gradient)")
    .attr("stroke", "#333")
    .attr("stroke-width", 0.5);

  // Legend label for Legendary status.
  legend.append("text")
    .attr("x", 23)
    .attr("y", 40)
    .attr("font-size", "10px")
    .text("Legendary");
}
