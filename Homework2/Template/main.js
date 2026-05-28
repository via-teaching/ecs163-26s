const minAB = 50;
const salaryScaleFactor = 1e6;

const focusSvg = d3.select("#focus-svg");
const overviewSvg = d3.select("#overview-svg");
const scatterSvg = d3.select("#scatter-svg");
const focusLegend = d3.select("#focus-legend");
const overviewLegend = d3.select("#overview-legend");
const scatterLegend = d3.select("#scatter-legend");

const colorByLeague = d3.scaleOrdinal().domain(["AL", "NL"]).range(["#377eb8", "#e41a1c"]);

function resizeChart(svg) {
   const rect = svg.node().parentNode.getBoundingClientRect();
   svg.attr("width", rect.width).attr("height", rect.height);
   return { width: rect.width, height: rect.height };
}

function createLegend(container, items) {
   container.html("");
   const row = container.append("div");
   items.forEach(item => {
     const entry = row.append("div").attr("class", "legend-item");
     if (item.shape === "square") {
       entry.append("span").attr("class", "legend-swatch").style("background", item.color);
     } else if (item.shape === "circle") {
       entry.append("span").attr("class", "legend-size").style("width", `${item.size}px`).style("height", `${item.size}px`).style("opacity", 0.9);
     }
     entry.append("span").text(item.label);
   });
}

function formatPct(value) {
   return d3.format(".2f")(value);
}

function drawOverview(teamSummary) {
   const { width, height } = resizeChart(overviewSvg);
   const margin = { top: 24, right: 8, bottom: 50, left: 60 };
   const chartWidth = width - margin.left - margin.right;
   const chartHeight = height - margin.top - margin.bottom;

   overviewSvg.selectAll("*").remove();
   const chart = overviewSvg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

   const x = d3.scaleBand().domain(teamSummary.map(d => d.teamID)).range([0, chartWidth]).padding(0.14);

   const y = d3.scaleLinear().domain([0, d3.max(teamSummary, d => d.avgBattingAvg) * 1.08]).range([chartHeight, 0]).nice();

   chart.append("g")
     .attr("transform", `translate(0, ${chartHeight})`).call(d3.axisBottom(x)).selectAll("text")
     .attr("transform", "rotate(-40)").attr("text-anchor", "end").attr("dx", "-0.05em").attr("dy", "0.15em");

   chart.append("g")
     .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(".2f")));

   chart.selectAll("rect.bar")
     .data(teamSummary).enter().append("rect").attr("class", "bar").attr("x", d => x(d.teamID))
     .attr("y", d => y(d.avgBattingAvg)).attr("width", x.bandwidth()).attr("height", d => chartHeight - y(d.avgBattingAvg))
     .attr("fill", d => colorByLeague(d.lgID)).attr("rx", 4).attr("ry", 4)
     .append("title").text(d => `${d.teamID}: ${formatPct(d.avgBattingAvg)} average across ${d.count} players`);

   chart.append("text")
     .attr("x", chartWidth / 2).attr("y", chartHeight + 44).attr("text-anchor", "middle").attr("fill", "#2c3542")
     .attr("font-size", "13px").text("Team");

   chart.append("text")
     .attr("x", -chartHeight / 2).attr("y", -44).attr("text-anchor", "middle").attr("transform", "rotate(-90)")
     .attr("fill", "#2c3542").attr("font-size", "13px").text("Average H/AB");

   createLegend(overviewLegend, [
     { label: "American League (AL)", color: colorByLeague("AL"), shape: "square" },
     { label: "National League (NL)", color: colorByLeague("NL"), shape: "square" }
   ]);
}

function drawScatter(data) {
   const { width, height } = resizeChart(scatterSvg);
   const margin = { top: 24, right: 14, bottom: 50, left: 60 };
   const chartWidth = width - margin.left - margin.right;
   const chartHeight = height - margin.top - margin.bottom;

   scatterSvg.selectAll("*").remove();
   const chart = scatterSvg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

   const x = d3.scaleLinear()
     .domain([d3.min(data, d => d.battingAvg) * 0.98, d3.max(data, d => d.battingAvg) * 1.02])
    .range([0, chartWidth]);

   const y = d3.scaleLinear().domain([0, d3.max(data, d => d.strikeRate) * 1.05]).range([chartHeight, 0]);

   const radius = d3.scaleSqrt().domain(d3.extent(data, d => d.salaryMil)).range([4, 14]);

   chart.append("g").attr("transform", `translate(0, ${chartHeight})`)
     .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format(".2f")));

   chart.append("g").call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(".2f")));

   chart.selectAll("circle")
     .data(data).enter().append("circle").attr("cx", d => x(d.battingAvg)).attr("cy", d => y(d.strikeRate))
     .attr("r", d => radius(d.salaryMil)).attr("fill", d => colorByLeague(d.lgID)).attr("fill-opacity", 0.64)
     .attr("stroke", "#2b2f39").attr("stroke-width", 0.4).append("title")
     .text(d => `${d.nameFirst} ${d.nameLast} (${d.teamID})\nH/AB: ${formatPct(d.battingAvg)}, SO/AB: ${formatPct(d.strikeRate)}, Salary: $${d.salaryMil.toFixed(2)}M`);

   chart.append("text")
     .attr("x", chartWidth / 2).attr("y", chartHeight + 44).attr("text-anchor", "middle").attr("fill", "#2c3542")
     .attr("font-size", "13px").text("H/AB (Batting Average)");

   chart.append("text")
     .attr("x", -chartHeight / 2).attr("y", -44).attr("text-anchor", "middle").attr("transform", "rotate(-90)")
     .attr("fill", "#2c3542").attr("font-size", "13px").text("SO/AB (Strikeout Rate)");

   createLegend(scatterLegend, [
     { label: "American League (AL)", color: colorByLeague("AL"), shape: "square" },
     { label: "National League (NL)", color: colorByLeague("NL"), shape: "square" },
     { label: "Higher salary", shape: "circle", size: 14 },
     { label: "Lower salary", shape: "circle", size: 4 }
   ]);
}

function drawParallelCoordinates(data) {
   const { width, height } = resizeChart(focusSvg);
   const margin = { top: 28, right: 28, bottom: 24, left: 28 };
   const chartWidth = width - margin.left - margin.right;
   const chartHeight = height - margin.top - margin.bottom;

   focusSvg.selectAll("*").remove();
   const chart = focusSvg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

   const dimensions = [
     { key: "battingAvg", label: "H/AB" },
     { key: "strikeRate", label: "SO/AB" },
     { key: "HR_rate", label: "HR/AB" },
     { key: "BB_rate", label: "BB/AB" },
     { key: "salaryMil", label: "Salary ($M)" }
   ];

   const x = d3.scalePoint().domain(dimensions.map(d => d.key)).range([0, chartWidth]).padding(0.5);

   const yScales = {};
   dimensions.forEach(dimension => {
     yScales[dimension.key] = d3.scaleLinear().domain(d3.extent(data, record => record[dimension.key]))
       .range([chartHeight, 0]).nice();
   });

   function lineForPlayer(player) {
     return d3.line()
       .x(([key]) => x(key)).y(([key]) => yScales[key](player[key]))(dimensions.map(dim => [dim.key, player[dim.key]]));
   }

   chart.selectAll("path.player-line")
     .data(data).enter().append("path").attr("class", "player-line").attr("d", d => lineForPlayer(d))
     .attr("fill", "none").attr("stroke", d => colorByLeague(d.lgID)).attr("stroke-opacity", 0.16)
     .attr("stroke-width", 1.2).on("mouseover", function() {
       d3.select(this).raise().attr("stroke-opacity", 0.9).attr("stroke-width", 2);
     })
     .on("mouseout", function() {
       d3.select(this).attr("stroke-opacity", 0.16).attr("stroke-width", 1.2);
     });

   chart.selectAll("g.axis")
     .data(dimensions).enter().append("g").attr("class", "axis").attr("transform", d => `translate(${x(d.key)},0)`)
     .each(function(dimension) {
       const axis = d3.axisLeft(yScales[dimension.key]).ticks(5).tickFormat(d3.format(".2f"));
       d3.select(this).call(axis);
       d3.select(this).append("text").attr("y", -14).attr("text-anchor", "middle").attr("fill", "#2c3542")
         .attr("font-size", "12px").text(dimension.label);
     });

   chart.append("text")
     .attr("x", chartWidth / 2).attr("y", chartHeight + 42).attr("text-anchor", "middle")
     .attr("fill", "#2c3542").attr("font-size", "13px").text("Multivariate dimensions for selected players");

   createLegend(focusLegend, [
     { label: "American League (AL)", color: colorByLeague("AL"), shape: "square" },
     { label: "National League (NL)", color: colorByLeague("NL"), shape: "square" }
   ]);
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

     const players = rawData
       .filter(d => d.AB >= minAB && d.salary > 0)
       .map(d => ({
         ...d,
         battingAvg: d.H / d.AB,
         strikeRate: d.SO / d.AB,
         HR_rate: d.HR / d.AB,
         BB_rate: d.BB / d.AB,
         salaryMil: d.salary / salaryScaleFactor
       }));

     const teamSummary = d3.nest().key(d => d.teamID).entries(players).map(group => ({
         teamID: group.key, avgBattingAvg: d3.mean(group.values, d => d.battingAvg),
         count: group.values.length,lgID: group.values[0].lgID
       }))
       .sort((a, b) => d3.descending(a.avgBattingAvg, b.avgBattingAvg));
 
     drawOverview(teamSummary);
     drawScatter(players);
     drawParallelCoordinates(players);
   }).catch(error => console.error(error));
}

render();
window.addEventListener("resize", render);
