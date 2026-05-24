export function draw_bar(){
    d3.csv("./data/ds_salaries.csv").then(raw_data => {
        console.log("raw_data", raw_data)
        const TEmpType = "employment_type";
        const TSalary = "salary_in_usd";
        const processed_data = [];
        const emp_types = new Set();
        raw_data.forEach(d => {
            if(!emp_types.has(d[TEmpType])){
                processed_data.push({
                    emp_type: d[TEmpType],
                    salary: d[TSalary] / 1000,
                    class_count: 1
                });
                emp_types.add(d[TEmpType]);
            }
            else{
                const target = processed_data.find(cell => cell["emp_type"] === d[TEmpType]);
                target["salary"] += d[TSalary] / 1000;
                target["class_count"] ++;
            }
        });

        processed_data.forEach(d => {
            d["salary"] /= d["class_count"] / 1000;
        });

        console.log("processed_data", processed_data);

        show_chart();
        window.addEventListener("resize", show_chart)
        function show_chart(){
            const rect = document.querySelector('.graph_bar').getBoundingClientRect();
            const width = rect.width;
            const height = rect.height;
    
            const margin = {top: 40, bottom: 50, left: 60, right: 140};
    
            const innerWidth = width - margin.left - margin.right;
            const innerHeight = height - margin.top - margin.bottom;

            d3.selectAll('.graph_bar').selectAll("*").remove();
            const svg = d3.selectAll('.graph_bar').append('svg').attr('width', width).attr('height', height);
            
            const x = d3.scaleBand()
            .domain(processed_data.map(d => d["emp_type"]))
            .range([margin.left, width - margin.right])

            const y = d3.scaleLinear()
            .domain([0, d3.max(processed_data, d => d["salary"])])
            .range([height - margin.bottom, margin.top])
            .nice();

            const emp_types = Array.from(new Set(processed_data.map(d => d["emp_type"])));
            const color = d3.scaleOrdinal().domain(emp_types).range(d3.schemeDark2);

            // config axis
            const xAxis = d3.axisBottom(x).tickPadding(3).ticks(processed_data.length);
            svg.append("g").attr("transform", `translate(0, ${height - margin.bottom})`).call(xAxis);

            const yAxis = d3.axisLeft(y).tickSize(5);
            svg.append("g").attr("transform", `translate(${margin.left}, 0)`).call(yAxis);

            // draw graph
            const rects = svg.selectAll("rect")
            .data(processed_data)
            .enter()
            .append("rect")
            .attr("x", d => x(d["emp_type"]))
            .attr("y", d => y(d["salary"]))
            .attr("width", x.bandwidth())
            .attr("height", d => (height - margin.bottom) - y(d["salary"]))
            .attr("fill", d => color(d["emp_type"]))

            // print mouseenter information
            rects.append("title")
            .data(processed_data)
            .text(d => `emp_type: ${d["emp_type"]}\nAvesalary: ${d["salary"]}\nnumber of employee: ${d["class_count"]}`);

            // config information
            svg.append("text")
                .attr("x", margin.left + innerWidth / 2)
                .attr("y", height - 10)
                .attr("text-archor", "middle")
                .attr("font-size", 12)
                .text("Employment Type");

            svg.append("text")
                .attr("x", margin.left + innerWidth / 2)
                .attr("y", margin.top / 2)
                .attr("text-anchor", "middle")
                .attr("font-size", 12)
                .text("employment type and average salary comparison graph");

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
            .data(processed_data)
            .join("line")
            .attr("stroke-width", 2)
            .attr("stroke", d => color(d["emp_type"]))
            .attr("fill", "none")
            .attr("x1", 0)
            .attr("x1", 10)
            .attr("y1", (d, i) => i * 20 + 6)
            .attr("y2", (d, i) => i * 20 + 6)
            .style("cursor", "pointer");

            // print description of legend
            legend.selectAll("text")
            .data(processed_data)
            .join("text")
            .attr("x", 18)
            .attr("y", (d, i) => i * 20 + 10)
            .attr("font-size", 9)
            .text(d => d["emp_type"]);

            return svg.node();

        }
    });
}