// --- Shared spacing constants ---
const TOP_MARGIN   = 40;   // room for chart title
const BOT_MARGIN   = 60;   // tick labels + axis label combined
const LEFT_MARGIN  = 180;  // wide enough for job title tick labels
const RIGHT_MARGIN = 50;   // small buffer for value labels spilling past bars
const LEGEND_W     = 140;  // chart 2 only: right-side colorbar legend
const AXIS_LBL     = 20;   // offset for rotated axis label text

// --- Shared tooltip ---
const tooltip = d3.select("#tooltip");

function tipShow(html, event) {
    tooltip.html(html).style("opacity", 1);
    tipMove(event);
}
function tipMove(event) {
    tooltip
        .style("left", (event.clientX + 14) + "px")
        .style("top",  (event.clientY - 28) + "px");
}
function tipHide() {
    tooltip.style("opacity", 0);
}

// --- Shared color scales ---
const expLabels = { EN: "Entry", MI: "Mid", SE: "Senior", EX: "Executive" };
const expOrder  = ["EN", "MI", "SE", "EX"];
const expColor  = d3.scaleOrdinal().domain(expOrder)
                    .range(["#4e79a7","#f28e2b","#59a14f","#e15759"]);

// --- Load data ---
d3.csv("ds_salaries/ds_salaries.csv", d => ({
    work_year:      +d.work_year,
    experience_level: d.experience_level,
    employment_type:  d.employment_type,
    job_title:        d.job_title,
    salary_in_usd:  +d.salary_in_usd,
    remote_ratio:   +d.remote_ratio,
    company_size:     d.company_size,
    company_location: d.company_location,
})).then(data => {
    drawBarChart(data);
    drawHeatmap(data);
    drawSankey(data);
});

// ===
// VIEW 1 - Bar chart: avg salary by top-10 job title (Overview)
// ===
function drawBarChart(data) {
    const TRANSITION_MS = 250;

    const container = document.getElementById("view1");
    const W = container.clientWidth, H = container.clientHeight;
    const margin = { top: TOP_MARGIN, right: RIGHT_MARGIN, bottom: BOT_MARGIN, left: LEFT_MARGIN };
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    const svg = d3.select("#chart1")
        .attr("viewBox", `0 0 ${W} ${H}`);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // aggregate: avg salary per job title, keep top 10 by row count
    const rollup = d3.rollup(data, v => d3.mean(v, d => d.salary_in_usd), d => d.job_title);
    const counts = d3.rollup(data, v => v.length, d => d.job_title);
    const top10 = Array.from(rollup, ([title, avg]) => ({ title, avg, n: counts.get(title) }))
        .sort((a, b) => b.n - a.n).slice(0, 10)
        .sort((a, b) => b.avg - a.avg);

    const x = d3.scaleLinear().domain([0, d3.max(top10, d => d.avg)]).range([0, w]).nice();
    const y = d3.scaleBand().domain(top10.map(d => d.title)).range([0, h]).padding(0.25);

    // gridlines
    g.append("g").attr("class","grid")
        .call(d3.axisBottom(x).tickSize(h).tickFormat(""))
        .call(gg => gg.select(".domain").remove())
        .call(gg => gg.selectAll("line").attr("stroke","#e0e0e0"));

    // axes
    g.append("g").attr("transform",`translate(0,${h})`).call(d3.axisBottom(x).tickFormat(d => `$${d3.format("~s")(d)}`));
    g.append("g").call(d3.axisLeft(y));

    // bars
    g.selectAll("rect").data(top10).join("rect")
        .attr("x", 0)
        .attr("y", d => y(d.title))
        .attr("width", d => x(d.avg))
        .attr("height", y.bandwidth())
        .attr("fill", "#4e79a7")
        .attr("rx", 8)
        .attr("opacity", 1)
        .style("cursor", "pointer")
        .on("mouseover", (event, d) => {
            d3.select(event.currentTarget).transition().duration(TRANSITION_MS).attr("opacity", 0.75);
            tipShow(`<strong>${d.title}</strong><br/>Avg: $${d3.format(",.0f")(d.avg)} | ${d.n} jobs`, event);
        })
        .on("mousemove", tipMove)
        .on("mouseout", (event, d) => {
            d3.select(event.currentTarget).transition().duration(TRANSITION_MS).attr("opacity", 1);
            tipHide();
        });

    // value labels
    g.selectAll(".val-label").data(top10).join("text")
        .attr("class","val-label")
        .attr("x", d => x(d.avg) + 4)
        .attr("y", d => y(d.title) + y.bandwidth() / 2 + 4)
        .attr("font-size", "11px")
        .attr("fill", "#555")
        .text(d => `$${d3.format(",.0f")(d.avg)}`);

    // title
    svg.append("text").attr("x", W/2).attr("y", 28)
        .attr("text-anchor","middle").attr("font-size","14px").attr("font-weight","bold")
        .text("Overview: Avg Salary by Job Title (Top 10 Roles)");

    // axis labels
    g.append("text").attr("x", w/2).attr("y", h + 45)
        .attr("text-anchor","middle").attr("font-size","12px")
        .text("Average Salary (USD)");
    g.append("text").attr("transform","rotate(-90)")
        .attr("x", -h/2).attr("y", -140)
        .attr("text-anchor","middle").attr("font-size","12px")
        .text("Job Title");
}

// ===
// VIEW 2 - Heatmap: median salary by job title x experience level (Focus)
// ===
function drawHeatmap(data) {
    const TRANSITION_MS = 250;

    const container = document.getElementById("view2");
    const W = container.clientWidth, H = container.clientHeight;
    const margin = { top: TOP_MARGIN, right: LEGEND_W, bottom: BOT_MARGIN, left: LEFT_MARGIN };
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    const svg = d3.select("#chart2")
        .attr("viewBox", `0 0 ${W} ${H}`);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // top 10 job titles by count
    const counts = d3.rollup(data, v => v.length, d => d.job_title);
    const top10titles = Array.from(counts, ([title, n]) => ({ title, n }))
        .sort((a, b) => b.n - a.n).slice(0, 10).map(d => d.title);

    const filtered = data.filter(d => top10titles.includes(d.job_title));

    // compute median salary per (title, experience) cell
    const medianMap = d3.rollup(
        filtered,
        v => d3.median(v, d => d.salary_in_usd),
        d => d.job_title,
        d => d.experience_level
    );

    // flatten to array of cells
    const cells = [];
    top10titles.forEach(title => {
        expOrder.forEach(exp => {
            const val = medianMap.get(title)?.get(exp);
            cells.push({ title, exp, val });
        });
    });

    const x = d3.scaleBand().domain(expOrder).range([0, w]).padding(0.05);
    const y = d3.scaleBand().domain(top10titles).range([0, h]).padding(0.05);

    const allVals = cells.filter(d => d.val != null).map(d => d.val);
    const color = d3.scaleSequential(d3.interpolateYlOrRd)
        .domain([d3.min(allVals), d3.max(allVals)]);

    // one <g> per cell so rect + label scale together
    const bw = x.bandwidth(), bh = y.bandwidth();

    const cellGs = g.selectAll(".cell-g").data(cells).join("g")
        .attr("class", "cell-g")
        .attr("transform", d => `translate(${x(d.exp)},${y(d.title)})`)
        .style("cursor", d => d.val != null ? "pointer" : "default")
        .on("mouseover", (event, d) => {
            if (d.val == null) return;
            d3.select(event.currentTarget).raise()
                .transition().duration(TRANSITION_MS)
                .attr("transform", `translate(${x(d.exp) + bw / 2},${y(d.title) + bh / 2}) scale(1.2) translate(${-bw / 2},${-bh / 2})`);
            tipShow(`<strong>${d.title}</strong> (${expLabels[d.exp]})<br/>Median: $${d3.format(",.0f")(d.val)}`, event);
        })
        .on("mousemove", (event, d) => { if (d.val != null) tipMove(event); })
        .on("mouseout", (event, d) => {
            if (d.val == null) return;
            d3.select(event.currentTarget)
                .transition().duration(TRANSITION_MS)
                .attr("transform", `translate(${x(d.exp)},${y(d.title)})`);
            tipHide();
        });

    cellGs.append("rect")
        .attr("width", bw).attr("height", bh)
        .attr("rx", 3)
        .attr("fill", d => d.val != null ? color(d.val) : "#eee");

    cellGs.filter(d => d.val != null).append("text")
        .attr("x", bw / 2).attr("y", bh / 2 + 4)
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("pointer-events", "none")
        .attr("fill", d => d.val > d3.mean(allVals) ? "#fff" : "#333")
        .text(d => `$${d3.format("~s")(d.val)}`);

    // x axis - experience labels
    g.append("g").attr("transform", `translate(0,${h})`)
        .call(d3.axisBottom(x).tickFormat(d => expLabels[d]))
        .call(gg => gg.select(".domain").remove());

    // y axis - job titles
    g.append("g").call(d3.axisLeft(y))
        .call(gg => gg.select(".domain").remove());

    // title
    svg.append("text").attr("x", W / 2).attr("y", 28)
        .attr("text-anchor", "middle").attr("font-size", "14px").attr("font-weight", "bold")
        .text("Focus: Median Salary by Job Title & Experience Level");

    // axis labels
    g.append("text").attr("x", w / 2).attr("y", h + 40)
        .attr("text-anchor", "middle").attr("font-size", "12px")
        .text("Experience Level");
    g.append("text").attr("transform", "rotate(-90)")
        .attr("x", -h / 2).attr("y", -120)
        .attr("text-anchor", "middle").attr("font-size", "12px")
        .text("Job Title");

    // color legend (gradient bar)
    const legendW = 100, legendH = 12;
    const legendG = svg.append("g")
        .attr("transform", `translate(${W - margin.right + 10}, ${margin.top})`);

    const defs = svg.append("defs");
    const grad = defs.append("linearGradient").attr("id", "salary-gradient");
    grad.selectAll("stop")
        .data(d3.ticks(0, 1, 10))
        .join("stop")
        .attr("offset", d => `${d * 100}%`)
        .attr("stop-color", d => color(d3.min(allVals) + d * (d3.max(allVals) - d3.min(allVals))));

    legendG.append("rect")
        .attr("width", legendW).attr("height", legendH)
        .attr("rx", 2)
        .style("fill", "url(#salary-gradient)");

    legendG.append("text").attr("x", 0).attr("y", -4)
        .attr("font-size", "10px").attr("fill", "#555")
        .text(`$${d3.format("~s")(d3.min(allVals))}`);
    legendG.append("text").attr("x", legendW).attr("y", -4)
        .attr("text-anchor", "end").attr("font-size", "10px").attr("fill", "#555")
        .text(`$${d3.format("~s")(d3.max(allVals))}`);
    legendG.append("text").attr("x", legendW / 2).attr("y", legendH + 14)
        .attr("text-anchor", "middle").attr("font-size", "11px").attr("font-weight", "bold")
        .text("Median Salary");
}

// ===
// VIEW 3 - Sankey: Experience -> Company Size -> Salary Range (Advanced)
// ===
function drawSankey(data) {
    const TRANSITION_MS = 250;

    // links
    const REST_LINK   = 0.6;   // normal resting stroke-opacity
    const FADE_LINK   = 0.2;   // faded (unrelated) stroke-opacity
    const ACTIVE_LINK = 0.85;  // directly hovered band
    const HOVER_LINK  = 0.75;  // bands connected to hovered node
    // nodes
    const REST_NODE   = 1.0;   // normal resting opacity
    const FADE_NODE   = 0.6;   // faded (unrelated) opacity
    const HOVER_NODE  = 1.0;   // active/connected node opacity
    // labels
    const REST_LABEL  = 1.0;   // normal resting opacity
    const FADE_LABEL  = 0.6;   // faded (unrelated) opacity
    const HOVER_LABEL = 1.0;   // active/connected label opacity

    const container = document.getElementById("view3");
    const W = container.clientWidth, H = container.clientHeight;
    const margin = { top: 60, right: 90, bottom: 30, left: 90 };
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    const svg = d3.select("#chart3").attr("viewBox", `0 0 ${W} ${H}`);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // salary bracket helper
    const brackets = ["> $150k", "$75k-$150k", "< $75k"];
    const getBracket = s => s >= 150000 ? brackets[0] : s >= 75000 ? brackets[1] : brackets[2];

    const sizeOrder = ["L", "M", "S"];
    const sizeLabel = { S: "Small", M: "Medium", L: "Large" };

    // nodes: 4 exp + 3 size + 3 bracket = 10
    const allNodes = [
        ...[...expOrder].reverse().map(id => ({ id, label: expLabels[id], col: 0 })),
        ...sizeOrder.map(id => ({ id, label: sizeLabel[id], col: 1 })),
        ...brackets.map(id => ({ id, label: id, col: 2 })),
    ];
    const idx = Object.fromEntries(allNodes.map((n, i) => [n.id, i]));

    // aggregate link counts
    const expSizeCount = {}, sizeBktCount = {};
    data.forEach(d => {
        const es = `${d.experience_level}__${d.company_size}`;
        const sb = `${d.company_size}__${getBracket(d.salary_in_usd)}`;
        expSizeCount[es] = (expSizeCount[es] || 0) + 1;
        sizeBktCount[sb]  = (sizeBktCount[sb]  || 0) + 1;
    });

    const links = [
        ...Object.entries(expSizeCount).map(([k, v]) => { const [s,t] = k.split("__"); return { source: idx[s], target: idx[t], value: v }; }),
        ...Object.entries(sizeBktCount).map(([k, v]) => { const [s,t] = k.split("__"); return { source: idx[s], target: idx[t], value: v }; }),
    ].sort((a, b) => a.source - b.source || a.target - b.target);

    // sankey layout
    const graph = d3.sankey()
        .nodeWidth(18)
        .nodePadding(12)
        .nodeSort(null)
        .linkSort(null)
        .extent([[0, 0], [w, h]])({
            nodes: allNodes.map(d => ({ ...d })),
            links: links.map(d => ({ ...d })),
        });

    // node colors
    const sizeColor = d3.scaleOrdinal()
        .domain(["S", "M", "L"])
        .range([d3.interpolateGreens(0.3), d3.interpolateGreens(0.55), d3.interpolateGreens(0.8)]);
    const bracketColor = d3.scaleOrdinal()
        .domain(["< $75k", "$75k-$150k", "> $150k"])
        .range([d3.interpolateYlOrRd(0.2), d3.interpolateYlOrRd(0.55), d3.interpolateYlOrRd(0.85)]);
    const nodeColor = d => d.col === 0 ? expColor(d.id) : d.col === 1 ? sizeColor(d.id) : bracketColor(d.id);

    // gradient defs - one per link, blending source -> target node color
    const defs = svg.append("defs");
    graph.links.forEach((link, i) => {
        defs.append("linearGradient")
            .attr("id", `link-grad-${i}`)
            .attr("gradientUnits", "userSpaceOnUse")
            .attr("x1", link.source.x1 + margin.left)
            .attr("x2", link.target.x0 + margin.left)
            .call(grad => {
                grad.append("stop").attr("offset", "0%").attr("stop-color", nodeColor(link.source));
                grad.append("stop").attr("offset", "100%").attr("stop-color", nodeColor(link.target));
            });
    });

    // store selections so hover handlers can cross-reference
    const linkPaths = g.append("g").selectAll("path").data(graph.links).join("path")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("fill", "none")
        .attr("stroke", (d, i) => `url(#link-grad-${i})`)
        .attr("stroke-width", d => Math.max(1, d.width))
        .attr("stroke-opacity", REST_LINK)
        .style("cursor", "pointer");

    const nodeRects = g.append("g").selectAll("rect").data(graph.nodes).join("rect")
        .attr("x", d => d.x0).attr("y", d => d.y0)
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => Math.max(1, d.y1 - d.y0))
        .attr("fill", nodeColor)
        .attr("rx", 2)
        .attr("opacity", REST_NODE);

    const nodeLabels = g.append("g").selectAll("text").data(graph.nodes).join("text")
        .attr("x", d => d.col === 0 ? d.x0 - 6 : d.x1 + 6)
        .attr("y", d => (d.y0 + d.y1) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", d => d.col === 0 ? "end" : "start")
        .attr("font-size", "11px")
        .attr("fill", "#333")
        .attr("opacity", REST_LABEL)
        .text(d => d.label);

    function fadeAll() {
        linkPaths.transition().duration(TRANSITION_MS).attr("stroke-opacity", FADE_LINK);
        nodeRects.transition().duration(TRANSITION_MS).attr("opacity", FADE_NODE);
        nodeLabels.transition().duration(TRANSITION_MS).attr("opacity", FADE_LABEL);
    }
    function restoreAll() {
        linkPaths.transition().duration(TRANSITION_MS).attr("stroke-opacity", REST_LINK);
        nodeRects.transition().duration(TRANSITION_MS).attr("opacity", REST_NODE);
        nodeLabels.transition().duration(TRANSITION_MS).attr("opacity", REST_LABEL).attr("transform", null);
    }

    function scaleLabel(node) {
        const lx = node.col === 0 ? node.x0 - 6 : node.x1 + 6;
        const ly = (node.y0 + node.y1) / 2;
        nodeLabels.filter(n => n === node)
            .transition().duration(TRANSITION_MS)
            .attr("transform", `translate(${lx},${ly}) scale(1.2) translate(${-lx},${-ly})`);
    }

    // link hover - highlight band + connected nodes, fade rest
    linkPaths
        .on("mouseover", (event, d) => {
            fadeAll();
            d3.select(event.currentTarget).transition().duration(TRANSITION_MS).attr("stroke-opacity", ACTIVE_LINK);
            nodeRects.filter(n => n === d.source || n === d.target)
                .transition().duration(TRANSITION_MS).attr("opacity", HOVER_NODE);
            nodeLabels.filter(n => n === d.source || n === d.target)
                .transition().duration(TRANSITION_MS).attr("opacity", HOVER_LABEL);
            scaleLabel(d.source);
            scaleLabel(d.target);
            tipShow(`${d.source.label} -> ${d.target.label}<br/>${d.value.toLocaleString()} people`, event);
        })
        .on("mousemove", tipMove)
        .on("mouseout", () => { restoreAll(); tipHide(); });

    // node hover - highlight connected bands, fade rest
    nodeRects
        .style("cursor", "pointer")
        .on("mouseover", (event, d) => {
            fadeAll();
            d3.select(event.currentTarget).transition().duration(TRANSITION_MS).attr("opacity", HOVER_NODE);
            nodeLabels.filter(n => n === d).transition().duration(TRANSITION_MS).attr("opacity", HOVER_LABEL);
            scaleLabel(d);
            linkPaths.filter(l => l.source === d || l.target === d)
                .transition().duration(TRANSITION_MS).attr("stroke-opacity", HOVER_LINK);
            tipShow(`<strong>${d.label}</strong><br/>${d.value.toLocaleString()} people`, event);
        })
        .on("mousemove", tipMove)
        .on("mouseout", () => { restoreAll(); tipHide(); });

    // column headers (serve as axis labels)
    const colHeaders = ["Experience Level", "Company Size", "Salary Range"];
    [0, 1, 2].forEach(col => {
        const ns = graph.nodes.filter(n => n.col === col);
        const cx = (ns[0].x0 + ns[0].x1) / 2;
        g.append("text").attr("x", cx).attr("y", -18)
            .attr("text-anchor", "middle").attr("font-size", "12px")
            .attr("font-weight", "bold").attr("fill", "#444")
            .text(colHeaders[col]);
    });

    // title
    svg.append("text").attr("x", W / 2).attr("y", 22)
        .attr("text-anchor", "middle").attr("font-size", "14px").attr("font-weight", "bold")
        .text("Advanced: Salary Flow - Experience -> Company Size -> Salary Range");

}
