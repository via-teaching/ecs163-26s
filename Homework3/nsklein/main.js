let abFilter = 25;
const width = window.innerWidth;
const height = window.innerHeight;
const textSize = width / 120;

//Define each charts dimensions and margins
let pSetLeft = 0,
	pSetTop = 0;
let pSetMargin = { top: 30, right: 30, bottom: 30, left: 60 },
	pSetWidth = width - pSetMargin.left - pSetMargin.right,
	pSetHeight = height / 2 - pSetMargin.top - pSetMargin.bottom;

let barMargin = { top: 30, right: 30, bottom: 50, left: 60 },
	barWidth = width / 2 - barMargin.left - barMargin.right,
	barHeight = height / 2 - barMargin.top - barMargin.bottom;
let barLeft = 0,
	barTop = pSetHeight + pSetMargin.bottom + barMargin.top;

let scatterLeft = width / 2,
	scatterTop = pSetHeight + pSetMargin.bottom;
let scatterMargin = { top: 40, right: 30, bottom: 30, left: 60 },
	scatterWidth = width / 2 - scatterMargin.left - scatterMargin.right,
	scatterHeight = height / 2 - scatterMargin.top - scatterMargin.bottom;

// plots
d3.csv("data/student-mat.csv")
	.then((rawData) => {
		//CONVERT NUMERICAL DATA TO NUMERIC TYPE

		rawData.forEach(function (d) {
			d.age = Number(d.age);
			d.Dalc = Number(d.Dalc);
			d.Walc = Number(d.Walc);
			d.G1 = Number(d.G1);
			d.G2 = Number(d.G2);
			d.G3 = Number(d.G3);
			d.absences = Number(d.absences);
			d.freetime = Number(d.freetime);
			d.goout = Number(d.goout);
			d.famrel = Number(d.famrel);
			d.health = Number(d.health);
		});

		//CREATE NEW OBJECT CONTAINING ONLY DATA BEING USED FOR CHARTS

		const processedData = rawData.map((d) => {
			return {
				age: d["age"],
				sex: d["sex"],
				pstat: d["Pstatus"],
				famsize: d["famsize"],
				address: d["address"],
				schoolsup: d["schoolsup"],
				famsup: d["famsup"],
				famrel: d["famrel"],
				dalc: d["Dalc"],
				walc: d["Walc"],
				health: d["health"],
				absences: d["absences"],
				g1: d["G1"],
				g2: d["G2"],
				g3: d["G3"],
				freetime: d["freetime"],
				goout: d["goout"],
				average_grade: (d.G1 + d.G2 + d.G3) / 3,
			};
		});

		//CREATE GROUPS OF DATA ACCORDING TO DIFFERENT STUDENT ATTRIBUTEs FOR PSET PLOT
		//d3.flatGroup gets an array of students corresponding to each combination of attributes

		//Source: I used google to learn more about the flatGroup function in d3
		let pSetData = d3.flatGroup(
			processedData,
			(d) => d.sex,
			(d) => d.famsize,
			(d) => d.famsup,
			(d) => d.schoolsup,
		);

		pSetData = Array.from(
			pSetData,
			([sex, famsize, famsup, schoolsup, Items]) => ({
				sex,
				famsize,
				famsup,
				schoolsup,
				Items,
				Count: Items.length,
			}),
		);

		//CREATE SVG

		//SOURCE: https://medium.com/@louisemoxy/a-simple-way-to-make-d3-js-charts-svgs-responsive-7afb04bc2e4b
		// 		  I also used google and it's automatic AI summary to learn how to
		// 		  dynamically resize the view when the window changes

		const svg = d3
			.select("svg")
			.attr("viewBox", `0 0 ${width} ${height}`)
			.attr("width", "100%")
			.attr("height", "100%");

		//CREATE DATA STRUCTURES FOR THE PSET PLOT
		//SOURCE: https://observablehq.com/@d3/parallel-sets

		const keys = Object.keys(pSetData[0]).slice(0, -2);
		let index = -1;
		const graph_nodes = [];
		const nodeByKey = new d3.InternMap([], JSON.stringify);
		const indexByKey = new d3.InternMap([], JSON.stringify);
		const graph_links = [];

		//POPULATE ALL NODES FOR PSET PLOT

		for (const k of keys) {
			for (const d of pSetData) {
				const key = [k, d[k]];
				if (nodeByKey.has(key)) continue;
				const node = { name: d[k] };
				graph_nodes.push(node);
				nodeByKey.set(key, node);
				indexByKey.set(key, ++index);
			}
		}

		//DEFINE LINKS BETWEEN NODES

		const itemsMap = new Map();
		for (let i = 1; i < keys.length; i++) {
			const a = keys[i - 1];
			const b = keys[i];
			const prefix = keys.slice(0, i + 1);
			const linkByKey = new d3.InternMap([], JSON.stringify);
			for (const d of pSetData) {
				const names = prefix.map((k) => d[k]);
				const items = d.Items;
				if (itemsMap.has(names.join(" ")) == false) {
					itemsMap.set(names.join(" "), items);
				} else {
					const currentItems = itemsMap.get(names.join(" "));
					itemsMap.set(names.join(" "), currentItems.concat(items));
				}
				const value = d.Count || 1;
				let link = linkByKey.get(names);
				if (link) {
					link.value += value;
					continue;
				}
				link = {
					source: indexByKey.get([a, d[a]]),
					target: indexByKey.get([b, d[b]]),
					names,
					value,
				};
				graph_links.push(link);
				linkByKey.set(names, link);
			}
		}

		//CREATE VARIABLE TO KEEP TRACK OF DATA THAT IS CURRENTLY SELECTED

		let selectedData = processedData;

		//CREATE PSET PLOT USING d3 sankey library

		//used google's automatic AI summary to learn how to sort nodes by their names
		const sankey = d3
			.sankey()
			.nodeSort((a, b) => a.name.localeCompare(b.name))
			.linkSort(null)
			.nodeWidth(10)
			.nodePadding(10)
			.size([pSetWidth, pSetHeight]);

		//CREATE COLOR SCALE

		const pSetColor = d3
			.scaleOrdinal()
			.domain(graph_nodes.slice(0, 4))
			.range(d3.schemeSet3);

		//CREATE PSET PLOT GROUP

		const g1 = svg
			.append("g")
			.attr("width", pSetWidth + pSetMargin.left + pSetMargin.right)
			.attr("height", pSetHeight + pSetMargin.top + pSetMargin.bottom)
			.attr("transform", `translate(${pSetMargin.left}, ${pSetMargin.top})`);

		//CALL SANKEY TO GET NODES AND LINKS

		const { nodes, links } = sankey({
			nodes: graph_nodes.map((d) => Object.create(d)),
			links: graph_links.map((d) => Object.create(d)),
		});

		//BUTTON TO RESET SELECTED DATA BACK TO ORIGINAL DATA

		const button = svg
			.append("g")
			.attr("class", "button")
			.style("cursor", "pointer")

			.on("click", () => {
				selectedData = processedData;
				change();
			});

		button
			.append("rect")
			.attr("x", 5)
			.attr("y", 10)
			.attr("width", 50)
			.attr("height", 20)
			.attr("fill", "grey");

		button
			.append("text")
			.attr("x", 25)
			.attr("y", 26)
			.attr("text-anchor", "middle")
			.attr("fill", "white")
			.text("Reset");

		//APPEND PSET PLOT NODES AS RECTANGLES

		g1.append("g")
			.selectAll("rect")
			.data(nodes)
			.join("rect")
			.attr("x", (d) => d.x0)
			.attr("y", (d) => d.y0)
			.attr("height", (d) => d.y1 - d.y0)
			.attr("width", (d) => d.x1 - d.x0);

		//ADD PSET PLOT LINKS BETWEEN NODES

		g1.append("g")
			.attr("fill", "none")
			.selectAll("g")
			.data(links)
			.join("path")
			.attr("d", d3.sankeyLinkHorizontal())
			.attr("stroke", (d) => pSetColor(d.names[0]))
			.attr("stroke-width", (d) => d.width)
			.attr("stroke-opacity", 0.5)
			.style("mix-blend-mode", "multiply")
			.on("mouseenter", function (event, line) {
				d3.select(this).attr("stroke", "black").attr("stroke-opacity", 0.35);
			})
			.on("mouseleave", function (event, line) {
				d3.select(this)
					.attr("stroke", (d) => pSetColor(d.names[0]))
					.attr("stroke-opacity", 0.5);
			})
			.on("mousedown", function (event, line) {
				const names = line.names;
				selectedData = itemsMap.get(names.join(" "));
				console.log("line", line);
				change();
			})
			.append("title")
			.text((d) => `${d.names.join(" + ")}\n${d.value.toLocaleString()}`);

		//ADD NODE AND AXES LABELS

		g1.append("g")
			.selectAll("text")
			.data(nodes)
			.join("text")
			.attr("x", (d) => (d.x0 < pSetWidth / 2 ? d.x1 + 10 : d.x0 - 10))
			.attr("y", (d) => (d.y1 + d.y0) / 2)
			.attr("dy", "0.35em")
			.attr("font-size", textSize)
			.attr("text-anchor", (d) => (d.x0 < pSetWidth / 2 ? "start" : "end"))
			.text((d) => d.name);

		g1.append("g")
			.selectAll("text")
			.data(nodes)
			.join("text")
			.attr("x", (d) => (d.x0 < pSetWidth / 2 ? d.x1 - 10 : d.x0 + 10))
			.attr("y", pSetHeight + 10)
			.attr("dy", "0.35em")
			.attr("font-size", textSize)
			.attr("text-anchor", (d) => (d.x0 < pSetWidth / 2 ? "start" : "end"))
			.text((d) => {
				if (d.index == 0) {
					return "Sex";
				} else if (d.index == 2) {
					return "Family Size";
				} else if (d.index == 4) {
					return "Family Support";
				} else if (d.index == 6) {
					return "School Support";
				} else {
					return null;
				}
			});

		//CREATE BAR CHART GROUP

		const g2 = svg
			.append("g")
			.attr("width", barWidth + barMargin.left + barMargin.right)
			.attr("height", barHeight + barMargin.top + barMargin.bottom)
			.attr(
				"transform",
				`translate(${barLeft + barMargin.left}, ${barTop + barMargin.top})`,
			);

		//DEFINE COLOR SCALE FOR DALC RANKINGS

		const dalcRankColor = d3
			.scaleSequential(["lightblue", d3.color("steelblue").darker(2)])
			.domain([1, 5]);

		//GROUP DATA ACCORDING TO DALC RANKINGS FOR BAR CHART

		function getBarData(data) {
			let barData = d3.rollup(
				data,
				(oldData) => ({
					count: oldData.length,
				}),
				(d) => d.dalc,
			);

			ranks = [1, 2, 3, 4, 5];
			ranks.map((d) => {
				if (barData.get(d) == null) {
					barData.set(d, { count: 0 });
				}
			});

			barData = Array.from(barData, ([rank, { count }]) => ({
				rank,
				count,
			}));
			barData.sort((a, b) => a.rank - b.rank);
			return barData;
		}

		barData = getBarData(selectedData);

		//CREATE X AXIS FOR BAR CHART

		const xBar = d3
			.scaleBand()
			.domain(barData.map((d) => d.rank))
			.range([0, barWidth]);
		const xBarCall = d3.axisBottom(xBar).ticks(5);

		g2.append("g")
			.attr("transform", `translate(0, ${barHeight})`)
			.call(xBarCall)
			.selectAll("text")
			.attr("y", "10")
			.attr("x", "-5")
			.attr("text-anchor", "end")
			.attr("transform", "rotate(-40)");

		//CREATE Y AXIS FOR BAR CHART

		const yBar = d3
			.scaleLinear()
			.domain([0, d3.max(getBarData(selectedData), (d) => d.count)])
			.range([barHeight, 0]);

		const yBarCall = d3.axisLeft(yBar);
		g2.append("g").attr("class", "yAxis").call(yBarCall);

		//ADD BARS TO CHART USING BARDATA TO SET HEIGHTS AND COLOR THEM USING THE COLOR SCALE

		let rect = g2
			.append("g")
			.classed("bar", true)
			.selectAll("rect")
			.data(barData)
			.join("rect")
			.attr("x", (d) => xBar(d.rank))
			.attr("y", (d) => yBar(d.count))
			.attr("width", xBar.bandwidth())
			.attr("height", (d) => barHeight - yBar(d.count))
			.style("fill", (d) => dalcRankColor(d.rank));

		//CREATE SCATTER PLOT GROUP
		//SOURCE: https://observablehq.com/@d3/brushable-scatterplot
		// 		  https://observablehq.com/d/54d15cc9842b00ba

		const g3 = svg
			.append("g")
			.attr("width", scatterWidth + scatterMargin.left + scatterMargin.right)
			.attr("height", scatterHeight + scatterMargin.top + scatterMargin.bottom)
			.attr(
				"transform",
				`translate(${scatterLeft + scatterMargin.left}, ${scatterTop + scatterMargin.bottom})`,
			);

		//CREATE NEW OBJECT CONTAINING ONLY DATA NEEDED FOR SCATTER PLOT

		function getScatterData(data) {
			const scatterData = data.map((d) => {
				return {
					dalc: d["dalc"],
					walc: d["walc"],
					health: d["health"],
					absences: d["absences"],
					average_grade: d["average_grade"],
					famrel: d["famrel"],
					freetime: d["freetime"],
					goout: d["goout"],
				};
			});
			scatterData.sort((a, b) => a.average_grade - b.average_grade);

			return scatterData;
		}
		scatterData = getScatterData(processedData);

		//CREATE X AXIS FOR SCATTER PLOT

		const xScatter = d3
			.scaleLinear()
			.domain([0, d3.max(scatterData, (d) => d["absences"])])
			.nice()
			.range([0, scatterWidth - scatterMargin.right]);

		const xScatterCall = d3.axisBottom(xScatter);

		//CREATE Y AXIS FOR SCATTER PLOT

		const yScatter = d3
			.scaleLinear()
			.domain([0, d3.max(scatterData, (d) => d.average_grade)])
			.nice()
			.range([scatterHeight, scatterMargin.top]);

		const yScatterCall = d3.axisLeft(yScatter);

		g3.append("g")
			.attr("transform", `translate(0, ${scatterHeight})`)
			.call(xScatterCall)
			.selectAll("text")
			.attr("y", "10")
			.attr("x", "-5")
			.attr("text-anchor", "end")
			.attr("transform", "rotate(-40)");

		g3.append("g").call(yScatterCall);

		//ADD DOTS TO SCATTER PLOT ACCORDING TO SCATTER DATA AND COLOR
		//USING THE SAME COLOR SCALE AS BARCHART

		const dot = g3
			.append("g")
			.style("fill", "black")
			// .attr("opacity", 1)
			.selectAll("circle")
			.data(scatterData)
			.join("circle")
			.attr("fill", (d) => dalcRankColor(d.dalc))
			.attr(
				"transform",
				(d) =>
					`translate(${xScatter(d.absences)}, ${yScatter(d.average_grade)})`,
			)
			.attr("r", 3);

		//GET THE AVERAGES OF THE BRUSHED DATA

		function getScatterText(data) {
			let textData = d3.rollup(data, (oldData) => ({
				total_average_grade: d3.mean(oldData, (d) => d.average_grade),
				average_absences: d3.mean(oldData, (d) => d.absences),
			}));
			return textData;
		}

		const textData = getScatterText(scatterData);

		//CREATE TEXT ELEMENTS TO DISPLAY THE SELECTED DATA SUMMARY

		let brushedTextTitle = g3
			.selectAll("g")
			.append("text")
			.attr("x", scatterWidth * 0.75)
			.attr("y", scatterHeight * 0.3)
			.attr("text-anchor", "middle")
			.attr("font-size", textSize)
			.text("Selection Summary");
		let brushedTextTitle2 = g3
			.selectAll("g")
			.append("text")
			.attr("x", scatterWidth * 0.75)
			.attr("y", scatterHeight * 0.3 + textSize)
			.attr("text-anchor", "middle")
			.attr("font-size", textSize)
			.text("(Brush to Select)");
		let brushedTextHealth = g3
			.selectAll("g")
			.append("text")
			.attr("x", scatterWidth * 0.75)
			.attr("y", scatterHeight * 0.3 + 2 * textSize)
			.attr("text-anchor", "middle")
			.attr("font-size", textSize)
			.text(
				`Average Grade: ${Math.round(textData.total_average_grade * 100) / 100}`,
			);
		let brushedTextGoout = g3
			.selectAll("g")
			.append("text")
			.attr("x", scatterWidth * 0.75)
			.attr("y", scatterHeight * 0.3 + 3 * textSize)
			.attr("text-anchor", "middle")
			.attr("font-size", textSize)
			.text(
				`Average Number of Absences: ${Math.round(textData.average_absences * 100) / 100}`,
			);

		//ADD BRUSH FEATURE
		//SOURCE: https://observablehq.com/@d3/brushable-scatterplot

		g3.call(
			d3.brush().on("start brush end", ({ selection }) => {
				let value = [];
				if (selection) {
					const [[x0, y0], [x1, y1]] = selection;
					value = g3
						.selectAll("circle")
						.style("fill", (d) => dalcRankColor(d.dalc))
						.filter(
							(d) =>
								x0 <= xScatter(d.absences) &&
								xScatter(d.absences) < x1 &&
								y0 <= yScatter(d.average_grade) &&
								yScatter(d.average_grade) < y1,
						)
						.style("fill", "black")
						.data();
					brushedData = getScatterText(value);
					brushedTextHealth.text(
						`Average Grade: ${Math.round(brushedData.total_average_grade * 100) / 100}`,
					);
					brushedTextGoout.text(
						`Average Number of Absences: ${Math.round(brushedData.average_absences * 100) / 100}`,
					);
				} else {
					brushedData = getScatterText(selectedData);
					brushedTextHealth.text(
						`Average Grade: ${Math.round(brushedData.total_average_grade * 100) / 100}`,
					);
					brushedTextGoout.text(
						`Average Number of Absences: ${Math.round(brushedData.average_absences * 100) / 100}`,
					);
					dot.style("fill", (d) => dalcRankColor(d.dalc));
				}
				console.log("brushed: ", value);
			}),
		);

		//ADD TITLE FOR PSET PLOT

		g1.append("text")
			.attr("x", pSetWidth / 2)
			.attr("y", pSetTop - 10)
			.attr("text-anchor", "middle")
			.attr("font-size", textSize)
			.text(
				"Diagram Representing Different Groups of Students (click linkages to interact)",
			);

		//ADD TITLE AND AXIS LABELS FOR BAR CHART

		g2.append("text")
			.attr("x", -pSetHeight / 2)
			.attr("y", -30)
			.attr("transform", "rotate(-90)")
			.attr("text-anchor", "middle")
			.attr("font-size", textSize)
			.text("Number of Students");

		g2.append("text")
			.attr("x", barWidth / 2)
			.attr("y", barHeight + barMargin.bottom * 0.75)
			.attr("text-anchor", "middle")
			.attr("font-size", textSize)
			.text("Amount of Alcohol Consumption (out of 5)");

		g2.append("text")
			.attr("x", barWidth / 2)
			.attr("y", -15)
			.attr("text-anchor", "middle")
			.attr("font-size", textSize)
			.text("Amount of Alcohol Consumption During the Work Week for Students");

		//ADD TITLE AND AXIS LABELS FOR SCATTER PLOT

		g3.select("g")
			.append("text")
			.attr("font-family", "Times New Roman")
			.attr("x", scatterHeight / 2)
			.attr("y", -40)
			.attr("transform", "rotate(-90)")
			.attr("text-anchor", "middle")
			.attr("font-size", textSize)
			.attr("fill", "black")
			.text("Average Math Class Grade Compared to Absences");

		g3.select("g")
			.append("text")
			.attr("font-family", "Times New Roman")
			.attr("x", scatterWidth / 2)
			.attr("y", 50)
			.attr("text-anchor", "middle")
			.attr("font-size", textSize)
			.attr("fill", "black")
			.text("Absences");

		g3.select("g")
			.append("text")
			.attr("font-family", "Times New Roman")
			.attr("x", scatterWidth / 2)
			.attr("y", -scatterHeight + 20)
			.attr("text-anchor", "middle")
			.attr("font-size", textSize)
			.attr("fill", "black")
			.text("Average Math Class Grade Compared to Absences");

		//ADD SOURCES NOTE

		svg
			.select("g")
			.append("text")
			.attr("x", width - 175)
			.attr("y", -20)
			.attr("text-anchor", "middle")
			.attr("font-size", textSize * 0.9)
			.text("*See canvas submission comment for references*");

		//CREATE LEGEND

		const legend = g2
			.append("g")
			.attr("transform", `translate(${barWidth * 0.9}, ${barHeight * 0.1})`);

		//ADD DOTS TO SHOW RANKS ACCORDING TO COLOR SCALE

		legend
			.selectAll("circle")
			.data([1, 2, 3, 4, 5])
			.join("circle")
			.attr("cx", 0)
			.attr("cy", (d, i) => i * textSize * 2)
			.attr("r", textSize / 2.5)
			.style("fill", (d) => dalcRankColor(d));

		//ADD RANKS TEXT

		legend
			.selectAll("text")
			.data([1, 2, 3, 4, 5])
			.join("text")
			.attr("x", 10)
			.attr("y", (d, i) => i * textSize * 2 + 3)
			.attr("font-size", textSize)
			.text((d) => d);

		//ADD LEGEND TITLES

		legend
			.append("text")
			.attr("x", 0)
			.attr("y", -textSize * 2)
			.attr("text-anchor", "middle")
			.attr("font-size", textSize)
			.text("Legend Applies to Bar and Scatter Chart");
		legend
			.append("text")
			.attr("x", 0)
			.attr("y", -textSize)
			.attr("text-anchor", "middle")
			.attr("font-size", textSize)
			.text("Ranks: 1=very low to 5=very high");

		//DEFINE FUNCTION WHEN PSET PLOT IS INTERACTED WITH AND SELECTED DATA CHANGES
		//ADJUSTS THE DATA PASSED TO THE BAR AND SCATTER CHART TO BE THE SUBSET OF DATA SELECTED
		//WHEN THE USER INTERACTS WITH THE PSET PLOT
		//SOURCE:https://www.d3indepth.com/enterexit/

		function change() {
			// console.log("bar:", getBarData(selectedData));
			// console.log("scatter:", getScatterData(selectedData));
			yBar.domain([0, d3.max(getBarData(selectedData), (d) => d.count)]);
			g2.selectAll(".yAxis").transition().duration(1500).call(yBarCall);
			g2.selectAll("rect")
				.data(getBarData(selectedData))
				.join("rect")
				.transition()
				.duration(1500)
				.attr("y", (d) =>
					yBar(d.count) < 0 ? -1 * yBar(d.count) : yBar(d.count),
				)
				.attr("height", (d) => barHeight - yBar(d.count));
			const dots = g3
				.selectAll("circle")
				.data(getScatterData(selectedData), (d) => d.id)
				.join(
					function (enter) {
						return enter
							.append("circle")
							.transition()
							.delay(1000)
							.duration(1000)
							.attr(
								"transform",
								(d) =>
									`translate(${xScatter(d.absences)}, ${yScatter(d.average_grade)})`,
							)
							.attr("r", 3)
							.attr("fill", (d) => dalcRankColor(d.dalc));
					},
					function (update) {
						return update
							.transition()
							.duration(1000)
							.attr("r", 0)
							.attr("transform", (d) => `translate(0, 0)`)
							.transition()
							.duration(1000)
							.attr(
								"transform",
								(d) =>
									`translate(${xScatter(d.absences)}, ${yScatter(d.average_grade)})`,
							)
							.attr("r", 3)
							.attr("fill", (d) => dalcRankColor(d.dalc));
					},
					function (exit) {
						return exit
							.transition()
							.duration(1000)
							.attr("transform", (d) => `translate(0, 0)`)
							.attr("r", 0)
							.attr("fill", (d) => dalcRankColor(d.dalc))
							.style("opacity", 0)
							.remove();
					},
				);
			brushedData = getScatterText(selectedData);
			brushedTextHealth.text(
				`Average Grade: ${Math.round(brushedData.total_average_grade * 100) / 100}`,
			);
			brushedTextGoout.text(
				`Average Number of Absences: ${Math.round(brushedData.average_absences * 100) / 100}`,
			);
		}
	})
	.catch(function (error) {
		console.log(error);
	});
