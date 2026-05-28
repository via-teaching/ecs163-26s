// ECS 163 HW3 Interactive Pokémon Dashboard
// All visual elements are created with D3.js v7; comments explain each D3-created element and interaction.

const statKeys = ["HP", "Attack", "Defense", "SpAtk", "SpDef", "Speed"];
const statLabels = {
  HP: "HP",
  Attack: "Attack",
  Defense: "Defense",
  SpAtk: "Sp. Atk",
  SpDef: "Sp. Def",
  Speed: "Speed"
};

// Pokémon type colors use intuitive Pokémon type associations: Fire = red/orange, Water = blue, Grass = green, Electric = yellow, etc.
const pokemonTypeColors = {
  Normal: "#A4ACAF",
  Fire: "#E3350D",
  Water: "#2F80ED",
  Electric: "#F2CB05",
  Grass: "#43A047",
  Ice: "#51C4E7",
  Fighting: "#D56723",
  Poison: "#9C27B0",
  Ground: "#AB7A2A",
  Flying: "#7E9CCF",
  Psychic: "#F366B9",
  Bug: "#729F3F",
  Rock: "#A38C21",
  Ghost: "#7B62A3",
  Dragon: "#7038F8",
  Dark: "#5D5D5D",
  Steel: "#9EB7B8",
  Fairy: "#FDB9E9",
  Unknown: "#94A3B8"
};

let allData = [];
let activeType = "All";
let brushedNames = null;
let selected = null;

const tooltip = d3.select("#tooltip");
const typeFilter = d3.select("#typeFilter");

function numberValue(value) {
  const parsed = +value;
  return Number.isFinite(parsed) ? parsed : 0;
}

function pickValue(...values) {
  return values.find(value => value !== undefined && value !== null && value !== "");
}

function typeColor(type) {
  return pokemonTypeColors[type] || pokemonTypeColors.Unknown;
}

function parsePokemon(d) {
  const name = pickValue(d.Name, d.name, d.Pokemon, d.pokemon);
  const type1 = pickValue(d.Type1, d["Type 1"], d.Type_1, d.type1, d.type, "Unknown");

  if (!name) return null;

  return {
    name,
    type1,
    type2: pickValue(d.Type2, d["Type 2"], d.Type_2, d.type2, ""),
    total: numberValue(pickValue(d.Total, d.total)),
    HP: numberValue(pickValue(d.HP, d.hp)),
    Attack: numberValue(pickValue(d.Attack, d.attack)),
    Defense: numberValue(pickValue(d.Defense, d.defense)),
    SpAtk: numberValue(pickValue(d.SpAtk, d.Sp_Atk, d["Sp. Atk"], d["Sp Atk"], d.sp_attack)),
    SpDef: numberValue(pickValue(d.SpDef, d.Sp_Def, d["Sp. Def"], d["Sp Def"], d.sp_defense)),
    Speed: numberValue(pickValue(d.Speed, d.speed)),
    generation: numberValue(pickValue(d.Generation, d.generation)),
    legendary: String(pickValue(d.Legendary, d.legendary, d.isLegendary, false)).toLowerCase() === "true"
  };
}

// Load the local CSV file and convert every row into a consistent object for the charts.
d3.csv("data/pokemon.csv", parsePokemon)
  .then(data => {
    const cleaned = data.filter(d => d && d.name && d.Attack > 0 && d.Speed > 0);
    initialize(cleaned);
  })
  .catch(error => {
    d3.select("main").html(`<section class="panel"><h2>Data loading error</h2><p>${error}</p></section>`);
  });

function initialize(data) {
  allData = data;
  selected = allData[0];

  // D3 uses the unique primary types in the dataset to build the dropdown filter.
  const types = ["All", ...Array.from(new Set(allData.map(d => d.type1))).sort(d3.ascending)];

  // D3 creates the type filter options from the dataset so the filter matches the available Pokémon types.
  typeFilter
    .selectAll("option")
    .data(types)
    .join("option")
    .attr("value", d => d)
    .text(d => d === "All" ? "All types" : d);


  // D3 listens for dropdown changes and updates every linked view.
  typeFilter.on("change", event => {
    activeType = event.target.value;
    brushedNames = null;
    d3.select("#scatterplot .brush").call(scatterBrush.move, null);
    updateAll();
  });

  // D3 attaches the Clear Brush button behavior.
  d3.select("#resetBrush").on("click", () => {
    brushedNames = null;
    d3.select("#scatterplot .brush").call(scatterBrush.move, null);
    updateAll();
  });

  // D3 attaches the Reset All button behavior.
  d3.select("#resetAll").on("click", () => {
    activeType = "All";
    typeFilter.property("value", "All");
    brushedNames = null;
    selected = allData[0];
    d3.select("#scatterplot .brush").call(scatterBrush.move, null);
    updateAll();
  });

  setupScatterplot();
  setupStatChart();
  setupParallelChart();
  setupTypeChart();
  updateAll();
}

function typeFilteredData() {
  return activeType === "All" ? allData : allData.filter(d => d.type1 === activeType);
}

function focusedData() {
  const base = typeFilteredData();
  if (!brushedNames) return base;
  return base.filter(d => brushedNames.has(d.name));
}

function selectedIsInsideTypeFilter() {
  return typeFilteredData().some(d => d.name === selected?.name);
}

function parallelData() {
  const focus = focusedData();
  if (!selected || !selectedIsInsideTypeFilter()) return focus;
  if (focus.some(d => d.name === selected.name)) return focus;
  return [selected, ...focus];
}

function updateAll() {
  const base = typeFilteredData();
  const focus = focusedData();

  if (!selectedIsInsideTypeFilter() && base.length > 0) {
    selected = base[0];
  }

  d3.select("#countBadge").text(`${focus.length} of ${allData.length} Pokémon shown`);

  d3.select("#selectedText").html(
    selected
      ? `<strong>${selected.name}</strong> — ${selected.type1}${selected.type2 ? ` / ${selected.type2}` : ""}, total stat ${selected.total}`
      : "Click a point to select a Pokémon."
  );

  updateScatterplot(base);
  updateStatChart(selected);
  updateParallelChart(parallelData());
  updateTypeChart(focus);
}

function showTooltip(event, d) {
  tooltip
    .classed("hidden", false)
    .html(
      `<strong>${d.name}</strong><br>` +
      `Type: ${d.type1}${d.type2 ? ` / ${d.type2}` : ""}<br>` +
      `Attack: ${d.Attack}<br>` +
      `Speed: ${d.Speed}<br>` +
      `Total: ${d.total}`
    )
    .style("left", `${event.clientX + 14}px`)
    .style("top", `${event.clientY + 14}px`);
}

function hideTooltip() {
  tooltip.classed("hidden", true);
}

function selectPokemon(event, d) {
  if (event && event.stopPropagation) event.stopPropagation();
  selected = d;
  updateAll();
}

function nearestVisiblePokemon(mx, my, maxDistance = 16) {
  const candidates = brushedNames ? focusedData() : typeFilteredData();
  let closest = null;
  let closestDistance = Infinity;

  candidates.forEach(d => {
    const dx = scatterX(d.Attack) - mx;
    const dy = scatterY(d.Speed) - my;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < closestDistance) {
      closest = d;
      closestDistance = distance;
    }
  });

  return closestDistance <= maxDistance ? closest : null;
}

const scatterMargin = { top: 18, right: 22, bottom: 42, left: 52 };
const scatterWidth = 720;
const scatterHeight = 315;
const scatterInnerWidth = scatterWidth - scatterMargin.left - scatterMargin.right;
const scatterInnerHeight = scatterHeight - scatterMargin.top - scatterMargin.bottom;
let scatterSvg, scatterG, scatterX, scatterY, radiusScale, scatterBrush;
let brushDragHappened = false;

function setupScatterplot() {
  // D3 adds the main SVG container for the overview scatterplot.
  scatterSvg = d3.select("#scatterplot")
    .append("svg")
    .attr("viewBox", `0 0 ${scatterWidth} ${scatterHeight}`)
    .attr("aria-label", "Scatterplot showing Pokémon attack and speed");

  // D3 adds a translated group so chart marks fit inside the margins.
  scatterG = scatterSvg.append("g")
    .attr("transform", `translate(${scatterMargin.left},${scatterMargin.top})`);

  scatterX = d3.scaleLinear()
    .domain([0, d3.max(allData, d => d.Attack) + 15])
    .range([0, scatterInnerWidth])
    .nice();

  scatterY = d3.scaleLinear()
    .domain([0, d3.max(allData, d => d.Speed) + 15])
    .range([scatterInnerHeight, 0])
    .nice();

  radiusScale = d3.scaleSqrt()
    .domain(d3.extent(allData, d => d.total))
    .range([3.5, 9]);

  // D3 adds light gridlines to make it easier to read Attack and Speed values.
  scatterG.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(scatterY).tickSize(-scatterInnerWidth).tickFormat(""));

  // D3 adds the x-axis for Attack.
  scatterG.append("g")
    .attr("class", "axis x-axis")
    .attr("transform", `translate(0,${scatterInnerHeight})`)
    .call(d3.axisBottom(scatterX).ticks(6));

  // D3 adds the y-axis for Speed.
  scatterG.append("g")
    .attr("class", "axis y-axis")
    .call(d3.axisLeft(scatterY).ticks(6));

  // D3 adds the x-axis label.
  scatterG.append("text")
    .attr("x", scatterInnerWidth / 2)
    .attr("y", scatterInnerHeight + 34)
    .attr("text-anchor", "middle")
    .attr("class", "chart-title")
    .text("Attack");

  // D3 adds the y-axis label.
  scatterG.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -scatterInnerHeight / 2)
    .attr("y", -36)
    .attr("text-anchor", "middle")
    .attr("class", "chart-title")
    .text("Speed");

  scatterBrush = d3.brush()
    .extent([[0, 0], [scatterInnerWidth, scatterInnerHeight]])
    // If the pointer starts close to a Pokémon dot, D3 treats it as a click selection instead of starting a brush.
    // This prevents the brush overlay from blocking single-dot selection.
    .filter(event => {
      if (event.button || event.ctrlKey || event.metaKey || event.altKey) return false;
      const [mx, my] = d3.pointer(event, scatterG.node());
      return !nearestVisiblePokemon(mx, my, 15);
    })
    .on("start", () => {
      brushDragHappened = false;
    })
    .on("brush", () => {
      brushDragHappened = true;
    })
    .on("end", event => {
      if (!event.selection) {
        brushedNames = null;
        updateAll();
        return;
      }

      const [[x0, y0], [x1, y1]] = event.selection;
      const names = typeFilteredData()
        .filter(d => {
          const cx = scatterX(d.Attack);
          const cy = scatterY(d.Speed);
          return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
        })
        .map(d => d.name);

      brushedNames = names.length > 0 ? new Set(names) : null;
      updateAll();
    });

  // D3 adds the brush layer for drag-selection on the scatterplot background.
  const brushLayer = scatterG.append("g")
    .attr("class", "brush")
    .call(scatterBrush);

  // Clicking the invisible brush overlay near a dot selects the nearest Pokémon.
  // This is the reliable fix for the common D3 issue where brush overlays capture dot clicks.
  brushLayer.select(".overlay")
    .on("click.select-nearest", event => {
      if (brushDragHappened) {
        brushDragHappened = false;
        return;
      }

      const [mx, my] = d3.pointer(event, scatterG.node());
      const nearest = nearestVisiblePokemon(mx, my, 16);

      if (nearest) {
        selectPokemon(event, nearest);
      }
    });

  // D3 adds a separate points layer above the brush. This is the key fix that lets dot click-selection work.
  scatterG.append("g")
    .attr("class", "points-layer");
}

function updateScatterplot(data) {
  // D3 binds one circle mark to each Pokémon shown in the current type filter.
  const circles = scatterG.select(".points-layer")
    .selectAll("circle")
    .data(data, d => d.name);

  const merged = circles.join(
    enter => enter.append("circle")
      .attr("class", "point")
      .attr("cx", d => scatterX(d.Attack))
      .attr("cy", d => scatterY(d.Speed))
      .attr("r", 0)
      .attr("fill", d => typeColor(d.type1))
      .on("mouseover", showTooltip)
      .on("mousemove", showTooltip)
      .on("mouseout", hideTooltip)
      // pointerdown fires before the brush can swallow the click, so single-dot selection is reliable.
      .on("pointerdown", (event, d) => {
        if (event.button !== 0) return;
        selectPokemon(event, d);
      })
      .on("click", selectPokemon)
      .call(enter => enter.transition().duration(500).attr("r", d => radiusScale(d.total))),
    update => update
      .on("pointerdown", (event, d) => {
        if (event.button !== 0) return;
        selectPokemon(event, d);
      })
      .on("click", selectPokemon),
    exit => exit.transition().duration(300).attr("r", 0).style("opacity", 0).remove()
  );

  // D3 updates point position, size, color, opacity, and selected styling with a filtering transition.
  merged
    .classed("selected-point", d => selected && d.name === selected.name)
    .transition()
    .duration(450)
    .ease(d3.easeCubicInOut)
    .attr("cx", d => scatterX(d.Attack))
    .attr("cy", d => scatterY(d.Speed))
    .attr("r", d => selected && d.name === selected.name ? radiusScale(d.total) + 3 : radiusScale(d.total))
    .attr("fill", d => typeColor(d.type1))
    .style("opacity", d => {
      if (selected && d.name === selected.name) return 1;
      if (brushedNames && !brushedNames.has(d.name)) return 0.12;
      return 0.86;
    });

  // D3 raises the selected dot after drawing, making the selected Pokémon easier to see.
  merged.filter(d => selected && d.name === selected.name).raise();
}

const statMargin = { top: 14, right: 24, bottom: 34, left: 70 };
const statWidth = 400;
const statHeight = 250;
const statInnerWidth = statWidth - statMargin.left - statMargin.right;
const statInnerHeight = statHeight - statMargin.top - statMargin.bottom;
let statSvg, statG, statX, statY;

function setupStatChart() {
  // D3 adds the SVG container for the selected Pokémon stat bar chart.
  statSvg = d3.select("#statChart")
    .append("svg")
    .attr("viewBox", `0 0 ${statWidth} ${statHeight}`)
    .attr("aria-label", "Bar chart showing selected Pokémon stats");

  // D3 adds the margin group for the bar chart.
  statG = statSvg.append("g")
    .attr("transform", `translate(${statMargin.left},${statMargin.top})`);

  statX = d3.scaleLinear().domain([0, 180]).range([0, statInnerWidth]);
  statY = d3.scaleBand().domain(statKeys).range([0, statInnerHeight]).padding(0.22);

  // D3 adds the x-axis for stat values.
  statG.append("g")
    .attr("class", "axis x-axis")
    .attr("transform", `translate(0,${statInnerHeight})`);

  // D3 adds the y-axis for stat names.
  statG.append("g")
    .attr("class", "axis y-axis");
}

function updateStatChart(pokemon) {
  if (!pokemon) return;

  const values = statKeys.map(key => ({ key, label: statLabels[key], value: pokemon[key] }));
  const maxValue = Math.max(120, d3.max(values, d => d.value) + 20);

  statX.domain([0, maxValue]).nice();

  // D3 transitions the x-axis when a selected Pokémon has a different stat range.
  statG.select(".x-axis")
    .transition()
    .duration(550)
    .ease(d3.easeCubicInOut)
    .call(d3.axisBottom(statX).ticks(5));

  statG.select(".y-axis")
    .call(d3.axisLeft(statY).tickFormat(d => statLabels[d]));

  // D3 binds one rectangle bar to each stat for the selected Pokémon.
  const bars = statG.selectAll("rect")
    .data(values, d => d.key);

  // D3 creates and updates stat bars. The width transition is the clearest animated transition in the dashboard.
  bars.join(
    enter => enter.append("rect")
      .attr("class", "bar")
      .attr("x", 0)
      .attr("y", d => statY(d.key))
      .attr("height", statY.bandwidth())
      .attr("width", 0)
      .attr("fill", typeColor(pokemon.type1))
      .call(enter => enter.transition().duration(600).attr("width", d => statX(d.value))),
    update => update,
    exit => exit.remove()
  )
    .transition()
    .duration(600)
    .ease(d3.easeCubicInOut)
    .attr("y", d => statY(d.key))
    .attr("height", statY.bandwidth())
    .attr("width", d => statX(d.value))
    .attr("fill", typeColor(pokemon.type1));

  // D3 binds one text label to each stat bar value.
  const labels = statG.selectAll(".value-label")
    .data(values, d => d.key);

  // D3 adds text labels at the end of each stat bar.
  labels.join(
    enter => enter.append("text")
      .attr("class", "value-label")
      .attr("x", 4)
      .attr("y", d => statY(d.key) + statY.bandwidth() / 2 + 4)
      .text(d => d.value),
    update => update,
    exit => exit.remove()
  )
    .transition()
    .duration(600)
    .ease(d3.easeCubicInOut)
    .attr("x", d => statX(d.value) + 6)
    .attr("y", d => statY(d.key) + statY.bandwidth() / 2 + 4)
    .text(d => d.value);
}

const parallelMargin = { top: 22, right: 38, bottom: 20, left: 42 };
const parallelWidth = 720;
const parallelHeight = 270;
const parallelInnerWidth = parallelWidth - parallelMargin.left - parallelMargin.right;
const parallelInnerHeight = parallelHeight - parallelMargin.top - parallelMargin.bottom;
let parallelSvg, parallelG, parallelX, parallelYScales, lineGenerator;

function setupParallelChart() {
  // D3 adds the SVG container for the advanced parallel coordinates view.
  parallelSvg = d3.select("#parallelChart")
    .append("svg")
    .attr("viewBox", `0 0 ${parallelWidth} ${parallelHeight}`)
    .attr("aria-label", "Parallel coordinates chart comparing Pokémon stats");

  // D3 adds the margin group for the parallel coordinates chart.
  parallelG = parallelSvg.append("g")
    .attr("transform", `translate(${parallelMargin.left},${parallelMargin.top})`);

  parallelX = d3.scalePoint()
    .domain(statKeys)
    .range([0, parallelInnerWidth])
    .padding(0.35);

  parallelYScales = Object.fromEntries(
    statKeys.map(key => [
      key,
      d3.scaleLinear()
        .domain([0, d3.max(allData, d => d[key]) + 10])
        .range([parallelInnerHeight, 0])
        .nice()
    ])
  );

  lineGenerator = d3.line()
    .x(d => parallelX(d.key))
    .y(d => parallelYScales[d.key](d.value))
    .curve(d3.curveMonotoneX);

  // D3 adds one vertical axis for each Pokémon stat.
  const axes = parallelG.selectAll(".parallel-axis")
    .data(statKeys)
    .join("g")
    .attr("class", "axis parallel-axis")
    .attr("transform", d => `translate(${parallelX(d)},0)`)
    .each(function (key) {
      d3.select(this).call(d3.axisLeft(parallelYScales[key]).ticks(4));
    });

  // D3 adds labels above each parallel-coordinate axis.
  axes.append("text")
    .attr("class", "chart-title")
    .attr("text-anchor", "middle")
    .attr("y", -8)
    .text(d => statLabels[d]);

  // D3 adds the group that will hold all Pokémon stat profile lines.
  parallelG.append("g")
    .attr("class", "parallel-lines");
}

function pokemonPath(d) {
  return lineGenerator(statKeys.map(key => ({ key, value: d[key] })));
}

function updateParallelChart(data) {
  const limitedData = data.length > 140 ? data.slice(0, 140) : data;

  // D3 binds one path line to each Pokémon shown in the parallel coordinates view.
  const lines = parallelG.select(".parallel-lines")
    .selectAll("path")
    .data(limitedData, d => d.name);

  // D3 creates and updates the stat-profile lines. Lines fade in/out as filtering or brushing changes.
  lines.join(
    enter => enter.append("path")
      .attr("class", "parallel-line")
      .attr("d", pokemonPath)
      .attr("stroke", d => typeColor(d.type1))
      .style("opacity", 0)
      .on("mouseover", showTooltip)
      .on("mousemove", showTooltip)
      .on("mouseout", hideTooltip)
      .on("pointerdown", (event, d) => {
        if (event.button !== 0) return;
        selectPokemon(event, d);
      })
      .on("click", selectPokemon)
      .call(enter => enter.transition().duration(600).style("opacity", 0.25)),
    update => update,
    exit => exit.transition().duration(300).style("opacity", 0).remove()
  )
    .classed("selected-line", d => selected && d.name === selected.name)
    .transition()
    .duration(600)
    .ease(d3.easeCubicInOut)
    .attr("d", pokemonPath)
    .attr("stroke", d => typeColor(d.type1))
    .style("opacity", d => selected && d.name === selected.name ? 1 : 0.25);

  parallelG.select(".parallel-lines")
    .selectAll("path")
    .filter(d => selected && d.name === selected.name)
    .raise();
}

const typeMargin = { top: 14, right: 18, bottom: 70, left: 42 };
const typeWidth = 400;
const typeHeight = 250;
const typeInnerWidth = typeWidth - typeMargin.left - typeMargin.right;
const typeInnerHeight = typeHeight - typeMargin.top - typeMargin.bottom;
let typeSvg, typeG, typeX, typeY;

function setupTypeChart() {
  // D3 adds the SVG container for the primary type distribution chart.
  typeSvg = d3.select("#typeChart")
    .append("svg")
    .attr("viewBox", `0 0 ${typeWidth} ${typeHeight}`)
    .attr("aria-label", "Bar chart showing primary type distribution");

  // D3 adds the margin group for the type distribution chart.
  typeG = typeSvg.append("g")
    .attr("transform", `translate(${typeMargin.left},${typeMargin.top})`);

  typeX = d3.scaleBand().range([0, typeInnerWidth]).padding(0.2);
  typeY = d3.scaleLinear().range([typeInnerHeight, 0]);

  // D3 adds the x-axis for Pokémon types.
  typeG.append("g")
    .attr("class", "axis x-axis")
    .attr("transform", `translate(0,${typeInnerHeight})`);

  // D3 adds the y-axis for Pokémon counts.
  typeG.append("g")
    .attr("class", "axis y-axis");
}

function updateTypeChart(data) {
  const counts = Array.from(
    d3.rollup(data, v => v.length, d => d.type1),
    ([type, count]) => ({ type, count })
  ).sort((a, b) => d3.descending(a.count, b.count));

  typeX.domain(counts.map(d => d.type));
  typeY.domain([0, Math.max(1, d3.max(counts, d => d.count) || 1)]).nice();

  // D3 transitions the x-axis as types enter or leave the current filtered group.
  typeG.select(".x-axis")
    .transition()
    .duration(550)
    .ease(d3.easeCubicInOut)
    .call(d3.axisBottom(typeX))
    .selectAll("text")
    .attr("transform", "rotate(-40)")
    .style("text-anchor", "end");

  // D3 transitions the y-axis to match the current type counts.
  typeG.select(".y-axis")
    .transition()
    .duration(550)
    .ease(d3.easeCubicInOut)
    .call(d3.axisLeft(typeY).ticks(4).tickFormat(d3.format("d")));

  // D3 binds one rectangle bar to each primary type in the current focused subset.
  const bars = typeG.selectAll("rect")
    .data(counts, d => d.type);

  // D3 creates and updates type-count bars. The bars resize smoothly after brushing or filtering.
  bars.join(
    enter => enter.append("rect")
      .attr("class", "bar")
      .attr("x", d => typeX(d.type))
      .attr("y", typeInnerHeight)
      .attr("width", typeX.bandwidth())
      .attr("height", 0)
      .attr("fill", d => typeColor(d.type))
      .on("click", (event, d) => {
        activeType = d.type;
        typeFilter.property("value", d.type);
        brushedNames = null;
        d3.select("#scatterplot .brush").call(scatterBrush.move, null);
        updateAll();
      })
      .call(enter => enter.transition().duration(600)
        .ease(d3.easeCubicInOut)
        .attr("y", d => typeY(d.count))
        .attr("height", d => typeInnerHeight - typeY(d.count))),
    update => update,
    exit => exit.transition().duration(300).attr("y", typeInnerHeight).attr("height", 0).remove()
  )
    .transition()
    .duration(600)
    .ease(d3.easeCubicInOut)
    .attr("x", d => typeX(d.type))
    .attr("width", typeX.bandwidth())
    .attr("y", d => typeY(d.count))
    .attr("height", d => typeInnerHeight - typeY(d.count))
    .attr("fill", d => typeColor(d.type));
}
