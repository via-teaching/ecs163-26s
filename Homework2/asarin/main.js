// HW 2, Archita Sarin 921923075
// using the mental health and music dataset
// wanna do 3 graphs: overview w all data points, genres by mental health, and listening context w mental health

// overall color scheme that connects the charts w colors a lot of ppl familiar w
const purple = "#9c6fe4";
const blue   = "#3b82f6";
const green  = "#22c55e";
const yellow = "#fbbf24";
const red    = "#ef4444";
const black  = "#000";

// mh for mental health, makin a linear scale for scatter and heatmap
const mhColor = d3.scaleLinear()
    .domain([0, 2, 4, 6, 8, 10])
    .range([purple, blue, green, yellow, red])
    .clamp(true);

// the 4 mh metrics from the dataset
const mhMetrics = ["Anxiety", "Depression", "Insomnia", "OCD"];

// sankey buckets w discrete colors
const mhBucketColor = {"Low": blue, "Medium": green, "High": yellow, "Very High": red};

// categorical colors for listening context, using d3's built in tableau10 ordinal scale
const cat = d3.scaleOrdinal(d3.schemeTableau10);

// grabbing the tooltip div from the html so we can show stuff on hover
const tooltip = d3.select("#tooltip");

// shows the tooltip near the cursor w whatever html u pass in
function showTip(text, event) {
    tooltip.style("opacity", 1).html(text)
        .style("left", (event.pageX + 10) + "px")
        .style("top",  (event.pageY - 20) + "px");
}
// updates tooltip position as the mouse moves
function moveTip(event) {
    tooltip.style("left", (event.pageX + 10) + "px")
       .style("top",  (event.pageY - 20) + "px");
}
// hides tooltip on mouseout
function hideTip() { tooltip.style("opacity", 0); }

// grabs the panel size so each chart can fit its container
function panelSize(id) {
    const el = document.getElementById(id);
    return [el.clientWidth, el.clientHeight];
}

// clears the svg before redrawing, used for resize too
function resetSvg(sel, w, h) {
    const svg = d3.select(sel);
    // wiping everything inside so we can redraw fresh
    svg.selectAll("*").remove();
    // viewBox keeps the chart scaling w the panel
    svg.attr("viewBox", `0 0 ${w} ${h}`);
    return svg;
}

// title and subtitle in the top left of each chart
function addTitle(svg, title, sub) {
    // main title text in the top left corner
    svg.append("text")
        .attr("x", 14).attr("y", 20)
        .attr("font-size", 12).attr("font-weight", 600)
        .attr("fill", black).text(title);
    // smaller subtitle text right under the title
    svg.append("text")
        .attr("x", 14).attr("y", 33)
        .attr("font-size", 9.5).attr("fill", black).text(sub);
}

// gradient legend for the scatter and heatmap w mhColor
function gradientLegend(svg, id, x, y, w, h) {
    // defs holds reusable svg stuff like gradients
    const stops = svg.append("defs").append("linearGradient")
        .attr("id", id).attr("x1", "0%").attr("x2", "100%");

    // 11 stops from 0 to 1 so the gradient matches the mhColor scale
    stops.selectAll("stop")
        .data(d3.range(0, 1.01, 0.1))
        .join("stop")
        .attr("offset",     d => (d * 100) + "%")
        .attr("stop-color", d => mhColor(d * 10));

    // the actual colored bar that uses the gradient as its fill
    svg.append("rect")
        .attr("x", x).attr("y", y).attr("width", w).attr("height", h)
        .style("fill", `url(#${id})`);

    // "Low" label on the left end of the bar
    svg.append("text")
        .attr("x", x).attr("y", y + 20)
        .attr("font-size", 10).attr("fill", black).text("Low");
    // "High" label on the right end of the bar
    svg.append("text")
        .attr("x", x + w).attr("y", y + 20)
        .attr("text-anchor", "end")
        .attr("font-size", 10).attr("fill", black).text("High");
}

// little colored square w label for the sankey legend
function squares(svg, color, label, x, y) {
    // the colored square itself
    svg.append("rect")
        .attr("x", x).attr("y", y - 7)
        .attr("width", 8).attr("height", 8)
        .attr("rx", 1).attr("fill", color);
    // label sittin to the right of the square
    svg.append("text")
        .attr("x", x + 11).attr("y", y)
        .attr("font-size", 9.5).attr("fill", black).text(label);
}

// bucket fns for the sankey columns, just turning continuous values into a few groups
function workBucket(d) {
    const v = (d["While working"] || "").toLowerCase();
    if (v === "yes") {
         return "Yes";
    }
    else if (v === "sometimes") {
        return "Sometimes";
    }
    else {
        return "No";
    }
}
function hoursBucket(d) {
    if (d["Hours per day"] < 2) {
        return "Light (<2 hrs)";
    }
    else if (d["Hours per day"] <= 4) {
        return "Medium (2-4 hrs)";
    }
    else {
        return "Heavy (4+ hrs)";
    }
}
function mhBucket(d) {
    // dividing the 0-10 mh score into 4 groups
    if (d.mhScore < 3) {
        return "Low";
    }
    else if (d.mhScore < 5) {
        return "Medium";
    }
    else if (d.mhScore < 8) {
        return "High";
    }
    else {
        return "Very High";
    }
}

// d3.csv pulls in the dataset, returns a promise w the parsed rows
// for some parts of this code, i referenced the d3 docs and also used ChatGPT to understand how to apply it and learned from the examples. 
d3.csv("data/mxmh_survey_results.csv").then(raw => {

    // csv loads everything as strings so converting the numeric cols rn
    raw.forEach(d => {
        d.Age = +d.Age;
        d["Hours per day"] = +d["Hours per day"];
        d.Anxiety = +d.Anxiety;
        d.Depression = +d.Depression;
        d.Insomnia = +d.Insomnia;
        d.OCD = +d.OCD;
    });

    // dropping rows w missing or junk values so the charts don't break
    const data = raw.filter(d =>
        d.Age > 0 &&
        isFinite(d["Hours per day"]) &&
        d["Fav genre"] &&
        isFinite(d.Anxiety)
    );

    // composite mh score = avg of the 4 metrics, used for scatter color and sankey buckets
    data.forEach(d => {
        d.mhScore = (d.Anxiety + d.Depression + d.Insomnia + d.OCD) / 4;
    });

    // sortin so high mh dots draw first and end up underneath the lighter ones
    const scatterData = [...data].sort((a, b) => b.mhScore - a.mhScore);

    // d3.rollup groups by genre and runs the reducer fn to get avg metrics per group
    // also tossing genres w fewer than 5 ppl so the avgs aren't bad
    const genreRows = Array.from(
        d3.rollup(data, rows => {
            const top = { count: rows.length, genre: rows[0]["Fav genre"] };
            // d3.mean computes the avg of each metric across the rows in the group
            mhMetrics.forEach(k => top[k] = d3.mean(rows, r => r[k]));
            top.mhScore = d3.mean(rows, r => r.mhScore);
            return top;
        }, d => d["Fav genre"]).values()
    )
    .filter(r => r.count >= 5)
    .sort((a, b) => b.mhScore - a.mhScore);

    const genres = genreRows.map(r => r.genre);

    // flattening the genre rows into one cell per (genre, metric) pair for the heatmap
    const heatCells = genreRows.flatMap(row =>
        mhMetrics.map(k => ({
            genre: row.genre, metric: k,
            value: row[k], count: row.count
        }))
    );

    // scatter --> the overview view, every respondent shows up here
    function drawScatter() {
        const [width, height] = panelSize("scatter-panel");
        const svg = resetSvg("#scatter-chart", width, height);
        const m = { top: 50, right: 20, bottom: 40, left: 50 };
        const iw = width - m.left - m.right;
        const ih = height - m.top - m.bottom;

        addTitle(svg,
            "Overview: Age vs Daily Listening Hours",
            "Each dot is one respondent, colored by composite mental health score");

        // mh score gradient legend in the top right
        gradientLegend(svg, "scatter-grad", width - 104, 14, 90, 7);
        // small "MH Score" caption above the legend
        svg.append("text")
            .attr("x", width - 108).attr("y", 22)
            .attr("font-size", 9).attr("text-anchor", "end")
            .attr("fill", black).text("MH Score");

        // inner group, shifted by the margins so the chart sits inside its area
        const g = svg.append("g")
            .attr("transform", `translate(${m.left},${m.top})`);

        // x = age, y = hours per day, both linear scales
        const x = d3.scaleLinear()
            .domain([10, d3.max(data, d => d.Age) + 2]).range([0, iw]);
        const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d["Hours per day"]) + 0.5]).range([ih, 0]);

        // x axis at the bottom, d3 makes the ticks for us
        g.append("g").attr("transform", `translate(0,${ih})`)
            .call(d3.axisBottom(x).ticks(8));
        // y axis on the left
        g.append("g").call(d3.axisLeft(y).ticks(5));

        // x axis label
        g.append("text")
            .attr("x", iw / 2).attr("y", ih + 34)
            .attr("text-anchor", "middle")
            .attr("font-size", 11).attr("fill", black)
            .text("Age (years)");

        // y axis label, rotated so it reads bottom to top
        g.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -ih / 2).attr("y", -38)
            .attr("text-anchor", "middle")
            .attr("font-size", 11).attr("fill", black)
            .text("Hours Listening / Day");

        // dot radius scales w the panel size so it stays readable on resize
        const r = Math.max(2.5, Math.min(iw, ih) / 120);

        // one circle per respondent, fill = mh score, hover for tooltip
        g.selectAll("circle").data(scatterData).join("circle")
            .attr("cx", d => x(d.Age))
            .attr("cy", d => y(d["Hours per day"]))
            .attr("r", r)
            .attr("fill", d => mhColor(d.mhScore))
            .attr("opacity", 0.7)
            .on("mouseover", (e, d) => showTip(
                `<strong>${d["Fav genre"]}</strong>` +
                `Age ${d.Age} · ${d["Hours per day"]} hrs/day<br>` +
                `MH score: ${d.mhScore.toFixed(1)}`, e))
            .on("mousemove", moveTip)
            .on("mouseout", hideTip);
    }

    // sankey --> the advanced view, tracks ppl from listening context to mh outcome
    function drawSankey() {
        const [width, height] = panelSize("sankey-panel");
        const svg = resetSvg("#sankey-chart", width, height);
        const m = { top: 60, right: 120, bottom: 14, left: 110 };

        addTitle(svg,
            "Advanced: Listening Context to Daily Listening Hours to Mental Health Outcome",
            "Sankey: link width = number of respondents (legend for right column, other two are categorical)");

        // mh bucket legend on the right since that column has the color encoding
        // uses the same palette as the heatmap so the colors match
        const lx = width - 98;
        squares(svg, mhBucketColor["Low"], "Low", lx, 16);
        squares(svg, mhBucketColor["Medium"], "Medium", lx, 29);
        squares(svg, mhBucketColor["High"], "High", lx, 42);
        squares(svg, mhBucketColor["Very High"], "Very High", lx, 55);

        // outer group that holds all the sankey stuff
        const g = svg.append("g");

        // 3 columns of nodes: while working, hours, mh impact
        const nodeDefs = [
            { name: "Yes", col: 0 },
            { name: "Sometimes", col: 0 },
            { name: "No", col: 0 },
            { name: "Light (<2 hrs)", col: 1 },
            { name: "Medium (2-4 hrs)", col: 1 },
            { name: "Heavy (4+ hrs)", col: 1 },
            { name: "Low", col: 2 },
            { name: "Medium", col: 2 },
            { name: "High", col: 2 },
            { name: "Very High", col: 2 }
        ];
        // index lookup using name + col as the key bc "Medium" appears in 2 cols
        const idx = Object.fromEntries(nodeDefs.map((n, i) => [n.name + n.col, i]));

        // d3.rollup counts how many ppl flow between adjacent columns
        const wh = d3.rollup(data, v => v.length, workBucket,  hoursBucket);
        const hm = d3.rollup(data, v => v.length, hoursBucket, mhBucket);

        // turning the rollup maps into the link list that d3.sankey expects
        const links = [];
        wh.forEach((inner, w) => inner.forEach((v, h) =>
            links.push({ source: idx[w + 0], target: idx[h + 1], value: v })));
        hm.forEach((inner, h) => inner.forEach((v, mh) =>
            links.push({ source: idx[h + 1], target: idx[mh + 2], value: v })));

        // mh column uses the shared palette, the other 2 use tableau10
        const nodeColor = n => n.col === 2 ? mhBucketColor[n.name] : cat(n.name);

        // d3.sankey does all the layout math, just gotta give it the extent
        const layout = d3.sankey()
            .nodeWidth(13).nodePadding(11)
            .nodeAlign(d3.sankeyLeft)
            .extent([[m.left, m.top], [width - m.right, height - m.bottom]]);

        // running the layout, gives us back nodes w x0/y0/x1/y1 and links w widths
        const graph = layout({
            nodes: nodeDefs.map((n, i) => ({ ...n, index: i })),
            links: links.map(l => ({ ...l }))
        });

        // sankey links: width = number of respondents, color = where the flow ends up
        // d3.sankeyLinkHorizontal generates the curved path for each link
        g.append("g").selectAll("path").data(graph.links).join("path")
            .attr("d", d3.sankeyLinkHorizontal())
            .attr("fill", "none")
            .attr("stroke", l => nodeColor(l.target))
            .attr("stroke-width", l => Math.max(1, l.width))
            .attr("opacity", 0.3)
            .on("mouseover", (e, l) => showTip(
                `<strong>${l.source.name} → ${l.target.name}</strong>${l.value} respondents`, e))
            .on("mousemove", moveTip)
            .on("mouseout", hideTip);

        // node rects, one per node, height encodes total respondents flowing through
        g.append("g").selectAll("rect").data(graph.nodes).join("rect")
            .attr("x", n => n.x0).attr("y", n => n.y0)
            .attr("width",  n => n.x1 - n.x0)
            .attr("height", n => Math.max(1, n.y1 - n.y0))
            .attr("fill", nodeColor);

        // node labels: first col on the left of the rect, others on the right
        g.append("g").selectAll("text").data(graph.nodes).join("text")
            .attr("x", n => n.col === 0 ? n.x0 - 5 : n.x1 + 5)
            .attr("y", n => (n.y0 + n.y1) / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", n => n.col === 0 ? "end" : "start")
            .attr("font-size", 10).attr("fill", black)
            .text(n => n.name);

        // column headers above each group of nodes so u know what each col means
        ["While Working?", "Hours / Day", "MH Impact"].forEach((label, i) => {
            const node = graph.nodes.find(n => n.col === i);
            g.append("text")
                .attr("x", i === 0 ? node.x0 : node.x1)
                .attr("y", m.top - 10)
                .attr("text-anchor", i === 0 ? "start" : i === 2 ? "end" : "middle")
                .attr("font-size", 10.5).attr("font-weight", 600)
                .attr("fill", black).text(label);
        });
    }

    // heatmap --> the focus view, lets u compare genres against each mh metric
    function drawHeatmap() {
        const [width, height] = panelSize("heatmap-panel");
        const svg = resetSvg("#heatmap-chart", width, height);
        const m = { top: 50, right: 20, bottom: 50, left: 100 };
        const iw = width - m.left - m.right;
        const ih = height - m.top - m.bottom;

        addTitle(svg,
            "Focus: Music Genre by Mental Health Metrics",
            "Average self-reported score (0–10) with genres sorted by composite MH score");

        // gradient legend so u can read the cell colors as actual scores
        gradientLegend(svg, "heatmap-grad", width - 104, 14, 90, 7);
        // small "Avg Score" caption above the legend
        svg.append("text")
            .attr("x", width - 108).attr("y", 22)
            .attr("font-size", 9).attr("text-anchor", "end")
            .attr("fill", black).text("Avg Score");

        // inner group offset by margins
        const g = svg.append("g")
            .attr("transform", `translate(${m.left},${m.top})`);

        // band scales for both axes since the values are categorical
        const x = d3.scaleBand().domain(genres).range([0, iw]).padding(0.05);
        const y = d3.scaleBand().domain(mhMetrics).range([0, ih]).padding(0.08);

        // one rect per (genre, metric) cell, fill = avg score
        g.selectAll("rect").data(heatCells).join("rect")
            .attr("x", d => x(d.genre)).attr("y", d => y(d.metric))
            .attr("width",  x.bandwidth()).attr("height", y.bandwidth())
            .attr("fill", d => mhColor(d.value))
            .on("mouseover", (e, d) => showTip(
                `<strong>${d.genre}</strong>` +
                `${d.metric}: ${d.value.toFixed(2)}<br>` +
                `${d.count} respondents`, e))
            .on("mousemove", moveTip)
            .on("mouseout", hideTip);

        // x axis: genre names along the bottom
        g.append("g").attr("transform", `translate(0,${ih})`)
            .call(d3.axisBottom(x))
            .selectAll("text").attr("fill", black);

        // y axis: the 4 mh metrics on the left
        g.append("g").call(d3.axisLeft(y))
            .selectAll("text").attr("fill", black);

        // x axis label
        g.append("text")
            .attr("x", iw / 2).attr("y", ih + 40)
            .attr("text-anchor", "middle")
            .attr("font-size", 11).attr("fill", black)
            .text("Genre");

        // y axis label, rotated
        g.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -ih / 2).attr("y", -88)
            .attr("text-anchor", "middle")
            .attr("font-size", 11).attr("fill", black)
            .text("Mental Health Metric");
    }

    // draw all 3 and redraw on resize so the dashboard fills the screen properly
    function drawAll() {
        drawScatter();
        drawSankey();
        drawHeatmap();
    }

    drawAll();

    // debounced resize: if u resize the window a bunch only fires once after 120ms
    let resizeT;
    window.addEventListener("resize", () => {
        clearTimeout(resizeT);
        resizeT = setTimeout(drawAll, 120);
    });
});