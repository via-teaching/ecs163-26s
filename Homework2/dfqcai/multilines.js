export function draw_multilines(){
    d3.csv("./data/ds_salaries.csv").then(raw_data => {
        console.log("raw_data", raw_data);

        // array of years, used for filtering
        const years = d3.range(2020, 2024, 1);
        const DExpLevel = "experience_level";
        const DSalary = "salary_in_usd";
        const DWorkYear = "work_year";

        //Sumup datas in exp_levels
        const processed_data = [];
        for(let i = 0; i < raw_data.length; i++){
            const exp_level = raw_data[i][DExpLevel];
            const target = processed_data.find(cell => cell.exp_level === exp_level);
            
            // if new dataset is empty or specific exp_level has not been added yet, add it
            // processed_data: [{exp_level: String, value: [{year: num, salary: num}]}]
            if(!target){
            processed_data.push({
                exp_level: exp_level, 
                value: years.map(year => ({
                    num_emp_in_exp_level: 1,
                    year: year, 
                    salary: raw_data[i][DWorkYear] === year ? raw_data[i][DSalary] / 1000 : 0
                }))
            })
            continue;
            }
            
            // if specific dataset already exist in new dataset, do sumup
            const year = +raw_data[i][DWorkYear];
            const scd_target = target["value"].find(cell => cell["year"] === year);
            scd_target["salary"] += raw_data[i][DSalary] / 1000;
            scd_target["num_emp_in_exp_level"] ++;
        }

        // average salary based on the number of countries in exp_levels(sum of capita in exp_level / #countries in exp_level)
        processed_data.forEach(d => years.forEach((y, index) => d["value"][index]["salary"] /= d["value"][index]["num_emp_in_exp_level"] / 1000));
        console.log("processed_data", processed_data);

        show_chart();
        window.addEventListener("resize", show_chart);

        function show_chart(){
            const rect = document.querySelector('.graph_multilines').getBoundingClientRect();
            const width = rect.width;
            const height = rect.height;
    
            const margin = {top: 40, bottom: 50, left: 60, right: 140};
    
            const innerWidth = width - margin.left - margin.right;
            const innerHeight = height - margin.top - margin.bottom;

            d3.selectAll('.graph_multilines').selectAll("*").remove();
            const svg = d3.selectAll('.graph_multilines').append('svg').attr('width', width).attr('height', height);
            const allPoints = d3.merge(processed_data.map(d => d.value));
        
            // data mapping
            const x = d3.scaleLinear()
                        .domain(d3.extent(allPoints, d => d.year))
                        .range([margin.left, width - margin.right])
                        .nice();

            // y is exp_level average salary per country
            const y = d3.scaleLinear()
                        .domain([0, d3.max(allPoints, d => (d.salary))])
                        .range([height - margin.bottom, margin.top])
                        .nice();

            // config color
            const exp_levels = Array.from(new Set(processed_data.map(d => d.exp_level)));
            const color = d3.scaleOrdinal().domain(exp_levels).range(d3.schemeDark2);

            //config line
            const lineGenerator = d3.line()
                                    .x(d => x(d.year))
                                    .y(d => y(d.salary));
            
            const paths = svg.append("g")
            .selectAll("path")
            .data(processed_data)
            .join("path")
            .attr("class", "exp_levelEmiPaths")
            .attr("d", d => lineGenerator(d.value))
            .attr("stroke-width", 2)
            .attr("stroke", d => color(d.exp_level))
            .attr("fill", "none");

            // print mouseenter information
            svg.append("g")
                .selectAll("g")
                .data(processed_data)
                .join("g")
                .each(function(exp_level_val) {
                d3.select(this)
                .selectAll("circle")
                .data(d => d.value)
                .data(d => d.value)
                .join("circle")
                .attr("cx", d => x(d.year))
                .attr("cy", d => y(d.salary))
                .attr("r", 4)
                .attr("fill", d => color(exp_level_val.exp_level))
                .append("title")
                .text(d => `exp_level: ${exp_level_val.exp_level}\nYear: ${d.year}\nAvesalary: ${d.salary}\nnumber of employee: ${d.num_emp_in_exp_level}`);
                })
                

            // config axis
            const xAxis = d3.axisBottom(x).tickPadding(3).ticks(years.length);
            svg.append("g").attr("transform", `translate(0, ${height - margin.bottom})`).call(xAxis);

            const yAxis = d3.axisLeft(y).tickSize(5);
            svg.append("g").attr("transform", `translate(${margin.left}, 0)`).call(yAxis);

            // config information
            svg.append("text")
                .attr("x", margin.left + innerWidth / 2)
                .attr("y", height - 10)
                .attr("text-archor", "middle")
                .attr("font-size", 12)
                .text("Years");

            svg.append("text")
                .attr("x", margin.left + innerWidth / 2)
                .attr("y", margin.top / 2)
                .attr("text-anchor", "middle")
                .attr("font-size", 12)
                .text("employee experience level and average salary tendency graph");

            svg.append("text")
                .attr("transform", `translate(15, ${margin.top + innerHeight / 2}) rotate(-90)`)
                .attr("text-anchor", "middle")
                .attr("font-size", 12)
                .text("salary");

            // config legend
            // locate legend
            const legend = svg.append("g")
            .attr("transform", `translate(${width - margin.right + 4}, ${margin.top})`);

            // print legend shape
            legend.selectAll("line")
            .data(exp_levels)
            .join("line")
            .attr("stroke-width", 2)
            .attr("stroke", d => color(d))
            .attr("fill", "none")
            .attr("x1", 0)
            .attr("x1", 10)
            .attr("y1", (d, i) => i * 20 + 6)
            .attr("y2", (d, i) => i * 20 + 6)
            .style("cursor", "pointer");

            // print description of legend
            legend.selectAll("text")
            .data(exp_levels)
            .join("text")
            .attr("x", 18)
            .attr("y", (d, i) => i * 20 + 10)
            .attr("font-size", 9)
            .text(d => d);

            return svg.node();
        }
    });
}