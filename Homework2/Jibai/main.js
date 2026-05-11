const dataPath = "data/ds_salaries.csv";

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

  drawPlaceholders(data);
}).catch(error => {
  console.error("The CSV did not load correctly:", error);
});

function drawPlaceholders(data) {
  drawPlaceholder("#heatmap", "View 1");
  drawPlaceholder("#distribution", "View 2");
  drawPlaceholder("#flow", "View 3");
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