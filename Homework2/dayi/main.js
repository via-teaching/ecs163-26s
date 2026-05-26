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


    sankeyChart = new SankeyChart("#bottom-left");
    barChart = new BarChart("#top-half");
    scatterPlot = new ScatterPlot("#bottom-right");
    updateViews();
});

// function that updates views based on filter changges in each visualization
function updateViews(triggerSource = null) {
    let filteredData = globalData;

    if (globalFilter.jobTitle) {
        if (globalFilter.jobTitle === "Other Roles") {
            // find top 9 job titles
            let counts = d3.nest()
                .key(d => d.job_title)
                .rollup(v => v.length)
                .entries(globalData)
                .sort((a, b) => b.value - a.value);

            let top9Keys = counts.slice(0, 9).map(d => d.key);

            // exclude those top 9
            filteredData = globalData.filter(d => !top9Keys.includes(d.job_title));
        } else {
            // standard filter for specific roles
            filteredData = globalData.filter(d => d.job_title === globalFilter.jobTitle);
        }
    }

    // update the other charts with the correctly filtered data
    sankeyChart.update(filteredData);
    scatterPlot.update(filteredData);

    // only update bar chart if it wasn't the trigger
    if (triggerSource !== "bar") barChart.update(globalData);
}