# Dynamics T3 — Independent Turmite Writer DNA + Direct Ant Placement

T3 is a mathematical expansion of T1/T2, not a color filter. Every ant has **two different transition jobs**: it reads the real track pigment to choose a physical turn (the existing rule and species/heading transformations), then it writes a physical new pigment according to an **independently adjustable write program** before it moves one true lattice edge.

### Four writing programs

Given current real lattice color `c` and a rule genome of length `N` (2..24):

- **NEXT**: `w(c) = (c + 1) mod N`. Exactly the original Langton/T1/T2 rule; all legacy behavior remains unchanged.
- **STRIDE**: `w(c) = (c + k) mod N`, for any integer `k` in −12..12. This can skip colors, run backward, or **freeze pigments** at `k=0` while ants still move and turn.
- **ERASE**: `w(c) = 0`; ant truly erases visited pigments. It still reads the OLD pigment to choose its turn before erasing. This is mathematically distinct from hiding a rendered layer.
- **TABLE**: the artist specifies an **absolute replacement pigment** for each current input pigment. The complete 24-slot map stores integers 0..23; the selected entry reduces modulo `N` for active genome length. This is a genuine finite-state transition lookup, not an output color palette. Unlike the turning genome, this can change while the world evolves without erasing old tracks.

In all modes, turn selection uses the cell state **before** the write. Every species uses the same write map while remaining free to have its own direction-dependent turn behavior from T2. Sequential agent ordering and same-cell collision rules remain identical to T2; a later agent reads the actual newly written state of an earlier agent.

The independent writer is set on the LIVE world: changing modes, jump length, or any table entry does NOT reset generation, ant positions, or existing artwork. A table reset restores the original +1 map; a classic writer button restores NEXT without changing turn-genome DNA.

### Direct manual ant positioning

In T3, artists can select any **already existing ant identity** (1..12), select its cardinal heading, arm one placement, then tap **one cell on the actual artboard**. The tool uses the same square-lattice pointer mapping as painting but does not call the brush and is automatically disarmed after one tap.

The operation copies the agent list and changes only the selected ant's `x,y,heading`. It never adds/destroys identities, edits pigment cells, changes simulation generation, or resets unrelated agents. The universe is paused before placement so the selected coordinates are stable when examined. The tool can be canceled before placing. Existing SAVE RECIPE and exports capture the true new locations.

Because identity already equals stable agent index (T2), no snapshot-schema or hidden agent-ID migration is needed.

### Compatibility and constraints

- Default writer NEXT plus unset older recipe fields resolves to T1/T2 original cell-step behavior.
- Table validation enforces exactly 24 integer entries 0..23; stride is an integer within ±12; unsupported write modes and invalid placements are rejected.
- Turning-genome changes still restart, since the number and interpretation of true pigment states can change. The write controls and direct placement never restart.
- Original Ising / Wireworld / other CA engines, live previews, age/trace coloring, GIF/video recorder and exact saved-world recipes are left compatible.

### Verification

The automated suite compares all four write modes (including negative, zero and positive jumps), several genome lengths (2..24), seed formations, multiple species, collision modes and 1–8 genuine substeps against exact repeated single-step physical transitions. It also checks that movement is invariant under writing choice **when the current turn is held fixed**, that snapshots reproduce exact pigment and ant-identity evolution for 25 subsequent generations, that the immutable capture cursor retains the source, and that legacy recipes without writer keys still execute their original +1 transition.

Browser automation changes write programs, edits a true substitution table, arms and taps to relocate a specific existing ant, confirms every painted cell and all other agents are untouched, saves the resulting artwork and reloads the exact writer and agent positions. The full 17-engine regressions, print and high-resolution stills, GIF Worker and video recorder, and Netlify must pass before merge.

### T4 ideas, later

The next authentic mathematical step could provide separate **per-species writer maps**, collision-conditioned writer tables, programmed direction/paint tuples per state, or a vector-field-influenced ant neighborhood. The important principle remains: visual weirdness must arise from a genuinely executed transition law.
