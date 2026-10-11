# AUTOMATART — THE MUTANT ZOO MASTER PLAN
Version: 2026-10-11 / roadmap v1. Phases are sequential milestones, **not claims that all are implemented**.

## Non-negotiable invariants
1. Honest mathematics. **PURE LOCAL CA** means a defined cell state space, neighborhood, synchronous transition function (possibly a fixed seeded local stochastic rule), and time-independent rule within a run. Global triggers, heterogeneous rule scheduling, coupled nonlocal solvers, AI intervention = **HYBRID** unless explicitly modeled as local states. Rendering-only transformations must be labeled **VISUAL**.
2. Deterministic seeds and identical results between playback and export. No animation logic tied to requestAnimationFrame elapsed time.
3. Preserve all current presets, 31 palette records (26 exact It's a Moiré + 5 Automatart), PNG, GIF, video (browser-dependent), dismissal buttons and mobile sticky canvas.
4. Start with browser-local engines, typed arrays, testable pure kernels. Complexity/performance budgets on mobile; no API costs.
5. Separate model → signals → visuals → capture; recipes include a version and migration defaults. Any update to state representation must update copy/record/rewind.
6. Only claim features shipped after production TypeScript build + deterministic engine tests + real-browser encoder smoke test. Additional iPhone Safari testing remains necessary.

## Milestones & definition of done

### Z0 — BASELINE (DONE)
Four families: Life-like, Brian's Brain, cyclic, Wolfram 1D. World, painting, recipe, color vault (31 palettes), GIF+video recorder with progress, save/share, preview dismissal. Existing partial Rule→Color patchbay.

### Z1 — NEW ORGANISMS (FIRST IMPLEMENTATION)
- Dedicated multistate **Generations / Afterlife** B/S/C: 0 resting, 1 live, 2..C-1 refractory; only state-1 counts as live neighbor. Live survives on S or becomes refractory; resting births on B; refractory advances and returns to 0.
- **Excitable Flesh / Greenberg–Hastings-like** 0 rest, 1 excited, 2..C-1 refractory; 0 excites above a threshold of excited neighbors; active/refractory march until rest.
- **Larger Than Life**: binary square-radius neighborhood, exclude center, birth/survive neighbor-count intervals. Honest local totalistic rule, higher computational cost.
- **Species War**: deterministic multi-state local territory competition, explicit tie-break/attack/survival rule; states 0 empty and 1..N species. Clearly labeled Automatart original CA variant, not a named scientific canonical rule.
- Each engine gets visible active controls, painting, correct seed behavior, recipes, color mappings, recorder compatibility.
- Engine-specific deterministic tests + preservation of existing GIF browser smoke. Cap large-neighborhood radius on mobile.

### Z2 — THE SKIN MACHINE (IMPLEMENTED: v1; future polish remains possible)
- Shipped four distinct **VISUAL** skins: contour isolines of a smoothed cell-density field, density-thresholded mercury membrane, slope-lit relief, and stained-glass cell-state boundaries. Later GPU shaders and full physically-based materials remain possible.
- Shipped temporal RGB ghosting (two past-state snapshots) and chromatic fossils (decaying death/change accumulation). Rendering never feeds back into CA.
- Shipped contour count/thickness, density thresholds, glow, chrome highlights, glass leading, temporal RGB and fossil intensity; further material texture and history decay tuning remain possible.
- Output parity for PNG, GIF, video and no black alpha matte; bounded history memory.

### Z3 — STRANGE LATTICES
- Hexagonal offset and triangular adjacency systems with mathematically explicit neighborhoods, matching pick/paint and rendering.
- Non-totalistic orientation-aware 3x3 rules, rotated/mirrored pattern templates.
- Reversible Margolus/block CA; block phases and parity saved in recipe.
- Geometry-aware tooltips and performance/determinism tests.

### Z4 — PHYSICS AND EXOTIC LOCAL RULES
- Abelian sandpile redistribution (synchronous toppling), stochastic forest-fire/birth/death (seeded RNG), Wireworld, lattice-gas collisions (particle bitsets). Honest distinctions about update schemes.
- Cell lineage/ancestry as true local state if inherited; paint region selection and crop-to-seed.
- Long-run CPU profiling; GPU compute only when it improves measured frame time.

### Z5 — COUPLED UNIVERSES & RULE LAB
- Species interaction enhancement: territorial frontiers, lineage memory.
- Coupled automata, parasites, regions with distinct rules. Classify **heterogeneous LOCAL CA** when neighborhood and rule are locally fixed, **HYBRID** when global intervention drives it.
- Pure local rule schemata, no arbitrary generated eval. Rule-to-art routing of births, deaths, entropy, neighbor counts, age to glows/material/contours.
- Timeline for scheduled rule transitions explicitly labeled as a *nonautonomous/hybrid* experiment.

### Z6 — MUTATION FARM & TIME MACHINE
- Deterministic indexed seeds, mutate compatible parameters, batch preview grid, favorites, reproduce a specimen exactly.
- Snapshots + replay + branch at a generation (bounded memory).
- Record until still vs exact repeat, including phase-dependent palette cycles; bounded cycle search, no misleading near-loops.
- Export selected region as still/SVG where valid and time-stack 2D generations into space-time art.

### Z7 — CONTINUOUS ARTIFICIAL LIFE
- Lenia / SmoothLife: float kernels, convolution and validated update formula; separate performance budget.
- Smooth periodic color cycles, spatial symmetry render-only, then optional coupled hybrid solver.
- Research validation and reference tests before claiming scientific fidelity.

### Z8 — 3D CELLULAR COSMOS
- 3D state array, 3D neighborhoods, reproducible 3D rules, volume/surface rendering, orbit camera, depth coloring.
- Time-stack sculptures distinct from genuine 3D CA; glTF/mesh export optional once geometric extraction is reliable.
- Benchmarks, conservative device caps, graceful fallback.

### Z9 — SHARED ASTRAL TRASH INSTRUMENTS
- Publish/use a versioned palette package from the existing 31-color JSON library; no unsynchronized copies after migration.
- Moiré optical interference as a **VISUAL** postprocessing material over cell signals, preserving It's a Moiré's own behavior.
- SVG/dingbat export handoff, optional other art-suite tools, no forced backend/service expenses.

## Acceptance process for each milestone
1. Pure seeded engine tests for update invariants, counts, edges, replay and transition state.
2. Browser UI controls exercised using automation; users can see meaningful differences.
3. Recorder produces multiple distinct actual GIF frames and user-visible save/share control.
4. Desktop and mobile layout smoke; Safari on-device remains user-assisted.
5. Clear phase status in README and changelog; no claiming unimplemented wishlist items.
