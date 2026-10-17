# D1C — SQUARE–OCTAGON MADNESS (4.8.8)

## Mathematical definition

This is the **Archimedean truncated-square 4.8.8 tiling**, constructed by truncating every vertex of an axis-aligned square lattice. For regular faces sharing an edge of length 1, set the untruncated source square period to `L = 1 + sqrt(2)` and the corner cut distance to `a = 1/sqrt(2)`.

Each old square face becomes a genuine 8-sided regular octagon of area `2(1 + sqrt(2))`. Each old lattice vertex becomes a diamond-oriented true regular square of area `1`. These tile the plane because `L² = octagonArea + squareArea`. Octagon-to-octagon contacts are the four straight edges; octagon-to-square contacts are four slanted edges. Squares only contact octagons. A mere vertex touch is **never a neighbor**.

Internal simulation address `x = 2 * oldColumn + sector`, `sector 0=octagon, 1=vertex square`, `y=oldRow`. This is a packed cell index, **not** a Cartesian coordinate. The physical polygons and neighbor offsets are both derived from the same truncation model. The periodic quotient has exact reciprocal neighbor relationships for any positive row count and an even packed width.

## Art-production integration

- WORLD → Mathematical lattice → **SQUARE–OCTAGON (D1C)**. Shared rules can produce different local effects from mixed neighbor degree: octagons have 8 genuine edge neighbors; squares have 4. A global custom Life rule B4/8 activates both families from their full-degree neighborhoods. Other rule behaviors are naturally degree-dependent (and do not pretend to have 8 neighbors on square tiles).
- **Six compatible engines:** Life-like, Brian's Brain, Cyclic, Generations, Excitable Flesh, Species War. Square-only engines remain restricted. The extended square stencils cannot be silently reused on this graph.
- Polygon projection and touch picking use actual physical face boundaries. Brush and stamp footprints use real cell centroids, not meaningless packed x-axis movement. Color flow and gradient use physical centroid directions; histories, materials, skins and postprocessing stay visual only.
- World widths contain complete 2-tile motifs, with a natural 1:2 row calibration for square aspect; square, 9:16 and seven other artwork sizes share the suite's exact world/framing API. PNG, GIF and video frame composition **fits or crops physical polygons without stretching**; existing recipe snapshots, deterministic simulation and capture cursor are preserved.
- The bounded finite patch has honest incomplete border adjacency where a neighbor lies outside the world. Enabling wrap creates exact periodic adjacency, not newly invented perimeter polygons. The pixel projection uses the finite patch bounds, with honest absent cells at the corners.

## Verification / merge gate

Run `node scripts/d1c-squareoct-smoke.mjs` and the full GitHub Actions suite. Prove regular polygons, exact full-edge graph for every interior site, mixed 4/8 degrees, finite/wrapped reciprocal topology, non-overlapping shared-edge geometry, authentic B4 and B8 births, six engine transitions, polygon picking, physical brushes, color signals, snapshots, capture replay and export aspect. Repeat the existing Chromium GIF and real-time video suites. Record manual iPhone Safari preview/performance acceptance separately.

**Do not merge before CI/review. The artist owns every merge.**
