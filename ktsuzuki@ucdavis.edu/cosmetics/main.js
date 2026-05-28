const DIMS = ["Price", "Rank", "Combination", "Dry", "Normal", "Oily", "Sensitive"];
const BINARY = new Set(["Combination", "Dry", "Normal", "Oily", "Sensitive"]);

var selectedCategories = new Set(); // categories clicked in bar chart
var brushedIds          = new Set(); // product indices brushed in scatter

var barRefs = {};
var scRefs  = {};
var pcRefs  = {};

function bodySize(id) {
    var el = document.getElementById(id);
    return { w: el.clientWidth, h: el.clientHeight };
}

function clearAndAddSvg(id) {
    var body = document.getElementById(id);
    d3.select(body).selectAll("svg").remove();
    return d3.select(body).append("svg")
        .attr("width",  body.clientWidth)
        .attr("height", body.clientHeight);
}

d3.csv("cosmetics.csv").then(function(data) {

    data.forEach(function(d, i) {
        DIMS.forEach(function(dim) { d[dim] = +d[dim]; });
        d._id = i; // stable id for brush tracking
    });

    var categories = Array.from(new Set(data.map(function(d) { return d.Label; }))).sort();
    var colorScale  = d3.scaleOrdinal(d3.schemeCategory10).domain(categories);

    // "active" if it passes both the category filter and brush filter
    // Empty set = no filter applied (all pass).
    function isActive(d) {
        var catOk   = selectedCategories.size === 0 || selectedCategories.has(d.Label);
        var brushOk = brushedIds.size === 0          || brushedIds.has(d._id);
        return catOk && brushOk;
    }

    // ── Filtering transition ──
    function updateAllViews() {
        updateBarHighlight();
        updateScatterHighlight();
        updatePCHighlight();
    }

    // ── BAR CHART ───
    function initBar() {
        var bs  = bodySize("bar-body");
        var svg = clearAndAddSvg("bar-body");
        var M   = { top: 62, right: 30, bottom: 70, left: 65 };
        var W   = bs.w - M.left - M.right;
        var H   = bs.h - M.top  - M.bottom;

        var g = svg.append("g").attr("transform", "translate(" + M.left + "," + M.top + ")");

        var barData = d3.nest()
            .key(function(d) { return d.Label; })
            .rollup(function(v) { return d3.mean(v, function(d) { return d.Rank; }); })
            .entries(data)
            .sort(function(a, b) { return b.value - a.value; });

        var xBar = d3.scaleBand()
            .domain(barData.map(function(d) { return d.key; }))
            .range([0, W]).padding(0.3);

        var yBar = d3.scaleLinear()
            .domain([0, d3.max(barData, function(d) { return d.value; })]).nice()
            .range([H, 0]);

        var xAxisG = g.append("g")
            .attr("class", "bar-x-axis")
            .attr("transform", "translate(0," + H + ")")
            .call(d3.axisBottom(xBar));
        xAxisG.selectAll("text")
            .attr("font-size", "11px")
            .attr("transform", "rotate(-25)")
            .attr("text-anchor", "end")
            .attr("x", -4).attr("y", 8);

        g.append("g")
            .call(d3.axisLeft(yBar).ticks(6))
            .selectAll("text").attr("font-size", "11px");

        var barsG   = g.append("g").attr("class", "bars-group");
        var labelsG = g.append("g").attr("class", "bar-labels-group");

        barsG.selectAll("rect.bar-rect")
            .data(barData, function(d) { return d.key; })
            .enter().append("rect")
            .attr("class", "bar-rect")
            .attr("x",      function(d) { return xBar(d.key); })
            .attr("y",      function(d) { return yBar(d.value); })
            .attr("width",  xBar.bandwidth())
            .attr("height", function(d) { return H - yBar(d.value); })
            .attr("fill",   function(d) { return colorScale(d.key); })
            .attr("opacity", 0.85)
            .attr("cursor", "pointer")
            .attr("stroke", "none")
            .attr("stroke-width", 2.5)
            // Selection: click toggles a category on/off
            .on("click", function(d) {
                if (selectedCategories.has(d.key)) {
                    selectedCategories.delete(d.key);
                } else {
                    selectedCategories.add(d.key);
                }
                brushedIds.clear(); // clear brush when using category selection
                updateAllViews();
            });

        labelsG.selectAll("text.bar-val-label")
            .data(barData, function(d) { return d.key; })
            .enter().append("text")
            .attr("class", "bar-val-label")
            .attr("x", function(d) { return xBar(d.key) + xBar.bandwidth() / 2; })
            .attr("y", function(d) { return yBar(d.value) - 5; })
            .attr("text-anchor", "middle")
            .attr("font-size", "11px")
            .attr("fill", "#333")
            .attr("pointer-events", "none")
            .text(function(d) { return d.value.toFixed(2); });

        // y-axis label
        g.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -H / 2).attr("y", -50)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .text("Average Rank");

        // title
        g.append("text")
            .attr("x", W / 2).attr("y", -40)
            .attr("text-anchor", "middle")
            .attr("font-size", "14px").attr("font-weight", "bold").attr("fill", "#111")
            .text("Average Rank by Category  (Overview)");

        // Sort button — triggers Ordering transition
        var sortAsc = [false]; // box so the closure can mutate it
        g.append("text")
            .attr("class", "sort-btn")
            .attr("x", W).attr("y", -40)
            .attr("text-anchor", "end")
            .attr("font-size", "12px").attr("fill", "#0066cc")
            .attr("cursor", "pointer")
            .attr("text-decoration", "underline")
            .text("Sort ↕")
            .on("click", function() {
                sortAsc[0] = !sortAsc[0];
                barData.sort(function(a, b) {
                    return sortAsc[0] ? a.value - b.value : b.value - a.value;
                });
                xBar.domain(barData.map(function(d) { return d.key; }));

                // Ordering transition: bars slide to new x positions
                barsG.selectAll("rect.bar-rect")
                    .transition().duration(600).ease(d3.easeCubicInOut)
                    .attr("x", function(d) { return xBar(d.key); });

                labelsG.selectAll("text.bar-val-label")
                    .transition().duration(600).ease(d3.easeCubicInOut)
                    .attr("x", function(d) { return xBar(d.key) + xBar.bandwidth() / 2; });

                // Fade axis out, swap labels, fade back in (staged to avoid overlap confusion)
                xAxisG.transition().duration(200).attr("opacity", 0)
                    .on("end", function() {
                        xAxisG.call(d3.axisBottom(xBar));
                        xAxisG.selectAll("text")
                            .attr("font-size", "11px")
                            .attr("transform", "rotate(-25)")
                            .attr("text-anchor", "end")
                            .attr("x", -4).attr("y", 8);
                        xAxisG.transition().duration(200).attr("opacity", 1);
                    });
            });

        // interaction hint
        g.append("text")
            .attr("x", W / 2).attr("y", -22)
            .attr("text-anchor", "middle")
            .attr("font-size", "10px").attr("fill", "#888")
            .text("Click a bar to select/deselect a category  ·  Click Sort ↕ to reorder");

        barRefs = { barsG: barsG };
    }

    // dim unselected categories
    function updateBarHighlight() {
        if (!barRefs.barsG) return;
        barRefs.barsG.selectAll("rect.bar-rect")
            .transition().duration(400)
            .attr("opacity", function(d) {
                return selectedCategories.size === 0 || selectedCategories.has(d.key) ? 0.85 : 0.18;
            })
            .attr("stroke", function(d) {
                return selectedCategories.has(d.key) ? "#222" : "none";
            });
    }

    // ── SCATTER PLOT  ────
    function initScatter() {
        var bs  = bodySize("sc-body");
        var svg = clearAndAddSvg("sc-body");
        var M   = { top: 50, right: 20, bottom: 55, left: 60 };
        var W   = bs.w - M.left - M.right;
        var H   = bs.h - M.top  - M.bottom;

        var g = svg.append("g").attr("transform", "translate(" + M.left + "," + M.top + ")");

        var xSc = d3.scaleLinear()
            .domain(d3.extent(data, function(d) { return d.Price; })).nice()
            .range([0, W]);
        var ySc = d3.scaleLinear()
            .domain(d3.extent(data, function(d) { return d.Rank; })).nice()
            .range([H, 0]);

        g.append("g").attr("transform", "translate(0," + H + ")")
            .call(d3.axisBottom(xSc).ticks(6))
            .selectAll("text").attr("font-size", "11px");
        g.append("g")
            .call(d3.axisLeft(ySc).ticks(6))
            .selectAll("text").attr("font-size", "11px");

        var dotsG = g.append("g").attr("class", "dots-group");
        dotsG.selectAll("circle")
            .data(data)
            .enter().append("circle")
            .attr("cx",      function(d) { return xSc(d.Price); })
            .attr("cy",      function(d) { return ySc(d.Rank); })
            .attr("r",       3.5)
            .attr("fill",    function(d) { return colorScale(d.Label); })
            .attr("opacity", 0.5);

        // Brushing: drag over scatter plot to select a region of products
        var brush = d3.brush()
            .extent([[0, 0], [W, H]])
            .on("brush end", function() {
                var sel = d3.event.selection;
                if (!sel) {
                    brushedIds = new Set();
                } else {
                    var x0 = sel[0][0], y0 = sel[0][1];
                    var x1 = sel[1][0], y1 = sel[1][1];
                    brushedIds = new Set(
                        data.filter(function(d) {
                            var cx = xSc(d.Price), cy = ySc(d.Rank);
                            return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
                        }).map(function(d) { return d._id; })
                    );
                }
                selectedCategories.clear(); // brush and category selection are mutually exclusive
                updateAllViews();
            });

        g.append("g").attr("class", "brush").call(brush);

        // axis labels
        g.append("text")
            .attr("x", W / 2).attr("y", H + 48)
            .attr("text-anchor", "middle").attr("font-size", "12px")
            .text("Price ($)");
        g.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -H / 2).attr("y", -50)
            .attr("text-anchor", "middle").attr("font-size", "12px")
            .text("Rank");

        // title
        g.append("text")
            .attr("x", W / 2).attr("y", -28)
            .attr("text-anchor", "middle")
            .attr("font-size", "14px").attr("font-weight", "bold").attr("fill", "#111")
            .text("Price vs. Rank  (Focus)");

        // hint
        g.append("text")
            .attr("x", W / 2).attr("y", -12)
            .attr("text-anchor", "middle")
            .attr("font-size", "10px").attr("fill", "#888")
            .text("Drag to brush-select · Click empty area to clear");

        scRefs = { dotsG: dotsG };
    }

    // fade non-active dots
    function updateScatterHighlight() {
        if (!scRefs.dotsG) return;
        scRefs.dotsG.selectAll("circle")
            .transition().duration(400)
            .attr("opacity", function(d) { return isActive(d) ? 0.78 : 0.05; })
            .attr("r",       function(d) { return isActive(d) ? 4.5  : 2; });
    }

    // ── PARALLEL COORDINATES ──
    function initPC() {
        var bs  = bodySize("pc-body");
        var svg = clearAndAddSvg("pc-body");
        var M   = { top: 65, right: 185, bottom: 10, left: 55 };
        var W   = bs.w - M.left - M.right;
        var H   = bs.h - M.top  - M.bottom;

        var g = svg.append("g").attr("transform", "translate(" + M.left + "," + M.top + ")");

        var xPC = d3.scalePoint().domain(DIMS).range([0, W]).padding(0.15);

        var yPC = {};
        DIMS.forEach(function(dim) {
            if (BINARY.has(dim)) {
                yPC[dim] = d3.scaleLinear().domain([0, 1]).range([H, 0]).nice();
            } else {
                yPC[dim] = d3.scaleLinear()
                    .domain(d3.extent(data, function(d) { return d[dim]; }))
                    .range([H, 0]).nice();
            }
        });

        function makePath(d) {
            return d3.line()(DIMS.map(function(dim) {
                return [xPC(dim), yPC[dim](d[dim])];
            }));
        }

        var linesG = g.append("g").attr("class", "pc-lines-group");
        linesG.selectAll("path.pc-line")
            .data(data)
            .enter().append("path")
            .attr("class", "pc-line")
            .attr("d",            makePath)
            .attr("fill",         "none")
            .attr("stroke",       function(d) { return colorScale(d.Label); })
            .attr("stroke-width", 1)
            .attr("opacity",      0.35);

        // dimension axes
        var axisG = g.selectAll(".dim-axis")
            .data(DIMS).enter()
            .append("g").attr("class", "dim-axis")
            .attr("transform", function(dim) { return "translate(" + xPC(dim) + ",0)"; });

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
            .attr("y", -20).attr("text-anchor", "middle")
            .attr("font-size", "12px").attr("font-weight", "600")
            .text(function(dim) { return dim; });

        // title
        g.append("text")
            .attr("x", W / 2).attr("y", -42)
            .attr("text-anchor", "middle")
            .attr("font-size", "15px").attr("font-weight", "bold").attr("fill", "#111")
            .text("Parallel Coordinates  (Advanced / Focus)");

        // hint
        g.append("text")
            .attr("x", W / 2).attr("y", -22)
            .attr("text-anchor", "middle")
            .attr("font-size", "10px").attr("fill", "#888")
            .text("Click legend to select category · also responds to bar-chart selection and scatter brush");

        // legend (clickable)
        var leg = g.append("g").attr("transform", "translate(" + (W + 18) + ",0)");
        leg.append("text").attr("y", -10)
            .attr("font-size", "12px").attr("font-weight", "bold").attr("fill", "#333")
            .text("Category");

        var legRows = leg.selectAll("g.leg-row")
            .data(categories)
            .enter().append("g")
            .attr("class", "leg-row")
            .attr("transform", function(cat, i) { return "translate(0," + (i * 22) + ")"; })
            .attr("cursor", "pointer")
            .on("click", function(cat) {
                if (selectedCategories.has(cat)) {
                    selectedCategories.delete(cat);
                } else {
                    selectedCategories.add(cat);
                }
                brushedIds.clear();
                updateAllViews();
            });

        legRows.append("rect")
            .attr("width", 10).attr("height", 10).attr("rx", 2)
            .attr("fill", function(cat) { return colorScale(cat); });

        legRows.append("text")
            .attr("x", 20).attr("y", 10)
            .attr("font-size", "11px").attr("fill", "#333")
            .text(function(cat) { return cat; });

        // transparent hit-area so the whole row is clickable (not just text pixels)
        legRows.append("rect")
            .attr("x", -2).attr("y", -2)
            .attr("width", 90).attr("height", 18)
            .attr("fill", "transparent");

        pcRefs = { linesG: linesG, legRows: legRows };
    }

    // fade non-active lines + dim legend rows
    function updatePCHighlight() {
        if (!pcRefs.linesG) return;
        pcRefs.linesG.selectAll("path.pc-line")
            .transition().duration(400)
            .attr("opacity",      function(d) { return isActive(d) ? 0.72 : 0.04; })
            .attr("stroke-width", function(d) { return isActive(d) ? 1.8  : 0.5; });

        if (!pcRefs.legRows) return;
        pcRefs.legRows
            .transition().duration(400)
            .attr("opacity", function(cat) {
                return selectedCategories.size === 0 || selectedCategories.has(cat) ? 1 : 0.3;
            });
    }

    // RESIZE
    function drawAll() {
        selectedCategories.clear();
        brushedIds.clear();
        barRefs = {}; scRefs = {}; pcRefs = {};
        initPC();
        initBar();
        initScatter();
    }

    drawAll();

    var resizeTimer;
    window.addEventListener("resize", function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(drawAll, 100);
    });

});
