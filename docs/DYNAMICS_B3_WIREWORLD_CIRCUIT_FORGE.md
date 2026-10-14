# Dynamics B3 — Wireworld Circuit Forge

## Real mathematical circuitry, not a glow effect

Canonical Wireworld is a synchronous four-state cellular automaton:
0 empty stays empty; 1 conductor ignites into 2 head if exactly **1 or 2** of its eight Moore neighbors are heads; 2 head becomes 3 tail; 3 tail recovers into 1 conductor.

B3 retains this exact rule by default. It expands the studio into a conductor-building instrument instead of expecting users to draw every cell by hand.

### Seven canonical-cell templates
- Signal rail, right-angle turn, T branch, four-way connected junction, closed square loop, two separated square loops and multi-turn snake.
- Discrete integer-grid coordinates, Bresenham-connected tracks, quarter-turn rotation, adjustable geometry radius (4–18), and optional real seeded adjacent head/tail events. All templates write **state 1/2/3 directly to the current world**, preserving its generation.
- **Center stamp** or **arm tap-to-place** with a true lattice-cell footprint hover preview. Armed mode turns off after one placement; drawing reverts to the normal Alien brush. Existing stage remains continuously visible.
- Optional local clearance removes old random wires near the template but does not wipe the complete universe. With clearance off, it writes on top of existing cells. This is a direct art-edit intervention and intentionally isn't a spontaneous Wireworld transition.
- A plus-shaped junction is electrically **connected**, not an insulated crossover. Loops and conductors do not guarantee sustained oscillation; that depends on signal spacing, head placement, and Moore 8-cell coupling.

### More genuine evolution
- Live integer Wireworld conductor ignition interval **[minHeads,maxHeads]** constrained to 1..8, with four first-use presets: original 1–2, one only, two only, surge 1–3.
- Nonclassical counts are explicitly **generalized Wireworld variants**; tail and recovery states remain unchanged, and no rule changes restart the cells.
- Opt-in **clocked** electrodes (near center or four quadrants, every 1–120 generations), which only ignite nearby, nonexcited actual conductor cells; no conductor nearby means no ignition. Sources are limited to an 18-cell search radius.
- Opt-in **deterministically seeded conductor sparks** (0–1% per true conductor site per generation), with zero spontaneous wiring and no overriding natural heads or tails. Seed, generation, cell address make replay repeatable.
- Honest next-step natural birth forecast (sampled on large grids), live head and actual electrode-ignition readings, and a recorder that does not treat a long delay before future clock pulses as mathematical settling.
- Original exact evolution when all optional sources are off and min/max = 1/2.

### Integration / acceptance gates
- Exact canonical four-state parity and generalized 1/1, 2/2, 1/3 tests.
- Every template in all four rotations, real-state head→tail progression, locality, original generation preservation, JSON snapshots, and deterministic progression.
- No source magically sparks without conductor; seeded reproducibility, source timing, guarded existing heads/tails.
- Legacy recipe JSON missing B3 fields uses original canonical settings; rule settings and artwork preserve through recipes. No schema migration to source world arrays.
- Mutation Dice honors the rule lock; existing GIF/video still shares production `stepWorld`.
- Full previous CI plus actual Chromium mobile-width stage stamp, preview, true saved recipe, and GIF/video tests.
- Real Safari/iPhone acceptance remains a separate hands-on check.

## Next
B4: genuinely functioning circuit gates or isolated crossovers and diagnostic signal-tracing probe. These should be verified with repeatable truth-table signal tests before being called logic gates. Later: new skins.
