// hw2 - pokemon dashboard

d3.csv("pokemon.csv").then(function(data) {

    // convert stats to numbers
    data.forEach(d => {
        d.HP = +d.HP;
        d.Attack = +d.Attack;
        d.Defense = +d.Defense;
        d["Sp. Atk"] = +d["Sp. Atk"];
        d["Sp. Def"] = +d["Sp. Def"];
        d.Speed = +d.Speed;
        d.Total = +d.Total;
    });

    // get all unique types for the color scale
    let types = [];
    data.forEach(d => {
        if (!types.includes(d["Type 1"])) types.push(d["Type 1"]);
    });

    // shared colors so each type looks the same in every chart
    let color = d3.scaleOrdinal()
        .domain(types)
        .range(d3.schemeTableau10.concat(d3.schemeSet3));

    barChart(data, color);
    scatter(data, color);
    parallel(data, color);
});


// ---- bar chart ----
function barChart(data, color) {
    let svg = d3.select("#chart1");
    let box = svg.node().getBoundingClientRect();
    let width = box.width;
    let height = box.height;

    // margins
    let mt = 10, mr = 20, mb = 60, ml = 40;
    let w = width - ml - mr;
    let h = height - mt - mb;

    let g = svg.append("g")
        .attr("transform", "translate(" + ml + "," + mt + ")");

    // count pokemon per type
    let counts = {};
    data.forEach(d => {
        let t = d["Type 1"];
        if (counts[t]) counts[t]++;
        else counts[t] = 1;
    });

    // turn into array and sort descending
    let arr = [];
    for (let t in counts) {
        arr.push({type: t, count: counts[t]});
    }
    arr.sort((a,b) => b.count - a.count);

    // x scale - one band per type
    let x = d3.scaleBand()
        .domain(arr.map(d => d.type))
        .range([0, w])
        .padding(0.2);

    // y scale
    let maxCount = d3.max(arr, d => d.count);
    let y = d3.scaleLinear()
        .domain([0, maxCount])
        .nice()
        .range([h, 0]);

    // x axis (rotated labels so they don't overlap)
    g.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0," + h + ")")
        .call(d3.axisBottom(x))
        .selectAll("text")
            .attr("transform", "rotate(-40)")
            .style("text-anchor", "end");

    // y axis
    g.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y).ticks(6));

    // y label
    g.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -h/2)
        .attr("y", -30)
        .attr("text-anchor", "middle")
        .text("Number of Pokemon");

    // x label
    g.append("text")
        .attr("class", "axis-label")
        .attr("x", w/2)
        .attr("y", h + 55)
        .attr("text-anchor", "middle")
        .text("Primary Type");

    // draw the bars
    g.selectAll("rect")
        .data(arr)
        .enter()
        .append("rect")
            .attr("x", d => x(d.type))
            .attr("y", d => y(d.count))
            .attr("width", x.bandwidth())
            .attr("height", d => h - y(d.count))
            .attr("fill", d => color(d.type));
}


// ---- scatter plot: attack vs defense ----
function scatter(data, color) {
    let svg = d3.select("#chart2");
    let box = svg.node().getBoundingClientRect();
    let width = box.width;
    let height = box.height;

    let mt = 10, mr = 100, mb = 40, ml = 50;
    let w = width - ml - mr;
    let h = height - mt - mb;

    let g = svg.append("g")
        .attr("transform", "translate(" + ml + "," + mt + ")");

    // scales
    let x = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.Attack)])
        .nice()
        .range([0, w]);

    let y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.Defense)])
        .nice()
        .range([h, 0]);

    // x axis
    g.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0," + h + ")")
        .call(d3.axisBottom(x).ticks(6));

    // y axis
    g.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y).ticks(6));

    // labels
    g.append("text")
        .attr("class", "axis-label")
        .attr("x", w/2)
        .attr("y", h + 32)
        .attr("text-anchor", "middle")
        .text("Attack");

    g.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -h/2)
        .attr("y", -35)
        .attr("text-anchor", "middle")
        .text("Defense");

    // dots
    g.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
            .attr("cx", d => x(d.Attack))
            .attr("cy", d => y(d.Defense))
            .attr("r", 3)
            .attr("fill", d => color(d["Type 1"]))
            .attr("opacity", 0.6)
            .attr("stroke", "#333")
            .attr("stroke-width", 0.3);

    // legend on the right
    let types = color.domain();
    let legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", "translate(" + (width - mr + 10) + "," + (mt + 5) + ")");

    // colored square + type name for each type
    for (let i = 0; i < types.length; i++) {
        let row = legend.append("g")
            .attr("transform", "translate(0," + (i * 13) + ")");

        // square
        row.append("rect")
            .attr("width", 10)
            .attr("height", 10)
            .attr("fill", color(types[i]));

        // type name
        row.append("text")
            .attr("x", 14)
            .attr("y", 9)
            .text(types[i]);
    }
}


// ---- parallel coordinates (the "advanced" view) ----
function parallel(data, color) {
    let svg = d3.select("#chart3");
    let box = svg.node().getBoundingClientRect();
    let width = box.width;
    let height = box.height;

    let mt = 20, mr = 120, mb = 25, ml = 40;
    let w = width - ml - mr;
    let h = height - mt - mb;

    // the 6 stats we want to compare
    let dims = ["HP", "Attack", "Defense", "Sp. Atk", "Sp. Def", "Speed"];

    let g = svg.append("g")
        .attr("transform", "translate(" + ml + "," + mt + ")");

    // one y scale per dimension
    let yScales = {};
    dims.forEach(d => {
        yScales[d] = d3.scaleLinear()
            .domain(d3.extent(data, p => p[d]))
            .nice()
            .range([h, 0]);
    });

    // x spaces the axes evenly
    let x = d3.scalePoint()
        .domain(dims)
        .range([0, w])
        .padding(0.5);

    // build the path for one pokemon
    function makePath(d) {
        let pts = dims.map(dim => [x(dim), yScales[dim](d[dim])]);
        return d3.line()(pts);
    }

    // draw a line for every pokemon
    g.selectAll("path.line")
        .data(data)
        .enter()
        .append("path")
            .attr("class", "line")
            .attr("d", makePath)
            .attr("fill", "none")
            .attr("stroke", d => color(d["Type 1"]))
            .attr("stroke-width", 0.5)
            .attr("opacity", 0.2);

    // draw an axis for each dimension
    let axes = g.selectAll("g.dim")
        .data(dims)
        .enter()
        .append("g")
            .attr("class", "dim axis")
            .attr("transform", d => "translate(" + x(d) + ",0)");

    // call the axis for each one
    axes.each(function(d) {
        d3.select(this).call(d3.axisLeft(yScales[d]).ticks(5));
    });

    // label on top of each axis
    axes.append("text")
        .attr("class", "axis-label")
        .attr("y", -8)
        .attr("text-anchor", "middle")
        .text(d => d);

    // legend (same idea as scatter)
    let types = color.domain();
    let legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", "translate(" + (width - mr + 15) + "," + mt + ")");

    for (let i = 0; i < types.length; i++) {
        let row = legend.append("g")
            .attr("transform", "translate(0," + (i * 13) + ")");

        row.append("rect")
            .attr("width", 10)
            .attr("height", 10)
            .attr("fill", color(types[i]));

        row.append("text")
            .attr("x", 14)
            .attr("y", 9)
            .text(types[i]);
    }
}
