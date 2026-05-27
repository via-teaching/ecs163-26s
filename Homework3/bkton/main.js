//Colors for specific types
const TYPE_COLORS = {
  Bug:      "#92BC2C", Dark:     "#595761", Dragon:   "#0C69C8",
  Electric: "#F2D94E", Fairy:    "#EE90E6", Fighting: "#D3425F",
  Fire:     "#FBA54C", Flying:   "#A1BBEC", Ghost:    "#5F6DBC",
  Grass:    "#5FBD58", Ground:   "#DA7C4D", Ice:      "#75D0C1",
  Normal:   "#A0A29F", Poison:   "#B763CF", Psychic:  "#FA8581",
  Rock:     "#C9BB8A", Steel:    "#5695A3", Water:    "#539DDF",
};
 
//State 
let allData = [];
let activeTypes = new Set();  
let brushedIDs  = new Set();     
let selectedType = null;        
//Tooltip
const tooltip = d3.select("#tooltip");
function showTip(html, event) {
  tooltip.html(html).classed("show", true);
  moveTip(event);
}
function moveTip(event) {
  let x = event.clientX + 14, y = event.clientY - 10;
  if (x + 210 > window.innerWidth)  x = event.clientX - 220;
  if (y + 140 > window.innerHeight) y = event.clientY - 130;
  tooltip.style("left", x + "px").style("top", y + "px");
}
function hideTip() { tooltip.classed("show", false); }
 
//Helpers 
function visibleData() {
  let d = allData;
  if (activeTypes.size > 0) d = d.filter(p => activeTypes.has(p.Type_1));
  return d;
}
// Highlighting logic
function isHighlighted(d) {
  return brushedIDs.size === 0 || brushedIDs.has(d.Number);
}
 
//Load data 
d3.csv("data/pokemon_alopez247.csv").then(raw => {
  raw.forEach(d => {
    d.HP = +d.HP;
    d.Attack = +d.Attack;
    d.Defense = +d.Defense;
    d.Sp_Atk = +d.Sp_Atk;
    d.Sp_Def = +d.Sp_Def;
    d.Speed = +d.Speed;
    d.Total = +d.Total;
    d.Generation = +d.Generation;
    d.Weight_kg = +d.Weight_kg;
    d.Height_m = +d.Height_m;
    d.Number = +d.Number;
  });
  allData = raw;
 
  buildTypeFilter();
  buildScatter();
  buildParallel();
  buildBar();
});
 
//Type Filter Bar 
function buildTypeFilter() {
  const types = Object.keys(TYPE_COLORS).sort();
  const container = d3.select("#type-filter");
 
  const btns = container.selectAll(".type-btn")
    .data(types).enter()
    .append("button")
    .attr("class", "type-btn active")
    .text(d => d)
    .style("background", d => TYPE_COLORS[d] + "30")
    .style("color", d => TYPE_COLORS[d])
    .style("border-color", d => TYPE_COLORS[d] + "60")
    .on("click", function(event, d) {
      if (activeTypes.has(d)) {
        activeTypes.delete(d);
        d3.select(this).classed("active", false);
      } else {
        activeTypes.add(d);
        d3.select(this).classed("active", true);
      }
      brushedIDs.clear();
      refreshAll();
    });
 
  // "All" button
  container.insert("button", ":first-child")
    .attr("class", "type-btn active")
    .text("ALL")
    .style("background", "rgba(246,192,38,0.1)")
    .style("color", "#f6c026")
    .style("border-color", "#f6c026")
    .on("click", () => {
      activeTypes.clear();
      brushedIDs.clear();
      container.selectAll(".type-btn").classed("active", true);
      refreshAll();
    });
}
 
function refreshAll() {
  updateScatter();
  updateParallel();
  updateBar();
  updateSelectionInfo();
}
 
// Improve Scatter Plot 
// Added brush and zoom + pan
let xS, yS, xSBase, ySBase, scatterG, scatterSvg;
let scatterW, scatterH;
let scatterMode = "brush";   // "brush" | "zoom"
let zoomTransform = d3.zoomIdentity;
const SM = { top: 30, right: 20, bottom: 50, left: 55 };
 
// Zoom behaviour 
let zoomBehaviour;
 
// Build scatter plot 
function buildScatter() {
  const el = document.getElementById("panel-scatter");
  scatterW  = el.clientWidth  - SM.left - SM.right;
  scatterH  = el.clientHeight - 38 - SM.top - SM.bottom;
 // Create SVG and group for scatter plot
  scatterSvg = d3.select("#scatter-svg");
 
  // Clip path so dots don't overflow axes when zoomed
  scatterSvg.append("defs").append("clipPath").attr("id","scatter-clip")
    .append("rect").attr("width", scatterW).attr("height", scatterH);
 // Main group for scatter plot
  scatterG = scatterSvg.append("g")
    .attr("transform", `translate(${SM.left},${SM.top})`);
 
  // Base scales
  // never mutated
  xSBase = d3.scaleLinear()
    .domain([0, d3.max(allData, d => d.Attack) + 5]).range([0, scatterW]);
  ySBase = d3.scaleLinear()
    .domain([0, d3.max(allData, d => d.Defense) + 5]).range([scatterH, 0]);
 
  // Working scales
  xS = xSBase.copy();
  yS = ySBase.copy();
 
  // Axes
  scatterG.append("g").attr("class","x-axis")
    .attr("transform", `translate(0,${scatterH})`)
    .call(d3.axisBottom(xS).ticks(6))
    .call(styleAxis);
 
  scatterG.append("g").attr("class","y-axis")
    .call(d3.axisLeft(yS).ticks(6))
    .call(styleAxis);
 
  // Axis labels
  scatterG.append("text").attr("class","ax-label")
    .attr("x", scatterW/2).attr("y", scatterH + 42).attr("text-anchor","middle")
    .attr("fill","#9ca3af").attr("font-size","12px").text("Attack");
  scatterG.append("text").attr("class","ax-label")
    .attr("transform","rotate(-90)").attr("x",-scatterH/2).attr("y",-42)
    .attr("text-anchor","middle").attr("fill","#9ca3af").attr("font-size","12px").text("Defense");
 
  // Dots (clipped)
  scatterG.append("g").attr("class","dots")
    .attr("clip-path","url(#scatter-clip)");
  updateScatterDots();
 
  // Brush
  const brush = d3.brush()
    .extent([[0,0],[scatterW,scatterH]])
    .on("start brush", brushed)
    .on("end", brushEnd);
 // Initially in brush mode, so brush is active
  scatterG.append("g").attr("class","brush").call(brush);

 // Brush handlers
  function brushed({ selection }) {
    if (!selection) return;
    const [[x0,y0],[x1,y1]] = selection;
    brushedIDs.clear();
    // Find points within the brush selection
    visibleData().forEach(d => {
      const cx = xS(d.Attack), cy = yS(d.Defense);
      if (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1) brushedIDs.add(d.Number);
    });
    // Update highlights and selection info
    updateScatter();
    updateParallel();
    updateSelectionInfo();
  }
  // Clear brush selection on end if no area selected
  function brushEnd({ selection }) {
    if (!selection) {
      brushedIDs.clear();
      updateScatter();
      updateParallel();
      updateSelectionInfo();
    }
  }
 
  // Zoom section
  zoomBehaviour = d3.zoom()
    .scaleExtent([0.5, 12])
    .translateExtent([[-scatterW, -scatterH],[2*scatterW, 2*scatterH]])
    .on("zoom", zoomed);
 
  // Invisible zoom-capture rect (only active in zoom mode)
  scatterG.append("rect").attr("class","zoom-rect")
    .attr("width", scatterW).attr("height", scatterH)
    .attr("fill","transparent")
    .style("display","none")
    .call(zoomBehaviour);
 
    // Zoom handler
  function zoomed(event) {
    zoomTransform = event.transform;
    // Rescale axes (Substrate Transformation transition)
    xS = zoomTransform.rescaleX(xSBase);
    yS = zoomTransform.rescaleY(ySBase);
 
    scatterG.select(".x-axis")
    // immediate during drag
      .transition().duration(0)   
      .call(d3.axisBottom(xS).ticks(6)).call(styleAxis);
    scatterG.select(".y-axis")
      .transition().duration(0)
      .call(d3.axisLeft(yS).ticks(6)).call(styleAxis);
 
    // Move dots without data-join overhead (View Transition)
    scatterG.select(".dots").selectAll("circle")
      .attr("cx", d => xS(d.Attack))
      .attr("cy", d => yS(d.Defense));
  }
 
  //Mode toggle buttons 
  d3.select("#btn-brush").on("click", () => setMode("brush"));
  d3.select("#btn-zoom" ).on("click", () => setMode("zoom"));
  d3.select("#btn-reset").on("click", resetZoom);
}
 // Style axes with consistent color
function styleAxis(g) {
  g.selectAll("text,line,path").attr("stroke","#6b7280").attr("fill","#6b7280");
}
 
function setMode(mode) {
  scatterMode = mode;
  // Toggle brush visibility
  scatterG.select(".brush").style("pointer-events", mode === "brush" ? "all" : "none")
                            .style("display",        mode === "brush" ? null  : "none");
  // Toggle zoom-rect visibility
  scatterG.select(".zoom-rect").style("display", mode === "zoom" ? null : "none");
 
  d3.select("#btn-brush").classed("active", mode === "brush");
  d3.select("#btn-zoom" ).classed("active", mode === "zoom");
 
  const hint = document.getElementById("scatter-hint");
  hint.textContent = mode === "brush"
    ? "Brush to select · Click point for detail"
    : "Scroll to zoom · Drag to pan · Switch back to brush to select";
}
 // Reset zoom to original view
function resetZoom() {
  zoomTransform = d3.zoomIdentity;
  xS = xSBase.copy();
  yS = ySBase.copy();
 
  scatterG.select(".zoom-rect").call(zoomBehaviour.transform, d3.zoomIdentity);
 
  // Animated reset back to original view (View Transition)
  scatterG.select(".x-axis").transition().duration(500)
    .call(d3.axisBottom(xS).ticks(6)).call(styleAxis);
  scatterG.select(".y-axis").transition().duration(500)
    .call(d3.axisLeft(yS).ticks(6)).call(styleAxis);
 
  scatterG.select(".dots").selectAll("circle")
    .transition().duration(500)
    .attr("cx", d => xS(d.Attack))
    .attr("cy", d => yS(d.Defense));
}
 // Update scatter dots based on current filters and brush selection
function updateScatterDots() {
  const vis = visibleData();
  const dots = scatterG.select(".dots").selectAll("circle")
    .data(vis, d => d.Number);
 
  // Enter
  dots.enter().append("circle")
    .attr("cx", d => xS(d.Attack))
    .attr("cy", d => yS(d.Defense))
    .attr("r", 0)
    .attr("fill", d => TYPE_COLORS[d.Type_1] || "#aaa")
    .attr("opacity", 0)
    .on("mouseover", function(event, d) {
      showTip(`<strong>${d.Name}</strong>
        Type: ${d.Type_1}${d.Type_2 ? " / " + d.Type_2 : ""}<br>
        ATK: ${d.Attack} · DEF: ${d.Defense}<br>
        HP: ${d.HP} · SPD: ${d.Speed}<br>
        Total: ${d.Total}`, event);
    })
    .on("mousemove", (e) => moveTip(e))
    .on("mouseout", hideTip)
    // Interaction
    // Click to select single Pokémon type
    .on("click", function(event, d) {
      event.stopPropagation();
      if (selectedType === d.Type_1) {
        selectedType = null;
        activeTypes.clear();
      } else {
        selectedType = d.Type_1;
        activeTypes.clear();
        activeTypes.add(d.Type_1);
      }
      brushedIDs.clear();
      syncTypeButtons();
      refreshAll();
    })
    // Animate new dots appearing
    .transition().duration(400)
    .attr("r", 4.5)
    .attr("opacity", d => isHighlighted(d) ? 0.85 : 0.12);
 
  // Update
  dots.transition().duration(300)
    .attr("cx", d => xS(d.Attack))
    .attr("cy", d => yS(d.Defense))
    .attr("fill", d => TYPE_COLORS[d.Type_1] || "#aaa")
    .attr("opacity", d => isHighlighted(d) ? 0.85 : 0.12)
    .attr("r", d => isHighlighted(d) ? 4.5 : 3);
 
  // Exit by fade 
  dots.exit().transition().duration(350)
    .attr("r", 0).attr("opacity", 0).remove();
}
//
function updateScatter() { 
    updateScatterDots(); 
}
 
function syncTypeButtons() {
  d3.selectAll(".type-btn").each(function(d) {
    if (d === undefined) {
      // ALL button 
      d3.select(this).classed("active", activeTypes.size === 0);
    } else {
      d3.select(this).classed("active", activeTypes.size === 0 || activeTypes.has(d));
    }
  });
}
 
// Plot 2: Parallel Coordinates 
let parallelG, parallelSvg, yPC = {}, xPC;
const PM = { top: 40, right: 20, bottom: 20, left: 20 };
const DIMS = ["HP","Attack","Defense","Sp_Atk","Sp_Def","Speed"];
// Build parallel coordinates plot
function buildParallel() {
  const el = document.getElementById("panel-parallel");
  const W  = el.clientWidth  - PM.left - PM.right;
  const H  = el.clientHeight - 38 - PM.top - PM.bottom;

 // Create SVG and group for parallel coordinates
  parallelSvg = d3.select("#parallel-svg");
  parallelG   = parallelSvg.append("g")
    .attr("transform", `translate(${PM.left},${PM.top})`);
 // Title
  xPC = d3.scalePoint().domain(DIMS).range([30, W - 30]).padding(0.1);
 // Y scales for each dimension
  DIMS.forEach(dim => {
    yPC[dim] = d3.scaleLinear()
      .domain([0, d3.max(allData, d => d[dim]) + 5])
      .range([H, 0]).nice();
  });
 
  // Draw axes
  DIMS.forEach(dim => {
    const ag = parallelG.append("g")
      .attr("class","pc-axis")
      .attr("transform",`translate(${xPC(dim)},0)`);
 
    ag.call(d3.axisLeft(yPC[dim]).ticks(5))
      .call(g => g.selectAll("text,line,path").attr("stroke","#374151").attr("fill","#6b7280").attr("font-size","9px"));
 
    ag.append("text")
      .attr("y", -10).attr("text-anchor","middle")
      .attr("fill","#f6c026").attr("font-size","10px").attr("font-weight","700")
      .text(dim);
  });
 
  // Lines layer
  parallelG.append("g").attr("class","pc-lines");
  updateParallelLines();
}
 
// Path generator for parallel coordinates lines
function pcPath(d) {
  return d3.line()(DIMS.map(dim => [xPC(dim), yPC[dim](d[dim])]));
}
// Update parallel coordinates lines
function updateParallelLines() {
  const vis  = visibleData();
  const lines = parallelG.select(".pc-lines").selectAll("path")
    .data(vis, d => d.Number);
 
  // Enter — fade in from 0 opacity (Filtering transition)
  lines.enter().append("path")
    .attr("d", pcPath)
    .attr("fill","none")
    .attr("stroke", d => TYPE_COLORS[d.Type_1] || "#aaa")
    .attr("stroke-width", 1)
    .attr("opacity", 0)
    .transition().duration(500)
    .attr("opacity", d => isHighlighted(d) ? 0.6 : 0.04)
    .attr("stroke-width", d => isHighlighted(d) ? 1.5 : 0.8);
 
  // Update — animate to new highlight state
  lines.transition().duration(350)
    .attr("opacity", d => isHighlighted(d) ? 0.65 : 0.04)
    .attr("stroke-width", d => isHighlighted(d) ? 1.8 : 0.8)
    .attr("stroke", d => TYPE_COLORS[d.Type_1] || "#aaa");
 
  // Exit — fade out
  lines.exit().transition().duration(350)
    .attr("opacity", 0).remove();
}
 
function updateParallel() { updateParallelLines(); }
 
// PLOT 3: Bar Chart
let xB, yB, barG, barSvg;
const BM = { top: 20, right: 20, bottom: 60, left: 55 };

// Build bar chart showing count of Pokémon by primary type
function buildBar() {
  const el = document.getElementById("panel-bar");
  const W  = el.clientWidth  - BM.left - BM.right;
  const H  = el.clientHeight - 38 - BM.top - BM.bottom;
// Create SVG and group for bar chart
  barSvg = d3.select("#bar-svg");
  barG   = barSvg.append("g").attr("transform",`translate(${BM.left},${BM.top})`);
 
  const types = Object.keys(TYPE_COLORS).sort();
 // Scales
  xB = d3.scaleBand().domain(types).range([0,W]).padding(0.28);
  yB = d3.scaleLinear().domain([0, 120]).range([H,0]).nice();
 
  // Grid lines
  barG.append("g").attr("class","grid")
    .call(d3.axisLeft(yB).ticks(6).tickSize(-W).tickFormat(""))
    .call(g => g.selectAll("line").attr("stroke","#1e2340").attr("stroke-dasharray","3,3"))
    .call(g => g.select(".domain").remove());
 
  // Axes
  barG.append("g").attr("class","x-axis-b")
    .attr("transform",`translate(0,${H})`)
    .call(d3.axisBottom(xB))
    .call(g => g.selectAll("text")
      .attr("fill","#9ca3af").attr("font-size","10px")
      .attr("transform","rotate(-35)").attr("text-anchor","end")
      .attr("dy","0.5em").attr("dx","-0.5em"))
    .call(g => g.selectAll("line,path").attr("stroke","#374151"));
 // Y axis with custom styling
  barG.append("g").attr("class","y-axis-b")
    .call(d3.axisLeft(yB).ticks(6))
    .call(g => g.selectAll("text,line,path").attr("stroke","#6b7280").attr("fill","#6b7280"));
 
  // Axis labels
  barG.append("text").attr("x",W/2).attr("y",H+56)
    .attr("text-anchor","middle").attr("fill","#9ca3af").attr("font-size","12px").text("Primary Type");
  barG.append("text").attr("transform","rotate(-90)").attr("x",-H/2).attr("y",-42)
    .attr("text-anchor","middle").attr("fill","#9ca3af").attr("font-size","12px").text("# Pokémon");
 
  // Bars group
  barG.append("g").attr("class","bars");
  updateBar();
}
 
function updateBar() {
  const vis   = visibleData();
  const types = Object.keys(TYPE_COLORS).sort();
  const H     = +barSvg.node().getBoundingClientRect().height - 38 - BM.top - BM.bottom;
 
  // Count only visible (possibly brush-highlighted) Pokémon per type
  const countMap = {};
  types.forEach(t => countMap[t] = 0);
 
  // When we have a brush selection, bars show count of brushed within visible
  const subset = brushedIDs.size > 0
    ? vis.filter(d => brushedIDs.has(d.Number))
    : vis;
 
  subset.forEach(d => { if (countMap[d.Type_1] !== undefined) countMap[d.Type_1]++; });
 
  const maxCount = d3.max(Object.values(countMap)) || 10;
  yB.domain([0, maxCount + 2]).nice();
 
  // Update y-axis with animation (Substrate Transformation transition)
  barSvg.select(".y-axis-b")
    .transition().duration(500)
    .call(d3.axisLeft(yB).ticks(6))
    .call(g => g.selectAll("text,line,path").attr("stroke","#6b7280").attr("fill","#6b7280"));
 
  barSvg.select(".grid")
    .transition().duration(500)
    .call(d3.axisLeft(yB).ticks(6).tickSize(-(+barSvg.node().getBoundingClientRect().width - BM.left - BM.right)).tickFormat(""))
    .call(g => g.selectAll("line").attr("stroke","#1e2340").attr("stroke-dasharray","3,3"))
    .call(g => g.select(".domain").remove());
 
  const barData = types.map(t => ({ type: t, count: countMap[t] }));
 
  const bars = barG.select(".bars").selectAll("rect")
    .data(barData, d => d.type);
 
  // Enter — bars grow from 0 (animated height, Timestep transition)
  const entered = bars.enter().append("rect")
    .attr("x", d => xB(d.type))
    .attr("width", xB.bandwidth())
    .attr("y", H)
    .attr("height", 0)
    .attr("rx", 3)
    .attr("fill", d => TYPE_COLORS[d.type])
    .attr("opacity", 0.75)
    .attr("cursor","pointer")
    .on("mouseover", function(event, d) {
      d3.select(this).transition().duration(120).attr("opacity",1).attr("y", yB(d.count) - 3).attr("height", H - yB(d.count) + 3);
      showTip(`<strong>${d.type}</strong>Count: ${d.count}`, event);
    })
    .on("mousemove", e => moveTip(e))
    .on("mouseout", function(event, d) {
      d3.select(this).transition().duration(120).attr("opacity", isActiveType(d.type) ? 1 : 0.5)
        .attr("y", yB(d.count)).attr("height", H - yB(d.count));
      hideTip();
    })
    // Click bar to filter type (Interaction #2 — Selection)
    .on("click", function(event, d) {
      if (selectedType === d.type) {
        selectedType = null;
        activeTypes.clear();
      } else {
        selectedType = d.type;
        activeTypes.clear();
        activeTypes.add(d.type);
      }
      brushedIDs.clear();
      syncTypeButtons();
      refreshAll();
    });
 
  entered.transition().duration(600)
    .attr("y", d => yB(d.count))
    .attr("height", d => Math.max(0, H - yB(d.count)));
 
  // Update bars — animate height changes (Timestep transition)
  bars.transition().duration(500)
    .attr("y",      d => yB(d.count))
    .attr("height", d => Math.max(0, H - yB(d.count)))
    .attr("fill",   d => TYPE_COLORS[d.type])
    .attr("opacity", d => isActiveType(d.type) ? 1 : 0.4);
 
  // Add count labels that animate in
  const labels = barG.select(".bars").selectAll("text.bar-label")
    .data(barData, d => d.type);
 
  labels.enter().append("text").attr("class","bar-label")
    .attr("x", d => xB(d.type) + xB.bandwidth()/2)
    .attr("y", H - 2)
    .attr("text-anchor","middle")
    .attr("fill","#9ca3af")
    .attr("font-size","9px")
    .attr("opacity", 0)
    .transition().duration(600)
    .attr("y", d => yB(d.count) - 4)
    .attr("opacity", d => d.count > 0 ? 1 : 0);
 
  labels.transition().duration(500)
    .attr("y",      d => yB(d.count) - 4)
    .attr("x",      d => xB(d.type) + xB.bandwidth()/2)
    .attr("opacity",d => d.count > 0 ? 1 : 0)
    .text(d => d.count > 0 ? d.count : "");
 
  labels.exit().remove();
}
 
function isActiveType(type) {
  return activeTypes.size === 0 || activeTypes.has(type);
}
 
//Selection info display 
function updateSelectionInfo() {
  const el = document.getElementById("selected-info");
  if (brushedIDs.size > 0) {
    el.textContent = `${brushedIDs.size} Pokémon brushed`;
    el.style.color = "#3dd9b5";
  } else if (activeTypes.size > 0) {
    const arr = [...activeTypes];
    el.textContent = arr.length === 1
      ? `Type: ${arr[0]}`
      : `${arr.length} types active`;
    el.style.color = arr.length === 1 ? (TYPE_COLORS[arr[0]] || "#f6c026") : "#f6c026";
  } else {
    el.textContent = "All Pokémon · " + allData.length;
    el.style.color = "#6b7280";
  }
}
 