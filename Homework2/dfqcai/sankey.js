/** @typedef {import('d3')} */

d3.csv("./data/ds_salaries.csv").then(rawData => console.log("rawData", rawData));
const salary_group_constant = 5;
DJobTitle = "job_title"
DSalary = "salary_in_usd"
DCompanyLoc = "company_location"

//Change str to num
rawData.forEach(function(d){
    d.salary_in_usd = Number(d.salary_in_usd);
});

// classify nodes
const job_title = rawData[DJobTitle];
const job_nodes = [];
//Record types of jobs
job_title.array.forEach(element => {
    if(job_nodes.find(node => {node.name === element}) == undefined){
        job_nodes.push({name: element})
    }
});

/// Record categories of salary based on salary_group_constant 
const salary = rawData[DSalary];
const salary_nodes = [];

let max_val = Integer.MIN_VALUE;
let min_val = Integer.MAX_VALUE;
salary.forEach(element => {
    if(element > max_val) max_val = element;
    if(element < min_val) min_val = element;
});
const range = (max_val - min_val) > 0 ? (max_val - min_val) : 0;
for(let i = 1; i < salary_group_constant; i++){
    salary_nodes.push({name: (range / salary_group_constant + min_val)});
}

const company_loc = rawData[DCompanyLoc];
const company_loc_nodes = [];
//Record types of company_location
company_loc.array.forEach(element => {
    if(company_loc_nodes.find(node => {node.name === element}) == undefined){
        company_loc_nodes.push({name: element})
    }
});

//classify links
links_J_S = [];
links_S_C = [];

//Processing Job to Salary link
for(let i = 0; i < job_nodes.length; i++){
    for(let k = 0; k < salary_nodes.length; k++){
        salary_max = salary_nodes[i]["name"]
        salary_min = i === 0 ? 0 : salary_nodes[i - 1]["name"];
        J_S_data = rawData.filter(d => {
            d[DJobTitle] === job_nodes[i]["name"] 
            && d[DSalary] <= salary_max
            && d[DSalary] > salary_min
        });
        links_J_S.push({
            source: i,
            target: k,
            value: J_S_data.length
        })

    }
}

//Processing Salary to CompanyLoc link
for(let i = 0; i < salary_nodes.length; i++){
    for(let k = 0; k < company_loc_nodes.length; k++){
        salary_max = salary_nodes[i]["name"]
        salary_min = i === 0 ? 0 : salary_nodes[i - 1]["name"];
        S_C_data = rawData.filter(d => { 
            d[DSalary] <= salary_max
            && d[DSalary] > salary_min
            && d[DCompanyLoc] === company_loc_nodes[k]["name"]
        });
        links_S_C.push({
            source: i,
            target: k,
            value: S_C_data.length
        });
    }
}

// Graph draw
d3.select('.graph_sankey')
