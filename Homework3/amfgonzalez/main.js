// ======================= GLOBALS =======================
let fullData = [];
let selectedType = null;      // filter by type (click on bar)
let brushedPokemon = null;    // array of names selected by brush, null = no brush filter
let colorScale;

const barWidth = 600, barHeight = 350;
const scatterWidth = 600, scatterHeight = 350;
const parMargin = { top: 55, right: 70, bottom: 55, left: 70 };

let parDimensions = ["hp", "attack", "defense", "spAttack", "spDefense", "speed"];
let dimLabels = { hp: "HP", attack: "Attack", defense: "Defense", spAttack: "Sp.Atk", spDefense: "Sp.Def", speed: "Speed" };

// Zoom/pan state for scatter plot
let scatterZoom = d3.zoom().scaleExtent([0.5, 5]);
let currentTransform = d3.zoomIdentity;
let xScaleLinear, yScaleLinear, innerWidthScatter, innerHeightScatter;
let scatterGroup, pointsGroup, xAxisGroup, yAxisGroup, brushGroup, tooltip;
let marginScatter = { top: 45, right: 30, bottom: 55, left: 60 };

// ================ DATA LOADING (flexible file name) ==================
async function loadData() {
    // Try multiple possible file names
    const possiblePaths = [
        "./data/pokemon_alopez247.csv",
        "./data/pokemon.csv",
        "./data/Pokemon.csv"
    ];
    let raw = null;
    let usedPath = null;
    for (let path of possiblePaths) {
        try {
            console.log("Trying to load:", path);
            raw = await d3.csv(path);
            if (raw && raw.length > 0) {
                usedPath = path;
                break;
            }
        } catch(e) { /* continue */ }
    }
    if (!raw || raw.length === 0) {
        console.error("Could not load CSV, using fallback data");
        return generateFallbackData();
    }
    console.log("Loaded from:", usedPath, "rows:", raw.length);
    
    const parsed = raw.map(d => {
        // Try to find correct columns (case-insensitive)
        const name = d.Name || d.name;
        const type = (d.Type_1 || d.type1 || d.Type1 || "Unknown").trim();
        const hp = + (d.HP || d.Hp || d.hp);
        const attack = + (d.Attack || d.attack);
        const defense = + (d.Defense || d.defense);
        const spAttack = + (d.Sp_Atk || d["Sp. Atk"] || d.SpAtk || 0);
        const spDefense = + (d.Sp_Def || d["Sp. Def"] || d.SpDef || 0);
        const speed = + (d.Speed || d.speed);
        return { name, type, hp, attack, defense, spAttack, spDefense, speed };
    }).filter(d => !isNaN(d.hp) && !isNaN(d.attack) && d.type !== "Unknown" && d.name);
    
    if (parsed.length === 0) {
        console.warn("No valid rows after parsing, using fallback");
        return generateFallbackData();
    }
    console.log(`Successfully parsed ${parsed.length} Pokémon`);
    return parsed;
}

function generateFallbackData() {
    console.log("Generating fallback synthetic data");
    const types = ["Grass","Fire","Water","Bug","Normal","Electric","Psychic","Rock","Ghost"];
    let data = [];
    for (let i=1; i<=50; i++) {
        data.push({
            name: `Mon-${i}`,
            type: types[i % types.length],
            hp: 40 + Math.floor(Math.random()*90),
            attack: 35 + Math.floor(Math.random()*110),
            defense: 30 + Math.floor(Math.random()*100),
            spAttack: 40 + Math.floor(Math.random()*100),
            spDefense: 35 + Math.floor(Math.random()*95),
            speed: 30 + Math.floor(Math.random()*110)
        });
    }
    return data;
}

function buildColorScale(data) {
    const types = [...new Set(data.map(d => d.type))].sort();
    return d3.scaleOrdinal()
        .domain(types)
        .range(d3.schemeTableau10.concat(d3.schemeSet2).slice(0, types.length));
}

// ================ Helper: which data is visible? ==================
function getFilteredData() {
    let filtered = fullData;
    if (selectedType) {
        filtered = filtered.filter(d => d.type === selectedType);
    }
    if (brushedPokemon !== null) {
        filtered = filtered.filter(d => brushedPokemon.includes(d.name));
    }
    return filtered;
}

// ================ VIEW 1: BAR CHART ==================
function renderBarChart() {
    const filteredForCount = getFilteredData();
    const counts = d3.rollup(fullData, v => v.length, d => d.type);
    const typeCounts = Array.from(counts, ([type, count]) => ({ type, count }))
                         .sort((a,b) => b.count - a.count);
    
    const margin = { top: 35, right: 20, bottom: 65, left: 55 };
    const innerWidth = barWidth - margin.left - margin.right;
    const innerHeight = barHeight - margin.top - margin.bottom;
    
    d3.select("#bar-chart").selectAll("svg").remove();
    const svg = d3.select("#bar-chart")
        .append("svg")
        .attr("width", barWidth)
        .attr("height", barHeight)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    const x = d3.scaleBand()
        .domain(typeCounts.map(d => d.type))
        .range([0, innerWidth])
        .padding(0.3);
    
    const y = d3.scaleLinear()
        .domain([0, d3.max(typeCounts, d => d.count) + 1])
        .range([innerHeight, 0]);
    
    const filteredCounts = d3.rollup(filteredForCount, v => v.length, d => d.type);
    
    svg.selectAll(".bar")
        .data(typeCounts)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.type))
        .attr("width", x.bandwidth())
        .attr("y", d => y(d.count))
        .attr("height", d => innerHeight - y(d.count))
        .attr("fill", d => colorScale(d.type))
        .attr("stroke", d => selectedType === d.type ? "#1f2a44" : "none")
        .attr("stroke-width", 2.5)
        .attr("opacity", d => (filteredCounts.get(d.type) || 0) > 0 ? 1 : 0.3)
        .style("cursor", "pointer")
        .on("click", (event, d) => {
            if (selectedType === d.type) selectedType = null;
            else selectedType = d.type;
            brushedPokemon = null;
            updateAllViewsWithAnimation();
        });
    
    svg.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).tickSize(5))
        .selectAll("text")
        .attr("transform", "rotate(-25)")
        .style("text-anchor", "end")
        .style("font-size", "9px");
    
    svg.append("g").call(d3.axisLeft(y).ticks(6));
    
    svg.append("text")
        .attr("x", innerWidth/2)
        .attr("y", innerHeight + 45)
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .text("Primary Type");
    
    svg.append("text")
        .attr("x", -innerHeight/2)
        .attr("y", -35)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .style("font-weight", "500")
        .text("Number of Pokémon");
    
    svg.append("text")
        .attr("x", innerWidth/2)
        .attr("y", -12)
        .attr("text-anchor", "middle")
        .style("font-weight", "600")
        .style("font-size", "12px")
        .text("Overview: Pokémon per Primary Type");
    
    const legendDiv = d3.select("#bar-legend").html("");
    legendDiv.append("span").attr("class", "legend-title").text("Type colors: ");
    typeCounts.slice(0,12).forEach(t => {
        legendDiv.append("div").attr("class", "legend-item")
            .html(`<div class="legend-color" style="background:${colorScale(t.type)}"></div><span>${t.type}</span>`);
    });
}

// ================ VIEW 2: SCATTER PLOT with brush and zoom ==================
function initScatter() {
    const container = d3.select("#scatter-plot");
    container.selectAll("svg").remove();
    
    innerWidthScatter = scatterWidth - marginScatter.left - marginScatter.right;
    innerHeightScatter = scatterHeight - marginScatter.top - marginScatter.bottom;
    
    const svg = container
        .append("svg")
        .attr("width", scatterWidth)
        .attr("height", scatterHeight)
        .style("cursor", "crosshair")
        .call(scatterZoom);
    
    scatterGroup = svg.append("g")
        .attr("transform", `translate(${marginScatter.left},${marginScatter.top})`);
    
    // Scales based on full data
    const maxAttack = d3.max(fullData, d => d.attack) + 5;
    const maxDefense = d3.max(fullData, d => d.defense) + 5;
    xScaleLinear = d3.scaleLinear().domain([0, maxAttack]).range([0, innerWidthScatter]);
    yScaleLinear = d3.scaleLinear().domain([0, maxDefense]).range([innerHeightScatter, 0]);
    
    // Axes groups
    xAxisGroup = scatterGroup.append("g")
        .attr("transform", `translate(0,${innerHeightScatter})`);
    yAxisGroup = scatterGroup.append("g");
    
    // Points group
    pointsGroup = scatterGroup.append("g").attr("class", "points");
    
    // Brush group
    brushGroup = scatterGroup.append("g").attr("class", "brush");
    const brush = d3.brush()
        .extent([[0, 0], [innerWidthScatter, innerHeightScatter]])
        .on("brush end", brushed);
    brushGroup.call(brush);
    
    // Tooltip
    tooltip = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);
    
    // Zoom handler
    function zoomed(event) {
        currentTransform = event.transform;
        const newX = currentTransform.rescaleX(xScaleLinear);
        const newY = currentTransform.rescaleY(yScaleLinear);
        pointsGroup.selectAll(".dot")
            .attr("cx", d => newX(d.attack))
            .attr("cy", d => newY(d.defense));
        xAxisGroup.call(d3.axisBottom(newX).ticks(6));
        yAxisGroup.call(d3.axisLeft(newY).ticks(6));
        brushGroup.call(brush);
    }
    
    scatterZoom.on("zoom", zoomed);
    
    function brushed(event) {
        if (!event.selection) {
            brushedPokemon = null;
        } else {
            const [[x0, y0], [x1, y1]] = event.selection;
            const xScaleInv = currentTransform.rescaleX(xScaleLinear);
            const yScaleInv = currentTransform.rescaleY(yScaleLinear);
            const xMin = xScaleInv.invert(x0);
            const xMax = xScaleInv.invert(x1);
            const yMin = yScaleInv.invert(y0);
            const yMax = yScaleInv.invert(y1);
            const selectedNames = fullData.filter(d => 
                d.attack >= xMin && d.attack <= xMax && d.defense >= yMin && d.defense <= yMax
            ).map(d => d.name);
            brushedPokemon = selectedNames.length ? selectedNames : null;
        }
        updateAllViewsWithAnimation();
    }
    
    // Initial axes draw
    updateScatterPoints();
}

function updateScatterPoints() {
    const filteredData = getFilteredData();
    const points = pointsGroup.selectAll(".dot").data(filteredData, d => d.name);
    
    points.enter()
        .append("circle")
        .attr("class", "dot")
        .attr("r", 5)
        .attr("fill", d => colorScale(d.type))
        .attr("stroke", "#fff")
        .attr("stroke-width", 0.5)
        .on("mouseover", function(e,d) {
            tooltip.html(`<b>${d.name}</b><br/>Type: ${d.type}<br/> Attack: ${d.attack}<br/> Defense: ${d.defense}`)
                .style("left", (e.pageX+12)+"px").style("top", (e.pageY-28)+"px").style("opacity", 0.95);
        })
        .on("mouseout", () => tooltip.style("opacity", 0))
        .merge(points)
        .transition()
        .duration(500)
        .attr("cx", d => currentTransform.rescaleX(xScaleLinear)(d.attack))
        .attr("cy", d => currentTransform.rescaleY(yScaleLinear)(d.defense))
        .attr("fill", d => colorScale(d.type));
    
    points.exit()
        .transition()
        .duration(300)
        .attr("opacity", 0)
        .remove();
    
    // Update axes labels (static)
    xAxisGroup.transition().duration(300).call(d3.axisBottom(currentTransform.rescaleX(xScaleLinear)).ticks(6));
    yAxisGroup.transition().duration(300).call(d3.axisLeft(currentTransform.rescaleY(yScaleLinear)).ticks(6));
    
    // Add axis titles (once)
    if (scatterGroup.select(".x-label").empty()) {
        scatterGroup.append("text")
            .attr("class", "x-label")
            .attr("x", innerWidthScatter/2)
            .attr("y", innerHeightScatter + 38)
            .attr("text-anchor", "middle")
            .text("Attack");
        scatterGroup.append("text")
            .attr("class", "y-label")
            .attr("x", -innerHeightScatter/2)
            .attr("y", -42)
            .attr("transform", "rotate(-90)")
            .attr("text-anchor", "middle")
            .text("Defense");
        scatterGroup.append("text")
            .attr("class", "title")
            .attr("x", innerWidthScatter/2)
            .attr("y", -15)
            .attr("text-anchor", "middle")
            .style("font-weight", "600")
            .text("Focus: Attack vs Defense");
    }
}

// ================ VIEW 3: PARALLEL COORDINATES ==================
function renderParallelCoords() {
    const container = document.getElementById("parallel-coords");
    const width = Math.min(container.clientWidth, 1100);
    const height = 480;
    const innerHeight = height - parMargin.top - parMargin.bottom;
    const innerWidth = width - parMargin.left - parMargin.right;
    
    d3.select("#parallel-coords").selectAll("svg").remove();
    const svg = d3.select("#parallel-coords")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${parMargin.left},${parMargin.top})`);
    
    const mins = {}, maxs = {};
    parDimensions.forEach(dim => {
        const vals = fullData.map(p => p[dim]);
        mins[dim] = d3.min(vals);
        maxs[dim] = d3.max(vals);
    });
    
    const yScales = {};
    parDimensions.forEach(dim => {
        yScales[dim] = d3.scaleLinear()
            .domain([mins[dim], maxs[dim]])
            .range([innerHeight, 0]);
    });
    
    const xPos = {};
    const step = innerWidth / (parDimensions.length - 1);
    parDimensions.forEach((dim, i) => { xPos[dim] = i * step; });
    
    // Axes
    parDimensions.forEach(dim => {
        const g = svg.append("g").attr("transform", `translate(${xPos[dim]},0)`);
        g.call(d3.axisLeft(yScales[dim]).ticks(5));
        g.append("text")
            .attr("x", 0)
            .attr("y", -25)
            .attr("text-anchor", "middle")
            .style("font-weight", "bold")
            .style("font-size", "12px")
            .text(dimLabels[dim]);
        g.append("text")
            .attr("x", 0)
            .attr("y", innerHeight + 15)
            .attr("text-anchor", "middle")
            .style("font-size", "8px")
            .text(`min: ${Math.round(mins[dim])}`);
        g.append("text")
            .attr("x", 0)
            .attr("y", -5)
            .attr("text-anchor", "middle")
            .style("font-size", "8px")
            .text(`max: ${Math.round(maxs[dim])}`);
    });
    
    svg.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", -40)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text("Advanced: Pokémon Stat Profiles");
    
    const filteredData = getFilteredData();
    const lineGen = d => d3.line()(parDimensions.map(dim => [xPos[dim], yScales[dim](d[dim])]));
    const pcTooltip = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);
    
    const lines = svg.selectAll(".par-line")
        .data(filteredData, d => d.name)
        .enter()
        .append("path")
        .attr("class", "par-line")
        .attr("d", d => lineGen(d))
        .attr("fill", "none")
        .attr("stroke", d => colorScale(d.type))
        .attr("stroke-width", 0.9)
        .attr("opacity", 0.6)
        .on("mouseover", function(e,d) {
            d3.select(this).attr("stroke-width", 2).attr("opacity", 1);
            pcTooltip.html(`<b>${d.name}</b> (${d.type})<br/>
                HP:${d.hp} | Atk:${d.attack} | Def:${d.defense}<br/>
                SpA:${d.spAttack} | SpD:${d.spDefense} | Spe:${d.speed}`)
                .style("left", (e.pageX+12)+"px").style("top", (e.pageY-30)+"px").style("opacity",0.95);
        })
        .on("mouseout", function() {
            d3.select(this).attr("stroke-width", 0.9).attr("opacity", 0.6);
            pcTooltip.style("opacity", 0);
        });
    
    // Remove old lines that are no longer in filtered data (if any)
    svg.selectAll(".par-line")
        .data(filteredData, d => d.name)
        .exit()
        .remove();
    
    const legendDiv = d3.select("#global-legend").html("");
    legendDiv.append("span").attr("class", "legend-title").text("Consistent type colors: ");
    const uniTypes = [...new Set(fullData.map(d => d.type))].slice(0,16);
    uniTypes.forEach(t => {
        legendDiv.append("div").attr("class", "legend-item")
            .html(`<div class="legend-color" style="background:${colorScale(t)}"></div><span>${t}</span>`);
    });
}

// ================ GLOBAL UPDATE WITH ANIMATIONS ==================
function updateAllViewsWithAnimation() {
    renderBarChart();                // bar chart re-renders with new opacity
    updateScatterPoints();          // animated points update
    renderParallelCoords();         // parallel coords re-renders with new lines
}

function resetFilter() {
    selectedType = null;
    brushedPokemon = null;
    // Reset zoom transform to identity
    currentTransform = d3.zoomIdentity;
    if (scatterGroup) {
        d3.select("#scatter-plot svg").call(scatterZoom.transform, d3.zoomIdentity);
    }
    updateAllViewsWithAnimation();
}

// ================ INIT ==================
async function init() {
    fullData = await loadData();
    if (!fullData.length) return;
    colorScale = buildColorScale(fullData);
    renderBarChart();
    initScatter();      
    renderParallelCoords();
    document.getElementById("reset-filter").addEventListener("click", resetFilter);
    window.addEventListener("resize", () => setTimeout(() => renderParallelCoords(), 100));
}

init();