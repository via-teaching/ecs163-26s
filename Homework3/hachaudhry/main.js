/*
 * main.js Global Terrorism Dashboard (HW3)
 *
 * Dataset : Global Terrorism Database (GTD), 1970-2017
 *
 * Three views:
 *   1. Choropleth world map   Overview  (pan + zoom interaction)
 *   2. Stream graph           Focus     (animated transition on region change)
 *   3. Stacked bar chart      Focus     (animated transition on region/year change)
 *
 * Interactions (HW3):
 *   • Pan & Zoom   scroll/drag the map to zoom into any region (d3.zoom)
 *   • Brushing     drag the year-range strip beneath the stream graph to filter
 *                   the bar chart to a specific time window (d3.brushX)
 *   • Selection    click a country to filter all views to that region (bonus)
 *
 * Animated transitions:
 *   • Stream paths morph with a cubic ease when the region filter changes
 *   • Bar segments slide/grow/shrink with a cubic ease when the year range
 *     or region filter changes
 */

"use strict";

// Attack types ordered by global frequency
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

//ordinal color scale, one distinct hue per attack type
const attackColor = d3.scaleOrdinal()
  .domain(ATTACK_TYPES)
  .range([
    "#e05c5c", "#f4a261", "#e9c46a", "#2a9d8f", "#457b9d",
    "#888888", "#9b5de5", "#f15bb5", "#00bbf9"
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

// GTD country name to ISO numeric ID (needed to join GeoJSON with GTD data)
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

// reverse lookup: ISO numeric ID to GTD country name
const ISO_TO_GTD = {};
Object.keys(GTD_TO_ISO).forEach(function(name) {
  var iso = GTD_TO_ISO[name];
  if (!ISO_TO_GTD[iso]) ISO_TO_GTD[iso] = name;
});

// Shared tooltip div
const tooltip = d3.select("#tooltip");

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

//global filter state
var selectedRegion = null;
var brushedYears   = [1970, 2017];


Promise.all([
  d3.csv("globalterrorismdb_0718dist.csv"),
  d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
]).then(function(results) {
  var raw   = results[0];
  var world = results[1];

  //Hides loading overlay 
  d3.select("#loading").style("display", "none");

  raw.forEach(function(d) {
    d.iyear           = +d.iyear;
    d.nkill           = +d.nkill  || 0;
    d.nwound          = +d.nwound || 0;
    d.attacktype1_txt = d.attacktype1_txt || "Unknown";
    d.region_txt      = d.region_txt      || "Unknown";
    d.country_txt     = d.country_txt     || "Unknown";
  });

  // Per country totals for the map
  var countryAgg = {};
  raw.forEach(function(d) {
    var c = d.country_txt;
    if (!countryAgg[c]) countryAgg[c] = { attacks:0, killed:0, wounded:0, region:d.region_txt };
    countryAgg[c].attacks++;
    countryAgg[c].killed  += d.nkill;
    countryAgg[c].wounded += d.nwound;
  });

  // Per region by per year casualty totals (used by the brush to recompute the bar chart)
  var regionYearData = {};
  raw.forEach(function(d) {
    var r = d.region_txt, y = d.iyear;
    if (!regionYearData[r])    regionYearData[r]    = {};
    if (!regionYearData[r][y]) regionYearData[r][y] = { attacks:0, killed:0, wounded:0 };
    regionYearData[r][y].attacks++;
    regionYearData[r][y].killed  += d.nkill;
    regionYearData[r][y].wounded += d.nwound;
  });

  // Global year by attack type counts for the stream graph (full dataset)
  var yearTypeGlobal = {};
  // Per region year by attack type counts (for when a region is selected)
  var regionYearType = {};
  raw.forEach(function(d) {
    var r = d.region_txt, y = d.iyear, t = d.attacktype1_txt;
    if (!yearTypeGlobal[y])    yearTypeGlobal[y]    = {};
    yearTypeGlobal[y][t] = (yearTypeGlobal[y][t] || 0) + 1;
    if (!regionYearType[r])    regionYearType[r]    = {};
    if (!regionYearType[r][y]) regionYearType[r][y] = {};
    regionYearType[r][y][t] = (regionYearType[r][y][t] || 0) + 1;
  });

  //flatten a year to type lookup into the row array d3.stack() expects
  function buildStreamRows(table) {
    return d3.range(1970, 2018).map(function(y) {
      var row = { year: y };
      ATTACK_TYPES.forEach(function(t) { row[t] = (table[y] && table[y][t]) || 0; });
      return row;
    });
  }

  var globalStreamRows = buildStreamRows(yearTypeGlobal);

  // sums region casualties across a given [y0, y1] year range (inclusive)
  function computeRegionData(yearRange) {
    return REGION_ORDER.filter(function(r) { return regionYearData[r]; }).map(function(r) {
      var attacks = 0, killed = 0, wounded = 0;
      for (var y = yearRange[0]; y <= yearRange[1]; y++) {
        var yd = regionYearData[r][y];
        if (yd) { attacks += yd.attacks; killed += yd.killed; wounded += yd.wounded; }
      }
      return { region: r, attacks: attacks, killed: killed, wounded: wounded };
    });
  }

  var mapCtrl    = drawMap(world, countryAgg);
  var streamCtrl = drawStream(globalStreamRows);
  var barCtrl    = drawBar(computeRegionData([1970, 2017]));

  // Country click filter stream graph and bar chart to that region
  function onCountryClick(region) {
    selectedRegion = (selectedRegion === region) ? null : region;
    mapCtrl.setRegion(selectedRegion);
    var rows = selectedRegion
      ? buildStreamRows(regionYearType[selectedRegion] || {})
      : globalStreamRows;
    streamCtrl.update(rows, selectedRegion);
    barCtrl.update(computeRegionData(brushedYears), selectedRegion);
    refreshSubtitle();
  }

  // Year range brush to filter bar chart to selected years
  function onBrush(years) {
    brushedYears = years;
    barCtrl.update(computeRegionData(brushedYears), selectedRegion);
    refreshSubtitle();
  }

  function refreshSubtitle() {
    var parts = [];
    if (selectedRegion) parts.push("Region: " + selectedRegion);
    if (brushedYears[0] !== 1970 || brushedYears[1] !== 2017)
      parts.push("Years: " + brushedYears[0] + "\u2013" + brushedYears[1]);
    d3.select("#subtitle").text(
      parts.length
        ? parts.join("  \u00b7  ") + "  \u00b7  Click same country to reset"
        : "Click a country to filter by region  \u00b7  Drag strip below stream to filter years  \u00b7  181,693 incidents"
    );
  }

  mapCtrl.onClick    = onCountryClick;
  streamCtrl.onBrush = onBrush;

}).catch(function(err) {
  d3.select("#loading")
    .html('<span style="color:#e05c5c">Error loading data: ' + err.message + '</span>');
  console.error(err);
});


// Interaction (Pan & Zoom (d3.zoom))

function drawMap(world, countryAgg) {
  var panel = document.getElementById("map-panel");
  var W = panel.clientWidth;
  var H = panel.clientHeight;

  //SVG element for the map
  var svg = d3.select("#map-svg");

  // group that receives the zoom transform, keeps legend/title outside the zoom
  var zoomG = svg.append("g").attr("class", "zoom-layer");

  // Natural Earth projection centered on the panel
  var projection = d3.geoNaturalEarth1()
    .scale(W / 6.3)
    .translate([W / 2, H / 2]);

  // Path generator converts GeoJSON geometry to SVG path strings
  var pathGen = d3.geoPath().projection(projection);

  // converts TopoJSON to GeoJSON feature collection
  var countries = topojson.feature(world, world.objects.countries);

  var maxAttacks = d3.max(Object.keys(countryAgg), function(k) { return countryAgg[k].attacks; });

  // log scale compresses the wide attack count range into [0,1]
  var logNorm = d3.scaleLog()
    .domain([1, maxAttacks])
    .range([0, 1])
    .clamp(true);

  function fillColor(attacks) {
    if (!attacks || attacks < 1) return "#1e2030";
    return d3.interpolateYlOrRd(logNorm(attacks));
  }

  // ocean sphere drawn first so it sits behind all countries
  zoomG.append("path")
    .datum({ type: "Sphere" })
    .attr("d", pathGen)
    .attr("fill", "#1c1e2e")
    .attr("stroke", "#2d2e3e")
    .attr("stroke-width", 0.5);

  // Lat/lon graticule grid lines
  zoomG.append("path")
    .datum(d3.geoGraticule()())
    .attr("d", pathGen)
    .attr("fill", "none")
    .attr("stroke", "#21223a")
    .attr("stroke-width", 0.3);

  // One SVG <path> per country, colored by log normalized attack count
  var countryPaths = zoomG.selectAll(".country")
    .data(countries.features)
    .enter()
    .append("path")
    .attr("class", "country")
    .attr("d", pathGen)
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
          : "<strong>" + (name || "\u2014") + "</strong>No GTD records",
        d3.event
      );
      d3.select(this).raise().attr("stroke", "#e05c5c").attr("stroke-width", 1.5);
    })
    .on("mousemove", function() { moveTip(d3.event); })
    .on("mouseout", function() {
      hideTip();
      var name     = ISO_TO_GTD[+this.__data__.id];
      var c        = name && countryAgg[name];
      var inRegion = c && state._region && c.region === state._region;
      d3.select(this)
        .attr("stroke",       inRegion ? "#f0d060" : "#2a2b3d")
        .attr("stroke-width", inRegion ? 1.2       : 0.4);
    })
    .on("click", function(d) {
      // Suppress click if the user just finished a pan drag
      if (wasZooming) { wasZooming = false; return; }
      var name = ISO_TO_GTD[+d.id];
      var c    = name && countryAgg[name];
      if (c && state.onClick) state.onClick(c.region);
    });


  var lgW = 130, lgH = 8;

  // Linear gradient definition for the map legend bar
  var defs = svg.append("defs");
  var grad = defs.append("linearGradient").attr("id", "choropleth-grad");
  d3.range(0, 1.01, 0.1).forEach(function(t) {
    grad.append("stop")
      .attr("offset", (t * 100) + "%")
      .attr("stop-color", d3.interpolateYlOrRd(t));
  });

  // legend group anchored to the bottom left corner of the map SVG
  var lgG = svg.append("g")
    .attr("class", "legend")
    .attr("transform", "translate(12," + (H - 42) + ")");

  lgG.append("text").attr("y", -5).attr("fill", "#666").attr("font-size", "9px")
    .text("Attacks (log scale)");
  //gradient color bar
  lgG.append("rect").attr("width", lgW).attr("height", lgH).attr("rx", 2)
    .attr("fill", "url(#choropleth-grad)");
  lgG.append("text").attr("y", lgH + 11).attr("fill", "#555").attr("font-size", "8px")
    .text("Fewer");
  lgG.append("text").attr("x", lgW).attr("y", lgH + 11)
    .attr("text-anchor", "end").attr("fill", "#555").attr("font-size", "8px")
    .text(maxAttacks.toLocaleString() + "+");
  lgG.append("text").attr("x", lgW / 2).attr("y", lgH + 11)
    .attr("text-anchor", "middle").attr("fill", "#444").attr("font-size", "8px")
    .text("More");

  // the zoom transform is applied to zoomG so the legend and title stay fixed

  var wasZooming = false;

  // zoom behavior: constrains scale to [1x, 8x]; translation bounded to panel
  var zoom = d3.zoom()
    .scaleExtent([1, 8])
    .translateExtent([[0, 0], [W, H]])
    .on("zoom", function() {
      wasZooming = true;
      // applies the current pan/zoom transform to the geographic layer
      zoomG.attr("transform", d3.event.transform);
    })
    .on("end", function() {
      // brief delay prevents zoom end from being mistaken for a country click
      setTimeout(function() { wasZooming = false; }, 60);
    });

  // Attach zoom to the SVG; double-click resets to identity (1×, no pan)
  svg.call(zoom)
    .on("dblclick.zoom", function() {
      svg.transition().duration(400).call(zoom.transform, d3.zoomIdentity);
    });

  var state = { onClick: null, _region: null };

  // dims countries outside the selected region, highlights those inside
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


// Interaction: animated transition when region changes; brushX context strip

function drawStream(initRows) {
  var panel = document.getElementById("stream-panel");
  var W = panel.clientWidth;
  var H = panel.clientHeight;

  // reserves extra bottom margin for the year range brush context strip
  var ctxH   = 22;
  var margin = { top: 30, right: 155, bottom: 58, left: 38 };
  var iW = W - margin.left - margin.right;
  var iH = H - margin.top - margin.bottom - ctxH - 6;

  // Root SVG for the stream graph
  var svg = d3.select("#stream-svg");
  var g   = svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // Linear by scale mapping years to pixel positions
  var xScale = d3.scaleLinear()
    .domain([1970, 2017])
    .range([0, iW]);

  // X axis with year tick marks
  g.append("g")
    .attr("class", "axis")
    .attr("transform", "translate(0," + iH + ")")
    .call(d3.axisBottom(xScale).tickFormat(d3.format("d")).ticks(10));

  // X axis label
  g.append("text")
    .attr("class", "axis-label")
    .attr("x", iW / 2).attr("y", iH + 26)
    .attr("text-anchor", "middle")
    .text("Year");

  // y axis label (wiggle offset makes absolute y values meaningless)
  g.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -(iH / 2)).attr("y", -26)
    .attr("text-anchor", "middle")
    .text("Attack Count");

  // stack with wiggle offset to characteristic stream shape;
  // InsideOut order places the largest series centrally for visual balance
  var stack = d3.stack()
    .keys(ATTACK_TYPES)
    .offset(d3.stackOffsetWiggle)
    .order(d3.stackOrderInsideOut);

  // Y scale domain is set dynamically in computeStack
  var yScale = d3.scaleLinear().range([iH, 0]);

  // Smooth area generator using basis spline curve
  var area = d3.area()
    .x(function(d) { return xScale(d.data.year); })
    .curve(d3.curveBasis);

  function computeStack(rows) {
    var stacked = stack(rows);
    var yMin = d3.min(stacked, function(l) { return d3.min(l, function(d) { return d[0]; }); });
    var yMax = d3.max(stacked, function(l) { return d3.max(l, function(d) { return d[1]; }); });
    yScale.domain([yMin, yMax]);
    // y0/y1 accessors map stack values through the dynamic y scale
    area.y0(function(d) { return yScale(d[0]); })
        .y1(function(d) { return yScale(d[1]); });
    return stacked;
  }

  var initStacked = computeStack(initRows);

  // one filled path per attack type, band thickness encodes frequency
  var streamPaths = g.selectAll(".stream-path")
    .data(initStacked)
    .enter()
    .append("path")
    .attr("class", "stream-path")
    .attr("d", area)
    .attr("fill", function(d) { return attackColor(d.key); })
    .attr("opacity", 0.82)
    .on("mouseover", function(d) {
      showTip("<strong>" + d.key + "</strong>", d3.event);
      d3.selectAll(".stream-path").attr("opacity", 0.18);
      d3.select(this).attr("opacity", 1);
    })
    .on("mousemove", function() { moveTip(d3.event); })
    .on("mouseout", function() {
      hideTip();
      d3.selectAll(".stream-path").attr("opacity", 0.82);
    });


  // Legend group placed to the right of the stream chart
  var legendG = svg.append("g")
    .attr("transform", "translate(" + (W - margin.right + 12) + "," + margin.top + ")");

  legendG.append("text").attr("y", -8).attr("fill", "#555").attr("font-size", "9px")
    .text("Attack Type");

  ATTACK_TYPES.forEach(function(t, i) {
    var row = legendG.append("g").attr("transform", "translate(0," + (i * 15) + ")");
    // Colored swatch for this attack type
    row.append("rect").attr("width", 10).attr("height", 10).attr("rx", 2)
      .attr("fill", attackColor(t));
    // Attack type label text
    row.append("text").attr("x", 14).attr("y", 9)
      .attr("fill", "#999").attr("font-size", "9px")
      .text(t.length > 23 ? t.slice(0, 22) + "\u2026" : t);
  });

  // a thin strip below the main chart, brushing it filters the bar chart by
  // the selected year range (focus context pattern).

  var ctxY = margin.top + iH + 38;

  // Group for the brush context strip
  var ctxG = svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + ctxY + ")");

  // Dark background bar for the brush target area
  ctxG.append("rect")
    .attr("width", iW).attr("height", ctxH)
    .attr("fill", "#1a1b26").attr("rx", 2);

  // Mini x-axis tick marks along the bottom of the context strip
  ctxG.append("g")
    .attr("class", "axis")
    .attr("transform", "translate(0," + ctxH + ")")
    .call(d3.axisBottom(xScale).tickFormat(d3.format("d")).ticks(8).tickSize(3));

  // Label showing the currently brushed year range
  var brushLabel = svg.append("text")
    .attr("x", margin.left + iW / 2)
    .attr("y", ctxY - 4)
    .attr("text-anchor", "middle")
    .attr("fill", "#555").attr("font-size", "9px")
    .text("Drag below to select year range \u2014 filters the bar chart");

  // brushX: user drags horizontally to select a contiguous year window
  var brush = d3.brushX()
    .extent([[0, 0], [iW, ctxH]])
    .on("brush end", function() {
      var sel = d3.event.selection;
      if (!sel) {
        // cleared brush reset to full dataset range
        brushLabel.text("Drag below to select year range \u2014 filters the bar chart");
        if (state.onBrush) state.onBrush([1970, 2017]);
        return;
      }
      var y0 = Math.round(xScale.invert(sel[0]));
      var y1 = Math.round(xScale.invert(sel[1]));
      // Update label to reflect the active selection
      brushLabel.text(y0 + " \u2013 " + y1);
      if (state.onBrush) state.onBrush([y0, y1]);
    });

  // Brush group rendered inside the context strip
  ctxG.append("g").attr("class", "brush").call(brush);

  // Animates stream paths from old shape to new shape via d3.transition

  function update(newRows, regionName) {
    var newStacked = computeStack(newRows);
    // Transition each stream band to its new area shape
    streamPaths.data(newStacked)
      .transition()
      .duration(700)
      .ease(d3.easeCubicInOut)
      .attr("d", area);

    d3.select("#stream-title").text(
      regionName
        ? "Attack Methods: " + regionName + " \u2013 Focus"
        : "Attack Methods Over Time \u2013 Focus"
    );
  }

  var state = { onBrush: null, update: update };
  return state;
}


// Shows casualties (killed + wounded) per region.
// Animated transition: bars grow/shrink when year range or region changes.

function drawBar(initialData) {
  var panel = document.getElementById("bar-panel");
  var W = panel.clientWidth;
  var H = panel.clientHeight;

  var margin = { top: 28, right: 24, bottom: 36, left: 205 };
  var iW = W - margin.left - margin.right;
  var iH = H - margin.top - margin.bottom;

  // Root SVG element for the bar chart
  var svg = d3.select("#bar-svg");
  var g   = svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  // Band scale assigns one horizontal slot per region
  var yScale = d3.scaleBand()
    .domain(initialData.map(function(d) { return d.region; }))
    .range([0, iH])
    .paddingInner(0.22)
    .paddingOuter(0.08);

  // Linear by scale from 0 to the maximum total casualties across all regions
  var xMax = d3.max(initialData, function(d) { return d.killed + d.wounded; }) || 1;
  var xScale = d3.scaleLinear()
    .domain([0, xMax])
    .range([0, iW])
    .nice();

  // Stack splits each region bar into a "killed" segment and a "wounded" segment
  var stackGen = d3.stack().keys(["killed", "wounded"]);
  var stacked  = stackGen(initialData);

  var barColors = { killed: "#e05c5c", wounded: "#f4a261" };
  var barLabels = { killed: "Killed",  wounded: "Wounded"  };

  // Vertical grid lines drawn behind the bars for readability
  var gridG = g.append("g").attr("class", "grid");
  gridG.call(d3.axisBottom(xScale).ticks(6).tickSize(iH).tickFormat(""))
    .select(".domain").remove();

  // One group per casualty type, fill is set at group level
  var barGroups = g.selectAll(".bar-layer")
    .data(stacked)
    .enter()
    .append("g")
    .attr("class", "bar-layer")
    .attr("fill", function(d) { return barColors[d.key]; });

  // One <rect> per region by casualty type
  var rects = barGroups.selectAll("rect")
    .data(function(d) { return d; })
    .enter()
    .append("rect")
    .attr("y",      function(d) { return yScale(d.data.region); })
    .attr("x",      function(d) { return xScale(d[0]); })
    .attr("width",  function(d) { return Math.max(0, xScale(d[1]) - xScale(d[0])); })
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
      // Highlight the hovered region's bars, keep others at base opacity
      rects.attr("opacity", function(r) {
        return r.data.region === d.data.region ? 1 : 0.85;
      });
    })
    .on("mousemove", function() { moveTip(d3.event); })
    .on("mouseout", function() {
      hideTip();
      rects.attr("opacity", 0.85);
    });

  // Y axis with region name labels
  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(yScale).tickSize(0))
    .select(".domain").remove();
  g.selectAll(".axis text")
    .attr("fill", "#999").attr("font-size", "10px").attr("dx", "-4");

  // X axis with formatted casualty count ticks
  var xAxisG = g.append("g")
    .attr("class", "axis x-axis")
    .attr("transform", "translate(0," + iH + ")")
    .call(d3.axisBottom(xScale).ticks(6).tickFormat(d3.format(".2s")));

  // X axis label
  g.append("text")
    .attr("class", "axis-label")
    .attr("x", iW / 2).attr("y", iH + 30)
    .attr("text-anchor", "middle")
    .text("Total Casualties (Killed + Wounded)");

  // Killed/Wounded legend group
  var lgG = g.append("g").attr("transform", "translate(" + (iW - 110) + ",-18)");
  ["killed", "wounded"].forEach(function(key, i) {
    var row = lgG.append("g").attr("transform", "translate(" + (i * 65) + ",0)");
    // Colored swatch for this casualty type
    row.append("rect").attr("width", 10).attr("height", 10).attr("rx", 2)
      .attr("fill", barColors[key]);
    // Casualty type label
    row.append("text").attr("x", 14).attr("y", 9)
      .attr("fill", "#999").attr("font-size", "9px")
      .text(barLabels[key]);
  });

  // called whenever the year range brush or region selection changes.
  // Transitions bar widths and x-axis to match the new data slice.

  function update(newData, highlightRegion) {
    var newXMax = d3.max(newData, function(d) { return d.killed + d.wounded; }) || 1;
    xScale.domain([0, newXMax]).nice();

    var newStacked = stackGen(newData);

    // Redraw grid lines to match the updated x scale
    gridG.call(d3.axisBottom(xScale).ticks(6).tickSize(iH).tickFormat(""))
      .select(".domain").remove();

    // Transition bar segments to their new positions and widths
    g.selectAll(".bar-layer")
      .data(newStacked)
      .selectAll("rect")
      .data(function(d) { return d; })
      .transition()
      .duration(600)
      .ease(d3.easeCubicInOut)
      .attr("x",      function(d) { return xScale(d[0]); })
      .attr("width",  function(d) { return Math.max(0, xScale(d[1]) - xScale(d[0])); })
      .attr("opacity", function(d) {
        if (!highlightRegion) return 0.85;
        return d.data.region === highlightRegion ? 1 : 0.12;
      });

    // Animate x axis tick marks to the new scale
    xAxisG.transition()
      .duration(600)
      .call(d3.axisBottom(xScale).ticks(6).tickFormat(d3.format(".2s")));

    // highlights the selected region's y axis label in gold
    g.selectAll(".axis text").attr("fill", function(d) {
      if (!highlightRegion) return "#999";
      return d === highlightRegion ? "#f0d060" : "#444";
    });

    d3.select("#bar-title").text(
      highlightRegion
        ? "Casualties: " + highlightRegion + " \u2013 Focus"
        : "Casualties by Region \u2013 Focus"
    );
  }

  return { update: update };
}
