const width = window.innerWidth;
const height = window.innerHeight;

// bar chart params
const barMargin = { top: 60, right: 40, bottom: 60, left: 60 };
const barWidth  = Math.round(width * 0.45) - barMargin.left - barMargin.right;
const barHeight = Math.round(height * 0.5) - barMargin.top - barMargin.bottom;

// pie chart params
const pieAreaX  = Math.round(width * 0.5);
const pieAreaW  = width - pieAreaX;
const pieAreaH  = Math.round(height * 0.5);
const pieRadius = Math.min(pieAreaW, pieAreaH) / 2 - 60;

// star chart params
const starMargin = { top: 60, right: 40, bottom: 40, left: 40 };
const starY = Math.round(height * 0.55);
const starWidth = width - starMargin.left - starMargin.right;
const starHeight = Math.round(height * 0.4);

// load data
d3.csv("pokemon.csv").then(rawData => {
    const svg = d3.select("svg");

    // count generations for bar
    const genCounts = d3.nest()
        .key(d => d.Generation)
        .rollup(v => v.length)
        .entries(rawData)
        .sort((a, b) => +a.key - +b.key);

    // Count types for pie
    const typeCounts = d3.nest()
        .key(d => d.Type_1)
        .rollup(v => v.length)
        .entries(rawData)
        .sort((a, b) => b.value - a.value);

    // full and short name lookup
    const STATS = [
        ["HP",      "HP"],
        ["Attack",  "Atk"],  // physical attack
        ["Defense", "Def"],  // physical defense
        ["Sp_Atk",  "SpA"],  // special attack
        ["Sp_Def",  "SpD"],  // special defense
        ["Speed",   "Spe"]   // speed
    ];

    // extract only full name
    const STAT_KEYS = STATS.map(d => d[0]);

    // stat string to nums
    rawData.forEach(d => {
        STAT_KEYS.forEach(k => d[k] = +d[k]);
        d.Total = +d.Total;
    });

    // top 5 most common pokemon by type
    const top5Types = typeCounts
        .slice(0, 5)
        .map(d => d.key);

    // avg stat profile - init starting all
    const initStarProfiles = top5Types.map(type => {
        const values = rawData.filter(d => d.Type_1 === type);
        const profile = { type };

        // calc avg
        STAT_KEYS.forEach(k => {
            profile[k] = d3.mean(values, d => d[k]);
        });

        return profile;
    });

    // get biggest for scaling
    const globalMax = d3.max(
        initStarProfiles,
        p => d3.max(STAT_KEYS, k => p[k])
    );

    // colorization
    const colors = d3.schemeTableau10;

    let brushedGens = null; // brush state default
    let selectedPieSlice = null; // selected slice

    // filter by brushed
    function getFilteredData() {
        if (!brushedGens) return rawData;
        return rawData.filter(d => brushedGens.has(String(d.Generation)));
    }

    /////////////////////// BAR CHART ///////////////////////
    const gBar = svg.append("g")
        .attr(
            "transform",
            `translate(${barMargin.left}, ${barMargin.top})`
        );

    // title
    gBar.append("text")
        .attr("x", barWidth / 2)
        .attr("y", -30)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .text("Pokemon Count by Generation");

    // brush subtitle
    gBar.append("text")
        .attr("x", barWidth / 2)
        .attr("y", -12)
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("fill", "#888")
        .text("Drag along X-axis to filter by generation");

    // x scale
    const x = d3.scaleBand()
        .domain(genCounts.map(d => d.key))
        .range([0, barWidth])
        .padding(0.2);

    // y scale
    const y = d3.scaleLinear()
        .domain([0, d3.max(genCounts, d => d.value)])
        .nice()
        .range([barHeight, 0]);

    // x axis
    gBar.append("g")
        .attr("transform", `translate(0, ${barHeight})`)
        .call(d3.axisBottom(x));

    // y axis
    gBar.append("g")
        .call(d3.axisLeft(y));

    // x label
    gBar.append("text")
        .attr("x", barWidth / 2)
        .attr("y", barHeight + 45)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .text("Generation");

    // y label
    gBar.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -barHeight / 2)
        .attr("y", -45)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .text("Number of Pokemon");

    // bars
    gBar.selectAll(".bar")
        .data(genCounts)
        .enter()
        .append("rect")
            .attr("class", "bar")
            .attr("x", d => x(d.key))
            .attr("y", d => y(d.value))
            .attr("width", x.bandwidth())
            .attr("height", d => barHeight - y(d.value))
            .attr("fill", (d, i) => colors[i % colors.length]);

    // bar labels
    gBar.selectAll(".bar-label")
        .data(genCounts)
        .enter()
        .append("text")
            .attr("class", "bar-label")
            .attr("x", d => x(d.key) + x.bandwidth() / 2)
            .attr("y", d => y(d.value) - 6)
            .attr("text-anchor", "middle")
            .attr("font-size", "11px")
            .attr("font-weight", "bold")
            .text(d => d.value);

    // burhsing data
    const barBrush = d3.brushX()
        .extent([[0, 0], [barWidth, barHeight]])
        .on("brush end", function() {
            const sel = d3.brushSelection(this);
            if (!sel) {
                brushedGens = null;
            } else {
                const [x0, x1] = sel;
                // check overlap
                brushedGens = new Set(
                    genCounts
                        .filter(d => x(d.key) + x.bandwidth() > x0 && x(d.key) < x1)
                        .map(d => d.key)
                );
            }
            // dim outside select
            gBar.selectAll(".bar")
                .transition().duration(200)
                .attr("opacity", d => !brushedGens || brushedGens.has(d.key) ? 1 : 0.3);
            gBar.selectAll(".bar-label")
                .transition().duration(200)
                .attr("opacity", d => !brushedGens || brushedGens.has(d.key) ? 1 : 0.3);
            updatePie();
            updateStar();
        });

    gBar.append("g")
        .attr("class", "brush")
        .call(barBrush);

    /////////////////////// PIE CHART ///////////////////////
    const gPie = svg.append("g")
        .attr(
            "transform",
            `translate(${pieAreaX + pieAreaW / 2}, ${pieAreaH / 2})`
        );

    // title
    gPie.append("text")
        .attr("x", 0)
        .attr("y", -(pieRadius + 32))
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .text("Pokemon Count by Type");

    // clicking subtitle
    gPie.append("text")
        .attr("x", 0)
        .attr("y", -(pieRadius + 14))
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("fill", "#888")
        .text("Click a slice to show its count");

    // layup
    const pie = d3.pie()
        .value(d => d.value)
        .sort(null);

    // arcs
    const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(pieRadius);
    const arcExpanded = d3.arc()
        .innerRadius(0)
        .outerRadius(pieRadius + 12);
    const arcLabel = d3.arc()
        .innerRadius(pieRadius * 0.65)
        .outerRadius(pieRadius * 0.65);

    // pie updated from select
    function updatePie() {
        const filteredData = getFilteredData();
        const newTypeCounts = d3.nest()
            .key(d => d.Type_1)
            .rollup(v => v.length)
            .entries(filteredData)
            .sort((a, b) => b.value - a.value);

        // clear text
        gPie.selectAll(".pie-slice, .pie-label, .pie-center, .pie-leg-rect, .pie-leg-text").remove();
        const pieData = pie(newTypeCounts);

        // expand selected
        gPie.selectAll(".pie-slice")
            .data(pieData)
            .enter()
            .append("path")
                .attr("class", "pie-slice")
                .attr("d", d => (selectedPieSlice === d.data.key ? arcExpanded : arc)(d))
                .attr("fill", (d, i) => colors[i % colors.length])
                .attr("stroke", "white")
                .attr("stroke-width", 1.5)
                .style("cursor", "pointer")
                .on("click", function(d) {
                    selectedPieSlice = (selectedPieSlice === d.data.key) ? null : d.data.key;
                    updatePie();
                });



        // slice labels
        gPie.selectAll(".pie-label")
            .data(pieData)
            .enter()
            .append("text")
                .attr("class", "pie-label")
                .attr("transform", d => `translate(${arcLabel.centroid(d)})`)
                .attr("text-anchor", "middle")
                .attr("font-size", "11px")
                .attr("fill", "white")
                .attr("font-weight", "bold")
                .text(d => d.data.value);
        if (selectedPieSlice) {
            const entry = newTypeCounts.find(d => d.key === selectedPieSlice);
            if (entry) {
                gPie.append("text")
                    .attr("class", "pie-center")
                    .attr("text-anchor", "middle")
                    .attr("y", -10)
                    .attr("font-size", "24px")
                    .attr("font-weight", "bold")
                    .text(entry.value);
                gPie.append("text")
                    .attr("class", "pie-center")
                    .attr("text-anchor", "middle")
                    .attr("y", 14)
                    .attr("font-size", "12px")
                    .text(entry.key);
            }
        }

        // legend
        const legX = pieRadius + 20;
        const legY = -(newTypeCounts.length * 20) / 2;

        // legend helper func
        newTypeCounts.forEach((d, i) => {
            const color = colors[i % colors.length];

            gPie.append("rect")
                .attr("class", "pie-leg-rect")
                .attr("x", legX)
                .attr("y", legY + i * 20)
                .attr("width", 14)
                .attr("height", 14)
                .attr("fill", color);
            gPie.append("text")
                .attr("class", "pie-leg-text")
                .attr("x", legX + 20)
                .attr("y", legY + i * 20 + 11)
                .attr("font-size", "12px")
                .text(`${d.key} (${d.value})`);
        });
    }

    // initial pie draw
    updatePie();

    /////////////////////// STAR PLOT ///////////////////////
    const gStar = svg.append("g")
        .attr(
            "transform",
            `translate(${starMargin.left}, ${starY})`
        );

    // title
    gStar.append("text")
        .attr("x", starWidth / 2)
        .attr("y", -25)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .text("Average Profile of Top 5 Pokemon Types");

    // layup
    const cols = 5;
    const cellW = starWidth / cols;
    const cellH = starHeight;
    const radius = Math.min(cellW, cellH) / 2 - 40;

    // star axis angle
    const angleFor = i => (Math.PI * 2 * i / STAT_KEYS.length) - Math.PI / 2;

    // val to coordinates
    const pointAt = (i, v) => {
        const r = (v / globalMax) * radius;

        return [
            r * Math.cos(angleFor(i)),
            r * Math.sin(angleFor(i))
        ];
    };

    // update from filtered
    function updateStar() {
        const filteredData = getFilteredData();
        const starProfiles = top5Types.map(type => {
            const values = filteredData.filter(d => d.Type_1 === type);
            const profile = { type };

            // calc avg
            STAT_KEYS.forEach(k => {
                profile[k] = values.length > 0 ? d3.mean(values, d => d[k]) : 0;
            });

            return profile;
        });

        // clear before draw
        gStar.selectAll(".star-cell").remove();

        // star for given
        starProfiles.forEach((profile, idx) => {
            const cx = cellW * idx + cellW / 2;
            const cy = starHeight / 2;

            const cell = gStar.append("g")
                .attr("class", "star-cell")
                .attr("transform", `translate(${cx}, ${cy})`);

            // ring background
            [0.25, 0.5, 0.75, 1].forEach(t => {
                cell.append("circle")
                    .attr("r", radius * t)
                    .attr("fill", "none")
                    .attr("stroke", "#cccccc")
                    .attr("stroke-width", 0.7);
            });

            // axes
            STAT_KEYS.forEach((k, i) => {
                const [x, y] = pointAt(i, globalMax);

                cell.append("line")
                    .attr("x1", 0)
                    .attr("y1", 0)
                    .attr("x2", x)
                    .attr("y2", y)
                    .attr("stroke", "#bbbbbb")
                    .attr("stroke-width", 0.7);
            });

            // polygon point string
            const polyPoints = STAT_KEYS
                .map((k, i) => pointAt(i, profile[k]))
                .map(p => p.join(","))
                .join(" ");
            cell.append("polygon")
                .attr("points", polyPoints)
                .attr("fill", colors[idx % colors.length])
                .attr("fill-opacity", 0.5)
                .attr("stroke", colors[idx % colors.length])
                .attr("stroke-width", 2);

            // stat labels
        STATS.forEach(([full, short], i) => {
            const [x, y] = pointAt(i, globalMax);

            cell.append("text")
                .attr("x", x * 1.18)
                .attr("y", y * 1.18)
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .attr("font-size", "10px")
                .text(short);
        });

            // type labels
            cell.append("text")
                .attr("x", 0)
                .attr("y", radius + 40)
                .attr("text-anchor", "middle")
                .attr("font-size", "13px")
                .attr("font-weight", "bold")
                .attr("fill", colors[idx % colors.length])
                .text(profile.type);
        });
    }

    // initial star draw
    updateStar();
});