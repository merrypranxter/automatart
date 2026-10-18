# F6F — Adaptive microscopic pigment quality

F6D/F6E evaluate nine distinct mathematical pigments inside the original physical cellular polygons. This pass improves the sampling and appearance of those opt-in pigments without changing a single cellular transition law, saved world, recording timestamp, or original image when subcell quality is 0 / ink intensity is 0.

## What changed

1. **Bounded adaptive per-polygon density.** The existing strict per-frame global sample cap remains the ceiling (preview: 80k / 120k / 180k; export: 100k / 240k / 420k for quality 1/2/3). Each cell uses a smaller RGBA sample tile when its actual projected footprint is small or its neighbor-field variation is low. A physically tiny or invisible face is skipped. Highly active cells retain more of their allowed samples. Real Penrose and Voronoi outlines and exact legal graph gradients remain unchanged.
2. **Mathematical palette-band edge coverage.** For quality 2 or 3, each RGBA sample is tagged with its already evaluated scalar band. Finite differences to neighboring samples estimate how broadly a hard band edge crosses that pixel. Only the narrow boundary region blends adjacent **existing palette colors**; interiors stay saturated and perfectly flat. No extra equation evaluations are incurred, no aesthetic glow or blur filter is added. Quality 1 remains hard/pixelated.
3. **Improved export scaling.** Quality 2/3 opt into the browser's high-quality image interpolation of the reusable, tiny texture tile before clipping it into the exact physical polygon. This replaces the previous nearest-neighbor upscale on exports. No native-resolution full-frame second texture buffer.
4. **Exact opt-out.** Quality 0 and microscopic ink 0 both bypass the detail overlay entirely. No recipe format or new control is necessary; F6D/F6E sliders retain their meanings.

## What this does NOT promise

A browser canvas's anti-aliasing and file encoders vary between browsers, and a renderer work budget is not a measured frame-rate guarantee. Real device tests (iPhone Safari sustained GIF and MP4, memory/thermals, actual export smoothness) remain an acceptance gate before calling 4K/60s performance validated. F6F improves quality and avoids waste, but does not promise unlimited micro-frequency detail above the sample cap.

## Acceptance

- Run all F6D/F6E mathematical, legacy and browser smoke tests with their existing work-budget guarantees.
- New 'node scripts/f6f-quality-smoke.mjs' tests projected-footprint caps, activity-sensitive sampling, band coverage, 0-detail / 0-intensity exact original rendering, determinism, three actual physical geometries and nine combinations of mathematical materials.
- Build, native PNG, GIF/video recorder and Netlify preview checks must pass. User owns merge.
