/* 
    AI disclosure: ChatGPT was used to help recall D3 syntax, debug errors, and 
    draft portions of the layout and position logic for all displays, though ChatGPT
    was used more for the alluvial display due to the more complex layout logic.
    I reviewed, adapted, and integrated the code myself.
*/

const width = window.innerWidth;
const height = window.innerHeight;

let svg = d3.select("svg");
if (svg.empty()) {
    svg = d3.select("body").append("svg");
}

svg
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`);

svg.selectAll("*").remove();

d3.select("body")
    .style("margin", "0")
    .style("font-family", "Arial, sans-serif")
    .style("background", "#f7f7f7")
    .style("overflow", "hidden");

const COL = {
    gender: "Choose your gender",
    age: "Age",
    course: "What is your course?",
    year: "Your current year of Study",
    cgpa: "What is your CGPA?",
    marital: "Marital status",
    depression: "Do you have Depression?",
    anxiety: "Do you have Anxiety?",
    panic: "Do you have Panic attack?",
    treatment: "Did you seek any specialist for a treatment?"
};

const yearOrder = ["Year 1", "Year 2", "Year 3", "Year 4"];
const symptomOrder = [0, 1, 2, 3];
const treatmentOrder = ["No treatment", "Sought treatment"];

const burdenLabels = {
    0: "No symptoms",
    1: "1 symptom",
    2: "2 symptoms",
    3: "3 symptoms"
};

const burdenColors = {
    0: "#d7ede2",
    1: "#8ac7a4",
    2: "#f2b36d",
    3: "#cf5c36"
};

const indicatorColors = {
    depression: "#6b5b95",
    anxiety: "#2a9d8f",
    panic: "#e76f51",
    treatment: "#264653"
};

const textColor = "#222";
const mutedText = "#666";
const panelColor = "#ffffff";
const gridColor = "#e7e7e7";

const outerMargin = 18;
const gap = 18;
const headerHeight = 58;

const availableWidth = width - outerMargin * 2 - gap;
const leftWidth = Math.floor(availableWidth * 0.64);
const rightWidth = availableWidth - leftWidth;
const usableHeight = height - headerHeight - outerMargin;

const donutHeight = Math.floor(usableHeight * 0.42);
const lineHeight = usableHeight - donutHeight - gap;

const flowPanel = {
    x: outerMargin,
    y: headerHeight,
    width: leftWidth,
    height: usableHeight
};

const donutPanel = {
    x: outerMargin + leftWidth + gap,
    y: headerHeight,
    width: rightWidth,
    height: donutHeight
};

const linePanel = {
    x: outerMargin + leftWidth + gap,
    y: headerHeight + donutHeight + gap,
    width: rightWidth,
    height: lineHeight
};

function normalizeYear(value) {
    const match = String(value || "").match(/\d/);
    return match ? `Year ${match[0]}` : "Unknown";
}

function yesNo(value) {
    return String(value || "").trim().toLowerCase() === "yes" ? 1 : 0;
}

function addPanel(panel, title) {
    const g = svg.append("g")
        .attr("transform", `translate(${panel.x},${panel.y})`);

    // Creates white rounded background that separates this view from rest of the dashboard
    g.append("rect")
        .attr("width", panel.width)
        .attr("height", panel.height)
        .attr("rx", 10)
        .attr("fill", panelColor)
        .attr("stroke", "#dddddd");

    // Adds chart title
    g.append("text")
        .attr("x", 16)
        .attr("y", 25)
        .attr("font-size", 16)
        .attr("font-weight", 700)
        .attr("fill", textColor)
        .text(title);

    return g;
}

function addAxisLabel(g, label, x, y, rotate) {
    // Labels axis so the quantitative or categorical encoding is explicit
    g.append("text")
        .attr("x", x)
        .attr("y", y)
        .attr("text-anchor", "middle")
        .attr("font-size", 11)
        .attr("fill", mutedText)
        .attr("transform", rotate ? `rotate(${rotate},${x},${y})` : null)
        .text(label);
}

function drawBurdenLegend(g, x, y, vertical) {
    // Names color legend, used by alluvial and donut views
    g.append("text")
        .attr("x", x)
        .attr("y", y - 8)
        .attr("font-size", 11)
        .attr("font-weight", 700)
        .attr("fill", mutedText)
        .text("Symptom burden");

    const items = g.selectAll(".burden-legend")
        .data(symptomOrder)
        .enter()
        .append("g")
        .attr("class", "burden-legend")
        .attr("transform", function(d, i) {
            return vertical
                ? `translate(${x},${y + i * 20})`
                : `translate(${x + i * 92},${y})`;
        });

    // Color swatches show the categorical encoding for 0, 1, 2, or 3 reported symptoms
    items.append("rect")
        .attr("width", 13)
        .attr("height", 13)
        .attr("rx", 2)
        .attr("fill", d => burdenColors[d])
        .attr("stroke", "#555")
        .attr("stroke-width", 0.4);

    // Labels each color swatch with its symptom-burden category
    items.append("text")
        .attr("x", 18)
        .attr("y", 11)
        .attr("font-size", 11)
        .attr("fill", textColor)
        .text(d => burdenLabels[d]);
}

function drawDashboard(data) {
    // Fills page background, helps dashboard panels pop out
    svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "#f7f7f7")
        .lower();

    // Dashboard title identifies dataset and overall display
    svg.append("text")
        .attr("x", outerMargin)
        .attr("y", 27)
        .attr("font-size", 22)
        .attr("font-weight", 800)
        .attr("fill", textColor)
        .text("Student Mental Health Survey Dashboard");

    // Dashboard design rationale
    svg.append("text")
        .attr("x", outerMargin)
        .attr("y", 47)
        .attr("font-size", 12)
        .attr("fill", mutedText)
        .text("This dashboard explores how academic year relates to mental-health symptom burden and treatment-seeking.");

    // Actual visualizations
    drawAlluvial(data);
    drawDonut(data);
    drawLineChart(data);
}

/*
    Rationale: shows the relationship between multiple categorical variables in one place. Useful for insights like whether
    certain years contribute more to certain burden levels.
*/
function drawAlluvial(data) {
    const panel = addPanel(
        flowPanel,
        "Focus view: academic year → symptom burden → treatment"
    );

    const margin = { top: 120, right: 34, bottom: 38, left: 42 };
    const innerWidth = flowPanel.width - margin.left - margin.right;
    const innerHeight = flowPanel.height - margin.top - margin.bottom;

    const g = panel.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const layers = [
        { key: "year", title: "Year of Study", values: yearOrder, value: d => d.year, label: d => d },
        { key: "symptoms", title: "Symptom Burden", values: symptomOrder, value: d => d.symptomScore, label: d => burdenLabels[d] },
        { key: "treatment", title: "Treatment", values: treatmentOrder, value: d => d.treatmentLabel, label: d => d }
    ];

    const layout = makeAlluvialLayout(data, layers, innerWidth, innerHeight);

    // Labels each vertical stage of the alluvial flow
    g.selectAll(".layer-title")
        .data(layers)
        .enter()
        .append("text")
        .attr("class", "layer-title")
        .attr("x", d => layout.xByLayer[d.key])
        .attr("y", -18)
        .attr("text-anchor", "middle")
        .attr("font-size", 12)
        .attr("font-weight", 700)
        .attr("fill", mutedText)
        .text(d => d.title);

    // Curved ribbons connect categories, thickness represents number of students in path
    const links = g.selectAll(".flow-link")
        .data(layout.links)
        .enter()
        .append("path")
        .attr("class", "flow-link")
        .attr("d", alluvialPath)
        .attr("fill", "none")
        .attr("stroke", d => burdenColors[d.symptomScore])
        .attr("stroke-width", d => Math.max(1, d.width))
        .attr("stroke-opacity", 0.45)
        .attr("stroke-linecap", "butt");

    const nodes = g.selectAll(".flow-node")
        .data(layout.nodes)
        .enter()
        .append("g")
        .attr("class", "flow-node")
        .attr("transform", d => `translate(${d.x0},${d.y0})`);

    // Node blocks represent category totals at each stage of alluvial flow.
    nodes.append("rect")
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => Math.max(2, d.y1 - d.y0))
        .attr("rx", 3)
        .attr("fill", d => d.layerKey === "symptoms" ? burdenColors[d.rawValue] : "#dfe5ec")
        .attr("stroke", "#444")
        .attr("stroke-width", 0.8);

    // Node labels show category name and total number of students in category
    nodes.append("text")
        .attr("x", d => d.layerIndex === 2 ? -8 : 20)
        .attr("y", d => Math.max(10, (d.y1 - d.y0) / 2 + 4))
        .attr("text-anchor", d => d.layerIndex === 2 ? "end" : "start")
        .attr("font-size", 11)
        .attr("fill", textColor)
        .text(d => `${d.label} (${d.value})`);

    drawBurdenLegend(panel, 18, 63, false);
}

function makeAlluvialLayout(data, layers, innerWidth, innerHeight) {
    const nodeWidth = 14;
    const nodePadding = 18;

    const x = d3.scalePoint()
        .domain(layers.map(d => d.key))
        .range([0, innerWidth - nodeWidth])
        .padding(0.04);

    const maxLayerCount = d3.max(layers, layer => layer.values.length);
    const k = (innerHeight - nodePadding * (maxLayerCount - 1)) / data.length;

    const nodes = [];
    const nodesById = new Map();

    layers.forEach((layer, layerIndex) => {
        const layerNodes = [];

        layer.values.forEach(value => {
            const students = data.filter(d => layer.value(d) === value);
            if (students.length === 0) return;

            const node = {
                id: `${layer.key}:${value}`,
                layerKey: layer.key,
                layerIndex: layerIndex,
                rawValue: value,
                label: layer.label(value),
                value: students.length,
                x0: x(layer.key),
                x1: x(layer.key) + nodeWidth,
                y0: 0,
                y1: 0,
                inOffset: 0,
                outOffset: 0,
                order: layer.values.indexOf(value)
            };

            nodes.push(node);
            layerNodes.push(node);
            nodesById.set(node.id, node);
        });

        const layerHeight = d3.sum(layerNodes, d => d.value * k) + nodePadding * (layerNodes.length - 1);
        let y = (innerHeight - layerHeight) / 2;

        layerNodes.forEach(node => {
            node.y0 = y;
            node.y1 = y + node.value * k;
            y = node.y1 + nodePadding;
        });
    });

    const links = [];

    for (let i = 0; i < layers.length - 1; i++) {
        const sourceLayer = layers[i];
        const targetLayer = layers[i + 1];
        const grouped = {};

        data.forEach(student => {
            const sourceValue = sourceLayer.value(student);
            const targetValue = targetLayer.value(student);
            const key = `${sourceValue}|${targetValue}`;

            if (!grouped[key]) {
                grouped[key] = {
                    sourceValue: sourceValue,
                    targetValue: targetValue,
                    count: 0
                };
            }

            grouped[key].count += 1;
        });

        Object.keys(grouped).forEach(key => {
            const group = grouped[key];
            const source = nodesById.get(`${sourceLayer.key}:${group.sourceValue}`);
            const target = nodesById.get(`${targetLayer.key}:${group.targetValue}`);

            if (!source || !target) return;

            links.push({
                source: source,
                target: target,
                value: group.count,
                width: group.count * k,
                stage: i,
                symptomScore: targetLayer.key === "symptoms" ? group.targetValue : group.sourceValue
            });
        });
    }

    assignAlluvialOffsets(links, k);

    return {
        nodes: nodes,
        links: links,
        xByLayer: Object.fromEntries(layers.map(layer => [layer.key, x(layer.key) + nodeWidth / 2]))
    };
}

function assignAlluvialOffsets(links, k) {
    const linksByStage = {};

    links.forEach(link => {
        if (!linksByStage[link.stage]) linksByStage[link.stage] = [];
        linksByStage[link.stage].push(link);
    });

    Object.keys(linksByStage).forEach(stage => {
        const stageLinks = linksByStage[stage];
        const bySource = {};
        const byTarget = {};

        stageLinks.forEach(link => {
            if (!bySource[link.source.id]) bySource[link.source.id] = [];
            if (!byTarget[link.target.id]) byTarget[link.target.id] = [];

            bySource[link.source.id].push(link);
            byTarget[link.target.id].push(link);
        });

        Object.keys(bySource).forEach(sourceId => {
            const sourceLinks = bySource[sourceId];
            sourceLinks.sort((a, b) => a.target.order - b.target.order);

            sourceLinks.forEach(link => {
                link.sy0 = link.source.y0 + link.source.outOffset;
                link.sy1 = link.sy0 + link.value * k;
                link.source.outOffset += link.value * k;
            });
        });

        Object.keys(byTarget).forEach(targetId => {
            const targetLinks = byTarget[targetId];
            targetLinks.sort((a, b) => a.source.order - b.source.order);

            targetLinks.forEach(link => {
                link.ty0 = link.target.y0 + link.target.inOffset;
                link.ty1 = link.ty0 + link.value * k;
                link.target.inOffset += link.value * k;
            });
        });
    });
}

function alluvialPath(d) {
    const x0 = d.source.x1;
    const x1 = d.target.x0;
    const y0 = (d.sy0 + d.sy1) / 2;
    const y1 = (d.ty0 + d.ty1) / 2;
    const midX = (x0 + x1) / 2;

    return `M${x0},${y0} C${midX},${y0} ${midX},${y1} ${x1},${y1}`;
}

/*
    Rationale: an overview, summarizes the dataset by demonstrating the overall distribution of symptom burden.
    It helps the user understand the general makeup of the survey before looking at more detailed views.
*/
function drawDonut(data) {
    const panel = addPanel(
        donutPanel,
        "Overview: symptom burden distribution"
    );

    const counts = symptomOrder.map(score => {
        return {
            score: score,
            label: burdenLabels[score],
            value: data.filter(d => d.symptomScore === score).length
        };
    });

    const radius = Math.min(donutPanel.width, donutPanel.height) * 0.24;
    const centerX = donutPanel.width * 0.38;
    const centerY = donutPanel.height * 0.58;

    const pie = d3.pie()
        .sort(null)
        .value(d => d.value);

    const arc = d3.arc()
        .innerRadius(radius * 0.58)
        .outerRadius(radius);

    const labelArc = d3.arc()
        .innerRadius(radius * 1.16)
        .outerRadius(radius * 1.16);

    const g = panel.append("g")
        .attr("transform", `translate(${centerX},${centerY})`);

    // Donut slices show overall proportion of students in each symptom-burden category
    const slices = g.selectAll(".donut-slice")
        .data(pie(counts))
        .enter()
        .append("path")
        .attr("class", "donut-slice")
        .attr("d", arc)
        .attr("fill", d => burdenColors[d.data.score])
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 1.5);

    // Center label gives total sample size for overview chart
    g.append("text")
        .attr("text-anchor", "middle")
        .attr("y", -2)
        .attr("font-size", 24)
        .attr("font-weight", 800)
        .attr("fill", textColor)
        .text(data.length);

    // Clarifies center number is number of survey respondents
    g.append("text")
        .attr("text-anchor", "middle")
        .attr("y", 17)
        .attr("font-size", 11)
        .attr("fill", mutedText)
        .text("students");

    // Outside labels show percentage values for easy reading
    g.selectAll(".donut-label")
        .data(pie(counts).filter(d => d.data.value > 0))
        .enter()
        .append("text")
        .attr("class", "donut-label")
        .attr("transform", d => `translate(${labelArc.centroid(d)})`)
        .attr("text-anchor", d => (d.startAngle + d.endAngle) / 2 > Math.PI ? "end" : "start")
        .attr("font-size", 10)
        .attr("fill", textColor)
        .text(d => d3.format(".0%")(d.data.value / data.length));

    drawBurdenLegend(panel, donutPanel.width - 142, 76, true);
}

/*
    Rationale: shows how specific indicators vary by academic year. The line chart looks at indicators individually instead of
    as an aggregate.
*/
function drawLineChart(data) {
    const panel = addPanel(
        linePanel,
        "Context view: mental-health indicators by year of study"
    );

    const margin = { top: 84, right: 140, bottom: 54, left: 64 };
    const innerWidth = linePanel.width - margin.left - margin.right;
    const innerHeight = linePanel.height - margin.top - margin.bottom;

    const g = panel.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const yearData = yearOrder.map(year => {
        const students = data.filter(d => d.year === year);
        const n = students.length;

        return {
            year: year,
            depression: n ? d3.mean(students, d => d.depression) : 0,
            anxiety: n ? d3.mean(students, d => d.anxiety) : 0,
            panic: n ? d3.mean(students, d => d.panic) : 0,
            treatment: n ? d3.mean(students, d => d.treatment) : 0
        };
    });

    const indicators = [
        { key: "depression", label: "Depression" },
        { key: "anxiety", label: "Anxiety" },
        { key: "panic", label: "Panic attack" },
        { key: "treatment", label: "Sought treatment" }
    ];

    const lineData = indicators.map(indicator => {
        return {
            key: indicator.key,
            label: indicator.label,
            values: yearData.map(d => {
                return {
                    year: d.year,
                    value: d[indicator.key]
                };
            })
        };
    });

    const x = d3.scalePoint()
        .domain(yearOrder)
        .range([0, innerWidth])
        .padding(0.35);

    const y = d3.scaleLinear()
        .domain([0, 1])
        .range([innerHeight, 0]);

    const line = d3.line()
        .x(d => x(d.year))
        .y(d => y(d.value));

    // Horizontal gridlines make percentage comparisons easier across years
    g.append("g")
        .attr("class", "y-grid")
        .call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(""))
        .selectAll("line")
        .attr("stroke", gridColor);

    g.select(".y-grid path").remove();

    // x-axis lists the ordered academic year categories
    g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("font-size", 10);

    // y-axis shows the share of students as percentages
    g.append("g")
        .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(".0%")))
        .selectAll("text")
        .attr("font-size", 10);

    // Each line shows how one mental-health indicator varies across year of study
    const lines = g.selectAll(".indicator-line")
        .data(lineData)
        .enter()
        .append("path")
        .attr("class", "indicator-line")
        .attr("d", d => line(d.values))
        .attr("fill", "none")
        .attr("stroke", d => indicatorColors[d.key])
        .attr("stroke-width", 2.4);

    const pointGroups = g.selectAll(".indicator-points")
        .data(lineData)
        .enter()
        .append("g")
        .attr("class", "indicator-points")
        .attr("fill", d => indicatorColors[d.key]);

    // Points mark the exact year-level rate on each indicator line
    const points = pointGroups.selectAll("circle")
        .data(d => d.values.map(v => {
            return {
                key: d.key,
                label: d.label,
                year: v.year,
                value: v.value
            };
        }))
        .enter()
        .append("circle")
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d.value))
        .attr("r", 4.2)
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 1);

    // Provide the exact percentage for each line-chart point
    points.append("title")
        .text(d => `${d.label}, ${d.year}: ${d3.format(".0%")(d.value)}`);

    addAxisLabel(panel, "Year of study", margin.left + innerWidth / 2, linePanel.height - 15);
    addAxisLabel(panel, "Share of students", 18, margin.top + innerHeight / 2, -90);

    drawIndicatorLegend(panel, linePanel.width - 130, 82);
}

function drawIndicatorLegend(g, x, y) {
    const indicators = [
        { key: "depression", label: "Depression" },
        { key: "anxiety", label: "Anxiety" },
        { key: "panic", label: "Panic attack" },
        { key: "treatment", label: "Sought treatment" }
    ];

    // Names line-chart legend so users know colors refer to indicators
    g.append("text")
        .attr("x", x)
        .attr("y", y - 8)
        .attr("font-size", 11)
        .attr("font-weight", 700)
        .attr("fill", mutedText)
        .text("Indicator");

    const items = g.selectAll(".indicator-legend")
        .data(indicators)
        .enter()
        .append("g")
        .attr("class", "indicator-legend")
        .attr("transform", (d, i) => `translate(${x},${y + i * 22})`);

    // Legend samples match visual mark used for each indicator in chart
    items.append("line")
        .attr("x1", 0)
        .attr("x2", 24)
        .attr("y1", 7)
        .attr("y2", 7)
        .attr("stroke", d => indicatorColors[d.key])
        .attr("stroke-width", 2.4);

    // Legend point samples match dots used on line chart
    items.append("circle")
        .attr("cx", 12)
        .attr("cy", 7)
        .attr("r", 4)
        .attr("fill", d => indicatorColors[d.key])
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 1);

    // Labels each line-chart indicator.
    items.append("text")
        .attr("x", 31)
        .attr("y", 11)
        .attr("font-size", 11)
        .attr("fill", textColor)
        .text(d => d.label);
}

d3.csv("Student Mental health.csv").then(rawData => {
    const ages = rawData
        .map(d => Number(d[COL.age]))
        .filter(d => !isNaN(d));

    const medianAge = d3.median(ages);

    // Preprocessing data
    const data = rawData.map((d, i) => {
        const year = normalizeYear(d[COL.year]);
        const depression = yesNo(d[COL.depression]);
        const anxiety = yesNo(d[COL.anxiety]);
        const panic = yesNo(d[COL.panic]);
        const treatment = yesNo(d[COL.treatment]);
        const age = Number(d[COL.age]);
        const symptomScore = depression + anxiety + panic;

        return {
            id: i,
            age: isNaN(age) ? medianAge : age,
            gender: String(d[COL.gender] || "Unknown").trim(),
            course: String(d[COL.course] || "Unknown").trim(),
            year: year,
            depression: depression,
            anxiety: anxiety,
            panic: panic,
            treatment: treatment,
            symptomScore: symptomScore,
            treatmentLabel: treatment ? "Sought treatment" : "No treatment"
        };
    }).filter(d =>
        yearOrder.indexOf(d.year) >= 0 &&
        !isNaN(d.age)
    );

    drawDashboard(data);
})

// Handle window resize
let resizeTimer;

window.addEventListener("resize", function() {
    clearTimeout(resizeTimer);

    resizeTimer = setTimeout(function() {
        location.reload();
    }, 250);
});