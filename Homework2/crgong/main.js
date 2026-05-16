// ############################################################
// Music & Mental Health Dashboard
// ############################################################

// This file loads the survey data and creates three D3 views:
// 1. Overview bar chart for favorite music genre
// 2. Scatter plot comparing age and listening hours
// 3. Parallel coordinates plot for listening/mental health values

// ############################################################
// Section 1: Load and clean the data
// ############################################################

d3.csv("data/mxmh_survey_results.csv").then(function(data) {

    // Convert columns that should be numbers.
    // CSV files read every value as a string, so these values need to be
    // changed before using them in scales or axes.
    data.forEach(function(d) {
        d.Age = +d.Age;
        d["Hours per day"] = +d["Hours per day"];
        d.Anxiety = +d.Anxiety;
        d.Depression = +d.Depression;
        d.Insomnia = +d.Insomnia;
        d.OCD = +d.OCD;
    });

    // Create all three charts after the data is ready.
    drawOverview(data);
    drawScatter(data);
    drawParallelCoords(data);

});

// ############################################################
// Section 2: Helper functions
// ############################################################

function getChartSize(viewID, margin) {
    /*
     * Gets the size of one dashboard view and calculates the inner chart area.
     *
     * Parameters:
     *      viewID (string): id of the div that will contain the chart
     *      margin (object): top/right/bottom/left spacing around the chart
     *
     * Returns:
     *      object: width, height, innerWidth, and innerHeight
     */

    const container = document.getElementById(viewID);
    const width = container.clientWidth;
    const height = container.clientHeight;

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    return {
        width: width,
        height: height,
        innerWidth: innerWidth,
        innerHeight: innerHeight
    };
}

function makeSVG(viewID, width, height, margin) {
    /*
     * Creates the svg and a translated group inside of it.
     * This keeps the code for setting up every chart more consistent.
     *
     * Parameters:
     *      viewID (string): id of the div where the svg should be added
     *      width (number): full svg width
     *      height (number): full svg height
     *      margin (object): chart margin values
     *
     * Returns:
     *      object: svg and g selections
     */

    const svg = d3.select("#" + viewID)
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    return { svg: svg, g: g };
}

function addChartTitle(svg, width, title, yPosition, fontSize) {
    /*
     * Adds a centered chart title.
     *
     * Parameters:
     *      svg (selection): D3 svg selection
     *      width (number): full svg width
     *      title (string): title text
     *      yPosition (number): y position of the title
     *      fontSize (string): CSS font size value
     */

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", yPosition)
        .attr("text-anchor", "middle")
        .style("font-size", fontSize)
        .style("font-weight", "600")
        .style("fill", "#3d2c5e")
        .text(title);
}

function addAxisLabel(svg, text, x, y, rotation) {
    /*
     * Adds an axis label. Rotation is optional.
     *
     * Parameters:
     *      svg (selection): D3 svg selection
     *      text (string): label text
     *      x (number): x position
     *      y (number): y position
     *      rotation (number): rotation angle in degrees
     */

    const label = svg.append("text")
        .attr("x", x)
        .attr("y", y)
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .style("fill", "#555")
        .text(text);

    // If rotation is passed in, rotate the label after it is created.
    if (rotation !== undefined) {
        label.attr("transform", `rotate(${rotation})`);
    }
}

// ############################################################
// Section 3: Overview bar chart
// ############################################################

function drawOverview(data) {
    /*
     * Creates the overview chart showing how many respondents chose each
     * favorite music genre.
     *
     * Parameters:
     *      data (array): cleaned survey dataset
     */

    // Set up chart size and svg.
    const margin = { top: 35, right: 30, bottom: 75, left: 60 };
    const size = getChartSize("view1", margin);
    const chart = makeSVG("view1", size.width, size.height, margin);
    const svg = chart.svg;
    const g = chart.g;

    // Count the number of responses for each favorite genre.
    const genreCounts = d3.nest()
        .key(function(d) { return d["Fav genre"]; })
        .rollup(function(values) { return values.length; })
        .entries(data);

    // Sorting from highest to lowest makes the bar chart easier to compare.
    genreCounts.sort(function(a, b) {
        return b.value - a.value;
    });

    // X scale contains one band for each genre.
    const xScale = d3.scaleBand()
        .domain(genreCounts.map(function(d) { return d.key; }))
        .range([0, size.innerWidth])
        .padding(0.25);

    // Y scale starts at 0 and ends at the largest genre count.
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(genreCounts, function(d) { return d.value; })])
        .nice()
        .range([size.innerHeight, 0]);

    // Horizontal grid lines help show the approximate bar values.
    g.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(yScale)
            .tickSize(-size.innerWidth)
            .tickFormat(""));

    // Bottom x-axis with labels turned slightly so they do not overlap.
    g.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0, ${size.innerHeight})`)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
            .attr("transform", "rotate(-35)")
            .attr("text-anchor", "end")
            .attr("dx", "-0.5em")
            .attr("dy", "0.4em");

    // Left y-axis for number of respondents.
    g.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(yScale).ticks(6));

    // Draw the bars.
    g.selectAll(".bar")
        .data(genreCounts)
        .enter()
        .append("rect")
            .attr("class", "bar")
            .attr("x", function(d) { return xScale(d.key); })
            .attr("y", function(d) { return yScale(d.value); })
            .attr("width", xScale.bandwidth())
            .attr("height", function(d) { return size.innerHeight - yScale(d.value); })
            .attr("fill", "#7c6cc4")
            .attr("rx", 2);

    // Labels and title.
    addChartTitle(svg, size.width, "Respondents by Favorite Genre (Bar Chart)", 20, "14px");

    addAxisLabel(svg, "Favorite Genre",
        margin.left + size.innerWidth / 2,
        size.height - 8);

    addAxisLabel(svg, "Number of Respondents",
        -(margin.top + size.innerHeight / 2),
        16,
        -90);

    // Simple legend required for the view.
    const legendG = svg.append("g")
        .attr("transform", `translate(${size.width - margin.right - 180}, ${margin.top + 5})`);

    legendG.append("rect")
        .attr("width", 14)
        .attr("height", 14)
        .attr("rx", 2)
        .attr("fill", "#7c6cc4");

    legendG.append("text")
        .attr("x", 20)
        .attr("y", 11)
        .style("font-size", "11px")
        .style("fill", "#444")
        .text("Count of respondents");
}

// ############################################################
// Section 4: Scatter plot
// ############################################################

function drawScatter(data) {
    /*
     * Creates a scatter plot for Age vs. Hours per day.
     * The point color represents Anxiety score.
     *
     * Parameters:
     *      data (array): cleaned survey dataset
     */

    // Set up chart size and svg.
    const margin = { top: 50, right: 110, bottom: 100, left: 60 };
    const size = getChartSize("view3", margin);
    const chart = makeSVG("view3", size.width, size.height, margin);
    const svg = chart.svg;
    const g = chart.g;

    // Remove rows that are missing the needed values.
    const cleanData = data.filter(function(d) {
        return !isNaN(d.Age) &&
               !isNaN(d["Hours per day"]) &&
               !isNaN(d.Anxiety);
    });

    // X scale for age.
    const xScale = d3.scaleLinear()
        .domain(d3.extent(cleanData, function(d) { return d.Age; }))
        .nice()
        .range([0, size.innerWidth]);

    // Y scale for music listening hours.
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(cleanData, function(d) { return d["Hours per day"]; })])
        .nice()
        .range([size.innerHeight, 0]);

    // Anxiety is a 0-10 score, so a sequential color scale works well here.
    const colorScale = d3.scaleSequential(d3.interpolateBuPu)
        .domain([0, 10]);

    // Grid lines first, so the points are drawn on top of them.
    g.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(yScale)
            .tickSize(-size.innerWidth)
            .tickFormat(""));

    g.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0, ${size.innerHeight})`)
        .call(d3.axisBottom(xScale)
            .tickSize(-size.innerHeight)
            .tickFormat(""));

    // Draw axes.
    g.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0, ${size.innerHeight})`)
        .call(d3.axisBottom(xScale));

    g.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(yScale));

    // Draw one point for each respondent.
    g.selectAll(".point")
        .data(cleanData)
        .enter()
        .append("circle")
            .attr("class", "point")
            .attr("cx", function(d) { return xScale(d.Age); })
            .attr("cy", function(d) { return yScale(d["Hours per day"]); })
            .attr("r", 3.2)
            .attr("fill", function(d) { return colorScale(d.Anxiety); })
            .attr("opacity", 0.75)
            .attr("stroke", "white")
            .attr("stroke-width", 0.4);

    // Labels and title.
    addChartTitle(svg, size.width, "Age vs. Listening Hours (Anxiety Level)", 22, "13px");

    addAxisLabel(svg, "Age (years)",
        margin.left + size.innerWidth / 2,
        size.height - 25);

    addAxisLabel(svg, "Hours of Music per Day",
        -(margin.top + size.innerHeight / 2),
        15,
        -90);

    // Color legend for Anxiety.
    const legendWidth = 14;
    const legendHeight = size.innerHeight - 10;
    const legendX = margin.left + size.innerWidth + 25;
    const legendY = margin.top + 5;

    svg.append("text")
        .attr("x", legendX + legendWidth / 2)
        .attr("y", legendY - 8)
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .style("font-weight", "600")
        .style("fill", "#444")
        .text("Anxiety");

    // The gradient gives the color legend the same colors as the points.
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
        .attr("id", "anxiety-gradient")
        .attr("x1", "0%").attr("y1", "100%")
        .attr("x2", "0%").attr("y2", "0%");

    d3.range(0, 11).forEach(function(value) {
        gradient.append("stop")
            .attr("offset", `${(value / 10) * 100}%`)
            .attr("stop-color", colorScale(value));
    });

    svg.append("rect")
        .attr("x", legendX)
        .attr("y", legendY)
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#anxiety-gradient)")
        .style("stroke", "#ccc")
        .style("stroke-width", 0.5);

    const legendScale = d3.scaleLinear()
        .domain([0, 10])
        .range([legendY + legendHeight, legendY]);

    svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(${legendX + legendWidth}, 0)`)
        .call(d3.axisRight(legendScale).ticks(6));
}

// ############################################################
// Section 5: Parallel coordinates plot
// ############################################################

function drawParallelCoords(data) {
    /*
     * Creates a parallel coordinates chart.
     * Each line is one respondent and crosses the five numeric dimensions.
     *
     * Parameters:
     *      data (array): cleaned survey dataset
     */

    // Set up chart size and svg.
    const margin = { top: 60, right: 60, bottom: 60, left: 75 };
    const size = getChartSize("view2", margin);
    const chart = makeSVG("view2", size.width, size.height, margin);
    const svg = chart.svg;
    const g = chart.g;

    // These are the values used as the vertical axes.
    const dims = ["Hours per day", "Anxiety", "Depression", "Insomnia", "OCD"];

    // Keep only rows that have all needed numeric values and a music effect label.
    const cleanData = data.filter(function(d) {
        const hasAllDimensions = dims.every(function(dim) {
            return !isNaN(d[dim]);
        });

        return hasAllDimensions && d["Music effects"] !== "";
    });

    // Create a y-scale for each dimension.
    const yScales = {};
    dims.forEach(function(dim) {
        yScales[dim] = d3.scaleLinear()
            .domain(d3.extent(cleanData, function(d) { return d[dim]; }))
            .nice()
            .range([size.innerHeight, 0]);
    });

    // Each dimension gets one evenly spaced x-position.
    const xScale = d3.scalePoint()
        .domain(dims)
        .range([0, size.innerWidth])
        .padding(0.5);

    // Colors are based on the respondent's reported music effect.
    const colorScale = d3.scaleOrdinal()
        .domain(["Improve", "No effect", "Worsen"])
        .range(["#2a9d8f", "#9aa0a6", "#6a1b9a"]);

    function path(d) {
        /*
         * Converts one row of data into the SVG path for its line.
         *
         * Parameters:
         *      d (object): one survey row
         *
         * Returns:
         *      string: SVG path string
         */

        const points = dims.map(function(dim) {
            return [xScale(dim), yScales[dim](d[dim])];
        });

        return d3.line()(points);
    }

    // Drawing by category helps smaller categories stay visible.
    const categoryOrder = ["No effect", "Improve", "Worsen"];
    const opacityByCategory = {
        "No effect": 0.22,
        "Improve": 0.13,
        "Worsen": 0.45
    };

    categoryOrder.forEach(function(category) {
        const subset = cleanData.filter(function(d) {
            return d["Music effects"] === category;
        });

        g.selectAll(".line-" + category.replace(/\s/g, "-"))
            .data(subset)
            .enter()
            .append("path")
                .attr("class", "line")
                .attr("d", path)
                .attr("fill", "none")
                .attr("stroke", colorScale(category))
                .attr("stroke-width", 1)
                .attr("opacity", opacityByCategory[category]);
    });

    // Draw one vertical axis for every dimension.
    dims.forEach(function(dim) {
        const axisG = g.append("g")
            .attr("class", "axis")
            .attr("transform", `translate(${xScale(dim)}, 0)`)
            .call(d3.axisLeft(yScales[dim]).ticks(6));

        axisG.append("text")
            .attr("y", -12)
            .attr("text-anchor", "middle")
            .style("fill", "#333")
            .style("font-size", "11px")
            .style("font-weight", "600")
            .text(dim);
    });

    // Title and small explanation.
    addChartTitle(svg, size.width, "Listening & Mental Health Profiles (Parallel Coordinates)", 20, "13px");

    svg.append("text")
        .attr("x", size.width / 2)
        .attr("y", 38)
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .style("fill", "#888")
        .text("Each line is one respondent; color = self-reported effect of music on mental health");

    // Legend for music effect categories.
    const legendCategories = ["Improve", "No effect", "Worsen"];
    const legendItemWidth = 130;
    const legendY = size.height - 35;
    const legendStartX = (size.width - legendCategories.length * legendItemWidth) / 2;

    const legend = svg.selectAll(".legend-item")
        .data(legendCategories)
        .enter()
        .append("g")
            .attr("class", "legend-item")
            .attr("transform", function(d, i) {
                return `translate(${legendStartX + i * legendItemWidth}, ${legendY})`;
            });

    legend.append("rect")
        .attr("width", 14)
        .attr("height", 14)
        .attr("rx", 2)
        .attr("fill", function(d) { return colorScale(d); });

    legend.append("text")
        .attr("x", 20)
        .attr("y", 11)
        .style("font-size", "11px")
        .style("fill", "#444")
        .text(function(d) { return "Music: " + d; });
}
