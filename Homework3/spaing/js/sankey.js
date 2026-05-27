// VIEW 3 - Sankey: Experience -> Company Size -> Salary Range -> Work Mode
// INTERACTION 2: Pan and Zoom (scroll, drag, double-click to reset).
//   Returns an update(filteredData) function that rebuilds the layout
//   from a filtered dataset and animates node heights and band widths
//   in place (Timestep transition).
function drawSankey(data) {
    const TRANSITION_MS = 250;

    const REST_LINK = 0.60;
    const FADE_LINK = 0.10;
    const ACTV_LINK = 0.85;
    const HOVR_LINK = 0.75;
    const REST_NODE = 1.00;
    const FADE_NODE = 0.55;
    const HOVR_NODE = 1.00;
    const REST_LBL  = 1.00;
    const FADE_LBL  = 0.55;
    const HOVR_LBL  = 1.00;
    const SUBB_LINK = 0.40; // sub-band opacity

    const container = document.getElementById("view3");
    const W = container.clientWidth, H = container.clientHeight;
    const margin = { top: 90, right: 120, bottom: 30, left: 90 };
    const w = W - margin.left - margin.right;
    const h = H - margin.top - margin.bottom;

    const svg = d3.select("#chart3").attr("viewBox", `0 0 ${W} ${H}`);

    // zoom container - everything inside here moves uniformly with pan/zoom
    const zoomG = svg.append("g");
    const g = zoomG.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // zoom is wired after graph/defs are built (needs access to graph.links)
    const zoom = d3.zoom().scaleExtent([1, 4]);
    svg.call(zoom);
    svg.on("dblclick.zoom", event => {
        event.preventDefault();
        svg.transition().duration(450).call(zoom.transform, d3.zoomIdentity);
    });

    // --- Salary bracket helpers ---
    const brackets  = ["> $150k", "$100k-$150k", "$75k-$100k", "$50k-$75k", "< $50k"];
    const getBracket = s =>
        s >= 150000 ? brackets[0] :
        s >= 100000 ? brackets[1] :
        s >=  75000 ? brackets[2] :
        s >=  50000 ? brackets[3] : brackets[4];

    const sizeOrder = ["L", "M", "S"];
    const sizeLabel = { S: "Small", M: "Medium", L: "Large" };

    const remoteOrder = [100, 50, 0];
    const remoteLabel = { 100: "Remote", 50: "Hybrid", 0: "On-site" };

    // --- Node definitions (structure never changes, only values do) ---
    const allNodes = [
        ...[...expOrder].reverse().map(id => ({ id, label: expLabels[id], col: 0 })),
        ...sizeOrder.map(id => ({ id, label: sizeLabel[id], col: 1 })),
        ...brackets.map(id => ({ id, label: id, col: 2 })),
        ...remoteOrder.map(r => ({ id: String(r), label: remoteLabel[r], col: 3 })),
    ];
    const idx = Object.fromEntries(allNodes.map((n, i) => [n.id, i]));

    // Always produce all 42 links (12 exp->size + 15 size->bracket + 15 bracket->remote) in a
    // fixed order, filling missing combinations with value=0. This keeps the
    // array length and index stable across updates so the index-based D3 join
    // always binds each path element to the same connection.
    function buildLinks(rows) {
        const esCounts = {}, sbCounts = {}, brCounts = {};
        rows.forEach(d => {
            const es = `${d.experience_level}__${d.company_size}`;
            const sb = `${d.company_size}__${getBracket(d.salary_in_usd)}`;
            const br = `${getBracket(d.salary_in_usd)}__${d.remote_ratio}`;
            esCounts[es] = (esCounts[es] || 0) + 1;
            sbCounts[sb] = (sbCounts[sb] || 0) + 1;
            brCounts[br] = (brCounts[br] || 0) + 1;
        });
        const result = [];
        [...expOrder].reverse().forEach(exp =>
            sizeOrder.forEach(size =>
                result.push({ source: idx[exp], target: idx[size], value: esCounts[`${exp}__${size}`] || 0 })
            )
        );
        sizeOrder.forEach(size =>
            brackets.forEach(bkt =>
                result.push({ source: idx[size], target: idx[bkt], value: sbCounts[`${size}__${bkt}`] || 0 })
            )
        );
        brackets.forEach(bkt =>
            remoteOrder.forEach(r =>
                result.push({ source: idx[bkt], target: idx[String(r)], value: brCounts[`${bkt}__${r}`] || 0 })
            )
        );
        return result;
    }

    // Align each column so it spans exactly [0, h] by redistributing padding gaps
    // between nodes - node heights stay intact so link stroke-widths stay consistent
    // and bands remain gap-free.
    function stretchColumns(g) {
        const cols = d3.group(g.nodes, d => d.col);
        cols.forEach(nodes => {
            const sorted = [...nodes].sort((a, b) => a.y0 - b.y0);
            const totalNodeH = sorted.reduce((s, n) => s + (n.y1 - n.y0), 0);
            const gap = sorted.length > 1 ? (h - totalNodeH) / (sorted.length - 1) : 0;
            let y = 0;
            sorted.forEach(node => {
                const nodeH = node.y1 - node.y0;
                const dy = y - node.y0;
                g.links.forEach(l => {
                    if (l.source === node) l.y0 += dy;
                    if (l.target === node) l.y1 += dy;
                });
                node.y0 = y;
                node.y1 = y + nodeH;
                y += nodeH + gap;
            });
        });
    }

    // --- Sankey layout ---
    const sankeyGen = d3.sankey()
        .nodeWidth(18)
        .nodePadding(12)
        .nodeSort(null)
        .linkSort(null)
        .extent([[0, 0], [w, h]]);

    const graph = sankeyGen({
        nodes: allNodes.map(d => ({ ...d })),
        links: buildLinks(data),
    });
    stretchColumns(graph);

    // --- Color scales ---
    const expColor = d3.scaleOrdinal()
        .domain(expOrder)
        .range([
            d3.interpolateBlues(0.3),
            d3.interpolateBlues(0.5),
            d3.interpolateBlues(0.7),
            d3.interpolateBlues(0.9),
        ]);
    const sizeColor = d3.scaleOrdinal()
        .domain(["S", "M", "L"])
        .range([d3.interpolateGreens(0.45), d3.interpolateGreens(0.65), d3.interpolateGreens(0.85)]);
    const bracketColor = d3.scaleOrdinal()
        .domain(["< $50k", "$50k-$75k", "$75k-$100k", "$100k-$150k", "> $150k"])
        .range([
            d3.interpolateBuPu(0.4), d3.interpolateBuPu(0.55),
            d3.interpolateBuPu(0.70), d3.interpolateBuPu(0.85), d3.interpolateBuPu(1.0),
        ]);
    const remoteColor = d3.scaleOrdinal()
        .domain(["100", "50", "0"])
        .range([
            d3.interpolateOranges(0.75),
            d3.interpolateOranges(0.5),
            d3.interpolateOranges(0.3),
        ]);
    const nodeColor = d =>
        d.col === 0 ? expColor(d.id) :
        d.col === 1 ? sizeColor(d.id) :
        d.col === 2 ? bracketColor(d.id) : remoteColor(d.id);

    // --- Gradients (userSpaceOnUse, updated on zoom to stay aligned) ---
    const defs = svg.append("defs");
    graph.links.forEach((link, i) => {
        defs.append("linearGradient")
            .attr("id", `link-grad-${i}`)
            .attr("gradientUnits", "userSpaceOnUse")
            .attr("x1", link.source.x1 + margin.left)
            .attr("y1", 0)
            .attr("x2", link.target.x0 + margin.left)
            .attr("y2", 0)
            .call(gr => {
                gr.append("stop").attr("offset", "0%").attr("stop-color", nodeColor(link.source));
                gr.append("stop").attr("offset", "100%").attr("stop-color", nodeColor(link.target));
            });
    });

    zoom.on("zoom", event => {
        zoomG.attr("transform", event.transform);
        const t = event.transform;
        graph.links.forEach((link, i) => {
            d3.select(`#link-grad-${i}`)
                .attr("x1", t.applyX(link.source.x1 + margin.left))
                .attr("x2", t.applyX(link.target.x0 + margin.left));
        });
    });

    // --- Visual elements ---
    const linkPaths = g.append("g").selectAll("path").data(graph.links).join("path")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("fill", "none")
        .attr("stroke", (d, i) => `url(#link-grad-${i})`)
        .attr("stroke-width", d => d.value > 0 ? Math.max(1, d.width) : 0)
        .attr("stroke-opacity", d => d.value > 0 ? REST_LINK : 0)
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
        .attr("opacity", REST_LBL)
        .text(d => d.label);

    // --- Rich tooltip for links ---
    let currentData = data;

    function filterForLink(link) {
        const src = link.source, tgt = link.target;
        if (src.col === 0) return currentData.filter(d => d.experience_level === src.id && d.company_size === tgt.id);
        if (src.col === 1) return currentData.filter(d => d.company_size === src.id && getBracket(d.salary_in_usd) === tgt.id);
        if (src.col === 2) return currentData.filter(d => getBracket(d.salary_in_usd) === src.id && String(d.remote_ratio) === tgt.id);
        return [];
    }

    function breakdownForCol(rows, col) {
        if (col === 0) {
            const counts = {};
            rows.forEach(d => { counts[d.experience_level] = (counts[d.experience_level] || 0) + 1; });
            return { label: "Experience", items: [...expOrder].reverse().map(e => ({ label: expLabels[e], id: e, count: counts[e] || 0 })), colorFn: expColor };
        }
        if (col === 1) {
            const counts = {};
            rows.forEach(d => { counts[d.company_size] = (counts[d.company_size] || 0) + 1; });
            return { label: "Company Size", items: sizeOrder.map(s => ({ label: sizeLabel[s], id: s, count: counts[s] || 0 })), colorFn: sizeColor };
        }
        if (col === 2) {
            const counts = {};
            rows.forEach(d => { const b = getBracket(d.salary_in_usd); counts[b] = (counts[b] || 0) + 1; });
            return { label: "Salary Range", items: brackets.map(b => ({ label: b, id: b, count: counts[b] || 0 })), colorFn: bracketColor };
        }
        if (col === 3) {
            const counts = {};
            rows.forEach(d => { counts[d.remote_ratio] = (counts[d.remote_ratio] || 0) + 1; });
            return { label: "Work Mode", items: remoteOrder.map(r => ({ label: remoteLabel[r], id: String(r), count: counts[r] || 0 })), colorFn: remoteColor };
        }
    }

    function renderBreakdown(bd) {
        const total = bd.items.reduce((s, i) => s + i.count, 0);
        if (total === 0) return '';
        const bars = bd.items.map(item => {
            const w = Math.round(item.count / total * 100);
            return `<div style="display:flex;align-items:center;gap:5px;margin:3px 0;font-size:12px">
                <span style="width:72px;text-align:right;color:#ddd">${item.label}</span>
                <span style="display:inline-block;background:${bd.colorFn(item.id)};height:10px;width:${w}px;border-radius:2px;min-width:1px"></span>
                <span style="color:#fff">${item.count}</span>
            </div>`;
        }).join('');
        return `<div style="margin-top:7px;padding-top:5px;border-top:1px solid #ddd">
            <div style="font-size:11px;color:#aaa;margin-bottom:3px">${bd.label}:</div>${bars}</div>`;
    }

    function makeLinkTip(link) {
        const rows = filterForLink(link);
        const dot = c => `<span style="display:inline-block;width:10px;height:10px;background:${c};border-radius:2px;margin-right:3px;vertical-align:middle"></span>`;
        const base = `<strong>${dot(nodeColor(link.source))}${link.source.label} &rarr; ${dot(nodeColor(link.target))}${link.target.label}</strong><br/>${link.value.toLocaleString()} people`;
        const sections = [0, 1, 2, 3]
            .filter(col => col !== link.source.col && col !== link.target.col)
            .map(col => renderBreakdown(breakdownForCol(rows, col)))
            .join('');
        return base + sections;
    }

    function makeNodeTip(node) {
        const rows = filterByNode(currentData, node);
        const dot = c => `<span style="display:inline-block;width:10px;height:10px;background:${c};border-radius:2px;margin-right:3px;vertical-align:middle"></span>`;
        const base = `<strong>${dot(nodeColor(node))}${node.label}</strong><br/>${rows.length.toLocaleString()} people`;
        const sections = [0, 1, 2, 3]
            .filter(col => col !== node.col)
            .map(col => renderBreakdown(breakdownForCol(rows, col)))
            .join('');
        return base + sections;
    }

    // --- Hover helpers ---
    function fadeAll() {
        linkPaths.transition().duration(TRANSITION_MS)
            .attr("stroke-opacity", d => d.value > 0 ? FADE_LINK : 0);
        nodeRects.transition().duration(TRANSITION_MS).attr("opacity", FADE_NODE);
        nodeLabels.transition().duration(TRANSITION_MS).attr("opacity", FADE_LBL);
    }
    function restoreAll() {
        linkPaths.transition().duration(TRANSITION_MS)
            .attr("stroke-opacity", d => d.value > 0 ? REST_LINK : 0);
        nodeRects.transition().duration(TRANSITION_MS).attr("opacity", REST_NODE);
        nodeLabels.transition().duration(TRANSITION_MS).attr("opacity", REST_LBL).attr("transform", null);
    }
    function scaleLabel(node) {
        const lx = node.col === 0 ? node.x0 - 6 : node.x1 + 6;
        const ly = (node.y0 + node.y1) / 2;
        nodeLabels.filter(n => n === node)
            .transition().duration(TRANSITION_MS)
            .attr("transform", `translate(${lx},${ly}) scale(1.2) translate(${-lx},${-ly})`);
    }

    // --- Sub-band overlays + frozen active state on link click ---
    let subBandsActive = false;

    function filterByNode(rows, node) {
        if (node.col === 0) return rows.filter(d => d.experience_level === node.id);
        if (node.col === 1) return rows.filter(d => d.company_size === node.id);
        if (node.col === 2) return rows.filter(d => getBracket(d.salary_in_usd) === node.id);
        if (node.col === 3) return rows.filter(d => String(d.remote_ratio) === node.id);
        return rows;
    }

    function countForLinkPath(rows, adjLink) {
        return filterByNode(filterByNode(rows, adjLink.source), adjLink.target).length;
    }

    function getLinkIdx(targetLink) {
        let idx = -1;
        linkPaths.each((d, i) => { if (d === targetLink) idx = i; });
        return idx;
    }

    function allDownstreamLinks(startNode) {
        const result = [];
        let frontier = [startNode];
        while (frontier.length > 0) {
            const next = [];
            frontier.forEach(node => node.sourceLinks.filter(l => l.value > 0).forEach(l => {
                result.push(l); next.push(l.target);
            }));
            frontier = next;
        }
        return result;
    }

    function allUpstreamLinks(startNode) {
        const result = [];
        let frontier = [startNode];
        while (frontier.length > 0) {
            const next = [];
            frontier.forEach(node => node.targetLinks.filter(l => l.value > 0).forEach(l => {
                result.push(l); next.push(l.source);
            }));
            frontier = next;
        }
        return result;
    }

    const subBandG = g.append("g").attr("pointer-events", "none");

    function clearSubBands() {
        subBandG.selectAll("path").remove();
        if (subBandsActive) { subBandsActive = false; restoreAll(); }
    }

    function drawSubBand(adjLink, rows) {
        const condCount = countForLinkPath(rows, adjLink);
        if (condCount === 0 || adjLink.value === 0) return;
        const w = Math.max(1, adjLink.width * (condCount / adjLink.value));
        const idx = getLinkIdx(adjLink);
        subBandG.append("path")
            .attr("d", d3.sankeyLinkHorizontal()(adjLink))
            .attr("fill", "none")
            .attr("stroke", idx >= 0 ? `url(#link-grad-${idx})` : "#fff")
            .attr("stroke-width", 0)
            .attr("stroke-opacity", SUBB_LINK)
            .transition().duration(800)
            .attr("stroke-width", w);
    }

    function freezeAndDraw(rows, highlightNodes, highlightLink) {
        subBandsActive = true;
        fadeAll();
        nodeRects.filter(n => highlightNodes.includes(n))
            .transition().duration(TRANSITION_MS).attr("opacity", HOVR_NODE);
        nodeLabels.filter(n => highlightNodes.includes(n))
            .transition().duration(TRANSITION_MS).attr("opacity", HOVR_LBL);
        if (highlightLink) {
            d3.select(linkPaths.nodes()[getLinkIdx(highlightLink)])
                .transition().duration(TRANSITION_MS).attr("stroke-opacity", ACTV_LINK);
        }
        highlightNodes.forEach(n => {
            allUpstreamLinks(n).forEach(l => drawSubBand(l, rows));
            allDownstreamLinks(n).forEach(l => drawSubBand(l, rows));
        });
    }

    function showSubBands(link) {
        if (link.value === 0) return;
        freezeAndDraw(filterForLink(link), [link.source, link.target], link);
    }

    function showSubBandsForNode(node) {
        freezeAndDraw(filterByNode(currentData, node), [node], null);
    }

    // --- Hover events (respect frozen state) ---
    linkPaths
        .on("mouseover", (event, d) => {
            if (!subBandsActive) {
                fadeAll();
                d3.select(event.currentTarget)
                    .transition().duration(TRANSITION_MS).attr("stroke-opacity", ACTV_LINK);
                nodeRects.filter(n => n === d.source || n === d.target)
                    .transition().duration(TRANSITION_MS).attr("opacity", HOVR_NODE);
                nodeLabels.filter(n => n === d.source || n === d.target)
                    .transition().duration(TRANSITION_MS).attr("opacity", HOVR_LBL);
                scaleLabel(d.source); scaleLabel(d.target);
            }
            tipShow(makeLinkTip(d), event);
        })
        .on("mousemove", tipMove)
        .on("mouseout", () => { if (!subBandsActive) restoreAll(); tipHide(); })
        .on("click", (event, d) => {
            event.stopPropagation();
            clearSubBands();
            if (d.value > 0) showSubBands(d);
        });

    nodeRects.style("cursor", "pointer")
        .on("mouseover", (event, d) => {
            if (!subBandsActive) {
                fadeAll();
                d3.select(event.currentTarget)
                    .transition().duration(TRANSITION_MS).attr("opacity", HOVR_NODE);
                nodeLabels.filter(n => n === d)
                    .transition().duration(TRANSITION_MS).attr("opacity", HOVR_LBL);
                scaleLabel(d);
                linkPaths.filter(l => l.source === d || l.target === d)
                    .transition().duration(TRANSITION_MS).attr("stroke-opacity", HOVR_LINK);
            }
            tipShow(makeNodeTip(d), event);
        })
        .on("mousemove", tipMove)
        .on("mouseout", () => { if (!subBandsActive) restoreAll(); tipHide(); })
        .on("click", (event, d) => {
            event.stopPropagation();
            clearSubBands();
            showSubBandsForNode(d);
        });

    svg.on("click.subbands", () => clearSubBands());

    // --- Column headers ---
    const colHeaders = ["Experience Level", "Company Size", "Salary Range", "Work Mode"];
    [0, 1, 2, 3].forEach(col => {
        const ns = graph.nodes.filter(n => n.col === col);
        const cx = (ns[0].x0 + ns[0].x1) / 2;
        g.append("text").attr("x", cx).attr("y", -18)
            .attr("text-anchor", "middle").attr("font-size", "12px")
            .attr("font-weight", "bold").attr("fill", "#444")
            .text(colHeaders[col]);
    });

    svg.append("text").attr("x", W / 2).attr("y", 22)
        .attr("text-anchor", "middle").attr("font-size", "14px").attr("font-weight", "bold")
        .text("Advanced: Salary Flow - Experience \u2192 Company Size \u2192 Salary Range \u2192 Work Mode");
    svg.append("text").attr("x", W / 2).attr("y", 40)
        .attr("text-anchor", "middle").attr("font-size", "11px")
        .attr("fill", "#888").attr("font-style", "italic")
        .text("Scroll to zoom | Drag to pan | Double-click to reset zoom");
    svg.append("text").attr("x", W / 2).attr("y", 56)
        .attr("text-anchor", "middle").attr("font-size", "11px")
        .attr("fill", "#888").attr("font-style", "italic")
        .text("Click a band or node to reveal conditional sub-bands across all connections");

    // --- Update function ---
    return function update(filteredData) {
        const UPDATE_MS = 600;
        currentData = filteredData;
        clearSubBands();

        const newGraph = sankeyGen({
            nodes: allNodes.map(d => ({ ...d })),
            links: buildLinks(filteredData),
        });
        stretchColumns(newGraph);

        linkPaths.data(newGraph.links);
        nodeRects.data(newGraph.nodes);
        nodeLabels.data(newGraph.nodes);

        linkPaths.transition().duration(UPDATE_MS)
            .attr("d", d3.sankeyLinkHorizontal())
            .attr("stroke-width", d => d.value > 0 ? Math.max(1, d.width) : 0)
            .attr("stroke-opacity", d => d.value > 0 ? REST_LINK : 0);

        nodeRects.transition().duration(UPDATE_MS)
            .attr("y", d => d.y0)
            .attr("height", d => Math.max(1, d.y1 - d.y0));

        nodeLabels.transition().duration(UPDATE_MS)
            .attr("y", d => (d.y0 + d.y1) / 2);
    };
}
