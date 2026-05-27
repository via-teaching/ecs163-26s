console.log("Main Js Loaded");
const svg = d3.select("#dashboard");
const width = window.innerWidth;
const height = window.innerHeight;
const sectionHeight = height / 3;
const margin = { top: 40, right: 50, bottom: 50, left: 60 };
d3.csv("mxmh_survey_results.csv").then(data => {
    console.log("DATA Loaded");
    console.log(Object.keys(data[0]));
    data.forEach(d => {
        d.anxiety = +d["Anxiety"];
        d.depression = +d["Depression"];
        d.insomnia = +d["Insomnia"];
        d.ocd = +d["OCD"];
        d.hours = +d["Hours per day"];
        d.age = +d["Age"]
    });
    drawHistogram(data);
    drawScatter(data);
    drawParallel(data);
});
function drawHistogram(data) {

    const dims = {
        x: "Anxiety",
        y: "count"
    };

    const values = data.map(d => d.anxiety);

    const bins = d3.histogram()
        .domain([0, 10])
        .thresholds(10)(values);

    const x = d3.scaleLinear()
        .domain([0, 10])
        .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(bins, d => d.length)])
        .range([sectionHeight - margin.bottom, margin.top]);

    const g = svg.append("g")
        .attr("transform", `translate(0,0)`);

    g.selectAll("rect")
        .data(bins)
        .enter()
        .append("rect")
        .attr("x", d => x(d.x0))
        .attr("y", d => y(d.length))
        .attr("width", d => x(d.x1) - x(d.x0) - 2)
        .attr("height", d => sectionHeight - margin.bottom - y(d.length))
        .attr("fill", "steelblue");

    g.append("g")
        .attr("transform", `translate(0,${sectionHeight - margin.bottom})`)
        .call(d3.axisBottom(x));

    g.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));

    g.append("text")
        .attr("x", width / 2)
        .attr("y", 25)
        .attr("text-anchor", "middle")
        .text("Anxiety Distribution");
    g.append("rect")
        .attr("x", width - 160)
        .attr("y", 20)
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", "steelblue");
    g.append("text")
        .attr("x", width - 140)
        .attr("y", 30)
        .text("Count of respondents")
        .style("font-size", "12px");
}

function drawScatter(data) {

    const x = d3.scaleLinear()
        .domain(d3.extent(data, d => d.hours))
        .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
        .domain(d3.extent(data, d => d.anxiety))
        .range([sectionHeight - margin.bottom, margin.top]);

    const g = svg.append("g")
        .attr("transform", `translate(0,${sectionHeight})`);

    g.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", d => x(d.hours))
        .attr("cy", d => y(d.anxiety))
        .attr("r", 3)
        .attr("fill", "orange")
        .attr("opacity", 0.6);

    g.append("g")
        .attr("transform", `translate(0,${sectionHeight - margin.bottom})`)
        .call(d3.axisBottom(x));

    g.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));

    g.append("text")
        .attr("x", width / 2)
        .attr("y", 25)
        .attr("text-anchor", "middle")
        .text("Hours per Day vs Anxiety");
    g.append("circle")
        .attr("cx", width - 154)
        .attr("cy", 25)
        .attr("r", 5)
        .attr("fill", "orange")
        .attr("opacity", 0.6);
    g.append("text")
        .attr("x", width - 140)
        .attr("y", 30)
        .text("Hours vs Anxiety")
        .style("font-size", "12px");
}

function drawParallel(data) {

    const dimensions = ["anxiety", "depression", "insomnia", "ocd", "hours", "age"];

    const x = d3.scalePoint()
        .domain(dimensions)
        .range([margin.left, width - margin.right]);

    const y = {};

    dimensions.forEach(dim => {
        y[dim] = d3.scaleLinear()
            .domain(d3.extent(data, d => d[dim]))
            .range([sectionHeight - margin.bottom, margin.top]);
    });

    function path(d) {
        return d3.line()(dimensions.map(p => {
            return [x(p), y[p](d[p])];
        }));
    }

    const g = svg.append("g")
        .attr("transform", `translate(0,${sectionHeight * 2})`);

    g.selectAll("path")
        .data(data)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("opacity", 0.15);

    const axis = g.selectAll(".axis")
        .data(dimensions)
        .enter()
        .append("g")
        .attr("transform", d => `translate(${x(d)},0)`)
    axis.each(function (d) {
        d3.select(this).call(d3.axisLeft(y[d]));
    });
    axis.append("text")
        .attr("y", margin.bottom + 200)
        .attr("text-anchor", "middle")
        .attr("fill", "black")
        .text(d => {
            if (d === "anxiety") return "Anxiety";
            if (d === "depression") return "Depression";
            if (d === "insomnia") return "Insomnia";
            if (d === "ocd") return "OCD";
            if (d === "hours") return "Hours per Day";
            if (d === "age") return "Age";
            return d;
        });
    g.append("text")
        .attr("x", width / 2)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .text("Multidimensional Mental Health Patterns");
    g.append("line")
        .attr("x1", width - 230)
        .attr("x2", width - 210)
        .attr("y1", 25)
        .attr("y2", 25)
        .attr("stroke", "steelblue")
        .attr("opacity", 0.4);
    g.append("text")
        .attr("x", width - 200)
        .attr("y", 30)
        .text("Individual mental health profiles")
        .style("font-size", "12px");
}