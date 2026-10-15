# Dynamics T5 — Memory Ants: finite-state feedback within real Turmites

## What is new?

T1 gave ants real turn genomes; T2 gave them real species, heading-sensitive rules and repulsion; T3 separated their real writing genomes; T4 added per-species writers and physical collision chemistry. **T5 gives each agent its own internal finite-state register**. It changes the ACTUAL turn lookup and/or the ACTUAL state written to the shared track. Time dependence comes from state carried by the agents, not a shader, animation delay, or palette cycling.

## Exact mathematical transition

For each complete ant microstep, occupancy is counted **simultaneously at the start** of that microstep (as in T2/T4). Painting remains stable-order sequential, so later agents see updated pigments. Let:

- `p` = real track pigment currently under the ant, from 0 to `N-1`.
- `m` = this ant's saved memory register reduced mod `M`, where `2 ≤ M ≤ 24`.
- `t` = T5 turn feedback gain (0–3); `w` = T5 writer feedback gain (−3…+3).
- `o` = physically co-located ant count at the start of this complete microstep.

When T5 is ON, use `p' = (p + m*t) mod N` to select the **real T1/T2 command** (which still incorporates heading shear, species stride, mirror, and T2 repulsion independently). Execute T3/T4 pigment writing and real same-site chemistry on the **unmodified physical track pigment p** to produce `q`. Then write `q' = (q + m*w) mod N` to the actual track; agents after this ant see `q'` at that cell.

Finally update the agent's register **after its real write**:

| Mode | Register transition |
|---|---|
| Clock | `m_next = (m + 1) mod M` |
| Pigment echo | `m_next = (m + p + 1) mod M` |
| Ink echo | `m_next = (m + q' + 1) mod M` |
| Collision scars | `m_next = (m + (o >= 2 ? o : 0)) mod M` |

Ants then move according to the turning command. The register travels with the ant (and survives direct T3 relocation). No extra raster pass or cosmetic lookup stands in for physical steps.

When OFF, T5 is completely bypassed: T1–T4 turn, track write, collision and movement remain bit-for-bit unchanged, including old saves containing no memory field. **Previously accumulated** phases stay attached to the agents when T5 is turned off and can be resumed by switching it back on. Changing `M` on the fly reduces the stored phase modulo the new `M`; it never clears the current grid or restarts time.

## Controls

Open **TURMITES → T5 MEMORY ANTS**, switch memory on, then choose the feedback source, register size (2–24), turn influence (0–3) and write influence (−3…3). Three presets make the effects easy to audition:

1. **Pigment Echo**: the past cell colors change future turns and ink.
2. **Clockwork Ant**: periodic internal phases with different turn/ink displacement.
3. **Collision Scars**: memory changes only when actual ant bodies are on the SAME cell. Nearby agents or intersecting older trails do not count.

The live inspector reports each real ant's stable identity, species, persisted phase, current physical track pigment, and memory-adjusted base turn-rule index (before T2 offsets and contact repulsion).

All these edits are LIVE; only previously existing structural initializations (genome, count, formation etc.) can start a new universe. The T4 four-species pileup still intentionally reseeds on every click.

## Serialization, recording, old recipes

The existing `automatart-world-v1` snapshot retains `turmiteAgents`; each agent optionally carries a bounded integer `memory` 0–23. The snapshot validates this field and preserves it on restoration. There is **no new mandatory schema**. Old agents without `memory` simply begin at zero if T5 is later enabled.

Recipe settings contain `turmiteMemory` with a validated program and safe disabled fallback for older recipes. Each recorder cursor clones the ant registers and advances the identical production `stepWorld` engine. Neither preview rendering nor GIF/video encoding advances the live original.

## Verification requirements

- Independent complete register algebra across modes, phases, pigments and real occupancy 1/2/3/4/12.
- 192 multibody whole-grid, T2 heading and T4 chemical combinations, checking 1/2/4/8 microsteps against exactly repeated one-step production calls.
- One-ant step where the phase demonstrably changes both direction and actual pigment.
- Collision scars on real co-location, *not* neighboring cells or old trails.
- Full saved world with agent memory, 30 generations exact replay, capture parity and strict malformed-memory snapshot rejection.
- Old T1–T4 trajectories/snapshots unchanged with T5 off, and all controls demonstrably live without reset.
- Chromium UI verifies the true register values after stepping, live edits, all presets, old track preservation and recipe round-trip; original 17 engines, GIF and video must remain green.

**Do not merge unless complete CI and Netlify preview pass.** No Copilot credits required.
