const numericColumns = [
  "age",
  "Medu",
  "Fedu",
  "traveltime",
  "studytime",
  "failures",
  "famrel",
  "freetime",
  "goout",
  "Dalc",
  "Walc",
  "health",
  "absences",
  "G1",
  "G2",
  "G3"
];


const state = {
  selectedStudytime: null,
  selectedWalc: null,
  brushedIds: new Set(),
  brushDomain: null,
  scatterZoom: d3.zoomIdentity
};

const studyTimeSteps = [1, 2, 3, 4];
const weekendAlcoholSteps = [1, 2, 3, 4, 5];

const studyTimeNames = new Map([
  [1, "<2h"],
  [2, "2-5h"],
  [3, "5-10h"],
  [4, ">10h"]
]);

const weekendAlcoholNames = new Map([
  [1, "Very low"],
  [2, "Low"],
  [3, "Moderate"],
  [4, "High"],
  [5, "Very high"]
]);

const courseColors = new Map([
  ["Math", "#3b82f6"],
  ["Portuguese", "#8b5cf6"]
]);

const absenceDisplayLimit = 30;
const focusMotionTime = 520;
const focusMotionEase = d3.easeCubicOut;

loadData();

function parseStudentRow(row, course, index) {
  const parsed = {
    ...row,
    course,
    id: `${course}-${index}`
  };

  numericColumns.forEach(column => {
    parsed[column] = Number(row[column]);
  });

  return parsed;
}

// loads data 
function loadData() {
  Promise.all([
    d3.csv("data/student-mat.csv", (row, index) => parseStudentRow(row, "Math", index)),
    d3.csv("data/student-por.csv", (row, index) => parseStudentRow(row, "Portuguese", index))
  ])
    .then(([mathData, portugueseData]) => {
      const data = [...mathData, ...portugueseData];

      prepareResetControl(data);
      drawDashboard(data);
    })
    .catch(error => {
      console.error("Failed to load student datasets", error);
    });
}

function drawDashboard(data) {
  paintStudyAlcoholMap(data);
  paintOutcomeField(data);
  traceStudentProfiles(data);
}

// shares the flitering animations for the whole dashboard when focus changes
function startFocusMotion(selection, delay = 0) {
  return selection
    .transition()
    .duration(focusMotionTime)
    .delay(delay)
    .ease(focusMotionEase);
}

function canResetView() {
  return hasFocusGroup() || hasScatterBrush() || hasScatterZoom();
}

function updateResetButton() {
  d3.select("#reset-focus")
    .property("disabled", !canResetView());
}

function redrawAfterFocusChange(data) {
  // updating the status message and reset button and all the three charts when focusing happens
  d3.select("#focus-note")
    .text(describeFocusGroup(data));

  updateResetButton();

  drawDashboard(data);
}

function prepareResetControl(data) {
  // setting up reset button functionality so it returns to original view
  d3.select("#reset-focus")
    .property("disabled", !canResetView())
    .on("click", () => {
      updateSelection({
        studytime: null,
        Walc: null
      });
      clearScatterBrush();
      resetScatterZoom();

      redrawAfterFocusChange(data);
    });
}

function measureChartFrame(frameSelector, fallbackWidth, fallbackHeight) {
  const frame = document.querySelector(frameSelector);
  const bounds = frame.getBoundingClientRect();

  return {
    width: Math.max(bounds.width || fallbackWidth, fallbackWidth),
    height: Math.max(bounds.height || fallbackHeight, fallbackHeight)
  };
}

function shapeStudyAlcoholCells(data) {
  const groupedStudents = d3.rollup(
    data,
    rows => ({
      count: rows.length,
      avgFinalGrade: d3.mean(rows, d => d.G3)
    }),
    d => d.studytime,
    d => d.Walc
  );

  return studyTimeSteps.flatMap(studytime => weekendAlcoholSteps.map(Walc => {
    const cell = groupedStudents.get(studytime)?.get(Walc);

    return {
      studytime,
      Walc,
      key: `study-${studytime}-weekend-${Walc}`,
      count: cell?.count ?? 0,
      avgFinalGrade: cell?.avgFinalGrade ?? null
    };
  }));
}

function isCurrentFocus(cell) {
  return state.selectedStudytime === cell.studytime && state.selectedWalc === cell.Walc;
}

function hasFocusGroup() {
  return state.selectedStudytime !== null && state.selectedWalc !== null;
}

function hasScatterBrush() {
  return state.brushedIds.size > 0;
}

function hasScatterZoom() {
  return state.scatterZoom.k !== 1 || Math.abs(state.scatterZoom.x) > 0.5 || Math.abs(state.scatterZoom.y) > 0.5;
}

function clearScatterBrush() {
  state.brushedIds = new Set();
  state.brushDomain = null;
}

function resetScatterZoom() {
  state.scatterZoom = d3.zoomIdentity;
}

function isStudentInHeatmapFocus(student) {
  if (!hasFocusGroup()) return true;

  return student.studytime === state.selectedStudytime && student.Walc === state.selectedWalc;
}

function isStudentInFocus(student) {
  if (hasScatterBrush()) {
    return state.brushedIds.has(student.id);
  }

  if (!hasFocusGroup()) return true;

  return isStudentInHeatmapFocus(student);
}

function describeFocusGroup(data) {
  if (hasScatterBrush()) {
    const brushCount = state.brushedIds.size;

    if (hasFocusGroup()) {
      return `Brushed: ${brushCount} records inside ${studyTimeNames.get(state.selectedStudytime)} study and ${weekendAlcoholNames.get(state.selectedWalc)} weekend alcohol.`;
    }

    return `Brushed: ${brushCount} student-course records from the scatterplot.`;
  }

  if (!hasFocusGroup()) {
    return "Please click a heatmap cell or drag across the scatterplot to focus a student group.";
  }

  const focusCount = data.filter(d => (
    d.studytime === state.selectedStudytime && d.Walc === state.selectedWalc
  )).length;

  return `Focused: ${studyTimeNames.get(state.selectedStudytime)} study, ${weekendAlcoholNames.get(state.selectedWalc)} weekend alcohol (${focusCount} records).`;
}

// creates the heatmap overview 
function paintStudyAlcoholMap(data) {
  const svg = d3.select("#heatmap-chart svg");
  const mapBox = measureChartFrame("#heatmap-chart", 420, 260);
  const mapMargins = { top: 28, right: 96, bottom: 54, left: 78 };
  const mapWidth = mapBox.width - mapMargins.left - mapMargins.right;
  const mapHeight = mapBox.height - mapMargins.top - mapMargins.bottom;
  const wellnessCells = shapeStudyAlcoholCells(data);
  const filledCells = wellnessCells.filter(d => d.count > 0);
  const gradeExtent = d3.extent(filledCells, d => d.avgFinalGrade);
  const gradeMiddle = d3.mean(gradeExtent);
  const gradeGlow = d3.scaleLinear()
    .domain([gradeExtent[0], gradeMiddle, gradeExtent[1]])
    .range(["#e76f51", "#e9c46a", "#2a9d8f"])
    .interpolate(d3.interpolateRgb);
  const xStudy = d3.scaleBand()
    .domain(studyTimeSteps)
    .range([0, mapWidth])
    .padding(0.08);
  const yWeekend = d3.scaleBand()
    .domain([...weekendAlcoholSteps].reverse())
    .range([0, mapHeight])
    .padding(0.08);
  const heatCellOpacity = d => d.count ? 1 : 0.55;
  const heatCellStrokeWidth = d => isCurrentFocus(d) ? 3 : 1;

  // helps clear all the prviously created heat map elements before we create the responsive overview
  svg.selectAll("*").remove();

  svg
    .attr("viewBox", `0 0 ${mapBox.width} ${mapBox.height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  // creating a group specifically for the heatmap so it has enough space for its axes, labels, and legend
  const mapRoot = svg.append("g")
    .attr("transform", `translate(${mapMargins.left},${mapMargins.top})`);

  // creating the heatmap cells where each cell is studytime related to weekend alc use
  mapRoot.append("g")
    .attr("class", "wellness-cell-layer")
    .selectAll("rect")
    .data(wellnessCells, d => d.key)
    .join("rect")
    .attr("x", d => xStudy(d.studytime))
    .attr("y", d => yWeekend(d.Walc))
    .attr("width", xStudy.bandwidth())
    .attr("height", yWeekend.bandwidth())
    .attr("rx", 6)
    .attr("fill", d => d.count ? gradeGlow(d.avgFinalGrade) : "#eef2f7")
    .attr("stroke", d => isCurrentFocus(d) ? "#111827" : "#ffffff")
    .attr("stroke-width", 1)
    .attr("cursor", d => d.count ? "pointer" : "default")
    .attr("opacity", 0)
    .on("click", (event, d) => {
      if (!d.count) return;

      updateSelection({
        studytime: isCurrentFocus(d) ? null : d.studytime,
        Walc: isCurrentFocus(d) ? null : d.Walc
      });

      redrawAfterFocusChange(data);
    })
    .call(cells => startFocusMotion(cells)
      .attr("opacity", heatCellOpacity)
      .attr("stroke-width", heatCellStrokeWidth));

  // adding in labels inside populated heatmap cells for average grade and group size.
  const cellLabelGroups = mapRoot.append("g")
    .attr("class", "wellness-cell-labels")
    .selectAll("g")
    .data(filledCells, d => d.key)
    .join("g")
    .attr("transform", d => `translate(${xStudy(d.studytime) + xStudy.bandwidth() / 2},${yWeekend(d.Walc) + yWeekend.bandwidth() / 2})`)
    .attr("pointer-events", "none")
    .attr("opacity", 0)
    .call(labels => startFocusMotion(labels, 80)
      .attr("opacity", 1));

  // adding "avgFinalGrade" text into heatmap cells
  cellLabelGroups.append("text")
    .attr("y", -4)
    .attr("text-anchor", "middle")
    .attr("fill", "#1f2933")
    .attr("font-size", 12)
    .attr("font-weight", 700)
    .text(d => d3.format(".1f")(d.avgFinalGrade));

  // adding the text for the student count under the avg grade for each cell
  cellLabelGroups.append("text")
    .attr("y", 12)
    .attr("text-anchor", "middle")
    .attr("fill", "#334e68")
    .attr("font-size", 10)
    .text(d => `${d.count} students`);
  
  // creating the x axis for studytime 
  mapRoot.append("g")
    .attr("transform", `translate(0,${mapHeight})`)
    .call(d3.axisBottom(xStudy).tickFormat(d => studyTimeNames.get(d)).tickSizeOuter(0))
    .call(axisGroup => axisGroup.selectAll("text").attr("font-size", 11))
    .call(axisGroup => axisGroup.selectAll(".domain").attr("stroke", "#b8c4d3"))
    .call(axisGroup => axisGroup.selectAll(".tick line").attr("stroke", "#d9e2ec"));

  // creating the y axis with the weekend alc use and also placing higher consumption higher
  mapRoot.append("g")
    .call(d3.axisLeft(yWeekend).tickFormat(d => weekendAlcoholNames.get(d)).tickSizeOuter(0))
    .call(axisGroup => axisGroup.selectAll("text").attr("font-size", 11))
    .call(axisGroup => axisGroup.selectAll(".domain").attr("stroke", "#b8c4d3"))
    .call(axisGroup => axisGroup.selectAll(".tick line").attr("stroke", "#d9e2ec"));

  // adding the x axis label for the heatmap
  mapRoot.append("text")
    .attr("x", mapWidth / 2)
    .attr("y", mapHeight + 42)
    .attr("text-anchor", "middle")
    .attr("fill", "#52616f")
    .attr("font-size", 12)
    .attr("font-weight", 700)
    .text("Weekly study time");

  // adding the y axis label for the heat map
  mapRoot.append("text")
    .attr("x", -mapHeight / 2)
    .attr("y", -58)
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("fill", "#52616f")
    .attr("font-size", 12)
    .attr("font-weight", 700)
    .text("Weekend alcohol use");

  const legendHeight = Math.min(150, mapHeight);
  const legendWidth = 12;
  const legendSamples = d3.range(24).map(index => {
    const t = index / 23;
    return gradeExtent[1] - t * (gradeExtent[1] - gradeExtent[0]);
  });
  const legendScale = d3.scaleLinear()
    .domain(gradeExtent)
    .range([legendHeight, 0]);
  const legendStep = legendHeight / legendSamples.length;

  // adding the color legend for the heatmap
  const gradeLegend = mapRoot.append("g")
    .attr("transform", `translate(${mapWidth + 28},${Math.max(0, (mapHeight - legendHeight) / 2)})`);

  // adding the stacked type rectangle strructure for the heat map to create the continuous heatmap color form
  gradeLegend.selectAll("rect")
    .data(legendSamples)
    .join("rect")
    .attr("x", 0)
    .attr("y", (d, index) => index * legendStep)
    .attr("width", legendWidth)
    .attr("height", Math.ceil(legendStep))
    .attr("fill", d => gradeGlow(d));

  // adding numbers to the heatmap legend to give it a scale
  gradeLegend.append("g")
    .attr("transform", `translate(${legendWidth},0)`)
    .call(d3.axisRight(legendScale).ticks(4).tickSize(4))
    .call(axisGroup => axisGroup.selectAll("text").attr("font-size", 10))
    .call(axisGroup => axisGroup.selectAll(".domain").remove());

  // adding a title to the heat map legend
  gradeLegend.append("text")
    .attr("x", -4)
    .attr("y", -10)
    .attr("fill", "#52616f")
    .attr("font-size", 10)
    .attr("font-weight", 700)
    .text("Avg final grade");
}

// moving the tooltip near the mouse and fills in data for that particular student
function moveStudentTooltip(event, html) {
  d3.select("#student-tooltip")
    .style("left", `${event.clientX}px`)
    .style("top", `${event.clientY - 10}px`)
    .style("opacity", 1)
    .html(html);
}

// hide the tool tip as soon as cursor leaves the view
function hideStudentTooltip() {
  d3.select("#student-tooltip")
    .style("opacity", 0);
}

// added in jitter so that overlapping data points can still be viewed
function makeTinyStudentJitter(student, salt) {
  const idText = `${student.id}-${salt}`;
  let hash = 0;

  for (let index = 0; index < idText.length; index += 1) {
    hash = (hash * 31 + idText.charCodeAt(index)) % 9973;
  }

  return ((hash / 9973) - 0.5);
}

// creates the focus scatter plot with brushing and zooming and the tooltips
function paintOutcomeField(data) {
  const svg = d3.select("#scatter-chart svg");
  const fieldBox = measureChartFrame("#scatter-chart", 520, 260);
  const fieldMargins = { top: 38, right: 144, bottom: 54, left: 64 };
  const fieldWidth = fieldBox.width - fieldMargins.left - fieldMargins.right;
  const fieldHeight = fieldBox.height - fieldMargins.top - fieldMargins.bottom;
  const displayAbsence = student => Math.min(student.absences, absenceDisplayLimit);
  const xBaseAbsences = d3.scaleLinear()
    .domain([0, absenceDisplayLimit])
    .range([0, fieldWidth]);
  const yBaseGrade = d3.scaleLinear()
    .domain([0, 20])
    .range([fieldHeight, 0]);
  let xAbsences = state.scatterZoom.rescaleX(xBaseAbsences);
  let yGrade = state.scatterZoom.rescaleY(yBaseGrade);
  const jitterWidth = Math.min(3.2, fieldWidth * 0.006);
  const jitterHeight = Math.min(3.2, fieldHeight * 0.01);
  const keepInsidePlot = (value, high) => Math.max(0, Math.min(high, value));
  const studentScreenSpot = student => [
    xAbsences(displayAbsence(student)) + makeTinyStudentJitter(student, "absence") * jitterWidth,
    yGrade(student.G3) + makeTinyStudentJitter(student, "grade") * jitterHeight
  ];
  const studentInScatterView = student => {
    const [x, y] = studentScreenSpot(student);

    return x >= -6 && x <= fieldWidth + 6 && y >= -6 && y <= fieldHeight + 6;
  };
  const hasScatterFocus = hasFocusGroup() || hasScatterBrush();
  const pointRadius = student => isStudentInFocus(student) ? 4 : 2.4;
  const pointOpacity = student => {
    if (!studentInScatterView(student)) return 0;

    return hasScatterFocus
      ? (isStudentInFocus(student) ? 0.88 : 0.16)
      : 0.48;
  };
  const pointFill = student => hasScatterFocus
    ? (isStudentInFocus(student) ? "#2a9d8f" : "#cbd5e1")
    : courseColors.get(student.course);

  // reseting all scatterplot elements before creating
  svg.selectAll("*").remove();

  svg
    .attr("viewBox", `0 0 ${fieldBox.width} ${fieldBox.height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  // creating a group specifically for the scatterplot so it has enough space for its axes, labels, and legend
  const fieldRoot = svg.append("g")
    .attr("transform", `translate(${fieldMargins.left},${fieldMargins.top})`);

  // creating a pale backround to allow for data points to stickout on scatter plot
  fieldRoot.append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", fieldWidth)
    .attr("height", fieldHeight)
    .attr("rx", 8)
    .attr("fill", "#fbfdff")
    .attr("stroke", "#edf2f7");

  // adding the horizontal final grade grid lines for the scatterplot
  const gradeGrid = fieldRoot.append("g")
    .attr("class", "outcome-grid");
  // adding the x axis group for school absences
  const absenceAxis = fieldRoot.append("g")
    .attr("transform", `translate(0,${fieldHeight})`);
  // adding the y axis group for final grade
  const gradeAxis = fieldRoot.append("g");
  const absenceTickText = d => d >= absenceDisplayLimit ? "30+" : d3.format("~g")(d);

  // drawinf the scatterplot axes's after zooming to match the zoomed view
  const redrawScatterAxes = () => {
    gradeGrid
      .call(d3.axisLeft(yGrade).tickSize(-fieldWidth).tickFormat("").ticks(5))
      .call(axisGroup => axisGroup.selectAll(".domain").remove())
      .call(axisGroup => axisGroup.selectAll("line").attr("stroke", "#e6edf5"));

    absenceAxis
      .call(d3.axisBottom(xAbsences).ticks(6).tickFormat(absenceTickText).tickSizeOuter(0))
      .call(axisGroup => axisGroup.selectAll("text").attr("font-size", 11))
      .call(axisGroup => axisGroup.selectAll(".domain").attr("stroke", "#b8c4d3"))
      .call(axisGroup => axisGroup.selectAll(".tick line").attr("stroke", "#d9e2ec"));

    gradeAxis
      .call(d3.axisLeft(yGrade).ticks(5).tickSizeOuter(0))
      .call(axisGroup => axisGroup.selectAll("text").attr("font-size", 11))
      .call(axisGroup => axisGroup.selectAll(".domain").attr("stroke", "#b8c4d3"))
      .call(axisGroup => axisGroup.selectAll(".tick line").attr("stroke", "#d9e2ec"));
  };

  redrawScatterAxes();

  // adding in x axis label for scatter plot
  fieldRoot.append("text")
    .attr("x", fieldWidth / 2)
    .attr("y", fieldHeight + 42)
    .attr("text-anchor", "middle")
    .attr("fill", "#52616f")
    .attr("font-size", 12)
    .attr("font-weight", 700)
    .text("School absences");

  // adding in y axis label for the scatter plot
  fieldRoot.append("text")
    .attr("x", -fieldHeight / 2)
    .attr("y", -46)
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .attr("fill", "#52616f")
    .attr("font-size", 12)
    .attr("font-weight", 700)
    .text("Final grade");

  if (state.brushDomain) {
    const brushLeft = keepInsidePlot(xAbsences(state.brushDomain.x0), fieldWidth);
    const brushRight = keepInsidePlot(xAbsences(state.brushDomain.x1), fieldWidth);
    const brushTop = keepInsidePlot(yGrade(state.brushDomain.y1), fieldHeight);
    const brushBottom = keepInsidePlot(yGrade(state.brushDomain.y0), fieldHeight);

    // keeping a low copy of the brush box after selection
    fieldRoot.append("rect")
      .attr("class", "scatter-brush-memory")
      .attr("x", brushLeft)
      .attr("y", brushTop)
      .attr("width", Math.max(0, brushRight - brushLeft))
      .attr("height", Math.max(0, brushBottom - brushTop))
      .attr("rx", 5)
      .attr("fill", "rgba(42, 157, 143, 0.08)")
      .attr("stroke", "#2a9d8f")
      .attr("stroke-dasharray", "4 3")
      .attr("pointer-events", "none")
      .attr("opacity", 0)
      .call(brushMemory => startFocusMotion(brushMemory, 120)
        .attr("opacity", 1));
  }

  // creating the rectangular brush that helps select points
  const scatterBrush = d3.brush()
    .extent([[0, 0], [fieldWidth, fieldHeight]])
    .filter(event => !event.shiftKey && !event.ctrlKey && event.button !== 2)
    .on("end", event => {
      if (!event.selection) {
        if (!hasScatterBrush()) return;

        clearScatterBrush();
        hideStudentTooltip();
        redrawAfterFocusChange(data);
        return;
      }

      const [[x0, y0], [x1, y1]] = event.selection;
      const nextBrushedIds = new Set();

      // after done brushing, collecting all points within the box
      data
        .filter(student => isStudentInHeatmapFocus(student))
        .forEach(student => {
          const [pointX, pointY] = studentScreenSpot(student);

          if (x0 <= pointX && pointX <= x1 && y0 <= pointY && pointY <= y1) {
            nextBrushedIds.add(student.id);
          }
        });

      if (!nextBrushedIds.size) {
        clearScatterBrush();
        hideStudentTooltip();
        redrawAfterFocusChange(data);
        return;
      }

      state.brushedIds = nextBrushedIds;
      state.brushDomain = {
        x0: xAbsences.invert(x0),
        x1: xAbsences.invert(x1),
        y0: yGrade.invert(y1),
        y1: yGrade.invert(y0)
      };

      hideStudentTooltip();
      redrawAfterFocusChange(data);
    });

  // adding the brush layer that lets user drag rectangle over the plot
  fieldRoot.append("g")
    .attr("class", "scatter-brush")
    .call(scatterBrush)
    .call(brushGroup => brushGroup.selectAll(".overlay").attr("cursor", "crosshair"))
    .call(brushGroup => brushGroup.selectAll(".selection")
      .attr("fill", "rgba(42, 157, 143, 0.12)")
      .attr("stroke", "#2a9d8f"));

  // creating one circle per student record and also making focused points look different
  const outcomePoints = fieldRoot.append("g")
    .attr("class", "outcome-student-layer")
    .selectAll("circle")
    .data(data, d => d.id)
    .join("circle")
    .attr("cx", d => studentScreenSpot(d)[0])
    .attr("cy", d => studentScreenSpot(d)[1])
    .attr("r", d => Math.max(1.4, pointRadius(d) * 0.55))
    .attr("fill", "#cbd5e1")
    .attr("stroke", "#ffffff")
    .attr("stroke-width", 0.75)
    .attr("stroke-opacity", 0.85)
    .attr("opacity", 0)
    .attr("cursor", "pointer")
    .attr("pointer-events", d => studentInScatterView(d) ? "auto" : "none")
    .on("mouseover", (event, d) => {
      moveStudentTooltip(event, `
        <strong>${d.course} student-course record</strong>
        Final grade: ${d.G3}/20<br>
        Absences: ${d.absences}<br>
        Study time: ${studyTimeNames.get(d.studytime)}<br>
        Weekend alcohol: ${weekendAlcoholNames.get(d.Walc)}
      `);
    })
    .on("mousemove", (event, d) => {
      moveStudentTooltip(event, `
        <strong>${d.course} student-course record</strong>
        Final grade: ${d.G3}/20<br>
        Absences: ${d.absences}<br>
        Study time: ${studyTimeNames.get(d.studytime)}<br>
        Weekend alcohol: ${weekendAlcoholNames.get(d.Walc)}
      `);
    })
    .on("mouseout", hideStudentTooltip)
    .call(points => startFocusMotion(points)
      .attr("r", pointRadius)
      .attr("fill", pointFill)
      .attr("opacity", pointOpacity));

  // moving the brush box when zooming/panning
  const redrawBrushMemory = () => {
    if (!state.brushDomain) return;

    const brushLeft = keepInsidePlot(xAbsences(state.brushDomain.x0), fieldWidth);
    const brushRight = keepInsidePlot(xAbsences(state.brushDomain.x1), fieldWidth);
    const brushTop = keepInsidePlot(yGrade(state.brushDomain.y1), fieldHeight);
    const brushBottom = keepInsidePlot(yGrade(state.brushDomain.y0), fieldHeight);

    fieldRoot.select(".scatter-brush-memory")
      .attr("x", brushLeft)
      .attr("y", brushTop)
      .attr("width", Math.max(0, brushRight - brushLeft))
      .attr("height", Math.max(0, brushBottom - brushTop));
  };

  // applying the zoom affect to all plot properties
  const redrawScatterZoomView = () => {
    xAbsences = state.scatterZoom.rescaleX(xBaseAbsences);
    yGrade = state.scatterZoom.rescaleY(yBaseGrade);

    redrawScatterAxes();
    redrawBrushMemory();

    outcomePoints
      .attr("cx", d => studentScreenSpot(d)[0])
      .attr("cy", d => studentScreenSpot(d)[1])
      .attr("opacity", pointOpacity)
      .attr("pointer-events", d => studentInScatterView(d) ? "auto" : "none");
  };

  // creating zoom behavior for scatter plot + scrolling and shift panning
  const scatterCamera = d3.zoom()
    .scaleExtent([1, 7])
    .translateExtent([[0, 0], [fieldWidth, fieldHeight]])
    .extent([[0, 0], [fieldWidth, fieldHeight]])
    .filter(event => event.type === "wheel" || event.shiftKey)
    .on("zoom", event => {
      state.scatterZoom = event.transform;
      redrawScatterZoomView();
      updateResetButton();
    });

  // attaching the zoom effect only to the scatter plot and panning
  fieldRoot
    .call(scatterCamera)
    .call(scatterCamera.transform, state.scatterZoom)
    .on("dblclick.zoom", null);

  const legendItems = hasScatterBrush()
    ? [
      { label: "Brushed students", color: "#2a9d8f", opacity: 0.9 },
      { label: "Outside brush", color: "#cbd5e1", opacity: 0.35 }
    ]
    : hasFocusGroup()
    ? [
      { label: "Focused group", color: "#2a9d8f", opacity: 0.9 },
      { label: "Other students", color: "#cbd5e1", opacity: 0.35 }
    ]
    : [
      { label: "Math", color: courseColors.get("Math"), opacity: 0.7 },
      { label: "Portuguese", color: courseColors.get("Portuguese"), opacity: 0.7 }
    ];

  // adding a legend for the focus view to show focused dots vs unfocused dots
  const outcomeLegend = fieldRoot.append("g")
    .attr("transform", `translate(${fieldWidth + 18},14)`);

  // adding each small legend dot for each different color category we have
  outcomeLegend.selectAll("circle")
    .data(legendItems)
    .join("circle")
    .attr("cx", 0)
    .attr("cy", (d, index) => index * 18)
    .attr("r", 5)
    .attr("fill", d => d.color)
    .attr("opacity", d => d.opacity);

  // adding the labels for the scatter plot legend
  outcomeLegend.selectAll("text")
    .data(legendItems)
    .join("text")
    .attr("x", 12)
    .attr("y", (d, index) => index * 18 + 4)
    .attr("fill", "#52616f")
    .attr("font-size", 11)
    .text(d => d.label);
}

// drawing the parallel coord plot for comparing multiple students
function traceStudentProfiles(data) {
  const svg = d3.select("#parallel-chart svg");
  const profileBox = measureChartFrame("#parallel-chart", 920, 300);
  const profileMargins = { top: 54, right: 34, bottom: 44, left: 50 };
  const profileWidth = profileBox.width - profileMargins.left - profileMargins.right;
  const profileHeight = profileBox.height - profileMargins.top - profileMargins.bottom;
  const profileAxes = [
    {
      key: "studytime",
      title: "Study",
      domain: [1, 4],
      ticks: [1, 2, 3, 4],
      format: d => studyTimeNames.get(d)
    },
    {
      key: "goout",
      title: "Going out",
      domain: [1, 5],
      ticks: [1, 3, 5],
      format: d => d
    },
    {
      key: "Dalc",
      title: "Day alcohol",
      domain: [1, 5],
      ticks: [1, 3, 5],
      format: d => d
    },
    {
      key: "Walc",
      title: "Weekend alcohol",
      domain: [1, 5],
      ticks: [1, 3, 5],
      format: d => d
    },
    {
      key: "absences",
      title: "Absences",
      domain: [0, absenceDisplayLimit],
      ticks: [0, 10, 20, 30],
      format: d => d === absenceDisplayLimit ? "30+" : d
    },
    {
      key: "failures",
      title: "Failures",
      domain: [0, 4],
      ticks: [0, 1, 2, 3, 4],
      format: d => d
    },
    {
      key: "G1",
      title: "Period 1 grade",
      domain: [0, 20],
      ticks: [0, 10, 20],
      format: d => d
    },
    {
      key: "G2",
      title: "Period 2 grade",
      domain: [0, 20],
      ticks: [0, 10, 20],
      format: d => d
    },
    {
      key: "G3",
      title: "Final grade",
      domain: [0, 20],
      ticks: [0, 10, 20],
      format: d => d
    }
  ];
  const xProfile = d3.scalePoint()
    .domain(profileAxes.map(axis => axis.key))
    .range([0, profileWidth])
    .padding(0.28);
  const yProfiles = new Map(profileAxes.map(axis => [
    axis.key,
    d3.scaleLinear()
      .domain(axis.domain)
      .range([profileHeight, 0])
  ]));
  const profileLine = d3.line()
    .defined(point => Number.isFinite(point[1]))
    .curve(d3.curveMonotoneX);
  const hasAnyStudentFocus = hasFocusGroup() || hasScatterBrush();
  const focusedProfiles = data.filter(d => isStudentInFocus(d));
  const fadedProfiles = hasAnyStudentFocus
    ? data.filter(d => !isStudentInFocus(d))
    : data;
  const legendItems = hasScatterBrush()
    ? [
      { label: "Brushed students", color: "#2a9d8f", opacity: 0.82 },
      { label: "Other profiles", color: "#cbd5e1", opacity: 0.28 }
    ]
    : hasFocusGroup()
    ? [
      { label: "Focused heatmap group", color: "#2a9d8f", opacity: 0.8 },
      { label: "Other profiles", color: "#cbd5e1", opacity: 0.28 }
    ]
    : [
      { label: "Math", color: courseColors.get("Math"), opacity: 0.5 },
      { label: "Portuguese", color: courseColors.get("Portuguese"), opacity: 0.5 }
    ];

  const profileValue = (student, axis) => {
    if (axis.key === "absences") {
      return Math.min(student.absences, absenceDisplayLimit);
    }

    return student[axis.key];
  };

  const pathForStudent = student => profileLine(profileAxes.map(axis => [
    xProfile(axis.key),
    yProfiles.get(axis.key)(profileValue(student, axis))
  ]));

  const profileStroke = student => {
    if (hasAnyStudentFocus) {
      return isStudentInFocus(student) ? "#2a9d8f" : "#cbd5e1";
    }

    return courseColors.get(student.course);
  };

  const profileOpacity = student => {
    if (hasAnyStudentFocus) {
      return isStudentInFocus(student) ? 0.42 : 0.08;
    }

    return 0.12;
  };

  const profileWidthFor = student => hasAnyStudentFocus && isStudentInFocus(student) ? 1.35 : 0.9;

  // reseting plot before implementing in our data
  svg.selectAll("*").remove();

  svg
    .attr("viewBox", `0 0 ${profileBox.width} ${profileBox.height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  // making a main group for the advanced plot so there is room for the axes and labels
  const profileRoot = svg.append("g")
    .attr("transform", `translate(${profileMargins.left},${profileMargins.top})`);

  // adding in horizontal lines at each different section of the data low to high. this makes it easier to compare each different scale of data
  profileRoot.append("g")
    .attr("class", "profile-guide-layer")
    .selectAll("line")
    .data([0, 0.25, 0.5, 0.75, 1])
    .join("line")
    .attr("x1", 0)
    .attr("x2", profileWidth)
    .attr("y1", d => d * profileHeight)
    .attr("y2", d => d * profileHeight)
    .attr("stroke", "#edf2f7");

  // drawing the context lines for the profile so that students who aren't focused stau visible
  profileRoot.append("g")
    .attr("class", "profile-context-layer")
    .selectAll("path")
    .data(fadedProfiles, d => d.id)
    .join("path")
    .attr("d", pathForStudent)
    .attr("fill", "none")
    .attr("stroke", "#cbd5e1")
    .attr("stroke-width", 0.6)
    .attr("stroke-linecap", "round")
    .attr("stroke-linejoin", "round")
    .attr("opacity", 0)
    .call(lines => startFocusMotion(lines)
      .attr("stroke", d => profileStroke(d))
      .attr("stroke-width", d => profileWidthFor(d))
      .attr("opacity", d => profileOpacity(d)));

  // drawing the focused or brushed profile lines to give selected students more visibility
  profileRoot.append("g")
    .attr("class", "profile-focus-layer")
    .selectAll("path")
    .data(hasAnyStudentFocus ? focusedProfiles : [], d => d.id)
    .join("path")
    .attr("d", pathForStudent)
    .attr("fill", "none")
    .attr("stroke", "#2a9d8f")
    .attr("stroke-width", 0.8)
    .attr("stroke-linecap", "round")
    .attr("stroke-linejoin", "round")
    .attr("opacity", 0)
    .call(lines => startFocusMotion(lines, 90)
      .attr("stroke-width", 1.45)
      .attr("opacity", 0.48));

  // implementing the hover feature where currently inspected data line will be highlighted black to show interaction
  const liveHoverProfile = profileRoot.append("path")
    .attr("class", "profile-live-hover")
    .attr("fill", "none")
    .attr("stroke", "#111827")
    .attr("stroke-width", 2.8)
    .attr("stroke-linecap", "round")
    .attr("stroke-linejoin", "round")
    .attr("pointer-events", "none")
    .attr("opacity", 0);

  const clearProfileHover = () => {
    liveHoverProfile
      .attr("opacity", 0)
      .attr("d", null);

    hideStudentTooltip();
  };

  // adding in hidden hover lines so that the tool tip is easier to trigger
  profileRoot.append("g")
    .attr("class", "profile-hover-layer")
    .selectAll("path")
    .data(data, d => d.id)
    .join("path")
    .attr("d", pathForStudent)
    .attr("fill", "none")
    .attr("stroke", "transparent")
    .attr("stroke-width", 9)
    .attr("pointer-events", "stroke")
    .on("mouseover", (event, d) => {
      liveHoverProfile
        .attr("d", pathForStudent(d))
        .attr("opacity", 0.82)
        .raise();

      moveStudentTooltip(event, `
        <strong>${d.course} profile</strong>
        Study: ${studyTimeNames.get(d.studytime)}<br>
        Going out: ${d.goout}/5<br>
        Weekend alcohol: ${weekendAlcoholNames.get(d.Walc)}<br>
        Absences: ${d.absences}<br>
        Final grade: ${d.G3}/20
      `);
    })
    .on("mousemove", (event, d) => {
      moveStudentTooltip(event, `
        <strong>${d.course} profile</strong>
        Study: ${studyTimeNames.get(d.studytime)}<br>
        Going out: ${d.goout}/5<br>
        Weekend alcohol: ${weekendAlcoholNames.get(d.Walc)}<br>
        Absences: ${d.absences}<br>
        Final grade: ${d.G3}/20
      `);
    })
    .on("mouseout", clearProfileHover);

  // clearing the black line highlighting when the user leaves the parallel coord visualization
  svg.on("mouseleave", clearProfileHover);

  // adding in the vertical axis which will show each of the different student attributes
  const profileAxisGroups = profileRoot.append("g")
    .attr("class", "profile-axis-layer")
    .selectAll("g")
    .data(profileAxes, axis => axis.key)
    .join("g")
    .attr("transform", axis => `translate(${xProfile(axis.key)},0)`)
    .each(function(axis) {
      d3.select(this)
        .call(d3.axisLeft(yProfiles.get(axis.key)).tickValues(axis.ticks).tickFormat(axis.format).tickSize(3))
        .call(axisGroup => axisGroup.selectAll("text").attr("font-size", 9))
        .call(axisGroup => axisGroup.selectAll(".domain").attr("stroke", "#b8c4d3"))
        .call(axisGroup => axisGroup.selectAll(".tick line").attr("stroke", "#d9e2ec"));
    });

  // adding a label above each vertical axis giving the users the title of what variable they are looking at
  profileAxisGroups.append("text")
    .attr("x", 0)
    .attr("y", -18)
    .attr("text-anchor", "middle")
    .attr("fill", "#52616f")
    .attr("font-size", 10)
    .attr("font-weight", 700)
    .text(axis => axis.title);

  // creating a legend for the parallel coord visualization
  const profileLegend = profileRoot.append("g")
    .attr("transform", `translate(${Math.max(0, profileWidth - 270)},${profileHeight + 19})`);

  // adding in colored lines for the legend to match the current chart colors
  profileLegend.selectAll("line")
    .data(legendItems)
    .join("line")
    .attr("x1", 0)
    .attr("x2", 20)
    .attr("y1", (d, index) => index * 16)
    .attr("y2", (d, index) => index * 16)
    .attr("stroke", d => d.color)
    .attr("stroke-width", 3)
    .attr("stroke-linecap", "round")
    .attr("opacity", d => d.opacity);

  // adding in the different text labels next to the legend lines to give them meaning
  profileLegend.selectAll("text")
    .data(legendItems)
    .join("text")
    .attr("x", 28)
    .attr("y", (d, index) => index * 16 + 4)
    .attr("fill", "#52616f")
    .attr("font-size", 10)
    .text(d => d.label);

}

function updateSelection(nextSelection) {
  state.selectedStudytime = nextSelection.studytime ?? null;
  state.selectedWalc = nextSelection.Walc ?? null;
  clearScatterBrush();
}
