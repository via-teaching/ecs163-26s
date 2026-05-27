const margin = { top: 70, right: 70, bottom: 70, left: 175 };
const width = 600 - margin.right - margin.left;
const windoww = window.innerWidth - margin.left - margin.right; //width of entire window - right and left margins 
const windowh = window.innerHeight; //height of entire window 
const height = 400 - margin.top - margin.bottom;
const radius = Math.min(width, height) / 2 - margin;
const pieWidth = 600 - margin.left - margin.right; //width used for pie/donut
const pieHeight = 600 - margin.top - margin.bottom; //height used for pie/donut 
const chordw = 600 - margin.left - margin.right; //width usd for chord 
const chordh = 600 - margin.top - margin.bottom; //height used for chord 
const inrad = 140; //chord inner radius 
const outrad = 150; //chord outer radius 

//Should use Chrome over Safari for visualization because it looks better and the zoom for the scatter plot works 
//I used Youtube Videos, D3.js Graph Gallery, GitHub, and ChatGPT to help with my code 
//used to help learn how to code different graphs, adds transitions and interactions, add the buttons, and fix errors

d3.csv("pokemon.csv").then(rawData => { //load and parse data from csv; named rawData 
    console.log(rawData);

    rawData.forEach(function (d) {
        d.Attack = Number(d.Attack); //make sure they are loaded in as numbers  
        d.Sp_Atk = Number(d.Sp_Atk);
        d.HP = Number(d.HP);
    });

    //scatter plot zoom-in
    const scatter = d3.select("#mjpangan").append("svg") //append svg to mjpangan div id 
        .attr("width", width + margin.right + margin.left) //width of window 
        .attr("height", windowh + 150) //height of window 
        .style('touch-action', 'none')
        .append("g") //add new graphic 
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")"); //move graphic to start at margin left and height 40 

    scatter.append('defs') //adds a rectangle window for the visualization to be inside of; doen't let dots be outside of graph 
        .append('clipPath')
        .attr('id', 'clip')
        .append('rect')
        .attr('width', width) //size of window 
        .attr('height', (windowh - 200));

    const x = d3.scaleLinear() //x -axis 
        .range([0, width])
        .domain([0, d3.max(rawData, function (d) { return d.HP })]);

    const y = d3.scaleLinear() //y - axis 
        .range([windowh - 200, 0])
        .domain([0, d3.max(rawData, function (d) { return d.Attack })]);

    const sxAxis = d3.axisBottom(x); //x axis on the bottom 
    const syAxis = d3.axisLeft(y); //y axis on the left 

    const dg = scatter.append('g')
        .attr('clip-path', 'url(#clip)'); //adds clip so things don't go out of rectangle 

    const dots = dg.selectAll('circle') //adds dots to the graph 
        .data(rawData)
        .enter()
        .append('circle')
        .attr('cx', function (d) { return x(d.HP); }) //x of dot position is HP 
        .attr('cy', function (d) { return y(d.Attack); }) //y or dot position is Attack 
        .attr('r', 1.5) //size of dots 
        .style('fill', 'blue') //dots are blue 
        .style('pointer-events', 'none');

    const tooltip = scatter.append('text') 
        .attr('class', 'tooltip')
        .style('font-size', '10px')
        .style('display', 'none');

    const xg = scatter.append("g") //add new graphic 
        .attr("class", "x axis") //add x axis 
        .attr("transform", "translate(0," + 535 + ")") //position x axis 
        .call(sxAxis); //call x axis 

    const yg = scatter.append("g") //add new graphic 
        .call(syAxis); //call y axis 

    const zoom = d3.zoom() //zoom function 
        .scaleExtent([1, 20]) 
        .extent([[0, 0], [width, height]]) 
        .on('zoom', zoomed); //when zoom call zoomed function 

    const zr = scatter.append('rect') //rectangle that can be zoomed 
        .attr('width', width) //size of rectangle 
        .attr('height', windowh - 200)
        .style('fill', 'none')
        .attr('pointer-events', 'all')
        .raise()
        .call(zoom); //calls zoom function 

    function zoomed() { //zoomed function 
        const transform = d3.event.transform; //creates transform object 

        const newx = transform.rescaleX(x) //rescales x 
        const newy = transform.rescaleY(y) //rescales y 

        xg.call(d3.axisBottom(newx)) //new rescaled x - axis 
        yg.call(d3.axisLeft(newy)) //new rescaled y - axis 

        dots
            //.attr('r', 1.5 / transform.k)
            .attr('cx', function (d) { return newx(d.HP); }) //rescaled dots to x 
            .attr('cy', function (d) { return newy(d.Attack); }) //rescaled dots to y 
    }

    d3.select("#reset") //select reset button from html to determin position 
        .style('position', 'absolute')
        .style('left', '100px') // x position of button
        .style('top', '650px'); //y position of button 
    d3.select("#reset").on('click', function () { //select reset button from html to so on click it calls resetZoom function
        resetZoom();
    });

    function resetZoom() { //resets zoom 
        scatter.transition() //transition to original zoom 
            .duration(750) //how long it takes 
            .call(zoom.transform, d3.zoomIdentity); 
    }

    scatter.append('text') //add text 
        .attr("x", width / 2) //middle of graph 
        .attr("y", 580) //height 
        .attr("font-size", "15px") //15 font size 
        .attr("text-anchor", "middle") //helps alignment 
        .text("Pokemon HP"); //text that is being added 

    scatter.append("text") //add text 
        .attr("x", -280) //middle of y axis 
        .attr("y", -55) // position against y axis 
        .attr("font-size", "15px") // 15 font size 
        .attr("text-anchor", "middle") //helps alignment 
        .attr("transform", "rotate(-90)") //rotate to -90 degrees 
        .text("Pokemon Attack"); //text being added 

    scatter.append('text') //add text 
        .attr("x", (width / 2)) //middle of graph 
        .attr("y", -20) //above graph 
        .attr("font-size", "20px") //font size 20
        .attr("text-anchor", "middle") //helps alignment 
        .text("Pokemon Attack vs. HP"); //text being added 



    //bar chart brushable  
    const avg_atk = d3.nest() //groups my Type_1 data together into array for bar chart 
        .key(function (d) { return d.Type_1; }) //key is Type_1 from data 
        .rollup(function (values) { //value is Attack from data 
            return d3.mean(values, function (d) { //finds average of the attack values for certain Type_1
                return d.Attack;
            });
        })
        .entries(rawData); //uses rawData as data to nest 

    avg_atk.sort((a, b) => d3.descending(a.value, b.value)); //sorts my data descending 

    const bart = d3.select('#mjpangan').append('svg') //new svg for bar chart 
        .attr('width', width + margin.right + margin.left + 100) //width of chart 
        .attr('height', windowh + margin.top + margin.bottom) //height of chart 
        .append('g')
        .attr('transform', 'translate(' + 80 + ',' + margin.top + ')'); //position of chart 

    const by = d3.scaleBand() //y axis scaled by group 
        .range([0, height]) //range of y axis 
        .padding(0.1) //space between bars 
        .domain(avg_atk.map(function (d) { return d.key })); //domain is the pokemon types 

    const bx = d3.scaleLinear() //x axis scaled by attack number 
        .range([0, width]) //range of x axis 
        .domain([0, d3.max(avg_atk, function (d) { return d.value })]); //domain is teh avg. attack numbers 

    const xAxis = d3.axisBottom(bx) //positions x axis on bottom 
    const yAxis = d3.axisLeft(by) //position y axis on bottom 

    bart.selectAll('.mainBar') //main bars on graph 
        .data(avg_atk) //data is avg_atk 
        .enter()
        .append('rect') //adds the bars 
        .attr('class', 'mainBar')
        .attr('y', function (d) { return by(d.key) }) //y is the pokemon type 
        .attr('height', by.bandwidth()) //height 
        .attr('x', 0) 
        .attr('width', function (d) { return bx(d.value) }) //width is the avg_attack 
        .style('fill', 'skyblue') //skyblue bars 

    bart.append('text') //add text 
        .attr("x", (width / 2)) //middle of graph 
        .attr("y", margin.top + 240) //height 
        .attr("font-size", "15px") //15 font size 
        .attr("text-anchor", "middle") //helps alignment 
        .text("Pokemon Type"); //text that is being added 

    bart.append("text") //add text 
        .attr("x", -130) //middle of y axis 
        .attr("y", -65) // positin against y axis 
        .attr("font-size", "15px") // 15 font size 
        .attr("text-anchor", "middle") //helps alignment 
        .attr("transform", "rotate(-90)") //rotate to -90 degrees 
        .text("Pokemon Average Attack"); //text being added 

    bart.append('text') //add text 
        .attr("x", (width / 2)) //middle of graph 
        .attr("y", margin.top - 100) //above graph 
        .attr("font-size", "20px") //font size 20
        .attr("text-anchor", "middle") //helps alignment 
        .text("Pokemon Types Average Attack"); //text being added

    let miniW = 100; //mini bar graph width 
    let miniH = height; //mini bar graph height 

    const mini = bart.append('g') //mini bar graph position 
        .attr('transform', 'translate(' + 4 + margin.top + ')');

    const miniX = d3.scaleLinear() //mini x axis 
        .range([0, miniW])
        .domain([0, d3.max(avg_atk, function (d) { return d.value; })]);

    const miniY = d3.scaleBand() //mini y axis 
        .range([0, miniH])
        .padding(0.1)
        .domain(avg_atk.map(function (d) { return d.key; }));

    mini.selectAll('.miniBar') //mini bar graph bars 
        .data(avg_atk)
        .enter()
        .append('rect')
        .attr('class', 'miniBar')
        .attr('y', function (d) { return miniY(d.key); })
        .attr('height', miniY.bandwidth())
        .attr('x', 0)
        .attr('width', function (d) { return miniX(d.value); })
        .style('fill', 'gray');

    const brush = d3.brushY() //brush function 
        .extent([[0, 0], [miniW, miniH]])
        .on('brush end', brushed); //calls brushed when brush selected 

    mini.append('g') //can you brush on mini bar graph 
        .attr('class', 'brush')
        .call(brush); //calls brush 

    function brushed() { //brushed function 
        const select = d3.event.selection; //select object 
        if (!select) { //if nothing selected 
            by.domain(avg_atk.map(function (d) { return d.key; }));
            updateBars(avg_atk);
            return;
        }

        const selected = avg_atk.filter(function (d) { //if selected 
            const yP = miniY(d.key); //first of selection 
            const yM = yP + miniY.bandwidth(); //bottom of selection 

            return yM >= select[0] && yP <= select[1]; //range of the selection 
        });

        by.domain(selected.map(function (d) { return d.key; })); //new domain of by

        updateBars(selected); //calls updateBars with selected data 
        console.log('brushed', selected)
        /*bart.select('.y.axis') //updates new y axis 
            .call(d3.axisLeft(by));*/
    }

    function updateBars(dataP) { //updates to the selected bars 
        bart.select('.y.axis') //updates new y axis 
            .call(d3.axisLeft(by));

        const bars = bart.selectAll('.mainBar') //data for main bar is now selected data 
            .data(dataP, function (d) { return d.key; });

        bars.exit().remove(); //removes bars not in data 

        bars.enter() //adds new bars for new data 
            .append('rect')
            .attr('class', 'mainBar')
            .merge(bars)
            .attr('y', function (d) { return by(d.key) })
            .attr('height', by.bandwidth())
            .attr('x', 0)
            .attr('width', function (d) { return bx(d.value) })
            .style('fill', 'skyblue');
    }

    bart.append("g") //add new graphic 
        .attr("class", "x axis") //add x axis 
        .attr("transform", "translate(0," + height + ")") //position x axis 
        .call(d3.axisBottom(bx))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end'); //call x axis 

    bart.append("g") //add new graphic 
        .attr('class', 'y axis')
        .call(yAxis); //call y axis

    bart.append('text') //add text 
        .attr("x", 515) //middle of graph 
        .attr("y", margin.top - 75) //above graph 
        .attr("font-size", "12px") //font size 20
        .attr("text-anchor", "middle") //helps alignment 
        .text("Brush to Filter Bars"); //text being added



    //chord diagram
    const filt = rawData.filter(function (d) { return d.Type_2 !== ""; }); //filter data so it only has pokemon that have two Types 
    const typedata = filt.map(function (d) { //map type 1 data to type 2 data 
        return {
            t1: d.Type_1,
            t2: d.Type_2,
        };
    });
    console.log('typedata', typedata);

    const types = Array.from(new Set(typedata.flatMap(function (d) { //creates new array with only type 1 and type 2 data 
        return [d.t1, d.t2]
    })
    ));

    const idx = {};

    types.forEach(function (type, i) { //assigns an index based on position of type in the array
        idx[type] = i;
    });

    const t1and2 = Array.from({ length: types.length }, () => Array(types.length).fill(0)); //creates a balnk matrix 

    typedata.forEach(function (d) { //adds values to matrix 
        const i = idx[d.t1]; //finds index of typ 1 
        const j = idx[d.t2]; //find index of type 2 

        t1and2[i][j] += 1 //add to matrix of type 1 and type 2 pair 
        t1and2[j][i] += 1

    });

    const chord = d3.chord() //creates chord 
        .padAngle(0.05) //spaces between types 
        .sortSubgroups(d3.descending) //sort subgroups 
        .sortChords(d3.descending); //sorts chords 

    const carc = d3.arc() //arcs for chord graph 
        .innerRadius(inrad)
        .outerRadius(outrad);

    const ribbon = d3.ribbon() //ribbons for chord graph 
        .radius(inrad - 1);

    const ccolor = d3.scaleOrdinal() //color scheme for chord graph 
        .domain(types)
        .range(["#ff4040", "#ffa43d", "#a6ff3a", "#38ff56", "#35feed", "#338efe", "#3a30fe", "#c92efd", "#fd2bf9", "#fc298f", "#890000", "#687800", "#87f1ff", "#aa7700", "#4c007f", "#10007b", "#006f3b", "#389900"]
        ) //range of 18 distinct colors 

    const svg2 = bart.append("g") //add new graphic to bart to position better 
        .attr("transform", "translate(" + 200 + "," + 550 + ")"); //position of element 

    const chords = chord(t1and2); //adds data for chord diagram; matrix made of two types

    const group = svg2.append('g') //add new graphic; chord groups 
        .selectAll('g')
        .data(chords.groups) //groups of chord 
        .join('g') //adds chords 

    group.append('path') //add paths of arcs 
        .attr('fill', d => ccolor(types[d.index])) //fill with color 
        .attr('stroke', d => d3.rgb(ccolor(types[d.index])).darker())
        .attr('d', carc); // add arc 

    svg2.append('g') //add new graphic 
        .attr('fill-opacity', 0.75) //opacity at 75%
        .selectAll('path')
        .data(chords) //data is chords 
        .join('path') //adds paths for chord diagram 
        .attr('class', 'chord')
        .attr('d', ribbon) //adds ribbons 
        .attr('fill', d => ccolor(types[d.source.index])) //ribbon colors 
        .attr('stroke', d => d3.rgb(ccolor(types[d.source.index])).darker())
        .style('opacity', 0)
        .transition() //transitions from transparent to colorful 
        .delay(function (d, i) { return i * 80; }) //does one by one 
        .duration(500) //time it takes for transition 
        .style('opacity', 0.7);

    svg2.selectAll('.chord') //select chords, if mouse hovers it only shows that chord 
        .on('mouseover', function (d) { //is hovers show chord 
            svg2.selectAll('.chord')
                .transition() //transition all other chords to more transparent 
                .duration(500)
                .style('opacity', 0.05);

            d3.select(this) //transition chord hovered over to be more opaque and be bolded 
                .transition()
                .duration(500)
                .style('opacity', 1)
                .style('stroke', 'black')
                .style('stroke-width', 2);
        })
        .on('mouseout', function () { //when mouse leaves, all chord transition back to being more opaque 
            svg2.selectAll('.chord')
                .transition()
                .duration(500)
                .style('opacity', 0.7)
                .style('stroke-width', 0);
        });

    const lrad = outrad + 20; //label radius 
    group.append('text') //add text 
        .each(d => {
            d.angle = (d.startAngle + d.endAngle) / 2; //each data point center angle 
        })
        .attr('dy', '.35em') //text position 
        .attr('transform', function (d) {
            const angle = (d.startAngle + d.endAngle) / 2; // data center angle 
            const x = Math.cos(angle - Math.PI / 2) * lrad; //horizantal position using center angle 
            const y = Math.sin(angle - Math.PI / 2) * lrad; //vertical position using center angle 

            return 'translate(' + x + ',' + y + ')'; //position of label 
        })
        .attr('text-anchor', 'middle') //helps alignment
        .attr('dominant-baseline', 'middle') //helps alignment 
        .style('font-size', '12px')
        .style('fill', 'black') //font color 
        .text(d => types[d.index]); //labels is the types 

    svg2.append('text') //add text 
        .attr("x", 0) //position of text 
        .attr("y", -195)
        .attr("font-size", "20px")
        .attr("text-anchor", "middle")
        .text("Intersection of Pokemon Types (Excluding No Type 2)"); //text being added 

    svg2.append('text') //add text 
        .attr("x", 275) //position of text 
        .attr("y", 0)
        .attr("font-size", "12px")
        .attr("text-anchor", "middle")
        .text("(Hover over chords)"); //text being added 


});