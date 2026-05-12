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

	// parse numeric fields and clean the dataset
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
			musicEffects: d["Music effects"]
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
	drawScatterPlot(data);
	drawSankey(data);
});


// ============================================================
// view 1 - bar chart - avg mental health score per genre (context overview)
// horizontal bars sorted by severity, color reinforces score
function drawBarChart(data) {

	// get container size
	var container = document.getElementById("bar-chart");
	var width = container.clientWidth;
	var height = container.clientHeight;

	// margins for axes and labels
	var margin = { top: 40, right: 30, bottom: 50, left: 120 };
	var innerW = width - margin.left - margin.right;
	var innerH = height - margin.top - margin.bottom;

	// create svg
	var svg = d3.select("#bar-chart")
		.append("svg")
		.attr("width", width)
		.attr("height", height);

	// group with margin offset
	var g = svg.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// compute average composite mental health score per genre
	var genreScores = d3.rollups(
		data,
		function(v) {
			return {
				avgScore: d3.mean(v, function(d) { return d.mentalHealthScore; }),
				count: v.length
			};
		},
		function(d) { return d.favGenre; }
	);

	// sort by average score descending so highest severity is at top
	genreScores.sort(function(a, b) { return b[1].avgScore - a[1].avgScore; });

	// extract genre names and score range
	var genres = genreScores.map(function(d) { return d[0]; });
	var scoreExtent = d3.extent(genreScores, function(d) { return d[1].avgScore; });

	// y scale - band scale for genre names
	var yScale = d3.scaleBand()
		.domain(genres)
		.range([0, innerH])
		.padding(0.15);

	// x scale - linear for score, fixed 0 to 10 to match mental health range
	var xScale = d3.scaleLinear()
		.domain([0, 10])
		.range([0, innerW]);

	// color scale - green to red, low score is good (green), high is bad (red)
	var colorScale = d3.scaleLinear()
		.domain([0, 5, 10])
		.range(["#4CAF50", "#FFC107", "#F44336"]);

	// draw y axis with genre labels
	g.append("g")
		.attr("class", "axis")
		.call(d3.axisLeft(yScale))
		.selectAll("text")
		.style("font-size", "11px");

	// draw x axis at bottom
	g.append("g")
		.attr("class", "axis")
		.attr("transform", "translate(0," + innerH + ")")
		.call(d3.axisBottom(xScale).ticks(5));

	// x axis label
	svg.append("text")
		.attr("x", margin.left + innerW / 2)
		.attr("y", height - 8)
		.attr("text-anchor", "middle")
		.style("font-size", "12px")
		.style("fill", "#555")
		.text("Avg Mental Health Score (0-10)");

	// chart title
	svg.append("text")
		.attr("class", "chart-title")
		.attr("x", margin.left + innerW / 2)
		.attr("y", 22)
		.attr("text-anchor", "middle")
		.text("Mental Health Severity by Genre");

	// draw horizontal bars, one per genre
	g.selectAll(".bar")
		.data(genreScores)
		.enter()
		.append("rect")
		.attr("class", "bar")
		.attr("y", function(d) { return yScale(d[0]); })
		.attr("x", 0)
		.attr("height", yScale.bandwidth())
		.attr("width", function(d) { return xScale(d[1].avgScore); })
		.attr("fill", function(d) { return colorScale(d[1].avgScore); })
		.attr("rx", 2)
		.on("mouseover", function(event, d) {
			// show tooltip with genre score details
			tooltip.style("opacity", 1)
				.html(
					"<strong>" + d[0] + "</strong><br/>" +
					"Avg Score: " + d[1].avgScore.toFixed(2) + " / 10<br/>" +
					"Respondents: " + d[1].count
				);
		})
		.on("mousemove", function(event) {
			// follow cursor
			tooltip.style("left", (event.pageX + 12) + "px")
				.style("top", (event.pageY - 28) + "px");
		})
		.on("mouseout", function() {
			// hide tooltip
			tooltip.style("opacity", 0);
		});

	// add score value label at end of each bar
	g.selectAll(".bar-label")
		.data(genreScores)
		.enter()
		.append("text")
		.attr("class", "bar-label")
		.attr("x", function(d) { return xScale(d[1].avgScore) + 4; })
		.attr("y", function(d) { return yScale(d[0]) + yScale.bandwidth() / 2; })
		.attr("dy", "0.35em")
		.style("font-size", "10px")
		.style("fill", "#555")
		.text(function(d) { return d[1].avgScore.toFixed(1); });
}


// ============================================================
// view 2 - scatter plot - hours vs anxiety (focus)
// each dot is one respondent
// color encodes music effect category

function drawScatterPlot(data) {

	// get container size
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

	// group with margin offset
	var g = svg.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// keep only rows with valid music effects value
	var filtered = data.filter(function(d) {
		return d.musicEffects === "Improve" ||
			   d.musicEffects === "No effect" ||
			   d.musicEffects === "Worsen";
	});

	// x scale - hours per day
	var xScale = d3.scaleLinear()
		.domain([0, d3.min([24, d3.max(filtered, function(d) { return d.hoursPerDay; })])])
		.nice()
		.range([0, innerW]);

	// y scale - anxiety 0 to 10
	var yScale = d3.scaleLinear()
		.domain([0, 10])
		.range([innerH, 0]);

	// draw x axis
	g.append("g")
		.attr("class", "axis")
		.attr("transform", "translate(0," + innerH + ")")
		.call(d3.axisBottom(xScale).ticks(8));

	// draw y axis
	g.append("g")
		.attr("class", "axis")
		.call(d3.axisLeft(yScale).ticks(10));

	// x axis label
	svg.append("text")
		.attr("x", margin.left + innerW / 2)
		.attr("y", height - 8)
		.attr("text-anchor", "middle")
		.style("font-size", "12px")
		.style("fill", "#555")
		.text("Hours of Music per Day");

	// y axis label rotated
	svg.append("text")
		.attr("transform", "rotate(-90)")
		.attr("x", -(margin.top + innerH / 2))
		.attr("y", 16)
		.attr("text-anchor", "middle")
		.style("font-size", "12px")
		.style("fill", "#555")
		.text("Anxiety Score (0-10)");

	// chart title
	svg.append("text")
		.attr("class", "chart-title")
		.attr("x", margin.left + innerW / 2)
		.attr("y", 22)
		.attr("text-anchor", "middle")
		.text("Daily Listening Hours vs. Anxiety Level");

	// small random offset to reduce dot overlap
	function jitter() {
		return (Math.random() - 0.5) * 8;
	}

	// draw one circle per respondent
	g.selectAll(".dot")
		.data(filtered)
		.enter()
		.append("circle")
		.attr("class", "dot")
		.attr("cx", function(d) { return xScale(d.hoursPerDay) + jitter(); })
		.attr("cy", function(d) { return yScale(d.anxiety) + jitter(); })
		.attr("r", 4)
		.attr("fill", function(d) { return effectColors[d.musicEffects]; })
		.attr("opacity", 0.6)
		.attr("stroke", "#fff")
		.attr("stroke-width", 0.5)
		.on("mouseover", function(event, d) {
			// enlarge dot and show details
			d3.select(this).attr("r", 7).attr("opacity", 1);
			tooltip.style("opacity", 1)
				.html(
					"<strong>Age " + d.age + "</strong><br/>" +
					"Genre: " + d.favGenre + "<br/>" +
					"Hours/day: " + d.hoursPerDay + "<br/>" +
					"Anxiety: " + d.anxiety + "<br/>" +
					"Effect: " + d.musicEffects
				);
		})
		.on("mousemove", function(event) {
			tooltip.style("left", (event.pageX + 12) + "px")
				.style("top", (event.pageY - 28) + "px");
		})
		.on("mouseout", function() {
			// reset dot
			d3.select(this).attr("r", 4).attr("opacity", 0.6);
			tooltip.style("opacity", 0);
		});

	// --- legend for music effects ---
	var legendItems = ["Improve", "No effect", "Worsen"];

	var legend = g.append("g")
		.attr("class", "legend")
		.attr("transform", "translate(" + (innerW - 110) + ", 5)");

	// one entry per category
	legendItems.forEach(function(effect, i) {
		// colored circle
		legend.append("circle")
			.attr("cx", 0)
			.attr("cy", i * 20)
			.attr("r", 5)
			.attr("fill", effectColors[effect]);

		// label text
		legend.append("text")
			.attr("x", 12)
			.attr("y", i * 20 + 4)
			.text(effect)
			.style("font-size", "11px")
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
	var margin = { top: 40, right: 160, bottom: 20, left: 120 };
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
		.text("Genre to Music Effect Flow (Sankey Diagram)");

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

	// collect unique genre names sorted by total count descending
	var genreTotals = d3.rollups(filtered, function(v) { return v.length; }, function(d) { return d.favGenre; });
	genreTotals.sort(function(a, b) { return b[1] - a[1]; });
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

	// build link list from counts
	var links = [];
	linkCounts.forEach(function(genreEntry) {
		var genre = genreEntry[0];
		genreEntry[1].forEach(function(effectEntry) {
			var effect = effectEntry[0];
			var count = effectEntry[1];
			links.push({
				source: nodeIndex[genre],
				target: nodeIndex[effect],
				value: count
			});
		});
	});

	// configure sankey layout
	var sankey = d3.sankey()
		.nodeWidth(20)
		.nodePadding(8)
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
					"Count: " + d.value
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
		.attr("stroke", "#333")
		.attr("stroke-width", 0.5);

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
		.style("font-size", "11px")
		.style("fill", "#333")
		.text(function(d) { return d.name; });

	// --- legend for music effect colors ---
	var legendGroup = svg.append("g")
		.attr("class", "legend")
		.attr("transform", "translate(" + (width - 140) + "," + (margin.top + 10) + ")");

	// legend title
	legendGroup.append("text")
		.attr("x", 0)
		.attr("y", -5)
		.style("font-size", "11px")
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
			.style("font-size", "11px")
			.style("fill", "#555");
	});
}
