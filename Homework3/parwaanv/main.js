// pokemon type colors
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

// state vars
let globalData = [];           
let activeData = [];           
let selectedPokemon = null;    
let selectedTypeFilter = null; 

// dimensions for parallel coords
const dimensions = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];
let yScales = {};
let brushSelections = {};      

// scatter plot variables
let scatterXVar = "Weight_kg";
let scatterYVar = "Height_m";
let currentZoomTransform = d3.zoomIdentity; 

// global selections and svg nodes
let pcSvg, pcG;
let barSvg, barG, barXScale, barYScale;
let scatterSvg, scatterG, scatterXScale, scatterYScale, scatterSizeScale, scatterZoom;

// dimensions for widgets
let pcWidth, pcHeight;
let barWidth, barHeight;
let scatterWidth, scatterHeight;

const defaultMargin = { top: 25, right: 30, bottom: 40, left: 45 };

// load data and boot dashboard
d3.csv("data/pokemon_alopez247.csv").then(data => {
    // parsing strings
    data.forEach(d => {
        d.Number = +d.Number;
        d.HP = +d.HP;
        d.Attack = +d.Attack;
        d.Defense = +d.Defense;
        d.Sp_Atk = +d.Sp_Atk;
        d.Sp_Def = +d.Sp_Def;
        d.Speed = +d.Speed;
        d.Total = +d.Total;
        d.Generation = +d.Generation;
        d.Weight_kg = +d.Weight_kg || 0;
        d.Height_m = +d.Height_m || 0;
    });

    globalData = data;
    activeData = data;

    // initing views
    initLegend();
    initParallelCoordinates();
    initBarChart();
    initScatterPlot();

    // render
    updateBarChart(false); 
    updateScatterPlot(false);

    //resize
    window.addEventListener("resize", handleResize);

    // reset button
    d3.select("#btn-reset").on("click", resetDashboard);

    // scatter plot controls
    d3.select("#scatter-x-select").on("change", function() {
        scatterXVar = this.value;
        transitionScatterAxes();
    });
    d3.select("#scatter-y-select").on("change", function() {
        scatterYVar = this.value;
        transitionScatterAxes();
    });

}).catch(error => {
    console.error("error loading csv:", error);
});

// build type filters legend - Gemini was utilized for this following function segment to better my understanding and assist me.
function initLegend() {
    const legendContainer = d3.select("#global-legend");
    legendContainer.html(""); 

    Object.keys(typeColors).forEach(type => {
        const item = legendContainer.append("div")
            .attr("class", "legend-item")
            .attr("id", `legend-pill-${type}`)
            .on("click", function() {
                toggleTypeFilter(type);
            });

        item.append("div")
            .attr("class", "legend-color")
            .style("background-color", typeColors[type]);

        item.append("span").text(type);
    });
}

// filter by primary type click
function toggleTypeFilter(type) {
    if (selectedTypeFilter === type) {
        selectedTypeFilter = null; 
        d3.selectAll(".legend-item").classed("active-filter", false);
        d3.selectAll(".bar").classed("active-bar", false).classed("inactive", false);
    } else {
        selectedTypeFilter = type; 
        d3.selectAll(".legend-item").classed("active-filter", false);
        d3.select(`#legend-pill-${type}`).classed("active-filter", true);
        
        d3.selectAll(".bar").classed("inactive", true).classed("active-bar", false);
        d3.select(`#bar-${type}`).classed("inactive", false).classed("active-bar", true);
    }
    
    applyFilters();
}

// parallel coordinates initialization
function initParallelCoordinates() {
    pcSvg = d3.select("#svg-view1");
    pcSvg.html(""); 
    
    const boundingBox = pcSvg.node().getBoundingClientRect(); // bounding box for sizing - Gemini helped.
    pcWidth = boundingBox.width - defaultMargin.left - defaultMargin.right;
    pcHeight = boundingBox.height - defaultMargin.top - defaultMargin.bottom;

    pcG = pcSvg.append("g")
        .attr("transform", `translate(${defaultMargin.left},${defaultMargin.top})`);

    // horizontal axes spacing
    const xScale = d3.scalePoint()
        .range([0, pcWidth])
        .domain(dimensions);

    // vertical scale for each dimension
    dimensions.forEach(dim => {
        yScales[dim] = d3.scaleLinear()
            .domain(d3.extent(globalData, d => d[dim]))
            .range([pcHeight, 0])
            .nice();
    });

    // path generator - logic assisted and tutored with Gemini.
    const lineGenerator = d3.line().defined(d => !isNaN(d[1]));
    const calculatePath = d => {
        return lineGenerator(dimensions.map(dim => [xScale(dim), yScales[dim](d[dim])]));
    };

    // draw line paths
    pcG.append("g")
        .attr("class", "lines-group")
        .selectAll(".line")
        .data(globalData, d => d.Number)
        .enter().append("path")
        .attr("class", "line")
        .attr("d", calculatePath)
        .style("stroke", d => typeColors[d.Type_1] || "#94a3b8")
        .attr("id", d => `line-${d.Number}`)
        .on("mouseover", function(event, d) {
            if (d3.select(this).classed("inactive")) return;
            highlightPokemonOnHover(event, d, true);
        })
        .on("mouseout", function() {
            highlightPokemonOnHover(null, null, false);
        })
        .on("click", function(event, d) {
            if (d3.select(this).classed("inactive")) return;
            selectPokemon(d);
        });

    // axes container groups
    const axesGroup = pcG.selectAll(".dimension")
        .data(dimensions)
        .enter().append("g")
        .attr("class", "dimension")
        .attr("transform", d => `translate(${xScale(d)},0)`);

    // append titles and axis values
    axesGroup.append("g")
        .attr("class", "axis")
        .each(function(d) {
            d3.select(this).call(d3.axisLeft(yScales[d]).ticks(6));
        })
        .append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("y", -12)
        .style("fill", "#e2e8f0")
        .text(d => d);

    // vertical brushes for each axis
    axesGroup.append("g")
        .attr("class", "brush")
        .each(function(dim) {
            d3.select(this).call(
                d3.brushY()
                  .extent([[-12, 0], [12, pcHeight]])
                  .on("brush end", function(event) {
                      handleAxisBrush(event, dim);
                  })
            );
        });
}

// brush event handler - event handler for brushes segment was tutored to me with Gemini.
function handleAxisBrush(event, dim) {
    if (!event.selection) {
        delete brushSelections[dim]; 
    } else {
        brushSelections[dim] = event.selection.map(yScales[dim].invert);
    }
    
    applyFilters();
}

// apply active filters
function applyFilters() {
    activeData = globalData.filter(d => {
        // filter by vertical brushes - brushes logic was previously assisted in Homework 2
        const matchesBrush = dimensions.every(dim => {
            if (!brushSelections[dim]) return true;
            const [valMax, valMin] = brushSelections[dim];
            return d[dim] >= valMin && d[dim] <= valMax;
        });

        // filter by type
        const matchesType = !selectedTypeFilter || d.Type_1 === selectedTypeFilter;

        return matchesBrush && matchesType;
    });

    // transition lines opacity
    const pcLines = pcG.selectAll(".line");
    
    pcLines.transition().duration(500)
        .style("opacity", function(d) {
            const isActive = activeData.some(act => act.Number === d.Number);
            return isActive ? 0.85 : 0.015;
        })
        .style("stroke-width", function(d) {
            const isActive = activeData.some(act => act.Number === d.Number);
            return isActive ? "1.8px" : "0.5px";
        });

    pcLines.each(function(d) {
        const isActive = activeData.some(act => act.Number === d.Number);
        d3.select(this)
            .classed("inactive", !isActive)
            .classed("active", isActive);
    });

    // raise selected line to top
    if (selectedPokemon) {
        const isActive = activeData.some(act => act.Number === selectedPokemon.Number);
        if (isActive) {
            d3.select(`#line-${selectedPokemon.Number}`).raise().classed("highlighted", true);
        } else {
            deselectPokemon();
        }
    }

    // update dynamic graphs
    updateBarChart(true);
    updateScatterPlot(true);
}

// bar chart view initialization
function initBarChart() {
    barSvg = d3.select("#svg-view2");
    barSvg.html(""); 

    const boundingBox = barSvg.node().getBoundingClientRect();
    barWidth = boundingBox.width - defaultMargin.left - defaultMargin.right;
    barHeight = boundingBox.height - defaultMargin.top - 60; 

    barG = barSvg.append("g")
        .attr("transform", `translate(${defaultMargin.left},${defaultMargin.top})`);

    // type scales
    barXScale = d3.scaleBand()
        .range([0, barWidth])
        .padding(0.25);

    barYScale = d3.scaleLinear()
        .range([barHeight, 0]);

    // axis groups
    barG.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${barHeight})`);

    barG.append("g")
        .attr("class", "y-axis");

    // labels
    barG.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("x", barWidth / 2)
        .attr("y", barHeight + 48)
        .text("Primary Pokemon Type");

    barG.append("text")
        .attr("class", "axis-label")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -barHeight / 2)
        .attr("y", -30)
        .text("Pokemon Count");
}

// update bar chart counts
function updateBarChart(animate = true) {
    const duration = animate ? 750 : 0;

    // sum active data by type - Gemini was used for this following logic segment to better my understanding and assist me.
    const typeCountRollup = d3.rollup(activeData, v => v.length, d => d.Type_1);
    const sortedCounts = Array.from(typeCountRollup, ([key, value]) => ({ key, value }))
                              .sort((a, b) => b.value - a.value);

    // update domains
    barXScale.domain(sortedCounts.map(d => d.key));
    barYScale.domain([0, d3.max(sortedCounts, d => d.value) || 0]).nice();

    // transition axes
    barG.select(".x-axis")
        .transition().duration(duration)
        .call(d3.axisBottom(barXScale))
        .selectAll("text")
        .attr("transform", "translate(-8,0)rotate(-40)")
        .style("text-anchor", "end");

    barG.select(".y-axis")
        .transition().duration(duration)
        .call(d3.axisLeft(barYScale).ticks(5));

    // data join
    const bars = barG.selectAll(".bar")
        .data(sortedCounts, d => d.key);

    // remove exit bars
    bars.exit()
        .transition().duration(animate ? 400 : 0)
        .attr("y", barHeight)
        .attr("height", 0)
        .style("opacity", 0)
        .remove();

    // enter and update active bars
    bars.enter()
        .append("rect")
        .attr("class", "bar")
        .attr("id", d => `bar-${d.key}`)
        .attr("x", d => barXScale(d.key))
        .attr("width", barXScale.bandwidth())
        .attr("y", barHeight)
        .attr("height", 0)
        .attr("fill", d => typeColors[d.key] || "#94a3b8")
        .on("mouseover", function(event, d) {
            const tooltip = d3.select("#tooltip");
            tooltip.style("opacity", 1);
            tooltip.html(`
                <strong>Type: ${d.key}</strong>
                <div class="tooltip-row">
                    <span class="tooltip-lbl">Active Count:</span>
                    <span class="tooltip-val">${d.value}</span>
                </div>
            `);
            positionTooltip(event);
        })
        .on("mousemove", positionTooltip)
        .on("mouseout", hideTooltip)
        .on("click", function(event, d) {
            toggleTypeFilter(d.key);
        })
        .merge(bars)
        .classed("inactive", d => selectedTypeFilter && selectedTypeFilter !== d.key)
        .classed("active-bar", d => selectedTypeFilter === d.key)
        .transition().duration(duration)
        .ease(d3.easeCubicInOut)
        .attr("x", d => barXScale(d.key))
        .attr("width", barXScale.bandwidth())
        .attr("y", d => barYScale(d.value))
        .attr("height", d => barHeight - barYScale(d.value))
        .attr("fill", d => typeColors[d.key] || "#94a3b8");
}

// scatter plot initialization
function initScatterPlot() {
    scatterSvg = d3.select("#svg-view3");
    scatterSvg.html(""); 

    const boundingBox = scatterSvg.node().getBoundingClientRect();
    scatterWidth = boundingBox.width - defaultMargin.left - defaultMargin.right;
    scatterHeight = boundingBox.height - defaultMargin.top - defaultMargin.bottom;

    scatterG = scatterSvg.append("g")
        .attr("transform", `translate(${defaultMargin.left},${defaultMargin.top})`);

    // zoom
    scatterZoom = d3.zoom()
        .scaleExtent([0.5, 30])
        .extent([[0, 0], [scatterWidth, scatterHeight]])
        .on("zoom", handleScatterZoom);

    // capture area
    scatterG.append("rect")
        .attr("class", "zoom-capture-area")
        .attr("width", scatterWidth)
        .attr("height", scatterHeight)
        .style("fill", "none")
        .style("pointer-events", "all")
        .call(scatterZoom)
        .on("dblclick.zoom", null); 

    // reset zoom action
    d3.select("#btn-reset-zoom").on("click", () => {
        scatterSvg.transition().duration(750)
            .call(scatterZoom.transform, d3.zoomIdentity);
    });

    // axis configurations
    scatterXScale = d3.scaleLog()
        .domain([0.05, d3.max(globalData, d => d.Weight_kg) * 1.1])
        .range([0, scatterWidth])
        .clamp(true);

    scatterYScale = d3.scaleLog()
        .domain([0.05, d3.max(globalData, d => d.Height_m) * 1.1])
        .range([scatterHeight, 0])
        .clamp(true);

    // scale dots size
    scatterSizeScale = d3.scaleLinear()
        .domain(d3.extent(globalData, d => d.Total))
        .range([3.5, 12]);

    // grid lines and axes
    scatterG.append("g").attr("class", "x-grid grid-line");
    scatterG.append("g").attr("class", "y-grid grid-line");

    scatterG.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${scatterHeight})`);

    scatterG.append("g")
        .attr("class", "y-axis");

    // labels
    scatterG.append("text")
        .attr("class", "axis-label x-axis-title")
        .attr("text-anchor", "middle")
        .attr("x", scatterWidth / 2)
        .attr("y", scatterHeight + 35)
        .text("Weight (kg) - Log Scale");

    scatterG.append("text")
        .attr("class", "axis-label y-axis-title")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -scatterHeight / 2)
        .attr("y", -30)
        .text("Height (m) - Log Scale");

    updateGridlines(scatterXScale, scatterYScale);

    scatterG.select(".x-axis").call(d3.axisBottom(scatterXScale).ticks(6, "~s"));
    scatterG.select(".y-axis").call(d3.axisLeft(scatterYScale).ticks(6, "~s"));

    // dots container
    const dotsContainer = scatterG.append("g")
        .attr("class", "dots-group")
        .style("pointer-events", "none"); 

    // draw circles
    dotsContainer.selectAll(".dot")
        .data(globalData, d => d.Number)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("id", d => `dot-${d.Number}`)
        .attr("cx", d => scatterXScale(Math.max(0.05, d.Weight_kg)))
        .attr("cy", d => scatterYScale(Math.max(0.05, d.Height_m)))
        .attr("r", d => scatterSizeScale(d.Total))
        .style("fill", d => typeColors[d.Type_1] || "#94a3b8")
        .style("stroke", "#0f172a")
        .style("pointer-events", "all") 
        .on("mouseover", function(event, d) {
            if (d3.select(this).classed("inactive")) return;
            highlightPokemonOnHover(event, d, true);
        })
        .on("mousemove", positionTooltip)
        .on("mouseout", function() {
            highlightPokemonOnHover(null, null, false);
        })
        .on("click", function(event, d) {
            if (d3.select(this).classed("inactive")) return;
            selectPokemon(d);
        });
}

// gridlines update
function updateGridlines(xScale, yScale) {
    const xGrid = scatterG.select(".x-grid");
    const yGrid = scatterG.select(".y-grid");

    xGrid.call(d3.axisBottom(xScale)
        .tickSize(scatterHeight)
        .tickFormat("")
    ).call(g => g.select(".domain").remove());

    yGrid.call(d3.axisLeft(yScale)
        .tickSize(-scatterWidth)
        .tickFormat("")
    ).call(g => g.select(".domain").remove());
}

function handleScatterZoom(event) {
    currentZoomTransform = event.transform;

    // toggle reset zoom button
    const isZoomed = currentZoomTransform.k !== 1 || currentZoomTransform.x !== 0 || currentZoomTransform.y !== 0;
    d3.select("#btn-reset-zoom").style("display", isZoomed ? "block" : "none");

    const zoomedXScale = currentZoomTransform.rescaleX(scatterXScale);
    const zoomedYScale = currentZoomTransform.rescaleY(scatterYScale);

    scatterG.select(".x-axis").call(d3.axisBottom(zoomedXScale).ticks(6, "~s"));
    scatterG.select(".y-axis").call(d3.axisLeft(zoomedYScale).ticks(6, "~s"));

    updateGridlines(zoomedXScale, zoomedYScale);

    // move dots based on zoom
    scatterG.selectAll(".dot")
        .attr("cx", d => zoomedXScale(Math.max(0.05, d[scatterXVar])))
        .attr("cy", d => zoomedYScale(Math.max(0.05, d[scatterYVar])));
}

// switch scatter axes
function transitionScatterAxes() {
    // reset zoom before swapping
    scatterSvg.transition().duration(300)
        .call(scatterZoom.transform, d3.zoomIdentity)
        .end().then(() => {
            
            const isLogX = scatterXVar === "Weight_kg" || scatterXVar === "Height_m";
            const isLogY = scatterYVar === "Weight_kg" || scatterYVar === "Height_m";

            // recalculate axis scales
            if (isLogX) {
                scatterXScale = d3.scaleLog()
                    .domain([0.05, d3.max(globalData, d => d[scatterXVar]) * 1.1])
                    .range([0, scatterWidth])
                    .clamp(true);
            } else {
                scatterXScale = d3.scaleLinear()
                    .domain([0, d3.max(globalData, d => d[scatterXVar]) * 1.05])
                    .range([0, scatterWidth])
                    .nice();
            }

            if (isLogY) {
                scatterYScale = d3.scaleLog()
                    .domain([0.05, d3.max(globalData, d => d[scatterYVar]) * 1.1])
                    .range([scatterHeight, 0])
                    .clamp(true);
            } else {
                scatterYScale = d3.scaleLinear()
                    .domain([0, d3.max(globalData, d => d[scatterYVar]) * 1.05])
                    .range([scatterHeight, 0])
                    .nice();
            }

            // transition axes and gridlines
            const trans = d3.transition().duration(1000).ease(d3.easeCubicInOut);

            scatterG.select(".x-axis").transition(trans)
                .call(d3.axisBottom(scatterXScale).ticks(6, "~s"));

            scatterG.select(".y-axis").transition(trans)
                .call(d3.axisLeft(scatterYScale).ticks(6, "~s"));

            updateGridlines(scatterXScale, scatterYScale);

            // change axis labels
            const cleanName = str => str.replace("_kg", " (kg)").replace("_m", " (m)").replace("Sp_", "Sp. ");
            scatterG.select(".x-axis-title").text(`${cleanName(scatterXVar)} ${isLogX ? '- Log Scale' : ''}`);
            scatterG.select(".y-axis-title").text(`${cleanName(scatterYVar)} ${isLogY ? '- Log Scale' : ''}`);

            // slide dots to coordinates
            scatterG.selectAll(".dot")
                .transition(trans)
                .attr("cx", d => scatterXScale(Math.max(isLogX ? 0.05 : 0, d[scatterXVar])))
                .attr("cy", d => scatterYScale(Math.max(isLogY ? 0.05 : 0, d[scatterYVar])));
        });
}

// update scatter dots sizes and visibility
function updateScatterPlot(animate = true) {
    const duration = animate ? 600 : 0;
    
    scatterG.selectAll(".dot")
        .each(function(d) {
            const isActive = activeData.some(act => act.Number === d.Number);
            d3.select(this)
                .classed("inactive", !isActive)
                .style("pointer-events", isActive ? "all" : "none");
        })
        .transition().duration(duration)
        .attr("r", d => {
            const isActive = activeData.some(act => act.Number === d.Number);
            return isActive ? scatterSizeScale(d.Total) : 0; 
        })
        .style("opacity", d => {
            const isActive = activeData.some(act => act.Number === d.Number);
            return isActive ? 0.75 : 0; 
        });

    // bring selected dot to front
    if (selectedPokemon) {
        const isActive = activeData.some(act => act.Number === selectedPokemon.Number);
        if (isActive) {
            d3.select(`#dot-${selectedPokemon.Number}`).raise().classed("selected-dot", true);
        }
    }
}

// select pokemon and load detail card
function selectPokemon(pokemon) {
    // clear selection styling
    d3.selectAll(".line").classed("highlighted", false);
    d3.selectAll(".dot").classed("selected-dot", false);

    selectedPokemon = pokemon;

    // highlight and bring to front
    d3.select(`#line-${pokemon.Number}`).raise().classed("highlighted", true);
    d3.select(`#dot-${pokemon.Number}`).raise().classed("selected-dot", true);

    // update details card content
    d3.select("#card-placeholder").style("display", "none");
    d3.select("#card-content").style("display", "flex");

    d3.select("#detail-id").text(`#${String(pokemon.Number).padStart(3, '0')}`);
    d3.select("#detail-name").text(pokemon.Name);
    
    // type badges
    const badgesContainer = d3.select("#detail-types").html("");
    badgesContainer.append("span")
        .attr("class", "badge-pill")
        .style("background-color", typeColors[pokemon.Type_1])
        .text(pokemon.Type_1);
    if (pokemon.Type_2) {
        badgesContainer.append("span")
            .attr("class", "badge-pill")
            .style("background-color", typeColors[pokemon.Type_2] || "#64748b")
            .text(pokemon.Type_2);
    }

    // specs text
    d3.select("#detail-weight").text(`${pokemon.Weight_kg.toFixed(1)} kg`);
    d3.select("#detail-height").text(`${pokemon.Height_m.toFixed(1)} m`);
    d3.select("#detail-generation").text(`Gen ${pokemon.Generation}`);

    // load sprite from pokeapi using the pokemon's number - my favorite part
    const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.Number}.png`;
    
    // fade in pokemon sprite
    const imgEl = d3.select("#detail-img");
    imgEl.style("opacity", 0)
        .attr("src", spriteUrl)
        .on("load", function() {
            d3.select(this).transition().duration(400).style("opacity", 1);
        })
        .on("error", function() {
            d3.select(this).attr("src", `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.Number}.png`)
                .transition().duration(200).style("opacity", 1);
        });

    // fill stats bars
    const statDimensions = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];
    const maxStatVals = { HP: 255, Attack: 190, Defense: 230, Sp_Atk: 194, Sp_Def: 230, Speed: 180 }; 

    statDimensions.forEach(stat => {
        const val = pokemon[stat];
        const percent = Math.min(100, (val / maxStatVals[stat]) * 100);

        // stats values
        d3.select(`#val-${stat}`).text(val);

        // fill progress bar widths
        d3.select(`#bar-${stat}`)
            .style("background-color", typeColors[pokemon.Type_1])
            .style("box-shadow", `0 0 6px ${typeColors[pokemon.Type_1]}40`)
            .transition().duration(800)
            .style("width", `${percent}%`);
    });

    d3.select("#val-Total").text(pokemon.Total);
}

// clear selected pokemon
function deselectPokemon() {
    selectedPokemon = null;
    d3.selectAll(".line").classed("highlighted", false);
    d3.selectAll(".dot").classed("selected-dot", false);

    d3.select("#card-content").style("display", "none");
    d3.select("#card-placeholder").style("display", "flex");
}

// hover highlights
function highlightPokemonOnHover(event, d, highlight) {
    const tooltip = d3.select("#tooltip");
    
    if (highlight && d) {
        d3.select(`#line-${d.Number}`).style("stroke-width", "3.5px").style("opacity", 1);
        d3.select(`#dot-${d.Number}`).style("stroke", "#fff").style("stroke-width", "2.5px").attr("r", scatterSizeScale(d.Total) + 2);
        
        tooltip.style("opacity", 1);
        tooltip.html(`
            <strong>${d.Name} (#${String(d.Number).padStart(3, '0')})</strong>
            <div class="tooltip-row">
                <span class="tooltip-lbl">Type:</span>
                <span class="tooltip-val">${d.Type_1}${d.Type_2 ? ' / ' + d.Type_2 : ''}</span>
            </div>
            <div class="tooltip-row">
                <span class="tooltip-lbl">Combat Total:</span>
                <span class="tooltip-val" style="color:#fb7185">${d.Total}</span>
            </div>
            <div class="tooltip-row">
                <span class="tooltip-lbl">Weight / Height:</span>
                <span class="tooltip-val">${d.Weight_kg} kg / ${d.Height_m} m</span>
            </div>
        `);
        positionTooltip(event);
    } else {
        // clear hover highlights
        d3.selectAll(".line").style("stroke-width", null).style("opacity", null);
        d3.selectAll(".dot").style("stroke", null).style("stroke-width", null).attr("r", d => scatterSizeScale(d.Total));
        
        if (selectedPokemon) {
            const isActive = activeData.some(act => act.Number === selectedPokemon.Number);
            if (isActive) {
                d3.select(`#line-${selectedPokemon.Number}`).classed("highlighted", true);
                d3.select(`#dot-${selectedPokemon.Number}`).classed("selected-dot", true);
            }
        }
        
        d3.selectAll(".line")
            .style("opacity", function(pl) {
                const isActive = activeData.some(act => act.Number === pl.Number);
                return isActive ? 0.85 : 0.015;
            })
            .style("stroke-width", function(pl) {
                const isActive = activeData.some(act => act.Number === pl.Number);
                return isActive ? "1.8px" : "0.5px";
            });

        hideTooltip();
    }
}

// position tooltip near cursor
function positionTooltip(event) {
    const tooltip = d3.select("#tooltip");
    const node = tooltip.node();
    const width = node.offsetWidth;
    const height = node.offsetHeight;

    let x = event.pageX + 15;
    let y = event.pageY - height - 10;

    // keep tooltip on screen - Gemini helped me with the logic of this.
    if (x + width > window.innerWidth) {
        x = event.pageX - width - 15;
    }
    if (y < 0) {
        y = event.pageY + 20;
    }

    tooltip.style("left", `${x}px`).style("top", `${y}px`);
}

function hideTooltip() {
    d3.select("#tooltip").style("opacity", 0);
}

// reset all visual selections and filters
function resetDashboard() {
    d3.selectAll(".brush").each(function() {
        d3.select(this).call(d3.brushY().clear);
    });
    brushSelections = {};

    selectedTypeFilter = null;
    d3.selectAll(".legend-item").classed("active-filter", false);

    deselectPokemon();

    scatterSvg.transition().duration(750)
        .call(scatterZoom.transform, d3.zoomIdentity);

    activeData = globalData;

    applyFilters();
}

// handle screen resizing
function handleResize() {
    if (pcSvg && pcSvg.node()) {
        const pcBound = pcSvg.node().getBoundingClientRect();
        pcWidth = pcBound.width - defaultMargin.left - defaultMargin.right;
        pcHeight = pcBound.height - defaultMargin.top - defaultMargin.bottom;
        
        initParallelCoordinates();
        applyFilters();
    }

    if (barSvg && barSvg.node()) {
        const barBound = barSvg.node().getBoundingClientRect();
        barWidth = barBound.width - defaultMargin.left - defaultMargin.right;
        barHeight = barBound.height - defaultMargin.top - 60;
        
        initBarChart();
        updateBarChart(false);
    }

    if (scatterSvg && scatterSvg.node()) {
        const scatBound = scatterSvg.node().getBoundingClientRect();
        scatterWidth = scatBound.width - defaultMargin.left - defaultMargin.right;
        scatterHeight = scatBound.height - defaultMargin.top - defaultMargin.bottom;
        
        initScatterPlot();
        updateScatterPlot(false);
    }
}
