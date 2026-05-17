//used genai to generate sample code
//Margins and dimensions for chart 2
const margin_c2 = { top: 50, right: 30, bottom: 110, left: 80 };
const width_c2  = width * 0.48 - margin_c2.left - margin_c2.right;
const height_c2 = height * 0.44 - margin_c2.top - margin_c2.bottom;

//Horizontal offset: push chart 2 to the right half of the screen
const left_c2 = width * 0.52;

//Append <g> for chart 2
const g2 = svg.append("g")
    .attr("transform", `translate(${left_c2 + margin_c2.left}, ${margin_c2.top})`);

//shorten csv cols
const questions = [
    { col:   "Do you feel that the fitness wearable has improved your overall well-being?",
        label: "Overall\nWell-being" },
    { col:   "Has using a fitness wearable influenced your decision? [To exercise more?]",
        label: "Exercise\nMore" },
    { col:   "Has using a fitness wearable influenced your decision? [To purchase other fitness-related products?]",
        label: "Buy Fitness\nProducts"},
    { col:   "Has using a fitness wearable influenced your decision? [To join a gym or fitness class?]",
        label: "Join Gym /\nFitness Class" },
    { col:   "Has using a fitness wearable influenced your decision? [To change your diet?]",
        label: "Change\nDiet" }
];

//Short labels for X axis (split on \n handled via tspan below)
const question_labels = questions.map(q => q.label);

//answer -> score mapping
const answer_scores = {
    "Strongly disagree": 1,
    "Disagree":          2,
    "Neutral":           3,
    "Agree":             4,
    "Strongly agree":    5
};

//color scaling the heatmap
const color_scale = d3.scaleSequential()
    .domain([1, 5])
    .interpolator(d3.interpolateBlues);

//add csv
d3.csv("data/survey_605.csv").then(function(rawData) {

    //find avg score
    //averages[age][questionIndex] = { sum, count }
    const totals = {};
    order_age.forEach(age => {
        totals[age] = questions.map(() => ({ sum: 0, count: 0 }));
    });

    rawData.forEach(function(d) {
        const age = d["What is your age?"].trim();
        if (!totals[age]) return; //skip bad age groups

        questions.forEach(function(q, i) {
            const raw   = d[q.col] ? d[q.col].trim() : "";
            const score = answer_scores[raw];
            if (score !== undefined) {
                totals[age][i].sum   += score;
                totals[age][i].count += 1;
            }
        });
    });

    //flatten array for D3 
    const cell_data = [];
    order_age.forEach(age => {
        questions.forEach((q, i) => {
            const { sum, count } = totals[age][i];
            cell_data.push({
                age,
                quindex: i,
                avg: count > 0 ? sum / count : null 
            });
        });
    });

    //x & y scale
    const x = d3.scaleBand()
        .domain(d3.range(questions.length))
        .range([0, width_c2])
        .padding(0.05);
    const y = d3.scaleBand()
        .domain(order_age)
        .range([0, height_c2])
        .padding(0.05);
    

    //drawing cells
    g2.selectAll(".heatmap-cell")
        .data(cell_data)
        .enter()
        .append("rect")
        .attr("class", "heatmap-cell")
        .attr("x", d => x(d.quindex))
        .attr("y", d => y(d.age))
        .attr("width",  x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("fill", d => d.avg !== null ? color_scale(d.avg) : "#ffffff");

    //draw avg in cell
    g2.selectAll(".cell-label")
        .data(cell_data)
        .enter()
        .append("text")
        .attr("class", "cell-label")
        .attr("x", d => x(d.quindex) + x.bandwidth() / 2)
        .attr("y", d => y(d.age) + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        //use white or black based on cell color for max vis
        .attr("fill", d => d.avg !== null && d.avg > 3.5 ? "#ffffff" : "#000000") 
        .text(d => d.avg !== null ? d.avg.toFixed(1) : "-");


    //drawing x axis
    const xAxis = g2.append("g")
        .attr("transform", `translate(0, ${height_c2})`);

    questions.forEach((q, i) => {
        const lines = q.label.split("\n");
        const xpos  = x(i) + x.bandwidth() / 2;

        //First line of label
        xAxis.append("text")
            .attr("x", xpos)
            .attr("y", 18)
            .attr("text-anchor", "middle")
            .attr("font-size", "11px")
            .attr("fill", "#333")
            .text(lines[0]);

        //Second line of label (if present)
        if (lines[1]) {
            xAxis.append("text")
                .attr("x", xpos)
                .attr("y", 32)
                .attr("text-anchor", "middle")
                .attr("font-size", "11px")
                .attr("fill", "#333")
                .text(lines[1]);
        }
    });

    //drawing y axiss
    g2.append("g")
        .call(d3.axisLeft(y).tickSize(0))

    //x & y & title  name
    g2.append("text")
        .attr("x", width_c2 / 2)
        .attr("y", height_c2 + 90)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .attr("fill", "#000000")
        .text("Wearable Influence Dimension");
    g2.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -(height_c2 / 2))
        .attr("y", -65)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .attr("fill", "#000000")
        .text("Age Group");
    g2.append("text")
        .attr("x", width_c2 / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .attr("font-size", "15px")
        .attr("font-weight", "bold")
        .attr("fill", "#000000")
        .text("Avg. Wearable Influence Score by Age Group");

    //legend scaling
    const legend_width  = 120;
    const legend_height = 10;

    //legend positioning
    const legendg = g2.append("g")
        .attr("transform", `translate(${width_c2 - legend_width}, -25)`);

    //build legend gradient
    const defs = svg.append("defs");
    const linear_gradient = defs.append("linearGradient")
        .attr("id", "heatmap-gradient");

    linear_gradient.selectAll("stop")
        .data([
            { offset: "0%",   color: color_scale(1) },
            { offset: "50%",  color: color_scale(3) },
            { offset: "100%", color: color_scale(5) }
        ])
        .enter()
        .append("stop")
            .attr("offset", d => d.offset)
            .attr("stop-color", d => d.color);

    //build legend radient rectangle
    legendg.append("rect")
        .attr("width", legend_width)
        .attr("height", legend_height)
        .style("fill", "url(#heatmap-gradient)");

    //drawing the legend axises
    const legendScale = d3.scaleLinear()
        .domain([1, 5])
        .range([0, legend_width]);

    legendg.append("g")
        .attr("transform", `translate(0, ${legend_height})`)
        .call(d3.axisBottom(legendScale).ticks(5).tickSize(3))
        .select(".domain").remove();

    //legend title
    legendg.append("text")
        .attr("x", legend_width / 2)
        .attr("y", -4)
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("fill", "#000000")
        .text("Avg Score (1=Disagree, 5=Agree)");

}).catch(function(error) {
    console.log(error);
});