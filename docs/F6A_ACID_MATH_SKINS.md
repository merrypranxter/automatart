# F6A — Acid Mathematics: first three new living material skins

## Artist-facing changes

In **SKIN > Rendering Skin > F6A · ACID MATHEMATICS / FLAT INK**, choose one of three mathematically different surface effects:

1. **PRISMATIC SHEAR · INTERFERENCE** — crossing oblique spatial phase fronts with live density-gradient shear and generation-locked diffraction beats. Smooth, saturated prismatic fringes, not a blur or glow overlay.
2. **CRYSTAL FRACTURE · HARD FACETS** — hard-edged chromatic orientation sectors quantized from the actual cellular field gradient, with local curvature controlling facet bands and dark edge separation. Pixel-perfect cell material; no mandatory glow.
3. **SPINODAL INK · LAPLACIAN BANDS** — sharp, candy-colored bands computed from the *discrete Laplacian* of the real living cellular field. This is **not** a new reaction–diffusion simulation: the actual automaton state is unchanged; the curvature is used for the visual material.

Three independent artist knobs operate on these skins: **Mathematical frequency** (0.5–12), **Cell field deformation** (0–2), and **Hard-edge ink / separation** (0–1). The underlying effect supports existing color palettes, a live cell pigment contribution, optional dual-color source and existing frequency/color-cycle movement. The F6 skins never force luminous bloom or dark metallic rendering. Existing skin types, old saved recipes and global color controls remain available. Choosing a skin is visual-only.

## Real mathematics

Input is the current integer cell-state field, with physical quantities respecting the engine's actual material (sandpile grain magnitude, Cyclic/Species state, HPP occupied particle/wall material, forest fire, Ising, Hodgepodge and history traces). The first differential pass computes gradients and an averaged Laplacian from **actual legal neighbor IDs**. Penrose and Voronoi use D4B cached full-shared-edge compressed physical graphs; physical centroid distances scale gradients so they are not secretly calculated on a fake square lattice. Other six tilings use their established engine offset neighborhoods and finite/wrapping boundary behavior. The visual field then undergoes deterministic interference phase, directional facet quantization or curvature-dependent band thresholds.

The pigment update depends on the simulation's integer generation and saved seeds, not wall clock or mutable random numbers. New visual materials do NOT change rules, cell arrays, topology, neighbors, paints, trace generation, capture scheduling, or user-selected native output geometry. Existing square output stays crisp and Penrose/Voronoi D2C/D3C polygon export remains direct at final image resolution; do not confuse cell-source material frequency with a new high-resolution vector texture generator.

## Verification

`node scripts/f6a-math-skins-smoke.mjs` covers square, hex, triangle, rhombille, Kagome, square-octagon, real Penrose, real Voronoi including zero/max jitter; 3 mathematically distinct skin fingerprints on live moving worlds, independent response to all three knobs, exact snapshot/recipe reproducibility, complete non-mutation of the CA, 720px real PNG export and correct physical graph usage. Extended `node scripts/skin-smoke.mjs` demands all **10** existing/new skin appearances remain distinct.

`node scripts/f6a-skins-browser-smoke.mjs` opens the built Vite app in a 390px Chromium mobile viewport, selects every new skin, exercises the three actual on-screen sliders, proves visible visual response, no horizontal scrolling and no JS errors. All legacy math regressions, GIF Worker, video recording, and Netlify preview must pass before this PR is marked merge-ready.

This is F6A. Future **F6B** can add more artist materials and output-detail controls; don't automatically merge, invent speed claims, or imply sustained iPhone 4K capture has been physically verified.
