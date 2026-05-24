// Shared layout constants
const TOP_MARGIN   = 50;
const BOT_MARGIN   = 60;
const LEFT_MARGIN  = 180;
const RIGHT_MARGIN = 50;
const LEGEND_W     = 140;

// Tooltip
const tooltip = d3.select("#tooltip");
function tipShow(html, event) { tooltip.html(html).style("opacity", 1); tipMove(event); }
function tipMove(event) {
    tooltip.style("left", (event.clientX + 14) + "px")
           .style("top",  (event.clientY - 28) + "px");
}
function tipHide() { tooltip.style("opacity", 0); }

// Shared experience level metadata
const expLabels = { EN: "Entry", MI: "Mid", SE: "Senior", EX: "Executive" };
const expOrder  = ["EN", "MI", "SE", "EX"];
