//define type colors
const typeColors = {
    "Normal": "#A8A77A",
    "Fire": "#EE8130",
    "Water": "#6390F0",
    "Electric": "#F7D02C",
    "Grass": "#7AC74C",
    "Ice": "#96D9D6",
    "Fighting": "#C22E28",
    "Poison": "#A33EA1",
    "Ground": "#E2BF65",
    "Flying": "#A98FF3",
    "Psychic": "#F95587",
    "Bug": "#A6B91A",
    "Rock": "#B6A136",
    "Ghost": "#735797",
    "Dragon": "#6F35FC",
    "Dark": "#705746",
    "Steel": "#B7B7CE",
    "Fairy": "#D685AD"
};

let globalData = [];
let activeData = [];

const dimensions = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];
let yScales = {};
let brushSelections = {};

d3.csv("data/pokemon_alopez247.csv").then(data => {
    data.forEach(d => {
        d.HP = +d.HP;
        d.Attack = +d.Attack;
        d.Defense = +d.Defense;
        d.Sp_Atk = +d.Sp_Atk;
        d.Sp_Def = +d.Sp_Def;
        d.Speed = +d.Speed;
        d.Total = +d.Total;
        d.Weight_kg = +d.Weight_kg || 0;
        d.Height_m = +d.Height_m || 0;
    });

    globalData = data;
    activeData = data;

    // initialize all views
    initLegend();
    initParallelCoordinates();
    initBarChart();
    initScatterPlot();

    updateBarChart();
    updateScatterPlot();
}).catch(error => {
    console.error("Error loading CSV. error:", error);
});

//legend on top of the page
function initLegend() {
    const legendContainer = d3.select("#global-legend");
    Object.keys(typeColors).forEach(type => {
        const item = legendContainer.append("div").attr("class", "legend-item");
        item.append("div")
            .attr("class", "legend-color")
            .style("background-color", typeColors[type]);
        item.append("span").text(type);
    });
}


// view 1
function initParallelCoordinates() {
    const svg = d3.select("#svg-view1");
    const width = svg.node().getBoundingClientRect().width;
    const height = svg.node().getBoundingClientRect().height;
    const margin = {top: 30, right: 50, bottom: 20, left: 50};
    
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // scale
    const xScale = d3.scalePoint()
        .range([0, chartWidth])
        .domain(dimensions);

    // y scale for each dimension
    dimensions.forEach(dim => {
        yScales[dim] = d3.scaleLinear()
            .domain(d3.extent(globalData, d => d[dim]))
            .range([chartHeight, 0]);
    });

    // draw lines
    const lineGenerator = d3.line()
        .defined(d => !isNaN(d[1]));

    const path = d => {
        return lineGenerator(dimensions.map(dim => [xScale(dim), yScales[dim](d[dim])]));
    };

    // add lines representing each Pokemon
    g.selectAll(".line")
        .data(globalData)
        .enter().append("path")
        .attr("class", "line")
        .attr("d", path)
        .style("stroke", d => typeColors[d.Type_1] || "#ccc")
        .attr("id", d => "line-" + d.Number); // Unique ID

    // draw axes
    const axisGroup = g.selectAll(".dimension")
        .data(dimensions)
        .enter().append("g")
        .attr("class", "dimension")
        .attr("transform", d => `translate(${xScale(d)},0)`);

    // add axis and title
    axisGroup.append("g")
        .attr("class", "axis")
        .each(function(d) { d3.select(this).call(d3.axisLeft(yScales[d]).ticks(5)); })
        .append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("y", -15)
        .text(d => d);

    // add brushes to each axis
    axisGroup.append("g")
        .attr("class", "brush")
        .each(function(dim) {
            d3.select(this).call(
                d3.brushY()
                  .extent([[-10, 0], [10, chartHeight]])
                  .on("brush end", function(event) { brushed(event, dim); })
            );
        });
}

function brushed(event, dim) {
    if (!event.selection) {
        delete brushSelections[dim]; // brush cleared
    } else {
        brushSelections[dim] = event.selection.map(yScales[dim].invert);
    }
    
    // AI assistance and tutoring made this following work segment possible.
    activeData = globalData.filter(d => {
        return dimensions.every(p => {
            if (!brushSelections[p]) return true;
            return brushSelections[p][1] <= d[p] && d[p] <= brushSelections[p][0];
        });
    });

    // update lines visual state
    d3.selectAll(".line")
        .classed("active", false)
        .classed("inactive", true);

    activeData.forEach(d => {
        d3.select("#line-" + d.Number)
            .classed("inactive", false)
            .classed("active", true);
    });

    // update other views
    updateBarChart();
    updateScatterPlot();
}


// view 2
let barSvg, barG, barXScale, barYScale;
let barChartWidth, barChartHeight;

function initBarChart() {
    barSvg = d3.select("#svg-view2");
    const width = barSvg.node().getBoundingClientRect().width;
    const height = barSvg.node().getBoundingClientRect().height;
    const margin = {top: 20, right: 20, bottom: 60, left: 40};
    
    barChartWidth = width - margin.left - margin.right;
    barChartHeight = height - margin.top - margin.bottom;

    barG = barSvg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // x scale
    barXScale = d3.scaleBand()
        .range([0, barChartWidth])
        .padding(0.2);

    // y scale
    barYScale = d3.scaleLinear()
        .range([barChartHeight, 0]);

    // x axis group
    barG.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${barChartHeight})`);

    // y axis group
    barG.append("g")
        .attr("class", "y-axis");
        
    // x axis label
    barG.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("x", barChartWidth / 2)
        .attr("y", barChartHeight + 45)
        .text("Pokemon Type (Primary)");
        
    // y axis label
    barG.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -barChartHeight / 2)
        .attr("y", -30)
        .text("Count");
}

function updateBarChart() {
    // AI assistance and tutoring made this following work segment possible.
    // aggregate data
    const counts = d3.rollup(activeData, v => v.length, d => d.Type_1);
    const countData = Array.from(counts, ([key, value]) => ({key, value}))
                           .sort((a, b) => b.value - a.value);

    // update scales
    barXScale.domain(countData.map(d => d.key));
    barYScale.domain([0, d3.max(countData, d => d.value) || 0]);

    // update axes
    barG.select(".x-axis").transition().duration(500)
        .call(d3.axisBottom(barXScale))
        .selectAll("text")
        .attr("transform", "translate(-10,0)rotate(-45)")
        .style("text-anchor", "end");
        
    barG.select(".y-axis").transition().duration(500)
        .call(d3.axisLeft(barYScale).ticks(5));

    // data join
    const bars = barG.selectAll(".bar")
        .data(countData, d => d.key);

    // remove old bars
    bars.exit().remove();

    // add new bars
    bars.enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => barXScale(d.key))
        .attr("width", barXScale.bandwidth())
        .attr("y", barChartHeight)
        .attr("height", 0)
        .attr("fill", d => typeColors[d.key] || "#ccc")
        .on("mouseover", function(event, d) {
            const tooltip = d3.select("#tooltip");
            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(`<strong>${d.key}</strong><br/>Count: ${d.value}`)
                   .style("left", (event.pageX + 10) + "px")
                   .style("top", (event.pageY - 28) + "px");
            d3.select(this).style("stroke", "#333").style("stroke-width", "2px");
        })
        .on("mouseout", function() {
            d3.select("#tooltip").transition().duration(500).style("opacity", 0);
            d3.select(this).style("stroke", "none");
        })
        // merge and transition
        .merge(bars)
        .transition().duration(500)
        .attr("x", d => barXScale(d.key))
        .attr("width", barXScale.bandwidth())
        .attr("y", d => barYScale(d.value))
        .attr("height", d => barChartHeight - barYScale(d.value))
        .attr("fill", d => typeColors[d.key] || "#ccc");
}


// view 3
let scatterSvg, scatterG, scatterXScale, scatterYScale, scatterSizeScale;
let scatterWidth, scatterHeight;

function initScatterPlot() {
    scatterSvg = d3.select("#svg-view3");
    const width = scatterSvg.node().getBoundingClientRect().width;
    const height = scatterSvg.node().getBoundingClientRect().height;
    const margin = {top: 20, right: 20, bottom: 50, left: 50};
    
    scatterWidth = width - margin.left - margin.right;
    scatterHeight = height - margin.top - margin.bottom;

    scatterG = scatterSvg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // x scale (weight)
    scatterXScale = d3.scaleLog() 
        .domain([0.1, d3.max(globalData, d => d.Weight_kg) || 1000])
        .range([0, scatterWidth])
        .clamp(true);

    // y scale (height)
    scatterYScale = d3.scaleLog() 
        .domain([0.1, d3.max(globalData, d => d.Height_m) || 20])
        .range([scatterHeight, 0])
        .clamp(true);

    // size scale (total)
    scatterSizeScale = d3.scaleLinear()
        .domain(d3.extent(globalData, d => d.Total))
        .range([3, 15]);

    // x axis
    scatterG.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${scatterHeight})`)
        .call(d3.axisBottom(scatterXScale).ticks(5, "~s"));

    // y axis
    scatterG.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(scatterYScale).ticks(5, "~s"));

    // axis labels
    scatterG.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("x", scatterWidth / 2)
        .attr("y", scatterHeight + 40)
        .text("Weight (kg) - Log Scale");

    scatterG.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -scatterHeight / 2)
        .attr("y", -35)
        .text("Height (m) - Log Scale");

    // all dots initially
    scatterG.selectAll(".dot")
        .data(globalData)
        .enter()
        .append("circle")
        .attr("class", "dot")
        .attr("id", d => "dot-" + d.Number)
        .attr("cx", d => scatterXScale(Math.max(0.1, d.Weight_kg)))
        .attr("cy", d => scatterYScale(Math.max(0.1, d.Height_m)))
        .attr("r", d => scatterSizeScale(d.Total))
        .style("fill", d => typeColors[d.Type_1] || "#ccc")
        .on("mouseover", function(event, d) {
            if (d3.select(this).classed("inactive")) return;
            
            const tooltip = d3.select("#tooltip");
            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(`
                <strong>${d.Name}</strong> (#${d.Number})<br/>
                Type: ${d.Type_1} / ${d.Type_2 || "None"}<br/>
                Height: ${d.Height_m} m<br/>
                Weight: ${d.Weight_kg} kg<br/>
                Total Stats: ${d.Total}
            `)
                   .style("left", (event.pageX + 10) + "px")
                   .style("top", (event.pageY - 28) + "px");
            d3.select(this).style("stroke", "#000").style("stroke-width", "2px");
        })
        .on("mouseout", function() {
            d3.select("#tooltip").transition().duration(500).style("opacity", 0);
            d3.select(this).style("stroke", "#fff").style("stroke-width", "1px");
        });
}

function updateScatterPlot() {
    // AI assistance was used for the following code segment.
    d3.selectAll(".dot")
        .classed("inactive", true)
        .style("pointer-events", "none");

    activeData.forEach(d => {
        const dot = d3.select("#dot-" + d.Number);
        dot.classed("inactive", false)
           .style("pointer-events", "all");
           
        dot.node().parentNode.appendChild(dot.node());
    });
}