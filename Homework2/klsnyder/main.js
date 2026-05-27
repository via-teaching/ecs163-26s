//****** AI credits: *******//
/*

I used AI to explain the code and what it does in order to understand
what lines to modify.

I used AI to create a template for me to modify to create
a parallel coordinates plot, using the prompt:
"Generate a an example of how to create a parallel coordinates plot 
    using D3.js but DO NOT make it related to the project since I
    I want to be able to learn how to code it myself."

*/

let statFilter = 300; // keep only the strong pokemon

const width = window.innerWidth;
const height = window.innerHeight;

let scatterLeft = 0, scatterTop = 0;
let scatterMargin = {top: 60, right: 30, bottom: 30, left: 60},
    scatterWidth = 600 - scatterMargin.left - scatterMargin.right,
    scatterHeight = 500 - scatterMargin.top - scatterMargin.bottom;

let distrLeft = 400, distrTop = 0;
let distrMargin = {top: 10, right: 30, bottom: 30, left: 60},
    distrWidth = 400 - distrMargin.left - distrMargin.right,
    distrHeight = 350 - distrMargin.top - distrMargin.bottom;

let teamLeft = 0, teamTop = 600;
let teamMargin = {top: 10, right: 30, bottom: 30, left: 60},
    teamWidth = 600 - teamMargin.left - teamMargin.right,
    teamHeight = 250 - teamMargin.top - teamMargin.bottom;

// plots
d3.csv("pokemon.csv").then(rawData =>{
    console.log("rawData", rawData);

    // clean non string attributes
    rawData.forEach(function(d){
        d.Attack = Number(d.Attack);
        d.Defense = Number(d.Defense);
        d.Speed = Number(d.Speed);
        d.HP = Number(d.HP);
        d.Total = Number(d.Total);
    });


    const filteredData = rawData.filter(d=>d.Total>statFilter);

    const processedData = filteredData.map(d=>{
                          return {
                              "x_val":d.Attack,
                              "y_val":d.Defense,
                              "type1":d.Type_1,
                              "radius": d.Speed,
                              "color": d.Color
                          };
    });
    console.log("processedData", processedData);

    //plot 1: Scatter Plot
    const svg = d3.select("svg");

    const g1 = svg.append("g")
                .attr("width", scatterWidth + scatterMargin.left + scatterMargin.right)
                .attr("height", scatterHeight + scatterMargin.top + scatterMargin.bottom)
                .attr("transform", `translate(${scatterMargin.left}, ${scatterMargin.top})`);

    // append scattereplot title
    g1.append("text")
        .attr("x", scatterWidth / 2) 
        .attr("y", -20)              
        .attr("font-size", "18px")
        .attr("font-weight", "bold")
        .attr("text-anchor", "middle")
        .text("Pokemon Combat Stats: Attack vs. Defense vs. Speed");

    // X label
    g1.append("text")
    .attr("x", scatterWidth / 2)
    .attr("y", scatterHeight + 50)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .text("Attack");


    // Y label
    g1.append("text")
    .attr("x", -(scatterHeight / 2))
    .attr("y", -40)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("Defense");

    // X ticks
    const x1 = d3.scaleLinear()
    .domain([0, d3.max(processedData, d => d.x_val)])
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
    .domain([0, d3.max(processedData, d => d.y_val)])
    .range([scatterHeight, 0]);

    const yAxisCall = d3.axisLeft(y1)
                        .ticks(13);
    g1.append("g").call(yAxisCall);

    // circles
    const circles = g1.selectAll("circle").data(processedData);

    circles.enter().append("circle")
         .attr("cx", d => x1(d.x_val))
         .attr("cy", d => y1(d.y_val))
         .attr("r", d => d.radius / 25)
         .attr("fill", "#69b3a2");


// add a legend to the scatterplot

    const legend = svg.append("g")
                .attr("transform", `translate(${scatterWidth -20}, 60)`);

    // legend.append("circle")
    //     .attr("r", 10)
    //     // .attr("length", 50)
    //     // .attr("width", 50)
    //     .attr("fill", "#69b3a2")
    //     .attr("opacity", 0.6)

    legend.append("rect")
        .attr("height", 40)
        .attr("width", 95)
        .attr("fill", "#69b3a2")
        .attr("opacity", 0.6)

    legend.append("text")
        .attr("x", 10)
        .attr("y", 22)
        .attr("font-size", "12px")
        .attr("alignment-baseline", "middle")
        .text("Radius = Speed");



// /////////////////////////////////// PLOT 2 BELOW /////////////////////////////////////


//     const g2 = svg.append("g")
//                 .attr("width", distrWidth + distrMargin.left + distrMargin.right)
//                 .attr("height", distrHeight + distrMargin.top + distrMargin.bottom)
//                 .attr("transform", `translate(${distrLeft}, ${distrTop})`);


//     // 1. Data: Each object is one line on the chart
//     const data = processedData;
//     // const data = [
//     //     { type_1: "Grass", Color: Green, Body_Style: quadruped, Egg_Group_2: grass },
//     //     { type_1: "Fire", Color: Red, Body_Style: bipedal_tailed, Egg_Group_2: Dragon },
//     //     { type_1: "Water", Color: Blue, Body_Style: bipedal_tailed, Egg_Group_2: Water_1 }
//     // ];

//     // 2. Dimensions: These are the columns we want to show as vertical axes
//     const dimensions = ["Color", "Body_Style", "Egg_Group_2"];

//     // 3. Create a Y-scale for each dimension
//     const yScales = {};
//     dimensions.forEach(dim => {
//         yScales[dim] = d3.scaleLinear()
//             .domain(d3.extent(data, d => d[dim])) // Min to Max for that specific stat
//             .range([height, 0]);
//     });

//     // 4. Create an X-scale to position the axes horizontally
//     const xScale = d3.scalePoint()
//         .range([0, width])
//         .domain(dimensions);

//     // 5. The Line Generator
//     // This function tells D3 how to connect the dots across the dimensions
//     function path(d) {
//         return d3.line()(dimensions.map(dim => {
//             return [xScale(dim), yScales[dim](d[dim])];
//         }));
//     }

//     // 6. Draw the Lines
//     svg.selectAll("myPath")
//         .data(data)
//         .enter().append("path")
//         .attr("d", path)
//         .style("fill", "none")
//         .style("stroke", "#69b3a2")
//         .style("opacity", 0.5);

//     // 7. Draw the Axes
//     svg.selectAll("myAxis")
//         .data(dimensions).enter()
//         .append("g")
//         .attr("transform", d => `translate(${xScale(d)})`)
//         .each(function(d) { d3.select(this).call(d3.axisLeft(yScales[d])); })
//         .append("text")
//         .style("text-anchor", "middle")
//         .attr("y", -10)
//         .text(d => d)
//         .style("fill", "black");

//       /////////////////////////////////// PLOT 2 ABOVE /////////////////////////////////////

    //plot 3: Bar Chart for pokemon count by type

    const typeCounts = processedData.reduce((s, { type1 }) => (s[type1] = (s[type1] || 0) + 1, s), {});
    const teamData = Object.keys(typeCounts).map((key) => ({ type1: key, count: typeCounts[key] }));
    console.log("teamData", teamData);


    const g3 = svg.append("g")
                .attr("width", teamWidth + teamMargin.left + teamMargin.right)
                .attr("height", teamHeight + teamMargin.top + teamMargin.bottom)
                .attr("transform", `translate(${teamMargin.left}, ${teamTop})`);

    g3.append("text")
        .attr("x", teamWidth / 2)
        .attr("y", -20)
        .attr("font-size", "22px")
        .attr("font-weight", "bold")
        .attr("text-anchor", "middle")
        .text("Distribution of Pokemon by Type");

    // X label
    g3.append("text")
    .attr("x", teamWidth / 2)
    .attr("y", teamHeight + 60)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .text("Pokemon Type");


    // Y label
    g3.append("text")
    .attr("x", -(teamHeight / 2))
    .attr("y", -40)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("Number of Pokemon");

    // X ticks
    const x2 = d3.scaleBand()
    .domain(teamData.map(d => d.type1))
    .range([0, teamWidth])
    .paddingInner(0.3)
    // .paddingOuter(0.2);

    const xAxisCall2 = d3.axisBottom(x2);
    g3.append("g")
    .attr("transform", `translate(0, ${teamHeight})`)
    .call(xAxisCall2)
    .selectAll("text")
        .attr("y", "10")
        .attr("x", "-5")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-40)");

    // Y ticks
    const y2 = d3.scaleLinear()
    .domain([0, d3.max(teamData, d => d.count)])
    .range([teamHeight, 0])
    .nice();

    const yAxisCall2 = d3.axisLeft(y2)
                        .ticks(6);
    g3.append("g").call(yAxisCall2);

    // bars
    const bars = g3.selectAll("rect").data(teamData);

    bars.enter().append("rect")
    .attr("y", d => y2(d.count))
    .attr("x", d => x2(d.type1))
    .attr("width", x2.bandwidth())
    .attr("height", d => teamHeight - y2(d.count))
    .attr("fill", "steelblue");


    }).catch(function(error){
    console.log(error);
});