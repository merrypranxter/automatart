# Automatart — F5 acceptance / v1.0 go-or-no-go

These are practical acceptance checks, not a certification that physical iPhone Safari has been tested. Do **not** tag v1.0 until an actual user checks the iPhone build, exports and performance.

## Included in F5 Pull Request
- [x] A high-resolution PNG **Snapshot Studio** separate from GIF/video recording.
- [x] Canvas choices: original aspect, 1:1 square, 9:16 portrait, 16:9 landscape, with output pixel dimensions displayed *before* saving.
- [x] Short-side presets 720, 1080, 1440, 2160 → up to 2160×3840; originals are centered with the deep-space matte rather than distorted/cropped when a new frame ratio is chosen.
- [x] PNG exports use same skin, palette and Print Shop renderer as live/recording; cell generation, states and seeds must remain unchanged.
- [x] On iPhone: PNG is rendered first, then a second **SAVE / SHARE** action uses the native share sheet when available; desktop initiates normal download. Ready panel has an X.
- [x] 40px+ mobile touch targets for critical export UI, 16px select text on mobile to reduce focus zoom, keyboard focus indicators and reduced-motion CSS.
- [x] Node PNG-header and geometric no-stretch tests, legacy recipe migration, bad snapshot rejection, and full browser recording smoke tests.
- [ ] PR checks green and branch merged manually into main.
- [ ] Netlify has finished the new main branch deployment.

## Physical iPhone Safari tests required
Use real iPhone Safari (not only Chromium simulated mobile size). If a test fails, report device, iOS version, output resolution, engine, skin/print effects, and whether the app was backgrounded.

- [ ] Fullscreen art and scrolling remain usable; no layout overflows or buttons trapped behind the iPhone home indicator.
- [ ] Existing specimen recipe saves and reloads at the same generation with identical painted/stamped cells, Print Shop and palette cycling.
- [ ] Older settings-only recipe still loads (no invented painted cells, Print Shop defaults OFF).
- [ ] Save 1080×1920 PNG and 2160×3840 PNG (the latter may fail on memory-constrained devices; user should be advised to reduce size).
- [ ] Choose a different snapshot frame aspect from the simulation; verify no stretching, no crop, and actual image pixel dimensions.
- [ ] SAVE / SHARE presents an iOS share sheet and image can be saved to Photos or Files.
- [ ] Recheck a 10-second GIF with strong palette cycling *and* Print Shop effects; compare with live preview.
- [ ] Recheck 10–20-second video with the prior stutter-producing settings; does it freeze for ~0.8 seconds in 1-second cycles?
- [ ] Check 20–30-second GIF encoding cancel, completed GIF number of frames and ability to dismiss export banners.
- [ ] Verify fast-forward, Mutation Dice undo, Alien Paintbrush on square/hex/triangle still work after long use.

## Release decision
If browser CI and real device checks are green, review any remaining blocker-level bugs before labeling a v1.0 release. F6 additional genuinely different skins remains a **future enhancement**, not a blocker for current release.

## Regression CI
`npm run build`; `node scripts/f5-snapshot-smoke.mjs` (after installing `@napi-rs/canvas`); `node scripts/recorder-browser-smoke.mjs`; `node scripts/video-recorder-browser-smoke.mjs`; and all prior mathematical, palettes, F2/F3/F4, and GIF color-cycling smoke tests. All must pass.
