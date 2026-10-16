# D1B — Kagome / trihexagonal 3.6.3.6 lattice

## The mathematics

Rectification of the ordinary pointy-top honeycomb yields one **regular hexagon face** and two **equilateral triangle faces** per honeycomb motif, with a common edge length of √3/2 relative to original hex radius 1. Every face is a cell. The 6 neighbors of a hexagon and 3 neighbors of a triangle are the faces sharing exactly one full geometric edge; meeting only at a point never qualifies. Formulaic parity-aware offsets have been compared to actual polygon side segments and toroidal reciprocal adjacencies.

The world index is packed: x=3*originalHexColumn+sector (0 hex, 1 top triangle, 2 bottom triangle). y is an odd-r honeycomb row. This does not imply a Cartesian metric. World width rounds to full motifs, height to an even number of rows; wrap is a true periodic adjacency when the dimensions comply. The projection uses physical bounds, true polygons, and geometric centroid-based multi-cell painting, not square stamping.

## Artistic behavior

World → Mathematical lattice → KAGOME. The existing Life-like, Brian's Brain, Cyclic, Generations, Excitable Flesh, and Species War use this graph with their usual synchronous rules. Hex sites can count up to 6, triangle sites up to 3. Same law, different possible local neighborhoods. A custom Life rule B3/6 gives different ways for hex and triangle cells to ignite. The editable square directional 3×3/5×5 neighborhoods and square-only engines remain inapplicable and are disabled rather than silently reinterpreted.

All skins, print effects, color mappings and history use the usual common renderer with a physical polygon projection. Distances and flow directions use physical centroids for packed motifs. Portrait/square/landscape PNG, GIF and video preserve natural tile proportions via fit/crop rather than stretching. Saved recipes, complete world snapshots and capture clones still use the standard versioned format. Real iPhone Safari performance must be verified separately.

## Required verification

The feature smoke test reconstructs every interior shared edge and tests exact 6/3 degrees, finite and wrapped reciprocity, equilateral triangle/regular hex areas, polygon projection and tap hit detection, genuinely different B3/B6 births, six engine trajectories, seeded snapshots, paint, color signals, recorder cursor and output framing. Run the full TypeScript production build and browser exports before merging. **Never automatically merge on behalf of the artist.**
