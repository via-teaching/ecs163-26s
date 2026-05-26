const state = {
  startYear: 1970,
  endYear: 2017,
  region: "All regions",
  metric: "incidents"
};

const colors = {
  incidents: "#2166ac",
  killed: "#b2182b",
  wounded: "#ef8a62",
  grid: "#e6ebf1",
  selected: "#dbeafe"
};

const margin = {
  trend: { top: 18, right: 58, bottom: 36, left: 58 },
  map: { top: 12, right: 18, bottom: 36, left: 18 },
  profile: { top: 18, right: 20, bottom: 104, left: 68 }
};

const numberFormat = d3.format(",");
const shortFormat = d3.format(".2s");
const pctFormat = d3.format(".0%");
const tooltip = d3.select("#tooltip");

let yearlyData = [];
let countryYearData = [];
let profileYearData = [];
let worldGeo;
let regionColor;

Promise.all([
  d3.csv("gtd_summary_data/yearly_region.csv", parseYearly),
  d3.csv("gtd_summary_data/country_year.csv", parseCountryYear),
  d3.csv("gtd_summary_data/profile_year.csv", parseProfileYear),
  d3.csv("gtd_summary_data/region_totals.csv", parseRegionTotal),
  d3.json("gtd_summary_data/world.geojson")
]).then(([yearly, countryYear, profileYear, regionTotals, world]) => {
  yearlyData = yearly;
  countryYearData = countryYear;
  profileYearData = profileYear;
  worldGeo = world;

  const regions = regionTotals.map(d => d.region);
  regionColor = d3.scaleOrdinal()
    .domain(regions)
    .range([
      "#2166ac", "#b2182b", "#1b7837", "#762a83", "#bf812d", "#01665e",
      "#7f3b08", "#c51b7d", "#5aae61", "#4393c3", "#d6604d", "#8073ac"
    ]);

  populateRegionSelect(regions);
  bindControls();
  updateAll();
  window.addEventListener("resize", debounce(updateAll, 120));
}).catch(error => {
  d3.select("body").append("pre")
    .style("padding", "24px")
    .text(`Could not load dashboard data:\n${error}`);
});

function parseYearly(d) {
  return {
    year: +d.year,
    region: d.region,
    incidents: +d.incidents,
    killed: +d.killed,
    wounded: +d.wounded,
    successRate: +d.success_rate
  };
}

function parseCountryYear(d) {
  return {
    year: +d.year,
    region: d.region,
    country: d.country,
    latitude: +d.latitude,
    longitude: +d.longitude,
    incidents: +d.incidents,
    killed: +d.killed,
    wounded: +d.wounded
  };
}

function parseProfileYear(d) {
  return {
    year: +d.year,
    region: d.region,
    attackType: d.attack_type,
    targetType: d.target_type,
    weaponType: d.weapon_type,
    incidents: +d.incidents,
    killed: +d.killed,
    wounded: +d.wounded,
    successRate: +d.success_rate
  };
}

function parseRegionTotal(d) {
  return { region: d.region, incidents: +d.incidents };
}

function populateRegionSelect(regions) {
  const select = d3.select("#region-select");
  select.selectAll("option")
    .data(["All regions"].concat(regions))
    .enter()
    .append("option")
    .attr("value", d => d)
    .text(d => d);
}

function bindControls() {
  d3.select("#region-select").on("change", function() {
    state.region = this.value;
    updateAll();
  });

  d3.select("#metric-select").on("change", function() {
    state.metric = this.value;
    updateAll();
  });

  d3.select("#start-year").on("input", function() {
    state.startYear = Math.min(+this.value, state.endYear);
    d3.select("#start-year").property("value", state.startYear);
    d3.select("#end-year").property("value", state.endYear);
    updateAll();
  });

  d3.select("#end-year").on("input", function() {
    state.endYear = Math.max(+this.value, state.startYear);
    d3.select("#end-year").property("value", state.endYear);
    d3.select("#start-year").property("value", state.startYear);
    updateAll();
  });
}

function updateAll() {
  d3.select("#start-label").text(state.startYear);
  d3.select("#end-label").text(state.endYear);
  d3.select("#trend-subtitle").text(activeLabel());
  d3.select("#map-subtitle").text(`${metricLabel(state.metric)} by country`);
  d3.select("#profile-subtitle").text("Top aggregated attack profiles");

  drawTrend();
  drawMap();
  drawProfile();
}

function drawTrend() {
  const svg = d3.select("#trend-chart");
  clear(svg);
  const size = chartSize(svg);
  const m = margin.trend;
  const width = Math.max(200, size.width - m.left - m.right);
  const height = Math.max(90, size.height - m.top - m.bottom);
  const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);

  const data = aggregateByYear(yearlyData);
  const x = d3.scaleLinear().domain([1970, 2017]).range([0, width]);
  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => Math.max(d.incidents, d.killed)) || 1])
    .nice()
    .range([height, 0]);

  const selected = g.append("rect")
    .attr("x", x(state.startYear))
    .attr("y", 0)
    .attr("width", Math.max(2, x(state.endYear) - x(state.startYear)))
    .attr("height", height)
    .attr("fill", colors.selected);

  g.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).ticks(4).tickSize(-width).tickFormat(""));

  const area = d3.area()
    .x(d => x(d.year))
    .y0(height)
    .y1(d => y(d.incidents))
    .curve(d3.curveMonotoneX);

  const lineIncidents = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.incidents))
    .curve(d3.curveMonotoneX);

  const lineKilled = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.killed))
    .curve(d3.curveMonotoneX);

  g.append("path")
    .datum(data)
    .attr("fill", "rgba(33, 102, 172, 0.16)")
    .attr("d", area);

  g.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", colors.incidents)
    .attr("stroke-width", 2.2)
    .attr("d", lineIncidents);

  g.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", colors.killed)
    .attr("stroke-width", 2)
    .attr("d", lineKilled);

  g.selectAll(".trend-hit")
    .data(data)
    .enter()
    .append("circle")
    .attr("class", "trend-hit")
    .attr("cx", d => x(d.year))
    .attr("cy", d => y(d.incidents))
    .attr("r", 7)
    .attr("fill", "transparent")
    .on("mouseover", function(d) {
      showTooltip(d3.event, "Year " + d.year, [
        `Incidents: ${numberFormat(d.incidents)}`,
        `Fatalities: ${numberFormat(d.killed)}`,
        `Wounded: ${numberFormat(d.wounded)}`
      ]);
    })
    .on("mouseout", hideTooltip);

  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(12));

  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(4).tickFormat(shortFormat));

  g.append("text")
    .attr("class", "axis-label")
    .attr("x", width / 2)
    .attr("y", height + 32)
    .attr("text-anchor", "middle")
    .text("Year");

  g.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -42)
    .attr("text-anchor", "middle")
    .text("Event count");

  drawLineLegend(g, width - 174, 5, [
    { label: "Incidents", color: colors.incidents },
    { label: "Fatalities", color: colors.killed }
  ]);

  selected.raise();
  selected.lower();
}

function drawMap() {
  const svg = d3.select("#map-chart");
  clear(svg);
  const size = chartSize(svg);
  const m = margin.map;
  const width = Math.max(240, size.width - m.left - m.right);
  const height = Math.max(240, size.height - m.top - m.bottom);
  const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);

  const data = aggregateCountries();
  const maxMetric = d3.max(data, d => d[state.metric]) || 1;
  const maxFatalityRate = d3.max(data, d => d.fatalityRate) || 1;

  const projection = d3.geoNaturalEarth1()
    .fitExtent([[8, 8], [width - 8, height - 36]], { type: "Sphere" });
  const path = d3.geoPath(projection);
  const radius = d3.scaleSqrt().domain([0, maxMetric]).range([2, 22]);
  const fatalityColor = d3.scaleSequential(d3.interpolateYlOrRd)
    .domain([0, maxFatalityRate || 1]);

  g.append("path")
    .datum({ type: "Sphere" })
    .attr("d", path)
    .attr("fill", "#f8fbff")
    .attr("stroke", "#b7c2cf");

  g.selectAll(".land")
    .data(worldGeo.features)
    .enter()
    .append("path")
    .attr("class", "land")
    .attr("d", path)
    .attr("fill", "#edf3f8")
    .attr("stroke", "#c7d2df")
    .attr("stroke-width", 0.45);

  g.append("path")
    .datum(d3.geoGraticule10())
    .attr("d", path)
    .attr("fill", "none")
    .attr("stroke", "#d9e1ea")
    .attr("stroke-width", 0.6);

  g.selectAll(".country-point")
    .data(data.filter(d => projection([d.longitude, d.latitude])))
    .enter()
    .append("circle")
    .attr("class", "country-point")
    .attr("cx", d => projection([d.longitude, d.latitude])[0])
    .attr("cy", d => projection([d.longitude, d.latitude])[1])
    .attr("r", d => radius(d[state.metric]))
    .attr("fill", d => fatalityColor(d.fatalityRate))
    .attr("stroke", "#243447")
    .attr("stroke-width", 0.45)
    .attr("fill-opacity", 0.72)
    .on("mouseover", function(d) {
      d3.select(this).attr("stroke-width", 1.8).attr("fill-opacity", 0.9);
      showTooltip(d3.event, d.country, [
        `Region: ${d.region}`,
        `Incidents: ${numberFormat(d.incidents)}`,
        `Fatalities: ${numberFormat(d.killed)}`,
        `Wounded: ${numberFormat(d.wounded)}`,
        `Fatalities per incident: ${d3.format(".2f")(d.fatalityRate)}`
      ]);
    })
    .on("mouseout", function() {
      d3.select(this).attr("stroke-width", 0.45).attr("fill-opacity", 0.72);
      hideTooltip();
    });

  const topCountries = data.slice().sort((a, b) => b[state.metric] - a[state.metric]).slice(0, 5);
  const note = g.append("g").attr("transform", `translate(12,${height - 108})`);
  note.append("rect")
    .attr("width", 210)
    .attr("height", 92)
    .attr("rx", 6)
    .attr("fill", "rgba(255,255,255,0.86)")
    .attr("stroke", "#d7dee7");
  note.append("text")
    .attr("class", "chart-title")
    .attr("x", 10)
    .attr("y", 18)
    .text(`Top ${metricLabel(state.metric).toLowerCase()}`);
  note.selectAll(".top-country")
    .data(topCountries)
    .enter()
    .append("text")
    .attr("class", "annotation")
    .attr("x", 10)
    .attr("y", (d, i) => 36 + i * 12)
    .text(d => `${truncate(d.country, 20)}: ${numberFormat(d[state.metric])}`);

  drawBubbleLegend(g, width - 128, height - 84, radius, maxMetric);
  drawColorLegend(g, width - 155, 12, fatalityColor, maxFatalityRate);
}

function drawProfile() {
  const svg = d3.select("#profile-chart");
  clear(svg);
  const size = chartSize(svg);
  const m = margin.profile;
  const width = Math.max(300, size.width - m.left - m.right);
  const height = Math.max(260, size.height - m.top - m.bottom);
  const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);

  const rows = aggregateProfiles();
  if (!rows.length) {
    g.append("text")
      .attr("class", "annotation")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .text("No profile data for the current filters.");
    return;
  }

  const dimensions = [
    { key: "region", label: "Region", type: "category" },
    { key: "attackType", label: "Attack", type: "category" },
    { key: "targetType", label: "Target", type: "category" },
    { key: "weaponType", label: "Weapon", type: "category" },
    { key: "fatalityRate", label: "Fatalities / incident", type: "number" }
  ];

  const x = d3.scalePoint()
    .domain(dimensions.map(d => d.key))
    .range([0, width])
    .padding(0.35);

  const y = {};
  dimensions.forEach(dim => {
    if (dim.type === "number") {
      y[dim.key] = d3.scaleLinear()
        .domain([0, d3.max(rows, d => d[dim.key]) || 1])
        .nice()
        .range([height, 0]);
    } else {
      const domain = unique(rows.map(d => d[dim.key]));
      y[dim.key] = d3.scalePoint()
        .domain(domain)
        .range([16, height - 12])
        .padding(0.35);
    }
  });

  const strokeWidth = d3.scaleSqrt()
    .domain([0, d3.max(rows, d => d.incidents) || 1])
    .range([0.8, 5]);

  g.selectAll(".profile-line")
    .data(rows)
    .enter()
    .append("path")
    .attr("class", "profile-line")
    .attr("d", d => profilePath(d, dimensions, x, y))
    .attr("fill", "none")
    .attr("stroke", d => regionColor(d.region))
    .attr("stroke-width", d => strokeWidth(d.incidents))
    .attr("stroke-opacity", 0.33)
    .on("mouseover", function(d) {
      d3.select(this).attr("stroke-opacity", 0.9).attr("stroke-width", strokeWidth(d.incidents) + 1.2).raise();
      showTooltip(d3.event, d.attackType, [
        `Region: ${d.region}`,
        `Target: ${d.targetType}`,
        `Weapon: ${d.weaponType}`,
        `Incidents: ${numberFormat(d.incidents)}`,
        `Fatalities per incident: ${d3.format(".2f")(d.fatalityRate)}`,
        `Success rate: ${pctFormat(d.successRate)}`
      ]);
    })
    .on("mouseout", function(d) {
      d3.select(this).attr("stroke-opacity", 0.33).attr("stroke-width", strokeWidth(d.incidents));
      hideTooltip();
    });

  const axes = g.selectAll(".profile-axis")
    .data(dimensions)
    .enter()
    .append("g")
    .attr("class", "profile-axis axis")
    .attr("transform", d => `translate(${x(d.key)},0)`);

  axes.each(function(dim) {
    const axis = dim.type === "number"
      ? d3.axisLeft(y[dim.key]).ticks(5).tickFormat(d3.format(".1f"))
      : d3.axisLeft(y[dim.key]).tickFormat(d => truncate(d, 15));
    d3.select(this).call(axis);
  });

  axes.append("text")
    .attr("class", "chart-title")
    .attr("x", 0)
    .attr("y", -8)
    .attr("text-anchor", "middle")
    .text(d => d.label);

  drawRegionLegend(g, 0, height + 24, width);
}

function aggregateByYear(source) {
  const map = new Map();
  source.filter(inRegion).forEach(d => {
    if (!map.has(d.year)) {
      map.set(d.year, { incidents: 0, killed: 0, wounded: 0 });
    }
    const row = map.get(d.year);
    row.incidents += d.incidents;
    row.killed += d.killed;
    row.wounded += d.wounded;
  });

  return d3.range(1970, 2018).map(year => {
    const found = map.get(year) || { incidents: 0, killed: 0, wounded: 0 };
    return { year, incidents: found.incidents, killed: found.killed, wounded: found.wounded };
  });
}

function aggregateCountries() {
  const rows = countryYearData.filter(d => inYearRange(d) && inRegion(d));
  const map = new Map();
  rows.forEach(d => {
    const key = `${d.country}|${d.region}`;
    if (!map.has(key)) {
      map.set(key, {
        country: d.country,
        region: d.region,
        incidents: 0,
        killed: 0,
        wounded: 0,
        latWeighted: 0,
        lonWeighted: 0
      });
    }
    const row = map.get(key);
    row.incidents += d.incidents;
    row.killed += d.killed;
    row.wounded += d.wounded;
    row.latWeighted += d.latitude * d.incidents;
    row.lonWeighted += d.longitude * d.incidents;
  });

  return Array.from(map.values())
    .map(d => Object.assign(d, {
      latitude: d.latWeighted / Math.max(1, d.incidents),
      longitude: d.lonWeighted / Math.max(1, d.incidents),
      fatalityRate: d.killed / Math.max(1, d.incidents)
    }))
    .filter(d => isFinite(d.latitude) && isFinite(d.longitude));
}

function aggregateProfiles() {
  const selected = profileYearData.filter(d => inYearRange(d) && inRegion(d));
  const attackTop = topCategories(selected, "attackType", 7);
  const targetTop = topCategories(selected, "targetType", 7);
  const weaponTop = topCategories(selected, "weaponType", 6);

  const mapped = selected.map(d => ({
    region: d.region,
    attackType: attackTop.has(d.attackType) ? d.attackType : "Other attack types",
    targetType: targetTop.has(d.targetType) ? d.targetType : "Other targets",
    weaponType: weaponTop.has(d.weaponType) ? d.weaponType : "Other weapons",
    incidents: d.incidents,
    killed: d.killed,
    wounded: d.wounded,
    successes: d.successRate * d.incidents
  }));

  const grouped = new Map();
  mapped.forEach(d => {
    const key = [d.region, d.attackType, d.targetType, d.weaponType].join("|");
    if (!grouped.has(key)) {
      grouped.set(key, {
        region: d.region,
        attackType: d.attackType,
        targetType: d.targetType,
        weaponType: d.weaponType,
        incidents: 0,
        killed: 0,
        wounded: 0,
        successes: 0
      });
    }
    const row = grouped.get(key);
    row.incidents += d.incidents;
    row.killed += d.killed;
    row.wounded += d.wounded;
    row.successes += d.successes;
  });

  return Array.from(grouped.values())
    .map(d => Object.assign(d, {
      fatalityRate: d.killed / Math.max(1, d.incidents),
      successRate: d.successes / Math.max(1, d.incidents)
    }))
    .sort((a, b) => b.incidents - a.incidents)
    .slice(0, 90);
}

function inYearRange(d) {
  return d.year >= state.startYear && d.year <= state.endYear;
}

function inRegion(d) {
  return state.region === "All regions" || d.region === state.region;
}

function topCategories(rows, key, limit) {
  const totals = new Map();
  rows.forEach(d => {
    totals.set(d[key], (totals.get(d[key]) || 0) + d.incidents);
  });
  return new Set(Array.from(totals, ([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
    .map(d => d.name));
}

function profilePath(row, dimensions, x, y) {
  return d3.line()(dimensions.map(dim => [x(dim.key), y[dim.key](row[dim.key])]));
}

function drawLineLegend(g, x, y, items) {
  const legend = g.append("g").attr("transform", `translate(${x},${y - 4})`);
  const rows = legend.selectAll("g").data(items).enter().append("g")
    .attr("transform", (d, i) => `translate(0,${i * 18})`);
  rows.append("line")
    .attr("x1", 0)
    .attr("x2", 22)
    .attr("y1", 6)
    .attr("y2", 6)
    .attr("stroke", d => d.color)
    .attr("stroke-width", 3);
  rows.append("text")
    .attr("class", "legend-label")
    .attr("x", 30)
    .attr("y", 10)
    .text(d => d.label);
}

function drawBubbleLegend(g, x, y, radius, maxValue) {
  const values = [maxValue / 4, maxValue].filter(d => d > 0);
  const legend = g.append("g").attr("transform", `translate(${x},${y})`);
  legend.append("text")
    .attr("class", "legend-label")
    .attr("x", 0)
    .attr("y", -8)
    .text(metricLabel(state.metric));
  values.forEach((value, i) => {
    legend.append("circle")
      .attr("cx", 24)
      .attr("cy", 38 - i * 24)
      .attr("r", radius(value))
      .attr("fill", "none")
      .attr("stroke", "#566273");
    legend.append("text")
      .attr("class", "legend-label")
      .attr("x", 54)
      .attr("y", 42 - i * 24)
      .text(shortFormat(value));
  });
}

function drawColorLegend(g, x, y, scale, maxValue) {
  const width = 118;
  const height = 8;
  const defs = g.append("defs");
  const gradient = defs.append("linearGradient")
    .attr("id", "fatality-gradient")
    .attr("x1", "0%")
    .attr("x2", "100%");
  d3.range(0, 1.01, 0.1).forEach(t => {
    gradient.append("stop")
      .attr("offset", `${t * 100}%`)
      .attr("stop-color", scale(t * maxValue));
  });

  const legend = g.append("g").attr("transform", `translate(${x},${y})`);
  legend.append("text")
    .attr("class", "legend-label")
    .attr("x", 0)
    .attr("y", -4)
    .text("Fatalities / incident");
  legend.append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "url(#fatality-gradient)");
  legend.append("text")
    .attr("class", "legend-label")
    .attr("x", 0)
    .attr("y", 23)
    .text("0");
  legend.append("text")
    .attr("class", "legend-label")
    .attr("x", width)
    .attr("y", 23)
    .attr("text-anchor", "end")
    .text(d3.format(".1f")(maxValue));
}

function drawRegionLegend(g, x, y, width) {
  const regions = regionColor.domain().filter(region => state.region === "All regions" || state.region === region);
  const shown = regions;
  const legend = g.append("g").attr("transform", `translate(${x},${y})`);
  legend.append("text")
    .attr("class", "legend-label")
    .attr("x", 0)
    .attr("y", 0)
    .text("Line color: region");
  const columns = width > 560 ? 4 : 3;
  const columnWidth = Math.max(112, Math.min(150, width / columns));
  const rows = legend.selectAll("g").data(shown).enter().append("g")
    .attr("transform", (d, i) => `translate(${(i % columns) * columnWidth},${14 + Math.floor(i / columns) * 15})`);
  rows.append("rect")
    .attr("width", 9)
    .attr("height", 9)
    .attr("fill", d => regionColor(d));
  rows.append("text")
    .attr("class", "legend-label")
    .attr("x", 14)
    .attr("y", 8)
    .text(d => truncate(d, 22));
}

function showTooltip(event, title, lines) {
  tooltip
    .style("opacity", 1)
    .style("left", `${event.clientX + 14}px`)
    .style("top", `${event.clientY + 14}px`)
    .html(`<strong>${title}</strong>${lines.join("<br>")}`);
}

function hideTooltip() {
  tooltip.style("opacity", 0);
}

function chartSize(svg) {
  const node = svg.node();
  return {
    width: node.clientWidth || 600,
    height: node.clientHeight || 360
  };
}

function clear(svg) {
  svg.selectAll("*").remove();
}

function metricLabel(metric) {
  return {
    incidents: "Incidents",
    killed: "Fatalities",
    wounded: "Wounded"
  }[metric];
}

function activeLabel() {
  const region = state.region === "All regions" ? "worldwide" : state.region;
  return `${region}, ${state.startYear}-${state.endYear}`;
}

function unique(values) {
  return Array.from(new Set(values));
}

function truncate(value, max) {
  const text = String(value);
  return text.length > max ? text.slice(0, max - 1) + "..." : text;
}

function debounce(fn, wait) {
  let timeout;
  return function() {
    clearTimeout(timeout);
    timeout = setTimeout(fn, wait);
  };
}
