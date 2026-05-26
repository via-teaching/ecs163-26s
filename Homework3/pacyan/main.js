// main global variables
const svg = d3.select("#main-svg");
const svgEl = document.getElementById("main-svg");

// read actual rendered pixel size of the SVG element
let W = svgEl.clientWidth || window.innerWidth;
let H = svgEl.clientHeight || window.innerHeight;

// font sizes that scale with window width 
let titleFont = Math.max(12, W * 0.011);
let subtitleFont = Math.max(10, W * 0.008);

// main tooltip for all visuals 
const tooltip = d3.select("body").append("div")
    .style("position", "absolute")
    .style("background", "rgba(255,255,255,0.95)")
    .style("border", "1px solid #ccc")
    .style("border-radius", "6px")
    .style("padding", "8px 12px")
    .style("font-family", "Georgia, serif")
    .style("font-size", "12px")
    .style("pointer-events", "none")
    .style("display", "none");

function hideTooltip() { tooltip.style("display", "none"); }

// handles browser resize
// recalculaes all layout variables and reconfigures the three visualizations
let resizeTimer;
window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
        if (!window._lastData) return;
        W = svgEl.clientWidth || window.innerWidth;
        H = svgEl.clientHeight || window.innerHeight;
        titleFont = Math.max(12, W * 0.011);
        subtitleFont = Math.max(10, W * 0.008);
        recalcLayout();
        svg.selectAll("*").remove();
        activeTypeFilter = new Set(pokemonTypes);
        drawScatter(window._lastData);
        drawBarChart(window._lastData);
        drawChord(window._lastData);
    }, 250);
});

// recalculate the dimensions of all visalizations for width and height 
function recalcLayout() {
    scatterWidth = W * 0.38 - scatterMargin.left - scatterMargin.right;
    scatterHeight = H * 0.48 - scatterMargin.top - scatterMargin.bottom;
    barLeft = W * 0.54;
    barTop = 0;   // was 18
    barWidth = W * 0.44 - barMargin.left - barMargin.right;
    barHeight = H * 0.48 - barMargin.top - barMargin.bottom;
    chordTop = H * 0.54;
    chordHeight = H * 0.46 - chordMargin.top - chordMargin.bottom;
    chordRadius = Math.min(W * 0.14, chordHeight) / 2 - 5;
}

// shared data type used by scatter plot and chord diagram 
const pokemonTypes = [
    "Bug", "Dark", "Dragon", "Electric", "Fairy", "Fighting",
    "Fire", "Flying", "Ghost", "Grass", "Ground", "Ice",
    "Normal", "Poison", "Psychic", "Rock", "Steel", "Water"
];

// each pokemon has own representative color 
const typeColor = d3.scaleOrdinal()
    .domain(pokemonTypes)
    .range([
        "#92bc2c", "#595761", "#0c69c8", "#f2d94e", "#ef90e6", "#d62898",
        "#fd7d24", "#a1bbec", "#5f6dbc", "#5fbd58", "#da7b4f", "#75d0c1",
        "#a0a29f", "#b763cf", "#fa8581", "#c9bb8a", "#5695a3", "#539ae2"
    ]);

// maps a type pokemon name to the index for chord diagram 
const typeIndex = {};
pokemonTypes.forEach((t, i) => typeIndex[t] = i);


// bar chart visualization 
// focus view: shows average stats of brushed/filtered selection made on the scatter plot
// stats show attack, hp, defense, speed, and both special attack and special defense 
// on scroll zooms into the bar chart, drag to move along x-axis 
const statCols = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];
const statLabels = {
    HP: "HP", Attack: "Attack", Defense: "Defense",
    Sp_Atk: "Sp. Atk", Sp_Def: "Sp. Def", Speed: "Speed"
};

// one color for each stat bar 
const statColor = d3.scaleOrdinal()
    .domain(statCols)
    .range(["#e06c6c", "#e09a4a", "#e0d44a", "#6cb2e0", "#6ce09a", "#b06ce0"]);

// layout variables
// recalculated by recalcLayout() when resized 
let barLeft = W * 0.54, barTop = 0;
let barMargin = { top: 115, right: 120, bottom: 50, left: 55 };
let barWidth = W * 0.44 - barMargin.left - barMargin.right;
let barHeight = H * 0.48 - barMargin.top - barMargin.bottom;

// calculate the per-stat averages of the top 3 pokemons for the current selection 
function computeAverages(data) {
    return statCols.map(stat => ({
        stat,
        avg: d3.mean(data, d => +d[stat]),
        top3: [...data].sort((a, b) => +b[stat] - +a[stat])
            .slice(0, 3).map(d => d.Name)
    }));
}

// module-level references for updateBarChart 
let barG, yBarScale, xBarScale, barZoomState;

// update the bar chart with new data and label
function updateBarChart(selectedData, label) {
    const avgs = computeAverages(selectedData);

    // animate bars to a new height 
    barG.selectAll(".bar")
        .data(avgs, d => d.stat)
        .transition().duration(500).ease(d3.easeCubicInOut)
        .attr("y", d => yBarScale(d.avg))
        .attr("height", d => barHeight - yBarScale(d.avg));

    // animate value labels to new positions
    barG.selectAll(".bar-label")
        .data(avgs, d => d.stat)
        .transition().duration(500).ease(d3.easeCubicInOut)
        .attr("y", d => yBarScale(d.avg) - 5)
        .text(d => d.avg.toFixed(1));

    // update subtitle to show current selection size 
    barG.select(".bar-subtitle").text(label);
}

function drawBarChart(data) {

    // prevent bars and labels from overflowing when in zoom/pan mode
    svg.append("defs").append("clipPath")
        .attr("id", "bar-clip")
        .append("rect")
        .attr("x", -5)
        .attr("y", -10)
        .attr("width", barWidth + 5)
        .attr("height", barHeight + 10);

    barG = svg.append("g")
        .attr("transform", `translate(${barLeft + barMargin.left}, ${barTop + barMargin.top})`);

    // title and subtitle for bar chart 
    barG.append("text")
        .attr("x", barWidth / 2).attr("y", -44)
        .attr("text-anchor", "middle")
        .attr("font-size", titleFont + "px").attr("font-weight", "bold")
        .attr("font-family", "Georgia,serif").attr("fill", "#222")
        .text("Average Stats of Selected Pokémon");

    barG.append("text")
        .attr("class", "bar-subtitle")
        .attr("x", barWidth / 2).attr("y", -26)
        .attr("text-anchor", "middle")
        .attr("font-size", subtitleFont + "px")
        .attr("font-family", "Georgia,serif").attr("fill", "#888")
        .text(`All types selected (Scroll to zoom)`);

    barG.append("text")
        .attr("x", barWidth / 2).attr("y", barHeight + 50)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px").attr("font-family", "Georgia,serif").attr("fill", "#555")
        .text("Stat");

    // axis labels 
    barG.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -(barHeight / 2)).attr("y", -48)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px").attr("font-family", "Georgia,serif").attr("fill", "#555")
        .text("Average Value (0-260)");

    // scales 
    xBarScale = d3.scaleBand()
        .domain(statCols)
        .range([0, barWidth])
        .padding(0.25);

    yBarScale = d3.scaleLinear()
        .domain([0, 260])
        .range([barHeight, 0]);

    // x-axis (angled labels)
    barG.append("g")
        .attr("class", "bar-x-axis axis")
        .attr("clip-path", "url(#bar-clip)")
        .attr("transform", `translate(0, ${barHeight})`)
        .call(d3.axisBottom(xBarScale).tickFormat(d => statLabels[d]))
        .selectAll("text")
        .attr("transform", "rotate(-30)")
        .attr("text-anchor", "end")
        .attr("dx", "-0.4em")
        .attr("dy", "0.8em");

    // y-axis 
    barG.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(yBarScale).ticks(6));

    // horizontal gridelines for bar chart 
    barG.append("g")
        .attr("class", "bar-grid")
        .call(d3.axisLeft(yBarScale).ticks(6).tickSize(-barWidth).tickFormat(""))
        .call(g => g.selectAll("line").attr("stroke", "#e8e8e4").attr("stroke-dasharray", "2,2"))
        .call(g => g.select(".domain").remove());

    // stat color legend in bar chart
    const barLegG = barG.append("g")
        .attr("transform", `translate(${barWidth + 10}, 0)`);

    barLegG.append("rect")
        .attr("x", -6).attr("y", -6)
        .attr("width", 95)
        .attr("height", statCols.length * 20 + 14)
        .attr("fill", "rgba(245,244,240,0.9)")
        .attr("rx", 5)
        .attr("stroke", "#ddd")
        .attr("stroke-width", 0.8);

    statCols.forEach(function (stat, i) {
        const row = barLegG.append("g")
            .attr("transform", `translate(8, ${i * 20 + 6})`);

        row.append("rect")
            .attr("x", 0).attr("y", 2)
            .attr("width", 12).attr("height", 12)
            .attr("rx", 2)
            .attr("fill", statColor(stat))
            .attr("opacity", 0.85);

        row.append("text")
            .attr("x", 18).attr("y", 13)
            .attr("font-size", "11px")
            .attr("font-family", "Georgia,serif")
            .attr("fill", "#333")
            .text(statLabels[stat]);
    });

    const avgs = computeAverages(data);

    // bars
    // ensure tha they don't overflow in zoom 
    const barsGroup = barG.append("g")
        .attr("class", "bars-group")
        .attr("clip-path", "url(#bar-clip)");

    barsGroup.selectAll(".bar")
        .data(avgs, d => d.stat)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => xBarScale(d.stat))
        .attr("width", xBarScale.bandwidth())
        .attr("y", barHeight)
        .attr("height", 0)
        .attr("fill", d => statColor(d.stat))
        .attr("rx", 3)
        .attr("opacity", 0.82)
        .style("cursor", "pointer")
        .on("mouseover", function (event, d) {
            d3.select(this).attr("opacity", 1).attr("stroke", "#333").attr("stroke-width", 1.5);
            tooltip.style("display", "block")
                .style("left", (event.pageX + 14) + "px")
                .style("top", (event.pageY - 38) + "px")
                .html(`<strong>${statLabels[d.stat]}</strong><br>
                       Avg: <strong>${d.avg.toFixed(1)}</strong><br>
                       <hr style="margin:4px 0">
                       Top in selection:<br>
                       ${d.top3.map((n, i) => `${i + 1}. ${n}`).join("<br>")}`);
        })
        .on("mousemove", function (event) {
            tooltip.style("left", (event.pageX + 14) + "px")
                .style("top", (event.pageY - 38) + "px");
        })
        .on("mouseout", function () {
            d3.select(this).attr("opacity", 0.82).attr("stroke", "none");
            hideTooltip();
        })

        // animate bars growing up from baseline on load 
        .transition().duration(700).ease(d3.easeCubicOut)
        .attr("y", d => yBarScale(d.avg))
        .attr("height", d => barHeight - yBarScale(d.avg));

    // value labels on top of each other 
    barsGroup.selectAll(".bar-label")
        .data(avgs, d => d.stat)
        .enter().append("text")
        .attr("class", "bar-label")
        .attr("x", d => xBarScale(d.stat) + xBarScale.bandwidth() / 2)
        .attr("y", barHeight)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("font-family", "Georgia,serif")
        .attr("fill", "#444")
        .text(d => d.avg.toFixed(1))
        .transition().duration(700).ease(d3.easeCubicOut)
        .attr("y", d => yBarScale(d.avg) - 5);

    // zoom behavior 
    // scroll to zoom in and out on x-axis 
    // drag to pan when zoomed in onto the bar charts 
    const zoomExtent = [[0, 0], [barWidth, barHeight]];

    const zoomBehavior = d3.zoom()
        .scaleExtent([1, 6])
        .translateExtent(zoomExtent)
        .extent(zoomExtent)
        .filter(function () {
            // Allow wheel zoom and drag, block right-click
            return !d3.event.button;
        })
        .on("zoom", function () {
            const t = d3.event.transform;
            const bandwidth = xBarScale.bandwidth();

            // reposition bars using raw transform 
            barG.selectAll(".bar")
                .attr("x", d => t.applyX(xBarScale(d.stat)))
                .attr("width", bandwidth * t.k);

            barG.selectAll(".bar-label")
                .attr("x", d => t.applyX(xBarScale(d.stat)) + (bandwidth * t.k) / 2);

            // rebuild x axis for zoomed range 
            const zoomedX = xBarScale.copy()
                .range(xBarScale.range().map(d => t.applyX(d)));
            barG.select(".bar-x-axis")
                .call(d3.axisBottom(zoomedX).tickFormat(d => statLabels[d]));

            // show reset button only when actually zoomed in 
            barG.select(".zoom-reset-btn")
                .style("display", t.k > 1.01 ? "block" : "none");
        });

    // reset zoom button
    // appears when zoomed, hides at rest
    const resetG = barG.append("g")
        .attr("class", "zoom-reset-btn")
        .attr("transform", `translate(${barWidth - 62}, -10)`)
        .style("display", "none")
        .style("pointer-events", "all")
        .style("cursor", "pointer");

    resetG.append("rect")
        .attr("width", 60).attr("height", 20)
        .attr("rx", 4)
        .attr("fill", "#f0f0ec")
        .attr("stroke", "#bbb")
        .attr("stroke-width", 0.8);

    resetG.append("text")
        .attr("x", 30).attr("y", 14)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("font-family", "Georgia,serif")
        .attr("fill", "#555")
        .text("Reset zoom");

    // transparent overlay captures scroll/drag for zoom 
    // sits on top of bars in svg, appended last 
    const overlayRect = barG.append("rect")
        .attr("class", "zoom-overlay")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", barWidth)
        .attr("height", barHeight)
        .attr("fill", "transparent")
        .style("cursor", "grab")
        .call(zoomBehavior)
        .on("dblclick.zoom", null); // disable d3 built-in dblclick zoom 

    // Reset button to animate back to original view
    resetG.on("click", function () {
        overlayRect
            .transition().duration(400).ease(d3.easeCubicOut)
            .call(zoomBehavior.transform, d3.zoomIdentity);
    });

    overlayRect.node().__zoomBehavior = zoomBehavior;
}



// chord diagram 
// focus view 
// shows type co-occurence for the current selection 
// arc size is = to how many pokemon of that type are in selection 
// ribbon width = how many dual-type pokemon share those two types 

// hover an arc to see which pokemon belong to that type
// hover over a ribbon to see which dual-type pokemon connect those two types 
let chordTop = H * 0.54;
let chordMargin = { top: 55, right: 20, bottom: 20, left: 20 };
let chordHeight = H * 0.46 - chordMargin.top - chordMargin.bottom;
let chordRadius = Math.min(W * 0.14, chordHeight) / 2 - 5;

// creates a 18x18 matrix of type co-occurrences from the selected data 
// matrix[i][j] = number of pokemon of type i and j
// mono-type pokemon increment diagonal for arc visibility 
function buildTypeMatrix(data) {
    const n = pokemonTypes.length;
    const mat = Array.from({ length: n }, () => new Array(n).fill(0));
    data.forEach(function (d) {
        const i = typeIndex[d.Type_1];
        const j = typeIndex[d.Type_2];
        if (i === undefined) return;
        if (j !== undefined) { mat[i][j]++; mat[j][i]++; } // dual type = both directions 
        else { mat[i][i]++; } // mono-type = self-loop 
    });
    return mat;
}

function drawChord(data) {
    // center chord circle horizontally, position vertically in lower half 
    const cx = W / 2;
    const cy = chordTop + chordMargin.top + chordHeight / 2;

    chordG = svg.append("g").attr("transform", `translate(${cx}, ${cy})`);

    // title 
    svg.append("text")
        .attr("x", cx).attr("y", chordTop + 10)
        .attr("text-anchor", "middle")
        .attr("font-size", titleFont + "px").attr("font-weight", "bold")
        .attr("font-family", "Georgia,serif").attr("fill", "#222")
        .text("Type Co-occurrence of Selected Pokémon");

    // sub-title 
    svg.append("text")
        .attr("class", "chord-subtitle")
        .attr("x", cx).attr("y", chordTop + 30)
        .attr("text-anchor", "middle")
        .attr("font-size", subtitleFont + "px")
        .attr("font-family", "Georgia,serif").attr("fill", "#888")
        .text("Arc size = # of that type in selection, Ribbon width = # of dual-type pairs (Hover for Pokémon details)");

    // type color legend 
    const chordLegRowH = Math.max(11, H * 0.016);
    const chordLegFont = Math.max(7, W * 0.005);
    const colSize = 9;
    const colWidth = Math.max(70, W * 0.055);   // scales with window

    // position legend to right of chord circle 
    const chordLegG = svg.append("g")
        .attr("transform", `translate(${W * 0.73}, ${chordTop + chordMargin.top})`);

    chordLegG.append("rect")
        .attr("x", -8).attr("y", -8)
        .attr("width", colWidth * 2 + 12)
        .attr("height", colSize * chordLegRowH + 16)
        .attr("fill", "rgba(245,244,240,0.9)")
        .attr("rx", 5)
        .attr("stroke", "#ddd").attr("stroke-width", 0.8);

    pokemonTypes.forEach(function (type, i) {
        const col = Math.floor(i / colSize);
        const row = i % colSize;

        const rowG = chordLegG.append("g")
            .attr("transform", `translate(${col * colWidth + 6}, ${row * chordLegRowH + 6})`);

        rowG.append("circle")
            .attr("cx", 5).attr("cy", chordLegRowH * 0.4).attr("r", 4.5)
            .attr("fill", typeColor(type));

        rowG.append("text")
            .attr("x", 14).attr("y", chordLegRowH * 0.55)
            .attr("dominant-baseline", "middle")
            .attr("font-size", chordLegFont + "px")
            .attr("font-family", "Georgia,serif")
            .attr("fill", "#333")
            .text(type);
    });

    renderChordLayout(data);
}

// draws the chord arcs, ribbons, and labels
function renderChordLayout(data) {
    chordTop = H * 0.54;
    chordHeight = H * 0.46 - chordMargin.top - chordMargin.bottom;
    chordRadius = Math.max(40, Math.min(W * 0.14, chordHeight) / 2 - 5);

    const matrix = buildTypeMatrix(data);
    const chordLayout = d3.chord().padAngle(0.04).sortSubgroups(d3.descending);
    const chords = chordLayout(matrix);
    const arc = d3.arc().innerRadius(chordRadius).outerRadius(chordRadius + 18);
    const ribbon = d3.ribbon().radius(chordRadius);

    // outer arcs 
    // one per type, sized by how many pokemon of that type is selected 
    chordG.selectAll(".chord-arc")
        .data(chords.groups, d => d.index)
        .enter().append("path")
        .attr("class", "chord-arc")
        .attr("d", arc)
        .attr("fill", d => typeColor(pokemonTypes[d.index]))
        .attr("stroke", d => d3.rgb(typeColor(pokemonTypes[d.index])).darker())
        .attr("stroke-width", 0.5)
        .attr("opacity", 0) // start invisible for fade-in animation 
        .style("cursor", "pointer")
        .on("mouseover", function (d) {
            const event = d3.event;
            const type = pokemonTypes[d.index];

            d3.select(this).attr("opacity", 1).attr("stroke-width", 2);

            // highlight only ribbons connected to this type 
            chordG.selectAll(".chord-ribbon")
                .transition().duration(150)
                .attr("opacity", r =>
                    (r.source.index === d.index || r.target.index === d.index) ? 0.75 : 0.05);

            const primary = data.filter(pk => pk.Type_1 === type);
            const secondary = data.filter(pk => pk.Type_2 === type);
            const sample = primary.slice(0, 4).map(pk => pk.Name).join(", ");
            const more = primary.length > 4 ? ` +${primary.length - 4} more` : "";

            tooltip.style("display", "block")
                .style("left", (event.pageX + 14) + "px")
                .style("top", (event.pageY - 38) + "px")
                .html(`<strong style="color:${typeColor(type)}">${type}</strong><br>
                       <b>${primary.length}</b> primary · <b>${secondary.length}</b> secondary<br>
                       <hr style="margin:4px 0; border-color:#eee">
                       <em style="color:#888;font-size:10px">Primary type Pokémon:</em><br>
                       ${sample}${more}`);
        })
        .on("mousemove", function () {                     // ← no event arg
            const event = d3.event;
            tooltip.style("left", (event.pageX + 14) + "px")
                .style("top", (event.pageY - 38) + "px");
        })
        .on("mouseout", function () {
            d3.select(this).attr("opacity", 0.85).attr("stroke-width", 0.5);
            chordG.selectAll(".chord-ribbon")
                .transition().duration(150).attr("opacity", 0.35);
            hideTooltip();
        })

        // fade in animation for arcs appearing one by one 
        .transition().duration(500).ease(d3.easeLinear)
        .delay((d, i) => i * 25)
        .attr("opacity", 0.85);

    // type labels
    // push distance scales with arc size to prevent overcrowded labels 
    chordG.selectAll(".chord-label")
        .data(chords.groups, d => d.index)
        .enter().append("text")
        .attr("class", "chord-label")
        .attr("dy", "0.35em")
        .attr("font-size", Math.max(9, chordRadius * 0.09) + "px")
        .attr("font-family", "Georgia,serif")
        .attr("fill", "#222")
        .attr("opacity", 0)
        .attr("transform", function (d) {
            const angle = (d.startAngle + d.endAngle) / 2;
            const r = chordRadius + 42;
            const x = Math.sin(angle) * r;
            const y = -Math.cos(angle) * r;
            const rot = (angle * 180 / Math.PI) - 90;
            return `translate(${x},${y}) rotate(${rot > 90 ? rot + 180 : rot})`;
        })
        .attr("text-anchor", "middle")
        .text(d => pokemonTypes[d.index])
        .transition().duration(500).delay((d, i) => i * 25)
        .attr("opacity", 1);

    // inner ribbons
    // connect two types, width = number of dual-type pokemon 
    chordG.selectAll(".chord-ribbon")
        .data(chords, d => `${d.source.index}-${d.target.index}`)
        .enter().append("path")
        .attr("class", "chord-ribbon")
        .attr("d", ribbon)
        .attr("fill", d => typeColor(pokemonTypes[d.source.index]))
        .attr("opacity", 0)
        .attr("stroke", "rgba(255,255,255,0.2)")
        .attr("stroke-width", 0.5)
        .style("cursor", "pointer")
        .on("mouseover", function (d) {
            const event = d3.event;
            d3.select(this).attr("opacity", 0.85);
            const t1 = pokemonTypes[d.source.index];
            const t2 = pokemonTypes[d.target.index];

            const members = data.filter(pk =>
                (pk.Type_1 === t1 && pk.Type_2 === t2) ||
                (pk.Type_1 === t2 && pk.Type_2 === t1));
            const sample = members.slice(0, 5).map(pk => pk.Name).join(", ");
            const more = members.length > 5 ? ` +${members.length - 5} more` : "";

            tooltip.style("display", "block")
                .style("left", (event.pageX + 14) + "px")
                .style("top", (event.pageY - 38) + "px")
                .html(`<strong style="color:${typeColor(t1)}">${t1}</strong>
                       &nbsp;/&nbsp;
                       <strong style="color:${typeColor(t2)}">${t2}</strong>
                       <em style="color:#888"> dual-type</em><br>
                       <b>${members.length}</b> Pokémon with both types<br>
                       <hr style="margin:4px 0; border-color:#eee">
                       <em style="color:#888;font-size:10px">Pokémon in selection:</em><br>
                       ${sample}${more}`);
        })
        .on("mousemove", function () {
            const event = d3.event;
            tooltip.style("left", (event.pageX + 14) + "px")
                .style("top", (event.pageY - 38) + "px");
        })
        .on("mouseout", function () {
            d3.select(this).attr("opacity", 0.35);
            hideTooltip();
        })

        // ribbons fade in after arc finish 
        .transition().duration(500).ease(d3.easeLinear)
        .delay((d, i) => 400 + i * 15)
        .attr("opacity", 0.35);
}

// called by brush and legend click handlers when selection changes 
// stage 1 fade out everything
// stage 2 remove and redraw new data 
function updateChord(selectedData) {
    svg.select(".chord-subtitle")
        .text(`${selectedData.length} Pokémon ( arcs = type count, chords = dual-type pairs)`);

    chordG.selectAll(".chord-arc, .chord-ribbon, .chord-label")
        .transition().duration(250)
        .attr("opacity", 0)
        .on("end", function (d, i) {
            if (i !== 0) return; // only trigger redraw once 
            chordG.selectAll(".chord-arc, .chord-ribbon, .chord-label").remove();
            renderChordLayout(selectedData);
        });
}


// scatter plot
// over-view 
// shows all pokemon as attack vs defense points
// brush to select a subset, drives bar chart and chord updates
// click legend to filter by type
// double click legend row to isolate that type 
let scatterLeft = 0, scatterTop = 0;
let scatterMargin = { top: 115, right: 30, bottom: 50, left: 70 };  // left was 55
let scatterWidth = W * 0.38 - scatterMargin.left - scatterMargin.right;
let scatterHeight = H * 0.48 - scatterMargin.top - scatterMargin.bottom;

// shared set of active types, shared by legend click and brush handler
// help filtering and brushing stay in sync 
let activeTypeFilter = new Set();

function drawScatter(data) {
    pokemonTypes.forEach(t => activeTypeFilter.add(t));

    const g = svg.append("g")
        .attr("transform", `translate(${scatterLeft + scatterMargin.left}, ${scatterTop + scatterMargin.top})`);

    // title and subtitle 
    g.append("text")
        .attr("x", scatterWidth / 2).attr("y", -44)
        .attr("text-anchor", "middle")
        .attr("font-size", titleFont + "px").attr("font-weight", "bold")
        .attr("font-family", "Georgia,serif").attr("fill", "#222")
        .text("Overview: Attack vs. Defense");

    g.append("text")
        .attr("x", scatterWidth / 2).attr("y", -26)
        .attr("text-anchor", "middle")
        .attr("font-size", subtitleFont + "px")
        .attr("font-family", "Georgia,serif").attr("fill", "#888")
        .text("Brush to select Pokémon (Color = Type)");

    // axis labels 
    g.append("text")
        .attr("x", scatterWidth / 2).attr("y", scatterHeight + 48)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px").attr("font-family", "Georgia,serif").attr("fill", "#555")
        .text("Attack");

    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -(scatterHeight / 2)).attr("y", -46)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px").attr("font-family", "Georgia,serif").attr("fill", "#555")
        .text("Defense");

    // scales 
    const x = d3.scaleLinear()
        .domain([0, d3.max(data, d => +d.Attack) + 10])
        .range([0, scatterWidth]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => +d.Defense) + 10])
        .range([scatterHeight, 0]);

    // gridlines 
    g.append("g")
        .call(d3.axisLeft(y).ticks(5).tickSize(-scatterWidth).tickFormat(""))
        .call(grp => grp.selectAll("line").attr("stroke", "#e8e8e4").attr("stroke-dasharray", "2,2"))
        .call(grp => grp.select(".domain").remove());

    g.append("g")
        .attr("transform", `translate(0, ${scatterHeight})`)
        .call(d3.axisBottom(x).ticks(6).tickSize(-scatterHeight).tickFormat(""))
        .call(grp => grp.selectAll("line").attr("stroke", "#e8e8e4").attr("stroke-dasharray", "2,2"))
        .call(grp => grp.select(".domain").remove());

    // axes 
    g.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0, ${scatterHeight})`)
        .call(d3.axisBottom(x).ticks(6));

    g.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y).ticks(5));

    const dotGroup = g.append("g");

    // dots - pointer-events disabled to help brush overlay capture all mouse events
    // tootip handled via nearest-dot search on brush overaly 
    const scatterDots = dotGroup.selectAll(".dot")
        .data(data)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("cx", d => x(+d.Attack))
        .attr("cy", d => y(+d.Defense))
        .attr("r", 4)
        .attr("fill", d => typeColor(d.Type_1))
        .attr("opacity", 0.55)
        .attr("stroke", "rgba(255,255,255,0.3)")
        .attr("stroke-width", 0.5)
        .style("pointer-events", "none");

    // pre-compute dot pixel positions for fast nearest-dot tooltip lookup 
    const dotPositions = data.map(d => ({
        px: x(+d.Attack),
        py: y(+d.Defense),
        d: d
    }));

    // tracks which Pokémon are currently inside the brush (null = no brush active)
    let brushActive = false;
    let brushSelectedSet = new Set();

    // Legend
    // clickable to filter by type 
    const legG = g.append("g").attr("transform", `translate(${scatterWidth + 10}, 0)`);
    const legRowH = Math.max(13, H * 0.016);
    const legFont = Math.max(8, W * 0.006);
    const legW = Math.max(90, W * 0.075);


    legG.append("rect")
        .attr("x", -6).attr("y", -6)
        .attr("width", legW)
        .attr("height", pokemonTypes.length * legRowH + 14)
        .attr("fill", "rgba(245,244,240,0.9)").attr("rx", 5)
        .attr("stroke", "#ddd").attr("stroke-width", 0.8);

    pokemonTypes.forEach(function (type, i) {
        const row = legG.append("g")
            .attr("transform", `translate(8, ${i * legRowH + 6})`)
            .attr("data-type", type)
            .style("cursor", "pointer");

        row.append("circle")
            .attr("class", `leg-circle-${type.replace(/\s/g, "")}`)
            .attr("cx", 5).attr("cy", legRowH * 0.4).attr("r", 4.5)
            .attr("fill", typeColor(type));

        row.append("text")
            .attr("class", `leg-text-${type.replace(/\s/g, "")}`)
            .attr("x", 14).attr("y", legRowH * 0.55)
            .attr("dominant-baseline", "middle")
            .attr("font-size", legFont + "px")
            .attr("font-family", "Georgia,serif").attr("fill", "#333")
            .text(type);

        // single click, toggle type on and off 
        row.on("click", function () {
            if (activeTypeFilter.has(type)) {
                activeTypeFilter.delete(type);
                d3.select(this).select("circle").attr("fill", "#ccc");
                d3.select(this).select("text").attr("fill", "#bbb");
            } else {
                activeTypeFilter.add(type);
                d3.select(this).select("circle").attr("fill", typeColor(type));
                d3.select(this).select("text").attr("fill", "#333");
            }

            scatterDots.transition().duration(200)
                .attr("opacity", d => activeTypeFilter.has(d.Type_1) ? 0.75 : 0.0)
                .attr("r", d => activeTypeFilter.has(d.Type_1) ? 4 : 0);

            const filtered = data.filter(d => activeTypeFilter.has(d.Type_1));
            if (filtered.length > 0) {
                updateBarChart(filtered, `${filtered.length} Pokémon selected`);
                updateChord(filtered);
            }
        });

        // double-click to isolate just that one type
        row.on("dblclick", function () {
            // If this is the only active type, restore all
            if (activeTypeFilter.size === 1 && activeTypeFilter.has(type)) {
                // already isolated, restore all types 
                pokemonTypes.forEach(t => activeTypeFilter.add(t));
                pokemonTypes.forEach(function (t) {
                    legG.select(`g[data-type="${t}"] circle`).attr("fill", typeColor(t));
                    legG.select(`g[data-type="${t}"] text`).attr("fill", "#333");
                });
                legG.selectAll("text").attr("fill", "#333");
                scatterDots.transition().duration(200)
                    .attr("opacity", 0.75).attr("r", 4);
                updateBarChart(data, `All ${data.length} Pokémon`);
                updateChord(data);
            } else {
                // isolate just this type, grey out all others 
                activeTypeFilter.clear();
                activeTypeFilter.add(type);
                pokemonTypes.forEach(function (t) {
                    const on = activeTypeFilter.has(t);
                    legG.select(`g[data-type="${t}"] circle`)
                        .attr("fill", on ? typeColor(t) : "#ccc");
                    legG.select(`g[data-type="${t}"] text`)
                        .attr("fill", on ? "#333" : "#bbb");
                });
                scatterDots.transition().duration(200)
                    .attr("opacity", d => d.Type_1 === type ? 0.85 : 0.0)
                    .attr("r", d => d.Type_1 === type ? 4 : 0);
                const filtered = data.filter(d => d.Type_1 === type);
                updateBarChart(filtered, `${filtered.length} ${type} Pokémon`);
                updateChord(filtered);
            }
        });
    });

    // brush
    // rectangular selection tool 
    // filtered out types are excluded from selection 
    const brush = d3.brush()
        .extent([[0, 0], [scatterWidth, scatterHeight]])
        .on("brush end", function () {
            const sel = d3.event.selection;

            if (!sel) {
                // brush cleared, restore dots and focus views to match current type filter 
                brushActive = false;
                brushSelectedSet.clear();

                // Restore legend rows to match activeTypeFilter
                pokemonTypes.forEach(function (t) {
                    const on = activeTypeFilter.has(t);
                    legG.select(`g[data-type="${t}"] circle`)
                        .attr("fill", on ? typeColor(t) : "#ccc");
                    legG.select(`g[data-type="${t}"] text`)
                        .attr("fill", on ? "#333" : "#bbb");
                });

                scatterDots.transition().duration(200)
                    .attr("opacity", d => activeTypeFilter.has(d.Type_1) ? 0.75 : 0.0)
                    .attr("r", d => activeTypeFilter.has(d.Type_1) ? 4 : 0);
                const filtered = data.filter(d => activeTypeFilter.has(d.Type_1));
                updateBarChart(filtered, `All ${filtered.length} Pokémon`);
                updateChord(filtered);
                return;
            }

            const [[x0, y0], [x1, y1]] = sel;

            // only include dots inside brush and whose type is active 
            const selected = data.filter(d => {
                const cx = x(+d.Attack);
                const cy = y(+d.Defense);
                return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1
                    && activeTypeFilter.has(d.Type_1);
            });

            // dim dots outside brush, keep filtered out types fully hidden 
            scatterDots.transition().duration(200)
                .attr("opacity", function (d) {
                    if (!activeTypeFilter.has(d.Type_1)) return 0.0;
                    const cx = x(+d.Attack), cy = y(+d.Defense);
                    return (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1) ? 0.85 : 0.08;
                })
                .attr("r", function (d) {
                    if (!activeTypeFilter.has(d.Type_1)) return 0;
                    const cx = x(+d.Attack), cy = y(+d.Defense);
                    return (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1) ? 5 : 3;
                });

            if (selected.length > 0) {
                brushActive = true;

                // track which Pokémon names are inside the brush
                brushSelectedSet = new Set(selected.map(d => d.Name));

                // which types are present in the selection
                const typesInBrush = new Set(selected.map(d => d.Type_1));

                // grey out legend rows for types not in brush
                pokemonTypes.forEach(function (t) {
                    const inBrush = typesInBrush.has(t);
                    legG.select(`g[data-type="${t}"] circle`)
                        .attr("fill", inBrush ? typeColor(t) : "#ccc");
                    legG.select(`g[data-type="${t}"] text`)
                        .attr("fill", inBrush ? "#333" : "#bbb");
                });

                updateBarChart(selected, `${selected.length} Pokémon selected`);
                updateChord(selected);
            }
        });

    g.append("g").attr("class", "brush").call(brush);

    // tooltip via brush overlay 
    // dots have pointer-events:none so we intercept mousemove on the overlay and find the nearest dot
    g.select(".brush .overlay")
        .on("mousemove.tooltip", function () {
            const [mx, my] = d3.mouse(this);

            // Find nearest dot within 12px
            let nearest = null, nearestDist = 12;
            dotPositions.forEach(function (pos) {
                const dist = Math.hypot(pos.px - mx, pos.py - my);
                if (dist < nearestDist) {
                    nearest = pos.d;
                    nearestDist = dist;
                }
            });

            // if brush is active, only show tooltip for dots inside the selection
            if (nearest && (!brushActive || brushSelectedSet.has(nearest.Name))) {
                tooltip.style("display", "block")
                    .style("left", (d3.event.pageX + 14) + "px")
                    .style("top", (d3.event.pageY - 38) + "px")
                    .html(`<strong>${nearest.Name}</strong><br>
                       Type: ${nearest.Type_1}${nearest.Type_2 ? " / " + nearest.Type_2 : ""}<br>
                       Attack: <strong>${nearest.Attack}</strong>
                       &nbsp; Defense: <strong>${nearest.Defense}</strong><br>
                       Total: <strong>${nearest.Total}</strong>`);
            } else {
                hideTooltip();
            }
        })
        .on("mouseleave.tooltip", hideTooltip);
}

// load data 
// stores data globally, help resize handler to redraw without re-fetching info
d3.csv("data/pokemon_alopez247.csv").then(function (data) {
    window._lastData = data;
    drawScatter(data);
    drawBarChart(data);
    drawChord(data);
});