//ideas:
//1: bar chart of how many pokemon of each type
//2: small multiple star/radar chart showing average of each type's stats
//3: parallel sets / sankey diagram / chord diagram showing how type1 connects to type2

let abFilter = 25;
const width = window.innerWidth;
const height = window.innerHeight;

let scatterLeft = 0, scatterTop = 0;
let scatterMargin = {top: 10, right: 30, bottom: 30, left: 60},
    scatterWidth = width/4 - scatterMargin.left - scatterMargin.right,
    scatterHeight = height/2.5 - scatterMargin.top - scatterMargin.bottom;

//custom shared color scale
/*
while this might normally be too many colors for a visualization,
this is the exact color scheme used throughout the pokemon franchise
to refer to these exact types. So in this case it is acceptable as
the audience will be familiar with this color scheme.
*/
function color(type){
    switch(type){
        case "Fire":
            return '#EE8130';
        case "Grass":
            return '#7AC74C';
        case "Water":
            return '#6390F0';
        case "Bug":
            return'#A6B91A';
        case "Normal":
            return "#A8A77A";
        case "Poison":
            return '#A33EA1';
        case "Electric":
            return'#F7D02C';
        case "Ground":
            return '#E2BF65';
        case "Fairy":
            return'#D685AD';
        case "Fighting":
            return '#C22E28';
        case "Psychic":
            return'#F95587';
        case "Rock":
            return'#B6A136';
        case "Ghost":
            return'#735797';
        case "Ice":
            return '#96D9D6';
        case "Dragon":
            return'#6F35FC';
        case "Dark":
            return'#705746';
        case "Steel":
            return'#B7B7CE';
        case "Flying":
            return'#A98FF3';
        default:
            return "#000000";
    }
}

function toIndex(type){
    switch(type){
        case "Fire":
            return 0;
        case "Grass":
            return 1;
        case "Water":
            return 2;
        case "Bug":
            return 3;
        case "Normal":
            return 4;
        case "Poison":
            return 5;
        case "Electric":
            return 6;
        case "Ground":
            return 7;
        case "Fairy":
            return 8;
        case "Fighting":
            return 9;
        case "Psychic":
            return 10;
        case "Rock":
            return 11;
        case "Ghost":
            return 12;
        case "Ice":
            return 13;
        case "Dragon":
            return 14;
        case "Dark":
            return 15;
        case "Steel":
            return 16;
        case "Flying":
            return 17;
        default:
            return 18;
    }
}

// plots
//load in csv data
d3.csv("data/pokemon_alopez247.csv").then(rawData =>{
    console.log("rawData", rawData);

    //process some columns as numbers
    rawData.forEach(function(d){
        d.Number = Number(d.Number);
        d.Total = Number(d.Total);
        d.HP = Number(d.HP);
        d.Attack = Number(d.Attack);
        d.Defense = Number(d.Defense);
        d.Sp_Atk = Number(d.Sp_Atk);
        d.Sp_Def = Number(d.Sp_Def);
        d.Speed = Number(d.Speed);
    });

    //count the number of pokemon of each type
    //collect total stats per type
    let countDatatemp = new Map();
    let statData = [];
    let chordData = [];
    for(let i = 0; i < 19; i++){
        chordData.push([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]);
    }
    //console.log(chordData);
    for(const entry of rawData){
        //record chordData
        chordData[toIndex(entry.Type_1)][toIndex(entry.Type_2)]++;
        chordData[toIndex(entry.Type_2)][toIndex(entry.Type_1)]++;
        let type = entry.Type_1;
        //console.log(entry);
        if(countDatatemp.has(type)){
            countDatatemp.set(type, countDatatemp.get(type)+1);
            //find entry of statData of type type
            let i = 0;
            for(i = 0; i < statData.length; i++){
                if(statData[i].type == type){
                    break;
                }
            }
            statData[i].hp += entry.HP;
            statData[i].attack += entry.Attack;
            statData[i].defense += entry.Defense;
            statData[i].sp_atk += entry.Sp_Atk;
            statData[i].sp_def += entry.Sp_Def;
            statData[i].speed += entry.Speed;
        }else{
            if(type != ""){
                countDatatemp.set(type, 0);
                statData.push({
                    type:type, hp:entry.HP, attack:entry.Attack, defense:entry.Defense,
                     sp_atk:entry.Sp_Atk, sp_def:entry.Sp_Def, speed:entry.Speed
                });
            }
        }
        type = entry.Type_2;
        if(countDatatemp.has(type)){
            countDatatemp.set(type, countDatatemp.get(type)+1);
            //find entry of statData of type type
            let i = 0;
            for(i = 0; i < statData.length; i++){
                if(statData[i].type == type){
                    break;
                }
            }
            statData[i].hp += entry.HP;
            statData[i].attack += entry.Attack;
            statData[i].defense += entry.Defense;
            statData[i].sp_atk += entry.Sp_Atk;
            statData[i].sp_def += entry.Sp_Def;
            statData[i].speed += entry.Speed;
        }else{
            if(type != ""){
                countDatatemp.set(type, 0);
                statData.push({
                    type:type, hp:entry.HP, attack:entry.Attack, defense:entry.Defense,
                     sp_atk:entry.Sp_Atk, sp_def:entry.Sp_Def, speed:entry.Speed
                });
            }
        }
    }
    //adjust chordData
    /*for(let i = 0; i < chordData.length; i++){
        for(let j = 0; j < chordData[0].length; j++){
            chordData[i][j] /= rawData.length;
        }
    }*/
    /*chordData = Object.assign(chordData,{
        names:  ["Fire", "Grass", "Water", "Bug", "Normal", "Poison", "Electric", "Ground",
            "Fairy", "Fighting", "Psychic", "Rock", "Ghost", "Ice", "Dragon", "Dark", "Steel", "Flying", "None"
        ],
        colors: []
    });*/
    console.log("chordData", chordData);
    //adjust statData to averages
    for(let i = 0; i < statData.length; i++){
        statData[i].hp /= countDatatemp.get(statData[i].type);
        statData[i].attack /= countDatatemp.get(statData[i].type);
        statData[i].defense /= countDatatemp.get(statData[i].type);
        statData[i].sp_atk /= countDatatemp.get(statData[i].type);
        statData[i].sp_def /= countDatatemp.get(statData[i].type);
        statData[i].speed /= countDatatemp.get(statData[i].type);
    }
    const types = countDatatemp.keys();
    const typesArray = Array.from(new Set(rawData.map(d => d.Type_1)));
    let colorsArray = [];
    for(let type of typesArray){
        colorsArray.push(color(type));
    }
    colorsArray.push("#000000");
    let countData = [];
    for(const entry of countDatatemp.keys()){
        countData.push({type:entry, count:countDatatemp.get(entry)});
    }
    console.log("chordData", chordData);
    console.log("countData", countData);
    console.log("types", types);
    console.log("typesArray", typesArray);
    console.log("statData", statData);

    //svg
    const svg = d3.select("svg");

    //shared color legend for type
    const legend = svg.append("g")
    .attr("transform", `translate(${width/4}, ${40})`);
    //circles with color for legend
    legend.selectAll("circle")
    .data(typesArray)
    .join("circle")
    .attr("cx", (d,i) => 6 + Math.floor(i / 9) * 65)
    .attr("cy", (d, i) => (i%9) * 20 + 6)
    .attr("r", 6)
    .style("fill", d => color(d));
    //text labels for legend
    legend.selectAll("text")
    .data(typesArray)
    .join("text")
    .attr("x", (d, i) => 18 + Math.floor(i / 9) * 65)
    .attr("y", (d, i) => (i%9) * 20 + 10)
    .attr("font-size", 14)
    .text(d => d);
    //legend label
    legend.append("text")
    .attr("x", 0)
    .attr("y",-10)
    .attr("font-size", 20)
    .text("Legend");

    //Plot 1: Bar Chart

    //group for plot 1
    const g1 = svg.append("g")
                .attr("width", scatterWidth + scatterMargin.left + scatterMargin.right)
                .attr("height", scatterHeight + scatterMargin.top + scatterMargin.bottom)
                .attr("transform", `translate(${scatterMargin.left}, ${scatterMargin.top})`);

    // X label- type
    g1.append("text")
    .attr("x", scatterWidth / 2)
    .attr("y", scatterHeight + 55)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .text("Type");


    // Y label- Number of Pokemon
    g1.append("text")
    .attr("x", -(scatterHeight / 2))
    .attr("y", -40)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("Number of Pokemon");

    //X axis- band scale with correct bounds
    const x1 = d3.scaleBand()
    .domain(typesArray)
    .range([0, scatterWidth]);
    const xAxisCall = d3.axisBottom(x1)
                        .ticks(7);
    g1.append("g")
    .attr("transform", `translate(0, ${scatterHeight})`)
    .call(xAxisCall)
    .selectAll("text")
        .attr("y", 10)
        .attr("x", -5)
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-40)");

    // Y axis- linear scale with correct bounds
    const y1 = d3.scaleLinear()
    .domain([0, d3.max(countData, d => d.count)])
    .range([scatterHeight, 0]);
    const yAxisCall = d3.axisLeft(y1)
                        .ticks(13);
    g1.append("g").call(yAxisCall);

    // bars- create a bar for each type in countData, set height to number of pokemon
    const marks = g1.selectAll("rect")
    .data(countData)
    .join("rect")
    .attr("x", d => x1(d.type)+2)
    .attr("y", d => y1(d.count))
    .attr("width", 15)
    .attr("height", d => scatterHeight - y1(d.count))
    .attr("fill", (d, i) => {
        //return Math.floor(i / 11) == 0 ? color(d.type) : color(d.type);
        return color(d.type);
    });

    //plot 1 title
    g1.append("text")
        .attr("x", scatterWidth/2+20)
        .attr("y", scatterTop+scatterMargin.top)
        .attr("font-size", 20)
        .attr("text-anchor", "middle")
        .text("Number of Pokemon by Type");

    //plot 2: small multiple radar chart
    //plot 2 title
    svg.append("text")
    .attr("x", width/2)
    .attr("y", (height/8) + scatterHeight)
    .attr("font-size", 30)
    .attr("text-anchor", "middle")
    .text("Overview: Average Pokemon Stats by Type");

    //console.log(typesArray.length);
    for(let chartNum = 0; chartNum < typesArray.length; chartNum++){
        //const chartX = (chartNum % 6) * 95 + 50;
        //const chartY = Math.floor(chartNum / 6) * 90 + 240;
        const chartX = (chartNum % 9) * (width/18 - 2) + (width/32);
        const chartY = Math.floor(chartNum / 9) * (height/8) + (height/3.3);
        //console.log(height)
        const radius = width/24;
        const chartType = typesArray[chartNum];
        let chartData = [];
        for(let entry of statData){
            if(entry.type == chartType){
                chartData.push(entry.hp);
                chartData.push(entry.attack);
                chartData.push(entry.defense);
                chartData.push(entry.sp_atk);
                chartData.push(entry.sp_def);
                chartData.push(entry.speed);
                break;
            }
        }
        const angle = [0, 60, 120, 180, 240, 300];
        let lineData = [];
        for(let i = 0; i < 6; i++){
            lineData.push({
                angle:angle[i], radius:chartData[i]
            });
        }
        //console.log(lineData);

        //group for plot 2
        const g2 = svg.append("g")
                .attr("width", 80)
                .attr("height", 80)
                .attr("transform", `translate(${chartX}, ${chartY})`);

        //stat axes
        const stat = d3.scaleLinear()
        .domain([50, 120])
        .range([0, radius]);

        //visual stat axes
        g2.append("line")
        .attr("x1", chartX)
        .attr("x2", chartX)
        .attr("y1", chartY-radius)
        .attr("y2", chartY+radius)
        .attr("stroke", "#D3D3D3");
        g2.append("line")
        .attr("x1", chartX-(radius*0.866))
        .attr("x2", chartX+(radius*0.866))
        .attr("y1", chartY-(radius*0.5))
        .attr("y2", chartY+(radius*0.5))
        .attr("stroke", "#D3D3D3");
        g2.append("line")
        .attr("x1", chartX+(radius*0.866))
        .attr("x2", chartX-(radius*0.866))
        .attr("y1", chartY-(radius*0.5))
        .attr("y2", chartY+(radius*0.5))
        .attr("stroke", "#D3D3D3");

        //stat axes circular and linear
        for(let i = 60; i < 130; i += 20){
            //console.log("hi");
            //polar tick circles
            g2.append("circle")
            .attr("cx", chartX)
            .attr("cy", chartY)
            .attr("r", stat(i))
            .attr("fill", "none")
            .attr('stroke', "#D3D3D3")
            //.attr("opacity", 0.5)
            .attr("stroke-width", 1);
            //polar tick labels
            g2.append("text")
            .attr("x", chartX)
            .attr("y", chartY-stat(i)+8)
            .attr("font-size", 10)
            .attr("text-anchor", "middle")
            .text("" + i);
        }

        //stat axes labels
        g2.append("text")
        .attr("x", chartX)
        .attr("y", chartY+radius+10)
        .attr("font-size", 10)
        .attr("text-anchor", "middle")
        .text("Special Attack");
        g2.append("text")
        .attr("x", chartX)
        .attr("y", chartY-radius-2)
        .attr("font-size", 10)
        .attr("text-anchor", "middle")
        .text("HP");
        g2.append("text")
        .attr("x", chartX)
        .attr("y", chartY-radius-2)
        .attr("font-size", 10)
        .attr("text-anchor", "middle")
        //.attr("transform-origin", )
        .attr("transform", `rotate(60, ${chartX}, ${chartY})`)
        .text("Attack");
        g2.append("text")
        .attr("x", chartX)
        .attr("y", chartY-radius-2)
        .attr("font-size", 10)
        .attr("text-anchor", "middle")
        //.attr("transform-origin", )
        .attr("transform", `rotate(-60, ${chartX}, ${chartY})`)
        .text("Speed");
        g2.append("text")
        .attr("x", chartX)
        .attr("y", chartY+radius+10)
        .attr("font-size", 10)
        .attr("text-anchor", "middle")
        //.attr("transform-origin", )
        .attr("transform", `rotate(-60, ${chartX}, ${chartY})`)
        .text("Defense");
        g2.append("text")
        .attr("x", chartX)
        .attr("y", chartY+radius+10)
        .attr("font-size", 10)
        .attr("text-anchor", "middle")
        //.attr("transform-origin", )
        .attr("transform", `rotate(60, ${chartX}, ${chartY})`)
        .text("Special Defense");

        //chart titles
        g2.append("text")
        .attr("x", chartX)
        .attr("y", chartY-radius-20)
        .attr("font-size", 20)
        .attr("text-anchor", "middle")
        .text(chartType);

        //radial line
        //graphs onto each chart the stat data as the radius and the fixes axis angles as the angles
        const line = d3.lineRadial()
        .angle((d,i) => d.angle * Math.PI/180)
        .radius((d, i) => stat(d.radius));
        g2.append("path")
        .datum(lineData)
        .attr("d", line)
        .attr("fill", color(chartType))
        .attr("stroke", color(chartType))
        .attr("stroke-width", 3)
        .attr("opacity", 0.8)
        .attr("transform", `translate(${chartX}, ${chartY})`);

    }

    //plot 3
    //group for plot 3
    const g3 = svg.append("g")
                .attr("width", width/2)
                .attr("height", height/2)
                .attr("transform", `translate(${width/2.5}, ${10})`);

    const outerRadius = height/5.3;
    const innerRadius = outerRadius-10;

    //chord template
    const chord = d3.chord()
    .padAngle(10 / innerRadius);

    //arc template
    const arc = d3.arc()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius);

    //ribbon template
    const ribbon = d3.ribbon()
    .radius(innerRadius-1);
    //.padAngle(1 / innerRadius);

    const connections = chord(chordData);

    const names =  ["Fire", "Grass", "Water", "Bug", "Normal", "Poison", "Electric", "Ground",
            "Fairy", "Fighting", "Psychic", "Rock", "Ghost", "Ice", "Dragon", "Dark", "Steel", "Flying", "No Second Type"];

    //console.log(names)
    //console.log(colorsArray)
    //console.log(connections)

    //chords, each created with a ribbon and using the correct color
    g3.selectAll("path")
    .data(connections)
    .join("path")
    .attr("fill", d => color(names[d.source.index]))
    .attr("d", ribbon)
    .attr("transform", `translate(${width/9}, ${height*0.23})`)
    .style("mix-blend-mode", "multiply");

    //arcs, each labelling a type by color
    /*const arcs = g3.append("g")
    .selectAll("path")
    .data(connections.groups)
    .join("path")
    .attr("d", arc)
    .attr("fill", d => color(names[d.index]))
    .attr("transform", `translate(${width/9}, ${height*0.23})`);*/
    
    //arcs, each labelling a type by color
    const arcs = g3.selectAll("g")
    .data(connections.groups)
    .join("g")
    .append("path")
    .attr("d", arc)
    .attr("fill", d => color(names[d.index]))
    .attr("transform", `translate(${width/9}, ${height*0.23})`);
    /*.append("text")
    .text("aaaaaaaaaaaaaaaaaaaaaa")
    .attr("x", 50)
    .attr("y", 50)
    .attr("font-size", 10));*/
    
    const labelAngels = [5, 23, 45, 70, 89, 110, 123, 137, 150, 161, 177, 193, 206, 217, 227, 240, 251, 267, 320];
    //arc labels
    for(let i = 0; i < names.length; i++){
        let name = names[i];
        if(labelAngels[i] < 90 || labelAngels[i] > 270){
            g3.append("text")
            .text(name)
            .attr("x", width/9)
            .attr("y", height*0.23 - outerRadius-1)
            .attr("transform", `rotate(${labelAngels[i]}, ${width/9},${height*0.23})`)
            .attr("font-size", 12)
            .attr("text-anchor", "middle");
        }else{
            g3.append("text")
            .text(name)
            .attr("x", width/9)
            .attr("y", height*0.23 + outerRadius+9)
            .attr("transform", `rotate(${labelAngels[i]+180}, ${width/9},${height*0.23})`)
            .attr("font-size", 12)
            .attr("text-anchor", "middle");
        }
    }

    //plot 3 title
    g3.append("text")
        .attr("x", scatterWidth/2+20)
        .attr("y", scatterTop+scatterMargin.top)
        .attr("font-size", 20)
        .attr("text-anchor", "middle")
        .text("Connections Between Each Pokemon's Multiple Types");


    //overall dashboard title
    svg.append("text")
    .attr("x", width*11/16)
    .attr("y", 100)
    .attr("font-size", 100)
    .text("Pokemon")
    svg.append("text")
    .attr("x", width*11/16)
    .attr("y", 200)
    .attr("font-size", 100)
    .text("Types")

}).catch(function(error){
    console.log(error);
});

/*const outerRadius = height/5;
    const innerRadius = outerRadius-10;

    const chord = d3.chord()
    .padAngle(10 / innerRadius)
    .sortSubgroups(d3.descending)
    .sortChords(d3.descending);

    const arc = d3.arc()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius);

    const ribbon = d3.ribbon()
    .radius(innerRadius-1);
    //.padAngle(1 / innerRadius);

    const chords = chord(chordData);

    const names =  ["Fire", "Grass", "Water", "Bug", "Normal", "Poison", "Electric", "Ground",
            "Fairy", "Fighting", "Psychic", "Rock", "Ghost", "Ice", "Dragon", "Dark", "Steel", "Flying", "None"];

    //console.log(names)
    //console.log(colorsArray)

    function groupTicks(d, step) {
  const k = (d.endAngle - d.startAngle) / d.value;
  return d3.range(0, d.value, step).map(value => {
    return {value: value, angle: value * k + d.startAngle};
  });
}
const tickStep = d3.tickStep(0, d3.sum(chordData.flat()), 100);
/*g3.append("path")
      .attr("fill", d => color(names[d.index]))
      .attr("d", arc);
    g3.selectAll("path")
    .data(names)
    .join("path")
    .attr("fill", d => color(names[d.index]))
      .attr("d", arc);

  g3.append("title")
      .text(d => `${names[d.index]}\n${formatValue(d.value)}`);

  const groupTick = group.append("g")
    .selectAll()
    .data(d => groupTicks(d, tickStep))
    .join("g")
      .attr("transform", d => `rotate(${d.angle * 180 / Math.PI - 90}) translate(${outerRadius},0)`);

  groupTick.append("line")
      .attr("stroke", "currentColor")
      .attr("x2", 6);

  groupTick.append("text")
      .attr("x", 8)
      .attr("dy", "0.35em")
      .attr("transform", d => d.angle > Math.PI ? "rotate(180) translate(-16)" : null)
      .attr("text-anchor", d => d.angle > Math.PI ? "end" : null)
      .text(d => formatValue(d.value));
  g3.select("text")
      .attr("font-weight", "bold")
      .text(function(d) {
        return this.getAttribute("text-anchor") === "end"
            ? `↑ ${names[d.index]}`
            : `${names[d.index]} ↓`;
      });

    g3.append("g")
      .attr("fill-opacity", 0.8)
    .selectAll("path")
    .data(chords)
    .join("path")
      .style("mix-blend-mode", "multiply")
      .attr("fill", d => color(names[d.source.index]))
      .attr("d", ribbon)
      .attr("transform", `translate(${width/9}, ${height*0.23})`)
    .append("title")
      .text(d => `${(d.source.value)} ${names[d.target.index]} → ${names[d.source.index]}
      ${d.source.index === d.target.index ? "" : `\n${(d.target.value)} ${names[d.source.index]} → ${names[d.target.index]}`}`);*/
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/*
d3.csv("players.csv").then(rawData =>{
    console.log("rawData", rawData);

    rawData.forEach(function(d){
        d.AB = Number(d.AB);
        d.H = Number(d.H);
        d.salary = Number(d.salary);
        d.SO = Number(d.SO);
    });


    const filteredData = rawData.filter(d=>d.AB>abFilter);
    const processedData = filteredData.map(d=>{
                          return {
                              "H_AB":d.H/d.AB,
                              "SO_AB":d.SO/d.AB,
                              "teamID":d.teamID,
                          };
    });
    console.log("processedData", processedData);

    //plot 1: Scatter Plot
    const svg = d3.select("svg");

    const g1 = svg.append("g")
                .attr("width", scatterWidth + scatterMargin.left + scatterMargin.right)
                .attr("height", scatterHeight + scatterMargin.top + scatterMargin.bottom)
                .attr("transform", `translate(${scatterMargin.left}, ${scatterMargin.top})`);

    // X label
    g1.append("text")
    .attr("x", scatterWidth / 2)
    .attr("y", scatterHeight + 50)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .text("H/AB");


    // Y label
    g1.append("text")
    .attr("x", -(scatterHeight / 2))
    .attr("y", -40)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("SO/AB");

    // X ticks
    const x1 = d3.scaleLinear()
    .domain([0, d3.max(processedData, d => d.H_AB)])
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
    .domain([0, d3.max(processedData, d => d.SO_AB)])
    .range([scatterHeight, 0]);

    const yAxisCall = d3.axisLeft(y1)
                        .ticks(13);
    g1.append("g").call(yAxisCall);

    // circles
    const circles = g1.selectAll("circle").data(processedData);

    circles.enter().append("circle")
         .attr("cx", d => x1(d.H_AB))
         .attr("cy", d => y1(d.SO_AB))
         .attr("r", 5)
         .attr("fill", "#69b3a2");

    const g2 = svg.append("g")
                .attr("width", distrWidth + distrMargin.left + distrMargin.right)
                .attr("height", distrHeight + distrMargin.top + distrMargin.bottom)
                .attr("transform", `translate(${distrLeft}, ${distrTop})`);

    //plot 2: Bar Chart for Team Player Count

    const teamCounts = processedData.reduce((s, { teamID }) => (s[teamID] = (s[teamID] || 0) + 1, s), {});
    const teamData = Object.keys(teamCounts).map((key) => ({ teamID: key, count: teamCounts[key] }));
    console.log("teamData", teamData);


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
    .text("Team");


    // Y label
    g3.append("text")
    .attr("x", -(teamHeight / 2))
    .attr("y", -40)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("Number of players");

    // X ticks
    const x2 = d3.scaleBand()
    .domain(teamData.map(d => d.teamID))
    .range([0, teamWidth])
    .paddingInner(0.3)
    .paddingOuter(0.2);

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
    .attr("x", d => x2(d.teamID))
    .attr("width", x2.bandwidth())
    .attr("height", d => teamHeight - y2(d.count))
    .attr("fill", "steelblue");


    }).catch(function(error){
    console.log(error);
});*/