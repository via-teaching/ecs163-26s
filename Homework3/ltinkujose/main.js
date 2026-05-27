let abFilter = 25;
const width = window.innerWidth;
const height = window.innerHeight;

let scatterLeft = 0, scatterTop = 0;
let scatterMargin = {top: 10, right: 30, bottom: 30, left: 60},
    scatterWidth = 400 - scatterMargin.left - scatterMargin.right,
    scatterHeight = 350 - scatterMargin.top - scatterMargin.bottom;

let distrLeft = 400, distrTop = 0;
let distrMargin = {top: 10, right: 30, bottom: 30, left: 60},
    distrWidth = 400 - distrMargin.left - distrMargin.right,
    distrHeight = 350 - distrMargin.top - distrMargin.bottom;

let teamLeft = 0, teamTop = 400;
let teamMargin = {top: 10, right: 30, bottom: 30, left: 60},
    teamWidth = width - teamMargin.left - teamMargin.right,
    teamHeight = height-450 - teamMargin.top - teamMargin.bottom;


// Regarding dataset:
// The original `globalterrorism.csv` dataset exceeds GitHub’s 100MB file upload limit, so for the assignment requirements, I pushed a file named `globalterrorism_agg.csv` which is a compressed version of the original dataset.
// A compressed `.zip` version of the original terrorism dataset has also been included in the repository. After unzipping, the original datasets could be used for Homework 2 and Homework 3 to render the visualizations.

// This section loads the terrorism dataset using D3
d3.csv("globalterrorism.csv").then(rawData =>{
    console.log("rawData", rawData);

    // This section converts numeric columns from strings into numbers for later visual encodings
    rawData.forEach(function(d){
    d.iyear = Number(d.iyear);
    d.nkill = Number(d.nkill) || 0;
    d.nwound = Number(d.nwound) || 0;
    });

    const filteredData = rawData;

    // This section creates a simplified processed dataset used by all D3 visualizations
    const processedData = filteredData.map(d => {
    return {
        year: d.iyear,
        region: d.region_txt,
        attackType: d.attacktype1_txt,
        killed: d.nkill,
        wounded: d.nwound
    };
    });
    console.log("processedData", processedData);

    const yearCounts = {};

    // This section counts the number of terrorism attacks for each year
    processedData.forEach(d => {
        if (!yearCounts[d.year]) {
            yearCounts[d.year] = 0;
        }
        yearCounts[d.year]++;
    });

// This section prepares yearly attack totals for the line chart overview visualization
    const attacksByYear = Object.keys(yearCounts).map(year => {
        return {
            year: Number(year),
            count: yearCounts[year]
        };
    }).sort((a, b) => a.year - b.year);

    console.log("attacksByYear", attacksByYear);
    
    // This section calls the D3 function that draws the line chart overview
    drawLineChart(processedData);

    // This section calls the D3 function that draws the node-link diagram
    drawNodeLink(processedData);

    // This section calls the D3 function that draws the streamgraph
    drawStreamGraph(processedData);

    // This section calls the D3 function that draws the North America animated bar chart
    drawNorthAmericaYearSlider(processedData);
    
    }).catch(function(error){
    console.log(error);
});