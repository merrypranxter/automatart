# D4A — Studio integration: real topology inspector + cross-lattice QA

## Scope: first D4 integration pass

The studio has eight actual cell geometries: **square, hex, triangle, rhombille, kagome, square–octagon, P3 Penrose, Voronoi**. This phase consolidates quality assurance after D1/D2/D3, checks that world replacement is safe and gives the artist a way to **read the mathematics of a selected cell** instead of treating every tile as a storage-grid square.

### Real cell inspector
When a user paints or taps a cell, a compact inspector below the stage displays the lattice, actual cell index, number of **physical/rule neighborhood edges**, current number of **nonzero neighbor cell values**, true polygon area (native physical units), state, and whether the cell touches a finite boundary. No extra overlay obscures the artwork, and the information is computed directly from the world plus the corresponding mathematical topology:

- Penrose: genuine pentagrid P3 tile and its real shared-edge neighbors.
- Voronoi: seeded/jittered bisector cell area and exact full-edge neighbors.
- Rhombille / Kagome / square-octagon / hex / triangle: real motif/offset edges and polygon path; finite boundaries are respected.
- Square: currently selected rule stencil (Moore, Von Neumann, custom and extended radii), with wrap bounded by live settings.

The readout is **not** a claim that current nonzero neighbors are always the number of eligible excited-neighbor votes for every engine. In Cyclic for example the 'active' rule counts chaser colors, and Brian's Brain counts firing cells, so the inspector explicitly labels it 'NONZERO NEIGHBORS' and keeps the simulation/renderer separate. Area is in native physical polygon units, not PNG pixels or physical real-world area.

### World-switching safety
When a new true world is constructed (engine, seed, initial pattern, cell count, aspect, lattice or Voronoi jitter), its older cell selection, hover and in-flight brush pointer positions are discarded. That prevents displaying the previous seed's polygon index or extending a stroke into a completely unrelated lattice. This also applies to restoring a recipe; its saved living cells remain intact. Rule-only changes preserve the current universe, as before. 'Clear inspected cell' closes the inspector without changing any cells.

### Verification and acceptance
`node scripts/d4a-suite-integration-smoke.mjs` covers **16 lattice/aspect combinations, 96 deterministic CA universes, 64 physical polygon inspections**, exact integer world snapshot save/restore, one-step capture cursor parity, all nine export frame geometries, PNG snapshots, and finite Penrose/Voronoi no-wrap physics. It independently checks polygon shoelace areas, exact Penrose/Voronoi centroid selection, complete typed state fidelity and genuine neighbor addresses.

`node scripts/d4a-inspector-browser-smoke.mjs` runs the actual production build at 390px and verifies real Voronoi and Penrose inspection, slider geometry regeneration and new seed invalidating old selections, close operation, zero page errors and no phone-width horizontal overflow.

The full legacy CI, GIF Worker and real video browser recording, Netlify must all pass before PR is merge-ready. No automatic merge. Actual iPhone/Safari long-duration 2160p acceptance remains a required on-device gate. F6 optional skins follows D4 stabilization, not before.

This is **D4A**—not a claim that physical iPhone acceptance or every future studio expansion is complete.
