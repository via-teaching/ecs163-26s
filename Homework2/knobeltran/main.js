
const width = window.innerWidth;
const height = window.innerHeight;

//below are the margins and sizes for the three visualizations
let teamLeft = 0, teamTop = 460;
let teamMargin = {top: 10, right: 0, bottom: 30, left: 120},
    teamWidth = width - 750 - teamMargin.left - teamMargin.right,
    teamHeight = height - 500 - teamMargin.top - teamMargin.bottom;

let pieLeft = 0;
let pieTop = 590;
let pieMargin = {top: 10, right:30, bottom:30, left: 1200},
    pieWidth = width - 50 - pieMargin.left - pieMargin.right,
    pieHeight = height - pieMargin.top - pieMargin.bottom;

let paraLeft = 0;
let paraTop = 80;
let paraMargin = {top: 10, right:30, bottom:30, left: -160},
    paraWidth = width + 150 - paraMargin.left - paraMargin.right,
    paraHeight = height - 360 - paraMargin.top - paraMargin.bottom


// parsing the data below
d3.csv("pokemon_alopez247.csv").then(rawData =>{
    console.log("rawData", rawData);

    //turn data into numbers from strings for use in the Parallel Coordinates Graph
    rawData.forEach(function(d){
        d.Total = Number(d.Total);
        d.HP = Number(d.HP);
        d.Attack = Number(d.Attack);
        d.Defense = Number(d.Defense);
        d.Sp_Atk = Number(d.Sp_Atk);
        d.Sp_Def = Number(d.Sp_Def);
        d.Speed = Number(d.Speed);
    });

    const processedData = rawData.map(d => {
        return {
            type: d.Type_1,
            total: d.Total
        }
    });
    console.log("processedData", processedData);

    const svg = d3.select("svg");


    //Bar graph plot: Average Stat Totals with special interest in Fire, Grass, and Water
    //creaates typeTotal object to hold the sum and the count
    const typeTotal = {};
    processedData.forEach(d => {
        //this is when a type is first encountered, set sum and count to zero
        if(!typeTotal[d.type]) {
            typeTotal[d.type] = {
                sum: 0,
                count: 0
            }
        }

        //add all the stat totals, keep track how many of said type in order to calculate average
        typeTotal[d.type].sum += d.total;
        typeTotal[d.type].count += 1;
    })

    const totalData = Object.keys(typeTotal).map(key => ({
        type:key,
        avgTotal: typeTotal[key].sum / typeTotal[key].count
    }));

    totalData.sort((a,b) => b.avgTotal - a.avgTotal);

    console.log(totalData)

    const g3 = svg.append("g")
                .attr("width", teamWidth + teamMargin.left + teamMargin.right)
                .attr("height", teamHeight + teamMargin.top + teamMargin.bottom)
                .attr("transform", `translate(${teamMargin.left}, ${teamTop})`);

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
    .text("Average Stat Total");

    // X ticks, scaleBand use to scale the bars categorically by type
    const x2 = d3.scaleBand()
    .domain(totalData.map(d => d.type))
    .range([0, teamWidth])
    //controls the space between the bars
    .paddingInner(0.1)
    .paddingOuter(0.2);

    //generate the horizontal axis at the bottom of the chart with axisbottom
    const xAxisCall2 = d3.axisBottom(x2);
    g3.append("g")
    .attr("transform", `translate(0, ${teamHeight})`)
    .call(xAxisCall2)
    .selectAll("text")
        .attr("y", "10")
        .attr("x", "-5")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-40)");

    // y ticks, using scaleLinear to create y axis to be filled up by the values reaching the average total
    const y2 = d3.scaleLinear()
    .domain([0, d3.max(totalData, d => d.avgTotal)])
    .range([teamHeight, 0])
    .nice();

    //sets the vertical axis on the chart
    const yAxisCall2 = d3.axisLeft(y2)
                        .ticks(6);
    g3.append("g").call(yAxisCall2);

    // bars
    const bars = g3.selectAll("rect").data(totalData);

    bars.enter().append("rect")
    .attr("y", d => y2(d.avgTotal))
    .attr("x", d => x2(d.type))
    .attr("width", x2.bandwidth())
    .attr("height", d => teamHeight - y2(d.avgTotal))
    //fills the bars, but i uniquely want fire water and grass to be colored separately to stand out in order
    //to view how the three stack up against each other, and where their stat totals are overall with all other types
    .attr("fill", d => {
        //fire is filled as red since fire is commonly associated with red
        if (d.type === "Fire"){
            return "firebrick";
        }
        //water is filled as blue since watter is commonly associated with blue
        else if (d.type === "Water") {
            return "steelblue";
        }
        //grass is filled as green since grass is commonly associated with green
        else if (d.type === "Grass") {
            return "forestgreen";
        }
        else {
            //other types colored grey because individually they don't matter, meant to
            //illustrate how the three starter types stack up
            //grey is not a color that pops out much either
            return "lightgray";
        }
    });



    /// PIE CHART ///




    //PieChart of # pokemon in each type
    const pieData = Object.keys(typeTotal).map(key => ({
        //reuse typeTotal's count bc we already calculated how many pokemon each type has
        type: key,
        amount: typeTotal[key].count
    }));

    console.log("pieData", pieData);

    //starts the part chart
    const g2 = svg.append("g")
        .attr("width", pieWidth + pieMargin.left + pieMargin.right)
        .attr("height", pieHeight + pieMargin.top + pieMargin.bottom)
        .attr("transform", `translate(${pieMargin.left}, ${pieTop})`);

    //to start the pie layout
    const pie = d3.pie()
        .sort(null)
        .value(d => d.amount);

    //this will be the radius of the pie chart
    const pieRadius = Math.min(pieWidth, pieHeight) / 2;
    
    //arc generator
    const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(pieRadius);

    //generate the arcs using the data object created earlier
    const arcs = pie(pieData);

    // draw the slices using selectAll to reach each path and data from arcs
    g2.selectAll("path")
        .data(arcs)
        .enter()
        .append("path")
        .attr("d", arc)
        .attr("fill", d => {
        //fire is filled as red since fire is commonly associated with red
        if (d.data.type === "Fire"){
            return "firebrick";
        }
        //water is filled as blue since watter is commonly associated with blue
        else if (d.data.type === "Water") {
            return "steelblue";
        }
        //grass is filled as green since grass is commonly associated with green
        else if (d.data.type === "Grass") {
            return "forestgreen";
        }
        else {
            //other types colored grey because individually they don't matter, meant to
            //illustrate how the three starter types stack up
            //grey is not a color that pops out much either
            return "lightgray";
        }
    })
        .attr("stroke", "black")
        .attr("stroke-width", 0.5);

    // Labels
    g2.selectAll("text")
        .data(arcs)
        .enter()
        .append("text")
        .attr("transform", d => `translate(${arc.centroid(d)})`)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .text(d => {

            // only label the important main types, other types simply for reference only
            if (
                d.data.type === "Fire" ||
                d.data.type === "Water" ||
                d.data.type === "Grass"
            ) {
                return d.data.type;
            }

            return "";
        });

    // Pie chart title
    svg.append("text")
        .attr("x", pieWidth * 4.7)
        .attr("y", pieHeight - 240)
        .attr("text-anchor", "middle")
        .attr("font-size", "20px")
        .text("Pokemon Type Distribution");





    /// PARALLEL COORDINATES GRAPH




    //get data only for fire, water, and grass types using filter
    const starterData =  rawData.filter(d => 
        d.Type_1 === "Fire" || d.Type_1 === "Water" || d.Type_1 === "Grass"
    );

    //sets up the correct colors for the respective type and assigning the types in domain to their color in range
    const color = d3.scaleOrdinal()
        .domain(["Fire", "Water", "Grass"])
        .range(["firebrick", "steelblue", "forestgreen"])

    //list of dimensions, in order of the axis, they are the stats we are tracking for the pokemon
    const dimensions = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"]

    //starts the creation of the parallel coords graph
    const g1 = svg.append("g")
            .attr("width", paraWidth + paraMargin.left + paraMargin.right)
            .attr("height", paraHeight + paraMargin.top + paraMargin.bottom)
            .attr("transform", `translate(${paraMargin.left}, ${paraTop})`);

    //building the y-scale per stat stored in y object, using forEach to get every dimension AKA every stat
    const y = {};
    dimensions.forEach(dim => {
        y[dim] = d3.scaleLinear()
            //obtaining the values from starterData
            .domain(d3.extent(starterData, d => +d[dim]))
            .range([paraHeight, 0]);
    });

    //building the x-scale to find best position for each axis
    const x = d3.scalePoint()
        .range([0, paraWidth])
        .padding(1)
        .domain(dimensions);

    //path generator, takes a row of the data & returns xy coordinates of the line to draw
    function path(d){
        return d3.line()(
            dimensions.map(p => [
                x(p), y[p](d[p])
            ])
        );
    }

    //draw the lines
    g1.selectAll("path")
        .data(starterData)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", d => color(d.Type_1))
        .attr("opacity", 0.5);

    //draw the axes
    g1.selectAll("axis")
        .data(dimensions)
        .enter()
        .append("g")
        .attr("transform", d => `translate(${x(d)},0)`)
        .each(function(d) {
            d3.select(this).call(d3.axisLeft(y[d]));
        })
        //text that denotes what each axis is, in order of dimensions
        .append("text")
        .style("text-anchor", "middle")
        .attr("y", -9)
        .text(d => d)
        .attr("font-size", "16px")
        .attr("fill", "black");

    g1.append("text")
        .attr("x", paraWidth / 2)
        .attr("y", paraHeight - 370)
        .attr("font-size", "24px")
        .attr("text-anchor", "middle")
        .attr("font-weight", "bold")
        .text("How GameFreak designs the Pokemon Starter Types (Fire, Water, Grass)");

    // quick handmade legend that has the consistent colors for the fire, water, grass and other types
    svg.append("circle").attr("cx",width-120).attr("cy",height -600).attr("r", 6).style("fill", "firebrick")
    svg.append("circle").attr("cx",width-120).attr("cy",height - 570).attr("r", 6).style("fill", "steelblue")
    svg.append("circle").attr("cx",width-120).attr("cy",height - 540).attr("r", 6).style("fill", "forestgreen")
    svg.append("circle").attr("cx",width-120).attr("cy",height -510).attr("r", 6).style("fill", "lightgray")
    svg.append("text").attr("x", width-110).attr("y", height - 600).text("Fire Type").style("font-size", "15px").attr("alignment-baseline","middle")
    svg.append("text").attr("x", width-110).attr("y", height - 570).text("Water Type").style("font-size", "15px").attr("alignment-baseline","middle")
    svg.append("text").attr("x", width-110).attr("y", height - 540).text("Grass Type").style("font-size", "15px").attr("alignment-baseline","middle")
    svg.append("text").attr("x", width-110).attr("y", height - 510).text("Other types").style("font-size", "15px").attr("alignment-baseline","middle")
    
    }).catch(function(error){
    console.log(error);
});
