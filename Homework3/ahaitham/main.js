// hw3 - pokemon dashboard with interactions
// brush the bar chart to pick types -> scatter + parallel fade to match
// scroll/drag on the scatter to zoom in

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

    // build the scatter and parallel first so they can return their update functions
    let updateScatter = scatter(data, color);
    let updateParallel = parallel(data, color);

    // build the bar chart last and hand it a callback that updates the other two
    barChart(data, color, function(picked) {
        updateScatter(picked);
        updateParallel(picked);
    });
});


// ---- bar chart (overview) + brushing ----
function barChart(data, color, onBrush) {
    let svg = d3.select("#chart1");
    let box = svg.node().getBoundingClientRect();
    let width = box.width;
    let height = box.height;

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
    g.selectAll("rect.bar")
        .data(arr)
        .enter()
        .append("rect")
            .attr("class", "bar")
            .attr("x", d => x(d.type))
            .attr("y", d => y(d.count))
            .attr("width", x.bandwidth())
            .attr("height", d => h - y(d.count))
            .attr("fill", d => color(d.type));

    // little hint so the user knows they can brush
    g.append("text")
        .attr("x", w/2)
        .attr("y", -2)
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .style("fill", "#888")
        .text("drag across bars to filter the other views");

    // brushX lets you drag left-right to pick a range of bars
    let brush = d3.brushX()
        .extent([[0, 0], [w, h]])
        .on("brush end", brushed);

    // add the brush layer on top of the bars
    g.append("g")
        .attr("class", "brush")
        .call(brush);

    // work out which types are inside the brushed range
    function brushed(event) {
        // brush cleared -> show everything again
        if (!event.selection) {
            g.selectAll("rect.bar").attr("opacity", 1);
            onBrush([]);
            return;
        }

        let x0 = event.selection[0];
        let x1 = event.selection[1];

        // a type counts as picked if the middle of its bar is inside the box
        let picked = [];
        arr.forEach(d => {
            let center = x(d.type) + x.bandwidth()/2;
            if (center >= x0 && center <= x1) picked.push(d.type);
        });

        // dim the bars that didn't get picked
        g.selectAll("rect.bar")
            .attr("opacity", d => picked.includes(d.type) ? 1 : 0.2);

        onBrush(picked);
    }
}


// ---- scatter plot: attack vs defense (with pan/zoom + filter) ----
// returns an update function the bar chart calls when the brush changes
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

    // clip path so zoomed dots stay inside the plot box
    g.append("clipPath")
        .attr("id", "scatterClip")
        .append("rect")
        .attr("width", w)
        .attr("height", h);

    // keep the axis groups in variables so zoom can rescale them
    let xAxisG = g.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0," + h + ")")
        .call(d3.axisBottom(x).ticks(6));

    let yAxisG = g.append("g")
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

    // hint for zoom
    g.append("text")
        .attr("x", w/2)
        .attr("y", -2)
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .style("fill", "#888")
        .text("scroll to zoom, drag to pan");

    // group holding the dots, clipped to the plot area
    let dotsG = g.append("g")
        .attr("clip-path", "url(#scatterClip)");

    // dots
    dotsG.selectAll("circle")
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

    // zoom rescales x and y, then we redraw the axes and move the dots
    let zoom = d3.zoom()
        .scaleExtent([1, 8])   // 1x to 8x
        .translateExtent([[0, 0], [w, h]])
        .on("zoom", zoomed);

    // invisible rect on top to catch scroll/drag
    g.append("rect")
        .attr("width", w)
        .attr("height", h)
        .style("fill", "none")
        .style("pointer-events", "all")
        .call(zoom);

    function zoomed(event) {
        // build new scales from the zoom transform
        let nx = event.transform.rescaleX(x);
        let ny = event.transform.rescaleY(y);

        // redraw axes with the new scales
        xAxisG.call(d3.axisBottom(nx).ticks(6));
        yAxisG.call(d3.axisLeft(ny).ticks(6));

        // move the dots
        dotsG.selectAll("circle")
            .attr("cx", d => nx(d.Attack))
            .attr("cy", d => ny(d.Defense));
    }

    // update function - fade out dots whose type isn't picked
    function update(picked) {
        dotsG.selectAll("circle")
            .transition()        // animated fade
            .duration(500)
            .attr("opacity", d => {
                if (picked.length === 0) return 0.6;     // nothing picked, show all
                return picked.includes(d["Type 1"]) ? 0.8 : 0.05;
            });
    }

    return update;
}


// ---- parallel coordinates (advanced) + filter ----
// returns an update function the bar chart calls when the brush changes
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

    // x spaces the axes evenly across the width
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

    // legend
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

    // update function - same fade as the scatter so it feels consistent
    function update(picked) {
        g.selectAll("path.line")
            .transition()        // animated fade
            .duration(500)
            .attr("opacity", d => {
                if (picked.length === 0) return 0.2;
                return picked.includes(d["Type 1"]) ? 0.6 : 0.02;
            })
            .attr("stroke-width", d => {
                if (picked.length === 0) return 0.5;
                return picked.includes(d["Type 1"]) ? 1 : 0.5;
            });
    }

    return update;
}
