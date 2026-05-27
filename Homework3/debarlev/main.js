
// Dataset includes the SF Historical Ballot Measures from 1961 to 2010
const width = window.innerWidth;
const height = window.innerHeight;

let lineLeft = 0, lineTop = 0;
let lineMargin = { top: 42, right: 60, bottom: 40, left: 60 },
    lineWidth = width / 2 - lineMargin.left - lineMargin.right,
    lineHeight = height / 2 - lineMargin.top - lineMargin.bottom;

let heatLeft = width / 1.9, heatTop = 0;
let heatMargin = { top: 40, right: 20, bottom: 70, left: 130 },
    heatWidth = width / 2.5 - heatMargin.left - heatMargin.right,
    heatHeight = height / 2.5 - heatMargin.top - heatMargin.bottom;

let streamLeft = 0, streamTop = height / 1.8;
let streamMargin = { top: 35, right: 60, bottom: 50, left: 10 },
    streamWidth = width - streamMargin.left - streamMargin.right + 45,
    streamHeight = height / 2.5 - streamMargin.top - streamMargin.bottom;


const billType = {
    "C": "Charter Amendment",
    "O": "Ordinance",
    "B": "Bond",
    "P": "Policy",
    "L": "Legislation",
    "T": "Tax",
    "RM": "Revenue Measure"
}; // Organizing the bill types

const relevantSponsors = {
    "S": "Supervisor",
    "I": "Initiative",
    "M": "Mayor",
    "L": "Legislature"
}; // organizing the relevant sponsors

const subjectTypes = [
    "Charter Amendment", 
    "Ordinance", 
    "Bond", 
    "Policy", 
    "Legislation", 
    "Tax", 
    "Revenue Measure"
]; // Organizing the subject types for the bills into a list.

const streamColors = {
    "Charter Amendment": "#1b9e77",
    "Ordinance": "#d95f02",
    "Bond": "#7570b3",
    "Policy": "#e7298a",
    "Legislation": "#66a61e",
    "Tax": "#e6ab02",
    "Revenue Measure": "#a6761d"
}; // sorting the stream colors for easy use

d3.csv("List_of_Historical_Ballot_Measures_20260512.csv").then(function(rawData) {
    for (let i = 0; i < rawData.length; ++i) { // looping over every row in the csv
        const d = rawData[i];
        d.Year = +d.Year; // the plus sign turns the strings into numerics
        d["Yes Votes"] = +d["Yes Votes"].replace(/,/g, "");
        d["No Votes"] = +d["No Votes"].replace(/,/g, ""); // removing the commas from yes votes and no votes columsn (contain the vote counts)
        d.totalVotes = d["Yes Votes"] + d["No Votes"]; // adds the rows together used for filtering later
        d.Percent = +d.Percent; // makes the string percentage into a number
        d.typeLabel = billType[d["Type Measure"]] || d["Type Measure"]; //validates that labels are actually part of the dataset
        d.passed = (d["Pass or Fail"] === "P") ? 1 : 0; // helps pass rate calculations by making it numerical
    }

    //Visualization 1: Line Chart
    const dataFiltering = rawData.filter(d => d.totalVotes > 0 && !isNaN(d.Percent)); // remove missing data
    const svg = d3.select("svg");

    const passRatePerYear = d3.nest() // groups the rows by year
        .key(d => d.Year)
        .rollup(v => ({ // gives back the summary values
            totalNumBills: v.length, // the total number of bills per groups
            passRate: d3.mean(v, d => d.passed) // average in the "passsed" column among all bills for a specific year
        }))
        .entries(dataFiltering)
        .map(r => ({ year: +r.key, totalNumBills: r.value.totalNumBills, passRate: r.value.passRate })) // maps out the calculated values
        .sort((a, b) => a.year - b.year); // sorts in chronological order

    const g1 = svg.append("g")
        .attr("transform", `translate(${lineMargin.left}, ${lineMargin.top})`); // setting upt the margins

    g1.append("text")
        .attr("x", lineWidth / 2.5)
        .attr("y", lineHeight + 35) // trying to make it as centered as possible
        .attr("font-size", "12px")
        .attr("text-anchor", "middle")
        .text("Year"); // x-axis label

    g1.append("text")
        .attr("x", -(lineHeight / 2.5))
        .attr("y", -40)
        .attr("font-size", "12px")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)") // making sure the label is accurate positioned
        .text("Percentage of Bills Passed"); // y-axis label

    g1.append("text")
        .attr("x", lineWidth / 2.5)
        .attr("y", -18)
        .attr("font-size", "15px")
        .attr("text-anchor", "middle")
        .text("Bill Pass Rate through years 1961-2010"); // chart titel

    const interactionInstructions = g1.append("text")
        .attr("x", lineWidth)
        .attr("y", lineHeight -320)
        .attr("font-size", "12px")
        .attr("text-anchor", "middle")
        .text("Brush the line chart to filter the Heat Map and Stream Graph"); // adding instructions for the visualizations

    const xL = d3.scaleLinear()
        .domain(d3.extent(passRatePerYear, d => d.year))
        .range([0, lineWidth]); // scale for x-axis from 0-line width

    const yL = d3.scaleLinear()
        .domain([0, 1])
        .range([lineHeight, 0]); // scale for y-axis from lineheight-0

    g1.append("g")
        .attr("transform", `translate(0, ${lineHeight})`)
        .call(d3.axisBottom(xL).ticks(15).tickFormat(d3.format("d"))) //sets up x-axis into a group
        .selectAll("text")
           
    g1.append("g")
        .call(d3.axisLeft(yL).ticks(10).tickFormat(d3.format(".0%"))); // appends y-axis with 10 tick marks, in percentage format

    g1.append("path")
        .datum(passRatePerYear) // binds the dataset into one element
        .attr("fill", "none") // do not want the path area filled in
        .attr("stroke", "#c51b8a")
        .attr("stroke-width", 4)
        .attr("d", d3.line()
            .x(d => xL(d.year))
            .y(d => yL(d.passRate))
        ); // draws the line for the line chart

    g1.selectAll("circle")
        .data(passRatePerYear) // circle at each of the the major pass rates
        .enter()
        .append("circle")
        .attr("cx", d => xL(d.year))
        .attr("cy", d => yL(d.passRate))
        .attr("r", 6);

    // Interaction 1: Brushing the Line Chart to filter the other charts
    function brushLineChart() {
        const brushLineChart = d3.event.selection;

        if (!brushLineChart) {
            billSelectedType = null; // if the user has not selected anything bring set the variable to null
        }
        else {
            const xAxisStart = Math.round(xL.invert(brushLineChart[0]));
            const xAxisEnd = Math.round(xL.invert(brushLineChart[1])); // getting the domain and range for the brushing aspect

            interactionInstructions.text(`Filtered to ${xAxisStart}\u2013${xAxisEnd}`); // Allows the user to see the exact years they selected
    
            xS.domain([xAxisStart, xAxisEnd]); // getting the domain and range and putting them into an object
    
            xAxisGroupS.transition()
                .call(d3.axisBottom(xS).ticks(Math.min(xAxisEnd - xAxisStart, 15)).tickFormat(d3.format("d"))); // modify the axis of the stream graph to the brushed portion of the line chart
            
            g3.selectAll(".stream-path")
                .transition() // creating a smooth transition
                .attr("d", streamArea) // filter the stream area based on the filtered part of the line chart

            g2.selectAll(".heat-rect")
                .transition() 
                .attr("opacity", function() {
                    const billYears = +d3.select(this).attr("data-year");
                    if (billYears >= xAxisStart && billYears <= xAxisEnd) {
                        return 1;
                    }
                    else {
                        return 0.1;
                    }
                }); // changes the opacity of the heat map based on filtered line chart

            g2.selectAll(".heat-label")
                .transition()
                .attr("opacity", function() {
                    if (billYears >= xAxisStart && billYears <= xAxisEnd) {
                        return 1;
                    }
                    else {
                        return 1;
                    }
                }); // makes sure the labels do not disappear
        }


    }
    
    const lineBrush2 = d3.brushX()
        .extent([[0, 0], [lineWidth, lineHeight]]) // used so that the line chart is the only one the user can brush
        .on("brush", brushLineChart)
        .on("end", brushLineChart); // creates the distance the user is allowed to brush

    g1.append("g")
        .attr("class", "brush")
        .call(lineBrush2); // appends the brush function into the line chart

    //Visualization 2: Heatmap
    const imporantYears = [1965, 1970, 1975, 1980, 1985, 1990, 1995, 2000, 2005, 2010]; // only including 10 important years to keep it as readable as possible

    const heatMapSetUp = d3.nest()
        .key(d => d.typeLabel)
        .key(d => d.Year)
        .rollup(v => ({
            count: v.length,
            passRate: d3.mean(v, d => d.passed)
        }))
        .object(dataFiltering); // returns a nested object, to make values easier to look up

    const g2 = svg.append("g")
        .attr("transform", `translate(${heatLeft + heatMargin.left}, ${heatMargin.top})`); //setting up the space on the dashboard for the heatmap

    g2.append("text")
        .attr("x", heatWidth / 2)
        .attr("y", heatHeight + 62)
        .attr("font-size", "12px")
        .attr("text-anchor", "middle")
        .text("Years"); // x-axis title

    g2.append("text")
        .attr("x", -(heatHeight / 2))
        .attr("y", -120)
        .attr("font-size", "13px")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text("Bill Type"); // y-axis title

    g2.append("text")
        .attr("x", heatWidth / 2)
        .attr("y", -15)
        .attr("font-size", "15px")
        .attr("text-anchor", "middle")
        .text("Bill Pass Rates Every Five Years"); // chart title

    const heatInteractionInstructions = g2.append("text")
        .attr("x", heatWidth / 2) // making the instructions centered
        .attr("y", -4)
        .attr("font-size", "10px")
        .attr("text-anchor", "middle")
        .text("Click a cell to highlight that bill type after you Brush the Line Chart");

    const xH = d3.scaleBand() // divides axis equally among the tick marks
        .domain(imporantYears)
        .range([0, heatWidth]) // 10% of each sections width between eachother

    const yH = d3.scaleBand()
        .domain(subjectTypes)
        .range([0, heatHeight])

    const colorScale = d3.scaleSequential()
        .domain([0, 1])
        .interpolator(d3.interpolateRgbBasis(["#fde0dd", "#fa9fb5", "#c51b8a"])); // blends colors together, change color scale

    g2.append("g")
        .attr("transform", `translate(0, ${heatHeight})`)
        .call(d3.axisBottom(xH).tickFormat(d => d)); // creating tick marks for x axis

    g2.append("g")
        .call(d3.axisLeft(yH)); // creating tick marks for the y-axis

    for (let w = 0; w < subjectTypes.length; ++w) {
        const type = subjectTypes[w];
        for (let e = 0; e < imporantYears.length; ++e) {
            const yr = imporantYears[e];
            if (!heatMapSetUp[type] || !heatMapSetUp[type][yr]) {
                continue;
            }
            else {
                const validCell = heatMapSetUp[type][yr]; // looping over every combo of type and year, while filtering out missing data

                g2.append("rect")
                    .classed("heat-rect", true)
                    .attr("data-year", yr)
                    .attr("data-type", type)
                    .attr("x", xH(yr)) // getting the position
                    .attr("y", yH(type))
                    .attr("width", xH.bandwidth()) // making sure the rectangels are the proper width and height
                    .attr("height", yH.bandwidth())
                    .attr("fill", colorScale(validCell.passRate))
                    .style("cursor", "pointer"); // changing the cursor for the user
                    

                g2.append("text")
                    .classed("heat-label", true)
                    .attr("data-year", yr)
                    .attr("x", xH(yr) + xH.bandwidth() / 2)
                    .attr("y", yH(type) + yH.bandwidth() / 2 + 3) // doing my best to center the percentages in the rectangles
                    .attr("text-anchor", "middle")
                    .attr("font-size", "12px")
                    .text((validCell.passRate * 100).toFixed(0) + "%");

                }
                
        }
    }

    // Interaction 2: Click on heatmap to select a bill type
    let billSelectedType = null; // tracks which bill type row is currently selected

    g2.selectAll(".heat-rect")
        .on("click", function() {
            const clickedTypeHeat = d3.select(this).attr("data-type"); //using this to keep track whether they have clicked on a bill type or not

            if (billSelectedType === clickedTypeHeat) { // if they reclick the same bill type that means they want to reset it
                billSelectedType = null;

                g2.selectAll(".heat-rect")
                    .attr("opacity", 1); // return heat map to normal opacity

                g3.selectAll(".stream-path")
                    .attr("fill-opacity", 1)
                    .attr("stroke-width", 0.6); // making the stream graph normal after heat map is deselected

                heatInteractionInstructions.text("Click a cell to highlight that bill type after you Brush the Line Chart");

            } 
            else {
                billSelectedType = clickedTypeHeat;
                g2.selectAll(".heat-rect")
                    .attr("stroke-width", function() {
                        if (d3.select(this).attr("data-type") === clickedTypeHeat) {
                            return 3;
                        }
                        else {
                            return 0;
                        } // lower the stroke width if it is not selected
                    })
                    .attr("opacity", function() {
                        if (d3.select(this).attr("data-type") === clickedTypeHeat) {
                            return 2;
                        }
                        else {
                            return 0.4;
                        }
                    }); // change the opacity based on selection

                g2.selectAll(".heat-label")
                    .transition().duration(300)
                    .attr("opacity", function() {
                        if (d3.select(this).attr("data-type") === clickedTypeHeat) {
                            return 1;
                        }
                        else {
                            return 1; // makes sure the percentages do not disappear after clicking on the 
                        }
                    }); 

                g3.selectAll(".stream-path")
                    .attr("fill-opacity", function() {
                        if (d3.select(this).attr("data-key") == clickedTypeHeat) {
                            return 1;
                        }
                        else {
                            return 0.6;
                        }
                    }) // highlights the bill type color
                    .attr("stroke-width", function() {
                        if (d3.select(this).attr("data-key") === clickedTypeHeat) {
                            return 3;
                        }
                        else {
                            return 0.4;
                        }
                    }); // highlights the selected bill type border on the stream graph

                heatInteractionInstructions.text(`Selected: ${clickedTypeHeat} click again to deselect, Select a new bill type to filter stream graph`);
            }
        });

    
    //Visualization 3: Stream Graph grouped by year then counts measure per bill type
    const years = d3.range(1961, 2011); //get the full range of the dataset
    const groupTypeandYear = {};
    for (let i = 0; i < subjectTypes.length; ++i) {
        const subjectTypeatPos = subjectTypes[i];
        groupTypeandYear[subjectTypeatPos] = {};
    }//making an object for every bill type
    for (let j = 0; j < dataFiltering.length; ++j) {
        const df = dataFiltering[j];
        if (!groupTypeandYear[df.typeLabel]) {
            continue;
        } else {
            const yr = df.Year;                                                          
            groupTypeandYear[df.typeLabel][yr] = (groupTypeandYear[df.typeLabel][yr] || 0) + 1; // increment when valid, || 0 means we have not seen a certain type yet
        } // if typelabel is not valid skip
    } // groups the bill types and the years.

    const streamTable = [];
    for (let d = 0; d < years.length; ++d) {                                    
        const yr = years[d];
        const createRow = { year: yr };
        for (let r = 0; r < subjectTypes.length; ++r) {
            createRow[subjectTypes[r]] = groupTypeandYear[subjectTypes[r]][yr] || 0;
        }
        streamTable.push(createRow);
    } // create a row on the stream table with the year, the bill type and number of each type, essentially building a d3 stack format

    const streamStructure = d3.stack()
        .keys(subjectTypes) // specfic columns to stack
    
    const streamSeries = streamStructure(streamTable);

    const g3 = svg.append("g")
        .attr("transform", `translate(${streamMargin.left}, ${streamTop + streamMargin.top})`); // setting up the dashboard

    let xS = d3.scaleLinear()
        .domain(d3.extent(years))
        .range([0, streamWidth]); // x-axis scale

    const yE = [
        d3.min(streamSeries, s => d3.min(s, d => d[0])),
        d3.max(streamSeries, s => d3.max(s, d => d[1]))
    ]; 
    const yS = d3.scaleLinear()
        .domain(yE)
        .range([streamHeight, 0]);// creating the y-axis domain so that all values fit on the chart

    const streamArea = d3.area()
        .x(d => xS(d.data.year)) // og rows year
        .y0(d => yS(d[0])) // bottom edge
        .y1(d => yS(d[1])) // top edge
        .curve(d3.curveCatmullRom.alpha()); // creating smooth edges

    g3.append("text")
        .attr("x", streamWidth / 2)
        .attr("y", -12)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .text("Bill Type Over Time"); // chart title

    for (let a = 0; a < streamSeries.length; ++a) {                                 
        const s = streamSeries[a];                                                   
        g3.append("path")
            .datum(s) // creates the path
            .attr("class", "stream-path")
            .attr("data-key", s.key) // adds the key for highlighting the specific aspects of the stream graph
            .attr("d", streamArea) // converts to svg path string
            .attr("fill", streamColors[s.key]) // making sure correct colors end up in correct locations
            .attr("stroke", "#000")
            .attr("stroke-width", 1.2);
    }

    const xAxisGroupS = g3.append("g")
        .attr("transform", `translate(0, ${streamHeight})`)
        .call(d3.axisBottom(xS).ticks(15).tickFormat(d3.format("d"))); // tick marks for x-axis of the stream graph

    const legendXaxis = 0;
    const legendYaxis = streamHeight + 50;
    const sSize = 14; // size of the legend boxes
    const columnWidth = streamWidth / 7;

    for (let q = 0; q < subjectTypes.length; ++q) {
        const t = subjectTypes[q];
        const lx = legendXaxis + q * columnWidth;

        g3.append("rect")
            .attr("x", lx)
            .attr("y", legendYaxis)
            .attr("width", sSize)
            .attr("height", sSize)
            .attr("fill", streamColors[t]);

        g3.append("text")
            .attr("x", lx + sSize + 4)
            .attr("y", legendYaxis + sSize)
            .attr("font-size", "12px")
            .text(t);
    }
}).catch(function(error) {
    console.log(error);
});

//references: Hw2: Claude for help learning data aggregation and cleaning, and helping me learn the format for the stream graph, for hw3: helping me learn how to setup the range for the brushing