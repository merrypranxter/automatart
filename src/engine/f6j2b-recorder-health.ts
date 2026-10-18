/** F6J2B — honest recording diagnostics.
 * MediaRecorder does not tell us which frames the browser truly encoded.
 * We measure ONLY render/presentation deadline pressure (risk of choppiness),
 * not pretend to have measured missing encoded frames.
 */
export type CaptureTimingMode='gif-offline'|'webm-offline'|'media-recorder-realtime';
export type CaptureTimingRating='frame-indexed'|'within-budget'|'stutter-risk';
export interface CaptureTimingHealth {
 mode:CaptureTimingMode;
 rating:CaptureTimingRating;
 /** Actual painted frames; may NOT equal the number of video frames encoded. */
 renderedFrames:number;
 /** Frames where render + presentation exceeded the full frame interval. */
 overBudgetFrames:number;
 /** Frames started more than half an interval later than their scheduled slot. */
 lateStarts:number;
 /** Largest render + presentation latency in milliseconds. */
 slowestFrameMs:number;
 /** Duration measured on the wall clock while the native recorder was running. */
 wallSeconds:number;
 /** Expected duration from painted frame count / requested frame rate. */
 requestedSeconds:number;
 /** Positive wall-time excess vs expected duration; NOT lost-frame count. */
 overrunSeconds:number;
}
/** Frame-indexed GIF and WebCodecs video work offscreen and may legitimately
 * take longer than playback duration without making the encoded animation choppy.
 */
export function frameIndexedHealth(
 mode:'gif-offline'|'webm-offline',frames:number,fps:number
):CaptureTimingHealth{
 const count=Math.max(0,Math.floor(Number.isFinite(frames)?frames:0));
 const rate=Math.max(1,Number.isFinite(fps)?fps:10);
 return {mode,rating:'frame-indexed',renderedFrames:count,
  overBudgetFrames:0,lateStarts:0,slowestFrameMs:0,wallSeconds:0,
  requestedSeconds:count/rate,overrunSeconds:0};
}
export interface RealtimeTimingSamples{
 frames:number;
 fps:number;
 overBudgetFrames:number;
 lateStarts:number;
 slowestFrameMs:number;
 wallElapsedMs:number;
}
/** Compute a conservative risk signal; never classify the recording as
 * guaranteed smooth. Recorder output frame count and timestamps are opaque.
 */
export function realtimeCaptureHealth(s:RealtimeTimingSamples):CaptureTimingHealth{
 const frames=Math.max(0,Math.floor(Number.isFinite(s.frames)?s.frames:0));
 const fps=Math.max(1,Number.isFinite(s.fps)?s.fps:10);
 const overBudgetFrames=Math.min(frames,Math.max(0,Math.floor(Number.isFinite(s.overBudgetFrames)?s.overBudgetFrames:0)));
 const lateStarts=Math.min(frames,Math.max(0,Math.floor(Number.isFinite(s.lateStarts)?s.lateStarts:0)));
 const slowestFrameMs=Math.max(0,Number.isFinite(s.slowestFrameMs)?s.slowestFrameMs:0);
 const wallSeconds=Math.max(0,Number.isFinite(s.wallElapsedMs)?s.wallElapsedMs/1000:0);
 const requestedSeconds=frames/fps;
 const overrunSeconds=Math.max(0,wallSeconds-requestedSeconds);
 // Rare individual spikes may not be visible at playback speed, but >8%
 // missed frame budgets or a single >3-frame stall merits inspection.
 const vulnerable=frames>0&&(
  overBudgetFrames/frames>.08||
  lateStarts/frames>.08||
  slowestFrameMs>3000/fps||
  overrunSeconds>Math.max(.35,requestedSeconds*.10)
 );
 return {
  mode:'media-recorder-realtime',
  rating:vulnerable?'stutter-risk':'within-budget',
  renderedFrames:frames,overBudgetFrames,lateStarts,slowestFrameMs,
  wallSeconds,requestedSeconds,overrunSeconds
 };
}
