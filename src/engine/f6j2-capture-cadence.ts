/** F6J2 — browser-independent decisions for smooth, deterministic export.
 *
 * The offline VideoEncoder consumes frame-indexed canvas snapshots directly:
 * a compositor requestAnimationFrame is NOT a presentation clock and can be
 * throttled when a tab is backgrounded. Instead, periodically yield to the
 * event loop for cancel/progress responsiveness without slowing every frame.
 */
const finite=(n:number,otherwise:number)=>Number.isFinite(n)?n:otherwise;

/** Monotonic fixed-timebase frame timestamps. NEVER use performance.now()
 * to timestamp WebCodecs frames or the output will stutter during encoding.
 */
export function fixedVideoFrameTime(index:number,fps:number):{
 timestamp:number;duration:number
}{
 const rate=Math.max(1,Math.min(120,finite(fps,10)));
 const frame=Math.max(0,Math.floor(finite(index,0)));
 return {timestamp:Math.round(frame*1000000/rate),
  duration:Math.round(1000000/rate)};
}

/** Yield only after a bounded period of synchronous frame work.
 * This yield improves access to cancel/UI tasks; it NEVER affects frame
 * counts, timebase, or the simulated generation sequence.
 */
export function offlineYieldDue(now:number,lastYield:number,interval=24):boolean{
 return Number.isFinite(now)&&Number.isFinite(lastYield)&&
  now-lastYield>=Math.max(1,finite(interval,24));
}

/** React/DOM recorder progress need not repaint for every high-res GIF.
 * But show the first frame, the last frame and every phase transition.
 */
export function captureProgressDue(
 phase:string,frame:number,total:number,now:number,lastTime:number,
 lastPhase:string,interval=100
):boolean{
 if(frame<=0||frame>=total||phase!==lastPhase)return true;
 return Number.isFinite(now)&&(!Number.isFinite(lastTime)||
  now-lastTime>=Math.max(1,finite(interval,100)));
}
