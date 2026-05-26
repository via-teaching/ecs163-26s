// stores column names for easier reference
const COLS = {
    age: "age",
    year: "Your current year of Study",
    depression: "Do you have Depression?",
    anxiety: "Do you have Anxiety?",
    panic: "Do you have Panic attack?",
    treatment: "Did you seek any specialist for a treatment?"
}

// shared colors to avoid having to use hex for every color in the code
const palette = {
    navy: "#233f73",
    blue: "#355da8",
    lightBlue: "#8fa8d6",
    paleBlue: "#c9d5eb",
    slate: "#6b7a99",
    background: "#f5f7fb",
    text: "#1f2a44",
    white: "#ffffff"
};

// load data
d3.csv("./data/mental_health.csv").then(rawData =>{
    console.log("rawData", rawData);

    // clean data - convert age to number and standardize year format
    rawData.forEach(d => {
        d[COLS.age] = Number(d[COLS.age]);
        d[COLS.year] = d[COLS.year]
            .trim()
            .toLowerCase()
            .replace("year", "Year");
        });
    
    // initial draw of the dashboard
    drawDashboard(rawData);
    
    // if screen size changes, redraw the dashboard to adjust to new size
    window.addEventListener("resize", () => {
      drawDashboard(rawData);
    });
});

function setupDashboard() {
    const isMobile = window.innerWidth < 800;

    const viewWidth = isMobile ? 390 : 1200;
    const viewHeight = isMobile ? 1050 : 760;

    d3.select("svg")
        .attr("viewBox", `0 0 ${viewWidth} ${viewHeight}`)
        .attr("width", viewWidth)
        .attr("height", viewHeight)
        .style("display", "block")
        .style("margin", "0 auto")
        .style("background", palette.background);
}

function drawDashboard(data) {
    // clear existing content before redrawing, so that charts update when screen size changes
    d3.select("svg").selectAll("*").remove();

    setupDashboard();

    const svg = d3.select("svg");
    const isMobile = window.innerWidth < 800;
    const centerX = isMobile ? 195 : 600;

    svg.append("text")
        .attr("x", centerX)
        .attr("y", 32)
        .attr("text-anchor", "middle")
        .style("font-size", "22px")
        .style("font-weight", "700")
        .style("fill", palette.text)
        .text("Student Mental Health Dashboard");

    drawHeatmap(data);
    drawTreatmentSankey(data);
    drawOverlapDotChart(data);
}

// predetermine layout positions and sizes for each chart based on screen size
function getLayout() {
    const isMobile = window.innerWidth < 800;

    if (isMobile) {
        return {
            sankey: { x: 20, y: 55, width: 350, height: 260 },
            heatmap: { x: 20, y: 335, width: 350, height: 220 },
            overlap: { x: 20, y: 575, width: 350, height: 220 }
        };
    }

    return {
        sankey: { x: 60, y: 55, width: 1080, height: 360 },
        heatmap: { x: 60, y: 440, width: 520, height: 260 },
        overlap: { x: 620, y: 440, width: 520, height: 260 }
    };
}

// group card background, title, and chart so they all move together 
function drawCard(svg, x, y, width, height, title) {
  const card = svg.append("g")
    .attr("transform", `translate(${x}, ${y})`);

    // rounded rectangle background for the card
    card.append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("rx", 18)
    .attr("ry", 12)
    .style("fill", palette.white)
    .style("stroke", palette.paleBlue)
    .style("stroke-width", 2);

  // chart title for each graph
  card.append("text")
    .attr("x", 24)
    .attr("y", 34)
    .attr("font-weight", "700")
    .attr("font-size", "15px")
    .attr("fill", palette.text)
    .text(title);

    return card;
}

// Draw a heatmap showing the percentage of students with each mental health condition by study year
function drawHeatmap(data) {
    const svg = d3.select("svg")

    const layout = getLayout();
    const cardInfo = layout.heatmap;

    const card = drawCard(
        svg,
        cardInfo.x, cardInfo.y,
        cardInfo.width, cardInfo.height,
        "Mental Health Issues by Study Year"
    )

    const margin = { top: 85, right: 25, bottom: 40, left: 115 };
    const width = cardInfo.width - margin.left - margin.right - 25;
    const height = cardInfo.height - margin.top - margin.bottom - 20;

    // create group for the heatmap content, positioned within the card margins
    const g = card.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // legend explains the color range encoding of the heatmap
    const legend = card.append("g")
    .attr("transform", `translate(${margin.left}, 52)`);

    // light squares represent lower counts, darker squares represent higher counts
    legend.append("rect")
        .attr("width", 14)
        .attr("height", 14)
        .attr("rx", 3)
        .style("fill", palette.paleBlue);

    legend.append("text")
        .attr("x", 20)
        .attr("y", 11)
        .style("font-size", "11px")
        .style("fill", palette.text)
        .text("Lower Count");

    // darker squares represent higher counts
    legend.append("rect")
        .attr("x", 105)
        .attr("width", 14)
        .attr("height", 14)
        .attr("rx", 3)
        .style("fill", palette.blue);

    legend.append("text")
        .attr("x", 125)
        .attr("y", 11)
        .style("font-size", "11px")
        .style("fill", palette.text)
        .text("Higher Count");

    // x = study year
    const years = [...new Set(data.map(d => d[COLS.year]))];

    // y = mental health condition
    const conditions = [
        { label: "Depression", col: COLS.depression },
        { label: "Anxiety", col: COLS.anxiety },
        { label: "Panic Attack", col: COLS.panic }
];

    const heatmapData = [];

    // calculate percentage of students with each condition for each year to determine heatmap color
    years.forEach(year => {
        // Filter data for the current year
        const rowsForYear = data.filter(d => d[COLS.year] === year);

        conditions.forEach(condition => {
            const count = rowsForYear.filter(d=> d[condition.col] === "Yes").length;

            heatmapData.push({
                year: year,
                condition: condition.label,
                count: count
            });
        });
    });

    // scales for positioning heatmap squares
    const xScale = d3.scaleBand()
        .domain(years)
        .range([0, width])
        .padding(0.05);

    const yScale = d3.scaleBand()
        .domain(conditions.map(c => c.label))
        .range([0, height])
        .padding(0.05);

    const colorScale = d3.scaleLinear()
    .domain([
        0,
        d3.max(heatmapData, d => d.count) / 2,
        d3.max(heatmapData, d => d.count)
    ])
    .range([
        palette.paleBlue,
        palette.lightBlue,
        palette.blue
    ]);

    // draw one rounded rectangle for each year-condition pair
    g.selectAll("rect")
        .data(heatmapData)
        .enter()
        .append("rect")
        .attr("x", d => xScale(d.year))
        .attr("y", d => yScale(d.condition))
        .attr("width", xScale.bandwidth())
        .attr("height", yScale.bandwidth())
        .attr("rx", 8)
        .attr("ry", 8)
        .style("fill", d => colorScale(d.count))
        .attr("stroke", palette.background)
        .attr("stroke-width", 4);
    
    // add study year axis 
    g.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale))

    // add mental health condition axis
    g.append("g")
        .call(d3.axisLeft(yScale));

    // style the axis ticks and labels
    g.selectAll(".tick text") 
        .attr("font-size", "12px")
        .attr("font-family", "Arial, sans-serif")
        .attr("fill", "#333");

    // x axis label
    g.append("text")
        .attr("x", width / 2)
        .attr("y", height + 35)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "600")
        .style("fill", palette.text)
        .text("Study Year");

    // y axis label that's rotated to be vertical
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -85)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "600")
        .style("fill", palette.text)
        .text("Mental Health Condition");

    // add percentage labels to each square, with white text for higher percentages and black text for lower percentages
    g.selectAll(".cell-text")
        .data(heatmapData)
        .enter()
        .append("text")
        .attr("x", d => xScale(d.year) + xScale.bandwidth() / 2)
        .attr("y", d => yScale(d.condition) + yScale.bandwidth() / 2)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-weight", "600")
        .attr("fill", d => d.count > d3.max(heatmapData, d => d.count) / 2 ? "white" : palette.text)
        .text(d => d.count);
}

// Draw a sankey diagram showing the flow of students from study year to mental health condition to treatment seeking
function drawTreatmentSankey(data) {
    const svg = d3.select("svg")

    const layout = getLayout();
    const cardInfo = layout.sankey;

    const card = drawCard(
        svg,
        cardInfo.x, cardInfo.y,
        cardInfo.width, cardInfo.height,
        "Study Year, Mental Health Issues, and Treatment Seeking"
    )

    const margin = { top: 65, right: 140, bottom: 30, left: 140 };
    const width = cardInfo.width - margin.left - margin.right - 30;
    const height = cardInfo.height - margin.top - margin.bottom - 20;

    // group for sankey content, positioned within the card margins
    const g = card.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // define the sankey size 
    const sankey = d3.sankey()
        .nodeId(d => d.name)
        .nodeWidth(28)
        .nodePadding(28)
        .extent([[0, 0], [width, height]]);

    const years = [...new Set(data.map(d => d[COLS.year]))];
    
    const conditions = [
        { label: "Depression", col: COLS.depression },
        { label: "Anxiety", col: COLS.anxiety },
        { label: "Panic Attack", col: COLS.panic }
    ];

    // graph structure with nodes and links
    const graph = {
        // node labels
        nodes: [
            ...years.map(year => ({ name: year })),
            ...conditions.map(condition => ({ name: condition.label })),
            { name: "Sought Treatment" },
            { name: "No Treatment" }
        ],
        links: []
    };

    // links from year to condition
    years.forEach(year => {
        conditions.forEach(condition => {
            const count = data.filter(d =>
                d[COLS.year] === year &&
                d[condition.col] === "Yes"
            ).length;

            if (count > 0) {
                graph.links.push({
                    source: year,
                    target: condition.label,
                    value: count
                });
            }
        });
    });

    // links from condition to treatment
    conditions.forEach(condition => {
        const yesCount = data.filter(d =>
            d[condition.col] === "Yes" &&
            d[COLS.treatment] === "Yes"
        ).length;

        const noCount = data.filter(d =>
            d[condition.col] === "Yes" &&
            d[COLS.treatment] === "No"
        ).length;

        if (yesCount > 0) {
            graph.links.push({
                source: condition.label,
                target: "Sought Treatment",
                value: yesCount
            });
        }

        if (noCount > 0) {
            graph.links.push({
                source: condition.label,
                target: "No Treatment",
                value: noCount
            });
        }
    });

    sankey(graph);

    // node colors, depending on type 
    function nodeColor(d) {
        if (years.includes(d.name)) return palette.paleBlue;

        if (conditions.some(c => c.label === d.name)) {
            return palette.blue;
        }

        if (d.name === "Sought Treatment") {
            return "#2952cc";
        }

        if (d.name === "No Treatment") {
            return palette.slate;
        }

        return palette.lightBlue;
    }

    // link colors, with specific colors for treatment seeking links and year nodes to make them stand out, and a default color for the rest of the links
    function linkColor(d) {
        const yearColors = {
          "Year 1": "#4C78A8",
          "Year 2": "#72B7B2",
          "Year 3": "#F2CF5B", 
          "Year 4": "#B279A2" 
      };

        if (yearColors[d.source.name]) {
          return yearColors[d.source.name];
        }

        if (d.target.name === "Sought Treatment") {
            return "#4f7cff";
        }

        if (d.target.name === "No Treatment") {
            return "#aeb8cc";
        }

        return "#7ea1e6";
    }

    const legendItems = [
      { label: "Year 1", color: "#4C78A8" },
      { label: "Year 2", color: "#72B7B2" },
      { label: "Year 3", color: "#F2CF5B" },
      { label: "Year 4", color: "#B279A2" },
      { label: "Sought Treatment", color: "#4f7cff" },
      { label: "No Treatment", color: "#aeb8cc" }
    ];

    // create legend for the sankey diagram, with colored circles and labels for each node type
    const legend = card.append("g")
        .attr("transform", `translate(${cardInfo.width - 160}, 60)`);

    // add colored circles for each flow category
    legend.selectAll(".legend-dot")
        .data(legendItems)
        .enter()
        .append("circle")
        .attr("cx", 0)
        .attr("cy", (d, i) => i * 20)
        .attr("r", 6)
        .style("fill", d => d.color)
        .style("opacity", 0.8);

    // add labels for each flow category next to the circles
    legend.selectAll(".legend-label")
        .data(legendItems)
        .enter()
        .append("text")
        .attr("x", 14)
        .attr("y", (d, i) => i * 20 + 4)
        .style("font-size", "11px")
        .style("font-weight", "600")
        .style("fill", palette.text)
        .text(d => d.label);

    // draw the flow paths, thicker means more students in that group
    g.append("g")
        .selectAll("path")
        .data(graph.links)
        .enter()
        .append("path")
        .attr("d", d3.sankeyLinkHorizontal())
        .style("fill", "none")
        .style("stroke", d => linkColor(d))
        .style("stroke-opacity", 0.5)
        .style("stroke-width", d => Math.max(1, d.width));

    // create a group for each node so rectangle and label stay together
    const node = g.append("g")
        .selectAll("g")
        .data(graph.nodes)
        .enter()
        .append("g");

    // vertical rectangles represent each category
    node.append("rect")
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0)
        .attr("rx", 6)
        .style("fill", d => nodeColor(d))
        .style("stroke", palette.white)
        .style("stroke-width", 3);

    // labels
    node.append("text")
        .attr("x", d => d.x0 - 10)
        .attr("y", d => (d.y0 + d.y1) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "end")
        .style("font-size", "13px")
        .style("font-weight", "600")
        .style("fill", palette.text)
        .text(d => d.name)
        .filter(d => d.x0 < width / 2)
        .attr("x", d => d.x1 + 10)
        .attr("text-anchor", "start");
}

function drawOverlapDotChart(data) {
    const svg = d3.select("svg");

    const layout = getLayout();
    const cardInfo = layout.overlap;

    const card = drawCard(
        svg,
        cardInfo.x, cardInfo.y,
        cardInfo.width, cardInfo.height,
        "Top 3 Mental Health Overlaps"
    )

    const margin = { top: 65, right: 90, bottom: 40, left: 190 };
    const width = cardInfo.width - margin.left - margin.right - 25;
    const height = cardInfo.height - margin.top - margin.bottom - 20;

    // group for the dot chart content, positioned within the card margins
    const g = card.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const pairs = [
        { label: "Depression + Anxiety", a: COLS.depression, b: COLS.anxiety },
        { label: "Depression + Panic Attack", a: COLS.depression, b: COLS.panic },
        { label: "Anxiety + Panic Attack", a: COLS.anxiety, b: COLS.panic }
    ];

    // calculate the count and percentage of students who have both conditions in each pair to determine dot position and label
    const overlapData = pairs.map(pair => {
        const count = data.filter(d =>
            d[pair.a] === "Yes" &&
            d[pair.b] === "Yes"
        ).length;

        return {
            label: pair.label,
            count: count,
            percent: (count / data.length) * 100
        };
    });

    const xScale = d3.scaleLinear()
        .domain([0, d3.max(overlapData, d => d.percent)])
        .range([0, width]);

    const yScale = d3.scaleBand()
        .domain(overlapData.map(d => d.label))
        .range([0, height])
        .padding(0.5);

    // labels on the left side
    g.append("g")
        .call(d3.axisLeft(yScale).tickSize(0));

    // percentage axis on the bottom of the chart
    g.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xScale).ticks(5).tickFormat(d => d + "%"));

    // one horizontal line from to percent value, and one dot at the end of the line to represent the percentage of students with both conditions 
    // in that pair, with a label of the percentage value next to the dot
    g.selectAll(".line")
        .data(overlapData)
        .enter()
        .append("line")
        .attr("x1", 0)
        .attr("x2", d => xScale(d.percent))
        .attr("y1", d => yScale(d.label) + yScale.bandwidth() / 2)
        .attr("y2", d => yScale(d.label) + yScale.bandwidth() / 2)
        .attr("stroke", palette.lightBlue)
        .attr("stroke-width", 5)
        .attr("stroke-linecap", "round");

    // dots at the end of the lines, with larger dots for higher percentages to make them more visually prominent
    g.selectAll(".dot")
        .data(overlapData)
        .enter()
        .append("circle")
        .attr("cx", d => xScale(d.percent))
        .attr("cy", d => yScale(d.label) + yScale.bandwidth() / 2)
        .attr("r", 10)
        .attr("fill", palette.blue);

    // rounded percent value next to the dot
    g.selectAll(".label")
        .data(overlapData)
        .enter()
        .append("text")
        .attr("x", d => xScale(d.percent) + 14)
        .attr("y", d => yScale(d.label) + yScale.bandwidth() / 2)
        .attr("dominant-baseline", "middle")
        .style("font-size", "12px")
        .style("font-weight", "700")
        .style("fill", palette.text)
        .text(d => `${Math.round(d.percent)}%`);
    
    // x-axis label
    g.append("text")
        .attr("x", width / 2)
        .attr("y", height + 35)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "600")
        .style("fill", palette.text)
        .text("Percent of Students");

    // y-axis label
    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -150)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "600")
        .style("fill", palette.text)
        .text("Mental Health Overlap");
}