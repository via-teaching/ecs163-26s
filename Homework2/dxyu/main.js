// lays out dimensions
const width = 1200;
const height = 800;
const topHeight = height * 0.45;
const bottomHeight = height * 0.50;
const margin = { top: 60, right: 120, bottom: 80, left: 80 };

// color scale for depression status
const colorScale = d3.scaleOrdinal()
    .domain(["Yes", "No"])
    .range(["#da2629", "#3e81ca"]); 

// applies background color and prevent scrolling
d3.select("body").style("background-color", "#f4f4f9").style("overflow", "hidden");

// sets up viewBox
const svg = d3.select("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

// loads Student Mental Health csv from data folder
d3.csv("./data/Student Mental health.csv").then(rawData => {
    
    // cleans and processes data
    const data = rawData.map(d => ({
        gender: d["Choose your gender"].trim(),
        year: d["Your current year of Study"].toLowerCase().trim(),
        cgpa: d["What is your CGPA?"].trim(),
        depression: d["Do you have Depression?"].trim(),
        anxiety: d["Do you have Anxiety?"].trim()
    })).filter(d => d.cgpa !== "");

    // creates Donut Chart
    const donutWidth = width * 0.35;
    const radius = Math.min(donutWidth, topHeight) / 2 - margin.top;
    
    // groups elements
    const gDonut = svg.append("g")
        .attr("transform", `translate(${donutWidth / 2}, ${(topHeight / 2) + 20})`);

    // groups data by depression status
    const depressionCounts = d3.nest()
        .key(d => d.depression)
        .rollup(v => v.length)
        .entries(data);

    // sets up generators
    const pie = d3.pie().value(d => d.value);
    const arc = d3.arc().innerRadius(radius * 0.5).outerRadius(radius); 

    // creates donut slices
    gDonut.selectAll("path")
        .data(pie(depressionCounts))
        .enter()
        .append("path")
        .attr("d", arc)
        .attr("fill", d => colorScale(d.data.key))
        .attr("stroke", "white")
        .style("stroke-width", "2px");

    // adds percentages inside donut slices
    const totalStudents = d3.sum(depressionCounts, d => d.value);
    gDonut.selectAll("text.percentage")
        .data(pie(depressionCounts))
        .enter()
        .append("text")
        .attr("class", "percentage")
        .attr("transform", d => `translate(${arc.centroid(d)})`)
        .attr("text-anchor", "middle")
        .style("fill", "white")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text(d => `${((d.data.value / totalStudents) * 100).toFixed(1)}%`);

    // adds title
    svg.append("text")
        .attr("x", donutWidth / 2)
        .attr("y", margin.top - 20)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-weight", "bold")
        .text("Students with Depression");

    // adds legend 
    const legend1 = svg.append("g").attr("transform", `translate(${donutWidth - 90}, ${margin.top + 20})`);
    legend1.append("text").attr("x", 0).attr("y", -10).text("Depression Status").style("font-weight", "bold").style("font-size", "14px");
    ["Yes", "No"].forEach((status, i) => {
        legend1.append("rect").attr("y", i * 25).attr("width", 15).attr("height", 15).attr("fill", colorScale(status));
        legend1.append("text").attr("x", 25).attr("y", i * 25 + 12).text(status).style("font-size", "14px");
    });


    // creates stacked bar chart
    const barWidth = width * 0.60;
    const barLeft = donutWidth;
    
    // groups elements
    const gBar = svg.append("g")
        .attr("transform", `translate(${barLeft + margin.left}, ${margin.top})`);
    const innerBarWidth = barWidth - margin.left - margin.right;
    const innerBarHeight = topHeight - margin.top - margin.bottom;

    // groups data by CGPA and then by depression status
    const cgpaGroups = d3.nest()
        .key(d => d.cgpa)
        .key(d => d.depression)
        .rollup(v => v.length)
        .entries(data);

    // formats data into objects for stack
    const stackData = cgpaGroups.map(group => {
        let obj = { cgpa: group.key, Yes: 0, No: 0 };
        group.values.forEach(v => { obj[v.key] = v.value; });
        return obj;
    });

    // sorts CGPA labels in ascending order
    stackData.sort((a, b) => d3.ascending(a.cgpa, b.cgpa));

    // set scales
    const xBar = d3.scaleBand().domain(stackData.map(d => d.cgpa)).range([0, innerBarWidth]).padding(0.2);
    // finds max val
    const maxCount = d3.max(stackData, d => d.Yes + d.No);
    // maps input vals to output vals
    const yBar = d3.scaleLinear().domain([0, maxCount]).range([innerBarHeight, 0]).nice();
    // defines which data categories will be used to gen stacked vis
    const series = d3.stack().keys(["No", "Yes"])(stackData);

    // adds X-Axis with rotated labels
    gBar.append("g")
        .attr("transform", `translate(0, ${innerBarHeight})`)
        // adds horizontal axis
        .call(d3.axisBottom(xBar))
        .selectAll("text")
        .attr("transform", "rotate(-35)")
        .style("text-anchor", "end")
        .attr("dx", "-0.5em")
        .attr("dy", "0.5em")
        .style("font-size", "12px");

    // adds Y-Axis
    gBar.append("g").call(d3.axisLeft(yBar));

    // adds stacked bars
    gBar.append("g")
        .selectAll("g")
        .data(series)
        .enter().append("g")
        .attr("fill", d => colorScale(d.key))
        .selectAll("rect")
        .data(d => d)
        .enter().append("rect")
        .attr("x", d => xBar(d.data.cgpa))
        .attr("y", d => yBar(d[1]))
        .attr("height", d => yBar(d[0]) - yBar(d[1]))
        .attr("width", xBar.bandwidth());

    // adds title
    svg.append("text")
        .attr("x", barLeft + margin.left + (innerBarWidth / 2))
        .attr("y", margin.top - 20)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-weight", "bold")
        .text("Depression Status by CGPA Range");

    // adds axes labels
    gBar.append("text")
        .attr("x", innerBarWidth / 2)
        .attr("y", innerBarHeight + 65) 
        .attr("text-anchor", "middle")
        .style("font-weight", "bold")
        .text("CGPA Bracket");
    gBar.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerBarHeight / 2)
        .attr("y", -45) 
        .attr("text-anchor", "middle")
        .style("font-weight", "bold")
        .text("Number of Students");

    // adds Legend
    const legend2 = gBar.append("g").attr("transform", `translate(${innerBarWidth + 20}, 0)`);
    legend2.append("text").attr("x", 0).attr("y", -10).text("Depression Status").style("font-weight", "bold").style("font-size", "12px");
    ["Yes", "No"].forEach((status, i) => {
        legend2.append("rect").attr("y", i * 20).attr("width", 12).attr("height", 12).attr("fill", colorScale(status));
        legend2.append("text").attr("x", 20).attr("y", i * 20 + 10).text(status).style("font-size", "12px");
    });


    // creates parallel coordinates plot
    const pTop = topHeight + 20;
    
    // group elements
    const gParallel = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${pTop + margin.top})`);

    const innerPWidth = width - margin.left - margin.right;
    const innerPHeight = bottomHeight - margin.top - margin.bottom;

    // defines dimensions
    const dimensions = ["gender", "year", "cgpa", "anxiety"];
    const yScales = {};
    
    // creates ordinal scale for each categorical dimension
    dimensions.forEach(dim => {
        const uniqueValues = Array.from(new Set(data.map(d => d[dim]))).sort();
        // creates point scale
        yScales[dim] = d3.scalePoint().domain(uniqueValues).range([innerPHeight, 0]).padding(0.5);
    });

    // creates X scale to distribute vertical axes evenly
    const xParallel = d3.scalePoint().range([0, innerPWidth]).padding(0.1).domain(dimensions);

    // path generator to prevent overlap of lines
    function path(d) {
        return d3.line()(dimensions.map(p => {
            const jitter = (Math.random() - 0.5) * 30; 
            return [xParallel(p), yScales[p](d[p]) + jitter];
        }));
    }

    // adds individual student lines
    gParallel.selectAll("path.dataLine")
        .data(data)
        .enter().append("path")
        .attr("class", "dataLine")
        .attr("d", path)
        .style("fill", "none")
        .style("stroke", d => colorScale(d.depression))
        .style("opacity", 0.3) 
        .style("stroke-width", "1.5px");

    // adds vertical axes
    const axes = gParallel.selectAll(".axis")
        .data(dimensions)
        .enter().append("g")
        .attr("class", "axis")
        .attr("transform", d => `translate(${xParallel(d)}, 0)`)
        .each(function(d) { 
            // grabs element
            d3.select(this).call(d3.axisLeft().scale(yScales[d]));
        });

    // adds text halo for better text readability
    axes.selectAll(".tick text")
        .style("font-size", "12px")
        .clone(true).lower()
        .style("stroke", "white")
        .style("stroke-width", "4px")
        .style("stroke-linejoin", "round")
        .style("fill", "none");

    // adds axis titles
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

    // adds title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", pTop + 15)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-weight", "bold")
        .text("Multidimensional Student Profiles");

    // adds legend
    const legend3 = gParallel.append("g").attr("transform", `translate(${innerPWidth + 20}, -15)`);
    legend3.append("text").attr("x", 0).attr("y", -10).text("Depression Status").style("font-weight", "bold").style("font-size", "12px");
    ["Yes", "No"].forEach((status, i) => {
        legend3.append("rect").attr("y", i * 20).attr("width", 12).attr("height", 12).attr("fill", colorScale(status));
        legend3.append("text").attr("x", 20).attr("y", i * 20 + 10).text(status).style("font-size", "12px");
    });

});
