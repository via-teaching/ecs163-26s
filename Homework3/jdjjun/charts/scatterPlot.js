// scatterPlot.js - Mean Mental Health By Age Scatter Module
function drawScatterPlot(newData, genreCounts) {
    // d3.select() crreate the d3 selection object
    const svg = d3.select("svg");

    //compute the means of each mental disorder and total them
    let scatterData = d3.nest()
        .key(d=>d["Fav genre"])
        .key(d=>+d["Age"])
        .rollup(leaves=>{
            const totalLeaves = leaves.length;
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
            return Math.max(2, Math.min(scatterWidth - 2, rawX));
        })
        .attr("cy", d => {
            const rawY = spy(d.meanScore) + (Math.random()- 0.5) * 8;
            return Math.max(2, Math.min(scatterHeight - 2, rawY));
        })
        .attr("r", 4.5) 
        .attr("fill", d => colorScale(d.genre))
        .attr("opacity", 0.60) 
        .attr("stroke","#fff")
        .attr("stroke-width", 0.4);

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
        .extent([[60, 40], [scatterWidth+ 65, scatterHeight + 40]])
        .on("start brush end", brushed)

    svg.append("g")
        .attr("class", "brush")
        .call(brush);
    
    function brushed() {
        const selection = d3.event.selection;
        if (selection) {
            const [[x0, y0], [x1, y1]] = selection;
            // Search your scatter plot circles to see which ones are inside these pixel coordinates
            circle.classed("selected", d => {
                return x0 <= xScale(d.Age) && xScale(d.Age) <= x1 &&
                   y0 <= yScale(d.Score) && yScale(d.Score) <= y1;
            });
        }
    }  


    
}