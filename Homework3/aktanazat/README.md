# ECS 163 Homework 3

Dataset: Sephora skincare catalog from Kaggle (`kingabzpro/cosmetics-datasets`), in `data/cosmetics.csv`. Each row has a product category, brand, name, price, user rating, and five binary skin-type flags. Rows with a rating of 0 (unrated) are dropped because they add no signal.

Theme: explore how price relates to user rating across categories, then drill into which skin types and brands hold up inside any price/rating region.

Three views, following focus + context:

1. **Overview — price vs. rating scatter.** Every product, colored by category. This is the context view and the place all interaction starts.
2. **Advanced — skin-type suitability matrix.** Category by skin type; each cell is the product count in the current selection.
3. **Focus — top brands by mean rating.** The most-stocked brands in the selection, ranked by average rating.

Interactions:

- **Brushing** — drag on the scatter to select a price/rating region; both focus views update to that subset.
- **Pan and zoom** — scroll-wheel zooms the scatter into a price band; double-click eases back to the full view.
- **Selection** — click any point to pin it across the views.

Animated transitions:

- The matrix cells tween fill color and the in-cell counts roll to their new values as the brush moves (filtering / timestep).
- The brand bars reorder and slide to their new ranks, growing in and shrinking out, on every selection change (ordering / filtering), with slow-in slow-out easing.

Only D3 v5 is used.

Run locally from this folder:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.
