// set margin for dashboard

const margin={top:60, right:80, bottom:60, left:60};

// grouping data professions for the plots
function categorizeJob(title) {
    title=title.toLowerCase();
    if (title.includes('engineer') && !title.includes('machine')) return 'Data Engineering';
    if (title.includes('scientist') || title.includes('research')) return 'Data Science';
    if (title.includes('machine')  || title.includes('ml') || title.includes('ai') ) return 'ML/AI';
    if (title.includes('analyst')  || title.includes('analytics')) return 'Analytics';
    return 'Other';
}

// use entry, mid, senior, executive for the arc diagram
const expMap={'EN': 'Entry', 'MI': 'Mid', 'SE': 'Senior', 'EX': 'Executive'};

// read the dataset 
d3.csv('ds_salaries.csv').then(data => {
    data.forEach(d => {
        d.salary_in_usd = +d.salary_in_usd;
        d.work_year = +d.work_year;
        d.job_category = categorizeJob(d.job_title);
        d.exp_label = expMap[d.experience_level] || d.experience_level;
    
    });

    const categories = ['Data Science', 'Data Engineering', 'ML/AI', 'Analytics', 'Other']; // separate data roles into different categories
    const colors = d3.scaleOrdinal().domain(categories)
                    .range(['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#94a3b8']);

    // function calls for all visualization types
    renderBarChart(data);
    renderPieChart(data, colors);
    renderArcDiagram(data, colors);

});

// function for bar chart - shows average salary over the years (over all data professions)
function renderBarChart(data) {
    const width=450-margin.left-margin.right;
    const height=300-margin.top-margin.bottom;

    // yearly salary average
    const yearlyAvg=d3.groups(data, d=>d.work_year)
                       .map(([year, v])=>({year, avg: d3.mean(v, d=>d.salary_in_usd)}))
                       .sort((a,b)=>a.year-b.year);

    const svg=d3.select("#bar-svg-container").append('svg').attr('width', width+margin.left+margin.right).attr('height', height+margin.top+margin.bottom).append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

    const x=d3.scaleBand().range([0, width]).domain(yearlyAvg.map(d=>d.year)).padding(0.3);
    const y=d3.scaleLinear().range([height, 0]).domain([0, d3.max(yearlyAvg, d=>d.avg)]).nice();

    svg.append('g').attr('transform', `translate(0, ${height})`).call(d3.axisBottom(x));
    svg.append('g').call(d3.axisLeft(y).tickFormat(d3.format("$.2s")));

    svg.selectAll('rect').data(yearlyAvg).enter().append('rect').attr('x', d=>x(d.year)).attr('y', d=>y(d.avg)).attr('width', x.bandwidth()).attr('height', d=>height-y(d.avg)).attr('fill', "#6366f1").attr("rx", 4);

}

// function for pie chart - shows market share of each data profession
function renderPieChart(data, colors) {
    const width=550;
    const height=350;
    const radius=100;
    const counts=Array.from(d3.rollup(data, v=>v.length, d=>d.job_category));

    const svg=d3.select("#pie-svg-container").append('svg').attr('width', width).attr('height', height);
    const chartGroup=svg.append('g').attr('transform', `translate(${width / 3}, ${height / 2})`);

    const pie=d3.pie().value(d=>d[1]);
    const arc=d3.arc().innerRadius(60).outerRadius(radius);
    
    chartGroup.selectAll('path').data(pie(counts)).enter().append('path').attr('d', arc).attr('fill', d=>colors(d.data[0])).attr('stroke', '#fff');

    // legend
    const legend=svg.append('g').attr('transform', `translate(${width*0.65}, ${height/4})`);

    counts.forEach((d, i)=>{
        const entry=legend.append('g').attr('transform', `translate(0, ${i*25})`);
        entry.append('rect').attr('width', 12).attr('height', 12).attr('fill', colors(d[0])).attr('rx', 3);
        entry.append('text').attr('x', 20).attr('y', 11).text(d[0]).style('font-size', '12px').style('font-weight', 'bold');
    });

}

// function for arc diagram - shows volume of people in data roles working in different kinds of roles
function renderArcDiagram(data, colors) {
    const width=1000;
    const height=600;

    d3.select('#arc-svg-container').selectAll('*').remove();

    const svg=d3.select('#arc-svg-container').append('svg').attr('width', '100%').attr('height', '400px').attr('viewBox', `0 0 ${width} ${height}`).append('g').attr('transform', `translate(50, 400)`);
    const nodes=['Data Science', 'Data Engineering', 'ML/AI', 'Analytics', 'Other', 'Entry', 'Mid', 'Senior', 'Executive']; // points on arc diagram
    const x=d3.scalePoint().range([0, width-100]).domain(nodes);

    const links=[];
    data.slice(0, 1000).forEach(d=>{
        links.push({
            source: d.job_category,
            target: d.exp_label
        });
    });

    // Aggregate links for performance and thickness
    const linkCounts = d3.rollup(links, v => v.length, d => d.source, d => d.target);

    Array.from(linkCounts).forEach(([source, targets]) => {
        Array.from(targets).forEach(([target, count]) => {
            const x1 = x(source), x2 = x(target);
            const r = Math.abs(x2 - x1) / 2;
            svg.append('path')
                .attr('d', `M ${x1}, 0 A ${r}, ${r/1.5} 0 0, ${x1 < x2 ? 1 : 0} ${x2}, 0`)
                .attr('fill', 'none')
                .attr('stroke', colors(source)) // Now uses profession colors
                .attr('stroke-width', Math.min(count / 2, 15))
                .attr('opacity', 0.25);
        });
    });
    svg.selectAll('circle').data(nodes).enter().append('circle').attr('cx', d=>x(d)).attr('r', 10).attr('fill', '#1e293b');

    svg.selectAll('text').data(nodes).enter().append('text').attr('x', d=>x(d)).attr('y', 40).attr('text-anchor', 'middle').text(d=>d).style('font-size', '14px').style('font-weight', '800').style('fill', '#334155');

}

