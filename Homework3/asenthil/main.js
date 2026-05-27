/*
 * Music and Mental Health
 * Goal: Visualize relationship between musical habits and mental health.
 * Transition from qualitative observations (streamgraph) to quantitative analysis, and then to categorical insights (stacked bar chart of genres and effects).
 */

/* HOMEWORK 3 GOALS
Used brushing and linking to connect the streamgraph (View 1) with the line chart (View 2) and stacked bar chart (View 3).
Used pan and zoom on the streamgraph to allow users to focus on specific age ranges, which dynamically filters the data in the line chart 
and stacked bar chart to show varying trends based on the age group selected.
For example, users can brush over the age range of 30-40 in the streamgraph to see how mental health metrics trend with listening time for that selected age group in the line chart.
The streamgraph is used as an overview and filtering tool so users can use that to explore an age range of choice and use the view 2 and 3 to analyze specific trends and insights for that age group.
*/

// Global State Management
let globalRawData = []; // Caches initial parsed dataset for resetting filters
let isBrushingNow = false; // Flag to prevent window resize from interrupting an brush drag

// shared Layout Parameters
const margin = { top: 45, right: 35, bottom: 65, left: 65 };

// D3: color mapping for music effects
const effectColors = d3.scaleOrdinal().domain(["Improve", "No effect", "Worsen"]).range(["#2ecc71", "#95a5a6", "#e74c3c"]);

// D3:  color mapping for quantitative mental health metrics
const metricColors = d3.scaleOrdinal().domain(["Anxiety", "Depression", "Insomnia", "OCD"]).range(["#e67e22", "#3498db", "#9b59b6", "#008080"]);

// Global initialtization of tooltip div - updated across views
// D3: takes body to check if a tooltip exists
let tooltip = d3.select("body").select(".d3-tooltip");
if (tooltip.empty()) {
    // D3 Append: Injects a hidden div into the DOM= floating tooltip
    tooltip = d3.select("body").append("div")
        .attr("class", "d3-tooltip")
        .style("position", "absolute")
        .style("background", "rgba(255, 255, 255, 0.95)")
        .style("padding", "10px 14px")
        .style("border", "1px solid #bdc3c7")
        .style("border-radius", "6px")
        .style("box-shadow", "0 4px 6px rgba(0,0,0,0.1)")
        .style("pointer-events", "none") // Prevents tooltip from blocking mouse events
        .style("font-family", "sans-serif")
        .style("font-size", "13px")
        .style("opacity", 0) // Initially hidden
        .style("z-index", 100);
}

// D3 Fetch: Loads CSV data
d3.csv("data/mxmh_survey_results.csv").then(data => {
    const cleanData = [];
    // Data Cleaning: Casts string vals to ints - filter invalid NaN rows
    data.forEach(d => {
        const anxiety = +d.Anxiety;
        const depression = +d.Depression;
        const insomnia = +d.Insomnia;
        const ocd = +d.OCD;
        const hours = +d['Hours per day'];
        const age = +d.Age;
        const genre = d['Fav genre'] || d['Primary genre'] || "Other";
        const effect = d['Music effects'];

        if (!isNaN(anxiety) && !isNaN(hours) && !isNaN(age)) {
            cleanData.push({
                Anxiety: anxiety, Depression: depression, Insomnia: insomnia, 
                OCD: ocd, hours: hours, Age: age, genre: genre, effect: effect
            });
        }
    });

    globalRawData = cleanData;
    updateDashboard(globalRawData);

    // D3: Attach a resize listener to the window to trigger a redraw of all view
    window.addEventListener("resize", () => {
        if (!isBrushingNow) updateDashboard(globalRawData);
    });
}).catch(error => console.error("Critical error loading CSV file:", error));

// Centralized fct to update all views based on current active dataset (global or filtered)
function updateDashboard(filteredData) {
    // View 1 (Streamgraph) 
    drawStreamgraph(globalRawData);
    
    // Views 2, 3, tracking the dynamically filtered subset
    drawMetricTrends(filteredData); 
    drawStackedBar(filteredData);
}

/**
 * VIEW 1: ADVANCED STREAMGRAPH - Mental Health Across Ages by Musical Genre
 * Each stream represents a genre. The thickness at each age shows the combined average severity of the 4 mental health metrics tested.
 * The "river" layout shows the flow and changes across the different ages, while the internal legend shows top 10 genres.
 */
function drawStreamgraph(data) {
    // D3 Select: Targets  container div
    const container = d3.select("#view1");
    const cWidth = container.node().clientWidth;
    const cHeight = container.node().clientHeight;
    const margin = { top: 60, right: 40, bottom: 85, left: 110 }; 
    const width = cWidth - margin.left - margin.right;
    const height = cHeight - margin.top - margin.bottom;

    // D3 Select: Checks for existing SVG to prevent duplicate
    let svg = container.select("svg").select("g");
    if (container.select("svg").empty()) {
        // D3 Append: Creates responsive SVG canvas
        svg = container.append("svg").attr("viewBox", `0 0 ${cWidth} ${cHeight}`)
          .append("g").attr("transform", `translate(${margin.left},${margin.top})`); // D3 Append with transform to create inner drawing group with margins

        // D3 Append: Creates empty group for x-axis at bottom
        svg.append("g").attr("class", "x-axis").attr("transform", `translate(0, ${height})`);
        
        // D3 Append: static text for titles and labels
        svg.append("text").attr("x", width / 2).attr("y", -15).attr("text-anchor", "middle").style("font-size", "19px").style("font-weight", "bold").text("Mental Health Across Ages by Musical Genre");  
        svg.append("text").attr("x", width / 2).attr("y", height + 50).attr("text-anchor", "middle").style("font-size", "14px").style("font-weight", "bold").text("Age of Respondent (Years)");
        svg.append("text").attr("transform", "rotate(-90)").attr("y", -margin.left + 80).attr("x", -height / 2).attr("text-anchor", "middle").style("font-size", "14px").style("font-weight", "bold").text("Average Mental Health Severity (0-40)");
        svg.append("text").attr("class", "caption-text").attr("x", width / 2).attr("y", height + 70).attr("text-anchor", "middle").style("font-size", "12px").style("fill", "#7f8c8d").style("font-style", "italic").text("Age of Respondent (Years) | Stream Thickness = Combined Severity (Anxiety+OCD+Insomnia+Depression)");
    }

    // Data Processing - top 10 genres by count, then average severity by age for those genres
    const genreCounts = d3.rollup(globalRawData, v => v.length, d => d.genre);
    const topGenres = Array.from(genreCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(d => d[0]);
    const genreColors = d3.scaleOrdinal(d3.schemeTableau10).domain(topGenres);
    const ages = Array.from(new Set(globalRawData.map(d => d.Age))).sort((a, b) => a - b);
    
    const formattedData = ages.map(age => {
        const entry = { age: age };
        const ageGroup = data.filter(d => d.Age === age);
        topGenres.forEach(g => {
            const genreInAge = ageGroup.filter(d => d.genre === g);
            entry[g] = genreInAge.length > 0 ? d3.mean(genreInAge, d => d.Anxiety + d.OCD + d.Insomnia + d.Depression) : 0;
        });
        return entry;
    });

    // D3 Layout: stacking for "wiggle" streamgraph aesthetic
    const stack = d3.stack().keys(topGenres).offset(d3.stackOffsetWiggle).order(d3.stackOrderInsideOut);
    const series = stack(formattedData);

    // D3 Scales: Map data domain (Age/Severity) to pixel range
    const x = d3.scaleLinear().domain(d3.extent(ages)).range([0, width]);
    const y = d3.scaleLinear().domain([d3.min(series, l => d3.min(l, d => d[0])), d3.max(series, l => d3.max(l, d => d[1]))]).range([height, 0]);
    
    // D3 Shape: Area generator with a basis curve to create flowing stream shape
    const area = d3.area().x(d => x(d.data.age)).y0(d => y(d[0])).y1(d => y(d[1])).curve(d3.curveBasis);

    // D3 Data Binding: Bind the stream layers to path elements, using genre name = key for consistency across updates
    const streams = svg.selectAll(".stream-path").data(series, d => d.key);
    
    streams.exit().remove(); // D3 Exit: Remove paths for genres that drop out of top 10
    
    // D3 Enter + Merge + Transition: Append new paths for new genres, merge with existing, and transition all to new positions
    streams.enter().append("path").attr("class", "stream-path").merge(streams)
        .transition().duration(750).ease(d3.easeCubicInOut) // Gestalt Principle: Common Fate
        .attr("d", area).attr("fill", d => genreColors(d.key)).attr("opacity", 0.85);

    // D3 Select: Build static legend only once
    if (svg.selectAll(".legend-group").empty()) {
        // D3 Append: Legend container
        const legend = svg.append("g").attr("class", "legend-group").attr("transform", `translate(${width - 100}, -10)`);
        topGenres.forEach((g, i) => {
            // D3 Append: Individual row group for each legend item
            const row = legend.append("g").attr("transform", `translate(0, ${i * 20})`);
            // D3 Append: Color swatch rectangle
            row.append("rect").attr("width", 12).attr("height", 12).attr("fill", genreColors(g));
            // D3 Append: Genre text label
            row.append("text").attr("x", 18).attr("y", 10).text(g).style("font-size", "11px").style("font-weight", "bold");
        });

        // BRUSHING INTERACTION: Filter data across all views by selecting an age range
        // age range selected because it allows users to explore how mental health trends evolve across the lifespan, while also filtering the genre and effect insights in the downstream views
        // D3 Brush: Initialize 1D horizontal brush component
        const brush = d3.brushX().extent([[0, 0], [width, height]])
            .on("start", () => { isBrushingNow = true; }) // Suppress layout resizes during active dragging
            .on("brush end", (event) => {
                const selection = event.selection;
                if (!selection) {
                    isBrushingNow = false;
                    // Reset downstream views to global dataset
                    drawMetricTrends(globalRawData); 
                    drawStackedBar(globalRawData);
                } else {
                    // D3 Scale Invert: Convert pixel selection back to Age values
                    const [x0, x1] = selection.map(x.invert);
                    // Filter dataset based on Age boundaries
                    const crossViewSubset = globalRawData.filter(d => d.Age >= x0 && d.Age <= x1);
                    // Push filtered subsets to Focus views
                    drawMetricTrends(crossViewSubset);
                    drawStackedBar(crossViewSubset);
                }
            });

        // D3 Append & Call: Append a group for the brush and call the brush generator for interaction
        svg.append("g").attr("class", "brush").call(brush);
    }
    
    // minor (gray) ticks every 2 years, major (black) ticks every 10 years - dynamically calculated based on max age in dataset
    const maxAge = Math.ceil(d3.max(ages) / 10) * 10; 
    const tickVals = d3.range(0, maxAge + 2, 2); // Array generating tick every 2 years

    // D3 Transition & Call: X-axis using custom tick values
    svg.select(".x-axis").transition().duration(750)
        .call(d3.axisBottom(x)
            .tickValues(tickVals)
            // D3 Format: Hide text for minor (2yr) ticks, only show for major (10yr) ticks
            .tickFormat(d => d % 10 === 0 ? d : "") 
        );

    // D3 Select All: Style ticks based on whether they are major or minor w/ tick vals
    svg.select(".x-axis").selectAll(".tick line")
        .transition().duration(750)
        .attr("stroke", d => d % 10 === 0 ? "#000000" : "#bdc3c7") 
        .attr("y2", d => d % 10 === 0 ? 6 : 4); 
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

    let svg = container.select("svg").select("g"); // D3 Select: Check for existing SVG and group
    
    // Structural Initialization (Fires Once)
    if (container.select("svg").empty()) {
        // D3 Append: Base SVG container with viewBox for responsiveness
        svg = container.append("svg").attr("viewBox", `0 0 ${cWidth} ${cHeight}`)
            .append("g").attr("transform", `translate(${margin.left}, ${margin.top})`); //inner group with margins, offset for axes and titles

        // D3 Append: Empty groups for axes
        svg.append("g").attr("class", "x-axis").attr("transform", `translate(0, ${height})`);
        svg.append("g").attr("class", "y-axis");

        const metrics = ["Anxiety", "Depression", "Insomnia", "OCD"];
        
        // D3 Append: Static Legend Container
        const legend = svg.append("g").attr("transform", `translate(${width + 3}, 0)`); 
        metrics.forEach((m, i) => {
            const row = legend.append("g").attr("transform", `translate(0, ${i * 20})`);
            // D3 Append: Line element for color swatch
            row.append("line").attr("x1", 0).attr("x2", 15).attr("y1", 10).attr("y2", 10).attr("stroke", metricColors(m)).attr("stroke-width", 3);
            // D3 Append: Metric Text
            row.append("text").attr("x", 20).attr("y", 14).text(m).style("font-size", "11px").style("font-weight", "bold").style("fill", "#2c3e50");
        });

        // D3 Append: Static titles and labels
        svg.append("text").attr("x", width / 2).attr("y", -20).attr("text-anchor", "middle").style("font-size", "16px").style("font-weight", "bold").text("Mental Health Trends by Listening Time");
        svg.append("text").attr("x", width / 2).attr("y", height + 50).attr("text-anchor", "middle").style("font-weight", "bold").text("Daily Listening Time (Hours)");
        svg.append("text").attr("transform", "rotate(-90)").attr("y", -35).attr("x", -height / 2).attr("text-anchor", "middle").style("font-weight", "bold").text("Average Score (0-10)");

        // HOVER INTERACTION: Scrubber line and tooltip -follows mouse movement to show exact values at each hour point
        // D3 Append: Hidden group to hold vertical tracking line
        const focus = svg.append("g").attr("class", "focus-group").style("display", "none");

        // D3 Append: Vertical line that will follow the mouse, initially hidden
        focus.append("line").attr("class", "hover-line").attr("y1", 0).attr("y2", height)
            .style("stroke", "#34495e").style("stroke-width", "1.5px").style("stroke-dasharray", "4,4");
            
        // D3 Append: Invisible rect overlay to get mouse events
        svg.append("rect").attr("class", "overlay-rect").attr("width", width).attr("height", height).style("fill", "none").style("pointer-events", "all");
    }

    // Dynamic Data Processing based on Active Brush Selection
    const metrics = ["Anxiety", "Depression", "Insomnia", "OCD"];
    // D3 Array: Group and calculate mean scores per hour
    const groupedData = d3.groups(data, d => d.hours)
        .map(([hour, values]) => {
            const entry = { hour: +hour };
            metrics.forEach(m => entry[m] = d3.mean(values, d => d[m]));
            return entry;
        }).sort((a, b) => a.hour - b.hour);

    // D3 Scales: Dynamic domain resizing based on filtered data subset
    const x = d3.scaleLinear().domain([0, d3.max(groupedData, d => d.hour) || 24]).range([0, width]);
    const y = d3.scaleLinear().domain([0, 10]).range([height, 0]);
    
    // D3 Shape: Line generator for each metric, using monotone curve for smoothness while preserving data trends
    //use monotoneX to create smooth curves
    const line = d3.line().x(d => x(d.hour)).y(d => y(d.value)).curve(d3.curveMonotoneX);

    // D3 Data Binding: per metrix, bind corresponding hour-value pairs to a path element
    metrics.forEach(m => {
        const metricLineData = groupedData.map(d => ({ hour: d.hour, value: d[m] }));
        
        // D3 SelectAll: Bind array data to path class
        const path = svg.selectAll(`.line-${m}`).data([metricLineData]);
        
        // D3 Enter, Merge, Transition: new paths for new metrics, merge with existing, and transition to new positions from updated data
        path.enter().append("path").attr("class", `line-${m}`).attr("fill", "none").attr("stroke", metricColors(m)).attr("stroke-width", 2.5)
            .merge(path).transition().duration(750).ease(d3.easeCubicInOut).attr("d", line);
    });

    // D3 Transition & Call: Animate axes to new scales, ticks to adjust 
    svg.select(".x-axis").transition().duration(750).call(d3.axisBottom(x));
    svg.select(".y-axis").transition().duration(750).call(d3.axisLeft(y));

    // HOVER INTERACTION
    // D3 Array: Bisector acts as a binary search to find closest data point to cursor
    const bisect = d3.bisector(d => d.hour).left;
    const focusGroup = svg.select(".focus-group");
    
    // D3 Events: Attach hover listeners to the invisible overlay rect
    svg.select(".overlay-rect")
        .on("mouseover", () => focusGroup.style("display", null)) // Unhide tracking line
        .on("mouseout", () => { focusGroup.style("display", "none"); tooltip.style("opacity", 0); }) // Hide line and tooltip
        .on("mousemove", function(event) {
            // Guard clause if no data is present in brush selection
            if (groupedData.length === 0) return;

            // D3 Scale Invert: Translates mouse pixel X coordinate to estimated Hours value
            const x0 = x.invert(d3.pointer(event)[0]);
            
            // Search array for closest matching discrete hour
            const i = bisect(groupedData, x0, 1);
            const d0 = groupedData[i - 1];
            const d1 = groupedData[i];
            
            //if cursor approaches edges of the graph
            let dData = d0;
            if (d0 && d1) {
                dData = x0 - d0.hour > d1.hour - x0 ? d1 : d0;
            } else if (d1) {
                dData = d1;
            }
            if(!dData) return;

            // D3 Transform: Snap vertical line to the closest exact hour coordinate
            focusGroup.attr("transform", `translate(${x(dData.hour)}, 0)`);

            // D3 Transition & HTML: show tooltip w/ exact metric values for that hour, positioned near cursor
            tooltip.transition().duration(50).style("opacity", 1);
            tooltip.html(
                `<div style="text-align:center; border-bottom:1px solid #ccc; padding-bottom:4px; margin-bottom:4px;">
                    <strong>${dData.hour} Hours/Day</strong>
                 </div>
                 <span style="color:${metricColors('Anxiety')}">●</span> Anxiety: <b>${(dData.Anxiety || 0).toFixed(1)}</b><br/>
                 <span style="color:${metricColors('Depression')}">●</span> Depression: <b>${(dData.Depression || 0).toFixed(1)}</b><br/>
                 <span style="color:${metricColors('Insomnia')}">●</span> Insomnia: <b>${(dData.Insomnia || 0).toFixed(1)}</b><br/>
                 <span style="color:${metricColors('OCD')}">●</span> OCD: <b>${(dData.OCD || 0).toFixed(1)}</b>`
            )
            .style("left", (event.pageX + 20) + "px")
            .style("top", (event.pageY - 50) + "px");
        });
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
    const margin = { top: 50, right: 35, bottom: 130, left: 65 };
    const width = cWidth - margin.left - margin.right;
    const height = cHeight - margin.top - margin.bottom;

    let svg = container.select("svg").select("g");
    if (container.select("svg").empty()) {
        // D3 Append: Base SVG container with preserveAspectRatio for proper scaling
        svg = container.append("svg").attr("viewBox", `0 0 ${cWidth} ${cHeight}`).attr("preserveAspectRatio", "xMinYMin meet")
          .append("g").attr("transform", `translate(${margin.left},${margin.top})`);
            
        // D3 Append: Empty axis groups
        svg.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`);
        svg.append("g").attr("class", "y-axis");

        // D3 Append: Titles and axis labels
        svg.append("text").attr("x", width / 2).attr("y", -20).attr("text-anchor", "middle").attr("class", "chart-title").text("Top 10 Musical Genres and Mental Health Effects");
        svg.append("text").attr("transform", "rotate(-90)").attr("y", -40).attr("x", -height / 2).attr("text-anchor", "middle").attr("class", "axis-label").style("font-size", "14px").style("font-weight", "bold").text("Number of Respondents");
        svg.append("text").attr("x", width / 2).attr("y", height + 83).attr("text-anchor", "middle").style("font-size", "15px").style("font-weight", "bold").text("Top 10 Musical Genres");

        // D3 Append: Legend structure
        const legend = svg.append("g").attr("transform", `translate(${width - 100}, 0)`);
        const effects = ["Improve", "No effect", "Worsen"];
        effects.forEach((eff, i) => {
            const legendRow = legend.append("g").attr("transform", `translate(0, ${i * 20})`);
            // D3 Append: Swatch rect
            legendRow.append("rect").attr("width", 12).attr("height", 12).attr("fill", effectColors(eff));
            // D3 Append: Swatch text
            legendRow.append("text").attr("x", 20).attr("y", 10).attr("font-size", "12px").style("text-anchor", "start").style("font-weight", "500").text(eff);
        });
    }

    // Data Processing
    const genres = Array.from(new Set(globalRawData.map(d => d.genre)));
    const effects = ["Improve", "No effect", "Worsen"];

    const stackData = genres.map(genre => {
        const genreRows = data.filter(d => d.genre === genre);
        const dObj = { genre: genre };
        effects.forEach(e => dObj[e] = genreRows.filter(r => r.effect === e).length);
        dObj.total = genreRows.length;
        return dObj;
    }).sort((a, b) => b.total - a.total).slice(0, 10); 

    // D3 Scales: Band scale for categorical genres
    const x = d3.scaleBand().domain(stackData.map(d => d.genre)).range([0, width]).padding(0.35);
    const y = d3.scaleLinear().domain([0, d3.max(stackData, d => d.total) || 10]).range([height, 0]);
    
    // D3 Layout: calcs segment heights for stacked bar format
    const layers = d3.stack().keys(effects)(stackData);

    // D3 Data Binding: Binds effect categories (Improve/Worsen) to group layers
    const layerGroups = svg.selectAll(".layer").data(layers, d => d.key);
    
    // D3 Enter & Merge: Appends layer groups and applies color fills
    const activeLayers = layerGroups.merge(layerGroups.enter().append("g").attr("class", "layer").attr("fill", d => effectColors(d.key)));
    
    // D3 Data Binding: Binds specific genre segments to rects within layers
    const bars = activeLayers.selectAll("rect").data(d => d, d => d.data.genre);

    // D3 Exit: Animate exiting bars to shrink down to the x-axis before removing - smooth transition
    bars.exit().transition().duration(750).attr("y", height).attr("height", 0).remove();

    // D3 Enter, Merge, Transition: new rects for new genres, merge with existing, and transition to new positions and heights based on updated data
    bars.enter().append("rect")
        .attr("x", d => x(d.data.genre)).attr("y", height).attr("height", 0).attr("width", x.bandwidth())
        .merge(bars).transition().duration(750).ease(d3.easeCubicInOut)
        .attr("x", d => x(d.data.genre)).attr("y", d => y(d[1]))
        .attr("height", d => y(d[0]) - y(d[1])).attr("width", x.bandwidth());

    // D3 Call: Animate the axes, ensuring rotated labels remain correctly anchored
    svg.select(".x-axis").transition().duration(750).call(d3.axisBottom(x)).selectAll("text").attr("transform", "rotate(-35)").style("text-anchor", "end");
    svg.select(".y-axis").transition().duration(750).call(d3.axisLeft(y));
}