/* Source used: https://d3-graph-gallery.com/index.html */

// load data
d3.csv("ds_salaries.csv").then(function(data) {

  /////////////// Pie Chart //////////////

  //dimensions
  const pie_width = 380; 
  const pie_height = 220;

  const radius = Math.min(pie_width, pie_height) / 2 - 10;

  // create pie chart
  const pie_svg = d3.select("#pie-view")
    .append("svg")
      .attr("width", pie_width)
      .attr("height", pie_height)
    .append("g")
      .attr("transform", `translate(${pie_width/2}, ${pie_height/2})`);

  const level_count = d3.rollup(data, v => v.length, d => d.experience_level);
  const pie_data = Object.fromEntries(level_count);

  // set the colors of each slice
  const color = d3.scaleOrdinal()
    .range(["#7c75ff", "#75ff7e", "#75ffe6", "#ff7575"])

  // compute position of each slice
  const pie = d3.pie()
    .value(function(d) {return d[1]})
  const data_ready = pie(Object.entries(pie_data))

  // build the pie chart
  pie_svg
    .selectAll('whatever')
    .data(data_ready)
    .join('path')
    .attr('d', d3.arc()
      .innerRadius(0)
      .outerRadius(radius)
    )
    .attr('fill', function(d){ return(color(d.data[0])) })
    .attr("stroke", "black")
    .style("stroke-width", "2px")
    .style("opacity", 0.7)

  
  var keys = Object.keys(pie_data);

  // add dots to the legend
  pie_svg.selectAll("mydots")
    .data(keys)
    .enter()
    .append("circle")
      .attr("cx", radius + 40)
      .attr("cy", function(d,i){ return -40 + i*25})
      .attr("r", 7)
      .style("fill", function(d){ return color(d)})

  // add labels to the legend
  pie_svg.selectAll("mylabels")
    .data(keys)
    .enter()
    .append("text")
      .attr("x", radius + 55)
      .attr("y", function(d,i){ return -40 + i*25})
      .style("fill", "#000000")
      .text(function(d){ return d})
      .attr("text-anchor", "left")
      .style("alignment-baseline", "middle")

  /////////////// Histogram //////////////
  
  // dimensions
  var hist_margins = {top: 10, right: 30, bottom: 40, left: 50},
      hist_width = 440 - hist_margins.left - hist_margins.right,
      hist_height = 220 - hist_margins.top - hist_margins.bottom;

  // create histogram
  var hist_svg = d3.select("#bar-view")
    .append("svg")
      .attr("width", hist_width + hist_margins.left + hist_margins.right)
      .attr("height", hist_height + hist_margins.top + hist_margins.bottom)
    .append("g")
      .attr("transform",
            "translate(" + hist_margins.left + "," + hist_margins.top + ")");

  // create x-axis
  var hist_x = d3.scaleLinear()
      .domain([0, d3.max(data, function(d) { return +d.salary_in_usd })])
      .range([0, hist_width]);
  hist_svg.append("g")
      .attr("transform", "translate(0," + hist_height + ")")
      .call(d3.axisBottom(hist_x));

  // add x-axis label
  hist_svg.append("text").attr("x", hist_width/2).attr("y", hist_height + 35).style("text-anchor", "middle").text("Salary ($)").style("font-size", "12px");

  // set histogram parameters
  var histogram = d3.histogram()
      .value(function(d) { return +d.salary_in_usd; }) 
      .domain(hist_x.domain())
      .thresholds(hist_x.ticks(40)); // 40 bars

  var bars = histogram(data);

  // create y-axis
  var hist_y = d3.scaleLinear()
      .range([hist_height, 0]);
      hist_y.domain([0, d3.max(bars, function(d) { return d.length; })]);
  hist_svg.append("g")
      .call(d3.axisLeft(hist_y));

  // build histogram
  hist_svg.selectAll("rect")
      .data(bars)
      .enter()
      .append("rect")
        .attr("x", 1)
        .attr("transform", function(d) { return "translate(" + hist_x(d.x0) + "," + hist_y(d.length) + ")"; })
        .attr("width", function(d) { return Math.max(0, hist_x(d.x1) - hist_x(d.x0) - 1) ; })
        .attr("height", function(d) { return hist_height - hist_y(d.length); })
        .style("fill", "#69b3a2")


  /////////////// Parallel Coordinates (Advanced) //////////////

  // filter data for the data engineer role
  const focused_data = data.filter(function(d) { return d.job_title === "Data Engineer"; });

  // dimensions
  const pc_margins = {top: 40, right: 10, bottom: 10, left: 10},
    pc_width = 1900 - pc_margins.left - pc_margins.right,
    pc_height = 280 - pc_margins.top - pc_margins.bottom;

  // create parallel coordinates chart
  const pc = d3.select("#parallel-view")
  .append("svg")
    .attr("width", pc_width + pc_margins.left + pc_margins.right)
    .attr("height", pc_height + pc_margins.top + pc_margins.bottom)
  .append("g")
    .attr("transform", `translate(${pc_margins.left},${pc_margins.top})`);

  // list of dimensions in the plot
  const dimensions = ["experience_level", "company_size", "salary_in_usd"];

  // point scale for each dimension
  const y = {}
  for (let i in dimensions) {
    let name = dimensions[i]
    if (name === "salary_in_usd") {
        y[name] = d3.scaleLinear()
          .domain( d3.extent(focused_data, function(d) { return +d[name]; }) )
          .range([pc_height, 0])
    } else {
        // catagorical columns use scalePoint()
        let unique_vals = Array.from(new Set(focused_data.map(function(d) { return d[name]; })));
        
        // sort unique values
        if (name === "experience_level") {
            unique_vals = ["EX", "SE", "MI", "EN"];
        } else if (name === "company_size") {
            unique_vals = ["L", "M", "S"];
        }

        y[name] = d3.scalePoint()
          .domain(unique_vals)
          .range([pc_height, 0])
    }
  }

  // build x scale
  const x = d3.scalePoint()
    .range([0, pc_width])
    .padding(1)
    .domain(dimensions);

  // path takes a csv row and returns x and y coordinates
  function path(d) {
      return d3.line()(dimensions.map(function(p) { return [x(p), y[p](d[p])]; }));
  }

  // give each experience level a unique color
  const pc_color = d3.scaleOrdinal()
    .domain(["EN", "MI", "SE", "EX"])
    .range(["#7c75ff", "#75ff7e", "#75ffe6", "#ff7575"]);

  // build parallel coordinates chart
  pc
    .selectAll("myPath")
    .data(focused_data)
    .join("path")
    .attr("d",  path)
    .style("fill", "none")
    .style("stroke", function(d) { return pc_color(d.experience_level); })
    .style("opacity", 0.6)
    .style("stroke-width", "1.5px");

  // draw axis
  pc.selectAll("myAxis")
    .data(dimensions).enter()
    .append("g")
    .attr("transform", function(d) { return "translate(" + x(d) + ")"; })
    .each(function(d) { d3.select(this).call(d3.axisLeft().scale(y[d])); })
    .append("text")
      .style("text-anchor", "middle")
      .attr("y", -15)
      .text(function(d) { return d; })
      .style("fill", "black")
});