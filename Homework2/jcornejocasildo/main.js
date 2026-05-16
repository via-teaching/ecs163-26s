// D3 Graph Gallery was used to get skeleton code for graphs: https://d3-graph-gallery.com/index.html
// D3 Skankey diagram walkthough: https://github.com/d3/d3-sankey
// Load dataset
d3.csv("data/Student Mental health.csv").then(function(data) {
  console.log(data);
  console.log(data.columns);

  // Clean up and rename cols
  data.forEach(function(d) {
    d.year = d["Your current year of Study"].toLowerCase().trim();
    d.depression = d["Do you have Depression?"];
    d.anxiety = d["Do you have Anxiety?"];
    d.panic = d["Do you have Panic attack?"];
    d.treatment = d["Did you seek any specialist for a treatment?"];

    // for sankey graph
    if (d.depression === "Yes" || d.anxiety === "Yes" || d.panic === "Yes") {
      d.anyConcern = "Mental Health Concern";
    } else {
      d.anyConcern = "No Mental Health Concern";
    }
  });

  makeBarChart(data);
  makeHeatmap(data);
  makeSankey(data);
});

// making bar chart
function makeBarChart(data) {
  // num students who said yes for each mental health concern & treatment
  let depressionCount = data.filter(function(d) {
    return d.depression === "Yes";
  }).length;

  let anxietyCount = data.filter(function(d) {
    return d.anxiety === "Yes";
  }).length;

  let panicACount = data.filter(function(d) {
    return d.panic === "Yes";
  }).length;

  let treatmentCount = data.filter(function(d) {
    return d.treatment === "Yes";
  }).length;

  let chartData = [ //saving count data
    { name: "Depression", value: depressionCount },
    { name: "Anxiety", value: anxietyCount },
    { name: "Panic Attack", value: panicACount },
    { name: "Treatment", value: treatmentCount }
  ];

  console.log("Overview data:", chartData);
  // setting margins and width and height dimensions 
  let margin = { top: 20, right: 20, bottom: 110, left: 70 };
  let fullWidth = 430;
  let fullHeight = 360;

  let width = fullWidth - margin.left - margin.right;
  let height = fullHeight - margin.top - margin.bottom;

  let svg = d3.select("#overview-chart")
    .append("svg")
    .attr("width", fullWidth)
    .attr("height", fullHeight);
    

  let chart = svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  let xScale = d3.scaleBand()
    .domain(chartData.map(function(d) { return d.name; }))
    .range([0, width])
    .padding(0.2);

  let yScale = d3.scaleLinear()
    .domain([0, d3.max(chartData, function(d) { return d.value; })])
    .nice()
    .range([height, 0]);
  // adding x-axis
  chart.append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(xScale))
    .selectAll("text")
    .attr("transform", "rotate(-20)")
    .style("text-anchor", "end")
    .style("font-size", "11px");
  // adding y-axis
  chart.append("g")
    .call(d3.axisLeft(yScale));
  // bars for bar chart
  chart.selectAll("rect")
    .data(chartData)
    .enter()
    .append("rect")
    .attr("x", function(d) { return xScale(d.name); })
    .attr("y", function(d) { return yScale(d.value); })
    .attr("width", xScale.bandwidth())
    .attr("height", function(d) { return height - yScale(d.value); })
    .attr("fill", "steelblue");
  // labels for bar amount
  chart.selectAll(".bar-label")
    .data(chartData)
    .enter()
    .append("text")
    .attr("x", function(d) { return xScale(d.name) + xScale.bandwidth() / 2; })
    .attr("y", function(d) { return yScale(d.value) - 5; })
    .attr("text-anchor", "middle")
    .text(function(d) { return d.value; });
  // number of students y-axis label
  chart.append("text")
    .attr("x", -height / 2)
    .attr("y", -35)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .text("Number of Students");
}

// making heatmap
function makeHeatmap(data) {
  // seperate academic years
  let years = ["year 1", "year 2", "year 3", "year 4"];

  let conditions = [
    { column: "depression", label: "Depression" },
    { column: "anxiety", label: "Anxiety" },
    { column: "panic", label: "Panic Attack" },
    { column: "treatment", label: "Treatment" }
  ];

  let heatmapData = [];

  years.forEach(function(year) {
    let studentsInYear = data.filter(function(d) {
      return d.year === year;
    });

    conditions.forEach(function(condition) {
      let yesStudents = studentsInYear.filter(function(d) {
        return d[condition.column] === "Yes";
      });

      let percent = 0;

      if (studentsInYear.length > 0) {
        percent = (yesStudents.length / studentsInYear.length) * 100;
      }

      heatmapData.push({
        year: year,
        condition: condition.label,
        percent: percent
      });
    });
  });

  console.log("Heatmap data:", heatmapData);

  let margin = { top: 20, right: 90, bottom: 50, left: 80 };
  let width = 570 - margin.left - margin.right;
  let height = 250 - margin.top - margin.bottom;

  let svg = d3.select("#focus-chart")
    .append("svg")
    .attr("width", 570)
    .attr("height", 250);

  let chart = svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

   // creating x-axis  
  let xScale = d3.scaleBand()
    .domain(conditions.map(function(d) { return d.label; }))
    .range([0, width])
    .padding(0.05);

    // creating y-axis
  let yScale = d3.scaleBand()
    .domain(years)
    .range([0, height])
    .padding(0.05);

    // blue colorscale 
  let colorScale = d3.scaleSequential()
    .interpolator(d3.interpolateBlues)
    .domain([0, 100]);

  chart.selectAll("rect")
    .data(heatmapData)
    .enter()
    .append("rect")
    .attr("x", function(d) { return xScale(d.condition); })
    .attr("y", function(d) { return yScale(d.year); })
    .attr("width", xScale.bandwidth())
    .attr("height", yScale.bandwidth())
    .attr("fill", function(d) { return colorScale(d.percent); })
    .attr("stroke", "white");

  // add % inside each cell  
  chart.selectAll(".cell-text")
    .data(heatmapData)
    .enter()
    .append("text")
    .attr("x", function(d) { return xScale(d.condition) + xScale.bandwidth() / 2; })
    .attr("y", function(d) { return yScale(d.year) + yScale.bandwidth() / 2; })
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .style("font-size", "11px")
    .text(function(d) { return Math.round(d.percent) + "%"; });

  chart.append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(xScale));

  chart.append("g")
    .call(d3.axisLeft(yScale));

  // Simple legend
  let legendValues = [0, 25, 50, 75, 100];
// legend for heatmap

  let legend = svg.append("g")
    .attr("transform", "translate(500,25)");
  // adding colored squares
  legend.selectAll("rect")
    .data(legendValues)
    .enter()
    .append("rect")
    .attr("x", 0)
    .attr("y", function(d, i) { return i * 20; })
    .attr("width", 14)
    .attr("height", 14)
    .attr("fill", function(d) { return colorScale(d); });

  legend.selectAll("text")
    .data(legendValues)
    .enter()
    .append("text")
    .attr("x", 20)
    .attr("y", function(d, i) { return i * 20 + 11; })
    .style("font-size", "10px")
    .text(function(d) { return d + "%"; });
  // legend title
  legend.append("text")
    .attr("x", 0)
    .attr("y", -8)
    .style("font-size", "10px")
    .text("% Yes");
}

// making sankey diagram
function makeSankey(data) {
  let linkMap = new Map();

  function countLink(source, target) {
    let key = source + "|" + target;

    if (linkMap.has(key)) {
      linkMap.set(key, linkMap.get(key) + 1);
    } else {
      linkMap.set(key, 1);
    }
  }

  // link academic year to mental health concern
  data.forEach(function(d) {
    let year = d.year;
    let concern = d.anyConcern;
    let treatment = "Treatment: " + d.treatment;

    countLink(year, concern);
    countLink(concern, treatment);
  });

  let nodeNames = [];

  linkMap.forEach(function(value, key) {
    let parts = key.split("|");
    let source = parts[0];
    let target = parts[1];

    if (!nodeNames.includes(source)) {
      nodeNames.push(source);
    }

    if (!nodeNames.includes(target)) {
      nodeNames.push(target);
    }
  });

  // node names to node objects
  let nodes = nodeNames.map(function(name) {
    return { name: name };
  });

  let links = [];
 // going from links -> source target value format
  linkMap.forEach(function(value, key) {
    let parts = key.split("|");
    let source = parts[0];
    let target = parts[1];

    links.push({
      source: nodeNames.indexOf(source),
      target: nodeNames.indexOf(target),
      value: value
    });
  });

  console.log("Sankey nodes:", nodes);
  console.log("Sankey links:", links);

  // dimensions for diagram
  let width = 900;
  let height = 260;

  let svg = d3.select("#advanced-chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
  

  let sankey = d3.sankey()
    .nodeWidth(18)
    .nodePadding(12)
    .extent([[20, 10], [width - 20, height - 10]]);

  let graph = sankey({
    nodes: nodes.map(function(d) { return Object.assign({}, d); }),
    links: links.map(function(d) { return Object.assign({}, d); })
  });

  //building scale 
  let color = d3.scaleOrdinal(d3.schemeTableau10);

    // adding paths for diagram
  svg.append("g")
    .selectAll("path")
    .data(graph.links)
    .enter()
    .append("path")
    .attr("d", d3.sankeyLinkHorizontal())
    .attr("stroke", function(d) { return color(d.source.name); })
    .attr("stroke-width", function(d) { return Math.max(1, d.width); })
    .attr("fill", "none")
    .attr("opacity", 0.35);

   // adding categories for diagram 
  svg.append("g")
    .selectAll("rect")
    .data(graph.nodes)
    .enter()
    .append("rect")
    .attr("x", function(d) { return d.x0; })
    .attr("y", function(d) { return d.y0; })
    .attr("width", function(d) { return d.x1 - d.x0; })
    .attr("height", function(d) { return d.y1 - d.y0; })
    .attr("fill", function(d) { return color(d.name); })
    .attr("stroke", "black");

  // adding labels next to each node  
  svg.append("g")
    .selectAll("text")
    .data(graph.nodes)
    .enter()
    .append("text")
    .attr("x", function(d) {
      if (d.x0 < width / 2) {
        return d.x1 + 6;
      } else {
        return d.x0 - 6;
      }
    })
    .attr("y", function(d) { return (d.y0 + d.y1) / 2; })
    .attr("dy", "0.35em")
    .attr("text-anchor", function(d) {
      if (d.x0 < width / 2) {
        return "start";
      } else {
        return "end";
      }
    })
    .style("font-size", "11px")
    .text(function(d) { return d.name; });
}