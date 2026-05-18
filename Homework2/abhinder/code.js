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
    const processedData = filteredData.map(d=>{
                          return {
                              "work_year":d.work_year,
                              "salary_in_usd":d.salary_in_usd,
                              "experience": d.experience,
                              "teamID":d.teamID,
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

    // circles for data points
    const circles = g1.selectAll("circle").data(processedData);

    // color circles by experience, x is year, y is salary
    circles.enter().append("circle")
         .attr("cx", d => x1(d.work_year))      
         .attr("cy", d => y1(d.salary_in_usd)) 
         .attr("r", 5)
         .attr("fill", d => colorScale(d.experience)) 
         .attr("opacity", 0.7);

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

    // draw lines on plot
    g3.selectAll("myPath")
        .data(rawData)
        .enter().append("path")
        .attr("d", path)
        .style("fill", "none")
        .style("stroke", "#89cff0")
        .style("opacity", 0.5)
        .style("stroke-width", 1.5);

    // draw vertical exes
    g3.selectAll("myAxis")
        .data(dimensions).enter()
        .append("g")
        .attr("transform", function(d) { return "translate(" + x(d) + ")"; })
        .each(function(d) { d3.select(this).call(d3.axisLeft().scale(y[d])); })
        .append("text")
        .style("text-anchor", "middle")
        .attr("y", -15)
        .text(function(d) { return d.replace(/_/g, " ").toUpperCase(); }) // Format labels nicely
        .style("fill", "black")
        .style("font-size", "12px")
        .style("font-weight", "bold");
    
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

    // get counts for each experience level
    const pieFilteredData = processedData.filter(d => d.work_year === 2023);
    let expCounts = {};
    pieFilteredData.forEach(d => {
        expCounts[d.experience] = (expCounts[d.experience] || 0) + 1;
    });

    // convert data into array for d3
    let pieData = Object.keys(expCounts).map(key => {
        return { experience: key, count: expCounts[key] };
    });

    // make sure legend is ordered correctly (same as scatter plot)
    const desiredOrder = ["Entry-Level", "Mid-Level", "Senior", "Expert"];
    pieData.sort((a,b) => {
        return desiredOrder.indexOf(a.experience) - desiredOrder.indexOf(b.experience);
    });

    // container for pie chart
    const radius = Math.min(pieWidth, pieHeight) / 2;
    const gPie = svg.append("g")
        .attr("transform", `translate(${pieLeft + pieMargin.left + (pieWidth / 2)}, ${pieTop + pieMargin.top + radius})`);

    // pie and arc generator
    const pie = d3.pie()
        .value(d => d.count)
        .sort(null);
    const arcGenerator = d3.arc()
        .outerRadius(radius)
        .innerRadius(0); 

    // create color scale (same as scatter plot)    
    const pieColor = d3.scaleOrdinal()
        .domain(["Entry-Level", "Mid-Level", "Senior", "Expert"])
        .range(["#C8E6C9", "#81C784", "#388E3C", "#1B5E20"]); 

    // draw slices of pie chart
    const arcs = gPie.selectAll(".arc")
        .data(pie(pieData))
        .enter().append("g")
        .attr("class", "arc");

    arcs.append("path")
        .attr("d", arcGenerator)
        .attr("fill", d => pieColor(d.data.experience))
        .attr("stroke", "white")
        .style("stroke-width", "2px")
        .style("opacity", 0.8);

    // add value labels inside slices
    arcs.append("text")
        .attr("transform", function(d) {
            return `translate(${arcGenerator.centroid(d)})`; 
        })
        .attr("text-anchor", "middle")
        .text(d => d.data.count) 
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .style("fill", "black");

    // add legend
    const pieLegend = gPie.append("g")
        .attr("transform", `translate(${radius + 20}, ${-radius + 20})`); 

    const pieLegendItems = pieLegend.selectAll(".pie-legend-item")
        .data(pieData.map(d => d.experience))
        .enter().append("g")
        .attr("class", "pie-legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 25})`);

    // add little squares for legend
    pieLegendItems.append("rect") 
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", d => pieColor(d))
        .attr("stroke", "white");

    // add category names next to the squares
    pieLegendItems.append("text")
        .attr("x", 25)
        .attr("y", 12)
        .text(d => d)
        .style("font-size", "13px")
        .style("font-family", "sans-serif");

    // add title
    gPie.append("text")
        .attr("y", -radius - 20) 
        .attr("text-anchor", "middle")
        .style("font-size", "22px")
        .style("font-weight", "bold")
        .style("font-family", "sans-serif")
        .text("Distribution of Experience Levels (US Data Science Jobs in 2023)");
    

    }).catch(function(error){
        console.log(error);
    });