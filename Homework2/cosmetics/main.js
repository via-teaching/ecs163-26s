const DIMS = ["Price", "Rank", "Combination", "Dry", "Normal", "Oily", "Sensitive"];
const BINARY = new Set(["Combination", "Dry", "Normal", "Oily", "Sensitive"]);

   function bodySize(id) {
        var el = document.getElementById(id);
        return { w: el.clientWidth, h: el.clientHeight };
    }

    function clearAndAddSvg(id) {
        var body = document.getElementById(id);
        d3.select(body).selectAll("svg").remove();
        return d3.select(body).append("svg")
            .attr("width", body.clientWidth)
            .attr("height", body.clientHeight);
    }

d3.csv("cosmetics.csv").then(function(data) {

    // convert strings to numbers
    data.forEach(function(d) {
        DIMS.forEach(function(dim) {
            d[dim] = +d[dim];
        });
    });

    const categories = Array.from(new Set(data.map(function(d) { return d.Label; }))).sort();
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(categories);


    // PARALLEL COORDINATES
    function drawPC() {
        var bodysize = bodySize("pc-body");
        var svg = clearAndAddSvg("pc-body");

        var pcM = { top: 55, right: 185, bottom: 10, left: 55 };
        var pcW = bodysize.w - pcM.left - pcM.right;
        var pcH = bodysize.h - pcM.top - pcM.bottom;

        var pcG = svg.append("g")
            .attr("transform", "translate(" + pcM.left + "," + pcM.top + ")");

        var xPC = d3.scalePoint()
            .domain(DIMS)
            .range([0, pcW])
            .padding(0.15);

        // scale each dimension
        var yPC = {};
        DIMS.forEach(function(dim) {
            if (BINARY.has(dim)) {
                yPC[dim] = d3.scaleLinear().domain([0, 1]).range([pcH, 0]).nice();
            } else {
                yPC[dim] = d3.scaleLinear()
                    .domain(d3.extent(data, function(d) { return d[dim]; }))
                    .range([pcH, 0])
                    .nice();
            }
        });

        function makePath(d) {
            var points = DIMS.map(function(dim) {
                return [xPC(dim), yPC[dim](d[dim])];
            });
            return d3.line()(points);
        }

        // lines for each product
        pcG.append("g").selectAll("path")
            .data(data)
            .enter()
            .append("path")
            .attr("d", makePath)
            .attr("fill", "none")
            .attr("stroke", function(d) { return colorScale(d.Label); })
            .attr("stroke-width", 1)
            .attr("opacity", 0.5);

        var axisG = pcG.selectAll(".axis")
            .data(DIMS)
            .enter()
            .append("g")
            .attr("class", "axis")
            .attr("transform", function(dim) {
                return "translate(" + xPC(dim) + ",0)";
            });

        axisG.append("g").each(function(dim) {
            var ax = d3.axisLeft(yPC[dim]);
            if (BINARY.has(dim)) {
                ax.tickValues([0, 1]).tickFormat(function(v) { return v ? "Yes" : "No"; });
            } else {
                ax.ticks(5);
            }
            d3.select(this).call(ax);
        }).selectAll("text").attr("font-size", "10px");

        axisG.append("text")
            .attr("y", -18)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .attr("font-weight", "600")
            .text(function(dim) { return dim; });

        // title
        pcG.append("text")
            .attr("x", pcW / 2)
            .attr("y", -30)
            .attr("text-anchor", "middle")
            .attr("font-size", "15px")
            .attr("font-weight", "bold")
            .attr("fill", "#111")
            .text("Parallel Coordinates");

        // legend
        var leg = pcG.append("g").attr("transform", "translate(" + (pcW + 18) + ",0)");
        leg.append("text")
            .attr("y", -10)
            .attr("font-size", "12px")
            .attr("font-weight", "bold")
            .attr("fill", "#333")
            .text("Category");

        categories.forEach(function(cat, i) {
            var row = leg.append("g").attr("transform", "translate(0," + (i * 22) + ")");
            row.append("rect")
                .attr("width", 10).attr("height", 10)
                .attr("rx", 2)
                .attr("fill", colorScale(cat));
            row.append("text")
                .attr("x", 20).attr("y", 10)
                .attr("font-size", "11px")
                .attr("fill", "#333")
                .text(cat);
        });
    }

    // SCATTER PLOT

    function drawScatter() {
        var bodysize = bodySize("sc-body");
        var svg = clearAndAddSvg("sc-body");

        var scM = { top: 45, right: 20, bottom: 55, left: 60 };
        var scW = bodysize.w - scM.left - scM.right;
        var scH = bodysize.h - scM.top - scM.bottom;

        var scG = svg.append("g")
                        .attr("transform", "translate(" + scM.left + "," + scM.top + ")");

        var xSc = d3.scaleLinear()
            .domain(d3.extent(data, function(d) { return d.Price; })).nice()
            .range([0, scW]);

        var ySc = d3.scaleLinear()
            .domain(d3.extent(data, function(d) { return d.Rank; })).nice()
            .range([scH, 0]);

        scG.append("g")
            .attr("transform", "translate(0," + scH + ")")
            .call(d3.axisBottom(xSc).ticks(6))
            .selectAll("text").attr("font-size", "11px");

        scG.append("g")
            .call(d3.axisLeft(ySc).ticks(6))
            .selectAll("text").attr("font-size", "11px");

        scG.selectAll("circle")
            .data(data)
            .enter()
            .append("circle")
            .attr("cx", function(d) { return xSc(d.Price); })
            .attr("cy", function(d) { return ySc(d.Rank); })
            .attr("r", 3)
            .attr("fill", function(d) { return colorScale(d.Label); })
            .attr("opacity", 0.5);

        // axis labels
        scG.append("text")
            .attr("x", scW / 2).attr("y", scH + 50)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .text("Price ($)");

        scG.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -scH / 2).attr("y", -50)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .text("Rank");

        scG.append("text")
            .attr("x", scW / 2).attr("y", -20)
            .attr("text-anchor", "middle")
            .attr("font-size", "14px")
            .attr("font-weight", "bold")
            .attr("fill", "#111")
            .text("Price vs. Rank by Category");
    }

    // BAR CHART
    function drawBar() {
        var bodysize = bodySize("bar-body");
        var svg = clearAndAddSvg("bar-body");

        var barM = { top: 45, right: 30, bottom: 65, left: 65 };
        var barW = bodysize.w - barM.left - barM.right;
        var barH = bodysize.h - barM.top - barM.bottom;

        var barG = svg.append("g")
            .attr("transform", "translate(" + barM.left + "," + barM.top + ")");

        // calculate average rank per category
        var avgByCategory = d3.nest()
            .key(function(d) { return d.Label; })
            .rollup(function(v) {
                return d3.mean(v, function(d) { return d.Rank; });
            })
            .entries(data)
            .sort(function(a, b) { return b.value - a.value; });

        var xBar = d3.scaleBand()
            .domain(avgByCategory.map(function(d) { return d.key; }))
            .range([0, barW])
            .padding(0.3);

        var yBar = d3.scaleLinear()
            .domain([0, d3.max(avgByCategory, function(d) { return d.value; })]).nice()
            .range([barH, 0]);

        barG.append("g")
            .attr("transform", "translate(0," + barH + ")")
            .call(d3.axisBottom(xBar))
            .selectAll("text")
            .attr("font-size", "11px")
            .attr("transform", "rotate(-25)")
            .attr("text-anchor", "end")
            .attr("x", -4).attr("y", 8);

        barG.append("g")
            .call(d3.axisLeft(yBar).ticks(6))
            .selectAll("text").attr("font-size", "11px");

        barG.selectAll("rect")
            .data(avgByCategory)
            .enter()
            .append("rect")
            .attr("x", function(d) { return xBar(d.key); })
            .attr("y", function(d) { return yBar(d.value); })
            .attr("width", xBar.bandwidth())
            .attr("height", function(d) { return barH - yBar(d.value); })
            .attr("fill", function(d) { return colorScale(d.key); })
            .attr("opacity", 0.85);

        // labels on top of bars
        barG.selectAll(".val-label")
            .data(avgByCategory)
            .enter()
            .append("text")
            .attr("class", "val-label")
            .attr("x", function(d) { return xBar(d.key) + xBar.bandwidth() / 2; })
            .attr("y", function(d) { return yBar(d.value) - 5; })
            .attr("text-anchor", "middle")
            .attr("font-size", "11px")
            .attr("fill", "#333")
            .text(function(d) { return d.value.toFixed(2); });

        barG.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -barH / 2).attr("y", -50)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .text("Average Rank");

        barG.append("text")
            .attr("x", barW / 2).attr("y", -20)
            .attr("text-anchor", "middle")
            .attr("font-size", "14px")
            .attr("font-weight", "bold")
            .attr("fill", "#111")
            .text("Average Rank by Category");
    }

    function drawAll() {
        drawPC();
        drawScatter();
        drawBar();
    }

    drawAll();

    var resizeTimer;
    window.addEventListener("resize", function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(drawAll, 100);
    });

});