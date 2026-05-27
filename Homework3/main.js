const FREQUENCY_ORDER = [
  "Rarely",
  "1-2 times a week",
  "3-4 times a week",
  "Daily"
];

const LIKERT_ORDER = [
  "Strongly Disagree",
  "Disagree",
  "Neutral",
  "Agree",
  "Strongly Agree"
];

const FREQUENCY_COLORS = {
  "Rarely": "#c97f5d",
  "1-2 times a week": "#d9b26f",
  "3-4 times a week": "#4f8a8b",
  "Daily": "#15616d"
};

const LIKERT_COLORS = {
  "Strongly Disagree": "#b23a48",
  "Disagree": "#e07a5f",
  "Neutral": "#b4b8bd",
  "Agree": "#60a57c",
  "Strongly Agree": "#15616d"
};

const QUESTIONS = [
  {
    key: "motivation",
    label: "Stay motivated to exercise",
    column: "Has the fitness wearable helped you stay motivated to exercise?"
  },
  {
    key: "enjoyment",
    label: "Exercise is more enjoyable",
    column: "Do you think that the fitness wearable has made exercising more enjoyable?"
  },
  {
    key: "sleep",
    label: "Sleep patterns improve",
    column: "Has the fitness wearable improved your sleep patterns?"
  },
  {
    key: "wellbeing",
    label: "Overall well-being improves",
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

const FIELD_MAP = {
  frequency: "How frequently do you use your fitness wearable?",
  motivation: "Has the fitness wearable helped you stay motivated to exercise?",
  wellbeing: "Do you feel that the fitness wearable has improved your overall well-being?"
};

const tooltip = d3.select("#tooltip");

const state = {
  raw: [],
  selectedFrequency: "All",
  brushedIds: new Set(),
  brushSelection: null,
  zoomTransform: d3.zoomIdentity,
  overviewApi: null
};

function normalizeLikert(value) {
  const clean = (value || "").trim().toLowerCase();
  if (clean === "strongly disagree") return "Strongly Disagree";
  if (clean === "disagree") return "Disagree";
  if (clean === "neutral") return "Neutral";
  if (clean === "agree") return "Agree";
  if (clean === "strongly agree") return "Strongly Agree";
  return null;
}

function likertScore(label) {
  const index = LIKERT_ORDER.indexOf(label);
  return index === -1 ? null : index - 2;
}

function normalizeFrequency(value) {
  const clean = (value || "").trim();
  return FREQUENCY_ORDER.includes(clean) ? clean : null;
}

function average(values) {
  const valid = values.filter(value => value !== null && value !== undefined && !Number.isNaN(value));
  return valid.length ? d3.mean(valid) : null;
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

function formatSubsetLabel() {
  if (state.brushedIds.size > 0) return "Brushed subset";
  if (state.selectedFrequency !== "All") return `${state.selectedFrequency} respondents`;
  return "All respondents";
}

function getFrequencyFilteredData() {
  if (state.selectedFrequency === "All") return state.raw;
  return state.raw.filter(d => d.frequency === state.selectedFrequency);
}

function getActiveData() {
  const filtered = getFrequencyFilteredData();
  if (!state.brushedIds.size) return filtered;
  return filtered.filter(d => state.brushedIds.has(d.id));
}

function updateSelectionSummary() {
  const base = getFrequencyFilteredData();
  const active = getActiveData();
  const parts = [
    `${active.length} active respondent${active.length === 1 ? "" : "s"}`
  ];

  if (state.selectedFrequency !== "All") {
    parts.push(`frequency: ${state.selectedFrequency}`);
  } else {
    parts.push("frequency: all groups");
  }

  if (state.brushedIds.size) {
    parts.push(`brush from ${base.length}`);
  } else {
    parts.push("no brush applied");
  }

  d3.select("#selection-summary").text(parts.join(" | "));
}

function populateFrequencyButtons() {
  const options = ["All", ...FREQUENCY_ORDER];
  const container = d3.select("#frequency-buttons");

  container.selectAll("button")
    .data(options)
    .join("button")
    .attr("type", "button")
    .attr("class", d => d === state.selectedFrequency ? "active" : null)
    .text(d => d)
    .on("click", (_, value) => {
      state.selectedFrequency = value;
      state.brushedIds.clear();
      state.brushSelection = null;
      updateControls();
      renderAll();
    });
}

function updateControls() {
  d3.select("#frequency-buttons")
    .selectAll("button")
    .attr("class", d => d === state.selectedFrequency ? "active" : null);

  updateSelectionSummary();
}

function preprocessRow(row, index) {
  const responses = {};
  const scores = {};

  QUESTIONS.forEach(question => {
    const label = normalizeLikert(row[question.column]);
    responses[question.key] = label;
    scores[question.key] = likertScore(label);
  });

  const exerciseSupport = average([
    scores.motivation,
    scores.enjoyment,
    scores.exerciseMore
  ]);

  const lifestyleChange = average([
    scores.sleep,
    scores.wellbeing,
    scores.dietChange,
    scores.gymJoin,
    scores.purchase
  ]);

  const avgImpact = average(Object.values(scores));
  const validResponses = Object.values(scores).filter(value => value !== null).length;

  return {
    id: index,
    frequency: normalizeFrequency(row[FIELD_MAP.frequency]),
    motivation: normalizeLikert(row[FIELD_MAP.motivation]),
    wellbeing: normalizeLikert(row[FIELD_MAP.wellbeing]),
    responses,
    scores,
    exerciseSupport,
    lifestyleChange,
    avgImpact,
    validResponses
  };
}

function buildQuestionMetrics(data) {
  return QUESTIONS.map(question => {
    const valid = data.filter(d => d.responses[question.key]);
    const positiveCount = valid.filter(d => {
      const label = d.responses[question.key];
      return label === "Agree" || label === "Strongly Agree";
    }).length;

    const averageScore = average(valid.map(d => d.scores[question.key]));

    return {
      ...question,
      total: valid.length,
      positiveCount,
      positiveShare: valid.length ? positiveCount / valid.length : 0,
      averageScore
    };
  });
}

function renderOverview() {
  const container = document.getElementById("overview");
  const width = container.clientWidth;
  const height = container.clientHeight;
  const margin = { top: 28, right: 24, bottom: 58, left: 66 };

  d3.select(container).selectAll("svg").remove();

  const svg = d3.select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`);

  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const data = getFrequencyFilteredData().filter(d => d.exerciseSupport !== null && d.lifestyleChange !== null);

  if (!data.length) {
    svg.append("text")
      .attr("class", "empty-state")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .text("No respondents match the current frequency filter.");
    return;
  }

  const x = d3.scaleLinear()
    .domain([-2.3, 2.3])
    .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
    .domain([-2.3, 2.3])
    .range([height - margin.bottom, margin.top]);

  const xAxisGroup = svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0, ${height - margin.bottom})`);

  const yAxisGroup = svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${margin.left}, 0)`);

  const grid = svg.append("g");
  const dotsGroup = svg.append("g");

  svg.append("text")
    .attr("class", "section-tag")
    .attr("x", margin.left)
    .attr("y", 18)
    .text(`Context view • ${state.selectedFrequency === "All" ? "all usage groups" : state.selectedFrequency}`);

  svg.append("text")
    .attr("class", "axis-title")
    .attr("x", (margin.left + width - margin.right) / 2)
    .attr("y", height - 12)
    .attr("text-anchor", "middle")
    .text("Exercise support score  ← lower disagreement | higher agreement →");

  svg.append("text")
    .attr("class", "axis-title")
    .attr("transform", `translate(18, ${(margin.top + height - margin.bottom) / 2}) rotate(-90)`)
    .attr("text-anchor", "middle")
    .text("Lifestyle change score");

  const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${margin.left}, ${height - 28})`);

  legend.selectAll("g")
    .data(FREQUENCY_ORDER)
    .join("g")
    .attr("transform", (_, i) => `translate(${i * 122}, 0)`)
    .call(group => {
      group.append("circle")
        .attr("r", 5)
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("fill", d => FREQUENCY_COLORS[d]);

      group.append("text")
        .attr("x", 10)
        .attr("y", 4)
        .text(d => d);
    });

  function drawGrid(zx, zy) {
    const xTicks = zx.ticks(5);
    const yTicks = zy.ticks(5);

    const vertical = grid.selectAll("line.grid-x")
      .data(xTicks, d => d);

    vertical.join(
      enter => enter.append("line")
        .attr("class", "grid-x")
        .attr("stroke", "rgba(56, 74, 89, 0.1)")
        .attr("y1", margin.top)
        .attr("y2", height - margin.bottom)
        .attr("x1", d => zx(d))
        .attr("x2", d => zx(d)),
      update => update
        .attr("x1", d => zx(d))
        .attr("x2", d => zx(d)),
      exit => exit.remove()
    );

    const horizontal = grid.selectAll("line.grid-y")
      .data(yTicks, d => d);

    horizontal.join(
      enter => enter.append("line")
        .attr("class", "grid-y")
        .attr("stroke", "rgba(56, 74, 89, 0.1)")
        .attr("x1", margin.left)
        .attr("x2", width - margin.right)
        .attr("y1", d => zy(d))
        .attr("y2", d => zy(d)),
      update => update
        .attr("y1", d => zy(d))
        .attr("y2", d => zy(d)),
      exit => exit.remove()
    );
  }

  function renderPoints(zx, zy) {
    const points = dotsGroup.selectAll("circle")
      .data(data, d => d.id);

    points.join(
      enter => enter.append("circle")
        .attr("cx", d => zx(d.exerciseSupport))
        .attr("cy", d => zy(d.lifestyleChange))
        .attr("r", 0)
        .attr("fill", d => FREQUENCY_COLORS[d.frequency] || "#94a3b8")
        .attr("fill-opacity", 0.78)
        .attr("stroke", "#fffdf8")
        .attr("stroke-width", 1.2)
        .on("mousemove", (event, d) => {
          showTooltip(
            event,
            `<strong>Respondent ${d.id + 1}</strong><br>` +
            `Usage frequency: ${d.frequency || "Unknown"}<br>` +
            `Exercise support score: ${d.exerciseSupport.toFixed(2)}<br>` +
            `Lifestyle change score: ${d.lifestyleChange.toFixed(2)}<br>` +
            `Average impact score: ${d.avgImpact?.toFixed(2) ?? "N/A"}`
          );
        })
        .on("mouseleave", hideTooltip)
        .call(enter => enter.transition().duration(550).attr("r", 5.5)),
      update => update,
      exit => exit.remove()
    )
      .transition()
      .duration(250)
      .attr("cx", d => zx(d.exerciseSupport))
      .attr("cy", d => zy(d.lifestyleChange))
      .attr("opacity", d => state.brushedIds.size && !state.brushedIds.has(d.id) ? 0.18 : 0.9)
      .attr("r", d => state.brushedIds.has(d.id) ? 7.5 : 5.5)
      .attr("stroke", d => state.brushedIds.has(d.id) ? "#1f2933" : "#fffdf8")
      .attr("stroke-width", d => state.brushedIds.has(d.id) ? 1.8 : 1.2);
  }

  function refreshOverviewVisuals() {
    const zx = state.zoomTransform.rescaleX(x);
    const zy = state.zoomTransform.rescaleY(y);

    xAxisGroup.call(d3.axisBottom(zx).ticks(5));
    yAxisGroup.call(d3.axisLeft(zy).ticks(5));
    drawGrid(zx, zy);
    renderPoints(zx, zy);
  }

  const brush = d3.brush()
    .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]])
    .on("brush end", event => {
      state.brushSelection = event.selection;
      if (!event.selection) {
        state.brushedIds.clear();
      } else {
        const [[x0, y0], [x1, y1]] = event.selection;
        const zx = state.zoomTransform.rescaleX(x);
        const zy = state.zoomTransform.rescaleY(y);
        const nextIds = data
          .filter(d => {
            const px = zx(d.exerciseSupport);
            const py = zy(d.lifestyleChange);
            return px >= x0 && px <= x1 && py >= y0 && py <= y1;
          })
          .map(d => d.id);
        state.brushedIds = new Set(nextIds);
      }

      updateControls();
      renderBars();
      renderSankey();
      refreshOverviewVisuals();
    });

  const brushGroup = svg.append("g")
    .attr("class", "brush")
    .call(brush);

  const zoom = d3.zoom()
    .scaleExtent([1, 5])
    .translateExtent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]])
    .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]])
    .on("zoom", event => {
      state.zoomTransform = event.transform;
      refreshOverviewVisuals();
      if (state.brushSelection) {
        brushGroup.call(brush.move, state.brushSelection);
      }
    });

  svg.call(zoom);
  svg.on("dblclick.zoom", null);

  state.overviewApi = {
    clearBrush() {
      brushGroup.call(brush.move, null);
    },
    resetZoom() {
      svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
    }
  };

  refreshOverviewVisuals();
}

function renderBars() {
  const container = document.getElementById("bars");
  const width = container.clientWidth;
  const height = container.clientHeight;
  const margin = { top: 28, right: 42, bottom: 40, left: 210 };

  d3.select(container).selectAll("svg").remove();
  const svg = d3.select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`);

  const active = getActiveData();
  const base = getFrequencyFilteredData();

  if (!active.length) {
    svg.append("text")
      .attr("class", "empty-state")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .text("Brush respondents in the overview to populate this focus view.");
    return;
  }

  const currentMetrics = buildQuestionMetrics(active);
  const baselineMetrics = new Map(buildQuestionMetrics(base).map(d => [d.key, d]));

  currentMetrics.sort((a, b) => d3.descending(a.positiveShare, b.positiveShare));

  const x = d3.scaleLinear()
    .domain([0, 1])
    .range([margin.left, width - margin.right]);

  const y = d3.scaleBand()
    .domain(currentMetrics.map(d => d.label))
    .range([margin.top + 18, height - margin.bottom])
    .padding(0.24);

  svg.append("text")
    .attr("class", "section-tag")
    .attr("x", margin.left)
    .attr("y", 16)
    .text(`Focus subset • ${formatSubsetLabel()}`);

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format(".0%")))
    .call(g => g.select(".domain").remove());

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y))
    .call(g => g.select(".domain").remove());

  svg.append("text")
    .attr("class", "axis-title")
    .attr("x", (margin.left + width - margin.right) / 2)
    .attr("y", height - 10)
    .attr("text-anchor", "middle")
    .text("Share of respondents who answered Agree or Strongly Agree");

  svg.selectAll("line.reference")
    .data(currentMetrics)
    .join("line")
    .attr("class", "reference")
    .attr("x1", d => x(baselineMetrics.get(d.key)?.positiveShare || 0))
    .attr("x2", d => x(baselineMetrics.get(d.key)?.positiveShare || 0))
    .attr("y1", d => y(d.label) - 2)
    .attr("y2", d => y(d.label) + y.bandwidth() + 2)
    .attr("stroke", "rgba(36, 48, 61, 0.22)")
    .attr("stroke-dasharray", "4 4");

  svg.selectAll("rect.bar-bg")
    .data(currentMetrics)
    .join("rect")
    .attr("class", "bar-bg")
    .attr("x", margin.left)
    .attr("y", d => y(d.label))
    .attr("width", x(1) - margin.left)
    .attr("height", y.bandwidth())
    .attr("rx", 10)
    .attr("fill", "rgba(96, 116, 128, 0.08)");

  svg.selectAll("rect.bar")
    .data(currentMetrics, d => d.key)
    .join(
      enter => enter.append("rect")
        .attr("class", "bar")
        .attr("x", margin.left)
        .attr("y", d => y(d.label))
        .attr("height", y.bandwidth())
        .attr("width", 0)
        .attr("rx", 10)
        .attr("fill", "#15616d")
        .on("mousemove", (event, d) => {
          const baseline = baselineMetrics.get(d.key)?.positiveShare || 0;
          showTooltip(
            event,
            `<strong>${d.label}</strong><br>` +
            `Active subset: ${d3.format(".0%")(d.positiveShare)} (${d.positiveCount}/${d.total})<br>` +
            `Baseline for current frequency filter: ${d3.format(".0%")(baseline)}`
          );
        })
        .on("mouseleave", hideTooltip)
        .call(enter => enter.transition().duration(700).attr("width", d => x(d.positiveShare) - margin.left)),
      update => update,
      exit => exit.remove()
    )
    .transition()
    .duration(700)
    .ease(d3.easeCubicInOut)
    .attr("y", d => y(d.label))
    .attr("height", y.bandwidth())
    .attr("width", d => x(d.positiveShare) - margin.left);

  svg.selectAll("text.bar-label")
    .data(currentMetrics, d => d.key)
    .join("text")
    .attr("class", "bar-label")
    .attr("x", d => x(d.positiveShare) + 8)
    .attr("y", d => y(d.label) + y.bandwidth() / 2 + 4)
    .attr("fill", "#1f2933")
    .attr("font-size", 12)
    .attr("font-weight", 700)
    .text(d => d3.format(".0%")(d.positiveShare));
}

function buildSankeyGraph(rows) {
  const validRows = rows.filter(d => d.frequency && d.motivation && d.wellbeing);
  const nodeIds = new Set();
  const linkMap = new Map();

  function addLink(source, target, value, keyColor) {
    const key = `${source}->${target}`;
    if (!linkMap.has(key)) {
      linkMap.set(key, { source, target, value: 0, keyColor });
    }
    linkMap.get(key).value += value;
  }

  const grouped = d3.rollups(
    validRows,
    values => values.length,
    d => d.frequency,
    d => d.motivation,
    d => d.wellbeing
  );

  grouped.forEach(([frequency, motivationGroups]) => {
    const sourceId = `frequency|${frequency}`;
    nodeIds.add(sourceId);

    motivationGroups.forEach(([motivation, wellbeingGroups]) => {
      const motivationId = `motivation|${motivation}`;
      nodeIds.add(motivationId);

      const firstLeg = d3.sum(wellbeingGroups, d => d[1]);
      addLink(sourceId, motivationId, firstLeg, motivation);

      wellbeingGroups.forEach(([wellbeing, count]) => {
        const wellbeingId = `wellbeing|${wellbeing}`;
        nodeIds.add(wellbeingId);
        addLink(motivationId, wellbeingId, count, motivation);
      });
    });
  });

  return {
    nodes: Array.from(nodeIds, id => ({ id })),
    links: Array.from(linkMap.values())
  };
}

function nodeLabel(id) {
  return id.split("|")[1];
}

function renderSankey() {
  const container = document.getElementById("sankey");
  const width = container.clientWidth;
  const height = container.clientHeight;
  const margin = { top: 36, right: 16, bottom: 18, left: 16 };

  d3.select(container).selectAll("svg").remove();
  const svg = d3.select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`);

  const active = getActiveData();
  const graphData = buildSankeyGraph(active);

  svg.append("text")
    .attr("class", "section-tag")
    .attr("x", margin.left)
    .attr("y", 16)
    .text(`Advanced view • ${formatSubsetLabel()}`);

  if (!graphData.nodes.length || !graphData.links.length) {
    svg.append("text")
      .attr("class", "empty-state")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .text("Not enough valid motivation and well-being responses in the current subset.");
    return;
  }

  const sankey = d3.sankey()
    .nodeId(d => d.id)
    .nodeWidth(18)
    .nodePadding(16)
    .nodeSort((a, b) => {
      const [aLayer, aValue] = a.id.split("|");
      const [, bValue] = b.id.split("|");
      const order = aLayer === "frequency" ? FREQUENCY_ORDER : LIKERT_ORDER;
      return order.indexOf(aValue) - order.indexOf(bValue);
    })
    .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]]);

  const graph = sankey({
    nodes: graphData.nodes.map(d => ({ ...d })),
    links: graphData.links.map(d => ({ ...d }))
  });

  const nodeFill = {
    frequency: "#d2b48c",
    motivation: "#8bb8b4",
    wellbeing: "#90b08a"
  };

  const layerTitles = [
    { prefix: "frequency|", label: "Usage frequency" },
    { prefix: "motivation|", label: "Motivation" },
    { prefix: "wellbeing|", label: "Well-being" }
  ];

  layerTitles.forEach(section => {
    const node = graph.nodes.find(d => d.id.startsWith(section.prefix));
    if (!node) return;
    svg.append("text")
      .attr("class", "axis-title")
      .attr("x", node.x0)
      .attr("y", 30)
      .text(section.label);
  });

  svg.append("g")
    .attr("fill", "none")
    .selectAll("path")
    .data(graph.links)
    .join("path")
    .attr("d", d3.sankeyLinkHorizontal())
    .attr("stroke", d => LIKERT_COLORS[d.keyColor] || "#718096")
    .attr("stroke-width", d => Math.max(1, d.width))
    .attr("stroke-opacity", 0)
    .on("mousemove", (event, d) => {
      showTooltip(
        event,
        `<strong>${nodeLabel(d.source.id)} → ${nodeLabel(d.target.id)}</strong><br>` +
        `${d.value} respondent${d.value === 1 ? "" : "s"}`
      );
    })
    .on("mouseleave", hideTooltip)
    .transition()
    .duration(650)
    .attr("stroke-opacity", 0.42);

  const node = svg.append("g")
    .selectAll("g")
    .data(graph.nodes)
    .join("g")
    .attr("opacity", 0);

  node.append("rect")
    .attr("x", d => d.x0)
    .attr("y", d => d.y0)
    .attr("width", d => d.x1 - d.x0)
    .attr("height", d => Math.max(10, d.y1 - d.y0))
    .attr("rx", 6)
    .attr("fill", d => nodeFill[d.id.split("|")[0]])
    .attr("stroke", "rgba(31, 41, 51, 0.2)")
    .on("mousemove", (event, d) => {
      const inbound = d3.sum(graph.links.filter(link => link.target.id === d.id), link => link.value);
      const outbound = d3.sum(graph.links.filter(link => link.source.id === d.id), link => link.value);
      showTooltip(
        event,
        `<strong>${nodeLabel(d.id)}</strong><br>` +
        `${Math.max(inbound, outbound)} connected respondent${Math.max(inbound, outbound) === 1 ? "" : "s"}`
      );
    })
    .on("mouseleave", hideTooltip);

  node.append("text")
    .attr("x", d => d.x0 < width / 2 ? d.x1 + 8 : d.x0 - 8)
    .attr("y", d => (d.y0 + d.y1) / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
    .attr("fill", "#334e68")
    .attr("font-size", 12)
    .text(d => nodeLabel(d.id));

  node.transition()
    .duration(550)
    .attr("opacity", 1);
}

function renderAll() {
  renderOverview();
  renderBars();
  renderSankey();
}

function wireUi() {
  d3.select("#clear-brush").on("click", () => {
    state.brushedIds.clear();
    state.brushSelection = null;
    if (state.overviewApi) state.overviewApi.clearBrush();
    updateControls();
    renderBars();
    renderSankey();
  });

  d3.select("#reset-zoom").on("click", () => {
    state.zoomTransform = d3.zoomIdentity;
    if (state.overviewApi) state.overviewApi.resetZoom();
  });

  window.addEventListener("resize", () => {
    renderAll();
  });
}

d3.csv("data/survey 605.csv").then(rows => {
  state.raw = rows
    .map(preprocessRow)
    .filter(d => d.frequency && d.validResponses > 0);

  populateFrequencyButtons();
  updateControls();
  wireUi();
  renderAll();
}).catch(error => {
  console.error("Unable to load Homework 3 survey data:", error);
  d3.select("#selection-summary").text("Failed to load survey data.");
});
