/**
 * Music and Mental Health
 * Goal: Visualize relationship between musical habits and mental health.
 * Transition from qualitative observations (wiggles of the streamgraph) to quantitative analysis, and then to categorical insights (stacked bar chart of genres and effects).
 */

// Global margin and shared categorical color scale
const margin = { top: 45, right: 35, bottom: 65, left: 65 };

// Hue encoding for Music Effects: Meaningful color mapping
const effectColors = d3.scaleOrdinal()
    .domain(["Improve", "No effect", "Worsen"])
    .range(["#2ecc71", "#95a5a6", "#e74c3c"]);

// Color scale for four mental health metrics
const metricColors = d3.scaleOrdinal()
    .domain(["Anxiety", "Depression", "Insomnia", "OCD"])
    .range(["#e67e22", "#3498db", "#9b59b6", "#008080"]); // Orange, Blue, Purple, Green (visual contrast)

// Load dataset
d3.csv("data/mxmh_survey_results.csv").then(data => {
    
    // Data Cleaning & Prep + Processing
    const cleanData = [];
    data.forEach(d => {
        // Cast quantitative scores and hours to numbers
        const anxiety = +d.Anxiety;
        const depression = +d.Depression;
        const insomnia = +d.Insomnia;
        const ocd = +d.OCD;
        const hours = +d['Hours per day'];
        const age = +d.Age;
        
        // variations in column naming
        const genre = d['Fav genre'] || d['Primary genre'] || "Other";
        const effect = d['Music effects'];

        // only include valid numerical data before pushing to the array
        if (!isNaN(anxiety) && !isNaN(hours) && !isNaN(age)) {
            cleanData.push({
                Anxiety: anxiety, Depression: depression, Insomnia: insomnia, 
                OCD: ocd, hours: hours, Age: age, genre: genre, effect: effect
            });
        }
    });
    // 3 distinct views with shared data - initialize
    drawStreamgraph(cleanData); // View 1 (advanced, overview)
    drawMetricTrends(cleanData);        // View 2
    drawStackedBar(cleanData);         // View 3

    // Redraw on window resize
    window.addEventListener("resize", () => {
        drawStreamgraph(cleanData);
        drawMetricTrends(cleanData);
        drawStackedBar(cleanData);
    });
}).catch(error => { // Handle errors in loading or processing the CSV file
    console.error("Critical error loading CSV file:", error);
});

/**
 * VIEW 1: ADVANCED STREAMGRAPH - Mental Health Across Ages by Musical Genre
 * Each stream represents a genre. The thickness at each age shows the combined average severity of the 4 mental health metrics tested.
 * The "river" layout shows the flow and changes across the different ages, while the internal legend shows top 10 genres.
 */
function drawStreamgraph(data) {
    const container = d3.select("#view1");
    //dynamic sizing for responsiveness of browser window
    const cWidth = container.node().clientWidth;
    const cHeight = container.node().clientHeight;

    // Resetting right margin b/c legend inside chart
    const margin = { top: 60, right: 40, bottom: 85, left: 110 }; 
    const width = cWidth - margin.left - margin.right;
    const height = cHeight - margin.top - margin.bottom;

    container.selectAll("*").remove(); // Clear previous contents for redraw
    const svg = container.append("svg")
        .attr("viewBox", `0 0 ${cWidth} ${cHeight}`)
      .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // data prep - Identify Top 10 Genres
    const genreCounts = d3.rollup(data, v => v.length, d => d.genre);
    const topGenres = Array.from(genreCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(d => d[0]);

    //grouping genres by color for consistency
    const genreColors = d3.scaleOrdinal(d3.schemeTableau10).domain(topGenres);

    // Group by Age, calculate combined disease severity per genre
    const ages = Array.from(new Set(data.map(d => d.Age))).sort((a, b) => a - b);
    
    //formatting data for d3.stack() layout
    const formattedData = ages.map(age => {
        const entry = { age: age };
        const ageGroup = data.filter(d => d.Age === age);
        topGenres.forEach(g => {
            const genreInAge = ageGroup.filter(d => d.genre === g);
            if (genreInAge.length > 0) {
                // VALUE = Sum of all 4 conditions averaged for this age/genre cohort
                entry[g] = d3.mean(genreInAge, d => d.Anxiety + d.OCD + d.Insomnia + d.Depression);
            } else {
                entry[g] = 0;
            }
        });
        return entry;
    });

    // D3 Stack Layout - using wiggle offset around center axis
    const stack = d3.stack()
        .keys(topGenres)
        .offset(d3.stackOffsetWiggle) // flowing "river" look
        .order(d3.stackOrderInsideOut); // largest layers in the center

    const series = stack(formattedData);

    // scaled axes - mapping data values to pixel
    const x = d3.scaleLinear()
        .domain(d3.extent(ages))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([
            d3.min(series, layer => d3.min(layer, d => d[0])),
            d3.max(series, layer => d3.max(layer, d => d[1]))
        ])
        .range([height, 0]);

    // converts stacked data points into SVG path commands
    const area = d3.area()
        .x(d => x(d.data.age))
        .y0(d => y(d[0]))
        .y1(d => y(d[1]))
        .curve(d3.curveBasis); // Smooth organic flow

    // to draw colored streams - bind data to path elmnts
    svg.selectAll("path")
        .data(series)
        .enter().append("path")
        .attr("d", area)
        .attr("fill", d => genreColors(d.key))
        .attr("opacity", 0.85);

    // genre legend - rect and text elmnts
    const legend = svg.append("g")
        .attr("transform", `translate(${width - 100}, -10)`); //left vs right of legend
    topGenres.forEach((g, i) => {
        const row = legend.append("g")
            .attr("transform", `translate(0, ${i * 20})`); // Vertical list spacing btw legend
        row.append("rect").attr("width", 12).attr("height", 12).attr("fill", genreColors(g));
        row.append("text").attr("x", 18).attr("y", 10) //btw blocks and words of legend
            .text(g).style("font-size", "11px").style("font-weight", "bold");
    });

    // Axes - std d3 axis generators with ticks and labels for age and severity
    svg.append("g")
        .attr("transform", `translate(0, ${height + 0})`)
        .call(d3.axisBottom(x).ticks(10));

    svg.append("text")
        .attr("x", width / 2).attr("y", height + 70).attr("text-anchor", "middle")
        .style("font-size", "12px").style("fill", "#7f8c8d").style("font-style", "italic")
        .text("Age of Respondent (Years) | Stream Thickness = Combined Severity (Anxiety+OCD+Insomnia+Depression)");

    // Title
    svg.append("text")
        .attr("x", width / 2).attr("y", -15) 
        .attr("text-anchor", "middle")
        .style("font-size", "19px").style("font-weight", "bold")
        .text("Mental Health Across Ages by Musical Genre");    
        
    // X-AXIS TITLE 
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 50) // Adjust based on bottom margin
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text("Age of Respondent (Years)");

    //  Y-AXIS TITLE
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 80) // Positioned in left margin area
        .attr("x", -height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text("Average Mental Health Severity (0-40)");
}
/**
 * View 2: Line Chart - Mental Health Trends by Listening Time
 * Four lines represent the average scores of Anxiety, Depression, Insomnia, and OCD across different daily listening hours. 
 */
function drawMetricTrends(data) {
    const container = d3.select("#view2");
    const cWidth = container.node().clientWidth;
    const cHeight = container.node().clientHeight;

    const margin = { top: 50, right: 90, bottom: 85, left: 65 }; //adjusted margin = 50
    const width = cWidth - margin.left - margin.right;
    const height = cHeight - margin.top - margin.bottom;

    container.selectAll("*").remove(); // Clear previous SVG for responsive redraw

    // SVG Initialization with responsive ViewBox
    const svg = container.append("svg")
        .attr("viewBox", `0 0 ${cWidth} ${cHeight}`)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // --- DATA AGGREGATION ---
    const metrics = ["Anxiety", "Depression", "Insomnia", "OCD"];
    const groupedData = d3.groups(data, d => d.hours)
        .map(([hour, values]) => {
            const entry = { hour: +hour };
            metrics.forEach(m => entry[m] = d3.mean(values, d => d[m]));
            return entry;
        })
        .sort((a, b) => a.hour - b.hour);

    // scales
    const x = d3.scaleLinear().domain([0, d3.max(groupedData, d => d.hour)]).range([0, width]);
    const y = d3.scaleLinear().domain([0, 10]).range([height, 0]);

    // --- LINE GENERATOR ---
    const line = d3.line().x(d => x(d.hour)).y(d => y(d.value)).curve(d3.curveMonotoneX);

    // drawing lines
    metrics.forEach(m => {
        const metricLineData = groupedData.map(d => ({ hour: d.hour, value: d[m] }));
        
        // D3 Path: Drawing trend lines
        svg.append("path")
            .datum(metricLineData)
            .attr("fill", "none")
            .attr("stroke", metricColors(m))
            .attr("stroke-width", 2.5)
            .attr("d", line);

        // D3 Circles: A
        svg.selectAll(`.dot-${m}`).data(metricLineData).enter().append("circle")
            .attr("cx", d => x(d.hour)).attr("cy", d => y(d.value)).attr("r", 3)
            .attr("fill", metricColors(m));
    });

    //vertical legend at right of chart (matching other legends)
    const legend = svg.append("g")
        .attr("transform", `translate(${width + 3}, 0)`); 

    metrics.forEach((m, i) => {
        const row = legend.append("g")
            .attr("transform", `translate(0, ${i * 20})`); // Vertical spacing (20px)
        
        // D3 Element: Color swatch line
        row.append("line")
            .attr("x1", 0).attr("x2", 15).attr("y1", 10).attr("y2", 10)
            .attr("stroke", metricColors(m))
            .attr("stroke-width", 3);
            
        // D3 Element: Text label
        row.append("text")
            .attr("x", 20).attr("y", 14)
            .text(m)
            .style("font-size", "11px")
            .style("font-weight", "bold")
            .style("fill", "#2c3e50");
    });

    // axes & titles
    svg.append("g").attr("transform", `translate(0, ${height})`).call(d3.axisBottom(x));
    svg.append("g").call(d3.axisLeft(y));

    // Centered chart title
    svg.append("text")
        .attr("x", width / 2).attr("y", -20)
        .attr("text-anchor", "middle")
        .style("font-size", "16px").style("font-weight", "bold")
        .text("Mental Health Trends by Listening Time");

    // X-axis label
    svg.append("text")
        .attr("x", width / 2).attr("y", height + 50) // Adjust based on bottom margin
        .attr("text-anchor", "middle")
        .style("font-weight", "bold")
        .text("Daily Listening Time (Hours)");

    // Y-axis label (Rotated)
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -35).attr("x", -height / 2)
        .attr("text-anchor", "middle")
        .style("font-weight", "bold")
        .text("Average Score (0-10)");
}
/**
 * View 3: Stacked Bar Chart - Top Genres and Mental Health Effects
 * For the top 10 most popular genres, the chart shows how many people reported that the genre improved, worsened, or had no effect on their mental health. 
 * Each bar is stacked to show the distribution of effects within that genre, making it easy to compare the overall popularity of the genre  and the breakdown of mental health effects.
 */
function drawStackedBar(data) {
    const container = d3.select("#view3");
    const cWidth = container.node().clientWidth;
    const cHeight = container.node().clientHeight;

    // big bottom margin for rotated genre names
    const margin = { top: 50, right: 35, bottom: 130, left: 65 };
    const width = cWidth - margin.left - margin.right;
    const height = cHeight - margin.top - margin.bottom;

    container.selectAll("*").remove();

    const svg = container.append("svg")
        .attr("viewBox", `0 0 ${cWidth} ${cHeight}`)
        .attr("preserveAspectRatio", "xMinYMin meet")
      .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const genres = Array.from(new Set(data.map(d => d.genre)));
    const effects = ["Improve", "No effect", "Worsen"];

    // Prep data for stacking - an array of objects compatible with d3.stack()
    const stackData = genres.map(genre => {
        const genreRows = data.filter(d => d.genre === genre);
        const dObj = { genre: genre }; // Variable initialized as dObj
        effects.forEach(e => dObj[e] = genreRows.filter(r => r.effect === e).length);
        
        dObj.total = genreRows.length; // Corrected variable name here
        
        return dObj;
    }).sort((a,b) => b.total - a.total).slice(0, 10); 

    const x = d3.scaleBand().domain(stackData.map(d => d.genre)).range([0, width]).padding(0.35);
    const y = d3.scaleLinear().domain([0, d3.max(stackData, d => d.total)]).range([height, 0]);

    // D3 Stack: calcs y0 and y1 offsets for bar segments
    const layers = d3.stack().keys(effects)(stackData);

    // layer rendering - group by category colors and draw rects for each segment
    const layerGroups = svg.selectAll(".layer")
        .data(layers)
        .enter().append("g")
        .attr("class", "layer")
        .attr("fill", d => effectColors(d.key));

    //actual rectangles
    layerGroups.selectAll("rect")
        .data(d => d)
        .enter().append("rect")
            .attr("x", d => x(d.data.genre))
            .attr("y", d => y(d[1]))
            .attr("height", d => y(d[0]) - y(d[1]))
            .attr("width", x.bandwidth());

    // legend
    const legend = svg.append("g")
        .attr("transform", `translate(${width - 100}, 0)`);

    // Iterate through effects to create legend entries
    effects.forEach((eff, i) => {
        const legendRow = legend.append("g")
            .attr("transform", `translate(0, ${i * 20})`);

        legendRow.append("rect")
            .attr("width", 12)
            .attr("height", 12)
            .attr("fill", effectColors(eff));

        legendRow.append("text")
            .attr("x", 20)
            .attr("y", 10)
            .attr("font-size", "12px")
            .style("text-anchor", "start")
            .style("font-weight", "500")
            .text(eff); // Adjusted font weight for better readability
    });

    // axes, labels
    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x))
        .selectAll("text").attr("transform", "rotate(-35)").style("text-anchor", "end");
    
    svg.append("g").call(d3.axisLeft(y));

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .attr("class", "chart-title")
        .text("Top 10 Musical Genres and Mental Health Effects");

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -40)
        .attr("x", -height / 2)
        .attr("text-anchor", "middle")
        .attr("class", "axis-label")
        .style("font-size", "14px", )
        .style("font-weight", "bold")
        .text("Number of Respondents");


    // X-Axis Title (below rotated text)
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 83) // Adjust based on bottom margin
        .attr("text-anchor", "middle")
        .style("font-size", "15px")
        .style("font-weight", "bold")
        .text("Top 10 Musical Genres");
}