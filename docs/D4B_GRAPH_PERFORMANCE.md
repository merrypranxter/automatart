# D4B — Cached physical edge graphs and hot-path stability

## The bottleneck

The six local cellular engines on a finite **Penrose P3** or **seeded Voronoi** world already followed the correct shared polygon edges. But each successive generation reconstructed fresh [dx,dy] arrays from every cell's immutable polygon neighbor IDs—several thousand temporary arrays per frame, despite unchanged geometry. The 'Flow' and 'Gradient' mathematical colors repeated that conversion and repeated centroid lookups for each neighbor, each rendered frame. At 64×114 on a portrait phone, those allocations are particularly wasteful.

## Exact fix: one compressed sparse row shared-edge graph

`src/engine/physical-graph.ts` constructs an immutable CSR view of each **already mathematically proven** tiled patch: `starts[i]..starts[i+1]` indexes the true `edgeIds` for physical cell i. Float64 arrays retain the exact original polygon centroid coordinates; no shape or neighbor redefinition, approximations, array-index false neighbors, spatial quantization, or torus wrap. WeakMap cache keys are the original cached `PenrosePatch` and `VoronoiPatch` objects; therefore seed, jitter, dimensions and patch identity cannot silently share stale geometry. Cache does not grow for each generation or export frame and can be collected once the underlying patch is dropped.

`stepWorld` now reads edge indices **directly**, without allocating a relative-offset array for each cell at each tick. Birth/survival, Brian's recovery, Cyclic chase, Generations, Excitable and Species all still use the exact same real neighbors and same count rules. Cyclic structural-change metrics also stream over the same directed physical edges and preserve their former denominator and values.

`computeColorSignal` uses the same graph's exact physical centroid deltas for *Flow* and *Gradient*, avoiding repeated polygon centroid lookup and [dx,dy] allocation. The exact visual signal equations, including unchanged low-energy fallback, phase and gradient scaling, remain intact. Regular square, hex, triangle, rhombille, Kagome and square-octagon physics are intentionally unchanged. Renderer, native-resolution PNG, GIF/video fixed-frame clock, painting, seed and recipe formats are unchanged.

## CI acceptance

`node scripts/d4b-physical-graph-smoke.mjs` independently reconstructs physical shared-edge votes from original polygon patches and verifies six CA engines over repeated synchronous generations, across 32×32, 32×57 portrait and wide/landscape, Penrose and Voronoi, seeds and jitter 0/0.34/0.42. Checks exact raw states, vote arrays, Cyclic physical structural metrics, true reciprocal adjacency, precise seed/jitter invalidation, save/replay and capture cursor agreement. Also independently computes *Flow/Gradient/Boundaries* values from the original tile neighbors/centroids and compares against the optimized output down to 1e-6. Performs actual PNG output frames at square/portrait/landscape sizes. Full existing D1–D4A smoke, Chromium GIF/video capture and Netlify remain required.

This is **performance/stability work, not added controls or an estimated speedup**. The structural benefit is measurable as removing per-cell per-generation graph offset allocation. Claim no FPS, percent speed gain, iPhone thermal improvement or 2160p sustained Safari guarantee without real device measurements.

**Merge remains artist-controlled.** Next after D4B green: F6 skins in small staged PRs, plus physical Safari endurance checks ahead of app-store deployment.
