// Sets the size of the SVG based on the browser window
const width = window.innerWidth;
const height = window.innerHeight;

// Selects the SVG element from index.html
const svg = d3.select("svg");

// Loads the CSV dataset
d3.csv("data/mxmh_survey_results.csv").then(rawData => {

    // Converts numneric columns from strings to numbers
    rawData.forEach(d => {
        d.Anxiety = +d.Anxiety;
        d.Depression = +d.Depression;
        d.Insomnia = +d.Insomnia;
        d.OCD = +d.OCD;
        d["Hours per day"] = +d["Hours per day"];
    });

    // First visualization: scatter plot
    // Shows relationship between listening hours and anxiety

    // Margins and dimensions for scatter plot
    const margin = { top: 70, right: 40, bottom: 70, left: 80 };
    const chartWidth = 550 - margin.left - margin.right;
    const chartHeight = 360 - margin.top - margin.bottom;

    // Creates a group element for the scatter plot
    const scatterG = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Adds scatter plot title
    scatterG.append("text")
        .attr("x", chartWidth / 2)
        .attr("y", -30)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .attr("font-weight", "bold")
        .text("Music Listening Hours vs. Anxiety");

    // Creates x-axis scale for listening hours
    const scatterX = d3.scaleLinear()
        .domain([0, d3.max(rawData, d => d["Hours per day"])])
        .range([0, chartWidth]);

    // Creates y-axis scale for anxiety levels
    const scatterY = d3.scaleLinear()
        .domain([0, d3.max(rawData, d => d.Anxiety)])
        .range([chartHeight, 0]);

    // Adds x-axis
    scatterG.append("g")
        .attr("transform", `translate(0, ${chartHeight})`)
        .call(d3.axisBottom(scatterX));

    // Adds y-axis
    scatterG.append("g")
        .call(d3.axisLeft(scatterY));

    // Adds x-axis label
    scatterG.append("text")
        .attr("x", chartWidth / 2)
        .attr("y", chartHeight + 50)
        .attr("text-anchor", "middle")
        .text("Hours Listening per Day");

    // Adds y-axis label
    scatterG.append("text")
        .attr("x", -chartHeight / 2)
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text("Anxiety Level");

    // Adds circles representing survey participants
    scatterG.selectAll("circle")
        .data(rawData)
        .enter()
        .append("circle")
        .attr("cx", d => scatterX(d["Hours per day"]) + (Math.random() - 0.5) * 4)
        .attr("cy", d => scatterY(d.Anxiety) + (Math.random() - 0.5) * 4)
        .attr("r", 4)
        .attr("fill", "steelblue")
        .attr("opacity", 0.45);

    // Adds legend symbol for scatter plot
    scatterG.append("circle")
        .attr("cx", chartWidth + 20)
        .attr("cy", -5)
        .attr("r", 5)
        .attr("fill", "steelblue")
        .attr("opacity", 0.45);

    // Adds legend label for scatter plot
    scatterG.append("text")
        .attr("x", chartWidth + 35)
        .attr("y", 0)
        .attr("font-size", "12px")
        .text("Survey participant");

    // Second visualization: bar chart
    // Shows average anxiety level for each favorite genre

    // Groups data by favorite genre and calculates average anxiety
    const genreGroups = d3.nest()
        .key(d => d["Fav genre"])
        .rollup(values => d3.mean(values, d => d.Anxiety))
        .entries(rawData);

    // Margins and dimensions for bar chart
    const barMargin = { top: 70, right: 40, bottom: 100, left: 80 };
    const barWidth = 600 - barMargin.left - barMargin.right;
    const barHeight = 360 - barMargin.top - barMargin.bottom;

    // Creates group element for bar chart
    const barG = svg.append("g")
        .attr("transform", `translate(720, 70)`);

    // Adds bar chart title
    barG.append("text")
        .attr("x", barWidth / 2)
        .attr("y", -30)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .attr("font-weight", "bold")
        .text("Average Anxiety by Favorite Genre");

    // Creates categorical x-axis scale for genres
    const barX = d3.scaleBand()
        .domain(genreGroups.map(d => d.key))
        .range([0, barWidth])
        .padding(0.2);

    // Creates y-axis scale for average anxiety
    const barY = d3.scaleLinear()
        .domain([0, d3.max(genreGroups, d => d.value)])
        .range([barHeight, 0]);

    // Adds x-axis with rotated labels
    barG.append("g")
        .attr("transform", `translate(0, ${barHeight})`)
        .call(d3.axisBottom(barX))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .attr("text-anchor", "end");

    // Adds y-axis
    barG.append("g")
        .call(d3.axisLeft(barY));

    // Draws bars for each genre
    barG.selectAll("rect")
        .data(genreGroups)
        .enter()
        .append("rect")
        .attr("x", d => barX(d.key))
        .attr("y", d => barY(d.value))
        .attr("width", barX.bandwidth())
        .attr("height", d => barHeight - barY(d.value))
        .attr("fill", "mediumpurple");

    // Adds y-axis label
    barG.append("text")
        .attr("x", -barHeight / 2)
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text("Average Anxiety Level");

    // Adds x-axis label
    barG.append("rect")
        .attr("x", barWidth + 20)
        .attr("y", -10)
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", "mediumpurple");

    // Adds legend label for bar chart
    barG.append("text")
        .attr("x", barWidth + 40)
        .attr("y", 0)
        .attr("font-size", "12px")
        .text("Avg. anxiety");

    // Adds x-axis label
    barG.append("text")
    .attr("x", barWidth / 2)
    .attr("y", barHeight + 85)
    .attr("text-anchor", "middle")
    .text("Favorite Music Genre");

    // Third visualization: parallel coordinates plot
    // Shows relationships between multiple mental health metrics

    // Dimensions used in the parallel coordinates plot
    const dimensions = [
        "Hours per day",
        "Anxiety",
        "Depression",
        "Insomnia",
        "OCD"
    ];

    // Position and size of the parallel coordinates plot
    const parallelTop = 450;
    const parallelLeft = 220;
    const parallelWidth = 1000;
    const parallelHeight = 250;

    // Creates group element for parallel coordinates plot
    const parallelG = svg.append("g")
        .attr("transform", `translate(${parallelLeft}, ${parallelTop})`);

    // Adds parallel coordinates title
    parallelG.append("text")
        .attr("x", parallelWidth / 2)
        .attr("y", -25)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .attr("font-weight", "bold")
        .text("Mental Health Metrics Parallel Coordinates Plot");

    // Creates a y-scale for each dimension
    const parallelY = {};

    dimensions.forEach(name => {
        parallelY[name] = d3.scaleLinear()
            .domain(d3.extent(rawData, d => d[name]))
            .range([parallelHeight, 0]);
    });

    // Creates x-axis positions for dimensions
    const parallelX = d3.scalePoint()
        .range([0, parallelWidth])
        .padding(1)
        .domain(dimensions);

    // Function to draw a line across dimensions
    function path(d) {
        return d3.line()(dimensions.map(p => [
            parallelX(p),
            parallelY[p](d[p])
        ]));
    }

    // Draws lines for each survey participant
    parallelG.selectAll("path")
        .data(rawData)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 1)
        .attr("opacity", 0.05);

    // Adds vertical axes for each dimension
    parallelG.selectAll(".dimension")
        .data(dimensions)
        .enter()
        .append("g")
        .attr("class", "dimension")
        .attr("transform", d => `translate(${parallelX(d)})`)
        .each(function(d) {
            d3.select(this).call(d3.axisLeft(parallelY[d]));
        })
        .append("text")
        .style("text-anchor", "middle")
        .attr("y", -10)
        .text(d => d)
        .style("fill", "black");

    // Adds legend line symbol
    parallelG.append("line")
        .attr("x1", parallelWidth - 80)
        .attr("y1", -5)
        .attr("x2", parallelWidth - 40)
        .attr("y2", -5)
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2)
        .attr("opacity", 0.3);

    // Adds legend label
    parallelG.append("text")
        .attr("x", parallelWidth - 25)
        .attr("y", 0)
        .attr("font-size", "12px")
        .text("One survey response");

}).catch(function(error){
    console.log(error);
});