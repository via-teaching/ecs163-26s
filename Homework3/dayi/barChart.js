class BarChart {
    constructor(selector) {
        // define margins
        this.margin = { top: 40, right: 20, bottom: 60, left: 180 };
        this.width = document.querySelector(selector).clientWidth - this.margin.left - this.margin.right;
        this.height = document.querySelector(selector).clientHeight - this.margin.top - this.margin.bottom;

        // main svg element, scaling to height and width of bottom-left div
        this.svg = d3.select(selector)
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("viewBox", `0 0 ${this.width + this.margin.left + this.margin.right} ${this.height + this.margin.top + this.margin.bottom}`)
            // append 'g' to group and offset chart
            .append("g")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

        // define scale for x and y axes, x for linear scale for salary, y for band scale for categorical job titles
        this.x = d3.scaleLinear().range([0, this.width]);
        this.y = d3.scaleBand().range([0, this.height]).padding(0.1);

        // group and position x-axis at bottom
        this.xAxis = this.svg.append("g")
            .attr("transform", `translate(0,${this.height})`);

        // group and position/offset y-axis at left side
        this.yAxis = this.svg.append("g");

        // x-axis label
        this.svg.append("text")
            .attr("x", this.width / 2)
            .attr("y", this.height + 45)
            .style("text-anchor", "middle")
            .text("Number of Job Postings");

        // chart title
        this.svg.append("text")
            .attr("x", this.width / 2)
            .attr("y", -15)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text("Top 10 Most Common Data Science Roles");

        // uses html tooltip div
        this.tooltip = d3.select("#hover-tooltip");
    }

    update(data) {
        let allCounts = d3.nest()
            .key(d => d.job_title)
            .rollup(v => v.length)
            .entries(data)
            .sort((a, b) => b.value - a.value);

        // find top 9
        let top9Keys = allCounts.slice(0, 9).map(d => d.key);

        // bucket remaining through exclusion
        let bucketedData = data.map(d => {
            return {
                ...d,
                // if not in top 9, rename it to "Other Roles" for this view
                display_title: top9Keys.includes(d.job_title) ? d.job_title : "Other Roles"
            };
        });

        // puts data into bucket and counts how many
        let nested = d3.nest()
            .key(d => d.display_title)
            .rollup(leaves => leaves.length) // simplified to a number
            .entries(bucketedData);

        // sort by number value
        nested.sort((a, b) => b.value - a.value);

        let topData = nested;


        // update the scale domain based on the new top 10 data
        this.x.domain([0, d3.max(topData, d => d.value)]);
        this.y.domain(topData.map(d => d.key));

        // redraws axes with a smooth transition
        this.xAxis.transition().duration(500).call(d3.axisBottom(this.x).ticks(5).tickFormat(d3.format("~s")));
        this.yAxis.transition().duration(500).call(d3.axisLeft(this.y));

        // binds new data to the existing '.bar' elements
        let bars = this.svg.selectAll(".bar")
            .data(topData, d => d.key);

        // appends new 'rect' elements for incoming data
        bars.enter()
            .append("rect")
            .attr("class", "bar")
            .attr("y", d => this.y(d.key))
            .attr("height", this.y.bandwidth())
            // starts at 0 width for animation
            .attr("x", 0)
            .attr("width", 0)
            // orange if currently selected filter, otherwise blue
            .attr("fill", d => globalFilter.jobTitle === d.key ? "#ff7f0e" : "#1f77b4")
            // mouseover event to fade in and position tooltip
            .on("mouseover", (d) => {
                this.tooltip.transition().duration(200).style("opacity", .9);
                this.tooltip.html(`<b>${d.key}</b><br/>Job postings: ${d3.format(",.0f")(d.value)}`)
                    .style("left", (d3.event.pageX + 10) + "px")
                    .style("top", (d3.event.pageY - 28) + "px");
            })
            // mouseout event to fade out tooltip
            .on("mouseout", () => {
                this.tooltip.transition().duration(500).style("opacity", 0);
            })
            // click event to toggle filtering by job title
            .on("click", (d) => {
                if (globalFilter.jobTitle === d.key) {
                    globalFilter.jobTitle = null; // turn off filter
                } else {
                    globalFilter.jobTitle = d.key; // turn on filter
                }

                // highlight the selected bar
                this.svg.selectAll(".bar")
                    .transition().duration(200)
                    .attr("fill", barData => globalFilter.jobTitle === barData.key ? "#ff7f0e" : "#1f77b4");

                updateViews("bar");
            })
            // merge enter and update selection
            .merge(bars)
            // animate changes in width and color with a 500ms transition
            .transition()
            .duration(500)
            .attr("y", d => this.y(d.key))
            .attr("height", this.y.bandwidth())
            .attr("width", d => this.x(d.value))
            .attr("fill", d => globalFilter.jobTitle === d.key ? "#ff7f0e" : "#1f77b4");

        // remove rect elements that no longer have corresponding data
        bars.exit()
            .transition()
            .duration(500)
            .attr("width", 0) // shrink before removing
            .remove();
    }
}

