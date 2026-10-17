# F6C — Three mathematical singularity pigments

F6C follows the artist-approved F6A and F6B visual skin work. This PR increases the suite from **13 to 16 genuinely distinct rendering styles** without changing any automata state transitions, seeds, physical tilings or output format contracts.

## Three new materials

**GYROID GUTS — 3D IMPLICIT SLICE**

The gyroid level-set scalar is the genuine triply periodic implicit function

`g(x,y,z) = sin(x) cos(y) + sin(y) cos(z) + sin(z) cos(x)`.

The app samples this field on the real cell centroids, with the third coordinate driven by **Surface slice** and the actual living cellular field. Mathematically real local gradient and normalized cell-edge Laplacian produce surface displacement, ridge ink at the zero-level set, and colored isobands. This is an animated **section** of a 3D implicit surface, not a full 3D mesh or a numerical minimal-surface solver.

**INVERSION BLOOM — TRUE CIRCLE INVERSION**

Coordinates are mapped under exact Euclidean circle inversion with center c and radius R:

`I(z)=c + R²(z-c)/|z-c|²`.

The new **Mathematical center X/Y** controls move the inversion pole through the art. The pole itself is treated as a nonfinite point and given a distinct material pixel; the implementation does **not** silently substitute a false finite inverse. Circumferential and radial phases in the inverted plane generate concentric inside-out flowers, nested islands and sharp color separations, with living neighbor gradients bending the source sampling point. Inversion is an involution away from the pole: `I(I(z)) = z`, enforced by independent mathematical tests.

**CUSP CATASTROPHE — FOLD DISCRIMINANT**

The canonical cusp discriminant of the stationary cubic `t³+u*t+v=0` is `D(u,v)=4u³+27v²`. The sign determines whether the cubic has one or three distinct real stationary solutions (away from D=0). Repeated angular sectors produce colored multi-cusp fields; actual cellular neighbor gradients deform the coordinates and signed log-magnitude bands distinguish sides of the fold. The critical cusp `u=-3t², v=2t³` satisfies `D=0`, verified by an analytic test. This is a **visualization of the catastrophe equation**, not a new physical cellular update rule.

## Eight mathematical controls, not a reskin

Each F6C option exposes **Mathematical frequency**, **Physical field deformation**, **Flat-ink ridge strength**, **Symmetry order** (3..12), **Phase twist**, **Surface slice / catastrophe offset** (-2..2), **Mathematical center X** (.05..95), and **Mathematical center Y** (.05..95). All controls change the formulas, not just a Photoshop-style filter intensity. The new three values have bounded recipe defaults and safe numeric validation; previous F6A/F6B recipes keep their exact appearances. The existing palette, artist dual-color and Print Shop tools stay integrated, and zero glow is a supported intentional outcome.

All three materials use actual cell geometry. In Penrose and Voronoi, the D4B cached physical shared-edge graph provides source centroids and differential estimates—no hidden square neighbor approximation. Six other tilings follow their established legal neighbor offsets. Animation is deterministic and indexed by the integer simulation generation, so identical saved states and export frames reproduce identical pigment pixels.

Important output distinction: F6C creates one mathematically derived material sample per source cellular element. Existing PNG/GIF/video encoders and pixel-sized artboards preserve their output resolutions, and genuine Penrose/Voronoi polygon export still draws real polygons at final size. This is **not** new continuous subcell shader detail or proof of iPhone 2160p thermal endurance.

## Acceptance suite

- `node scripts/f6c-math-skins-smoke.mjs`: eight lattice types, nine dimension/seed/jitter cases, three actual skin fingerprints each (27 cases), response to all eight controls, original world snapshot parity, deterministic recipe replay, true PNG output, and the gyroid/circle-inversion/cusp identities above.
- `node scripts/f6c-skins-browser-smoke.mjs`: real 390px Chromium UI test for all three skins, eight controls, slider-derived live changes, zero necessary bloom, and no overflow or browser exceptions.
- Existing `skin-smoke.mjs` expands its all-distinct appearance gate to **16 skins**.
- Full old physical CA, saved recipe, high-resolution PNG and browser GIF/real video regression tests, plus Netlify preview, must all pass before PR becomes merge-ready.

**The user owns all merges.** Future F6D can improve subcell visual detail, parameter routing, or add more novel materials. Actual iPhone Safari extended export endurance still requires on-device verification.
