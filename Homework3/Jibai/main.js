const dataPath = "data/ds_salaries.csv";

const experienceLabels = {
  EN: "Entry",
  MI: "Mid",
  SE: "Senior",
  EX: "Executive"
};

const companySizeLabels = {
  S: "Small",
  M: "Medium",
  L: "Large"
};

const remoteLabels = {
  0: "On-site",
  50: "Hybrid",
  100: "Remote"
};

const salaryTierLabels = {
  low: "Under $75k",
  mid: "$75k-$125k",
  high: "$125k-$175k",
  top: "$175k+"
};

const experienceOrder = ["EN", "MI", "SE", "EX"];

const experienceColors = {
  EN: "#8dd3c7",
  MI: "#80b1d3",
  SE: "#bebada",
  EX: "#fb8072"
};

const flowTypeColors = {
  experience: "#80b1d3",
  remote: "#b3de69",
  salary: "#fdb462"
};

let allData = [];

let dashboardState = {
  selectedCell: null,
  salaryRange: null
};

// Tooltip. 
const tooltip = d3.select("body")
  .append("div")
  .attr("class", "tooltip");

// Reset all filters.
d3.select("#reset-button").on("click", function() {
  dashboardState.selectedCell = null;
  dashboardState.salaryRange = null;
  renderDashboard();
});

d3.csv(dataPath).then(rawData => {
  console.log("Raw data:", rawData);

  // Clean the main columns.
  allData = rawData.map(d => ({
    workYear: +d.work_year,
    experienceLevel: d.experience_level,
    employmentType: d.employment_type,
    jobTitle: d.job_title,
    salaryUsd: +d.salary_in_usd,
    employeeResidence: d.employee_residence,
    remoteRatio: +d.remote_ratio,
    companyLocation: d.company_location,
    companySize: d.company_size
  })).filter(d => !isNaN(d.salaryUsd));

  console.log("Cleaned data:", allData);
  console.log("Number of rows:", allData.length);

  renderDashboard();
}).catch(error => {
  console.error("The CSV did not load correctly:", error);
});

function renderDashboard() {
  const selectedData = getSelectedData();
  const filteredData = getFilteredData();

  drawHeatmap(allData);
  drawDistribution(selectedData);
  drawSalaryFlow(filteredData);
  updateSummary(selectedData, filteredData);
}

function getSelectedData() {
  if (!dashboardState.selectedCell) {
    return allData;
  }

  return allData.filter(d =>
    d.experienceLevel === dashboardState.selectedCell.experienceLevel &&
    d.companySize === dashboardState.selectedCell.companySize
  );
}

function getFilteredData() {
  let data = getSelectedData();

  if (dashboardState.salaryRange) {
    data = data.filter(d =>
      d.salaryUsd >= dashboardState.salaryRange[0] &&
      d.salaryUsd <= dashboardState.salaryRange[1]
    );
  }

  return data;
}

function updateSummary(selectedData, filteredData) {
  let text = "Showing all records";

  if (dashboardState.selectedCell) {
    const exp = experienceLabels[dashboardState.selectedCell.experienceLevel];
    const size = companySizeLabels[dashboardState.selectedCell.companySize];
    text = `Selected: ${exp}, ${size} company`;
  }

  if (dashboardState.salaryRange) {
    text += ` | Salary brush: ${formatSalaryShort(dashboardState.salaryRange[0])} to ${formatSalaryShort(dashboardState.salaryRange[1])}`;
  }

  text += ` | Records shown: ${filteredData.length} of ${selectedData.length}`;

  d3.select("#selection-summary").text(text);
}

function drawHeatmap(data) {
  const svg = d3.select("#heatmap");
  svg.selectAll("*").remove();

  const width = svg.node().clientWidth;
  const height = svg.node().clientHeight;

  const margin = {
    top: 25,
    right: 95,
    bottom: 55,
    left: 85
  };

  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const companySizeOrder = ["S", "M", "L"];

  // Build average salary cells for each experience and company size group.
  const cells = [];

  experienceOrder.forEach(exp => {
    companySizeOrder.forEach(size => {
      const group = data.filter(d => d.experienceLevel === exp && d.companySize === size);
      const avgSalary = d3.mean(group, d => d.salaryUsd);

      cells.push({
        experienceLevel: exp,
        companySize: size,
        avgSalary,
        count: group.length
      });
    });
  });

  // Use position for categories and color for average salary.
  const x = d3.scaleBand()
    .domain(companySizeOrder)
    .range([0, chartWidth])
    .padding(0.08);

  const y = d3.scaleBand()
    .domain(experienceOrder)
    .range([0, chartHeight])
    .padding(0.08);

  const color = d3.scaleSequential()
    .domain(d3.extent(cells, d => d.avgSalary))
    .interpolator(d3.interpolateYlGnBu);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // Draw heatmap axes.
  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0, ${chartHeight})`)
    .call(d3.axisBottom(x).tickFormat(d => companySizeLabels[d]).tickSizeOuter(0));

  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).tickFormat(d => experienceLabels[d]).tickSizeOuter(0));

  // Click a cell to focus the other views.
  g.selectAll("rect")
    .data(cells)
    .join("rect")
    .attr("class", "heatmap-cell")
    .attr("x", d => x(d.companySize))
    .attr("y", d => y(d.experienceLevel))
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("rx", 8)
    .attr("fill", d => color(d.avgSalary))
    .attr("stroke", "#111827")
    .attr("stroke-width", d => isSelectedCell(d) ? 3 : 0)
    .attr("opacity", d => getCellOpacity(d))
    .on("click", function(event, d) {
      if (isSelectedCell(d)) {
        dashboardState.selectedCell = null;
      } else {
        dashboardState.selectedCell = {
          experienceLevel: d.experienceLevel,
          companySize: d.companySize
        };
      }

      dashboardState.salaryRange = null;
      renderDashboard();
    })
    .on("mousemove", function(event, d) {
      tooltip
        .style("opacity", 1)
        .style("left", `${event.pageX + 12}px`)
        .style("top", `${event.pageY - 28}px`)
        .html(`
          <strong>${experienceLabels[d.experienceLevel]} / ${companySizeLabels[d.companySize]}</strong><br>
          Avg salary: ${formatSalary(d.avgSalary)}<br>
          Records: ${d.count}<br>
          Click to focus this group
        `);
    })
    .on("mouseleave", function() {
      tooltip.style("opacity", 0);
    });

  // Add salary labels inside the cells.
  g.selectAll(".cell-label")
    .data(cells)
    .join("text")
    .attr("class", "cell-label")
    .attr("x", d => x(d.companySize) + x.bandwidth() / 2)
    .attr("y", d => y(d.experienceLevel) + y.bandwidth() / 2 + 4)
    .attr("text-anchor", "middle")
    .attr("fill", d => getTextColor(color(d.avgSalary)))
    .attr("opacity", d => getCellOpacity(d))
    .text(d => formatSalaryShort(d.avgSalary));

  svg.append("text")
    .attr("class", "axis-label")
    .attr("x", margin.left + chartWidth / 2)
    .attr("y", height - 10)
    .attr("text-anchor", "middle")
    .text("Company size");

  svg.append("text")
    .attr("class", "axis-label")
    .attr("x", -margin.top - chartHeight / 2)
    .attr("y", 18)
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("Experience level");

  drawHeatmapLegend(svg, color, width, height, margin);
}

function drawDistribution(data) {
  const svg = d3.select("#distribution");
  svg.selectAll("*").remove();

  if (data.length === 0) {
    drawNoData(svg, "No salary records match the current selection.");
    return;
  }

  const width = svg.node().clientWidth;
  const height = svg.node().clientHeight;

  const margin = {
    top: 42,
    right: 120,
    bottom: 60,
    left: 90
  };

  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const displayOrder = dashboardState.selectedCell
    ? [dashboardState.selectedCell.experienceLevel]
    : ["EX", "SE", "MI", "EN"];

  const salaryValues = data.map(d => d.salaryUsd).sort(d3.ascending);
  const salaryLimit = d3.quantile(salaryValues, 0.99);
  const xMax = Math.max(50000, Math.ceil(salaryLimit / 50000) * 50000);

  // Trim very high outliers so the shape is easier to compare.
  const filteredData = data.filter(d => d.salaryUsd <= salaryLimit);

  const x = d3.scaleLinear()
    .domain([0, xMax])
    .range([0, chartWidth]);

  const topPadding = 35;
  const bottomPadding = 35;
  const ridgeGap = (chartHeight - topPadding - bottomPadding) / Math.max(1, displayOrder.length - 1);

  const y = d3.scalePoint()
    .domain(displayOrder)
    .range([topPadding, chartHeight - bottomPadding]);

  const xTicks = x.ticks(60);
  const bandwidth = Math.max(8000, salaryLimit / 22);

  // Estimate a salary distribution for each visible experience group.
  const densities = displayOrder.map(exp => {
    const group = filteredData.filter(d => d.experienceLevel === exp);
    const density = kernelDensityEstimator(kernelEpanechnikov(bandwidth), xTicks)(
      group.map(d => d.salaryUsd)
    );

    return {
      experienceLevel: exp,
      count: group.length,
      median: d3.median(group, d => d.salaryUsd),
      density
    };
  });

  const maxDensity = d3.max(densities, group => d3.max(group.density, d => d[1]));

  const densityHeight = d3.scaleLinear()
    .domain([0, maxDensity])
    .range([0, ridgeGap * 0.72]);

  const area = d3.area()
    .curve(d3.curveBasis)
    .x(d => x(d[0]))
    .y0(0)
    .y1(d => -densityHeight(d[1]));

  const line = d3.line()
    .curve(d3.curveBasis)
    .x(d => x(d[0]))
    .y(d => -densityHeight(d[1]));

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // Draw the salary axis.
  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0, ${chartHeight})`)
    .call(d3.axisBottom(x).ticks(7).tickFormat(d => `$${Math.round(d / 1000)}k`).tickSizeOuter(0));

  const yAxis = g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).tickFormat(d => experienceLabels[d]).tickSize(0));

  yAxis.select(".domain").remove();

  const groups = g.selectAll(".ridge-group")
    .data(densities)
    .join("g")
    .attr("class", "ridge-group")
    .attr("transform", d => `translate(0, ${y(d.experienceLevel)})`);

  groups.append("line")
    .attr("class", "ridge-baseline")
    .attr("x1", 0)
    .attr("x2", chartWidth)
    .attr("y1", 0)
    .attr("y2", 0);

  // Draw the distribution shapes.
  groups.append("path")
    .attr("class", "density-area")
    .attr("d", d => area(d.density))
    .attr("fill", d => experienceColors[d.experienceLevel])
    .attr("opacity", 0.55);

  groups.append("path")
    .attr("class", "density-line")
    .attr("d", d => line(d.density))
    .attr("fill", "none")
    .attr("stroke", d => experienceColors[d.experienceLevel])
    .attr("stroke-width", 2.2);

  // Mark median salary for each group.
  groups.append("circle")
    .attr("cx", d => x(d.median))
    .attr("cy", 0)
    .attr("r", 4.5)
    .attr("fill", "#111827");

  svg.append("text")
    .attr("class", "axis-label")
    .attr("x", margin.left + chartWidth / 2)
    .attr("y", height - 10)
    .attr("text-anchor", "middle")
    .text("Salary in USD");

  svg.append("text")
    .attr("class", "note-label")
    .attr("x", margin.left)
    .attr("y", 20)
    .text("Drag across the chart to filter the flow view. Dots mark median salary.");

  drawDistributionLegend(svg, width, margin, displayOrder);
  addSalaryBrush(svg, x, margin, chartWidth, chartHeight);
}

function addSalaryBrush(svg, x, margin, chartWidth, chartHeight) {
  // Brush a salary range to filter the flow view.
  const brush = d3.brushX()
    .extent([[0, 0], [chartWidth, chartHeight]])
    .on("end", function(event) {
      if (!event.sourceEvent) {
        return;
      }

      if (!event.selection) {
        dashboardState.salaryRange = null;
      } else {
        dashboardState.salaryRange = event.selection.map(x.invert).sort(d3.ascending);
      }

      const selectedData = getSelectedData();
      const filteredData = getFilteredData();

      drawSalaryFlow(filteredData);
      updateSummary(selectedData, filteredData);
    });

  const brushGroup = svg.append("g")
    .attr("class", "brush")
    .attr("transform", `translate(${margin.left}, ${margin.top})`)
    .call(brush);

  if (dashboardState.salaryRange) {
    brushGroup.call(brush.move, dashboardState.salaryRange.map(x));
  }
}

function drawSalaryFlow(data) {
  const svg = d3.select("#flow");
  svg.selectAll("*").remove();

  if (data.length === 0) {
    drawNoData(svg, "No records match the current salary range.");
    return;
  }

  const width = svg.node().clientWidth;
  const height = svg.node().clientHeight;

  const margin = {
    top: 52,
    right: 255,
    bottom: 25,
    left: 165
  };

  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const flowData = buildSalaryFlowData(data);
  const nodes = flowData.nodes;
  const links = flowData.links;

  // Position nodes and links for the flow layout.
  const valueScale = layoutFlow(nodes, links, chartWidth, chartHeight);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  const layerMeta = [
    { layer: 0, label: "Experience level" },
    { layer: 1, label: "Remote work type" },
    { layer: 2, label: "Salary tier" }
  ];

  layerMeta.forEach(item => {
    const layerNodes = nodes.filter(d => d.layer === item.layer);
    item.x = d3.mean(layerNodes, d => (d.x0 + d.x1) / 2);
  });

  // Add headings for the three flow stages.
  g.selectAll(".flow-layer-label")
    .data(layerMeta)
    .join("text")
    .attr("class", "flow-layer-label")
    .attr("x", d => d.x)
    .attr("y", -18)
    .attr("text-anchor", "middle")
    .text(d => d.label);

  // Draw links behind the nodes.
  g.append("g")
    .selectAll("path")
    .data(links)
    .join("path")
    .attr("class", "flow-link")
    .attr("d", d => flowPath(d))
    .attr("stroke", d => flowTypeColors[nodes[d.source].type])
    .attr("stroke-width", d => Math.max(1, d.width))
    .on("mousemove", function(event, d) {
      tooltip
        .style("opacity", 1)
        .style("left", `${event.pageX + 12}px`)
        .style("top", `${event.pageY - 28}px`)
        .html(`
          <strong>${nodes[d.source].label} → ${nodes[d.target].label}</strong><br>
          Records: ${d.value}
        `);
    })
    .on("mouseleave", function() {
      tooltip.style("opacity", 0);
    });

  const nodeGroups = g.append("g")
    .selectAll(".flow-node")
    .data(nodes)
    .join("g")
    .attr("class", "flow-node");

  // Draw flow nodes as vertical blocks.
  nodeGroups.append("rect")
    .attr("x", d => d.x0)
    .attr("y", d => d.y0)
    .attr("width", d => d.x1 - d.x0)
    .attr("height", d => Math.max(6, d.y1 - d.y0))
    .attr("rx", 5)
    .attr("fill", d => flowTypeColors[d.type])
    .on("mousemove", function(event, d) {
      tooltip
        .style("opacity", 1)
        .style("left", `${event.pageX + 12}px`)
        .style("top", `${event.pageY - 28}px`)
        .html(`
          <strong>${d.label}</strong><br>
          Records: ${d.value}
        `);
    })
    .on("mouseleave", function() {
      tooltip.style("opacity", 0);
    });

  nodeGroups.append("text")
    .attr("class", "flow-node-label")
    .attr("x", d => d.layer === 0 ? d.x0 - 10 : d.x1 + 10)
    .attr("y", d => (d.y0 + d.y1) / 2 + 4)
    .attr("text-anchor", d => d.layer === 0 ? "end" : "start")
    .text(d => d.label);

  svg.append("text")
    .attr("class", "note-label")
    .attr("x", margin.left)
    .attr("y", 18)
    .text(`Flow width shows number of records. Showing ${data.length} records.`);

  drawFlowLegend(svg, width, margin, valueScale, d3.max(links, d => d.value));
}

function layoutFlow(nodes, links, chartWidth, chartHeight) {
  const nodeWidth = 18;
  const nodeGap = 14;

  const layerX = d3.scalePoint()
    .domain([0, 1, 2])
    .range([0, chartWidth])
    .padding(0.08);

  // Calculate node size from incoming and outgoing flow.
  nodes.forEach(node => {
    const incoming = d3.sum(links.filter(link => link.target === node.index), link => link.value);
    const outgoing = d3.sum(links.filter(link => link.source === node.index), link => link.value);

    node.value = Math.max(incoming, outgoing);
    node.x0 = layerX(node.layer) - nodeWidth / 2;
    node.x1 = layerX(node.layer) + nodeWidth / 2;
  });

  const layers = d3.groups(nodes, d => d.layer);
  const layerScales = layers.map(([, layerNodes]) => {
    const totalValue = d3.sum(layerNodes, d => d.value);
    const availableHeight = chartHeight - (layerNodes.length - 1) * nodeGap;
    return availableHeight / totalValue;
  });

  const valueScale = d3.min(layerScales);

  // Stack nodes within each layer.
  layers.forEach(([, layerNodes]) => {
    const orderedNodes = sortFlowNodes(layerNodes);
    const totalHeight = d3.sum(orderedNodes, d => d.value * valueScale) + (orderedNodes.length - 1) * nodeGap;
    let y = (chartHeight - totalHeight) / 2;

    orderedNodes.forEach(node => {
      node.y0 = y;
      node.y1 = y + node.value * valueScale;
      y = node.y1 + nodeGap;
    });
  });

  nodes.forEach(node => {
    node.sourceOffset = 0;
    node.targetOffset = 0;
  });

  links.sort((a, b) => {
    const sourceDiff = nodes[a.source].layer - nodes[b.source].layer;

    if (sourceDiff !== 0) {
      return sourceDiff;
    }

    return nodes[a.target].y0 - nodes[b.target].y0;
  });

  // Assign each link a vertical position inside its node.
  links.forEach(link => {
    const source = nodes[link.source];
    const target = nodes[link.target];
    const width = link.value * valueScale;

    link.width = width;
    link.x0 = source.x1;
    link.x1 = target.x0;
    link.y0 = source.y0 + source.sourceOffset + width / 2;
    link.y1 = target.y0 + target.targetOffset + width / 2;

    source.sourceOffset += width;
    target.targetOffset += width;
  });

  return valueScale;
}

function sortFlowNodes(nodes) {
  const typeOrder = {
    experience: ["EN", "MI", "SE", "EX"],
    remote: ["0", "50", "100"],
    salary: ["low", "mid", "high", "top"]
  };

  return nodes.sort((a, b) => {
    const aKey = a.id.split("-").slice(1).join("-");
    const bKey = b.id.split("-").slice(1).join("-");
    const order = typeOrder[a.type];

    return order.indexOf(aKey) - order.indexOf(bKey);
  });
}

function flowPath(d) {
  const curve = (d.x1 - d.x0) * 0.45;

  return `
    M ${d.x0},${d.y0}
    C ${d.x0 + curve},${d.y0}
      ${d.x1 - curve},${d.y1}
      ${d.x1},${d.y1}
  `;
}

function drawFlowLegend(svg, width, margin, valueScale, maxValue) {
  const legend = svg.append("g")
    .attr("transform", `translate(${width - 145}, ${margin.top + 8})`);

  legend.append("text")
    .attr("class", "legend-label")
    .attr("x", 0)
    .attr("y", -8)
    .text("Node type");

  const items = [
    { label: "Experience", type: "experience" },
    { label: "Remote", type: "remote" },
    { label: "Salary tier", type: "salary" }
  ];

  items.forEach((item, i) => {
    const row = legend.append("g")
      .attr("transform", `translate(0, ${i * 24})`);

    row.append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("rx", 2)
      .attr("fill", flowTypeColors[item.type]);

    row.append("text")
      .attr("class", "legend-label")
      .attr("x", 18)
      .attr("y", 10)
      .text(item.label);
  });

  const widthLegend = legend.append("g")
    .attr("transform", "translate(0, 96)");

  widthLegend.append("text")
    .attr("class", "legend-label")
    .attr("x", 0)
    .attr("y", -8)
    .text("Flow width");

  const samples = [
    Math.max(1, Math.round(maxValue * 0.12)),
    Math.max(1, Math.round(maxValue * 0.4)),
    Math.max(1, Math.round(maxValue))
  ];

  [...new Set(samples)].forEach((value, i) => {
    const row = widthLegend.append("g")
      .attr("transform", `translate(0, ${i * 20})`);

    row.append("line")
      .attr("x1", 0)
      .attr("x2", 30)
      .attr("y1", 7)
      .attr("y2", 7)
      .attr("stroke", "#94a3b8")
      .attr("stroke-width", Math.min(22, Math.max(3, value * valueScale)))
      .attr("opacity", 0.45);

    row.append("text")
      .attr("class", "legend-label")
      .attr("x", 40)
      .attr("y", 10)
      .text(value);
  });
}

function drawDistributionLegend(svg, width, margin, displayOrder) {
  const legend = svg.append("g")
    .attr("transform", `translate(${width - margin.right + 25}, ${margin.top + 12})`);

  legend.append("text")
    .attr("class", "legend-label")
    .attr("x", 0)
    .attr("y", -8)
    .text("Experience");

  displayOrder.forEach((exp, i) => {
    const row = legend.append("g")
      .attr("transform", `translate(0, ${i * 22})`);

    row.append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("rx", 2)
      .attr("fill", experienceColors[exp])
      .attr("opacity", 0.7);

    row.append("text")
      .attr("class", "legend-label")
      .attr("x", 18)
      .attr("y", 10)
      .text(experienceLabels[exp]);
  });
}

function buildSalaryFlowData(data) {
  const nodes = [];
  const links = [];
  const nodeMap = new Map();

  // Create a node.
  function getNode(id, label, layer, type) {
    if (!nodeMap.has(id)) {
      nodeMap.set(id, nodes.length);
      nodes.push({
        index: nodes.length,
        id,
        label,
        layer,
        type
      });
    }

    return nodeMap.get(id);
  }

  data.forEach(d => {
    const expId = `exp-${d.experienceLevel}`;
    const remoteId = `remote-${d.remoteRatio}`;
    const tierId = `tier-${getSalaryTier(d.salaryUsd)}`;

    getNode(expId, experienceLabels[d.experienceLevel], 0, "experience");
    getNode(remoteId, remoteLabels[d.remoteRatio], 1, "remote");
    getNode(tierId, salaryTierLabels[getSalaryTier(d.salaryUsd)], 2, "salary");
  });

  // Count flows from experience to remote work.
  const expToRemote = d3.rollups(
    data,
    group => group.length,
    d => `exp-${d.experienceLevel}`,
    d => `remote-${d.remoteRatio}`
  );

  // Count flows from remote work to salary tier.
  const remoteToTier = d3.rollups(
    data,
    group => group.length,
    d => `remote-${d.remoteRatio}`,
    d => `tier-${getSalaryTier(d.salaryUsd)}`
  );

  expToRemote.forEach(([sourceId, targets]) => {
    targets.forEach(([targetId, value]) => {
      links.push({
        source: nodeMap.get(sourceId),
        target: nodeMap.get(targetId),
        value
      });
    });
  });

  remoteToTier.forEach(([sourceId, targets]) => {
    targets.forEach(([targetId, value]) => {
      links.push({
        source: nodeMap.get(sourceId),
        target: nodeMap.get(targetId),
        value
      });
    });
  });

  return {
    nodes,
    links
  };
}

function getSalaryTier(salary) {
  if (salary < 75000) {
    return "low";
  }

  if (salary < 125000) {
    return "mid";
  }

  if (salary < 175000) {
    return "high";
  }

  return "top";
}

function drawHeatmapLegend(svg, color, width, height, margin) {
  const legendHeight = 120;
  const legendWidth = 12;
  const legendX = width - margin.right + 35;
  const legendY = margin.top + 10;

  const legendScale = d3.scaleLinear()
    .domain(color.domain())
    .range([legendHeight, 0]);

  const defs = svg.append("defs");

  const gradient = defs.append("linearGradient")
    .attr("id", "salary-gradient")
    .attr("x1", "0%")
    .attr("y1", "100%")
    .attr("x2", "0%")
    .attr("y2", "0%");

  d3.range(0, 1.01, 0.1).forEach(t => {
    gradient.append("stop")
      .attr("offset", `${t * 100}%`)
      .attr("stop-color", color(color.domain()[0] + t * (color.domain()[1] - color.domain()[0])));
  });

  svg.append("rect")
    .attr("x", legendX)
    .attr("y", legendY)
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .attr("fill", "url(#salary-gradient)");

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${legendX + legendWidth}, ${legendY})`)
    .call(d3.axisRight(legendScale).ticks(4).tickFormat(d => `$${Math.round(d / 1000)}k`).tickSizeOuter(0));

  svg.append("text")
    .attr("class", "legend-label")
    .attr("x", legendX - 5)
    .attr("y", legendY - 8)
    .text("Avg salary");
}

function drawNoData(svg, message) {
  const width = svg.node().clientWidth;
  const height = svg.node().clientHeight;

  svg.append("text")
    .attr("class", "no-data-label")
    .attr("x", width / 2)
    .attr("y", height / 2)
    .attr("text-anchor", "middle")
    .text(message);
}

function isSelectedCell(d) {
  return dashboardState.selectedCell &&
    dashboardState.selectedCell.experienceLevel === d.experienceLevel &&
    dashboardState.selectedCell.companySize === d.companySize;
}

function getCellOpacity(d) {
  if (!dashboardState.selectedCell) {
    return 1;
  }

  return isSelectedCell(d) ? 1 : 0.35;
}

function kernelDensityEstimator(kernel, xValues) {
  return function(sample) {
    return xValues.map(x => [
      x,
      d3.mean(sample, value => kernel(x - value))
    ]);
  };
}

function kernelEpanechnikov(bandwidth) {
  return function(value) {
    value = value / bandwidth;
    return Math.abs(value) <= 1 ? 0.75 * (1 - value * value) / bandwidth : 0;
  };
}

function formatSalary(value) {
  return `$${Math.round(value).toLocaleString()}`;
}

function formatSalaryShort(value) {
  return `$${Math.round(value / 1000)}k`;
}

function getTextColor(backgroundColor) {
  const colorValue = d3.color(backgroundColor);
  const brightness = colorValue.r * 0.299 + colorValue.g * 0.587 + colorValue.b * 0.114;

  return brightness < 120 ? "white" : "#111827";
}