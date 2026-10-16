# Dynamics T8 — KURAMITES: Actual coupled phase oscillators

## Why these are genuinely new equations

T1–T4 use turn and paint rules with explicit species chemistry; T5 gives each ant a finite-state memory; T6 and T7 add interacting spatial chemical fields. T8 adds a third kind of dynamic state: a **persistent independent circular clock attached to each ant**.

An ant's T8 phase is a true integer state `rhythmPhase in 0..255`, representing an angle `2πθ/256`. This is NOT the T5 memory register, graphics palette cycling, a frame-based animation, or a simulation-global metronome. Each oscillator can be naturally detuned, synchronized or repelled by nearby physical agents, and driven by the real local signed T7 chemical potential.

### Coupled Kuramoto-type transition, in every true Turmite microstep

Define `P_i = rhythmPhase_i`, `species_i=id mod speciesCount`. An old recipe lacking P starts each clock from the deterministic identity `P_i=(73id) mod 256`. `w_{ij}=max(0,R-d_{ij})` for **physical Euclidean distance** `d` with correct wrapped or finite-grid boundaries; agents outside the radius do not interact. For each ant i:

```
coupling_i = round(K * SUM_j[w_ij * sin(2π(P_j-P_i)/256)] / SUM_j(w_ij))
             (zero when there are no neighbors)
chem_i     = round(chemistry * (A(site_i) - B(site_i)) / 255)
P'_i       = (P_i + frequency + detune * species_i
              + coupling_i + chem_i) mod 256
```

The real implementation uses a fixed quantized 256-entry sine lookup **and sign-symmetric half-tick rounding** (positive and negative forces have opposite equal magnitudes at ties), so repeated/batched computation and saved recordings are deterministic. This is explicitly a **discrete, spatially weighted approximation** of continuous-time Kuramoto coupling, not a claim of exact differential-equation integration. Positive K tends to synchronize; negative K repels phases. Signed chemical influence shifts clock rates based on the *actual old physical* T6/T7 chemical values. All clocks compute the new phase synchronously from the same pre-step phases, positions and chemistry; they **do not** read another agent's just-updated phase.

### How the clock changes actual mathematics

Each ant's prior phase selects an eight-sector program `q=floor(P/32)`:

- **Eight Phases:** `q=0..7`.
- **Crest Gate:** q is 1 for only the first eighth of the circle (P 0..31), otherwise 0.
- **Reverse Phase:** `q=(-floor(P/32)) mod 8`.

This adds `q × turnBias` modulo the real LR/S/U turn-rule length to the existing T5-adjusted lookup; and `q × writeBias` modulo the real indexed pigment alphabet to the existing T4/T5 outgoing physical paint. No image overlay, palette tricks, fake wobble or disconnected shader influences ant behavior. Real positions and the real stored pigment change. The T5 memory update sees the **actual T8-modified paint**, so the systems interact nonlinearly.

T6/T7 chemical sensing and trajectory deflection then remain active as before; T8 only affects the turn command and true pigment writer. Phase update is committed to the ant AFTER the microstep, ready for the next. The stable agent ID assigns clock initialization and detuning. T3 manual relocation preserves oscillators, including during new positions and future coupling.

### Live artist controls

T8 beneath the T6/T7 labs supports enable, per-species detune (0..16), intrinsic frequency (0..32), signed coupling (−32..32), true spatial radius (1..32), signed field frequency drive (−16..16), feedback program, real turn-rule bias (0..3), and real write bias (−3..3).

Four complete presets:
- **Phase Choir:** strong positive coupling; group synchrony and ordered mutations.
- **Rhythm Riot:** negative coupling and species detuning; frustrated ant clocks.
- **Quantized Pulses:** turning and writing change only as each phase crosses a narrow 1/8 ring window.
- **Chemical Metronome:** true A−B field changes oscillator frequency and resulting physical behavior.

A live table shows each ant's **actual saved phase, species, and feedback sector**. The Kuramoto order parameter `R=|mean(exp(i*2πP/256))|` shows overall phase coherence: 0 distributed, 1 synchronized. For a single ant R=1 trivially; coupling requires at least two real ants, but the single ant still has genuine intrinsic rhythmic feedback without a forced restart.

All settings change LIVE with no deletion or reseed. T8 OFF bypasses every T8 influence and **freezes real phase history** for later use; original T1–T7 trajectories remain exactly intact. T8 phase is optional in existing `turmiteAgents[]` snapshots, with strict 0..255 validation. Old saved recipes, older writer programs and all 17 automata are unchanged. GIF, video, recorder clones and capture settled-state checks use the existing complete agent state, and therefore retain these true clocks on every simulated frame.

## Regression contract

- Correct attractive phase locking and negative antiphase divergence for 2 agents.
- Physical neighborhood limits, toroidal vs finite edges, chemical drive, no imaginary neighbors, stable species detuning.
- Eight phase-sector math, crest gating, reverse mode, actual heading turns and outgoing Uint8 paint (not just animated materials).
- 216 accelerated-vs-serial T1–T8 batches crossing all three feedback modes, K signed, species counts 1/2/4, real T6/T7 chemistry, T5 memory, 1/2/4/8 microsteps, different seed formations.
- Saved phases, 30-generation deterministic replay, exact chemical grids, cursor parity and corrupt phase rejection.
- T8 OFF parity with previous T1–T7 and old recipes.
- Chromium checks four presets, numeric controls, no-reset and frozen phase, exact saved clocks/recipe reload, GIF/video and full previous engine suite.

**Never merge until GitHub CI and Netlify deploy-preview pass and the code review has no unresolved findings.**
