# ECS 163 Homework 3

Dataset: Sephora skincare catalog from Kaggle (`kingabzpro/cosmetics-datasets`), in `data/cosmetics.csv`. Each row has a product category, brand, name, price, user rating, and five binary skin-type flags. Rows with a rating of 0 (unrated) are dropped because they add no signal.

Theme: explore how price relates to user rating across categories, then drill into which skin types and brands hold up inside any price/rating region, down to a single product.

Three views, following focus + context:

1. **Overview — price vs. rating scatter.** Every product, colored by category. This is the context view and where interaction starts.
2. **Advanced — skin-type coverage matrix.** Category by skin type; each cell is the share of that category's selected products that suit the skin type, so the matrix shows where the options actually are.
3. **Focus — top brands by mean rating.** Brands with at least three products in the selection, ranked by average rating.

Interactions:

- **Brushing** — drag on the scatter to select a price/rating region; both focus views update to that subset.
- **Pan and zoom** — scroll-wheel zooms the scatter into a price band; double-click eases back. The brush is stored in data space, so a selection survives zooming.
- **Selection** — click any point to pin it; a detail card shows its brand, price, rating, and skin-type fit. That is the single-product end of the drill-down.

Animated transitions:

- Matrix cells tween fill color and the in-cell rating rolls to its new value as the brush moves (filtering / timestep).
- The brand bars reorder and slide to their new ranks, growing in and shrinking out, on every selection change (ordering / filtering), with slow-in slow-out easing.

Design rationale and tradeoffs:

- The overview is a scatter because price and rating are both continuous and the question is how they trade off; category rides on color so the split is visible without a fourth view. It doubles as the context plot for brush and zoom.
- The matrix encodes **within-category coverage share**, not raw count or mean rating. Raw count just tracks category size. Mean rating looked right but went circular: brushing the scatter on rating forced every cell to the same value. Share answers the real question ("for my skin type, where are the options") and stays informative under any brush; the absolute count drives cell opacity so confidence is visible, and the exact n is on hover.
- The color domain is clamped to the band ratings actually occupy (3.6 to 4.7). The full 0 to 5 range would wash every cell to the same tone.
- The brand ranking enforces a sample floor so a single five-star product cannot outrank a deep, consistent line. The floor steps down only as far as a small selection forces, and the annotation always states the floor in use, so the ranking is never mislabeled.
- Pinning a point is the end of the drill-down: overview, then brushed subset, then one product in full. That is the focus+context payoff, not a fourth chart.

Only D3 v5 is used.

Run locally from this folder:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.
