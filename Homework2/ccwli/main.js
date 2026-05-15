let abFilter = 25;
const width = window.innerWidth;
const height = window.innerHeight;

const svg = d3.select("svg")
    .attr("width", width)
    .attr("height", height);

// layout
let scatterMargin = {top: 50, right: 30, bottom: 60, left: 60};
let scatterWidth = 250;
let scatterHeight = 250; //sqaure
let scatterLeft = 80;

let distrMargin = {top: 50, right: 30, bottom: 60, left: 60};
let distrTop = 50; 
let distrWidth = 250; 
let distrHeight = 250;
let distrLeft = scatterLeft + scatterWidth + 150;

let teamMargin = {top: 50, right: 20, bottom: 50, left: 80};
let teamTop = 420; 
let teamWidth = width - teamMargin.left - teamMargin.right -80;
let teamHeight = 250;

// plots
d3.csv("student-mat.csv").then(rawData =>{
    console.log("rawData", rawData);
    const tooltip = d3.select("#tooltip");

    rawData.forEach(function(d,i){
        d.id = i;
        d.studytime = Number(d.studytime);
        d.G3 = Number(d.G3);
        d.absences = Number(d.absences);
        d.Walc = Number(d.Walc);
        d.Dalc = Number(d.Dalc);
    });


    const filteredData = rawData
    const processedData = filteredData.map(d=>{
                          return {
                            'id': d.id,
                            'studytime': d.studytime,
                            'G3': d.G3,
                            'absences': d.absences,
                            'sex': d.sex,
                            'Walc':d.Walc,
                            'Dalc': d.Dalc
                          };
    });
    console.log("processedData", processedData);
 
    //plot 1: Scatter Plot for study time and final grade
  
    const svg = d3.select("svg");
    

    const g1 = svg.append("g")
                .attr("width", scatterWidth + scatterMargin.left + scatterMargin.right)
                .attr("height", scatterHeight + scatterMargin.top + scatterMargin.bottom)
                .attr("transform", `translate(${scatterMargin.left}, ${scatterMargin.top})`);

    // X label
    g1.append("text")
    .attr("x", scatterWidth / 2)
    .attr("y", scatterHeight + 50)
    .attr("font-size", "16px")
    .attr("text-anchor", "middle")
    .text("Study Time");


    // Y label
    g1.append("text")
    .attr("x", -(scatterHeight / 2))
    .attr("y", -40)
    .attr("font-size", "16px")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("Final Grade (G3)");

    // X ticks
    const x1 = d3.scaleLinear()
    .domain([0, d3.max(processedData, d => d.studytime)])
    .range([0, scatterWidth]);

    const xAxisCall = d3.axisBottom(x1)
                        .ticks(7);
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
    .domain([0, d3.max(processedData, d => d.G3)])
    .range([scatterHeight, 0]);

    const yAxisCall = d3.axisLeft(y1)
                        .ticks(13);
    g1.append("g").call(yAxisCall);

     //legend

    const legend = svg.append("g")
    .attr("transform", "translate(20,20)");

    legend.append("rect")
        .attr("width", 10)
        .attr("height", 10)
        .attr("fill", "#ff69b4");

    legend.append("text")
        .attr("x", 15)
        .attr("y", 10)
        .text("Female");

    legend.append("rect")
        .attr("x", 80)
        .attr("width", 10)
        .attr("height", 10)
        .attr("fill", "#4682b4");

    legend.append("text")
        .attr("x", 95)
        .attr("y", 10)
        .text("Male");



    // circles
    const circles = g1.selectAll("circle").data(processedData);

    circles.enter().append("circle")
         .attr("cx", d => x1(d.studytime))
         .attr("cy", d => y1(d.G3))
         .attr("r", 5)
         .attr("class", d => "scatter-dot dot-" + d.id)
         .attr("fill", d=> d.sex==='F'? '#ff69b4':'#4682b4')
         .on("mouseover", handleMouseOver)
         .on("mouseout", handleMouseOut);

    const g2 = svg.append("g")
                .attr("width", distrWidth + distrMargin.left + distrMargin.right)
                .attr("height", distrHeight + distrMargin.top + distrMargin.bottom)
                .attr("transform", `translate(${distrLeft}, ${distrTop})`);

    //plot 2: Heatmap for alcohol consumption and final grade

    console.log('processedData', processedData);

    const heatmapData=[];
    for (let walc =1; walc<=5; walc++){
        for (let dalc=1; dalc<=5; dalc++){
            const group = processedData.filter(d=>
                d.Walc === walc && d.Dalc === dalc
            );

            const avgG3 = d3.mean(group, d=> d.G3);

            heatmapData.push({
                Walc: walc,
                Dalc: dalc,
                avgG3: avgG3||0
            });
        }
    }
    console.log("heatmapData", heatmapData)
    


    // x scale
    const x2 = d3.scaleBand()
        .domain([1,2,3,4,5])
        .range([0,distrWidth]);

    // Y scale
    const y2= d3.scaleBand()
        .domain([1,2,3,4,5])
        .range([distrHeight, 0]);

    //color

    const colorScale = d3.scaleSequential()
        .interpolator(d3.interpolateYlOrRd)
        .domain([0, 20]);

    // x axis
    g2.append('g')
        .attr('transform', `translate(0, ${distrHeight})`)
        .call(d3.axisBottom(x2));

    //y axis
    g2.append('g')
        .call(d3.axisLeft(y2));

    // Heatmap squares
    g2.selectAll("rect")
        .data(heatmapData)
        .enter()
        .append("rect")
        .attr("x", d => x2(d.Walc))
        .attr("y", d => y2(d.Dalc))
        .attr("width", x2.bandwidth())
        .attr("height", y2.bandwidth())
        .attr("fill", d => colorScale(d.avgG3))

        .on("mouseover", function(event, d) {
            tooltip
                .style("opacity", 1)
                .style("pointer-events", "all")
                .html(
                    `Walc: ${d.Walc}<br>
                    Dalc: ${d.Dalc}<br>
                    Avg G3: ${d.avgG3.toFixed(2)}`
                );
        })

        .on("mousemove", function(event) {
            tooltip
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY + 10) + "px");
        })

        .on("mouseout", function() {
            tooltip.style("opacity", 0);
        });


    // Title
    g2.append("text")
        .attr("x", distrWidth / 2)
        .attr("y", -15)
        .attr("text-anchor", "middle")
        .attr("font-size", "20px")
        .text("Alcohol Consumption vs Final Grade (G3)");


     // X label
    g2.append("text")
        .attr("x", distrWidth/2)
        .attr("y", distrHeight + 50)
        .attr("font-size", "16px")
        .attr("text-anchor", "middle")
        .text("Weekend Alcohol Consumption (Walc)");


    // Y label
    g2.append("text")
        .attr("x", -(distrHeight/2))
        .attr("y", -40)
        .attr("font-size", "16px")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text("Workday Alcohol Consumption (Dalc)");

    // eatmap Legend
    const legendHeight = 150;
    const legendWidth = 15;

    const legendScale = d3.scaleLinear()
        .domain([0, 20])
        .range([legendHeight, 0]);

    const legendAxis = d3.axisRight(legendScale)
        .ticks(5);

    const defs = svg.append("defs");

    const linearGradient = defs.append("linearGradient")
        .attr("id", "heatmap-gradient")
        .attr("x1", "0%")
        .attr("y1", "100%")
        .attr("x2", "0%")
        .attr("y2", "0%");

    // color stops
    linearGradient.selectAll("stop")
        .data([
            {offset: "0%", color: d3.interpolateYlOrRd(0)},
            {offset: "25%", color: d3.interpolateYlOrRd(0.25)},
            {offset: "50%", color: d3.interpolateYlOrRd(0.5)},
            {offset: "75%", color: d3.interpolateYlOrRd(0.75)},
            {offset: "100%", color: d3.interpolateYlOrRd(1)}
        ])
        .enter()
        .append("stop")
        .attr("offset", d => d.offset)
        .attr("stop-color", d => d.color);

    const hmlegend = g2.append("g")
        .attr("transform", `translate(${distrWidth + 30}, 20)`);

    // gradient rect
    hmlegend.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#heatmap-gradient)");

    // axis
    hmlegend.append("g")
        .attr("transform", `translate(${legendWidth}, 0)`)
        .call(legendAxis);

    // label
    hmlegend.append("text")
        .attr("x", -10)
        .attr("y", -10)
        .text("Avg G3")
        .style("font-size", "12px");


    //Plot 3: Parallel Coordinates Plot


    const dimensions = ['studytime', 'absences', 'Dalc', 'Walc', 'G3'];

    // y scale
    const yScales = {};
    dimensions.forEach(name => {
        yScales[name] = d3.scaleLinear()
            .domain(d3.extent(processedData, d => +d[name]))
            .range([teamHeight, 0]);
    });

    // x scale
    const xScalePCP = d3.scalePoint()
        .range([0, teamWidth])
        .domain(dimensions);

    // lineup
    function path(d) {
        return d3.line()(dimensions.map(p => [xScalePCP(p), yScales[p](d[p])]));
    }

    const g3 = svg.append("g")
        .attr("width", teamWidth + teamMargin.left + teamMargin.right)
        .attr("height", teamHeight + teamMargin.top + teamMargin.bottom)
        .attr("transform", `translate(${teamMargin.left}, ${teamTop})`);

    // plot line
    g3.selectAll("myPath")
        .data(processedData)
        .enter().append("path")
        .attr("class", d => "line line-" + d.id)
        .attr("d", path)
        .style("fill", "none")
        .style("stroke", d => d.sex === 'F' ? '#ff69b4' : '#4682b4')
        .style("opacity", 0.4);

    // y axis
    g3.selectAll("myAxis")
        .data(dimensions).enter()
        .append("g")
        .attr("transform", d => `translate(${xScalePCP(d)})`)
        .each(function(d) { d3.select(this).call(d3.axisLeft(yScales[d])); })
        .append("text")
        .style("text-anchor", "middle")
        .attr("y", -10)
        .text(d => d)
        .style("fill", "black")
        .style("font-size", "12px");

    // title
    g3.append("text")
        .attr("x", teamWidth / 2)
        .attr("y", -25)
        .attr("text-anchor", "middle")
        .attr("font-size", "20px")
        .text("Multivariate Analysis: Factors impacting G3");

    // legend

    const pcpLegend = g3.append("g")
        .attr("transform", `translate(${teamWidth -90}, -35)`); // 放在右上角，标题附近

    // female
    pcpLegend.append("rect")
        .attr("width", 10)
        .attr("height", 10)
        .attr("fill", "#ff69b4");

    pcpLegend.append("text")
        .attr("x", 15)
        .attr("y", 10)
        .style("font-size", "12px")
        .text("Female");

    // male
    pcpLegend.append("rect")
        .attr("y", 20) 
        .attr("width", 10)
        .attr("height", 10)
        .attr("fill", "#4682b4");

    pcpLegend.append("text")
        .attr("x", 15)
        .attr("y", 30)
        .style("font-size", "12px")
        .text("Male");


// interaction
function handleMouseOver(event,d) {
    // other dots and path darken
    d3.selectAll(".scatter-dot").style("opacity", 0.1);
    d3.selectAll(".line").style("opacity", 0.05);

    // highlight selected dot
    d3.select(this)
        .style("opacity", 1)
        .attr("r", 8)
        .style("stroke", "black");

    // highlight corresponding path
    d3.selectAll(".line-" + d.id)
        .style("opacity", 1)
        .style("stroke-width", "4px")
        .style("stroke", "orange");
}

// back to normal
function handleMouseOut(event,d) {
    d3.selectAll(".scatter-dot")
        .style("opacity", 1)
        .attr("r", 5)
        .style("stroke", "none");
        
    d3.selectAll("path")
        .style("opacity", 0.4)
        .style("stroke-width", "1.5px")
        .style("stroke", d => d.sex === 'F' ? '#ff69b4' : '#4682b4');
}


}).catch(function(error){
    console.log(error);
});