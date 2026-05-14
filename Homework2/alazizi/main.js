const CATEGORY_COLORS = {
  Moisturizer: "#d84f8f",
  Cleanser: "#2aa6a1",
  Treatment: "#8e5cc7",
  "Face Mask": "#ef8f52",
  "Eye cream": "#4f7ccf",
  "Sun protect": "#d6a21f"
};

const PRICE_TIERS = [
  { key: "Under $25", min: 0, max: 25, color: "#f8bfd4" },
  { key: "$25-$60", min: 25, max: 60, color: "#a8d8f0" },
  { key: "$60+", min: 60, max: Infinity, color: "#c6b3f2" }
];

const SKIN_TYPES = ["Combination", "Dry", "Normal", "Oily", "Sensitive"];
const tooltip = d3.select("#tooltip");

function showTooltip(event, html) {
  tooltip
    .style("left", `${event.clientX}px`)
    .style("top", `${event.clientY}px`)
    .style("opacity", 1)
    .html(html);
}

function hideTooltip() {
  tooltip.style("opacity", 0);
}

function formatMoney(value) {
  return d3.format("$,.0f")(value);
}

function ingredientCount(ingredients) {
  return ingredients
    ? ingredients.split(",").map(d => d.trim()).filter(Boolean).length
    : 0;
}

function priceTier(price) {
  return PRICE_TIERS.find(tier => price >= tier.min && price < tier.max)?.key || PRICE_TIERS[0].key;
}

function parseProduct(row) {
  const category = row.Label || row["﻿Label"];
  const price = +row.Price;
  const rank = +row.Rank;
  const skinFlags = Object.fromEntries(SKIN_TYPES.map(type => [type, +row[type] || 0]));

  return {
    category,
    brand: row.Brand,
    name: row.Name,
    price,
    rank,
    ingredients: row.Ingredients,
    ingredientCount: ingredientCount(row.Ingredients),
    priceTier: priceTier(price),
    skinCount: d3.sum(SKIN_TYPES, type => skinFlags[type]),
    ...skinFlags
  };
}

function productTooltip(d) {
  const skinTypes = SKIN_TYPES.filter(type => d[type]).join(", ") || "No listed skin type";
  return `
    <strong>${d.brand}: ${d.name}</strong>
    ${d.category} · ${formatMoney(d.price)} · rank ${d.rank.toFixed(1)}<br>
    ${d.ingredientCount} ingredients · ${skinTypes}
  `;
}

function setSummary(data) {
  const avgPrice = d3.mean(data, d => d.price);
  const avgRank = d3.mean(data.filter(d => d.rank > 0), d => d.rank);

  d3.select("#measure-count").text(d3.format(",")(data.length));
  d3.select("#year-range").text(formatMoney(avgPrice));
  d3.select("#pass-rate").text(avgRank.toFixed(1));
}

function fitSvg(svg) {
  const node = svg.node();
  const bounds = node.getBoundingClientRect();
  const width = Math.max(320, bounds.width);
  const height = Math.max(180, bounds.height);
  svg.attr("viewBox", `0 0 ${width} ${height}`);
  return { width, height };
}

function responsiveTitle(width, fullTitle, shortTitle) {
  return width < 620 ? shortTitle : fullTitle;
}

function wrapAxisText(selection, maxChars) {
  selection.each(function(label) {
    const text = d3.select(this);
    const words = String(label).split(/\s+/);
    if (words.join(" ").length <= maxChars || words.length === 1) return;

    text.text(null);
    words.forEach((word, index) => {
      text.append("tspan")
        .attr("x", 0)
        .attr("dy", index === 0 ? 0 : "1.1em")
        .text(word);
    });
  });
}

function drawCategoryLegend(svg, categories, x, y, compact = false) {
  const shownCategories = compact ? categories.slice(0, 4) : categories;

  // Add a category legend that keeps product colors consistent across views.
  const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${x}, ${y})`);

  // Add a heading without joining it to the category-label data.
  legend.append("text")
    .attr("class", "legend-heading")
    .attr("x", 0)
    .attr("y", 0)
    .text("Product category");

  // Add one grouped legend item per cosmetic category.
  const items = legend.selectAll(".legend-item")
    .data(shownCategories)
    .enter()
    .append("g")
    .attr("class", "legend-item")
    .attr("transform", (d, i) => `translate(0, ${14 + i * 19})`);

  // Add one rounded color swatch for each cosmetic category.
  items.append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", 11)
    .attr("height", 11)
    .attr("rx", 3)
    .attr("fill", d => CATEGORY_COLORS[d]);

  // Add category names next to the legend swatches.
  items.append("text")
    .attr("x", 17)
    .attr("y", 9)
    .text(d => d);
}

function drawHorizontalCategoryLegend(svg, categories, x, y, columns) {
  const itemWidth = 92;
  const rowHeight = 17;

  // Add a visible horizontal legend for the advanced line colors.
  const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${x}, ${y})`);

  // Add one rounded swatch for each product category in a compact grid.
  legend.selectAll("rect")
    .data(categories)
    .enter()
    .append("rect")
    .attr("x", (d, i) => (i % columns) * itemWidth)
    .attr("y", (d, i) => Math.floor(i / columns) * rowHeight)
    .attr("width", 10)
    .attr("height", 10)
    .attr("rx", 3)
    .attr("fill", d => CATEGORY_COLORS[d]);

  // Add category labels beside the swatches so the advanced view has a clear legend.
  legend.selectAll("text")
    .data(categories)
    .enter()
    .append("text")
    .attr("x", (d, i) => (i % columns) * itemWidth + 15)
    .attr("y", (d, i) => Math.floor(i / columns) * rowHeight + 9)
    .text(d => d);
}

function drawPriceTierLegend(svg, x, y, compact = false) {
  const tiers = compact ? PRICE_TIERS.slice(0, 3) : PRICE_TIERS;

  // Add a price-tier legend for the stacked overview bars.
  const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${x}, ${y})`);

  // Add pink swatches ordered from lower to higher price tiers.
  legend.selectAll("rect")
    .data(tiers)
    .enter()
    .append("rect")
    .attr("x", 0)
    .attr("y", (d, i) => i * 19)
    .attr("width", 11)
    .attr("height", 11)
    .attr("rx", 3)
    .attr("fill", d => d.color);

  // Add readable labels for each price tier.
  legend.selectAll("text")
    .data(tiers)
    .enter()
    .append("text")
    .attr("x", 17)
    .attr("y", (d, i) => i * 19 + 9)
    .text(d => compact ? d.key.replace("Under ", "<").replace("$25-$60", "$25-60").replace("$60-$120", "$60+") : d.key);
}

function drawOverview(data) {
  const svg = d3.select("#overview-chart");
  svg.selectAll("*").remove();

  const { width, height } = fitSvg(svg);
  const margin = { top: 38, right: width < 620 ? 78 : 128, bottom: 48, left: 54 };
  const innerWidth = Math.max(120, width - margin.left - margin.right);
  const innerHeight = Math.max(70, height - margin.top - margin.bottom);

  const categories = Array.from(d3.group(data, d => d.category), ([category, values]) => {
    const row = { category };
    PRICE_TIERS.forEach(tier => {
      row[tier.key] = values.filter(d => d.priceTier === tier.key).length;
    });
    row.total = values.length;
    return row;
  }).sort((a, b) => d3.descending(a.total, b.total));

  const stack = d3.stack().keys(PRICE_TIERS.map(d => d.key))(categories);

  const x = d3.scaleBand()
    .domain(categories.map(d => d.category))
    .range([0, innerWidth])
    .padding(0.22);

  const y = d3.scaleLinear()
    .domain([0, d3.max(categories, d => d.total)]).nice()
    .range([innerHeight, 0]);

  // Add the overview title directly in the SVG.
  svg.append("text")
    .attr("class", "chart-title")
    .attr("x", margin.left)
    .attr("y", 24)
    .text(responsiveTitle(width, "Overview: product categories by price tier", "Products by category"));

  // Add the main bar-chart group with room for axes and labels.
  const g = svg.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // Add one stacked bar layer for each price tier.
  const tierGroups = g.selectAll(".tier-layer")
    .data(stack)
    .enter()
    .append("g")
    .attr("class", "tier-layer")
    .attr("fill", d => PRICE_TIERS.find(tier => tier.key === d.key).color);

  // Add one bar segment per category within each tier layer.
  tierGroups.selectAll("rect")
    .data(d => d.map(item => ({ ...item, tier: d.key })))
    .enter()
    .append("rect")
    .attr("x", d => x(d.data.category))
    .attr("y", d => y(d[1]))
    .attr("width", x.bandwidth())
    .attr("height", d => y(d[0]) - y(d[1]))
    .attr("rx", 3)
    .on("mousemove", (event, d) => {
      showTooltip(event, `
        <strong>${d.data.category}</strong>
        ${d.tier}: ${d[1] - d[0]} products<br>
        Total: ${d.data.total} products
      `);
    })
    .on("mouseleave", hideTooltip);

  // Add a horizontal axis for cosmetic product categories.
  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0, ${innerHeight})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .call(wrapAxisText, width < 620 ? 8 : 12);

  // Add a vertical axis for product counts.
  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(4));

  // Add the x-axis label for the overview chart.
  g.append("text")
    .attr("class", "axis-title")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 42)
    .attr("text-anchor", "middle")
    .text("Product category");

  // Add the y-axis label for the overview chart.
  g.append("text")
    .attr("class", "axis-title")
    .attr("x", -innerHeight / 2)
    .attr("y", -38)
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("Number of products");

  drawPriceTierLegend(svg, width < 620 ? width - 92 : width - 116, 38, width < 620);
}

function drawScatter(data) {
  const svg = d3.select("#scatter-chart");
  svg.selectAll("*").remove();

  const { width, height } = fitSvg(svg);
  const margin = { top: 58, right: width < 620 ? 24 : 128, bottom: 54, left: 58 };
  const innerWidth = Math.max(230, width - margin.left - margin.right);
  const innerHeight = Math.max(170, height - margin.top - margin.bottom);
  const categories = Array.from(new Set(data.map(d => d.category)));
  const rankedData = data.filter(d => d.rank > 0);

  const x = d3.scaleLinear()
    .domain([0, d3.quantile(data.map(d => d.price).sort(d3.ascending), 0.985)]).nice()
    .range([0, innerWidth]);

  const y = d3.scaleLinear()
    .domain([2.5, 5]).nice()
    .range([innerHeight, 0]);

  const radius = d3.scaleSqrt()
    .domain(d3.extent(data, d => d.ingredientCount))
    .range([3, width < 620 ? 8 : 11]);

  // Add the scatterplot title for the main focus view.
  svg.append("text")
    .attr("class", "chart-title")
    .attr("x", margin.left)
    .attr("y", 24)
    .text(responsiveTitle(width, "Focus: price, rank, and formula complexity", "Price vs. rank"));

  if (width >= 520) {
    // Add a subtitle explaining the scatterplot encodings.
    svg.append("text")
      .attr("class", "small-note")
      .attr("x", margin.left)
      .attr("y", 42)
      .text("Color is category; circle size is ingredient count.");
  }

  // Add the main scatterplot group with margin space for axes.
  const g = svg.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // Add soft horizontal gridlines to make rank comparisons easier.
  g.append("g")
    .attr("class", "axis grid")
    .call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(""))
    .selectAll("line")
    .attr("stroke-dasharray", "2 4")
    .attr("opacity", 0.45);

  // Add one circle per product to show price/rank position.
  g.selectAll(".product-dot")
    .data(rankedData)
    .enter()
    .append("circle")
    .attr("class", "product-dot")
    .attr("cx", d => x(Math.min(d.price, x.domain()[1])))
    .attr("cy", d => y(d.rank))
    .attr("r", d => radius(d.ingredientCount))
    .attr("fill", d => CATEGORY_COLORS[d.category])
    .attr("opacity", 0.56)
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 0.9)
    .on("mouseenter", function(event, d) {
      d3.select(this).attr("opacity", 0.95).attr("stroke-width", 2).raise();
      showTooltip(event, productTooltip(d));
    })
    .on("mousemove", (event, d) => showTooltip(event, productTooltip(d)))
    .on("mouseleave", function() {
      d3.select(this).attr("opacity", 0.56).attr("stroke-width", 0.9);
      hideTooltip();
    });

  // Add the x-axis for product price.
  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0, ${innerHeight})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(formatMoney));

  // Add the y-axis for Sephora rank.
  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(5));

  // Add the x-axis label for the scatterplot.
  g.append("text")
    .attr("class", "axis-title")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 42)
    .attr("text-anchor", "middle")
    .text("Price");

  // Add the y-axis label for the scatterplot.
  g.append("text")
    .attr("class", "axis-title")
    .attr("x", -innerHeight / 2)
    .attr("y", -40)
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("Customer rank");

  if (width >= 700) {
    drawCategoryLegend(svg, categories, width - 112, 54);
  }
}

function drawParallelCoordinates(data) {
  const svg = d3.select("#parallel-chart");
  svg.selectAll("*").remove();

  const { width, height } = fitSvg(svg);
  const profileData = data.filter(d => d.rank > 0);
  const categories = Array.from(new Set(data.map(d => d.category)));
  const legendColumns = Math.max(2, Math.floor((width - 56) / 92));
  const legendRows = Math.ceil(categories.length / legendColumns);
  const margin = { top: 88 + legendRows * 24, right: 26, bottom: 32, left: 28 };
  const innerWidth = Math.max(250, width - margin.left - margin.right);
  const innerHeight = Math.max(170, height - margin.top - margin.bottom);

  const fullDimensions = [
    { key: "price", label: "Price", format: formatMoney },
    { key: "rank", label: "Rank", format: d3.format(".1f") },
    { key: "ingredientCount", label: "Ingredients", format: d3.format("d") },
    { key: "skinCount", label: "Skin types", format: d3.format("d") },
    { key: "Combination", label: "Combo", format: d => d === 1 ? "Yes" : "No", tickValues: [0, 1] },
    { key: "Sensitive", label: "Sensitive", format: d => d === 1 ? "Yes" : "No", tickValues: [0, 1] }
  ];
  const dimensions = width < 620 ? fullDimensions.slice(0, 3) : fullDimensions;

  const x = d3.scalePoint()
    .domain(dimensions.map(d => d.key))
    .range([0, innerWidth])
    .padding(0.24);

  dimensions.forEach(dimension => {
    dimension.scale = d3.scaleLinear()
      .domain(d3.extent(profileData, d => d[dimension.key])).nice()
      .range([innerHeight, 0]);
  });

  const line = d3.line()
    .x(point => point.x)
    .y(point => point.y);

  function pathForProduct(d) {
    return line(dimensions.map(dimension => ({
      x: x(dimension.key),
      y: dimension.scale(d[dimension.key])
    })));
  }

  // Add the title for the advanced parallel-coordinates view.
  svg.append("text")
    .attr("class", "chart-title")
    .attr("x", margin.left)
    .attr("y", 24)
    .text(responsiveTitle(width, "Advanced: ingredient and skin-type profiles", "Formula profiles"));

  if (width >= 520) {
    // Add a note naming the advanced visualization method.
    svg.append("text")
      .attr("class", "small-note")
      .attr("x", margin.left)
      .attr("y", 42)
      .text("Parallel coordinates compare price, rank, ingredient count, and skin-type suitability.");
  }

  // Add the main parallel-coordinates group with space for axis titles and legend.
  const g = svg.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // Add faint guide ticks behind each parallel axis.
  dimensions.forEach(dimension => {
    const axis = d3.axisLeft(dimension.scale)
      .tickSize(-7)
      .tickFormat("");
    if (dimension.tickValues) {
      axis.tickValues(dimension.tickValues);
    } else {
      axis.ticks(4);
    }

    g.append("g")
      .attr("class", "axis grid")
      .attr("transform", `translate(${x(dimension.key)}, 0)`)
      .call(axis)
      .selectAll("line")
      .attr("stroke-dasharray", "2 4")
      .attr("opacity", 0.42);
  });

  // Add one polyline per product; color identifies the product category.
  g.append("g")
    .selectAll(".parallel-line")
    .data(profileData)
    .enter()
    .append("path")
    .attr("class", "parallel-line")
    .attr("d", pathForProduct)
    .attr("stroke", d => CATEGORY_COLORS[d.category])
    .attr("stroke-width", 1)
    .attr("opacity", 0.12)
    .on("mouseenter", function(event, d) {
      d3.select(this).attr("stroke-width", 3).attr("opacity", 0.92).raise();
      showTooltip(event, productTooltip(d));
    })
    .on("mousemove", (event, d) => showTooltip(event, productTooltip(d)))
    .on("mouseleave", function() {
      d3.select(this).attr("stroke-width", 1).attr("opacity", 0.12);
      hideTooltip();
    });

  // Add one vertical axis for each parallel-coordinate dimension.
  const axes = g.selectAll(".parallel-axis")
    .data(dimensions)
    .enter()
    .append("g")
    .attr("class", "axis parallel-axis")
    .attr("transform", d => `translate(${x(d.key)}, 0)`)
    .each(function(d) {
      const axis = d3.axisLeft(d.scale).tickFormat(d.format);
      if (d.tickValues) {
        axis.tickValues(d.tickValues);
      } else {
        axis.ticks(5);
      }
      d3.select(this).call(axis);
    });

  // Add axis titles above the parallel-coordinate dimensions.
  axes.append("text")
    .attr("class", "axis-title")
    .attr("x", 0)
    .attr("y", -12)
    .attr("text-anchor", "middle")
    .text(d => d.label);

}

function renderAll(data) {
  drawOverview(data);
  drawScatter(data);
  drawParallelCoordinates(data);
}

d3.csv("data/cosmetics.csv", parseProduct).then(data => {
  const cleanData = data.filter(d =>
    d.category &&
    d.brand &&
    d.name &&
    Number.isFinite(d.price) &&
    Number.isFinite(d.rank) &&
    d.price > 0
  );

  setSummary(cleanData);
  renderAll(cleanData);

  let resizeTimer;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => renderAll(cleanData), 120);
  });
}).catch(error => {
  console.error(error);
  d3.select(".dashboard-grid")
    .append("p")
    .attr("class", "load-error")
    .text("The cosmetics data could not be loaded. Run this folder through a local server such as VSCode Live Server.");
});
