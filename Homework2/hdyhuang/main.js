// ============================================================
// music & mental health survey dashboard
// bar chart, scatter plot, sankey diagram

// color palette for music effects categories used across scatter and sankey
var effectColors = {
	"Improve": "#4CAF50",
	"No effect": "#9E9E9E",
	"Worsen": "#F44336"
};

// shared tooltip element appended to body for all three views
var tooltip = d3.select("body")
	.append("div")
	.attr("class", "tooltip");

// load csv and initialize all three views
d3.csv("data/mxmh_survey_results.csv").then(function(rawData) {

	// parse numeric fields and clean the dataset, keep raw row for frequency columns
	var data = rawData.map(function(d) {
		return {
			age: +d["Age"],
			streamingService: d["Primary streaming service"],
			hoursPerDay: +d["Hours per day"],
			whileWorking: d["While working"],
			instrumentalist: d["Instrumentalist"],
			composer: d["Composer"],
			favGenre: d["Fav genre"],
			exploratory: d["Exploratory"],
			foreignLanguages: d["Foreign languages"],
			bpm: +d["BPM"],
			anxiety: +d["Anxiety"],
			depression: +d["Depression"],
			insomnia: +d["Insomnia"],
			ocd: +d["OCD"],
			musicEffects: d["Music effects"],
			_raw: d
		};
	}).filter(function(d) {
		// remove rows with missing critical values
		return !isNaN(d.age) && !isNaN(d.hoursPerDay) &&
			   !isNaN(d.anxiety) && !isNaN(d.depression) &&
			   !isNaN(d.insomnia) && !isNaN(d.ocd) &&
			   d.favGenre && d.favGenre.length > 0;
	});

	// compute composite mental health score per row
	data.forEach(function(d) {
		d.mentalHealthScore = (d.anxiety + d.depression + d.insomnia + d.ocd) / 4;
	});

	// draw all three views
	drawBarChart(data);
	drawHeatmap(data);
	drawSankey(data);
});


// ============================================================
// view 1 - donut chart - streaming service share split by age groups
// each service slice subdivided by age, older = lighter color
function drawBarChart(data) {

	// get container size
	var container = document.getElementById("bar-chart");
	var width = container.clientWidth;
	var height = container.clientHeight;

	// create svg
	var svg = d3.select("#bar-chart")
		.append("svg")
		.attr("width", width)
		.attr("height", height);

	// specific brand colors per streaming service
	var serviceColors = {
		"Spotify": "#1DB954",
		"YouTube Music": "#FF0000",
		"Apple Music": "#FA57C1",
		"Pandora": "#224099",
		"Other": "#42A5F5"
	};

	// merge minor services into "Other"
	var majorServices = ["Spotify", "YouTube Music", "Apple Music", "Pandora"];

	// age group definitions, younger first
	var ageGroups = [
		{ label: "10-20", min: 0, max: 20 },
		{ label: "21-30", min: 21, max: 30 },
		{ label: "31-50", min: 31, max: 50 },
		{ label: "51+", min: 51, max: 200 }
	];

	// lightness multiplier per age group, younger = full color, older = lighter
	var ageLightness = [0, 0.3, 0.55, 0.75];

	// helper to lighten a hex color toward white by a factor (0=original, 1=white)
	function lighten(hex, factor) {
		var c = d3.color(hex);
		c.r = Math.round(c.r + (255 - c.r) * factor);
		c.g = Math.round(c.g + (255 - c.g) * factor);
		c.b = Math.round(c.b + (255 - c.b) * factor);
		return c.formatHex();
	}

	// filter out rows with empty streaming service, remap minor ones to "Other"
	var filtered = data.filter(function(d) {
		return d.streamingService && d.streamingService.length > 0;
	}).map(function(d) {
		var copy = Object.assign({}, d);
		if (majorServices.indexOf(copy.streamingService) === -1) {
			copy.streamingService = "Other";
		}
		return copy;
	});

	// get service order by total count descending
	var serviceTotals = d3.rollups(
		filtered,
		function(v) { return v.length; },
		function(d) { return d.streamingService; }
	);
	// sort by count descending but push "Other" to last
	serviceTotals.sort(function(a, b) {
		if (a[0] === "Other") return 1;
		if (b[0] === "Other") return -1;
		return b[1] - a[1];
	});
	var serviceOrder = serviceTotals.map(function(d) { return d[0]; });

	// build sub-slices: one per (service, ageGroup) combination
	// grouped by service so same-service slices are adjacent
	var slices = [];
	serviceOrder.forEach(function(service) {
		ageGroups.forEach(function(ag, ai) {
			var count = filtered.filter(function(d) {
				return d.streamingService === service && d.age >= ag.min && d.age <= ag.max;
			}).length;
			if (count > 0) {
				slices.push({
					service: service,
					ageLabel: ag.label,
					ageIndex: ai,
					count: count,
					color: lighten(serviceColors[service] || "#BDBDBD", ageLightness[ai])
				});
			}
		});
	});

	// total for percentage
	var total = d3.sum(slices, function(d) { return d.count; });

	// donut dimensions
	var radius = Math.min(width * 0.34, height * 0.36);
	var innerRadius = radius * 0.45;
	var centerX = width * 0.36;
	var centerY = height * 0.52;

	// chart title
	svg.append("text")
		.attr("class", "chart-title")
		.attr("x", width / 2)
		.attr("y", 22)
		.attr("text-anchor", "middle")
		.text("Modern Streaming Service Usage by Age");

	// group centered on donut
	var g = svg.append("g")
		.attr("transform", "translate(" + centerX + "," + centerY + ")");

	// pie layout, no re-sorting to keep service groups together
	var pie = d3.pie()
		.value(function(d) { return d.count; })
		.sort(null);

	// arc generator
	var arc = d3.arc()
		.innerRadius(innerRadius)
		.outerRadius(radius);

	// hover arc
	var arcHover = d3.arc()
		.innerRadius(innerRadius)
		.outerRadius(radius + 6);

	// draw sub-slices
	g.selectAll(".slice")
		.data(pie(slices))
		.enter()
		.append("path")
		.attr("class", "slice")
		.attr("d", arc)
		.attr("fill", function(d) { return d.data.color; })
		.attr("stroke", "#fff")
		.attr("stroke-width", 1)
		.on("mouseover", function(event, d) {
			d3.select(this).attr("d", arcHover);
			tooltip.style("opacity", 1)
				.html(
					"<strong>" + d.data.service + "</strong><br/>" +
					"Age: " + d.data.ageLabel + "<br/>" +
					"Users: " + d.data.count
				);
		})
		.on("mousemove", function(event) {
			tooltip.style("left", (event.pageX + 12) + "px")
				.style("top", (event.pageY - 28) + "px");
		})
		.on("mouseout", function() {
			d3.select(this).attr("d", arc);
			tooltip.style("opacity", 0);
		});

	// center label
	g.append("text")
		.attr("text-anchor", "middle")
		.attr("dy", "-0.2em")
		.style("font-size", "22px")
		.style("font-weight", "700")
		.style("fill", "#333")
		.text(total);

	g.append("text")
		.attr("text-anchor", "middle")
		.attr("dy", "1.2em")
		.style("font-size", "11px")
		.style("fill", "#888")
		.text("respondents");

	// --- legend: services ---
	var legendX = width * 0.66;
	var legendY = height * 0.12;
	var legend = svg.append("g")
		.attr("class", "legend")
		.attr("transform", "translate(" + legendX + "," + legendY + ")");

	// service legend entries
	serviceOrder.forEach(function(service, i) {
		var sTotal = serviceTotals.filter(function(s) { return s[0] === service; })[0][1];
		var pct = (sTotal / total * 100).toFixed(1);

		legend.append("rect")
			.attr("x", 0)
			.attr("y", i * 22)
			.attr("width", 14)
			.attr("height", 14)
			.attr("fill", serviceColors[service] || "#BDBDBD")
			.attr("rx", 2);

		legend.append("text")
			.attr("x", 20)
			.attr("y", i * 22 + 11)
			.style("font-size", "15px")
			.style("fill", "#555")
			.text(service + "  " + pct + "%");
	});

	// age gradient legend below services
	var ageLegendY = serviceOrder.length * 22 + 20;

	legend.append("text")
		.attr("x", 0)
		.attr("y", ageLegendY)
		.style("font-size", "15px")
		.style("font-weight", "600")
		.style("fill", "#555")
		.text("Age (darker = younger)");

	ageGroups.forEach(function(ag, i) {
		// sample color using grey at different lightness
		var sampleColor = lighten("#888888", ageLightness[i]);

		legend.append("rect")
			.attr("x", 0)
			.attr("y", ageLegendY + 8 + i * 20)
			.attr("width", 14)
			.attr("height", 14)
			.attr("fill", sampleColor)
			.attr("rx", 2);

		legend.append("text")
			.attr("x", 20)
			.attr("y", ageLegendY + 19 + i * 20)
			.style("font-size", "14px")
			.style("fill", "#555")
			.text(ag.label);
	});
}


// ============================================================
// view 2 - grouped bar chart - frequency vs exploratory, mental health score
// two bars per frequency level (yes/no exploratory) for direct comparison
function drawHeatmap(data) {

	// get container size
	var container = document.getElementById("heatmap");
	var width = container.clientWidth;
	var height = container.clientHeight;

	// margins
	var margin = { top: 40, right: 80, bottom: 60, left: 120 };
	var innerW = width - margin.left - margin.right;
	var innerH = height - margin.top - margin.bottom;

	// create svg
	var svg = d3.select("#heatmap")
		.append("svg")
		.attr("width", width)
		.attr("height", height);

	// group with margin offset
	var g = svg.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// 16 genre frequency column names
	var genreCols = [
		"Classical", "Country", "EDM", "Folk", "Gospel", "Hip hop",
		"Jazz", "K pop", "Latin", "Lofi", "Metal", "Pop", "R&B",
		"Rap", "Rock", "Video game music"
	];

	// frequency levels in order from least to most
	var freqLevels = ["Never", "Rarely", "Sometimes", "Very frequently"];

	// exploratory categories
	var exploratoryLevels = ["Yes", "No"];

	// colors for yes and no
	var exploratoryColors = { "Yes": "#42A5F5", "No": "#FF7043" };

	// flatten data into (frequency, exploratory, score) tuples
	// for each respondent, expand all 16 genre frequency columns
	var tuples = [];
	data.forEach(function(d) {
		if (d.exploratory !== "Yes" && d.exploratory !== "No") return;
		genreCols.forEach(function(genre) {
			var freqKey = "Frequency [" + genre + "]";
			// access raw csv row for frequency value
			var freq = d._raw ? d._raw[freqKey] : null;
			if (freq && freqLevels.indexOf(freq) !== -1) {
				tuples.push({
					freq: freq,
					exploratory: d.exploratory,
					score: d.mentalHealthScore
				});
			}
		});
	});

	// aggregate average score per (frequency, exploratory) pair
	var cellMap = {};
	freqLevels.forEach(function(f) {
		exploratoryLevels.forEach(function(e) {
			cellMap[f + "|" + e] = { scores: [], freq: f, exploratory: e };
		});
	});
	tuples.forEach(function(t) {
		var key = t.freq + "|" + t.exploratory;
		if (cellMap[key]) cellMap[key].scores.push(t.score);
	});

	// build grouped data array
	var barData = [];
	freqLevels.forEach(function(f) {
		exploratoryLevels.forEach(function(e) {
			var entry = cellMap[f + "|" + e];
			barData.push({
				freq: f,
				exploratory: e,
				avgScore: entry.scores.length > 0 ? d3.mean(entry.scores) : 0,
				count: entry.scores.length
			});
		});
	});

	// y scale - outer band for frequency levels
	var yScale = d3.scaleBand()
		.domain(freqLevels)
		.range([0, innerH])
		.padding(0.2);

	// y sub-scale - inner band for yes/no within each frequency group
	var ySubScale = d3.scaleBand()
		.domain(exploratoryLevels)
		.range([0, yScale.bandwidth()])
		.padding(0.1);

	// x scale - linear for avg score
	var xScale = d3.scaleLinear()
		.domain([0, 10])
		.range([0, innerW]);

	// draw y axis with frequency labels
	g.append("g")
		.attr("class", "axis")
		.call(d3.axisLeft(yScale))
		.selectAll("text")
		.style("font-size", "13px");

	// draw x axis at bottom
	g.append("g")
		.attr("class", "axis")
		.attr("transform", "translate(0," + innerH + ")")
		.call(d3.axisBottom(xScale).ticks(5));

	// x axis label
	svg.append("text")
		.attr("x", margin.left + innerW / 2)
		.attr("y", height - 10)
		.attr("text-anchor", "middle")
		.style("font-size", "14px")
		.style("fill", "#555")
		.text("Avg Mental Health Score (0-10)");

	// y axis label rotated
	svg.append("text")
		.attr("transform", "rotate(-90)")
		.attr("x", -(margin.top + innerH / 2))
		.attr("y", 16)
		.attr("text-anchor", "middle")
		.style("font-size", "14px")
		.style("fill", "#555")
		.text("Listening Frequency");

	// chart title
	svg.append("text")
		.attr("class", "chart-title")
		.attr("x", margin.left + innerW / 2)
		.attr("y", 22)
		.attr("text-anchor", "middle")
		.text("Does Exploratory and Frequency Affect Mental Health?");

	// draw grouped bars, two per frequency level
	g.selectAll(".grouped-bar")
		.data(barData)
		.enter()
		.append("rect")
		.attr("class", "grouped-bar")
		.attr("y", function(d) { return yScale(d.freq) + ySubScale(d.exploratory); })
		.attr("x", 0)
		.attr("height", ySubScale.bandwidth())
		.attr("width", function(d) { return xScale(d.avgScore); })
		.attr("fill", function(d) { return exploratoryColors[d.exploratory]; })
		.attr("rx", 2)
		.on("mouseover", function(event, d) {
			// show tooltip with bar details
			tooltip.style("opacity", 1)
				.html(
					"<strong>" + d.freq + "</strong><br/>" +
					"Exploratory: " + d.exploratory + "<br/>" +
					"Avg Score: " + d.avgScore.toFixed(2) + "<br/>" +
					"Data points: " + d.count
				);
		})
		.on("mousemove", function(event) {
			tooltip.style("left", (event.pageX + 12) + "px")
				.style("top", (event.pageY - 28) + "px");
		})
		.on("mouseout", function() {
			tooltip.style("opacity", 0);
		});

	// score label at end of each bar
	g.selectAll(".bar-value")
		.data(barData)
		.enter()
		.append("text")
		.attr("class", "bar-value")
		.attr("x", function(d) { return xScale(d.avgScore) + 4; })
		.attr("y", function(d) { return yScale(d.freq) + ySubScale(d.exploratory) + ySubScale.bandwidth() / 2; })
		.attr("dy", "0.35em")
		.style("font-size", "10px")
		.style("fill", "#555")
		.text(function(d) { return d.avgScore.toFixed(2); });

	// --- legend for exploratory yes/no ---
	var legend = g.append("g")
		.attr("class", "legend")
		.attr("transform", "translate(" + (innerW - 140) + ", 0)");

	exploratoryLevels.forEach(function(e, i) {
		// colored rectangle
		legend.append("rect")
			.attr("x", 0)
			.attr("y", i * 22)
			.attr("width", 14)
			.attr("height", 14)
			.attr("fill", exploratoryColors[e])
			.attr("rx", 2);

		// label
		legend.append("text")
			.attr("x", 20)
			.attr("y", i * 22 + 11)
			.text("Exploratory: " + e)
			.style("font-size", "17px")
			.style("fill", "#555");
	});
}


// ============================================================
// view 3 - sankey diagram - genre to music effect flow (advanced)
// left nodes are favorite genres
// right nodes are music effect categories
// link width encodes how many respondents flow from genre to effect
// ============================================================
function drawSankey(data) {

	// get container size
	var container = document.getElementById("sankey-diagram");
	var width = container.clientWidth;
	var height = container.clientHeight;

	// margins
	var margin = { top: 40, right: 160, bottom: 20, left: 145 };
	var innerW = width - margin.left - margin.right;
	var innerH = height - margin.top - margin.bottom;

	// create svg
	var svg = d3.select("#sankey-diagram")
		.append("svg")
		.attr("width", width)
		.attr("height", height);

	// group with margin offset
	var g = svg.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// chart title
	svg.append("text")
		.attr("class", "chart-title")
		.attr("x", width / 2)
		.attr("y", 22)
		.attr("text-anchor", "middle")
		.text("Music Type Effect %");

	// keep only rows with valid music effects
	var filtered = data.filter(function(d) {
		return d.musicEffects === "Improve" ||
			   d.musicEffects === "No effect" ||
			   d.musicEffects === "Worsen";
	});

	// count respondents per genre-effect pair
	var linkCounts = d3.rollups(
		filtered,
		function(v) { return v.length; },
		function(d) { return d.favGenre; },
		function(d) { return d.musicEffects; }
	);

	// collect unique genre names and their totals
	var genreTotals = d3.rollups(filtered, function(v) { return v.length; }, function(d) { return d.favGenre; });

	// compute improve percentage per genre for ranking
	var improvePercent = {};
	linkCounts.forEach(function(genreEntry) {
		var genre = genreEntry[0];
		var gTotal = genreTotals.filter(function(g) { return g[0] === genre; })[0][1];
		var improveCount = 0;
		genreEntry[1].forEach(function(effectEntry) {
			if (effectEntry[0] === "Improve") improveCount = effectEntry[1];
		});
		improvePercent[genre] = improveCount / gTotal * 100;
	});

	// sort genres by improve percentage descending (highest improve% at top)
	genreTotals.sort(function(a, b) { return (improvePercent[b[0]] || 0) - (improvePercent[a[0]] || 0); });
	var genres = genreTotals.map(function(d) { return d[0]; });

	// effect categories in fixed order
	var effects = ["Improve", "No effect", "Worsen"];

	// build node list - genres first then effects
	var nodes = [];
	genres.forEach(function(genre) { nodes.push({ name: genre }); });
	effects.forEach(function(eff) { nodes.push({ name: eff }); });

	// helper to find node index by name
	var nodeIndex = {};
	nodes.forEach(function(n, i) { nodeIndex[n.name] = i; });

	// build a map of total count per genre for percentage calculation
	var genreTotalMap = {};
	genreTotals.forEach(function(d) { genreTotalMap[d[0]] = d[1]; });

	// build link list using percentages within each genre
	var links = [];
	linkCounts.forEach(function(genreEntry) {
		var genre = genreEntry[0];
		var gTotal = genreTotalMap[genre];
		genreEntry[1].forEach(function(effectEntry) {
			var effect = effectEntry[0];
			var count = effectEntry[1];
			var pct = count / gTotal * 100;
			links.push({
				source: nodeIndex[genre],
				target: nodeIndex[effect],
				value: pct,
				rawCount: count,
				rawTotal: gTotal
			});
		});
	});

	// configure sankey layout with more padding for right-side nodes
	var sankey = d3.sankey()
		.nodeWidth(18)
		.nodePadding(4)
		.nodeAlign(d3.sankeyLeft)
		.extent([[0, 0], [innerW, innerH]]);

	// compute layout
	var graph = sankey({
		nodes: nodes.map(function(d) { return Object.assign({}, d); }),
		links: links.map(function(d) { return Object.assign({}, d); })
	});

	// genre color scale using d3 category colors
	var genreColor = d3.scaleOrdinal(d3.schemeTableau10)
		.domain(genres);

	// draw links as curved paths
	g.append("g")
		.selectAll(".sankey-link")
		.data(graph.links)
		.enter()
		.append("path")
		.attr("class", "sankey-link")
		.attr("d", d3.sankeyLinkHorizontal())
		.attr("fill", "none")
		.attr("stroke", function(d) { return genreColor(d.source.name); })
		.attr("stroke-opacity", 0.4)
		.attr("stroke-width", function(d) { return Math.max(1, d.width); })
		.on("mouseover", function(event, d) {
			// highlight link on hover
			d3.select(this).attr("stroke-opacity", 0.8);
			tooltip.style("opacity", 1)
				.html(
					"<strong>" + d.source.name + " → " + d.target.name + "</strong><br/>" +
					d.rawCount + " / " + d.rawTotal + " (" + d.value.toFixed(1) + "%)"
				);
		})
		.on("mousemove", function(event) {
			tooltip.style("left", (event.pageX + 12) + "px")
				.style("top", (event.pageY - 28) + "px");
		})
		.on("mouseout", function() {
			d3.select(this).attr("stroke-opacity", 0.4);
			tooltip.style("opacity", 0);
		});

	// draw node rectangles
	g.append("g")
		.selectAll(".sankey-node")
		.data(graph.nodes)
		.enter()
		.append("rect")
		.attr("class", "sankey-node")
		.attr("x", function(d) { return d.x0; })
		.attr("y", function(d) { return d.y0; })
		.attr("width", function(d) { return d.x1 - d.x0; })
		.attr("height", function(d) { return Math.max(1, d.y1 - d.y0); })
		.attr("fill", function(d) {
			// use effect color for right-side nodes, genre color for left
			if (effectColors[d.name]) return effectColors[d.name];
			return genreColor(d.name);
		})
		.attr("stroke", "none");

	// draw node labels
	g.append("g")
		.selectAll(".sankey-label")
		.data(graph.nodes)
		.enter()
		.append("text")
		.attr("class", "sankey-label")
		.attr("x", function(d) {
			// genre labels on left side, effect labels on right side
			if (effectColors[d.name]) return d.x1 + 6;
			return d.x0 - 6;
		})
		.attr("y", function(d) { return (d.y0 + d.y1) / 2; })
		.attr("dy", "0.35em")
		.attr("text-anchor", function(d) {
			if (effectColors[d.name]) return "start";
			return "end";
		})
		.style("font-size", "17px")
		.style("fill", "#333")
		.text(function(d) { return d.name; });

	// --- legend for music effect colors, placed top-right to avoid node overlap ---
	var legendGroup = svg.append("g")
		.attr("class", "legend")
		.attr("transform", "translate(" + (width - 155) + "," + (margin.top + 2) + ")");

	// legend title
	legendGroup.append("text")
		.attr("x", 0)
		.attr("y", -5)
		.style("font-size", "17px")
		.style("font-weight", "600")
		.style("fill", "#555")
		.text("Music Effect");

	// one entry per effect
	effects.forEach(function(effect, i) {
		// colored rectangle
		legendGroup.append("rect")
			.attr("x", 0)
			.attr("y", i * 20 + 8)
			.attr("width", 14)
			.attr("height", 14)
			.attr("fill", effectColors[effect])
			.attr("rx", 2);

		// label text
		legendGroup.append("text")
			.attr("x", 20)
			.attr("y", i * 20 + 19)
			.text(effect)
			.style("font-size", "17px")
			.style("fill", "#555");
	});
}
