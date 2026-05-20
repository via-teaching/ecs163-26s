
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
    "Charter Amendment": "#a6cee3",
    "Ordinance": "#1f78b4",
    "Bond": "#b2df8a",
    "Policy": "#33a02c",
    "Legislation": "#fb9a99",
    "Tax": "#e31a1c",
    "Revenue Measure": "#fdbf6f"
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

    const xL = d3.scaleLinear()
        .domain(d3.extent(passRatePerYear, d => d.year))
        .range([0, lineWidth]); // scale for x-axis from 0-line width

    const yL = d3.scaleLinear()
        .domain([0, 1])
        .range([lineHeight, 0]); // scale for y-axis from lineheight-0

    g1.append("g")
        .attr("transform", `translate(0, ${lineHeight})`)
        .call(d3.axisBottom(xL).ticks(15).tickFormat(d3.format("d"))) //sets up x-axis into a group
        .selectAll("text") // rest adjusts the labeling position
            .attr("y", "5")
            .attr("x", "-10")
            .attr("text-anchor", "end")
            .attr("transform", "rotate(0)"); //appends the x-axis and labels 15 tick marks

    g1.append("g")
        .call(d3.axisLeft(yL).ticks(10).tickFormat(d3.format(".0%"))); // appends y-axis with 10 tick marks, in percentage format

    g1.append("path")
        .datum(passRatePerYear) // binds dataset to one element
        .attr("fill", "none") // do not want the path area filled in
        .attr("stroke", "#2c7fb8")
        .attr("stroke-width", 3.5)
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
        .attr("r", 4);

    
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

    const xH = d3.scaleBand() // divides axis equally among the tick marks
        .domain(imporantYears)
        .range([0, heatWidth])
        .padding(0.1); // 10% of each sections width between eachother

    const yH = d3.scaleBand()
        .domain(subjectTypes)
        .range([0, heatHeight])
        .padding(0.1);

    const colorScale = d3.scaleSequential()
        .domain([0, 1])
        .interpolator(d3.interpolateRgbBasis(["#fc8d59", "#ffffbf", "#91bfdb"])); // blends colors together

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
                    .attr("x", xH(yr)) // getting the position
                    .attr("y", yH(type))
                    .attr("width", xH.bandwidth()) // making sure the rectangels are the proper width and height
                    .attr("height", yH.bandwidth())
                    .attr("fill", colorScale(validCell.passRate));

                g2.append("text")
                    .attr("x", xH(yr) + xH.bandwidth() / 2)
                    .attr("y", yH(type) + yH.bandwidth() / 2 + 3) // doing my best to center the percentages in the rectangles
                    .attr("text-anchor", "middle")
                    .attr("font-size", "12px")
                    .text((validCell.passRate * 100).toFixed(0) + "%");
                }
        }
    }

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
        //.offset(d3.stackOffsetWiggle) // wiggle around central axis
        //.order(d3.stackOrderInsideOut);
    const streamSeries = streamStructure(streamTable);

    const g3 = svg.append("g")
        .attr("transform", `translate(${streamMargin.left}, ${streamTop + streamMargin.top})`); // setting up the dashboard

    const xS = d3.scaleLinear()
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

    g3.append("g")
    .attr("transform", `translate(0, ${streamHeight})`)
    .call(d3.axisBottom(xS).ticks(10).tickFormat(d3.format("d"))); // x-axis

    //x-axis label
    g3.append("text")
        .attr("x", streamWidth / 2)
        .attr("y", streamHeight + 40)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .text("Year");

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
            .attr("d", streamArea) // converts to svg path string
            .attr("fill", streamColors[s.key]) // making sure correct colors end up in correct locations
            .attr("stroke", "#000")
            .attr("stroke-width", 1.2);
    }

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

//references: Claude for help learning data aggregation and cleaning, and helping me learn the format for the stream graph