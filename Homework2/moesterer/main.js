
(function () {
    // select main svg where all d3 vis element are going to be drawn
    const svg = d3.select("svg"); 
    // select tooltip div to displa extra info on hover
    const tooltip = d3.select("#tooltip");

    // ld the data
    d3.csv("data/student-mat.csv").then(function (rawData) { 
        // convert numeric cols frm strings to nums for d3 scale to work
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

        //err msg if csv path wrong
        svg.append("text")
            .attr("x", 40)
            .attr("y", 50)
            .attr("font-size", "18px")
            .attr("fill",  "red")
            .text("Could not load data/student-mat.csv. Check that the file is inside the data folder.");
    });

    function drawDashboard(data) {
        const width = window.innerWidth; 
        const height = window.innerHeight;

        // clear content before redrawing
        svg.selectAll("*").remove(); 

        // svg match browser
        svg.attr("width", width)
            .attr("height", height);


        const outerMargin = 24;

        const headerHeight = 70;
        const gap = 18;

        const topRowHeight =  Math.max(260, (height - headerHeight -  outerMargin * 2 - gap) * 0.46);
        const bottomRowHeight = height - headerHeight - outerMargin * 2 - gap - topRowHeight;

        const leftPanelWidth = Math.max(360, (width - outerMargin * 2 - gap) * 0.38);
        const rightPanelWidth = width - outerMargin * 2 - gap - leftPanelWidth;

        const histogramPanel =  {
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

        const parallelPanel =  {
            x: outerMargin,
            y: headerHeight + topRowHeight + gap,
            width: width - outerMargin * 2,
            height: bottomRowHeight
        };

        // add main titile
        svg.append("text")
            .attr("class", "title")
            .attr("x",  outerMargin)
            .attr("y", 34)
            .text("Student Alcohol Consumption and Academic Performance");

        // subtitle
        svg.append("text")
            .attr("class", "subtitle")
            .attr("x", outerMargin)

            .attr("y", 56)
            .text("Exploring final grades through various variables such as absences, study time, alcohol use, social habits.");

        drawHistogram(data, histogramPanel);
        drawScatter(data, scatterPanel);

        drawParallelCoordinates(data, parallelPanel);
    }

    function drawPanel(panel) {
        // add background to separate each visualization
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


        // add group for histrogram area
        const g = svg.append("g")
            .attr("transform", `translate(${panel.x + margin.left}, ${panel.y + margin.top})`);

        // histogram title and subtitle
        svg.append("text")
            .attr("class", "chart-title") 
            .attr("x", panel.x + 18)
            .attr("y", panel.y + 28)
            .text("Overview: Final Grade Distribution");

        svg.append("text")
            .attr("class", "note")
            .attr("x", panel.x + 18)
            .attr("y", panel.y + 45)

            .text("What the distribution of final grade looks like.");

        const x = d3.scaleLinear()
            .domain([0, 20]) 
            .range([0, innerWidth]);

        const histogram = d3.histogram()
            .value(function (d) { return d.G3; })
            .domain(x.domain())

            .thresholds(d3.range(0, 22, 2));

        const bins = histogram(data); 

        const y =  d3.scaleLinear()
            .domain([0, d3.max(bins, function (d) { return d.length; })])
            .nice()
            .range([innerHeight, 0]);

        // horizontal lines to make chart easier to read
        g.append("g")

            .attr("class", "grid")
            .call(d3.axisLeft(y).tickSize(-innerWidth).tickFormat(""));

        // final grade bins on xaxis
        g.append("g")
            .attr("class", "axis")
            .attr("transform",  `translate(0, ${innerHeight})`)
            .call(d3.axisBottom(x).ticks(10));

        // y-axis  = num of students.
        g.append("g")
            .attr("class", "axis")
            .call(d3.axisLeft(y).ticks(5)); 

        // add bars as rects
        g.selectAll(".hist-bar") 
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

            .on("mousemove", function (d) { 
                tooltip.style("opacity", 1)
                    .style("left", (d3.event.pageX + 12) + "px")
                    .style("top", (d3.event.pageY - 24) + "px")
                    .html(
                        "<strong>Grade range:</strong> " + d.x0 + "–" + d.x1 +
                        "<br><strong>Students:</strong> " + d.length 
                    );
            })
            .on("mouseout", function () { 
                tooltip.style("opacity", 0);

            });


        // x label
        g.append("text")
            .attr("class", "axis-label")
            .attr("x", innerWidth / 2)
            .attr("y", innerHeight + 40)

            .attr("text-anchor", "middle") 
            .text("Final grade (G3)");

        // y label
        g.append("text")
            .attr("class", "axis-label")

            .attr("x", -innerHeight / 2)
            .attr("y", -38)
            .attr("text-anchor", "middle")
            .attr("transform",  "rotate(-90)")
            .text("Number of students");

        // legend color swatch
        svg.append("rect")
            .attr("x", panel.x + panel.width - 125)
            .attr("y", panel.y + 20)
            .attr("width", 12)

            .attr("height", 12)
            .attr("fill", "#4c78a8")
            .attr("opacity", 0.85);

        // text for legend
        svg.append("text") 
            .attr("class", "legend-text")
            .attr("x", panel.x + panel.width - 106)
            .attr("y", panel.y + 30)
            .text("Student count");
    }

    function drawScatter(data, panel) { 
        drawPanel(panel);

        const margin = { top: 60, right: 170, bottom: 58, left: 58 };
        const innerWidth = panel.width - margin.left - margin.right; 
        const innerHeight = panel.height - margin.top - margin.bottom;


        // keep only dalc 1 and 5, otherwise too crowded
        const filteredData = data.filter(function (d) { 
            return d.Dalc  === 1 || d.Dalc === 5;
        });

        // group for scatter plot area
        const g = svg.append("g")
            .attr("transform", `translate(${panel.x + margin.left}, ${panel.y + margin.top})`);

        // scatter plot title
        svg.append("text")
            .attr("class", "chart-title")
            .attr("x", panel.x +  18)
            .attr("y", panel.y + 28) 
            .text("The Focus View: Absences and Weekly Alcohol Consumption Impact on Final Grade");

        // subtitle
        svg.append("text")
            .attr("class", "note")
            .attr("x", panel.x + 18)
            .attr("y", panel.y + 45)

            .text("Only students with very low (1) or very high (5) workday alcohol consumption are shown in conjunctions with total number of absences against final grade.");

        const x = d3.scaleLinear()
            .domain([0, d3.max(filteredData, function (d) { return d.absences; })]) 
            .nice()
            .range([0, innerWidth]);

        const y = d3.scaleLinear()
            .domain([0, 20])
            .range([innerHeight, 0]); 

        // dalc colors
        const colorMap = { 
            1: "#1f77b4",
            5: "#d62728"

        };

        // shapes as anoth visual cue to make it easier to separate 
        const shapeMap = {
            1: d3.symbolCircle, 
            5: d3.symbolTriangle
        };

        // symbol size
        const symbolSize =  140;

        // vertical grid lines
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

        // x axis
        g.append("g")

            .attr("class", "axis")
            .attr("transform", `translate(0, ${innerHeight})`)
            .call(d3.axisBottom(x).ticks(7)); 

        // y axis.
        g.append("g")
            .attr("class", "axis")

            .call(d3.axisLeft(y).ticks(5)); 

        const lowDalcData = filteredData.filter(function (d) {
            return d.Dalc ===  1;
        });

        const highDalcData = filteredData.filter(function (d) {
            return d.Dalc === 5; 
        });

        function addScatterSymbols(selection, dataset) { 
            // add one student symbol for each of the students in scatter plot
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


                .attr("fill", function (d) { return colorMap[d.Dalc]; })
                .attr("opacity", 0.72)
                .attr("stroke", "#ffffff")
                .attr("stroke-width", 1)

                // show tooptip w/ student details when hovering over the corresponding symbol
                .on("mousemove", function (d) {
                    tooltip.style("opacity", 1)
                        .style("left", (d3.event.pageX +  12) + "px")
                        .style("top", (d3.event.pageY - 24) + "px")

                        .html(
                            "<strong>Final grade:</strong> " + d.G3 +
                            "<br><strong>Absences:</strong> " + d.absences +
                            "<br><strong>Workday alcohol:</strong> " + d.Dalc + " / 5" +
                            "<br><strong>Study time:</strong> " + studyLabel(d.studytime) +
                            "<br><strong>Sex:</strong> " + d.sex 
                        );
                })
                // hide tooltop when mouse leaves symbol
                .on("mouseout",  function () {
                    tooltip.style("opacity", 0);
                });

        }

        // draw circles first
        addScatterSymbols(g.append("g"), lowDalcData);

        // draw triangles on top, less of them and so easier to see
        addScatterSymbols(g.append("g"), highDalcData);

        // x label
        g.append("text")
            .attr("class", "axis-label")

            .attr("x", innerWidth / 2)
            .attr("y", innerHeight +  42)
            .attr("text-anchor", "middle")
            .text("Number of school absences");

        // y axis label
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



        // legent title
        svg.append("text")
            .attr("class",  "legend-text")
            .attr("x", legendX)
            .attr("y", legendY - 18)

            .attr("font-weight", "bold") 
            .text("Workday alcohol (Dalc)");

        // legend symbols
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

        // legend label text 
        svg.selectAll(".dalc-legend-label") 
            .data(alcoholLevels)

            .enter()
            .append("text")
            .attr("class", "legend-text")
            .attr("x", legendX + 24)
            .attr("y", function (d, i) { return legendY + i * 30 + 4; })
            .text(function (d) {
                if (d ===  1) return "1 / 5 = very low";

                return "5 / 5 = very high";

            });
    }



    function drawParallelCoordinates(data, panel) { 
    drawPanel(panel);

    const margin = { top: 105, right: 55, bottom: 34, left: 55 };

    const innerWidth = panel.width - margin.left - margin.right;
    const innerHeight = panel.height- margin.top - margin.bottom;

    // group for the parallel coordinates chart area
    const g = svg.append("g")
        .attr("transform", `translate(${panel.x + margin.left}, ${panel.y +  margin.top})`);

    // title
    svg.append("text")
        .attr("class", "chart-title")
        .attr("x", panel.x +  18)
        .attr("y", panel.y + 28)
        .text("Advanced View: Parallel Coordinates of Varying Student Factors");

    // subtitle add 1
    svg.append("text")
        .attr("class", "note")
        .attr("x", panel.x + 18) 
        .attr("y", panel.y + 48)
        .text("Lines connect and track the same student across different variables."); 

    // subtitle add 2
    svg.append("text")
        .attr("class", "note")
        .attr("x", panel.x + 18)
        .attr("y", panel.y + 64)

        .text("The varying line color groups students by thier final grade range.");


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
        .range([0,  innerWidth])
        .padding(0.35);

    const yScales = {};

    dimensions.forEach(function (dim) {

        yScales[dim.key] = d3.scaleLinear()
            .domain([dim.min, dim.max])
            .range([innerHeight, 0]); 
    });

    // ranges of color categories
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

    // draw connected student line
    const blueData = data.filter(function (d) {
        return d.G3 >= 8 && d.G3 <= 14; 

    });
    
    const redData = data.filter(function (d) {
        return d.G3 >= 0 && d.G3 <=  7;
    });
    
    const greenData = data.filter(function (d) {
        return d.G3 >=  15 && d.G3 <= 20;
    });
    
    function addParallelLines(selection, dataset) { 
        // add one connected line for every student bc for parallel coords char
        selection.selectAll(null)
            .data(dataset)
            .enter()

            .append("path") 
            .attr("class", "parallel-line")
            .attr("d", path)
            .attr("fill", "none")

            .attr("stroke", function (d) { return gradeColor(d.G3);  })
            .attr("stroke-width", 1.4)
            .attr("opacity", 0.75)
            // highlight student line and show tootip on hover for individaul student details
            .on("mousemove", function (d) {

                d3.select(this)
                    .attr("stroke-width",  3)
                    .attr("opacity", 1);
            
                tooltip.style("opacity", 1)
                    .style("left", (d3.event.pageX + 12) + "px")
                    .style("top", (d3.event.pageY - 24) + "px")

                    .html(
                        "<strong>Final grade:</strong> " + d.G3 +
                        "<br><strong>Study time:</strong> " + studyLabel(d.studytime) + 
                        "<br><strong>Failures:</strong> " + d.failures +
                        "<br><strong>Going out:</strong> " + d.goout + " / 5" +
                        "<br><strong>Weekend alcohol:</strong> " + d.Walc + " / 5"

                    );
            })
            // return line to normal and hide tooltip when mouse leaves line hover
            .on("mouseout", function () {
                d3.select(this)
                    .attr("stroke-width", 1.4)

                    .attr("opacity", 0.75);
            
                tooltip.style("opacity", 0); 
            });
    }
    
    // blue first
    addParallelLines(g.append("g"), blueData); 
     

    // red 2
    addParallelLines(g.append("g"), redData); 
    
    // green on top, less visual noise this way
    addParallelLines(g.append("g"), greenData); 

    // one axis group per variable
    const axes = g.selectAll(".parallel-axis")
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

    // Axis labels
    axes.append("text") 
        .attr("class", "axis-label")
        .attr("x",  0)
        .attr("y", -18) 
        .attr("text-anchor", "middle") 
        .attr("font-weight", "bold")
        .text(function (d) { return d.label; });

    // dlegend
    const legendX = panel.x +panel.width - 240;
    const legendY = panel.y + 40; 

    // legend title explaining final color grade range groups
    svg.append("text")
        .attr("class", "legend-text")
        .attr("x", legendX)
        .attr("y", legendY -  8)

        .attr("font-weight", "bold")
        .text("Line color: final grade"); 

    const legendData = [
        { label: "0–7", color: "#d62728" }, 
        { label: "8–14", color: "#1f77b4" },
        { label: "15–20", color: "#2ca02c" }

    ];

    // add the swatch squares, colored for each final grade range to the legend
    svg.selectAll(".parallel-legend-box") 

        .data(legendData)
        .enter()
        .append("rect")
        .attr("class",  "parallel-legend-box")
        .attr("x", legendX)
        .attr("y", function (d, i) { return legendY + i * 22; })
        .attr("width", 14)

        .attr("height", 14) 
        .attr("fill", function (d) { return d.color; });

    // text labels for each final grande range for legend
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


 



















