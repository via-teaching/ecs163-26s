// Edgar Herrera - ECS 163 HW3
// fitness wearable survey dashboard

const ages = ["Under 18", "18-24", "25-34", "35-44", "45-54", "55-64"];
const engLevels = ["Very engaged", "Somewhat engaged", "Neutral", "Not very engaged"];

const engColors = {
  "Very engaged": "#2b8a3e",
  "Somewhat engaged": "#66d9e8",
  Neutral: "#adb5bd",
  "Not very engaged": "#e03131",
};

// likert -> number for averaging
const likert = {
  "Strongly disagree": 1,
  Disagree: 2,
  Neutral: 3,
  Agree: 4,
  "Strongly agree": 5,
};

const exerciseScale = {
  "Less than once a week": 1,
  "1-2 times a week": 2,
  "3-4 times a week": 3,
  "5 or more times a week": 4,
};

const useScale = {
  Rarely: 1,
  "1-2 times a week": 2,
  "3-4 times a week": 3,
  Daily: 4,
};

const engScale = {
  "Not very engaged": 1,
  Neutral: 2,
  "Somewhat engaged": 3,
  "Very engaged": 4,
};

const radarDims = [
  { key: "motivation", label: "Motivation" },
  { key: "enjoyment", label: "Enjoyment" },
  { key: "community", label: "Community" },
  { key: "wellBeing", label: "Well-being" },
  { key: "sleep", label: "Sleep" },
  { key: "exerciseMore", label: "Exercise more" },
];

const pcDims = [
  { key: "exerciseFreq", label: "Exercise / week", domain: [1, 4] },
  { key: "wearableUse", label: "Wearable use", domain: [1, 4] },
  { key: "engagementScore", label: "Engagement", domain: [1, 4] },
  { key: "motivation", label: "Motivation", domain: [1, 5] },
  { key: "enjoyment", label: "Enjoyment", domain: [1, 5] },
  { key: "wellBeing", label: "Well-being", domain: [1, 5] },
];

// shorter aliases for the long csv column names
const cols = {
  age: "What is your age?",
  exercise: "How often do you exercise in a week?",
  wearableUse: "How frequently do you use your fitness wearable?",
  engagement: "How engaged do you feel with your fitness wearable?",
  motivation: "Has the fitness wearable helped you stay motivated to exercise?",
  enjoyment: "Do you think that the fitness wearable has made exercising more enjoyable?",
  community: "Does using a fitness wearable make you feel more connected to the fitness community?",
  wellBeing: "Do you feel that the fitness wearable has improved your overall well-being?",
  sleep: "Has the fitness wearable improved your sleep patterns?",
  exerciseMore: "Has using a fitness wearable influenced your decision? [To exercise more?]",
};

const state = {
  allData: [],
  selectedAge: null,
  brushFilter: null,
  prevRadar: null,
  brushesBuilt: false,
};

let overviewG;
let radarG;
let pcG;
let pcLayout = {};

function parseRow(row, i) {
  return {
    id: i,
    age: row[cols.age],
    engagement: row[cols.engagement],
    exerciseFreq: exerciseScale[row[cols.exercise]] ?? null,
    wearableUse: useScale[row[cols.wearableUse]] ?? null,
    engagementScore: engScale[row[cols.engagement]] ?? null,
    motivation: likert[row[cols.motivation]] ?? null,
    enjoyment: likert[row[cols.enjoyment]] ?? null,
    community: likert[row[cols.community]] ?? null,
    wellBeing: likert[row[cols.wellBeing]] ?? null,
    sleep: likert[row[cols.sleep]] ?? null,
    exerciseMore: likert[row[cols.exerciseMore]] ?? null,
  };
}

function getFilteredData() {
  let out = state.allData;

  if (state.selectedAge) {
    out = out.filter(d => d.age === state.selectedAge);
  }

  if (state.brushFilter) {
    const { key, min, max } = state.brushFilter;
    out = out.filter(d => {
      const v = d[key];
      return v != null && v >= min && v <= max;
    });
  }

  return out;
}

function updateStatus() {
  const filtered = getFilteredData();
  const parts = [];

  if (state.selectedAge) parts.push("age group: " + state.selectedAge);
  if (state.brushFilter) {
    const d = pcDims.find(x => x.key === state.brushFilter.key);
    parts.push("brushed " + (d ? d.label : state.brushFilter.key));
  }

  const msg = parts.length === 0
    ? `Showing all ${state.allData.length} respondents`
    : `Showing ${filtered.length} respondent(s) - ${parts.join(", ")}`;

  d3.select("#selection-status").text(msg);
}

function buildOverview(svg) {
  const m = { top: 36, right: 20, bottom: 48, left: 52 };
  const w = +svg.attr("width") - m.left - m.right;
  const h = +svg.attr("height") - m.top - m.bottom;

  overviewG = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);

  // title
  overviewG.append("text")
    .attr("class", "chart-title")
    .attr("x", w / 2).attr("y", -18)
    .attr("text-anchor", "middle")
    .text("Engagement distribution by age (click a segment to filter)");

  // x axis label
  overviewG.append("text")
    .attr("class", "axis-label")
    .attr("x", w / 2).attr("y", h + 40)
    .attr("text-anchor", "middle")
    .text("Age group");

  // y axis label
  overviewG.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -h / 2).attr("y", -40)
    .attr("text-anchor", "middle")
    .text("Number of respondents");

  overviewG.append("g").attr("class", "overview-x-axis");
  overviewG.append("g").attr("class", "overview-y-axis");
  overviewG.append("g").attr("class", "overview-bars");
  overviewG.append("g").attr("class", "overview-legend");
}

function buildRadar(svg) {
  const m = { top: 36, right: 20, bottom: 20, left: 20 };
  const w = +svg.attr("width") - m.left - m.right;
  const h = +svg.attr("height") - m.top - m.bottom;

  radarG = svg.append("g")
    .attr("transform", `translate(${m.left + w / 2},${m.top + h / 2})`);

  // title
  radarG.append("text")
    .attr("class", "chart-title")
    .attr("x", 0)
    .attr("y", -(Math.min(w, h) / 2 - 10) - 22)
    .attr("text-anchor", "middle")
    .text("Average Likert scores for selected subset");

  radarG.append("g").attr("class", "radar-grid");
  radarG.append("g").attr("class", "radar-axes");

  // polygon (animates)
  radarG.append("path").attr("class", "radar-area")
    .attr("fill", "#66d9e8").attr("fill-opacity", 0.35);
  radarG.append("path").attr("class", "radar-line")
    .attr("fill", "none").attr("stroke", "#0b7285").attr("stroke-width", 2);

  radarG.append("g").attr("class", "radar-points");
  radarG.append("g").attr("class", "radar-labels");
}

function buildPC(svg) {
  const m = { top: 36, right: 24, bottom: 28, left: 24 };
  const w = +svg.attr("width") - m.left - m.right;
  const h = +svg.attr("height") - m.top - m.bottom;

  pcLayout = { margin: m, width: w, height: h };
  pcG = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);

  // title
  pcG.append("text")
    .attr("class", "chart-title")
    .attr("x", w / 2).attr("y", -18)
    .attr("text-anchor", "middle")
    .text("One line per respondent. Drag on an axis to brush.");

  pcG.append("g").attr("class", "parallel-lines");
  pcG.append("g").attr("class", "parallel-axes");
  pcG.append("g").attr("class", "parallel-brushes");
}

function stackOverview(data) {
  const counts = ages.map(age => {
    const row = { age };
    engLevels.forEach(level => {
      row[level] = data.filter(d => d.age === age && d.engagement === level).length;
    });
    return row;
  });

  const stack = d3.stack().keys(engLevels)(counts);
  return { counts, stack };
}

function updateOverview() {
  const filtered = getFilteredData();
  const svg = d3.select("#overview-svg");
  const m = { top: 36, right: 20, bottom: 48, left: 52 };
  const w = +svg.attr("width") - m.left - m.right;
  const h = +svg.attr("height") - m.top - m.bottom;

  const { stack } = stackOverview(filtered);
  const maxC = d3.max(stack, layer => d3.max(layer, d => d[1])) || 1;

  const x = d3.scaleBand().domain(ages).range([0, w]).padding(0.2);
  const y = d3.scaleLinear().domain([0, maxC]).nice().range([h, 0]);

  overviewG.select(".overview-x-axis")
    .attr("transform", `translate(0,${h})`)
    .call(d3.axisBottom(x))
    .selectAll("text").attr("class", "axis-label");

  overviewG.select(".overview-y-axis").call(d3.axisLeft(y).ticks(Math.min(maxC, 5)));

  // one group per engagement level
  const layers = overviewG.select(".overview-bars")
    .selectAll("g.layer").data(stack, d => d.key);
  const layersEnter = layers.enter().append("g").attr("class", "layer");
  layers.merge(layersEnter).attr("fill", d => engColors[d.key]);
  layers.exit().remove();

  // clickable rects
  const rects = overviewG.select(".overview-bars")
    .selectAll("g.layer").selectAll("rect")
    .data(d => d, d => d.data.age);

  rects.enter().append("rect")
    .attr("class", "bar-segment")
    .merge(rects)
    .attr("x", d => x(d.data.age))
    .attr("y", d => y(d[1]))
    .attr("width", x.bandwidth())
    .attr("height", d => y(d[0]) - y(d[1]))
    .classed("selected", d => state.selectedAge === d.data.age)
    .on("click", (e, d) => {
      state.selectedAge = state.selectedAge === d.data.age ? null : d.data.age;
      updateAll();
    });

  rects.exit().remove();

  // legend
  const legend = overviewG.select(".overview-legend")
    .selectAll("g.legend-item").data(engLevels);

  const legendEnter = legend.enter().append("g")
    .attr("class", "legend-item")
    .attr("transform", (_, i) => `translate(${i * 118}, ${h + 18})`);

  legendEnter.append("rect").attr("width", 12).attr("height", 12);
  legendEnter.append("text").attr("class", "legend-label").attr("x", 16).attr("y", 10);

  legend.merge(legendEnter).select("rect").attr("fill", d => engColors[d]);
  legend.merge(legendEnter).select("text").text(d => d);
  legend.exit().remove();
}

function radarPath(vals, angleS, rS) {
  const pts = vals.map((v, i) => {
    const a = angleS(i) - Math.PI / 2;
    return [Math.cos(a) * rS(v), Math.sin(a) * rS(v)];
  });
  return d3.line().curve(d3.curveLinearClosed)(pts);
}

function radarAverages(data) {
  return radarDims.map(dim => {
    const vals = data.map(d => d[dim.key]).filter(v => v != null);
    return vals.length ? d3.mean(vals) : 3;
  });
}

function updateRadar() {
  const filtered = getFilteredData();
  const svg = d3.select("#radar-svg");
  const m = { top: 36, right: 20, bottom: 20, left: 20 };
  const w = +svg.attr("width") - m.left - m.right;
  const h = +svg.attr("height") - m.top - m.bottom;
  const r = Math.min(w, h) / 2 - 10;

  const vals = radarAverages(filtered);
  const startVals = state.prevRadar || vals;
  const angleS = d3.scaleLinear().domain([0, radarDims.length]).range([0, 2 * Math.PI]);
  const rS = d3.scaleLinear().domain([1, 5]).range([0, r]);

  // grid rings
  const ring = radarG.select(".radar-grid").selectAll("circle").data([1, 2, 3, 4, 5]);
  ring.enter().append("circle").merge(ring)
    .attr("r", d => rS(d))
    .attr("fill", "none")
    .attr("stroke", "#d9e2ec");
  ring.exit().remove();

  // spokes
  const axes = radarG.select(".radar-axes").selectAll("g.axis").data(radarDims);
  const axesEnter = axes.enter().append("g").attr("class", "axis");
  axesEnter.append("line").attr("stroke", "#bcccdc");
  axes.merge(axesEnter).select("line")
    .attr("x1", 0).attr("y1", 0)
    .attr("x2", (_, i) => Math.cos(angleS(i) - Math.PI / 2) * r)
    .attr("y2", (_, i) => Math.sin(angleS(i) - Math.PI / 2) * r);
  axes.exit().remove();

  // labels
  const labs = radarG.select(".radar-labels").selectAll("text").data(radarDims);
  labs.enter().append("text").attr("class", "axis-label").merge(labs)
    .attr("text-anchor", "middle")
    .attr("x", (_, i) => Math.cos(angleS(i) - Math.PI / 2) * (r + 16))
    .attr("y", (_, i) => Math.sin(angleS(i) - Math.PI / 2) * (r + 16))
    .text(d => d.label);
  labs.exit().remove();

  // ANIMATED TRANSITION - polygon morphs between subgroup averages
  radarG.select(".radar-area")
    .transition().duration(400)
    .attrTween("d", () => (t) => {
      const interp = startVals.map((v, i) => d3.interpolateNumber(v, vals[i])(t));
      return radarPath(interp, angleS, rS);
    });

  radarG.select(".radar-line")
    .transition().duration(700)
    .attrTween("d", () => (t) => {
      const interp = startVals.map((v, i) => d3.interpolateNumber(v, vals[i])(t));
      return radarPath(interp, angleS, rS);
    });

  // dots
  const pts = radarG.select(".radar-points").selectAll("circle").data(vals);
  pts.enter().append("circle").merge(pts)
    .transition().duration(700)
    .attr("cx", (_, i) => Math.cos(angleS(i) - Math.PI / 2) * rS(vals[i]))
    .attr("cy", (_, i) => Math.sin(angleS(i) - Math.PI / 2) * rS(vals[i]))
    .attr("r", 4).attr("fill", "#0b7285");
  pts.exit().remove();

  state.prevRadar = vals.slice();
}

function setupBrushes() {
  if (state.brushesBuilt) return;

  const { width, height } = pcLayout;
  const x = d3.scalePoint().domain(pcDims.map(d => d.key)).range([0, width]).padding(0.15);
  const yScales = {};
  pcDims.forEach(dim => {
    yScales[dim.key] = d3.scaleLinear().domain(dim.domain).range([height, 0]);
  });

  const groups = pcG.select(".parallel-brushes")
    .selectAll("g.brush").data(pcDims, d => d.key)
    .enter().append("g")
    .attr("class", "brush")
    .attr("transform", d => `translate(${x(d.key)},0)`);

  groups.each(function (dim) {
    const b = d3.brushY()
      .extent([[-12, 0], [12, height]])
      .on("end", (e) => {
        if (!e.selection) {
          state.brushFilter = null;
        } else {
          const [y0, y1] = e.selection;
          const min = yScales[dim.key].invert(y1);
          const max = yScales[dim.key].invert(y0);
          state.brushFilter = { key: dim.key, min: Math.min(min, max), max: Math.max(min, max) };
        }
        updateAll();
      });

    d3.select(this).call(b);
  });

  state.brushesBuilt = true;
}

function updatePC() {
  const all = state.allData;
  const filteredIds = new Set(getFilteredData().map(d => d.id));
  const { width, height } = pcLayout;

  const x = d3.scalePoint().domain(pcDims.map(d => d.key)).range([0, width]).padding(0.15);
  const yScales = {};
  pcDims.forEach(dim => {
    yScales[dim.key] = d3.scaleLinear().domain(dim.domain).range([height, 0]);
  });

  const line = d3.line()
    .defined(d => d.value != null)
    .x(d => x(d.key))
    .y(d => yScales[d.key](d.value));

  // one line per respondent
  const lineData = all.map(row => ({
    id: row.id,
    points: pcDims.map(dim => ({ key: dim.key, value: row[dim.key] })),
  }));

  const lines = pcG.select(".parallel-lines")
    .selectAll("path.parallel-line").data(lineData, d => d.id);

  lines.enter().append("path")
    .attr("class", "parallel-line")
    .attr("stroke", "#364fc7")
    .merge(lines)
    .transition().duration(400)
    .attr("d", d => line(d.points))
    .attr("opacity", d => filteredIds.has(d.id) ? 0.95 : 0.08)
    .attr("stroke-width", d => filteredIds.has(d.id) ? 2.5 : 1.2);
  lines.exit().remove();

  // axes
  const axes = pcG.select(".parallel-axes")
    .selectAll("g.axis").data(pcDims, d => d.key);
  const axesEnter = axes.enter().append("g").attr("class", "axis")
    .attr("transform", d => `translate(${x(d.key)},0)`);

  axesEnter.append("line").attr("stroke", "#829ab1");
  axesEnter.append("g").attr("class", "axis-ticks");
  axesEnter.append("text").attr("class", "axis-label").attr("y", -8).attr("text-anchor", "middle");

  axes.merge(axesEnter).select("line").attr("y1", 0).attr("y2", height);

  axes.merge(axesEnter).select(".axis-ticks").call(sel => {
    sel.each(function (dim) {
      d3.select(this).call(d3.axisLeft(yScales[dim.key]).ticks(5));
    });
  });

  axes.merge(axesEnter).select("text").text(d => d.label);
  axes.exit().remove();

  setupBrushes();
}

function updateAll() {
  updateStatus();
  updateOverview();
  updateRadar();
  updatePC();
}

function fitSvg(svg, panelSel) {
  const panel = document.querySelector(panelSel);
  const w = panel.clientWidth - 8;
  const h = panel.clientHeight - 36;
  svg.attr("width", Math.max(w, 320)).attr("height", Math.max(h, 240));
}

function init(data) {
  state.allData = data.map(parseRow);
  console.log("loaded", state.allData.length, "rows");

  const overviewSvg = d3.select("#overview-svg");
  const radarSvg = d3.select("#radar-svg");
  const pcSvg = d3.select("#parallel-svg");

  fitSvg(overviewSvg, "#overview-panel");
  fitSvg(radarSvg, "#radar-panel");
  fitSvg(pcSvg, "#parallel-panel");

  overviewSvg.selectAll("*").remove();
  radarSvg.selectAll("*").remove();
  pcSvg.selectAll("*").remove();

  state.brushesBuilt = false;
  state.prevRadar = null;

  buildOverview(overviewSvg);
  buildRadar(radarSvg);
  buildPC(pcSvg);
  updateAll();

  window.addEventListener("resize", () => {
    fitSvg(overviewSvg, "#overview-panel");
    fitSvg(radarSvg, "#radar-panel");
    fitSvg(pcSvg, "#parallel-panel");

    overviewSvg.selectAll("*").remove();
    radarSvg.selectAll("*").remove();
    pcSvg.selectAll("*").remove();

    state.brushesBuilt = false;
    state.prevRadar = null;

    buildOverview(overviewSvg);
    buildRadar(radarSvg);
    buildPC(pcSvg);
    updateAll();
  });
}

d3.csv("survey 605.csv").then(init).catch(err => {
  console.error("csv load failed:", err);
  d3.select("#selection-status").text("Could not load survey data.");
});
