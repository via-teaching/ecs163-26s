const width = window.innerWidth;
const height = window.innerHeight;

const scatterMargin = {top: 10, right: 30, bottom: 30, left: 60},
    scatterWidth = 400 - scatterMargin.left - scatterMargin.right,
    scatterHeight = 320 - scatterMargin.top - scatterMargin.bottom;

const distrLeft = 550, distrTop = 0;
const distrMargin = {top: 10, right: 30, bottom: 30, left: 60},
    distrWidth = 500 - distrMargin.left - distrMargin.right,
    distrHeight = 320 - distrMargin.top - distrMargin.bottom;

const teamLeft = 0, teamTop = 400;
const teamMargin = {top: 10, right: 30, bottom: 30, left: 60},
    teamWidth = width - teamMargin.left - teamMargin.right,
    teamHeight = height - 450 - teamMargin.top - teamMargin.bottom;

const hiddenGenres = new Set();
let colorScale; 
// Set main animation/visualization view
let isSelectMode = false;
window.isSelectMode = isSelectMode;

d3.csv("mxmh_survey_results.csv").then(rawData => {
    const cleanData = rawData.filter(d => d["Fav genre"] && d["Fav genre"] !== "");

    // Count up all genre types in order to 
    let initialCounts = d3.nest()
        .key(d => d["Fav genre"])
        .rollup(v => v.length)
        .entries(cleanData)
        .sort((a, b) => b.value - a.value);

    // group the last 3 (they only add up to 19)
    const bottomThree = initialCounts.slice(-3).map(d => d.key);
    const newData = cleanData.map(d => {
        let genre = d["Fav genre"];
        if (bottomThree.includes(genre)) { genre = "Others"; }
        return { ...d, "Fav genre": genre };
    });

    const genreCounts = d3.nest()
        .key(d => d["Fav genre"])
        .rollup(v => v.length)
        .entries(newData)
        .sort((a, b) => b.value - a.value);

    // Universal graph colors
    const genreColors = {
        "Rock": "#3357FF", 
        "Pop": "#FF23A8", 
        "Hip hop": "#2e5d2b", 
        "R&B": "#78177b",
        "Jazz": "#9B33FF", 
        "Classical": "#277f79", 
        "Metal": "#666666", 
        "Country": "#A86F33",
        "EDM": "#FF9F35", 
        "Rap": "#16240c", 
        "Folk": "#00ff00", 
        "K pop": "#d20d0d9e",
        "Video game music": "#FF4500", 
        "Others": "#A9A9A9"
    };

    colorScale = d3.scaleOrdinal()
        .domain(Object.keys(genreColors))
        .range(Object.values(genreColors));

    window.fullDataset= newData;
    // draw all 3 graphs
    drawScatterPlot(newData, genreCounts);
    drawBarChart(newData);
    drawStarChart(newData, genreCounts);

    const modeBtn = d3.select("body").append("button")
        .style("position", "absolute")
        .style("left", `${teamMargin.left + 615}px`)
        .style("top", `${teamTop - 34}px`)
        .style("z-index", "10")
        .text("Switch to Selection Mode");

    modeBtn.on("click", function() {
        isSelectMode = !isSelectMode;
        window.isSelectMode = isSelectMode;
        
        if (isSelectMode) {
            toggleStarChartLayout(true); 
            modeBtn.text("Back");
            // clear brush when going select mode
            if (window.clearActiveBrush) {
                window.clearActiveBrush();
            }
        } else {
            toggleStarChartLayout(false); 
            modeBtn.text("Switch to Selection Mode");
            
            // clear brush when leaving select mode
            if (window.clearActiveBrush) {
                window.clearActiveBrush();
            }
            // return legend filters when going back
            d3.selectAll(".participant-dot")
                .transition()
                .duration(500)
                .attr("r", d => hiddenGenres.has(d.genre) ? 0 : 4.5)
                .style("opacity", d => hiddenGenres.has(d.genre) ? 0 : 0.60);
        }
    });

}).catch(function(err){
    console.log(err);
});



