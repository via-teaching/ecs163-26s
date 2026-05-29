function drawHeatmap(data){

    heatmapSVG
        .attr("viewBox",[0,0,heatWidth,heatHeight]);

    updateHeatmap(data);
}

function updateHeatmap(data){

    heatmapSVG.selectAll("*").remove();

    const labels =
        [...new Set(data.map(d=>d.Label))];

    let heatData = [];

    labels.forEach(label => {

        const subset =
            data.filter(d => d.Label === label);

        ingredients.forEach(ingredient => {

            const count = subset.filter(d =>

                d.Ingredients
                    .toLowerCase()
                    .includes(
                        ingredient.toLowerCase()
                    )

            ).length;

            heatData.push({
                label,
                ingredient,
                value:count
            });
        });
    });

    const x = d3.scaleBand()

        .domain(labels)
        .range([100,heatWidth-20])
        .padding(0.05);

    const y = d3.scaleBand()

        .domain(ingredients)
        .range([40,heatHeight-40])
        .padding(0.05);

    const color = d3.scaleSequential()

        .interpolator(d3.interpolateBlues)
        .domain([
            0,
            d3.max(heatData,d=>d.value)
        ]);

   
    const cells = heatmapSVG.selectAll("rect")

        .data(heatData)
        .enter()
        .append("rect")
        .attr("x",d=>x(d.label))
        .attr("y",d=>y(d.ingredient))
        .attr("width",x.bandwidth())
        .attr("height",y.bandwidth())
        .attr("fill","white")
        .attr("stroke","white")
        .attr("stroke-width",1)
        .transition()
        .duration(800)
        .ease(d3.easeCubicInOut)
        .attr("fill",d=>color(d.value));

    heatmapSVG.selectAll("rect")

        .on("mouseover",(event,d)=>{

            d3.select(event.currentTarget)
                .raise()
                .transition()
                .duration(200)
                .attr("stroke","black")
                .attr("stroke-width",4);

            tooltip

                .style("opacity",1)
                .html(`
                    <b>${d.label}</b><br>
                    Ingredient: ${d.ingredient}<br>
                    Frequency: ${d.value}
                `)
                .style("left",
                    (event.pageX+10)+"px")

                .style("top",
                    (event.pageY-20)+"px");

            d3.select("#scatterSVG")

                .selectAll("circle")
                .transition()
                .duration(300)
                .attr("opacity", p => {

                    const match =

                        p.Label === d.label &&

                        p.Ingredients
                            .toLowerCase()
                            .includes(
                                d.ingredient.toLowerCase()
                            );

                    return match ? 1 : 0.08;
                })

                .attr("r", p => {

                    const match =

                        p.Label === d.label &&

                        p.Ingredients
                            .toLowerCase()
                            .includes(
                                d.ingredient.toLowerCase()
                            );

                    return match ? 9 : 4;
                });

            parallelSVG.selectAll("path")

                .transition()
                .duration(300)
                .attr("opacity", p => {

                    const match =

                        p.Label === d.label &&

                        p.Ingredients
                            .toLowerCase()
                            .includes(
                                d.ingredient.toLowerCase()
                            );

                    return match ? 0.9 : 0.05;
                })

                .attr("stroke-width", p => {

                    const match =

                        p.Label === d.label &&

                        p.Ingredients
                            .toLowerCase()
                            .includes(
                                d.ingredient.toLowerCase()
                            );

                    return match ? 3 : 1;
                });
        })

        .on("mouseout",(event,d)=>{

            d3.select(event.currentTarget)
                .transition()
                .duration(200)
                .attr("stroke","white")
                .attr("stroke-width",1);

            tooltip.style("opacity",0);

            d3.select("#scatterSVG")
                .selectAll("circle")
                .transition()
                .duration(300)
                .attr("opacity",0.7)
                .attr("r",5);

            parallelSVG.selectAll("path")
                .transition()
                .duration(300)
                .attr("opacity",0.5)
                .attr("stroke-width",1.5);
        })

        .on("click",(event,d)=>{

            const filtered = fullData.filter(p =>

                p.Label === d.label &&

                p.Ingredients
                    .toLowerCase()
                    .includes(
                        d.ingredient.toLowerCase()
                    )
            );

            d3.select("#scatterSVG")
                .selectAll("circle")
                .transition()
                .duration(700)
                .ease(d3.easeCubicInOut)
                .attr("opacity", p =>

                    filtered.includes(p) ? 1 : 0.05
                )
                .attr("r", p =>

                    filtered.includes(p) ? 10 : 3
                );

            updateParallel(filtered);

            heatmapSVG.selectAll("rect")

                .attr("stroke","white")
                .attr("stroke-width",1);

            d3.select(event.currentTarget)

                .transition()
                .duration(300)
                .attr("stroke","red")
                .attr("stroke-width",5);
        });

    heatmapSVG.append("g")

        .attr("transform",
            `translate(0,${heatHeight-40})`)
        .call(d3.axisBottom(x));

    heatmapSVG.append("g")

        .attr("transform","translate(100,0)")
        .call(d3.axisLeft(y));

    heatmapSVG.append("text")

        .attr("x",heatWidth/2)
        .attr("y",20)
        .attr("text-anchor","middle")
        .attr("class","title")
        .style("font-size","22px")
        .text("Interactive Ingredient Heatmap");
}