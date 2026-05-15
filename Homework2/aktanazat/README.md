# ECS 163 Homework 2

Dataset: San Francisco Historical Ballot Measures from DataSF (`data/ballot_measures.csv`).

I chose this dataset because each row has outcome, year, yes/no votes, measure type, and sponsor/source. The dashboard explores how San Francisco ballot measure outcomes changed over time, whether higher-turnout measures behave differently, and whether measure type or sponsor/source lines up with yes vote share.

The dashboard has three views:

1. A stacked bar chart by decade, which works as the overview and context view.
2. A scatter plot comparing yes vote share against total votes. Color shows pass/fail, and point size also reflects turnout.
3. A parallel coordinates plot for the highest-turnout measures. This is the advanced view and shows year, measure type, sponsor/source, yes share, and turnout together.

The views are linked: hovering a decade in the overview filters the individual-measure views, and hovering an individual measure highlights its decade. This keeps the exploration flow connected instead of making three separate charts.

Run locally from this folder with a static server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000` in a browser.
