# D2C — Penrose production rendering and exact touch geometry

D2B introduced genuinely living de Bruijn pentagrid cells, but the general non-square preview renderer is limited to a **200–640px polygon projection**. That is suitable for lightweight animation previews, but upscaling that bitmap to 1080p or 2160p gives chunky borders and wastes export pixels.

**Final pixel output:** For Penrose exports only, each thin/fat rhomb's exact physical vertices become Canvas2D polygon paths at the *requested final artwork dimensions*. The same production cell output (palette, color signals, skins, temporal material) is individually clipped into each polygon. The final Print Shop postprocess is unchanged. We do not allocate an enormous 4K polygon-to-cell pixel index texture, and do not fake resolution by resizing a 640px preview. All current export flows go through `renderExportFrame` (stills, GIF, video). The interactive stage retains the inexpensive preview renderer.

**Exact taps and paint:** `penroseHitTest` spatially bins the immutable P3 patch in physical 1.5-unit buckets, then tests the true convex polygon, rather than asking the preview's 200px raster which tile it approximates. This fixes fragile targeting of thin rhombs on iPhone portrait layouts, and is used by the existing deterministic brush/stamp editor. There is still real finite-patch background, never a fabricated wrap seam.

**Export acceptance gates:** `scripts/d2c-penrose-production-smoke.mjs` compares actual rhomb center and near-edge pigment at 720/1080/2160 output pixel scales, verifies true resolution and 9:16 / 1:1 matte output, proves precise hit testing of thousands of thin/fat cells on portrait maps, and checks no mutation of cells/seed/clock from rendering. Full TypeScript/Vite build and Chromium GIF/video recorder suite must pass. Test genuine capture at multiple skins and pixel sizes using the Netlify preview before merging.

**On-device acceptance still needed:** the automated Chromium tests do not prove iPhone Safari responsiveness under 10–30-second high-res captures, or iPhone codec support. Long 2160p 30fps recording may hit hardware/memory limits. These require manual testing on the actual target phone before an App Store release; never label them complete without such testing.

**No automatic merge.**
