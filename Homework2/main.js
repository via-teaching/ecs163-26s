const scatterSvg = d3.select("#scatter-plot");
const barSvg = d3.select("#bar-chart");
const starSvg = d3.select("#star-plot");
const genFilter = d3.select("#generation-filter");
const typeFilter = d3.select("#type-filter");
const pokeSelect = d3.select("#pokemon-select");
    

function randint(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
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

    // Rendering
    drawScatterPlot(data);
    drawBarChart(data);
    setupPokemonFilters(data);
});

function drawScatterPlot(data) {
    // SVG called Scatter Plot
    const svg = d3.select("#scatter-plot");
    
    // Fixed Size
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

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Lienar Scale for the x axis constinting of attack + special attack
    const xScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.Attack + d.Sp_Atk)])
        .nice()
        .range([0, innerWidth]);

    // Linear scael of y axis consisting of defense + special defense
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.Defense + d.Sp_Def)])
        .nice()
        .range([innerHeight, 0]);

    // Circle size based on total
    const sizeScale = d3.scaleSqrt()
        .domain(d3.extent(data, d => d.Total))
        .range([3, 9]);

    // Color of mapping of legendary and not legendary
    const legendaryColor = d3.scaleOrdinal()
        .domain(["Not Legendary", "Legendary"])
        .range(["#9e9e9e", "#f2c94c"]);

    chart.selectAll("circle")
        .data(data)
        .join("circle")
        .attr("cx", d => xScale(d.Attack + d.Sp_Atk))
        .attr("cy", d => yScale(d.Defense + d.Sp_Def))
        .attr("r", d => sizeScale(d.Total))
        .attr("fill", d => legendaryColor(d.isLegendary ? "Legendary" : "Not Legendary"))
        .attr("opacity", 0.75)
        .attr("stroke", d => d.hasMegaEvolution ? "black" : "#666")
        .attr("stroke-width", d => d.hasMegaEvolution ? 2.5 : 0.5)
        .append("title")
        .text(d =>
            `${d.Name}
            Attack: ${d.Attack + d.Sp_Atk}
            Defense: ${d.Defense + d.Sp_Def}
            Total: ${d.Total}
            Legendary: ${d.isLegendary}
            Mega Evolution: ${d.hasMegaEvolution}`
        );
    
    // X axis
    chart.append("g")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(d3.axisBottom(xScale));

    // Y axis
    chart.append("g")
        .call(d3.axisLeft(yScale));
    
    // X axis Title
    chart.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 45)
        .attr("text-anchor", "middle")
        .text("Total Attack");
    
    // Y axis title
    chart.append("text")
        .attr("x", -innerHeight / 2)
        .attr("y", -50)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .text("Total Defense");
    
    // Title
    chart.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .text("Total Attack vs Total Defense");

    // Legend for Legendary status
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - margin.right + 20}, ${margin.top + 10})`);

    legend.append("text")
        .attr("x", 10)
        .attr("y", 0)
        .attr("font-weight", "bold")
        .text("Legendary");

    const legendaryItems = ["Not Legendary", "Legendary"];

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

        // Legend for Mega Evolution stroke
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
        
        // Legend for Size
        const sizeLegend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${width - margin.right + 20}, ${margin.top + 90})`);
        
        sizeLegend.append("text")
            .attr("x", 10)
            .attr("y", 80)
            .attr("font-weight", "bold")
            .text("Total Stat");
        
        sizeLegend.append("circle")
            .attr("cx", 20)
            .attr("cy", 96)
            .attr("r", 6)
            .attr("fill", "white")

        sizeLegend.append("text")
            .attr("x", 30)
            .attr("y", 100)
            .attr("font-size", "11px")
            .text("Size of circle = Total Stat");

}

function drawBarChart(data) {
    // Bar chart svg
    const svg = d3.select("#bar-chart");

    const width = 650;
    const height = 300;

    const margin = {
        top: 30,
        right: 30,
        bottom: 90,
        left: 70
    };

    // Colors based on official pokemon coloring
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

    // Clear old chart if redrawing
    svg.selectAll("*").remove();

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Group average by first type
    const typeStats = d3.rollups(
        data,
        v => d3.mean(v, d => d.Total),
        d => d.Type_1
        ).map(([type, avgTotal]) => ({
            type: type,
            avgTotal: avgTotal
    }));

    // Sort from strongest to weakest from total stat
    typeStats.sort((a, b) => d3.descending(a.avgTotal, b.avgTotal));

    // Categorial mapping of x axis being based on type
    const xScale = d3.scaleBand()
        .domain(typeStats.map(d => d.type))
        .range([0, innerWidth])
        .padding(0.2);

    // Linear scale of y axis being a numerical stat (total)
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(typeStats, d => d.avgTotal)])
        .nice()
        .range([innerHeight, 0]);

    const colorScale = d => typeColor[d] || "#999999";

    // Draw bars
    chart.selectAll("rect")
        .data(typeStats)
        .join("rect")
        .attr("x", d => xScale(d.type))
        .attr("y", d => yScale(d.avgTotal))
        .attr("width", xScale.bandwidth())
        .attr("height", d => innerHeight - yScale(d.avgTotal))
        .attr("fill", d => colorScale(d.type));

    // x-axis
    chart.append("g")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .attr("transform", "rotate(-40)")
        .attr("text-anchor", "end");

    // y-axis
    chart.append("g")
        .call(d3.axisLeft(yScale));

    // x-axis label
    chart.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 75)
        .attr("text-anchor", "middle")
        .text("Primary Type");

    // y-axis label
    chart.append("text")
        .attr("x", -innerHeight / 2)
        .attr("y", -50)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .text("Average Total Stats");

    // title
    chart.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .text("Average Total Stats by Primary Type");

    // Legend for the type colors
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${margin.left}, ${height - 20})`);

    legend.append("text")
        .attr("x", 0)
        .attr("y", 0)
        .attr("font-size", "11px")
        .attr("font-weight", "bold")
        .text("Bar color = Pokémon primary type");

}

// This function sets up the filters used for the star chart
function setupPokemonFilters(data) {
    // Grab from gen filter
    const generationSelect = d3.select("#generation-filter");
    // Grab from type filter
    const typeSelect = d3.select("#type-filter");
    // grab from pokemon selection drop down menu
    const pokemonSelect = d3.select("#pokemon-select");

    const generations = Array.from(new Set(data.map(d => d.Generation)))
        .sort((a, b) => d3.ascending(+a, +b));

    const types = Array.from(
    new Set(
        data.flatMap(d => [d.Type_1, d.Type_2])
            .filter(type => type && type.trim() !== "")
            .map(type => type.trim())
    )).sort();

    // Selection based on wahts available
    generationSelect.selectAll("option")
        .data(["All", ...generations])
        .join("option")
        .attr("value", d => d)
        .text(d => d === "All" ? "All Generations" : `Generation ${d}`);

    typeSelect.selectAll("option")
        .data(["All", ...types])
        .join("option")
        .attr("value", d => d)
        .text(d => d === "All" ? "All Types" : d);

    // This function updates the pokemon list based on filters
    function updatePokemonList() {
        const selectedGeneration = generationSelect.property("value");
        const selectedType = typeSelect.property("value");

        const filteredPokemon = data.filter(d => {
            const type1 = d.Type_1 ? d.Type_1.trim() : "";
            const type2 = d.Type_2 ? d.Type_2.trim() : "";

            const matchesGeneration =
                selectedGeneration === "All" || d.Generation == selectedGeneration;

            const matchesType =
                selectedType === "All" ||
                type1 === selectedType ||
                type2 === selectedType;

            return matchesGeneration && matchesType;
        });

        // Clear previous options first.
        pokemonSelect.selectAll("option").remove();

        if (filteredPokemon.length > 0) {
            pokemonSelect.selectAll("option")
                .data(filteredPokemon)
                .join("option")
                .attr("value", d => d.Name)
                .text(d => d.Name);

            pokemonSelect.property("value", filteredPokemon[0].Name);
            drawStarPlot(filteredPokemon[0]);
        } else {
            pokemonSelect.append("option")
                .attr("value", "")
                .text("No Pokemon found");
            // Make a star based on the pokemon now
            const starSvg = d3.select("#star-plot");
            const width = +starSvg.attr("width");
            const height = +starSvg.attr("height");

            starSvg.selectAll("*").remove();

            starSvg.append("text")
                .attr("x", width / 2)
                .attr("y", height / 2)
                .attr("text-anchor", "middle")
                .attr("font-size", "16px")
                .text("No Pokemon found for this filter.");
        }
    }

    generationSelect.on("change", updatePokemonList);
    typeSelect.on("change", updatePokemonList);

    pokemonSelect.on("change", function () {
        const selectedName = this.value;
        const selectedPokemon = data.find(d => d.Name === selectedName);

        if (selectedPokemon) {
            drawStarPlot(selectedPokemon);
        }
    });

    updatePokemonList();
}

// This function renders the star plot based on filters
function drawStarPlot(pokemon) {
    const svg = d3.select("#star-plot"); // Grab svg designated spot
    const width = 500;
    const height = 500;

    svg.selectAll("*").remove();

    const margin = 70;
    const radius = Math.min(width, height) / 2 - margin;

    const centerX = width / 2;
    const centerY = height / 2;

    // Stats
    const stats = [
        { stat: "HP", value: pokemon.HP },
        { stat: "Attack", value: pokemon.Attack },
        { stat: "Defense", value: pokemon.Defense },
        { stat: "Sp. Atk", value: pokemon.Sp_Atk },
        { stat: "Sp. Def", value: pokemon.Sp_Def },
        { stat: "Speed", value: pokemon.Speed }
    ];

    // Most a stat can go
    const maxStat = 255;

    const angleSlice = (2 * Math.PI) / stats.length;

    // Linear scale of radius based on stats
    const radiusScale = d3.scaleLinear()
        .domain([0, maxStat])
        .range([0, radius]);

    // Line radius based on value of the stats total
    const line = d3.lineRadial()
        .angle((d, i) => i * angleSlice)
        .radius(d => radiusScale(d.value))
        .curve(d3.curveLinearClosed);

    const chart = svg.append("g")
        .attr("transform", `translate(${centerX}, ${centerY})`);

    // Background rings
    const ringValues = [50, 100, 150, 200, 255]; // Fixed to 255 

    chart.selectAll(".ring-label")
        .data(ringValues)
        .join("text")
        .attr("class", "ring-label")
        .attr("x", 5)
        .attr("y", d => -radiusScale(d))
        .attr("font-size", "10px")
        .attr("fill", "#666")
        .text(d => d);

    chart.selectAll(".ring")
        .data(ringValues)
        .join("circle")
        .attr("class", "ring")
        .attr("r", d => radiusScale(d))
        .attr("fill", "none")
        .attr("stroke", "#ccc")
        .attr("stroke-dasharray", "3,3");

    // axis lines
    chart.selectAll(".axis-line")
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

    // SHape of the stats
    chart.append("path")
        .datum(stats)
        .attr("d", line)
        .attr("fill", "steelblue")
        .attr("fill-opacity", 0.35)
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2);

    // Stat points
    chart.selectAll(".stat-point")
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
        .attr("r", 4)
        .attr("fill", "steelblue");

    // Labels for each stat
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

    // Title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 25)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .attr("font-weight", "bold")
        .text(`${pokemon.Name} Stat Profile`);
    

    // Pokemon info
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height - 20)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .text(`Type: ${pokemon.Type_1}${pokemon.Type_2 ? " / " + pokemon.Type_2 : ""} | Total: ${pokemon.Total} | Body: ${pokemon.Body_Style}`);
    
    // Star plot scale description
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height - 2)
        .attr("text-anchor", "middle")
        .attr("font-size", "11px")
        .attr("fill", "#666")
        .text("Each axis is a base stat and rings show stat values from 50 to 255");
}