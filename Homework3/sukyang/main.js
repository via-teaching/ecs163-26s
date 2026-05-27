let abFilter = 25;
// Set the width and height by window size
const width = window.innerWidth;
const height = window.innerHeight;
const sankeyformat = d3.format(",.0f");

// Set the sankey dimensions and margins.
let sankeyLeft = 0, sankeyTop = 0;
let sankeyMargin = {top: 40, right: 30, bottom: 80, left: 60},
    sankeyWidth = 1300 - sankeyMargin.left - sankeyMargin.right,
    sankeyHeight = 400 - sankeyMargin.top - sankeyMargin.bottom;

// Set the bar chart dimensions and margins.
let barLeft = 0, barTop = 700;
let barMargin = {top: 180, right: 250, bottom: 0, left: 50},
    barWidth = 1200 - barMargin.left - barMargin.right,
    barHeight = 700 - barMargin.top - barMargin.bottom;

// Set the line graph dimensions and margins.
let lineLeft = 0, lineTop = 700;
let lineMargin = {top: 10, right: 230, bottom: 30, left: 150},
    lineWidth = 950 - lineMargin.left - lineMargin.right,
    lineHeight = 380 - lineMargin.top - lineMargin.bottom;

// Plot
// import the dataset 
d3.csv("ds_salaries.csv").then(rawData =>{
    console.log("rawData", rawData);
    
    rawData.forEach(function(d){
        d.work_year = Number(d.work_year);
        d.salary = Number(d.salary);
        d.salary_in_usd = Number(d.salary_in_usd);
        d.remote_ratio = Number(d.remote_ratio);
    });

    // Select the five common job titles to ensure meaningful comparisons.
    const selectedJobs = [
        "Data Engineer",
        "Data Scientist",
        "Data Analyst",
        "Machine Learning Engineer",
        "Analytics Engineer"
    ];

    // Create processedaData that contains selectedJobs above.
    const filteredData = rawData.filter(d =>
        d.salary_in_usd > 0 &&
        selectedJobs.includes(d.job_title)
    );
    // ProcessData set for making visualizations
    const processedData = filteredData.map(d => {
        return{
            job_title: d.job_title,
            experience_level: d.experience_level,
            salary: d.salary_in_usd,
            work_year: d.work_year,
            remote_ratio: d.remote_ratio,
            company_size: d.company_size
        };
    });
    console.log("processedData", processedData);

    // Plot 1: Sankey chart
    // Make a salary category (< 100k, 100-200k, 200-300k, 300k+)
    // from work year to job title and salary range
    // create salary categories (4) for the Sankey chart
    processedData.forEach(d => {
        if (d.salary < 100000){
            d.salary_category = "<100k";
        }
        else if (d.salary < 200000) {
            d.salary_category = "100-200k";
        }
        else if (d.salary < 300000) {
            d.salary_category = "200-300k";
        }
        else {
            d.salary_category = "300k+";
        }
    });

    // Step 1. link1: work_year -> job_title
    // each row contributes one flow connection
    const link1 = processedData.map(d => ({
        source: String(d.work_year),
        target: d.job_title,
        value: 1
    }));

    // Step 2. link2: job_title -> salary_category
    // this shows how salaries are distributed across job titles
    const link2 = processedData.map(d => ({
        source: d.job_title,
        target: d.salary_category,
        value: 1
    }))
    const rawLinks = [...link1, ...link2];

    // Links the flows (from sources to targets)
    const links = Array.from(
        d3.rollup(
            rawLinks,
            v => d3.sum(v, d => d.value),
            d => d.source,
            d => d.target
        ),
        ([source, targets]) => Array.from(targets, ([target, value]) => ({
            source, target, value
        }))
    ).flat();

    // create unique sankey nodes from all sources and targets 
    const nodes = Array.from(
        new Set(links.flatMap(d => [d.source, d.target])),
        name => ({ name })
    );

    const sankeyData = { nodes, links };
    console.log("sankeyData", sankeyData);

    // Create the SVG and g1 container.
    const svg = d3.select("svg")
    .attr("width", width)
    .attr("height", height);

    // "Start Animation" button
    // show the flow animation 
    d3.select("body")
    .append("button")
    .attr("id", "startButton")
    .style("position", "absolute")
    .style("top", "20px")
    .style("right", "20px")
    .style("padding", "10px 16px")
    .style("font-size", "14px")
    .style("cursor", "pointer")
    .text("Start Animation");

    // "Reset Selection" button
    // restore all charts to the default appearance after interactions
    d3.select("body")
    .append("button")
    .attr("id", "resetButton")
    .style("position", "absolute")
    .style("top", "65px")
    .style("right", "20px")
    .style("padding", "10px 16px")
    .style("font-size", "14px")
    .style("cursor", "pointer")
    .text("Reset Selection");

    // tooltip used for Sankey chart
    const tooltip = d3.select("body")
    .append("div")
    .style("position", "absolute")
    .style("background", "white")
    .style("border", "1px solid #999")
    .style("border-radius", "4px")
    .style("padding", "6px")
    .style("font-size", "12px")
    .style("pointer-events", "none")
    .style("opacity", 0);

    // container of the sankey chart
    const g1 = svg.append("g")
                .attr("width", sankeyWidth + sankeyMargin.left + sankeyMargin.right)
                .attr("height", sankeyHeight + sankeyMargin.top + sankeyMargin.bottom)
                .attr("transform", `translate(${sankeyMargin.left + 85}, ${sankeyMargin.top})`);
    
    // Constructs and congfiguers a Sankey generator.
    const sankey = d3.sankey()
    .nodeId(d => d.name)
    .nodeAlign(d3.sankeyLeft)
    .nodeWidth(15)
    .nodePadding(10)
    .extent([[1, 5], [sankeyWidth - 1, sankeyHeight - 5]]);

    // Applies it to the data. We make a copy of the nodes and links objects 
    // so as to avoid mutating the original.
    const sankeyGraph = sankey({
        nodes: sankeyData.nodes.map(d => ({ ...d })),
        links: sankeyData.links.map(d => ({ ...d }))
    });

    // Defines a color scale
    const sankeycolor = d3.scaleOrdinal(d3.schemeCategory10);

    // Creates the rects that represents the nodes.
    const rect = g1.append("g")
        .attr("stroke", "#000")
    .selectAll()
    .data(sankeyGraph.nodes)
    .join("rect")
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("height", d => d.y1 - d.y0)
        .attr("width", d => d.x1 - d.x0)
        .attr("fill", d => sankeycolor(d.name));

    // Adds a title on the nodes.
    rect.append("title")
    .text(d => `${d.name}\n${sankeyformat(d.value)}`)

    // Interaction: Selection
    // Clicking a Sankey node highlight related flows
    // while fading unrelated nodes and links
    // also updates the focus views (grouped bar chart and line graph)
    rect
    .style("cursor", "pointer")
    .on("click", function(event, d) {

        rect
            .transition() // transition 
            .duration(300) // set a duration
            .style("opacity", n => {
                const connected = sankeyGraph.links.some(l =>
                    (l.source.name === d.name && l.target.name === n.name) ||
                    (l.target.name === d.name && l.source.name === n.name)
                );

                return n.name === d.name || connected ? 1 : 0.2;
            });

        linkPath
            .transition()
            .duration(300)
            .style("opacity", l =>
                l.source.name === d.name || l.target.name === d.name ? 1 : 0.08
            );

    // Focus + context:
    // The sankey chart acts as the overview
    // selecting a job title updates the line chart and grouped bar chart 
    if (selectedJobs.includes(d.name)) {

        // Line chart highlight
        path3
        .transition()
        .duration(300)
        .style("opacity", ([job_title]) =>
            job_title === d.name ? 1 : 0.15
        )
        .style("stroke-width", ([job_title]) =>
            job_title === d.name ? 5 : 2
        );

        // Bar chart highlight
        g2.selectAll(".bar")
        .transition()
        .duration(300)
        .style("opacity", b =>
            b.job_title === d.name ? 1 : 0.15
        );
    }
    });

    // double click the Sankey chart region to reset selections 
    g1.on("dblclick", function() {
    rect
        .transition()
        .duration(300)
        .style("opacity", 1);

    linkPath
        .transition()
        .duration(300)
        .style("opacity", 1);
    });
    function resetSankey() { // reset sankey chart
        rect
        .transition()
        .duration(300)
        .style("opacity", 1);

        linkPath // reset all links
        .transition()
        .duration(300)
        .style("opacity", 1);

        selectedNode = null;

        path3
        .transition()
        .duration(300)
        .style("opacity", 1)
        .style("stroke-width", 3);

        g2.selectAll(".bar")
        .transition()
        .duration(300)
        .style("opacity", 1)
        .style("stroke", "none");
    }

    // reset button 
    d3.select("#resetButton")
    .on("click", function() {
        resetSankey();
    });

    // interaction - hover 
    // based on the mouse move 
    rect
    .on("mouseover", function(event, d) {
    tooltip
        .style("opacity", 1)
        .html(`
            <strong>${d.name}</strong><br>
            Count: ${sankeyformat(d.value)}
        `);
    })
    .on("mousemove", function(event) {
        tooltip
        .style("left", (event.pageX + 12) + "px")
        .style("top", (event.pageY - 20) + "px")
    })
    .on("mouseout", function() {
    tooltip.style("opacity", 0);
    });

    // Creates the paths that represent the links.
    const link = g1.append("g")
        .attr("fill", "none")
        .attr("stroke-opacity", 0.5)
    .selectAll()
    .data(sankeyGraph.links)
    .join("g")
        .style("mix-blend-mode", "multiply");

    // Draw lines for link paths
    const linkPath = link.append("path")
    .attr("d", d3.sankeyLinkHorizontal())
    .attr("stroke", d => sankeycolor(d.source.name))
    .attr("stroke-width", d => Math.max(1, d.width))
    .attr("stroke-opacity", 0.5);

    linkPath
    .attr("stroke-dasharray", function() {
        return this.getTotalLength();
    })
    .attr("stroke-dashoffset", function() {
        return this.getTotalLength();
    })
    .on("mouseover", function(event, d) {
    tooltip // create the tooltip for representing each count
        .style("opacity", 1)
        .html(`
            <strong>${d.source.name} → ${d.target.name}</strong><br>
            Count: ${sankeyformat(d.value)}
        `);
    })
    .on("mousemove", function(event) {
    tooltip
        .style("left", (event.pageX + 12) + "px")
        .style("top", (event.pageY - 20) + "px");
    })
    .on("mouseout", function() {
        tooltip.style("opacity", 0);
    });

    // transition and animation
    // Animate the Sankey flows from left to right
    // 1. year -> Job title 
    // 2. Job title -> Salary range
    d3.select("#startButton")
    .on("click", function() {

        linkPath
            .attr("stroke-dashoffset", function() {
                return this.getTotalLength();
            });

        linkPath
            .transition()
            .delay(d => {

                // 1. Year -> Job Title 
                if (!isNaN(Number(d.source.name))) {
                    return 0;
                }

                // 2. Job Title -> Salary Range 
                return 3000;
            })
            .duration(2500)
            .ease(d3.easeLinear)
            .attr("stroke-dashoffset", 0);
    });

    linkPath
    .attr("stroke-dasharray", function() {
        return this.getTotalLength();
    })
    .attr("stroke-dashoffset", function() {
        return this.getTotalLength();
    })
    .transition()
    .delay(d => {
        // left side: Year → Job Title first
        if (!isNaN(Number(d.source.name))) {
            return 0;
        }

        // right side: Job Title → Salary Range later
        return 3000;
    })
    .duration(2500)
    .ease(d3.easeCubicInOut)
    .attr("stroke-dashoffset", 0);
    
    // Adds labels on the nodes.
    g1.append("g")
    .style("font", "12px sans-serif")
    .selectAll("text")
    .data(sankeyGraph.nodes)
    .join("text")
        .attr("x", d => d.x0 < sankeyWidth / 2 ? d.x1 + 6 : d.x0 - 6)
        .attr("y", d => (d.y1 + d.y0) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", d => d.x0 < sankeyWidth / 2 ? "start" : "end")
        .text(d => d.name);

    // Add a Title
    g1.append("text")
    .attr("x", sankeyWidth / 2)
    .attr("y", -25)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .text("Salary Flow by Year, Job Title, and Salary Range");

    // Add a Year label
    g1.append("text")
    .attr("x", 0)
    .attr("y", -6)
    .style("font-size", "12px")
    .style("font-weight", "bold")
    .text("Year");

    // Add a Job Title lable
    g1.append("text")
    .attr("x", sankeyWidth / 2)
    .attr("y", -6)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .style("font-weight", "bold")
    .text("Job Title"); 

    // Add a Salary Range 
    g1.append("text")
    .attr("x", sankeyWidth)
    .attr("y", -6)
    .attr("text-anchor", "end")
    .style("font-size", "12px")
    .style("font-weight", "bold")
    .text("Salary Range");
    
        
    // Plot 2: Grouped bar chart
    // Compute the average salary data by job_title and experience levels
    const avgSalaryData = d3.rollups(
        processedData,
        v => d3.mean(v, d => d.salary),
        d => d.job_title,
        d => d.experience_level
    ).flatMap(([job_title, levels]) => // grouped by job title and experience level
        levels.map(([experience_level, avg_salary]) =>{
            return {
                job_title: job_title,
                experience_level: experience_level,
                avg_salary: avg_salary
            };
        })
    );
    console.log("avgSalaryData", avgSalaryData);

    // Prepare the scales for positional and color encodings.
    // encodes the job_title
    const fx = d3.scaleBand()
    .domain([...new Set(avgSalaryData.map(d => d.job_title))])
    .rangeRound([barMargin.left, barWidth - barMargin.right])
    .paddingInner(0.1);

    // Both x and color encode the experience_level class.
    // Order the experience_level
    // Level: Entry - Mid - Senior - Executive
    const experience_level = ["EN", "MI", "SE", "EX"];

    // x scale
    // position experience level bars inside each job title group
    const x = d3.scaleBand()
    .domain(experience_level)
    .rangeRound([0, fx.bandwidth()])
    .padding(0.05);

    // Set the bar color by experience_level
    const barcolor = d3.scaleOrdinal()
    .domain(experience_level)
    .range(d3.schemeSpectral[experience_level.length])
    .unknown("#ccc");

    // Y encondes the height of the bar (average salary)
    const y = d3.scaleLinear()
    .domain([0, d3.max(avgSalaryData, d => d.avg_salary)]).nice()
    .rangeRound([barHeight - barMargin.bottom, barMargin.top]);

    // A functin to format the value in the tooltip.
    const formatValue = x => isNaN(x) ? "N/A" : "$" + x.toLocaleString("en")

    // container of the grouped bar chart
    const g2 = svg.append("g")
    .attr("width", barWidth + barMargin.left + barMargin.right)
    .attr("height", barHeight + barMargin.top + barMargin.bottom)
    .attr("transform", `translate(${barMargin.left}, ${barMargin.top})`);

    // Clip path
    // prevents the grouped bars from overflowing into the line chart area
    svg.append("defs")
    .append("clipPath")
    .attr("id", "bar-clip")
    .append("rect")
    .attr("x", barMargin.left)
    .attr("y", 0)
    .attr("width", barWidth - barMargin.left - barMargin.right)
    .attr("height", barHeight + 40);

    // applies the clip path 
    // everything inside the group is clipped to the bar chart region
    const barClipGroup = g2.append("g")
    .attr("class", "bar-clip-group")
    .attr("clip-path", "url(#bar-clip)");

    // grouped bars
    const barGroup = barClipGroup.append("g")
    .attr("class", "bar-group");

    // Append a group for each state, and a rect for each age.
    barGroup.append("g")
    .attr("class", "bars")
    .selectAll()
    .data(d3.group(avgSalaryData, d => d.job_title))
    .join("g")
        .attr("transform", ([job_title]) => 
            `translate(${fx(job_title) + fx.bandwidth()/2 - x.range()[1]/2}, 0)`)
    .selectAll()
    .data(([, d]) => d)
    .join("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.experience_level))
        .attr("y", d => y(d.avg_salary))
        .attr("width", x.bandwidth())
        .attr("height", d => y(0) - y(d.avg_salary))
        .attr("fill", d => barcolor(d.experience_level));

    // Interaction: Brushing
    // Users can drag over a subset of bars
    // check sepecific job titles or experience levels
    const brush = d3.brush()
    .extent([
        [barMargin.left, barMargin.top],
        [barWidth - barMargin.right, barHeight - barMargin.bottom]
    ])
    .on("brush end", brushed);

    barGroup.append("g")
    .attr("class", "brush")
    .call(brush);

    // Highlight bars inside the brushed region
    // and also fade out bars outside the selection
    function brushed(event) {

    // reset
    if (!event.selection) {

        g2.selectAll(".bar")
            .transition()
            .duration(300)
            .style("opacity", 1);

        return;
    }
    // check the brush region 
    const [[x0, y0], [x1, y1]] = event.selection;

    // select all bars to update their appearance during brushing
    g2.selectAll(".bar")
        .transition()
        .duration(300)
        .style("opacity", function() {
            const bar = d3.select(this);

            // actual bar position
            const bx = +bar.attr("x")
                + this.parentNode.transform.baseVal[0].matrix.e;
            const by = +bar.attr("y");
            const bw = +bar.attr("width");
            const bh = +bar.attr("height");

            // overlap check
            const selected =
                bx + bw >= x0 &&
                bx <= x1 &&
                by + bh >= y0 &&
                by <= y1;

            return selected ? 1 : 0.15;
        });
    }

    // create an x-axis group inside the clipped bar chart region 
    const barXAxis = barClipGroup.append("g")
    .attr("class", "bar-x-axis")
    .attr("transform", `translate(0, ${barHeight - barMargin.bottom})`)
    .call(d3.axisBottom(fx).tickSizeOuter(0))
    .call(g => g.selectAll(".domain").remove());

    // select all x tick labels
    barXAxis.selectAll("text")
    .style("text-anchor", "middle");

    // Append the vertical axis.
    g2.append("g")
    .attr("transform", `translate(${barMargin.left}, 0)`)
    .call(d3.axisLeft(y).ticks(null, "s"))
    .call(g => g.selectAll(".domain").remove());

    // Chart title
    g2.append("text")
    .attr("x", (barWidth - barMargin.right) / 2)
    .attr("y", 180)
    .attr("text-anchor", "middle")
    .style("font-size", "15px")
    .style("font-weight", "bold")
    .text("Average Salary by Job Title and Experience Level");

    // X-axis label
    g2.append("text")
    .attr("x", (barMargin.left + barWidth - barMargin.right) / 2)
    .attr("y", barHeight + 35)
    .attr("text-anchor", "middle")
    .style("font-size", "11px")
    .style("font-weight", "bold")
    .text("Job Title");

    // Y-axis label
    g2.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -(barHeight - barMargin.bottom + barMargin.top) / 2)
    .attr("y", 10)
    .attr("text-anchor", "middle")
    .style("font-size", "11px")
    .style("font-weight", "bold")
    .text("Average Salary (USD)");

    // Legend
    const legend = g2.append("g")
    .attr("transform", `translate(${barWidth - 230}, ${barHeight - 320})`)

    // Create legend of experience_level 
    legend.selectAll("g")
    .data(experience_level)
    .join("g")
    .attr("transform", (d, i) => `translate(0, ${i * 20})`)
    .call(g => {
        g.append("rect")
            .attr("width", 14)
            .attr("height", 14)
            .attr("fill", d => barcolor(d));

        g.append("text")
            .attr("x", 20)
            .attr("y", 9)
            .text(d => d)
            .style("font-size", "8px");
    });

    // add legend label
    legend.append("text")
    .attr("x", 0)
    .attr("y", -10)
    .style("font-size", "10px")
    .style("font-weight", "bold")
    .text("Experience Level");

    // Plot 3. line chart
    // show salary trends over time by job title
    const lineData = d3.rollups(
        processedData, 
        v => d3.mean(v, d => d.salary),
        d => d.job_title,
        d => d.work_year
    ).flatMap(([job_title, years]) => 
        years.map(([work_year, avg_salary]) => ({
            job_title, work_year, avg_salary
        }))
    );
    // Create a g3.
    // container of the line graph
    const g3 = svg.append("g")
    .attr("width", width)
    .attr("height", height)
    .attr("transform", `translate(${lineMargin.left + 700}, ${lineMargin.bottom + 330})`);

    // Create the positional scales.
    const x3 = d3.scaleLinear()
    .domain(d3.extent(lineData, d => d.work_year))
    .range([0, lineWidth]);

    // create y axis
    const y3 = d3.scaleLinear()
    .domain([0, d3.max(lineData, d => d.avg_salary)]).nice()
    .range([lineHeight, 0]);

    // Add the horizontal axis.
    g3.append("g")
        .attr("transform", `translate(0,${lineHeight})`)
        .call(d3.axisBottom(x3).tickFormat(d3.format("d")).ticks(4));

    // Add the vertical axis.
    g3.append("g")
    .call(d3.axisLeft(y3).ticks(6, "s"))
    .call(g => g.select(".domain").remove())
    .call(g => g.append("text")
        .attr("x", -lineMargin.left+100)
        .attr("y", -20)
        .attr("fill", "currentColor")
        .attr("text-anchor", "start"));

    // Draw the lines.
    const lineColor = d3.scaleOrdinal()
    .domain(selectedJobs)
    .range(d3.schemeCategory10);

    // create a line generator
    // work year -> x / average salary -> y
    const line = d3.line()
    .x(d => x3(d.work_year))
    .y(d => y3(d.avg_salary));

    // Make a group by job_title
    const groups = d3.group(lineData, d => d.job_title);

    // Create a path (also for a hover interaction)
    const path3 = g3.append("g")
    .attr("fill", "none")
    .attr("stroke-width", 3)
    .selectAll("path")
    .data(groups)
    .join("path")
    .attr("stroke", ([job_title]) => lineColor(job_title))
    .attr("d", ([, values]) => line(values.sort((a, b) => a.work_year - b.work_year)));
    
    // title
    g3.append("text")
    .attr("x", lineWidth / 2)
    .attr("y", 0)
    .attr("text-anchor", "middle")
    .style("font-size", "15px")
    .style("font-weight", "bold")
    .text("Average Salary Trends by Job Title");

    // X-axis label
    g3.append("text")
    .attr("x", lineWidth / 2)
    .attr("y", lineHeight + 30)
    .attr("text-anchor", "middle")
    .style("font-size", "11px")
    .style("font-weight", "bold")
    .text("Work Year");

    // Y-axis label
    g3.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -lineHeight / 2)
    .attr("y", -40)
    .attr("text-anchor", "middle")
    .style("font-size", "11px")
    .style("font-weight", "bold")
    .text("Average Salary (USD)");

    // Add Legend
    const lineLegend = g3.append("g")
    .attr("transform", `translate(${lineWidth - 90}, 200)`);

    // create one legend group for each job title
    lineLegend.selectAll("g")
    .data(selectedJobs)
    .join("g")
    .attr("transform", (d, i) => `translate(0, ${i * 22})`)
    .call(g => {
         g.append("line")
            .attr("x1", 0)
            .attr("x2", 20)
            .attr("y1", 7)
            .attr("y2", 7)
            .attr("stroke", d => lineColor(d))
            .attr("stroke-width", 3);
        g.append("text")
            .attr("x", 28)
            .attr("y", 10)
            .style("font-size", "11px")
            .text(d => d);
    });
    
    // legend text
    lineLegend.append("text")
    .attr("x", 0)
    .attr("y", -10)
    .style("font-size", "11px")
    .style("font-weight", "bold")
    .text("Job Title");

    // Create the interaction (hover) - Selection
    // Line for hovered line
    const lineLabel = g3.append("text")
    .attr("display", "none")
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .style("font-weight", "bold")
    .style("pointer-events", "none");

    // interaction: Hover based selection 
    // highlight one salary trend line 
    // and fade out unrelated job title lines
    path3
    .on("pointerenter", function(event, [job_title]) {
        path3
            .style("opacity", 0.2)
            .style("stroke-width", 3);
        d3.select(this)
            .style("opacity", 1)
            .style("stroke-width", 4).raise();
        lineLabel
            .attr("display", null)
            .text(job_title);
    })
    // make the lineLabel to follow a mouse pointer
    .on("pointermove", function(event, [job_title]) {
        const [xm, ym] = d3.pointer(event, g3.node());
        lineLabel
            .attr("x", xm + 8)
            .attr("y", ym - 8)
            .text(job_title);
    })
    .on("pointerleave", function(){
        path3
            .style("opacity", 1)
            .style("stroke-width", 3);
        lineLabel.attr("display", "none");
    })

});