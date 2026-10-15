# Dynamics T6 — Pheromone Gravity

## Purpose

This adds a **second, independent dynamical lattice** to the Turmite laboratory, not merely another indexed track pigment or a heatmap shader. T1–T5 govern actual turn decisions, pigments, species, collision chemistry and per-ant memory. T6 adds persistent per-site chemical concentrations (unsigned 8-bit integers, 0–255), deposited by physical ant visits. Other ants sample spatial concentration differences and alter their real movement.

The mathematical loop is deterministic, all integer fixed-point, runs in the original simulation stepper, and can be saved/replayed/recorded exactly.

## Equations, one real Turmite microstep

Let `C_t(i)` be the previous chemical concentration field; `P_t` the agent positions, `N(i)` the true cardinal neighbors and `D, f, e` the deposit, diffusion and evaporation controls.

**1. Sense old field, simultaneously.** Each ant computes the signed neighbor gradient relative to its own site:
`g_k = sign * (C_t(neighbor_k) - C_t(current))`. `sign=+1` attracts toward higher concentration; `sign=-1` repels toward lower. Split Hive uses sign according to stable T2 species parity (even attract, odd repel). If no neighbor gradient reaches the user-controlled positive threshold, its heading stays on the original T1/T2/T5 result.

The highest eligible gradient wins (N/E/S/W ties deterministic); any finite-grid neighbor outside the board is excluded. Strength 1 rotates by at most one 90-degree turn toward the target; strength 2 aligns fully, including a reversal. Heading adjustments occur **after** the original T1/T2/T5 turn lookup but **before** movement; they are physical new headings, not artistic arrow overlays.

**2. T1–T5 pigments and agent state.** Actual sequential track reads/writes, species-specific T4 alchemy, T5 memory and T2 co-location reversal all remain intact. Every ant's turn uses the same previous chemical field, so later ants cannot see this microstep's chemical deposits.

**3. Deposit at original sites, after all ants move.** For each agent that began the microstep on site `i`, add `D` to a working copy. Simultaneous visits add independently, saturating to 255. Define:
`A(i) = min(255, C_t(i) + D * number_of_visitors(i))`.

**4. Diffuse and evaporate synchronously.** Define the 5-point weighted stencil `M(i) = floor((4*A(i) + sum(A(j) for j in N(i))) / 8)`. On finite edges, nonexistent neighbor values are taken as `A(i)`, avoiding false external sources; periodic boards instead wrap to the opposite edge. With `f` in 0..8 and `e` in 0..8:
`C_(t+1)(i) = max(0, floor(((8-f)*A(i) + f*M(i))/8) - e)`.

The 8-bit field never overflows, and source arrays are never mutated. Note **this discrete rounding and evaporation are deliberately dissipative**; the scheme does not universally conserve chemical mass. There is no ungrounded claim of physically exact molecular diffusion.

## Controls and artistic experiments

T6 offers editable enable/disable, chemical deposit 0..32, diffusion 0..8, evaporation 0..8, steering OFF/ATTRACT/REPEL/ALTERNATING, steering strength 0/1/2, and minimum gradient threshold 1..32. Four non-destructive presets:

- **Trail Hunters**: repeated trails attract new real paths.
- **Trail Repellers**: agents avoid their own previous chemical histories.
- **Split Hive**: alternate species navigate the same field in opposite directions.
- **Long-Lived Scent Fog**: diffusion spreads nearly un-evaporating history.

The live **5×5 chemical microscope** shows exactly the real 0–255 field around the selected ant, with a central marker, and readouts for scented cells and peak concentration. It is not color mapping masquerading as chemistry.

## History, recipes and export

Stored state: `World.turmitePheromones?: Uint8Array`. Its optional packed array in the existing `automatart-world-v1` schema is `arrays.turmitePheromones`; full byte count is validated on import. Settings are `SimSettings.turmitePheromoneRules`, with a disabled default when older recipes omit it.

Disabling T6 freezes the existing field without clearing it. Re-enabling resumes from the true stored concentrations. If a legacy recipe has no chemical array but enables T6 in settings, it safely starts from the zero chemical field. All T6 controls are live and never reset time or clear paint.

The original `stepTurmites` API is backward-compatible via optional trailing parameters. When no field and T6 OFF, the old result shape has only `cells` and `agents`. T1–T5 semantics are unchanged. Recorder clones and full-world snapshots include the actual optional second grid.

## Verification

- Chemical saturation at 255, exact origin-site deposition, fixed and wrapped edge diffusion, zero-gradient no-turn, positive attraction, negative repulsion, alternate-species polarity, threshold and maximum-turn constraints.
- 256 combinations of real multi-ant histories, T2 repulsion, T4 alchemy, T5 memory and T6 steering; each accelerated multistep call compared to exact repeated one-step results for **both** grids and all agent states.
- Full T6 save/restore and 30-generation replay, recorder cursor full chemistry parity, malformed packed arrays rejected.
- Old T1–T5 recipes, calls and fieldless stepper behavior unchanged with T6 OFF.
- Chromium validates all four presets and edits, no history reset, real chemical lattice after stepping, frozen history when disabled, exact recipe import/replay, original GIF and video capture.
- All original seventeen CA engines, prior dynamics tests and Netlify must pass.

**Wait for all GitHub and Netlify checks before merging.** No Copilot credits required.
