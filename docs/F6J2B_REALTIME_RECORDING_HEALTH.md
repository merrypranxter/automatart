# F6J2B — Know when iPhone video may stutter

## What this adds

AutomatArt has a frame-indexed GIF Worker and frame-indexed WebCodecs WebM exporter. Both can render slowly while authoring correct playback timestamps. In Safari without supported WebCodecs VP8/VP9, however, the video export uses browser-native MediaRecorder of a live canvas. That produces actual **wall-clock** recording and can be choppy if the device cannot present every painted frame in time.

F6J2B gives the artist **factual recorder diagnostics**, without inventing frame-drop numbers that MediaRecorder does not expose. No new visual filters, quality reductions or forced resolution changes.

Every completed export reports the actual strategy:

- **FRAME-INDEXED GIF** or **FRAME-INDEXED OFFLINE WEBM**: exact authored playback clock; render wall-time is not relevant to file smoothness.
- **REAL-TIME BROWSER RECORDER**: measure each canvas paint + presentation time, number exceeding the requested frame interval, number of late start deadlines, longest paint and wall-time recording length against the requested frames/fps.
- **REAL-TIME TIMING RISK**: flag sustained overload or serious stalls. This means the device struggled to paint on time and the result **may** have skips or unexpected length, NOT an assertion that the encoder actually dropped that many frames. Even healthy measurements are not proof the opaque MediaRecorder retained all frames.

Stutter-risk thresholds intentionally conservative: >8% over-budget or late paints, one paint longer than three frame intervals, or wall-time overrun >max(0.35 seconds, 10% of nominal duration). These classify a recording as worthy of playback review rather than automatically discarding a valid file.

## Workflow

After finishing a video/GIF, open the Export tab and read the timing report immediately above the inline playable preview. If the real-time recorder struggled, check the animation before saving. The app can recommend GIF or offline WebM in browsers with WebCodecs; it does not pretend Safari can provide offline MP4 or that it measured actual encoded dropped frames.

## Constraints preserved

- The cellular automata and all F6 material equations are untouched.
- Native pixel dimensions 1:1 and 9:16 / 720–2160p, encoder selection, real-time paint cadence and fixed WebM/GIF timebase unchanged.
- No frame buffering or new full-resolution recording arrays; only four scalar counters/timestamps, O(1) overhead per real-time frame.
- Dismiss/restart/error flows are unchanged, including file download behavior.
- Existing desktop Chromium browser test validates actual fixed-timebase WebM, while a **new forced-native MediaRecorder browser test** executes the fallback on a 390px mobile viewport, verifies a playable recorded file and the report shown to the user.
- Pure deterministic tests cover healthy paths, real overload, lateness, long frame spike, wall-time overrun, fixed GIF/WebM and malformed telemetry.

### Still requires the artist's actual iPhone

Run 30-second **1:1 and 9:16** clips at 720p, later 1080p. Try 10/15/24/30 FPS with heavy F6H/F6I micro quality. Note the slowest frame and late/over-budget counts; confirm video duration and motion in the built-in player and then iOS Photos/Files. Device codec limitations and thermal throttling cannot be confirmed by desktop Chromium. If the measurements show real overload, the next iteration can focus on the specific bottleneck, rather than indiscriminately reducing render resolution.

The artist alone merges all PRs.
