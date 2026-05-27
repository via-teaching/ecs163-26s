# Homework 3: Pokémon Type Explorer

### 1. Average Pokémon Weight by Primary Type

The bar chart shows the average weight of Pokémon for each primary type. This view helps compare body size differences across types.

### 2. Overview: Pokémon Type Distribution

The pie chart serves as the overview of the dataset. It shows how many Pokémon belong to each primary type.

This view help understand the overall structure of the dataset before looking at more detailed views. Users can click a pie slice to select a type and use it as the focus for the rest of the dashboard.

### 3. Advanced View: Average Battle Stats by Type

The parallel coordinates plot is the advanced visualization in this dashboard. Each line represents one Pokémon primary type, and the axes represent average battle stats:

- HP
- Attack
- Defense
- Special Attack
- Special Defense
- Speed


## Interactions

This dashboard includes two required interaction techniques:

### Selection

Users can click on:
 a bar in the bar chart
 a pie slice in the overview chart
 a line in the parallel coordinates plot
 a legend item

After clicking, the selected type remains highlighted while other types become faded. Clicking the same type again resets the selection.

### Brushing

Users can brush on the axes in the parallel coordinates plot. For example, they can brush a range on the Attack axis to focus on types with higher or lower average Attack.

The brushing interaction updates all three views by fading out types that do not fall inside the selected range.

### AI Usage

I used AI assistance during this assignment mainly for debugging and planning the interaction design.  AI was used to help understand how to connect selection, brushing, and animated transitions in D3.

I also used AI to help review code structure and suggest ways to make the dashboard better match the focus + context design requirement. 
