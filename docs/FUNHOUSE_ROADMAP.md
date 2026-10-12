# FUNHOUSE UPDATE — Automatart's Last Little Freak-Out

The goal is more PLAY without destabilizing the mathematical engines, palette vault, iPhone UI, or recently repaired per-frame GIF color cycling. Keep existing phases Z0–Z9 in `docs/MUTANT_ZOO_ROADMAP.md`. This is a separate, deliberately scoped finishing pass; the larger Z4–Z9 research work remains future work.

## Rules of engagement
- New visual effects must never alter the underlying CA's local transition logic.
- Existing GIF worker, frame-local GIF palettes, video, PNG, recipes, and all 31 color palettes stay intact.
- Any deterministic visual animation uses generation count, never wall-clock elapsed time; both recorder and live canvas see the same state.
- New UI controls must have a real implementation and work with touch screens. Use no paid API.
- Each batch requires type/build and real browser/GIF smoke tests before declaring it shipped.

## F1 — ROULETTE + PRECISE TIME + COLOR TOYS (SHIPPED — CI GREEN)
- [x] Plan the entire Funhouse and publish a phase checklist.
- [x] Separate "RANDOM PALETTE" (existing presets) and "RANDOM COLORS" (entirely arbitrary colors while keeping editable swatches).
- [x] Rule Roulette: documented, standard Life-like B/S presets (Maze, Mazectric, Replicator, Diamoeba, Coral, Amoeba) alongside existing Conway/HighLife/Seeds/Day & Night. Keep the custom B/S editor.
- [x] Step +10 / +100: asynchronous bounded batches to keep the UI responsive, accurate generation counts, and no unexpected reset; cancel when restarting, changing engine, or starting capture.
- [x] Palette Ping-Pong: optional triangle-wave palette offset driven by generation so GIF and video agree with the live renderer.
- [x] Palette Surprise: shuffle stops, reverse and rotate on the CURRENT palette, no mutation of originals.
- [x] Tests: exact B/S mappings, bounce ends/direction, random whole RGB palettes with editable swatches, and real-browser recorder smoke (including GIF color-cycling protection).

## F2 — MUTATION DICE (SHIPPED — CI GREEN)
- [x] `FUCK IT UP` mutation control with strength levels Gentle / Weird / What the Fuck.
- [x] Locks for palette, rule, engine and seed. Always retain changes only to compatible parameters, and clearly identify which settings change the current world vs reseed it.
- [x] Seeded mutation **recipe**, optionally an undo (last mutation) action; a mutation itself may be stochastic, but the resulting exported recipe must reproduce its parameters exactly.
- [x] Button feedback and sensible bounds across engine-specific controls; avoid re-seeding unless user explicitly permits it.
- [x] Regression against recorder.

## F3 — SYMMETRY AND ALIEN SEED STAMPS (IMPLEMENTED — TESTING)
- [x] Symmetry-aware brush: single/mirror/4-way/8-way; distinguish actual state stamping from rendering-only symmetry.
- [x] Alien seed stamps: spirals, rings, gliders (on compatible lattices), checker bursts, clusters, spores.
- [x] Geometry-correct taps on square, hex and triangle lattices. Respect boundaries, species painting, erasing, and maintain state-history metadata.
- [x] Keep stamps deterministic for exact replay and do not mutate the selected CA's transition function.
- [x] Browser touch/paint tests.

- [x] Save the full current cell universe, paint strokes, generation, and visual history in the JSON recipe; restore identical stamped specimens, preserving legacy recipe support.
- [x] Visible ghost preview with actual mirrored/stamped cells before planting; extra random stamp and symmetry buttons, scatter/density/invert controls.

## F4 — PSYCHEDELIC PRINT SHOP
- [ ] VISUAL ONLY posterization, solarization, duotone, stipple/halftone, NEON X-RAY.
- [ ] Per-effect intensity, color choices where appropriate, sensible performance caps at 720p+ on mobile.
- [ ] All effects flow through the renderer shared by PNG, GIF and video and do not change cell states.
- [ ] Screenshot comparison + animated export test, specifically preserving per-frame GIF color cycling.

## F5 — FREEZE AND POLISH
- [ ] One-tap hi-res snapshot choices 1:1 / 9:16 / 16:9 and actual dimensions.
- [ ] Better help labels, recipe migration tests, iOS Safari checks and export UX.
- [ ] Pre-release checklist, no misleading “everything tested on iPhone” claims.
- [ ] Tag `v1.0` only after live-device feedback and regression tests pass; don't auto-tag.

## Beyond Funhouse
Z4–Z9 (sandpile / Wireworld / lattice gases, coupled automata, mutation farm/time machine, continuous life, 3D, shared app integrations) remain possible research work after a rest. This Finishing Pass does **not** claim those large milestones are shipped.

### Shared-suite strategy
F2 was first implemented inside Automatart. The portable `src/engine/mutation-core.ts` holds seeded random mutation primitives with **no automata assumptions**. `src/engine/mutation-automatart.ts` applies strict Automatart engine-specific allowed ranges and safe live-world behavior. This code is **not yet installed** in It's a Moiré or Reaction Diffusion Artist. A later Math Art Suite integration can extract the core into a tested shared package and add separate adapters for each app rather than copying controls or mismatching mathematical parameters.

## Future visual-skin expansion — requested, deliberately DEFERRED
After the Funhouse feature phases and stability work, design **several genuinely new rendering skins** that look substantially unlike the current seven. Both Merry and Barry especially enjoy the skins. Prioritize fundamentally different visual constructions (e.g. interference etching, cellular embroidery, chromatophore segmentation, diffraction foil, silk screen topology), not renamed brightness/glow filters. Keep skins VISUAL ONLY, expose meaningful controls and preserve GIF/video color fidelity. **Do not implement these during F3.** This is a backlog item so it will not be forgotten; use an F6 skin-research phase after F5.
