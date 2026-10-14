# AUTOMATART — all 17 engines: real-dynamics control audit

**Scope:** Source-level audit against `src/engine/sim.ts`, engine-specific
steppers, `src/engine/types.ts`, Studio Shell RULES components,
`src/engine/neighborhood.ts`, and Mutation Dice. Separately, the repeatable
`scripts/engine-activity-atlas.mjs` measures real cell-state changes using
the production engine (3 seeds × 80 ticks at common small resolution).

**Key distinction:** `grid / density / initial pattern` select the *starting
world* and usually restart it. `palette / skin / trails` change the *image*
without changing its rules. **Actual dynamics controls** alter state
transitions *after the world already exists*. Some CA have no such native
parameter; adding stimulus/clock/switching must be honestly labeled as a
new mathematical variant or external forcing.

## Source audit — all 17

| Engine | Existing actual state-changing controls | Source-level diagnosis | Best meaningful extension |
|---|---|---|---|
| **Life-like** | 10 built-in B/S rules + custom B/S; supported lattice and neighbor geometry | Healthy rule space, but viable birth/survival counts depend heavily on neighborhood degree and population | Degree-aware viable B/S presets; show expected births/survival at current neighbor histogram; LIVE rules |
| **Brian's Brain** | Neighborhood shape/selected stencil; original ignition is always exactly 2 firing neighbors | **Undertuned.** No engine-specific live rule dial; a spent wavefront cannot reignite itself | Preserve exact Brian's Brain; offer clearly named *driven Brain* variant with deterministic seeded pulses, pulse interval and location, plus optional parameterized Brian-inspired birth rule |
| **Cyclic** | Chase threshold, forward phase reach, seeded spontaneous drive, number of states; neighborhood shape | Original 12 phases, density .36 and threshold 2 made chasing too rare. **P1 already merged**, with 8 phases / threshold 1 startup and additional dynamics | Validate safe/stalled regimes across state count, lattice degree, fill and reach. Keep classic reach=1 / drive=0 exact and old recipes intact |
| **Wolfram** | Elementary rule 0–255; rule 30/90/110/184 shortcuts | Real rule variation but only one numeric field; a one-dimensional history scrolls even if it stops producing new content | Eight-bit neighborhood truth-table editor; live rule families; honest row-input/seed injector and cycle indicators; keep elementary CA faithful |
| **Afterlife / Generations** | Birth and survival count sets, total refractory states, neighborhood | Real knobs already, but B3/S23 with many refractory states can extinguish waves or collapse in non-8-neighbor geometries | Wave-specific viable B/S/C presets, quick refractory adjustment, optional explicitly driven variant |
| **Excitable Flesh** | Excitation neighbor threshold and refractory length; neighborhood | Can irreversibly exhaust all active cells: refractory stages alone cannot start new excitation without firing neighbors | Seeded sparse pacemaker sites, firing interval, dynamic stimulus source; 3–4 calibrated propagation presets; preserve pure unforced rule |
| **Larger Than Life** | Radius 1–5 and absolute birth/survival intervals | **Control scaling problem.** Changing radius changes maximum count as (2r+1)^2−1, but existing rule counts remain tiny fixed integers unless manually rebuilt | Normalize windows by fraction of available neighbors, preserve absolute mode, scale B/S intelligently when radius changes, add growth/erosion regimes |
| **Species War** | Species count, empty-cell colonization threshold, ally survival, attacker bias; neighborhood | Real levers, but deterministic competition may settle into one dominant species, stasis or extinction | Live invasion/defense regimes, source/invasion pulses, territory turnover and spatial source painter; label stochastic variants |
| **Directional Life** | 8-bit oriented birth pattern, exact/contains, rotational/dihedral equivalence, survival range | Technically rich but **no guided regimes**; exact templates can make birth extremely rare | Birth-match rate diagnostics, presets for travelling fronts/filaments, optional periodic rotation of the *rule* (explicit time-dependent CA) |
| **Margolus / Reverse Universe** | 2×2 clockwise rotation and rewind; changing initial grid | **Undertuned.** One fixed bijective block update, no rule choice | Library of true bijective 16-pattern block permutations, reversible rule composition, controlled block alternation and verified exact backward replay |
| **Wireworld** | Brush conductor / electron head / tail; original four-state rule fixed | **Severely undertuned as art instrument.** Random disconnected conductors are not a working circuit or oscillator | Honest conductor templates (loops, forks, clocks, glider-like signal circuits), timed external input/injection; preserve classic 4-state Wireworld |
| **Abelian Sandpile** | Grain feed 0–64/tick, 1–8 parallel toppling rounds, seeded-random or center feeder, paint grain count, boundaries | Already multiple true controls; visual pulse depends on a good initial mass distribution, and periodic grids may not stabilize | Feeder geometries: lines, rings, multi-source deposition; discrete bursts, avalanche-size/toppling diagnostic and thresholds |
| **Hodgepodge Machine** | Sick/ill infection divisors K1/K2, severity growth, number of severity states, material brush; 3 live presets | **Good** existing dynamics knobs, but intuitive sweet spots depend on initial stage distribution and severity count | Explain / calibrate K1-K2 versus initial infection; add edge-of-wave, slow bloom and percolation presets validated by activity profile |
| **Forest Fire** | Per-tick tree growth / lightning probabilities, tree/fire paint, three climate presets | Already genuinely driven and reproducible, but low event rates can appear inert for stretches | Better very-low-rate sensitivity, effective ignition times per 10k sites, firebreak/flammability variants and measured fire/wave counters |
| **Ising Model** | Temperature, coupling +/-2, field +/-2, sweeps per frame, spin polarity paint | **Good** real physical degrees of freedom, especially near the critical region; solid magnetic domains can look quiet at low T | Fine T adjustment near ~2.269 for J=1, H=0 square ferromagnet; true thermal quench/field schedules, susceptibility and domain-wall counters |
| **Turmites / Langton Ant** | 2–12-symbol L/R turning law, 1–12 agents, paint underlying track color, boundary mode | Active agent motion exists, but controls over *where and how* the agents start are underdeveloped | Multi-agent formations, spawn placement, initial heading, offset clocks/turn scripts, configurable track seed; preserve sequential interactions |
| **HPP Lattice Gas** | Particle bitmask N/E/S/W, reflecting wall geometry, material paint and boundary mode | Original collision/streaming physics is fixed; user can manipulate initial gas and obstacles but has no continual inflow | Time-scheduled external particle injection and source/sink boundaries, collision visual inspector, momentum/density probes; keep conservation truthful when sources are off |

## Empirical 17-engine baseline: production rules, real cell transitions

**Method:** 3 seeded worlds per scenario (seeds 82641, 12345, 989898), 48-wide square lattice,
36% nominal NOISE fill, periodic edges, 80 synchronous generations. Unlike CSS animation,
the metric is actual percentage of cells whose canonical state changed. Sandpile uses
true uint32 grain-height deltas. Numbers average across the 3 seeds.

| Engine | Changed cells: ticks 1–10 | Changed cells: ticks 61–80 | Fully quiet in final 10 ticks | Ticks with any change (mean) |
|---|---:|---:|---:|---:|
| life | 27.44% | 7.86% | 0/3 | 80/80 |
| brians | 38.76% | 9.61% | 0/3 | 80/80 |
| cyclic | 40.72% | 0.00% | 3/3 | 17/80 |
| wolfram | 6.47% | 50.30% | 0/3 | 80/80 |
| generations | 44.11% | 0.00% | 3/3 | 45/80 |
| excitable | 75.23% | 0.00% | 3/3 | 13/80 |
| larger | 28.83% | 37.06% | 0/3 | 80/80 |
| species | 13.25% | 0.00% | 3/3 | 13/80 |
| oriented | 3.76% | 0.03% | 2/3 | 33/80 |
| margolus | 45.81% | 45.81% | 0/3 | 80/80 |
| wireworld | 11.08% | 21.25% | 0/3 | 80/80 |
| sandpile | 88.73% | 95.30% | 0/3 | 80/80 |
| hodgepodge | 80.57% | 91.21% | 0/3 | 80/80 |
| forestfire | 1.60% | 2.44% | 0/3 | 80/80 |
| ising | 30.11% | 19.31% | 0/3 | 80/80 |
| turmites | 0.04% | 0.04% | 0/3 | 80/80 |
| hpp | 91.73% | 91.32% | 0/3 | 80/80 |

### Critical parameter comparisons (same seeds, initial fill and sample period)

| Engine / modified settings | Changed cells: ticks 1–10 | Changed cells: ticks 61–80 | Quiet final 10 ticks | Ticks with change |
|---|---:|---:|---:|---:|
| cyclic/legacy 12 phases / chase 2 | 5.32% | 11.12% | 0/3 | 80/80 |
| cyclic/legacy chase 1 | 29.64% | 0.00% | 3/3 | 29/80 |
| cyclic/legacy chase 2 + reach 3 | 39.25% | 0.00% | 3/3 | 27/80 |
| brians/4-neighbor brain | 12.49% | 0.00% | 3/3 | 6/80 |
| brians/24-neighbor brain | 23.40% | 38.36% | 0/3 | 80/80 |
| excitable/threshold 1 | 75.28% | 0.00% | 3/3 | 11/80 |
| excitable/threshold 3 | 45.73% | 0.00% | 3/3 | 10/80 |
| excitable/fast refractory 3 | 58.99% | 100.00% | 0/3 | 80/80 |
| generations/refractory 3 | 25.77% | 1.06% | 1/3 | 71/80 |
| species/birth 3 / survive 2 | 13.20% | 0.00% | 3/3 | 17/80 |
| larger/radius 3 old absolute bounds | 23.93% | 35.04% | 0/3 | 80/80 |
| larger/radius 3 scaled windows | 15.60% | 0.00% | 3/3 | 22/80 |
| wireworld/very dense conductor | 57.90% | 68.08% | 0/3 | 80/80 |
| sandpile/no feeder | 88.80% | 98.95% | 0/3 | 80/80 |
| forestfire/no growth/lightning | 0.57% | 0.00% | 3/3 | 12/80 |
| forestfire/active fire climate | 5.26% | 6.76% | 0/3 | 80/80 |
| ising/absolute zero | 10.44% | 0.00% | 3/3 | 12/80 |
| ising/thermal disorder | 62.47% | 63.29% | 0/3 | 80/80 |
| wolfram/rule 0 | 1.59% | 0.00% | 3/3 | 48/80 |
| wolfram/rule 110 | 4.92% | 42.05% | 0/3 | 80/80 |

**Interpretation—not automatic bug classification:**
- Default **Cyclic, Afterlife, Excitable, Species War** are quiet across all
  three seeds by the end; **Directional Life** in 2/3. These are first-priority
  practical operating-range targets.
- Cyclic P1 expanded the control space but **did not guarantee a long-running
  startup**: its 8-phase/threshold-1 default ceased changing on all three
  48-wide seeds. The old 12-phase/threshold-2 setting happened to remain active
  in these small wrapped tests! Actual viability is nonlinear in N, threshold,
  reach, density, size and lattice. Test presets, do not assert monotonic
  sustained activity from high initial activation.
- **Excitable refractory length of 3** remained changing across all 80 ticks
  at this density whereas refractory 8 extinguished. That is concrete evidence
  for making recovery timing a prominent *live* control and adding measured presets.
  High change rate alone is not proof of richly structured motion; periodic
  oscillation may be visually simple.
- **Brian's Brain on 4 neighbors** extinguished all three; 24-neighbor Brain
  kept changing. Its existing neighborhood controls are extremely important
  and deserve accessible live presets—not only a new stochastic mechanism.
- Margolus, HPP, Hodgepodge, Sandpile and other systems have plenty of measured
  state changes; **Margolus** has little rule variety despite high activity.
  **Turmites** change only a tiny proportion of sites per tick because one agent
  writes one tile, but its visible head moves: a global percent is not a universal
  test of interesting behavior.
- The one naive Larger Than Life radius-3 "scaled" window tried here extinguished;
  another radius-3 window stayed active. **Simply multiplying thresholds by
  degree is not a valid solution**. Sweep useful rule windows and offer
  *validated* parameter-relative presets.
- At thermal zero Ising converged and stopped, while high temperature kept
  changing; both are physically expected regimes. Forest Fire without ignition
  and regrowth is eventually inert as expected. Wolfram rule 0 is another
  intentionally absorbing case. None is automatically a bug.

**Limitation:** 48-wide 80-tick snapshots are triage, not a proof of long-term
periodicity or of similar behavior on mobile 96-wide, alternate lattices or
art-directed initial patterns. Follow-up presets should be tested across
more grid sizes, multiple densities, 100–300 generations, and pattern families.
The population metric is NOT a perceptual-motion score.

## Work phases, re-ordered from empirical viability evidence

**A — rescue early absorbing states without hiding the mathematics.**
- **A1 Cyclic P1b:** measured current P1 default also stops under some seeds.
  Calibrate joint density/phase-count/reach/threshold presets for 32/96/192 grids;
  offer *pure* sustained regimes when available, alongside opt-in seeded drive.
  Do not promise any one threshold alone produces infinite motion.
- **A2 Excitable + Afterlife:** put refractory length and birth/activation
  parameters near the stage, with measured *wave, pulse, persistence,
  quench* presets. Add optional clearly labeled periodic stimulus/pacemakers
  for excitation that genuinely ran out. Keep unforced rules exact.
- **A3 Species War + Directional Life:** preview invasion/defense and
  oriented-birth match rates on the current neighborhood; presets chosen to
  avoid trivial full conquest or no births when the goal is sustained change.

**B — unlock real rule choices in engines with too few controls.**
- **B1 Brian's Brain:** make already-supported 4/8/12/24 neighborhoods highly
  visible. Measured 4 died, 24 remained active. Then offer optional distinct
  driven Brian variant with pacemaker locations and interval.
- **B2 Margolus:** more genuinely invertible 2×2 block permutations and
  reverse-safe rule sequences; plain rotation stays available.
- **B3 Wireworld:** proper conductor circuit templates and external timed
  sources, not random material fields masquerading as powered circuits.
- **B4 Turmites:** agent placement, initial heading, formations and run-time
  interpretation of the L/R rule; no invented free-form particle physics.

**C — fix parameter scaling, not merely increase maxima.**
- **C1 Larger Than Life:** search viable B/S windows over each radius and
  density, show neighborhood-count fractions as an *additional* representation,
  and give tested regimes. One naive scaled-window sample failed in our sweep.
- **C2 Life, Wolfram:** neighborhood-relative birth/survival suggestions,
  eight-bit Wolfram truth table, source row tooling and cycle diagnostics.

**D — deepen already responsive instruments.**
- **D1 Ising + Forest Fire:** finer critical-temperature and rare-ignition
  control, cooling/quench and firebreak experiments, true parameter schedules.
- **D2 Hodgepodge + Sandpile:** infection response previews, multiple
  physically real feeders, avalanche severity and wavefront diagnostics.
- **D3 HPP:** localized boundary injection, wall chambers, source/sink
  accounting and flux visualization with conservation truths explicit.

**E — universal Dynamics Inspector.** Always show honest last-step and
rolling 10/50/100-tick changed-cell %, relevant sources, state diversity,
local match/neighbor histograms, and distinction between an absorbing
fixed point, a driven stochastic lull, and periodic motion. Default
presets should be tested at multiple resolutions/densities/lattices.
No merely decorative sliders in the Dynamics group.

**Release order:** work in independent PRs, run numerical replay + current
Chromium GIF/video smoke, keep old recipes exact, do not assume production
iPhone Safari performance is proven by desktop Chromium.

## UI behavior contract

1. Put a compact **DYNAMICS** section near the live preview: 2–4
   high-leverage, engine-specific controls; advanced rules stay in RULES.
2. Mark every control **CHANGES CELLS / NEW INITIAL WORLD / VISUAL ONLY**.
   Explain why a slider is disabled when an engine requires a fixed rule.
3. Live edits to rule sensitivity must not erase the current world.
   Changing state representation or number of phases may require a reset
   and must be clearly labeled.
4. Valid slider extremes should remain meaningful; when a setting
   depends on neighborhood degree or other settings, recompute its scale.
5. Keep pure canonical rules as a one-click option and distinctly label
   driven, stochastic, clocked and generalized variants.
6. Keep complete recipe reproducibility, GIF/video parity, and explicit
   original-vs-variant regression tests before every merge.

## Interpretation of the measured atlas

The accompanying CI script reports first-10 and last-20 generation
changed-state rates, end occupancy, and quiet/frozen seed counts for
the 17 default engines plus selected variants. It samples only one
resolution, density, pattern and lattice. Its numbers are **diagnostic**,
not a universal ranking. A phase with no changed cells can be a legitimate
absorbing state; an Ising or forest-fire stochastic lull does not prove
permanent stability. HPP particle transport can move indefinitely even
with statistically uniform appearance.

The initial sweep prints to the PR's **Build and smoke-test Automatart**
Actions log under **Audit real activity across all 17 automata**.
