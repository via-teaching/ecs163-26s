// Section 1 stub — load data and confirm the first row in the console.
// Charts will be built in subsequent sections.
d3.csv("data/pokemon.csv").then(data => {
  console.log(data[0]);
});
