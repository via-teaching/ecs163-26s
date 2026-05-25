// this script adds animations above the original visualization dashboard

// margin set to ensure consistent spacing
const margin = { top: 45, right: 70, bottom: 62, left: 72 };

// state of the dashboard - changes according to what user does 
const state = {
    selectedCategory: null,
    selectedYears: null
};

// make detailed job categories part of broader titles for better understandibility on dashboard
function categorizeJob(title) {
    title = title.toLowerCase();
    if (title.includes('engineer') && !title.includes('machine')) return 'Data Engineering';
    if (title.includes('scientist') || title.includes('research')) return 'Data Science';
    if (title.includes('machine') || title.includes('ml') || title.includes('ai')) return 'ML/AI';
    if (title.includes('analyst') || title.includes('analytics')) return 'Analytics';
    return 'Other';
}

// use entry, mid, senior, executive for the arc diagram
const expMap = { 'EN': 'Entry', 'MI': 'Mid', 'SE': 'Senior', 'EX': 'Executive' };

// read the dataset 
d3.csv('ds_salaries.csv').then(data => {
    data.forEach(d => {
        d.salary_in_usd = +d.salary_in_usd; // convert salary string to number
        d.work_year = +d.work_year; // convert work year string to number 
        d.job_category = categorizeJob(d.job_title); // job category according to the function above 
        d.exp_label = expMap[d.experience_level] || d.experience_level; // experience level information for the visuals
    });

    // keep category order same 
    const categories = ['Data Science', 'Data Engineering', 'ML/AI', 'Analytics', 'Other'];

    // share color scale for the categories using d3.Ordinal()
    const colors = d3.scaleOrdinal()
        .domain(categories)
        .range(['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#94a3b8']);

    // share tooltip across dashboard
    const tooltip = d3.select('body')
        .append('div')
        .attr('class', 'tooltip');

    // depending on the state of the dashboard, redraw it
    function updateDashboard() {
        const filtered = data.filter(d => {
            const categoryMatch = !state.selectedCategory || d.job_category === state.selectedCategory; // filter by category
            const yearMatch = !state.selectedYears || state.selectedYears.includes(d.work_year); // filter by year
            return categoryMatch && yearMatch;
        });

        // get descriptive labels for filters that are active now
        const categoryText = state.selectedCategory ? `Category: ${state.selectedCategory}` : 'All categories'; 
        const yearText = state.selectedYears ? `Years: ${state.selectedYears.join(', ')}` : 'All years';

        // update the filter-summary UI placeholder to show current data state
        d3.select('#filter-summary').text(`Showing ${filtered.length} records | ${categoryText} | ${yearText}`);

        renderBarChart(filtered, data, updateDashboard, tooltip);
        renderPieChart(filtered, colors, updateDashboard, tooltip);
        renderArcDiagram(filtered, colors, tooltip);
    }

    // reset button clears all the filters and resets the original state of the dashboard
    d3.select('#reset-btn').on('click', () => {
        state.selectedCategory = null;
        state.selectedYears = null;
        updateDashboard();
    });

    updateDashboard();
});

// function to create bar chart 
function renderBarChart(filteredData, fullData, updateDashboard, tooltip) {
    const width = 500 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    // clear any existing elements in the container before re-redering it
    d3.select('#bar-svg-container').selectAll('*').remove();

    // aggregate currently filtered data into one average salary per year, record a count for each and sort it chronologically
    const yearlyAvg = d3.groups(filteredData, d => d.work_year)
        .map(([year, values]) => ({ year, avg: d3.mean(values, d => d.salary_in_usd), count: values.length }))
        .sort((a, b) => a.year - b.year); 

        // use full data as domain so that the brush can still show all the possible years of data
    const allYears = Array.from(new Set(fullData.map(d => d.work_year))).sort((a, b) => a - b);

    // use d3 to add the main SVG element that has the bar chart
    const svg = d3.select('#bar-svg-container')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

    const g = svg.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // the X scale maps each year to one horizontal band
    const x = d3.scaleBand()
        .range([0, width])
        .domain(allYears)
        .padding(0.28);

    // the Y scale maps the salar values to vertical positions
    const y = d3.scaleLinear()
        .range([height, 0])
        .domain([0, d3.max(yearlyAvg, d => d.avg) || 1])
        .nice();

    // the bottom axis shows the years
    g.append('g')
        .attr('transform', `translate(0, ${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format('d')));

    // the left axis shows the salary values in a compact dollar format
    g.append('g')
        .call(d3.axisLeft(y).tickFormat(d3.format('$.2s')));

    g.append('text')
        .attr('class', 'axis-label')
        .attr('x', width / 2)
        .attr('y', height + 45)
        .attr('text-anchor', 'middle')
        .text('Work Year');

    g.append('text')
        .attr('class', 'axis-label')
        .attr('x', -height / 2)
        .attr('y', -48)
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .text('Average Salary in USD');

    // the bars encode the average salary per year and animate from the baseline to the target height
    g.selectAll('.salary-bar')
        .data(yearlyAvg, d => d.year)
        .enter()
        .append('rect')
        .attr('class', d => state.selectedYears && state.selectedYears.includes(d.year) ? 'salary-bar brushed-bar' : 'salary-bar')
        .attr('x', d => x(d.year))
        .attr('width', x.bandwidth())
        .attr('y', height)
        .attr('height', 0)
        .attr('fill', '#6366f1')
        .attr('rx', 5)
        .on('mouseover', (event, d) => {
            tooltip.style('opacity', 1)
                .html(`<strong>${d.year}</strong><br>Average: ${d3.format('$,.0f')(d.avg)}<br>Records: ${d.count}`);
        })
        .on('mousemove', event => {
            tooltip.style('left', `${event.pageX + 12}px`).style('top', `${event.pageY - 28}px`);
        })
        .on('mouseout', () => tooltip.style('opacity', 0))
        .transition()
        .duration(800)
        .ease(d3.easeCubicOut)
        .attr('y', d => y(d.avg))
        .attr('height', d => height - y(d.avg));

    // annotation for users to know what to do to filter the years
    g.append('text')
        .attr('class', 'annotation')
        .attr('x', width)
        .attr('y', -15)
        .attr('text-anchor', 'end')
        .text('Brush across the bars to filter the years');

    // a transparent brush layer to allow the user to drag over the bar chart and select a year range
    const brush = d3.brushX()
        .extent([[0, 0], [width, height]])
        .on('end', event => {
            if (!event.selection) {
                state.selectedYears = null;
                updateDashboard();
                return;
            }

            const [x0, x1] = event.selection;
            const selected = allYears.filter(year => {
                const center = x(year) + x.bandwidth() / 2;
                return center >= x0 && center <= x1;
            });

            state.selectedYears = selected.length ? selected : null;
            updateDashboard();
        });

    g.append('g')
        .attr('class', 'brush')
        .call(brush);
}

// create the pie chart
// includes a click selection and animated arc transitions
function renderPieChart(data, colors, updateDashboard, tooltip) {
    const width = 500;
    const height = 300;
    const radius = 95;

    // clear the previous D3 marks before drawing updated filtered state
    d3.select('#pie-svg-container').selectAll('*').remove();

    // check how many records exist in each job category after the current filtering
    const counts = Array.from(d3.rollup(data, values => values.length, d => d.job_category))
        .sort((a, b) => d3.descending(a[1], b[1]));

    // add svg for the pie chart and the legend
    const svg = d3.select('#pie-svg-container')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

  
    const chartGroup = svg.append('g')
        .attr('transform', `translate(${width * 0.32}, ${height / 2})`);

    // pie chart layout generator
    const pie = d3.pie()
        .value(d => d[1])
        .sort(null);

    // the arc generator below draws each slice of the pie chart - helps for animations
    const arc = d3.arc()
        .innerRadius(52)
        .outerRadius(radius);

    // the d3 function below is used to create an invisible start arc in order to animate slices from a small angle to their real angle
    const startArc = d3.arc()
        .innerRadius(52)
        .outerRadius(radius)
        .startAngle(0)
        .endAngle(0);

    // bind the data using categoy name as the unique tracking key
    chartGroup.selectAll('path')
        .data(pie(counts), d => d.data[0])
        .enter()
        .append('path')

        // highlight if this specific category is being currently selected
        .attr('class', d => state.selectedCategory === d.data[0] ? 'selected-slice' : '')
        .attr('d', startArc) // start with flat and collapsed slices for the introduction animation
        .attr('fill', d => colors(d.data[0]))
        .attr('stroke', '#fff')
        .attr('cursor', 'pointer')

        // click handler which toggles active category filter and re-renders everything
        .on('click', (event, d) => {
            state.selectedCategory = state.selectedCategory === d.data[0] ? null : d.data[0];
            updateDashboard();
        })

        // position the tooltip on the hover
        .on('mouseover', (event, d) => {
            tooltip.style('opacity', 1)
                .html(`<strong>${d.data[0]}</strong><br>Records: ${d.data[1]}<br>Click to filter`);
        })
        .on('mousemove', event => {
            tooltip.style('left', `${event.pageX + 12}px`).style('top', `${event.pageY - 28}px`);
        })
        .on('mouseout', () => tooltip.style('opacity', 0)) // hide tooltip when left

        // initial transition - fan out the slices smoothly from 0 to actual angles 
        .transition()
        .duration(850)
        .ease(d3.easeCubicOut)
        .attrTween('d', function(d) {
            const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
            return t => arc(interpolate(t));
        });

   
    chartGroup.append('text')
        .attr('class', 'annotation')
        .attr('text-anchor', 'middle')
        .attr('y', -4)
        .text('Click');

    chartGroup.append('text')
        .attr('class', 'annotation')
        .attr('text-anchor', 'middle')
        .attr('y', 12)
        .text('to filter');

    // legend group to explain color encodings of each category
    const legend = svg.append('g')
        .attr('transform', `translate(${width * 0.62}, ${height * 0.25})`);
    const legendRows = legend.selectAll('.legend-row')
        .data(counts, d => d[0])
        .enter()
        .append('g')
        .attr('class', 'legend-row')
        .attr('transform', (d, i) => `translate(0, ${i * 27})`)
        .attr('cursor', 'pointer')
        .on('click', (event, d) => {
            state.selectedCategory = state.selectedCategory === d[0] ? null : d[0];
            updateDashboard();
        });

    // repeat same color mapping for pie and arc views 
    legendRows.append('rect')
        .attr('width', 13)
        .attr('height', 13)
        .attr('fill', d => colors(d[0]))
        .attr('rx', 3);

    // list category name and the count
    legendRows.append('text')
        .attr('x', 22)
        .attr('y', 11)
        .style('font-size', '12px')
        .style('font-weight', '800')
        .text(d => `${d[0]} (${d[1]})`);
}

// function below renders the arc diagram
function renderArcDiagram(data, colors, tooltip) {
    const width = 1000;
    const height = 390;

    // clear any previous D3 marks before drawing the updated filtered state 
    d3.select('#arc-svg-container').selectAll('*').remove();

    // viewBox used to make sure this view is responsive to any user clicks and highlights
    const svg = d3.select('#arc-svg-container')
        .append('svg')
        .attr('width', '100%')
        .attr('height', '360px')
        .attr('viewBox', `0 0 ${width} ${height}`);

    // define an invisible resctangle to clip or crop any visual elemts that go out of the chart boundaries
    svg.append('defs')
        .append('clipPath')
        .attr('id', 'arc-clip')
        .append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', width)
        .attr('height', height);

    // clip the zoom layer to avoid the arcs spilling over the dashboard
    const zoomLayer = svg.append('g')
        .attr('clip-path', 'url(#arc-clip)');

    // below is the actual arc diagram used in HW 2
    const g = zoomLayer.append('g')
        .attr('transform', 'translate(50, 285)');

    const nodes = ['Data Science', 'Data Engineering', 'ML/AI', 'Analytics', 'Other', 'Entry', 'Mid', 'Senior', 'Executive']; // nodes are the categories and levels of career

    // create point scale to evenly space out nodes on arc diagram
    const x = d3.scalePoint()
        .range([0, width - 100])
        .domain(nodes);

    // map raw dataset into the source to target relationship pairs     
    const links = data.map(d => ({ source: d.job_category, target: d.exp_label }));

    // count occurences of unique combinations of pairs gotten above
    const linkCounts = d3.rollup(links, values => values.length, d => d.source, d => d.target);

    // static horizontal axis across chart width
    g.append('line')
        .attr('x1', 0)
        .attr('x2', width - 100)
        .attr('y1', 0)
        .attr('y2', 0)
        .attr('stroke', '#cbd5e1')
        .attr('stroke-width', 2);

    // flatten nested rollup Map structure back into flat array of objects    
    const aggregatedLinks = [];
    Array.from(linkCounts).forEach(([source, targets]) => {
        Array.from(targets).forEach(([target, count]) => {
            aggregatedLinks.push({ source, target, count });
        });
    });

    // bind the relationship data (from above) using composite unique key
    const paths = g.selectAll('.arc-link')
        .data(aggregatedLinks, d => `${d.source}-${d.target}`)
        .enter()
        .append('path')
        .attr('class', 'arc-link')
        .attr('d', d => {
            const x1 = x(d.source); // pixel coordinate of source node
            const x2 = x(d.target); // pixel coordinate of target node
            const r = Math.abs(x2 - x1) / 2; // calculate radius based on diatnce 
            return `M ${x1},0 A ${r},${r / 1.6} 0 0,${x1 < x2 ? 1 : 0} ${x2},0`;
        })
        .attr('fill', 'none')
        .attr('stroke', d => colors(d.source))
        .attr('stroke-width', d => Math.max(2, Math.min(d.count / 2, 16)))
        .attr('opacity', 0.28)

        // manage the tooltip based on hover - same as the other visualization
        .on('mouseover', (event, d) => {
            tooltip.style('opacity', 1)
                .html(`<strong>${d.source} → ${d.target}</strong><br>Records: ${d.count}`);
        })
        .on('mousemove', event => {
            tooltip.style('left', `${event.pageX + 12}px`).style('top', `${event.pageY - 28}px`);
        })
        .on('mouseout', () => tooltip.style('opacity', 0));

    paths.each(function() {
        const totalLength = this.getTotalLength();
        d3.select(this)
            .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
            .attr('stroke-dashoffset', totalLength)
            .transition()
            .duration(900)
            .ease(d3.easeCubicOut)
            .attr('stroke-dashoffset', 0);
    });

    // draw individual node circles on baseline axis
    g.selectAll('.arc-node')
        .data(nodes)
        .enter()
        .append('circle')
        .attr('class', 'arc-node')
        .attr('cx', d => x(d))
        .attr('cy', 0)
        .attr('r', 0)
        .attr('fill', '#1e293b')
        .transition()
        .duration(650)
        .attr('r', 9);

    // add text labels beneath each node point
    g.selectAll('.arc-label')
        .data(nodes)
        .enter()
        .append('text')
        .attr('class', 'arc-label')
        .attr('x', d => x(d))
        .attr('y', 34)
        .attr('text-anchor', 'middle')
        .style('font-size', '13px')
        .style('font-weight', '800')
        .text(d => d);

    svg.append('text')
        .attr('class', 'annotation')
        .attr('x', width - 30)
        .attr('y', 25)
        .attr('text-anchor', 'end')
        .text('Zoom or pan to inspect dense arcs'); // tell user how to use the animation

    // limit zoom to avoid huge arcs from taking over the whole dashboard
    const zoom = d3.zoom()
        .scaleExtent([1, 2])
        .translateExtent([[0, 0], [width, height]])
        .extent([[0, 0], [width, height]])
        .on('zoom', event => {
            const t = event.transform;
            g.attr('transform', `translate(${50 + t.x}, ${285 + t.y}) scale(${t.k})`);
        });

    svg.call(zoom);
}