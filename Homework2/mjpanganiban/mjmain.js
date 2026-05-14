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

d3.csv("pokemon.csv").then(rawData => { //load and parse data from csv; named rawData 
    console.log(rawData);

    rawData.forEach(function (d) {
        d.Attack = Number(d.Attack); //make sure they are loaded in as numbers  
        d.Sp_Atk = Number(d.Sp_Atk);
        d.HP = Number(d.HP);
    });

    //bar chart 
    const svg = d3.select("#mjpangan").append("svg") //append svg to mjpangan div id 
        .attr("width", windoww + margin.right + margin.left) //width of window 
        .attr("height", height + margin.bottom + 25) //height of window 
        .append("g") //add new graphic 
        .attr("transform", "translate(" + margin.left + "," + 40 + ")"); //move graphic to start at margin left and height 40 

    const avg_atk = d3.nest() //groups my Type_1 data together into array for bar chart 
        .key(function (d) { return d.Type_1; }) //key is Type_1 from data 
        .rollup(function (values) { //value is Attack from data 
            return d3.mean(values, function (d) { //finds average of the attack values for certain Type_1
                return d.Attack;
            });
        })
        .entries(rawData); //uses rawData as data to nest 

    avg_atk.sort((a, b) => d3.descending(a.value, b.value)); //sorts my data descending 

    const x = d3.scaleLinear() //linear scale; quantitative scale 
        .range([0, windoww - 80]) //takes up most of window; bigger graph 
        .domain([0, d3.max(avg_atk, function (d) { return d.value })]); //domain is the average attack values 

    const y = d3.scaleBand() //ordinal scale 
        .range([height, 0]) // from height to 0 
        .padding(0.1) //space between bars 
        .domain(avg_atk.map(function (d) { return d.key })); //range is the Type_1 values 

    const xAxis = d3.axisBottom(x) //put x axis on bottom 
    const yAxis = d3.axisLeft(y) //put y axis to the left 

    svg.selectAll(".bar") //select from bar class; adds bars to graph 
        .data(avg_atk) //data is avg_atk 
        .enter().append("rect") //add the rectangles for the graph 
        .attr("class", "bar") //add the bars 
        .attr("y", function (d) { return y(d.key); }) //set y of bars to average attack 
        .attr("height", y.bandwidth()) //set height of bars to height of y axis 
        .attr("x", 0) //set x of bars to 0 
        .attr("width", function (d) { return x(d.value); }) //width of bars is by the Type_1 of pokemon 
        .style("fill", "skyblue") //fill bars with color skyblue 

    svg.append("g") //add new graphic 
        .attr("class", "x axis") //add x axis 
        .attr("transform", "translate(0," + height + ")") //position x axis 
        .call(xAxis) //call x axis 

    svg.append("g") //add new graphic 
        .call(yAxis) //call y axis 

    svg.append('text') //add text 
        .attr("x", windoww / 2) //middle of graph 
        .attr("y", height + 50) //height 
        .attr("font-size", "15px") //15 font size 
        .attr("text-anchor", "middle") //helps alignment 
        .text("Average Attack"); //text that is being added 

    svg.append("text") //add text 
        .attr("x", -(width / 3)) //middle of y axis 
        .attr("y", -70) // positin against y axis 
        .attr("font-size", "15px") // 15 font size 
        .attr("text-anchor", "middle") //helps alignment 
        .attr("transform", "rotate(-90)") //rotate to -90 degrees 
        .text("Pokemon Type"); //text being added 

    svg.append('text') //add text 
        .attr("x", (windoww / 2)) //middle of graph 
        .attr("y", -20) //above graph 
        .attr("font-size", "20px") //font size 20
        .attr("text-anchor", "middle") //helps alignment 
        .text("Pokemon Type Strength Overview: Average Attack"); //text being added 



    //donut chart 
    const svg1 = d3.select("#mjpangan").append("svg") //new svg element 
        .attr("width", pieWidth + margin.right + 300) //width of element 
        .attr("height", pieHeight + margin.top) //height of element 
        .append("g") //add new graphic 
        .attr("transform", "translate(" + 400 + "," + pieHeight / 2 + ")"); //position graphic at (400, piHeight/2)

    const f_data = rawData.filter(d => d.Type_1 === "Psychic"); //filter rawData for only Psychihc type_1 
    const d_data = rawData.filter(d => d.Type_1 === "Dragon"); //filter rawData for only Dragon type_1 
    const n_data = rawData.filter(d => d.Type_1 === "Normal"); //filter rawData for only Normal type_1 

    const thresh = [30, 60, 90, 120, 150, 180, 210, 240, 270]; //threshold i want for number bins 
    const binbin = d3.histogram() //number bin function; uses histogram bin function 
        .value(function (d) { //finds the HP data for the certain type 
            return d.HP;
        })
        .thresholds(thresh); //groups the HP data by threshold 

    const fbins = binbin(f_data); //bin psychic data 
    const dbins = binbin(d_data); //bin dragon data 
    const nbins = binbin(n_data); //bin normal data 

    fbins.forEach(function (d) { //label the bins for psychich data 
        d.label = d.x0 + "-" + (d.x1 - 1); //current bin number with next bin number - 1, for each bin 
    });
    console.log(fbins);

    dbins.forEach(function (d) { //label the bins for dragon data 
        d.label = d.x0 + "-" + (d.x1 - 1); 
    });
    console.log(dbins); 

    nbins.forEach(function (d) { //label the bins for normal data 
        d.label = d.x0 + "-" + (d.x1 - 1);
    });
    console.log(dbins);

    const color = d3.scaleOrdinal() //scale color by order 
        .domain(thresh) //domain is the threshold 
        .range(d3.schemePaired); //d3.schemePaired is a certain color pallete i chose 

    const parc = d3.arc() //arcs for the donut chart 
        .innerRadius(50) //50 to make it a donut 
        .outerRadius(150) //outradius is 150 
        .cornerRadius(10) //round corners 
        .padAngle(0.01); //spaces between the arcs 

    function update(data) { //so i can use buttons to update data; function to update 
        svg1.selectAll('path').remove(); //removes old paths 
        svg1.selectAll('.legend-item').remove(); //removes legend items 
        svg1.selectAll('text').remove(); //removes all text 

        var pie = d3.pie() //creates donut and position of each group on donut 
            .value(function (d) { return d.length; }) //determines size of each arc 
            .sort(function (a, b) { console.log(a); return d3.ascending(a.key, b.key); }); //sorts data from smallest to largest on pie 
        //var data_ready = pie(data);

        var u = svg1.selectAll('path') //build pie chart; each part of pie is a path built using parc 
            .data(pie(data)) //build from data 
            .enter() 
            .append('path') //add path 
            .attr('d', parc) //path uses parc 
            .attr('fill', function (d) { return color(d.data.label); }) //fill with color using labels from dat 
            .attr('stroke', 'white') //add srokes between the arcs 
            .attr('stroke-width', '2px'); // size of stroke 

        var legend = svg1.append("g") //add legend 
            .attr('transform', 'translate(0, 10)'); //position of legend 

        var legendb = legend.selectAll('.legend-item') //select all legend items 
            .data(pie(data)) //use data for legend 
            .enter()
            .append('g') //add graphic 
            .attr('class', 'legend-item') //add from legend item 
            .attr('transform', function (d, i) { //positions the legend-item with x = 200 and spacing of i * 22 
                return 'translate(200,' + (i * 22) + ')';
            });

        legendb.append('rect') //add rectangles to legend 
            .attr('width', 14) //width of rect 
            .attr('height', 14) //height of rect 
            .attr('fill', function (d) { //fill color of rectangles with color and data labels 
                return color(d.data.label);
            });

        legendb.append('text') //add text to legend 
            .attr('x', 22) //position 
            .attr('y', 10) 
            .attr('font-size', '12px') //font size 
            .attr('fill', 'black') //black text 
            .text(function (d) {
                return d.data.label; //text is the data labels 
            });

        svg1.append('text') //add text 
            .attr('x', 200)
            .attr('y', -10)
            .attr('font-size', '12px')
            .attr('fill', 'black')
            .text("Legend:") //labels the legend 

        if (data === fbins) { //adds title of graph depending on if data is dragon, psychic, or normal 
            svg1.append('text')
                .attr("x", 0)
                .attr("y", - 180)
                .attr("font-size", "20px")
                .attr("text-anchor", "middle")
                .text("Psychic Type: HP Distrbution");
        }
        if (data === dbins) {
            svg1.append('text')
                .attr("x", 0)
                .attr("y", - 180)
                .attr("font-size", "20px")
                .attr("text-anchor", "middle")
                .text("Dragon Type: HP Distrbution");
        }
        if (data === nbins) {
            svg1.append('text')
                .attr("x", 0)
                .attr("y", - 180)
                .attr("font-size", "20px")
                .attr("text-anchor", "middle")
                .text("Normal Type: HP Distrbution");
        }



    }
    update(fbins); //use psychic data first 

    d3.select("#dragonbutton") //select dragon button from html to determin position 
        .style('position', 'absolute')
        .style('left', '500px') // x position of button
        .style('top', '760px'); //y position of button 
    d3.select("#psybutton") //select psychic button from html to determin position
        .style('position', 'absolute') 
        .style('left', '165px')// x position of button
        .style('top', '760px');//y position of button 
    d3.select("#normalbutton") //select normal button from html to determin position
        .style('position', 'absolute') 
        .style('left', '320px')// x position of button
        .style('top', '760px');//y position of button 

    d3.select("#dragonbutton").on('click', function () { //select dragon button from html to so on click it calls update function and uses dragon data 
        update(dbins);
    });
    d3.select("#psybutton").on('click', function () { //select psychic button from html to so on click it calls update function and uses dragon data 
        update(fbins);
    });
    d3.select("#normalbutton").on('click', function () { //select normal button from html to so on click it calls update function and uses dragon data 
        update(nbins);
    });



    //chord diagram
    const filt = rawData.filter(function(d) { return d.Type_2 !== ""; }); //filter data so it only has pokemon that have two Types 
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
        .range( ["#ff4040","#ffa43d","#a6ff3a","#38ff56","#35feed","#338efe","#3a30fe","#c92efd","#fd2bf9","#fc298f","#890000","#687800","#87f1ff","#aa7700","#4c007f","#10007b","#006f3b","#389900"]
        ) //range of 18 distinct colors 
    const svg2 = d3.select("#mjpangan").append("svg") //add new svg element 
        .attr("width", chordw + margin.left + margin.right) //width of element 
        .attr("height", chordh + 55) //height of element
        .append("g")
        .attr("transform", "translate(" + 350 + "," + chordh / 2 + ")"); //position of element 

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
        .attr('d', ribbon) //adds ribbons 
        .attr('fill', d => ccolor(types[d.source.index])) //ribbon colors 
        .attr('stroke', d => d3.rgb(ccolor(types[d.source.index])).darker());

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

}); 

//I used Youtube Videos, D3.js Graph Gallery, and ChatGPT to help with my code 
//used to help learn how to code different graphs, add the buttons, and fix errors 


