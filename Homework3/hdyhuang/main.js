// pokemon visualization dashboard

// canonical pokemon type colors
var typeColorMap = {
	Water: "#6390F0", Normal: "#A8A77A", Grass: "#7AC74C",
	Bug: "#A6B91A", Psychic: "#F95587", Fire: "#EE8130",
	Rock: "#B6A136", Electric: "#F7D02C", Ground: "#E2BF65",
	Poison: "#A33EA1", Dark: "#705746", Fighting: "#C22E28",
	Dragon: "#6F35FC", Ice: "#96D9D6", Ghost: "#735797",
	Steel: "#B7B7CE", Fairy: "#D685AD", Flying: "#A98FF3"
};

// ordinal scale for type colors
var typeColor = d3.scaleOrdinal()
	.domain(Object.keys(typeColorMap))
	.range(Object.values(typeColorMap));

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

	// margins with extra right for legend
	var margin = { top: 40, right: 160, bottom: 50, left: 55 };
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
		.attr("fill", function(d) { return typeColor(d.type1); })
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

	// type color legend (right side)
	var types = Object.keys(typeColorMap);
	var legendG = svg.append("g")
		.attr("transform", "translate(" + (width - 150) + "," + (margin.top + 5) + ")");

	// legend title
	legendG.append("text")
		.attr("x", 0).attr("y", -5)
		.style("font-size", "11px")
		.style("font-weight", "600")
		.style("fill", "#555")
		.text("Pokemon Type");

	// one entry per type
	types.forEach(function(type, i) {
		// colored circle
		legendG.append("circle")
			.attr("cx", 6)
			.attr("cy", i * 16 + 10)
			.attr("r", 5)
			.attr("fill", typeColorMap[type]);

		// type name
		legendG.append("text")
			.attr("x", 16)
			.attr("y", i * 16 + 14)
			.style("font-size", "10px")
			.style("fill", "#555")
			.text(type);
	});
}


// bar chart - pokemon count by type, stacked by generation (overview)
function drawBarChart(data) {

	// get container dimensions
	var container = document.getElementById("bar-chart");
	var width = container.clientWidth;
	var height = container.clientHeight;

	// margins with space for legend on right
	var margin = { top: 40, right: 95, bottom: 70, left: 50 };
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

	// generations 1-6
	var generations = [1, 2, 3, 4, 5, 6];

	// blend white → type color based on generation (gen1 lightest, gen6 full)
	function genTypeColor(type, gen) {
		var base = typeColorMap[type] || "#999";
		var t = 0.25 + (gen - 1) * 0.15;
		return d3.interpolate("#ffffff", base)(t);
	}

	// aggregate total count per type, sorted descending
	var typeCounts = d3.rollups(data,
		function(v) { return v.length; },
		function(d) { return d.type1; }
	);
	typeCounts.sort(function(a, b) { return b[1] - a[1]; });
	var typeNames = typeCounts.map(function(d) { return d[0]; });

	// build cross-tabulation: each type row has gen1..gen6 counts
	var stackData = typeNames.map(function(type) {
		var row = { type: type };
		generations.forEach(function(gen) {
			row["gen" + gen] = data.filter(function(d) {
				return d.type1 === type && d.generation === gen;
			}).length;
		});
		return row;
	});

	// d3 stack layout
	var stackKeys = generations.map(function(gen) { return "gen" + gen; });
	var series = d3.stack().keys(stackKeys)(stackData);

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
		.attr("y", height - 12)
		.attr("text-anchor", "middle")
		.style("font-size", "11px")
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
		.text("Pokemon Count by Type & Generation");

	// draw stacked bars
	series.forEach(function(layer, layerIdx) {
		g.selectAll(".bar-gen" + (layerIdx + 1))
			.data(layer)
			.enter()
			.append("rect")
			.attr("class", "bar")
			.attr("x", function(d, i) { return xScale(typeNames[i]); })
			.attr("y", function(d) { return yScale(d[1]); })
			.attr("width", xScale.bandwidth())
			.attr("height", function(d) { return yScale(d[0]) - yScale(d[1]); })
			.attr("fill", function(d) { return genTypeColor(d.data.type, layerIdx + 1); })
			.attr("cursor", "pointer")
			// tooltip on hover
			.on("mouseover", function(event, d) {
				var count = d[1] - d[0];
				tooltip.style("opacity", 1)
					.html(
						"<strong>" + d.data.type + "</strong><br/>" +
						"Gen " + (layerIdx + 1) + ": " + count + " pokemon"
					);
			})
			.on("mousemove", function(event) {
				tooltip.style("left", (event.pageX + 12) + "px")
					.style("top", (event.pageY - 28) + "px");
			})
			.on("mouseout", function() {
				tooltip.style("opacity", 0);
			});
	});

	// generation legend (merged vertical bar, gen6 top → gen1 bottom)
	var legendG = svg.append("g")
		.attr("transform", "translate(" + (width - 85) + "," + (margin.top + 5) + ")");

	legendG.append("text")
		.attr("x", 0).attr("y", -5)
		.style("font-size", "11px")
		.style("font-weight", "600")
		.style("fill", "#555")
		.text("Generation");

	var segH = 16;
	var reversed = [6, 5, 4, 3, 2, 1];
	reversed.forEach(function(gen, i) {
		var t = 0.25 + (gen - 1) * 0.15;
		// continuous bar segments with no gap
		legendG.append("rect")
			.attr("x", 0)
			.attr("y", i * segH + 5)
			.attr("width", 14)
			.attr("height", segH)
			.attr("fill", d3.interpolate("#ffffff", "#555")(t));

		// label on right
		legendG.append("text")
			.attr("x", 20)
			.attr("y", i * segH + 5 + segH / 2 + 4)
			.style("font-size", "10px")
			.style("fill", "#555")
			.text("Gen " + gen);
	});

	// rounded border around the merged bar
	legendG.append("rect")
		.attr("x", 0).attr("y", 5)
		.attr("width", 14).attr("height", segH * 6)
		.attr("fill", "none")
		.attr("stroke", "#ccc")
		.attr("rx", 3);
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
