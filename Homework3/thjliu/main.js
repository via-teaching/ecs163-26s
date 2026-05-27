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
    g1.selectAll("rect")
        .data(bins)
        .enter()
        .append("rect")
        .attr("x", d => x1(d.x0) + 1)
        .attr("width", d => Math.max(0, x1(d.x1) - x1(d.x0) - 1))
        .attr("y", distrHeight)   // start at bottom
        .attr("height", 0)
        .attr("fill", "#69b3a2")
        .transition()
        .duration(1000)
        .ease(d3.easeCubic)
        .attr("y", d => y1(d.length))
        .attr("height", d => distrHeight - y1(d.length));
    
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

    // Add a background rectangle to capture interactions on ocean
    const mapBackground = g2.append("rect")
            .attr("width", geoMapWidth)
            .attr("height", geoMapHeight - 140)
            .attr("fill", "transparent")
            .style("pointer-events", "all")
            .style("stroke", "#999999")
            .style("stroke-width", 1);

    mapBackground.on("click", function() {
        resetSelectedCountry();
    });

    // Define clipping window for world map
    const defs = svg.append("defs");
    defs.append("clipPath")
        .attr("id", "map-clip")
        .append("rect")
        .attr("width", geoMapWidth)
        .attr("height", geoMapHeight - 140);
    
    // Define groups for map viewport and elements
    const mapViewport = g2.append("g")
        .attr("clip-path", "url(#map-clip)");
        
    const map = mapViewport.append("g");

    // Selected country controls display of world map and summary statistics
    let selectedCountry = null;
    function resetSelectedCountry() {
        selectedCountry = null;
        map.selectAll("path")
            .transition()
            .duration(250)
            .attr("stroke", "#999999")
            .attr("stroke-width", 0.5)
            .attr("opacity", 1);
        summaryPanel.select(".summary-title")
            .text("Select a country");
        summaryPanel.select(".avg-salary")
            .text("");
        summaryPanel.select(".job-count")
            .text("");
        summaryPanel.select(".top-exp")
            .text("");
        summaryPanel.select(".top-size")
            .text("");
    }

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

    // Load GeoJSON then draw world map and summary panel according to selected country
    d3.json("data/custom.geo.json").then(function(world) {
        map.selectAll("path")
        .data(world.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("stroke", "#999999")
        .attr("stroke-width", 0.5)
        .attr("fill", function(d) {
            const countryCode = d.properties.iso_a2;
            const salary = salaryByCountry[countryCode];
            return salary ? color(salary) : "#eeeeee";
        })
        .style("cursor", "pointer")
        .on("click", function(d) {
            const countryCode = d.properties.iso_a2;
            const countryName = d.properties.admin;
            if (selectedCountry === countryCode) {
                resetSelectedCountry();
                return;
            }
            selectedCountry = countryCode;
            map.selectAll("path")
                .transition()
                .duration(250)
                .attr("stroke", "#999999")
                .attr("stroke-width", 0.5)
                .attr("opacity", 0.5);
            d3.select(this)
                .raise()
                .transition()
                .duration(250)
                .attr("stroke", "#ff0000")
                .attr("opacity", 1);
            const countryJobs = processedData.filter(function(job) {
                return job.company_location === countryCode;
            });
            if (countryJobs.length === 0) {
                summaryPanel.select(".summary-title")
                    .text(`${countryName}`);
                summaryPanel.select(".avg-salary")
                    .text("No salary data available");
                summaryPanel.select(".job-count").text("");
                summaryPanel.select(".top-exp").text("");
                summaryPanel.select(".top-size").text("");
                return;
            }
            const avgSalary = d3.mean(countryJobs, d => d.salary_in_usd);
            const numJobs = countryJobs.length;
            const topExperience = d3.nest()
                .key(function(d) {
                    return d.experience_level;
                })
                .rollup(function(v) {
                    return v.length;
                })
                .entries(countryJobs)
                .sort(function(a, b) {
                    return b.value - a.value;
                })[0].key;
            const topCompanySize = d3.nest()
                .key(function(d) {
                    return d.company_size;
                })
                .rollup(function(v) {
                    return v.length;
                })
                .entries(countryJobs)
                .sort(function(a, b) {
                    return b.value - a.value;
                })[0].key;
            summaryPanel.select(".summary-title")
                .text(`${countryName}`);
            summaryPanel.select(".avg-salary")
                .text(`Average Salary: ${d3.format("$,.0f")(avgSalary)}`);
            summaryPanel.select(".job-count")
                .text(`Number of Jobs Reported: ${numJobs}`);
            summaryPanel.select(".top-exp")
                .text(`Most Common Experience Level: ${experienceLabels[topExperience]}`);
            summaryPanel.select(".top-size")
                .text(`Most Common Company Size: ${companySizeLabels[topCompanySize]}`);
        })
        .transition()
        .duration(1000)
        .ease(d3.easeCubic)
        .attr("opacity", 1)
    });

    // Support pan and zoom interactions
    const zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on("zoom", () => map.attr("transform", d3.event.transform))
        .interpolate(d3.interpolateZoom);
    g2.call(zoom);

    // Button to reset zoom of world map to default
    const resetZoom = svg.append("g")
        .attr("transform", `translate(${geoMapLeft + geoMapWidth + 15}, ${geoMapTop + geoMapHeight - 135})`)
        .style("cursor", "pointer");
    
    resetZoom.append("rect")
        .attr("width", 250)
        .attr("height", 30)
        .attr("rx", 5)
        .attr("ry", 5)
        .attr("fill", "#f0f0f0")
        .attr("stroke", "#999999");
    
    resetZoom.append("text")
        .attr("x", 125)
        .attr("y", 19)
        .attr("font-weight", "bold")
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .text("Reset Zoom");
    
    resetZoom.on("click", function() {
        g2.transition()
            .duration(750)
            .call(zoom.transform, d3.zoomIdentity);
    });

    // Panel to display summary statistics for selected country
    const summaryPanel = svg.append("g")
        .attr("transform", `translate(${geoMapLeft + geoMapWidth + 15}, ${geoMapTop + geoMapHeight - 235})`);

    summaryPanel.append("rect")
        .attr("width", 250)
        .attr("height", 95)
        .attr("rx", 10)
        .attr("ry", 10)
        .attr("fill", "#f8f8f8")
        .attr("stroke", "#999999");

    summaryPanel.append("text")
        .attr("class", "summary-title")
        .attr("x", 12)
        .attr("y", 20)
        .attr("font-size", "15px")
        .attr("font-weight", "bold")
        .text("Select a country");

    summaryPanel.append("text")
        .attr("class", "avg-salary")
        .attr("x", 12)
        .attr("y", 40)
        .attr("font-size", "12px");

    summaryPanel.append("text")
        .attr("class", "job-count")
        .attr("x", 12)
        .attr("y", 55)
        .attr("font-size", "12px");

    summaryPanel.append("text")
        .attr("class", "top-exp")
        .attr("x", 12)
        .attr("y", 70)
        .attr("font-size", "12px");

    summaryPanel.append("text")
        .attr("class", "top-size")
        .attr("x", 12)
        .attr("y", 85)
        .attr("font-size", "12px");

    // Title
    g2.append("text")
            .attr("x", geoMapWidth / 2)
            .attr("y", -20)
            .attr("font-size", "30px")
            .attr("text-anchor", "middle")
            .text("Average Salary by Country in USD");
    
    // Legend
    const legendWidth = 15;
    const legendHeight = 235;
    const legendX = geoMapWidth + 20;
    const legendY = 0;

    // Define a gradient for the legend
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
        .attr("x", legendX + legendWidth / 2 - 20)
        .attr("y", legendY - 30)
        .attr("font-size", "12px")
        .text("National Average Salary (USD)");
    
    g2.append("text")
        .attr("x", legendX + legendWidth / 2 - 20)
        .attr("y", legendY - 15)
        .attr("font-size", "12px")
        .text("*Countries with no available data are grayed out");
    
    // Interaction suggestion label
    g2.append("text")
        .attr("x", geoMapWidth / 2)
        .attr("y", geoMapHeight - 120)
        .attr("font-size", "12px")
        .attr("text-anchor", "middle")
        .text("Drag on map to pan. Scroll on map to zoom. Click on any country to see country-specific data.");

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
        if (name === "Total Salary") return "#ffffff";
        if (name === "Small") return "#011f4b";
        if (name === "Medium") return "#005b96";
        if (name === "Large") return "#b3cde0";
        if (name === "Entry") return "#ffd7b5";
        if (name === "Mid-level") return "#ffb38a";
        if (name === "Senior") return "#ff9248";
        if (name === "Executive") return "#ff6700";
        return "#eeeeee";
      };

    // Draw nodes (animated)
    g3.append("g")
        .selectAll("rect")
        .data(graph.nodes)
        .enter()
        .append("rect")
        .attr("x", function(d) { return d.x0; })
        .attr("y", function(d) { return d.y1; })
        .attr("width", function(d) { return d.x1 - d.x0; })
        .attr("height", 0)
        .attr("fill", function(d) { return nodeColor(d.name); })
        .attr("stroke", "#000000")
        .transition()
        .duration(1000)
        .delay(200)
        .ease(d3.easeCubic)
        .attr("y", function(d) { return d.y0; })
        .attr("height", function(d) { return d.y1 - d.y0; });

    // Draw links (animated)
    g3.append("g")
        .selectAll("path")
        .data(graph.links)
        .enter()
        .append("path")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("fill", "none")
        .attr("stroke", "#999999")
        .attr("stroke-opacity", 0)
        .attr("stroke-width", 0)
        .transition()
        .duration(1200)
        .delay(200)
        .ease(d3.easeCubic)
        .attr("stroke-opacity", 0.4)
        .attr("stroke-width", function(d) {
            return Math.max(1, d.width);
        });
    
    // Draw node labels (animated)
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
        .attr("opacity", 0)
        .attr("font-size", "12px")
        .attr("text-anchor", function(d) {
            return d.x0 < sankeyWidth / 2 ? "start" : "end";
        })
        .text(function(d) {
            return d.name;
        })
        .transition()
        .duration(800)
        .delay(800)
        .attr("opacity", 1);
    
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