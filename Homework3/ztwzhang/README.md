# Homework 3 Dashboard

Name: ztwzhang

Dataset: Global Terrorism Database

Source: https://www.kaggle.com/START-UMD/gtd

This dashboard extends my Homework 2 Global Terrorism Database dashboard with interaction and animated transitions. The original GTD CSV is very large, so the files in `gtd_summary_data/` are pre-aggregated CSV files derived from `globalterrorismdb_0718dist.csv`.

The dashboard visualizes terrorist incidents from 1970 to 2017 with three coordinated views:

- Yearly overview of incidents and fatalities.
- Geographic focus view showing country-level concentration.
- Parallel coordinates advanced view showing attack type, target type, weapon type, region, and fatalities per incident.

## Interactions and transitions

The top time-series chart is the overview/context view. It includes a horizontal brush that selects a year range; brushing updates the map and parallel coordinates views so users can drill down from the long-term trend into a specific time period.

The map is the main focus view. Users can pan and zoom the map to inspect dense regions, and click a country bubble to select it. The selected country remains highlighted and the map annotation changes from a top-country list to details for the selected country.

Animated transitions are used when the dashboard state changes. Map bubbles grow into their filtered sizes when the year range, region, or metric changes, and parallel-coordinate lines fade in for the newly filtered attack profiles. These filtering and visualization-change transitions help users track how the focus views update from one state to the next.

## Design rationale

The line and area chart acts as the context view because year is the main temporal structure in the dataset. Incidents and fatalities use distinct sequentially ordered line colors to support comparison without overloading the overview.

The map encodes the selected metric with bubble area because the task is to compare country-level magnitude. The yellow-red color scale encodes fatalities per incident as a severity rate, separating event volume from lethality and making countries with fewer but deadlier incidents visible.

The parallel coordinates plot is the advanced view. It connects region, attack type, target type, weapon type, and fatalities per incident so common attack profiles can be compared across several categorical and quantitative dimensions. Line color reinforces region, and line width encodes incident volume.

To run the dashboard, open `index.html` with VSCode Live Server or another local static server.
