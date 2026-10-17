# F6D — True within-cell mathematical material detail

F6C added the exact gyroid implicit surface slice, circle inversion and cusp discriminant visual materials, but their existing renderer evaluated pigments **once per living source cell**. Exporting at high resolution retained accurate full-resolution Penrose/Voronoi polygon boundaries, yet the interior pigment was still resampled from a 2×2 source patch and looked comparatively simple when enlarged.

F6D is the first opt-in, bounded **subcell material evaluation** for these three mathematical skins. The original F6A/B skins are deliberately unchanged this phase.

## What's implemented

- A **Subcell quality (0 = original)** slider in Skin Lab for Gyroid Guts, Inversion Bloom and Cusp Catastrophe, with four states 0 / 1 / 2 / 3. **0** is the default for all new and legacy recipes, preserving their former pixel output exactly.
- When enabled, two additional independent controls become available: **Microscopic equation frequency** (0.5–12) and **Microscopic flat-ink intensity** (0–1). Setting intensity to 0 restores the original full-size artwork pixel for pixel, including when the quality level remains nonzero.
- Each output source cell receives a small, reusable RGBA shader tile with samples spread over the cell's physical polygon bounding box. The shading equations are **reevaluated at multiple distinct positions inside each cell**, rather than scaling one flat source-pixel pigment. Every small tile is clipped to its **genuine polygon** path. This respects Penrose P3 rhombs, exact seeded Voronoi bisector faces, and the six other physical motif geometries, including hexagonal, triangular, Kagome and rhombille shapes; there are no imaginary square faces drawn on top of actual ones.
- The new samples use the same exact F6C mathematical functions: the 3D gyroid level set, involutive Euclidean circle inversion and the canonical cusp discriminant. Position within the cell, adjustable microscopic frequency, actual live state, lawful neighbor gradient, seed and integer generation determine the appearance. Penrose and Voronoi obtain neighbor derivatives from D4B's actual CSR polygon-edge graph; the regular family uses its real stencil offsets. Rendering is visual only and never alters the CA world, cell lifetimes, topological geometry or deterministic recording clock.
- Work is **bounded globally**. Live preview caps micro equation sample evaluations at approximately 80k/120k/180k per frame for detail 1/2/3. Native export caps them at approximately 100k/240k/420k. The budget is divided among actual source-cell counts; large 9:16 lattices automatically sample fewer times per cell, rather than allocating a huge whole-output-pixel texture or multiplying work by 4K dimensions. Export is always at least as detailed as preview at the same slider level.
- One reusable small RGBA tile and one small ImageData are used per render context. A fresh tile is sampled for each polygon/state (no stale colors from previous frame). The polygon clipping happens after every original skin but before Print Shop. Existing original high-res vector polygon drawing, aspect-ratio framing, GIF/video frame counts, timestamps and exporters remain unchanged.
- A warning in the Skin Lab notes that enabling more microscopic work can slow video/GIF output. No actual Safari 30-second 2160p performance claims without physical device verification.

## Acceptance

`node scripts/f6d-microdetail-smoke.mjs` covers 9 lattice/ratio/seed/jitter geometries spanning all eight lattice types, 27 gyroid/inversion/cusp real rendered cases, source-cell intra-color differences, preview/export budget caps, independent quality/frequency/mix controls, full save/restore reproducibility, non-mutation of CA, full native-resolution Voronoi clipped square and portrait PNG files and unchanged dimensions. It explicitly checks pixel-equivalence of quality 0 and pigment intensity 0.

`node scripts/f6d-microdetail-browser-smoke.mjs` launches the built production app on a 390px mobile Chromium viewport, turns microscopic detail on/off for all three skins, checks their working sliders, verifies their canvas pixels change and that strength zero restores the old image, checks there is no new horizontal overflow or browser exception.

The entire established D1–D4 + F6A/B/C mathematics, projection, painting, GIF Worker / MP4/video recorder and Netlify preview CI remains mandatory. Do **not** merge this PR until all checks are green; the artist alone controls merges.

Potential F6E improvements: unify the F6A/B and legacy skin equations with subcell material sampling, per-polygon adaptive geometric detail, antialiasing/dither controls, smart still-vs-video quality, actual mobile Safari profiling and 30s 2160p device acceptance.
