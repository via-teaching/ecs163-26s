let abFilter = 25;
const width = window.innerWidth;
const height = window.innerHeight;

let sankeyLeft = 0,
  sankeyTop = 0;
let sankeyMargin = { top: 50, right: 50, bottom: 15, left: 20 },
  sankeyWidth = width - sankeyMargin.left * 2 - sankeyMargin.right * 2,
  sankeyHeight = height / 2 - sankeyMargin.top - sankeyMargin.bottom;

let titleBarHeight = 35;

let stackedBarLeft = 0,
  stackedBarTop = height/2 + titleBarHeight * 2;
let stackedBarMargin = {
    top: height / 2 + titleBarHeight + sankeyMargin.bottom + 80,
    right: 70,
    bottom: 40,
    left: 50,
  },
  stackedBarWidth = width / 2;
stackedBarHeight = height / 2;

let pieLeft = width / 2,
  pieTop = height / 2 + titleBarHeight * 2;
let pieMargin = { top: 20, right: 20, bottom: 20, left: 20 },
  pieWidth = width / 2 - pieMargin.left - pieMargin.right,
  pieHeight = height / 2 - pieMargin.top - pieMargin.bottom - titleBarHeight;

// plots
d3.csv("data/fitness_data.csv").then((rawData) => {
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
  }); // These are the columns that we are focusing on for the sankey
  filteredData["columns"] = [
    "Did wearable influenced person to exercise?",
    "Was the exercise more enjoyable?",
    "Exercise weekly frequency.",
  ];

  // Docs used for learning to how to create the diagram: https://observablehq.com/@d3/parallel-sets
  // This graph being created will be used by the sankey diagram
  // The flow will be: Influence to exercise more -> More enjoyable ->  Exercise frequency
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
        nodeByKey.set(key, node);
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

  // These colors will be used throughout the whole visualization
  // The main idea is we are exploring how people have been influenced to exercise more have 
  // also been influenced to do other things as well
  const color = d3
    .scaleOrdinal()
    .domain(filteredData.columns)
    .range(["#5fc067", "#9ae885", "#c3d6a6"]);

  // The actual creating of the sankey diagram
  const sankey = d3
    .sankey()
    // The nodes should have a specific order so that the story flows nicely
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

  // Preparing our nodes and links for the sankey diagram
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

  // the bars in the middle that stop the path of a node
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

  // The streams in between the bars
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

  // The titles inside the streams
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
    .text((d) => `(${d.value.toLocaleString()})`);

  // Stacked bar chart
  // Help from: https://observablehq.com/@d3/stacked-bar-chart/2

  // Each bar is going to present the amount of response in each category
  // The bar will be broken up into parts based on how many people in each category 
  // also said that the wearable influenced them to exercise
  const stackedBarData = (() => {
    processed_datum = {};
    responsesCounts = new d3.InternMap([], JSON.stringify);
    processed_data = [];

    // make all possible combinations
    const influences = new Set();
    const useFrequencies = new Set();
    rawData.forEach((d) => {
      const influence =
        "Influence more exercise: " +
        (
          d[
            "Has using a fitness wearable influenced your decision? [To exercise more?]"
          ] || ""
        ).trim();
      const useFrequency =
        d["How frequently do you use your fitness wearable?"];
      influences.add(influence);
      useFrequencies.add(useFrequency);
    });

    for (const influence of influences) {
      for (const useFrequency of useFrequencies) {
        responsesCounts.set([influence, useFrequency], 0);
      }
    }

    rawData.forEach((d) => {
      influence =
        "Influence more exercise: " +
        d[
          "Has using a fitness wearable influenced your decision? [To exercise more?]"
        ];
      useFrequency = d["How frequently do you use your fitness wearable?"];
      // influence is key[0] and frequency is key[1]
      key = [influence, useFrequency];
      responsesCounts.set(key, responsesCounts.get(key) + 1);
    });

    for (const [k, v] of responsesCounts) {
      processed_data.push({ influence: k[0], useFrequency: k[1], count: v });
    }

    return processed_data;
  })();

  // will be used by the stack function to access the data
  const indexMap = d3.index(
    stackedBarData,
    (d) => d.useFrequency,
    (d) => d.influence,
  );

  // The "categories mentioned earlier"
  const keys = d3.union(stackedBarData.map((d) => d.influence));

  const series = d3
    .stack()
    .keys(keys)
    .order((series) => d3.range(series.length).reverse())
    .value(([, D], key) => (D.get(key) && D.get(key).count) || 0)(indexMap);

  // Again, order the data so that the story makes more sense
  const freqOrder = ["Rarely", "1-2 times a week", "3-4 times a week", "Daily"];

  // Creating the X-axis boundaries in the svg
  const x = d3
    .scaleBand()
    .domain(freqOrder)
    .range([
      stackedBarLeft + stackedBarMargin.left,
      stackedBarWidth - stackedBarMargin.right,
    ])
    .padding(0.1);

  // Creating the Y-axis boundaries in the svg
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(series, (d) => d3.max(d, (d) => d[1])) + 1])
    .rangeRound([
      stackedBarHeight * 2 - stackedBarMargin.bottom,
      stackedBarTop,
    ]);

  // Adding in the bars
  svg
    .append("g")
    .selectAll()
    .data(series)
    .join("g")
    .attr("fill", (d) => color(d.key))
    .selectAll("rect")
    .data((D) => D.map((d) => ((d.key = D.key), d)))
    .join("rect")
    .attr("x", (d) => x(d.data[0] ))
    .attr("y", (d) => y(d[1]))
    .attr("height", (d) => y(d[0]) - y(d[1]))
    .attr("width", x.bandwidth())
    .append("title")
    .text(
      (d) =>
        `Exercise Frequency: ${d.data[0]}\n${d.key}\nCount: ${d.data[1].get(d.key).count}`,
    );
  
  // Line for the X-axis
  svg
    .append("g")
    .attr(
      "transform",
      `translate(0,${stackedBarHeight * 2 - stackedBarMargin.bottom})`,
    )
    .call(d3.axisBottom(x).tickSizeOuter(0));

  // Line of the Y-axis
  svg
    .append("g")
    .attr("transform", `translate(${stackedBarMargin.left + 3}, 0)`)
    .call(d3.axisLeft(y).ticks(null, "s"));

  // Title for stack bar plot
  svg
    .append("text")
    .attr("x", stackedBarWidth / 2)
    .attr("y", height / 2 + titleBarHeight * 2)
    .attr("text-anchor", "middle")
    .attr("font-size", width > 1100 ? 16 : 12)
    .attr("font-weight", "bold")
    .text("How often did the influenced users wear their wearables?");
  
  // Title of x axis
  svg
    .append("text")
    .attr("x", stackedBarWidth / 2)
    .attr("y", stackedBarTop + stackedBarHeight - 80)
    .attr("text-anchor", "middle")
    .attr("font-size", 12)
    .attr("font-weight", "bold")
    .text("How frequently respondents used their wearables");
  
  // Title of y axis
  svg
    .append("text")
    .attr("text-anchor", "middle")
    .attr("font-size", 12)
    .attr("font-weight", "bold")
    .attr("transform", `translate(${stackedBarMargin.left/2}, ${stackedBarTop + stackedBarHeight/2 - stackedBarMargin.bottom}) rotate(-90)`)
    .text("Number of people ");

  // At last, add a pie chart
  const pieData = (() => {
    // we are going to look at what proportions of users who agree or strongly agreed
    // wearables influenced a change in diet, also said wearables influenced decision to exercise
    const processed_data = {};
    const filteredData = rawData.filter((d) => {
      let response =
        d[
          "Has using a fitness wearable influenced your decision? [To change your diet?]"
        ];
      return response == "Agree" || response == "Strongly agree";
    });

    let responseCounts = new Map([
      ["Agree", 0],
      ["Strongly agree", 0],
      ["Neutral", 0],
    ]);

    filteredData.forEach((d) => {
      let influence =
        d[
          "Has using a fitness wearable influenced your decision? [To exercise more?]"
        ];
      responseCounts.set(influence, responseCounts.get(influence) + 1);
    });

    for (const [k, v] of responseCounts) {
      processed_data[k] = v;
    }
    return processed_data;
  })();

  const dataPrepper = d3.pie().value((d) => d[1]);
  const piePreppedData = dataPrepper(Object.entries(pieData));

  // The canvas where the pie chart will be painted
  const svg2 = svg
    .append("svg")
    .attr("x", pieLeft)
    .attr("y", pieTop)
    .attr("height", pieHeight)
    .attr("width", pieWidth);

  const radius = Math.min(pieWidth, pieHeight) / 4;
  const arcGenerator = d3.arc().innerRadius(0).outerRadius(radius);

  const pieGroup = svg2
    .append("g")
    .attr("transform", `translate(${pieWidth / 2}, ${pieHeight / 2})`);

  // The actual slices of data
  pieGroup
    .selectAll("slices")
    .data(piePreppedData)
    .join("path")
    .attr("d", arcGenerator)
    .attr("fill", (d) => color(d.data[0]));

  // The titles for each of the slices of data
  pieGroup
    .selectAll("slices")
    .data(piePreppedData)
    .join("text")
    .text((d) =>  d.data[0])
    .attr("transform", (d) => {
      const mid = (d.startAngle + d.endAngle) / 2 - Math.PI/2;
      const r = radius;// outer radius
      return `translate(${Math.cos(mid) * r}, ${Math.sin(mid) * r})`
    })
    .attr("text-anchor", "middle")
    .attr("font-size", radius > 50 ? 14 : 8);
  
  // Top title
  svg2
    .append("text")
    .attr("x", pieWidth / 2)
    .attr("y", 30)
    .attr("font-weight", "bold")
    .attr("text-anchor", "middle")
    .attr("font-size", width > 1000 ? 11 : 9)
    .text(
      "From users who also agreed, or strongly agreed the wearable influence diet habits...",
    );
  
  // Bottom title
  svg2
    .append("text")
    .attr("x", pieWidth / 2)
    .attr("y", pieHeight - pieMargin.bottom * 2)
    .attr("font-weight", "bold")
    .attr("text-anchor", "middle")
    .attr("font-size", width > 1000 ? 11 : 9)
    .text("over 50% also agreed it influenced their decision to exercise!");

  // Add the legend (used by all the charts)
  const legendKeys = [
    "Influence more exercise: Strongly agree ",
    "Influence more exercise: Agree",
    "Influence more exercise: Neutral",
  ];
  const legendX = width / 2 - 330;
  const legendY = 15;
  let size = 20;
  svg
    .selectAll("mydots")
    .data(legendKeys)
    .enter()
    .append("rect")
    .attr("y", legendY)
    .attr("x", function (d, i) {
      return legendX + i * (size + 300);
    })
    .attr("width", size)
    .attr("height", size)
    .style("fill", function (d) {
      return color(d);
    });

  svg
    .selectAll("mylabels")
    .data(legendKeys)
    .enter()
    .append("text")
    .attr("y", legendY + size * 1.4)
    .attr("x", function (d, i) {
      return legendX + i * (size + 300) + size / 2;
    }) // 100 is where the first dot appears. 25 is the distance between dots
    .text(function (d) {
      return d;
    })
    .attr("font-size", 10)
    .attr("font-weight", "bold")
    .attr("text-anchor", "middle")
    .style("alignment-baseline", "middle");
});
