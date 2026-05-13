let abFilter = 25;
const width = window.innerWidth;
const height = window.innerHeight;
// const width = 400;
// const height = 350;

let barChartMargin = { top: 40, right: 30, bottom: 85, left: 70 },
  barChartWidth = width - barChartMargin.left - barChartMargin.right,
  barChartHeight = height - barChartMargin.top - barChartMargin.bottom;

let pieMargin = 50;

// plots
d3.csv("student_mental_health.csv")
  .then((rawData) => {
    console.log("rawData", rawData);

    // Process data into usable headers
    let processedData = rawData.map((d) => {
      return {
        gender: d["Choose your gender"],
        age: Number(d["Age"]),
        course: d["What is your course?"],
        year: d["Your current year of Study"].toLowerCase(),
        gpa: d["What is your CGPA?"].trim(),
        depression: d["Do you have Depression?"].toLowerCase(),
      };
    });
    processedData = processedData.filter((d) => d.age != 0);

    console.log("processedData", processedData);

    // plot 1: Bar chart
    const barSvg = d3.select("#bar-svg");

    const g1 = barSvg.append("g").attr("width", width).attr("height", height);

    // Reduce data to category counts
    let barData = d3.rollup(
      processedData,
      (v) =>
        v.reduce(
          (a, b) => {
            return { age: a.age + b.age };
          },
          { age: 0 },
        ).age / v.length,
      (d) => d.gpa,
    );
    barData = Array.from(barData, ([gpa, age]) => ({ gpa, age }));
    console.log("barData", barData);

    // Create x and y axis

    // Compute x axis
    const x1 = d3
      .scaleBand()
      .domain(
        barData
          .map((d) => d.gpa)
          .sort(
            (a, b) => parseFloat(a.slice(0, 3)) - parseFloat(b.slice(0, 3)),
          ),
      )
      .range([barChartMargin.left, width - barChartMargin.right])
      .padding(0.08);

    // Draw x axis
    const xAxisCall = d3.axisBottom(x1).ticks(5);
    g1.append("g")
      .attr("transform", `translate(0, ${height - barChartMargin.bottom})`)
      .call(xAxisCall)
      .selectAll("text")
      .attr("text-anchor", "end");

    // Label x axis
    g1.append("text")
      .attr("x", barChartMargin.left + barChartWidth / 2)
      .attr("y", height - 5)
      .attr("font-size", "20px")
      .attr("text-anchor", "middle")
      .text("GPA Range");

    // Compute y axis
    const y1 = d3
      .scaleLinear()
      .domain([
        d3.min(processedData, (d) => d.age),
        d3.max(processedData, (d) => d.age),
      ])
      .range([height - barChartMargin.bottom, barChartMargin.top])
      .nice();

    // Draw y axis
    const yAxisCall = d3.axisLeft(y1).tickSize(5).ticks(5);
    g1.append("g")
      .attr("transform", `translate(${barChartMargin.left}, 0)`)
      .call(yAxisCall)
      .selectAll("text")
      .style("text-anchor", "end");

    // Label y axis
    g1.append("text")
      .attr(
        "transform",
        `translate(25, ${barChartMargin.top + barChartHeight / 2}) rotate(-90)`,
      )
      .attr("text-anchor", "middle")
      .attr("font-size", "20px")
      .text("Age (years)");

    // Draw bars
    const barColor = "#77ACA2";
    const highlightColor = "orange";
    const rect = g1
      .append("g")
      .classed("mark", true)
      .selectAll("rect")
      .data(barData)
      .join("rect")
      .attr("x", (d) => x1(d.gpa))
      .attr("y", (d) => y1(d.age))
      .attr("width", x1.bandwidth())
      .attr("height", (d) => height - barChartMargin.bottom - y1(d.age))
      .style("fill", barColor);

    // plot 2: Pie charts
		const pieWidth = (width / 2) + pieMargin * 1.5
		const pieHeight = (height / 2) + pieMargin * 1.5
		
		const radius = Math.min(pieWidth, pieHeight) / 2 - pieMargin * 2;
		
		// pie 1
    const pieSvg = d3.select("#pie-svg");
    const g2_pie1 = pieSvg
      .append("g")
      .attr("width", width)
      .attr("height", height)
      .attr("transform", `translate(${pieMargin + radius},${pieMargin + radius})`);

    const data_pie1 = { a: 20, b: 80 };

    const color_pie1 = d3
      .scaleOrdinal()
      .domain(Object.keys(data_pie1))
      .range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56"]);

		const dataArray_pie1 = Object.entries(data_pie1).map(([key, value]) => ({key, value}));
		const pie_pie1 = d3.pie().value(d => d.value).sort(null);
		const data_ready_pie1 = pie_pie1(dataArray_pie1);

		const arc_pie1 = d3.arc().innerRadius(0).outerRadius(radius)
    g2_pie1.selectAll("whatever")
      .data(data_ready_pie1)
      .enter()
      .append("path")
      .attr("d", d => arc_pie1(d))
      .attr("fill", d => color_pie1(d.data.key))
      .attr("stroke", "black")
      .style("stroke-width", "2px")
      .style("opacity", 0.7);


		// pie 2
		const g2_pie2 = pieSvg
      .append("g")
      .attr("width", width)
      .attr("height", height)
      .attr("transform", `translate(${pieMargin + radius},${pieMargin + radius + pieMargin + radius * 2})`);

    const data_pie2 = { a: 20, b: 80 };

    const color_pie2 = d3
      .scaleOrdinal()
      .domain(Object.keys(data_pie2))
      .range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56"]);

		const dataArray_pie2 = Object.entries(data_pie2).map(([key, value]) => ({key, value}));
		const pie_pie2 = d3.pie().value(d => d.value).sort(null);
		const data_ready_pie2 = pie_pie2(dataArray_pie2);

		const arc_pie2 = d3.arc().innerRadius(0).outerRadius(radius)
    g2_pie2.selectAll("whatever")
      .data(data_ready_pie2)
      .enter()
      .append("path")
      .attr("d", d => arc_pie2(d))
      .attr("fill", d => color_pie2(d.data.key))
      .attr("stroke", "black")
      .style("stroke-width", "2px")
      .style("opacity", 0.7);


		// pie 3
		const g2_pie3 = pieSvg
      .append("g")
      .attr("width", width)
      .attr("height", height)
      .attr("transform", `translate(${pieMargin + radius + pieMargin + radius * 2},${pieMargin + radius})`);

    const data_pie3 = { a: 20, b: 80 };

    const color_pie3 = d3
      .scaleOrdinal()
      .domain(Object.keys(data_pie3))
      .range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56"]);

		const dataArray_pie3 = Object.entries(data_pie3).map(([key, value]) => ({key, value}));
		const pie_pie3 = d3.pie().value(d => d.value).sort(null);
		const data_ready_pie3 = pie_pie3(dataArray_pie3);

		const arc_pie3 = d3.arc().innerRadius(0).outerRadius(radius)
    g2_pie3.selectAll("whatever")
      .data(data_ready_pie3)
      .enter()
      .append("path")
      .attr("d", d => arc_pie3(d))
      .attr("fill", d => color_pie3(d.data.key))
      .attr("stroke", "black")
      .style("stroke-width", "2px")
      .style("opacity", 0.7);


  })
  .catch(function (error) {
    console.log(error);
  });


function drawPie(svg, pieWidth, pieHeight, radius, x, y) {
    const g2 = svg
      .append("g")
      .attr("width", width)
      .attr("height", height)
      .attr("transform", `translate(${pieMargin + radius + ((pieMargin + radius * 2) * x)},${pieMargin + radius + ((pieMargin + radius * 2) * y)})`);

    const data = { a: 20, b: 80 };

    const color = d3
      .scaleOrdinal()
      .domain(Object.keys(data))
      .range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56"]);

		const dataArray = Object.entries(data).map(([key, value]) => ({key, value}));
		const pie = d3.pie().value(d => d.value).sort(null);
		const data_ready = pie(dataArray);

		const arc = d3.arc().innerRadius(0).outerRadius(radius)
    g2.selectAll("whatever")
      .data(data_ready)
      .enter()
      .append("path")
      .attr("d", d => arc(d))
      .attr("fill", d => color(d.data.key))
      .attr("stroke", "black")
      .style("stroke-width", "2px")
      .style("opacity", 0.7);
}