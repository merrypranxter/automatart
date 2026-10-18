# F6J2C — Test the REAL export workload on your iPhone (optional)

The goal is not another speculative optimization. Once F6J2B exposed actual MediaRecorder deadline pressure, we still needed a safe way to estimate the current artwork's render cost **before** recording a long, high-resolution animation.

## Artist workflow

1. Choose cellular engine, mathematical skin, output framing (1:1, 9:16 and other ratios), 360–2160 short-side pixels and FPS.
2. Open Export and tap **TEST THESE EXPORT SETTINGS**. No recording is started and no file is made.
3. AutomatArt copies the current world, or recreates the chosen seed if the existing "Restart from original seed" option is enabled. It renders **one warmup + five measured frames** of the actual selected native export size, F6 microshader, palette, and cell engine. The temporary trial steps use the existing capture cursor and steps-per-second setting, including partial-generation frame repeats.
4. Read median, P90 and slowest render/step milliseconds beside the chosen FPS frame interval; separately see how much stepping contributes. The route label comes from actual WebCodecs support detection or native MediaRecorder capability:
   - **Frame-indexed GIF:** doesn't need to render in real time; GIF quantization/Worker overhead and file size are not measured by this probe.
   - **Offline WebM:** frame-indexed timestamp stays valid even if painting exceeds the interval. Long export time is possible.
   - **Real-time native video:** a high P90 compared with the time budget is **render-pressure risk**, not proof of encoded drops. Video compositor and encoder work are NOT included, so even an "under budget" result isn't proof of smooth recording.
   - **Unavailable:** browser didn't report a supported video pathway.
5. Change FPS, aspect, quality, rules, palette, etc. and the old measurements disappear automatically; rerun for the new settings.

## Safety / correctness

- On-demand only. No automatic background profiling, new export caps or silent resolution downgrades.
- Original world remains completely untouched; the benchmark cursor always deep-clones its simulation source, uses exact stepWorld laws, and never saves or paints into the user's stage.
- Temporary full-resolution canvases are released after the trial; only 5 scalar timing samples are retained. It yields to browser input after each of the 6 trial frames, supports explicit CANCEL TEST, restores the original play/pause state, and doesn't interfere with recording.
- Measurement excludes encoder/Worker overhead, screen compositor, later sustained thermal throttling, and native encoded frame drops. Avoid extrapolating an exact 30-second file render time from 5 samples.
- On mobile, long 2160p frames might still be heavy during the opt-in trial. Try 360/720 first if desired; never infer a real iPhone pass from CI Chromium.
- All previous GIF/video/CA mathematics and exported file shapes remain unchanged.

## Acceptance gates

1. Pure statistics tests for sorted median/P90, route-sensitive interpretation (including very slow but frame-indexed offline exports), invalid data rejection and deadlines.
2. Real Node Canvas draws and genuine cellular steps, for square/Penrose/Voronoi at exact 1:1 and 9:16, verifying original world snapshot is identical afterward and AbortSignal cancellation stops the trial.
3. Real Chromium 390px browser clicks the opt-in button, reads results, changes FPS to invalidate stale results, measures true portrait, and exercises browser codec-route detection. Verifies live world does not advance.
4. Entire 97-step historical suite incl. actual GIF Worker and decoded WebM/video on Chromium remains required.

Still needed: a physical iPhone test at 10/15/24/30 FPS, heavy microscopic skins, 1:1 and 9:16 at 720/1080p, ideally a 30-second video each after benchmarking. This is how we'll decide if the next performance change should target sim stepping, high-res shader drawing, or MediaRecorder presentation/encoding.

The artist always owns the merge button.
