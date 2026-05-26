// D3 dashboard for the student alcohol dataset.

// Green to red is used for alcohol levels, from low to high.
const alcoholColors = {
    1: '#2E7D32', // level 1 is green
    2: '#8BC34A', // level 2 is light green
    3: '#FBC02D', // level 3 is yellow
    4: '#F57C00', // level 4 is orange
    5: '#C62828' // level 5 is red
};

// Labels for the alcohol use levels.
const alcoholLabels = {
    1: 'Level 1: Very low',
    2: 'Level 2: Low',
    3: 'Level 3: Medium',
    4: 'Level 4: High',
    5: 'Level 5: Very high'
};

// Helper for getting the color of an alcohol level.
function getAlcoholColor(level) {
    const roundedLevel = Math.max(1, Math.min(5, Math.round(level)));

    return alcoholColors[roundedLevel];
}

// Helper for getting the label of an alcohol level.
function getAlcoholLabel(level) {
    return alcoholLabels[level];
}

// Overview bar chart.
class BarChart {
    render(containerId, containerWidth, containerHeight, data) {
        this.data = data;

        const margins = {
            top: Math.max(45, containerHeight * 0.13),
            right: Math.max(135, containerWidth * 0.18),
            bottom: Math.max(65, containerHeight * 0.18),
            left: Math.max(65, containerWidth * 0.12)
        };

        this.width = containerWidth - margins.left - margins.right;

        this.height = containerHeight - margins.top - margins.bottom;

        d3.select(containerId).selectAll('*').remove();

        this.svg = d3.select(containerId).append('svg') // make the SVG
            .attr('width', containerWidth) // set the SVG width
            .attr('height', containerHeight); // set the SVG height

        const g = this.svg.append('g') // make the plot group
            .attr('transform', `translate(${margins.left},${margins.top})`); // move the plot away from the edges

        const xScale = d3.scaleBand()
            .domain(this.data.map(d => d.level))
            .range([0, this.width])
            .padding(0.32);

        const yScale = d3.scaleLinear()
            .domain([0, Math.ceil(d3.max(this.data, d => d.avgAbsences) + 1)])
            .range([this.height, 0])
            .nice();

        const xAxisGroup = g.append('g') // make the x-axis group
            .attr('class', 'x-axis') // add the x-axis class
            .attr('transform', `translate(0,${this.height})`); // move the axis to the bottom

        xAxisGroup.call(d3.axisBottom(xScale).tickFormat(d => d)); // draw the x-axis

        xAxisGroup.style('font-size', Math.max(10, Math.min(13, containerWidth * 0.018)) + 'px');

        const yAxisGroup = g.append('g') // make the y-axis group
            .attr('class', 'y-axis'); // add the y-axis class

        yAxisGroup.call(d3.axisLeft(yScale).ticks(5)); // draw the y-axis

        yAxisGroup.style('font-size', Math.max(10, Math.min(13, containerHeight * 0.025)) + 'px');

        const gridGroup = g.append('g') // make the grid group
            .attr('class', 'grid-lines'); // add the grid class

        gridGroup.call(d3.axisLeft(yScale).ticks(5).tickSize(-this.width).tickFormat('')) // draw the grid lines
            .style('stroke', '#D9D9D9') // make the lines light gray
            .style('stroke-opacity', 0.45); // keep the grid soft

        g.selectAll('.bar') // select the bars
            .data(this.data) // connect the data to the bars
            .enter() // create the missing bars
            .append('rect') // add one rectangle per bar
            .attr('class', 'bar') // give the bars a class name
            .attr('x', d => xScale(d.level)) // set the x position
            .attr('y', d => yScale(d.avgAbsences)) // set where the bar starts
            .attr('width', xScale.bandwidth()) // set the bar width
            .attr('height', d => this.height - yScale(d.avgAbsences)) // set the bar height
            .attr('fill', d => alcoholColors[d.level]) // color by alcohol level
            .attr('stroke', '#2C3E50') // add a dark outline
            .attr('stroke-width', 0.7) // keep the outline thin
            .style('opacity', 0.9); // slightly round the bars

        g.selectAll('.bar-label') // select the labels
            .data(this.data) // use the same data as the bars
            .enter() // create the missing labels
            .append('text') // add text labels
            .attr('class', 'bar-label') // give labels a class name
            .attr('text-anchor', 'middle') // center labels above the bars
            .attr('x', d => xScale(d.level) + xScale.bandwidth() / 2) // line labels up with the bars
            .attr('y', d => yScale(d.avgAbsences) - 6) // place the label above the bar
            .style('font-size', Math.max(10, Math.min(14, containerWidth * 0.018)) + 'px') // set the label size
            .style('font-weight', 'bold') // make the values easy to see
            .style('fill', '#2C3E50') // use the same dark text color
            .text(d => d.avgAbsences.toFixed(1)); // show average absences

        g.selectAll('.count-label') // select the count labels
            .data(this.data) // connect the data to the bars
            .enter() // create the count labels
            .append('text') // add the count text
            .attr('class', 'count-label') // give count labels a class
            .attr('text-anchor', 'middle') // center the count labels
            .attr('x', d => xScale(d.level) + xScale.bandwidth() / 2) // line up with the bar center
            .attr('y', this.height + 32) // place it below the x-axis
            .style('font-size', Math.max(8, Math.min(10, containerWidth * 0.014)) + 'px') // keep it small
            .style('fill', '#666666') // use soft gray
            .text(d => `n=${d.count}`); // show the number of students

        this.svg.append('text') // add x-axis label text
            .attr('class', 'x-axis-label') // give the label a class
            .attr('text-anchor', 'middle') // center the label
            .attr('x', margins.left + this.width / 2) // center it under the plot
            .attr('y', containerHeight - 8) // place it near the bottom
            .style('font-size', Math.max(11, containerWidth * 0.018) + 'px') // set the label size
            .style('font-weight', '600') // make the label bold
            .style('fill', '#2C3E50') // use the dashboard text color
            .text('Workday Alcohol Consumption Level (1 = very low, 5 = very high)'); // write the label text

        this.svg.append('text') // add y-axis label text
            .attr('class', 'y-axis-label') // give the label a class
            .attr('text-anchor', 'middle') // center the rotated label
            .attr('transform', 'rotate(-90)') // rotate the label vertically
            .attr('x', -(margins.top + this.height / 2)) // set the rotated x position
            .attr('y', 15) // set the rotated y position
            .style('font-size', Math.max(11, containerHeight * 0.025) + 'px') // set the label size
            .style('font-weight', '600') // make the label bold
            .style('fill', '#2C3E50') // use the dashboard text color
            .text('Average Number of Absences'); // write the label text

        this.svg.append('text') // add the overview note
            .attr('class', 'chart-note') // give the note a class
            .attr('text-anchor', 'middle') // center the note
            .attr('x', containerWidth / 2) // center it across the SVG
            .attr('y', 18) // place it near the top
            .style('font-size', Math.max(9, Math.min(12, containerWidth * 0.014)) + 'px') // set note size
            .style('fill', '#666666') // make the note soft gray
            .text('Overview: bars show average absences; colors move from low alcohol use to high alcohol use.'); // write the note

        this.addLegend(containerWidth, margins);
    }

    addLegend(containerWidth, margins) {
        const legend = this.svg.append('g') // add legend group
            .attr('class', 'legend') // give legend a class
            .attr('transform', `translate(${margins.left + this.width + 18}, ${margins.top})`); // move legend

        legend.append('text') // add legend title
            .attr('x', 0) // set title x
            .attr('y', 0) // set title y
            .style('font-size', Math.max(9, Math.min(11, containerWidth * 0.014)) + 'px') // set title size
            .style('font-weight', '600') // make title bold
            .style('fill', '#2C3E50') // use the dashboard text color
            .text('Alcohol level'); // write title

        [1, 2, 3, 4, 5].forEach((level, i) => {
            const row = legend.append('g') // add legend row group
                .attr('transform', `translate(0, ${18 + i * 18})`); // stack rows vertically

            row.append('rect') // add legend color square
                .attr('width', 12) // set square width
                .attr('height', 12) // set square height
                .attr('fill', alcoholColors[level]) // use alcohol level color
                .attr('stroke', '#2C3E50') // add outline
                .attr('stroke-width', 0.4); // keep outline thin

            row.append('text') // add legend label
                .attr('x', 18) // place text after square
                .attr('y', 10) // vertically align text
                .style('font-size', Math.max(8, Math.min(10, containerWidth * 0.012)) + 'px') // set text size
                .style('fill', '#2C3E50') // use the dashboard text color
                .text(getAlcoholLabel(level)); // write label
        });
    }
}

// Heatmap focus view.
class HeatMap {
    render(containerId, containerWidth, containerHeight, data) {
        this.data = data;

        const margins = {
            top: Math.max(45, containerHeight * 0.13),
            right: Math.max(155, containerWidth * 0.2),
            bottom: Math.max(65, containerHeight * 0.18),
            left: Math.max(85, containerWidth * 0.15)
        };

        this.width = containerWidth - margins.left - margins.right;

        this.height = containerHeight - margins.top - margins.bottom;

        d3.select(containerId).selectAll('*').remove();

        this.svg = d3.select(containerId).append('svg') // make heatmap SVG
            .attr('width', containerWidth) // set the SVG width
            .attr('height', containerHeight); // set the SVG height

        const g = this.svg.append('g') // make heatmap plot group
            .attr('transform', `translate(${margins.left},${margins.top})`); // move plot into margins

        const absenceBins = ['0', '1-2', '3-5', '6-10', '11-20', '21+'];

        const gradeBands = ['0-4', '5-8', '9-12', '13-16', '17-20'];

        const maxCount = d3.max(this.data, d => d.count);

        const xScale = d3.scaleBand()
            .domain(absenceBins)
            .range([0, this.width])
            .padding(0.04);

        const yScale = d3.scaleBand()
            .domain(gradeBands)
            .range([this.height, 0])
            .padding(0.04);

        const colorScale = d3.scaleLinear()
            .domain([0, maxCount])
            .range(['#F2F7FB', '#1F5C99']);

        const xAxisGroup = g.append('g') // make heatmap x axis group
            .attr('class', 'x-axis') // add x axis class
            .attr('transform', `translate(0,${this.height})`); // move x axis to bottom

        xAxisGroup.call(d3.axisBottom(xScale)); // draw the x-axis

        xAxisGroup.style('font-size', Math.max(9, Math.min(12, containerWidth * 0.016)) + 'px');

        const yAxisGroup = g.append('g') // make heatmap y axis group
            .attr('class', 'y-axis'); // add y axis class

        yAxisGroup.call(d3.axisLeft(yScale)); // draw the y-axis

        yAxisGroup.style('font-size', Math.max(9, Math.min(12, containerHeight * 0.025)) + 'px');

        g.selectAll('.heat-cell') // select heatmap cells
            .data(this.data) // bind binned data
            .enter() // enter missing cells
            .append('rect') // add a rectangle cell
            .attr('class', 'heat-cell') // give cell a class
            .attr('x', d => xScale(d.absenceBin)) // set cell x position
            .attr('y', d => yScale(d.gradeBand)) // set cell y position
            .attr('width', xScale.bandwidth()) // set cell width
            .attr('height', yScale.bandwidth()) // set cell height
            .attr('fill', d => d.count === 0 ? '#F1F1F1' : colorScale(d.count)) // color by student count
            .attr('stroke', '#FFFFFF') // add white line between cells
            .attr('stroke-width', 1) // keep cell border thin
            .style('opacity', d => d.count === 0 ? 0.5 : 0.95); // fade empty cells

        g.selectAll('.cell-count') // select cell count labels
            .data(this.data) // bind binned data
            .enter() // create the missing labels
            .append('text') // add the count text
            .attr('class', 'cell-count') // give count label a class
            .attr('text-anchor', 'middle') // center count label
            .attr('x', d => xScale(d.absenceBin) + xScale.bandwidth() / 2) // center in cell horizontally
            .attr('y', d => yScale(d.gradeBand) + yScale.bandwidth() / 2 + 4) // center in cell vertically
            .style('font-size', Math.max(9, Math.min(13, containerWidth * 0.017)) + 'px') // set count size
            .style('font-weight', '600') // make count bold
            .style('fill', d => d.count > maxCount * 0.55 ? '#FFFFFF' : '#1F2933') // use readable text color
            .text(d => d.count === 0 ? '' : d.count); // show count only if students exist

        this.svg.append('text') // add heatmap x label
            .attr('class', 'x-axis-label') // give the label a class
            .attr('text-anchor', 'middle') // center the label
            .attr('x', margins.left + this.width / 2) // center it under the plot
            .attr('y', containerHeight - 8) // place at bottom
            .style('font-size', Math.max(11, containerWidth * 0.018) + 'px') // set the label size
            .style('font-weight', '600') // make the label bold
            .style('fill', '#2C3E50') // use the dashboard text color
            .text('Number of School Absences'); // write label

        this.svg.append('text') // add heatmap y label
            .attr('class', 'y-axis-label') // give the label a class
            .attr('text-anchor', 'middle') // center rotated text
            .attr('transform', 'rotate(-90)') // rotate label
            .attr('x', -(margins.top + this.height / 2)) // set rotated x
            .attr('y', 18) // set rotated y
            .style('font-size', Math.max(11, containerHeight * 0.025) + 'px') // set the label size
            .style('font-weight', '600') // make the label bold
            .style('fill', '#2C3E50') // use the dashboard text color
            .text('Final Math Grade Band'); // write label

        this.svg.append('text') // add heatmap note
            .attr('class', 'chart-note') // give the note a class
            .attr('text-anchor', 'middle') // center note
            .attr('x', containerWidth / 2) // center note across chart
            .attr('y', 18) // place it near the top
            .style('font-size', Math.max(9, Math.min(12, containerWidth * 0.014)) + 'px') // set note size
            .style('fill', '#666666') // use soft gray
            .text('Focus: darker cells show where more students are concentrated; numbers show exact student counts.'); // write the note

        this.addLegend(containerWidth, containerHeight, margins, colorScale, maxCount);
    }

    addLegend(containerWidth, containerHeight, margins, colorScale, maxCount) {
        const legend = this.svg.append('g') // make heatmap legend group
            .attr('class', 'legend') // give legend a class
            .attr('transform', `translate(${margins.left + this.width + 20}, ${margins.top})`); // move legend

        legend.append('text') // add legend title
            .attr('x', 0) // set title x
            .attr('y', 0) // set title y
            .style('font-size', Math.max(9, Math.min(11, containerWidth * 0.014)) + 'px') // set title size
            .style('font-weight', '600') // make title bold
            .style('fill', '#2C3E50') // use the dashboard text color
            .text('Students'); // write title

        const countSteps = [0, Math.round(maxCount * 0.25), Math.round(maxCount * 0.5), Math.round(maxCount * 0.75), maxCount];

        countSteps.forEach((count, i) => {
            const row = legend.append('g') // make count row group
                .attr('transform', `translate(0, ${18 + i * 18})`); // stack legend rows

            row.append('rect') // add legend square
                .attr('width', 12) // set square width
                .attr('height', 12) // set square height
                .attr('fill', count === 0 ? '#F1F1F1' : colorScale(count)) // color by count
                .attr('stroke', '#2C3E50') // add border
                .attr('stroke-width', 0.4); // keep border thin

            row.append('text') // add legend text
                .attr('x', 18) // place text after square
                .attr('y', 10) // align text vertically
                .style('font-size', Math.max(8, Math.min(10, containerWidth * 0.012)) + 'px') // set text size
                .style('fill', '#2C3E50') // use the dashboard text color
                .text(count); // show count value
        });

        legend.append('text') // add color explanation
            .attr('x', 0) // set note x
            .attr('y', 122) // place under color steps
            .style('font-size', Math.max(8, Math.min(10, containerWidth * 0.012)) + 'px') // set note size
            .style('fill', '#666666') // use soft gray
            .text('Darker = more students'); // write the note
    }
}

// Parallel coordinates chart for the lifestyle profile.
class ParallelCoordinates {
    render(containerId, containerWidth, containerHeight, data) {
        this.data = data;

        const margins = {
            top: Math.max(78, containerHeight * 0.22),
            right: Math.max(40, containerWidth * 0.04),
            bottom: Math.max(85, containerHeight * 0.24),
            left: Math.max(50, containerWidth * 0.04)
        };

        this.width = containerWidth - margins.left - margins.right;

        this.height = containerHeight - margins.top - margins.bottom;

        d3.select(containerId).selectAll('*').remove();

        this.svg = d3.select(containerId).append('svg') // make parallel chart SVG
            .attr('width', containerWidth) // set the SVG width
            .attr('height', containerHeight); // set the SVG height

        const g = this.svg.append('g') // make main plot group
            .attr('transform', `translate(${margins.left},${margins.top})`); // move plot into margins

        const dimensions = ['studytime', 'absences', 'failures', 'health', 'famrel', 'G3'];

        const dimensionLabels = {
            studytime: 'Study Time',
            absences: 'Absences',
            failures: 'Failures',
            health: 'Health',
            famrel: 'Family Relations',
            G3: 'Final Grade'
        };

        const dimensionNotes = {
            studytime: 'higher = more study',
            absences: 'higher = more absent',
            failures: 'higher = more failures',
            health: 'higher = better health',
            famrel: 'higher = better relation',
            G3: 'higher = better grade'
        };

        const ranges = {
            studytime: [1, 4],
            absences: [0, 12],
            failures: [0, 1],
            health: [1, 5],
            famrel: [1, 5],
            G3: [0, 20]
        };

        function normalizeValue(dim, value) {
            const [minValue, maxValue] = ranges[dim];

            const normalized = ((value - minValue) / (maxValue - minValue)) * 100;

            return Math.max(0, Math.min(100, normalized));
        }

        const averageData = [1, 2, 3, 4, 5].map(level => {
            const groupData = this.data.filter(d => d.Dalc === level);

            const avgPoint = { level: level, count: groupData.length };

            dimensions.forEach(dim => {
                avgPoint[dim] = d3.mean(groupData, d => d[dim]);
            });

            return avgPoint;
        });

        const yScale = d3.scaleLinear()
            .domain([0, 100])
            .range([this.height, 0]);

        const xScale = d3.scalePoint()
            .domain(dimensions)
            .range([0, this.width])
            .padding(0.12);

        const lineGenerator = d3.line();

        const createPath = d => {
            const points = dimensions.map(dim => [xScale(dim), yScale(normalizeValue(dim, d[dim]))]);

            return lineGenerator(points);
        };

        const axes = g.selectAll('.dimension') // select dimension axes
            .data(dimensions) // bind dimension names
            .enter() // enter missing axes
            .append('g') // add axis group
            .attr('class', 'dimension') // give axis group a class
            .attr('transform', d => `translate(${xScale(d)},0)`); // move each axis into position

        axes.append('g') // add inner axis group
            .each(function () { // loop through each axis group
                d3.select(this).call(d3.axisLeft(yScale).ticks(4)); // draw normalized axis
            })
            .style('font-size', Math.max(8, Math.min(11, containerWidth * 0.012)) + 'px'); // style axis text

        axes.append('text') // add axis label text
            .attr('class', 'axis-label') // give the label a class
            .attr('text-anchor', 'middle') // center the label
            .attr('y', this.height + 28) // place label below axis
            .style('font-size', Math.max(10, Math.min(13, containerWidth * 0.014)) + 'px') // set the label size
            .style('font-weight', '600') // make the label bold
            .style('fill', '#2C3E50') // use the dashboard text color
            .text(d => dimensionLabels[d]); // write readable label

        axes.append('text') // add axis explanation text
            .attr('class', 'axis-explanation') // give explanation a class
            .attr('text-anchor', 'middle') // center explanation
            .attr('y', this.height + 47) // place below axis label
            .style('font-size', Math.max(7, Math.min(9, containerWidth * 0.01)) + 'px') // keep explanation small
            .style('fill', '#666666') // use soft gray
            .text(d => dimensionNotes[d]); // write explanation

        g.append('g') // add group for profile lines
            .attr('class', 'profile-lines') // give line group a class
            .selectAll('path') // select paths that do not exist yet
            .data(averageData) // bind average profile data
            .enter() // enter missing paths
            .append('path') // add a path for each alcohol level
            .attr('class', 'profile-line') // give path a class
            .attr('d', createPath) // set line path
            .style('fill', 'none') // do not fill line
            .style('stroke', d => alcoholColors[d.level]) // color by alcohol level
            .style('stroke-width', 3) // make line visible
            .style('opacity', 0.85); // keep overlapping lines visible

        averageData.forEach(row => {
            g.selectAll(`.dot-level-${row.level}`) // select dots for this level
                .data(dimensions) // bind dimensions
                .enter() // enter missing dots
                .append('circle') // add a circle dot
                .attr('class', `dot-level-${row.level}`) // give dot a level class
                .attr('cx', dim => xScale(dim)) // set dot x position
                .attr('cy', dim => yScale(normalizeValue(dim, row[dim]))) // set dot y position
                .attr('r', 3.5) // set dot radius
                .attr('fill', alcoholColors[row.level]) // color dot by alcohol level
                .attr('stroke', '#FFFFFF') // add white outline
                .attr('stroke-width', 1); // keep outline thin
        });

        this.svg.append('text') // add parallel chart note
            .attr('class', 'chart-note') // give the note a class
            .attr('text-anchor', 'middle') // center note
            .attr('x', containerWidth / 2) // center it across the SVG
            .attr('y', containerHeight - 8) // place it near the bottom
            .style('font-size', Math.max(9, Math.min(12, containerWidth * 0.012)) + 'px') // set note size
            .style('fill', '#666666') // use soft gray
            .text('Each line is one alcohol level. Axes are normalized to 0-100 so different variables can be compared without scale confusion.'); // write the note

        this.addLegend(containerWidth, margins, averageData);
    }

    addLegend(containerWidth, margins, averageData) {
        const legend = this.svg.append('g') // make legend group
            .attr('class', 'legend') // give legend a class
            .attr('transform', `translate(${margins.left}, 12)`); // move legend to top-left

        legend.append('text') // add legend title text
            .attr('x', 0) // set title x
            .attr('y', 16) // set title y
            .style('font-size', Math.max(10, Math.min(13, containerWidth * 0.014)) + 'px') // set title size
            .style('font-weight', '600') // make title bold
            .style('fill', '#2C3E50') // use the dashboard text color
            .text('Workday Alcohol Level'); // write title

        averageData.forEach((group, i) => {
            const row = legend.append('g') // make legend row
                .attr('transform', `translate(${i * 165}, 34)`); // place rows horizontally

            row.append('line') // add legend line
                .attr('x1', 0) // line start x
                .attr('x2', 24) // line end x
                .attr('y1', 8) // line start y
                .attr('y2', 8) // line end y
                .attr('stroke', alcoholColors[group.level]) // color by alcohol level
                .attr('stroke-width', 4); // match chart line thickness

            row.append('text') // add legend label
                .attr('x', 30) // place text after line
                .attr('y', 12) // align text vertically
                .style('font-size', Math.max(8, Math.min(10, containerWidth * 0.011)) + 'px') // set the label size
                .style('fill', '#2C3E50') // use the dashboard text color
                .text(`Level ${group.level} (n=${group.count})`); // show level and count
        });
    }
}

// Chart objects are saved so the page can redraw on resize.
let charts = {};

// Keep the dataset after loading it once.
let rawData = null;

// Load the CSV data.
async function loadData() {
    if (!rawData) {
        try {
            rawData = await d3.csv('data/student-mat.csv');
        } catch (error) {
            console.error('Error loading CSV data:', error);
        }
    }

    return rawData;
}

// Prepare data for the bar chart.
function processChart1Data(data) {
    return [1, 2, 3, 4, 5].map(level => {
        const groupData = data.filter(d => +d.Dalc === level);

        return {
            level: level,
            avgAbsences: d3.mean(groupData, d => +d.absences),
            count: groupData.length
        };
    });
}

// Group absence values into readable bins.
function getAbsenceBin(absences) {
    if (absences === 0) return '0';

    if (absences <= 2) return '1-2';

    if (absences <= 5) return '3-5';

    if (absences <= 10) return '6-10';

    if (absences <= 20) return '11-20';

    return '21+';
}

// Group final grades into grade bands.
function getGradeBand(grade) {
    if (grade <= 4) return '0-4';

    if (grade <= 8) return '5-8';

    if (grade <= 12) return '9-12';

    if (grade <= 16) return '13-16';

    return '17-20';
}

// Prepare data for the heatmap.
function processChart2Data(data) {
    const absenceBins = ['0', '1-2', '3-5', '6-10', '11-20', '21+'];

    const gradeBands = ['0-4', '5-8', '9-12', '13-16', '17-20'];

    const binnedRows = data.map(d => ({
        absenceBin: getAbsenceBin(+d.absences),
        gradeBand: getGradeBand(+d.G3),
        alcoholLevel: +d.Dalc
    })).filter(d => !isNaN(d.alcoholLevel));

    const cells = [];

    absenceBins.forEach(absenceBin => {
        gradeBands.forEach(gradeBand => {
            const cellStudents = binnedRows.filter(d => d.absenceBin === absenceBin && d.gradeBand === gradeBand);

            cells.push({
                absenceBin: absenceBin,
                gradeBand: gradeBand,
                count: cellStudents.length
            });
        });
    });

    return cells;
}

// Prepare data for the parallel coordinates chart.
function processChart3Data(data) {
    return data.map(d => ({
        studytime: +d.studytime,
        absences: +d.absences,
        failures: +d.failures,
        health: +d.health,
        famrel: +d.famrel,
        G3: +d.G3,
        Dalc: +d.Dalc
    })).filter(d => !isNaN(d.studytime) && !isNaN(d.absences) && !isNaN(d.failures) && !isNaN(d.health) && !isNaN(d.famrel) && !isNaN(d.G3) && !isNaN(d.Dalc));
}

// Main function for loading data and drawing the dashboard.
async function initializeDashboard() {
    const container1 = document.getElementById('chart-1');

    const container2 = document.getElementById('chart-2');

    const container3 = document.getElementById('chart-3');

    d3.select('#chart-1').selectAll('*').remove();

    d3.select('#chart-2').selectAll('*').remove();

    d3.select('#chart-3').selectAll('*').remove();

    const data = await loadData();

    if (!data) return;

    const chart1Data = processChart1Data(data);

    const chart2Data = processChart2Data(data);

    const chart3Data = processChart3Data(data);

    if (!charts.chart1) charts.chart1 = new BarChart();

    charts.chart1.render('#chart-1', container1.clientWidth, container1.clientHeight, chart1Data);

    if (!charts.chart2) charts.chart2 = new HeatMap();

    charts.chart2.render('#chart-2', container2.clientWidth, container2.clientHeight, chart2Data);

    if (!charts.chart3) charts.chart3 = new ParallelCoordinates();

    charts.chart3.render('#chart-3', container3.clientWidth, container3.clientHeight, chart3Data);
}

// Debounce helps avoid too many redraws while resizing.
function debounce(func, wait) {
    let timeout;

    return function executedFunction(...args) {
        const context = this;

        const later = () => {
            timeout = null;

            func.apply(context, args);
        };

        clearTimeout(timeout);

        timeout = setTimeout(later, wait);
    };
}

// Redraw the dashboard after resizing.
const handleResize = debounce(() => { initializeDashboard(); }, 250);

// Redraw when the browser window changes size.
window.addEventListener('resize', handleResize);

// Draw the dashboard when the page loads.
document.addEventListener('DOMContentLoaded', () => { initializeDashboard(); });
