// stores column names for easier reference
const COLS = {
  age: "age",
  year: "Your current year of Study",
  depression: "Do you have Depression?",
  anxiety: "Do you have Anxiety?",
  panic: "Do you have Panic attack?",
  treatment: "Did you seek any specialist for a treatment?"
};

// shared colors to avoid having to use hex for every color in the code
const palette = {
  navy: "#233f73",
  blue: "#355da8",
  lightBlue: "#8fa8d6",
  paleBlue: "#c9d5eb",
  slate: "#6b7a99",
  background: "#f5f7fb",
  text: "#1f2a44",
  white: "#ffffff"
};

// tracks which years/condition are currently filtered
var state = {
  selectedYears: new Set(),
  selectedCondition: new Set()
};

var globalData = [];


// load data
d3.csv("./data/mental_health.csv").then((rawData) => {

  rawData.forEach((d) => {
    d[COLS.age] = Number(d[COLS.age]);
    d[COLS.year] = d[COLS.year].trim().toLowerCase().replace("year", "Year");
  });

  globalData = rawData;
  drawDashboard(rawData);

  // if screen size changes, redraw the dashboard to adjust to new size
  window.addEventListener("resize", () => {
    drawDashboard(rawData);
  });
});


// year-only filter. used by overlap chart
function getFilteredByYear(data) {
  if (state.selectedYears.size > 0) {
    return data.filter((d) => {
      return state.selectedYears.has(d[COLS.year]);
    });
  }
  return data;
}

// year + condition filter. used by sankey
function getFiltered(data) {
  var filtered = getFilteredByYear(data);
  if (state.selectedCondition.size > 0) {
    var condCols = {
      "Depression": COLS.depression,
      "Anxiety": COLS.anxiety,
      "Panic Attack": COLS.panic
    };
    filtered = filtered.filter(function (d) {
      return Array.from(state.selectedCondition).some(function (cond) {
        return d[condCols[cond]] === "Yes";
      });
    });
  }
  return filtered;
}

// redraw sankey + animate overlap whenever filters change
function refreshFocus() {
  drawSankey(globalData);
  animateOverlap(globalData);
  flashCards();
}

// briefly flash the sankey + overlap card borders so it's obvious they updated
function flashCards() {
  ["sankey-svg", "overlap-svg"].forEach((id) => {
    var card = document.getElementById(id).closest(".card");
    if (!card) return;
    card.style.transition = "box-shadow 0.1s ease, border-color 0.1s ease";
    card.style.borderColor = "#355da8";
    card.style.boxShadow = "0 0 0 3px rgba(53,93,168,0.35)";
    setTimeout(() => {
      card.style.borderColor = "";
      card.style.boxShadow = "";
    }, 600);
  });
}

function drawDashboard(data) {
  state.selectedYears = new Set();
  state.selectedCondition = new Set();
  drawHeatmap(data);
  drawSankey(data);
  drawOverlap(data);
}

// Draw a heatmap showing the percentage of students with each mental health condition by study year
function drawHeatmap(data) {

  var container = document.getElementById("heatmap-svg").parentElement;
  var brushH = 36;
  var chartH = 160;
  var totalW = container.clientWidth - 40;
  var totalH = chartH + brushH + 20;
  var margin = { top: 10, right: 16, bottom: 16, left: 110 };
  var W = totalW - margin.left - margin.right;
  var H = chartH;

  // create the svg and clear previous renderings
  var svg = d3.select("#heatmap-svg")
    .attr("width", totalW)
    .attr("height", totalH);

  svg.selectAll("*").remove();

  // group for heatmap content, positioned within the card margins
  var g = svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var years = Array.from(new Set(data.map((d) => {
    return d[COLS.year];
  }))).sort();

  var conditions = [
    { label: "Depression", col: COLS.depression },
    { label: "Anxiety", col: COLS.anxiety },
    { label: "Panic Attack", col: COLS.panic }
  ];

  // calculate count of students with each condition for each year
  var heatmapData = [];
  years.forEach((yr) => {
    var rows = data.filter((d) => d[COLS.year] === yr);
    conditions.forEach((condition) => {
      heatmapData.push({
        year: yr,
        condition: condition.label,
        count: rows.filter((d) => d[condition.col] === "Yes").length
      });
    });
  });

  // scales for positioning heatmap squares
  var xScale = d3.scaleBand()
    .domain(years)
    .range([0, W])
    .padding(0.05);

  var yScale = d3.scaleBand()
    .domain(conditions.map(c => c.label))
    .range([0, H])
    .padding(0.06);

  // Finds the largest count value in the heatmap dataset
  var maxCount = d3.max(heatmapData, d => d.count);
  // linear color scale maps smaller counts to lighter shades, and larger to darker shades
  var colorScale = d3.scaleLinear()
    .domain([0, maxCount / 2, maxCount])
    .range([palette.paleBlue, palette.lightBlue, palette.blue]);

  // draw one rounded rectangle for each year-condition pair
  g.selectAll("rect.cell")
    .data(heatmapData)
    .enter()
    .append("rect")
    .attr("class", "cell")
    .attr("x", d => xScale(d.year))
    .attr("y", d => yScale(d.condition))
    .attr("width", xScale.bandwidth())
    .attr("height", yScale.bandwidth())
    .attr("rx", 8)
    .attr("ry", 8)
    .style("fill", d => colorScale(d.count))
    .style("cursor", "pointer")
    .attr("stroke", palette.background)
    .attr("stroke-width", 4)

    // hover highlights the row, but only if it's not already filtered out by a click
    .on("mouseover", function (d) {
      if (state.selectedCondition.size > 0 && !state.selectedCondition.has(d.condition)) return;
      d3.select(this)
        .transition().duration(100)
        .attr("stroke", palette.navy)
        .attr("stroke-width", 2.5)
        .style("filter", "drop-shadow(0px 2px 6px rgba(35,63,115,0.35))");
    })

    // removes the highlight, but if it's the selected row it gets a different border
    .on("mouseout", function (d) {
      var isSelected = state.selectedCondition.has(d.condition);
      d3.select(this)
        .transition().duration(150)
        .attr("stroke", isSelected ? palette.navy : palette.background)
        .attr("stroke-width", 3)
        .style("filter", null);
    })

    // click to filter by condition row
    .on("click", function (d) {
      if (state.selectedCondition.has(d.condition)) {
        state.selectedCondition.delete(d.condition);
      } else {
        state.selectedCondition.add(d.condition);
      }

      // // Updates the appearance of each heatmap cell based on the current interactive filters.
      // if no condition is selected, all cells are full opacity with no borders. 
      // if some conditions are selected, those rows are full opacity with navy borders, and unselected conditions are faded with no borders. 
      // if some years are also selected, cells in those years are full opacity and cells in unselected years are faded, with an extra fade for cells that are also in unselected conditions.
      g.selectAll("rect.cell")
        .transition().duration(250)
        .style("opacity", function (c) {
          var yearOk = state.selectedYears.size === 0 || state.selectedYears.has(c.year);
          var condOk = state.selectedCondition.size === 0 || state.selectedCondition.has(c.condition);
          if (!yearOk) return 0.2;
          return condOk ? 1 : 0.25;
        })
        .attr("stroke", function (c) {
          return state.selectedCondition.has(c.condition) ? palette.navy : palette.background;
        })
        .attr("stroke-width", function (c) {
          return state.selectedCondition.has(c.condition) ? 2.5 : 3;
        });

      refreshFocus();
    });

  // add count labels to each square, with white text for higher percentages and black text for lower percentages
  g.selectAll("text.cell-label")
    .data(heatmapData)
    .enter()
    .append("text")
    .attr("class", "cell-label")
    .attr("x", d => xScale(d.year) + xScale.bandwidth() / 2)
    .attr("y", d => yScale(d.condition) + yScale.bandwidth() / 2)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .style("font-weight", "600")
    .style("font-size", "12px")
    .style("pointer-events", "none")
    .attr("fill", d => d.count === maxCount ? "white" : palette.text)
    .text(d => d.count);

  // add study year axis 
  g.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0, ${H})`)
    .call(d3.axisBottom(xScale)
      .tickFormat("")
      .tickSize(4));

  // add mental health condition axis
  g.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(yScale)
      .tickSize(0));

  // brush (year) filter
  var brushZone = g.append("g")
    .attr("class", "brush-zone")
    .attr("transform", "translate(0," + (H + 14) + ")");

  // background for the brush area
  brushZone.append("rect")
    .attr("width", W).attr("height", brushH)
    .attr("rx", 6)
    .style("fill", "#dde4f0")
    .style("stroke", palette.lightBlue)
    .style("stroke-width", 1);

  // dividers  and labels for each year in the brush area
  years.forEach(function (yr, i) {
    if (i > 0) {
      // divider line between year labels, but not before the first one
      brushZone.append("line")
        .attr("x1", xScale(yr)).attr("x2", xScale(yr))
        .attr("y1", 4).attr("y2", brushH - 4)
        .attr("stroke", palette.lightBlue).attr("stroke-width", 1)
        .style("pointer-events", "none");
    }

    // year labels centered in each section
    brushZone.append("text")
      .attr("x", xScale(yr) + xScale.bandwidth() / 2)
      .attr("y", brushH - 10)
      .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
      .style("font-size", "11px").style("font-weight", "700").style("fill", palette.navy)
      .style("pointer-events", "none")
      .text(yr);
  });

  // check whether the center of each year label is within the brush selection, and return those that areas
  function getBrushedYears(selected) {
    return years.filter((year) => {
      var bandStart = xScale(year);
      var bandEnd = bandStart + xScale.bandwidth();
      return bandEnd > selected[0] && bandStart < selected[1];
    });
  }

  // update the year labels in the brush area to be bold and navy for selected years, and normal weight and slate for unselected years. 
  // if no years are selected, all labels are navy
  function updateTrackLabels(activeYears) {
    brushZone.selectAll("text")
      .style("fill", function () {
        var text = d3.select(this).text();
        if (!text || text === "click and drag to filter years") return palette.slate;
        if (activeYears.length === 0) return palette.navy;
        return activeYears.indexOf(text) !== -1 ? palette.navy : "#b0bcd4";
      })
      // if no years are selected, all labels are bold and navy. if some years are selected, only those years are bold and navy, and the rest are normal weight and slate
      .style("font-weight", function () {
        var text = d3.select(this).text();
        if (!text || text === "click and drag to filter years") return null;
        if (activeYears.length === 0) return "700";
        return activeYears.indexOf(text) !== -1 ? "700" : "400";
      });
  }

  // when the brush moves, update the selected years and fade the heatmap cells that aren't in the selected years.
  var brush = d3.brushX()
    .extent([[0, 0], [W, brushH]])

    .on("brush", function () {
      var sel = d3.event.selection;
      if (!sel) return;
      var by = getBrushedYears(sel);
      updateTrackLabels(by);
      g.selectAll("rect.cell").style("opacity", function (c) {
        return by.length === 0 || by.indexOf(c.year) !== -1 ? 1 : 0.5;
      });
      g.selectAll("text.cell-label").style("opacity", function (c) {
        return by.length === 0 || by.indexOf(c.year) !== -1 ? 1 : 0.5;
      });
    })

    // when the brush action ends, update the selected years in state and animate the sankey + overlap charts to match the new selection. 
    .on("end", function () {
      var selected = d3.event.selection;

      // brush.move() re-fires "end". ignore those secondary events
      if (d3.event.sourceEvent && d3.event.sourceEvent.type === "end") return;

      var brushYears = selected ? getBrushedYears(selected) : [];

      // if the user clicks without dragging, the brush selection is immediately cleared
      if (selected && brushYears.length === 0) {
        brushYears = [];
        d3.select(this).call(brush.move, null);
      }
      state.selectedYears = new Set(brushYears);
      updateTrackLabels(brushYears);

      // snap edges to year band boundaries
      if (brushYears.length > 0) {
        var snappedX0 = xScale(brushYears[0]);
        var snappedX1 = xScale(brushYears[brushYears.length - 1]) + xScale.bandwidth();
        d3.select(this).call(brush.move, [snappedX0, snappedX1]);
      }

      // if no years are selected, but a condition is selected, fade unselected condition rows. if no years are selected and no condition is selected, show all cells at full opacity. 
      // if some years are selected, show cells in those years at full opacity and fade cells in unselected years, with an extra fade for cells that are also not in the selected condition.
      if (brushYears.length === 0) {
        g.selectAll("rect.cell").transition().duration(300)
          .style("opacity", function (c) {
            if (state.selectedCondition.size === 0) return 1;
            return state.selectedCondition.has(c.condition) ? 1 : 0.5;
          });
        g.selectAll("text.cell-label")
          .transition()
          .duration(300)
          .style("opacity", function (c) {
            if (state.selectedCondition.size === 0) return 1;
            return state.selectedCondition.has(c.condition) ? 1 : 0.5;
          });
      } else {
        g.selectAll("rect.cell").transition().duration(300)
          .style("opacity", function (c) {
            var yearSelected = state.selectedYears.has(c.year);
            var condSelected = state.selectedCondition.size === 0 || state.selectedCondition.has(c.condition);
            return (yearSelected && condSelected) ? 1 : 0.2;
          });
      }
      refreshFocus();
    });

  // add brush to the brush area 
  brushZone.call(brush);
  // style brush selection and handles
  brushZone.select(".selection")
    .style("fill", palette.blue).style("fill-opacity", 0.3)
    .style("stroke", palette.blue).style("stroke-opacity", 0.9)
    .attr("rx", 4);
  // change cursor
  brushZone.select(".overlay").style("cursor", "crosshair");
  brushZone.selectAll(".handle").style("fill", palette.blue);
}

// Draw a sankey diagram showing the flow of students from study year to mental health condition to treatment see
function drawSankey(data) {
  var filtered = getFiltered(data);

  // active filters are shown above the sankey
  var parts = [];
  if (state.selectedYears.size > 0)
    parts.push(Array.from(state.selectedYears).join(", "));
  if (state.selectedCondition.size > 0)
    parts.push("Conditions: " + Array.from(state.selectedCondition).join(", "));
  document.getElementById("sankey-filter-badge").textContent = parts.join("  |  ");

  // dynamically size the visualization based on container width
  var container = document.getElementById("sankey-svg").parentElement;
  var totalWidth = container.clientWidth - 40;
  var totalHeight = Math.round(totalWidth * 0.28);
  var margin = { top: 20, right: 130, bottom: 16, left: 130 };
  var W = totalWidth - margin.left - margin.right;
  var H = totalHeight - margin.top - margin.bottom;

  // create the svg and clear previous renderings
  var svg = d3.select("#sankey-svg")
    .attr("width", totalWidth)
    .attr("height", totalHeight);
  svg.selectAll("*").remove();

  // group for sankey content, positioned within the card margins  
  var g = svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // Extract the distinct student year categories from the dataset.
  var years = Array.from(new Set(data.map((d) => {
    return d[COLS.year];
  }))).sort();

  // Define the mental health condition categories used in the flow diagram.
  var allConditions = [
    { label: "Depression", col: COLS.depression },
    { label: "Anxiety", col: COLS.anxiety },
    { label: "Panic Attack", col: COLS.panic }
  ];

  // If the user selects a specific condition,
  // limit the Sankey diagram to only that category.
  var conditions = state.selectedCondition.size > 0
    ? allConditions.filter((c) => state.selectedCondition.has(c.label))
    : allConditions;

  // Initialize the Sankey graph structure containing nodes and directional flow links.
  const graph = {
    // node labels
    nodes: [
      ...years.map(year => ({ name: year })),
      ...conditions.map(condition => ({ name: condition.label })),
      { name: "Sought Treatment" },
      { name: "No Treatment" }
    ],
    links: []
  };

  // links from year to condition
  years.forEach(year => {
    conditions.forEach(condition => {
      const count = filtered.filter(d =>
        d[COLS.year] === year &&
        d[condition.col] === "Yes"
      ).length;

      if (count > 0) {
        graph.links.push({
          source: year,
          target: condition.label,
          value: count
        });
      }
    });
  });

  // links from condition to treatment
  conditions.forEach(condition => {
    const yesCount = filtered.filter(d =>
      d[condition.col] === "Yes" &&
      d[COLS.treatment] === "Yes"
    ).length;

    const noCount = filtered.filter(d =>
      d[condition.col] === "Yes" &&
      d[COLS.treatment] === "No"
    ).length;

    if (yesCount > 0) {
      graph.links.push({
        source: condition.label,
        target: "Sought Treatment",
        value: yesCount
      });
    }

    if (noCount > 0) {
      graph.links.push({
        source: condition.label,
        target: "No Treatment",
        value: noCount
      });
    }
  });

  // fallback message if filteirng removes all available data
  if (graph.links.length === 0) {
    g.append("text").attr("x", W / 2).attr("y", H / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "13px").style("fill", palette.slate)
      .text("No data for current selection");
    return;
  }

  // define the sankey size 
  const sankey = d3.sankey()
    .nodeId(d => d.name)
    .nodeWidth(28)
    .nodePadding(28)
    .extent([[0, 0], [W, H]]);

  sankey(graph);

  // node colors, depending on type 
  function nodeColor(d) {
    if (years.includes(d.name)) return palette.paleBlue;

    if (conditions.some(c => c.label === d.name)) {
      return palette.blue;
    }

    if (d.name === "Sought Treatment") {
      return "#2952cc";
    }

    if (d.name === "No Treatment") {
      return palette.slate;
    }

    return palette.lightBlue;
  }

  // link colors, with specific colors for treatment seeking links and year nodes to make them stand out, and a default color for the rest of the links
  function linkColor(d) {
    const yearColors = {
      "Year 1": "#4C78A8",
      "Year 2": "#72B7B2",
      "Year 3": "#F2CF5B",
      "Year 4": "#B279A2"
    };

    if (yearColors[d.source.name]) {
      return yearColors[d.source.name];
    }

    if (d.target.name === "Sought Treatment") {
      return "#4f7cff";
    }

    if (d.target.name === "No Treatment") {
      return "#aeb8cc";
    }

    return "#7ea1e6";
  }

  // tooltip that appears when hovering over flows, showing the count and percentage of students in that flow compared to the total students in the current filter selection
  // Reference the floating tooltip element used during interaction.
  var tooltip = document.getElementById("flow-tooltip");
  // Store the total number of filtered records
  var totalStudents = filtered.length;

  // draw the flow paths, thicker means more students in that group
  g.append("g")
    .selectAll("path")
    .data(graph.links)
    .enter()
    .append("path")
    .attr("d", d3.sankeyLinkHorizontal())
    .style("fill", "none")
    .style("stroke", d => linkColor(d))
    .style("stroke-opacity", 0.5)
    .style("stroke-width", d => Math.max(1, d.width))

    // hover highlights the flow and shows tooltip
    .on("mouseover", function (d) {

      // Highlight the hovered connection
      d3.select(this)
        .transition()
        .duration(120)
        .style("stroke-opacity", 0.85)
        .style("stroke-width", function (d) {
          return Math.max(4, d.width + 2);
        });

      // Compute percentage of students represented by this flow
      var pct = totalStudents > 0
        ? Math.round(d.value / totalStudents * 100)
        : 0;

      // Display flow details inside the tooltip
      // The tooltip shows the source category, target category, and how many students are included in that connection
      tooltip.innerHTML =
        "<strong>" + d.source.name + " -> " + d.target.name + "</strong><br>" +
        d.value + " students (" + pct + "% of selection)";

      // Make the tooltip visible
      tooltip.style.opacity = "1";
    })
    // Keep the tooltip positioned near the cursor
    .on("mousemove", function () {
      tooltip.style.left = (d3.event.clientX + 14) + "px";
      tooltip.style.top = (d3.event.clientY - 54) + "px";
    })

    // Restore the original styling when the cursor leaves
    .on("mouseout", function (d) {

      // Return the link to its default appearance
      d3.select(this)
        .transition()
        .duration(200)
        .style("stroke-opacity", 0.5)
        .style("stroke-width", function (d) {
          return Math.max(1, d.width);
        });

      // Hide the tooltip
      tooltip.style.opacity = "0";
    });

  // create a group for each node so rectangle and label stay together
  const node = g.append("g")
    .selectAll("g")
    .data(graph.nodes)
    .enter()
    .append("g");

  // vertical rectangles represent each category
  node.append("rect")
    .attr("x", d => d.x0)
    .attr("y", d => d.y0)
    .attr("width", d => d.x1 - d.x0)
    .attr("height", d => d.y1 - d.y0)
    .attr("rx", 6)
    .style("fill", d => nodeColor(d))
    .style("stroke", palette.white)
    .style("stroke-width", 3);

  // labels for each node, positioned to the left of the node for nodes on the right half of the chart, and to the right of the node for nodes on the left half of the chart
  node.append("text")
    .attr("x", d => d.x0 - 10)
    .attr("y", d => (d.y0 + d.y1) / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", "end")
    .style("font-size", "13px")
    .style("font-weight", "600")
    .style("fill", palette.text)
    .text(d => d.name)
    .filter(d => d.x0 < W / 2)
    .attr("x", d => d.x1 + 10)
    .attr("text-anchor", "start");
}

// predefined pairs of conditions to check overlap between, with labels for the overlap chart
var overlapPairs = [
  { label: "Depression + Anxiety", a: COLS.depression, b: COLS.anxiety },
  { label: "Depression + Panic Attack", a: COLS.depression, b: COLS.panic },
  { label: "Anxiety + Panic Attack", a: COLS.anxiety, b: COLS.panic }
];

// calculate the count and percentage of students who have both conditions in each pair to determine dot position a
function computeOverlap(data) {
  return overlapPairs.map((pair) => {
    var filtered = getFilteredByYear(data);
    var count = filtered.filter(d =>
      d[pair.a] === "Yes" &&
      d[pair.b] === "Yes"
    ).length;
    return {
      label: pair.label,
      count: count,
      percent: filtered.length > 0
        ? (count / filtered.length) * 100
        : 0
    };
  });
}

function drawOverlap(data) {
  var container = document.getElementById("overlap-svg").parentElement;
  var totalW = container.clientWidth - 40;
  var totalH = 180;
  var margin = { top: 10, right: 60, bottom: 36, left: 185 };
  var W = totalW - margin.left - margin.right;
  var H = totalH - margin.top - margin.bottom;

  // create the svg and clear previous renderings
  var svg = d3.select("#overlap-svg")
    .attr("width", totalW)
    .attr("height", totalH);
  svg.selectAll("*").remove();

  // group for overlap content, positioned within the card margins
  var g = svg.append("g")
    .attr("class", "overlap-inner")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var overlapData = computeOverlap(data);

  // keep consistent x scale across all filter selections, so the position of the dots is comparable as users toggle filters
  var fullOverlap = computeOverlap(globalData);
  const xScale = d3.scaleLinear()
      .domain([0, d3.max(fullOverlap, d => d.percent)])
      .range([0, W])
    
  // yScale is based on the specific overlap pairs
  const yScale = d3.scaleBand()
    .domain(overlapData.map(d => d.label))
    .range([0, H])
    .padding(0.5);

  // labels on the left side
  g.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(yScale).tickSize(0));

  // percentage axis on the bottom of the chart
  g.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0, ${H})`)
    .call(d3.axisBottom(xScale).ticks(5).tickFormat((d) => {
      return d + "%";
    }));
  
  // style axes
  g.selectAll(".tick text")
    .attr("font-size", "11px")
    .attr("fill", "#333");
  g.selectAll(".domain")
    .style("stroke", palette.paleBlue);
  
  // one horizontal line from to percent value, and one dot at the end of the line to represent the percentage of students with both conditions 
  // in that pair, with a label of the percentage value next to the dot
  g.selectAll("line.stem")
    .data(overlapData)
    .enter()
    .append("line")
    .attr("class", "stem")
    .attr("x1", 0)
    .attr("x2", d => xScale(d.percent))
    .attr("y1", d => yScale(d.label) + yScale.bandwidth() / 2)
    .attr("y2", d => yScale(d.label) + yScale.bandwidth() / 2)
    .attr("stroke", palette.lightBlue)
    .attr("stroke-width", 5)
    .attr("stroke-linecap", "round");
  
  // dots at the end of the lines, with larger dots for higher percentages to make them more visually prominent
  g.selectAll("circle.dot")
    .data(overlapData)
    .enter()
    .append("circle")
    .attr("class", "dot")
    .attr("cx", d => xScale(d.percent))
    .attr("cy", d => yScale(d.label) + yScale.bandwidth() / 2)
    .attr("r", 10)
    .attr("fill", palette.blue);
  
  // rounded percent value next to the dot
  g.selectAll(".label")
    .data(overlapData)
    .enter()
    .append("text")
    .attr("class", "label")
    .attr("x", d => xScale(d.percent) + 14)
    .attr("y", d => yScale(d.label) + yScale.bandwidth() / 2)
    .attr("dominant-baseline", "middle")
    .style("font-size", "12px")
    .style("font-weight", "700")
    .style("fill", palette.text)
    .text(d => `${Math.round(d.percent)}%`);

  // x-axis label
  g.append("text")
    .attr("x", W / 2)
    .attr("y", H + 35)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .style("font-weight", "600")
    .style("fill", palette.text)
    .text("Percent of Students");

  // y-axis label
  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -H / 2)
    .attr("y", -150)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .style("font-weight", "600")
    .style("fill", palette.text)
    .text("Mental Health Overlap");
}

// animate overlap changes
// axis rescales first, then marks slide to new positions
function animateOverlap(data) {
  // if the overlap chart hasn't been drawn yet, do nothing
  var g = d3.select("#overlap-svg")
    .select(".overlap-inner");
  if (g.empty()) return;

  // get the same dimensions as drawOverlap 
  var container = document.getElementById("overlap-svg").parentElement;
  var W = (container.clientWidth - 40) - 185 - 60;

  // recalculate the overlap percentages based on the new filters
  var overlapData = computeOverlap(data);

  //  use full dataset to keep x axis consistent, so filtering only moves marks
  var fullOverlap = computeOverlap(globalData);
  var newX = d3.scaleLinear()
      .domain([0, d3.max(fullOverlap, d => d.percent)])
      .range([0, W]);

  // stems + dots slide after axis finishes
  g.selectAll("line.stem")
    .data(overlapData, (d) => {
      return d.label;
    })
    .transition().duration(400).delay(200).ease(d3.easeCubicInOut)
    .attr("x2", (d) => {
      return newX(d.percent);
    });

  // dots slide to new position, with a tween on the text to count up/down to the new percentage value
  g.selectAll("circle.dot")
    .data(overlapData, (d) => {
      return d.label;
    })
    .transition().duration(400).delay(200).ease(d3.easeCubicInOut)
    .attr("cx", (d) => {
      return newX(d.percent);
    });

  // labels slide and percentage counts up/ down
  g.selectAll("text.label")
    .data(overlapData, (d) => {
      return d.label;
    })
    .transition().duration(400).delay(200).ease(d3.easeCubicInOut)
    .attr("x", (d) => {
      return newX(d.percent) + 14;
    })
    .tween("text", function (d) {
      var element = this;
      var from = parseInt(element.textContent, 10) || 0;
      var to = Math.round(d.percent);
      var interp = d3.interpolateNumber(from, to);
      return (t) => { element.textContent = Math.round(interp(t)) + "%"; };
    });
}