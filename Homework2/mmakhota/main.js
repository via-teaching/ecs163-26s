const width = window.innerWidth;
const height = window.innerHeight;

const barMargin = { top: 60, right: 40, bottom: 60, left: 60 };
const barWidth  = Math.round(width * 0.45) - barMargin.left - barMargin.right;
const barHeight = Math.round(height * 0.5) - barMargin.top - barMargin.bottom;

// load data
d3.csv("pokemon.csv").then(rawData => {
    const svg = d3.select("svg");

    // count generations
    const genCounts = d3.nest()
        .key(d => d.Generation)
        .rollup(v => v.length)
        .entries(rawData)
        .sort((a, b) => +a.key - +b.key);

    // colorization
    const colors = d3.schemeTableau10;

    // chart
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
});