# Dynamics B1 — Brian's Brain Electric Lab

## Why Brian seems to go quiet

Canonical Brian's Brain is a three-state CA: **0 rest → 1 firing → 2 refractory → 0 rest**, with exactly two FIRING neighbors needed for a resting cell to ignite. With sparse four-neighbor geometry, locally depleted firing fronts often become absorbing. This is a mathematical outcome, not necessarily a renderer failure. Existing 4/8/12/24-neighbor and custom-stencil support was real but poorly surfaced.

## Real cell-state controls

- The complete original autonomous Brain rule is **the default** and one-tap CLASSIC BRAIN preset (eight Moore neighbors, exact two voters, stimulation off). Old recipes with no B1 fields retain this exact behavior.
- Prominent square-grid 4 / 8 / 12 / 24 voting layouts. This changes the graph used by the live transition, *without recreating the world*. Exotic hex, triangle, and rhombille retain their real graph and aren't misrepresented as square voting graphs. The existing B2 stencil remains freely editable.
- A live firing-neighbor threshold and EXACT versus AT LEAST matching. Changes to either are explicitly a **generalized Brian-inspired CA**, not classical Brian's Brain. Firing/refractory transitions stay 1 → 2 → 0.
- Optional **clocked 2×2 electrode clusters**: central, four quadrant, or twelve-point ring arrangements. Each fires on a deterministic generation interval from 1–120 and writes state 1 only into *resting* sites. A solitary one-dot pacemaker would not necessarily generate an exact-two brain wave, so B1 uses correlated four-cell electrode groups.
- Optional **seeded 2×2 bursts**: one deterministic pseudorandom firing decision per tile per generation, probability 0–1%, replayable from world seed + tick + tile. This is real state injection, not a post-process shimmer. The natural rule still selects propagating cells.
- Five opt-in behaviors: Classic Brain, Cardinal Flash, Electric Bloom, Filament Web, Brain Storm. No claim of eternal waves; viable behaviors depend on occupancy, boundary, graph and birth rule.

## What the inspector actually means

The Brain forecast counts eligible spontaneous births on actual canonical cells at the next tick using current graph and firing-comparator settings; it excludes injected births. Under 4096 sites it inspects every cell, above this it samples evenly to avoid freezing iPhones. Last-step changed cells and real external excitations show what actually happened.

A pure brain that's entirely resting won't restart unless painted, reseeded, or explicitly stimulated. A clock still firing during a refractory stage waits until a site genuinely rests; it does not overwrite it.

## Compatibility and merge gates

- B1 settings are independent from A2's Excitable / Afterlife wave-source configuration.
- New fields in `SimSettings` are validated and stored in original recipe JSON. Old recipe fields fall back to canonical pure settings. No new persistent hidden RNG state. Recorded GIF/video uses production `stepWorld`.
- Recording in *until settled* mode doesn't falsely terminate in between future scheduled electrode/spark events, while pure Brain is allowed to settle.
- Mutation Dice rule lock protects Brain settings; live settings do not trigger a world reset; entering a new lattice still resets where necessary.
- Numerical parity test checks exact classical/generic transitions on all real lattice graphs, finite and wrapped boundaries, electrode geometry/refractory rules, independent seeded replays, snapshot/resume, mutation locks, forecast and recorder settlement.
- Browser tests check live neighborhood/match/electrode choices, recipe roundtrip, old recipe compatibility and source controls. Full existing GIF/video/physics tests remain in CI.

**Physical iPhone Safari testing remains necessary after passing green desktop CI.**

Next: B2 Margolus richer reversible rules, B3 Wireworld real circuits, plus later separate visual skins.
