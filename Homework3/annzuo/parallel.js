function drawParallel(data){

    parallelSVG
        .attr("viewBox",
            [0,0,parallelWidth,parallelHeight]);

    updateParallel(data);
}

function updateParallel(data){

    parallelSVG.selectAll("*").remove();

    const dimensions = [
        "Price",
        "Rank",
        "Combination",
        "Dry",
        "Normal",
        "Oily"
    ];

    const margin = {
        top:50,
        right:50,
        bottom:50,
        left:50
    };

    const width =
        parallelWidth - margin.left - margin.right;

    const height =
        parallelHeight - margin.top - margin.bottom;

    const svg = parallelSVG.append("g")
        .attr("transform",
            `translate(${margin.left},${margin.top})`);

    const color = d3.scaleOrdinal()
        .domain([...new Set(data.map(d=>d.Label))])
        .range(d3.schemeCategory10);

    const x = d3.scalePoint()
        .domain(dimensions)
        .range([0,width]);

    const y = {};

    dimensions.forEach(dim => {

        y[dim] = d3.scaleLinear()

            .domain(
                d3.extent(data,d=>+d[dim])
            )

            .range([height,0]);
    });

    function path(d){

        return d3.line()(dimensions.map(p => [

            x(p),
            y[p](d[p])

        ]));
    }

    const lines = svg.selectAll(".line")

        .data(data.slice(0,150))
        .enter()
        .append("path")
        .attr("class","line")
        .attr("d",path)
        .attr("fill","none")
        .attr("stroke",d=>color(d.Label))
        .attr("stroke-width",1.5)
        .attr("opacity",0)
        .on("mouseover",(event,d)=>{

            d3.select(event.currentTarget)

                .transition()
                .duration(200)

                .attr("stroke-width",5)
                .attr("opacity",1);

            tooltip
                .style("opacity",1)

                .html(`
                    <b>${d.Name}</b><br>
                    Brand: ${d.Brand}<br>
                    Price: $${d.Price}<br>
                    Rating: ${d.Rank}
                `)

                .style("left",
                    (event.pageX+10)+"px")

                .style("top",
                    (event.pageY-20)+"px");

            d3.select("#scatterSVG")
                .selectAll("circle")

                .transition()
                .duration(200)

                .attr("opacity", p =>

                    p.Name === d.Name ? 1 : 0.1
                )

                .attr("r", p =>

                    p.Name === d.Name ? 10 : 4
                );
        })

        .on("mouseout",(event,d)=>{

            d3.select(event.currentTarget)

                .transition()
                .duration(200)

                .attr("stroke-width",1.5)
                .attr("opacity",0.5);

            tooltip.style("opacity",0);

            d3.select("#scatterSVG")
                .selectAll("circle")

                .transition()
                .duration(200)

                .attr("opacity",0.7)
                .attr("r",5);
        })

        .on("click",(event,d)=>{

            const category = d.Label;

            svg.selectAll(".line")

                .transition()
                .duration(500)

                .attr("opacity", p =>

                    p.Label === category ? 1 : 0.05
                );

            d3.select("#scatterSVG")
                .selectAll("circle")

                .transition()
                .duration(500)

                .attr("opacity", p =>

                    p.Label === category ? 1 : 0.1
                )

                .attr("r", p =>

                    p.Label === category ? 8 : 4
                );

            updateHeatmap(
                fullData.filter(p =>
                    p.Label === category
                )
            );
        });

    lines.transition()

        .duration(1000)
        .ease(d3.easeCubicInOut)
        .attr("opacity",0.5);

    dimensions.forEach(dim => {

        const axis = svg.append("g")

            .attr("transform",
                `translate(${x(dim)},0)`)
            .call(d3.axisLeft(y[dim]));

        axis.append("text")

            .attr("y",-15)
            .attr("text-anchor","middle")
            .attr("fill","black")
            .style("font-size","16px")
            .text(dim);

        axis.append("g")

            .attr("class","brush")
            .call(

                d3.brushY()

                    .extent([
                        [-10,0],
                        [10,height]
                    ])

                    .on("brush end", brushed)
            );
    });

    function brushed(event){

        const actives = [];

        svg.selectAll(".brush")

            .filter(function(event){

                return d3.brushSelection(this);

            })

            .each(function(dim){

                actives.push({

                    dimension: dimensions[
                        d3.select(this.parentNode)
                            .datum()
                    ],

                    extent:
                        d3.brushSelection(this)
                });
            });

        lines.transition()

            .duration(300)
            .attr("opacity", d => {

                const visible = dimensions.every(dim => {

                    const brush = actives.find(
                        a => a.dimension === dim
                    );

                    if(!brush) return true;

                    const value = y[dim](d[dim]);

                    return value >= brush.extent[0] &&
                           value <= brush.extent[1];
                });

                return visible ? 0.8 : 0.05;
            });
    }

    parallelSVG.append("text")

        .attr("x",parallelWidth/2)
        .attr("y", 5)
        .attr("text-anchor","middle")
        .attr("class","title")
        .style("font-size","24px")
        .text("Interactive Parallel Coordinates Plot");
}