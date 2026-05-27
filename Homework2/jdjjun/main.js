let abFilter = 25;
const width = window.innerWidth;
const height = window.innerHeight;

let scatterLeft = 0, scatterTop = 0;
let scatterMargin = {top: 10, right: 30, bottom: 30, left: 60},
    scatterWidth = 400 - scatterMargin.left - scatterMargin.right,
    scatterHeight = 350 - scatterMargin.top - scatterMargin.bottom;

let distrLeft = 550, distrTop = 0;
let distrMargin = {top: 10, right: 30, bottom: 30, left: 60},
    distrWidth = 500 - distrMargin.left - distrMargin.right,
    distrHeight = 300 - distrMargin.top - distrMargin.bottom;

let teamLeft = 0, teamTop = 400;
let teamMargin = {top: 10, right: 30, bottom: 30, left: 60},
    teamWidth = width - teamMargin.left - teamMargin.right,
    teamHeight = height-450 - teamMargin.top - teamMargin.bottom;

// plots
d3.csv("mxmh_survey_results.csv").then(rawData => {
    const cleanData = rawData.filter(d => d["Fav genre"] && d["Fav genre"] !== "");

    // d3.nest() so that I can group by data and then calculate a count
    // of votes by the participants
    let initialCounts = d3.nest()
    .key(d => d["Fav genre"])
    .rollup(v => v.length)
    .entries(cleanData)
    .sort((a, b) => b.value - a.value);

    // Get the names of the bottom 3
    const bottomThree = initialCounts.slice(-3).map(d => d.key);

    // New data getting rid of bottom
    const newData = cleanData.map(d => {
        let genre = d["Fav genre"];
        if (bottomThree.includes(genre)) {
            genre = "Others"; // Rename tiny genres to "Others"
        }
        return { ...d, "Fav genre": genre };
    });

    const genreCounts = d3.nest()
        .key(d => d["Fav genre"])
        .rollup(v => v.length)
        .entries(newData) // Use collapsedData here
        .sort((a, b) => b.value - a.value);

    // d3.select() crreate the d3 selection object
    const svg = d3.select("svg");
    // d3.scaleOrdinal() allows me to pick colors for my pie chart

    const color = d3.scaleOrdinal(d3.schemeTableau10);
    //Create the pie chart radius
    const radius = Math.min(scatterWidth, scatterHeight) / 2;


    // Create a container using the calculated coordinates of the pie
    const gPie = svg.append("g")
        .attr("transform", `translate(${scatterMargin.left + radius}, ${scatterMargin.top + radius + 30})`);

    // d3.pie() was used so that I could changed the end angles for each slice
    // I could get rid of spaces to make the small genres more visible
    const pie = d3.pie()
        .value(d => d.value)
        .padAngle(0); 

    // d3.arc() creates the full pie and gets rid of the donut hole
    const arc = d3.arc()
        .innerRadius(0) 
        .outerRadius(radius);
    
    // bind data and draw svg elements
    const slices = gPie.selectAll(".arc")
        .data(pie(genreCounts))
        .enter().append("g");

    //append the paths and remove borders
    slices.append("path")
        .attr("d", arc)
        .attr("fill", d => color(d.data.key))
        .attr("stroke", "none"); 


    //Create Label arc so that I can control, label placements within the circle
    const labelArc = d3.arc()
        .innerRadius(radius * 0.93) 
        .outerRadius(radius * 0.93);

    // calculate the center point of slice for text placements
    slices.append("text")
        .attr("transform", d => {
            const pos = labelArc.centroid(d);
            const index = d.index + 1;

            if (index === 15) {
                pos[1] += 20; 
            }

            return `translate(${pos})`;
        })
        .attr("dy", ".35em")
        .style("text-anchor", "middle")
        .style("font-weight", "bold")
        .style("font-size", "13px")
        .style("fill", "black") 
        .style("pointer-events", "none") 
        .style("pointer-events", "none") 
        .text((d, i) => i + 1);
    

    // Create legend on the right side of the pie chart
    const legend = svg.append("g")
        .attr("transform", `translate(${scatterMargin.left + (radius * 2) + 20}, ${scatterMargin.top + 30})`);

    genreCounts.forEach((d, i) => {
        const legendRow = legend.append("g")
            .attr("transform", `translate(0, ${i * 18})`);

        legendRow.append("rect")
            .attr("width", 12)
            .attr("height", 12)
            .attr("fill", color(d.key));

        legendRow.append("text")
            .attr("x", 20)
            .attr("y", 11)
            .style("font-size", "12px")
            .text(`${i + 1}. ${d.key} (${d.value})`);
    });

    // Title for Pie Chart
    svg.append("text")
        .attr("x", scatterMargin.left)
        .attr("y", scatterMargin.top + 10)
        .style("font-weight", "bold")
        .text("Favourite Genres Reported by Participants");


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
                "Improve": v.filter(d => d["Music effects"] === "Improve").length / total,
                "No effect": v.filter(d => d["Music effects"] === "No effect").length / total,
                "Worsen": v.filter(d => d["Music effects"] === "Worsen").length / total
            };
        })
        .entries(newData)
        .map(d => ({ "Genre": d.key, ...d.value }))
        .sort((a, b) => d3.ascending(a.Genre, b.Genre));

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
            .range(["#0fb807", "#c6d00e", "#c01818"]);

    // Create chart container
    const gBar = svg.append("g")
        .attr("transform", `translate(${distrLeft + 50}, ${distrTop + 50})`);

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
        .attr("x", distrLeft + 10)
        .attr("y", distrTop + 20)
        .style("font-weight", "bold")
        .style("font-size", "18px")
        .text("Does Listening To Music Improve Mental Health?");

    // x axis label
    gBar.append("text")
    .attr("x", distrWidth / 2)
    .attr("y", distrHeight +50)
    .style("font-weight", "bold")
    .attr("font-size", "14px")
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

    effectCategories.forEach((cat, i) => {
        const row = barlegend.append("g").attr("transform", `translate(0, ${i * 20})`);
        row.append("rect").attr("width", 15).attr("height", 15).attr("fill", effectColors(cat));
        row.append("text").attr("x", 20).attr("y", 12).text(cat).style("font-size", "12px");
    });


    //star diagram
    
    const categories = ["Anxiety", "Depression", "Insomnia", "OCD"];
    const maxValue = 10;
    const radarRadius = 32; 
    const angleSlice = (Math.PI * 2) / categories.length;
    
    const totalGenres = genreCounts.length;
    const chartsPerRow = Math.ceil(totalGenres / 2); 
    const chartPaddingX = 150; 
    const chartPaddingY = 150; 

    const rScale = d3.scaleLinear()
        .domain([0, maxValue])
        .range([0, radarRadius]);

    // d3.curveLinearClosed() used to create a radial line and close the path
    // as well as determine the direction
    const radarLine = d3.lineRadial()
        .radius(d => rScale(d.value))
        .angle((d, i) => i * angleSlice)
        .curve(d3.curveLinearClosed);

    const smallMultiplesG = svg.append("g")
        .attr("transform", `translate(${teamMargin.left + 30}, ${teamTop + 50})`);

    //d3.mean() used to calculate the average of each genre category
    genreCounts.forEach((genreObj, index) => {
        const genreName = genreObj.key;
        const genreData = newData.filter(d => d["Fav genre"] === genreName);
        
        const radarData = categories.map(key => ({
            axis: key,
            value: d3.mean(genreData, d => +d[key]) || 0
        }));

        const row = Math.floor(index / chartsPerRow);
        const col = index % chartsPerRow;
        const tx = col * chartPaddingX;
        const ty = row * chartPaddingY;

        const gInner = smallMultiplesG.append("g")
            .attr("transform", `translate(${tx}, ${ty})`);

        // Chose two levels, to show midpoint easier
        const levels = 2;
        for (let j = 0; j < levels; j++) {
            const r = radarRadius * ((j + 1) / levels);
            gInner.append("circle")
                .attr("r", r)
                .attr("fill", "none")
                .attr("stroke", "#7b5f5f")
                .attr("stroke-width", "0.5px");
        }

        // Create the star shape
        gInner.append("path")
            .datum(radarData)
            .attr("d", radarLine)
            .attr("fill", color(genreName))
            .attr("fill-opacity", 0.5)
            .attr("stroke", color(genreName))
            .attr("stroke-width", 1.5);

        // Label each circle
        categories.forEach((cat, i) => {
            const angle = angleSlice * i - Math.PI / 2;
            const x = (radarRadius + 3) * Math.cos(angle);
            const y = (radarRadius + 3) * Math.sin(angle);

            gInner.append("text")
                .attr("x", x)
                .attr("y", y)
                // Used Ai For this part
                .attr("text-anchor", Math.abs(x) < 5 ? "middle" : (x > 0 ? "start" : "end"))
                .attr("dy", y > 5 ? "0.8em" : (y < -5 ? "0em" : "0.35em"))
                .style("font-size", "9px")
                .style("fill", "#666")
                .text(cat);
        });

        // Add Genre Names
        gInner.append("text")
            .attr("y", radarRadius + 35) 
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .style("font-weight", "bold")
            .style("fill", "#222")
            .text(genreName);
    });

    // Add Title
    svg.append("text")
        .attr("x", teamMargin.left)
        .attr("y", teamTop - 20)
        .style("font-weight", "bold")
        .style("font-size", "16px")
        .text("Mean of Mental Health Survey On A Scale of 1-10 Based On Different Music Genre Lovers");
    

    }).catch(function(err){
    console.log(err);
});