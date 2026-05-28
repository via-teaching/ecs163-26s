//ECS 163 HW3 interactive pokemon dashboard
//Three views: Bar Chart, Scatter Plot, Parallel Coordinates


const svg      = d3.select("svg");
const dataPath = "pokemon_alopez247.csv";
const stats    = ["HP", "Attack", "Defense", "Sp_Atk", "Sp_Def", "Speed"];

const typeColors = {
  Bug:"#92BC2C", Dark:"#595761", Dragon:"#0C69C8", Electric:"#F2D94E",
  Fairy:"#EE90E6", Fighting:"#D3425F", Fire:"#FBA54C", Flying:"#A1BBEC",
  Ghost:"#5F6DBC", Grass:"#5FBD58", Ground:"#DA7C4D", Ice:"#75D0C1",
  Normal:"#A0A29F", Poison:"#B763CF", Psychic:"#FA8581", Rock:"#C9BB8A",
  Steel:"#5695A3", Water:"#539DDF"
};

const genColor = d3.scaleOrdinal()
  .domain(["1","2","3","4","5","6"])
  .range(["#f5a623","#7ed321","#4a90d9","#e056c1","#50e3c2","#ff6b6b"]);

let pokemon      = [];
let brushedNums  = new Set();
let selectedName = null;
let xStat        = "Attack";
let yStat        = "Speed";
let colorBy      = "Type_1";
let barStat      = "Total";

d3.csv(dataPath).then(raw => {
  pokemon = raw.map(d => ({
    number:    +d.Number,
    name:      d.Name,
    type:      d.Type_1,
    type2:     d.Type_2 || "",
    generation: d.Generation,
    total:     +d.Total,
    hp:        +d.HP,
    attack:    +d.Attack,
    defense:   +d.Defense,
    spAtk:     +d.Sp_Atk,
    spDef:     +d.Sp_Def,
    speed:     +d.Speed,
    legendary: d.isLegendary === "True"
  }));

  draw();
  window.addEventListener("resize", draw);
});

function draw() {
  const W   = Math.max(960, window.innerWidth);
  const H   = Math.max(680, window.innerHeight);
  const gap = 12;

  const leftW  = Math.floor(W * 0.54);
  const rightW = W - leftW - gap * 3;
  const topH   = Math.floor(H * 0.56);
  const botH   = H - topH - gap * 3;

  svg.attr("viewBox", `0 0 ${W} ${H}`).selectAll("*").remove();

  const focusData = getFocus();

  svg.append("text").attr("class","title").attr("x", gap).attr("y", 22)
     .text("Pokémon Stats Explorer");
  svg.append("text").attr("class","subtitle").attr("x", gap).attr("y", 38)
     .text(statusText(focusData));

  drawScatter(  { x: gap,           y: 48,         w: leftW,  h: H - 58 },  pokemon);
  drawParallel( { x: leftW + gap*2, y: 48,         w: rightW, h: topH - 48 }, focusData);
  drawBar(      { x: leftW + gap*2, y: topH + gap, w: rightW, h: botH },      focusData);
}

function getFocus() {
  if (brushedNums.size > 0) return pokemon.filter(d => brushedNums.has(d.number));
  if (selectedName)         return pokemon.filter(d => d.name === selectedName);
  return pokemon.slice().sort((a,b) => b.total - a.total).slice(0, 100);
}

function statusText(focus) {
  const focusLabel = brushedNums.size > 0 ? `${focus.length} brushed Pokémon`
                   : selectedName ? selectedName
                   : `top ${focus.length} by total stats`;
  return `Brush the scatter plot to focus parallel coords + bar chart (${focusLabel} shown)`;
}

function getStat(d, stat) {
  return { HP: d.hp, Attack: d.attack, Defense: d.defense,
           Sp_Atk: d.spAtk, Sp_Def: d.spDef, Speed: d.speed,
           Total: d.total }[stat];
}

function dotColor(d) {
  if (colorBy === "Type_1")     return typeColors[d.type]    || "#aaa";
  if (colorBy === "Generation") return genColor(d.generation);
  if (colorBy === "isLegendary") return d.legendary ? "#f5a623" : "#4a5080";
  return "#aaa";
}

function panel(b) {
  svg.append("rect").attr("class","panel-bg")
     .attr("x",b.x).attr("y",b.y).attr("width",b.w).attr("height",b.h).attr("rx",6);
}

//Scatter plot 
function drawScatter(b, data) {
  panel(b);

  const m  = { top: 72, right: 18, bottom: 52, left: 56 };
  const iW = b.w - m.left - m.right;
  const iH = b.h - m.top  - m.bottom;

  const x = d3.scaleLinear().domain(d3.extent(data, d => getStat(d, xStat))).nice().range([0, iW]);
  const y = d3.scaleLinear().domain(d3.extent(data, d => getStat(d, yStat))).nice().range([iH, 0]);

  const g = svg.append("g").attr("transform", `translate(${b.x + m.left},${b.y + m.top})`);

  svg.append("text").attr("class","title")
     .attr("x", b.x + 14).attr("y", b.y + 22).text("Overview: stat scatter plot");
  svg.append("text").attr("class","subtitle")
     .attr("x", b.x + 14).attr("y", b.y + 38).text("Brush to filter, Dropdowns change axes");

  //x, y, color dropdowns — changing any triggers the viz-change transition
  addDropdown(b.x + 14,  b.y + 52, "X:",     ["HP","Attack","Defense","Sp_Atk","Sp_Def","Speed","Total"], xStat,   v => { xStat   = v; draw(); });
  addDropdown(b.x + 120, b.y + 52, "Y:",     ["HP","Attack","Defense","Sp_Atk","Sp_Def","Speed","Total"], yStat,   v => { yStat   = v; draw(); });
  addDropdown(b.x + 226, b.y + 52, "Color:", ["Type_1","Generation","isLegendary"],                       colorBy, v => { colorBy = v; draw(); });

  //gridlines
  g.append("g").attr("class","axis").attr("opacity",0.15)
   .call(d3.axisLeft(y).tickSize(-iW).tickFormat(""));

  //x-axis
  g.append("g").attr("class","axis").attr("transform",`translate(0,${iH})`)
   .call(d3.axisBottom(x).ticks(6));
  //y-axis
  g.append("g").attr("class","axis").call(d3.axisLeft(y).ticks(6));

  //axis labels
  g.append("text").attr("class","axis-label").attr("text-anchor","middle")
   .attr("x", iW/2).attr("y", iH + 42).text(xStat);
  g.append("text").attr("class","axis-label").attr("text-anchor","middle")
   .attr("transform","rotate(-90)").attr("x", -iH/2).attr("y", -42).text(yStat);

  const hasFocus = brushedNums.size > 0 || selectedName;

  //dots — start at bottom and animate up (viz-change animated transition)
  g.selectAll(".dot").data(data, d => d.number).enter()
    .append("circle")
      .attr("class", d => {
        const focused = brushedNums.has(d.number) || d.name === selectedName;
        return "dot" + (hasFocus && !focused ? " dimmed" : "") + (focused ? " focused" : "");
      })
      .attr("cx", d => x(getStat(d, xStat)))
      .attr("cy", iH)
      .attr("r",  0)
      .attr("fill", d => dotColor(d))
      .attr("opacity", 0.8)
      .on("click", d => {
        //selection interaction — click one dot to focus it across all views
        brushedNums  = new Set();
        selectedName = (selectedName === d.name) ? null : d.name;
        draw();
      })
    .append("title")
      .text(d => `${d.name} (${d.type})\n${xStat} ${getStat(d,xStat)}  ${yStat} ${getStat(d,yStat)}  Total ${d.total}`);

  //animate dots flying to real y position (viz-change animated transition)
  g.selectAll(".dot")
    .transition().duration(600).ease(d3.easeCubicOut)
      .attr("cy", d => y(getStat(d, yStat)))
      .attr("r",  d => d.legendary ? 6 : 3.5);

  //brushing interaction — drag a rectangle to send a subset to other views
  g.append("g").attr("class","brush")
   .call(d3.brush()
     .extent([[0,0],[iW,iH]])
     .on("end", function() {
       const sel = d3.event.selection;
       if (!sel) {
         brushedNums  = new Set();
         selectedName = null;
       } else {
         const [[x0,y0],[x1,y1]] = sel;
         brushedNums = new Set(
           data.filter(d => {
             const cx = x(getStat(d, xStat));
             const cy = y(getStat(d, yStat));
             return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
           }).map(d => d.number)
         );
         selectedName = null;
       }
       draw();
     })
   );

  drawColorLegend(b, data);
}

//Parallel coordinates
function drawParallel(b, data) {
  panel(b);

  const m  = { top: 52, right: 28, bottom: 32, left: 28 };
  const iW = b.w - m.left - m.right;
  const iH = b.h - m.top  - m.bottom;

  //one y-scale per stat — domain from full dataset so axes stay stable
  const yScales = {};
  stats.forEach(stat => {
    yScales[stat] = d3.scaleLinear()
      .domain(d3.extent(pokemon, d => getStat(d, stat))).nice()
      .range([iH, 0]);
  });

  const x    = d3.scalePoint().domain(stats).range([0, iW]).padding(0.3);
  const line = d3.line();

  const g = svg.append("g").attr("transform", `translate(${b.x + m.left},${b.y + m.top})`);

  svg.append("text").attr("class","title")
     .attr("x", b.x + 14).attr("y", b.y + 22).text("Focus: six-stat profile (parallel coordinates)");
  svg.append("text").attr("class","subtitle")
     .attr("x", b.x + 14).attr("y", b.y + 38)
     .text(`${data.length} Pokémon: lines animate in from brush selection`);

  //lines start flat at bottom, animate up to real stat values (filtering transition)
  g.selectAll(".pc-line").data(data, d => d.number).enter()
    .append("path")
      .attr("class","pc-line")
      .attr("stroke", d => typeColors[d.type] || "#68778d")
      .attr("opacity", 0)
      .attr("d", d => line(stats.map(s => [x(s), iH])))
    .transition().duration(750).ease(d3.easeCubicOut)
      .attr("opacity", 0.4)
      .attr("d", d => line(stats.map(s => [x(s), yScales[s](getStat(d, s))])));

  //tooltips on lines
  g.selectAll(".pc-line").append("title")
   .text(d => `${d.name} (${d.type})\nHP ${d.hp} Atk ${d.attack} Def ${d.defense} SpA ${d.spAtk} SpD ${d.spDef} Spd ${d.speed}`);

  //one vertical axis per stat
  stats.forEach(stat => {
    const ag = g.append("g").attr("transform", `translate(${x(stat)},0)`);
    ag.append("g").attr("class","axis").call(d3.axisLeft(yScales[stat]).ticks(4));
    ag.append("text").attr("class","axis-label").attr("text-anchor","middle")
      .attr("y", iH + 22).text(stat.replace("Sp_Atk","Sp.Atk").replace("Sp_Def","Sp.Def"));
  });
}

//Bar chart
function drawBar(b, data) {
  panel(b);

  const m  = { top: 52, right: 48, bottom: 32, left: 68 };
  const iW = b.w - m.left - m.right;
  const iH = b.h - m.top  - m.bottom;

  //average barStat per type, sorted descending (ordering transition on data change)
  const byType = d3.nest()
    .key(d => d.type)
    .rollup(rows => d3.mean(rows, d => getStat(d, barStat)))
    .entries(data)
    .sort((a,b) => b.value - a.value);

  const xSc = d3.scaleLinear().domain([0, d3.max(byType, d => d.value) * 1.08]).nice().range([0, iW]);
  const ySc = d3.scaleBand().domain(byType.map(d => d.key)).range([0, iH]).padding(0.25);

  const g = svg.append("g").attr("transform", `translate(${b.x + m.left},${b.y + m.top})`);

  svg.append("text").attr("class","title")
     .attr("x", b.x + 14).attr("y", b.y + 22).text("Average stat by type (focused subset)");
  svg.append("text").attr("class","subtitle")
     .attr("x", b.x + 14).attr("y", b.y + 38).text("Updates with brush, Dropdown changes stat");

  //stat dropdown
  addDropdown(b.x + b.w - 160, b.y + 30, "Stat:",
    ["Total","HP","Attack","Defense","Sp_Atk","Sp_Def","Speed"],
    barStat, v => { barStat = v; draw(); });

  //x-axis
  g.append("g").attr("class","axis").attr("transform",`translate(0,${iH})`)
   .call(d3.axisBottom(xSc).ticks(5));
  //y-axis
  g.append("g").attr("class","axis").call(d3.axisLeft(ySc).tickSizeOuter(0));

  //x axis label
  g.append("text").attr("class","axis-label").attr("text-anchor","middle")
   .attr("x", iW/2).attr("y", iH + 28).text(`Avg ${barStat}`);

  //bars start at width 0, animate to value (filtering + viz-change transition)
  g.selectAll(".bar").data(byType, d => d.key).enter()
    .append("rect")
      .attr("class","bar")
      .attr("y",      d => ySc(d.key))
      .attr("height", ySc.bandwidth())
      .attr("x", 0)
      .attr("width", 0)
      .attr("fill", d => typeColors[d.key] || "#aaa")
      .attr("opacity", 0.82)
      .on("mouseover", function() { d3.select(this).attr("opacity", 1); })
      .on("mouseout",  function() { d3.select(this).attr("opacity", 0.82); })
    .append("title").text(d => `${d.key}: avg ${barStat} ${d.value.toFixed(1)}`);

  g.selectAll(".bar")
    .transition().duration(500).ease(d3.easeQuadOut)
      .attr("width", d => xSc(d.value));

  //value labels
  g.selectAll(".bar-label").data(byType, d => d.key).enter()
    .append("text")
      .attr("class","legend-label")
      .attr("y", d => ySc(d.key) + ySc.bandwidth()/2 + 3.5)
      .attr("x", 2).attr("opacity", 0)
    .transition().duration(500).ease(d3.easeQuadOut)
      .attr("x", d => xSc(d.value) + 4)
      .attr("opacity", 1)
      .text(d => d.value.toFixed(1));
}


function addDropdown(x, y, label, options, current, onChange) {
  const fo  = svg.append("foreignObject").attr("x", x).attr("y", y).attr("width", 100).attr("height", 22);
  const div = fo.append("xhtml:div").style("display","flex").style("align-items","center").style("gap","3px");
  div.append("xhtml:span")
     .style("font-size","10px").style("color","#7b8194").style("white-space","nowrap")
     .text(label);
  const sel = div.append("xhtml:select")
    .style("background","#111827").style("color","#e2e8f0")
    .style("border","1px solid #2e3448").style("border-radius","3px")
    .style("font-size","10px").style("padding","1px 3px").style("cursor","pointer")
    .on("change", function() { onChange(this.value); });
  options.forEach(opt => {
    sel.append("xhtml:option").attr("value", opt)
       .attr("selected", opt === current ? true : null)
       .text(opt.replace("Sp_Atk","Sp.Atk").replace("Sp_Def","Sp.Def").replace("isLegendary","Legendary"));
  });
}

//color legend below scatter — changes based on colorBy setting
function drawColorLegend(b, data) {
  let entries = [];
  if (colorBy === "Type_1") {
    entries = Object.keys(typeColors).filter(t => data.some(d => d.type === t)).map(t => [t, typeColors[t]]);
  } else if (colorBy === "Generation") {
    entries = ["1","2","3","4","5","6"].map(g => [`Gen ${g}`, genColor(g)]);
  } else {
    entries = [["Legendary","#f5a623"],["Not Legendary","#4a5080"]];
  }
  const legendY = b.y + b.h - 14;
  entries.forEach(([label, color], i) => {
    const lx = b.x + 14 + i * 82;
    svg.append("rect").attr("x", lx).attr("y", legendY - 10).attr("width",10).attr("height",10).attr("fill", color);
    svg.append("text").attr("class","legend-label").attr("x", lx + 13).attr("y", legendY).text(label);
  });
}