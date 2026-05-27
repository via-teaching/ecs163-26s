const typeOrder = [
  "Bug", "Dark", "Dragon", "Electric", "Fairy", "Fighting",
  "Fire", "Flying", "Ghost", "Grass", "Ground", "Ice",
  "Normal", "Poison", "Psychic", "Rock", "Steel", "Water"
];

const typeColors = {
  Bug: "#7aa63c",
  Dark: "#6d5a4e",
  Dragon: "#8267c7",
  Electric: "#d8a900",
  Fairy: "#d884b8",
  Fighting: "#c45b4d",
  Fire: "#e15b32",
  Flying: "#86a6d9",
  Ghost: "#75619b",
  Grass: "#56a255",
  Ground: "#b88857",
  Ice: "#76b7b2",
  Normal: "#b8ada7",
  Poison: "#a86bb5",
  Psychic: "#d36b9d",
  Rock: "#9c8d59",
  Steel: "#69989d",
  Water: "#4f83b9"
};

const statKeys = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];
const chartIds = ["#bar-chart", "#chord-chart", "#line-chart"];
const tooltip = d3.select("body").append("div").attr("class", "tooltip");

function numberValue(value) {
  return value === "" || value == null ? null : Number(value);
}

function showTooltip(html) {
  tooltip.html(html).style("opacity", 1);
}

function moveTooltip() {
  tooltip
    .style("left", `${d3.event.clientX + 14}px`)
    .style("top", `${d3.event.clientY + 14}px`);
}

function hideTooltip() {
  tooltip.style("opacity", 0);
}

function clearCharts() {
  chartIds.forEach(id => d3.select(id).selectAll("*").remove());
}

function getChartBox(selector) {
  const node = d3.select(selector).node();
  const bounds = node.getBoundingClientRect();
  return {
    width: Math.max(360, bounds.width),
    height: Math.max(280, bounds.height)
  };
}

function parsePokemon(row) {
  const pokemon = {
    number: numberValue(row.Number),
    name: row.Name,
    type1: row.Type_1,
    type2: row.Type_2 || "Single Type",
    generation: numberValue(row.Generation),
    isLegendary: row.isLegendary === "True",
    total: numberValue(row.Total),
    height: numberValue(row.Height_m),
    weight: numberValue(row.Weight_kg)
  };

  statKeys.forEach(key => {
    pokemon[key] = numberValue(row[key]);
  });

  return pokemon;
}

function countByType(data) {
  return typeOrder
    .map(type => ({
      type,
      count: data.filter(d => d.type1 === type).length
    }))
    .filter(d => d.count > 0)
    .sort((a, b) => d3.descending(a.count, b.count));
}

function drawBarChart(data) {
  const box = getChartBox("#bar-chart");
  const margin = { top: 26, right: 24, bottom: 70, left: 58 };
  const width = box.width - margin.left - margin.right;
  const height = box.height - margin.top - margin.bottom;
  const counts = countByType(data);

  const svg = d3.select("#bar-chart")
    .attr("viewBox", `0 0 ${box.width} ${box.height}`);

  // This group is for the bar chart area.
  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand()
    .domain(counts.map(d => d.type))
    .range([0, width])
    .padding(0.24);

  const y = d3.scaleLinear()
    .domain([0, d3.max(counts, d => d.count)]).nice()
    .range([height, 0]);

  // I add grid lines to make the count easier to compare.
  g.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).tickSize(-width).tickFormat(""));

  // This is the x axis for Pokemon primary types.
  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-35)")
    .attr("text-anchor", "end")
    .attr("dx", "-0.6em")
    .attr("dy", "0.25em");

  // This is the y axis for the number of Pokemon.
  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(5));

  // These bars show the overview of Type_1.
  g.selectAll(".type-bar")
    .data(counts)
    .enter()
    .append("rect")
    .attr("class", "type-bar")
    .attr("x", d => x(d.type))
    .attr("y", d => y(d.count))
    .attr("width", x.bandwidth())
    .attr("height", d => height - y(d.count))
    .attr("fill", d => typeColors[d.type])
    .on("mouseover", d => showTooltip(`<strong>${d.type}</strong><br>${d.count} Pokemon`))
    .on("mousemove", moveTooltip)
    .on("mouseout", hideTooltip);

  // This text is the x axis title.
  g.append("text")
    .attr("class", "chart-label")
    .attr("x", width / 2)
    .attr("y", height + 58)
    .attr("text-anchor", "middle")
    .text("Primary Type");

  // This text is the y axis title.
  g.append("text")
    .attr("class", "chart-label")
    .attr("x", -height / 2)
    .attr("y", -42)
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("Number of Pokemon");

  // This note explains what the bar color means.
  svg.append("text")
    .attr("class", "caption")
    .attr("x", box.width - 18)
    .attr("y", 16)
    .attr("text-anchor", "end")
    .text("Bar color represents Type_1");
}

function buildChordMatrix(data) {
  const matrix = typeOrder.map(() => typeOrder.map(() => 0));

  data.forEach(d => {
    const source = typeOrder.indexOf(d.type1);
    const target = typeOrder.indexOf(d.type2);

    if (source < 0) return;

    if (target < 0 || d.type2 === "Single Type") {
      matrix[source][source] += 1;
    } else {
      matrix[source][target] += 1;
      matrix[target][source] += 1;
    }
  });

  return matrix;
}

function drawChordChart(data) {
  const box = getChartBox("#chord-chart");
  const side = Math.min(box.width, box.height);
  const outerRadius = Math.max(84, side * 0.33);
  const innerRadius = outerRadius - 16;
  const matrix = buildChordMatrix(data);

  const svg = d3.select("#chord-chart")
    .attr("viewBox", `0 0 ${box.width} ${box.height}`);

  // This group is for the chord diagram in the center.
  const g = svg.append("g")
    .attr("transform", `translate(${box.width / 2},${box.height / 2 + 20})`);

  const chordLayout = d3.chord()
    .padAngle(0.035)
    .sortSubgroups(d3.descending)
    .sortChords(d3.descending);

  const arc = d3.arc()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius);

  const ribbon = d3.ribbon()
    .radius(innerRadius);

  const chords = chordLayout(matrix);

  // These arcs show the Pokemon types around the circle.
  g.append("g")
    .selectAll("path")
    .data(chords.groups)
    .enter()
    .append("path")
    .attr("d", arc)
    .attr("fill", d => typeColors[typeOrder[d.index]])
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 1.2)
    .on("mouseover", d => {
      showTooltip(`<strong>${typeOrder[d.index]}</strong><br>${Math.round(d.value)} total type connections`);
    })
    .on("mousemove", moveTooltip)
    .on("mouseout", hideTooltip);

  // These ribbons show the relationship between Type_1 and Type_2.
  g.append("g")
    .attr("fill-opacity", 0.68)
    .selectAll("path")
    .data(chords)
    .enter()
    .append("path")
    .attr("d", ribbon)
    .attr("fill", d => typeColors[typeOrder[d.source.index]])
    .attr("stroke", d => d3.rgb(typeColors[typeOrder[d.source.index]]).darker(0.45))
    .attr("stroke-width", 0.5)
    .on("mouseover", d => {
      const source = typeOrder[d.source.index];
      const target = typeOrder[d.target.index];
      const label = source === target ? `${source} only` : `${source} + ${target}`;
      showTooltip(`<strong>${label}</strong><br>${Math.round(d.source.value)} Pokemon connections`);
    })
    .on("mousemove", moveTooltip)
    .on("mouseout", hideTooltip);

  // These labels show the type names on the outside.
  g.append("g")
    .selectAll("text")
    .data(chords.groups)
    .enter()
    .append("text")
    .each(d => { d.angle = (d.startAngle + d.endAngle) / 2; })
    .attr("dy", "0.35em")
    .attr("transform", d => `
      rotate(${(d.angle * 180 / Math.PI) - 90})
      translate(${outerRadius + 12})
      ${d.angle > Math.PI ? "rotate(180)" : ""}
    `)
    .attr("text-anchor", d => d.angle > Math.PI ? "end" : "start")
    .attr("font-size", "11px")
    .attr("fill", "#17212f")
    .text(d => typeOrder[d.index]);

  // This note explains how to read the chord diagram.
  svg.append("text")
    .attr("class", "caption")
    .attr("x", box.width / 2)
    .attr("y", 24)
    .attr("text-anchor", "middle")
    .text("Ribbon width shows frequency of Type_1 and Type_2 pairings; same-type ribbons represent single-type Pokemon.");
}

function meanStatByGeneration(data) {
  const generations = d3.nest()
    .key(d => d.generation)
    .entries(data)
    .map(group => {
      const row = { generation: Number(group.key) };
      statKeys.forEach(key => {
        row[key] = d3.mean(group.values, d => d[key]);
      });
      return row;
    })
    .sort((a, b) => d3.ascending(a.generation, b.generation));

  return generations;
}

function drawLineChart(data) {
  const box = getChartBox("#line-chart");
  const margin = { top: 28, right: 168, bottom: 54, left: 58 };
  const width = box.width - margin.left - margin.right;
  const height = box.height - margin.top - margin.bottom;
  const generationStats = meanStatByGeneration(data);

  const svg = d3.select("#line-chart")
    .attr("viewBox", `0 0 ${box.width} ${box.height}`);

  // This group is for the line chart.
  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scalePoint()
    .domain(generationStats.map(d => d.generation))
    .range([0, width])
    .padding(0.5);

  const y = d3.scaleLinear()
    .domain([0, d3.max(generationStats, row => d3.max(statKeys, key => row[key]))]).nice()
    .range([height, 0]);

  const statColor = d3.scaleOrdinal()
    .domain(statKeys)
    .range(["#4f83b9", "#e15b32", "#56a255", "#a86bb5", "#d8a900", "#76b7b2"]);

  const line = d3.line()
    .x(d => x(d.generation))
    .y(d => y(d.value))
    .curve(d3.curveMonotoneX);

  // I add grid lines to compare the average stats.
  g.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).tickSize(-width).tickFormat(""));

  // This is the x axis for generation.
  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  // This is the y axis for average base stat.
  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(5));

  const series = statKeys.map(key => ({
    key,
    values: generationStats.map(row => ({
      generation: row.generation,
      value: row[key]
    }))
  }));

  // These lines show how each battle stat changes by generation.
  g.selectAll(".stat-line")
    .data(series)
    .enter()
    .append("path")
    .attr("class", "stat-line")
    .attr("fill", "none")
    .attr("stroke", d => statColor(d.key))
    .attr("stroke-width", 2.5)
    .attr("d", d => line(d.values));

  // These points show the average value for each generation.
  g.selectAll(".stat-dot-group")
    .data(series)
    .enter()
    .append("g")
    .attr("class", "stat-dot-group")
    .attr("fill", d => statColor(d.key))
    .selectAll("circle")
    .data(d => d.values.map(value => ({ ...value, key: d.key })))
    .enter()
    .append("circle")
    .attr("cx", d => x(d.generation))
    .attr("cy", d => y(d.value))
    .attr("r", 3.6)
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 1)
    .on("mouseover", d => {
      const label = d.key.replace("_", " ");
      showTooltip(`<strong>${label}</strong><br>Generation ${d.generation}: ${d.value.toFixed(1)} average`);
    })
    .on("mousemove", moveTooltip)
    .on("mouseout", hideTooltip);

  // This text is the x axis title.
  g.append("text")
    .attr("class", "chart-label")
    .attr("x", width / 2)
    .attr("y", height + 42)
    .attr("text-anchor", "middle")
    .text("Generation");

  // This text is the y axis title.
  g.append("text")
    .attr("class", "chart-label")
    .attr("x", -height / 2)
    .attr("y", -42)
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("Average Base Stat");

  // This legend shows which color means which battle stat.
  const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${box.width - margin.right + 28},${margin.top + 4})`);

  legend.append("text")
    .attr("class", "legend-title")
    .attr("x", 0)
    .attr("y", 0)
    .text("Battle Stat");

  const legendItem = legend.selectAll(".legend-item")
    .data(statKeys)
    .enter()
    .append("g")
    .attr("class", "legend-item")
    .attr("transform", (d, i) => `translate(0,${20 + i * 22})`);

  // These small lines use the same color as the chart lines.
  legendItem.append("line")
    .attr("x1", 0)
    .attr("x2", 24)
    .attr("y1", 0)
    .attr("y2", 0)
    .attr("stroke", d => statColor(d))
    .attr("stroke-width", 3);

  // This text shows the names in the legend.
  legendItem.append("text")
    .attr("x", 32)
    .attr("y", 4)
    .text(d => d.replace("_", " "));
}

function drawDashboard(data) {
  clearCharts();
  document.getElementById("pokemon-count").textContent = data.length;
  drawBarChart(data);
  drawChordChart(data);
  drawLineChart(data);
}

d3.csv("data/pokemon_alopez247.csv").then(rawData => {
  const pokemon = rawData.map(parsePokemon)
    .filter(d => d.name && d.type1 && d.generation != null);

  drawDashboard(pokemon);

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => drawDashboard(pokemon), 150);
  });
}).catch(error => {
  console.error(error);
});
