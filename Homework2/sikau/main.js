
// I use a fixed internal canvas size so the dashboard has a stable layout.
// The SVG viewBox makes the whole dashboard scale when the browser window changes.
const width = 1400;
const height = 900;

// Select the SVG from index.html and make it responsive.
const svg = d3.select("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

// Clear anything already inside the SVG before drawing the dashboard.
svg.selectAll("*").remove();


// I chose soft pastel colors because the dataset is about mental health,
// so a calmer visual style feels more appropriate than harsh colors.
const colors = {
    background: "#f7efe8",
     card: "#fffaf3",
    cardBorder: "#e6d8ca",
    title: "#243047",
        text: "#344054",
    muted: "#667085",
    grid: "#eadfd5",
    axis: "#344054",
        bar: "#7aa7c7",
    barHover: "#4e86ad",
        selected: "#e76f51",
        resetButton: "#f3d5c0",
    resetButtonStroke: "#d8a48f",
    tooltipBg: "#243047"
};

// Each color represents how respondents said music affects their mental health.
const effectColor = d3.scaleOrdinal()
    .domain(["Improve", "No effect", "Worsen", "Unknown"])
    .range([
        "#4f9d8f",
        "#6d8fb3",
        "#e6816a",
        "#9aa4b2"
    ]);

// This palette is used for genres in the parallel coordinates plot.
const genrePalette = [
    "#5e8c6a",
    "#7aa7c7",
    "#d9896a",
    "#b58db6",
    "#e0b95b",
    "#6ba6a6",
    "#c97c8a",
    "#8f9bb3",
    "#a3b18a",
    "#d4a373"
];

let selectedGenre = null;

// These card positions create a dashboard layout instead of a report layout.
// The overview and scatter plot are on top, while the advanced view is below.
const leftCard = {
    x: 45,
    y: 150,
    w: 625,
    h: 315
};

const rightCard = {
    x: 730,
    y: 150,
    w: 625,
    h: 315
};

const bottomCard = {
    x: 45,
    y: 505,
    w: 1310,
    h: 340
};


// Add the pastel background for the whole dashboard.
// Clicking the background also resets the selected genre.
svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", colors.background)
    .on("click", resetSelection);

// Add the main dashboard title.
svg.append("text")
    .attr("x", width / 2)
    .attr("y", 45)
    .attr("text-anchor", "middle")
    .attr("font-family", "Georgia, 'Times New Roman', serif")
    .attr("font-size", "34px")
    .attr("font-weight", "700")
    .attr("fill", colors.title)
    .text("Music and Mental Health Dashboard");

// Add a subtitle that summarizes the overall purpose of the dashboard.
svg.append("text")
    .attr("x", width / 2)
    .attr("y", 76)
    .attr("text-anchor", "middle")
    .attr("font-size", "15px")
    .attr("fill", colors.muted)
    .text("Explore how favorite genres and listening time relate to anxiety, depression, insomnia, and OCD");

// Add a rounded instruction box so users know where to start exploring.
svg.append("rect")
    .attr("x", 245)
    .attr("y", 96)
    .attr("width", 910)
    .attr("height", 38)
    .attr("rx", 18)
    .attr("fill", "#fff4e8")
    .attr("stroke", colors.cardBorder)
    .attr("stroke-width", 1);

// Add explicit guidance for moving through the dashboard.
// This helps connect the three views instead of making them feel separate.
svg.append("text")
    .attr("x", width / 2)
    .attr("y", 120)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .attr("fill", colors.text)
    .text("Start with the genre overview, click a genre to highlight it across views and compare listening time and mental health patterns below");

// Add a reset button group.
const resetButton = svg.append("g")
    .attr("transform", "translate(1180, 98)")
    .style("cursor", "pointer")
    .on("click", function(event) {
        event.stopPropagation();
        resetSelection();
    });

// Draw the rounded rectangle for the reset button.
resetButton.append("rect")
    .attr("width", 115)
    .attr("height", 34)
    .attr("rx", 17)
    .attr("fill", colors.resetButton)
    .attr("stroke", colors.resetButtonStroke)
    .attr("stroke-width", 1);

// Add the reset button label.
resetButton.append("text")
    .attr("x", 57.5)
    .attr("y", 22)
    .attr("text-anchor", "middle")
    .attr("font-size", "13px")
    .attr("font-weight", "700")
    .attr("fill", colors.title)
    .text("Reset view");

// The tooltip lets the dashboard stay visually clean while still showing details on hover.
const tooltip = svg.append("g")
    .attr("opacity", 0)
    .style("pointer-events", "none");

// Add the tooltip background.
tooltip.append("rect")
    .attr("rx", 8)
    .attr("fill", colors.tooltipBg)
    .attr("opacity", 0.92);

// Add the tooltip text container.
const tooltipText = tooltip.append("text")
    .attr("x", 12)
    .attr("y", 20)
    .attr("font-size", "12px")
    .attr("fill", "white");

// Show a tooltip with multiple lines.
// The position is calculated in SVG coordinates so it works even when the browser resizes.
function showTooltip(lines, event) {
    tooltipText.selectAll("tspan").remove();

    // Add each line as a separate tspan so the tooltip can have multiple rows.
    lines.forEach((line, i) => {
        tooltipText.append("tspan")
            .attr("x", 12)
            .attr("dy", i === 0 ? 0 : 17)
            .text(line);
    });

    const tooltipWidth = Math.max(...lines.map(line => line.length)) * 7 + 24;
    const tooltipHeight = lines.length * 18 + 16;

    // Size the tooltip background based on the amount of text.
    tooltip.select("rect")
        .attr("width", tooltipWidth)
        .attr("height", tooltipHeight);

    // Convert the mouse position into the SVG coordinate system.
    const [mouseX, mouseY] = d3.pointer(event, svg.node());

    // Default tooltip position is slightly to the right and above the cursor.
    let tooltipX = mouseX + 18;
    let tooltipY = mouseY - 18;

    // Keep the tooltip from going off the right side of the screen.
    if (tooltipX + tooltipWidth > width - 10) {
        tooltipX = mouseX - tooltipWidth - 18;
    }

    // Keep the tooltip from going off the top.
    if (tooltipY < 10) {
        tooltipY = mouseY + 18;
    }

    // Keep the tooltip from going off the bottom.
    if (tooltipY + tooltipHeight > height - 10) {
        tooltipY = height - tooltipHeight - 10;
    }

    // Move and show the tooltip.
    tooltip
        .attr("transform", `translate(${tooltipX}, ${tooltipY})`)
        .attr("opacity", 1);

    // Bring the tooltip to the front so it never gets hidden behind chart elements.
    tooltip.raise();
}

// Hide the tooltip when the user stops hovering.
function hideTooltip() {
    tooltip.attr("opacity", 0);
}

// Add a rounded card behind each visualization.
// The cards visually separate the dashboard views while still keeping them connected.
function addCard(card) {
    svg.append("rect")
        .attr("x", card.x)
        .attr("y", card.y)
        .attr("width", card.w)
        .attr("height", card.h)
        .attr("rx", 22)
        .attr("fill", colors.card)
        .attr("stroke", colors.cardBorder)
        .attr("stroke-width", 1.5);
}

// Add a centered title for each visualization.
function addChartTitle(g, text, x, y) {
    g.append("text")
        .attr("x", x)
        .attr("y", y)
        .attr("text-anchor", "middle")
        .attr("font-size", "17px")
        .attr("font-weight", "800")
        .attr("fill", colors.title)
        .text(text);
}

// Add an x-axis label.
function addXAxisLabel(g, text, chartWidth, chartHeight, offset) {
    g.append("text")
        .attr("x", chartWidth / 2)
        .attr("y", chartHeight + offset)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .attr("fill", colors.axis)
        .text(text);
}

// Add a y-axis label.
function addYAxisLabel(g, text, chartHeight, offset) {
    g.append("text")
        .attr("x", -chartHeight / 2)
        .attr("y", offset)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .attr("fill", colors.axis)
        .text(text);
}

// Add vertical gridlines for charts that use an x-scale.
// The gridlines make values easier to compare without making the chart too busy.
function addVerticalGridlines(g, xScale, chartHeight) {
    const grid = g.append("g")
        .call(
            d3.axisTop(xScale)
                .ticks(5)
                .tickSize(-chartHeight)
                .tickFormat("")
        );

    grid.selectAll("line")
        .attr("stroke", colors.grid)
        .attr("stroke-opacity", 1);

    grid.selectAll("path").remove();
}

// Add horizontal gridlines for charts that use a y-scale.
function addHorizontalGridlines(g, yScale, chartWidth) {
    const grid = g.append("g")
        .call(
            d3.axisLeft(yScale)
                .ticks(5)
                .tickSize(-chartWidth)
                .tickFormat("")
        );

    grid.selectAll("line")
        .attr("stroke", colors.grid)
        .attr("stroke-opacity", 1);

    grid.selectAll("path").remove();
}

// Format numbers to one decimal place.
// This is used mostly for average values in the parallel coordinates plot.
function oneDecimal(value) {
    return d3.format(".1f")(value);
}

// Load the Music and Mental Health Survey data from the data folder.
d3.csv("data/mxmh_survey_results.csv").then(rawData => {
    // Convert numeric columns from strings into numbers.
    // D3 reads CSV values as strings by default, so this step is necessary for scales.
    rawData.forEach(d => {
        d.Age = Number(d.Age);
        d["Hours per day"] = Number(d["Hours per day"]);
        d.Anxiety = Number(d.Anxiety);
        d.Depression = Number(d.Depression);
        d.Insomnia = Number(d.Insomnia);
        d.OCD = Number(d.OCD);

        d["Fav genre"] = d["Fav genre"] || "Unknown";
        d["Music effects"] = d["Music effects"] || "Unknown";
    });

    // Keep only rows that have the values needed for all three visualizations.
    const data = rawData.filter(d =>
        !isNaN(d.Age) &&
        !isNaN(d["Hours per day"]) &&
        !isNaN(d.Anxiety) &&
        !isNaN(d.Depression) &&
        !isNaN(d.Insomnia) &&
        !isNaN(d.OCD)
    );

    // Draw the three linked dashboard views.
    drawGenreBarChart(data);
    drawScatterPlot(data);
    drawParallelCoordinates(data);

}).catch(error => {
    console.log("CSV loading error:", error);

    // Show an error message if the dataset path is wrong or the file cannot load.
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .attr("font-size", "22px")
        .attr("fill", "#c53030")
        .text("Could not load data/mxmh_survey_results.csv");
});

function drawGenreBarChart(data) {
    // Add the card that contains the overview chart.
    addCard(leftCard);

    const margin = { top: 68, right: 55, bottom: 55, left: 145 };
    const chartWidth = leftCard.w - margin.left - margin.right;
    const chartHeight = leftCard.h - margin.top - margin.bottom;

    // Create a group for the bar chart so all chart elements share the same origin.
    const g = svg.append("g")
        .attr("transform", `translate(${leftCard.x + margin.left}, ${leftCard.y + margin.top})`);

    // Count how many respondents chose each favorite genre.
    const genreCounts = d3.rollups(
        data,
        v => v.length,
        d => d["Fav genre"]
    )
        .map(([genre, count]) => ({ genre, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    // Create a y-scale for the genre categories.
    const y = d3.scaleBand()
        .domain(genreCounts.map(d => d.genre))
        .range([0, chartHeight])
        .padding(0.24);

    // Create an x-scale for respondent counts.
    const x = d3.scaleLinear()
        .domain([0, d3.max(genreCounts, d => d.count)])
        .nice()
        .range([0, chartWidth]);

    // Add the chart title.
    addChartTitle(g, "Overview: Most Common Favorite Genres", chartWidth / 2, -34);

    // Add light gridlines to help compare bar lengths.
    addVerticalGridlines(g, x, chartHeight);

    // Add the y-axis with genre names.
    g.append("g")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .attr("font-size", "12px")
        .attr("fill", colors.text);

    // Add the x-axis with respondent counts.
    g.append("g")
        .attr("transform", `translate(0, ${chartHeight})`)
        .call(d3.axisBottom(x).ticks(5))
        .selectAll("text")
        .attr("font-size", "11px")
        .attr("fill", colors.text);

    // Add an x-axis label.
    addXAxisLabel(g, "Number of Respondents", chartWidth, chartHeight, 42);

    // Draw one horizontal bar for each favorite genre.
    // This chart is the overview because it shows the distribution of the survey sample.
    g.selectAll(".genre-bar")
        .data(genreCounts)
        .enter()
        .append("rect")
        .attr("class", "genre-bar")
        .attr("x", 0)
        .attr("y", d => y(d.genre))
        .attr("width", d => x(d.count))
        .attr("height", y.bandwidth())
        .attr("rx", 6)
        .attr("fill", d => selectedGenre === d.genre ? colors.selected : colors.bar)
        .attr("cursor", "pointer")
        .on("click", function(event, d) {
            event.stopPropagation();
            selectedGenre = selectedGenre === d.genre ? null : d.genre;
            updateHighlighting();
        })
        .on("mouseover", function(event, d) {
            d3.select(this).attr("fill", colors.barHover);

            showTooltip(
                [
                    `Genre: ${d.genre}`,
                    `Respondents: ${d.count}`,
                    "Click to filter/highlight"
                ],
                event
            );
        })
        .on("mouseout", function(event, d) {
            d3.select(this).attr("fill", selectedGenre === d.genre ? colors.selected : colors.bar);
            hideTooltip();
        });

    // Add count labels at the end of the bars so the exact values are visible.
    g.selectAll(".genre-count-label")
        .data(genreCounts)
        .enter()
        .append("text")
        .attr("class", "genre-count-label")
        .attr("x", d => x(d.count) + 8)
        .attr("y", d => y(d.genre) + y.bandwidth() / 2 + 4)
        .attr("font-size", "11px")
        .attr("font-weight", "700")
        .attr("fill", "#416176")
        .text(d => d.count);
}

function drawScatterPlot(data) {
    // Add the card that contains the scatter plot.
    addCard(rightCard);

    const margin = { top: 68, right: 165, bottom: 68, left: 90 };
    const chartWidth = rightCard.w - margin.left - margin.right;
    const chartHeight = rightCard.h - margin.top - margin.bottom;

    // Create a group for the scatter plot.
    const g = svg.append("g")
        .attr("transform", `translate(${rightCard.x + margin.left}, ${rightCard.y + margin.top})`);

    // Create x-scale for the number of hours a respondent listens to music per day.
    const x = d3.scaleLinear()
        .domain([0, d3.max(data, d => d["Hours per day"])])
        .nice()
        .range([0, chartWidth]);

    // Create y-scale for anxiety score.
    const y = d3.scaleLinear()
        .domain([0, 10])
        .range([chartHeight, 0]);

    // Add the chart title.
    addChartTitle(g, "Listening Time vs Anxiety", chartWidth / 2, -34);

    // Add horizontal gridlines because anxiety is the main comparison axis here.
    addHorizontalGridlines(g, y, chartWidth);

    // Add x-axis with hour units.
    g.append("g")
        .attr("transform", `translate(0, ${chartHeight})`)
        .call(
            d3.axisBottom(x)
                .ticks(8)
                .tickFormat(d => `${d}h`)
        )
        .selectAll("text")
        .attr("font-size", "11px")
        .attr("fill", colors.text);

    // Add y-axis for anxiety score.
    g.append("g")
        .call(d3.axisLeft(y).ticks(5))
        .selectAll("text")
        .attr("font-size", "11px")
        .attr("fill", colors.text);

    // Add axis labels.
    addXAxisLabel(g, "Hours Listening per Day", chartWidth, chartHeight, 48);
    addYAxisLabel(g, "Anxiety Score", chartHeight, -62);

    // Draw one circle for each respondent.
    // This view lets users look at individual listening habits and anxiety scores.
    g.selectAll(".scatter-dot")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "scatter-dot")
        .attr("cx", d => x(d["Hours per day"]))
        .attr("cy", d => y(d.Anxiety))
        .attr("r", 4.8)
        .attr("fill", d => effectColor(d["Music effects"]))
        .attr("stroke", "#fffaf3")
        .attr("stroke-width", 0.9)
        .attr("opacity", 0.88)
        .on("mouseover", function(event, d) {
            d3.select(this)
                .attr("r", 7)
                .attr("stroke", colors.title)
                .attr("stroke-width", 1.3);

            showTooltip(
                [
                    `Genre: ${d["Fav genre"]}`,
                    `Hours/day: ${d["Hours per day"]}h`,
                    `Anxiety: ${d.Anxiety}`,
                    `Effect: ${d["Music effects"]}`
                ],
                event
            );
        })
        .on("mouseout", function() {
            d3.select(this)
                .attr("r", 4.8)
                .attr("stroke", "#fffaf3")
                .attr("stroke-width", 0.9);

            hideTooltip();
        });

    // Add the legend for the scatter plot colors.
    const legend = g.append("g")
        .attr("transform", `translate(${chartWidth + 35}, 4)`);

    // Add legend title.
    legend.append("text")
        .attr("font-size", "13px")
        .attr("font-weight", "800")
        .attr("fill", colors.title)
        .text("Music Effects");

    // Add one legend item for each music effect category.
    legend.selectAll(".effect-legend-item")
        .data(effectColor.domain())
        .enter()
        .append("g")
        .attr("class", "effect-legend-item")
        .attr("transform", (d, i) => `translate(0, ${30 + i * 32})`)
        .each(function(d) {
            d3.select(this)
                .append("circle")
                .attr("cx", 8)
                .attr("cy", 8)
                .attr("r", 8)
                .attr("fill", effectColor(d))
                .attr("stroke", "#fffaf3")
                .attr("stroke-width", 0.9);

            d3.select(this)
                .append("text")
                .attr("x", 25)
                .attr("y", 13)
                .attr("font-size", "13px")
                .attr("fill", colors.text)
                .text(d);
        });
}


function drawParallelCoordinates(data) {
    // Add the card that contains the advanced visualization.
    addCard(bottomCard);

            const margin = { top: 105, right: 235, bottom: 42, left: 110 };
        const chartWidth = bottomCard.w - margin.left - margin.right;
    const chartHeight = bottomCard.h - margin.top - margin.bottom;

    // Create a group for the parallel coordinates plot.
    const g = svg.append("g")
        .attr("transform", `translate(${bottomCard.x + margin.left}, ${bottomCard.y + margin.top})`);

    // These are the dimensions compared across genres.
    const dimensions = ["Hours per day", "Anxiety", "Depression", "Insomnia", "OCD"];

    // Aggregate respondents by favorite genre to reduce visual clutter.
    // Instead of drawing hundreds of lines, each line represents the average profile of a genre.
    const genreData = d3.rollups(
        data,
        v => ({
            genre: v[0]["Fav genre"],
            count: v.length,
            "Hours per day": d3.mean(v, d => d["Hours per day"]),
            Anxiety: d3.mean(v, d => d.Anxiety),
            Depression: d3.mean(v, d => d.Depression),
            Insomnia: d3.mean(v, d => d.Insomnia),
            OCD: d3.mean(v, d => d.OCD)
        }),
        d => d["Fav genre"]
    )
        .map(([genre, values]) => values)
        .filter(d => d.count >= 10)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    // Create a color scale for the genre lines.
    const genreColor = d3.scaleOrdinal()
        .domain(genreData.map(d => d.genre))
        .range(genrePalette);

    // Create the x-scale that positions each parallel axis.
    const x = d3.scalePoint()
        .domain(dimensions)
        .range([0, chartWidth])
        .padding(0.5);

    // Create one y-scale for each dimension because the units are different.
    const y = {};
    dimensions.forEach(dim => {
        y[dim] = d3.scaleLinear()
            .domain(d3.extent(genreData, d => d[dim]))
            .nice()
            .range([chartHeight, 0]);
    });

    // Convert each genre row into a line across all parallel axes.
    function path(d) {
        return d3.line()(dimensions.map(dim => [x(dim), y[dim](d[dim])]));
    }

    // Add title for the advanced visualization.
    addChartTitle(g, "Advanced View: Average Mental Health Scores by Favorite Genre", chartWidth / 2, -68);

    // Add subtitle to make the aggregation clear to the viewer.
    g.append("text")
        .attr("x", chartWidth / 2)
        .attr("y", -40)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .attr("fill", colors.muted)
        .text("Each line represents one genre; values show average survey responses");

    // Draw one parallel coordinates line per genre.
    // This satisfies the advanced visualization requirement while keeping the chart readable.
    g.selectAll(".parallel-line")
        .data(genreData)
        .enter()
        .append("path")
        .attr("class", "parallel-line")
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", d => genreColor(d.genre))
        .attr("stroke-width", 3.4)
        .attr("opacity", 0.88)
        .attr("cursor", "pointer")
        .on("click", function(event, d) {
            event.stopPropagation();
            selectedGenre = selectedGenre === d.genre ? null : d.genre;
            updateHighlighting();
        })
        .on("mouseover", function(event, d) {
            d3.select(this)
                .attr("stroke-width", 6)
                .attr("opacity", 1);

            showTooltip(
                [
                    `Genre: ${d.genre}`,
                    `Avg hours/day: ${oneDecimal(d["Hours per day"])}h`,
                    `Avg anxiety: ${oneDecimal(d.Anxiety)}`,
                    `Avg depression: ${oneDecimal(d.Depression)}`
                ],
                event
            );
        })
        .on("mouseout", function(event, d) {
            d3.select(this)
                .attr("stroke-width", selectedGenre === d.genre ? 6 : 3.4)
                .attr("opacity", selectedGenre && selectedGenre !== d.genre ? 0.18 : 0.88);

            hideTooltip();
        });

    // Add one axis group for each dimension.
    const axisGroups = g.selectAll(".dimension")
        .data(dimensions)
        .enter()
        .append("g")
        .attr("class", "dimension")
        .attr("transform", d => `translate(${x(d)}, 0)`);

    // Draw each axis.
    // The Hours per day axis includes "h" so the unit is clear.
    axisGroups.each(function(d) {
        const axis = d === "Hours per day"
            ? d3.axisLeft(y[d]).ticks(5).tickFormat(value => `${oneDecimal(value)}h`)
            : d3.axisLeft(y[d]).ticks(5).tickFormat(value => oneDecimal(value));

        d3.select(this)
            .call(axis)
            .selectAll("text")
            .attr("font-size", "11px")
            .attr("fill", colors.text);
    });

    // Add labels above each parallel coordinate axis.
    axisGroups.append("text")
        .attr("y", -13)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .attr("font-weight", "800")
        .attr("fill", colors.title)
        .text(d => d);

    const legend = g.append("g")
        .attr("transform", `translate(${chartWidth + 45}, -6)`);

    legend.append("text")
        .attr("font-size", "13px")
        .attr("font-weight", "800")
        .attr("fill", colors.title)
        .text("Favorite Genre");

    legend.selectAll(".genre-legend-item")
        .data(genreData)
        .enter()
        .append("g")
        .attr("class", "genre-legend-item")
        .attr("transform", (d, i) => `translate(0, ${28 + i * 23})`)
        .attr("cursor", "pointer")
        .on("click", function(event, d) {
            event.stopPropagation();
            selectedGenre = selectedGenre === d.genre ? null : d.genre;
            updateHighlighting();
        })
        .each(function(d) {
            d3.select(this)
                .append("rect")
                .attr("width", 14)
                .attr("height", 14)
                .attr("rx", 3)
                .attr("fill", genreColor(d.genre));

            d3.select(this)
                .append("text")
                .attr("x", 23)
                .attr("y", 12)
                .attr("font-size", "11px")
                .attr("fill", colors.text)
                .text(`${d.genre} (${d.count})`);
        });
}


// Update all linked views based on the selected genre.
function updateHighlighting() {
    
    svg.selectAll(".genre-bar")
        .attr("fill", d => selectedGenre === d.genre ? colors.selected : colors.bar)
        .attr("opacity", d => selectedGenre && selectedGenre !== d.genre ? 0.35 : 1);

    // Update the scatter dots.
 
    svg.selectAll(".scatter-dot")
        .attr("opacity", d => {
            if (!selectedGenre) return 0.88;
            return d["Fav genre"] === selectedGenre ? 0.95 : 0.12;
        })
        .attr("r", d => {
            if (!selectedGenre) return 4.8;
            return d["Fav genre"] === selectedGenre ? 6.2 : 3.2;
        });

    // Update the parallel coordinates lines.
    svg.selectAll(".parallel-line")
        .attr("stroke-width", d => selectedGenre === d.genre ? 6 : 3.4)
        .attr("opacity", d => {
            if (!selectedGenre) return 0.88;
            return d.genre === selectedGenre ? 1 : 0.16;
        });

    svg.selectAll(".genre-legend-item")
        .attr("opacity", d => {
            if (!selectedGenre) return 1;
            return d.genre === selectedGenre ? 1 : 0.35;
        });
}

function resetSelection() {
    selectedGenre = null;
    updateHighlighting();
    hideTooltip();
}