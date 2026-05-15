// D3 dashboard for ECS 163 Homework 2.
// Dataset source: https://data.sfgov.org/City-Management-and-Ethics/List-of-Historical-Ballot-Measures/xzie-ixjw

const DATA_URL = "data/ballot_measures.csv";

const typeLabels = {
  B: "Bond",
  C: "Charter",
  L: "Declaration",
  O: "Ordinance",
  P: "Policy",
  R: "Recall",
  RM: "Regional",
  T: "Tax",
  Unknown: "Unknown"
};

const sponsorLabels = {
  S: "Supervisors",
  s: "Supervisors",
  I: "Initiative",
  M: "Mayor",
  L: "Legislature",
  R: "Referendum",
  C: "Controller",
  B: "Board",
  D: "District",
  SE: "Special election",
  se: "Special election",
  "2": "Two-thirds",
  two: "Two-thirds",
  SFUSD: "SFUSD",
  Unknown: "Unknown"
};

const compactTypeLabels = {
  B: "Bond",
  C: "Charter",
  L: "Decl.",
  O: "Ord.",
  P: "Policy",
  R: "Recall",
  RM: "Regional",
  T: "Tax",
  Unknown: "Unknown"
};

const compactSponsorLabels = {
  S: "Sup.",
  s: "Sup.",
  I: "Init.",
  M: "Mayor",
  L: "Leg.",
  R: "Ref.",
  C: "Ctrl.",
  B: "Board",
  D: "Dist.",
  SE: "Special",
  se: "Special",
  "2": "2/3",
  two: "2/3",
  SFUSD: "SFUSD",
  Unknown: "Unknown"
};

const outcomeColors = d3.scaleOrdinal()
  .domain(["Passed", "Failed"])
  .range(["#2a9d8f", "#e76f51"]);

const compactNumber = d3.format("~s");
const percentFormat = d3.format(".0f");
const tooltip = d3.select("#tooltip");
let ballotData = [];
let resizeTimer;
let selectedDecade = null;
let selectedMeasureId = null;

// Load the CSV and turn vote/year fields into numbers.
d3.csv(DATA_URL).then(raw => {
  ballotData = raw
    .map((d, index) => {
      const year = +d.year;
      const yesVotes = +d.yes_votes || 0;
      const noVotes = +d.no_votes || 0;
      const yesShare = (+d.percent || 0) * 100;
      const outcome = d.pass_or_fail === "P" ? "Passed" : d.pass_or_fail === "F" ? "Failed" : "Unknown";
      const typeCode = d.type_measure || "Unknown";
      const sponsorCode = normalizeSponsor(d.by || "Unknown");

      return {
        id: `${year}-${d.letter || ""}-${index}`,
        year,
        decade: `${Math.floor(year / 10) * 10}s`,
        month: d.month,
        letter: d.letter,
        subject: d.subject || "Untitled measure",
        yesVotes,
        noVotes,
        totalVotes: yesVotes + noVotes,
        yesShare,
        outcome,
        typeCode,
        typeLabel: typeLabels[typeCode] || typeCode,
        sponsorCode,
        sponsorLabel: sponsorLabels[sponsorCode] || sponsorCode,
        keyword: d.keyword1 || "No keyword"
      };
    })
    .filter(d => d.outcome !== "Unknown" && Number.isFinite(d.year) && Number.isFinite(d.yesShare));

  renderDashboard();
}).catch(error => {
  console.error("Could not load ballot measure data:", error);
});

// Redraw after resize so the three panels keep their proportions.
window.addEventListener("resize", () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(renderDashboard, 160);
});

function renderDashboard() {
  drawDecadeOverview(ballotData);
  drawTurnoutScatter(ballotData);
  drawParallelCoordinates(ballotData);
  applySelection();
}

function getChartBox(selector) {
  const node = document.querySelector(selector);
  const bounds = node.getBoundingClientRect();
  return { width: Math.max(320, bounds.width), height: Math.max(220, bounds.height) };
}

function drawDecadeOverview(data) {
  const selector = "#decade-chart";
  const svg = d3.select(selector);
  svg.selectAll("*").remove();

  const { width, height } = getChartBox(selector);
  const isCompact = width < 520;
  const margin = isCompact
    ? { top: 20, right: 18, bottom: 34, left: 38 }
    : { top: 26, right: 28, bottom: 54, left: 46 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  svg.attr("viewBox", `0 0 ${width} ${height}`);

  const decadeMap = {};
  data.forEach(d => {
    if (!decadeMap[d.decade]) decadeMap[d.decade] = { decade: d.decade, Passed: 0, Failed: 0 };
    decadeMap[d.decade][d.outcome] += 1;
  });

  const decades = Object.values(decadeMap).sort((a, b) => d3.ascending(+a.decade.slice(0, 4), +b.decade.slice(0, 4)));
  const stack = d3.stack().keys(["Passed", "Failed"])(decades);

  const x = d3.scaleBand()
    .domain(decades.map(d => d.decade))
    .range([0, innerWidth])
    .padding(0.22);

  const y = d3.scaleLinear()
    .domain([0, d3.max(decades, d => d.Passed + d.Failed)])
    .nice()
    .range([innerHeight, 0]);

  // Plot group inside the chart margins.
  const chart = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Faint count gridlines behind the bars.
  chart.append("g")
    .attr("class", "gridline")
    .call(d3.axisLeft(y).ticks(4).tickSize(-innerWidth).tickFormat(""));

  // Stacked layers split each decade into passed and failed measures.
  const layers = chart.selectAll(".decade-layer")
    .data(stack)
    .enter()
    .append("g")
    .attr("class", "decade-layer")
    .attr("fill", d => outcomeColors(d.key));

  // Bars encode measure counts by decade and outcome.
  layers.selectAll("rect")
    .data(layer => layer.map(point => ({
      decade: point.data.decade,
      outcome: layer.key,
      count: point.data[layer.key],
      total: point.data.Passed + point.data.Failed,
      y0: point[0],
      y1: point[1]
    })))
    .enter()
    .append("rect")
    .attr("class", "decade-bar")
    .attr("x", d => x(d.decade))
    .attr("y", d => y(d.y1))
    .attr("height", d => y(d.y0) - y(d.y1))
    .attr("width", x.bandwidth())
    .attr("opacity", 0.92)
    .on("mouseenter", d => showDecadeTooltip(d))
    .on("mousemove", moveTooltip)
    .on("mouseleave", hideTooltip)
    .on("click", d => selectDecade(d.decade));

  // Decade axis.
  chart.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).tickValues(isCompact ? decades.filter((d, i) => i % 2 === 0).map(d => d.decade) : x.domain()));

  // Measure count axis.
  chart.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(4));

  // x = election decade.
  chart.append("text")
    .attr("class", "axis-label")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + (isCompact ? 28 : 42))
    .attr("text-anchor", "middle")
    .text("Election decade");

  // y = number of measures.
  chart.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -34)
    .attr("text-anchor", "middle")
    .text("Number of measures");

  drawOutcomeLegend(svg, width - 168, 8);
}

function drawTurnoutScatter(data) {
  const selector = "#scatter-chart";
  const svg = d3.select(selector);
  svg.selectAll("*").remove();

  const { width, height } = getChartBox(selector);
  const isCompact = width < 520;
  const margin = isCompact
    ? { top: 22, right: 20, bottom: 34, left: 42 }
    : { top: 28, right: 30, bottom: 54, left: 66 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  svg.attr("viewBox", `0 0 ${width} ${height}`);

  const x = d3.scaleLinear()
    .domain([0, 100])
    .range([0, innerWidth]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.totalVotes)])
    .nice()
    .range([innerHeight, 0]);

  const r = d3.scaleSqrt()
    .domain(d3.extent(data, d => d.totalVotes))
    .range([2.4, 9]);

  // Plot group inside the scatter margins.
  const chart = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Turnout gridlines.
  chart.append("g")
    .attr("class", "gridline")
    .call(d3.axisLeft(y).ticks(isCompact ? 3 : 4).tickSize(-innerWidth).tickFormat(""));

  // 50% reference line.
  chart.append("line")
    .attr("x1", x(50))
    .attr("x2", x(50))
    .attr("y1", 0)
    .attr("y2", innerHeight)
    .attr("stroke", "#777777")
    .attr("stroke-dasharray", "4 4")
    .attr("opacity", 0.65);

  // Label the majority line.
  chart.append("text")
    .attr("class", "annotation")
    .attr("x", x(50) + 6)
    .attr("y", 12)
    .text(isCompact ? "50%" : "50% yes");

  // Scatter: x = yes share, y/radius = turnout, color = outcome.
  chart.selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("class", "measure-point")
    .attr("cx", d => x(d.yesShare))
    .attr("cy", d => y(d.totalVotes))
    .attr("r", d => r(d.totalVotes))
    .attr("fill", d => outcomeColors(d.outcome))
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 0.7)
    .attr("opacity", 0.68)
    .on("mouseenter", d => showTooltip(d))
    .on("mousemove", moveTooltip)
    .on("mouseleave", hideTooltip)
    .on("click", d => selectMeasure(d.id));

  // Yes-share axis.
  chart.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(isCompact ? 4 : 5).tickFormat(d => `${d}%`));

  // Total-votes axis.
  chart.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(isCompact ? 3 : 4).tickFormat(compactNumber));

  // x = yes vote share.
  chart.append("text")
    .attr("class", "axis-label")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + (isCompact ? 28 : 42))
    .attr("text-anchor", "middle")
    .text("Yes vote share");

  // y = total votes cast.
  chart.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", isCompact ? -30 : -46)
    .attr("text-anchor", "middle")
    .text("Total votes cast");

  drawOutcomeLegend(svg, width - (isCompact ? 82 : 168), 8, isCompact);
  drawSizeLegend(svg, width - (isCompact ? 94 : 150), height - (isCompact ? 64 : 104), r, isCompact);
}

function drawParallelCoordinates(data) {
  const selector = "#parallel-chart";
  const svg = d3.select(selector);
  svg.selectAll("*").remove();

  const { width, height } = getChartBox(selector);
  const isCompact = width < 520;
  const margin = isCompact
    ? { top: 26, right: 28, bottom: 24, left: 40 }
    : { top: 34, right: 54, bottom: 34, left: 54 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  svg.attr("viewBox", `0 0 ${width} ${height}`);

  // All 981 measures turned the parallel plot into a hairball, so this keeps the highest-turnout rows.
  const focusData = data
    .slice()
    .sort((a, b) => d3.descending(a.totalVotes, b.totalVotes))
    .slice(0, isCompact ? 90 : 180);

  const dimensions = ["year", "typeCode", "sponsorCode", "yesShare", "totalVotes"];
  const dimensionLabels = {
    year: "Year",
    typeCode: isCompact ? "Type" : "Measure type",
    sponsorCode: isCompact ? "Source" : "Sponsor/source",
    yesShare: isCompact ? "Yes" : "Yes share",
    totalVotes: isCompact ? "Votes" : "Total votes"
  };

  const typeDomain = uniqueSorted(focusData.map(d => d.typeCode));
  const sponsorDomain = uniqueSorted(focusData.map(d => d.sponsorCode));

  const x = d3.scalePoint()
    .domain(dimensions)
    .range([0, innerWidth])
    .padding(0.12);

  const yScales = {
    year: d3.scaleLinear().domain(d3.extent(data, d => d.year)).nice().range([innerHeight, 0]),
    typeCode: d3.scalePoint().domain(typeDomain).range([innerHeight, 0]).padding(0.45),
    sponsorCode: d3.scalePoint().domain(sponsorDomain).range([innerHeight, 0]).padding(0.45),
    yesShare: d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]),
    totalVotes: d3.scaleSqrt().domain([0, d3.max(data, d => d.totalVotes)]).range([innerHeight, 0])
  };

  const line = d3.line()
    .x(point => point[0])
    .y(point => point[1]);

  // Plot group inside the parallel-coordinate margins.
  const chart = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // One line per high-turnout measure across the five axes.
  chart.append("g")
    .attr("fill", "none")
    .selectAll("path")
    .data(focusData)
    .enter()
    .append("path")
    .attr("class", "parallel-line")
    .attr("d", d => line(dimensions.map(dim => [x(dim), yScales[dim](d[dim])])))
    .attr("stroke", d => outcomeColors(d.outcome))
    .attr("stroke-width", 1.15)
    .attr("stroke-opacity", isCompact ? 0.48 : 0.34)
    .on("mouseenter", d => showTooltip(d))
    .on("mousemove", moveTooltip)
    .on("mouseleave", hideTooltip)
    .on("click", d => selectMeasure(d.id));

  // Vertical axes for each dimension.
  const axes = chart.selectAll(".parallel-axis")
    .data(dimensions)
    .enter()
    .append("g")
    .attr("class", "axis parallel-axis")
    .attr("transform", d => `translate(${x(d)},0)`)
    .each(function(dim) {
      const axis = buildParallelAxis(dim, yScales[dim], isCompact);
      d3.select(this).call(axis);
    });

  // Axis titles.
  axes.append("text")
    .attr("class", "measure-label")
    .attr("x", 0)
    .attr("y", -14)
    .attr("text-anchor", "middle")
    .attr("font-weight", 700)
    .text(d => dimensionLabels[d]);

  if (!isCompact) {
    // Note why this plot uses a subset.
    chart.append("text")
      .attr("class", "annotation")
      .attr("x", 0)
      .attr("y", innerHeight + 25)
      .text("Parallel coordinates show the 180 highest-turnout measures; color is outcome.");
  }

  drawOutcomeLegend(svg, width - (isCompact ? 82 : 168), isCompact ? 34 : 52, isCompact);
}

function normalizeSponsor(value) {
  if (value === "s") return "S";
  if (value === "se") return "SE";
  if (value === "two") return "2";
  return value || "Unknown";
}

function buildParallelAxis(dim, scale, isCompact) {
  if (dim === "year") {
    return d3.axisLeft(scale).ticks(5).tickFormat(d3.format("d"));
  }

  if (dim === "yesShare") {
    return d3.axisLeft(scale).ticks(5).tickFormat(d => `${d}%`);
  }

  if (dim === "totalVotes") {
    return d3.axisLeft(scale).ticks(4).tickFormat(compactNumber);
  }

  if (dim === "typeCode") {
    const labels = isCompact ? compactTypeLabels : typeLabels;
    return d3.axisLeft(scale).tickFormat(d => labels[d] || d);
  }

  const labels = isCompact ? compactSponsorLabels : sponsorLabels;
  return d3.axisLeft(scale).tickFormat(d => labels[d] || d);
}

function drawOutcomeLegend(svg, x, y, isCompact = false) {
  const legendData = ["Passed", "Failed"];

  // Shared pass/fail legend.
  const legend = svg.append("g")
    .attr("transform", `translate(${x},${y})`);

  // Color swatches for outcome.
  legend.selectAll("rect")
    .data(legendData)
    .enter()
    .append("rect")
    .attr("x", 0)
    .attr("y", (d, i) => i * (isCompact ? 14 : 18))
    .attr("width", isCompact ? 8 : 10)
    .attr("height", isCompact ? 8 : 10)
    .attr("fill", d => outcomeColors(d));

  // Outcome labels.
  legend.selectAll("text")
    .data(legendData)
    .enter()
    .append("text")
    .attr("class", "legend-label")
    .attr("x", isCompact ? 13 : 16)
    .attr("y", (d, i) => i * (isCompact ? 14 : 18) + 9)
    .text(d => isCompact ? d[0] : d);
}

function drawSizeLegend(svg, x, y, rScale, isCompact = false) {
  const sizes = isCompact ? [100000] : [100000, 300000];

  // Scatter size legend.
  const legend = svg.append("g")
    .attr("transform", `translate(${x},${y})`);

  // Size legend title.
  legend.append("text")
    .attr("class", "legend-label")
    .attr("x", 0)
    .attr("y", 0)
    .text(isCompact ? "Votes" : "Total votes");

  // Reference circles for turnout.
  legend.selectAll("circle")
    .data(sizes)
    .enter()
    .append("circle")
    .attr("cx", (d, i) => i * 52)
    .attr("cy", 22)
    .attr("r", d => rScale(d))
    .attr("fill", "none")
    .attr("stroke", "#777777");

  // Vote-count labels for the size legend.
  legend.selectAll(".size-label")
    .data(sizes)
    .enter()
    .append("text")
    .attr("class", "legend-label size-label")
    .attr("x", (d, i) => i * 52)
    .attr("y", 48)
    .attr("text-anchor", "middle")
    .text(d => compactNumber(d));
}

function showTooltip(d) {
  tooltip
    .style("opacity", 1)
    .html(`<strong>${d.year} ${d.letter || ""}: ${d.subject}</strong>${d.outcome} · ${percentFormat(d.yesShare)}% yes · ${d3.format(",")(d.totalVotes)} votes<br>${d.typeLabel} · ${d.sponsorLabel}<br>Click to link the views.`);
  moveTooltip();
}

function showDecadeTooltip(d) {
  tooltip
    .style("opacity", 1)
    .html(`<strong>${d.decade} ballot measures</strong>${d.outcome}: ${d.count} of ${d.total} measures<br>Click to filter the individual-measure views.`);
  moveTooltip();
}

function moveTooltip() {
  tooltip
    .style("left", `${d3.event.clientX}px`)
    .style("top", `${d3.event.clientY}px`);
}

function hideTooltip() {
  tooltip.style("opacity", 0);
}

function selectMeasure(id) {
  selectedMeasureId = selectedMeasureId === id ? null : id;
  selectedDecade = null;
  applySelection();
}

function selectDecade(decade) {
  selectedDecade = selectedDecade === decade ? null : decade;
  selectedMeasureId = null;
  applySelection();
}

function applySelection() {
  if (selectedMeasureId) {
    highlightMeasure(selectedMeasureId);
    return;
  }

  if (selectedDecade) {
    highlightDecade(selectedDecade);
    return;
  }

  clearHighlights();
}

function highlightMeasure(id) {
  const activeMeasure = ballotData.find(d => d.id === id);

  d3.selectAll(".decade-bar")
    .classed("is-muted", d => Boolean(activeMeasure) && d.decade !== activeMeasure.decade)
    .classed("is-active", d => Boolean(activeMeasure) && d.decade === activeMeasure.decade);

  d3.selectAll(".measure-point,.parallel-line")
    .classed("is-muted", d => Boolean(id) && d.id !== id)
    .classed("is-active", d => Boolean(id) && d.id === id);
}

function highlightDecade(decade) {
  d3.selectAll(".decade-bar")
    .classed("is-muted", d => Boolean(decade) && d.decade !== decade)
    .classed("is-active", d => Boolean(decade) && d.decade === decade);

  d3.selectAll(".measure-point,.parallel-line")
    .classed("is-muted", d => Boolean(decade) && d.decade !== decade)
    .classed("is-active", d => Boolean(decade) && d.decade === decade);
}

function clearHighlights() {
  d3.selectAll(".decade-bar,.measure-point,.parallel-line")
    .classed("is-muted", false)
    .classed("is-active", false);
}

function uniqueSorted(values) {
  return Array.from(new Set(values)).sort((a, b) => d3.ascending(a, b));
}
