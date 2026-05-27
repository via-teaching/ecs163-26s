// Manushri Rane, ID# 922220803

// reference: select  - https://d3js.org/d3-selection/selecting#select 
// just get the tooltip one time so we can use it in every chart going forward
const tip = d3.select("#tooltip");
const showTip = (html,e) => tip.style("opacity",1).html(html).style("left",(e.clientX+12)+"px").style("top",(e.clientY-10)+"px");
const shiftTip = e => tip.style("left",(e.clientX+12)+"px").style("top",(e.clientY-10)+"px");
const hideTip = () => tip.style("opacity",0);

// clean up key data
function categorizeKeys(s) {
  s = (s || "").toLowerCase();
  if (s.includes("1")) return "Year 1";
  else if (s.includes("2")) return "Year 2";
  else if (s.includes("3")) return "Year 3";
  else if (s.includes("4")) return "Year 4";
  return null;
}
// check if band is valid
function normBand(s) {
    if (!s) return null;
    return BANDS.find(b => s.includes(b));
}

// constants section
const COND_COLOR = {Depression:"#9d6bdf",Anxiety:"#d4715b","Panic Attack":"#62d455"};
const BANDS  = ["0 - 1.99","2.00 - 2.49","2.50 - 2.99","3.00 - 3.49","3.50 - 4.00"];
// declare labels for each variable
const LABELS = {"0 - 1.99":"0–1.99","2.00 - 2.49":"2.00–2.49","2.50 - 2.99":"2.50–2.99","3.00 - 3.49":"3.00–3.49","3.50 - 4.00":"3.50–4.00"};
const YEARS  = ["Year 1","Year 2","Year 3","Year 4"];
const CONDS  = ["Depression","Anxiety","Panic Attack"];


// The D3.CSV function loads in the CSV and helps to encode data into more readable variables by renaming them so we can reference them later on.
d3.csv("data/Student Mental health.csv").then(raw => {
  const D = raw.map(d => ({
    cgpa:      d["What is your CGPA?"]?.trim(),
    gender:    d["Choose your gender"]?.trim(),
    anxiety:   d["Do you have Anxiety?"]?.trim(),
    depression:d["Do you have Depression?"]?.trim(),
    panic:     d["Do you have Panic attack?"]?.trim(),
    treatment: d["Did you seek any specialist for a treatment?"]?.trim(),
    year:        categorizeKeys(d["Your current year of Study"]||""),
    // new boolean style variable to see if a student has at least one of these conditions
    hasCondition:   ["Do you have Depression?","Do you have Anxiety?","Do you have Panic attack?"].some(k=>d[k]?.trim()==="Yes")?"Yes":"No"
  }));
  

// creates Sankey Diagram using d3-sankey plugin
// referenced this code when building this diagridam - https://d3-gridaph-gallery.com/gridaph/sankey_basic.html,  https://github.com/d3/d3-sankey
// I chose this visualization to understand the relationships between all the different variables in this dataset.
// By making it interactive we can identify exactly how many students share the two variables.

// AI DISCLOSURE: I used ChatGPT to help me learn how to format this Sankey Diagram and apply the above template to the data.

const STREAM_COLORS = {Female:"#ec30aa",Male:"#4a87d6","Year 1":"#7fbf7b","Year 2":"#5bb8b8","Year 3":"#b87db8","Year 4":"#e69614",
  "Has Condition":"#f67e7e","No Condition":"#97eebe","Sought Treatment":"#02f002","No Treatment":"#b05050"};

function createSankey() {
    // The d3.select function is the entry point of each operation so we can chain methods.
    d3.select("#sankey-area").selectAll("*").remove();
    const el=document.getElementById("sankey-area"), W=el.clientWidth, H=el.clientHeight;
    const m={top:24,right:130,bottom:20,left:20}, w=W-m.left-m.right, h=H-m.top-m.bottom;
    const svg=d3.select("#sankey-area").append("svg").attr("width",W).attr("height",H);
    const g=svg.append("g").attr("transform",`translate(${m.left},${m.top})`);

    // sankey plugin - params
    // builds node and link arrays for d3-sankey plugin
    const nodeNames=["Female","Male","Year 1","Year 2","Year 3","Year 4","Has Condition","No Condition","Sought Treatment","No Treatment"];
    const nodeIndex=Object.fromEntries(nodeNames.map((n,i)=>[n,i]));

    // counts flows between adjacent stages and increment each one 
    const linkMap={};
    D.forEach(d=>{
      if(!d.gender||!d.year) return;
      const cond=d.hasCondition==="Yes"?"Has Condition":"No Condition";
      const treat=d.treatment==="Yes"?"Sought Treatment":"No Treatment";
      // gender to year flows
      const k1=`${d.gender}||${d.year}`;
      linkMap[k1]=(linkMap[k1]||0)+1;
      // year to condition flows
      const k2=`${d.year}||${cond}`;
      linkMap[k2]=(linkMap[k2]||0)+1;
      // condition to treatment flows
      const k3=`${cond}||${treat}`;             
      linkMap[k3]=(linkMap[k3]||0)+1;
    });

    // d3-sankey plug in takes in in {nodes, links}
    const sankeyData={
      nodes: nodeNames.map(n=>({name:n})),
      links: Object.entries(linkMap).map(([k,v])=>{
        const [a,b]=k.split("||");
        return {source:nodeIndex[a], target:nodeIndex[b], value:v};
      })
    };

    // create actual sankey
    const sankey=d3.sankey()
      .nodeWidth(14) // how thick node rectangles will be
      .nodePadding(8) // vertical gap b/w nodes in same col
      .extent([[0,0],[w,h]]);

    const {nodes,links}=sankey(sankeyData);

    // draw ribbon links using d3.sankeyLinkHorizontal() path generator
    g.append("g").selectAll("path")
      .data(links).join("path")
      .attr("d", d3.sankeyLinkHorizontal())
      .attr("fill","none")
      .attr("stroke",d=>STREAM_COLORS[d.source.name]||"#999")
      .attr("stroke-width",d=>Math.max(1,d.width))
      .attr("stroke-opacity",0.38)
      .on("mouseover",(e,d)=>showTip(`<b>${d.source.name} → ${d.target.name}</b><br>${d.value} students`,e))
      .on("mousemove",shiftTip).on("mouseout",hideTip);

    // draw node rectangles
    const node=g.append("g").selectAll("g")
      .data(nodes).join("g");

    node.append("rect")
      .attr("x",d=>d.x0).attr("y",d=>d.y0)
      .attr("width",d=>d.x1-d.x0).attr("height",d=>Math.max(1,d.y1-d.y0))
      .attr("fill",d=>STREAM_COLORS[d.name]||"#999");

    // node labels — left side nodes get label on left, right side on right
    node.append("text")
      .attr("x",d=>d.x1+5)
      .attr("y",d=>(d.y0+d.y1)/2)
      .attr("dy","0.35em")
      .attr("font-size",10).attr("fill","#222")
      .text(d=>`${d.name} (${d.value})`);

    // stage column header labels
    const stageX=[0, w*.30, w*.62, w];
    ["Gender","Year","Condition","Treatment"].forEach((lbl,si)=>
      g.append("text").attr("x",stageX[si]+7).attr("y",-10)
        .attr("text-anchor","middle").attr("font-size",11).attr("font-weight","bold").attr("fill","#444").text(lbl));
  }

  // https://d3-gridaph-gallery.com/gridaph/barplot_gridouped_basicWide.html 
  // This visualization showcases a focused view of Condition Rate versus GPA for each of the
  // three conditions. Here we can observe the relationship between GPA and percentage of students with depression, anxiety and panic attacks in one place.
    
  // AI DISCLOSURE: I used ChatGPT to help me make this bar chart interactive and organize the bars within the visualization.

  function createBarChart() {
    // set up select tool
    d3.select("#scatter-area").selectAll("*").remove();
    const el=document.getElementById("scatter-area"), W=el.clientWidth, H=el.clientHeight;
    const m={top:22,right:20,bottom:58,left:52}, w=W-m.left-m.right, h=H-m.top-m.bottom;
    const g=d3.select("#scatter-area").append("svg").attr("width",W).attr("height",H)
      .append("g").attr("transform",`translate(${m.left},${m.top})`);
    const bTotal={}, bCond={};
    // go through and increment number of individuals who have each condition 
    BANDS.forEach(b=>{bTotal[b]=0; bCond[b]={Depression:0,Anxiety:0,"Panic Attack":0};});
    D.forEach(d=>{
      const b=normBand(d.cgpa); if(!b) return;
      bTotal[b]++;
      if(d.depression==="Yes") bCond[b].Depression++;
      if(d.anxiety   ==="Yes") bCond[b].Anxiety++;
      if(d.panic     ==="Yes") bCond[b]["Panic Attack"]++;
    });

    const data=BANDS.filter(b=>bTotal[b]>0).map(b=>({
      band:b, n:bTotal[b], values:CONDS.map(c=>({c,pct:bCond[b][c]/bTotal[b]}))
    }));

    // reference: https://d3js.org/d3-scale/band 
    // creates new domains and ranges for our data
    // including categorical data, gridouped bars and percentages
    const x0=d3.scaleBand().domain(data.map(d=>d.band)).range([0,w]).paddingInner(.22).paddingOuter(.12);
    const x1=d3.scaleBand().domain(CONDS).range([0,x0.bandwidth()]).padding(.08);
    const y=d3.scaleLinear().domain([0,1]).range([h,0]);
    const col=d3.scaleOrdinal().domain(CONDS).range([COND_COLOR.Depression,COND_COLOR.Anxiety,COND_COLOR["Panic Attack"]]);
    g.append("g").call(d3.axisLeft(y).ticks(5).tickSize(-w).tickFormat("")).call(ax=>ax.select(".domain").remove()).selectAll("line").attr("stroke","#eee");

    // create single grid per CGPA range and move it horizontally
    const gridp=g.selectAll("g.b").data(data).join("g").attr("class","b").attr("transform",d=>`translate(${x0(d.band)},0)`);
    // create gridouped bars inside each of these bands
    gridp.selectAll("rect").data(d=>d.values.map(v=>({...v,n:d.n,label:LABELS[d.band]}))).join("rect")
      .attr("x",v=>x1(v.c)).attr("y",v=>y(v.pct)).attr("width",x1.bandwidth()).attr("height",v=>h-y(v.pct))
      .attr("fill",v=>col(v.c)).attr("opacity",.82).attr("rx",2)
      .on("mouseover",(e,v)=>showTip(`<b>CGPA ${v.label}</b> (n=${v.n})<br>${v.c}: ${(v.pct*100).toFixed(0)}% (${Math.round(v.pct*v.n)} students)`,e))
      .on("mousemove",shiftTip).on("mouseout",hideTip);
    gridp.selectAll("text.bl").data(d=>d.values).join("text").attr("class","bl")
      .attr("x",v=>x1(v.c)+x1.bandwidth()/2).attr("y",v=>y(v.pct)-3)
      .attr("text-anchor","middle").attr("font-size",9).attr("fill","#444")
      .text(v=>(h-y(v.pct))>15?`${(v.pct*100).toFixed(0)}%`:"");

    // create y axis with % labels
    g.append("g").attr("transform",`translate(0,${h})`).call(d3.axisBottom(x0).tickFormat(b=>LABELS[b]).tickSize(0))
      .call(ax=>ax.select(".domain").attr("stroke","#ccc"))
      .selectAll("text").attr("dy","0.8em").attr("dx","-0.4em").attr("transform","rotate(-18)").attr("text-anchor","end").attr("font-size",10);
    g.append("g").call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(".0%"))).call(ax=>ax.select(".domain").attr("stroke","#ccc"));
    g.append("text").attr("x",w/2).attr("y",h+52).attr("text-anchor","middle").text("CGPA Band");
    g.append("text").attr("transform","rotate(-90)").attr("x",-h/2).attr("y",-42).attr("text-anchor","middle").text("Percentage of Students with Condition");
   
    // create legend to understand data
    const lg=g.append("g").attr("transform",`translate(${w-110},2)`);
    lg.append("rect").attr("x",-6).attr("y",-4).attr("width",116).attr("height",CONDS.length*16+8).attr("fill","#fff").attr("opacity",.85).attr("rx",3);
    CONDS.forEach((c,i)=>{
      lg.append("rect").attr("x",0).attr("y",i*16-5).attr("width",10).attr("height",10).attr("fill",col(c)).attr("opacity",.85).attr("rx",2);
      lg.append("text").attr("x",14).attr("y",i*16).attr("dy","0.35em").attr("font-size",10).attr("fill","#333").text(c);
    });
  }

  // reference:  https://d3-gridaph-gallery.com/gridaph/heatmap_basic.html, https://d3js.org/d3-scale-chromatic/sequential 
  // I chose a heatmap here because it presented the volume of the percentages over the years in a very intuitive way and provided a unique perspective compared to my other visualizations.

  // AI DISCLOSURE: I used ChatGPT to help me learn how to format the Heatmap and apply the above reference code to the data.

  function createHeatmap() {
    // clear old chart before redrawing
    // d3 select defined above
    d3.select("#heatmap-area").selectAll("*").remove();
    // get size, margins, and drawing width heigh inside margins
    const el=document.getElementById("heatmap-area"), W=el.clientWidth, H=el.clientHeight;
    const m={top:18,right:30,bottom:50,left:70}, w=W-m.left-m.right, h=H-m.top-m.bottom;
    const svg=d3.select("#heatmap-area").append("svg").attr("width",W).attr("height",H);
    const g=svg.append("g").attr("transform",`translate(${m.left},${m.top})`);

    // store count data and running number of student counts for each condition
    const yearCount={}, cellCount={};
    YEARS.forEach(year=>{yearCount[year]=0; CONDS.forEach(c=>{cellCount[`${year}|${c}`]=0;});});
    D.forEach(d=>{
      if(!d.year) return;
      yearCount[d.year]++;
      if(d.depression==="Yes") cellCount[`${d.year}|Depression`]++;
      if(d.anxiety   ==="Yes") cellCount[`${d.year}|Anxiety`]++;
      if(d.panic     ==="Yes") cellCount[`${d.year}|Panic Attack`]++;
    });

    // create heatmap cells and set up dimensions
    const cells=YEARS.flatMap(year=>CONDS.map(c=>({year,c,count:cellCount[`${year}|${c}`],total:yearCount[year],pct:yearCount[year]>0?cellCount[`${year}|${c}`]/yearCount[year]:0})));
    // x scale for conditions and y scale for years
    const xS=d3.scaleBand().domain(CONDS).range([0,w]).padding(.05);
    const yS=d3.scaleBand().domain(YEARS).range([0,h]).padding(.05);
    // set up sequential scale for each column
    const cols={
      Depression:   d3.scaleSequential([0,1], d3.interpolateBlues),
      Anxiety:      d3.scaleSequential([0,1], d3.interpolateReds),
      "Panic Attack":d3.scaleSequential([0,1], d3.interpolateOranges)
    };

    // draw actual heatmap cells according to condition and year
    // fill colors, round corners
    // add mouseover functionaliity
    g.selectAll("rect.cell").data(cells).join("rect").attr("class","cell")
      .attr("x",d=>xS(d.c)).attr("y",d=>yS(d.year)).attr("width",xS.bandwidth()).attr("height",yS.bandwidth())
      .attr("fill",d=>cols[d.c](d.pct)).attr("rx",3)
      .on("mouseover",(e,d)=>showTip(`<b>${d.year} — ${d.c}</b><br>${d.count}/${d.total} students (${(d.pct*100).toFixed(0)}%)`,e))
      .on("mousemove",shiftTip).on("mouseout",hideTip);
      // add percentage labels
    g.selectAll("text.cl").data(cells).join("text").attr("class","cl")
      .attr("x",d=>xS(d.c)+xS.bandwidth()/2).attr("y",d=>yS(d.year)+yS.bandwidth()/2)
      .attr("dy","0.35em").attr("text-anchor","middle").attr("font-size",11)
      .attr("fill",d=>d.pct>.55?"#fff":"#333").text(d=>`${(d.pct*100).toFixed(0)}%`);

    // label axes with d3 elements axisBottom, axisLeft etc.
    g.append("g").attr("transform",`translate(0,${h})`).call(d3.axisBottom(xS).tickSize(0)).select(".domain").remove();
    g.append("g").call(d3.axisLeft(yS).tickSize(0)).select(".domain").remove();
    g.append("text").attr("transform","rotate(-90)").attr("x",-h/2).attr("y",-56).attr("text-anchor","middle").text("Year of Study");
    g.append("text").attr("x",w/2).attr("y",h+40).attr("text-anchor","middle").text("Mental Health Condition");

    // make legend
    const legendWidth=60,legendHeight=8,legG=g.append("g").attr("transform",`translate(${w-legendWidth*3-0},${h+30})`);
    CONDS.forEach((c,i)=>{
      const lx=i*(legendWidth+10), gid=`hg-${i}`;
      const grid=svg.append("defs").append("linearGradient").attr("id",gid).attr("x1","0%").attr("x2","100%");
      grid.append("stop").attr("offset","0%").attr("stop-color",cols[c](0));
      grid.append("stop").attr("offset","100%").attr("stop-color",cols[c](1));
      legG.append("rect").attr("x",lx).attr("y",0).attr("width",legendWidth).attr("height",legendHeight).attr("fill",`url(#${gid})`).attr("rx",2);
      legG.append("text").attr("x",lx).attr("y",-3).attr("font-size",9).attr("fill","#444").text(c);
      legG.append("text").attr("x",lx).attr("y",legendHeight+10).attr("font-size",9).attr("fill","#888").text("0%");
      legG.append("text").attr("x",lx+legendWidth).attr("y",legendHeight+10).attr("font-size",9).attr("fill","#888").attr("text-anchor","end").text("100%");
    });
  }

  const drawAll=()=>{ createSankey(); createBarChart(); createHeatmap(); };
  drawAll();
  window.addEventListener("resize",drawAll);

}).catch(err=>console.error("CSV load error:",err));