//used genai to generate sample code
//Margins and dimensions for chart 3
const margin_c3 = { top: 60, right: 30, bottom: 40, left: 30 };
const width_c3  = width  - margin_c3.left - margin_c3.right;
const height_c3 = height * 0.48 - margin_c3.top - margin_c3.bottom;

//Vertical offset: push chart 3 into the bottom half of the screen
const c3Top = height * 0.50;

//Append <g> for chart 3
const g3 = svg.append("g")
    .attr("transform", `translate(${margin_c3.left}, ${c3Top + margin_c3.top})`);

//Column label defs
const column_labels = [
    { x: 0,              text: "Age Group" },
    { x: width_c3 * 0.33, text: "Exercise / Week" },
    { x: width_c3 * 0.66, text: "Wearable Use Freq." },
    { x: width_c3,        text: "Fitness Goals" }
];

//one color per column
const sankey_colors = ["#4e79a8", "#d47c00", "#81b586", "#b6323a"];

//add csv
d3.csv("data/survey_605.csv").then(function(rawData) {

    //Parse the four columns we want
    const data = rawData.map(d => ({
        age:      d["What is your age?"].trim(),
        exercise: d["How often do you exercise in a week?"].trim(),
        wearable: d["How frequently do you use your fitness wearable?"].trim(),
        goals:    d["How has the fitness wearable helped you achieve your fitness goals?"].trim()
    }));

    
    //give each node with a unique name to stop overlaps
    const column_prefix = ["A:", "B:", "C:", "D:"];

    const node_set = new Map(); //keep track of already added nodes
    const node_list = []; //list of each node & col { name, col }


    //custom function to either add or get a sankey node
    function get_or_add_node(prefixed, col) {
        if (!node_set.has(prefixed)) {
            node_set.set(prefixed, node_list.length);
            node_list.push({ name: prefixed, col });
        }
        return node_set.get(prefixed);
    }

    //Count flows between adjacent cols for every row
    const link_map = new Map(); //"source_index-target_index" -> count

    //sankey combiner
    data.forEach(d => {
        const values = [d.age, d.exercise, d.wearable, d.goals];

        //Skip rows that are missing any of the four values
        if (values.some(v => !v)) return;

        for (let i = 0; i < 3; i++) {
            const source_name = column_prefix[i] + values[i];
            const target_name = column_prefix[i + 1] + values[i + 1];
            const source_index = get_or_add_node(source_name, i);
            const target_index = get_or_add_node(target_name, i + 1);

            const key = `${source_index}-${target_index}`;
            link_map.set(key, (link_map.get(key) || 0) + 1);
        }
    });

    //Convert link_map to array of { source, target, value }
    const links = [];
    link_map.forEach((value, key) => {
        const [source, target] = key.split("-").map(Number);
        links.push({ source, target, value });
    });


    //set up the d3 sankey
    const sankey = d3.sankey()
        .nodeWidth(18)
        .nodePadding(12)
        .nodeSort((a, b) => { //force the ordering on ages on the sankey 1st col
            if (a.col === 0 && b.col === 0) {
                return order_age.indexOf(a.name.slice(2)) - order_age.indexOf(b.name.slice(2));
            }
            return d3.ascending(a.name, b.name);
        })
        .extent([[0, 0], [width_c3, height_c3]])
        .nodeAlign(d3.sankeyLeft);


    //start graph
    const graph = sankey({
        nodes: node_list.map(d => Object.assign({}, d)),
        links: links.map(d => Object.assign({}, d))
    });

    const nodes = graph.nodes;
    const sankey_links = graph.links;

    //draw links
    g3.append("g")
        .attr("fill", "none")
        .selectAll(".sankey-link")
        .data(sankey_links)
        .enter()
        .append("path")
        .attr("class", "sankey-link")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke", d => sankey_colors[d.source.col])
        .attr("stroke-width", d => Math.max(1, d.width))
        .attr("stroke-opacity", 0.4);

    //draw cols
    const nodeG = g3.append("g")
        .selectAll(".sankey-node")
        .data(nodes)
        .enter()
        .append("g")
        .attr("class", "sankey-node");

    //draw rects
    nodeG.append("rect")
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => Math.max(1, d.y1 - d.y0))
        .attr("fill", d => sankey_colors[d.col])
        .attr("opacity", 0.9);

    //draw text
    nodeG.append("text")
        //Left-side nodes label to the right; right-side nodes label to the left
        .attr("x", d => d.x0 < width_c3 / 2 ? d.x1 + 6 : d.x0 - 6)
        .attr("y", d => (d.y0 + d.y1) / 2)
        .attr("text-anchor", d => d.x0 < width_c3 / 2 ? "start" : "end")
        .attr("font-size", "10px")
        .attr("fill", "#000000")
        .text(d => d.name.slice(2)); //removes the abcd prefixes

    //add the title
    g3.append("text")
        .attr("x", width_c3 / 2)
        .attr("y", -35)
        .attr("text-anchor", "middle")
        .attr("font-size", "15px")
        .attr("font-weight", "bold")
        .attr("fill", "#000000")
        .text("Flow: Age -> Exercise Frequency -> Wearable Usage -> Fitness Goals");

    //add lables
    column_labels.forEach((col, i) => {
        g3.append("text")
            .attr("x", col.x)
            .attr("y", -15)
            .attr("text-anchor", i === column_labels.length - 1 ? "end" : "start")
            .attr("font-size", "12px")
            .attr("font-weight", "bold")
            .attr("fill", sankey_colors[i])
            .text(col.text);
    });

    //add the legend
    const legend3 = g3.append("g")
        .attr("transform", `translate(${width_c3 - 160}, ${height_c3 - 20})`);

    ["Age Group", "Exercise / Week", "Wearable Usage", "Fitness Goals"].forEach((label, i) => {
        legend3.append("rect")
            .attr("x", 0)
            .attr("y", i * 20)
            .attr("width", 14)
            .attr("height", 14)
            .attr("fill", sankey_colors[i]);

        legend3.append("text")
            .attr("x", 20)
            .attr("y", i * 20 + 11)
            .attr("font-size", "11px")
            .attr("fill", "#000000")
            .text(label);
    });

}).catch(function(error) {
    console.log(error);
});