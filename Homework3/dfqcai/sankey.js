/** @typedef {import('d3')} */
/** @typedef {import('d3-sankey')} */

export function draw_sankey(){
    console.info("sankey.js in loading");
    d3.csv("./data/ds_salaries.csv").then(rawData =>{
        console.log("rawData", rawData);
        const salary_group_constant = 5;
        const job_group_constant = 8;
        const company_loc_group_constant = 7;
        const DJobTitle = "job_title"
        const DSalary = "salary_in_usd"
        const DCompanyLoc = "company_location"

        //shrink the categories of job_title and company_loc
        const job_counts = [];
        const accept_jobs = new Set();
        const company_loc_counts = [];
        const accept_company_locs = new Set();
        accept_jobs.add("Other");
        accept_company_locs.add("other");
        rawData.forEach(d => {
            const target_job = job_counts.find(node => node["name"] === d[DJobTitle]);
            const target_company_loc = company_loc_counts.find(node => node["name"] === d[DCompanyLoc]);
            if(target_job == undefined){
                job_counts.push({
                    name: d[DJobTitle],
                    value: 1
                });
            }
            else{
                target_job["value"] ++;
            }

            if(target_company_loc == undefined){
                company_loc_counts.push({
                    name: d[DCompanyLoc],
                    value: 1
                });
            }
            else{
                target_company_loc["value"] ++;
            }
        });

        job_counts.sort((a, b) => b["value"] - a["value"] );
        company_loc_counts.sort((a, b) => b["value"] - a["value"] );

        for(let i = 0; i < job_group_constant - 1; i++){
            accept_jobs.add(job_counts[i]["name"]);
        }
        for(let i = 0; i < company_loc_group_constant - 1; i++){
            accept_company_locs.add(company_loc_counts[i]["name"]);
        }

        const processed_data = rawData.map(d => {
            return{
                "job_title": !accept_jobs.has(d[DJobTitle]) ? "Other" : d[DJobTitle],
                "salary_in_usd": d[DSalary] = Number(d[DSalary]),
                "company_location": !accept_company_locs.has(d[DCompanyLoc]) ? "other" : d[DCompanyLoc]
            }
        });

        console.log("processed_data", processed_data);

        // classify nodes
        const job_title = [];
        processed_data.forEach(d => job_title.push(d[DJobTitle]))
        console.log("job_title", job_title)
        const job_nodes = [];
        //Record types of jobs
        job_title.forEach(element => {
            if(job_nodes.find(node => node["name"] === element) == undefined){
                job_nodes.push({name: element, clicked: false})
            }
        });

        /// Record categories of salary based on salary_group_constant 
        const salary = [];
        const salary_nodes = [];

        processed_data.forEach(d => salary.push(d[DSalary]))
        console.log("salary", salary)

        let max_val = Number.MIN_SAFE_INTEGER;
        let min_val = Number.MAX_SAFE_INTEGER;
        salary.forEach(element => {
            if(element > max_val) max_val = element;
            if(element < min_val) min_val = element;
        });
        const range = (max_val - min_val) > 0 ? (max_val - min_val) : 0;
        for(let i = 1; i < salary_group_constant; i++){
            salary_nodes.push({name: ((range / salary_group_constant) * i + min_val), clicked: false});
        }

        const company_loc = [];
        const company_loc_nodes = [];

        processed_data.forEach(d => company_loc.push(d[DCompanyLoc]))
        console.log("company_loc", company_loc)
        //Record types of company_location
        company_loc.forEach(element => {
            if(company_loc_nodes.find(node => node.name === element) == undefined){
                company_loc_nodes.push({name: element, clicked: false})
            }
        });

        console.log("job_nodes", job_nodes);
        console.log("salary_nodes", salary_nodes);
        console.log("company_loc_nodes", company_loc_nodes);
        //classify links
        const links = [];
        const salary_offset = job_nodes.length;
        const company_loc_offset = job_nodes.length + salary_nodes.length;

        //Processing Job to Salary link
        for(let i = 0; i < job_nodes.length; i++){
            for(let k = 0; k < salary_nodes.length; k++){
                const salary_max = salary_nodes[k]["name"];
                const salary_min = k === 0 ? 0 : salary_nodes[k - 1]["name"];
                const J_S_data = processed_data.filter(d => 
                    d[DJobTitle] === job_nodes[i]["name"] 
                    && d[DSalary] <= salary_max
                    && d[DSalary] > salary_min
                );
                if(J_S_data.length == 0) continue;
                links.push({
                    source: i,
                    target: k + salary_offset,
                    value: J_S_data.length,
                    clicked: false
                })

            }
        }

        //Processing Salary to CompanyLoc link
        for(let i = 0; i < salary_nodes.length; i++){
            for(let k = 0; k < company_loc_nodes.length; k++){
                const salary_max = salary_nodes[i]["name"]
                const salary_min = i === 0 ? 0 : salary_nodes[i - 1]["name"];
                const S_C_data = processed_data.filter(d =>  
                    d[DSalary] <= salary_max
                    && d[DSalary] > salary_min
                    && d[DCompanyLoc] === company_loc_nodes[k]["name"]
                );
                if(S_C_data.length == 0) continue;
                links.push({
                    source: i + salary_offset,
                    target: k + company_loc_offset,
                    value: S_C_data.length,
                    clicked: false
                });
            }
        }

        console.log("links", links);
        // sumup all points
        const nodes = [];
        job_nodes.forEach(d => {nodes.push(d)});
        salary_nodes.forEach(d => {nodes.push(d)});
        company_loc_nodes.forEach(d => {nodes.push(d)});

        show_chart();
        window.addEventListener("resize", show_chart);

        function show_chart(){

            // Graph draw
            d3.selectAll('.graph_sankey').selectAll("*").remove();

            //config canvas setting
            const rect = document.querySelector('.graph_sankey').getBoundingClientRect();
            const width = rect.width;
            const height = rect.height;
            const margin = {top: 20, bottom: 0, left: 140, right: 70};
            const innerWidth = width - margin.right;
            const innerHeight = height - margin.top - margin.bottom;

            //preparing pre-process, such as data processing
            const svg = d3.selectAll('.graph_sankey').append('svg').attr('width', width).attr('height', height);
            const sankey_generator = d3.sankey().nodeWidth(20).nodePadding(10).extent([[width > 500 ? margin.left : 0, margin.top], [innerWidth, innerHeight]]);
            const path_generator = d3.sankeyLinkHorizontal();
            const graph_data = sankey_generator({nodes, links});
            console.log("graph_data", graph_data);           

            const color = d3.scaleOrdinal(d3.schemeTableau10);

            //based on nodes print rects
            const rectangle = svg.append("g")
            .selectAll("rect")
            .data(graph_data.nodes)
            .enter()
            .append("rect")
            .attr("x", d => d.x0)
            .attr("y", d => d.y0)
            .attr("width", d => d.x1 - d.x0)
            .attr("height", d => d.y1 - d.y0)
            .attr("fill", d => color(d["name"]))
            .attr("fill-opacity", 0.6);

            //based on links, print paths
            const path = svg.append("g")
            .attr("fill", "none")
            .attr("stroke", "gray")
            .attr("stroke-opacity", 0.4)
            .selectAll("path")
            .data(graph_data.links)
            .enter()
            .append("path")
            .attr("d", path_generator)
            .attr("stroke-width", d => Math.max(1, d.width));


            // when click on path, if the path is selected, it will become unselected, vise versa
            path.on("click", function(event, d) {
                const clicked = graph_data.links[d]["clicked"];
                if(!clicked){
                    d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("stroke", "black")
                    .attr("stroke-opacity", 0.8);
                    graph_data.links[d]["clicked"] = true;
                }
                if (clicked){
                    d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("stroke", "gray")
                    .attr("stroke-opacity", 0.4);
                    graph_data.links[d]["clicked"] = false;
                }

                

                d3.select(this)
                .append("title")
                .text(d => `source: ${d["source"]["name"]}\ntarget: ${d["target"]["name"]}\nnumber of employees: ${d["value"]}`)
            });

            // when click on node it will highlight itself and all links connected
            // can select and unselect nodes
            rectangle.on("click", function(event, d){
                
                const clicked_name = graph_data.nodes[d]["name"];
                const clicked = graph_data.nodes[d]["clicked"];

                if (!clicked){
                    d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("fill-opacity", 1);

                    svg.selectAll("path")
                    .filter(link => link["source"]["name"] === clicked_name || link["target"]["name"] === clicked_name)
                    .transition()
                    .duration(200)
                    .attr("stroke", "black")
                    .attr("stroke-opacity", 0.8);

                    graph_data.links.forEach(link => {
                        if(link["source"]["name"] === clicked_name || link["target"]["name"] === clicked_name){
                            link["clicked"] = true;
                        }
                    });
                    graph_data.nodes[d]["clicked"] = true;
                }
                if(clicked){
                    d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("fill-opacity", 0.6);

                    svg.selectAll("path")
                    .filter(link => link["source"]["name"] === clicked_name || link["target"]["name"] === clicked_name)
                    .transition()
                    .duration(200)
                    .attr("stroke", "gray")
                    .attr("stroke-opacity", 0.4);

                    graph_data.links.forEach(link => {
                        if(link["source"]["name"] === clicked_name || link["target"]["name"] === clicked_name){
                            link["clicked"] = false;
                        }
                    });
                    graph_data.nodes[d]["clicked"] = false;
                }
                
            })

            //print axis on left and on right
            graph_data["nodes"].forEach(d => {
                if(accept_jobs.has(d["name"])){
                    const DName = d["name"];
                    //Since some labels too long, so separate into two part
                    let up_name = "";
                    let down_name = "";
                    for(let i = 0; i < DName.length; i++){
                        if(DName[i] == " "){
                            up_name = DName.substring(0, i);
                            down_name = DName.substring(i+1, DName.length)
                            break
                        }
                    }
                    if(down_name == ""){
                        svg.append("text")
                        .attr("x", d["x0"])
                        .attr("y", (d["y1"] + d["y0"]) / 2)
                        .text(d["name"])
                        .attr("text-anchor", "end")
                    }
                    else{
                        const labels = svg.append("text")
                        .attr("x", d["x0"])
                        .attr("y", (d["y1"] + d["y0"]) / 2)
                        .attr("text-anchor", "end")
                        .style("dominant-baseline", "middle");

                        labels.append("tspan")
                        .attr("x", d["x0"] - 6)
                        .attr("dy", "-0.35em")
                        .text(up_name);

                        labels.append("tspan")
                        .attr("x", d["x0"] - 6)
                        .attr("dy", "1.2em")
                        .text(down_name);
                    }
                    
                }
                if(accept_company_locs.has(d["name"])){
                    svg.append("text")
                    .attr("x", d["x1"])
                    .attr("y", (d["y1"] + d["y0"]) / 2)
                    .text(d["name"])
                    .attr("text-anchor", "start")
                }
            });

            // config legend
            // locate legend
            const legend = svg.append("g")
            .attr("transform", `translate(${width - margin.right + 4}, ${margin.top})`);

            // print legend shape
            legend.selectAll("line")
            .data(graph_data.nodes.filter(cell => Number.isFinite(cell["name"])))
            .join("line")
            .attr("stroke-width", 2)
            .attr("stroke", d => color(d["name"]))
            .attr("fill", "none")
            .attr("x1", 0)
            .attr("x1", 10)
            .attr("y1", (d, i) => i * 20 + 6)
            .attr("y2", (d, i) => i * 20 + 6)
            .style("cursor", "pointer");

            // print description of legend
            legend.selectAll("text")
            .data(graph_data.nodes.filter(cell => Number.isFinite(cell["name"])))
            .join("text")
            .attr("x", 18)
            .attr("y", (d, i) => i * 20 + 10)
            .attr("font-size", 9)
            .text(d => d["name"]);

            const sankey = svg.selectAll("rect").selectAll("path")

            // zoom
            const zoom = d3.zoom()
            .scaleExtent([1, 8])
            .on("zoom", function() {
                svg.attr("transform", d3.event.transform)
            });
            

            svg.append("text")
                .attr("x", innerWidth / 2)
                .attr("y", margin.top / 2)
                .attr("text-anchor", "middle")
                .attr("font-size", 12)
                .text("job, company location, salary sankey graph");

                svg.call(zoom);
            return svg.node();
        }

    });
}
