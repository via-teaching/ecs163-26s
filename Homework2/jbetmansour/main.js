const width = window.innerWidth;
const height = window.innerHeight;

// Top row is treemap + scatter
// Bottom row is parallel coordinates
const topRowH = height * 0.52;
const scatterPanelLeft = width * 0.52;
const gap = 12;


// Setting up margins and dimensions for the plots
let treeMargin = { top: 36, right: 128, bottom: 14, left: 32 },
    treeWidth = scatterPanelLeft - gap - treeMargin.left - treeMargin.right,
    treeHeight = topRowH - treeMargin.top - treeMargin.bottom;

let scatterMargin = { top: 36, right: 145, bottom: 14, left: 46 },
    scatterWidth = width - scatterPanelLeft - scatterMargin.left - scatterMargin.right,
    scatterHeight = topRowH - scatterMargin.top - scatterMargin.bottom;

let pcMargin = { top: 22, right: 32, bottom: 46, left: 40 };
let pcTop = topRowH + 6;
let pcWidth = width - pcMargin.left - pcMargin.right;
let pcHeight = height - pcTop - pcMargin.top - pcMargin.bottom;

// standard pokemon type colors
let typeColors = {
    Bug: "#A8B820",
    Dark: "#705848",
    Dragon: "#7038F8",
    Electric: "#F8D030",
    Fairy: "#EE99AC",
    Fighting: "#C03028",
    Fire: "#F08030",
    Flying: "#A890F0",
    Ghost: "#705898",
    Grass: "#78C850",
    Ground: "#E0C068",
    Ice: "#98D8D8",
    Normal: "#A8A878",
    Poison: "#A040A0",
    Psychic: "#F85888",
    Rock: "#B8A038",
    Steel: "#B8B8D0",
    Water: "#6890F0",
};

// Treemap showing the appearance of each type
// Each type is counted once per slot, counting both type1 and type2
d3.csv("pokemon.csv").then((rawData) => {
    console.log("rawData", rawData);
    // Converting the strings to numbers
    rawData.forEach(function (d) {
        d.HP = +d.HP;
        d.Attack = +d.Attack;
        d.Defense = +d.Defense;
        d.Sp_Atk = +d.Sp_Atk;
        d.Sp_Def = +d.Sp_Def;
        d.Speed = +d.Speed;
        d.Total = +d.Total;
    });

    // Counting the number of appearances of each type
    let typeCounts = {};
    rawData.forEach(function (d) {
        typeCounts[d.Type_1] = (typeCounts[d.Type_1] || 0) + 1;
        let t2 = d.Type_2;
        if (t2 != null && String(t2).trim() !== "") {
            typeCounts[t2] = (typeCounts[t2] || 0) + 1;
        }
    });
    let typeData = Object.keys(typeCounts).map(function (key) {
        return { name: key, value: typeCounts[key] };
    });
    console.log("typeData", typeData);

    // Creating the treemap
    let root = d3
        .hierarchy({ name: "Pokemon", children: typeData })
        .sum((d) => d.value)
        .sort((a, b) => b.value - a.value);

    d3.treemap()
        .tile(d3.treemapSquarify)
        .size([treeWidth, treeHeight])
        .paddingInner(1)
        .paddingOuter(2)(root);

    // Selecting the svg element
    const svg = d3.select("svg");

    // Creating the treemap (continued)
    const g1 = svg
        .append("g")
        .attr("transform", `translate(${treeMargin.left}, ${treeMargin.top})`);

    // Adding the title to the treemap
    svg.append("text")
        .attr("x", treeMargin.left + treeWidth / 2)
        .attr("y", 24)
        .attr("font-size", "18px")
        .attr("text-anchor", "middle")
        .text("Type Appearances");

    let cells = g1.selectAll("g").data(root.leaves());

    // Creating the cells for the treemap
    let cell = cells
        .enter()
        .append("g")
        .attr("transform", (d) => `translate(${d.x0}, ${d.y0})`);

    cell.append("rect")
        .attr("width", (d) => d.x1 - d.x0)
        .attr("height", (d) => d.y1 - d.y0)
        .attr("fill", (d) => typeColors[d.data.name] || "#999");

    // Adding the type names to the cells
    cell.append("text")
        .attr("x", 4)
        .attr("y", 18)
        .attr("font-size", "13px")
        .attr("fill", "white")
        .text((d) => {
            if (d.x1 - d.x0 < 55 || d.y1 - d.y0 < 30) return "";
            return d.data.name;
        });

    // Legend defining types and their total counts
    let legendX = treeMargin.left + treeWidth + 10;
    let legendY = treeMargin.top + 6;
    let sorted = typeData.slice().sort((a, b) => b.value - a.value);
    const legRowH = 17;

    sorted.forEach(function (d, i) {
        const ly = legendY + i * legRowH;
        svg.append("rect")
            .attr("x", legendX)
            .attr("y", ly)
            .attr("width", 11)
            .attr("height", 11)
            .attr("fill", typeColors[d.name] || "#999");
        svg.append("text")
            .attr("x", legendX + 16)
            .attr("y", ly + 13)
            .attr("font-size", "16px")
            .text(d.name + " (" + d.value + ")");
    });

    svg.append("text")
        .attr("x", legendX)
        .attr("y", legendY - 5)
        .attr("font-size", "16px")
        .text("Legend");

    // Scatter plot: Attack vs Defense, color Type_1, size Total
    
    // Creating the scale for the x-axis
    const xS = d3
        .scaleLinear()
        .domain(d3.extent(rawData, (d) => d.Attack))
        .nice()
        .range([0, scatterWidth]);
        
    // Creating the scale for the y-axis
    const yS = d3
        .scaleLinear()
        .domain(d3.extent(rawData, (d) => d.Defense))
        .nice()
        .range([scatterHeight, 0]);
        
    // Creating the scale for the radius of each point
    const rS = d3
        .scaleSqrt()
        .domain(d3.extent(rawData, (d) => d.Total))
        .range([2.5, 9]);

    const g2 = svg
        .append("g")
        .attr(
            "transform",
            `translate(${scatterPanelLeft + scatterMargin.left}, ${scatterMargin.top})`,
        );

    // Scatter plot title
    svg.append("text")
        .attr("x", scatterPanelLeft + scatterMargin.left + scatterWidth / 2)
        .attr("y", 24)
        .attr("font-size", "18px")
        .attr("text-anchor", "middle")
        .text("Base Attack vs Base Defense");

    // x-axis and y-axis creation + labels
    const xAxis = d3.axisBottom(xS).ticks(8);
    g2.append("g")
        .attr("transform", `translate(0, ${scatterHeight})`)
        .call(xAxis);

    const yAxis = d3.axisLeft(yS).ticks(8);
    g2.append("g").call(yAxis);

    g2.append("text")
        .attr("x", scatterWidth / 2)
        .attr("y", scatterHeight + 40)
        .attr("font-size", "16px")
        .attr("text-anchor", "middle")
        .text("Attack");

    g2.append("text")
        .attr("x", -(scatterHeight / 2))
        .attr("y", -40)
        .attr("font-size", "16px")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text("Defense");

    g2.append("text")
        .attr("x", scatterWidth / 2)
        .attr("y", 0)
        .attr("font-size", "12px")
        .attr("text-anchor", "middle")
        .attr("fill", "#444")
        .text("Point size = Total base stats");

    // Creating the dots for the scatter plot
    const dots = g2.selectAll("circle").data(rawData);

    dots.enter()
        .append("circle")
        .attr("cx", (d) => xS(d.Attack))
        .attr("cy", (d) => yS(d.Defense))
        .attr("r", (d) => rS(d.Total))
        .attr("fill", (d) => typeColors[d.Type_1] || "#999")
        .attr("fill-opacity", 0.65)
        .attr("stroke", "#222")
        .attr("stroke-width", 0.4);

    // Parallel coordinates plot for the base stats
    const dimList = [
        { key: "HP", label: "HP" },
        { key: "Attack", label: "Attack" },
        { key: "Defense", label: "Defense" },
        { key: "Sp_Atk", label: "Sp. Atk" },
        { key: "Sp_Def", label: "Sp. Def" },
        { key: "Speed", label: "Speed" },
    ];

    // Creating the scale for the x-axis
    const xPC = d3
        .scalePoint()
        .domain(dimList.map((d) => d.key))
        .range([0, pcWidth])
        .padding(0.55);

    // Creating the scale for the y-axis
    const yPC = {};
    dimList.forEach(function (dim) {
        yPC[dim.key] = d3
            .scaleLinear()
            .domain(d3.extent(rawData, (r) => r[dim.key]))
            .nice()
            .range([pcHeight, 0]);
    });

    // Creating the plot line
    const linePC = d3
        .line()
        .x((pt) => pt[0])
        .y((pt) => pt[1]);

    // Creating the path for each row
    function pathForRow(d) {
        const pts = dimList.map(function (dim) {
            return [xPC(dim.key), yPC[dim.key](d[dim.key])];
        });
        return linePC(pts);
    }

    const g3 = svg
        .append("g")
        .attr("transform", `translate(${pcMargin.left}, ${pcTop + pcMargin.top})`);

    // Graph title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", pcTop + 16)
        .attr("font-size", "18px")
        .attr("text-anchor", "middle")
        .text("Base Stats");

    // Creating the path for each row (continued)
    g3.selectAll("path.pokemon-line")
        .data(rawData)
        .enter()
        .append("path")
        .attr("class", "pokemon-line")
        .attr("d", pathForRow)
        .attr("fill", "none")
        .attr("stroke", (d) => typeColors[d.Type_1] || "#999")
        .attr("stroke-width", 1)
        .attr("stroke-opacity", 0.14);

    // Creating the axis for each dimension
    dimList.forEach(function (dim) {
        const x = xPC(dim.key);
        const ag = g3
            .append("g")
            .attr("transform", `translate(${x}, 0)`)
            .call(d3.axisLeft(yPC[dim.key]).ticks(4).tickSizeOuter(0));

        ag.selectAll("text").attr("font-size", "9px");

        g3.append("text")
            .attr("x", x)
            .attr("y", pcHeight + 28)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .text(dim.label);
    });
}).catch(function (error) {
    console.log(error);
});
