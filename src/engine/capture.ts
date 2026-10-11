import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { createWorld, stepWorld } from './sim';
import { renderWorld } from './render';
import type { Appearance, SimSettings, World } from './types';

export type CaptureFormat = 'gif' | 'video';
export type DurationMode = 'fixed' | 'settled';
export type ExportResolution = 360 | 480 | 720 | 1080 | 2160;
export interface CaptureOptions {
  format: CaptureFormat;
  mode: DurationMode;
  seconds: number;
  fps: number;
  resolution: ExportResolution;
  restart: boolean;
  stepsPerSecond: number;
}
export interface CaptureProgress {
  phase: string;
  frames: number;
  seconds: number;
  fraction: number;
}
export interface CaptureResult {
  blob: Blob;
  extension: 'gif' | 'mp4' | 'webm';
  frames: number;
  elapsed: number;
  ended: 'duration' | 'settled' | 'limit';
}

export class CaptureCancelled extends Error {
  constructor() { super('Recording cancelled'); this.name = 'CaptureCancelled'; }
}

export function recommendedDimensions(settings:SimSettings, size:ExportResolution):[number,number]{
  const [w,h] = settings.aspect==='square'?[1,1]:settings.aspect==='landscape'?[16,9]:[9,16];
  const width = settings.aspect==='landscape' ? Math.round(size*w/h) : size;
  const height = Math.round(width*h/w);
  // Video encoders prefer even dimensions, especially H.264.
  return [Math.max(2, width+width%2),Math.max(2,height+height%2)];
}

function cloneWorld(w:World):World{
  return {
    engine:w.engine,width:w.width,height:w.height,generation:w.generation,
    cells:w.cells.slice(),ages:w.ages.slice(),neighbors:w.neighbors.slice(),
    events:w.events.slice(),traces:w.traces.slice()
  };
}
function equalCells(a:Uint8Array,b:Uint8Array):boolean{
  if(a.length!==b.length)return false;
  for(let i=0;i<a.length;i++)if(a[i]!==b[i])return false;
  return true;
}
const wait = (ms:number) => new Promise<void>(resolve=>setTimeout(resolve,ms));
function assertNotCancelled(signal:AbortSignal){
  if(signal.aborted)throw new CaptureCancelled();
}

export function chooseVideoMime():string|null{
  if(typeof window==='undefined'||typeof MediaRecorder==='undefined'
    ||!('captureStream' in HTMLCanvasElement.prototype))return null;
  // Safari commonly offers MP4; Chromium/Firefox may offer WebM instead.
  const types=['video/mp4;codecs=avc1.42E01E','video/mp4',
    'video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'];
  return types.find(type=>MediaRecorder.isTypeSupported(type))??null;
}

interface SimulationCursor {
  current:World;
  advance:()=>boolean;
}
function makeCursor(source:World, s:SimSettings, fps:number, stepsPerSecond:number):SimulationCursor{
  let current=cloneWorld(source);
  let fraction=0;
  let unchanged=0;
  const cursor:SimulationCursor={
    current,
    advance(){
      fraction+=stepsPerSecond/fps;
      const steps=Math.floor(fraction);
      fraction-=steps;
      for(let i=0;i<steps;i++){
        const next=stepWorld(current,s);
        unchanged=equalCells(current.cells,next.cells)?unchanged+1:0;
        current=next;
      }
      cursor.current=current;
      // 3 consecutive generation checks avoids a false still frame at low speed.
      return unchanged>=3;
    }
  };
  return cursor;
}

export async function captureAnimation(
  startingWorld:World,
  s:SimSettings,
  a:Appearance,
  options:CaptureOptions,
  onProgress:(progress:CaptureProgress)=>void,
  signal:AbortSignal
):Promise<CaptureResult>{
  const opt={...options,
    seconds:Math.min(600,Math.max(1,Number(options.seconds)||30)),
    fps:Math.min(30,Math.max(5,Number(options.fps)||10)),
    stepsPerSecond:Math.max(1,Math.min(120,Number(options.stepsPerSecond)||18))
  };
  const source=opt.restart?createWorld(s):startingWorld;
  const cursor=makeCursor(source,s,opt.fps,opt.stepsPerSecond);
  const [width,height]=recommendedDimensions(s,opt.resolution);
  const canvas=document.createElement('canvas');
  canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d',{willReadFrequently:opt.format==='gif'});
  if(!ctx)throw new Error('Canvas drawing is not supported in this browser.');
  const totalFrames=Math.ceil(opt.seconds*opt.fps);
  const update=(phase:string,frame:number)=>{
    onProgress({phase,frames:frame,seconds:frame/opt.fps,fraction:Math.min(1,frame/totalFrames)});
  };

  if(opt.format==='gif'){
    // GIF's centisecond timing and 256-color limit make 10 fps / 480p
    // a more reliable mobile default than enormous 4K/high-fps exports.
    const encoder=GIFEncoder();
    let frames=0,ended:CaptureResult['ended']='duration';
    for(let i=0;i<totalFrames;i++){
      assertNotCancelled(signal);
      renderWorld(canvas,cursor.current,a,width);
      const pixels=ctx.getImageData(0,0,width,height).data;
      const palette=quantize(pixels,256,{format:'rgb565'});
      const index=applyPalette(pixels,palette,'rgb565');
      encoder.writeFrame(index,width,height,{
        palette,delay:Math.round(1000/opt.fps),repeat:opt.mode==='settled'?-1:0
      });
      frames++;
      const stable=cursor.advance();
      if(opt.mode==='settled'&&stable){ended='settled';break;}
      if(i===totalFrames-1&&opt.mode==='settled')ended='limit';
      if(i%2===0){update('Encoding GIF',frames);await wait(0);}
    }
    assertNotCancelled(signal);
    update('Finalizing GIF',frames);
    encoder.finish();
    const bytes=encoder.bytes();
    const out=new Uint8Array(bytes.length);
    out.set(bytes);
    return {blob:new Blob([out.buffer],{type:'image/gif'}),extension:'gif',
      frames,elapsed:frames/opt.fps,ended};
  }

  const mime=chooseVideoMime();
  if(!mime)throw new Error('This browser does not support video capture. Try Chrome, Edge, or Safari on a newer device.');
  if(typeof canvas.captureStream!=='function')throw new Error('Canvas video recording is unavailable here.');
  renderWorld(canvas,cursor.current,a,width);
  const stream=canvas.captureStream(opt.fps);
  const chunks:Blob[]=[];
  let recorder:MediaRecorder;
  try{
    recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:
      opt.resolution>=2160?16_000_000:opt.resolution>=1080?8_000_000:opt.resolution>=720?4_000_000:2_000_000});
  }catch(e){
    stream.getTracks().forEach(track=>track.stop());
    throw new Error('Cannot start this video format or resolution on this device.');
  }
  let mediaError:Error|null=null;
  const finished=new Promise<void>(resolve=>{
    recorder.ondataavailable=event=>{if(event.data.size>0)chunks.push(event.data);};
    recorder.onerror=()=>{mediaError=new Error('The browser video recorder reported an error.');};
    recorder.onstop=()=>resolve();
  });
  let frames=0,ended:CaptureResult['ended']='duration';
  try{
    assertNotCancelled(signal);
    recorder.start(2000);
    const start=performance.now();
    const frameLength=1000/opt.fps;
    for(let i=0;i<totalFrames;i++){
      assertNotCancelled(signal);
      // Real-time canvas capture: MediaRecorder timestamps physical time.
      // Don't freeze the UI by simulating a minute of video synchronously.
      renderWorld(canvas,cursor.current,a,width);
      frames++;
      const stable=cursor.advance();
      if(i%Math.max(1,Math.floor(opt.fps/3))===0)update('Recording video',frames);
      if(opt.mode==='settled'&&stable){ended='settled';break;}
      if(i===totalFrames-1&&opt.mode==='settled')ended='limit';
      const nextTime=start+(i+1)*frameLength;
      await wait(Math.max(0,nextTime-performance.now()));
    }
    // Let the MediaRecorder capture the final painted frame before stopping.
    if(!signal.aborted)await wait(Math.ceil(1000/opt.fps));
  }finally{
    if(recorder.state!=='inactive')recorder.stop();
    await finished;
    stream.getTracks().forEach(track=>track.stop());
  }
  assertNotCancelled(signal);
  if(mediaError)throw mediaError;
  const blob=new Blob(chunks,{type:mime.split(';')[0]});
  if(blob.size<100)throw new Error('The browser did not produce a playable video. Try a lower resolution.');
  const extension=mime.includes('mp4')?'mp4':'webm';
  update('Finalizing video',frames);
  return {blob,extension,frames,elapsed:frames/opt.fps,ended};
}
