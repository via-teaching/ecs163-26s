let abFilter = 25;
const width = window.innerWidth;
const height = window.innerHeight;


//bar graph
let teamLeft = 0, teamTop = 0;
let teamMargin = {top: 50, right: 30, bottom: 30, left: 60},
    teamWidth = width/2 - teamMargin.left - teamMargin.right,
    teamHeight = height/2 - teamMargin.top - teamMargin.bottom;

    //scatterplot
let scatterLeft = teamWidth, scatterTop = 0;
let scatterMargin = {top: 30, right: 30, bottom: 30, left: 120},
    scatterWidth = width/2 - scatterMargin.left - scatterMargin.right,
    scatterHeight = height/2 - 80- scatterMargin.top - scatterMargin.bottom;

// sankey
let distrLeft = 0, distrTop = teamHeight + 100;
let distrMargin = {top: 30, right: 30, bottom: 30, left: 60},
    distrWidth = width - distrMargin.left - distrMargin.right,
    distrHeight = height/2 - distrMargin.top - distrMargin.bottom;

//color map for sankey, bar graph
  const nodeColorMap = new Map([
        ["Normal", "grey"],
        ["Bug", "olivedrab"],
        ["Fire", "#ff7d19"],
        ["Ice", "paleturquoise"],
        ["Psychic", "lightcoral"],
        ["Poison", "mediumorchid"],
        ["Fighting", "#a52a2a"],
        ["Electric", "gold"],
        ["Fairy", "#f7a8dc"],
        ["Rock", "burlywood"],
        ["Ghost", "darkslateblue"],
        ["Flying", "cornflowerblue"],
        ["Ground", "#b56121"],
        ["Dragon", "slateblue"],
        ["Grass", "forestgreen"],
        ["Dark", "#2b2424"],
        ["Steel", "lightsteelblue"],
        ["Water", "deepskyblue"],
        ["Generation 1", "Crimson"],
        ["Generation 2", "#b181e3"],
        ["Generation 3", "#35ab64"],
        ["Generation 4", "#ffcfff"],
        ["Generation 5", "grey"],
        ["Generation 6", "#2f27a1"],
        ["None", "#9697b5"]
    ]);

// plots
d3.csv("pokemon.csv").then(rawData =>{
    console.log("rawData", rawData);

    rawData.forEach(function(d){
        d.Generation = Number(d.Generation);
        d.HP = Number(d.HP);
        d.Attack = Number(d.Attack);
        d.Total = Number(d.Total);
        d.Defense = Number(d.Defense);
        d.Sp_Atk = Number(d.Sp_Atk);
        d.Sp_Def = Number(d.Sp_Def);
        d.Speed = Number(d.Speed);
    });


    //const filteredData = rawData; //.filter(d=>d.AB>abFilter);
    const processedData = rawData.map(d=>{
                          return {
                             "Name": d.Name,
                              "Generation":d.Generation,
                             // "H_AB":d.H/d.AB,
                              //"SO_AB":d.SO/d.AB,
                              "Type_1":d.Type_1,
                              "Type_2":d.Type_2,
                              "HP":d.HP,
                              "Attack":d.Attack,
                              "Total":d.Total,
                              "Defense":d.Defense,
                              "Sp_Atk":d.Sp_Atk,
                              "Sp_Def":d.Sp_Def,
                              "Speed":d.Speed
                          };
    });
    console.log("processedData", processedData);

    var scatterAxisOptions = [
                              "HP",
                              "Attack",
                              "Total",
                              "Defense",
                              "Sp_Atk",
                              "Sp_Def",
                              "Speed"];

    var scatterX = "HP";
    var scatterY = "Attack";

    var currentType = "Water";

    var typeData = processedData.filter(d=>d.Type_1 == currentType);
    console.log("typeData", typeData);

    //create svg
    const svg = d3.select("svg");

      //SANKEY
    const g2 = svg.append("g")
                .attr("width", distrWidth + distrMargin.left + distrMargin.right)
                .attr("height", distrHeight + distrMargin.top + distrMargin.bottom)
                .attr("transform", `translate(${distrLeft}, ${distrTop})`);

    //plot 2: Scatter Plot for Water types
    

    const g1 = svg.append("g")
                .attr("width", scatterWidth + scatterMargin.left + scatterMargin.right)
                .attr("height", scatterHeight + scatterMargin.top + scatterMargin.bottom)
                .attr("transform", `translate(${scatterLeft + scatterMargin.left}, ${scatterTop + scatterMargin.top})`);


    d3.select("#selectButton1")
    .selectAll('myOptions')
     	.data(scatterAxisOptions)
      .enter()
    	.append('option')
      .text(function (d) { return d; }) // text showed in the menu
      .attr("value", function (d) { return d; }) // corresponding value returned by the button
      .attr("transform", `translate(${scatterLeft}, ${scatterTop})`);

/** d3.select("#selectButton").on("change", function(d) {
        // recover the option that has been chosen
        var selectedOption = d3.select(this).property("value")
        // run the updateChart function with this selected option
        update(selectedOption)
    }) */

    d3.select("#selectButton2")
    .selectAll('myOptions')
     	.data(scatterAxisOptions)
      .enter()
    	.append('option')
      .text(function (d) { return d; }) // text showed in the menu
      .attr("value", function (d) { return d; }) // corresponding value returned by the button
      .attr("transform", `translate(${scatterLeft}, ${scatterTop})`);
  
    updateScatterAxes("Speed", "Attack");
    updateSankey();


    //PLOT 1: bar chart
    const typeCounts = processedData.reduce((s, { Type_1 }) => (s[Type_1] = (s[Type_1] || 0) + 1, s), {});
   // typeCounts.sort((a,b) => d3.descending(a.count, b.count));
    const typesData = Object.keys(typeCounts).map((key) => ({ Type_1: key, count: typeCounts[key] }));
    //d3.sort(typeData, (a,b) => d3.descending(a.count, b.count));
    const sortedTypesData = Array.from(typesData).sort((a,b) => d3.descending(a.count, b.count));
    console.log("typesData", typesData);
    console.log("sortedTypesData", sortedTypesData);
    const g3 = svg.append("g")
                .attr("width", teamWidth + teamMargin.left + teamMargin.right)
                .attr("height", teamHeight + teamMargin.top + teamMargin.bottom)
                .attr("transform", `translate(${teamMargin.left}, ${teamTop})`);

    // X label
    g3.append("text")
    .attr("x", teamWidth / 2)
    .attr("y", teamHeight + 50)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .text("Type");


    //title
     g3.append("text")
    .attr("x", teamWidth / 2)
    .attr("y", teamHeight + 80)
    .attr("font-size", "25px")
    .attr("text-anchor", "middle")
    .text("Overview: Distribution of All Pokemon Types)");
     
    
    //title
     g3.append("text")
    .attr("x", teamWidth / 2)
    .attr("y", teamHeight + 100)
    .attr("font-size", "15px")
    .attr("text-anchor", "middle")
    .text("(select a type to view in detail)");


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
    .domain(sortedTypesData.map(d => d.Type_1))
    .range([0, teamWidth])
    .paddingInner(0.3)
    .paddingOuter(0.2);

   

    // x axis labels
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
    .domain([0, d3.max(sortedTypesData, d => d.count)])
    .range([teamHeight, 0])
    .nice();

    const yAxisCall2 = d3.axisLeft(y2)
                        .ticks(6);
    g3.append("g").call(yAxisCall2);

    // bars
    const bars = g3.selectAll("rect").data(sortedTypesData);

    bars.enter().append("rect")
    .attr("y", d => y2(d.count))
    .attr("x", d => x2(d.Type_1))
    .attr("width", x2.bandwidth())
    .attr("height", d => teamHeight - y2(d.count))
    .attr("fill", function(d) { 
		  return d.color = nodeColorMap.get(d.Type_1);})
    .attr("stroke", function(d) { 
        if(d.Type_1 === currentType){
            return "#0307fc";
        } })
    // .on("click", updateTypeData(d => d.Type_1));
    .on("click", function(d) {
        console.log("click registered, updating to:", d.Type_1);
        updateTypeData(d.Type_1);
    });


    d3.select("#selectButton1").on("change", function(d) {
        var selectX = d3.select(this).property("value");
        console.log("Selected for X: ", selectX);
        updateScatterAxes(selectX, scatterY)
       });

    d3.select("#selectButton2").on("change", function(d) {
        var selectY = d3.select(this).property("value");
        console.log("Selected for Y: ", selectY);
        updateScatterAxes(scatterX, selectY)
       });



  function updateTypeData(type){
       console.log("updating type");
       currentType = type;
       console.log("currentType", currentType);
       typeData = processedData.filter(d=>d.Type_1 == type);

       //redraw scatterplot
       updateScatterAxes(scatterX, scatterY);
       updateSankey();


       
    }
///*
    function updateScatterAxes(updateX, updateY){ //takes a number parameter and which axis to update
        scatterX = updateX;
        scatterY = updateY;

        console.log("scatterX", scatterX);
        console.log("scatterY", scatterY);

        g1.selectAll("*").remove();
        //transition();

        g1.append("text")
            .attr("x", scatterWidth / 2)
            .attr("y", scatterHeight + 80)
            .attr("font-size", "25px")
            .attr("text-anchor", "middle")
            .text(updateX + " vs " + updateY + " of " + currentType + " Types");

            g1.append("text")
            .attr("x", scatterWidth / 2)
            .attr("y", scatterHeight + 50)
            .attr("font-size", "20px")
            .attr("text-anchor", "middle")
            .text(updateX);


            // Y label
            g1.append("text")
            .attr("x", -(scatterHeight / 2))
            .attr("y", -40)
            .attr("font-size", "20px")
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .text(updateY);

            // X ticks
            const x1 = d3.scaleLinear()
            .domain([0, d3.max(typeData, d => stringToDParam(d, updateX))])
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
                .attr("transform", "rotate(-40)"); //tick labels

            // Y ticks
            const y1 = d3.scaleLinear()
            .domain([0, d3.max(typeData, d => stringToDParam(d, updateY))])
            .range([scatterHeight, 0]);

            const yAxisCall = d3.axisLeft(y1)
                                .ticks(13);
            g1.append("g").call(yAxisCall);

            // circles
            const circles = g1.selectAll("circle").data(typeData);

            circles.enter()
            .append("circle")
                .attr("cx", d => x1(stringToDParam(d, updateX)))
                .attr("cy", d => y1(stringToDParam(d, updateY)))
                .transition()
                .attr("r", 5)
                .attr("fill", "deepskyblue")
                //.append("title")
                    .text(function(d) { 
		             return d.Name + "\n" + stringToDParam(d, updateX) + "\n" + stringToDParam(d, updateY); });


            }


            function updateSankey(){
 //nodes and links list
                const nodesList = [currentType];
                const links3 = [];
                
                //count number of selected type pokemon per generation
                const genCounts = typeData.reduce((s, { Generation }) => (s[Generation] = (s[Generation] || 0) + 1, s), {});
                const genData = Object.keys(genCounts).map((key) => ({ Generation: key, count: genCounts[key] }));

                //water -> generation nodes, links
                genData.forEach(d => {
                // nodes.push({"name":"Generation " + d.Generation});
                    nodesList.push("Generation " + d.Generation);
                    links3.push({"source":currentType,
                                "target":"Generation " + d.Generation,
                                "value": d.count });
                });

                const sortedGens = [];
                const gensByType = [];

            // sort set of water type pokemon by gen
            genData.forEach(p => {
                    sortedGens.push(typeData.filter(d=>d.Generation == p.Generation));    
                });

                // get counts of secondary type by gen
                sortedGens.forEach(p => {
                    type2Counts = p.reduce((s, { Type_2 }) => (s[Type_2] = (s[Type_2] || 0) + 1, s), {});
                    gensByType.push(Object.keys(type2Counts).map((key) => ({ Type_2: key, Generation: p.at(0).Generation, count: type2Counts[key] })))
                });

                // nodes, links created
                gensByType.forEach(p => {
                    p.forEach(q => {
                        //nodes.push({"name":q.Type_2});
                        if(q.Type_2.length > 0){
                        nodesList.push(q.Type_2);
                        links3.push({"source": "Generation " + q.Generation,
                                    "target":q.Type_2,
                                    "value": q.count})
                        } else {
                        nodesList.push("None");
                        links3.push({"source": "Generation " + q.Generation,
                                    "target":"None",
                                    "value": q.count})
                        }
                    });
                });

            //remove duplicate nodes
            const nodesListFiltered = [...new Set(nodesList)].filter(d => d.id !== "");
            const links = links3.filter(d => d.target !== "");

            const nodes3 = [];

                // loop through each link replacing the text with its index from node
            links.forEach(function (d, i) {
                links[i].source = nodesListFiltered.indexOf(links[i].source);
                links[i].target = nodesListFiltered.indexOf(links[i].target);
            });

            // now loop through each nodes to make nodes an array of objects
            // rather than an array of strings

            nodesListFiltered.forEach(n => {
                nodes3.push({"name": n});
            });

            


                console.log("genData", genData);
                console.log("sortedGens", sortedGens);
                console.log("gensByType", gensByType);

                console.log("nodes", nodes3);
                console.log("links", links)

            
            
            
            // Credit to d3noob for this D3 Sankey example https://gist.github.com/d3noob/06e72deea99e7b4859841f305f63ba85

                    sankey = d3.sankey()
                .nodes(nodes3)
                .links(links)
                .nodeWidth(36)
                .nodePadding(1)
                .size([distrWidth, distrHeight])
                .layout(32);

            var path = sankey.link();
            var formatNumber = d3.format(",.0f"),    // zero decimal places
                format = function(d) { return formatNumber(d) + " " + units; },
                color = d3.scaleOrdinal(d3.schemeCategory10);

            var units = "Pokemon";

                g2.selectAll("*").remove();
                //transition();
                //title
                g2.append("text")
                    .attr("x", distrWidth / 2)
                    .attr("y", distrHeight + 30)
                    .attr("font-size", "25px")
                    .attr("text-anchor", "middle")
                    .text(currentType + " types across generations and their secondary types");

                //credit for example sankey code
                g2.append("text")
                    .attr("x", distrWidth / 2)
                    .attr("y", distrHeight + 50)
                    .attr("font-size", "10px")
                    .attr("text-anchor", "middle")
                    .text("Example code from d3noob: https://gist.github.com/d3noob/06e72deea99e7b4859841f305f63ba85");   

                // add in the links
                var link = g2.append("g").selectAll(".link")
                    .data(links)
                    .enter().append("path")
                    .attr("class", "link")
                    .attr("d", path)
                    .style("stroke-width", function(d) { return Math.max(1, d.dy); })
                    .sort(function(a, b) { return b.dy - a.dy; });

                // add the link titles
                link.append("title")
                        .text(function(d) {
                            return d.source.name + " → " + 
                                d.target.name + "\n" + format(d.value); });

                // add in the nodes
                var node = g2.append("g").selectAll(".node")
                    .data(nodes3)
                    .enter().append("g")
                    .attr("class", "node")
                    .attr("transform", function(d) { 
                        return "translate(" + d.x + "," + d.y + ")"; })
                    .call(d3.drag()
                        .subject(function(d) {
                        return d;
                        })
                        .on("start", function() {
                        this.parentNode.appendChild(this);
                        })
                        //.on("drag", dragmove));
                        .on("drag", function (d) {
                        d3.select(this)
                        .attr("transform", 
                                "translate(" 
                                + d.x + "," 
                                + (d.y = Math.max(
                                    0, Math.min(distrHeight - d.dy, d3.event.y))
                                    ) + ")");
                        sankey.relayout();
                        link.attr("d", path);
                    }));

                // add the rectangles for the nodes
                node.append("rect")
                    .attr("height", function(d) { return d.dy; }) 
                    .attr("width", sankey.nodeWidth())
                    .style("fill", function(d) { 
                        return d.color = nodeColorMap.get(d.name);})
                    .style("stroke", function(d) { 
                        return d3.rgb(d.color).darker(2); })
                    .append("title")
                    .text(function(d) { 
                        return d.name + "\n" + format(d.value); });

                // add in the title for the nodes
                node.append("text")
                    .attr("x", -6)
                    .attr("y", function(d) { return d.dy / 2; })
                    .attr("dy", ".35em")
                    .attr("text-anchor", "end")
                    .attr("transform", null)
                    .text(function(d) { return d.name; })
                    .filter(function(d) { return d.x < width / 2; })
                    .attr("x", 6 + sankey.nodeWidth())
                    .attr("text-anchor", "start");
            }
//*/
            function stringToDParam(d, str){
                /*
                return {
                              "Generation":d.Generation,
                             // "H_AB":d.H/d.AB,
                              //"SO_AB":d.SO/d.AB,
                              "Type_1":d.Type_1,
                              "Type_2":d.Type_2,
                              "HP":d.HP,
                              "Attack":d.Attack,
                              "Total":d.Total,
                              "Defense":d.Defense,
                              "Sp_Atk":d.Sp_Atk,
                              "Sp_Def":d.Sp_Def,
                              "Speed":d.Speed
                    }
                              */
                          
                switch(str) {
                    case "HP":
                        return d.HP;
                        break;
                    case "Attack":
                        return d.Attack;
                        break;
                    case "Total":
                        return d.Total;
                        break;
                    case "Defense":
                        return d.Defense;
                        break;
                    case "Total":
                        return d.Total;
                        break;
                    case "Sp_Atk":
                        return d.Sp_Atk;
                        break;
                    case "Sp_Def":
                        return d.Sp_Def;
                        break;
                    case "Speed":
                        return d.Speed;
                        break;
                    default:
                        console.log("Param not found or something else broke");
                } 
            }


            }).catch(function(error){
            console.log(error);
        // */
});