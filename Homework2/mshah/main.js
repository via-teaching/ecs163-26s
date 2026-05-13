const tooltip = d3.select("#tooltip");

// Show tooltip near the cursor
function showTip(html, event) {
  tooltip.html(html)
    .style("opacity", 1)
    .style("left", (event.pageX + 14) + "px")
    .style("top",  (event.pageY - 10) + "px");
}

// Hide tooltip
function hideTip() { tooltip.style("opacity", 0); }

d3.csv("data/music_mental_health_survey_results.csv", d => {  //  Load CSV
  const hours      = +d["Hours per day"];
  const anxiety    = +d["Anxiety"];
  const depression = +d["Depression"];
  const genre      = d["Fav genre"]?.trim();
  const effect     = d["Music effects"]?.trim();

  // Drop rows with missing essential fields
  if (!genre || isNaN(hours) || isNaN(anxiety) || isNaN(depression)) return null;

  return { hours, anxiety, depression, genre, effect };

}).then(raw => {
  const data = raw.filter(d => d !== null);
  drawBarChart(data);
  drawAlluvial(data);
  drawScatter(data);
});

// =============================================================
//  VIEW 1 – BAR CHART  (overview)
//  Average depression score per favorite genre.
//  Simple and readable — gives the audience an at-a-glance
//  summary of which genres correlate with higher depression.
// =============================================================
function drawBarChart(data) {
  const container = document.getElementById("bar-area");
  const W = container.clientWidth;
  const H = container.clientHeight;
  const margin = { top: 18, right: 30, bottom: 80, left: 52 };
  const iW = W - margin.left - margin.right;
  const iH = H - margin.top  - margin.bottom;

  const svg = d3.select("#bar-area").append("svg")
    .attr("width", W).attr("height", H);

  // Main drawing group offset by margins
  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // ── Compute average depression per genre ──────────────────
  const genres = [...new Set(data.map(d => d.genre))].sort();

  // rollup: genre → mean depression score
  const avgMap = d3.rollup(
    data,
    v => d3.mean(v, d => d.depression),
    d => d.genre
  );

  // Sort genres by average depression descending so bars rank clearly
  const sorted = genres.sort((a, b) => avgMap.get(b) - avgMap.get(a));

  // ── Scales ───────────────────────────────────────────────
  // X: one band per genre
  const xScale = d3.scaleBand()
    .domain(sorted)
    .range([0, iW])
    .padding(0.28);

  // Y: 0 to slightly above the max average (leave headroom)
  const yMax = d3.max([...avgMap.values()]);
  const yScale = d3.scaleLinear()
    .domain([0, Math.ceil(yMax) + 0.5])
    .range([iH, 0]);

  // ── Horizontal grid lines ─────────────────────────────────
  g.append("g").attr("class", "grid")
    .call(d3.axisLeft(yScale).tickSize(-iW).tickFormat(""))
    .call(ax => ax.select(".domain").remove());

  // ── X axis with rotated genre labels ─────────────────────
  g.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${iH})`)
    .call(d3.axisBottom(xScale).tickSize(0))
    .call(ax => ax.select(".domain").remove())
    .selectAll("text")
      .attr("transform", "rotate(-35)")
      .attr("text-anchor", "end")
      .attr("dy", "0.35em")
      .attr("dx", "-0.4em");

  // ── Y axis ────────────────────────────────────────────────
  g.append("g").attr("class", "axis")
    .call(d3.axisLeft(yScale).ticks(5))
    .call(ax => ax.select(".domain").remove());

  // ── Y axis label ─────────────────────────────────────────
  g.append("text").attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -iH / 2)
    .attr("y", -40)
    .attr("text-anchor", "middle")
    .text("Avg. Depression Score (0–10)");

  // ── Bars ─────────────────────────────────────────────────
  // Single blue color for all bars — clean, unambiguous encoding
  const BAR_COLOR = "#1FCC23";

  sorted.forEach(genre => {
    const avg = avgMap.get(genre);

    // Bar rectangle
    g.append("rect")
      .attr("x", xScale(genre))
      .attr("y", yScale(avg))
      .attr("width", xScale.bandwidth())
      .attr("height", iH - yScale(avg))
      .attr("fill", BAR_COLOR)
      .attr("fill-opacity", 0.75)
      .attr("rx", 2)
      .on("mouseover", event => showTip(
        `<b>${genre}</b><br>Avg Depression: ${avg.toFixed(2)}`, event))
      .on("mousemove", event => showTip(
        `<b>${genre}</b><br>Avg Depression: ${avg.toFixed(2)}`, event))
      .on("mouseout", hideTip);

    // Value label above bar
    g.append("text")
      .attr("x", xScale(genre) + xScale.bandwidth() / 2)
      .attr("y", yScale(avg) - 3)
      .attr("text-anchor", "middle")
      .attr("font-size", 8.5)
      .attr("fill", "#555")
      .attr("font-family", "Arial, sans-serif")
      .text(avg.toFixed(1));
  });

  // ── Legend ───────────────────────────────────────────────
  const lx = iW - 120;
  const ly = 0;

  const lg = g.append("g").attr("transform", `translate(${lx},${ly})`);

  // Colored bar swatch
  lg.append("rect")
    .attr("width", 14).attr("height", 10)
    .attr("fill", BAR_COLOR).attr("fill-opacity", 0.75).attr("rx", 2);

  lg.append("text")
    .attr("x", 18).attr("y", 9)
    .attr("font-size", 9).attr("fill", "#555")
    .attr("font-family", "Arial, sans-serif")
    .text("Avg. Depression Score");
}

//  VIEW 2 – ALLUVIAL DIAGRAM  (advanced)
//  Flows: Genre → Daily Hours bucket → Music Effect
function drawAlluvial(data) {
  const valid = data.filter(d =>
    d.effect === "Improve" || d.effect === "No effect" || d.effect === "Worsen"
  );

  function hoursBucket(h) {
    if (h < 2)  return "< 2 hrs";
    if (h < 4)  return "2–4 hrs";
    if (h < 6)  return "4–6 hrs";
    if (h < 8)  return "6–8 hrs";
    return "8+ hrs";
  }
  const HOUR_ORDER   = ["< 2 hrs", "2–4 hrs", "4–6 hrs", "6–8 hrs", "8+ hrs"];
  const EFFECT_ORDER = ["Improve", "No effect", "Worsen"];

  // Effect outcome colors (categorical: good / neutral / bad)
  const EFFECT_COLOR = {
    "Improve":   "#10E81C",
    "No effect": "#aaa",
    "Worsen":    "#FF0000",
  };

  // Genre → Hours ribbon color: monochromatic blue shades
  // We map each genre to a shade of blue by index
  const genres = [...new Set(valid.map(d => d.genre))].sort();
  const blueShades = d3.quantize(
    t => d3.interpolateBlues(0.3 + t * 0.6),  // range: light blue → dark blue
    genres.length
  );
  const genreColor = d3.scaleOrdinal().domain(genres).range(blueShades);

  // ── Dimensions ───────────────────────────────────────────
  const container = document.getElementById("alluvial-area");
  const W = container.clientWidth;
  const H = container.clientHeight;
  const margin = { top: 22, right: 90, bottom: 8, left: 110 };
  const iW = W - margin.left - margin.right;
  const iH = H - margin.top  - margin.bottom;

  const svg = d3.select("#alluvial-area").append("svg")
    .attr("width", W).attr("height", H);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const total  = valid.length;
  const NODE_W = 10;
  const PAD    = 3; // px gap between adjacent node bars

  // ── Proportional node layout ──────────────────────────────
  // Each node bar height = (its count / total) * available height
  function layoutNodes(keys, countMap) {
    const usableH = iH - PAD * (keys.length - 1);
    let y = 0;
    return keys.map(k => {
      const h = ((countMap.get(k) || 0) / total) * usableH;
      const node = { key: k, y0: y, y1: y + h };
      y += h + PAD;
      return node;
    });
  }

  // Count totals for each node column
  const genreTotal  = d3.rollup(valid, v => v.length, d => d.genre);
  const bucketTotal = d3.rollup(valid, v => v.length, d => hoursBucket(d.hours));
  const effectTotal = d3.rollup(valid, v => v.length, d => d.effect);

  const genreNodes  = layoutNodes(genres,       genreTotal);
  const bucketNodes = layoutNodes(HOUR_ORDER,   bucketTotal);
  const effectNodes = layoutNodes(EFFECT_ORDER, effectTotal);

  // Node lookup maps
  const gMap = new Map(genreNodes.map(n  => [n.key, n]));
  const bMap = new Map(bucketNodes.map(n => [n.key, n]));
  const eMap = new Map(effectNodes.map(n => [n.key, n]));

  // ── X positions of the three node columns ─────────────────
  const xGenre  = 0;
  const xBucket = iW / 2;
  const xEffect = iW;

  // ── Cross-flow counts ────────────────────────────────────
  // genre → bucket counts
  const gbFlow = d3.rollup(valid, v => v.length,
    d => d.genre, d => hoursBucket(d.hours));

  // bucket → effect counts
  const beFlow = d3.rollup(valid, v => v.length,
    d => hoursBucket(d.hours), d => d.effect);

  // ── Cursor maps: where each ribbon starts on a node ──────
  // (ribbons stack downward as we iterate)
  const curGenreR  = new Map(genres.map(k       => [k, gMap.get(k).y0]));
  const curBucketL = new Map(HOUR_ORDER.map(k   => [k, bMap.get(k).y0]));
  const curBucketR = new Map(HOUR_ORDER.map(k   => [k, bMap.get(k).y0]));
  const curEffectL = new Map(EFFECT_ORDER.map(k => [k, eMap.get(k).y0]));

  // Height scale: pixels per respondent
  const hFactor = (iH - PAD * (Math.max(genres.length, HOUR_ORDER.length) - 1)) / total;

  // ── Genre → Bucket ribbons (monochromatic blue) ───────────
  genres.forEach(genre => {
    const bucketMap = gbFlow.get(genre) || new Map();

    HOUR_ORDER.forEach(bucket => {
      const count = bucketMap.get(bucket) || 0;
      if (!count) return;

      const h = count * hFactor;

      // Source: right edge of genre node, advance cursor downward
      const sy0 = curGenreR.get(genre);
      const sy1 = sy0 + h;
      curGenreR.set(genre, sy1);

      // Target: left edge of bucket node, advance cursor downward
      const ty0 = curBucketL.get(bucket);
      const ty1 = ty0 + h;
      curBucketL.set(bucket, ty1);

      // Draw cubic bezier ribbon, colored by genre (blue shades)
      g.append("path")
        .attr("d", ribbon(xGenre + NODE_W, sy0, sy1, xBucket, ty0, ty1))
        .attr("fill", genreColor(genre))
        .attr("fill-opacity", 0.40)
        .on("mouseover", event => showTip(
          `<b>${genre}</b> → <b>${bucket}</b><br>n = ${count}`, event))
        .on("mousemove", event => showTip(
          `<b>${genre}</b> → <b>${bucket}</b><br>n = ${count}`, event))
        .on("mouseout", hideTip);
    });
  });

  // ── Bucket → Effect ribbons (effect outcome colors) ──────
  HOUR_ORDER.forEach(bucket => {
    const effectMap = beFlow.get(bucket) || new Map();

    EFFECT_ORDER.forEach(effect => {
      const count = effectMap.get(effect) || 0;
      if (!count) return;

      const h = count * hFactor;

      const sy0 = curBucketR.get(bucket);
      const sy1 = sy0 + h;
      curBucketR.set(bucket, sy1);

      const ty0 = curEffectL.get(effect);
      const ty1 = ty0 + h;
      curEffectL.set(effect, ty1);

      // Draw cubic bezier ribbon, colored by effect outcome
      g.append("path")
        .attr("d", ribbon(xBucket + NODE_W, sy0, sy1, xEffect, ty0, ty1))
        .attr("fill", EFFECT_COLOR[effect])
        .attr("fill-opacity", 0.40)
        .on("mouseover", event => showTip(
          `<b>${bucket}</b> → <b>${effect}</b><br>n = ${count}`, event))
        .on("mousemove", event => showTip(
          `<b>${bucket}</b> → <b>${effect}</b><br>n = ${count}`, event))
        .on("mouseout", hideTip);
    });
  });

  // ── Genre nodes (left column) ─────────────────────────────
  genreNodes.forEach(n => {
    g.append("rect")
      .attr("x", xGenre).attr("y", n.y0)
      .attr("width", NODE_W)
      .attr("height", Math.max(n.y1 - n.y0, 1))
      .attr("fill", genreColor(n.key)).attr("rx", 2);

    // Genre label to the left
    g.append("text")
      .attr("x", xGenre - 4).attr("y", (n.y0 + n.y1) / 2)
      .attr("text-anchor", "end").attr("dominant-baseline", "middle")
      .attr("font-size", 8.5).attr("fill", "#555")
      .attr("font-family", "Arial, sans-serif")
      .text(n.key);
  });

  // ── Bucket nodes (middle column) ──────────────────────────
  bucketNodes.forEach(n => {
    const h = Math.max(n.y1 - n.y0, 1);

    g.append("rect")
      .attr("x", xBucket).attr("y", n.y0)
      .attr("width", NODE_W).attr("height", h)
      .attr("fill", "#888").attr("rx", 2);

    // Label inside the node if tall enough
    if (h > 10) {
      g.append("text")
        .attr("x", xBucket + NODE_W / 2).attr("y", (n.y0 + n.y1) / 2)
        .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
        .attr("font-size", 7.5).attr("fill", "#fff")
        .attr("font-family", "Arial, sans-serif")
        .text(n.key);
    }
  });

  // ── Effect nodes (right column) ───────────────────────────
  effectNodes.forEach(n => {
    const h = Math.max(n.y1 - n.y0, 1);

    g.append("rect")
      .attr("x", xEffect).attr("y", n.y0)
      .attr("width", NODE_W).attr("height", h)
      .attr("fill", EFFECT_COLOR[n.key]).attr("rx", 2);

    // Effect label to the right
    g.append("text")
      .attr("x", xEffect + NODE_W + 5).attr("y", (n.y0 + n.y1) / 2)
      .attr("text-anchor", "start").attr("dominant-baseline", "middle")
      .attr("font-size", 9.5).attr("fill", EFFECT_COLOR[n.key])
      .attr("font-family", "Arial, sans-serif").attr("font-weight", "bold")
      .text(n.key);
  });

  // ── Column header labels ──────────────────────────────────
  [
    { label: "GENRE",        x: xGenre  + NODE_W / 2 },
    { label: "DAILY HOURS",  x: xBucket + NODE_W / 2 },
    { label: "MUSIC EFFECT", x: xEffect + NODE_W / 2 },
  ].forEach(({ label, x }) => {
    g.append("text")
      .attr("x", x).attr("y", -8)
      .attr("text-anchor", "middle")
      .attr("font-size", 8.5).attr("fill", "#888")
      .attr("font-family", "Arial, sans-serif")
      .attr("letter-spacing", "0.07em")
      .text(label);
  });

  // ── Alluvial legend ───────────────────────────────────────
  // Show what blue shades mean and what effect colors mean
  const lx = iW + 14;
  const lg = g.append("g").attr("transform", `translate(${lx}, 0)`);
}

// ── Cubic bezier ribbon path helper ──────────────────────────
// Draws a filled band flowing from (x0, sy0→sy1) to (x1, ty0→ty1)
function ribbon(x0, sy0, sy1, x1, ty0, ty1) {
  const mx = (x0 + x1) / 2;
  return `M${x0},${sy0} C${mx},${sy0} ${mx},${ty0} ${x1},${ty0}
          L${x1},${ty1} C${mx},${ty1} ${mx},${sy1} ${x0},${sy1} Z`;
}

// =============================================================
//  VIEW 3 – SCATTER PLOT  (focus)
//  X: hours of music listened per day
//  Y: self-reported anxiety score (0–10)
//  Single color dots — the focus is the relationship, not genre.
//  SVG is rendered at 60% of the container width, centered,
//  so white space is equal on left and right.
// =============================================================
function drawScatter(data) {
  const container = document.getElementById("scatter-area");
  const fullW = container.clientWidth;
  const H     = container.clientHeight;

  // Render at 60% width, centered
  const W      = fullW * 0.60;
  const offsetX = (fullW - W) / 2;

  const margin = { top: 14, right: 30, bottom: 44, left: 52 };
  const iW = W - margin.left - margin.right;
  const iH = H - margin.top  - margin.bottom;

  // SVG spans full container width so the centering offset works cleanly
  const svg = d3.select("#scatter-area").append("svg")
    .attr("width", fullW).attr("height", H);

  // Drawing group shifted right by offsetX + left margin
  const g = svg.append("g")
    .attr("transform", `translate(${offsetX + margin.left},${margin.top})`);

  // ── Scales ───────────────────────────────────────────────
  const xScale = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.hours) + 0.5])
    .range([0, iW]);

  const yScale = d3.scaleLinear()
    .domain([0, 10])
    .range([iH, 0]);

  // ── Grid lines ────────────────────────────────────────────
  g.append("g").attr("class", "grid")
    .call(d3.axisLeft(yScale).tickSize(-iW).tickFormat(""))
    .call(ax => ax.select(".domain").remove());

  g.append("g").attr("class", "grid")
    .attr("transform", `translate(0,${iH})`)
    .call(d3.axisBottom(xScale).tickSize(-iH).tickFormat(""))
    .call(ax => ax.select(".domain").remove());

  // ── Axes ─────────────────────────────────────────────────
  g.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${iH})`)
    .call(d3.axisBottom(xScale).ticks(10))
    .call(ax => ax.select(".domain").remove());

  g.append("g").attr("class", "axis")
    .call(d3.axisLeft(yScale).ticks(5))
    .call(ax => ax.select(".domain").remove());

  // ── Axis labels ──────────────────────────────────────────
  g.append("text").attr("class", "axis-label")
    .attr("x", iW / 2).attr("y", iH + 36)
    .attr("text-anchor", "middle")
    .text("Hours of Music Listened Per Day");

  g.append("text").attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -iH / 2).attr("y", -42)
    .attr("text-anchor", "middle")
    .text("Anxiety Score (0–10)");

  // ── Scatter dots ─────────────────────────────────────────
  // Small jitter on both axes to prevent overplotting on integer scores
  g.selectAll(".dot")
    .data(data)
    .join("circle")
      .attr("class", "dot")
      .attr("cx", d => xScale(d.hours + (Math.random() - 0.5) * 0.3))
      .attr("cy", d => yScale(d.anxiety + (Math.random() - 0.5) * 0.4))
      .attr("r", 3.5)
      .attr("fill", "#992685")
      .attr("fill-opacity", 0.45)
      .attr("stroke", "none")
      .on("mouseover", (event, d) => showTip(
        `Genre: ${d.genre}<br>
         Hours/day: ${d.hours}<br>
         Anxiety: ${d.anxiety}<br>
         Depression: ${d.depression}`, event))
      .on("mousemove", (event, d) => showTip(
        `Genre: ${d.genre}<br>
         Hours/day: ${d.hours}<br>
         Anxiety: ${d.anxiety}<br>
         Depression: ${d.depression}`, event))
      .on("mouseout", hideTip);

  // ── Linear regression trend line ─────────────────────────
  // Helps readers see whether more listening hours correlate
  // with higher or lower anxiety scores across the dataset
  const n     = data.length;
  const sumX  = d3.sum(data, d => d.hours);
  const sumY  = d3.sum(data, d => d.anxiety);
  const sumXY = d3.sum(data, d => d.hours * d.anxiety);
  const sumX2 = d3.sum(data, d => d.hours * d.hours);

  const slope     = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const xMin = d3.min(data, d => d.hours);
  const xMax = d3.max(data, d => d.hours);

  g.append("line")
    .attr("x1", xScale(xMin)).attr("y1", yScale(slope * xMin + intercept))
    .attr("x2", xScale(xMax)).attr("y2", yScale(slope * xMax + intercept))
    .attr("stroke", "#FF0000")
    .attr("stroke-width", 1.8)
    .attr("stroke-dasharray", "5,3");

  // ── Legend ───────────────────────────────────────────────
  const lx = iW - 140;
  const ly = 4;
  const lg = g.append("g").attr("transform", `translate(${lx},${ly})`);

  // Dot item
  lg.append("circle")
    .attr("cx", 6).attr("cy", 6).attr("r", 3.5)
    .attr("fill", "#992685").attr("fill-opacity", 0.55);
  lg.append("text")
    .attr("x", 14).attr("y", 10)
    .attr("font-size", 9).attr("fill", "#555")
    .attr("font-family", "Arial, sans-serif")
    .text("Survey respondent");

  // Trend line item
  lg.append("line")
    .attr("x1", 0).attr("x2", 14).attr("y1", 22).attr("y2", 22)
    .attr("stroke", "#FF0000").attr("stroke-width", 1.8)
    .attr("stroke-dasharray", "5,3");
  lg.append("text")
    .attr("x", 18).attr("y", 26)
    .attr("font-size", 9).attr("fill", "#555")
    .attr("font-family", "Arial, sans-serif")
    .text("Trend line");
}