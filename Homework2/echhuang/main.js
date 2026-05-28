// 1. Layout Constants
let abFilter = 25;
const width = window.innerWidth;
const height = window.innerHeight;
// View 1: Bar Chart Setup (impact)
let scatterMargin = {top: 40, right: 30, bottom: 150, left: 60}, // Increased bottom margin for rotated text
    scatterWidth = (width / 2) - scatterMargin.left - scatterMargin.right,
    scatterHeight = (height / 2) - scatterMargin.top - scatterMargin.bottom;

// View 2: Donut Chart Setup (distr)
let distrMargin = {top: 40, right: 30, bottom: 40, left: 60},
    distrWidth = (width / 2) - distrMargin.left - distrMargin.right,
    distrHeight = (height / 2) - distrMargin.top - distrMargin.bottom;
const radius = Math.min(distrWidth, distrHeight) / 2;
// View 3: Sankey Diagram Setup
let sankeyMargin = {top: 40, right: 100, bottom: 40, left: 40},
    sankeyWidth = width - sankeyMargin.left - sankeyMargin.right,
    sankeyHeight = (height / 2) - sankeyMargin.top - sankeyMargin.bottom;
// 2. Create SVG Containers

const svgBar = d3.select("#view1")
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `0 0 ${scatterWidth + scatterMargin.left + scatterMargin.right} ${scatterHeight + scatterMargin.top + scatterMargin.bottom}`)
    .append("g")
    .attr("transform", `translate(${scatterMargin.left}, ${scatterMargin.top})`);

const svgDistr = d3.select("#view2") // Targets the top-right div
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `0 0 ${distrWidth + distrMargin.left + distrMargin.right} ${distrHeight + distrMargin.top + distrMargin.bottom}`)
    .append("g")
    .attr("transform", `translate(${(distrWidth / 2) + distrMargin.left}, ${(distrHeight / 2) + distrMargin.top})`);

const svgSankey = d3.select("#view3") // Targets a bottom div
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", `0 0 ${sankeyWidth + sankeyMargin.left + sankeyMargin.right} ${sankeyHeight + sankeyMargin.top + sankeyMargin.bottom}`)
    .append("g")
    .attr("transform", `translate(${sankeyMargin.left}, ${sankeyMargin.top})`);
// 3. Load and Process Data
d3.csv("data/fitness.csv").then(function(data) {
    
    // --- Data Processing ---
    let counts = {};
    data.forEach(d => {
        let key = d["How often do you exercise in a week?"];
        if (key) counts[key] = (counts[key] || 0) + 1;
    });// This is where we count how many times did each response appear for the exercise frequency question. 

    let formattedData = Object.keys(counts).map(key => ({
        label: key,
        value: counts[key]
    }));
    let selectedLabel = null; 

    const color = d3.scaleOrdinal(d3.schemeTableau10);
    const pie = d3.pie().value(d => d.value).sort(null);
    const arc = d3.arc().innerRadius(radius * 0.5).outerRadius(radius);
    svgDistr.append("text")
    .attr("x", 0)             // Centered horizontally relative to the 'g' group
    .attr("y", -radius - 20)  // Placed 20px above the top of the donut
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .style("fill", "#333")
    .text("Weekly Exercise Frequency");
    // NEW: Wrap the drawing logic in a function so we can re-call it on click
    function updateDonut() {

        const currentData = selectedLabel //This is where if a slice is selected it hides everything and focus on this one
            ? formattedData.filter(d => d.label === selectedLabel)
            : formattedData;

        const arcsData = pie(currentData);

        const paths = svgDistr.selectAll(".arc-path")// This match the existing paths on the screen with the new data I just calculated
            .data(arcsData, d => d.data.label);


        paths.exit()//this is saying if the slice is on the screen but no longer in the current data then fade it out 
            .transition().duration(500)
            .attr("opacity", 0)
            .remove();

        paths.enter()
            .append("path")
            .attr("class", "arc-path")
            .attr("stroke", "white")
            .style("stroke-width", "2px")
            .style("cursor", "pointer")
            .each(function(d) { this._current = d; }) 
            .on("click", (event, d) => {
                selectedLabel = (selectedLabel === d.data.label) ? null : d.data.label;
                updateDonut();
            })
            .merge(paths)
            .attr("fill", d => color(d.data.label))
            .transition().duration(750)
            .attrTween("d", function(d) {
                const interpolate = d3.interpolate(this._current, d);
                this._current = interpolate(0);
                return t => arc(interpolate(t));
            });
        const labels = svgDistr.selectAll(".slice-label")
            .data(arcsData, d => d.data.label);

        labels.exit().remove();

        labels.enter()
            .append("text")
            .attr("class", "slice-label")
            .attr("text-anchor", "middle")
            .style("pointer-events", "none")
            .style("fill", "white")
            .style("font-size", "12px")
            .merge(labels)
            .transition().duration(750)
            .attr("transform", d => `translate(${arc.centroid(d)})`)
            .text(d => d.data.value);
    }

    updateDonut();

    // --- Legend (Remains mostly same, but can also trigger reset) ---
    const legend = svgDistr.append("g")
        .attr("transform", `translate(${radius + 20}, ${-radius / 2})`);

    formattedData.forEach((d, i) => {
        const legendRow = legend.append("g")
            .attr("transform", `translate(0, ${i * 20})`)
            .style("cursor", "pointer")
            .on("click", () => {
                selectedLabel = null; // Clicking legend resets the view
                updateDonut();
            });

        legendRow.append("rect").attr("width", 12).attr("height", 12).attr("fill", color(d.label));
        legendRow.append("text").attr("x", 20).attr("y", 10).style("font-size", "11px").text(d.label);
    });



// --- BAR CHART DATA PROCESSING ---
let impactCounts = {};//This create an empty object to store count 
data.forEach(d => {
    let key = d["How has the fitness wearable impacted your fitness routine?"];
    if (key) {
        impactCounts[key] = (impactCounts[key] || 0) + 1;
    }
});//this part loop through the data and count how many time each response appear 

let barData = Object.keys(impactCounts).map(key => ({
    category: key,
    value: impactCounts[key]
}));//This transform the count object in to an array that can be used

let selectedBars = new Set();// this is which bars are curerntly selected


const x = d3.scaleBand()//this create the x for the bar chart 
    .domain(barData.map(d => d.category))
    .range([0, scatterWidth])
    .padding(0.2);

const y = d3.scaleLinear()//This create the y for the bar chart 
    .domain([0, d3.max(barData, d => d.value)])
    .nice()
    .range([scatterHeight, 0]);

// --- DRAW BARS ---
const bars = svgBar.selectAll(".bar")
    .data(barData)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", d => x(d.category))
    .attr("y", d => y(d.value))
    .attr("width", x.bandwidth())
    .attr("height", d => scatterHeight - y(d.value))
    .attr("fill", "#4e79a7") // Default color
    .style("cursor", "pointer")
    .style("transition", "opacity 0.2s, fill 0.2s") // Smooth visual feedback
    .on("click", function(event, d) {
        if (selectedBars.has(d.category)) {
            selectedBars.delete(d.category);
        } else {
            selectedBars.add(d.category);
        }
        svgBar.selectAll(".bar")
            .attr("fill", node => selectedBars.has(node.category) ? "#e15759" : "#4e79a7") // Highlight color vs Default
            .style("opacity", node => {
                // If nothing is selected, full opacity. 
                // If something is selected, dim the unselected ones.
                if (selectedBars.size === 0) return 1;
                return selectedBars.has(node.category) ? 1 : 0.4;
            })
            .attr("stroke", node => selectedBars.has(node.category) ? "black" : "none")
            .attr("stroke-width", "2px");
    });

svgBar.append("g")//add the axes
    .attr("transform", `translate(0,${scatterHeight})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "translate(-10,0)rotate(-45)")
    .style("text-anchor", "end");

svgBar.append("g")
    .call(d3.axisLeft(y));

svgBar.append("text")//add the labels
    .attr("x", scatterWidth / 2)
    .attr("y", -10)
    .attr("text-anchor", "middle")
    .style("font-weight", "bold")
    .text("Impact of Wearable on Routine (Click to Filter)");

svgBar.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", -scatterMargin.left + 20)
    .attr("x", -scatterHeight / 2)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .text("Number of Users");

const sankeyNodes = []; const sankeyLinks = []; const nodeMap = new Map();// this create a storage for all node and links 
    const cols = ["What is your gender?", "How often do you track fitness data using wearable?", 
                  "How has the fitness wearable impacted your fitness routine?", "Has the fitness wearable helped you stay motivated to exercise?"];//this are the differnt stages of the sankey diagram

    function getNode(level, name) {//this is used to prevent duplicated nodes
        const key = `${level}-${name}`;
        if (!nodeMap.has(key)) { nodeMap.set(key, sankeyNodes.length); sankeyNodes.push({ name: name }); }
        return nodeMap.get(key);
    }
// This buildis link betweem each column 
    cols.forEach((col, i) => {
        if (i === cols.length - 1) return;
        d3.rollup(data, v => v.length, d => d[col], d => d[cols[i+1]]).forEach((targets, src) => {
            targets.forEach((count, tgt) => {
                sankeyLinks.push({ source: getNode(i, src), target: getNode(i+1, tgt), value: count });
            });
        });
    });

    const { nodes, links } = d3.sankey().nodeWidth(15).nodePadding(15)
        .extent([[1, 1], [sankeyWidth - 1, sankeyHeight - 5]])({
            nodes: sankeyNodes.map(d => Object.assign({}, d)),
            links: sankeyLinks.map(d => Object.assign({}, d))
        });

    const sankeyLinksPath = svgSankey.append("g").attr("fill", "none").attr("stroke-opacity", 0.3)
        .selectAll("path").data(links).enter().append("path")
        .attr("d", d3.sankeyLinkHorizontal()).attr("stroke", d => color(d.source.name))
        .attr("stroke-width", d => Math.max(1, d.width));

    const nodeG = svgSankey.append("g").selectAll("g").data(nodes).enter().append("g");
    nodeG.append("rect").attr("x", d => d.x0).attr("y", d => d.y0)
        .attr("height", d => d.y1 - d.y0).attr("width", d => d.x1 - d.x0)
        .attr("fill", d => color(d.name)).attr("stroke", "#000");
    nodeG.append("text").attr("x", d => d.x0 < sankeyWidth / 2 ? d.x1 + 6 : d.x0 - 6)
        .attr("y", d => (d.y1 + d.y0) / 2).attr("dy", "0.35em")
        .attr("text-anchor", d => d.x0 < sankeyWidth / 2 ? "start" : "end")
        .text(d => d.name).style("font-size", "10px");

    // Brush Implementation
    const brush = d3.brush().extent([[0, 0], [sankeyWidth, sankeyHeight]]).on("brush end", (event) => {
        const sel = event.selection;
        if (!sel) { nodeG.style("opacity", 1); sankeyLinksPath.style("opacity", 0.3); } 
        else {
            const [[x0, y0], [x1, y1]] = sel;
            const isSel = d => d.x0 < x1 && d.x1 > x0 && d.y0 < y1 && d.y1 > y0;//This help determine if the node is in the selection area 
            nodeG.style("opacity", d => isSel(d) ? 1 : 0.1);//This part helps us highlight the selected nodes 
            sankeyLinksPath.style("opacity", d => isSel(d.source) || isSel(d.target) ? 0.6 : 0.05);
        }
    });
    svgSankey.append("g").attr("class", "brush").call(brush);
    svgSankey.append("text").attr("x", sankeyWidth / 2).attr("y", -20).attr("text-anchor", "middle")
        .style("font-weight", "bold").text("User Journey Flow (Drag to Highlight)");

}).catch(function(error) {
    console.error("Error loading the CSV file:", error);
});

