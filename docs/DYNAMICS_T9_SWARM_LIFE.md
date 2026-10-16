# Dynamics T9 — SWARM LIFE: finite-resource Turmite population dynamics

T1–T8 are real turning/writing, species, collisions, memory, chemical fields and Kuramoto-coupled rhythms. **T9 adds age, metabolic energy, death and reproduction to the actual moving ants.** These are persistent discrete physical state transitions, not sprites or color effects.

## The ecological state

Each ant retains the same index/identity forever (species = index mod speciesCount), with optional saved registers:
- `alive?:boolean`: absent = alive for all old recipes. `false` = dormant/empty slot.
- `age?:integer 0..4096`: true number of ant microsteps survived.
- `energy?:integer 0..255`: finite stored material resource.

`turmiteCount` is the **carrying capacity / number of stable registry slots**, not necessarily current living population. All existing T2 species, T5 memory and T8 oscillator identities remain stable even as individual ants die and new ants enter their vacant slots. The old recipe field `turmiteAgents[]` remains the same length, so snapshots stay compatible.

When T9 is enabled at the creation of a NEW world, the first `min(founders,turmiteCount)` slots are living founders initialized with `initialEnergy` and age 0. Remaining slots start dormant; select a higher T1 Ant Population and a smaller founder count, then explicitly start a new world, to observe generations of births. Editing the founder count alone never resets art and only affects the next intentional world creation. Activating T9 in an ALREADY RUNNING legacy world preserves all positions/trails and treats missing life registers as living age-0 ants at `initialEnergy`.

## Real transition equations

For an ant that was living at the beginning of a true microstep, let its prior physical position be `(x,y)`; all ants sample the **same old** track and chemical arrays (so a later ant cannot eat a pixel an earlier ant just wrote). Define:

```
food(i) = pigmentFood * [oldCell(x_i,y_i) > 0]
       + floor(chemicalFood * A_old(x_i,y_i) / 255)

energy' = clamp(energy + food - metabolism, 0, 255)
age' = age + 1
alive' = (energy' > 0) AND (age' < lifespan)
```

Real T1–T8 heading, track writing, agent memory and rhythm effects happen for a living ant's final step; if it dies during that step, the slot becomes dormant afterward. A dormant slot never turns, paints, collides, steers or deposits either T6/T7 chemical. Dormant slots do not participate in the T8 synchronizing order parameter and never influence neighboring oscillators.

A living parent may create a child after its microstep only if it has survived to age 2, has `energy' >= birthEnergy`, can pay `birthCost`, and there was an ALREADY DORMANT registry slot at the start of the microstep. For every eligible parent in fixed stable order, consume one available old dead slot:

- **Bud:** offspring placed one actual cardinal cell in the parent's current heading; inherits heading and receives `birthCost` energy.
- **Split:** offspring placed opposite to the parent heading; receives `floor(birthCost / 2)` energy.
- Both reset biological age, T5 memory and T8 oscillator phase while retaining the **slot ID/species**. The parent pays the birth cost; energy conservation is deliberately not asserted for budding because this model is a nutrient-driven open system.
- Boundaries use true torus wrap or finite-edge clamping. Newborns do not move or write until the NEXT microstep; an ant that dies THIS microstep cannot be resurrected in the same one. Stable prior positions and chemistry are read before any writes, so numerical results match batched vs serial stepping exactly.

Extinction is possible and real. If all ants die, the art and every field remain, the colony is dormant, and no births occur without a living parent. Explicitly reset/start a new world to create another colony. **T9 OFF** freezes all biological registers and bypasses dormant/death physics; original T1–T8 movement returns. Turning ON resumes saved biology.

## Artist controls and tests

Controls: enable, metabolic consumption, food from existing track, chemical nutrient sensitivity, true lifespan, reproduction threshold/cost, child placement mode, startup energy and founder slots. Four non-destructive presets: Fertile Garden, Famine/Extinction, Fast Splitting, Long-Lived Fossils. The live inspector shows living/dormant counts, per-ant age, actual energy, and stable species ID. Dormant ant markers are gray/hollow rather than live bright yellow.

CI checks numeric validation, genuine nutrition / exhaustion / senescence / split and bud births, no same-step resurrection, parent energy consumption, untouched source arrays, 48 exact accelerated-vs-serial tests with T5/T6/T7/T8, real world snapshots plus 32-generation saved replay, recipe import validation, GIF cursor parity, real browser live edits and four presets, old T1–T8 OFF parity, video/GIF export, and Netlify deploy.

**Do not merge PR until entire GitHub Actions and real Chromium recording suite complete successfully, Netlify preview is green, and code review has no outstanding findings.**
