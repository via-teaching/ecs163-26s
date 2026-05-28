//Fullscreen view
const W = window.innerWidth, H = window.innerHeight;

//Classifications based on dataset
const freqMap   = { "Never":0, "Rarely":1, "Sometimes":2, "Very frequently":3 };
const genreCols = ["Classical","Country","EDM","Folk","Gospel","Hip hop","Jazz",
                   "K pop","Latin","Lofi","Metal","Pop","R&B","Rap","Rock","Video game music"];
const mhDims    = ["Anxiety","Depression","Insomnia","OCD"];
const mhColors  = { Anxiety:"#f87171", Depression:"#fb923c", Insomnia:"#a78bfa", OCD:"#60a5fa" };
const palette   = ["#4e79a7","#f28e2b","#e15759","#76b7b2","#59a14f","#edc948",
                   "#b07aa1","#ff9da7","#9c755f","#bab0ac","#aec7e8","#ffbb78",
                   "#98df8a","#ff9896","#c5b0d5","#c49c94","#f7b6d2"];

//General Layout
//Heatmap dimensions
const hmH  = Math.floor(H * 0.42);
const botH = H - hmH;
const half = Math.floor(W * 0.5);

//Each panel
const hmM  = { t:50, r:190, b:95,  l:130 };
const barM = { t:40, r:20,  b:100, l:60  };
const skM  = { t:40, r:30,  b:30,  l:20  };

//Inner dimensions
const hmIW = W    - hmM.l  - hmM.r;
const hmIH = hmH  - hmM.t  - hmM.b;
const barIW= half - barM.l - barM.r;
const barIH= botH - barM.t - barM.b;
const skIW = half - skM.l  - skM.r;
const skIH = botH - skM.t  - skM.b;

//SVG
const svg = d3.select("svg").attr("width",W).attr("height",H).style("background","#0f1117");

//title
function title(x, y, str) {
    svg.append("text").attr("x",x).attr("y",y).attr("text-anchor","middle")
        .attr("font-size","12px").attr("fill","#a78bfa").attr("font-weight","bold")
        .attr("font-family","sans-serif").text(str);
}
title(W/2,                   18, "OVERVIEW — Genre Listening Frequency × Mental Health Score (Heatmap Lift)");
title(barM.l + barIW/2,      hmH+22, "FOCUS — Avg Mental Health Scores by Favorite Genre");
title(half + skM.l + skIW/2, hmH+22, "FOCUS — Genre → Anxiety Level → Music Effect (Sankey)");

//dividing lines
svg.append("line").attr("x1",0).attr("x2",W).attr("y1",hmH).attr("y2",hmH).attr("stroke","#2d3154");
svg.append("line").attr("x1",half).attr("x2",half).attr("y1",hmH).attr("y2",H).attr("stroke","#2d3154");

//Axis styling
function styleAxis(g, tickColor) {
    g.select(".domain").remove();
    g.selectAll("text").attr("fill", tickColor||"#94a3b8")
        .attr("font-size","11px").attr("font-family","sans-serif");
}


d3.csv("mxmh_survey_results.csv").then(function(raw) {

    //Parsing
    raw.forEach(function(d) {
        mhDims.forEach(function(m) { d[m] = +d[m]; });
        genreCols.forEach(function(g) { d["Frequency ["+g+"]"] = freqMap[d["Frequency ["+g+"]"]] || 0; });
    });

    //Cleaning
    const data = raw.filter(function(d) {
        return mhDims.every(function(m) { return !isNaN(d[m]); })
            && d["Fav genre"] && d["Music effects"];
    });

    //Stacked bar heatmap for mental health by genre
    const hmG = svg.append("g").attr("transform","translate("+hmM.l+","+hmM.t+")");

    const hmData = genreCols.flatMap(function(g) {
        return mhDims.map(function(mh) {
            //Seperate data
            const vf = data.filter(function(d){ return d["Frequency ["+g+"]"]===3; });
            const nv = data.filter(function(d){ return d["Frequency ["+g+"]"]===0; });
            const avgVF = vf.length ? d3.mean(vf,function(d){ return d[mh]; }) : 0;
            const avgNV = nv.length ? d3.mean(nv,function(d){ return d[mh]; }) : 0;
            //Positive means higher MH scores
            return { genre:g, mh, lift:avgVF-avgNV };
        });
    });

    //Scaling
    const absMax = Math.max(...hmData.map(function(d){ return Math.abs(d.lift); }));
    const hmX    = d3.scaleBand().domain(mhDims).range([0,hmIW]).padding(0.06);
    const hmY    = d3.scaleBand().domain(genreCols).range([0,hmIH]).padding(0.06);
    const hmCol  = d3.scaleDiverging().domain([-absMax,0,absMax]).interpolator(d3.interpolateRdYlGn);

    //labelling and styling axes
    styleAxis(hmG.append("g").attr("transform","translate(0,"+hmIH+")").call(d3.axisBottom(hmX).tickSize(0)));
    styleAxis(hmG.append("g").call(d3.axisLeft(hmY).tickSize(0)), "#c4b5fd");

    hmG.append("text").attr("x",hmIW/2).attr("y",hmIH+62).attr("text-anchor","middle")
        .attr("fill","#94a3b8").attr("font-size","11px").attr("font-family","sans-serif")
        .text("Mental Health Condition");
    hmG.append("text").attr("transform","rotate(-90)").attr("x",-hmIH/2).attr("y",-115)
        .attr("text-anchor","middle").attr("fill","#94a3b8").attr("font-size","11px")
        .attr("font-family","sans-serif").text("Genre");

    hmG.selectAll("rect.cell").data(hmData).enter().append("rect").attr("class","cell")
        .attr("x",function(d){ return hmX(d.mh); })
        .attr("y",function(d){ return hmY(d.genre); })
        .attr("width",hmX.bandwidth()).attr("height",hmY.bandwidth())
        .attr("fill",function(d){ return hmCol(d.lift); }).attr("rx",3);

    // legend
    const lgH=Math.min(hmIH*0.7,180), lgX=hmIW+30, lgY=(hmIH-lgH)/2;
    const grad=svg.append("defs").append("linearGradient").attr("id","hmGrad")
        .attr("x1","0%").attr("x2","0%").attr("y1","0%").attr("y2","100%");
    [[0,"0%"],[0.5,"50%"],[1,"100%"]].forEach(function(s){
        grad.append("stop").attr("offset",s[1]).attr("stop-color",d3.interpolateRdYlGn(s[0]));
    });
    hmG.append("rect").attr("x",lgX).attr("y",lgY).attr("width",14).attr("height",lgH).style("fill","url(#hmGrad)");
    styleAxis(hmG.append("g").attr("transform","translate("+(lgX+14)+","+lgY+")")
        .call(d3.axisRight(d3.scaleLinear().domain([-absMax,absMax]).range([lgH,0])).ticks(5).tickFormat(d3.format("+.1f"))));
    hmG.append("text").attr("x",lgX+7).attr("y",lgY-18).attr("text-anchor","middle")
        .attr("fill","#fca5a5").attr("font-size","9px").attr("font-family","sans-serif").text("▲ Higher");
    hmG.append("text").attr("x",lgX+7).attr("y",lgY+lgH+14).attr("text-anchor","middle")
        .attr("fill","#6ee7b7").attr("font-size","9px").attr("font-family","sans-serif").text("▼ Lower");

    //Grouped bar chart by genre and Mental health
    const barG = svg.append("g").attr("transform","translate("+barM.l+","+(hmH+barM.t)+")");

    //Aggregate MH means per genre
    const stats = d3.nest().key(function(d){ return d["Fav genre"]; })
        .rollup(function(v){
            var o = { n:v.length };
            mhDims.forEach(function(m){ o[m] = d3.mean(v,function(d){ return d[m]; }); });
            return o;
        }).entries(data)
        .sort(function(a,b){ return b.value.Anxiety - a.value.Anxiety; });

    //Scaling
        const xG = d3.scaleBand().domain(stats.map(function(d){ return d.key; }))
        .range([0,barIW]).paddingInner(0.25).paddingOuter(0.1);
    const xM = d3.scaleBand().domain(mhDims).range([0,xG.bandwidth()]).padding(0.06);
    const yB = d3.scaleLinear().domain([0,10]).range([barIH,0]).nice();
    
    //Improving readability
    barG.append("g").call(d3.axisLeft(yB).ticks(5).tickSize(-barIW).tickFormat(""))
        .call(function(g){ g.select(".domain").remove(); })
        .call(function(g){ g.selectAll(".tick line").attr("stroke","#2d3154").attr("stroke-dasharray","3,3"); });

    const xAxisG = barG.append("g").attr("transform","translate(0,"+barIH+")")
        .call(d3.axisBottom(xG).tickSize(0))
        .call(function(g){ g.select(".domain").attr("stroke","#2d3154"); });
    xAxisG.selectAll("text").attr("transform","rotate(-35)").attr("text-anchor","end")
        .attr("dy","0.35em").attr("dx","-0.5em")
        .attr("fill","#c4b5fd").attr("font-size","11px").attr("font-family","sans-serif");

    styleAxis(barG.append("g").call(d3.axisLeft(yB).ticks(5))
        .call(function(g){ g.select(".domain").attr("stroke","#2d3154"); })
        .call(function(g){ g.selectAll(".tick line").attr("stroke","#2d3154"); }));
   
    //labels
    barG.append("text").attr("x",barIW/2).attr("y",barIH+92).attr("text-anchor","middle")
        .attr("fill","#94a3b8").attr("font-size","11px").attr("font-family","sans-serif")
        .text("Favorite Genre  (sorted by avg Anxiety desc)");
    barG.append("text").attr("transform","rotate(-90)").attr("x",-barIH/2).attr("y",-48)
        .attr("text-anchor","middle").attr("fill","#94a3b8").attr("font-size","11px")
        .attr("font-family","sans-serif").text("Average Score  (0–10)");
    
    //Flatten data for join
    const barData = stats.flatMap(function(e){
        return mhDims.map(function(m){ return { genre:e.key, dim:m, val:e.value[m] }; });
    });

    //rect/genre x dim
    barG.selectAll("rect.bar").data(barData).enter().append("rect").attr("class","bar")
        .attr("x",function(d){ return xG(d.genre)+xM(d.dim); })
        .attr("y",function(d){ return yB(d.val); })
        .attr("width",xM.bandwidth())
        .attr("height",function(d){ return barIH-yB(d.val); })
        .attr("fill",function(d){ return mhColors[d.dim]; })
        .attr("rx",2).attr("opacity",0.85);

    //Legend
    mhDims.forEach(function(m,i){
        barG.append("rect").attr("x",barIW-80).attr("y",4+i*18)
            .attr("width",10).attr("height",10).attr("fill",mhColors[m]).attr("rx",2);
        barG.append("text").attr("x",barIW-66).attr("y",13+i*18)
            .attr("fill","#94a3b8").attr("font-size","10px").attr("font-family","sans-serif").text(m);
    });

    //Sankey
    const skG = svg.append("g").attr("transform","translate("+(half+skM.l)+","+(hmH+skM.t)+")");

    //Seperating anxiety into low mid and high
    function anxBracket(v) {
        return v <= 3 ? "Low Anxiety" : v <= 6 ? "Mid Anxiety" : "High Anxiety";
    }
    
    //build nodes
    const genres   = Array.from(new Set(data.map(function(d){ return d["Fav genre"]; }))).sort();
    const brackets = ["Low Anxiety","Mid Anxiety","High Anxiety"];
    const effects  = ["Improve","No effect","Worsen"];
    const nodeNames= genres.concat(brackets).concat(effects);
    
    //Index map
    const nodeIdx  = {};
    nodeNames.forEach(function(n,i){ nodeIdx[n]=i; });

    //link stages
    const linkMap = {};
    data.forEach(function(d) {
        var g=d["Fav genre"], b=anxBracket(d.Anxiety), e=d["Music effects"];
        if (!effects.includes(e)) return;
        //genre -> anxiety
        linkMap[g+"|"+b] = (linkMap[g+"|"+b]||0) + 1;
        //anxiety -> music
        linkMap[b+"|"+e] = (linkMap[b+"|"+e]||0) + 1;
    });

    //convert to sankey
    const skLinks = Object.keys(linkMap).map(function(k) {
        var p=k.split("|");
        return { source:nodeIdx[p[0]], target:nodeIdx[p[1]], value:linkMap[k] };
    });

    const skNodes = nodeNames.map(function(n){ return { name:n }; });

    const effectColors = { "Improve":"#4ade80", "No effect":"#94a3b8", "Worsen":"#f87171" };
    function nodeColor(name) {
        if (effectColors[name])    return effectColors[name];
        if (brackets.includes(name)) return "#6366f1";
        return palette[genres.indexOf(name) % palette.length];
    }

    const sankey = d3.sankey()
        .nodeWidth(14).nodePadding(6)
        .extent([[0,0],[skIW,skIH]]);

    const graph = sankey({ nodes:skNodes, links:skLinks });

    //draw paths
    skG.selectAll("path.sk-link").data(graph.links).enter().append("path")
        .attr("class","sk-link")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke-width", function(d){ return Math.max(1,d.width); })
        .attr("stroke", function(d){ return nodeColor(d.source.name); })
        .attr("fill","none").attr("opacity",0.3);

    //draw rectangles
    skG.selectAll("rect.sk-node").data(graph.nodes).enter().append("rect")
        .attr("class","sk-node")
        .attr("x",function(d){ return d.x0; }).attr("y",function(d){ return d.y0; })
        .attr("width",function(d){ return d.x1-d.x0; })
        .attr("height",function(d){ return Math.max(1,d.y1-d.y0); })
        .attr("fill",function(d){ return nodeColor(d.name); }).attr("rx",2);

    //labels
    skG.selectAll("text.sk-label").data(graph.nodes).enter().append("text")
        .attr("class","sk-label")
        .attr("x",function(d){ return genres.includes(d.name) ? d.x0-4 : d.x1+4; })
        .attr("y",function(d){ return (d.y0+d.y1)/2; })
        .attr("dy","0.35em")
        .attr("text-anchor",function(d){ return genres.includes(d.name) ? "end" : "start"; })
        .attr("font-size","9px").attr("fill","#e2e8f0").attr("font-family","sans-serif")
        .text(function(d){ return d.name; });

    [["Genre",0],["Anxiety Level",skIW/2],["Music Effect",skIW]].forEach(function(h){
        skG.append("text").attr("x",h[1]).attr("y",-10).attr("text-anchor","middle")
            .attr("fill","#64748b").attr("font-size","10px").attr("font-family","sans-serif").text(h[0]);
    });

});
