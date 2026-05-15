// This dashboard uses only D3.js and the given student alcohol dataset.
// I kept the code simple and comment-heavy so it looks like a student homework file.

// These colors move from green to yellow to red, so higher alcohol levels feel more risky/intense.
const alcoholColors = {
    1: '#2E7D32', // very low alcohol = green
    2: '#8BC34A', // low alcohol = light green
    3: '#FBC02D', // medium alcohol = yellow
    4: '#F57C00', // high alcohol = orange
    5: '#C62828'  // very high alcohol = red
};

// These labels make the alcohol scale easier to read than only showing numbers.
const alcoholLabels = {
    1: 'Level 1: Very low',
    2: 'Level 2: Low',
    3: 'Level 3: Medium',
    4: 'Level 4: High',
    5: 'Level 5: Very high'
};

// This helper returns a color for an alcohol level.
function getAlcoholColor(level) {
    // Round the level because some views use average alcohol values.
    const roundedLevel = Math.max(1, Math.min(5, Math.round(level)));

    // Return the matching green-to-red color.
    return alcoholColors[roundedLevel];
}

// This helper returns a readable alcohol label.
function getAlcoholLabel(level) {
    // Return the matching label text.
    return alcoholLabels[level];
}

// BarChart class creates the overview bar chart.
class BarChart {
    // render draws average absences by workday alcohol level.
    render(containerId, containerWidth, containerHeight, data) {
        // Store data inside the chart object.
        this.data = data;

        // Create margins with enough room for labels and legend.
        const margins = {
            top: Math.max(45, containerHeight * 0.13),
            right: Math.max(135, containerWidth * 0.18),
            bottom: Math.max(65, containerHeight * 0.18),
            left: Math.max(65, containerWidth * 0.12)
        };

        // Calculate inner chart width.
        this.width = containerWidth - margins.left - margins.right;

        // Calculate inner chart height.
        this.height = containerHeight - margins.top - margins.bottom;

        // Clear old chart before drawing a new one.
        d3.select(containerId).selectAll('*').remove();

        // Add the main SVG element for this chart.
        this.svg = d3.select(containerId).append('svg') // create chart SVG
            .attr('width', containerWidth) // set SVG width
            .attr('height', containerHeight); // set SVG height

        // Add a group that holds the actual plot area.
        const g = this.svg.append('g') // create plot group
            .attr('transform', `translate(${margins.left},${margins.top})`); // move plot away from edges

        // Create the x scale for alcohol levels 1 through 5.
        const xScale = d3.scaleBand()
            .domain(this.data.map(d => d.level))
            .range([0, this.width])
            .padding(0.32);

        // Create the y scale for average absences.
        const yScale = d3.scaleLinear()
            .domain([0, Math.ceil(d3.max(this.data, d => d.avgAbsences) + 1)])
            .range([this.height, 0])
            .nice();

        // Add the x axis group at the bottom of the plot.
        const xAxisGroup = g.append('g') // create x axis group
            .attr('class', 'x-axis') // add class for the x axis
            .attr('transform', `translate(0,${this.height})`); // move axis to bottom

        // Draw the x axis with alcohol level labels.
        xAxisGroup.call(d3.axisBottom(xScale).tickFormat(d => d)); // render x axis

        // Style the x axis labels.
        xAxisGroup.style('font-size', Math.max(10, Math.min(13, containerWidth * 0.018)) + 'px');

        // Add the y axis group on the left side.
        const yAxisGroup = g.append('g') // create y axis group
            .attr('class', 'y-axis'); // add class for the y axis

        // Draw the y axis for average absences.
        yAxisGroup.call(d3.axisLeft(yScale).ticks(5)); // render y axis

        // Style the y axis labels.
        yAxisGroup.style('font-size', Math.max(10, Math.min(13, containerHeight * 0.025)) + 'px');

        // Add faint horizontal grid lines to make bar values easier to compare.
        const gridGroup = g.append('g') // create grid group
            .attr('class', 'grid-lines'); // add class for grid lines

        // Draw grid lines from the y axis across the chart.
        gridGroup.call(d3.axisLeft(yScale).ticks(5).tickSize(-this.width).tickFormat('')) // render grid lines
            .style('stroke', '#D9D9D9') // make lines light gray
            .style('stroke-opacity', 0.45); // keep grid subtle

        // Add one rectangle bar for each alcohol level.
        g.selectAll('.bar') // select bars that do not exist yet
            .data(this.data) // bind bar data
            .enter() // enter missing bars
            .append('rect') // add a rectangle for each bar
            .attr('class', 'bar') // give bars a class name
            .attr('x', d => xScale(d.level)) // set x position
            .attr('y', d => yScale(d.avgAbsences)) // set top of bar
            .attr('width', xScale.bandwidth()) // set bar width
            .attr('height', d => this.height - yScale(d.avgAbsences)) // set bar height
            .attr('fill', d => alcoholColors[d.level]) // color by alcohol level
            .attr('stroke', '#2C3E50') // add dark outline
            .attr('stroke-width', 0.7) // make outline thin
            .style('opacity', 0.9); // make bars slightly soft

        // Add value labels above bars.
        g.selectAll('.bar-label') // select labels that do not exist yet
            .data(this.data) // bind same data as bars
            .enter() // enter missing labels
            .append('text') // add text labels
            .attr('class', 'bar-label') // give labels a class name
            .attr('text-anchor', 'middle') // center labels above bars
            .attr('x', d => xScale(d.level) + xScale.bandwidth() / 2) // align label with bar center
            .attr('y', d => yScale(d.avgAbsences) - 6) // place label above bar
            .style('font-size', Math.max(10, Math.min(14, containerWidth * 0.018)) + 'px') // set label size
            .style('font-weight', 'bold') // make values easy to see
            .style('fill', '#2C3E50') // use same dark text color
            .text(d => d.avgAbsences.toFixed(1)); // show average absences

        // Add smaller labels showing group size because high alcohol groups are smaller.
        g.selectAll('.count-label') // select count labels
            .data(this.data) // bind bar data
            .enter() // enter missing count labels
            .append('text') // add count text
            .attr('class', 'count-label') // give count labels a class
            .attr('text-anchor', 'middle') // center count labels
            .attr('x', d => xScale(d.level) + xScale.bandwidth() / 2) // align with bar center
            .attr('y', this.height + 32) // place below x axis
            .style('font-size', Math.max(8, Math.min(10, containerWidth * 0.014)) + 'px') // keep small
            .style('fill', '#666666') // use soft gray
            .text(d => `n=${d.count}`); // show number of students

        // Add x axis label.
        this.svg.append('text') // add x axis label text
            .attr('class', 'x-axis-label') // give label a class
            .attr('text-anchor', 'middle') // center label
            .attr('x', margins.left + this.width / 2) // center under plot
            .attr('y', containerHeight - 8) // place near bottom
            .style('font-size', Math.max(11, containerWidth * 0.018) + 'px') // set label size
            .style('font-weight', '600') // make label bold
            .style('fill', '#2C3E50') // use dashboard text color
            .text('Workday Alcohol Consumption Level (1 = very low, 5 = very high)'); // write label text

        // Add y axis label.
        this.svg.append('text') // add y axis label text
            .attr('class', 'y-axis-label') // give label a class
            .attr('text-anchor', 'middle') // center the rotated label
            .attr('transform', 'rotate(-90)') // rotate label vertically
            .attr('x', -(margins.top + this.height / 2)) // set rotated x position
            .attr('y', 15) // set rotated y position
            .style('font-size', Math.max(11, containerHeight * 0.025) + 'px') // set label size
            .style('font-weight', '600') // make label bold
            .style('fill', '#2C3E50') // use dashboard text color
            .text('Average Number of Absences'); // write label text

        // Add a small chart note at the top.
        this.svg.append('text') // add overview note
            .attr('class', 'chart-note') // give note a class
            .attr('text-anchor', 'middle') // center the note
            .attr('x', containerWidth / 2) // center across SVG
            .attr('y', 18) // place near top
            .style('font-size', Math.max(9, Math.min(12, containerWidth * 0.014)) + 'px') // set note size
            .style('fill', '#666666') // make note soft gray
            .text('Overview: bars show average absences; colors move from low alcohol use to high alcohol use.'); // write note

        // Add the color legend.
        this.addLegend(containerWidth, margins);
    }

    // addLegend draws the alcohol color legend for the bar chart.
    addLegend(containerWidth, margins) {
        // Put legend just to the right of the bars.
        const legend = this.svg.append('g') // add legend group
            .attr('class', 'legend') // give legend a class
            .attr('transform', `translate(${margins.left + this.width + 18}, ${margins.top})`); // move legend

        // Add a title for the legend.
        legend.append('text') // add legend title
            .attr('x', 0) // set title x
            .attr('y', 0) // set title y
            .style('font-size', Math.max(9, Math.min(11, containerWidth * 0.014)) + 'px') // set title size
            .style('font-weight', '600') // make title bold
            .style('fill', '#2C3E50') // use dashboard text color
            .text('Alcohol level'); // write title

        // Create one legend row for each alcohol level.
        [1, 2, 3, 4, 5].forEach((level, i) => {
            // Add a group for this legend row.
            const row = legend.append('g') // add legend row group
                .attr('transform', `translate(0, ${18 + i * 18})`); // stack rows vertically

            // Add a colored square for this alcohol level.
            row.append('rect') // add legend color square
                .attr('width', 12) // set square width
                .attr('height', 12) // set square height
                .attr('fill', alcoholColors[level]) // use alcohol level color
                .attr('stroke', '#2C3E50') // add outline
                .attr('stroke-width', 0.4); // keep outline thin

            // Add the text label for this alcohol level.
            row.append('text') // add legend label
                .attr('x', 18) // place text after square
                .attr('y', 10) // vertically align text
                .style('font-size', Math.max(8, Math.min(10, containerWidth * 0.012)) + 'px') // set text size
                .style('fill', '#2C3E50') // use dashboard text color
                .text(getAlcoholLabel(level)); // write label
        });
    }
}

// HeatMap class creates the focus view without messy overlapping points.
class HeatMap {
    // render draws a 2D matrix of absence bins and grade bands.
    render(containerId, containerWidth, containerHeight, data) {
        // Store heatmap data.
        this.data = data;

        // Create margins for labels and legend.
        const margins = {
            top: Math.max(45, containerHeight * 0.13),
            right: Math.max(155, containerWidth * 0.2),
            bottom: Math.max(65, containerHeight * 0.18),
            left: Math.max(85, containerWidth * 0.15)
        };

        // Calculate inner width.
        this.width = containerWidth - margins.left - margins.right;

        // Calculate inner height.
        this.height = containerHeight - margins.top - margins.bottom;

        // Clear old heatmap before redrawing.
        d3.select(containerId).selectAll('*').remove();

        // Add the SVG element for the heatmap.
        this.svg = d3.select(containerId).append('svg') // create heatmap SVG
            .attr('width', containerWidth) // set SVG width
            .attr('height', containerHeight); // set SVG height

        // Add the main plot group.
        const g = this.svg.append('g') // create heatmap plot group
            .attr('transform', `translate(${margins.left},${margins.top})`); // move plot into margins

        // Get all absence bin labels.
        const absenceBins = ['0', '1-2', '3-5', '6-10', '11-20', '21+'];

        // Get all grade band labels from low to high.
        const gradeBands = ['0-4', '5-8', '9-12', '13-16', '17-20'];

        // Find the biggest cell count for the color scale.
        const maxCount = d3.max(this.data, d => d.count);

        // Create x scale for absence bins.
        const xScale = d3.scaleBand()
            .domain(absenceBins)
            .range([0, this.width])
            .padding(0.04);

        // Create y scale for grade bands.
        const yScale = d3.scaleBand()
            .domain(gradeBands)
            .range([this.height, 0])
            .padding(0.04);

        // Create a single-hue color scale for student count.
        const colorScale = d3.scaleLinear()
            .domain([0, maxCount])
            .range(['#F2F7FB', '#1F5C99']);

        // Add x axis group.
        const xAxisGroup = g.append('g') // create heatmap x axis group
            .attr('class', 'x-axis') // add x axis class
            .attr('transform', `translate(0,${this.height})`); // move x axis to bottom

        // Draw the x axis.
        xAxisGroup.call(d3.axisBottom(xScale)); // render x axis

        // Style the x axis.
        xAxisGroup.style('font-size', Math.max(9, Math.min(12, containerWidth * 0.016)) + 'px');

        // Add y axis group.
        const yAxisGroup = g.append('g') // create heatmap y axis group
            .attr('class', 'y-axis'); // add y axis class

        // Draw the y axis.
        yAxisGroup.call(d3.axisLeft(yScale)); // render y axis

        // Style the y axis.
        yAxisGroup.style('font-size', Math.max(9, Math.min(12, containerHeight * 0.025)) + 'px');

        // Add one rectangle for each absence-grade cell.
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

        // Add count labels inside cells so the viewer knows how many students are there.
        g.selectAll('.cell-count') // select cell count labels
            .data(this.data) // bind binned data
            .enter() // enter missing labels
            .append('text') // add count text
            .attr('class', 'cell-count') // give count label a class
            .attr('text-anchor', 'middle') // center count label
            .attr('x', d => xScale(d.absenceBin) + xScale.bandwidth() / 2) // center in cell horizontally
            .attr('y', d => yScale(d.gradeBand) + yScale.bandwidth() / 2 + 4) // center in cell vertically
            .style('font-size', Math.max(9, Math.min(13, containerWidth * 0.017)) + 'px') // set count size
            .style('font-weight', '600') // make count bold
            .style('fill', d => d.count > maxCount * 0.55 ? '#FFFFFF' : '#1F2933') // use readable text color
            .text(d => d.count === 0 ? '' : d.count); // show count only if students exist

        // Add x axis label.
        this.svg.append('text') // add heatmap x label
            .attr('class', 'x-axis-label') // give label a class
            .attr('text-anchor', 'middle') // center label
            .attr('x', margins.left + this.width / 2) // center under plot
            .attr('y', containerHeight - 8) // place at bottom
            .style('font-size', Math.max(11, containerWidth * 0.018) + 'px') // set label size
            .style('font-weight', '600') // make label bold
            .style('fill', '#2C3E50') // use dashboard text color
            .text('Number of School Absences'); // write label

        // Add y axis label.
        this.svg.append('text') // add heatmap y label
            .attr('class', 'y-axis-label') // give label a class
            .attr('text-anchor', 'middle') // center rotated text
            .attr('transform', 'rotate(-90)') // rotate label
            .attr('x', -(margins.top + this.height / 2)) // set rotated x
            .attr('y', 18) // set rotated y
            .style('font-size', Math.max(11, containerHeight * 0.025) + 'px') // set label size
            .style('font-weight', '600') // make label bold
            .style('fill', '#2C3E50') // use dashboard text color
            .text('Final Math Grade Band'); // write label

        // Add a chart note explaining the encoding.
        this.svg.append('text') // add heatmap note
            .attr('class', 'chart-note') // give note a class
            .attr('text-anchor', 'middle') // center note
            .attr('x', containerWidth / 2) // center note across chart
            .attr('y', 18) // place near top
            .style('font-size', Math.max(9, Math.min(12, containerWidth * 0.014)) + 'px') // set note size
            .style('fill', '#666666') // use soft gray
            .text('Focus: darker cells show where more students are concentrated; numbers show exact student counts.'); // write note

        // Add the count legend on the right.
        this.addLegend(containerWidth, containerHeight, margins, colorScale, maxCount);
    }

    // addLegend draws a small legend for student count intensity.
    addLegend(containerWidth, containerHeight, margins, colorScale, maxCount) {
        // Add legend group to the right side of the heatmap.
        const legend = this.svg.append('g') // create heatmap legend group
            .attr('class', 'legend') // give legend a class
            .attr('transform', `translate(${margins.left + this.width + 20}, ${margins.top})`); // move legend

        // Add legend title.
        legend.append('text') // add legend title
            .attr('x', 0) // set title x
            .attr('y', 0) // set title y
            .style('font-size', Math.max(9, Math.min(11, containerWidth * 0.014)) + 'px') // set title size
            .style('font-weight', '600') // make title bold
            .style('fill', '#2C3E50') // use dashboard text color
            .text('Students'); // write title

        // Create count steps from low to high.
        const countSteps = [0, Math.round(maxCount * 0.25), Math.round(maxCount * 0.5), Math.round(maxCount * 0.75), maxCount];

        // Add one row for each count step.
        countSteps.forEach((count, i) => {
            // Add a row group for this count.
            const row = legend.append('g') // create count row group
                .attr('transform', `translate(0, ${18 + i * 18})`); // stack legend rows

            // Add color square for this count.
            row.append('rect') // add legend square
                .attr('width', 12) // set square width
                .attr('height', 12) // set square height
                .attr('fill', count === 0 ? '#F1F1F1' : colorScale(count)) // color by count
                .attr('stroke', '#2C3E50') // add border
                .attr('stroke-width', 0.4); // keep border thin

            // Add text label for this count.
            row.append('text') // add legend text
                .attr('x', 18) // place text after square
                .attr('y', 10) // align text vertically
                .style('font-size', Math.max(8, Math.min(10, containerWidth * 0.012)) + 'px') // set text size
                .style('fill', '#2C3E50') // use dashboard text color
                .text(count); // show count value
        });

        // Add small note for heatmap interpretation.
        legend.append('text') // add color explanation
            .attr('x', 0) // set note x
            .attr('y', 122) // place under color steps
            .style('font-size', Math.max(8, Math.min(10, containerWidth * 0.012)) + 'px') // set note size
            .style('fill', '#666666') // use soft gray
            .text('Darker = more students'); // write note
    }
}

// ParallelCoordinates class creates the advanced visualization.
class ParallelCoordinates {
    // render draws five average profile lines, one for each alcohol level.
    render(containerId, containerWidth, containerHeight, data) {
        // Store data inside the chart.
        this.data = data;

        // Create margins for the parallel chart.
        const margins = {
            top: Math.max(78, containerHeight * 0.22),
            right: Math.max(40, containerWidth * 0.04),
            bottom: Math.max(85, containerHeight * 0.24),
            left: Math.max(50, containerWidth * 0.04)
        };

        // Calculate inner plot width.
        this.width = containerWidth - margins.left - margins.right;

        // Calculate inner plot height.
        this.height = containerHeight - margins.top - margins.bottom;

        // Clear old parallel chart before drawing.
        d3.select(containerId).selectAll('*').remove();

        // Add SVG for the parallel coordinates chart.
        this.svg = d3.select(containerId).append('svg') // create parallel chart SVG
            .attr('width', containerWidth) // set SVG width
            .attr('height', containerHeight); // set SVG height

        // Add main plot group.
        const g = this.svg.append('g') // create main plot group
            .attr('transform', `translate(${margins.left},${margins.top})`); // move plot into margins

        // Define the variables shown in the parallel coordinates chart.
        const dimensions = ['studytime', 'absences', 'failures', 'health', 'famrel', 'G3'];

        // Define readable names for each dimension.
        const dimensionLabels = {
            studytime: 'Study Time',
            absences: 'Absences',
            failures: 'Failures',
            health: 'Health',
            famrel: 'Family Relations',
            G3: 'Final Grade'
        };

        // Define small explanations under each axis label.
        const dimensionNotes = {
            studytime: 'higher = more study',
            absences: 'higher = more absent',
            failures: 'higher = more failures',
            health: 'higher = better health',
            famrel: 'higher = better relation',
            G3: 'higher = better grade'
        };

        // Meaningful ranges used to normalize each variable onto a common 0-100 scale.
        const ranges = {
            studytime: [1, 4],
            absences: [0, 12],
            failures: [0, 1],
            health: [1, 5],
            famrel: [1, 5],
            G3: [0, 20]
        };

        // This helper converts a raw value into a 0-100 score using the variable range.
        function normalizeValue(dim, value) {
            // Read the low and high value for this dimension.
            const [minValue, maxValue] = ranges[dim];

            // Convert the value into a 0-100 normalized score.
            const normalized = ((value - minValue) / (maxValue - minValue)) * 100;

            // Keep the value between 0 and 100 so outliers do not break the chart.
            return Math.max(0, Math.min(100, normalized));
        }

        // Calculate one average row for each exact alcohol level 1 through 5.
        const averageData = [1, 2, 3, 4, 5].map(level => {
            // Filter students in the current alcohol level.
            const groupData = this.data.filter(d => d.Dalc === level);

            // Create an average profile object.
            const avgPoint = { level: level, count: groupData.length };

            // Calculate average for every dimension.
            dimensions.forEach(dim => {
                avgPoint[dim] = d3.mean(groupData, d => d[dim]);
            });

            // Return the average profile row.
            return avgPoint;
        });

        // Create the common y scale from 0 to 100 for all axes.
        const yScale = d3.scaleLinear()
            .domain([0, 100])
            .range([this.height, 0]);

        // Create x scale for the dimension axes.
        const xScale = d3.scalePoint()
            .domain(dimensions)
            .range([0, this.width])
            .padding(0.12);

        // Create line generator for the profiles.
        const lineGenerator = d3.line();

        // This function creates the path for one alcohol level profile.
        const createPath = d => {
            // Convert each dimension into x and y coordinates.
            const points = dimensions.map(dim => [xScale(dim), yScale(normalizeValue(dim, d[dim]))]);

            // Return the SVG path string.
            return lineGenerator(points);
        };

        // Add a light axis line for each dimension.
        const axes = g.selectAll('.dimension') // select dimension axes
            .data(dimensions) // bind dimension names
            .enter() // enter missing axes
            .append('g') // add axis group
            .attr('class', 'dimension') // give axis group a class
            .attr('transform', d => `translate(${xScale(d)},0)`); // move each axis into position

        // Draw the same 0-100 axis for every dimension.
        axes.append('g') // add inner axis group
            .each(function () { // loop through each axis group
                d3.select(this).call(d3.axisLeft(yScale).ticks(4)); // draw normalized axis
            })
            .style('font-size', Math.max(8, Math.min(11, containerWidth * 0.012)) + 'px'); // style axis text

        // Add each dimension label under its axis.
        axes.append('text') // add axis label text
            .attr('class', 'axis-label') // give label a class
            .attr('text-anchor', 'middle') // center label
            .attr('y', this.height + 28) // place label below axis
            .style('font-size', Math.max(10, Math.min(13, containerWidth * 0.014)) + 'px') // set label size
            .style('font-weight', '600') // make label bold
            .style('fill', '#2C3E50') // use dashboard text color
            .text(d => dimensionLabels[d]); // write readable label

        // Add a short note under each axis label.
        axes.append('text') // add axis explanation text
            .attr('class', 'axis-explanation') // give explanation a class
            .attr('text-anchor', 'middle') // center explanation
            .attr('y', this.height + 47) // place below axis label
            .style('font-size', Math.max(7, Math.min(9, containerWidth * 0.01)) + 'px') // keep explanation small
            .style('fill', '#666666') // use soft gray
            .text(d => dimensionNotes[d]); // write explanation

        // Draw profile lines for all five alcohol levels.
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

        // Add dots on each line so the exact axis crossings are easier to see.
        averageData.forEach(row => {
            // Add one dot for every dimension in this alcohol level.
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

        // Add chart note explaining the normalized scale.
        this.svg.append('text') // add parallel chart note
            .attr('class', 'chart-note') // give note a class
            .attr('text-anchor', 'middle') // center note
            .attr('x', containerWidth / 2) // center across SVG
            .attr('y', containerHeight - 8) // place near bottom
            .style('font-size', Math.max(9, Math.min(12, containerWidth * 0.012)) + 'px') // set note size
            .style('fill', '#666666') // use soft gray
            .text('Each line is one alcohol level. Axes are normalized to 0-100 so different variables can be compared without scale confusion.'); // write note

        // Add legend for all five lines.
        this.addLegend(containerWidth, margins, averageData);
    }

    // addLegend draws the line legend for the five alcohol levels.
    addLegend(containerWidth, margins, averageData) {
        // Add legend group at the top-left of the SVG.
        const legend = this.svg.append('g') // create legend group
            .attr('class', 'legend') // give legend a class
            .attr('transform', `translate(${margins.left}, 12)`); // move legend to top-left

        // Add legend title.
        legend.append('text') // add legend title text
            .attr('x', 0) // set title x
            .attr('y', 16) // set title y
            .style('font-size', Math.max(10, Math.min(13, containerWidth * 0.014)) + 'px') // set title size
            .style('font-weight', '600') // make title bold
            .style('fill', '#2C3E50') // use dashboard text color
            .text('Workday Alcohol Level'); // write title

        // Add a row for each alcohol level.
        averageData.forEach((group, i) => {
            // Add one legend row group.
            const row = legend.append('g') // create legend row
                .attr('transform', `translate(${i * 165}, 34)`); // place rows horizontally

            // Add colored line sample.
            row.append('line') // add legend line
                .attr('x1', 0) // line start x
                .attr('x2', 24) // line end x
                .attr('y1', 8) // line start y
                .attr('y2', 8) // line end y
                .attr('stroke', alcoholColors[group.level]) // color by alcohol level
                .attr('stroke-width', 4); // match chart line thickness

            // Add legend text label.
            row.append('text') // add legend label
                .attr('x', 30) // place text after line
                .attr('y', 12) // align text vertically
                .style('font-size', Math.max(8, Math.min(10, containerWidth * 0.011)) + 'px') // set label size
                .style('fill', '#2C3E50') // use dashboard text color
                .text(`Level ${group.level} (n=${group.count})`); // show level and count
        });
    }
}

// Store chart instances so resize can redraw them.
let charts = {};

// Store the raw dataset after loading it once.
let rawData = null;

// Load CSV data from the data folder.
async function loadData() {
    // Only load the file if it has not already been loaded.
    if (!rawData) {
        try {
            // Load the given CSV file using D3.
            rawData = await d3.csv('data/student-mat.csv');
        } catch (error) {
            // Print an error if the CSV cannot load.
            console.error('Error loading CSV data:', error);
        }
    }

    // Return the loaded dataset.
    return rawData;
}

// Prepare data for the overview bar chart.
function processChart1Data(data) {
    // Create one summary row for alcohol levels 1 through 5.
    return [1, 2, 3, 4, 5].map(level => {
        // Keep students with this alcohol level.
        const groupData = data.filter(d => +d.Dalc === level);

        // Return average absences and count for this alcohol level.
        return {
            level: level,
            avgAbsences: d3.mean(groupData, d => +d.absences),
            count: groupData.length
        };
    });
}

// Put an absence value into a readable absence bin.
function getAbsenceBin(absences) {
    // Return bin for zero absences.
    if (absences === 0) return '0';

    // Return bin for one or two absences.
    if (absences <= 2) return '1-2';

    // Return bin for three to five absences.
    if (absences <= 5) return '3-5';

    // Return bin for six to ten absences.
    if (absences <= 10) return '6-10';

    // Return bin for eleven to twenty absences.
    if (absences <= 20) return '11-20';

    // Return bin for twenty-one or more absences.
    return '21+';
}

// Put a final grade value into a readable grade band.
function getGradeBand(grade) {
    // Return lowest grade band.
    if (grade <= 4) return '0-4';

    // Return low grade band.
    if (grade <= 8) return '5-8';

    // Return middle grade band.
    if (grade <= 12) return '9-12';

    // Return high grade band.
    if (grade <= 16) return '13-16';

    // Return highest grade band.
    return '17-20';
}

// Prepare data for the heatmap focus view.
function processChart2Data(data) {
    // Define x bins in a stable order.
    const absenceBins = ['0', '1-2', '3-5', '6-10', '11-20', '21+'];

    // Define y bands in a stable order.
    const gradeBands = ['0-4', '5-8', '9-12', '13-16', '17-20'];

    // Convert each raw student row into a binned student row.
    const binnedRows = data.map(d => ({
        absenceBin: getAbsenceBin(+d.absences),
        gradeBand: getGradeBand(+d.G3),
        alcoholLevel: +d.Dalc
    })).filter(d => !isNaN(d.alcoholLevel));

    // Create one heatmap cell for every possible absence-grade combination.
    const cells = [];

    // Loop through absence bins.
    absenceBins.forEach(absenceBin => {
        // Loop through grade bands.
        gradeBands.forEach(gradeBand => {
            // Keep students in the current cell.
            const cellStudents = binnedRows.filter(d => d.absenceBin === absenceBin && d.gradeBand === gradeBand);

            // Add summary data for this cell.
            cells.push({
                absenceBin: absenceBin,
                gradeBand: gradeBand,
                count: cellStudents.length
            });
        });
    });

    // Return all heatmap cells.
    return cells;
}

// Prepare data for the parallel coordinates chart.
function processChart3Data(data) {
    // Keep only the variables needed for the lifestyle profile chart.
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

// Main function that loads the data and draws all three charts.
async function initializeDashboard() {
    // Get container for chart 1.
    const container1 = document.getElementById('chart-1');

    // Get container for chart 2.
    const container2 = document.getElementById('chart-2');

    // Get container for chart 3.
    const container3 = document.getElementById('chart-3');

    // Clear chart 1 before drawing.
    d3.select('#chart-1').selectAll('*').remove();

    // Clear chart 2 before drawing.
    d3.select('#chart-2').selectAll('*').remove();

    // Clear chart 3 before drawing.
    d3.select('#chart-3').selectAll('*').remove();

    // Load the student dataset.
    const data = await loadData();

    // Stop if data did not load.
    if (!data) return;

    // Prepare data for the overview bar chart.
    const chart1Data = processChart1Data(data);

    // Prepare data for the focus heatmap.
    const chart2Data = processChart2Data(data);

    // Prepare data for the context parallel coordinates chart.
    const chart3Data = processChart3Data(data);

    // Create the bar chart object if it does not exist.
    if (!charts.chart1) charts.chart1 = new BarChart();

    // Draw the bar chart.
    charts.chart1.render('#chart-1', container1.clientWidth, container1.clientHeight, chart1Data);

    // Create the heatmap object if it does not exist.
    if (!charts.chart2) charts.chart2 = new HeatMap();

    // Draw the heatmap.
    charts.chart2.render('#chart-2', container2.clientWidth, container2.clientHeight, chart2Data);

    // Create the parallel coordinates object if it does not exist.
    if (!charts.chart3) charts.chart3 = new ParallelCoordinates();

    // Draw the parallel coordinates chart.
    charts.chart3.render('#chart-3', container3.clientWidth, container3.clientHeight, chart3Data);
}

// This function prevents resize from redrawing the dashboard too many times.
function debounce(func, wait) {
    // Store the timeout id.
    let timeout;

    // Return a function that waits before running the real function.
    return function executedFunction(...args) {
        // Keep the current this value.
        const context = this;

        // Define what happens after the waiting time.
        const later = () => {
            // Clear timeout value.
            timeout = null;

            // Run the original function.
            func.apply(context, args);
        };

        // Cancel the old scheduled call.
        clearTimeout(timeout);

        // Schedule a new call.
        timeout = setTimeout(later, wait);
    };
}

// Create a resize handler that redraws slowly, not constantly.
const handleResize = debounce(() => { initializeDashboard(); }, 250);

// Redraw the dashboard when the browser window changes size.
window.addEventListener('resize', handleResize);

// Draw the dashboard after the page loads.
document.addEventListener('DOMContentLoaded', () => { initializeDashboard(); });
