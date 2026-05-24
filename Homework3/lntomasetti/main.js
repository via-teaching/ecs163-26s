
// Globals
// processsed
let globalData = [];
// current genre
let selectedGenre = null;
// brush area
let brushExtents = {};
// D3 selections
let pcLines;
let scatterPoints;
let heatmapCells; // heatmap rectangles
let heatColBgs; // invisible click rectangles
// brush behavior
let brushBehaviors = {};
let brushGroups = {};

// load dataset
d3.csv("data/mxmh_survey_results.csv").then(rawData =>{
    console.log("rawData", rawData);

    // convert numeric column strings to numbers
    rawData.forEach(function(d){
        d.Age = Number(d.Age);
        d["Hours per day"] = Number(d["Hours per day"]);
        d.Anxiety = Number(d.Anxiety);
        d.Depression = Number(d.Depression);
        d.Insomnia = Number(d.Insomnia);
        d.OCD = Number(d.OCD);
        d.BPM = Number(d.BPM);
    });

    // remove rows missing critical values
    globalData = rawData.filter(d =>
        d["Fav genre"] &&
        d["Music effects"] &&
        !isNaN(d.Anxiety) &&
        !isNaN(d.Depression) &&
        !isNaN(d.Insomnia) &&
        !isNaN(d.OCD) &&
        !isNaN(d["Hours per day"])
    );

    console.log("globalData", globalData);

    drawHeatmap(globalData);
    drawParallelCoordinates(globalData);
    drawScatterPlot(globalData);

    // attach reset button handler
    d3.select("#reset-button").on("click", resetFilters);

    }).catch(function(error){
    console.log(error);
});

// check if a respondent should be highlighted based on current filters
function isActive(d) {
    // check if row matches current genre filter
    if (selectedGenre && d["Fav genre"] !== selectedGenre) return false;
    // must fall w/in brush range
    for (const [dim, extent] of Object.entries(brushExtents)) {
        if (extent && (d[dim] < extent[0] || d[dim] > extent[1])) {
            return false;
        }
    }
    return true;
}

function updateVisualizations() {
    updateParallelLines();
    updateScatterPlot();
    updateHeatmap();
}

function resetFilters() {
    // clear genre selection
    selectedGenre = null;
    // clear brush extents
    brushExtents = {};
    // visually clear
    Object.entries(brushGroups).forEach(([dim, group]) => {
        group.call(brushBehaviors[dim].move, null);
    });
    // animate back
    updateVisualizations();
}

// animate parallel coord lines based on filters
function updateParallelLines() {
    pcLines.transition()
        .duration(400)
        .ease(d3.easeCubicOut)
        .attr("opacity", d => isActive(d) ? 0.55 : 0.04)
        .attr("stroke-width", d => isActive(d) ? 1.5 : 0.7);
}

// animate scatter plot points based on filters
function updateScatterPlot() {
    scatterPoints.transition()
        .duration(400)
        .ease(d3.easeCubicOut)
        .attr("opacity", d => isActive(d) ? 0.75 : 0.05)
        .attr("r", d => isActive(d) ? 4 : 2);
}

// animate heatmap cells based on filters
function updateHeatmap() {
    heatmapCells.transition()
        .duration(400)
        .ease(d3.easeCubicOut)
        .attr("opacity", d => !selectedGenre || d.genre === selectedGenre ? 1 : 0.2);

    //highlight or clear background behind selected genre
    heatColBgs
        .attr("fill", d => d === selectedGenre ? "rgba(255, 255, 255, 0.15)" : "transparent")
        .attr("stroke", d => d === selectedGenre ? "#ffffff" : "none")
        .attr("stroke-width", 2);
}

function drawHeatmap(data) {
    // get dimensions for responsive sizing
    const container = document.getElementById("overview");
    const w = container.clientWidth;
    const h = container.clientHeight;
    const margin = { top: 40, right: 150, bottom: 100, left: 130 };
    const chartWidth = w - margin.left - margin.right;
    const chartHeight = h - margin.top - margin.bottom;

    // append SVG to overview div
    const svg = d3.select("#overview")
        .append("svg")
        .attr("width", w)
        .attr("height", h)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // get unique genres sorted alphabetically
    const genres = [...new Set(data.map(d => d["Fav genre"]))].sort();
    const metrics = ["Anxiety", "Depression", "Insomnia", "OCD"];

    // compute average score per genre per mental health metric
    const heatData = [];
    genres.forEach(genre => {
        const genreRows = data.filter(d => d["Fav genre"] === genre);
        metrics.forEach(metric => {
            heatData.push({
                genre: genre,
                metric: metric,
                value: d3.mean(genreRows, d => d[metric])
            });
        });
    });

    // scale for x-axis (genres) with rotated labels
    const x = d3.scaleBand()
        .domain(genres)
        .range([0, chartWidth])
        .padding(0.05);

    // scale for y-axis (metrics)
    const y = d3.scaleBand()
        .domain(metrics)
        .range([0, chartHeight])
        .padding(0.05);

    // color scale from light yellow to dark red
    const color = d3.scaleSequential()
        .domain([0, 10])
        .interpolator(d3.interpolateYlOrRd);

    // invisible rect covering column for click interaction
    heatColBgs = svg.selectAll(".genre-col-bg")
        .data(genres)
        .enter()
        .append("rect")
        .attr("class", "genre-col-bg")
        .attr("x", d => x(d))
        .attr("y", -5)
        .attr("width", x.bandwidth())
        .attr("height", chartHeight + 10)
        .attr("fill", "transparent")
        .attr("stroke", "none")
        .attr("cursor", "pointer")
        .on("click", function(genre) {
            // toggle genre selection
            selectedGenre = (selectedGenre === genre) ? null : genre;
            // clear active brushes
            brushExtents = {};
            Object.entries(brushGroups).forEach(([dim, group]) => {
                group.call(brushBehaviors[dim].move, null);
            });
            // update visuals
            updateVisualizations();
        });

    // one cell per genre-metric combination
    heatmapCells = svg.selectAll(".heat-cell")
        .data(heatData)
        .enter()
        .append("rect")
        .attr("class", "heat-cell")
        .attr("x", d => x(d.genre))
        .attr("y", d => y(d.metric))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("fill", d => color(d.value))
        .attr("pointer-events", "none");

    // value labels inside each cell
    svg.selectAll(".cell-label")
        .data(heatData)
        .enter()
        .append("text")
        .attr("class", "cell-label")
        .attr("x", d => x(d.genre) + x.bandwidth() / 2)
        .attr("y", d => y(d.metric) + y.bandwidth() / 2 + 4)
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .style("fill", d => d.value > 6 ? "white" : "black")
        .text(d => d.value.toFixed(1));

    // x-axis showing genre names, rotate to prevent overlap
    svg.append("g")
        .attr("transform", `translate(0,${chartHeight})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-40)")
        .style("text-anchor", "end")
        .attr("dx", "-0.5em")
        .attr("dy", "0.5em");

    // y-axis showing metric names
    svg.append("g")
        .call(d3.axisLeft(y));

    // title
    svg.append("text")
        .attr("x", chartWidth / 2)
        .attr("y", -15)
        .attr("text-anchor", "middle")
        .style("font-weight", "bold")
        .style("font-size", "14px")
        .text("Average Mental Health Scores by Favorite Genre");

    // legend gradient definition
    const defs = svg.append("defs");
    const linearGradient = defs.append("linearGradient")
        .attr("id", "heatmap-gradient");

    // gradient color defining low -> high socores
    linearGradient.selectAll("stop")
        .data([
            { offset: "0%", value: 0 },
            { offset: "100%", value: 10 }
        ])
        .enter()
        .append("stop")
        .attr("offset", d => d.offset)
        .attr("stop-color", d => color(d.value));

    // legend bar
    const legendG = svg.append("g")
        .attr("transform", `translate(${chartWidth + 20}, ${chartHeight / 2 - 40})`);

    // legend title
    legendG.append("text")
        .attr("x", 0)
        .attr("y", -8)
        .style("font-size", "11px")
        .style("font-weight", "bold")
        .text("Avg Score");

    // colored bar showing gradient from low to high
    legendG.append("rect")
        .attr("width", 100)
        .attr("height", 12)
        .style("fill", "url(#heatmap-gradient)");

    // min and max labels
    legendG.append("text")
        .attr("x", 0)
        .attr("y", 26)
        .style("font-size", "10px")
        .text("0 (Low)");

    legendG.append("text")
        .attr("x", 100)
        .attr("y", 26)
        .attr("text-anchor", "end")
        .style("font-size", "10px")
        .text("10 (High)");
}

function drawScatterPlot(data) {
    // container dimensions for responsive sizing
    const container = document.getElementById("scatter-plot");
    const w = container.clientWidth;
    const h = container.clientHeight;
    const margin = { top: 40, right: 30, bottom: 60, left: 60 };
    const chartWidth = w - margin.left - margin.right;
    const chartHeight = h - margin.top - margin.bottom;

    // append SVG to scatter-plot div
    const svg = d3.select("#scatter-plot")
        .append("svg")
        .attr("width", w)
        .attr("height", h)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // color scale for music effects categories
    const effectColors = {
        "Improve": "#2196F3",
        "No effect": "#9E9E9E",
        "Worsen": "#F44336"
    };

    // scale for x-axis (Anxiety score)
    const x = d3.scaleLinear()
        .domain([0, 10])
        .range([0, chartWidth]);

    // scale for y-axis (Hours per day)
    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d["Hours per day"])])
        .range([chartHeight, 0]);

    // x-axis anxiety scores
    svg.append("g")
        .attr("transform", `translate(0,${chartHeight})`)
        .call(d3.axisBottom(x).ticks(10));

    // y-axis hours per day
    svg.append("g")
        .call(d3.axisLeft(y).ticks(6));

    // x-axis label
    svg.append("text")
        .attr("x", chartWidth / 2)
        .attr("y", chartHeight + 50)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Anxiety Score");

    // y-axis label rotated vertically
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -(chartHeight / 2))
        .attr("y", -45)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .text("Hours of Music per Day");

    // title
    svg.append("text")
        .attr("x", chartWidth / 2)
        .attr("y", -15)
        .attr("text-anchor", "middle")
        .style("font-weight", "bold")
        .style("font-size", "14px")
        .text("Hours of Music per Day vs. Anxiety Score (by Self-Reported Effect)");

    // circle per respondent, colored by music effect
    scatterPoints = svg.selectAll(".dot")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "dot")
        .attr("cx", d => x(d.Anxiety))
        .attr("cy", d => y(d["Hours per day"]))
        .attr("r", 4)
        .attr("fill", d => effectColors[d["Music effects"]] || "#9E9E9E")
        .attr("opacity", 0.5)
        .on("mouseover", function(d) {
        // enlarge hovered dot and show tooltip with respondent details
        d3.select(this).raise().attr("r", 7).attr("opacity", 1);
        d3.select("#tooltip")
            .style("opacity", 1)
            .html(`<strong>${d["Fav genre"]}</strong><br>
                   Anxiety: ${d.Anxiety} &nbsp;|&nbsp; Hours/day: ${d["Hours per day"]}<br>
                   Effect: ${d["Music effects"]}`);
        })
        .on("mousemove", function() {
            // move tooltip to follow the cursor
            d3.select("#tooltip")
                .style("left", (d3.event.pageX + 12) + "px")
                .style("top",  (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function(d) {
            // restore dot to its filtered state when cursor leaves
            d3.select(this)
                .attr("r",       isActive(d) ? 4 : 2)
                .attr("opacity", isActive(d) ? 0.75 : 0.05);
            d3.select("#tooltip").style("opacity", 0);
        });

    // legend for music effects categories
    const legendG = svg.append("g")
        .attr("transform", `translate(${chartWidth - 100}, 10)`);

    // legend title
    legendG.append("text")
        .attr("x", 0)
        .attr("y", -5)
        .style("font-size", "11px")
        .style("font-weight", "bold")
        .text("Music Effects");

    Object.entries(effectColors).forEach(([label, color], i) => {
        // colored circle for each category
        legendG.append("circle")
            .attr("cx", 6)
            .attr("cy", i * 20 + 10)
            .attr("r", 5)
            .attr("fill", color);

        // label for each category
        legendG.append("text")
            .attr("x", 16)
            .attr("y", i * 20 + 14)
            .style("font-size", "11px")
            .text(label);
    });
}

function drawParallelCoordinates(data) {
    // container dimensions for responsive sizing
    const container = document.getElementById("parallel-coordinates");
    const w = container.clientWidth;
    const h = container.clientHeight;
    const margin = { top: 50, right: 120, bottom: 30, left: 60 };
    const chartWidth = w - margin.left - margin.right;
    const chartHeight = h - margin.top - margin.bottom;

    // append SVG to parallel-coordinates div
    const svg = d3.select("#parallel-coordinates")
        .append("svg")
        .attr("width", w)
        .attr("height", h)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // dimensions shown as vertical axes
    const dimensions = ["Age", "Hours per day", "Anxiety", "Depression", "Insomnia", "OCD"];

    // color scale matching the scatter plot for consistency
    const effectColors = {
        "Improve": "#2196F3",
        "No effect": "#9E9E9E",
        "Worsen": "#F44336"
    };

    // x scale positions each dimension evenly across the chart width
    const x = d3.scalePoint()
        .domain(dimensions)
        .range([0, chartWidth]);

    // one y scale per dimension based on its own data range
    const yScales = {};
    dimensions.forEach(dim => {
        yScales[dim] = d3.scaleLinear()
            .domain(d3.extent(data, d => d[dim]))
            .range([chartHeight, 0]);
    });

    // polyline path connecting a respondent's values across all axes
    function path(d) {
        return d3.line()(dimensions.map(dim => [x(dim), yScales[dim](d[dim])]));
    }

    // one line per respondent colored by music effect
    pcLines = svg.selectAll(".data-line")
        .data(data)
        .enter()
        .append("path")
        .attr("class", "data-line")
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", d => effectColors[d["Music effects"]] || "#9E9E9E")
        .attr("stroke-width", 1)
        .attr("opacity", 0.2);

    // one vertical axis per dimension
    dimensions.forEach(dim => {
        const axisG = svg.append("g")
            .attr("transform", `translate(${x(dim)},0)`);

        // vertical axis
        axisG.call(d3.axisLeft(yScales[dim]).ticks(5));

        // axis label above each
        axisG.append("text")
            .attr("y", -15)
            .attr("text-anchor", "middle")
            .style("font-size", "11px")
            .style("fill", "black")
            .style("font-weight", "bold")
            .text(dim);

        // brush for this axis, drag to select a range of values
        const brush = d3.brushY()
            .extent([[-10, 0], [10, chartHeight]]) // brush area is ±10px around the axis line
            .on("brush end", function() {
                const sel = d3.event.selection;
                if (sel) {
                    // convert pixel selection to data values
                    brushExtents[dim] = sel.map(yScales[dim].invert).sort(d3.ascending);
                } else {
                    // brush was cleared for this axis
                    delete brushExtents[dim];
                }
            // animate parallel lines and scatter dots based on new filters
            updateParallelLines();
            updateScatterPlot();
        });

        // append brush group and store references
        const brushGroup = axisG.append("g")
            .attr("class", "brush")
            .call(brush);

        brushBehaviors[dim] = brush;
        brushGroups[dim]    = brushGroup;
    });

    // chart title
    svg.append("text")
        .attr("x", chartWidth / 2)
        .attr("y", -30)
        .attr("text-anchor", "middle")
        .style("font-weight", "bold")
        .style("font-size", "14px")
        .text("Listener Profiles: Age, Listening Habits & Self-Reported Mental Health Effect");

    // legend for Music effects
    const legendG = svg.append("g")
        .attr("transform", `translate(${chartWidth + 20}, 10)`);

    // legend title
    legendG.append("text")
        .attr("x", 0)
        .attr("y", -5)
        .style("font-size", "11px")
        .style("font-weight", "bold")
        .text("Music Effects");

    Object.entries(effectColors).forEach(([label, color], i) => {
        // colored line for each category
        legendG.append("line")
            .attr("x1", 0)
            .attr("x2", 20)
            .attr("y1", i * 20 + 10)
            .attr("y2", i * 20 + 10)
            .attr("stroke", color)
            .attr("stroke-width", 2);

        // label for each category
        legendG.append("text")
            .attr("x", 25)
            .attr("y", i * 20 + 14)
            .style("font-size", "11px")
            .text(label);
    });
}

