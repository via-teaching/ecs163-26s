// Sets the size of the SVG based on the browser window
const width = window.innerWidth;
const height = window.innerHeight;
const svg = d3.select("svg");

// Loads the CSV dataset
d3.csv("data/mxmh_survey_results.csv").then(rawData => {

    // Converts numeric columns from strings into numbers
    rawData.forEach(d => {
        d.Anxiety = +d.Anxiety;
        d.Depression = +d.Depression;
        d.Insomnia = +d.Insomnia;
        d.OCD = +d.OCD;
        d["Hours per day"] = +d["Hours per day"];
        d.jitterX = (Math.random() - 0.5) * 4;
        d.jitterY = (Math.random() - 0.5) * 4;
    });

    let selectedGenre = null;

    // First visualization: scatter plot
    
    // Margin and dimension settings for scatter plot
    const margin = { top: 70, right: 40, bottom: 70, left: 80 };
    const chartWidth = 550 - margin.left - margin.right;
    const chartHeight = 360 - margin.top - margin.bottom;

    // Creates group element for scatter plot positioning
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

    // Creates x-scale for hours listened per day
    const scatterX = d3.scaleLinear()
        .domain([-0.5, d3.max(rawData, d => d["Hours per day"]) + 0.5])
        .range([0, chartWidth]);

    // Creates y-scale for anxiety level
    const scatterY = d3.scaleLinear()
        .domain([-0.5, d3.max(rawData, d => d.Anxiety) + 0.5])
        .range([chartHeight, 0]);

    // Creates scatter plot x-axis
    scatterG.append("g")
        .attr("transform", `translate(0, ${chartHeight})`)
        .call(d3.axisBottom(scatterX));

    // Creates scatter plot y-axis
    scatterG.append("g")
        .call(d3.axisLeft(scatterY));

    // Adds x-axis label to scatter plot
    scatterG.append("text")
        .attr("x", chartWidth / 2)
        .attr("y", chartHeight + 50)
        .attr("text-anchor", "middle")
        .text("Hours Listening per Day");

    // Adds y-axis label to scatter plot
    scatterG.append("text")
        .attr("x", -chartHeight / 2)
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text("Anxiety Level");

    // Draws participant circles on scatter plot
    const circles = scatterG.selectAll("circle.participant")
        .data(rawData)
        .enter()
        .append("circle")
        .attr("class", "participant")
        .attr("cx", d => scatterX(d["Hours per day"]) + d.jitterX)
        .attr("cy", d => scatterY(d.Anxiety) + d.jitterY)
        .attr("r", 4)
        .attr("fill", "steelblue")
        .attr("opacity", 0.45);

    // Adds legend circle for scatter plot
    scatterG.append("circle")
        .attr("cx", chartWidth + 20)
        .attr("cy", -5)
        .attr("r", 5)
        .attr("fill", "steelblue")
        .attr("opacity", 0.45);

    // Adds legend text for scatter plot
    scatterG.append("text")
        .attr("x", chartWidth + 35)
        .attr("y", 0)
        .attr("font-size", "12px")
        .text("Survey participant");

    // Creates brush interaction for selecting scatter plot points
    const brush = d3.brush()
        .extent([[0, 0], [chartWidth, chartHeight]])
        .on("end", brushed);

    // Adds brushing interaction to scatter plot
    scatterG.append("g")
        .attr("class", "brush")
        .call(brush);

    // Second visualization: bar chart

    // Margin and dimension settings for bar chart
    const barMargin = { top: 70, right: 40, bottom: 100, left: 80 };
    const barWidth = 600 - barMargin.left - barMargin.right;
    const barHeight = 360 - barMargin.top - barMargin.bottom;

    // Creates group element for bar chart positioning
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

    // Creates x-scale for favorite genres
    const barX = d3.scaleBand()
        .range([0, barWidth])
        .padding(0.2);

    // Creates y-scale for average anxiety values
    const barY = d3.scaleLinear()
        .range([barHeight, 0]);

    // Creates bar chart x-axis group
    const barXAxis = barG.append("g")
        .attr("transform", `translate(0, ${barHeight})`);

    // Creates bar chart y-axis group
    const barYAxis = barG.append("g");

    // Adds y-axis label to bar chart
    barG.append("text")
        .attr("x", -barHeight / 2)
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text("Average Anxiety Level");

    // Adds x-axis label to bar chart
    barG.append("text")
        .attr("x", barWidth / 2)
        .attr("y", barHeight + 85)
        .attr("text-anchor", "middle")
        .text("Favorite Music Genre");

    // Adds legend rectangle for bar chart
    barG.append("rect")
        .attr("x", barWidth + 20)
        .attr("y", -10)
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", "mediumpurple");

    // Adds legend text for bar chart
    barG.append("text")
        .attr("x", barWidth + 40)
        .attr("y", 0)
        .attr("font-size", "12px")
        .text("Avg. anxiety");

    // Third visualization: parallel coordinates plot

    // Defines dimensions used in parallel coordinates plot
    const dimensions = ["Hours per day", "Anxiety", "Depression", "Insomnia", "OCD"];

    // Margin and dimension settings for parallel coordinates plot
    const parallelTop = 450;
    const parallelLeft = 220;
    const parallelWidth = 1000;
    const parallelHeight = 250;

    // Creates group element for parallel coordinates positioning
    const parallelG = svg.append("g")
        .attr("transform", `translate(${parallelLeft}, ${parallelTop})`);

    // Adds parallel coordinates plot title
    parallelG.append("text")
        .attr("x", parallelWidth / 2)
        .attr("y", -25)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .attr("font-weight", "bold")
        .text("Mental Health Metrics Parallel Coordinates Plot");

    // Creates y-scales for each parallel coordinates dimension
    const parallelY = {};

    dimensions.forEach(name => {
        parallelY[name] = d3.scaleLinear()
            .domain(d3.extent(rawData, d => d[name]))
            .range([parallelHeight, 0]);
    });

    // Creates x-scale for dimension placement
    const parallelX = d3.scalePoint()
        .range([0, parallelWidth])
        .padding(1)
        .domain(dimensions);

    // Creates line path generator for parallel coordinates
    function path(d) {
        return d3.line()(dimensions.map(p => [
            parallelX(p),
            parallelY[p](d[p])
        ]));
    }

    // Draws lines for each survey participant
    const lines = parallelG.selectAll("path.response")
        .data(rawData)
        .enter()
        .append("path")
        .attr("class", "response")
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 1)
        .attr("opacity", 0.05);

    // Creates vertical axes for each dimension
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

    // Adds legend line for parallel coordinates plot
    parallelG.append("line")
        .attr("x1", parallelWidth - 80)
        .attr("y1", -5)
        .attr("x2", parallelWidth - 40)
        .attr("y2", -5)
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2)
        .attr("opacity", 0.3);

    // Adds legend text for parallel coordinates plot
    parallelG.append("text")
        .attr("x", parallelWidth - 25)
        .attr("y", 0)
        .attr("font-size", "12px")
        .text("One survey response");

    // Draws the initial dashboard state
    updateDashboard(rawData);

    // Updates bar chart based on filtered data
    function updateDashboard(filteredData) {

        // Uses filtered data if brushing is active
        const dataToUse = filteredData.length > 0 ? filteredData : rawData;

        // Groups data by favorite genre and calculates average anxiety
        const genreGroups = d3.nest()
            .key(d => d["Fav genre"])
            .rollup(values => d3.mean(values, d => d.Anxiety))
            .entries(dataToUse);

        // Updates x-domain for bar chart
        barX.domain(genreGroups.map(d => d.key));

        // Updates y-domain for bar chart
        barY.domain([0, d3.max(genreGroups, d => d.value)]);

        // Updates bar chart x-axis with transition
        barXAxis.transition()
            .duration(600)
            .call(d3.axisBottom(barX))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .attr("text-anchor", "end");

        // Updates bar chart y-axis with transition
        barYAxis.transition()
            .duration(600)
            .call(d3.axisLeft(barY));

        // Binds genre data to bars
        const bars = barG.selectAll("rect.bar")
            .data(genreGroups, d => d.key);

        // Draws new bars and adds click interaction
        bars.enter()
            .append("rect")
            .attr("class", "bar")
            .attr("x", d => barX(d.key))
            .attr("y", barHeight)
            .attr("width", barX.bandwidth())
            .attr("height", 0)
            .attr("fill", "mediumpurple")
            .on("click", function(d) {
                selectedGenre = selectedGenre === d.key ? null : d.key;
                applyGenreSelection();
            })
            .merge(bars)
            .transition()
            .duration(600)
            .attr("x", d => barX(d.key))
            .attr("y", d => barY(d.value))
            .attr("width", barX.bandwidth())
            .attr("height", d => barHeight - barY(d.value))
            .attr("opacity", d => selectedGenre === null || selectedGenre === d.key ? 1 : 0.3);

        // Removes old bars with transition
        bars.exit()
            .transition()
            .duration(600)
            .attr("height", 0)
            .attr("y", barHeight)
            .remove();
    }

    // Handles brushing interaction on scatter plot
    function brushed() {

        // Gets selected brushing region
        const selection = d3.event.selection;

        // Resets dashboard if no brushing selection exists
        if (!selection) {
            circles.transition().duration(500).attr("opacity", 0.45);
            lines.transition().duration(500).attr("opacity", 0.05);
            updateDashboard(rawData);
            return;
        }

        // Defines brushing boundaries
        const [[x0, y0], [x1, y1]] = selection;

        // Filters data points within brush region
        const brushedData = rawData.filter(d => {
            const cx = scatterX(d["Hours per day"]) + d.jitterX;
            const cy = scatterY(d.Anxiety) + d.jitterY;
            return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
        });

        // Highlights brushed scatter plot points
        circles.transition()
            .duration(500)
            .attr("opacity", d => brushedData.includes(d) ? 0.8 : 0.08);

        // Highlights brushed parallel coordinate lines
        lines.transition()
            .duration(500)
            .attr("opacity", d => brushedData.includes(d) ? 0.25 : 0.01);

        // Updates dashboard using brushed data
        updateDashboard(brushedData);
    }
    
    // Handles clicking genre bars to filter dashboard
    function applyGenreSelection() {

        // Highlights scatter plot circles for selected genre
        circles.transition()
            .duration(500)
            .attr("opacity", d => selectedGenre === null || d["Fav genre"] === selectedGenre ? 0.75 : 0.08);

        // Highlights parallel coordinate lines for selected genre
        lines.transition()
            .duration(500)
            .attr("opacity", d => selectedGenre === null || d["Fav genre"] === selectedGenre ? 0.25 : 0.01);

        // Highlights selected genre bar
        barG.selectAll("rect.bar")
            .transition()
            .duration(500)
            .attr("opacity", d => selectedGenre === null || d.key === selectedGenre ? 1 : 0.3);
    }

}).catch(function(error){

    // Prints loading errors to console
    console.log(error);
});