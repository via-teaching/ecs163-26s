const width = window.innerWidth;
const height = window.innerHeight;

let scatterLeft = 0, scatterTop = 0;
let scatterMargin = {top: 50, right: 30, bottom: 30, left: 80},
    scatterWidth = 1100 - scatterMargin.left - scatterMargin.right,
    scatterHeight = 500 - scatterMargin.top - scatterMargin.bottom;

let barLeft = 0, barTop = 50;
let barMargin = {top: 10, right: 30, bottom: 30, left: 1200},
    barWidth = 1600 - barMargin.left - barMargin.right,
    barHeight = height-450 - barMargin.top - barMargin.bottom;

let streamLeft = 0, streamTop = 520;
let streamMargin = {top: 10, right: 30, bottom: 30, left: 80},
    streamWidth = 1100 - streamMargin.left - streamMargin.right,
    streamHeight = height - 540 - streamMargin.top - streamMargin.bottom;

d3.csv("ds_salaries.csv").then(data1 =>{
    console.log("data1", data1);

    data1.forEach(function(d){
        d.salary_in_usd = Number(d.salary_in_usd);
        d.work_year = Number(d.work_year)
    });

    //Data for bar graph (avg salary for experience level)
    let salaryAvgExp = d3.nest()
        .key(d => d.experience_level)
        .rollup(e => d3.mean(e, d => d.salary_in_usd))
        .entries(data1)
        .map(d => ({experience_level: d.key, avgSalary1: d.value}));

    //Data for stream graph (avg salary for company size over 4 years)
    let sml = {S: 0, M: 1, L: 2};
    let yearSort = {2020: 0, 2021: 1, 2022: 2, 2023: 3}

    let salaryAvgSize = d3.nest()
        .key(d => d.work_year)
        .sortKeys((a, b) => yearSort[a] - yearSort[b])
        .key(d => d.company_size)
        .sortKeys((a, b) => sml[a] - sml[b])
        .rollup(e => d3.mean(e, d => d.salary_in_usd))
        .entries(data1)

    let streamGraphArray = salaryAvgSize.map(d => {
        let a = {work_year: d.key};
        d.values.forEach(f => a[f.key] = f.value);
        return a;});

    let streamGraphX = Array.from(new Set(data1.map(d => d.work_year))).sort();
    let streamGraphA = Array.from(new Set(data1.map(d => d.company_size))).sort((a,b) => sml[a] - sml[b]);

    let streamStack = d3.stack()
        .keys(streamGraphA)

    let stackedForStream = streamStack(streamGraphArray);

    //plot 1: Scatter Plot
    const svg = d3.select("svg");
    const svg0 = d3.select("svg").append("svg")
        .attr("class", "svg0")
        .attr("width", width + scatterMargin.left + scatterMargin.right)
        .attr("height", height + scatterMargin.top + scatterMargin.bottom)
        .attr("transform", `translate(${scatterMargin.left}, ${scatterMargin.top})`);
    const svg1 = d3.select("svg").append("svg")
        .attr("class", "svg1");

    const g1 = svg.append("g")
        .attr("class", "plot1")
        .attr("width", width + scatterMargin.left + scatterMargin.right)
        .attr("height", height + scatterMargin.top + scatterMargin.bottom)
        .attr("transform", `translate(${scatterMargin.left}, ${scatterMargin.top})`);

    const g1Labels = svg.append("g")
        .attr("class", "plot1")
        .attr("width", scatterWidth + scatterMargin.left + scatterMargin.right)
        .attr("height", height + scatterMargin.top + scatterMargin.bottom)
        .attr("transform", `translate(${scatterMargin.left}, ${scatterMargin.top})`);

    // X label
    g1Labels.append("text")
        .attr("class", "transition1")
        .attr("x", scatterWidth / 2)
        .attr("y", scatterHeight + 50)
        .attr("font-size", "20px")
        .attr("text-anchor", "middle")
        .text("Company Location");

    // Y label
    g1Labels.append("text")
        .attr("class", "transition1")
        .attr("x", -(scatterHeight / 2))
        .attr("y", -60)
        .attr("font-size", "20px")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text("Salary in USD");

    // X ticks
    const x1 = d3.scaleBand()
        .domain(data1.map(d => d.company_location))
        .range([0, scatterWidth]);

    const xAxisCall = d3.axisBottom(x1).ticks(7);
    svg0.append("g")
        .attr("transform", `translate(0, ${scatterHeight})`)
        .call(xAxisCall)
        .selectAll("text")
            .attr("y", "10")
            .attr("x", "-5")
            .attr("text-anchor", "end")
            .attr("transform", "rotate(-40)");

    // Y ticks
    const y1 = d3.scaleLinear()
        .domain([0, d3.max(data1, d => d.salary_in_usd)])
        .range([scatterHeight, 0]);

    const yAxisCall = d3.axisLeft(y1).ticks(10);
    g1.append("g").call(yAxisCall);

    // Dots
    const circles = g1.selectAll("circle").data(data1);

    circles.enter().append("circle")
        .attr("class", "dots")
        .attr("cx", d => x1(d.company_location) + x1.bandwidth() / 2)
        .attr("cy", d => y1(d.salary_in_usd))
        .attr("r", 3)
        .attr("fill", "#965241")
        .attr("stroke", "#40211D")
        .attr("stoke-width", "1px");

    // Title
    svg.append("text")
        .attr("x", 450)
        .attr("y", 30)
        .text("Salary For Location")
        .style("font-size", "25px")
        .style("font-weight", "bold")
        .attr("alignment-baseline","middle");

    //plot 2: Bar Chart
    const g2 = svg1.append("g")
        .attr("width", barWidth + barMargin.left + barMargin.right)
        .attr("height", barHeight + barMargin.top + barMargin.bottom)
        .attr("transform", `translate(${barMargin.left}, ${barTop})`);
    
    // X label
    g2.append("text")
        .attr("x", barWidth / 2)
        .attr("y", barHeight + 50)
        .attr("font-size", "20px")
        .attr("text-anchor", "middle")
        .text("Experience Level");

    // Y label
    g2.append("text")
        .attr("x", -(barHeight / 2))
        .attr("y", -60)
        .attr("font-size", "20px")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text("Average Salary in USD");

    // X ticks
    const x2 = d3.scaleBand()
        .domain(data1.map(d => d.experience_level))
        .range([0, barWidth])
        .paddingInner(0.3)
        .paddingOuter(0.2);

    const xAxisCall2 = d3.axisBottom(x2);
    g2.append("g")
        .attr("transform", `translate(0, ${barHeight})`)
        .call(xAxisCall2)
        .selectAll("text")
            .attr("y", "10")
            .attr("x", "-5")
            .attr("text-anchor", "end")
            .attr("transform", "rotate(-40)");

    // Y ticks
    const y2 = d3.scaleLinear()
        .domain([0, d3.max(salaryAvgExp, d => d.avgSalary1)])
        .range([barHeight, 0])

    const yAxisCall2 = d3.axisLeft(y2).ticks(10);
    g2.append("g").call(yAxisCall2);

    // bars
    
    const bars = g2.selectAll("rect").data(salaryAvgExp);

    bars.enter().append("rect")
        .attr("class", "barsOnGraph")
        .attr("y", d => y2(d.avgSalary1))
        .attr("x", d => x2(d.experience_level))
        .attr("width", x2.bandwidth())
        .attr("height", d => barHeight - y2(d.avgSalary1))
        .attr("fill", "#39717e");

    bars.enter().append("text")
        .attr("class", "barsText")
        .attr("y", d => y2(d.avgSalary1) + 20)
        .attr("x", d => x2(d.experience_level) + x2.bandwidth() / 2)
        .attr("text-anchor", "middle")
        .text(d => d.avgSalary1.toFixed(0))
        .attr("fill", "#39717e");

    // Title
    svg1.append("text")
        .attr("x", 1180)
        .attr("y", 30)
        .text("Average Salary for Experience Level")
        .style("font-size", "25px")
        .style("font-weight", "bold")
        .attr("alignment-baseline","middle");

    //plot 3: Stream Graph
    const g3 = svg1.append("g")
        .attr("width", streamWidth + streamMargin.left + streamMargin.right)
        .attr("height", streamHeight + streamMargin.top + streamMargin.bottom)
        .attr("transform", `translate(${streamMargin.left}, ${streamTop})`);

    // Colors for streamgraph
    const colorPalette = d3.scaleOrdinal()
        .domain(streamGraphA)
        .range(["#54CDEB", "#5481EB", "#7254EB"]);

    // X label
    g3.append("text")
        .attr("x", streamWidth / 2)
        .attr("y", streamHeight + 50)
        .attr("font-size", "20px")
        .attr("text-anchor", "middle")
        .text("Year");

    // Y label
    g3.append("text")
        .attr("x", -(streamHeight / 2))
        .attr("y", -60)
        .attr("font-size", "20px")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text("Average Salary in USD");

    // X ticks
    const x3 = d3.scalePoint()
        .domain(streamGraphX)
        .range([0, streamWidth]);

    const xAxisCall3 = d3.axisBottom(x3).ticks(4).tickFormat(d3.format("d"));;
    g3.append("g")
        .attr("transform", `translate(0, ${streamHeight})`)
        .call(xAxisCall3)
        .selectAll("text")
            .attr("y", "10")
            .attr("x", "-5")
            .attr("text-anchor", "end")
            .attr("transform", "rotate(-40)");

    // Y ticks
    const y3 = d3.scaleLinear()
        .domain([0, 400000])
        .range([streamHeight, 0]);

    const yAxisCall3 = d3.axisLeft(y3);
    g3.append("g").call(yAxisCall3);

    // Area
    let area = d3.area()
        .x(d => x3(d.data.work_year))
        .y0(d => y3(d[0]))
        .y1(d => y3(d[1]));

    // Path
    svg1.selectAll("layers")
        .data(stackedForStream)
        .enter()
        .append("path")
        .attr("d", d => area(d))
        .style("fill", (d,i) => colorPalette(d.key))
        .attr("transform", `translate(${streamMargin.left}, ${streamTop})`);

    // Title
    svg1.append("text")
        .attr("x", 1090)
        .attr("y", 880)
        .text("Average Salary Over Time")
        .style("font-size", "25px")
        .style("font-weight", "bold")
        .attr("alignment-baseline","middle");

    // Legend    
    svg1.append("text")
        .attr("x", 1090)
        .attr("y", 610)
        .text("Company Size")
        .style("font-size", "20px")
        .attr("alignment-baseline","middle");

    //large
    svg1.append("circle")
        .attr("cx", 1100)
        .attr("cy", 640)
        .attr("r", 6)
        .style("fill", "#7254EB");

    svg1.append("text")
        .attr("x", 1120)
        .attr("y", 640)
        .text("Large")
        .style("font-size", "15px")
        .attr("alignment-baseline","middle");

    //medium
    svg1.append("circle")
        .attr("cx", 1100)
        .attr("cy", 660)
        .attr("r", 6)
        .style("fill", "#5481EB");

    svg1.append("text")
        .attr("x", 1120)
        .attr("y", 660)
        .text("Medium")
        .style("font-size", "15px")
        .attr("alignment-baseline","middle");

    //small
    svg1.append("circle")
        .attr("cx", 1100)
        .attr("cy", 680)
        .attr("r", 6)
        .style("fill", "#54CDEB");

    svg1.append("text")
        .attr("x", 1120)
        .attr("y", 680)
        .text("Small")
        .style("font-size", "15px")
        .attr("alignment-baseline","middle");
 
    // HW3 additions

    // Scatterplot brushing
    function update() {
        extent = d3.event.selection
        d3.selectAll(".dots").classed("selected", function(d){return isBrushed(extent, x1(d.company_location), y1(d.salary_in_usd))})
    }

    function isBrushed(brush_coords, cx, cy) {
        let X0 = brush_coords[0][0],
            X1 = brush_coords[1][0],
            Y0 = brush_coords[0][1],
            Y1 = brush_coords[1][1];
        return X0 < cx && cx <= X1 && Y0 <= cy && cy <= Y1;
    }

    const brush = d3.brush()
        .extent([[0,0], [0,0]])
        .on("end", update);

    g1.append("g")
        .attr("class", "brush")
        .call(brush);

    // Scatterplot focus X Label
    svg.append("text")
        .attr("class", "aniLabel")
        .attr("x", (width - scatterMargin.left - scatterMargin.right) / 2)
        .attr("y", height - 40 - scatterMargin.top - scatterMargin.bottom + 100)
        .attr("font-size", "20px")
        .attr("text-anchor", "middle")
        .text("Company Location")
        .style("opacity", 0);

    // Scatterplot focus button
    const button = svg.append("rect")
        .attr("x", 780)
        .attr("y", 10)
        .attr("height", 50)
        .attr("width", 270)
        .attr("fill", "#8ad49b")
        .style("cursor", "pointer")
        .attr("stroke", "#000000")
        .attr("stoke-width", "1px");

    svg.append("text")
        .attr("x", 790)
        .attr("y", 35)
        .text("Scatterplot Focus Mode Toggle")
        .style("font-size", "20px")
        .attr("alignment-baseline","middle")
        .style("pointer-events", "none");

    let on = false;

    // Scatterplot focus button functionality & animation
    button.on("click", function() {
        if(on) {
            on = false;
            d3.select(this)
                .attr("fill", "#8ad49b")
            d3.select(".svg1").transition()
                .duration(1000)
                .style("opacity", 1)
            d3.select(".transition1").transition()
                .duration(1000)
                .style("opacity", 1)
            d3.select(".aniLabel").transition()
                .duration(1000)
                .style("opacity", 0)

            scatterMargin = {top: 50, right: 30, bottom: 30, left: 80},
            scatterWidth = 1100 - scatterMargin.left - scatterMargin.right,
            scatterHeight = 500 - scatterMargin.top - scatterMargin.bottom;

            x1.range([0, scatterWidth]);
            y1.range([scatterHeight, 0]);

            svg0.transition()
                .attr("transform", `translate(${scatterMargin.left}, ${scatterMargin.top})`)
                .duration(500)
                .call(xAxisCall);
            g1.transition()
                .duration(500)
                .call(yAxisCall);

            g1.selectAll("circle").transition()
                .duration(500)
                .attr("cx", d => x1(d.company_location) + x1.bandwidth() / 2)
                .attr("cy", d => y1(d.salary_in_usd))

            brush.extent([[0,0], [0,0]]);
            g1.select(".brush")
                .call(brush);

        } else {
            on = true;
            d3.select(this)
                .attr("fill", "#c2ffd2")
            d3.select(".svg1").transition()
                .style("opacity", 0)
            d3.select(".transition1").transition()
                .style("opacity", 0)
            d3.select(".aniLabel").transition()
                .style("opacity", 1)

            scatterMargin = {top: 0, right: 30, bottom: 30, left: 80},
            scatterWidth = width - scatterMargin.left - scatterMargin.right,
            scatterHeight = height - 80 - scatterMargin.top - scatterMargin.bottom;

            x1.range([0, scatterWidth]);
            y1.range([scatterHeight, 0]);

            svg0.transition()
                .attr("transform", `translate(${scatterMargin.left}, ${(height / 2) - (height / 95)})`)
                .call(xAxisCall);
            g1.transition()
                .call(yAxisCall);
                
            g1.selectAll("circle").transition()
                .attr("cx", d => x1(d.company_location) + x1.bandwidth() / 2)
                .attr("cy", d => y1(d.salary_in_usd))

            brush.extent([[0,0], [width, height]]);
            g1.select(".brush")
                .call(brush);
        }
    })

    // Bar Graph Animation
    d3.selectAll(".barsOnGraph")
    .on("mouseover", function() {
        d3.select(this)
            .attr("fill", "#66cfe9")
    })
    .on("mouseout", function() {
        d3.select(this)
            .attr("fill", "#39717e")
    })

    //Citations
    //Used ChatGPT to learn tools for data processing   
    //Adapted code from https://d3-graph-gallery.com/ 
    }).catch(function(error){
    console.log(error);
});