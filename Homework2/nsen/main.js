let abFilter = 25;
// const width = window.innerWidth;
// const height = window.innerHeight;
const width = window.innerWidth / 3;
const height = window.innerHeight / 3;
// const width = 400;
// const height = 350;

let barChartMargin = { top: 40, right: 30, bottom: 85, left: 70 },
  barChartWidth = width - barChartMargin.left - barChartMargin.right,
  barChartHeight = height - barChartMargin.top - barChartMargin.bottom;

let pieMargin = 30;

let sankeyMargin = { top: 40, right: 30, bottom: 30, left: 80 },
  sankeyWidth = width - sankeyMargin.left - sankeyMargin.right,
  sankeyHeight = height - sankeyMargin.top - sankeyMargin.bottom;

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
    const barSvg = d3.selectAll("#bar-svg");

    const g1 = barSvg
      .append("g")
      .attr("viewBox", [0, 0, width, height])
      .attr("width", width)
      .attr("height", height);

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
    const pieWidth = width / 2 + pieMargin * 1.5;
    const pieHeight = height / 2 + pieMargin * 1.5;

    const radius = Math.min(pieWidth, pieHeight) / 2 - pieMargin * 2;

    const pieSvg = d3.selectAll("#pie-svg");

    // const data_pie1 = { a: 20, b: 80 };
    const pieData = d3.rollup(
      processedData,
      (d) => (d.filter((f) => f.depression == "yes").length / d.length) * 100,
      (d) => d.year,
    );
    // const
    console.log(pieData);

    // console.log(pieData["year 1"])
    const data_pie1 = {
      a: pieData.get("year 1"),
      b: 100 - pieData.get("year 1"),
    };
    drawPie(pieSvg, data_pie1, pieWidth, pieHeight, radius, 0, 0, "Year 1");

    const data_pie2 = {
      a: pieData.get("year 2"),
      b: 100 - pieData.get("year 2"),
    };
    drawPie(pieSvg, data_pie2, pieWidth, pieHeight, radius, 1, 0, "Year 2");

    const data_pie3 = {
      a: pieData.get("year 3"),
      b: 100 - pieData.get("year 3"),
    };
    drawPie(pieSvg, data_pie3, pieWidth, pieHeight, radius, 0, 1, "Year 3");

    const data_pie4 = {
      a: pieData.get("year 4"),
      b: 100 - pieData.get("year 4"),
    };
    drawPie(pieSvg, data_pie4, pieWidth, pieHeight, radius, 1, 1, "Year 4");
    
    // Legend
    const g2 = pieSvg
      .append("g")
      .attr("width", width)
      .attr("height", height)
      .attr("transform", `translate(${200},${50})`);

    g2.append("text")
      .attr("font-size", "10px")
      .attr("text-anchor", "left")
      .text("Key");

    // Color 1
    const item1 = g2.append("g").attr("transform", `translate(${-20},${10})`);

    item1
      .append("rect")
      .attr("width", "10px")
      .attr("height", "10px")
      .attr("fill", "#98abc5");
    item1
      .append("text")
      .attr("font-size", "10px")
      .attr("text-anchor", "left")
      .attr("transform", `translate(${15},${8})`)
      .text("Depressed");

    // Color 2
    const item2 = g2.append("g").attr("transform", `translate(${-20},${30})`);

    item2
      .append("rect")
      .attr("width", "10px")
      .attr("height", "10px")
      .attr("fill", "#8a89a6");
    item2
      .append("text")
      .attr("font-size", "10px")
      .attr("text-anchor", "left")
      .attr("transform", `translate(${15},${8})`)
      .text("Not Depressed");

    // plot 3: Sankey
    const color = "#77ACA2";
    const sankeyHighlightColor = "orange";
    const sankeySvg = d3.selectAll("#sankey-svg");

    sankeySvg
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", width)
      .attr("height", height)
      .style("fill", "#F4E9CD");

    const sankey = d3
      .sankey()
      .nodeSort(null)
      .linkSort(null)
      .nodeWidth(4)
      .nodePadding(1)
      .extent([
        [sankeyMargin.left, sankeyMargin.top],
        [width - sankeyMargin.right, height - sankeyMargin.bottom],
      ]);

    const graphData = graph(processedData);
    console.log("graphdata", graphData)
    const { nodes, links } = sankey({
      nodes: graphData.nodes.map((d) => Object.create(d)),
      links: graphData.links.map((d) => Object.create(d)),
    });

    // Vertical lines
    sankeySvg
      .append("g")
      .selectAll("rect")
      .data(nodes)
      .join("rect")
      .attr("x", (d) => d.x0)
      .attr("y", (d) => d.y0)
      .attr("height", (d) => d.y1 - d.y0)
      .attr("width", (d) => d.x1 - d.x0)
      .append("title")
      .text((d) => `${d.name}\n`);

    // Links
    const lines = sankeySvg
      .append("g")
      .attr("fill", "none")
      .selectAll("g")
      .data(links)
      .join("path")
      .attr("d", d3.sankeyLinkHorizontal())
      .attr("stroke", (d) => color)
      .attr("stroke-width", (d) => d.width)
      .style("mix-blend-mode", "multiply")
      .append("title")
      .text((d) => `${d.names.join(" → ")}\n`);

    // Node labels
    sankeySvg
      .append("g")
      .style("font", "10px sans-serif")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .attr("x", (d) => (d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 3))
      .attr("y", (d) => (d.y1 + d.y0) / 2)
      .attr("dx", (d) => {
        if (d.x0 < width / 2 - 50) {
          return "-2em";
        } else if (d.x0 > width / 2 + 50) {
          return "1.4em";
        } else {
          return "1.0em";
        }
      })
      .attr("dy", "0.35em")
      .attr("text-anchor", (d) => (d.x0 < width / 2 ? "end" : "start"))
      .attr("font-size", (d) => {
        if (d.x0 < width / 2 - 50) {
          return 7;
        } else if (d.x0 > width / 2 + 50) {
          return 6;
        } else {
          return 9;
        }
      })
      .text((d) => d.name)
      .append("tspan")
      .attr("fill-opacity", 0.7);
  })
  .catch(function (error) {
    console.log(error);
  });

function drawPie(svg, data, pieWidth, pieHeight, radius, x, y, text) {
  const g2 = svg
    .append("g")
    .attr("width", width)
    .attr("height", height)
    .attr(
      "transform",
      `translate(${pieMargin + radius + (pieMargin + radius * 2) * x},${pieMargin + radius + (pieMargin + radius * 2) * y})`,
    );

  const color = d3
    .scaleOrdinal()
    .domain(Object.keys(data))
    .range(["#98abc5", "#8a89a6"]);

  const dataArray = Object.entries(data).map(([key, value]) => ({
    key,
    value,
  }));
  const pie = d3
    .pie()
    .value((d) => d.value)
    .sort(null);
  const data_ready = pie(dataArray);

  const arc = d3.arc().innerRadius(0).outerRadius(radius);
  g2.selectAll("whatever")
    .data(data_ready)
    .enter()
    .append("path")
    .attr("d", (d) => arc(d))
    .attr("fill", (d) => color(d.data.key))
    .attr("stroke", "black")
    .style("stroke-width", "2px")
    .style("opacity", 0.7);

  // Label pie
  g2.append("text")
    .attr("x", 0)
    .attr("y", radius + 15)
    .attr("font-size", "10px")
    .attr("text-anchor", "middle")
    .text(text);
}

// Modified from tutorial: https://observablehq.com/@d3/parallel-sets
function graph(processedData) {
  const keys = ["Gender", "Year", "GPA"];
  let index = -1;
  const nodes = [];
  const nodeByKey = new d3.InternMap([], JSON.stringify);
  const indexByKey = new d3.InternMap([], JSON.stringify);
  const links = [];

  for (const k of keys) {
    for (const d of processedData) {
      const key = [k.toLowerCase(), d[k.toLowerCase()]];
      if (nodeByKey.has(key)) continue;
      const node = { name: d[k.toLowerCase()] };
      nodes.push(node);
      nodeByKey.set(key, node);
      indexByKey.set(key, ++index);
    }
  }

  console.log("nodeByKey", nodeByKey)
  console.log("indexByKey", indexByKey)

  for (let i = 1; i < keys.length; ++i) {
    const a = keys[i - 1].toLowerCase();
    const b = keys[i].toLowerCase();
    const prefix = keys.slice(0, i + 1);
    // console.log(prefix)
    const linkByKey = new d3.InternMap([], JSON.stringify);
    for (const d of processedData) {
      const names = prefix.map((k) => d[k.toLowerCase()]);
      console.log(names)
      const value = d.value || 1;
      let link = linkByKey.get(names);
      if (link) {
        link.value += value;
        continue;
      }
      link = {
        source: indexByKey.get([a, d[a.toLowerCase()]]),
        target: indexByKey.get([b, d[b.toLowerCase()]]),
        names,
        value,
        gameName: d.Name,
      };
      links.push(link);
      linkByKey.set(names, link);
    }
  }

  return { nodes, links };
}
