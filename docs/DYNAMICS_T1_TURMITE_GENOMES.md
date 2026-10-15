# Dynamics T1 — Four-Turn Turmite Genome Laboratory

## Goal: Give the ant more mathematical choices

This expansion returns from the Wireworld logic series to the truly bizarre and expressive **Turmite / Langton-ant cellular automata** in Automatart. Every control changes real discrete geometry, not an effect added after rendering.

### Genuine four-command rule alphabet

Each moving agent reads its **actual indexed color** at the current cell, consults the corresponding letter of the active rule string, turns, increments the current track state modulo the number of rule letters, and advances one cardinal cell.

- `L` — turn counterclockwise 90°
- `R` — turn clockwise 90°
- `S` — go STRAIGHT without turning
- `U` — U-turn 180°

Track rules are now **2–24 letters** long rather than 2–12 L/R letters. These give up to **24 actual mutable track states**, stored in the same Uint8 canvas (no added decorative state counter). Existing two-color `RL`, the classic Langton's ant, and every old valid L/R rule retain exactly their original meaning and trajectories.

**Update order matters**: for each ant in stable array order, read its cell's current pigment, turn, advance its pigment modulo the genome length, and move. If two ants visit the same cell in one generation, the second ant reads the first ant's actual write. Finite borders reflect inward; periodic edges wrap.

### Real ant acceleration: 1–8 complete microsteps per generation

The new **True moves and paints per generation** setting runs 1–8 complete rounds of every ant's read / turn / paint / move algorithm *inside* each displayed generation. This is not duplicating GIF frames, visual interpolation or an arbitrary color acceleration. A full generation still increments by one, but every ant may actually visit eight successive sites.

This control changes LIVE without resetting current ant coordinates or track paint. The number of actual agent actions per generation is shown as **count × steps**.

Snapshot recipe settings store the step count (defaulting safely to 1 for old recipes). The saved world already includes every agent's coordinates, headings and true color grid, so exact replay and recording are preserved.

### DNA workshop controls

The mobile-friendly Turmite rules panel now includes:
- Eight preloaded L/R and four-turn rule genomes (including a 24-state specimen).
- Editable custom `L/R/S/U` string, validated for 2–24 states.
- **Mirror L/R**: exchange left and right while leaving straight/U-turn commands untouched.
- **Shift color index**: rotate the instruction string one position, changing which turn each track pigment executes.
- **Reverse DNA**: reverse the order of rule states.
- **Grow / trim DNA**: actually add/remove a track pigment state; the 24-state and two-state bounds are enforced.
- True L/R/S/U command population readout, indexed rule strip, and selectable track-pigment brush (0..ruleLength−1).

Changing a genome may reinterpret existing pigment states, so it **explicitly restarts the world**. Changing ant count also restarts. Changing the true-step setting, brush, skins or colors does **not** restart or delete the current art.

### Acceptance & reproducibility

1. All four cardinal turning commands are tested against their own exact agent trajectories; 24-state modulo writing, no mutation of caller arrays, edge reflection and wrap.
2. More than a hundred multi-agent / 1–8-step combinations are independently compared to **repeated original single-step transitions**, pixel for pixel and heading for heading, including same-cell collisions.
3. Full real `stepWorld` simulation with 24-state rules and multiple agents must match `stepTurmites` exactly. Long saved JSON recipe replay and multi-frame capture cursor must reproduce exact colors and agent coordinates.
4. Legacy `RL` save compatibility, strict invalid pigment/invalid rule rejection and no-restart speed changes.
5. Chromium in phone-width viewport clicks the DNA editing actions, measures unmodified paint across rate changes, tests 24-state genome, saves/reimports exact settings and agents, and runs existing real GIF/video recorder regression.
6. Existing C3 Ising physics and all other mathematical engine, palette and export tests remain green.

## Further Turmite expansions (not falsely claimed here)

Potential T2: genuine multi-state and heading-sensitive Turmite transition matrices, non-symmetric interaction species, user-paintable initial agent placements and collision recording. T3: new spatial symmetries, hexagonal movement if mathematically compatible with each lattice's topology, branching and controlled genome mutation as *real rules*, not color animation.

These deserve separate research and tests. No Copilot credits required.
