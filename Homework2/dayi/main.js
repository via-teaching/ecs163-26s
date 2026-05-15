let globalData = [];
let sankeyChart, barChart, scatterPlot;

let globalFilter = {
    jobTitle: null
};

function getSalaryTier(salary) {
    if (salary < 80000) return "Low Salary (<80k)";
    if (salary <= 160000) return "Medium Salary (80k-160k)";
    return "High Salary (>160k)";
}

d3.csv("data/ds_salaries.csv").then(data => {
    // read in and clean the dataset
    data.forEach(d => {
        d.salary_in_usd = +d.salary_in_usd;
    });
    globalData = data;


    sankeyChart = new SankeyChart("#top-half");
    barChart = new BarChart("#bottom-left");
    scatterPlot = new scatterPlot("#bottom-right");
    updateViews();
});

// function that updates views based on filter changges in each visualization
function updateViews(triggerSource = null) {
    let filteredData = globalData;

    // bar chart selection
    if (globalFilter.jobTitle) {
        filteredData = filteredData.filter(d => d.job_title === globalFilter.jobTitle);
    }

    // Update charts that aren't the trigger source
    if (triggerSource !== "sankey") sankeyChart.update(filteredData);
    if (triggerSource !== "bar") barChart.update(filteredData);
    if (triggerSource !== "scatter") scatterPlot.update(filteredData);
}
