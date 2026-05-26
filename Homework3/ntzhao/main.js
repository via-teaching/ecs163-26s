const windowWidth = window.innerWidth;
const windowHeight = window.innerHeight;

const useLargeLayout = windowWidth > 700;

// Standard margin (applies to all vis)
const margin = useLargeLayout
  ? { top: 30, right: 40, bottom: 100, left: 50 }
  : { top: 30, right: 40, bottom: 120, left: 50 };
const headerHeight = 60;

// Width allocated to legend box
const legendWidth = 60;

// Square size allocated to legend color
const legendDotSize = useLargeLayout ? windowHeight * 0.02 : 10;

// Height for each visualization
const visHeight = windowHeight / 2 - margin.top - margin.bottom - headerHeight;
const mobileVisHeight =
  windowHeight / 3 - margin.top - margin.bottom - headerHeight;

// Height for the div wrapper of each visualization
// Used to dynamically set wrapper height in this script.
const visDivHeight = windowHeight / 2 - headerHeight / 2;
const mobileVisDivHeight = windowHeight / 3 - headerHeight / 3;

// Font size defaults to 12 on most screens
const standardFontSize = useLargeLayout ? 12 : 10;

const visSizes = {
  plot1: {
    left: 0,
    top: 0,
    margin,
    width: useLargeLayout
      ? windowWidth / 2 - margin.left - margin.right
      : windowWidth - margin.left - margin.right,
    height: useLargeLayout ? visHeight : mobileVisHeight,
    legendWidth,
  },
  plot2: {
    left: 0,
    top: 0,
    margin,
    width: useLargeLayout
      ? windowWidth / 2 - margin.left - margin.right
      : windowWidth - margin.left - margin.right,
    height: useLargeLayout ? visHeight : mobileVisHeight,
    legendWidth,
  },
  plot3: {
    left: 0,
    top: 0,
    margin,
    width: useLargeLayout
      ? windowWidth - margin.left - margin.right - legendWidth
      : windowWidth - margin.left - margin.right,
    height: useLargeLayout ? visHeight : mobileVisHeight,
    legendWidth,
  },
};

// Genres referenced in the dataset
const genres = [
  "Classical",
  "Country",
  "EDM",
  "Folk",
  "Gospel",
  "Hip hop",
  "Jazz",
  "K pop",
  "Latin",
  "Lofi",
  "Metal",
  "Pop",
  "R&B",
  "Rap",
  "Rock",
  "Video game music",
];

// Statically define colors
// Validation: https://projects.susielu.com/viz-palette?colors=%5B%22%2307072b%22%2C%22%23204fa7%22%2C%22%23ab90f0%22%2C%22%239f309c%22%2C%22%23ea9bd7%22%2C%22%23ffa5a5%22%2C%22%23fa6a36%22%2C%22%23ffcc00%22%2C%22%23a1d664%22%2C%22%23448040%22%2C%22%2342dca9%22%2C%22%235ab3fa%22%2C%22%23717171%22%2C%22%23b58f5d%22%2C%22%235e5e7f%22%2C%22%23743333%22%5D
const colors = [
  "#9f309c",
  "#717171",
  "#ffa5a5",
  "#448040",
  "#5e5e7f",
  "#42dca9",
  "#ea9bd7",
  "#fa6a36",
  "#07072b",
  "#204fa7",
  "#ab90f0",
  "#5ab3fa",
  "#a1d664",
  "#b58f5d",
  "#ffcc00",
  "#743333",
];

// Scale chosen colors over chosen genres
// Docs: https://d3js.org/d3-scale/ordinal
var color = d3.scaleOrdinal().domain(genres).range(colors);

/**
 * Given an array of objects, perform a linear regression with respect to two variables
 * and return the slope and intercept of the regression.
 *
 * @param { Object[] } data Array of objects that contain attributes xAttr and yAttr
 * @param { string } xAttr Parseable as integer, the variable to use for x-axis
 * @param { string } yAttr Parseable as integer, the variable to use for y-axis
 * @returns
 */
function linearRegression(data, xAttr, yAttr) {
  const n = data.length;
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0;

  data.forEach((d) => {
    const hours = parseInt(d[xAttr]);
    const mhc = parseInt(d[yAttr]);
    sumX += hours;
    sumY += mhc;
    sumXY += hours * mhc;
    sumX2 += hours * hours;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

/**
 * Given a slope, intercept, and x-value, calculate the output for a linear function.
 *
 * @param { number } slope
 * @param { number } intercept
 * @param { number } x
 *
 * @returns Calculated linear function output.
 */
function calculateLineValue(slope, intercept, x) {
  return slope * x + intercept;
}

// Dynamically set heights of layout rows
const layoutTopRow = d3
  .select("#layoutTopRow")
  .style(
    "height",
    `${windowHeight > 700 ? visDivHeight : mobileVisDivHeight}px`,
  );
const layoutBottomRow = d3
  .select("#layoutBottomRow")
  .style(
    "height",
    `${windowHeight > 700 ? visDivHeight : mobileVisDivHeight}px`,
  );

// Parse data and make graphs
d3.csv("data/mxmh_survey_results.csv").then((rawData) => {
  // Add additional column "Mental health challenges" summing Anxiety, Depression, and OCD values
  // Filter out outlier/impossible values
  const data = rawData
    .map((d) => ({
      ...d,
      "Mental health challenges": +d.Anxiety + +d.Depression + +d.OCD,
    }))
    .filter(
      (d) => d["Hours per day"] < 24 && d.Age > 5 && d.BPM && d.BPM < 300,
    );

  // BAR CHART
  // Docs: https://d3-graph-gallery.com/barplot

  // Count how many results there are for each genre in the survey
  // Will be used to create bar heights in bar chart.
  const counts = new Map();
  genres.forEach((genre) => counts.set(genre, 0));
  data.forEach((d) =>
    counts.set(d["Fav genre"], counts.get(d["Fav genre"]) + 1),
  );

  // Map counts into an array to pass in as data to bar creation
  const countsArray = Array.from(counts)
    .map(([genre, count]) => ({
      genre,
      count,
    }))
    .sort((itemA, itemB) => itemA.genre.localeCompare(itemB.genre));

  // Create element for bar chart
  const g1 = d3
    .select("#g1")
    .append("g")
    .attr(
      "width",
      visSizes.plot1.width +
        visSizes.plot1.margin.left +
        visSizes.plot1.margin.right,
    )
    .attr(
      "height",
      visSizes.plot1.height +
        visSizes.plot1.margin.top +
        visSizes.plot1.margin.bottom,
    )
    .attr("transform", "translate(" + margin.left + "," + margin.left + ")");

  // Create x-scale for bar chart
  var barX = d3
    .scaleBand()
    .range([0, visSizes.plot1.width])
    .domain(genres)
    .padding(0.2);

  // Create x-axis for bar chart
  g1.append("g")
    .attr("transform", "translate(0," + visSizes.plot1.height + ")")
    .call(d3.axisBottom(barX))
    .selectAll("text")
    .attr("transform", `translate(-10,0)rotate(${useLargeLayout ? -30 : -20})`)
    .style("text-anchor", "end")
    .style(
      "font-size",
      useLargeLayout ? standardFontSize : standardFontSize * 0.833,
    );

  // Create y-scale for bar chart
  var barY = d3
    .scaleLinear()
    .domain([
      0,
      Math.max(...Array.from(counts.values()).map((count) => parseInt(count))),
    ])
    .range([visSizes.plot1.height, 0]);

  // Add y-axis for bar chart
  g1.append("g").call(d3.axisLeft(barY));

  // Add x-axis label
  g1.append("text")
    .attr("text-anchor", "end")
    .attr("x", visSizes.plot1.width + 30)
    .attr("y", visSizes.plot1.height + margin.top + 20)
    .text("Favorite genre")
    .style("font-family", "Arial")
    .style("font-size", standardFontSize);

  // Add y-axis label
  g1.append("text")
    .attr("text-anchor", "end")
    .attr("transform", "rotate(-90)")
    .attr("y", -margin.left + 10)
    .attr("x", -margin.top)
    .text("Frequency")
    .style("font-family", "Arial")
    .style("font-size", standardFontSize);

  // Add bar chart title
  g1.append("text")
    .attr("text-anchor", "middle")
    .attr("x", visSizes.plot1.width / 2)
    .attr("y", -20)
    .text("Frequency of favorite genres in dataset")
    .style("font-family", "Arial")
    .style("font-size", standardFontSize * 1.125);

  // Bars
  g1.selectAll("mybar")
    .data(countsArray)
    .enter()
    .append("rect")
    .attr("class", (d) => `bar bar-${getGenreKey(d.genre)}`)
    .attr("x", (d) => barX(d.genre))
    .attr("y", (d) => barY(d.count))
    .attr("width", barX.bandwidth())
    .attr("height", (d) => visSizes.plot1.height - barY(d.count))
    .attr("fill", (d) => color(d.genre))
    .style("opacity", 0.75)
    .on("mouseover", (d) => onGenreMouseEnter(d.genre))
    .on("mouseleave", (d) => onGenreMouseLeave(d.genre));

  // SCATTER PLOT
  // Docs: https://d3-graph-gallery.com/scatter.html

  // Create element for scatterplot
  const g2 = d3
    .select("#g2")
    .append("g")
    .attr(
      "width",
      visSizes.plot2.width +
        visSizes.plot2.margin.left +
        visSizes.plot2.margin.right,
    )
    .attr(
      "height",
      visSizes.plot2.height +
        visSizes.plot2.margin.top +
        visSizes.plot2.margin.bottom,
    )
    .attr("transform", "translate(" + margin.left + "," + margin.left + ")");

  // Create x-scale for scatterplot
  var scatterX = d3
    .scaleLinear()
    .domain([0, 20])
    .range([0, visSizes.plot2.width]);

  // Add x-axis for scatterplot
  g2.append("g")
    .attr("transform", "translate(0," + visSizes.plot2.height + ")")
    .call(d3.axisBottom(scatterX));

  // Create y-scale for scatterplot
  var scatterY = d3
    .scaleLinear()
    .domain([0, 30])
    .range([visSizes.plot2.height, 0]);

  // Add y-axis for scatterplot
  g2.append("g").call(d3.axisLeft(scatterY));

  // Add x-axis label
  g2.append("text")
    .attr("text-anchor", "end")
    .attr("x", visSizes.plot2.width)
    .attr("y", visSizes.plot2.height + margin.top + 10)
    .text("Hours per day of music")
    .style("font-family", "Arial")
    .style("font-size", standardFontSize);

  // Add y-axis label
  g2.append("text")
    .attr("text-anchor", "end")
    .attr("transform", "rotate(-90)")
    .attr("y", -margin.left + 10)
    .attr("x", -margin.top)
    .text("Mental health challenges")
    .style("font-family", "Arial")
    .style("font-size", standardFontSize);

  // Add scatterplot title
  g2.append("text")
    .attr("text-anchor", "middle")
    .attr("x", visSizes.plot2.width / 2)
    .attr("y", -20)
    .text("Mental health challenges vs. hours per day of music")
    .style("font-family", "Arial")
    .style("font-size", standardFontSize * 1.125);

  // Add scatterplot dots
  g2.append("g")
    .selectAll("dot")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", (d) => scatterX(d["Hours per day"]))
    .attr("cy", (d) => scatterY(d["Mental health challenges"]))
    .attr("r", 1.5)
    .style("fill", "#69b3a2");

  // Perform linear regression to get trendline
  const { slope, intercept } = linearRegression(
    data,
    "Hours per day",
    "Mental health challenges",
  );

  // Add scatterplot trendline
  g2.append("line")
    .attr("x1", scatterX(0))
    .attr("x2", scatterX(20))
    .attr("y1", scatterY(calculateLineValue(slope, intercept, 0)))
    .attr("y2", scatterY(calculateLineValue(slope, intercept, 20)))
    .style("stroke", "#3896b2")
    .style("opacity", 0.5)
    .style("stroke-width", 2);

  // PARALLEL COORDINATES PLOT
  // Docs: https://d3-graph-gallery.com/parallel.html

  console.log(visSizes.plot3);

  // Create element for parallel coordinates plot
  const g3 = d3
    .select("#g3")
    .append("g")
    .attr(
      "width",
      visSizes.plot3.width +
        visSizes.plot3.margin.left +
        visSizes.plot3.margin.right,
    )
    .attr(
      "height",
      visSizes.plot3.height +
        visSizes.plot3.margin.top * 2 +
        visSizes.plot3.margin.bottom,
    )
    .attr("transform", "translate(" + margin.left + "," + margin.top * 2 + ")");

  // Choose dimensions for parallel coordinates plot
  // If window size is smaller, use less dimensions
  const dimensions =
    windowWidth < 1000
      ? [
          "BPM",
          "Age",
          "Hours per day",
          "Mental health challenges", // Sum of Anxiety, Depression, and OCD
        ]
      : [
          "BPM",
          "Age",
          "Hours per day",
          "Mental health challenges", // Sum of Anxiety, Depression, and OCD
          "Anxiety",
          "Insomnia",
          "Depression",
          "OCD",
        ];

  // Create y-scale for each dimension
  var y = {};
  for (let i in dimensions) {
    name = dimensions[i];
    const extent = d3.extent(data, (d) => +d[name]);
    y[name] =
      name === "Mental health challenges"
        ? d3
            .scaleSymlog()
            .constant(10)
            .domain(extent)
            .range([visSizes.plot3.height, 0])
        : d3.scaleLinear().domain(extent).range([visSizes.plot3.height, 0]);
  }

  // Create x-scale over available dimensions
  x = d3
    .scalePoint()
    .range([0, visSizes.plot3.width])
    .padding(1)
    .domain(dimensions);

  /**
   * Whitespace and special characters make genre names unparseable for class names.
   * This function deterministically creates a key for these unparsesable names.
   *
   * @param { string } name Genre name from dataset.
   * @returns Modified genre name, useable for class name.
   */
  function getGenreKey(name) {
    switch (name) {
      case "R&B":
        return "RnB";
      case "K pop":
        return "Kpop";
      case "Hip hop":
        return "Hiphop";
      case "Video game music":
        return "Game";
      default:
        return name;
    }
  }

  const size = 20;

  // Create lines for the graph
  g3.selectAll("parallelLines")
    .data(data)
    .enter()
    .append("path")
    .attr("class", (d) => "line " + getGenreKey(d["Fav genre"]))
    .attr("d", (d) => d3.line()(dimensions.map((p) => [x(p), y[p](d[p])])))
    .style("fill", "none")
    .style("stroke", (d) => color(d["Fav genre"]))
    .style("stroke-width", 1.5)
    .style("opacity", 0.5);

  // Create y-axes
  g3.selectAll("axis")
    .data(dimensions)
    .enter()
    .append("g")
    .attr("transform", (d) => "translate(" + x(d) + ")")
    .each(function (d) {
      return d3.select(this).call(d3.axisLeft().scale(y[d]));
    })
    // Add axis title to each axis
    .append("text")
    .style("text-anchor", "middle")
    .attr("y", -9)
    .text((d) => d)
    .style("fill", "black")
    .style("font-size", standardFontSize);

  // Add chart legend to illustrate genre colors
  // With added interactivity (hover to highlight certain genre)
  // Docs: https://d3-graph-gallery.com/graph/custom_legend.html
  const legendRowLength = useLargeLayout
    ? 1
    : windowWidth > 500
      ? genres.length / 4
      : genres.length / 8;

  const legend = g3
    .append("g")
    .attr(
      "transform",
      `translate(${useLargeLayout ? visSizes.plot3.width - legendWidth : 0}, ${useLargeLayout ? 10 : visSizes.plot3.height + 80})`,
    );

  // Create legend label
  const legendLabel = legend
    .append("text")
    .attr("anchor", "middle")
    .attr("x", 0)
    .attr("y", -40)
    .text("Favorite Genre")
    .style("font-family", "Arial")
    .style("font-size", standardFontSize);

  // Create legend hint subtext
  const legendSubtext = legend
    .append("text")
    .attr("anchor", "middle")
    .attr("x", 0)
    .attr("y", -28)
    .text("(HOVER TO HIGHLIGHT)")
    .style("font-family", "Arial")
    .style("font-size", standardFontSize * 0.833);

  const legendItem = legend
    .selectAll(".legend-item")
    .data(genres)
    .enter()
    .append("g")
    .attr(
      "transform",
      (d, i) =>
        `translate(${Math.floor(i % legendRowLength) * 100}, ${Math.floor(i / legendRowLength) * (legendDotSize * 1.2) - 20})`,
    )
    .style("cursor", "pointer")
    .on("mouseover", (event, idx) => onGenreMouseEnter(genres[idx]))
    .on("mouseleave", (event, idx) => onGenreMouseLeave(genres[idx]));

  // Create colored squares for legend
  legendItem
    .append("rect")
    .attr(
      "class",
      (d, i) => `legend-square legend-square-${getGenreKey(genres[i])}`,
    )
    .attr("width", legendDotSize)
    .attr("height", legendDotSize)
    .style("fill", (d) => color(d))
    .style("opacity", 0.75);

  // Create legend item text labels
  legendItem
    .append("text")
    .attr("x", legendDotSize + 8)
    .attr("y", legendDotSize / 2)
    .attr("dominant-baseline", "middle")
    .style("font-size", standardFontSize)
    .style("font-family", "Arial")
    .text((d) => d);

  // Add parallel coordinates title
  g3.append("text")
    .attr("text-anchor", "middle")
    .attr("x", visSizes.plot3.width / 2)
    .attr("y", -30)
    .text("Music and Mental Health: Parallel Coorindates")
    .style("font-family", "Arial")
    .style("font-size", standardFontSize * 1.125);

  // INTERACTIVITY

  function activateBarHover(genre) {
    d3.selectAll(".bar").transition().duration(200).style("opacity", 0.5);

    d3.select(".bar-" + getGenreKey(genre))
      .transition()
      .duration(200)
      .style("opacity", 1.0);
  }

  function deactivateBarHover() {
    d3.selectAll(".bar").transition().duration(200).style("opacity", 0.75);
  }

  function activateParallelHover(genre) {
    d3.selectAll(".line")
      .transition()
      .duration(200)
      .style("stroke", "lightgrey")
      .style("opacity", 0.1);

    d3.selectAll("." + getGenreKey(genre))
      .transition()
      .duration(200)
      .style("stroke", color(genre))
      .style("opacity", 1.0);

    d3.selectAll(".legend-square")
      .transition()
      .duration(200)
      .style("opacity", 0.5);

    d3.select(".legend-square-" + getGenreKey(genre))
      .transition()
      .duration(200)
      .style("opacity", 1.0);
  }

  function deactivateParallelHover(genre) {
    d3.selectAll(".line")
      .transition()
      .duration(200)
      .style("stroke", (d) => color(d["Fav genre"]))
      .style("opacity", 0.5);

    d3.selectAll(".legend-square")
      .transition()
      .duration(200)
      .style("opacity", 0.75);
  }

  function onGenreMouseEnter(genre) {
    activateBarHover(genre);
    activateParallelHover(genre);
  }

  function onGenreMouseLeave(genre) {
    deactivateBarHover();
    deactivateParallelHover(genre);
  }
});
