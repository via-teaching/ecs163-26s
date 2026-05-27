// Krlallak
// 921236704 

// main draw function - called on load and on resize
function drawDashboard() {
    // clear all existing svg elements before redrawing
    d3.select("svg").selectAll("*").remove();

    // get the current window size for responsive layout
    const width = window.innerWidth;
    const height = window.innerHeight;

    // select the main svg element from the html
    const svg = d3.select("svg");

    // ==========================================
    // Main Dashboard Title 

    // append the main dashboard title centered at the top
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 25)
        .attr("text-anchor", "middle")
        .attr("fill", "#e0e0e0")
        .attr("font-size", "18px")
        .attr("font-weight", "bold")
        .text("Student Mental Health Dashboard");

    // append a subtitle below the main title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 42)
        .attr("text-anchor", "middle")
        .attr("fill", "#aaaaaa")
        .attr("font-size", "11px")
        .text("Exploring mental health conditions and treatment-seeking behavior");

    // ==========================================
    // Chart 1: Grouped Bar Chart (Overview)
    // This shows the percentage of students with each mental health condition by year of study. This chart will serve as the context/overview.

    // margins and dimensions for the bar chart area
    let barMargin = {top: 70, right: 30, bottom: 40, left: 100};
    let barWidth = width * 0.35 - barMargin.left - barMargin.right;
    let barHeight = height * 0.35 - barMargin.top - barMargin.bottom;

    // create a group element to hold all bar chart elements
    const barGroup = svg.append("g")
        .attr("transform", `translate(${barMargin.left}, ${barMargin.top})`);

    // add the bar chart title above the chart area
    barGroup.append("text")
        .attr("x", barWidth / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .attr("fill", "#e0e0e0")
        .attr("font-size", "13px")
        .attr("font-weight", "bold")
        .text("Mental Health Conditions by Year of Study");

    // load the student mental health csv data
    d3.csv("StudentMentalhealth.csv").then(function(rawData) {

        // clean the data
        rawData.forEach(function(d) {
            // normalize year of study
            d["Your current year of Study"] = d["Your current year of Study"].trim().toLowerCase();
            if (d["Your current year of Study"] === "year 1") d.year = "Year 1";
            else if (d["Your current year of Study"] === "year 2") d.year = "Year 2";
            else if (d["Your current year of Study"] === "year 3") d.year = "Year 3";
            else if (d["Your current year of Study"] === "year 4") d.year = "Year 4";

            // trim whitespace from all fields
            d.depression = d["Do you have Depression?"].trim();
            d.anxiety = d["Do you have Anxiety?"].trim();
            d.panic = d["Do you have Panic attack?"].trim();
            d.treatment = d["Did you seek any specialist for a treatment?"].trim();
            d.gender = d["Choose your gender"].trim();
            d.cgpa = d["What is your CGPA?"].trim();
            d.age = +d["Age"];

            // count how many conditions each student has (0 to 3)
            d.conditionCount = 0;
            if (d.depression === "Yes") d.conditionCount++;
            if (d.anxiety === "Yes") d.conditionCount++;
            if (d.panic === "Yes") d.conditionCount++;
        });

        // bar chart data prep
        const years = ["Year 1", "Year 2", "Year 3", "Year 4"];
        const conditions = ["Depression", "Anxiety", "Panic Attack"];

        // colors for each condition
        const conditionColors = {
            "Depression": "#e74c3c",
            "Anxiety": "#f39c12",
            "Panic Attack": "#9b59b6"
        };

        // calculate percentage of students with each condition per year
        let barData = [];
        years.forEach(function(year) {
            let yearStudents = rawData.filter(d => d.year === year);
            let total = yearStudents.length;

            barData.push({
                year: year,
                condition: "Depression",
                percent: (yearStudents.filter(d => d.depression === "Yes").length / total) * 100
            });
            barData.push({
                year: year,
                condition: "Anxiety",
                percent: (yearStudents.filter(d => d.anxiety === "Yes").length / total) * 100
            });
            barData.push({
                year: year,
                condition: "Panic Attack",
                percent: (yearStudents.filter(d => d.panic === "Yes").length / total) * 100
            });
        });

        // scales

        // x0 positions each year group along x axis
        const x0 = d3.scaleBand()
            .domain(years)
            .range([0, barWidth])
            .paddingInner(0.2)
            .paddingOuter(0.1);

        // x1 positions individual bars within each year group
        const x1 = d3.scaleBand()
            .domain(conditions)
            .range([0, x0.bandwidth()])
            .padding(0.05);

        // y scale maps percentage to height
        const yBar = d3.scaleLinear()
            .domain([0, 60])
            .range([barHeight, 0]);

        // gridlines

        // dashed horizontal gridlines for readability
        barGroup.append("g")
            .attr("class", "grid")
            .call(d3.axisLeft(yBar)
                .ticks(5)
                .tickSize(-barWidth)
                .tickFormat("")
            )
            .selectAll("line")
                .attr("stroke", "#333333")
                .attr("stroke-dasharray", "3,3");

        // remove the domain line from gridlines
        barGroup.select(".grid .domain").remove();

        // axis's

        // x axis at the bottom
        const xAxis = barGroup.append("g")
            .attr("transform", `translate(0, ${barHeight})`)
            .call(d3.axisBottom(x0));

        // style the x axis text
        xAxis.selectAll("text")
            .attr("fill", "#cccccc")
            .attr("font-size", "10px");

        // style the x axis lines
        xAxis.selectAll(".domain, .tick line")
            .attr("stroke", "#555555");

        // y axis on the left with percentage format
        const yAxis = barGroup.append("g")
            .call(d3.axisLeft(yBar).ticks(5).tickFormat(d => d + "%"));

        // style the y axis text
        yAxis.selectAll("text")
            .attr("fill", "#cccccc")
            .attr("font-size", "10px");

        // style the y axis lines
        yAxis.selectAll(".domain, .tick line")
            .attr("stroke", "#555555");

        // axis's labels

        // x axis label
        barGroup.append("text")
            .attr("x", barWidth / 2)
            .attr("y", barHeight + 32)
            .attr("text-anchor", "middle")
            .attr("fill", "#aaaaaa")
            .attr("font-size", "10px")
            .text("Year of Study");

        // y axis label rotated
        barGroup.append("text")
            .attr("x", -(barHeight / 2))
            .attr("y", -45)
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("fill", "#aaaaaa")
            .attr("font-size", "10px")
            .text("Percentage of Students (%)");

        //  bars

        // draw the grouped bars for each condition per year
        barGroup.selectAll(".bar")
            .data(barData)
            .enter()
            .append("rect")
                .attr("class", "bar")
                .attr("x", d => x0(d.year) + x1(d.condition))
                .attr("y", d => yBar(d.percent))
                .attr("width", x1.bandwidth())
                .attr("height", d => barHeight - yBar(d.percent))
                .attr("fill", d => conditionColors[d.condition])
                .attr("rx", 2);

        // legend

        // legend group to the right of the bars
        const legend = barGroup.append("g")
            .attr("transform", `translate(${barWidth + 10}, 0)`);

        // draw a colored square and label for each condition
        conditions.forEach(function(condition, i) {
            // color square
            legend.append("rect")
                .attr("x", 0)
                .attr("y", i * 18)
                .attr("width", 12)
                .attr("height", 12)
                .attr("fill", conditionColors[condition])
                .attr("rx", 2);

            // label text
            legend.append("text")
                .attr("x", 18)
                .attr("y", i * 18 + 11)
                .attr("fill", "#cccccc")
                .attr("font-size", "10px")
                .text(condition);
        });

        // ==========================================
        // Chart 2: Heatmap
        // Shows the percentage of students with each condition across different CGPA ranges.

        // margins and dimensions for the heatmap
        let heatMargin = {top: 25, right: 80, bottom: 45, left: 80};
        let heatLeft = width * 0.45;
        let heatWidth = width * 0.55 - heatMargin.left - heatMargin.right;
        let heatHeight = barHeight;

        //  group for the heatmap positioned to the right of the bar chart
        const heatGroup = svg.append("g")
            .attr("transform", `translate(${heatLeft + heatMargin.left}, ${barMargin.top + heatMargin.top})`);

        // heatmap title
        heatGroup.append("text")
            .attr("x", heatWidth / 2)
            .attr("y", -10)
            .attr("text-anchor", "middle")
            .attr("fill", "#e0e0e0")
            .attr("font-size", "13px")
            .attr("font-weight", "bold")
            .text("Condition Rates by CGPA Range");

        // data prep for the heatmap

        // cgpa ranges in order
        const cgpaRanges = ["0 - 1.99", "2.00 - 2.49", "2.50 - 2.99", "3.00 - 3.49", "3.50 - 4.00"];

        // normalize cgpa values to match our labels
        rawData.forEach(function(d) {
            if (d.cgpa === "0 - 1.99") d.cgpaNorm = "0 - 1.99";
            else if (d.cgpa === "2.00 - 2.49") d.cgpaNorm = "2.00 - 2.49";
            else if (d.cgpa === "2.50 - 2.99") d.cgpaNorm = "2.50 - 2.99";
            else if (d.cgpa === "3.00 - 3.49") d.cgpaNorm = "3.00 - 3.49";
            else if (d.cgpa === "3.50 - 4.00") d.cgpaNorm = "3.50 - 4.00";
            else d.cgpaNorm = d.cgpa;
        });

        // build the heatmap data with percentages per cgpa range
        let heatData = [];
        cgpaRanges.forEach(function(cgpa) {
            let cgpaStudents = rawData.filter(d => d.cgpaNorm === cgpa);
            let total = cgpaStudents.length;

            if (total === 0) return;

            conditions.forEach(function(condition) {
                let count = 0;
                if (condition === "Depression") count = cgpaStudents.filter(d => d.depression === "Yes").length;
                else if (condition === "Anxiety") count = cgpaStudents.filter(d => d.anxiety === "Yes").length;
                else if (condition === "Panic Attack") count = cgpaStudents.filter(d => d.panic === "Yes").length;

                heatData.push({
                    cgpa: cgpa,
                    condition: condition,
                    percent: (count / total) * 100,
                    total: total
                });
            });
        });

        // heatmap scales

        // x scale for conditions (columns)
        const heatX = d3.scaleBand()
            .domain(conditions)
            .range([0, heatWidth])
            .padding(0.08);

        // y scale for cgpa ranges (rows)
        const heatY = d3.scaleBand()
            .domain(cgpaRanges)
            .range([0, heatHeight])
            .padding(0.08);

        // color scale - darker blue means higher percentage
        const heatColor = d3.scaleSequential()
            .domain([0, 75])
            .interpolator(d3.interpolateBlues);

        // heatmap cells

        // draw the colored rectangles
        heatGroup.selectAll(".heat-cell")
            .data(heatData)
            .enter()
            .append("rect")
                .attr("class", "heat-cell")
                .attr("x", d => heatX(d.condition))
                .attr("y", d => heatY(d.cgpa))
                .attr("width", heatX.bandwidth())
                .attr("height", heatY.bandwidth())
                .attr("fill", d => heatColor(d.percent))
                .attr("rx", 3)
                .attr("stroke", "#1a1a2e")
                .attr("stroke-width", 2);

        // percentage labels inside each cell
        heatGroup.selectAll(".heat-label")
            .data(heatData)
            .enter()
            .append("text")
                .attr("class", "heat-label")
                .attr("x", d => heatX(d.condition) + heatX.bandwidth() / 2)
                .attr("y", d => heatY(d.cgpa) + heatY.bandwidth() / 2)
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .attr("font-size", "11px")
                .attr("font-weight", "bold")
                .attr("fill", d => d.percent > 40 ? "#ffffff" : "#333333")
                .text(d => Math.round(d.percent) + "%");

        // asterisk for small sample  sizes
        heatGroup.selectAll(".heat-asterisk")
            .data(heatData.filter(d => d.total < 5))
            .enter()
            .append("text")
                .attr("class", "heat-asterisk")
                .attr("x", d => heatX(d.condition) + heatX.bandwidth() / 2)
                .attr("y", d => heatY(d.cgpa) + heatY.bandwidth() / 2 + 12)
                .attr("text-anchor", "middle")
                .attr("font-size", "9px")
                .attr("fill", d => d.percent > 40 ? "#cccccc" : "#888888")
                .text("*");

        // heatmap labels

        // condition labels at the bottom of each column
        conditions.forEach(function(condition) {
            heatGroup.append("text")
                .attr("x", heatX(condition) + heatX.bandwidth() / 2)
                .attr("y", heatHeight + 15)
                .attr("text-anchor", "middle")
                .attr("fill", "#cccccc")
                .attr("font-size", "10px")
                .text(condition);
        });

        // cgpa range labels on the left of each row
        cgpaRanges.forEach(function(cgpa) {
            if (heatData.some(d => d.cgpa === cgpa)) {
                heatGroup.append("text")
                    .attr("x", -10)
                    .attr("y", heatY(cgpa) + heatY.bandwidth() / 2)
                    .attr("text-anchor", "end")
                    .attr("dominant-baseline", "middle")
                    .attr("fill", "#cccccc")
                    .attr("font-size", "10px")
                    .text(cgpa);
            }
        });

        // x axis label under the heatmap
        heatGroup.append("text")
            .attr("x", heatWidth / 2)
            .attr("y", heatHeight + 35)
            .attr("text-anchor", "middle")
            .attr("fill", "#aaaaaa")
            .attr("font-size", "10px")
            .text("Condition");

        // y axis label rotated on the left
        heatGroup.append("text")
            .attr("x", -(heatHeight / 2))
            .attr("y", -70)
            .attr("text-anchor", "middle")
            .attr("transform", "rotate(-90)")
            .attr("fill", "#aaaaaa")
            .attr("font-size", "10px")
            .text("CGPA Range");

        // heatmap color legend

        //  legend group to the right of the heatmap
        const heatLegend = heatGroup.append("g")
            .attr("transform", `translate(${heatWidth + 10}, ${heatHeight * 0.1})`);

        // legend title
        heatLegend.append("text")
            .attr("x", 0)
            .attr("y", -8)
            .attr("fill", "#aaaaaa")
            .attr("font-size", "9px")
            .text("% affected");

        // gradient definition for the legend bar
        const defs = svg.append("defs");

        // vertical gradient from light to dark blue
        const gradient = defs.append("linearGradient")
            .attr("id", "heat-gradient")
            .attr("x1", "0%").attr("y1", "100%")
            .attr("x2", "0%").attr("y2", "0%");

        // light color at bottom
        gradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", heatColor(0));

        // dark color at top
        gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", heatColor(75));

        // draw the gradient bar
        let gradientHeight = heatHeight * 0.5;
        heatLegend.append("rect")
            .attr("width", 12)
            .attr("height", gradientHeight)
            .attr("fill", "url(#heat-gradient)")
            .attr("rx", 2);

        // 0% label at the bottom
        heatLegend.append("text")
            .attr("x", 18)
            .attr("y", gradientHeight)
            .attr("fill", "#cccccc")
            .attr("font-size", "9px")
            .text("0%");

        // 75% label at the top
        heatLegend.append("text")
            .attr("x", 18)
            .attr("y", 10)
            .attr("fill", "#cccccc")
            .attr("font-size", "9px")
            .text("75%");

        // footnote explaining the asterisk
        heatGroup.append("text")
            .attr("x", 0)
            .attr("y", heatHeight + 25)
            .attr("fill", "#888888")
            .attr("font-size", "8px")
            .text("* fewer than 5 students in this CGPA range");

        // ==========================================
        // Chart 3: Sankey Diagram
        // Shows the flow from Gender to number of mental health conditions to whether or not the student sought treatment.

        // margins and dimensions - sankey takes the bottom half
        let sankeyMargin = {top: 35, right: 160, bottom: 40, left: 160};
        let sankeyTop = height * 0.44;
        let sankeyWidth = width - sankeyMargin.left - sankeyMargin.right;
        let sankeyHeight = height * 0.56 - sankeyMargin.top - sankeyMargin.bottom;

        // create a group for the sankey diagram
        const sankeyGroup = svg.append("g")
            .attr("transform", `translate(${sankeyMargin.left}, ${sankeyTop + sankeyMargin.top})`);

        // sankey title
        sankeyGroup.append("text")
            .attr("x", sankeyWidth / 2)
            .attr("y", -18)
            .attr("text-anchor", "middle")
            .attr("fill", "#e0e0e0")
            .attr("font-size", "13px")
            .attr("font-weight", "bold")
            .text("From Gender to Conditions to Treatment");

        // sankey data prep

        // node names for the three columns
        var nodeNames = [
            "Female",           // 0
            "Male",             // 1
            "No Conditions",    // 2
            "1 Condition",      // 3
            "2 Conditions",     // 4
            "3 Conditions",     // 5
            "Sought Treatment", // 6
            "No Treatment"      // 7
        ];

        // create nodes array
        var nodes = nodeNames.map(function(name) {
            return { name: name };
        });

        var links = [];

        // helper to count students matching gender and condition count
        function countFlow(gender, condCount) {
            return rawData.filter(function(d) {
                return d.gender === gender && d.conditionCount === condCount;
            }).length;
        }

        // helper to count students matching condition count and treatment
        function countFlowTreatment(condCount, treatment) {
            return rawData.filter(function(d) {
                return d.conditionCount === condCount && d.treatment === treatment;
            }).length;
        }

        // gender -> condition count flows
        var femaleNone = countFlow("Female", 0);
        var femaleOne = countFlow("Female", 1);
        var femaleTwo = countFlow("Female", 2);
        var femaleThree = countFlow("Female", 3);
        var maleNone = countFlow("Male", 0);
        var maleOne = countFlow("Male", 1);
        var maleTwo = countFlow("Male", 2);
        var maleThree = countFlow("Male", 3);

        // add the gender to condition links
        if (femaleNone > 0) links.push({ source: 0, target: 2, value: femaleNone });
        if (femaleOne > 0) links.push({ source: 0, target: 3, value: femaleOne });
        if (femaleTwo > 0) links.push({ source: 0, target: 4, value: femaleTwo });
        if (femaleThree > 0) links.push({ source: 0, target: 5, value: femaleThree });
        if (maleNone > 0) links.push({ source: 1, target: 2, value: maleNone });
        if (maleOne > 0) links.push({ source: 1, target: 3, value: maleOne });
        if (maleTwo > 0) links.push({ source: 1, target: 4, value: maleTwo });
        if (maleThree > 0) links.push({ source: 1, target: 5, value: maleThree });

        // condition count -> treatment flows
        var noneTreat = countFlowTreatment(0, "Yes");
        var noneNoTreat = countFlowTreatment(0, "No");
        var oneTreat = countFlowTreatment(1, "Yes");
        var oneNoTreat = countFlowTreatment(1, "No");
        var twoTreat = countFlowTreatment(2, "Yes");
        var twoNoTreat = countFlowTreatment(2, "No");
        var threeTreat = countFlowTreatment(3, "Yes");
        var threeNoTreat = countFlowTreatment(3, "No");

        // add the condition to treatment links
        if (noneTreat > 0) links.push({ source: 2, target: 6, value: noneTreat });
        if (noneNoTreat > 0) links.push({ source: 2, target: 7, value: noneNoTreat });
        if (oneTreat > 0) links.push({ source: 3, target: 6, value: oneTreat });
        if (oneNoTreat > 0) links.push({ source: 3, target: 7, value: oneNoTreat });
        if (twoTreat > 0) links.push({ source: 4, target: 6, value: twoTreat });
        if (twoNoTreat > 0) links.push({ source: 4, target: 7, value: twoNoTreat });
        if (threeTreat > 0) links.push({ source: 5, target: 6, value: threeTreat });
        if (threeNoTreat > 0) links.push({ source: 5, target: 7, value: threeNoTreat });

        // build the sankey layout

        // set up the sankey generator with node width and padding
        var sankeyLayout = d3.sankey()
            .nodeWidth(18)
            .nodePadding(10)
            .extent([[0, 0], [sankeyWidth, sankeyHeight]]);

        // generate the layout positions
        var sankeyData = sankeyLayout({
            nodes: nodes.map(function(d) { return Object.assign({}, d); }),
            links: links.map(function(d) { return Object.assign({}, d); })
        });

        // node colors - pink for female, blue for male, green/orange/red/purple for condition counts
        var nodeColors = {
            "Female": "#e88dc4",
            "Male": "#6cb4d9",
            "No Conditions": "#66bb6a",
            "1 Condition": "#ffa726",
            "2 Conditions": "#ef5350",
            "3 Conditions": "#ab47bc",
            "Sought Treatment": "#26a69a",
            "No Treatment": "#78909c"
        };

        // draw the links

        // curved flow paths between nodes
        sankeyGroup.append("g")
            .selectAll(".sankey-link")
            .data(sankeyData.links)
            .enter()
            .append("path")
                .attr("class", "sankey-link")
                .attr("d", d3.sankeyLinkHorizontal())
                .attr("stroke-width", function(d) { return Math.max(1, d.width); })
                .attr("stroke", function(d) { return nodeColors[d.source.name]; })
                .attr("stroke-opacity", 0.4)
                .attr("fill", "none");

        // draw the nodes

        // rectangles for each node
        sankeyGroup.append("g")
            .selectAll(".sankey-node")
            .data(sankeyData.nodes)
            .enter()
            .append("rect")
                .attr("class", "sankey-node")
                .attr("x", function(d) { return d.x0; })
                .attr("y", function(d) { return d.y0; })
                .attr("width", function(d) { return d.x1 - d.x0; })
                .attr("height", function(d) { return d.y1 - d.y0; })
                .attr("fill", function(d) { return nodeColors[d.name]; })
                .attr("stroke", "#1a1a2e")
                .attr("stroke-width", 1)
                .attr("rx", 3);

        // node labels

        // text labels next to each node showing name and count
        sankeyGroup.append("g")
            .selectAll(".sankey-label")
            .data(sankeyData.nodes)
            .enter()
            .append("text")
                .attr("class", "sankey-label")
                .attr("x", function(d) {
                    return d.x0 < sankeyWidth / 3 ? d.x0 - 6 : d.x1 + 6;
                })
                .attr("y", function(d) { return (d.y0 + d.y1) / 2; })
                .attr("text-anchor", function(d) {
                    return d.x0 < sankeyWidth / 3 ? "end" : "start";
                })
                .attr("dominant-baseline", "middle")
                .attr("fill", "#cccccc")
                .attr("font-size", "10px")
                .text(function(d) { return d.name + " (" + d.value + ")"; });

        // column headers

        // "Gender" above  the left column
        sankeyGroup.append("text")
            .attr("x", sankeyData.nodes[0].x0 + 9)
            .attr("y", -3)
            .attr("text-anchor", "middle")
            .attr("fill", "#aaaaaa")
            .attr("font-size", "10px")
            .text("Gender");

        // "# of Conditions" above the  middle column
        sankeyGroup.append("text")
            .attr("x", (sankeyData.nodes[2].x0 + sankeyData.nodes[2].x1) / 2)
            .attr("y", -3)
            .attr("text-anchor", "middle")
            .attr("fill", "#aaaaaa")
            .attr("font-size", "10px")
            .text("# of Conditions");

        //  "Treatment" above the right column
        sankeyGroup.append("text")
            .attr("x", (sankeyData.nodes[6].x0 + sankeyData.nodes[6].x1) / 2)
            .attr("y", -3)
            .attr("text-anchor", "middle")
            .attr("fill", "#aaaaaa")
            .attr("font-size", "10px")
            .text("Treatment");

    }).catch(function(error) {
        console.log(error);
    });
}

//  draw the dashboard when the page first loads
drawDashboard();

// redraw the dashboard whenever  the window is resized
// sometimes  needs the page needs to be refreshed after the window size has changed
window.addEventListener("resize", drawDashboard);