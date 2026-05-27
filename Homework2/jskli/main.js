// Global variables store the full dataset and color scale so all views can update together.
let pokemonData = [];
let typeColorScale;

// These are the numeric Pokemon stats used in the scatter plot and parallel coordinates plot.
const statColumns = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];

// This column represents the main Pokemon category used across all three views.
const typeColumn = "Type_1";

// Official Pokemon type colors used consistently across all dashboard views.
const typeColors = {
  Water: "#6390F0",
  Normal: "#A8A77A",
  Grass: "#7AC74C",
  Bug: "#A6B91A",
  Fire: "#EE8130",
  Psychic: "#F95587",
  Rock: "#B6A136",
  Electric: "#F7D02C",
  Ground: "#E2BF65",
  Poison: "#A33EA1",
  Dark: "#705746",
  Fighting: "#C22E28",
  Dragon: "#6F35FC",
  Ghost: "#735797",
  Ice: "#96D9D6",
  Steel: "#B7B7CE",
  Fairy: "#D685AD",
  Flying: "#A98FF3"
};

// This loads the Pokemon CSV file from the local data folder.
d3.csv("data/pokemon.csv").then(function(data) {
  // Convert numeric stat columns from strings into numbers.
  data.forEach(function(d) {
    d.HP = +d.HP;
    d.Attack = +d.Attack;
    d.Defense = +d.Defense;
    d.Sp_Atk = +d.Sp_Atk;
    d.Sp_Def = +d.Sp_Def;
    d.Speed = +d.Speed;
    d.Total = +d.Total;
});

  pokemonData = data;

  // Create a sorted list of all primary Pokemon types.
  const types = Array.from(new Set(data.map(d => d[typeColumn]))).sort();

// Create one consistent categorical color scale using Pokemon type colors.
    typeColorScale = d3.scaleOrdinal()
    .domain(types)
    .range(types.map(type => typeColors[type] || "#999999"));

  // Add each Pokemon type as an option in the dropdown filter.
  d3.select("#type-filter")
    .selectAll("option.type-option")
    .data(types)
    .enter()
    .append("option")
    .attr("class", "type-option")
    .attr("value", d => d)
    .text(d => d);

  // Draw all dashboard views using the full dataset at first.
  updateDashboard("All");

  // Update all three views whenever the user selects a type from the dropdown.
  d3.select("#type-filter").on("change", function() {
    updateDashboard(this.value);
  });

  // Redraw all charts when the browser size changes so the dashboard remains responsive.
  window.addEventListener("resize", function() {
    updateDashboard(d3.select("#type-filter").property("value"));
  });
});

// This function filters the data and redraws all three dashboard views.
function updateDashboard(selectedType) {
  const filteredData = selectedType === "All"
    ? pokemonData
    : pokemonData.filter(d => d[typeColumn] === selectedType);

  drawBarChart(pokemonData, selectedType);
  drawScatterPlot(filteredData);
  drawParallelCoordinates(filteredData);
}

// This helper returns the best available Pokemon name column.
function getPokemonName(d) {
  return d.Name || d.name || d.Pokemon || "Unknown";
}

// This helper shows a tooltip near the mouse pointer.
function showTooltip(event, html) {
  d3.select("#tooltip")
    .style("opacity", 1)
    .style("left", event.pageX + 12 + "px")
    .style("top", event.pageY + 12 + "px")
    .html(html);
}

// This helper hides the tooltip.
function hideTooltip() {
  d3.select("#tooltip").style("opacity", 0);
}

function showFullLegendPopup(event, types, popupMode) {
  // Build the full legend HTML shown inside the floating tooltip.
  const legendHTML = types.map(function(type) {
    return `
      <div class="legend-popup-row">
        <span class="legend-popup-color" style="background:${typeColorScale(type)}"></span>
        <span>${type}</span>
      </div>
    `;
  }).join("");

  // D3: Select the shared tooltip div and fill it with the full Pokemon type legend.
  const tooltip = d3.select("#tooltip");

  tooltip
    .style("opacity", 1)
    .html(`
      <b>Pokemon Type Legend</b>
      <div class="legend-popup">
        ${legendHTML}
      </div>
    `);

  // Measure the popup after its HTML is inserted.
  const popupWidth = tooltip.node().offsetWidth;
  const popupHeight = tooltip.node().offsetHeight;

  let left;
  let top;

  if (popupMode === "parallel") {
    // D3: For the parallel coordinates legend, place the popup above-left
    // so it overlaps the bar chart area instead of going offscreen.
    left = event.pageX - popupWidth - 120;
    top = event.pageY - popupHeight - 80;
    } else {
    // D3: For the scatterplot legend, shift only the popup 100px to the right.
    left = event.pageX - popupWidth + 80;
    top = event.pageY + 12;
}
  

  // Keep the popup inside the visible browser window.
  left = Math.max(10, Math.min(left, window.scrollX + window.innerWidth - popupWidth - 10));
  top = Math.max(10, Math.min(top, window.scrollY + window.innerHeight - popupHeight - 10));

  tooltip
    .style("left", left + "px")
    .style("top", top + "px");
}

function drawBarChart(data, selectedType) {
  const svg = d3.select("#bar-chart");

  // Clear old D3 elements before redrawing the responsive chart.
  svg.selectAll("*").remove();

  const width = svg.node().clientWidth;
  const height = svg.node().clientHeight;
  const margin = { top: 10, right: 20, bottom: 55, left: 55 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Count how many Pokemon belong to each primary type.
  const counts = d3.rollups(
    data,
    v => v.length,
    d => d[typeColumn]
  ).map(([type, count]) => ({ type, count }));

  counts.sort((a, b) => d3.descending(a.count, b.count));

  // Create a group that holds all bar chart marks inside the chart margins.
  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Create a band scale where each Pokemon type receives one x-position.
  const x = d3.scaleBand()
    .domain(counts.map(d => d.type))
    .range([0, innerWidth])
    .padding(0.18);

  // Create a linear y-scale where taller bars represent more Pokemon.
  const y = d3.scaleLinear()
    .domain([0, d3.max(counts, d => d.count)])
    .nice()
    .range([innerHeight, 0]);

  // Draw one rectangle bar for each Pokemon type.
  g.selectAll("rect")
    .data(counts)
    .enter()
    .append("rect")
    .attr("x", d => x(d.type))
    .attr("y", d => y(d.count))
    .attr("width", x.bandwidth())
    .attr("height", d => innerHeight - y(d.count))
    .attr("fill", d => typeColorScale(d.type))
    .attr("opacity", d => selectedType === "All" || selectedType === d.type ? 1 : 0.25)
    .on("mouseover", function(event, d) {
      showTooltip(event, `<b>${d.type}</b><br>Pokemon Count: ${d.count}`);
    })
    .on("mouseout", hideTooltip);

  // Add the x-axis to label each Pokemon type.
  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-35)")
    .style("text-anchor", "end");

  // Add the y-axis to show the count scale.
  g.append("g")
    .call(d3.axisLeft(y).ticks(5));

  // Add a y-axis label that explains the bar height encoding.
  g.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -40)
    .attr("text-anchor", "middle")
    .text("Number of Pokemon");

  // Add a short annotation explaining how this overview connects to the filter.
  g.append("text")
    .attr("class", "axis-label")
    .attr("x", innerWidth - 5)
    .attr("y", 12)
    .attr("text-anchor", "end")
    .text("Overview by primary type");
}

function drawScatterPlot(data) {
  const svg = d3.select("#scatter-plot");

  // Clear old D3 elements before redrawing the responsive chart.
  svg.selectAll("*").remove();

  const width = svg.node().clientWidth;
  const height = svg.node().clientHeight;
  const margin = { top: 15, right: 115, bottom: 50, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Create a group that holds all scatter plot marks inside the chart margins.
  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Create a linear x-scale where farther right means higher Attack.
  const x = d3.scaleLinear()
    .domain([0, d3.max(pokemonData, d => d.Attack)])
    .nice()
    .range([0, innerWidth]);

  // Create a linear y-scale where higher up means higher Defense.
  const y = d3.scaleLinear()
    .domain([0, d3.max(pokemonData, d => d.Defense)])
    .nice()
    .range([innerHeight, 0]);

  // Draw one circle for each Pokemon to compare Attack and Defense.
  g.selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("class", "scatter-dot")
    .attr("cx", d => x(d.Attack))
    .attr("cy", d => y(d.Defense))
    .attr("r", 4)
    .attr("fill", d => typeColorScale(d[typeColumn]))
    .on("mouseover", function(event, d) {
      showTooltip(
        event,
        `<b>${getPokemonName(d)}</b><br>
         Type: ${d[typeColumn]}<br>
         Attack: ${d.Attack}<br>
         Defense: ${d.Defense}`
      );
    })
    .on("mouseout", hideTooltip);

  // Add the x-axis for Attack values.
  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(6));

  // Add the y-axis for Defense values.
  g.append("g")
    .call(d3.axisLeft(y).ticks(6));

  // Add an x-axis label explaining the horizontal position encoding.
  g.append("text")
    .attr("class", "axis-label")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 40)
    .attr("text-anchor", "middle")
    .text("Attack");

  // Add a y-axis label explaining the vertical position encoding.
  g.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -42)
    .attr("text-anchor", "middle")
    .text("Defense");

  // Create a compact legend showing the color encoding for Pokemon types.
  drawLegend(svg, innerWidth + margin.left - 85, margin.top);
}

function drawParallelCoordinates(data) {
  const svg = d3.select("#parallel-coordinates");

  // Clear old D3 elements before redrawing the responsive chart.
  svg.selectAll("*").remove();

  const width = svg.node().clientWidth;
  const height = svg.node().clientHeight;
  const margin = { top: 50, right: 30, bottom: 35, left: 35 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Limit the number of lines when all Pokemon are selected to reduce visual clutter.
  const displayedData = data.length > 180 ? data.slice(0, 180) : data;

  // Create a group that holds all parallel coordinate marks inside the chart margins.
  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Create an x-scale that positions each stat as a vertical axis.
  const x = d3.scalePoint()
    .domain(statColumns)
    .range([0, innerWidth])
    .padding(0.35);

  // Create a separate y-scale for each stat because each axis uses numeric values.
  const yScales = {};
  statColumns.forEach(function(stat) {
    yScales[stat] = d3.scaleLinear()
      .domain([0, d3.max(pokemonData, d => d[stat])])
      .nice()
      .range([innerHeight, 0]);
  });

  // Draw one connected line per Pokemon to show its full stat profile.
  g.selectAll("path.profile")
    .data(displayedData)
    .enter()
    .append("path")
    .attr("class", "parallel-line")
    .attr("d", function(d) {
      return d3.line()
        .x(stat => x(stat))
        .y(stat => yScales[stat](d[stat]))(statColumns);
    })
    .attr("stroke", d => typeColorScale(d[typeColumn]))
    .attr("stroke-width", 1.4)
    .on("mouseover", function(event, d) {
      d3.select(this).attr("stroke-width", 3).attr("opacity", 1);

      showTooltip(
        event,
        `<b>${getPokemonName(d)}</b><br>
        Type: ${d[typeColumn]}<br>
        HP: ${d.HP}<br>
        Attack: ${d.Attack}<br>
        Defense: ${d.Defense}<br>
        Sp_Atk: ${d.Sp_Atk}<br>
        Sp_Def: ${d.Sp_Def}<br>
        Speed: ${d.Speed}`
        );
    })
    .on("mouseout", function() {
      d3.select(this).attr("stroke-width", 1.4).attr("opacity", 0.32);
      hideTooltip();
    });


  // Draw one vertical axis for each stat in the parallel coordinates plot.
  statColumns.forEach(function(stat) {
  const axisGroup = g.append("g")
    .attr("transform", `translate(${x(stat)},0)`);

  // Add a y-axis for this specific Pokemon stat.
  axisGroup.call(d3.axisLeft(yScales[stat]).ticks(4));

  // Add a stat label below each vertical axis.
  axisGroup.append("text")
    .attr("class", "axis-label")
    .attr("x", 0)
    .attr("y", innerHeight + 24)
    .attr("text-anchor", "middle")
    .text(stat);
});

// Create a compact legend for the parallel coordinates color encoding.
drawParallelLegend(svg, width - 20,4);

  // Add a note under the parallel coordinates title, above the plot area.
    if (data.length > 180) {
    svg.append("text")
        .attr("class", "axis-label")
        .attr("x", 5)
        .attr("y", 22)
        .attr("text-anchor", "start")
        .style("font-size", "13px")
        .text("Showing first 180 Pokemon to reduce clutter");
    }
}
function drawLegend(svg, xPosition, yPosition) {
  // Select all Pokemon types from the shared color scale.
  const types = typeColorScale.domain();

  // Only show the first few types directly to avoid covering the chart.
  const visibleTypes = types.slice(0, 5);
  const hiddenTypes = types.slice(5);

  // Create a compact legend group that explains the color encoding.
  const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${xPosition},${yPosition})`);

  // Add a small white background so the compact legend is readable over chart marks.
  legend.append("rect")
    .attr("x", -8)
    .attr("y", -12)
    .attr("width", 125)
    .attr("height", 118)
    .attr("rx", 6)
    .attr("fill", "white")
    .attr("opacity", 0.88)
    .attr("stroke", "#cccccc");

  // Use one vertical column for the compact scatterplot legend.
  const rowHeight = 17;

  // Draw only a few visible legend items.
  const legendItems = legend.selectAll("g.legend-item")
    .data(visibleTypes)
    .enter()
    .append("g")
    .attr("class", "legend-item")
    .attr("transform", function(d, i) {
      return `translate(0,${i * rowHeight})`;
    });

  // Draw the colored square for each visible Pokemon type.
  legendItems.append("rect")
    .attr("width", 10)
    .attr("height", 10)
    .attr("fill", d => typeColorScale(d));

  // Add the type name next to each visible colored square.
  legendItems.append("text")
    .attr("x", 14)
    .attr("y", 9)
    .text(d => d);

  // Add a "+ more types" label that opens a full legend on hover.
  const moreText = legend.append("text")
    .attr("class", "more-types")
    .attr("x", 0)
    .attr("y", visibleTypes.length * rowHeight + 12)
    .style("font-weight", "bold")
    .style("cursor", "pointer")
    .text(`+ ${hiddenTypes.length} more types`);

  // Show the full legend as a popup when hovering over "+ more types".
  moreText.on("mouseover", function(event) {
    showFullLegendPopup(event, types, "scatter");
 });

  // Hide the full legend popup when the mouse leaves "+ more types".
  moreText.on("mouseout", function() {
    hideTooltip();
  });
}

function drawParallelLegend(svg, rightEdge, yPosition) {
  // D3: Get the full list of Pokemon types from the shared color scale domain.
  const types = typeColorScale.domain();

  // D3/data preparation: Split the legend into visible types and hidden types.
  const visibleTypes = types.slice(0, 5);
  const hiddenTypes = types.slice(5);

  // Layout constants for spacing each legend item horizontally.
  const itemWidth = 78;
  const rowHeight = 18;
  const totalWidth = visibleTypes.length * itemWidth;

  // D3: Append a new SVG group to hold the parallel coordinates legend.
  const legend = svg.append("g")
    .attr("class", "parallel-legend")
    .attr("transform", `translate(${rightEdge - totalWidth},${yPosition})`);

  // D3: Add a white rounded rectangle behind the legend so the text stays readable.
  legend.append("rect")
    .attr("x", -10)
    .attr("y", -8)
    .attr("width", totalWidth + 20)
    .attr("height", 44)
    .attr("rx", 6)
    .attr("fill", "white")
    .attr("opacity", 0.9)
    .attr("stroke", "#cccccc");

  // D3: Bind the visible Pokemon types to legend item groups.
  const legendItems = legend.selectAll("g.parallel-legend-item")
    .data(visibleTypes)
    .enter()
    .append("g")
    .attr("class", "parallel-legend-item")
    .attr("transform", function(d, i) {
      // Position items right-to-left so they fill the empty space above the chart.
      const x = totalWidth - (i + 1) * itemWidth;
      return `translate(${x},0)`;
    });

  // D3: Add a colored square for each visible type using the shared type color scale.
  legendItems.append("rect")
    .attr("width", 10)
    .attr("height", 10)
    .attr("fill", d => typeColorScale(d));

  // D3: Add the type name next to each colored square.
  legendItems.append("text")
    .attr("x", 14)
    .attr("y", 9)
    .style("font-size", "11px")
    .text(d => d);

  // D3: Add a hoverable text label showing how many extra types are hidden.
  const moreText = legend.append("text")
    .attr("class", "more-types")
    .attr("x", totalWidth - 4)
    .attr("y", rowHeight + 6)
    .attr("text-anchor", "end")
    .style("font-size", "11px")
    .style("font-weight", "bold")
    .style("cursor", "pointer")
    .text(`+ ${hiddenTypes.length} more types`);

  // D3 event handler: Show the full Pokemon type legend when the user hovers.
  moreText.on("mouseover", function(event) {
    showFullLegendPopup(event, types, "parallel");
  });

  // D3 event handler: Hide the full Pokemon type legend when the mouse leaves.
  moreText.on("mouseout", function() {
    hideTooltip();
  });
}