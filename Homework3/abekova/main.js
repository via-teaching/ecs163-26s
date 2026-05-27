const width = window.innerWidth;
const margin = {top: 30, right: 100, bottom: 50, left: 60};

let globalRawData = [];
const dims = ["studytime", "absences", "G3", "Walc"];
const yP = {};
let xP;
let pcpAxesGroups;
let pcpPathGroup;

d3.csv("./data/student-mat.csv").then(rawData => {
    
    rawData.forEach(d => {
        d.Walc = +d.Walc;    
        d.G3 = +d.G3;        
        d.absences = +d.absences;
        d.studytime = +d.studytime;
    });

    globalRawData = rawData;

    const counts = globalRawData.reduce((s, { Walc }) => (s[Walc] = (s[Walc] || 0) + 1, s), {});
    const barData = Object.keys(counts).map(k => ({ level: +k, count: counts[k] }));

    const svg1 = d3.select("#overview").append("svg").attr("width", width).attr("height", 250);
    const g1 = svg1.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);
    const x1 = d3.scaleBand().domain(barData.map(d => d.level)).range([0, width - 200]).padding(0.3);
    const y1 = d3.scaleLinear().domain([0, d3.max(barData, d => d.count)]).range([150, 0]);

    g1.append("g").attr("transform", "translate(0, 150)").call(d3.axisBottom(x1));
    g1.append("g").call(d3.axisLeft(y1));
    
    const bars = g1.selectAll("rect").data(barData).enter().append("rect")
      .attr("x", d => x1(d.level)).attr("y", d => y1(d.count))
      .attr("width", x1.bandwidth()).attr("height", d => 150 - y1(d.count))
      .attr("fill", "steelblue");

    const brush = d3.brushX()
        .extent([[0, 0], [width - 200, 150]])
        .on("brush end", brushed);

    const brushGroup = g1.append("g")
        .attr("class", "brush")
        .call(brush);

    brushGroup.select(".overlay")
        .style("pointer-events", "all")
        .style("cursor", "text");

    const svg2 = d3.select("#focus").append("svg").attr("width", width).attr("height", 300);
    const g2 = svg2.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);
    const x2 = d3.scaleLinear().domain([1, 5]).range([0, width - 200]);
    const y2 = d3.scaleLinear().domain([0, 20]).range([200, 0]);

    g2.append("g").attr("transform", "translate(0, 200)").call(d3.axisBottom(x2));
    g2.append("g").call(d3.axisLeft(y2));
    
    const circles = g2.selectAll("circle").data(globalRawData).enter().append("circle")
      .attr("cx", d => x2(d.Walc) + (Math.random() - 0.5) * 20).attr("cy", d => y2(d.G3))
      .attr("r", 4).attr("fill", "#69b3a2").style("opacity", 0.5);

    const svg3 = d3.select("#advanced").append("svg").attr("width", width).attr("height", 300);
    const g3 = svg3.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);
    
    dims.forEach(name => { 
        yP[name] = d3.scaleLinear().domain(d3.extent(globalRawData, d => d[name])).range([200, 0]); 
    });
    xP = d3.scalePoint().range([0, width - 200]).domain(dims);

    pcpPathGroup = g3.append("g").attr("class", "pcp-lines");
    
    function path(d) {
        return d3.line()(dims.map(p => [xP(p), yP[p](d[p])]));
    }

    pcpPathGroup.selectAll("path")
      .data(globalRawData)
      .enter().append("path")
      .attr("d", path)
      .style("fill", "none")
      .style("stroke", "#69b3a2")
      .style("opacity", 0.15);

    pcpAxesGroups = g3.selectAll(".axis")
      .data(dims)
      .enter().append("g")
      .attr("class", "axis")
      .attr("transform", d => `translate(${xP(d)})`)
      .each(function(d) { d3.select(this).call(d3.axisLeft(yP[d])); });

    pcpAxesGroups.append("text")
      .attr("y", -10)
      .text(d => d)
      .style("fill", "black")
      .style("text-anchor", "middle");

    function brushed() {
        const selection = d3.event ? d3.event.selection : null;
        let selectedLevels = [];

        if (selection) {
            const [x0, x1Pos] = selection;
            
            x1.domain().forEach(level => {
                const barLeft = x1(level);
                const barRight = barLeft + x1.bandwidth();
                if (barRight >= x0 && barLeft <= x1Pos) {
                    selectedLevels.push(level);
                }
            });
        }

        let filteredData = globalRawData;
        
        if (selection && selectedLevels.length > 0) {
            filteredData = globalRawData.filter(d => selectedLevels.includes(d.Walc));
            
            bars.style("fill", d => selectedLevels.includes(d.level) ? "steelblue" : "#ddd");
            circles.style("fill", d => selectedLevels.includes(d.Walc) ? "#ff6b6b" : "#69b3a2")
                   .style("opacity", d => selectedLevels.includes(d.Walc) ? 0.8 : 0.05);
        } else {
            bars.style("fill", "steelblue");
            circles.style("fill", "#69b3a2").style("opacity", 0.5);
        }

        updatePCP(filteredData);
    }

    function updatePCP(filteredData) {
        dims.forEach(name => {
            const targetExtent = filteredData.length === 0 ? 
                d3.extent(globalRawData, d => d[name]) : 
                d3.extent(filteredData, d => d[name]);
            yP[name].domain(targetExtent);
        });

        pcpAxesGroups.transition().duration(800)
            .each(function(d) { d3.select(this).call(d3.axisLeft(yP[d])); });

        const lines = pcpPathGroup.selectAll("path")
            .data(filteredData, d => d.id || globalRawData.indexOf(d));

        lines.exit().transition().duration(400)
            .style("opacity", 0)
            .remove();

        const enterLines = lines.enter().append("path")
            .style("fill", "none")
            .style("stroke", "#ff6b6b")
            .style("opacity", 0);

        enterLines.merge(lines)
            .transition().duration(800)
            .attr("d", path)
            .style("stroke", filteredData.length === globalRawData.length ? "#69b3a2" : "#ff6b6b")
            .style("opacity", filteredData.length === globalRawData.length ? 0.15 : 0.4);
    }

}).catch(err => {
    console.error("D3 Error:", err);
});