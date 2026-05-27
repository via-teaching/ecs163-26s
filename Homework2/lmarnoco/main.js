
//Reading in Data

console.log("MAIN");
console.log("sankey", d3.sankey);

d3.csv("./data/pokemon_alopez247.csv").then(data => {

    
    //Main will be a Sankey Diagram of the 3 starting pokemon and their translation from each 

    //Read in Data for the first 3 Pokemon only (Squritle, Charmander, and Bulbasaur)
    const starting_pokemon = data.slice(0,9);

    const nodes = starting_pokemon.map(d=> ({ name: d.Name, total: d.Total}));

    const links = [];

    const groups = [
        [0,1,2],
        [3,4,5],
        [6,7,8]
    ];

    for(let g = 0; g < 3; g++){
        for(let i = 0; i< groups[g].length - 1; i++) {
            links.push({
                source: groups[g][i],
                target: groups[g][i+1],
                value: nodes[groups[g][i]].total
        });
        }
    }

    const graph = {
        nodes, links
    }

    const width = 1200;
    const height = 300;

    const svgTop = d3.select("#top-vis")
        .attr("width",width)
        .attr("height", height);

    const sankey = d3.sankey()
        .nodeWidth(20)
        .nodePadding(30)
        .extent([[1,1], [width-1, height - 1]]);


    const {nodes: sankeyNodes, links: sankeyLinks } = sankey(graph);

    svgTop.append("g")
    .selectAll("path")
    .data(sankeyLinks)
    .enter()
    .append("path")
    .attr("d", d3.sankeyLinkHorizontal())
    .attr("fill", "none")
    .attr("stroke", (d) => {const groupIndex = Math.floor(d.source.index / 3); 
        return d3.schemeCategory10[groupIndex % 10];
    })
    .attr("stroke-width", d=> Math.max(1, d.width));

    svgTop.append("g")
    .selectAll("rect")
    .data(sankeyNodes)
    .enter()
    .append("rect")
    .attr("x", d=> d.x0)
    .attr("y", d=> d.y0)
    .attr("height", d=> d.y1 - d.y0)
    .attr("width", d=> d.x1 - d.x0)
    .attr("fill", "steelblue")

    svgTop.append("g")
    .selectAll("text")
    .data(sankeyNodes)
    .enter()
    .append("text")
    .attr("x", d=> d.x0 -5)
    .attr("y", d=> (d.y0 + d.y1) / 2)
    .attr("dy", "0.35em")
    .text(d => `${d.name} (${d.total})`);

    svgTop.style("overflow", "visible");


    let single_type = 0;
    let double_type = 0;


    for (let i = 0; i < data.length; i++){
        if(data[i].Type_2 == "" || data[i].Type_2 == null || data[i].Type_2 == " "){
            single_type++;
        }
        else{
            double_type++;
        }
    }

    let processed_data = [single_type, double_type]

    let p_pie = d3.pie()(processed_data);

    let labels = ["Single Type", "Multi-Type"];


    let arc = d3.arc()
    .innerRadius(0)
    .outerRadius(80)

    let svg = d3.select("#bot-vis1")
    .attr("width", 320)
    .attr("height", 200)

    let g = svg.append("g")
    .attr("transform", "translate(100,100)")

    let legend = svg.append("g")
    .attr("transform", "translate(200,20)");

    legend.selectAll("rect")
    .data(labels)
    .join("rect")
    .attr("x",0)
    .attr("y", (d,i) => i * 20)
    .attr("width", 12)
    .attr("height", 12)
    .attr("fill", (d, i) => d3.schemeCategory10[i]);

    legend.selectAll("text")
    .data(labels)
    .join("text")
    .attr("x",18)
    .attr("y", (d,i) => i * 20 + 10)
    .text(d =>d)
    .style("font-size", "12px");
    g.selectAll("path")
    .data(p_pie)
    .join("path")
    .attr("d", arc)
    .attr("fill", (d, i) => d3.schemeCategory10[i]);

    //3RD VISUAL

    let counts = {};

    for (let i = 0; i < data.length; i++){
        let type = data[i].Type_1

        if (!counts[type]){
            counts[type] = 0;
        }
        counts[type]++;
    }

    for (let i = 0; i < data.length; i++){
        let type = data[i].Type_2

        if(type == ""){
            continue;
        }

        if (!counts[type] && type != ""){
            counts[type] = 0;
        }
        counts[type]++;
    }

    let dataset = Object.entries(counts).map(([type, count]) => ({type, count}));

    // Declare the chart dimensions and margins.
    const marginTop = 30;
    const marginRight = 0;
    const marginBottom = 30;
    const marginLeft = 50;

    // Declare the x (horizontal position) scale.
    x = d3.scaleBand()
        .domain(dataset.map(d=> d.type))
        .range([marginLeft, width - marginRight])
        .padding(0.5);

    // Declare the y (vertical position) scale.
    y = d3.scaleLinear()
        .domain([0, d3.max(dataset, d=> d.count)])
        .nice()
        .range([height - marginBottom, marginTop]);

    // Create the SVG container.
    svg = d3.select("#bot-vis2")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .attr("style", "max-width: 100%; height: auto;");

    // Add a rect for each bar.
    svg.append("g")
        .attr("fill", "steelblue")
    .selectAll()
    .data(dataset)
    .join("rect")
        .attr("x", (d) => x(d.type))
        .attr("y", (d) => y(d.count))
        .attr("height", (d) => y(0) - y(d.count))
        .attr("width", x.bandwidth());

    // Add the x-axis and label.
    svg.append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(d3.axisBottom(x))


    // Add the y-axis and label, and remove the domain line.
    svg.append("g")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(d3.axisLeft(y))

})


