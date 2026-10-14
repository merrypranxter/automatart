# Dynamics B2 — Reverse Universe, genuine reversible mathematics

## Why
Margolus had only one local bijection: rotate each disjoint 2×2 binary block clockwise, shifting the partition diagonally on alternating generations. It already rewound exact binary cells, but users could not modify its block laws or compose them without compromising reverse reconstruction.

## New mathematical instrument
- **Ten true reversible block maps**: original clockwise, counterclockwise, half-turn, horizontal mirror, vertical mirror, diagonal reflection, pair collider, opposite exchange, population vortex and parity braid.
- Every map is a **permutation of the entire 16-configuration 2×2 binary state space**. Tests prove every input has one unique output and an inverse, and all maps conserve the number of occupied sites, unlike tricks that merely reverse a prerecorded video.
- **A/B compositor**: one map, or alternate two maps every 1–120 generations. These are real compositions of bijections, so the complete evolution remains invertible. Neither map is allowed to generate/destroy bits. Current cell states remain intact on a live rule change.
- **Actual reverse playback**, backward −1 and −10 controls, and exact inverse reconstruction after changing laws. Staggered partitions are undone in their correct chronological order.
- **Compact reversible rule epochs**: world state stores the generation at which the user changed a rule schedule, along with rule A/B, mode and period. Backward replay uses *the historical schedule that produced the target generation*, not today's slider values. Rewinding before an edit discards future epochs, allowing an intentional new future when moving forward again.
- Old recipes never contained epochs because Margolus was always canonical CW. Their previous generations are safely treated as exact legacy clockwise rotation. New recipes and cloned capture cursors preserve their separate epoch history.
- Mutation Dice may change invertible rule combinations when the rule lock is off; rule-locked mutations cannot change them. All B2 mathematical knobs remain LIVE, no universe reset.

## Explicit boundaries
- The time inverse reconstructs **binary cellular simulation state**. A drawn/erased cell is an external intervention, not a reversible CA step. Rewind after painting in between steps is a different mathematical initial condition and does not undo painting actions.
- Skin trails, ages and fossils are visual history; on inverse playback they reset rather than falsely pretending to be time-reversible physical state.
- This engine requires even dimensions, square lattice and wrapped boundaries for fully disjoint staggered blocks. It cannot be faked onto rhombille or hexagon CA.
- The normal GIF/video exporter still captures **forward** evolution from the selected source world, using the new rules. A future export-phase upgrade can offer direction-aware reverse animation export.
- No paid GitHub Copilot credits are used. GitHub Actions and Netlify deploy preview do not require Copilot to review this PR. CI is not a substitute for testing Safari on a real iPhone.

## Validation
- All 10×16 block mappings checked for bijective output, reverse mapping and bit-count conservation.
- 80 forward/80 backward steps across three canvas aspects for each map; exact comparison with original CW implementation.
- 105 consecutive generations with six live rule edits, several A/B schedules; **every** reversed step equals the exact previously saved binary board. JSON snapshots restore the precise rule epochs. Forking timeline after rewinding is verified.
- Old snapshots without history preserve old CW math; malformed epoch sequences are rejected.
- Browser controls, recipe roundtrip, legacy recipe import, GIF/video regressions, all prior 17 engine tests and export pipelines must pass before merging.

## Integration order
B1 Brian Electric Lab PR #27 was green but not merged when this independent B2 PR was developed. Merge **B1 first, B2 second**, after B2 checks pass. Next dynamics phase is B3: Wireworld conductor circuits.
