const width = window.innerWidth;
const height = window.innerHeight;

d3.csv("data/globalterrorismdb_0718dist.csv").then(function(rawData) {

    // Convert year strings to numbers so D3 can scale them
    rawData.forEach(function(d) {
        d.iyear = +d.iyear;
    });

    // Group data by year and count attacks in each year
    const attacksByYear = d3.nest()
        .key(d => d.iyear)
        .rollup(v => v.length)
        .entries(rawData);

    // --- CHART 1: Bar Chart (Overview) ---
    // Shows the overall trend of attacks over time (1970-2017)

    const margin1 = {top: 30, right: 20, bottom: 80, left: 120};
    const w1 = (width * 0.50) - margin1.left - margin1.right;
    const h1 = (height * 0.42) - margin1.top - margin1.bottom;

    // SVG canvas for chart 1, placed in the #chart1 div
    const svg1 = d3.select("#chart1")
        .append("svg")
        .attr("width", width * 0.50)
        .attr("height", height * 0.42)
        .append("g")
        .attr("transform", `translate(${margin1.left}, ${margin1.top})`);

    // scaleBand spaces out the years evenly across the x axis
    const x1 = d3.scaleBand()
        .domain(attacksByYear.map(d => d.key))
        .range([0, w1])
        .padding(0.1);

    // Linear scale mapping attack count to pixel height
    const y1 = d3.scaleLinear()
        .domain([0, 20000])
        .range([h1, 0]);

    // Only show every 5th year label so they don't overlap
    svg1.append("g")
        .attr("transform", `translate(0, ${h1})`)
        .call(d3.axisBottom(x1).tickValues(
            x1.domain().filter((d, i) => i % 5 === 0)
        ))
        .select(".domain")
        .attr("stroke", "#eaeaea")
        .selectAll("text")
        .attr("fill", "#eaeaea");

    // Y axis with fixed tick intervals of 5000
    svg1.append("g")
        .call(d3.axisLeft(y1).tickValues([0, 5000, 10000, 15000, 20000]))
        .select(".domain")
        .attr("stroke", "#eaeaea")
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
        .attr("y", -15)
        .attr("text-anchor", "middle")
        .attr("fill", "#eaeaea")
        .attr("font-size", "16px")
        .style("font-weight", "600")
        .text("Terrorist Attacks per Year (1970–2017)");

    // X axis label
    svg1.append("text")
        .attr("x", w1 / 2)
        .attr("y", h1 + 45)
        .attr("text-anchor", "middle")
        .attr("fill", "#eaeaea")
        .attr("font-size", "13px")
        .text("Year");

    // Y axis label — rotated 90 degrees
    svg1.append("text")
        .attr("x", -(h1 / 2))
        .attr("y", -80)
        .attr("text-anchor", "middle")
        .attr("fill", "#eaeaea")
        .attr("font-size", "13px")
        .attr("transform", "rotate(-90)")
        .text("Number of Attacks");

    // Small legend in top left corner
    const legend1 = svg1.append("g")
        .attr("transform", `translate(10, 10)`);

    legend1.append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", "#4169e1");

    legend1.append("text")
        .attr("x", 20)
        .attr("y", 12)
        .attr("fill", "#eaeaea")
        .attr("font-size", "12px")
        .text("# of Attacks");

    // Tooltip div — hidden by default, appears on bar hover
    const tooltip = d3.select("body")
        .append("div")
        .style("position", "absolute")
        .style("background", "#2b2b2b")
        .style("color", "#eaeaea")
        .style("padding", "8px 12px")
        .style("border-radius", "6px")
        .style("border", "1px solid #4169e1")
        .style("font-size", "13px")
        .style("pointer-events", "none")
        .style("opacity", 0)
        .style("font-family", "'Montserrat', sans-serif")
        .style("font-weight", "400");

    // Highlight bar and show year/count on hover
    svg1.selectAll(".bar")
        .on("mouseover", function(d) {
            tooltip.style("opacity", 1)
                .html(`Year: ${d.key}<br>Attacks: ${d.value.toLocaleString()}`);
            d3.select(this).attr("fill", "#6a8ff5");
        })
        .on("mousemove", function() {
            tooltip
                .style("left", (d3.event.pageX + 12) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            tooltip.style("opacity", 0);
            d3.select(this).attr("fill", "#4169e1");
        });

    // --- CHART 2: Choropleth Map (Focus View) ---
    // Shows which countries had the most attacks geographically

    // Aggregate total attacks and casualties per country
    const attacksByCountry = d3.nest()
        .key(d => d.country_txt)
        .rollup(v => ({
            attacks: v.length,
            casualties: d3.sum(v, d => (+d.nkill || 0) + (+d.nwound || 0))
        }))
        .object(rawData);

    // Some country names differ between the GeoJSON and the dataset
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
    const w2 = (width * 0.50) - margin2.left - margin2.right;
    const h2 = (height * 0.42) - margin2.top - margin2.bottom;

    // SVG canvas for chart 2, overflow hidden to prevent map from spilling out
    const svg2 = d3.select("#chart2")
        .append("svg")
        .attr("width", width * 0.50)
        .attr("height", height * 0.42)
        .style("overflow", "hidden");

    const mapGroup = svg2.append("g");

    // Chart title drawn on top of the map
    svg2.append("text")
        .attr("x", (width * 0.50) / 2)
        .attr("y", 18)
        .attr("text-anchor", "middle")
        .attr("fill", "#eaeaea")
        .attr("font-size", "14px")
        .style("font-weight", "600")
        .text("Terrorist Attacks by Country (1970–2017)");

    const mapWidth = width * 0.50;
    const mapHeight = height * 0.42;

    // NaturalEarth projection gives a clean familiar world map shape
    const projection = d3.geoNaturalEarth1()
        .scale(mapWidth / 6)
        .translate([mapWidth / 2, mapHeight / 1.9]);

    const path = d3.geoPath().projection(projection);

    // Log scale so smaller countries are still visible
    // despite Iraq/Afghanistan dominating the raw counts
    const maxAttacks = d3.max(Object.values(attacksByCountry), d => d.attacks);
    const colorScale = d3.scaleSequentialLog()
        .domain([1, maxAttacks / 2])
        .interpolator(d3.interpolateBlues);

    // Tooltip for map — shows country name, attacks, and casualties
    const tooltip2 = d3.select("body")
        .append("div")
        .style("position", "absolute")
        .style("background", "#2b2b2b")
        .style("color", "#eaeaea")
        .style("padding", "8px 12px")
        .style("border-radius", "6px")
        .style("border", "1px solid #4169e1")
        .style("font-size", "13px")
        .style("font-family", "'Montserrat', sans-serif")
        .style("font-weight", "400")
        .style("pointer-events", "none")
        .style("opacity", 0);

    // Load GeoJSON shapes and draw each country as an SVG path
    d3.json("data/world.geojson").then(function(geoData) {

        svg2.selectAll("path")
            .data(geoData.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("fill", function(d) {
                // Use nameMap to reconcile naming differences between datasets
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
            .on("mouseout", function(d) {
                tooltip2.style("opacity", 0);
                d3.select(this).attr("stroke", "#1e1e1e").attr("stroke-width", 0.5);
            });

        // Gradient legend showing attack intensity from low to high
        const legendWidth = 400;
        const legendHeight = 10;

        const legendSvg = svg2.append("g")
            .attr("transform", `translate(20, ${mapHeight - 40})`);

        // Define gradient using the same color scale as the map
        const defs = svg2.append("defs");
        const linearGradient = defs.append("linearGradient")
            .attr("id", "legend-gradient");

        linearGradient.selectAll("stop")
            .data([
                {offset: "0%", color: colorScale(0)},
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
    });

    // --- CHART 3: Parallel Coordinates Plot (Focus View) ---
    // Shows relationships between year, casualties, attack type, and region
    // for the 500 deadliest attacks

    // Sort by kills descending and take the top 500
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

    const margin3 = {top: 80, right: 80, bottom: 60, left: 120};
    const w3 = width - margin3.left - margin3.right;
    const h3 = (height * 0.52) - margin3.top - margin3.bottom;

    const svg3 = d3.select("#chart3")
        .append("svg")
        .attr("width", width)
        .attr("height", height * 0.52)
        .append("g")
        .attr("transform", `translate(${margin3.left}, ${margin3.top})`);

    // Chart title
    svg3.append("text")
        .attr("x", w3 / 2)
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .attr("fill", "#eaeaea")
        .attr("font-size", "16px")
        .style("font-weight", "600")
        .text("Top 500 Deadliest Attacks — Parallel Coordinates");

    // Five dimensions shown across the parallel axes
    const dimensions = ["year", "killed", "wounded", "attacktype", "region"];

    // Each dimension gets its own scale — linear for numbers, point for categories
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

    // Each line connects one attack's values across all 5 axes
    function pcpPath(d) {
        return d3.line()(dimensions.map(dim => [x3(dim), scales[dim](d[dim])]));
    }

    // Draw one polyline per attack, colored by region
    svg3.selectAll(".pcp-line")
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

    // Style all axis text and lines to match the dark theme
    svg3.selectAll(".dimension text")
        .attr("fill", "#eaeaea");

    svg3.selectAll(".dimension line, .dimension path")
        .attr("stroke", "#eaeaea");

    // Region color legend spread across the full chart width
    const regions = [...new Set(pcpData.map(d => d.region))];
    const legend3 = svg3.append("g")
        .attr("transform", `translate(20, 0)`);

    regions.forEach((region, i) => {
        const col = i % 5;
        const row = Math.floor(i / 5);

        legend3.append("rect")
            .attr("x", col * 300)
            .attr("y", h3 + 15 + row * 18)
            .attr("width", 12)
            .attr("height", 12)
            .attr("fill", regionColor(region));

        legend3.append("text")
            .attr("x", col * 300 + 16)
            .attr("y", h3 + 25 + row * 18)
            .attr("fill", "#eaeaea")
            .attr("font-size", "10px")
            .text(region);
    });

});