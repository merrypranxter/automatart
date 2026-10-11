# AUTOMATART ⚡

A zero-subscription, browser-based **cellular automata art instrument**. Not just Life with a palette: the long-term design connects cell states and mathematical events to colors, visual treatments, and eventually other rules through a Rule-to-Art Patchbay.

## Status
**Phases 0–1 in progress:** app foundation + four simulation families + live painting + rendering foundations. Later features are on the roadmap, not represented as already shipped.

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
- [ ] **Phase 0:** Vite + React + TypeScript shell, responsive pinned preview, clean deployment config
- [ ] **Phase 1:** Four running engines; start/pause/step/reset; paint; cell resolution; saved recipe; grid overlay
- [ ] **Phase 2:** Advanced Rule-to-Art mappings (state, age, neighbors, events), custom palette automation
- [ ] **Phase 3:** Organic skins, contours, particles, glows and alpha-clean compositing
- [ ] **Phase 4:** Frame-accurate GIF, APNG, WebM/MP4 exports, loop tools, larger renders
- [ ] **Phase 5:** Mutation gallery, parameter search, local rule generator
- [ ] **Phase 6:** Multiple species, territories, rule parasites, breeding
- [ ] **Phase 7:** Lenia / SmoothLife, exotic topology and hybrid mathematical engines

## Design constraints
- Browser-local simulation; no AI API key, account, backend, or cloud compute cost.
- Simulation grid and display/export resolution are separate concepts.
- Deterministic simulation ticks, not display-frame-dependent updates.
- Future patch mappings are **data** (a schema), not arbitrary runtime JavaScript.
- GIF / video export is a later phase: PNG screenshot is an early convenience, not a promise of finished export features.
- Mobile canvas remains visible while controls scroll.
- Avoid premultiplied-alpha dirty mattes for future transparent exports.

Original art/code project by merrypranxter.
