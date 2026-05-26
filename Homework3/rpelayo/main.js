
// Root svg for the whole dashboard.
const svg = d3.select("#dashboard");

// Six stats used in the radar and parallel-coordinates views.
const statDimensions = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];

// All primary types used to build the overview counts.
const primaryTypeOrder = [
  "Normal", "Grass", "Fire", "Water", "Bug", "Flying", "Ground", "Electric",
  "Ice", "Poison", "Fighting", "Psychic", "Rock", "Ghost", "Dragon", "Dark", "Steel", "Fairy"
];

// The two types compared in the detailed views.
const comparisonTypes = ["Dragon", "Steel"];

// Keep the same colors across all three views.
const comparisonColorScale = d3.scaleOrdinal()
  .domain(comparisonTypes)
  .range(["#6F35FC", "#74d15a"]);

// Keep interaction updates  consistent.
const animationDuration = 650;

// Shared panel styling.
const panel = { fill: "#fffdf7", stroke: "#d7d0bf", rx: 25 };

// Shared interaction state.
const appState = {
  data: [],
  selectedDragon: null,
  selectedSteel: null,
  // single active brush (null when none)
  activeBrush: null,
  // suppress programmatic brush event handling while moving brushes
  suppressBrushEvents: false,
  radarView: null,
  parallelView: null
};


// Turn CSV strings into the values used by the charts.
function parseRow(d) {
  return {
    Number: +d.Number,
    Name: d.Name,
    Type_1: d.Type_1 || "Unknown",
    Total: +d.Total,
    HP: +d.HP,
    Attack: +d.Attack,
    Defense: +d.Defense,
    Sp_Atk: +d.Sp_Atk,
    Sp_Def: +d.Sp_Def,
    Speed: +d.Speed,
    isLegendary: d.isLegendary === "True"
  };
}


// View 1: overview bar chart.
function drawOverview(layout, data) {
  const { x, y, width, height } = layout;

  // Leave room for axes and the legend.
  const margin = { top: 60, right: 20, bottom: 83, left: 75
   };
  const iw = width - margin.left - margin.right;
  const ih = height - margin.top - margin.bottom;

  // Outer group for this panel.
  // outer <g> for the radar panel, positioned to the panel's x/y
  const g = svg.append("g").attr("transform", `translate(${x}, ${y})`);

  // Panel box.
  g.append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("rx", panel.rx)
    .attr("fill", panel.fill)
    .attr("stroke", panel.stroke);

  // View title.
  g.append("text")
    .attr("x", width / 2)
    .attr("y", 28)
    .attr("text-anchor", "middle")
    .attr("font-size", 20)
    .attr("font-weight", 700)
    .attr("fill", "#1f2a30")
    .text("Overview: Pokemon Count by Primary Type");

  // Short note that the charts exclude legendary Pokemon.
  g.append("text")
    .attr("x", width / 2)
    .attr("y", 44)
    .attr("text-anchor", "middle")
    .attr("font-size", 12)
    .attr("fill", "#5e6265")
    .text("*Excluding Legendary Pokemon.");

  // Inner chart area.
  const chart = g.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // Count Pokemon by primary type.
  const countMap = data.reduce(function(acc, d) {
    acc[d.Type_1] = (acc[d.Type_1] || 0) + 1;
    return acc;
  }, {});

  // Build the bar list, then sort by count.
  const typeCounts = primaryTypeOrder.map(function(type) {
    return { type: type, count: countMap[type] || 0 };
  }).sort(function(a, b) {
    return d3.descending(a.count, b.count);
  });

  const maxCount = d3.max(typeCounts, function(d) { return d.count; }) || 1;

  // Bar lengths use the count scale.
  const xScale = d3.scaleLinear()
    .domain([0, maxCount])
    .nice()
    .range([0, iw]);

  // Each type gets one row.
  const yScale = d3.scaleBand()
    .domain(typeCounts.map(function(d) { return d.type; }))
    .range([ih, 0])
    .padding(0.22);

  // Bottom axis for counts.
  chart.append("g")
    .attr("class", "x-axis")
    .attr("transform", "translate(0," + ih + ")")
    .call(d3.axisBottom(xScale).ticks(8).tickFormat(d3.format("d")))
    .selectAll("text")
      .attr("font-size", 9);

  // Left axis for types.
  chart.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(yScale))
    .selectAll("text")
      .attr("font-size", 9);

  // X-axis label.
  chart.append("text")
    .attr("x", iw / 2)
    .attr("y", ih + 40)
    .attr("text-anchor", "middle")
    .attr("font-size", 14)
    .attr("fill", "#3a484f")
    .text("Number of Pokemon");

  // Y-axis label.
  chart.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -(ih / 2))
    .attr("y", -50)
    .attr("text-anchor", "middle")
    .attr("font-size", 14
    )
    .attr("fill", "#3a484f")
    .text("Pokemon Type");

  // Bars show the type counts.
  chart.selectAll(".overview-bar")
    .data(typeCounts)
    .enter()
    .append("rect")
      .attr("class", "overview-bar")
      .attr("x", 0)
      .attr("y", function(d) { return yScale(d.type); })
      .attr("width", function(d) { return xScale(d.count); })
      .attr("height", yScale.bandwidth())
      .attr("fill", function(d) {
        return d.type === "Dragon" || d.type === "Steel" ? comparisonColorScale(d.type) : "#2d2b27";
      })
      .attr("stroke", function(d) {
        return d.type === "Dragon" || d.type === "Steel" ? "#1f2a30" : "#0f0e0d";
      })
      .attr("stroke-width", function(d) {
        return d.type === "Dragon" || d.type === "Steel" ? 1.2 : 0.6;
      })

    // Tooltip for each bar.
    .append("title")
      .text(function(d) { return d.type + ": " + d.count + " Pokemon with this primary type"; });

  // Put exact counts at the end of each bar.
  chart.selectAll(".overview-count")
    .data(typeCounts)
    .enter()
    .append("text")
      .attr("class", "overview-count")
      .attr("x", function(d) { return xScale(d.count) + 6; })
      .attr("y", function(d) { return yScale(d.type) + yScale.bandwidth() / 2 + 3; })
      .attr("font-size", 9)
      .attr("fill", "#27343b")
      .text(function(d) { return d.count; });

  // Legend group.
  const legend = chart.append("g")
    .attr("transform", "translate(0," + (ih + 52) + ")");

  // Dragon swatch.
  legend.append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", 12)
    .attr("height", 12)
    .attr("fill", comparisonColorScale("Dragon"))
    .attr("stroke", "#1f2a30");

  // Dragon label.
  legend.append("text")
    .attr("x", 16)
    .attr("y", 10)
    .attr("font-size", 12)
    .attr("fill", "#27343b")
    .text("Dragon type");

  // Steel swatch.
  legend.append("rect")
    .attr("x", 132)
    .attr("y", 0)
    .attr("width", 12)
    .attr("height", 12)
    .attr("fill", comparisonColorScale("Steel"))
    .attr("stroke", "#1f2a30");

  // Steel label.
  legend.append("text")
    .attr("x", 148)
    .attr("y", 10)
    .attr("font-size", 12)
    .attr("fill", "#27343b")
    .text("Steel type");

  // Other-type swatch.
  legend.append("rect")
    .attr("x", 250)
    .attr("y", 0)
    .attr("width", 12)
    .attr("height", 12)
    .attr("fill", "#020202")
    .attr("stroke", "#b7ae9b");

  // Other-type label.
  legend.append("text")
    .attr("x", 265)
    .attr("y", 10)
    .attr("font-size", 12)
    .attr("fill", "#27343b")
    .text("Other");
}

// View 2: radar chart.
function drawComparisonRadar(layout) {
  const { x, y, width, height } = layout;
  const margin = { top: 56, right: 176, bottom: 24, left: 24 };
  const iw = width - margin.left - margin.right;
  const ih = height - margin.top - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${x}, ${y})`);

  g.append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("rx", panel.rx)
    .attr("fill", panel.fill)
    .attr("stroke", panel.stroke);

  // title text node for the radar panel
  const titleText = g.append("text")
    .attr("x", width / 2)
    .attr("y", 28)
    .attr("text-anchor", "middle")
    .attr("font-size", 20)
    .attr("font-weight", 700)
    .attr("fill", "#1f2a30");

  // subtitle / hint text under the title
  const subtitleText = g.append("text")
    .attr("x", width / 2)
    .attr("y", 44)
    .attr("text-anchor", "middle")
    .attr("font-size", 11)
    .attr("fill", "#5e6265");

  // inner chart group, moved by margins so axes and content fit
  const chart = g.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  const cx = iw / 2;
  const cy = ih / 2;
  const radius = Math.min(iw, ih) * 0.42;
  // radial scale maps stat values to pixel radius for the radar
  const radialScale = d3.scaleLinear()
    .domain([0, 150])
    .range([0, radius]);
  const angleStep = (Math.PI * 2) / statDimensions.length;

  function toPoint(value, axisIndex) {
    const angle = -Math.PI / 2 + axisIndex * angleStep;
    const pointRadius = radialScale(value);
    return [cx + Math.cos(angle) * pointRadius, cy + Math.sin(angle) * pointRadius];
  }

  // line generator used to draw closed polygons (profiles and rings)
  const lineGenerator = d3.line()
    .x(function(point) { return point[0]; })
    .y(function(point) { return point[1]; })
    .curve(d3.curveLinearClosed);

  // separate layers to keep SVG structure organized:
  // - ringLayer: circular grid lines and labels
  // - axisLayer: radial axis lines and axis labels
  // - profileLayer: radar polygons and points
  const ringLayer = chart.append("g");
  const axisLayer = chart.append("g");
  const profileLayer = chart.append("g");

  [25, 50, 75, 100, 125, 150, 175].forEach(function(value) {
    const ringPoints = statDimensions.map(function(_, i) {
      return toPoint(value, i);
    });

    ringLayer.append("path")
      .attr("d", lineGenerator(ringPoints))
      .attr("fill", "none")
      .attr("stroke", "#b3ac9d")
      .attr("stroke-width", 1);

    ringLayer.append("text")
      .attr("x", cx + 10)
      .attr("y", cy - radialScale(value) + 4)
      .attr("font-size", 10)
      .attr("fill", "#050505")
      .text(value);
  });

  statDimensions.forEach(function(stat, i) {
    const outer = toPoint(150, i);

    axisLayer.append("line")
      .attr("x1", cx)
      .attr("y1", cy)
      .attr("x2", outer[0])
      .attr("y2", outer[1])
      .attr("stroke", "#c9c1b0")
      .attr("stroke-width", 0.8);

    axisLayer.append("text")
      .attr("x", outer[0] + (outer[0] - cx) * 0.22)
      .attr("y", outer[1] + (outer[1] - cy) * 0.22)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("font-size", 10)
      .attr("fill", "#2b3940")
      .text(stat.replace("_", " "));
  });

  // legend group to the right of the radar showing active lines/averages
  const legend = g.append("g")
    .attr("transform", `translate(${width - 160}, 100)`);

  const legendTitle = legend.append("text")
    .attr("x", 0)
    .attr("y", -8)
    .attr("font-size", 14)
    .attr("font-weight", 600)
    .attr("fill", "#2b3940");

  const legendRows = legend.append("g");

  // update() recomputes and redraws the radar based on appState
  function update() {
    const comparisonData = appState.data.filter(function(d) {
      return d.Type_1 === "Dragon" || d.Type_1 === "Steel";
    });
    const activeBrush = appState.activeBrush;
    const brushActive = !!activeBrush;
    const selectedProfiles = [];

    if (appState.selectedDragon) {
      selectedProfiles.push({
        key: "Dragon",
        type: "Dragon",
        name: appState.selectedDragon.Name,
        totalValue: appState.selectedDragon.Total,
        values: statDimensions.map(function(stat) {
          return appState.selectedDragon[stat];
        }),
        isAverage: false
      });
    }

    if (appState.selectedSteel) {
      selectedProfiles.push({
        key: "Steel",
        type: "Steel",
        name: appState.selectedSteel.Name,
        totalValue: appState.selectedSteel.Total,
        values: statDimensions.map(function(stat) {
          return appState.selectedSteel[stat];
        }),
        isAverage: false
      });
    }

    let title = "";
    let subtitle = "";
    let legendLabel = "";
    let profiles = [];

    if (selectedProfiles.length === 0) {
      let radarData = comparisonData;

      if (brushActive) {
        // filter the radar data using the single active brush
        const dim = activeBrush.dimension;
        const range = activeBrush.range;
        radarData = comparisonData.filter(function(d) {
          return d[dim] >= range[0] && d[dim] <= range[1];
        });

        title = "Brushed Average Stat Profiles";
        legendLabel = "Brushed averages";

        if (radarData.length === 0) {
          subtitle = "No Pokemon remain inside the current brushed stat range. Clear the brush to restore the averages.";
        } else {
          const dragonCount = radarData.filter(function(d) {
            return d.Type_1 === "Dragon";
          }).length;
          const steelCount = radarData.filter(function(d) {
            return d.Type_1 === "Steel";
          }).length;

          subtitle = "Showing averages for " + radarData.length + " brushed Pokemon (" + dragonCount + " Dragon, " + steelCount + " Steel). Click a visible line to inspect an individual profile.";

          comparisonTypes.forEach(function(type) {
            const subset = radarData.filter(function(d) {
              return d.Type_1 === type;
            });

            if (subset.length === 0) {
              return;
            }

            profiles.push({
              key: type,
              type: type,
              name: type + " average",
              totalValue: d3.mean(subset, function(d) { return d.Total; }) || 0,
              values: statDimensions.map(function(stat) {
                const averageValue = d3.mean(subset, function(d) {
                  return d[stat];
                });
                return isNaN(averageValue) ? 0 : averageValue;
              }),
              isAverage: true
            });
          });
        }
      } else {
        title = "Average Stat Profiles of Dragon vs Steel Pokemon";
        subtitle = "Brush the parallel coordinates to filter the averages, or click one Dragon and/or one Steel line below to inspect individual stat profiles.";
        legendLabel = "Legend";

        comparisonTypes.forEach(function(type) {
          const subset = comparisonData.filter(function(d) {
            return d.Type_1 === type;
          });

          profiles.push({
            key: type,
            type: type,
            name: type + " average",
            totalValue: d3.mean(subset, function(d) { return d.Total; }) || 0,
            values: statDimensions.map(function(stat) {
              const averageValue = d3.mean(subset, function(d) {
                return d[stat];
              });
              return isNaN(averageValue) ? 0 : averageValue;
            }),
            isAverage: true
          });
        });
      }
    } else if (selectedProfiles.length === 1) {
      title = "Selected Individual Stat Profiles";
      subtitle = "Showing " + selectedProfiles[0].name + " only. Select a " + (selectedProfiles[0].type === "Dragon" ? "Steel" : "Dragon") + " line to compare both or reset to averages.";
      legendLabel = "Selected Pokemon";
      profiles = selectedProfiles;
    } else {
      title = "Selected Individual Stat Profiles";
      subtitle = "Showing " + selectedProfiles[0].name + " and " + selectedProfiles[1].name + " as the active head-to-head comparison.";
      legendLabel = "Selected Pokemon";
      profiles = selectedProfiles;
    }

    profiles.forEach(function(profile) {
      profile.points = profile.values.map(function(value, index) {
        return toPoint(value, index);
      });
    });

    titleText.text(title);
    subtitleText.text(subtitle);
    legendTitle.text(legendLabel);

    const centerPath = lineGenerator(statDimensions.map(function() {
      return [cx, cy];
    }));

    const profileGroups = profileLayer.selectAll(".radar-profile")
      .data(profiles, function(profile) { return profile.key; });

    profileGroups.exit()
      .each(function() {
        const group = d3.select(this);

        group.select("path")
          .interrupt()
          .transition()
          .duration(animationDuration)
          .ease(d3.easeCubicInOut)
          .attr("d", centerPath)
          .attr("opacity", 0);

        group.selectAll("circle")
          .interrupt()
          .transition()
          .duration(animationDuration)
          .ease(d3.easeCubicInOut)
          .attr("cx", cx)
          .attr("cy", cy)
          .attr("r", 0);

        group.transition()
          .delay(animationDuration)
          .remove();
      });

    const profileEnter = profileGroups.enter()
      .append("g")
      .attr("class", "radar-profile");

    profileEnter.append("path")
      .attr("class", "radar-polygon")
      .attr("d", centerPath)
      .attr("opacity", 0);

    profileEnter.select("path")
      .append("title");

    const profileMerge = profileEnter.merge(profileGroups)
      .sort(function(a, b) {
        return comparisonTypes.indexOf(a.type) - comparisonTypes.indexOf(b.type);
      });

    const polygonMerge = profileMerge.select("path")
      .attr("fill", function(profile) { return comparisonColorScale(profile.type); })
      .attr("fill-opacity", function(profile) {
        return profile.isAverage ? (profile.type === "Dragon" ? 0.16 : 0.12) : 0.18;
      })
      .attr("stroke", function(profile) { return comparisonColorScale(profile.type); })
      .attr("stroke-width", function(profile) {
        return profile.isAverage ? (profile.type === "Dragon" ? 2.6 : 2.2) : 3;
      })
      .attr("stroke-dasharray", function(profile) {
        return profile.type === "Steel" ? "5,3" : null;
      });

    polygonMerge.select("title")
      .text(function(profile) {
        return profile.isAverage
          ? "Average " + profile.type + " primary-type stat profile"
          : profile.name + " | " + profile.type + " | Total: " + profile.totalValue;
      });

    polygonMerge.interrupt()
      .transition()
      .duration(animationDuration)
      .ease(d3.easeCubicInOut)
      .attr("d", function(profile) { return lineGenerator(profile.points); })
      .attr("opacity", 1);

    profileMerge.each(function(profile) {
      const group = d3.select(this);
      const pointData = profile.points.map(function(point, index) {
        return {
          stat: statDimensions[index],
          value: profile.values[index],
          point: point
        };
      });

      const pointJoin = group.selectAll("circle")
        .data(pointData, function(point) { return point.stat; });

      pointJoin.exit()
        .interrupt()
        .transition()
        .duration(animationDuration)
        .ease(d3.easeCubicInOut)
        .attr("cx", cx)
        .attr("cy", cy)
        .attr("r", 0)
        .remove();

      const pointEnter = pointJoin.enter()
        .append("circle")
        .attr("cx", cx)
        .attr("cy", cy)
        .attr("r", 0)
        .attr("fill", comparisonColorScale(profile.type))
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 1);

      pointEnter.append("title");

      const pointMerge = pointEnter.merge(pointJoin)
        .attr("fill", comparisonColorScale(profile.type))
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 0.7);

      pointMerge.select("title")
        .text(function(point) {
          return point.stat.replace("_", " ") + ": " + point.value;
        });

      pointMerge.interrupt()
        .transition()
        .duration(animationDuration)
        .ease(d3.easeCubicInOut)
        .attr("cx", function(point) { return point.point[0]; })
        .attr("cy", function(point) { return point.point[1]; })
        .attr("r", profile.isAverage ? 5 : 7);
    });

    const legendJoin = legendRows.selectAll(".radar-legend-row")
      .data(profiles, function(profile) { return profile.key; });

    legendJoin.exit()
      .interrupt()
      .transition()
      .duration(animationDuration)
      .attr("opacity", 0)
      .remove();

    const legendEnter = legendJoin.enter()
      .append("g")
      .attr("class", "radar-legend-row")
      .attr("opacity", 0);

    legendEnter.append("line")
      .attr("x1", 0)
      .attr("y1", 10)
      .attr("x2", 14)
      .attr("y2", 10);

    legendEnter.append("text")
      .attr("class", "legend-label")
      .attr("x", 20)
      .attr("y", 13)
      .attr("font-size", 12)
      .attr("fill", "#2b3940");

    legendEnter.append("text")
      .attr("class", "legend-detail")
      .attr("x", 0)
      .attr("y", 35)
      .attr("font-size", 12)
      .attr("fill", "#5b6a72");

    const legendMerge = legendEnter.merge(legendJoin);

    legendMerge.interrupt()
      .transition()
      .duration(animationDuration)
      .ease(d3.easeCubicInOut)
      .attr("opacity", 1)
      .attr("transform", function(profile, index) {
        return `translate(0, ${index * 58})`;
      });

    legendMerge.select("line")
      .attr("stroke", function(profile) { return comparisonColorScale(profile.type); })
      .attr("stroke-width", function(profile) {
        return profile.isAverage ? (profile.type === "Dragon" ? 2.6 : 2.2) : 3;
      })
      .attr("stroke-dasharray", function(profile) {
        return profile.type === "Steel" ? "5,3" : null;
      });

    legendMerge.select(".legend-label")
      .text(function(profile) {
        return profile.isAverage ? profile.type + " average" : profile.type + ": " + profile.name;
      });

    legendMerge.select(".legend-detail")
      .text(function(profile) {
        return (profile.isAverage ? "Avg Total = " : "Total = ") + d3.format(".1f")(profile.totalValue);
      });
  }

  return {
    update: update
  };
}


// View 3: parallel coordinates.
function drawComparisonParallelCoordinates(layout, data) {
  const { x, y, width, height } = layout;
  const margin = { top: 90, right: 160, bottom: 24, left: 36 };
  const iw = width - margin.left - margin.right;
  const ih = height - margin.top - margin.bottom;

  const g = svg.append("g").attr("transform", `translate(${x}, ${y})`);

  g.append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("rx", panel.rx)
    .attr("fill", panel.fill)
    .attr("stroke", panel.stroke);

  g.append("text")
    .attr("x", width / 2)
    .attr("y", 28)
    .attr("text-anchor", "middle")
    .attr("font-size", 20)
    .attr("font-weight", 600)
    .attr("fill", "#1f2a30")
    .text("Individual Dragon vs Steel Stat Profiles");

  // short subtitle explaining how to interact with the chart
  g.append("text")
    .attr("x", width / 2)
    .attr("y", 44)
    .attr("text-anchor", "middle")
    .attr("font-size", 11)
    .attr("fill", "#5e6265")
    .text("Click a line to select a Pokemon; brush a stat to filter the lines.");

  const comparisonData = data.filter(function(d) {
    return d.Type_1 === "Dragon" || d.Type_1 === "Steel";
  });

  const parallelStatDimensions = ["Speed", "Attack", "Sp_Atk", "HP", "Defense", "Sp_Def"];
  const axisDimensions = ["Type"].concat(parallelStatDimensions);

  // inner chart group for the parallel coordinates, translated by margins
  const chart = g.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // horizontal scale: positions for each axis (Type + numeric stats)
  const xScale = d3.scalePoint()
    .domain(axisDimensions)
    .range([0, iw])
    .padding(0.35);

  // yScales holds scales for each axis; Type uses a point scale
  const yScales = {
    Type: d3.scalePoint()
      .domain(comparisonTypes)
      .range([0, ih])
      .padding(0.5)
  };

  const sharedStatMax = d3.max(comparisonData, function(d) {
    return d3.max(parallelStatDimensions, function(stat) {
      return d[stat];
    });
  }) || 1;

  // shared linear scale for all numeric stat axes (so they align)
  const sharedStatScale = d3.scaleLinear()
    .domain([0, sharedStatMax])
    .nice()
    .range([ih, 0]);

  parallelStatDimensions.forEach(function(stat) {
    yScales[stat] = sharedStatScale;
  });

  const brushBehaviors = {};
  const brushGroups = {};

  function buildLine(d) {
    const points = axisDimensions.map(function(dimension) {
      if (dimension === "Type") {
        return [xScale(dimension), yScales.Type(d.Type_1)];
      }

      return [xScale(dimension), yScales[dimension](d[dimension])];
    });

    return d3.line()
      .x(function(point) { return point[0]; })
      .y(function(point) { return point[1]; })(points);
  }

  const lineLayer = chart.append("g");

  const profileLines = lineLayer.selectAll(".pokemon-profile")
    .data(comparisonData)
    .enter()
    .append("path")
    .attr("class", "pokemon-profile")
    .attr("d", function(d) { return buildLine(d); })
    .attr("fill", "none")
    .attr("stroke", function(d) { return comparisonColorScale(d.Type_1); })
    .attr("stroke-width", 1.8)
    .attr("stroke-opacity", 0.52)
    .style("cursor", "pointer")
    .on("click", function(event, d) {
      if (d.Type_1 === "Dragon") {
        appState.selectedDragon = appState.selectedDragon === d ? null : d;
      } else {
        appState.selectedSteel = appState.selectedSteel === d ? null : d;
      }

      updateInteractiveViews();
    });

  profileLines.append("title")
    .text(function(d) {
      return d.Name + " | " + d.Type_1 + " | Total: " + d.Total + " | Click to compare in the radar chart";
    });

  axisDimensions.forEach(function(dimension) {
    const axisGroup = chart.append("g")
      .attr("transform", `translate(${xScale(dimension)}, 0)`);

    if (dimension === "Type") {
      axisGroup.call(d3.axisLeft(yScales.Type).tickSize(6).tickFormat(function() { return ""; }));
    } else {
      axisGroup.call(d3.axisLeft(yScales[dimension]).ticks(5));
    }

    axisGroup.selectAll("text")
      .attr("font-size", 10)
      .attr("fill", "#55636a");

    axisGroup.selectAll("path, line")
      .attr("stroke", "#5f5c55");

    axisGroup.append("text")
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .attr("font-size", 11)
      .attr("font-weight", 700)
      .attr("fill", "#27343b")
      .text(dimension === "Type" ? "Type" : dimension.replace("_", " "));

    if (dimension !== "Type") {
      // simplified brush: only one active brush at any time
      const brushBehavior = d3.brushY()
        .extent([[-10, 0], [10, ih]])
        .on("start brush end", function(event) {
          if (appState.suppressBrushEvents) return;

          const selection = event.selection;

          if (selection) {
            // compute numeric range for this brush and store as active
            const range = selection.map(function(value) { return sharedStatScale.invert(value); }).sort(function(a, b) { return a - b; });
            appState.activeBrush = { dimension: dimension, range: range };
          } else {
            appState.activeBrush = null;
          }

          // update line opacity/weight directly based on the single brush
          chart.selectAll(".pokemon-profile")
            .attr("stroke-opacity", function(d) {
              if (!appState.activeBrush) return 0.52;
              const r = appState.activeBrush.range;
              return d[appState.activeBrush.dimension] >= r[0] && d[appState.activeBrush.dimension] <= r[1] ? 0.52 : 0.1;
            })
            .attr("stroke-width", function(d) {
              if (!appState.activeBrush) return (appState.selectedDragon === d || appState.selectedSteel === d) ? 4 : 1.8;
              const r = appState.activeBrush.range;
              return d[appState.activeBrush.dimension] >= r[0] && d[appState.activeBrush.dimension] <= r[1] ? ((appState.selectedDragon === d || appState.selectedSteel === d) ? 4 : 1.8) : 1.1;
            });

          updateInteractiveViews();
        });

      brushBehaviors[dimension] = brushBehavior;

      // append a <g> to host the brush for this axis
      const brushGroup = axisGroup.append("g")
        .call(brushBehavior);

      brushGroup.selectAll(".overlay")
        .style("cursor", "crosshair");

      brushGroup.selectAll(".selection")
        .attr("fill", "#e9dcb5")
        .attr("stroke", "#8d6c2f")
        .attr("fill-opacity", 0.55);

      brushGroup.selectAll(".handle")
        .attr("fill", "#8d6c2f");

      brushGroups[dimension] = brushGroup;
    }
  });

  const clearBrushControl = g.append("g")
    .attr("transform", `translate(${width - 138}, 144)`)
    .style("cursor", "pointer")
    .on("click", function() {
      if (!appState.activeBrush) return;

      // programmatically clear any brushes, suppress events while doing so
      appState.suppressBrushEvents = true;
      parallelStatDimensions.forEach(function(dimension) {
        if (brushGroups[dimension]) {
          brushGroups[dimension].call(brushBehaviors[dimension].move, null);
        }
      });
      appState.suppressBrushEvents = false;

      appState.activeBrush = null;
      // reset line styling
      chart.selectAll(".pokemon-profile")
        .attr("stroke-opacity", 0.52)
        .attr("stroke-width", function(d) { return (appState.selectedDragon === d || appState.selectedSteel === d) ? 4 : 1.8; });

      updateInteractiveViews();
    });

  clearBrushControl.append("rect")
    .attr("width", 112)
    .attr("height", 24)
    .attr("rx", 12)
    .attr("fill", "#f1eee5")
    .attr("stroke", "#c8c0ae");

  clearBrushControl.append("text")
    .attr("x", 56)
    .attr("y", 16)
    .attr("text-anchor", "middle")
    .attr("font-size", 11)
    .attr("font-weight", 600)
    .attr("fill", "#5b6a72")
    .text("Clear brushes");

  const legend = g.append("g")
    .attr("transform", `translate(${width - 138}, 80)`);

  legend.append("text")
    .attr("x", 0)
    .attr("y", -10)
    .attr("font-size", 14)
    .attr("font-weight", 600)
    .attr("fill", "#27343b")
    .text("Type legend");

  comparisonTypes.forEach(function(type, i) {
    const rowY = i * 24;

    legend.append("line")
      .attr("x1", 0)
      .attr("y1", rowY + 5)
      .attr("x2", 14)
      .attr("y2", rowY + 5)
      .attr("stroke", comparisonColorScale(type))
      .attr("stroke-width", 3);

    legend.append("text")
      .attr("x", 18)
      .attr("y", rowY + 10)
      .attr("font-size", 14)
      .attr("fill", "#27343b")
      .text(type);
  });

  function update() {
    const brushActive = !!appState.activeBrush;
    const activeSelection = !!appState.selectedDragon || !!appState.selectedSteel;

      function passesBrush(d) {
        if (!appState.activeBrush) return true;
        const range = appState.activeBrush.range;
        const dim = appState.activeBrush.dimension;
        return d[dim] >= range[0] && d[dim] <= range[1];
      }

    const brushedProfiles = brushActive ? comparisonData.filter(passesBrush) : comparisonData;
    const selectedProfiles = [];

    if (appState.selectedDragon) {
      selectedProfiles.push(appState.selectedDragon);
    }

    if (appState.selectedSteel) {
      selectedProfiles.push(appState.selectedSteel);
    }

    

    clearBrushControl
      .attr("pointer-events", brushActive ? "all" : "none")
      .interrupt()
      .transition()
      .duration(animationDuration)
      .attr("opacity", brushActive ? 1 : 0.35);

    clearBrushControl.select("rect")
      .interrupt()
      .transition()
      .duration(animationDuration)
      .attr("fill", brushActive ? "#f7ecd1" : "#f1eee5")
      .attr("stroke", brushActive ? "#8d6c2f" : "#c8c0ae");

    clearBrushControl.select("text")
      .interrupt()
      .transition()
      .duration(animationDuration)
      .attr("fill", brushActive ? "#5c461a" : "#5b6a72");

    profileLines.each(function(d) {
      if ((appState.selectedDragon === d || appState.selectedSteel === d) && passesBrush(d)) {
        d3.select(this).raise();
      }
    });

    profileLines
      .style("pointer-events", function(d) {
        return passesBrush(d) ? "auto" : "none";
      })
      .interrupt()
      .transition()
      .duration(animationDuration)
      .ease(d3.easeCubicInOut)
      .attr("stroke-opacity", function(d) {
        if (!passesBrush(d)) {
          return brushActive ? 0.04 : 0.52;
        }

        if (appState.selectedDragon === d || appState.selectedSteel === d) {
          return 0.95;
        }
        if (activeSelection) {
          return 0.18;
        }
        return brushActive ? 0.72 : 0.52;
      })
      .attr("stroke-width", function(d) {
        if (!passesBrush(d)) {
          return 1.1;
        }

        return appState.selectedDragon === d || appState.selectedSteel === d ? 4 : 1.8;
      });
  }

  return {
    update: update
  };
}


// Update the interactive views after a selection or brush change.
function updateInteractiveViews() {
  if (appState.radarView) {
    appState.radarView.update();
  }

  if (appState.parallelView) {
    appState.parallelView.update();
  }
}


//  redraw all three panels.
function render(data) {
  const W = document.documentElement.clientWidth;
  const H = document.documentElement.clientHeight;

  appState.data = data;
  svg.attr("width", W).attr("height", H);
  svg.selectAll("*").remove();

  const pad = 14;
  const gap = 5;
  const topH = Math.round(H * 0.50);
  const botH = H - pad * 2 - topH - gap;
  const totW = W - pad * 2;
  const overviewW = Math.round(totW * 0.45);
  const focusW = totW - overviewW - gap;

  const overviewLayout = { x: pad, y: pad, width: overviewW, height: topH };
  const focusLayout = { x: pad + overviewW + gap, y: pad, width: focusW, height: topH };
  const advancedLayout = { x: pad, y: pad + topH + gap, width: totW, height: botH };

  drawOverview(overviewLayout, data);
  appState.radarView = drawComparisonRadar(focusLayout);
  appState.parallelView = drawComparisonParallelCoordinates(advancedLayout, data);
  updateInteractiveViews();
}


// Load the CSV, clean the rows, and render the dashboard.
d3.csv("pokemon_alopez247.csv", parseRow)
  .then(function(data) {
    const clean = data.filter(function(d) {
      return d.Type_1
        && !d.isLegendary
        && !isNaN(d.Total)
        && statDimensions.every(function(stat) { return !isNaN(d[stat]); });
    });

    render(clean);
    window.addEventListener("resize", function() { render(clean); });
  });