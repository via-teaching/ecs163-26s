const width = window.innerWidth;
const height = window.innerHeight;

let scatterLeft = 0, scatterTop = 0;
let scatterMargin = {top: 10, right: 30, bottom: 30, left: 80},
    scatterWidth = 1100 - scatterMargin.left - scatterMargin.right,
    scatterHeight = 500 - scatterMargin.top - scatterMargin.bottom;

let barLeft = 0, barTop = 20;
let barMargin = {top: 10, right: 30, bottom: 30, left: 1200},
    barWidth = 1600 - barMargin.left - barMargin.right,
    barHeight = height-450 - barMargin.top - barMargin.bottom;

let streamLeft = 0, streamTop = 520;
let streamMargin = {top: 10, right: 30, bottom: 30, left: 80},
    streamWidth = 1100 - streamMargin.left - streamMargin.right,
    streamHeight = height-540 - streamMargin.top - streamMargin.bottom;

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

    const g1 = svg.append("g")
        .attr("width", scatterWidth + scatterMargin.left + scatterMargin.right)
        .attr("height", scatterHeight + scatterMargin.top + scatterMargin.bottom)
        .attr("transform", `translate(${scatterMargin.left}, ${scatterMargin.top})`);

    // X label
    g1.append("text")
        .attr("x", scatterWidth / 2)
        .attr("y", scatterHeight + 50)
        .attr("font-size", "20px")
        .attr("text-anchor", "middle")
        .text("Company Location");

    // Y label
    g1.append("text")
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
    g1.append("g")
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

    const circles = g1.selectAll("circle").data(data1);

    circles.enter().append("circle")
        .attr("cx", d => x1(d.company_location) + x1.bandwidth() / 2)
        .attr("cy", d => y1(d.salary_in_usd))
        .attr("r", 3)
        .attr("fill", "#965241")
        .attr("stroke", "#40211D")
        .attr("stoke-width", "1px");

    //plot 2: Bar Chart
    const g2 = svg.append("g")
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
        .attr("y", d => y2(d.avgSalary1))
        .attr("x", d => x2(d.experience_level))
        .attr("width", x2.bandwidth())
        .attr("height", d => barHeight - y2(d.avgSalary1))
        .attr("fill", "#418596");


    //plot 3: Stream Graph
    const g3 = svg.append("g")
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
        .range([0, streamWidth])

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
        .range([streamHeight, 0])

    const yAxisCall3 = d3.axisLeft(y3);
    g3.append("g").call(yAxisCall3);

    // Area
    let area = d3.area()
        .x(d => x3(d.data.work_year))
        .y0(d => y3(d[0]))
        .y1(d => y3(d[1]))

    // Path
    svg.selectAll("layers")
        .data(stackedForStream)
        .enter()
        .append("path")
        .attr("d", d => area(d))
        .style("fill", (d,i) => colorPalette(d.key))
        .attr("transform", `translate(${streamMargin.left}, ${streamTop})`);

    // Legend    
    svg.append("text")
        .attr("x", 1090)
        .attr("y", 570)
        .text("Company Size")
        .style("font-size", "20px")
        .attr("alignment-baseline","middle")

    //large
    svg.append("circle")
        .attr("cx", 1100)
        .attr("cy", 600)
        .attr("r", 6)
        .style("fill", "#7254EB")

    svg.append("text")
        .attr("x", 1120)
        .attr("y", 600)
        .text("Large")
        .style("font-size", "15px")
        .attr("alignment-baseline","middle")

    //medium
    svg.append("circle")
        .attr("cx", 1100)
        .attr("cy", 620)
        .attr("r", 6)
        .style("fill", "#5481EB")

    svg.append("text")
        .attr("x", 1120)
        .attr("y", 620)
        .text("Medium")
        .style("font-size", "15px")
        .attr("alignment-baseline","middle")

    //small
    svg.append("circle")
        .attr("cx", 1100)
        .attr("cy", 640)
        .attr("r", 6)
        .style("fill", "#54CDEB")

    svg.append("text")
        .attr("x", 1120)
        .attr("y", 640)
        .text("Small")
        .style("font-size", "15px")
        .attr("alignment-baseline","middle")

    //Citations
    //Used ChatGPT to learn tools for data processing   
    //Adapted code from https://d3-graph-gallery.com/ 
    }).catch(function(error){
    console.log(error);
});