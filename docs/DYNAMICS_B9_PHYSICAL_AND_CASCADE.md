# Dynamics B9 — The First Physically Cascaded AND Gate

## Scientific result

B9 adds a **real two-stage Wireworld computation**. A NAND junction is physically connected by a genuine conducting electron track to a downstream, timed NOT-like inhibition junction. The second junction also receives **two independently propagating bias pulses** from distant rails, phase-matched in actual simulation time. The final output appears only for input A=1, B=1. No Boolean lookup or special per-cell transition is inserted; it is entirely the original synchronous 4-state Wireworld rule.

### Exact geometry and timing

The first NAND detector sits at relative coordinate (0,0). Its fixed bias HEAD at (-1,0) and optional A and B HEADS at (-1,1), (0,1) give one-to-three HEAD neighbors, so the original 1–2 threshold emits a head except for input 11.

A first diagonal conductor goes from (0,0) to (r,-r), with r=7–12. It carries that **real NAND output** to tick **r+1**. No intervening renderer, user-interface Boolean function, or simulated delay counter is involved.

The second detector is positioned at (r+1,-r-1). The NAND rail's endpoint at (r,-r) is the second detector's SOUTHWEST neighbor.

Two independent bias rails approach the second detector from its NORTHWEST and NORTHEAST neighborhoods. Their roots each begin as a genuine HEAD **r+1 actual conducting transitions** from their respective detector-adjacent endpoints. They therefore both arrive exactly at tick **r+1**. The second detector sees:
- If NAND emitted a traveling HEAD (A/B = 00,01,10): two bias HEADS + NAND HEAD = **three**, so it stays a conductor and never sends the final pulse.
- If NAND was suppressed (A/B = 11): two bias HEADS, no NAND HEAD = **two**, so it becomes an electron HEAD at tick **r+2**.

The outgoing southeast diagonal rail leads to a remote AND output d=5–12 conductor segments away; the final HEAD is observed at exactly **tick r+2+d**, only for input 11.

The three incoming detector contacts are arranged to be nonadjacent to the first outgoing southeast conductor, preventing any incoming head from short-circuiting the second junction. There is no fabricated head state in the engine when a Boolean flag is true.

### Verified truth table

| A | B | Traveling NAND HEAD at T(r+1) | Two bias HEADS at T(r+1) | Detector HEAD at T(r+2) | Final AND HEAD |
|---|---|---|---|---|---|
| 0 | 0 | Yes | Both | No | No |
| 0 | 1 | Yes | Both | No | No |
| 1 | 0 | Yes | Both | No | No |
| 1 | 1 | No | Both | Yes | One at T(r+2+d) |

The whole trajectory is checked for additional late output pulses, not just the expected event tick. For every radius 7..12 and several output lengths, the truth table is computed using the same production `stepWireworld` as the live simulation.

### What the artist can do

The B9 **TRUE TWO-STAGE LOGIC CASCADE** instrument appears in the WIREWORLD Rules panel, without hiding the existing canvas or other circuit instruments.

It offers adjustable NAND-to-NOT conductor length, independently adjustable output rail length, all four quarter-turn orientations, A and B initial-condition toggles, and an entirely **measured** four-row timing chart. The user can install a certified full device directly into the live universe. The installer preserves current generation, clears only a local interference margin to isolate the test, rejects edge-clipped circuitry without changing the canvas, and saves the real 0/1/2/3 cells to the existing portable recipe.

An on-stage inspector exposes the actual states of the stage-one NAND port, stage-two detector, its two bias contacts, and final AND output. **MEASURE ACTUAL CASCADE** runs the B5 immutable 64-tick current-world scope and reports real HEAD arrival times. It can reveal effects from the user's later drawing, new sources, or altered excitation rules.

### Strict certification boundaries

- This is a **physical wired two-stage cascade**, not merely a truth-table composition of unrelated NAND and NOT functions.
- It is a **seeded single-shot circuit specimen** with carefully synchronized bias waves and predefined input contacts, **not** an arbitrary reusable clocked NAND/NOT module that accepts signals at any time. Independent clocked cascades require further research on wavefront regeneration, fanout and reset.
- Its behavior is certified under **canonical square-lattice Wireworld (1–2 HEAD neighbors), external electrodes OFF**, and isolated layout. The GUI refuses to silently rewrite noncanonical user settings.
- A true isolated crossover has **not** yet been established. The B3 plus-shaped conductor remains connected.
- The AND certificate is limited to the measured all-four-case full-world signal traces, not arbitrary surrounding conductor arrangements.

### Acceptance tests

- 6 radii × 3 output lengths × 4 cases = **72 isolated physical AND trajectories**, asserting the NAND wave, two bias waves, second-stage inhibition and final port timing.
- 3 radii × 3 lengths × 4 cardinal orientations × 4 Boolean cases = **144 integrated real-world stage trajectories**, exact saved JSON replay, no late HEADs, all four states canonical and no external signal injection.
- A non-destructive 64-generation four-probe future scan checks NAND, stage 2, bias and final output. Clip rejection is atomic.
- TypeScript production build, all previous B1–B8 CI, iPhone-width Chromium controls, GIF Worker and video recorder regression, and Netlify preview must all pass before merging. Physical iPhone Safari acceptance should follow.

### Next research

B10 could tackle genuinely reusable pulse-driven gates, timing-phase controls and routing through verified noninterfering crossings, without assuming that these synchronized initialized specimens already form a fully clocked computer. Alternatively return to broad aesthetic/simulation controls and new mathematical skins.

No Copilot credits are needed.
