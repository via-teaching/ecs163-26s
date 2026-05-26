// ECS 163 HW3 - Pokemon dashboard
// Three linked views: heatmap, scatterplot, and parallel coordinates
const svg = d3.select("svg");
const dataPath = "data/pokemon_alopez247.csv";

const stats = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];
const defaultFocusCount = 120;
const selectedTypes = ["Water", "Normal", "Grass", "Bug", "Psychic", "Fire", "Rock", "Electric"];
const typeColors = {
  Water: "#2b7bba",
  Normal: "#8b8f7a",
  Grass: "#3f9142",
  Bug: "#8a9a16",
  Psychic: "#c94f87",
  Fire: "#d95f2a",
  Rock: "#9c7f3b",
  Electric: "#d49b00"
};

let pokemon = [];
let activeCell = null;
let activePokemon = null;
let brushedNumbers = new Set();

d3.csv(dataPath).then(rawData => {
  pokemon = rawData.map(d => ({
    number: +d.Number,
    name: d.Name,
    type: d.Type_1,
    secondaryType: d.Type_2 || "None",
    generation: +d.Generation,
    total: +d.Total,
    hp: +d.HP,
    attack: +d.Attack,
    defense: +d.Defense,
    spAtk: +d.Sp_Atk,
    spDef: +d.Sp_Def,
    speed: +d.Speed,
    legendary: d.isLegendary === "True",
    height: +d.Height_m,
    weight: +d.Weight_kg,
    catchRate: +d.Catch_Rate
  }));

  drawDashboard();
  window.addEventListener("resize", drawDashboard);
}).catch(error => {
  console.error("Could not load Pokemon data:", error);
});

function drawDashboard() {
  const width = Math.max(960, window.innerWidth);
  const height = Math.max(680, window.innerHeight);
  const gap = 12;
  const topBand = Math.max(330, Math.floor(height * 0.48));
  const leftWidth = Math.floor((width - gap * 3) * 0.58);
  const rightWidth = width - leftWidth - gap * 3;
  const bottomHeight = height - topBand - gap * 3;
  const contextData = getContextData();
  const focusData = getFocusData(contextData);

  svg.attr("viewBox", `0 0 ${width} ${height}`);
  svg.selectAll("*").remove();

  // main dashboard title
  svg.append("text").attr("class", "title").attr("x", gap).attr("y", 24).text("Pokemon stats explorer");
  // filter instructions/status
  svg.append("text").attr("class", "subtitle").attr("x", gap).attr("y", 43).text(getStatusText(contextData, focusData));

  drawHeatmap({ x: gap, y: 58, width: leftWidth, height: topBand - 58, data: pokemon });
  drawScatter({ x: leftWidth + gap * 2, y: 58, width: rightWidth, height: topBand - 58, data: contextData });
  drawParallelCoordinates({ x: gap, y: topBand + gap, width: width - gap * 2, height: bottomHeight, data: focusData, contextData });
}

function getContextData() {
  const base = pokemon.filter(d => selectedTypes.includes(d.type));
  if (!activeCell) return base;
  return base.filter(d => d.type === activeCell.type && d.generation === activeCell.generation);
}

function getFocusData(contextData) {
  if (brushedNumbers.size > 0) return contextData.filter(d => brushedNumbers.has(d.number));
  if (activePokemon) return contextData.filter(d => d.number === activePokemon.number);
  if (!activeCell) return contextData.slice().sort((a, b) => d3.descending(a.total, b.total)).slice(0, defaultFocusCount);
  return contextData;
}

function getStatusText(contextData, focusData) {
  const context = activeCell ? `${activeCell.type} Pokemon from generation ${activeCell.generation}` : "the eight most common primary types";
  const focus = brushedNumbers.size > 0 ? `${focusData.length} brushed Pokemon` : activePokemon ? activePokemon.name : !activeCell ? `top ${focusData.length} by total stats` : `${focusData.length} Pokemon`;
  return `Overview heatmap filters to ${context}; brush or click points to focus the stat comparison (${focus} shown).`;
}

function resetPointFocus() {
  brushedNumbers = new Set();
  activePokemon = null;
}

function isFocused(d) {
  if (brushedNumbers.size > 0) return brushedNumbers.has(d.number);
  return activePokemon && activePokemon.number === d.number;
}

function drawPanel(bounds) {
  // chart background
  svg.append("rect").attr("class", "panel-bg").attr("x", bounds.x).attr("y", bounds.y).attr("width", bounds.width).attr("height", bounds.height).attr("rx", 6);
}

function drawHeatmap(bounds) {
  drawPanel(bounds);

  const margin = { top: 58, right: 22, bottom: 60, left: 76 };
  const innerWidth = bounds.width - margin.left - margin.right;
  const innerHeight = bounds.height - margin.top - margin.bottom;
  const generations = d3.range(1, 7);
  const counts = new Map();

  selectedTypes.forEach(type => {
    generations.forEach(generation => counts.set(`${type}-${generation}`, 0));
  });

  bounds.data.forEach(d => {
    const key = `${d.type}-${d.generation}`;
    if (counts.has(key)) counts.set(key, counts.get(key) + 1);
  });

  const heatData = [];
  selectedTypes.forEach(type => {
    generations.forEach(generation => {
      heatData.push({ type, generation, count: counts.get(`${type}-${generation}`) });
    });
  });

  const x = d3.scaleBand().domain(generations).range([0, innerWidth]).padding(0.04);
  const y = d3.scaleBand().domain(selectedTypes).range([0, innerHeight]).padding(0.04);
  const color = d3.scaleSequential(d3.interpolateYlGnBu).domain([0, d3.max(heatData, d => d.count)]);

  // heatmap group
  const g = svg.append("g").attr("transform", `translate(${bounds.x + margin.left},${bounds.y + margin.top})`);
  // heatmap title
  svg.append("text").attr("class", "title").attr("x", bounds.x + 16).attr("y", bounds.y + 26).text("Overview: count by type and generation");
  // heatmap note
  svg.append("text").attr("class", "subtitle").attr("x", bounds.x + 16).attr("y", bounds.y + 45).text("Click a cell to select a type-generation subset; click it again to reset.");

  // heatmap cells
  g.selectAll(".heat-cell").data(heatData).enter().append("rect").attr("class", d => activeCell && activeCell.type === d.type && activeCell.generation === d.generation ? "heat-cell active" : "heat-cell").attr("x", d => x(d.generation)).attr("y", d => y(d.type)).attr("width", x.bandwidth()).attr("height", y.bandwidth()).attr("fill", "#eef2f7").on("click", d => {
    activeCell = activeCell && activeCell.type === d.type && activeCell.generation === d.generation ? null : { type: d.type, generation: d.generation };
    resetPointFocus();
    drawDashboard();
  }).transition().duration(650).ease(d3.easeCubicOut).attr("fill", d => color(d.count));

  // cell count labels
  g.selectAll(".heat-label").data(heatData).enter().append("text").attr("class", "heat-label").attr("x", d => x(d.generation) + x.bandwidth() / 2).attr("y", d => y(d.type) + y.bandwidth() / 2 + 4).attr("text-anchor", "middle").attr("font-size", "11px").attr("fill", d => d.count > 18 ? "#ffffff" : "#1f2933").attr("opacity", 0).text(d => d.count).transition().duration(650).attr("opacity", 1);

  // generation axis
  g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(x).tickFormat(d => `Gen ${d}`));
  // type axis
  g.append("g").attr("class", "axis").call(d3.axisLeft(y));
  // generation label
  g.append("text").attr("class", "axis-label").attr("x", innerWidth / 2).attr("y", innerHeight + 43).attr("text-anchor", "middle").text("Generation");
  // type label
  g.append("text").attr("class", "axis-label").attr("x", -innerHeight / 2).attr("y", -56).attr("text-anchor", "middle").attr("transform", "rotate(-90)").text("Primary type");

  drawHeatLegend(bounds, color, d3.max(heatData, d => d.count));
}

function drawHeatLegend(bounds, color, maxCount) {
  const legendX = bounds.x + bounds.width - 185;
  const legendY = bounds.y + 18;
  const swatchWidth = 22;

  // heatmap legend title
  svg.append("text").attr("class", "legend-label").attr("x", legendX).attr("y", legendY).text("Count");

  d3.range(5).forEach(i => {
    const value = Math.round((maxCount / 4) * i);
    // legend color block
    svg.append("rect").attr("class", "legend-swatch").attr("x", legendX + 42 + i * swatchWidth).attr("y", legendY - 12).attr("width", swatchWidth).attr("height", 12).attr("fill", color(value));
    // legend number
    svg.append("text").attr("class", "legend-label").attr("x", legendX + 42 + i * swatchWidth).attr("y", legendY + 15).attr("text-anchor", "middle").text(value);
  });
}

function drawScatter(bounds) {
  drawPanel(bounds);

  const margin = { top: 58, right: 22, bottom: 58, left: 62 };
  const innerWidth = bounds.width - margin.left - margin.right;
  const innerHeight = bounds.height - margin.top - margin.bottom;
  const x = d3.scaleLinear().domain(d3.extent(pokemon, d => d.attack)).nice().range([0, innerWidth]);
  const y = d3.scaleLinear().domain(d3.extent(pokemon, d => d.speed)).nice().range([innerHeight, 0]);
  const r = d3.scaleSqrt().domain(d3.extent(pokemon, d => d.total)).range([3, 10]);

  // scatterplot group
  const g = svg.append("g").attr("transform", `translate(${bounds.x + margin.left},${bounds.y + margin.top})`);
  // scatterplot title
  svg.append("text").attr("class", "title").attr("x", bounds.x + 16).attr("y", bounds.y + 26).text("Focus selector: attack, speed, and total");
  // scatterplot note
  svg.append("text").attr("class", "subtitle").attr("x", bounds.x + 16).attr("y", bounds.y + 45).text(`${bounds.data.length} Pokemon shown. Drag a brush to focus; click one point for details.`);
  // light gridlines
  g.append("g").attr("class", "axis").attr("opacity", 0.18).call(d3.axisLeft(y).tickSize(-innerWidth).tickFormat(""));
  // attack axis
  g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(x).ticks(6));
  // speed axis
  g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(6));
  // attack label
  g.append("text").attr("class", "axis-label").attr("x", innerWidth / 2).attr("y", innerHeight + 42).attr("text-anchor", "middle").text("Attack");
  // speed label
  g.append("text").attr("class", "axis-label").attr("x", -innerHeight / 2).attr("y", -45).attr("text-anchor", "middle").attr("transform", "rotate(-90)").text("Speed");

  // pokemon circles
  g.selectAll(".pokemon-dot").data(bounds.data, d => d.number).enter().append("circle").attr("class", d => {
    const focused = isFocused(d);
    const hasFocus = brushedNumbers.size > 0 || activePokemon;
    return `pokemon-dot${focused ? " selected brushed" : ""}${hasFocus && !focused ? " dimmed" : ""}`;
  }).attr("cx", d => x(d.attack)).attr("cy", innerHeight).attr("r", 0).attr("fill", d => typeColors[d.type] || "#68778d").on("click", d => {
    brushedNumbers = new Set();
    activePokemon = activePokemon && activePokemon.number === d.number ? null : d;
    drawDashboard();
  }).transition().duration(750).ease(d3.easeCubicOut).attr("cy", d => y(d.speed)).attr("r", d => r(d.total));

  // pokemon tooltips
  g.selectAll(".pokemon-dot").append("title").text(d => `${d.name}: ${d.type}, Attack ${d.attack}, Speed ${d.speed}, Total ${d.total}`);
  // scatterplot brush
  g.append("g").attr("class", "brush").call(d3.brush().extent([[0, 0], [innerWidth, innerHeight]]).on("end", () => brushed(bounds.data, x, y)));

  drawTypeLegend(bounds.x + 18, bounds.y + bounds.height - 30, bounds.width - 36, bounds.data);
  drawSizeLegend(bounds.x + bounds.width - 175, bounds.y + 38);
  drawDetailCard(bounds, bounds.data);
}

function brushed(data, x, y) {
  const selection = d3.event.selection;

  if (!selection) {
    brushedNumbers = new Set();
    drawDashboard();
    return;
  }

  const [[x0, y0], [x1, y1]] = selection;
  brushedNumbers = new Set(data.filter(d => x0 <= x(d.attack) && x(d.attack) <= x1 && y0 <= y(d.speed) && y(d.speed) <= y1).map(d => d.number));
  activePokemon = null;
  drawDashboard();
}

function drawDetailCard(bounds, data) {
  const selected = activePokemon && data.some(d => d.number === activePokemon.number) ? activePokemon : brushedNumbers.size > 0 ? summarizePokemon(data.filter(d => brushedNumbers.has(d.number))) : null;
  if (!selected) return;

  const x = bounds.x + 18;
  const y = bounds.y + 72;

  // detail name
  svg.append("text").attr("class", "detail-name").attr("x", x).attr("y", y).text(selected.name);
  // detail type
  svg.append("text").attr("class", "detail-value").attr("x", x).attr("y", y + 20).text(selected.type);
  // detail stats
  svg.append("text").attr("class", "detail-value").attr("x", x).attr("y", y + 38).text(`Atk ${selected.attack}, Def ${selected.defense}, Speed ${selected.speed}, Total ${selected.total}`);
}

function summarizePokemon(data) {
  return {
    name: `${data.length} brushed Pokemon`,
    type: "Average selected stats",
    attack: Math.round(d3.mean(data, d => d.attack) || 0),
    defense: Math.round(d3.mean(data, d => d.defense) || 0),
    speed: Math.round(d3.mean(data, d => d.speed) || 0),
    total: Math.round(d3.mean(data, d => d.total) || 0)
  };
}

function drawTypeLegend(x, y, maxWidth, data) {
  const shownTypes = selectedTypes.filter(type => data.some(d => d.type === type));
  const itemWidth = 78;
  const columns = Math.max(1, Math.floor(maxWidth / itemWidth));

  shownTypes.forEach((type, i) => {
    const itemX = x + (i % columns) * itemWidth;
    const itemY = y + Math.floor(i / columns) * 16;
    // type color box
    svg.append("rect").attr("class", "legend-swatch").attr("x", itemX).attr("y", itemY - 10).attr("width", 10).attr("height", 10).attr("fill", typeColors[type]);
    // type label
    svg.append("text").attr("class", "legend-label").attr("x", itemX + 14).attr("y", itemY).text(type);
  });
}

function drawSizeLegend(x, y) {
  const values = [300, 500, 700];
  const radius = d3.scaleSqrt().domain(d3.extent(pokemon, d => d.total)).range([3, 10]);

  // size legend title
  svg.append("text").attr("class", "legend-label").attr("x", x).attr("y", y).text("Total stats");

  values.forEach((value, i) => {
    const cx = x + 12 + i * 48;
    // size legend circle
    svg.append("circle").attr("cx", cx).attr("cy", y + 20).attr("r", radius(value)).attr("fill", "none").attr("stroke", "#52606d").attr("stroke-width", 1);
    // size legend number
    svg.append("text").attr("class", "legend-label").attr("x", cx).attr("y", y + 44).attr("text-anchor", "middle").text(value);
  });
}

function drawParallelCoordinates(bounds) {
  drawPanel(bounds);

  const margin = { top: 58, right: 30, bottom: 36, left: 44 };
  const innerWidth = bounds.width - margin.left - margin.right;
  const innerHeight = bounds.height - margin.top - margin.bottom;
  const x = d3.scalePoint().domain(stats).range([0, innerWidth]).padding(0.4);
  const yScales = {};

  stats.forEach(stat => {
    yScales[stat] = d3.scaleLinear().domain(d3.extent(pokemon, d => getStat(d, stat))).nice().range([innerHeight, 0]);
  });

  const line = d3.line();

  // parallel coordinates group
  const g = svg.append("g").attr("transform", `translate(${bounds.x + margin.left},${bounds.y + margin.top})`);
  // parallel coordinates title
  svg.append("text").attr("class", "title").attr("x", bounds.x + 16).attr("y", bounds.y + 26).text("Advanced focus: six-stat comparison");
  // parallel coordinates note
  svg.append("text").attr("class", "subtitle").attr("x", bounds.x + 16).attr("y", bounds.y + 45).text(activeCell || brushedNumbers.size > 0 || activePokemon ? "Lines animate into the filtered focus set, preserving type colors across views." : `Showing the top ${defaultFocusCount} Pokemon by total stats to keep the overview readable.`);

  // pokemon stat lines
  g.selectAll(".parallel-line").data(bounds.data, d => d.number).enter().append("path").attr("class", "parallel-line").attr("stroke", d => typeColors[d.type] || "#68778d").attr("d", d => line(stats.map(stat => [x(stat), innerHeight]))).attr("opacity", 0).transition().duration(850).ease(d3.easeCubicOut).attr("opacity", 0.36).attr("d", d => line(stats.map(stat => [x(stat), yScales[stat](getStat(d, stat))])));
  // pokemon stat tooltips
  g.selectAll(".parallel-line").append("title").text(d => `${d.name}: HP ${d.hp}, Atk ${d.attack}, Def ${d.defense}, SpA ${d.spAtk}, SpD ${d.spDef}, Speed ${d.speed}`);

  stats.forEach(stat => {
    // stat axis group
    const axis = g.append("g").attr("transform", `translate(${x(stat)},0)`);
    // stat axis
    axis.append("g").attr("class", "axis").call(d3.axisLeft(yScales[stat]).ticks(5));
    // stat label
    axis.append("text").attr("class", "axis-label").attr("x", 0).attr("y", innerHeight + 24).attr("text-anchor", "middle").text(formatStatName(stat));
  });

  // focus count note
  svg.append("text").attr("class", "note").attr("x", bounds.x + bounds.width - 220).attr("y", bounds.y + 45).text(`${bounds.data.length} of ${bounds.contextData.length} context Pokemon in focus`);

  drawTypeLegend(Math.max(bounds.x + 16, bounds.x + bounds.width - 650), bounds.y + 28, 630, bounds.data);
}

function getStat(d, stat) {
  return {
    HP: d.hp,
    Attack: d.attack,
    Defense: d.defense,
    Sp_Atk: d.spAtk,
    Sp_Def: d.spDef,
    Speed: d.speed
  }[stat];
}

function formatStatName(stat) {
  return stat.replace("Sp_Atk", "Sp. Atk").replace("Sp_Def", "Sp. Def");
}
