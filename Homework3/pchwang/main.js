// Shared color map: one color per Type_1, used consistently across all three charts
// so the user can always associate a color with a type without checking a legend.
const typeColors = {
    "Fire":     "#FF6B35",
    "Water":    "#4895EF",
    "Grass":    "#52B788",
    "Electric": "#FFD60A",
    "Psychic":  "#F72585",
    "Normal":   "#ADB5BD",
    "Ghost":    "#7B2D8B",
    "Dragon":   "#5C4AE4",
    "Dark":     "#666f75",
    "Fighting": "#A0522D",
    "Rock":     "#9C8B6E",
    "Ice":      "#90E0EF",
    "Bug":      "#90BE6D",
    "Steel":    "#8D99AE",
    "Poison":   "#9B5DE5",
    "Ground":   "#D4A373",
    "Fairy":    "#FFAFCC",
    "Flying":   "#74C0FC"
};

// Global selection state, kept at module scope so the resize handler can
// restore the user's context after redrawing all charts.
let selectedTypes   = null;   // Set of brushed Type_1 names, or null for all
let selectedPokemon = null;   // Clicked Pokemon datum, or null for none

// Load the CSV, coerce numeric columns, then draw all three charts.
d3.csv("data/pokemon_alopez247.csv").then(function(rawData) {

    // D3 parses every CSV field as a string, so coerce stat columns to numbers.
    rawData.forEach(function(d) {
        ["Total","HP","Attack","Defense","Sp_Atk","Sp_Def","Speed","Catch_Rate"]
            .forEach(function(col) { d[col] = +d[col]; });
    });

    // Pre-compute the average of each stat per Type_1 so Chart 3 can look them
    // up instantly on every click without re-scanning the full dataset.
    const statCols = ["HP","Attack","Defense","Sp_Atk","Sp_Def","Speed"];
    const typeAverages = {};
    d3.nest()
        .key(function(d) { return d.Type_1; })
        .rollup(function(vals) {
            const avg = {};
            statCols.forEach(function(col) {
                avg[col] = d3.mean(vals, function(d) { return d[col]; });
            });
            return avg;
        })
        .entries(rawData)
        .forEach(function(entry) {
            typeAverages[entry.key] = entry.value;
        });

    // References to the update functions returned by Charts 2 and 3,
    // so the brush callback in Chart 1 can trigger both.
    let updateChart2, updateChart3;

    // Called whenever the brush in Chart 1 changes.
    // Clears the Pokemon selection because the visible set just changed.
    function onBrushChange(brushedTypes) {
        selectedTypes   = brushedTypes;
        selectedPokemon = null;
        if (updateChart2) updateChart2.update(selectedTypes, selectedPokemon);
        if (updateChart3) updateChart3.update(selectedPokemon);
    }

    // Called when the user clicks a dot in Chart 2.
    // Clicking the same dot again deselects it.
    function onDotClick(d) {
        selectedPokemon = (selectedPokemon === d) ? null : d;
        if (updateChart2) updateChart2.update(selectedTypes, selectedPokemon);
        if (updateChart3) updateChart3.update(selectedPokemon);
    }

    // Initial draw of all three charts.
    drawChart1(rawData, onBrushChange);
    updateChart2 = drawChart2(rawData, onDotClick);
    updateChart3 = drawChart3(typeAverages, statCols);

    // On resize, wipe every SVG and redraw at the new size,
    // then restore the user's current selection state.
    window.addEventListener("resize", function() {
        d3.select("#chart1 svg").selectAll("*").remove();
        d3.select("#chart2 svg").selectAll("*").remove();
        d3.select("#chart3 svg").selectAll("*").remove();

        drawChart1(rawData, onBrushChange);
        updateChart2 = drawChart2(rawData, onDotClick);
        updateChart3 = drawChart3(typeAverages, statCols);

        if (updateChart2) updateChart2.update(selectedTypes, selectedPokemon);
        if (updateChart3) updateChart3.update(selectedPokemon);
    });

}).catch(function(err) {
    console.error("Failed to load CSV:", err);
});

// CHART 1 - Overview bar chart + INTERACTION 1: Brushing
//
// One colored bar per Type_1, sorted by count descending.
// brushX creates a draggable horizontal selection; bars outside it dim to 0.2
// opacity and Charts 2 and 3 filter to only the selected types.
// Double-clicking clears the brush and restores the full dataset.

function drawChart1(data, onBrushChange) {

    // Count Pokemon per Type_1 and sort largest to smallest.
    const typeCounts = d3.nest()
        .key(function(d) { return d.Type_1; })
        .rollup(function(v) { return v.length; })
        .entries(data)
        .sort(function(a, b) { return b.value - a.value; });

    // Size the SVG to fill the container div.
    const svg    = d3.select("#chart1 svg");
    const bounds = document.getElementById("chart1").getBoundingClientRect();
    const margin = { top: 28, right: 20, bottom: 60, left: 52 };
    const width  = bounds.width  - margin.left - margin.right;
    const height = bounds.height - margin.top  - margin.bottom;

    // Root group shifted by margins so axes have room on all sides.
    const g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Band scale maps each type name to an equal horizontal slot.
    const x = d3.scaleBand()
        .domain(typeCounts.map(function(d) { return d.key; }))
        .range([0, width])
        .padding(0.2);

    // Linear scale maps Pokemon count to a vertical pixel position.
    // Domain is extended by 10% so the tallest bar has headroom.
    const y = d3.scaleLinear()
        .domain([0, d3.max(typeCounts, function(d) { return d.value; }) * 1.1])
        .range([height, 0]);

    // Bottom axis with type name labels rotated -40 degrees to prevent overlap.
    g.append("g").attr("class", "axis")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-40)")
        .attr("text-anchor", "end")
        .attr("dx", "-0.4em")
        .attr("dy", "0.6em");

    // Left axis with 5 count ticks.
    g.append("g").attr("class", "axis")
        .call(d3.axisLeft(y).ticks(5));

    // X axis label.
    g.append("text").attr("class", "axis-label")
        .attr("x", width / 2).attr("y", height + 54)
        .attr("text-anchor", "middle").text("Primary Type");

    // Y axis label, rotated to read vertically.
    g.append("text").attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2).attr("y", -40)
        .attr("text-anchor", "middle").text("# Pokemon");

    // Chart title in the top margin.
    g.append("text").attr("class", "chart-title")
        .attr("x", width / 2).attr("y", -10)
        .attr("text-anchor", "middle")
        .text("Pokemon Count by Primary Type  (Overview)");

    // Instruction text in the top-right corner.
    g.append("text").attr("class", "instruction")
        .attr("x", width - 4).attr("y", 14)
        .attr("text-anchor", "end")
        .text("drag to brush types  |  double-click to clear");

    // One rect per type colored by typeColors.
    // Class "bar" is used by the brush handler to target only data bars.
    g.selectAll("rect.bar")
        .data(typeCounts).enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x",      function(d) { return x(d.key); })
        .attr("y",      function(d) { return y(d.value); })
        .attr("width",  x.bandwidth())
        .attr("height", function(d) { return height - y(d.value); })
        .attr("fill",   function(d) { return typeColors[d.key] || "#aaa"; })
        .attr("rx", 3);

    // INTERACTION 1: brushX restricted to the chart area.
    // On brush, bars outside the selection dim to 0.2 opacity (200ms transition)
    // and the selected type names are forwarded to Charts 2 and 3.
    const brush = d3.brushX()
        .extent([[0, 0], [width, height]])
        .on("brush end", function() {
            const sel = d3.event.selection;

            if (!sel) {
                // Brush was cleared: restore all bars to full opacity.
                g.selectAll("rect.bar")
                    .transition().duration(250).attr("opacity", 1);
                onBrushChange(null);
                return;
            }

            const x0 = sel[0], x1 = sel[1];
            const brushedTypes = new Set();

            // A type is inside the brush if its bar center falls within [x0, x1].
            typeCounts.forEach(function(d) {
                const centre = x(d.key) + x.bandwidth() / 2;
                if (centre >= x0 && centre <= x1) brushedTypes.add(d.key);
            });

            // ANIMATED TRANSITION (Filtering): bars outside the brush fade to 0.2.
            g.selectAll("rect.bar")
                .transition().duration(200)
                .attr("opacity", function(d) {
                    return brushedTypes.has(d.key) ? 1 : 0.2;
                });

            onBrushChange(brushedTypes.size > 0 ? brushedTypes : null);
        });

    // Brush overlay appended last so it sits on top and captures mouse events.
    g.append("g").attr("class", "brush").call(brush);
}

// CHART 2 - Focus scatter plot (Attack vs Defense)
// INTERACTION 2: Click a dot to select a Pokemon
//
// Each Pokemon is a circle: x = Attack, y = Defense, r = Total stat, color = Type_1.
// Hovering shows a tooltip. Clicking highlights the dot and updates Chart 3.
// Invisible hit-area circles (r=10) make small dots easier to click.
// Returns { update } so Chart 1's brush can filter dots with a 400ms fade.

function drawChart2(data, onDotClick) {

    // Size the SVG; extra right margin reserves space for the type legend.
    const svg    = d3.select("#chart2 svg");
    const bounds = document.getElementById("chart2").getBoundingClientRect();
    const margin = { top: 36, right: 130, bottom: 52, left: 52 };
    const width  = bounds.width  - margin.left - margin.right;
    const height = bounds.height - margin.top  - margin.bottom;

    // Root group shifted by margins.
    const g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Linear scale for Attack on the x axis.
    const x = d3.scaleLinear()
        .domain([0, d3.max(data, function(d) { return d.Attack; })]).nice()
        .range([0, width]);

    // Linear scale for Defense on the y axis.
    const y = d3.scaleLinear()
        .domain([0, d3.max(data, function(d) { return d.Defense; })]).nice()
        .range([height, 0]);

    // Linear scale mapping Total stat to dot radius [2, 7] px.
    // Stronger Pokemon appear larger, giving an immediate visual cue.
    const rScale = d3.scaleLinear()
        .domain([d3.min(data, function(d) { return d.Total; }),
                 d3.max(data, function(d) { return d.Total; })])
        .range([2, 7]);

    // Bottom axis for Attack.
    g.append("g").attr("class", "axis")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x).ticks(6));

    // Left axis for Defense.
    g.append("g").attr("class", "axis")
        .call(d3.axisLeft(y).ticks(6));

    // X axis label.
    g.append("text").attr("class", "axis-label")
        .attr("x", width / 2).attr("y", height + 42)
        .attr("text-anchor", "middle").text("Attack");

    // Y axis label, rotated to read vertically.
    g.append("text").attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2).attr("y", -40)
        .attr("text-anchor", "middle").text("Defense");

    // Chart title above the plot area.
    g.append("text").attr("class", "chart-title")
        .attr("x", width / 2).attr("y", -20)
        .attr("text-anchor", "middle")
        .text("Attack vs Defense  (dot size = Total stat)");

    // Instruction text reminding the user they can hover and click.
    g.append("text").attr("class", "instruction")
        .attr("x", width / 2).attr("y", -8)
        .attr("text-anchor", "middle")
        .text("hover for stats  ·  click to compare vs type average below");

    // Container group for dots so transitions only affect dots, not axes or labels.
    const dotsGroup = g.append("g").attr("class", "dots-group");

    // Visible circles, one per Pokemon, colored by type.
    dotsGroup.selectAll("circle.pokemon-dot")
        .data(data).enter()
        .append("circle")
        .attr("class", "pokemon-dot")
        .attr("cx",     function(d) { return x(d.Attack); })
        .attr("cy",     function(d) { return y(d.Defense); })
        .attr("r",      function(d) { return rScale(d.Total); })
        .attr("fill",   function(d) { return typeColors[d.Type_1] || "#aaa"; })
        .attr("stroke", "none")
        .attr("opacity", 0.65);

    // Transparent hit-area circles with r=10 so small dots are still easy to click.
    dotsGroup.selectAll("circle.hit-area")
        .data(data).enter()
        .append("circle")
        .attr("class", "hit-area")
        .attr("cx",   function(d) { return x(d.Attack); })
        .attr("cy",   function(d) { return y(d.Defense); })
        .attr("r",    10)
        .attr("fill", "transparent")
        .style("cursor", "pointer")
        // Show tooltip with name, type, and all six stats on hover.
        .on("mouseover", function(d) {
            d3.select("#tooltip")
                .html("<strong>" + d.Name + "</strong><br>" +
                      "Type: " + d.Type_1 + (d.Type_2 ? " / " + d.Type_2 : "") + "<br>" +
                      "HP: " + d.HP + " · Atk: " + d.Attack + " · Def: " + d.Defense + "<br>" +
                      "Sp.Atk: " + d.Sp_Atk + " · Sp.Def: " + d.Sp_Def + " · Spd: " + d.Speed)
                .style("opacity", 1)
                .style("left",  (d3.event.clientX + 14) + "px")
                .style("top",   (d3.event.clientY - 10) + "px");
        })
        // Keep the tooltip anchored to the cursor as it moves.
        .on("mousemove", function() {
            d3.select("#tooltip")
                .style("left",  (d3.event.clientX + 14) + "px")
                .style("top",   (d3.event.clientY - 10) + "px");
        })
        // Hide tooltip on mouse out.
        .on("mouseout", function() {
            d3.select("#tooltip").style("opacity", 0);
        })
        // Fire the selection callback; Chart 3 will update in response.
        .on("click", function(d) { onDotClick(d); });

    // Type legend in the right margin, laid out in two columns of nine.
    const legend = g.append("g")
        .attr("transform", "translate(" + (width + 10) + ",0)");

    // "Type" heading above the swatches.
    legend.append("text")
        .attr("x", 0).attr("y", -6)
        .attr("fill", "#aaa").attr("font-size", "10px")
        .attr("font-family", "sans-serif").text("Type");

    // One colored swatch and label per type.
    Object.keys(typeColors).forEach(function(type, i) {
        const col = i < 9 ? 0 : 1;
        const row = i < 9 ? i : i - 9;

        // Colored square swatch.
        legend.append("rect")
            .attr("x", col * 62).attr("y", row * 15)
            .attr("width", 9).attr("height", 9)
            .attr("fill", typeColors[type]);

        // Type name label next to the swatch.
        legend.append("text")
            .attr("x", col * 62 + 13).attr("y", row * 15 + 8)
            .attr("fill", "#bbb").attr("font-size", "9px")
            .attr("font-family", "sans-serif").text(type);
    });

    // Update function called by brush (Chart 1) and click (Chart 2).
    // ANIMATED TRANSITION (Filtering): dot opacity transitions over 400ms.
    // ANIMATED TRANSITION (Visualization change): selected dot grows and gets a yellow ring.
    function update(selTypes, selPoke) {
        dotsGroup.selectAll("circle.pokemon-dot")
            .transition().duration(400).ease(d3.easeCubicOut)
            .attr("opacity", function(d) {
                const visible = !selTypes || selTypes.has(d.Type_1);
                if (!visible)      return 0.04;  // filtered out by brush
                if (selPoke === d) return 1;      // selected dot fully opaque
                return selPoke   ? 0.2 : 0.65;   // dim others when a dot is selected
            })
            .attr("stroke",       function(d) { return selPoke === d ? "#FFD60A" : "none"; })
            .attr("stroke-width", function(d) { return selPoke === d ? 2.5 : 0; })
            .attr("r", function(d) {
                return selPoke === d ? rScale(d.Total) + 4 : rScale(d.Total);
            });
    }

    return { update: update };
}

// CHART 3 - Detail: Radar / spider chart  [ADVANCED VISUALIZATION]
//
// Two overlapping polygons on a radial axis grid:
//   Solid polygon   - the selected Pokemon's 6 base stats
//   Dashed polygon  - the average stats for its primary Type_1
//
// Radar charts use a non-Cartesian radial coordinate system where each of the
// 6 stats maps to one axis, making multivariate comparison easy at a glance.
//
// ANIMATED TRANSITION (Visualization change): polygons grow from the center
// outward, staged after a fade-out of the previous polygons.

function drawChart3(typeAverages, statCols) {

    // Size the SVG; extra right margin holds the stat comparison table.
    const svg    = d3.select("#chart3 svg");
    const bounds = document.getElementById("chart3").getBoundingClientRect();
    const margin = { top: 44, right: 160, bottom: 20, left: 30 };
    const width  = bounds.width  - margin.left - margin.right;
    const height = bounds.height - margin.top  - margin.bottom;

    // Root group shifted by margins.
    const g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Center point of the radar within the plot area.
    const cx = width  / 2;
    const cy = height / 2;

    // Outermost ring radius with padding for axis labels.
    const maxR = Math.min(width, height) / 2 - 28;

    // Number of axes equals number of stats.
    const numAxes = statCols.length;

    // Radial scale from 0 to 255 (the max any stat can reach).
    const rScale = d3.scaleLinear().domain([0, 255]).range([0, maxR]);

    // Chart title, updated dynamically when a Pokemon is selected.
    const titleEl = g.append("text").attr("class", "chart-title")
        .attr("x", cx).attr("y", -26)
        .attr("text-anchor", "middle")
        .text("Stat Radar  (Detail)");

    // Placeholder instruction shown before any Pokemon is selected.
    const subtitleEl = g.append("text").attr("class", "instruction")
        .attr("x", cx).attr("y", -12)
        .attr("text-anchor", "middle")
        .text("click a dot in the scatter to compare stats vs type average");

    // Draw 5 concentric polygon rings as a background grid.
    // Polygons rather than circles match the angular radar aesthetic.
    const gridLevels = 5;
    for (var lvl = 1; lvl <= gridLevels; lvl++) {
        var r = maxR * lvl / gridLevels;

        // Vertices of this ring's polygon, one per axis.
        var ringPoints = statCols.map(function(col, i) {
            var angle = (Math.PI * 2 * i / numAxes) - Math.PI / 2;
            return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
        });

        // Grid ring as a closed polygon with no fill.
        g.append("polygon")
            .attr("points", ringPoints.map(function(p) { return p[0] + "," + p[1]; }).join(" "))
            .attr("fill", "none")
            .attr("stroke", "#333")
            .attr("stroke-width", 0.8);
    }

    // One spoke line and axis label per stat.
    statCols.forEach(function(col, i) {
        var angle = (Math.PI * 2 * i / numAxes) - Math.PI / 2;
        var outerX = cx + maxR * Math.cos(angle);
        var outerY = cy + maxR * Math.sin(angle);

        // Spoke line from center to the outer ring.
        g.append("line")
            .attr("x1", cx).attr("y1", cy)
            .attr("x2", outerX).attr("y2", outerY)
            .attr("stroke", "#444")
            .attr("stroke-width", 0.8);

        // Label positioned 20px beyond the outer ring tip.
        // Anchor is start/end for side axes and middle for top/bottom.
        var labelX = cx + (maxR + 20) * Math.cos(angle);
        var labelY = cy + (maxR + 20) * Math.sin(angle);

        var anchor = "middle";
        if (Math.cos(angle) >  0.3) anchor = "start";
        if (Math.cos(angle) < -0.3) anchor = "end";

        g.append("text")
            .attr("x", labelX).attr("y", labelY + 4)
            .attr("text-anchor", anchor)
            .attr("fill", "#ccc")
            .attr("font-size", "11px")
            .attr("font-family", "sans-serif")
            .attr("font-weight", "500")
            .text(col);
    });

    // Small legend in the top-right corner explaining the two polygons.
    // Labels are updated dynamically when a Pokemon is selected.
    const legendG = g.append("g")
        .attr("transform", "translate(" + (width - 130) + ",-28)");

    // Solid color swatch for the selected Pokemon polygon.
    legendG.append("rect")
        .attr("width", 12).attr("height", 12)
        .attr("fill", "#FFD60A");

    // Label next to the Pokemon swatch.
    legendG.append("text")
        .attr("x", 16).attr("y", 10)
        .attr("fill", "#bbb").attr("font-size", "10px")
        .attr("font-family", "sans-serif")
        .attr("class", "legend-poke-label")
        .text("Selected Pokemon");

    // Dashed swatch for the type-average polygon.
    legendG.append("rect")
        .attr("x", 0).attr("y", 16)
        .attr("width", 12).attr("height", 12)
        .attr("fill", "rgba(255,255,255,0.08)")
        .attr("stroke", "#ffffff")
        .attr("stroke-dasharray", "4,2")
        .attr("stroke-width", 1.5);

    // Label next to the average swatch.
    legendG.append("text")
        .attr("x", 16).attr("y", 26)
        .attr("fill", "#bbb").attr("font-size", "10px")
        .attr("font-family", "sans-serif")
        .attr("class", "legend-avg-label")
        .text("Type Average");

    // Container group for the radar polygons, cleared and redrawn on each update.
    const radarGroup = g.append("g").attr("class", "radar-group");

    // Converts a stat value object to an array of [x, y] polygon vertices,
    // one per axis, using polar-to-Cartesian conversion.
    function statsToPoints(statValues, radiusMultiplier) {
        radiusMultiplier = radiusMultiplier || 1;
        return statCols.map(function(col, i) {
            var angle = (Math.PI * 2 * i / numAxes) - Math.PI / 2;
            var r = rScale(statValues[col]) * radiusMultiplier;
            return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
        });
    }

    // Converts an array of [x, y] pairs to the SVG points attribute string.
    function pointsAttr(pts) {
        return pts.map(function(p) { return p[0] + "," + p[1]; }).join(" ");
    }

    // Update function called whenever the user clicks a dot in Chart 2.
    function update(selPoke) {

        // Fade out and remove the previous stat table before redrawing.
        g.selectAll(".stat-table")
            .transition().duration(150).attr("opacity", 0).remove();

        if (!selPoke) {
            // No Pokemon selected: fade out polygons and restore placeholder text.
            radarGroup.selectAll("*")
                .transition().duration(300).ease(d3.easeCubicIn)
                .attr("opacity", 0)
                .remove();

            titleEl.text("Stat Radar  (Detail)");
            subtitleEl.text("click a dot in the scatter to compare stats vs type average");

            legendG.select("rect").attr("fill", "#FFD60A").attr("stroke", "none");
            legendG.select(".legend-poke-label").text("Selected Pokemon");
            legendG.select(".legend-avg-label").text("Type Average");
            return;
        }

        const color = typeColors[selPoke.Type_1] || "#aaa";
        const avgs  = typeAverages[selPoke.Type_1] || {};

        // Update title and clear the placeholder subtitle.
        titleEl.text(selPoke.Name + " vs " + selPoke.Type_1 + " Average");
        subtitleEl.text("");

        // Update legend to reflect the selected Pokemon's type color.
        legendG.select("rect").attr("fill", color).attr("stroke", "none");
        legendG.select(".legend-poke-label").text(selPoke.Name);
        legendG.select(".legend-avg-label").text(selPoke.Type_1 + " Average");

        // ANIMATED TRANSITION (Visualization change), staged in two steps:
        // Stage 1: fade out existing polygons over 200ms.
        radarGroup.selectAll("*")
            .transition().duration(200).ease(d3.easeCubicIn)
            .attr("opacity", 0)
            .on("end", function() {
                // Stage 2: remove old polygons then draw the new ones.
                radarGroup.selectAll("*").remove();
                drawRadar(selPoke, avgs, color);
            });

        // If no polygons exist yet, draw immediately without waiting for fade-out.
        if (radarGroup.selectAll("*").size() === 0) {
            drawRadar(selPoke, avgs, color);
        }
    }

    // Draws both radar polygons and the stat table for the given Pokemon.
    function drawRadar(selPoke, avgs, color) {

        // Final polygon vertices for the selected Pokemon and the type average.
        var pokePoints   = statsToPoints(selPoke, 1);
        var avgPoints    = statsToPoints(avgs,    1);
        // All vertices collapsed to center, used as the animation start state.
        var centrePoints = statCols.map(function() { return [cx, cy]; });

        // Type-average polygon drawn first so it appears behind the Pokemon polygon.
        // White dashed stroke and low-opacity fill distinguish it from the solid polygon.
        var avgPoly = radarGroup.append("polygon")
            .attr("points", pointsAttr(centrePoints))
            .attr("fill", "#ffffff")
            .attr("fill-opacity", 0.08)
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "6,4")
            .attr("opacity", 0.75);

        // Grow the average polygon outward from center.
        avgPoly.transition().duration(600).ease(d3.easeCubicOut)
            .attr("points", pointsAttr(avgPoints));

        // Selected Pokemon polygon drawn on top with partial fill transparency
        // so the average polygon remains visible underneath where they overlap.
        var pokePoly = radarGroup.append("polygon")
            .attr("points", pointsAttr(centrePoints))
            .attr("fill", color)
            .attr("fill-opacity", 0.35)
            .attr("stroke", color)
            .attr("stroke-width", 2)
            .attr("opacity", 0);

        // Fade in and grow the Pokemon polygon simultaneously.
        pokePoly.transition().duration(600).ease(d3.easeCubicOut)
            .attr("opacity", 1)
            .attr("points", pointsAttr(pokePoints));

        // Small circle at each vertex of the Pokemon polygon.
        // Each dot starts at center and slides outward with a slight delay.
        statCols.forEach(function(col, i) {
            var angle = (Math.PI * 2 * i / numAxes) - Math.PI / 2;
            var r     = rScale(selPoke[col]);
            var vx    = cx + r * Math.cos(angle);
            var vy    = cy + r * Math.sin(angle);

            radarGroup.append("circle")
                .attr("cx", cx).attr("cy", cy)
                .attr("r", 3)
                .attr("fill", color)
                .attr("stroke", "#fff")
                .attr("stroke-width", 0.8)
                .attr("opacity", 0)
                .transition().delay(300).duration(300).ease(d3.easeCubicOut)
                .attr("cx", vx).attr("cy", vy)
                .attr("opacity", 1);
        });

        // Stat comparison table to the right of the radar.
        // Left column = stat name, middle = Pokemon value, right = type average.
        var tableX = width + 16;
        var tableY = cy - (statCols.length * 18) / 2;

        // "STAT" header label.
        g.append("text")
            .attr("class", "stat-table")
            .attr("x", tableX).attr("y", tableY - 14)
            .attr("fill", "#888").attr("font-size", "9px").attr("font-family", "sans-serif")
            .attr("font-weight", "bold")
            .attr("opacity", 0)
            .text("STAT")
            .transition().delay(400).duration(200).attr("opacity", 1);

        // Pokemon name header in the middle column, colored by type.
        g.append("text")
            .attr("class", "stat-table")
            .attr("x", tableX + 52).attr("y", tableY - 14)
            .attr("fill", color).attr("font-size", "9px").attr("font-family", "sans-serif")
            .attr("font-weight", "bold").attr("text-anchor", "middle")
            .attr("opacity", 0)
            .text(selPoke.Name)
            .transition().delay(400).duration(200).attr("opacity", 1);

        // "Avg" header in the right column.
        g.append("text")
            .attr("class", "stat-table")
            .attr("x", tableX + 100).attr("y", tableY - 14)
            .attr("fill", "#aaa").attr("font-size", "9px").attr("font-family", "sans-serif")
            .attr("font-weight", "bold").attr("text-anchor", "middle")
            .attr("opacity", 0)
            .text("Avg")
            .transition().delay(400).duration(200).attr("opacity", 1);

        // Thin separator line between the header and the first data row.
        g.append("line")
            .attr("class", "stat-table")
            .attr("x1", tableX - 2).attr("y1", tableY - 12)
            .attr("x2", tableX + 118).attr("y2", tableY - 12)
            .attr("stroke", "#444").attr("stroke-width", 0.5)
            .attr("opacity", 0)
            .transition().delay(400).duration(200).attr("opacity", 1);

        // One row per stat, staggered fade-in for a clean animated appearance.
        statCols.forEach(function(col, i) {
            var rowY    = tableY + i * 18;
            var pokeVal = selPoke[col];
            var avgVal  = avgs[col] ? avgs[col].toFixed(1) : "-";

            // Stat name in the left column.
            g.append("text")
                .attr("class", "stat-table")
                .attr("x", tableX).attr("y", rowY)
                .attr("fill", "#888").attr("font-size", "10px").attr("font-family", "sans-serif")
                .attr("opacity", 0)
                .text(col)
                .transition().delay(450 + i * 30).duration(200).attr("opacity", 1);

            // Pokemon stat value in the middle column, colored by type.
            g.append("text")
                .attr("class", "stat-table")
                .attr("x", tableX + 52).attr("y", rowY)
                .attr("fill", color).attr("font-size", "10px").attr("font-family", "sans-serif")
                .attr("text-anchor", "middle").attr("font-weight", "bold")
                .attr("opacity", 0)
                .text(pokeVal)
                .transition().delay(450 + i * 30).duration(200).attr("opacity", 1);

            // Type average in the right column.
            g.append("text")
                .attr("class", "stat-table")
                .attr("x", tableX + 100).attr("y", rowY)
                .attr("fill", "#aaa").attr("font-size", "10px").attr("font-family", "sans-serif")
                .attr("text-anchor", "middle")
                .attr("opacity", 0)
                .text(avgVal)
                .transition().delay(450 + i * 30).duration(200).attr("opacity", 1);
        });
    }

    return { update: update };
}