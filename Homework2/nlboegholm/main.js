//Define Colors used for Visualizations
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
  
//Mouse over
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


//Load csv
d3.csv("data/pokemon.csv").then(data =>{
    console.log("data", data); 

    //Build charts
    chart1(data);
    chart2(data);
    chart3(data);
}).catch(function(error){
    console.log(error);
});

function chart1(data) {
 
    const container = d3.select("#g1");
    const width = container.node().clientWidth;
    const height = container.node().clientHeight - 10;
    const margin = {top: 60, right: 20, bottom: 60, left: 60}; 

    const svg = container.append("svg")
         .attr("width", width).attr("height", height);

    data.forEach(d => { d.Total = +d.Total; }); //Convert Total to a number

    //Group by Type1, calculate average Total
    const avgByType = Array.from(
        d3.group(data, d => d.Type_1),
        ([type, pokemon]) => ({
            type: type,
            avgTotal: d3.mean(pokemon, d => d.Total)
        })
    ).sort((a, b) => b.avgTotal - a.avgTotal); //desending

    //SVG element from the HTML and measure it
    const svg1 = d3.select("#g1").select("svg");
    const width1 = svg1.node().getBoundingClientRect().width;
    const height1 = svg1.node().getBoundingClientRect().height;

    //Scale viewBox
    svg1.attr("viewBox", [0, 0, width1, height1])
        .attr("style", "max-width: 100%; height: auto;");

    //Declare the X scale
    const x = d3.scaleBand()
        .domain(avgByType.map(d => d.type))
        .range([margin.left, width1 - margin.right - 50])
        .padding(0.2);

    //Declare Y scale
    const y = d3.scaleLinear()
        .domain([0, d3.max(avgByType, d => d.avgTotal) + 20])
        .range([height1 - margin.bottom, margin.top]);

    //Create Bar
    svg1.append("g")
        .selectAll()
        .data(avgByType)
        .join("rect")
            .attr("x", d => x(d.type))
            .attr("y", d => y(d.avgTotal))
            .attr("height", d => y(0) - y(d.avgTotal))
            .attr("width", x.bandwidth())
            .attr("fill", d => typeColors[d.type] || "#999")
            .attr("rx", 3)
            // Hover effects
            .on("mouseover", function(event, d) {
                d3.select(this).attr("opacity", 0.75);
                tooltip
                    .style("opacity", 1)
                    .html(`<strong>${d.type}</strong><br>Avg Total: ${d.avgTotal.toFixed(1)}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                d3.select(this).attr("opacity", 1);
                tooltip.style("opacity", 0);
            });

    //Label values on top of each bar
    svg1.append("g")
        .selectAll()
        .data(avgByType)
        .join("text")
            .attr("x", d => x(d.type) + x.bandwidth() / 2)
            .attr("y", d => y(d.avgTotal) - 4)
            .attr("text-anchor", "middle")
            .style("font-size", "9px")
            .style("fill", "#333")
            .text(d => d.avgTotal.toFixed(0));

    //X axis (pokemon type)
    svg1.append("g")
        .attr("transform", `translate(0, ${height1 - margin.bottom})`)
        .call(d3.axisBottom(x).tickSizeOuter(0))
        .call(g => g.selectAll("text")
            .attr("transform", "rotate(-40)")
            .style("text-anchor", "end")
            .style("font-size", "11px"))
        .call(g => g.append("text")
            .attr("x", width1 / 2)
            .attr("y", margin.bottom - 5)
            .attr("fill", "currentColor")
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .text("Pokémon Type"));

    //Y axis (avg total stats)
    svg1.append("g")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(y))
        .call(g => g.select(".domain").remove()) //Remove domain line
        .call(g => g.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -(height1 / 2))
            .attr("y", -margin.left + 15)
            .attr("fill", "currentColor")
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .text("↑ Average Total Stats"));

    //Chart title (Average Total Stats by Pokemon Type)
    svg1.append("text")
        .attr("x", width1 / 2)
        .attr("y", margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .attr("fill", "currentColor")
        .text("Average Total Stats by Pokémon Type");

};

function chart2(data) {

    const container = d3.select("#g2");
    const width = container.node().clientWidth;
    const height = container.node().clientHeight - 10;
    const margin = {top: 20, right: 120, bottom: 80, left: 30}; 
    
    const width2 = container.node().clientWidth;
    const height2 = container.node().clientHeight - 10;

    //ViewBox svg
    const svg2 = container.append("svg")
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", `0 0 ${width2} ${height2}`)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    //Convert numeric columns
    data.forEach(d => {
        d.Attack = +d.Attack;
        d.Speed = +d.Speed;
    });

    //Scale viewBox
    svg2.attr("viewBox", [0, 0, width2, height2])
        .attr("style", "max-width: 100%; height: auto;");

    //Declare the X scale
    const x = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.Attack) + 10])
        .range([margin.left, width2 - margin.right]);

    // Declare the Y scale
    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.Speed) + 10])
        .range([height2 - margin.bottom, margin.top]);

    //Add clip path (so dots dont render outside the chart area)
    svg2.append("defs").append("clipPath")
        .attr("id", "clip2")
        .append("rect")
        .attr("x", margin.left)
        .attr("y", margin.top)
        .attr("width", width2 - margin.left - margin.right)
        .attr("height", height2 - margin.top - margin.bottom);

    //Add dot for each Pokemon
    svg2.append("g")
        .attr("clip-path", "url(#clip2)")
        .selectAll()
        .data(data)
        .join("circle")
            .attr("cx", d => x(d.Attack))
            .attr("cy", d => y(d.Speed))
            //Legendary pokemon get a larger dot
            .attr("r", d => d.isLegendary === "True" ? 7 : 4)
            .attr("fill", d => typeColors[d.Type_1] || "#999")
            //Legendary pokemon get a gold border
            .attr("stroke", d => d.isLegendary === "True" ? "gold" : "white")
            .attr("stroke-width", d => d.isLegendary === "True" ? 2 : 0.5)
            .attr("opacity", 0.8)
            //Hover effects :)
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .attr("opacity", 1)
                    .attr("r", d.isLegendary === "True" ? 9 : 6);
                tooltip
                    .style("opacity", 1)
                    .html(`
                        <strong>${d.Name}</strong><br>
                        Type: ${d.Type_1}${d.Type_2 ? " / " + d.Type_2 : ""}<br>
                        Attack: ${d.Attack}<br>
                        Speed: ${d.Speed}<br>
                        ${d.isLegendary === "True" ? "⭐ Legendary" : ""}
                    `)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function(event, d) {
                d3.select(this)
                    .attr("opacity", 0.8)
                    .attr("r", d.isLegendary === "True" ? 7 : 4);
                tooltip.style("opacity", 0);
            });

    //Add X axis and label
    svg2.append("g")
        .attr("transform", `translate(0, ${height2 - margin.bottom})`)
        .call(d3.axisBottom(x).tickSizeOuter(0))
        .call(g => g.append("text")
            .attr("x", width2 / 2)
            .attr("y", margin.bottom - 25)
            .attr("fill", "currentColor")
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .text("Attack"));

    //Add Y axis and label
    svg2.append("g")
        .attr("transform", `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(y))
        .call(g => g.select(".domain").remove()) //remove the domain line
        .call(g => g.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -(height2 / 2))
            .attr("y", -margin.left -15)
            .attr("fill", "currentColor")
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .text("↑ Speed"));

    //Add chart title
    svg2.append("text")
        .attr("x", width2 / 2)
        .attr("y", margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .attr("fill", "currentColor")
        .text("Attack vs Speed by Pokémon Type");

    //Add legend, Type colors
    const legendData = Object.entries(typeColors);
    const legendX = width2 - margin.right;
    const legendY = margin.top - 30;
    const legendSpacing = 12;

    const legend2 = svg2.append("g")
        .attr("transform", `translate(${legendX}, ${legendY})`);

    //Legend background box
    legend2.append("rect")
        .attr("x", -5)
        .attr("y", -5)
        .attr("width", 110)
        .attr("height", legendData.length * legendSpacing + 30)
        .attr("fill", "white")
        .attr("opacity", 0.8)
        .attr("rx", 4)
        .attr("stroke", "#ccc");

    //Type color entries
    legendData.forEach(([type, color], i) => {
        legend2.append("circle")
            .attr("cx", 7)
            .attr("cy", i * legendSpacing + 7)
            .attr("r", 5)
            .attr("fill", color);

        legend2.append("text")
            .attr("x", 17)
            .attr("y", i * legendSpacing + 7)
            .attr("dominant-baseline", "middle")
            .style("font-size", "10px")
            .attr("fill", "#333")
            .text(type);
    });

    //Legendary indicator in legend
    const legendaryY = legendData.length * legendSpacing + 10;

    legend2.append("circle")
        .attr("cx", 7)
        .attr("cy", legendaryY)
        .attr("r", 6)
        .attr("fill", "#999")
        .attr("stroke", "gold")
        .attr("stroke-width", 2);

    legend2.append("text")
        .attr("x", 17)
        .attr("y", legendaryY)
        .attr("dominant-baseline", "middle")
        .style("font-size", "10px")
        .attr("fill", "#333")
        .text("⭐ Legendary");

};

function chart3(data) {
    
    const container = d3.select("#g3");
    const width3 = container.node().clientWidth;
    const height3 = container.node().clientHeight - 30;
    const margin = { top: 30, right: 130, bottom: 60, left: 40 }; // big bottom marging to display 45 degree rotated xaxis

    //viewBox svg
    const svg3 = container.append("svg")
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", `0 0 ${width3} ${height3}`)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);


svg3.attr("viewBox", [0, 0, width3, height3])
    .attr("style", "max-width: 100%; height: auto;");

//Group by Type1, calculate total and legendary count
    const typeMap = d3.group(data, d => d.Type_1);

    const typeData = Array.from(typeMap, ([type, pokemon]) => ({
        type: type,
        total: pokemon.length,
        legendary: pokemon.filter(d => d.isLegendary === "True").length
    })).sort((a, b) => a.type.localeCompare(b.type)); // sort alphabetically

//Buckets
const buckets = ["0-5%", "5-10%", "10-15%", "15-20%", "20-25%", "25-30%", "30-35%"];

function getBucket(d) {
    const pct = (d.legendary / d.total) * 100;
    const low = Math.floor(pct / 5) * 5;
    return `${low}-${low + 5}%`;
}

//Build nodes and links
const typeNodes = typeData.map((d, i) => ({ id: i, name: d.type, side: "left" }));
const bucketNodes = buckets.map((b, i) => ({ id: typeData.length + i, name: b, side: "right" }));
const nodes = [...typeNodes, ...bucketNodes];

const links = typeData.map((d, i) => {
    const bucket = getBucket(d);
    const targetNode = bucketNodes.find(b => b.name === bucket);
    return {
        source: i,
        target: targetNode.id,
        value: d.total,
        legendaryPct: ((d.legendary / d.total) * 100).toFixed(1),
        type: d.type,
        legendary: d.legendary,
        total: d.total
    };
});

//Layout
const chartWidth  = width3  - margin.left - margin.right;
const chartHeight = height3 - margin.top  - margin.bottom;
const nodeWidth   = 18;
const nodePadding = 6;

//Position left nodes (types) evenly
const leftNodeHeight = (chartHeight - (typeNodes.length - 1) * nodePadding) / typeNodes.length;
typeNodes.forEach((n, i) => {
    n.x0 = 0;
    n.x1 = nodeWidth;
    n.y0 = i * (leftNodeHeight + nodePadding);
    n.y1 = n.y0 + leftNodeHeight;
    n.y_mid = (n.y0 + n.y1) / 2;
});

//Position right nodes (buckets) evenly
//Calculate total value per bucket for sizing
const bucketTotals = {};
buckets.forEach(b => bucketTotals[b] = 0);
typeData.forEach(d => { bucketTotals[getBucket(d)] += d.total; });
const maxBucketTotal = d3.max(Object.values(bucketTotals));
const rightNodeHeight = (chartHeight - (bucketNodes.length - 1) * nodePadding) / bucketNodes.length;

bucketNodes.forEach((n, i) => {
    n.x0 = chartWidth - nodeWidth;
    n.x1 = chartWidth;
    n.y0 = i * (rightNodeHeight + nodePadding);
    n.y1 = n.y0 + rightNodeHeight;
    n.y_mid = (n.y0 + n.y1) / 2;
});

//For stacking links at source and target
const sourceOffsets = {};
const targetOffsets = {};
typeNodes.forEach(n => sourceOffsets[n.id] = n.y0);
bucketNodes.forEach(n => targetOffsets[n.id] = n.y0);

//Scale link thickness by value relative to node height
function linkThickness(link, side) {
    const sourceNode = typeNodes[link.source];
    const nodeHeight = sourceNode.y1 - sourceNode.y0;
    return nodeHeight; // one link per type node so full height
}

//Draw
const g3 = svg3.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

//Draw links
links.forEach(link => {
    const sourceNode = nodes[link.source];
    const targetNode = nodes[link.target];

    const x0 = sourceNode.x1;
    const x1 = targetNode.x0;
    const sy0 = sourceNode.y0;
    const sy1 = sourceNode.y1;

    //Stack links at target
    const targetNode_ = bucketNodes.find(b => b.id === link.target);
    const bucketTotal = bucketTotals[targetNode_.name];
    const targetHeight = (link.value / bucketTotal) * (targetNode_.y1 - targetNode_.y0);
    const ty0 = targetOffsets[link.target];
    const ty1 = ty0 + targetHeight;
    targetOffsets[link.target] += targetHeight;

    const linkColor = typeColors[link.type] || "#999";

    //Draw the link as a filled path between source and target
    g3.append("path")
        .attr("d", `
            M ${x0} ${sy0}
            C ${(x0 + x1) / 2} ${sy0},
              ${(x0 + x1) / 2} ${ty0},
              ${x1} ${ty0}
            L ${x1} ${ty1}
            C ${(x0 + x1) / 2} ${ty1},
              ${(x0 + x1) / 2} ${sy1},
              ${x0} ${sy1}
            Z
        `)
        .attr("fill", linkColor)
        .attr("opacity", 0.5)
        .on("mouseover", function(event) {
            d3.select(this).attr("opacity", 0.85);
            tooltip
                .style("opacity", 1)
                .html(`
                    <strong>${link.type}</strong><br>
                    Total Pokémon: ${link.total}<br>
                    Legendary: ${link.legendary}<br>
                    % Legendary: ${link.legendaryPct}%<br>
                    Bucket: ${targetNode_.name}
                `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).attr("opacity", 0.5);
            tooltip.style("opacity", 0);
        });
});

//Draw left nodes (types)
typeNodes.forEach(n => {
    g3.append("rect")
        .attr("x", n.x0)
        .attr("y", n.y0)
        .attr("width", nodeWidth)
        .attr("height", n.y1 - n.y0)
        .attr("fill", typeColors[n.name] || "#999")
        .attr("rx", 2);

    //Type label on the left
    g3.append("text")
        .attr("x", n.x0 - 5)
        .attr("y", n.y_mid)
        .attr("text-anchor", "end")
        .attr("dominant-baseline", "middle")
        .style("font-size", "11px")
        .style("fill", "#333")
        .text(n.name);
});

//Draw right nodes (buckets)
bucketNodes.forEach(n => {
    g3.append("rect")
        .attr("x", n.x0)
        .attr("y", n.y0)
        .attr("width", nodeWidth)
        .attr("height", n.y1 - n.y0)
        .attr("fill", "#888")
        .attr("rx", 2);

    //Bucket label on the right
    g3.append("text")
        .attr("x", n.x1 + 5)
        .attr("y", n.y_mid)
        .attr("text-anchor", "start")
        .attr("dominant-baseline", "middle")
        .style("font-size", "11px")
        .style("fill", "#333")
        .text(n.name);
});

//Chart title
svg3.append("text")
    .attr("x", width3 / 2)
    .attr("y", margin.top / 2)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .attr("fill", "currentColor")
    .text("% of Pokémon that are Legendary by Type");

//Left axis label
svg3.append("text")
    .attr("x", margin.left - 60)
    .attr("y", height3 / 2)
    .attr("transform", `rotate(-90, ${margin.left - 60}, ${height3 / 2})`)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .attr("fill", "currentColor")
    .text("Pokémon Type");

//Right axis label
svg3.append("text")
    .attr("x", width3 - margin.right + 70)
    .attr("y", height3 / 2)
    .attr("transform", `rotate(90, ${width3 - margin.right + 70}, ${height3 / 2})`)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .attr("fill", "currentColor")
    .text("% Legendary");

}
