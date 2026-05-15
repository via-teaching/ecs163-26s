// Music and Mental Health Dashboard
// 3 views: bar chart (overview), donut chart (genres), parallel coordinates (advanced)
// clicking the bar chart filters the other two views
 
// shared colors — same meaning across all three charts
var COLORS = {
    "Improve":   "#59a14f",
    "No effect": "#76b7b2",
    "Worsen":    "#e15759",
    "Unknown":   "#bab0ac"
};
 
// filter state — tracks what the user clicked or brushed
var selectedEffect = null;  // set when user clicks a bar
var brushedIds     = null;  // set when user brushes the parallel chart
 
// load data and draw everything
d3.csv("music_mental_health.csv").then(function(rawData) {
 
    // coerce numeric columns
    rawData.forEach(function(d, i) {
        d._id        = i;
        d.Anxiety    = +d.Anxiety;
        d.Depression = +d.Depression;
        d.Insomnia   = +d.Insomnia;
        d.OCD        = +d.OCD;
        d["Hours per day"] = +d["Hours per day"];
 
        // blank music effects field — label as Unknown
        if (!d["Music effects"] || d["Music effects"].trim() === "") {
            d["Music effects"] = "Unknown";
        }
    });
 
    // drop rows where any symptom score is missing
    var data = rawData.filter(function(d) {
        return !isNaN(d.Anxiety) && !isNaN(d.Depression)
            && !isNaN(d.Insomnia) && !isNaN(d.OCD);
    });
 
    // draw all three charts
    drawBarChart(data);
    drawDonutChart(data);
    drawParallelChart(data);
 
    // called whenever a filter changes — figures out the active subset
    // and tells each chart to update
    window.applyFilter = function() {
 
        var subset = data;
 
        if (selectedEffect) {
            subset = subset.filter(function(d) {
                return d["Music effects"] === selectedEffect;
            });
        }
 
        if (brushedIds) {
            subset = subset.filter(function(d) {
                return brushedIds.has(d._id);
            });
        }
 
        // show reset button only when something is filtered
        var isFiltered = selectedEffect !== null || brushedIds !== null;
        d3.select("#reset-btn").style("display", isFiltered ? "block" : "none");
 
        updateDonut(subset);
        updateParallelOpacity(subset, data.length);
        updateBarOpacity(selectedEffect);
    };
 
    // reset button clears everything
    document.getElementById("reset-btn").addEventListener("click", function() {
        selectedEffect = null;
        brushedIds     = null;
        window.applyFilter();
    });
 
});
 
 
// ── BAR CHART ─────────────────────────────────────────────────
// overview — how many people reported each music effect
// clicking a bar filters the donut and parallel charts
function drawBarChart(data) {
 
    var svg = d3.select("#bar-svg");
    var W   = svg.node().clientWidth;
    var H   = svg.node().clientHeight;
 
    var m  = { top: 20, right: 20, bottom: 50, left: 55 };
    var cW = W - m.left - m.right;
    var cH = H - m.top - m.bottom;
 
    var g = svg.append("g")
        .attr("transform", "translate(" + m.left + "," + m.top + ")");
 
    // count rows per music effect
    var counts = d3.nest()
        .key(function(d) { return d["Music effects"]; })
        .rollup(function(v) { return v.length; })
        .entries(data)
        .sort(function(a, b) {
            var order = ["Improve", "No effect", "Worsen", "Unknown"];
            return order.indexOf(a.key) - order.indexOf(b.key);
        });
 
    // x scale
    var x = d3.scaleBand()
        .domain(counts.map(function(d) { return d.key; }))
        .range([0, cW])
        .padding(0.3);
 
    // y scale
    var y = d3.scaleLinear()
        .domain([0, d3.max(counts, function(d) { return d.value; })])
        .range([cH, 0])
        .nice();
 
    // x axis
    g.append("g")
        .attr("transform", "translate(0," + cH + ")")
        .call(d3.axisBottom(x).tickSize(0))
        .selectAll("text").attr("font-size", "11px").attr("fill", "#555");
 
    // y axis with light gridlines
    g.append("g")
        .call(d3.axisLeft(y).ticks(5).tickSize(-cW))
        .call(function(ax) {
            ax.selectAll(".tick line").attr("stroke", "#f0f0f0");
            ax.select(".domain").remove();
            ax.selectAll("text").attr("fill", "#888").attr("font-size", "10px");
        });
 
    // axis labels
    g.append("text")
        .attr("x", cW / 2).attr("y", cH + 42)
        .attr("text-anchor", "middle").attr("font-size", "11px").attr("fill", "#888")
        .text("Reported Effect of Music");
 
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -cH / 2).attr("y", -44)
        .attr("text-anchor", "middle").attr("font-size", "11px").attr("fill", "#888")
        .text("Number of Respondents");
 
    // bars — colored by effect, clickable to filter
    var bars = g.selectAll(".bar")
        .data(counts)
        .enter()
        .append("g")
        .attr("class", "bar")
        .style("cursor", "pointer")
        .on("click", function(d) {
            selectedEffect = (selectedEffect === d.key) ? null : d.key;
            window.applyFilter();
        });
 
    bars.append("rect")
        .attr("class", "bar-rect")
        .attr("x", function(d) { return x(d.key); })
        .attr("y", function(d) { return y(d.value); })
        .attr("width", x.bandwidth())
        .attr("height", function(d) { return cH - y(d.value); })
        .attr("fill", function(d) { return COLORS[d.key] || COLORS["Unknown"]; })
        .attr("rx", 3);
 
    // count labels above each bar
    bars.append("text")
        .attr("x", function(d) { return x(d.key) + x.bandwidth() / 2; })
        .attr("y", function(d) { return y(d.value) - 5; })
        .attr("text-anchor", "middle")
        .attr("font-size", "11px").attr("fill", "#333")
        .text(function(d) { return d.value; });
}
 
// dims bars that arent selected when a filter is active
function updateBarOpacity(selected) {
    d3.selectAll(".bar-rect").attr("opacity", function(d) {
        if (!selected) return 1;
        return d.key === selected ? 1 : 0.2;
    });
}
 
 
// ── DONUT CHART ───────────────────────────────────────────────
// shows genre breakdown for whoever is currently filtered
// redraws whenever the filter changes
var donutG, donutArc, donutPie, donutColor, donutLegend;
 
function drawDonutChart(data) {
 
    var svg = d3.select("#donut-svg");
    var W   = svg.node().clientWidth;
    var H   = svg.node().clientHeight;
 
    var radius = Math.min(W * 0.46, H * 0.44);
 
    // center donut, put legend on the right
    donutG = svg.append("g")
        .attr("transform", "translate(" + (W * 0.37) + "," + (H / 2) + ")");
 
    // inner radius creates the donut hole
    donutArc = d3.arc()
        .innerRadius(radius * 0.42)
        .outerRadius(radius);
 
    // pie layout converts counts to angles
    donutPie = d3.pie()
        .value(function(d) { return d.value; })
        .sort(function(a, b) { return b.value - a.value; });
 
    // categorical color scale for genres
    donutColor = d3.scaleOrdinal()
        .range(["#4e79a7","#f28e2b","#e15759","#76b7b2",
                "#59a14f","#edc948","#b07aa1","#ff9da7","#9c755f","#bab0ac"]);
 
    donutLegend = svg.append("g")
        .attr("transform", "translate(" + (W * 0.68) + "," + (H * 0.15) + ")");
 
    updateDonut(data);
}
 
// redraws the donut for the given subset
function updateDonut(subset) {
 
    // count genres, keep top 10
    var genreCounts = d3.nest()
        .key(function(d) { return d["Fav genre"]; })
        .rollup(function(v) { return v.length; })
        .entries(subset)
        .filter(function(d) { return d.key && d.key !== ""; })
        .sort(function(a, b) { return b.value - a.value; })
        .slice(0, 10);
 
    donutColor.domain(genreCounts.map(function(d) { return d.key; }));
 
    // update / enter / exit pattern for slices
    var slices = donutG.selectAll("path.slice")
        .data(donutPie(genreCounts), function(d) { return d.data.key; });
 
    slices.enter().append("path").attr("class", "slice")
        .attr("stroke", "white").attr("stroke-width", 2)
        .merge(slices)
        .attr("d", donutArc)
        .attr("fill", function(d) { return donutColor(d.data.key); });
 
    slices.exit().remove();
 
    // total count shown in the donut hole
    donutG.selectAll(".center-txt").remove();
 
    donutG.append("text").attr("class", "center-txt")
        .attr("text-anchor", "middle").attr("dy", "-0.1em")
        .attr("font-size", "18px").attr("font-weight", "bold").attr("fill", "#333")
        .text(subset.length);
 
    donutG.append("text").attr("class", "center-txt")
        .attr("text-anchor", "middle").attr("dy", "1.2em")
        .attr("font-size", "9px").attr("fill", "#999")
        .text("people");
 
    // redraw legend
    donutLegend.selectAll("*").remove();
 
    genreCounts.forEach(function(d, i) {
        var row = donutLegend.append("g")
            .attr("transform", "translate(0," + (i * 18) + ")");
 
        row.append("rect")
            .attr("width", 10).attr("height", 10).attr("rx", 2)
            .attr("fill", donutColor(d.key));
 
        row.append("text")
            .attr("x", 14).attr("y", 9)
            .attr("font-size", "10px").attr("fill", "#555")
            .text(d.key + " (" + d.value + ")");
    });
}
 
 
// ── PARALLEL COORDINATES ──────────────────────────────────────
// advanced visualization — one line per person
// shows all four symptom scores on the same chart
// lines are colored by music effect
// drag on any axis to filter
var parallelPaths;
 
function drawParallelChart(data) {
 
    var svg = d3.select("#parallel-svg");
    var W   = svg.node().clientWidth;
    var H   = svg.node().clientHeight;
 
    var m  = { top: 28, right: 40, bottom: 20, left: 50 };
    var cW = W - m.left - m.right;
    var cH = H - m.top - m.bottom;
 
    var dims = ["Anxiety", "Depression", "Insomnia", "OCD"];
 
    var g = svg.append("g")
        .attr("transform", "translate(" + m.left + "," + m.top + ")");
 
    // x positions for each axis
    var x = d3.scalePoint()
        .domain(dims)
        .range([0, cW])
        .padding(0.25);
 
    // shared y scale so all four axes are on the same 0-10 range
    var y = d3.scaleLinear()
        .domain([0, 10])
        .range([cH, 0]);
 
    // draw one line per person, colored by their music effect
    parallelPaths = g.append("g").selectAll("path")
        .data(data)
        .enter()
        .append("path")
        .attr("d", function(d) {
            return d3.line()(dims.map(function(dim) {
                return [x(dim), y(d[dim])];
            }));
        })
        .attr("fill", "none")
        .attr("stroke", function(d) { return COLORS[d["Music effects"]] || COLORS["Unknown"]; })
        .attr("stroke-width", 1.1)
        .attr("opacity", 0.25);
 
    // tracks brush range per axis
    var brushRanges = {};
 
    // draw each vertical axis with a brush attached
    dims.forEach(function(dim) {
 
        var axG = g.append("g")
            .attr("transform", "translate(" + x(dim) + ",0)");
 
        // axis ticks
        axG.call(d3.axisLeft(y).ticks(5).tickSize(4))
            .call(function(ax) {
                ax.select(".domain").attr("stroke", "#ccc");
                ax.selectAll(".tick line").attr("stroke", "#ccc");
                ax.selectAll("text").attr("fill", "#888").attr("font-size", "9px");
            });
 
        // dimension label
        axG.append("text")
            .attr("y", -10).attr("text-anchor", "middle")
            .attr("fill", "#222").attr("font-size", "12px").attr("font-weight", "bold")
            .text(dim);
 
        // brush — user drags to select a score range on this axis
        var brush = d3.brushY()
            .extent([[-12, 0], [12, cH]])
            .on("brush end", function() {
                if (d3.event.selection) {
                    // convert pixel positions to score values
                    brushRanges[dim] = [
                        y.invert(d3.event.selection[1]),
                        y.invert(d3.event.selection[0])
                    ];
                } else {
                    delete brushRanges[dim];
                }
 
                // keep only rows that pass all active brushes
                var active = Object.keys(brushRanges);
                if (active.length === 0) {
                    brushedIds = null;
                } else {
                    var matched = data.filter(function(row) {
                        return active.every(function(d) {
                            return row[d] >= brushRanges[d][0] && row[d] <= brushRanges[d][1];
                        });
                    });
                    brushedIds = new Set(matched.map(function(r) { return r._id; }));
                }
 
                window.applyFilter();
            });
 
        axG.append("g").attr("class", "brush").call(brush)
            .call(function(b) {
                b.selectAll("rect.overlay").attr("fill", "none");
                b.selectAll("rect.selection")
                    .attr("fill", "#4e79a7").attr("fill-opacity", 0.2)
                    .attr("stroke", "#4e79a7");
            });
    });
 
    // bottom note
    svg.append("text")
        .attr("x", W / 2).attr("y", H - 4)
        .attr("text-anchor", "middle")
        .attr("font-size", "9px").attr("fill", "#bbb")
        .text("Each line is one person. Drag on any axis to filter.");
}
 
// highlights matched lines and ghosts the rest
function updateParallelOpacity(subset, total) {
    if (!parallelPaths) return;
 
    var activeIds = new Set(subset.map(function(d) { return d._id; }));
 
    parallelPaths
        .attr("opacity", function(d) {
            if (subset.length === total) return 0.25;
            return activeIds.has(d._id) ? 0.85 : 0.04;
        })
        .attr("stroke-width", function(d) {
            if (subset.length === total) return 1.1;
            return activeIds.has(d._id) ? 1.6 : 0.8;
        });
}