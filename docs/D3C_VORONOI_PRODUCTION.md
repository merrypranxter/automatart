# D3C — Voronoi production polish: continuous strokes, cached export geometry

## Why

D3B's true irregular polygons and variable-degree CA are working. On an actual painting canvas, however, a drag generated only individual pointer events: fast swipes across dozens of small polygons could leave untouched gaps. D3B's correct native-resolution PNG/GIF/video exporter also reconstructed transformed polygon point arrays and Canvas paths **every frame**, even though generator positions, jitter, cell count and image dimensions had not changed. Moving the Voronoi jitter range slider likewise rebuilt the entire deterministic physical topology at every intermediate thumb position—especially unpleasant on phones.

## D3C changes

**Real physically continuous painting:** `voronoiStrokeCells` processes the complete segment between two successive pointer coordinates. It first uses a proven-complete nearby-generator search to find all potentially touched polygons, then mathematically clips the entire stroke line against each actual convex cell; only cells with **positive-length physical segment intersection** are painted, in path order. This is not arbitrary point spacing, pixel interpolation, square-grid traversal or graph-neighbor approximations. A thin polygon cannot disappear just because the browser sent only one pointermove for a long swipe. Candidate locality is safe because seed jitter is bounded to ±0.42, every point is within √2×0.92 of its nearest site, and half-cell-distance probes plus a ±3-bin corridor find every possible intersected polygon. Actual intersection—not sampling—determines which polygons receive paint.

Dragging keeps the existing deterministic per-tile brush seeds and user recipe stroke log. It groups updates so painting dozens of polygons draws **once per pointer event**, not once per touched tile. Pointer up/cancel and leave clear the physical pointer trail; dragging outside the artwork never creates a fake wrap seam. Other lattice painting behavior is unchanged.

**Production polygon path reuse:** `voronoiPixelGeometry` projects the fixed true physical polygons once per actual output size and geometry. In browsers supporting `Path2D`, it also prebuilds actual clip/fill/stroke paths. Subsequent GIF/video frames reuse **the exact same paths and bounds**, but compute **fresh palette/skin/material pixels** every frame, so cycling colors and living states never freeze. Node/native Canvas falls back to explicit path tracing but still reuses physical transformed vertices. A WeakMap keyed by each cached immutable Voronoi patch plus a strict two-size layout cap bounds retained memory. This is a geometry and CPU-allocation optimization, not a fake low-resolution raster export.

**Phone-friendly jitter slider:** The thumb/number update immediately, but a physical 7k-polygon world is regenerated only when the artist releases the slider (or commits via keyboard/blur). A note by the control explains the behavior. 0 and .42 remain legal and exactly reproducible.

**No timing compromises:** The existing frame-index capture cursor, GIF encoder and WebCodecs offline video timestamps remain as before. All nine frame ratios, 9:16/1:1 composition, finite boundaries, actual polygon edges, Print Shop and save/replay continue to use the canonical existing pipeline.

## CI and release caveats

`node scripts/d3c-voronoi-production-smoke.mjs` exhaustively checks the polygon set crossed by several extremely fast strokes on square and 9:16 Voronoi maps, including maximum jitter and tiny cross-cell segments, comparing against every cell rather than the optimized candidate search. Also verifies path-cache identity/eviction/isolation, fresh pigment after state changes, actual 2160p PNG, frame aspect ratios and unchanged capture replay.

`node scripts/d3c-voronoi-browser-smoke.mjs` boots the production Vite app in 390px mobile Chromium, selects real Voronoi, commits the jitter knob via keyboard, performs a whole-screen single-event drag, saves before/after recipes and requires many real cells to be painted without advancing the simulation clock or introducing horizontal scroll/browser errors. Existing production build, all regression suites, GIF Worker and video recording tests are still mandatory.

**Not yet physically verified:** sustained 1080p/2160p 30-second recordings on target iPhone/Safari, encoder availability, thermal throttling, and exact measured real-device FPS. Passing CI is not proof that every format works at every setting on phone hardware. Retain practical lower simulation grid options without lowering final export pixels. D4 follows after artist-owned merge; F6 optional skins after D4.

**Do not automatically merge.**
