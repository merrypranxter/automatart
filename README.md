# AUTOMATART ⚡

A zero-subscription, browser-based **cellular automata art instrument**. Not just Life with a palette: the long-term design connects cell states and mathematical events to colors, visual treatments, and eventually other rules through a Rule-to-Art Patchbay.

## Status
**Phases 0–1, chroma controls, Z1 Mutant Zoo, Z2 Skin Machine, Z3 Strange Lattices and early recorder shipped:** responsive app foundation, ten simulation families, live painting, colorful rendering, PNG stills, JSON recipes, browser-local GIF export and MP4/WebM video recording. Expanded patch cables, APNG and loop-hunting are future phases.

## Getting started
```bash
npm install
npm run dev
```
Open the localhost URL printed by Vite. Production: `npm run build`, output in `dist/`. Netlify publish directory: `dist`.

## Engines
- **Life-like:** Conway (B3/S23), HighLife (B36/S23), Seeds (B2/S), Day & Night (B3678/S34678).
- **Generations:** Brian's Brain, with firing, refractory, and resting cells.
- **Cyclic:** multistate predator/chaser automata, with configurable number of states and threshold.
- **Wolfram 1D:** Rule 30, 90, 110 and custom 0–255, drawn as scrolling history.
- **Afterlife / Generations B/S/C:** customizable birth/survival counts and 3–24 total states; 1=live, 2..C−1=refractory.
- **Excitable Flesh:** Greenberg–Hastings-style local waves with 3–24 recovery states and editable excitation threshold.
- **Larger Than Life-inspired:** binary range-totalistic rules over square neighborhoods of radius 1–5.
- **Species War:** original deterministic local competition between 2–8 species; tie-breaking, defense, survival and invasion parameters.

New species and states are ordinary data in the simulation and are rendered with the same shared palettes and export mechanisms. These are real automata transition functions, not visual-filter mode names.

The model uses typed arrays, seeded generation, wrap/no-wrap boundaries and separate rendering; controls preserve the deterministic seed where applicable.

## Mutant Zoo Master Roadmap

See [the complete 10-milestone implementation plan](docs/MUTANT_ZOO_ROADMAP.md). **Z1 shipped**: four new local-rule CA families. Z2–Z9 are planned, NOT shipped.

## Original Roadmap
- [x] Repository initialized
- [x] **Phase 0:** Vite + React + TypeScript shell, responsive pinned preview, clean deployment config
- [x] **Phase 1:** Four running engines; start/pause/step/reset; paint; cell resolution; saved recipe; grid overlay
- [ ] **Phase 2:** Advanced Rule-to-Art mappings (state, age, neighbors, events), custom palette automation
- [ ] **Phase 3:** Organic skins, contours, particles, glows and alpha-clean compositing
- [~] **Phase 4 (partially shipped early):** GIF + real-time browser MP4/WebM, fixed or until-still duration, resolution/FPS choices, cancel/progress. APNG, advanced loop tools and offline video rendering remain later work
- [ ] **Phase 5:** Mutation gallery, parameter search, local rule generator
- [ ] **Phase 6:** Multiple species, territories, rule parasites, breeding
- [ ] **Phase 7:** Lenia / SmoothLife, exotic topology and hybrid mathematical engines

## Design constraints
- Browser-local simulation; no AI API key, account, backend, or cloud compute cost.
- Simulation grid and display/export resolution are separate concepts.
- Deterministic simulation ticks, not display-frame-dependent updates.
- Future patch mappings are **data** (a schema), not arbitrary runtime JavaScript.
- GIF export uses gifenc; video uses native MediaRecorder and canvas capture (MP4 vs WebM varies by browser). Real-time video capture requires the tab to remain open and may not be supported on every iOS/browser combination.
- Export does not mutate the live simulation: it clones the world or starts again from its saved seed. Preset duration is 10/30/60/120/300 sec or a custom 1–600 sec; until-still uses a three-generation stability check with a 600-sec cap.
- GIF colors are quantized to 256 per frame; long high-resolution exports can consume substantial memory and may fail on mobile. Prefer 480p/10fps for GIF.
- Mobile canvas remains visible while controls scroll.
- Avoid premultiplied-alpha dirty mattes for future transparent exports.

Original art/code project by merrypranxter.

## Recorder diagnostics / mobile notes
- Exports display an inline playable GIF/video preview and report frames + changing simulation steps. A static result can be differentiated from a paused/dead automaton.
- Video capture uses an attached, visible recording canvas and does not resize the captureStream surface. It yields to requestAnimationFrame to publish pixels; MediaRecorder support remains browser-dependent.
- GIF uses one coherent palette and maps subsequent frames to it, greatly reducing per-frame quantization work; the completed GIF is structurally scanned to confirm its frame count.
- High-resolution/long GIFs can overwhelm mobile Safari, so fixed-duration oversize runs are rejected with advice to use video. Until-settled GIFs apply a frame-budget safety cap.

## 2026-10-11 recorder usability repair
- GIF encoding is moved to a dedicated Web Worker with frame-by-frame backpressure. The UI reports progress and supports cancellation instead of appearing frozen during expensive quantization.
- Export status, save/share, and failure messages are shown directly under the sticky preview, not only down inside the control rack (which was invisible on iPhone while recording).
- iPhone does not auto-trigger the download: tap **SAVE / SHARE** in the sticky status area or Recorder when complete.
- Initial mobile-friendly GIF defaults are 10 seconds, 360p, and 10 FPS; users can still select longer/larger exports.
- The app yields two browser paint frames before initiating recording so the progress surface and recorder canvas are ready.

## Z2 Skin Machine (2026-10-11)
- **7 render skins:** pixel, smooth, phosphor glow, *Topological Lace* (marching-squares contour isolines), *Mercury Flesh* (smoothed density membrane), *Metallic Relief* (slope-dependent illumination), *Living Stained Glass* (cell state transition boundaries).
- **History overlays on any skin:** Temporal RGB maps current, previous and earlier generations to separate channels; chromatic fossil strength decays from death/change events. Added history typed arrays are simulation metadata only and **never** influence transition rules.
- **Controls:** threshold, line count/thickness, metallic highlights, pane-leading strength, time ghost strength, fossil visibility, and material glow. Same render function is called by live preview, PNG, GIF and video exporter.
- **Browser/performance:** contours sample a capped density grid to limit draw work on phones. High resolution export still costs CPU/memory. GPU rendering and true 3D materials remain future work.
- **Recorder clone:** new history arrays are copied when recording an already-running world. Older JSON recipes load with migration defaults.
- **Quality gates:** automated pure sim/history/render pixel comparison, GIF encode/decode, and production browser test with all skins.

## Z3 Strange Lattices
- **New genuine neighborhood graphs:** six-edge hexagonal odd-row offset lattice, and three-edge alternating triangular lattice. Square topology remains; unsupported engines force square with an explanation. For wrap-around, dimensions are even to preserve reciprocal adjacency.
- **Directional Life:** Eight-neighbor non-totalistic birth stencil (N, NE, E, etc.), exact/contains conditions, fixed orientation or 90° rotated or reflected equivalence, plus independent survival count interval.
- **Reversible Margolus:** A 2×2 clockwise permutation with staggered 2×2 partitions each generation. Reverse-step is the inverse permutation of the previous block phase; **cell states are exactly reversible**. Color fossils and cell ages are visualization histories, not reversible metadata.
- **Real geometric rendering:** hex/triangle polygons project the existing seven skins and all palettes onto their genuine lattice cells; canvas tap/paint uses the same cell geometry projection.
- **Export parity:** recording clones lattice/history metadata. GIF/video/still export use the same shape projection as playback. Large mobile render costs remain bounded; 9:16/1:1/16:9 canvas can stretch the visible polygon aspect for the requested art format, but local adjacency stays mathematically exact.
- **Validated:** symmetric neighbor graphs, actual birth counts, oriented symmetry, 12-tick forward-and-inverse block evolution, geometric tapping, deterministic replay, and a real-browser hex GIF test.
