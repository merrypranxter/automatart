# F4 — PSYCHEDELIC PRINT SHOP · implementation and merge checklist

## Goal
A **separate VISUAL post-process rack** after the mathematical skin; none of its shaders modifies the simulation state, rules, history, palette library or cell topology. The effects must appear equally in live previews, PNG stills, GIFs (including per-frame local color cycling), video, and saved JSON recipes. No paid API.

## F4A · Foundation
- [x] Typed PrintShop config embedded in Appearance with defaults **OFF**; validate/migrate older recipes.
- [x] CPU-bounded post-process work canvas (max dimension 720 pixels), output re-scaled to the requested size, without altering the underlying canvas resolution.
- [x] Actual sequential effect stack with individual enabled toggles and opacity; master bypass and blend.
- [x] One shared renderWorld() integration AFTER square/hex/triangle skins and geometry.

## F4B · Graphic effects
- [x] Posterization: adjustable number of RGB tone bands (2–12).
- [x] Halftone: real rotated screen-dot mask, editable spacing and rotation.
- [x] Solarization: chemical negative above a tonal threshold.
- [x] Neon X-Ray: density/edge-sensitive fluorescent outline with sensitivity slider.

## F4C · Texture and color printing
- [x] Stipple: coordinate/generation seeded ink-grain; adjustable density and grain size (repeatable, no wall-clock randomness).
- [x] Duotone/tritone: select two or three actual swatches from the editable live palette, with lightness interpolation.
- [x] Three starter combinations (Pop Print / Radioactive / Alien Zine), full Print Reset and Random Print.
- [x] Order controls on each layer; print mix and per-effect amount sliders.

## F4D · Export and QA
- [x] Build/TypeScript check, visual pixel-hash contrast across all six effects, compositing order and master bypass.
- [x] Renderer at 900px output and multiple lattice shapes, pure mathematical state unchanged.
- [x] Real-browser controls, six visibly different renders, preset, reorder, random/reset and recipe save/reload.
- [x] GIF color cycling keeps changing frame palettes with Print Shop active.
- [x] Existing three-lattice / seven-skin, mutations, recorder and video smoke tests remain green.
- [ ] **Merge PR into main only after green GitHub CI.**
- [ ] **Real iPhone Safari evaluation** of speed, display, long GIF and video. This cannot be concluded from Chromium CI.

## Deployment
1. Review PR F4 from `feat/f4-print-shop` into `main`.
2. Check GitHub Actions / Checks show green.
3. Click **Merge pull request** (one merge after all F4A–F4D work).
4. Let Netlify redeploy. Refresh Automatart. Print Shop appears in **SKIN / PRINT / HARVEST** beneath Skin Laboratory.
5. Leave existing skin designs alone. More substantially distinct skins remain on the requested F6 backlog after F5.

## What F4 does NOT do
- It does not alter cellular transition equations or seed states.
- It does not add *new skins*; skins are distinct from print layers.
- It does not change It's a Moiré or Reaction Diffusion Artist. Reuse requires separate math-art-suite integration.
- It does not promise perfect HD/video frame rates on all iPhones: image-processing work is deliberately bounded and Safari remains a live-device test.
