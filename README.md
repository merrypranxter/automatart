# AUTOMATART ⚡

A zero-subscription, browser-based **cellular automata art instrument**. Not just Life with a palette: the long-term design connects cell states and mathematical events to colors, visual treatments, and eventually other rules through a Rule-to-Art Patchbay.

## Status
**Phases 0–1 complete; Phase 4 early recorder shipped:** responsive app foundation, four simulation families, live painting, colorful rendering, PNG stills, JSON recipes, browser-local GIF export and MP4/WebM video recording. Expanded patch cables, APNG and loop-hunting are future phases.

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

The model uses typed arrays, seeded generation, wrap/no-wrap boundaries and separate rendering; controls preserve the deterministic seed where applicable.

## Roadmap
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
