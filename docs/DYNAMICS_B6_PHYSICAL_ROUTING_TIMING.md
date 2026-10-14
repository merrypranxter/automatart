# B6 — Canonical Wireworld Signal Routing & Timing

## Objective

Move beyond merely recognizing a Boolean HEAD pulse: make actual cellular Wireworld structures that **route, delay, and separately carry electrical signals**. Preserve classic four-state rules (0 VOID, 1 CONDUCTOR, 2 HEAD, 3 TAIL), default CONDUCTOR firing when **1–2** Moore neighbors are HEAD. No per-cell exceptions, fake movement, presentation-only delays, or background workers.

## Three physically computed devices

1. **Variable delay rail:** A real conductor line grows by `d` more lattice cells at its upstream end; a genuinely seeded HEAD/TAIL pair travels along it. Output first-head time `2r + d − 1`, where base half-length `r = 7..12`, added conductor cells `d = 0..12`. With signal A off, no pulses appear.
2. **Parallel A/B lanes:** Two separate conductor lines, ten rows apart, with true A/B head+tail input pulses. Lane A travels `2r` cells, lane B travels `2r + d`. Simultaneous inputs arrive at distinct but geometrically aligned output ports `d` real full generations apart. All 00/01/10/11 cases are tested; the lanes have no Moore-neighbor coupling, and `d=0` yields exact simultaneous arrivals. This is not an AND gate, even if an external *measurement* detects coincidence.
3. **Two-pulse train:** A single conductor rail with independently enabled A and B initial HEAD/TAIL pairs, spaced `d = 3..12` cells apart. B's downstream pulse reaches the same remote port at generation offset `2r-1`; A's further-upstream pulse arrives at `2r+d-1`. With both enabled, the actual output contains **two distinct HEAD events** at those times. These are not two computer-generated visual markers: two actual four-state pulses propagate.

All devices rotate by 0/90/180/270 degrees. Every timed output shown in the bench is **measured by actually stepping** a full isolated Wireworld grid; the simple conductor-length formulas are separate assertions, not used to generate the observed waveform.

## Live stage integration

The B6 ROUTING + TIMING instrument appears under WIREWORLD RULES. Select circuit, half-length, additional physical delay, orientation and A/B pulses. The table shows all meaningful input cases and their measured HEAD tick arrivals; certification is withheld unless the measured cases equal predicted physical travel times.

**Install at center** writes actual conductor, HEAD and TAIL cell states into the **current** universe, **without resetting its generation or seed**. It locally clears a two-cell buffer so unrelated random wires cannot silently turn a measured timing route into an unknown circuit. It fails atomically if any material would be clipped by the artboard. User artwork outside the local buffer is preserved.

Certified installation requires original `wireExciteMin=1`, `wireExciteMax=2`, `wireDrive='off'`; the UI does not silently change the user's global physics settings. The user can freely change physics later, but the bench certificate will then describe only the isolated original setup, not modified stage behavior.

After installation, **LIVE OUTPUTS** inspect the actual current HEAD/TAIL state of physical remote conductor output cells. **MEASURE THIS ROUTE · NEXT 64 TICKS** runs the B5 copy-based `forecastWireSignals` on the user's current artwork and current settings. This includes extra driven electrodes or nearby painted signals if enabled after install. No time travel or source modifications occur. Result is labeled stale if generation changes.

Existing save-recipe JSON already stores the real cell states, so all route artwork persists in exports/snapshots. UI probe selections/labels are ephemeral controls, not secretly stored inside the four-state machine; reopening a recipe preserves conductive geometry without pretending to restore a pointer attachment to that geometry.

## Scientific honesty

- A timing comparator **calculates** difference between measured arrivals. It is an analysis operation, not an internal electronic AND gate.
- No AND/NAND or isolated wire crossover is claimed in B6. The plus-shaped track from earlier B3 remains a connected electrical junction.
- If a user alters painted geometry, enables external sources, or changes the excitation rule, isolated bench forecasts no longer guarantee the same result on stage. Use the actual-world 64-tick probe.
- This is a collection of single-shot initialized pulse structures. A continuously clocked digital computer requires more timing and reset infrastructure.

## CI / acceptance

- Exhaustive isolated canonical bench across 3 structure families, radii 7,9,12 and offsets 0,3,6,12 where physically legal; compare real observed HEAD events to the conductor-length expectations, for every Boolean input case.
- Integrated genuine `stepWorld` regression across selected radii, offsets, all cardinal rotations and every meaningful input combination; verify clock stability under stamping, full saved-state JSON replay, and the exact output HEAD timing.
- B5 copy-based 16/32/64-tick scope compared cell-by-cell and tick-by-tick with production evolution; recorded world cells and generation must remain unchanged.
- Clipped circuits fail atomically; capture cursor progresses real states; prior B1–B5, 17-engine smoke, browser UI, GIF Worker and video recorder continue to pass.
- Physical iPhone Safari acceptance is still a hands-on deployment check.

## Follow-on

B7: investigate canonical coincidence/inhibition-based AND/NAND and genuinely noninteracting crossings. Only promote a circuit to 'verified' after measuring every input combination and time alignment with full production evolution.
