# Dynamics B4 — Verified Wireworld Logic Bench

## The rule: No fake logic
This phase only calls a device a *gate* after all relevant Boolean input combinations are simulated under canonical production `stepWireworld`: four cells states (0 empty, 1 conductor, 2 head, 3 tail), default exact one-to-two Moore-head threshold, no external stimulus and no modified local rules. Presence/absence of a short initial head+tail pulse encodes each input bit. Boolean output is measured only when a real **head arrives at the far output port**, not when a colored pixel looks bright.

### Delivered, certified devices
- **Two-input OR (A ∨ B):** two orthogonal incoming tracks connect to one outgoing rail. Its 00, 01, 10, 11 configurations produce respectively 0, 1, 1, 1 measured remote output pulses.
- **Signal fanout:** one incoming track branches into two physical rails. With input 0, both ports stay quiet; with input 1, both output ports receive a real head event.
- Adjustable conductor radius **7–12** and cardinal rotation **0, 90, 180, 270 degrees**.
- Every device is built from literal conductor cells and real optional input head/tail pairs. Installation locally clears around the circuit so unrelated random neighbors don't accidentally masquerade as gate wiring, and it refuses partial edge-clipped geometry. Other parts of the artwork are untouched; current generation remains unchanged.
- The bench produces the measured **truth table and an electron-head oscilloscope**, with individual time ticks. It uses precisely the same production CA transition function used by live playback, and only runs again when the device type or conductor radius changes. UI exposes two Boolean inputs and one-touch installation at the center of the live stage.
- After installing, output probes display the current **actual canonical state** of each output site, including the fanout's second port. They do not claim a global or perpetual logic truth guarantee if the user paints new wires near the device, changes the excitation law or turns on sources.

### Not included
- A four-way plus junction is NOT an insulated wire crossover. Existing B3 crosses remain explicitly connected.
- AND, NAND, XOR and NOT are **not** advertised yet. Their full input truth tables must be physically verified first. No static drawing with a gate label counts.
- Output monitors here are per-frame real-state readouts and a deterministic, fixed-window isolated-device oscilloscope; they are not yet long-term routed waveform recording or conditional graph tracing.
- A seeded input is an initial-condition edit. The internal gate evolution runs pure canonical physics; a single pulse is not a permanent active circuit clock.

### Tests
- Every radius (7–12) truth table is computed from actual `stepWireworld`.
- Three representative radii (7,9,12), both devices, all four orientations and **every** input combination run as fully integrated, center-stamped live worlds through `stepWorld`, with full output waveforms compared tick-by-tick against the bench and against imported JSON snapshot replay.
- All states remain the canonical four states, no forced electrodes needed and no hidden changes of generation or the external canvas.
- Edge-clipped devices are rejected atomically; original GIF/video and older 17-engine regressions continue in GitHub Actions.
- Chromium checks functional controls, physical install and output probes, saved recipe roundtrip, both 4-row OR and 2-row fanout truth tables.

### Next
B5 — seek actual canonical AND/XOR and insulated crossovers with independently validated truth tables, then integrate modular routing and probe history. Do not call a module 'certified' before its port behavior passes every case.

No GitHub Copilot credits required.
