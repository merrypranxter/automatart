# Dynamics T10 — GENETIC DRIFT: Heritable mathematical ant rules

T9 gives ants real resources, age, death and birth; T10 adds a four-locus genotype and genuine one-parent inheritance. This system is **not a visual filter, global preset randomizer, fake genetic algorithm, sexual crossover, or a cell shader**. A gene is an integer affecting the true transition state and selection conditions of an individual living Turmite. Birth only occurs through the existing T9 physical mating-independent budding/splitting rules.

## The genome

Each ant in the stable 1..12 T1 registry has optional persisted biological metadata. Old snapshots with no genome are interpreted as a mathematically neutral founder:

```
genome?: {
  turn: integer [-3..3],
  write: integer [-3..3],
  metabolism: integer [-3..3],
  forage: integer [-3..3]
}
parentId?: integer [0..11]
depth?: integer [0..4096]
brood?: integer [0..1e9]
```

The first ant born into a dormant slot receives the current parent's **complete four-locus genome**, not the dead slot's previous DNA. Its parent ID and genealogical depth persist, and its new successful-birth counter starts at zero. The parent increments its own persistent successful-birth counter exactly once per delivered child. The biological species ID remains its fixed registry index, preserving all the T2/T4 species, T5 memory, and T8 oscillator interactions.

No global mutable RNG is used. For each actual birth, mutation is a pure seeded hash of the global **world seed**, parent registry index, parent's persisted `brood` counter and the new child's registry slot. With `mutationRate=100`, one of the four loci always changes even at allele bounds. `mutationRate=0` makes an exact copy. `mutationSize=1..3` sets integer mutation amplitude. `locus` may select any of the four genes or independently lock mutation to one locus, e.g. write genes only. At most one locus mutates per real successful birth. A mutation never changes genetic values outside -3..3, and it is deterministic in batched vs serial simulation.

## What DNA changes in the REAL ART

For a living ant reading the actual current physical painted track `c[x,y]`, with T5/T8 and ordinary species already applied:

```
realTurnLookup = positiveModulo(T8AdjustedRuleIndex + genome.turn, ruleLength)
storedPaint    = positiveModulo(T8AdjustedRealInk + genome.write, ruleLength)

trueFoodFromOldTrack =
  [old c(x,y) > 0] * max(0, T9.pigmentFood + 2 * genome.forage)
trueMetabolism = max(0, T9.metabolism + genome.metabolism)

energy' = clamp(energy + trueFoodFromOldTrack
  + floor(T9.chemicalFood * oldA(x,y) / 255)
  - trueMetabolism, 0, 255)
```

The entire old physical lattice is sampled consistently before sequential paint writes, and every old pheromone read is from the previous microstep. There is no invented neighborhood selection signal and no pretend feedback. Altered rule execution changes actual headings and movement. Ink genes change the actual `Uint8Array` track state, which affects all later ants and the background CA. Metabolic and foraging genes change energy costs and therefore survival and eligibility for future reproduction. This is genuine ecological selection, albeit intentionally small and discrete rather than a claim of a full natural-evolution simulator.

## LIVE artist controls

- Enable genetics, probability 0–100%, magnitude 1–3, and locus: all/turn/write/metabolism/forage
- **Color Bloodlines:** every child mutates actual physical pigment writing, +/-2
- **Mutating Mazes:** every child mutates actual L/R/S/U rule lookup, +/-2
- **Survival of the Weirdest:** 65% mutation anywhere, selection by true local resource / reproduction
- **Slow Adaptation:** low probability metabolism-only drift
- Per-ant matrix: registry ID, depth, parent ID, real alleles for all four traits, birth-descendant and live-genome diversity count
- T10 presets/enable automatically turn ON T9 life and, where needed, choose budding so actual births are possible. No restart, no lost tracks.
- **T10 OFF:** alleles and family relationships remain in saved agents, but no genetic movement, pigment or metabolic influences apply and T9-only evolution rules continue. Switching ON restores their behavior without changing the painted world.
- T9 founder slider remains next-world-only. To make mutations visibly appear, start fresh with 8–12 registry slots, 2 founders, and breeding on. World creation is intentionally separate from mutation and recipe controls.

## Safety, compatibility, regression

- All new registers optional and validated strictly at snapshot import; invalid alleles, ancestry indices, genealogy depth and brood counts are rejected.
- No old T1–T9 recipe changes trajectory when T10 disabled, even if genotype fields are present.
- Newborn never resurrects a prior occupant's ancestry or DNA. All genetic inheritance is entirely **birth-driven**, not arbitrary frame noise.
- Exact accelerations: **160** serial/batched T1–T10 combinations across 5 genetic loci × 2 mutation probabilities × 2 chemistry states × 2 clock states × 4 step counts.
- Tests for allele boundaries, no-op mutation rate, pure deterministic mutation, parent identity, actual turn vs pigment changes, true metabolic energy/food change, parent resource cost, old genome immutability, 40-step exact snapshot replay, GIF cursor match, malicious DNA rejection.
- Chromium test live all four presets, settings edit without reset, real 100% mutation on a born baby, correct parent and child genealogy, exact JSON recipe load and preserved genome upon bypass. Existing 17 automata, GIF Worker and smooth video recording unchanged.

**Leave the PR unmerged until exact-head TypeScript, CI, Netlify and Chromium checks pass and code-review findings are resolved.**
