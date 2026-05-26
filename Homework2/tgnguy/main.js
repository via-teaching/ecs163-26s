let rawDataGlobal; // Global variable to store raw data for use in redraws

const svg = d3.select("svg");    

// Loads the CSV data and initializes the dashboard
d3.csv("student_mental_health.csv").then(rawData =>{
    console.log("rawData", rawData);

    rawDataGlobal = rawData;
    drawDashboard();

    window.addEventListener("resize", drawDashboard); // Redraws charts on window resize

    }).catch(function(error){
    console.log(error);
});

// Renders the dashboard with all charts based on the raw data
function drawDashboard() {
    const width = window.innerWidth;
    const height = window.innerHeight - 95; // subtract header height

    const svg = d3.select("svg")
        .attr("width", width)
        .attr("height", height);

    // Clear old charts before redrawing
    svg.selectAll("*").remove();

    // Bar Chart
    const barData = processBarData(rawDataGlobal);
    drawBarChart(barData, width, height);

    // Heatmap
    const heatmapData = processHeatmapData(rawDataGlobal);
    drawHeatmap(heatmapData, width, height);

    // Stream Graph
    const streamData = processStreamData(rawDataGlobal);
    drawStreamGraph(streamData, width, height);
}

// Counts the number of "Yes" responses for each mental health category
// Return: array of objects with category and count, sorted in descending order by count
function processBarData(data){
    // Convert dataset to category-value format
    const mentalHealthData = [
        ...data.map(d => ({
            category: "Depression",
            value: d["Do you have Depression?"]
    })),

        ...data.map(d => ({
            category: "Anxiety",
            value: d["Do you have Anxiety?"]
    })),

        ...data.map(d => ({
            category: "Panic Attack",
            value: d["Do you have Panic attack?"]
    })),

        ...data.map(d => ({
            category: "Treatment",
            value: d["Did you seek any specialist for a treatment?"]
    }))
  ];

    const filteredData = mentalHealthData.filter(d => d.value === "Yes"); // Only keep "Yes" responses

    // Group by category and count in descending order
    const grouped = d3.nest()
        .key(d => d.category)
        .rollup(v => v.length)
        .entries(filteredData)
        .map(d => ({
            category: d.key,
            count: d.value
    }))
    .sort((a, b) => d3.descending(a.count, b.count));
  
    return grouped;
}


// Vertical Bar Chart: Overview of Student Mental Health Responses
// X-axis: Mental health categories (Depression, Anxiety, Panic Attack, Treatment)
// Y-axis: Count of "Yes" responses for each category
function drawBarChart(barData, width, height) {
    const margin = { top: 60, right: 120, bottom: 70, left: 100 };
    const barWidth = width * 0.48 - margin.left - margin.right;
    const barHeight = height * 0.45 - margin.top - margin.bottom;

    // Draw background card for bar chart
    svg.append("rect")
        .attr("class", "chart-card")
        .attr("x", 10)
        .attr("y", 10)
        .attr("width", width * 0.48)
        .attr("height", height * 0.48);

    // Create group for bar chart elements
    const g = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);
  
    // Chart title
    g.append("text")
        .attr("x", barWidth / 2)
        .attr("y", -25)
        .attr("text-anchor", "middle")
        .attr("font-size", "20px")
        .attr("font-weight", "bold")
        .text("Overview of Student Mental Health Responses");
   

    // Setup X and Y scales
    const x = d3.scaleBand()
        .domain(barData.map(d => d.category))
        .range([0, barWidth])
        .padding(0.25);

    const y = d3.scaleLinear()
        .domain([0, d3.max(barData, d => d.count)])
        .range([barHeight, 0])

    // Color scale for bars
    const barColor = d3.scaleOrdinal()
        .domain(barData.map(d => d.category))
        .range(["#6baed6", "#74c476", "#fd8d3c", "#9e9ac8"]);    

    // Add x-axis
    g.append("g")
        .attr("transform", `translate(0, ${barHeight})`)
        .call(d3.axisBottom(x));

    // Add y-axis
    g.append("g")
        .call(d3.axisLeft(y));

    // X-axis label
    g.append("text")
        .attr("x", barWidth / 2)
        .attr("y", barHeight + 50)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .text("Mental Health Category");

    // Y-axis label
    g.append("text")
        .attr("x", -barHeight / 2)
        .attr("y", -45)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .text("Number of Students");

    // Draw bars
    g.selectAll("rect")
        .data(barData)
        .enter()
        .append("rect")
        .attr("x", d => x(d.category))
        .attr("y", d => y(d.count))
        .attr("width", x.bandwidth())
        .attr("height", d => barHeight - y(d.count))
        .attr("fill", d => barColor(d.category))

    // Add count labels above bars
    g.selectAll(".bar-label")
        .data(barData)
        .enter()
        .append("text")
        .attr("class", "bar-label")
        .attr("x", d => x(d.category) + x.bandwidth() / 2)
        .attr("y", d => y(d.count) - 8)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .text(d => d.count);

    // Create legend group
    const legend = g.append("g")
        .attr("transform", `translate(${barWidth + 20}, 20)`);

    // Draw legend items
    barData.forEach((d, i) => {
        const row = legend.append("g")
            .attr("transform", `translate(0, ${i * 25})`);

        row.append("rect")
            .attr("width", 14)
            .attr("height", 14)
            .attr("fill", barColor(d.category));

        row.append("text")
            .attr("x", 20)
            .attr("y", 12)
            .attr("font-size", "13px")
            .text(d.category);
    });  
}

// Count the number of "Yes" responses for each mental health condition by year of study
// Return: array of objects with year, condition, and count
function processHeatmapData(data) {
    // Define the conditions and their corresponding columns in the dataset
    const conditions = [
        {
            condition: "Depression",
            column: "Do you have Depression?"
        },
        {
            condition: "Anxiety",
            column: "Do you have Anxiety?"
        },
        {
            condition: "Panic Attack",
            column: "Do you have Panic attack?"
        },
        {
            condition: "Treatment",
            column: "Did you seek any specialist for a treatment?"
        }
    ];

    let heatmapRows = [];

    // Create row for each year and mental health condition
    data.forEach(d => {
        conditions.forEach(c => {
            heatmapRows.push({
                year: d["Your current year of Study"],
                condition: c.condition,
                value: d[c.column]
            })
        })
    });

    // Group by year, condition and count "Yes" responses
    const grouped = d3.nest()
        .key(d => d.year)
        .key(d => d.condition)
        .rollup(v => v.filter(d => d.value === "Yes").length)
        .entries(heatmapRows);

    let finalData = [];

    // Convert nested structure to flat array for heatmap
    grouped.forEach(yearGroup => {
        yearGroup.values.forEach(conditionGroup => {
            finalData.push({
                year: yearGroup.key,
                condition: conditionGroup.key,
                count: conditionGroup.value
            });
        });
    });

    return finalData;
}

// Heatmap: Mental health responses by year of study
// X-axis: Mental health conditions (Depression, Anxiety, Panic Attack, Treatment)
// Y-axis: Year of study 
// Cell color: Count number of "Yes" responses for each condition and year
function drawHeatmap(heatmapData, width, height) {
    const margin = { top: 60, right: 30, bottom: 70, left: 100 };

    const chartWidth = width * 0.45 - margin.left - margin.right;
    const chartHeight = height * 0.45 - margin.top - margin.bottom;

    const xOffset = width * 0.52;
    const yOffset = 60;

    // Legend dimensions
    const legendWidth = 20;
    const legendHeight = 200;

    // Draw background card for heatmap
    svg.append("rect")
        .attr("class", "chart-card")
        .attr("x", width * 0.50)
        .attr("y", 10)
        .attr("width", width * 0.49)
        .attr("height", height * 0.48);

    // Create group for heatmap elements    
    const g = svg.append("g")
        .attr("transform", `translate(${xOffset + margin.left}, ${yOffset + margin.top})`);

    // Get unique years and conditions for scales
    const years = Array.from(new Set(heatmapData.map(d => d.year)));
    const conditions = Array.from(new Set(heatmapData.map(d => d.condition)));

    // Setup X and Y scales
    const x = d3.scaleBand()
        .domain(conditions)
        .range([0, chartWidth])
        .padding(0.05);

    const y = d3.scaleBand()
        .domain(years)
        .range([0, chartHeight])
        .padding(0.05);

    const color = d3.scaleLinear()
        .domain([0, d3.max(heatmapData, d => d.count)])
        .range(["#eef3f8", "#2b6cb0"]);

    // Chart title
    g.append("text")
        .attr("x", chartWidth / 2)
        .attr("y", -25)
        .attr("text-anchor", "middle")
        .attr("font-size", "20px")
        .attr("font-weight", "bold")
        .text("Mental Health Responses by Year of Study");

    // Add x-axis and y-axis
    g.append("g")
        .attr("transform", `translate(0, ${chartHeight})`)
        .call(d3.axisBottom(x));

    g.append("g")
        .call(d3.axisLeft(y));

    // Draws heatmap cells
    g.selectAll("rect")
        .data(heatmapData)
        .enter()
        .append("rect")
        .attr("x", d => x(d.condition))
        .attr("y", d => y(d.year))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("fill", d => color(d.count))
        .attr("stroke", "white")
        .attr("stroke-width", 2);

    // Add count labels in each cell
    g.selectAll(".heatmap-label")
        .data(heatmapData)
        .enter()
        .append("text")
        .attr("class", "heatmap-label")
        .attr("x", d => x(d.condition) + x.bandwidth() / 2)
        .attr("y", d => y(d.year) + y.bandwidth() / 2 + 4)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .text(d => d.count);

    // Create legend group
    const legend = g.append("g")
        .attr("transform", `translate(${chartWidth + 30}, 0)`);
        
    // Create gradient for legend
    const defs = svg.append("defs");

    const linearGradient = defs.append("linearGradient")
        .attr("id", "heatmap-gradient")
        .attr("x1", "0%")
        .attr("y1", "100%")
        .attr("x2", "0%")
        .attr("y2", "0%");

    // Gradient start color
    linearGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#eef3f8");

    // Gradient end color
    linearGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#2b6cb0");

    // Draw gradient rectangle
    legend.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#heatmap-gradient)");

    // Scale for legend axis
    const legendScale = d3.scaleLinear()
        .domain([
            0,
            d3.max(heatmapData, d => d.count)
        ])
        .range([legendHeight, 0]);

    // Legend axis
    legend.append("g")
        .attr("transform", `translate(${legendWidth}, 0)`)
        .call(d3.axisRight(legendScale).ticks(5));

    // Legend title
    legend.append("text")
        .attr("x", -5)
        .attr("y", -10)
        .attr("font-size", "12px")
        .attr("font-weight", "bold")
        .text("Count");    
}

// Counts the number of "Yes" responses for each mental health condition by academic course
function processStreamData(data) {

    // Count number of students in each course descending order
    const courseCounts = d3.nest()
        .key(d => d["What is your course?"])
        .rollup(v => v.length)
        .entries(data)
        .sort((a, b) => d3.descending(a.value, b.value));

    // Keep top 5 courses
    const topCourses = courseCounts
        .slice(0, 5)
        .map(d => d.key);

    // Only keep rows from top courses
    const filteredData = data.filter(d =>
        topCourses.includes(d["What is your course?"])
    );

    // For each top course, count number of "Yes" responses for each mental health condition
    const streamData = topCourses.map(course => {

        const students = filteredData.filter(
            d => d["What is your course?"] === course
        );

        return {
            course: course,

            Depression: students.filter(
                d => d["Do you have Depression?"] === "Yes"
            ).length,

            Anxiety: students.filter(
                d => d["Do you have Anxiety?"] === "Yes"
            ).length,

            "Panic Attack": students.filter(
                d => d["Do you have Panic attack?"] === "Yes"
            ).length,

            Treatment: students.filter(
                d => d["Did you seek any specialist for a treatment?"] === "Yes"
            ).length
        };
    });

    return streamData;
}

// Stream Graph: Mental health trends across academic courses
// X-axis: Academic courses (top 5 by student count)
// Y-axis: Count number of "Yes" responses for each mental health condition
function drawStreamGraph(streamData, width, height) {
    const margin = { top: 70, right: 140, bottom: 70, left: 70 };

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height * 0.42 - margin.top - margin.bottom;

    const xOffset = 0;
    const yOffset = height * 0.52;

    const keys = ["Depression", "Anxiety", "Panic Attack", "Treatment"];

    // Draw background card for stream graph
    svg.append("rect")
        .attr("class", "chart-card")
        .attr("x", 10)
        .attr("y", height * 0.51)
        .attr("width", width - 20)
        .attr("height", height * 0.47);

    // Create group for stream graph elements
    const g = svg.append("g")
        .attr("transform", `translate(${xOffset + margin.left}, ${yOffset + margin.top})`);

    // Create area generator for stream graph layers
    const area = d3.area()
        .x(d => x(d.data.course) + x.bandwidth() / 2)
        .y0(d => y(d[0]))
        .y1(d => y(d[1]))
        .curve(d3.curveBasis);

    // Create stack generator for stream graph layers
    const stack = d3.stack()
        .keys(keys)
        .offset(d3.stackOffsetWiggle);

    const series = stack(streamData); 

    // Setup X and Y scales
    const x = d3.scaleBand()
        .domain(streamData.map(d => d.course))
        .range([0, chartWidth])
        .padding(0.15);

    const y = d3.scaleLinear()
        .domain([
            d3.min(series, layer => d3.min(layer, d => d[0])),
            d3.max(series, layer => d3.max(layer, d => d[1]))
        ])
        .range([chartHeight, 0]);

    const color = d3.scaleOrdinal()
        .domain(keys)
        .range(["#66c2a5", "#fc8d62", "#8da0cb", "#e78ac3"]);
    
    // Chart title
    g.append("text")
        .attr("x", chartWidth / 2)
        .attr("y", -35)
        .attr("text-anchor", "middle")
        .attr("font-size", "20px")
        .attr("font-weight", "bold")
        .text("Mental Health Trends Across Academic Courses");
    
    // Draw stream graph layers
    g.selectAll(".stream-layer")
        .data(series)
        .enter()
        .append("path")
        .attr("class", "stream-layer")
        .attr("d", area)
        .attr("fill", d => color(d.key))
        .attr("opacity", 0.75);
    
    // X-axis label
    g.append("g")
        .attr("transform", `translate(0, ${chartHeight})`)
        .call(d3.axisBottom(x));
    
    // Y-axis label
    g.append("text")
        .attr("x", chartWidth / 2)
        .attr("y", chartHeight + 45)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .text("Academic Course");
    
    // Create legend group
    const legend = g.append("g")
        .attr("transform", `translate(${chartWidth + 25}, 10)`);
    
    // Draw legend items
    keys.forEach((key, i) => {
        const row = legend.append("g")
            .attr("transform", `translate(0, ${i * 25})`);

        row.append("rect")
            .attr("width", 14)
            .attr("height", 14)
            .attr("fill", color(key));

        row.append("text")
            .attr("x", 20)
            .attr("y", 12)
            .attr("font-size", "13px")
            .text(key);
    });
}   