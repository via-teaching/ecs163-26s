d3.csv("data/gtd_dashboard.csv").then(function(data) {
  // load the csv from the data folder

  data.forEach(function(d) {
    // turn the year and casualty columns into numbers so d3 can use them
    d.iyear = +d.iyear;
    d.nkill = d.nkill === "" ? 0 : +d.nkill;
    d.nwound = d.nwound === "" ? 0 : +d.nwound;
    d.casualties = d.nkill + d.nwound;
  });

  data = data.filter(function(d) {
    // keep only rows that have the main fields needed for the dashboard
    return d.iyear &&
           d.country_txt &&
           d.region_txt &&
           d.attacktype1_txt &&
           d.weaptype1_txt;
  });

  drawLineChart(data);
  drawBarChart(data);
  drawAlluvialChart(data);
});


function drawLineChart(data) {
  const svg = d3.select("#line-chart");
  const width = svg.node().clientWidth;
  const height = svg.node().clientHeight;

  const margin = { top: 25, right: 30, bottom: 50, left: 60 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  svg.selectAll("*").remove();

  // make a group inside the svg so the chart has space for axes and labels
  const chart = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // group the data by year and count how many attacks happened each year
  const attacksByYear = Array.from(
    d3.rollup(data, v => v.length, d => d.iyear),
    ([year, count]) => ({ year, count })
  ).sort((a, b) => a.year - b.year);

  const x = d3.scaleLinear()
    .domain(d3.extent(attacksByYear, d => d.year))
    .range([0, chartWidth]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(attacksByYear, d => d.count)])
    .nice()
    .range([chartHeight, 0]);

  // draw the x-axis to show the years
  chart.append("g")
    .attr("transform", `translate(0,${chartHeight})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")));

  // draw the y-axis to show the number of attacks
  chart.append("g")
    .call(d3.axisLeft(y));

  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.count));

  // draw the line to show how attacks changed over time
  chart.append("path")
    .datum(attacksByYear)
    .attr("fill", "none")
    .attr("stroke", "#2563eb")
    .attr("stroke-width", 2.5)
    .attr("d", line);

  // add the x-axis label so the year encoding is clear
  chart.append("text")
    .attr("class", "axis-label")
    .attr("x", chartWidth / 2)
    .attr("y", chartHeight + 40)
    .attr("text-anchor", "middle")
    .text("Year");

  // add the y-axis label so the count encoding is clear
  chart.append("text")
    .attr("class", "axis-label")
    .attr("x", -chartHeight / 2)
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("Number of Attacks");

  // add a small legend line to explain what the blue line means
  chart.append("line")
    .attr("x1", chartWidth - 150)
    .attr("x2", chartWidth - 120)
    .attr("y1", 10)
    .attr("y2", 10)
    .attr("stroke", "#2563eb")
    .attr("stroke-width", 2.5);

  // add the legend text for the line chart
  chart.append("text")
    .attr("class", "legend-text")
    .attr("x", chartWidth - 110)
    .attr("y", 14)
    .text("Attacks per year");
}


function drawBarChart(data) {
  const svg = d3.select("#bar-chart");
  const width = svg.node().clientWidth;
  const height = svg.node().clientHeight;

  const margin = { top: 20, right: 25, bottom: 45, left: 115 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  svg.selectAll("*").remove();

  // make a group inside the svg so the bars have room for axes and labels
  const chart = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // count attacks for each country and keep only the top 10 countries
  const topCountries = Array.from(
    d3.rollup(data, v => v.length, d => d.country_txt),
    ([country, count]) => ({ country, count })
  ).sort((a, b) => b.count - a.count)
   .slice(0, 10);

  const x = d3.scaleLinear()
    .domain([0, d3.max(topCountries, d => d.count)])
    .nice()
    .range([0, chartWidth]);

  const y = d3.scaleBand()
    .domain(topCountries.map(d => d.country))
    .range([0, chartHeight])
    .padding(0.2);

  // draw the x-axis showing the number of attacks
  chart.append("g")
    .attr("transform", `translate(0,${chartHeight})`)
    .call(d3.axisBottom(x).ticks(5));

  // draw the y-axis showing the country names
  chart.append("g")
    .call(d3.axisLeft(y));

  // draw one bar for each country
  chart.selectAll(".country-bar")
    .data(topCountries)
    .enter()
    .append("rect")
    .attr("class", "country-bar")
    .attr("x", 0)
    .attr("y", d => y(d.country))
    .attr("width", d => x(d.count))
    .attr("height", y.bandwidth())
    .attr("fill", "#dc2626");

  // add text labels to show the exact count beside each bar
  chart.selectAll(".bar-label")
    .data(topCountries)
    .enter()
    .append("text")
    .attr("class", "legend-text")
    .attr("x", d => x(d.count) + 4)
    .attr("y", d => y(d.country) + y.bandwidth() / 2 + 4)
    .text(d => d.count);

  // add the x-axis label so the bar length is easier to understand
  chart.append("text")
    .attr("class", "axis-label")
    .attr("x", chartWidth / 2)
    .attr("y", chartHeight + 38)
    .attr("text-anchor", "middle")
    .text("Number of Attacks");

  // add a legend square for the country total bars
  chart.append("rect")
    .attr("x", chartWidth - 120)
    .attr("y", 0)
    .attr("width", 12)
    .attr("height", 12)
    .attr("fill", "#dc2626");

  // add legend text to explain what the red bars mean
  chart.append("text")
    .attr("class", "legend-text")
    .attr("x", chartWidth - 102)
    .attr("y", 10)
    .text("Country total");
}


function drawAlluvialChart(data) {
  const svg = d3.select("#alluvial-chart");
  const width = svg.node().clientWidth;
  const height = svg.node().clientHeight;

  const margin = { top: 35, right: 35, bottom: 25, left: 35 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  svg.selectAll("*").remove();

  // make a group inside the svg so the alluvial view has room for labels
  const chart = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const nodeWidth = 14;
  const nodePadding = 8;

  const topRegions = getTopValues(data, "region_txt", 4);
  const topAttackTypes = getTopValues(data, "attacktype1_txt", 5);
  const topWeaponTypes = getTopValues(data, "weaptype1_txt", 4);

  // keep only the most common categories so the alluvial diagram stays readable
  const filtered = data.filter(function(d) {
    return topRegions.includes(d.region_txt) &&
           topAttackTypes.includes(d.attacktype1_txt) &&
           topWeaponTypes.includes(d.weaptype1_txt);
  });

  const total = filtered.length;

  const regionCounts = countByField(filtered, "region_txt", topRegions);
  const attackCounts = countByField(filtered, "attacktype1_txt", topAttackTypes);
  const weaponCounts = countByField(filtered, "weaptype1_txt", topWeaponTypes);

  const maxNodeCount = Math.max(topRegions.length, topAttackTypes.length, topWeaponTypes.length);
  const scale = (chartHeight - nodePadding * (maxNodeCount - 1)) / total;

  const regionNodes = makeNodes(regionCounts, "region", 0, scale, chartHeight, nodePadding);
  const attackNodes = makeNodes(attackCounts, "attack", chartWidth / 2, scale, chartHeight, nodePadding);
  const weaponNodes = makeNodes(weaponCounts, "weapon", chartWidth - nodeWidth, scale, chartHeight, nodePadding);

  const allNodes = regionNodes.concat(attackNodes).concat(weaponNodes);

  const nodeMap = new Map();
  allNodes.forEach(function(node) {
    nodeMap.set(node.id, node);
  });

  const regionAttackLinks = makeLinks(filtered, "region_txt", "attacktype1_txt", "region", "attack");
  const attackWeaponLinks = makeLinks(filtered, "attacktype1_txt", "weaptype1_txt", "attack", "weapon");

  const links = regionAttackLinks.concat(attackWeaponLinks);

  const color = d3.scaleOrdinal()
    .domain(["region", "attack", "weapon"])
    .range(["#2563eb", "#dc2626", "#16a34a"]);

  addLinkOffsets(links, nodeMap, scale);

  // draw the flows between region, attack type, and weapon type
  chart.selectAll(".flow-path")
    .data(links)
    .enter()
    .append("path")
    .attr("class", "flow-path")
    .attr("d", function(d) {
      const source = nodeMap.get(d.source);
      const target = nodeMap.get(d.target);

      const x1 = source.x + nodeWidth;
      const y1 = source.y + d.sourceOffset + d.width / 2;
      const x2 = target.x;
      const y2 = target.y + d.targetOffset + d.width / 2;

      const mid = (x1 + x2) / 2;

      return `M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`;
    })
    .attr("fill", "none")
    .attr("stroke", function(d) {
      const source = nodeMap.get(d.source);
      return color(source.type);
    })
    .attr("stroke-width", d => Math.max(1, d.width))
    .attr("opacity", 0.35);

  // draw one rectangle for each category node
  chart.selectAll(".alluvial-node")
    .data(allNodes)
    .enter()
    .append("rect")
    .attr("class", "alluvial-node")
    .attr("x", d => d.x)
    .attr("y", d => d.y)
    .attr("width", nodeWidth)
    .attr("height", d => d.height)
    .attr("fill", d => color(d.type))
    .attr("opacity", 0.9);

  // add text labels beside each node so the categories are clear
  chart.selectAll(".alluvial-label")
    .data(allNodes)
    .enter()
    .append("text")
    .attr("class", "legend-text")
    .attr("x", function(d) {
      if (d.type === "weapon") return d.x - 6;
      return d.x + nodeWidth + 6;
    })
    .attr("y", d => d.y + d.height / 2 + 4)
    .attr("text-anchor", d => d.type === "weapon" ? "end" : "start")
    .text(d => shortenLabel(d.name, 22));

  // add the column label for regions
  chart.append("text")
    .attr("class", "axis-label")
    .attr("x", 0)
    .attr("y", -14)
    .attr("text-anchor", "start")
    .text("Region");

  // add the column label for attack types
  chart.append("text")
    .attr("class", "axis-label")
    .attr("x", chartWidth / 2)
    .attr("y", -14)
    .attr("text-anchor", "middle")
    .text("Attack Type");

  // add the column label for weapon types
  chart.append("text")
    .attr("class", "axis-label")
    .attr("x", chartWidth)
    .attr("y", -14)
    .attr("text-anchor", "end")
    .text("Weapon Type");

  // add a note explaining how to read the flow thickness
  chart.append("text")
    .attr("class", "legend-text")
    .attr("x", chartWidth / 2)
    .attr("y", chartHeight + 18)
    .attr("text-anchor", "middle")
    .text("thicker flows mean more incidents following that pattern");
}


function getTopValues(data, field, limit) {
  return Array.from(
    d3.rollup(data, v => v.length, d => d[field]),
    ([name, count]) => ({ name, count })
  ).sort((a, b) => b.count - a.count)
   .slice(0, limit)
   .map(d => d.name);
}


function countByField(data, field, order) {
  const counts = d3.rollup(data, v => v.length, d => d[field]);

  return order.map(function(name) {
    return {
      name: name,
      count: counts.get(name) || 0
    };
  });
}


function makeNodes(counts, type, xPosition, scale, chartHeight, nodePadding) {
  const totalHeight = d3.sum(counts, d => d.count * scale) + nodePadding * (counts.length - 1);
  let currentY = (chartHeight - totalHeight) / 2;

  return counts.map(function(d) {
    const node = {
      id: `${type}:${d.name}`,
      name: d.name,
      type: type,
      count: d.count,
      x: xPosition,
      y: currentY,
      height: Math.max(2, d.count * scale)
    };

    currentY += node.height + nodePadding;
    return node;
  });
}


function makeLinks(data, sourceField, targetField, sourceType, targetType) {
  const grouped = d3.rollup(
    data,
    v => v.length,
    d => d[sourceField],
    d => d[targetField]
  );

  const links = [];

  grouped.forEach(function(targetMap, sourceName) {
    targetMap.forEach(function(count, targetName) {
      links.push({
        source: `${sourceType}:${sourceName}`,
        target: `${targetType}:${targetName}`,
        count: count
      });
    });
  });

  return links;
}


function addLinkOffsets(links, nodeMap, scale) {
  const sourceOffsets = new Map();
  const targetOffsets = new Map();

  links.forEach(function(d) {
    d.width = d.count * scale;

    const currentSourceOffset = sourceOffsets.get(d.source) || 0;
    const currentTargetOffset = targetOffsets.get(d.target) || 0;

    d.sourceOffset = currentSourceOffset;
    d.targetOffset = currentTargetOffset;

    sourceOffsets.set(d.source, currentSourceOffset + d.width);
    targetOffsets.set(d.target, currentTargetOffset + d.width);
  });
}


function shortenLabel(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}
