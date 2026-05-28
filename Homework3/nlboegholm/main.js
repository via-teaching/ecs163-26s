//Define colors used for visualizations
const typeColors = {
    Bug: "#92BC2C",
    Dark: "#595761",
    Dragon: "#0C69C8",
    Electric: "#F2D94E",
    Fairy: "#EE90E6",
    Fighting: "#D3425F",
    Fire: "#FBA54C",
    Flying: "#A1BBEC",
    Ghost: "#5F6DBC",
    Grass: "#5FBD58",
    Ground: "#DA7C4D",
    Ice: "#75D0C1",
    Normal: "#A0A29F",
    Poison: "#B763CF",
    Psychic: "#FA8581",
    Rock: "#C9BB8A",
    Steel: "#5695A3",
    Water: "#539DDF"
};

//Mouse over feature
const tooltip = d3.select("body")
    .append("div")
    .style("position", "absolute")
    .style("background", "white")
    .style("border", "1px solid #ccc")
    .style("border-radius", "5px")
    .style("padding", "8px")
    .style("font-size", "12px")
    .style("pointer-events", "none")
    .style("opacity", 0);


//Global variables used to implement interaction between charts
var selectType = null;   //selected Pokemon as global so can toggle state
var prevType = null;    //tracks previous selectType for chart3 animation
var procData = [];      //populated after cvs load with processed data used by all charts


//Main program to build charts 

//Load csv
d3.csv("data/pokemon.csv").then(data => {
    console.log("data", data);

    //Extract and convert columns to numbers used for charts
    //Remove rows with empty weight/height
    //Add a isLegendary column
    procData = data.map(d => ({
        number: d.Number,
        name: d.Name,
        type: d.Type_1,
        type2: d.Type_2,
        generation: d.Generation,
        weight: Number(d.Weight_kg),
        height: Number(d.Height_m),
        HP: Number(d.HP),
        Attack: Number(d.Attack),
        Defense: Number(d.Defense),
        Sp_Atk: Number(d.Sp_Atk),
        Sp_Def: Number(d.Sp_Def),
        Speed: Number(d.Speed),
        isLegendary: d.isLegendary === "True"
    })).filter(d => !isNaN(d.weight) && !isNaN(d.height));
    console.log("processedData", procData);

    //Build charts (chart2,chart3 with full dataset)
    chart1();
    chart2(null);
    chart3(null);

}).catch(function (error) {
    console.log(error);
});


function chart1BarClick(event, d) {
    //Handler for chart1 mouseclick
    //Event MouseEvent object with details about the event - not (yet) used
    console.log("chart1BarClick d=", d) //d the selected bar (type: "Fire", count: 52)
    const bars = d3.selectAll("#g1 rect");

    prevType = selectType; // needed to animate 
    selectType = (selectType === d.type) ? null : d.type;

    bars.transition().duration(100)
        .attr("fill", b =>
            (selectType === null || selectType === b.type)
                ? (typeColors[b.type] || "#ccc")
                : "#ccc"
        );

    //update otyher charts with selected type
    chart2(selectType);
    chart3(selectType);
}


function chart1() {
    //Using D3 barchart as foundation
    //Display Count by type, count (data two columns)
    //Rollup counts # Pokemons by type
    //Requires D3 v6 with better functions for rollup/grouping data.
    var dataCountsByType = d3.rollup(
        procData,
        v => v.length,
        d => d.type
    );

    //Convert to Array needed by D3 scales
    var chartData = Array.from(dataCountsByType, ([key, value]) => ({
        type: key,
        count: value
    }))
        .sort((a, b) => b.count - a.count); // Sort with largest to the left
    console.log("bar Data:", dataCountsByType);

    //Choose HTML container and get its dimensions
    const container = d3.select("#g1");
    const width = container.node().clientWidth;
    const height = container.node().clientHeight + 10;
    const margin = { top: 10, right: 20, bottom: 70, left: 30 };

    //Create x,y scales based on chartData Arrays - X is type and Y is count
    //Group Sort by descending frequency
    const xScale = d3.scaleBand()
        .domain(d3.groupSort(chartData, ([d]) => -d.count, (d) => d.type))
        .range([margin.left, width - margin.right])
        .padding(0.1);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(chartData, (d) => d.count)])
        .range([height - margin.bottom, margin.top]);

    //Create svg container with viewBox so chart will adjust to window resize
    const svg = container.append("svg")
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const bars = svg.append("g")
        .selectAll()
        .data(chartData)
        .join("rect")
        .attr("x", d => xScale(d.type))
        .attr("y", d => yScale(d.count))
        .attr("height", d => yScale(0) - yScale(d.count))
        .attr("width", xScale.bandwidth())
        .attr("fill", d => typeColors[d.type] || "#999")
        .attr("rx", 3)
        .style("cursor", "pointer")
        .on("click", (event, d) => chart1BarClick(event, d));

    //Label values on top of each bar
    svg.append("g")
        .selectAll()
        .data(chartData)
        .join("text")
        .attr("x", d => xScale(d.type) + xScale.bandwidth() / 2)
        .attr("y", d => yScale(d.count) - 4)
        .attr("text-anchor", "middle")
        .style("font-size", "9px")
        .style("fill", "#333")
        .text(d => d.count.toFixed(0));

    //X axis (pokemon type)
    svg.append("g")
        .attr("transform", `translate(0, ${height - margin.bottom})`)
        .call(d3.axisBottom(xScale).tickSizeOuter(0))
        .call(g => g.selectAll("text")
            .attr("transform", "rotate(-40)")
            .style("text-anchor", "end")
            .attr("class", "x-axis"))
        .call(g => g.append("text")
            .attr("x", width / 2)
            .attr("y", margin.bottom - 20)
            .attr("fill", "currentColor")
            .attr("text-anchor", "middle")
            .attr("class", "x-label")
            .text("Type"));

    //Y axis (avg total stats)
    svg.append("g")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(yScale))
        .call(g => g.select(".domain").remove()) //Remove domain line
        .call(g => g.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -(height / 2) + 10)
            .attr("y", -margin.left + 0)
            .attr("fill", "currentColor")
            .attr("text-anchor", "middle")
            .attr("class", "y-label")
            .text("Count"));

};

function chart2(type = null) {

    //Using D3 circle to draw scatterplot for all types or one type
    //First time called build the complete chart with all data
    //Subsequent calls refresh chart with data for type

    //type = null      : Draw all data , update axes, animate data 
    //type = a string  : Draw only for one pokemon type, update axes, animate data

    //If type provided, filter chartData based on type
    var chartData = procData;
    if (type !== null)
        chartData = procData.filter(d => d.type === type);
    console.log("Chart2 chartData:", chartData);

    const container = d3.select("#g2");
    const width = container.node().clientWidth;
    const height = container.node().clientHeight - 10;
    const margin = { top: 10, right: 10, bottom: 70, left: 30 };

    //Scatter plot tooltip helper functions
    function mouseOver(event, d) {
        d3.select(this)
            .attr("opacity", 1)
            .attr("r", d.isLegendary ? 9 : 6);

        tooltip.style("opacity", 1)
            .html(`
                <strong>${d.number} ${d.name}</strong><br>
                Type: ${d.type}<br>
                Attack: ${d.Attack}<br>
                Speed: ${d.Speed}<br>
                ${d.isLegendary ? "⭐ Legendary" : ""}
                `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
    }
    function mouseOut(event, d) {
        d3.select(this)
            .attr("opacity", 0.8)
            .attr("r", d.isLegendary ? 7 : 4);

        tooltip.style("opacity", 0);
    }

    if (container.select("svg").empty()) {
        console.log("Chart2 create!");

        //First call, build the complete chart
    
        //Create svg container with viewBox so chart will adjust to window resize, add zoom
        const svg = container.append("svg")
            .attr("preserveAspectRatio", "xMinYMin meet")
            .attr("viewBox", `0 0 ${width} ${height}`)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        //Create x,y scales based on chartData 
        //Store on function so helper functions can use scales
        chart2.xScale = d3.scaleLinear()
            .domain([0, d3.max(chartData, d => d.Attack) + 5])
            .range([margin.left, width - margin.right]);

        chart2.yScale = d3.scaleLinear()
            .domain([0, d3.max(chartData, d => d.Speed) + 5])
            .range([height - margin.bottom, margin.top]);

        chart2.cx = chart2.xScale(d3.mean(chartData, d => d.Attack));
        chart2.cy = chart2.yScale(d3.mean(chartData, d => d.Speed));


        //Add clip path (so dots dont render outside the chart area)
        svg.append("defs").append("clipPath")
            .attr("id", "clip2")
            .append("rect")
            .attr("x", margin.left)
            .attr("y", margin.top)
            .attr("width", width - margin.left - margin.right)
            .attr("height", height - margin.top - margin.bottom);

        //Add circle for each Pokemon and give it class 'dots' so can reference for animation 
        svg.append("g").attr("class", "brush"); // !IMPORTANT! first append brush before dots so mouseover works!
        svg.append("g")
            .attr("class", "dots")
            .attr("clip-path", "url(#clip2)")
            .selectAll()
            .data(chartData)
            .join("circle")
            .attr("cx", d => chart2.xScale(d.Attack))
            .attr("cy", d => chart2.yScale(d.Speed))
            //Legendary pokemon get a larger dot
            .attr("r", d => d.isLegendary === "True" ? 7 : 4)
            .attr("fill", d => typeColors[d.type] || "#999")
            //Legendary pokemon get a gold border
            .attr("stroke", d => d.isLegendary === "True" ? "gold" : "white")
            .attr("stroke-width", d => d.isLegendary === "True" ? 2 : 0.5)
            .attr("opacity", 0.8)
            //Hover effects :)
            .on("mouseover", mouseOver)
            .on("mouseout", mouseOut);

        //Add X axis and label
        chart2.xAxis = svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0, ${height - margin.bottom})`)
            .call(d3.axisBottom(chart2.xScale).tickSizeOuter(0))
            .call(g => g.append("text")
                .attr("x", width / 2)
                .attr("y", margin.bottom - 20)
                .attr("fill", "currentColor")
                .attr("text-anchor", "middle")
                .attr("class", "x-label")
                .text("Attack"));

        //Add Y axis and label
        chart2.yAxis = svg.append("g")
            .attr("transform", `translate(${margin.left}, 0)`)
            .attr("class", "y-axis")
            .call(d3.axisLeft(chart2.yScale))
            .call(g => g.select(".domain").remove()) //remove the domain line
            .call(g => g.append("text")
                .attr("transform", "rotate(-90)")
                .attr("x", -(height / 2))
                .attr("y", -margin.left - 10)
                .attr("fill", "currentColor")
                .attr("text-anchor", "middle")
                .attr("class", "y-label")
                .text("Speed"));

        //Create helper fucntions used every time chart2 is called

        //Using brush
        function brush(svg) {
            chart2.xDomain = chart2.xScale.domain();  //save originals for reset
            chart2.yDomain = chart2.yScale.domain();

            const b = d3.brush()
                .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]])
                .on("end", (event) => {
                    if (!event.selection) return;
                    const [[x0, y0], [x1, y1]] = event.selection;
                    chart2.xScale.domain([chart2.xScale.invert(x0), chart2.xScale.invert(x1)]);
                    chart2.yScale.domain([chart2.yScale.invert(y1), chart2.yScale.invert(y0)]);
                    svg.select(".brush").call(b.move, null);  //clear brush box
                    svg.select(".dots").selectAll("circle")
                        .transition().duration(400)
                        .attr("cx", d => chart2.xScale(d.Attack))
                        .attr("cy", d => chart2.yScale(d.Speed));
                    svg.select(".x-axis").transition().duration(400).call(d3.axisBottom(chart2.xScale).tickSizeOuter(0));
                    svg.select(".y-axis").transition().duration(400).call(d3.axisLeft(chart2.yScale));
                });
            svg.select(".brush").call(b);
            chart2.b = b;  //store for reset
        }
        brush(svg);

        d3.select("#reset-zoom").on("click", () => {
            chart2.xScale.domain(chart2.xDomain);
            chart2.yScale.domain(chart2.yDomain);
            svg.select(".brush").call(chart2.b.move, null);
            container.select("svg g .dots").selectAll("circle")
                .transition().duration(400)
                .attr("cx", d => chart2.xScale(d.Attack))
                .attr("cy", d => chart2.yScale(d.Speed));
            container.select("svg g .x-axis").transition().duration(400).call(d3.axisBottom(chart2.xScale).tickSizeOuter(0));
            container.select("svg g .y-axis").transition().duration(400).call(d3.axisLeft(chart2.yScale));
        });

        //end of first time called    
        return;
    }

    //Only executed if called after first creation (from chart1BarClick)
    console.log("Chart2 update!", type);

    d3.select("#g2\\.h3").text(type
        ? `Battle Stats - Attack vs Speed — ${type} Type`
        : "Battle Stats - Attack vs Speed by Type");

    //Animate scatterplot in/out using keyed join
    container.select("svg g .dots").selectAll("circle")
        .data(chartData, d => d.name)
        .join(
            enter => enter.append("circle")
                .attr("cx", chart2.cx)
                .attr("cy", chart2.cy)
                .attr("r", 0)
                .attr("fill", d => typeColors[d.type] || "#999")
                .attr("stroke", d => d.isLegendary ? "gold" : "white")
                .attr("stroke-width", d => d.isLegendary ? 2 : 0.5)
                .attr("opacity", 0.8)
                .call(enter => enter.transition().duration(600).ease(d3.easeCubicInOut)
                    .attr("cx", d => chart2.xScale(d.Attack))
                    .attr("cy", d => chart2.yScale(d.Speed))
                    .attr("r", d => d.isLegendary ? 7 : 4)),
            update => update
                .call(u => u.transition().duration(400).ease(d3.easeCubicInOut)
                    .attr("opacity", 0.8)),
            exit => exit
                .call(e => e.transition().duration(600).ease(d3.easeCubicInOut)
                    .attr("cx", chart2.cx)
                    .attr("cy", chart2.cy)
                    .attr("r", 0)
                    .remove()
                )
        )
        .on("mouseover", mouseOver)
        .on("mouseout", mouseOut);

}


function chart3(type) {

    //Using D3 sankey with 2 nodes
    //First time called build the complete chart with all data
    //Subsequent calls refresh chart highlight only type

    //type = null      : Draw all data  
    //type = a string  : Draw only for one pokemon type, 


    //Choose HTML container and get its dimensions
    const container = d3.select("#g3");
    const width = container.node().clientWidth;
    const height = container.node().clientHeight + 10;
    const margin = { top: 10, right: 20, bottom: 20, left: 100 };

    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const nodeWidth = 18;
    const nodePadding = 6;

    //Ribbon helper fucntion
    function ribbonPath(x0, sy0, sy1, x1, ty0, ty1) {
        const mx = (x0 + x1) / 2;
        return `M ${x0} ${sy0} C ${mx} ${sy0}, ${mx} ${ty0}, ${x1} ${ty0}
                L ${x1} ${ty1} C ${mx} ${ty1}, ${mx} ${sy1}, ${x0} ${sy1} Z`;
    }

    //First call, add svg and labels
    if (container.select("svg").empty()) {
        const svg = container.append("svg")
            .attr("preserveAspectRatio", "xMinYMin meet")
            .attr("viewBox", `0 0 ${width} ${height}`);

        svg.append("g")
            .attr("class", "chart3-content")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        //persistent axis labels — updated via chart3.leftLabel / chart3.rightLabel
        const labelG = svg.append("g");
        chart3.leftLabel = labelG.append("text")
            .attr("x", margin.left - 55).attr("y", height / 2)
            .attr("transform", `rotate(-90, ${margin.left - 55}, ${height / 2})`)
            .attr("text-anchor", "middle").style("font-size", "14px").attr("fill", "currentColor");
        chart3.rightLabel = labelG.append("text")
            .attr("x", width - margin.right + 70).attr("y", height / 2)
            .attr("transform", `rotate(90, ${width - margin.right + 70}, ${height / 2})`)
            .attr("text-anchor", "middle").style("font-size", "14px").attr("fill", "currentColor");
    }

    //Remove any previous sankey content (future improvement - animate)
    const g = container.select("svg .chart3-content");
    g.selectAll("*").remove();

    //Draw sankey overview for all types
    d3.select("#g3\\.h3").text(type
        ? `% Pokémon that turn Legendary - ${type} Type`
        : "% Pokémon that turn Legendary by Type");

    chart3.leftLabel
        .text("Type - heigth is count per Type")
        .attr("class", "x-label");

    chart3.rightLabel
        .text("% Legendary - height is count per bucket & Type")
        .attr("class", "y-label");

    //Order left node same as bar (count descending)
    const typeMap = d3.group(procData, d => d.type);
    const chartData = Array.from(typeMap, ([t, pokemon]) => ({
        type: t,
        total: pokemon.length,
        legendary: pokemon.filter(d => d.isLegendary).length
    })).sort((a, b) => b.total - a.total);

    const buckets = ["0-5%", "5-10%", "10-15%", "15-20%", "20-25%", "25-30%", "30-35%"];
    function getBucket(d) {
        const pct = (d.legendary / d.total) * 100;
        return `${Math.floor(pct / 5) * 5}-${Math.floor(pct / 5) * 5 + 5}%`;
    }

    const typeNodes = chartData.map((d, i) => ({ id: i, name: d.type }));
    const bucketNodes = buckets.map((b, i) => ({ id: chartData.length + i, name: b }));

    //Left ribbon heigth based on total count by type
    const totalPokemon = d3.sum(chartData, d => d.total);
    const availableHeight = chartHeight - (typeNodes.length - 1) * nodePadding;
    let cumY = 0;
    typeNodes.forEach((n, i) => {
        const h = (chartData[i].total / totalPokemon) * availableHeight;
        n.x0 = 0; n.x1 = nodeWidth;
        n.y0 = cumY; n.y1 = cumY + h;
        n.y_mid = (n.y0 + n.y1) / 2;
        cumY += h + nodePadding;
    });

    //Right ribbon heigth based on number of pokemon in each bucket and type
    const bucketTotals = {};
    const bucketLegendary = {};  
    buckets.forEach(b => { bucketTotals[b] = 0; bucketLegendary[b] = 0; });
    chartData.forEach(d => {
        bucketTotals[getBucket(d)] += d.total;
        bucketLegendary[getBucket(d)] += d.legendary;
    });
    const totalLegendary = d3.sum(buckets, b => bucketLegendary[b]);
    const availableHeightRight = chartHeight - (bucketNodes.length - 1) * nodePadding;
    let cumYRight = 0;
    bucketNodes.forEach((n, i) => {
        const h = bucketLegendary[n.name] > 0
            ? (bucketLegendary[n.name] / totalLegendary) * availableHeightRight
            : 0;
        n.x0 = chartWidth - nodeWidth; n.x1 = chartWidth;
        n.y0 = cumYRight; n.y1 = cumYRight + h;
        n.y_mid = (n.y0 + n.y1) / 2;
        cumYRight += h + (h > 0 ? nodePadding : 0);  //skip padding for empty buckets
    });

    const targetOffsets = {};
    bucketNodes.forEach(n => targetOffsets[n.id] = n.y0);

    chartData.forEach((d, i) => {
        const src = typeNodes[i];
        const bucket = getBucket(d);
        const tgt = bucketNodes.find(b => b.name === bucket);
        const tgtH = (d.total / bucketTotals[bucket]) * (tgt.y1 - tgt.y0);
        const ty0 = targetOffsets[tgt.id];
        const ty1 = ty0 + tgtH;
        targetOffsets[tgt.id] += tgtH;

        //Calculate path color (if user selected a Type) only color that type else color all ribbons
        const isSelected = (selectType === null || selectType === d.type);
        const opacity = isSelected ? 0.5 : 0.15;
        const fill = isSelected ? (typeColors[d.type] || "#999") : "#ccc";
        const startFill = (prevType === null || prevType === d.type) ? (typeColors[d.type] || "#999") : "#ccc";
        const startOpacity = (prevType === null || prevType === d.type) ? 0.5 : 0.15;

        const path = g.append("path")
            .attr("d", ribbonPath(src.x1, src.y0, src.y1, tgt.x0, ty0, ty1))
            .attr("fill", startFill)
            .attr("opacity", startOpacity)
            .on("mouseover", function (event) {
                if (!isSelected) return;  //no mouseover for unselected ribbon
                d3.select(this).attr("opacity", 0.85);
                tooltip.style("opacity", 1)
                    .html(`<strong>${d.type}</strong><br>Total: ${d.total}<br>Legendary: ${d.legendary}<br>%: ${((d.legendary / d.total) * 100).toFixed(1)}%`)
                    .style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function () {
                if (!isSelected) return;
                d3.select(this).attr("opacity", opacity);
                tooltip.style("opacity", 0);
            });

        //Animate color change like barchart    
        path.transition().duration(300).ease(d3.easeCubicInOut)
            .attr("fill", fill)
            .attr("opacity", opacity);

    });

    typeNodes.forEach(n => {
        g.append("rect").attr("x", n.x0).attr("y", n.y0)
            .attr("width", nodeWidth).attr("height", n.y1 - n.y0)
            .attr("fill", typeColors[n.name] || "#999").attr("rx", 2);
        g.append("text").attr("x", n.x0 - 5).attr("y", n.y_mid)
            .attr("text-anchor", "end").attr("dominant-baseline", "middle")
            .style("font-size", "11px").style("fill", "#333").text(n.name);
    });

    bucketNodes.forEach(n => {
        g.append("rect").attr("x", n.x0).attr("y", n.y0)
            .attr("width", nodeWidth).attr("height", n.y1 - n.y0)
            .attr("fill", "#888").attr("rx", 2);
        g.append("text").attr("x", n.x1 + 5).attr("y", n.y_mid)
            .attr("text-anchor", "start").attr("dominant-baseline", "middle")
            .style("font-size", "11px").style("fill", "#333").text(n.name);
    });

    return;  

}

