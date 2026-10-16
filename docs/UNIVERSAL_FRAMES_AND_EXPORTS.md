# Automatart — Universal Artwork Frames and Exports (Z-FRAME)

## Two entirely different operations

**MAKE ART ON A REAL VERTICAL GRID:** The stage now has always-visible WORLD SHAPE options for 1:1, 9:16, 16:9, 3:4, 4:3, 4:5, 5:4, 2:3, and 3:2. Selecting a new shape arms a clear two-button confirmation; merely selecting does not mutate or delete the existing mathematical world. Confirming deliberately starts a fresh universe, whose actual square/hex/triangular/rhombille neighbor graph uses the new dimensions (even rows preserved where necessary). Cancelling preserves the existing work. The WORLD panel also uses this explicit guard instead of silently resetting on change.

**EXPORT EXISTING ART TO ANY FRAME:** A second persistent PNG/GIF/VIDEO FRAME selector chooses exactly those nine orientations, or MATCH LIVING WORLD. The output frame choice does not change real cellular dimensions, generation, species, physics, painting or saved recipes. It applies independently of what world shape was used to generate the art. A square-world run can be exported as 1080 × 1920 for phone/TikTok, or 1920 × 1080 for wide video, *without restarting*.

FIT versus FILL modes:
- **FIT:** entire genuine artwork, undistorted aspect ratio, deep-space matte where the requested output ratio differs.
- **FILL:** real center crop to the requested output size; never stretch the lattice cells or fake new mathematical cells outside the original world.

An on-screen live **output composition preview** renders the current real universe with the same equations and skins/Print Shop as the final image. Frame format, FIT/FILL and chosen export quality update the preview immediately and are shared by all formats.

## Outputs

- **PNG:** exact selected output ratio, live composition preview, color/skin/print stack, 720/1080/1440/2160/4320 short-side pixels (potential 8K 7680×4320; devices with insufficient RAM may reject extreme exports). Source world remains untouched. Share on iOS or save on desktop.
- **GIF:** true evolving cellular worlds, GIF Worker with compressed-size guard, user-selected frame, 360/480/720/1080/2160 short-side, 5–30 fps. Frame pixels use the same fit/crop layout as PNG. No stretching.
- **Video:** selected frame and 360–2160 short-side, 5/10/15/24/30 fps; real geometry, frame-perfect offline WebM when supported, MediaRecorder MP4/WebM fallback. Recorder canvas stays at a fixed width and height throughout recording to avoid stream invalidation. A reusable scratch canvas avoids allocating fresh huge source surfaces every frame. No new fake camera animation.
- All existing simulation-state recipe JSON exports, GIF/video preview/playback, and user-facing save/share flows remain intact.

## Quality and tests

- One **shared pure frame math** module `src/engine/export-frame.ts` drives all three output formats and the live miniature preview. Explicit canonical ratios are independent of lattice geometry; MATCH LIVING WORLD uses real rhombille projected geometry where appropriate. Output dimensions are codec-safe even integers. Negative offsets for FILL ensure genuine centered crop.
- The 9 world-shape options have always existed in Automatart but were buried in WORLD. This makes their artistic role visible, distinguishes destructive universe resizing from non-destructive export framing, and adds the formerly missing GIF/video frame controls.
- Added `scripts/z-export-frames-smoke.mjs`: nine ratios × four video sizes × FIT/FILL, snapshot vs video parity, mathematically undistorted square art, 9:16/16:9 pixels, genuine reshaped worlds, rhombille geometry, invalid input rejection and 8K still size.
- Added browser regression to `scripts/recorder-browser-smoke.mjs`: phone-width always-visible world/export controls, 720×1280 video pixel readout from a square world, common PNG frame selection, FIT/FILL preview, guarded world-change CANCEL preserving artwork, affirmative real 96×171 vertical grid, then return to a square 96×96 grid without disrupting the older tests.
- Previous 17-engine mathematical suites, recording/GIF/WebM tests, and Netlify preview must pass unchanged.

## Merge sequencing

This work is deliberately isolated from the in-progress T8 Kuramites PR #47: **no changes to T8 oscillator physics**, avoiding an unrelated dependency. If #47 is merged first, review the PR's current branch comparison and resolve any overlap in App.tsx and recorder-browser-smoke.mjs before merging this one. Do not merge until the final CI and preview are green.
