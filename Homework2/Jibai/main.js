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
  drawPlaceholder("#distribution", "View 2");
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

  const experienceOrder = ["EN", "MI", "SE", "EX"];
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
    .call(d3.axisBottom(x).tickFormat(d => companySizeLabels[d]));

  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).tickFormat(d => experienceLabels[d]));

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
    .call(d3.axisRight(legendScale).ticks(4).tickFormat(d => `$${Math.round(d / 1000)}k`));

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