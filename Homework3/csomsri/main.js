// Bindings
const scatterSvg = d3.select("#scatter-plot");
const barSvg = d3.select("#bar-chart");
const starSvg = d3.select("#star-plot");
const genFilter = d3.select("#generation-filter");
const typeFilter = d3.select("#type-filter");
const pokeSelect = d3.select("#pokemon-select");

let allPokemonData = [];
let selectedBarType = "All";

// This function takes a range and returns a random integer
function randint(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// This function a Pokemon matches a given type (first and second stat)
function hasType(pokemon, type) {
    if (type === "All") {
        return true;
    }

    const type1 = pokemon.Type_1 ? pokemon.Type_1.trim() : "";
    const type2 = pokemon.Type_2 ? pokemon.Type_2.trim() : "";

    return type1 === type || type2 === type;
}

// This Function changes the filter based on wahts avaialable
function getFilteredDataFromControls(baseData) {
    const generationSelect = d3.select("#generation-filter"); // HTML element
    const typeSelect = d3.select("#type-filter"); // HTML Element

    const selectedGeneration = generationSelect.property("value") || "All";
    const selectedDropdownType = typeSelect.property("value") || "All";

    return baseData.filter(d => {
        const type1 = d.Type_1 ? d.Type_1.trim() : "";
        const type2 = d.Type_2 ? d.Type_2.trim() : "";

        const matchesBarType =
            selectedBarType === "All" ||
            type1 === selectedBarType ||
            type2 === selectedBarType;

        const matchesGeneration =
            selectedGeneration === "All" ||
            d.Generation == selectedGeneration;

        const matchesDropdownType =
            selectedDropdownType === "All" ||
            type1 === selectedDropdownType ||
            type2 === selectedDropdownType;

        return matchesBarType && matchesGeneration && matchesDropdownType;
    });
}

// This function updates the dashboard based oj interactions
function updateDashboardFromControls() {
    // Update each time data gets changed
    const filteredData = getFilteredDataFromControls(allPokemonData);

    drawScatterPlot(filteredData);
    updatePokemonDropdown(filteredData);
}

// This function changes the list of available pokemon in the drop down menu
function updatePokemonDropdown(pokemonList) {
    const pokemonSelect = d3.select("#pokemon-select"); // HTML ELement

    pokemonSelect.selectAll("option").remove();

    if (pokemonList.length > 0) {
        pokemonSelect.selectAll("option")
            .data(pokemonList)
            .join("option")
            .attr("value", d => d.Name)
            .text(d => d.Name);

        pokemonSelect.property("value", pokemonList[0].Name);
        drawStarPlot(pokemonList[0]);
    } else {
        pokemonSelect.append("option")
            .attr("value", "")
            .text("No Pokemon found");

        const svg = d3.select("#star-plot"); // SVG Html Element for Star plot
        const width = 500;
        const height = 500;

        svg.selectAll("*").remove();

        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height / 2)
            .attr("text-anchor", "middle")
            .attr("font-size", "16px")
            .text("No Pokemon found for this selection.");
    }
}

// Load in Data
d3.csv("data/pokemon_alopez247.csv").then(data => {
    data.forEach(d => {
        d.Generation = +d.Generation;
        d.Height_m = +d.Height_m;
        d.Weight_kg = +d.Weight_kg;
        d.Total = +d.Total;
        d.HP = +d.HP;
        d.Attack = +d.Attack;
        d.Defense = +d.Defense;
        d.Sp_Atk = +d.Sp_Atk;
        d.Sp_Def = +d.Sp_Def;
        d.Speed = +d.Speed;
        d.isLegendary = String(d.isLegendary).trim().toLowerCase() === "true";
        d.hasMegaEvolution = String(d.hasMegaEvolution).trim().toLowerCase() === "true";
    });

    allPokemonData = data;

    // Draw everything
    drawScatterPlot(data);
    drawBarChart(data);
    setupPokemonFilters(data);
});

// This function draws the scatter plot
function drawScatterPlot(data) {
    const svg = d3.select("#scatter-plot");

    const width = 650;
    const height = 300;

    svg.selectAll("*").remove();

    const margin = {
        top: 30,
        right: 150,
        bottom: 60,
        left: 70
    };

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Chart
    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Calculate the max attack and max defesne 
    const maxAttack = d3.max(data, d => d.Attack + d.Sp_Atk) || 1;
    const maxDefense = d3.max(data, d => d.Defense + d.Sp_Def) || 1;

    // x Axis scales linearly based on the value of attacks
    const xScale = d3.scaleLinear()
        .domain([0, maxAttack])
        .nice()
        .range([0, innerWidth]);

    // y Axis scales linearly based on the value of defense 
    const yScale = d3.scaleLinear()
        .domain([0, maxDefense])
        .nice()
        .range([innerHeight, 0]);

    const totalExtent = d3.extent(allPokemonData, d => d.Total); // Min max array for pokemon total stat

    const sizeScale = d3.scaleSqrt() // Radius 
        .domain(totalExtent)
        .range([3, 9]);

    const legendaryColor = d3.scaleOrdinal() // Categorical
        .domain(["Not Legendary", "Legendary"])
        .range(["#9e9e9e", "#f2c94c"]);

    // This creates each circle in scatter plot
    const points = chart.selectAll("circle.pokemon-point")
        .data(data, d => d.Name)
        .join("circle")
        .attr("class", "pokemon-point")
        .attr("cx", d => xScale(d.Attack + d.Sp_Atk)) // Position based on attack
        .attr("cy", d => yScale(d.Defense + d.Sp_Def)) // position based on defense
        .attr("r", d => sizeScale(d.Total)) // Radius based on stat total
        .attr("fill", d => legendaryColor(d.isLegendary ? "Legendary" : "Not Legendary")) // Color
        .attr("opacity", 0)
        .attr("stroke", d => d.hasMegaEvolution ? "black" : "#666") // Highlight Mega
        .attr("stroke-width", d => d.hasMegaEvolution ? 2.5 : 0.5) // Border
        .style("cursor", "pointer")
        .on("click", function(event, d) {
            d3.select("#pokemon-select").property("value", d.Name);
            drawStarPlot(d);
        });

    // Attributes for labels
    points.append("title")
        .text(d =>
            `${d.Name}
            Attack: ${d.Attack + d.Sp_Atk}
            Defense: ${d.Defense + d.Sp_Def}
            Total: ${d.Total}
            Legendary: ${d.isLegendary}
            Mega Evolution: ${d.hasMegaEvolution}`
        );
    
    // Makes a transition of transparency (When brushing)
    points.transition()
        .duration(600)
        .attr("opacity", 0.75);
    
    // Add x axis
    chart.append("g")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(d3.axisBottom(xScale));
    
    // Add y axis
    chart.append("g")
        .call(d3.axisLeft(yScale));
    
    // X axis labels
    chart.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 45)
        .attr("text-anchor", "middle")
        .text("Total Attack");
    
    // Y axis labels
    chart.append("text")
        .attr("x", -innerHeight / 2)
        .attr("y", -50)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .text("Total Defense");

    chart.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .text(selectedBarType === "All" ? "Total Attack vs Total Defense" : `Total Attack vs Total Defense: ${selectedBarType} Type`);

    chart.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 58)
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("fill", "#666")
        .text("Brush over points to select a subset and update the stat profile.");
    
    // This allows us to brush, and the maximum of brush is based on SVG dimensions
    const brush = d3.brush()
        .extent([[0, 0], [innerWidth, innerHeight]])
        .on("end", brushed);

    chart.append("g")
        .attr("class", "brush")
        .call(brush);
    
    // This function handles event logic for burhsing
    function brushed(event) { 
        const selection = event.selection; // Event handeling

        // Ifi ts not in the selection then dim down the circles
        if (!selection) {
            chart.selectAll("circle.pokemon-point")
                .transition()
                .duration(400)
                .attr("opacity", 0.75)
                .attr("stroke-width", d => d.hasMegaEvolution ? 2.5 : 0.5);

            updatePokemonDropdown(data); // Update the drop down menu based on whats selected
            return;
        }

        // Brush box
        const [[x0, y0], [x1, y1]] = selection; // ANything in the box is selected

        const brushedPokemon = data.filter(d => {
            const x = xScale(d.Attack + d.Sp_Atk);
            const y = yScale(d.Defense + d.Sp_Def);

            return x0 <= x && x <= x1 && y0 <= y && y <= y1;
        });

        // Highlight selected or dim down unselected
        chart.selectAll("circle.pokemon-point")
            .transition()
            .duration(400)
            .attr("opacity", d => brushedPokemon.includes(d) ? 1 : 0.15)
            .attr("stroke-width", d => brushedPokemon.includes(d) ? 3 : 0.5);

        if (brushedPokemon.length > 0) {
            updatePokemonDropdown(brushedPokemon);
        }
    }

    // Legend 
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - margin.right + 20}, ${margin.top + 10})`);

    legend.append("text")
        .attr("x", 10)
        .attr("y", 0)
        .attr("font-weight", "bold")
        .text("Legendary");

    const legendaryItems = ["Not Legendary", "Legendary"];

    // Is Legendary
    legend.selectAll(".legendary-item")
        .data(legendaryItems)
        .join("g")
        .attr("class", "legendary-item")
        .attr("transform", (d, i) => `translate(0, ${i * 22})`)
        .each(function(d) {
            const item = d3.select(this);

            item.append("circle")
                .attr("cx", 20)
                .attr("cy", 16)
                .attr("r", 6)
                .attr("fill", legendaryColor(d));

            item.append("text")
                .attr("x", 30)
                .attr("y", 20)
                .attr("font-size", "11px")
                .text(d);
        });
    
    // Has mega or not
    const megaLegend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - margin.right + 20}, ${margin.top + 90})`);

    megaLegend.append("text")
        .attr("x", 10)
        .attr("y", 0)
        .attr("font-weight", "bold")
        .text("Mega Evolution");

    megaLegend.append("circle")
        .attr("cx", 20)
        .attr("cy", 16)
        .attr("r", 6)
        .attr("fill", "white")
        .attr("stroke", "black")
        .attr("stroke-width", 2.5);

    megaLegend.append("text")
        .attr("x", 30)
        .attr("y", 20)
        .attr("font-size", "11px")
        .text("Has Mega");

    megaLegend.append("circle")
        .attr("cx", 20)
        .attr("cy", 38)
        .attr("r", 6)
        .attr("fill", "white")
        .attr("stroke", "#666")
        .attr("stroke-width", 0.5);

    megaLegend.append("text")
        .attr("x", 30)
        .attr("y", 42)
        .attr("font-size", "11px")
        .text("No Mega");
    
    // Size of circle
    const sizeLegend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - margin.right + 20}, ${margin.top + 170})`);

    sizeLegend.append("text")
        .attr("x", 10)
        .attr("y", 0)
        .attr("font-weight", "bold")
        .text("Total Stat");

    sizeLegend.append("circle")
        .attr("cx", 20)
        .attr("cy", 16)
        .attr("r", 6)
        .attr("fill", "white")
        .attr("stroke", "#666");

    sizeLegend.append("text")
        .attr("x", 30)
        .attr("y", 20)
        .attr("font-size", "11px")
        .text("Size = Total Stat");
}

// This function controls the logic of the bar chart
function drawBarChart(data) {
    const svg = d3.select("#bar-chart"); // HTML Element

    const width = 650;
    const height = 300;

    const margin = {
        top: 30,
        right: 30,
        bottom: 90,
        left: 70
    };

    // Type color based on official pokemon site
    const typeColor = {
        Bug: "#94bc4a",
        Dark: "#736c75",
        Dragon: "#6a7baf",
        Electric: "#e5c531",
        Fairy: "#e397d1",
        Fighting: "#cb5f48",
        Fire: "#ea7a3c",
        Flying: "#7da6de",
        Ghost: "#846ab6",
        Grass: "#71c558",
        Ground: "#cc9f4f",
        Ice: "#70cbd4",
        Normal: "#aab09f",
        Poison: "#b468b7",
        Psychic: "#e5709b",
        Rock: "#b2a061",
        Steel: "#89a1b0",
        Water: "#539ae2"
    };

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.selectAll("*").remove();

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Group of Primary type and get the average total stat
    const typeStats = d3.rollups(
        data,
        v => d3.mean(v, d => d.Total), // Average from data points
        d => d.Type_1
    ).map(([type, avgTotal]) => ({
        type: type,
        avgTotal: avgTotal
    }));

    // Sort based on average total
    typeStats.sort((a, b) => d3.descending(a.avgTotal, b.avgTotal));

    // numeric (used for categorial data) scaling for x axis 
    const xScale = d3.scaleBand()
        .domain(typeStats.map(d => d.type))
        .range([0, innerWidth])
        .padding(0.2);
    // numeric  scaling for y axis
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(typeStats, d => d.avgTotal)])
        .nice()
        .range([innerHeight, 0]);

    const colorScale = d => typeColor[d] || "#999999";

    // Create the bar chart
    chart.selectAll("rect")
        .data(typeStats, d => d.type)
        .join("rect")
        .attr("x", d => xScale(d.type))
        .attr("y", innerHeight)
        .attr("width", xScale.bandwidth())
        .attr("height", 0)
        .attr("fill", d => colorScale(d.type))
        .attr("stroke", d => d.type === selectedBarType ? "black" : "none")
        .attr("stroke-width", d => d.type === selectedBarType ? 3 : 0) // Border is created when selected
        .style("cursor", "pointer")
        .on("click", function(event, d) { // Event handeling 
            selectedBarType = selectedBarType === d.type ? "All" : d.type;

            chart.selectAll("rect")
                .attr("stroke", barData => barData.type === selectedBarType ? "black" : "none")
                .attr("stroke-width", barData => barData.type === selectedBarType ? 3 : 0); // Highlght border

            updateDashboardFromControls(); // Select and update the dashboard (and scatter plot)
        })
        .transition() // Transition
        .duration(700)
        .attr("y", d => yScale(d.avgTotal))
        .attr("height", d => innerHeight - yScale(d.avgTotal)); // Heigh based on average total
    
    // Lbels 
    chart.append("g")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .attr("transform", "rotate(-40)")
        .attr("text-anchor", "end");
    
    // Y axis abel
    chart.append("g")
        .call(d3.axisLeft(yScale));
    
    // Axis Label
    chart.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 75)
        .attr("text-anchor", "middle")
        .text("Primary Type");
    
    // Axis label
    chart.append("text")
        .attr("x", -innerHeight / 2)
        .attr("y", -50)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .text("Average Total Stats");
    // Title
    chart.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .text("Average Total Stats by Primary Type");
    
    // Quick instruction
    chart.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 88)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("fill", "#666")
        .text("Click a type bar to filter the scatterplot and stat profile.");
    
    // Quick legend
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${margin.left}, ${height - 20})`);

    legend.append("text")
        .attr("x", 0)
        .attr("y", -15)
        .attr("font-size", "11px")
        .attr("font-weight", "bold")
        .text("Bar height shows the average Total stat for that type and Bar color corresponds to the type.");
}

// This functio nsets up the filters that will be used for the star bplot
function setupPokemonFilters(data) {
    const generationSelect = d3.select("#generation-filter");
    const typeSelect = d3.select("#type-filter");
    const pokemonSelect = d3.select("#pokemon-select");

    // Gather generations
    const generations = Array.from(new Set(data.map(d => d.Generation)))
        .sort((a, b) => d3.ascending(+a, +b));

    // Gather types
    const types = Array.from(
        new Set(
            data.flatMap(d => [d.Type_1, d.Type_2])
                .filter(type => type && type.trim() !== "")
                .map(type => type.trim())
        )
    ).sort(); // Sort type

    // All or the generations that we ahve
    generationSelect.selectAll("option")
        .data(["All", ...generations]) // Truncates
        .join("option")
        .attr("value", d => d)
        .text(d => d === "All" ? "All Generations" : `Generation ${d}`);

    typeSelect.selectAll("option") // All or the types that selected
        .data(["All", ...types])
        .join("option")
        .attr("value", d => d)
        .text(d => d === "All" ? "All Types" : d);

    // Everything time we change the filters, we have to update
    generationSelect.on("change", updateDashboardFromControls);
    typeSelect.on("change", updateDashboardFromControls);

    // Change star plot on any seleciton change
    pokemonSelect.on("change", function () {
        const selectedName = this.value;
        const selectedPokemon = allPokemonData.find(d => d.Name === selectedName);

        if (selectedPokemon) {
            drawStarPlot(selectedPokemon); // Once there is a pokemon we display the stats
        }
    });
    
    // Update 
    updateDashboardFromControls(); 
}

// This function draws the star plot
function drawStarPlot(pokemon) {
    const svg = d3.select("#star-plot"); // HTML
    const width = 500;
    const height = 500;

    svg.selectAll("*").remove();

    const margin = 70;
    const radius = Math.min(width, height) / 2 - margin;

    const centerX = width / 2;
    const centerY = height / 2;

    // Base stat for vis
    const stats = [
        { stat: "HP", value: pokemon.HP },
        { stat: "Attack", value: pokemon.Attack },
        { stat: "Defense", value: pokemon.Defense },
        { stat: "Sp. Atk", value: pokemon.Sp_Atk },
        { stat: "Sp. Def", value: pokemon.Sp_Def },
        { stat: "Speed", value: pokemon.Speed }
    ];

    const maxStat = 255; // Highest stat avialable

    const angleSlice = (2 * Math.PI) / stats.length;

    // Radius of star based on max stat
    const radiusScale = d3.scaleLinear()
        .domain([0, maxStat])
        .range([0, radius]);

    // Connect lines
    const line = d3.lineRadial()
        .angle((d, i) => i * angleSlice)
        .radius(d => radiusScale(d.value))
        .curve(d3.curveLinearClosed);

    const chart = svg.append("g")
        .attr("transform", `translate(${centerX}, ${centerY})`);

    const ringValues = [50, 100, 150, 200, 255]; // Radius labels

    // Labels and titles 
    chart.selectAll(".ring-label")
        .data(ringValues)
        .join("text")
        .attr("class", "ring-label")
        .attr("x", 5)
        .attr("y", d => -radiusScale(d))
        .attr("font-size", "10px")
        .attr("fill", "#666")
        .text(d => d);

    chart.selectAll(".ring") // Rings are gray
        .data(ringValues)
        .join("circle")
        .attr("class", "ring")
        .attr("r", d => radiusScale(d))
        .attr("fill", "none")
        .attr("stroke", "#ccc")
        .attr("stroke-dasharray", "3,3");

    chart.selectAll(".axis-line") // Draw the lines of the rings
        .data(stats)
        .join("line")
        .attr("class", "axis-line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", (d, i) => {
            const angle = i * angleSlice - Math.PI / 2;
            return Math.cos(angle) * radius;
        })
        .attr("y2", (d, i) => {
            const angle = i * angleSlice - Math.PI / 2;
            return Math.sin(angle) * radius;
        })
        .attr("stroke", "#999");
    
    // Pathing of each point
    chart.append("path")
        .datum(stats)
        .attr("d", line)
        .attr("fill", "steelblue")
        .attr("fill-opacity", 0)
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2)
        .transition()
        .duration(600)
        .attr("fill-opacity", 0.35);

    chart.selectAll(".stat-point") // Point dot
        .data(stats)
        .join("circle")
        .attr("class", "stat-point")
        .attr("cx", (d, i) => {
            const angle = i * angleSlice - Math.PI / 2;
            return Math.cos(angle) * radiusScale(d.value);
        })
        .attr("cy", (d, i) => {
            const angle = i * angleSlice - Math.PI / 2;
            return Math.sin(angle) * radiusScale(d.value);
        })
        .attr("r", 0)
        .attr("fill", "steelblue")
        .transition()
        .duration(600)
        .attr("r", 4);

    chart.selectAll(".stat-label")
        .data(stats)
        .join("text")
        .attr("class", "stat-label")
        .attr("x", (d, i) => {
            const angle = i * angleSlice - Math.PI / 2;
            return Math.cos(angle) * (radius + 25);
        })
        .attr("y", (d, i) => {
            const angle = i * angleSlice - Math.PI / 2;
            return Math.sin(angle) * (radius + 25);
        })
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .text(d => d.stat);
    

    // Graph labels:
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 25)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .attr("font-weight", "bold")
        .text(`${pokemon.Name} Stat Profile`);
    
    // Quick info header
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height - 20)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .text(`Type: ${pokemon.Type_1}${pokemon.Type_2 ? " / " + pokemon.Type_2 : ""} | Total: ${pokemon.Total} | Body: ${pokemon.Body_Style}`);
    
    // Quick Leged
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height - 2)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("fill", "#666")
        .text("Star plot legend: Each axis is a base stat; Disatnce/Radius is based on the value of each stat (0-255)");
}