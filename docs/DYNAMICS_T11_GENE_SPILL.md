# Dynamics T11 — GENE SPILL: Real Horizontal Gene Exchange

T10 mutates alleles at T9 births. **T11 adds an independent mathematical mechanism:** ants can exchange existing inherited traits *after genuinely meeting within their physical lattice*. Genes are not color cycling, shader overlays, global randomized presets, or an invisible parallel simulation. Transferred alleles alter real T10 turn-rule lookups, Uint8 track writes, and live T9 energy/food efficiency on later microsteps.

## True simultaneous old-world contact model

At the **start** of each Turmite microstep, take snapshots of each ant's previous (x,y), four-locus genome, persistent transfer-opportunity counter, living state and true old paint and chemical-A grids.

For each eligible recipient in stable registry order, consider living donors j ≠ i in **Manhattan distance** within radius 0..8. A radius of 0 means both organisms physically occupy the exact same cell. Toroidal wrapping uses minimum periodic dx and dy; finite worlds never wrap. The donor is the closest ant (ties: lower stable registry ID). Neither a dormant T9 ant nor a newborn in this microstep can participate while ecology is active. When T9 is bypassed, all registry slots participate just as they do in the ordinary T1–T8 engine.

Physical gates:
- **Anywhere:** true proximity alone
- **Pigment:** the recipient's pre-step track cell must actually be nonzero
- **Scent:** the recipient's genuine pre-step T6 chemical-A value must meet the chosen threshold (0–255); the Chemical Vectors preset enables the real T6 lattice without resetting art

A qualifying contact increments a persistent per-recipient integer `transferCount`, whether or not transmission occurs. No global RNG or frame-clock is used. A deterministic 32-bit mixing function of the world seed, recipient ID, donor ID, saved opportunity counter and old physical site selects a transmission with 0–100% probability. For an 'all' locus setting it also selects which one of the four real T10 genes receives the effect.

For a given locus, compute the recipient's next allele from **OLD DONOR and OLD RECIPIENT** values, never another ant's already-transferred alleles:
- **Plasmid copy**: receiver allele = donor allele
- **Gene blend**: receiver allele = sign-symmetrically rounded arithmetic mean of donor and receiver alleles (integer half-ties away from zero)
- **Contact mutagen**: receiver allele = donor allele plus deterministic ±1, clamped into [-3,+3], with an inward mutation at either boundary

The last option is explicitly a **contact-triggered donor mutation**, not literal untouched plasmid copying. All contacts and transmissions occur synchronously per microstep and commit after the T1–T10 movement, memory, writing and life update. Newly received DNA changes physical motion/paint/metabolism starting in the next true microstep. The old species index, parent genealogical ID, brood count, memory and oscillator phase remain unchanged.

Each recipient persists `transferCount` (0..1e9), `transferFrom` (actual existing donor registry index) and `transferGene`. A new T9 child clears all dormant former occupant contact history. Old recipes without T11 fields are compatible, and snapshots reject invalid donor references (including IDs outside the currently restored colony), counters or locus names. T11 OFF, T10 OFF, or a lone ant produces no contact effects and leaves original T1–T10 trajectories alone. When T11 is switched off, accumulated contact/genome history remains in saved recipes.

## Artist controls

- Live enable without simulation reset; enabling transfer also turns on real T10 genotype effects.
- Contact radius (0–8 true grid sites), probability (0–100), locus (any/turn/write/metabolism/forage), transfer mode (copy/blend/mutate), and environment gate (any/old-painted-track/true T6 scent with numeric threshold)
- **Plasmid Party**: guaranteed true nearest-neighbor allele copying
- **Ink Epidemic**: contact-bound ±1 inherited paint-gene mutations, for genuine variation even when all founders initially carry neutral genomes
- **Track-Limited Crossover**: blending turn alleles only on real old pigmented lattice sites
- **Chemical Vectors**: a T6 scent-gated metabolic-gene exchange that turns on genuine chemistry
- Live per-ant counters, last donor ID, gene identity, current allele, plus total opportunities and donor-history carriers.

## Tests and coexistence

- Unit checks: real site, torus and finite distance, honest 0-radius co-location, genuine source paint/scent gates, no phantom donors, failed transmission opportunity counts, copy/blend/mutate semantics and boundary conditions, birth-step exclusion and dormant handling, exact OFF bypass.
- **108** accelerated versus serial simulations crossing 3 transfer modes × 3 true old-world gates × 3 contact radii × 4 per-generation Turmite microsteps.
- 40-generation exact saved recipe+chemical+allele+contact history replay, GIF/video capture cursor parity, malformed ancestry/donor rejection and old-recipe compatibility.
- Chromium tests all four artist presets, no-reset changes, guaranteed reciprocal allele exchange between two ants at the same physical site, donor identity, counts and exact recipe save/restoration.
- Original T1–T10, all 17 automata engines, actual browser GIF Worker and smooth video tests must remain unchanged.

Keep PR separate/unmerged until final GitHub Actions, Netlify preview and real Chromium tests are fully green and review findings addressed. User controls merging.
