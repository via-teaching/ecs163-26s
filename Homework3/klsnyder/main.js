//****** AI credits: *******//
/*
I used AI to explain the code from the Homework 2 template and what it does in order to understand
what lines to modify.

I used AI to learn the D3 data-join pattern (enter, update, exit) and transition syntax 
needed to link a selection event to a focus scatter plot update.

I used AI to debug console output to dbug issus relating to interactivity
*/

// Global vars
let processedData = [];
let g1, x1, y1;
let selectedCategoryFilter = null;
let tooltip;
let circleGroup;

let statFilter = 300; // Keep only the strong pokemon

const width = window.innerWidth;
const height = window.innerHeight;

let scatterLeft = 0, scatterTop = 0;
let scatterMargin = {top: 100, right: 30, bottom: 30, left: 60},
    scatterWidth = 600 - scatterMargin.left - scatterMargin.right,
    scatterHeight = 500 - scatterMargin.top - scatterMargin.bottom;

let distrLeft = 400, distrTop = 0;
let distrMargin = {top: 10, right: 30, bottom: 30, left: 60},
    distrWidth = 400 - distrMargin.left - distrMargin.right,
    distrHeight = 350 - distrMargin.top - distrMargin.bottom;

let teamLeft = 0, teamTop = 600;
let teamMargin = {top: 10, right: 30, bottom: 30, left: 60},
    teamWidth = 600 - teamMargin.left - teamMargin.right,
    teamHeight = 250 - teamMargin.top - teamMargin.bottom;

// Clean and load data
d3.csv("pokemon.csv").then(rawData => {
    console.log("rawData", rawData);

    // Clean non-string attributes
    rawData.forEach(function(d) {
        d.Attack = Number(d.Attack);
        d.Defense = Number(d.Defense);
        d.Speed = Number(d.Speed);
        d.HP = Number(d.HP);
        d.Total = Number(d.Total);
    });

    const filteredData = rawData.filter(d => d.Total > statFilter);

    // Populate global data array 
    processedData = filteredData.map(d => {
        return {
            "name": d.Name, 
            "x_val": d.Attack,
            "y_val": d.Defense,
            "type1": d.Type_1.trim(),
            "radius": d.Speed,
            "color": d.Color
        };
    });
    console.log("processedData", processedData);

    const svg = d3.select("svg");

    // ==================================================
    // PLOT 1: SCATTER PLOT SETUP
    // ==================================================

    // main group for scatter plot
    g1 = svg.append("g")
        .attr("width", scatterWidth + scatterMargin.left + scatterMargin.right)
        .attr("height", scatterHeight + scatterMargin.top + scatterMargin.bottom)
        .attr("transform", `translate(${scatterMargin.left + 200}, ${scatterMargin.top})`);

    // clipping rectangle to hide circles that go outside the plot area
    svg.append("defs").append("clipPath")
        .attr("id", "scatter-clip")
        .append("rect")
        .attr("width", scatterWidth)
        .attr("height", scatterHeight);

    // Two line scatter plot title
    const titleText = g1.append("text")
        .attr("x", scatterWidth / 2)
        .attr("y", -35)
        .attr("font-size", "18px")
        .attr("font-weight", "bold")
        .attr("text-anchor", "middle");

    // scatter plot title line 1:
    titleText.append("tspan")
        .attr("x", scatterWidth / 2)
        .attr("dy", 0)
        .text("Dynamic Focus View: Detailed Metrics");

    // scatter plot title line 2:
    titleText.append("tspan")
        .attr("x", scatterWidth / 2)
        .attr("dy", "1.2em")
        .text("Pokemon Combat Stats: Attack vs. Defense vs. Speed");

    // X label
    g1.append("text")
        .attr("x", scatterWidth / 2)
        .attr("y", scatterHeight + 50)
        .attr("font-size", "20px")
        .attr("text-anchor", "middle")
        .text("Attack");

    // Y label
    g1.append("text")
        .attr("x", -(scatterHeight / 2))
        .attr("y", -40)
        .attr("font-size", "20px")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text("Defense");

    // Initialize D3 Scales
    x1 = d3.scaleLinear()
        .domain([0, d3.max(processedData, d => d.x_val)])
        .range([0, scatterWidth]);

    y1 = d3.scaleLinear()
        .domain([0, d3.max(processedData, d => d.y_val)])
        .range([scatterHeight, 0]);

    // Append empty placeholder groups for dynamic axes updates
    g1.append("g")
        .attr("class", "x-axis-group")
        .attr("transform", `translate(0, ${scatterHeight})`);

    g1.append("g")
        .attr("class", "y-axis-group");

    g1.append("rect")
        .attr("width", scatterWidth)
        .attr("height", scatterHeight)
        .attr("fill", "none")
        .style("pointer-events", "all");


    // plot points for scatter plot - get clipped at scatter plot edges
    circleGroup = g1.append("g")
        .attr("clip-path", "url(#scatter-clip)");

        
    // scatter plot interactivity instructions
    const instructions = svg.append("g")
        .attr("transform", `translate(40, ${scatterMargin.top + 10})`);

    instructions.append("rect")
        .attr("height", 165)
        .attr("width", 150)
        .attr("fill", "steelblue")
        .attr("opacity", 0.6);

    const instructionText = instructions.append("text")
        .attr("font-size", "14px")
        .attr("fill", "black");

    instructionText.append("tspan")
        .attr("x", 15)
        .attr("dy", 23)
        .text("- Scroll on the plot");

    instructionText.append("tspan")
        .attr("x", 15)
        .attr("dy", "1.4em")
        .text("to zoom in or out");

    instructionText.append("tspan")
        .attr("x", 15)
        .attr("dy", "1.8em")
        .text("- Click and drag");

    instructionText.append("tspan")
        .attr("x", 15)
        .attr("dy", "1.4em")
        .text("to pan around");

    instructionText.append("tspan")
        .attr("x", 15)
        .attr("dy", "1.8em")
        .text("- Hover over points to");

    instructionText.append("tspan")
        .attr("x", 15)
        .attr("dy", "1.4em")
        .text("see Pokemon name");

    instructionText.append("tspan")
        .attr("x", 15)
        .attr("dy", "1.4em")
        .text("and stats");

    // scatter plot legend
    const legend = svg.append("g")
        .attr("transform", `translate(${scatterMargin.left + scatterWidth + 100}, ${scatterMargin.top})`);

    legend.append("ellipse")
        .attr("cx", 50)
        .attr("cy", 15)
        .attr("rx", 50)
        .attr("ry", 20)
        .attr("fill", "#aabcb8")
        .attr("opacity", 0.6);

    legend.append("text")
        .attr("x", 50)
        .attr("y", 19)
        .attr("font-size", "12px")
        .attr("text-anchor", "middle")
        .text("Radius = Speed");

    // tooltip div that floats near the mouse on hover
    tooltip = d3.select("body").append("div")
        .style("position", "absolute")
        .style("background", "white")
        .style("border", "1px solid #ccc")
        .style("padding", "6px 10px")
        .style("border-radius", "4px")
        .style("font-size", "12px")
        .style("z-index", "10") // ensure tooltip renders above the SVG
        .style("pointer-events", "none")  // so it doesn't interfere with mouse events
        .style("opacity", 0);  // hidden by default

    // ==================================================
    // PLOT 2: BAR CHART SETUP WITH SELECTION HOOKS
    // ==================================================
    const typeCounts = processedData.reduce((s, { type1 }) => (s[type1] = (s[type1] || 0) + 1, s), {});
    const teamData = Object.keys(typeCounts).map((key) => ({ type1: key, count: typeCounts[key] }));

    // main group for bar chart
    const g3 = svg.append("g")
        .attr("width", teamWidth + teamMargin.left + teamMargin.right)
        .attr("height", teamHeight + teamMargin.top + teamMargin.bottom)
        .attr("transform", `translate(${teamMargin.left + 200}, ${teamTop})`);

    // bar chart title
    g3.append("text")
        .attr("x", teamWidth / 2)
        .attr("y", -20)
        .attr("font-size", "22px")
        .attr("font-weight", "bold")
        .attr("text-anchor", "middle")
        .text("Distribution of Pokemon by Type");

    // X label
    g3.append("text")
        .attr("x", teamWidth / 2)
        .attr("y", teamHeight + 60)
        .attr("font-size", "20px")
        .attr("text-anchor", "middle")
        .text("Pokemon Type");

    // Y label
    g3.append("text")
        .attr("x", -(teamHeight / 2))
        .attr("y", -40)
        .attr("font-size", "20px")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text("Number of Pokemon");

    // X axis ticks definition
    const x2 = d3.scaleBand()
        .domain(teamData.map(d => d.type1))
        .range([0, teamWidth])
        .paddingInner(0.3);

    const xAxisCall2 = d3.axisBottom(x2);
    g3.append("g")
        .attr("transform", `translate(0, ${teamHeight})`)
        .call(xAxisCall2)
        .selectAll("text")
        .attr("y", "10")
        .attr("x", "-5")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-40)");

    // Y axis ticks definition
    const y2 = d3.scaleLinear()
        .domain([0, d3.max(teamData, d => d.count)])
        .range([teamHeight, 0])
        .nice();

    const yAxisCall2 = d3.axisLeft(y2).ticks(6);
    g3.append("g").call(yAxisCall2);

    // bar chart instructions
    const bar_instructions = svg.append("g")
        .attr("transform", `translate(40, ${scatterMargin.top + 500})`);

    bar_instructions.append("rect")
        .attr("height", 60)
        .attr("width", 150)
        .attr("fill", "steelblue")
        .attr("opacity", 0.6);

    const bar_instructionsText = bar_instructions.append("text")
        .attr("font-size", "14px")
        .attr("fill", "black");

    bar_instructionsText.append("tspan")
        .attr("x", 15)
        .attr("dy", 23)
        .text("- Select different bars");

    bar_instructionsText.append("tspan")
        .attr("x", 15)
        .attr("dy", "1.4em")
        .text("to filter by type");

    // Interaction 1: click bars to filter scatterplot
    g3.selectAll(".interactive-bar")
        .data(teamData)
        .enter()
        .append("rect")
        .attr("class", "interactive-bar")
        .attr("y", d => y2(d.count))
        .attr("x", d => x2(d.type1))
        .attr("width", x2.bandwidth())
        .attr("height", d => teamHeight - y2(d.count))
        .attr("fill", "steelblue")
        .style("cursor", "pointer")
        .on("click", function(d) {
            console.log("d is:", d);
            // filter verification logic
            if (selectedCategoryFilter === d.type1) {
                selectedCategoryFilter = null;
                
                // clear active color highlights across bar marks
                d3.selectAll(".interactive-bar").attr("fill", "steelblue");
                // reset focus chart array to default complete state data load
                updateFocusScatterPlot(processedData);
            } else {
                selectedCategoryFilter = d.type1;
                
                // dim non-selected bars
                d3.selectAll(".interactive-bar").attr("fill", "#cccccc");
                d3.select(this).attr("fill", "#ffbf00"); 
                
                // filter main data collection by selected type
                const isolatedSubset = processedData.filter(item => item.type1 === d.type1);
                console.log("filtering for:", d.type1, "found:", isolatedSubset.length); 
                updateFocusScatterPlot(isolatedSubset);
            }
        });

    // ==================================================
    // INTERACTION 2: PAN & ZOOM ON SCATTER PLOT
    // ==================================================
    const zoomConfiguration = d3.zoom()
        .scaleExtent([0.5, 10])
        .extent([[0, 0], [scatterWidth, scatterHeight]])
        .on("zoom", executeZoomTransforms);

    // bind the zoom configuration securely to the scatter plot area
    g1.call(zoomConfiguration);

    // rescales axes and repositions circles
    function executeZoomTransforms() {
        const event = d3.event;  
        // ignore non zoom mouse movement
        if (!event || !event.sourceEvent || event.sourceEvent.type === "click") return;

        // compute new scales
        const dynamicallyRescaledX = event.transform.rescaleX(x1);
        const dynamicallyRescaledY = event.transform.rescaleY(y1);

        // update exes based on zoom
        g1.select(".x-axis-group").call(d3.axisBottom(dynamicallyRescaledX));
        g1.select(".y-axis-group").call(d3.axisLeft(dynamicallyRescaledY));

        // reposition circles on new scale
        circleGroup.selectAll("circle")
            .attr("cx", d => dynamicallyRescaledX(d.x_val))
            .attr("cy", d => dynamicallyRescaledY(d.y_val));
    }

    // initialize scatterplot
    updateFocusScatterPlot(processedData);

}).catch(function(error) {
    console.log(error);
});

// =========================================
// CORE DATA-JOIN LIFECYCLE SEPARATE ROUTINE
// =========================================

// called every time the scatterplot changes
function updateFocusScatterPlot(currentRenderData) {

    // reset scales
    x1.domain([0, d3.max(processedData, d => d.x_val)]);
    y1.domain([0, d3.max(processedData, d => d.y_val)]);

    // redraw axes
    g1.select(".x-axis-group").call(d3.axisBottom(x1));
    g1.select(".y-axis-group").call(d3.axisLeft(y1));

    // bind current data to circles
    const dataMarks = circleGroup.selectAll("circle")
        .data(currentRenderData, d => `${d.name}-${d.type1}`);

    dataMarks.join(
        // new circles fade in
        enterState => enterState.append("circle")
            .attr("cx", d => x1(d.x_val))
            .attr("cy", d => y1(d.y_val))
            .attr("r", 0)
            .attr("fill", d => d.color)  
            .style("opacity", 0)
            .call(enter => enter.transition().duration(800)
                .attr("r", d => d.radius / 25)
                .style("opacity", 0.7)),

        // existing circles update position
        updateState => updateState.transition().duration(800)
            .attr("cx", d => x1(d.x_val))
            .attr("cy", d => y1(d.y_val))
            .attr("r", d => d.radius / 25)
            .attr("fill", d => d.color)
            .style("opacity", 0.7),

        // removed circles fade out
        exitState => exitState.interrupt()  // interrupt before exit transition
            .transition().duration(500)
            .attr("r", 0)
            .style("opacity", 0)
            .remove()
    );

    // tooltip after every join so all circles respond to hover
    circleGroup.selectAll("circle")
        .on("mouseover", function(d) {
            // fade in tooltip with stats
            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(`<strong>${d.name}</strong><br>Attack: ${d.x_val}<br>Defense: ${d.y_val}<br>Speed: ${d.radius}`)
                .style("left", (d3.event.pageX + 10) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mousemove", function() {
            // tooltip to follow cursor
            tooltip.style("left", (d3.event.pageX + 10) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            // fade out tooltip when mouse leaves point
            tooltip.transition().duration(300).style("opacity", 0);
        });
}