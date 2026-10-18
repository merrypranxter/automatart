# F6G — Living Microscopic Ink

F6D–F6F brought genuine, opt-in mathematical structure inside nine different mathematical material skins and sharpened their edges under a global work limit. F6G makes the **internal mathematical structure artist-directed** rather than simply another fixed shader.

## Skin Laboratory controls

Visible on each of the nine existing equation skins only when subcell quality is nonzero:

- **Micro equation rotation** (-180° … 180°, default 0): rotate the *local equation sampling plane* around each physical polygon's bounding-box center before evaluating gyroid/inversion/cusp or one of the six F6A/B analytic micro-equations. This changes the actual mathematical pattern, not the camera, canvas coordinates, cell positions, polygon masks or lattice graph.
- **Micro time speed** (-3 … 3, default 1): independently scale the exact cellular generation supplied to the microscopic equation sampler. Negative values reverse its internal phase, positive values speed it up, and 0 freezes its **explicit time phase**. The live CA fields and outer material color phases still respond to the evolving world, so 0 isn't falsely advertised as a fully frozen image.
- **Micro ink band shift** (-8 … 8, default 0): offset only the internal palette-band indexing, preserving the original flat palette, crisp F6F boundaries, and conventional base color mapping. Fractional shift creates different band boundaries, not an RGB tint hack.

The sliders affect only the optional mathematical micro-overlay; quality 0 or intensity 0 remain byte-identical to the old material. Identity defaults reproduce prior F6F output for a given world. All eight physical lattices retain true polygon clipping and physical neighbor gradients.

## Deterministic rendering and recording

All controls depend on immutable world state and integer generation alone; no Date.now, animations outside the simulation clock, extra equation passes, or new large buffers. Same numerical values are applied in preview, PNG, GIF, video, old/replayed saved recipes and Print Shop via the shared renderWorld path. Parameters are strictly finite/clamped on recipe import. Reset Skin Lab restores defaults.

**Acceptance:** new F6G math-and-render smoke covers identity/rotation/time/band transforms, 9 material families on square, Penrose and Voronoi, 0-detail and 0-mix exact fallback, deterministic repeat/saved state, physically unchanged CA, and finite work budgets. A mobile 390px browser smoke tests visible controls, painting changes, reset, and no overflow or browser errors. Existing F6D/F6E/F6F mathematics and actual GIF/video browser recorder gates must remain green.

iPhone Safari sustained high-resolution thermal and memory acceptance remains on-device testing, not guaranteed by CI. The artist controls all merges.
