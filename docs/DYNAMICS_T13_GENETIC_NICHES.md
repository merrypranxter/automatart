# Dynamics T13 — GENETIC NICHES: The Environment Selects the Organisms

T12 allows physical cellular sites to retain a specific real T10 allele and a genuine 8-bit old-world concentration. **T13 makes that existing DNA lattice a genotype-dependent ecological fitness landscape**. No new imaginary overlay, no shader-based guidance and no globally randomized paint effects. Existing true T1–T12 agents, birth, mutation, transmission, rhythm coupling and film export still do the actual work.

## Three ways the old DNA changes REAL physics

Each living ant observes the **previous microstep's** saved T12 `code[p]` and `strength[p]` field, independent of this microstep's DNA deposits, paint changes and new births. A fragment is eligible if `strength[p] >= threshold` and code is nonzero. It decodes to one exact locus (turn, write, metabolism, forage) and one signed allele -3..3. The ant's genotype for that locus comes from its genuine persisted T10 registry identity.

A **genotype match** occurs precisely when `abs(antAllele - fossilAllele) <= tolerance`, where tolerance is an artist-controlled integer 0..3.

**1. Spatial navigation.** After T1–T8's authentic L/R/S/U turns and true pheromone steering, inspect the four physical cardinal neighboring sites. The artist chooses one of three niche policies:

- KIN SEEKING: score = oldDNAstrength at a genetically **matching** site, otherwise 0
- NOVELTY HUNTING: score = oldDNAstrength at an **unmatched** site, otherwise 0
- IMMUNE AVOIDANCE: score = negative oldDNAstrength at an **unmatched** site, otherwise 0

Try current true heading first; only take a different direction with a strictly higher real genotype-conditioned score. Equal scores preserve incoming heading. Steering strength 0..8 scales the required score improvement, and 0 completely bypasses the additional redirection. The boundary rule respects real wrapped or finite world coordinates. Next pixel-write and movement use the resulting heading, genuinely changing where the ant goes and what it paints next.

**2. Metabolic ecosystem.** At the ant's actual OLD position, after old-pigment and old-pheromone nutrition and T10 metabolism, add:

```
if eligible and matching:
    nutrientGain = floor(oldDNAstrength * nutrient / 255)
if eligible and unmatched:
    hazardousCost = floor(oldDNAstrength * hazard / 255)
energy' = clamp(oldEnergy + oldPigmentFood + oldChemicalFood
                + nutrientGain - hazardousCost - metabolism, 0, 255)
```

Here `nutrient` and `hazard` are artist controls 0..32. These are explicit genotype-dependent **ecosystem resource terms**, not a claim that genetic information itself is a source of conserved chemical mass. Because T9 age/starvation/birth thresholds use the final real energy, habitat changes which organisms survive, reproduce, mutate and spread future DNA.

**3. Niche nurseries.** Optionally, when T9 actually creates a newborn into an available dormant registry slot, the parent chooses among the four adjacent old-DNA sites by that same real matching-energy fitness score. Stronger positive nutrient advantage wins, hostile sites are penalized; ties keep T9's base actual bud/split heading. Births remain fixed-slot, seeded and synchronous, and babies cannot move, paint, shed, or absorb DNA on their birth microstep.

No new per-agent counters are required, so all state is captured by existing worlds plus the T13 settings. Save/load old recipes is backward compatible: older saved settings gain disabled default niches; T13 OFF preserves exactly the same trajectories and biological equations as T12.

## Studio controls

- Master enable with no art reset; this also enables the existing **T9 biological lives, T10 genuine heritable genes and T12 physical extracellular DNA**.
- Policy: seek matching, seek novel, repel foreign DNA.
- Niche strength (0..8), tolerated allelic distance (0..3), old-field threshold (1..255), resource nutrition (0..32), hostile metabolic penalty (0..32), and actual niche-guided birth sites toggle.
- **GENETIC GARDEN** (matching DNA attracts survivors and incubates new babies)
- **INVASIVE BLOODLINES** (novel genotypes migrate into different older DNA landscapes)
- **IMMUNE FRONTIERS** (unmatched DNA repels and harms susceptible ants)
- **FERTILE CRADLES** (broad compatibility and intense resource-based breeding)
- A true physical N/E/S/W **DNA compass** next to the inspector for one chosen ant, its measured local matching state, actual resource delta and genuine old fragment strength.

## Tests

- Deterministic true matching-vs-differing DNA compass paths, live redirection versus OFF, old-field toroidal vs finite geometry, zero steering and inclusive threshold.
- Real genuine energy gains and losses; hostile genetic landscape kills an otherwise surviving T9 ant; nursery births actually occupy neighboring compatible DNA sites.
- **72 exact batched-versus-serial runs:** three different spatial policies × three thresholds × two nursery modes × 1,2,4,8 true agent microsteps; simultaneous old-world DNA shedding plus biology.
- Forty-generation exact saved-world T12 DNA/T10 genotype/T9 life/T8 rhythm/T6 chemistry replay, clone/real GIF-video cursor parity, old controls and disabled bypass untouched.
- Real Chromium regression changes all four presets without resetting drawing, imports a saved world with an actual matched DNA fossil under an ant, verifies exactly **+24 units real biological energy**, and checks every world array and ecological setting round-trips through JSON.
- All existing 17 automata, portrait canvas, high-resolution PNG, GIF Worker and smooth video tests remain intact.

**Keep PR unmerged until GitHub Actions, Netlify deploy, Chromium recording and code review fully pass. User controls merging.**
