const width = window.innerWidth;
const height = window.innerHeight;

//main svg
const svg = d3.select("svg");
//avoid selecting page text
d3.select("body")
    .style("user-select", "none");
//avoid selecting svg text while brushing
svg.style("user-select", "none")
    .style("-webkit-user-select", "none");
svg.selectAll("text")
    .style("user-select", "none")
    .style("-webkit-user-select", "none");
//dashboard title
svg.append("text")
    .attr("x", width / 2)
    .attr("y", 28)
    .attr("text-anchor", "middle")
    .attr("font-size", "22px")
    .attr("font-weight", "bold")
    .text("Music Listening Habits and Mental Health");

// interaction
svg.append("text")
    .attr("x", width / 2)
    .attr("y", 52)
    .attr("text-anchor", "middle")
    .attr("font-size", "15px")
    .attr("fill", "#555")
    .text("Click a genre bar to select a group. Drag on the scatter plot to brush points.");
//status text
const statusText = svg.append("text")
    .attr("x", width / 2)
    .attr("y", 76)
    .attr("text-anchor", "middle")
    .attr("font-size", "15px")
    .attr("fill", "#777")
    .text("Showing all respondents");

//load data
d3.csv("data/mxmh_survey_results.csv").then(rawData => {
    console.log("rawData", rawData);

    //fix number columns
    rawData.forEach(d => {
        d.Age = Number(d.Age);
        d["Hours per day"] = Number(d["Hours per day"]);
        d.BPM = Number(d.BPM);
        d.Anxiety = Number(d.Anxiety);
        d.Depression = Number(d.Depression);
        d.Insomnia = Number(d.Insomnia);
        d.OCD = Number(d.OCD);
    });

    //keep useful row
    const data = rawData.filter(d =>
        d["Fav genre"] &&
        !isNaN(d["Hours per day"]) &&
        !isNaN(d.Anxiety) &&
        !isNaN(d.Depression) &&
        !isNaN(d.Insomnia) &&
        !isNaN(d.OCD)
    );
    //add an id to each row
    data.forEach((d, i) => {
        d.id = i;
    });

    console.log("cleanData", data);
    console.log("rows", data.length);
    //current selected genre for click interaction
    let selectedGenre = null;
    //current brushed data point from scatter
    let brushedData = null;

    //make genre counts
    const genreCounts = d3.nest()
        .key(d => d["Fav genre"])
        .rollup(v => v.length)
        .entries(data)
        .map(d => ({
            genre: d.key,
            count: d.value
        }))
        .sort((a, b) => b.count - a.count);

    console.log("genreCounts", genreCounts);
        //chart size
        const genreMargin = { top: 60, right: 20, bottom: 85, left: 60 };
        const genreWidth = width * 0.45 - genreMargin.left - genreMargin.right;
        const genreHeight = height * 0.45 - genreMargin.top - genreMargin.bottom;

        //chart position
        const genreG = svg.append("g")
            .attr("transform", `translate(${40 + genreMargin.left}, ${80 + genreMargin.top})`);

        //title
        genreG.append("text")
            .attr("x", genreWidth / 2)
            .attr("y", -35)
            .attr("text-anchor", "middle")
            .attr("font-size", "18px")
            .attr("font-weight", "bold")
            .text("Favorite Music Genre Distribution");

        //small note
        genreG.append("text")
            .attr("x", genreWidth / 2)
            .attr("y", -12)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .text("Overview of favorite genres in the survey");

        //x scale
        const genreX = d3.scaleBand()
            .domain(genreCounts.map(d => d.genre))
            .range([0, genreWidth])
            .padding(0.25);

        //y scale
        const genreY = d3.scaleLinear()
            .domain([0, d3.max(genreCounts, d => d.count)])
            .range([genreHeight, 0])
            .nice();

        //x axis
        genreG.append("g")
            .attr("transform", `translate(0, ${genreHeight})`)
            .call(d3.axisBottom(genreX))
            .selectAll("text")
            .attr("transform", "rotate(-35)")
            .attr("text-anchor", "end")
            .attr("x", -6)
            .attr("y", 8);

        //y axis
        genreG.append("g")
            .call(d3.axisLeft(genreY));

        //x label
        genreG.append("text")
            .attr("x", genreWidth / 2)
            .attr("y", genreHeight + 70)
            .attr("text-anchor", "middle")
            .attr("font-size", "13px")
            .text("Favorite Genre");

        //y label
        genreG.append("text")
            .attr("x", -genreHeight / 2)
            .attr("y", -45)
            .attr("transform", "rotate(-90)")
            .attr("text-anchor", "middle")
            .attr("font-size", "13px")
            .text("Number of Respondents");

        //bars for favorite genre overview
        genreG.selectAll(".genre-bar")
            .data(genreCounts)
            .enter()
            .append("rect")
            .attr("class", "genre-bar")
            .attr("x", d => genreX(d.genre))
            .attr("y", d => genreY(d.count))
            .attr("width", genreX.bandwidth())
            .attr("height", d => genreHeight - genreY(d.count))
            .attr("fill", "#6C63FF")
            .on("click", function(d) {
                //click the same genre to clear
                selectedGenre = selectedGenre === d.genre ? null : d.genre;
                //update all linked views
                updateSelection();
            });

        //chart size
        const scatterMargin = { top: 60, right: 30, bottom: 70, left: 70 };
        const scatterWidth = width * 0.45 - scatterMargin.left - scatterMargin.right;
        const scatterHeight = height * 0.45 - scatterMargin.top - scatterMargin.bottom;

        //chart position
        const scatterG = svg.append("g")
            .attr("transform", `translate(${width * 0.52 + scatterMargin.left}, ${80 + scatterMargin.top})`);

        //title
        scatterG.append("text")
            .attr("x", scatterWidth / 2)
            .attr("y", -35)
            .attr("text-anchor", "middle")
            .attr("font-size", "18px")
            .attr("font-weight", "bold")
            .text("Listening Time vs Anxiety");

        //small note
        scatterG.append("text")
            .attr("x", scatterWidth / 2)
            .attr("y", -12)
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .text("Each dot is one survey response");

        //x scale
        const scatterX = d3.scaleLinear()
            .domain([0, d3.max(data, d => d["Hours per day"])])
            .range([0, scatterWidth])
            .nice();

        //y scale
        const scatterY = d3.scaleLinear()
            .domain([0, 10])
            .range([scatterHeight, 0]);
        
        //store jittered x values for stable dot positions and brushing
        data.forEach(d => {
            d.jitteredHours = d["Hours per day"] + (Math.random() - 0.5) * 0.06;
        });

        //x axis
        scatterG.append("g")
            .attr("transform", `translate(0, ${scatterHeight})`)
            .call(d3.axisBottom(scatterX));

        //y axis
        scatterG.append("g")
            .call(d3.axisLeft(scatterY));

        //x label
        scatterG.append("text")
            .attr("x", scatterWidth / 2)
            .attr("y", scatterHeight + 50)
            .attr("text-anchor", "middle")
            .attr("font-size", "13px")
            .text("Hours per Day");

        //y label
        scatterG.append("text")
            .attr("x", -scatterHeight / 2)
            .attr("y", -45)
            .attr("transform", "rotate(-90)")
            .attr("text-anchor", "middle")
            .attr("font-size", "13px")
            .text("Anxiety Score");

        //dots for survey responses in the scatter plot
        scatterG.selectAll(".scatter-dot")
            .data(data)
            .enter()
            .append("circle")
            .attr("class", "scatter-dot")
            .attr("cx", d => scatterX(d.jitteredHours))
            .attr("cy", d => scatterY(d.Anxiety))
            .attr("r", 3.5)
            .attr("fill", "#FF7A59")
            .attr("opacity", 0.35);
            //brush interaction
            const scatterBrush = d3.brush()
                .extent([[0, 0], [scatterWidth, scatterHeight]])
                .on("brush end", brushed);
            //add the brush layer on top of the scatter plot
            scatterG.append("g")
                .attr("class", "scatter-brush")
                .call(scatterBrush);

        //columns for parallel plot
        const parallelColumns = [
            "Hours per day",
            "Anxiety",
            "Depression",
            "Insomnia",
            "OCD"
        ];

        console.log("parallelColumns", parallelColumns);


        //parallel plot size
        const parallelMargin = { top: 70, right: 60, bottom: 40, left: 60 };
        const parallelWidth = width - parallelMargin.left - parallelMargin.right - 80;
        const parallelHeight = height * 0.36 - parallelMargin.top - parallelMargin.bottom;

        //parallel plot position
        const parallelG = svg.append("g")
            .attr("transform", `translate(${40 + parallelMargin.left}, ${height * 0.58 + parallelMargin.top})`);

        //title
        parallelG.append("text")
            .attr("x", parallelWidth / 2)
            .attr("y", -65)
            .attr("text-anchor", "middle")
            .attr("font-size", "18px")
            .attr("font-weight", "bold")
            .text("Mental Health Profile Across Listening Habits");



        //x positions for columns
        const parallelX = d3.scalePoint()
            .domain(parallelColumns)
            .range([0, parallelWidth]);

        //y scale for each column
        const parallelY = {};

        parallelColumns.forEach(col => {
            parallelY[col] = d3.scaleLinear()
                .domain(d3.extent(data, d => d[col]))
                .range([parallelHeight, 0])
                .nice();
        });

        //line maker
        const line = d3.line();

        //path for one row
        function path(d) {
            return line(parallelColumns.map(col => [
                parallelX(col),
                parallelY[col](d[col])
            ]));
        }

        //draw line
        parallelG.selectAll(".pcp-line")
            .data(data)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("class", "pcp-line")
            .attr("fill", "none")
            .attr("stroke", "gray")
            .attr("stroke-width", 1)
            .attr("opacity", 0.15);

        //draw axes
        parallelColumns.forEach(col => {
            const axisG = parallelG.append("g")
                .attr("transform", `translate(${parallelX(col)}, 0)`);

            axisG.call(d3.axisLeft(parallelY[col]).ticks(5));

            //axis title
            axisG.append("text")
                .attr("y", -32)
                .attr("text-anchor", "middle")
                .attr("font-size", "12px")
                .attr("fill", "black")
                .text(col);
        });
        //update linked views
        function updateSelection() {
            //check if a row matches the selected genre
            const genreMatch = d => selectedGenre === null || d["Fav genre"] === selectedGenre;
            //check if a row is inside the brushed region
            const brushMatch = d => brushedData === null || brushedData.some(b => b.id === d.id);
            //active only when it matches both interaction states
            const isActive = d => genreMatch(d) && brushMatch(d);
            //count currently active rows
            const activeData = data.filter(d => isActive(d));
            //highlight the selected genre bar
            d3.selectAll(".genre-bar")
                .transition()
                .duration(500)
                .attr("fill", d => selectedGenre === null || d.genre !== selectedGenre ? "#6C63FF" : "#FF7A59")
                .attr("opacity", d => selectedGenre === null || d.genre === selectedGenre ? 1 : 0.35);
            //highlight scatter dots
            d3.selectAll(".scatter-dot")
                .transition()
                .duration(300)
                .attr("opacity", d => isActive(d) ? 0.75 : 0.08)
                .attr("r", d => isActive(d) ? 4 : 2.5);
            //highlight parallel coordinate lines that match the selected genre/brush
            d3.selectAll(".pcp-line")
                .transition()
                .duration(300)
                .attr("stroke", d => isActive(d) ? "#FF7A59" : "#D1D5DB")
                .attr("opacity", d => selectedGenre === null && brushedData === null ? 0.12 : (isActive(d) ? 0.75 : 0.04))
                .attr("stroke-width", d => isActive(d) ? 1.8 : 1);
            //update status text for the current selected subset
            const genreText = selectedGenre === null ? "All genres" : selectedGenre;
            const brushText = brushedData === null ? "None" : brushedData.length;
            statusText.text(`Genre: ${genreText} | Brushed: ${brushText} | Showing: ${activeData.length} respondents`);
        }

        function brushed() {
        //update brushed data when drag
            const selection = d3.event.selection;
            //When the brush is cleared remove brushed data and use genre selection
            if (!selection) {
                brushedData = null;
                updateSelection();
                return;
            }

            const x0 = selection[0][0];
            const y0 = selection[0][1];
            const x1 = selection[1][0];
            const y1 = selection[1][1];
            //find points inside the brush rectangle
            brushedData = data.filter(d => {
                const cx = scatterX(d.jitteredHours);
                const cy = scatterY(d.Anxiety);

                return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
            });

            //update all views
            updateSelection();
        }

}).catch(error => {
    console.log(error);
});