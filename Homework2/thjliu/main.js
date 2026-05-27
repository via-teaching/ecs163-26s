const width = window.innerWidth;
const height = window.innerHeight;

let distrLeft = 60, distrTop = 60;
let distrMargin = {top: 10, right: 30, bottom: 30, left: 60},
    distrWidth = 400 - distrMargin.left - distrMargin.right,
    distrHeight = 350 - distrMargin.top - distrMargin.bottom;

let geoMapLeft = 400, geoMapTop = 60;
let geoMapMargin = {top: 10, right: 30, bottom: 30, left: 60},
    geoMapWidth = 600 - geoMapMargin.left - geoMapMargin.right,
    geoMapHeight = 525 - geoMapMargin.top - geoMapMargin.bottom;

let sankeyLeft = 0, sankeyTop = 500;
let sankeyMargin = {top: 10, right: 30, bottom: 30, left: 30},
    sankeyWidth = width - sankeyMargin.left - sankeyMargin.right,
    sankeyHeight = height-480 - sankeyMargin.top - sankeyMargin.bottom;

// plots
d3.csv("data/ds_salaries.csv").then(rawData =>{
    console.log("rawData", rawData);

    rawData.forEach(function(d){
        d.work_year = Number(d.work_year);
        d.salary = Number(d.salary);
        d.salary_in_usd = Number(d.salary_in_usd);
        d.remote_ratio = Number(d.remote_ratio);
    });


    const processedData = rawData.map(d=>{
                          return {
                              "salary_in_usd":d.salary_in_usd,
                              "company_location":d.company_location,
                              "company_size":d.company_size,
                              "experience_level":d.experience_level,
                          };
    });
    console.log("processedData", processedData);

    //plot 1: Distribution of salaries in USD (dataset overview)
    const svg = d3.select("svg");

    const g1 = svg.append("g")
                .attr("width", distrWidth + distrMargin.left + distrMargin.right)
                .attr("height", distrHeight + distrMargin.top + distrMargin.bottom)
                .attr("transform", `translate(${distrLeft}, ${distrTop})`);

    // X label
    g1.append("text")
    .attr("x", distrWidth / 2)
    .attr("y", distrHeight + 60)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .text("Salary in USD");


    // Y label
    g1.append("text")
    .attr("x", -(distrHeight / 2))
    .attr("y", -40)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("Number of Jobs");

    // X ticks
    const x1 = d3.scaleLinear()
    .domain([0, d3.max(processedData, d => d.salary_in_usd)])
    .range([0, distrWidth]);

    const xAxisCall = d3.axisBottom(x1)
                        .ticks(7);
    g1.append("g")
    .attr("transform", `translate(0, ${distrHeight})`)
    .call(xAxisCall)
    .selectAll("text")
        .attr("y", "10")
        .attr("x", "-5")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-40)");
    
    // Create bins for the histogram
    const histogram = d3.histogram(processedData.map(d => d.salary_in_usd))
        .domain(x1.domain())
        .thresholds(30);

    const bins = histogram(processedData.map(d => d.salary_in_usd));

    // Most number of jobs in one bin was 546; 600 is a good upper bound
    const maxJobs = 600

    // Y ticks
    const y1 = d3.scaleLinear()
    .domain([0, maxJobs])
    .range([distrHeight, 0]);

    const yAxisCall = d3.axisLeft(y1)
                        .ticks(13);
    g1.append("g").call(yAxisCall);

    // bars
    const bars = g1.selectAll("rect").data(bins);

    bars.enter().append("rect")
         .attr("x", d => x1(d.x0) + 1)
         .attr("y", d => y1(d.length))
         .attr("width", d => Math.max(0, x1(d.x1) - x1(d.x0) - 1))
         .attr("height", d => distrHeight - y1(d.length))
         .attr("fill", "#69b3a2");
    
    // Title
    g1.append("text")
    .attr("x", distrWidth / 2)
    .attr("y", -20)
    .attr("font-size", "30px")
    .attr("text-anchor", "middle")
    .text("Distribution of Salaries");
    
    //plot 2: Geographical World Map by Average Salary in USD

    const g2 = svg.append("g")
                .attr("width", geoMapWidth + geoMapMargin.left + geoMapMargin.right)
                .attr("height", geoMapHeight + geoMapMargin.top + geoMapMargin.bottom)
                .attr("transform", `translate(${geoMapLeft}, ${geoMapTop})`);

    // Compute average salary for each country
    const countryData = d3.nest()
        .key(function(d) {
            return d.company_location;
        })
        .rollup(function(values) {
            return d3.mean(values, function(d) {
                return d.salary_in_usd;
            });
        })
        .entries(processedData)
        .map(function(d) {
            return {
                company_location: d.key,
                avg_salary: d.value
            };
        });
    console.log("countryData", countryData);

    // Convert to dictionary for easy lookup
    const salaryByCountry = {};
    countryData.forEach(d => {
        salaryByCountry[d.company_location] = d.avg_salary;
    });

    // Highest average salary was $271k (Israel); $300k is a good upper bound
    const maxSalary = 300000

    // Viridis colormap; monotonically increasing luminance
    const color = d3.scaleSequential(d3.interpolateViridis)
    .domain([0, maxSalary]);

    // Create projection and path
    const projection = d3.geoMercator()
    .fitSize([geoMapWidth, geoMapHeight], {type: "Sphere"});

    const path = d3.geoPath().projection(projection);

    // Load GeoJSON and draw world map
    d3.json("data/custom.geo.json").then(function(world) {
        g2.selectAll("path")
        .data(world.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("stroke", "#999999")
        .attr("stroke-width", 0.5)
        .attr("fill", function(d) {
            const code = d.properties.iso_a2;
            const salary = salaryByCountry[code];
            return salary ? color(salary) : "#eeeeee";
        });
    });

    // Title
    g2.append("text")
            .attr("x", geoMapWidth / 2)
            .attr("y", -20)
            .attr("font-size", "30px")
            .attr("text-anchor", "middle")
            .text("Average Salary by Country in USD");

    // Legend
    const legendWidth = 15;
    const legendHeight = 250;
    const legendX = geoMapWidth + 20;
    const legendY = 50;

    // Define a gradient for the legend
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
        .attr("id", "salary-gradient")
        .attr("x1", "0%")
        .attr("x2", "0%")
        .attr("y1", "100%")
        .attr("y2", "0%");

    // Create gradient stops
    d3.range(0, 1.01, 0.1).forEach(function(t) {
        gradient.append("stop")
            .attr("offset", (t * 100) + "%")
            .attr("stop-color",
                color(0 + t * maxSalary));
    });
    
    // Legend bar
    g2.append("rect")
        .attr("x", legendX)
        .attr("y", legendY)
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#salary-gradient)")
        .style("stroke", "black")
        .style("stroke-width", 0.5);
    
    // Legend scale
    const legendScale = d3.scaleLinear()
        .domain([maxSalary, 0])
        .range([0, legendHeight]);
    
    // Legend axis
    const legendAxis = d3.axisRight(legendScale)
        .ticks(7)
        .tickFormat(function(d) {
            if (d === 0) {
                return "$0";
            }
            return d3.format("$.2s")(d);
        });
    
    g2.append("g")
        .attr("transform",
            "translate(" + (legendX + legendWidth) + "," + legendY + ")")
        .call(legendAxis);

    // Legend labels
    g2.append("text")
        .attr("x", legendX + legendWidth / 2)
        .attr("y", legendY - 30)
        .attr("font-size", "12px")
        .attr("text-anchor", "middle")
        .text("National Average Salary (USD)");
    
    g2.append("text")
        .attr("x", legendX + legendWidth / 2)
        .attr("y", legendY - 15)
        .attr("font-size", "12px")
        .attr("text-anchor", "middle")
        .text("*Countries with no available data are grayed out");

    //plot 3: Sankey Diagram of Salary Flow
    
    const g3 = svg.append("g")
            .attr("width", sankeyWidth + sankeyMargin.left + sankeyMargin.right)
            .attr("height", sankeyHeight + sankeyMargin.top + sankeyMargin.bottom)
            .attr("transform", `translate(${sankeyMargin.left}, ${sankeyTop})`);

    // Set up keys and labels
    const companySizes = ["S", "M", "L"];
    const experienceLevels = ["EN", "MI", "SE", "EX"];
    const companySizeLabels = {
        "S": "Small",
        "M": "Medium",
        "L": "Large"
    };
    const experienceLabels = {
        "EN": "Entry",
        "MI": "Mid-level",
        "SE": "Senior",
        "EX": "Executive"
    };

    // Create the nodes of the diagram
    const nodes = [
        { name: "Total Salary" },
        ...companySizes.map(function(size) {
            return { name: companySizeLabels[size] };
        }),
        ...experienceLevels.map(function(level) {
            return { name: experienceLabels[level] };
        })
    ];

    // Create links from total salary to company sizes
    const links = [];
    companySizes.forEach(function(size) {
        const total = d3.sum(
            processedData.filter(function(d) {
                return d.company_size === size;
            }),
            function(d) {
                return d.salary_in_usd;
            }
        );
        if (total > 0) {
            links.push({
                source: 0,
                target: companySizes.indexOf(size) + 1,
                value: total
            });
        }
    });

    // Create links from company sizes to experience levels
    companySizes.forEach(function(size) {
        experienceLevels.forEach(function(level) {
            const total = d3.sum(
                processedData.filter(function(d) {
                    return d.company_size === size &&
                        d.experience_level === level;
                }),
                function(d) {
                    return d.salary_in_usd;
                }
            );
            if (total > 0) {
                links.push({
                    source: companySizes.indexOf(size) + 1,
                    target: companySizes.length + experienceLevels.indexOf(level) + 1,
                    value: total
                });
            }
        });
    });

    const sankeyData = {
        nodes: nodes,
        links: links
    };
    console.log("sankeyData", sankeyData);

    // Create Sankey generator to draw nodes in order
    const sankey = d3.sankey()
    .nodeWidth(20)
    .nodePadding(15)
    .nodeSort(function(a, b) {
        const order = {
            "Total Salary": 0,
            "Small": 0,
            "Medium": 1,
            "Large": 2,
            "Entry": 0,
            "Mid-level": 1,
            "Senior": 2,
            "Executive": 3
        };
        return order[a.name] - order[b.name];
    })
    .extent([[0, 0], [sankeyWidth, sankeyHeight]]);

    // Applies Sankey generator to data
    const graph = sankey(sankeyData);

    // Defines color scheme for nodes
    const nodeColor = name => {
        if (name === "Total Salary") return "#ff0000";
        if (name === "Small") return "#00ff00";
        if (name === "Medium") return "#0000ff";
        if (name === "Large") return "#6baed6";
        if (name === "Entry") return "#e377c2";
        if (name === "Mid-level") return "#ffffff";
        if (name === "Senior") return "#000000";
        if (name === "Executive") return "#ffff00";
        return "#eeeeee";
      };

    // Draw nodes
    g3.append("g")
        .selectAll("rect")
        .data(graph.nodes)
        .enter()
        .append("rect")
        .attr("x", function(d) { return d.x0; })
        .attr("y", function(d) { return d.y0; })
        .attr("width", function(d) { return d.x1 - d.x0; })
        .attr("height", function(d) { return d.y1 - d.y0; })
        .attr("fill", function(d) { return nodeColor(d.name); })
        .attr("stroke", "black");

    // Draw links
    g3.append("g")
        .selectAll("path")
        .data(graph.links)
        .enter()
        .append("path")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("fill", "none")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.4)
        .attr("stroke-width", function(d) {
            return Math.max(1, d.width);
        });
    
    // Node labels
    g3.append("g")
        .selectAll("text")
        .data(graph.nodes)
        .enter()
        .append("text")
        .attr("x", function(d) {
            return d.x0 < sankeyWidth / 2 ? d.x1 + 6 : d.x0 - 6;
        })
        .attr("y", function(d) {
            return (d.y0 + d.y1) / 2;
        })
        .attr("dy", "0.35em")
        .attr("text-anchor", function(d) {
            return d.x0 < sankeyWidth / 2 ? "start" : "end";
        })
        .attr("font-size", "12px")
        .text(function(d) {
            return d.name;
        });
    
    // Title
    g3.append("text")
        .attr("x", sankeyWidth / 2)
        .attr("y", -20)
        .attr("font-size", "30px")
        .attr("text-anchor", "middle")
        .text("Salary Flow Through Company Sizes and Experience Levels");


    }).catch(function(error){
    console.log(error);
});