// Emily Nguyen
// May 26, 2026
// Cosmetics Dashboard with interactions and animated transitions (selection, brushing, filtering)

// Note: I used Claude as a learning tool to help me understand D3.js interaction and animation concepts
// such as d3.brush() and d3.transition() in order to implement the interactions and animated transitions.

// Color scale for the product types
var labelColors = d3.scaleOrdinal()
    .range(["#e91e8c", "#9c27b0", "#f06292", "#ab47bc", "#ce93d8", "#f48fb1"]);

// Track which product type is currently selected
var selectedProduct = null;

// Load the dataset
d3.csv("data/cosmetics.csv").then(function(rawData) {

    // Convert string columns to numbers
    rawData.forEach(function(d) {
        d.Price       = +d.Price;
        d.Rank        = +d.Rank;
        d.Combination = +d.Combination;
        d.Dry         = +d.Dry;
        d.Normal      = +d.Normal;
        d.Oily        = +d.Oily;
        d.Sensitive   = +d.Sensitive;

        // Change some of the label names
        if (d.Label === "Eye cream")    d.Label = "Eye Cream";
        if (d.Label === "Sun protect")  d.Label = "Sun Protection";
    });

    var data = rawData;

    // Get unique labels by looping through the data
    var labelsMap = {};
    data.forEach(function(d) {
        labelsMap[d.Label] = true;
    });
    var labels = Object.keys(labelsMap).sort();

    // Set it so that each label gets a color
    labelColors.domain(labels);

    barChart(data, labels);
    scatterPlot(data, labels);
    parallelCoordinates(data, labels);

}).catch(function(error) {
    console.log(error);
});

// Legend box for each view
function legendBox(parent, x, y, labels) {
    var boxWidth = 110;
    var boxHeight = labels.length * 18 + 10;

    // White box with border to contain the legend
    parent.append("rect")
        .attr("x", x)
        .attr("y", y)
        .attr("width", boxWidth)
        .attr("height", boxHeight)
        .attr("fill", "#ffffff")
        .attr("stroke", "#f06292")
        .attr("stroke-width", 1)
        .attr("rx", 5);

    // Padding between the items in the box
    return parent.append("g")
        .attr("transform", "translate(" + (x + 8) + "," + (y + 14) + ")");
}

// Bar Chart
function barChart(data, labels) {

    // Count how many products are in each label
    var productCount = {};
    labels.forEach(function(l) {
        productCount[l] = 0;
    });
    data.forEach(function(d) {
        productCount[d.Label]++;
    });

    var barData = labels.map(function(l) {
        return { label: l, count: productCount[l] };
    });

    // Margins to leave room for the axes and legend box
    var margin = { top: 45, right: 130, bottom: 35, left: 55 };
    var barWidth = document.getElementById("bar-chart").offsetWidth;
    var barHeight = document.getElementById("bar-chart").offsetHeight;
    var w = barWidth - margin.left - margin.right - 20;
    var h = barHeight - margin.top - margin.bottom - 20;

    // Append svg to the bar chart div
    var svg = d3.select("#bar-chart").append("svg")
        .attr("width", barWidth)
        .attr("height", barHeight);

    // White background rectange for the chart
    svg.append("rect")
        .attr("x", 8)
        .attr("y", 8)
        .attr("width", barWidth - 16)
        .attr("height", barHeight - 16)
        .attr("fill", "#ffffff")
        .attr("rx", 8);

    // Chart title
    svg.append("text")
        .attr("x", barWidth / 2)
        .attr("y", 30)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("font-weight", "bold")
        .attr("fill", "#880e4f")
        .text("Number of Products by Type");

    // Shift the main group by the margin to fix axes
    var g = svg.append("g")
        .attr("transform", "translate(" + (margin.left + 12) + "," + margin.top + ")");

    // x scale (one band per label)
    var x = d3.scaleBand()
        .domain(labels)
        .range([0, w])
        .padding(0.25);

    // y scale (0 to max product count)
    var y = d3.scaleLinear()
        .domain([0, d3.max(barData, function(d) {
            return d.count;
        })])
        .range([h, 0])
        .nice();

    // x-axis
    g.append("g")
        .attr("transform", "translate(0," + h + ")")
        .call(d3.axisBottom(x))
        .selectAll("text")
            .attr("font-size", "11px")
            .attr("fill", "#880e4f");

    // y-axis
    g.append("g")
        .call(d3.axisLeft(y).ticks(5))
        .selectAll("text")
            .attr("fill", "#880e4f")
            .attr("font-size", "11px");

    // x-axis label
    g.append("text")
        .attr("x", w / 2)
        .attr("y", h + 37)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("fill", "#880e4f")
        .text("Product Type");

    // y-axis label
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -h / 2)
        .attr("y", -42)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("fill", "#880e4f")
        .text("Number of Products");

    // One bar for each product type, colored by type
    g.selectAll(".bar")
        .data(barData)
        .enter()
        .append("rect")
            .attr("class", "bar")
            .attr("x", function(d) {
                return x(d.label);
            })
            .attr("y", function(d) {
                return y(d.count);
            })
            .attr("width", x.bandwidth())
            .attr("height", function(d) {
                return h - y(d.count);
            })
            .attr("fill", function(d) {
                return labelColors(d.label);
            })
            .attr("rx", 3)
            .style("cursor", "pointer")
        // Selection (click on a bar to filter the scatter plot and parallel coordinates plot)
        .on("click", function(d) {
            if (selectedProduct === d.label) {
                // Deselect by clicking on the bar again
                selectedProduct = null;
            } else {
                selectedProduct = d.label;
            }

            // Dim bars that are not selected
            g.selectAll(".bar")
                .transition().duration(500)
                .attr("opacity", function(barD) {
                    if (selectedProduct === null) {
                        return 1;
                    } else if (barD.label === selectedProduct) {
                        return 1;
                    } else {
                        return 0.3;
                    }
                });

            // Fade dots in the scatter plot based on the selected product type
            d3.selectAll(".dot")
                .transition().duration(500)
                .attr("opacity", function(dotD) {
                    if (selectedProduct === null) return 0.7;
                    if (dotD.Label === selectedProduct) {
                        return 0.9;
                    } else {
                        return 0.1;
                    }
                });

            // Fade lines in the parallel coordinates plot based on the selected product type
            d3.selectAll(".pcline")
                .transition().duration(500)
                .attr("opacity", function(lineD) {
                    if (selectedProduct === null) return 0.2;
                    if (lineD.Label === selectedProduct) {
                        return 0.6;
                    } else {
                        return 0.05;
                    }
                });
        });

    // Legend box
    var legendG = legendBox(svg, barWidth - 130, 20, labels);

    // One circle and label for each product type
    labels.forEach(function(l, i) {
        legendG.append("circle")
            .attr("cx", 5)
            .attr("cy", i * 18)
            .attr("r", 5)
            .attr("fill", labelColors(l));

        legendG.append("text")
            .attr("x", 14)
            .attr("y", i * 18 + 4)
            .attr("font-size", "10px")
            .attr("fill", "#880e4f")
            .text(l);
    });
}

// Scatter Plot
function scatterPlot(data, labels) {

    // Margins to leave room for the axes and legend box
    var margin = { top: 45, right: 130, bottom: 35, left: 55 };
    var totalWidth = document.getElementById("scatter-plot").offsetWidth;
    var totalHeight = document.getElementById("scatter-plot").offsetHeight;
    var w = totalWidth - margin.left - margin.right - 20;
    var h = totalHeight - margin.top - margin.bottom - 20;

    // Append svg to the bar chart div
    var svg = d3.select("#scatter-plot").append("svg")
        .attr("width", totalWidth)
        .attr("height", totalHeight);

    // White background rectange for the chart
    svg.append("rect")
        .attr("x", 8)
        .attr("y", 8)
        .attr("width", totalWidth - 16)
        .attr("height", totalHeight - 16)
        .attr("fill", "#ffffff")
        .attr("rx", 8);

    // Chart title
    svg.append("text")
        .attr("x", totalWidth / 2)
        .attr("y", 30)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("font-weight", "bold")
        .attr("fill", "#880e4f")
        .text("Price vs. Rank");

    // Shift the main group by the margin to fix axes
    var g = svg.append("g")
        .attr("transform", "translate(" + (margin.left + 12) + "," + margin.top + ")");

    // x scale (price)
    var x = d3.scaleLinear()
        .domain([0, d3.max(data, function(d) {
            return d.Price;
        })])
        .range([0, w])
        .nice();

    // y scale (rank)
    var y = d3.scaleLinear()
        .domain([
            d3.min(data, function(d) { return d.Rank; }),
            d3.max(data, function(d) { return d.Rank; })
        ])
        .range([h, 0])
        .nice();

    // x-axis
    g.append("g")
        .attr("transform", "translate(0," + h + ")")
        .call(d3.axisBottom(x).ticks(6))
        .selectAll("text")
            .attr("font-size", "11px")
            .attr("fill", "#880e4f");

    // y-axis
    g.append("g")
        .call(d3.axisLeft(y).ticks(5))
        .selectAll("text")
            .attr("font-size", "11px")
            .attr("fill", "#880e4f");

    // x-axis label
    g.append("text")
        .attr("x", w / 2)
        .attr("y", h + 37)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("fill", "#880e4f")
        .text("Price (USD)");

    // y-axis label
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -h / 2)
        .attr("y", -36)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("fill", "#880e4f")
        .text("Customer Rank");

    // Tooltip div that shows product details when hovering
    var tooltip = d3.select("body").append("div")
        .style("position", "absolute")
        .style("background", "#fff0f5")
        .style("border", "1px solid #f06292")
        .style("border-radius", "6px")
        .style("padding", "6px 10px")
        .style("font-size", "11px")
        .style("color", "#880e4f")
        .style("pointer-events", "none")
        .style("opacity", 0);

    // One dot per product, colored by product type
    g.selectAll(".dot")
        .data(data)
        .enter()
        .append("circle")
            .attr("class", "dot")
            .attr("cx", function(d) {
                return x(d.Price);
            })
            .attr("cy", function(d) {
                return y(d.Rank);
            })
            .attr("r", 4)
            .attr("fill", function(d) {
                return labelColors(d.Label);
            })
            .attr("opacity", 0.7)
        .on("mouseover", function(d) {
            // Show the tooltip with the product name, brand, price, and rank
            tooltip.style("opacity", 0.95)
                .html("<strong>" + d.Name + "</strong><br/>" +
                      d.Brand + "<br/>" +
                      "Price: $" + d.Price + "<br/>" +
                      "Rank: " + d.Rank)
                .style("left", (d3.event.pageX + 12) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            tooltip.style("opacity", 0);
        });

    // Brushing (drag to brush a region on the scatter plot and highlight products)
    var brush = d3.brush()
        .extent([[0, 0], [w, h]])
        .on("brush end", function() {
            var selection = d3.event.selection;

            if (selection === null) {
                // Restore dots to normal opacity if no brush is active
                d3.selectAll(".dot")
                    .transition().duration(500)
                    .attr("opacity", 0.7);
            } else {
                var x0 = selection[0][0];
                var x1 = selection[1][0];
                var y0 = selection[0][1];
                var y1 = selection[1][1];

                // Keep dots inside the brush visible and fade dots outside of it
                d3.selectAll(".dot")
                    .transition().duration(500)
                    .attr("opacity", function(d) {
                        var cx = x(d.Price);
                        var cy = y(d.Rank);
                        var inBrush = cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
                        if (inBrush) {
                            return 0.9;
                        } else {
                            return 0.1;
                        }
                    });
            }
        });

    // Add the brush to the chart
    g.append("g")
        .attr("class", "brush")
        .call(brush);

    // Move dots in front of the brush so hovering still works
    g.selectAll(".dot").raise();

    // Legend box
    var legendG = legendBox(svg, totalWidth - 130, 20, labels);

    // One circle and label for each product type
    labels.forEach(function(l, i) {
        legendG.append("circle")
            .attr("cx", 5)
            .attr("cy", i * 18)
            .attr("r", 5)
            .attr("fill", labelColors(l));

        legendG.append("text")
            .attr("x", 14)
            .attr("y", i * 18 + 4)
            .attr("font-size", "10px")
            .attr("fill", "#880e4f")
            .text(l);
    });
}

// Parallel Coordinates Plot
function parallelCoordinates(data, labels) {

    // Margins to leave room for the axes and legend box
    var margin = { top: 65, right: 150, bottom: 80, left: 55 };
    var totalWidth = document.getElementById("parallel-coordinates").offsetWidth;
    var totalHeight = document.getElementById("parallel-coordinates").offsetHeight;
    var w = totalWidth - margin.left - margin.right;
    var h = totalHeight - margin.top - margin.bottom;

    // Append svg to the bar chart div
    var svg = d3.select("#parallel-coordinates").append("svg")
        .attr("width", totalWidth)
        .attr("height", totalHeight);

    // White background rectange for the chart
    svg.append("rect")
        .attr("x", 8)
        .attr("y", 8)
        .attr("width", totalWidth - 16)
        .attr("height", totalHeight - 16)
        .attr("fill", "#ffffff")
        .attr("rx", 8);

    // Chart title
    svg.append("text")
        .attr("x", totalWidth / 2)
        .attr("y", 30)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("font-weight", "bold")
        .attr("fill", "#880e4f")
        .text("Product Overview: Price, Rank, & Skin Type");

    // Shift the main group by the margin to fix axes
    var g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // The price, rank, and product type axes
    var dimensions = ["Price", "Rank", "Combination", "Dry", "Normal", "Oily", "Sensitive"];

    // Even spacing between axes
    var axisStep = (w - 40) / (dimensions.length - 1);

    // One y scale per axis, based on data range
    var yScales = {};
    dimensions.forEach(function(dim) {
        yScales[dim] = d3.scaleLinear()
            .domain(d3.extent(data, function(d) {
                return +d[dim];
            }))
            .range([h, 0])
            .nice();
    });

    // Return the x position of an axis based on index
    function xPos(dim) {
        return 20 + dimensions.indexOf(dim) * axisStep;
    }

    // One line for each product connecting all axes
    g.selectAll(".pcline")
        .data(data)
        .enter()
        .append("path")
            .attr("class", "pcline")
            .attr("fill", "none")
            .attr("stroke", function(d) {
                return labelColors(d.Label);
            })
            .attr("stroke-width", 1)
            .attr("opacity", 0.2)
            .attr("d", function(d) {
                var points = dimensions.map(function(dim) {
                    return [xPos(dim), yScales[dim](+d[dim])];
                });
                return d3.line()(points);
            });

    // Vertical axis for each dimension
    dimensions.forEach(function(dim) {
        var axisG = g.append("g")
            .attr("transform", "translate(" + xPos(dim) + ", 0)");

        // Axis ticks and tick labels
        axisG.call(d3.axisLeft(yScales[dim]).ticks(4))
            .selectAll("text")
                .attr("font-size", "9px")
                .attr("fill", "#880e4f");

        // Axis name
        axisG.append("text")
            .attr("y", -10)
            .attr("text-anchor", "middle")
            .attr("font-size", "11px")
            .attr("font-weight", "bold")
            .attr("fill", "#880e4f")
            .text(dim);
    });

    // Legend box
    var legendBoxHeight = labels.length * 18 + 10;
    var legendY = (totalHeight - legendBoxHeight) / 2;
    var legendG = legendBox(svg, totalWidth - margin.right + 8, legendY, labels);

    // One circle and label for each product type
    labels.forEach(function(l, i) {
        legendG.append("circle")
            .attr("cx", 5)
            .attr("cy", i * 18)
            .attr("r", 5)
            .attr("fill", labelColors(l));

        legendG.append("text")
            .attr("x", 14)
            .attr("y", i * 18 + 4)
            .attr("font-size", "10px")
            .attr("fill", "#880e4f")
            .text(l);
    });

    // Parallel coordinates plot note
    var noteY = totalHeight - 55;
    svg.append("rect")
        .attr("x", 20)
        .attr("y", noteY)
        .attr("width", totalWidth - 40)
        .attr("height", 34)
        .attr("fill", "#fff0f5")
        .attr("stroke", "#f06292")
        .attr("stroke-width", 1)
        .attr("rx", 5);

    svg.append("text")
        .attr("x", totalWidth / 2)
        .attr("y", noteY + 21)
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("fill", "#880e4f")
        .text("Each line represents a different product, and is colored by product type. Skin type goes from not compatible (0) to compatible (1).");
}