# D3A — Genuine seeded Voronoi polygon worlds

## Mathematics, not a polygon skin
Every cell is the planar Voronoi region of a distinct seeded point pᵢ, clipped against the canvas rectangle [0,w]×[0,h]. For every competing generator pⱼ, its bisector restricts the cell to

2(pⱼ−pᵢ) · x ≤ ||pⱼ||² − ||pᵢ||².

Repeated convex polygon half-plane intersection constructs its REAL boundary. The data structure returns each site's physical coordinates, true polygon vertices, positive area, area-weighted centroid, reciprocal **whole-shared-edge** neighbor IDs, and whether the polygon touches a finite boundary. Border edges have no imaginary neighbors. There is no toroidal wrap in this phase.

Generator points are deterministically jittered inside one-per-bin sampling squares. The jittered square bins are an efficient distribution method **only**; bins are never treated as CA neighbors or image polygons. Changing the seed changes the actual Voronoi geometry and adjacency, not just colors.

## The fast 7×7 search is exact

Jitter is bounded to ±0.42 in each axis. Every canvas point has a generator within √2×(0.5+0.42) ≈ 1.302 (the generator in its own sampling bin). So a point in the cell of site A must be within 1.302 of A, and any generator that could actually bound that cell must lie within 2.604 of A. Sites with bin separation of 4+ along either axis lie at least 4−2(0.42)=3.16 apart. Therefore it is mathematically sufficient to clip a cell against generators in the 7×7 bin window centered on A. This scales approximately linearly with the number of cells instead of doing all-site O(N²) clipping. It is NOT a heuristic or approximate Voronoi diagram.

The smoke test independently compares this optimized method with exhaustive, **global** half-plane clipping using all competing sites, for several seeds including the maximal jitter case. The test also checks site and centroid containment, exact area coverage, variable true coordination numbers, matching geometric polygon edges, and reciprocal graph edges on wide, tall, square and large patches. Unmatched edges anywhere other than the four true outer boundaries throw, protecting against hidden cracks or mistaken connections.

The generator is deterministic with inputs (width,height,seed,jitter), defaults jitter=0.34, caches three recent geometries, rejects invalid or over-18,000 cell patches, and explicitly reports hasPeriodicWrap=false.

## Phased delivery / integration contract

**D3A — this PR:** isolated mathematical geometry and graph API, documentation and full CI smoke. Not yet selectable in WORLD, not yet a living cellular automaton. No false claim of visual features.

**D3B — after user merges D3A:** add real graph-neighbor stepping to Life/Brian's/Cyclic/Generations/Excitable/Species, physical polygon rendering and touch brushes, graph-correct color fields, finite-boundary UI, seeded geometry/recipes and degree-aware rule presets. Unlike Penrose (four edges per interior rhomb), Voronoi has variable coordination, including 7+ sides. Do not use packed x/y as physical position.

**D3C / D4:** resolution-independent PNG/GIF/video rhomb-like polygon drawing, all nine aspect frames, playback and Safari performance/memory acceptance before release. Initial live cell budget and device limits must be verified on actual iPhone. Existing user-owned merge protocol remains unchanged.

Run `node scripts/d3a-voronoi-smoke.mjs`. Do not mark this PR ready until TypeScript/Vite build, all old engine regression checks and real Chromium browser GIF/video recording pass.
