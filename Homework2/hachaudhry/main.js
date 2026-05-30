/*
 * main.js: Global Terrorism Dashboard
 *
 * Dataset : Global Terrorism Database (GTD), 1970–2017
 *
 *
 * Three visualization views:
 *   1.Geographic Map
 *   2. Stream Graph
 *   3. Stacked Bar Chart
 *
 */

"use strict";



//ordered by global frequency
// (most common first so I can control stream layer ordering)
const ATTACK_TYPES = [
  "Bombing/Explosion",
  "Armed Assault",
  "Assassination",
  "Facility/Infrastructure Attack",
  "Hostage Taking (Kidnapping)",
  "Unknown",
  "Unarmed Assault",
  "Hostage Taking (Barricade Incident)",
  "Hijacking"
];

//color scale (different for different types of attacks)
const attackColor = d3.scaleOrdinal()
  .domain(ATTACK_TYPES)
  .range([
    "#e05c5c", //red
    "#f4a261", //orange
    "#e9c46a", //amber
    "#2a9d8f", //teal
    "#457b9d", //steel blue
    "#888888", //gray
    "#9b5de5", //purple
    "#f15bb5", //pink
    "#00bbf9"  //cyan
  ]);

const REGION_ORDER = [
  "Middle East & North Africa",
  "South Asia",
  "Sub-Saharan Africa",
  "South America",
  "Southeast Asia",
  "Central America & Caribbean",
  "Western Europe",
  "Eastern Europe",
  "North America",
  "East Asia",
  "Central Asia",
  "Australasia & Oceania"
];

//for mapping country names
const GTD_TO_ISO = {
  "Afghanistan": 4,       "Albania": 8,           "Algeria": 12,
  "Angola": 24,           "Argentina": 32,         "Australia": 36,
  "Austria": 40,          "Azerbaijan": 31,        "Bahrain": 48,
  "Bangladesh": 50,       "Belgium": 56,           "Bolivia": 68,
  "Bosnia-Herzegovina": 70, "Bosnia and Herzegovina": 70,
  "Brazil": 76,           "Bulgaria": 100,         "Burundi": 108,
  "Cambodia": 116,        "Cameroon": 120,         "Canada": 124,
  "Chad": 148,            "Chile": 152,            "China": 156,
  "Colombia": 170,        "Congo": 178,            "Republic of the Congo": 178,
  "Democratic Republic of the Congo": 180, "Democratic Republic of Congo": 180,
  "Costa Rica": 188,      "Croatia": 191,          "Cuba": 192,
  "Cyprus": 196,          "Czech Republic": 203,   "Denmark": 208,
  "Djibouti": 262,        "Dominican Republic": 214, "Ecuador": 218,
  "Egypt": 818,           "El Salvador": 222,      "Ethiopia": 231,
  "Finland": 246,         "France": 250,           "Germany": 276,
  "Ghana": 288,           "Greece": 300,           "Guatemala": 320,
  "Guinea": 324,          "Haiti": 332,            "Honduras": 340,
  "Hungary": 348,         "India": 356,            "Indonesia": 360,
  "Iran": 364,            "Iraq": 368,             "Ireland": 372,
  "Israel": 376,          "Italy": 380,            "Jamaica": 388,
  "Japan": 392,           "Jordan": 400,           "Kazakhstan": 398,
  "Kenya": 404,           "Kosovo": 383,           "Kuwait": 414,
  "Kyrgyzstan": 417,      "Laos": 418,             "Lebanon": 422,
  "Libya": 434,           "Malaysia": 458,         "Mali": 466,
  "Mauritania": 478,      "Mexico": 484,           "Morocco": 504,
  "Mozambique": 508,      "Myanmar": 104,          "Nepal": 524,
  "Netherlands": 528,     "New Zealand": 554,      "Nicaragua": 558,
  "Niger": 562,           "Nigeria": 566,          "North Korea": 408,
  "Norway": 578,          "Oman": 512,             "Pakistan": 586,
  "Panama": 591,          "Papua New Guinea": 598, "Paraguay": 600,
  "Peru": 604,            "Philippines": 608,      "Poland": 616,
  "Portugal": 620,        "Puerto Rico": 630,      "Qatar": 634,
  "Romania": 642,         "Russia": 643,           "Rwanda": 646,
  "Saudi Arabia": 682,    "Senegal": 686,          "Serbia": 688,
  "Sierra Leone": 694,    "Slovakia": 703,         "Slovak Republic": 703,
  "Somalia": 706,         "South Africa": 710,     "South Korea": 410,
  "South Sudan": 728,     "Spain": 724,            "Sri Lanka": 144,
  "Sudan": 729,           "Sweden": 752,           "Switzerland": 756,
  "Syria": 760,           "Taiwan": 158,           "Tajikistan": 762,
  "Tanzania": 834,        "Thailand": 764,         "Togo": 768,
  "Trinidad and Tobago": 780, "Tunisia": 788,      "Turkey": 792,
  "Uganda": 800,          "Ukraine": 804,          "United Arab Emirates": 784,
  "United Kingdom": 826,  "United States": 840,    "Uruguay": 858,
  "Uzbekistan": 860,      "Venezuela": 862,        "Vietnam": 704,
  "West Bank and Gaza Strip": 275, "Yemen": 887,   "Zambia": 894,
  "Zimbabwe": 716,        "Ivory Coast": 384,      "Cote d'Ivoire": 384,
  "Macedonia": 807,       "Moldova": 498
};

//reverse lookup
const ISO_TO_GTD = {};
Object.keys(GTD_TO_ISO).forEach(function(name) {
  const iso = GTD_TO_ISO[name];
  if (!ISO_TO_GTD[iso]) ISO_TO_GTD[iso] = name;
});


const tooltip = d3.select("#tooltip"); // shared tooltip div

function showTip(html, evt) {
  tooltip.style("opacity", 1).html(html)
    .style("left", (evt.pageX + 14) + "px")
    .style("top",  (evt.pageY - 38) + "px");
}

function moveTip(evt) {
  tooltip.style("left", (evt.pageX + 14) + "px")
         .style("top",  (evt.pageY - 38) + "px");
}

function hideTip() { tooltip.style("opacity", 0); }


let selectedRegion = null;


Promise.all([
  d3.csv("globalterrorismdb_0718dist.csv"),   // GTD dataset
  d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json") //world shapes
]).then(function(results) {
  var raw   = results[0];
  var world = results[1];

  d3.select("#loading").style("display", "none"); //hides loading thingy

  //converting strings to numbers for the fields we use
  raw.forEach(function(d) {
    d.iyear           = +d.iyear;
    d.nkill           = +d.nkill  || 0;
    d.nwound          = +d.nwound || 0;
    d.attacktype1_txt = d.attacktype1_txt || "Unknown";
    d.region_txt      = d.region_txt      || "Unknown";
    d.country_txt     = d.country_txt     || "Unknown";
  });

  // country by country stats
  var countryAgg = {};
  raw.forEach(function(d) {
    var c = d.country_txt;
    if (!countryAgg[c]) {
      countryAgg[c] = { attacks: 0, killed: 0, wounded: 0, region: d.region_txt };
    }
    countryAgg[c].attacks++;
    countryAgg[c].killed  += d.nkill;
    countryAgg[c].wounded += d.nwound;
  });

  //stats by region
  var regionAgg = {};
  raw.forEach(function(d) {
    var r = d.region_txt;
    if (!regionAgg[r]) regionAgg[r] = { attacks: 0, killed: 0, wounded: 0 };
    regionAgg[r].attacks++;
    regionAgg[r].killed  += d.nkill;
    regionAgg[r].wounded += d.nwound;
  });

  var regionData = REGION_ORDER
    .filter(function(r) { return regionAgg[r]; })
    .map(function(r) {
      return {
        region:  r,
        attacks: regionAgg[r].attacks,
        killed:  regionAgg[r].killed,
        wounded: regionAgg[r].wounded
      };
    });

  // attack type count by year (global)
  var yearTypeGlobal = {};
  raw.forEach(function(d) {
    var y = d.iyear, t = d.attacktype1_txt;
    if (!yearTypeGlobal[y]) yearTypeGlobal[y] = {};
    yearTypeGlobal[y][t] = (yearTypeGlobal[y][t] || 0) + 1;
  });

  //same breakdown split by region so the stream graph can filter
  var regionYearType = {};
  raw.forEach(function(d) {
    var r = d.region_txt, y = d.iyear, t = d.attacktype1_txt;
    if (!regionYearType[r])    regionYearType[r]    = {};
    if (!regionYearType[r][y]) regionYearType[r][y] = {};
    regionYearType[r][y][t] = (regionYearType[r][y][t] || 0) + 1;
  });

  // converts a year to type lookup into the flat row array d3.stack() needs (for the stream graph)
  function buildStreamRows(yearTypeTable) {
    return d3.range(1970, 2018).map(function(y) {
      var row = { year: y };
      ATTACK_TYPES.forEach(function(t) {
        row[t] = (yearTypeTable[y] && yearTypeTable[y][t]) || 0;
      });
      return row;
    });
  }

  var globalStreamRows = buildStreamRows(yearTypeGlobal);

  //draws views
  var mapCtrl    = drawMap(world, countryAgg);
  var streamCtrl = drawStream(globalStreamRows);
  var barCtrl    = drawBar(regionData);

  //linked interaction (so that clicking a country puts all the views settings on that region the country is part of)
  function onCountryClick(region) {
    selectedRegion = (selectedRegion === region) ? null : region;

    mapCtrl.setRegion(selectedRegion);
    var streamRows = selectedRegion
      ? buildStreamRows(regionYearType[selectedRegion] || {})
      : globalStreamRows;
    streamCtrl.update(streamRows, selectedRegion);
    barCtrl.setRegion(selectedRegion);
    d3.select("#subtitle").text(
      selectedRegion
        ? "Showing: " + selectedRegion + "  ·  Click same country again to reset"
        : "Click a country on the map to filter by region  ·  181,693 incidents"
    );
  }

  mapCtrl.onClick = onCountryClick;

}).catch(function(err) {
  d3.select("#loading")
    .html('<span style="color:#e05c5c">Error loading data: ' + err.message + '</span>');
  console.error(err);
});


//map view

function drawMap(world, countryAgg) {
  var panel = document.getElementById("map-panel");
  var W = panel.clientWidth;
  var H = panel.clientHeight;

  var svg = d3.select("#map-svg"); // SVG for map

  // world map
  var projection = d3.geoNaturalEarth1()
    .scale(W / 6.3)
    .translate([W / 2, H / 2]);

  var pathGen = d3.geoPath().projection(projection); // converts GeoJSON geometry to SVG paths

  var countries = topojson.feature(world, world.objects.countries); // TopoJSON → GeoJSON features

  var maxAttacks = d3.max(Object.keys(countryAgg).map(function(k) {
    return countryAgg[k].attacks;
  }));

  // log scale for colors so we can see extremes distinctly
  var logNorm = d3.scaleLog()
    .domain([1, maxAttacks])
    .range([0, 1])
    .clamp(true);

  function fillColor(attacks) {
    if (!attacks || attacks < 1) return "#1e2030"; //no-data countries
    return d3.interpolateYlOrRd(logNorm(attacks)); // color scale
  }

  // attempt at an ocean
  svg.append("path")
    .datum({ type: "Sphere" })
    .attr("d", pathGen)
    .attr("fill", "#1c1e2e")
    .attr("stroke", "#2d2e3e")
    .attr("stroke-width", 0.5);

  // gridlines (lat/lon)
  svg.append("path")
    .datum(d3.geoGraticule()())
    .attr("d", pathGen)
    .attr("fill", "none")
    .attr("stroke", "#21223a")
    .attr("stroke-width", 0.3);

  // SVG path per country, and colored based off attack count
  var countryPaths = svg.selectAll(".country")
    .data(countries.features)
    .enter()
    .append("path")
    .attr("class", "country")
    .attr("d", pathGen) //country boundaries
    .attr("stroke", "#2a2b3d")
    .attr("stroke-width", 0.4)
    .attr("fill", function(d) {
      var name = ISO_TO_GTD[+d.id];
      var c    = name && countryAgg[name];
      return fillColor(c && c.attacks);
    })
    .style("cursor", function(d) {
      var name = ISO_TO_GTD[+d.id];
      return (name && countryAgg[name]) ? "pointer" : "default";
    })
    .on("mouseover", function(d) {
      var name = ISO_TO_GTD[+d.id];
      var c    = name && countryAgg[name];
      showTip(
        c
          ? "<strong>" + name + "</strong>" +
            "Attacks: "  + c.attacks.toLocaleString() + "<br>" +
            "Killed: "   + c.killed.toLocaleString()  + "<br>" +
            "Wounded: "  + c.wounded.toLocaleString() + "<br>" +
            "<span style='color:#666'>Region: " + c.region + "</span>"
          : "<strong>" + (name || "-") + "</strong>No GTD records",
        d3.event
      );
      d3.select(this).raise().attr("stroke", "#e05c5c").attr("stroke-width", 1.5);
    })
    .on("mousemove", function() { moveTip(d3.event); })
    .on("mouseout",  function() {
      hideTip();
      var name        = ISO_TO_GTD[+this.__data__.id];
      var c           = name && countryAgg[name];
      var inRegion    = c && state._region && c.region === state._region;
      d3.select(this)
        .attr("stroke",       inRegion ? "#f0d060" : "#2a2b3d")
        .attr("stroke-width", inRegion ? 1.2       : 0.4);
    })
    .on("click", function(d) {
      var name = ISO_TO_GTD[+d.id];
      var c    = name && countryAgg[name];
      if (c && state.onClick) state.onClick(c.region);
    });

  // Color legend
  var lgW = 130, lgH = 8;
  var defs = svg.append("defs");
  var grad = defs.append("linearGradient").attr("id", "choropleth-grad");

  d3.range(0, 1.01, 0.1).forEach(function(t) {
    grad.append("stop")
      .attr("offset", (t * 100) + "%")
      .attr("stop-color", d3.interpolateYlOrRd(t));
  });

  var lgG = svg.append("g")
    .attr("class", "legend")
    .attr("transform", "translate(12," + (H - 42) + ")");

  lgG.append("text")
    .attr("y", -5).attr("fill", "#666").attr("font-size", "9px")
    .text("Attacks (log scale)");

  lgG.append("rect") // gradient color bar
    .attr("width", lgW).attr("height", lgH).attr("rx", 2)
    .attr("fill", "url(#choropleth-grad)");

  lgG.append("text")
    .attr("y", lgH + 11).attr("fill", "#555").attr("font-size", "8px")
    .text("Fewer");

  lgG.append("text")
    .attr("x", lgW).attr("y", lgH + 11)
    .attr("text-anchor", "end").attr("fill", "#555").attr("font-size", "8px")
    .text(maxAttacks.toLocaleString() + "+");

  lgG.append("text")
    .attr("x", lgW / 2).attr("y", lgH + 11)
    .attr("text-anchor", "middle").attr("fill", "#444").attr("font-size", "8px")
    .text("More");

  var state = { onClick: null, _region: null };

  // highlights countries in the selected region and dims out all others (kind of pops them out)
  state.setRegion = function(region) {
    state._region = region;
    countryPaths
      .attr("opacity", function(d) {
        if (!region) return 1;
        var name = ISO_TO_GTD[+d.id];
        var c    = name && countryAgg[name];
        return (c && c.region === region) ? 1 : 0.18;
      })
      .attr("stroke", function(d) {
        if (!region) return "#2a2b3d";
        var name = ISO_TO_GTD[+d.id];
        var c    = name && countryAgg[name];
        return (c && c.region === region) ? "#f0d060" : "#2a2b3d";
      })
      .attr("stroke-width", function(d) {
        if (!region) return 0.4;
        var name = ISO_TO_GTD[+d.id];
        var c    = name && countryAgg[name];
        return (c && c.region === region) ? 1.2 : 0.4;
      });
  };

  return state;
}


//stream graph view

function drawStream(initRows) {
  var panel = document.getElementById("stream-panel");
  var W = panel.clientWidth;
  var H = panel.clientHeight;

  var margin = { top: 30, right: 155, bottom: 36, left: 38 };
  var iW = W - margin.left - margin.right;
  var iH = H - margin.top - margin.bottom;

  var svg = d3.select("#stream-svg"); // SVG for the stream graph
  var g   = svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  //linear x scale mapping years for pixel positions
  var xScale = d3.scaleLinear()
    .domain([1970, 2017])
    .range([0, iW]);

  g.append("g") // x axis with year tick marks
    .attr("class", "axis")
    .attr("transform", "translate(0," + iH + ")")
    .call(d3.axisBottom(xScale).tickFormat(d3.format("d")).ticks(10));

  g.append("text") // x axis label
    .attr("class", "axis-label")
    .attr("x", iW / 2).attr("y", iH + 30)
    .attr("text-anchor", "middle")
    .text("Year");

  // Y axis label only, no ticks because wiggle offset makes absolute y-values meaningless
  g.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -(iH / 2)).attr("y", -26)
    .attr("text-anchor", "middle")
    .text("Number of Attacks");

  // stackOffsetWiggle minimises total slope change to characteristic stream graph shape
  // stackOrderInsideOut places the largest series centrally for visual balance
  var stack = d3.stack()
    .keys(ATTACK_TYPES)
    .offset(d3.stackOffsetWiggle)
    .order(d3.stackOrderInsideOut);

  var yScale = d3.scaleLinear().range([iH, 0]); // domain set for change in computeStack

  // smoothing so the stream graph looks nice
  var area = d3.area()
    .x(function(d) { return xScale(d.data.year); })
    .curve(d3.curveBasis);

  // recomputes the stacked layout and updates yScale + area y accessors
  function computeStack(rows) {
    var stacked = stack(rows);
    var yMin = d3.min(stacked, function(layer) {
      return d3.min(layer, function(d) { return d[0]; });
    });
    var yMax = d3.max(stacked, function(layer) {
      return d3.max(layer, function(d) { return d[1]; });
    });
    yScale.domain([yMin, yMax]);
    area.y0(function(d) { return yScale(d[0]); }) // lower band edge
        .y1(function(d) { return yScale(d[1]); }); // upper band edge
    return stacked;
  }

  var initStacked = computeStack(initRows);

  //path per attack type, thickness represents attack frequency
  var streamPaths = g.selectAll(".stream-path")
    .data(initStacked)
    .enter()
    .append("path")
    .attr("class", "stream-path")
    .attr("d", area) // band shape from the area generator
    .attr("fill", function(d) { return attackColor(d.key); }) // color by attack type
    .attr("opacity", 0.82)
    .on("mouseover", function(d) {
      showTip("<strong>" + d.key + "</strong>", d3.event);
      d3.selectAll(".stream-path").attr("opacity", 0.18); // dim all other streams
      d3.select(this).attr("opacity", 1);
    })
    .on("mousemove", function() { moveTip(d3.event); })
    .on("mouseout",  function() {
      hideTip();
      d3.selectAll(".stream-path").attr("opacity", 0.82);
    });

  var legendG = svg.append("g") // legend positioned to the right of the chart
    .attr("transform", "translate(" + (W - margin.right + 12) + "," + margin.top + ")");

  legendG.append("text")
    .attr("y", -8).attr("fill", "#555").attr("font-size", "9px")
    .text("Attack Type");

  ATTACK_TYPES.forEach(function(t, i) {
    var row = legendG.append("g").attr("transform", "translate(0," + (i * 15) + ")");

    row.append("rect")
      .attr("width", 10).attr("height", 10).attr("rx", 2)
      .attr("fill", attackColor(t));

    row.append("text") // attack type label
      .attr("x", 14).attr("y", 9)
      .attr("fill", "#999").attr("font-size", "9px")
      .text(t.length > 23 ? t.slice(0, 22) + "…" : t);
  });

  // redoes the process for a selected region and animates stream paths to new shapes
  function update(newRows, regionName) {
    var newStacked = computeStack(newRows);

    streamPaths.data(newStacked)
      .transition()
      .duration(700)
      .ease(d3.easeCubicInOut)
      .attr("d", area); // animate to new band shape

    d3.select("#stream-title").text(
      regionName
        ? "Attack Methods: " + regionName + " - Focus"
        : "Attack Methods Over Time - Focus"
    );
  }

  return { update: update };
}


//stacked bar chart view

function drawBar(regionData) {
  var panel = document.getElementById("bar-panel");
  var W = panel.clientWidth;
  var H = panel.clientHeight;

  var margin = { top: 28, right: 24, bottom: 36, left: 205 };
  var iW = W - margin.left - margin.right;
  var iH = H - margin.top - margin.bottom;

  var svg = d3.select("#bar-svg"); // SVG element for the bar chart
  var g   = svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  //band scale assigns a vertical slot to each region
  var yScale = d3.scaleBand()
    .domain(regionData.map(function(d) { return d.region; }))
    .range([0, iH])
    .paddingInner(0.22)
    .paddingOuter(0.08);

  // linear x scale from 0 to the highest total # of casualties of any region
  var xMax = d3.max(regionData, function(d) { return d.killed + d.wounded; });
  var xScale = d3.scaleLinear()
    .domain([0, xMax])
    .range([0, iW])
    .nice();

  // splits each region bar into a killed segment and a wounded segment
  var stackGen = d3.stack().keys(["killed", "wounded"]);
  var stacked  = stackGen(regionData);

  var barColors  = { killed: "#e05c5c", wounded: "#f4a261" };
  var barLabels  = { killed: "Killed",  wounded: "Wounded"  };

  g.append("g") // vertical grid lines drawn behind bars
    .attr("class", "grid")
    .call(
      d3.axisBottom(xScale).ticks(6).tickSize(iH).tickFormat("")
    )
    .select(".domain").remove();

  // one group for casualty type, color for group level
  var barGroups = g.selectAll(".bar-layer")
    .data(stacked)
    .enter()
    .append("g")
    .attr("class", "bar-layer")
    .attr("fill", function(d) { return barColors[d.key]; });

  // one rect per region per casualty type
  var rects = barGroups.selectAll("rect")
    .data(function(d) { return d; })
    .enter()
    .append("rect")
    .attr("y",      function(d) { return yScale(d.data.region); })
    .attr("x",      function(d) { return xScale(d[0]); }) // start of segment
    .attr("width",  function(d) { return Math.max(0, xScale(d[1]) - xScale(d[0])); }) // segment length
    .attr("height", yScale.bandwidth())
    .attr("rx", 2)
    .attr("opacity", 0.85)
    .on("mouseover", function(d) {
      showTip(
        "<strong>" + d.data.region + "</strong>" +
        "Attacks: "  + d.data.attacks.toLocaleString() + "<br>" +
        "Killed: "   + d.data.killed.toLocaleString()  + "<br>" +
        "Wounded: "  + d.data.wounded.toLocaleString(),
        d3.event
      );
      rects.attr("opacity", function(r) {
        return r.data.region === d.data.region ? 1 : 0.85;
      });
    })
    .on("mousemove", function() { moveTip(d3.event); })
    .on("mouseout",  function() {
      hideTip();
      rects.attr("opacity", 0.85);
    });

  g.append("g") // y axis with region name labels
    .attr("class", "axis")
    .call(d3.axisLeft(yScale).tickSize(0))
    .select(".domain").remove();

  g.selectAll(".axis text")
    .attr("fill", "#999")
    .attr("font-size", "10px")
    .attr("dx", "-4");

  g.append("g") // x axis with casualty count ticks
    .attr("class", "axis")
    .attr("transform", "translate(0," + iH + ")")
    .call(d3.axisBottom(xScale).ticks(6).tickFormat(d3.format(".2s")));

  g.append("text") // x axis label
    .attr("class", "axis-label")
    .attr("x", iW / 2).attr("y", iH + 30)
    .attr("text-anchor", "middle")
    .text("Total Casualties (Killed + Wounded)");

  var lgG = g.append("g") // legend group for killed/wounded
    .attr("transform", "translate(" + (iW - 110) + ",-18)");

  ["killed", "wounded"].forEach(function(key, i) {
    var row = lgG.append("g").attr("transform", "translate(" + (i * 65) + ",0)");
    row.append("rect") // colored swatch
      .attr("width", 10).attr("height", 10).attr("rx", 2)
       .attr("fill", barColors[key]);
    row.append("text") // casualty type label
      .attr("x", 14).attr("y", 9)
      .attr("fill", "#999").attr("font-size", "9px")
      .text(barLabels[key]);
  });

  // Dims bars outside the selected region (resets when region is null)
  function setRegion(region) {
    rects.attr("opacity", function(d) {
      if (!region) return 0.85;
      return d.data.region === region ? 1 : 0.12;
    });
    g.selectAll(".axis text").attr("fill", function(d) {
      if (!region) return "#999";
      return d === region ? "#f0d060" : "#444";
    });

    d3.select("#bar-title").text(
      region ? "Casualties: " + region + " - Focus" : "Casualties by Region - Focus"
    );
  }

  return { setRegion: setRegion };
}
