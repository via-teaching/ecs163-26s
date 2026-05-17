// Name: Yihong Li
// SID: 922439678
// AI Usage: ChatGPT was used to define usage of d3 methods and debugging errors.

let abFilter = 25;
const width = window.innerWidth;
const height = window.innerHeight;

// sidebar unused = 0
const sidebarWidth = 0

// top half: big scatterplot
let scatterLeft = sidebarWidth, scatterTop = 0;
let scatterMargin = { top: 30, right: 80, bottom: 100, left: 80 },
    scatterWidth = (width - sidebarWidth) - scatterMargin.left - scatterMargin.right,
    scatterHeight = height * 0.5 - scatterMargin.top - scatterMargin.bottom;

// bottom left: heatmap
let heatLeft = sidebarWidth, heatTop = height * 0.5 + 20;
let heatMargin = { top: 40, right: 40, bottom: 80, left: 90 },
    heatWidth = (width - sidebarWidth) * 0.5 - heatMargin.left - heatMargin.right,
    heatHeight = height * 0.5 - heatMargin.top - heatMargin.bottom;

// g2 legend
const g2LegendBoxWidth = heatWidth / 8;
const g2LegendBoxHeight = 14;

// bottom right: parallel coordinates
let paraLeft = (width + sidebarWidth) * 0.5, paraTop = height * 0.5 + 20;
let paraMargin = { top: 20, right: 50, bottom: 50, left: 0 },
    paraWidth = (width - sidebarWidth) * 0.5 - paraMargin.left - paraMargin.right,
    paraHeight = height * 0.5 - paraMargin.top - paraMargin.bottom;


// plots
d3.csv("pokemon_alopez247.csv").then(rawData => {
    console.log("rawData", rawData);

    // define data we need for plot 1
    let plot1Data = structuredClone(rawData)
    plot1Data = plot1Data.map((d) => {
        return {
            total: Number(d.Total),
            type: String(d.Type_1),
            isLegendary: d.isLegendary === "True"
        };
    });

    // define the overall svg that holds all out plots
    const svg = d3.select("svg");

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

    // generate pokemon types
    const pokemonTypes = d3.nest()
        .key(d => d.type)
        .entries(plot1Data)
        .map(d => d.key);
    console.log(pokemonTypes)

    // generate x-axis
    const x1 = d3.scaleBand()
        .domain(pokemonTypes)
        .range([0, scatterWidth])
        .padding(0.1);
    const xAxisCall = d3.axisBottom(x1).ticks(pokemonTypes.length);
    g1.append("g")
        .attr("transform", `translate(0, ${scatterHeight})`)
        .call(xAxisCall)
        .selectAll("text")
        .attr("y", "10")
        .attr("x", "-5")
        .attr("text-anchor", "end")
        .attr("font-family", "verdana")
        .attr("transform", "rotate(-40)");

    // generate y axis
    const y1 = d3.scaleLinear()
        .domain([0, 800])
        .range([scatterHeight, 0])
    const yAxisCall = d3.axisLeft(y1).ticks(800 / 100)
    g1.append("g").call(yAxisCall);

    // plot the circles on the scatterplot
    // apply some random horizontal scatter to improve visibility
    const circles = g1.selectAll("circle").data(plot1Data);

    circles.enter().append("circle")
        .attr("cx", d => x1(d.type) + x1.bandwidth() / 2 + (Math.random() - 0.5) * x1.bandwidth() * 0.25)
        .attr("cy", d => y1(d.total))
        .attr("opacity", 0.7)
        .attr("r", (d) => d.isLegendary === true ? 3 : 2)
        .attr("fill", (d) => d.isLegendary === true ? "red" : "black");


    // X label
    g1.append("text")
        .attr("x", scatterWidth / 2)
        .attr("y", scatterHeight + 60)
        .attr("font-size", "14px")
        .attr("font-family", "verdana")
        .attr("text-anchor", "middle")
        .text("Type");


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
        .text("Overall Pokemon Types and Power Distributions")
        .attr("x", scatterWidth / 2)
        .attr("text-anchor", "middle")
        .attr("font-family", "verdana")
        .attr("y", scatterTop)

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
        .attr("transform", `translate(${scatterWidth * 0.75}, 0)`);
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


    // Plot 2 (heatmap): Which primary pokemon types tend to specialize in which base stats?
    const g2 = svg.append("g")
        .attr("width", heatWidth + heatMargin.left + heatMargin.right)
        .attr("height", heatHeight + heatMargin.top + heatMargin.bottom)
        .attr("transform", `translate(${heatLeft + heatMargin.left}, ${heatTop})`);

    // generate plot 2 data
    let plot2Data = structuredClone(rawData)
    plot2Data = plot2Data.map((d) => {
        return {
            type: String(d.Type_1),
            att: Number(d.Attack),
            def: Number(d.Defense),
            sp_att: Number(d.Sp_Atk),
            sp_def: Number(d.Sp_Def),
            spd: Number(d.Speed),
        };
    });

    // generate average stat values per type
    const groupedByType = d3.nest()
        .key(d => d.type)
        .rollup(v => ({
            att: d3.mean(v, d => d.att),
            def: d3.mean(v, d => d.def),
            sp_att: d3.mean(v, d => d.sp_att),
            sp_def: d3.mean(v, d => d.sp_def),
            spd: d3.mean(v, d => d.spd)
        }))
        .entries(plot2Data);

    // flatten into an array of objects and update plot 2 data
    plot2Data = groupedByType.flatMap(d => [
        { type: d.key, stat: "Attack", value: d.value.att },
        { type: d.key, stat: "Defense", value: d.value.def },
        { type: d.key, stat: "Sp. Attack", value: d.value.sp_att },
        { type: d.key, stat: "Sp. Defense", value: d.value.sp_def },
        { type: d.key, stat: "Speed", value: d.value.spd }
    ]);

    // the attributes to display
    const pokemonStatAttrs = [
        "Attack",
        "Defense",
        "Sp. Attack",
        "Sp. Defense",
        "Speed",
    ]

    console.log("plot2Data:", plot2Data);

    // x axis
    const x2 = d3.scaleBand()
        .domain(pokemonTypes)
        .range([0, heatWidth])
        .padding(0.2)
    const xAxisCall2 = d3.axisTop(x2).tickSize(0);
    g2.append("g")
        .attr("transform", `translate(0, ${heatMargin.top})`)
        .call(xAxisCall2)
        .selectAll("text")
        .attr("text-anchor", "start")
        .attr("font-size", "11px")
        .attr("transform", "rotate(-40)");

    // y axis
    const y2 = d3.scaleBand()
        .domain(pokemonStatAttrs)
        .range([0, heatHeight])
        .padding(0.2)

    const yAxisCall2 = d3.axisLeft(y2).tickSize(0);
    g2.append("g")
        .attr("transform", `translate(0, ${heatMargin.top})`)
        .call(yAxisCall2)
        .selectAll("text")
        .attr("text-anchor", "end")

    // color hues for the heatmap
    const g2Colors = [
        "#eff3ff", // 0–20
        "#bdd7e7", // 20–40
        "#74a9cf", // 40–60
        "#3182bd", // 60–80
        "#08519c"  // 80–100
    ];

    // get the domains for the y axes
    const valuesByStat = {};
    pokemonStatAttrs.forEach(stat => {
        const valuesForStat = plot2Data
            .filter(d => d.stat === stat)
            .map(d => d.value);

        valuesByStat[stat] = d3.extent(valuesForStat);
    });


    // create a scale for the color hues
    const g2ColorScale = (stat, value) => {
        const colorScale = d3.scaleQuantize()
            .domain(valuesByStat[stat])
            .range(g2Colors);

        return colorScale(value)
    }

    // add the heatmap squares
    // set the correct hues and add tooltips
    const rectangles = g2.selectAll("rect").data(plot2Data)
    rectangles.enter().append("rect")
        .attr("x", d => x2(d.type))
        .attr("y", d => heatMargin.top + y2(d.stat))
        .attr("height", y2.bandwidth())
        .attr("width", x2.bandwidth())
        .attr("fill", d => g2ColorScale(d.stat, d.value))
        .append("title")
        .text(
            (d) => `${d.type}\n${d.stat}\n% of Max Stat Value: ${d.value.toFixed(1)}`
        );// apply a text when hovered



    // Plot 2 title
    g2.append("text")
        .text("Stat Specialties by Type")
        .attr("x", heatWidth / 2)
        .attr("text-anchor", "middle")
        .attr("font-family", "verdana")
        .attr("y", heatTop + heatMargin.top / 2)

    // Plot 2 color legend
    const g2Legend = g2.append("g")
        .attr("class", "heatmap-legend")
        .attr("transform", `translate(${heatWidth / 4}, ${heatMargin.top + heatHeight + 10})`);

    // colored rectangles to represent each hue
    g2Legend.selectAll("rect")
        .data(g2Colors)
        .enter()
        .append("rect")
        .attr("x", (d, i) => i * g2LegendBoxWidth)
        .attr("y", 5)
        .attr("width", g2LegendBoxWidth)
        .attr("height", g2LegendBoxHeight)
        .attr("fill", d => d)
        .attr("stroke", "black")
        .attr("stroke-width", 0.1);

    // labels
    g2Legend.selectAll("text")
        .data(["0-20", "20-40", "40-60", "60-80", "80-100"])
        .enter()
        .append("text")
        .attr("x", (d, i) => i * g2LegendBoxWidth + g2LegendBoxWidth / 2)
        .attr("y", g2LegendBoxHeight / 2 + 25)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        // .attr("fill", "white")
        .text(d => d);

    // legend title
    g2Legend
        .append("text")
        .attr("x", heatWidth / 4)
        .attr("y", 0)
        .attr("text-anchor", "middle")
        .text("% of Max Stat Value")
        .attr("font-size", "13px")


    // X/Y label
    g2.append("text")
        .attr("x", -30)
        .attr("y", 10)
        .attr("font-size", "14px")
        .attr("text-anchor", "middle")
        .attr("font-family", "verdana")
        .attr("transform", "rotate(-45)")
        .text("Stat\\Type");

    // Plot 2 title
    g2.append("text")
        .text("Stat Specializations per Type")
        .attr("x", heatWidth / 2)
        .attr("text-anchor", "middle")
        .attr("font-family", "verdana")
        .attr("y", 0)





    // plot 3
    // what kinds of Pokémon are harder to catch, and do legendary or mega-evolving pokemon have different physical/stat patterns?

    // y axes labels
    const g3Dimensions = [
        "Height_m",
        "Weight_kg",
        "Power",
        "Catch_Rate",
        "Generation",
        "hasMegaEvolution",
    ];

    // generate data needed for plot 3
    const plot3Data = rawData.map(d => {
        return {
            Power: Number(d.Total),
            Height_m: Number(d.Height_m),
            Weight_kg: Number(d.Weight_kg),
            Catch_Rate: Number(d.Catch_Rate),
            Generation: Number(d.Generation),
            hasMegaEvolution: d.hasMegaEvolution === "True",
            isLegendary: d.isLegendary === "True"
        }
    })

    console.log("plot 3 data:", plot3Data)

    // the ranges for the y axes
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


    console.log(g3DimensionsDomains)

    // generate the plot
    const g3 = svg.append("g")
        .attr("width", paraWidth + paraMargin.left + paraMargin.right)
        .attr("height", paraHeight + paraMargin.top + paraMargin.bottom)
        .attr("transform", `translate(${paraLeft + paraMargin.left}, ${paraTop})`);

    // define x axis
    const x3 = d3.scalePoint()
        .domain(g3Dimensions)
        .range([0, paraWidth])
        .padding(0.2)
    // define y axes according to our predefined labels and ranges
    const y3 = []
    g3Dimensions.forEach((d, i) => {
        y3[i] = d3
            .scaleLinear()
            .domain(g3DimensionsDomains[d])
            .range([paraHeight - paraMargin.bottom, paraMargin.top])
    })

    // the function to create a line across all axes for one data point
    function path(d) {
        // creates an array of x, y points.
        const data_points = g3Dimensions.map((p, i) => [x3(p), y3[i](d[p])]);
        // returns svg to generate a line across all points
        return d3.line()(data_points);
    }

    // generate all the lines and color them by department
    g3.selectAll("path")
        .data(plot3Data)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", d => d.isLegendary === true ? "red" : "gray")
        .attr("opacity", d => d.isLegendary === true ? 0.5 : 0.2);

    // create x axis and define labels

    const x3AxisLabels = {
        Height_m: "Height(m)",
        Weight_kg: "Weight(kg)",
        Power: "Power",
        Catch_Rate: "Catch Rate",
        Generation: "Generation",
        hasMegaEvolution: "Mega Evolution?"
    };
    const x3AxisCall = d3.axisBottom(x3).tickPadding(3).tickFormat(d => x3AxisLabels[d])
    g3.append("g")
        .attr("transform", `translate(0, ${paraHeight - paraMargin.bottom + 25})`)
        .call(x3AxisCall)
        .selectAll("text")
        .attr("font-size", 12)

    // generate y-axes
    g3Dimensions.forEach((d, i) => {
        let y3AxisCall;
        if (d === "hasMegaEvolution") {
            y3AxisCall = d3.axisLeft(y3[i]).tickValues([0, 1])
                .tickFormat(value => value === 1 ? "True" : "False");;
        } else {
            y3AxisCall = d3.axisLeft(y3[i]).tickSize(2).ticks(5);
        }

        g3.append("g")
            .attr("transform", `translate(${x3(d)}, 0)`)
            .call(y3AxisCall)
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("font-size", 12)
            // .attr("dy", "-.3em")
            .attr("font-weight", "bold")
        // .attr("transform", "rotate(-)");
    });

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

    // generate legens
    const g3Legend = g3
        .append("g")
        .attr("transform", `translate(${paraWidth / 4}, ${paraHeight + paraHeight * 0.05})`);
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
        .text("Legendary vs. Non-Legendary Profiles")
        .attr("x", paraWidth / 2)
        .attr("text-anchor", "middle")
        .attr("font-family", "verdana")
        .attr("y", 0)

    // X-Axis Title
    g3.append("text")
        .attr("x", paraMargins.left + paraWidth / 2)
        .attr("y", paraHeight - 25) // Placed at the very bottom
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-family", "Verdana")
        .text("Incentive Amount (BDT)");

}).catch(function (error) {
    console.log(error);
});