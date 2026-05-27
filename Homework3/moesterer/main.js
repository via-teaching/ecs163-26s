(function () {
    // select main svg for all visualization elements are drawn
    const svg = d3.select("svg");

    // tooltip div to display extra info on hover
    const tooltip = d3.select("#tooltip");

    // Load the data
    d3.csv("data/student-mat.csv").then(function (rawData) {
        // convert num columns from strings to numbers
        rawData.forEach(function (d) {
            d.age = Number(d.age);
            d.Medu = Number(d.Medu);
            d.Fedu = Number(d.Fedu);

            d.traveltime = Number(d.traveltime);
            d.studytime = Number(d.studytime);
            d.failures = Number(d.failures); 

            d.famrel = Number(d.famrel);
            d.freetime = Number(d.freetime);

            d.goout = Number(d.goout);
            d.Dalc = Number(d.Dalc);
            d.Walc = Number(d.Walc);
            d.health = Number(d.health);
            d.absences = Number(d.absences);

            d.G1 = Number(d.G1); 

            d.G2 = Number(d.G2);
            d.G3 = Number(d.G3);
        });

        drawDashboard(rawData); 

        // browser size changes req a redraw
        window.addEventListener("resize", function () { 
            drawDashboard(rawData);
        }); 

    }).catch(function (error) {
        console.log("Error loading CSV:", error); 

        // error message if csv path wrong
        svg.append("text")
            .attr("x", 40)
            .attr("y", 50)
            .attr("font-size", "18px")
            .attr("fill", "red")
            .text("Could not load data/student-mat.csv. Check that the file is inside the data folder.");
    });

    function drawDashboard(data) {
        const width = window.innerWidth;
        const height =  window.innerHeight;

        // clear content before redrawing.
        svg.selectAll("*").remove();

        // make svg match browser sizes
        svg.attr("width", width)
            .attr("height", height);

        const outerMargin = 24; 
        const headerHeight = 70;

        const gap = 18;

        const topRowHeight = Math.max(260, (height - headerHeight - outerMargin * 2 - gap) * 0.46);
        const bottomRowHeight = height - headerHeight - outerMargin * 2 - gap - topRowHeight;

        const leftPanelWidth = Math.max(360, (width - outerMargin * 2 - gap) * 0.38);
        const rightPanelWidth = width - outerMargin * 2 - gap - leftPanelWidth;

        const histogramPanel = {
            x: outerMargin,
            y: headerHeight,
            width: leftPanelWidth, 

            height: topRowHeight
        };

        const scatterPanel = {

            x: outerMargin + leftPanelWidth + gap,
            y: headerHeight,
            width: rightPanelWidth,
            height: topRowHeight
        };

        const parallelPanel = {
            x: outerMargin,

            y: headerHeight + topRowHeight + gap, 
            width: width - outerMargin * 2,
            height: bottomRowHeight
        };

        // add main title
        svg.append("text")
            .attr("class", "title")
            .attr("x", outerMargin)
            .attr("y", 34)
            .text("Student Alcohol Consumption and Academic Performance");

        // add subtitle
        svg.append("text")
            .attr("class", "subtitle")
            .attr("x", outerMargin) 
            .attr("y", 56)
            .text("Exploring final grades through various variables such as absences, study time, alcohol use, social habits.");

        // histogram rets function that lets the scatter plot update it
        const updateHistogramFromLasso = drawHistogram(data, histogramPanel);

        drawScatter(data, scatterPanel, updateHistogramFromLasso);
        drawParallelCoordinates(data, parallelPanel);
    }

    function drawPanel(panel) {
        // add bckgrd to separate each visualization
        svg.append("rect")
            .attr("class", "panel")

            .attr("x", panel.x)
            .attr("y", panel.y)
            .attr("width", panel.width)
            .attr("height", panel.height)
            .attr("rx", 12) 
            .attr("ry", 12);
    }


    function drawHistogram(data, panel) {
        drawPanel(panel); 

        const margin = { top: 60, right: 28, bottom: 54, left: 54 }; 
        const innerWidth = panel.width - margin.left - margin.right;

        const innerHeight = panel.height - margin.top - margin.bottom;

        // group for histogram area
        const g = svg.append("g")
            .attr("transform", `translate(${panel.x + margin.left}, ${panel.y + margin.top})`);

        // Histogram title + subtitle
        svg.append("text")
            .attr("class", "chart-title") 
            .attr("x", panel.x + 18)
            .attr("y", panel.y + 28)

            .text("Overview: Final Grade Distribution");

        const note = svg.append("text")
            .attr("class", "note") 
            .attr("x", panel.x + 18)
            .attr("y", panel.y +  45)
            .text("Drag a lasso around points in the scatter plot to show the selected students here.");

        const x = d3.scaleLinear()
            .domain([0, 20]) 
            .range([0, innerWidth]);

        const histogram = d3.histogram() 
            .value(function (d) { return d.G3; })
            .domain(x.domain())

            .thresholds(d3.range(0, 22, 2)); 

        const bins = histogram(data);

        const y = d3.scaleLinear()
            .domain([0, d3.max(bins, function (d) { return d.length; })]) 
            .nice()
            .range([innerHeight, 0]); 

        // horizontal grid lines
        g.append("g")
            .attr("class", "grid")
            .call(d3.axisLeft(y).tickSize(-innerWidth).tickFormat(""));

        // final grade bins on x axis
        g.append("g")
            .attr("class", "axis")
            .attr("transform", `translate(0, ${innerHeight})`)

            .call(d3.axisBottom(x).ticks(10)); 

        // Y axis = num of students
        g.append("g")
            .attr("class", "axis")
            .call(d3.axisLeft(y).ticks(5));

        let lassoIsActive = false;
        let mostRecentSelected = [];

        // default blue bars show all students
        const baseBars = g.selectAll(".hist-bar")
            .data(bins)
            .enter()
            .append("rect")
            .attr("class", "hist-bar") 

            .attr("x", function (d) { return x(d.x0) + 1; })
            .attr("y", function (d) { return y(d.length); })
            .attr("width", function (d) { return Math.max(0, x(d.x1) - x(d.x0) - 2); })
            .attr("height", function (d) { return innerHeight - y(d.length); })

            .attr("fill", "#4c78a8")
            .attr("opacity", 0.85)
            .on("mousemove", function (d, i) {
                const selectedInBin = countInBin(mostRecentSelected, d, i); 

                tooltip.style("opacity", 1)
                    .style("left", (d3.event.pageX + 12) + "px") 

                    .style("top", (d3.event.pageY - 24) + "px")
                    .html(
                        "<strong>Grade range:</strong> " + d.x0 + "–" + d.x1 +
                        "<br><strong>All students:</strong> " + d.length +
                        (lassoIsActive ? "<br><strong>Lasso selected in this bin:</strong> " + selectedInBin : "")
                    );

            })
            .on("mouseout", function () { 
                tooltip.style("opacity", 0);
            });

        // purple overlay bars for brush lasso selected students
        const overlayBars = g.selectAll(".hist-overlay-bar")
            .data(bins)
            .enter()
            .append("rect")
            .attr("class", "hist-overlay-bar")

            .attr("x", function (d) { return x(d.x0) + 1; }) 
            .attr("y", innerHeight)
            .attr("width", function (d) { return Math.max(0, x(d.x1) - x(d.x0) - 2); })
            .attr("height", 0)
            .attr("fill", "#8300bb")
            .attr("opacity", 0.85)
            .style("pointer-events", "none");

        // X label
        g.append("text")
            .attr("class", "axis-label")
            .attr("x", innerWidth / 2)
            .attr("y", innerHeight + 40)
            .attr("text-anchor", "middle")
            .text("Final grade (G3)");

        // Y label
        g.append("text")
            .attr("class", "axis-label")
            .attr("x", -innerHeight / 2)
            .attr("y", -38)

            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .text("Number of students");

        // legend for base bars
        svg.append("rect")
            .attr("x", panel.x + panel.width - 125)
            .attr("y", panel.y + 20)

            .attr("width", 12)
            .attr("height", 12)
            .attr("fill", "#4c78a8")
            .attr("opacity", 0.85);

        svg.append("text")
            .attr("class", "legend-text")
            .attr("x", panel.x + panel.width - 106)
            .attr("y", panel.y + 30)
            .text("All students");

        svg.append("rect")
            .attr("x", panel.x + panel.width - 125)
            .attr("y", panel.y + 38)
            .attr("width", 12)
            .attr("height", 12)
            .attr("fill", "#8300bb")
            .attr("opacity", 0.85);

        svg.append("text")
            .attr("class", "legend-text")
            .attr("x", panel.x + panel.width - 106)
            .attr("y", panel.y + 48)

            .text("Selected by lasso");

        function countInBin(dataset, bin, binIndex) {
            return dataset.filter(function (d) {

                const isLastBin = binIndex === bins.length - 1;
                return d.G3 >= bin.x0 && (d.G3 < bin.x1 || (isLastBin && d.G3 <= bin.x1));

            }).length; 
        }

        function updateOverlay(dataset, active) {
            const counts = bins.map(function (bin, i) {
                return countInBin(dataset, bin, i); 
            });

            overlayBars.data(counts)
                .transition()
                .duration(250)

                .attr("y", function (count) { return y(count); })
                .attr("height", function (count) { return innerHeight - y(count); });

            lassoIsActive =  active;
            mostRecentSelected = active ? dataset : [];

            if (active) {
                note.text("Points surrounded in purple shows the students currently selected by the lasso in the scatter plot.");
            } else {
                note.text("Drag a lasso around points in the scatter plot to show the selected students in the bar chart.");
            }
        }


        // return scatter plot update the histogram
        return updateOverlay;
    }

    function drawScatter(data, panel, updateHistogramFromLasso) {
        drawPanel(panel);

        const margin = { top: 60, right: 170, bottom: 58, left: 58 }; 

        const innerWidth = panel.width - margin.left -  margin.right;
        const innerHeight = panel.height - margin.top - margin.bottom;

        // keep only Dalc 1 and 5, otherwise too crowded
        const filteredData = data.filter(function (d) { 
            return d.Dalc === 1 || d.Dalc === 5;

        });

        // group for scatter plot area
        const g = svg.append("g")
            .attr("transform", `translate(${panel.x + margin.left}, ${panel.y + margin.top})`);

        // scatter plot title
        svg.append("text")
            .attr("class", "chart-title")
            .attr("x", panel.x + 18)
            .attr("y", panel.y + 28)
            .text("Focus View: Lasso Students by Absences, Alcohol Use, and Final Grade");

        // subtitle
        svg.append("text")
            .attr("class", "note")
            .attr("x", panel.x + 18)

            .attr("y", panel.y + 45)
            .text("Drag around points to lasso select students. The selected students appear in purple on the overview bar chart. Double click to release the selected points.");

        const x =  d3.scaleLinear()
            .domain([0, d3.max(filteredData, function (d) { return d.absences; })])
            .nice()
            .range([0, innerWidth]);

        const y = d3.scaleLinear()
            .domain([0, 20])
            .range([innerHeight, 0]);

        // Dalc colors
        const colorMap = {
            1: "#1f77b4",
            5: "#d62728"

        };



        // shapes as additional visual cue
        const shapeMap = {
            1: d3.symbolCircle,
            5: d3.symbolTriangle
        }; 

        const symbolSize = 140;

        // vertical grid lines.
        g.append("g")
            .attr("class", "grid")

            .attr("transform", `translate(0, ${innerHeight})`)
            .call(
                d3.axisBottom(x)
                    .tickSize(-innerHeight)
                    .tickFormat("")
            );


        // horizontal grid lines.
        g.append("g")
            .attr("class", "grid")
            .call(
                d3.axisLeft(y)
                    .tickSize(-innerWidth)
                    .tickFormat("")
            );

        // X-axis
        g.append("g")
            .attr("class", "axis")
            .attr("transform", `translate(0, ${innerHeight})`)
            .call(d3.axisBottom(x).ticks(7));

        // Y axis
        g.append("g")
            .attr("class", "axis")
            .call(d3.axisLeft(y).ticks(5));

        // transparent rect catches lasso starts in empty chart space
        g.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", innerWidth)
            .attr("height", innerHeight)
            .attr("fill", "transparent")

            .style("pointer-events", "all");

        const lowDalcData = filteredData.filter(function (d) {
            return d.Dalc === 1; 
        });

        const highDalcData = filteredData.filter(function (d) {
            return d.Dalc === 5; 

        });

        const pointsLayer = g.append("g");

        function addScatterSymbols(selection, dataset) {
            // add a student symbol for each student in scatter plot
            selection.selectAll(null)
                .data(dataset)
                .enter()
                .append("path")

                .attr("class", "student-symbol")
                .attr("transform", function (d) {
                    return `translate(${x(d.absences)}, ${y(d.G3)})`;

                })
                .attr("d", function (d) {
                    return d3.symbol()
                        .type(shapeMap[d.Dalc])
                        .size(symbolSize)();
                })
                .attr("fill", function (d) {  return colorMap[d.Dalc]; })
                .attr("opacity", 0.72)
                .attr("stroke", "#ffffff")
                .attr("stroke-width", 1)
                .on("mousemove", function (d) {
                    tooltip.style("opacity", 1)
                        .style("left", (d3.event.pageX + 12) + "px")
                        .style("top", (d3.event.pageY - 24) + "px")

                        .html(
                            "<strong>Final grade:</strong> " + d.G3 +
                            "<br><strong>Absences:</strong> " + d.absences +
                            "<br><strong>Workday alcohol:</strong> " + d.Dalc + " / 5" +
                            "<br><strong>Study time:</strong> " + studyLabel(d.studytime) +
                            "<br><strong>Sex:</strong> " + d.sex
                        );
                })
                .on("mouseout", function () {
                    tooltip.style("opacity", 0);
                });
        }

        // Draw circles first.
        addScatterSymbols(pointsLayer.append("g"), lowDalcData);

        // Draw triangles on top, because there are fewer of them.
        addScatterSymbols(pointsLayer.append("g"), highDalcData);

        const lassoLayer = g.append("g");

        const lassoPath = lassoLayer.append("path")
            .attr("fill", "#a373eb")
            .attr("fill-opacity", 0.14)
            .attr("stroke", "#8300bb")
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "4 3") 
            .style("pointer-events", "none");

        const lassoLine = d3.line()
            .x(function (d) { return d[0]; })
            .y(function (d) { return d[1]; });

        let polygon = [];
        let isLassoing = false;

        // lasso behavior: mouse down starts, mouse move draws, then mouse up selects
        g.on("mousedown", function () {
            const p = d3.mouse(this); 

            if (!pointIsInsideChart(p)) {
                return;

            }

            isLassoing = true;
            polygon = [p]; 

            lassoPath.attr("d", lassoLine(polygon));

            d3.select(window)

                .on("mousemove.scatterLasso", function () {
                    if (!isLassoing) {
                        return;
                    }

                    let nextPoint =  d3.mouse(g.node());
                    nextPoint = clampPointToChart(nextPoint);
                    polygon.push(nextPoint);

                    drawLassoAndSelection(false); 
                })
                .on("mouseup.scatterLasso", function () {
                    if (!isLassoing) { 
                        return;

                    }

                    isLassoing = false;
                    drawLassoAndSelection(true);

                    d3.select(window) 
                        .on("mousemove.scatterLasso", null)
                        .on("mouseup.scatterLasso", null);
                });
        });

        // double click clears the lasso selection
        g.on("dblclick", function () {
            polygon = [];
            lassoPath.attr("d", null); 

            pointsLayer.selectAll(".student-symbol")
                .attr("opacity", 0.72)
                .attr("stroke", "#ffffff")
                .attr("stroke-width", 1);
            updateHistogramFromLasso([], false);
        });

        function pointIsInsideChart(p) { 
            return p[0] >= 0 && p[0] <= innerWidth && p[1] >= 0 && p[1] <= innerHeight; 

        }

        function clampPointToChart(p) {
            return [
                Math.max(0, Math.min(innerWidth, p[0])),
                Math.max(0, Math.min(innerHeight, p[1]))

            ];
        }

        function drawLassoAndSelection(isFinal) {
            if (polygon.length < 2) { 
                return;
            }


            const closedPolygon = polygon.concat([polygon[0]]); 
            lassoPath.attr("d", lassoLine(closedPolygon));

            if (polygon.length <= 2) {
                return; 
            }

            const selected =  [];

            pointsLayer.selectAll(".student-symbol")
                .each(function (d) {
                    const point = [x(d.absences), y(d.G3)];
                    const isSelected = d3.polygonContains(polygon, point);

                    if (isSelected) {
                        selected.push(d);
                    }


                    d3.select(this)
                        .attr("opacity", isSelected ? 1 : 0.18)
                        .attr("stroke", isSelected ? "#9d14d7" : "#ffffff")
                        .attr("stroke-width", isSelected ? 2.2 : 1);
                });


            updateHistogramFromLasso(selected, selected.length > 0); 

            if (isFinal && selected.length === 0) { 

                polygon = [];
                lassoPath.attr("d", null);
                pointsLayer.selectAll(".student-symbol")
                    .attr("opacity", 0.72)
                    .attr("stroke", "#ffffff")

                    .attr("stroke-width", 1);
                updateHistogramFromLasso([], false);
            }
        }

        // X label 
        g.append("text")
            .attr("class", "axis-label")
            .attr("x", innerWidth / 2)
            .attr("y", innerHeight + 42)
            .attr("text-anchor", "middle")
            .text("Number of school absences");

        // Y axis label
        g.append("text")
            .attr("class", "axis-label")
            .attr("x", -innerHeight / 2)
            .attr("y", -40)

            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .text("Final grade (G3)");

        const legendX = panel.x +  panel.width - 145;
        const legendY = panel.y + 90; 

        const alcoholLevels = [1, 5];

        // Legend title
        svg.append("text")
            .attr("class", "legend-text")
            .attr("x", legendX)
            .attr("y", legendY - 18)
            .attr("font-weight", "bold")
            .text("Workday alcohol (Dalc)");

        // Legend symbols 
        svg.selectAll(".dalc-legend-symbol")
            .data(alcoholLevels)
            .enter()
            .append("path")

            .attr("class", "dalc-legend-symbol")
            .attr("transform", function (d, i) { 
                return `translate(${legendX}, ${legendY + i * 30})`;
            })
            .attr("d", function (d) {
                return d3.symbol()
                    .type(shapeMap[d])
                    .size(180)();

            })

            .attr("fill", function (d) { return colorMap[d]; })
            .attr("stroke", "#ffffff") 
            .attr("stroke-width", 1);

        // Legend label text
        svg.selectAll(".dalc-legend-label")
            .data(alcoholLevels)
            .enter()

            .append("text")
            .attr("class", "legend-text")
            .attr("x", legendX + 24)

            .attr("y", function (d, i) { return legendY + i * 30 + 4; }) 
            .text(function (d) {
                if (d === 1) return "1 / 5 = very low";
                return "5 / 5 = very high";
            });


    }

    function drawParallelCoordinates(data, panel) { 
        drawPanel(panel);

        const margin = { top: 105, right: 55, bottom: 34, left: 55 }; 

        const innerWidth = panel.width - margin.left - margin.right;
        const innerHeight = panel.height - margin.top - margin.bottom;

        // Title
        svg.append("text")
            .attr("class", "chart-title")
            .attr("x", panel.x + 18)
            .attr("y", panel.y + 28)
            .text("Advanced View: Parallel Coordinates of Varying Student Factors");

        // Subtitles
        svg.append("text")
            .attr("class", "note")
            .attr("x", panel.x + 18)
            .attr("y", panel.y + 48)
            .text("Scroll to zoom in and out. Drag to pan.");


        svg.append("text")
            .attr("class", "note")
            .attr("x", panel.x + 18)
            .attr("y", panel.y + 64)
            .text("The varying line color groups students by their final grade range.");

        const dimensions = [
            { key: "studytime", label: "Study Time", min: 1, max: 4 },
            { key: "failures", label: "Failures", min: 0, max: 4 },
            { key: "goout", label: "Going Out", min: 1, max: 5 },

            { key: "Dalc", label: "Workday Alcohol", min: 1, max: 5 },
            { key: "Walc", label: "Weekend Alcohol", min: 1, max: 5 },

            { key: "absences", label: "Absences", min: 0, max: d3.max(data, function (d) { return d.absences; }) },
            { key: "G3", label: "Final Grade", min: 0, max: 20 }
        ];

        const x = d3.scalePoint() 
            .domain(dimensions.map(function (d) { return d.key; }))
            .range([0, innerWidth])
            .padding(0.35);

        const yScales = {}; 

        dimensions.forEach(function (dim) {
            yScales[dim.key] = d3.scaleLinear()
                .domain([dim.min, dim.max])
                .range([innerHeight, 0]); 
        });

        function gradeColor(g3) {
            if (g3 <= 7) {
                return "#d62728"; 
            }
            if (g3 <= 14) {
                return "#1f77b4";
            }
            return "#2ca02c";
        }

        const line = d3.line();

        function path(d) {
            return line(dimensions.map(function (dim) {
                return [x(dim.key), yScales[dim.key](d[dim.key])];
            }));
        }

        
        //nest svg allows a window for the parallel coords chart
        // everything outside of window/box is clipped during zooming

        const chartWindow = svg.append("svg") 
            .attr("x", panel.x + margin.left)
            .attr("y", panel.y + margin.top - 60)

            .attr("width", innerWidth)
            .attr("height", innerHeight + 95)
            .style("overflow", "hidden");

        const g = chartWindow.append("g")
            .attr("transform", "translate(0, 60)");

        // invisible rectangle is behind chart content
        // catches zoom and pan gestures in empty space, but it not cover the lines
        // individual line hover effect can still work 
        g.append("rect")
            .attr("x", 0)
            .attr("y", -60)
            .attr("width", innerWidth)
            .attr("height", innerHeight + 95)
            .attr("fill", "transparent")
            .style("pointer-events", "all");

        // parallel coordinates drawing inside this group
        // zooming directly keeps the axes and lines attached

        const zoomContent = g.append("g"); 

        const lineLayer = zoomContent.append("g");
        const axisLayer = zoomContent.append("g");

        const blueData = data.filter(function (d) {
            return d.G3 >= 8 && d.G3 <= 14;
        });

        const redData = data.filter(function (d) {
            return d.G3 >= 0 && d.G3 <= 7;
        });

        const greenData = data.filter(function (d) {
            return d.G3 >= 15 && d.G3 <= 20; 
        });

        function addParallelLines(selection, dataset) {
            // add one connected line for every student
            selection.selectAll(null)
                .data(dataset)
                .enter()
                .append("path")
                .attr("class", "parallel-line")
                .attr("d", path)

                .attr("fill", "none")
                .attr("stroke", function (d) { return gradeColor(d.G3); })

                .attr("stroke-width", 1.4)
                .attr("opacity", 0.75)
                .on("mousemove", function (d) {

                    d3.select(this)
                        .raise()
                        .attr("stroke-width", 3)
                        .attr("opacity", 1);

                    tooltip.style("opacity", 1)
                        .style("left",  (d3.event.pageX + 12) + "px")
                        .style("top", (d3.event.pageY - 24) + "px")
                        .html( 
                            "<strong>Final grade:</strong> " + d.G3 +
                            "<br><strong>Study time:</strong> " + studyLabel(d.studytime) +
                            "<br><strong>Failures:</strong> " + d.failures +
                            "<br><strong>Going out:</strong> " + d.goout + " / 5" +
                            "<br><strong>Weekend alcohol:</strong> " + d.Walc + " / 5"
                        );
                })
                .on("mouseout", function () { 

                    d3.select(this)
                        .attr("stroke-width", 1.4)
                        .attr("opacity", 0.75);

                    tooltip.style("opacity", 0);

                });
        }


        // Blue first.
        addParallelLines(lineLayer.append("g"), blueData);

        // Red second.
        addParallelLines(lineLayer.append("g"), redData);

        // Green on top so less visual noise this way.
        addParallelLines(lineLayer.append("g"), greenData);

        // one axis group per variable
        const axes = axisLayer.selectAll(".parallel-axis")
            .data(dimensions)
            .enter()
            .append("g") 
            .attr("class", "parallel-axis axis")

            .attr("transform", function (d) {
                return `translate(${x(d.key)}, 0)`;
            });

        // draw vertical axes
        axes.each(function (d) {
            d3.select(this).call(d3.axisLeft(yScales[d.key]).ticks(4));

        }); 

        // axis labels
        axes.append("text")
            .attr("class", "axis-label")

            .attr("x", 0)
            .attr("y", -18)

            .attr("text-anchor", "middle")
            .attr("font-weight", "bold")
            .text(function (d) { return d.label; });

        const zoomBehavior = d3.zoom() 

            .scaleExtent([1, 6])
            .extent([[0, 0], [innerWidth, innerHeight + 95]])
            .translateExtent([[-innerWidth, -innerHeight], [innerWidth * 2, (innerHeight + 95) * 2]])
            .on("zoom", function () {

                zoomContent.attr("transform", d3.event.transform);
            });

        // apply zoom to the nested SVG
        chartWindow
            .style("cursor", "grab")
            .call(zoomBehavior);

        chartWindow.on("dblclick.zoomReset", function () {
            chartWindow.transition()
                .duration(500) 

                .call(zoomBehavior.transform, d3.zoomIdentity);
        });

        chartWindow.on("mousedown.cursor", function () {

            d3.select(this).style("cursor", "grabbing");
        });

        chartWindow.on("mouseup.cursor", function () { 
            d3.select(this).style("cursor", "grab");
        });

        // Legend
        const legendX = panel.x + panel.width - 240;
        const legendY = panel.y + 40;

        svg.append("text")
            .attr("class", "legend-text")
            .attr("x", legendX)
            .attr("y", legendY - 8)

            .attr("font-weight", "bold")
            .text("Line color: final grade");

        const legendData = [
            { label: "0–7", color: "#d62728" },
            { label: "8–14", color: "#1f77b4" },
            { label: "15–20", color: "#2ca02c" }
        ];

        svg.selectAll(".parallel-legend-box") 
            .data(legendData)
            .enter()
            .append("rect")

            .attr("class", "parallel-legend-box")
            .attr("x", legendX)
            .attr("y", function (d, i) { return legendY + i * 22; })
            .attr("width", 14) 

            .attr("height", 14)
            .attr("fill", function (d) { return d.color; });

        svg.selectAll(".parallel-legend-label")
            .data(legendData)
            .enter() 
            .append("text") 
            .attr("class", "legend-text")
            
            .attr("x", legendX + 22)
            .attr("y", function (d, i) { return legendY + i * 22 + 11; })

            .text(function (d) { return d.label; });


    }

    function studyLabel(value) {
        if (value === 1) {
            return "<2 hours";

        }

        if (value === 2) {
            return "2–5 hours"; 
        }

        if (value === 3) {
            return "5–10 hours";
        }

        return ">10 hours";
    }

})(); 


















