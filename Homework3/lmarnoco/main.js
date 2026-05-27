
//Reading in Data


d3.csv("./data/pokemon_alopez247.csv").then(data => {
    let grouped = {};

    data.forEach(element => {
        const gen = +element.Generation
        if(!grouped[gen]){
            grouped[gen] = {};
        }

        [element.Type_1, element.Type_2].forEach(type=> {
            if(!type) return;

            grouped[gen][type] = (grouped[gen][type] || 0) + 1;
        })
    });

    //Stream Graph Separated by Generation Including Mouse Selection on specific 
    let structure = Object.entries(grouped).map(([Generation, types]) => ({Generation: +Generation, ...types})).sort((a,b) => a.Generation - b.Generation);

    let keys = Array.from(new Set(structure.flatMap(d => Object.keys(d).filter(k => k !== "Generation"))));

    let stack = d3.stack()
    .keys(keys)
    .value((d, key) => d[key] ?? 0)
    .offset(d3.stackOffsetWiggle);

    let stackedData = stack(structure);

    const width = 1200;
    const height = 400;
    const margin = {right : 160, bottom : 5, left : 40, top : 70};

    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom;

    let SvgTop = d3.select("#top-vis")
    .attr("width" , width)
    .attr("height", height);

    let gTop = SvgTop.append("g")
        .attr("transform", `translate(${margin.left}, 0)`);
    
    let streamX = d3.scalePoint()
    .domain(structure.map(d => +d.Generation))
    .range([0, innerWidth])
    .padding(0.5);

    let streamY = d3.scaleLinear()
    .domain([d3.min(stackedData, layer => d3.min(layer, d => d[0])),
            d3.max(stackedData, layer => d3.max(layer, d=> d[1]))])
    .range([innerHeight + margin.bottom, 0]);

    let area = d3.area()
    .x(d => streamX(+d.data.Generation))
    .y0(d => streamY(d[0]))
    .y1(d => streamY(d[1]))
    .curve(d3.curveMonotoneX);

    let xAxis = d3.axisBottom(streamX).tickFormat(d3.format("d"));

    gTop.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(xAxis)

    gTop.append("text")
        .attr("class", "x-axis")
        .attr("x", innerWidth/2)
        .attr("y", innerHeight + 40)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font=weight", "bold")
        .text("Generations");
        

    let color = d3.scaleOrdinal()
    .domain(keys)
    .range(d3.quantize(d3.interpolateRainbow, keys.length));

    let legendTop = gTop.append("g")
    .attr("transform", `translate(${innerWidth +20}, 20)`);

    legendTop.selectAll("g")
    .data(keys)
    .join("g")
    .attr("transform", (d, i) => `translate(0, ${i * 18})`)
    .each(function(d,i) {
    let gTop = d3.select(this);

    gTop.append("rect")
    .attr("width", 12)
    .attr("height", 12)
    .attr("fill", d => color(d));

    gTop.append("text")
    .attr("x", 18)
    .attr("y", 10)
    .text(d)
    .style("font-size", "12px")
    .attr("alignment-baseline", "middle");
    });

// let paths = gTop.selectAll("path")
//         .data(stackedData)
//         .enter()
//         .append("path")
//         .attr("d", area)
//         .attr("fill", d => color(d))
//         .attr("stroke", "#000")
//         .attr("stroke-width", 0.5)
//         .attr("opacity", 0.8);



function play(generation_to_play){

    let filtered = structure.map(d => {
        let row = {Generation : d.Generation};
        keys.forEach(k => {
            row[k] = d.Generation <= generation_to_play ? (d[k] || 0) : 0;
        });
        return row;
    });

    let newStacked = stack(filtered);
    // x.domain(filtered.map(d => +d.Generation));
    
    

    gTop.select(".x-axis").call(xAxis);

    let paths = gTop.selectAll("path.stream_layer")
            .data(newStacked, d => d.key);

    paths.enter()
        .append("path")
        .attr("class", "stream_layer")
        .attr("stroke", "#000")
        .attr("stroke-width", 0.5)
        .merge(paths)
        .attr("fill", d => color(d.key))
        .attr("d", area);

    paths.exit().remove();
}
let current_gen = 1;


play(current_gen);

function onKey(event){
    if (event.code == "Space"){
        event.preventDefault();

        current_gen++;

        if(current_gen > 6){
            current_gen = 1;
        }
        play(current_gen);

    }
    else if(event.code == "Escape"){
        event.preventDefault();
        d3.select("#details").remove();
    }
}


document.addEventListener("keydown", onKey);

    //2nd Visual

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

    let svg1 = d3.select("#bot-vis1")
    .attr("width", 320)
    .attr("height", 200)

    let g = svg1.append("g")
    .attr("transform", "translate(100,100)")

    let legend = svg1.append("g")
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


    d3.select("#bot-vis1")
    .on(
        "mouseenter",
        function(){
            d3.event.preventDefault();

            
                g.transition()
                    .duration(300)
                    .attr("transform", "translate(100, 100) scale(1.3)");

            d3.select("#bot-vis1")
                .append("text")
                .attr("id", "single-text")
                .attr("x", "10")
                .attr("y", "20")
                .text(`Single Type : ${single_type} `);
                
            d3.select("#bot-vis1")
                .append("text")
                .attr("id", "double-text")
                .attr("x", "10")
                .attr("y", "40")
                .text(`Double    Type : ${double_type} `);
        }
    )
    .on("mouseleave", function() {

        g.transition()
        .duration(300)
        .attr("transform", "translate(100, 100) scale(1)");

        d3.select("#double-text").remove();
         d3.select("#single-text").remove();
    });


    //3RD VISUAL

    let typeMap = {};

    for (let i = 0; i < data.length; i++){
        let type = data[i].Type_1

        if (!typeMap[type]){
            typeMap[type] = [];
        }
        typeMap[type].push(data[i]);
    }

    for (let i = 0; i < data.length; i++){
        let type = data[i].Type_2

        if(type == ""){
            continue;
        }

        if (!typeMap[type] && type != ""){
            typeMap[type] = [];
        }
        typeMap[type].push(data[i]);
    }

    let dataset = Object.entries(typeMap).map(([type, values]) => ({type, count : values.length}));

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
        .range([innerHeight, 0]);

    // Create the SVG container.
    let svg2 = d3.select("#bot-vis2")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .attr("style", "max-width: 100%; height: auto;");

    // Add a rect for each bar.
    svg2.append("g")
        .attr("fill", "steelblue")
    .selectAll()
    .data(dataset)
    .join("rect")
        .attr("x", (d) => x(d.type))
        .attr("y", (d) => y(d.count))
        .attr("height", (d) => y(0) - y(d.count))
        .attr("width", x.bandwidth())
        .on("click", function(){

            let d = this.__data__;

            let list = typeMap[d.type] 

            showList(d.type, list);
        });

    // Add the x-axis and label.
    svg2.append("g")
        .attr("transform", `translate(0,${height - marginBottom})`)
        .call(d3.axisBottom(x))


    // Add the y-axis and label, and remove the domain line.
    svg2.append("g")
        .attr("transform", `translate(${marginLeft},0)`)
        .call(d3.axisLeft(y))


function showList(type, list){


    d3.select("#details").remove();

    let container = d3.select("body")
        .append("div")
        .attr("id", "details")
        .style("margin-top", "20px")
        .style("max-height", "300px")
        .style("overflow", "auto")
        .style("padding", "10px")

        container.append("h3")
            .text(`Pokemon with type: ${type}`);
        
        let rows = container.append("div");

        rows.selectAll("div")
            .data(list)
            .enter()
            .append("div")
            .text(d => `${d.Name} | Gen ${d.Generation} | Overall Stats ${d.Total}`);
}

})

