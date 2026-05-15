# ECS 163 Homework 2 Draft

Dataset: San Francisco Historical Ballot Measures from DataSF (`data/ballot_measures.csv`).

I chose this dataset because each row has the measure outcome, year, yes/no votes, measure type, and sponsor/source. That gives enough fields for three different charts without needing outside data.

The dashboard has three views:

1. A stacked bar chart by decade, which works as the overview.
2. A scatter plot comparing yes vote share against total votes. Color shows pass/fail, and point size also reflects turnout.
3. A parallel coordinates plot for the 180 highest-turnout measures. I limited it because drawing every measure made the lines too crowded.

The main question I wanted to check was whether high-turnout measures and certain sponsor/type categories look different from the rest of the ballot measures.

Run locally from this folder with a static server:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000` in a browser.
