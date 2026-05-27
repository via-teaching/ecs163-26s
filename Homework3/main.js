// INTERACTIVE BASEBALL DASHBOARD - Homework 3

const MIN_AB = 50;
const SALARY_SCALE = 1e6;
const TRANSITION_DURATION = 700;
const contextSvg = d3.select("#context-svg");
const overviewSvg = d3.select("#overview-svg");
const focusSvg = d3.select("#focus-svg");

const colorByLeague = d3.scaleOrdinal().domain(["AL", "NL"]).range(["#3498db", "#e74c3c"]);
let selectedPlayers = [];
let allPlayers = [];

function getSvgSize(svg) {
   const rect = svg.node().parentNode.getBoundingClientRect();
   svg.attr("width", rect.width).attr("height", rect.height);
   return { width: rect.width, height: rect.height };
}

function updateContextInfo(count) {
   d3.select("#context-info").text(`Selected: ${count} player${count !== 1 ? 's' : ''}`);
}

function updateFocusInfo(count) {
   if (count === 0) {
     d3.select("#focus-info").text("Select players above to see their performance profiles");
   } else {
     d3.select("#focus-info").text(`Showing ${count} player${count !== 1 ? 's' : ''} — animated performance profiles`);
   }
}

function drawTeamHeatMap(teamSummary) {
   const { width, height } = getSvgSize(overviewSvg);
   const margin = { top: 16, right: 12, bottom: 16, left: 12 };
   const chartWidth = width - margin.left - margin.right;
   const chartHeight = height - margin.top - margin.bottom;

   overviewSvg.selectAll("*").remove();
   const chart = overviewSvg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
   const colorScale = d3.scaleLinear().domain(d3.extent(teamSummary, d => d.avgBattingAvg)).range(["#ecf0f1", "#667eea"]);
   const cellSize = Math.sqrt((chartWidth * chartHeight) / 30) * 0.8;
   const cols = Math.ceil(chartWidth / (cellSize + 2));

   chart.selectAll("rect.heatmap")
     .data(teamSummary).enter() .append("rect").attr("class", "heatmap").attr("x", (d, i) => (i % cols) * (cellSize + 2))
     .attr("y", (d, i) => Math.floor(i / cols) * (cellSize + 2)).attr("width", cellSize).attr("height", cellSize)
     .attr("fill", d => colorScale(d.avgBattingAvg)).attr("stroke", "#bdc3c7").attr("stroke-width", 1).append("title")
     .text(d => `${d.teamID}: ${(d.avgBattingAvg * 100).toFixed(1)}% avg (${d.count} players)`);

   chart.selectAll("text.team-label")
     .data(teamSummary).enter().append("text").attr("class", "team-label")
     .attr("x", (d, i) => (i % cols) * (cellSize + 2) + cellSize / 2)
     .attr("y", (d, i) => Math.floor(i / cols) * (cellSize + 2) + cellSize / 2 + 4).attr("text-anchor", "middle")
     .attr("dominant-baseline", "middle").attr("font-size", "10px").attr("font-weight", "600")
     .attr("fill", d => {
       const avg = d.avgBattingAvg;
       return avg > 0.25 ? "white" : "#2c3e50";
     }).text(d => d.teamID);
}

function drawContext(data) {
   const { width, height } = getSvgSize(contextSvg);
   const margin = { top: 20, right: 20, bottom: 40, left: 50 };
   const chartWidth = width - margin.left - margin.right;
   const chartHeight = height - margin.top - margin.bottom;
   contextSvg.selectAll("*").remove();
   const chart = contextSvg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
   const xScale = d3.scaleLinear().domain(d3.extent(data, d => d.battingAvg)).range([0, chartWidth]);
   const yScale = d3.scaleLinear().domain([0, d3.max(data, d => d.salaryMil)]).range([chartHeight, 0]);
   const radiusScale = d3.scaleSqrt().domain([0, d3.max(data, d => d.SO)]).range([3, 12]);

   chart.append("g").attr("transform", `translate(0, ${chartHeight})`).call(d3.axisBottom(xScale).ticks(6))
     .append("text").attr("x", chartWidth / 2).attr("y", 32) .attr("fill", "#2c3e50").attr("font-size", "12px")
     .attr("text-anchor", "middle").text("Batting Average (H/AB)");

   chart.append("g").call(d3.axisLeft(yScale).ticks(5)).append("text").attr("transform", "rotate(-90)")
     .attr("y", -38).attr("x", -chartHeight / 2).attr("fill", "#2c3e50").attr("font-size", "12px")
     .attr("text-anchor", "middle").text("Salary ($M)");

   const brush = d3.brush().extent([[0, 0], [chartWidth, chartHeight]]).on("end", brushed);
   const brushGroup = chart.append("g").attr("class", "brush-enabled").call(brush);

   function brushed() {
     const selection = d3.event.selection;
     selectedPlayers = [];
     if (selection) {
       const [[x0, y0], [x1, y1]] = selection;
       selectedPlayers = data.filter(d => {
         const x = xScale(d.battingAvg);
         const y = yScale(d.salaryMil);
         return x >= x0 && x <= x1 && y >= y0 && y <= y1;
       });
     }
     updateContextInfo(selectedPlayers.length);
     updateFocusInfo(selectedPlayers.length);
     drawFocusParallel(selectedPlayers);
     chart.selectAll("circle.player").classed("brushed-circle", d => selectedPlayers.includes(d));
   }

   chart.selectAll("circle.player").data(data).enter().append("circle").attr("class", "player")
     .attr("cx", d => xScale(d.battingAvg)).attr("cy", d => yScale(d.salaryMil))
     .attr("r", d => radiusScale(d.SO)).attr("fill", d => colorByLeague(d.lgID))
     .attr("fill-opacity", 0.65).attr("stroke", "#2c3e50").attr("stroke-width", 0.5).append("title")
     .text(d => `${d.nameFirst} ${d.nameLast} (${d.teamID})\nBatting Avg: ${(d.battingAvg).toFixed(3)}\nSalary: $${d.salaryMil.toFixed(2)}M\nStrikeouts: ${d.SO}`);

   const legend = d3.select("#context-legend");
   legend.html("");
   const legendDiv = legend.append("div").attr("class", "legend");
   legendDiv.append("div").attr("class", "legend-item")
     .html(`<span class="legend-swatch" style="background: #3498db;"></span> <span>American League</span>`);
   legendDiv.append("div").attr("class", "legend-item")
     .html(`<span class="legend-swatch" style="background: #e74c3c;"></span> <span>National League</span>`);
   legendDiv.append("div").attr("class", "legend-item").html(`<span>💡 Brush to select, click to clear</span>`);
}

function drawFocusParallel(players) {
   const { width, height } = getSvgSize(focusSvg);
   const margin = { top: 20, right: 20, bottom: 20, left: 40 };
   const chartWidth = width - margin.left - margin.right;
   const chartHeight = height - margin.top - margin.bottom;
   focusSvg.selectAll("*").remove();
   const chart = focusSvg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

   if (players.length === 0) {
     chart.append("text").attr("x", chartWidth / 2).attr("y", chartHeight / 2).attr("text-anchor", "middle")
       .attr("fill", "#95a5a6").attr("font-size", "14px").text("No players selected — use brush to select above");
     return;
   }
   const dimensions = [
     { key: "battingAvg", label: "H/AB", min: 0, max: 0.35 },
     { key: "strikeRate", label: "SO/AB", min: 0, max: 0.7 },
     { key: "HR_rate", label: "HR/AB", min: 0, max: 0.15 },
     { key: "BB_rate", label: "BB/AB", min: 0, max: 0.35 },
     { key: "salaryMil", label: "Salary ($M)", min: 0, max: 35 }
   ];

   const x = d3.scalePoint().domain(dimensions.map(d => d.key)).range([0, chartWidth]).padding(0.5);
   const yScales = {};
   dimensions.forEach(dim => {
     yScales[dim.key] = d3.scaleLinear().domain([dim.min, dim.max]).range([chartHeight, 0]);
   });

   const lines = chart.selectAll("path.player-line").data(players, (d, i) => i);
   lines.exit().transition().duration(TRANSITION_DURATION).attr("stroke-opacity", 0).remove();
   lines.attr("stroke-opacity", 0.5);
 
   lines.enter() .append("path").attr("class", "player-line").attr("d", d => {
       const path = d3.line().x(([key]) => x(key)).y(([key]) => yScales[key](d[key] || 0));
       return path(dimensions.map(dim => [dim.key, d[dim.key] || 0]));
     })
     .attr("fill", "none").attr("stroke", d => colorByLeague(d.lgID)).attr("stroke-width", 2)
     .attr("stroke-opacity", 0).transition().duration(TRANSITION_DURATION)
     .attr("stroke-opacity", 0.5).on("mouseover", function() {
       d3.select(this).attr("stroke-opacity", 1).attr("stroke-width", 3);
     }).on("mouseout", function() {
       d3.select(this).attr("stroke-opacity", 0.5).attr("stroke-width", 2);
     }).append("title").text(d => `${d.nameFirst} ${d.nameLast} (${d.teamID})`);

   const axisGroup = chart.selectAll("g.axis").data(dimensions).enter().append("g")
     .attr("class", "axis").attr("transform", d => `translate(${x(d.key)}, 0)`);

   axisGroup.append("g").call(d => d3.axisLeft(yScales[d.key]).ticks(4).tickFormat(d3.format(".2f"))(d));
   axisGroup.append("text").attr("y", -8).attr("text-anchor", "middle").attr("fill", "#2c3e50")
     .attr("font-size", "11px").attr("font-weight", "600").text(d => d.label);

   const legend = d3.select("#focus-legend");
   legend.html("");
   const legendDiv = legend.append("div").attr("class", "legend");
   legendDiv.append("div").attr("class", "legend-item")
     .html(`<span class="legend-swatch" style="background: #3498db;"></span> <span>American League</span>`);
   legendDiv.append("div").attr("class", "legend-item")
    .html(`<span class="legend-swatch" style="background: #e74c3c;"></span> <span>National League</span>`);
}

function render() {
   d3.csv("players.csv").then(rawData => {
     rawData.forEach(d => {
       d.AB = +d.AB;
       d.H = +d.H;
       d.SO = +d.SO;
       d.HR = +d.HR;
       d.BB = +d.BB;
       d.salary = +d.salary;
     });

     allPlayers = rawData
       .filter(d => d.AB >= MIN_AB && d.salary > 0)
       .map(d => ({
         ...d,
         battingAvg: d.H / d.AB,
         strikeRate: d.SO / d.AB,
         HR_rate: d.HR / d.AB,
         BB_rate: d.BB / d.AB,
         salaryMil: d.salary / SALARY_SCALE
       }));

     const teamSummary = d3.nest()
       .key(d => d.teamID)
       .entries(allPlayers)
       .map(g => ({
         teamID: g.key,
         avgBattingAvg: d3.mean(g.values, d => d.battingAvg),
         count: g.values.length,
         lgID: g.values[0].lgID
       })).sort((a, b) => d3.descending(a.avgBattingAvg, b.avgBattingAvg));

     drawTeamHeatMap(teamSummary);
     drawContext(allPlayers);
     updateFocusInfo(0);
   }).catch(error => console.error("Data load error:", error));
}

render();
window.addEventListener("resize", render);
