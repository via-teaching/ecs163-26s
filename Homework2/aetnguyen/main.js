// Alice Nguyen 920906323

// Set up dimensions for the visualizations 
const width = 1600;
const height = 850;
const max_chart_height = 750;

// Set up SVG so that it scales along with the size of the window, so aspects do not get cut off
// d3 function uses the exisiting element 
const svg = d3.select("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .attr("width", "100%")
    .attr("height", "100%");

// Load the pokemon dataset
// d3 function to load csv and convert into array of js objects
d3.csv("data/pokemon_alopez247.csv").then(function(dataset) {

    // Convert the columns we need into numerical values
    dataset.forEach(function(data) {
        data.Total = +data.Total;
        data.HP = +data.HP;
        data.Attack = +data.Attack;
        data.Defense = +data.Defense;
        data.Sp_Atk = +data.Sp_Atk;
        data.Sp_Def = +data.Sp_Def;
        data.Speed = +data.Speed;
        data.Generation = +data.Generation;
    });

    // Get the top 10 types by count of them
    // Filter dataset to prevent too much clutter in the visualizations
    // d3 function (nest) groups rows by the type  
    const counts_of_types = d3.nest()
        .key(function(d) { return d.Type_1; })
        .rollup(function(v) { return v.length; })
        .entries(dataset)
        .sort(function(a, b) { return b.value - a.value; });

    const top_types = counts_of_types.slice(0, 10).map(function(d) {
        return d.key;
    });

    const filtered_data = dataset.filter(function(d) {
        return top_types.includes(d.Type_1);
    });

    // d3 function for creating a color scale to use for the 2D heatmap and scatterplot etc
    const color = d3.scaleOrdinal(d3.schemeCategory10)
        .domain(top_types);

    // Title for the webpage and draw the three visualization types
    draw_title();
    draw_heatmap(filtered_data, top_types);
    draw_scatterplot(filtered_data, color);
    draw_sankey(filtered_data, top_types, color);
    draw_legend(top_types, color);

// Catch any errors when loading data
}).catch(function(error) {
    console.log(error);
});

// Function to draw the title and the subtitle for the webpage
// Makes it clear to the viewer what the story I am trying to tell is 
function draw_title() {
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 10)
        .attr("text-anchor", "middle")
        .attr("font-size", "30px")
        .attr("font-weight", "bold")
        // Title
        .text("How a Pokemon’s Type Determines Their Destiny");

    // Subtitle 
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 37)
        .attr("text-anchor", "middle")
        .attr("font-size", "22px")
        .text("Exploring how the primary type relates to battle style, speed, generation, and legendary status.");
}

// Function to create the heatmap
// Purpose is to show how the primary type of a pokemon relates to if their battle style is more physical or special
function draw_heatmap(data, topTypes) {
    const margin = {top: 120, right: 20, bottom: 70, left: 70};
    const chart_width = width / 3 - margin.left - margin.right;
    const chart_height = max_chart_height - margin.top - margin.bottom;

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    g.append("text")
        .attr("x", chart_width / 2)
        .attr("y", -45)
        .attr("text-anchor", "middle")
        .attr("font-size", "20px")
        .attr("font-weight", "bold")
        .text("What battle style is each type built for?");

    g.append("text")
        .attr("x", chart_width / 2)
        .attr("y", -25)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .text("Average physical vs. special attack by type");

    // So it can be easier to understand in the visualization 
    const stats = [
    {
        column: "Attack",
        label: "Physical Attack"
    },
    {
        column: "Sp_Atk",
        label: "Special Attack"
    }];

    // Calculate average stat value for each type and stat pair
    let heatmap_data = [];

    topTypes.forEach(function(type) {
        stats.forEach(function(stat) {
            const values = data.filter(function(d) {
                return d.Type_1 === type;
            });
            // Add to heatmap data array 
            heatmap_data.push({
                type: type,
                stat: stat.label,
                value: d3.mean(values, function(d) {
                    return d[stat.column];
                })
            });
        });
    });

    // d3 function to create x and y scales for heatmap as well as color scales
    // Used for categorical data
    const x = d3.scaleBand()
        .domain(stats.map(function(d) { return d.label; }))
        .range([0, chart_width])
        .padding(0.08);
    const y = d3.scaleBand()
        .domain(topTypes)
        .range([0, chart_height])
        .padding(0.08);
    // d3 function to create sequential coloring scale for the hm
    const color = d3.scaleSequential(d3.interpolateBlues)
        .domain([0, d3.max(heatmap_data, function(d) { return d.value; })]);

    // Draw the axes and label
    g.append("g")
        .attr("transform", `translate(0, ${chart_height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("font-size", "14px");

    g.append("g")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .attr("font-size", "14px");

    // Draw heatmap rectangles
    g.selectAll("rect")
        .data(heatmap_data)
        .enter()
        .append("rect")
        .attr("x", function(d) { return x(d.stat); })
        .attr("y", function(d) { return y(d.type); })
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("fill", function(d) { return color(d.value); });

    g.selectAll(".heat-label")
        .data(heatmap_data)
        .enter()
        .append("text")
        .attr("class", "heat-label")
        .attr("x", function(d) { return x(d.stat) + x.bandwidth() / 2; })
        .attr("y", function(d) { return y(d.type) + y.bandwidth() / 2 + 4; })
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .text(function(d) { return Math.round(d.value); });
}

// Function to create the scatterplot
// Purpose is to show if power or attack is correlated to speed
// Use primary type as color scheme to see if certain types are more likely to be powerful and also fast 
function draw_scatterplot(data, color) {
    const margin = {top: 120, right: 40, bottom: 70, left: 70};
    const chart_width = width / 3 - margin.left - margin.right;
    const chart_height = max_chart_height - margin.top - margin.bottom;

    const g = svg.append("g")
        .attr("transform", `translate(${width / 3 + margin.left}, ${margin.top})`);

    g.append("text")
        .attr("x", chart_width / 2)
        .attr("y", -45)
        .attr("text-anchor", "middle")
        .attr("font-size", 20)
        .attr("font-weight", "bold")
        .text("Is power correlated to speed?");

    g.append("text")
        .attr("x", chart_width / 2)
        .attr("y", -25)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .text("Attack vs. Speed (Colored by primary type)");

    // d3 function to create linear x and y scales 
    // The size of the data points are determined by the HP (health) stats
    const x = d3.scaleLinear()
        .domain([0, d3.max(data, function(d) { return d.Attack; })])
        .range([0, chart_width])
        .nice();

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, function(d) { return d.Speed; })])
        .range([chart_height, 0])
        .nice();

    // d3 function (scaleSqrt) to create a scale for the size of the points 
    const size = d3.scaleSqrt()
        .domain([0, d3.max(data, function(d) { return d.HP; })])
        .range([3, 9]);

    // Draw the axes and label
    g.append("g")
        .attr("transform", `translate(0, ${chart_height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("font-size", "14px");

    g.append("g")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .attr("font-size", "14px");
    
    // Create an interactive feature that shows the name when you hover over the points
    const interactive_info = d3.select("body")
        .append("div")
        .style("position", "absolute")
        .style("background", "white")
        .style("border", "1px solid #999")
        .style("border-radius", "6px")
        .style("padding", "8px")
        .style("font-size", "14px")
        .style("pointer-events", "none")
        .style("opacity", 0);

    g.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", function(d) { return x(d.Attack); })
        .attr("cy", function(d) { return y(d.Speed); })
        .attr("r", function(d) { return size(d.HP); })
        .attr("fill", function(d) { return color(d.Type_1); })
        .attr("opacity", 0.65)

        // When hovering, show the tooltip with information about that Pokémon
        .on("mouseover", function(d) {
            interactive_info
                .style("opacity", 1)
                .html(
                    "<strong>" + d.Name + "</strong><br>" +
                    "Type: " + d.Type_1 + "<br>" +
                    "Attack: " + d.Attack + "<br>" +
                    "Speed: " + d.Speed + "<br>" +
                    "HP: " + d.HP
                );

            d3.select(this)
                .attr("stroke", "black")
                .attr("stroke-width", 2);
        })

        // Move near the mouse
        .on("mousemove", function(d) {
            interactive_info
                .style("left", (d3.event.pageX + 12) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })

        // Hide when the mouse leaves the point
        .on("mouseout", function(d) {
            interactive_info.style("opacity", 0);

            d3.select(this)
                .attr("stroke", "none");
    });

    g.append("text")
        .attr("x", chart_width / 2)
        .attr("y", chart_height + 50)
        .attr("text-anchor", "middle")
        .text("Attack");

    g.append("text")
        .attr("x", -chart_height / 2)
        .attr("y", -50)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .text("Speed");
}

// Function to create the sankey diagram
// Purpose is the show the flow of the primary type of a pokemon to the generation to see if they will be legendary or not
// How do the types evolve across generations 
function draw_sankey(data, topTypes, color) {
    const margin = {top: 120, right: 40, bottom: 50, left: 40};
    const chart_width = width / 3 - margin.left - margin.right;
    const chart_height = max_chart_height - margin.top - margin.bottom;

    const g = svg.append("g")
        .attr("transform", `translate(${2 * width / 3 + margin.left}, ${margin.top})`);

    g.append("text")
        .attr("x", chart_width / 2)
        .attr("y", -45)
        .attr("text-anchor", "middle")
        .attr("font-size", 20)
        .attr("font-weight", "bold")
        .text("How do types evolve / vary across generations?");

    g.append("text")
        .attr("x", chart_width / 2)
        .attr("y", -25)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .text("Type → Generation → Legendary Status");

    // Get the unique generations and legendary status values
    // d3 function creates array of the generations of uniformly spaced numbers 
    const generations = d3.range(1, d3.max(data, function(d) {
        return d.Generation;
    }) + 1).map(function(d) {
        return "Gen " + d;
    });

    // Legendary status determined by legendary column in ds
    const statuses = ["Not Legendary", "Legendary"];

    // X and y scales for the three columns
    const x_ptype = 0;
    const x_generation = chart_width / 2;
    const x_lstatus = chart_width;

    // d3 function (scalePoint) to create a scale for the y axis for the three columns
    const y_type = d3.scalePoint()
        .domain(topTypes)
        .range([20, chart_height - 20]);

    const y_generation = d3.scalePoint()
        .domain(generations)
        .range([20, chart_height - 20]);

    const y_lstatus = d3.scalePoint()
        .domain(statuses)
        .range([chart_height * 0.35, chart_height * 0.65]);

    // Draw the links from type to generation using a helper function 
    const type_to_gen = d3.nest()
        .key(function(d) { return d.Type_1; })
        .key(function(d) { return "Gen " + d.Generation; })
        .rollup(function(v) { return v.length; })
        .entries(data);

    // Draw the first set of links
    // Go through pokemon type groups 
    type_to_gen.forEach(function(typeGroup) {
        typeGroup.values.forEach(function(genGroup) {
            draw_sankey_curve(
                g,
                x_ptype,
                y_type(typeGroup.key),
                x_generation,
                y_generation(genGroup.key),
                Math.max(1, genGroup.value / 4),
                color(typeGroup.key)
            );
        });
    });

    // Draw the links from generation to legendary status
    // d3 function groups the data by using the groupBy clayse like in SQL based on the keys
    const generation_status = d3.nest()
        .key(function(d) { return "Gen " + d.Generation; })
        .key(function(d) {
            return d.Legendary === "True" || d.Legendary === true ? "Legendary" : "Not Legendary";
        })
        .rollup(function(v) { return v.length; })
        .entries(data);

    generation_status.forEach(function(generation_group) {
        generation_group.values.forEach(function(statusGroup) {
            draw_sankey_curve(
                g,
                x_generation,
                y_generation(generation_group.key),
                x_lstatus,
                y_lstatus(statusGroup.key),
                Math.max(3, statusGroup.value / 5),
                "gray"
            );
        });
    });

    // Label the types according to color scale
    g.selectAll(".type-label")
        .data(topTypes)
        .enter()
        .append("text")
        .attr("x", x_ptype)
        .attr("y", function(d) { return y_type(d); })
        .attr("text-anchor", "start")
        .attr("font-size", "14px")
        .attr("fill", function(d) { return color(d); })
        .text(function(d) { return d; });

    // Generation labels
    g.selectAll(".gen-label")
        .data(generations)
        .enter()
        .append("text")
        .attr("x", x_generation)
        .attr("y", function(d) { return y_generation(d); })
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .text(function(d) { return d; });

    // Legendary labels
    g.selectAll(".status-label")
        .data(statuses)
        .enter()
        .append("text")
        .attr("x", x_lstatus)
        .attr("y", function(d) { return y_lstatus(d); })
        .attr("text-anchor", "end")
        .attr("font-size", "14px")
        .text(function(d) { return d; });

    // Column labels
    g.append("text")
        .attr("x", x_ptype)
        .attr("y", 0)
        .attr("font-weight", "bold")
        .text("Type");
    g.append("text")
        .attr("x", x_generation)
        .attr("y", 0)
        .attr("text-anchor", "middle")
        .attr("font-weight", "bold")
        .text("Generation");
    g.append("text")
        .attr("x", x_lstatus)
        .attr("y", 0)
        .attr("text-anchor", "end")
        .attr("font-weight", "bold")
        .text("Status");
}

// Function to draw the legend on the bottom to make the color scheme more clear for viewers
function draw_legend(topTypes, color) {
    const legend = svg.append("g")
        .attr("transform", `translate(70, ${height - 100})`);

    legend.append("text")
        .attr("x", 0)
        .attr("y", -10)
        .attr("font-size", "20px")
        .attr("font-weight", "bold")
        .text("Primary Type Colors");

    legend.selectAll("circle")
        .data(topTypes)
        .enter()
        .append("circle")
        .attr("cx", function(d, i) { return i * 145; })
        .attr("cy", 12)
        .attr("r", 6)
        .attr("fill", function(d) { return color(d); });

    legend.selectAll("text.type-label")
        .data(topTypes)
        .enter()
        .append("text")
        .attr("class", "type-label")
        .attr("x", function(d, i) { return i * 145 + 12; })
        .attr("y", 17)
        .attr("font-size", "18px")
        .text(function(d) { return d; });
    
    legend.append("text")
        .attr("x", 0)
        .attr("y", 82)
        .attr("font-size", "18px")
        .text("Heatmap: darker blue means a higher average value");

    legend.append("text")
        .attr("x", 0)
        .attr("y", 42)
        .attr("font-size", "18px")
        .text("Scatterplot: size of the circles represents HP, hover over points to view additional information");
    
        legend.append("text")
        .attr("x", 0)
        .attr("y", 62)
        .attr("font-size", "18px")
        .text("Sankey: thicker lines represent more Pokemon");

}

// Helper function to draw the Sankey curves
function draw_sankey_curve(g, x1, y1, x2, y2, thickness, color) {
    const path = d3.path();

    path.moveTo(x1, y1);
    path.bezierCurveTo(
        (x1 + x2) / 2, y1,
        (x1 + x2) / 2, y2,
        x2, y2
    );

    g.append("path")
        .attr("d", path.toString())
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", thickness)
        .attr("opacity", 0.22);
}

// How to handle if the window sizing is changed, so that the visuals scale with it
window.addEventListener("resize", function() {
    location.reload();
});

/*
AI Disclosure:
I used tools like ChatGPT to gain a better understanding of the d3 functions and best use cases for them.
Although a lot of the functions were the same ones I used for the last assignment, but there were more that I wanted to learn how to use for this assignment as I was interacting with different data.
For the most part, I referenced resources linked to the assignment instructions as well as the last homework as a basis, but if I was confused about syntax or how to
correctly implement logic or use a function, I would refer to other tools. 
I listed some links I referenced below that were helpful for me in understanding and implementing this homework.
Any AI usage was to support my understanding and learning.
https://www.w3schools.com/ai/ai_d3js.asp
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide 
*/