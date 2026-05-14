const windoww = window.innerWidth;
const windowh = window.innerHeight; 

const margin = { top: 70, right: 40, bottom: 70, left: 175 }
const width = 600 - margin.right - margin.left;
const height = 400 - margin.top - margin.bottom;
const radius = Math.min(width, height) / 2 - margin;
const pieWidth = 600 - margin.left - margin.right; 
const pieHeight = 600 - margin.top - margin.bottom; 
const chordw = 500;
const chordh = 500;
const inrad = 140;
const outrad = 150;

d3.csv("pokemon.csv").then(rawData => {
    console.log(rawData);

    rawData.forEach(function (d) {
        d.Attack = Number(d.Attack);
        d.Sp_Atk = Number(d.Sp_Atk);
    });

    //donut chart 
    const svg1 = d3.select("#mjpangan").append("svg")
        .attr("width", pieWidth + margin.right + 30)
        .attr("height", pieHeight + margin.top - 50)
        .append("g")
        .attr("transform", "translate(" + pieWidth / 2 + "," + pieHeight / 2 + ")");

    const f_data = rawData.filter(d => d.Type_1 === "Water");
    const thresh = [20, 40, 80, 100, 120, 140, 160, 180];
    const binbin = d3.histogram()
        .value(function (d) {
            return d.Sp_Atk;
        })
        .thresholds(thresh);

    const binbins = binbin(f_data);

    binbins.forEach(function (d) {
        d.label = d.x0 + "-" + (d.x1 - 1);
    });
    console.log(binbins);

    const color = d3.scaleOrdinal()
        .domain(binbins.map(d => d.label))
        .range(["#05fcaa", "#05b6fc", "#1105fc", "#8505fc", "#47fc05", "#fc05be", "#fc0547"]);

    const pie = d3.pie()
        .value(d => d.length);
    const data = pie(binbins);

    const parc = d3.arc()
        .innerRadius(50)
        .outerRadius(150)
        .cornerRadius(10)
        .padAngle(0.01);

    svg1.selectAll('path')
        .data(pie(binbins))
        .enter()
        .append('path')
        .attr('d', parc)
        .attr('fill', function (d) { return color(d.data.label); })
        .attr('stroke', 'white')
        .attr('stroke-width', 1);

    const legend = svg1.append("g")
        .attr('transform', 'translate(0, 10)');

    const legendb = legend.selectAll('.legend-item')
        .data(pie(binbins))
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

    svg1.append('text')
        .attr("x", 0)
        .attr("y", - 180)
        .attr("font-size", "20px")
        .attr("text-anchor", "middle")
        .text("Water Special Attack distrbution");


    //chord diagram
    const typedata = rawData.map(function (d) {

        let t;
        if (d.Type_2 && d.Type_2.trim() !== "") {
            t = d.Type_2;
        }
        else {
            t = "No Type 2";
        }
        return {
            t1: d.Type_1,
            t2: t
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
        .attr("width", chordw)
        .attr("height", chordh)
        .append("g")
        .attr("transform", "translate(" + chordw / 2 + "," + chordh / 2 + ")");

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

    const lrad = outrad + 30;
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
        .attr("y", -205)
        .attr("font-size", "20px")
        .attr("text-anchor", "middle")
        .text("Intersection of Pokemon Types");

    
//bar chart 
    const svg = d3.select("#mjpangan").append("svg")
        .attr("width", width + margin.right + 70)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + 100 + "," + 40 + ")"); 

    const avg_atk = d3.nest()
        .key(function (d) { return d.Type_1; })
        .rollup(function (values) {
            return d3.mean(values, function (d) {
                return d.Attack;
            });
        })
        .entries(rawData); 

    avg_atk.sort((a,b) => d3.descending(a.value, b.value));
    
    const x = d3.scaleLinear()
        .range([0, width])
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
        .attr("x", width / 2)
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
        .text("Type");

    svg.append('text')
        .attr("x", (width / 2))
        .attr("y", -20)
        .attr("font-size", "20px")
        .attr("text-anchor", "middle")
        .text("Average Attack by Pokemon Type");

    
    
    


});


