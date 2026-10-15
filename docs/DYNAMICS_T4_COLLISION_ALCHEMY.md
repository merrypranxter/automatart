# Dynamics T4 — Collision Alchemy: Multiple Writers, One Real Cellular World

T4 extends the T1/T2/T3 Turmite engine into a small **multi-species artificial chemistry**. It is a **real finite-state cellular movement/write rule**, not a coloring effect, particle animation or hidden interpolation.

## Species-specific writes

The four existing stable T2 species can now independently select a T3-style track writer:

- NEXT: `(c+1) mod N`
- STRIDE: `(c+k) mod N` with `k=-12..12`
- ERASE: true indexed track state `0`
- TABLE: a separate **24-input → 24-output** replacement function for each species, reduced modulo the chosen actual track-genome length `N=2..24`

A physical agent's species remains its stable identity `agentIndex mod turmiteSpeciesCount`; no extra fragile identity state is added to the world snapshot. The **global T3 write program stays available** as an exact fallback when T4 is disabled. The default for T4 is **disabled**, so every old RL/T1/T2/T3 save still advances the same way.

The read/turn program still runs first on the current actual pigment and retains all heading/species T2 turning rules. The selected writer then updates that **actual Uint8 lattice cell**. Any later ant visiting it in the same substep reads the first ant's newly written color.

## Actual collision-dependent chemical products

This is a special rule triggered only when **two or more agent positions coincide on exactly the same lattice cell at the START of a full T1/T2 movement round**. It is not triggered by adjacent ants, projected trail crossings, shared colors, visual overlap due to markers, or two arms approaching within a radius.

For a true coincidence of `m>=2` agents, the agent with species index `s=0..3` first computes the normal product `p=speciesWrite(c)`, then applies one of four possible reactions:

- NONE: `p` — regular independent species writing
- DISSOLVE: `0` — erase the actual pigment
- INVERT: `N-1-p` — index complement
- FUSE: `(p+m+s+1) mod N` — a physically written, occupancy- and species-dependent modular product

At every round, the occupancy census is computed simultaneously before any ant writes or moves. The pigment changes remain sequential by stable ant identity, so a four-ant collision makes four actual evolving writes to the same cell; the next ant reads the prior chemical product. Each new T1/T2 substep recalculates genuine co-location.

The **T2 REPEL control stays independent**: a contact may change real heading without changing the color, or change the color without reflecting headings, or do both.

This collision algebra can yield period-dependent cancellations for some pigment numbers—that is mathematically real and is reflected in both the actual paint and the inspector.

## Live controls and preset

The single always-visible artwork remains above the experimental controls. T4 adds:

- ENABLE INDIVIDUAL SPECIES CHEMISTRY toggle. OFF gives exactly the original shared T3 writer.
- Select a species 1–4 and edit its own NEXT/STRIDE/ERASE/TABLE program, including its own absolute replacement palette of **24 true input track states**, with UI displaying active genome slots.
- Select collision chemistry NONE / DISSOLVE / INVERT / FUSE.
- A live **two-column algebra scope** displays each active species' real next-state product when alone versus when sharing a physical cell with one other ant (calculated from the exact same production write function, not from a color shader).
- RESTORE T3 WRITERS to turn chemistry off without deleting any art.
- FOUR-SPECIES FUSION PILEUP preset: ensures at least four physical ants exist, uses all four species, and places them together so collisions occur from the first true iteration. **This preset intentionally restarts** because ant count or initial formation changes. All chemistry and species writer settings are **live and non-destructive** during ordinary editing.

Original genome/turning rules, T3 placement, recording, skins and export formats remain supported. There is no need to create a new app or download an extra plugin.

## Exact verification

- Independent truth checks for all four write programs, several real genome lengths 2–24, all four species, and 1-,2-,3-,4-,12-body occupancy counts. Verify disabled T4 equals T3 byte for byte.
- Direct same-cell multi-agent contact tests; complete sequential pigment writes and independent T2 REPEL heading changes. No reaction for merely nearby agents or preexisting pigment trails.
- More than a thousand multi-species / multi-formation / microstep histories, compared exactly to repeated real 1-step evolution, including immutability of the original grid and saved agent list.
- Full real `stepWorld` and 28-generation JSON recipe replay; cloned GIF/video recorder cursor must produce identical future cells and agent positions. Reject invalid species programs, tables and collision modes.
- Chromium tests mode changes, actual state products, individually edited DNA, same-site fusion, non-destructive LIVE changes, four-species pileup, save/import/replay, and the existing GIF/video capture system.
- Full previous 17-engine, Ising, B1–B11, T1–T3, high-resolution export, browser and Netlify regression checks must pass before merge.

No GitHub Copilot credits required.
