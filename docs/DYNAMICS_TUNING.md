# Dynamics Tuning — make the mathematics actually move

## Observation
The existing studio has many rich palettes, skins, and export controls, but not
every **engine** has a useful range of dynamics. Dead/fixed states and short
transients are genuine for certain CA rules. A control can mathematically work
and still provide little exploratory leverage.

**Rule:** A UI control is not successful merely because it changes a number.
It must change actual discrete state transitions, and its label and active
range must reflect what the underlying math can do. We must NEVER substitute
camera or palette motion to conceal a fixed-point CA.

## P1: Cyclic Chase Sensitivity — implemented in PR (pending QA)
Cause: old startup had 12 phases, threshold 2, and only 36% populated; for
sparse NOISE seeding a specific next state occurs infrequently in the eight
neighbor sites. Values above threshold 1 frequently create an absorbing
configuration. Existing broad range 1–24 is rarely useful.

- Default fresh studio is now 8 phases / threshold 1; old saved recipes keep
  their exact settings and classic rule, including default reach=1,drive=0
  when these new fields are absent.
- **Reach width 1–6** means actual neighbors in states
  (k+1),…,(k+reach) mod N can count toward a chase; passing a threshold
  advances k by exactly one state, not by reach states.
- **Seeded independent excitation 0–1% per cell/generation** gives a
  reproducible stochastic CA variation, not mere palette motion. Set to
  zero to recover fully deterministic classic Cyclic CA. Because drive>0
  can restart evolution at any future step, the GIF recorder must not
  label a temporary quiet interval a genuine fixed point.
- Four **live** presets change threshold/reach/drive on the existing
  universe without deleting cells. The actual number of color phases
  remains a structural control and restarts.
- A real **last-step changed-cell percentage**, plus an explicitly labeled
  approximate **initial NOISE activity** predicted analytically using
  an independent-state binomial model. No claim to forecast long-term
  complexity. A warning explains a low predicted starting rate.
- The new controls are included in random mutations, JSON recipes,
  rollback, capture and cross-lattice neighbor graphs.

Mathematical tests: equality to original bit-for-bit classic rule at
reach=1/drive=0, seeded 50-generation replay with drive, monotone extra
transitions under lower threshold/wider reach, and proper non-settling
GIF cursor under stochastic drive. Browser tests: mobile control visibility,
live edits without resets, presets, save/load, legacy fields defaulting.

## Follow-on phases (separate PRs after P1 and D1 merge)

**P2 — Excitable Flesh and Brian's Brain stimulus laboratory.**
Their refractory march is genuine but commonly burns out. Keep the
original deterministic Brian rule exactly intact. Add clearly named
*stochastically driven variants* with a seeded stimulus probability,
stimulus spacing, and controllable refractory lengths when the engine
allows it. New behavior must change cells, be bounded and replayable,
and avoid falsely settling recordings. Provide viable preset phase
portraits: propagating spirals, sparse waves, high-density seizure,
cooling-down afterglow. Do not relabel new variants as original Brian's Brain.

**P3 — Wireworld circuit excitation.**
Random disconnected conductors and electron-head seeds are not an
oscillator. Keep the exact four-state transition; add honest circuit
seeding templates and optional deterministic timed input injection.
No fake flashes. Wave propagation can only happen on conductors.
Include source placement, period, and actual propagation diagnostics.

**P4 — Species War / Larger Than Life viability.**
Couple birth/survival windows to the genuine graph degree (4/6/8/12/24 or
radius N); offer rule-relative density ranges and semantically meaningful
behavior presets, not static slider endpoints copied between lattices.
Expose invasion survival tradeoffs with clear explanations and
local rule outcome histograms. Ensure old recipes continue to work.

**P5 — Generic Dynamics Inspector + automated atlas.**
Engine-aware changed-cell %, active-source %, neighbor occupancy
histograms, and fixed-point/stochastic-lull classification. Research
viability across seeds, densities, lattices, and rule families at 50,
100, 300 generations; retain stable/oscillating regimes as legitimate
artistic choices. Label presets honestly and record exact parameters
and seed for reproducibility.

## Compatibility
Rhombille D1a is developing in a separate PR, so P1 starts from its own
clean main branch. Rebase/merge both without silently overwriting the
new geometry or Studio Shell. Physical iPhone Safari testing remains
a user acceptance step even when Chromium is green.
