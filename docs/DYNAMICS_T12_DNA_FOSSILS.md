# Dynamics T12 — DNA FOSSILS: genetic information living in the world

T10 introduces true inherited ant DNA at T9 births. T11 exchanges individual alleles between ants who physically encounter each other. **T12 gives the entire cellular environment a memory of genetic information:** ants can shed real gene fragments at the cells they visit; fragments persist, erode and propagate one cell at a time; future ants can absorb those fragments. This is actual persistent CA world state that changes physical ant turning, painted track, metabolic cost and foraging on subsequent microsteps. It is *not* a post-processing shader, palette change or pretend field.

## Two independent actual world arrays

At each cell p, store:

- `world.turmiteDnaCode[p]: Uint8Array` — 0 is empty, 1..28 is one of four actual T10 genes (TURN/WRITE/METABOLISM/FORAGE) × one of seven signed alleles [-3,+3]. Neutral allele +0 is **distinct from empty**.
- `world.turmiteDnaStrength[p]: Uint8Array` — physical fragment quality/concentration 0..255; empty code iff strength=0.

These are distinct from T6 pheromone chemical A/B and from the `world.cells` visible pigment lattice. All DNA data persists in normal version-1 recipes as **optional** base64 arrays; older saved work restores without environmental DNA and initializes the field on the next true step if T12 is then active. Full per-cell code-strength validity is checked on import, with no invalid or impossible DNA residues. Both arrays are deep-cloned through normal artwork, video and GIF recorder paths; the recorder's settled detection considers the DNA arrays too.

## Real exact deterministic microstep

All decisions read the same **OLD** world, old gene pool, old ant coordinates and old ant genomes. The microstep order is:

1. **ABSORB from the past:** A living ant visits its OLD physical cell. If a fragment was already there at or above the selected `threshold`, it gains one persistent `uptakeCount` exposure (even if absorption fails). Transmission probability 0–100% uses a deterministic integer hash of seed, ant registry ID, that ant's local exposure count, physical site and encoded fragment. No clock/random-state queries. If absorption succeeds, modify precisely the encoded T10 gene of that receiver: copy, signed-rounded mean with old gene, or a genuinely mutated ±1 donor allele. The event records the `uptakeSite` and `uptakeGene`. A gene mutation changes actual future movement/paint/survival, not this microstep's earlier track write.
2. **ERODE / NEIGHBOR COPY:** For each physical lattice site, consider its OWN old fragment and up to four old cardinal neighbors, using wrap-aware or true finite-edge coordinates. Candidate strength from own site is `max(0, oldStrength - decay)`; from each old neighboring site `max(0, floor(oldStrength * spread/8) - decay)`. The strongest candidate determines the fragment for the new site; tie breaks use the LOWEST source index. Neighbor copying is limited to one true site per microstep, never iterative same-step teleportation. This is **non-mass-conserving genetic information replication**, deliberately not falsely described as conservative chemical diffusion.
3. **SHED:** Each ant that was alive at the START of the microstep deposits one of its OLD actual genes into its OLD physical cell at the configured strength 0..255 (configurable locus or hash-chosen any locus). A dying ant can leave one last DNA fossil; a previously dormant/newborn ant cannot deposit until its next step. If two organisms overlap, stronger deposit wins, ties use lower stable ant ID. The DNA field is then committed along with actual paint, ant genomes, T8 clocks and T6 pheromones.

Turning T12 OFF freezes the DNA field. T10 OFF bypasses environmental uptake and shedding. A solo ant can leave a field and absorb its **own earlier DNA** on a revisit. A fully extinct T9 colony can leave genetic relics that erode and spread afterward *while the field is enabled*; living survivors or a newly seeded colony can eventually pick them up. DNA genome transmission is not a metaphor; actual four-locus trait values are changed.

## Studio UI

- Master enable (enables genuine T10 genes without restarting the real art)
- Deposit 0–255, decay 0–32, spread 0–8, uptake chance 0–100%, minimum old strength 1–255, shed locus (any/turn/write/metabolism/forage), and recipient transformation (copy/blend/mutate).
- **Fossil Bed:** long-lasting old trail DNA, little spread
- **Spore Storm:** rapidly copied write-gene mutagen; evolves actual later painted-track states
- **Ghost Paths:** older turn-rule DNA blends into the paths of visiting ants
- **Immortal DNA Archive:** no decay, no spread, full uptake, persistent metabolism alleles
- Actual live metrics: distinct fragment codes, genetic field occupancy, combined real contact exposures; per-ant last source site and last locus. 5×5 **true-array microscope** centered on the selected ant shows strength and full allele/locus of nearby DNA fragments. On/off and changes never erase artwork.

## Verification

- Fragment encode/decode one-to-one for all four genes × seven alleles; strict invalid pair/counter rejection
- Old deposited DNA never absorbed within the same microstep; a later visitor changes its stored DNA; genuine next-step Uint8 physical paint difference; mutation and 50/50 blending, failed exposure tracking
- One-hop maximum per microstep; torus versus finite borders; dead-ant last fragment; newborn suppressed; true extinction spore propagation; T10/T12 OFF physics preserved
- **72** accelerated-versus-serial T1–T12 combos crossing uptake mode, spread coefficient, concentration threshold and 1/2/4/8 ant microsteps
- Forty full generations of saved world/chemistry/DNA/gene and exact replay, recorder field parity and invalid encoded-fossil rejection; unmodified old recipes
- Real Chromium UI regression loads a saved real DNA fragment at a site, moves an ant there, asserts an actual gene mutation, saves both arrays, toggles T12 without reset, and imports/compares exact history. Full 17-engine, PNG, real GIF Worker and frame-perfect video checks unchanged.

**Leave PR unmerged until production build, ALL math CI, actual Chromium GIF/video and Netlify preview green and code review complete. User merges.**
