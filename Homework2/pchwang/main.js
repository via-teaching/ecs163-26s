// Load the pokemon CSV - all chart code goes inside this callback
// so that data is guaranteed to be ready before drawing
d3.csv("data/pokemon_alopez247.csv").then(function(data) {

    // Convert numeric columns from strings to numbers
    // D3 loads all CSV values as strings by default
    data.forEach(function(d) {
        d.Total      = +d.Total;
        d.HP         = +d.HP;
        d.Attack     = +d.Attack;
        d.Defense    = +d.Defense;
        d.Sp_Atk    = +d.Sp_Atk;
        d.Sp_Def    = +d.Sp_Def;
        d.Speed      = +d.Speed;
        d.Catch_Rate = +d.Catch_Rate;
    });

    // Define one color per pokemon type
    // This color scale is shared across ALL three charts for visual consistency
    const typeColors = {
        "Fire":     "#FF6B35",
        "Water":    "#4895EF",
        "Grass":    "#52B788",
        "Electric": "#FFD60A",
        "Psychic":  "#F72585",
        "Normal":   "#ADB5BD",
        "Ghost":    "#7B2D8B",
        "Dragon":   "#5C4AE4",
        "Dark":     "#343A40",
        "Fighting": "#A0522D",
        "Rock":     "#9C8B6E",
        "Ice":      "#90E0EF",
        "Bug":      "#90BE6D",
        "Steel":    "#8D99AE",
        "Poison":   "#9B5DE5",
        "Ground":   "#D4A373",
        "Fairy":    "#FFAFCC",
        "Flying":   "#74C0FC"
    };

    // Draw all three charts initially
    drawChart1(data, typeColors);
    drawChart2(data, typeColors);
    drawChart3(data, typeColors);

    // Redraw all charts on window resize so they scale with browser size
    // Each redraw clears the SVG first then redraws from scratch
    window.addEventListener("resize", function() {
        d3.select("#chart1 svg").selectAll("*").remove();
        d3.select("#chart2 svg").selectAll("*").remove();
        d3.select("#chart3 svg").selectAll("*").remove();
        drawChart1(data, typeColors);
        drawChart2(data, typeColors);
        drawChart3(data, typeColors);
    });

}).catch(function(error) {
    // Log any CSV loading errors to the console for debugging
    console.log("Error loading data:", error);
});


// ─────────────────────────────────────────────
// CHART 1: Bar chart - Pokemon count by Type_1
// This is the CONTEXT (overview) chart
// Shows the distribution of pokemon across all 18 types
// ─────────────────────────────────────────────
function drawChart1(data, typeColors) {

    // Count how many pokemon belong to each Type_1 using d3.nest()
    // .key() groups by type, .rollup() counts entries per group
    const typeCounts = d3.nest()
        .key(function(d) { return d.Type_1; })
        .rollup(function(v) { return v.length; })
        .entries(data)
        .sort(function(a, b) { return b.value - a.value; }); // sort largest to smallest

    // Select the SVG inside #chart1 and measure its container for sizing
    const svg = d3.select("#chart1 svg");
    const bounds = document.getElementById("chart1").getBoundingClientRect();

    // Margins create space around the chart for axes and labels
    const margin = { top: 20, right: 30, bottom: 60, left: 60 };
    const width  = bounds.width  - margin.left - margin.right;
    const height = bounds.height - margin.top  - margin.bottom;

    // Create a group element offset by margins so axes have room to render
    const g = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // X scale: scaleBand maps type names to evenly spaced horizontal positions
    const x = d3.scaleBand()
        .domain(typeCounts.map(function(d) { return d.key; }))
        .range([0, width])
        .padding(0.2);

    // Y scale: scaleLinear maps count values to vertical pixel positions
    // Multiply max by 1.1 to add headroom above the tallest bar
    const y = d3.scaleLinear()
        .domain([0, d3.max(typeCounts, function(d) { return d.value; }) * 1.1])
        .range([height, 0]);

    // Draw X axis at the bottom of the chart area
    g.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-35)")
        .attr("text-anchor", "end")
        .attr("dy", "0.5em");

    // Draw Y axis on the left side of the chart area
    g.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y).ticks(6));

    // X axis label describing what the axis represents
    g.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + 55)
        .attr("text-anchor", "middle")
        .text("Pokemon Type");

    // Y axis label rotated 90 degrees to read vertically
    g.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -45)
        .attr("text-anchor", "middle")
        .text("Number of Pokemon");

    // Chart title positioned above the plot area
    g.append("text")
        .attr("class", "chart-title")
        .attr("x", width / 2)
        .attr("y", -5)
        .attr("text-anchor", "middle")
        .text("Pokemon Count by Primary Type (Overview)");

    // Bind data to rect elements — one bar per pokemon type
    // Each bar is colored by typeColors to match the other charts
    // No separate legend needed — X axis tick labels already identify each type
    g.selectAll("rect")
        .data(typeCounts)
        .enter()
        .append("rect")
        .attr("x", function(d) { return x(d.key); })
        .attr("y", function(d) { return y(d.value); })
        .attr("width", x.bandwidth())
        .attr("height", function(d) { return height - y(d.value); })
        .attr("fill", function(d) { return typeColors[d.key] || "#aaa"; })
        .attr("rx", 3); // slightly rounded corners for aesthetics
}


// ─────────────────────────────────────────────
// CHART 2: Scatter plot - Attack vs Defense
// Colored by Type_1, dot size = Total stat
// This is the FOCUS chart
// Lets the user explore individual pokemon in detail
// ─────────────────────────────────────────────
function drawChart2(data, typeColors) {

    // Select the SVG inside #chart2 and measure its container
    const svg = d3.select("#chart2 svg");
    const bounds = document.getElementById("chart2").getBoundingClientRect();

    // Extra right margin creates space for the legend outside the plot area
    const margin = { top: 40, right: 160, bottom: 60, left: 60 };
    const width  = bounds.width  - margin.left - margin.right;
    const height = bounds.height - margin.top  - margin.bottom;

    // Create a group element offset by margins
    const g = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // X scale: maps Attack values to horizontal pixel positions
    const x = d3.scaleLinear()
        .domain([0, d3.max(data, function(d) { return d.Attack; })])
        .range([0, width])
        .nice();

    // Y scale: maps Defense values to vertical pixel positions
    const y = d3.scaleLinear()
        .domain([0, d3.max(data, function(d) { return d.Defense; })])
        .range([height, 0])
        .nice();

    // Radius scale: stronger pokemon (higher Total stat) appear as larger dots
    const r = d3.scaleLinear()
        .domain([d3.min(data, function(d) { return d.Total; }),
                 d3.max(data, function(d) { return d.Total; })])
        .range([2, 8]);

    // Draw X axis at the bottom
    g.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).ticks(6));

    // Draw Y axis on the left
    g.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y).ticks(6));

    // X axis label
    g.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + 45)
        .attr("text-anchor", "middle")
        .text("Attack");

    // Y axis label rotated to read vertically
    g.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -45)
        .attr("text-anchor", "middle")
        .text("Defense");

    // Chart title positioned above the plot area
    g.append("text")
        .attr("class", "chart-title")
        .attr("x", width / 2)
        .attr("y", -15)
        .attr("text-anchor", "middle")
        .text("Attack vs Defense (dot size = Total Stats)");

    // Bind data to circle elements — one dot per pokemon
    // Color encodes primary type, radius encodes total base stat sum
    g.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", function(d) { return x(d.Attack); })
        .attr("cy", function(d) { return y(d.Defense); })
        .attr("r",  function(d) { return r(d.Total); })
        .attr("fill", function(d) { return typeColors[d.Type_1] || "#aaa"; })
        .attr("opacity", 0.7); // partial transparency reveals overlapping dots

    // Legend placed outside the plot area to the right
    // Shows all 18 types in two columns to save vertical space
    const legendTypes = Object.keys(typeColors);
    const legend = g.append("g")
        .attr("transform", `translate(${width + 10}, 5)`);

    // Legend title
    legend.append("text")
        .attr("x", 0)
        .attr("y", -8)
        .attr("fill", "#aaa")
        .attr("font-size", "10px")
        .attr("font-family", "sans-serif")
        .text("Type");

    // Draw one colored square + label per type
    legendTypes.forEach(function(type, i) {
        const col = i < 9 ? 0 : 1;   // first 9 in left column, rest in right
        const row = i < 9 ? i : i - 9;

        // Colored square representing the type
        legend.append("rect")
            .attr("x", col * 75)
            .attr("y", row * 16)
            .attr("width", 10)
            .attr("height", 10)
            .attr("fill", typeColors[type]);

        // Text label next to the square
        legend.append("text")
            .attr("x", col * 75 + 14)
            .attr("y", row * 16 + 9)
            .attr("fill", "#ccc")
            .attr("font-size", "10px")
            .attr("font-family", "sans-serif")
            .text(type);
    });
}


// ─────────────────────────────────────────────
// CHART 3: Parallel Coordinates - 6 base stats
// Each line = one pokemon, colored by Type_1
// This is the ADVANCED + DETAIL chart
// Shows the full stat profile shape for every pokemon at once
// ─────────────────────────────────────────────
function drawChart3(data, typeColors) {

    // Select the SVG inside #chart3 and measure its container
    const svg = d3.select("#chart3 svg");
    const bounds = document.getElementById("chart3").getBoundingClientRect();

    // Extra right margin creates space for the legend outside the plot area
    const margin = { top: 40, right: 160, bottom: 40, left: 40 };
    const width  = bounds.width  - margin.left - margin.right;
    const height = bounds.height - margin.top  - margin.bottom;

    // Create a group element offset by margins
    const g = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // The 6 base stat columns to display as parallel vertical axes
    const statColumns = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];

    // Create one independent Y scale per stat column
    // Each scale maps 0 → that stat's max value → full chart height
    const yScales = {};
    statColumns.forEach(function(col) {
        yScales[col] = d3.scaleLinear()
            .domain([0, d3.max(data, function(d) { return d[col]; })])
            .range([height, 0]);
    });

    // X scale: scalePoint evenly spaces the 6 axis positions across the width
    const x = d3.scalePoint()
        .domain(statColumns)
        .range([0, width]);

    // Chart title positioned above the plot area
    g.append("text")
        .attr("class", "chart-title")
        .attr("x", width / 2)
        .attr("y", -15)
        .attr("text-anchor", "middle")
        .text("Base Stat Profiles by Type (Parallel Coordinates)");

    // Bind data to path elements — one polyline per pokemon
    // Each line connects that pokemon's value on each of the 6 stat axes
    g.selectAll("path")
        .data(data)
        .enter()
        .append("path")
        .attr("d", function(d) {
            // Build an array of [x, y] pixel coordinates for each stat axis
            // then pass to d3.line() to produce an SVG path string
            return d3.line()(statColumns.map(function(col) {
                return [x(col), yScales[col](d[col])];
            }));
        })
        .attr("fill", "none")
        .attr("stroke", function(d) { return typeColors[d.Type_1] || "#aaa"; })
        .attr("stroke-width", 0.8)
        .attr("opacity", 0.4); // low opacity prevents overplotting with 721 lines

    // Draw a vertical axis for each of the 6 stat columns
    statColumns.forEach(function(col) {
        // Append a group translated to the correct x position for this axis
        const axisG = g.append("g")
            .attr("class", "axis")
            .attr("transform", `translate(${x(col)}, 0)`)
            .call(d3.axisLeft(yScales[col]).ticks(3)
                .tickFormat(function(d) { return d === 0 ? "" : d; })); // hide 0 label to reduce clutter

        // Label each axis with the stat name, placed below the axis
        axisG.append("text")
            .attr("class", "axis-label")
            .attr("y", height + 20)
            .attr("text-anchor", "middle")
            .attr("fill", "#ccc")
            .text(col);
    });

    // Legend placed outside the plot area to the right
    // Shows all 18 types in two columns to save vertical space
    const legendTypes = Object.keys(typeColors);
    const legend = g.append("g")
        .attr("transform", `translate(${width + 10}, 5)`);

    // Legend title
    legend.append("text")
        .attr("x", 0)
        .attr("y", -8)
        .attr("fill", "#aaa")
        .attr("font-size", "10px")
        .attr("font-family", "sans-serif")
        .text("Type");

    // Draw one colored square + label per type
    legendTypes.forEach(function(type, i) {
        const col = i < 9 ? 0 : 1;   // first 9 in left column, rest in right
        const row = i < 9 ? i : i - 9;

        // Colored square representing the type
        legend.append("rect")
            .attr("x", col * 75)
            .attr("y", row * 16)
            .attr("width", 10)
            .attr("height", 10)
            .attr("fill", typeColors[type]);

        // Text label next to the square
        legend.append("text")
            .attr("x", col * 75 + 14)
            .attr("y", row * 16 + 9)
            .attr("fill", "#ccc")
            .attr("font-size", "10px")
            .attr("font-family", "sans-serif")
            .text(type);
    });
}