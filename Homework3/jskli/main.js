// ECS 163 Homework 3
// Car Market Explorer 2025
// This dashboard uses D3 to implement focus + context, brushing, selection, zoom/pan, and animated transitions.

const margin = { top: 30, right: 30, bottom: 60, left: 75 };
const scatterW = 850, scatterH = 540;
const smallW = 680, smallH = 210;

// D3 creates the main scatterplot SVG container for the overview visualization.
const scatterSvg = d3.select("#scatter")
  .attr("viewBox", `0 0 ${scatterW + margin.left + margin.right} ${scatterH + margin.top + margin.bottom}`);

// D3 creates the bar chart SVG container for the company-level focus view.
const barSvg = d3.select("#bar")
  .attr("viewBox", `0 0 ${smallW + margin.left + margin.right} ${smallH + margin.top + margin.bottom}`);

// D3 creates the heatmap SVG container for the advanced visualization.
const heatSvg = d3.select("#heatmap")
  .attr("viewBox", `0 0 ${smallW + margin.left + margin.right} ${smallH + margin.top + margin.bottom}`);

const tooltip = d3.select("#tooltip");

let allCars = [];
let filteredCars = [];
let selectedCompany = null;
let selectedCar = null;
let currentTransform = d3.zoomIdentity;

const color = d3.scaleOrdinal()
  .domain(["Petrol", "Hybrid", "Electric", "Diesel"])
  .range(["#4e79a7", "#59a14f", "#f28e2b", "#9c755f"]);

const x = d3.scaleLinear().range([0, scatterW]);
const y = d3.scaleLinear().range([scatterH, 0]);
const r = d3.scaleSqrt().range([5, 18]);

const scatterRoot = scatterSvg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// D3 adds a clipped plotting area so zooming/brushing stays inside the overview chart.
scatterSvg.append("defs").append("clipPath")
  .attr("id", "scatter-clip")
  .append("rect")
  .attr("width", scatterW)
  .attr("height", scatterH);

// D3 adds grid, axis, and mark layers for the scatterplot overview.
const gridLayer = scatterRoot.append("g").attr("class", "grid");
const xAxisG = scatterRoot.append("g").attr("class", "axis").attr("transform", `translate(0,${scatterH})`);
const yAxisG = scatterRoot.append("g").attr("class", "axis");
const pointLayer = scatterRoot.append("g").attr("clip-path", "url(#scatter-clip)");
const brushLayer = scatterRoot.append("g").attr("class", "brush");

// D3 adds axis labels for the overview scatterplot.
scatterRoot.append("text")
  .attr("x", scatterW / 2)
  .attr("y", scatterH + 48)
  .attr("text-anchor", "middle")
  .attr("font-weight", 700)
  .text("Horsepower");

scatterRoot.append("text")
  .attr("transform", "rotate(-90)")
  .attr("x", -scatterH / 2)
  .attr("y", -52)
  .attr("text-anchor", "middle")
  .attr("font-weight", 700)
  .text("Price (USD)");

// D3 adds a legend that explains the fuel type color encoding.
const legend = scatterRoot.append("g").attr("class", "legend").attr("transform", `translate(${scatterW - 115}, 10)`);

const barRoot = barSvg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);
const barXAxis = barRoot.append("g").attr("class", "axis").attr("transform", `translate(0,${smallH})`);
const barYAxis = barRoot.append("g").attr("class", "axis");
const barMarks = barRoot.append("g");
const barLabels = barRoot.append("g");

// D3 adds labels for the bar chart focus view.
barRoot.append("text")
  .attr("x", smallW / 2)
  .attr("y", smallH + 55)
  .attr("text-anchor", "middle")
  .attr("font-weight", 700)
  .text("Company");
barRoot.append("text")
  .attr("transform", "rotate(-90)")
  .attr("x", -smallH / 2)
  .attr("y", -55)
  .attr("text-anchor", "middle")
  .attr("font-weight", 700)
  .text("Average Price");

const heatRoot = heatSvg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);
const heatXAxis = heatRoot.append("g").attr("class", "axis").attr("transform", `translate(0,${smallH})`);
const heatYAxis = heatRoot.append("g").attr("class", "axis");
const heatMarks = heatRoot.append("g");

// D3 adds labels for the advanced heatmap view.
heatRoot.append("text")
  .attr("x", smallW / 2)
  .attr("y", smallH + 48)
  .attr("text-anchor", "middle")
  .attr("font-weight", 700)
  .text("Seats");
heatRoot.append("text")
  .attr("transform", "rotate(-90)")
  .attr("x", -smallH / 2)
  .attr("y", -55)
  .attr("text-anchor", "middle")
  .attr("font-weight", 700)
  .text("Fuel Type");

// D3 creates brushing interaction for selecting a rectangular subset of cars.
const brush = d3.brush()
  .extent([[0, 0], [scatterW, scatterH]])
  .on("brush end", brushed);

// D3 creates zoom and pan interaction for inspecting dense areas of the scatterplot.
const zoom = d3.zoom()
  .scaleExtent([1, 8])
  .translateExtent([[0, 0], [scatterW, scatterH]])
  .extent([[0, 0], [scatterW, scatterH]])
  .on("zoom", zoomed);

scatterSvg.call(zoom);
brushLayer.call(brush);

d3.select("#reset").on("click", resetFilters);

// D3 loads and cleans the car dataset so numeric columns can be used in scales.
d3.csv("data/cars_2025.csv", d3.autoType).then(data => {
  allCars = data.map((d, i) => ({
    id: i,
    company: d.Company,
    name: d["Car Name"],
    engine: d.Engine,
    battery: d["CC/Battery"],
    hp: +d.HP,
    speed: +d["Top Speed"],
    zeroTo100: +d["0-100 km/h"],
    price: +d.Price,
    fuel: d.Fuel,
    seats: +d.Seats
  })).filter(d => Number.isFinite(d.hp) && Number.isFinite(d.price));

  filteredCars = allCars;
  initializeScales();
  drawLegend();
  updateScatter(allCars);
  updateFocusViews(filteredCars);
});

function initializeScales() {
  x.domain(d3.extent(allCars, d => d.hp)).nice();
  y.domain(d3.extent(allCars, d => d.price)).nice();
  r.domain(d3.extent(allCars, d => d.speed));
  updateScatterAxes();
}

function updateScatterAxes() {
  const zx = currentTransform.rescaleX(x);
  const zy = currentTransform.rescaleY(y);

  // Animate x-axis after zooming, brushing, or resetting.
  xAxisG
    .transition()
    .duration(650)
    .call(d3.axisBottom(zx).ticks(7));

  // Animate y-axis after zooming, brushing, or resetting.
  yAxisG
    .transition()
    .duration(650)
    .call(d3.axisLeft(zy).ticks(7).tickFormat(d3.format("~s")));

  // Redraw vertical grid lines.
  gridLayer.selectAll(".x-grid")
    .data(zx.ticks(7))
    .join("line")
    .attr("class", "x-grid")
    .transition()
    .duration(650)
    .attr("x1", d => zx(d))
    .attr("x2", d => zx(d))
    .attr("y1", 0)
    .attr("y2", scatterH);

  // Redraw horizontal grid lines.
  gridLayer.selectAll(".y-grid")
    .data(zy.ticks(7))
    .join("line")
    .attr("class", "y-grid")
    .transition()
    .duration(650)
    .attr("x1", 0)
    .attr("x2", scatterW)
    .attr("y1", d => zy(d))
    .attr("y2", d => zy(d));
}

function drawLegend() {
  const items = color.domain().filter(f => allCars.some(d => d.fuel === f));
  const rows = legend.selectAll("g").data(items).join("g")
    .attr("transform", (d, i) => `translate(0,${i * 22})`);

  // D3 adds colored legend circles for each fuel type.
  rows.append("circle").attr("r", 6).attr("fill", d => color(d));
  rows.append("text").attr("x", 12).attr("y", 4).text(d => d);
}

function updateScatter(data) {
  const zx = currentTransform.rescaleX(x);
  const zy = currentTransform.rescaleY(y);
  updateScatterAxes();

  // D3 adds one circle per car in the overview; circles transition during filtering/zooming.
  pointLayer.selectAll("circle")
    .data(allCars, d => d.id)
    .join(
      enter => enter.append("circle")
        .attr("cx", d => zx(d.hp))
        .attr("cy", d => zy(d.price))
        .attr("r", 0)
        .attr("fill", d => color(d.fuel))
        .attr("fill-opacity", 0.78)
        .attr("stroke", "none")
        .on("mouseover", showTooltip)
        .on("mousemove", moveTooltip)
        .on("mouseout", hideTooltip)
        .on("click", clickedCar)
        .call(enter => enter.transition().duration(700).attr("r", d => r(d.speed))),
      update => update,
      exit => exit.transition().duration(500).attr("r", 0).remove()
    )
    .transition()
    .duration(650)
    .ease(d3.easeCubicInOut)
    .attr("cx", d => zx(d.hp))
    .attr("cy", d => zy(d.price))
    .attr("r", d => r(d.speed))
    .attr("opacity", d => data.includes(d) ? 1 : 0.12)
    .attr("stroke", d =>
      selectedCar && d.id === selectedCar.id
        ? "#111827"
        : selectedCompany && d.company === selectedCompany
          ? "#111827"
          : data.includes(d)
            ? "#111827"
            : "none"
    )
    .attr("stroke-width", d =>
      selectedCar && d.id === selectedCar.id
        ? 4
        : selectedCompany && d.company === selectedCompany
          ? 2.5
          : data.includes(d)
            ? 1.5
            : 0
    );
}

// D3 updates both focus views whenever the selected subset changes.
function updateFocusViews(data) {
  updateBarChart(data);
  updateHeatmap(data);
}

function updateBarChart(data) {
  const grouped = d3.rollups(data, v => d3.mean(v, d => d.price), d => d.company)
    .map(([company, avgPrice]) => ({ company, avgPrice }))
    .sort((a, b) => d3.descending(a.avgPrice, b.avgPrice))
    .slice(0, 10);

  const bx = d3.scaleBand().domain(grouped.map(d => d.company)).range([0, smallW]).padding(0.2);
  const by = d3.scaleLinear().domain([0, d3.max(grouped, d => d.avgPrice) || 1]).nice().range([smallH, 0]);

  barXAxis.transition().duration(700).call(d3.axisBottom(bx)).selectAll("text")
    .attr("transform", "rotate(-30)").style("text-anchor", "end");
  barYAxis.transition().duration(700).call(d3.axisLeft(by).ticks(5).tickFormat(d3.format("~s")));

  // D3 adds animated bars showing average price by company for the selected subset.
  barMarks.selectAll("rect")
    .data(grouped, d => d.company)
    .join(
      enter => enter.append("rect")
        .attr("x", d => bx(d.company))
        .attr("y", smallH)
        .attr("width", bx.bandwidth())
        .attr("height", 0)
        .attr("fill", d => d.company === selectedCompany ? "#1f2937" : "#4e79a7")
        .on("click", clickedCompany),
      update => update,
      exit => exit.transition().duration(500).attr("y", smallH).attr("height", 0).remove()
    )
    .transition().duration(800).ease(d3.easeCubicInOut)
    .attr("x", d => bx(d.company))
    .attr("y", d => by(d.avgPrice))
    .attr("width", bx.bandwidth())
    .attr("height", d => smallH - by(d.avgPrice))
    .attr("fill", d => d.company === selectedCompany ? "#1f2937" : "#4e79a7");

  // D3 adds numeric labels above each bar for readable detail.
  barLabels.selectAll("text")
    .data(grouped, d => d.company)
    .join(
      enter => enter.append("text")
        .attr("x", d => bx(d.company) + bx.bandwidth() / 2)
        .attr("y", smallH)
        .attr("text-anchor", "middle")
        .attr("font-size", 11)
        .attr("font-weight", 700),
      update => update,
      exit => exit.remove()
    )
    .transition().duration(800)
    .attr("x", d => bx(d.company) + bx.bandwidth() / 2)
    .attr("y", d => by(d.avgPrice) - 5)
    .text(d => `$${Math.round(d.avgPrice / 1000)}k`);
}

function updateHeatmap(data) {
  const fuels = color.domain().filter(f => allCars.some(d => d.fuel === f));
  const seats = Array.from(new Set(allCars.map(d => d.seats))).sort((a, b) => a - b);
  const hx = d3.scaleBand().domain(seats).range([0, smallW]).padding(0.05);
  const hy = d3.scaleBand().domain(fuels).range([0, smallH]).padding(0.05);

  const cells = [];
  fuels.forEach(fuel => {
    seats.forEach(seat => {
      const subset = data.filter(d => d.fuel === fuel && d.seats === seat);
      cells.push({ fuel, seat, avgPrice: d3.mean(subset, d => d.price) || 0, count: subset.length });
    });
  });

  const maxPrice = d3.max(cells, d => d.avgPrice) || 1;
  const heatColor = d3.scaleSequential(d3.interpolateBlues).domain([0, maxPrice]);

  heatXAxis.transition().duration(700).call(d3.axisBottom(hx));
  heatYAxis.transition().duration(700).call(d3.axisLeft(hy));

  // D3 adds a rectangular heatmap cell for each Fuel Type x Seats combination.
  heatMarks.selectAll("rect")
    .data(cells, d => `${d.fuel}-${d.seat}`)
    .join("rect")
    .attr("x", d => hx(d.seat))
    .attr("y", d => hy(d.fuel))
    .attr("width", hx.bandwidth())
    .attr("height", hy.bandwidth())
    .attr("stroke", "white")
    .attr("stroke-width", 1.5)
    .transition().duration(800).ease(d3.easeCubicInOut)
    .attr("fill", d => d.avgPrice ? heatColor(d.avgPrice) : "#edf2f7");

  // D3 adds text annotations to clarify count and average price in each cell.
  heatMarks.selectAll("text")
    .data(cells, d => `${d.fuel}-${d.seat}`)
    .join("text")
    .attr("x", d => hx(d.seat) + hx.bandwidth() / 2)
    .attr("y", d => hy(d.fuel) + hy.bandwidth() / 2 + 4)
    .attr("text-anchor", "middle")
    .attr("font-size", 11)
    .attr("font-weight", 700)
    .transition().duration(800)
    .attr("fill", d => d.avgPrice > maxPrice * 0.55 ? "white" : "#1f2937")
    .text(d => d.count ? `$${Math.round(d.avgPrice / 1000)}k` : "");
}

function brushed(event) {
  if (!event.selection) {
    selectedCar = null;
    filteredCars = selectedCompany ? allCars.filter(d => d.company === selectedCompany) : allCars;
    updateScatter(filteredCars);
    updateFocusViews(filteredCars);
    return;
  }

  const [[x0, y0], [x1, y1]] = event.selection;
  const zx = currentTransform.rescaleX(x);
  const zy = currentTransform.rescaleY(y);
  selectedCar = null;

  filteredCars = allCars.filter(d => {
    const insideBrush = zx(d.hp) >= x0 && zx(d.hp) <= x1 && zy(d.price) >= y0 && zy(d.price) <= y1;
    const insideCompany = !selectedCompany || d.company === selectedCompany;
    return insideBrush && insideCompany;
  });

  updateScatter(filteredCars);
  updateFocusViews(filteredCars);
}

function zoomed(event) {
  currentTransform = event.transform;
  updateScatter(filteredCars);
}

function clickedCar(event, d) {
  event.stopPropagation();
  selectedCar = d;
  selectedCompany = null;
  filteredCars = [d];
  brushLayer.call(brush.move, null);
  updateScatter(filteredCars);
  updateFocusViews(filteredCars);
}

function clickedCompany(event, d) {
  selectedCompany = selectedCompany === d.company ? null : d.company;
  selectedCar = null;
  filteredCars = selectedCompany ? allCars.filter(car => car.company === selectedCompany) : allCars;
  brushLayer.call(brush.move, null);
  updateScatter(filteredCars);
  updateFocusViews(filteredCars);
}

function resetFilters() {
  selectedCompany = null;
  selectedCar = null;
  filteredCars = allCars;
  currentTransform = d3.zoomIdentity;
  scatterSvg.transition().duration(600).call(zoom.transform, d3.zoomIdentity);
  brushLayer.call(brush.move, null);
  updateScatter(filteredCars);
  updateFocusViews(filteredCars);
}

function showTooltip(event, d) {
  tooltip.style("display", "block")
    .html(`<b>${d.company} ${d.name}</b><br>Fuel: ${d.fuel}<br>HP: ${d.hp}<br>Top speed: ${d.speed} km/h<br>Price: $${d3.format(",")(d.price)}`);
  moveTooltip(event);
}

function moveTooltip(event) {
  tooltip.style("left", `${event.pageX + 14}px`).style("top", `${event.pageY - 18}px`);
}

function hideTooltip() {
  tooltip.style("display", "none");
}
