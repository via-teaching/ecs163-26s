const DATA_URL = "data/pokemon_alopez247.csv"; // kaggle csv from the pokemon dataset linked in the homework readme

const TYPE_TOP_N = 10;

const parallelDims = ["HP", "Attack", "Defense", "spAtk", "spDef", "Speed"];
const dimLabel = {
	HP: "HP",
	Attack: "Attack",
	Defense: "Defense",
	spAtk: "Sp. Atk",
	spDef: "Sp. Def",
	Speed: "Speed",
};

let processed = [];
let typeColor = () => "#888";
let resizeTimer = null;

// debounce resize so the dashboard does not redraw on every pixel while resizing the window
function debouncedDraw() {
	clearTimeout(resizeTimer);
	resizeTimer = setTimeout(draw, 120);
}

// clear svg contents before redraw to avoid stacking old elements
function clearSvg(sel) {
	sel.selectAll("*").remove();
}

// assign one color per type group, shared across all three views
function buildTypeColorScale(rows) {
	const counts = d3.rollups(
		rows,
		(v) => v.length,
		(d) => d.typeGroup
	);
	counts.sort((a, b) => b[1] - a[1]);
	const domain = counts.map((d) => d[0]);
	const scheme = d3.schemeTableau10.concat(d3.schemeCategory10);
	const range = domain.map((_, i) => scheme[i % scheme.length]);
	return d3.scaleOrdinal().domain(domain).range(range);
}

// clean csv strings and add uid to match scatter points with parallel-coordinate paths on hover
// group rare types as "other" so the donut does not have too many small slices
function prepareRows(raw) {
	const parsed = raw.map((d, i) => {
		const type1 = String(d.Type_1 ?? "")
			.trim()
			.replace(/^"+|"+$/g, "");
		const id = +d.Number;
		return {
			uid: `${id}|${i}`,
			id,
			name: String(d.Name ?? "").replace(/^"+|"+$/g, ""),
			type1: type1 || "?",
			generation: +d.Generation,
			total: +d.Total,
			HP: +d.HP,
			Attack: +d.Attack,
			Defense: +d.Defense,
			spAtk: +d.Sp_Atk,
			spDef: +d.Sp_Def,
			Speed: +d.Speed,
		};
	});

	const counts = d3.rollups(
		parsed,
		(v) => v.length,
		(d) => d.type1
	);
	counts.sort((a, b) => b[1] - a[1]);
	const top = new Set(counts.slice(0, TYPE_TOP_N).map((d) => d[0]));

	return parsed.map((d) => ({
		...d,
		typeGroup: top.has(d.type1) ? d.type1 : "Other",
	}));
}

function drawOverview(svg, data) {
	const rect = svg.node().getBoundingClientRect();
	const w = rect.width;
	const h = rect.height;
	const margin = { top: 8, right: 12, bottom: 8, left: 12 };
	const innerW = Math.max(0, w - margin.left - margin.right);
	const innerH = Math.max(0, h - margin.top - margin.bottom);
	const cx = margin.left + innerW / 2;
	const cy = margin.top + innerH / 2;
	const r = Math.max(44, Math.min(innerW, innerH) / 2) - 8;

	// count rows per type group; each count becomes one pie slice
	const rollup = d3.rollups(
		data,
		(v) => v.length,
		(d) => d.typeGroup
	);
	const pieData = rollup.map(([key, value]) => ({ key, count: value }));

	const pie = d3.pie().sort(null).value((d) => d.count);
	const arc = d3.arc().innerRadius(r * 0.52).outerRadius(r);

	// center the donut group in the panel
	const g = svg.append("g").attr("transform", `translate(${cx},${cy})`);

	// each slice is a path with type fill color; title element provides the hover tooltip
	g.selectAll("path.slice")
		.data(pie(pieData))
		.join("path")
		.attr("class", "slice")
		.attr("fill", (d) => typeColor(d.data.key))
		.attr("stroke", "#0f1419")
		.attr("stroke-width", 1.2)
		.attr("d", arc)
		.append("title")
		.text((d) => `${d.data.key}: ${d.data.count} Pokemon`);

	// show percent labels only on large slices to avoid overlapping text
	g.selectAll("text.pct")
		.data(pie(pieData).filter((d) => d.endAngle - d.startAngle > 0.28))
		.join("text")
		.attr("class", "pct")
		.attr("transform", (d) => `translate(${arc.centroid(d)})`)
		.attr("text-anchor", "middle")
		.attr("dominant-baseline", "middle")
		.attr("fill", "#0f1419")
		.style("font-size", "10px")
		.style("font-weight", "600")
		.text((d) => `${((d.data.count / data.length) * 100).toFixed(0)}%`);

	// legend below the chart: color swatch, type name, and count
	const leg = svg.append("g").attr("transform", `translate(${margin.left}, ${h - 8})`);
	pieData
		.slice()
		.sort((a, b) => b.count - a.count)
		.forEach((d, i) => {
			const row = leg.append("g").attr("transform", `translate(0, ${-i * 14 - 12})`);
			row.append("rect").attr("width", 10).attr("height", 10).attr("rx", 2).attr("fill", typeColor(d.key));
			row.append("text").attr("x", 14).attr("y", 9).attr("fill", "#8b9cb3").style("font-size", "10px").text(`${d.key} (${d.count})`);
		});

	// caption at top explaining slice color encoding
	svg
		.append("text")
		.attr("x", margin.left)
		.attr("y", 12)
		.attr("fill", "#8b9cb3")
		.style("font-size", "10px")
		.text("Legend: segment color = primary type group (see list)");
}

function drawScatter(svg, data) {
	const rect = svg.node().getBoundingClientRect();
	const w = rect.width;
	const h = rect.height;
	const legendW = 112;
	const margin = { top: 28, right: 14 + legendW, bottom: 48, left: 52 };
	const innerW = Math.max(40, w - margin.left - margin.right);
	const innerH = Math.max(40, h - margin.top - margin.bottom);

	const x = d3
		.scaleLinear()
		.domain(d3.extent(data, (d) => d.Attack))
		.nice()
		.range([0, innerW]);
	const y = d3
		.scaleLinear()
		.domain(d3.extent(data, (d) => d.Defense))
		.nice()
		.range([innerH, 0]);

	// plot group translated by margins (standard d3 layout)
	const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

	// x-axis along the bottom
	g.append("g")
		.attr("class", "axis")
		.attr("transform", `translate(0,${innerH})`)
		.call(d3.axisBottom(x).ticks(8));
	// y-axis on the left
	g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(8));

	// x-axis label (attack)
	g.append("text")
		.attr("x", innerW / 2)
		.attr("y", innerH + 40)
		.attr("text-anchor", "middle")
		.attr("fill", "#e8eef5")
		.style("font-size", "12px")
		.text("Attack");

	// rotate y-axis label -90 degrees so it fits in the left margin
	g.append("text")
		.attr("transform", "rotate(-90)")
		.attr("x", -innerH / 2)
		.attr("y", -38)
		.attr("text-anchor", "middle")
		.attr("fill", "#e8eef5")
		.style("font-size", "12px")
		.text("Defense");

	// dots in a separate group so the parallel chart can select .dots on hover
	const dotLayer = g.append("g").attr("class", "dots");

	// each circle is one pokemon; hover highlights the matching parallel-coordinate line
	dotLayer
		.selectAll("circle")
		.data(data, (d) => d.uid)
		.join("circle")
		.attr("cx", (d) => x(d.Attack))
		.attr("cy", (d) => y(d.Defense))
		.attr("r", 3.5)
		.attr("fill", (d) => typeColor(d.typeGroup))
		.attr("fill-opacity", 0.78)
		.attr("stroke", "#0f1419")
		.attr("stroke-width", 0.4)
		.on("mouseenter", function (_event, d) {
			d3.selectAll(".pc-lines path").attr("stroke-opacity", (p) => (p.uid === d.uid ? 1 : 0.04));
			d3.selectAll(".pc-lines path").attr("stroke-width", (p) => (p.uid === d.uid ? 2.2 : 1));
			d3.selectAll(".pc-lines path")
				.filter((p) => p.uid === d.uid)
				.raise();
			d3.select(this).attr("r", 6).attr("stroke-width", 1.2);
		})
		.on("mouseleave", function () {
			d3.selectAll(".pc-lines path").attr("stroke-opacity", 0.16).attr("stroke-width", 1);
			d3.select(this).attr("r", 3.5).attr("stroke-width", 0.4);
		})
		.append("title")
		.text((d) => `${d.name} (${d.type1})\nAtk ${d.Attack}, Def ${d.Defense}`);

	// type legend on the right with colored circles
	const legX = margin.left + innerW + 10;
	const legY = margin.top + 6;
	const leg = svg.append("g").attr("transform", `translate(${legX},${legY})`);
	leg.append("text").attr("fill", "#e8eef5").style("font-size", "11px").style("font-weight", "600").text("Type group");
	const domain = typeColor.domain();
	domain.forEach((tg, i) => {
		const row = leg.append("g").attr("transform", `translate(0,${16 + i * 15})`);
		row.append("circle").attr("r", 5).attr("cx", 5).attr("cy", 0).attr("fill", typeColor(tg));
		row.append("text").attr("x", 14).attr("y", 4).attr("fill", "#8b9cb3").style("font-size", "10px").text(tg);
	});
}

function drawParallel(svg, data) {
	const rect = svg.node().getBoundingClientRect();
	const w = rect.width;
	const h = rect.height;
	const margin = { top: 28, right: 18, bottom: 38, left: 32 };
	const innerW = Math.max(60, w - margin.left - margin.right);
	const innerH = Math.max(60, h - margin.top - margin.bottom);

	// each stat uses its own y-scale because hp and speed have different ranges
	const yScales = {};
	parallelDims.forEach((dim) => {
		yScales[dim] = d3
			.scaleLinear()
			.domain(d3.extent(data, (d) => d[dim]))
			.range([innerH, 0])
			.nice();
	});

	// horizontal position of each vertical axis (six stat columns)
	const xScale = d3.scalePoint().domain(parallelDims).range([0, innerW]).padding(0.48);

	// d3.line connects the six stat values into one path string
	const line = d3
		.line()
		.defined((d) => d[1] != null && !Number.isNaN(d[1]))
		.x((d) => d[0])
		.y((d) => d[1]);

	function pathFor(d) {
		const pts = parallelDims.map((dim) => [xScale(dim), yScales[dim](d[dim])]);
		return line(pts);
	}

	// plot group translated by margins, same as scatter plot
	const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

	// one line per pokemon at low opacity to reduce overplotting
	g.append("g")
		.attr("class", "pc-lines")
		.selectAll("path")
		.data(data, (d) => d.uid)
		.join("path")
		.attr("fill", "none")
		.attr("stroke", (d) => typeColor(d.typeGroup))
		.attr("stroke-opacity", 0.16)
		.attr("stroke-width", 1)
		.attr("d", pathFor)
		.on("mouseenter", function (_event, d) {
			d3.selectAll(".pc-lines path").attr("stroke-opacity", (p) => (p.uid === d.uid ? 1 : 0.04));
			d3.selectAll(".pc-lines path").attr("stroke-width", (p) => (p.uid === d.uid ? 2.2 : 1));
			d3.select(this).raise();
			d3.selectAll(".dots circle")
				.attr("r", (c) => (c.uid === d.uid ? 6 : 3.5))
				.attr("stroke-width", (c) => (c.uid === d.uid ? 1.2 : 0.4));
		})
		.on("mouseleave", () => {
			d3.selectAll(".pc-lines path").attr("stroke-opacity", 0.16).attr("stroke-width", 1);
			d3.selectAll(".dots circle").attr("r", 3.5).attr("stroke-width", 0.4);
		})
		.append("title")
		.text((d) => `${d.name}\n${parallelDims.map((k) => `${dimLabel[k]} ${d[k]}`).join(", ")}`);

	// for each stat column, draw a mini axis and label underneath
	const axisG = g.append("g").attr("class", "axes");
	parallelDims.forEach((dim) => {
		const xv = xScale(dim);
		axisG
			.append("g")
			.attr("class", "axis")
			.attr("transform", `translate(${xv},0)`)
			.call(d3.axisLeft(yScales[dim]).ticks(4).tickFormat(d3.format("~s")));

		axisG
			.append("text")
			.attr("x", xv)
			.attr("y", innerH + 26)
			.attr("text-anchor", "middle")
			.attr("fill", "#e8eef5")
			.style("font-size", "10px")
			.text(dimLabel[dim]);
	});

	// caption: line color is type group; hover is linked to the scatter plot
	svg
		.append("text")
		.attr("x", margin.left)
		.attr("y", 16)
		.attr("fill", "#8b9cb3")
		.style("font-size", "10px")
		.text("Legend: line color = type group (hover links scatter)");
}

function draw() {
	// select the three svg elements from index.html by id
	const svgO = d3.select("#svg-overview");
	const svgS = d3.select("#svg-scatter");
	const svgP = d3.select("#svg-parallel");
	if (processed.length === 0) return;
	clearSvg(svgO);
	clearSvg(svgS);
	clearSvg(svgP);
	drawOverview(svgO, processed);
	drawScatter(svgS, processed);
	drawParallel(svgP, processed);
}

// load csv over http (live server), build color scale, draw; debounce redraw on resize
d3.csv(DATA_URL)
	.then((raw) => {
		processed = prepareRows(raw);
		typeColor = buildTypeColorScale(processed);
		draw();
		requestAnimationFrame(() => draw());
		d3.select(window).on("resize", debouncedDraw);
	})
	.catch((err) => {
		console.error(err);
		// on load failure (wrong path or file://), show an error message on the page
		d3.select("body")
			.append("div")
			.style("padding", "24px")
			.style("color", "#ffb4b4")
			.text(
				`Couldn't load ${DATA_URL} — make sure the csv is in the data folder and you're using Live Server (not opening the html file directly).`
			);
	});
