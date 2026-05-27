// VIEW 1 - Bar chart: avg salary by top-10 job title
// INTERACTION 1: Click a bar to select/deselect it.
//   Selected titles filter the heatmap (Filtering transition) and rebuild the Sankey.
function drawBarChart(data) {
    const TRANSITION_MS = 300;

    const container = document.getElementById("view1");
    const W = container.clientWidth, H = container.clientHeight;
    const margin = { top: TOP_MARGIN, right: RIGHT_MARGIN, bottom: BOT_MARGIN, left: LEFT_MARGIN };
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    const svg = d3.select("#chart1").attr("viewBox", `0 0 ${W} ${H}`);
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const rollup = d3.rollup(data, v => d3.mean(v, d => d.salary_in_usd), d => d.job_title);
    const counts = d3.rollup(data, v => v.length, d => d.job_title);
    const top10 = Array.from(rollup, ([title, avg]) => ({ title, avg, n: counts.get(title) }))
        .sort((a, b) => b.n - a.n).slice(0, 10)
        .sort((a, b) => b.avg - a.avg);

    const x = d3.scaleLinear().domain([0, d3.max(top10, d => d.avg)]).range([0, w]).nice();
    const y = d3.scaleBand().domain(top10.map(d => d.title)).range([0, h]).padding(0.25);

    // gridlines
    g.append("g").attr("class", "grid")
        .call(d3.axisBottom(x).tickSize(h).tickFormat(""))
        .call(gg => gg.select(".domain").remove())
        .call(gg => gg.selectAll("line").attr("stroke", "#e0e0e0"));

    g.append("g").attr("transform", `translate(0,${h})`)
        .call(d3.axisBottom(x).tickFormat(d => `$${d3.format("~s")(d)}`));
    g.append("g").call(d3.axisLeft(y));

    function barFill(d) {
        return selectedTitles.size === 0 || selectedTitles.has(d.title) ? "#4e79a7" : "#bbb";
    }
    function barOpacity(d) {
        return selectedTitles.size === 0 || selectedTitles.has(d.title) ? 1 : 0.35;
    }

    const bars = g.selectAll("rect.bar").data(top10).join("rect")
        .attr("class", "bar")
        .attr("x", 0)
        .attr("y", d => y(d.title))
        .attr("width", d => x(d.avg))
        .attr("height", y.bandwidth())
        .attr("fill", "#4e79a7")
        .attr("rx", 8)
        .attr("opacity", 1)
        .style("cursor", "pointer")
        .on("mouseover", (event, d) => {
            d3.select(event.currentTarget)
                .transition().duration(TRANSITION_MS).attr("opacity", 0.65);
            tipShow(
                `<strong>${d.title}</strong><br/>Avg: $${d3.format(",.0f")(d.avg)} | ${d.n} jobs`
                + `<br/><em>Click to ${selectedTitles.has(d.title) ? "deselect" : "select"}</em>`,
                event
            );
        })
        .on("mousemove", tipMove)
        .on("mouseout", (event, d) => {
            d3.select(event.currentTarget)
                .transition().duration(TRANSITION_MS).attr("opacity", barOpacity(d));
            tipHide();
        })
        .on("click", (event, d) => {
            if (selectedTitles.has(d.title)) selectedTitles.delete(d.title);
            else selectedTitles.add(d.title);

            bars.transition().duration(TRANSITION_MS)
                .attr("fill", dd => barFill(dd))
                .attr("opacity", dd => barOpacity(dd));

            const count = selectedTitles.size;
            selHint.text(count === 0
                ? "Click bars to filter heatmap"
                : `${count} title${count > 1 ? "s" : ""} selected - click again to deselect`);

            const active = count === 0
                ? allTop10Titles
                : allTop10Titles.filter(t => selectedTitles.has(t));
            heatmapUpdateFn(active);

            const filteredRows = selectedTitles.size === 0
                ? data
                : data.filter(row => selectedTitles.has(row.job_title));
            sankeyUpdateFn(filteredRows);
        });

    // value labels
    g.selectAll(".val-label").data(top10).join("text")
        .attr("class", "val-label")
        .attr("x", d => x(d.avg) + 4)
        .attr("y", d => y(d.title) + y.bandwidth() / 2 + 4)
        .attr("font-size", "11px")
        .attr("fill", "#555")
        .attr("pointer-events", "none")
        .text(d => `$${d3.format(",.0f")(d.avg)}`);

    svg.append("text").attr("x", W / 2).attr("y", 22)
        .attr("text-anchor", "middle").attr("font-size", "14px").attr("font-weight", "bold")
        .text("Overview: Avg Salary by Job Title (Top 10 Roles)");

    const selHint = svg.append("text").attr("x", W / 2).attr("y", 38)
        .attr("text-anchor", "middle").attr("font-size", "11px")
        .attr("fill", "#888").attr("font-style", "italic")
        .text("Click bars to filter heatmap");

    g.append("text").attr("x", w / 2).attr("y", h + 45)
        .attr("text-anchor", "middle").attr("font-size", "12px")
        .text("Average Salary (USD)");
    g.append("text").attr("transform", "rotate(-90)")
        .attr("x", -h / 2).attr("y", -140)
        .attr("text-anchor", "middle").attr("font-size", "12px")
        .text("Job Title");
}
