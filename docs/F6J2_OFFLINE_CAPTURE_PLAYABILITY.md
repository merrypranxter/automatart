# F6J2A — iPhone export: stop screen repaint throttling offline WebM

## The problem, not a promise

When WebCodecs VP8/VP9 is available, the application already writes a frame-perfect WebM file using manually indexed frame timestamps. But it unnecessarily awaited a browser \`requestAnimationFrame\` after *every* frame encoded. That turns a deterministic offline exporter into a display-refresh-paced exporter, slows high-resolution files, and can stall dramatically if Safari/Chromium throttles a background tab. No data needs to be presented onscreen between two synchronous \`VideoFrame(canvas)\` snapshots.

The old GIF Worker also forwarded a React progress update after every frame, which causes avoidable interface work during otherwise expensive exports.

## What F6J2A does

1. Snapshot a fully rendered canvas into \`VideoFrame\`, using exact \`Math.round(index * 1_000_000 / fps)\` timestamps and fixed frame duration as before. **Do not wait for a screen repaint between offline encoded frames.**
2. Yield to the browser event loop only after about 24ms of synchronous work so cancel/progress/input can run. Keep existing \`encodeQueueSize > 3\` backpressure checks, encoder errors and cancellation; no unbounded queuing or skipped simulated generations.
3. Throttle React capture progress repaint notifications to roughly 10 Hz while ALWAYS publishing the first frame, last frame and phase changes (initialization/finalization/limits/errors). This helps GIF and offline WebM equally; actual encoder frames stay unchanged.
4. Leave Safari's \`MediaRecorder\`/canvas.captureStream real-time fallback explicitly marked as fallible. That path still waits for visible presentation and records on **wall clock**. No misleading claim that it can produce a full offline MP4. Keep GIF Worker one-frame-at-a-time transfer, accurate compressed-size limits, and error messaging.
5. No changes to real cellular physics, its snapshots, non-default palettes, F6 microscopic math, frame sizes, GIF colors or source canvas's physical geometry.

## Test contract

New \`scripts/f6j2-cadence-smoke.mjs\` covers 60 seconds of exact frame-index timestamps for 5, 10, 12, 15, 24 and 30 FPS; UI yield decisions, first/final/phase-change progress updates and the existence of correct offline/fallback control flow.

The existing real Chromium recording tests still have to decode an actual video and check at least four different evolving frames, timestamps/duration and both recorder strategies; the GIF Worker browser test still must decode genuine colored changing frames. Every preceding F6A–F6J1 CA engine, geometry, shader and UI regression remains required.

## What is NOT verified automatically

On real iPhone Safari, check live quality 0/3 and graph phases with ~20 seconds of painting/playback; make 30s 1:1 and 9:16 720p video and GIF, and confirm uninterrupted player motion, correct colors and complete frames. Repeat on higher resolutions as RAM allows. iOS Safari may not support the offline VP8/VP9 WebCodecs branch: the real-time MediaRecorder fallback may still stutter. A future F6J2B should be scoped only from that actual device feedback. Do not turn this into a new mathematics feature or claim offline MP4 where only WebM is encoded.

The user alone merges all PRs.
