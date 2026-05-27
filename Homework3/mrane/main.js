// Manushri Rane, ID# 922220803

// reference: select  - https://d3js.org/d3-selection/selecting#select 
// just get the tooltip one time so we can use it in every chart going forward
const tip=d3.select("#tooltip");
const showTip=(html,e)=>tip.style("opacity",1).html(html).style("left",(e.clientX+12)+"px").style("top",(e.clientY-10)+"px");
// cursor will move with mouse
const shiftTip=e=>tip.style("left",(e.clientX+12)+"px").style("top",(e.clientY-10)+"px");
const hideTip=()=>tip.style("opacity",0);

// clean up key data
// normalize year of study data to account for the upper and lowercase inconsistencies
function categorizeYear(s){
  s=(s||"").toLowerCase();
  if(s.includes("1")) return "Year 1";
  if(s.includes("2")) return "Year 2";
  if(s.includes("3")) return "Year 3";
  if(s.includes("4")) return "Year 4";
  return null;
}

// checks if band is valid --> look up raw CGPA string and remove whitespace
function normBand(s){
  return s ? GPA_RANGES.find(b=>s.trim()===b)||null : null;
}

// constants section
// sankey colors for nodes
const STREAM_COLORS={
  Female:"#ec30aa",Male:"#4a87d6",
  "Year 1":"#7fbf7b","Year 2":"#5bb8b8","Year 3":"#b87db8","Year 4":"#e69614",
  "Has Condition":"#f67e7e","No Condition":"#97eebe",
  "Sought Treatment":"#02f002","No Treatment":"#b05050"
};
// three conditions
const COND_COLOR={
  Depression:"#9d6bdf",
  Anxiety:"#d4715b",
  "Panic Attack":"#62d455"
};
const GPA_RANGES=["0 - 1.99","2.00 - 2.49","2.50 - 2.99","3.00 - 3.49","3.50 - 4.00"];
// declare labels for each variable
const LABELS={"0 - 1.99":"0–1.99", "2.00 - 2.49":"2.00–2.49", "2.50 - 2.99":"2.50–2.99", "3.00 - 3.49":"3.00–3.49","3.50 - 4.00":"3.50–4.00"
};
const YEARS=["Year 1","Year 2","Year 3","Year 4"];
const CONDS=["Depression","Anxiety","Panic Attack"];
// filter state variables
let selectedNode=null;
let brushedGPA_RANGES=null;
// filter all charts based on active filters
// find subset of this global array that will ass all the active filters
// focus charts will use this
function filteredData(){
  return D.filter(d=>{
    // sankey node filter that only highlights the selected variable
    if(selectedNode){
      const n=selectedNode;
      // true if student matches node categoru
      const belongs=
        d.gender===n||
        d.year===n||
        (n==="Has Condition"&&d.hasCondition==="Yes")||
        (n==="No Condition"&&d.hasCondition==="No")||
        (n==="Sought Treatment"&&d.treatment==="Yes")||
        (n==="No Treatment"&&d.treatment==="No");
      if(!belongs) return false;
    }
    // similar function --> basically if the gpa range is  selected we will only keep the those students in the heatmap
    if(brushedGPA_RANGES?.length&&!brushedGPA_RANGES.includes(d.cgpa))
      return false;

    return true;
  });
}

// update filter label text
function updateFilterLabel(){
  // count number of students pass current filters
  const n=filteredData().length;
  const parts=[];
  // sankey node filter description
  if(selectedNode)
    parts.push(`node: <span>${selectedNode}</span>`);
// show active brush filter
  if(brushedGPA_RANGES?.length)
    parts.push(`CGPA: <span>${brushedGPA_RANGES.map(b=>LABELS[b]).join(", ")}</span>`);
  document.getElementById("filter-label").innerHTML=
    parts.length
      ? `Filtered to ${n} student${n!==1?"s":""} — ${parts.join(" &amp; ")}`
      : `Showing all ${n} students`;
}


// The D3.CSV function loads in the CSV and helps to encode data into more readable variables by renaming them so we can reference them later on.
// reference: https://d3js.org/d3-fetch#csv 
d3.csv("data/Student Mental health.csv").then(raw=>{
  // map raw csv row to cleaned up object
  window.D=raw.map(d=>({
    cgpa:normBand(d["What is your CGPA?"]?.trim()),
    gender:d["Choose your gender"]?.trim(),
    anxiety:d["Do you have Anxiety?"]?.trim(),
    depression:d["Do you have Depression?"]?.trim(),
    panic:d["Do you have Panic attack?"]?.trim(),
    treatment:d["Did you seek any specialist for a treatment?"]?.trim(),
    year:categorizeYear(d["Your current year of Study"]),

    // new boolean style variable to see if a student has at least one of these conditions
    hasCondition:[
      d["Do you have Depression?"],
      d["Do you have Anxiety?"],
      d["Do you have Panic attack?"]
    ].some(v=>v?.trim()==="Yes") ? "Yes":"No"
  }));


  // creates Sankey Diagram using d3-sankey plugin
  // referenced this code when building this diagram - https://d3-graph-gallery.com/graph/sankey_basic.html,  https://github.com/d3/d3-sankey
  // I chose this visualization to understand the relationships between all the different variables in this dataset.
  // By making it interactive we can identify exactly how many students share the two variables.

  // d3.select defined before
  // d3.selectAll seleects every child element inside it
  // .remove() removes all child elements from DOM so we can start with a clean slate

  // AI DISCLOSURE: I used ChatGPT as a supplement to the given resources in class to help me learn how to format this Sankey Diagram to make it interactive and apply the above template to the data. 
  function createSankey(){

    d3.select("#sankey-area").selectAll("*").remove();
    const el=document.getElementById("sankey-area"),
          W=el.clientWidth,
          H=el.clientHeight,
          m={top:24,right:130,bottom:20,left:20},
          w=W-m.left-m.right,
          h=H-m.top-m.bottom;
    const svg=d3.select("#sankey-area").append("svg")
      .attr("width",W)
      .attr("height",H);

    // shifts whole group by m.left and down by m.top
    const g=svg.append("g")
      .attr("transform",`translate(${m.left},${m.top})`);

    // sankey plugin - params
    // builds node and link arrays for d3-sankey plugin
    const nodeNames=[
      "Female","Male",
      "Year 1","Year 2","Year 3","Year 4",
      "Has Condition","No Condition",
      "Sought Treatment","No Treatment"
    ];

    // creates lookup object to convert node name to index when we map nodes
    const nodeIndex=Object.fromEntries(nodeNames.map((n,i)=>[n,i]));
    const linkMap={};

    // counts flows between adjacent stages and increment each one 
    D.forEach(d=>{
      if(!d.gender||!d.year) return;
      const cond=d.hasCondition==="Yes"?"Has Condition":"No Condition";
      const treat=d.treatment==="Yes"?"Sought Treatment":"No Treatment";
      [[d.gender,d.year],[d.year,cond],[cond,treat]]
        .forEach(([a,b])=>linkMap[`${a}||${b}`]=(linkMap[`${a}||${b}`]||0)+1);
    });

    // d3-sankey plug in takes in in {nodes, links}
    const sankeyData={
      nodes:nodeNames.map(name=>({name})),
      links:Object.entries(linkMap).map(([k,v])=>{
        const [a,b]=k.split("||");
        return {
          source:nodeIndex[a],
          target:nodeIndex[b],
          value:v,
          _src:a
        };
      })
    };

    // d3.sankey() actually create sankey layout -  https://github.com/d3/d3-sankey 
    // plugin loaded via script in index.html and attached to global d3 object
    const {nodes,links}=d3.sankey()
      .nodeWidth(14)
      .nodePadding(8)
      .extent([[0,0],[w,h]])(sankeyData);

    // draw ribbon links using d3.sankeyLinkHorizontal() path generator
    const ribbons=g.append("g")
      .selectAll("path")
      .data(links)
      .join("path")
      .attr("d",d3.sankeyLinkHorizontal())
      .attr("fill","none")
      .attr("stroke",d=>STREAM_COLORS[d._src]||"#999")
      .attr("stroke-width",d=>Math.max(1,d.width))
      .attr("stroke-opacity",0.38)
      .on("mouseover",(e,d)=>showTip(`<b>${d.source.name} → ${d.target.name}</b><br>${d.value} students`,e))
      .on("mousemove",shiftTip)
      .on("mouseout",hideTip);

    // draw node rectangles, reference: https://d3js.org/d3-selection/joining 
    // one <g> eleement per node and rectangle and text labels are grouped together
    const node=g.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g");

    // add <rect> inside every g node 
    node.append("rect")
      .attr("x",d=>d.x0)
      .attr("y",d=>d.y0)
      .attr("width",d=>d.x1-d.x0)
      // make sure theres a min height to account for smaller nodes
      .attr("height",d=>Math.max(1,d.y1-d.y0))
      .attr("fill",d=>STREAM_COLORS[d.name]||"#999")
      .attr("rx",2)
      .style("cursor","pointer")
      // clicking a node filters the other charts
      .on("click",(e,d)=>{
        // set node to null if already selected
        selectedNode=selectedNode===d.name ? null : d.name;
        
        // filtering transition
        //transition function call instantiates D3 transition to change the opacity of only highlighted ribbons
        ribbons.transition()
          .duration(400)
          .attr("stroke-opacity",r=>
            !selectedNode ? 0.38 :
            (r.source.name===selectedNode||r.target.name===selectedNode ? 0.75 : 0.05)
          );

        // add border to selected node 
        node.selectAll("rect")
          .attr("stroke",nd=>nd.name===selectedNode ? "#333":"none")
          .attr("stroke-width",2);
        // create all charts again with updated filter
        createBarChart();
        createHeatmap();
        updateFilterLabel();
      })
      .on("mouseover",(e,d)=>showTip(`<b>${d.name}</b><br>${d.value} students — click to filter`,e))
      .on("mousemove",shiftTip)
      .on("mouseout",hideTip);

    // node labels — left side nodes get label on left, right side on right
    node.append("text")
      .attr("x",d=>d.x1+5)
      .attr("y",d=>(d.y0+d.y1)/2)
      .attr("dy","0.35em")
      .attr("font-size",10)
      .attr("fill","#222")
      .text(d=>`${d.name} (${d.value})`);

    // stage column header labels
    ["Gender","Year","Condition","Treatment"].forEach((lbl,i)=>
      g.append("text")
        .attr("x",[0,w*.30,w*.62,w][i]+7)
        .attr("y",-10)
        .attr("text-anchor","middle")
        .attr("font-size",11)
        .attr("font-weight","bold")
        .attr("fill","#444")
        .text(lbl)
    );
  }


  // reference: https://d3-graph-gallery.com/graph/barplot_grouped_basicWide.html 
  // This visualization showcases a focused view of Condition Rate versus GPA for each of the
  // three conditions. Here we can observe the relationship between GPA and percentage of students with depression, anxiety and panic attacks in one place.
  // In addition, now when a user brushes over a group of bars, the heatmap updates to show the year and condition distributions for those particular data points only.
  // AI DISCLOSURE: I used ChatGPT as a supplement to the given resources in class to help me make this bar chart interactive and organize the bars within the visualization.
  function createBarChart(){
    // check pixel dimensions
    const el=document.getElementById("scatter-area"),
          W=el.clientWidth,
          H=el.clientHeight,
          first_time=d3.select("#scatter-area svg").empty(),
          m={top:22,right:20,bottom:58,left:52},
          w=W-m.left-m.right,
          h=H-m.top-m.bottom;
    // make sure there is nothing in the container on the first time
    // also create a new svg for the chart and add the margin for the first time.
    if(first_time)
      d3.select("#scatter-area").selectAll("*").remove();
    
    const svg=first_time
      ? d3.select("#scatter-area").append("svg")
      : d3.select("#scatter-area svg");
    svg.attr("width",W).attr("height",H);

    const g=first_time
      ? svg.append("g").attr("class","bar-g")
      : svg.select(".bar-g");

    g.attr("transform",`translate(${m.left},${m.top})`);
    g.selectAll(".bar-group,.bl").remove();

    // only include filtered data here
    const subset=filteredData();
    const totals=Object.fromEntries(GPA_RANGES.map(b=>[b,0]));
    const counts=Object.fromEntries(GPA_RANGES.map(b=>[b,{Depression:0,Anxiety:0,"Panic Attack":0}]));

    // go through and increment number of individuals who have each condition 
    subset.forEach(d=>{

      if(!d.cgpa) return;

      totals[d.cgpa]++;

      if(d.depression==="Yes") counts[d.cgpa].Depression++;
      if(d.anxiety==="Yes") counts[d.cgpa].Anxiety++;
      if(d.panic==="Yes") counts[d.cgpa]["Panic Attack"]++;
    });

    const data=GPA_RANGES.map(b=>({
      band:b,
      n:totals[b],
      values:CONDS.map(c=>({
        c,
        pct:totals[b] ? counts[b][c]/totals[b] : 0
      }))
    }));

    // reference: https://d3js.org/d3-scale/band 
    // creates new domains and ranges for our data
    // including categorical data, grouped bars and percentages
    const x0=d3.scaleBand().domain(GPA_RANGES).range([0,w]).paddingInner(.22).paddingOuter(.12);
    const x1=d3.scaleBand().domain(CONDS).range([0,x0.bandwidth()]).padding(.08);
    const y=d3.scaleLinear().domain([0,1]).range([h,0]);

    // only draw axes, labels, and legend if its the first time drawing the diagram --> otherwise these will stay the same
    if(first_time){
      g.append("g")
        .attr("class","grid")
        .call(d3.axisLeft(y).ticks(5).tickSize(-w).tickFormat(""))
        .call(a=>a.select(".domain").remove())
        .selectAll("line")
        .attr("stroke","#eee");

      // create y axis with % labels
      // reference: https://d3js.org/d3-axis 
      g.append("g")
        .attr("transform",`translate(0,${h})`)
        .call(d3.axisBottom(x0).tickFormat(b=>LABELS[b]).tickSize(0));
      g.append("g")
        .attr("class","y-axis")
        .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(".0%")));

      // label x and y axes
      g.append("text")
        .attr("x",w/2)
        .attr("y",h+52)
        .attr("text-anchor","middle")
        .text("CGPA Range");
      g.append("text")
        .attr("transform","rotate(-90)")
        .attr("x",-h/2)
        .attr("y",-42)
        .attr("text-anchor","middle")
        .text("Percentage of Students with Condition");

      // create legend to understand data
      // area for legend
      const lg=g.append("g")
        .attr("transform",`translate(${w-110},2)`);
      
      // add a colored rect and label for every condition in our list
      CONDS.forEach((c,i)=>{
        lg.append("rect")
          .attr("x",0)
          .attr("y",i*16-5)
          .attr("width",10)
          .attr("height",10)
          .attr("rx",2)
          .attr("fill",COND_COLOR[c]);
        lg.append("text")
          .attr("x",14)
          .attr("y",i*16)
          .attr("dy","0.35em")
          .attr("font-size",10)
          .text(c);
      });

      // brushing interaction for selecting CGPA ranges
      // reference: https://d3js.org/d3-brush 
      // d3.brushx tool makes a horizontal brush generator. It will fire when the user is done dragging or wants to deselect the range by clicking.
      const brush=d3.brushX()
        .extent([[0,0],[w,h]])
        .on("end",e=>{
          brushedGPA_RANGES=!e.selection ? null :
            GPA_RANGES.filter(b=>x0(b)+x0.bandwidth()>e.selection[0]&&x0(b)<e.selection[1]);

          // if the user drags their mouse but does not select anything
          if(!brushedGPA_RANGES?.length) {
            brushedGPA_RANGES=null;
          }
          // update heatmap and filter label
          createHeatmap();
          updateFilterLabel();
        });
      
      // creates group of bands user has selected and  calls the brush command
      g.append("g")
        .attr("class","brush")
        .call(brush);
    }

    // create single group per CGPA range and move it horizontally
    const groups=g.selectAll(".bar-group")
      .data(data)
      .join("g")
      .attr("class","bar-group")
      .attr("transform",d=>`translate(${x0(d.band)},0)`);

    // create grouped bars inside each of these GPA_RANGES
    groups.selectAll("rect")
      .data(d=>d.values.map(v=>({...v,n:d.n,label:LABELS[d.band]})))
      .join("rect")
      .attr("x",d=>x1(d.c))
      .attr("width",x1.bandwidth())
      .attr("rx",2)
      .attr("fill",d=>COND_COLOR[d.c])
      .attr("opacity",.82)
      .on("mouseover",(e,d)=>showTip(`<b>CGPA ${d.label}</b> (n=${d.n})<br>${d.c}: ${(d.pct*100).toFixed(0)}% (${Math.round(d.pct*d.n)} students)`,e))
      .on("mousemove",shiftTip)
      .on("mouseout",hideTip)
      .transition()
      .duration(500)
      .attr("y",d=>y(d.pct))
      .attr("height",d=>h-y(d.pct));

    // percentage labels that are above every bar
    groups.selectAll(".bl")
      .data(d=>d.values)
      .join("text")
      .attr("class","bl")
      .attr("text-anchor","middle")
      .attr("x",d=>x1(d.c)+x1.bandwidth()/2)
      .attr("y",d=>y(d.pct)-3)
      .attr("font-size",9)
      .text(d=>(h-y(d.pct))>15 ? `${(d.pct*100).toFixed(0)}%` : "");
  }

  // reference:  https://d3-graph-gallery.com/graph/heatmap_basic.html, https://d3js.org/d3-scale-chromatic/sequential 
  // I chose a heatmap here because it presented the volume of the percentages over the years in a very intuitive way and provided a unique perspective compared to my other visualizations.
  // This heatmap is called every time a filter is selected or a range of values is selected for the heatmap.
  // AI DISCLOSURE: I used ChatGPT as a supplement to the given resources in class to help me learn how to format the Heatmap and apply the above reference code to the data.
  function createHeatmap(){
    // clear old chart before redrawing
    // d3 select defined above
    const el=document.getElementById("heatmap-area"),
          W=el.clientWidth,
          H=el.clientHeight,
          first_time=d3.select("#heatmap-area svg").empty(),
          m={top:18,right:30,bottom:50,left:70},
          w=W-m.left-m.right,
          h=H-m.top-m.bottom;

    // only allocates area and draws these elements the first time
    if(first_time)
      d3.select("#heatmap-area").selectAll("*").remove();

    const svg=first_time
      ? d3.select("#heatmap-area").append("svg")
      : d3.select("#heatmap-area svg");

    svg.attr("width",W).attr("height",H);

    const g=first_time
      ? svg.append("g").attr("class","hm-g")
      : svg.select(".hm-g");

    g.attr("transform",`translate(${m.left},${m.top})`);

    const subset=filteredData();

    // store count data and running number of student counts for each condition
    const yearCount=Object.fromEntries(YEARS.map(y=>[y,0]));
    const cellCount={};

    // initialize every cell count to 0
    YEARS.forEach(y=>CONDS.forEach(c=>cellCount[`${y}|${c}`]=0));
    // count for each condition
    subset.forEach(d=>{
      if(!d.year) return;
      yearCount[d.year]++;
      if(d.depression==="Yes") cellCount[`${d.year}|Depression`]++;
      if(d.anxiety==="Yes") cellCount[`${d.year}|Anxiety`]++;
      if(d.panic==="Yes") cellCount[`${d.year}|Panic Attack`]++;
    });

    // create heatmap cells and set up dimensions
    const cells=YEARS.flatMap(year=>
      CONDS.map(c=>({
        year,c,
        count:cellCount[`${year}|${c}`],
        total:yearCount[year],
        pct:yearCount[year] ? cellCount[`${year}|${c}`]/yearCount[year] : 0
      }))
    );

    // x scale for conditions and y scale for years
    const xS=d3.scaleBand().domain(CONDS).range([0,w]).padding(.05);
    const yS=d3.scaleBand().domain(YEARS).range([0,h]).padding(.05);

    // set up sequential scale for each column
    const cols={
      Depression:d3.scaleSequential([0,1],d3.interpolateBlues),
      Anxiety:d3.scaleSequential([0,1],d3.interpolateReds),
      "Panic Attack":d3.scaleSequential([0,1],d3.interpolateOranges)
    };

    // draw actual heatmap cells according to condition and year
    // fill colors, round corners
    // add mouseover functionality
    g.selectAll(".cell")
      .data(cells,d=>`${d.year}|${d.c}`)
      .join("rect")
      .attr("class","cell")
      .attr("x",d=>xS(d.c))
      .attr("y",d=>yS(d.year))
      .attr("width",xS.bandwidth())
      .attr("height",yS.bandwidth())
      .attr("rx",3)
      .on("mouseover",(e,d)=>showTip(`<b>${d.year} — ${d.c}</b><br>${d.count}/${d.total} students (${(d.pct*100).toFixed(0)}%)`,e))
      .on("mousemove",shiftTip)
      .on("mouseout",hideTip)
      .transition()
      .duration(400)
      .attr("fill",d=>cols[d.c](d.pct));

    // add percentage labels
    g.selectAll(".cl")
      .data(cells,d=>`${d.year}|${d.c}`)
      .join("text")
      .attr("class","cl")
      .attr("x",d=>xS(d.c)+xS.bandwidth()/2)
      .attr("y",d=>yS(d.year)+yS.bandwidth()/2)
      .attr("dy","0.35em")
      .attr("text-anchor","middle")
      .attr("font-size",11)
      .attr("fill",d=>d.pct>.55 ? "#fff":"#333")
      .text(d=>`${(d.pct*100).toFixed(0)}%`);

    // label axes with d3 elements axisBottom, axisLeft etc.
    // same process as above two
    if(first_time){
      g.append("g")
        .attr("transform",`translate(0,${h})`)
        .call(d3.axisBottom(xS).tickSize(0))
        .select(".domain")
        .remove();
      g.append("g")
        .call(d3.axisLeft(yS).tickSize(0))
        .select(".domain")
        .remove();
      g.append("text")
        .attr("transform","rotate(-90)")
        .attr("x",-h/2)
        .attr("y",-56)
        .attr("text-anchor","middle")
        .text("Year of Study");
      g.append("text")
        .attr("x",w/2)
        .attr("y",h+40)
        .attr("text-anchor","middle")
        .text("Mental Health Condition");
    }
  }
  // call functions to draw all charts
  // start with null node
  const drawAll=()=>{
    selectedNode=null;
    brushedGPA_RANGES=null;
    createSankey();
    createBarChart();
    createHeatmap();
    updateFilterLabel();
  };
  drawAll();
  window.addEventListener("resize",drawAll);
}).catch(err=>console.error("CSV load error:",err));