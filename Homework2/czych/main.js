/* Shared constants and utilities */
const EXP_LABELS = {
    EN: "Entry (EN)",
    MI: "Mid (MI)",
    SE: "Senior (SE)",
    EX: "Executive (EX)"
};

const SIZE_LABELS = {
    S: "Small (S)",
    M: "Medium (M)",
    L: "Large (L)"
};

const EXP_ORDER = ["EN", "MI", "SE", "EX"];
const SIZE_ORDER = ["S", "M", "L"];

const EXP_COLORS = {
    EN: "#74c0fc",
    MI: "#51cf66",
    SE: "#ff922b",
    EX: "#ff6b6b"
};

const LABEL_TO_EXP = {};
Object.keys(EXP_LABELS).forEach(function (key) {
    LABEL_TO_EXP[EXP_LABELS[key]] = key;
});

function formatSalary(value) {
    return d3.format("$,.0f")(value);
}

/* Dashboard Layout */
function getLayouts(width, height) {
    const padding = 12;
    const sankeyHeight = Math.floor(height * 0.56);
    const bottomTop = sankeyHeight + padding;
    const bottomHeight = height - bottomTop - padding;
    const halfWidth = Math.floor(width / 2);

    return {
        sankey: {
            left: padding,
            top: padding,
            width: width - padding * 2,
            height: sankeyHeight - padding
        },
        line: {
            left: padding,
            top: bottomTop,
            width: halfWidth - padding * 1.5,
            height: bottomHeight
        },
        heatmap: {
            left: halfWidth + padding / 2,
            top: bottomTop,
            width: halfWidth - padding * 1.5,
            height: bottomHeight
        }
    };
}

function renderDashboard(rows) {
    const container = document.getElementById("viz-container");
    const width = container.clientWidth;
    const height = container.clientHeight;
    const layouts = getLayouts(width, height);

    // Main SVG canvas
    const svg = d3.select("#main-svg")
        .attr("width", width)
        .attr("height", height);

    svg.selectAll("*").remove();

    // Dashboard background
    svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "#f7f8fa");

    drawSankey(svg, rows, layouts.sankey);
    drawLineChart(svg, rows, layouts.line);
    drawHeatmap(svg, rows, layouts.heatmap);
}

/* Data Loading */
d3.csv("data/ds_salaries.csv").then(function (rawData) {
    const rows = rawData.map(function (d) {
        return {
            work_year: +d.work_year,
            experience_level: d.experience_level,
            job_title: d.job_title,
            salary_in_usd: +d.salary_in_usd,
            company_size: d.company_size,
            remote_ratio: +d.remote_ratio
        };
    });

    renderDashboard(rows);

    let resizeTimer;
    window.addEventListener("resize", function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            renderDashboard(rows);
        }, 150);
    });
}).catch(function (error) {
    console.error(error);
});
