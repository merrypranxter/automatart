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

## Priority by actionable deficit

- **P2 Brain + Excitable:** users need actual sustained wave control. Offer
  opt-in driven variants, never silently change canonical algorithms.
- **P3 Wireworld + Margolus:** currently too few rule/input controls. Build
  useful genuine circuits and reversible pattern-permutation choices.
- **P4 Larger Than Life + Species War:** match thresholds and viable regimes
  to neighborhood degree and actual local occupancy, not static 1–120 integers.
- **P5 Wolfram + Afterlife + Directional Life + Life:** small rule composers,
  viability presets and real match/firing counters. Keep B/S and classic rules.
- **P6 Sandpile + Hodgepodge + Forest Fire + Ising + Turmites + HPP:** these
  already move under genuine settings; expose more meaningful experiment
  controls, mathematical probes, calibrated presets and sources where justified.
- **P7 cross-engine dynamics dashboard:** actual changed-state % averaged over
  10/50/100 generations, no-change streak, population/phase histograms,
  match frequency and fixed-point vs driven lull status. An engine's natural
  cycle or static attractor is *not* automatically broken.

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
