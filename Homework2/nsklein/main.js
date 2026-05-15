const width = window.innerWidth;
const height = window.innerHeight;

let scatterLeft = 0,
	scatterTop = 0;
let scatterMargin = { top: 20, right: 30, bottom: 30, left: 60 },
	scatterWidth = 500 - scatterMargin.left - scatterMargin.right,
	scatterHeight = 350 - scatterMargin.top - scatterMargin.bottom;

let barLeft = 750,
	barTop = 0;
let barMargin = { top: 10, right: 30, bottom: 30, left: 60 },
	barWidth = 800 - barMargin.left - barMargin.right,
	barHeight = 400 - barMargin.top - barMargin.bottom;

let parPointsLeft = 0,
	parPointsTop = 230;
let parPointsMargin = { top: 10, right: 0, bottom: 30, left: 120 },
	parPointsWidth = width - parPointsMargin.left - parPointsMargin.right,
	parPointsHeight = 275 - parPointsMargin.top - parPointsMargin.bottom;

// plots
d3.csv("data/mxmh_survey_results_rename.csv")
	.then((rawData) => {
		console.log("rawData", rawData);

		rawData.forEach(function (d) {
			d["Age"] = Number(d["Age"]);
			d["Hours per day"] = Number(d["Hours per day"]);
			d["Anxiety"] = Number(d["Anxiety"]);
			d["Depression"] = Number(d["Depression"]);
			d["Insomnia"] = Number(d["Insomnia"]);
			d["OCD"] = Number(d["OCD"]);
		});

		const filteredData = rawData.filter((d) => d["Age"] != 0);
		console.log("filtered", filteredData);
		const processedData = filteredData.map((d) => {
			return {
				age: d["Age"],
				hpd: d["Hours per day"],
				service: d["Primary streaming service"],
				anxiety: d["Anxiety"],
				depression: d["Depression"],
				insomnia: d["Insomnia"],
				ocd: d["OCD"],
				faveGenre: d["Fav genre"],
				effect: d["Effect"],
			};
		});
		console.log("processedData", processedData);

		//plot 1: Scatter Plot
		const svg = d3.select("svg");

		const g1 = svg
			.append("g")
			.attr("width", scatterWidth + scatterMargin.left + scatterMargin.right)
			.attr("height", scatterHeight + scatterMargin.top + scatterMargin.bottom)
			.attr(
				"transform",
				`translate(${scatterMargin.left}, ${scatterMargin.top})`,
			);

		// X label
		g1.append("text")
			.attr("x", scatterWidth / 2)
			.attr("y", scatterHeight + 50)
			.attr("font-size", "20px")
			.attr("text-anchor", "middle")
			.text("Age");

		// Y label
		g1.append("text")
			.attr("x", -(scatterHeight / 2))
			.attr("y", -40)
			.attr("font-size", "20px")
			.attr("text-anchor", "middle")
			.attr("transform", "rotate(-90)")
			.text("Hours Per Day");

		// X ticks
		const x1 = d3
			.scaleLinear()
			.domain([0, d3.max(processedData, (d) => d.age)])
			.range([0, scatterWidth]);

		const xAxisCall = d3.axisBottom(x1).ticks(7);

		g1.append("g")
			.attr("transform", `translate(0, ${scatterHeight})`)
			.call(xAxisCall)
			.selectAll("text")
			.attr("y", "10")
			.attr("x", "-5")
			.attr("text-anchor", "end")
			.attr("transform", "rotate(-40)");

		// Y ticks
		const y1 = d3
			.scaleLinear()
			.domain([0, d3.max(processedData, (d) => d.hpd)])
			.range([scatterHeight, 0]);

		const yAxisCall = d3.axisLeft(y1).ticks(13);
		g1.append("g").call(yAxisCall);

		// circles
		const circles = g1.selectAll("circle").data(processedData);

		const genres = Array.from(
			new Set(
				processedData.filter((d) => d.faveGenre != "").map((d) => d.faveGenre),
			),
		);

		console.log("genres", genres);
		const color = d3.scaleOrdinal().domain(genres).range(d3.schemeTableau10);

		circles
			.enter()
			.append("circle")
			.classed("data-circle", true)
			.attr("cx", (d) => x1(d.age))
			.attr("cy", (d) => y1(d.hpd))
			.attr("r", 5)
			.attr("fill", (d) => color(d.faveGenre));

		const legend = g1
			.append("g")
			.attr("transform", `translate(${50}, ${scatterMargin.top})`);

		legend
			.selectAll("circle")
			.data(genres)
			.join("circle")
			.attr("cx", scatterWidth)
			.attr("cy", (d, i) => i * 25 + 8)
			.attr("r", 8)
			.style("fill", (d) => color(d))
			.on("mouseenter", function (event, hoveredService) {
				g1.selectAll(".data-circle")
					.transition("fade")
					.duration(200)
					.style("opacity", (d) => (d.faveGenre == hoveredService ? 1 : 0.1))
					.style("stroke", (d) =>
						d.faveGenre == hoveredService ? "black" : "none",
					)
					.style("stroke-width", "2px");
				g2.selectAll("rect")
					.transition("fade")
					.duration(200)
					.style("opacity", (d) => (d.genre == hoveredService ? 1 : 0.1));
				g3.selectAll(".path-mark")
					.transition("fade")
					.duration(200)
					.style("opacity", (d) => (d.genre == hoveredService ? 1 : 0.1));
				d3.select(this)
					.transition("fade")
					.duration(200)
					.style("stroke", "black")
					.style("stroke-width", "2px");
			})
			.on("mouseleave", function (event, hoveredService) {
				g1.selectAll(".data-circle")
					.transition("fade")
					.duration(200)
					.style("opacity", 1)
					.style("stroke", "none");
				g2.selectAll("rect")
					.transition("fade")
					.duration(200)
					.style("opacity", 1);
				g3.selectAll(".path-mark")
					.transition("fade")
					.duration(200)
					.style("opacity", 1);
				d3.select(this)
					.transition("fade")
					.duration(200)
					.style("stroke", "none");
			});

		legend
			.selectAll("text")
			.data(genres)
			.join("text")
			.attr("x", scatterWidth + 10)
			.attr("y", (d, i) => i * 25 + 13)
			.attr("font-size", 14)
			.text((d) => d);

		legend
			.append("text")
			.attr("x", scatterWidth + 40)
			.attr("y", -10)
			.attr("text-anchor", "middle")
			.attr("font-size", 12)
			.text("Hover to view genre (applies to all)");

		g1.append("text")
			.attr("x", scatterWidth / 2 + 30)
			.attr("y", 10)
			.attr("text-anchor", "middle")
			.attr("font-size", 12)
			.text("Hours of Music Listened to by Favorite Genre (Overview)");

		const g2 = svg
			.append("g")
			.attr("width", barWidth + barMargin.left + barMargin.right)
			.attr("height", barHeight + barMargin.top + barMargin.bottom)
			.attr("transform", `translate(${barLeft}, ${barTop + barMargin.bottom})`);

		let bData = d3.rollup(
			filteredData,
			(oldData) => ({
				count: oldData.filter((d) => d["Music effects"] == "Improve").length,
				// console.log("test", oldData),
			}),
			(d) => d["Fav genre"],
		);

		bData = Array.from(bData, ([genre, { count }]) => ({
			genre,
			count,
		}));

		console.log("bd", bData);

		let pPlotData = d3.rollup(
			processedData,
			(oldData) => ({
				Anxiety: d3.mean(oldData, (v) => v.anxiety),
				Depression: d3.mean(oldData, (v) => v.depression),
				Insomnia: d3.mean(oldData, (v) => v.insomnia),
				OCD: d3.mean(oldData, (v) => v.ocd),
				count: oldData.length,
			}),
			(d) => d.faveGenre,
		);

		pPlotData = Array.from(
			pPlotData,
			([genre, { Anxiety, Depression, Insomnia, OCD, count }]) => ({
				genre,
				Anxiety,
				Depression,
				Insomnia,
				OCD,
				count,
			}),
		);

		console.log("Roll", pPlotData);

		g2.append("text")
			.attr("x", barWidth / 2)
			.attr("y", barHeight + 60)
			.attr("font-size", "20px")
			.attr("text-anchor", "middle")
			.text("Favorite Genre");

		g2.append("text")
			.attr("x", -(barHeight / 2))
			.attr("y", -40)
			.attr("font-size", "14px")
			.attr("text-anchor", "middle")
			.attr("transform", "rotate(-90)")
			.text("Number of Listeners who were Positively Affected by Music");

		const x2 = d3
			.scaleBand()
			.domain(genres.map((d) => d))
			.range([0, barWidth]);

		const x2AxisCall = d3.axisBottom(x2).ticks(7);

		g2.append("g")
			.attr("transform", `translate(0, ${barHeight})`)
			.call(x2AxisCall)
			.selectAll("text")
			.attr("y", "10")
			.attr("x", "-5")
			.attr("text-anchor", "end")
			.attr("transform", "rotate(-40)");
		// Y ticks
		const y2 = d3
			.scaleLinear()
			.domain(d3.extent(bData, (d) => d["count"]))
			.range([barHeight, 0]);

		const y2AxisCall = d3.axisLeft(y2).ticks(13);
		g2.append("g").call(y2AxisCall);

		const rect = g2
			.append("g")
			.classed("bar", true)
			.selectAll("rect")
			.data(bData)
			.join("rect")
			.attr("x", (d) => x2(d.genre))
			.attr("y", (d) => y2(d.count))
			.attr("width", x2.bandwidth())
			.attr("height", (d) => barHeight - y2(d.count))
			.style("fill", (d) => color(d.genre));

		g2.append("text")
			.attr("x", barWidth / 2)
			.attr("y", 25)
			.attr("text-anchor", "middle")
			.attr("font-size", 12)
			.text("Listeners who are Positively Affected by Music");

		const g3 = svg
			.append("g")
			.attr(
				"width",
				parPointsWidth + parPointsMargin.left + parPointsMargin.right,
			)
			.attr(
				"height",
				parPointsHeight + parPointsMargin.top + parPointsMargin.bottom,
			)
			.attr(
				"transform",
				`translate(${parPointsLeft}, ${parPointsTop + parPointsMargin.bottom})`,
			);

		// console.log(rawData.columns.slice(11, 26));

		const parCategories = ["Anxiety", "Depression", "Insomnia", "OCD"];
		// console.log(parGenres);
		const freqs = ["Very frequently", "Sometimes", "Rarely", "Never"];
		console.log(freqs);
		const x3 = d3.scalePoint(parCategories, [
			parPointsMargin.left,
			parPointsWidth - parPointsMargin.right,
		]);

		const y3 = new Map(
			Array.from(parCategories, (key) => [
				key,
				d3.scaleLinear(
					[10, 0],
					[parPointsMargin.top, parPointsHeight - parPointsMargin.bottom],
				),
			]),
		);

		const line = d3
			.line()
			.defined(([key, value]) => value != null)
			.y(([key, value]) => y3.get(key)(value) + parPointsTop)
			.x(([key]) => x3(key));

		g3.attr("fill", "none")
			.attr("stroke-width", 1)
			.attr("stroke-opacity", 0.8)
			.selectAll("path")
			.data(pPlotData)
			.join("path")
			.attr("stroke", (d) => color(d.genre))
			.attr("stroke-width", 3)
			.attr("d", (d) =>
				line(d3.cross(parCategories, [d], (key, d) => [key, d[key]])),
			)
			.classed("path-mark", true);

		g3.selectAll("g")
			.data(parCategories)
			.join("g")
			.attr("transform", (d) => `translate(${x3(d)}, ${parPointsTop})`)
			.each(function (d) {
				d3.select(this).call(d3.axisLeft(y3.get(d)));
			})
			.attr("stroke-opacity", 1)
			.call((g) =>
				g
					.append("text")
					.attr("y", parPointsHeight)
					.attr("x", 5)
					.attr("fill", "black")
					.text((d) => d),
			);

		g3.join("g").call((g) =>
			g
				.append("text")
				.attr("y", parPointsHeight)
				.attr("x", parPointsWidth / 2 - 125)
				.attr("fill", "black")
				.text("Rankings of Mental Health Factors Based on Favorite Genre"),
		);
	})
	.catch(function (error) {
		console.log(error);
	});
