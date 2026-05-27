const W = window.innerWidth;
const H = window.innerHeight;
 
// Define the size and position of each chart on the screen
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
 
// The four mental health conditions we're looking at
const MENTAL = ["Anxiety", "Depression", "Insomnia", "OCD"];
 
const COLOR_BAR  = "#6c8ebf";
const COLOR_PARA = ["#e07b54", "#6c8ebf", "#74b87a", "#c97bbf"];
 
// Load the csv and convert numeric columns from strings to numbers
d3.csv("mxmh_survey_results.csv").then(raw => {
 
  raw.forEach(d => {
    d["Hours per day"] = +d["Hours per day"];
    d["Anxiety"]       = +d["Anxiety"];
    d["Depression"]    = +d["Depression"];
    d["Insomnia"]      = +d["Insomnia"];
    d["OCD"]           = +d["OCD"];
    d["Age"]           = +d["Age"];
  });
 
  const svg = d3.select("svg");
 
  // Draw all three charts
  drawBar(svg, raw);
  drawHeatmap(svg, raw);
  drawParallel(svg, raw);
 
}).catch(err => console.error("CSV load error:", err));
 
 
// Chart 1: bar chart showing how many respondents use each streaming service
function drawBar(svg, data) {
  const { left, top, w, h, margin } = BAR;
  const iw = w - margin.left - margin.right;
  const ih = h - margin.top - margin.bottom;
 
  const g = svg.append("g")
    .attr("transform", `translate(${left + margin.left}, ${top + margin.top})`);
 
  g.append("text")
    .attr("x", iw / 2).attr("y", -20)
    .attr("text-anchor", "middle")
    .attr("font-size", "15px").attr("font-weight", "bold")
    .text("Overview: Respondents by Primary Streaming Service");
 
  // Count how many people use each service, remove blanks, sort biggest to smallest
  const counts = d3.rollup(data, v => v.length, d => d["Primary streaming service"]);
  const barData = Array.from(counts, ([service, count]) => ({ service, count }))
    .filter(d => d.service && d.service.trim() !== "")
    .sort((a, b) => b.count - a.count);
 
  const x = d3.scaleBand()
    .domain(barData.map(d => d.service))
    .range([0, iw]).padding(0.25);
 
  const y = d3.scaleLinear()
    .domain([0, d3.max(barData, d => d.count)]).nice()
    .range([ih, 0]);
 
  // X axis with slightly rotated labels so they don't overlap
  g.append("g")
    .attr("transform", `translate(0,${ih})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
      .attr("transform", "rotate(-25)")
      .attr("text-anchor", "end")
      .attr("dx", "-0.4em").attr("dy", "0.6em")
      .attr("font-size", "12px");
 
  g.append("g").call(d3.axisLeft(y).ticks(5));
 
  // Axis labels
  g.append("text")
    .attr("x", iw / 2).attr("y", ih + 55)
    .attr("text-anchor", "middle").attr("font-size", "12px")
    .text("Streaming Service");
 
  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -ih / 2).attr("y", -55)
    .attr("text-anchor", "middle").attr("font-size", "12px")
    .text("Number of Respondents");
 
  // Draw the bars
  g.selectAll("rect").data(barData).join("rect")
    .attr("x", d => x(d.service))
    .attr("y", d => y(d.count))
    .attr("width", x.bandwidth())
    .attr("height", d => ih - y(d.count))
    .attr("fill", COLOR_BAR)
    .attr("rx", 3);
 
  // Show the count above each bar
  g.selectAll(".bar-label").data(barData).join("text")
    .attr("class", "bar-label")
    .attr("x", d => x(d.service) + x.bandwidth() / 2)
    .attr("y", d => y(d.count) - 4)
    .attr("text-anchor", "middle")
    .attr("font-size", "11px")
    .attr("fill", "#333")
    .text(d => d.count);
}
 
 
// Chart 2: Heatmap of average mental health scores broken down by favorite genre
function drawHeatmap(svg, data) {
  const { left, top, w, h, margin } = HEAT;
  const iw = w - margin.left - margin.right;
  const ih = h - margin.top - margin.bottom;
 
  const g = svg.append("g")
    .attr("transform", `translate(${left + margin.left}, ${top + margin.top})`);
 
  g.append("text")
    .attr("x", iw / 2).attr("y", -20)
    .attr("text-anchor", "middle")
    .attr("font-size", "15px").attr("font-weight", "bold")
    .text("Avg Mental Health Score by Favorite Genre");
 
  // Get unique genres and remove any blank entries
  const genres = Array.from(new Set(data.map(d => d["Fav genre"]))).filter(Boolean).sort();
 
  // For each genre + condition combo, compute the average score
  const heatData = [];
  genres.forEach(genre => {
    MENTAL.forEach(cond => {
      const vals = data.filter(d => d["Fav genre"] === genre).map(d => d[cond]);
      const avg = d3.mean(vals);
      heatData.push({ genre, condition: cond, value: avg });
    });
  });
 
  const x = d3.scaleBand().domain(MENTAL).range([0, iw]).padding(0.05);
  const y = d3.scaleBand().domain(genres).range([0, ih]).padding(0.05);
 
  // Yellow to red color scale (higher score = darker/redder)
  const colorScale = d3.scaleSequential()
    .domain([0, 10])
    .interpolator(d3.interpolateYlOrRd);
 
  g.append("g").call(d3.axisTop(x))
    .selectAll("text").attr("font-size", "12px");
 
  g.append("g").call(d3.axisLeft(y))
    .selectAll("text").attr("font-size", "11px");
 
  // Axis labels
  g.append("text")
    .attr("x", iw / 2).attr("y", ih + 30)
    .attr("text-anchor", "middle").attr("font-size", "12px")
    .text("Mental Health Condition");
 
  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -ih / 2).attr("y", -115)
    .attr("text-anchor", "middle").attr("font-size", "12px")
    .text("Favorite Genre");
 
  // Draw each cell
  g.selectAll("rect.cell").data(heatData).join("rect")
    .attr("class", "cell")
    .attr("x", d => x(d.condition))
    .attr("y", d => y(d.genre))
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("fill", d => colorScale(d.value))
    .attr("rx", 2);
 
  // Put the number inside each cell, white text on dark cells
  g.selectAll("text.cell-val").data(heatData).join("text")
    .attr("class", "cell-val")
    .attr("x", d => x(d.condition) + x.bandwidth() / 2)
    .attr("y", d => y(d.genre) + y.bandwidth() / 2 + 4)
    .attr("text-anchor", "middle")
    .attr("font-size", "10px")
    .attr("fill", d => d.value > 6 ? "#fff" : "#333")
    .text(d => d.value ? d.value.toFixed(1) : "");
 
  // Gradient legend at the bottom
  const legendW = iw * 0.7, legendH = 12;
  const legendX = iw * 0.15, legendY = ih + 50;
 
  const defs = svg.append("defs");
  const grad = defs.append("linearGradient").attr("id", "heatLegend");
  grad.append("stop").attr("offset", "0%").attr("stop-color", colorScale(0));
  grad.append("stop").attr("offset", "100%").attr("stop-color", colorScale(10));
 
  g.append("rect")
    .attr("x", legendX).attr("y", legendY)
    .attr("width", legendW).attr("height", legendH)
    .style("fill", "url(#heatLegend)");
 
  g.append("text").attr("x", legendX).attr("y", legendY + 26)
    .attr("font-size", "10px").text("0 (low)");
  g.append("text").attr("x", legendX + legendW).attr("y", legendY + 26)
    .attr("font-size", "10px").attr("text-anchor", "end").text("10 (high)");
  g.append("text").attr("x", legendX + legendW / 2).attr("y", legendY - 4)
    .attr("font-size", "10px").attr("text-anchor", "middle").text("Score");
}
 
 
// Chart 3: parallel coordinates — shows each person as a line across all 5 dimensions
function drawParallel(svg, data) {
  const { left, top, w, h, margin } = PARA;
  const iw = w - margin.left - margin.right;
  const ih = h - margin.top - margin.bottom;
 
  const g = svg.append("g")
    .attr("transform", `translate(${left + margin.left}, ${top + margin.top})`);
 
  g.append("text")
    .attr("x", iw / 2).attr("y", -20)
    .attr("text-anchor", "middle")
    .attr("font-size", "15px").attr("font-weight", "bold")
    .text("Parallel Coordinates: Hours/Day & Mental Health Scores");
 
  const dims = ["Hours per day", "Anxiety", "Depression", "Insomnia", "OCD"];
 
  // Drop any rows that have missing values in these columns
  const clean = data.filter(d => dims.every(dim => !isNaN(d[dim])));
 
  // Each dimension gets its own y scale
  const yScales = {};
  dims.forEach(dim => {
    yScales[dim] = d3.scaleLinear()
      .domain(d3.extent(clean, d => d[dim])).nice()
      .range([ih, 0]);
  });
 
  const x = d3.scalePoint().domain(dims).range([0, iw]).padding(0.15);
 
  // Color lines by anxiety score (low = purple, high = green)
  const colorScale = d3.scaleSequential()
    .domain(d3.extent(clean, d => d["Anxiety"]))
    .interpolator(d3.interpolateCool);
 
  // Helper that turns a data row into an SVG path
  function path(d) {
    return d3.line()(dims.map(dim => [x(dim), yScales[dim](d[dim])]));
  }
 
  // If there are too many rows, sample down to 300 so it doesn't get too slow
  const sample = clean.length > 300 ? clean.filter((_, i) => i % Math.ceil(clean.length / 300) === 0) : clean;
 
  g.selectAll("path.para-line").data(sample).join("path")
    .attr("class", "para-line")
    .attr("d", path)
    .attr("fill", "none")
    .attr("stroke", d => colorScale(d["Anxiety"]))
    .attr("stroke-width", 1)
    .attr("opacity", 0.35);
 
  // Draw a vertical axis for each dimension
  dims.forEach(dim => {
    const axis = g.append("g")
      .attr("transform", `translate(${x(dim)},0)`);
 
    axis.call(d3.axisLeft(yScales[dim]).ticks(5))
      .selectAll("text").attr("font-size", "10px");
 
    // Label at the bottom of each axis
    axis.append("text")
      .attr("y", ih + 20)
      .attr("text-anchor", "middle")
      .attr("font-size", "11px")
      .attr("fill", "#333")
      .text(dim);
  });
 
  // Legend showing what the line color means
  const legendW = iw * 0.7, legendH = 10;
  const legendX = iw * 0.15, legendY = ih + 42;
 
  const defs2 = g.append("defs");
  const grad2 = defs2.append("linearGradient").attr("id", "paraLegend");
  const [lo, hi] = d3.extent(clean, d => d["Anxiety"]);
  grad2.append("stop").attr("offset", "0%").attr("stop-color", colorScale(lo));
  grad2.append("stop").attr("offset", "100%").attr("stop-color", colorScale(hi));
 
  g.append("rect")
    .attr("x", legendX).attr("y", legendY)
    .attr("width", legendW).attr("height", legendH)
    .style("fill", "url(#paraLegend)");
 
  g.append("text").attr("x", legendX).attr("y", legendY + 22)
    .attr("font-size", "10px").text(`Anxiety: ${lo}`);
  g.append("text").attr("x", legendX + legendW).attr("y", legendY + 22)
    .attr("font-size", "10px").attr("text-anchor", "end").text(`${hi}`);
  g.append("text").attr("x", legendX + legendW / 2).attr("y", legendY - 3)
    .attr("font-size", "10px").attr("text-anchor", "middle").text("Color = Anxiety level");
}
 