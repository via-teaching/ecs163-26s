// Remove default spacing.
d3.select("body")
  .style("margin", "0")
  .style("padding", "0")
  .style("overflow", "hidden");

// Canvas size.
const width = window.innerWidth;
const height = window.innerHeight;

// Main SVG.
const svg = d3.select("body")
  .select("svg")
  .attr("width", width)
  .attr("height", height);

// Selected genre for plot 1.
let selectedGenre = null;

// Load survey data.
d3.csv("mxmh_survey_results.csv").then(function(data) {

  // Convert numeric fields.
  data.forEach(function(d) {
    d.Age = +d.Age;
    d.Hours = +d["Hours per day"];
    d.Anxiety = +d.Anxiety;
    d.Depression = +d.Depression;
    d.Insomnia = +d.Insomnia;
    d.OCD = +d.OCD;
  });

  // Remove invalid rows.
  data = data.filter(function(d) {
    return !isNaN(d.Hours) &&
      !isNaN(d.Anxiety) &&
      !isNaN(d.Depression) &&
      !isNaN(d.Insomnia) &&
      !isNaN(d.OCD) &&
      d["Fav genre"];
  });

  // Draw dashboard views.
  drawTitle();
  drawGenreBar(data);
  drawScatter(data);
  drawParallelCoordinates(data);
});

// Dashboard title.
function drawTitle() {
  // Main title.
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", 24)
    .attr("text-anchor", "middle")
    .attr("font-size", "22px")
    .attr("font-weight", "bold")
    .text("Music and Mental Health Dashboard");

  // Interaction instruction.
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", 45)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .attr("fill", "#444")
    .text("Click a genre bar to highlight it. Brush the scatter plot to highlight selected points.");
}

// Plot 1: overview bar chart.
function drawGenreBar(data) {
  const margin = { top: 75, right: 30, bottom: 90, left: 90 };
  const chartWidth = width * 0.48;
  const chartHeight = height * 0.43;

  // Count genres.
  const genreMap = d3.nest()
    .key(function(d) {
      return d["Fav genre"];
    })
    .rollup(function(v) {
      return v.length;
    })
    .entries(data);

  // Format genre counts.
  const genreCounts = genreMap.map(function(d) {
    return {
      genre: d.key,
      count: d.value
    };
  }).sort(function(a, b) {
    return b.count - a.count;
  });

  // X scale for genres.
  const x = d3.scaleBand()
    .domain(genreCounts.map(function(d) {
      return d.genre;
    }))
    .range([margin.left, chartWidth - margin.right])
    .padding(0.25);

  // Y scale for counts.
  const y = d3.scaleLinear()
    .domain([0, d3.max(genreCounts, function(d) {
      return d.count;
    })])
    .nice()
    .range([chartHeight - margin.bottom, margin.top]);

  // Bar chart group.
  const g = svg.append("g");

  // Plot title.
  g.append("text")
    .attr("x", chartWidth / 2)
    .attr("y", 45)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .attr("font-weight", "bold")
    .text("Overview: Favorite Music Genre Distribution");

  // Plot instruction.
  g.append("text")
    .attr("x", chartWidth / 2)
    .attr("y", 60)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .attr("fill", "#444")
    .text("Selection: click a bar to highlight one genre.");

  // Bars for genre counts.
  const bars = g.selectAll("rect")
    .data(genreCounts)
    .enter()
    .append("rect")
    .attr("x", function(d) {
      return x(d.genre);
    })
    .attr("y", function(d) {
      return y(d.count);
    })
    .attr("width", x.bandwidth())
    .attr("height", function(d) {
      return y(0) - y(d.count);
    })
    .attr("fill", "#6b8fd6")
    .attr("cursor", "pointer")
    .on("click", function(d) {
      // Toggle selected genre.
      if (selectedGenre === d.genre) {
        selectedGenre = null;
      } else {
        selectedGenre = d.genre;
      }

      // Animate selected bars.
      bars
        .transition()
        .duration(500)
        .attr("fill", function(barData) {
          if (selectedGenre === null) {
            return "#6b8fd6";
          }

          if (barData.genre === selectedGenre) {
            return "#f28e2b";
          }

          return "#c7c7c7";
        })
        .attr("opacity", function(barData) {
          if (selectedGenre === null || barData.genre === selectedGenre) {
            return 1;
          }

          return 0.45;
        });
    });

  // X axis.
  g.append("g")
    .attr("transform", "translate(0," + (chartHeight - margin.bottom) + ")")
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-40)")
    .style("text-anchor", "end");

  // Y axis.
  g.append("g")
    .attr("transform", "translate(" + margin.left + ",0)")
    .call(d3.axisLeft(y));

  // X label.
  g.append("text")
    .attr("x", chartWidth / 2)
    .attr("y", chartHeight - 8)
    .attr("text-anchor", "middle")
    .text("Favorite Genre");

  // Y label.
  g.append("text")
    .attr("x", -chartHeight / 2)
    .attr("y", 18)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .text("Number of Participants");

  // Bar chart note.
  g.append("text")
    .attr("x", margin.left *5)
    .attr("y", chartHeight - 20)
    .attr("font-size", "12px")
    .text("Each bar shows how many participants chose that genre.");
}

// Plot 2: scatter plot.
function drawScatter(data) {
  const margin = { top: 75, right: 40, bottom: 70, left: 70 };
  const chartWidth = width * 0.48;
  const chartHeight = height * 0.43;
  const offsetX = width * 0.5;

  // X scale for listening hours.
  const x = d3.scaleLinear()
    .domain([0, d3.max(data, function(d) {
      return d.Hours;
    })])
    .nice()
    .range([offsetX + margin.left, offsetX + chartWidth - margin.right]);

  // Y scale for anxiety.
  const y = d3.scaleLinear()
    .domain([0, 10])
    .range([chartHeight - margin.bottom, margin.top]);

  // Color scale for depression.
  const color = d3.scaleLinear()
    .domain([0, 10])
    .range(["#bde0fe", "#c1121f"]);

  // Scatter plot group.
  const g = svg.append("g");

  // Plot title.
  g.append("text")
    .attr("x", offsetX + chartWidth / 2)
    .attr("y", 45)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .attr("font-weight", "bold")
    .text("Focus View: Listening Hours vs Anxiety");

  // Plot instruction.
  g.append("text")
    .attr("x", offsetX + chartWidth / 2)
    .attr("y", 60)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .attr("fill", "#444")
    .text("Brushing: drag a box to highlight selected points.");

  // Dots for participants.
  const circles = g.selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", function(d) {
      return x(d.Hours);
    })
    .attr("cy", function(d) {
      return y(d.Anxiety);
    })
    .attr("r", 4)
    .attr("fill", function(d) {
      return color(d.Depression);
    })
    .attr("opacity", 0.65);

  // X axis.
  g.append("g")
    .attr("transform", "translate(0," + (chartHeight - margin.bottom) + ")")
    .call(d3.axisBottom(x));

  // Y axis.
  g.append("g")
    .attr("transform", "translate(" + (offsetX + margin.left) + ",0)")
    .call(d3.axisLeft(y));

  // X label.
  g.append("text")
    .attr("x", offsetX + chartWidth / 2)
    .attr("y", chartHeight - 20)
    .attr("text-anchor", "middle")
    .text("Hours Listening to Music per Day");

  // Y label.
  g.append("text")
    .attr("x", -chartHeight / 2)
    .attr("y", offsetX + 20)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .text("Anxiety Score");

  // Color legend note.
  g.append("text")
    .attr("x", offsetX + chartWidth - 170)
    .attr("y", 45)
    .attr("font-size", "12px")
    .text("Color: Depression score");

  // Brush area.
  const brush = d3.brush()
    .extent([
      [offsetX + margin.left, margin.top],
      [offsetX + chartWidth - margin.right, chartHeight - margin.bottom]
    ])
    .on("end", brushed);

  // Brush layer.
  g.append("g")
    .attr("class", "brush")
    .call(brush);

  // Brush interaction.
  function brushed() {
    const selection = d3.event.selection;

    // Reset dots.
    if (selection === null) {
      circles
        .transition()
        .duration(500)
        .attr("r", 4)
        .attr("opacity", 0.65);

      return;
    }

    const x0 = selection[0][0];
    const y0 = selection[0][1];
    const x1 = selection[1][0];
    const y1 = selection[1][1];

    // Highlight brushed dots.
    circles
      .transition()
      .duration(500)
      .attr("r", function(d) {
        const cx = x(d.Hours);
        const cy = y(d.Anxiety);
        const selected = cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;

        if (selected) {
          return 6;
        }

        return 3;
      })
      .attr("opacity", function(d) {
        const cx = x(d.Hours);
        const cy = y(d.Anxiety);
        const selected = cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;

        if (selected) {
          return 0.95;
        }

        return 0.15;
      });
  }
}

// Plot 3: parallel coordinates.
function drawParallelCoordinates(data) {
  const margin = { top: 45, right: 80, bottom: 50, left: 80 };
  const chartWidth = width * 0.92;
  const chartHeight = height * 0.48;
  const offsetY = height * 0.45;

  // Axes for mental health scores.
  const dimensions = ["Anxiety", "Depression", "Insomnia", "OCD"];

  // X scale for dimensions.
  const x = d3.scalePoint()
    .domain(dimensions)
    .range([margin.left, chartWidth - margin.right]);

  // Y scales for each dimension.
  const y = {};

  dimensions.forEach(function(dim) {
    y[dim] = d3.scaleLinear()
      .domain([0, 10])
      .range([offsetY + chartHeight - margin.bottom, offsetY + margin.top]);
  });

  // Line generator.
  const line = d3.line();

  // Parallel coordinates group.
  const g = svg.append("g");

  // Plot title.
  g.append("text")
    .attr("x", chartWidth / 2)
    .attr("y", offsetY + 25)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .attr("font-weight", "bold")
    .text("Advanced View: Parallel Coordinates of Mental Health Scores");

  // Plot note.
  g.append("text")
    .attr("x", chartWidth / 2)
    .attr("y", offsetY + 43)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .attr("fill", "#444")
    .text("Each line shows one participant across four mental health scores.");

  // Lines for participants.
  g.selectAll(".path")
    .data(data.slice(0, 250))
    .enter()
    .append("path")
    .attr("d", function(d) {
      return line(dimensions.map(function(dim) {
        return [x(dim), y[dim](d[dim])];
      }));
    })
    .attr("fill", "none")
    .attr("stroke", "#555")
    .attr("stroke-width", 1)
    .attr("opacity", 0.18);

  // Axes and labels.
  dimensions.forEach(function(dim) {
    // Vertical axis.
    g.append("g")
      .attr("transform", "translate(" + x(dim) + ",0)")
      .call(d3.axisLeft(y[dim]));

    // Axis label.
    g.append("text")
      .attr("x", x(dim))
      .attr("y", offsetY + chartHeight - 15)
      .attr("text-anchor", "middle")
      .attr("font-weight", "bold")
      .text(dim);
  });

  // Parallel coordinates note.
  g.append("text")
    .attr("x", chartWidth - 180)
    .attr("y", offsetY + 30)
    .attr("font-size", "12px")
    .text("Advanced view: one line per participant.");
}