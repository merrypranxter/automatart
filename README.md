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

## Recorder reliability / dismissible UI fix (2026-10-11)
- The old mobile GIF preflight estimate multiplied width × height × requested frames and treated all raw pixel work as retained memory, rejecting valid 720p/30-second exports before they began.
- GIF rendering still processes one frame at a time, with compression off the main thread. The worker now measures **actual encoded GIF bytes** every six frames and, if it reaches a device-aware output limit (96 MiB on mobile, 256 MiB elsewhere), finishes and saves the partial GIF with an explicit size-limit message. Arbitrarily huge GIFs may still be constrained by device memory.
- Every persistent UI notice has a labeled **✕**: sticky export errors, inline export errors, large GIF advice, unavailable video support, static-animation warning, finished exports, and transient status messages. Shared recorder errors dismiss together; status toasts auto-dismiss after seven seconds.
- Recording restores live play/pause state after finishing, cancellation, or failure.
- Browser smoke test checks 720p/30s actually starts encoding, verifies the large-GIF advisory and both failure alerts dismiss, then encodes/decodes an actual short GIF.

## Color cycling in GIF export — frame-local palettes (2026-10-11)
**Regression fixed:** The previous GIF worker and fallback quantized only the opening animation frame and mapped all subsequent pixel colors to that first global palette. Color changes from animated palette rotation could not be faithfully represented in the output even though video looked correct.
- GIF89a supports a local color table per frame. The exporter now calculates a fresh <=256-color palette for **every** frame and writes it to the image descriptor. This preserves genuinely evolving palette cycling and changes of hue over the full animation.
- On high-resolution mobile recordings, quantization uses a bounded, spatially spread RGBA sample (max ~24,576 colors sampled) while every pixel is still indexed using a cached nearest-color lookup. Backpressure continues to transfer only one frame at a time to the worker.
- Both the browser Worker and non-Worker fallback share the same palette/index algorithm, so their color behavior is consistent.
- This retains normal GIF constraints: 256 colors **per frame**, so soft gradients and bloom will still be approximated compared with full-color video, but the animation is not trapped by colors in frame one.
- Automated regression verifies four dramatically different hues survive GIF encode/decode and compares every decoded frame of a real palette-cycling automaton with its full-color renderer. The Chromium UI smoke test verifies the Worker writes local palettes that actually change.

## FUNHOUSE F1 — Rule Roulette + Color Dice + Precision Stepping
See [Funhouse Roadmap](docs/FUNHOUSE_ROADMAP.md) for the rest of the finishing phases (F2–F5 are NOT yet shipped).
- Six additional genuine Life-like totalistic rules: Maze B3/S12345, Mazectric B3/S1234, Replicator B1357/S1357, Diamoeba B35678/S5678, Coral B3/S45678, Amoeba B357/S1358.
- STEP +10 and STEP +100: intentional asynchronous 3-generation chunks yielding to animation frames. Keeps the UI responsive, tracks exact generations, and cancels pending work on resets, painting, rule changes, or recording.
- **Two different random buttons.** RANDOM PALETTE chooses from the 31 named presets without changing rule/seed/color modifiers. RANDOM COLORS invents entirely unrestricted RGB colors for every existing editable swatch, retains stop count, and is saved via ordinary palette/recipe export. No special print or style constraints.
- SHUFFLE STOPS, REVERSE STOPS, ROTATE STOPS reorder only the current palette copy; source presets remain unchanged.
- Palette Ping-Pong uses a symmetric triangular wave driven by generation number, with deterministic live/GIF/video appearance. The existing continuous mode remains available; recipe loading defaults to continuous for older saved recipes.

## 2026-10-11 video stutter repair
- Diagnosis from an affected 20.67s sample clip: recurring ~0.7–0.8-second frozen intervals with quick changes and roughly 5 distinct motion updates/second despite a 30fps wrapper. This is *not* a GIF color issue.
- Likely main-thread encoder blocking pattern: the previous video recorder used `MediaRecorder.start(1000)` to flush chunks each second while rendering on the main thread. Encoder/timeslice flushing can interrupt rendering and then the old absolute-timestamp loop rapidly produced catch-up frames.
- Video recording now uses `MediaRecorder.start()` with one final Blob (no periodic 1-second flushes), and an automatically updating capture stream with no duplicated `requestFrame()` calls.
- New frame pacing drops overdue *schedule debt* instead of producing a rapid burst of simulated frames after a UI stall. This may take longer than requested wall-clock duration when a browser is CPU-overloaded; as with every MediaRecorder capture the actual file is real-time, not a guaranteed offline fixed-framerate encoding.
- GIFs remain in the separate frame-by-frame worker path and retain their per-frame palettes. The recorder progress/preview/cancel/save UX is unchanged.
- Real browser test decodes several moments of an exported video, verifies temporal diversity and playable duration, and asserts MediaRecorder starts without a 1000ms timeslice. Real iPhone Safari needs another user check.

## FUNHOUSE F2 — Mutation Dice
- A high-contrast **FUCK IT UP** button in Rule Reactor, with Gentle (2), Weird (5), and What the Fuck (9) distinct safe mutations per roll.
- Checkable locks protect palette colors, math/rules, engine, and seed. Defaults protect **engine and seed**; all basic mutations change compatible live rules or visual parameters **without restarting the universe**. Palette lock protects RGB stops, while visual palette cycling remains adjustable.
- **ALLOW UNIVERSE RESTARTS** is separate, off by default. To allow engine or seed changes, both explicitly permit restarts and unlock that parameter. Structural changes correctly regenerate the new initial world.
- **UNDO** restores the actual previous cell arrays, generation, paint strokes and historical visual data, plus exact old settings and palette. Structural undo uses a one-shot restoration after the React world-initialization effect. Undo is one level, not an unlimited timeline.
- Each roll is created from an explicit 32-bit RNG seed. The last roll's seed, changes, locks, strength and allowance are included as optional `funhouse` metadata in ordinary `automatart-recipe-v1` JSON; complete resulting settings/appearance are also saved for exact reproduction of a starting recipe. Pre-existing recipes remain valid.
- A portable mutation RNG core lives in `src/engine/mutation-core.ts`; the instrument-specific adapter lives in `src/engine/mutation-automatart.ts`. This is architected for future apps but **only Automatart is updated**; Moiré and Reaction Diffusion need their own mathematically valid adapters later.
- Regression tests cover deterministic mutation runs for every existing engine, math/palette/seed/engine locks, opt-in resets, and real-browser UI undo/recording.

## FUNHOUSE F3 — Alien Paintbrush (2026-10-12)
- Brushing plants **real cell states**: single, left/right mirror, quad horizontal+vertical reflection, or eightfold 45° rotation in normalized artwork coordinates, then resolves the resulting coordinates to real square/hex/triangle cells.
- Ten seed types: freehand, alien spore, ring, checker burst, cluster, spiral, cross, standard Conway glider (restricted to standard square Moore Conway Life), bars and diamond. Rotate stamps 45°; adjust radius/density and place up to eight seeded scatter families.
- Paint, erase and invert work across existing engines; Species War uses the currently chosen species brush color/state. Random Stamp and Random Symmetry provide immediate novelty.
- A temporary translucent **ghost preview** on the interactive canvas shows exactly which cells a tap will plant; the preview itself is never exported or fed into transition rules.
- Each stamp derives a deterministic per-stroke RNG seed; scattered and sparse positions can be precisely repeated. **Saving a JSON recipe now saves the actual generation and complete cell/history arrays**, in addition to the Alien brush configuration and recent stroke seeds; loading restores the exact specimen, not just its starting random seed. Older recipes without a world snapshot still load as starting-seed recipes.
- On hexagonal/triangular and rectangular grids, mirrored/radial symmetry is defined in rendered normalized artwork coordinates, **not claimed to be an exact automorphism of that lattice**. Each transformed position maps to a genuine polygon cell.
- The mutation dice, palette color cycling, GIF, and video export engine are preserved.
- Rendering skins beyond the current seven are deferred to an F6 backlog stage after F5; no skin changes were made in F3.

## FUNHOUSE F4 — Psychedelic Print Shop (PR)
Implemented on a separate pull-request branch. See [F4 Print Shop rollout](docs/F4_PRINTSHOP_PHASES.md).

Print Shop is **independent of skins** and VISUAL ONLY. Six effects (posterize, rotated halftone, solarize, Neon X-Ray, seeded stipple, palette-derived duotone/tritone) are blended in a user-defined order. Per-effect intensity, global mix, ink stop choices, density/dot/threshold controls, Random Print and three one-click combinations are included. Disabled by default; older recipes stay visually unchanged.

Print effects run on the exact same renderer shared by live preview, PNG, GIF and video *after* all skin and polygon-lattice projection steps, so there is no independent export implementation to drift. A bounded <=720px work buffer avoids unbounded per-frame HD post-processing; requested canvas/file dimensions remain unchanged. This is CPU-bound, so iPhone performance and long video still require real-device checks. Frame-local GIF palette cycling is retained.

Print settings travel with the existing version-1 JSON recipe as an optional nested `appearance.print` field. Current engine, cell state and palette arrays are untouched. Additional truly different **skins** are deferred to F6 after Funhouse F5.

## FUNHOUSE F5 — Final Polish (pull request, pending merge)

The high-resolution Snapshot Studio provides **original ratio, 1:1, 9:16 and 16:9** PNG frames, 720/1080/1440/2160 short-side output, real pixel labels, and no-crop/no-stretch centered matte for mismatched frame ratios. PNG captures the exact current world and the complete skin/color/Print Shop pipeline. On iPhone, a separate **Save / Share** control lets the user open the native share sheet; on desktop the PNG downloads automatically. Files are named with current generation and actual dimensions. Large 4K images may be memory-intensive on Safari.

This phase also includes phone tap-target/safe-area improvements, legacy and corrupt-recipe regression tests, and a documented physical iPhone go/no-go checklist. **No v1.0 tag is created by this PR.** Real-device Safari export tests remain essential: see [F5 Acceptance](docs/F5_ACCEPTANCE.md). The extra visual skins requested by Merry and Barry remain deferred to F6 after polish.
