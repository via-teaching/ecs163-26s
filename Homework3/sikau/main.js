const width = 1400;
const height = 900;

const svg = d3.select("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

svg.selectAll("*").remove();

// I picked these colors intentionally — soft warm tones feel less clinical
// for a dataset that's literally about people's mental health.
// harsh colors would feel weirdly aggressive here.
const colors = {
    background: "#f7efe8",
    card: "#fffaf3",
    cardBorder: "#e6d8ca",
    title: "#243047",
    text: "#344054",
    muted: "#667085",
    grid: "#eadfd5",
    axis: "#344054",
    bar: "#7aa7c7",
    barHover: "#4e86ad",
    selected: "#e76f51",    // orange-red for selected state — stands out without being aggressive
    resetButton: "#f3d5c0",
    resetButtonStroke: "#d8a48f",
    tooltipBg: "#243047"
};

// these four colors for the scatter plot dots represent how music affects mental health.
// I kept them fairly distinct so you can tell them apart even without the legend.
const effectColor = d3.scaleOrdinal()
    .domain(["Improve", "No effect", "Worsen", "Unknown"])
    .range(["#2a9d8f", "#e9c46a", "#e76f51", "#adb5bd"]);

// the parallel coordinates chart needs 10 colors for 10 genres.
// I used the Wong (2011) colorblind-safe palette here — it's one of the most
// widely recommended palettes in data vis research because it works for people
// with deuteranopia, protanopia, and tritanopia (the three most common types).
const genrePalette = [
    "#E69F00", // orange
    "#56B4E9", // sky blue
    "#009E73", // bluish green
    "#F0E442", // yellow
    "#0072B2", // blue
    "#D55E00", // vermillion
    "#CC79A7", // reddish purple
    "#000000", // black
    "#882255", // wine
    "#44AA99"  // teal
];

// these two track what the user has currently selected.
// selectedGenre comes from clicking a bar or a parallel coords line.
// brushedIndices is a set of row indices selected by drag-brushing on the scatter plot.
// only one can be active at a time — they clear each other.
let selectedGenre = null;
let brushedIndices = new Set();

// the three card positions — top-left, top-right, bottom full-width.
// I calculated these manually to fill the 1400x900 canvas with breathing room.
const leftCard   = { x: 45,  y: 150, w: 625,  h: 315 };
const rightCard  = { x: 730, y: 150, w: 625,  h: 315 };
const bottomCard = { x: 45,  y: 505, w: 1310, h: 340 };

// clicking anywhere on the background resets all selections — nice escape hatch
svg.append("rect")
    .attr("width", width).attr("height", height)
    .attr("fill", colors.background)
    .on("click", resetAll);

svg.append("text")
    .attr("x", width / 2).attr("y", 45).attr("text-anchor", "middle")
    .attr("font-family", "Georgia, 'Times New Roman', serif")
    .attr("font-size", "34px").attr("font-weight", "700").attr("fill", colors.title)
    .text("Music and Mental Health Dashboard");

svg.append("text")
    .attr("x", width / 2).attr("y", 76).attr("text-anchor", "middle")
    .attr("font-size", "15px").attr("fill", colors.muted)
    .text("Exploring how favorite genres and listening time relate to anxiety, depression, insomnia, and OCD");

// I put this banner front and center so users know what they can actually do.
// A dashboard with hidden interactions isn't very useful — this tells people
// right away that the chart is interactive, not just a static image.
svg.append("rect")
    .attr("x", 95).attr("y", 96).attr("width", 1060).attr("height", 38)
    .attr("rx", 18).attr("fill", "#fff4e8").attr("stroke", colors.cardBorder).attr("stroke-width", 1);

svg.append("text")
    .attr("x", width / 2).attr("y", 112).attr("text-anchor", "middle")
    .attr("font-size", "12.5px").attr("font-weight", "700").attr("fill", colors.title)
    .text("Interactions Added");

svg.append("text")
    .attr("x", width / 2).attr("y", 128).attr("text-anchor", "middle")
    .attr("font-size", "12px").attr("fill", colors.text)
    .text("Brushing (Scatterplot), Zoom (Scatterplot), Selection (Bar Chart, Parallel Cords), Smooth Filtering Animation, Staggered Entrance Animation ");

// the reset button lives top-right so it's out of the way but easy to find.
// stopPropagation stops the background click handler from also firing.
const resetButton = svg.append("g")
    .attr("transform", "translate(1180, 98)").style("cursor", "pointer")
    .on("click", function(event) { event.stopPropagation(); resetAll(); });

resetButton.append("rect")
    .attr("width", 115).attr("height", 34).attr("rx", 17)
    .attr("fill", colors.resetButton).attr("stroke", colors.resetButtonStroke).attr("stroke-width", 1);

resetButton.append("text")
    .attr("x", 57.5).attr("y", 22).attr("text-anchor", "middle")
    .attr("font-size", "13px").attr("font-weight", "700").attr("fill", colors.title)
    .text("Reset view");

const tooltip = svg.append("g").attr("opacity", 0).style("pointer-events", "none");
tooltip.append("rect").attr("rx", 8).attr("fill", colors.tooltipBg).attr("opacity", 0.92);
const tooltipText = tooltip.append("text")
    .attr("x", 12).attr("y", 20).attr("font-size", "12px").attr("fill", "white");

function showTooltip(lines, event) {
    tooltipText.selectAll("tspan").remove();
    lines.forEach((line, i) => {
        tooltipText.append("tspan").attr("x", 12).attr("dy", i === 0 ? 0 : 17).text(line);
    });
    // size the background box to fit the text — no hardcoded width
    const tw = Math.max(...lines.map(l => l.length)) * 7 + 24;
    const th = lines.length * 18 + 16;
    tooltip.select("rect").attr("width", tw).attr("height", th);

    // figure out where the mouse is in SVG coordinates and position the tooltip
    // so it stays inside the canvas and doesn't get cut off at the edges
    const [mx, my] = d3.pointer(event, svg.node());
    let tx = mx + 18, ty = my - 18;
    if (tx + tw > width - 10) tx = mx - tw - 18;   // flip left if too close to right edge
    if (ty < 10) ty = my + 18;                      // flip down if too close to top
    if (ty + th > height - 10) ty = height - th - 10; // nudge up if too close to bottom

    tooltip.attr("transform", `translate(${tx},${ty})`).attr("opacity", 1);
    tooltip.raise(); // always render on top of everything else
}
function hideTooltip() { tooltip.attr("opacity", 0); }

const detailPanel = svg.append("g").attr("opacity", 0).style("pointer-events", "none");
detailPanel.append("rect").attr("class", "detail-bg")
    .attr("rx", 10).attr("fill", "#243047").attr("opacity", 0.93);
const detailText = detailPanel.append("text")
    .attr("x", 12).attr("y", 20).attr("font-size", "11.5px").attr("fill", "white");

function showDetailPanel(d) {
    detailText.selectAll("tspan").remove();

    // show all the info that wouldn't fit in a hover tooltip
    const lines = [
        `Genre: ${d["Fav genre"]}`,
        `Hours/day: ${d["Hours per day"]}h`,
        `Effect: ${d["Music effects"]}`,
        `Anxiety: ${d.Anxiety}   Depression: ${d.Depression}`,
        `Insomnia: ${d.Insomnia}   OCD: ${d.OCD}`
    ];
    lines.forEach((line, i) => {
        detailText.append("tspan").attr("x", 12).attr("dy", i === 0 ? 0 : 16).text(line);
    });

    const pw = 235, ph = lines.length * 16 + 22;
    detailPanel.select(".detail-bg").attr("width", pw).attr("height", ph);

    // position the panel inside the scatter card area — top corner, out of the way of dots
    detailPanel
        .attr("transform", `translate(${rightCard.x + 60}, ${rightCard.y + 54})`)
        .transition().duration(200)
        .attr("opacity", 1);

    detailPanel.raise(); // needs to float above the card border and dots
}
function hideDetailPanel() { detailPanel.attr("opacity", 0); }

// draws the rounded card background behind each chart
function addCard(card) {
    svg.append("rect")
        .attr("x", card.x).attr("y", card.y).attr("width", card.w).attr("height", card.h)
        .attr("rx", 22).attr("fill", colors.card)
        .attr("stroke", colors.cardBorder).attr("stroke-width", 1.5);
}

// centered bold title above a chart
function addChartTitle(g, text, x, y) {
    g.append("text").attr("x", x).attr("y", y).attr("text-anchor", "middle")
        .attr("font-size", "17px").attr("font-weight", "800").attr("fill", colors.title).text(text);
}

// horizontal axis label centered below the axis
function addXAxisLabel(g, text, cw, ch, off) {
    g.append("text").attr("x", cw / 2).attr("y", ch + off).attr("text-anchor", "middle")
        .attr("font-size", "13px").attr("fill", colors.axis).text(text);
}

// vertical axis label rotated 90 degrees to the left of the axis
function addYAxisLabel(g, text, ch, off) {
    g.append("text").attr("x", -ch / 2).attr("y", off).attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle").attr("font-size", "13px").attr("fill", colors.axis).text(text);
}

// light vertical gridlines — help the eye compare bar lengths without cluttering the chart
function addVerticalGridlines(g, xScale, ch) {
    const grid = g.append("g").call(d3.axisTop(xScale).ticks(5).tickSize(-ch).tickFormat(""));
    grid.selectAll("line").attr("stroke", colors.grid);
    grid.selectAll("path").remove();
}

function oneDecimal(v) { return d3.format(".1f")(v); }

// D3 reads everything from CSV as strings, so we have to manually convert
// the numeric columns. easy to forget and annoying to debug when you do.
d3.csv("data/mxmh_survey_results.csv").then(rawData => {
    rawData.forEach(d => {
        d.Age              = Number(d.Age);
        d["Hours per day"] = Number(d["Hours per day"]);
        d.Anxiety          = Number(d.Anxiety);
        d.Depression       = Number(d.Depression);
        d.Insomnia         = Number(d.Insomnia);
        d.OCD              = Number(d.OCD);
        // some rows have empty genre/effect fields — default to "Unknown"
        d["Fav genre"]     = d["Fav genre"]     || "Unknown";
        d["Music effects"] = d["Music effects"] || "Unknown";
    });

    // drop rows with any NaN values — they'd break scales and look weird as dots
    const data = rawData.filter(d =>
        !isNaN(d.Age) && !isNaN(d["Hours per day"]) &&
        !isNaN(d.Anxiety) && !isNaN(d.Depression) &&
        !isNaN(d.Insomnia) && !isNaN(d.OCD)
    );

    // give every row a stable numeric index so brushing can track which
    // dots are selected without comparing whole data objects
    data.forEach((d, i) => d._index = i);

    drawGenreBarChart(data);
    drawScatterPlot(data);
    drawParallelCoordinates(data);

}).catch(err => {
    // if the CSV path is wrong or the file is missing, show a readable error
    // instead of silently failing
    svg.append("text").attr("x", width/2).attr("y", height/2)
        .attr("text-anchor","middle").attr("font-size","22px").attr("fill","#c53030")
        .text("Could not load data/mxmh_survey_results.csv — check the file path");
});

function drawGenreBarChart(data) {
    addCard(leftCard);

    const margin = { top: 68, right: 55, bottom: 55, left: 145 };
    const cw = leftCard.w - margin.left - margin.right;
    const ch = leftCard.h - margin.top  - margin.bottom;

    const g = svg.append("g")
        .attr("transform", `translate(${leftCard.x + margin.left},${leftCard.y + margin.top})`);

    // count how many respondents listed each genre as their favorite,
    // then keep only the top 10 so the chart doesn't get too long
    const genreCounts = d3.rollups(data, v => v.length, d => d["Fav genre"])
        .map(([genre, count]) => ({ genre, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    // horizontal bar chart — genres on y, count on x
    const y = d3.scaleBand().domain(genreCounts.map(d => d.genre)).range([0, ch]).padding(0.24);
    const x = d3.scaleLinear().domain([0, d3.max(genreCounts, d => d.count)]).nice().range([0, cw]);

    addChartTitle(g, "Overview: Most Common Favorite Genres", cw / 2, -34);
    addVerticalGridlines(g, x, ch);

    g.append("g").call(d3.axisLeft(y))
        .selectAll("text").attr("font-size", "12px").attr("fill", colors.text);
    g.append("g").attr("transform", `translate(0,${ch})`).call(d3.axisBottom(x).ticks(5))
        .selectAll("text").attr("font-size", "11px").attr("fill", colors.text);
    addXAxisLabel(g, "Number of Respondents", cw, ch, 42);

    // each bar is clickable — clicking it sets selectedGenre and all three views update.
    // clicking the same bar again deselects it (toggle behavior).
    g.selectAll(".genre-bar").data(genreCounts).enter().append("rect")
        .attr("class", "genre-bar")
        .attr("x", 0).attr("y", d => y(d.genre))
        .attr("width", d => x(d.count)).attr("height", y.bandwidth()).attr("rx", 6)
        .attr("fill", d => selectedGenre === d.genre ? colors.selected : colors.bar)
        .attr("cursor", "pointer")
        .on("click", function(event, d) {
            event.stopPropagation(); // don't let the background reset handler fire too
            selectedGenre = selectedGenre === d.genre ? null : d.genre;
            brushedIndices.clear(); // genre click and brush don't mix — clear the other one
            updateAllViews();
        })
        .on("mouseover", function(event, d) {
            d3.select(this).attr("fill", colors.barHover);
            showTooltip([`Genre: ${d.genre}`, `Respondents: ${d.count}`, "Click to highlight"], event);
        })
        .on("mouseout", function(event, d) {
            // restore the correct color depending on whether this bar is selected
            d3.select(this).attr("fill", selectedGenre === d.genre ? colors.selected : colors.bar);
            hideTooltip();
        });

    // count labels at the end of each bar — easier than reading the axis every time
    g.selectAll(".genre-count-label").data(genreCounts).enter().append("text")
        .attr("class", "genre-count-label")
        .attr("x", d => x(d.count) + 8).attr("y", d => y(d.genre) + y.bandwidth() / 2 + 4)
        .attr("font-size", "11px").attr("font-weight", "700").attr("fill", "#416176")
        .text(d => d.count);
}

// each dot is one person. color = how they said music affects their mental health.
// HW3 interactions live here: brushing (drag) + zoom (scroll) + click for details.

function drawScatterPlot(data) {
    addCard(rightCard);

    // generous right margin to fit the legend without it running off the card
    const margin = { top: 52, right: 150, bottom: 58, left: 58 };
    const cw = rightCard.w - margin.left - margin.right;
    const ch = rightCard.h - margin.top  - margin.bottom;

    const outerG = svg.append("g")
        .attr("transform", `translate(${rightCard.x + margin.left},${rightCard.y + margin.top})`);

    const xBase = d3.scaleLinear()
        .domain([0, d3.max(data, d => d["Hours per day"])]).nice().range([0, cw]);
    const yBase = d3.scaleLinear().domain([0, 10]).range([ch, 0]);

    let xCur = xBase.copy();
    let yCur = yBase.copy();

    const clipId = "sp-clip";
    const clipPad = 8;
    outerG.append("defs").append("clipPath").attr("id", clipId)
        .append("rect")
            .attr("x", -clipPad).attr("y", -clipPad)
            .attr("width", cw + clipPad * 2).attr("height", ch + clipPad * 2);

    // chart title
    addChartTitle(outerG, "Listening Time vs Anxiety", cw / 2, -12);

    // axis groups stored as variables so the zoom handler can redraw their ticks
    const xAxisG = outerG.append("g").attr("transform", `translate(0,${ch})`)
        .call(d3.axisBottom(xBase).ticks(8).tickFormat(d => `${d}h`));
    xAxisG.selectAll("text").attr("font-size", "11px").attr("fill", colors.text);

    const yAxisG = outerG.append("g").call(d3.axisLeft(yBase).ticks(5));
    yAxisG.selectAll("text").attr("font-size", "11px").attr("fill", colors.text);

    addXAxisLabel(outerG, "Hours Listening per Day", cw, ch, 42);
    addYAxisLabel(outerG, "Anxiety Score", ch, -42);

    const clipG = outerG.append("g").attr("clip-path", `url(#${clipId})`);

    // invisible background rect so drag can start anywhere inside the plot area,
    // not just on top of a dot
    clipG.append("rect").attr("width", cw).attr("height", ch).attr("fill", "transparent");

    // gridlines inside the clipped group so they also move during zoom
    const gridG = clipG.append("g");
    function redrawGrid(yScale) {
        gridG.selectAll("*").remove();
        gridG.call(d3.axisLeft(yScale).ticks(5).tickSize(-cw).tickFormat(""));
        gridG.selectAll("line").attr("stroke", colors.grid).attr("stroke-opacity", 0.7);
        gridG.selectAll("path").remove();
    }
    redrawGrid(yBase);

    // one dot per respondent — drawn inside clipG so they can't overflow the card
    const dotsG = clipG.append("g");
    dotsG.selectAll(".scatter-dot").data(data).enter().append("circle")
        .attr("class", "scatter-dot")
        .attr("cx", d => xBase(d["Hours per day"]))
        .attr("cy", d => yBase(d.Anxiety))
        .attr("r", 4.8)
        .attr("fill", d => effectColor(d["Music effects"]))
        .attr("stroke", "#fffaf3").attr("stroke-width", 0.9)
        .attr("opacity", 0.88)
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
            // grow the dot and show a quick preview tooltip on hover
            d3.select(this).attr("r", 7).attr("stroke", colors.title).attr("stroke-width", 1.3);
            showTooltip([
                `Genre: ${d["Fav genre"]}`,
                `Hours/day: ${d["Hours per day"]}h`,
                `Anxiety: ${d.Anxiety}`,
                `Effect: ${d["Music effects"]}`,
                "Click for full scores"
            ], event);
        })
        .on("mouseout", function() {
            d3.select(this).attr("r", 4.8).attr("stroke", "#fffaf3").attr("stroke-width", 0.9);
            hideTooltip();
        })
        .on("click", function(event, d) {
            event.stopPropagation(); // don't let the background reset handler fire
            showDetailPanel(d);     // show all 5 mental health scores for this person
        });

    // filter() restricts this zoom behavior to wheel events only.
    // that way drag events still go to the brush below and the two don't conflict.
    const zoom = d3.zoom()
        .scaleExtent([1, 10])   // zoom range: 1x (normal) to 10x
        .translateExtent([[-50, -50], [cw + 50, ch + 50]])
        .extent([[0, 0], [cw, ch]])
        .filter(event => event.type === "wheel")
        .on("zoom", function(event) {
            const t = event.transform;

            // rescale both axes based on how far/where the user zoomed
            xCur = t.rescaleX(xBase);
            yCur = t.rescaleY(yBase);

            // redraw the axis tick labels with the new scale values
            xAxisG.call(d3.axisBottom(xCur).ticks(8).tickFormat(d => `${d}h`))
                .selectAll("text").attr("font-size", "11px").attr("fill", colors.text);
            yAxisG.call(d3.axisLeft(yCur).ticks(5))
                .selectAll("text").attr("font-size", "11px").attr("fill", colors.text);

            redrawGrid(yCur);

            // move every dot to its new position — direct attribute update (no transition)
            // because zoom needs to feel instant and smooth, not laggy
            dotsG.selectAll(".scatter-dot")
                .attr("cx", d => xCur(d["Hours per day"]))
                .attr("cy", d => yCur(d.Anxiety));

            // if the user had a brush active, recalculate which dots are inside it
            // because the dots just moved on screen
            if (brushedIndices.size > 0) recheckBrush();
        });

    // attach zoom to outerG so scrolling anywhere over the chart triggers it
    outerG.call(zoom);

    // the brush group is the LAST thing appended inside clipG.
    // last = on top = drag events hit it before reaching the dots underneath.
    // scroll events bypass it because the zoom filter only allows "wheel" events.
    let brushExtentData = null; // stores the brush corners in data space, not pixels

    const brush = d3.brush()
        .extent([[0, 0], [cw, ch]])
        .on("start", function() {
            // hide the hover tooltip and detail panel when starting a new brush drag
            hideTooltip();
            hideDetailPanel();
        })
        .on("brush", function(event) {
            if (!event.selection) return;
            applyBrush(event.selection);
        })
        .on("end", function(event) {
            if (!event.selection) {
                // user clicked without dragging — treat it as clearing the brush
                brushedIndices.clear();
                brushExtentData = null;
                updateAllViews();
            }
        });

    const brushG = clipG.append("g").attr("class", "brush").call(brush);

    // style the brush rectangle — subtle fill so you can still see the dots inside
    brushG.select(".selection")
        .attr("stroke", colors.selected).attr("stroke-width", 1.5)
        .attr("fill", colors.selected).attr("fill-opacity", 0.15);

    // called whenever the brush rectangle changes size or position.
    // converts pixel corners to data values and finds all dots inside.
    function applyBrush(selection) {
        const [[x0, y0], [x1, y1]] = selection;

        // store in data space so recheckBrush works after zoom
        // note: y is inverted because SVG y goes top-to-bottom but data y goes bottom-to-top
        brushExtentData = {
            x0: xCur.invert(x0), x1: xCur.invert(x1),
            y0: yCur.invert(y1), y1: yCur.invert(y0)
        };

        brushedIndices.clear();
        data.forEach(d => {
            if (
                d["Hours per day"] >= brushExtentData.x0 &&
                d["Hours per day"] <= brushExtentData.x1 &&
                d.Anxiety          >= brushExtentData.y0 &&
                d.Anxiety          <= brushExtentData.y1
            ) brushedIndices.add(d._index);
        });

        // brush and genre selection don't stack — clear genre when brushing
        selectedGenre = null;
        updateAllViews();
    }

    // after zooming, the dots moved on screen but the stored data-space brush extent
    // didn't change. we just need to rebuild brushedIndices from the same extent.
    function recheckBrush() {
        if (!brushExtentData) return;
        brushedIndices.clear();
        data.forEach(d => {
            if (
                d["Hours per day"] >= brushExtentData.x0 &&
                d["Hours per day"] <= brushExtentData.x1 &&
                d.Anxiety          >= brushExtentData.y0 &&
                d.Anxiety          <= brushExtentData.y1
            ) brushedIndices.add(d._index);
        });
        updateAllViews();
    }

    const legend = outerG.append("g").attr("transform", `translate(${cw + 14}, 0)`);
    legend.append("text").attr("font-size", "13px").attr("font-weight", "800")
        .attr("fill", colors.title).text("Music Effects");

    effectColor.domain().forEach((label, i) => {
        const lg = legend.append("g").attr("transform", `translate(0, ${24 + i * 30})`);
        lg.append("circle").attr("cx", 8).attr("cy", 8).attr("r", 8)
            .attr("fill", effectColor(label)).attr("stroke", "#fffaf3").attr("stroke-width", 0.9);
        lg.append("text").attr("x", 22).attr("y", 13)
            .attr("font-size", "12px").attr("fill", colors.text).text(label);
    });

    // small usage hints below the legend — keeps them close to where the interaction happens
    const hintY = 24 + effectColor.domain().length * 30 + 18;
    ["Scroll to zoom in/out", "Drag to select a group"].forEach((hint, i) => {
        legend.append("text").attr("x", 0).attr("y", hintY + i * 14)
            .attr("font-size", "10px").attr("fill", colors.muted).text(hint);
    });
}

// instead of showing individual dots, this chart averages all respondents by genre
// and draws one line per genre across 5 mental health dimensions.
// it lets you compare genre "profiles" — e.g., does Metal have higher anxiety than Pop?

function drawParallelCoordinates(data) {
    addCard(bottomCard);

    const margin = { top: 105, right: 200, bottom: 42, left: 90 };
    const cw = bottomCard.w - margin.left - margin.right;
    const ch = bottomCard.h - margin.top  - margin.bottom;

    const g = svg.append("g")
        .attr("transform", `translate(${bottomCard.x + margin.left},${bottomCard.y + margin.top})`);

    const dimensions = ["Hours per day", "Anxiety", "Depression", "Insomnia", "OCD"];

    // average all respondents within each genre to get one summary row per genre.
    // we also filter out genres with fewer than 10 respondents — small samples
    // produce noisy averages that would be misleading to show.
    const genreData = d3.rollups(data,
        v => ({
            genre: v[0]["Fav genre"], count: v.length,
            "Hours per day": d3.mean(v, d => d["Hours per day"]),
            Anxiety:    d3.mean(v, d => d.Anxiety),
            Depression: d3.mean(v, d => d.Depression),
            Insomnia:   d3.mean(v, d => d.Insomnia),
            OCD:        d3.mean(v, d => d.OCD)
        }),
        d => d["Fav genre"]
    ).map(([, v]) => v)
     .filter(d => d.count >= 10)
     .sort((a, b) => b.count - a.count)
     .slice(0, 10);

    // colorblind-friendly palette — each genre gets a distinct color
    const genreColor = d3.scaleOrdinal()
        .domain(genreData.map(d => d.genre)).range(genrePalette);

    // x positions the 5 parallel axes evenly across the chart width
    const x = d3.scalePoint().domain(dimensions).range([0, cw]).padding(0.5);

    // each axis has its own y scale because the dimensions have different units and ranges.
    // using a shared y scale would make everything look flat and meaningless.
    const y = {};
    dimensions.forEach(dim => {
        y[dim] = d3.scaleLinear()
            .domain(d3.extent(genreData, d => d[dim])).nice().range([ch, 0]);
    });

    // converts a genre row into a connected line across all 5 axes
    function path(d) {
        return d3.line()(dimensions.map(dim => [x(dim), y[dim](d[dim])]));
    }

    addChartTitle(g, "Advanced View: Average Mental Health Scores by Favorite Genre", cw / 2, -68);
    g.append("text").attr("x", cw / 2).attr("y", -40).attr("text-anchor", "middle")
        .attr("font-size", "13px").attr("fill", colors.muted)
        .text("Click a line to spotlight it across all views");

    // HW3 Animated Transition — Timestep / staggered entrance:
    // lines fade in one at a time instead of all appearing at once.
    // this draws the eye across the axes progressively and helps the viewer
    // understand the structure of parallel coordinates before it gets crowded.
    g.selectAll(".parallel-line").data(genreData).enter().append("path")
        .attr("class", "parallel-line")
        .attr("d", path).attr("fill", "none")
        .attr("stroke", d => genreColor(d.genre))
        .attr("stroke-width", 3.4)
        .attr("opacity", 0)          // start fully transparent for the entrance animation
        .attr("cursor", "pointer")
        .transition()
            .duration(600)
            .delay((d, i) => i * 120) // each line waits 120ms more than the previous one
            .attr("opacity", 0.88)
        .selection() // drop back to the selection (not the transition) to attach event handlers
        .on("click", function(event, d) {
            event.stopPropagation();
            // toggle — clicking the same line twice deselects it
            selectedGenre = selectedGenre === d.genre ? null : d.genre;
            brushedIndices.clear();
            updateAllViews();
        })
        .on("mouseover", function(event, d) {
            d3.select(this).attr("stroke-width", 6).attr("opacity", 1);
            showTooltip([
                `Genre: ${d.genre}`,
                `Avg hours/day: ${oneDecimal(d["Hours per day"])}h`,
                `Avg anxiety: ${oneDecimal(d.Anxiety)}`,
                `Avg depression: ${oneDecimal(d.Depression)}`,
                "Click to highlight across all views"
            ], event);
        })
        .on("mouseout", function(event, d) {
            const isSel = selectedGenre === d.genre;
            // restore the right stroke-width and opacity for this line's current state
            d3.select(this)
                .attr("stroke-width", isSel ? 6 : 3.4)
                .attr("opacity", (selectedGenre && !isSel) ? 0.18 : 0.88);
            hideTooltip();
        });

    // draw the 5 vertical axes — one per mental health dimension
    const axisGroups = g.selectAll(".dimension").data(dimensions).enter()
        .append("g").attr("class", "dimension")
        .attr("transform", d => `translate(${x(d)},0)`);

    axisGroups.each(function(d) {
        // format hours with "h" suffix for readability, other dimensions are plain numbers
        const axis = d === "Hours per day"
            ? d3.axisLeft(y[d]).ticks(5).tickFormat(v => `${oneDecimal(v)}h`)
            : d3.axisLeft(y[d]).ticks(5).tickFormat(v => oneDecimal(v));
        d3.select(this).call(axis)
            .selectAll("text").attr("font-size", "11px").attr("fill", colors.text);
    });

    // dimension labels above each axis
    axisGroups.append("text").attr("y", -13).attr("text-anchor", "middle")
        .attr("font-size", "13px").attr("font-weight", "800").attr("fill", colors.title)
        .text(d => d);

    // legend items are also clickable — same behavior as clicking the line itself
    const legend = g.append("g").attr("transform", `translate(${cw + 45},-6)`);
    legend.append("text").attr("font-size", "13px").attr("font-weight", "800")
        .attr("fill", colors.title).text("Favorite Genre");

    legend.selectAll(".genre-legend-item").data(genreData).enter().append("g")
        .attr("class", "genre-legend-item")
        .attr("transform", (d, i) => `translate(0,${24 + i * 20})`)
        .attr("cursor", "pointer")
        .on("click", function(event, d) {
            event.stopPropagation();
            selectedGenre = selectedGenre === d.genre ? null : d.genre;
            brushedIndices.clear();
            updateAllViews();
        })
        .each(function(d) {
            d3.select(this).append("rect").attr("width", 12).attr("height", 12).attr("rx", 2)
                .attr("fill", genreColor(d.genre));
            d3.select(this).append("text").attr("x", 18).attr("y", 10)
                .attr("font-size", "10.5px").attr("fill", colors.text)
                .text(`${d.genre} (${d.count})`);
        });
}

// every time selectedGenre or brushedIndices changes, this function runs.
// it updates all three views simultaneously with the same 350ms fade animation.
//
// using the same animation style everywhere is intentional — it's the
// "consistent semantic-syntactic mappings" principle from Heer & Robertson (2007).
// when everything fades the same way, users understand it's all one operation.

function updateAllViews() {

    if (brushedIndices.size > 0) {
        // when brushing, figure out which genres appear among the selected dots.
        // bars for those genres highlight; everything else dims.
        // this turns the scatter brush into a filter on the genre overview — pretty useful.
        const brushedGenres = new Set();
        svg.selectAll(".scatter-dot").each(function(d) {
            if (brushedIndices.has(d._index)) brushedGenres.add(d["Fav genre"]);
        });
        svg.selectAll(".genre-bar").transition().duration(350)
            .attr("fill", d => brushedGenres.has(d.genre) ? colors.selected : colors.bar)
            .attr("opacity", d => brushedGenres.has(d.genre) ? 1 : 0.25);

        // also highlight the parallel coords lines for genres in the brushed set,
        // so the bottom chart responds to the brush too
        svg.selectAll(".parallel-line").transition().duration(350).ease(d3.easeCubicOut)
            .attr("stroke-width", d => brushedGenres.has(d.genre) ? 6 : 3.4)
            .attr("opacity", d => brushedGenres.has(d.genre) ? 1 : 0.16);

        svg.selectAll(".genre-legend-item").transition().duration(350)
            .attr("opacity", d => brushedGenres.has(d.genre) ? 1 : 0.35);

    } else {
        // when a genre is selected, highlight that bar and dim all the others
        svg.selectAll(".genre-bar").transition().duration(350)
            .attr("fill", d => selectedGenre === d.genre ? colors.selected : colors.bar)
            .attr("opacity", d => selectedGenre && selectedGenre !== d.genre ? 0.35 : 1);

        // HW3 Animated Transition — Filtering:
        // the selected genre's line stays bright and thick; everything else fades back.
        // same 350ms duration as the dots so both updates feel synchronized
        // (Gestalt Common Fate — things that move together are perceived as one operation).
        svg.selectAll(".parallel-line").transition().duration(350).ease(d3.easeCubicOut)
            .attr("stroke-width", d => selectedGenre === d.genre ? 6 : 3.4)
            .attr("opacity", d => {
                if (!selectedGenre) return 0.88;
                return d.genre === selectedGenre ? 1 : 0.16;
            });

        // legend items also dim when a genre is selected so it's clear which one is active
        svg.selectAll(".genre-legend-item").transition().duration(350)
            .attr("opacity", d => !selectedGenre ? 1 : d.genre === selectedGenre ? 1 : 0.35);
    }

    // HW3 Animated Transition — Filtering:
    // dots fade and resize smoothly rather than snapping, making it easy to
    // see which ones are entering or leaving the highlighted set.
    svg.selectAll(".scatter-dot").transition().duration(350).ease(d3.easeCubicOut)
        .attr("opacity", function(d) {
            if (brushedIndices.size > 0) return brushedIndices.has(d._index) ? 0.95 : 0.07;
            if (!selectedGenre) return 0.88;
            return d["Fav genre"] === selectedGenre ? 0.95 : 0.07;
        })
        .attr("r", function(d) {
            if (brushedIndices.size > 0) return brushedIndices.has(d._index) ? 6.5 : 3;
            if (!selectedGenre) return 4.8;
            return d["Fav genre"] === selectedGenre ? 6.2 : 3.2;
        });
}

function resetAll() {
    selectedGenre = null;
    brushedIndices.clear();
    // d3.brush().move(null) programmatically clears the visible brush rectangle
    svg.select(".brush").call(d3.brush().move, null);
    hideDetailPanel();
    updateAllViews();
    hideTooltip();
}
