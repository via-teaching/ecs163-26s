let abFilter = 25;
const width = window.innerWidth;
const height = window.innerHeight;

let sankeyLeft = 0,
  sankeyTop = 0;
let sankeyMargin = { top: 50, right: 50, bottom: 15, left: 20 },
  sankeyWidth = width - sankeyMargin.left * 2 - sankeyMargin.right * 2,
  sankeyHeight = height / 2 - sankeyMargin.top - sankeyMargin.bottom;

let titleBarHeight = 35;

let stackedBarLeft = 400,
  stackedBarTop = 0;
let stackedBarMargin = { top: (height/2 + titleBarHeight + sankeyMargin.bottom + 10), right: 70, bottom: 10, left: 20 },
  stackedBarWidth = (width/2)
  stackedBarHeight = (height / 2) 

let teamLeft = 0,
  teamTop = 400;
let teamMargin = { top: 10, right: 30, bottom: 30, left: 60 },
  teamWidth = width - teamMargin.left - teamMargin.right,
  teamHeight = height - 450 - teamMargin.top - teamMargin.bottom;


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
    .text("How has fitness wearables influenced these 30 people?");

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
    processed_datum["Did wearable influenced person to exercise?"] =
      "Influence more exercise: " +
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
  })
  filteredData["columns"] = [
    "Did wearable influenced person to exercise?",
    "Was the exercise more enjoyable?",
    "Exercise weekly frequency.",
  ]

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

  // Stacked bar chart
  // Help from: https://observablehq.com/@d3/stacked-bar-chart/2
  const stackedBarData = (() => {
    processed_datum = {};
    responsesCounts = new d3.InternMap([], JSON.stringify)
    processed_data = []

  // make all possible combinations
  const influences = new Set();
  const useFrequencies = new Set();
  rawData.forEach(d => {
    const influence = "Influence more exercise: " + (d["Has using a fitness wearable influenced your decision? [To exercise more?]"] || "").trim();
    const useFrequency = (d["How frequently do you use your fitness wearable?"] || "").trim();
    influences.add(influence);
    useFrequencies.add(useFrequency);
  })

  for (const influence of influences) {
    for (const useFrequency of useFrequencies) {
      responsesCounts.set([influence, useFrequency], 0)
    }
  }

    rawData.forEach((d) => {
      influence =
      "Influence more exercise: " +
      d[
        "Has using a fitness wearable influenced your decision? [To exercise more?]"
      ]
      useFrequency = d["How frequently do you use your fitness wearable?"]
      // influence is key[0] and frequency is key[1]
      key = [influence, useFrequency]
      responsesCounts.set(key, responsesCounts.get(key) + 1)
    })

    for (const [k, v] of responsesCounts) {
      processed_data.push({influence: k[0], useFrequency: k[1], count: v})
    }

    return processed_data
  }) ()


  const indexMap = d3.index(stackedBarData, d => d.useFrequency, d => d.influence);

  const keys = d3.union(stackedBarData.map(d => d.influence))
  const series = d3.stack()
    .keys(keys).order(series => d3.range(series.length).reverse())
    .value(([, D], key) => D.get(key) && D.get(key).count || 0)
    (indexMap)
  
  const freqOrder = ["Rarely","1-2 times a week","3-4 times a week","Daily"]
  const x = d3.scaleBand()
    .domain(freqOrder)
    .range([stackedBarMargin.left - 10, stackedBarWidth - stackedBarMargin.right])
    .padding(0.1)

  const y = d3.scaleLinear()
      .domain([0, d3.max(series, d => d3.max(d, d => d[1])) + 1])
      .rangeRound([stackedBarHeight * 2 + stackedBarMargin.bottom - 30, stackedBarMargin.top]);

  svg.append("g")
    .selectAll()
    .data(series)
    .join("g")
      .attr("fill", d => color(d.key))
    .selectAll("rect")
    .data(D => D.map(d => (d.key = D.key, d)))
    .join("rect")
      .attr("x", d => x(d.data[0]))
      .attr("y", d => y(d[1]))
      .attr("height", d => y(d[0]) - y(d[1]))
      .attr("width", x.bandwidth())
    .append("title")
      .text(d => `Exercise Frequency: ${d.data[0]}\n${d.key}\nCount: ${(d.data[1].get(d.key).count)}`);
  
      console.log(stackedBarHeight*2 + stackedBarMargin.bottom)
  svg.append("g")
      .attr("transform", `translate(0,${stackedBarHeight*2 + stackedBarMargin.bottom - 30})`)
      .call(d3.axisBottom(x).tickSizeOuter(0))

  svg.append("g")
    .attr("transform", `translate(${stackedBarMargin.left +3}, 0)`)
    .call(d3.axisLeft(y).ticks(null, "s"))
  
  // Title for stack bar plot
  svg.append("text")
    .attr("x", stackedBarWidth/2 )
    .attr("y", height / 2 + titleBarHeight*2)
    .attr("text-anchor", "middle")
    .attr("font-size", 16)
    .attr("font-weight", "bold")
    .text("How often did the influenced users wear their wearables?");

  // Add the legend
  const legendKeys = ["Influence more exercise: Strongly agree ", "Influence more exercise: Agree", "Influence more exercise: Neutral"]
  const legendX = width / 2 - 330
  const legendY = 15
  let size = 20
  svg.selectAll("mydots")
  .data(legendKeys)
  .enter()
  .append("rect")
    .attr("y", legendY)
    .attr("x", function(d,i){ return legendX + i*(size+300)}) 
    .attr("width", size)
    .attr("height", size)
    .style("fill", function(d){ return color(d)})

  svg.selectAll("mylabels")
  .data(legendKeys)
  .enter()
  .append("text")
    .attr("y", legendY + size*1.4)
    .attr("x", function(d,i){ return legendX + i*(size+300) + (size/2)}) // 100 is where the first dot appears. 25 is the distance between dots
    .text(function(d){ return d})
    .attr("font-size", 10)
    .attr("font-weight", "bold")
    .attr("text-anchor", "middle")
    .style("alignment-baseline", "middle")
});
