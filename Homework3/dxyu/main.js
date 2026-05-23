// Homework 3

// sets layout dimensions
const width = 1200;
const height = 800;
const topHeight = height * 0.45;
const bottomHeight = height * 0.50;
const margin = { top: 60, right: 120, bottom: 80, left: 80 };

// color scale for depression status
const colorScale = d3.scaleOrdinal()
    .domain(["Yes", "No"])
    .range(["#f1484b", "#4f81b6"]); 

// adds background color and prevents scrolling
d3.select("body").style("background-color", "#f4f4f9").style("overflow", "hidden");

// targets svg
const svg = d3.select("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

// tracks mouse and displays data instantly
const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("position", "absolute")
    .style("background-color", "white")
    .style("border", "solid 1px #ccc")
    .style("padding", "10px")
    .style("border-radius", "5px")

    // prevents tooltip from blocking mouse events
    .style("pointer-events", "none")
    .style("font-size", "12px")
    .style("box-shadow", "0px 2px 4px rgba(0,0,0,0.2)");

let selectedDepression = null;

// loads student mental health dataset
d3.csv("./data/Student Mental health.csv").then(rawData => {
    // cleans and processes data
    const data = rawData.map(d => ({
        gender: d["Choose your gender"].trim(),
        year: d["Your current year of Study"].toLowerCase().trim(),
        cgpa: d["What is your CGPA?"].trim(),
        depression: d["Do you have Depression?"].trim(),
        anxiety: d["Do you have Anxiety?"].trim()
    })).filter(d => d.cgpa !== "");

    // gets CGPA categories for axes during updates
    const allCgpas = Array.from(new Set(data.map(d => d.cgpa))).sort((a, b) => d3.ascending(a, b));

    // Donut Chart
    const donutWidth = width * 0.35;
    const radius = Math.min(donutWidth, topHeight) / 2 - margin.top;
    const gDonut = svg.append("g")
        .attr("transform", `translate(${donutWidth / 2}, ${(topHeight / 2) + 20})`);

    // calculates angle to make donut
    const pie = d3.pie().value(d => d.value);

    // creates annular sectors
    const arc = d3.arc().innerRadius(radius * 0.5).outerRadius(radius); 
    
    // adds title
    svg.append("text")
        .attr("x", donutWidth / 2)
        .attr("y", margin.top - 20)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-weight", "bold")
        .text("Students with Depression");

    // adds instructional text
    svg.append("text")
        .attr("x", donutWidth / 2)
        .attr("y", margin.top)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "gray")
        .style("font-style", "italic")
        .text("(Click a slice to filter dashboard)");

    // adds legend 
    const legend1 = svg.append("g").attr("transform", `translate(${donutWidth - 90}, ${margin.top + 20})`);
    legend1.append("text").attr("x", 0).attr("y", -10).text("Depression Status").style("font-weight", "bold").style("font-size", "14px");
    ["Yes", "No"].forEach((status, i) => {
        legend1.append("rect").attr("y", i * 25).attr("width", 15).attr("height", 15).attr("fill", colorScale(status));
        legend1.append("text").attr("x", 25).attr("y", i * 25 + 12).text(status).style("font-size", "14px");
    });

    // Stacked Bar Chart
    const barWidth = width * 0.60;
    const barLeft = donutWidth;
    const gBar = svg.append("g")
        .attr("transform", `translate(${barLeft + margin.left}, ${margin.top})`);
    const innerBarWidth = barWidth - margin.left - margin.right;
    const innerBarHeight = topHeight - margin.top - margin.bottom;

    // maps categorical data to discreate positions
    const xBar = d3.scaleBand().domain(allCgpas).range([0, innerBarWidth]).padding(0.2);
    
    // creates mapping beteen domain and visual range
    const yBar = d3.scaleLinear().range([innerBarHeight, 0]);

    // creates fixed axes groups
    const xAxisGroup = gBar.append("g").attr("transform", `translate(0, ${innerBarHeight})`);
    const yAxisGroup = gBar.append("g");

    // adds title
    svg.append("text")
        .attr("x", barLeft + margin.left + (innerBarWidth / 2))
        .attr("y", margin.top - 20)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-weight", "bold")
        .text("Depression Status by CGPA Range");

    // adds instructional text
    svg.append("text")
        .attr("x", barLeft + margin.left + (innerBarWidth / 2))
        .attr("y", margin.top)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "gray")
        .style("font-style", "italic")
        .text("(Hover over bars to see detailed breakdown)");

    // creates X-axis label
    gBar.append("text")
        .attr("x", innerBarWidth / 2)
        .attr("y", innerBarHeight + 65) 
        .attr("text-anchor", "middle")
        .style("font-weight", "bold")
        .text("CGPA Bracket");

    // creates Y-axis label
    gBar.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerBarHeight / 2)
        .attr("y", -45) 
        .attr("text-anchor", "middle")
        .style("font-weight", "bold")
        .text("Number of Students");

    // adds legend 
    const legend2 = gBar.append("g").attr("transform", `translate(${innerBarWidth + 20}, 0)`);
    legend2.append("text").attr("x", 0).attr("y", -10).text("Depression Status").style("font-weight", "bold").style("font-size", "12px");
    ["Yes", "No"].forEach((status, i) => {
        legend2.append("rect").attr("y", i * 20).attr("width", 12).attr("height", 12).attr("fill", colorScale(status));
        legend2.append("text").attr("x", 20).attr("y", i * 20 + 10).text(status).style("font-size", "12px");
    });

    const barLayerGroup = gBar.append("g");

    // Parallel Coordinates Plot
    const pTop = topHeight + 20;
    const gParallel = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${pTop + margin.top + 25})`);
    const innerPWidth = width - margin.left - margin.right;    
    const innerPHeight = bottomHeight - margin.top - margin.bottom - 25;
    const dimensions = ["gender", "year", "cgpa", "anxiety"];
    const yScales = {};

    dimensions.forEach(dim => {
        const uniqueValues = Array.from(new Set(data.map(d => d[dim]))).sort();

        // maps data to evenly spaced numerical coordinates
        yScales[dim] = d3.scalePoint().domain(uniqueValues).range([innerPHeight, 0]).padding(0.5);
    });
        
    // maps data to evenly spaced numerical coordinates
    const xParallel = d3.scalePoint().range([0, innerPWidth]).padding(0.1).domain(dimensions);

    function path(d) {
        // creates conintuous path of connectd points
        return d3.line()(dimensions.map(p => {
            const jitter = (Math.random() - 0.5) * 30; 
            return [xParallel(p), yScales[p](d[p]) + jitter];
        }));
    }

    // adds title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", pTop + 10)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-weight", "bold")
        .text("Multidimensional Student Profiles");

    // adds instructional text
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", pTop + 30)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "gray")
        .style("font-style", "italic")
        .text("(Click and drag vertically on axes to brush profiles)");

    // adds legend 
    const legend3 = gParallel.append("g").attr("transform", `translate(${innerPWidth + 20}, -15)`);
    legend3.append("text").attr("x", 0).attr("y", -10).text("Depression Status").style("font-weight", "bold").style("font-size", "12px");
    ["Yes", "No"].forEach((status, i) => {
        legend3.append("rect").attr("y", i * 20).attr("width", 12).attr("height", 12).attr("fill", colorScale(status));
        legend3.append("text").attr("x", 20).attr("y", i * 20 + 10).text(status).style("font-size", "12px");
    });

    // updates donut chart
    function updateDonut(currentData) {
        // groups data into a hierarchy
        const depressionCounts = d3.nest()
            .key(d => d.depression)
            .rollup(v => v.length)
            .entries(currentData);
        const paths = gDonut.selectAll("path")
            .data(pie(depressionCounts), d => d.data.key);

        // adds click event for donut slice interaction
        paths.enter()
            .append("path")
            .attr("d", arc)
            .attr("fill", d => colorScale(d.data.key))
            .attr("stroke", "white")
            .style("stroke-width", "2px")
            .style("cursor", "pointer")
            .on("click", function(d) {
                // If already selected, unselect. Otherwise, select clicked status
                selectedDepression = selectedDepression === d.data.key ? null : d.data.key;
                
                // filters dataset on chosen selection
                let newData = selectedDepression ? data.filter(x => x.depression === selectedDepression) : data;
                
                // dims unselected slices
                gDonut.selectAll("path")
                    .style("opacity", p => (selectedDepression === null || p.data.key === selectedDepression) ? 1 : 0.2);

                updateBar(newData);
                updateParallel(newData);
            });

        paths.transition().duration(750).attr("d", arc);
        paths.exit().remove();

        // adds percentages to donut slice
        const totalStudents = d3.sum(depressionCounts, d => d.value);
        const texts = gDonut.selectAll("text.percentage")
            .data(pie(depressionCounts), d => d.data.key);

        texts.enter()
            .append("text")
            .attr("class", "percentage")
            .style("fill", "white")
            .style("font-size", "14px")
            .style("font-weight", "bold")
            .style("pointer-events", "none")
            .merge(texts)
            // animated transition
            .transition().duration(750)
            .attr("transform", d => `translate(${arc.centroid(d)})`)
            .attr("text-anchor", "middle")
            .text(d => `${((d.data.value / totalStudents) * 100).toFixed(1)}%`);
        texts.exit().remove();
    }

    // updates bar Chart with animations
    function updateBar(currentData) {
        // groups data into a hierarchy
        const cgpaGroups = d3.nest()
            .key(d => d.cgpa)
            .rollup(v => {
                const yesCount = v.filter(d => d.depression === "Yes").length;
                const noCount = v.filter(d => d.depression === "No").length;
                return { Yes: yesCount, No: noCount };
            })
            .entries(currentData);
        const stackData = allCgpas.map(cgpa => {
            const group = cgpaGroups.find(g => g.key === cgpa);
            return group ? { cgpa: cgpa, Yes: group.value.Yes, No: group.value.No } : { cgpa: cgpa, Yes: 0, No: 0 };
        });

        // transforms data for stacked bar chart
        const series = d3.stack().keys(["No", "Yes"])(stackData);

        // finds upper limit
        const maxCount = d3.max(stackData, d => d.Yes + d.No);
        yBar.domain([0, maxCount || 1]).nice();
        
        // creates vertical axis
        yAxisGroup.transition().duration(750).call(d3.axisLeft(yBar));

        // creates horizontal axis
        xAxisGroup.call(d3.axisBottom(xBar))
            .selectAll("text")
            .attr("transform", "rotate(-35)")
            .style("text-anchor", "end")
            .attr("dx", "-0.5em")
            .attr("dy", "0.5em")
            .style("font-size", "12px");
        const layers = barLayerGroup.selectAll(".layer")
            .data(series, d => d.key);
        const layersEnter = layers.enter().append("g")
            .attr("class", "layer")
            .attr("fill", d => colorScale(d.key));

        const handleMouseOver = function(d) {
            // adds stroke to outline bar segment
            d3.select(this).style("stroke", "black").style("stroke-width", "3px");
            
            const count = d[1] - d[0]; 
            // gets depression status from parent layer
            const status = d3.select(this.parentNode).datum().key;
            
            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(`<b>CGPA:</b> ${d.data.cgpa}<br/><b>Depression:</b> ${status}<br/><b>Count:</b> ${count}`)
                // returns horizontal coordinate of touch event 
                .style("left", (d3.event.pageX + 15) + "px")
                // returns vertical coordinate of touch event
                .style("top", (d3.event.pageY - 28) + "px");
        };

        const handleMouseMove = function() {
            // keeps tooltip tracking with mouse movement
            tooltip.style("left", (d3.event.pageX + 15) + "px")
                    // returns vertical coordinate of touch event
                   .style("top", (d3.event.pageY - 28) + "px");
        };

        const handleMouseOut = function(d) {
            // removes outline and hide tooltip
            d3.select(this).style("stroke", "none");
            tooltip.transition().duration(500).style("opacity", 0);
        };
        layersEnter.merge(layers)
            .selectAll("rect")
            .data(d => d, d => d.data.cgpa)
            .join(
                enter => enter.append("rect")
                    .attr("x", d => xBar(d.data.cgpa))
                    .attr("y", yBar(0))
                    .attr("width", xBar.bandwidth())
                    .attr("height", 0)
                    .on("mouseover", handleMouseOver)
                    .on("mousemove", handleMouseMove)
                    .on("mouseout", handleMouseOut)
                    .call(enter => enter.transition().duration(750) 
                        .attr("y", d => yBar(d[1]))
                        .attr("height", d => yBar(d[0]) - yBar(d[1]))
                    ),
                update => update
                    .on("mouseover", handleMouseOver)
                    .on("mousemove", handleMouseMove)
                    .on("mouseout", handleMouseOut)
                    .call(update => update.transition().duration(750) 
                        .attr("y", d => yBar(d[1]))
                        .attr("height", d => yBar(d[0]) - yBar(d[1]))
                    ),
                exit => exit.call(exit => exit.transition().duration(750)
                    .attr("y", yBar(0))
                    .attr("height", 0)
                    .remove()
                )
            );
    }

    // updates parallel coordinates plot
    function updateParallel(currentData) {
        const lines = gParallel.selectAll("path.dataLine")
            .data(currentData, (d, i) => i);
        lines.enter()
            .append("path")
            .attr("class", "dataLine")
            .merge(lines)
            .attr("d", path)
            .style("fill", "none")
            .style("stroke", d => colorScale(d.depression))
            .style("opacity", 0.3) 
            .style("stroke-width", "1.5px");
        lines.exit().remove();
    }

    updateDonut(data);
    updateBar(data);
    updateParallel(data);

    // brushing for parallel coordinates
    const axes = gParallel.selectAll(".axis")
        .data(dimensions)
        .enter().append("g")
        .attr("class", "axis")
        .attr("transform", d => `translate(${xParallel(d)}, 0)`)
        // adds vertical axes for parallel coordinates
        .each(function(d) { d3.select(this).call(d3.axisLeft().scale(yScales[d])); });

    // adds text halos
    axes.selectAll(".tick text")
        .style("font-size", "12px")
        .clone(true).lower()
        .style("stroke", "white")
        .style("stroke-width", "4px")
        .style("stroke-linejoin", "round")
        .style("fill", "none");
    axes.append("text")
        .style("text-anchor", "middle")
        .attr("y", -20)
        .text(d => {
            if(d === "cgpa") return "CGPA";
            if(d === "year") return "Year of Study";
            return d.charAt(0).toUpperCase() + d.slice(1);
        })
        .style("fill", "black")
        .style("font-size", "14px")
        .style("font-weight", "bold");
    axes.append("g")
        .attr("class", "brush")
        .each(function(d) {
            
            // adds brushing to each vertical axis
            d3.select(this).call(yScales[d].brush = d3.brushY()
                .extent([[-15, 0], [15, innerPHeight]])
                .on("start brush end", brushEnded)
            );
        });

    // handles brushing events
    function brushEnded() {
        let actives = [];
        svg.selectAll(".brush")
            // determines which axes have active brush selection
            .filter(function(d) { return d3.brushSelection(this); })
            .each(function(d) {
                actives.push({
                    dimension: d,
                    // y0, y1 coordinates of brush
                    extent: d3.brushSelection(this)
                });
            });
        gParallel.selectAll("path.dataLine")
            .style("opacity", function(d) {
                const isActive = actives.every(function(active) {
                    const dim = active.dimension;
                    const yPos = yScales[dim](d[dim]);
                    return active.extent[0] <= yPos && yPos <= active.extent[1];
                });                
                return isActive ? 0.3 : 0.02;
            })
            .style("stroke-width", function(d) {
                const isActive = actives.every(function(active) {
                    const dim = active.dimension;
                    const yPos = yScales[dim](d[dim]);
                    return active.extent[0] <= yPos && yPos <= active.extent[1];
                });
                return isActive ? "1.5px" : "1px";
            });
    }

});
