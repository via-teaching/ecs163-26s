class ScatterPlot {
    constructor(selector) {
        // define margins based on relative position

        this.margin = { top: 40, right: 30, bottom: 60, left: 60 };
        this.width = document.querySelector(selector).clientWidth - this.margin.left - this.margin.right;
        this.height = document.querySelector(selector).clientHeight - this.margin.top - this.margin.bottom;

        this.svg = d3.select(selector)
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${this.width + this.margin.left + this.margin.right} ${this.height + this.margin.top + this.margin.bottom}`)
            .append("g")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

        // scalings for axes 
        this.x = d3.scaleLinear().range([0, this.width]);
        this.y = d3.scalePoint().range([this.height, 0]).padding(0.5);
        this.color = d3.scaleOrdinal(d3.schemeCategory10); // matches sankey colorscheme

        // constructs aexes
        this.xAxis = this.svg.append("g").attr("transform", `translate(0,${this.height})`);
        this.yAxis = this.svg.append("g");

        // creates axis labels 
        this.svg.append("text")
            .attr("x", this.width / 2)
            .attr("y", this.height + 40)
            .style("text-anchor", "middle")
            .text("Salary in USD");

        this.svg.append("text")
            .attr("x", this.width / 2)
            .attr("y", -15)
            .style("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text("Individual Salary Distribution");

        this.tooltip = d3.select("#hover-tooltip");
    }

    update(data) {
        // updates axis domains based on filtered data
        this.x.domain([0, d3.max(data, d => d.salary_in_usd) || 0]);
        this.y.domain([...new Set(data.map(d => d.experience_level))].sort());

        // updates axes with animation
        this.xAxis.transition().duration(500).call(d3.axisBottom(this.x).ticks(5).tickFormat(d3.format("~s")));
        this.yAxis.transition().duration(500).call(d3.axisLeft(this.y));

        // data join for dots
        let dots = this.svg.selectAll(".dot")
            .data(data, d => d.id || Math.random());

        // removes dots with animation
        dots.exit().transition().duration(500).attr("r", 0).remove();

        // dots enter + update
        dots.enter()
            .append("circle")
            .attr("class", "dot")
            .attr("r", 0)
            .merge(dots)
            .on("mouseover", (d) => {
                this.tooltip.transition().duration(200).style("opacity", .9);
                this.tooltip.html(`Job: ${d.job_title}<br/>Salary: $${d3.format(",")(d.salary_in_usd)}<br/>Exp: ${d.experience_level}`)
                    .style("left", (d3.event.pageX + 10) + "px")
                    .style("top", (d3.event.pageY - 28) + "px");
            })
            .on("mouseout", () => {
                this.tooltip.transition().duration(500).style("opacity", 0);
            })
            .transition().duration(800)
            .attr("cx", d => this.x(d.salary_in_usd))
            // adds some randomness to y positions so points don't overlap
            .attr("cy", d => this.y(d.experience_level) + (Math.random() - 0.5) * 20)
            .attr("r", 5)
            .attr("fill", d => this.color(d.experience_level))
            .attr("fill-opacity", 0.6)
            .attr("stroke", "#fff");
    }
}