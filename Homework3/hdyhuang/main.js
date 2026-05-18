// pokemon visualization dashboard

// shared tooltip
var tooltip = d3.select("body")
	.append("div")
	.attr("class", "tooltip");

// load csv and draw scatter plot
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
