const TYPE_COLORS = {
  Fire:     "#F08030",
  Water:    "#6890F0",
  Grass:    "#78C850",
  Electric: "#F8D030",
  Ice:      "#98D8D8",
  Fighting: "#C03028",
  Poison:   "#A040A0",
  Ground:   "#E0C068",
  Flying:   "#A890F0",
  Psychic:  "#F85888",
  Bug:      "#A8B820",
  Rock:     "#B8A038",
  Ghost:    "#705898",
  Dragon:   "#7038F8",
  Dark:     "#705848",
  Steel:    "#B8B8D0",
  Fairy:    "#EE99AC",
  Normal:   "#A8A878"
};

// shared state — all views read from here so filter changes propagate
const state = {
  data:         [],
  filtered:     [],
  selectedType: null
};

// cache badge elements so we're not querying the DOM on every filter change
const badgeEl = document.getElementById("filter-badge");
const labelEl = document.getElementById("filter-label");

function updateAll() {
  state.filtered = state.selectedType
    ? state.data.filter(d => d.Type_1 === state.selectedType)
    : state.data;

  updateScatter();
  updateBarHighlight();

  // show/hide the active filter badge in the header
  if (state.selectedType) {
    labelEl.textContent = state.selectedType;
    badgeEl.classList.remove("hidden");
  } else {
    badgeEl.classList.add("hidden");
  }
}

document.getElementById("clear-filter-btn").addEventListener("click", () => {
  state.selectedType = null;
  updateAll();
});

// -------------------------------------------------------------------
// VIEW 1: Bar chart — overview of pokemon count by primary type
// -------------------------------------------------------------------

let barSvg, barXScale, barYScale, barInnerW, barInnerH, barMargin;

function drawBar() {
  const container = document.getElementById("chart-bar");
  const { width, height } = container.getBoundingClientRect();

  // 28px accounts for the panel title height
  barMargin = { top: 20, right: 16, bottom: 110, left: 50 };
  barInnerW  = width          - barMargin.left - barMargin.right;
  barInnerH  = (height - 28) - barMargin.top  - barMargin.bottom;

  // rollup counts pokemon per type, then sort highest to lowest
  const typeCounts = Array.from(
    d3.rollup(state.data, v => v.length, d => d.Type_1),
    ([type, count]) => ({ type, count })
  ).sort((a, b) => b.count - a.count);

  // x: one band per type
  barXScale = d3.scaleBand()
    .domain(typeCounts.map(d => d.type))
    .range([0, barInnerW])
    .padding(0.25);

  // y: count → pixel height
  barYScale = d3.scaleLinear()
    .domain([0, d3.max(typeCounts, d => d.count)])
    .range([barInnerH, 0])
    .nice();

  d3.select("#chart-bar svg").remove();

  // root svg + inner group offset by margins
  barSvg = d3.select("#chart-bar")
    .append("svg")
    .attr("width",  width)
    .attr("height", height - 28)
    .append("g")
    .attr("transform", `translate(${barMargin.left},${barMargin.top})`);

  // x axis with rotated labels so type names don't overlap
  barSvg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${barInnerH})`)
    .call(d3.axisBottom(barXScale))
    .selectAll("text")
      .attr("transform", "rotate(-45)")
      .attr("text-anchor", "end")
      .attr("dx", "-0.4em")
      .attr("dy", "0.15em")
      .style("fill", "#7b7f9e")
      .style("font-size", "11px");

  // x axis label
  barSvg.append("text")
    .attr("class", "axis-label")
    .attr("x", barInnerW / 2)
    .attr("y", barInnerH + barMargin.bottom - 4)
    .attr("text-anchor", "middle")
    .text("Primary Type");

  // y axis with dashed gridlines spanning the full chart width
  barSvg.append("g")
    .attr("class", "y-axis")
    .call(
      d3.axisLeft(barYScale)
        .ticks(6)
        .tickSize(-barInnerW)
    )
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick line")
      .style("stroke", "#2e3148")
      .style("stroke-dasharray", "3,3"));

  // y axis label
  barSvg.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -(barInnerH / 2))
    .attr("y", -38)
    .attr("text-anchor", "middle")
    .text("Number of Pokémon");

  // one bar per type, colored by type
  barSvg.selectAll("rect.bar")
    .data(typeCounts)
    .join("rect")
      .attr("class", "bar")
      .attr("x",      d => barXScale(d.type))
      .attr("y",      d => barYScale(d.count))
      .attr("width",  barXScale.bandwidth())
      .attr("height", d => barInnerH - barYScale(d.count))
      .attr("fill",   d => TYPE_COLORS[d.type] || "#888")
      .attr("rx", 2)
      .style("cursor", "pointer")
      // clicking a bar toggles the type filter
      .on("click", (event, d) => {
        state.selectedType = state.selectedType === d.type ? null : d.type;
        updateAll();
      });

  // count label above each bar
  barSvg.selectAll("text.bar-label")
    .data(typeCounts)
    .join("text")
      .attr("class", "bar-label")
      .attr("x", d => barXScale(d.type) + barXScale.bandwidth() / 2)
      .attr("y", d => barYScale(d.count) - 4)
      .attr("text-anchor", "middle")
      .style("fill", "#7b7f9e")
      .style("font-size", "9px")
      .text(d => d.count);

  updateBarHighlight();
}

// dims non-selected bars and outlines the active one
function updateBarHighlight() {
  if (!barSvg) return;

  barSvg.selectAll("rect.bar")
    .transition().duration(300)
    .attr("opacity", d =>
      !state.selectedType || d.type === state.selectedType ? 1 : 0.25
    )
    .attr("stroke",       d => d.type === state.selectedType ? "#fff" : "none")
    .attr("stroke-width", d => d.type === state.selectedType ? 2 : 0);
}

// -------------------------------------------------------------------
// VIEW 2: Scatter plot — attack vs defense, colored by type
// -------------------------------------------------------------------

let scatterSvgG, scatterXScale, scatterYScale, scatterInnerW, scatterInnerH;

const tooltip = d3.select("#tooltip");

function drawScatter() {
  const container = document.getElementById("chart-scatter");
  const { width, height } = container.getBoundingClientRect();
  const margin = { top: 20, right: 120, bottom: 50, left: 52 };
  scatterInnerW = width          - margin.left - margin.right;
  scatterInnerH = (height - 28) - margin.top  - margin.bottom;

  d3.select("#chart-scatter svg").remove();

  const svg = d3.select("#chart-scatter")
    .append("svg")
    .attr("width",  width)
    .attr("height", height - 28);

  scatterSvgG = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // x: attack, y: defense — fixed domains so axes don't shift on filter
  scatterXScale = d3.scaleLinear().domain([0, 220]).range([0, scatterInnerW]);
  scatterYScale = d3.scaleLinear().domain([0, 240]).range([scatterInnerH, 0]);

  // horizontal gridlines
  scatterSvgG.append("g")
    .attr("class", "grid")
    .call(
      d3.axisLeft(scatterYScale)
        .ticks(6)
        .tickSize(-scatterInnerW)
        .tickFormat("")
    )
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick line")
      .style("stroke", "#2e3148")
      .style("stroke-dasharray", "3,3"));

  // x axis
  scatterSvgG.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${scatterInnerH})`)
    .call(d3.axisBottom(scatterXScale).ticks(8));

  // y axis
  scatterSvgG.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(scatterYScale).ticks(6));

  // axis labels
  scatterSvgG.append("text")
    .attr("class", "axis-label")
    .attr("x", scatterInnerW / 2)
    .attr("y", scatterInnerH + 42)
    .attr("text-anchor", "middle")
    .text("Attack");

  scatterSvgG.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -(scatterInnerH / 2))
    .attr("y", -40)
    .attr("text-anchor", "middle")
    .text("Defense");

  // legend explaining dot size encoding
  const legend = scatterSvgG.append("g")
    .attr("transform", `translate(${scatterInnerW + 8}, 10)`);

  legend.append("text")
    .attr("x", 0).attr("y", 0)
    .style("fill", "#7b7f9e").style("font-size", "10px").style("font-weight", "600")
    .text("LEGEND");

  // regular pokemon dot
  legend.append("circle")
    .attr("cx", 7).attr("cy", 18).attr("r", 4)
    .attr("fill", "#7b7f9e");
  legend.append("text")
    .attr("x", 16).attr("y", 22)
    .style("fill", "#7b7f9e").style("font-size", "10px")
    .text("Regular");

  // legendary pokemon dot (larger, white outline)
  legend.append("circle")
    .attr("cx", 7).attr("cy", 38).attr("r", 6)
    .attr("fill", "#7b7f9e")
    .attr("stroke", "#fff").attr("stroke-width", 1.5);
  legend.append("text")
    .attr("x", 16).attr("y", 42)
    .style("fill", "#7b7f9e").style("font-size", "10px")
    .text("Legendary");

  updateScatter();
}

function updateScatter() {
  if (!scatterSvgG) return;

  // bind filtered data, keyed by pokedex number for stable enter/exit
  scatterSvgG.selectAll("circle.dot")
    .data(state.filtered, d => d.Number)
    .join(
      enter => enter.append("circle")
        .attr("class", "dot")
        .attr("cx", d => scatterXScale(d.Attack))
        .attr("cy", d => scatterYScale(d.Defense))
        .attr("r",            d => d.isLegendary ? 6 : 4)
        .attr("fill",         d => TYPE_COLORS[d.Type_1] || "#888")
        .attr("stroke",       d => d.isLegendary ? "#fff" : "none")
        .attr("stroke-width", d => d.isLegendary ? 1.5 : 0)
        .attr("opacity", 0)
        .style("cursor", "pointer")
        .on("mouseover", (event, d) => {
          // show stat tooltip on hover
          tooltip.classed("hidden", false)
            .html(`
              <strong>${d.Name}</strong><br>
              Type: ${d.Type_1}${d.Type_2 ? " / " + d.Type_2 : " / —"}<br>
              HP: ${d.HP} &nbsp; Atk: ${d.Attack} &nbsp; Def: ${d.Defense}<br>
              Sp.Atk: ${d.Sp_Atk} &nbsp; Sp.Def: ${d.Sp_Def} &nbsp; Spd: ${d.Speed}
              ${d.isLegendary ? "<br><strong>★ Legendary</strong>" : ""}
            `);
        })
        .on("mousemove", event => {
          tooltip
            .style("left", (event.clientX + 14) + "px")
            .style("top",  (event.clientY - 28) + "px");
        })
        .on("mouseleave", () => tooltip.classed("hidden", true))
        .call(enter => enter.transition().duration(400).attr("opacity", 0.7)),

      // on filter change, fade non-matching dots and brighten matching ones
      update => update
        .transition().duration(400)
        .attr("opacity", d =>
          !state.selectedType ? 0.7
          : d.Type_1 === state.selectedType ? 0.85
          : 0.08
        ),

      exit => exit.transition().duration(400).attr("opacity", 0).remove()
    );
}

// -------------------------------------------------------------------
// load data and kick off all views
// -------------------------------------------------------------------

d3.csv("data/pokemon.csv").then(rawData => {

  // d3 reads everything as strings — convert numeric columns
  rawData.forEach(d => {
    d.HP         = +d.HP;
    d.Attack     = +d.Attack;
    d.Defense    = +d.Defense;
    d.Sp_Atk     = +d.Sp_Atk;
    d.Sp_Def     = +d.Sp_Def;
    d.Speed      = +d.Speed;
    d.Total      = +d.Total;
    d.Generation = +d.Generation;
    d.Number     = +d.Number;
    d.isLegendary = d.isLegendary.toLowerCase() === "true";
  });

  state.data     = rawData;
  state.filtered = rawData;

  drawBar();
  drawScatter();

}).catch(err => console.error("Failed to load pokemon.csv:", err));
