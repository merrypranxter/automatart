# F6J1 — Fast microscopic rendering without changing the art

## Why this small stabilization PR exists

F6D–F6I added genuine mathematical sampling inside cell polygons. That opt-in subcell pipeline is bounded by equation sample budgets, but the previous implementation needlessly rebuilt its Float32 scalar tiles and ImageData cache on *every* rendered frame, and recomputed identical rotation sine/cosine for every micro sample. Sustained playback and video encode on memory-sensitive phones deserve less garbage-collector traffic.

## Changes

- Reuse two capped Float32 arrays and dimension-keyed tiny RGBA ImageData tiles per original output canvas 2D context. The weak-map key permits retired stage/encoder canvases to be reclaimed; there is no growing time-history buffer. Each pixel is completely rewritten and reused ImageData is displayed only in its populated rectangle; switching skins, quality levels, aspect, and generations cannot show stale ink.
- Precompute the sine/cosine of one micro-equation rotation once per rendered frame, not once per scalar shader evaluation. F6G's existing microLocalRotation remains available; new prepareMicroLocalRotation uses identical arithmetic and is tested against the original for exact numerical equality, including angle zero, negative angles, and nonfinite fallbacks.
- Skip nonlinear F6H domain mapping when its mode is OFF. It was already logically a no-op; the new fast path is also explicitly identity.
- Compute constant per-face phase offsets once per polygon instead of repeated typed-array lookup and modulo per sample, while preserving addition order.
- No change to simulation rules, cell geometry, print inks, rendering formulas, export dimensions, GIF/video clocks, F6I circular graph phase math, or quality caps. There are **zero** new visual artist controls.

## Tests and status limits

New F6J1 smoke covers all nine mathematical skins on square/Penrose/Voronoi with a repeatedly reused canvas; it compares entire RGBA image byte arrays against a fresh canvas across three micro quality levels, F6G rotations, F6H modes, F6I attraction/repulsion, two output widths, and preview/export modes. It also verifies that turning detail off after a detailed render leaves no cached ghosting and re-enabling yields identical output. Existing F6A–F6I math, browser mobile control, physical lattice and GIF/video recording regressions remain required.

CI emits a diagnostic 240k sample rotation loop timing. It is NOT used as a flaky speed pass threshold, and it does not prove Safari/phone thermal performance.

### What remains for F6J2

Physical iPhone: check 20 seconds of preview at dense worlds and live micro quality 3, with and without F6I phase graph. Test GIF and MP4 30s (1:1 and 9:16), play both full length, verify smoothness and correct colors/framings. If stutter survives, profile main-thread step/render/capture separately on actual device, then plan chunking/Worker work in a second PR. Do not claim production iPhone acceptance from desktop Chromium alone.

Do not automatically merge PRs; the artist owns that step.
