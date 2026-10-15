# Dynamics B11 — Measured Return-Wave Collisions & Calibrated Two-Guard Shield

## Why this is genuine and interesting

B9 proved a NAND → timed NOT → AND physical cascade, but also exposed **backward electron propagation** on the original Wireworld conductor. For A=B=1 the second stage ignites at tick r+2 and an electron HEAD returns to the earlier NAND output contact at tick r+3. This is not a rendering issue: original Wireworld conductors are bidirectional.

B11 asks if a pulse from a separate physical wire could meet a backward-moving signal and prevent it from reaching that earlier contact, **without destroying the correct final AND output**. Research in the canonical four-state stepper found one reproducible but very specifically calibrated specimen.

## Calibrated return shield (radius 9 only)

The original B9 cascade, with r=9 and bias NW/NE shifts at **zero**, has a stage-two detector at relative (10,−10) and first-stage NAND output port at (9,−9). Four-case final truth fingerprint is **0001**. With 11 selected, that output is a genuine electron HEAD at T12; its final AND port gets one genuine HEAD at T(11+d) for output rail length d.

The B11 shield adds **two real conductor arms and two actual t=0 source HEADS**:
- The horizontal guard meets the return corridor at **(7,−9)** and extends west to a real seeded HEAD **10 conductor steps** away.
- The diagonal guard meets the corridor at **(8,−9)** and extends northwest to a real seeded HEAD **11 conductor steps** away.

These guards are not timers, artificial particle injections, shader effects, or changes to the original 0/1/2/3 state transition. They are additional real cells added to the current artboard, evolving entirely under canonical `stepWireworld`.

The calibrated guard reproduces the correct AND fingerprint **0001** across all four A/B cases, preserves the forward first-stage electron HEAD at tick 10 for 00/01/10, **and makes the NAND return port completely silent for 11** across the measured post-computation window. The final port still emits the single correct HEAD at T(11+d), tested for output distances d=5,8,12.

### Honest boundaries

This is a **local, synchronized, seeded return-wave shield**, NOT a universal diode. In particular:
- Electrons can still travel backward elsewhere on the circuit; two additional guard waves are introduced and can trigger other real contact sites.
- The calibrated design is only certified for original r=9, original NW/NE bias phases, and unforced 1–2-neighbor square Wireworld. The implementation **rejects** attempts to label the same geometry as certified at other radii or active B10 phase shifts.
- Moving either guard's actual initial electron source by ±1 wire cell changes physical timing and may cause the true AND fingerprint **0001** to become **1111** (four real positive remote-port signals), or may reintroduce a spurious NAND-port HEAD.
- No claim about arbitrarily directed input pulses, insulating wire crossovers, live asynchronous diode behavior, permanent source clocks, or composable circuits of unrestricted sizes.

This is a beautiful example of a mathematical collision shield that's fragile to its initial conditions, not a manufactured schematic symbol.

## User experience

The **B11 RETURN-WAVE COLLISION LAB** sits beneath B10, while retaining the live stage:
- Toggle the two physical guard rails on/off to compare unshielded T12 backpropagation against calibrated guarded silence at the NAND port.
- Independently shift the source positions along each guard by −1,0,+1 conductor cells and watch the **actually measured** four-input truth fingerprint and every physical HEAD arrival.
- Show complete measured time series for the stage-two detector, NAND port, and upstream return corridor instead of conflating premature signals with a genuine block.
- A dedicated **Restore verified shield** button returns to the exactly calibrated geometry.
- An **on-demand, three-case diagonal-source-length spectrum** tracks whether the return remains blocked with the horizontal guard held fixed; avoids continuous CPU-heavy scans on iPhone.
- Stamp a baseline or guarded physical circuit into the current Wireworld canvas; preserve generation and all art outside its local clear zone, **reject clipping atomically**, save as the normal cell-state recipe, and export the original GIF/video pipeline.
- A **64-generation non-destructive current-world scope** measures actual NAND return, second junction, final AND and guard-contact sites, reflecting any later painting or altered settings. No private clone result is confused with an enduring guarantee about changed art.

## Test gates

- Real four-state baseline and guarded truth tables for d=5,8,12; enforce forward NAND, original final AND port and **total absence** of 11 HEADS at the previous NAND port for calibrated shield (not just missing a particular timestamp).
- Complete full-world production `stepWorld` parity at **4 cardinal rotations × 3 output lengths × 4 input pairs × 2 guarded states = 96** actual physical stage trajectories. Compare all 5 original probes, plus the two optional physical guard contacts, to independently computed full-world simulation and exact saved JSON replay.
- Independently test nine real ±1 guard source-length combinations, confirm non-universal timing and truthful classification of premature/late returning HEADS. Do not mislabel a premature event as successfully blocked.
- Verify live-stage 64-tick four-probe forecast is exactly read-only; unchanged canvas generation and cell bytes. Edge-clipped guards must not partially erase source art.
- Complete prior B1–B10 tests, Chromium mobile-width browser interactions, saved recipes, GIF/video recording and Netlify. Physical Safari acceptance still recommended.

## Dependency & merge order

This B11 PR is **stacked on top of B10 PR #37**, which was still open at development time. Merge #37 FIRST, then merge B11 only when its tests are green and its PR base has been updated to main. The user controls both merges.

## Next

Return to wider cellular art exploration: **advanced Turmites, richer skins, larger-than-life neighborhoods, and new chaotic paint parameters**. Other Wireworld research can continue later without monopolizing the suite.
