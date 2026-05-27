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
const scatterLegendWidth = 32;

// Square size allocated to legend color
const legendDotSize = useLargeLayout ? windowHeight * 0.02 : 10;
const scatterLegendDotSize = legendDotSize * 0.75;

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
      ? windowWidth / 2 - margin.left - margin.right - scatterLegendWidth
      : windowWidth - margin.left - margin.right - scatterLegendWidth,
    height: useLargeLayout ? visHeight : mobileVisHeight,
    scatterLegendWidth,
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
  "Game",
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
  const yIntercept = (sumY - slope * sumX) / n;
  const xIntercept = -yIntercept / slope;

  return { slope, yIntercept, xIntercept };
}

/**
 * Given a slope, intercept, and x-value, calculate the output for a linear function.
 *
 * @param { number } slope
 * @param { number } yIntercept
 * @param { number } x
 *
 * @returns Calculated linear function output.
 */
function calculateLineValue(slope, yIntercept, x) {
  return slope * x + yIntercept;
}

// Dynamically set heights of layout rows
const layoutTopRow = d3
  .select("#layoutTopRow")
  .style(
    "height",
    `${useLargeLayout ? visDivHeight : 2 * mobileVisDivHeight}px`,
  );
const layoutBottomRow = d3
  .select("#layoutBottomRow")
  .style("height", `${useLargeLayout ? visDivHeight : mobileVisDivHeight}px`);

// Parse data and make graphs
d3.csv("data/mxmh_survey_results.csv").then((rawData) => {
  // Add additional column "Mental health challenges" summing Anxiety, Depression, and OCD values
  // Filter out outlier/impossible values
  const data = rawData
    .map((d) => ({
      ...d,
      "Mental health challenges": +d.Anxiety + +d.Depression + +d.OCD,
    }))
    .map((d) => ({
      ...d,
      "Fav genre":
        d["Fav genre"] === "Video game music" ? "Game" : d["Fav genre"],
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
    .on("mouseleave", onGenreMouseLeave);

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
    .attr("class", (d) => `dot dot-${getGenreKey(d["Fav genre"])}`)
    .attr("cx", (d) => scatterX(d["Hours per day"]))
    .attr("cy", (d) => scatterY(d["Mental health challenges"]))
    .attr("r", 3)
    .style("fill", (d) => color(d["Fav genre"]))
    .style("opacity", 0.5);

  // Perform linear regression to get trendline
  const { slope, yIntercept, xIntercept } = linearRegression(
    data,
    "Hours per day",
    "Mental health challenges",
  );

  // Add scatterplot trendline
  g2.append("line")
    .attr("class", "trendline")
    .attr("x1", scatterX(0))
    .attr("x2", scatterX(20))
    .attr("y1", scatterY(calculateLineValue(slope, yIntercept, 0)))
    .attr("y2", scatterY(calculateLineValue(slope, yIntercept, 20)))
    .style("stroke", "#000000")
    .attr("stroke-dasharray", "4")
    .style("opacity", 0.75)
    .style("stroke-width", 2);

  // Add trendlines for every genre
  for (let genre of genres) {
    const filteredByGenre = data.filter((d) => d["Fav genre"] === genre);
    const {
      slope: filteredSlope,
      yIntercept: filteredYIntercept,
      xIntercept: filteredXIntercept,
    } = linearRegression(
      filteredByGenre,
      "Hours per day",
      "Mental health challenges",
    );

    // Add scatterplot trendline
    g2.append("line")
      .attr("class", `temp-trendline trendline-${getGenreKey(genre)}`)
      .attr("x1", scatterX(0))
      .attr(
        "x2",
        scatterX(
          filteredXIntercept > 0 && filteredXIntercept < 20
            ? filteredXIntercept
            : 20,
        ),
      )
      .attr(
        "y1",
        scatterY(calculateLineValue(filteredSlope, filteredYIntercept, 0)),
      )
      .attr(
        "y2",
        scatterY(
          calculateLineValue(
            filteredSlope,
            filteredYIntercept,
            filteredXIntercept > 0 && filteredXIntercept < 20
              ? filteredXIntercept
              : 20,
          ),
        ),
      )
      .style("stroke", color(genre))
      .style("opacity", 0.2)
      .style("stroke-width", 2);
  }

  // Scatterplot legend
  const scatterparallelLegendRowLength = 1;

  // Create legend element
  const scatterLegend = g2
    .append("g")
    .attr(
      "transform",
      `translate(${visSizes.plot2.width + 4}, ${useLargeLayout ? 40 : 0})`,
    );

  // Create legend label
  const scatterLegendLabel = scatterLegend
    .append("text")
    .attr("anchor", "middle")
    .attr("x", 0)
    .attr("y", -40)
    .text("Fav Genre")
    .style("font-family", "Arial")
    .style("font-size", standardFontSize * 0.833);

  // Create first line of subtext
  const scatterLegendSubtext = scatterLegend
    .append("text")
    .attr("anchor", "middle")
    .attr("x", 4)
    .attr("y", -28)
    .text("(HOVER TO")
    .style("font-family", "Arial")
    .style("font-size", standardFontSize * 0.75);

  // Create second line of subtext
  const scatterLegendSubtext2 = scatterLegend
    .append("text")
    .attr("anchor", "middle")
    .attr("x", 4)
    .attr("y", -18)
    .text("HIGHLIGHT)")
    .style("font-family", "Arial")
    .style("font-size", standardFontSize * 0.75);

  // Create legend item
  const scatterLegendItem = scatterLegend
    .selectAll(".legend-item")
    .data(genres)
    .enter()
    .append("g")
    .attr(
      "transform",
      (d, i) =>
        `translate(${Math.floor(i % scatterparallelLegendRowLength) * 80}, ${Math.floor(i / scatterparallelLegendRowLength) * (scatterLegendDotSize + 4) - 8})`,
    )
    .style("cursor", "pointer")
    .on("mouseover", (event, idx) => onGenreMouseEnter(genres[idx]))
    .on("mouseleave", onGenreMouseLeave);

  // Create colored squares for legend
  scatterLegendItem
    .append("rect")
    .attr(
      "class",
      (d, i) => `legend-square legend-square-${getGenreKey(genres[i])}`,
    )
    .attr("width", scatterLegendDotSize)
    .attr("height", scatterLegendDotSize)
    .style("fill", (d) => color(d))
    .style("opacity", 0.75);

  // Create legend item text labels
  scatterLegendItem
    .append("text")
    .attr("x", scatterLegendDotSize + 4)
    .attr("y", scatterLegendDotSize / 2)
    .attr("dominant-baseline", "middle")
    .style("font-size", standardFontSize * 0.833)
    .style("font-family", "Arial")
    .text((d) => d);

  // PARALLEL COORDINATES PLOT
  // Docs: https://d3-graph-gallery.com/parallel.html

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
  var parallelY = {};
  for (let i in dimensions) {
    name = dimensions[i];
    const extent = d3.extent(data, (d) => +d[name]);
    parallelY[name] =
      name === "Mental health challenges"
        ? d3
            .scaleSymlog()
            .constant(10)
            .domain(extent)
            .range([visSizes.plot3.height, 0])
        : d3.scaleLinear().domain(extent).range([visSizes.plot3.height, 0]);
  }

  // Create x-scale over available dimensions
  const parallelX = d3
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
      default:
        return name;
    }
  }

  // Create lines for the graph
  g3.selectAll("parallelLines")
    .data(data)
    .enter()
    .append("path")
    .attr("class", (d) => "line " + getGenreKey(d["Fav genre"]))
    .attr("d", (d) =>
      d3.line()(dimensions.map((p) => [parallelX(p), parallelY[p](d[p])])),
    )
    .style("fill", "none")
    .style("stroke", (d) => color(d["Fav genre"]))
    .style("stroke-width", 1.5)
    .style("opacity", 0.5);

  // Create y-axes
  g3.selectAll("axis")
    .data(dimensions)
    .enter()
    .append("g")
    .attr("transform", (d) => "translate(" + parallelX(d) + ")")
    .each(function (d) {
      return d3.select(this).call(d3.axisLeft().scale(parallelY[d]));
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
  const parallelLegendRowLength = useLargeLayout ? 1 : genres.length / 4;

  const parallelLegend = g3
    .append("g")
    .attr(
      "transform",
      `translate(${useLargeLayout ? visSizes.plot3.width - legendWidth : 0}, ${useLargeLayout ? 10 : visSizes.plot3.height + 80})`,
    );

  // Create legend label
  const parallelLegendLabel = parallelLegend
    .append("text")
    .attr("anchor", "middle")
    .attr("x", 0)
    .attr("y", -40)
    .text("Favorite Genre")
    .style("font-family", "Arial")
    .style("font-size", standardFontSize);

  // Create legend hint subtext
  const parallelLegendSubtext = parallelLegend
    .append("text")
    .attr("anchor", "middle")
    .attr("x", 0)
    .attr("y", -28)
    .text("(HOVER TO HIGHLIGHT)")
    .style("font-family", "Arial")
    .style("font-size", standardFontSize * 0.833);

  // Create legend item
  const parallelLegendItem = parallelLegend
    .selectAll(".legend-item")
    .data(genres)
    .enter()
    .append("g")
    .attr(
      "transform",
      (d, i) =>
        `translate(${Math.floor(i % parallelLegendRowLength) * 100}, ${Math.floor(i / parallelLegendRowLength) * (legendDotSize * 1.2) - 20})`,
    )
    .style("cursor", "pointer")
    .on("mouseover", (event, idx) => onGenreMouseEnter(genres[idx]))
    .on("mouseleave", onGenreMouseLeave);

  // Create colored squares for legend
  parallelLegendItem
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
  parallelLegendItem
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
    .attr("y", -44)
    .text("Music and Mental Health: Parallel Coordinates")
    .style("font-family", "Arial")
    .style("font-size", standardFontSize * 1.125);

  // Add parallel coordinates subtitle
  g3.append("text")
    .attr("text-anchor", "middle")
    .attr("x", visSizes.plot3.width / 2)
    .attr("y", -28)
    .text("Click and drag on y-axes to brush!")
    .style("font-family", "Arial")
    .style("font-size", standardFontSize);

  // Add brushing for selection of groups of lines
  // This will be a secondary highlighting mechanism for the parallel coordinates plot only
  // Docs: https://d3-graph-gallery.com/graph/interactivity_brush.html
  dimensions.forEach((dimension) => {
    const brush = d3
      .brushY()
      .extent([
        [parallelX(dimension) - 20, 0],
        [parallelX(dimension) + 20, visSizes.plot3.height],
      ])
      .on("brush", () => onStartBrush(dimension))
      .on("end", function () {
        if (!d3.event.selection) {
          return;
        }

        g3.selectAll(".line")
          .style("opacity", 0.5)
          .style("stroke", (d) => color(d["Fav genre"]));
        d3.select(this).call(brush.move, null);
      });

    g3.append("g").call(brush);
  });

  // INTERACTIVITY

  // Standard animation length
  const ANIMATION_LENGTH = 100;

  /**
   * Callback to activate styling to select a certain bar in the bar chart for highlighting.
   *
   * @param {string} genre The genre to select the bar for.
   */
  function activateBarHover(genre) {
    d3.selectAll(".bar")
      .transition()
      .duration(ANIMATION_LENGTH)
      .style("opacity", 0.5);

    d3.select(".bar-" + getGenreKey(genre))
      .transition()
      .duration(ANIMATION_LENGTH)
      .style("opacity", 1.0);
  }

  /**
   * Callback to activate styling to select a certain genre of dots/trendline in the scatterplot for highlighting.
   *
   * @param {string} genre The genre to select dots for.
   */
  function activateDotHover(genre) {
    d3.selectAll(".dot")
      .interrupt()
      .transition()
      .duration(ANIMATION_LENGTH)
      .style("opacity", 0)
      .style("fill", "#7b7b7b");

    d3.selectAll(".dot-" + getGenreKey(genre))
      .interrupt()
      .transition()
      .duration(ANIMATION_LENGTH)
      .style("opacity", 1.0)
      .style("fill", (d) => color(d["Fav genre"]));

    d3.selectAll(".temp-trendline").interrupt().style("opacity", 0.1);

    d3.select(".trendline-" + getGenreKey(genre))
      .interrupt()
      .style("opacity", 1.0);
  }

  /**
   * Callback to activate styling to select a certain genre of lines in the parallel coordinates plot.
   *
   * @param {string} genre The genre to select lines for.
   */
  function activateParallelHover(genre) {
    d3.selectAll(".line")
      .transition()
      .duration(ANIMATION_LENGTH)
      .style("stroke", "lightgrey")
      .style("opacity", 0.1);

    d3.selectAll("." + getGenreKey(genre))
      .transition()
      .duration(ANIMATION_LENGTH)
      .style("stroke", color(genre))
      .style("opacity", 1.0);

    d3.selectAll(".legend-square")
      .transition()
      .duration(ANIMATION_LENGTH)
      .style("opacity", 0.5);

    d3.select(".legend-square-" + getGenreKey(genre))
      .transition()
      .duration(ANIMATION_LENGTH)
      .style("opacity", 1.0);
  }

  /**
   * Callback to clear selection highlights applied to the parallel coordinates plot.
   */
  function deactivateParallelHover() {
    d3.selectAll(".line")
      .transition()
      .duration(ANIMATION_LENGTH)
      .style("stroke", (d) => color(d["Fav genre"]))
      .style("opacity", 0.5);

    d3.selectAll(".legend-square")
      .transition()
      .duration(ANIMATION_LENGTH)
      .style("opacity", 0.75);
  }

  /**
   * Callback to clear selection highlights applied to the scatterplot.
   */
  function deactivateDotHover() {
    d3.selectAll(".dot")
      .transition()
      .duration(ANIMATION_LENGTH)
      .style("opacity", 0.75)
      .style("fill", (d) => color(d["Fav genre"]));

    d3.selectAll(".temp-trendline").interrupt().style("opacity", 0.1);
  }

  /**
   * Callback to clear selection highlight applied to the bar chart.
   */
  function deactivateBarHover() {
    d3.selectAll(".bar")
      .transition()
      .duration(ANIMATION_LENGTH)
      .style("opacity", 0.75);
  }

  /**
   * Callback to trigger "select" animations.
   *
   * @param {string} genre
   */
  function onGenreMouseEnter(genre) {
    activateBarHover(genre);
    activateDotHover(genre);
    activateParallelHover(genre);
  }

  /**
   * Callback to trigger animations to deactivate select highlights.
   * Called when mouse leaves a hoverable element that previously called onGenreMouseEnter.
   */
  function onGenreMouseLeave() {
    deactivateBarHover();
    deactivateDotHover();
    deactivateParallelHover();
  }

  /**
   * The callback to trigger styling changes for a brush event on the parallel coordinates plot.
   *
   * @param {string} dimension y-axis dimension name
   */
  function onStartBrush(dimension) {
    if (!d3.event.selection) {
      return;
    }

    const [y0, y1] = d3.event.selection;
    const min = parallelY[dimension].invert(y1);
    const max = parallelY[dimension].invert(y0);

    g3.selectAll(".line")
      .style("opacity", (d) => {
        const value = +d[dimension];
        if (value >= min && value <= max) {
          return 1;
        }
        return 0.05;
      })
      .style("stroke", (d) => {
        const value = +d[dimension];
        if (value >= min && value <= max) {
          return color(d["Fav genre"]);
        }
        return "lightgray";
      });
  }
});
