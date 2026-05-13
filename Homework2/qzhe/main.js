let abFilter = 25;
const width = window.innerWidth;
const height = window.innerHeight;


let scatterLeft = 700, scatterTop = 0;
let scatterMargin = {top: 20, right: 40, bottom: 50, left: 70},
scatterWidth = 600 - scatterMargin.left - scatterMargin.right,
scatterHeight = 350 - scatterMargin.top - scatterMargin.bottom;

let teamLeft = 0, teamTop = 0;
let teamMargin = {top: 20, right: 40, bottom: 50, left: 70},
teamWidth = 600 - teamMargin.left - teamMargin.right,
teamHeight = 350 - teamMargin.top - teamMargin.bottom;

let distrLeft = 0, distrTop = 350;
let distrMargin = {top: 20, right: 40, bottom: 50, left: 70},
distrWidth = width - 200 - distrMargin.left - distrMargin.right,
distrHeight = height - 350 - distrMargin.top - distrMargin.bottom;




// plots
d3.csv("data/mxmh_survey_results.csv").then(rawData =>{
    console.log("rawData", rawData);

    rawData.forEach(function(d){
        d["Hours per day"] = Number(d["Hours per day"]);
        d.Age = Number(d.Age);

        if(d.Age < 18){
            d.ageGroup = "<18";
        }
        else if(d.Age <= 25){
            d.ageGroup = "18-25";
        }
        else if(d.Age <= 35){
            d.ageGroup = "26-35";
        }
        else if(d.Age <= 50){
            d.ageGroup = "36-50";
        }
        else{
            d.ageGroup = "50+";
        }

    });

        


    //Scatter plot
    const svg = d3.select("svg");

    const colorScale = d3.scaleOrdinal(d3.schemeTableau10).domain(rawData.map(d => d['Primary streaming service']));

    const g1 = svg.append("g")
                .attr("width", scatterWidth + scatterMargin.left + scatterMargin.right)
                .attr("height", scatterHeight + scatterMargin.top + scatterMargin.bottom)
                .attr("transform", `translate(${scatterLeft + scatterMargin.left}, ${scatterTop + scatterMargin.top})`);


    

    g1.append("text")
    .attr("x", scatterWidth / 2)
    .attr("y", 5)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .text("Age vs Daily Listening Hours");

    // X label
    g1.append("text")
    .attr("x", scatterWidth / 2)
    .attr("y", scatterHeight + 50)
    .attr("font-size", "15px")
    .attr("text-anchor", "middle")
    .text("Age");


    // Y label
    g1.append("text")
    .attr("x", -(scatterHeight / 2))
    .attr("y", -40)
    .attr("font-size", "15px")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("Hours Per Day");

    // X ticks
    const x1 = d3.scaleLinear()
    .domain([0, d3.max(rawData, d => d.Age)])
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
    .domain([0, d3.max(rawData, d => d["Hours per day"])])
    .range([scatterHeight, 0]);

    const yAxisCall = d3.axisLeft(y1)
                        .ticks(13);
    g1.append("g").call(yAxisCall);


    // circles
    const circles = g1.selectAll("circle").data(rawData);

    circles.enter().append("circle")
         .attr("cx", d => x1(d.Age))
         .attr("cy", d => y1(d["Hours per day"]))
         .attr("r", 5)
         .attr("fill", d => colorScale(d['Primary streaming service']))
         .attr("opacity", 0.7);

        const services_color = colorScale.domain();

    const legend = g1.append("g")
        .attr("transform", `translate(${scatterWidth - 100}, 0)`);

    services_color.forEach((service, i) => {
        const legendRow = legend.append("g")
            .attr("transform", `translate(0, ${i * 15})`);


        legendRow.append("rect")
            .attr("width", 10)
            .attr("height", 10)
            .attr("fill", colorScale(service))
            .attr("opacity", 0.7);

        legendRow.append("text")
            .attr("x", 20)
            .attr("y", 10)
            .attr("text-anchor", "start")
            .style("text-transform", "capitalize")
            .attr("font-size", "12px")
            .text(service);
    });





    //Bar Chart

    const hours = rawData.reduce((s, d) => {
        const service = d['Primary streaming service'];
        const hours = Number(d['Hours per day']);
        s[service] = hours +  (s[service] || 0);
        return s;
    }, {});

    const bar = Object.keys(hours).map((key) => ({ service: key, total_hours: hours[key] }));
    console.log("bar", bar);

    const g2 = svg.append("g")
                .attr("width", teamWidth + teamMargin.left + teamMargin.right)
                .attr("height", teamHeight + teamMargin.top + teamMargin.bottom)
                .attr("transform", `translate(${teamMargin.left}, ${teamMargin.top})`);
    
    g2.append("text")
    .attr("x", scatterWidth / 2)
    .attr("y", 5)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .text("Total Listening Hours for each Streaming Service");


    // X label
    g2.append("text")
    .attr("x", teamWidth / 2)
    .attr("y", teamHeight + 50)
    .attr("font-size", "15px")
    .attr("text-anchor", "middle")
    .text("Primary Streaming Service");


    // Y label
    g2.append("text")
    .attr("x", -(teamHeight / 2))
    .attr("y", -40)
    .attr("font-size", "15px")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("Total Hours");

    // X ticks
    const x2 = d3.scaleBand()
    .domain(bar.map(d => d.service))
    .range([0, teamWidth])
    .paddingInner(0.3)
    .paddingOuter(0.2);

    const xAxisCall2 = d3.axisBottom(x2);
    g2.append("g")
    .attr("transform", `translate(0, ${teamHeight})`)
    .call(xAxisCall2)
    .selectAll("text")
        .attr("y", "10")
        .attr("x", "-5")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-40)");

    // Y ticks
    const y2 = d3.scaleLinear()
    .domain([0, d3.max(bar, d => d.total_hours)])
    .range([teamHeight, 0])
    .nice();

    const yAxisCall2 = d3.axisLeft(y2)
                        .ticks(6);
    g2.append("g").call(yAxisCall2);

    // bars
    const bars = g2.selectAll("rect").data(bar);

    bars.enter().append("rect")
    .attr("y", d => y2(d.total_hours))
    .attr("x", d => x2(d.service))
    .attr("width", x2.bandwidth())
    .attr("height", d => teamHeight - y2(d.total_hours))
    .attr("fill", d => colorScale(d.service));


    //Sankey diagram

    
    const graph_data = rawData.reduce((s, d) => {
        const age_service = d.ageGroup + " -> " + d["Primary streaming service"];
        const service_genre = d["Primary streaming service"] + " -> " + d["Fav genre"];

        s[age_service] = 1 + (s[age_service] || 0);
        s[service_genre] = 1 + (s[service_genre] || 0);

        return s;
    }, {});

    const graph = {
        nodes: [],
        links: []
    };

    const node_info = {};


    Object.keys(graph_data).forEach(function(key){
        const arrowPos = key.indexOf(" -> ");
        const sourceName = key.substring(0, arrowPos);
        const targetName = key.substring(arrowPos + 4);

        if(node_info[sourceName] == undefined){
            node_info[sourceName] = graph.nodes.length;
            graph.nodes.push({name: sourceName});
        }

        if(node_info[targetName] == undefined){
            node_info[targetName] = graph.nodes.length;
            graph.nodes.push({name: targetName});
        }

        graph.links.push({
            source: node_info[sourceName],
            target: node_info[targetName],
            value: graph_data[key]
        });
    });

    



    const g3 = svg.append("g")
            .attr("width", distrWidth + distrMargin.left + distrMargin.right)
            .attr("height", distrHeight + distrMargin.top + distrMargin.bottom)
            .attr("transform", `translate(${distrLeft + distrMargin.left}, ${distrTop + distrMargin.top})`);

      var sankeyColor = d3.scaleOrdinal(d3.schemeTableau10);


    // X label
    g3.append("text")
    .attr("x", distrWidth / 2)
    .attr("y", distrHeight)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .text("Age Group -> Streaming Service -> Favorite Genre");


    // Y label
    g3.append("text")
    .attr("x", -(distrHeight / 2))
    .attr("y", -40)
    .attr("font-size", "15px")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("Number of People");



  

    var sankey = d3.sankey()
        .nodeWidth(10)
        .nodePadding(20)
        .size([distrWidth, distrHeight]);

    sankey
        .nodes(graph.nodes)
        .links(graph.links)
        .layout(1);

  
    var link = g3.append("g")
        .selectAll(".link")
        .data(graph.links)
        .enter()
        .append("path")
            .attr("class", "link")
            .attr("d", sankey.link())
            .style("fill", "none")
            .style("stroke", function(d) {
                const services = colorScale.domain();
            
                if (services.includes(d.source.name)) {
                    return colorScale(d.source.name);
                } else if (services.includes(d.target.name)) {
                    return colorScale(d.target.name);
                }
            })
            .style("stroke-opacity", 0.5)
            .style("stroke-width", function(d) { return Math.max(1, d.dy); })
            .sort(function(a, b) { return b.dy - a.dy; });


     var node = g3.append("g")
        .selectAll(".node")
        .data(graph.nodes)
        .enter().append("g")
        .attr("class", "node")
        .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });


    node.append("rect")
        .attr("height", function(d) { return d.dy; })
        .attr("width", sankey.nodeWidth())
        .style("fill", function(d) { return d.color = sankeyColor(d.name); })
        .style("stroke", function(d) { return d3.rgb(d.color).darker(2); })
        .append("title")
            .text(function(d) { return d.name + "\n" + d.value + " people"; });



    node.append("text")
        .attr("x", -6)
        .attr("y", function(d) { return d.dy / 2; })
        .attr("dy", ".35em")
        .attr("text-anchor", "end")
        .attr("font-size", "10px")
        .text(function(d) { return d.name; })
        .filter(function(d) { return d.x < distrWidth / 2; })
            .attr("x", 6 + sankey.nodeWidth())
            .attr("text-anchor", "start");


    

    }).catch(function(error){
    console.log(error);



});


