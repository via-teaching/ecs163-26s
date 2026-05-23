//step 1: define your layout dimensions
//use the entire screen
const width = window.innerWidth;
const height = window.innerHeight;
//top left for scatter plot
const scatterWidth = width / 2;
const scatterHeight = height / 2;
//top right for bar chart
const barWidth = width / 2;
const barHeight = height / 2;
//bottom half for parallel coordinates
const pcWidth = width - 100;
const pcHeight = (height / 2) - 100;

//step 2: grab the svg canvas and tooltip from index.html
const svg = d3.select("svg");
const tooltip = d3.select("#tooltip");

//step 3: load the data
d3.csv("data/student-mat.csv").then(function(data){

    //for each row, convert string literals to actual numbers(only take relevant columns)
    data.forEach(d => {
        d.absences = +d.absences;
        d.G3 = +d.G3;
        d.studytime = +d.studytime;
        d.freetime = +d.freetime;
        d.goout = +d.goout;
        d.health = +d.health;
        d.Dalc = +d.Dalc;
        d.Walc = +d.Walc;
    });
    //step 3 ends

    //step 4: draw Bar Chart(focus view 1)
    //create a group for bar chart and position it in the top right corner
    const barGroup = svg.append("g")
        .attr("transform", `translate(${scatterWidth + 100}, 50)`);
    
    //define x and y axes scales for bar chart
    const xScaleBar = d3.scaleBand()
        .domain(["Workday (Dalc)", "Weekend (Walc)"])
        .range([0, barWidth - 150])
        .padding(0.4);//distance between bars

    const yScaleBar = d3.scaleLinear()
        .domain([0, 5])
        .range([scatterHeight - 100, 0]);
    
    //add axes to the bar chart
    barGroup.append("g")
        .attr("transform", `translate(0, ${scatterHeight - 100})`)
        .call(d3.axisBottom(xScaleBar));

    barGroup.append("g").call(d3.axisLeft(yScaleBar));
    
    //add axis labels
    barGroup.append("text")
        .attr("x", (barWidth - 150) / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .text("Average Alcohol Consumption(1-5)");
    
    //function to update the bar chart based on selected data
    window.updateBarChart = function(dataToUse){
        //if no data is selected, show empty bars
        if(dataToUse.length === 0){
            barGroup.selectAll(".bar").attr("y", yScaleBar(0)).attr("height", 0);
            return;
        }
        
        //calculate average Dalc and Walc for the selected data
        const avgDalc = d3.mean(dataToUse, d => d.Dalc);
        const avgWalc = d3.mean(dataToUse, d => d.Walc);
        
        //prepare data for the bars
        const barData = [
            {type: "Workday (Dalc)", value: avgDalc},
            {type: "Weekend (Walc)", value: avgWalc}
        ];
        
        //bind data to bars and update their heights based on the average values
        const bars = barGroup.selectAll(".bar").data(barData);
        
        //enter new bars, update existing bars, and remove old bars
        bars.enter()
            .append("rect")
            .attr("class", "bar")
            .attr("x", d => xScaleBar(d.type))
            .attr("width", xScaleBar.bandwidth())
            .attr("fill", "orange")
            .merge(bars)
            .transition().duration(500)//time for smooth transition when updating bars
            .attr("y", d => yScaleBar(d.value))
            .attr("height", d => (scatterHeight - 100) - yScaleBar(d.value));
    };

    updateBarChart(data);//initialize bar chart with all data
    //step 4 ends

    //step 5: draw Parallel Coordinates(focus view 2, advanced)
    //create a group for parallel coordinates and position it in the bottom half of the screen
    const pcGroup = svg.append("g")
        .attr("transform", `translate(50, ${scatterHeight + 50})`);
    
    //define the dimensions to be used in the parallel coordinates plot
    const dimensions = ["studytime", "freetime", "goout", "health", "absences", "G3"];
    
    //create a y-scale for each dimension based on the data
    const yScales = {};
    dimensions.forEach(function(d){
        yScales[d] = d3.scaleLinear()
            .domain(d3.extent(data, p => +p[d]))
            .range([pcHeight, 0]);
    });
    
    /*create an x-scale to position each dimension evenly across
    the width of the parallel coordinates plot*/
    const xScalePC = d3.scalePoint()
        .domain(dimensions)
        .range([0, pcWidth])
        .padding(0.5);
    
    //function to draw a line for each data point across the dimensions
    function path(d){
        return d3.line()(dimensions.map(p => [xScalePC(p), yScales[p](d[p])]));
    }

    //draw the lines for each data point in the parallel coordinates plot
    pcGroup.selectAll("myPath")
        .data(data)
        .enter().append("path")
        .attr("d", path)
        .style("fill", "none")
        .style("stroke", "steelblue")
        .style("opacity", 0.3)
        .style("stroke-width", 1.5);
    
    //add axes for each dimension in the parallel coordinates plot
    const axesGroup = pcGroup.selectAll("myAxis")
        .data(dimensions).enter()
        .append("g")
        .attr("transform", d => `translate(${xScalePC(d)}, 0)`);
    
    //call the y-axis for each dimension
    axesGroup.each(function(d){
        d3.select(this).call(d3.axisLeft(yScales[d]));
    });
    
    //add labels for each dimension at the top of the axes
    axesGroup.append("text")
        .style("text-anchor", "middle")
        .attr("y", -15)
        .text(d => d)
        .style("fill", "black")
        .style("font-weight", "bold");
    //step 5 ends

    //step 6: draw Scatter Plot(context view)
    //create a group for scatter plot and position it in the top left corner
    const scatterGroup = svg.append("g")
        .attr("transform", `translate(50, 50)`);
    
    //define scales for x and y axes
    const xScaleScatter = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.absences)])
        .range([0, scatterWidth - 100]);

    const yScaleScatter = d3.scaleLinear()
        .domain([0, 20])
        .range([scatterHeight - 100, 0]);//screen y-axis from top to bottom
    
    //add axes to the scatter plot
    scatterGroup.append("g")
        .attr("transform", `translate(0, ${scatterHeight - 100})`)
        .call(d3.axisBottom(xScaleScatter));

    scatterGroup.append("g").call(d3.axisLeft(yScaleScatter));
    
    //add brushing to the scatter plot for interactive selection
    const brush = d3.brush()
        .extent([[0, 0], [scatterWidth - 100, scatterHeight - 100]])
        .on("end", updateCharts);

    scatterGroup.append("g")
        .attr("class", "brush")
        .call(brush);
    
    //plot the points
    scatterGroup.selectAll("circle")
        .data(data)
        .enter().append("circle")
        .attr("cx", d => xScaleScatter(d.absences))
        .attr("cy", d => yScaleScatter(d.G3))
        .attr("r", 4)
        .attr("fill", "steelblue")
        .attr("opacity", 0.7)
        
        //add hover-over tooltip to scatter plot points
        .on("mouseover", function(d){
            //highlight the hovered circle
            d3.select(this)
                .transition().duration(200)
                .attr("r", 8) //make it bigger
                .attr("fill", "orange");

            //make tooltip visible and fill it with data
            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(`Final Grade: ${d.G3}<br>Absences: ${d.absences}<br>Study Time: ${d.studytime}`)
                .style("left", (d3.event.pageX + 10) + "px") //position next to mouse cursor
                .style("top", (d3.event.pageY - 28) + "px");

            //highlight this student's line in Parallel Coordinates
            pcGroup.selectAll("path")
                .filter(pathData => pathData === d) //find the matching line
                .transition().duration(200)
                .style("stroke", "orange")
                .style("stroke-width", 4)
                .style("opacity", 1);
        })
        //reset highlights and tooltip on mouseout
        .on("mouseout", function(d){
            //reset the circle when mouse cursor leaves
            d3.select(this)
                .transition().duration(200)
                .attr("r", 4)
                .attr("fill", "steelblue");

            //hide tooltip when mouse cursor leaves
            tooltip.transition().duration(500).style("opacity", 0);

            //reset the Parallel Coordinates line when mouse cursor leaves
            pcGroup.selectAll("path")
                .filter(pathData => pathData === d)
                .transition().duration(200)
                .style("stroke", "steelblue")
                .style("stroke-width", 1.5)
                .style("opacity", 0.3);
        });

    //add axis labels
    scatterGroup.append("text")
        .attr("x", (scatterWidth - 100) / 2)
        .attr("y", scatterHeight - 60)
        .attr("text-anchor", "middle")
        .text("Number of Absences");

    scatterGroup.append("text")
        .attr("transform", "rotate(-90)")//rotate y-axis label to be vertical
        .attr("x", -((scatterHeight - 100) / 2))
        .attr("y", -35)
        .attr("text-anchor", "middle")
        .text("Final Grade(G3)");
    //step 6 ends

    //step 7: update bar chart and parallel coordinates based on scatter plot brushing
    function updateCharts(){
        const extent = d3.event.selection;
        //if no area is selected, reset all charts to show all data
        if(!extent){
            scatterGroup.selectAll("circle").style("fill", "steelblue");
            updateBarChart(data);
            pcGroup.selectAll("path").style("stroke", "steelblue").style("display", null);
            return;
        }
        //filter the data to find points that are within the brushed area
        const selectedData = data.filter(d => {
            const cx = xScaleScatter(d.absences);
            const cy = yScaleScatter(d.G3);
            //check if the point's coordinates are within the brush extent
            return extent[0][0] <= cx && cx <= extent[1][0] &&
                   extent[0][1] <= cy && cy <= extent[1][1];
        });
        //highlight the selected points in the scatter plot and dim the unselected ones
        scatterGroup.selectAll("circle")
            .style("fill", function(d){
                const cx = xScaleScatter(d.absences);
                const cy = yScaleScatter(d.G3);
                const isSelected = extent[0][0] <= cx && cx <= extent[1][0] && 
                                   extent[0][1] <= cy && cy <= extent[1][1];
                return isSelected ? "red" : "lightgray";
            });
        //update the bar chart to reflect the average alcohol consumption of the selected data
        updateBarChart(selectedData);
        //highlight the lines in the parallel coordinates plot that correspond to the selected data
        pcGroup.selectAll("path")
            .style("display", function(d){
                //only show lines that correspond to the selected data, hide the rest
                return selectedData.includes(d) ? null : "none";
            })
            .style("stroke", "red");
    }
    //step 7 ends

}).catch(function(error){//handle any errors that occur during data loading
    console.log("Error loading the data: ", error);
});
/*
LLM usage disclaimer: As a D3.js learner, I used LLM in part of this assignment for learning purpose. 
For example, I didn't know how to implement the mouseover and mouseout events for the scatter plot points. 
LLM gave me clear instructions and all essential basics to implement them. Also, it helped me understand 
them well(comments are made).
*/