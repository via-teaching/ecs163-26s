// Interaction state (read by barchart.js, heatmap.js, sankey.js)
let selectedTitles  = new Set();
let allTop10Titles  = [];
let heatmapUpdateFn = null;
let sankeyUpdateFn  = null;

// Load data, compute top-10, wire up all three views
d3.csv("ds_salaries/ds_salaries.csv", d => ({
    work_year:         +d.work_year,
    experience_level:   d.experience_level,
    employment_type:    d.employment_type,
    job_title:          d.job_title,
    salary_in_usd:     +d.salary_in_usd,
    remote_ratio:      +d.remote_ratio,
    company_size:       d.company_size,
    company_location:   d.company_location,
})).then(data => {
    const counts = d3.rollup(data, v => v.length, d => d.job_title);
    allTop10Titles = Array.from(counts, ([title, n]) => ({ title, n }))
        .sort((a, b) => b.n - a.n).slice(0, 10).map(d => d.title);

    drawBarChart(data);
    heatmapUpdateFn = initHeatmap(data);
    heatmapUpdateFn(allTop10Titles);
    sankeyUpdateFn = drawSankey(data);
});
