let globalData = [];
let sankeyChart, barChart, histogramChart;

let globalFilter = {
    salaryRange: null,
    jobTitle: null,
    sankeyNode: null
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
    histogramChart = new HistogramChart("#bottom-right");

    updateViews();
});

// function that updates views based on filter changges in each visualization
function updateViews(triggerSource = null) {
    let filteredData = globalData;

    // histogram group selection/brushing
    if (globalFilter.salaryRange) {
        filteredData = filteredData.filter(d => d.salary_in_usd >= globalFilter.salaryRange[0] && d.salary_in_usd <= globalFilter.salaryRange[1]);
    }

    // bar chart selection
    if (globalFilter.jobTitle) {
        filteredData = filteredData.filter(d => d.job_title === globalFilter.jobTitle);
    }

    // sankey node selection
    if (globalFilter.sankeyNode) {
        filteredData = filteredData.filter(d => {
            let remoteStr = d.remote_ratio == 0 ? "0% Remote" : d.remote_ratio == 50 ? "50% Remote" : "100% Remote";
            return d.experience_level === globalFilter.sankeyNode ||
                d.company_size === globalFilter.sankeyNode ||
                remoteStr === globalFilter.sankeyNode ||
                getSalaryTier(d.salary_in_usd) === globalFilter.sankeyNode;
        });
    }

    if (triggerSource !== "sankey") sankeyChart.update(filteredData);
    if (triggerSource !== "bar") barChart.update(filteredData);
    if (triggerSource !== "hist") histogramChart.update(filteredData);
}
