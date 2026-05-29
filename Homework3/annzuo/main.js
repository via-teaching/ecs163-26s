// I am using the same dataset as HW2
// I used Chat GPT to learn how to incorporate interactive techniques
const scatterSVG = d3.select("#scatterSVG");
const heatmapSVG = d3.select("#heatmapSVG");
const parallelSVG = d3.select("#parallelSVG");

const tooltip = d3.select("#tooltip");

const scatterWidth = 900;
const scatterHeight = 600;

const heatWidth = 600;
const heatHeight = 300;

const parallelWidth = 900;
const parallelHeight = 700;

let fullData = [];

const ingredients = [
    "Glycerin",
    "Water",
    "Alcohol",
    "Oil",
    "Vitamin C"
];

d3.csv("cosmetics.csv").then(data => {

    data.forEach(d => {

        d.Price = +d.Price;
        d.Rank = +d.Rank;

        d.Combination = +d.Combination;
        d.Dry = +d.Dry;
        d.Normal = +d.Normal;
        d.Oily = +d.Oily;
    });

    fullData = data;

    drawScatter(data);
    drawHeatmap(data);
    drawParallel(data);

    d3.select("#resetBtn")
    .on("click", () => {

        drawScatter(fullData);
        updateHeatmap(fullData);
        updateParallel(fullData);

    });
});
    