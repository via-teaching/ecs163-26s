



const width = window.innerWidth
const height = window.innerHeight

const margin = {top: 10, bottom: 30, left:20, right:20}

let scatter_dim = {width: width/2, height: height/2}

//dont forget ot translate over the graph so it doesnt overlap
let stream_dim = {width: width/2, height: height/2}

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
//BSt against catch rate as stream graph
//pokemon -> gen -> first type-> second type sankey

d3.csv("pokemon.csv").then(raw_data => {
    const data = processing_data(raw_data)

    console.log(data)
    window.data = data

    const g1_yaxis_ticks = [0,5, 25,50,100,150,200,300,400,500,600,700,800,900]
    const g1_xaxis_ticks= [1,2,3,4,5,6,7,8,9,10,11,12,13,14]
    const svg = d3.select("svg")



//      Scatter plot code with height as the x axis and weight as the y axis
    const g1 = svg.append("g")
        .attr("transform", `translate(${margin.left+30},${margin.top})`)


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


//      Stream graph code having Total stats in the x axis and catch rate on the y 









})