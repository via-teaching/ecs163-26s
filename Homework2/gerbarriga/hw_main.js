



const width = window.innerWidth
const height = window.innerHeight

const margin = {top: 10, bottom: 30, left:20, right:20}

let scatter_dim = {width: width/2 -150, height: height/2}

//dont forget ot translate over the graph so it doesnt overlap
let heat_map_dim = {width: width/2, height: height/2}

let sankey_dim = {width:width, height: height/2}


function processing_data(raw_data){

    raw_data.forEach(d => {
        d.Height_m = Number(d.Height_m)
        d.Weight_kg = Number(d.Weight_kg)
        d.Total = Number(d.Total)
        d.Catch_Rate = Number(d.Catch_Rate)
        d.Generation = Number(d.Generation)
        
    });

    //A map wiht height vs weight of all pokemon for a scatter plot
    let scatter_data = raw_data.map(d =>({
        height: d.Height_m,
        weight: d.Weight_kg,
    }))

    //got the variables for the stream graph
    let stream_data = raw_data.map(d => ({
        bst: d.Total,
        rate: d.Catch_Rate
    }))

    //making the map to later define the paths on the sankey
    let sankey_data = raw_data.map(d =>({
        pokemon: d.Name,
        gen: d.Generation,
        primary: d.Type_1,
        secondary: d.Type_2 || "None"
    }))

    return {scatter_data, stream_data, sankey_data}

}






//height agaisnt weight as a scatterplot
//BSt against catch rate as heat map graph
//pokemon -> gen -> first type-> second type sankey

d3.csv("pokemon.csv").then(raw_data => {
    const data = processing_data(raw_data)

    console.log(data)
    window.data = data

    const g1_yaxis_ticks = [0,5, 25,50,100,150,200,300,400,500,600,700,800,900]
    const g1_xaxis_ticks= [1,2,3,4,5,6,7,8,9,10,11,12,13,14]
    const svg = d3.select("svg")
        .attr("width", width)
        .attr("height", height)



//      Scatter plot code with height as the x axis and weight as the y axis
    const g1 = svg.append("g")
        .attr("transform", `translate(${margin.left+50},${margin.top})`)


    //X and Y axis use a sqrt scale due to most of the data being compressed aroudn the 2,200 interval if a linear scale is used
    //x scale
    const x1 = d3.scaleSqrt()
        .domain([0, d3.max(data.scatter_data, d => d.height)])
        .range( [0, scatter_dim.width])

    // y scale
    const y1 = d3.scaleSqrt()
        .domain([
            0.1, d3.max(data.scatter_data, d=> d.weight)
        ])
        .range([scatter_dim.height, 0])
    
    //x axis marks
    const x1_axis = d3.axisBottom(x1)
        .tickValues(g1_xaxis_ticks)

    //make the x-axis
    g1.append("g")
        .attr("transform", `translate(0,${scatter_dim.height})`)
        .call(x1_axis)
    
    //y axis marks
    const y1_axis = d3.axisLeft(y1)
        .tickValues(g1_yaxis_ticks)

    //make the y-axis
    g1.append("g").call(y1_axis)


    //Putting the axis labels

    //x_axis label
    g1.append("text")
        .attr("x", scatter_dim.width/2)
        .attr("y", scatter_dim.height+50)
        .attr("font-size", "20px")
        .attr("text-anchor", "middle")
        .text("Height in meter(s)")
    
    //y-axis label
    g1.append("text")
        .attr("x", -(scatter_dim.height/2))
        .attr("y", -35)
        .attr("font-size", "20px")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text("Weight in Kg")

    g1.selectAll("circle")
        .data(data.scatter_data)
        .join("circle")
        .attr("cx", d=> x1(d.height))
        .attr("cy", d=> y1(d.weight))
        .attr("r", 8)
        .attr("fill", "grey")
        .attr("opacity", 0.4)
//end of scatter plot code


















//      Heat map code for plotting with total stats in the x axis and catch rate on the y. Gradient of cyan to bright green as more pokemon fall into 
//           a specific bin. White means no pokemon are in that bin a all
    const g2 = svg.append("g")
        .attr("transform", `translate(${heat_map_dim.width}, 10)`)

    const x_bins = 20
    const y_bins = 20

    
    const xExtent = d3.extent(data.stream_data, d => d.bst);
    const yExtent = d3.extent(data.stream_data, d => d.rate);

    const grid = new Map();

    data.stream_data.forEach(d => {

        let x_key = Math.floor((x_bins-1) * (d.bst - xExtent[0])/ (xExtent[1]- xExtent[0]))
        let y_key = Math.floor((y_bins-1) *( d.rate - yExtent[0])/ (yExtent[1] - yExtent[0]))



        x_key = Math.max(0, Math.min(x_bins - 1, x_key));
        y_key = Math.max(0, Math.min(y_bins - 1, y_key));

        const key = `${x_key}-${y_key}`;
        grid.set(key, (grid.get(key) || 0) + 1);
    });

    let maxValue = 0;
    grid.forEach(v => {
        if (v > maxValue) maxValue = v;
    });


    const color = d3.scaleLinear()
        .domain([0,maxValue])
        .range(["#2794bf", "#44f405"])

    const cell_width = heat_map_dim.width/ x_bins
    const cell_height = heat_map_dim.height / y_bins

    //creating the cells and biding an elemnt of the map to them
    g2.selectAll("rect")
        .data(Array.from(grid.entries()))
        .join("rect")
        .attr("x", d => +d[0].split("-")[0] * cell_width)
        .attr("y", d => heat_map_dim.height - (+d[0].split("-")[1] + 1) * cell_height)
        .attr("width", cell_width)
        .attr("height", cell_height)
        .attr("fill", d=> color(d[1]))
        .attr("stroke", "#e4bfbf")


    //x scale
    const x_scale = d3.scaleLinear()
        .domain([180,780])
        .range([0,heat_map_dim.width])
    
    //y scale
    const y_scale = d3.scaleLinear()
        .domain([3,255])
        .range([heat_map_dim.height, 0])

    //creates x-axis at bottom
    g2.append("g")
        .attr("transform", `translate(0,${heat_map_dim.height})`)
        .call(d3.axisBottom(x_scale))
    
    //reates y axis on the left
    g2.append("g")
        .call(d3.axisLeft(y_scale))

    //lableing the x and y axis
    g2.append("text")
        .attr("x", heat_map_dim.width/2)
        .attr("y", heat_map_dim.height +45)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .text("Total Stats")

    g2.append("text")
        .attr("x", -heat_map_dim.height/2)
        .attr("y", -45)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .attr("font-size", "20px")
        .text("Catch Rate")

    //making the legend on the top right corner
    const legend_h = 150
    const legend_w = 20
    const defs = svg.append("defs")

    //vertical color gradient for our key/legend
    const gradient = defs.append("linearGradient")
        .attr("id", "heatmapLegend")
        .attr("x1", "0%")
        .attr("x2", "0%")
        .attr("y1", "100%")
        .attr("y2", "0%")

    //bottom color gradient
    gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#2794bf")

    //top color gradient
    gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#44f405")

    //creating the object in the top right area since that area is mostly empty
    const legend = g2.append("g")
        .attr("transform", `translate(${heat_map_dim.width -100}, 25)`)
    
    //filling the bar with the gradient
    legend.append("rect")
        .attr("width", legend_w)
        .attr("height", legend_h)
        .style("fill", "url(#heatmapLegend)")
        .style("stroke", "black")

    //top label
    legend.append("text")
        .attr("x", legend_w/2)
        .attr("y", -5)
        .attr("text-anchor", "middle")
        .attr("font-size", "15px")
        .text("More dense")
    
    //bottom label
    legend.append("text")
        .attr("x", legend_w/2)
        .attr("y", legend_h+15)
        .attr("text-anchor", "middle")
        .attr("font-size", "15px")
        .text("Less dense")

            
// End of heat map code







//        Code for sankey that has the following format:
//        Pokemoon -> Generation -> Primary type -> Secondary type

    //mkaing the graph below the other 2
    const g3= svg.append("g")
        .attr("transform", `translate(0, ${height/2 +50})`)

    //mkaing the maps of the differentn connections to make the sankey
    let gens = new Map()
    let first = new Map()
    let second = new Map()

    //processing the data for the maps
    data.sankey_data.forEach(d=> {
        let g = d.gen
        let t1 = d.primary
        let t2 = d.secondary

        gens.set(g, (gens.get(g) ||0)+1)
        first.set(`${g}->${t1}`, (first.get(`${g}->${t1}`) ||0 ) +1)

        if (t2){
            second.set(`${t1}->${t2}`, (second.get(`${t1}->${t2}`)|| 0) +1)
        }
    })
    //turning maps into arrays 
    gens = Array.from(gens.entries())
    first = Array.from(first.entries())
    second = Array.from(second.entries())

    //making the nodes
    let nodes = [
        {id: "all", name: "Pokemon"},

        ...gens.map(d =>({
            id: `Gen ${d[0]}`, name: `Gen ${d[0]}`
        })),

        //a bunch of googline and some ai gave me the follwing for formating the data into the proper type

        ...[...new Set(first.map(d => d[0].split("->")[1]))].map(t => ({
        id: `t1_${t}`,
        name: t
        })),

    ...[...new Set(second.map(d => d[0].split("->")[1]))].map(t => ({
        id: `t2_${t}`,
        name: t
        }))
    ]

    let node_index = new Map(nodes.map((d,i) => [d.id, i]))

    //creating the links between nodes
    let links = []

    //pokemon to gen
    gens.forEach(([gen,count]) =>{
        links.push({
            source: node_index.get("all"),
            target: node_index.get(`Gen ${gen}`),
            value: count
        })
    })

    //gen to first type
    first.forEach(([key,count]) => {
        let [gen, t1] = key.split("->")

        links.push({
            source: node_index.get(`Gen ${gen}`),
            target: node_index.get(`t1_${t1}`),
            value: count
        })
    })

    //primary type to secondary type
    second.forEach(([key,count]) => {
        let [t1,t2] = key.split("->")

        links.push({
            source: node_index.get(`t1_${t1}`),
            target: node_index.get(`t2_${t2}`),
            value: count
        })
    })

    //making the sankey, had to add an extra souce to the html file for this
    const sankey = d3.sankey()
        .nodeWidth(25)
        .nodePadding(10)
        .extent([
            [10,25],
            [sankey_dim.width*.98, sankey_dim.height*.8]
        ])

    const graph = sankey({
        nodes: nodes.map(d=> Object.assign({},d)),
        links: links.map(d=> Object.assign({},d))
    })

    //showing the links
    g3.append("g")
        .selectAll("path")
        .data(graph.links)
        .join("path")
        .attr("d", d3.sankeyLinkHorizontal())
        //color of the link paths and their size 
        .attr("fill", "none")
        .attr("stroke", "#8d7e7e")
        .attr("stroke-opacity", 0.8)
        .attr("stroke-width", d=> Math.max(1,d.width))

    //showing the nodes
    g3.append("g")
    .selectAll("rect")
    .data(graph.nodes)
    .join("rect")
    .attr("x", d=> d.x0)
    .attr("y", d=> d.y0)
    .attr("width", d=> d.x1 - d.x0)
    .attr("height", d=> d.y1 - d.y0)
    .attr("fill", d=> {
        //assigning the color of the nodes based on column
        if (d.id === "all") return "#a84ca5"
        if (d.id.startsWith("Gen ")) return "#18f52a"
        if (d.id.startsWith("t1_")) return "#ff0303"
        return "#ffe600"
    })

    //labels for nodes
    g3.append("g")
        .selectAll("text")
        .data(graph.nodes)
        .join("text")
        //putting label to left/right of node and in the middle of the nodes bounding box
        .attr("x", d => d.x0 < sankey_dim.width / 2 ? d.x1 + 6 : d.x0 - 6)
        .attr("y", d => (d.y1 + d.y0) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", d => d.x0 < sankey_dim.width / 2 ? "start" : "end")
        .text(d => d.name);

//end of sankey code

})