// Get the actual dimensions of each chart div
const div1 = document.getElementById("chart1");
const div2 = document.getElementById("chart2");
const div3 = document.getElementById("chart3");

const width1 = div1.offsetWidth;
const height1 = div1.offsetHeight;
const width2 = div2.offsetWidth;
const height2 = div2.offsetHeight;
const width3 = div3.offsetWidth;
const height3 = div3.offsetHeight;

// Load the dataset
d3.csv("data/globalterrorismdb_0718dist.csv").then(function(rawData) {
    // Store reference to map paths and PCP lines for updating later
    let mapPaths = null;
    let pcpLines = null;
    // Convert year and month strings to numbers
    rawData.forEach(function(d) {
        d.iyear = +d.iyear;
        d.imonth = +d.imonth;
    });

    console.log("Total rows loaded:", rawData.length);
    console.log("First row:", rawData[0]);
    // --- CHART 1: Bar Chart (Overview) ---
    // Groups attacks by year to show the overall trend over time

    // Count attacks per year
    const attacksByYear = d3.nest()
        .key(d => d.iyear)
        .rollup(v => v.length)
        .entries(rawData);


    // Chart 1 margins
    const margin1 = {top: 30, right: 20, bottom: 40, left: 90};
    const w1 = width1 - margin1.left - margin1.right;
    const h1 = height1 - margin1.top - margin1.bottom;

    // Create SVG inside #chart1 div
    const svg1 = d3.select("#chart1")
        .append("svg")
        .attr("width", width1)
        .attr("height", height1)
        .append("g")
        .attr("transform", `translate(${margin1.left}, ${margin1.top})`);

    // scaleBand spaces years evenly across x axis
    const x1 = d3.scaleBand()
        .domain(attacksByYear.map(d => d.key))
        .range([0, w1])
        .padding(0.1);

    // Linear scale mapping attack count to pixel height
    const y1 = d3.scaleLinear()
        .domain([0, 20000])
        .range([h1, 0]);

    // X axis — show every 5th year to avoid overlapping labels
    svg1.append("g")
        .attr("transform", `translate(0, ${h1})`)
        .call(d3.axisBottom(x1).tickValues(
            x1.domain().filter((d, i) => i % 5 === 0)
        ))
        .selectAll("text")
        .attr("fill", "#eaeaea");

    // Y axis with fixed intervals of 5000
    svg1.append("g")
        .call(d3.axisLeft(y1).tickValues([0, 5000, 10000, 15000, 20000]))
        .selectAll("text")
        .attr("fill", "#eaeaea");

    // Draw bars — height represents number of attacks that year
    svg1.selectAll(".bar")
        .data(attacksByYear)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x1(d.key))
        .attr("y", d => y1(d.value))
        .attr("width", x1.bandwidth())
        .attr("height", d => h1 - y1(d.value))
        .attr("fill", "#4169e1");

    // Chart title
    svg1.append("text")
        .attr("x", w1 / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .attr("fill", "#eaeaea")
        .attr("font-size", "14px")
        .style("font-weight", "600")
        .text("Terrorist Attacks per Year (1970–2017)");

    // X axis label
    svg1.append("text")
        .attr("x", w1 / 2)
        .attr("y", h1 + 35)
        .attr("text-anchor", "middle")
        .attr("fill", "#eaeaea")
        .attr("font-size", "12px")
        .text("Year");

    // Y axis label — rotated 90 degrees
    svg1.append("text")
        .attr("x", -(h1 / 2))
        .attr("y", -70)
        .attr("text-anchor", "middle")
        .attr("fill", "#eaeaea")
        .attr("font-size", "12px")
        .attr("transform", "rotate(-90)")
        .text("Number of Attacks");

    // Legend
    const legend1 = svg1.append("g")
        .attr("transform", `translate(10, 10)`);

    legend1.append("rect")
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", "#4169e1");

    legend1.append("text")
        .attr("x", 16)
        .attr("y", 10)
        .attr("fill", "#eaeaea")
        .attr("font-size", "11px")
        .text("# of Attacks");

    // Tooltip — hidden by default, appears on bar hover
    const tooltip1 = d3.select("body")
        .append("div")
        .style("position", "absolute")
        .style("background", "#2b2b2b")
        .style("color", "#eaeaea")
        .style("padding", "8px 12px")
        .style("border-radius", "6px")
        .style("border", "1px solid #4169e1")
        .style("font-size", "12px")
        .style("font-family", "'Montserrat', sans-serif")
        .style("font-weight", "400")
        .style("pointer-events", "none")
        .style("opacity", 0);

    // Highlight bar and show year/count on hover
    svg1.selectAll(".bar")
        .on("mouseover", function(d) {
            tooltip1.style("opacity", 1)
                .html(`Year: ${d.key}<br>Attacks: ${d.value.toLocaleString()}`);
            d3.select(this).attr("fill", "#6a8ff5");
        })
        .on("mousemove", function() {
            tooltip1
                .style("left", (d3.event.pageX + 12) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function(d) {
            tooltip1.style("opacity", 0);
                // Only reset color if bar is not dimmed by brush
            const xPos = x1(d.key) + x1.bandwidth() / 2;
            const brushSelection = d3.brushSelection(svg1.select(".brush").node());
            if (!brushSelection || (xPos >= brushSelection[0] && xPos <= brushSelection[1])) {
                d3.select(this).attr("fill", "#4169e1");
            }
        });
    

    // Text showing total attacks in selected range
    const brushCount = svg1.append("text")
        .attr("x", w1 - 10)
        .attr("y", -10)
        .attr("text-anchor", "end")
        .attr("fill", "#eaeaea")
        .attr("font-size", "11px")
        .text("");
    // Brush interaction — drag to select a year range
    const brush = d3.brushX()
        .extent([[0, 0], [w1, h1]])
        .on("brush end", function() {
            const selection = d3.event.selection;

            // If brush is cleared, reset all bars to full opacity
            if (!selection) {
                svg1.selectAll(".bar")
                    .transition().duration(300)
                    .attr("opacity", 1)
                    .attr("fill", "#4169e1");
                brushCount.text("");
                // Reset map and PCP when brush is cleared
                if (mapPaths) {
                    mapPaths.transition().duration(600)
                        .attr("fill", function(d) {
                            const geoName = d.properties.name;
                            const dataName = nameMap.hasOwnProperty(geoName) ? nameMap[geoName] : geoName;
                            const country = dataName ? attacksByCountry[dataName] : null;
                            return country ? colorScale(country.attacks) : "#3a3a3a";
                        });
                }
                if (pcpLines) {
                    pcpLines.transition().duration(600)
                        .attr("opacity", 0.6);
                }
                return;
            }

            // Find which years fall inside the brushed range
            const selectedYears = attacksByYear.filter(d => {
                const xPos = x1(d.key) + x1.bandwidth() / 2;
                return xPos >= selection[0] && xPos <= selection[1];
            });

            // Dim bars outside selection, highlight bars inside
            svg1.selectAll(".bar")
                .transition().duration(300)
                .attr("opacity", d => {
                    const xPos = x1(d.key) + x1.bandwidth() / 2;
                    return xPos >= selection[0] && xPos <= selection[1] ? 1 : 0.2;
                })
                .attr("fill", d => {
                    const xPos = x1(d.key) + x1.bandwidth() / 2;
                    return xPos >= selection[0] && xPos <= selection[1] ? "#4169e1" : "#4169e1";
                });

            // Count total attacks in selected range
            const totalAttacks = d3.sum(selectedYears, d => d.value);
            const minYear = d3.min(selectedYears, d => +d.key);
            const maxYear = d3.max(selectedYears, d => +d.key);

            // Update counter text
            brushCount.text(`${minYear}–${maxYear}: ${totalAttacks.toLocaleString()} attacks`);

            // Update map and PCP with selected years
            if (selectedYears.length > 0) {
                updateCharts(selectedYears.map(d => d.key));
            }
        });

    // Append brush to svg
    svg1.append("g")
        .attr("class", "brush")
        .call(brush);

    


    // --- CHART 2: Choropleth Map (Focus View) ---
    // Shows geographic distribution of attacks by country

    // Aggregate total attacks and casualties per country
    const attacksByCountry = d3.nest()
        .key(d => d.country_txt)
        .rollup(v => ({
            attacks: v.length,
            casualties: d3.sum(v, d => (+d.nkill || 0) + (+d.nwound || 0))
        }))
        .object(rawData);

    // Some country names differ between GeoJSON and the dataset
    const nameMap = {
        "USA": "United States",
        "Bosnia and Herzegovina": "Bosnia-Herzegovina",
        "Northern Cyprus": "Cyprus",
        "England": "United Kingdom",
        "Greenland": "Denmark",
        "The Bahamas": "Bahamas",
        "Antarctica": null,
        "French Southern and Antarctic Lands": null,
    };

    const margin2 = {top: 30, right: 10, bottom: 30, left: 10};
    const w2 = width2 - margin2.left - margin2.right;
    const h2 = height2 - margin2.top - margin2.bottom;

    // SVG canvas for chart 2
    const svg2 = d3.select("#chart2")
        .append("svg")
        .attr("width", width2)
        .attr("height", height2)
        .style("overflow", "hidden");

    // Chart title
    svg2.append("text")
        .attr("x", width2 / 2)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .attr("fill", "#eaeaea")
        .attr("font-size", "14px")
        .style("font-weight", "600")
        .text("Terrorist Attacks by Country (1970–2017)");

    // NaturalEarth projection gives a clean familiar world map shape
    const projection = d3.geoNaturalEarth1()
        .scale(width2 / 6)
        .translate([width2 / 2, height2 / 1.7]);

    const geoPath = d3.geoPath().projection(projection);

    // Log scale so smaller countries are still visible
    const maxAttacks = d3.max(Object.values(attacksByCountry), d => d.attacks);
    const colorScale = d3.scaleSequentialLog()
        .domain([1, maxAttacks / 2])
        .interpolator(d3.interpolateBlues);

    // Tooltip for map
    const tooltip2 = d3.select("body")
        .append("div")
        .style("position", "absolute")
        .style("background", "#2b2b2b")
        .style("color", "#eaeaea")
        .style("padding", "8px 12px")
        .style("border-radius", "6px")
        .style("border", "1px solid #4169e1")
        .style("font-size", "12px")
        .style("font-family", "'Montserrat', sans-serif")
        .style("font-weight", "400")
        .style("pointer-events", "none")
        .style("opacity", 0);

    // Load GeoJSON and draw each country as an SVG path
    d3.json("data/world.geojson").then(function(geoData) {

        // Map group for zoom/pan interaction later
        const mapGroup = svg2.append("g");

        mapPaths = mapGroup.selectAll("path")
            .data(geoData.features)
            .enter()
            .append("path")
            .attr("d", geoPath)
            .attr("fill", function(d) {
                // Use nameMap to reconcile naming differences
                const geoName = d.properties.name;
                const dataName = nameMap.hasOwnProperty(geoName) ? nameMap[geoName] : geoName;
                const country = dataName ? attacksByCountry[dataName] : null;
                return country ? colorScale(country.attacks) : "#3a3a3a";
            })
            .attr("stroke", "#1e1e1e")
            .attr("stroke-width", 0.5)
            .on("mouseover", function(d) {
                const geoName = d.properties.name;
                const dataName = nameMap.hasOwnProperty(geoName) ? nameMap[geoName] : geoName;
                const country = dataName ? attacksByCountry[dataName] : null;
                if (country) {
                    tooltip2.style("opacity", 1)
                        .html(`${geoName}<br>
                            Attacks: ${country.attacks.toLocaleString()}<br>
                            Casualties: ${country.casualties.toLocaleString()}`);
                    d3.select(this).attr("stroke", "#eaeaea").attr("stroke-width", 1.5);
                }
            })
            .on("mousemove", function() {
                tooltip2
                    .style("left", (d3.event.pageX + 12) + "px")
                    .style("top", (d3.event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                tooltip2.style("opacity", 0);
                d3.select(this).attr("stroke", "#1e1e1e").attr("stroke-width", 0.5);
            });

        // Gradient legend
        const legendWidth = 200;
        const legendHeight = 10;

        const legendSvg = svg2.append("g")
            .attr("transform", `translate(20, ${height2 - 35})`);

        const defs = svg2.append("defs");
        const linearGradient = defs.append("linearGradient")
            .attr("id", "legend-gradient");

        linearGradient.selectAll("stop")
            .data([
                {offset: "0%", color: colorScale(1)},
                {offset: "100%", color: colorScale(maxAttacks)}
            ])
            .enter().append("stop")
            .attr("offset", d => d.offset)
            .attr("stop-color", d => d.color);

        legendSvg.append("rect")
            .attr("width", legendWidth)
            .attr("height", legendHeight)
            .style("fill", "url(#legend-gradient)");

        legendSvg.append("text")
            .attr("x", 0)
            .attr("y", -4)
            .attr("fill", "#eaeaea")
            .attr("font-size", "10px")
            .text("Low Attacks");

        legendSvg.append("text")
            .attr("x", legendWidth)
            .attr("y", -4)
            .attr("fill", "#eaeaea")
            .attr("font-size", "10px")
            .attr("text-anchor", "end")
            .text("High Attacks");

        // Pan and Zoom interaction
        const zoom = d3.zoom()
            .scaleExtent([1, 8])
            .on("zoom", function() {
                mapGroup.attr("transform", d3.event.transform);
            });

        svg2.call(zoom);
    });

    // --- CHART 3: Parallel Coordinates Plot (Focus View) ---
    // Shows relationships between year, casualties, attack type, and region
    // for the 500 deadliest attacks

    // Sort by kills descending and take top 500
    const pcpData = rawData
        .filter(d => +d.nkill > 0)
        .sort((a, b) => +b.nkill - +a.nkill)
        .slice(0, 500)
        .map(d => ({
            year: +d.iyear,
            killed: +d.nkill || 0,
            wounded: +d.nwound || 0,
            attacktype: d.attacktype1_txt,
            region: d.region_txt
        }));

    const margin3 = {top: 50, right: 120, bottom: 50, left: 60};
    const w3 = width3 - margin3.left - margin3.right;
    const h3 = height3 - margin3.top - margin3.bottom;

    const svg3 = d3.select("#chart3")
        .append("svg")
        .attr("width", width3)
        .attr("height", height3)
        .append("g")
        .attr("transform", `translate(${margin3.left}, ${margin3.top})`);

    // Chart title
    svg3.append("text")
        .attr("x", w3 / 2)
        .attr("y", -25)
        .attr("text-anchor", "middle")
        .attr("fill", "#eaeaea")
        .attr("font-size", "14px")
        .style("font-weight", "600")
        .text("Top 500 Deadliest Attacks — Parallel Coordinates");

    // Five dimensions shown across the parallel axes
    const dimensions = ["year", "killed", "wounded", "attacktype", "region"];

    // Each dimension gets its own scale
    const scales = {};

    scales["year"] = d3.scaleLinear()
        .domain(d3.extent(pcpData, d => d.year))
        .range([h3, 0]);

    scales["killed"] = d3.scaleLinear()
        .domain([0, d3.max(pcpData, d => d.killed)])
        .range([h3, 0]);

    scales["wounded"] = d3.scaleLinear()
        .domain([0, d3.max(pcpData, d => d.wounded)])
        .range([h3, 0]);

    // scalePoint maps categorical values to evenly spaced positions
    scales["attacktype"] = d3.scalePoint()
        .domain([...new Set(pcpData.map(d => d.attacktype))])
        .range([h3, 0]);

    scales["region"] = d3.scalePoint()
        .domain([...new Set(pcpData.map(d => d.region))])
        .range([h3, 0]);

    // Color lines by region for easier pattern recognition
    const regionColor = d3.scaleOrdinal()
        .domain([...new Set(pcpData.map(d => d.region))])
        .range(d3.schemeTableau10);

    // Evenly space the 5 axes across the chart width
    const x3 = d3.scalePoint()
        .domain(dimensions)
        .range([0, w3]);

    // Each line connects one attack across all 5 axes
    function pcpPath(d) {
        return d3.line()(dimensions.map(dim => [x3(dim), scales[dim](d[dim])]));
    }

    // Draw one polyline per attack colored by region
    pcpLines = svg3.selectAll(".pcp-line")
        .data(pcpData)
        .enter()
        .append("path")
        .attr("class", "pcp-line")
        .attr("d", pcpPath)
        .attr("fill", "none")
        .attr("stroke", d => regionColor(d.region))
        .attr("stroke-width", 1.2)
        .attr("opacity", 0.6);

    // Draw a vertical axis for each dimension
    const axes = svg3.selectAll(".dimension")
        .data(dimensions)
        .enter()
        .append("g")
        .attr("class", "dimension")
        .attr("transform", d => `translate(${x3(d)}, 0)`);

    axes.each(function(dim) {
        d3.select(this).call(d3.axisLeft(scales[dim]).ticks(5));
    });

    // Axis labels above each vertical axis
    axes.append("text")
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .attr("fill", "#eaeaea")
        .attr("font-size", "12px")
        .text(d => ({
            year: "Year",
            killed: "Killed",
            wounded: "Wounded",
            attacktype: "Attack Type",
            region: "Region"
        })[d]);

    // Style all axis text and lines to match dark theme
    svg3.selectAll(".dimension text")
        .attr("fill", "#eaeaea");

    svg3.selectAll(".dimension line, .dimension path")
        .attr("stroke", "#eaeaea");

    // Region color legend spread across full chart width
    const regions = [...new Set(pcpData.map(d => d.region))];
    const legend3 = svg3.append("g")
        .attr("transform", `translate(0, ${h3 + 20})`);

    regions.forEach((region, i) => {
        const col = i % 10;
        const row = Math.floor(i / 10);

        legend3.append("rect")
            .attr("x", col * (w3 / 10))
            .attr("y", row * 18)
            .attr("width", 12)
            .attr("height", 12)
            .attr("fill", regionColor(region));

        legend3.append("text")
            .attr("x", col * (w3 / 10) + 16)
            .attr("y", row * 18 + 10)
            .attr("fill", "#eaeaea")
            .attr("font-size", "10px")
            .text(region);
    });

    // Tooltip for PCP lines
    const tooltip3 = d3.select("body")
        .append("div")
        .style("position", "absolute")
        .style("background", "#2b2b2b")
        .style("color", "#eaeaea")
        .style("padding", "8px 12px")
        .style("border-radius", "6px")
        .style("border", "1px solid #4169e1")
        .style("font-size", "12px")
        .style("font-family", "'Montserrat', sans-serif")
        .style("font-weight", "400")
        .style("pointer-events", "none")
        .style("opacity", 0);

    // Track selected line
    let selectedLine = null;

    // Add mouse events to each line
    svg3.selectAll(".pcp-line")
        .on("mouseover", function(d) {
            // Only highlight if not already selected
            if (selectedLine !== this) {
                d3.select(this)
                    .transition().duration(200)
                    .attr("stroke-width", 3)
                    .attr("opacity", 1);
            }
            tooltip3.style("opacity", 1)
                .html(`Year: ${d.year}<br>
                       Killed: ${d.killed.toLocaleString()}<br>
                       Wounded: ${d.wounded.toLocaleString()}<br>
                       Attack: ${d.attacktype}<br>
                       Region: ${d.region}`);
        })
        .on("mousemove", function() {
            tooltip3
                .style("left", (d3.event.pageX + 12) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            // Only reset if not selected
            if (selectedLine !== this) {
                d3.select(this)
                    .transition().duration(200)
                    .attr("stroke-width", 1.2)
                    .attr("opacity", 0.6);
            }
            tooltip3.style("opacity", 0);
        })
        .on("click", function(d) {
            // If clicking the already selected line, deselect it
            if (selectedLine === this) {
                d3.select(this)
                    .transition().duration(200)
                    .attr("stroke-width", 1.2)
                    .attr("opacity", 0.6);
                selectedLine = null;
                return;
            }

            // Reset previously selected line
            if (selectedLine) {
                d3.select(selectedLine)
                    .transition().duration(200)
                    .attr("stroke-width", 1.2)
                    .attr("opacity", 0.6);
            }

            // Highlight clicked line and dim all others
            selectedLine = this;
            svg3.selectAll(".pcp-line")
                .transition().duration(200)
                .attr("opacity", 0.1);

            d3.select(this)
                .transition().duration(200)
                .attr("stroke-width", 3)
                .attr("opacity", 1);
        });

// Updates map colors and PCP lines based on selected year range
    function updateCharts(selectedYears) {

        // Filter raw data to only selected years
        const filteredData = rawData.filter(d => selectedYears.includes(String(d.iyear)));

        // Recount attacks per country for filtered data
        const filteredByCountry = d3.nest()
            .key(d => d.country_txt)
            .rollup(v => ({
                attacks: v.length,
                casualties: d3.sum(v, d => (+d.nkill || 0) + (+d.nwound || 0))
            }))
            .object(filteredData);

        // Animate map colors to reflect filtered data
        if (mapPaths) {
            mapPaths.transition()
                .duration(600)
                .attr("fill", function(d) {
                    const geoName = d.properties.name;
                    const dataName = nameMap.hasOwnProperty(geoName) ? nameMap[geoName] : geoName;
                    const country = dataName ? filteredByCountry[dataName] : null;
                    return country ? colorScale(country.attacks) : "#3a3a3a";
                });
        }


        // Fade out lines not in selected years, fade in lines that are
        if (pcpLines) {
            pcpLines.transition()
                .duration(600)
                .attr("opacity", d => selectedYears.includes(String(d.year)) ? 0.6 : 0.05);
        }
    }
});
