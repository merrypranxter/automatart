# D2A — Penrose P3 tilings: first the real geometry, then its living rules

## Mathematical engine (this PR only)

`src/engine/penrose.ts` implements the de Bruijn **five-grid (pentagrid)** construction. Five equal-spacing families of parallel grid lines at exact 72° successive normal rotations, with generic grid offsets summing to zero, are paired at line intersections. Each intersection produces a dual rhomb whose four corners come from projecting 5-dimensional integer floor vectors into 2D. It is not an image trace, shader distortion or repeated square grid.

This produces the **thin** rhomb (36° / 144°, area sin 36°) and **thick** rhomb (72° / 108°, area sin 72°), both with four true unit-length sides. The finite face graph is built from exact **matching 5-dimensional integer edge keys**, rather than geometric nearest-neighbor guesses. Each interior rhomb has four shared-edge neighbors; a boundary rhomb can have fewer after legitimate finite cropping.

The generator packs selected faces as `tiles[index]` into storage dimensions `w × h`, using a rectangular centered crop that fits roughly the desired artboard ratio **without deforming any rhomb**. A storage slot is not a physical 2D square. This helps preserve MATHEMAGICAL! portrait/square/landscape art sizing in the eventual integration. Generation is deterministic with stable indexing and cached repeat calls. A bounded 18,000-cell budget controls mobile memory; a later phase will tune the live UI/grid-size control.

### Critical topological constraints

- **No toroidal wrap**: a true aperiodic Penrose patch cannot seamlessly repeat both boundaries. Any engine/UI adaptation must **force or display finite-only boundaries**; claiming periodic wrapping would be mathematically dishonest.
- Never call the usual square-grid row/column neighbor offsets for Penrose. Use the precomputed edge graph or a function explicitly supplied the full patch dimensions.
- In geometry-aware rendering, hit testing, brush work and flow measurements, use each face's `vertices`, `centroid`, and exact `neighbors`, **not** packed `index % width` or `Math.floor(index/width)` as a spatial metric.
- Changing shape, crop dimensions or a future inflation/offset parameter creates a new graph. Preserving capture/replay requires persisting or precisely regenerating those settings.
- The math returns correct geometry and topology, but **is deliberately not exposed yet in the lattice selector**. There are currently no Penrose CA updates or saved Penrose recipes. This is a foundational testable D2A PR, not a falsely advertised completed D2 instrument.

## D2 continuation (separate merge gates)

**D2B — Living Penrose:** integrate graph-based state stepping and maximum four-edge counts into the six compatible local-rule engines. Keep incompatible square-only rules disabled. Wire actual polygon projection, touch and brush painting, color/vector measurements and deterministic snapshots. Hard-disable wrap while Penrose is chosen; verify saved recipe parsing.

**D2C — Production/art QA:** exact all-nine artboard framing, PNG/GIF/video and GIF loops, comparison with earlier tessellations, browser recorder smoke and actual iPhone Safari profiling. Explicitly test that 9:16 and 1:1 are physically faithful. Optional future Penrose inflation/deflation is a separate real geometry control, never only a skin.

## Tests / merging

`node scripts/d2a-penrose-smoke.mjs` builds the TS module and checks four patch shapes: exactly four polygon sides of Euclidean unit length, exact thin/thick rhomb areas, both rhomb species, finite-boundary degree, reciprocal shared-edge adjacency confirmed independently by coordinate-quantized geometry, deterministic caching, variable portrait/landscape extents and explicit no-wrap contract. Run full existing GitHub build and Chromium GIF/video tests as regression guards. Do not merge until CI passes and the artist approves.
