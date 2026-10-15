# Dynamics T7 — Chemical Civil War

## The actual new equations

T1–T5 are true ant automata with heading genomes, collision writers and internal memory. T6 introduced a single integer chemical field. **T7 introduces a second physical lattice**: field `A` and independent rival field `B`, each storing one integer concentration (0–255) per actual grid cell. No new cosmetic color processing is used.

When T6 chemistry and T7 dual chemistry are both enabled:
1. Every existing stable species `s` is either **A** (even `s`) or **B** (odd `s`). Agent locations and prior agent memory are unchanged.
2. All ants compute their true turn using the same two *old* fields and the signed local potential `phi(i) = A(i) - B(i)`. In **territories** mode, even species seek a positive increase in `phi`; odd species seek a decrease. **Inverted** exchanges their affinities. **Off** retains original T6 navigation, while still running T7 chemical reactions. A positive local signed gradient must meet the threshold; if none does, ordinary T1–T5 turning is unchanged. Quarter-turn vs full-turn steering is explicit.
3. Real T1–T5 track writes, T4 collisions, ant memory registers and agent movement proceed exactly as before. Chemotaxis is applied to the heading **before movement**, not afterward as visual steering.
4. At the end of that real ant microstep, all even-species origins deposit `D_A` into A and all odd-species origins deposit `D_B` into B. Each field uses the precise T6 integer saturated deposit, five-point stencil diffusion and evaporation independently. Source arrays are never mutated.
5. **Reaction occurs after both fields have diffused and evaporated**, simultaneously and independently at each site. With pre-reaction concentrations `a,b` and reaction budget `r`:
   - **Coexist:** `a' = a, b' = b`.
   - **Annihilate:** `q=min(a,b,r)`; `a'=a-q, b'=b-q`.
   - **A eats B:** `q=min(b,255-a,r)`; `a'=a+q, b'=b-q`.
   - **B eats A:** `q=min(a,255-b,r)`; `a'=a-q, b'=b+q`.

Annihilation genuinely destroys paired concentrations, while conversion exactly preserves their sum and saturates at 255. Diffusion may lose concentrations to rounding, and evaporation is explicitly dissipative. No arbitrary random calls or frame-rate dependence are introduced.

## Live artist controls

Under the T6 laboratory, T7 has real controls for: on/off, gradient allegiance, four reaction modes, reaction rate (0–24), B deposition (0–32), B diffusion (0–8), B evaporation (0–8), gradient threshold (1–64), steering 0/1/2. A controls remain in T6. Activating T7 requires at least two **real** ants. With only one ant, T7 activation and all four presets are disabled (the default one-ant setup cannot produce B). To start a two-faction experiment, the user can explicitly raise Ant Population, or use a guarded two-click **START 2-ANT DUET → YES, RESTART** control. That population change is deliberately disclosed and starts a fresh world; Cancel preserves the art. With two or more ants, enabling T7 ensures T6 and at least two species are selected without restarting the world.

Four live presets:
- **Chemical Front Lines** — competing rival territories annihilate each other at contact.
- **B Eats A** — inversion plus rapid cross-conversion.
- **A Bloom** — B is catalytically converted into A amid wide diffusion.
- **Chemical Ceasefire** — both channels independently deposit and diffuse without reactions or T7 steering.

The 5×5 microscope displays both actual local integer values (A / B) for each square, alongside occupied-site and peak readouts per field. The physically significant cue is the difference `A - B`, not the visual palette. Editing knobs does not reset the evolving tracks, generation or agents. Turning T7 off freezes the B field and resumes T6's exact original A behavior; re-enabling resumes B from its preserved history. Turning T6 off freezes both chemical fields.

## Persistence and media

The old `automatart-world-v1` schema gains an **optional** packed `arrays.turmiteRivalPheromones` byte array. It is strictly decoded to the exact grid length. A legacy T6 recipe enabling T7 begins B from zeros while retaining its A history. `SimSettings.turmiteDuet` has a fully validated default-disabled fallback for all older recipes. A non-enabled T7 adds no rival field or trajectory changes.

The GIF/recording cursor now clones **both** independent physical arrays and compares both when detecting truly settled dynamics. This also addresses the real P2 code-review finding on the merged T6 PR: an unchanged visible image is *not settled* if an invisible chemical field can later redirect the agents. Both A-only and B-only examples hold cells, headings and positions fixed for generations while their chemistry evolves; settled recording must not end after three apparent duplicates.

## Test contract

- Four local reaction modes, true species-parity deposits, signed gradient/navigation and deterministic clockwise half-turn rules.
- Hundreds of complete multi-ant batch-vs-serial mathematical comparisons for both grids and all agents, including T2 contact and T5 memory.
- Independent A and B preservation across real-world save and restore, 30 further generations, recorder and malformed snapshot rejection.
- Exact T6 behavior and snapshots when T7 is off.
- Both A-only and B-only invisible-evolution recording settlement regressions.
- Chromium actual controls, presets, independent saved B lattice, non-destructive live edits, recipe replay, GIF/video and full legacy suite.
- **Do not merge** until complete CI, Netlify deployment and code review are green.
