class SankeyChart {
    constructor(selector) {
        // define margins
        this.margin = { top: 50, right: 50, bottom: 20, left: 50 };
        this.width = document.querySelector(selector).clientWidth - this.margin.left - this.margin.right;
        this.height = document.querySelector(selector).clientHeight - this.margin.top - this.margin.bottom;

        // main svg element, scaling to height and width of top half div
        this.svg = d3.select(selector)
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${this.width + this.margin.left + this.margin.right} ${this.height + this.margin.top + this.margin.bottom}`)
            .append("g")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);
        // d3 sankey layout
        this.sankey = d3.sankey()
            .nodeWidth(20)
            .nodePadding(15)
            .extent([[0, 0], [this.width, this.height]]);
        // sankey color scale categorically for consistency
        this.color = d3.scaleOrdinal()
            .domain(["EN", "MI", "SE", "EX"])
            .range(d3.schemeCategory10);
        // main title for sankey chart
        this.svg.append("text")
            .attr("x", this.width / 2)
            .attr("y", -20)
            .attr("text-anchor", "middle")
            .style("font-size", "18px")
            .style("font-weight", "bold")
            .text("Career Flow: Experience \u2192 Company Size \u2192 Remote Ratio \u2192 Salary Tier");
        // tooltip
        this.tooltip = d3.select("#hover-tooltip");

        // legend 
        let legendData = ["EN (Entry)", "MI (Mid)", "SE (Senior)", "EX (Executive)"];
        let legend = this.svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${(this.width - 400)}, -40)`)
            .attr("transform", `translate(0, ${this.margin.top - 100})`);

        legend.selectAll("rect")
            .data(legendData)
            .enter()
            .append("rect")
            .attr("x", (d, i) => i * 100)
            .attr("y", 0)
            .attr("width", 10)
            .attr("height", 10)
            .attr("fill", d => this.color(d.substring(0, 2)));

        legend.selectAll("text")
            .data(legendData)
            .enter()
            .append("text")
            .attr("x", (d, i) => i * 100 + 15)
            .attr("y", 9)
            .text(d => d)
            .style("font-size", "12px");
    }
    // update function to update the sankey chart
    update(data) {
        if (data.length === 0) {
            this.svg.selectAll(".node").remove();
            this.svg.selectAll(".link").remove();
            return;
        }

        let nodesMap = new Map();
        let linksMap = new Map();

        // helper function to add node to map, if existing return
        function addNode(name) {
            if (!nodesMap.has(name)) {
                nodesMap.set(name, { name: name });
            }
            return name;
        }

        // helper fucntion to add link to map, increment if already existing
        function addLink(source, target) {
            let key = source + "->" + target;
            if (!linksMap.has(key)) {
                linksMap.set(key, { source: source, target: target, value: 0 });
            }
            linksMap.get(key).value += 1;
        }
        // for each piece of data, create nodes and links
        data.forEach(d => {
            let exp = d.experience_level;
            let comp = d.company_size + " Size";
            let rem = d.remote_ratio == 0 ? "0% Remote" : d.remote_ratio == 50 ? "50% Remote" : "100% Remote";
            let sal = getSalaryTier(d.salary_in_usd);

            addNode(exp);
            addNode(comp);
            addNode(rem);
            addNode(sal);

            addLink(exp, comp);
            addLink(comp, rem);
            addLink(rem, sal);
        });

        let graph = {
            nodes: Array.from(nodesMap.values()),
            links: Array.from(linksMap.values())
        };
        // index by name
        let nodeIndex = new Map(graph.nodes.map((d, i) => [d.name, i]));
        graph.links.forEach(l => {
            l.source = nodeIndex.get(l.source);
            l.target = nodeIndex.get(l.target);
        });

        this.sankey(graph);
        // bind nodes and links to data
        let links = this.svg.selectAll(".link")
            .data(graph.links, d => d.source.name + "-" + d.target.name);

        // enter selection for links, start invisible to fade in animation principle
        links.enter()
            .append("path")
            .attr("class", "link")
            .attr("d", d3.sankeyLinkHorizontal())
            .attr("fill", "none")
            .attr("stroke", "#aaa")
            .attr("stroke-opacity", 0)
            .attr("stroke-width", d => Math.max(1, d.width))
            .on("mouseover", (d) => {
                this.tooltip.transition().duration(200).style("opacity", .9);
                this.tooltip.html(`${d.source.name} \u2192 ${d.target.name}<br/>Count: ${d.value}`)
                    .style("left", (d3.event.pageX + 10) + "px")
                    .style("top", (d3.event.pageY - 28) + "px");
                d3.select(d3.event.currentTarget).attr("stroke", "#f00").attr("stroke-opacity", 0.6);
            })
            .on("mouseout", (d) => {
                this.tooltip.transition().duration(500).style("opacity", 0);
                d3.select(d3.event.currentTarget).attr("stroke", "#aaa").attr("stroke-opacity", 0.2);
            })
            .merge(links)
            .transition()
            .duration(500)
            .attr("d", d3.sankeyLinkHorizontal())
            .attr("stroke-width", d => Math.max(1, d.width))
            .attr("stroke-opacity", 0.2);

        // fade out links that no longer exist, then remove
        links.exit()
            .transition()
            .duration(500)
            .attr("stroke-opacity", 0)
            .remove();

        // bind nodes to data
        let nodes = this.svg.selectAll(".node")
            .data(graph.nodes, d => d.name);

        // enter selection for new nodes, start invisible 
        let nodeEnter = nodes.enter()
            .append("g")
            .attr("class", "node")
            .attr("transform", d => `translate(${d.x0},${d.y0})`)
            .on("mouseout", () => {
                this.tooltip.transition().duration(500).style("opacity", 0);
            });

        // append colored rectangles to the new nodes
        nodeEnter.append("rect")
            .attr("height", d => Math.max(1, d.y1 - d.y0))
            .attr("width", this.sankey.nodeWidth())
            .attr("fill", d => this.color(d.name.replace(/ .*/, "")))
            .attr("stroke", "none");

        // append text labels to the new nodes
        nodeEnter.append("text")
            .attr("x", -6)
            .attr("y", d => (d.y1 - d.y0) / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", "end")
            .text(d => d.name)
            .style("font-size", "12px")
            .filter(d => d.x0 < this.width / 2)
            .attr("x", 6 + this.sankey.nodeWidth())
            .attr("text-anchor", "start");

        // update phase: merge enter and existing nodes, animate to new positions and fade in
        let nodeUpdate = nodeEnter.merge(nodes)
            .transition()
            .duration(500)
            .attr("opacity", 1)
            .attr("transform", d => `translate(${d.x0},${d.y0})`);

        // smoothly update rectangle heights
        nodeUpdate.select("rect")
            .attr("height", d => Math.max(1, d.y1 - d.y0));

        // smoothly update text positioning
        nodeUpdate.select("text")
            .attr("y", d => (d.y1 - d.y0) / 2);

        // exit phase: fade out nodes that no longer exist, then remove
        nodes.exit()
            .transition()
            .duration(500)
            .attr("opacity", 0)
            .remove();

        // ensure nodes stay visually in front of the gray links
        this.svg.selectAll(".node").raise();
    }

}
