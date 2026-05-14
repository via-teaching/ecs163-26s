const margin = { top: 70, right: 70, bottom: 70, left: 175 };
const width = 600 - margin.right - margin.left;
const windoww = window.innerWidth - margin.left - margin.right;
const windowh = window.innerHeight; 
const height = 400 - margin.top - margin.bottom;
const radius = Math.min(width, height) / 2 - margin;
const pieWidth = 600 - margin.left - margin.right;
const pieHeight = 600 - margin.top - margin.bottom;
const chordw = 600 - margin.left - margin.right;
const chordh = 600 - margin.top - margin.bottom;
const inrad = 140;
const outrad = 150;

d3.csv("pokemon.csv").then(rawData => {
    console.log(rawData);

    rawData.forEach(function (d) {
        d.Attack = Number(d.Attack);
        d.Sp_Atk = Number(d.Sp_Atk);
        d.HP = Number(d.HP);
    });

    //bar chart 
    const svg = d3.select("#mjpangan").append("svg")
        .attr("width", windoww + margin.right + margin.left)
        .attr("height", height + margin.bottom + 25)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + 40 + ")");

    const avg_atk = d3.nest()
        .key(function (d) { return d.Type_1; })
        .rollup(function (values) {
            return d3.mean(values, function (d) {
                return d.Attack;
            });
        })
        .entries(rawData);

    avg_atk.sort((a, b) => d3.descending(a.value, b.value));

    const x = d3.scaleLinear()
        .range([0, windoww - 80])
        .domain([0, d3.max(avg_atk, function (d) { return d.value })]);

    const y = d3.scaleBand()
        .range([height, 0])
        .padding(0.1)
        .domain(avg_atk.map(function (d) { return d.key }));

    const xAxis = d3.axisBottom(x)
    const yAxis = d3.axisLeft(y)

    svg.selectAll(".bar")
        .data(avg_atk)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("y", function (d) { return y(d.key); })
        .attr("height", y.bandwidth())
        .attr("x", 0)
        .attr("width", function (d) { return x(d.value); })
        .style("fill", "skyblue")

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)

    svg.append("g")
        .call(yAxis)

    svg.append('text')
        .attr("x", windoww / 2)
        .attr("y", height + 50)
        .attr("font-size", "15px")
        .attr("text-anchor", "middle")
        .text("Average Attack");

    svg.append("text")
        .attr("x", -(width / 3))
        .attr("y", -70)
        .attr("font-size", "15px")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text("Pokemon Type");

    svg.append('text')
        .attr("x", (windoww / 2))
        .attr("y", -20)
        .attr("font-size", "20px")
        .attr("text-anchor", "middle")
        .text("Pokemon Type Strength Overview: Average Attack");



    //donut chart 
    const svg1 = d3.select("#mjpangan").append("svg")
        .attr("width", pieWidth + margin.right + 300)
        .attr("height", pieHeight + margin.top)
        .append("g")
        .attr("transform", "translate(" + 400 + "," + pieHeight / 2 + ")");

    const f_data = rawData.filter(d => d.Type_1 === "Psychic");
    const d_data = rawData.filter(d => d.Type_1 === "Dragon");
    const n_data = rawData.filter(d => d.Type_1 === "Normal");

    const thresh = [30, 60, 90, 120, 150, 180, 210, 240, 270];
    const binbin = d3.histogram()
        .value(function (d) {
            return d.HP;
        })
        .thresholds(thresh);

    const fbins = binbin(f_data);
    const dbins = binbin(d_data);
    const nbins = binbin(n_data);

    fbins.forEach(function (d) {
        d.label = d.x0 + "-" + (d.x1 - 1);
    });
    console.log(fbins);

    dbins.forEach(function (d) {
        d.label = d.x0 + "-" + (d.x1 - 1);
    });

    nbins.forEach(function (d) {
        d.label = d.x0 + "-" + (d.x1 - 1);
    });
    console.log(dbins);

    const color = d3.scaleOrdinal()
        .domain(thresh)
        .range(d3.schemePaired);

    const parc = d3.arc()
        .innerRadius(50)
        .outerRadius(150)
        .cornerRadius(10)
        .padAngle(0.01);

    function update(data) {
        svg1.selectAll('path').remove();
        svg1.selectAll('.legend-item').remove();
        svg1.selectAll('text').remove();

        var pie = d3.pie()
            .value(function (d) { return d.length; })
            .sort(function (a, b) { console.log(a); return d3.ascending(a.key, b.key); });
        //var data_ready = pie(data);

        var u = svg1.selectAll('path')
            .data(pie(data))
            .enter()
            .append('path')
            .attr('d', parc)
            .attr('fill', function (d) { return color(d.data.label); })
            .attr('stroke', 'white')
            .attr('stroke-width', 1);

        var legend = svg1.append("g")
            .attr('transform', 'translate(0, 10)');

        var legendb = legend.selectAll('.legend-item')
            .data(pie(data))
            .enter()
            .append('g')
            .attr('class', 'legend-item')
            .attr('transform', function (d, i) {
                return 'translate(200,' + (i * 22) + ')';
            });

        legendb.append('rect')
            .attr('width', 14)
            .attr('height', 14)
            .attr('fill', function (d) {
                return color(d.data.label);
            });

        legendb.append('text')
            .attr('x', 22)
            .attr('y', 10)
            .attr('font-size', '12px')
            .attr('fill', 'black')
            .text(function (d) {
                return d.data.label;
            });

        svg1.append('text')
            .attr('x', 200)
            .attr('y', -10)
            .attr('font-size', '12px')
            .attr('fill', 'black')
            .text("Legend:")

        if (data === fbins) {
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
    update(fbins);

    d3.select("#dragonbutton")
        .style('position', 'absolute')
        .style('left', '500px')
        .style('top', '760px');
    d3.select("#psybutton")
        .style('position', 'absolute')
        .style('left', '165px')
        .style('top', '760px');
    d3.select("#normalbutton")
        .style('position', 'absolute')
        .style('left', '320px')
        .style('top', '760px');

    d3.select("#dragonbutton").on('click', function () {
        update(dbins);
    });
    d3.select("#psybutton").on('click', function () {
        update(fbins);
    });
    d3.select("#normalbutton").on('click', function () {
        update(nbins);
    });






    //chord diagram
    const filt = rawData.filter(function(d) { return d.Type_2 && d.Type_2.trim() !== ""; });
    const typedata = filt.map(function (d) {

        return {
            t1: d.Type_1,
            t2: d.Type_2,
        };
    });
    console.log('typedata', typedata);

    const types = Array.from(new Set(typedata.flatMap(function (d) {
        return [d.t1, d.t2]
    })
    ));

    const idx = {};

    types.forEach(function (type, i) {
        idx[type] = i;
    });

    const t1and2 = Array.from({ length: types.length }, () => Array(types.length).fill(0));

    typedata.forEach(function (d) {
        const i = idx[d.t1];
        const j = idx[d.t2];

        t1and2[i][j] += 1
        t1and2[j][i] += 1

    });

    const chord = d3.chord()
        .padAngle(0.05)
        .sortSubgroups(d3.descending)
        .sortChords(d3.descending);

    const carc = d3.arc()
        .innerRadius(inrad)
        .outerRadius(outrad);

    const ribbon = d3.ribbon()
        .radius(inrad - 1);

    const ccolor = d3.scaleOrdinal()
        .domain(types)
        .range(d3.schemeTableau10);

    const svg2 = d3.select("#mjpangan").append("svg")
        .attr("width", chordw + margin.left + margin.right)
        .attr("height", chordh + 55)
        .append("g")
        .attr("transform", "translate(" + 350 + "," + chordh / 2 + ")");

    const chords = chord(t1and2);

    const group = svg2.append('g')
        .selectAll('g')
        .data(chords.groups)
        .join('g')

    group.append('path')
        .attr('fill', d => ccolor(types[d.index]))
        .attr('stroke', d => d3.rgb(ccolor(types[d.index])).darker())
        .attr('d', carc);

    svg2.append('g')
        .attr('fill-opacity', 0.75)
        .selectAll('path')
        .data(chords)
        .join('path')
        .attr('d', ribbon)
        .attr('fill', d => ccolor(types[d.source.index]))
        .attr('stroke', d => d3.rgb(ccolor(types[d.source.index])).darker());

    const lrad = outrad + 20;
    group.append('text')
        .each(d => {
            d.angle = (d.startAngle + d.endAngle) / 2;
        })
        .attr('dy', '.35em')
        .attr('transform', function (d) {
            const angle = (d.startAngle + d.endAngle) / 2;
            const x = Math.cos(angle - Math.PI / 2) * lrad;
            const y = Math.sin(angle - Math.PI / 2) * lrad;

            return 'translate(' + x + ',' + y + ')';
        })
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .style('font-size', '12px')
        .style('fill', 'black')
        .text(d => types[d.index]);

    svg2.append('text')
        .attr("x", 0)
        .attr("y", -195)
        .attr("font-size", "20px")
        .attr("text-anchor", "middle")
        .text("Intersection of Pokemon Types (Excluding No Type 2)");

}); 

//I used Youtube Videos, D3.js Graph Gallery, and ChatGPT to help with my code 
//used to help learn how to code different graphs, add the buttons, and fix errors 


