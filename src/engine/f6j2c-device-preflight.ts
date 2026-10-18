/** F6J2C: short, opt-in, on-device render/step performance probe.
 * It draws exactly the artist's requested export resolution and mathematical
 * materials on temporary offscreen canvases, stepping a CLONED world. It does
 * NOT encode GIF/MP4/WebM or claim to predict Safari's opaque video drops.
 */
import {createWorld} from './sim';
import {createCaptureCursor,chooseVideoMime,CaptureCancelled} from './capture';
import type {CaptureOptions} from './capture';
import {exportFrameLayout,renderExportFrame} from './export-frame';
import {offlineVideoCodec} from './fixed-webm.js';
import type {Appearance,SimSettings,World} from './types';

export type PreflightRoute='gif-worker'|'offline-webm'|'native-video'|'video-unavailable';
export type PreflightSignal='frame-indexed'|'under-budget'|'near-budget'|'over-budget'|'unavailable';
export interface CapturePreflightResult {
  route:PreflightRoute;
  signal:PreflightSignal;
  width:number;
  height:number;
  fps:number;
  samples:number;
  medianMs:number;
  p90Ms:number;
  maximumMs:number;
  meanMs:number;
  stepMeanMs:number;
  frameBudgetMs:number;
}
export function preflightStats(
 samples:readonly number[],stepTimes:readonly number[],fps:number,
 route:PreflightRoute,width:number,height:number
):CapturePreflightResult {
 if(samples.length===0||stepTimes.length!==samples.length||
  !samples.every(v=>Number.isFinite(v)&&v>=0)||
  !stepTimes.every(v=>Number.isFinite(v)&&v>=0)||
  !Number.isFinite(fps)||fps<=0||!Number.isFinite(width)||!Number.isFinite(height))
  throw Error('Invalid preflight samples');
 const sorted=[...samples].sort((a,b)=>a-b);
 const p90=sorted[Math.ceil(sorted.length*.9)-1];
 const sum=samples.reduce((a,b)=>a+b,0),stepTotal=stepTimes.reduce((a,b)=>a+b,0);
 const frameBudgetMs=1000/fps;
 const signal:PreflightSignal=route==='video-unavailable'?'unavailable':
  route!=='native-video'?'frame-indexed':
  p90>frameBudgetMs?'over-budget':
  p90>frameBudgetMs*.7?'near-budget':'under-budget';
 return {route,signal,width,height,fps,samples:samples.length,
  medianMs:sorted[Math.floor((sorted.length-1)/2)],p90Ms:p90,
  maximumMs:sorted.at(-1)!,meanMs:sum/samples.length,
  stepMeanMs:stepTotal/samples.length,frameBudgetMs};
}
const pause=()=>new Promise<void>(resolve=>setTimeout(resolve,0));
const guard=(signal:AbortSignal)=>{if(signal.aborted)throw new CaptureCancelled();};
/** Five measured frames + one discarded warmup. Actual export dimensions,
 * exact F6 shader, real CA stepping as in captureAnimation. Snapshot-only:
 * caller's original world, generation, paint and saved recipe are unchanged.
 */
export async function measureCapturePreflight(
 world:World,settings:SimSettings,appearance:Appearance,options:CaptureOptions,
 signal:AbortSignal,onProgress?:(done:number,total:number)=>void
):Promise<CapturePreflightResult>{
 guard(signal);
 const layout=exportFrameLayout(settings,options.resolution,
  options.frameAspect??'current',options.frameFit??'contain');
 const fps=options.fps;
 let route:PreflightRoute='gif-worker';
 if(options.format==='video'){
  const codec=await offlineVideoCodec(layout.width,layout.height,fps,
   options.resolution>=2160?20_000_000:options.resolution>=1080?10_000_000:
    options.resolution>=720?5_000_000:2_500_000);
  guard(signal);
  route=codec?'offline-webm':chooseVideoMime()?'native-video':'video-unavailable';
 }
 const source=options.restart?createWorld(settings):world;
 const cursor=createCaptureCursor(source,settings,fps,options.stepsPerSecond);
 const canvas=document.createElement('canvas'),scratch=document.createElement('canvas');
 const elapsed:number[]=[],steps:number[]=[];
 // 6 frames total at real requested output size (one warmup, five measured).
 const total=6;
 try{
  for(let i=0;i<total;i++){
   guard(signal);
   const start=performance.now();
   renderExportFrame(canvas,scratch,cursor.current,appearance,layout);
   const stepAt=performance.now();
   cursor.advance();
   const end=performance.now();
   if(i>0){elapsed.push(end-start);steps.push(end-stepAt);}
   onProgress?.(i+1,total);
   // Release the main thread after EVERY trial frame. Do not coalesce
   // samples under a single long task and freeze touch/cancel on Safari.
   await pause();
  }
  guard(signal);
  return preflightStats(elapsed,steps,fps,route,layout.width,layout.height);
 }finally{
  // Immediately release large 720–2160p output/scratch backing stores;
  // do not leave capture-sized frame buffers attached to the stage.
  canvas.width=0;canvas.height=0;scratch.width=0;scratch.height=0;
 }
}
