# F6E — Six more actual micro-equations INSIDE living cells

F6D established opt-in true within-polygon sampling for three F6C skins. F6E extends the **same globally bounded small-texture pipeline** to all six existing F6A/F6B mathematical materials: **Prismatic Shear**, **Crystal Fracture**, **Spinodal Ink**, **Quasicrystal Star**, **Poincaré Portal** and **Lissajous Braid**. This gives nine existing mathematical skins optional finer-than-cell pigments, without adding new skin names or changing any engine.

## Mathematical implementation

- **Prismatic Shear:** evaluate both oblique interference phase fronts independently at new subcell positions while respecting source live gradient distortion and generation phase.
- **Crystal Fracture:** evaluate quantized directional facet sectors from subcell coordinates distorted by actual cellular field gradients; preserve crisp color partitions rather than blurring.
- **Spinodal Ink:** compute live-cell Laplacian-coupled spatial phase bands separately at multiple positions within each original cell. This is a pigment equation, not simulated reaction-diffusion kinetics.
- **Quasicrystal Star:** evaluate all N actual standing plane-wave directions (fivefold by default) at each new point, including the original differential shear and phase. Fold symmetry is a real change in wave-vector directions.
- **Poincaré Portal:** apply the genuine complex Möbius disk automorphism (z−a)/(1−conj(a)z) and `atanh(|w|)` hyperbolic radius, then sample radial/angular color structure at subcell coordinates. The warp field derives from actual source-cell neighbors.
- **Lissajous Braid:** evaluate both nonlinear stripe phase families independently at subcell positions and choose over/under at crossings by the deterministic parity of their phases.

Each new scalar sample maps to existing artist palettes, preserving saturated flat color and optional ink separation. The exported composite clips the resulting pigment to the **true original mathematical polygon**. On Penrose/Voronoi this uses genuine P3/seeded Voronoi boundaries and their D4B physical shared-edge adjacency; on the other six lattice types it uses established legal stencil neighbors and physical polygon outlines. No fake rectangular tile substitutions and no mutation of the CA.

## Controls, compatibility and budget

Each F6A/B Skin Laboratory panel now exposes the same three F6D controls: **Subcell quality (0–3)**, **Microscopic equation frequency (0.5–12)**, and **Microscopic flat-ink intensity (0–1)**. Quality 0 is the default for all old/new recipes: *exact old artwork*. At any quality, strength 0 returns the same old image pixel-for-pixel. These parameters already have bounded validation and are included in recipe export; F6E adds no new recipe schema.

Sampling remains globally bounded per frame by **80k / 120k / 180k live-preview** and **100k / 240k / 420k export** evaluations at quality 1/2/3. The same small per-cell work tile is reused; there is no full-frame additional 2160p RGBA shader buffer and no animation wall-clock dependence. As in F6D, high detail costs additional calculation and can slow native iPhone video/GIF export. Quality 0 changes none of the existing processing costs.

F6E does **not** apply microscopic detail to the other seven classic/legacy skins yet; F6F could consolidate future full-resolution pigment sampling, spatial antialiasing and performance profiling. Quality caps are engineering work budgets, **not** measured claims of 4K output frame rate or evidence of physical iPhone Safari endurance.

## Automated acceptance

- `node scripts/f6e-microdetail-smoke.mjs`: nine cases spanning all eight geometries, six individual original mathematical material formulas (54 living render cases). Verifies true within-one-cell equation variability, quality/frequency/strength pixel changes, exact original appearance on disabled/zero mix, exact world snapshot replay, generation-dependent updates, no CA mutation, finite physical graphs and strict bounded work budgets. Also exports native-dimension 1:1 and 9:16 PNG frames for genuine Voronoi clipping.
- `node scripts/f6e-microdetail-browser-smoke.mjs`: real built production app in a 390px Chromium phone viewport, selects six skins, sets true 0/3 quality, exercises microscopic frequency, confirms no-mix restores old artwork for every one, and checks no overflow or JS errors.
- All earlier mathematical tests across D1–D4/F6A–F6D, native GIF Worker and smooth-browser-video recorder regressions and successful Netlify deploy preview must pass before Draft can be removed.

The user controls every GitHub merge. The three original F6C subcell skins remain unchanged.
