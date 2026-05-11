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

const experienceOrder = ["EN", "MI", "SE", "EX"];

const experienceColors = {
  EN: "#8dd3c7",
  MI: "#80b1d3",
  SE: "#bebada",
  EX: "#fb8072"
};

const tooltip = d3.select("body")
  .append("div")
  .attr("class", "tooltip");

d3.csv(dataPath).then(rawData => {
  console.log("Raw data:", rawData);

  // Clean the main columns before building the charts.
  const data = rawData.map(d => ({
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

  console.log("Cleaned data:", data);
  console.log("Number of rows:", data.length);

  drawHeatmap(data);
  drawDistribution(data);
  drawPlaceholder("#flow", "View 3");
}).catch(error => {
  console.error("The CSV did not load correctly:", error);
});

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

  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0, ${chartHeight})`)
    .call(d3.axisBottom(x).tickFormat(d => companySizeLabels[d]).tickSizeOuter(0));

  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).tickFormat(d => experienceLabels[d]).tickSizeOuter(0));

  g.selectAll("rect")
    .data(cells)
    .join("rect")
    .attr("x", d => x(d.companySize))
    .attr("y", d => y(d.experienceLevel))
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("rx", 8)
    .attr("fill", d => color(d.avgSalary))
    .on("mousemove", function(event, d) {
      tooltip
        .style("opacity", 1)
        .style("left", `${event.pageX + 12}px`)
        .style("top", `${event.pageY - 28}px`)
        .html(`
          <strong>${experienceLabels[d.experienceLevel]} / ${companySizeLabels[d.companySize]}</strong><br>
          Avg salary: ${formatSalary(d.avgSalary)}<br>
          Records: ${d.count}
        `);
    })
    .on("mouseleave", function() {
      tooltip.style("opacity", 0);
    });

  g.selectAll(".cell-label")
    .data(cells)
    .join("text")
    .attr("class", "cell-label")
    .attr("x", d => x(d.companySize) + x.bandwidth() / 2)
    .attr("y", d => y(d.experienceLevel) + y.bandwidth() / 2 + 4)
    .attr("text-anchor", "middle")
    .attr("fill", d => getTextColor(color(d.avgSalary)))
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

  const displayOrder = ["EX", "SE", "MI", "EN"];

  const salaryValues = data.map(d => d.salaryUsd).sort(d3.ascending);
  const salaryLimit = d3.quantile(salaryValues, 0.99);
  const xMax = Math.ceil(salaryLimit / 50000) * 50000;

  // Trim very high outliers so the shape is easier to compare.
  const filteredData = data.filter(d => d.salaryUsd <= salaryLimit);

  const x = d3.scaleLinear()
    .domain([0, xMax])
    .range([0, chartWidth]);

  const topPadding = 35;
  const bottomPadding = 35;
  const ridgeGap = (chartHeight - topPadding - bottomPadding) / (displayOrder.length - 1);

  const y = d3.scalePoint()
    .domain(displayOrder)
    .range([topPadding, chartHeight - bottomPadding]);

  const xTicks = x.ticks(60);
  const bandwidth = salaryLimit / 22;

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

  const xAxis = g.append("g")
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

  groups.append("path")
    .attr("class", "density-area")
    .attr("d", d => area(d.density))
    .attr("fill", d => experienceColors[d.experienceLevel])
    .attr("opacity", 0.55)
    .on("mousemove", function(event, d) {
      tooltip
        .style("opacity", 1)
        .style("left", `${event.pageX + 12}px`)
        .style("top", `${event.pageY - 28}px`)
        .html(`
          <strong>${experienceLabels[d.experienceLevel]}</strong><br>
          Median salary: ${formatSalary(d.median)}<br>
          Records shown: ${d.count}
        `);
    })
    .on("mouseleave", function() {
      tooltip.style("opacity", 0);
    });

  groups.append("path")
    .attr("class", "density-line")
    .attr("d", d => line(d.density))
    .attr("fill", "none")
    .attr("stroke", d => experienceColors[d.experienceLevel])
    .attr("stroke-width", 2.2);

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
    .text("Dots mark median salary. Top 1% salaries are trimmed for readability.");

  drawDistributionLegend(svg, width, margin);
}

function drawDistributionLegend(svg, width, margin) {
  const legend = svg.append("g")
    .attr("transform", `translate(${width - margin.right + 25}, ${margin.top + 12})`);

  legend.append("text")
    .attr("class", "legend-label")
    .attr("x", 0)
    .attr("y", -8)
    .text("Experience");

  const displayOrder = ["EN", "MI", "SE", "EX"];

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

function drawPlaceholder(svgId, message) {
  const svg = d3.select(svgId);
  svg.selectAll("*").remove();

  svg.append("text")
    .attr("class", "placeholder-text")
    .attr("x", 20)
    .attr("y", 35)
    .text(message);
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