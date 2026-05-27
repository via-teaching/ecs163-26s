const width = window.innerWidth;
const height = window.innerHeight;

// layout
let bar1Left = 0, bar1Top = 0;
let bar1Margin = {top: 50, right: 30, bottom: 75, left: 70},
    bar1Width = width * 0.56 - bar1Margin.left - bar1Margin.right,
    bar1Height = height * 0.46 - bar1Margin.top - bar1Margin.bottom;

let pieLeft = width * 0.59, pieTop = 0;
let pieMargin = {top: 50, right: 30, bottom: 40, left: 30},
    pieWidth = width * 0.38 - pieMargin.left - pieMargin.right,
    pieHeight = height * 0.46 - pieMargin.top - pieMargin.bottom;

let paraLeft = 0, paraTop = height * 0.50;
let paraMargin = {top: 60, right: 160, bottom: 45, left: 70},
    paraWidth = width - paraMargin.left - paraMargin.right - 40,
    paraHeight = height * 0.46 - paraMargin.top - paraMargin.bottom;

// load data
d3.csv("./pokemon_alopez247.csv").then(rawData => {
    console.log("rawData", rawData);

    rawData.forEach(function(d) {
        d.Total = Number(d.Total);
        d.HP = Number(d.HP);
        d.Attack = Number(d.Attack);
        d.Defense = Number(d.Defense);
        d.Sp_Atk = Number(d.Sp_Atk);
        d.Sp_Def = Number(d.Sp_Def);
        d.Speed = Number(d.Speed);
        d.Generation = Number(d.Generation);
        d.Height_m = Number(d.Height_m);
        d.Weight_kg = Number(d.Weight_kg);
    });

    const processedData = rawData.filter(d => d.Type_1 != "").map(d => {
        return {
            Name: d.Name,
            Type_1: d.Type_1,
            Type_2: d.Type_2,
            Total: d.Total,
            HP: d.HP,
            Attack: d.Attack,
            Defense: d.Defense,
            Sp_Atk: d.Sp_Atk,
            Sp_Def: d.Sp_Def,
            Speed: d.Speed,
            Generation: d.Generation,
            Height_m: d.Height_m,
            Weight_kg: d.Weight_kg,
            isLegendary: d.isLegendary
        };
    });

    console.log("processedData", processedData);

    const svg = d3.select("svg")
        .attr("width", width)
        .attr("height", height);

    // color by Pokemon type
    const types = Array.from(new Set(processedData.map(d => d.Type_1)));

    const typeColor = {
        "Water": "#1f77b4",
        "Normal": "#9e9e9e",
        "Grass": "#2ca02c",
        "Bug": "#8bc34a",
        "Fire": "#d62728",
        "Psychic": "#c77dd4",
        "Rock": "#8b6f47",
        "Electric": "#ffd92f",
        "Ground": "#6b3f1d",
        "Poison": "#006400",
        "Dark": "#4b0082",
        "Fighting": "#f4a742",
        "Dragon": "#fb8072",
        "Ghost": "#b39ddb",
        "Ice": "#80c7ff",
        "Steel": "#7f7f7f",
        "Fairy": "#f7b6d2",
        "Flying": "#add8e6"
    };

    const color = d3.scaleOrdinal()
        .domain(types)
        .range(types.map(t => typeColor[t] || "#999999"));

    // calculate average weight and count for each type
    const typeWeight = Array.from(
        d3.group(processedData, d => d.Type_1),
        ([key, v]) => {
            const validWeight = v.filter(d => d.Weight_kg > 0);

            return {
                Type_1: key,
                avgWeight: d3.mean(validWeight, d => d.Weight_kg),
                count: v.length
            };
        }
    ).filter(d => d.avgWeight > 0);

    typeWeight.sort((a, b) => b.avgWeight - a.avgWeight);
    console.log("typeWeight", typeWeight);

    // count Pokemon numbers for each type
    const typeCounts = Array.from(
        d3.group(processedData, d => d.Type_1),
        ([key, v]) => {
            return {
                Type_1: key,
                count: v.length
            };
        }
    );

    typeCounts.sort((a, b) => b.count - a.count);
    console.log("typeCounts", typeCounts);

    // average battle stats for each type
    const typeStats = Array.from(
        d3.group(processedData, d => d.Type_1),
        ([key, v]) => {
            return {
                Type_1: key,
                HP: d3.mean(v, d => d.HP),
                Attack: d3.mean(v, d => d.Attack),
                Defense: d3.mean(v, d => d.Defense),
                Sp_Atk: d3.mean(v, d => d.Sp_Atk),
                Sp_Def: d3.mean(v, d => d.Sp_Def),
                Speed: d3.mean(v, d => d.Speed)
            };
        }
    );

    console.log("typeStats", typeStats);

    let chosen = null;
    let brush = {};

    function inBrush(t) {
        const d = typeStats.find(x => x.Type_1 == t);

        if (!d) {
            return true;
        }

        for (let k in brush) {
            let r = brush[k];

            if (d[k] < r[0] || d[k] > r[1]) {
                return false;
            }
        }

        return true;
    }

    function showType(t) {
        if (chosen != null && chosen != t) {
            return false;
        }

        if (!inBrush(t)) {
            return false;
        }

        return true;
    }

    function pickType(t) {
        if (chosen == t) {
            chosen = null;
        } else {
            chosen = t;
        }

        update();
    }

    function update() {
        // update bar chart
        g1.selectAll(".barRect")
            .transition()
            .duration(500)
            .attr("opacity", d => showType(d.Type_1) ? 1 : 0.16);

        g1.selectAll(".weightLabel")
            .transition()
            .duration(500)
            .attr("opacity", d => showType(d.Type_1) ? 1 : 0.16);

        // update pie chart
        pieGroup.selectAll(".pieSlice")
            .transition()
            .duration(500)
            .attr("opacity", d => showType(d.data.Type_1) ? 0.95 : 0.16);

        pieGroup.selectAll(".pieLabel")
            .transition()
            .duration(500)
            .attr("opacity", d => showType(d.data.Type_1) ? 1 : 0.22);

        pieGroup.selectAll(".labelLine")
            .transition()
            .duration(500)
            .attr("opacity", d => showType(d.data.Type_1) ? 0.75 : 0.12);

        // update parallel coordinates
        g3.selectAll(".typeLine")
            .transition()
            .duration(500)
            .attr("opacity", d => showType(d.Type_1) ? 0.85 : 0.07)
            .attr("stroke-width", d => showType(d.Type_1) ? 3.5 : 1.2);

        // update legend
        legend.selectAll(".legendCircle")
            .transition()
            .duration(500)
            .attr("opacity", d => showType(d.Type_1) ? 1 : 0.2);

        legend.selectAll(".legendText")
            .transition()
            .duration(500)
            .attr("opacity", d => showType(d.Type_1) ? 1 : 0.25);
    }

    // plot 1: bar chart

    const g1 = svg.append("g")
        .attr("width", bar1Width + bar1Margin.left + bar1Margin.right)
        .attr("height", bar1Height + bar1Margin.top + bar1Margin.bottom)
        .attr("transform", `translate(${bar1Left + bar1Margin.left}, ${bar1Top + bar1Margin.top})`);

    // bar chart title
    g1.append("text")
        .attr("x", bar1Width / 2)
        .attr("y", -18)
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .attr("text-anchor", "middle")
        .text("Average Pokemon Weight by Primary Type");

    // bar x label
    g1.append("text")
        .attr("x", bar1Width / 2)
        .attr("y", bar1Height + 62)
        .attr("font-size", "15px")
        .attr("text-anchor", "middle")
        .text("Primary Type");

    // bar y label
    g1.append("text")
        .attr("x", -(bar1Height / 2))
        .attr("y", -50)
        .attr("font-size", "15px")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text("Average Weight (kg)");

    const x1 = d3.scaleBand()
        .domain(typeWeight.map(d => d.Type_1))
        .range([0, bar1Width])
        .paddingInner(0.25)
        .paddingOuter(0.1);

    const y1 = d3.scaleLinear()
        .domain([0, d3.max(typeWeight, d => d.avgWeight)])
        .range([bar1Height, 0])
        .nice();

    // bar x axis
    g1.append("g")
        .attr("transform", `translate(0, ${bar1Height})`)
        .call(d3.axisBottom(x1))
        .selectAll("text")
            .attr("y", "8")
            .attr("x", "-5")
            .attr("text-anchor", "end")
            .attr("transform", "rotate(-40)");

    // bar y axis
    g1.append("g")
        .call(d3.axisLeft(y1).ticks(6));

    // bar rectangles
    g1.selectAll(".barRect")
        .data(typeWeight)
        .enter()
        .append("rect")
        .attr("class", "barRect")
        .attr("x", d => x1(d.Type_1))
        .attr("y", bar1Height)
        .attr("width", x1.bandwidth())
        .attr("height", 0)
        .attr("fill", d => color(d.Type_1))
        .attr("opacity", 1)
        .attr("cursor", "pointer")
        .on("click", function(event, d) {
            pickType(d.Type_1);
        })
        .transition()
        .duration(800)
        .delay((d, i) => i * 35)
        .attr("y", d => y1(d.avgWeight))
        .attr("height", d => bar1Height - y1(d.avgWeight));

    // value labels on bars
    g1.selectAll(".weightLabel")
        .data(typeWeight)
        .enter()
        .append("text")
        .attr("class", "weightLabel")
        .attr("x", d => x1(d.Type_1) + x1.bandwidth() / 2)
        .attr("y", d => y1(d.avgWeight) - 5)
        .attr("font-size", "10px")
        .attr("text-anchor", "middle")
        .attr("opacity", 0)
        .text(d => d.avgWeight.toFixed(0))
        .transition()
        .duration(800)
        .delay((d, i) => i * 35 + 300)
        .attr("opacity", 1);

    // plot 2: pie chart overview

    const g2 = svg.append("g")
        .attr("width", pieWidth + pieMargin.left + pieMargin.right)
        .attr("height", pieHeight + pieMargin.top + pieMargin.bottom)
        .attr("transform", `translate(${pieLeft + pieMargin.left}, ${pieTop + pieMargin.top})`);

    // pie chart title
    g2.append("text")
        .attr("x", pieWidth / 2)
        .attr("y", -18)
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .attr("text-anchor", "middle")
        .text("Overview: Pokemon Type Distribution");

    const radius = Math.min(pieWidth, pieHeight) / 2 - 10;

    const pieGroup = g2.append("g")
        .attr("transform", `translate(${pieWidth / 2}, ${pieHeight / 2 + 8})`);

    const pie = d3.pie()
        .value(d => d.count)
        .sort(null);

    const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(radius);

    const outerArc = d3.arc()
        .innerRadius(radius * 1.18)
        .outerRadius(radius * 1.18);

    const pieData = pie(typeCounts);

    // pie slices
    pieGroup.selectAll(".pieSlice")
        .data(pieData)
        .enter()
        .append("path")
        .attr("class", "pieSlice")
        .attr("fill", d => color(d.data.Type_1))
        .attr("stroke", "white")
        .attr("stroke-width", 1.3)
        .attr("opacity", 0.92)
        .attr("cursor", "pointer")
        .on("click", function(event, d) {
            pickType(d.data.Type_1);
        })
        .transition()
        .duration(900)
        .delay((d, i) => i * 35)
        .attrTween("d", function(d) {
            const a = d3.interpolate(
                {startAngle: 0, endAngle: 0},
                d
            );

            return function(t) {
                return arc(a(t));
            };
        });

    // pie outside lines
    pieGroup.selectAll(".labelLine")
        .data(pieData)
        .enter()
        .append("polyline")
        .attr("class", "labelLine")
        .attr("points", function(d) {
            const p1 = arc.centroid(d);
            const p2 = outerArc.centroid(d);
            const p3 = outerArc.centroid(d);

            p3[0] = radius * 1.35 * (midAngle(d) < Math.PI ? 1 : -1);

            if (d.data.Type_1 == "Flying") {
                p2[1] = p2[1] - 9;
                p3[1] = p3[1] - 9;
            }

            if (d.data.Type_1 == "Fairy") {
                p2[1] = p2[1] + 25;
                p3[1] = p3[1] + 25;
            }

            if (d.data.Type_1 == "Steel") {
                p2[1] = p2[1] + 2;
                p3[1] = p3[1] + 2;
            }

            return [p1, p2, p3];
        })
        .attr("fill", "none")
        .attr("stroke", "#666")
        .attr("stroke-width", 0.8)
        .attr("opacity", 0)
        .transition()
        .duration(700)
        .delay(700)
        .attr("opacity", 0.75);

    // pie labels
    pieGroup.selectAll(".pieLabel")
        .data(pieData)
        .enter()
        .append("text")
        .attr("class", "pieLabel")
        .attr("transform", function(d) {
            const pos = outerArc.centroid(d);
            pos[0] = radius * 1.42 * (midAngle(d) < Math.PI ? 1 : -1);

            if (d.data.Type_1 == "Flying") {
                pos[1] = pos[1] - 9;
            }

            if (d.data.Type_1 == "Fairy") {
                pos[1] = pos[1] + 25;
            }

            if (d.data.Type_1 == "Steel") {
                pos[1] = pos[1] + 2;
            }

            return `translate(${pos[0]}, ${pos[1]})`;
        })
        .attr("font-size", "10px")
        .attr("font-weight", "bold")
        .attr("text-anchor", d => midAngle(d) < Math.PI ? "start" : "end")
        .attr("opacity", 0)
        .text(d => d.data.Type_1)
        .transition()
        .duration(700)
        .delay(750)
        .attr("opacity", 1);

    function midAngle(d) {
        return d.startAngle + (d.endAngle - d.startAngle) / 2;
    }

    // plot 3: parallel coordinates

    const g3 = svg.append("g")
        .attr("width", paraWidth + paraMargin.left + paraMargin.right)
        .attr("height", paraHeight + paraMargin.top + paraMargin.bottom)
        .attr("transform", `translate(${paraLeft + paraMargin.left}, ${paraTop + paraMargin.top})`);

    // parallel coordinates title
    g3.append("text")
        .attr("x", paraWidth / 2)
        .attr("y", -25)
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .attr("text-anchor", "middle")
        .text("Advanced View: Average Battle Stats by Type");

    const dims = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];

    const x3 = d3.scalePoint()
        .domain(dims)
        .range([0, paraWidth]);

    const y3 = {};

    dims.forEach(function(dim) {
        y3[dim] = d3.scaleLinear()
            .domain([0, d3.max(typeStats, d => d[dim])])
            .range([paraHeight, 0])
            .nice();
    });

    function path(d) {
        return d3.line()(dims.map(function(dim) {
            return [x3(dim), y3[dim](d[dim])];
        }));
    }

    // lines for every Pokemon type
    g3.selectAll(".typeLine")
        .data(typeStats)
        .enter()
        .append("path")
        .attr("class", "typeLine")
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", d => color(d.Type_1))
        .attr("stroke-width", 3)
        .attr("opacity", 0)
        .attr("cursor", "pointer")
        .on("click", function(event, d) {
            pickType(d.Type_1);
        })
        .transition()
        .duration(900)
        .delay((d, i) => i * 45)
        .attr("opacity", 0.75);

    // axes for stats
    const axisGroup = g3.selectAll(".dimension")
        .data(dims)
        .enter()
        .append("g")
        .attr("class", "dimension")
        .attr("transform", d => `translate(${x3(d)}, 0)`);

    axisGroup.each(function(d) {
        d3.select(this).call(d3.axisLeft(y3[d]).ticks(5));
    });

    // axis names
    axisGroup.append("text")
        .attr("y", -10)
        .attr("font-size", "13px")
        .attr("font-weight", "bold")
        .attr("text-anchor", "middle")
        .attr("fill", "black")
        .text(d => d);

    // brush on each stat axis
    axisGroup.append("g")
        .attr("class", "brush")
        .each(function(dim) {
            d3.select(this).call(
                d3.brushY()
                    .extent([[-14, 0], [14, paraHeight]])
                    .on("brush end", function(event) {
                        if (event.selection) {
                            let a = event.selection.map(y3[dim].invert);

                            brush[dim] = [
                                Math.min(a[0], a[1]),
                                Math.max(a[0], a[1])
                            ];
                        } else {
                            delete brush[dim];
                        }

                        update();
                    })
            );
        });

    // note for parallel coordinates
    g3.append("text")
        .attr("x", 0)
        .attr("y", paraHeight + 30)
        .attr("font-size", "13px")
        .attr("fill", "#555")
        .text("Each line is one Pokemon type. Brush an axis to filter types by average battle stat.");

    // bottom note
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height - 30)
        .attr("font-size", "13px")
        .attr("text-anchor", "middle")
        .attr("fill", "#666")
        .text("Interaction: click a bar, pie slice, line, or legend item to select a type. Brush a stat axis to filter types.");

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height - 12)
        .attr("font-size", "13px")
        .attr("text-anchor", "middle")
        .attr("fill", "#444")
        .text("This dashboard explores how Pokemon primary types relate to body size, type distribution, and average battle stats.");

    // legend
    const legend = svg.append("g")
        .attr("transform", `translate(${width - 145}, ${paraTop + 60})`);

    legend.append("text")
        .attr("x", 0)
        .attr("y", -14)
        .attr("font-size", "13px")
        .attr("font-weight", "bold")
        .text("Type Legend");

    // legend circles
    legend.selectAll(".legendCircle")
        .data(typeCounts)
        .enter()
        .append("circle")
        .attr("class", "legendCircle")
        .attr("cx", 0)
        .attr("cy", (d, i) => i * 18)
        .attr("r", 5)
        .attr("fill", d => color(d.Type_1))
        .attr("cursor", "pointer")
        .on("click", function(event, d) {
            pickType(d.Type_1);
        });

    // legend text
    legend.selectAll(".legendText")
        .data(typeCounts)
        .enter()
        .append("text")
        .attr("class", "legendText")
        .attr("x", 12)
        .attr("y", (d, i) => i * 18 + 4)
        .attr("font-size", "12px")
        .attr("cursor", "pointer")
        .text(d => d.Type_1)
        .on("click", function(event, d) {
            pickType(d.Type_1);
        });

}).catch(function(error) {
    console.log(error);
});