const STAT_COLS = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];
const TYPE_COLOR = d3.scaleOrdinal(d3.schemeTableau10);

let allData = [];
let selectedGeneration = null;

const width = () => window.innerWidth;
const height = () => window.innerHeight;

const margin = { top: 36, right: 24, bottom: 48, left: 56 };

function parseRow(d) {
	return {
		Number: +d.Number,
		Name: d.Name,
		Type_1: d.Type_1,
		Type_2: d.Type_2 || "",
		Total: +d.Total,
		HP: +d.HP,
		Attack: +d.Attack,
		Defense: +d.Defense,
		Sp_Atk: +d.Sp_Atk,
		Sp_Def: +d.Sp_Def,
		Speed: +d.Speed,
		Generation: +d.Generation,
		isLegendary: d.isLegendary === "True",
		hasMegaEvolution: d.hasMegaEvolution === "True",
		Height_m: +d.Height_m,
		Weight_kg: +d.Weight_kg,
		Catch_Rate: +d.Catch_Rate
	};
}

function filteredData() {
	if (selectedGeneration == null) return allData;
	return allData.filter(d => d.Generation === selectedGeneration);
}

function layout() {
	const w = width();
	const h = height();
	const pad = 12;
	const topH = Math.floor(h * 0.42);
	const bottomH = h - topH - pad;
	const leftW = Math.floor(w * 0.48);
	const rightW = w - leftW - pad * 2;
	return {
		overview: { x: pad, y: pad, w: leftW, h: topH },
		parallel: { x: leftW + pad * 2, y: pad, w: rightW, h: topH },
		scatter: { x: pad, y: topH + pad, w: w - pad * 2, h: bottomH }
	};
}

function drawTitle(g, x, y, title, subtitle) {
	g.append("text")
		.attr("font-size", "14px")
		.attr("font-weight", "600")
		.attr("fill", "#1a1a2e")
		.attr("x", x)
		.attr("y", y)
		.text(title);
	if (subtitle) {
		g.append("text")
			.attr("font-size", "11px")
			.attr("fill", "#555")
			.attr("x", x)
			.attr("y", y + 16)
			.text(subtitle);
	}
}

function drawOverview(svg, box) {
	const g = svg.select("#view-overview").empty()
		? svg.append("g").attr("id", "view-overview")
		: svg.select("#view-overview");
	g.attr("transform", `translate(${box.x},${box.y})`);
	g.selectAll("*").remove();

	drawTitle(g, 0, 14, "Overview: Pokémon per Generation", "Context — click a bar to filter");

	const innerW = box.w - margin.left - margin.right;
	const innerH = box.h - margin.top - margin.bottom;
	const plot = g.append("g")
		.attr("transform", `translate(${margin.left},${margin.top})`);

	const genCounts = d3.rollups(
		allData,
		v => v.length,
		d => d.Generation
	).map(([generation, count]) => ({ generation, count }))
		.sort((a, b) => a.generation - b.generation);

	const x = d3.scaleBand()
		.domain(genCounts.map(d => d.generation))
		.range([0, innerW])
		.padding(0.2);

	const y = d3.scaleLinear()
		.domain([0, d3.max(genCounts, d => d.count)])
		.nice()
		.range([innerH, 0]);

	plot.append("g")
		.selectAll("rect")
		.data(genCounts)
		.join("rect")
		.attr("x", d => x(d.generation))
		.attr("y", d => y(d.count))
		.attr("width", x.bandwidth())
		.attr("height", d => innerH - y(d.count))
		.attr("fill", d =>
			selectedGeneration === d.generation ? "#e76f51" : "#457b9d")
		.attr("stroke", d =>
			selectedGeneration === d.generation ? "#1d3557" : "none")
		.attr("stroke-width", 2)
		.style("cursor", "pointer")
		.on("click", (_, d) => {
			selectedGeneration =
				selectedGeneration === d.generation ? null : d.generation;
			render();
		});

	plot.append("g")
		.attr("transform", `translate(0,${innerH})`)
		.call(d3.axisBottom(x).tickFormat(d => `Gen ${d}`));

	plot.append("g").call(d3.axisLeft(y).ticks(6));

	plot.append("text")
		.attr("font-size", "12px")
		.attr("x", innerW / 2)
		.attr("y", innerH + 40)
		.attr("text-anchor", "middle")
		.text("Generation");

	plot.append("text")
		.attr("font-size", "12px")
		.attr("transform", "rotate(-90)")
		.attr("x", -innerH / 2)
		.attr("y", -44)
		.attr("text-anchor", "middle")
		.text("Number of Pokémon");

	const legend = g.append("g")
		.attr("transform", `translate(${margin.left}, ${box.h - 22})`);
	legend.append("rect").attr("width", 14).attr("height", 14).attr("fill", "#457b9d");
	legend.append("text").attr("x", 20).attr("y", 12).attr("font-size", 11).text("All generations");
	legend.append("rect").attr("x", 120).attr("width", 14).attr("height", 14).attr("fill", "#e76f51");
	legend.append("text").attr("x", 140).attr("y", 12).attr("font-size", 11).text("Selected filter");
}

function drawParallel(svg, box) {
	const g = svg.select("#view-parallel").empty()
		? svg.append("g").attr("id", "view-parallel")
		: svg.select("#view-parallel");
	g.attr("transform", `translate(${box.x},${box.y})`);
	g.selectAll("*").remove();

	const data = filteredData();
	const filterLabel = selectedGeneration == null
		? "all generations"
		: `Generation ${selectedGeneration}`;

	drawTitle(
		g, 0, 14,
		"Parallel Coordinates: Base Stats",
		`Advanced view — ${data.length} Pokémon (${filterLabel})`
	);

	const innerW = box.w - margin.left - margin.right;
	const innerH = box.h - margin.top - margin.bottom - 20;
	const plot = g.append("g")
		.attr("transform", `translate(${margin.left},${margin.top})`);

	const yScales = {};
	STAT_COLS.forEach(col => {
		yScales[col] = d3.scaleLinear()
			.domain(d3.extent(allData, d => d[col]))
			.range([innerH, 0]);
	});

	const xScale = d3.scalePoint()
		.domain(STAT_COLS)
		.range([0, innerW])
		.padding(0.15);

	const line = d3.line()
		.x((d, i) => xScale(STAT_COLS[i]))
		.y((d, i) => yScales[STAT_COLS[i]](d));

	plot.selectAll("path")
		.data(data)
		.join("path")
		.attr("d", d => line(STAT_COLS.map(c => d[c])))
		.attr("fill", "none")
		.attr("stroke", d => TYPE_COLOR(d.Type_1))
		.attr("stroke-opacity", 0.35)
		.attr("stroke-width", 1.2);

	STAT_COLS.forEach(col => {
		const axisG = plot.append("g")
			.attr("transform", `translate(${xScale(col)},0)`);
		axisG.append("line")
			.attr("y1", 0)
			.attr("y2", innerH)
			.attr("stroke", "#ccc");
		axisG.append("g")
			.call(d3.axisLeft(yScales[col]).ticks(4))
			.select(".domain").remove();
		axisG.append("text")
			.attr("font-size", "12px")
			.attr("y", innerH + 28)
			.attr("text-anchor", "middle")
			.text(col);
	});

	const types = [...new Set(data.map(d => d.Type_1))].sort();
	const legend = g.append("g")
		.attr("transform", `translate(${margin.left}, ${box.h - 18})`);
	types.slice(0, Math.floor((box.w - 40) / 68)).forEach((t, i) => {
		const lg = legend.append("g").attr("transform", `translate(${i * 68}, 0)`);
		lg.append("line").attr("x1", 0).attr("x2", 18).attr("y1", 6).attr("y2", 6)
			.attr("stroke", TYPE_COLOR(t)).attr("stroke-width", 3);
		lg.append("text").attr("x", 22).attr("y", 10).attr("font-size", 10).text(t);
	});
}

function drawScatter(svg, box) {
	const g = svg.select("#view-scatter").empty()
		? svg.append("g").attr("id", "view-scatter")
		: svg.select("#view-scatter");
	g.attr("transform", `translate(${box.x},${box.y})`);
	g.selectAll("*").remove();

	const data = filteredData();
	const filterLabel = selectedGeneration == null
		? "all generations"
		: `Generation ${selectedGeneration}`;

	drawTitle(
		g, 0, 14,
		"Focus: Attack vs. Special Attack",
		`${data.length} Pokémon — ${filterLabel} (size = Total stats)`
	);

	const innerW = box.w - margin.left - margin.right;
	const innerH = box.h - margin.top - margin.bottom - 24;
	const plot = g.append("g")
		.attr("transform", `translate(${margin.left},${margin.top})`);

	const x = d3.scaleLinear()
		.domain(d3.extent(allData, d => d.Attack))
		.nice()
		.range([0, innerW]);

	const y = d3.scaleLinear()
		.domain(d3.extent(allData, d => d.Sp_Atk))
		.nice()
		.range([innerH, 0]);

	const r = d3.scaleSqrt()
		.domain(d3.extent(allData, d => d.Total))
		.range([3, 14]);

	plot.append("g")
		.attr("transform", `translate(0,${innerH})`)
		.call(d3.axisBottom(x).ticks(8));

	plot.append("g").call(d3.axisLeft(y).ticks(8));

	plot.append("text")
		.attr("font-size", "12px")
		.attr("x", innerW / 2)
		.attr("y", innerH + 40)
		.attr("text-anchor", "middle")
		.text("Attack");

	plot.append("text")
		.attr("font-size", "12px")
		.attr("transform", "rotate(-90)")
		.attr("x", -innerH / 2)
		.attr("y", -44)
		.attr("text-anchor", "middle")
		.text("Special Attack");

	const circles = plot.selectAll("circle")
		.data(data, d => d.Number)
		.join("circle")
		.attr("cx", d => x(d.Attack))
		.attr("cy", d => y(d.Sp_Atk))
		.attr("r", d => r(d.Total))
		.attr("fill", d => TYPE_COLOR(d.Type_1))
		.attr("fill-opacity", 0.65)
		.attr("stroke", d => d.isLegendary ? "#1d3557" : "none")
		.attr("stroke-width", d => d.isLegendary ? 2 : 0);

	circles.select("title").remove();
	circles.append("title")
		.text(d =>
			`${d.Name} (Gen ${d.Generation})\n${d.Type_1}${d.Type_2 ? "/" + d.Type_2 : ""}\nTotal: ${d.Total}${d.isLegendary ? " — Legendary" : ""}`);

	const types = [...new Set(allData.map(d => d.Type_1))].sort();
	const legendCols = Math.min(6, Math.ceil(types.length / 3));
	const legend = g.append("g")
		.attr("transform", `translate(${margin.left}, ${box.h - 8})`);
	types.forEach((t, i) => {
		const col = i % legendCols;
		const row = Math.floor(i / legendCols);
		const lg = legend.append("g")
			.attr("transform", `translate(${col * 95}, ${row * 16})`);
		lg.append("circle").attr("r", 5).attr("fill", TYPE_COLOR(t)).attr("fill-opacity", 0.65);
		lg.append("text").attr("x", 10).attr("y", 4).attr("font-size", 10).text(t);
	});
	legend.append("g")
		.attr("transform", `translate(${legendCols * 95}, 0)`)
		.call(grp => {
			grp.append("circle").attr("r", 5).attr("fill", "#888").attr("fill-opacity", 0.3);
			grp.append("text").attr("x", 10).attr("y", 4).attr("font-size", 10).text("size ∝ Total");
			grp.append("circle").attr("cy", 18).attr("r", 5)
				.attr("fill", "none").attr("stroke", "#1d3557").attr("stroke-width", 2);
			grp.append("text").attr("x", 10).attr("y", 22).attr("font-size", 10).text("Legendary");
		});
}

function render() {
	const svg = d3.select("#main-svg");
	svg.attr("width", width()).attr("height", height());
	const L = layout();
	drawOverview(svg, L.overview);
	drawParallel(svg, L.parallel);
	drawScatter(svg, L.scatter);
}

d3.csv("data/pokemon_alopez247.csv").then(raw => {
	allData = raw.map(parseRow);
	TYPE_COLOR.domain([...new Set(allData.map(d => d.Type_1))].sort());
	render();
	window.addEventListener("resize", render);
}).catch(err => {
	console.error(err);
});
