/* main.js: D3 code to create the visualizations and interactivity of the dashboard 
    // three main views: scatter plot (price vs rating), heatmap (category vs skin type), parallel coordinates (price, rating, skin suitability per product)
    // layout: scatter top-left, heatmap top-right, parallel coordinate plot bottom spanning full width
    // legend: to right of scatter and to right of parallel coordinate plot
    // filter legend interactivity: click a category to filter scatter and parallel coordinate plot to that category (toggle on/off by clicking again, or clicking another category)
    // hover tooltip on scatter and parallel coordinate plot: show product details (name, brand, price, rating, skin suitability)
*/

/* define dimensions of window size */
const W = window.innerWidth;
const H = window.innerHeight;

/*  define constant data that will be shared */
// categories is the "label" column in the csv data 
// skinTypes is the list of skin type columns in the csv data, aka suitability for that skin type (1 = suitable, 0 = not suitable)
const categories = ["Moisturizer", "Cleanser", "Treatment", "Face Mask", "Eye cream", "Sun protect"];
const skinTypes = ["Combination", "Dry", "Normal", "Oily", "Sensitive"];

// responsive legend sizing
// helps maintain the browser window when resized does not break layout 
// all legends have these shared values 
const legendWidth = Math.min(130, Math.max(90, W * 0.10));
const legendRowHeight = Math.max(14, H * 0.018);
const legendHeight = categories.length * legendRowHeight + 18;

// constant size of text elements, scaled with window size for title and subtitle of each visualization 
const legendFont = Math.max(9, W * 0.007);
const titleFont = Math.max(12, W * 0.011);   // chart titles
const subtitleFont = Math.max(11, W * 0.008); // chart subtitles

// shared color scale for categories for legend and visualizations, using D3's built-in color palette 
const catColor = d3.scaleOrdinal()
    .domain(categories)
    .range(["#c0754a", "#5b8db8", "#7ab87a", "#c4a84e", "#9b72b0", "#b85b75"]);

// global vars to track active category filter and scatter plot dots for interactivity across views
// null means "no filter, show all categories"
// by clicking a legend row it toggles on and off switch between 
let activeCategory = null;
let scatterDots = null; // will be set in drawScatter, used across views

// helper function to check if a data point's category matches the active filter
// (used in hover and click handlers to ensure only active category points respond)
function isActive(d) {
    return !activeCategory || d.Label === activeCategory;
}

/* layout positions */
// defines positioning by margin, left/top, width/height for each visualization  

// dimensions for scatter plot 
let scatterLeft = 18, scatterTop = 0;
let scatterMargin = { top: 110, right: legendWidth + 20, bottom: 52, left: 64 };
let scatterWidth = Math.max(60, W * 0.40 - scatterMargin.left - scatterMargin.right);
let scatterHeight = Math.max(60, H * 0.47 - scatterMargin.top - scatterMargin.bottom);

// dimensions for heatmap 
let heatLeft = W * 0.42, heatTop = 0;
let heatMargin = { top: 110, right: 32, bottom: 72, left: 108 };
let heatWidth = Math.max(60, (W - W * 0.42) - heatMargin.left - heatMargin.right);
let heatHeight = Math.max(60, H * 0.47 - heatMargin.top - heatMargin.bottom);

// dimensions for parallel coordinate plot 
let pcpLeft = 0, pcpTop = H * 0.50;
let pcpMargin = { top: 80, right: 52, bottom: 28, left: 52 };
let pcpWidth = Math.max(60, W * 0.82 - pcpMargin.left - pcpMargin.right);
let pcpHeight = Math.max(60, (H - pcpTop) - pcpMargin.top - pcpMargin.bottom);

// tool tip
// repositions when mouse moves over or away from
// displays details when hovering over visualization elements 
const tooltip = d3.select("#tooltip");

//svg
const svg = d3.select("svg");

//hide tool tip 
function hideTooltip() {
    tooltip.style("display", "none");
}

// hide tooltip when mouse leaves the SVG area
svg.on("mouseleave", hideTooltip);

//resizes the page when window size changes 
let resizeTimer;
window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => render(window._lastData), 300);
});

// load data and render visualizations 
// runs only if data is successfully loaded 
d3.csv("data/cosmetics.csv").then(function (rawData) {

    // parse numeric columns
    rawData.forEach(function (d) {
        d.Price = +d.Price;
        d.Rank = +d.Rank;
        skinTypes.forEach(function (s) { d[s] = +d[s]; });
    });

    // remove products with missing or zero price/rating
    const data = rawData.filter(d => d.Price > 0 && d.Rank > 0);

    // store data globally so the resize handler can redraw without re-fetching
    window._lastData = data;
    render(data);

}).catch(function (error) {
    console.log(error);
});

// recalculates all layout vars and redraws all charts helpful for rescaling
// called once on data load, and again on window resize
function render(data) {
    if (!data) return;

    // reset active filter on resize so nothing is left in a broken filtered state
    activeCategory = null;
    scatterDots = null;

    // clear previous drawings
    svg.selectAll("*").remove();

    // recalculate layout from current window size
    const W = window.innerWidth;
    const H = window.innerHeight;

    scatterMargin = { top: 110, right: Math.min(130, Math.max(90, W * 0.10)) + 20, bottom: 52, left: 64 };
    scatterWidth = Math.max(60, W * 0.40 - scatterMargin.left - scatterMargin.right);
    scatterHeight = Math.max(60, H * 0.47 - scatterMargin.top - scatterMargin.bottom);

    heatLeft = W * 0.42;
    heatWidth = Math.max(60, (W - W * 0.42) - heatMargin.left - heatMargin.right);
    heatHeight = Math.max(60, H * 0.47 - heatMargin.top - heatMargin.bottom);

    pcpTop = H * 0.50;
    pcpWidth = Math.max(60, W * 0.82 - pcpMargin.left - pcpMargin.right);
    pcpHeight = Math.max(60, (H - pcpTop) - pcpMargin.top - pcpMargin.bottom);

    drawScatter(data);
    drawHeatmap(data);
    drawPCP(data);
}

// scatter plot aka the overview visualization 
// shows price vs rating for each product, colored by category 
// with hover tooltip for details and legend to filter by category
// by clicking a legend item it filters the scatter plot to display data only of that category (toggle on/off by clicking again, or clicking another category)
function drawScatter(data) {

    // group with margin translate
    const g1 = svg.append("g")
        .attr("width", scatterWidth + scatterMargin.left + scatterMargin.right)
        .attr("height", scatterHeight + scatterMargin.top + scatterMargin.bottom)
        .attr("transform", `translate(${scatterLeft + scatterMargin.left}, ${scatterTop + scatterMargin.top})`);

    // chart title
    g1.append("text")
        .attr("x", scatterWidth / 2).attr("y", -32)
        .attr("text-anchor", "middle").attr("font-size", titleFont + "px")
        .attr("font-weight", "bold").attr("font-family", "Georgia,serif").attr("fill", "#222")
        .text("Overview: Product Price vs. Rating");

    // subtitle text below title explaining what chart shows 
    g1.append("text")
        .attr("x", scatterWidth / 2).attr("y", -14)
        .attr("text-anchor", "middle").attr("font-size", subtitleFont + "px")
        .attr("font-family", "Georgia,serif").attr("fill", "#777")
        .text("Each dot = one product");

    /* axis labels */
    // x label
    g1.append("text")
        .attr("x", scatterWidth / 2)
        .attr("y", scatterHeight + 45)
        .attr("font-size", "12px").attr("font-family", "Georgia,serif")
        .attr("text-anchor", "middle").attr("fill", "#555")
        .text("Price (USD)");

    // y label
    g1.append("text")
        .attr("x", -(scatterHeight / 2))
        .attr("y", -50)
        .attr("font-size", "12px").attr("font-family", "Georgia,serif")
        .attr("text-anchor", "middle").attr("fill", "#555")
        .attr("transform", "rotate(-90)")
        .text("Rating (0 – 5)");

    /* scales */
    // x scale from 0 to max price of product 
    const x1 = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.Price) + 10])
        .range([0, scatterWidth]);

    // y scale from 0 to 5 show ratings of products
    const y1 = d3.scaleLinear()
        .domain([0, 5])
        .range([scatterHeight, 0]);

    /* axes */
    const xTickCount = scatterWidth < 200 ? 3 : scatterWidth < 350 ? 4 : 6;
    const xAxisCall1 = d3.axisBottom(x1)
        .ticks(xTickCount)
        .tickFormat(d => `$${d}`);
    g1.append("g")
        .attr("transform", `translate(0, ${scatterHeight})`)
        .call(xAxisCall1)
        .selectAll("text")
        .attr("y", scatterWidth < 300 ? 8 : 10)
        .attr("x", "-5")
        .attr("text-anchor", "end")
        .attr("font-size", Math.max(8, W * 0.007) + "px")
        .attr("transform", scatterWidth < 300 ? "rotate(-60)" : "rotate(-40)");

    // y axis
    const yAxisCall1 = d3.axisLeft(y1).ticks(5);
    g1.append("g").call(yAxisCall1);

    /* data points */
    // jitter function to add random noise to the position of each dot
    // prevent overplotting and makes it easier to see clusters of points with similar values
    const jitter = () => (Math.random() - 0.5) * 5;
    const circles = g1.selectAll("circle").data(data);

    scatterDots = circles.enter().append("circle")
        .attr("cx", d => x1(d.Price) + jitter())
        .attr("cy", d => y1(d.Rank) + jitter())
        .attr("r", 4)
        .attr("fill", d => catColor(d.Label))
        .attr("opacity", 0.52)
        .attr("stroke", "rgba(255,255,255,0.4)")
        .attr("stroke-width", 0.5)
        .style("cursor", "pointer")

        .on("mouseover", function (event, d) {
            // skip interaction if this point's category is not active (filtered out)
            if (!isActive(d)) return;

            // bring hovered circle to front and highlight itby increasing radius and opacity
            d3.select(this)
                .raise()
                .attr("r", 7)
                .attr("opacity", 1);

            // show info of products
            tooltip
                .style("display", "block")
                .style("left", (event.pageX + 14) + "px")
                .style("top", (event.pageY - 38) + "px")
                .html(`
                    <strong>${d.Name}</strong><br>
                    <span style="color:#aaa">${d.Brand}</span><br>
                    Price: <strong>$${d.Price}</strong><br>
                    Rating: <strong>${d.Rank}</strong><br>
                    Category: ${d.Label}
                `);
        })
        .on("mousemove", function (event, d) {
            if (!isActive(d)) return;

            // update tooltip position as mouse moves
            tooltip
                .style("left", (event.pageX + 14) + "px")
                .style("top", (event.pageY - 38) + "px");
        })
        .on("mouseout", function (event, d) {

            if (!isActive(d)) return;

            // restore dot size and hide tool tip 
            d3.select(this)
                .attr("r", 4)
                .attr("opacity", 0.75);

            hideTooltip();
        });

    // category legend 
    const legG = g1.append("g")
        .attr("transform", `translate(${scatterWidth + 12}, 4)`);

    // one row per category with color swatch and label
    categories.forEach(function (cat, i) {
        const row = legG.append("g")
            // offset each row vertically by index and set cursor to pointer to indicate interactivity
            .attr("transform", `translate(10, ${i * legendRowHeight + 6})`)
            .style("cursor", "pointer");
        row.append("circle").attr("cx", 6).attr("cy", 5).attr("r", 5).attr("fill", catColor(cat));

        // category label text
        row.append("text")
            .attr("x", 18)
            .attr("y", legendRowHeight * 0.55)
            .attr("dominant-baseline", "middle")
            .attr("font-size", legendFont + "px")
            .attr("font-family", "Georgia,serif")
            .attr("fill", "#333")
            .text(cat);

        // click legend item to filter scatterplot points
        row.on("click", function () {

            // toggle category on/off
            activeCategory = activeCategory === cat ? null : cat;

            // lower opacity of non-active points, disable mouse events 
            scatterDots
                .attr("opacity", d =>
                    !activeCategory ? 0.6 :
                        d.Label === activeCategory ? 0.85 : 0.02
                )
                .style("pointer-events", d =>
                    !activeCategory || d.Label === activeCategory ? "auto" : "none"
                );

        });
    });
}

// heat map visualization aka the focus view 
// shows percentage of products suitable for each skin type (columns) within each category (rows)
// colored by percentage with labels in each cell, and hover tooltip for details
// runs from lightest (0% suitable) to darkest (100% suitable) using a purple color scale in legend 

function drawHeatmap(data) {

    const g2 = svg.append("g")
        .attr("width", heatWidth + heatMargin.left + heatMargin.right)
        .attr("height", heatHeight + heatMargin.top + heatMargin.bottom)
        .attr("transform", `translate(${heatLeft + heatMargin.left}, ${heatTop + heatMargin.top})`);

    // chart title and subtitle 
    g2.append("text")
        .attr("x", heatWidth / 2).attr("y", -32)
        .attr("text-anchor", "middle").attr("font-size", titleFont + "px")
        .attr("font-weight", "bold").attr("font-family", "Georgia,serif").attr("fill", "#222")
        .text("Product Suitability by Category and Skin Type");

    g2.append("text")
        .attr("x", heatWidth / 2).attr("y", -14)
        .attr("text-anchor", "middle").attr("font-size", subtitleFont + "px")
        .attr("font-family", "Georgia,serif").attr("fill", "#777")
        .text("Cell = % of products suitable for that skin type");

    // x-axis label
    g2.append("text")
        .attr("x", heatWidth / 2).attr("y", heatHeight + 54)
        .attr("text-anchor", "middle").attr("font-size", "12px")
        .attr("font-family", "Georgia,serif").attr("fill", "#555")
        .text("Skin Type");

    // % suitability per category by skin type
    // for each category (row), calculate the percentage of products suitable for each skin type (column) and store in cells array
    const cells = [];
    categories.forEach(function (cat) {
        const sub = data.filter(d => d.Label === cat);
        skinTypes.forEach(function (st) {
            cells.push({ cat: cat, st: st, pct: d3.mean(sub, d => d[st]) * 100, n: sub.length }); // 0 - 100 
        });
    });

    // scales
    // scaleBand map discrete categories/skin types to pixel locations
    const x2 = d3.scaleBand()
        .domain(skinTypes)
        .range([0, heatWidth])
        .padding(0.07);

    const y2 = d3.scaleBand()
        .domain(categories)
        .range([0, heatHeight])
        .padding(0.07);

    // color scale for heatmap cells light to darkest purple (0-100%)
    const colorHeat = d3.scaleSequential([0, 100], d3.interpolate("#f0ece6", "#7b3f9e"));

    // x axis
    const xAxisCall2 = d3.axisBottom(x2);
    g2.append("g")
        .attr("transform", `translate(0, ${heatHeight})`)
        .call(xAxisCall2);

    // y axis 
    const yAxisCall2 = d3.axisLeft(y2);
    g2.append("g").call(yAxisCall2);

    // heatmap cells 
    const rects = g2.selectAll("rect").data(cells);

    rects.enter().append("rect")
        .attr("x", d => x2(d.st))
        .attr("y", d => y2(d.cat))
        .attr("width", x2.bandwidth())
        .attr("height", y2.bandwidth())
        .attr("fill", d => colorHeat(d.pct))
        .on("mouseover", function (event, d) {
            // outline hovered cell 
            d3.select(this).attr("stroke", "#333").attr("stroke-width", 1.5);
            tooltip.style("display", "block")
                .html(`<strong>${d.cat}</strong> → ${d.st}<br>
                       <strong>${d.pct.toFixed(1)}%</strong> of ${d.n} products suitable`);
        })
        .on("mousemove", function (event) {
            tooltip.style("left", (event.pageX + 14) + "px").style("top", (event.pageY - 38) + "px");
        })
        .on("mouseout", function () {
            d3.select(this).attr("stroke", "none");
            tooltip.style("display", "none");
        });

    // percentage labels inside cells
    const cellLabels = g2.selectAll(".clabel").data(cells);

    cellLabels.enter().append("text")
        .attr("class", "clabel")
        .attr("x", d => x2(d.st) + x2.bandwidth() / 2)
        .attr("y", d => y2(d.cat) + y2.bandwidth() / 2 + 4)
        .attr("text-anchor", "middle")
        .attr("font-size", "11.5px")
        .attr("font-family", "Georgia,serif")
        .attr("pointer-events", "none")
        .attr("fill", d => d.pct > 52 ? "#fff" : "#333")
        .text(d => Math.round(d.pct) + "%");

    // gradient color legend show full scale from 0-100% range 
    const lgW = 180, lgH = 11;
    const lgG = g2.append("g")
        .attr("transform", `translate(${heatWidth / 2 - lgW / 2}, ${heatHeight + 80})`);

    // define linear gradient for legend
    // with stops at 0%, 25%, 50%, 75%, and 100% to show the color scale from light to dark purple 
    const defs = svg.append("defs");
    const grad = defs.append("linearGradient")
        .attr("id", "heatGrad").attr("x1", "0%").attr("x2", "100%");
    [0, 25, 50, 75, 100].forEach(function (v) {
        grad.append("stop").attr("offset", v + "%").attr("stop-color", colorHeat(v));
    });
    lgG.append("rect")
        .attr("width", lgW).attr("height", lgH).attr("rx", 3)
        .attr("fill", "url(#heatGrad)").attr("stroke", "#bbb").attr("stroke-width", 0.5);
    lgG.append("text").attr("x", 0).attr("y", -4)
        .attr("font-size", "10px").attr("font-family", "Georgia,serif").attr("fill", "#555").text("0%");
    lgG.append("text").attr("x", lgW / 2).attr("y", -4).attr("text-anchor", "middle")
        .attr("font-size", "10px").attr("font-family", "Georgia,serif").attr("fill", "#555")
        .text("% suitable for skin type");
    lgG.append("text").attr("x", lgW).attr("y", -4).attr("text-anchor", "end")
        .attr("font-size", "10px").attr("font-family", "Georgia,serif").attr("fill", "#555").text("100%");
}

// parallel coordinate visualizaition aka advanced view
// shows each product as a polyline crossing vertical axes for price, rating, and skin suitability
// colored by category with hover tooltip for details and legend to filter by category 
// click a legend item to filter the parallel coordinate plot to display data only of that category 
function drawPCP(data) {

    const g3 = svg.append("g")
        .attr("width", pcpWidth + pcpMargin.left + pcpMargin.right)
        .attr("height", pcpHeight + pcpMargin.top + pcpMargin.bottom)
        .attr("transform", `translate(${pcpLeft + pcpMargin.left}, ${pcpTop + pcpMargin.top})`);

    // chart title and subtitle 
    g3.append("text")
        .attr("x", pcpWidth / 2).attr("y", -58)
        .attr("text-anchor", "middle").attr("font-size", titleFont + "px")
        .attr("font-weight", "bold").attr("font-family", "Georgia,serif").attr("fill", "#222")
        .text("Price, Rating, & Skin Suitability per Product");

    g3.append("text")
        .attr("x", pcpWidth / 2).attr("y", -40)
        .attr("text-anchor", "middle").attr("font-size", subtitleFont + "px")
        .attr("font-family", "Georgia,serif").attr("fill", "#777")
        .text("Each strand = one product colored by category");

    // dimension configuration for parallel coordinate plot
    // dims define the order 
    // dimLabels provide the axis labels for each dimension
    const dims = ["Price", "Rank", "Combination", "Dry", "Normal", "Oily", "Sensitive"];
    const dimLabels = {
        Price: "Price ($)", Rank: "Rating",
        Combination: "Combo", Dry: "Dry", Normal: "Normal", Oily: "Oily", Sensitive: "Sensitive"
    };

    // per axis y scale 
    // price axis from 0 to max price, rating axis from 0 to 5, skin suitability axes from 0 to 1 (not suitable to suitable) aka a yes/no line
    const yScales = {};
    dims.forEach(function (dim) {
        yScales[dim] = d3.scaleLinear()
            .domain(dim === "Price" ? [0, d3.max(data, d => d.Price)] :
                dim === "Rank" ? [0, 5] : [-0.1, 1.1])
            .range([pcpHeight, 0]);
    });

    // x positions (one per axis)
    // scalePoint maps each dimension to a specific x coordinate along the horizontal axis 
    const xScale3 = d3.scalePoint()
        .domain(dims)
        .range([0, pcpWidth])
        .padding(0.18);

    // data sample 
    // sample 600 products for SVG performance
    const sample = data.slice().sort(() => Math.random() - 0.5).slice(0, 600);

    // line path builder
    // each product maps to an array [x,y] (one per axis) and is connected to form a polyline
    const lineFn = d3.line();
    const pathFor = function (d) {
        return lineFn(dims.map(function (dim) {
            return [xScale3(dim), yScales[dim](d[dim])];
        }));
    };

    // strands 
    const paths = g3.selectAll(".pline").data(sample);

    const pcpLines = paths.enter().append("path")
        .attr("class", "pline")
        .attr("d", pathFor)
        .attr("fill", "none")
        .attr("stroke", d => catColor(d.Label))
        .attr("stroke-width", 0.85)
        .attr("opacity", 0.10)
        .style("cursor", "pointer")
        .on("mouseover", function (event, d) {
            // only highlight if this line's category is active (or nothing is filtered)
            if (!isActive(d)) return;
            d3.select(this).raise()
                .attr("stroke-width", 2.5)
                .attr("opacity", 0.92);
            tooltip.style("display", "block")
                .html(`<strong>${d.Name}</strong><br>
                       <span style="color:#aaa">${d.Brand}</span><br>
                       Price: <strong>$${d.Price}</strong> &nbsp; Rating: <strong>${d.Rank}</strong><br>
                       Skin: ${skinTypes.filter(s => d[s] === 1).join(", ") || "None listed"}`);
        })
        .on("mousemove", function (event) {
            tooltip.style("left", (event.pageX + 14) + "px").style("top", (event.pageY - 38) + "px");
        })
        .on("mouseout", function (event, d) {
            //restore opacity respecting the current activeCategory filter
            if (!isActive(d)) return;
            d3.select(this).attr("stroke-width", 0.85).attr("opacity", 0.17);
            tooltip.style("display", "none");
        });

    // one axis group per dimension
    // creates a vertical axis for ea dimension with appropriate ticks and labels
    dims.forEach(function (dim) {
        const axG = g3.append("g")
            .attr("transform", `translate(${xScale3(dim)}, 0)`);

        const ticks = (dim === "Price") ? 5 : (dim === "Rank") ? 5 : 2;

        // binary axes yes/no replace 1/0
        const fmt = (dim === "Price") ? d => `$${d}` :
            (dim === "Rank") ? d3.format(".1f") :
                d => d > 0.5 ? "Yes" : "No";


        const axisCall = d3.axisLeft(yScales[dim]).ticks(ticks).tickFormat(fmt);
        axG.call(axisCall);

        axG.append("text")
            .attr("y", -12)
            .attr("text-anchor", "middle")
            .attr("fill", "#222")
            .attr("font-size", "12px")
            .attr("font-weight", "bold")
            .attr("font-family", "Georgia,serif")
            .text(dimLabels[dim]);

        // thin band behind each axis
        axG.insert("rect", "*")
            .attr("x", -1).attr("y", 0)
            .attr("width", 2).attr("height", pcpHeight)
            .attr("fill", "#bbb").attr("opacity", 0.5);
    });

    // category legend  for parallel coordinate
    // same categories and colors as scatter plot legend 
    // click a legend item ot filter parallel coordinate plot strand by category to display products 
    const legG = g3.append("g")
        .attr("transform", `translate(${pcpWidth + 30}, 24)`);

    categories.forEach(function (cat, i) {
        const row = legG.append("g").attr("transform", `translate(10, ${i * legendRowHeight + 6})`);
        row.append("line")
            .attr("x1", 0).attr("y1", legendRowHeight * 0.4)
            .attr("x2", 16).attr("y2", legendRowHeight * 0.4)
            .attr("stroke", catColor(cat)).attr("stroke-width", 2.5);
        row.append("text")
            .attr("x", 20).attr("y", legendRowHeight * 0.55)
            .attr("dominant-baseline", "middle")
            .attr("font-size", legendFont + "px").attr("font-family", "Georgia,serif").attr("fill", "#333")
            .text(cat);

        // click the legend by category to filters only the relevant strands
        row.style("cursor", "pointer")
            .on("click", function () {

                // clicking the active category resets to "show all" strands 
                activeCategory = activeCategory === cat ? null : cat;

                pcpLines
                    .attr("opacity", d =>
                        !activeCategory ? 0.10 :
                            d.Label === activeCategory ? 0.35 : 0.02
                    )
                    .style("pointer-events", d =>
                        !activeCategory || d.Label === activeCategory ? "auto" : "none"
                    );

                // dim inactive legend rows 
                legG.selectAll(".pcp-leg-row")
                    .attr("opacity", function () {
                        const rowCat = d3.select(this).attr("data-cat");
                        return !activeCategory || rowCat === activeCategory ? 1 : 0.35;
                    });
            });

        // tag each row with its category so the click handler can dim/highlight them
        row.attr("class", "pcp-leg-row").attr("data-cat", cat);
    });
}