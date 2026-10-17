# F6B — Quasicrystals, the Poincaré Portal and Lissajous Braid

The second distinct three-material batch expands Automatart's **Skin** menu from ten to thirteen looks. All three F6B pigments are deterministic functions of the current automaton states, its *real neighbor relations*, the chosen artist palette, and integer simulation generation. They add no rules and never replace genuine Penrose/Voronoi geometry with a fabricated square world.

## Artists: three new skin materials

**Quasicrystal Star — Fivefold Waves** sums standing plane waves whose direction vectors are equally distributed around a regular \(N\)-gon. Fivefold symmetry is default and makes non-lattice-commensurate star patterns; artists can choose symmetry orders 3 to 12. Live cell-state gradient shifts the plane-wave sampling position. Pattern wave maxima, superposed detail and discrete color bands determine flat colored starbursts; phase advances as the source automata evolve. *Quasicrystal-inspired optical field; not a simulated atomistic quasicrystal.*

**Poincaré Portal — Möbius Disk** takes cell coordinates inside the open unit disk and applies the actual disk automorphism \(w=(z-a)/(1-\\overline a z)\), with |a| strictly below 1 (the degree of live gradient deformation controls a). A hyperbolic radial coordinate \(\\rho=\\operatorname{atanh}(|w|)\) and angular sector subdivisions produce self-compressing rings and colored kaleidoscopic regions. Twist, fold order, and generation phase reshape the real mathematical parameter field. This is a true hyperbolic transformation, not a fisheye effect or a claim that the full canvas is hyperbolically tiled.

**Lissajous Braid — Over/Under Ink** computes two different nonlinear oscillation/stripe phase families with fold-dependent harmonic ratios and cell-gradient displacements. At strip crossings, integer crossing parity determines which color ribbon is drawn over the other; off-ribbon regions use a lower-contrast interstitial palette. This is generative optical weaving, not a physical simulation of knotted fibers.

## Five independent knobs

F6B offers **Spatial frequency** (0.5–12), **Living field deformation** (0–2), **Flat ink separation** (0–1), **Symmetry order** (integer 3–12), and **Phase twist** (0–2). Zero ink intentionally allows full flat-color drawing; bloom is not necessary. For compatibility the first three F6B controls reuse F6A's bounded parameters, while fold/twist are new. User recipes export/save all five with validated bounds; old recipes receive safe defaults. The additional two knobs never change any other material.

The physical gradient/laplacian is computed from actual source cells. For Penrose and Voronoi it uses the D4B cached reciprocal polygon-edge graph and exact physical centroid deltas, not integer packed-grid proximity. For the other six tilings it uses their established legal neighborhood offsets. Integer generation plus saved seed ensures GIF/video and manual stills sample identical colors whenever they sample the same world generation.

## Testing and limits

`node scripts/f6b-math-skins-smoke.mjs` covers nine seeded topology, ratio and jitter combinations spanning **all eight lattices**, 27 real skin renders, changes to all five artist controls, genuine pigment reaction to CA evolution, exact state/recipe replay, unchanged CA state, and real output PNG pixel dimensions. It also independently checks that the correctly computed Möbius transform maps many interior disk points back into the disk. The legacy `skin-smoke` now requires **13 distinct skin fingerprints**.

`node scripts/f6b-skins-browser-smoke.mjs` boots the production app in a **390px mobile Chromium** viewport and interacts with each new real Skin Lab option and its sliders. All D1–D4 and F6A physics, iPhone-sized panels, browser GIF worker and WebCodecs video checks, and successful Netlify preview still gate merge.

The material is computed in per-source-cell pigment space; it does not fabricate extra spatial resolution beyond the existing true high-res Penrose/Voronoi polygon exporter. Physical Safari device sustained-recording/thermal/codec testing remains unverified. User owns merges. F6C can continue with more skins or material resolution modes.
