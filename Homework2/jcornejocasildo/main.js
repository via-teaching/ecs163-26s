// D3 Graph Gallery was used to get skeleton code for graphs: https://d3-graph-gallery.com/index.html

// Load the student mental health dataset.
d3.csv("data/Student Mental health.csv").then(function(data) {
  console.log(data);
  console.log(data.columns);

  // Clean and rename some columns so they are easier to use.
  data.forEach(function(d) {
    d.year = d["Your current year of Study"].toLowerCase().trim();
    d.depression = d["Do you have Depression?"];
    d.anxiety = d["Do you have Anxiety?"];
    d.panic = d["Do you have Panic attack?"];
    d.treatment = d["Did you seek any specialist for a treatment?"];

    if (d.depression === "Yes" || d.anxiety === "Yes" || d.panic === "Yes") {
      d.anyConcern = "Mental Health Concern";
    } else {
      d.anyConcern = "No Mental Health Concern";
    }
  });

  makeOverviewChart(data);
  makeHeatmap(data);
  makeSankey(data);
});