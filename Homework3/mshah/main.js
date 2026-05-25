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

  if (!genre || isNaN(hours) || isNaN(anxiety) || isNaN(depression)) return null;  // remove missing data

  return { hours, anxiety, depression, genre, effect };

}).then(raw => {
  const data = raw.filter(d => d !== null);
  initBarChart(data);
  drawAlluvial(data);
  drawScatter(data);
});

//  VIEW 1: BAR CHART (Average depression score per favorite genre)
let barSvgG, barXScale, barYScale, barIW, barIH, barAllGenres;

function initBarChart(data) {
  const container = document.getElementById("bar-area");
  const W = container.clientWidth;
  const H = container.clientHeight;
  const margin = { top: 18, right: 30, bottom: 80, left: 52 };
  barIW = W - margin.left - margin.right;
  barIH = H - margin.top  - margin.bottom;

  const svg = d3.select("#bar-area").append("svg")
    .attr("width", W).attr("height", H);

  barSvgG = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Compute all genres from full dataset (order never changes)
  const avgMap = d3.rollup(data, v => d3.mean(v, d => d.depression), d => d.genre);
  barAllGenres = [...new Set(data.map(d => d.genre))]
    .sort((a, b) => avgMap.get(b) - avgMap.get(a));

  barXScale = d3.scaleBand()
    .domain(barAllGenres)
    .range([0, barIW])
    .padding(0.28);

  const yMax = d3.max([...avgMap.values()]);
  barYScale = d3.scaleLinear()
    .domain([0, Math.ceil(yMax) + 0.5])
    .range([barIH, 0]);

  // Grid lines (drawn once)
  barSvgG.append("g").attr("class", "grid")
    .call(d3.axisLeft(barYScale).tickSize(-barIW).tickFormat(""))
    .call(ax => ax.select(".domain").remove());

  // X axis (drawn once)
  barSvgG.append("g").attr("class", "axis x-axis")
    .attr("transform", `translate(0,${barIH})`)
    .call(d3.axisBottom(barXScale).tickSize(0))
    .call(ax => ax.select(".domain").remove())
    .selectAll("text")
      .attr("transform", "rotate(-35)")
      .attr("text-anchor", "end")
      .attr("dy", "0.35em")
      .attr("dx", "-0.4em");

  // Y axis (drawn once)
  barSvgG.append("g").attr("class", "axis")
    .call(d3.axisLeft(barYScale).ticks(5))
    .call(ax => ax.select(".domain").remove());

  barSvgG.append("text").attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -barIH / 2).attr("y", -40)
    .attr("text-anchor", "middle")
    .text("Avg. Depression Score (0–10)");

  // Legend (drawn once)
  const BAR_COLOR = "#1FCC23";
  const lx = barIW - 120, ly = 0;
  const lg = barSvgG.append("g").attr("transform", `translate(${lx},${ly})`);
  lg.append("rect").attr("width", 14).attr("height", 10)
    .attr("fill", BAR_COLOR).attr("fill-opacity", 0.75).attr("rx", 2);
  lg.append("text").attr("x", 18).attr("y", 9)
    .attr("font-size", 9).attr("fill", "#555")
    .attr("font-family", "Arial, sans-serif")
    .text("Avg. Depression Score");

  // Initial draw
  updateBarChart(data);
}

function updateBarChart(filteredData) {
  const BAR_COLOR = "#1FCC23";

  const avgMap = d3.rollup(
    filteredData,
    v => d3.mean(v, d => d.depression),
    d => d.genre
  );

  // BARS — data join with animated transition
  barSvgG.selectAll(".bar")
    .data(barAllGenres, d => d)
    .join(
      enter => enter.append("rect").attr("class", "bar")
        .attr("x", d => barXScale(d))
        .attr("y", barIH)             // start at baseline
        .attr("width", barXScale.bandwidth())
        .attr("height", 0)
        .attr("fill", BAR_COLOR)
        .attr("fill-opacity", 0.75)
        .attr("rx", 2)
        .on("mouseover", (event, d) => {
          const avg = avgMap.get(d);
          if (avg != null) showTip(`<b>${d}</b><br>Avg Depression: ${avg.toFixed(2)}`, event);
        })
        .on("mousemove", (event, d) => {
          const avg = avgMap.get(d);
          if (avg != null) showTip(`<b>${d}</b><br>Avg Depression: ${avg.toFixed(2)}`, event);
        })
        .on("mouseout", hideTip),
      update => update
    )
    .transition().duration(500)
      .attr("y", d => {
        const avg = avgMap.get(d);
        return avg != null ? barYScale(avg) : barIH;
      })
      .attr("height", d => {
        const avg = avgMap.get(d);
        return avg != null ? barIH - barYScale(avg) : 0;
      });

  // VALUE LABELS — data join with animated transition
  barSvgG.selectAll(".bar-label")
    .data(barAllGenres, d => d)
    .join(
      enter => enter.append("text").attr("class", "bar-label")
        .attr("x", d => barXScale(d) + barXScale.bandwidth() / 2)
        .attr("y", barIH)
        .attr("text-anchor", "middle")
        .attr("font-size", 8.5)
        .attr("fill", "#555")
        .attr("font-family", "Arial, sans-serif"),
      update => update
    )
    .transition().duration(500)
      .attr("y", d => {
        const avg = avgMap.get(d);
        return avg != null ? barYScale(avg) - 3 : barIH;
      })
      .text(d => {
        const avg = avgMap.get(d);
        return avg != null ? avg.toFixed(1) : "";
      });

  // ── SELECTION on bar chart (click genre → highlight scatter dots) ────────
  barSvgG.selectAll(".bar")
    .on("click", (event, d) => {
      const alreadySelected = d3.select(event.currentTarget).attr("stroke") === "#1a7a1d";

      // Reset all bars first
      barSvgG.selectAll(".bar")
        .attr("stroke", "none")
        .attr("fill-opacity", 0.75);

      if (alreadySelected) {
        // Click same bar again → deselect, reset scatter
        d3.selectAll(".dot")
          .attr("fill-opacity", 0.45)
          .attr("stroke", "none");
      } else {
        // Highlight clicked bar
        d3.select(event.currentTarget)
          .attr("stroke", "#1a7a1d")
          .attr("stroke-width", 2)
          .attr("fill-opacity", 1);

        // Highlight matching dots in scatter, dim the rest
        d3.selectAll(".dot")
          .attr("fill-opacity", dd => dd.genre === d ? 0.85 : 0.08)
          .attr("stroke", dd => dd.genre === d ? "#5a0080" : "none");
      }
    });
}

//  VIEW 2: Alluvial Diagram  (Genre → Daily Listening Hours → Music Effect)
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

  const EFFECT_COLOR = {  // effect outcome colors
    "Improve":   "#10E81C",
    "No effect": "#aaa",
    "Worsen":    "#FF0000",
  };

  const genres = [...new Set(valid.map(d => d.genre))].sort();  // genre to daily listening hours color
  const blueShades = d3.quantize(
    t => d3.interpolateBlues(0.3 + t * 0.6),  // shades
    genres.length
  );
  const genreColor = d3.scaleOrdinal().domain(genres).range(blueShades);

  const container = document.getElementById("alluvial-area");  // dimensions
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
  const PAD    = 3; // gap between adjacent node bars

  function layoutNodes(keys, countMap) {  // each node bar height calculated
    const usableH = iH - PAD * (keys.length - 1);
    let y = 0;
    return keys.map(k => {
      const h = ((countMap.get(k) || 0) / total) * usableH;
      const node = { key: k, y0: y, y1: y + h };
      y += h + PAD;
      return node;
    });
  }

  const genreTotal  = d3.rollup(valid, v => v.length, d => d.genre);  // Count totals for each node column
  const bucketTotal = d3.rollup(valid, v => v.length, d => hoursBucket(d.hours));
  const effectTotal = d3.rollup(valid, v => v.length, d => d.effect);

  const genreNodes  = layoutNodes(genres,       genreTotal);
  const bucketNodes = layoutNodes(HOUR_ORDER,   bucketTotal);
  const effectNodes = layoutNodes(EFFECT_ORDER, effectTotal);

  const gMap = new Map(genreNodes.map(n  => [n.key, n]));  //node lookup
  const bMap = new Map(bucketNodes.map(n => [n.key, n]));
  const eMap = new Map(effectNodes.map(n => [n.key, n]));

  const xGenre  = 0;  // x positions 
  const xBucket = iW / 2;
  const xEffect = iW;

  const gbFlow = d3.rollup(valid, v => v.length, // cross flow bucket counts
    d => d.genre, d => hoursBucket(d.hours));

  const beFlow = d3.rollup(valid, v => v.length,  // hours to effeects count
    d => hoursBucket(d.hours), d => d.effect);

  const curGenreR  = new Map(genres.map(k       => [k, gMap.get(k).y0]));
  const curBucketL = new Map(HOUR_ORDER.map(k   => [k, bMap.get(k).y0]));
  const curBucketR = new Map(HOUR_ORDER.map(k   => [k, bMap.get(k).y0]));
  const curEffectL = new Map(EFFECT_ORDER.map(k => [k, eMap.get(k).y0]));

  const hFactor = (iH - PAD * (Math.max(genres.length, HOUR_ORDER.length) - 1)) / total;  // height pixels per respondent

  genres.forEach(genre => {
    const bucketMap = gbFlow.get(genre) || new Map();

    HOUR_ORDER.forEach(bucket => {  //genre to hours
      const count = bucketMap.get(bucket) || 0;
      if (!count) return;

      const h = count * hFactor;

      const sy0 = curGenreR.get(genre);
      const sy1 = sy0 + h;
      curGenreR.set(genre, sy1);

      const ty0 = curBucketL.get(bucket);
      const ty1 = ty0 + h;
      curBucketL.set(bucket, ty1);

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

  HOUR_ORDER.forEach(bucket => {  //bucket to effect
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

  genreNodes.forEach(n => {  //genre nodes
    g.append("rect")
      .attr("x", xGenre).attr("y", n.y0)
      .attr("width", NODE_W)
      .attr("height", Math.max(n.y1 - n.y0, 1))
      .attr("fill", genreColor(n.key)).attr("rx", 2);

    g.append("text")  // label genre nodes
      .attr("x", xGenre - 4).attr("y", (n.y0 + n.y1) / 2)
      .attr("text-anchor", "end").attr("dominant-baseline", "middle")
      .attr("font-size", 8.5).attr("fill", "#555")
      .attr("font-family", "Arial, sans-serif")
      .text(n.key);
  });
  bucketNodes.forEach(n => {  //bucket nodes
    const h = Math.max(n.y1 - n.y0, 1);

    g.append("rect")
      .attr("x", xBucket).attr("y", n.y0)
      .attr("width", NODE_W).attr("height", h)
      .attr("fill", "#888").attr("rx", 2);

    if (h > 10) {  // label bucket nodes
      g.append("text")
        .attr("x", xBucket + NODE_W / 2).attr("y", (n.y0 + n.y1) / 2)
        .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
        .attr("font-size", 7.5).attr("fill", "#fff")
        .attr("font-family", "Arial, sans-serif")
        .text(n.key);
    }
  });
  effectNodes.forEach(n => {  //effect nodes
    const h = Math.max(n.y1 - n.y0, 1);

    g.append("rect")
      .attr("x", xEffect).attr("y", n.y0)
      .attr("width", NODE_W).attr("height", h)
      .attr("fill", EFFECT_COLOR[n.key]).attr("rx", 2);

    g.append("text")  // label effect nodes
      .attr("x", xEffect + NODE_W + 5).attr("y", (n.y0 + n.y1) / 2)
      .attr("text-anchor", "start").attr("dominant-baseline", "middle")
      .attr("font-size", 9.5).attr("fill", EFFECT_COLOR[n.key])
      .attr("font-family", "Arial, sans-serif").attr("font-weight", "bold")
      .text(n.key);
  });

  [
    { label: "GENRE",        x: xGenre  + NODE_W / 2 },  //header labels
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
}
function ribbon(x0, sy0, sy1, x1, ty0, ty1) {
  const mx = (x0 + x1) / 2;
  return `M${x0},${sy0} C${mx},${sy0} ${mx},${ty0} ${x1},${ty0}
          L${x1},${ty1} C${mx},${ty1} ${mx},${sy1} ${x0},${sy1} Z`;
}

//  VIEW 3: Scatter Plot (Hours of Music Listened Per Day vs. Anxiety Score)
function drawScatter(data) {
  const container = document.getElementById("scatter-area");
  const fullW = container.clientWidth;
  const H     = container.clientHeight;

  const W       = fullW * 0.55;
  const offsetX = (fullW - W) / 2;

  const margin = { top: 14, right: 30, bottom: 44, left: 52 };
  const iW = W - margin.left - margin.right;
  const iH = H - margin.top  - margin.bottom;

  const svg = d3.select("#scatter-area").append("svg")
    .attr("width", fullW).attr("height", H);

  // ── Clip path so dots don't render outside the plot area during zoom ──
  svg.append("defs").append("clipPath")
    .attr("id", "scatter-clip")
    .append("rect")
      .attr("width", iW)
      .attr("height", iH);

  const g = svg.append("g")
    .attr("transform", `translate(${offsetX + margin.left},${margin.top})`);

  // ── Scales ──
  let xScale = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.hours) + 0.5])
    .range([0, iW]);

  let yScale = d3.scaleLinear()
    .domain([0, 10])
    .range([iH, 0]);

  // ── Grid lines ──
  const xGrid = g.append("g").attr("class", "grid")
    .attr("transform", `translate(0,${iH})`)
    .call(d3.axisBottom(xScale).tickSize(-iH).tickFormat(""))
    .call(ax => ax.select(".domain").remove());

  const yGrid = g.append("g").attr("class", "grid")
    .call(d3.axisLeft(yScale).tickSize(-iW).tickFormat(""))
    .call(ax => ax.select(".domain").remove());

  // ── Axes ──
  const xAxisG = g.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${iH})`)
    .call(d3.axisBottom(xScale).ticks(10))
    .call(ax => ax.select(".domain").remove());

  const yAxisG = g.append("g").attr("class", "axis")
    .call(d3.axisLeft(yScale).ticks(5))
    .call(ax => ax.select(".domain").remove());

  // ── Axis labels ──
  g.append("text").attr("class", "axis-label")
    .attr("x", iW / 2).attr("y", iH + 36)
    .attr("text-anchor", "middle")
    .text("Hours of Music Listened Per Day");

  g.append("text").attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -iH / 2).attr("y", -42)
    .attr("text-anchor", "middle")
    .text("Anxiety Score (0–10)");

  // ── Dots layer (clipped) ──
  const dotsG = g.append("g").attr("clip-path", "url(#scatter-clip)");

  // Store jitter so it's stable across redraws
  const jittered = data.map(d => ({
    ...d,
    jx: d.hours  + (Math.random() - 0.5) * 0.3,
    jy: d.anxiety + (Math.random() - 0.5) * 0.8
  }));

  const dots = dotsG.selectAll(".dot")
    .data(jittered)
    .join("circle")
      .attr("class", "dot")
      .attr("cx", d => xScale(d.jx))
      .attr("cy", d => yScale(d.jy))
      .attr("r", 3.5)
      .attr("fill", "#992685")
      .attr("fill-opacity", 0.45)
      .attr("stroke", "none")
      .on("mouseover", (event, d) => showTip(
        `Genre: ${d.genre}<br>Hours/day: ${d.hours}<br>
         Anxiety: ${d.anxiety}<br>Depression: ${d.depression}`, event))
      .on("mousemove", (event, d) => showTip(
        `Genre: ${d.genre}<br>Hours/day: ${d.hours}<br>
         Anxiety: ${d.anxiety}<br>Depression: ${d.depression}`, event))
      .on("mouseout", hideTip);

  // ── Trend line ──
  const n     = data.length;
  const sumX  = d3.sum(data, d => d.hours);
  const sumY  = d3.sum(data, d => d.anxiety);
  const sumXY = d3.sum(data, d => d.hours * d.anxiety);
  const sumX2 = d3.sum(data, d => d.hours * d.hours);
  const slope     = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  const xMin = d3.min(data, d => d.hours);
  const xMax = d3.max(data, d => d.hours);

  const trendLine = g.append("line")
    .attr("x1", xScale(xMin)).attr("y1", yScale(slope * xMin + intercept))
    .attr("x2", xScale(xMax)).attr("y2", yScale(slope * xMax + intercept))
    .attr("stroke", "#FF0000")
    .attr("stroke-width", 1.8)
    .attr("stroke-dasharray", "5,3");

  // ── Legend ──
  const lx = iW - 140, ly = 4;
  const lg = g.append("g").attr("transform", `translate(${lx},${ly})`);
  lg.append("circle").attr("cx", 6).attr("cy", 6).attr("r", 3.5)
    .attr("fill", "#992685").attr("fill-opacity", 0.55);
  lg.append("text").attr("x", 14).attr("y", 10)
    .attr("font-size", 9).attr("fill", "#555")
    .attr("font-family", "Arial, sans-serif").text("Survey respondent");
  lg.append("line").attr("x1", 0).attr("x2", 14).attr("y1", 22).attr("y2", 22)
    .attr("stroke", "#FF0000").attr("stroke-width", 1.8)
    .attr("stroke-dasharray", "5,3");
  lg.append("text").attr("x", 18).attr("y", 26)
    .attr("font-size", 9).attr("fill", "#555")
    .attr("font-family", "Arial, sans-serif").text("Trend line");

  // ── BRUSH ────────────────────────────────────────────────────────────────
  const brush = d3.brush()
    .extent([[0, 0], [iW, iH]])
    .on("brush end", ({ selection }) => {
      if (!selection) {
        // Brush cleared — reset all dots, reset bar chart
        dots.attr("fill-opacity", 0.45).attr("stroke", "none");
        updateBarChart(data);
        return;
      }

      const [[x0, y0], [x1, y1]] = selection;

      // Convert pixel selection back to data space using current scales
      const hMin = xScale.invert(x0), hMax = xScale.invert(x1);
      const aMin = yScale.invert(y1), aMax = yScale.invert(y0); // y is inverted

      // Highlight brushed dots, dim the rest
      dots
        .attr("fill-opacity", d =>
          d.jx >= hMin && d.jx <= hMax && d.jy >= aMin && d.jy <= aMax
            ? 0.85 : 0.08)
        .attr("stroke", d =>
          d.jx >= hMin && d.jx <= hMax && d.jy >= aMin && d.jy <= aMax
            ? "#5a0080" : "none");

      // Filter data and update bar chart with animation
      const brushed = data.filter(d =>
        d.hours  >= hMin && d.hours  <= hMax &&
        d.anxiety >= aMin && d.anxiety <= aMax
      );
      updateBarChart(brushed);
    });

  // Brush layer goes on top of dots
  const brushG = g.append("g").attr("class", "brush").call(brush);
}