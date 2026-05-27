# ECS 163 Homework 3 — Car Market Explorer 2025

## Theme
This dashboard explores a 2025 car dataset with variables such as company, car name, engine, horsepower, top speed, price, fuel type, and seats.

## How to run
From this folder, run:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Views
1. **Overview scatterplot:** Price vs horsepower. Color represents fuel type and circle size represents top speed.
2. **Focus bar chart:** Average price by company for the currently selected subset.
3. **Advanced heatmap:** Fuel type by seat count, colored by average price.

## Required interactions
- **Brushing:** Drag over the scatterplot to select a subset of cars.
- **Pan and zoom:** Scroll or drag the scatterplot to inspect dense regions.
- **Selection:** Click one car or click a company bar to filter/highlight.

## Animated transitions
- Scatterplot points fade and move after filtering or zooming.
- Bar chart bars animate, reorder, and resize after filtering.
- Heatmap cells animate their color after filtering.

## Design rationale
The dashboard follows the focus + context design paradigm. The scatterplot acts as the context view because it shows the whole dataset and lets the user discover interesting subsets, such as high-horsepower expensive cars or lower-price commuter cars. The bar chart and heatmap are focus views because they update based on the selected subset and provide more detailed summaries. The interaction flow supports drill-down exploration instead of showing three unrelated charts.

## Data note
The CSV follows the Kaggle Cars Datasets (2025) schema: Company, Car Name, Engine, CC/Battery, HP, Top Speed, 0-100 km/h, Price, Fuel, and Seats. If the full Kaggle CSV is downloaded, it can replace `data/cars_2025.csv` as long as the same column names are preserved.
