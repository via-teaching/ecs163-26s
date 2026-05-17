const LIKERT_ORDER = [
  "Strongly Disagree",
  "Disagree",
  "Neutral",
  "Agree",
  "Strongly Agree"
];

const FREQUENCY_ORDER = [
  "Rarely",
  "1-2 times a week",
  "3-4 times a week",
  "Daily"
];

const LIKERT_COLORS = {
  "Strongly Disagree": "#b23a48",
  "Disagree": "#e07a5f",
  "Neutral": "#a7adb4",
  "Agree": "#52a675",
  "Strongly Agree": "#1f7a8c"
};

const HEATMAP_QUESTIONS = [
  {
    key: "motivation",
    label: "Motivates exercise",
    column: "Has the fitness wearable helped you stay motivated to exercise?"
  },
  {
    key: "enjoyment",
    label: "Makes exercise enjoyable",
    column: "Do you think that the fitness wearable has made exercising more enjoyable?"
  },
  {
    key: "sleep",
    label: "Improves sleep patterns",
    column: "Has the fitness wearable improved your sleep patterns?"
  },
  {
    key: "wellbeing",
    label: "Improves overall well-being",
    column: "Do you feel that the fitness wearable has improved your overall well-being?"
  },
  {
    key: "exerciseMore",
    label: "Influences exercising more",
    column: "Has using a fitness wearable influenced your decision? [To exercise more?]"
  },
  {
    key: "dietChange",
    label: "Influences diet change",
    column: "Has using a fitness wearable influenced your decision? [To change your diet?]"
  },
  {
    key: "gymJoin",
    label: "Influences joining a gym/class",
    column: "Has using a fitness wearable influenced your decision? [To join a gym or fitness class?]"
  },
  {
    key: "purchase",
    label: "Influences fitness purchases",
    column: "Has using a fitness wearable influenced your decision? [To purchase other fitness-related products?]"
  }
];

const STACKED_QUESTIONS = [...HEATMAP_QUESTIONS];

const FIELD_MAP = {
  frequency: "How frequently do you use your fitness wearable?",
  motivation: "Has the fitness wearable helped you stay motivated to exercise?",
  wellbeing: "Do you feel that the fitness wearable has improved your overall well-being?"
};

const state = {
  raw: [],
  filteredFrequency: "All"
};

const tooltip = d3.select("#tooltip");

const formatPercent = d3.format(".0%");
const formatSmallPercent = d3.format(".1%");

// Normalize survey text so the dashboard can work with consistent ordered categories.
function normalizeLikert(value) {
  const clean = (value || "").trim().toLowerCase();
  if (!clean) return null;
  if (clean === "strongly agree") return "Strongly Agree";
  if (clean === "agree") return "Agree";
  if (clean === "neutral") return "Neutral";
  if (clean === "disagree") return "Disagree";
  if (clean === "strongly disagree") return "Strongly Disagree";
  return null;
}

function normalizeFrequency(value) {
  const clean = (value || "").trim();
  return FREQUENCY_ORDER.includes(clean) ? clean : null;
}

function prettifyNodeLabel(id) {
  const [, label] = id.split("|");
  return label;
}

function showTooltip(event, html) {
  tooltip
    .style("opacity", 1)
    .html(html)
    .style("left", `${event.clientX + 16}px`)
    .style("top", `${event.clientY + 16}px`);
}

function moveTooltip(event) {
  tooltip
    .style("left", `${event.clientX + 16}px`)
    .style("top", `${event.clientY + 16}px`);
}

function hideTooltip() {
  tooltip.style("opacity", 0);
}

function getFilteredData() {
  if (state.filteredFrequency === "All") return state.raw;
  return state.raw.filter(d => d.frequency === state.filteredFrequency);
}

function buildQuestionSummary(data, questions) {
  return questions.map(question => {
    const counts = Object.fromEntries(LIKERT_ORDER.map(level => [level, 0]));
    let total = 0;

    data.forEach(row => {
      const response = row.responses[question.key];
      if (!response) return;
      counts[response] += 1;
      total += 1;
    });

    return {
      ...question,
      total,
      values: LIKERT_ORDER.map(level => ({
        question: question.label,
        key: question.key,
        response: level,
        count: counts[level],
        total,
        share: total ? counts[level] / total : 0
      }))
    };
  });
}

function addLegend(svg, items, x, y, swatchWidth = 16) {
  const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${x}, ${y})`);

  const item = legend.selectAll("g")
    .data(items)
    .join("g")
    .attr("transform", (_, i) => `translate(${i * 112}, 0)`);

  item.append("rect")
    .attr("width", swatchWidth)
    .attr("height", 12)
    .attr("rx", 3)
    .attr("fill", d => d.color);

  item.append("text")
    .attr("x", swatchWidth + 6)
    .attr("y", 10)
    .text(d => d.label);
}

function renderHeatmap() {
  const container = document.getElementById("heatmap");
  const width = container.clientWidth;
  const height = container.clientHeight;
  const margin = { top: 26, right: 24, bottom: 52, left: 220 };

  d3.select(container).selectAll("svg").remove();
  const svg = d3.select(container).append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`);

  const data = buildQuestionSummary(getFilteredData(), HEATMAP_QUESTIONS);
  const cells = data.flatMap(d => d.values);
  const maxCount = d3.max(cells, d => d.count) || 1;
  const color = d3.scaleSequential(d3.interpolateYlGnBu).domain([0, maxCount]);
  d3.select("#density-legend-max").text(maxCount);

  const x = d3.scaleBand()
    .domain(LIKERT_ORDER)
    .range([margin.left, width - margin.right])
    .padding(0.08);

  const y = d3.scaleBand()
    .domain(data.map(d => d.label))
    .range([margin.top, height - margin.bottom])
    .padding(0.1);

  svg.append("text")
    .attr("class", "section-label")
    .attr("x", margin.left)
    .attr("y", 16)
    .text(`Overview • ${state.filteredFrequency === "All" ? "All usage frequencies" : state.filteredFrequency}`);

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(x))
    .call(g => g.select(".domain").remove());

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll("text").call(wrapText, margin.left - 24));

  svg.append("text")
    .attr("class", "axis-title")
    .attr("x", (margin.left + width - margin.right) / 2)
    .attr("y", height - 12)
    .attr("text-anchor", "middle")
    .text("Likert response");

  const rows = svg.append("g")
    .selectAll("g")
    .data(data)
    .join("g");

  rows.selectAll("rect")
    .data(d => d.values)
    .join("rect")
    .attr("x", d => x(d.response))
    .attr("y", d => y(d.question))
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("rx", 8)
    .attr("fill", d => color(d.count))
    .attr("stroke", "rgba(255,255,255,0.8)")
    .on("mousemove", (event, d) => {
      showTooltip(
        event,
        `<strong>${d.question}</strong><br>${d.response}: ${d.count} respondents<br>${formatPercent(d.share)} of valid responses`
      );
    })
    .on("mouseleave", hideTooltip);

  rows.selectAll("text.cell")
    .data(d => d.values)
    .join("text")
    .attr("class", "cell")
    .attr("x", d => x(d.response) + x.bandwidth() / 2)
    .attr("y", d => y(d.question) + y.bandwidth() / 2 + 4)
    .attr("text-anchor", "middle")
    .attr("font-size", 12)
    .attr("font-weight", 700)
    .attr("fill", d => d.count > maxCount * 0.45 ? "#f8fafc" : "#243b53")
    .text(d => d.total ? `${Math.round(d.share * 100)}%` : "0%");

}

function renderStackedBar() {
  const container = document.getElementById("stacked-bar");
  const width = container.clientWidth;
  const height = container.clientHeight;
  const margin = { top: 28, right: 22, bottom: 44, left: 228 };

  d3.select(container).selectAll("svg").remove();
  const svg = d3.select(container).append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`);

  const summary = buildQuestionSummary(getFilteredData(), STACKED_QUESTIONS)
    .map(question => {
      const row = { label: question.label, total: question.total };
      question.values.forEach(v => {
        row[v.response] = v.share;
        row[`${v.response}Count`] = v.count;
      });
      return row;
    });

  const x = d3.scaleLinear()
    .domain([0, 1])
    .range([margin.left, width - margin.right]);

  const y = d3.scaleBand()
    .domain(summary.map(d => d.label))
    .range([margin.top + 22, height - margin.bottom])
    .padding(0.16);

  const stack = d3.stack().keys(LIKERT_ORDER);
  const stacked = stack(summary);

  svg.append("text")
    .attr("class", "section-label")
    .attr("x", margin.left)
    .attr("y", 16)
    .text(`Focus view • ${state.filteredFrequency === "All" ? "All respondents" : state.filteredFrequency}`);

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(formatPercent))
    .call(g => g.select(".domain").remove());

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll("text").call(wrapText, margin.left - 30));

  svg.append("text")
    .attr("class", "axis-title")
    .attr("x", (margin.left + width - margin.right) / 2)
    .attr("y", height - 10)
    .attr("text-anchor", "middle")
    .text("Share of respondents");

  const groups = svg.append("g")
    .selectAll("g")
    .data(stacked)
    .join("g")
    .attr("fill", d => LIKERT_COLORS[d.key]);

  groups.selectAll("rect")
    .data(d => d.map(segment => ({ ...segment, key: d.key })))
    .join("rect")
    .attr("x", d => x(d[0]))
    .attr("y", d => y(d.data.label))
    .attr("width", d => Math.max(0, x(d[1]) - x(d[0])))
    .attr("height", y.bandwidth())
    .attr("rx", 5)
    .on("mousemove", (event, d) => {
      const count = d.data[`${d.key}Count`];
      const share = d.data[d.key];
      showTooltip(
        event,
        `<strong>${d.data.label}</strong><br>${d.key}: ${count} respondents<br>${formatPercent(share)} of valid responses`
      );
    })
    .on("mouseleave", hideTooltip);

  summary.forEach(row => {
    const positiveShare = (row.Agree || 0) + (row["Strongly Agree"] || 0);
    svg.append("text")
      .attr("x", x(positiveShare) + 6)
      .attr("y", y(row.label) + y.bandwidth() / 2 + 4)
      .attr("font-size", 12)
      .attr("font-weight", 700)
      .attr("fill", "#224")
      .text(`${Math.round(positiveShare * 100)}% positive`);
  });

  addLegend(
    svg,
    LIKERT_ORDER.map(label => ({ label, color: LIKERT_COLORS[label] })),
    margin.left-20,
    25
  );
}

function renderSankey() {
  const container = document.getElementById("sankey");
  const width = container.clientWidth;
  const height = container.clientHeight;
  const margin = { top: 42, right: 18, bottom: 22, left: 18 };

  d3.select(container).selectAll("svg").remove();
  const svg = d3.select(container).append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`);

  const rows = state.raw.filter(d => d.frequency && d.motivation && d.wellbeing);
  const grouped = d3.rollups(
    rows,
    values => values.length,
    d => d.frequency,
    d => d.motivation,
    d => d.wellbeing
  );

  const nodeIds = new Set();
  const linkMap = new Map();

  function addLink(source, target, value, motivation) {
    const key = `${source}->${target}`;
    const existing = linkMap.get(key);
    if (existing) {
      existing.value += value;
      return;
    }
    linkMap.set(key, { source, target, value, motivation });
  }

  grouped.forEach(([frequency, motivationGroups]) => {
    const freqId = `frequency|${frequency}`;
    nodeIds.add(freqId);

    motivationGroups.forEach(([motivation, wellbeingGroups]) => {
      const motId = `motivation|${motivation}`;
      nodeIds.add(motId);

      const firstHop = d3.sum(wellbeingGroups, d => d[1]);
      addLink(freqId, motId, firstHop, motivation);

      wellbeingGroups.forEach(([wellbeing, count]) => {
        const wellId = `wellbeing|${wellbeing}`;
        nodeIds.add(wellId);
        addLink(motId, wellId, count, motivation);
      });
    });
  });

  const nodes = Array.from(nodeIds, id => ({ id }));
  const links = Array.from(linkMap.values());
  const sankey = d3.sankey()
    .nodeId(d => d.id)
    .nodeWidth(18)
    .nodePadding(16)
    .nodeSort((a, b) => {
      const [aLayer, aLabel] = a.id.split("|");
      const [bLayer, bLabel] = b.id.split("|");
      const orderMap = {
        frequency: FREQUENCY_ORDER,
        motivation: LIKERT_ORDER,
        wellbeing: LIKERT_ORDER
      };
      return orderMap[aLayer].indexOf(aLabel) - orderMap[bLayer].indexOf(bLabel);
    })
    .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]]);

  const graph = sankey({
    nodes: nodes.map(d => ({ ...d })),
    links: links.map(d => ({ ...d }))
  });

  const linkColor = d3.scaleOrdinal()
    .domain(LIKERT_ORDER)
    .range(LIKERT_ORDER.map(level => LIKERT_COLORS[level]));

  svg.append("g")
    .attr("fill", "none")
    .selectAll("path")
    .data(graph.links)
    .join("path")
    .attr("d", d3.sankeyLinkHorizontal())
    .attr("stroke", d => linkColor(d.motivation))
    .attr("stroke-opacity", 0.38)
    .attr("stroke-width", d => Math.max(1, d.width))
    .on("mousemove", (event, d) => {
      showTooltip(
        event,
        `<strong>${prettifyNodeLabel(d.source.id)} → ${prettifyNodeLabel(d.target.id)}</strong><br>${d.value} respondents<br>${formatSmallPercent(d.value / state.raw.length)} of all respondents`
      );
    })
    .on("mouseleave", hideTooltip);

  const nodeFill = {
    frequency: "#d7c3a5",
    motivation: "#88b7b5",
    wellbeing: "#7ea37e"
  };

  const node = svg.append("g")
    .selectAll("g")
    .data(graph.nodes)
    .join("g");

  node.append("rect")
    .attr("x", d => d.x0)
    .attr("y", d => d.y0)
    .attr("height", d => Math.max(10, d.y1 - d.y0))
    .attr("width", d => d.x1 - d.x0)
    .attr("rx", 6)
    .attr("fill", d => nodeFill[d.id.split("|")[0]])
    .attr("stroke", "rgba(32, 45, 64, 0.25)")
    .on("mousemove", (event, d) => {
      const count = d3.sum(graph.links.filter(link => link.target.id === d.id), link => link.value)
        || d3.sum(graph.links.filter(link => link.source.id === d.id), link => link.value);
      showTooltip(
        event,
        `<strong>${prettifyNodeLabel(d.id)}</strong><br>${count} connected respondents`
      );
    })
    .on("mouseleave", hideTooltip);

  node.append("text")
    .attr("x", d => d.x0 < width / 2 ? d.x1 + 8 : d.x0 - 8)
    .attr("y", d => (d.y0 + d.y1) / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
    .attr("font-size", 12)
    .attr("fill", "#314352")
    .text(d => prettifyNodeLabel(d.id));

  [
    { x: graph.nodes.find(d => d.id.startsWith("frequency|"))?.x0 || 0, label: "Usage frequency" },
    { x: graph.nodes.find(d => d.id.startsWith("motivation|"))?.x0 || width / 2, label: "Motivation to exercise" },
    { x: graph.nodes.find(d => d.id.startsWith("wellbeing|"))?.x0 || width - 180, label: "Overall well-being" }
  ].forEach(section => {
    svg.append("text")
      .attr("class", "section-label")
      .attr("x", section.x)
      .attr("y", 18)
      .text(section.label);
  });

  addLegend(
    svg,
    LIKERT_ORDER.map(label => ({ label: `${label} motivation`, color: linkColor(label) })),
    16,
    height - 24
  );
}

function wrapText(textSelection, width) {
  textSelection.each(function () {
    const text = d3.select(this);
    const words = text.text().split(/\s+/).reverse();
    let word;
    let line = [];
    let lineNumber = 0;
    const lineHeight = 1.1;
    const y = text.attr("y");
    const dy = parseFloat(text.attr("dy") || 0);
    let tspan = text.text(null).append("tspan").attr("x", -10).attr("y", y).attr("dy", `${dy}em`);

    while ((word = words.pop())) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text.append("tspan")
          .attr("x", -10)
          .attr("y", y)
          .attr("dy", `${++lineNumber * lineHeight + dy}em`)
          .text(word);
      }
    }
  });
}

function populateFilter() {
  const options = ["All", ...FREQUENCY_ORDER];
  const select = d3.select("#frequency-filter");

  select.selectAll("option")
    .data(options)
    .join("option")
    .attr("value", d => d)
    .text(d => d);

  select.on("change", event => {
    state.filteredFrequency = event.target.value;
    renderHeatmap();
    renderStackedBar();
  });
}

function renderAll() {
  renderHeatmap();
  renderStackedBar();
  renderSankey();
}

d3.csv("data/survey 605.csv").then(rawData => {
  state.raw = rawData.map(row => {
    const responses = Object.fromEntries(
      HEATMAP_QUESTIONS.map(question => [question.key, normalizeLikert(row[question.column])])
    );

    return {
      frequency: normalizeFrequency(row[FIELD_MAP.frequency]),
      motivation: normalizeLikert(row[FIELD_MAP.motivation]),
      wellbeing: normalizeLikert(row[FIELD_MAP.wellbeing]),
      responses
    };
  });

  populateFilter();
  renderAll();

  window.addEventListener("resize", () => {
    renderAll();
  });
}).catch(error => {
  console.error("Failed to load survey data:", error);
});
