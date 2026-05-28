# ECS 163 Homework 3 - Interactive Pokémon Dashboard

This dashboard uses JavaScript and D3.js v7.

## Files

- `index.html` - page structure
- `style.css` - layout and styling
- `main.js` - D3 visualizations, interactions, and transitions
- `data/pokemon.csv` - full Pokémon dataset

## How to run locally

From inside this folder:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Interactions used

1. Selection: click one Pokémon in the scatterplot or parallel coordinates chart.
2. Brushing: drag a rectangle over the scatterplot to focus on a subset.

## Animated transitions used

- Stat bars animate when the selected Pokémon changes.
- Points and parallel-coordinate lines fade when filters or brush selections change.
- Type-distribution bars animate when the focused subset changes.

## Dashboard views

1. Overview scatterplot: Attack vs. Speed for all Pokémon.
2. Focus stat bar chart: detailed stats for selected Pokémon.
3. Advanced parallel coordinates chart: compares six stats at once.
4. Context type distribution chart: shows type counts for the current subset.


## Color note

Primary type colors are used consistently across the scatterplot, parallel coordinates, and type distribution chart. The type distribution chart also serves as the labeled color reference.
