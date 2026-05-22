# Student Alcohol Consumption Dashboard

This dashboard explores how alcohol use, lifestyle factors, absences, and study time relate to final grades in the Student Alcohol Consumption dataset.

## How to run

The safest way for this homework is VS Code Live Server:

1. Open this folder directly in VS Code.
2. Open `index.html`.
3. Right-click inside `index.html` and choose **Open with Live Server**.

If the browser shows a directory/file listing instead of the dashboard, Live Server was opened from the parent folder. Open this folder itself, or open `index.html` directly with Live Server.

## Dashboard views

- **Scatter plot overview:** Alcohol use index (`Dalc + Walc`) vs final grade (`G3`), with bubble size representing absences and color representing study time.
- **Parallel coordinates plot:** Advanced visualization. Each line represents one student across alcohol use, study time, going out, free time, absences, and final grade. Hover a line to dim the rest and highlight the selected student in bright red.
- **Grouped bar chart:** Average final grade by study time category and alcohol-use group.

Click either smaller context chart to swap it into the large focus chart area.

## Color design

The page background uses the warm neutral palette requested for the main webpage. The graph marks use a higher-contrast palette:

- `#ebd4cb`
- `#da9f93`
- `#b6465f`
- `#890620`
- `#2c0703`

D3.js is the only visualization library used.
