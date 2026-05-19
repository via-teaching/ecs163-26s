# ECS 163 Homework 3

Dataset: Sephora skincare catalog from Kaggle (`kingabzpro/cosmetics-datasets`), in `data/cosmetics.csv`. Each row has a product category, brand, name, price, user rating, and five binary skin-type flags. Rows with a rating of 0 (unrated) are dropped because they add no signal.

Theme: explore how price relates to user rating across categories, then drill into which skin types and brands hold up inside any price/rating region, down to a single product.

Three views, following focus + context:

1. **Overview — price vs. rating scatter.** Every product, colored by category. This is the context view and where interaction starts.
2. **Advanced — skin-type suitability matrix.** Category by skin type; each cell is the mean rating of products in the current selection suited to that skin type, so the matrix reads as fit, not just volume.
3. **Focus — top brands by mean rating.** Brands with at least three products in the selection, ranked by average rating.

Interactions:

- **Brushing** — drag on the scatter to select a price/rating region; both focus views update to that subset.
- **Pan and zoom** — scroll-wheel zooms the scatter into a price band; double-click eases back. The brush is stored in data space, so a selection survives zooming.
- **Selection** — click any point to pin it; a detail card shows its brand, price, rating, and skin-type fit. That is the single-product end of the drill-down.

Animated transitions:

- Matrix cells tween fill color and the in-cell rating rolls to its new value as the brush moves (filtering / timestep).
- The brand bars reorder and slide to their new ranks, growing in and shrinking out, on every selection change (ordering / filtering), with slow-in slow-out easing.

Only D3 v5 is used.

Run locally from this folder:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.
