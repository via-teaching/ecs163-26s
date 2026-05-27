// scatterPlot.js 
function drawScatterPlot(newData, genreCounts) {
    // d3.select() crreate the d3 selection object
    const svg = d3.select("svg");

    //compute the means of each mental disorder and total them
    let scatterData = d3.nest()
        .key(d=>d["Fav genre"])
        .key(d=>+d["Age"])
        .rollup(leaves=>{
            const totalLeaves =leaves.length;
            const anxiety = d3.mean(leaves, d=>+d["Anxiety"]) || 0;
            const depression = d3.mean(leaves, d=>+d["Anxiety"]) || 0;
            const insomnia = d3.mean(leaves, d=>+d["Insomnia"]) || 0;
            const ocd = d3.mean(leaves, d=>+d["OCD"]) || 0;
            const mean = (anxiety + depression +ocd + insomnia) /4;
            return {meanScore: mean, count:totalLeaves};
        })
        .entries(newData);

    let dataPoints = [];
    scatterData.forEach(genreGroup => {
        genreGroup.values.forEach(ageGroup=> {
            dataPoints.push({
                genre: genreGroup.key,
                age:+ageGroup.key,
                meanScore: ageGroup.value.meanScore,
                count: ageGroup.value.count
            });
        });
    });

    //set x and y values
    const spx = d3.scaleLinear().domain([10, 80]).range([0, scatterWidth]);
    const spy = d3.scaleLinear().domain([0, 10]).range([scatterHeight, 0]);

    const spg = svg.append("g")
        .attr("transform", `translate(${scatterMargin.left}, ${scatterMargin.top + 30})`);

    spg.append("g")
        .attr("transform",`translate(0,${scatterHeight})`)
        .call(d3.axisBottom(spx).ticks(6));

    spg.append("g")
        .call(d3.axisLeft(spy).ticks(5));

    //add y axis
    spg.append("text")
        .attr("x",scatterWidth/ 2)
        .attr("y", scatterHeight + 35)
        .style("text-anchor", "middle")
        .style("font-size","12px")
        .style("font-weight","bold")
        .text("Participant Age (Years)");
    //add x axis
    spg.append("text")
        .attr("transform","rotate(-90)")
        .attr("x", -scatterHeight / 2)
        .attr("y", -40)
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .text("Mean Mental Health Score (Scale 1-10)");

    const dataCircles = spg.selectAll(".participant-dot")
        .data(dataPoints)
        .enter().append("circle")
        .attr("class", d =>`participant-dot g-${d.genre.replace(/[^a-zA-Z0-9]/g, '-')}`)
        .attr("cx", d => {
            const rawX =spx(d.age) + (Math.random() - 0.5) * 8;
            d.x_plane = Math.max(2, Math.min(scatterWidth - 2, rawX));
            return d.x_plane;
        })
        .attr("cy", d => {
            const rawY = spy(d.meanScore) + (Math.random()- 0.5) * 8;
            d.y_plane = Math.max(2, Math.min(scatterHeight - 2, rawY));
            return d.y_plane;
        })
        .attr("r", 4.5) 
        .attr("fill", d => colorScale(d.genre))
        .attr("opacity", 0.60) 
        .attr("stroke","#fff")
        .attr("stroke-width", 0.4);
    
    dataCircles.style("cursor", "pointer")
        .on("click", function(d) {
            // Only isolate dots if the user has activated Selection Mode
            if (!window.isSelectMode) return;

            const clickedGenre = d.genre;

            // Isolate the scatter plot view smoothly using a fade transition
            spg.selectAll(".participant-dot")
                .transition()
                .duration(500)
                .style("opacity", dot => dot.genre === clickedGenre ? 0.90 : 0.03);
        });

    dataCircles.append("title")
        .text(d => `Genre: ${d.genre}\nAge: ${d.age} yrs\nMean Score: ${d.meanScore.toFixed(2)}/10\nParticipants: ${d.count}`);

    svg.append("text")
        .attr("x", scatterMargin.left)
        .attr("y", scatterMargin.top +15)
        .style("font-weight", "bold")
        .style("font-size","16px")
        .text("Mean Mental Health By Age (Click Legend)");

    // Append legend
    const scatterLegendG = svg.append("g")
        .attr("class", "scatterLegend") // Retained selector class hook
        .attr("transform", `translate(${scatterMargin.left + scatterWidth + 20}, ${scatterMargin.top + 40})`);

    // Loop each genres to draw the selection keys
    genreCounts.forEach((genreObj, i) => {
        const nameString =genreObj.key; 

        const legendRow = scatterLegendG.append("g")
            .attr("transform", `translate(0, ${i * 18})`)
            .style("cursor","pointer");

        // Color Indicator Square
        const keySquare = legendRow.append("rect")
            .attr("width", 11)
            .attr("height",11)
            .attr("fill",colorScale(nameString));

        // Interactive Label Text Label
        const keyText = legendRow.append("text")
            .attr("x", 18)
            .attr("y", 10)
            .style("font-size","12px")
            .style("font-weight", "normal")
            .style("fill", "#222")
            .text(nameString);

        // Click event handler
        legendRow.on("click", function() {
            // disable legend when Select Mode
            if (window.isSelectMode) return;

            // filter out crossed data
            const dots = spg.selectAll(".participant-dot")
                .filter(dot => dot.genre === nameString);

            if (hiddenGenres.has(nameString)) {
                hiddenGenres.delete(nameString);
                dots.transition().duration(1500)
                    .style("opacity", 0.60)
                    .attr("r",4.5);
                keySquare.style("opacity", 1);
                keyText.style("text-decoration", "none").style("fill", "#222");
            } else {
                hiddenGenres.add(nameString);
                dots.transition().duration(500)
                    .style("opacity", 0)
                    .attr("r", 0);
                keySquare.style("opacity", 0.2);
                keyText.style("fill", "#bdb9b9");
            }
        });
    });

    const brush = d3.brush()
        .extent([[0, 0], [scatterWidth, scatterHeight]])
        .on("start brush end", brushed);

    const brushGroup = spg.append("g")
        .attr("class", "brush")
        .call(brush);

    //clear brush when change
    window.clearActiveBrush = function() {
        brushGroup.call(brush.move, null);
    };

    function brushed() {
        const selection = d3.event.selection;
        
        if (!selection) {
            const activeLayers = [];
            svg.selectAll(".focus-mainView-panel .mainView-shapes-layer path").each(function() {
                const classList = d3.select(this).attr("class") || "";
                const match = classList.match(/wb-layer-([a-zA-Z0-9\-]+)/);
                if (match) activeLayers.push(match[1]);
            });

            if (activeLayers.length > 0) {
                dataCircles.style("opacity", d => {
                    const safeClassName = d.genre.replace(/[^a-zA-Z0-9]/g, '-');
                    return activeLayers.includes(safeClassName) ? 0.90 : 0.03;
                });
            } else {
                dataCircles.style("opacity", 0.60);
            }
            return;
        }

        const [[x0, y0], [x1, y1]] = selection;

        // local boundary mapping
        dataCircles.style("opacity", d => {
            const x = d.x_plane;
            const y = d.y_plane;
            const isInside = (x0 <= x && x <= x1 && y0 <= y && y <= y1);
            return isInside ? 0.90 : 0.15;
        });
    }
}

// Connect to main starchart view
window.syncScatter = function(activeGenreNames) {
    const svg = d3.select("svg");
    
    // if no genre loaded, default
    if (!activeGenreNames || activeGenreNames.length === 0) {
        // Restore default dot visibility tracking legend settings
        svg.selectAll(".participant-dot")
            .transition()
            .duration(1500)
            .ease(d3.easeCubicOut)
            .attr("r", d => hiddenGenres.has(d.genre) ? 0 : 4.5) 
            .style("opacity", d => hiddenGenres.has(d.genre) ? 0 : 0.60);
        

        // Restore all legend labels back to regular visibility states
        svg.selectAll(".scatterLegend").each(function() {
            const row = d3.select(this);
            const textNode = row.select("text");
            const genreName = textNode.text();

            if (hiddenGenres.has(genreName)) {
                row.select("rect").transition().duration(500).style("opacity", 0.2);
                textNode.transition().duration(500).style("fill", "#bdb9b9");
            } else {
                row.select("rect").transition().duration(500).style("opacity", 1);
                textNode.transition().duration(500).style("fill", "#222");
            }
        });
        return;
    }

    // ignore default view legend 
    activeGenreNames.forEach(genreName => {
        if (hiddenGenres.has(genreName)) {
            hiddenGenres.delete(genreName); 
        }
    });

    // dim everything but loaded genres
    svg.selectAll(".scatterLegend").each(function() {
        const row = d3.select(this);
        const textNode = row.select("text");
        const genreName = textNode.text();

        const isCurrentlySelected = activeGenreNames.includes(genreName);

        // transition text color and text color
        textNode.transition().duration(400)
            .style("fill", isCurrentlySelected ? "#222" : "#bdb9b9")
            .style("font-weight", isCurrentlySelected ? "bold" : "normal");

        row.select("rect").transition().duration(400)
            .style("opacity", isCurrentlySelected ? 1 : 0.15);
    });

    // dim dots if not selected genre
    svg.selectAll(".participant-dot")
        .transition()
        .duration(500)
        .attr("r", 4.5) 
        .style("opacity", d => activeGenreNames.includes(d.genre) ? 0.90 : 0.03);
};