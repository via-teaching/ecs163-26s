//shared colors across all three charts
const TEAL   = "#3aab8c";
const ROSE   = "#e05c6f";
const AMBER  = "#e8a020";
const VIOLET = "#7c63d4";
const SKY    = "#2c7bb6";
const MUTED  = "#888";
const BORDER = "#ddd";

const CONDITION_COLOR = {
  Depression:     ROSE,
  Anxiety:        AMBER,
  "Panic attack": VIOLET,
};

//global state tracks which years are brushed and which students are selected
let brushedYears = null;      //null means all years selected
let selectedIds  = new Set(); //set of student indices that are clicked/selected
let allData      = [];        //full cleaned dataset

//tooltip reused by all charts
const tooltip = d3.select("#tooltip");
function showTip(event, html) {
  tooltip.style("opacity", 1).html(html)
    .style("left", (event.clientX + 14) + "px")
    .style("top",  (event.clientY - 10) + "px");
}
function hideTip() { tooltip.style("opacity", 0); }

//cgpa range string -> midpoint number
function cgpaMid(s) {
  const clean = (s || "").trim();
  if (!clean) return null;
  const parts = clean.split("-").map(x => parseFloat(x.trim()));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return (parts[0]+parts[1])/2;
  const v = parseFloat(clean);
  return isNaN(v) ? null : v;
}

//normalize year strings
function normYear(raw) {
  const s = (raw || "").toLowerCase().trim();
  if (s.includes("1")) return "Year 1";
  if (s.includes("2")) return "Year 2";
  if (s.includes("3")) return "Year 3";
  if (s.includes("4")) return "Year 4";
  return "Other";
}

function isYes(val) { return (val || "").toLowerCase().trim() === "yes"; }

function normGender(raw) {
  const s = (raw || "").toLowerCase().trim();
  if (s === "male"   || s === "m") return "Male";
  if (s === "female" || s === "f") return "Female";
  return "Other";
}

//returns the currently active subset of data based on brush + selection
function getActiveData() {
  let subset = allData;
  //apply year brush filter
  if (brushedYears && brushedYears.length > 0) {
    subset = subset.filter(d => brushedYears.includes(d.year));
  }
  //if any students are selected in parallel coords, further filter to those
  if (selectedIds.size > 0) {
    subset = subset.filter(d => selectedIds.has(d.id));
  }
  return subset;
}

//load csv and kick off all three charts
d3.csv("data/student_mental_health.csv").then(rawData => {

  //clean each row and assign an id for tracking selection
  allData = rawData.map((d, i) => ({
    id:         i,
    gender:     normGender(d["Choose your gender"]),
    year:       normYear(d["Your current year of Study"]),
    cgpa:       cgpaMid(d["What is your CGPA?"]),
    depression: isYes(d["Do you have Depression?"]),
    anxiety:    isYes(d["Do you have Anxiety?"]),
    panic:      isYes(d["Do you have Panic attack?"]),
    treatment:  isYes(d["Did you seek any specialist for a treatment?"]),
  })).filter(d => d.cgpa !== null);

  d3.select("#student-count").text(`n = ${allData.length} students`);
  d3.select("#loading").style("display", "none");

  //reset button clears brush and selection and redraws everything
  d3.select("#reset-btn").on("click", () => {
    brushedYears = null;
    selectedIds.clear();
    //clear the brush visually by calling brush.clear
    d3.select("#svg-bar").select(".brush").call(barBrush.move, null);
    updateParallelHighlight();
    updateSankey();
    d3.select("#student-count").text(`n = ${allData.length} students`);
  });

  setTimeout(() => {
    drawBarChart(allData);
    drawParallelCoords(allData);
    drawSankey(allData);
  }, 100);

}).catch(err => {
  d3.select("#loading").html(`<p style="color:red">couldn't load data/student_mental_health.csv</p>`);
  console.error(err);
});


// view 1: grouped bar chart with d3-brush (overview/context)
//brush selects a range of years; other views update to show only those years
//context view, start here to pick a subset of the data
let barBrush; //exposed so reset button can clear it

function drawBarChart(data) {
  const svgEl = document.getElementById("svg-bar");
  const rect  = svgEl.getBoundingClientRect();
  const W = rect.width  || 500;
  const H = rect.height || 300;

  const margin = { top: 28, right: 115, bottom: 48, left: 44 };
  const w = W - margin.left - margin.right;
  const h = H - margin.top  - margin.bottom;

  const svg = d3.select("#svg-bar")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const years      = ["Year 1","Year 2","Year 3","Year 4"];
  const conditions = ["Depression","Anxiety","Panic attack"];
  const condKeys   = ["depression","anxiety","panic"];

  //build (year, condition, count) data
  const barData = [];
  years.forEach(yr => {
    const group = data.filter(d => d.year === yr);
    conditions.forEach((cond, i) => {
      barData.push({
        year:  yr, condition: cond,
        count: group.filter(d => d[condKeys[i]]).length,
        total: group.length,
      });
    });
  });

  //outer scale: years; inner scale: conditions
  const x0 = d3.scaleBand().domain(years).range([0, w]).padding(0.28);
  const x1 = d3.scaleBand().domain(conditions).range([0, x0.bandwidth()]).padding(0.08);
  const maxCount = d3.max(barData, d => d.count);
  const y = d3.scaleLinear().domain([0, maxCount + 2]).nice().range([h, 0]);

  //x and y axes
  svg.append("g").attr("class", "axis").attr("transform", `translate(0,${h})`)
    .call(d3.axisBottom(x0).tickSize(0))
    .call(g => g.select(".domain").remove());

  svg.append("g").attr("class", "axis")
    .call(d3.axisLeft(y).ticks(5).tickSize(-w))
    .call(g => {
      g.select(".domain").remove();
      g.selectAll("line").attr("stroke", BORDER).attr("stroke-dasharray","3,3");
    });

  //axis labels
  svg.append("text").attr("class","axis-label")
    .attr("x", w/2).attr("y", h+38).attr("text-anchor","middle").text("Year of Study");
  svg.append("text").attr("class","axis-label")
    .attr("transform","rotate(-90)").attr("x",-h/2).attr("y",-34)
    .attr("text-anchor","middle").text("Number of Students");

  //draw bars grouped by year
  const yearGroups = svg.selectAll(".year-group").data(years).join("g")
    .attr("class","year-group")
    .attr("transform", d => `translate(${x0(d)},0)`);

  yearGroups.selectAll("rect")
    .data(yr => barData.filter(d => d.year === yr))
    .join("rect")
      .attr("x", d => x1(d.condition))
      .attr("y", d => y(d.count))
      .attr("width", x1.bandwidth())
      .attr("height", d => h - y(d.count))
      .attr("fill", d => CONDITION_COLOR[d.condition])
      .attr("rx", 3).attr("opacity", 0.85)
      .on("mouseover", (event, d) => showTip(event,
        `<strong>${d.condition}</strong> — ${d.year}<br>${d.count} of ${d.total} students (${Math.round(100*d.count/d.total)}%)`))
      .on("mousemove", event => tooltip.style("left",(event.clientX+14)+"px").style("top",(event.clientY-10)+"px"))
      .on("mouseout", hideTip);

  //legend
  const legend = svg.append("g").attr("transform", `translate(${w+14},16)`);
  conditions.forEach((cond, i) => {
    const row = legend.append("g").attr("transform", `translate(0,${i*22})`);
    row.append("rect").attr("width",11).attr("height",11).attr("rx",2).attr("fill",CONDITION_COLOR[cond]);
    row.append("text").attr("x",15).attr("y",9).attr("fill","#333").attr("font-size",10)
      .attr("font-family","Arial,sans-serif").text(cond);
  });

  //d3 brush on the x axis
  //the brush covers the full chart area; when released, we figure out which
  //years fall inside the selected x range and update the other views
  barBrush = d3.brushX()
    .extent([[0, 0], [w, h]])
    .on("end", function(event) {
      if (!event.selection) {
        //brush cleared, show all years
        brushedYears = null;
      } else {
        const [x0val, x1val] = event.selection;
        //need at least a drag to count as a real brush (not a click)
        if (x1val - x0val < 5) {
          brushedYears = null;
          d3.select(this).call(barBrush.move, null);
        } else {
          //check which year band centers fall inside the brush range
          brushedYears = years.filter(yr => {
            const center = x0(yr) + x0.bandwidth() / 2;
            return center >= x0val && center <= x1val;
          });
          if (brushedYears.length === 0) brushedYears = null;
        }
      }
      //clear selection when brush changes, keeps things clean
      selectedIds.clear();
      updateParallelHighlight();
      //fade sankey out then redraw so animation is visible
      d3.select("#svg-sankey").transition().duration(200)
        .style("opacity", 0)
        .on("end", () => { d3.select("#svg-sankey").style("opacity",1); updateSankey(); });
      const active = getActiveData();
      d3.select("#student-count").text(`n = ${active.length} students (filtered)`);
    });

  //attach brush to svg, placed below bars so bars stay clickable
  svg.append("g").attr("class","brush").call(barBrush);
}


//view 2: parallel coordinates with click-to-select (advanced/focus)
//each line is one student; click to select/deselect individuals
//selected students are highlighted and the sankey updates to reflect them
let parallelPaths; //reference to the path elements so we can update highlights

function drawParallelCoords(data) {
  const svgEl = document.getElementById("svg-parallel");
  const rect  = svgEl.getBoundingClientRect();
  const W = rect.width  || 700;
  const H = rect.height || 300;

  const margin = { top: 36, right: 80, bottom: 28, left: 50 };
  const w = W - margin.left - margin.right;
  const h = H - margin.top  - margin.bottom;

  const svg = d3.select("#svg-parallel")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  //axis definitions, type determines what scale to use
  const axes = [
    { key: "gender",     label: "Gender",      type: "cat",  domain: ["Male","Female","Other"] },
    { key: "year",       label: "Year",        type: "cat",  domain: ["Year 1","Year 2","Year 3","Year 4"] },
    { key: "cgpa",       label: "CGPA",        type: "num",  domain: [2.0, 4.0] },
    { key: "depression", label: "Depression",  type: "bool" },
    { key: "anxiety",    label: "Anxiety",     type: "bool" },
    { key: "panic",      label: "Panic Attack",type: "bool" },
    { key: "treatment",  label: "Treatment",   type: "bool" },
  ];

  //build a scale for each axis
  axes.forEach(ax => {
    if (ax.type === "cat")  ax.scale = d3.scalePoint().domain(ax.domain).range([h,0]).padding(0.3);
    else if (ax.type === "num") ax.scale = d3.scaleLinear().domain(ax.domain).range([h,0]);
    else ax.scale = d3.scalePoint().domain(["No","Yes"]).range([h,0]).padding(0.4);
  });

  //evenly space axes horizontally
  const xScale = d3.scalePoint().domain(axes.map(a=>a.key)).range([0,w]).padding(0.1);

  //get pixel y for a student row on a given axis
  function yPos(ax, row) {
    const val = row[ax.key];
    if (ax.type === "bool") return ax.scale(val ? "Yes" : "No");
    if (ax.type === "cat")  return ax.scale(val) ?? h/2;
    return ax.scale(+val);
  }

  //build svg path string for one student
  function lineFor(row) {
    return d3.line()(axes.map(ax => [xScale(ax.key), yPos(ax, row)]));
  }

  //sort so depressed students draw on top
  const sorted = [...data].sort((a,b) => a.depression - b.depression);

  //draw lines, one per student
  //store reference so updateParallelHighlight can re-style them
  parallelPaths = svg.append("g").attr("class","lines")
    .selectAll("path")
    .data(sorted)
    .join("path")
      .attr("d", lineFor)
      .attr("fill", "none")
      .attr("stroke", d => d.depression ? ROSE : TEAL)
      .attr("stroke-width", 1)
      .attr("opacity", 0.22)
      .attr("cursor", "pointer")
      //selection interaction 
      //clicking a line toggles it in the selectedIds set
      //then the sankey and highlight both update with animation
      .on("click", function(event, d) {
        if (selectedIds.has(d.id)) {
          selectedIds.delete(d.id); //deselect if already selected
        } else {
          selectedIds.add(d.id);    //add to selection
        }
        updateParallelHighlight();
        updateSankey();
        const active = getActiveData();
        d3.select("#student-count").text(
          selectedIds.size > 0
            ? `${selectedIds.size} students selected`
            : `n = ${active.length} students`
        );
      })
      .on("mouseover", function(event, d) {
        //only highlight on hover if not already selected
        if (!selectedIds.has(d.id)) {
          d3.select(this).raise().attr("opacity", 0.8).attr("stroke-width", 1.5);
        }
        showTip(event,
          `<strong>Gender:</strong> ${d.gender}<br>
           <strong>Year:</strong> ${d.year}<br>
           <strong>CGPA:</strong> ${d.cgpa.toFixed(2)}<br>
           <strong>Depression:</strong> ${d.depression?"Yes":"No"}<br>
           <strong>Anxiety:</strong> ${d.anxiety?"Yes":"No"}<br>
           <strong>Panic:</strong> ${d.panic?"Yes":"No"}<br>
           <strong>Treatment:</strong> ${d.treatment?"Yes":"No"}<br>
           <em style="color:#4477aa">click to select</em>`);
      })
      .on("mousemove", event => tooltip.style("left",(event.clientX+14)+"px").style("top",(event.clientY-10)+"px"))
      .on("mouseout", function(event, d) {
        if (!selectedIds.has(d.id)) {
          d3.select(this).attr("opacity", 0.22).attr("stroke-width", 1);
        }
        hideTip();
      });

  //draw a vertical axis line and ticks for each dimension
  axes.forEach(ax => {
    const x = xScale(ax.key);
    const g = svg.append("g").attr("class","axis para-axis")
      .attr("transform", `translate(${x},0)`);

    //vertical axis line
    g.append("line").attr("y1",0).attr("y2",h).attr("stroke",BORDER).attr("stroke-width",1.5);

    if (ax.type === "num") {
      //numeric: use d3 axis
      g.call(d3.axisLeft(ax.scale).ticks(4).tickSize(4))
        .call(gg => gg.select(".domain").remove());
    } else {
      //categorical/boolean: manual tick marks and labels
      ax.scale.domain().forEach(val => {
        const yv = ax.scale(val);
        g.append("line").attr("x1",-4).attr("x2",4).attr("y1",yv).attr("y2",yv).attr("stroke",MUTED);
        g.append("text").attr("x",-8).attr("y",yv).attr("dy","0.35em")
          .attr("text-anchor","end").attr("fill",MUTED).attr("font-size",9)
          .attr("font-family","Arial,sans-serif").text(val);
      });
    }

    //axis label above
    g.append("text").attr("y",-10).attr("text-anchor","middle")
      .attr("fill","#333").attr("font-size",10)
      .attr("font-family","Arial,sans-serif").attr("font-weight","bold")
      .text(ax.label);
  });

  //legend: line color meaning
  const lg = svg.append("g").attr("transform",`translate(${w-160},${h+10})`);
  [["Depression: Yes",ROSE],["Depression: No",TEAL]].forEach(([label,color],i) => {
    const row = lg.append("g").attr("transform",`translate(${i*130},0)`);
    row.append("line").attr("x1",0).attr("x2",18).attr("y1",5).attr("y2",5)
      .attr("stroke",color).attr("stroke-width",2);
    row.append("text").attr("x",22).attr("y",9).attr("fill","#333")
      .attr("font-size",10).attr("font-family","Arial,sans-serif").text(label);
  });
}

//re-style parallel coord lines based on current selection state
//uses a smooth opacity transition so changes aren't jarring
function updateParallelHighlight() {
  if (!parallelPaths) return;

  parallelPaths
    .transition().duration(300).ease(d3.easeCubicInOut) // smooth fade transition
    .attr("opacity", d => {
      //if nothing selected, show all at normal opacity
      if (selectedIds.size === 0) return 0.22;
      //selected lines are fully highlighted, others fade out
      return selectedIds.has(d.id) ? 0.9 : 0.06;
    })
    .attr("stroke-width", d => selectedIds.has(d.id) ? 2 : 1);
}


//view 3: sankey diagram (advanced/focus)
//redraws whenever brush or selection changes, with animated filtering transition
//ribbon widths resize smoothly to reflect the new subset of students
function drawSankey(data) {
  //initial draw with all data
  renderSankey(data);
}

//updateSankey is called whenever brush or selection changes
//it figures out the active subset and re-renders the sankey with animation
function updateSankey() {
  const active = getActiveData();
  renderSankey(active);
}

//renders (or re-renders) the sankey for a given subset of data
//clears and redraws, transitions are applied to the path and rect elements
function renderSankey(data) {
  const svgEl = document.getElementById("svg-sankey");
  const rect  = svgEl.getBoundingClientRect();
  const W = rect.width  || 900;
  const H = rect.height || 200;

  const margin = { top: 20, right: 170, bottom: 10, left: 170 };
  const w = W - margin.left - margin.right;
  const h = H - margin.top  - margin.bottom;

  //clear previous render before redrawing
  d3.select("#svg-sankey").selectAll("*").remove();

  const svg = d3.select("#svg-sankey").append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  //show a message if no data matches the current filter
  if (data.length === 0) {
    svg.append("text")
      .attr("x", w/2).attr("y", h/2)
      .attr("text-anchor","middle").attr("fill",MUTED)
      .attr("font-size",13).attr("font-family","Arial,sans-serif")
      .text("No students match the current selection.");
    return;
  }

  //bucket each student by number of conditions
  function condLabel(d) {
    const count = [d.depression,d.anxiety,d.panic].filter(Boolean).length;
    if (count===0) return "No Condition";
    if (count===1) return "1 Condition";
    if (count===2) return "2 Conditions";
    return "3 Conditions";
  }

  //count flows between node pairs
  const flowMap = {};
  const incFlow = (src,tgt) => { const k=`${src}|||${tgt}`; flowMap[k]=(flowMap[k]||0)+1; };
  data.forEach(d => {
    const g   = d.gender==="Other" ? "Female" : d.gender;
    const cond = condLabel(d);
    const tx   = d.treatment ? "Sought Treatment" : "No Treatment";
    incFlow(g, cond);
    incFlow(cond, tx);
  });

  const col0 = ["Male","Female"];
  const col1 = ["No Condition","1 Condition","2 Conditions","3 Conditions"];
  const col2 = ["Sought Treatment","No Treatment"];
  const allNodes = [...col0,...col1,...col2];

  //count students through each node
  const nodeTotal = {};
  allNodes.forEach(n => { nodeTotal[n]=0; });
  Object.entries(flowMap).forEach(([key,val]) => {
    const [src,tgt] = key.split("|||");
    nodeTotal[tgt] = (nodeTotal[tgt]||0) + val;
    if (!nodeTotal[src]) nodeTotal[src]=0;
  });
  col0.forEach(n => {
    nodeTotal[n] = data.filter(d => (d.gender==="Other"?"Female":d.gender)===n).length;
  });

  const total = data.length;
  const PAD   = 6;

  //lay out nodes vertically in a column
  function layoutCol(nodes, xPos) {
    const totalH = h - PAD*(nodes.length-1);
    let yOff = 0;
    return nodes.map(name => {
      const barH = Math.max(4, (nodeTotal[name]/total)*totalH);
      const entry = { name, x:xPos, y:yOff, barH };
      yOff += barH + PAD;
      return entry;
    });
  }

  const NODE_W = 12;
  const nodes0 = layoutCol(col0, 0);
  const nodes1 = layoutCol(col1, w*0.42);
  const nodes2 = layoutCol(col2, w);
  const nodeMap = {};
  [...nodes0,...nodes1,...nodes2].forEach(n => { nodeMap[n.name]=n; });

  //offsets to stack ribbons within each node
  const nodeRightOff = {};
  const nodeLeftOff  = {};
  allNodes.forEach(n => { nodeRightOff[n]=0; nodeLeftOff[n]=0; });

  const nodeColor = {
    "Male":SKY,"Female":ROSE,
    "No Condition":TEAL,"1 Condition":AMBER,"2 Conditions":VIOLET,"3 Conditions":ROSE,
    "Sought Treatment":TEAL,"No Treatment":ROSE,
  };

  //sort links largest first for cleaner ribbon stacking
  const links = Object.entries(flowMap)
    .map(([key,value]) => { const [source,target]=key.split("|||"); return {source,target,value}; })
    .sort((a,b)=>b.value-a.value);

  //draw ribbons with a fade-in transition (filtering animation)
  links.forEach(link => {
    const src = nodeMap[link.source];
    const tgt = nodeMap[link.target];
    if (!src||!tgt) return;

    const ribbonH = (link.value/total)*h;
    const sy0 = src.y + nodeRightOff[link.source];
    const sy1 = sy0 + ribbonH;
    const ty0 = tgt.y + nodeLeftOff[link.target];
    const ty1 = ty0 + ribbonH;
    nodeRightOff[link.source] += ribbonH;
    nodeLeftOff[link.target]  += ribbonH;

    const srcX = src.x + NODE_W;
    const tgtX = tgt.x;
    const cpX  = (srcX+tgtX)/2;

    //cubic bezier ribbon path
    const path = [
      `M ${srcX} ${sy0}`,
      `C ${cpX} ${sy0}, ${cpX} ${ty0}, ${tgtX} ${ty0}`,
      `L ${tgtX} ${ty1}`,
      `C ${cpX} ${ty1}, ${cpX} ${sy1}, ${srcX} ${sy1}`,
      `Z`,
    ].join(" ");

    //filtering animation
    //ribbons start transparent and fade in which is consistent with the parallel
    //coords fade used in updateParallelHighlight (same semantic operation)
    svg.append("path")
      .attr("d", path)
      .attr("fill", nodeColor[link.source]||MUTED)
      .attr("opacity", 0)       // start invisible
      .attr("stroke","none")
      .transition().duration(400).ease(d3.easeCubicInOut)
      .attr("opacity", 0.32)    // fade in to final opacity
      .selection()
      .on("mouseover", function(event) {
        d3.select(this).attr("opacity",0.62);
        showTip(event,`<strong>${link.source}</strong> → <strong>${link.target}</strong><br>${link.value} students`);
      })
      .on("mousemove", event => tooltip.style("left",(event.clientX+14)+"px").style("top",(event.clientY-10)+"px"))
      .on("mouseout", function() { d3.select(this).attr("opacity",0.32); hideTip(); });
  });

  //draw node rectangles, also fade in for consistency
  [...nodes0,...nodes1,...nodes2].forEach(n => {
    svg.append("rect")
      .attr("x",n.x).attr("y",n.y)
      .attr("width",NODE_W).attr("height",n.barH)
      .attr("fill",nodeColor[n.name]||MUTED).attr("rx",2)
      .attr("opacity",0)
      .transition().duration(400).ease(d3.easeCubicInOut)
      .attr("opacity",1);

    //label on left side for gender nodes, right side for all others
    const isLeft = col0.includes(n.name);
    svg.append("text")
      .attr("x", isLeft ? n.x-6 : n.x+NODE_W+6)
      .attr("y", n.y+n.barH/2).attr("dy","0.35em")
      .attr("text-anchor", isLeft?"end":"start")
      .attr("fill","#333").attr("font-size",10)
      .attr("font-family","Arial,sans-serif")
      .attr("opacity",0)
      .transition().duration(400).ease(d3.easeCubicInOut)
      .attr("opacity",1)
      .selection().text(`${n.name} (${nodeTotal[n.name]})`);
  });

  //column header labels
  [
    { label:"GENDER",       x:0+NODE_W/2 },
    { label:"# CONDITIONS", x:w*0.42+NODE_W/2 },
    { label:"TREATMENT",    x:w+NODE_W/2 },
  ].forEach(({label,x}) => {
    svg.append("text")
      .attr("x",x).attr("y",-8).attr("text-anchor","middle")
      .attr("fill",MUTED).attr("font-size",10)
      .attr("font-family","Arial,sans-serif").attr("font-weight","bold")
      .attr("letter-spacing",1).text(label);
  });
}