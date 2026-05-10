// Remove default browser spacing so the dashboard fills the page.
d3.select("body")
  .style("margin", "0")
  .style("padding", "0")
  .style("overflow", "hidden");

// Use the current browser window size for the dashboard.
const width = window.innerWidth;
const height = window.innerHeight;

// Select the existing SVG element from index.html and set its size.
const svg = d3.select("body")
  .select("svg")
  .attr("width", width)
  .attr("height", height);

// Load the Music and Mental Health survey dataset.
d3.csv("mxmh_survey_results.csv").then(function(data) {

  // Convert important columns from strings into numbers.
  data.forEach(function(d) {
    d.Age = +d.Age;
    d.Hours = +d["Hours per day"];
    d.Anxiety = +d.Anxiety;
    d.Depression = +d.Depression;
    d.Insomnia = +d.Insomnia;
    d.OCD = +d.OCD;
  });

  // Remove rows with missing or invalid values used by the dashboard.
  data = data.filter(function(d) {
    return !isNaN(d.Hours) &&
      !isNaN(d.Anxiety) &&
      !isNaN(d.Depression) &&
      !isNaN(d.Insomnia) &&
      !isNaN(d.OCD) &&
      d["Fav genre"];
  });

  // Draw the dashboard title and the three visualization views.
  drawTitle();
  drawGenreBar(data);
  drawScatter(data);
  drawParallelCoordinates(data);
});

// Add the main dashboard title.
function drawTitle() {
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", 24)
    .attr("text-anchor", "middle")
    .attr("font-size", "22px")
    .attr("font-weight", "bold")
    .text("Music and Mental Health Dashboard");
}

// Draw an overview bar chart showing favorite music genre distribution.
function drawGenreBar(data) {
  const margin = { top: 65, right: 30, bottom: 90, left: 90 };
  const chartWidth = width * 0.48;
  const chartHeight = height * 0.43;

  // Count how many participants selected each favorite genre.
  const genreMap = d3.nest()
    .key(function(d) {
      return d["Fav genre"];
    })
    .rollup(function(v) {
      return v.length;
    })
    .entries(data);

  // Convert the grouped data into an array and sort by count.
  const genreCounts = genreMap.map(function(d) {
    return {
      genre: d.key,
      count: d.value
    };
  }).sort(function(a, b) {
    return b.count - a.count;
  });

  // Create a band scale for genre categories on the x-axis.
  const x = d3.scaleBand()
    .domain(genreCounts.map(function(d) {
      return d.genre;
    }))
    .range([margin.left, chartWidth - margin.right])
    .padding(0.25);

  // Create a linear scale for participant counts on the y-axis.
  const y = d3.scaleLinear()
    .domain([0, d3.max(genreCounts, function(d) {
      return d.count;
    })])
    .nice()
    .range([chartHeight - margin.bottom, margin.top]);

  // Create a group for the bar chart elements.
  const g = svg.append("g");

  // Add the bar chart title.
  g.append("text")
    .attr("x", chartWidth / 2)
    .attr("y", 50)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .attr("font-weight", "bold")
    .text("Overview: Favorite Music Genre Distribution");

  // Draw one bar for each music genre.
  g.selectAll("rect")
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
    .attr("fill", "#6b8fd6");

  // Add the x-axis with rotated genre labels.
  g.append("g")
    .attr("transform", "translate(0," + (chartHeight - margin.bottom) + ")")
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-40)")
    .style("text-anchor", "end");

  // Add the y-axis for participant counts.
  g.append("g")
    .attr("transform", "translate(" + margin.left + ",0)")
    .call(d3.axisLeft(y));

  // Add the x-axis label.
  g.append("text")
    .attr("x", chartWidth / 2)
    .attr("y", chartHeight - 8)
    .attr("text-anchor", "middle")
    .text("Favorite Genre");

  // Add the y-axis label.
  g.append("text")
    .attr("x", -chartHeight / 2)
    .attr("y", 18)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .text("Number of Participants");

  // Add a short annotation explaining the bar chart.
  g.append("text")
    .attr("x", margin.left - 30)
    .attr("y", chartHeight - 20)
    .attr("font-size", "12px")
    .text("Each bar shows how many participants chose that genre.");
}

// Draw a focus scatter plot comparing listening hours and anxiety.
function drawScatter(data) {
  const margin = { top: 65, right: 40, bottom: 70, left: 70 };
  const chartWidth = width * 0.48;
  const chartHeight = height * 0.43;
  const offsetX = width * 0.5;

  // Create a linear scale for hours listened per day.
  const x = d3.scaleLinear()
    .domain([0, d3.max(data, function(d) {
      return d.Hours;
    })])
    .nice()
    .range([offsetX + margin.left, offsetX + chartWidth - margin.right]);

  // Create a linear scale for anxiety scores.
  const y = d3.scaleLinear()
    .domain([0, 10])
    .range([chartHeight - margin.bottom, margin.top]);

  // Use color to encode depression score as a third variable.
  const color = d3.scaleLinear()
    .domain([0, 10])
    .range(["#bde0fe", "#c1121f"]);

  // Create a group for the scatter plot elements.
  const g = svg.append("g");

  // Add the scatter plot title.
  g.append("text")
    .attr("x", offsetX + chartWidth / 2)
    .attr("y", 50)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .attr("font-weight", "bold")
    .text("Focus View: Listening Hours vs Anxiety");

  // Draw one circle for each participant.
  g.selectAll("circle")
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

  // Add the x-axis for listening hours.
  g.append("g")
    .attr("transform", "translate(0," + (chartHeight - margin.bottom) + ")")
    .call(d3.axisBottom(x));

  // Add the y-axis for anxiety score.
  g.append("g")
    .attr("transform", "translate(" + (offsetX + margin.left) + ",0)")
    .call(d3.axisLeft(y));

  // Add the x-axis label.
  g.append("text")
    .attr("x", offsetX + chartWidth / 2)
    .attr("y", chartHeight - 20)
    .attr("text-anchor", "middle")
    .text("Hours Listening to Music per Day");

  // Add the y-axis label.
  g.append("text")
    .attr("x", -chartHeight / 2)
    .attr("y", offsetX + 20)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .text("Anxiety Score");

  // Add a legend note for the color encoding.
  g.append("text")
    .attr("x", offsetX + chartWidth - 170)
    .attr("y", 45)
    .attr("font-size", "12px")
    .text("Color: Depression score");
}

// Draw an advanced parallel coordinates plot for mental health scores.
function drawParallelCoordinates(data) {
  const margin = { top: 45, right: 80, bottom: 50, left: 80 };
  const chartWidth = width * 0.92;
  const chartHeight = height * 0.48;
  const offsetY = height * 0.45;

  // The dimensions shown as vertical axes in the parallel coordinates plot.
  const dimensions = ["Anxiety", "Depression", "Insomnia", "OCD"];

  // Create a point scale to place each mental health dimension horizontally.
  const x = d3.scalePoint()
    .domain(dimensions)
    .range([margin.left, chartWidth - margin.right]);

  // Create one y-scale for each mental health score.
  const y = {};

  dimensions.forEach(function(dim) {
    y[dim] = d3.scaleLinear()
      .domain([0, 10])
      .range([offsetY + chartHeight - margin.bottom, offsetY + margin.top]);
  });

  // Create a line generator for connecting values across dimensions.
  const line = d3.line();

  // Create a group for the parallel coordinates plot.
  const g = svg.append("g");

  // Add the parallel coordinates plot title.
  g.append("text")
    .attr("x", chartWidth / 2)
    .attr("y", offsetY + 25)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .attr("font-weight", "bold")
    .text("Advanced View: Parallel Coordinates of Mental Health Scores");

  // Draw one polyline for each participant.
  // Only the first 250 rows are shown to reduce visual clutter.
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

  // Add one vertical axis and label for each mental health dimension.
  dimensions.forEach(function(dim) {
    g.append("g")
      .attr("transform", "translate(" + x(dim) + ",0)")
      .call(d3.axisLeft(y[dim]));

    g.append("text")
      .attr("x", x(dim))
      .attr("y", offsetY + chartHeight - 15)
      .attr("text-anchor", "middle")
      .attr("font-weight", "bold")
      .text(dim);
  });

  // Add a short annotation explaining the parallel coordinates lines.
  g.append("text")
    .attr("x", chartWidth - 180)
    .attr("y", offsetY + 30)
    .attr("font-size", "12px")
    .text("Each line represents one participant.");
}