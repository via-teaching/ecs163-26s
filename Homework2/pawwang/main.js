const width = 1250;
const height = 1000;

const svg = d3.select("svg")
  .attr("width", width)
  .attr("height", height);

const margin = { top: 60, right: 40, bottom: 70, left: 90 };
const chartWidth = 600 - margin.left - margin.right;
const chartHeight = 400 - margin.top - margin.bottom;

d3.csv("data/ds_salaries.csv").then(data => {
    data.forEach(d => {
        d.work_year = +d.work_year;
        d.salary_in_usd = +d.salary_in_usd;
        d.remote_ratio = +d.remote_ratio;
    });

    console.log("Data loaded:", data);
    console.log("First row:", data[0]);

  // View 1: Average Salary by Experience Level
    const salaryGroups = {};

    data.forEach(d => {
    const level = d.experience_level;

    if (!salaryGroups[level]) {
        salaryGroups[level] = {
        total: 0,
        count: 0
        };
    }

    salaryGroups[level].total += d.salary_in_usd;
    salaryGroups[level].count += 1;
    });

    const salaryByExperience = Object.keys(salaryGroups).map(level => {
        return {
            experience_level: level,
            avg_salary: salaryGroups[level].total / salaryGroups[level].count
        };
    });

    const experienceOrder = ["EN", "MI", "SE", "EX"];

    salaryByExperience.sort((a, b) => {
        return experienceOrder.indexOf(a.experience_level) - experienceOrder.indexOf(b.experience_level);
    });

    console.log("salaryByExperience:", salaryByExperience);

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const x = d3.scaleBand()
        .domain(salaryByExperience.map(d => d.experience_level))
        .range([0, chartWidth])
        .padding(0.3);

    const y = d3.scaleLinear()
        .domain([0, d3.max(salaryByExperience, d => d.avg_salary)])
        .range([chartHeight, 0])
        .nice();

    g.append("text")
        .attr("x", chartWidth / 2)
        .attr("y", -25)
        .attr("text-anchor", "middle")
        .attr("font-size", "22px")
        .attr("font-weight", "bold")
        .text("Average Salary by Experience Level");

    g.append("g")
        .attr("transform", `translate(0, ${chartHeight})`)
        .call(d3.axisBottom(x));

    g.append("g")
        .call(d3.axisLeft(y));

    g.append("text")
        .attr("x", chartWidth / 2)
        .attr("y", chartHeight + 50)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .text("Experience Level");

    g.append("text")
        .attr("x", -chartHeight / 2)
        .attr("y", -65)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .text("Average Salary in USD");

    g.selectAll("rect")
        .data(salaryByExperience)
        .enter()
        .append("rect")
        .attr("x", d => x(d.experience_level))
        .attr("y", d => y(d.avg_salary))
        .attr("width", x.bandwidth())
        .attr("height", d => chartHeight - y(d.avg_salary))
        .attr("fill", "steelblue");
    
    const barLegend = g.append("g")
        .attr("transform", `translate(${chartWidth - 170}, 10)`);

    barLegend.append("rect")
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", "steelblue");

    barLegend.append("text")
        .attr("x", 18)
        .attr("y", 10)
        .attr("font-size", "12px")
        .text("Average salary");
    
    // View 2: Scatter Plot - Salary by Work Year
    const scatterMargin = { top: 60, right: 40, bottom: 70, left: 90 };
    const scatterWidth = 600 - scatterMargin.left - scatterMargin.right;
    const scatterHeight = 400 - scatterMargin.top - scatterMargin.bottom;

    const scatterG = svg.append("g")
        .attr("transform", `translate(${scatterMargin.left}, ${470 + scatterMargin.top})`);

    const xScatter = d3.scaleLinear()
        .domain(d3.extent(data, d => d.work_year))
        .range([0, scatterWidth]);

    const yScatter = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.salary_in_usd)])
        .range([scatterHeight, 0])
        .nice();

    const colorScatter = d3.scaleOrdinal()
        .domain(["EN", "MI", "SE", "EX"])
        .range(["#8dd3c7", "#ffffb3", "#bebada", "#fb8072"]);

    scatterG.append("text")
        .attr("x", scatterWidth / 2)
        .attr("y", -25)
        .attr("text-anchor", "middle")
        .attr("font-size", "22px")
        .attr("font-weight", "bold")
        .text("Salary by Work Year");

    scatterG.append("g")
        .attr("transform", `translate(0, ${scatterHeight})`)
        .call(d3.axisBottom(xScatter).ticks(4).tickFormat(d3.format("d")));

    scatterG.append("g")
        .call(d3.axisLeft(yScatter));

    scatterG.append("text")
        .attr("x", scatterWidth / 2)
        .attr("y", scatterHeight + 50)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .text("Work Year");

    scatterG.append("text")
        .attr("x", -scatterHeight / 2)
        .attr("y", -65)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .text("Salary in USD");

    scatterG.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", d => xScatter(d.work_year))
        .attr("cy", d => yScatter(d.salary_in_usd))
        .attr("r", 3)
        .attr("fill", d => colorScatter(d.experience_level))
        .attr("opacity", 0.45);

    // Legend for scatter plot
    const legendData = [
        { label: "EN: Entry-level", value: "EN" },
        { label: "MI: Mid-level", value: "MI" },
        { label: "SE: Senior-level", value: "SE" },
        { label: "EX: Executive-level", value: "EX" }
    ];

    const legend = scatterG.append("g")
        .attr("transform", `translate(${scatterWidth - 130}, 10)`);

    legend.selectAll("rect")
        .data(legendData)
        .enter()
        .append("rect")
        .attr("x", 0)
        .attr("y", (d, i) => i * 22)
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", d => colorScatter(d.value));

    legend.selectAll("text")
        .data(legendData)
        .enter()
        .append("text")
        .attr("x", 18)
        .attr("y", (d, i) => i * 22 + 10)
        .attr("font-size", "12px")
        .text(d => d.label);

    // View 3: Parallel Coordinates Plot
    const pcMargin = { top: 80, right: 100, bottom: 60, left: 70 };
    const pcWidth = 640 - pcMargin.left - pcMargin.right;
    const pcHeight = 380 - pcMargin.top - pcMargin.bottom;

    const pcLeft = 660;
    const pcTop = 60;

    const pcG = svg.append("g")
        .attr("transform", `translate(${pcLeft}, ${pcTop})`);

    const experienceMap = {
        "EN": 1,
        "MI": 2,
        "SE": 3,
        "EX": 4
    };

    const companySizeMap = {
        "S": 1,
        "M": 2,
        "L": 3
    };

    const pcData = data
        .filter(d => d.salary_in_usd > 0)
        .map(d => {
            return {
            work_year: d.work_year,
            experience_level: experienceMap[d.experience_level],
            remote_ratio: d.remote_ratio,
            company_size: companySizeMap[d.company_size],
            salary_in_usd: d.salary_in_usd,
            original_experience: d.experience_level
        };
    });

    const sampledPcData = pcData.filter((d, i) => i % 5 === 0);

    const dimensions = [
    "work_year",
    "experience_level",
    "remote_ratio",
    "company_size",
    "salary_in_usd"
    ];

    const dimensionLabels = {
        work_year: "Work Year",
        experience_level: "Experience",
        remote_ratio: "Remote Ratio",
        company_size: "Company Size",
        salary_in_usd: "Salary USD"
    };

    const xPc = d3.scalePoint()
        .domain(dimensions)
        .range([0, pcWidth])
        .padding(0.5);

    const yPc = {};

    yPc.work_year = d3.scaleLinear()
        .domain(d3.extent(pcData, d => d.work_year))
        .range([pcHeight, 0]);

    yPc.experience_level = d3.scaleLinear()
        .domain([1, 4])
        .range([pcHeight, 0]);

    yPc.remote_ratio = d3.scaleLinear()
        .domain([0, 100])
        .range([pcHeight, 0]);

    yPc.company_size = d3.scaleLinear()
        .domain([1, 3])
        .range([pcHeight, 0]);

    yPc.salary_in_usd = d3.scaleLinear()
        .domain([0, d3.max(pcData, d => d.salary_in_usd)])
        .range([pcHeight, 0])
        .nice();

    const pcColor = d3.scaleOrdinal()
        .domain(["EN", "MI", "SE", "EX"])
        .range(["#8dd3c7", "#ffffb3", "#bebada", "#fb8072"]);

    function path(d) {
        return d3.line()(dimensions.map(p => {
            return [xPc(p), yPc[p](d[p])];
        }));
    }

    // Title
    pcG.append("text")
        .attr("x", pcWidth / 2)
        .attr("y", -25)
        .attr("text-anchor", "middle")
        .attr("font-size", "22px")
        .attr("font-weight", "bold")
        .text("Parallel Coordinates: Job Salary Factors");

    // Lines
    pcG.selectAll("path")
        .data(sampledPcData)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", "none")
        .attr("stroke", d => pcColor(d.original_experience))
        .attr("stroke-width", 1)
        .attr("opacity", 0.25);

    // Axes
    dimensions.forEach(dimension => {
        const axisGroup = pcG.append("g")
        .attr("transform", `translate(${xPc(dimension)}, 0)`);

    if (dimension === "experience_level") {
        axisGroup.call(
        d3.axisLeft(yPc[dimension])
            .ticks(4)
            .tickFormat(d => {
                if (d === 1) return "EN";
                if (d === 2) return "MI";
                if (d === 3) return "SE";
                if (d === 4) return "EX";
                return "";
            })
        );
    } else if (dimension === "company_size") {
        axisGroup.call(
        d3.axisLeft(yPc[dimension])
            .ticks(3)
            .tickFormat(d => {
                if (d === 1) return "S";
                if (d === 2) return "M";
                if (d === 3) return "L";
                return "";
            })
        );
    } else if (dimension === "work_year") {
        axisGroup.call(
        d3.axisLeft(yPc[dimension])
                .ticks(4)
                .tickFormat(d3.format("d"))
            );
        } else {
        axisGroup.call(d3.axisLeft(yPc[dimension]).ticks(5));
    }

    axisGroup.append("text")
        .attr("x", 0)
        .attr("y", pcHeight + 35)
        .attr("text-anchor", "middle")
        .attr("font-size", "13px")
        .attr("fill", "black")
        .text(dimensionLabels[dimension]);
    });

    // Legend
    const pcLegendData = [
        { label: "EN: Entry-level", value: "EN" },
        { label: "MI: Mid-level", value: "MI" },
        { label: "SE: Senior-level", value: "SE" },
        { label: "EX: Executive-level", value: "EX" }
    ];

    const pcLegend = pcG.append("g")
        .attr("transform", `translate(${pcWidth + 20}, 10)`);

    pcLegend.selectAll("rect")
        .data(pcLegendData)
        .enter()
        .append("rect")
        .attr("x", 0)
        .attr("y", (d, i) => i * 22)
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", d => pcColor(d.value));

    pcLegend.selectAll("text")
        .data(pcLegendData)
        .enter()
        .append("text")
        .attr("x", 18)
        .attr("y", (d, i) => i * 22 + 10)
        .attr("font-size", "12px")
        .text(d => d.label);

    }).catch(error => {
        console.error("Error loading data:", error);
    });