const width = window.innerWidth;
const height = window.innerHeight;
let halfWidth = (width / 2) - 50;

let scatterLeft = 0, scatterTop = 0;
let scatterMargin = {top: 50, right: 30, bottom: 50, left: 100},
    scatterWidth = halfWidth - scatterMargin.left - scatterMargin.right,
    scatterHeight = 350 - scatterMargin.top - scatterMargin.bottom;

let distrLeft = 400, distrTop = 0;
let distrMargin = {top: 10, right: 30, bottom: 30, left: 60},
    distrWidth = 400 - distrMargin.left - distrMargin.right,
    distrHeight = 350 - distrMargin.top - distrMargin.bottom;

let pieLeft = halfWidth + 50, pieTop = 0;
let pieMargin = {top: 50, right: 30, bottom: 50, left: 30},
    pieWidth = halfWidth - pieMargin.left - pieMargin.right,
    pieHeight = 350 - pieMargin.top - pieMargin.bottom;

let teamLeft = 0, teamTop = 500;
let teamMargin = {top: 50, right: 30, bottom: 50, left: 80},
    teamWidth = width - teamMargin.left - teamMargin.right,
    teamHeight = height-450 - teamMargin.top - teamMargin.bottom;

// plots

// clean data, edit some variables
d3.csv("ds_salaries.csv").then(rawData =>{
    console.log("rawData", rawData);

    rawData.forEach(function(d){
        d.AB = Number(d.AB);
        d.H = Number(d.H);
        d.salary = Number(d.salary);
        d.SO = Number(d.SO);
        d.salary_in_usd = Number(d.salary_in_usd);
        d.work_year = Number(d.work_year);

        let job_cat;
        if (d.job_title === "Data Scientist") {
            job_cat = "Data Scientist";
        } else if (d.job_title === "Data Engineer") {
            job_cat = "Data Engineer";
        } else {
            job_cat = "Other";
        }
        d.job_category = job_cat;

        let employee_region;
        if (d.employee_residence === "US") {
                employee_region = "United States";
        } else if (d.employee_residence === "GB") {
                employee_region = "Great Britain";
        } else {
            employee_region = "Other";
        }
        d.employee_region = employee_region;

        let ex_level;
        if (d.experience_level === "EN") {
                ex_level = "Entry-Level";
        } else if (d.experience_level === "MI") {
                ex_level = "Mid-Level";
        } else if (d.experience_level === "SE") {
                ex_level = "Senior";
        } else {
                ex_level = "Expert";
        }
        d.experience = ex_level;

        let role_type;
        if (d.employment_type === "CT") {
                role_type = "Contract";
        } else if (d.employment_type === "FT") {
                role_type = "Full Time";
        } else if (d.employment_type === "FL") {
                role_type = "Freelance";
        } else {
                role_type = "Part Time";
        }
        d.role_type = role_type;

        let salary;
        if (d.salary_in_usd <= 100000) {
                salary = "$0-100k";
        } else if (d.salary_in_usd <= 200000) {
                salary = "$100-200k";
        } else if (d.salary_in_usd <= 300000) {
                salary = "$200-300k";
        } else if (d.salary_in_usd <= 400000) {
                salary = "$300-400k";
        } else {
                salary = "$400-500k";
        }
        d.salary = salary;
    });


    const filteredData = rawData.filter(d=>d.employee_region === "United States");
    const processedData = filteredData.map((d, i) => {
        return {
            "id": i, 
            "work_year": d.work_year,
            "salary_in_usd": d.salary_in_usd,
            "experience": d.experience
        };
    });
    console.log("processedData", processedData);

    // plot 1: Scatter Plot (salary over time in US by experience)
    const svg = d3.select("svg");

    // set up color scale by experience level
    const colorScale = d3.scaleOrdinal()
        .domain(["Entry-Level", "Mid-Level", "Senior", "Expert"])
        .range(["#C8E6C9", "#81C784", "#388E3C", "#1B5E20"]); 

    const g1 = svg.append("g")
                .attr("width", scatterWidth + scatterMargin.left + scatterMargin.right)
                .attr("height", scatterHeight + scatterMargin.top + scatterMargin.bottom)
                .attr("transform", `translate(${scatterMargin.left}, ${scatterMargin.top})`);

    // x axis label
    g1.append("text")
    .attr("x", scatterWidth / 2)
    .attr("y", scatterHeight + 50)
    .attr("font-size", "15px")
    .attr("text-anchor", "middle")
    .text("Work Year");

    // y axis label
    g1.append("text")
    .attr("x", -(scatterHeight / 2))
    .attr("y", -60)
    .attr("font-size", "15px")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("Salary (USD)");

    // x axis ticks (years)
    const x1 = d3.scaleLinear()
    .domain([d3.min(processedData, d => d.work_year) - 0.5, d3.max(processedData, d => d.work_year) + 0.5])
    .range([0, scatterWidth]);

    const uniqueYears = [...new Set(processedData.map(d => d.work_year))];
    const xAxisCall = d3.axisBottom(x1)
                        .tickValues(uniqueYears) 
                        .tickFormat(d3.format("d")); 
    
    g1.append("g")
    .attr("transform", `translate(0, ${scatterHeight})`)
    .call(xAxisCall)
    .selectAll("text")
        .attr("y", "10")
        .attr("x", "-5")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-40)");

    // y axis ticks (salary)
    const y1 = d3.scaleLinear()
    .domain([0, d3.max(processedData, d => d.salary_in_usd)])
    .range([scatterHeight, 0])
    .nice(); 

    const yAxisCall = d3.axisLeft(y1)
                        .ticks(10); 
    g1.append("g").call(yAxisCall);

    // INTERACTION TECHNIQUE 1: SELECTION
    // Keep track of which IDs are selected
    let selectedIDs = new Set();

    // invisible background rectangle
    g1.append("rect")
        .attr("width", scatterWidth)
        .attr("height", scatterHeight)
        .attr("fill", "transparent")
        .on("click", function() {
            selectedIDs.clear();
            updateScatterVisuals();
        });

    // circles for data points
    const circles = g1.selectAll("circle").data(processedData);

    // draw circles and add the click event
    circles.enter().append("circle")
        .attr("cx", d => x1(d.work_year))      
        .attr("cy", d => y1(d.salary_in_usd)) 
        .attr("r", 5)
        .attr("fill", d => colorScale(d.experience)) 
        .attr("class", "scatter-point")
        .style("opacity", 0.7)
        .style("cursor", "pointer")
        .on("click", function(event, d) {
            
            let e, currentData;
            if (event && event.shiftKey !== undefined) {
                e = event;
                currentData = d; 
            } else {
                e = d3.event;
                currentData = event; 
            }

            if (e && e.stopPropagation) e.stopPropagation();

            if (!e.shiftKey) {
                selectedIDs.clear();
                selectedIDs.add(currentData.id);
            } else {
                if (selectedIDs.has(currentData.id)) {
                    selectedIDs.delete(currentData.id); 
                } else {
                    selectedIDs.add(currentData.id); 
                }
            }

            updateScatterVisuals();
        });

    // function to update the visuals
    function updateScatterVisuals() {
        g1.selectAll(".scatter-point")
            .style("opacity", function(circleData) {
                if (selectedIDs.size === 0) return 0.7; 
                return selectedIDs.has(circleData.id) ? 1 : 0.1; 
            })
            .attr("r", function(circleData) {
                return selectedIDs.has(circleData.id) ? 8 : 5;
            })
            .style("stroke", function(circleData) {
                return selectedIDs.has(circleData.id) ? "black" : "none"; 
            })
            .style("stroke-width", "2px")
            .style("outline", "none") 
            .each(function(circleData) {
                if (selectedIDs.has(circleData.id)) {
                    d3.select(this).raise(); 
                }
            });
    }

    // add legend    
    const legendData = colorScale.domain();
    const legend = g1.append("g")
        .attr("transform", `translate(${scatterWidth - 40}, 20)`); 
    const legendItems = legend.selectAll(".legend-item")
        .data(legendData)
        .enter().append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 20})`); 

    // add circles for each legend item
    legendItems.append("circle")
        .attr("r", 5)
        .attr("fill", d => colorScale(d))
        .attr("opacity", 0.7); 

    // label each circle in legend with experience level
    legendItems.append("text")
        .attr("x", 12) 
        .attr("y", 1)  
        .text(d => d)
        .style("font-size", "12px")
        .style("font-family", "sans-serif")
        .attr("alignment-baseline", "middle");

    // title for scatter plot
    g1.append("text")
        .attr("x", scatterWidth / 2) 
        .attr("y", -20)          
        .attr("text-anchor", "middle")
        .style("font-size", "22px")
        .style("font-weight", "bold")
        .style("font-family", "sans-serif")
        .text("US Salary Trends over Time by Experience");


    // plot 2: Parallel Coordinates Plot (general overview of dataset)

    // container for plot
    const g3 = svg.append("g")
                .attr("width", teamWidth + teamMargin.left + teamMargin.right)
                .attr("height", teamHeight + teamMargin.top + teamMargin.bottom)
                .attr("transform", `translate(${teamMargin.left}, ${teamTop})`);

    // variables to be included in plot
    const dimensions = [
        "experience", 
        "role_type", 
        "job_category", 
        "employee_region", 
        "salary"
    ];

    // y scale for each variable
    const y = {};
    for (let i in dimensions) {
        let name = dimensions[i];
        
        if (name === "salary_in_usd") {
            y[name] = d3.scaleLinear()
                .domain(d3.extent(rawData, d => Number(d[name])))
                .range([teamHeight, 0]);
        } 
        else {
            y[name] = d3.scalePoint()
                .domain([...new Set(rawData.map(d => d[name]))]) 
                .range([teamHeight, 0])
                .padding(1);
        }
    }

    // x scale
    const x = d3.scalePoint()
        .range([0, teamWidth])
        .padding(1)
        .domain(dimensions);

    // function for drawing lines on plot
    function path(d) {
        return d3.line()(dimensions.map(function(p) { 
            return [x(p), y[p](d[p])]; 
        }));
    }

    // INTERACTION TECHNIQUE 2: BRUSHING
    // keep track of active brush selections for each axis
    const activeBrushes = new Map();

    // draw lines on plot
    g3.selectAll("myPath")
        .data(rawData)
        .enter().append("path")
        .attr("class", "parallel-line")
        .attr("d", path)
        .style("fill", "none")
        .style("stroke", "#89cff0")
        .style("opacity", 0.5)
        .style("stroke-width", 1.5);

    // draw vertical axes and attach vertical brushes
    g3.selectAll("myAxis")
        .data(dimensions).enter()
        .append("g")
        .attr("transform", function(d) { return "translate(" + x(d) + ")"; })
        .each(function(d) { 
            d3.select(this).call(d3.axisLeft().scale(y[d])); 

            d3.select(this).append("g")
                .attr("class", "brush")
                .call(d3.brushY()
                    .extent([[-15, 0], [15, teamHeight]]) 
                    .on("start brush end", function(event, dimensionData) {
                        
                        const e = event.selection !== undefined ? event : d3.event;
                        const currentDim = dimensionData || event; 

                        if (e.selection) {
                            activeBrushes.set(currentDim, e.selection);
                        } else {
                            activeBrushes.delete(currentDim);
                        }

                        updateParallelLines();
                    })
                );
        })

        // add axis labels
        .append("text")
        .style("text-anchor", "middle")
        .attr("y", -15)
        .text(function(d) { return d.replace(/_/g, " ").toUpperCase(); })
        .style("fill", "black")
        .style("font-size", "12px")
        .style("font-weight", "bold");

    // function to filter lines based on active brushes
    function updateParallelLines() {
        g3.selectAll(".parallel-line")
            .style("opacity", function(dataPoint) {
                let isSelected = true;

                activeBrushes.forEach(function(range, dimension) {
                    const yPos = y[dimension](dataPoint[dimension]);

                    if (yPos < range[0] || yPos > range[1]) {
                        isSelected = false;
                    }
                });

                return isSelected ? 0.5 : 0.02; 
            })
            .style("stroke", function(dataPoint) {
                let isSelected = true;
                activeBrushes.forEach(function(range, dimension) {
                    const yPos = y[dimension](dataPoint[dimension]);
                    if (yPos < range[0] || yPos > range[1]) isSelected = false;
                });
                
                return isSelected ? "#89cff0" : "#e0e0e0"; 
            });
    }
    
    // add title of plot
    g3.append("text")
        .attr("x", teamWidth / 2) 
        .attr("y", -35)       
        .attr("text-anchor", "middle")
        .style("font-size", "22px")
        .style("font-weight", "bold")
        .style("font-family", "sans-serif")
        .text("Data Science Salaries");


    // plot 3: Pie Chart (distribution of US job experience level in 2023)
    // ANIMATION: TIMESTEP

    // Get sorted unique years
    const allYears = [...new Set(processedData.map(d => d.work_year))].sort();
    let currentYearIndex = 0;
    let animationInterval = null;

    // function that computes pie data for each year
    function getPieDataForYear(year) {
        const filtered = processedData.filter(d => d.work_year === year);
        let expCounts = {};
        filtered.forEach(d => {
            expCounts[d.experience] = (expCounts[d.experience] || 0) + 1;
        });
        const desiredOrder = ["Entry-Level", "Mid-Level", "Senior", "Expert"];
        return desiredOrder
            .filter(level => expCounts[level] !== undefined)
            .map(key => ({ experience: key, count: expCounts[key] }));
    }

    // set up pie/arc generators
    const radius = Math.min(pieWidth, pieHeight) / 2;
    const gPie = svg.append("g")
        .attr("transform", `translate(${pieLeft + pieMargin.left + (pieWidth / 2)}, ${pieTop + pieMargin.top + radius})`);

    const pie = d3.pie().value(d => d.count).sort(null);
    const arcGenerator = d3.arc().outerRadius(radius).innerRadius(0);

    const pieColor = d3.scaleOrdinal()
        .domain(["Entry-Level", "Mid-Level", "Senior", "Expert"])
        .range(["#C8E6C9", "#81C784", "#388E3C", "#1B5E20"]);

    // title
    gPie.append("text")
        .attr("class", "pie-title")
        .attr("y", -radius - 20)
        .attr("text-anchor", "middle")
        .style("font-size", "22px")
        .style("font-weight", "bold")
        .style("font-family", "sans-serif")
        .text("Distribution of Experience Levels (US Data Science Jobs)");

    // year label inside chart
    const yearLabel = gPie.append("text")
        .attr("class", "pie-year-label")
        .attr("y", radius + 35)
        .attr("text-anchor", "middle")
        .style("font-size", "20px")
        .style("font-weight", "bold")
        .style("font-family", "sans-serif");

    // add legend
    const pieLegend = gPie.append("g")
        .attr("transform", `translate(${radius + 20}, ${-radius + 20})`);

    const desiredOrder = ["Entry-Level", "Mid-Level", "Senior", "Expert"];
    const pieLegendItems = pieLegend.selectAll(".pie-legend-item")
        .data(desiredOrder)
        .enter().append("g")
        .attr("class", "pie-legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 25})`);

    pieLegendItems.append("rect")
        .attr("width", 15).attr("height", 15)
        .attr("fill", d => pieColor(d))
        .attr("stroke", "white");

    pieLegendItems.append("text")
        .attr("x", 25).attr("y", 12)
        .text(d => d)
        .style("font-size", "13px")
        .style("font-family", "sans-serif");

    // update function with smooth transitions
    function updatePie(year) {
        const pieData = getPieDataForYear(year);
        const pieArcs = pie(pieData);

        yearLabel.text(year);

        const paths = gPie.selectAll(".arc-path").data(pieArcs, d => d.data.experience);

        paths.enter().append("path")
            .attr("class", "arc-path")
            .attr("fill", d => pieColor(d.data.experience))
            .attr("stroke", "white")
            .style("stroke-width", "2px")
            .style("opacity", 0.8)
            .attr("d", arcGenerator)
        .merge(paths)
            .transition().duration(600)
            .attrTween("d", function(d) {
                const prev = this._prev || { startAngle: d.startAngle, endAngle: d.startAngle };
                const interpolate = d3.interpolate(prev, d);
                this._prev = d;
                return t => arcGenerator(interpolate(t));
            });

        paths.exit().transition().duration(600)
            .attrTween("d", function(d) {
                const interpolate = d3.interpolate(d, { startAngle: d.endAngle, endAngle: d.endAngle });
                return t => arcGenerator(interpolate(t));
            })
            .remove();

        // labels
        const labels = gPie.selectAll(".arc-label").data(pieArcs, d => d.data.experience);

        labels.enter().append("text")
            .attr("class", "arc-label")
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .style("font-weight", "bold")
            .style("fill", "black")
        .merge(labels)
            .transition().duration(600)
            .attr("transform", d => `translate(${arcGenerator.centroid(d)})`)
            .text(d => d.data.count);

        labels.exit().remove();
    }

    // play/pause controls
    const playBtn = document.getElementById("playBtn");
    playBtn.addEventListener("click", function() {
        if (animationInterval) {
            clearInterval(animationInterval);
            animationInterval = null;
            playBtn.textContent = "▶ Play";
        } else {
            playBtn.textContent = "⏸ Pause";
            animationInterval = setInterval(() => {
                currentYearIndex = (currentYearIndex + 1) % allYears.length;
                updatePie(allYears[currentYearIndex]);

                if (currentYearIndex === allYears.length - 1) {
                    clearInterval(animationInterval);
                    animationInterval = null;
                    playBtn.textContent = "▶ Play";
                    currentYearIndex = 0;
                }
            }, 2000); 
        }
    });

    // initialize with first year
    updatePie(allYears[0]);

    }).catch(function(error){
        console.log(error);
    });