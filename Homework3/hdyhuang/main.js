// pokémon visualization dashboard

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

// selection and brush state
var selectedType = null;
var selectedGen = null;
var selectedPokemon = null;
var allData = null;
var brushedData = null;
var scatterBrush = null;
var scatterBrushG = null;

// load csv and draw all views
d3.csv("data/pokemon_alopez247.csv").then(function(rawData) {

	// parse numeric fields
	var data = rawData.map(function(d, i) {
		return {
			name: d.Name,
			type1: d.Type_1,
			type2: d.Type_2 || "",
			hp: +d.HP,
			attack: +d.Attack,
			defense: +d.Defense,
			spAtk: +d.Sp_Atk,
			spDef: +d.Sp_Def,
			speed: +d.Speed,
			generation: +d.Generation
		};
	});

	allData = data;
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

	// create svg (click empty space to reset)
	var svg = d3.select("#scatter-plot")
		.append("svg")
		.attr("width", width)
		.attr("height", height)
		.on("click", function() { resetAll(); });

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

	// chart title with static hint
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
		// tooltip on hover (white card with shadow)
		.on("mouseover", function(event, d) {
			// skip faded dots (filtered by type, gen, or outside brush)
			if (selectedType && d.type1 !== selectedType) return;
			if (selectedGen && d.generation !== selectedGen) return;
			if (brushedData && brushedData.indexOf(d) === -1) return;
			var typeStr = d.type1 + (d.type2 ? " / " + d.type2 : "");
			var color = typeColorMap[d.type1] || "#333";
			tooltip.style("opacity", 1)
				.html(
					'<div style="font-size:15px;font-weight:700;color:' + color + '">' + d.name + '</div>' +
					'<div style="font-size:12px;color:' + color + '">' + typeStr + '</div>' +
					'<div style="font-size:12px;color:#555">Gen ' + d.generation + '</div>' +
					'<div style="font-size:12px;color:#555">Attack: ' + d.attack + ' · Defense: ' + d.defense + '</div>'
				);
		})
		.on("mousemove", function(event) {
			tooltip.style("left", (event.pageX + 12) + "px")
				.style("top", (event.pageY - 28) + "px");
		})
		.on("mouseout", function() {
			tooltip.style("opacity", 0);
		})
		// click dot to show individual pokemon on radar (only if not filtered out)
		.on("click", function(event, d) {
			event.stopPropagation();
			if (selectedType && d.type1 !== selectedType) return;
			if (selectedGen && d.generation !== selectedGen) return;
			if (brushedData && brushedData.indexOf(d) === -1) return;
			selectedPokemon = (selectedPokemon && selectedPokemon.name === d.name) ? null : d;
			updateRadar(d3.transition().duration(400));
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
			.style("font-size", "12px")
			.style("fill", "#555")
			.text(type);
	});

	// d3 brush for rectangular selection on scatter
	scatterBrush = d3.brush();
	var brush = scatterBrush
		.extent([[0, 0], [innerW, innerH]])
		.on("brush", function(event) {
			if (!event.selection) return;
			selectedPokemon = null;
			var [[x0, y0], [x1, y1]] = event.selection;

			// highlight dots inside brush, respect type and gen filter
			d3.selectAll(".dot")
				.attr("opacity", function(d) {
					var cx = xScale(d.attack);
					var cy = yScale(d.defense);
					var inBrush = cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
					var inFilter = (!selectedType || d.type1 === selectedType)
						&& (!selectedGen || d.generation === selectedGen);
					return (inBrush && inFilter) ? 0.85 : 0.06;
				})
				.attr("r", function(d) {
					var cx = xScale(d.attack);
					var cy = yScale(d.defense);
					var inBrush = cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
					var inFilter = (!selectedType || d.type1 === selectedType)
						&& (!selectedGen || d.generation === selectedGen);
					return (inBrush && inFilter) ? 5 : 3;
				});
		})
		.on("end", function(event) {
			selectedPokemon = null;
			if (!event.selection) {
				// brush cleared, revert to selection state
				brushedData = null;
				updateSelection();
				return;
			}
			var [[x0, y0], [x1, y1]] = event.selection;

			// collect dots inside brush (respect type and gen filter)
			brushedData = allData.filter(function(d) {
				var cx = xScale(d.attack);
				var cy = yScale(d.defense);
				var inBrush = cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
				var inFilter = (!selectedType || d.type1 === selectedType)
					&& (!selectedGen || d.generation === selectedGen);
				return inBrush && inFilter;
			});

			// update radar with brushed subset
			updateRadar(d3.transition().duration(400));
		});

	scatterBrushG = g.append("g")
		.attr("class", "brush")
		.call(brush);

	// raise dots above brush overlay so hover/tooltip still works
	g.selectAll(".dot").raise();
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

	// create svg (click empty space to reset)
	var svg = d3.select("#bar-chart")
		.append("svg")
		.attr("width", width)
		.attr("height", height)
		.on("click", function() { resetAll(); });

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
		.style("font-size", "12px");

	// draw y axis (keep reference for rescaling)
	var yAxisG = g.append("g")
		.attr("class", "axis bar-y-axis")
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

	// draw stacked bars, tag each rect with its generation
	series.forEach(function(layer, layerIdx) {
		var gen = layerIdx + 1;
		layer.forEach(function(d) { d.gen = gen; });

		g.selectAll(".bar-gen" + gen)
			.data(layer)
			.enter()
			.append("rect")
			.attr("class", "bar")
			.attr("x", function(d, i) { return xScale(typeNames[i]); })
			.attr("y", function(d) { return yScale(d[1]); })
			.attr("width", xScale.bandwidth())
			.attr("height", function(d) { return yScale(d[0]) - yScale(d[1]); })
			.attr("fill", function(d) { return genTypeColor(d.data.type, gen); })
			.attr("cursor", "pointer")
			// tooltip on hover
			.on("mouseover", function(event, d) {
				var count = d[1] - d[0];
				tooltip.style("opacity", 1)
					.html(
						"<strong>" + d.data.type + "</strong><br/>" +
						"Gen " + d.gen + ": " + count + " pokemon"
					);
			})
			.on("mousemove", function(event) {
				tooltip.style("left", (event.pageX + 12) + "px")
					.style("top", (event.pageY - 28) + "px");
			})
			.on("mouseout", function() {
				tooltip.style("opacity", 0);
			})
			// click: first click selects type, second click selects generation
			.on("click", function(event, d) {
				event.stopPropagation();
				var clickedType = d.data.type;
				var clickedGen = d.gen;

				if (selectedType === clickedType) {
					// same type: toggle generation drill-down
					selectedGen = (selectedGen === clickedGen) ? null : clickedGen;
				} else {
					// new type: select it, reset gen
					selectedType = clickedType;
					selectedGen = null;
				}

				selectedPokemon = null;
				brushedData = null;
				if (scatterBrushG && scatterBrush) scatterBrushG.call(scatterBrush.move, null);
				updateSelection();
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
			.style("font-size", "12px")
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

	// store bar config for dynamic y-axis rescaling
	window.barCfg = {
		yScale: yScale,
		yAxisG: yAxisG,
		typeCounts: typeCounts
	};
}


// radar chart - average stats (advanced)
// 6 axes: HP, Attack, Defense, Sp Atk, Sp Def, Speed
// shows average polygon of all pokemon
function drawRadarChart(data) {

	// get container dimensions
	var container = document.getElementById("radar-chart");
	var width = container.clientWidth;
	var height = container.clientHeight;

	// create svg (click empty space to reset)
	var svg = d3.select("#radar-chart")
		.append("svg")
		.attr("width", width)
		.attr("height", height)
		.on("click", function() { resetAll(); });

	// title top-left (two lines: small label + big dynamic name)
	svg.append("text")
		.attr("class", "chart-title")
		.attr("x", 12)
		.attr("y", 20)
		.attr("text-anchor", "start")
		.style("font-size", "13px")
		.style("fill", "#888")
		.text("Stats");

	// dynamic subtitle (bigger, bold, colored)
	svg.append("text")
		.attr("class", "radar-info")
		.attr("x", 12)
		.attr("y", 40)
		.attr("text-anchor", "start")
		.style("font-size", "17px")
		.style("font-weight", "700")
		.style("fill", "steelblue")
		.text("All " + data.length + " Pokemon");

	// radar config
	var statKeys = ["hp", "attack", "defense", "spAtk", "spDef", "speed"];
	var statLabels = ["HP", "Attack", "Defense", "Sp Atk", "Sp Def", "Speed"];
	var angleSlice = (2 * Math.PI) / statKeys.length;

	// radar dimensions - shifted to right half
	var radarSize = Math.min(width * 0.55, height - 30);
	var radius = radarSize / 2 - 40;
	var centerX = width * 0.57;
	var centerY = height / 2 + 5;

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
		.attr("class", "radar-polygon")
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

	// store radar config for dynamic updates
	window.radarCfg = {
		radarG: radarG,
		radarLine: radarLine,
		rScale: rScale,
		angleSlice: angleSlice,
		statKeys: statKeys
	};
}


// selection update: animate scatter, bar, and radar
function updateSelection() {
	var t = d3.transition().duration(400);

	// scatter dots: respect both selectedType and selectedGen
	d3.selectAll(".dot")
		.transition(t)
		.attr("opacity", function(d) {
			if (!selectedType) return 0.6;
			if (d.type1 !== selectedType) return 0.06;
			if (selectedGen && d.generation !== selectedGen) return 0.1;
			return 0.85;
		})
		.attr("r", function(d) {
			if (!selectedType) return 4;
			if (d.type1 !== selectedType) return 3;
			if (selectedGen && d.generation !== selectedGen) return 3;
			return 5;
		});

	// bar chart: rescale y-axis to selected type, highlight gen
	if (window.barCfg) {
		var bCfg = window.barCfg;
		var newMax;
		if (selectedType) {
			// find count for selected type and rescale y to 100%
			var typeEntry = bCfg.typeCounts.find(function(tc) { return tc[0] === selectedType; });
			newMax = typeEntry ? typeEntry[1] : d3.max(bCfg.typeCounts, function(d) { return d[1]; });
		} else {
			newMax = d3.max(bCfg.typeCounts, function(d) { return d[1]; });
		}
		bCfg.yScale.domain([0, newMax]).nice();
		bCfg.yAxisG.transition(t).call(d3.axisLeft(bCfg.yScale).ticks(6));
	}

	d3.selectAll(".bar")
		.transition(t)
		.attr("y", function(d) { return window.barCfg.yScale(d[1]); })
		.attr("height", function(d) { return window.barCfg.yScale(d[0]) - window.barCfg.yScale(d[1]); })
		.attr("opacity", function(d) {
			if (!selectedType) return 1;
			if (d.data.type !== selectedType) return 0.15;
			if (selectedGen && d.gen !== selectedGen) return 0.35;
			return 1;
		});

	// radar chart: update polygon to selected type
	updateRadar(t);
}


// recalculate and transition the radar polygon
function updateRadar(t) {
	var cfg = window.radarCfg;
	var statKeys = cfg.statKeys;
	var angleSlice = cfg.angleSlice;
	var rScale = cfg.rScale;

	// priority: selectedPokemon > brushedData > selectedType > all
	var newStats;
	var infoText;
	var fillColor;

	if (selectedPokemon) {
		// single pokemon: show exact stats
		newStats = statKeys.map(function(key) {
			return { axis: key, value: selectedPokemon[key] };
		});
		fillColor = typeColorMap[selectedPokemon.type1] || "steelblue";
		infoText = selectedPokemon.name + " (" + selectedPokemon.type1 + ")";
	} else if (brushedData && brushedData.length > 0) {
		newStats = statKeys.map(function(key) {
			return { axis: key, value: d3.mean(brushedData, function(d) { return d[key]; }) };
		});
		fillColor = "#e65100";
		infoText = "Brushed: " + brushedData.length + " Pokemon";
	} else if (selectedType) {
		// filter by type, and optionally by generation
		var subset = allData.filter(function(d) {
			return d.type1 === selectedType && (!selectedGen || d.generation === selectedGen);
		});
		newStats = statKeys.map(function(key) {
			return { axis: key, value: d3.mean(subset, function(d) { return d[key]; }) };
		});
		fillColor = typeColorMap[selectedType];
		infoText = selectedGen
			? selectedType + " Gen " + selectedGen + " (" + subset.length + ")"
			: selectedType + " (" + subset.length + " Pokemon)";
	} else {
		newStats = statKeys.map(function(key) {
			return { axis: key, value: d3.mean(allData, function(d) { return d[key]; }) };
		});
		fillColor = "steelblue";
		infoText = "All " + allData.length + " Pokemon (average)";
	}

	// transition polygon path
	cfg.radarG.select(".radar-polygon")
		.datum(newStats)
		.transition(t)
		.attr("d", cfg.radarLine)
		.attr("fill", fillColor)
		.attr("stroke", fillColor);

	// transition vertex dots
	cfg.radarG.selectAll(".radar-dot")
		.data(newStats)
		.transition(t)
		.attr("cx", function(d, i) { return rScale(d.value) * Math.cos(angleSlice * i - Math.PI / 2); })
		.attr("cy", function(d, i) { return rScale(d.value) * Math.sin(angleSlice * i - Math.PI / 2); })
		.attr("fill", fillColor);

	// transition value labels
	cfg.radarG.selectAll(".radar-val")
		.data(newStats)
		.transition(t)
		.attr("x", function(d, i) { return (rScale(d.value) + 12) * Math.cos(angleSlice * i - Math.PI / 2); })
		.attr("y", function(d, i) { return (rScale(d.value) + 12) * Math.sin(angleSlice * i - Math.PI / 2); })
		.text(function(d) { return d.value.toFixed(0); });

	// update info text and its color
	d3.select(".radar-info")
		.text(infoText)
		.style("fill", fillColor);
}


// reset all selections back to default
function resetAll() {
	selectedType = null;
	selectedGen = null;
	selectedPokemon = null;
	brushedData = null;
	if (scatterBrushG && scatterBrush) scatterBrushG.call(scatterBrush.move, null);
	updateSelection();
}
