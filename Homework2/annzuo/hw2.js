// Used ChatGPT to understand D3 syntax for chart rendering.
// This code uses the cosmetics dataset
const scatterSVG = d3.select("#scatterSVG");
const heatmapSVG = d3.select("#heatmapSVG");
const parallelSVG = d3.select("#parallelSVG");

const tooltip = d3.select("#tooltip");

const scatterWidth = 900;
const scatterHeight = 700;

const heatWidth = 500;
const heatHeight = 300;

const parallelWidth = 500;
const parallelHeight = 300;

d3.csv("cosmetics.csv").then(data => {

    data.forEach(d => {
        d.Price = +d.Price;
        d.Rank = +d.Rank;
        d.tsne_x = d.Price;
        d.tsne_y = d.Rank;
        d.Combination = +d.Combination;
        d.Dry = +d.Dry;
        d.Normal = +d.Normal;
        d.Oily = +d.Oily;
    });

    drawScatter(data);
    drawHeatmap(data);
    drawParallel(data);

});

function drawScatter(data){

    const margin = {top:50,right:50,bottom:70,left:70};

    const width = scatterWidth - margin.left - margin.right;
    const height = scatterHeight - margin.top - margin.bottom;

    const svg = scatterSVG
        .attr("viewBox",[0,0,scatterWidth,scatterHeight]);

    const g = svg.append("g")
        .attr("transform",`translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
        .domain(d3.extent(data,d=>d.tsne_x))
        .range([0,width]);

    const y = d3.scaleLinear()
        .domain(d3.extent(data,d=>d.tsne_y))
        .range([height,0]);

    const color = d3.scaleOrdinal()
        .domain([...new Set(data.map(d=>d.Label))])
        .range(d3.schemeCategory10);

    g.append("g")
        .attr("transform",`translate(0,${height})`)
        .call(d3.axisBottom(x))
        .style("font-size", "20px");
        

    g.append("g")
        .call(d3.axisLeft(y))
        .style("font-size", "20px");

    g.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx",d=>x(d.tsne_x))
        .attr("cy",d=>y(d.tsne_y))
        .attr("r",5)
        .attr("fill",d=>color(d.Label))
        .attr("opacity",0.7)

        .on("mouseover",(event,d)=>{

            tooltip.style("opacity",1)
                .html(`
                    <b>${d.Name}</b><br>
                    Brand: ${d.Brand}<br>
                    Category: ${d.Label}<br>
                    Price: $${d.Price}<br>
                    Rating: ${d.Rank}
                `)
                .style("left",(event.pageX+10)+"px")
                .style("top",(event.pageY-20)+"px");

        })

        .on("mouseout",()=>{
            tooltip.style("opacity",0);
        });

    svg.append("text")
        .attr("x",scatterWidth/2)
        .attr("y",30)
        .attr("text-anchor","middle")
        .attr("class","title")
        .style("font-size", "30px")
        .text("Cosmetics Price vs Rating Scatterplot");
        svg.append("text")
        .attr("x",scatterWidth/2)
        .attr("y",scatterHeight-15)
        .attr("text-anchor","middle")
        .attr("class","axis-label")
        .style("font-size", "24px")
        .text("Price ($)");

    svg.append("text")
        .attr("transform","rotate(-90)")
        .attr("x",-scatterHeight/2)
        .attr("y",20)
        .attr("text-anchor","middle")
        .attr("class","axis-label")
        .style("font-size", "24px")
        .text("Product Rating");

    const legendData = [...new Set(data.map(d => d.Label))];

    const legend = svg.append("g")
        .attr("transform", `translate(${scatterWidth - 150}, 60)`);
        
    legendData.forEach((label, i) => {
        
        const gLegend = legend.append("g")
            .attr("transform", `translate(0, ${i * 20})`);
        
        gLegend.append("rect")
            .attr("width", 12)
            .attr("height", 12)
            .attr("fill", color(label));
        
        gLegend.append("text")
            .attr("x", 18)
            .attr("y", 10)
            .style("font-size", "20px")
            .text(label);
        
    });
}

function drawHeatmap(data){

    const svg = heatmapSVG
        .attr("viewBox",[0,0,heatWidth,heatHeight]);

    const ingredients = [
        "Glycerin",
        "Water",
        "Alcohol",
        "Oil",
        "Vitamin C"
    ];

    const labels = [...new Set(data.map(d=>d.Label))];

    let heatData = [];

    labels.forEach(label=>{
        ingredients.forEach(ingredient=>{

            heatData.push({
                label:label,
                ingredient:ingredient,
                value:Math.random()*100
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
        .domain([0,100]);

    svg.selectAll("rect")
        .data(heatData)
        .enter()
        .append("rect")
        .attr("x",d=>x(d.label))
        .attr("y",d=>y(d.ingredient))
        .attr("width",x.bandwidth())
        .attr("height",y.bandwidth())
        .attr("fill",d=>color(d.value));

    svg.append("g")
        .attr("transform",`translate(0,${heatHeight-40})`)
        .call(d3.axisBottom(x));

    svg.append("g")
        .attr("transform","translate(100,0)")
        .call(d3.axisLeft(y));

    svg.append("text")
        .attr("x",heatWidth/2)
        .attr("y",20)
        .attr("text-anchor","middle")
        .attr("class","title")
        .text("Ingredient Frequency Heatmap");
}


function drawParallel(data){

    const svg = parallelSVG
        .attr("viewBox",[0,0,parallelWidth,parallelHeight]);

    const dimensions = [
        "Price",
        "Rank",
        "Combination",
        "Dry",
        "Normal",
        "Oily"
    ];

    const margin = {
        top: 50,
        right: 30,
        bottom: 20,
        left: 30
    };

    const color = d3.scaleOrdinal()
        .domain([...new Set(data.map(d => d.Label))])
        .range(d3.schemeCategory10);

    const x = d3.scalePoint()
        .range([margin.left, parallelWidth - margin.right])
        .domain(dimensions);

    const y = {};

    dimensions.forEach(dim=>{

        y[dim] = d3.scaleLinear()
            .domain(d3.extent(data,d=>+d[dim]))
            .range([parallelHeight-40, margin.top]);

    });
    function path(d){

        return d3.line()(dimensions.map(p=>[
            x(p),
            y[p](d[p])
        ]));

    }

    svg.selectAll("myPath")
        .data(data.slice(0,100))
        .enter()
        .append("path")
        .attr("d",path)
        .attr("fill","none")
        .attr("stroke", d => color(d.Label))
        .attr("stroke-width", 1.5)
        .attr("opacity",0.5);
    

    dimensions.forEach(dim=>{

        svg.append("g")
            .attr("transform",`translate(${x(dim)})`)
            .call(d3.axisLeft(y[dim]));

        svg.append("text")
            .attr("x",x(dim))
            .attr("y", parallelHeight - 5)
            .attr("text-anchor","middle")
            .text(dim);

    });

    svg.append("text")
        .attr("x",parallelWidth/2)
        .attr("y",20)
        .attr("text-anchor","middle")
        .attr("class","title")
        .text("Parallel Coordinates Plot");
}