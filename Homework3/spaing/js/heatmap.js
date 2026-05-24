// VIEW 2 - Heatmap: median salary by job title x experience level
// ANIMATED TRANSITION (Filtering): rows for deselected titles fade out and are
//   removed; remaining rows slide to new y-positions as the band scale expands;
//   newly added rows fade in. Returns an update(titles) function.
function initHeatmap(data) {
    const TRANSITION_MS = 600;

    const container = document.getElementById("view2");
    const W = container.clientWidth, H = container.clientHeight;
    const margin = { top: TOP_MARGIN, right: LEGEND_W, bottom: BOT_MARGIN, left: LEFT_MARGIN };
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    const svg = d3.select("#chart2").attr("viewBox", `0 0 ${W} ${H}`);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // precompute medians for all job titles (needed for lookups when filter changes)
    const medianMap = d3.rollup(
        data,
        v => d3.median(v, d => d.salary_in_usd),
        d => d.job_title,
        d => d.experience_level
    );
    // color domain uses only the top-10 titles so outlier titles don't stretch the range
    const top10Vals = allTop10Titles.flatMap(title =>
        expOrder.map(exp => medianMap.get(title)?.get(exp))
    ).filter(v => v != null);
    const color = d3.scaleSequential(d3.interpolateBuPu)
        .domain([d3.min(top10Vals), d3.max(top10Vals)]);
    const meanVal = d3.mean(top10Vals);

    const x = d3.scaleBand().domain(expOrder).range([0, w]).padding(0.05);
    const y = d3.scaleBand().range([0, h]).padding(0.05); // domain set in update()

    const maxBandH = 100; // adjust for visual sweet spot

    // static x axis
    g.append("g").attr("class", "x-axis").attr("transform", `translate(0,${h})`)
        .call(d3.axisBottom(x).tickFormat(d => expLabels[d]))
        .call(gg => gg.select(".domain").remove());

    // y axis (updated by transition each call)
    const yAxisG = g.append("g").attr("class", "y-axis");

    // cells group
    const cellsG = g.append("g").attr("class", "cells");

    svg.append("text").attr("x", W / 2).attr("y", 22)
        .attr("text-anchor", "middle").attr("font-size", "14px").attr("font-weight", "bold")
        .text("Focus: Median Salary by Job Title & Experience Level");
    svg.append("text").attr("x", W / 2).attr("y", 38)
        .attr("text-anchor", "middle").attr("font-size", "11px")
        .attr("fill", "#888").attr("font-style", "italic")
        .text("Filters with animation when bar chart selection changes");

    g.append("text").attr("x", w / 2).attr("y", h + 40)
        .attr("text-anchor", "middle").attr("font-size", "12px")
        .text("Experience Level");
    g.append("text").attr("transform", "rotate(-90)")
        .attr("x", -h / 2).attr("y", -140)
        .attr("text-anchor", "middle").attr("font-size", "12px")
        .text("Job Title");

    // color legend
    const legendW = 100, legendH = 12;
    const legendG = svg.append("g")
        .attr("transform", `translate(${W - margin.right + 10}, ${margin.top})`);
    const defs = svg.append("defs");
    const grad = defs.append("linearGradient").attr("id", "salary-gradient");
    grad.selectAll("stop").data(d3.ticks(0, 1, 10)).join("stop")
        .attr("offset", d => `${d * 100}%`)
        .attr("stop-color", d => color(d3.min(top10Vals) + d * (d3.max(top10Vals) - d3.min(top10Vals))));
    legendG.append("rect").attr("width", legendW).attr("height", legendH)
        .attr("rx", 2).style("fill", "url(#salary-gradient)");
    legendG.append("text").attr("x", 0).attr("y", -4)
        .attr("font-size", "10px").attr("fill", "#555")
        .text(`$${d3.format("~s")(d3.min(top10Vals))}`);
    legendG.append("text").attr("x", legendW).attr("y", -4)
        .attr("text-anchor", "end").attr("font-size", "10px").attr("fill", "#555")
        .text(`$${d3.format("~s")(d3.max(top10Vals))}`);
    legendG.append("text").attr("x", legendW / 2).attr("y", legendH + 14)
        .attr("text-anchor", "middle").attr("font-size", "11px").attr("font-weight", "bold")
        .text("Median Salary");

    // --- Update function (called by bar chart on selection change) ---
    return function update(titles) {
        const oldBh = y.bandwidth(); // capture before domain changes
        // cap range so rows don't grow beyond full-10 bandwidth
        const n = titles.length;
        const cappedRange = Math.min(h, (maxBandH / 0.95) * (n + 0.05));
        const yOffset = (h - cappedRange) / 2;
        y.range([0, cappedRange]).domain(titles);
        const bw = x.bandwidth(), bh = y.bandwidth();

        const cells = titles.flatMap(title =>
            expOrder.map(exp => ({
                title, exp,
                val: medianMap.get(title)?.get(exp) ?? null,
            }))
        );

        // animate y axis and cells group to new domain + vertical center
        yAxisG.transition().duration(TRANSITION_MS)
            .attr("transform", `translate(0,${yOffset})`)
            .call(d3.axisLeft(y))
            .call(gg => gg.select(".domain").remove());
        cellsG.transition().duration(TRANSITION_MS)
            .attr("transform", `translate(0,${yOffset})`);

        const join = cellsG.selectAll(".cell-g")
            .data(cells, d => `${d.title}_${d.exp}`);

        // EXIT: collapse rect toward its vertical center while fading out
        const exitT = join.exit().transition().duration(TRANSITION_MS * 0.4);
        exitT.style("opacity", 0).remove();
        exitT.select("rect").attr("y", oldBh / 2).attr("height", 0);

        // ENTER: new cells start invisible at their target position
        const entering = join.enter().append("g")
            .attr("class", "cell-g")
            .style("opacity", 0)
            .attr("transform", d => `translate(${x(d.exp)},${y(d.title)})`);

        entering.append("rect").attr("rx", 3);
        entering.append("text")
            .attr("text-anchor", "middle")
            .attr("font-size", "10px")
            .attr("pointer-events", "none");

        const merged = entering.merge(join);

        // UPDATE + ENTER: slide to new position and fade in (simultaneous with exit)
        merged.transition().duration(TRANSITION_MS)
            .style("opacity", 1)
            .attr("transform", d => `translate(${x(d.exp)},${y(d.title)})`);

        merged.select("rect")
            .attr("fill", d => d.val != null ? color(d.val) : "#eee")
            .transition().duration(TRANSITION_MS)
            .attr("width", bw)
            .attr("height", bh);

        merged.select("text")
            .attr("fill", d => d.val != null && d.val > meanVal ? "#fff" : "#333")
            .text(d => d.val != null ? `$${d3.format("~s")(d.val)}` : "")
            .transition().duration(TRANSITION_MS)
            .attr("x", bw / 2)
            .attr("y", bh / 2 + 4);

        // re-attach hover so the scale animation uses current bw/bh
        merged
            .style("cursor", d => d.val != null ? "pointer" : "default")
            .on("mouseover", (event, d) => {
                if (d.val == null) return;
                d3.select(event.currentTarget).raise()
                    .transition().duration(250)
                    .attr("transform",
                        `translate(${x(d.exp) + bw / 2},${y(d.title) + bh / 2})`
                        + ` scale(1.15)`
                        + ` translate(${-bw / 2},${-bh / 2})`);
                tipShow(
                    `<strong>${d.title}</strong> (${expLabels[d.exp]})`
                    + `<br/>Median: $${d3.format(",.0f")(d.val)}`,
                    event
                );
            })
            .on("mousemove", (event, d) => { if (d.val != null) tipMove(event); })
            .on("mouseout", (event, d) => {
                if (d.val == null) return;
                d3.select(event.currentTarget)
                    .transition().duration(250)
                    .attr("transform", `translate(${x(d.exp)},${y(d.title)})`);
                tipHide();
            });
    };
}
