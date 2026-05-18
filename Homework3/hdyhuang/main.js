// pokemon visualization dashboard

// shared tooltip
var tooltip = d3.select("body")
	.append("div")
	.attr("class", "tooltip");

// load csv and draw all views
d3.csv("data/pokemon_alopez247.csv").then(function(rawData) {

	// parse numeric fields
	var data = rawData.map(function(d, i) {
		return {
			index: i,
			name: d.Name,
			type1: d.Type_1,
			type2: d.Type_2 || "",
			total: +d.Total,
			hp: +d.HP,
			attack: +d.Attack,
			defense: +d.Defense,
			spAtk: +d.Sp_Atk,
			spDef: +d.Sp_Def,
			speed: +d.Speed,
			generation: +d.Generation,
			isLegendary: d.isLegendary === "True"
		};
	});

	drawScatterPlot(data);
	drawBarChart(data);
	drawRadarChart(data);
});


// scatter plot - attack vs defense
function drawScatterPlot(data) {

	// get container dimensions
	var container = document.getElementById("scatter-plot");
	var width = container.clientWidth;
	var height = container.clientHeight;

	// margins
	var margin = { top: 40, right: 30, bottom: 50, left: 55 };
	var innerW = width - margin.left - margin.right;
	var innerH = height - margin.top - margin.bottom;

	// create svg
	var svg = d3.select("#scatter-plot")
		.append("svg")
		.attr("width", width)
		.attr("height", height);

	// offset group
	var g = svg.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// x scale for attack
	var xScale = d3.scaleLinear()
		.domain([0, d3.max(data, function(d) { return d.attack; }) + 10])
		.range([0, innerW]);

	// y scale for defense
	var yScale = d3.scaleLinear()
		.domain([0, d3.max(data, function(d) { return d.defense; }) + 10])
		.range([innerH, 0]);

	// draw x axis
	g.append("g")
		.attr("class", "axis")
		.attr("transform", "translate(0," + innerH + ")")
		.call(d3.axisBottom(xScale).ticks(8));

	// draw y axis
	g.append("g")
		.attr("class", "axis")
		.call(d3.axisLeft(yScale).ticks(8));

	// x axis label
	svg.append("text")
		.attr("x", margin.left + innerW / 2)
		.attr("y", height - 8)
		.attr("text-anchor", "middle")
		.style("font-size", "13px")
		.style("fill", "#555")
		.text("Attack");

	// y axis label
	svg.append("text")
		.attr("transform", "rotate(-90)")
		.attr("x", -(margin.top + innerH / 2))
		.attr("y", 14)
		.attr("text-anchor", "middle")
		.style("font-size", "13px")
		.style("fill", "#555")
		.text("Defense");

	// chart title
	svg.append("text")
		.attr("class", "chart-title")
		.attr("x", margin.left + innerW / 2)
		.attr("y", 22)
		.attr("text-anchor", "middle")
		.text("Attack vs Defense");

	// draw scatter dots with default steelblue color
	g.selectAll(".dot")
		.data(data)
		.enter()
		.append("circle")
		.attr("class", "dot")
		.attr("cx", function(d) { return xScale(d.attack); })
		.attr("cy", function(d) { return yScale(d.defense); })
		.attr("r", 4)
		.attr("fill", "steelblue")
		.attr("opacity", 0.6)
		.attr("stroke", "#fff")
		.attr("stroke-width", 0.5)
		// tooltip on hover
		.on("mouseover", function(event, d) {
			tooltip.style("opacity", 1)
				.html(
					"<strong>" + d.name + "</strong><br/>" +
					"Type: " + d.type1 + (d.type2 ? " / " + d.type2 : "") + "<br/>" +
					"Attack: " + d.attack + " | Defense: " + d.defense
				);
		})
		.on("mousemove", function(event) {
			tooltip.style("left", (event.pageX + 12) + "px")
				.style("top", (event.pageY - 28) + "px");
		})
		.on("mouseout", function() {
			tooltip.style("opacity", 0);
		});
}


// bar chart - pokemon count by type (overview)
// x = Type_1, y = count, fill = avg Total stat (sequential color)
function drawBarChart(data) {

	// get container dimensions
	var container = document.getElementById("bar-chart");
	var width = container.clientWidth;
	var height = container.clientHeight;

	// margins with extra bottom for rotated labels
	var margin = { top: 40, right: 20, bottom: 70, left: 50 };
	var innerW = width - margin.left - margin.right;
	var innerH = height - margin.top - margin.bottom;

	// create svg
	var svg = d3.select("#bar-chart")
		.append("svg")
		.attr("width", width)
		.attr("height", height);

	// offset group
	var g = svg.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// aggregate count per type, sorted descending
	var typeCounts = d3.rollups(data,
		function(v) { return v.length; },
		function(d) { return d.type1; }
	);
	typeCounts.sort(function(a, b) { return b[1] - a[1]; });

	// aggregate average Total per type for color encoding
	var typeAvgTotal = d3.rollups(data,
		function(v) { return d3.mean(v, function(d) { return d.total; }); },
		function(d) { return d.type1; }
	);
	var avgTotalMap = {};
	typeAvgTotal.forEach(function(d) { avgTotalMap[d[0]] = d[1]; });

	// sorted type names
	var typeNames = typeCounts.map(function(d) { return d[0]; });

	// x scale - band for types
	var xScale = d3.scaleBand()
		.domain(typeNames)
		.range([0, innerW])
		.padding(0.15);

	// y scale - linear for count
	var yScale = d3.scaleLinear()
		.domain([0, d3.max(typeCounts, function(d) { return d[1]; })])
		.nice()
		.range([innerH, 0]);

	// color scale - sequential for avg Total
	var avgValues = Object.values(avgTotalMap);
	var colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
		.domain([d3.min(avgValues), d3.max(avgValues)]);

	// draw x axis with rotated labels
	g.append("g")
		.attr("class", "axis")
		.attr("transform", "translate(0," + innerH + ")")
		.call(d3.axisBottom(xScale))
		.selectAll("text")
		.attr("transform", "rotate(-40)")
		.style("text-anchor", "end")
		.style("font-size", "10px");

	// draw y axis
	g.append("g")
		.attr("class", "axis")
		.call(d3.axisLeft(yScale).ticks(6));

	// x axis label
	svg.append("text")
		.attr("x", margin.left + innerW / 2)
		.attr("y", height - 5)
		.attr("text-anchor", "middle")
		.style("font-size", "12px")
		.style("fill", "#555")
		.text("Pokemon Type");

	// y axis label
	svg.append("text")
		.attr("transform", "rotate(-90)")
		.attr("x", -(margin.top + innerH / 2))
		.attr("y", 14)
		.attr("text-anchor", "middle")
		.style("font-size", "12px")
		.style("fill", "#555")
		.text("Count");

	// chart title
	svg.append("text")
		.attr("class", "chart-title")
		.attr("x", margin.left + innerW / 2)
		.attr("y", 22)
		.attr("text-anchor", "middle")
		.text("Pokemon Count by Type (color = avg Total)");

	// draw bars
	g.selectAll(".bar")
		.data(typeCounts)
		.enter()
		.append("rect")
		.attr("class", "bar")
		.attr("x", function(d) { return xScale(d[0]); })
		.attr("y", function(d) { return yScale(d[1]); })
		.attr("width", xScale.bandwidth())
		.attr("height", function(d) { return innerH - yScale(d[1]); })
		.attr("fill", function(d) { return colorScale(avgTotalMap[d[0]]); })
		.attr("rx", 2)
		.attr("cursor", "pointer")
		// tooltip on hover
		.on("mouseover", function(event, d) {
			tooltip.style("opacity", 1)
				.html(
					"<strong>" + d[0] + "</strong><br/>" +
					"Count: " + d[1] + "<br/>" +
					"Avg Total: " + avgTotalMap[d[0]].toFixed(0)
				);
		})
		.on("mousemove", function(event) {
			tooltip.style("left", (event.pageX + 12) + "px")
				.style("top", (event.pageY - 28) + "px");
		})
		.on("mouseout", function() {
			tooltip.style("opacity", 0);
		});

	// color legend (gradient bar for avg Total)
	var legendW = 120;
	var legendH = 10;
	var legendX = innerW - legendW;
	var legendY = -25;

	// gradient definition
	var defs = svg.append("defs");
	var linearGrad = defs.append("linearGradient")
		.attr("id", "bar-legend-grad");
	linearGrad.append("stop")
		.attr("offset", "0%")
		.attr("stop-color", colorScale(d3.min(avgValues)));
	linearGrad.append("stop")
		.attr("offset", "100%")
		.attr("stop-color", colorScale(d3.max(avgValues)));

	// legend group
	var legendG = g.append("g")
		.attr("transform", "translate(" + legendX + "," + legendY + ")");

	// gradient rect
	legendG.append("rect")
		.attr("width", legendW)
		.attr("height", legendH)
		.attr("fill", "url(#bar-legend-grad)")
		.attr("rx", 2);

	// min label
	legendG.append("text")
		.attr("x", 0).attr("y", legendH + 12)
		.style("font-size", "9px").style("fill", "#555")
		.text(d3.min(avgValues).toFixed(0));

	// max label
	legendG.append("text")
		.attr("x", legendW).attr("y", legendH + 12)
		.attr("text-anchor", "end")
		.style("font-size", "9px").style("fill", "#555")
		.text(d3.max(avgValues).toFixed(0));

	// legend title
	legendG.append("text")
		.attr("x", legendW / 2).attr("y", -3)
		.attr("text-anchor", "middle")
		.style("font-size", "9px").style("fill", "#555")
		.text("Avg Total Stat");
}


// radar chart - average stats (advanced)
// 6 axes: HP, Attack, Defense, Sp Atk, Sp Def, Speed
// shows average polygon of all pokemon
function drawRadarChart(data) {

	// get container dimensions
	var container = document.getElementById("radar-chart");
	var width = container.clientWidth;
	var height = container.clientHeight;

	// create svg
	var svg = d3.select("#radar-chart")
		.append("svg")
		.attr("width", width)
		.attr("height", height);

	// chart title
	svg.append("text")
		.attr("class", "chart-title")
		.attr("x", width / 2)
		.attr("y", 22)
		.attr("text-anchor", "middle")
		.text("Average Stats Radar");

	// radar config
	var statKeys = ["hp", "attack", "defense", "spAtk", "spDef", "speed"];
	var statLabels = ["HP", "Attack", "Defense", "Sp Atk", "Sp Def", "Speed"];
	var numAxes = 6;
	var angleSlice = (2 * Math.PI) / numAxes;

	// radar dimensions
	var radius = Math.min(width, height - 60) / 2 - 40;
	var centerX = width / 2;
	var centerY = height / 2 + 10;

	// radial scale
	var rScale = d3.scaleLinear()
		.domain([0, 160])
		.range([0, radius]);

	// center group
	var radarG = svg.append("g")
		.attr("transform", "translate(" + centerX + "," + centerY + ")");

	// concentric grid circles
	var levels = [40, 80, 120, 160];
	levels.forEach(function(lev) {
		radarG.append("circle")
			.attr("r", rScale(lev))
			.attr("fill", "none")
			.attr("stroke", "#ddd")
			.attr("stroke-dasharray", "3,3");

		radarG.append("text")
			.attr("x", 4).attr("y", -rScale(lev))
			.style("font-size", "9px").style("fill", "#aaa")
			.text(lev);
	});

	// axis lines and labels
	statLabels.forEach(function(label, i) {
		var angle = angleSlice * i - Math.PI / 2;
		var xEnd = rScale(160) * Math.cos(angle);
		var yEnd = rScale(160) * Math.sin(angle);

		// axis line
		radarG.append("line")
			.attr("x1", 0).attr("y1", 0)
			.attr("x2", xEnd).attr("y2", yEnd)
			.attr("stroke", "#ccc");

		// axis label
		radarG.append("text")
			.attr("x", (rScale(160) + 18) * Math.cos(angle))
			.attr("y", (rScale(160) + 18) * Math.sin(angle))
			.attr("text-anchor", "middle")
			.attr("dominant-baseline", "middle")
			.style("font-size", "12px")
			.style("font-weight", "600")
			.style("fill", "#555")
			.text(label);
	});

	// radar line generator
	var radarLine = d3.lineRadial()
		.radius(function(d) { return rScale(d.value); })
		.angle(function(d, i) { return i * angleSlice; })
		.curve(d3.curveLinearClosed);

	// compute average stats across all pokemon
	var avgStats = statKeys.map(function(key) {
		return { axis: key, value: d3.mean(data, function(d) { return d[key]; }) };
	});

	// draw filled radar polygon
	radarG.append("path")
		.datum(avgStats)
		.attr("d", radarLine)
		.attr("fill", "steelblue")
		.attr("fill-opacity", 0.25)
		.attr("stroke", "steelblue")
		.attr("stroke-width", 2);

	// vertex dots on each axis
	radarG.selectAll(".radar-dot")
		.data(avgStats)
		.enter()
		.append("circle")
		.attr("class", "radar-dot")
		.attr("cx", function(d, i) { return rScale(d.value) * Math.cos(angleSlice * i - Math.PI / 2); })
		.attr("cy", function(d, i) { return rScale(d.value) * Math.sin(angleSlice * i - Math.PI / 2); })
		.attr("r", 4)
		.attr("fill", "steelblue");

	// value labels at each vertex
	radarG.selectAll(".radar-val")
		.data(avgStats)
		.enter()
		.append("text")
		.attr("class", "radar-val")
		.attr("x", function(d, i) { return (rScale(d.value) + 12) * Math.cos(angleSlice * i - Math.PI / 2); })
		.attr("y", function(d, i) { return (rScale(d.value) + 12) * Math.sin(angleSlice * i - Math.PI / 2); })
		.attr("text-anchor", "middle")
		.attr("dominant-baseline", "middle")
		.style("font-size", "10px")
		.style("fill", "#333")
		.text(function(d) { return d.value.toFixed(0); });

	// info text
	svg.append("text")
		.attr("x", centerX)
		.attr("y", height - 10)
		.attr("text-anchor", "middle")
		.style("font-size", "12px")
		.style("fill", "#888")
		.text("All " + data.length + " Pokemon (average)");
}
