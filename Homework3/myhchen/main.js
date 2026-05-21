/*
dashboard theme:
explore pokemon types by distribution, strength, and legendary status

dashboard flow:
start with the heatmap to understand the overall type distribution
move to the bar chart to compare type strength
finish with the sankey to see how generation, type, and legendary status connect

heatmap:
shows type counts across generations

bar chart:
compares average total stats by type

sankey:
shows generation, type, and legendary count flow

focus + context:
heatmap is the overview, bar chart is support, sankey is the focus

design rationale:
the heatmap uses position and color to show overall distribution patterns
the bar chart uses length for accurate comparison of average type strength
the sankey diagram uses flow width to show category composition and relationships

the three charts use different visualization methods and explore different aspects of the dataset
the dashboard moves from overview to comparison to detailed categorical flow
*/

const DATA_PATH = "data/pokemon_alopez247.csv";

// reusable fields
const BATTLE_STATS = ["hp", "attack", "defense", "spAtk", "spDef", "speed"];
const SANKEY_TOP_TYPE_COUNT = 10;
const SANKEY_OTHER_TYPE_LABEL = "Other Types";

// track selected type
let selectedType = null;
let sankeyVisibleTypeSet = new Set();

// transition timing
const SELECTION_TRANSITION_DURATION = 600;

// selection links the overview, comparison, and advanced focus views
// filtering transition helps users drill down into one type

// related type check
function isSelectedType(type) {
  return selectedType === null || type === selectedType;
}

// transition selection
function selectionTransition(selection) {
  return selection.transition().duration(SELECTION_TRANSITION_DURATION).ease(d3.easeCubicInOut);
}

// map hidden types to other types
function getSankeySelectedType(type) {
  if (type === null) return null;
  return sankeyVisibleTypeSet.has(type) ? type : SANKEY_OTHER_TYPE_LABEL;
}

// update selection label
function updateSelectionControl() {
  const button = d3.select("#clear-selection");
  if (button.empty()) return;

  button.classed("active", selectedType !== null).text(selectedType ? `Clear: ${selectedType}` : "Clear selection");
}

// update heatmap selection
function updateHeatmapSelection() {
  const cells = d3.selectAll(".heatmap-cell");

  // fade unrelated cells
  selectionTransition(cells)
    .attr("opacity", (d) => (isSelectedType(d.type) ? 1 : 0.18))
    .attr("stroke", (d) => (selectedType !== null && d.type === selectedType ? "#263238" : "#f8fbfd"))
    .attr("stroke-width", (d) => (selectedType !== null && d.type === selectedType ? 1.9 : 0.7));

  // fade unrelated row labels
  selectionTransition(d3.selectAll(".heatmap-type-label"))
    .attr("opacity", (d) => (isSelectedType(d) ? 1 : 0.28))
    .attr("font-weight", (d) => (selectedType !== null && d === selectedType ? 800 : 600));
}

// update bar selection
function updateBarSelection() {
  const bars = d3.selectAll(".strength-bar");

  // fade unrelated bars
  selectionTransition(bars)
    .attr("opacity", (d) => (isSelectedType(d.type) ? 1 : 0.18))
    .attr("stroke", (d) => (selectedType !== null && d.type === selectedType ? "#263238" : "#ffffff"))
    .attr("stroke-width", (d) => (selectedType !== null && d.type === selectedType ? 1.9 : 0.7));
}

// sankey link check
function isSankeyLinkRelated(d) {
  const sankeyType = getSankeySelectedType(selectedType);
  return sankeyType === null || d.source.label === sankeyType || d.target.label === sankeyType;
}

// sankey node check
function isSankeyNodeRelated(d) {
  const sankeyType = getSankeySelectedType(selectedType);
  if (sankeyType === null) return true;
  if (d.stage === "type") return d.label === sankeyType;

  return (
    d.sourceLinks.some((link) => link.target.label === sankeyType) ||
    d.targetLinks.some((link) => link.source.label === sankeyType)
  );
}

// sankey node opacity
function sankeyNodeOpacity(d, sankeyType) {
  if (sankeyType === null) return 1;
  if (d.stage === "type" && d.label === sankeyType) return 1;
  return isSankeyNodeRelated(d) ? 1 : 0.16;
}

// selected link color
function sankeySelectedLinkColor(d) {
  if (d.target.stage === "type") return "#b8792f";
  if (d.target.label === "Legendary") return "#8f1422";
  return "#536878";
}

// update sankey selection
function updateSankeySelection() {
  const links = d3.selectAll(".sankey-link");
  const nodes = d3.selectAll(".sankey-node-group");
  const nodeRects = d3.selectAll(".sankey-node");
  const nodeLabels = d3.selectAll(".sankey-node-label");
  const sankeyType = getSankeySelectedType(selectedType);

  // check selected sankey type
  const relatedLinks = links.filter((d) => isSankeyLinkRelated(d));
  relatedLinks.raise();

  // strengthen related links
  selectionTransition(links)
    .attr("stroke", (d) => {
      if (sankeyType === null) return sankeyLinkColor(d);
      return isSankeyLinkRelated(d) ? sankeySelectedLinkColor(d) : "#ddd7cf";
    })
    .attr("stroke-opacity", (d) => {
      if (sankeyType === null) return 0.42;
      return isSankeyLinkRelated(d) ? 0.98 : 0.04;
    })
    .attr("stroke-width", (d) => {
      if (sankeyType === null) return d.width;
      return isSankeyLinkRelated(d) ? d.width + Math.max(2, d.width * 0.15) : Math.max(1, d.width * 0.85);
    });

  // update selected nodes
  selectionTransition(nodes)
    .attr("opacity", 1);

  // fade unrelated nodes
  selectionTransition(nodeRects)
    .attr("opacity", (d) => sankeyNodeOpacity(d, sankeyType))
    .attr("stroke", (d) => {
      if (sankeyType !== null && d.label === sankeyType) return "#263238";
      if (sankeyType !== null && isSankeyNodeRelated(d)) return "#4b4037";
      return "#ffffff";
    })
    .attr("stroke-width", (d) => {
      if (sankeyType !== null && isSankeyNodeRelated(d)) return 2;
      return 0.9;
    });

  // fade unrelated labels
  selectionTransition(nodeLabels)
    .attr("opacity", (d) => (sankeyType === null || isSankeyNodeRelated(d) ? 1 : 0.2))
    .attr("font-weight", (d) => (sankeyType === null || isSankeyNodeRelated(d) ? 700 : 600));
}

// set selected type
function setSelectedType(type) {
  selectedType = selectedType === type ? null : type;
  updateSelectionControl();
  updateHeatmapSelection();
  updateBarSelection();
  updateSankeySelection();
}

// parse boolean strings
function toBoolean(value) {
  return value === "True";
}

// clean one row
function cleanPokemonRow(row) {
  // handle valid blanks
  const type2 = row.Type_2 === "" ? "None" : row.Type_2;
  const eggGroup2 = row.Egg_Group_2 === "" ? "None" : row.Egg_Group_2;
  const prMale = row.Pr_Male === "" ? null : Number(row.Pr_Male);

  // convert fields
  const cleaned = {
    number: Number(row.Number),
    name: row.Name,
    type1: row.Type_1,
    type2,
    total: Number(row.Total),
    hp: Number(row.HP),
    attack: Number(row.Attack),
    defense: Number(row.Defense),
    spAtk: Number(row.Sp_Atk),
    spDef: Number(row.Sp_Def),
    speed: Number(row.Speed),
    generation: Number(row.Generation),
    isLegendary: toBoolean(row.isLegendary),
    color: row.Color,
    hasGender: toBoolean(row.hasGender),
    prMale,
    eggGroup1: row.Egg_Group_1,
    eggGroup2,
    hasMegaEvolution: toBoolean(row.hasMegaEvolution),
    heightM: Number(row.Height_m),
    weightKg: Number(row.Weight_kg),
    catchRate: Number(row.Catch_Rate),
    bodyStyle: row.Body_Style,
  };

  const statValues = BATTLE_STATS.map((field) => cleaned[field]);

  // create derived fields
  cleaned.isDualType = cleaned.type2 !== "None";
  cleaned.catchDifficulty = 255 - cleaned.catchRate;
  cleaned.offense = cleaned.attack + cleaned.spAtk;
  cleaned.defenseScore = cleaned.defense + cleaned.spDef;
  cleaned.statSpread = Math.max(...statValues) - Math.min(...statValues);
  cleaned.stats = BATTLE_STATS.map((field) => ({
    stat: field,
    value: cleaned[field],
  }));

  return cleaned;
}

// data
function loadData() {
  return d3.csv(DATA_PATH).then((rows) => {
    const pokemon = rows.map(cleanPokemonRow);

    return pokemon;
  });
}

// position tooltip
function moveTooltip(tooltip) {
  const offset = 12;
  const tooltipNode = tooltip.node();
  const tooltipWidth = tooltipNode ? tooltipNode.offsetWidth : 160;
  const tooltipHeight = tooltipNode ? tooltipNode.offsetHeight : 80;
  const left = Math.min(d3.event.pageX + offset, window.innerWidth - tooltipWidth - offset);
  const top = Math.min(d3.event.pageY + offset, window.innerHeight - tooltipHeight - offset);

  tooltip.style("left", `${Math.max(offset, left)}px`).style("top", `${Math.max(offset, top)}px`);
}

// sort types by count
function getTypesByCount(pokemon) {
  const typeCounts = d3
    .nest()
    .key((d) => d.type1)
    .rollup((rows) => rows.length)
    .entries(pokemon);

  return typeCounts
    .sort((a, b) => d3.descending(a.value, b.value) || d3.ascending(a.key, b.key))
    .map((d) => d.key);
}

// heatmap counts
function getTypeGenerationCounts(pokemon, generations, types) {
  const countMap = new Map();

  pokemon.forEach((d) => {
    const key = `${d.generation}-${d.type1}`;
    countMap.set(key, (countMap.get(key) || 0) + 1);
  });

  return types.flatMap((type) =>
    generations.map((generation) => ({
      type,
      generation,
      count: countMap.get(`${generation}-${type}`) || 0,
    }))
  );
}

// color legend
function heatmapLegend(svg, colorScale, minValue, maxValue, x, y, height) {
  const legendWidth = 16;
  const legendId = "heatmap-legend-gradient";

  // create gradient
  const defs = svg.append("defs");
  const gradient = defs
    .append("linearGradient")
    .attr("id", legendId)
    .attr("x1", "0%")
    .attr("y1", "100%")
    .attr("x2", "0%")
    .attr("y2", "0%");

  d3.range(0, 1.01, 0.1).forEach((t) => {
    gradient
      .append("stop")
      .attr("offset", `${t * 100}%`)
      .attr("stop-color", colorScale(minValue + t * (maxValue - minValue)));
  });

  const legend = svg.append("g").attr("transform", `translate(${x}, ${y})`);

  // draw legend title
  legend
    .append("text")
    .attr("class", "legend-title")
    .attr("x", 0)
    .attr("y", -12)
    .text("Count");

  // draw legend ramp
  legend
    .append("rect")
    .attr("class", "legend-gradient")
    .attr("width", legendWidth)
    .attr("height", height)
    .attr("fill", `url(#${legendId})`);

  // draw legend labels
  legend
    .append("text")
    .attr("class", "legend-label")
    .attr("x", legendWidth + 8)
    .attr("y", 4)
    .text(maxValue.toFixed(0));

  legend
    .append("text")
    .attr("class", "legend-label")
    .attr("x", legendWidth + 8)
    .attr("y", height)
    .text(minValue.toFixed(0));
}

// heatmap shows overview distribution across generations
// uses matrix position for generation and type so provides context for the dashboard
function typeGenerationHeatmap(pokemon) {
  const container = d3.select("#type-generation-heatmap");
  container.selectAll("*").remove();

  const margin = { top: 32, right: 54, bottom: 38, left: 78 };
  const outerWidth = container.node().clientWidth;
  const outerHeight = container.node().clientHeight;
  const width = outerWidth - margin.left - margin.right;
  const height = outerHeight - margin.top - margin.bottom;

  const generations = Array.from(new Set(pokemon.map((d) => d.generation))).sort((a, b) => a - b);
  const types = getTypesByCount(pokemon);
  const heatmapData = getTypeGenerationCounts(pokemon, generations, types);
  const maxCount = d3.max(heatmapData, (d) => d.count);

  // create svg container
  const svg = container
    .append("svg")
    .attr("width", outerWidth)
    .attr("height", outerHeight)
    .attr("viewBox", `0 0 ${outerWidth} ${outerHeight}`)
    .attr("role", "img")
    .attr("aria-label", "Pokemon counts by generation and primary type");

  const chart = svg
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // create scales
  const xScale = d3.scaleBand().domain(generations).range([0, width]).padding(0.02);
  const yScale = d3.scaleBand().domain(types).range([0, height]).padding(0.015);
  const colorScale = d3
    .scaleSequential((t) => d3.interpolateYlOrRd(0.08 + t * 0.9))
    .domain([0, maxCount]);

  const tooltip = d3.select("#tooltip");

  // draw title
  svg
    .append("text")
    .attr("class", "chart-title")
    .attr("x", margin.left + width / 2)
    .attr("y", 16)
    .attr("text-anchor", "middle")
    .text("Pokemon Counts by Generation and Primary Type");

  // draw axes
  chart
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(xScale));

  const yAxis = chart.append("g").attr("class", "axis").call(d3.axisLeft(yScale));

  // add row click handler
  yAxis
    .selectAll(".tick text")
    .attr("class", "heatmap-type-label clickable")
    .on("click", function (type) {
      setSelectedType(type);
    });

  // draw axis labels
  svg
    .append("text")
    .attr("class", "axis-label")
    .attr("x", margin.left + width / 2)
    .attr("y", outerHeight - 10)
    .attr("text-anchor", "middle")
    .text("Generation");

  svg
    .append("text")
    .attr("class", "axis-label")
    .attr("x", -(margin.top + height / 2))
    .attr("y", 22)
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("Primary Type");

  // draw heatmap cells
  chart
    .selectAll("rect")
    .data(heatmapData)
    .enter()
    .append("rect")
    .attr("class", "heatmap-cell")
    .attr("x", (d) => xScale(d.generation))
    .attr("y", (d) => yScale(d.type))
    .attr("width", xScale.bandwidth())
    .attr("height", yScale.bandwidth())
    .attr("fill", (d) => colorScale(d.count))
    .attr("data-type", (d) => d.type)
    .attr("tabindex", 0)
    .attr("class", "heatmap-cell clickable")
    // add type click handler
    .on("click", function (d) {
      setSelectedType(d.type);
    })
    // add tooltip interaction
    .on("mouseover", function (d) {
      d3.select(this).attr("stroke", "#263238").attr("stroke-width", 2);
      tooltip
        .style("display", "block")
        .html(`<strong>${d.type}</strong><br>Generation: ${d.generation}<br>Count: ${d.count}`);
    })
    .on("mousemove", function () {
      moveTooltip(tooltip);
    })
    .on("mouseout", function () {
      updateHeatmapSelection();
      tooltip.style("display", "none");
    });

  heatmapLegend(svg, colorScale, 0, maxCount, margin.left + width + 16, margin.top, 128);
  updateHeatmapSelection();
}

// type strength data
function getTypeStrengthData(pokemon) {
  return d3
    .nest()
    .key((d) => d.type1)
    .rollup((rows) => ({
      averageTotal: d3.mean(rows, (d) => d.total),
      count: rows.length,
    }))
    .entries(pokemon)
    .map((d) => ({
      type: d.key,
      averageTotal: d.value.averageTotal,
      count: d.value.count,
    }))
    .sort((a, b) => d3.descending(a.averageTotal, b.averageTotal));
}

// bar axes
function barChartAxes(chart, xScale, yScale, width, height) {
  // draw gridlines
  chart
    .append("g")
    .attr("class", "gridline")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(xScale).tickSize(-height).tickFormat(""));

  chart.append("g").attr("class", "gridline").call(d3.axisLeft(yScale).tickSize(-width).tickFormat(""));

  // draw axes
  chart
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(xScale))
    .selectAll("text")
    .attr("text-anchor", "end")
    .attr("dx", "-0.5em")
    .attr("dy", "0.2em")
    .attr("transform", "rotate(-45)");

  chart.append("g").attr("class", "axis").call(d3.axisLeft(yScale).ticks(5));
}

// bar legend
function barChartLegend(svg, colors, x, y) {
  const legendData = [
    { labelLines: ["Above overall", "average"], color: colors.above },
    { labelLines: ["Below overall", "average"], color: colors.below },
  ];

  const legend = svg.append("g").attr("transform", `translate(${x}, ${y})`);

  // draw legend title
  legend
    .append("text")
    .attr("class", "legend-title")
    .attr("x", 0)
    .attr("y", -8)
    .text("Type Average");

  // draw color keys
  const items = legend
    .selectAll(".bar-legend-item")
    .data(legendData)
    .enter()
    .append("g")
    .attr("class", "bar-legend-item")
    .attr("transform", (d, i) => `translate(0, ${i * 32})`);

  items.append("rect").attr("width", 10).attr("height", 10).attr("x", 0).attr("y", 0).attr("fill", (d) => d.color);

  const labels = items
    .append("text")
    .attr("class", "legend-label")
    .attr("x", 16)
    .attr("y", 8);

  labels
    .selectAll("tspan")
    .data((d) => d.labelLines)
    .enter()
    .append("tspan")
    .attr("x", 16)
    .attr("dy", (d, i) => (i === 0 ? 0 : 12))
    .text((d) => d);

  // draw average key
  const lineItem = legend.append("g").attr("transform", `translate(0, ${legendData.length * 32})`);

  lineItem
    .append("line")
    .attr("x1", 0)
    .attr("x2", 12)
    .attr("y1", 5)
    .attr("y2", 5)
    .attr("class", "average-line-legend");

  lineItem
    .append("text")
    .attr("class", "legend-label")
    .attr("x", 16)
    .attr("y", 9)
    .text("Overall average");
}

// average line
function averageLine(chart, yScale, width, overallAverage) {
  const y = yScale(overallAverage);

  // draw reference line
  chart
    .append("line")
    .attr("class", "average-line")
    .attr("x1", 0)
    .attr("x2", width)
    .attr("y1", y)
    .attr("y2", y);

  // label reference line
  chart
    .append("text")
    .attr("class", "average-line-label")
    .attr("x", width - 4)
    .attr("y", y - 6)
    .attr("text-anchor", "end")
    .text(`Overall average: ${overallAverage.toFixed(1)}`);
}

// bar chart compares average type strength
// supports type comparison and differs from heatmap by using averages
function typeStrengthBarChart(pokemon) {
  const container = d3.select("#type-strength-bar-chart");
  container.selectAll("*").remove();

  const margin = { top: 36, right: 158, bottom: 72, left: 62 };
  const outerWidth = container.node().clientWidth;
  const outerHeight = container.node().clientHeight;
  const width = outerWidth - margin.left - margin.right;
  const height = outerHeight - margin.top - margin.bottom;
  const typeData = getTypeStrengthData(pokemon);
  const overallAverage = d3.mean(pokemon, (d) => d.total);
  const colors = { above: "#b2182b", below: "#8fa8b8" };

  // create svg container
  const svg = container
    .append("svg")
    .attr("width", outerWidth)
    .attr("height", outerHeight)
    .attr("viewBox", `0 0 ${outerWidth} ${outerHeight}`)
    .attr("role", "img")
    .attr("aria-label", "Average total stats by primary type bar chart");

  const chart = svg
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // create scales
  const xScale = d3.scaleBand().domain(typeData.map((d) => d.type)).range([0, width]).padding(0.18);
  const yScale = d3
    .scaleLinear()
    .domain([0, d3.max(typeData, (d) => d.averageTotal)])
    .nice()
    .range([height, 0]);

  const tooltip = d3.select("#tooltip");

  // draw title
  svg
    .append("text")
    .attr("class", "chart-title")
    .attr("x", margin.left + width / 2)
    .attr("y", 16)
    .attr("text-anchor", "middle")
    .text("Average Total Stats by Primary Type");

  barChartAxes(chart, xScale, yScale, width, height);

  // draw axis labels
  svg
    .append("text")
    .attr("class", "axis-label")
    .attr("x", margin.left + width / 2)
    .attr("y", outerHeight - 8)
    .attr("text-anchor", "middle")
    .text("Primary Type");

  svg
    .append("text")
    .attr("class", "axis-label")
    .attr("x", -(margin.top + height / 2))
    .attr("y", 16)
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("Average Total Base Stats");

  // draw bars
  chart
    .selectAll("rect.strength-bar")
    .data(typeData)
    .enter()
    .append("rect")
    .attr("class", "strength-bar")
    .attr("x", (d) => xScale(d.type))
    .attr("y", (d) => yScale(d.averageTotal))
    .attr("width", xScale.bandwidth())
    .attr("height", (d) => height - yScale(d.averageTotal))
    .attr("fill", (d) => (d.averageTotal >= overallAverage ? colors.above : colors.below))
    .attr("data-type", (d) => d.type)
    .attr("tabindex", 0)
    .classed("clickable", true)
    // add type click handler
    .on("click", function (d) {
      setSelectedType(d.type);
    })
    // add tooltip interaction
    .on("mouseover", function (d) {
      d3.select(this).attr("stroke", "#263238").attr("stroke-width", 1.5);
      tooltip
        .style("display", "block")
        .html(
          `<strong>${d.type}</strong><br>Average Total: ${d.averageTotal.toFixed(
            1
          )}<br>Pokemon count: ${d.count}<br>${d.averageTotal >= overallAverage ? "Above" : "Below"} overall average`
        );
    })
    .on("mousemove", function () {
      moveTooltip(tooltip);
    })
    .on("mouseout", function () {
      updateBarSelection();
      tooltip.style("display", "none");
    });

  // draw average line
  averageLine(chart, yScale, width, overallAverage);

  barChartLegend(svg, colors, margin.left + width + 18, margin.top + 16);
  updateBarSelection();
}

// build sankey data
function getSankeyFlowData(pokemon) {
  const generations = Array.from(new Set(pokemon.map((d) => d.generation))).sort((a, b) => a - b);
  const statuses = ["Non-Legendary", "Legendary"];
  // count primary types
  const rawTypeCounts = d3
    .nest()
    .key((d) => d.type1)
    .rollup((rows) => rows.length)
    .entries(pokemon)
    .sort((a, b) => d3.descending(a.value, b.value) || d3.ascending(a.key, b.key));
  const topTypes = new Set(rawTypeCounts.slice(0, SANKEY_TOP_TYPE_COUNT).map((d) => d.key));
  const typeLabelMap = new Map(
    rawTypeCounts.map((d) => [d.key, topTypes.has(d.key) ? d.key : SANKEY_OTHER_TYPE_LABEL])
  );
  sankeyVisibleTypeSet = topTypes;
  // group low-frequency types
  const groupedTypeCounts = d3
    .nest()
    .key((d) => typeLabelMap.get(d.type1))
    .rollup((rows) => rows.length)
    .entries(pokemon);
  const types = groupedTypeCounts
    .sort((a, b) => d3.descending(a.value, b.value) || d3.ascending(a.key, b.key))
    .map((d) => d.key);
  const nodeMap = new Map();
  const linkMap = new Map();

  // create sankey nodes
  function addNode(id, label, stage, order) {
    if (!nodeMap.has(id)) {
      nodeMap.set(id, { id, label, stage, order, value: 0, sourceLinks: [], targetLinks: [] });
    }
    return nodeMap.get(id);
  }

  generations.forEach((generation, index) => addNode(`gen-${generation}`, `Gen ${generation}`, "generation", index));
  types.forEach((type, index) => addNode(`type-${type}`, type, "type", index));
  statuses.forEach((status, index) => addNode(`status-${status}`, status, "status", index));

  // aggregate sankey links
  function addLink(sourceId, targetId, value) {
    const key = `${sourceId}->${targetId}`;
    if (!linkMap.has(key)) {
      linkMap.set(key, { sourceId, targetId, value: 0 });
    }
    linkMap.get(key).value += value;
  }

  pokemon.forEach((d) => {
    const generationId = `gen-${d.generation}`;
    const typeId = `type-${typeLabelMap.get(d.type1)}`;
    const statusId = `status-${d.isLegendary ? "Legendary" : "Non-Legendary"}`;

    nodeMap.get(generationId).value += 1;
    nodeMap.get(typeId).value += 1;
    nodeMap.get(statusId).value += 1;
    addLink(generationId, typeId, 1);
    addLink(typeId, statusId, 1);
  });

  const nodes = Array.from(nodeMap.values());
  const links = Array.from(linkMap.values()).map((link) => ({
    ...link,
    source: nodeMap.get(link.sourceId),
    target: nodeMap.get(link.targetId),
  }));

  links.forEach((link) => {
    link.source.sourceLinks.push(link);
    link.target.targetLinks.push(link);
  });

  return { nodes, links };
}

// layout sankey columns
function layoutSankeyFlow(nodes, links, width, height) {
  const nodeWidth = 16;
  const nodePadding = 5;
  const stageOrder = ["generation", "type", "status"];
  const xPositions = {
    generation: 0,
    type: width / 2 - nodeWidth / 2,
    status: width - nodeWidth,
  };

  const stages = stageOrder.map((stage) =>
    nodes.filter((node) => node.stage === stage).sort((a, b) => d3.ascending(a.order, b.order))
  );

  const scale = d3.min(stages, (stageNodes) => {
    const total = d3.sum(stageNodes, (node) => node.value);
    return (height - nodePadding * (stageNodes.length - 1)) / total;
  });

  // position sankey nodes
  stages.forEach((stageNodes) => {
    const totalHeight = d3.sum(stageNodes, (node) => node.value * scale) + nodePadding * (stageNodes.length - 1);
    let y = (height - totalHeight) / 2;

    stageNodes.forEach((node) => {
      node.x0 = xPositions[node.stage];
      node.x1 = node.x0 + nodeWidth;
      node.y0 = y;
      node.y1 = y + node.value * scale;
      y = node.y1 + nodePadding;
    });
  });

  // order flow links
  nodes.forEach((node) => {
    node.sourceLinks.sort((a, b) => d3.ascending(a.target.y0, b.target.y0));
    node.targetLinks.sort((a, b) => d3.ascending(a.source.y0, b.source.y0));
  });

  // position flow links
  nodes.forEach((node) => {
    let sourceOffset = 0;
    let targetOffset = 0;

    node.sourceLinks.forEach((link) => {
      link.width = Math.max(1, link.value * scale);
      link.y0 = node.y0 + sourceOffset + link.width / 2;
      sourceOffset += link.width;
    });

    node.targetLinks.forEach((link) => {
      link.width = Math.max(1, link.value * scale);
      link.y1 = node.y0 + targetOffset + link.width / 2;
      targetOffset += link.width;
    });
  });

  links.forEach((link) => {
    link.x0 = link.source.x1;
    link.x1 = link.target.x0;
  });
}

// sankey path
function sankeyPath(d) {
  const curve = (d.x1 - d.x0) * 0.62;
  return `M${d.x0},${d.y0} C${d.x0 + curve},${d.y0} ${d.x1 - curve},${d.y1} ${d.x1},${d.y1}`;
}

// sankey color
function sankeyColor(d) {
  if (d.stage === "generation") return "#c98938";
  if (d.stage === "type") return "#78909c";
  if (d.label === "Legendary") return "#a61e2c";
  return "#9fb3bf";
}

// link color
function sankeyLinkColor(d) {
  if (d.target.label === "Legendary") return "#a61e2c";
  if (d.target.stage === "status") return "#8fa8b8";
  return "#d99a45";
}

// sankey shows categorical flow into legendary status
// use proportional links for counts and differ by showing categorical composition
function generationTypeLegendarySankey(pokemon) {
  const container = d3.select("#sankey-flow");
  container.selectAll("*").remove();

  const margin = { top: 82, right: 92, bottom: 76, left: 62 };
  const outerWidth = container.node().clientWidth;
  const outerHeight = container.node().clientHeight;
  const width = outerWidth - margin.left - margin.right;
  const height = outerHeight - margin.top - margin.bottom;
  const sankeyData = getSankeyFlowData(pokemon);
  const tooltip = d3.select("#tooltip");

  layoutSankeyFlow(sankeyData.nodes, sankeyData.links, width, height);

  // create svg container
  const svg = container
    .append("svg")
    .attr("width", outerWidth)
    .attr("height", outerHeight)
    .attr("viewBox", `0 0 ${outerWidth} ${outerHeight}`)
    .attr("role", "img")
    .attr("aria-label", "Pokemon flow by generation primary type and legendary status sankey diagram");

  const chart = svg.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);

  // draw title
  svg
    .append("text")
    .attr("class", "chart-title")
    .attr("x", outerWidth / 2)
    .attr("y", 18)
    .attr("text-anchor", "middle")
    .text("Pokemon Flow by Generation, Primary Type, and Legendary Status");

  // draw annotation
  svg
    .append("text")
    .attr("class", "sankey-note")
    .attr("x", outerWidth / 2)
    .attr("y", 34)
    .attr("text-anchor", "middle")
    .text("links show Pokemon counts; top 10 types shown");

  // draw grouping note
  svg
    .append("text")
    .attr("class", "sankey-note")
    .attr("x", outerWidth / 2)
    .attr("y", 48)
    .attr("text-anchor", "middle")
    .text("Low-count types are grouped as Other Types");

  // draw stage labels
  const stageLabels = [
    { label: "Generation", x: margin.left },
    { label: "Primary Type", x: margin.left + width / 2 },
    { label: "Legendary Status", x: margin.left + width },
  ];

  svg
    .selectAll(".sankey-stage-label")
    .data(stageLabels)
    .enter()
    .append("text")
    .attr("class", "sankey-stage-label")
    .attr("x", (d) => d.x)
    .attr("y", 64)
    .attr("text-anchor", (d, i) => (i === 0 ? "start" : i === 2 ? "end" : "middle"))
    .text((d) => d.label);

  // draw flow paths
  const flowLinks = chart
    .append("g")
    .selectAll(".sankey-link")
    .data(sankeyData.links)
    .enter()
    .append("path")
    .attr("class", "sankey-link")
    .attr("d", sankeyPath)
    .attr("stroke", sankeyLinkColor)
    .attr("stroke-width", (d) => d.width)
    .attr("data-source", (d) => d.source.label)
    .attr("data-target", (d) => d.target.label)
    // add tooltip interaction
    .on("mouseover", function (d) {
      const sankeyType = getSankeySelectedType(selectedType);

      // restore selected sankey state
      flowLinks.attr("stroke-opacity", (link) => {
        if (sankeyType === null) return 0.16;
        return isSankeyLinkRelated(link) ? 0.28 : 0.04;
      });
      d3.select(this).raise().attr("stroke-opacity", 1).attr("stroke-width", d.width + Math.max(2, d.width * 0.15));
      tooltip
        .style("display", "block")
        .html(`<strong>${d.source.label} → ${d.target.label}</strong><br>Pokemon count: ${d.value}`);
    })
    .on("mousemove", function () {
      moveTooltip(tooltip);
    })
    .on("mouseout", function () {
      updateSankeySelection();
      tooltip.style("display", "none");
    });

  // draw nodes
  const nodes = chart
    .append("g")
    .selectAll(".sankey-node-group")
    .data(sankeyData.nodes)
    .enter()
    .append("g")
    .attr("class", "sankey-node-group")
    .attr("data-stage", (d) => d.stage)
    .attr("data-type", (d) => (d.stage === "type" ? d.label : null))
    .classed("clickable", (d) => d.stage === "type" && d.label !== "Other Types")
    // add type click handler
    .on("click", function (d) {
      if (d.stage === "type" && d.label !== "Other Types") {
        setSelectedType(d.label);
      }
    })
    // add node tooltip
    .on("mouseover", function (d) {
      tooltip.style("display", "block").html(`<strong>${d.label}</strong><br>Total Pokémon: ${d.value}`);
    })
    .on("mousemove", function () {
      moveTooltip(tooltip);
    })
    .on("mouseout", function () {
      updateSankeySelection();
      tooltip.style("display", "none");
    });

  nodes
    .append("rect")
    .attr("class", "sankey-node")
    .attr("x", (d) => d.x0)
    .attr("y", (d) => d.y0)
    .attr("width", (d) => d.x1 - d.x0)
    .attr("height", (d) => Math.max(2, d.y1 - d.y0))
    .attr("fill", sankeyColor);

  // draw node labels
  nodes
    .append("text")
    .attr("class", "sankey-node-label")
    .attr("x", (d) => {
      if (d.stage === "generation") return d.x0 - 6;
      if (d.stage === "status") return d.x1 + 6;
      return d.x0 + (d.x1 - d.x0) / 2;
    })
    .attr("y", (d) => (d.y0 + d.y1) / 2 + 3)
    .attr("text-anchor", (d) => {
      if (d.stage === "generation") return "end";
      if (d.stage === "status") return "start";
      return "middle";
    })
    .text((d) => d.label);

  updateSankeySelection();
}

// data loading
if (typeof document !== "undefined") {
  loadData()
    .then((pokemon) => {
      typeGenerationHeatmap(pokemon);
      typeStrengthBarChart(pokemon);
      generationTypeLegendarySankey(pokemon);

      // add reset interaction
      d3.select("#clear-selection").on("click", function () {
        if (selectedType !== null) {
          setSelectedType(selectedType);
        }
      });
      updateSelectionControl();
    })
    .catch((error) => {
      console.error("Failed to load Pokemon data:", error);
    });
}
