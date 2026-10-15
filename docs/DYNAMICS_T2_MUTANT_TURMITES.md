# Dynamics T2 — Mutant Multi-Species Turmites

## Genuine rule mathematics

T2 extends T1’s indexed-color four-command automata into **orientation- and species-sensitive mobile cellular agents**. Every ant still occupies a real square-lattice location, reads the real underlying indexed pigment, writes its successor modulo the track-state count, turns and moves by one cardinal cell. There are no invented image effects, gradient overlays or fake animation-frame actions.

The turn rule for an ant of stable identity `i`, heading `h` (north=0, east=1, south=2, west=3) on track color `c` is:

```
species = i mod speciesCount
commandIndex = (c + h × headingShear + species × speciesStride) mod rule.length
turn = rule[commandIndex]
if speciesMirror and species is odd: swap L ↔ R
apply the actual turn; increment the real cell pigment; move one true lattice cell
```

The offsets do **not** simply change the display palette. The same track color can cause four different species or four different facing directions to take physically different paths. Individual agents keep their identity from stable array order, so the existing recipe schema continues to store only `{x,y,heading}`: no hidden or invented species field. World settings serialize all rule modifiers.

The old engine remains exactly equivalent to T1 when `speciesCount=1, speciesStride=0, headingShear=0, speciesMirror=false, contact='shared', formation='orbit'` (the defaults).

## True same-site encounters

T1 already had real sequential shared-pigment editing: when ants visit the same cell during a single round, later agents read the earlier agents’ newly written pigment. This behavior remains the **SHARED INK** mode.

T2 adds **REPEL**. Before each full ant movement round, the engine counts actual agents at each current lattice site. If two or more occupy the same site, all those ants have their headings rotated by 180° **before** computing their species/heading-conditioned turn. Those co-location checks happen simultaneously; subsequent cell reading/writing and moves remain in stable agent order. This produces actual direction-dependent interactions, while preserving the honest shared painting behavior. These are **same-site** collisions, not arbitrary visual proximity or diagonal pixel overlap.

T1’s 1–8 complete true substeps still work; the contact test is recalculated at the beginning of **each** substep and can therefore produce cascading interaction events in one displayed generation.

## Deliberately different starting arrangements

The existing deterministic **ORBIT** placement remains the default and reproduces original coordinates and headings bit for bit. T2 also adds:

- **PILEUP**: all agents start at the center, headings cycling N/E/S/W. For 2+ ants with REPEL enabled, there is a genuine collision on the very first update.
- **CROSS**: agents start on four cardinal arms at increasing distances, headings pointing toward the center, creating purposeful opportunities for encounters.

Formation changes explicitly restart the universe because they replace the physical initial ant coordinates. Changing species count, offset, mirrored chirality, heading shear, contact mode or substeps is **live** and preserves all existing pigment and agent coordinates.

## Usable UI

The T1 Genome Lab remains available and now includes a T2 section:

- Species count 1–4; rule-index stride 0–5 per species; facing-direction shear 0–3; odd-species L/R mirror.
- TRUE per-species/per-heading instruction matrix for the **currently selected track brush pigment**, making the four-dimensional rule comprehensible.
- Shared-paint versus collision-repel mode.
- Orbit, central pileup and cardinal cross formations.
- **Classic Genome Physics** and **Mutant Species Pileup** presets; the latter intentionally changes the starting formation and restarts so contact can happen immediately.

The live viewport, painting, skins, saved recipes, GIF capture and video recording continue to reflect the actual cellular state rather than merely the selected UI.

## Verification

- Exhaustive isolated direction/species command evaluations, chirality and validation of invalid settings.
- Exact same-site collision movement versus ordinary shared-paint collisions, including proof that unrelated agents are never repelled.
- Stable original seed formation, deterministic center pileup and cardinal cross, plus invalid formation handling.
- Thousands of real multi-ant scenarios compared **byte-for-byte** between accelerated 1–8-step generations and the corresponding series of individual physical updates, across multiple genomes, wraps, formations, species and collision rules.
- True full-world T2 `stepWorld` equality with engine-level `stepTurmites`, exact saved JSON replay, recording cursor parity, no mutated source frames, unchanged legacy agent recipe schema and unmodified original Langton trajectories.
- Browser automation tests real transition readout, species presets, formation stack, non-destructive live changes, save/load, and existing animated GIF/video recording.
- Full C1–C4, original T1, other engine and export tests, build and Netlify, prior to merge.

## Later expansions

T3 might add programmable multi-state transition matrices with separate write rules, per-agent on-canvas placement, branching rules, collision heat maps and more non-Euclidean lattices where the true adjacency rules support them. We should implement these in separately testable slices rather than conflate a convincing image with a working mathematical model.
