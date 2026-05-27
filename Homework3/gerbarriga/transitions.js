

//(selection) pie chart showing the different primary types of pokemon, click on a part of it to give exact percetnage and count
// (filtering & transitiono ani) 18 types - bar chart where you can sleect the gen and it shows how many of each primary tpye there is
//(dragging) parrellel plot with the coloums being different stats, drag to creae a box and any paths inside will change color to see it clearly
        //the last chart is a bit slow due to all the paths and i probbly did it really ineffiecently for changing the color and highlighting


const width = window.innerWidth
const height = window.innerHeight


const type_colors = {
    Grass: "#78C850",
    Fire: "#F08030",
    Water: "#6890F0",
    Bug: "#A8B820",
    Normal: "#A8A878",
    Poison: "#A040A0",
    Electric: "#F8D030",
    Ground: "#E0C068",
    Fairy: "#EE99AC",
    Fighting: "#C03028",
    Psychic: "#F85888",
    Rock: "#B8A038",
    Ghost: "#705898",
    Ice: "#98D8D8",
    Dragon: "#7038F8",
    Dark: "#705848",
    Steel: "#B8B8D0",
    Flying: "#A890F0"
}

// function t() {
//     function testing(data) {
//         let counts = {};

//         data.forEach(element => {
//             let t = element.Type_1;

//             counts[t] = (counts[t] || 0) + 1;
//         });

//         return counts;
//     }

//     d3.csv("pokemon.csv").then(d => {
//         let data = testing(d);
//         console.log(data);
//     });
// }

function prep_data(data) {

    //init the things we need for the 3 graphs
    let pie = {}
    let bar = {}
    let parallel = []

    data.forEach(d => {

        //grab type for pie chart
        let t = d["Type_1"]
        pie[t] = (pie[t] ||0) +1


        //getting the gen/type for the bar chart
        let gen = d.Generation
        if (!bar[gen]){
            bar[gen] = {}
        }
        bar[gen][t] = (bar[gen][t] ||0) +1

        parallel.push({
            hp: d.HP, attack: d.Attack,
            def: d.Defense, sp_a: d.Sp_Atk, sp_d: d.Sp_Def,
            speed: d.Speed


        })

        
    });
    return {pie ,bar,parallel}


}

d3.csv("pokemon.csv").then(d=> {
    let data = prep_data(d)

    console.log(data.pie)
    console.log(data.bar)
    console.log(data.parallel)


    //pie chart graph code

    //convert types
    let pie_data = Array.from(Object.entries(data.pie),
            ([type, count]) => ({ type, count })
        )

    //positionn the graph in the otp left corener
    let radius = Math.min(width,height) /4
    const g = d3.select("svg")
        .append("g")
        .attr("transform", `translate(${width / 5 -50}, ${height / 4 + 25})`)


    const pie_chart = d3.pie()
        .value(d=> d.count)
        .padAngle(0.01)

    const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(radius)

    let total = d3.sum(pie_data, d=> d.count)

    
    const info_tab = d3.select("svg")
        .append("text")
        .attr("x", 20)
        .attr("y",20)
        .attr("font-size", 16)
        .attr("font-family", "Georgia")

    g.selectAll("path")
    .data(pie_chart(pie_data))
    .join("path")
    .attr("d", arc)
    .attr("fill", d=> type_colors[d.data.type])
    .attr("stroke", "white")
    .attr("stroke-width", 2)
    
    //click feature function showing the % and amount
    .on("click", function(d,i) {
        let percent = ((d.data.count/total)*100).toFixed(2)
        info_tab.text(null)

        //prints what the type is
        info_tab.append("tspan")
            .attr("x", 20)
            .attr("y", 20)
            .text(d.data.type)

        //prints the amount of that type
        info_tab.append("tspan")
            .attr("x", 20)
            .attr("dy", "1.2em")
            .text(`${d.data.count} Pokémon`)

        //prints the % of that type 
        info_tab.append("tspan")
            .attr("x", 20)
            .attr("dy", "1.2em")
            .text(`${percent}%`)
    })

    //title on top middle of graph
    g.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", -radius-5)
        .attr("font-size", 18)
        .attr("font-family", "Georgia")
        .text("Primary Type Spread")
    //end of pie grapgh code 





    //start of bar chart code
    let current_gen =1
    const bar_pos = 750
    const bar_w = 800
    const bar_h = 300

    const bar_chart = d3.select("svg")
        .append("g")
        .attr("transform", `translate(650, 50)`)

    //x and y scales
    const x = d3.scaleBand()
        .range([0, bar_w-40])
        .padding(0.2)

    const y = d3.scaleLinear()
        .range([bar_h, 0])

        //offset the bars inside teh chart 
    const a_bar = bar_chart.append("g")
        .attr("transform", "translate(40, 0)")
    
    const y_axis = bar_chart.append("g")
        .attr("class", "y-axis")
        .attr("transform", "translate(40, 0)")

    //gen label at the bottom middle of chart
    const gen_label = d3.select("svg")
        .append("text")
        .attr("x", bar_pos+ bar_w/2)
        .attr("y", bar_h +100)
        .attr("text-anchor", "middle")
        .attr("font-size", 18)
        .text("Generation 1")
    
    //left arrow to clikc on to decrement from curretn gen
        d3.select("svg")
            .append("text")
            .attr("x", bar_pos + bar_w / 2 - 120)
            .attr("y", bar_h + 100)
            .attr("font-size", 22)
            .text("<=")
            .style("cursor", "pointer")
            .on("click", function () {
                if (current_gen > 1) {
                    current_gen--
                    update_bar()
                }
            })
    //right arrow to clikc on and increase gen by 1
        d3.select("svg")
            .append("text")
            .attr("x", bar_pos + bar_w / 2 + 120)
            .attr("y", bar_h + 100)
            .attr("font-size", 22)
            .text("=>")
            .style("cursor", "pointer")
            .on("click", function () {
                if (current_gen < 6) {
                    current_gen++
                    update_bar()
                }
            })
        //how the graph is updated when changing generations
    function update_bar(){

        let raw = data.bar[current_gen]|| {}
        let gen_data = Object.entries(raw).map(([type, count]) => ({type,count}))

        x.domain(gen_data.map(d=> d.type))
        y.domain([0, d3.max(gen_data, d=> d.count)||0])

        gen_label.text(`Generation ${current_gen}`)

        //gets the current rectangles in the grph and updates them then reformts of needed
        const bars = a_bar.selectAll(".bar")
            .data(gen_data , d=> d.type)
            .join(
                enter => enter.append("rect")
                    .attr("class", "bar")
                    .attr("x", d=> x(d.type))
                    .attr("width", x.bandwidth())
                    .attr("y", bar_h)
                    .attr("height", 0)
                    .attr("fill", d=> type_colors[d.type])

                    //click function
                    .on("click", function(d,i) {
                        click_label.text(`Selected: ${d.type}`)
                    }),

                update => update,

                exit=> exit
                    .transition()
                    .duration(700)
                    .attr("height",0)
                    .attr("y", bar_h)
                    .remove()
            )
        
            //transitioning the bars with new vals
        bars.transition()
            .duration(700)
            .attr("x", d=> x(d.type))
            .attr("y", d=> y(d.count))
            .attr("width", x.bandwidth())
            .attr("height", d=> bar_h - y(d.count))
            .attr("fill", d=> type_colors[d.type])
        
        //rescale y axis wiht new gen selected
        y_axis.transition()
            .duration(700)
            .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format("d")))
    }
    const click_label = d3.select("svg")
        .append("text")
        .attr("x", bar_pos+ bar_w/2)
        .attr("y", 30)
        .attr("text-anchor", "middle")
        .attr("font-family", "Georgia")
        .attr("font-size", 18)
        .text("Click on a bar")

    update_bar()

    //end of bar chart code




    //starts of parallel coordinates plot
    const pw = width+75
    const ph = height/2.2
    const stats = ["hp", "attack", "def", "sp_a", "sp_d", "speed"]

    const par_chart = d3.select("svg")
        .append("g")
        .attr("transform", `translate(-20, ${height / 2})`)

    //x axist of the different coloums of stats
    const p_xaxis = d3.scalePoint()
        .domain(stats)
        .range([0, pw])
        .padding(0.5)

    //y axis based on the mins and max of each stat
    const p_yaxis = {}
    stats.forEach( s=> {
        p_yaxis[s] = d3.scaleLinear()
        .domain(d3.extent(data.parallel, d=> +d[s]))
        .range([ph,0])
    })

    //creates the colums with values
    par_chart.selectAll(".axis")
    .data(stats)
    .join("g")
    .attr("transform",d => `translate(${p_xaxis(d)}, 0)`)
    .each(function (d) {
        d3.select(this).call(d3.axisLeft(p_yaxis[d]))
    })
    .append("text")
    .attr("y", -10)
    .attr("text-anchor", "middle")
    .text(d=> d)

    const stat_labels= {
        hp: "HP",
        attack: "Attack",
        def: "Defense",
        sp_a: "Sp. Atk",
        sp_d: "Sp. Def",
        speed: "Speed"
    }
    //adds the labels of the colums ot the bottom of each one
    par_chart.selectAll(".bottom-label")
        .data(stats)
        .join("text")
        .attr("class", "bottom-label")
        .attr("x" , d=> p_xaxis(d))
        .attr("y", ph+20)
        .attr("text-anchor", "middle")
        .attr("font-size", 15)
        .attr("font-family", "Georgia")
        .attr("fill", "black")
        .text(d=> stat_labels[d])

    //function for line ebtwen coloumsn
    function path(d){
        return d3.line()(
            stats.map(route => [
                p_xaxis(route), p_yaxis[route](+d[route])
            ])
        )
    }

    const instr = d3.select("svg")
        .append("text")
        .attr("x", 20)
        .attr("y", height - 5)
        .attr("font-size", 16)
        .attr("font-family", "monospace")
        .text("Click and drag over columns to highlight paths") 

    par_chart.selectAll(".path")
        .data(data.parallel)
        .join("path")
        .attr("class", "path")
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", "#609cfc")
        .attr("opacity", 0.6)
        .attr("stroke-width", 1.25)
        
    
    let brush_start = null 

    //creates the boudning box 
    const hold_mouse_rect = par_chart.append("rect")
        .attr("fill", "#f4f6c5")
        .attr("stroke", "steelblue")
        .attr("opacity", 0.6)
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4")
        .attr("x",0)
        .attr("y", 0)
        .attr("width",0)
        .attr("height", 0)
        .attr("pointer-events", "none")
    
    par_chart.append("rect")
        .attr("width", pw)
        .attr("height", ph)
        .attr("fill", "none")
        .attr("pointer-events", "all")
        //all the functiobs for the mouse with dragging and upadating the selection if a path is inside the bouning box
        .on("mousedown", function(){

            const[mousex,mousey] = d3.mouse(this)
            brush_start = [mousex, mousey]
            
            hold_mouse_rect
                .attr("x", mousex)
                .attr("y", mousey)
                .attr("width", 0)
                .attr("height", 0)
        })


        .on("mousemove", function () {
            if (!brush_start) return
            const [mousex, mousey] = d3.mouse(this)

            const box_x = Math.min(mousex, brush_start[0])
            const box_y = Math.min(mousey, brush_start[1])
            const w = Math.abs(mousex - brush_start[0])
            const h = Math.abs(mousey - brush_start[1])

            hold_mouse_rect
                .attr("x", box_x).attr("y", box_y)
                .attr("width", w).attr("height", h)

            par_chart.selectAll(".path")
                .each(function (d) {
                    let inside = stats.some(p => {
                        const px = p_xaxis(p)
                        const py = p_yaxis[p](+d[p])
                        return px >= box_x && px <= box_x + w && py >= box_y && py <= box_y + h
                    })
                    d3.select(this)
                        .attr("opacity", inside ? 1 : 0.4)
                        .attr("stroke-width", inside ? 3 : 1)
                        .attr("stroke", inside ? "#fead3c" : "#609cfc")
                })
        })



        .on("mouseup", function(){
            brush_start= null
        })
        .on("mouseleave", function(){
            brush_start=null
            hold_mouse_rect
                .attr("width", 0)
                .attr("height",0)
            
            par_chart.selectAll(".path")
                .attr("opacity", 0.4)
                .attr("stroke-width", 1.5)
                .attr("stroke", "#609cfc")
                
        })






})

