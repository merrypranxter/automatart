# Dynamics A2 — real excitable and Afterlife wave experiments

## Why
The 17-engine atlas found default **Excitable Flesh** and **Afterlife** can
reach absorbing states within 80 ticks. Some live rule changes help, but they
cannot revive an exactly dormant world under a rule with no spontaneous input.

These controls deliberately alter the **underlying cell states**. They are not
palette cycling, simulated camera motion or post-processing.

## What A2 adds

- **Pure / unforced (default)**: the original Greenberg–Hastings-style
  excitable rule and the existing Afterlife B/S/C rule remain bit-exact.
  An old saved recipe with no stimulus settings opens in this mode.
- **Clocked pacemakers**: a reproducible integer generation interval (1–120)
  injects state 1 only into currently resting state-0 sites. Spatial sources:
  one central heart, four quadrant hearts, or twelve separate points on a
  geometrical ring. A refractory or living site cannot be overwritten.
- **Seeded sparse sparks**: per-rest-cell/per-generation probability between
  0 and 1% in 0.01%-unit increments. Randomness depends solely on the seed,
  generation and cell ID, enabling exact replay and frame-independent export.
- **Six live behaviors**: unforced, single heart, four hearts, twelve-point
  ring, sparse sparks, and seed storm. Mode, clock, and source/rate switches
  change the *running* world without restarting it.
- **Live diagnostics**: actual last-step changed-cell percentage and number
  of genuine externally ignited cells; natural births don't inflate the latter.
- **Existing real sensitivity knobs preserved**: Excitable's threshold and
  refractory-stage count; Afterlife's B/S/C birth, survival and refractory
  counts; real 4/8/12/24 or exotic tiling neighbor relationships.
- **Recording**: a transient quiet interval between periodic pulses or
  stochastically rare sparks is NOT recorded as an absorbing fixed point.
  Preset behavior is stored in recipe settings; the engine cell array stays
  authoritative, without any invisible RNG state.

### Honesty
These are clearly labeled **forced CA variants** when sources are enabled.
The original autonomous algorithm is always one click away. We do not claim
that every ignition will produce self-sustaining waves, and deliberately
leave natural extinction available as a mathematical outcome.

Changing a recovery-state count resets the world because the meaning of an
existing integer state changes; changing threshold, pacemaker location, source
period or spark probability applies live.

### Tests and deployment gate
- Unforced rule comparison, first-clock impulse, real cardinal propagation,
  quad/ring site counts, no overwrites during refractory stages.
- Exact 60-generation seeded sparks on both engines; world snapshots,
  independent capture, mutation rule locks, delayed pulse no-false-settle.
- Chrome Studio Shell source UI and exact JSON legacy/forced recipe roundtrip.
- All previous rhombille, C1–C4 physics, Cyclic A1, GIF and video suites.
- Physical iPhone Safari acceptance remains to be done after merging.

**Roadmap after A2:** rescue directional/species rule sensitivity, Brian's
Brain stimulus and neighborhood presets, reversible Margolus block library,
proper Wireworld conductor templates, then the broader dynamics inspector.
