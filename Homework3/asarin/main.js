// HW 3, Archita Sarin 921923075
// extending HW2 dashboard with interactions and animated transitions
// interaction 1: brush on scatter --> filters the heatmap to that subset of respondents
// interaction 2: click a sankey node --> filters scatter dots and heatmap to that group
// animation: filtering fade transition on scatter dots and heatmap cells for both interactions
// wanna do 3 graphs: start in the scatter --> overview, click a sankey node to drill into a context group --> advanced,
// the heatmap shows genre breakdown for just those people --> focus and context

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

    /* hw 2 changing to make active for hw 3
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
    */ 

    // shared filter state: either source is the brush or the sankey click, never both at once
    // activeFilter for current subset of rows to show across charts
    // filterSource for which chart set it to label things correctly
    let activeFilter = null;   // null is show all
    let filterSource = null;   // can be brush or sankey or null

    // d3.rollup groups by genre and runs the reducer fn to get avg metrics per group
    // also tossing genres w fewer than 5 ppl so the avgs aren't bad
    // takin in a subset array so the heatmap can adjust on any filter change
    function buildGenreRows(subset) {
        return Array.from(
            d3.rollup(subset, rows => {
                const top = { count: rows.length, genre: rows[0]["Fav genre"] };
                // d3.mean computes the avg of each metric across the rows in the group
                mhMetrics.forEach(k => top[k] = d3.mean(rows, r => r[k]));
                top.mhScore = d3.mean(rows, r => r.mhScore);
                return top;
            }, d => d["Fav genre"]).values()
        )
        .filter(r => r.count >= 5)
        .sort((a, b) => b.mhScore - a.mhScore);
    }

    // flattening the genre rows into one cell per (genre, metric) pair for the heatmap
    function buildHeatCells(genreRows) {
        return genreRows.flatMap(row =>
            mhMetrics.map(k => ({
                genre: row.genre, metric: k,
                value: row[k], count: row.count
            }))
        );
    }

    // keeping refs to the live circle selection and heatmap redraw func
    // so the sankey click func can reach them after both charts are drawn
    let scatterCircles = null;
    let heatmapRedraw = null;

    // scatter --> the overview view, every respondent shows up here
    // interaction 1: brush to select a region and filter heatmap and sankey highlight
    function drawScatter() {
        const [width, height] = panelSize("scatter-panel");
        const svg = resetSvg("#scatter-chart", width, height);
        const m = { top: 50, right: 20, bottom: 40, left: 50 };
        const iw = width - m.left - m.right;
        const ih = height - m.top - m.bottom;

        // subtitle explains the brush interaction
        addTitle(svg,
            "Overview: Age vs Daily Listening Hours",
            "Drag on graph to brush which filters heatmap below and click sankey nodes to filter here too, each dot is one respondent");

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

        // clipPath so dots don't spill outside the plot area
        svg.append("defs").append("clipPath")
            .attr("id", "scatter-clip")
            .append("rect").attr("width", iw).attr("height", ih);

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

        // dot radius scales w the panel so it stays readable on resize
        const r = Math.max(2.5, Math.min(iw, ih) / 120);

        // dots group clipped so nothing pokes out
        const dotsG = g.append("g").attr("clip-path", "url(#scatter-clip)");

        // one circle per respondent, fill = mh score, hover for tooltip
        const circles = dotsG.selectAll("circle").data(scatterData).join("circle")
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

        // store ref so the sankey click handler can update dot opacity
        scatterCircles = circles;

        // helper that applies the current activeFilter to the scatter dots
        // using a transition so dots fade in n out instead of snapping
        // with the same fade used on the heatmap cells for consistency
        function applyFilterToDots(subset) {
            if (!subset) {
                // no filter, fade everything back to default opacity
                circles.transition().duration(350)
                    .attr("opacity", 0.7)
                    .attr("stroke", "none")
                    .attr("stroke-width", 0);
            } else {
                const inSet = new Set(subset);
                // animation: filtering transition --> dots outside the selection fade to near-invisible
                // dots inside stay opaque and get a thin stroke to help them read against the dimmed bg
                circles.transition().duration(350)
                    .attr("opacity", d => inSet.has(d) ? 0.9 : 0.08)
                    .attr("stroke", d => inSet.has(d) ? black : "none")
                    .attr("stroke-width", d => inSet.has(d) ? 0.6 : 0);
            }
        }

        // exposing applyFilterToDots so the sankey can call it when a node is clicked
        // storing it on the circles selection itself as a quick way to share it
        circles._applyFilter = applyFilterToDots;

        // interaction 1: brush
        // d3.brush handles the drag-to-select logic, just respond to the events
        const brush = d3.brush()
            .extent([[0, 0], [iw, ih]])
            .on("brush", brushed)
            .on("end", brushEnded);

        // brush layer on top of dots so it catches the drag
        dotsG.append("g").attr("class", "brush").call(brush);

        // goes off on every mousemove while user drags brush rectangle
        function brushed({ selection }) {
            if (!selection) return;
            // if sankey has an active filter, clear it first so the two dont overlap
            if (filterSource === "sankey") clearSankeyHighlight();

            const [[x0, y0], [x1, y1]] = selection;
            // which dots fall inside the rectangle
            const subset = scatterData.filter(d =>
                x(d.Age) >= x0 && x(d.Age) <= x1 &&
                y(d["Hours per day"]) >= y0 && y(d["Hours per day"]) <= y1
            );

            filterSource = "brush";
            activeFilter = subset;

            // dim/highlight dots immediately --> no transition during drag
            const inSet = new Set(subset);
            circles
                .attr("opacity", d => inSet.has(d) ? 0.9 : 0.1)
                .attr("stroke", d => inSet.has(d) ? black : "none")
                .attr("stroke-width", d => inSet.has(d) ? 0.6 : 0);

            // push the subset to the heatmap so it redraws w animated cells
            if (heatmapRedraw) heatmapRedraw(subset);
        }

        // fires once when the user releases the mouse
        function brushEnded({ selection }) {
            if (!selection) {
                // brush cleared --> reset filter and restore everything
                filterSource = null;
                activeFilter = null;
                circles
                    .attr("opacity", 0.7)
                    .attr("stroke", "none");
                if (heatmapRedraw) heatmapRedraw(null);
            }
        }

        svg.append("text")
            .attr("x", width - 8).attr("y", height - 6)
            .attr("text-anchor", "end")
            .attr("font-size", 8.5).attr("fill", "#888")
            .text("drag to brush, click sankey to filter");
    }

    // ref to the sankey node rects to clear their highlight from outside drawSankey
    let sankeyNodeRects = null;
    // ref to the sankey link paths to reset their opacity on clear
    let sankeyLinkPaths = null;

    // clears any sankey highlight and resets all three charts to full data
    function clearSankeyHighlight() {
        filterSource = null;
        activeFilter = null;
        // reset node rect strokes back to no outline
        if (sankeyNodeRects) {
            sankeyNodeRects
                .attr("stroke", "none")
                .attr("stroke-width", 0);
        }
        // reset link paths back to default dim opacity and original widths
        if (sankeyLinkPaths) {
            sankeyLinkPaths.transition().duration(250)
                .attr("opacity", 0.3)
                .attr("stroke-width", l => Math.max(1, l.width));
        }
        // fade scatter dots back to full opacity w a transition
        if (scatterCircles) {
            scatterCircles.transition().duration(350)
                .attr("opacity", 0.7)
                .attr("stroke", "none")
                .attr("stroke-width", 0);
        }
        // redraw heatmap back to full dataset w animated cells
        if (heatmapRedraw) heatmapRedraw(null);
    }

    // sankey --> the advanced view, tracks ppl from listening context to mh outcome
    // interaction 2: click any node to filter the scatter and heatmap to that group
    function drawSankey() {
        const [width, height] = panelSize("sankey-panel");
        const svg = resetSvg("#sankey-chart", width, height);
        const m = { top: 60, right: 120, bottom: 14, left: 110 };

        addTitle(svg,
            "Advanced: Listening Context to Daily Listening Hours to Mental Health Outcome",
            "Sankey: link width = number of respondents (legend for right, other two are categorical) --> click any node to filter scatter and heatmap, and click again to clear");

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
        const wh = d3.rollup(data, v => v.length, workBucket, hoursBucket);
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

        // running the layout gives us nodes w x0/y0/x1/y1 and links w widths
        const graph = layout({
            nodes: nodeDefs.map((n, i) => ({ ...n, index: i })),
            links: links.map(l => ({ ...l }))
        });

        // sankey links: width = number of respondents, color = target node
        // d3.sankeyLinkHorizontal generates the curved path for each link
        // keeping a ref to linkPaths so the click can highlight connected ones
        const linkPaths = g.append("g").selectAll("path").data(graph.links).join("path")
            .attr("d", d3.sankeyLinkHorizontal())
            .attr("fill", "none")
            .attr("stroke", l => nodeColor(l.target))
            .attr("stroke-width", l => Math.max(1, l.width))
            .attr("opacity", 0.3)
            .on("mouseover", (e, l) => showTip(
                `<strong>${l.source.name} → ${l.target.name}</strong>${l.value} respondents`, e))
            .on("mousemove", moveTip)
            .on("mouseout", hideTip);

        // node rects where the click interaction lives
        // each node maps to a filter predicate on the raw data
        const nodeRects = g.append("g").selectAll("rect").data(graph.nodes).join("rect")
            .attr("x", n => n.x0).attr("y", n => n.y0)
            .attr("width",  n => n.x1 - n.x0)
            .attr("height", n => Math.max(1, n.y1 - n.y0))
            .attr("fill", nodeColor)
            .attr("cursor", "pointer")  // pointer cursor so it's obvious these are clickable
            .on("mouseover", (e, n) => showTip(
                `<strong>${n.name}</strong>Click to filter all charts to this group`, e))
            .on("mousemove", moveTip)
            .on("mouseout", hideTip)
            .on("click", (e, n) => {
                // interaction 2: sankey node click
                // clicking a node filters the scatter and heatmap to only the rows
                // that belong to that node's bucket, toggling off on a second click

                // if this node is already the active filter, clicking it again clears everything
                if (filterSource === "sankey" && activeFilter && activeFilter._sankeyNode === n.name + n.col) {
                    clearSankeyHighlight();
                    return;
                }

                // figure out which rows from the full dataset belong to this node
                // each column uses a different bucket function to classify rows
                let subset;
                if (n.col === 0) {
                    // col 0 = "While working?" --> filter by workBucket value
                    subset = data.filter(d => workBucket(d) === n.name);
                } else if (n.col === 1) {
                    // col 1 = hours per day bucket --> filter by hoursBucket value
                    subset = data.filter(d => hoursBucket(d) === n.name);
                } else {
                    // col 2 = mh impact bucket --> filter by mhBucket value
                    subset = data.filter(d => mhBucket(d) === n.name);
                }

                // tag the subset w the node identity so the toggle check above works
                subset._sankeyNode = n.name + n.col;
                filterSource = "sankey";
                activeFilter = subset;

                // highlight the clicked node w a white outline so it reads as selected
                // reset all nodes first then apply just to the clicked one
                nodeRects
                    .attr("stroke", "none")
                    .attr("stroke-width", 0);
                d3.select(e.currentTarget)
                    .attr("stroke", "#fff")
                    .attr("stroke-width", 2);

                // highlight flow paths connected to the clicked node, dim everything else
                // a link is connected if it touches this node as either source or target
                // this makes the full pathway visible to easily see how flow goes
                linkPaths.transition().duration(250)
                    .attr("opacity", l =>
                        l.source.index === n.index || l.target.index === n.index ? 0.75 : 0.05
                    )
                    .attr("stroke-width", l =>
                        l.source.index === n.index || l.target.index === n.index
                            ? Math.max(2, l.width)   // thicken connected links so they pop
                            : Math.max(1, l.width)
                    );

                // animation: filtering transition on scatter dots
                // same fade pattern as the brush for consistency
                if (scatterCircles) {
                    scatterCircles._applyFilter(subset);
                }

                // animation: heatmap redraws with animated cell fade for the new subset
                if (heatmapRedraw) heatmapRedraw(subset);
            });

        // store ref so clearSankeyHighlight can reset the outlines
        // storing both refs so clearSankeyHighlight can reset outlines and link opacities
        sankeyNodeRects = nodeRects;
        sankeyLinkPaths = linkPaths;

        // node labels: first col on the left of the rect, others on the right
        g.append("g").selectAll("text").data(graph.nodes).join("text")
            .attr("x", n => n.col === 0 ? n.x0 - 5 : n.x1 + 5)
            .attr("y", n => (n.y0 + n.y1) / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", n => n.col === 0 ? "end" : "start")
            .attr("font-size", 10).attr("fill", black)
            .attr("pointer-events", "none")  // labels don't steal clicks from the rects
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

        svg.append("text")
            .attr("x", width - 8).attr("y", height - 6)
            .attr("text-anchor", "end")
            .attr("font-size", 8.5).attr("fill", "#888")
            .text("click a node to filter all charts");
    }

    // heatmap --> the focus view, genre breakdown for whatever filter is currently active
    // hw 3 --> redraws w animated filtering transition when brush or sankey sets a new subset
    // also has pan and zoom so u can inspect individual cells more closely
    function drawHeatmap(subset) {
        const [width, height] = panelSize("heatmap-panel");
        const svg = resetSvg("#heatmap-chart", width, height);
        const m = { top: 50, right: 20, bottom: 50, left: 100 };
        const iw = width - m.left - m.right;
        const ih = height - m.top - m.bottom;

        // subtitle reflects the current filter state so users know what they're looking at
        const subCount = subset ? subset.length : data.length;
        const subLabel = subset && subset.length < data.length
            ? `${subCount} respondents (filtered)`
            : "All respondents";

        addTitle(svg,
            "Focus: Music Genre by Mental Health Metrics",
            `${subLabel} with avg score (0–10) --> brush scatter or click sankey to filter`);

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

        // recompute genre rows for the current subset
        const activeRows = buildGenreRows(subset || data);
        const activeGenres = activeRows.map(r => r.genre);
        const activeCells = buildHeatCells(activeRows);

        // band scales, both axes categorical
        const x = d3.scaleBand().domain(activeGenres).range([0, iw]).padding(0.05);
        const y = d3.scaleBand().domain(mhMetrics).range([0, ih]).padding(0.08);

        // group that holds the heatmap cells, appended directly to g
        const cellsG = g.append("g");

        // one rect per (genre, metric) cell w animated updates
        cellsG.selectAll("rect.cell").data(activeCells, d => d.genre + d.metric)
            .join(
                // animation: new cells fade in from invisible --> filtering transition
                // same fade direction as scatter dots for semantic consistency
                enter => enter.append("rect")
                    .attr("class", "cell")
                    .attr("x", d => x(d.genre))
                    .attr("y", d => y(d.metric))
                    .attr("width",  x.bandwidth())
                    .attr("height", y.bandwidth())
                    .attr("fill", d => mhColor(d.value))
                    .attr("opacity", 0)
                    .call(e => e.transition().duration(350).attr("opacity", 1)),

                // animation: existing cells recolor smoothly as avg values shift
                update => update
                    .call(u => u.transition().duration(350)
                        .attr("x", d => x(d.genre))
                        .attr("y", d => y(d.metric))
                        .attr("width",  x.bandwidth())
                        .attr("height", y.bandwidth())
                        .attr("fill", d => mhColor(d.value))
                        .attr("opacity", 1)),

                // animation: dropped genres fade out before being removed
                // matching the fade in so enter and exit feel like same operation
                exit => exit
                    .call(ex => ex.transition().duration(250)
                        .attr("opacity", 0).remove())
            )
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

        // y axis label rotated
        g.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -ih / 2).attr("y", -88)
            .attr("text-anchor", "middle")
            .attr("font-size", 11).attr("fill", black)
            .text("Mental Health Metric");

        svg.append("text")
            .attr("x", width - 8).attr("y", height - 6)
            .attr("text-anchor", "end")
            .attr("font-size", 8.5).attr("fill", "#888")
            .text("brush scatter or click sankey to filter");
    }

    // heatmapRedraw is the shared hook that both the brush and the sankey click use
    // to push a new subset into the heatmap --> keeping it as a fn ref so either
    // interaction can call it without drawHeatmap being in their direct scope
    heatmapRedraw = (subset) => drawHeatmap(subset);

    // draw all 3 on load and redraw on resize
    function drawAll() {
        drawScatter();
        drawSankey();
        drawHeatmap(null); // null = full dataset on initial load
        // re-wire the redraw hook after each full redraw
        heatmapRedraw = (subset) => drawHeatmap(subset);
    }

    drawAll();

    // debounced resize: only fires once after 120ms of no more resize events
    let resizeT;
    window.addEventListener("resize", () => {
        clearTimeout(resizeT);
        resizeT = setTimeout(drawAll, 120);
    });
});