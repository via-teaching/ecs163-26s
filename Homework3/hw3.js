// global variables

let pokemonData = []; // hold full dataset initially, with some changes
let currentGeneration = 0; // filter by generation, 0 is all generations

//margins for bar chart
const margin = { top: 40, right: 40, bottom: 40, left: 50 };
const width = 500 - margin.left - margin.right;
const height = 300 - margin.top - margin.bottom;

const barSvg = d3.select("#bar-chart").attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const barXAxisGroup = barSvg.append("g").attr("transform", `translate(0, ${height})`);
const barYAxisGroup = barSvg.append("g");

//margins for donut chart
const donutCanvasWidth = 700; // Extra room so legend and donut sit side-by-side
const donutCanvasHeight = 350;
const donutRadius = Math.min(donutCanvasWidth - 250, donutCanvasHeight) / 2 * 0.8;

const donutSvg = d3.select("#donut-chart")
    .attr("width", donutCanvasWidth)
    .attr("height", donutCanvasHeight)
    .append("g")
    // Centers the donut ring on the left side of the canvas
    .attr("transform", `translate(${(donutCanvasWidth - 200) / 2}, ${donutCanvasHeight / 2})`);

const pcpWidth = 1000 - margin.left - margin.right;
const pcpHeight = 320 - margin.top - margin.bottom;
const pcpSvg = d3.select("#pcp-chart")
    .attr("width", pcpWidth + margin.left + margin.right)
    .attr("height", pcpHeight + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

//legend height
const legendGroup = d3.select("#donut-chart")
    .append("g")
    .attr("transform", `translate(${width + 200 - 140}, 0)`);

// draws a legend and animates movement if certain types aren't there
function drawGlobalLegend(data) {
    const typeColors = {
        "Bug": "#a6b91abb", "Dark": "#353535", "Dragon": "#5816fe",
        "Electric": "#fffb00", "Fairy": "#ff8bc5", "Fighting": "#df0700",
        "Fire": "#ff8121", "Flying": "#c8b5ff", "Ghost": "#5a3689",
        "Grass": "#3da600", "Ground": "#b57147", "Ice": "#8cf7f7",
        "Normal": "#fee6ad", "Poison": "#8a0086", "Psychic": "#ff0073",
        "Rock": "#652f00", "Steel": "#8989a8", "Water": "#2469ff"
    };

    const types = Object.keys(typeColors);

    let activeTypes = new Set();
    data.forEach(d => {
        activeTypes.add(d.Type_1);
        if (d.Type_2 !== "N/A") activeTypes.add(d.Type_2); //checks if pokemon is dual type
    });

    const presentTypes = Array.from(activeTypes).sort();


    const legendItems = legendGroup.selectAll(".legend-item")
        .data(presentTypes, d => d);


    // smooths out missing legend types through fading out
    legendItems.exit()
        .transition().duration(500)
        .style("opacity", 0)
        .remove();

    // if entering, fade in
    const legendItemsEnter = legendItems.enter()
        .append("g")
        .attr("class", "legend-item")
        .style("opacity", 0);

    legendItemsEnter.append("rect")
        .attr("width", 12)
        .attr("height", 12)
        .attr("rx", 2)
        .attr("fill", d => typeColors[d]);

    legendItemsEnter.append("text")
        .attr("x", 20)
        .attr("y", 10)
        .style("font-family", "sans-serif")
        .style("font-size", "11px")
        .style("fill", "#2c3e50")
        .text(d => d);

    // merge and update into stack
    legendItems.merge(legendItemsEnter)
        .transition().duration(600)
        .style("opacity", 1)
        .attr("transform", (d, i) => `translate(0, ${i * 20})`);
}

function updateBarChart(data) {
    // label title and axes
    if (barSvg.select(".chart-title").empty()) {
        barSvg.append("text")
            .attr("class", "chart-title")
            .attr("x", width / 2)
            .attr("y", -15)
            .text("Average Total Stat Values For Each Generation");
    }

    if (barSvg.select(".y-axis-label").empty()) {
        barSvg.append("text")
            .attr("class", "axis-label y-axis-label")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -40)
            .text("Average Total Stats");
    }

    if (barSvg.select(".x-axis-label").empty()) {
        barSvg.append("text")
            .attr("class", "axis-label x-axis-label")
            .attr("x", width / 2)
            .attr("y", height + 35) // Places it safely below the Gen labels
            .text("Generation");
    }

    let genTotals = {};

    data.forEach(d => {
        let gen = d.Generation;
        let totalStat = parseFloat(d.Total);

        if (!gen || isNaN(totalStat)) return;

        if (!genTotals[gen]) {
            genTotals[gen] = { generation: gen, sum: 0, count: 0 };
        }
        genTotals[gen].sum += totalStat;
        genTotals[gen].count += 1;
    });

    const genAvgs = Object.keys(genTotals).map(key => {
        return {
            generation: "Gen " + key, // Labels as "Gen X"
            avgTotal: genTotals[key].sum / genTotals[key].count
        };
    });

    // scale x and y axes
    const xScale = d3.scaleBand()
        .domain(genAvgs.map(d => d.generation))
        .range([0, width])
        .padding(0.3); // Adds spacing between bars

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(genAvgs, d => d.avgTotal) * 1.1]) // Pad top edge by 10%
        .range([height, 0]);

    // transition bar growth
    barXAxisGroup.transition().duration(500).call(d3.axisBottom(xScale));
    barYAxisGroup.transition().duration(500).call(d3.axisLeft(yScale));

    // data join for bars
    const bars = barSvg.selectAll(".bar")
        .data(genAvgs, d => d.generation)
        .text(d => `Click to view Stats for Generation: ${d.generation}`);

    bars.exit().remove(); // a bit redundant since no bars are removed but just in case

    // animates bar from the ground up
    const barsEnter = bars.enter()
        .append("rect")
        .attr("class", "bar")
        .attr("fill", "#354a58")
        .attr("x", d => xScale(d.generation))
        .attr("y", height)
        .attr("width", xScale.bandwidth())
        .attr("height", 0);

    // tells user the main interaction
    barsEnter.append("title")
        .text(d => `Click to view stats for ${d.generation}`);

    // handles transitions for initial chart and later filtered charts
    bars.merge(barsEnter)
        .transition().duration(800)
        .attr("x", d => xScale(d.generation))
        .attr("width", xScale.bandwidth())
        .attr("y", d => yScale(d.avgTotal))
        .attr("height", d => height - yScale(d.avgTotal));

    // interactive section for the bars
    barSvg.selectAll(".bar")
        .on("mouseover", function () {
            // apply the hover color if this bar isn't already hovered/clicked
            if (!d3.select(this).classed("active")) {
                d3.select(this).attr("fill", "#7995a8");
            }
        })
        .on("mouseout", function () {
            // return to the default if bar isn't active
            if (!d3.select(this).classed("active")) {
                d3.select(this).attr("fill", "#354a58");
            }
        })
        .on("click", function (d) {
            // extract number from generation string
            const clickedGen = parseInt(d.generation.replace("Gen ", ""));

            // select chosen bar (generation)
            const targetBar = d3.select(this);
            const isAlreadyActive = targetBar.classed("active");

            // reset other bars to original default color
            barSvg.selectAll(".bar")
                .classed("active", false)
                .attr("fill", "#354a58");

            let filteredData = [];

            if (isAlreadyActive) {
                // if gen = 0, revert to stats for all generations (721 pokemon)
                currentGeneration = 0;
                filteredData = pokemonData;

            } else {
                // otherwise filter based on generation chosen
                targetBar.classed("active", true);
                currentGeneration = clickedGen;
                filteredData = pokemonData.filter(p => parseInt(p.Generation) === currentGeneration);

            }

            // update all other visualizations
            updateDonutChart(filteredData);
            updatePCP(filteredData);
            drawGlobalLegend(filteredData);
        });

}

function updateDonutChart(data) {
    // set title
    if (donutSvg.select(".chart-title").empty()) {
        donutSvg.append("text")
            .attr("class", "chart-title")
            .attr("x", 0)
            .attr("y", -140)
            .text("Counts for Various Pokemon Types");
    }

    let typeCounts = {};
    data.forEach(d => {
        let type1 = d.Type_1;
        let type2 = d.Type_2;
        if (!type1 || !type2) return;

        if (!typeCounts[type1]) {
            typeCounts[type1] = 0;
        }
        typeCounts[type1]++;

        if (type2 !== "N/A") {
            if (!typeCounts[type2]) {
                typeCounts[type2] = 0;
            }
            typeCounts[type2]++;
        }
    });

    // convert key-value type to count pairs into processable data
    const countsDonutData = Object.keys(typeCounts).map(key => {
        return { type: key, count: typeCounts[key] };
    });

    const typeColors = { // mainly used to differentiate all the pokemon types
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

    // create sector sizes based on count values
    const pie = d3.pie()
        .value(d => d.count)
        .sort((a, b) => d3.ascending(a.type, b.type));

    // set inner and outer radius of the donut chart
    const sectorArc = d3.arc()
        .innerRadius(donutRadius * 0.4) // bigger inner radius means bigger hole
        .outerRadius(donutRadius * 0.8);

    // join slices together
    const sectorArcs = donutSvg.selectAll(".donut-slice")
        .data(pie(countsDonutData), d => d.data.type);

    // remove sectors not satisfied by the filter (for example, there are no dark types
    // in generation 1, so filtering based on gen 1 means the dark sector disappears)
    sectorArcs.exit()
        .transition().duration(500)
        .style("opacity", 0)
        .remove();

    // create/change new slice 
    const sectorArcsEnter = sectorArcs.enter()
        .append("path")
        .attr("class", "donut-slice")
        .attr("fill", d => colorScale(d.data.type))
        .each(function (d) { this._current = d; }); // store initial angles

    // merge smoothly based on angle difference
    sectorArcs.merge(sectorArcsEnter)
        .style("opacity", 1)
        .transition().duration(800)
        .attrTween("d", function (d) {
            const interpolate = d3.interpolate(this._current, d);
            this._current = interpolate(0); // update cached position
            return function (t) {
                return sectorArc(interpolate(t));
            };
        });

    const countLabels = donutSvg.selectAll(".inner-slice-label")
        .data(pie(countsDonutData), d => d.data.type);

    // remove irrelevant count labels
    countLabels.exit().remove();

    // new labels for new slices
    const countLabelsEnter = countLabels.enter()
        .append("text")
        .attr("class", "inner-slice-label")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central"); //centers sector labels

    // transition and merge smoothly
    countLabels.merge(countLabelsEnter)
        .transition().duration(800)
        .attr("transform", d => {
            const centerPoint = sectorArc.centroid(d);
            return `translate(${centerPoint})`;
        })
        .text(d => {
            // if sector too small, don't add number
            const totalPokemonCount = d3.sum(countsDonutData, v => v.count);
            let percentage = (d.data.count / totalPokemonCount) * 100;
            return percentage > 2.5 ? d.data.count : "";
        });


}

function updatePCP(data) {

    // taken from hw 2
    let typeStatBreakdown = {};
    data.forEach(d => {
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

        if ((ty2 !== "N/A") && !(ty1 === ty2)) {
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

    const PCP_data = Object.keys(typeStatBreakdown).map(key => {
        return {
            type: key,
            HP: typeStatBreakdown[key].hp / typeStatBreakdown[key].count,
            Attack: typeStatBreakdown[key].atk / typeStatBreakdown[key].count,
            Defense: typeStatBreakdown[key].def / typeStatBreakdown[key].count,
            Sp_Attack: typeStatBreakdown[key].sp_atk / typeStatBreakdown[key].count,
            Sp_Defense: typeStatBreakdown[key].sp_def / typeStatBreakdown[key].count,
            Speed: typeStatBreakdown[key].spd / typeStatBreakdown[key].count
        };
    });

    console.log(PCP_data);
    // attributes being tracked for pcp
    const dimensions = ["HP", "Attack", "Defense", "Sp_Attack", "Sp_Defense", "Speed"];

    const typeColors = {
        "Bug": "#a6b91abb", "Dark": "#353535", "Dragon": "#5816fe",
        "Electric": "#fffb00", "Fairy": "#ff8bc5", "Fighting": "#df0700",
        "Fire": "#ff8121", "Flying": "#c8b5ff", "Ghost": "#5a3689",
        "Grass": "#3da600", "Ground": "#b57147", "Ice": "#8cf7f7",
        "Normal": "#fee6ad", "Poison": "#8a0086", "Psychic": "#ff0073",
        "Rock": "#652f00", "Steel": "#8989a8", "Water": "#2469ff"
    };

    const pcpXScale = d3.scalePoint()
        .range([0, pcpWidth])
        .domain(dimensions);

    const pcpYScales = {};
    dimensions.forEach(dim => {
        pcpYScales[dim] = d3.scaleLinear()
            .domain([20, d3.max(PCP_data, d => d[dim]) * 1.1])
            .range([pcpHeight, 0]);
    });

    function pathCoordinates(d) {
        return d3.line()(dimensions.map(dim => {
            const xPos = pcpXScale(dim);
            const yPos = pcpYScales[dim](d[dim]);
            return [xPos, yPos];
        }));
    }

    // handles smooth mvements of lines, and 
    // removes any lines that don't have types associated with it

    const lines = pcpSvg.selectAll(".pcp-line")
        .data(PCP_data, d => d.type);

    lines.exit().remove();

    const linesEnter = lines.enter()
        .append("path")
        .attr("class", "pcp-line")

    const linesMerge = lines.merge(linesEnter);

    linesMerge
        .transition().duration(800)
        .attr("d", pathCoordinates)
        .attr("stroke", d => typeColors[d.type] || "#95a5a6");

    linesMerge
        .on("mouseover", function (d) {

            pcpSvg.selectAll(".pcp-line")
                .style("stroke-opacity", 0.05)
                .style("stroke-width", "1px");


            d3.select(this)
                .style("stroke-opacity", 1)
                .style("stroke-width", "4px")
                .raise();
        })
        .on("mouseout", function (d) {

            pcpSvg.selectAll(".pcp-line")
                .style("stroke-opacity", 0.7)
                .style("stroke-width", "2px");
        });

    const axesGroups = pcpSvg.selectAll(".pcp-axis")
        .data(dimensions);

    axesGroups.exit().remove();

    const axesGroupsEnter = axesGroups.enter()
        .append("g")
        .attr("class", "pcp-axis");

    const axesGroupsMerge = axesGroups.merge(axesGroupsEnter);

    // reposition all axis containers 
    axesGroupsMerge
        .attr("transform", dim => `translate(${pcpXScale(dim)}, 0)`)
        .each(function (dim) {
            // ensure ticks are consistent
            d3.select(this).call(
                d3.axisLeft(pcpYScales[dim])
                    .ticks(6)
            );
        });

    // if label doesn't exist, add it
    axesGroupsMerge.each(function (dim) {
        const currentGroup = d3.select(this);

        if (currentGroup.select(".axis-title").empty()) {
            currentGroup.append("text")
                .attr("class", "axis-title")
                .style("text-anchor", "middle")
                .attr("y", -12)
                .style("font-family", "sans-serif")
                .style("font-size", "11px")
                .style("font-weight", "bold")
                .style("fill", "#2c3e50");
        }

        currentGroup.select(".axis-title") // converts _ to .
            .text(dim.replace("_", ". "));
    });
}

// data loading  
d3.csv("pokemon.csv").then(data => {
    pokemonData = data;
    pokemonData.forEach(function (d) {
        if (!(d.Type_2)) {
            d.Type_2 = "N/A"
        }
    });

    // update with full pokemon data initially
    updateBarChart(pokemonData);
    updateDonutChart(pokemonData);
    updatePCP(pokemonData);
    drawGlobalLegend(pokemonData);
});