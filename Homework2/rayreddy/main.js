//colors i'm using across all three charts so they stay consistent
const TEAL   = "#3aab8c";
const ROSE   = "#e05c6f";
const AMBER  = "#e8a020";
const VIOLET = "#7c63d4";
const SKY    = "#2c7bb6";
const MUTED  = "#888888";
const BORDER = "#dddddd";
 
//map each condition to its color
const CONDITION_COLOR = {
  Depression:     ROSE,
  Anxiety:        AMBER,
  "Panic attack": VIOLET,
};
 
//tooltip element thats reused by all three charts
const tooltip = d3.select("#tooltip");
 
//show tooltip near cursor with custom html
function showTip(event, html) {
  tooltip
    .style("opacity", 1)
    .html(html)
    .style("left", (event.clientX + 14) + "px")
    .style("top",  (event.clientY - 10) + "px");
}
 
//hide tooltip on mouseout
function hideTip() {
  tooltip.style("opacity", 0);
}
 
//cgpa in the dataset is a range like 3.50 - 4.00, so i take the midpoint
function cgpaMid(cgpaStr) {
  const clean = (cgpaStr || "").trim();
  if (!clean) return null;
  const parts = clean.split("-").map(s => parseFloat(s.trim()));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return (parts[0] + parts[1]) / 2;
  }
  const single = parseFloat(clean);
  return isNaN(single) ? null : single;
}
 
//normalize year of study, dataset is inconsistent with capitalization
function normYear(raw) {
  const s = (raw || "").toLowerCase().trim();
  if (s.includes("1")) return "Year 1";
  if (s.includes("2")) return "Year 2";
  if (s.includes("3")) return "Year 3";
  if (s.includes("4")) return "Year 4";
  return "Other";
}
 
//convert yes/no strings to boolean
function isYes(val) {
  return (val || "").toLowerCase().trim() === "yes";
}
 
//normalize gender values
function normGender(raw) {
  const s = (raw || "").toLowerCase().trim();
  if (s === "male"   || s === "m") return "Male";
  if (s === "female" || s === "f") return "Female";
  return "Other";
}
 
//load the csv, clean it, then draw all three charts
d3.csv("data/student_mental_health.csv").then(rawData => {
 
  // map each row to only the fields i need
  const data = rawData.map(d => ({
    gender:     normGender(d["Choose your gender"]),
    year:       normYear(d["Your current year of Study"]),
    cgpa:       cgpaMid(d["What is your CGPA?"]),
    depression: isYes(d["Do you have Depression?"]),
    anxiety:    isYes(d["Do you have Anxiety?"]),
    panic:      isYes(d["Do you have Panic attack?"]),
    treatment:  isYes(d["Did you seek any specialist for a treatment?"]),
  })).filter(d => d.cgpa !== null); // drop rows with missing cgpa
 
  //show student count in the header
  d3.select("#student-count").text(`n = ${data.length} students`);
 
  //hide the loading spinner
  d3.select("#loading").style("display", "none");
 
  //small delay so the grid has time to layout before we read dimensions
  setTimeout(() => {
    drawBarChart(data);
    drawParallelCoords(data);
    drawSankey(data);
  }, 100);
 
}).catch(err => {
  //if csv fails to load, show error message instead of spinner
  d3.select("#loading")
    .html(`<p style="color:#fb7185">couldn't load data/student_mental_health.csv<br>
      <small>make sure the csv is in the data/ folder</small></p>`);
  console.error(err);
});
 
 
//view 1: grouped bar chart (overview/context)
//shows how many students in each year report depression, anxiety, panic attack
//this is the overview, gives a broad picture before diving into the other views
function drawBarChart(data) {
  const svgEl = document.getElementById("svg-bar");
  const rect  = svgEl.getBoundingClientRect();
  const W = rect.width  || svgEl.parentElement.getBoundingClientRect().width  || 500;
  const H = rect.height || svgEl.parentElement.getBoundingClientRect().height || 300;
 
  //margins to make room for axes and the legend on the right
  const margin = { top: 28, right: 115, bottom: 48, left: 44 };
  const w = W - margin.left - margin.right;
  const h = H - margin.top  - margin.bottom;
 
  //main svg group shifted by margins
  const svg = d3.select("#svg-bar")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
 
  const years      = ["Year 1","Year 2","Year 3","Year 4"];
  const conditions = ["Depression","Anxiety","Panic attack"];
  const condKeys   = ["depression","anxiety","panic"];
 
  //build the data array: one entry per (year, condition) combo
  const barData = [];
  years.forEach(yr => {
    const group = data.filter(d => d.year === yr);
    conditions.forEach((cond, i) => {
      barData.push({
        year:      yr,
        condition: cond,
        count:     group.filter(d => d[condKeys[i]]).length,
        total:     group.length,
      });
    });
  });
 
  //outer x scale groups by year
  const x0 = d3.scaleBand()
    .domain(years)
    .range([0, w])
    .padding(0.28);
 
  //inner x scale separates the three conditions within each year group
  const x1 = d3.scaleBand()
    .domain(conditions)
    .range([0, x0.bandwidth()])
    .padding(0.08);
 
  //y scale based on max count across all bars
  const maxCount = d3.max(barData, d => d.count);
  const y = d3.scaleLinear()
    .domain([0, maxCount + 2])
    .nice()
    .range([h, 0]);
 
  //x axis at the bottom
  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${h})`)
    .call(d3.axisBottom(x0).tickSize(0))
    .call(g => g.select(".domain").remove());
 
  //y axis with subtle dashed grid lines
  svg.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(5).tickSize(-w))
    .call(g => {
      g.select(".domain").remove();
      g.selectAll("line").attr("stroke", BORDER).attr("stroke-dasharray","3,3");
    });
 
  //x axis label
  svg.append("text")
    .attr("class", "axis-label")
    .attr("x", w / 2)
    .attr("y", h + 38)
    .attr("text-anchor", "middle")
    .text("Year of Study");
 
  //y axis label (rotated)
  svg.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -h / 2)
    .attr("y", -34)
    .attr("text-anchor", "middle")
    .text("Number of Students");
 
  //create one group per year, then add bars inside each group
  const yearGroups = svg.selectAll(".year-group")
    .data(years)
    .join("g")
      .attr("class", "year-group")
      .attr("transform", d => `translate(${x0(d)},0)`);
 
  //draw individual bars, colored by condition
  yearGroups.selectAll("rect")
    .data(yr => barData.filter(d => d.year === yr))
    .join("rect")
      .attr("x",      d => x1(d.condition))
      .attr("y",      d => y(d.count))
      .attr("width",  x1.bandwidth())
      .attr("height", d => h - y(d.count))
      .attr("fill",   d => CONDITION_COLOR[d.condition])
      .attr("rx", 3)
      .attr("opacity", 0.85)
      .on("mouseover", (event, d) => {
        showTip(event,
          `<strong>${d.condition}</strong> — ${d.year}<br>
           ${d.count} of ${d.total} students (${Math.round(100*d.count/d.total)}%)`);
      })
      .on("mousemove", (event) => {
        tooltip.style("left", (event.clientX + 14) + "px").style("top", (event.clientY - 10) + "px");
      })
      .on("mouseout", hideTip);
 
  //legend placed to the right of the chart
  const legend = svg.append("g").attr("transform", `translate(${w + 14}, 16)`);
 
  conditions.forEach((cond, i) => {
    const row = legend.append("g").attr("transform", `translate(0,${i * 22})`);
    // colored swatch
    row.append("rect")
      .attr("width", 11).attr("height", 11).attr("rx", 2)
      .attr("fill", CONDITION_COLOR[cond]);
    // label text
    row.append("text")
      .attr("x", 15).attr("y", 9)
      .attr("fill", "#333").attr("font-size", 10)
      .attr("font-family", "DM Sans, sans-serif")
      .text(cond);
  });
}
 
 
//view 2: parallel coordinates (advanced/focus)
//each student is a line across 7 axes: gender, year, cgpa, depression,
//anxiety, panic attack, treatment. lines colored by depression status.
//this is a focus view that you can hover to see individual student details
function drawParallelCoords(data) {
  const svgEl = document.getElementById("svg-parallel");
  const rect  = svgEl.getBoundingClientRect();
  const W = rect.width  || svgEl.parentElement.getBoundingClientRect().width  || 700;
  const H = rect.height || svgEl.parentElement.getBoundingClientRect().height || 300;
 
  const margin = { top: 36, right: 80, bottom: 28, left: 50 };
  const w = W - margin.left - margin.right;
  const h = H - margin.top  - margin.bottom;
 
  const svg = d3.select("#svg-parallel")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
 
  //define each axis, type tells us how to scale it
  const axes = [
    { key: "gender",     label: "Gender",      type: "cat",  domain: ["Male","Female","Other"] },
    { key: "year",       label: "Year",        type: "cat",  domain: ["Year 1","Year 2","Year 3","Year 4"] },
    { key: "cgpa",       label: "CGPA",        type: "num",  domain: [2.0, 4.0] },
    { key: "depression", label: "Depression",  type: "bool" },
    { key: "anxiety",    label: "Anxiety",     type: "bool" },
    { key: "panic",      label: "Panic Attack",type: "bool" },
    { key: "treatment",  label: "Treatment",   type: "bool" },
  ];
 
  //assign a scale to each axis based on its type
  axes.forEach(ax => {
    if (ax.type === "cat") {
      ax.scale = d3.scalePoint().domain(ax.domain).range([h, 0]).padding(0.3);
    } else if (ax.type === "num") {
      ax.scale = d3.scaleLinear().domain(ax.domain).range([h, 0]);
    } else {
      // boolean axes just have yes/no
      ax.scale = d3.scalePoint().domain(["No","Yes"]).range([h, 0]).padding(0.4);
    }
  });
 
  //horizontal positions for each axis
  const xScale = d3.scalePoint()
    .domain(axes.map(a => a.key))
    .range([0, w])
    .padding(0.1);
 
  //get the y pixel position for a given row on a given axis
  function yPos(ax, row) {
    const val = row[ax.key];
    if (ax.type === "bool") return ax.scale(val ? "Yes" : "No");
    if (ax.type === "cat")  return ax.scale(val) ?? h / 2;
    return ax.scale(+val);
  }
 
  //build the path string for one student's line
  function lineFor(row) {
    return d3.line()(axes.map(ax => [xScale(ax.key), yPos(ax, row)]));
  }
 
  //sort so depressed students render on top
  const sorted = [...data].sort((a, b) => a.depression - b.depression);
 
  //draw one path per student
  svg.append("g").attr("class", "lines")
    .selectAll("path")
    .data(sorted)
    .join("path")
      .attr("d", lineFor)
      .attr("fill", "none")
      .attr("stroke", d => d.depression ? ROSE : TEAL)
      .attr("stroke-width", 1)
      .attr("opacity", 0.22)
      .on("mouseover", function(event, d) {
        // highlight this line and show student details
        d3.select(this).raise().attr("opacity", 1).attr("stroke-width", 2);
        showTip(event,
          `<strong>Gender:</strong> ${d.gender}<br>
           <strong>Year:</strong> ${d.year}<br>
           <strong>CGPA:</strong> ${d.cgpa.toFixed(2)}<br>
           <strong>Depression:</strong> ${d.depression ? "Yes" : "No"}<br>
           <strong>Anxiety:</strong> ${d.anxiety ? "Yes" : "No"}<br>
           <strong>Panic:</strong> ${d.panic ? "Yes" : "No"}<br>
           <strong>Treatment:</strong> ${d.treatment ? "Yes" : "No"}`);
      })
      .on("mousemove", (event) => {
        tooltip.style("left", (event.clientX + 14) + "px").style("top", (event.clientY - 10) + "px");
      })
      .on("mouseout", function() {
        d3.select(this).attr("opacity", 0.22).attr("stroke-width", 1);
        hideTip();
      });
 
  //draw a vertical axis for each dimension
  axes.forEach(ax => {
    const x = xScale(ax.key);
    const g = svg.append("g")
      .attr("class", "axis para-axis")
      .attr("transform", `translate(${x},0)`);
 
    //the axis line itself
    g.append("line")
      .attr("y1", 0).attr("y2", h)
      .attr("stroke", BORDER).attr("stroke-width", 1.5);
 
    if (ax.type === "num") {
      //numeric: use d3 axis for tick marks
      g.call(d3.axisLeft(ax.scale).ticks(4).tickSize(4))
        .call(gg => gg.select(".domain").remove());
    } else {
      //categorical/boolean: manual ticks
      ax.scale.domain().forEach(val => {
        const y = ax.scale(val);
        g.append("line")
          .attr("x1", -4).attr("x2", 4)
          .attr("y1", y).attr("y2", y)
          .attr("stroke", MUTED);
        g.append("text")
          .attr("x", -8).attr("y", y).attr("dy", "0.35em")
          .attr("text-anchor", "end")
          .attr("fill", MUTED).attr("font-size", 9)
          .attr("font-family", "DM Sans, sans-serif")
          .text(val);
      });
    }
 
    //axis title above the axis line
    g.append("text")
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .attr("fill", "#333").attr("font-size", 10)
      .attr("font-family", "DM Sans, sans-serif").attr("font-weight", 700)
      .text(ax.label);
  });
 
  //legend in the bottom right, shows what the two line colors mean
  const lg = svg.append("g").attr("transform", `translate(${w - 160}, ${h + 10})`);
 
  [["Depression: Yes", ROSE], ["Depression: No", TEAL]].forEach(([label, color], i) => {
    const row = lg.append("g").attr("transform", `translate(${i * 130}, 0)`);
    row.append("line")
      .attr("x1", 0).attr("x2", 18).attr("y1", 5).attr("y2", 5)
      .attr("stroke", color).attr("stroke-width", 2);
    row.append("text")
      .attr("x", 22).attr("y", 9)
      .attr("fill", "#333").attr("font-size", 10)
      .attr("font-family", "DM Sans, sans-serif")
      .text(label);
  });
}
 
 
//view 3: sankey diagram (advanced/focus)
//shows the flow: gender -> how many conditions -> whether they sought treatment
//ribbons are sized proportional to student count
//this is a focus view shows the treatment-seeking pipeline
function drawSankey(data) {
  const svgEl = document.getElementById("svg-sankey");
  const rect  = svgEl.getBoundingClientRect();
  const W = rect.width  || svgEl.parentElement.getBoundingClientRect().width  || 900;
  const H = rect.height || svgEl.parentElement.getBoundingClientRect().height || 200;
 
  const margin = { top: 20, right: 170, bottom: 10, left: 170 };
  const w = W - margin.left - margin.right;
  const h = H - margin.top  - margin.bottom;
 
  const svg = d3.select("#svg-sankey")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
 
  //bucket each student by how many conditions they have
  function condLabel(d) {
    const count = [d.depression, d.anxiety, d.panic].filter(Boolean).length;
    if (count === 0) return "No Condition";
    if (count === 1) return "1 Condition";
    if (count === 2) return "2 Conditions";
    return "3 Conditions";
  }
 
  //count flows between each pair of adjacent nodes
  const flowMap = {};
  const incFlow = (src, tgt) => {
    const key = `${src}|||${tgt}`;
    flowMap[key] = (flowMap[key] || 0) + 1;
  };
 
  data.forEach(d => {
    const g   = d.gender === "Other" ? "Female" : d.gender; // merge small "Other" group into Female
    const cond = condLabel(d);
    const tx   = d.treatment ? "Sought Treatment" : "No Treatment";
    incFlow(g, cond);
    incFlow(cond, tx);
  });
 
  //the three columns of nodes
  const col0 = ["Male","Female"];
  const col1 = ["No Condition","1 Condition","2 Conditions","3 Conditions"];
  const col2 = ["Sought Treatment","No Treatment"];
  const allNodes = [...col0, ...col1, ...col2];
 
  //compute how many students pass through each node
  const nodeTotal = {};
  allNodes.forEach(n => { nodeTotal[n] = 0; });
  Object.entries(flowMap).forEach(([key, val]) => {
    const [src, tgt] = key.split("|||");
    nodeTotal[tgt] = (nodeTotal[tgt] || 0) + val;
    if (!nodeTotal[src]) nodeTotal[src] = 0;
  });
  //for the leftmost column, use total count directly
  col0.forEach(n => {
    nodeTotal[n] = data.filter(d => (d.gender === "Other" ? "Female" : d.gender) === n).length;
  });
 
  const total = data.length;
  const PAD   = 6; //vertical gap between nodes in the same column
 
  //lay out nodes in a column, returning position info for each
  function layoutCol(nodes, xPos) {
    const totalH = h - PAD * (nodes.length - 1);
    let yOff = 0;
    return nodes.map(name => {
      const barH = Math.max(4, (nodeTotal[name] / total) * totalH);
      const entry = { name, x: xPos, y: yOff, barH };
      yOff += barH + PAD;
      return entry;
    });
  }
 
  const NODE_W = 12;
  const xC0 = 0;
  const xC1 = w * 0.42;
  const xC2 = w;
 
  const nodes0 = layoutCol(col0, xC0);
  const nodes1 = layoutCol(col1, xC1);
  const nodes2 = layoutCol(col2, xC2);
 
  //build a lookup from node name to its layout entry
  const nodeMap = {};
  [...nodes0, ...nodes1, ...nodes2].forEach(n => { nodeMap[n.name] = n; });
 
  //track how much of each node's bar has been filled by ribbons
  const nodeRightOff = {};
  const nodeLeftOff  = {};
  allNodes.forEach(n => { nodeRightOff[n] = 0; nodeLeftOff[n] = 0; });
 
  //colors for each node
  const nodeColor = {
    "Male":             SKY,
    "Female":           ROSE,
    "No Condition":     TEAL,
    "1 Condition":      AMBER,
    "2 Conditions":     VIOLET,
    "3 Conditions":     ROSE,
    "Sought Treatment": TEAL,
    "No Treatment":     ROSE,
  };
 
  //sort links by value so bigger ribbons render first
  const links = Object.entries(flowMap)
    .map(([key, value]) => {
      const [source, target] = key.split("|||");
      return { source, target, value };
    })
    .sort((a, b) => b.value - a.value);
 
  //draw each ribbon as a bezier path
  links.forEach(link => {
    const src = nodeMap[link.source];
    const tgt = nodeMap[link.target];
    if (!src || !tgt) return;
 
    //ribbon height proportional to number of students
    const ribbonH = (link.value / total) * h;
 
    const sy0 = src.y + nodeRightOff[link.source];
    const sy1 = sy0 + ribbonH;
    const ty0 = tgt.y + nodeLeftOff[link.target];
    const ty1 = ty0 + ribbonH;
 
    //advance the fill offset for both nodes
    nodeRightOff[link.source] += ribbonH;
    nodeLeftOff[link.target]  += ribbonH;
 
    const srcX = src.x + NODE_W;
    const tgtX = tgt.x;
    const cpX  = (srcX + tgtX) / 2; //control point for the bezier curve
 
    //closed ribbon path using cubic bezier curves
    const path = [
      `M ${srcX} ${sy0}`,
      `C ${cpX} ${sy0}, ${cpX} ${ty0}, ${tgtX} ${ty0}`,
      `L ${tgtX} ${ty1}`,
      `C ${cpX} ${ty1}, ${cpX} ${sy1}, ${srcX} ${sy1}`,
      `Z`,
    ].join(" ");
 
    svg.append("path")
      .attr("d", path)
      .attr("fill", nodeColor[link.source] || MUTED)
      .attr("opacity", 0.32)
      .attr("stroke", "none")
      .on("mouseover", function(event) {
        d3.select(this).attr("opacity", 0.62);
        showTip(event,
          `<strong>${link.source}</strong> -> <strong>${link.target}</strong><br>
           ${link.value} students`);
      })
      .on("mousemove", (event) => {
        tooltip.style("left", (event.clientX + 14) + "px").style("top", (event.clientY - 10) + "px");
      })
      .on("mouseout", function() {
        d3.select(this).attr("opacity", 0.32);
        hideTip();
      });
  });
 
  //draw the node rectangles
  [...nodes0, ...nodes1, ...nodes2].forEach(n => {
    svg.append("rect")
      .attr("x", n.x).attr("y", n.y)
      .attr("width", NODE_W).attr("height", n.barH)
      .attr("fill", nodeColor[n.name] || MUTED)
      .attr("rx", 2);
 
    //position labels: left nodes get label on the left, right nodes on the right
    const isLeft  = col0.includes(n.name);
    const labelX  = isLeft ? n.x - 6 : n.x + NODE_W + 6;
    const anchor  = isLeft ? "end" : "start";
 
    svg.append("text")
      .attr("x", labelX)
      .attr("y", n.y + n.barH / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", anchor)
      .attr("fill", "#333").attr("font-size", 10)
      .attr("font-family", "DM Sans, sans-serif")
      .text(`${n.name} (${nodeTotal[n.name]})`);
  });
 
  //column header labels at the top of each column
  const headers = [
    { label: "Gender",       x: xC0 + NODE_W / 2 },
    { label: "# Conditions", x: xC1 + NODE_W / 2 },
    { label: "Treatment",    x: xC2 + NODE_W / 2 },
  ];
  headers.forEach(({ label, x }) => {
    svg.append("text")
      .attr("x", x).attr("y", -8)
      .attr("text-anchor", "middle")
      .attr("fill", MUTED).attr("font-size", 10)
      .attr("font-family", "DM Sans, sans-serif").attr("font-weight", 700)
      .attr("letter-spacing", 1)
      .text(label.toUpperCase());
  });
}