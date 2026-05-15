const width = window.innerWidth;
const height = window.innerHeight;
const margin = {top: 30, right: 100, bottom: 50, left: 60};


d3.csv("./data/student-mat.csv").then(rawData => {
    
    
    rawData.forEach(d => {
        d.Walc = +d.Walc;    
        d.G3 = +d.G3;        
        d.absences = +d.absences;
        d.studytime = +d.studytime;
    });

    console.log("Data loaded successfully!", rawData);

    
    const counts = rawData.reduce((s, { Walc }) => (s[Walc] = (s[Walc] || 0) + 1, s), {});
    const barData = Object.keys(counts).map(k => ({ level: k, count: counts[k] }));

    const svg1 = d3.select("#overview").append("svg").attr("width", width).attr("height", 250);
    const g1 = svg1.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);
    const x1 = d3.scaleBand().domain(barData.map(d => d.level)).range([0, width - 200]).padding(0.3);
    const y1 = d3.scaleLinear().domain([0, d3.max(barData, d => d.count)]).range([150, 0]);

    g1.append("g").attr("transform", "translate(0, 150)").call(d3.axisBottom(x1));
    g1.append("g").call(d3.axisLeft(y1));
    g1.selectAll("rect").data(barData).enter().append("rect")
      .attr("x", d => x1(d.level)).attr("y", d => y1(d.count))
      .attr("width", x1.bandwidth()).attr("height", d => 150 - y1(d.count)).attr("fill", "steelblue");

   
    const svg2 = d3.select("#focus").append("svg").attr("width", width).attr("height", 300);
    const g2 = svg2.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);
    const x2 = d3.scaleLinear().domain([1, 5]).range([0, width - 200]);
    const y2 = d3.scaleLinear().domain([0, 20]).range([200, 0]);

    g2.append("g").attr("transform", "translate(0, 200)").call(d3.axisBottom(x2));
    g2.append("g").call(d3.axisLeft(y2));
    g2.selectAll("circle").data(rawData).enter().append("circle")
      .attr("cx", d => x2(d.Walc) + (Math.random() - 0.5) * 20).attr("cy", d => y2(d.G3))
      .attr("r", 4).attr("fill", "#69b3a2").style("opacity", 0.5);

    
    const svg3 = d3.select("#advanced").append("svg").attr("width", width).attr("height", 300);
    const g3 = svg3.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);
    const dims = ["studytime", "absences", "G3", "Walc"];
    const yP = {};
    dims.forEach(name => { yP[name] = d3.scaleLinear().domain(d3.extent(rawData, d => d[name])).range([200, 0]); });
    const xP = d3.scalePoint().range([0, width - 200]).domain(dims);

    g3.selectAll("path").data(rawData).enter().append("path")
      .attr("d", d => d3.line()(dims.map(p => [xP(p), yP[p](d[p])])))
      .style("fill", "none").style("stroke", "#69b3a2").style("opacity", 0.1);
    g3.selectAll("axis").data(dims).enter().append("g")
      .attr("transform", d => `translate(${xP(d)})`).each(function(d) { d3.select(this).call(d3.axisLeft(yP[d])); })
      .append("text").attr("y", -10).text(d => d).style("fill", "black").style("text-anchor", "middle");

}).catch(err => {
    console.error("D3 Error:", err);
});