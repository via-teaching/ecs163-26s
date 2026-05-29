function drawScatter(data){
    scatterSVG.selectAll("*").remove();

    const margin = {
        top:50,
        right:50,
        bottom:70,
        left:70
    };

    const width =
        scatterWidth - margin.left - margin.right;

    const height =
        scatterHeight - margin.top - margin.bottom;

    const svg = scatterSVG
        .attr("viewBox",
            [0,0,scatterWidth,scatterHeight]);

    const g = svg.append("g")
        .attr("transform",
            `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
        .domain(d3.extent(data,d=>d.Price))
        .nice()
        .range([0,width]);

    const y = d3.scaleLinear()
        .domain(d3.extent(data,d=>d.Rank))
        .nice()
        .range([height,0]);

    const color = d3.scaleOrdinal()
        .domain([...new Set(data.map(d=>d.Label))])
        .range(d3.schemeCategory10);

    const xAxis = g.append("g")

        .attr("class","x-axis")
        .attr("transform",
            `translate(0,${height})`)
        .call(d3.axisBottom(x));

    const yAxis = g.append("g")

        .attr("class","y-axis")
        .call(d3.axisLeft(y));

    svg.append("defs")

        .append("clipPath")
        .attr("id","clip")
        .append("rect")
        .attr("width",width)
        .attr("height",height);

    const scatterGroup = g.append("g")
        .attr("clip-path","url(#clip)");

    const circles = scatterGroup

        .selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx",d=>x(d.Price))
        .attr("cy",d=>y(d.Rank))
        .attr("r",0)
        .attr("fill",d=>color(d.Label))
        .attr("opacity",0.7)
        .transition()
        .duration(1000)
        .ease(d3.easeBounceOut)
        .attr("r",5);

    scatterGroup.selectAll("circle")
        .on("mouseover",(event,d)=>{

            d3.select(event.currentTarget)

                .raise()
                .transition()
                .duration(200)
                .attr("r",10)
                .attr("stroke","black")
                .attr("stroke-width",2);

            tooltip

                .style("opacity",1)
                .html(`
                    <b>${d.Name}</b><br>
                    Brand: ${d.Brand}<br>
                    Category: ${d.Label}<br>
                    Price: $${d.Price}<br>
                    Rating: ${d.Rank}
                `)
                .style("left",
                    (event.pageX+10)+"px")
                .style("top",
                    (event.pageY-20)+"px");

            parallelSVG.selectAll("path")

                .transition()
                .duration(200)
                .attr("opacity", p =>

                    p.Name === d.Name ? 1 : 0.05
                )
                .attr("stroke-width", p =>

                    p.Name === d.Name ? 5 : 1
                );
        })

        .on("mouseout",(event,d)=>{

            d3.select(event.currentTarget)
                .transition()
                .duration(200)
                .attr("r",5)
                .attr("stroke","none");

            tooltip.style("opacity",0);

            parallelSVG.selectAll("path")

                .transition()
                .duration(200)
                .attr("opacity",0.5)
                .attr("stroke-width",1.5);
        })

        .on("click",(event,d)=>{

            const filtered =

                fullData.filter(p =>

                    p.Label === d.Label
                );

            scatterGroup.selectAll("circle")

                .transition()
                .duration(700)
                .ease(d3.easeCubicInOut)
                .attr("opacity", p =>
                    p.Label === d.Label ? 1 : 0.08
                )
                .attr("r", p =>
                    p.Label === d.Label ? 9 : 4
                );
            updateHeatmap(filtered);
            updateParallel(filtered);
        });

    const brush = d3.brush()

        .extent([[0,0],[width,height]])
        .on("brush end", brushed);

    scatterGroup.append("g")

        .attr("class","brush")
        .call(brush);

    function brushed(event){

        const selection = event.selection;
        if(!selection){

            scatterGroup.selectAll("circle")

                .transition()
                .duration(500)
                .attr("opacity",0.7)
                .attr("r",5);

            updateHeatmap(fullData);
            updateParallel(fullData);

            return;
        }

        const [[x0,y0],[x1,y1]] = selection;
        const selected = data.filter(d => {

            const cx = x(d.Price);
            const cy = y(d.Rank);

            return cx >= x0 &&
                   cx <= x1 &&
                   cy >= y0 &&
                   cy <= y1;
        });

        scatterGroup.selectAll("circle")

            .transition()
            .duration(700)
            .ease(d3.easeCubicInOut)
            .attr("opacity", d =>

                selected.includes(d) ? 1 : 0.08
            )
            .attr("r", d =>
                selected.includes(d) ? 10 : 4
            );

        updateHeatmap(selected);
        updateParallel(selected);
    }
    const zoom = d3.zoom()

        .scaleExtent([0.5,20])
        .translateExtent([
            [0,0],
            [width,height]
        ])
        .extent([
            [0,0],
            [width,height]
        ])
        .on("zoom", zoomed);

    svg.call(zoom);
    function zoomed(event){

        const transform = event.transform;

        const zx = transform.rescaleX(x);
        const zy = transform.rescaleY(y);

        scatterGroup.selectAll("circle")

            .attr("cx", d => zx(d.Price))
            .attr("cy", d => zy(d.Rank))
            .attr("r",
                Math.max(
                    3,
                    5 / transform.k
                )
            );

        xAxis.call(
            d3.axisBottom(zx)
        );

        yAxis.call(
            d3.axisLeft(zy)
        );
    }

    svg.on("dblclick",()=>{

        svg.transition()

            .duration(750)

            .call(
                zoom.transform,
                d3.zoomIdentity
            );
    });

    svg.append("text")

        .attr("x",scatterWidth/2)
        .attr("y",30)
        .attr("text-anchor","middle")
        .attr("class","title")
        .style("font-size","24px")
        .text("Interactive Price vs Product Rating");

    svg.append("text")

        .attr("x",scatterWidth/2)
        .attr("y",scatterHeight-15)
        .attr("text-anchor","middle")
        .attr("class","axis-label")
        .style("font-size","18px")
        .text("Price ($)");

    svg.append("text")

        .attr("transform","rotate(-90)")
        .attr("x",-scatterHeight/2)
        .attr("y",20)
        .attr("text-anchor","middle")
        .attr("class","axis-label")
        .style("font-size","18px")
        .text("Product Rating");
}