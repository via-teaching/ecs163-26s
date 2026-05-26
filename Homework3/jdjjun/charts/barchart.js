// barChart.js 
function drawBarChart(newData) {
    // d3.select() crreate the d3 selection object
    const svg = d3.select("svg");

    // Grouped Bar Chart
    const effectCategories = ["Improve", "No effect", "Worsen"];

    // d3.nest() was used in order to turn group everything. This would allow me to calculate the
    // percentages of every genre's votes of Improve, No effect, or Worsen
    // Also sorted all the countries alphabetically
    let effectData = d3.nest()
        .key(d => d["Fav genre"])
        .rollup(v => {
            const total = v.length;
            return {
                "Improve": v.filter(d => d["Music effects"] ==="Improve").length / total,
                "No effect": v.filter(d => d["Music effects"] === "No effect").length / total,
                "Worsen": v.filter(d => d["Music effects"] === "Worsen").length / total
            };
        })
        .entries(newData)
        .map(d => ({ "Genre": d.key, ...d.value }))
        .sort((a, b)=> d3.ascending(a.Genre, b.Genre));

    // Shorten Video Game music to just video game so it does not get clipped
    effectData.forEach(d => {
        if(d.Genre === "Video game music") d.Genre = "Video game";
    });

    // dr.scaleband() was used to create a scale for each of the genres
    // this allows me to map each domain into a physical part of the chart
    // and allows me to space each genre on the x-axis accordingly
    const x0 = d3.scaleBand()
        .domain(effectData.map(d => d.Genre))
        .range([0, distrWidth])
        .padding(0.2);

    // Same as above but to group different bar charts data for the same 
    // genre
    const x1 = d3.scaleBand()
        .domain(effectCategories)
        .range([0, x0.bandwidth()])
        .padding(0.05);

    // d3.scaleLinear() allows me to scale my percentages from 0-100%
    const y = d3.scaleLinear()
        .domain([0, 1]) 
        .range([distrHeight, 0]);

    // dr.scaleOrdinal(), allows me to choose the colors
    // Chose colors based on positive/negative connotations
    const effectColors = d3.scaleOrdinal()
        .domain(effectCategories)
        .range(["#2db42d", "#FFD700", "#FF3333"]);

    // Create chart container
    const gBar = svg.append("g")
        .attr("transform", `translate(${distrLeft + 50}, ${distrTop + 40})`);

    // Create elements for each group 
    const genreGroups = gBar.selectAll(".genre-group")
        .data(effectData)
        .enter().append("g")
        .attr("class", "genre-group")
        .attr("transform", d => `translate(${x0(d.Genre)}, 0)`);

    // Draw the actual bar graph
    genreGroups.selectAll("rect")
        .data(d => effectCategories.map(c => ({ key: c, value: d[c] })))
        .enter().append("rect")
        .attr("x", d => x1(d.key))
        .attr("y", d => y(d.value))
        .attr("width", x1.bandwidth())
        .attr("height", d => distrHeight - y(d.value))
        .attr("fill", d => effectColors(d.key));

    // Generate the bottom axis with d3.axisBottom()
    gBar.append("g")
        .attr("transform", `translate(0, ${distrHeight})`)
        .call(d3.axisBottom(x0))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end")
        .style("font-size", "10px");

    // Ensures it shows as percentage, d3axisLeft() generates the vertical axis
    gBar.append("g")
        .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(".0%"))); 

    //  Add a Legend to the right side of the graph
    const barlegend = gBar.append("g")
        .attr("transform", `translate(${distrWidth - 60}, -10)`);

    // Add Title to the Bar chart
    svg.append("text")
        .attr("class", "bar-chart-main-title")
        .attr("x", distrLeft + 10)
        .attr("y", distrTop + 27)
        .style("font-weight", "bold")
        .style("font-size", "16px")
        .text("Does Listening To Music Improve Mental Health?");

    // x axis label
    gBar.append("text")
        .attr("x", distrWidth / 2)
        .attr("y", distrHeight + 40)
        .style("font-weight", "bold")
        .attr("font-size", "11px")
        .attr("text-anchor", "middle")
        .text("Genres of Music");

    // Y label
    gBar.append("text")
        .attr("x", -(distrHeight / 2))
        .attr("y", -45)
        .style("font-weight", "bold")
        .attr("font-size", "14px")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text("Votes (%)");

    //Legend
    effectCategories.forEach((cat, i) => {
        const row = barlegend.append("g").attr("transform", `translate(0, ${i * 20})`);
        row.append("rect").attr("width", 15).attr("height", 15).attr("fill", effectColors(cat));
        row.append("text").attr("x", 20).attr("y", 12).text(cat).style("font-size", "12px");
    });
}