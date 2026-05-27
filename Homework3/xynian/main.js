
const width = window.innerWidth;
const height = window.innerHeight;


let scatterMargin = {top: 10, right: 30, bottom: 30, left: 60},
    scatterWidth = 400 - scatterMargin.left - scatterMargin.right,
    scatterHeight = 350 - scatterMargin.top - scatterMargin.bottom;



let teamLeft = 0, teamTop = 520;
let teamMargin = {top: 10, right: 30, bottom: 30, left: 60},
    teamWidth = 700,
    teamHeight = 220;

// plots
d3.csv("data/pokemon_alopez247.csv").then(rawData =>{
    console.log("rawData", rawData);

    rawData.forEach(function(d){
        d.Attack = Number(d.Attack);
        d.Defense = Number(d.Defense);
        d.Speed = Number(d.Speed);
        d.Total = Number(d.Total);
        d.Generation = Number(d.Generation);
    });


    const processedData = rawData.map(d=>{
        return {
            "Name": d.Name,
            "Attack": d.Attack,
            "Defense": d.Defense,
            "Speed": d.Speed,
            "Total": d.Total,
            "Type_1": d.Type_1,
            "Generation": d.Generation
        };
    });

    console.log("processedData", processedData);

    //plot 1: Scatter Plot

    // Create main SVG container for the dashboard
    const svg = d3.select("svg");



    // Create group container for scatter plot
    const g1 = svg.append("g")
                .attr("width", scatterWidth + scatterMargin.left + scatterMargin.right)
                .attr("height", scatterHeight + scatterMargin.top + scatterMargin.bottom)
                .attr("transform", `translate(${scatterMargin.left}, 40)`);


                // Add scatter plot title
    g1.append("text")
        .attr("x", scatterWidth / 2)
        .attr("y", -15)
        .attr("text-anchor", "middle")
        .attr("font-size", "20px")
        .text("Attack vs Defense of Pokemons");
    // X label

    // Add scatter plot title
    g1.append("text")
    .attr("x", scatterWidth / 2)
    .attr("y", scatterHeight + 50)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .text("Attack");



    // Y label
    g1.append("text")
    .attr("x", -(scatterHeight / 2))
    .attr("y", -40)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("Defense");

    // X ticks

    // Create x-axis scale for Attack values
    const x1 = d3.scaleLinear()
    .domain([0, d3.max(processedData, d => d.Attack)])
    .range([0, scatterWidth]);

    const xAxisCall = d3.axisBottom(x1)
                        .ticks(7);
    g1.append("g")
    .attr("transform", `translate(0, ${scatterHeight})`)
    .call(xAxisCall)
    .selectAll("text")
        .attr("y", "10")
        .attr("x", "-5")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-40)");

    // Y ticks

    // Create y-axis scale for Defense values
    const y1 = d3.scaleLinear()
    .domain([0, d3.max(processedData, d => d.Defense)])
    .range([scatterHeight, 0]);

    const yAxisCall = d3.axisLeft(y1)
                        .ticks(13);
    g1.append("g").call(yAxisCall);

    // circles

    // Draw circles for each Pokemon in scatter plot
    const circles = g1.selectAll("circle")
    .data(processedData)
    .enter()
    .append("circle")
    .attr("cx", d => x1(d.Attack))
    .attr("cy", d => y1(d.Defense))
    .attr("r", 5)
    .attr("fill", "#85b369")
    .attr("opacity", 0.8);

// Plot 2: Bar Chart for Pokemon Type Count

    // Count number of Pokemon for each primary type
    const typeCounts = processedData.reduce((s, d) => {
    s[d.Type_1] = (s[d.Type_1] || 0) + 1;
    return s;
    }, {});

    const typeData = Object.keys(typeCounts).map(key => ({
    Type_1: key,
    count: typeCounts[key]
    })).sort((a, b) => b.count - a.count);
    console.log("typeData", typeData);

    let sortedAscending = false;

// Create group container for bar chart
    const g3 = svg.append("g")
                .attr("width", teamWidth + teamMargin.left + teamMargin.right)
                .attr("height", teamHeight + teamMargin.top + teamMargin.bottom)
                .attr("transform", `translate(${teamMargin.left}, ${teamTop})`);

    // X label
    g3.append("text")
    .attr("x", teamWidth / 2)
    .attr("y", teamHeight + 50)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .text("Pokemon Type");

    g3.append("text")
    .attr("x", teamWidth / 2)
    .attr("y", -10)
    .attr("text-anchor", "middle")
    .attr("font-size", "20px")
    .text("Pokemon Count by Type");

    // Add clickable sort button for animated bar ordering
const sortButton = g3.append("text")
    .attr("x", teamWidth - 120)
    .attr("y", -10)
    .attr("font-size", "14px")
    .attr("fill", "blue")
    .style("cursor", "pointer")
    .text("Sort Bars")
    .on("click", sortBars);

    // Y label
    g3.append("text")
    .attr("x", -(teamHeight / 2))
    .attr("y", -40)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("Number of Pokemon");

    // X ticks
    const x2 = d3.scaleBand()
    .domain(typeData.map(d => d.Type_1))
    .range([0, teamWidth])
    .paddingInner(0.3)
    .paddingOuter(0.2);

    const xAxisCall2 = d3.axisBottom(x2);
    g3.append("g")
    .attr("transform", `translate(0, ${teamHeight})`)
    .call(xAxisCall2)
    .selectAll("text")
        .attr("y", "10")
        .attr("x", "-5")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-40)");

    // Y ticks
    const y2 = d3.scaleLinear()
    .domain([0, d3.max(typeData, d => d.count)])
    .range([teamHeight, 0])
    .nice();

    const yAxisCall2 = d3.axisLeft(y2)
                        .ticks(6);
    g3.append("g").call(yAxisCall2);

    // bars
    // Draw bars representing Pokemon count by type
    const bars = g3.selectAll("rect").data(typeData);

    bars.enter().append("rect")
    .attr("y", d => y2(d.count))
    .attr("x", d => x2(d.Type_1))
    .attr("width", x2.bandwidth())
    .attr("height", d => teamHeight - y2(d.count))
    .attr("fill", "red")
    .on("click", function(selectedType) {
        highlightType(selectedType.Type_1);
    });

// bar labels
// Add count labels above each bar
    g3.selectAll(".label")
    .data(typeData)
    .enter()
    .append("text")
    .attr("class", "label")
    .attr("x", d => x2(d.Type_1) + x2.bandwidth() / 2)
    .attr("y", d => y2(d.count) - 5)
    .attr("text-anchor", "middle")
    .style("font-size", "10px")
    .text(d => d.count);

    // Sort bars with animated transition
function sortBars() {

    sortedAscending = !sortedAscending;

    typeData.sort((a, b) => {
        return sortedAscending
            ? a.count - b.count
            : b.count - a.count;
    });

    x2.domain(typeData.map(d => d.Type_1));

    g3.selectAll("rect")
        .transition()
        .duration(800)
        .attr("x", d => x2(d.Type_1));

    g3.selectAll(".label")
        .transition()
        .duration(800)
        .attr("x", d => x2(d.Type_1) + x2.bandwidth() / 2);

    g3.select("g")
        .transition()
        .duration(800)
        .call(d3.axisBottom(x2))
        .selectAll("text")
        .attr("y", "10")
        .attr("x", "-5")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-40)");
}


    // Automatic animated type highlighting

    // Display currently highlighted Pokemon type
const currentTypeLabel = g1.append("text")
    .attr("x", 20)
    .attr("y", 20)
    .attr("font-size", "18px")
    .attr("fill", "red")
    .text("Current Type: None");

    // Display highest attack Pokemon for currently highlighted type
const highestAttackLabel = g1.append("text")
    .attr("x", 20)
    .attr("y", 45)
    .attr("font-size", "14px")
    .attr("fill", "black")
    .text("Highest Attack: None");

    // Display highest defense Pokemon for currently highlighted type
const highestDefenseLabel = g1.append("text")
    .attr("x", 20)
    .attr("y", 65)
    .attr("font-size", "14px")
    .attr("fill", "black")
    .text("Highest Defense: None");

    // Display lowest attack Pokemon for currently highlighted type
const lowestAttackLabel = g1.append("text")
    .attr("x", 20)
    .attr("y", 85)
    .attr("font-size", "14px")
    .attr("fill", "black")
    .text("Lowest Attack: None");

    // Display lowest defense Pokemon for currently highlighted type
const lowestDefenseLabel = g1.append("text")
    .attr("x", 20)
    .attr("y", 105)
    .attr("font-size", "14px")
    .attr("fill", "black")
    .text("Lowest Defense: None");

let currentTypeIndex = 0;

function highlightType(typeName) {

    currentTypeLabel.text("Current Type: " + typeName);

    const typePokemon = processedData.filter(d => d.Type_1 === typeName);

    const highestAttack = typePokemon.sort((a, b) => b.Attack - a.Attack)[0];
    const highestDefense = typePokemon.sort((a, b) => b.Defense - a.Defense)[0];
    const lowestAttack = typePokemon.sort((a, b) => a.Attack - b.Attack)[0];
    const lowestDefense = typePokemon.sort((a, b) => a.Defense - b.Defense)[0];

    highestAttackLabel.text(
        "Highest Attack: " + highestAttack.Name + " (" + highestAttack.Attack + ")"
    );

    highestDefenseLabel.text(
        "Highest Defense: " + highestDefense.Name + " (" + highestDefense.Defense + ")"
    );

    lowestAttackLabel.text(
        "Lowest Attack: " + lowestAttack.Name + " (" + lowestAttack.Attack + ")"
    );

    lowestDefenseLabel.text(
        "Lowest Defense: " + lowestDefense.Name + " (" + lowestDefense.Defense + ")"
    );

    circles.transition()
        .duration(800)
        .attr("fill", d => {
            if (d.Name === highestAttack.Name) return "orange";
            if (d.Name === highestDefense.Name) return "blue";
            if (d.Name === lowestAttack.Name) return "purple";
            if (d.Name === lowestDefense.Name) return "green";
            if (d.Type_1 === typeName) return "red";
            return "#cccccc";
        })
        .attr("opacity", d =>
            d.Type_1 === typeName ? 1 : 0.15
        )
        .attr("r", d => {
            if (
                d.Name === highestAttack.Name ||
                d.Name === highestDefense.Name ||
                d.Name === lowestAttack.Name ||
                d.Name === lowestDefense.Name
            ) {
                return 10;
            }

            if (d.Type_1 === typeName) return 7;
            return 4;
        });
}

// Automatically cycle through types every 5 seconds
setInterval(() => {

    const selectedType = typeData[currentTypeIndex].Type_1;

    highlightType(selectedType);

    currentTypeIndex =
        (currentTypeIndex + 1) % typeData.length;

}, 5000);


// =========================
// Plot 3: Collapsible Tree
// =========================

// Create group container for collapsible tree
const g4 = svg.append("g")
    .attr("transform", "translate(850, 80)");

// Add tree title
g4.append("text")
    .attr("x", 250)
    .attr("y", -35)
    .attr("font-size", "20px")
    .attr("text-anchor", "middle")
    .text("Pokemon by Generation and Type (Collapsible Tree)");

// Build hierarchy: Pokemon -> Generation -> Type -> Pokemon names
const treeData = {
    name: "Pokemon",
    children: []
};

const genMap = {};

rawData.forEach(d => {
    const genName = "Gen " + d.Generation;
    const typeName = d.Type_1;
    const pokemonName = d.Name;

    if (!genMap[genName]) {
        genMap[genName] = {};
    }

    if (!genMap[genName][typeName]) {
        genMap[genName][typeName] = [];
    }

    genMap[genName][typeName].push(pokemonName);
});

Object.keys(genMap).forEach(gen => {
    const genNode = {
        name: gen,
        children: []
    };

    Object.keys(genMap[gen]).forEach(type => {
        const typeNode = {
            name: type + " (" + genMap[gen][type].length + ")",
            children: genMap[gen][type].map(name => ({
                name: name
            }))
        };

        genNode.children.push(typeNode);
    });

    treeData.children.push(genNode);
});

// Tree layout settings
const treeWidth = 650;
const treeHeight = 800;

const treeLayout = d3.tree().size([treeHeight, treeWidth]);

let root = d3.hierarchy(treeData);
root.x0 = treeHeight / 2;
root.y0 = 0;

// Collapse only type nodes initially
root.children.forEach(gen => {
    gen.children.forEach(collapse);
});

function collapse(d) {
    if (d.children) {
        d._children = d.children;
        d.children = null;
    }
}

let i = 0;

update(root);

function update(source) {
    const duration = 400;

    // Compute new tree layout
    const treeResult = treeLayout(root);
    const nodes = treeResult.descendants();
    const links = treeResult.links();

    nodes.forEach(d => {
        d.y = d.depth * 140;
    });

    // Draw nodes
    const node = g4.selectAll("g.node")
        .data(nodes, d => d.id || (d.id = ++i));

    const nodeEnter = node.enter()
        .append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${source.y0},${source.x0})`)
        .on("click", click);

    // Add node circles
    nodeEnter.append("circle")
        .attr("r", 5)
        .attr("fill", d => d._children ? "steelblue" : "#69b3a2");

    // Add node labels
    nodeEnter.append("text")
        .attr("dy", "0.35em")
        .attr("x", d => d.children || d._children ? -8 : 8)
        .attr("text-anchor", d => d.children || d._children ? "end" : "start")
        .style("font-size", "8px")
        .text(d => d.data.name);

    const nodeUpdate = nodeEnter.merge(node);

    nodeUpdate.transition()
        .duration(duration)
        .attr("transform", d => `translate(${d.y},${d.x})`);

    nodeUpdate.select("circle")
        .attr("r", 5)
        .attr("fill", d => d._children ? "steelblue" : "#69b3a2");

    const nodeExit = node.exit()
        .transition()
        .duration(duration)
        .attr("transform", d => `translate(${source.y},${source.x})`)
        .remove();

    nodeExit.select("circle")
        .attr("r", 0);

    nodeExit.select("text")
        .style("fill-opacity", 0);

    // Draw links
    const link = g4.selectAll("path.link")
        .data(links, d => d.target.id);

    const linkEnter = link.enter()
        .insert("path", "g")
        .attr("class", "link")
        .attr("fill", "none")
        .attr("stroke", "#999")
        .attr("stroke-width", 1.2)
        .attr("d", d => {
            const o = {x: source.x0, y: source.y0};
            return diagonal(o, o);
        });

    linkEnter.merge(link)
        .transition()
        .duration(duration)
        .attr("d", d => diagonal(d.source, d.target));

    link.exit()
        .transition()
        .duration(duration)
        .attr("d", d => {
            const o = {x: source.x, y: source.y};
            return diagonal(o, o);
        })
        .remove();

    // Store old positions for transitions
    nodes.forEach(d => {
        d.x0 = d.x;
        d.y0 = d.y;
    });
}

// Curved link path
function diagonal(s, d) {
    return `M ${s.y} ${s.x}
            C ${(s.y + d.y) / 2} ${s.x},
              ${(s.y + d.y) / 2} ${d.x},
              ${d.y} ${d.x}`;
}

// Toggle children on click
function click(d) {
    if (d.children) {
        d._children = d.children;
        d.children = null;
    } else {
        d.children = d._children;
        d._children = null;
    }

    update(d);
}

}).catch(function(error){
    console.log(error);
});