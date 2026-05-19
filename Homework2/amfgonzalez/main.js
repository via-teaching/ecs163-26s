// ======================= GLOBALS =======================
let fullData = [];
let selectedType = null;
let colorScale;

const barWidth = 600, barHeight = 350;
const scatterWidth = 600, scatterHeight = 350;
const parMargin = { top: 55, right: 70, bottom: 55, left: 70 }; 

let parDimensions = ["hp", "attack", "defense", "spAttack", "spDefense", "speed"];
let dimLabels = { hp: "HP", attack: "Attack", defense: "Defense", spAttack: "Sp.Atk", spDefense: "Sp.Def", speed: "Speed" };

// ================ DATA LOADING ==================
async function loadData() {
    const csvPath = "./data/pokemon_alopez247.csv";
    console.log("Loading:", csvPath);
    try {
        const raw = await d3.csv(csvPath);
        if (!raw || raw.length === 0) throw new Error("Empty CSV");
        
        console.log("First row sample:", raw[0]);
        console.log("Column names:", Object.keys(raw[0]));
        
        const parsed = raw.map(d => {
            // Map directly using your column names
            const name = d.Name;
            const type = (d.Type_1 || "Unknown").trim();
            const hp = +d.HP;
            const attack = +d.Attack;
            const defense = +d.Defense;
            const spAttack = +d.Sp_Atk;
            const spDefense = +d.Sp_Def;
            const speed = +d.Speed;
            
            return { name, type, hp, attack, defense, spAttack, spDefense, speed };
        }).filter(d => !isNaN(d.hp) && !isNaN(d.attack) && d.type !== "Unknown" && d.name);
        
        if (parsed.length === 0) throw new Error("No valid rows after parsing");
        console.log(`Successfully parsed ${parsed.length} Pokémon`);
        return parsed;
    } catch (err) {
        console.error("Load error:", err);
        alert(`Could not load ${csvPath}. Using fallback demo data.`);
        return generateFallbackData();
    }
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

// ================ COLOR SCALE ==================
function buildColorScale(data) {
    const types = [...new Set(data.map(d => d.type))].sort();
    return d3.scaleOrdinal()
        .domain(types)
        .range(d3.schemeTableau10.concat(d3.schemeSet2).slice(0, types.length));
}

// ================ VIEW 1: BAR CHART (with explicit Y-axis label) ==================
function renderBarChart(data, filterType) {
    const counts = d3.rollup(data, v => v.length, d => d.type);
    const typeCounts = Array.from(counts, ([type, count]) => ({ type, count }))
                         .sort((a,b) => b.count - a.count);
    
    if (typeCounts.length === 0) return;
    
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
    
    svg.selectAll(".bar")
        .data(typeCounts)
        .enter()
        .append("rect")
        .attr("x", d => x(d.type))
        .attr("y", d => y(d.count))
        .attr("width", x.bandwidth())
        .attr("height", d => innerHeight - y(d.count))
        .attr("fill", d => colorScale(d.type))
        .attr("stroke", d => filterType === d.type ? "#1f2a44" : "none")
        .attr("stroke-width", 2.5)
        .attr("opacity", d => (filterType === null || filterType === d.type) ? 1 : 0.5)
        .style("cursor", "pointer")
        .on("click", (event, d) => {
            if (selectedType === d.type) selectedType = null;
            else selectedType = d.type;
            updateAllViews();
        });
    
    // Axes
    svg.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).tickSize(5))
        .selectAll("text")
        .attr("transform", "rotate(-25)")
        .style("text-anchor", "end")
        .style("font-size", "9px");
    
    svg.append("g").call(d3.axisLeft(y).ticks(6));
    
    // X-axis label
    svg.append("text")
        .attr("x", innerWidth/2)
        .attr("y", innerHeight + 45)
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .text("Primary Type");
    
    // Y-axis label
    svg.append("text")
        .attr("x", -innerHeight/2)
        .attr("y", -35)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .style("font-size", "11px")
        .style("font-weight", "500")
        .text("Number of Pokémon");
    
    // Chart title
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

// ================ VIEW 2: SCATTER PLOT ==================
function renderScatter(data, filterType) {
    const margin = { top: 45, right: 30, bottom: 55, left: 60 };
    const innerWidth = scatterWidth - margin.left - margin.right;
    const innerHeight = scatterHeight - margin.top - margin.bottom;
    
    d3.select("#scatter-plot").selectAll("svg").remove();
    const svg = d3.select("#scatter-plot")
        .append("svg")
        .attr("width", scatterWidth)
        .attr("height", scatterHeight)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    const xScale = d3.scaleLinear()
        .domain([0, d3.max(fullData, d => d.attack) + 5])
        .range([0, innerWidth]);
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(fullData, d => d.defense) + 5])
        .range([innerHeight, 0]);
    
    const tooltip = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);
    
    svg.selectAll(".dot")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", d => xScale(d.attack))
        .attr("cy", d => yScale(d.defense))
        .attr("r", 5)
        .attr("fill", d => colorScale(d.type))
        .attr("stroke", d => (filterType && d.type === filterType) ? "#2c3e66" : "none")
        .attr("stroke-width", 1.2)
        .attr("opacity", d => (filterType === null || d.type === filterType) ? 0.85 : 0.2)
        .on("mouseover", function(e,d) {
            tooltip.html(`<b>${d.name}</b><br/>Type: ${d.type}<br/> Attack: ${d.attack}<br/> Defense: ${d.defense}`)
                .style("left", (e.pageX+12)+"px").style("top", (e.pageY-28)+"px").style("opacity", 0.95);
        })
        .on("mouseout", () => tooltip.style("opacity", 0));
    
    svg.append("g").attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(xScale).ticks(6));
    svg.append("g").call(d3.axisLeft(yScale).ticks(6));
    
    svg.append("text").attr("x", innerWidth/2).attr("y", innerHeight+38).attr("text-anchor","middle").text("Attack");
    svg.append("text").attr("x", -innerHeight/2).attr("y", -42).attr("transform","rotate(-90)").attr("text-anchor","middle").text("Defense");
    svg.append("text").attr("x", innerWidth/2).attr("y", -15).attr("text-anchor","middle").style("font-weight","600").text("Focus: Attack vs Defense");
}

// ================ VIEW 3: PARALLEL COORDINATES ==================
function renderParallelCoords(data, filterType) {
    const container = document.getElementById("parallel-coords");
    const width = Math.min(container.clientWidth, 1100);
    const height = 480; // increased for clearer titles
    const innerHeight = height - parMargin.top - parMargin.bottom;
    const innerWidth = width - parMargin.left - parMargin.right;
    
    d3.select("#parallel-coords").selectAll("svg").remove();
    const svg = d3.select("#parallel-coords")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${parMargin.left},${parMargin.top})`);
    
    // Compute global min/max for each dimension
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
    
    // Draw axis titles
    parDimensions.forEach(dim => {
        const g = svg.append("g").attr("transform", `translate(${xPos[dim]},0)`);
        g.call(d3.axisLeft(yScales[dim]).ticks(5));
        
        // Axis title 
        g.append("text")
            .attr("x", 0)
            .attr("y", -25)
            .attr("text-anchor", "middle")
            .style("font-weight", "bold")
            .style("font-size", "12px")
            .style("fill", "#1e2a3a")
            .text(dimLabels[dim]);
        
        // Min/max hints
        g.append("text")
            .attr("x", 0)
            .attr("y", innerHeight + 15)
            .attr("text-anchor", "middle")
            .style("font-size", "8px")
            .style("fill", "#666")
            .text(`min: ${Math.round(mins[dim])}`);
        
        g.append("text")
            .attr("x", 0)
            .attr("y", -5)
            .attr("text-anchor", "middle")
            .style("font-size", "8px")
            .style("fill", "#666")
            .text(`max: ${Math.round(maxs[dim])}`);
    });
    
    // Overall title for the advanced plot
    svg.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", -40)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .style("fill", "#2c3e66")
        .text("Advanced: Pokémon Stat Profiles (Higher values = better performance)");
    
    const filtered = filterType ? data.filter(d => d.type === filterType) : data;
    const lineGen = d => d3.line()(parDimensions.map(dim => [xPos[dim], yScales[dim](d[dim])]));
    const tooltip = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);
    
    svg.selectAll(".par-line")
        .data(filtered)
        .enter()
        .append("path")
        .attr("d", d => lineGen(d))
        .attr("fill", "none")
        .attr("stroke", d => colorScale(d.type))
        .attr("stroke-width", 0.9)
        .attr("opacity", 0.6)
        .on("mouseover", function(e,d) {
            d3.select(this).attr("stroke-width", 2).attr("opacity", 1);
            tooltip.html(`<b>${d.name}</b> (${d.type})<br/>
                HP:${d.hp} | Atk:${d.attack} | Def:${d.defense}<br/>
                SpA:${d.spAttack} | SpD:${d.spDefense} | Spe:${d.speed}`)
                .style("left", (e.pageX+12)+"px").style("top", (e.pageY-30)+"px").style("opacity",0.95);
        })
        .on("mouseout", function() {
            d3.select(this).attr("stroke-width", 0.9).attr("opacity", 0.6);
            tooltip.style("opacity", 0);
        });
    
    const legendDiv = d3.select("#global-legend").html("");
    legendDiv.append("span").attr("class", "legend-title").text("Consistent type colors: ");
    const uniTypes = [...new Set(fullData.map(d => d.type))].slice(0,16);
    uniTypes.forEach(t => {
        legendDiv.append("div").attr("class", "legend-item")
            .html(`<div class="legend-color" style="background:${colorScale(t)}"></div><span>${t}</span>`);
    });
}

function updateAllViews() {
    const filteredData = selectedType ? fullData.filter(d => d.type === selectedType) : fullData;
    renderBarChart(fullData, selectedType);
    renderScatter(filteredData, selectedType);
    renderParallelCoords(fullData, selectedType);
}

function resetFilter() {
    selectedType = null;
    updateAllViews();
}

async function init() {
    fullData = await loadData();
    if (!fullData.length) {
        console.error("No data available");
        return;
    }
    colorScale = buildColorScale(fullData);
    updateAllViews();
    document.getElementById("reset-filter").addEventListener("click", resetFilter);
    window.addEventListener("resize", () => setTimeout(() => renderParallelCoords(fullData, selectedType), 100));
}

init();