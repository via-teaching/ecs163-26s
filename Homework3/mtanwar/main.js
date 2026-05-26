// D3 code for the alcohol and grades dashboard.

// I use green to red for low to high alcohol levels.
const alcoholColors = {
    1: '#2E7D32', // level 1 is green
    2: '#8BC34A', // level 2 is light green
    3: '#FBC02D', // level 3 is yellow
    4: '#F57C00', // level 4 is orange
    5: '#C62828' // level 5 is red
};

// Text labels for each alcohol level.
const alcoholLabels = {
    1: 'Level 1: Very low',
    2: 'Level 2: Low',
    3: 'Level 3: Medium',
    4: 'Level 4: High',
    5: 'Level 5: Very high'
};

// Keep the chart objects here so I can update them later.
const charts = {
    chart1: null,
    chart2: null,
    chart3: null
};

// Keep the CSV rows here after loading the file.
let rawData = null;

// Get the color for one alcohol level.
function getAlcoholColor(level) {
    const roundedLevel = Math.max(1, Math.min(5, Math.round(level)));

    return alcoholColors[roundedLevel];
}

// Make male and female bars slightly different.
// The level color still matters most. Gender only changes the shade a little.
function getGenderBarColor(level, gender) {
    const baseColor = getAlcoholColor(level);

    // If gender is missing, use the normal color.
    if (!gender) {
        return baseColor;
    }

    // Female gets a slightly lighter version of the level color.
    if (gender === 'F') {
        return d3.interpolateRgb(baseColor, '#FFFFFF')(0.10);
    }

    // Male gets a slightly darker version of the level color.
    if (gender === 'M') {
        return d3.interpolateRgb(baseColor, '#000000')(0.10);
    }

    // Use the base color if something weird shows up.
    return baseColor;
}

// Get the text label for one alcohol level.
function getAlcoholLabel(level) {
    return alcoholLabels[level];
}

// This stores the alcohol level that is clicked.
let selectedAlcoholLevel = null;
let hoveredAlcoholLevel = null;
let showStudentLines = false;

// This changes which alcohol level is highlighted.
function updateParallelCoordinatesHighlight() {
    // First choose which level should stand out.
    const highlightLevel = selectedAlcoholLevel !== null ? selectedAlcoholLevel : hoveredAlcoholLevel;
    
    // Change the thick average lines.
    d3.selectAll('.profile-line') //select all average profile lines
        .style('stroke-width', function() {
            const level = parseInt(d3.select(this).attr('data-level'));
            return highlightLevel === level ? 5 : 3;
        }) //update stroke width
        .style('opacity', function() {
            const level = parseInt(d3.select(this).attr('data-level'));
            if (highlightLevel === null) return 0.9;
            return highlightLevel === level ? 1 : 0.22;
        }); // update opacity

    // Change the thin student lines behind them.
    d3.selectAll('.student-line') // select individual student profile lines
        .style('opacity', function() {
            const level = parseInt(d3.select(this).attr('data-level'));
            if (!showStudentLines) return 0;
            if (highlightLevel === null) return 0.15; // increased from 0.045 to make colors visible
            return highlightLevel === level ? 0.35 : 0.04; // increased highlight opacity
        }) // update opacity
        .style('stroke-width', function() {
            const level = parseInt(d3.select(this).attr('data-level'));
            return highlightLevel === level ? 1.2 : 0.6; // increased width slightly
        }); // update width
    
    // Change the dots on the profile lines.
    d3.selectAll('[class^="dot-level-"]') //select all dots
        .style('opacity', function() {
            const level = parseInt(d3.select(this).attr('data-level'));
            if (highlightLevel === null) return 1;
            return highlightLevel === level ? 1 : 0.3;
        }) // update opacity
        .attr('r', function() {
            const level = parseInt(d3.select(this).attr('data-level'));
            return highlightLevel === level ? 5 : 3.5;
        }); // update radius
}

// This redraws the heatmap after a bar is clicked.
async function updateHeatmapFilter() {
    // If charts are not ready, stop here.
    if (!charts.chart2 || !rawData) return;
    
    const container2 = document.getElementById('chart-2');
    if (!container2) return;
    
    // Read the settlement dropdown.
    const dropdown = document.getElementById('address-filter-dropdown');
    const addressFilter = dropdown ? dropdown.value : 'all';
    
    // Change the titles after a bar is clicked.
    const titleElement = document.getElementById('heatmap-title');
    const barTitleElement = document.getElementById('bar-chart-title');
    if (titleElement) {
        if (selectedAlcoholLevel !== null) {
            titleElement.textContent = `Detail: Level ${selectedAlcoholLevel} - Absences vs Grade`;
        } else {
            titleElement.textContent = 'Detail View: Student Count by Absence Range and Grade Band';
        }
    }
    if (barTitleElement) {
        if (selectedAlcoholLevel !== null) {
            barTitleElement.textContent = `Overview: Level ${selectedAlcoholLevel} Selected - Click again to deselect`;
        } else {
            barTitleElement.textContent = 'Overview: Average Absences by Workday Alcohol Level';
        }
    }
    
    // Make the filtered data for the heatmap.
    const filteredData = processChart2Data(rawData, addressFilter, selectedAlcoholLevel);
    
    // Draw the heatmap again with this filtered data.
    charts.chart2.updateWithFilter(filteredData, container2.clientWidth, container2.clientHeight);
}

// Bar chart for the overview.
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
            .attr('transform', `translate(${margins.left},${margins.top})`); // move the chart away from the edges

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
            .style('stroke-opacity', 0.45); // keep the grid light

        g.selectAll('.bar') // select bars
            .data(this.data) // connect the data to the bars
            .enter() // create the missing bars
            .append('rect') // add one rectangle per bar
            .attr('class', 'bar') // give the bars a class name
            .attr('data-level', d => d.level) // store the level as data attribute
            .attr('x', d => xScale(d.level)) // set the x position
            .attr('y', d => yScale(d.avgAbsences)) // set where the bar starts
            .attr('width', xScale.bandwidth()) // set the bar width
            .attr('height', d => this.height - yScale(d.avgAbsences)) // set the bar height
            .attr('fill', d => alcoholColors[d.level]) // color by alcohol level
            .attr('stroke', '#2C3E50') // add a dark outline
            .attr('stroke-width', 0.7) // keep the outline thin
            .style('opacity', 0.9) // make the bars a little transparent
            .style('cursor', 'pointer') // show hand cursor
            .on('click', function(event, d) {
                // Click again clears the selection
                if (selectedAlcoholLevel === d.level) {
                    // clear selected level
                    selectedAlcoholLevel = null;
                } else {
                    // save selected level
                    selectedAlcoholLevel = d.level;
                }
                
                // Change all bars after click
                d3.selectAll('.bar') //select all bars
                    .attr('stroke-width', bar => selectedAlcoholLevel === bar.level ? 3 : 0.7) //update stroke-width
                    .style('opacity', bar => selectedAlcoholLevel === bar.level ? 1 : 0.9) //update opacity
                    .attr('filter', bar => selectedAlcoholLevel === bar.level ? 'brightness(0.85)' : 'none'); //update filter
                
                // Update the profile chart
                updateParallelCoordinatesHighlight();
                
                // Update the heatmap
                updateHeatmapFilter();
            })
            .on('mouseover', function(event, d) {
                // Only do hover when nothing is clicked
                if (selectedAlcoholLevel === null) {
                    hoveredAlcoholLevel = d.level;
                    
                    // Change all bars after click with the same logic as click
                    d3.selectAll('.bar') //select all bars
                        .attr('stroke-width', bar => bar.level === d.level ? 3 : 0.7) //update stroke-width
                        .style('opacity', bar => bar.level === d.level ? 1 : 0.9) //update opacity
                        .attr('filter', bar => bar.level === d.level ? 'brightness(0.85)' : 'none'); //update filter
                    
                    // Update profile chart highlighting
                    updateParallelCoordinatesHighlight();
                }
            })
            .on('mouseout', function() {
                // Only clear hover when nothing is clicked
                if (selectedAlcoholLevel === null) {
                    hoveredAlcoholLevel = null;
                    
                    // Put bars back to normal
                    d3.selectAll('.bar') // select bars
                        .attr('stroke-width', 0.7) // update stroke width
                        .style('opacity', 0.9) // update opacity
                        .attr('filter', 'none'); // update filter
                    
                    // Update profile chart highlighting
                    updateParallelCoordinatesHighlight();
                }
            });


        g.selectAll('.bar') // select bars for browser tooltips
            .append('title') // add browser tooltip text
            .text(d => `${getAlcoholLabel(d.level)}: ${d.avgAbsences.toFixed(1)} average absences, n=${d.count}`); // say what this bar means

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
            .style('fill', '#666666') // use gray text
            .text(d => `n=${d.count}`); // show the number of students

        this.svg.append('text') // add x-axis label
            .attr('class', 'x-axis-label') // give the label a class
            .attr('text-anchor', 'middle') // center the label
            .attr('x', margins.left + this.width / 2) // center it under the plot
            .attr('y', containerHeight - 8) // place it near the bottom
            .style('font-size', Math.max(11, containerWidth * 0.018) + 'px') // set the label size
            .style('font-weight', '600') // make the label bold
            .style('fill', '#2C3E50') // use dark blue text
            .text('Workday Alcohol Consumption Level (1 = very low, 5 = very high)'); // write the label text

        this.svg.append('text') // add y-axis label
            .attr('class', 'y-axis-label') // give the label a class
            .attr('text-anchor', 'middle') // center the rotated label
            .attr('transform', 'rotate(-90)') // rotate the label vertically
            .attr('x', -(margins.top + this.height / 2)) // set the rotated x position
            .attr('y', 15) // set the rotated y position
            .style('font-size', Math.max(11, containerHeight * 0.025) + 'px') // set the label size
            .style('font-weight', '600') // make the label bold
            .style('fill', '#2C3E50') // use dark blue text
            .text('Average Number of Absences'); // write the label text

        this.svg.append('text') // add the bar chart note
            .attr('class', 'chart-note') // give the note a class
            .attr('text-anchor', 'middle') // center the note
            .attr('x', containerWidth / 2) // center it across the SVG
            .attr('y', 18) // place it near the top
            .style('font-size', Math.max(9, Math.min(12, containerWidth * 0.014)) + 'px') // set note size
            .style('fill', '#666666') // make the note gray
            .text('Click a bar to look at one alcohol level. Click the same bar again to show all levels.'); // write the note text

        this.svg.append('text') // add the small data note
            .attr('class', 'data-annotation') // give the note a class
            .attr('text-anchor', 'middle') // center the note
            .attr('x', containerWidth / 2) // center it across the chart
            .attr('y', 34) // place below the main note
            .style('font-size', Math.max(8, Math.min(11, containerWidth * 0.013)) + 'px') // set note size
            .style('fill', '#8A4B00') // use brown so it stands out a little
            .text('Levels 4 and 5 have fewer students, so I compare those bars more carefully.'); // write the data note

        this.addLegend(containerWidth, margins);
    }

    // Change the bar chart for gender mode
    updateWithGenderBreakdown(data, byGender, containerWidth, containerHeight) {
        const margins = {
            top: Math.max(45, containerHeight * 0.13),
            right: Math.max(135, containerWidth * 0.18),
            bottom: Math.max(65, containerHeight * 0.18),
            left: Math.max(65, containerWidth * 0.12)
        };

        const g = this.svg.select('g'); // select the main plot group
        
        // Change the scales
        const xScale = d3.scaleBand() // make x scale for the bars
            .domain(byGender ? 
                data.map(d => d.level + '-' + d.gender) : // use level and gender together in gender mode
                data.map(d => d.level)) // use only level in normal mode
            .range([0, this.width]) // set where the scale goes
            .padding(0.32); // add space between bars

        const yScale = d3.scaleLinear() // make y scale for average absences
            .domain([0, Math.ceil(d3.max(data, d => d.avgAbsences) + 1)]) // start at 0 and go to the max value
            .range([this.height, 0]) // set where the scale goes
            .nice(); // round the axis numbers nicely

        // Redraw the y axis with animation
        g.select('.y-axis') // select the y-axis group
            .transition() // add animation
            .duration(750) // make animation last 750 ms
            .call(d3.axisLeft(yScale).ticks(5)); // draw y axis again

        // Redraw grid with animation
        g.select('.grid-lines') // select the grid lines group
            .transition() // add animation
            .duration(750) // make animation last 750 ms
            .call(d3.axisLeft(yScale).ticks(5).tickSize(-this.width).tickFormat('')); // draw grid again

        // Move the bars with animation
        const bars = g.selectAll('.bar') // select the bars already on screen
            .data(data, d => byGender ? d.level + '-' + d.gender : d.level); // match data to the right bar

        // Remove bars we do not need now
        bars.exit() // find bars with no data now
            .transition() // add animation
            .duration(750) // make animation last 750 ms
            .attr('y', this.height) // move bar to bottom
            .attr('height', 0) // shrink the bar down
            .style('opacity', 0) // fade the bar out
            .remove(); // remove it after animation

        // Update bars already on screen
        bars.transition() // add animation to existing bars
            .duration(750) // make animation last 750 ms
            .attr('x', d => byGender ? 
                xScale(d.level + '-' + d.gender) : // x position in gender mode
                xScale(d.level)) // x position in normal mode
            .attr('y', d => yScale(d.avgAbsences)) // set where the bar top goes
            .attr('width', xScale.bandwidth()) // set bar width
            .attr('height', d => this.height - yScale(d.avgAbsences)) // set bar height
            .attr('fill', d => byGender ? getGenderBarColor(d.level, d.gender) : alcoholColors[d.level]) // use alcohol color and small gender shade
            .attr('stroke-width', d => selectedAlcoholLevel === d.level ? 3 : 0.7) // show if this level is selected
            .style('opacity', d => selectedAlcoholLevel === d.level ? 1 : 0.9) // show if this level is selected
            .attr('filter', d => selectedAlcoholLevel === d.level ? 'brightness(0.85)' : 'none'); // show if this level is selected

        // Add bars that are new
        const newBars = bars.enter() // find data that needs new bars
            .append('rect') // add a rect for each new bar
            .attr('class', 'bar') // give bar a class name
            .attr('data-level', d => d.level) // store level as data attribute
            .attr('x', d => byGender ? 
                xScale(d.level + '-' + d.gender) : // x position in gender mode
                xScale(d.level)) // x position in normal mode
            .attr('y', this.height) // start the bar from the bottom
            .attr('width', xScale.bandwidth()) // set bar width
            .attr('height', 0) // start with no height
            .attr('fill', d => byGender ? getGenderBarColor(d.level, d.gender) : alcoholColors[d.level]) // use alcohol color and small gender shade
            .attr('stroke', '#2C3E50') // add dark outline
            .attr('stroke-width', d => selectedAlcoholLevel === d.level ? 3 : 0.7) // show if this level is selected
            .style('opacity', d => selectedAlcoholLevel === d.level ? 1 : 0.9) // show if this level is selected
            .attr('filter', d => selectedAlcoholLevel === d.level ? 'brightness(0.85)' : 'none') // show if this level is selected
            .style('cursor', 'pointer'); // show hand cursor

        newBars.transition() // animate the new bars
            .duration(750) // make animation last 750 ms
            .attr('y', d => yScale(d.avgAbsences)) // move to the final y spot
            .attr('height', d => this.height - yScale(d.avgAbsences)); // grow the bar upward

        // Add mouse actions to the bars
        const self = this; // keep this chart in a variable
        g.selectAll('.bar') // select all bars (existing and new)
            .on('click', function(event, d) { // add click action
                // Click again clears the selection
                if (selectedAlcoholLevel === d.level) { // if clicking already selected level
                    selectedAlcoholLevel = null; // deselect it
                } else {
                    selectedAlcoholLevel = d.level; // select this level
                }
                
                d3.selectAll('.bar') // select all bars
                    .attr('stroke-width', bar => selectedAlcoholLevel === bar.level ? 3 : 0.7) // update stroke width
                    .style('opacity', bar => selectedAlcoholLevel === bar.level ? 1 : 0.9) // update opacity
                    .attr('filter', bar => selectedAlcoholLevel === bar.level ? 'brightness(0.85)' : 'none'); // update brightness filter
                
                updateParallelCoordinatesHighlight(); // update parallel coordinates chart
                updateHeatmapFilter(); // update heatmap filter
            })
            .on('mouseover', function(event, d) { // add hover action
                if (selectedAlcoholLevel !== null) return; // don't show hover if level is selected
                
                hoveredAlcoholLevel = d.level; // set hovered level
                d3.selectAll('.bar') // select all bars
                    .attr('stroke-width', bar => bar.level === d.level ? 3 : 0.7) // update stroke width
                    .style('opacity', bar => bar.level === d.level ? 1 : 0.9) // update opacity
                    .attr('filter', bar => bar.level === d.level ? 'brightness(0.85)' : 'none'); // update brightness filter
                
                updateParallelCoordinatesHighlight(); // update parallel coordinates chart
            })
            .on('mouseout', function() { // add mouse leave action
                if (selectedAlcoholLevel !== null) return; // don't clear hover if level is selected
                
                hoveredAlcoholLevel = null; // clear hovered level
                d3.selectAll('.bar') // select all bars
                    .attr('stroke-width', 0.7) // reset stroke width
                    .style('opacity', 0.9) // reset opacity
                    .attr('filter', 'none'); // remove brightness filter
                
                updateParallelCoordinatesHighlight(); // update parallel coordinates chart
            });


        g.selectAll('.bar') // select bars for tooltips
            .selectAll('title') // remove old tooltip text
            .remove(); // clear old tooltip text

        g.selectAll('.bar') // select all current bars
            .append('title') // add new browser tooltip
            .text(d => `${getAlcoholLabel(d.level)}${byGender ? ' - ' + (d.gender === 'F' ? 'Female' : 'Male') : ''}: ${d.avgAbsences.toFixed(1)} average absences, n=${d.count}`); // say what this bar means

        // Update value labels
        const labels = g.selectAll('.bar-label') // select value labels
            .data(data, d => byGender ? d.level + '-' + d.gender : d.level); // match data to the right bar

        labels.exit() // find labels we do not need
            .transition() // add animation
            .duration(750) // make animation last 750 ms
            .style('opacity', 0) // fade out the label
            .remove(); // remove it after animation

        labels.transition() // animate old labels
            .duration(750) // make animation last 750 ms
            .attr('x', d => byGender ? 
                xScale(d.level + '-' + d.gender) + xScale.bandwidth() / 2 : // center for gender mode
                xScale(d.level) + xScale.bandwidth() / 2) // center for normal mode
            .attr('y', d => yScale(d.avgAbsences) - 6) // put label above the bar
            .text(d => d.avgAbsences.toFixed(1)); // update value text

        labels.enter() // select new data points that need labels
            .append('text') // add a text element
            .attr('class', 'bar-label') // give label a class name
            .attr('text-anchor', 'middle') // center the text
            .attr('x', d => byGender ? 
                xScale(d.level + '-' + d.gender) + xScale.bandwidth() / 2 : // center for gender mode
                xScale(d.level) + xScale.bandwidth() / 2) // center for normal mode
            .attr('y', d => yScale(d.avgAbsences) - 6) // put label above the bar
            .style('font-size', Math.max(10, Math.min(14, containerWidth * 0.018)) + 'px') // set text size
            .style('font-weight', 'bold') // make text bold
            .style('fill', '#2C3E50') // set text color
            .style('opacity', 0) // start hidden
            .text(d => d.avgAbsences.toFixed(1)) // set value text
            .transition() // add transition
            .duration(750) // make animation last 750 ms
            .style('opacity', 1); // fade it in

        // Update n labels
        const countLabels = g.selectAll('.count-label') // select n labels
            .data(data, d => byGender ? d.level + '-' + d.gender : d.level); // match data to the right bar

        countLabels.exit() // find n labels we do not need
            .transition() // add animation
            .duration(750) // make animation last 750 ms
            .style('opacity', 0) // fade out the label
            .remove(); // remove it after animation

        countLabels.transition() // animate old n labels
            .duration(750) // make animation last 750 ms
            .attr('x', d => byGender ? 
                xScale(d.level + '-' + d.gender) + xScale.bandwidth() / 2 : // center for gender mode
                xScale(d.level) + xScale.bandwidth() / 2) // center for normal mode
            .text(d => `n=${d.count}`); // update n text

        countLabels.enter() // find data that needs n labels
            .append('text') // add a text element
            .attr('class', 'count-label') // give n label a class
            .attr('text-anchor', 'middle') // center the text
            .attr('x', d => byGender ? 
                xScale(d.level + '-' + d.gender) + xScale.bandwidth() / 2 : // center for gender mode
                xScale(d.level) + xScale.bandwidth() / 2) // center for normal mode
            .attr('y', this.height + 32) // put it below the x axis
            .style('font-size', Math.max(8, Math.min(10, containerWidth * 0.014)) + 'px') // set text size
            .style('fill', '#666666') // set text color
            .style('opacity', 0) // start hidden
            .text(d => `n=${d.count}`) // set n text
            .transition() // add transition
            .duration(750) // make animation last 750 ms
            .style('opacity', 1); // fade it in

        // Update x axis labels
        const xAxisGroup = g.select('.x-axis'); // select the x-axis group
        if (byGender) { // if gender checkbox is on
            xAxisGroup.transition() // add animation
                .duration(750) // make animation last 750 ms
                .call(d3.axisBottom(xScale).tickFormat(d => d.split('-')[1])); // draw F and M labels
        } else { // if gender checkbox is off
            xAxisGroup.transition() // add animation
                .duration(750) // make animation last 750 ms
                .call(d3.axisBottom(xScale).tickFormat(d => d)); // draw level numbers
        }

        const levelGroups = g.selectAll('.gender-level-label') // select level labels under F and M
            .data(byGender ? [1, 2, 3, 4, 5] : [], d => d); // only make these labels in gender mode

        levelGroups.exit() // find labels to remove
            .transition() // add animation
            .duration(350) // set transition duration
            .style('opacity', 0) // fade out labels
            .remove(); // remove old labels

        levelGroups.enter() // select new group labels
            .append('text') // add text for each level group
            .attr('class', 'gender-level-label') // give labels a class
            .attr('text-anchor', 'middle') // center it over F and M
            .attr('x', level => {
                const femaleX = xScale(`${level}-F`) + xScale.bandwidth() / 2;
                const maleX = xScale(`${level}-M`) + xScale.bandwidth() / 2;
                return (femaleX + maleX) / 2;
            }) // put it in the middle of the pair
            .attr('y', this.height + 50) // place it below F and M
            .style('font-size', Math.max(8, Math.min(10, containerWidth * 0.012)) + 'px') // set label size
            .style('fill', '#2C3E50') // use dark text
            .style('font-weight', '600') // make label bold enough
            .style('opacity', 0) // start hidden
            .text(level => `Level ${level}`) // write group label
            .transition() // fade the label in
            .duration(750) // set transition duration
            .style('opacity', 1); // fade in labels

        this.svg.select('.x-axis-label') // select x axis label
            .text(byGender ? 'Workday Alcohol Level, Split by Gender (F = female, M = male)' : 'Workday Alcohol Consumption Level (1 = very low, 5 = very high)'); // change label for current mode
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
            .style('fill', '#2C3E50') // use dark blue text
            .text('Alcohol level'); // write legend title

        [1, 2, 3, 4, 5].forEach((level, i) => {
            const row = legend.append('g') // add legend row group
                .attr('transform', `translate(0, ${18 + i * 18})`); // stack each legend row

            row.append('rect') // add color square
                .attr('width', 12) // set square width
                .attr('height', 12) // set square height
                .attr('fill', alcoholColors[level]) // use alcohol level color
                .attr('stroke', '#2C3E50') // add outline
                .attr('stroke-width', 0.4); // keep border thin

            row.append('text') // add legend label
                .attr('x', 18) // place text after square
                .attr('y', 10) // vertically align text
                .style('font-size', Math.max(8, Math.min(10, containerWidth * 0.012)) + 'px') // set text size
                .style('fill', '#2C3E50') // use dark blue text
                .text(getAlcoholLabel(level)); // write label
        });
    }
}

// Heatmap detail view.
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

        this.svg = d3.select(containerId).append('svg') // make heatmap svg
            .attr('width', containerWidth) // set the SVG width
            .attr('height', containerHeight); // set the SVG height

        const g = this.svg.append('g') // make heatmap plot group
            .attr('transform', `translate(${margins.left},${margins.top})`); // move plot inside the margins

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
            .attr('class', 'x-axis') // give x axis a class
            .attr('transform', `translate(0,${this.height})`); // move x axis to bottom

        xAxisGroup.call(d3.axisBottom(xScale)); // draw the x-axis

        xAxisGroup.style('font-size', Math.max(9, Math.min(12, containerWidth * 0.016)) + 'px');

        const yAxisGroup = g.append('g') // make heatmap y axis group
            .attr('class', 'y-axis'); // give y axis a class

        yAxisGroup.call(d3.axisLeft(yScale)); // draw the y-axis

        yAxisGroup.style('font-size', Math.max(9, Math.min(12, containerHeight * 0.025)) + 'px');

        g.selectAll('.heat-cell') // select heatmap cells
            .data(this.data) // connect binned data to cells
            .enter() // make missing cells
            .append('rect') // add one rectangle for each cell
            .attr('class', 'heat-cell') // give cell a class
            .attr('x', d => xScale(d.absenceBin)) // set cell x spot
            .attr('y', d => yScale(d.gradeBand)) // set cell y spot
            .attr('width', xScale.bandwidth()) // set cell width
            .attr('height', yScale.bandwidth()) // set cell height
            .attr('fill', d => d.count === 0 ? '#F1F1F1' : colorScale(d.count)) // color by how many students are inside
            .attr('stroke', '#FFFFFF') // add white lines between cells
            .attr('stroke-width', 1) // keep cell border thin
            .style('opacity', d => d.count === 0 ? 0.5 : 0.95) // make empty cells lighter
            .append('title') // add native tooltip to each cell
            .text(d => `${d.count} students with ${d.absenceBin} absences and final grade ${d.gradeBand}`); // say what this cell means

        g.selectAll('.cell-count') // select cell count labels
            .data(this.data) // connect binned data to cells
            .enter() // create the missing labels
            .append('text') // add the count text
            .attr('class', 'cell-count') // give n label a class
            .attr('text-anchor', 'middle') // center count label
            .attr('x', d => xScale(d.absenceBin) + xScale.bandwidth() / 2) // center in cell horizontally
            .attr('y', d => yScale(d.gradeBand) + yScale.bandwidth() / 2 + 4) // center in cell vertically
            .style('font-size', Math.max(9, Math.min(13, containerWidth * 0.017)) + 'px') // set count size
            .style('font-weight', '600') // make count bold
            .style('fill', d => d.count > maxCount * 0.55 ? '#FFFFFF' : '#1F2933') // use readable text color
            .text(d => d.count === 0 ? '' : d.count); // only show number when count is not zero

        this.svg.append('text') // add heatmap x label
            .attr('class', 'x-axis-label') // give the label a class
            .attr('text-anchor', 'middle') // center the label
            .attr('x', margins.left + this.width / 2) // center it under the plot
            .attr('y', containerHeight - 8) // place at bottom
            .style('font-size', Math.max(11, containerWidth * 0.018) + 'px') // set the label size
            .style('font-weight', '600') // make the label bold
            .style('fill', '#2C3E50') // use dark blue text
            .text('Number of School Absences'); // write label

        this.svg.append('text') // add heatmap y label
            .attr('class', 'y-axis-label') // give the label a class
            .attr('text-anchor', 'middle') // center rotated text
            .attr('transform', 'rotate(-90)') // rotate label
            .attr('x', -(margins.top + this.height / 2)) // set rotated x
            .attr('y', 18) // set rotated y
            .style('font-size', Math.max(11, containerHeight * 0.025) + 'px') // set the label size
            .style('font-weight', '600') // make the label bold
            .style('fill', '#2C3E50') // use dark blue text
            .text('Final Math Grade Band'); // write label

        this.svg.append('text') // add heatmap note
            .attr('class', 'chart-note') // give the note a class
            .attr('text-anchor', 'middle') // center note
            .attr('x', containerWidth / 2) // center note across chart
            .attr('y', 18) // place it near the top
            .style('font-size', Math.max(9, Math.min(12, containerWidth * 0.014)) + 'px') // set note size
            .style('fill', '#666666') // use gray text
            .text('After a bar is selected, this chart shows that group by absences and final grade.'); // write the note text

        this.addLegend(containerWidth, containerHeight, margins, colorScale, maxCount);
    }

    // Update heatmap with filtered data
    updateWithFilter(data, containerWidth, containerHeight) {
        const margins = {
            top: Math.max(45, containerHeight * 0.13),
            right: Math.max(155, containerWidth * 0.2),
            bottom: Math.max(65, containerHeight * 0.18),
            left: Math.max(85, containerWidth * 0.15)
        };

        const g = this.svg.select('g'); // select the main plot group

        const maxCount = d3.max(data, d => d.count); // calculate new max count

        const colorScale = d3.scaleLinear() // create new color scale
            .domain([0, maxCount]) // set domain from 0 to max count
            .range(['#F2F7FB', '#1F5C99']); // set color range

        // Update cells with transition
        const cells = g.selectAll('.heat-cell') // select all cells
            .data(data, d => d.absenceBin + '-' + d.gradeBand); // match data to the right bar

        cells.transition() // add animation to existing cells
            .duration(750) // make animation last 750 ms
            .attr('fill', d => d.count === 0 ? '#F1F1F1' : colorScale(d.count)) // update cell color
            .style('opacity', d => d.count === 0 ? 0.5 : 0.95); // update cell opacity

        cells.select('title') // select existing cell tooltip
            .text(d => `${d.count} students with ${d.absenceBin} absences and final grade ${d.gradeBand}`); // update cell tooltip

        // Update cell count labels with transition
        const countLabels = g.selectAll('.cell-count') // select n labels
            .data(data, d => d.absenceBin + '-' + d.gradeBand); // match data to the right bar

        countLabels.transition() // add animation to existing labels
            .duration(750) // make animation last 750 ms
            .style('fill', d => d.count > maxCount * 0.55 ? '#FFFFFF' : '#1F2933') // change text color so the number is visible
            .text(d => d.count === 0 ? '' : d.count); // update count text

        // Update legend
        this.svg.select('.legend').remove(); // remove old legend
        this.addLegend(containerWidth, containerHeight, margins, colorScale, maxCount); // add new legend with updated scale
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
            .style('fill', '#2C3E50') // use dark blue text
            .text('Students'); // write legend title

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
                .style('fill', '#2C3E50') // use dark blue text
                .text(count); // show count value
        });

        legend.append('text') // add color explanation
            .attr('x', 0) // set note x
            .attr('y', 122) // place under color steps
            .style('font-size', Math.max(8, Math.min(10, containerWidth * 0.012)) + 'px') // set note size
            .style('fill', '#666666') // use gray text
            .text('Darker = more students'); // write the note text
    }
}

// Line profile chart for the lifestyle variables.
class ParallelCoordinates {
    render(containerId, containerWidth, containerHeight, data) {
        this.data = data;

        d3.select(containerId).selectAll('*').remove();

        // Work out the heights for the parts
        const legendHeight = 35;
        const noteHeight = 25;
        const svgHeight = containerHeight - legendHeight - noteHeight;

        // Add a div for the legend at the top
        const legendDiv = d3.select(containerId).append('div') // add div to the container
            .attr('class', 'parallel-legend') // give legend a class
            .style('padding', '5px 0px') // add padding for the legend
            .style('display', 'flex') // use flex so the legend goes across
            .style('justify-content', 'flex-start') // put legend items on the left
            .style('align-items', 'center') // line items up vertically
            .style('gap', '20px') // add space between legend items
            .style('font-size', '11px') // set legend font size
            .style('flex-wrap', 'wrap'); // allow legend to wrap on small screens

        // Make the SVG for the line chart
        this.svg = d3.select(containerId).append('svg') // make line chart svg
            .attr('width', containerWidth) // set the SVG width
            .attr('height', svgHeight) // set height for the chart part
            .style('cursor', 'default') // use normal cursor on svg
            .style('display', 'block'); // avoid extra space under svg

        // Add a div for the note at the bottom
        const noteDiv = d3.select(containerId).append('div') // add div to the container
            .attr('class', 'parallel-note') // give note a class
            .style('padding', '5px 18px') // set note padding
            .style('text-align', 'center') // center the note text
            .style('font-size', '10px') // set note font size
            .style('color', '#666666') // use gray text
            .style('line-height', '1.4') // add space between lines
            .text('Thick lines show the average profile for each alcohol level. Use the checkbox to show individual students too.'); // write the note text text

        const margins = {
            top: Math.max(45, svgHeight * 0.12),
            right: Math.max(40, containerWidth * 0.04),
            bottom: Math.max(65, svgHeight * 0.18),
            left: Math.max(50, containerWidth * 0.04)
        };

        this.width = containerWidth - margins.left - margins.right;

        this.height = svgHeight - margins.top - margins.bottom;

        const g = this.svg.append('g') // make main plot group
            .attr('transform', `translate(${margins.left},${margins.top})`); // move plot inside the margins

        // Invisible rectangle for zoom and pan
        const zoomOverlay = g.append('rect') // add rectangle for zoom and pan
            .attr('class', 'zoom-overlay') // give it a class
            .attr('width', this.width) // set width to cover the plot area
            .attr('height', this.height) // set height to cover the plot area
            .style('fill', 'none') // make it invisible
            .style('pointer-events', 'all') // let it catch mouse events
            .style('cursor', 'move'); // show move cursor

        // This group moves when zooming and panning
        const zoomGroup = g.append('g') // add group for zoom and pan
            .attr('class', 'zoom-group'); // give it a class

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
            absences: [0, d3.max(this.data, d => d.absences)],
            failures: [0, d3.max(this.data, d => d.failures)],
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

        const axes = zoomGroup.selectAll('.dimension') // select all variable axes
            .data(dimensions) // connect variable names to axes
            .enter() // make missing axes
            .append('g') // add group for each axis
            .attr('class', 'dimension') // give each axis a class
            .attr('transform', d => `translate(${xScale(d)},0)`); // move each axis to its x spot

        axes.append('g') // add the axis inside the group
            .each(function () { // loop through each axis
                d3.select(this).call(d3.axisLeft(yScale).ticks(4)); // draw 0 to 100 axis
            })
            .style('font-size', Math.max(8, Math.min(11, containerWidth * 0.012)) + 'px'); // set axis text size

        // Add labels under each axis
        axes.append('text') // add axis label text
            .attr('class', 'axis-label') // give the label a class
            .attr('text-anchor', 'middle') // center the label
            .attr('y', this.height + 28) // place label below axis
            .style('font-size', Math.max(10, Math.min(13, containerWidth * 0.014)) + 'px') // set the label size
            .style('font-weight', '600') // make the label bold
            .style('fill', '#2C3E50') // use dark blue text
            .text(d => dimensionLabels[d]); // write the variable label

        axes.append('text') // add small note under axis
            .attr('class', 'axis-explanation') // give small note a class
            .attr('text-anchor', 'middle') // center explanation
            .attr('y', this.height + 47) // place below axis label
            .style('font-size', Math.max(7, Math.min(9, containerWidth * 0.01)) + 'px') // keep it small
            .style('fill', '#666666') // use gray text
            .text(d => dimensionNotes[d]); // write small note

        axes.append('text') // add the actual max label
            .attr('class', 'axis-range-label') // give max label a class
            .attr('text-anchor', 'middle') // center label
            .attr('y', -8) // put it above the axis
            .style('font-size', Math.max(7, Math.min(9, containerWidth * 0.01)) + 'px') // set small text size
            .style('fill', '#555555') // use gray text
            .text(d => `actual max: ${ranges[d][1]}`); // show actual max value

        axes.append('text') // add the actual min label
            .attr('class', 'axis-range-label') // give min label a class
            .attr('text-anchor', 'middle') // center label
            .attr('y', this.height + 12) // put it near bottom of axis
            .style('font-size', Math.max(7, Math.min(9, containerWidth * 0.01)) + 'px') // set small text size
            .style('fill', '#555555') // use gray text
            .text(d => `min: ${ranges[d][0]}`); // show actual min value

        zoomGroup.append('g') // add group for thin student lines
            .attr('class', 'student-lines') // give the student line group a class
            .selectAll('path') // select paths before making them
            .data(this.data) // use one row for each student
            .enter() // make missing student paths
            .append('path') // add one line for each student
            .attr('class', 'student-line') // give student line a class
            .attr('data-level', d => d.Dalc) // save level for highlighting
            .attr('d', createPath) // draw path from student values
            .style('fill', 'none') // do not fill the line
            .style('stroke', d => alcoholColors[d.Dalc]) // color by alcohol level
            .style('stroke-width', 0.6) // keep these lines thin but visible
            .style('opacity', showStudentLines ? 0.15 : 0) // increased from 0.045 to make colors visible
            .append('title') // add tooltip to student line
            .text(d => `Student: alcohol level ${d.Dalc}, absences ${d.absences}, final grade ${d.G3}, study time ${d.studytime}`); // explain row

        zoomGroup.append('g') // add group for thick average lines
            .attr('class', 'profile-lines') // give line group a class
            .selectAll('path') // select paths before making them
            .data(averageData) // use average data
            .enter() // make missing paths
            .append('path') // add one path for each alcohol level
            .attr('class', 'profile-line') // give path a class
            .attr('data-level', d => d.level) // save level for click and hover
            .attr('d', createPath) // draw the line path
            .style('fill', 'none') // do not fill the line
            .style('stroke', d => alcoholColors[d.level]) // color by alcohol level
            .style('stroke-width', 3) // make the average line thicker
            .style('opacity', 0.85) // keep lines slightly transparent
            .style('cursor', 'pointer') // show hand cursor
            .on('mouseover', function(event, d) {
                // Only do hover when nothing is clicked
                if (selectedAlcoholLevel === null) {
                    hoveredAlcoholLevel = d.level;
                    
                    // Update bars with hover effect
                    d3.selectAll('.bar') //select all bars
                        .attr('stroke-width', bar => bar.level === d.level ? 3 : 0.7) // update stroke width
                        .style('opacity', bar => bar.level === d.level ? 1 : 0.9) // update opacity 
                        .attr('filter', bar => bar.level === d.level ? 'brightness(0.85)' : 'none'); //update filter
                    
                    // Update profile chart highlighting
                    updateParallelCoordinatesHighlight();
                }
            })
            .on('mouseout', function() {
                // Only clear hover when nothing is clicked
                if (selectedAlcoholLevel === null) {
                    hoveredAlcoholLevel = null;
                    
                    // Put bars back to normal
                    d3.selectAll('.bar') // select all bars
                        .attr('stroke-width', 0.7) // update stroke width
                        .style('opacity', 0.9) // update opacity
                        .attr('filter', 'none'); // update filter
                    
                    // Update profile chart highlighting
                    updateParallelCoordinatesHighlight();
                }
            });

        zoomGroup.selectAll('.profile-line') // select average lines for tooltips
            .append('title') // add browser tooltip to average line
            .text(d => `Average for alcohol level ${d.level}: n=${d.count}, absences ${d.absences.toFixed(1)}, final grade ${d.G3.toFixed(1)}`); // say what this average line means

        averageData.forEach(row => {
            zoomGroup.selectAll(`.dot-level-${row.level}`) // select dots for this level
                .data(dimensions) // connect variable names to dots
                .enter() // make missing dots
                .append('circle') // add one circle dot
                .attr('class', `dot-level-${row.level}`) // give dot a level class
                .attr('data-level', row.level) // save level for click and hover
                .attr('cx', dim => xScale(dim)) // set dot x spot
                .attr('cy', dim => yScale(normalizeValue(dim, row[dim]))) // set dot y spot
                .attr('r', 3.5) // set dot size
                .attr('fill', alcoholColors[row.level]) // color dot by alcohol level
                .attr('stroke', '#FFFFFF') // add white border
                .attr('stroke-width', 1) // keep border thin
                .style('cursor', 'pointer') // show hand cursor
                .on('mouseover', function(event) {
                    // Only do hover when nothing is clicked
                    if (selectedAlcoholLevel === null) {
                        const level = parseInt(d3.select(this).attr('data-level'));
                        hoveredAlcoholLevel = level;
                        
                        // Update bars with hover effect
                        d3.selectAll('.bar') // select all bars
                            .attr('stroke-width', bar => bar.level === level ? 3 : 0.7) // update stroke width
                            .style('opacity', bar => bar.level === level ? 1 : 0.9) // update opacity
                            .attr('filter', bar => bar.level === level ? 'brightness(0.85)' : 'none'); // update filter
                        
                        // Update profile chart highlighting
                        updateParallelCoordinatesHighlight();
                    }
                })
                .on('mouseout', function() {
                    // Only clear hover when nothing is clicked
                    if (selectedAlcoholLevel === null) {
                        hoveredAlcoholLevel = null;
                        
                        // Put bars back to normal
                        d3.selectAll('.bar') //select bars
                            .attr('stroke-width', 0.7) // update stroke width
                            .style('opacity', 0.9) // update opacity
                            .attr('filter', 'none'); // update filter
                        
                        // Update profile chart highlighting
                        updateParallelCoordinatesHighlight();
                    }
                })
                .append('title') // add tooltip to each dot
                .text(dim => `${dimensionLabels[dim]} average for level ${row.level}: ${row[dim].toFixed(1)}`); // show exact average value
        });

        // Add zoom and pan for only this chart
        const zoom = d3.zoom()
            .scaleExtent([1, 5]) // allow 1x to 5x zoom
            .filter(function(event) {
                // Only allow zoom on wheel events and drag events
                if (event.type === 'wheel') {
                    // Critical: stop the event from bubbling to prevent page zoom
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();
                    return true; // Allow D3 to handle the zoom
                }
                // Allow drag to pan (mousedown and mousemove)
                if (event.type === 'mousedown' || event.type === 'mousemove') {
                    event.stopPropagation();
                    event.stopImmediatePropagation();
                    return !event.ctrlKey && !event.button; // Allow left mouse drag only
                }
                // Block everything else
                return false;
            })
            .on('zoom', (event) => {
                // keep zoom from moving too far
                let transform = event.transform;
                const scale = transform.k;
                
                // get the size of the content
                // include the labels under the chart
                const contentHeight = this.height + 50; // include axis labels
                const contentWidth = this.width;
                
                // Do not let the chart move past the starting spot
                // The top left can stay put or move left/up
                const maxX = 0; // do not move right past the start
                const minX = contentWidth * (1 - scale); // can pan left after zooming
                const maxY = 0; // do not move down past the start
                const minY = contentHeight * (1 - scale); // can pan up after zooming
                
                // keep x and y inside the limit
                transform.x = Math.max(minX, Math.min(maxX, transform.x));
                transform.y = Math.max(minY, Math.min(maxY, transform.y));
                
                zoomGroup.attr('transform', transform); // move the zoom group ONLY
            });

        // Apply zoom behavior to the overlay (defined earlier)
        zoomOverlay.call(zoom);

        // Add a reset button
        const resetButton = this.svg.append('g') // add group for reset button
            .attr('class', 'reset-button') // give it a class for styling
            .attr('transform', `translate(${margins.left + this.width - 60}, ${0})`) // position in top-right, above the plot area
            .style('cursor', 'pointer') // show pointer cursor on hover
            .on('click', () => { // reset zoom on click
                zoomGroup.transition() // animate the reset
                    .duration(750) // set animation duration
                    .attr('transform', 'translate(0,0) scale(1)'); // reset zoomGroup transform
                zoomOverlay.call(zoom.transform, d3.zoomIdentity); // reset the zoom behavior's internal state
            });

        resetButton.append('rect') // add rectangle for reset button background
            .attr('width', 55) // set button width
            .attr('height', 24) // set button height
            .attr('rx', 4) // round button corners
            .attr('fill', '#2C3E50') // use the dashboard text color for the button
            .attr('stroke', '#1a252f') // add a border to the button
            .attr('stroke-width', 1); // keep the border thin

        resetButton.append('text') // add text label for reset button
            .attr('x', 27.5) // center text in button
            .attr('y', 16) // vertically center text in button
            .attr('text-anchor', 'middle') // center text horizontally
            .style('fill', '#FFFFFF') // use white text for contrast
            .style('font-size', '11px') // set text size
            .style('font-weight', '600') // make text bold
            .text('Reset'); // write button label

        this.addLegend(containerId, averageData); // Add legend after drawing chart
    }

    addLegend(containerId, averageData) {
        const legendDiv = d3.select(containerId).select('.parallel-legend'); // select the legend div
        
        // Add legend title
        legendDiv.append('span') // add title text
            .style('font-weight', '600') // make title bold
            .style('color', '#2C3E50') // use dark blue text
            .style('margin-right', '15px') // add space after title
            .text('Workday Alcohol Level:'); // write legend title text

        // Add legend items
        averageData.forEach((group, i) => { // go through each alcohol level
            const item = legendDiv.append('span') // add a span for each legend item
                .style('display', 'inline-flex') // put color and text side by side
                .style('align-items', 'center') // line up color and text
                .style('gap', '6px'); // add space between color and text

            // Color line
            item.append('span') // add a span for the color line
                .style('width', '24px') // set line width
                .style('height', '4px') // set line height
                .style('background-color', alcoholColors[group.level]) // use the alcohol level color
                .style('display', 'inline-block'); // make it an inline block to show the color

            // Label text
            item.append('span') // add a span for the label text
                .style('color', '#2C3E50') // use dark blue text
                .text(`Level ${group.level} (n=${group.count})`); // write level and n count
        });
    }
}

// Load the CSV file.
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

// Make data for the bar chart.
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

// Make gender split data for the bar chart.
function processChart1DataByGender(data) {
    const result = [];
    [1, 2, 3, 4, 5].forEach(level => {
        const femaleData = data.filter(d => +d.Dalc === level && d.sex === 'F');
        const maleData = data.filter(d => +d.Dalc === level && d.sex === 'M');
        
        result.push({
            level: level,
            gender: 'F',
            avgAbsences: d3.mean(femaleData, d => +d.absences) || 0,
            count: femaleData.length
        });
        
        result.push({
            level: level,
            gender: 'M',
            avgAbsences: d3.mean(maleData, d => +d.absences) || 0,
            count: maleData.length
        });
    });
    return result;
}

// Put absence numbers into bins.
function getAbsenceBin(absences) {
    if (absences === 0) return '0';

    if (absences <= 2) return '1-2';

    if (absences <= 5) return '3-5';

    if (absences <= 10) return '6-10';

    if (absences <= 20) return '11-20';

    return '21+';
}

// Put final grades into bands.
function getGradeBand(grade) {
    if (grade <= 4) return '0-4';

    if (grade <= 8) return '5-8';

    if (grade <= 12) return '9-12';

    if (grade <= 16) return '13-16';

    return '17-20';
}

// Make data for the heatmap.
function processChart2Data(data, addressFilter = 'all', alcoholLevel = null) {
    const absenceBins = ['0', '1-2', '3-5', '6-10', '11-20', '21+'];

    const gradeBands = ['0-4', '5-8', '9-12', '13-16', '17-20'];

    // Filter by settlement if needed
    let filteredData = data;
    if (addressFilter !== 'all') {
        filteredData = data.filter(d => d.address === addressFilter);
    }
    
    // Filter by alcohol level if one is clicked
    if (alcoholLevel !== null) {
        filteredData = filteredData.filter(d => +d.Dalc === alcoholLevel);
    }

    const binnedRows = filteredData.map(d => ({
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

// Make data for the line profile chart.
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

// Main function that loads data and draws charts.
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

// This stops resize from redrawing too many times.
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

// Draw the dashboard again after resizing.
const handleResize = debounce(() => { initializeDashboard(); }, 250);

// Redraw when window size changes.
window.addEventListener('resize', handleResize);

// Prevent wheel zoom on the entire page except chart-3
document.addEventListener('wheel', function(event) {
    // Check if the event is coming from chart-3
    if (!event.target.closest('#chart-3')) {
        // If not from chart-3, prevent default zoom behavior
        if (event.ctrlKey) {
            event.preventDefault();
        }
    }
}, { passive: false });

// Prevent pinch-to-zoom gestures on the page
document.addEventListener('gesturestart', function(event) {
    event.preventDefault();
}, { passive: false });

document.addEventListener('gesturechange', function(event) {
    event.preventDefault();
}, { passive: false });

document.addEventListener('gestureend', function(event) {
    event.preventDefault();
}, { passive: false });

// Gender checkbox code.
document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();
    
    // Add container event listeners ONCE (not inside initializeDashboard which runs on resize)
    const container1 = document.getElementById('chart-1');
    const container2 = document.getElementById('chart-2');
    const container3 = document.getElementById('chart-3');
    
    // Prevent wheel events on chart-1 and chart-2 from zooming the page
    if (container1) {
        container1.addEventListener('wheel', function(event) {
            event.preventDefault();
            event.stopPropagation();
        }, { passive: false });
    }
    
    if (container2) {
        container2.addEventListener('wheel', function(event) {
            event.preventDefault();
            event.stopPropagation();
        }, { passive: false });
    }
    
    // Prevent wheel events on chart-3 from bubbling to parent (but allow zoom within chart-3)
    if (container3) {
        container3.addEventListener('wheel', function(event) {
            event.preventDefault(); // Prevent page zoom
            event.stopPropagation(); // Stop event from bubbling up
        }, { passive: false });
    }
    
    const checkbox = document.getElementById('gender-breakdown-checkbox');
    if (checkbox) {
        checkbox.addEventListener('change', async function() {
            const container1 = document.getElementById('chart-1');
            const data = await loadData();
            
            if (this.checked) {
                // Show gender split bars
                const genderData = processChart1DataByGender(data);
                charts.chart1.updateWithGenderBreakdown(genderData, true, container1.clientWidth, container1.clientHeight);
            } else {
                // Show normal bars
                const normalData = processChart1Data(data);
                charts.chart1.updateWithGenderBreakdown(normalData, false, container1.clientWidth, container1.clientHeight);
            }
        });
    }

    // Checkbox for individual lines in the profile chart.
    const studentLinesCheckbox = document.getElementById('show-student-lines-checkbox');
    if (studentLinesCheckbox) {
        studentLinesCheckbox.addEventListener('change', function() {
            showStudentLines = this.checked;
            updateParallelCoordinatesHighlight();
        });
    }
    
    // Settlement dropdown code.
    const dropdown = document.getElementById('address-filter-dropdown');
    if (dropdown) {
        dropdown.addEventListener('change', async function() {
            const container2 = document.getElementById('chart-2');
            const data = await loadData();
            
            // Use the same update function here too
            updateHeatmapFilter();
        });
    }
});
