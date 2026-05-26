// chart/starChart.js

function drawStarChart(newData, genreCounts) {
    const svg = d3.select("svg");

    const categories = ["Anxiety", "Depression", "Insomnia", "OCD"];
    const maxValue = 10;
    const radarRadius = 34; 
    const angleSlice = (Math.PI * 2) / categories.length;
    
    const totalGenres = genreCounts.length;
    
    // set up the default chart spacing
    const defaultRow = Math.ceil(totalGenres / 2); 
    const defaultX = 150; 
    const defaultY = 150; 

    // selection mode spacing
    const selectionRow = 7; 
    const selectionX = 85; 
    const selectionY = 130; 

    const rScale = d3.scaleLinear().domain([0, maxValue]).range([0, radarRadius]);
    const radarLine = d3.lineRadial().radius(d => rScale(d.value)).angle((d, i) => i * angleSlice).curve(d3.curveLinearClosed);

    // standard view 
    const smallMultiplesG = svg.append("g")
        .attr("class", "small-multiples-group")
        .attr("transform", `translate(${teamMargin.left + 20}, ${teamTop + 50})`);

    genreCounts.forEach((genreObj, index) => {
        const genreName = genreObj.key;
        const genreData = newData.filter(d => d["Fav genre"] === genreName);

        // fix radardata
        let radarData = [];

        categories.forEach(cat => {
        radarData.push({
            axis: cat,
            value: d3.mean(genreData, d => +d[cat]) || 0
            });
        });

        const normRow = Math.floor(index / defaultRow);
        const normCol = index % defaultRow;
        const normX = normCol * defaultX;
        const normY = normRow * defaultY;

        const morphRow = Math.floor(index / selectionRow);
        const morphCol = index % selectionRow;
        const morphX = morphCol * selectionX;
        const morphY = morphRow * selectionY;

        // Container Cell Group
        const gInner = smallMultiplesG.append("g")
            .attr("class", "star-chart-container")
            .attr("transform", `translate(${normX}, ${normY})`)
            .datum({
                normX: normX, normY: normY,
                morphX: morphX, morphY: morphY,
                radarData: radarData,
                genreName: genreName
            });

        // Background concentric tracking circles (Maintained globally)
        const levels = 2;
        for (let j = 0; j < levels; j++) {
            gInner.append("circle")
                .attr("class", "grid-background-ring")
                .attr("r", radarRadius * ((j + 1) / levels))
                .attr("fill", "none")
                .attr("stroke", "#7b5f5f")
                .attr("stroke-width", "0.5px");
        }

        // add category labels on each side, disappears in selection
        categories.forEach((cat, i) => {
            const angle = angleSlice * i - Math.PI / 2;
            const x = (radarRadius + 3) * Math.cos(angle);
            const y = (radarRadius + 3) * Math.sin(angle);

            gInner.append("text")
                .attr("class", "grid-axis-text")
                .attr("x", x).attr("y", y)
                .attr("text-anchor", Math.abs(x) < 5 ? "middle" : (x > 0 ? "start" : "end"))
                .attr("dy", y > 5 ? "0.8em" : (y < -5 ? "0em" : "0.35em"))
                .style("font-size", "9px")
                .style("fill", "#666")
                .text(cat);
        });

        // Add genre titles and reset keys
        const labelG = gInner.append("g")
            .attr("class", "footer-label-group")
            .attr("transform", `translate(0, ${radarRadius + 25})`);

        const genreTextNode = labelG.append("text")
            .attr("text-anchor", "middle")
            .style("font-size", "11px")
            .style("font-weight", "bold")
            .style("fill", "#222")
            .text(genreName);

        const textW = genreTextNode.node().getBBox().width;

        // create reset button
        const resetBtn = labelG.append("rect")
            .attr("class", "local-reset-square")
            .attr("x", -(textW / 2) - 14).attr("y", -9).attr("width", 10).attr("height", 10).attr("rx", 1.5)
            .attr("fill", colorScale(genreName))
            .style("cursor", "pointer")
            .style("opacity", 0) 
            .style("pointer-events", "none");

        // The baseline star path polygon
        gInner.append("path")
            .attr("class", "static-display-star")
            .attr("d", radarLine(radarData))
            .attr("fill", colorScale(genreName))
            .attr("fill-opacity", 0.4) 
            .attr("stroke", colorScale(genreName))
            .attr("stroke-width", 1.5);

        // double click to add genre to 
        gInner.on("dblclick", function(d) {
            if (!window.isSelectMode) return; 
            addGenretoChart(d.radarData, d.genreName);
        });

        // add action key
        resetBtn.on("click", function(d) {
            d3.event.stopPropagation(); 
            removeGenre(d.genreName);
        });
    });


    // Main Chart in Selection
    const mainViewRadius = 90; 
    const mainViewG = svg.append("g")
        .attr("class", "focus-mainView-panel")
        .attr("transform", `translate(${width - 320}, ${teamTop + 120})`) 
        .style("opacity", 0)
        .style("pointer-events", "none");

    const rScaleWB = d3.scaleLinear().domain([0, maxValue]).range([0, mainViewRadius]);
    const wbRadarLine = d3.lineRadial().radius(d => rScaleWB(d.value)).angle((d, i) => i * angleSlice).curve(d3.curveLinearClosed);

    // Grid tracks background rings
    const gridRings = 4;
    for (let j = 0; j < gridRings; j++) {
        mainViewG.append("circle").attr("r", mainViewRadius * ((j + 1) / gridRings)).attr("fill", "none").attr("stroke", "#ccc").attr("stroke-width", "0.5px");
    }

    categories.forEach((cat, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        const x = (mainViewRadius + 12) * Math.cos(angle);
        const y = (mainViewRadius + 12) * Math.sin(angle);

        mainViewG.append("text")
            .attr("x", x).attr("y", y)
            .attr("text-anchor", Math.abs(x) < 5 ? "middle" : (x > 0 ? "start" : "end"))
            .attr("dy", "0.35em")
            .style("font-size", "11px").style("font-weight", "bold").style("fill", "#555")
            .text(cat);
    });

    // wrap layer in text
    const textLayerG = mainViewG.append("g").attr("class", "mainView-text-layer");
    const shapeLayerG = mainViewG.append("g").attr("class", "mainView-shapes-layer");

    // Array to manage genres loaded onto main view
    let loadedGenres = [];

    addDirections();

    //Create directions
    function addDirections() {
        textLayerG.selectAll("*").remove();
        const directions= textLayerG.append("g")
            .attr("transform", `translate(${mainViewRadius + 65}, 0)`);

        directions.append("text")
            .attr("x", 87.5).attr("y", -100).attr("text-anchor", "middle")
            .style("font-size", "12px").style("font-weight", "bold").style("fill", "#444")
            .text("Double click to compare");

        directions.append("text")
            .attr("x", 87.5).attr("y", -80).attr("text-anchor", "middle")
            .style("font-size", "12px").style("fill", "#777").style("font-style", "italic")
            .text("Max is 3 genres");

        directions.append("text")
            .attr("x", 87.5).attr("y", -60).attr("text-anchor", "middle")
            .style("font-size", "12px").style("fill", "#777").style("font-style", "italic")
            .text("Click color icon to remove");
    }

    // Displays color square legends 
    function drawLegend() {
        textLayerG.selectAll("*").remove();

        loadedGenres.forEach((genreInfo, lineIndex) => {
            const legendRowG = textLayerG.append("g")
                .attr("transform", `translate(${mainViewRadius + 75}, ${-60 + (lineIndex * 50)})`);

            // Color identifier
            legendRowG.append("rect")
                .attr("width", 10).attr("height", 8).attr("rx", 2)
                .attr("x", 0).attr("y", -29) // Shifted up to match the text label's new baseline
                .attr("fill", colorScale(genreInfo.name));

            // Name label
            const label = legendRowG.append("text");
            label
                .attr("x", 16)
                .attr("y", -20)
                .text(genreInfo.name);

            label.style("font-size", "12px");

            // Averages metric metrics metrics block
            genreInfo.data.forEach((metric, metricIdx) => {
                const subRow = Math.floor(metricIdx / 2);
                const subCol = metricIdx % 2;

                legendRowG.append("text")
                    .attr("x", subCol * 70)
                    .attr("y", -8 + (subRow * 14)) 
                    .style("font-size", "10px").style("fill", "#444")
                    .text(`${metric.axis}: ${metric.value.toFixed(1)}`);
            });
        });
    }

    // Add the double clicked genre to the main
    // selected chart
    function addGenretoChart(radarData, genreName) {
        // if genre has been added do nothing
        if (loadedGenres.some(item => item.name === genreName)) return;

        // max 3
        if (loadedGenres.length >= 3) {
            const elementsToRemove = [...loadedGenres];
            loadedGenres = [];

            // Slide all 3 elements back synchronously
            elementsToRemove.forEach(evictedGenre => {
                const sourceCell = smallMultiplesG.selectAll(".star-chart-container").filter(d => d.genreName === evictedGenre.name).datum();
                // (AI USED) Dynamically offset source transformation path based on whether the parent container group has moved left or right
                const currentParentX = window.isSelectMode ? teamMargin.left : teamMargin.left + 20;
                const targetLocalX = (currentParentX + 30 + sourceCell.morphX) - (width - 320);
                const targetLocalY = (teamTop + 50 + sourceCell.morphY) - (teamTop + 140);

                shapeLayerG.select(`.wb-layer-${evictedGenre.name.replace(/[^a-zA-Z0-9]/g, '-')}`)
                    .transition().duration(400).ease(d3.easeCubicIn)
                    .attr("transform", `translate(${targetLocalX}, ${targetLocalY}) scale(0.3)`)
                    .remove();
            });
        }

        // Push new entity token to tracking array
        loadedGenres.push({ name: genreName, data: radarData });

        const sourceCell = smallMultiplesG.selectAll(".star-chart-container").filter(d => d.genreName === genreName).datum();
        const currentParentX = window.isSelectMode ? teamMargin.left : teamMargin.left + 20;
        const initialLocalX = (currentParentX + 30 + sourceCell.morphX) - (width - 320);
        const initialLocalY = (teamTop + 50 + sourceCell.morphY) - (teamTop + 140);

        shapeLayerG.append("path")
            .datum(radarData)
            .attr("class", `overlay wb-layer-${genreName.replace(/[^a-zA-Z0-9]/g, '-')}`)
            .attr("d", wbRadarLine)
            .attr("fill", colorScale(genreName))
            .attr("fill-opacity", 0.35)
            .attr("stroke", colorScale(genreName))
            .attr("stroke-width", 2.2)
            .attr("transform", `translate(${initialLocalX}, ${initialLocalY}) scale(0.3)`) 
            .transition().duration(400).ease(d3.easeCubicOut)
            .attr("transform", "translate(0,0) scale(1)");

        drawLegend();
    }


    //Remove the genre from the main selection view
    // this portion of the code copy pasted from AI
    function removeGenre(genreName) {
        const targetLayer = shapeLayerG.select(`.wb-layer-${genreName.replace(/[^a-zA-Z0-9]/g, '-')}`);
        if (targetLayer.empty()) return;

        // get element from tracking regoistries
        loadedGenres = loadedGenres.filter(item => item.name !== genreName);

        const sourceCell = smallMultiplesG.selectAll(".star-chart-container").filter(d => d.genreName === genreName).datum();
        const currentParentX = window.isSelectMode ? teamMargin.left : teamMargin.left + 20;
        const targetLocalX = (currentParentX + 30 + sourceCell.morphX) - (width - 320);
        const targetLocalY = (teamTop + 50 + sourceCell.morphY) - (teamTop + 140);

        targetLayer.transition().duration(400).ease(d3.easeCubicIn)
            .attr("transform", `translate(${targetLocalX}, ${targetLocalY}) scale(0.3)`)
            .remove();

        // else display directions
        if (loadedGenres.length === 0) {
            addDirections();
        } else {
            drawLegend();
        }
    }

    // Morph configurations
    toggleStarChartLayout = function(selectionMode) {
        window.isSelectMode = selectionMode;

        // slider location
        smallMultiplesG.transition().duration(1500).ease(d3.easeCubicInOut)
            .attr("transform", `translate(${selectionMode? teamMargin.left : teamMargin.left + 20}, ${teamTop + 50})`);

        // Snappy direct transform tracking durations
        smallMultiplesG.selectAll(".star-chart-container")
            .transition().duration(1500).ease(d3.easeCubicInOut)
            .attr("transform", function(d) {
                return `translate(${selectionMode ? d.morphX :d.normX}, ${selectionMode? d.morphY : d.normY})`;
            });

        // Hide axis labels when morphed
        smallMultiplesG.selectAll(".grid-axis-text")
            .transition().duration(1500)
            .style("opacity", selectionMode? 0 : 1);

        // ensures that the genre label is close enough when
        // swapped to selection mode
        smallMultiplesG.selectAll(".footer-label-group")
            .transition().duration(1500).ease(d3.easeCubicInOut)
            .attr("transform", `translate(0, ${selectionMode ? radarRadius + 14 : radarRadius + 25})`);

        // load in the squares
        smallMultiplesG.selectAll(".local-reset-square")
            .transition().duration(1500)
            .style("opacity", selectionMode ? 1 : 0)
            .style("pointer-events", selectionMode? "all" : "none");

        // Load in the main view
        mainViewG.transition().duration(1500)
            .style("opacity", selectionMode ? 1 : 0)
            .style("pointer-events", selectionMode? "all" :"none");

        //reset everything when user goes back to default view
        if (!selectionMode) {
            shapeLayerG.selectAll(".overlay").remove();
            loadedGenres = [];
            addDirections();
        }
    };

    // Add chart header
    const title = "Mean of Mental Health Survey On A Scale of 1-10 Based On Different Music Genre Lovers";
    const titleNode = svg.append("text")
        .attr("class", "star-chart-main-title")
        .attr("x", teamMargin.left || 30)
        .attr("y", teamTop ? teamTop - 20 : 380)
        .style("font-weight", "bold")
        .style("font-size", "16px")
        .text(title);

    setTimeout(() => {
        titleNode
            .attr("x", teamMargin.left - 20)
            .attr("y", teamTop - 20);
    }, 150);
}