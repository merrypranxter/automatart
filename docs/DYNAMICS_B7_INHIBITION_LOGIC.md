# Dynamics B7 — Canonical Four-State Inhibition Gates

## What is actually new

B7 extends the physically verified Wireworld circuit library with real **NAND (¬(A∧B))** and **NOT (¬A)**. The original four-state production transition is **unchanged**:

- VOID stays VOID
- HEAD becomes TAIL
- TAIL becomes CONDUCTOR
- CONDUCTOR becomes HEAD if **exactly one or two** Moore-8 adjacent cells are HEAD

A conductor with **three or more** HEAD neighbors stays conductor. This nonmonotonic excitation threshold is a real physical mechanism for logical inhibition, not an invented Boolean exception.

## How the gates are built

NAND has a diagonal conductor from central junction (0,0) to remote output (r,-r). The central conductor is initialized near one fixed bias HEAD at (-1,0); optional A and B HEADS at (-1,1) and (0,1) are controlled by initial input bits. The junction sees `1 + A + B` real neighboring electron HEADS at t0. Thus 00→1, 01→2, 10→2 cause junction ignition at t1; 11→3 does not. The output is **one actual HEAD** at t=r+1 in the first three cases and none in 11.

NOT uses the same geometry with **two initialized bias HEADS** at (-1,0) and (-1,1), and an optional input HEAD at (0,1). Junction neighbor count is `2 + A`: 0→2 ignites, 1→3 suppresses. Output is one actual HEAD at t=r+1 iff the input is 0.

The outgoing diagonal's first cell is not Moore-adjacent to any of the three contact cells. This prevents a seeded emitter HEAD from short-circuiting the junction and bypassing the supposed computation.

**Important**: "Bias HEAD" here means a **seeded t0 electron state**, not a permanent voltage source. Both circuits are **single-shot initialization-dependent logic devices**. They are not claimed as indefinitely running clocked NAND/NOT circuits. A 1 means an output HEAD appears at the specified remote cell; 0 means none appears in the measured window, not merely a dark frame. This distinction is checked for dozens of generations beyond the expected pulse to reject spurious late activations.

## How it becomes usable art

Under Wireworld rules, the existing verified logic panel now lists:
- Existing OR, fanout, and dual-contact XOR, intact
- New physical NAND, four-case measured 00/01/10/11 truth table
- New physical NOT, measured input 0 and 1 truth table
- **B7 collision microscope**: real count of the central conductor's 8 neighboring HEADS at t0, actual cell state at t1, exact observed output HEAD-arrival ticks, explicit pass/fail

All NAND/NOT circuit sizes r=7..12 and 0/90/180/270 rotation are stampable directly into the live canvas. Installation pauses rather than restarting the world, writes real 0/1/2/3 cells in a local cleared area and preserves all pixels outside. World snapshots, exports and the B5 real-world signal probe continue to operate on those exact cellular states.

A changed surrounding artwork, novel excitation rule or external clock can change live gate behavior: the *isolated canonical gate certificate* never falsely promises otherwise. Use the real-world scope to analyze modified circuits.

## Acceptance and scientific integrity

1. Exhaustive isolated truth-table simulation for NAND/NOT across all 6 supported radii, independent physical junction HEAD census and center-state check.
2. Long-horizon output verification (at least 2r+60 true steps) proves **no late spurious output HEADS**, especially for NAND 11 and NOT 1.
3. Full world integrated `stepWorld` histories for all 6 radii, all 4 rotations and every input case (144 actual canonical world scenarios). Exact raw-world recipe roundtrip and evolution equality, with no output-driving sources.
4. 64-tick nondestructive scope measurements and mathematically honest rejection of unverified AND or isolated wire crossovers.
5. Previous B1–B6 numerical gates, Chromium phone-width interface, GIF worker export and video recording tests all green before merging. Real iPhone Safari still deserves manual acceptance.

## Deliberately not claiming yet

**AND, NOR, XOR/NOT/AND cascades on arbitrary inputs, and insulated wire crossovers remain research tasks.** Composing truth functions on paper is not a verified physical composition: timing alignment, adjacency feedback, unwanted head regeneration and source geometry must all be tested. A NAND gate is a functionally complete *Boolean operation in principle*, but a network of independently seeded NAND arrangements is not automatically a physical digital computer.

Potential next B8: find and prove a true physically composable signal inverter/collision cascade with timed fanout, then use it to earn an actual AND gate rather than importing logical arithmetic into the engine.
