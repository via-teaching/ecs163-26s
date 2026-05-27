/* Sankey Diagram
    Disclosure: Generative AI coding assistance tools, including Cursor, 
    were used to support the implementation and debugging of the Sankey diagram visualization.
*/

const SALARY_RANGE_ORDER = [
    "< $75k",
    "$75k–$100k",
    "$100k–$125k",
    "$125k–$150k",
    "$150k–$175k",
    "$175k–$200k",
    "$200k+"
];

const SANKEY_NEUTRAL = "#ced4da";
const TOP_JOB_COUNT = 8;

function salaryRange(salary) {
    if (salary < 75000) return "< $75k";
    if (salary < 100000) return "$75k–$100k";
    if (salary < 125000) return "$100k–$125k";
    if (salary < 150000) return "$125k–$150k";
    if (salary < 175000) return "$150k–$175k";
    if (salary < 200000) return "$175k–$200k";
    return "$200k+";
}

function salaryRangeOrder(name) {
    const index = SALARY_RANGE_ORDER.indexOf(name);
    return index === -1 ? SALARY_RANGE_ORDER.length : index;
}

function groupedJobTitle(title, topTitles) {
    return topTitles.has(title) ? title : "Other";
}

function buildSankeyData(rows, topTitles) {
    const expToJob = {};
    const expJobToRange = {};

    rows.forEach(function (d) {
        const job = groupedJobTitle(d.job_title, topTitles);
        const range = salaryRange(d.salary_in_usd);
        const expKey = d.experience_level + "||" + job;
        const flowKey = d.experience_level + "||" + job + "||" + range;

        expToJob[expKey] = (expToJob[expKey] || 0) + 1;
        expJobToRange[flowKey] = (expJobToRange[flowKey] || 0) + 1;
    });

    const nodeNames = [];
    const nodeIndex = {};

    function addNode(name, nodeType, experienceCode) {
        const key = nodeType + "::" + name;
        if (nodeIndex[key] === undefined) {
            nodeIndex[key] = nodeNames.length;
            const node = { name: name, nodeType: nodeType };
            if (experienceCode) {
                node.experienceCode = experienceCode;
            }
            nodeNames.push(node);
        }
        return nodeIndex[key];
    }

    EXP_ORDER.forEach(function (level) {
        addNode(EXP_LABELS[level], "experience", level);
    });

    const links = [];

    Object.keys(expToJob).forEach(function (key) {
        const parts = key.split("||");
        const source = addNode(EXP_LABELS[parts[0]] || parts[0], "experience", parts[0]);
        const target = addNode(parts[1], "job");
        links.push({
            source: source,
            target: target,
            value: expToJob[key],
            experience: parts[0]
        });
    });

    Object.keys(expJobToRange).forEach(function (key) {
        const parts = key.split("||");
        const source = addNode(parts[1], "job");
        const target = addNode(parts[2], "salary");
        links.push({
            source: source,
            target: target,
            value: expJobToRange[key],
            experience: parts[0]
        });
    });

    return {
        nodes: nodeNames.map(function (d) { return Object.assign({}, d); }),
        links: links.map(function (d) { return Object.assign({}, d); })
    };
}

function sankeyNodeKey(node) {
    return node.nodeType + "::" + node.name;
}

function findSankeyNodeByKey(nodes, key) {
    if (!key) {
        return null;
    }
    for (var i = 0; i < nodes.length; i += 1) {
        if (sankeyNodeKey(nodes[i]) === key) {
            return nodes[i];
        }
    }
    return null;
}

function experienceCodeFromNode(node) {
    if (node.nodeType !== "experience") {
        return null;
    }
    return node.experienceCode || LABEL_TO_EXP[node.name] || null;
}

function isSankeyLinkHighlighted(link, hoveredNode) {
    if (!hoveredNode) {
        return true;
    }

    if (hoveredNode.nodeType === "experience") {
        return link.experience === experienceCodeFromNode(hoveredNode);
    }

    const hoveredIndex = hoveredNode.index;
    return link.source.index === hoveredIndex || link.target.index === hoveredIndex;
}

function isSankeyNodeHighlighted(node, hoveredNode, links) {
    if (!hoveredNode) {
        return true;
    }

    if (node.index === hoveredNode.index) {
        return true;
    }

    return links.some(function (link) {
        if (!isSankeyLinkHighlighted(link, hoveredNode)) {
            return false;
        }
        return link.source.index === node.index || link.target.index === node.index;
    });
}

function repositionSalaryRangeNodes(nodes, plotHeight, nodePadding) {
    const salaryNodes = nodes
        .filter(function (n) {
            return SALARY_RANGE_ORDER.indexOf(n.name) !== -1 && n.y1 - n.y0 > 0;
        })
        .sort(function (a, b) {
            return salaryRangeOrder(a.name) - salaryRangeOrder(b.name);
        });

    const totalNodeHeight = d3.sum(salaryNodes, function (n) { return n.y1 - n.y0; });
    const available = plotHeight - nodePadding * (salaryNodes.length - 1);
    const scale = available / totalNodeHeight;

    let y = 0;
    salaryNodes.forEach(function (node) {
        const nodeHeight = (node.y1 - node.y0) * scale;
        node.y0 = y;
        node.y1 = y + nodeHeight;
        y += nodeHeight + nodePadding;
    });
}

function updateSankeyChart(svg, rows, layout, animate) {
    const layer = svg.select(".sankey-layer");
    if (layer.empty()) {
        drawSankey(svg, rows, layout, animate);
        return;
    }

    svg.select(".sankey-layer").remove();
    drawSankey(svg, rows, layout, animate);
}

function drawSankey(svg, rows, layout, animate) {
    const titleCountList = d3.nest()
        .key(function (d) { return d.job_title; })
        .rollup(function (v) { return v.length; })
        .entries(rows);
    const topTitles = new Set(
        titleCountList
            .sort(function (a, b) { return d3.descending(a.value, b.value); })
            .slice(0, TOP_JOB_COUNT)
            .map(function (d) { return d.key; })
    );

    const graph = buildSankeyData(rows, topTitles);
    const legendWidth = 128;
    const margin = { top: 48, right: 24 + legendWidth, bottom: 48, left: 24 };
    const width = layout.width - margin.left - margin.right;
    const height = layout.height - margin.top - margin.bottom;

    // Sankey chart container
    const g = svg.append("g")
        .attr("class", "sankey-layer")
        .attr("transform", "translate(" + (layout.left + margin.left) + "," + (layout.top + margin.top) + ")");

    // Sankey title
    g.append("text")
        .attr("class", "chart-title")
        .attr("x", width / 2)
        .attr("y", -24)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "600")
        .text("Flow of Experience, Job Roles, and Salary Ranges");

    g.append("text")
        .attr("class", "sankey-hint")
        .attr("x", width / 2)
        .attr("y", height + 28)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("fill", "#5c6770")
        .text("Click a node to filter to its path (click again to reset)");

    const sankey = d3.sankey()
        .nodeWidth(18)
        .nodePadding(12)
        .nodeSort(function (a, b) {
            const aSalary = salaryRangeOrder(a.name);
            const bSalary = salaryRangeOrder(b.name);
            if (aSalary < SALARY_RANGE_ORDER.length && bSalary < SALARY_RANGE_ORDER.length) {
                return aSalary - bSalary;
            }
            if (a.nodeType === "experience" && b.nodeType === "experience") {
                return EXP_ORDER.indexOf(a.experienceCode) -
                    EXP_ORDER.indexOf(b.experienceCode);
            }
            return b.value - a.value;
        })
        .extent([[0, 0], [width, height]]);

    const { nodes, links } = sankey({
        nodes: graph.nodes.map(function (d) { return Object.assign({}, d); }),
        links: graph.links.map(function (d) { return Object.assign({}, d); })
    });

    repositionSalaryRangeNodes(nodes, height, 12);
    sankey.update({ nodes: nodes, links: links });

    function linkColor(link) {
        return EXP_COLORS[link.experience] || "#adb5bd";
    }

    function nodeColor(node) {
        if (node.nodeType === "experience") {
            return EXP_COLORS[experienceCodeFromNode(node)] || SANKEY_NEUTRAL;
        }
        return SANKEY_NEUTRAL;
    }

    // Sankey flow links
    const linkSelection = g.append("g")
        .attr("fill", "none")
        .selectAll("path")
        .data(links)
        .enter()
        .append("path")
        .attr("class", "sankey-link")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke", linkColor)
        .attr("stroke-opacity", animate ? 0 : 0.42)
        .attr("stroke-width", function (d) { return Math.max(1, d.width); });

    if (animate) {
        linkSelection
            .transition()
            .duration(TRANSITION_MS)
            .attr("stroke-opacity", 0.42);
    }

    // Sankey nodes
    const node = g.append("g")
        .attr("class", "sankey-nodes")
        .selectAll("g")
        .data(nodes)
        .enter()
        .append("g")
        .attr("class", "sankey-node")
        .style("cursor", "pointer");

    // Node bars
    const nodeRects = node.append("rect")
        .attr("x", function (d) { return d.x0; })
        .attr("y", function (d) { return d.y0; })
        .attr("height", function (d) { return Math.max(1, d.y1 - d.y0); })
        .attr("width", function (d) { return d.x1 - d.x0; })
        .attr("fill", nodeColor)
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .attr("opacity", animate ? 0 : 1);

    if (animate) {
        nodeRects
            .transition()
            .duration(TRANSITION_MS)
            .attr("opacity", 1);
    }

    // Node labels
    const nodeLabels = node.append("text")
        .attr("x", function (d) { return d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6; })
        .attr("y", function (d) { return (d.y0 + d.y1) / 2; })
        .attr("dy", "0.35em")
        .attr("text-anchor", function (d) { return d.x0 < width / 2 ? "start" : "end"; })
        .attr("font-size", "11px")
        .attr("pointer-events", "none")
        .attr("opacity", animate ? 0 : 1)
        .text(function (d) { return d.name; });

    if (animate) {
        nodeLabels
            .transition()
            .duration(TRANSITION_MS)
            .attr("opacity", 1);
    }

    function updateSankeyHighlight(focusedNode) {
        linkSelection
            .transition()
            .duration(TRANSITION_MS)
            .attr("stroke-opacity", function (d) {
                return isSankeyLinkHighlighted(d, focusedNode) ? 0.78 : 0.07;
            })
            .attr("stroke-width", function (d) {
                const base = Math.max(1, d.width);
                return isSankeyLinkHighlighted(d, focusedNode) ? base * 1.08 : base * 0.55;
            });

        node.select("rect")
            .transition()
            .duration(TRANSITION_MS)
            .attr("opacity", function (d) {
                return isSankeyNodeHighlighted(d, focusedNode, links) ? 1 : 0.22;
            });

        node.select("text")
            .transition()
            .duration(TRANSITION_MS)
            .attr("opacity", function (d) {
                return isSankeyNodeHighlighted(d, focusedNode, links) ? 1 : 0.3;
            });
    }

    function clearSankeyNodeSelection() {
        dashboardState.sankeySelectedNodeKey = null;
        updateSankeyHighlight(null);
    }

    node
        .on("mouseenter", function (d) {
            if (!dashboardState.sankeySelectedNodeKey) {
                updateSankeyHighlight(d);
            }
        })
        .on("mouseleave", function () {
            if (!dashboardState.sankeySelectedNodeKey) {
                updateSankeyHighlight(null);
            }
        })
        .on("click", function (d) {
            d3.event.stopPropagation();
            const key = sankeyNodeKey(d);
            if (dashboardState.sankeySelectedNodeKey === key) {
                clearSankeyNodeSelection();
            } else {
                dashboardState.sankeySelectedNodeKey = key;
                updateSankeyHighlight(d);
            }
        });

    // Background to reset selection
    g.append("rect")
        .attr("class", "sankey-bg")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "transparent")
        .lower()
        .on("click", function () {
            clearSankeyNodeSelection();
        })
        .on("mouseleave", function () {
            if (!dashboardState.sankeySelectedNodeKey) {
                updateSankeyHighlight(null);
            }
        });

    g.datum({
        selectedNodeKey: dashboardState.sankeySelectedNodeKey
    });

    const selectedNode = findSankeyNodeByKey(nodes, dashboardState.sankeySelectedNodeKey);
    if (selectedNode) {
        updateSankeyHighlight(selectedNode);
    }

    const legendData = EXP_ORDER.map(function (level) {
        return { label: EXP_LABELS[level], color: EXP_COLORS[level] };
    });

    // Experience color legend
    const legend = g.append("g")
        .attr("class", "sankey-legend")
        .attr("transform", "translate(" + (width + 16) + ", 8)");

    // Legend title
    legend.append("text")
        .attr("x", 0)
        .attr("y", -4)
        .attr("font-size", "11px")
        .attr("font-weight", "600")
        .text("Experience");

    legend.selectAll("g.legend-item")
        .data(legendData)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", function (d, i) { return "translate(0," + (10 + i * 18) + ")"; })
        .each(function (d) {
            const item = d3.select(this);
            // Legend color box
            item.append("rect")
                .attr("width", 12)
                .attr("height", 12)
                .attr("rx", 2)
                .attr("fill", d.color);
            // Legend label
            item.append("text")
                .attr("x", 18)
                .attr("y", 10)
                .attr("font-size", "11px")
                .text(d.label);
        });
}
