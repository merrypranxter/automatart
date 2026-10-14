# Dynamics B5 — Real XOR + Electrical Signal Scope

## XOR that physically *computes*, not a visual label

B5 adds an original compact **dual-contact XOR** to the existing verified Wireworld OR and two-output fanout bench. The source physics is unchanged and canonical: EMPTY=0, CONDUCTOR=1, HEAD=2, TAIL=3. Only conductor cells with **1 or 2 HEAD neighbors** ignite; a conductor with 3 or more does not.

A single asserted Boolean input in this new XOR is encoded by **TWO simultaneous head contacts** (not by B4's conventional single head/tail pair). The emitter positions are chosen so each input independently provides two neighboring HEAD states to the center conductor, while both inputs together provide four. This means the central conductor activates for A only or B only, and blocks for A+B. The output departs along a diagonally oriented conductor line whose next cell is *not* adjacent to the emitters, preventing signals from bypassing the central logic collision.

- XOR 00: no initial heads, no output HEAD.
- XOR 01: two real initial B heads, one remote output HEAD.
- XOR 10: two real initial A heads, one remote output HEAD.
- XOR 11: four simultaneous real heads, zero remote output HEAD.

For radius R, the output receives its one-shot HEAD at tick R+1. The design and rule are tested for **all radii 7–12** and cardinal rotations. Importantly, this is a *dual-contact single-shot* XOR; it is NOT advertised as a complete clocked single-rail XOR module or a drop-in long-stream bit processor. Neither a cosmetic Boolean flag nor a new exception in `stepWorld` generates the output.

## Actual universe signal scope

An additional B5 scope looks beyond the isolated-device idealization to the user's CURRENT canonical grid. Its probe points are the currently installed device output ports and/or the cell last tapped on stage.

- Trigger an exact deterministic **16/32/64-generation** forecast, displaying **all four physical states per tick** rather than HEAD only.
- Shows generation numbers, first arrivals and all observed head ticks; renders a colored four-state stripe for each site.
- Calculates by deep-cloning the current world and invoking the **same production `stepWorld`** that powers GIF/video and live simulation. It includes any explicitly opted-in external electrode/spark sources and adjusted wire rules instead of showing fake "canonical" results for an altered simulation.
- The user's actual artwork, world generation, saved snapshots and recording remain untouched. Results are labeled as a finite projection and marked stale if current generation, settings, probe selection or horizon changes.
- Scope is user-triggered, not continuously recomputed on every render, avoiding extra work on iPhones. Up to four probes. Nothing silently overwrites the source canvas.

## Verified gates and nonclaims

The certified library now contains original OR, two-output fanout and dual-contact XOR. **AND/NAND/NOT and electrically isolated wire crossings are still research tasks.** A plus junction is an electrically connected junction. A diagram that merely looks like AND/XOR is not a certified truth-function unless all input combinations and remotely observed output head states pass the physical simulator.

If the user paints new cells on or near a certified device, changes the global neighbor firing thresholds, or enables external excitation, the isolated truth table no longer guarantees behavior. The live-world scope measures the actual altered physics.

## Merge gates

- Numerically prove all XOR 00,01,10,11 input states, for every radius 7–12. Verify exactly one HEAD at the predicted output tick for 01/10 and zero for 00/11.
- Test all 6 radii × 4 orientations × 4 Boolean cases = **96 real-world physical evolution traces** using `stepWorld`, byte-exact recipe save and reload.
- 16/32/64-step probe parity with manual production stepping, at multiple sites, with and without optional driven sources; prove live artwork and generation unchanged.
- Reject invalid probe bounds, invalid horizons, and unverified AND devices.
- Full existing regression suite, browser UI (real single-input XOR and all-input collision), GIF worker and smooth video Chromium smoke, and Netlify preview.

No GitHub Copilot credits are required. Merge only when green; testing on physical iPhone Safari afterward is still useful.

Next: research AND/NAND and true isolated crossing based on verified clock/data-routing circuits; strengthen full per-bit timing and branch isolation before claiming working computer modules.
