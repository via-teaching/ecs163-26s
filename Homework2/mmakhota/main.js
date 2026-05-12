const width = window.innerWidth;
const height = window.innerHeight;

// bar chart params
const barMargin = { top: 60, right: 40, bottom: 60, left: 60 };
const barWidth  = Math.round(width * 0.45) - barMargin.left - barMargin.right;
const barHeight = Math.round(height * 0.5) - barMargin.top - barMargin.bottom;

// pie chart params
const pieAreaX  = Math.round(width * 0.5);
const pieAreaW  = width - pieAreaX;
const pieAreaH  = Math.round(height * 0.5);
const pieRadius = Math.min(pieAreaW, pieAreaH) / 2 - 60;



// load data
d3.csv("pokemon.csv").then(rawData => {
    const svg = d3.select("svg");

    // count generations for bar
    const genCounts = d3.nest()
        .key(d => d.Generation)
        .rollup(v => v.length)
        .entries(rawData)
        .sort((a, b) => +a.key - +b.key);

    // Count types for pie
    const typeCounts = d3.nest()
        .key(d => d.Type_1)
        .rollup(v => v.length)
        .entries(rawData)
        .sort((a, b) => b.value - a.value);


    // colorization
    const colors = d3.schemeTableau10;

    /////////////////////// BAR CHART ///////////////////////
    const gBar = svg.append("g")
        .attr(
            "transform",
            `translate(${barMargin.left}, ${barMargin.top})`
        );

    // title
    gBar.append("text")
        .attr("x", barWidth / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .text("Pokemon Count by Generation");

    // x scale
    const x = d3.scaleBand()
        .domain(genCounts.map(d => d.key))
        .range([0, barWidth])
        .padding(0.2);

    // y scale
    const y = d3.scaleLinear()
        .domain([0, d3.max(genCounts, d => d.value)])
        .nice()
        .range([barHeight, 0]);

    // x axis
    gBar.append("g")
        .attr("transform", `translate(0, ${barHeight})`)
        .call(d3.axisBottom(x));

    // y axis
    gBar.append("g")
        .call(d3.axisLeft(y));

    // x label
    gBar.append("text")
        .attr("x", barWidth / 2)
        .attr("y", barHeight + 45)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .text("Generation");

    // y label
    gBar.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -barHeight / 2)
        .attr("y", -45)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .text("Number of Pokemon");

    // bars
    gBar.selectAll(".bar")
        .data(genCounts)
        .enter()
        .append("rect")
            .attr("class", "bar")
            .attr("x", d => x(d.key))
            .attr("y", d => y(d.value))
            .attr("width", x.bandwidth())
            .attr("height", d => barHeight - y(d.value))
            .attr("fill", (d, i) => colors[i % colors.length]);

    // bar labels
    gBar.selectAll(".bar-label")
        .data(genCounts)
        .enter()
        .append("text")
            .attr("class", "bar-label")
            .attr("x", d => x(d.key) + x.bandwidth() / 2)
            .attr("y", d => y(d.value) - 6)
            .attr("text-anchor", "middle")
            .attr("font-size", "11px")
            .attr("font-weight", "bold")
            .text(d => d.value);

    /////////////////////// PIE CHART ///////////////////////
    const gPie = svg.append("g")
        .attr(
            "transform",
            `translate(${pieAreaX + pieAreaW / 2}, ${pieAreaH / 2})`
        );

    // title
    gPie.append("text")
        .attr("x", 0)
        .attr("y", -(pieRadius + 22))
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .text("Pokemon Count by Type");

    // layup
    const pie = d3.pie()
        .value(d => d.value)
        .sort(null);

    // arcs
    const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(pieRadius);
    const arcLabel = d3.arc()
        .innerRadius(pieRadius * 0.65)
        .outerRadius(pieRadius * 0.65);

    // slice
    gPie.selectAll("path")
        .data(pie(typeCounts))
        .enter()
        .append("path")
            .attr("d", arc)
            .attr("fill", (d, i) => colors[i % colors.length])
            .attr("stroke", "white")
            .attr("stroke-width", 1.5);

    // labels
    gPie.selectAll(".pie-label")
        .data(pie(typeCounts))
        .enter()
        .append("text")
            .attr("class", "pie-label")
            .attr("transform", d => `translate(${arcLabel.centroid(d)})`)
            .attr("text-anchor", "middle")
            .attr("font-size", "11px")
            .attr("fill", "white")
            .attr("font-weight", "bold")
            .text(d => d.data.value);

    // legend
    const legX = pieRadius + 20;
    const legY = -(typeCounts.length * 20) / 2;

    // legend helper func
    typeCounts.forEach((d, i) => {
        const color = colors[i % colors.length];

        gPie.append("rect")
            .attr("x", legX)
            .attr("y", legY + i * 20)
            .attr("width", 14)
            .attr("height", 14)
            .attr("fill", color);
        gPie.append("text")
            .attr("x", legX + 20)
            .attr("y", legY + i * 20 + 11)
            .attr("font-size", "12px")
            .text(`${d.key} (${d.value})`);
    });
});