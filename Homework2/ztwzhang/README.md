# Homework 2 Dashboard

Name: ztwzhang

Dataset: Global Terrorism Database

Source: https://www.kaggle.com/START-UMD/gtd

This dashboard uses the Global Terrorism Database from the approved Homework 2 dataset list. The original GTD CSV is very large, so the files in `gtd_summary_data/` are pre-aggregated CSV files derived from `globalterrorismdb_0718dist.csv`.

The dashboard visualizes terrorist incidents from 1970 to 2017 with three coordinated views:

- Yearly overview of incidents and fatalities.
- Geographic focus view showing country-level concentration.
- Parallel coordinates view showing attack type, target type, weapon type, region, and fatalities per incident.

## Design rationale

The top line and area chart acts as the context view because year is the main temporal structure in the dataset. The selected year range is shaded so the smaller focus views can be read against the long-term trend. Incidents and fatalities use distinct sequentially ordered line colors to support comparison without overloading the overview.

The map is the primary focus view for geographic concentration. Bubble area encodes the selected metric because the task is to compare country-level magnitude, while the yellow-red color scale encodes fatalities per incident as a severity rate. This separates event volume from lethality and makes countries with fewer but deadlier incidents visible.

The parallel coordinates plot is the advanced view. It connects region, attack type, target type, weapon type, and fatalities per incident so common attack profiles can be compared across several categorical and quantitative dimensions. Line color reinforces region, and line width encodes incident volume.

To run the dashboard, open `index.html` with VSCode Live Server or another local static server.
