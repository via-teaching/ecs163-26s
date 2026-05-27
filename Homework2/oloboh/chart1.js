//used genai to generate sample code
const width = window.innerWidth;
const height = window.innerHeight;

//Margins and dimensions for chart 1
const margin_c1 = { top: 50, right: 30, bottom: 80, left: 70 };
const width_c1  = width * 0.48 - margin_c1.left - margin_c1.right;
const height_c1 = height * 0.44 - margin_c1.top - margin_c1.bottom;

//ordering age group
const order_age = ["Under 18", "18-24", "25-34", "35-44", "45-54", "55-64"];

//exercise frequency order
const order_freq = [
    "Less than once a week",
    "1-2 times a week",
    "3-4 times a week",
    "5 or more times a week"
];

//color scaling based on freq
const color_freq = d3.scaleOrdinal()
    .domain(order_freq)
    .range(["#c6dbef", "#6baed6", "#2171b5", "#084594"]);

//Select the main SVG element that fills the page
const svg = d3.select("svg");

//Append a <g> group for chart 1, offset by margins
const g1 = svg.append("g")
    .attr("transform", `translate(${margin_c1.left}, ${margin_c1.top})`);

//load in csv
d3.csv("data/survey_605.csv").then(function(rawData) {

    
    //map col names to shorter names
    const data = rawData.map(d => ({
        age:  d["What is your age?"].trim(),
        freq: d["How often do you exercise in a week?"].trim()
    }));

    //make counts for each age group
    const counts = {};
    order_age.forEach(age => {
        counts[age] = {};
        order_freq.forEach(freq => { counts[age][freq] = 0; });
    });

    data.forEach(d => {
        //Only count rows with recognized age and freq values
        if (counts[d.age] !== undefined && counts[d.age][d.freq] !== undefined) {
            counts[d.age][d.freq]++;
        }
    });

    //flatten counts for d3
    const flat_data = [];
    order_age.forEach(age => {
        order_freq.forEach(freq => {
            flat_data.push({ age, freq, count: counts[age][freq] });
        });
    });

    //x0,1 scaling
    const x0 = d3.scaleBand()
        .domain(order_age)
        .range([0, width_c1])
        .paddingInner(0.25)
        .paddingOuter(0.1);
    const x1 = d3.scaleBand()
        .domain(order_freq)
        .range([0, x0.bandwidth()])
        .padding(0.08);

    //y scaling
    const y = d3.scaleLinear()
        .domain([0, d3.max(flat_data, d => d.count)])
        .range([height_c1, 0])

    //draw x,y  axis
    g1.append("g")
        .attr("transform", `translate(0, ${height_c1})`)
        .call(d3.axisBottom(x0))
        .selectAll("text")
        .attr("dy", "1em")
        .style("font-size", "12px");
    g1.append("g")
        .call(d3.axisLeft(y).ticks(5));

    //draw axis labels
    g1.append("text")
        .attr("x", width_c1 / 2)
        .attr("y", height_c1 + 55)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .attr("fill", "#000000")
        .text("Age Group");
    g1.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -(height_c1 / 2))
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .attr("fill", "#000000")
        .text("Number of Respondents");

    //title
    g1.append("text")
        .attr("x", width_c1 / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .attr("font-size", "15px")
        .attr("font-weight", "bold")
        .attr("fill", "#000000")
        .text("Exercise Frequency by Age Group");

    //draw bars
    const age_groups = g1.selectAll(".age-group")
        .data(order_age)
        .enter()
        .append("g")
        .attr("class", "age-group")
        .attr("transform", d => `translate(${x0(d)}, 0)`);

    //draw freq's per category
    age_groups.selectAll("rect")
        .data(age => order_freq.map(freq => ({ freq, count: counts[age][freq] })))
        .enter()
        .append("rect")
        .attr("x", d => x1(d.freq))
        .attr("y", d => y(d.count))
        .attr("width", x1.bandwidth())
        .attr("height", d => height_c1 - y(d.count))
        .attr("fill", d => color_freq(d.freq));

    //legend for freqs
    const legend = g1.append("g")
        .attr("transform", `translate(${width_c1 - 200}, 0)`);

    order_freq.forEach((freq, i) => {
        legend.append("rect")
            .attr("x", 0)
            .attr("y", i * 20)
            .attr("width", 14)
            .attr("height", 14)
            .attr("fill", color_freq(freq));

        //label texts
        const label = [
            "< 1x / week",
            "1–2x / week",
            "3–4x / week",
            "5+x / week"
        ][i];

        legend.append("text")
            .attr("x", 20)
            .attr("y", i * 20 + 11)
            .attr("font-size", "11px")
            .attr("fill", "#333")
            .text(label);
    });

}).catch(function(error) {
    console.log(error);
});