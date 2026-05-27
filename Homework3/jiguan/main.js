//ACKNOWLEDGEMENTS: ---------------------------------------------------
//Referenced d3js.org for several built in d3.js functions
// Graph 1: Used claude.ai to learn how to create each individual column for parallel coordinates graph and the process of mapping lines over each column & how to create responsive design that allow for dynamic resizing based on window size
// Graph 2: Used claude.ai to understand subscales for grouped bar charts and how it maps onto the svg
// Graph 3: Used claude.ai to help with x and y scales and the coloring of each square
//Used claude ai to help learn brushing on parallel coordinates and linking between graphs
//------------------------------------------------------------------------
//Margins
var margin = { top: 50, right: 120, bottom: 50, left: 90 };
// top chart - full width, half height
var topWidth = window.innerWidth - margin.left - margin.right;
var topHeight = (window.innerHeight / 2) - margin.top - margin.bottom;

// bottom charts - half width, half height
var botWidth = (window.innerWidth / 2) - margin.left - margin.right;
var botHeight = (window.innerHeight / 2) - margin.top - margin.bottom;

let resizeTimer;
//checks for window resizer, and when user stops resizing for 300 miliseconds, it reloads the page and applies the correct resizing based on the window inner width and heigh stuff
window.addEventListener("resize", function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
        location.reload();
    }, 300);
});

//Load data
d3.csv("data/Student Mental health.csv").then(
  function (data) {
    //CLEANING DATA :D
    //Making years consistent -> make all lowercase
    //getting rid of spaces in the GPA
    data.forEach(
      function (d) {
        d["Your current year of Study"] = d["Your current year of Study"].trim().toLowerCase();
        d["What is your CGPA?"] = d["What is your CGPA?"].trim();
      }

    )
    // Finding domain for Y scla for the CGPA ... is spread operator
    console.log([...new Set(data.map(d => d["What is your CGPA?"]))]);
    console.log(data);
    //grab the svg from html
    var svg = d3.select("#parallelcoords")
      .attr("viewBox", `0 0 ${topWidth + margin.left + margin.right} ${topHeight + margin.top + margin.bottom}`)
      .attr("width", "100%")
      //.attr("height", "100%")
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)

    //Graph 1: parallel coordinates graph: Overview of student mental heath showing the data points grouped by category
    //making the inside rectangle that is smaller than outside which we put the titles and axes and legends and stuff
    svg.append("rect")
      .attr("width", topWidth)
      .attr("height", topHeight)
      .style("fill", "white")

    //X and Y scale, Domain is data, Range is onscreen pixel, how big we want
    //X scale, scales each column
    let x_scale = d3.scalePoint()
      .domain(["Gender", "Year", "CGPA", "Depression", "Anxiety", "Panic Attack"])
      .range([0, topWidth])
      .padding(0.2)

    //Y Scale: Since its a parallel coords, need 1 domain per column. Theres 6 cols here
    let y_scale = {
      "Gender": d3.scalePoint()
        .domain(["Female", "Male"])
        .range([topHeight, 0]), //remember height is top and 0 is bot of svg
      "Year": d3.scalePoint()
        .domain(["year 1", "year 2", "year 3", "year 4"])
        .range([topHeight, 0]),
      "CGPA": d3.scalePoint()
        .domain(["0 - 1.99", "2.00 - 2.49", "2.50 - 2.99", "3.00 - 3.49", "3.50 - 4.00"])
        .range([topHeight, 0]),
      "Depression": d3.scalePoint()
        .domain(["Yes", "No"])
        .range([topHeight, 0]),
      "Anxiety": d3.scalePoint()
        .domain(["Yes", "No"])
        .range([topHeight, 0]),
      "Panic Attack": d3.scalePoint()
        .domain(["Yes", "No"])
        .range([topHeight, 0]),
    }

    //Adding a text label to those 6 columns
    svg.append("text")
      .attr("x", x_scale("Gender"))  // horizontal position
      .attr("y", topHeight + 30)           //move text to below chart
      .attr("text-anchor", "middle")  // center the text
      .text("Gender")                 // the label
      .style("font-weight", "bold")
      .style("font-family", "arial")
      .style("font-size", "14px")
    svg.append("text")
      .attr("x", x_scale("Year"))
      .attr("y", topHeight + 30)
      .attr("text-anchor", "middle")
      .text("Year")
      .style("font-weight", "bold")
      .style("font-family", "arial")
      .style("font-size", "14px")
    svg.append("text")
      .attr("x", x_scale("CGPA"))
      .attr("y", topHeight + 30)
      .attr("text-anchor", "middle")
      .text("CGPA")
      .style("font-weight", "bold")
      .style("font-family", "arial")
      .style("font-size", "14px")
    svg.append("text")
      .attr("x", x_scale("Depression"))
      .attr("y", topHeight + 30)
      .attr("text-anchor", "middle")
      .text("Depression")
      .style("font-weight", "bold")
      .style("font-family", "arial")
      .style("font-size", "14px")
    svg.append("text")
      .attr("x", x_scale("Anxiety"))
      .attr("y", topHeight + 30)
      .attr("text-anchor", "middle")
      .text("Anxiety")
      .style("font-weight", "bold")
      .style("font-family", "arial")
      .style("font-size", "14px")
    svg.append("text")
      .attr("x", x_scale("Panic Attack"))
      .attr("y", topHeight + 30)
      .attr("text-anchor", "middle")
      .text("Panic Attack")
      .style("font-weight", "bold")
      .style("font-family", "arial")
      .style("font-size", "14px")

    // remember that d is a single row of data, so d[choose your gender] returns current row's student's gender
    function drawLine(d) {
      return d3.line()([
        //x scale sets the x pos, y scale sets the y pos
        [x_scale("Gender"), y_scale["Gender"](d["Choose your gender"])],
        [x_scale("Year"), y_scale["Year"](d["Your current year of Study"])],
        [x_scale("CGPA"), y_scale["CGPA"](d["What is your CGPA?"])],
        [x_scale("Depression"), y_scale["Depression"](d["Do you have Depression?"])],
        [x_scale("Anxiety"), y_scale["Anxiety"](d["Do you have Anxiety?"])],
        [x_scale("Panic Attack"), y_scale["Panic Attack"](d["Do you have Panic attack?"])]
      ]);
    }

    svg.selectAll("path") //if no path, makes path
      .data(data)
      .enter() //finds rows without a position and 
      .append("path") //creates a path for them
      .style("fill", "none")
      .attr("d", drawLine)
      .style("stroke", function (d) {
        return d["Do you have Depression?"] === "Yes" ? "red" : "steelblue";
      })
      .style("opacity", 0.4)

    //appending each column for Y onto g
    svg.append("g")
      .attr("transform", `translate(${x_scale("Gender")}, 0)`)
      .call(d3.axisLeft(y_scale["Gender"]))
      .style("font-weight", "bold")
    svg.append("g")
      .attr("transform", `translate(${x_scale("Year")}, 0)`)
      .call(d3.axisLeft(y_scale["Year"]))
      .style("font-weight", "bold")
    svg.append("g")
      .attr("transform", `translate(${x_scale("CGPA")}, 0)`)
      .call(d3.axisLeft(y_scale["CGPA"]))
      .style("font-weight", "bold")
    svg.append("g")
      .attr("transform", `translate(${x_scale("Depression")}, 0)`)
      .call(d3.axisLeft(y_scale["Depression"]))
      .style("font-weight", "bold")
    svg.append("g")
      .attr("transform", `translate(${x_scale("Anxiety")}, 0)`)
      .call(d3.axisLeft(y_scale["Anxiety"]))
      .style("font-weight", "bold")
    svg.append("g")
      .attr("transform", `translate(${x_scale("Panic Attack")}, 0)`)
      .call(d3.axisLeft(y_scale["Panic Attack"]))
      .style("font-weight", "bold")


    //TITLE
    svg.append("text")
      .attr("x", topWidth / 2)
      .attr("y", -20)
      .attr("text-anchor", "middle")
      .text("Student Mental Health Overview")
      .style("font-family", "arial")
      .style("font-weight", "bold")
      .style("font-size", "16px")


    // legend title
    svg.append("text")
      .attr("x", topWidth + 10)
      .attr("y", 20)
      .text("Legend")
      .style("font-weight", "bold")
      .style("font-size", "12px")

    // small line symbol
    svg.append("line")
      .attr("x1", topWidth + 10)
      .attr("x2", topWidth + 30)
      .attr("y1", 40)
      .attr("y2", 40)
      .style("stroke", "steelblue")
      .style("stroke-width", 2)

    // label next to it
    svg.append("text")
      .attr("x", topWidth + 35)
      .attr("y", 44)
      .text("No depression")
      .style("font-size", "12px")

    // red line
    svg.append("line")
      .attr("x1", topWidth + 10)
      .attr("x2", topWidth + 30)
      .attr("y1", 60)
      .attr("y2", 60)
      .style("stroke", "red")
      .style("stroke-width", 2)

    // red label
    svg.append("text")
      .attr("x", topWidth + 35)
      .attr("y", 64)
      .text("Has depression")
      .style("font-size", "12px")

    //TRANSITIONS AND INTERACTION
    //object to keep track of things currently brushed
    let brushSelection = {};

    //filter and check the selected axis and return the data from selected axis
    function get_val(d, axis){
      if(axis === "Gender") return d["Choose your gender"];
      if(axis === "Year") return d["Your current year of Study"];
      if(axis === "CGPA") return d["What is your CGPA?"];
      if(axis === "Depression") return d["Do you have Depression?"];
      if(axis === "Anxiety") return d["Do you have Anxiety?"];
      if(axis === "Panic Attack") return d["Do you have Panic attack?"];
    }

    //checks every student and makes sure it checks all the selected/brushed axes
    function isBrushed(d) {
      //loop through axis that hs a brush and makes sure student passes them
        return Object.keys(brushSelection).every(function(axis) {
            let selection = brushSelection[axis];
            if (!selection) return true;  //this checks if there is a brush on the axis, and if there isn't, student go invisible
            //returns true bc .every needs to go through every section, and if is false, will terminate early
            
            let pixelPos = y_scale[axis](get_val(d, axis));  //convert the student's line into pixels so we can compare it with the brushed region

            return pixelPos >= selection[0] && pixelPos <= selection[1]+1;  // returns true if the student is in the brush and false if misses the bursh

            //if passes all the axis, .every returns that the student passes all the brushed area and should not be invisible later
        });
    }

    svg.append("g")
    .attr("transform", `translate(${x_scale("Gender")}, 0)`)
    .call(d3.axisLeft(y_scale["Gender"]))
    .style("font-weight", "bold")
    //.call applies things inside to current selection
    .call(d3.brushY()
        //.extent defines clickable area, is 20px wid rn
        .extent([[-10, 0], [10, topHeight]])  
        //.on is even listener, when user lets go for brush, store pixel range AND updateLines
        .on("brush end", function(event) {
            brushSelection["Gender"] = event.selection;  // store the pixel range
            updateLines();  
        })
    )
    svg.append("g")
    .attr("transform", `translate(${x_scale("Year")}, 0)`)
    .call(d3.axisLeft(y_scale["Year"]))
    .style("font-weight", "bold")
    .call(d3.brushY()
        .extent([[-10, 0], [10, topHeight]])  
        .on("brush end", function(event) {
            brushSelection["Year"] = event.selection; 
            updateLines();  
        })
    )
    svg.append("g")
    .attr("transform", `translate(${x_scale("CGPA")}, 0)`)
    .call(d3.axisLeft(y_scale["CGPA"]))
    .style("font-weight", "bold")
    .call(d3.brushY()
        .extent([[-10, 0], [10, topHeight]])  
        .on("brush end", function(event) {
            brushSelection["CGPA"] = event.selection; 
            updateLines();  
        })
    )
    svg.append("g")
    .attr("transform", `translate(${x_scale("Depression")}, 0)`)
    .call(d3.axisLeft(y_scale["Depression"]))
    .style("font-weight", "bold")
    .call(d3.brushY()
        .extent([[-10, 0], [10, topHeight]]) 
        .on("brush end", function(event) {
            brushSelection["Depression"] = event.selection;  
            updateLines(); 
        })
    )
    svg.append("g")
    .attr("transform", `translate(${x_scale("Anxiety")}, 0)`)
    .call(d3.axisLeft(y_scale["Anxiety"]))
    .style("font-weight", "bold")
    .call(d3.brushY()
        .extent([[-10, 0], [10, topHeight]]) 
        .on("brush end", function(event) {
            brushSelection["Anxiety"] = event.selection;  
            updateLines();  
        })
    )
    svg.append("g")
    .attr("transform", `translate(${x_scale("Panic Attack")}, 0)`)
    .call(d3.axisLeft(y_scale["Panic Attack"]))
    .style("font-weight", "bold")
    .call(d3.brushY()
        .extent([[-10, 0], [10, topHeight]])  
        .on("brush end", function(event) {
            brushSelection["Panic Attack"] = event.selection;  
            updateLines();  
        })
    )

    //TRANSITION
    function updateLines(){
      svg.selectAll("path")
        .filter(function(d){return d!==null && d!==undefined;}) // filters out all null and undefined student data paths
        .transition()
        .duration(800) //miliseconds
        .style("opacity", function(d){
          if(Object.values(brushSelection).every(s => s === null)){
            //if there is no brushes, line visible
            return 0.8;
          }else{
            //otherwise, only highlight the brushed lines
            return isBrushed(d) ? 0.8 : 0.01;
          }
          
        })
    }

//----------------------------------------------------------------------
    //GRAPH 2: Stacked Bar Chart
    //Comparison of Mental Health Conditions based on years of study
    
    let grouped = d3.group(data, d => d["Your current year of Study"]);
    console.log(grouped);

    let counts = Array.from(grouped, ([year, students]) => {
      return [
        //count filters all the yes answer to depression and counts amount of yes per that year, same with anxiety and panic attack
        { year: year, condition: "Depression", count: students.filter(d => d["Do you have Depression?"] === "Yes").length },
        { year: year, condition: "Anxiety", count: students.filter(d => d["Do you have Anxiety?"] === "Yes").length },
        { year: year, condition: "Panic Attack", count: students.filter(d => d["Do you have Panic attack?"] === "Yes").length }
      ]
    })

    counts = counts.flat(); //flatten the array in array
    console.log(counts);

    //X and Y Scale, 
    let bar_x_scale = d3.scaleBand()
      .domain(["year 1", "year 2", "year 3", "year 4"])
      .range([0, botWidth])
      .padding(0.2)

    let bar_x_subscale = d3.scaleBand()
      .domain(["Depression", "Anxiety", "Panic Attack"])
      .range([0, bar_x_scale.bandwidth()]) // range is based on the x_scale bandwidth size, its bc this is a scale in a scale
      .padding(0.1)

    let bar_y_scale = d3.scaleLinear()
      .domain([0, d3.max(counts, d => d.count)])
      .range([botHeight, 0])


    var svg2 = d3.select("#barchart")
      .attr("viewBox", `0 0 ${botWidth + margin.left + margin.right} ${botHeight + margin.top + margin.bottom}`)
      .attr("width", "100%")
      //.attr("height", "100%")
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)

    //making the inside rectangle that is smaller than outside which we put the titles and axes and legends and stuff
    svg2.append("rect")
      .attr("width", botWidth)
      .attr("height", botHeight)
      .style("fill", "white")

    let selectedYear = null;

    svg2.selectAll("rect.bar")
      .data(counts)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", function (d) {
        return bar_x_scale(d.year) + bar_x_subscale(d.condition)
      })
      .attr("y", function (d) {
        return bar_y_scale(d.count)
      })
      .attr("width", bar_x_subscale.bandwidth())
      .attr("height", function (d) {
        return botHeight - bar_y_scale(d.count)
      })
      .style("fill", function (d) {
        if (d.condition === "Depression") return "red";
        if (d.condition === "Anxiety") return "darkorange";
        if (d.condition === "Panic Attack") return "green";

      })
      .style("cursor", "pointer")

      //Domain updates gotta happen before transition
      
      .on("click",function(event, d){
      //Updating the selected year
        if(selectedYear != d.year){ //if wasnt selected, select
          selectedYear = d.year;
        }else{ // else de select
          selectedYear = null;
        }
      //Updating the x domain
        if(selectedYear === null){
          bar_x_scale.domain(["year 1", "year 2", "year 3", "year 4"])
        }else{
          bar_x_scale.domain([selectedYear]);
        }
        //gotta change the subscale so it becomes centered
        bar_x_subscale.range([0, bar_x_scale.bandwidth()]);

        //redrawing the bars to fit the difference domain + transition
        svg2.selectAll("rect.bar")
          .transition()
          .duration(800)
          //turning the un selected bars invisible
          .style("opacity", function(d){
            return selectedYear === null || d.year === selectedYear ? 1 : 0;
          })
          .attr("x", function(d) {
              return bar_x_scale(d.year) + bar_x_subscale(d.condition)
          })
          .attr("width", bar_x_subscale.bandwidth())

          //if dont add this, x position will become nan, and the bars will get stuck, so better to set them to go to 0
          .attr("x", function(d) {
              let xPos = bar_x_scale(d.year);
              if (xPos === undefined) return 0;  
              return xPos + bar_x_subscale(d.condition);
          })
          //x axis transition
        svg2.select(".x-axis")
          .transition()
          .duration(1000)
          .call(d3.axisBottom(bar_x_scale))
          
      })


    // x axis 
    svg2.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0, ${botHeight})`)
      .call(d3.axisBottom(bar_x_scale))

    // y axis 
    svg2.append("g")
      .call(d3.axisLeft(bar_y_scale))

    //TITLE
    svg2.append("text")
      .attr("x", botWidth / 2)
      .attr("y", -20)
      .attr("text-anchor", "middle")
      .text("Mental Health Conditions by Years of Study")
      .style("font-weight", "bold")
      .style("font-size", "14px")
      .style("font-family", "arial")

    // Y axis
    svg2.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -botHeight / 2)
      .attr("y", -40)
      .attr("text-anchor", "middle")
      .text("Number of Students")
      .style("font-weight", "bold")
      .style("font-family", "arial")
      .style("font-size", "15px")

    //X axis
    svg2.append("text")
      .attr("x", botWidth / 2)
      .attr("y", botHeight + 40)
      .attr("text-anchor", "middle")
      .text("Year of Study")
      .style("font-weight", "bold")
      .style("font-family", "arial")
      .style("font-size", "14px")

    //LEGENDS STUFF
    svg2.append("text")
      .attr("x", botWidth + 10)
      .attr("y", 20)
      .text("Legend")
      .style("font-weight", "bold")
      .style("font-size", "12px")
    // Red
    svg2.append("rect")
      .attr("x", botWidth + 10)
      .attr("y", 30)
      .attr("width", 15)
      .attr("height", 15)
      .style("fill", "red")

    // label next to it
    svg2.append("text")
      .attr("x", botWidth + 35)
      .attr("y", 40)
      .text("Depression")
      .style("font-size", "12px")
    // Orange
    svg2.append("rect")
      .attr("x", botWidth + 10)
      .attr("y", 50)
      .attr("width", 15)
      .attr("height", 15)
      .style("fill", "orange")

    // label next to it
    svg2.append("text")
      .attr("x", botWidth + 35)
      .attr("y", 60)
      .text("Anxiety")
      .style("font-size", "12px")
    // Green
    svg2.append("rect")
      .attr("x", botWidth + 10)
      .attr("y", 70)
      .attr("width", 15)
      .attr("height", 15)
      .style("fill", "green")

    // label next to it
    svg2.append("text")
      .attr("x", botWidth + 35)
      .attr("y", 80)
      .text("Panic Attack")
      .style("font-size", "12px")
//-----------------------------------------------------------------------


    //Graph 3: Heatmap
    //Aims to show the percentage of people with certain mental health conditions based on the CGPA
    let heatmap_grouped = d3.group(data, d => d["What is your CGPA?"]);
    console.log(heatmap_grouped);


    let heatmap_counts = Array.from(heatmap_grouped, ([CGPA, students]) => {
      return [
        //count filters all the yes answer to depression and counts amount of yes per that year, same with anxiety and panic attack
        { CGPA: CGPA, condition: "Depression", count: students.filter(d => d["Do you have Depression?"] === "Yes").length, percent: students.filter(d => d["Do you have Depression?"] === "Yes").length / students.length },
        { CGPA: CGPA, condition: "Anxiety", count: students.filter(d => d["Do you have Anxiety?"] === "Yes").length, percent: students.filter(d => d["Do you have Anxiety?"] === "Yes").length / students.length },
        { CGPA: CGPA, condition: "Panic Attack", count: students.filter(d => d["Do you have Panic attack?"] === "Yes").length, percent: students.filter(d => d["Do you have Panic attack?"] === "Yes").length / students.length }
      ]
    })

    heatmap_counts = heatmap_counts.flat();
    console.log(heatmap_counts);

    //X and Y scale scaleBand uses LIST of categories
    let heatmap_x_axis = d3.scaleBand()
      .domain(["Depression", "Anxiety", "Panic Attack"])
      .range([0, botWidth])
      .padding(0.05)

    let heatmap_y_axis = d3.scaleBand()
      .domain(["0 - 1.99", "2.00 - 2.49", "2.50 - 2.99", "3.00 - 3.49", "3.50 - 4.00"])
      .range([0, botHeight])
      .padding(0.1)

    //we want color scale for heatmap, scaleSequential maps a continuous number to a color
    let heatmap_color_scale = d3.scaleSequential()
      .domain([0, 1])
      //interpolator is color ramp, this one is from white -> blue
      .interpolator(d3.interpolateBlues)

    var svg3 = d3.select("#heatmap")
      .attr("viewBox", `0 0 ${botWidth + margin.left + margin.right} ${botHeight + margin.top + margin.bottom}`)
      .attr("width", "100%")
      //.attr("height", "100%")
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`)

    svg3.append("rect")
      .attr("width", botWidth)
      .attr("height", botHeight)
      .style("fill", "white")

    let selectedCell = null;

    //Making the cells
    svg3.selectAll("rect.cell")
      .data(heatmap_counts)
      .enter()
      .append("rect")
      .attr("class", "cell")
      //x returns all the positions of x based on the conditions
      .attr("x", function (d) { return heatmap_x_axis(d.condition) })
      //y returns all the positions of x based on the CGPA
      .attr("y", function (d) { return heatmap_y_axis(d.CGPA) })
      .attr("width", heatmap_x_axis.bandwidth())
      .attr("height", heatmap_y_axis.bandwidth())
      .style("fill", function (d) { return heatmap_color_scale(d.percent) })
      .style("cursor", "pointer")
      .on("click", function(event, d){
        if(selectedCell != d){ //if wasn't selected yet, select
          selectedCell = d;
        }else{ //if was already selected, then deselect
          selectedCell = null;
        }

        svg3.selectAll("rect.cell")
        .transition()
        .duration(600)
        .style("opacity",function(d){
          if(selectedCell === null){
            return 1;
          }else if(selectedCell == d){
            return 1;
          }else     
          {
            return 0.5;
          }
        })
        .style("stroke", function(d){
          return selectedCell === d ? "black" : "none";
        })
        .style("stroke-width", function(d){
          return selectedCell === d? "2px" : "0px";
        })
      })

    //Adding the percentages inside the rectanges
    svg3.selectAll("text.cell-label")
      .data(heatmap_counts)
      .enter()
      .append("text")
      .attr("class", "cell-label") //adding a class so it dont accidentally grab other stuff later
      .attr("x", function (d) {
        return heatmap_x_axis(d.condition) + heatmap_x_axis.bandwidth() / 2
      })
      .attr("y", function (d) {
        return heatmap_y_axis(d.CGPA) + heatmap_y_axis.bandwidth() / 2
      })
      .text(function (d) {
        return (d.percent * 100).toFixed(1) + "%"
      })
      .style("font-size", "15px")
      .attr("text-anchor", "middle") //mid x way
      .style("font-weight", "bold")
      .attr("dominant-baseline", "middle") //mid y way


    //X and Y axis
    svg3.append("g")
      .attr("transform", `translate(0, ${botHeight})`)
      .call(d3.axisBottom(heatmap_x_axis))

    // y axis on left
    svg3.append("g")
      .call(d3.axisLeft(heatmap_y_axis))

    //TITLE
    svg3.append("text")
      .attr("x", botWidth / 2)
      .attr("y", -20)
      .attr("text-anchor", "middle")
      .text("Mental Health Conditions by CGPA")
      .style("font-weight", "bold")
      .style("font-size", "14px")
      .style("font-family", "arial")

    // Y axis
    svg3.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -botHeight / 2)
      .attr("y", -70)
      .attr("text-anchor", "middle")
      .text("CGPA")
      .style("font-weight", "bold")
      .style("font-family", "arial")

    //X axis
    svg3.append("text")
      .attr("x", botWidth / 2)
      .attr("y", botHeight + 40)
      .attr("text-anchor", "middle")
      .text("Conditions")
      .style("font-weight", "bold")
      .style("font-family", "arial")
      .style("font-size", "14px")


    //LEGENDS STUFF
    svg3.append("text")
      .attr("x", botWidth + 10)
      .attr("y", 20)
      .text("Legend")
      .style("font-weight", "bold")
      .style("font-size", "12px")
      .style("font-family", "arial")
    // High
    svg3.append("rect")
      .attr("x", botWidth + 10)
      .attr("y", 30)
      .attr("width", 15)
      .attr("height", 15)
      .style("fill", "#114678")
      .style("font-family", "arial")

    // label next to it
    svg3.append("text")
      .attr("x", botWidth + 35)
      .attr("y", 40)
      .text("High %")
      .style("font-size", "12px")
      .style("font-family", "arial")
    // Low
    svg3.append("rect")
      .attr("x", botWidth + 10)
      .attr("y", 50)
      .attr("width", 15)
      .attr("height", 15)
      .style("fill", "#bbd6f0")
      .style("font-family", "arial")

    // label next to it
    svg3.append("text")
      .attr("x", botWidth + 35)
      .attr("y", 60)
      .text("Low %")
      .style("font-size", "12px")
      .style("font-family", "arial")



  }
);

