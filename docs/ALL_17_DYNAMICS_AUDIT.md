# AUTOMATART — ALL 17 ENGINES: DYNAMICS AUDIT

Audited from the actual TypeScript engine transitions, seed generator, settings,
and Studio Shell controls (October 2026). This document is an **implementation
audit**, not a claim that every combination was exhaustively benchmarked.

## What the user noticed
A slider can be mathematically connected and nevertheless have almost no
productive range at the active graph degree / state count / initial population.
Changing **color** while the underlying world is fixed cannot cure this.

Four distinct diagnoses must not be conflated:

1. **Sparse chance of activating the rule:** thresholds demand a conjunction
   statistically unlikely in the available neighborhood and seeded states.
2. **Exhausted initial excitation:** after an initial flash, nothing remains to
   propagate a wave. Unlike a stochastic CA, this is genuinely absorbing.
3. **Rule has almost no controls:** the evolution is deliberately exact and
   fixed, but needs better *initial conditions, boundary/material/source
   controls*, or an explicitly labeled new variant.
4. **Visually stationary does not mean physically stationary:** an HPP gas can
   stream in a spatially uniform state, and a reversible automaton may have
   periods or translations. Activity diagnostics must not confuse these with
   death.

**Hard rule: mathematical structure first.** Keep every canonical named
automaton's exact rules as selectable baseline. If adding a seeded drive,
collision alternative, feeding operation or generalized update, label it as
a **variant** and preserve exact recipe reproducibility. Do not claim that
a palette cycle, FX trails, zoom or rendering deformation makes cells move.

## Individual instrument assessment

| Engine (17) | Existing actual evolution controls | Potentially frustrating state / range | Appropriate added levers (planned, not yet coded unless stated) | Priority |
|---|---|---|---|---|
| 1. **Life-like** | 10 named B/S rules + custom B/S, live neighborhood shape/stencil, density and lattice | Many random births die; rule vote counts valid on square may be impossible on triangle or rhombille degree 3/4 | Topology-aware valid B/S presets, oscillator/gun and structured motifs, survival/activity preview; keep pure Conway | Medium |
| 2. **Brian's Brain** | No dedicated live rule control; neighborhood geometry and initial fill | Exact-two firing neighbors followed by a two-tick tail tends to extinguish without a viable pattern or injection | User-placed repeating exciters, driven Brian *variant* with deterministic hashed sparks, wave sources, source interval, activity meter | **Critical: P2** |
| 3. **Cyclic Chase** | Color species N, neighbor threshold, newly added forward reach, seeded drive, neighborhood shape + four behavior presets | Old N=12/T=2/random fill .36 poorly matched; T=2/3 near dead | **P1 already merged:** N=8/T=1 fresh startup; reach 1–6, seeded drive 0–1%, last-step movement and initial-activity estimate. Keep reach=1,drive=0 as original CCA | **P1 done** |
| 4. **Wolfram elementary** | Rule number 0–255, four quick rule selections, bottom-row seeding, wrap | Some rules terminate into uniform rows; lack of useful categorized rule families, effective source patterns | Rule catalog by computed behavior class, custom initial seed brush on source row, periodic row injection *as optional forcing*, history controls not confused with real rule change | Medium |
| 5. **Generations** | B/S count editors, refractory state count C, neighborhood | B/S defaults may fail on low-degree lattices, refractory population can consume all activity | Viability presets adapted to degree, refractory time profiles, controlled point stimuli (as separate driven variant), measure active vs refractory | **High: P2** |
| 6. **Excitable Flesh** | Threshold, refractory states C, neighborhood | A wavefront can run out; threshold 2 on degree 3–4 / sparse patches may be prohibitive | Seeded spark drive, wave source material, pulse interval, excitability presets that retain exact Greenberg–Hastings option | **Critical: P2** |
| 7. **Larger Than Life** | Square radius 1–5, birth and survival min/max | Absolute default count windows B6–9/S5–12 become wildly mismatched when radius changes from 2 (24 neighbors) to 5 (120) | Graph-degree-normalized ranges, density-aware viable windows, neighborhood percentage editing, living/transition diagnostics | **High: P4** |
| 8. **Species War** | Competing species N, invasion threshold, survival threshold, attack bias, lattice/neighborhood | Thresholds and defenses may produce a static single-species takeover or dead zones; every slider uses raw votes | Defended/unstable invasion presets, balance/territory histogram, ratio-aware thresholds based on neighbor degree, collision/competition event rates | **High: P4** |
| 9. **Oriented / non-totalistic** | Eight-point birth pattern, exact/contains match, rotations/reflections, survival range | Exact sparse neighbor bitmask in random field is rare and may never trigger; many shapes result in static/dead worlds | Mathematically viable pattern generators, birth match probability estimate, allow neighborhood-vs-template constraints, oriented glider seeds; no fake stochastic symmetry | **High: P4/P5** |
| 10. **Margolus** | Fixed bijective rotating 2×2 partition; rewind and wrap, no behavioral knob | True invertible dynamics but only one rotation rule; many random or uniform patterns lack distinct evolving structures | Real invertible permutation rule chooser, clockwise/counterclockwise/block swaps, reversible phase scheduling, pattern injectors before play; mathematical bijectivity verified | **Critical: P5** |
| 11. **Wireworld** | Conductor/head/tail brushes; full four-state rule, fixed eight neighbors | Random disconnected wires extinguish electron heads almost immediately; painting conductor paths alone doesn't create powered circuits | Genuine wire templates (rings, crossings, clocks, source/sink), periodic electron injection on conductors, adjustable actual input period, circuit event meter | **Critical: P3** |
| 12. **Sandpile** | Grains per generation, 1–8 parallel toppling passes, feeder position center/random, grain brush, finite/wrapping | Without feeding a finite sandpile must settle; centered only vs random rain is limited | Source masks/multiple feeders, traveling feeder, threshold-of-toppling material experiments as **clearly not canonical sandpile**, avalanche size vs time readout | Medium |
| 13. **Hodgepodge** | Sick/ill divisors, growth, number of severity states, infection brush, three presets | Too-fast severity progression can burn out waves or flatten phases; integer divisor ranges coarse | Progression as fraction of state ladder, live phase portrait/healthy-sick-ill meter, seed sick/ill distribution presets, calibrated resonant wave parameters | Medium |
| 14. **Forest Fire** | Tree regrowth probability, lightning probability, material brush, three climates | Sparse burning, slow probabilistic onset, or rapid canopy loss can look inert; long lull need not mean fixed | Log-scale probability handling at low values, clustered tree seeding, periodic climate source/sweeps labeled externally forced; preserve stochastic Drossel–Schwabl rules | Medium |
| 15. **Ising** | Temperature, ± coupling, external field, 1–4 checkerboard Metropolis sweeps, spin brush, energy/magnetization | Under cold/strong field forms stable domains; that's meaningful physics, not a bug | Temperature schedules / annealing, quench presets, thermodynamic phase-trace charts, boundary/domain seeds; retain exact energy and stochastic updates | Lower |
| 16. **Turmites / Langton** | Editable 2–12-state L/R turning rule, 1–12 agents, track color brush | Agents always move but high-level controls for how/where they begin or collide are sparse | Starting positions/headings, agent symmetry and arrangements, tick stepping and trajectory presets, geometric track metrics; preserve deterministic agent order | Medium |
| 17. **HPP Lattice Gas** | 15 nonempty four-channel masks, walls and 7 presets, density and boundary, mass and momentum readouts | Physical particles move even if cell colors look spatially uniform; walls and initial conditions limit the experiment | Chamber/obstacle templates, verified-conservative collision-rule variants, jet emitters as explicit mass-changing sources, vorticity/directional transport measurement | Medium |

The 17 are enumerated exactly as `src/engine/types.ts:EngineId` in main.
Rhombille/hex/triangle/square are **lattices, not separate engines**.
Neighborhood selection impacts only compatible engines; square-only rules
must not silently accept a fake neighborhood.

## Critical distinction: seeding and continuous stimulation

There are at least three separate artistic controls:

- **Initialize** — how the state is constructed at generation zero; this
  may restart and should have useful seed patterns and populations.
- **Evolve** — how a state changes from generation k to k+1; e.g. birth count,
  coupling, chase width, neighborhood, collision rule. Editing these should
  usually apply live when state dimensions remain valid.
- **Stimulate** — an explicit source of energy, particles, infection or
  excitation added each generation, separate from the unforced canonical
  mathematical rule. Must identify injection rate and exact seed.
  
The Studio Shell should label which category each control belongs to,
avoid exposing irrelevant controls for a species, and make the difference
between adjusting an existing world and resetting it obvious.

## Implementation order (the art is **not** postponed indefinitely)

1. **P1 Cyclic:** merged. Follow-up PR #19 contains extra post-merge
   regressions; do not merge PR #19 automatically.
2. **P2 Excitation Laboratory:** Brian, Excitable, Generations. Three
   distinct, precise mathematics; preset waveform seeds and optional
   injected drive, no dishonest 'classic' labels for driven behavior.
3. **P3 Powered Circuits:** Wireworld circuit motifs/oscillators/input
   period; diagnostic tells whether a real electron is propagating.
4. **P4 Threshold Calibration:** Species, Larger Than Life, Oriented,
   and topology-aware Life / Generations editing.
5. **P5 Invertible Worlds + Rule Atlas:** Margolus bijective permutations,
   Wolfram rule-family explorer and geometric initialization.
6. **P6 Physical/Natural Systems:** Hodgepodge/Forest/Ising presets,
   sandpile source field, HPP chambers and Turmite arrangement controls.
7. **P7 Shared Diagnostics:** engine-specific last-step changes, fraction
   actually propagating, input/source count, rough liveness modes;
   stochastic lull vs fixed state; mathematical invariants.
8. **Existing D and F roadmap remains active:** D1b Kagome, D1c
   square–octagon, D2 Penrose, D3 Voronoi, D4 compatibility/mobile,
   then F6 new skins. These can proceed between tuning PRs rather
   than waiting for every P phase to complete.

### Testing / reproducibility
Use a lightweight optional batch audit (see `scripts/dynamics-atlas.mjs`)
of selected seeds, initial densities and 60 generations to **sample**
candidate parameter behavior. Never label one 60-step sample as a proof
of sustained activity or chaos. Run when considering a new rule or preset,
not necessarily with every app build. Still test the actual edge behavior,
conservation/reversibility, JSON recipes, and browser recording for
each changed algorithm, plus iPhone acceptance separately.
