let fullData = [];
let brushedData = [];
let selectedCountry = null;
 
d3.csv("data/gtd_dashboard.csv").then(function(data) {
  data.forEach(function(d) {
    d.iyear    = +d.iyear;
    d.nkill    = d.nkill  === "" ? 0 : +d.nkill;
    d.nwound   = d.nwound === "" ? 0 : +d.nwound;
    d.casualties = d.nkill + d.nwound;
  });
 
  data = data.filter(function(d) {
    return d.iyear &&
           d.country_txt &&
           d.region_txt  &&
           d.attacktype1_txt &&
           d.weaptype1_txt;
  });
 
  fullData    = data;
  brushedData = data;
 
  drawLineChart(data);
  drawBarChart(data);
  drawAlluvialChart(data);
});
 
 
function drawLineChart(data) {
  const svg    = d3.select("#line-chart");
  const width  = svg.node().clientWidth;
  const height = svg.node().clientHeight;
 
  const margin      = { top: 25, right: 30, bottom: 50, left: 60 };
  const chartWidth  = width  - margin.left - margin.right;
  const chartHeight = height - margin.top  - margin.bottom;
 
  svg.selectAll("*").remove();
 
  const chart = svg.append("g") // shift the group inward so axes and labels have room
    .attr("transform", `translate(${margin.left},${margin.top})`);
 
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
 
  chart.append("g") // x-axis along the bottom showing years
    .attr("transform", `translate(0,${chartHeight})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")));
 
  chart.append("g") // y-axis on the left showing attack counts
    .call(d3.axisLeft(y));
 
  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.count));
 
  chart.append("path") // line path connecting attack counts across years
    .datum(attacksByYear)
    .attr("fill", "none")
    .attr("stroke", "#2563eb")
    .attr("stroke-width", 2.5)
    .attr("d", line);
 
  chart.append("text") // label below the x-axis
    .attr("class", "axis-label")
    .attr("x", chartWidth / 2)
    .attr("y", chartHeight + 40)
    .attr("text-anchor", "middle")
    .text("Year");
 
  chart.append("text") // label beside the y-axis, rotated to read vertically
    .attr("class", "axis-label")
    .attr("x", -chartHeight / 2)
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("Number of Attacks");
 
  chart.append("line") // short line in the legend showing the stroke color
    .attr("x1", chartWidth - 150)
    .attr("x2", chartWidth - 120)
    .attr("y1", 10).attr("y2", 10)
    .attr("stroke", "#2563eb")
    .attr("stroke-width", 2.5);
 
  chart.append("text") // legend label explaining what the color represents
    .attr("class", "legend-text")
    .attr("x", chartWidth - 110)
    .attr("y", 14)
    .text("Attacks per year");
 
  chart.append("text") // small hint text so users know they can drag to brush
    .attr("class", "brush-hint")
    .attr("x", chartWidth / 2)
    .attr("y", -8)
    .attr("text-anchor", "middle")
    .text("← drag to select a year range");
 
  const brush = d3.brushX()
    .extent([[0, 0], [chartWidth, chartHeight]])
    .on("end", function(event) {
      if (!event.selection) {
        brushedData     = fullData;
        selectedCountry = null;
        updateBarChart(fullData);
        updateAlluvialChart(fullData);
        chart.select(".brush-range").remove();
        return;
      }
 
      const [x0, x1] = event.selection.map(px => Math.round(x.invert(px)));
 
      chart.select(".brush-range").remove();
      chart.append("rect") // semi-transparent rect to highlight the selected year range
        .attr("class", "brush-range")
        .attr("x", x(x0))
        .attr("y", 0)
        .attr("width", x(x1) - x(x0))
        .attr("height", chartHeight)
        .attr("fill", "#2563eb")
        .attr("opacity", 0.08)
        .attr("pointer-events", "none");
 
      brushedData     = fullData.filter(d => d.iyear >= x0 && d.iyear <= x1);
      selectedCountry = null;
      updateBarChart(brushedData);
      updateAlluvialChart(brushedData);
    });
 
  chart.append("g") // brush layer on top of the chart so dragging works
    .attr("class", "brush")
    .call(brush);
}
 
 
function drawBarChart(data) {
  const svg    = d3.select("#bar-chart");
  const width  = svg.node().clientWidth;
  const height = svg.node().clientHeight;
 
  const margin      = { top: 20, right: 25, bottom: 45, left: 115 };
  const chartWidth  = width  - margin.left - margin.right;
  const chartHeight = height - margin.top  - margin.bottom;
 
  svg.selectAll("*").remove();
 
  const chart = svg.append("g") // shift the group inward so axes and labels have room
    .attr("class", "bar-chart-group")
    .attr("transform", `translate(${margin.left},${margin.top})`);
 
  const topCountries = getTop10(data);
 
  const x = d3.scaleLinear()
    .domain([0, d3.max(topCountries, d => d.count)])
    .nice()
    .range([0, chartWidth]);
 
  const y = d3.scaleBand()
    .domain(topCountries.map(d => d.country))
    .range([0, chartHeight])
    .padding(0.2);
 
  chart.append("g") // x-axis along the bottom showing years
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${chartHeight})`)
    .call(d3.axisBottom(x).ticks(5));
 
  chart.append("g") // y-axis on the left showing attack counts
    .attr("class", "y-axis")
    .call(d3.axisLeft(y));
 
  chart.selectAll(".country-bar") // one horizontal bar per country, width encodes attack count
    .data(topCountries, d => d.country)
    .enter()
    .append("rect")
    .attr("class", "country-bar")
    .attr("x", 0)
    .attr("y", d => y(d.country))
    .attr("width", d => x(d.count))
    .attr("height", y.bandwidth())
    .attr("fill", "#dc2626")
    .on("click", function(event, d) {
      if (selectedCountry === d.country) {
        selectedCountry = null;
        d3.selectAll(".country-bar").attr("fill", "#dc2626").attr("opacity", 1);
        updateAlluvialChart(brushedData);
      } else {
        selectedCountry = d.country;
        d3.selectAll(".country-bar")
          .attr("fill",    bar => bar.country === selectedCountry ? "#b91c1c" : "#dc2626")
          .attr("opacity", bar => bar.country === selectedCountry ? 1 : 0.4);
        const countryData = brushedData.filter(r => r.country_txt === selectedCountry);
        updateAlluvialChart(countryData);
      }
    })
    .style("cursor", "pointer");
 
  chart.selectAll(".bar-label") // text labels showing exact count at the end of each bar
    .data(topCountries, d => d.country)
    .enter()
    .append("text")
    .attr("class", "bar-label legend-text")
    .attr("x", d => x(d.count) + 4)
    .attr("y", d => y(d.country) + y.bandwidth() / 2 + 4)
    .text(d => d.count);
 
  chart.append("text") // label below the x-axis
    .attr("class", "axis-label")
    .attr("x", chartWidth / 2)
    .attr("y", chartHeight + 38)
    .attr("text-anchor", "middle")
    .text("Number of Attacks");
 
  chart.append("rect") // colored square in the legend
    .attr("x", chartWidth - 120)
    .attr("y", 0)
    .attr("width", 12).attr("height", 12)
    .attr("fill", "#dc2626");
 
  chart.append("text") // legend label explaining what the color represents
    .attr("class", "legend-text")
    .attr("x", chartWidth - 102)
    .attr("y", 10)
    .text("Country total");
 
  chart.append("text") // small hint text telling users to click a bar to filter
    .attr("class", "brush-hint")
    .attr("x", chartWidth - 102)
    .attr("y", 24)
    .text("click bar to drill down");
}
 
 
function updateBarChart(data) {
  const svg    = d3.select("#bar-chart");
  const width  = svg.node().clientWidth;
  const height = svg.node().clientHeight;
 
  const margin      = { top: 20, right: 25, bottom: 45, left: 115 };
  const chartWidth  = width  - margin.left - margin.right;
  const chartHeight = height - margin.top  - margin.bottom;
 
  const chart = svg.select(".bar-chart-group");
  if (chart.empty()) { drawBarChart(data); return; }
 
  const topCountries = getTop10(data);
 
  const x = d3.scaleLinear()
    .domain([0, d3.max(topCountries, d => d.count) || 1])
    .nice()
    .range([0, chartWidth]);
 
  const y = d3.scaleBand()
    .domain(topCountries.map(d => d.country))
    .range([0, chartHeight])
    .padding(0.2);
 
  const t = d3.transition().duration(600).ease(d3.easeCubicInOut);
 
  chart.select(".x-axis") // transition x-axis to match the new data range
    .transition(t)
    .call(d3.axisBottom(x).ticks(5));
 
  chart.select(".y-axis") // transition y-axis to reflect the new country order
    .transition(t)
    .call(d3.axisLeft(y));
 
  const bars = chart.selectAll(".country-bar")
    .data(topCountries, d => d.country);
 
  bars.exit() // fade out and remove bars for countries no longer in top 10
    .transition(t)
    .attr("opacity", 0)
    .attr("width", 0)
    .remove();
 
  bars.enter() // fade in new bars for countries that entered the top 10
    .append("rect")
    .attr("class", "country-bar")
    .attr("x", 0)
    .attr("y", d => y(d.country))
    .attr("width", 0)
    .attr("height", y.bandwidth())
    .attr("fill", d => d.country === selectedCountry ? "#b91c1c" : "#dc2626")
    .attr("opacity", 0)
    .style("cursor", "pointer")
    .on("click", function(event, d) {
      if (selectedCountry === d.country) {
        selectedCountry = null;
        d3.selectAll(".country-bar").attr("fill", "#dc2626").attr("opacity", 1);
        updateAlluvialChart(brushedData);
      } else {
        selectedCountry = d.country;
        d3.selectAll(".country-bar")
          .attr("fill",    bar => bar.country === selectedCountry ? "#b91c1c" : "#dc2626")
          .attr("opacity", bar => bar.country === selectedCountry ? 1 : 0.4);
        const countryData = brushedData.filter(r => r.country_txt === selectedCountry);
        updateAlluvialChart(countryData);
      }
    })
    .transition(t)
    .attr("opacity", 1)
    .attr("y", d => y(d.country))
    .attr("width", d => x(d.count))
    .attr("height", y.bandwidth());
 
  bars.transition(t) // animate bars that stayed in the top 10 to their new size and position
    .attr("y", d => y(d.country))
    .attr("width", d => x(d.count))
    .attr("height", y.bandwidth())
    .attr("fill", d => d.country === selectedCountry ? "#b91c1c" : "#dc2626")
    .attr("opacity", d => selectedCountry && d.country !== selectedCountry ? 0.4 : 1);
 
  const labels = chart.selectAll(".bar-label")
    .data(topCountries, d => d.country);
 
  labels.exit().transition(t).attr("opacity", 0).remove();
 
  labels.enter() // text labels showing exact count at the end of each bar for new bars
    .append("text")
    .attr("class", "bar-label legend-text")
    .attr("opacity", 0)
    .merge(labels)
    .transition(t)
    .attr("opacity", 1)
    .attr("x", d => x(d.count) + 4)
    .attr("y", d => y(d.country) + y.bandwidth() / 2 + 4)
    .text(d => d.count);
}
 
 
function drawAlluvialChart(data) {
  const svg    = d3.select("#alluvial-chart");
  const width  = svg.node().clientWidth;
  const height = svg.node().clientHeight;
 
  const margin      = { top: 35, right: 35, bottom: 25, left: 35 };
  const chartWidth  = width  - margin.left - margin.right;
  const chartHeight = height - margin.top  - margin.bottom;
 
  svg.selectAll("*").remove();
 
  const chart = svg.append("g") // shift the group inward so axes and labels have room
    .attr("class", "alluvial-group")
    .attr("transform", `translate(${margin.left},${margin.top})`);
 
  renderAlluvial(chart, data, chartWidth, chartHeight);
}
 
 
function updateAlluvialChart(data) {
  const svg    = d3.select("#alluvial-chart");
  const width  = svg.node().clientWidth;
  const height = svg.node().clientHeight;
 
  const margin      = { top: 35, right: 35, bottom: 25, left: 35 };
  const chartWidth  = width  - margin.left - margin.right;
  const chartHeight = height - margin.top  - margin.bottom;
 
  const chart = svg.select(".alluvial-group");
 
  chart.transition() // fade out the current alluvial before replacing it
    .duration(300)
    .attr("opacity", 0)
    .on("end", function() {
      chart.selectAll("*").remove();
      renderAlluvial(chart, data, chartWidth, chartHeight);
      chart.attr("opacity", 0)
        .transition() // fade the redrawn alluvial back in
        .duration(400)
        .attr("opacity", 1);
    });
}
 
 
function renderAlluvial(chart, data, chartWidth, chartHeight) {
  const nodeWidth   = 14;
  const nodePadding = 8;
 
  const topRegions     = getTopValues(data, "region_txt",      4);
  const topAttackTypes = getTopValues(data, "attacktype1_txt", 5);
  const topWeaponTypes = getTopValues(data, "weaptype1_txt",   4);
 
  const filtered = data.filter(function(d) {
    return topRegions.includes(d.region_txt)         &&
           topAttackTypes.includes(d.attacktype1_txt) &&
           topWeaponTypes.includes(d.weaptype1_txt);
  });
 
  if (filtered.length === 0) {
    chart.append("text") // fallback message when the filtered data is empty
      .attr("class", "legend-text")
      .attr("x", chartWidth / 2)
      .attr("y", chartHeight / 2)
      .attr("text-anchor", "middle")
      .text("No data available for this selection.");
    return;
  }
 
  const total = filtered.length;
 
  const regionCounts = countByField(filtered, "region_txt",      topRegions);
  const attackCounts = countByField(filtered, "attacktype1_txt", topAttackTypes);
  const weaponCounts = countByField(filtered, "weaptype1_txt",   topWeaponTypes);
 
  const maxNodeCount = Math.max(topRegions.length, topAttackTypes.length, topWeaponTypes.length);
  const scale = (chartHeight - nodePadding * (maxNodeCount - 1)) / total;
 
  const regionNodes = makeNodes(regionCounts, "region", 0,                     scale, chartHeight, nodePadding);
  const attackNodes = makeNodes(attackCounts, "attack", chartWidth / 2,        scale, chartHeight, nodePadding);
  const weaponNodes = makeNodes(weaponCounts, "weapon", chartWidth - nodeWidth, scale, chartHeight, nodePadding);
 
  const allNodes = regionNodes.concat(attackNodes).concat(weaponNodes);
 
  const nodeMap = new Map();
  allNodes.forEach(n => nodeMap.set(n.id, n));
 
  const regionAttackLinks = makeLinks(filtered, "region_txt",      "attacktype1_txt", "region", "attack");
  const attackWeaponLinks = makeLinks(filtered, "attacktype1_txt", "weaptype1_txt",   "attack", "weapon");
  const links = regionAttackLinks.concat(attackWeaponLinks);
 
  const color = d3.scaleOrdinal() // different color for each column: region, attack, weapon
    .domain(["region", "attack", "weapon"])
    .range(["#2563eb", "#dc2626", "#16a34a"]);
 
  addLinkOffsets(links, nodeMap, scale);
 
  chart.selectAll(".flow-path") // curved paths showing how incidents flow between categories
    .data(links)
    .enter()
    .append("path")
    .attr("class", "flow-path")
    .attr("d", function(d) {
      const src = nodeMap.get(d.source);
      const tgt = nodeMap.get(d.target);
      const x1  = src.x + nodeWidth;
      const y1  = src.y + d.sourceOffset + d.width / 2;
      const x2  = tgt.x;
      const y2  = tgt.y + d.targetOffset + d.width / 2;
      const mid = (x1 + x2) / 2;
      return `M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`;
    })
    .attr("fill", "none")
    .attr("stroke", d => color(nodeMap.get(d.source).type))
    .attr("stroke-width", d => Math.max(1, d.width))
    .attr("opacity", 0.35);
 
  chart.selectAll(".alluvial-node") // rectangle for each category node sized by incident count
    .data(allNodes)
    .enter()
    .append("rect")
    .attr("class", "alluvial-node")
    .attr("x",       d => d.x)
    .attr("y",       d => d.y)
    .attr("width",   nodeWidth)
    .attr("height",  d => d.height)
    .attr("fill",    d => color(d.type))
    .attr("opacity", 0.9);
 
  chart.selectAll(".alluvial-label") // text label next to each node showing the category name
    .data(allNodes)
    .enter()
    .append("text")
    .attr("class", "legend-text")
    .attr("x", d => d.type === "weapon" ? d.x - 6 : d.x + nodeWidth + 6)
    .attr("y", d => d.y + d.height / 2 + 4)
    .attr("text-anchor", d => d.type === "weapon" ? "end" : "start")
    .text(d => shortenLabel(d.name, 22));
 
  chart.append("text") // column header for the region nodes
    .attr("class", "axis-label")
    .attr("x", 0).attr("y", -14)
    .attr("text-anchor", "start")
    .text("Region");
 
  chart.append("text") // column header for the attack type nodes
    .attr("class", "axis-label")
    .attr("x", chartWidth / 2).attr("y", -14)
    .attr("text-anchor", "middle")
    .text("Attack Type");
 
  chart.append("text") // column header for the weapon type nodes
    .attr("class", "axis-label")
    .attr("x", chartWidth).attr("y", -14)
    .attr("text-anchor", "end")
    .text("Weapon Type");
 
  chart.append("text") // note at the bottom explaining that flow thickness encodes incident count
    .attr("class", "legend-text")
    .attr("x", chartWidth / 2)
    .attr("y", chartHeight + 18)
    .attr("text-anchor", "middle")
    .text("thicker flows = more incidents following that pattern");
}
 
 
function getTop10(data) {
  return Array.from(
    d3.rollup(data, v => v.length, d => d.country_txt),
    ([country, count]) => ({ country, count })
  ).sort((a, b) => b.count - a.count)
   .slice(0, 10);
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
  return order.map(name => ({ name, count: counts.get(name) || 0 }));
}
 
function makeNodes(counts, type, xPosition, scale, chartHeight, nodePadding) {
  const totalHeight = d3.sum(counts, d => d.count * scale) +
                      nodePadding * (counts.length - 1);
  let currentY = (chartHeight - totalHeight) / 2;
 
  return counts.map(function(d) {
    const node = {
      id:     `${type}:${d.name}`,
      name:   d.name,
      type:   type,
      count:  d.count,
      x:      xPosition,
      y:      currentY,
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
        count:  count
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
 
    const so = sourceOffsets.get(d.source) || 0;
    const to = targetOffsets.get(d.target) || 0;
 
    d.sourceOffset = so;
    d.targetOffset = to;
 
    sourceOffsets.set(d.source, so + d.width);
    targetOffsets.set(d.target, to + d.width);
  });
}
 
function shortenLabel(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}
 