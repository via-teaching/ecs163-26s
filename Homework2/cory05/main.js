//initial dimensions of the three plots

let heatmapMargins = { top: 35, right: 20, bottom: 90, left: 90 },
    heatmapWidth = 500 - heatmapMargins.left - heatmapMargins.right,
    heatmapHeight = 500 - heatmapMargins.top - heatmapMargins.bottom;

let barChartMargins = { top: 20, right: 20, bottom: 80, left: 80 },
    barChartWidth = 900 - barChartMargins.left - barChartMargins.right,
    barChartHeight = 500 - barChartMargins.top - barChartMargins.bottom;

let pcpMargins = { top: 50, right: 50, bottom: 50, left: 50 },
    pcpWidth = 1200 - pcpMargins.left - pcpMargins.right,
    pcpHeight = 400 - pcpMargins.top - pcpMargins.bottom;

// plots
d3.csv("pokemon_alopez247.csv").then(rawData => {

    // for heatmap ensure that type x/y has the same count as y/x
    // mono types are treated as type x/x
    var type1 = []
    rawData.forEach(function (d) {
        if (!(type1.includes(d.Type_1))) {
            type1.push(d.Type_1);
        }

        if (!d.Type_2) {
            d.Type_2 = d.Type_1;
        }

    });

    console.log("rawData", rawData);
    type1.sort(); // sorts the heatmap's axes by alphabetical order
    var type2 = [...type1];

    console.log("Type1", type1);
    console.log("Type2", type2);

    const svg = d3.select("svg");

    // plot 1: 2-D Heatmap
    const g1 = svg.append("g")
        .attr("transform", `translate(${heatmapMargins.left}, ${heatmapMargins.top})`);

    // heatmap title
    svg.append("text")
        .attr("x", heatmapWidth / 2 + 85)
        .attr("y", 25)
        .attr("font-size", "20px")
        .attr("text-anchor", "middle")
        .style("font-weight", "bold")
        .style("font-family", "Arial")
        .text("Heatmap of Dual and Mono Type Pokemon");

    // X label for heatmap
    g1.append("text")
        .attr("x", heatmapWidth / 2)
        .attr("y", heatmapHeight + 60)
        .attr("font-size", "15px")
        .attr("text-anchor", "middle")
        .style("font-family", "Arial")
        .text("Pokemon Type 1");


    // Y label for heatmap
    g1.append("text")
        .attr("x", -(heatmapHeight / 2))
        .attr("y", -60)
        .attr("font-size", "15px")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .style("font-family", "Arial")
        .text("Pokemon Type 2");

    // scaleBand organizes the heatmap into equal sized cells with padding to separate x-values
    var x1 = d3.scaleBand()
        .range([0, heatmapWidth])
        .domain(type1)
        .padding(0.05);

    // axisBottom sets one row of pokemon types as the x-axis
    g1.append("g")
        .attr("transform", `translate(0, ${heatmapHeight})`)
        .call(d3.axisBottom(x1))
        .selectAll("text")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-45)");

    // organizes the y-axis into equal size cells with padding to separate
    var y1 = d3.scaleBand()
        .range([heatmapHeight, 0])
        .domain(type2)
        .padding(0.05);
    g1.append("g")
        .call(d3.axisLeft(y1)); // another row of all 18 pokemon types as y-axis

    // scaleThreshold causes barriers between numbers and associates colors into different
    // buckets depending on how many pokemon are of that particular type.
    // intervals are (-inf - 0), (1 - 4), (5 - 9), (10 - 19), (20 - inf).
    var heatmapColor = d3.scaleThreshold()
        .domain([1, 5, 10, 20])
        .range(["#e7e7e7", "#fff3ae", "#ffd350", "#ff8d3c", "#db0202"]);

    var heatmapCount = [] // initialization of heatmapCount Object Array

    // adds a count if pokemon fits a particular duo/mono type
    for (let i = 0; i < type1.length; i++) {
        for (let j = i; j < type2.length; j++) {
            let t1 = type1[i];
            let t2 = type2[j];
            let count = rawData.filter(d => (d.Type_1 === t1 && d.Type_2 === t2)
                || (d.Type_1 === t2 && d.Type_2 === t1)).length;
            heatmapCount.push({ x: t1, y: t2, ct: count });
            if (!(t1 === t2)) {
                heatmapCount.push({ x: t2, y: t1, ct: count });
            }
        }
    }

    g1.selectAll("rect")
        .data(heatmapCount)
        .enter()
        .append("rect")
        .attr("x", d => x1(d.x))
        .attr("y", d => y1(d.y))
        .attr("width", x1.bandwidth()) // centralizes cell shape
        .attr("height", y1.bandwidth())
        .style("fill", d => heatmapColor(d.ct))
        .append("title")
        .text(d => `${d.x}/${d.y}; Count: ${d.ct}`);

    // puts legend on the right of the visualization
    const heatmapLegend_x = heatmapWidth + 20;
    const heatmapLegend_y = 0;
    const heatmapLegend = g1.append("g")
        .attr("transform", `translate(${heatmapLegend_x}, ${heatmapLegend_y})`);

    const heatmapLegendSize = 20;
    heatmapLegend.selectAll("rect")
        .data(heatmapColor.range()) // based on intervals set by scaleThreshold
        .enter()
        .append("rect")
        .attr("x", 0)
        .attr("y", (d, i) => i * (heatmapLegendSize + 5)) // legend squares cascade downward
        .attr("width", heatmapLegendSize)
        .attr("height", heatmapLegendSize)
        .style("fill", d => d)
        .style("stroke", "#000000")
        .style("stroke-width", "1px");

    const legendLabels = ["0", "1-4", "5-9", "10-19", "20+"]; // intervals here
    heatmapLegend.selectAll("text")
        .data(legendLabels)
        .enter()
        .append("text")
        .attr("x", heatmapLegendSize + 10)
        .attr("y", (d, i) => i * (heatmapLegendSize + 5) + (heatmapLegendSize / 2))
        .attr("dy", ".35em")
        .style("font-size", "12px")
        .style("font-family", "Arial")
        .text(d => d);

    heatmapLegend.append("text")
        .attr("x", 0)
        .attr("y", -10)
        .style("font-weight", "bold")
        .style("font-size", "14px")
        .style("font-family", "Arial")
        .text("Count Legend");

    //Plot 2: Bar Chart
    svg.append("text")
        .attr("x", barChartWidth * 1.4)
        .attr("y", 25)
        .attr("font-size", "20px")
        .attr("text-anchor", "middle")
        .style("font-weight", "bold")
        .style("font-family", "Arial")
        .text("Average Total Stat Values For Each Type");

    const g2 = svg.append("g") // puts bar chart to the right of heatmap
        .attr("transform", `translate(${heatmapWidth + heatmapMargins.left +
            heatmapMargins.right + 200}, ${barChartMargins.top})`);

    // X label for bar chart
    g2.append("text")
        .attr("x", (barChartWidth / 2))
        .attr("y", barChartHeight + 50)
        .attr("font-size", "14px")
        .attr("text-anchor", "middle")
        .style("font-family", "Arial")
        .text("Type");


    // Y label for bar chart
    g2.append("text")
        .attr("x", -(barChartHeight / 2))
        .attr("y", -45)
        .attr("font-size", "14px")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .style("font-family", "Arial")
        .text("Average Total Stats");

    let typeTotals = {}; // key value pair, 
    // where type is the key, and sum of total stat values is the "value"

    rawData.forEach(d => {
        let ty1 = d.Type_1;
        let ty2 = d.Type_2;

        if (!typeTotals[ty1]) {
            typeTotals[ty1] = { sum: 0, count: 0 };
        }

        typeTotals[ty1].sum += Number(d.Total);
        typeTotals[ty1].count += 1;

        if (!(ty1 === ty2)) {
            if (!typeTotals[ty2]) {
                typeTotals[ty2] = { sum: 0, count: 0 };
            }
            typeTotals[ty2].sum += Number(d.Total);
            typeTotals[ty2].count += 1;
        }
    });

    // to find the average, divide the sum by the count and prepare to use for bar chart

    const barChartData = Object.keys(typeTotals).map(key => {
        return {
            type: key,
            avgTotalStats: typeTotals[key].sum / typeTotals[key].count
        };
    });

    console.log("First data point:", barChartData[0]);

    const x2 = d3.scaleBand() // separates bars cleanly
        .domain(barChartData.map(d => d.type).sort())
        .range([0, barChartWidth])
        .padding(0.3);


    const y2 = d3.scaleLinear() // makes the bar height scale correctly
        .domain([0, d3.max(barChartData, d => d.avgTotalStats)])
        .nice() // rounds off extreme ticks cleanly
        .range([barChartHeight, 0]);

    g2.append("g")
        .attr("transform", `translate(0, ${barChartHeight})`)
        .call(d3.axisBottom(x2))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

    g2.append("g")
        .call(d3.axisLeft(y2));

    const typeColors = { // mainly used to different all the pokemon types
        "Bug": "#a6b91abb", "Dark": "#353535", "Dragon": "#5816fe",
        "Electric": "#fffb00", "Fairy": "#ff8bc5", "Fighting": "#df0700",
        "Fire": "#ff8121", "Flying": "#c8b5ff", "Ghost": "#5a3689",
        "Grass": "#3da600", "Ground": "#b57147", "Ice": "#8cf7f7",
        "Normal": "#fee6ad", "Poison": "#8a0086", "Psychic": "#ff0073",
        "Rock": "#652f00", "Steel": "#8989a8", "Water": "#2469ff"
    };

    const colorScale = d3.scaleOrdinal() // associates type with a certain 
        // color from the data structure above
        .domain(Object.keys(typeColors))
        .range(Object.values(typeColors));

    g2.selectAll(".bar")
        .data(barChartData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x2(d.type))
        .attr("y", d => y2(d.avgTotalStats))
        .attr("width", x2.bandwidth())
        .attr("height", d => barChartHeight - y2(d.avgTotalStats))
        .attr("fill", d => colorScale(d.type))
        .attr("stroke", "#000000")
        .append("title")
        .text(d => `${d.type}; Average Total Stats: ${d.avgTotalStats.toFixed(1)}`);

    //Plot 3 Parallel Coordinates Plot
    const g3 = svg.append("g")
        .attr("transform", `translate(${pcpMargins.left}, ${heatmapHeight + 200})`);

    svg.append("text")
        .attr("x", pcpWidth * 0.55)
        .attr("y", pcpHeight * 1.75)
        .attr("font-size", "20px")
        .attr("text-anchor", "middle")
        .style("font-weight", "bold")
        .style("font-family", "Arial")
        .text("Average Core Stat Values for the Five Most Common Pokemon Types");

    let typeStatBreakdown = {};

    rawData.forEach(d => { // creates data structure to 
        // hold sum of core pokemon stats for each type
        let ty1 = d.Type_1;
        let ty2 = d.Type_2;

        if (!typeStatBreakdown[ty1]) {
            typeStatBreakdown[ty1] = {
                hp: 0, atk: 0, sp_atk: 0,
                def: 0, sp_def: 0, spd: 0, count: 0
            };
        }

        typeStatBreakdown[ty1].hp += Number(d.HP);
        typeStatBreakdown[ty1].atk += Number(d.Attack);
        typeStatBreakdown[ty1].sp_atk += Number(d.Sp_Atk);
        typeStatBreakdown[ty1].def += Number(d.Defense);
        typeStatBreakdown[ty1].sp_def += Number(d.Sp_Def);
        typeStatBreakdown[ty1].spd += Number(d.Speed);
        typeStatBreakdown[ty1].count += 1;

        if (!(ty1 === ty2)) {
            if (!typeStatBreakdown[ty2]) {
                typeStatBreakdown[ty2] = {
                    hp: 0, atk: 0, sp_atk: 0,
                    def: 0, sp_def: 0, spd: 0, count: 0
                };
            }

            typeStatBreakdown[ty2].hp += Number(d.HP);
            typeStatBreakdown[ty2].atk += Number(d.Attack);
            typeStatBreakdown[ty2].sp_atk += Number(d.Sp_Atk);
            typeStatBreakdown[ty2].def += Number(d.Defense);
            typeStatBreakdown[ty2].sp_def += Number(d.Sp_Def);
            typeStatBreakdown[ty2].spd += Number(d.Speed);
            typeStatBreakdown[ty2].count += 1;
        }
    });

    // once again, average is sum divided by count for each core stat
    const PCP_data = Object.keys(typeStatBreakdown).map(key => {
        return {
            type: key,
            avg_hp: typeStatBreakdown[key].hp / typeStatBreakdown[key].count,
            avg_atk: typeStatBreakdown[key].atk / typeStatBreakdown[key].count,
            avg_spAtk: typeStatBreakdown[key].sp_atk / typeStatBreakdown[key].count,
            avg_def: typeStatBreakdown[key].def / typeStatBreakdown[key].count,
            avg_spDef: typeStatBreakdown[key].sp_def / typeStatBreakdown[key].count,
            avg_spd: typeStatBreakdown[key].spd / typeStatBreakdown[key].count
        };
    });

    console.log(PCP_data);

    const dimensions = ["avg_hp", "avg_atk", "avg_def", "avg_spAtk", "avg_spDef", "avg_spd"];

    const PCP_x = d3.scalePoint() // associates (x,y) pair with a location on the visualization
        .range([0, pcpWidth])
        .domain(dimensions);

    const yScales = {};
    dimensions.forEach(dim => {
        yScales[dim] = d3.scaleLinear() // ensures y-axis (average values) scale cleanly
            .domain([50, 95])
            .range([pcpHeight, 0]);
    });

    // using top 5 common types instead of all to prevent messiness
    const top5_commonTypes = ["Water", "Normal", "Grass", "Psychic", "Flying"];
    const filteredPCP_data = PCP_data.filter(d => top5_commonTypes.includes(d.type));

    console.log(filteredPCP_data);

    const lineGenerator = d3.line() // produces a line based on the points added
        .x(d => PCP_x(d.key))
        .y(d => yScales[d.key](d.value));

    g3.selectAll(".pcp-line")
        .data(filteredPCP_data)
        .enter()
        .append("path")
        .attr("d", d => {
            return lineGenerator(dimensions.map(p => ({ key: p, value: d[p] })));
        })
        .attr("fill", "none")
        .attr("stroke", d => colorScale(d.type)) // Reusing colorScale for bar chart
        .attr("stroke-width", 3)
        .attr("opacity", 0.9);

    dimensions.forEach(dim => {
        g3.append("g")
            .attr("transform", `translate(${PCP_x(dim)}, 0)`)
            .each(function (d) { d3.select(this).call(d3.axisLeft(yScales[dim])); })
            .append("text")
            .style("font-size", "14px")
            .style("text-anchor", "middle")
            .attr("y", -10)
            .text(dim.replace("avg_", "").toUpperCase()) // changes label by removing avg and capitalizing
            .style("fill", "black");
    });

    const pcpLegend = g3.append("g")
        .attr("transform", `translate(${pcpWidth + 50}, 0)`); // adds legend on the right of pcp

    pcpLegend.append("text")
        .attr("y", -10)
        .style("font-weight", "bold")
        .style("font-size", "14px")
        .style("font-family", "Arial")
        .text("Type Legend");

    const pcpLegendItems = pcpLegend.selectAll(".pcp-legend-item")
        .data(top5_commonTypes)
        .enter()
        .append("g")
        .attr("transform", (d, i) => `translate(0, ${i * 30})`); // cascade squares of legend downwards


    // associates type with corresponding color for the legend
    const pcpLegendSize = 20;
    pcpLegendItems.append("rect")
        .attr("width", pcpLegendSize)
        .attr("height", pcpLegendSize)
        .attr("fill", d => colorScale(d))
        .attr("stroke", "#000000")


    pcpLegendItems.append("text")
        .attr("x", 25)
        .attr("y", 14)
        .style("font-size", "14px")
        .style("font-family", "Arial")
        .text(d => d);

}).catch(function (error) {
    console.log(error);
});