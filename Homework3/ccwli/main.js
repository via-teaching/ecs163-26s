// ECS163 HW3 (updated from HW2)
// Xinyi Li
// ccwli@ucdavis.edu
// Student Alcohol Consumption Dataset (Math)

// --- Layout & configuration ---
let abFilter = 25;
const width = window.innerWidth;
const height = window.innerHeight;

//initializa svg container
const svg = d3.select("svg")
    .attr("width", width)
    .attr("height", height);

// responsive layout
const padding = 60;
const topRowHeight = Math.min(350, height * 0.42);

// margrins for 3 (i didn't renamed the margrin names from the templete)
let scatterMargin = {top: 50, right: 30, bottom: 60, left: 60};
let distrMargin = {top: 50, right: 30, bottom: 60, left: 60};
let teamMargin = {top: 50, right: 20, bottom: 50, left: 80};

// dimensions for top row charts
let scatterWidth = width * 0.35;
let scatterHeight = Math.min(280, topRowHeight * 0.7);

let distrWidth = width * 0.35;
let distrHeight = Math.min(280, topRowHeight * 0.7);

// positions 
let scatterLeft = padding;

let distrLeft = width * 0.52;
let distrTop = 50;

// bottom PCP chart
let teamTop = scatterHeight + 140;

let teamWidth = width * 0.82;
let teamHeight = height * 0.3;

// Overview Visualization: Heatmap
// track active categorical selection from Heatmap
let selectedHeatmapCell = null; 
let activeBrushes = {};// brush selection state for PCP
let isHoveringScatter = false; // animation Lock, prevents layout flashes
let lockedScatterIds = [];// multi-select scatter click lock

// cached references for structured enter/update/exit patterns and scales
let processedData = [];// store processed dataset
let heatmapData = [];//initialize heatmap data array for storage

// visualization components
let x1, y1, g1, circles;// scatter plot scales, group, circles
let x2, y2, g2, colorScale;// heatmap scales, group, color scale
let xScalePCP, yScales, g3, pcpLines, dimensions;// PCP scales, group, lines, dimensions

const tooltip = d3.select("#tooltip");// tooltip

// axis label mapping for PCP
const axisLabels = {
    studytime: "Study Time",
    failures: "Past Failures",
    absences: "Absences",
    Walc: "Weekend Alcohol",
    G3: "Final Grade"
};

// ---  Data Loading & Processing ---
d3.csv("student-mat.csv").then(rawData =>{ //load dataset and tooltip
    console.log("rawData", rawData);

    rawData.forEach(function(d,i){
        d.id = i;// assign unique id for cross-linking
        d.studytime = Number(d.studytime); //convert strings to numbers
        d.G3 = Number(d.G3);
        d.absences = Number(d.absences);
        d.Walc = Number(d.Walc);
        d.Dalc = Number(d.Dalc);
    });

    const filteredData = rawData;
    processedData = filteredData.map(d=>{// assign unique id for cross-linking
                          return {
                            'id': d.id,
                            'studytime': d.studytime,
                            'failures': Number(d.failures),
                            'G3': d.G3,
                            'absences': d.absences,
                            'sex': d.sex,
                            'Walc': d.Walc,
                            'Dalc': d.Dalc
                          };
    });
    console.log("processedData", processedData);//check processedData works

    // add jitter for better visibility in scatter plot
    // (jitter reduces overlap for discrete studytime values）
    // store as properties to keep consistent across interactions
    processedData.forEach(d => {
        d.jitterX = (Math.random() - 0.5) * 15;
        d.jitterY = (Math.random() - 0.5) * 10;
    });

    // build a 5*5 grid of walc*dalc combination
    for (let walc = 1; walc <= 5; walc++){
        for (let dalc = 1; dalc <= 5; dalc++){

            // filter students in each alcohol consumption category pair
            const group = processedData.filter(d =>
                d.Walc === walc && d.Dalc === dalc 
            );

            const avgG3 = d3.mean(group, d => d.G3);//average g3 for each combination

            heatmapData.push({//store heatmap data
                Walc: walc,
                Dalc: dalc,
                avgG3: avgG3 || 0, 
                studentCount: group.length //count of students in this category
            });
        }
    }
    console.log("heatmapData", heatmapData); // check heatmapData structure

    // Call HW3 setup structure
    initVis();
    updateVis();

}).catch(function(error){// error handling
    console.log(error);
});


// --- initialize static components ---
function initVis() {
    
    // --- plot 1: Scatter Plot for study time and final grade ---
    // correlation between study time and final grade/ G3
    
    //postion
    g1 = svg.append("g")
                .attr("width", scatterWidth + scatterMargin.left + scatterMargin.right)
                .attr("height", scatterHeight + scatterMargin.top + scatterMargin.bottom)
                .attr("transform", `translate(${scatterMargin.left}, ${scatterMargin.top})`);

    // X label
    g1.append("text")
    .attr("x", scatterWidth / 2)
    .attr("y", scatterHeight + 50)
    .attr("text-anchor", "middle")
    .text("Study Time");

    // Y label
    g1.append("text")
    .attr("x", -(scatterHeight / 2))
    .attr("y", -40)
    .attr("font-size", "16px")
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("Final Grade (G3)");

    //title
    g1.append("text")
    .attr("x", scatterWidth / 2)
    .attr("y", -15)
    .attr("text-anchor", "middle")
    .attr("font-size", "18px")
    .text("Does More Study Time Improve Final Grades?");

    // X ticks, map study time to pixel width
    x1 = d3.scaleLinear()
    .domain([0, d3.max(processedData, d => d.studytime)])// data range
    .range([0, scatterWidth]);// pixel range on svg
    
    // x axis generator
    const xAxisCall = d3.axisBottom(x1)
                        .ticks(7);//number of ticks shown

    g1.append("g")// append x axis to scatter plot group
        .attr("transform", `translate(0, ${scatterHeight})`)// move axis to bottom of chart
        .call(xAxisCall)
        .selectAll("text")
            .attr("y", "10")
            .attr("x", "-5")
            .attr("text-anchor", "end")
            .attr("transform", "rotate(-40)");// rotate labels to avoid overlap

    // Y ticks, map final grade to pixel height
    y1 = d3.scaleLinear()
        .domain([0, d3.max(processedData, d => d.G3)])
        .range([scatterHeight, 0]);// inverted range,  svg y increases downward

    // y axis generator    
    const yAxisCall = d3.axisLeft(y1)
                        .ticks(13);
    g1.append("g")
        .call(yAxisCall);// append y axis to scatter plot group

    //legend
    const legend = g1.append("g")
        .attr("transform", "translate(10,-10)");//position

    legend.append("rect")//pink, female
        .attr("width", 10)
        .attr("height", 10)
        .attr("fill", "#ff69b4");

    legend.append("text")
        .attr("x", 15)
        .attr("y", 10)
        .text("Female");

    legend.append("rect")//blue, male
        .attr("x", 80)
        .attr("width", 10)
        .attr("height", 10)
        .attr("fill", "#4682b4");

    legend.append("text")
        .attr("x", 95)
        .attr("y", 10)
        .text("Male");

    // scatter dots, jitter for better visibility, class for selection
    circles = g1.selectAll("circle").data(processedData)
         .enter().append("circle")

         // use cached jitter offsets
         .attr("cx", d => x1(d.studytime) + d.jitterX) 
         .attr("cy", d => y1(d.G3) + d.jitterY)

         .attr("r", 5)//dot size
         .attr("class", d => "scatter-dot dot-" + d.id)// class for selection
         .attr("fill", d => d.sex==='F'? '#ff69b4':'#4682b4')// color by gender

         .on("mouseover", handleMouseOver)//hover effect defined latter
         .on("mouseout", handleMouseOut)
         .on("click", handleScatterClick);


    //--- plot 2: Heatmap for alcohol consumption and final grade ---
    // overview plot for HW3

    //create container group, position
    g2 = svg.append("g")
                .attr("width", distrWidth + distrMargin.left + distrMargin.right)
                .attr("height", distrHeight + distrMargin.top + distrMargin.bottom)
                .attr("transform", `translate(${distrLeft}, ${distrTop})`);

    // x scale, weekend alcohol consumption
    x2 = d3.scaleBand()
        .domain([1,2,3,4,5])
        .range([0,distrWidth]);

    // y scale, workday alcohol consumption
    y2 = d3.scaleBand()
        .domain([1,2,3,4,5])
        .range([distrHeight, 0]);

    //color, map ave grade to color intensity
    colorScale = d3.scaleSequential()
        .interpolator(d3.interpolateYlOrRd)
        .domain([20, 0]);

    // x axis
    g2.append('g')
        .attr('transform', `translate(0, ${distrHeight})`)
        .call(d3.axisBottom(x2));

    //y axis
    g2.append('g')
        .call(d3.axisLeft(y2));

    // Heatmap squares
    g2.selectAll("rect")
        .data(heatmapData)
        .enter()
        .append("rect")
        .attr("class", "heatmap-cell") // selection identifier class
        .attr("x", d => x2(d.Walc))// position by weekend alcohol consumption
        .attr("y", d => y2(d.Dalc))// position by workday alcohol consumption
        .attr("width", x2.bandwidth())// size to fill grid cell
        .attr("height", y2.bandwidth())

        //encode average grade as color
        //if no students in this category, show as light gray to indicate lack of data
        .attr("fill", d => d.studentCount === 0 ? "#eeeeee" : colorScale(d.avgG3))
        
        .attr("stroke", "white")//visual separation between cells
        .attr("stroke-width", 0.5)
        
        // conditional interactivity: only enable hover and click if student count > 0
        .style("cursor", d => d.studentCount === 0 ? "default" : "pointer")
        .style("pointer-events", d => d.studentCount === 0 ? "none" : "all")


        // mouseover effect for heatmap cells
        // show tooltip and highlight corresponding lines, dots in other charts
        .on("mouseover", function(d) {
            tooltip
                .style("opacity", 1)
                .style("pointer-events", "all")// make tooltip interactive to allow mouseover without flicker
                .html(
                    `Workday Alcohol (Dalc): ${d.Dalc}<br> // show dalc, walc, avg final grade for hovered cell
                     Weekend Alcohol (Walc): ${d.Walc}<br>
                     Avg Final Grade: ${d.avgG3.toFixed(2)}<br>
                     Students Enrolled: ${d.studentCount}` // transformed context clarity metric
                );

            // conditional context hover styling
            // only run if no selection lock exists
            if (!selectedHeatmapCell && !isHoveringScatter) {
                pcpLines.style("opacity", p => (p.Walc === d.Walc && p.Dalc === d.Dalc) ? 1 : 0.03);// highlight matched lines, fade others

                circles.style("opacity", c => (c.Walc === d.Walc && c.Dalc === d.Dalc) ? 0.9 : 0.03);// highlight matched dots, fade others
            }
        })

        .on("mousemove", function() {//mousemove effect
            tooltip
                .style("left", (d3.event.pageX + 10) + "px")// position tooltip near mouse cursor
                .style("top", (d3.event.pageY + 10) + "px");
        })

        .on("mouseout", function() {//mouseout effect
            tooltip.style("opacity", 0);
            if (!selectedHeatmapCell && !isHoveringScatter) {// only reset if no selection lock exists
                updateVis(); 
            }
        })
        
        .on("click", function(d) {// click effect: toggle selection lock for this cell
            d3.event.stopPropagation();// prevent click from propagating to svg background

            // if click selected cell, clear selection
            if (selectedHeatmapCell && selectedHeatmapCell.Walc === d.Walc && selectedHeatmapCell.Dalc === d.Dalc) {
                selectedHeatmapCell = null; 
                d3.selectAll(".heatmap-cell").attr("stroke", "white").attr("stroke-width", 0.5);// reset all cells to default border
            } else {
                selectedHeatmapCell = d; // update selection lock to current cell
                d3.selectAll(".heatmap-cell").attr("stroke", "white").attr("stroke-width", 0.5);
                d3.select(this).attr("stroke", "black").attr("stroke-width", 2); // highlight selected cell with black border
            }
            updateVis();
        });


    // Title
    g2.append("text")
        .attr("x", distrWidth / 2)
        .attr("y", -15)
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .text("Higher Alcohol Consumption is Associated with Lower Grades");


     // X label
    g2.append("text")
        .attr("x", distrWidth/2)
        .attr("y", distrHeight + 50)
        .attr("font-size", "15px")
        .attr("text-anchor", "middle")
        .text("Weekend Alcohol Consumption (Walc)");


    // Y label
    g2.append("text")
        .attr("x", -(distrHeight/2))
        .attr("y", -40)
        .attr("font-size", "15px")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text("Workday Alcohol Consumption (Dalc)");

    // heatmap Legend
    const legendHeight = 150;
    const legendWidth = 15;

    const legendScale = d3.scaleLinear() // dark for bad grade to show serious, light for good grade
        .domain([20, 0])
        .range([0, legendHeight]);

    const legendAxis = d3.axisRight(legendScale)// create axis for legend
        .ticks(5);

    const defs = svg.append("defs");// define a linear gradient for heatmap legend
    const linearGradient = defs.append("linearGradient")
        .attr("id", "heatmap-gradient")
        .attr("x1", "0%")
        .attr("y1", "0%")   // top
        .attr("x2", "0%")
        .attr("y2", "100%"); // bottom

    // color stops
    linearGradient.selectAll("stop")
        .data([
            {offset: "0%", color: d3.interpolateYlOrRd(0)},   // top, 20pt, light yellow
            {offset: "25%", color: d3.interpolateYlOrRd(0.25)},
            {offset: "50%", color: d3.interpolateYlOrRd(0.5)},
            {offset: "75%", color: d3.interpolateYlOrRd(0.75)},
            {offset: "100%", color: d3.interpolateYlOrRd(1)}  // bottom, 0 pt, dark red
        ])
        .enter()
        .append("stop")
        .attr("offset", d => d.offset)
        .attr("stop-color", d => d.color);

    const hmlegend = g2.append("g")//position
        .attr("transform", `translate(${distrWidth + 30}, 20)`);

    // gradient rect
    hmlegend.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#heatmap-gradient)");

    // axis
    hmlegend.append("g")
        .attr("transform", `translate(${legendWidth}, 0)`)
        .call(legendAxis);

    // label
    hmlegend.append("text")
        .attr("x", -10)
        .attr("y", -10)
        .text("Avg G3")
        .style("font-size", "12px");


// --- Plot 3: Parallel Coordinates Plot ---

    dimensions = [//dimensions used
        'studytime',
        'failures',
        'absences',
        'Walc',
        'G3'
    ];

    // y scale
    yScales = {};
    dimensions.forEach(name => {
        yScales[name] = d3.scaleLinear()
            .domain(d3.extent(processedData, d => +d[name]))
            .range([teamHeight, 0]);
    });

    // x scale
    xScalePCP = d3.scalePoint()
        .range([0, teamWidth])
        .domain(dimensions);

    // lineup
    function path(d) {
        return d3.line()(dimensions.map(p => [xScalePCP(p), yScales[p](d[p])]));
    }

    g3 = svg.append("g")// position
        .attr("width", teamWidth + teamMargin.left + teamMargin.right)
        .attr("height", teamHeight + teamMargin.top + teamMargin.bottom)
        .attr("transform",`translate(${teamMargin.left}, ${teamTop + teamMargin.top})`)

    // plot line
    pcpLines = g3.selectAll(".line")
        .data(processedData)
        .enter()
        .append("path")
        .attr("class", d => "line line-" + d.id)
        .attr("d", path)
        .style("fill", "none")
        .style("stroke", d => d.sex === 'F' ? '#ff69b4' : '#4682b4')//pink female, blue male
        .style("stroke-width", 1.5)
        .style("opacity", 0.4);

    // axis
    g3.selectAll("myAxis")
        .data(dimensions).enter()
        .append("g")
        .attr("transform", d => `translate(${xScalePCP(d)})`)
        .each(function(d) { d3.select(this).call(d3.axisLeft(yScales[d])); })// generate axis for each dimension
        .append("text")
        .style("text-anchor", "middle")
        .attr("y", -10)
        .text(d => axisLabels[d])
        .style("fill", "black")
        .style("font-size", "12px");


    // brushing interaction: select range in pcp, show included lines in pcp and dots in scatter
    // vertical brush on each pcp axis
    g3.selectAll(".brush")
        .data(dimensions)
        .enter()
        .append("g")
        .attr("class", "brush")
        .attr("transform", d => `translate(${xScalePCP(d)},0)`)
        .each(function(dim) {

            d3.select(this).call(//attach a vertical brush to each axis
                d3.brushY()
                    .extent([
                        [-10, 0],// slight horizontal padding
                        [10, teamHeight]// full vertical range of chart
                    ])
                    .on("brush end", brushed)// update on interaction
            );

        });

    // title
    g3.append("text")
        .attr("x", teamWidth / 2)
        .attr("y", -25)
        .attr("text-anchor", "middle")
        .attr("font-size", "20px")
        .text("Multivariate Analysis: Factors impacting final grade (G3)");

    // legend

    const pcpLegend = g3.append("g")
        .attr("transform", `translate(${teamWidth -90}, -35)`);//position

    // pink female
    pcpLegend.append("rect")
        .attr("width", 10)
        .attr("height", 10)
        .attr("fill", "#ff69b4");

    pcpLegend.append("text")
        .attr("x", 15)
        .attr("y", 10)
        .style("font-size", "12px")
        .text("Female");

    // blue male
    pcpLegend.append("rect")
        .attr("y", 20) 
        .attr("width", 10)
        .attr("height", 10)
        .attr("fill", "#4682b4");

    pcpLegend.append("text")
        .attr("x", 15)
        .attr("y", 30)
        .style("font-size", "12px")
        .text("Male");


    // global click listener on SVG background
    // clear all selections and reset to default view

    svg.on("click", function() {
        // reset all interaction locks and visual states to default
        lockedScatterIds = [];// clear scatter click locks
        isHoveringScatter = false;// release hover lock
        d3.selectAll(".scatter-dot").attr("r", 5).style("stroke", "none");
        
        selectedHeatmapCell = null;// clear heatmap selection
        d3.selectAll(".heatmap-cell").attr("stroke", "white").attr("stroke-width", 0.5);

        g3.selectAll(".brush").each(function() {// clear all brushes
            d3.select(this).call(d3.brushY().move, null);
        });
        
        pcpLines.style("display", null);// ensure all lines visible

        d3.selectAll(".line").style("stroke-width", "1.5px");// reset line widths
        updateVis();
    });
}

// update visualization function
// call after interactions that changes selection state

function updateVis() {
    if (isHoveringScatter) return;// prevent updates while hovering
    const transitionDuration = 800;// transition duration for smooth updates

    // helper function
    // check if a data point matches current heatmap and brush filters
    function matchesActiveFilter(d) {

        // check heatmap selection
        let heatmapMatch = true;
        if (selectedHeatmapCell) {// if a heatmap cell is selected, only match data points in that cell
            heatmapMatch = (d.Walc === selectedHeatmapCell.Walc && d.Dalc === selectedHeatmapCell.Dalc);
        }

        // check PCP brushes
        let brushMatch = true;
        if (Object.keys(activeBrushes).length > 0) {// if any brush is active, only match data points that fall within active brush ranges
            brushMatch = Object.keys(activeBrushes).every(dim => {
                const range = activeBrushes[dim];
                // check if data point's value falls within the brush range
                return d[dim] <= range[0] && d[dim] >= range[1]; 
            });
        }

        return heatmapMatch && brushMatch;// only match if both heatmap and brush criteria are satisfied
    }

    // match animation to PCP lines
    pcpLines.transition()
        .duration(transitionDuration)
        .style("opacity", d => matchesActiveFilter(d) ? 0.5 : 0.02)// highlight matched lines, fade others
        .style("stroke-width", d => matchesActiveFilter(d) ? 1.75 : 0.5)// thicken matched lines for emphasis
        .style("stroke", d => {

            // if no heatmap cell selected, use default
            if (!selectedHeatmapCell) return d.sex === 'F' ? '#ff69b4' : '#4682b4';

            // if line matches selected heatmap cell but not brush, show as light gray to indicate partial match
            return matchesActiveFilter(d) ? (d.sex === 'F' ? '#ff69b4' : '#4682b4') : '#ccc';
        });

    // animation Scatter Plot dots
    circles.transition()
        .duration(transitionDuration)
        .style("opacity", d => matchesActiveFilter(d) ? 0.9 : 0.04)// highlight matched dots, fade others
        .attr("r", d => matchesActiveFilter(d) ? 5 : 1.5);// shrink unmatched dots for emphasis

    circles
        .style("pointer-events", d => matchesActiveFilter(d) ? "all" : "none")// disable mouse events for unmatched dots
        .style("cursor", d => matchesActiveFilter(d) ? "pointer" : "default");// change cursor to indicate interactivity only for matched dots
}


// function for brush, the filter logic
function brushed() {
    activeBrushes = {}; // reset active brushes

    g3.selectAll(".brush").each(function(dim) {// for each brush, check if it has a selection
        const selection = d3.brushSelection(this);
        if (selection) {
            activeBrushes[dim] = selection.map(yScales[dim].invert);// if brush is active, store the data range covered in activeBrushes
        }
    });
    
    updateVis(); 
}


// hover interaction function
function handleMouseOver(d) {

    // only allow hover effects for locked points to prevent interaction conflicts
    if (lockedScatterIds.length > 0 && !lockedScatterIds.includes(d.id)) return;
    if (lockedScatterIds.length > 0) return;

    isHoveringScatter = true; //state lock: stop updateVis transitions from intercepting styles

    // other dots and path darken
    d3.selectAll(".scatter-dot").style("opacity", 0.05);
    d3.selectAll(".line").style("opacity", 0.01);

    // highlight selected dot
    d3.select(this)
        .transition().duration(200)
        .style("opacity", 1)
        .attr("r", 10)
        .style("stroke", "black")
        .style("stroke-width", "2px");

    // highlight lines in pcp
    d3.selectAll(".line-" + d.id)
        .raise()// move line to the front
        .style("opacity", 1)
        .style("stroke-width", "5px")
        .style("stroke", "orange");
}

// back to normal
function handleMouseOut(event, d) {// only allow hover effects for locked points
    if (lockedScatterIds.includes(d.id)) return;
    if (lockedScatterIds.length > 0) return;

    isHoveringScatter = false; // release lock

    // reset dots
    d3.select(this)
        .transition().duration(200)
        .attr("r", 5)
        .style("stroke", "none");
    
    // reset pcp lines
    d3.selectAll(".line")
        .style("stroke-width", "1.5px");

    // smoothly restore visibility state matching current dashboard criteria
    updateVis();
}

// click interaction function for scatter plot dots
function handleScatterClick(d) {
    d3.event.stopPropagation();// prevent click from propagating to svg background and clearing selection

    // if this dot doesn't match current heatmap selection, ignore click to prevent interaction conflicts
    if (selectedHeatmapCell && (d.Walc !== selectedHeatmapCell.Walc || d.Dalc !== selectedHeatmapCell.Dalc)) {
        return;
    }

    // toggle selection lock for this dot
    const index = lockedScatterIds.indexOf(d.id);
    // if already locked, unlock; if not locked, lock
    if (index > -1) {
        lockedScatterIds.splice(index, 1);
    } else {
        lockedScatterIds.push(d.id);
    }
    
    // if no dots are locked, release hover lock and reset styles
    if (lockedScatterIds.length === 0) {
        isHoveringScatter = false;
        d3.selectAll(".scatter-dot").attr("r", 5).style("stroke", "none");
        d3.selectAll(".line").style("stroke-width", "1.5px");
        updateVis();
    } else {// if there are locked dots, maintain hover lock and update styles to highlight locked dots and lines
        isHoveringScatter = true;

        d3.selectAll(".line").style("opacity", 0.02).style("stroke-width", "0.5px");// dim all lines by default

        
        processedData.forEach(p => {

            // check if this data point matches current heatmap selection, brush selection, click lock status
            const inHeatmapRange = !selectedHeatmapCell || (p.Walc === selectedHeatmapCell.Walc && p.Dalc === selectedHeatmapCell.Dalc);
            const inBrushRange = Object.keys(activeBrushes).length === 0 || Object.keys(activeBrushes).every(dim => p[dim] <= activeBrushes[dim][0] && p[dim] >= activeBrushes[dim][1]);
            const isDotClicked = lockedScatterIds.includes(p.id);

            // if data point matches heatmap and brush filters, highlight when clicked, otherwise dim
            // if not match filters, fade
            if (inHeatmapRange && inBrushRange) {
                // scatter dot
                d3.select(".dot-" + p.id)// select dot by class
                    .style("opacity", 0.9) // highlight if matches filters
                    .attr("r", isDotClicked ? 10 : 5)// enlarge if clicked
                    .style("stroke", isDotClicked ? "black" : "none") // add stroke if clicked
                    .style("stroke-width", isDotClicked ? "2.5px" : "0px");

                // pcp line
                if (isDotClicked) {// if clicked, highlight corresponding line in pcp
                    d3.selectAll(".line-" + p.id)
                        .raise()
                        .style("opacity", 1)
                        .style("stroke-width", "5px")
                        .style("stroke", "orange");
                } else {// if not clicked but matches filters, show as normal
                    d3.selectAll(".line-" + p.id)
                        .style("opacity", 0.3)
                        .style("stroke-width", "1.5px")
                        .style("stroke", p.sex === 'F' ? '#ff69b4' : '#4682b4');
                }
            } else {// if data point doesn't match filters, fade
                d3.select(".dot-" + p.id)
                    .style("opacity", 0.04)
                    .attr("r", 1.5)
                    .style("stroke", "none");
                    
                if (!isDotClicked) {
                    d3.selectAll(".line-" + p.id)
                        .style("stroke", "#ccc");
                }
            }
        });
    }
}

window.addEventListener("resize", () => {
    location.reload(); // when window resizes, reload page for responsive layout
});

// I used ChatGPT to help with the layout style

//HW2:
// (spend a lot of time stucked at fixed layout vs fitting layout)
// Also helped with interaction functions
// (stucked at the hover, but seem like the data already overlap heavily 
// and this makes the pcp not obviously reacted to hover from scatter/heatmap)
// Debugging
// And used it to check my work meets requirements
// At the very beginning, used it to learn how to clone from github, etc

//HW3:
// Used it to help with the heatmap and pcp setup
// Solved the poor hover effect in the scatter plot
// Debug interaction conflicts
// Helped with interaction locks to manage complex interactions
// check rubric requirements and make sure all met
