
// main.js 
// Music & Mental Health Survey Dashboard 
// ECS 163 HW 2 

// The three visuals I chose to explain how music listening habits relate to mental health
// 1. Bar Chart: Showcases an overview of favorite genre counts
// 2. Scatter Plot: Displays hour/day vs anxiety (colored by music effect)
// 3. Parallel coordinates (advanced visual): Displays a multi-dim on mental health view


// tooltip that appears on hover for all visuals
const tooltip = d3.select("#tooltip");


// position and displays the tooltip with given HTML content
function showTip(html, event) {
    tooltip.html(html)
        .style("opacity", 1)
        .style("left", (event.clientX + 14) + "px") // this offsets right of cursor
        .style("top", (event.clientY - 28) + "px"); // offset above cursor
}

// hides the tooltip when the mouse leaves the element
function hideTip() {
    tooltip.style("opacity", 0);
}

// Pastel colors for music effect (scatter plot)
const effectColor = {
    "Improve":   "#a8d8b9", // mint green for positive effect
    "No effect": "#c9bfda", // lavender grey for neutral effect
    "Worsen":    "#f4a7b9"  // blush pink = negative effect
};

// Load CSVs and draws all three visual once data is ready
d3.csv("data/mxmh_survey_results.csv").then(function(rawData) {

    // for data cleaning
    // converts the numeric columns from strings to numbers
    // D3 loads all CSV values as strings by default 
    rawData.forEach(function(d) {
        d.Age              = +d.Age;
        d["Hours per day"] = +d["Hours per day"];
        d.Anxiety          = +d.Anxiety;
        d.Depression       = +d.Depression;
        d.Insomnia         = +d.Insomnia;
        d.OCD              = +d.OCD;
        d.BPM              = +d.BPM;
    });

    // removes rows with missing critical fields such as genre, music effect, age, etc
    // important for all three visuals to work
    const data = rawData.filter(function(d) {
        return d["Fav genre"] && d["Music effects"] &&
               !isNaN(d.Age) && !isNaN(d["Hours per day"]) &&
               !isNaN(d.Anxiety);
    });

    console.log("Cleaned data rows:", data.length);

    // This draws all three visuals using the cleaned data
    drawBarChart(data);
    drawScatter(data);
    drawParallel(data);

}).catch(function(error) {
    console.error("Error loading CSV:", error);
});
// of the CSV fails to load, it will log an error so I can debug
// Bar Chart: Favorite Genre Distribution

//Purpose: lets the users see which genres are most popular before diving into the details
function drawBarChart(data) {

    // Counts how many respondents listed each genre as their favorite
    // d3.rollup groups the data by genre and counts rows in each group
    const genreCounts = d3.rollup(
        data,
        v => v.length, // counts row in each group
        d => d["Fav genre"] // group by favorite genre
    );

    // BUG FIX: was ([genreCounts, count]) which caused a crash
    // Converts the map to a sorted array that descends by count
    const genreData = Array.from(genreCounts, ([genre, count]) => ({ genre, count }))
        .sort((a, b) => b.count - a.count);

    // Dimensions
    // select svg element and measure panel size
    const svg = d3.select("#svg-bar");
    const rect = document.getElementById("panel-bar").getBoundingClientRect();
    const margin = { top: 18, right: 20, bottom: 80, left: 46 };
    const W = rect.width  - margin.left - margin.right;
    const H = rect.height - margin.top  - margin.bottom - 36;

    // Main group shifted by margin
    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // X: band scale for genres to a horizontal position with padding
    const x = d3.scaleBand()
        .domain(genreData.map(d => d.genre))
        .range([0, W])
        .padding(0.25);

    // Y: linear scale for counts at vertical position
    // nice rounds the domain to clean numbers
    const y = d3.scaleLinear()
        .domain([0, d3.max(genreData, d => d.count)])
        .nice()
        .range([H, 0]); // SVG y-axis is flipped: 0 at top, H at bottom

    // Pastel purple color scale for bars
    // higher bars get darker color to show magnitude encoding
    const colorBar = d3.scaleSequential()
        .domain([0, d3.max(genreData, d => d.count)])
        .interpolator(d3.interpolateRgb("#dbb8f0", "#9b59c4"));

    // X axis
    // rotate labels so they dont overlap
    g.append("g")
        .attr("transform", `translate(0,${H})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
            .attr("transform", "rotate(-40)")
            .attr("text-anchor", "end")
            .attr("dy", "0.35em")
            .attr("dx", "-0.5em")
            .attr("fill", "#8a7a9b")
            .attr("font-size", "9px");

    // Y axis
    g.append("g")
        .call(d3.axisLeft(y).ticks(5))
        .selectAll("text")
            .attr("fill", "#8a7a9b")
            .attr("font-size", "9px");

    // Style axis lines
    g.selectAll(".domain, .tick line").attr("stroke", "#ddd0e8");

    // Y label
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -H / 2)
        .attr("y", -38)
        .attr("text-anchor", "middle")
        .attr("fill", "#8a7a9b")
        .attr("font-size", "10px")
        .text("Number of Respondents");

    // Bars
    // one rect per genre
    // bar height encodes count (the magnitude channel)
    g.selectAll("rect.bar")
        .data(genreData)
        .enter()
        .append("rect")
            .attr("class", "bar")
            .attr("x", d => x(d.genre)) // horizonatal position from band
            .attr("y", d => y(d.count)) // top of bar from linear scale
            .attr("width", x.bandwidth()) // bar width set by band scale
            .attr("height", d => H - y(d.count))
            .attr("fill", d => colorBar(d.count)) // darker color means more respondents
            .attr("rx", 3) // round corners
        // Tooltip when you hover
        .on("mouseover", function(event, d) {
            d3.select(this).attr("opacity", 0.75);
            showTip(`<b>${d.genre}</b><br>${d.count} respondents`, event);
        })
        // tooltip shows exact genre and count when you hover
        .on("mousemove", function(event, d) {
            showTip(`<b>${d.genre}</b><br>${d.count} respondents`, event);
        })
        .on("mouseout", function() {
            d3.select(this).attr("opacity", 1);
            hideTip();
        });

    // Value labels on top of bars
    // encodes count values as text for precise comparison
    g.selectAll("text.bar-label")
        .data(genreData)
        .enter()
        .append("text")
            .attr("class", "bar-label")
            .attr("x", d => x(d.genre) + x.bandwidth() / 2) // centered on bar
            .attr("y", d => y(d.count) - 3) // just above top of bar 
            .attr("text-anchor", "middle")
            .attr("fill", "#3d3048")
            .attr("font-size", "8px")
            .text(d => d.count);
}

// Visual 2: Scatter Plot for Hours per Day vs Anxiety, colored by Music Effect
// Purpose: shows whether people who listen more have higher anxiety and whether music helps or hurts
function drawScatter(data) {

    const svg = d3.select("#svg-scatter");
    const rect = document.getElementById("panel-scatter").getBoundingClientRect();
    // Extra right margin to fit the legend
    const margin = { top: 18, right: 120, bottom: 44, left: 46 };
    const W = rect.width  - margin.left - margin.right;
    const H = rect.height - margin.top  - margin.bottom - 36;

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Filter out rows missing the effect field
    const scatterData = data.filter(d =>
        d["Music effects"] === "Improve" ||
        d["Music effects"] === "No effect" ||
        d["Music effects"] === "Worsen"
    );

    // X: hours per day
    const x = d3.scaleLinear()
        .domain([0, d3.max(scatterData, d => d["Hours per day"])])
        .nice()
        .range([0, W]);

    // Y: anxiety score 0-10 up the plot height
    // fixed domain 0-10 since that's the survey's score range
    const y = d3.scaleLinear()
        .domain([0, 10])
        .range([H, 0]); // flipper since high anxiety means high on screen

    // X axis along the bottom
    g.append("g")
        .attr("transform", `translate(0,${H})`)
        .call(d3.axisBottom(x).ticks(8))
        .selectAll("text")
            .attr("fill", "#8a7a9b")
            .attr("font-size", "9px");

    // Y axis along the left
    g.append("g")
        .call(d3.axisLeft(y).ticks(10))
        .selectAll("text")
            .attr("fill", "#8a7a9b")
            .attr("font-size", "9px");
// style axis lines to match dashboard theme
    g.selectAll(".domain, .tick line").attr("stroke", "#ddd0e8");

    // X labels to describe the horizontal variables
    g.append("text")
        .attr("x", W / 2)
        .attr("y", H + 36)
        .attr("text-anchor", "middle")
        .attr("fill", "#8a7a9b")
        .attr("font-size", "10px")
        .text("Hours of Music per Day");

    // Y label describing the vertical variable
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -H / 2)
        .attr("y", -38)
        .attr("text-anchor", "middle")
        .attr("fill", "#8a7a9b")
        .attr("font-size", "10px")
        .text("Anxiety Score (0–10)");

    // Dots with small jitter so stacked dots are visible
    const jitter = () => (Math.random() - 0.5) * 0.3;
// one circle per respondent, positioned by hours and axiety
// color encodes music effect
    g.selectAll("circle.dot")
        .data(scatterData)
        .enter()
        .append("circle")
            .attr("class", "dot")
            .attr("cx", d => x(d["Hours per day"] + jitter())) // jitter positions
            .attr("cy", d => y(d.Anxiety))
            .attr("r", 3.5)
            .attr("fill", d => effectColor[d["Music effects"]] || "#c9bfda")
            .attr("opacity", 0.7) // semi transparent so no overlap
        .on("mouseover", function(event, d) {
            d3.select(this).attr("r", 6).attr("opacity", 1);
            showTip(
                `<b>${d["Fav genre"]}</b><br>` +
                `Hours/day: ${d["Hours per day"]}<br>` +
                `Anxiety: ${d.Anxiety}<br>` +
                `Effect: ${d["Music effects"]}`,
                event
        // on mouse out, retore original size 
            );
        })
        .on("mousemove", function(event, d) {
            showTip(
                `<b>${d["Fav genre"]}</b><br>` +
                `Hours/day: ${d["Hours per day"]}<br>` +
                `Anxiety: ${d.Anxiety}<br>` +
                `Effect: ${d["Music effects"]}`,
                event
            );
        })
        .on("mouseout", function() {
            d3.select(this).attr("r", 3.5).attr("opacity", 0.7);
            hideTip();
        });

    // Legend explains the three colors
    const effects = ["Improve", "No effect", "Worsen"];
    const legendG = g.append("g")
        .attr("transform", `translate(${W + 10}, 10)`); // right position
// legend title
    legendG.append("text")
        .attr("x", 0).attr("y", 0)
        .attr("fill", "#8a7a9b")
        .attr("font-size", "9px")
        .text("Music Effect");

    effects.forEach(function(eff, i) {
        legendG.append("circle")
            .attr("cx", 6)
            .attr("cy", 16 + i * 18)
            .attr("r", 5)
            .attr("fill", effectColor[eff]);
        legendG.append("text")
            .attr("x", 15)
            .attr("y", 20 + i * 18)
            .attr("fill", "#3d3048")
            .attr("font-size", "9px")
            .text(eff);
    });
}

// Visual 3: Parallel Coordinates for Mental Health Symptoms
// Purpose: shows a multi-dimensiontal view of how different mental health symptoms relate to each other and to music listening
function drawParallel(data) {

    const svg = d3.select("#svg-parallel");
    const rect = document.getElementById("panel-parallel").getBoundingClientRect();
 // extra bottom margin for legend and labels   
    const margin = { top: 40, right: 30, bottom: 60, left: 30 };
    const W = rect.width  - margin.left - margin.right;
    const H = rect.height - margin.top  - margin.bottom - 36;

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // The six dimensions shown on parallel axes
    const dimensions = ["Age", "Hours per day", "Anxiety", "Depression", "Insomnia", "OCD"];

    // Filter rows to those with valid numbers for all dimensions
    const parData = data.filter(function(d) {
        return dimensions.every(dim => !isNaN(d[dim]));
    });

    // Soft pastel genre colors for lines
    const genreGroups = {
        "Rock":             "#f4a7b9",
        "Pop":              "#ffd6a5",
        "Hip hop":          "#a8d8b9",
        "Classical":        "#a0c4ff",
        "Metal":            "#c9bfda",
        "Jazz":             "#f9c6d0",
        "R&B":              "#ffe5a0",
        "Video game music": "#b5ead7",
        "EDM":              "#ffb7b2",
        "K pop":            "#ffc8dd",
        "Folk":             "#b5d99c",
        "Rap":              "#fdffb6",
        "Latin":            "#a2d2ff",
        "Lofi":             "#e2c4f0",
        "Gospel":           "#f0e6b2",
        "Country":          "#b8dfe6",
    };
    const genreColorFn = d => genreGroups[d["Fav genre"]] || "#c9bfda";
// returns the genre color, defaulting to grey if genre is unknown
    // y scale for each dimension
    // each axis has own domain on data range for that variable
    const yScales = {};
    dimensions.forEach(function(dim) {
        yScales[dim] = d3.scaleLinear()
            .domain(d3.extent(parData, d => d[dim])) // min to max
            .nice()
            .range([H, 0]); // top of chart is high, bottom is low
    });

    // x position for each axis
    // point scale the six axes evenly acoss
    const xScale = d3.scalePoint()
        .domain(dimensions)
        .range([0, W])
        .padding(0.1);

    // path generator for each respondent's polyline
    // connects their values on each axis 
    function linePath(d) {
        return d3.line()(
            dimensions.map(dim => [xScale(dim), yScales[dim](d[dim])])
        );
    }

    // Draw one line per respondent
    g.selectAll("path.par-line")
        .data(parData)
        .enter()
        .append("path")
            .attr("class", "par-line")
            .attr("d", linePath) // path through all six axes
            .attr("fill", "none") // line only, no fill
            .attr("stroke", d => genreColorFn(d))
            .attr("stroke-width", 1)
            .attr("opacity", 0.3) // low opacity so no overplotting
        .on("mouseover", function(event, d) {
            d3.select(this)
                .attr("stroke-width", 2.5)
                .attr("opacity", 1)
                .raise(); // brings hovered line to front
            showTip(
                `<b>${d["Fav genre"]}</b><br>` +
                `Age: ${d.Age} · Hours/day: ${d["Hours per day"]}<br>` +
                `Anxiety: ${d.Anxiety} · Depression: ${d.Depression}<br>` +
                `Insomnia: ${d.Insomnia} · OCD: ${d.OCD}<br>` +
                `Effect: ${d["Music effects"]}`,
                event
            );
        })
        .on("mousemove", function(event, d) {
            showTip(
                `<b>${d["Fav genre"]}</b><br>` +
                `Age: ${d.Age} · Hours/day: ${d["Hours per day"]}<br>` +
                `Anxiety: ${d.Anxiety} · Depression: ${d.Depression}<br>` +
                `Insomnia: ${d.Insomnia} · OCD: ${d.OCD}<br>` +
                `Effect: ${d["Music effects"]}`,
                event
            );
        })
        .on("mouseout", function() {
            d3.select(this).attr("stroke-width", 1).attr("opacity", 0.3);
            hideTip();
        });
// on mouse out, it retores original thin transparent line
    // Draw each vertical axis
    dimensions.forEach(function(dim) {
        const axisG = g.append("g")
            .attr("transform", `translate(${xScale(dim)},0)`);
// draw vertical axis 
        axisG.call(d3.axisLeft(yScales[dim]).ticks(5))
            .selectAll("text")
                .attr("fill", "#8a7a9b")
                .attr("font-size", "9px");

        axisG.selectAll(".domain, .tick line").attr("stroke", "#ddd0e8");
// style axis lines to match theme
        // Axis label at top
        axisG.append("text")
            .attr("y", -12)
            .attr("text-anchor", "middle")
            .attr("fill", "#3d3048")
            .attr("font-size", "11px")
            .attr("font-weight", "bold")
            .text(dim);
    });

    // Genre color legend
    const genres = Object.keys(genreGroups);
    const cols = 4; // display 4 columns to fit 
    const legendG = g.append("g")
        .attr("transform", `translate(0, ${H + 16})`); // positioned below chart
// legend title
    legendG.append("text")
        .attr("x", 0).attr("y", 0)
        .attr("fill", "#8a7a9b")
        .attr("font-size", "9px")
        .text("Favorite Genre:");
// one colored square and label per genre, in grid
    genres.forEach(function(genre, i) {
        const col = i % cols; // column
        const row = Math.floor(i / cols); // row
        const lx = col * (W / cols); // x position
        const ly = 12 + row * 14; // y position

        legendG.append("rect")
            .attr("x", lx)
            .attr("y", ly)
            .attr("width", 8)
            .attr("height", 8)
            .attr("fill", genreGroups[genre])
            .attr("rx", 1);
// genre name label to swatch
        legendG.append("text")
            .attr("x", lx + 11)
            .attr("y", ly + 8)
            .attr("fill", "#3d3048")
            .attr("font-size", "8.5px")
            .text(genre);
    });
}