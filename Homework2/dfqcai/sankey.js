/** @typedef {import('d3')} */
/** @typedef {import('d3-sankey')} */

console.info("sankey.js in loading");
d3.csv("./data/ds_salaries.csv").then(rawData =>{
    console.log("rawData", rawData);
    const salary_group_constant = 5;
    const job_group_constant = 8;
    const company_loc_group_constant = 7;
    DJobTitle = "job_title"
    DSalary = "salary_in_usd"
    DCompanyLoc = "company_location"

    //shrink the categories of job_title and company_loc
    job_counts = [];
    accept_jobs = new Set();
    company_loc_counts = [];
    accept_company_locs = new Set();
    rawData.forEach(d => {
        target_job = job_counts.find(node => node["name"] === d[DJobTitle]);
        target_company_loc = company_loc_counts.find(node => node["name"] === d[DCompanyLoc]);
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

    processed_data = rawData.map(d => {
        return{
            "job_title": !accept_jobs.has(d[DJobTitle]) ? "Other" : d[DJobTitle],
            "salary_in_usd": d[DSalary] = Number(d[DSalary]),
            "company_location": !accept_company_locs.has(d[DCompanyLoc]) ? "Other" : d[DCompanyLoc]
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
            job_nodes.push({name: element})
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
        salary_nodes.push({name: ((range / salary_group_constant) * i + min_val)});
    }

    const company_loc = [];
    const company_loc_nodes = [];

    processed_data.forEach(d => company_loc.push(d[DCompanyLoc]))
    console.log("company_loc", company_loc)
    //Record types of company_location
    company_loc.forEach(element => {
        if(company_loc_nodes.find(node => node.name === element) == undefined){
            company_loc_nodes.push({name: element})
        }
    });

    console.log("job_nodes", job_nodes);
    console.log("salary_nodes", salary_nodes);
    console.log("company_loc_nodes", company_loc_nodes);
    //classify links
    links = [];
    salary_offset = job_nodes.length;
    company_loc_offset = job_nodes.length + salary_nodes.length;

    //Processing Job to Salary link
    for(let i = 0; i < job_nodes.length; i++){
        for(let k = 0; k < salary_nodes.length; k++){
            salary_max = salary_nodes[k]["name"];
            salary_min = k === 0 ? 0 : salary_nodes[k - 1]["name"];
            J_S_data = processed_data.filter(d => 
                d[DJobTitle] === job_nodes[i]["name"] 
                && d[DSalary] <= salary_max
                && d[DSalary] > salary_min
            );
            if(J_S_data.length == 0) continue;
            links.push({
                source: i,
                target: k + salary_offset,
                value: J_S_data.length
            })

        }
    }

    //Processing Salary to CompanyLoc link
    for(let i = 0; i < salary_nodes.length; i++){
        for(let k = 0; k < company_loc_nodes.length; k++){
            salary_max = salary_nodes[i]["name"]
            salary_min = i === 0 ? 0 : salary_nodes[i - 1]["name"];
            S_C_data = processed_data.filter(d =>  
                d[DSalary] <= salary_max
                && d[DSalary] > salary_min
                && d[DCompanyLoc] === company_loc_nodes[k]["name"]
            );
            if(S_C_data.length == 0) continue;
            links.push({
                source: i + salary_offset,
                target: k + company_loc_offset,
                value: S_C_data.length
            });
        }
    }

    console.log("links", links);
    // sumup all points
    nodes = [];
    job_nodes.forEach(d => {nodes.push(d)});
    salary_nodes.forEach(d => {nodes.push(d)});
    company_loc_nodes.forEach(d => {nodes.push(d)});

    show_chart();
    window.addEventListener("resize", show_chart);

    function show_chart(){
        // Graph draw
        d3.select('.graph_sankey').selectAll("*").remove();
        const rect = document.querySelector('.graph_sankey').getBoundingClientRect();
        const svg = d3.select('.graph_sankey').append('svg').attr('width', rect.width).attr('height', rect.height);
        const sankey_generator = d3.sankey().nodeWidth(20).nodePadding(10).extent([[0,0], [rect.width, rect.height]]);
        const path_generator = d3.sankeyLinkHorizontal();
        const graph_data = sankey_generator({nodes, links});
        console.log("graph_data", graph_data);

        svg.append("g").selectAll("rect").data(graph_data.nodes).enter().append("rect").attr("x", d => d.x0).attr("y", d => d.y0).attr("width", d => d.x1 - d.x0).attr("height", d => d.y1 - d.y0).attr("fill", "blue");

        svg.append("g").attr("fill", "none").attr("stroke", "rgba(0,0,0,0.3)").attr("stroke-opacity", 0.2).selectAll("path").data(graph_data.links).enter().append("path").attr("d", path_generator).attr("stroke-width", d => Math.max(1, d.width)).attr("fill", "none");
        return svg.node();
    }
});
