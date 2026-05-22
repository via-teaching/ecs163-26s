
let originalData = [];
let selectedType = null;

const tooltip = d3.select('.tooltip');

const typeColors = {
  Grass: '#78C850',
  Fire: '#F08030',
  Water: '#6890F0',
  Electric: '#F8D030',
  Psychic: '#F85888',
  Rock: '#B8A038',
  Dragon: '#7038F8',
  Ghost: '#705898',
  Dark: '#705848',
  Ice: '#98D8D8',
  Fighting: '#C03028',
  Flying: '#A890F0',
  Steel: '#B8B8D0',
  Fairy: '#EE99AC',
  Poison: '#A040A0',
  Ground: '#E0C068',
  Bug: '#A8B820',
  Normal: '#A8A878'
};

d3.csv('data/pokemon.csv').then(data => {

  data.forEach(d => {
    d.Attack = +d.Attack;
    d.Defense = +d.Defense;
    d.HP = +d.HP;
    d.Speed = +d.Speed;
    d.Total = +d.Total;
  });

  originalData = data;

  createBarChart(data);
  createScatterPlot(data);
  createParallelCoordinates(data.slice(0, 120));
});

function createBarChart(data) {

  const svg = d3.select('#bar-chart');

  const width = 600;
  const height = 320;

  svg.attr('viewBox', `0 0 ${width} ${height}`);

  const margin = {
    top: 20,
    right: 20,
    bottom: 70,
    left: 60
  };

  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const chart = svg.append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

  const counts = d3.rollup(
    data,
    v => v.length,
    d => d.Type_1
  );

  const chartData = Array.from(counts, ([type, count]) => ({
    type,
    count
  }));

  const x = d3.scaleBand()
    .domain(chartData.map(d => d.type))
    .range([0, chartWidth])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(chartData, d => d.count)])
    .nice()
    .range([chartHeight, 0]);

  chart.append('g')
    .attr('transform', `translate(0, ${chartHeight})`)
    .call(d3.axisBottom(x));

  chart.append('g')
    .call(d3.axisLeft(y));

  chart.selectAll('rect')
    .data(chartData)
    .enter()
    .append('rect')
    .attr('x', d => x(d.type))
    .attr('y', d => y(d.count))
    .attr('width', x.bandwidth())
    .attr('height', d => chartHeight - y(d.count))
    .attr('fill', d => typeColors[d.type] || '#999')
    .style('cursor', 'pointer')

    // Selection interaction
    .on('click', (event, d) => {

      selectedType = d.type;

      const filtered = originalData.filter(
        p => p.Type_1 === selectedType
      );

      updateScatter(filtered);
      updateParallel(filtered.slice(0, 120));
    });
}

let scatterX;
let scatterY;

function createScatterPlot(data) {

  const svg = d3.select('#scatter-plot');

  const width = 600;
  const height = 320;

  svg.attr('viewBox', `0 0 ${width} ${height}`);

  const margin = {
    top: 20,
    right: 30,
    bottom: 60,
    left: 60
  };

  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const chart = svg.append('g')
    .attr('class', 'scatter-group')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

  scatterX = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.Attack) + 20])
    .range([0, chartWidth]);

  scatterY = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.Defense) + 20])
    .range([chartHeight, 0]);

  chart.append('g')
    .attr('transform', `translate(0, ${chartHeight})`)
    .call(d3.axisBottom(scatterX));

  chart.append('g')
    .call(d3.axisLeft(scatterY));

  chart.selectAll('circle')
    .data(data)
    .enter()
    .append('circle')
    .attr('cx', d => scatterX(d.Attack))
    .attr('cy', d => scatterY(d.Defense))
    .attr('r', 5)
    .attr('fill', d => typeColors[d.Type_1] || '#999')
    .attr('opacity', 0.7);

  // Brush interaction
  const brush = d3.brush()
    .extent([[0, 0], [chartWidth, chartHeight]])
    .on('end', brushed);

  chart.append('g').call(brush);

  function brushed(event) {

    if (!event.selection) return;

    const [[x0, y0], [x1, y1]] = event.selection;

    const brushedData = data.filter(d => {

      const cx = scatterX(d.Attack);
      const cy = scatterY(d.Defense);

      return x0 <= cx && cx <= x1 &&
             y0 <= cy && cy <= y1;
    });

    updateParallel(brushedData.slice(0, 120));
  }
}

function createParallelCoordinates(data) {

  drawParallel(data);
}

function drawParallel(data) {

  const svg = d3.select('#parallel-chart');

  svg.selectAll('*').remove();

  const width = 1200;
  const height = 380;

  svg.attr('viewBox', `0 0 ${width} ${height}`);

  const margin = {
    top: 40,
    right: 40,
    bottom: 20,
    left: 40
  };

  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const chart = svg.append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

  const dimensions = [
    'HP',
    'Attack',
    'Defense',
    'Speed'
  ];

  const y = {};

  dimensions.forEach(dim => {
    y[dim] = d3.scaleLinear()
      .domain(d3.extent(originalData, d => d[dim]))
      .range([chartHeight, 0]);
  });

  const x = d3.scalePoint()
    .domain(dimensions)
    .range([0, chartWidth]);

  function path(d) {
    return d3.line()(dimensions.map(p => [x(p), y[p](d[p])]));
  }

  chart.selectAll('path')
    .data(data)
    .enter()
    .append('path')
    .attr('d', path)
    .attr('fill', 'none')
    .attr('stroke', d => typeColors[d.Type_1] || '#999')
    .attr('stroke-width', 1.5)
    .attr('opacity', 0)

    // Animated transition
    .transition()
    .duration(1000)
    .attr('opacity', 0.4);

  dimensions.forEach(dim => {

    chart.append('g')
      .attr('transform', `translate(${x(dim)})`)
      .call(d3.axisLeft(y[dim]));

    chart.append('text')
      .attr('x', x(dim))
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .text(dim);
  });
}

function updateScatter(data) {

  const chart = d3.select('.scatter-group');

  const circles = chart
    .selectAll('circle')
    .data(data, d => d.Name);

  circles.enter()
    .append('circle')
    .merge(circles)

    // Animated transition
    .transition()
    .duration(1000)

    .attr('cx', d => scatterX(d.Attack))
    .attr('cy', d => scatterY(d.Defense))
    .attr('r', 5)
    .attr('fill', d => typeColors[d.Type_1] || '#999')
    .attr('opacity', 0.75);

  circles.exit()
    .transition()
    .duration(500)
    .attr('opacity', 0)
    .remove();
}

function updateParallel(data) {

  drawParallel(data);
}
