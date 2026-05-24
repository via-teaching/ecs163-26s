const width = window.innerWidth;
const height = window.innerHeight;

let heatmapLeft = 0, heatmapTop = 400;
let heatmapMargin = {top: 70, right: 30, bottom: 60, left: 80},
    heatmapWidth = width / 2 - heatmapMargin.left - heatmapMargin.right,
    heatmapHeight = height /2 - heatmapMargin.top - heatmapMargin.bottom;

let barLeft = width / 2, barTop = 0;
let barMargin = {top: 70, right: 80, bottom: 60, left: 30},
    barWidth = width / 2 - barMargin.left - barMargin.right,
    barHeight = height / 2 - barTop - barMargin.top - barMargin.bottom;

let parallelLeft = 0, parallelTop = height / 2;
let parallelMargin = {top: 70, right: 150, bottom: 80, left: 80};
    parallelWidth = width - parallelMargin.left - parallelMargin.right;
    parallelHeight = height / 2 - parallelMargin.top - parallelMargin.bottom;

const totalWidth = window.innerWidth;
const totalHeight = window.innerHeight;

// Define slots for each chart in different layouts
const slots = {
    largeRight: { x: totalWidth * 0.35, y: 0, w: totalWidth * 0.65, h: totalHeight },
    smallTopLeft: { x: 0, y: 0, w: totalWidth * 0.35, h: totalHeight / 2 },
    smallBottomLeft: { x: 0, y: totalHeight / 2, w: totalWidth * 0.35, h: totalHeight / 2 },
    
    // Your original default slots
    defaultHeatmap: { x: 0, y: 0, w: totalWidth / 2, h: totalHeight / 2 },
    defaultBar: { x: totalWidth / 2, y: 0, w: totalWidth / 2, h: totalHeight / 2 },
    defaultParallel: { x: 0, y: totalHeight / 2, w: totalWidth, h: totalHeight / 2 }
};

// Map which chart goes to which slot based on active view
const layouts = {
    default: { heatmap: slots.defaultHeatmap, bar: slots.defaultBar, parallel: slots.defaultParallel },
    heatmap: { heatmap: slots.largeRight, bar: slots.smallTopLeft, parallel: slots.smallBottomLeft },
    bar: { bar: slots.largeRight, heatmap: slots.smallTopLeft, parallel: slots.smallBottomLeft },
    parallel: { parallel: slots.largeRight, heatmap: slots.smallTopLeft, bar: slots.smallBottomLeft }
};

let currentState = "default";

// plots
d3.csv("pokemon.csv").then(rawData =>{
    console.log("rawData", rawData);

    rawData.forEach(function(d){
        d.Type_1 = d.Type_1;
        d.Type_2 = d.Type_2;
    });

    // Plot 1: heatmap of pokemon counts by generation and type
    const typeValues = [
        "Bug","Dark","Dragon","Electric","Fairy","Fighting",
        "Fire","Flying","Ghost","Grass","Ground","Ice",
        "Normal","Poison","Psychic","Rock","Steel","Water"
    ];

    const generationValues = ["1", "2", "3", "4", "5", "6"];

    // Process data for heatmap
    const heatmapData = [];
    rawData.forEach(curr_pokemon => {
        const pokemonTypes = [curr_pokemon.Type_1];
        if (curr_pokemon.Type_2 && curr_pokemon.Type_2 !== "") {
            pokemonTypes.push(curr_pokemon.Type_2);
        }

        pokemonTypes.forEach(type => { // Count each type separately
            const exist = heatmapData.find(h => h.generation === curr_pokemon.Generation && h.type === type);
            if (exist) {
                exist.count++;
            } else {
                heatmapData.push({
                    generation: curr_pokemon.Generation,
                    type: type,
                    count: 1
                });
            }
        });
    });

    generationValues.forEach(gen => { // ensure all generation-type combinations are represented
        typeValues.forEach(type => {
            if (!heatmapData.find(h => h.generation === gen && h.type === type)) { //if combination doesn't exist, count = 0
                heatmapData.push({
                    generation: gen,
                    type: type,
                    count: 0
                });
            }
        });
    });
    console.log("heatmapData", heatmapData);

    const svg = d3.select("svg");

    const g1 = svg.append("g")
                .attr("width", heatmapWidth + heatmapMargin.left + heatmapMargin.right)
                .attr("height", heatmapHeight + heatmapMargin.top + heatmapMargin.bottom)
                .attr("transform", `translate(${heatmapMargin.left}, ${heatmapMargin.top})`);

    // X label
    g1.append("text")
    .attr("class", "x-axis-label")
    .attr("x", heatmapWidth / 2)
    .attr("y", heatmapHeight + 50)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .text("Type");

    // Y label
    g1.append("text")
    .attr("class", "y-axis-label")
    .attr("x", -(heatmapHeight / 2))
    .attr("y", -50)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("Generation");

    // X ticks
    const xHeat = d3.scaleBand()
    .domain(typeValues)
    .range([0, heatmapWidth])
    .padding(0.05);

    // Y ticks
    const yHeat = d3.scaleBand()
    .domain(generationValues)
    .range([0, heatmapHeight])
    .padding(0.05);

    // Color scale
    const colorScale = d3.scaleLinear()
    .domain([0, d3.max(heatmapData, d => d.count)])
    .range(["white", "red"]);

    // X axis
    g1.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0, ${heatmapHeight})`)
    .call(d3.axisBottom(xHeat))
    .selectAll("text")
        .attr("y", "10")
        .attr("x", "-5")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-45)");

    // Y axis
    g1.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(yHeat));

    // Draw rectangles for chart
    g1.selectAll("rect")
    .data(heatmapData)
    .enter()
    .append("rect")
    .attr("x", d => xHeat(d.type))
    .attr("y", d => yHeat(d.generation))
    .attr("width", xHeat.bandwidth())
    .attr("height", yHeat.bandwidth())
    .attr("fill", d => colorScale(d.count));

    // Add count for each rectangle
    g1.selectAll("text.heatmap-count")
    .data(heatmapData)
    .enter()
    .append("text")
    .attr("class", "heatmap-count")
    .attr("x", d => xHeat(d.type) + xHeat.bandwidth() / 2)
    .attr("y", d => yHeat(d.generation) + yHeat.bandwidth() / 2)
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .attr("font-size", "16px")
    .text(d => d.count);

    // Title
    g1.append("text")
    .attr("x", heatmapWidth / 2)
    .attr("y", -heatmapMargin.top / 2)
    .attr("text-anchor", "middle")
    .attr("font-size", "22px")
    .attr("font-weight", "bold")
    .text("Pokemon Count by Type per Generation")
    .attr("class", "chart-title")
    .style("cursor", "pointer")
    .on("click", () => {
        currentState = currentState === "heatmap" ? "default" : "heatmap"; 
        updateLayout(currentState);
    });

    // plot 2: bar chart of total pokemon per generation
    const barData = generationValues.map(gen => ({ // process data to get total count of pokemon in each generation
        type: `Generation ${gen}`,
        count: rawData.filter(d => d.Generation === gen).length
    }));
    console.log("barData", barData);

    const g2 = svg.append("g")
                .attr("width", barWidth + barMargin.left + barMargin.right)
                .attr("height", barHeight + barMargin.top + barMargin.bottom)
                .attr("transform", `translate(${totalWidth / 2 + barMargin.left}, ${heatmapMargin.top})`);

    // X label
    g2.append("text")
    .attr("class", "x-axis-label")
    .attr("x", barWidth / 2)
    .attr("y", barHeight + 50)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .text("Generation");

    // Y label
    
    g2.append("text")
    .attr("class", "y-axis-label")
    .attr("x", -(barHeight / 2))
    .attr("y", -40)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("Number of Pokemon");

    // X ticks
    const xBar = d3.scaleBand()
    .domain(barData.map(d => d.type))
    .range([0, barWidth])
    .paddingInner(0.3)
    .paddingOuter(0.2);

    // Y ticks
    const yBar = d3.scaleLinear()
    .domain([0, d3.max(barData, gen => gen.count)])
    .range([barHeight, 0])
    .nice();

    // X axis
    g2.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0, ${barHeight})`)
    .call(d3.axisBottom(xBar));

    // Y axis
    g2.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(yBar));

    // Draw bars
    g2.selectAll("rect")
    .data(barData)
    .enter()
    .append("rect")
    .attr("y", d => yBar(d.count))
    .attr("x", d => xBar(d.type))
    .attr("width", xBar.bandwidth())
    .attr("height", d => barHeight - yBar(d.count))
    .attr("fill", "darkred");

    // Title
    g2.append("text")
    .attr("x", barWidth / 2)
    .attr("y", -barMargin.top / 2)
    .attr("text-anchor", "middle")
    .attr("font-size", "20px")
    .attr("font-weight", "bold")
    .text("Total Pokemon by Generation")
    .attr("class", "chart-title")
    .style("cursor", "pointer")
    .on("click", () => {
        currentState = currentState === "bar" ? "default" : "bar"; 
        updateLayout(currentState);
    });

    // Plot 3: parallel coordinates of pokemon type by generation
    const typeColor = { //change type to color provided by pokemon wiki
        Fire: "#E62829",
        Water: "#2980EF",
        Grass: "#3FA129",
        Electric: "#FAC000",
        Psychic: "#EF4179",
        Ice: "#3DCEF3",
        Dragon: "#7038F8",
        Dark: "#624D4E",
        Fairy: "#EF70EF",
        Fighting: "#FF8000",
        Poison: "#9141CB",
        Ground: "#915121",
        Flying: "#81B9EF",
        Bug: "#91A119",
        Rock: "#AFA981",
        Ghost: "#704170",
        Steel: "#60A1B8",
        Normal: "#9FA19F"
    };

    //Process data for parallel coordinates to get count of each type in each generation
    const parallelData = typeValues.map(type => ({ 
        type,
        count: generationValues.map(gen => rawData.filter(d => d.Generation === gen && (d.Type_1 === type || d.Type_2 === type)).length)
    }));
    console.log("parallelData", parallelData);

    const g3 = svg.append("g")
    .attr("width", parallelWidth + parallelMargin.left + parallelMargin.right)
    .attr("height", parallelHeight + parallelMargin.top + parallelMargin.bottom)
    .attr("transform", `translate(${parallelMargin.left}, ${height / 2 + parallelMargin.top})`);

    // Y ticks
    const yPara = d3.scaleLinear()
        .domain([0, d3.max(parallelData, d => d3.max(d.count))])
        .range([parallelHeight, 0])

    // X ticks
    const xPara = d3.scalePoint()
        .range([0, parallelWidth])
        .padding(0.5)
        .domain(generationValues);

    // X label
    g3.append("text")
        .attr("class", "x-axis-label")
        .attr("x", parallelWidth / 2)
        .attr("y", parallelHeight + 50)
        .attr("font-size", "20px")
        .attr("text-anchor", "middle")
        .text("Generation");
    
    // Y label
    g3.append("text")
        .attr("class", "y-axis-label")
        .attr("x", -(parallelHeight / 2))
        .attr("y", -40)
        .attr("font-size", "20px")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text("Number of Pokemon");

    // Generate lines for parallel coordinates
    const line = d3.line()
        .x((d, i) => xPara(generationValues[i]))
        .y(d => yPara(d));

    // Draw lines for each type
    g3.selectAll(".parallel-line")
        .data(parallelData)
        .enter()
        .append("path")
        .attr("class", "parallel-line")
        .attr("d", d => line(d.count))
        .attr("fill", "none")
        .attr("stroke", d => typeColor[d.type])
        .attr("stroke-width", 2)
        .attr("opacity", 0.8);

    // Draw axes for generations
    const axisGroup = g3.selectAll(".axis")
        .data(generationValues)
        .enter().append("g")
        .attr("class", "axis")
        .attr("transform", d => `translate(${xPara(d)},0)`);

    // Add Y ticks to each generation axis
    axisGroup.append("g")
        .call(d3.axisLeft(yPara).ticks(5));

    // Add generation labels to each axis
    axisGroup.append("text")
        .attr("y", parallelHeight + 35)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .text(d => d);

    // Create legend group for types
    const legend = g3.append("g")
        .attr("transform", `translate(${parallelWidth + 20}, 0)`);

    const legendSelection = new Set(); // Track selected types for legend filtering

    // Add legend items for each type
    const legendItems = legend.selectAll(".legend-item")
        .data(typeValues)
        .enter().append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 18})`)
        .style("cursor", "pointer")
        .on("click", function(type) {
            if (legendSelection.has(type)) {
                legendSelection.clear();
            } else {
                legendSelection.clear();
                legendSelection.add(type);
            }
            updateLegend();
        })
        .on("mouseenter", function() {
            d3.select(this).transition()
                .duration(150)
                .attr("opacity", 0.8);
        })
        .on("mouseleave", function() {
            d3.select(this).transition()
                .duration(150)
                .attr("opacity", legendSelection.size === 0 || legendSelection.has(d3.select(this).datum()) ? 1 : 0.2);
        });

    // Add colored rectangles and text for each legend item
    legendItems.append("rect")
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", d => typeColor[d]);
    legendItems.append("text")
        .attr("x", 18)
        .attr("y", 10)
        .attr("font-size", "11px")
        .text(d => d);
    
    // Update PC legend and lines based on selection
    function updateLegend() {
        const selectedCount = legendSelection.size;

        legendItems.transition()
            .duration(300)
            .attr("opacity", d => selectedCount === 0 || legendSelection.has(d) ? 1 : 0.2);

        g3.selectAll(".parallel-line").transition()
            .duration(300)
            .attr("opacity", d => selectedCount === 0 || legendSelection.has(d.type) ? 0.8 : 0.15);
    }

    // Title
    g3.append("text")
        .attr("x", parallelWidth / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .attr("font-size", "20px")
        .attr("font-weight", "bold")
        .text("Pokemon Type Count Across Generations")
        .attr("class", "chart-title")
        .style("cursor", "pointer")
        .on("click", () => {
            currentState = currentState === "parallel" ? "default" : "parallel"; 
            updateLayout(currentState);
        });

    // Function to update all layouts based on the current state
    function updateLayout(state) {
        const layout = layouts[state];
        updateBarChart(layout.bar);
        updateHeatmap(layout.heatmap);
        updateParallel(layout.parallel);
    }

    function updateHeatmap(box) {
        const duration = 750;
        const newWidth = box.w - heatmapMargin.left - heatmapMargin.right;
        const newHeight = box.h - heatmapMargin.top - heatmapMargin.bottom;

        // Update scales
        xHeat.range([0, newWidth]);
        yHeat.range([0, newHeight]);

        // Move container
        g1.transition().duration(duration)
            .attr("transform", `translate(${box.x + heatmapMargin.left}, ${box.y + heatmapMargin.top})`);

        // Replace axes (clear and redraw to avoid selecting ambiguous nodes)
        g1.selectAll(".x-axis").remove();
        g1.selectAll(".y-axis").remove();

        // Redraw axes with updated scales
        g1.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0, ${newHeight})`)
            .call(d3.axisBottom(xHeat))
            .selectAll("text")
                .attr("y", "10")
                .attr("x", "-5")
                .attr("text-anchor", "end")
                .attr("transform", "rotate(-45)");
        g1.append("g")
            .attr("class", "y-axis")
            .call(d3.axisLeft(yHeat));

        // Update rectangles
        g1.selectAll("rect").transition().duration(duration)
            .attr("x", d => xHeat(d.type))
            .attr("y", d => yHeat(d.generation))
            .attr("width", xHeat.bandwidth())
            .attr("height", yHeat.bandwidth());

        // Update counts
        g1.selectAll("text.heatmap-count").transition().duration(duration)
            .attr("x", d => xHeat(d.type) + xHeat.bandwidth() / 2)
            .attr("y", d => yHeat(d.generation) + yHeat.bandwidth() / 2);

        // Update title
        g1.select(".chart-title").transition().duration(duration)
            .attr("x", newWidth / 2);

        // Update Axis Labels
        g1.select(".x-axis-label").transition().duration(duration)
            .attr("x", newWidth / 2)
            .attr("y", newHeight + 50);
        g1.select(".y-axis-label").transition().duration(duration)
            .attr("x", -(newHeight / 2))
            .attr("y", -40);
    }

    function updateBarChart(box) {
        const duration = 750;
        const newWidth = box.w - barMargin.left - barMargin.right;
        const newHeight = box.h - barMargin.top - barMargin.bottom;

        // Update Scale Ranges
        xBar.range([0, newWidth]);
        yBar.range([newHeight, 0]);

        // Move container
        g2.transition().duration(duration)
        .attr("transform", `translate(${box.x + barMargin.left}, ${box.y + barMargin.top})`);

        // Update Axes
        g2.select(".x-axis").transition().duration(duration)
            .attr("transform", `translate(0, ${newHeight})`)
            .call(d3.axisBottom(xBar));
        g2.select(".y-axis").transition().duration(duration)
            .call(d3.axisLeft(yBar));

        // Update bars
        g2.selectAll("rect").transition().duration(duration)
            .attr("x", d => xBar(d.type))
            .attr("width", xBar.bandwidth())
            .attr("y", d => yBar(d.count))
            .attr("height", d => newHeight - yBar(d.count));

        // Update title
        g2.select(".chart-title").transition().duration(duration)
            .attr("x", newWidth / 2);

        // Update Axis Labels
        g2.select(".x-axis-label").transition().duration(duration)
            .attr("x", newWidth / 2)
            .attr("y", newHeight + 50);
        g2.select(".y-axis-label").transition().duration(duration)
            .attr("x", -(newHeight / 2))
            .attr("y", -40);
    }

    function updateParallel(box) {
        const duration = 750;
        const newWidth = box.w - parallelMargin.left - parallelMargin.right;
        const newHeight = box.h - parallelMargin.top - parallelMargin.bottom;

        // Update scales
        xPara.range([0, newWidth]);
        yPara.range([newHeight, 0]);

        // Move container
        g3.transition().duration(duration)
            .attr("transform", `translate(${box.x + parallelMargin.left}, ${box.y + parallelMargin.top})`);

        // Update lines
        g3.selectAll(".parallel-line").transition().duration(duration)
            .attr("d", d => line(d.count));

        // Update axis positions
        g3.selectAll(".axis").transition().duration(duration)
            .attr("transform", d => `translate(${xPara(d)},0)`)
            .call(d3.axisLeft(yPara).ticks(5));

        // Update generation labels position
        g3.selectAll(".axis text").transition().duration(duration)
            .attr("y", newHeight + 35);

        // Update legend position
        legend.transition().duration(duration)
            .attr("transform", `translate(${newWidth + 20}, 0)`);

        // Update title
        g3.select(".chart-title").transition().duration(duration)
            .attr("x", newWidth / 2);

        // Update Axis Labels
        g3.select(".x-axis-label").transition().duration(duration)
            .attr("x", newWidth / 2)
            .attr("y", newHeight + 50);
        g3.select(".y-axis-label").transition().duration(duration)
            .attr("x", -(newHeight / 2))
            .attr("y", -40);
    }

}).catch(function(error){
    console.log(error);
});