/* 
Sources used: 
https://d3-graph-gallery.com/graph/interactivity_transition.html
https://www.d3indepth.com/transitions/
https://d3-graph-gallery.com/index.html 
*/

// load data
d3.csv("ds_salaries.csv").then(function(data) {

  // global color scale
  const color_scale = d3.scaleOrdinal()
    .domain(["EN", "MI", "SE", "EX"])
    .range(["#7c75ff", "#75ff7e", "#75ffe6", "#ff7575"]);


  /////////////////////////////
  //  pie chart
  /////////////////////////////
  const pie_width = 350; 
  const pie_height = 220;
  const radius = Math.min(pie_width, pie_height) / 2 - 10;

  const pie_svg = d3.select("#pie-view")
    .append("svg")
      .attr("width", pie_width)
      .attr("height", pie_height)
    .append("g")
      .attr("transform", `translate(${pie_width/2}, ${pie_height/2})`);

  const level_count = d3.rollup(data, v => v.length, d => d.experience_level);
  const pie_data = Object.fromEntries(level_count);

  const pie = d3.pie().value(function(d) {return d[1]});
  const data_ready = pie(Object.entries(pie_data));

  active_slice = null; 

  pie_svg
    .selectAll('.pie-slice')
    .data(data_ready)
    .join('path')
    .attr('class', 'pie-slice') 
    .attr('d', d3.arc().innerRadius(0).outerRadius(radius))
    .attr('fill', function(d){ return(color_scale(d.data[0])) })
    .attr("stroke", "black")
    .style("stroke-width", "2px")
    .style("opacity", 0.7)
    .style("cursor", "pointer") 
    
    // darken and lighten slices on hover
    .on("mouseover", function(event, d) {
        if (active_slice !== d.data[0]) {
            d3.select(this).style("fill", d3.color(color_scale(d.data[0])).darker(0.7));
        }
    })
    .on("mouseout", function(event, d) {
        if (active_slice !== d.data[0]) {
            d3.select(this).style("fill", color_scale(d.data[0]));
        }
    })

    // filter data for histogram depending on what slice is selected
    .on("click", function(event, d) {
        const clicked_experience = d.data[0];
        d3.select(".brush").call(brush.move, null);
        
        if (active_slice === clicked_experience) {
            // reset to show all experience levels
            active_slice = null; 
            update_histogram(data, "all levels", "#69b3a2"); 
            update_pc(data);
        } else {
            active_slice = clicked_experience; 
            const slice_color = color_scale(clicked_experience); 
            
            const filtered_data = data.filter(function(row) {
                 return row.experience_level === clicked_experience;
            });
            
            update_histogram(filtered_data, clicked_experience, slice_color);
            update_pc(filtered_data);
        }

        pie_svg.selectAll('.pie-slice')
            .style("fill", function(slice_data) {
                if (active_slice === slice_data.data[0]) {
                    return d3.color(color_scale(slice_data.data[0])).darker(0.7);
                } else {
                    return color_scale(slice_data.data[0]);
                }                      
            });
    });

  var keys = Object.keys(pie_data);

  pie_svg.selectAll("mydots")
    .data(keys).enter()
    .append("circle")
      .attr("cx", radius + 30) 
      .attr("cy", function(d,i){ return -40 + i*25}) 
      .attr("r", 7)
      .style("fill", function(d){ return color_scale(d)});

  pie_svg.selectAll("mylabels")
    .data(keys).enter()
    .append("text")
      .attr("x", radius + 45) 
      .attr("y", function(d,i){ return -40 + i*25}) 
      .style("fill", function(d){ return color_scale(d)}) 
      .text(function(d){ return d})
      .attr("text-anchor", "left")
      .style("alignment-baseline", "middle");


  /////////////////////////////
  //  histogram
  /////////////////////////////
  
  var hist_margins = {top: 10, right: 30, bottom: 40, left: 50},
      hist_width = 450 - hist_margins.left - hist_margins.right,
      hist_height = 220 - hist_margins.top - hist_margins.bottom;

  var hist_svg = d3.select("#bar-view")
    .append("svg")
      .attr("width", hist_width + hist_margins.left + hist_margins.right)
      .attr("height", hist_height + hist_margins.top + hist_margins.bottom)
    .append("g")
      .attr("transform", "translate(" + hist_margins.left + "," + hist_margins.top + ")");

  var hist_x = d3.scaleLinear()
      .domain([0, d3.max(data, function(d) { return +d.salary_in_usd })])
      .range([0, hist_width]);
  
  hist_svg.append("g")
      .attr("transform", "translate(0," + hist_height + ")")
      .call(d3.axisBottom(hist_x));

  hist_svg.append("text")
      .attr("x", hist_width/2)
      .attr("y", hist_height + 35)
      .style("text-anchor", "middle")
      .text("Salary ($)")
      .style("font-size", "12px");

  var y_group = hist_svg.append("g");
  var hist_y = d3.scaleLinear().range([hist_height, 0]);

  function update_histogram(input_data, experience_level = "all levels", bar_color = "#69b3a2") {
      
      d3.select("#histogram-title").text("Context 2: Salaries for " + experience_level);

      var histogram = d3.histogram()
          .value(function(d) { return +d.salary_in_usd; }) 
          .domain(hist_x.domain())
          .thresholds(hist_x.ticks(40));

      var bins = histogram(input_data);

      hist_y.domain([0, d3.max(bins, function(d) { return d.length; })]);
      
      y_group.transition().duration(1000).call(d3.axisLeft(hist_y)); 

      var bars = hist_svg.selectAll(".bar-rect").data(bins);

      bars.join("rect")
          .attr("class", "bar-rect")
          .attr("x", 1)
          .attr("width", function(d) { return Math.max(0, hist_x(d.x1) - hist_x(d.x0) - 1) ; })
          .style("fill", bar_color) 
          .transition() 
          .duration(1000)
          .attr("transform", function(d) { return "translate(" + hist_x(d.x0) + "," + hist_y(d.length) + ")"; })
          .attr("height", function(d) { return hist_height - hist_y(d.length); });
  }

  update_histogram(data);

  // brushing
  const brush = d3.brushX()
      .extent([[0, 0], [hist_width, hist_height]])
      .on("start brush end", highlight_pc);

  hist_svg.append("g")
      .attr("class", "brush")
      .call(brush);


  /////////////////////////////
  //  parallel coordinates
  /////////////////////////////

  // filter dataset for data engineer values to set axes
  const all_focused_data = data.filter(function(d) { return d.job_title === "Data Engineer"; });

  const pc_margins = {top: 40, right: 10, bottom: 10, left: 10},
    pc_width = 1200 - pc_margins.left - pc_margins.right,
    pc_height = 280 - pc_margins.top - pc_margins.bottom;

  const pc = d3.select("#parallel-view")
  .append("svg")
    .attr("width", pc_width + pc_margins.left + pc_margins.right)
    .attr("height", pc_height + pc_margins.top + pc_margins.bottom)
  .append("g")
    .attr("transform", `translate(${pc_margins.left},${pc_margins.top})`);

  const dimensions = ["experience_level", "company_size", "salary_in_usd"];

  const y = {}
  for (let i in dimensions) {
    let name = dimensions[i]
    if (name === "salary_in_usd") {
        y[name] = d3.scaleLinear()
          .domain( d3.extent(all_focused_data, function(d) { return +d[name]; }) )
          .range([pc_height, 0])
    } else {
        let unique_vals = Array.from(new Set(all_focused_data.map(function(d) { return d[name]; })));
        
        if (name === "experience_level") {
            unique_vals = ["EX", "SE", "MI", "EN"];
        } else if (name === "company_size") {
            unique_vals = ["L", "M", "S"];
        }

        y[name] = d3.scalePoint().domain(unique_vals).range([pc_height, 0]);
    }
  }

  const x = d3.scalePoint()
    .range([0, pc_width])
    .padding(1)
    .domain(dimensions);

  function path(d) {
      return d3.line()(dimensions.map(function(p) { return [x(p), y[p](d[p])]; }));
  }

  // animate the PC plot
  function update_pc(input_data) {
      // filter data for data engineers
      const pc_data = input_data.filter(d => d.job_title === "Data Engineer");

      pc.selectAll(".pc-line")
        .data(pc_data)
        .join("path")
        .attr("class", "pc-line")
        .attr("d",  path)
        .style("fill", "none")
        .style("stroke", function(d) { return color_scale(d.experience_level); })
        .style("stroke-width", "1.5px")
        .style("opacity", 0.6); 
  }

  update_pc(data);

  // draw axes
  pc.selectAll("axis")
    .data(dimensions).enter()
    .append("g")
    .attr("transform", function(d) { return "translate(" + x(d) + ")"; })
    .each(function(d) { d3.select(this).call(d3.axisLeft().scale(y[d])); })
    .append("text")
      .style("text-anchor", "middle")
      .attr("y", -15)
      .text(function(d) { return d; })
      .style("fill", "black");

  // highlight on brush
  function highlight_pc(event) {
      const selection = event.selection;

      if (!selection) {
          pc.selectAll(".pc-line").style("opacity", 0.6);
          return;
      }

      const min_salary = hist_x.invert(selection[0]);
      const max_salary = hist_x.invert(selection[1]);

      pc.selectAll(".pc-line")
        .style("opacity", function(d) {
            const salary = +d.salary_in_usd;
            if (salary >= min_salary && salary <= max_salary) {
                return 0.8; 
            } else {
                return 0.05; 
            }
        });
  }
});
