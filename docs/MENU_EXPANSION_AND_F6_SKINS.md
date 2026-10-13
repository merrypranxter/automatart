# AUTOMATART — MENU MUTATION → NEW SKINS MASTER BUILD PLAN
Status: **APPROVED ROADMAP ONLY — NOT IMPLEMENTED**
Requested 2026-10-12. Complete **all four menu families** before beginning any new visual skins. Build one testable, independently mergeable GitHub pull request at a time. Do not confuse this roadmap with the already shipped F1–F5 Funhouse features or the original Z4–Z9 exploratory roadmap.

## Guiding contract

Automatart remains an instrument in **MATHEMAGICAL! — a Math Art Suite**. This build plan changes **Automatart only**; share portable mathematical signal/renderer primitives later using explicit versioned contracts, not copies of entire apps.

1. The four menus refer to **different systems**: *Color Mapping* is VISUAL; *Neighborhood* changes the local dependency graph; *Lattice* changes cell placement/adjacency; *Engine/Species* changes the evolution rule (and occasionally the kind of model). A new visual skin comes *after* all four.
2. Mathematical truth: CA is defined by per-cell states, local fixed neighborhood, synchronous transitions. Some proposed physics/agent models are explicitly **stochastic**, **asynchronous**, **agent-based**, or **hybrid**; label accordingly. Never call a render-only distortion a new lattice.
3. Existing ten engines and seven skins, all 31 official palettes, Random Palette vs unrestricted Random Colors, color-cycle/ping-pong, Mutation Dice, Alien Paintbrush, full world recipe, PNG/GIF/video export, and sticky mobile preview MUST keep working.
4. Preserve deterministic seeded replay for genuinely random evolution/stippling, complete histories for inspectors/exports, and saved recipes with migration defaults. Existing recipes continue to load; unsupported combinations are visibly disabled/explained, **never silently changed**.
5. iPhone performance comes first: bounded neighbor radius, sparse or cached neighbor graphs, conservative resolution limits, worker/chunked compute where appropriate; no paid APIs. Render-only signals should use bounded caches and never feed back into the rules.
6. Each subphase: isolated branch → PR → GitHub build/type check + deterministic unit tests + actual browser UI/GIF tests + video and PNG regressions → **tell user when to merge**. On-device Safari performance remains a separate acceptance check, not falsely claimed by Chromium.
7. Defer v1.0 release tag until physical-device acceptance and blocker bugs resolved. F5 polish was merged, but user-device validation remains outstanding.
8. Changes to engine rules require updating settings, recipe migration, seeded world generation, transitions, birth/death/history, painting, capture cloned worlds, mutation adapter, previews, and UI.
9. All existing mathematical engines have compatibility matrices with lattice and neighborhood modes. Mark precise neighborhood degree and edge behavior; count-based rules require correct ranges.

## The build queue (four menu expansions, then skins)

### F5.5A1 — TEN MORE COLOR SIGNALS (IMPLEMENTED IN PR — CI / MERGE PENDING)
**What appears:** Expand the Color Mapping selector from the current seven options with all ten named modes below. Make each mode accurate at the cell-neighborhood scale and compelling with the existing palettes:
- **Local entropy** — Shannon entropy of neighbor state frequencies, normalized for actual neighbor degree and state diversity (do not confuse entropy with noise).
- **Cell boundaries** — number/strength of local unlike-state adjacencies.
- **Neighbor diversity** — number of distinct neighbor species/states; avoid implying diversity is rich in binary-only engines.
- **Directional flow** — estimated direction of changing local activity from consecutive generations. Label as a visual *flow estimate*, not simulated physical velocity.
- **Birth flash** — cell age/events drive a vivid signal immediately following a birth.
- **Death heatmap** — recent local death accumulation derived from deterministic fossil/event history, with an adjustable fade.
- **Generation interference** — spatiotemporal phase driven by cell coordinates and integer generation, independent of wall-clock time.
- **Angular rainbow** — cell bearing around a controllable center, with hue/ring offsets.
- **Diagonal interference** — diagonal wave phase from signed x/y position and generation.
- **Neighborhood gradient** — local density/variation gradient magnitude, with optional directional sign.
**Controls:** map-specific frequency/phase, center, and recent-history sensitivity shown only when relevant; live Math Inspector describes the observed signal. No new engine or world reset required.
**Done when:** all ten produce deterministic, visibly distinct output, and at least one PNG, cycling GIF, and video preserve the same phases.
**Current delivery:** Ten definitions implemented in `src/engine/color-signals.ts`; live Color Lab selector, source-specific sliders (frequency/phase/center/history), numeric cell inspector, World boundary-aware neighbor queries, recipe defaults/migration, renderer integration and Mutation Dice support. `scripts/a1-color-signals-smoke.mjs` checks normalized mathematical signals in all three lattices, visual differences, immutable states, and timing. Real browser GIF/video/export smoke extended to exercise live control selection and GIF interference/cycling. **Not merged; physical iPhone testing still needed.**


### F5.5A2 — DUAL COLOR MAPPING / SIGNAL PATCHBAY (IMPLEMENTED IN PR — CI / MERGE PENDING)
- Source A and source B dropdowns drawn from the existing seven + new ten mappings; A/B blend, invert/swap, optional separate palette offsets and strengths. Begin with common current editable palette and preserve all 31 official presets.
- Pair inspection shows the numerical A and B values for the tapped cell, blending rule, and resulting color. Clear labels and safe defaults.
- Renderer implementation must stay identical in live canvas, all skins, Print Shop, still PNG, per-frame-palette GIF and video; generation-driven deterministic sampling.
- Include recipes and mutation-parameter compatibility, no extra default GPU/mobile cost when off.
**Done when:** pixel tests validate both sources and blend endpoints (0 = A, 1 = B); exported frames and recipes round-trip correctly.
**Implementation:** A2 has a disabled-by-default optional `Appearance.dualColor`, two selectors spanning all 17 mapping modes, A/B RGB blend, signal inversion, channel palette offsets and strengths, Swap (including parameters and complementary blend), Reset, three combinations (Age × Entropy, Flow × Edges, Angle × Ghosts), and tapped-cell A/B numerical + RGB inspector. The same per-generation palette phase and existing frame renderer feeds live, all skins, PNG/GIF/video, and Print Shop. Legacy/invalid recipe fields get safe defaults. Endpoint color fidelity is checked across square/hex/triangle, plus mercury material; no CA transitions change.


### F5.5B1 — MORE REAL NEIGHBORHOODS (MERGED; REGRESSION FOLLOW-UP)
- Square **radius-2 Moore** neighborhood (up to 24 cells), **radius-2 diamond/Von Neumann** (up to 12), and **directional** masked sampling. Where appropriate, allow adjustable radius up to a tested safe cap; document exact neighbor count and center exclusion.
- Reuse efficient local-neighbor helpers, update birth/survival/max-count controls (cannot keep 0–8 when 24 neighbors are possible), and expose live neighborhood preview highlighting contributing cells.
- Clearly restrict rule families that depend on original 4-/8-neighbor definitions, or update their transition logic precisely; start with Life-like/B/S and compatible species/cyclic variants. Margolus blocks, 1D Wolfram, and special directional rules should not pretend they can accept any arbitrary neighborhood.
**Done when:** reciprocal neighborhood assumptions are tested where appropriate, edge wrapping is correct, seeds/recipes are reproducible, and iPhone-sized grids stay responsive.
**Delivered in PR:** Square-only 24-cell radius-2 Moore, 12-cell radius-2 diamond and editable 8-compass-direction stencils (B2 will add a full 5×5 freehand stencil editor). Existing Moore/Von Neumann retained. The selected neighborhood directly determines synchronous evolution for six compatible engines: Life-like, Brian's Brain, Cyclic, Afterlife/Generations, Excitable Flesh and Species War. Actual 5×5 preview, selected-neighbor count, literal B/S counts up to 24, dynamic excitation/invasion thresholds, seeded recipe round-trip, live rule changes without reset, and compatibility gating. Other square-only/specialized engines keep their specified neighborhoods; hex and triangle keep their genuine 6/3 adjacency. Performance is bounded at 24 neighbors on a 256-wide grid. The life editor accepts B10 etc. Both feature-specific and full browser GIF/video tests are required before merge. **iPhone physical performance remains user-verified after deployment.** B1 follow-up repairs directional color inspection, Species War limits, active-rule clamping on lattice switch, and inactive-rule recipe/mutation preservation.


### F5.5B2 — PAINT YOUR OWN NEIGHBORHOOD (IMPLEMENTED IN PR — CI / MERGE PENDING)
- Touch-friendly 3×3 or 5×5 editable custom stencil: tap/drag the cells whose states influence birth/survival. Preserve center exclusion; optional clearly marked center-including experiments if semantically supported.
- Mirror, rotate, random stencil, named patterns (fan, hook, ring, one-sided claw) and a tiny visual overlay preview.
- Save stencil mask (bitset) with JSON recipe, seed/mutation control. Actual transition rule uses the stencil synchronously; no purely cosmetic imitation.
- Compatibility checks on all engines/lattices; an incompatible engine shows why the option is disabled rather than silently falling back to 8 neighbors.
**Implementation:** Exact 25-bit mask with excluded center and separate 3×3/5×5 sizes, touch pointer-capture drag, keyboard-accessible buttons, live count/preview, CW/CCW rotation, mirror/invert, seeded surprise, fan/hook/ring/claw presets, no-world-reset setting edits and compatible six engines. World metadata propagates through colors and capture clones. Seeded mutation honors rule locks, imports validate center/size/mask, and older recipes use safe inactive defaults. Node transition tests, real browser UI/recipe tests, and existing GIF/video suites gate merge. **Physical iPhone Safari acceptance remains pending user verification after deployment.**\n\n**Done when:** tests prove changing one stencil bit changes rule behavior, symmetry/rotation are accurate, capture is deterministic, and mobile editor is usable.

### F5.5C1 — CIRCUITS AND AVALANCHES (IMPLEMENTED IN PR; CI / MERGE PENDING)
- **Wireworld**: exact four-state empty/conductor/electron-head/electron-tail transition rules; multi-state conductor/head/tail brush, proper square-grid compatibility.
- **Abelian sandpile**: integer grain heights, configurable addition and synchronous toppling, explicitly state how synchronous toppling relates to the standard stabilization process; never truncate grain state to Uint8 if larger heights are supported. Real avalanches and recurrent structures.
- Ensure color maps/skins, painting, mutation adapter, recipe snapshots, exports are truthful for these new state representations.
**Implementation:** Wireworld has exact 0 empty/1 conductor/2 head/3 tail states and Moore head-count activation. Abelian sandpile uses canonical Uint32 grain heights separate from 8-bit display, controlled feed 0–64 and 1–8 synchronous one-topple-per-site rounds per generation, with a finite dissipative sink or wrapped periodic boundaries. The Alien Paintbrush adds real material/grains, snapshots/capture preserve full integer state, and Mutation Dice respects rule locks. CI tests canonical patterns, serial/parallel stabilization, integer conservation, true browser controls and GIF/video exports. Physical iPhone Safari smoke remains pending user verification.

**Done when:** canonical small patterns/circuits and grain-conservation/boundary tests pass.

### F5.5C2 — REACTION WAVES AND FOREST FIRE (IMPLEMENTED IN PR — CI / MERGE PENDING)
- **Hodgepodge machine**: multistate excitable reaction automaton, adjustable disease/excitation transition parameters and clear algorithm variant; independent of existing Greenberg–Hastings-like engine.
- **Stochastic forest fire**: states of growth/burning/empty; seeded per-step stochastic tree birth/lightning, spread; no need to draw literal trees. State sufficient RNG information for identical exported runs.
- Explicit seed/entropy/performance settings. Preserve mobile control clarity and GIF color behavior.
**Implementation:** Hodgepodge is an explicitly defined Gerhardt–Schuster-style synchronous Moore-8 variant: stage 0 healthy, 1…N−1 sick, N ill, and a terminal ill cell resets to 0. Healthy cell stage = floor(sick/K₂)+floor(ill/K₁), bounded by N; a sick cell progresses by floor((itself + eight actual neighbor severity values)/(1 + number of actual valid neighbors))+G, also bounded by N. Finite edges use only in-bounds neighbors; periodic square grids wrap. Sliders configure N=8…64 (restart), divisors K₁/K₂=1…8, progression G=1…40 and a real illness-stage paint brush. Forest Fire is a three-state synchronous Drossel–Schwabl-style variant, with EMPTY=0, TREE=1, FIRE=2, strictly four cardinal neighbors, TREE→FIRE from any burning cardinal neighbor or independently seeded lightning, FIRE→EMPTY, EMPTY→TREE with seeded growth. Counter-based random draw keyed by seed, generation, cell and action channel makes every frame replayable without a hidden random cursor; changing probability does not reset the current forest. Species-specific painting, fixed graph compatibility, color signals, skins, recipe import validation, exact world snapshots, rewind-safe undo and GIF/video recording are integrated. Node and Chromium regressions gate merge, and physical iPhone Safari acceptance remains pending user verification.

**Done when:** published/reference transitions, reproducible stochastic runs and replay/snapshot tests pass.

### F5.5C3 — STATISTICAL/AGENT WORLDS (HONESTLY LABELED)
- **Ising-style spin world**: spin up/down, temperature, interaction strength, magnetic field, clearly specify synchronous heat-bath vs asynchronous Glauber or Metropolis update (the chosen scheme dictates its classification; don't pretend all variants are synchronous CA).
- **Langton's Ant / Turmites**: moving agents with direction/state and grid trail; explicitly **AGENT SYSTEM**, not just another synchronous binary CA. Turn rules, direction, multiple agents where feasible, seeded initialization.
- Ensure the new agent positions/directions and RNG are captured in recipes, undo/snapshot, and export frames; adjust inspector accordingly.
**Done when:** reference behavioral checks, reproducible moves, and realistic mobile device cap pass.

### F5.5C4 — LATTICE GAS AND ENGINE COMPATIBILITY PASS
- **Lattice-gas cellular automata**: incoming/outgoing bitset particles with collisions and streaming on a compatible square/hex scheme; genuine discrete conservation laws where defined. This fulfills the remaining engine from older Mutant Zoo Z4, not a fake flow filter.
- Central **engine × lattice × neighborhood × paint mode × recorder** compatibility matrix in code and documentation. Shared rule controls only for meaningful options; invalid combos explain why.
- Bring all new engines into Mutation Dice only via safe opt-in adapters; no default corrupt seed/reset behavior.
**Done when:** collision/streaming/conservation invariants, recipes, iOS bounded compute and cross-engine browser coverage pass.

### F5.5D1 — PERIODIC EXOTIC LATTICES (REAL GRAPHS)
- **Rhombille / diamond** (actual rhombus tiling with proper contact relationships).
- **Kagome / trihexagonal** (interlocked triangle/hex network with mathematically defined cell sites/edges).
- **Square–octagon** (4.8.8 pattern, real cell shapes and adjacency).
- Separate **edge adjacency vs vertex adjacency** clearly; counts differ. Polygon projection, tap hit-testing, mirror/stamp geometry, toroidal wrap only if mathematically consistent.
**Done when:** reciprocal adjacency where expected, geometric coverage, no orphan hit-test areas, engine-compatibility matrix and exports pass.

### F5.5D2 — PENROSE QUASICRYSTAL (APERIODIC GRAPH)
- Generate bounded, seeded, finite Penrose P3 rhomb tiling patch with matching rules and real neighbor graph, not a nonperiodic texture painted over square cells.
- Clear finite-boundary behavior and varying cell degree; disable wrapping unless specifically defined without creating invalid tile-edge identifications.
- Tile-count and generation time caps for mobile; zoom/tap and seed/stamp/recipe supports irregular polygons.
**Done when:** validate tile-edge matching and degree, deterministic regeneration, density, real painting/export tests.

### F5.5D3 — SEEDED VORONOI LATTICE (IRREGULAR GRAPH)
- Generate clipped Voronoi cell polygons from a deterministic point-set seed, build valid edge-sharing adjacency, show cell degree and adjustable point count/jitter/relaxation as separate **topology controls** (not evolution values).
- Explicit boundary, optional Lloyd relaxation, spatial index for fast tap picking; no "always eight neighbors" fantasy.
- Variations should remain reproducible from topology seed and be included in recipes, exact world snapshot, GIF/video capture and Mutation Dice adapter.
**Done when:** nonoverlapping region coverage, reciprocal shared edges, deterministic polygons, browser hit tests and performance pass.

### F5.5D4 — CROSS-LATTICE INTEGRATION / MOBILE PASS
- Refactor adjacency queries behind a generalized **graph neighborhood interface** where necessary; don't force irregular graphs into (x,y) offset math.
- Revalidate entropy/gradients, death/fossil histories, animated palettes, Print Shop, 8-way artwork symmetry, custom painting, all new engines, undo and recipe persistence across all supported graphs.
- Add geometry/engine compatibility UX: categorized choices, availability tooltips, no silent fallback, no repeated giant unexplained native dropdowns on iPhone.
- Benchmark sparse graph and polygon render memory; agree on conservative defaults and warning thresholds.
**Done when:** all previous and new regression suites + browser recorder checks green, and iPhone acceptance task list is ready.

## ONLY AFTER ALL ABOVE: F6 — NEW SKIN LABORATORY

New **skins**, not Print Shop filters. Each is a coherent, fundamentally new renderer, optional and VISUAL ONLY, rendering through the common preview/export pipeline. Keep existing seven skins completely intact.

### F6S1 — TOPOLOGY AS MATERIAL (3 SKINS)
- **Interference Etching** — cell boundaries and density gradients form controllable engraved diffraction-style filaments (render-only optics; never claim a genuine new lattice).
- **Cellular Embroidery** — stitched threads, knot orientation, crosshatching and textile fibers follow local flow/density; variable thread width and relief; no literal sewn objects required.
- **Silkscreen Topology** — layered ink-separation contours, chokes/spreads and registration textures; this is a **base rendering style**, not simply the F4 halftone again.
**Done when:** three visibly distinct looks, bounded off-screen buffers, each compatible with all feasible lattices and export formats.

### F6S2 — ALIEN MATERIALS (3 SKINS)
- **Diffraction Foil** — spectral structural-color interference based on local surface gradient/view angle parameter, optically flamboyant while remaining deterministic and 2D.
- **Chromatophore Membrane** — region segmentation with living pigment islands, elastic colored borders and variable neighboring tension.
- **Opaline Microscopy** — pseudo-microscopic thin films, granular organelle outlines, subsurface translucency without relying on city/landscape imagery.
**Done when:** three additional genuinely different visual constructions, meaningful controls, repeatable color cycling and color-safe GIF export.

### F6S3 — SKIN CROSSBREED / QUALITY
- Skin-specific param sections, optional curated sampler/presets, **Random Skin** and safe skin mutation via F2 adapter.
- Keep Skin (base renderer) distinct from F4 Print Shop (post-process). Mix old/new visual looks without fake mathematics.
- Browser visual-difference tests across all skins, mobile preview speed, PNG, GIF frame-local palettes, 10–30 sec video and recipe round-trip.
- No v1.0 or newer release tag without real on-device iPhone acceptance.

## Big project boundaries: what is **not** being silently added
- The original Mutant Zoo Z5–Z9 remain separate exploration: multi-universe coupling, mutation farm/long time-machine, Lenia/SmoothLife, full 3D cellular volumes, and cross-app Mathemagical! integrations. This plan does not claim they are already shipped, nor automatically merge their work into these four menus.
- No changes to It's a Moiré or Reaction Diffusion Artist here. Future **Mathemagical!** shared modules should be extracted as versioned, testable components once the APIs stabilize.
- No new visual skins until F5.5A–D are complete. This is explicitly the requested order.

## Merge protocol
There are **15 feature PRs** in this plan: A1–A2 (2), B1–B2 (2), C1–C4 (4), D1–D4 (4), F6S1–S3 (3) = **15 PRs total**. Work sequentially; if a subphase proves too large, split it into smaller PRs rather than force a risky all-in-one merge. For each PR:
1. Implement from a new branch off current `main` **after the previous PR is merged**.
2. Use the full suite's engine, color, geometry, recipe and actual-browser GIF/video smoke tests, plus new feature-specific tests.
3. Fix failures before asking the user to merge.
4. Tell user **"PR #N is ready: merge now"** with a real GitHub URL. Never expect user to guess what to merge.
5. The user merges; Netlify rebuilds; collect Safari feedback. Then start the next phase on `main`.
