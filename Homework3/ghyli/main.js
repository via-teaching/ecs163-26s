// Name: Yihong Li
// SID: 922439678
// AI Use: ChatGPT was used to explain d3 methods usage and definitions and aid in debugging console errors

let abFilter = 25;

// window dimensions
const width = window.innerWidth;
const height = window.innerHeight;

// sidebar unused = 0
const sidebarWidth = 0;

// left half: big scatterplot
let scatterLeft = sidebarWidth, scatterTop = 0;
let scatterMargin = { top: 100, right: 80, bottom: 100, left: 80 },
    scatterWidth = (width - sidebarWidth) * 0.5 - scatterMargin.left - scatterMargin.right,
    scatterHeight = height - scatterMargin.top - scatterMargin.bottom;

// top right: heatmap
let barLeft = (width - sidebarWidth) * 0.5, heatTop = 0;
let barMargin = { top: 100, right: 55, bottom: 80, left: 55 },
    barWidth = (width - sidebarWidth) * 0.5 - barMargin.left - barMargin.right,
    barHeight = height * 0.5 - barMargin.top - barMargin.bottom;

// g2 legend
const g2LegendBoxWidth = barWidth / 8;
const g2LegendBoxHeight = 14;

// bottom right: parallel coordinates
let paraLeft = (width - sidebarWidth) * 0.5, paraTop = height * 0.5;
let paraMargin = { top: 40, right: 50, bottom: 40, left: 40 },
    paraWidth = (width - sidebarWidth) * 0.5 - paraMargin.left - paraMargin.right,
    paraHeight = height * 0.5 - paraMargin.top - paraMargin.bottom;


// create plots
d3.csv("pokemon_alopez247.csv").then(rawData => {
    console.log("rawData", rawData);

    // define data we need for plot 1
    let plot1Data = structuredClone(rawData)
    plot1Data = plot1Data.map((d) => {
        return {
            total: Number(d.Total),
            catch_rate: Number(d.Catch_Rate),
            type: String(d.Type_1),
            isLegendary: d.isLegendary === "True",
            ...d
        };
    });

    // define the overall svg that holds all out plots
    const svg = d3.select("svg");

    // main title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 35)
        .attr("text-anchor", "middle")
        .attr("font-family", "Verdana")
        .attr("font-size", "24px")
        .attr("font-weight", "bold")
        .text("Pokemon Stats Dashboard");

    // sub title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 55)
        .attr("text-anchor", "middle")
        .attr("font-family", "Verdana")
        .attr("font-size", "12px")
        .text("Press shift key to toggle zoom and brush modes on the scatter plot. Brushing data updates the other two charts.");

    // set background and color
    svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "#cfdcc9")
        .lower();

    // add the graph container
    const g1 = svg.append("g")
        .attr("width", scatterWidth + scatterMargin.left + scatterMargin.right)
        .attr("height", scatterHeight + scatterMargin.top + scatterMargin.bottom)
        .attr("transform", `translate(${scatterLeft + scatterMargin.left}, ${scatterTop + scatterMargin.top})`);

    // create clipping region
    svg.append("defs")
        .append("clipPath")
        .attr("id", "circleDisappear")
        .append("rect")
        .attr("x", scatterLeft - 1.5)
        .attr("y", scatterTop - 1.5)
        .attr("width", scatterWidth + 4.5)
        .attr("height", scatterHeight + 4.5);

    // generate pokemon types
    const pokemonTypes = d3.nest()
        .key(d => d.type)
        .entries(plot1Data)
        .map(d => d.key);
    console.log(pokemonTypes)

    // generate x-axis
    const x1 = d3.scaleLinear()
        .domain(d3.extent(plot1Data, d => d.catch_rate))
        .range([0, scatterWidth])
    const xAxisCall = d3.axisBottom(x1).ticks(10);
    const xAxisGroup = g1.append("g")
        .attr("transform", `translate(0, ${scatterHeight})`)
        .call(xAxisCall)
    xAxisGroup.selectAll("text")
        .attr("text-anchor", "middle")
        .attr("font-family", "verdana")

    // generate y axis
    const y1 = d3.scaleLinear()
        .domain([0, 800])
        .range([scatterHeight, 0])
    const yAxisCall = d3.axisLeft(y1).ticks(800 / 100)
    const yAxisGroup = g1.append("g").call(yAxisCall);

    // plot the circles on the scatterplot
    const circlesGroup = g1.append("g").attr("clip-path", "url(#circleDisappear)");

    circlesGroup.selectAll("circle").data(plot1Data)
        .enter().append("circle")
        .attr("cx", d => x1(d.catch_rate))
        .attr("cy", d => y1(d.total))
        .attr("opacity", 0.5)
        .attr("r", "3")
        .attr("fill", (d) => d.isLegendary === "True" ? "red" : "black") // distinguish legendaries
        .append("title")
        .text(d =>
            `${d.Name}
    Type: ${d.type}
    Total Power: ${d.total}
    Catch Rate: ${d.catch_rate}`
        ); // hover tooltip



    // save original scales
    const originalX = x1.copy();
    const originalY = y1.copy();
    let currentG2X = x1;
    let currentG2Y = y1

    // create rectangle that captures zooming/panning action
    const zoomRect = g1.append("rect")
        .attr("width", scatterWidth)
        .attr("height", scatterHeight)
        .attr("fill", "none")
        .attr("pointer-events", "all");
    // set up the zoom function for the zoom rectangle
    const zoom = d3.zoom()
        .scaleExtent([1, 20])
        .translateExtent([[0, 0], [scatterWidth, scatterHeight]])
        .extent([[0, 0], [scatterWidth, scatterHeight]])
        .filter(() => !d3.event.shiftKey)
        .on("zoom", zoomed);
    zoomRect.call(zoom);

    // function that runs when zooming or panning is detected
    function zoomed() {
        const t = d3.event.transform;

        // rescale according to scroll
        currentG2X = t.rescaleX(originalX);
        currentG2Y = t.rescaleY(originalY);

        // rescale the axes
        xAxisGroup.call(d3.axisBottom(currentG2X).ticks(10));
        yAxisGroup.call(d3.axisLeft(currentG2Y).ticks(8));

        // regenerate the data circles
        circlesGroup.selectAll("circle")
            .attr("cx", d => currentG2X(d.catch_rate))
            .attr("cy", d => currentG2Y(d.total))
            .attr("r", "3")
            .attr("fill", d => d.isLegendary === "True" ? "red" : "black")
            .append("title")
            .text(d =>
                `${d.Name}
    Type: ${d.type}
    Total Power: ${d.total}
    Catch Rate: ${d.catch_rate}`
            );
    }


    // initialize brushing
    const brush = d3.brush()
        .extent([[-5, -5], [scatterWidth + 10, scatterHeight + 10]])
        .on("end", brushed);
    const brushGroup = g1.append("g")
        .attr("class", "brush")
        .call(brush)
        .raise();

    // start with brush disabled
    brushGroup.call(brush.move, null);
    brushGroup.select(".overlay").style("pointer-events", "none");
    // enable zooming with zoom rect 
    zoomRect.style("pointer-events", "all");
    let brushMode = false;

    // global function, where pressing shifting toggles between zooming and brushing modes
    d3.select(window)
        .on("keydown", function () {
            if (d3.event.key === "Shift") {
                if (!brushMode) {
                    // brush gets mouse events
                    brushGroup.select(".overlay").style("pointer-events", "all");
                    // zoom rect stops getting mouse events
                    zoomRect.style("pointer-events", "none");
                } else {
                    // brush stops getting mouse events
                    brushGroup.call(brush.move, null);
                    brushGroup.select(".overlay").style("pointer-events", "none");
                    // zoom rect gets mouse events again
                    zoomRect.style("pointer-events", "all");
                    renderG2(rawData)
                    renderG3(rawData)
                }
                brushMode = !brushMode
                modeText.text(brushMode ? "Brush Selection Mode\n(Shift to Toggle)" : "Zoom/Pan Mode\n(Shift to Toggle)");
                console.log("Brush Mode:", brushMode)
            }
        });

    // function when the brush region is created
    // selects the data points that were selected and updates the bar chart and 
    // parallel coordinates chart for only those points.
    function brushed() {
        if (!d3.event.selection) return;

        const [[x0, y0], [x1Brush, y1Brush]] = d3.event.selection;

        // select those in the brushed region
        const selected = plot1Data.filter(d => {
            const x = currentG2X(d.catch_rate);
            const y = currentG2Y(d.total);

            return x0 <= x && x <= x1Brush &&
                y0 <= y && y <= y1Brush;
        });

        // reset view to all data if nothing was selected
        if (selected.length === 0) {
            renderG2(rawData)
            renderG3(rawData)
        }
        // show only the selected points
        else {
            renderG2(selected)
            renderG3(selected)
        }
        console.log(selected);
    }

    // X label
    g1.append("text")
        .attr("x", scatterWidth / 2)
        .attr("y", scatterHeight + 60)
        .attr("font-size", "14px")
        .attr("font-family", "verdana")
        .attr("text-anchor", "middle")
        .text("Catch Rate");


    // Y label
    g1.append("text")
        .attr("x", -(scatterHeight / 2))
        .attr("y", -40)
        .attr("font-size", "14px")
        .attr("text-anchor", "middle")
        .attr("font-family", "verdana")
        .attr("transform", "rotate(-90)")
        .text("Total Power");

    // Plot 1 title
    g1.append("text")
        .text("Overall Pokemon Power vs. Catch Rate")
        .attr("x", scatterWidth / 2)
        .attr("text-anchor", "middle")
        .attr("font-family", "verdana")
        .attr("y", scatterTop)

    // brush/zoom mode text
    const modeText = g1.append("text")
        .attr("x", scatterWidth - 10)
        .attr("y", 30)
        .attr("text-anchor", "end")
        .attr("font-size", "13px")
        .attr("font-family", "Verdana")
        .attr("font-weight", "bold")
        .text("Zoom/Pan Mode (Shift to Toggle)");

    // legend labels
    const g1LegendData = [
        {
            name: "Legendary",
            color: "red"
        },
        {
            name: "Non-Legendary",
            color: "black"
        }
    ]

    // generate the color legend
    const g1Legend = g1
        .append("g")
        .attr("transform", `translate(${scatterWidth * 0.75}, ${scatterHeight + scatterMargin.bottom / 2})`);
    const g1LegendItems = g1Legend
        .selectAll("g")
        .data(g1LegendData)
        .join("g")
        .attr("transform", (d, i) => `translate(${i * 100}, 0)`); // place labels horizontally

    // colored box
    g1LegendItems
        .append("circle")
        .attr("r", 3)
        .attr("fill", (d) => d.color);

    // label
    g1LegendItems
        .append("text")
        .attr("x", 10)
        .attr("y", 3)
        .text((d) => `${d.name}`)
        .attr("text-anchor", "right")
        .style("font-size", "12px")
        .style("font-family", "Verdana");


    // add bar chart
    const g2 = svg.append("g")
        .attr("width", barWidth + barMargin.left + barMargin.right)
        .attr("height", barHeight + barMargin.top + barMargin.bottom)
        .attr("transform", `translate(${barLeft + barMargin.left}, ${heatTop + barMargin.top})`);

    // corresponding type colors for each pokemon type
    const pokemonTypeColors = {
        "Grass": "#78C850",
        "Fire": "#F08030",
        "Water": "#6890F0",
        "Bug": "#A8B820",
        "Normal": "#A8A878",
        "Poison": "#A040A0",
        "Electric": "#F8D030",
        "Ground": "#E0C068",
        "Fairy": "#EE99AC",
        "Fighting": "#C03028",
        "Psychic": "#F85888",
        "Rock": "#B8A038",
        "Ghost": "#705898",
        "Ice": "#98D8D8",
        "Dragon": "#7038F8",
        "Dark": "#705848",
        "Steel": "#B8B8D0",
        "Flying": "#A890F0"
    };

    // create a copy of the data for plot 2
    let plot2Data = structuredClone(rawData)

    // create an array of objects
    // each object represents a type and the count of pokemon for that type
    let types = [...new Set(plot2Data.map(d => d.Type_1))] // get unique types
    let typesCount = {}
    plot2Data.forEach(d => {
        if (typesCount[d.Type_1] === undefined) {
            typesCount[d.Type_1] = 0;
        }
        typesCount[d.Type_1]++
    })
    let barData = types.map(d => {
        return {
            type: d,
            count: typesCount[d]
        }
    })

    // groups for the axes
    const g2XGroup = g2.append("g").attr("transform", `translate(0, ${barHeight})`)
    const g2YGroup = g2.append("g").attr("transform", `translate(0, 0)`)

    // rendering function for the bar chart
    const renderG2 = (newData) => {
        // regenerate types count data
        typesCount = {}
        newData.forEach(d => {
            if (typesCount[d.Type_1] === undefined) {
                typesCount[d.Type_1] = 0;
            }
            typesCount[d.Type_1]++
        })
        let barData = types.map(d => {
            return {
                type: d,
                count: typesCount[d] || 0
            }
        })

        // create x axis to represent the types
        const x2 = d3.scaleBand()
            .domain(types)
            .range([0, barWidth])
            .padding(0.2)
        const xAxisCall2 = d3.axisBottom(x2).tickSize(0);
        g2XGroup
            .call(xAxisCall2)
            .selectAll("text")
            .attr("text-anchor", "start")
            .attr("font-size", "11px")
            .attr("transform", "rotate(40)");

        // create y axis to represent percentages
        const y2 = d3.scaleLinear()
            .domain([0, 100])
            .range([barHeight, 20])
        const yAxisCall2 = d3.axisLeft(y2).ticks(10)
        g2YGroup.call(yAxisCall2)
            .selectAll("text")
            .attr("text-anchor", "end")


        // generate the bars for the bar chart
        const bars = g2.selectAll(".type-bar")
            .data(barData, d => d.type);

        // remove old bars
        bars.exit().remove();

        // generate new bars
        bars.enter()
            .append("rect")
            .attr("class", "type-bar")
            .merge(bars)
            .transition()
            .duration(300)
            .attr("x", d => x2(d.type))
            .attr("y", d => y2(d.count / newData.length * 100 || 0))
            .attr("width", x2.bandwidth())
            .attr("height", d => barHeight - y2(d.count / newData.length * 100 || 0))
            .attr("fill", d => pokemonTypeColors[d.type])
            .text(d => d.count)

    // generate labels for the percentages
    const labels = g2.selectAll(".bar-label")
        .data(barData, d => d.type);

    // remove old labels and generate new ones with updated values
    labels.exit().remove();
    labels.enter()
        .append("text")
        .attr("class", "bar-label")
        .merge(labels)
        .transition()
        .duration(300) // transition for when brushing data changes the bar lengths
        .attr("x", d => x2(d.type) + x2.bandwidth() / 2)
        .attr("y", d => y2(d.count / newData.length * 100) - 5)
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .text(d => `${(d.count / newData.length * 100).toFixed(1)}%`);
    }

    // initial render of barchart
    renderG2(plot2Data)

    // Plot 2 title
    g2.append("text")
        .text("Type Distributions")
        .attr("x", barWidth / 2)
        .attr("text-anchor", "middle")
        .attr("font-family", "verdana")
        .attr("y", heatTop)

    // y axis label
    g2.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -barHeight / 2)
        .attr("y", -30)
        .attr("text-anchor", "middle")
        .attr("font-family", "verdana")
        .attr("font-size", "12px")
        .text("% of Selected");

// x axis label
g2.append("text")
    // .attr("transform", "rotate(-90)")
    .attr("x", barWidth / 2)
    .attr("y", barHeight + 50)
    .attr("text-anchor", "middle")
    .attr("font-family", "verdana")
    .attr("font-size", "12px")
    .text("Types");



// plot 3
// what kinds of Pokémon are harder to catch, and do legendary or mega-evolving pokemon have different physical/stat patterns?
// set required fields to the correct types
const plot3Data = rawData.map(d => {
    return {
        Power: Number(d.Total),
        Height_m: Number(d.Height_m),
        Weight_kg: Number(d.Weight_kg),
        Catch_Rate: Number(d.Catch_Rate),
        Generation: Number(d.Generation),
        HP: Number(d.HP),
        Attack: Number(d.Attack),
        Defense: Number(d.Defense),
        Sp_Atk: Number(d.Sp_Atk),
        Sp_Def: Number(d.Sp_Def),
        Speed: Number(d.Speed),
        Type: d.Type_1,
        hasMegaEvolution: d.hasMegaEvolution === "True",
        isLegendary: d.isLegendary === "True"
    }
})

// y axes labels
const g3Dimensions = [
    "Height_m",
    "Weight_kg",
    // "Power",
    // "Catch_Rate",
    // "Generation",
    "HP",
    "Attack",
    "Defense",
    "Sp_Atk",
    "Sp_Def",
    // "Speed",
    // "hasMegaEvolution",
];

// define the value ranges for the y axes
let g3DimensionsDomains = {};
g3Dimensions.forEach(stat => {
    if (stat === "Generation") {
        g3DimensionsDomains[stat] = ["1", "6"]
        return;
    }
    if (stat === "hasMegaEvolution") {
        g3DimensionsDomains[stat] = ["False", "True"]
    }
    g3DimensionsDomains[stat] = ["0", d3.extent(plot3Data, d => d[stat])[1]];
});



// spawn the plot's g
const g3 = svg.append("g")
    .attr("width", paraWidth + paraMargin.left + paraMargin.right)
    .attr("height", paraHeight + paraMargin.top + paraMargin.bottom)
    .attr("transform", `translate(${paraLeft + paraMargin.left}, ${paraTop})`);

// define x axis and scale
const x3 = d3.scalePoint()
    .domain(g3Dimensions)
    .range([0, paraWidth])
    .padding(0.2)

// define x axis labels and generate the axis
const x3AxisLabels = {
    Height_m: "Height(m)",
    Weight_kg: "Weight(kg)",
    HP: "HP",
    Attack: "Attack",
    Defense: "Defense",
    Sp_Atk: "Sp_Atk",
    Sp_Def: "Sp_Def",
    // Speed: "Speed",
    // Power: "Power",
    // Catch_Rate: "Catch Rate",
    // Generation: "Generation",
    // hasMegaEvolution: "Mega Evolution?",
};
const x3AxisCall = d3.axisBottom(x3).tickPadding(3).tickFormat(d => x3AxisLabels[d])
g3.append("g")
    .attr("transform", `translate(0, ${paraHeight - paraMargin.bottom + 25})`)
    .call(x3AxisCall)
    .selectAll("text")
    .attr("font-size", 12)

// generate all the y axes according to our predefined labels and ranges
const y3 = []
g3Dimensions.forEach((d, i) => {
    y3[i] = d3
        .scaleLinear()
        .domain(g3DimensionsDomains[d])
        .range([paraHeight - paraMargin.bottom, paraMargin.top])
})
const g3YAxisGroups = new Array(g3Dimensions.length)
g3Dimensions.forEach((d, i) => {
    g3YAxisGroups[i] = g3.append("g")
        .attr("transform", `translate(${x3(d)}, 0)`)
})

// function to generate the parallel coordinates plot
const renderG3 = (newData) => {
    const plot3Data = newData.map(d => {
        return {
            Power: Number(d.Total),
            Height_m: Number(d.Height_m),
            Weight_kg: Number(d.Weight_kg),
            Catch_Rate: Number(d.Catch_Rate),
            Generation: Number(d.Generation),
            HP: Number(d.HP),
            Attack: Number(d.Attack),
            Defense: Number(d.Defense),
            Sp_Atk: Number(d.Sp_Atk),
            Sp_Def: Number(d.Sp_Def),
            Speed: Number(d.Speed),
            Type: d.Type_1,

            hasMegaEvolution: d.hasMegaEvolution === "True",
            isLegendary: d.isLegendary === "True"
        }
    })

    // function for drawing lines between axes
    function path(d) {
        const data_points = g3Dimensions.map((p, i) => [x3(p), y3[i](d[p])]);
        return d3.line()(data_points);
    }
    const lines = g3.selectAll(".para-line")
        .data(plot3Data);

    // remove old lines
    lines.exit().remove();


    // draw lines between all the axes for each piece of data
    lines.enter()
        .append("path")
        .attr("class", "para-line")
        .merge(lines)
        .transition()
        .duration(300)
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", d => d.isLegendary ? "red" : "gray")
        .attr("opacity", d => d.isLegendary ? 0.5 : 0.5);

    // spawn in the y axes
    g3Dimensions.forEach((d, i) => {
        let y3AxisCall;
        if (d === "hasMegaEvolution") {
            y3AxisCall = d3.axisLeft(y3[i]).tickValues([0, 1])
                .tickFormat(value => value === 1 ? "True" : "False");;
        } else {
            y3AxisCall = d3.axisLeft(y3[i]).tickSize(2).ticks(5);
        }
        g3YAxisGroups[i].call(y3AxisCall)
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("font-size", 12)
            .attr("font-weight", "bold")
    });

    // make sure the lines do not cover the x axis 
    g3YAxisGroups.forEach(g => g.raise());

}

// first time render
renderG3(structuredClone(rawData))


// define legend labels
const g3LegendData = [
    {
        name: "Legendary",
        color: "red"
    },
    {
        name: "Non-Legendary",
        color: "grey"
    }
]

// generate legend
const g3Legend = g3
    .append("g")
    .attr("transform", `translate(${paraWidth / 4}, ${paraHeight + 50})`);
const g3LegendItems = g3Legend
    .selectAll("g")
    .data(g3LegendData)
    .join("g")
    .attr("transform", (d, i) => `translate(${i * 100}, 0)`); // place labels horizontally

// colored boxes
g3LegendItems
    .append("rect")
    .attr("width", 15)
    .attr("height", 15)
    .attr("fill", (d) => d.color);

// label
g3LegendItems
    .append("text")
    .attr("x", 20)
    .attr("y", 12)
    .text((d) => `${d.name}`)
    .attr("text-anchor", "right")
    .style("font-size", "14px")
    .style("font-family", "Verdana");



// Plot Title
g3.append("text")
    .text("Stat Profiles")
    .attr("x", paraWidth / 2)
    .attr("text-anchor", "middle")
    .attr("font-family", "verdana")
    .attr("y", 20)

// X-Axis Title
g3.append("text")
    .attr("x", paraWidth / 2)
    .attr("y", paraHeight + 25) // Placed at the very bottom
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-family", "Verdana")
    .text("Battle Attributes");

}).catch (function (error) {
    console.log(error);
});