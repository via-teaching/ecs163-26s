
const width = window.innerWidth;
const height = window.innerHeight;
console.log(width, height);
d3.csv("./data/ds_salaries.csv", d3.autoType).then(function(data){
    console.log("data", data);


console.log("point", data[0]);
//finds minSalary and maxSalary
let minSalary = data[0].salary_in_usd;
let maxSalary = data[0].salary_in_usd;
for (let i = 0; i < data.length; i++){
    if (data[i].salary_in_usd>maxSalary){
        maxSalary = data[i].salary_in_usd;
    }
    if (data[i].salary_in_usd< minSalary){
        minSalary = data[i].salary_in_usd;
    }
}
let curHistState = 1;
// sets the dimensions for the first graph, the histogram
const histmargin = {top: 10, right: 50, bottom: 60, left: 80},
    histwidth = width - histmargin.left - histmargin.right,
    histheight = 1/3 * height - histmargin.top - histmargin.bottom;

// get svg container
const svg = d3.select("svg");
//append the first graph to svg container
//sets its dimesnions and placement
const g1 = svg
  .append("svg")
    .attr("width", histwidth + histmargin.left + histmargin.right)
    .attr("height", height + histmargin.top + histmargin.bottom)
  .append("g")
    .attr("transform",
          `translate(${histmargin.left},${histmargin.top + 2/3*height})`);




  
    // sets the x axis dimmensions
  const x1 = d3.scaleLinear()
      .domain([0, maxSalary])    
      .range([0, histwidth]);
    //appends the x axis to the graph
     const   xAxis = d3.axisBottom(x1)
  g1.append("g")
        .attr("class", "x-axis")
      .attr("transform", `translate(0, ${histheight})`)
      .call(xAxis);

  // creates the histogram object
  const histogram = d3.histogram()
      .value(function(d) { return d.salary_in_usd; })  
      .domain(x1.domain())  //  domain of the graphic
      .thresholds(x1.ticks(50)); // numbers of bins

  // get the bins for the data
  const bins = histogram(data);

  // creates the y axis for the histoogram
  const y1 = d3.scaleLinear()
      .range([histheight, 0]);
      y1.domain([0, d3.max(bins, function(d) { return d.length; })]);   
    
  g1.append("g")
      .call(d3.axisLeft(y1));

  // append the bar rectangles to the svg element
  g1.selectAll("rect")
      .data(bins)
      .join("rect")
        .attr("x", 1)
    .attr("transform", function(d) { return `translate(${x1(d.x0)} , ${y1(d.length)})`}) //decides position of bar
        .attr("width", function(d) { return (x1(d.x1) - x1(d.x0) -1> 0) ? x1(d.x1) - x1(d.x0) -1 : 0}) //sets width and prevents negative values
        .attr("height", function(d) { return histheight - y1(d.length); }) //calculates height
        .style("fill", "steelblue")
        .attr("curfill", 0)
        .on("click", function(d, i){ //adds function to clicking bars to select them
            const curfill = d3.select(this).attr("curfill");
            console.log("click", )
            d3.select(this).style("fill", curfill == 0 ? "darkgreen" : "steelblue")
            .attr("curfill", curfill == 1 ? 0 : 1);
            calcSelect()
        }) //sets color
    //adding x-axis label
    g1.append("text")
    .attr("text-anchor", "end")
    .attr("x", histwidth /2)
    .attr("y", histmargin.top + histheight + 30)
    .text("Salary in USD");
    
    //adding y-axis label
    g1.append("text")
    .attr("text-anchor", "end")
    .attr("transform", "rotate(-90)")
    .attr("y", -histmargin.left + 30)
    .attr("x", -histmargin.top)
    .text("Number of Entries");
        //adds a title to the graph
    g1.append("text")
    .attr("text-anchor", "middle")
    .attr("y", -20)
    .attr("x", histwidth/2 -histmargin.left * 1/2)
    .text("Distribution of Salaries among Data Scientists");
    
    let selectAmount = 0
    //makes selection labels and instructions
    const selectLabel = svg.append("text")
    .attr("text-anchor", "middle")
    .attr("y", 2/3* height + 30)
    .attr("x", 4/5 * width)
    .text(`Current Amount of Selection: ${selectAmount}`);
    svg.append("text")
    .attr("text-anchor", "middle")
    .attr("y", 2/3 * height + 40)
    .attr("x", 4/5 * width)
    .style("font-size", "10px")
    .text("Click on Bars to Select")
    //calculates the total amount in the selected bars and displays it
    function calcSelect() {
        selectAmount = 0;
       
        g1.selectAll("rect").each(function(d){
           
            const rectHeight = d.length * d3.select(this).attr("curfill")
            selectAmount = selectAmount + rectHeight;
        })
    selectLabel.text(`Current Amount of Selection: ${selectAmount}`);
       
    }
    //calculates the count of all the job types
    let jobCount = {};
    for (let i = 0; i < data.length; i++){
        jobCount[data[i].job_title] = (jobCount[data[i].job_title] || 0) + 1
    }
    console.log(jobCount)
    let jobCountArr = Object.entries(jobCount);
    //gets the top eight jobs, and puts everything else in the other category
    let topNine = jobCountArr.sort(([, a], [, b]) => b-a)
            .slice(0, 8);
    console.log(topNine);
    jobCountArr.sort(([, a], [, b]) => b-a)
    let otherCount = 0;
    for (let i = 8; i < jobCountArr.length; i++){
        otherCount += jobCountArr[i][1];
    }
    const bigEight = [];
    for (i in topNine){
        bigEight.push(topNine[i][0])
    }
    topNine.push(["Other", otherCount]);
    //transforms previous data to make it easier to use for the pie graph
    let dataForG2 = {};
    for (let i = 0; i < topNine.length; i++){
        dataForG2[topNine[i][0]] = topNine[i][1];
    }
    // set dimensions of the pie chart
    const pieWidth = 1/2 * width,
    pieHeight = 1/2 * height;
    const pieMargin = 30;
    const radius= Math.min(pieWidth, pieHeight) / 2 - pieMargin;
    console.log(dataForG2)
    //create the g2 container and creates its dimensions and position
    const g2 = svg
    .append("svg")
    .attr("width", pieWidth)
    .attr("height", pieHeight)
    .append("g")
    .attr("transform", `translate(${pieWidth/2 - pieMargin}, ${pieHeight/2 +20})`);
    //creates the color scale to be used
    const color = d3.scaleOrdinal()
    .domain(Object.entries(dataForG2))
    .range(d3.schemeSet1);

    
    //creates the pie
    const pie = d3.pie()
    .value(function(d) {return d[1]})
    //preps data
    const data_ready = pie(Object.entries(dataForG2))
    //joins all of the arcs of the pie chart
    g2.selectAll('whatever')
    .data(data_ready)
    .join('path')
    .attr('d', d3.arc()
        .innerRadius(0)
        .outerRadius(radius))
    //information about the color of the pie chart
    .attr('fill', function(d){return(color(d.data[1]))})
    .attr("stroke", "black")
    .style("stroke-width", "1px")
    .style("opacity", 1);
    // creats an object for the legend
    const legend1 = svg.append("g")
    legend1.attr("transform", `translate(${pieWidth/2 + radius}, ${pieHeight/2})`) //puts legend at correct position
  let myDots = legend1.selectAll("mydots") //creates a dot for each slice of pie chart
    .data(Object.entries(dataForG2))
    .enter()
    .append("circle")
    .attr("cx", 0 )
    .attr("cy", function(d,i){return 0 + i*15})
    .attr("r", 6)
    .style("fill", function(d){return color(d)}); // sets to corresponding color
    legend1.selectAll("mylabels") //adds a label corresponding to each circle
    .data(Object.entries(dataForG2))
    .enter()
    .append("text")
        .attr("x", 15)
        .attr("y", function(d,i){return 0 + i*15})
        .text(function(d){return (String(d[0] + ", " + String(d[1])))})
        .attr("text-anchor", "left")
        .style("alignment-baseline", "middle")
        .attr("font-size", "10px")
    legend1.append("text")
    .attr("x", 0)
    .attr("y", 9 * 15 + 10)
    .text("Try brushing the Dots")
    .style("alignment-baseline", "middle")
    .attr("font-size", "12px");
    // adds a title to the pie chart
    const title2 = svg.append("g")
    .append("text")
    .attr("text-anchor", "middle")
    .attr("x", pieWidth/2 - pieMargin)
    .attr("y", 30)
    .text("Distribution of Jobs");
    
    let topFive = jobCountArr.sort(([, a], [, b]) => b-a)
            .slice(0, 4);
   
    topFive.push(["Other", 0]);

    //sorts the data
    data.sort((a,b) => a.salary_in_usd - b.salary_in_usd);
    //finds the breakpoint for the first third of the data and the second third of the data
    firstB = data[Math.floor(data.length * 1/3)].salary_in_usd;
    secondB = data[Math.floor(data.length * 2/3)].salary_in_usd;
    sankeyData = {"nodes": [], "links" : []
    }
    let jobKeys = [];
    //creates an array of jobs to use
    for (let i = 0; i < topFive.length; i++){
        jobKeys.push(topFive[i][0])
    }
    console.log(topFive)
    //initializes nodes
    for (let i = 0; i < jobKeys.length; i++){
        sankeyData["nodes"].push({"name" : jobKeys[i]})
    }
    //sets salaries
    let salaries = ["Low Salary", "Medium Salary", "High Salary"];
    for (let i = jobKeys.length; i < jobKeys.length + 3; i++){
        sankeyData["nodes"].push({ "name":salaries[i-jobKeys.length]});
    }
    dataForG3 = {}
    let searchIndex = -1;
    for (let i = 0; i < jobKeys.length; i++){
        dataForG3[i] = {};
        for (let j = 0; j < 3; j++)
        dataForG3[i][j] = 0;
    }
    //bins the salary data into Low, Medium, and High
    for (let i = 0; i < data.length; i++){
        searchIndex = jobKeys.indexOf(data[i].job_title)
        if (searchIndex == -1){
            searchIndex = jobKeys.indexOf("Other");
        }
        if (data[i].salary_in_usd <= firstB){
            dataForG3[searchIndex][0] = dataForG3[searchIndex][0] + 1
        } else if (data[i].salary_in_usd <= secondB){
            dataForG3[searchIndex][1] = dataForG3[searchIndex][1] + 1
        } else{
            dataForG3[searchIndex][2] = dataForG3[searchIndex][2] + 1
        }
    }
    //sets link array
    for (let i = 0; i < jobKeys.length; i++){
        for (let j = 0; j < 3; j++)
        sankeyData["links"].push({"source" : jobKeys[i], "target" : salaries[j], "value": dataForG3[i][j]})
    }
    console.log(sankeyData)
    //sets dimension values
    const sanMargin = {top : 80, right: 30, bottom :10, left: 10},
        sanWidth = width * 1/2 -sanMargin.left - sanMargin.right,
        sanHeight = 1/2 * height - sanMargin.top - sanMargin.bottom;
        //creates graph 3 container
    const g3 = svg
   
        
        .append("g")
            .attr("transform", `translate(${sanMargin.left + (width * 1/2)}, ${sanMargin.top})`)
            .attr("width", sanWidth )
        .attr("height", sanHeight )
    //creates color scaling
    const color2 = d3.scaleLinear()
        .domain([0, 2])
        .range(["orange", "steelblue"]);
// Set the sankey diagram properties
let sankey = d3.sankey()
    .nodeWidth(30)
    .nodePadding(20)
    .size([sanWidth, sanHeight])
    .nodeId(d=>d.name);
//creates nodes and links objects
const {nodes, links} = sankey({
    nodes : sankeyData.nodes.map(d=>Object.assign({}, d)),
    links: sankeyData.links.map(d => Object.assign({}, d))
})
  
  
    
      //creates a rectangle for each category
    const rect = g3.append("g")
    .attr("stroke", "#000")
    .style("opacity", 0.9)
    .selectAll()
    .data(nodes)
    .join("rect")
        //sets dimensions
        //color is extra complicated to make the colors the same as the pie chart
        .attr("x", d=>d.x0)
        .attr("y", d=>d.y0)
        .attr("height", d=>d.y1 -d.y0)
        .attr("width", d=>d.x1 - d.x0)
        .attr("fill", d => ((salaries.includes(d.name)) ? 
        color2(salaries.indexOf(d.name)) : (d.name == "Other") ? "gray" : color(d.name)));
  rect.append("title")
    .text(d=> `${d.name}\n${d.value}`)
    //creates links between each ractangle
    const link = g3.append("g")
        .attr("fill", "none")
        .attr("stroke-opacity", 0.5)
    .selectAll()
    .data(links)
    .join("g")
        .style("mix-blend-mode", "multiply")

    

    link.append("path")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke", (d) => color2(salaries.indexOf(d.target.name)))
    .attr("stroke-width", d=>Math.max(1, d.width))

    link.append("title")
        .text(d=> `${d.source.name} -> ${d.target.name}\n${d.value}`)
    //adds a label for each rectangle
    g3.append("g")
    .selectAll()
    .data(nodes)
    .join("text")
        .attr("x", d=> d.x0 < sanWidth /2 ? d.x1 + 3 : d.x0 -6)
        .attr("y", d=> (d.y1 + d.y0) /2)
        .attr("dy", "0.35em")
        .attr("text-anchor", d=>d.x0 < sanWidth / 2 ? "start" : "end")
        .text(d=> d.name);
        //adds a title to the graph
     const title3 = svg.append("g")
    .append("text")
    .attr("text-anchor", "middle")
    .attr("x", 3 * width / 4)
    .attr("y", 55)
    .text("Relation of Job Type and Salary Type");

    //adds a title to the whole dashboard
    const title4 = svg.append("g")
    .append("text")
    .attr("text-anchor", "middle")
    .attr("x", width/ 2)
    .attr("y", 30)
    .text("Analysis of Data Analyst Jobs and Salaries")
    .attr("font-family", "impact")

    //creates three keys to define low, medium, and high salaries
    const keyFor31 = svg.append("g")
    .append("text")
    .attr("text-anchor", "left")
    .attr("x", width * 1/2 + 10)
    .attr("y", height * 1/2 + 10)
    .text(`Low Salary: <= $${firstB}`)
    .attr("font-size", "11px")
    const keyFor32 = svg.append("g")
    .append("text")
    .attr("text-anchor", "left")
    .attr("x", width * 1/2 + 10)
    .attr("y", height * 1/2 + 22)
    .text(`Medium Salary:  $${firstB} < and <= $${secondB}
        `)
    .attr("font-size", "11px")
    const keyFor33 = svg.append("g")
    .append("text")
    .attr("text-anchor", "left")
    .attr("x", width * 1/2 + 10)
    .attr("y", height * 1/2 + 34)
    .text(`High Salary: > $${secondB}.`)
    .attr("font-size", "11px")
    
    // creates a brush to be used on the pie chart legend
  const brush = d3.brush()
  .extent([[-50, -50], [50, 150]])
  .on("start", brushStarted)
  .on("brush", brushed)
  .on("end", brushEnded);

  //appends brush to chart
  const brushGroup = legend1.append("g")
  .attr("class", "brush")
    .call(brush);

    let currentBrushG = null;
    
    //logic for when brush is started
    function brushStarted() {
       
        if (!d3.event.selection && currentBrushG) {
            d3.select(currentBrushG).call(brush.move, null);
        }
    }

    //creates a dataset to help with histogram filtering
    let selectSet = {};
    let noSelect = true;
    let separateData = {};
    for (i in topNine){
        selectSet[topNine[i][0]] = 0;
        separateData[topNine[i][0]] = [];
    }
    console.log(separateData)
    for (i in data){
        if (bigEight.includes(data[i].job_title)){
            separateData[data[i].job_title].push(data[i]);
        }
        else{
            separateData["Other"].push(data[i])
        }

    }
    
    //selects and unselects dots
    function brushed(){
        const selection = d3.event.selection;
       
        if (!selection) return;

        const [[x0, y0], [x1, y1]] = selection;

        myDots.each(function(d){
            const cx = parseFloat(d3.select(this).attr("cx"));
            const cy = parseFloat(d3.select(this).attr("cy"));
            const isSelected = cx >= x0 && cx <= x1 && cy >= y0 && cy <=y1;
            //console.log(selection, cx, cy, isSelected)
            d3.select(this)
            .classed("selected", isSelected)
            .style("stroke", "black")
            .style("strokewidth", "2px")
            .style("stroke-opacity", isSelected ? 1 : 0);
            if (d3.select(this).classed("selected")){
                selectSet[d[0]] = 1;
            }
            else{
                selectSet[d[0]] = 0;
            }
            
        });
    }
    //log for when brushing is finished
    function brushEnded() {
        if (!d3.event.selection){
            myDots.classed("selected", false).style("stroke-opacity", 0);
            for (let key in selectSet){
                selectSet[key] = 0;
                console.log(key)
            }
        } else{
            currentBrushG = this;
            //console.log(currentBrushG);
        }
        updateBars()
    }
    //updates bar chat based on the filtered dots
    function updateBars(){
        
        let newData = [];
        let empty = true
        for (let key in selectSet){
            if (selectSet[key]==1){
                empty = false
                break
            }
        }
        // if nothing selected, restores histogram to original state
        if (empty){
            if (curHistState == 0){
            g1.selectAll("rect")
            .data(bins)
            .join("rect")
            .transition()
            .duration(800)
              .attr("transform", function(d) { return `translate(${x1(d.x0)} , ${y1(d.length)})`}) //decides position of bar
        .attr("width", function(d) { return (x1(d.x1) - x1(d.x0) -1> 0) ? x1(d.x1) - x1(d.x0) -1 : 0}) //sets width and prevents negative values
        .attr("height", function(d) { return histheight - y1(d.length); }) //calculates height
             //calculates height
            curHistState = 1;
            calcSelect();
            }
            
            return;
        }
        // creates bins for modified histogram chart
        for (let key in separateData){
            if (selectSet[key] == 1){
                newData = newData.concat(separateData[key])
            }
        }
        let newBins = histogram(newData)
           
       //animates the new animated histogram
        g1.selectAll("rect")
            .data(newBins)
            .join("rect")
            .transition()
            .duration(800)
             .attr("transform", function(d) { return `translate(${x1(d.x0)} , ${y1(d.length)})`}) //decides position of bar
        .attr("width", function(d) { return (x1(d.x1) - x1(d.x0) -1> 0) ? x1(d.x1) - x1(d.x0) -1 : 0}) //sets width and prevents negative values
        .attr("height", function(d) { return histheight - y1(d.length); }) //calculates height
       
            //calculates height
            curHistState = 0;
            calcSelect();
        }
    }
);



