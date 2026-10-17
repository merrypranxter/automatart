# D3B — LIVING VORONOI: ACTUAL VARIABLE-NEIGHBOR AUTOMATA

## Physics, not a polygon filter

The exact D3A bisector-clipped seed Voronoi partition now drives six synchronous local cellular automata: **Life-like, Brian's Brain, Cyclic, Generations, Excitable, and Species**. Each finite convex polygon reads only its *real, reciprocally shared full-edge neighbors*. No packed-index north/south/east/west shortcuts, no fake toroidal seams and no regular-hexagon assumption. Cells can have different numbers of genuine neighbors—including seven or more—which is materially different from fixed four-neighbor Penrose.

The original generator sites are seeded and displaced (jitter in 0..0.42); the actual Voronoi polygons, centroids, areas and graph edges change together with the jitter. Jitter 0 yields an exact regular square Voronoi limiting case. Changing jitter or seed restarts the world; color and rule changes retain living state. The normalized shape physics is part of reproducible recipes.

## Controls and artistic pipeline

**WORLD > Mathematical lattice > VORONOI** is now selectable for the six compatible engines. One slider labeled *Seeded site jitter — real polygon geometry* changes the real sites and graph. The familiar 32/48/64 packed-column cell-count settings work for all nine aspect ratios, including 9:16 and 1:1. Source tessellation complexity is limited to phone-sized cell arrays; final image pixel resolution is independent. No periodic edge wrap is allowed; the toggle is disabled and inconsistent imported recipes fail validation. The original seed randomizer also genuinely changes Voronoi geometry.

Starting patterns measure actual polygon centroids, not artificial storage address coordinates. Touch/pencil/stamps use **exact Euclidean nearest Voronoi site** to select a polygon, with a mathematically complete local search window even for skinny and jittered cells; they never depend on the low-resolution preview pixel map. Painting anchors and brush footprints are projected in physical space. The rest of the palette/skin dual-source and mutation UI remains intact. Entropy, diversity, unlike-state boundaries, gradient, flow and color interference are computed on the actual Voronoi graph; flow vectors are true centroid displacements.

**High-res native exports:** Like D2C Penrose, the PNG/GIF/video path directly draws each true polygon at final pixel resolution using the styled source cell material clipped into it; it does NOT upscale a 640px topology preview. All nine export ratios, fixed-frame camera, Print Shop, state save/replay and settled logic reuse the established rendering and capture pipeline. The live stage retains the lighter cached projection map for mobile responsiveness. Actual iPhone Safari 2160p, lengthy video captures, thermal and codec capabilities remain unverified on-device until D3C.

## Verification and limits

`node scripts/d3b-living-voronoi-smoke.mjs` tests D3A topology inheritance, deterministic jitter values 0/.34/.42, actual B7/variable-degree births, rejecting packed-array false neighbors, six CA state trajectories, colors, stamp painting, exact geometric picking across square/portrait/landscape, saved recipe/world snapshot and frame cursor replay, all nine artboard ratios, 2160p actual polygon PNG center pixels, and nonmutating art output.

All existing GitHub regression tests, build, browser GIF Worker tests, browser smooth-video tests and Netlify preview must pass before D3B is removed from Draft for an artist-owned merge. The D3C phase will focus on physical Safari performance/memory, mobile drawing ergonomics, look presets and high-resolution output acceptance. D4 integration and F6 skins remain subsequent phases. Never automatically merge.
