// AI DISCLAIMER: I made use of AI in figuring out how to implement
// selection, brushing, and animated transitions. Particularly, AI 
// helped explain how to track the selected data points and coordinate
// any updates across all views at once. 

const width = window.innerWidth;
const height = window.innerHeight;

// Top row is treemap + scatter
// Bottom row is parallel coordinates
const topRowH = height * 0.52;
const scatterPanelLeft = width * 0.52;
const gap = 12;


// Setting up margins and dimensions for the plots
let treeMargin = { top: 36, right: 128, bottom: 14, left: 32 },
    treeWidth = scatterPanelLeft - gap - treeMargin.left - treeMargin.right,
    treeHeight = topRowH - treeMargin.top - treeMargin.bottom;

let scatterMargin = { top: 36, right: 145, bottom: 14, left: 46 },
    scatterWidth = width - scatterPanelLeft - scatterMargin.left - scatterMargin.right,
    scatterHeight = topRowH - scatterMargin.top - scatterMargin.bottom;

let pcMargin = { top: 22, right: 32, bottom: 46, left: 40 };
let pcTop = topRowH + 6;
let pcWidth = width - pcMargin.left - pcMargin.right;
let pcHeight = height - pcTop - pcMargin.top - pcMargin.bottom;

// standard pokemon type colors
let typeColors = {
    Bug: "#A8B820",
    Dark: "#705848",
    Dragon: "#7038F8",
    Electric: "#F8D030",
    Fairy: "#EE99AC",
    Fighting: "#C03028",
    Fire: "#F08030",
    Flying: "#A890F0",
    Ghost: "#705898",
    Grass: "#78C850",
    Ground: "#E0C068",
    Ice: "#98D8D8",
    Normal: "#A8A878",
    Poison: "#A040A0",
    Psychic: "#F85888",
    Rock: "#B8A038",
    Steel: "#B8B8D0",
    Water: "#6890F0",
};

// Treemap showing the appearance of each type
// Each type is counted once per slot, counting both type1 and type2
d3.csv("pokemon.csv").then((rawData) => {
    console.log("rawData", rawData);
    // Converting the strings to numbers
    rawData.forEach(function (d) {
        d.HP = +d.HP;
        d.Attack = +d.Attack;
        d.Defense = +d.Defense;
        d.Sp_Atk = +d.Sp_Atk;
        d.Sp_Def = +d.Sp_Def;
        d.Speed = +d.Speed;
        d.Total = +d.Total;
        d.Number = +d.Number;
    });

        // Checking the current "state", as in which type is currently selected
        // and the IDs (Pokedex numbers) of the currently brushed points
        let activeType = null;
        let brushedIds = new Set();
        // Creating a copy of the raw data for filtering
        let filteredData = rawData.slice();

        // Counting the number of appearances of each type
        let typeCounts = {};
        rawData.forEach(function (d) {
            typeCounts[d.Type_1] = (typeCounts[d.Type_1] || 0) + 1;
            if (d.Type_2 != null && String(d.Type_2).trim() !== "") {
                typeCounts[d.Type_2] = (typeCounts[d.Type_2] || 0) + 1;
            }
        });
        let typeData = Object.keys(typeCounts).map(function (key) {
            return { name: key, value: typeCounts[key] };
        });

    // Creating the treemap
    let root = d3
        .hierarchy({ name: "Pokemon", children: typeData })
        .sum((d) => d.value)
        .sort((a, b) => b.value - a.value);

    d3.treemap()
        .tile(d3.treemapSquarify)
        .size([treeWidth, treeHeight])
        .paddingInner(1)
        .paddingOuter(2)(root);

    // Selecting the svg element
    const svg = d3.select("svg");

    // Creating the treemap (continued)
    const g1 = svg
        .append("g")
        .attr("transform", `translate(${treeMargin.left}, ${treeMargin.top})`);

    // Adding the title to the treemap
    svg.append("text")
        .attr("x", treeMargin.left + treeWidth / 2)
        .attr("y", 24)
        .attr("font-size", "18px")
        .attr("text-anchor", "middle")
        .text("Type Appearances");

    // Some info on how to use the filter
    svg.append("text")
        .attr("x", treeMargin.left + treeWidth / 2)
        .attr("y", 35)
        .attr("font-size", "10px")
        .attr("fill", "#555")
        .attr("text-anchor", "middle")
        .text("Click a type to filter, click again to clear");

    // One leaf per tile, one group per tile.
    let cells = g1.selectAll("g").data(root.leaves());

    let cell = cells
        .enter()
        .append("g")
        // Each tile group is a class
        .attr("class", "type-tile")
        // Positioning
        .attr("transform", (d) => `translate(${d.x0}, ${d.y0})`)
        .style("cursor", "pointer")
        // If the type clicked is the active type, remove it
        // Otherwise, set it as the active type
        .on("click", function (d) {
            if (activeType === d.data.name) {
                activeType = null;
            } else {
                activeType = d.data.name;
            }
            clearBrushSelection();
            updateAll();
        });

    // Treemap rectangles
    cell.append("rect")
        .attr("width", (d) => d.x1 - d.x0)
        .attr("height", (d) => d.y1 - d.y0)
        .attr("fill", (d) => typeColors[d.data.name] || "#999");

    // Adding the type names to the cells
    cell.append("text")
        .attr("x", 4)
        .attr("y", 18)
        .attr("font-size", "13px")
        .attr("fill", "white")
        .text((d) => {
            if (d.x1 - d.x0 < 55 || d.y1 - d.y0 < 30) return "";
            return d.data.name;
        });

    // Legend defining types and their total counts
    let legendX = treeMargin.left + treeWidth + 10;
    let legendY = treeMargin.top + 6;
    let sorted = typeData.slice().sort((a, b) => b.value - a.value);
    const legRowH = 17;

    sorted.forEach(function (d, i) {
        const ly = legendY + i * legRowH;
        svg.append("rect")
            .attr("x", legendX)
            .attr("y", ly)
            .attr("width", 11)
            .attr("height", 11)
            .attr("fill", typeColors[d.name] || "#999");
        svg.append("text")
            .attr("x", legendX + 16)
            .attr("y", ly + 13)
            .attr("font-size", "16px")
            .text(d.name + " (" + d.value + ")");
        svg.append("text")
            .attr("x", legendX)
            .attr("y", legendY - 5)
            .attr("font-size", "16px")
            .text("Legend");
    });
    
    // Scatter plot, Attack vs Defense, size Total
    const g2 = svg
        .append("g")
        .attr(
            "transform",
            `translate(${scatterPanelLeft + scatterMargin.left}, ${scatterMargin.top})`,
        );

    // Scatter plot title
    svg.append("text")
        .attr("x", scatterPanelLeft + scatterMargin.left + scatterWidth / 2)
        .attr("y", 24)
        .attr("font-size", "18px")
        .attr("text-anchor", "middle")
        .text("Base Attack vs Base Defense");

    // Scatter plot interaction info
    svg.append("text")
        .attr("x", scatterPanelLeft + scatterMargin.left + scatterWidth / 2)
        .attr("y", 47)
        .attr("font-size", "10px")
        .attr("fill", "#555")
        .attr("text-anchor", "middle")
        .text("Drag to select points");

    // Making it so the axes for the plot can change
    const xS = d3.scaleLinear().range([0, scatterWidth]);
    const yS = d3.scaleLinear().range([scatterHeight, 0]);
    const rS = d3
        .scaleSqrt()
        .domain(d3.extent(rawData, (d) => d.Total))
        .range([2.5, 9]);

    // X axis and Y axis groups for the scatter plot
    const xAxisG = g2.append("g").attr("transform", `translate(0, ${scatterHeight})`);
    const yAxisG = g2.append("g");

    // X axis label
    g2.append("text")
        .attr("x", scatterWidth / 2)
        .attr("y", scatterHeight + 40)
        .attr("font-size", "16px")
        .attr("text-anchor", "middle")
        .text("Attack");

    // Y axis label
    g2.append("text")
        .attr("x", -(scatterHeight / 2))
        .attr("y", -40)
        .attr("font-size", "16px")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text("Defense");

    // Subtitle to explain the point size
    g2.append("text")
        .attr("x", scatterWidth / 2)
        .attr("y", 0)
        .attr("font-size", "12px")
        .attr("text-anchor", "middle")
        .attr("fill", "#444")
        .text("Point size = Total base stats");

    // Layer for the scatter plot circles so they can get updated
    const pointsLayer = g2.append("g").attr("class", "points-layer");

    // Brush layer too
    const brushLayer = g2.append("g").attr("class", "brush-layer");

    // Parallel coordinates plot for the base stats
    const dimList = [
        { key: "HP", label: "HP" },
        { key: "Attack", label: "Attack" },
        { key: "Defense", label: "Defense" },
        { key: "Sp_Atk", label: "Sp. Atk" },
        { key: "Sp_Def", label: "Sp. Def" },
        { key: "Speed", label: "Speed" },
    ];

    const g3 = svg
        .append("g")
        .attr("transform", `translate(${pcMargin.left}, ${pcTop + pcMargin.top})`);

    // Add parallel coordinates title.
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", pcTop + 16)
        .attr("font-size", "18px")
        .attr("text-anchor", "middle")
        .text("Base Stats");

    // X scale
    const xPC = d3
        .scalePoint()
        .domain(dimList.map((d) => d.key))
        .range([0, pcWidth])
        .padding(0.55);

    // Changeable y scale
    const yPC = {};
    dimList.forEach(function (dim) {
        yPC[dim.key] = d3.scaleLinear().range([pcHeight, 0]);
    });

    // Add axis group for each parallel dimension
    const axisGroups = {};
    dimList.forEach(function (dim) {
        const x = xPC(dim.key);
        axisGroups[dim.key] = g3.append("g").attr("transform", `translate(${x}, 0)`);
    });

    // Bottom labels for each parallel dimension.
    dimList.forEach(function (dim) {
        g3.append("text")
            .attr("x", xPC(dim.key))
            .attr("y", pcHeight + 28)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .text(dim.label);
    });

    // Layer for the lines to be updated in
    const linesLayer = g3.append("g").attr("class", "lines-layer");

    // Function to check wether the type we just picked is part of the type filter
    function passesTypeFilter(d) {
        if (!activeType) return true;
        return d.Type_1 === activeType || d.Type_2 === activeType;
    }

    // Path for one pokemon row in the plot
    const linePC = d3
        .line()
        .x((pt) => pt[0])
        .y((pt) => pt[1]);
    function pathForRow(d) {
        const pts = dimList.map(function (dim) {
            return [xPC(dim.key), yPC[dim.key](d[dim.key])];
        });
        return linePC(pts);
    }

    // Function to reset the brush
    function clearBrushSelection() {
        brushedIds.clear();
        brushLayer.call(brush.move, null);
    }

    // Check if a brush exists
    function isBrushedActive() {
        return brushedIds.size > 0;
    }

    // Highlight the pokemon type that's selected
    function updateTreemapSelection() {
        const sel = g1.selectAll("g.type-tile").select("rect");
        sel.transition()
            .duration(300)
            .ease(d3.easeCubicInOut)
            .attr("stroke", (d) => (activeType === d.data.name ? "#111" : "none"))
            .attr("stroke-width", (d) => (activeType === d.data.name ? 3 : 0));
        
    }

    // Function to update the scatter plot
    function updateScatter() {
        // New data is all data that passes the type filter
        filteredData = rawData.filter(passesTypeFilter);
        const baseData = filteredData.length > 0 ? filteredData : rawData;

        // Update the axis range
        xS.domain(d3.extent(baseData, (d) => d.Attack)).nice();
        yS.domain(d3.extent(baseData, (d) => d.Defense)).nice();

        // Make the new axes
        const xAxis = d3.axisBottom(xS).ticks(8);
        const yAxis = d3.axisLeft(yS).ticks(8);

        // Actually update the axes w/ transition if animated
        xAxisG.transition().duration(550).ease(d3.easeCubicInOut).call(xAxis);
        yAxisG.transition().duration(550).ease(d3.easeCubicInOut).call(yAxis);
        

        // Binding points to pokemon ids
        const points = pointsLayer
            .selectAll("circle.scatter-point")
            .data(filteredData, (d) => d.Number);

        // Any points that got filtered out get removed
        points.exit()
            .transition()
            .duration(350)
            .attr("r", 0)
            .attr("fill-opacity", 0)
            .remove();

        // New points that need circles get created
        const pointsEnter = points
            .enter()
            .append("circle")
            .attr("class", "scatter-point")
            .attr("cx", (d) => xS(d.Attack))
            .attr("cy", (d) => yS(d.Defense))
            .attr("r", 0)
            .attr("fill", (d) => typeColors[d.Type_1] || "#999")
            .attr("stroke", "#222")
            .attr("stroke-width", 0.4);

        // Merging the new points with the current points
        pointsEnter
            .merge(points)
            .transition()
            .duration(450)
            .ease(d3.easeCubicInOut)
            .attr("cx", (d) => xS(d.Attack))
            .attr("cy", (d) => yS(d.Defense))
            .attr("r", (d) => rS(d.Total))
            .attr("fill-opacity", (d) => {
                if (!isBrushedActive()) return 0.68;
                return brushedIds.has(d.Number) ? 0.9 : 0.12;
            });
    }

    // Updating the parallel coordinates plot
    function updateParallel() {
        const baseData = filteredData.length > 0 ? filteredData : rawData;

        // Looping through each dimension to update them
        dimList.forEach(function (dim) {
            // Reset the scale
            yPC[dim.key].domain(d3.extent(baseData, (r) => r[dim.key])).nice();
            const axis = d3.axisLeft(yPC[dim.key]).ticks(4).tickSizeOuter(0);
            axisGroups[dim.key]
                .transition()
                .duration(550)
                .ease(d3.easeCubicInOut)
                .call(axis);
            axisGroups[dim.key].selectAll("text").attr("font-size", "9px");
        });

        // Each pokemon is one line
        const lines = linesLayer
            .selectAll("path.pokemon-line")
            .data(filteredData, (d) => d.Number);

        // Removing lines that got filtered out
        lines.exit()
            .transition()
            .duration(350)
            .attr("stroke-opacity", 0)
            .remove();

        // Adding lines that are new
        const linesEnter = lines
            .enter()
            .append("path")
            .attr("class", "pokemon-line")
            .attr("fill", "none")
            .attr("stroke", (d) => typeColors[d.Type_1] || "#999")
            .attr("stroke-width", 1)
            .attr("stroke-opacity", 0)
            .attr("d", pathForRow);

        // Actually adding the new lines to the existing lines
        linesEnter
            .merge(lines)
            .transition()
            .duration(450)
            .ease(d3.easeCubicInOut)
            .attr("d", pathForRow)
            .attr("stroke-width", (d) => (isBrushedActive() && brushedIds.has(d.Number) ? 2 : 1))
            .attr("stroke-opacity", (d) => {
                if (!isBrushedActive()) return 0.16;
                return brushedIds.has(d.Number) ? 0.85 : 0.05;
            });
        }

    // Run all the updates at once.
    function updateAll() {
        updateTreemapSelection();
        updateScatter();
        updateParallel();
    }

    // Brushing function for the scatter plot
    function brushed() {
        // Getting the current brush selection
        const s = d3.event.selection;
        // Clearing the old selection
        brushedIds.clear();
        if (s) {
            const x0 = s[0][0];
            const y0 = s[0][1];
            const x1 = s[1][0];
            const y1 = s[1][1];
            // If the point is in the rectange, then it's getting brushed
            filteredData.forEach(function (d) {
                const x = xS(d.Attack);
                const y = yS(d.Defense);
                if (x >= x0 && x <= x1 && y >= y0 && y <= y1) {
                    brushedIds.add(d.Number);
                }
            });
        }
        // Updating the other views
        updateScatter();
        updateParallel();
    }

    // Add the brush function to the scatterplot
    const brush = d3
        .brush()
        .extent([
            [0, 0],
            [scatterWidth, scatterHeight],
        ])
        .on("start brush end", brushed);
    brushLayer.call(brush);

    // Initial render
    updateAll();
})
.catch(function (error) {
    console.log(error);
});
