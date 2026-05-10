let abFilter = 25;
const width = window.innerWidth;
const height = window.innerHeight;

let sankeyLeft = 0,
  sankeyTop = 0;
let sankeyMargin = { top: 15, right: 50, bottom: 15, left: 20 },
  sankeyWidth = width - sankeyMargin.left * 2 - sankeyMargin.right * 2,
  sankeyHeight = height / 2 - sankeyMargin.top - sankeyMargin.bottom;

let distrLeft = 400,
  distrTop = 0;
let distrMargin = { top: 10, right: 30, bottom: 30, left: 60 },
  distrWidth = 400 - distrMargin.left - distrMargin.right,
  distrHeight = 350 - distrMargin.top - distrMargin.bottom;

let teamLeft = 0,
  teamTop = 400;
let teamMargin = { top: 10, right: 30, bottom: 30, left: 60 },
  teamWidth = width - teamMargin.left - teamMargin.right,
  teamHeight = height - 450 - teamMargin.top - teamMargin.bottom;

let titleBarHeight = 35;

// plots
d3.csv("fitness_data.csv").then((rawData) => {
  const svg = d3.select("svg").attr("font-family", "sans-serif");

  const titleBar = svg
    .append("rect")
    .attr("x", 0)
    .attr("y", height / 2 + sankeyMargin.bottom)
    .attr("height", titleBarHeight)
    .attr("opacity", 0.3)
    .attr("fill", "#e5b83e")

    .attr("width", width);

  const title = svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", height / 2 + sankeyMargin.bottom + 25)
    .attr("text-anchor", "middle")
    .attr("font-size", 24)
    .attr("font-weight", 900)
    .text("How has fitness wearables impacted these 30 people?");

  const g1 = svg
    .append("g")
    .attr("width", sankeyWidth + sankeyMargin.left + sankeyMargin.right)
    .attr("height", sankeyHeight + sankeyMargin.top + sankeyMargin.bottom)
    .attr("transform", `translate(${sankeyMargin.left}, ${sankeyMargin.top})`);

  // A sankey diagram needs a graph
  // The overall sankey diagram should have the following flow

  // First we will process only the data we need for the sankey diagram
  const filteredData = rawData.map((d) => {
    processed_datum = {};

    // processed_datum["Wearable use frequency"] = d["How frequently do you use your fitness wearable?"]
    processed_datum["Did wearable motivate person to exercise?"] =
      "Influence decision to exercise: " +
      d[
        "Has using a fitness wearable influenced your decision? [To exercise more?]"
      ];
    processed_datum["Was the exercise more enjoyable?"] =
      "Makes exercise enjoyable: " +
      d[
        "Do you think that the fitness wearable has made exercising more enjoyable?"
      ];
    processed_datum["Exercise weekly frequency."] =
      "Exercises " + d["How often do you exercise in a week?"].toLowerCase();

    return processed_datum;
  });
  filteredData["columns"] = [
    "Did wearable motivate person to exercise?",
    "Was the exercise more enjoyable?",
    "Exercise weekly frequency.",
  ];

  // Docs used for learning to how to create the diagram: https://observablehq.com/@d3/parallel-sets
  graph = (() => {
    const keys = filteredData.columns;
    let index = 0;
    const nodes = [];
    const nodeByKey = new d3.InternMap([], JSON.stringify);
    const indexByKey = new d3.InternMap([], JSON.stringify);
    const edges = [];

    for (const k of keys) {
      for (const d of filteredData) {
        const key = [k, d[k]];
        if (nodeByKey.has(key)) {
          continue;
        }

        const node = { name: d[k], columnName: k };
        nodes.push(node); // make a list of all the nodes
        nodeByKey.set(key, node); //
        indexByKey.set(key, index++);
      }
    }

    for (let i = 1; i < keys.length; i++) {
      const a = keys[i - 1];
      const b = keys[i];

      const prefix = keys.slice(0, i + 1);
      const edgeByKey = new d3.InternMap([], JSON.stringify);

      for (const d of filteredData) {
        const names = prefix.map((k) => d[k]); // the answers for each of the questions

        let edge = edgeByKey.get(names);

        if (edge) {
          edge.value += 1;
          continue;
        }

        edge = {
          source: indexByKey.get([a, d[a]]),
          target: indexByKey.get([b, d[b]]),
          names: names,
          value: 1,
        };

        edges.push(edge);
        edgeByKey.set(names, edge);
      }
    }
    return { nodes, edges };
  })();

  const color = d3
    .scaleOrdinal()
    .domain(filteredData.columns)
    .range(["#5fc067", "#9ae885", "#c3d6a6"]);
  const sankey = d3
    .sankey()
    .nodeSort((a, b) => {
      if (
        a.columnName == "Exercise weekly frequency." &&
        b.columnName == "Exercise weekly frequency."
      ) {
        const orderMap = {
          "Exercises 5 or more times a week": 1,
          "Exercises 3-4 times a week": 2,
          "Exercises 1-2 times a week": 3,
          "Exercises less than once a week": 4,
        };
        return orderMap[a.name] - orderMap[b.name];
      }
    })
    .linkSort(null)
    .nodeWidth(4)
    .nodePadding(10)
    .extent([
      [0, 5],
      [sankeyWidth + 100, sankeyHeight - 5],
    ]);

  const { nodes, links } = sankey({
    nodes: graph.nodes.map((d) => ({ ...d })),
    links: graph.edges.map((d) => ({ ...d })),
  });

  // To append the column labels
  colTitleData = (() => {
    const data = [];
    const seen = new Set();

    for (const node of nodes) {
      if (seen.has(node.columnName)) {
        continue;
      }
      seen.add(node.columnName);
      data.push({
        x0: node["x0"],
        x1: node["x1"],
        columnName: node.columnName,
      });
    }

    return data;
  })();

  // Label the X-axis
  g1.append("g")
    .selectAll("text")
    .data(colTitleData)
    .join("text")
    .attr("x", (d) => d.x0)
    .attr("y", sankeyHeight + 5)
    .attr("text-anchor", (d, i) => {
      if (i == 0) {
        return "start";
      } else if (i == colTitleData.length - 1) {
        return "end";
      } else {
        return "middle";
      }
    })
    .attr("font-size", sankeyWidth < 800 ? 8 : 14)
    .attr("font-weight", "bold")
    .text((d) => d.columnName);

  g1.append("g")
    .selectAll("rect")
    .data(nodes)
    .join("rect")
    .attr("x", (d) => d.x0)
    .attr("y", (d) => d.y0)
    .attr("height", (d) => d.y1 - d.y0)
    .attr("width", (d) => d.x1 - d.x0)
    .append("title")
    .text((d) => `User\n(${d.value.toLocaleString()})`);

  g1.append("g")
    .attr("fill", "none")
    .selectAll("g")
    .data(links)
    .join("path")
    .attr("d", d3.sankeyLinkHorizontal())
    .attr("stroke", (d) => color(d.names[0]))
    .attr("stroke-width", (d) => d.width)
    .style("mix-blend-mode", "multiply")
    .append("title")
    .text((d) => `${d.names.join(" → ")}\n(${d.value.toLocaleString()})`);

  g1.append("g")
    .selectAll("text")
    .data(nodes)
    .join("text")
    .attr("x", (d) => (d.x0 < sankeyWidth / 2 ? d.x1 + 6 : d.x0 - 6))
    .attr("y", (d) => (d.y1 + d.y0) / 2)
    .attr("font-size", sankeyWidth < 800 ? 6 : 12)
    .attr("text-anchor", (d) => (d.x0 < sankeyWidth / 2 ? "start" : "end"))
    .text((d) => d.name)
    .append("tspan")
    .attr("fill-opacity", 0.7)
    .text((d) => ` (${d.value.toLocaleString()})`);

  // X label
  // g1.append("text")
  // .attr("x", scatterWidth / 2)
  // .attr("y", scatterHeight + scatterMargin.bottom + scatterMargin.top)
  // .attr("font-size", "20px")
  // .attr("text-anchor", "middle")
  // .text("H/AB");

  // // Y label
  // g1.append("text")
  // .attr("x", -(scatterHeight / 2))
  // .attr("y", -40)
  // .attr("font-size", "20px")
  // .attr("text-anchor", "middle")
  // .attr("transform", "rotate(-90)")
  // .text("SO/AB");

  // // X ticks
  // const x1 = d3.scaleLinear()
  // .domain([0, d3.max(processedData, d => d.H_AB)])
  // .range([0, scatterWidth]);

  // const xAxisCall = d3.axisBottom(x1)
  //                     .ticks(7);
  // // Adding on the x-axis
  // g1.append("g")
  // .attr("transform", `translate(0, ${scatterHeight})`) // puts it in the correct location
  // .call(xAxisCall)
  // .selectAll("text")
  //     .attr("y", "10")
  //     .attr("x", "-5")
  //     .attr("text-anchor", "end")
  //     .attr("transform", "rotate(-40)");

  // // Y ticks
  // const y1 = d3.scaleLinear()
  // .domain([0, d3.max(processedData, d => d.SO_AB)])
  // .range([scatterHeight, 0]);

  // const yAxisCall = d3.axisLeft(y1)
  //                     .ticks(13);

  // // this doesn't need to be transformed because it gets put at 0,0 of g1
  // g1.append("g").call(yAxisCall);

  // // circles
  // const circles = g1.selectAll("circle").data(processedData);

  // circles.enter().append("circle")
  //      .attr("cx", d => x1(d.H_AB))
  //      .attr("cy", d => y1(d.SO_AB))
  //      .attr("r", 5)
  //      .attr("fill", "#69b3a2");

  // const g2 = svg.append("g")
  //             .attr("width", distrWidth + distrMargin.left + distrMargin.right)
  //             .attr("height", distrHeight + distrMargin.top + distrMargin.bottom)
  //             .attr("transform", `translate(${distrLeft}, ${distrTop})`);

  // //plot 2: Bar Chart for Team Player Count

  // const teamCounts = processedData.reduce((s, { teamID }) => (s[teamID] = (s[teamID] || 0) + 1, s), {});
  // const teamData = Object.keys(teamCounts).map((key) => ({ teamID: key, count: teamCounts[key] }));
  // console.log("teamData", teamData);

  // const g3 = svg.append("g")
  //             .attr("width", teamWidth + teamMargin.left + teamMargin.right)
  //             .attr("height", teamHeight + teamMargin.top + teamMargin.bottom)
  //             .attr("transform", `translate(${teamMargin.left}, ${teamTop})`);

  // // X label
  // g3.append("text")
  // .attr("x", teamWidth / 2)
  // .attr("y", teamHeight + 50)
  // .attr("font-size", "20px")
  // .attr("text-anchor", "middle")
  // .text("Team");

  // // Y label
  // g3.append("text")
  // .attr("x", -(teamHeight / 2))
  // .attr("y", -40)
  // .attr("font-size", "20px")
  // .attr("text-anchor", "middle")
  // .attr("transform", "rotate(-90)")
  // .text("Number of players");

  // // X ticks
  // const x2 = d3.scaleBand()
  // .domain(teamData.map(d => d.teamID))
  // .range([0, teamWidth])
  // .paddingInner(0.3)
  // .paddingOuter(0.2);

  // const xAxisCall2 = d3.axisBottom(x2);
  // g3.append("g")
  // .attr("transform", `translate(0, ${teamHeight})`)
  // .call(xAxisCall2)
  // .selectAll("text")
  //     .attr("y", "10")
  //     .attr("x", "-5")
  //     .attr("text-anchor", "end")
  //     .attr("transform", "rotate(-40)");

  // // Y ticks
  // const y2 = d3.scaleLinear()
  // .domain([0, d3.max(teamData, d => d.count)])
  // .range([teamHeight, 0])
  // .nice();

  // const yAxisCall2 = d3.axisLeft(y2)
  //                     .ticks(6);
  // g3.append("g").call(yAxisCall2);

  // // bars
  // const bars = g3.selectAll("rect").data(teamData);

  // bars.enter().append("rect")
  // .attr("y", d => y2(d.count))
  // .attr("x", d => x2(d.teamID))
  // .attr("width", x2.bandwidth())
  // .attr("height", d => teamHeight - y2(d.count))
  // .attr("fill", "steelblue");

  // }).catch(function(error){
  // console.log(error);
});
