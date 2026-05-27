const DATA_URL = "data/pokemon_alopez247.csv"; // kaggle csv used in hw2 as base for hw3 interactions

const TYPE_TOP_N = 10;
const TRANSITION_MS = 550;

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

// dashboard state: type selection (overview) and brushed ids (focus view)
const state = {
	selectedTypes: new Set(),
	brushedIds: new Set(),
	hoveredId: null,
};

// keep references to chart internals so interactions can update views without full redraw
const chart = {
	overview: {},
	scatter: {},
	parallel: {},
};

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
	const counts = d3.rollups(rows, (v) => v.length, (d) => d.typeGroup).sort((a, b) => b[1] - a[1]);
	const domain = counts.map((d) => d[0]);
	const scheme = d3.schemeTableau10.concat(d3.schemeCategory10);
	return d3.scaleOrdinal().domain(domain).range(domain.map((_, i) => scheme[i % scheme.length]));
}

// clean csv strings and add uid to match scatter points with parallel-coordinate paths on hover
// group rare types as "other" so the donut does not have too many small slices
function prepareRows(raw) {
	const parsed = raw.map((d, i) => {
		const type1 = String(d.Type_1 ?? "").trim().replace(/^"+|"+$/g, "");
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

	const counts = d3.rollups(parsed, (v) => v.length, (d) => d.type1).sort((a, b) => b[1] - a[1]);
	const top = new Set(counts.slice(0, TYPE_TOP_N).map((d) => d[0]));
	return parsed.map((d) => ({ ...d, typeGroup: top.has(d.type1) ? d.type1 : "Other" }));
}

function isTypeVisible(d) {
	return state.selectedTypes.size === 0 || state.selectedTypes.has(d.typeGroup);
}

function isPointBrushed(d) {
	return state.brushedIds.size > 0 && state.brushedIds.has(d.uid);
}

// helper for linked highlight from hover or brush
function isHighlighted(d) {
	if (state.hoveredId != null) return d.uid === state.hoveredId;
	if (state.brushedIds.size > 0) return state.brushedIds.has(d.uid);
	return false;
}

// opacity for scatter dots: type filter fades non-matching types; brush fades non-brushed points
function scatterOpacity(d) {
	if (!isTypeVisible(d)) return 0.08;
	if (state.brushedIds.size > 0) return isPointBrushed(d) ? 1 : 0.1;
	return 1;
}

function toggleType(typeKey) {
	if (state.selectedTypes.has(typeKey)) state.selectedTypes.delete(typeKey);
	else state.selectedTypes.add(typeKey);
	applyFiltersAndHighlights(true);
}

function clearTypeSelection() {
	state.selectedTypes.clear();
	applyFiltersAndHighlights(true);
}

function clearBrushSelection() {
	state.brushedIds.clear();
	if (chart.scatter.brushLayer && chart.scatter.brush) {
		chart.scatter.brushLayer.call(chart.scatter.brush.move, null);
	}
	applyFiltersAndHighlights(true);
}

function drawOverview(svg, data) {
	const rect = svg.node().getBoundingClientRect();
	const w = rect.width;
	const h = rect.height;
	const margin = { top: 36, right: 12, bottom: 8, left: 12 };
	const innerW = Math.max(0, w - margin.left - margin.right);
	const innerH = Math.max(0, h - margin.top - margin.bottom);
	const cx = margin.left + innerW / 2;
	const cy = margin.top + innerH / 2;
	const r = Math.max(44, Math.min(innerW, innerH) / 2) - 8;

	// count rows per type group; each count becomes one pie slice
	const pieData = d3
		.rollups(data, (v) => v.length, (d) => d.typeGroup)
		.map(([key, count]) => ({ key, count }));

	const pie = d3.pie().sort(null).value((d) => d.count);
	const arc = d3.arc().innerRadius(r * 0.52).outerRadius(r);

	// center the donut group in the panel
	const g = svg.append("g").attr("transform", `translate(${cx},${cy})`);

	// each slice is a path with type fill color; click selects type groups for focus views
	const slices = g
		.selectAll("path.slice")
		.data(pie(pieData))
		.join("path")
		.attr("class", "slice")
		.attr("fill", (d) => typeColor(d.data.key))
		.attr("stroke", "#0f1419")
		.attr("stroke-width", 1.2)
		.attr("d", arc)
		.style("cursor", "pointer")
		.on("click", (_event, d) => toggleType(d.data.key));

	// title element provides the hover tooltip on each slice
	slices.append("title").text((d) => `${d.data.key}: ${d.data.count} Pokemon (click to filter)`);

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

	// caption at top explaining slice color encoding (short line for narrow overview column)
	svg
		.append("text")
		.attr("x", margin.left)
		.attr("y", 14)
		.attr("fill", "#8b9cb3")
		.style("font-size", "10px")
		.text("color = primary type group");

	// clickable text on its own row so it does not overlap the caption
	svg
		.append("text")
		.attr("class", "clear-filter")
		.attr("x", margin.left)
		.attr("y", 26)
		.attr("fill", "#9cc9ff")
		.style("font-size", "10px")
		.style("cursor", "pointer")
		.text("clear type filter")
		.on("click", clearTypeSelection);

	chart.overview = { slices };
}

function drawScatter(svg, data) {
	const rect = svg.node().getBoundingClientRect();
	const w = rect.width;
	const h = rect.height;
	const legendW = 112;
	const margin = { top: 28, right: 14 + legendW, bottom: 48, left: 52 };
	const innerW = Math.max(40, w - margin.left - margin.right);
	const innerH = Math.max(40, h - margin.top - margin.bottom);

	const x0 = d3.scaleLinear().domain(d3.extent(data, (d) => d.Attack)).nice().range([0, innerW]);
	const y0 = d3.scaleLinear().domain(d3.extent(data, (d) => d.Defense)).nice().range([innerH, 0]);
	const x = x0.copy();
	const y = y0.copy();

	// plot group translated by margins (standard d3 layout)
	const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

	// x-axis along the bottom
	const xAxisG = g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x).ticks(8));
	// y-axis on the left
	const yAxisG = g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(8));

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

	const clipId = `scatter-clip-${Math.random().toString(36).slice(2)}`;
	// clip path keeps points inside the plot while zooming
	svg.append("defs").append("clipPath").attr("id", clipId).append("rect").attr("x", margin.left).attr("y", margin.top).attr("width", innerW).attr("height", innerH);

	// dots in a separate group so brush and parallel chart can target .dots
	const dotLayer = g.append("g").attr("class", "dots").attr("clip-path", `url(#${clipId})`);

	// each circle is one pokemon; hover and brush link to the parallel-coordinate lines
	const dots = dotLayer
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
			state.hoveredId = d.uid;
			applyFiltersAndHighlights(false);
			d3.select(this).raise();
		})
		.on("mouseleave", () => {
			state.hoveredId = null;
			applyFiltersAndHighlights(false);
		});

	dots.append("title").text((d) => `${d.name} (${d.type1})\nAtk ${d.Attack}, Def ${d.Defense}`);

	// brush selects a rectangular subset of points in attack-defense space
	const brush = d3
		.brush()
		.extent([
			[0, 0],
			[innerW, innerH],
		])
		.on("brush end", (event) => {
			if (!event.selection) {
				state.brushedIds.clear();
				applyFiltersAndHighlights(true);
				return;
			}
			const [[x0b, y0b], [x1b, y1b]] = event.selection;
			const selected = data.filter((d) => {
				const cx = x(d.Attack);
				const cy = y(d.Defense);
				return cx >= x0b && cx <= x1b && cy >= y0b && cy <= y1b;
			});
			state.brushedIds = new Set(selected.map((d) => d.uid));
			applyFiltersAndHighlights(true);
		});

	// brush overlay sits above the zoom layer so drag-to-brush still works
	const brushLayer = g.append("g").attr("class", "brush-layer").call(brush);

	// zoom rescales axes and point positions (view transition); wheel zoom, shift-drag to pan
	const zoom = d3
		.zoom()
		.scaleExtent([1, 6])
		.translateExtent([
			[0, 0],
			[innerW, innerH],
		])
		.extent([
			[0, 0],
			[innerW, innerH],
		])
		.filter((event) => event.type === "wheel" || (event.type === "mousedown" && event.shiftKey))
		.on("zoom", (event) => {
			const transform = event.transform;
			const zx = transform.rescaleX(x0);
			const zy = transform.rescaleY(y0);
			x.domain(zx.domain());
			y.domain(zy.domain());
			xAxisG.transition().duration(120).call(d3.axisBottom(x).ticks(8));
			yAxisG.transition().duration(120).call(d3.axisLeft(y).ticks(8));
			dots.transition().duration(120).attr("cx", (d) => x(d.Attack)).attr("cy", (d) => y(d.Defense));
		});

	// attach zoom to the plot group; brush layer stays on top for normal drag selection
	g.call(zoom);
	brushLayer.raise();

	// annotation showing how many types or points are currently selected
	const summary = g
		.append("text")
		.attr("class", "filter-summary")
		.attr("x", 4)
		.attr("y", -6)
		.attr("fill", "#9cc9ff")
		.style("font-size", "10px")
		.text("");

	// clickable text to clear the brush selection
	g.append("text")
		.attr("class", "clear-brush")
		.attr("x", innerW - 4)
		.attr("y", -6)
		.attr("text-anchor", "end")
		.attr("fill", "#9cc9ff")
		.style("font-size", "10px")
		.style("cursor", "pointer")
		.text("Clear brush")
		.on("click", clearBrushSelection);

	// type legend on the right with colored circles
	const leg = svg.append("g").attr("transform", `translate(${margin.left + innerW + 10},${margin.top + 6})`);
	leg.append("text").attr("fill", "#e8eef5").style("font-size", "11px").style("font-weight", "600").text("Type group");
	typeColor.domain().forEach((tg, i) => {
		const row = leg.append("g").attr("transform", `translate(0,${16 + i * 15})`);
		row.append("circle").attr("r", 5).attr("cx", 5).attr("cy", 0).attr("fill", typeColor(tg));
		row.append("text").attr("x", 14).attr("y", 4).attr("fill", "#8b9cb3").style("font-size", "10px").text(tg);
	});

	chart.scatter = { dots, brush, brushLayer, summary };
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
		yScales[dim] = d3.scaleLinear().domain(d3.extent(data, (d) => d[dim])).range([innerH, 0]).nice();
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
	const lines = g
		.append("g")
		.attr("class", "pc-lines")
		.selectAll("path")
		.data(data, (d) => d.uid)
		.join("path")
		.attr("fill", "none")
		.attr("stroke", (d) => typeColor(d.typeGroup))
		.attr("stroke-opacity", 0.17)
		.attr("stroke-width", 1)
		.attr("d", pathFor)
		.on("mouseenter", function (_event, d) {
			state.hoveredId = d.uid;
			applyFiltersAndHighlights(false);
			d3.select(this).raise();
		})
		.on("mouseleave", () => {
			state.hoveredId = null;
			applyFiltersAndHighlights(false);
		});

	lines.append("title").text((d) => `${d.name}\n${parallelDims.map((k) => `${dimLabel[k]} ${d[k]}`).join(", ")}`);

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

	// caption: line color is type group; hover and brush are linked to the scatter plot
	svg
		.append("text")
		.attr("x", margin.left)
		.attr("y", 16)
		.attr("fill", "#8b9cb3")
		.style("font-size", "10px")
		.text("Legend: line color = type group (hover/brush links scatter)");

	chart.parallel = { lines };
}

// apply type filter and brush highlight with optional animated transitions
function applyFiltersAndHighlights(animated) {
	if (!chart.scatter.dots || !chart.parallel.lines) return;
	const t = animated ? d3.transition().duration(TRANSITION_MS).ease(d3.easeCubicInOut) : null;

	const scatterSel = t ? chart.scatter.dots.transition(t) : chart.scatter.dots;
	scatterSel
		.attr("opacity", (d) => scatterOpacity(d))
		.attr("r", (d) => (isHighlighted(d) ? 6 : isPointBrushed(d) ? 5.4 : 3.5))
		.attr("stroke-width", (d) => (isHighlighted(d) || isPointBrushed(d) ? 1.2 : 0.4));

	const lineSel = t ? chart.parallel.lines.transition(t) : chart.parallel.lines;
	lineSel
		.attr("stroke-opacity", (d) => {
			if (!isTypeVisible(d)) return 0.03;
			if (isHighlighted(d)) return 1;
			if (state.brushedIds.size > 0) return isPointBrushed(d) ? 0.85 : 0.05;
			return 0.17;
		})
		.attr("stroke-width", (d) => (isHighlighted(d) ? 2.4 : isPointBrushed(d) ? 2 : 1));

	// donut slices show which type groups are part of the active filter
	if (chart.overview.slices) {
		const sliceSel = t ? chart.overview.slices.transition(t) : chart.overview.slices;
		sliceSel
			.attr("stroke-width", (d) => (state.selectedTypes.has(d.data.key) ? 2.6 : 1.2))
			.attr("opacity", (d) => (state.selectedTypes.size === 0 || state.selectedTypes.has(d.data.key) ? 1 : 0.35));
	}

	// annotation summarizing active filters for the user
	if (chart.scatter.summary) {
		const parts = [];
		if (state.selectedTypes.size > 0) parts.push(`${state.selectedTypes.size} type group(s) selected`);
		if (state.brushedIds.size > 0) parts.push(`${state.brushedIds.size} pokemon brushed`);
		const msg = parts.length ? parts.join(" · ") : "No filter active — click overview or brush scatter";
		const summarySel = t ? chart.scatter.summary.transition(t) : chart.scatter.summary;
		summarySel.text(msg);
	}
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
	applyFiltersAndHighlights(false);
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
			.text(`Couldn't load ${DATA_URL} — make sure the csv is in the data folder and you're using Live Server (not opening the html file directly).`);
	});
