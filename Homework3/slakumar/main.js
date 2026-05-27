const W = window.innerWidth;
const H = window.innerHeight;

const BAR = {
  left: 0, top: 0,
  w: W, h: H * 0.30,
  margin: { top: 50, right: 30, bottom: 60, left: 80 }
};
const HEAT = {
  left: 0, top: H * 0.32,
  w: W * 0.52, h: H * 0.63,
  margin: { top: 50, right: 20, bottom: 100, left: 130 }
};
const PARA = {
  left: W * 0.54, top: H * 0.32,
  w: W * 0.46, h: H * 0.63,
  margin: { top: 50, right: 40, bottom: 60, left: 40 }
};

const MENTAL = ["Anxiety", "Depression", "Insomnia", "OCD"];
const COLOR_BAR = "#6c8ebf";
const COLOR_BAR_SELECTED = "#e07b54"; // highlighted color when brushed
const COLOR_PARA = ["#e07b54", "#6c8ebf", "#74b87a", "#c97bbf"];

// We'll store these so update functions can access them
let globalData = [];
let barX, barData, barG;
let heatG, heatX, heatY, heatColor;
let paraG, paraX, paraYScales, paraColorScale, paraDims, paraSample;
let selectedServices = null; 

d3.csv("mxmh_survey_results.csv").then(raw => {
  raw.forEach(d => {
    d["Hours per day"] = +d["Hours per day"];
    d["Anxiety"]       = +d["Anxiety"];
    d["Depression"]    = +d["Depression"];
    d["Insomnia"]      = +d["Insomnia"];
    d["OCD"]           = +d["OCD"];
    d["Age"]           = +d["Age"];
  });

  globalData = raw;
  const svg = d3.select("svg");

  drawBar(svg, raw);
  drawHeatmap(svg, raw);
  drawParallel(svg, raw);
});


// CHART 1: BAR CHART (with brush) 

function drawBar(svg, data) {
  const { left, top, w, h, margin } = BAR;
  const iw = w - margin.left - margin.right;
  const ih = h - margin.top - margin.bottom;

  barG = svg.append("g")
    .attr("transform", `translate(${left + margin.left}, ${top + margin.top})`);

  barG.append("text")
    .attr("x", iw / 2).attr("y", -20)
    .attr("text-anchor", "middle")
    .attr("font-size", "15px").attr("font-weight", "bold")
    .text("Overview: Respondents by Primary Streaming Service (brush to filter)");

  const counts = d3.rollup(data, v => v.length, d => d["Primary streaming service"]);
  barData = Array.from(counts, ([service, count]) => ({ service, count }))
    .filter(d => d.service && d.service.trim() !== "")
    .sort((a, b) => b.count - a.count);

  barX = d3.scaleBand()
    .domain(barData.map(d => d.service))
    .range([0, iw]).padding(0.25);

  const y = d3.scaleLinear()
    .domain([0, d3.max(barData, d => d.count)]).nice()
    .range([ih, 0]);

  barG.append("g")
    .attr("transform", `translate(0,${ih})`)
    .call(d3.axisBottom(barX))
    .selectAll("text")
      .attr("transform", "rotate(-25)")
      .attr("text-anchor", "end")
      .attr("dx", "-0.4em").attr("dy", "0.6em")
      .attr("font-size", "12px");

  barG.append("g").call(d3.axisLeft(y).ticks(5));

  barG.append("text")
    .attr("x", iw / 2).attr("y", ih + 55)
    .attr("text-anchor", "middle").attr("font-size", "12px")
    .text("Streaming Service");

  barG.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -ih / 2).attr("y", -55)
    .attr("text-anchor", "middle").attr("font-size", "12px")
    .text("Number of Respondents");

  barG.selectAll("rect.bar").data(barData).join("rect")
    .attr("class", "bar")
    .attr("x", d => barX(d.service))
    .attr("y", d => y(d.count))
    .attr("width", barX.bandwidth())
    .attr("height", d => ih - y(d.count))
    .attr("fill", COLOR_BAR)
    .attr("rx", 3);

  barG.selectAll(".bar-label").data(barData).join("text")
    .attr("class", "bar-label")
    .attr("x", d => barX(d.service) + barX.bandwidth() / 2)
    .attr("y", d => y(d.count) - 4)
    .attr("text-anchor", "middle")
    .attr("font-size", "11px")
    .attr("fill", "#333")
    .text(d => d.count);

  // ADD BRUSH 
  // brushX - drag horizontally to select bars
  const brush = d3.brushX()
    .extent([[0, 0], [iw, ih]])
    .on("end", onBrushEnd);

  barG.append("g")
    .attr("class", "brush")
    .call(brush);
}

// Called when the user finishes brushing on the bar chart
function onBrushEnd(event) {
  // If user clicks without dragging, clear the selection
  if (!event.selection) {
    selectedServices = null;
    // Reset all bars to original color
    barG.selectAll("rect.bar")
      .transition().duration(300)
      .attr("fill", COLOR_BAR);
    updateHeatmap(globalData);
    updateParallel(globalData);
    return;
  }

  const [x0, x1] = event.selection;

  // Find which services fall inside brushed range
  selectedServices = barData
    .filter(d => {
      const barMid = barX(d.service) + barX.bandwidth() / 2;
      return barMid >= x0 && barMid <= x1;
    })
    .map(d => d.service);

  // Highlight selected bars, dim rest
  barG.selectAll("rect.bar")
    .transition().duration(300)
    .attr("fill", d => selectedServices.includes(d.service) ? COLOR_BAR_SELECTED : "#ccc");

  // Filter full dataset to only people who use selected services
  const filtered = globalData.filter(d =>
    selectedServices.includes(d["Primary streaming service"])
  );

  updateHeatmap(filtered);
  updateParallel(filtered);
}


// CHART 2: HEATMAP (with update function) 

function drawHeatmap(svg, data) {
  const { left, top, w, h, margin } = HEAT;
  const iw = w - margin.left - margin.right;
  const ih = h - margin.top - margin.bottom;

  heatG = svg.append("g")
    .attr("transform", `translate(${left + margin.left}, ${top + margin.top})`);

  heatG.append("text")
    .attr("x", iw / 2).attr("y", -20)
    .attr("text-anchor", "middle")
    .attr("font-size", "15px").attr("font-weight", "bold")
    .text("Avg Mental Health Score by Favorite Genre");

  const genres = Array.from(new Set(data.map(d => d["Fav genre"]))).filter(Boolean).sort();

  heatX = d3.scaleBand().domain(MENTAL).range([0, iw]).padding(0.05);
  heatY = d3.scaleBand().domain(genres).range([0, ih]).padding(0.05);

  heatColor = d3.scaleSequential()
    .domain([0, 10])
    .interpolator(d3.interpolateYlOrRd);

  heatG.append("g").attr("class", "x-axis").call(d3.axisTop(heatX))
    .selectAll("text").attr("font-size", "12px");

  heatG.append("g").attr("class", "y-axis").call(d3.axisLeft(heatY))
    .selectAll("text").attr("font-size", "11px");

  heatG.append("text")
    .attr("x", iw / 2).attr("y", ih + 30)
    .attr("text-anchor", "middle").attr("font-size", "12px")
    .text("Mental Health Condition");

  heatG.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -ih / 2).attr("y", -115)
    .attr("text-anchor", "middle").attr("font-size", "12px")
    .text("Favorite Genre");

  // Draw initial cells
  _renderHeatCells(data);

  // Legend
  const legendW = iw * 0.7, legendH = 12;
  const legendX = iw * 0.15, legendY = ih + 50;

  const defs = svg.append("defs");
  const grad = defs.append("linearGradient").attr("id", "heatLegend");
  grad.append("stop").attr("offset", "0%").attr("stop-color", heatColor(0));
  grad.append("stop").attr("offset", "100%").attr("stop-color", heatColor(10));

  heatG.append("rect")
    .attr("x", legendX).attr("y", legendY)
    .attr("width", legendW).attr("height", legendH)
    .style("fill", "url(#heatLegend)");

  heatG.append("text").attr("x", legendX).attr("y", legendY + 26)
    .attr("font-size", "10px").text("0 (low)");
  heatG.append("text").attr("x", legendX + legendW).attr("y", legendY + 26)
    .attr("font-size", "10px").attr("text-anchor", "end").text("10 (high)");
  heatG.append("text").attr("x", legendX + legendW / 2).attr("y", legendY - 4)
    .attr("font-size", "10px").attr("text-anchor", "middle").text("Score");
}

// Renders heatmap cells with fade transition
function _renderHeatCells(data) {
  const genres = Array.from(new Set(data.map(d => d["Fav genre"]))).filter(Boolean).sort();

  const heatData = [];
  genres.forEach(genre => {
    MENTAL.forEach(cond => {
      const vals = data.filter(d => d["Fav genre"] === genre).map(d => d[cond]);
      const avg = d3.mean(vals);
      heatData.push({ genre, condition: cond, value: avg });
    });
  });

  // FADE TRANSITION: fade old cells out, then draw new ones
  heatG.selectAll("rect.cell")
    .transition().duration(400)
    .attr("opacity", 0)
    .remove();

  heatG.selectAll("text.cell-val")
    .transition().duration(400)
    .attr("opacity", 0)
    .remove();

  setTimeout(() => {
    heatG.selectAll("rect.cell").data(heatData).join("rect")
      .attr("class", "cell")
      .attr("x", d => heatX(d.condition))
      .attr("y", d => heatY(d.genre))
      .attr("width", heatX.bandwidth())
      .attr("height", heatY.bandwidth())
      .attr("fill", d => heatColor(d.value))
      .attr("rx", 2)
      .attr("opacity", 0)
      .transition().duration(400)
      .attr("opacity", 1); // fade new cells in

    heatG.selectAll("text.cell-val").data(heatData).join("text")
      .attr("class", "cell-val")
      .attr("x", d => heatX(d.condition) + heatX.bandwidth() / 2)
      .attr("y", d => heatY(d.genre) + heatY.bandwidth() / 2 + 4)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("fill", d => d.value > 6 ? "#fff" : "#333")
      .attr("opacity", 0)
      .text(d => d.value ? d.value.toFixed(1) : "")
      .transition().duration(400)
      .attr("opacity", 1);
  }, 420); // wait for fade-out to finish before drawing new cells
}

// Called from brush handler to update heatmap
function updateHeatmap(filteredData) {
  _renderHeatCells(filteredData);
}


// CHART 3: PARALLEL COORDINATES (with click selection)

function drawParallel(svg, data) {
  const { left, top, w, h, margin } = PARA;
  const iw = w - margin.left - margin.right;
  const ih = h - margin.top - margin.bottom;

  paraG = svg.append("g")
    .attr("transform", `translate(${left + margin.left}, ${top + margin.top})`);

  paraG.append("text")
    .attr("x", iw / 2).attr("y", -20)
    .attr("text-anchor", "middle")
    .attr("font-size", "15px").attr("font-weight", "bold")
    .text("Parallel Coordinates: Hours/Day & Mental Health (click a line to highlight)");

  paraDims = ["Hours per day", "Anxiety", "Depression", "Insomnia", "OCD"];

  const clean = data.filter(d => paraDims.every(dim => !isNaN(d[dim])));

  paraYScales = {};
  paraDims.forEach(dim => {
    paraYScales[dim] = d3.scaleLinear()
      .domain(d3.extent(clean, d => d[dim])).nice()
      .range([ih, 0]);
  });

  paraX = d3.scalePoint().domain(paraDims).range([0, iw]).padding(0.15);

  paraColorScale = d3.scaleSequential()
    .domain(d3.extent(clean, d => d["Anxiety"]))
    .interpolator(d3.interpolateCool);

  paraSample = clean.length > 300
    ? clean.filter((_, i) => i % Math.ceil(clean.length / 300) === 0)
    : clean;

  _renderParaLines(paraSample);

  // Draw axes (these don't change when update)
  paraDims.forEach(dim => {
    const axis = paraG.append("g")
      .attr("transform", `translate(${paraX(dim)},0)`);

    axis.call(d3.axisLeft(paraYScales[dim]).ticks(5))
      .selectAll("text").attr("font-size", "10px");

    axis.append("text")
      .attr("y", ih + 20)
      .attr("text-anchor", "middle")
      .attr("font-size", "11px")
      .attr("fill", "#333")
      .text(dim);
  });

  // Legend
  const legendW = iw * 0.7, legendH = 10;
  const legendX = iw * 0.15, legendY = ih + 42;

  const defs2 = paraG.append("defs");
  const grad2 = defs2.append("linearGradient").attr("id", "paraLegend");
  const [lo, hi] = d3.extent(clean, d => d["Anxiety"]);
  grad2.append("stop").attr("offset", "0%").attr("stop-color", paraColorScale(lo));
  grad2.append("stop").attr("offset", "100%").attr("stop-color", paraColorScale(hi));

  paraG.append("rect")
    .attr("x", legendX).attr("y", legendY)
    .attr("width", legendW).attr("height", legendH)
    .style("fill", "url(#paraLegend)");

  paraG.append("text").attr("x", legendX).attr("y", legendY + 22)
    .attr("font-size", "10px").text(`Anxiety: ${lo}`);
  paraG.append("text").attr("x", legendX + legendW).attr("y", legendY + 22)
    .attr("font-size", "10px").attr("text-anchor", "end").text(`${hi}`);
  paraG.append("text").attr("x", legendX + legendW / 2).attr("y", legendY - 3)
    .attr("font-size", "10px").attr("text-anchor", "middle").text("Color = Anxiety level");
}

function _renderParaLines(sampleData) {
  function path(d) {
    return d3.line()(paraDims.map(dim => [paraX(dim), paraYScales[dim](d[dim])]));
  }

  // Fade out old lines
  paraG.selectAll("path.para-line")
    .transition().duration(400)
    .attr("opacity", 0)
    .remove();

  setTimeout(() => {
    // Draw new lines, faded in
    paraG.selectAll("path.para-line").data(sampleData).join("path")
      .attr("class", "para-line")
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", d => paraColorScale(d["Anxiety"]))
      .attr("stroke-width", 1)
      .attr("opacity", 0)
      .transition().duration(400)
      .attr("opacity", 0.35);

    // SELECTION: click a line to highlight it
    // Re-select after transition to attach click handlers
    setTimeout(() => {
      paraG.selectAll("path.para-line")
        .on("click", function(event, d) {
          const isSelected = d3.select(this).classed("selected");

          // Deselect everything first
          paraG.selectAll("path.para-line")
            .classed("selected", false)
            .transition().duration(200)
            .attr("stroke-width", 1)
            .attr("opacity", 0.35);

          if (!isSelected) {
            // Highlight clicked line
            d3.select(this)
              .classed("selected", true)
              .raise() // bring to front
              .transition().duration(200)
              .attr("stroke-width", 3)
              .attr("opacity", 1);

            // Show tooltip
            const tooltip = d3.select("#tooltip");
            tooltip.style("display", "block")
              .style("left", (event.pageX + 12) + "px")
              .style("top", (event.pageY - 10) + "px")
              .html(`
                <strong>Hours/day:</strong> ${d["Hours per day"]}<br>
                <strong>Anxiety:</strong> ${d["Anxiety"]}<br>
                <strong>Depression:</strong> ${d["Depression"]}<br>
                <strong>Insomnia:</strong> ${d["Insomnia"]}<br>
                <strong>OCD:</strong> ${d["OCD"]}
              `);
          } else {
            // Clicking again deselects
            d3.select("#tooltip").style("display", "none");
          }
        })
        .on("mouseover", function() {
          // Only thicken if not already selected
          if (!d3.select(this).classed("selected")) {
            d3.select(this).transition().duration(100)
              .attr("stroke-width", 2).attr("opacity", 0.7);
          }
        })
        .on("mouseout", function() {
          if (!d3.select(this).classed("selected")) {
            d3.select(this).transition().duration(100)
              .attr("stroke-width", 1).attr("opacity", 0.35);
          }
        });
    }, 420);
  }, 420);
}

// Called from brush handler to update parallel coords
function updateParallel(filteredData) {
  const clean = filteredData.filter(d => paraDims.every(dim => !isNaN(d[dim])));
  const newSample = clean.length > 300
    ? clean.filter((_, i) => i % Math.ceil(clean.length / 300) === 0)
    : clean;

  // Hide tooltip when view updates
  d3.select("#tooltip").style("display", "none");

  _renderParaLines(newSample);
}