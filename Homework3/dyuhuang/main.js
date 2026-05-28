/*
 * AI usage:
 *   I used AI as a learning and debugging tool while working on this dashboard.
 *   It helped me better understand D3 v5 brushing, linked views, animated
 *   transitions, and how to write clearer explanatory comments. I reviewed the
 *   suggestions carefully and modified the code to fit my Pokemon dataset,
 *   dashboard layout, and focus + context design.
 */

let selectedType = null;

let brushSelection = null;

const width = Math.max(window.innerWidth, 950);
const height = Math.max(window.innerHeight, 680);

// Layout values for the upper-left scatter plot.
let scatterTop = 70;
let scatterMargin = {top: 70, right: 35, bottom: 55, left: 65},
    scatterWidth = width / 2 - scatterMargin.left - scatterMargin.right,
    scatterHeight = height * 0.53 - scatterMargin.top - scatterMargin.bottom;

// Layout values for the upper-right parallel coordinates plot.
let distrLeft = width / 2;
let distrTop = 70;
let distrMargin = {top: 70, right: 50, bottom: 50, left: 65},
    distrWidth = width / 2 - distrMargin.left - distrMargin.right,
    distrHeight = height * 0.53 - distrMargin.top - distrMargin.bottom;

// Layout values for the bottom overview bar chart.
let teamTop = height * 0.63;
let teamMargin = {top: 45, right: 35, bottom: 78, left: 65},
    teamWidth = width - teamMargin.left - teamMargin.right,
    teamHeight = height * 0.37 - teamMargin.top - teamMargin.bottom;

// Load the Pokemon CSV file and draw the dashboard after the data is ready.
d3.csv("pokemon_alopez247.csv").then(rawData => {
    console.log("rawData", rawData);

    // Convert the numeric CSV fields from strings into numbers for scale calculations.
    rawData.forEach(function(d, i) {
        d.uid = i;
        d.HP = Number(d.HP);
        d.Attack = Number(d.Attack);
        d.Defense = Number(d.Defense);
        d.Sp_Atk = Number(d.Sp_Atk);
        d.Sp_Def = Number(d.Sp_Def);
        d.Speed = Number(d.Speed);
    });

    // Keep only rows that have the fields used by all three visualizations.
    const processedData = rawData.filter(d =>
        d.Type_1 &&
        !isNaN(d.HP) &&
        !isNaN(d.Attack) &&
        !isNaN(d.Defense) &&
        !isNaN(d.Sp_Atk) &&
        !isNaN(d.Sp_Def) &&
        !isNaN(d.Speed)
    );

    // Get the unique Pokemon primary types for the color scale and bar chart.
    const types = Array.from(new Set(processedData.map(d => d.Type_1))).sort();

    // Use one consistent color scale for Pokemon type across all three views.
    const typeColor = d3.scaleOrdinal()
        .domain(types)
        .range(d3.schemeCategory10.concat(d3.schemeSet3));

    console.log("processedData", processedData);

    // Select the main SVG and set an explicit viewBox so the layout stays stable.
    const svg = d3.select("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`);

    // Add the main dashboard title.
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 22)
        .attr("text-anchor", "middle")
        .attr("font-size", "20px")
        .attr("font-weight", "bold")
        .text("Pokemon Battle Stats Dashboard");

    // Add a short subtitle explaining the exploration theme.
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 42)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("fill", "gray")
        .text("Explore type distribution, attack-defense balance, and six-stat performance patterns through linked views.");

    // Add a design note that explains the focus + context structure for the grader.
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 59)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("fill", "gray")
        .text("Focus + context: the bottom bar chart is the overview; the two upper charts are focus views updated by bar selection and scatter brushing.");

    // Add a status line that updates when the user filters or brushes the data.
    const statusText = svg.append("text")
        .attr("x", width / 2)
        .attr("y", height - 8)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("fill", "gray");

    // Create the scatter plot group.
    const g1 = svg.append("g")
        .attr("class", "scatter-view")
        .attr("transform", `translate(${scatterMargin.left}, ${scatterTop + scatterMargin.top})`);

    // Add the scatter plot title.
    g1.append("text")
        .attr("x", scatterWidth / 2)
        .attr("y", -36)
        .attr("text-anchor", "middle")
        .attr("font-weight", "bold")
        .text("Focus View 1: Attack vs Defense");

    // Add a hint for the brushing interaction.
    g1.append("text")
        .attr("x", scatterWidth / 2)
        .attr("y", -18)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("fill", "gray")
        .text("Brush this plot to isolate a subset. Click or drag empty space to clear the brush.");

    // Add the x-axis label for the scatter plot.
    g1.append("text")
        .attr("x", scatterWidth / 2)
        .attr("y", scatterHeight + 47)
        .attr("font-size", "14px")
        .attr("text-anchor", "middle")
        .text("Attack");

    // Add the y-axis label for the scatter plot.
    g1.append("text")
        .attr("x", -(scatterHeight / 2))
        .attr("y", -45)
        .attr("font-size", "14px")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text("Defense");

    // X scale maps Attack values to horizontal pixel positions.
    const x1 = d3.scaleLinear()
        .domain([0, d3.max(processedData, d => d.Attack)])
        .range([0, scatterWidth])
        .nice();

    // Y scale maps Defense values to vertical pixel positions.
    const y1 = d3.scaleLinear()
        .domain([0, d3.max(processedData, d => d.Defense)])
        .range([scatterHeight, 0])
        .nice();

    // Draw the scatter plot x-axis.
    g1.append("g")
        .attr("class", "scatter-x-axis")
        .attr("transform", `translate(0, ${scatterHeight})`)
        .call(d3.axisBottom(x1).ticks(7));

    // Draw the scatter plot y-axis.
    g1.append("g")
        .attr("class", "scatter-y-axis")
        .call(d3.axisLeft(y1).ticks(8));

    // Add a compact legend showing the color used for each Pokemon type.
    const legend = g1.selectAll(".legend")
        .data(types)
        .enter()
        .append("g")
        .attr("class", "legend")
        .attr("transform", function(d, i) {
            const col = Math.floor(i / 9);
            const row = i % 9;
            return `translate(${scatterWidth - 115 + col * 60}, ${row * 14})`;
        });

    // Add the colored square for each legend item.
    legend.append("rect")
        .attr("width", 10)
        .attr("height", 10)
        .attr("fill", d => typeColor(d));

    // Add the type name beside each legend square.
    legend.append("text")
        .attr("x", 14)
        .attr("y", 9)
        .style("font-size", "10px")
        .text(d => d);

    // Create a layer for scatter plot circles.
    const pointLayer = g1.append("g")
        .attr("class", "point-layer");

    // Create a layer for the brush rectangle above the scatter plot points.
    const brushLayer = g1.append("g")
        .attr("class", "scatter-brush");

    // Create the parallel coordinates group.
    const g2 = svg.append("g")
        .attr("class", "parallel-view")
        .attr("transform", `translate(${distrLeft + distrMargin.left}, ${distrTop + distrMargin.top})`);

    // Add the parallel coordinates title.
    g2.append("text")
        .attr("x", distrWidth / 2)
        .attr("y", -36)
        .attr("text-anchor", "middle")
        .attr("font-weight", "bold")
        .text("Focus View 2 (Advanced): Six Stats Parallel Coordinates");

    // Add a hint explaining how this focus view updates.
    g2.append("text")
        .attr("x", distrWidth / 2)
        .attr("y", -18)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("fill", "gray")
        .text("This view updates from the selected type below or from the brushed points on the left.");

    // These are the six stat dimensions shown in the advanced visualization.
    const dimensions = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];

    // Create one vertical scale for each stat dimension.
    const yScales = {};
    dimensions.forEach(function(dim) {
        yScales[dim] = d3.scaleLinear()
            .domain(d3.extent(processedData, d => d[dim]))
            .range([distrHeight, 0])
            .nice();
    });

    // X scale positions the six parallel-coordinate axes evenly.
    const xParallel = d3.scalePoint()
        .domain(dimensions)
        .range([0, distrWidth])
        .padding(0.5);

    // Build the polyline path for one Pokemon across all six stat axes.
    function parallelPath(d) {
        return d3.line()(dimensions.map(function(dim) {
            return [xParallel(dim), yScales[dim](d[dim])];
        }));
    }

    // Create one axis group for each stat dimension.
    const dimensionGroups = g2.selectAll(".dimension")
        .data(dimensions)
        .enter()
        .append("g")
        .attr("class", "dimension")
        .attr("transform", d => `translate(${xParallel(d)}, 0)`);

    // Draw tick marks for each parallel coordinate axis.
    dimensionGroups.each(function(d) {
        d3.select(this).call(d3.axisLeft(yScales[d]).ticks(4));
    });

    // Add the stat name above each parallel coordinate axis.
    dimensionGroups.append("text")
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .attr("fill", "black")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .text(d => d);

    // Create a layer for the parallel coordinate lines.
    const parallelLayer = g2.append("g")
        .attr("class", "parallel-line-layer");

    // Count how many Pokemon belong to each primary type.
    const typeCounts = {};
    processedData.forEach(function(d) {
        typeCounts[d.Type_1] = (typeCounts[d.Type_1] || 0) + 1;
    });

    // Convert the type count object into an array for D3's data join.
    const teamData = Object.keys(typeCounts).map(key => ({
        teamID: key,
        count: typeCounts[key]
    }));

    // Sort the overview bars from the largest type group to the smallest.
    teamData.sort((a, b) => b.count - a.count);

    // Create the bottom overview bar chart group.
    const g3 = svg.append("g")
        .attr("class", "overview-bar-view")
        .attr("transform", `translate(${teamMargin.left}, ${teamTop})`);

    // Add the overview chart title.
    g3.append("text")
        .attr("x", teamWidth / 2)
        .attr("y", -7)
        .attr("text-anchor", "middle")
        .attr("font-weight", "bold")
        .text("Overview: Number of Pokemon by Primary Type");

    // Add a hint for the bar selection interaction.
    g3.append("text")
        .attr("x", teamWidth / 2)
        .attr("y", 10)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("fill", "gray")
        .text("Click a type bar to filter both focus views. Click the same bar again to reset.");

    // Add the x-axis label for the overview bar chart.
    g3.append("text")
        .attr("x", teamWidth / 2)
        .attr("y", teamHeight + 60)
        .attr("font-size", "14px")
        .attr("text-anchor", "middle")
        .text("Primary Type");

    // Add the y-axis label for the overview bar chart.
    g3.append("text")
        .attr("x", -(teamHeight / 2))
        .attr("y", -45)
        .attr("font-size", "14px")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text("Number of Pokemon");

    // X scale places each Pokemon type bar.
    const x2 = d3.scaleBand()
        .domain(teamData.map(d => d.teamID))
        .range([0, teamWidth])
        .paddingInner(0.3)
        .paddingOuter(0.2);

    // Y scale maps type counts to bar heights.
    const y2 = d3.scaleLinear()
        .domain([0, d3.max(teamData, d => d.count)])
        .range([teamHeight, 0])
        .nice();

    // Draw the overview chart x-axis and rotate labels to avoid overlap.
    g3.append("g")
        .attr("class", "bar-x-axis")
        .attr("transform", `translate(0, ${teamHeight})`)
        .call(d3.axisBottom(x2))
        .selectAll("text")
        .attr("y", 10)
        .attr("x", -5)
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-40)");

    // Draw the overview chart y-axis.
    g3.append("g")
        .attr("class", "bar-y-axis")
        .call(d3.axisLeft(y2).ticks(6));

    // Define the scatter brush interaction for selecting points by dragging a rectangle.
    const scatterBrush = d3.brush()
        .extent([[0, 0], [scatterWidth, scatterHeight]])
        .on("brush end", function() {
            brushSelection = d3.event.selection;
            updateDashboard();
        });

    // Attach the brush to the scatter plot brush layer.
    brushLayer.call(scatterBrush);

    // Create one bar for each Pokemon type and animate the bars from zero height.
    const barSelection = g3.selectAll("rect.type-bar")
        .data(teamData)
        .enter()
        .append("rect")
        .attr("class", "type-bar")
        .attr("x", d => x2(d.teamID))
        .attr("y", teamHeight)
        .attr("width", x2.bandwidth())
        .attr("height", 0)
        .attr("fill", d => typeColor(d.teamID))
        .style("cursor", "pointer")
        .on("click", function(d) {
            // Clicking a bar selects that Pokemon type; clicking it again clears the filter.
            selectedType = selectedType === d.teamID ? null : d.teamID;

            // Clear the scatter brush when the type filter changes so the state is easy to understand.
            brushSelection = null;
            brushLayer.call(scatterBrush.move, null);

            // Redraw all linked views using the new type selection.
            updateDashboard();
        });

    // Animated transition: grow the overview bars from the x-axis to their final heights.
    barSelection.transition("bar-grow")
    .duration(800)
    .attr("y", d => y2(d.count))
    .attr("height", d => teamHeight - y2(d.count));

    // Add numeric count labels above each type bar.
    const barLabels = g3.selectAll("text.bar-label")
        .data(teamData)
        .enter()
        .append("text")
        .attr("class", "bar-label")
        .attr("x", d => x2(d.teamID) + x2.bandwidth() / 2)
        .attr("y", d => y2(d.count) - 4)
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("opacity", 0)
        .text(d => d.count);

    // Animated transition: fade in the count labels after the bars grow.
    barLabels.transition("label-fade")
    .delay(550)
    .duration(400)
    .attr("opacity", 1);

    // Return data after the overview type filter is applied.
    function getTypeFilteredData() {
        if (selectedType === null) {
            return processedData;
        }
        return processedData.filter(d => d.Type_1 === selectedType);
    }

    // Check whether a Pokemon is inside the current scatter brush rectangle.
    function isInsideBrush(d) {
        if (brushSelection === null) {
            return true;
        }

        const x = x1(d.Attack);
        const y = y1(d.Defense);
        const x0 = brushSelection[0][0];
        const y0 = brushSelection[0][1];
        const x1Brush = brushSelection[1][0];
        const y1Brush = brushSelection[1][1];

        return x0 <= x && x <= x1Brush && y0 <= y && y <= y1Brush;
    }

    // Return data after both the type filter and scatter brush are applied.
    function getFocusData() {
        const typeData = getTypeFilteredData();
        if (brushSelection === null) {
            return typeData;
        }
        return typeData.filter(isInsideBrush);
    }

    // Draw or update scatter points with enter/update/exit transitions.
    function drawScatter() {
        const typeData = getTypeFilteredData();
        const focusData = getFocusData();
        const focusIds = new Set(focusData.map(d => d.uid));

        const points = pointLayer.selectAll("circle.pokemon-point")
            .data(typeData, d => d.uid);

        // Animate old points out when they leave the current type filter.
        points.exit()
            .transition()
            .duration(350)
            .attr("r", 0)
            .attr("opacity", 0)
            .remove();

        // Add new circles for Pokemon entering the current type filter.
        const pointsEnter = points.enter()
            .append("circle")
            .attr("class", "pokemon-point")
            .attr("cx", d => x1(d.Attack))
            .attr("cy", d => y1(d.Defense))
            .attr("r", 0)
            .attr("fill", d => typeColor(d.Type_1))
            .attr("stroke", "white")
            .attr("stroke-width", 0.5)
            .attr("opacity", 0);

        // Animate all visible points to their current positions and brush-highlighted opacity.
        pointsEnter.merge(points)
            .transition()
            .duration(450)
            .attr("cx", d => x1(d.Attack))
            .attr("cy", d => y1(d.Defense))
            .attr("r", d => brushSelection === null || focusIds.has(d.uid) ? 5 : 3)
            .attr("fill", d => typeColor(d.Type_1))
            .attr("opacity", d => brushSelection === null || focusIds.has(d.uid) ? 0.78 : 0.12);
    }

    // Draw or update parallel coordinate lines with animated fade transitions.
    function drawParallel() {
        const focusData = getFocusData();

        const lines = parallelLayer.selectAll("path.pokemon-line")
            .data(focusData, d => d.uid);

        // Fade old lines out when the filtered or brushed subset changes.
        lines.exit()
            .transition()
            .duration(300)
            .attr("opacity", 0)
            .remove();

        // Add new lines for Pokemon entering the focus subset.
        const linesEnter = lines.enter()
            .append("path")
            .attr("class", "pokemon-line")
            .attr("d", parallelPath)
            .attr("fill", "none")
            .attr("stroke", d => typeColor(d.Type_1))
            .attr("stroke-width", 0.8)
            .attr("opacity", 0);

        // Fade in and update all current lines.
        linesEnter.merge(lines)
            .transition()
            .duration(500)
            .attr("d", parallelPath)
            .attr("stroke", d => typeColor(d.Type_1))
            .attr("opacity", 0.28);
    }

    // Update bar opacity to show which Pokemon type is currently selected.
 function updateBars() {
    barSelection.transition("bar-opacity")
        .duration(350)
        .attr("opacity", function(d) {
            if (selectedType === null) return 1;
            return d.teamID === selectedType ? 1 : 0.25;
        });
}

    // Update the bottom status line so users know how many Pokemon are currently shown.
    function updateStatusText() {
        const typeData = getTypeFilteredData();
        const focusData = getFocusData();
        const typePart = selectedType === null ? "all primary types" : `primary type = ${selectedType}`;
        const brushPart = brushSelection === null ? "no scatter brush" : "scatter brush active";

        statusText.text(`Showing ${focusData.length} Pokemon in focus views out of ${typeData.length} after ${typePart}; ${brushPart}.`);
    }

    // Redraw every linked view after selection or brushing changes.
    function updateDashboard() {
        drawScatter();
        drawParallel();
        updateBars();
        updateStatusText();
    }

    // Initial draw of all linked views.
    updateDashboard();

}).catch(function(error) {
    console.log(error);
});
