import { GIFEncoder, quantize } from 'gifenc';
import { createWorld, stepWorld } from './sim';
import { renderWorld } from './render';
import { worldDimensions } from './types';
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
  distinctFrames: number;
}

export class CaptureCancelled extends Error {
  constructor(){super('Recording cancelled');this.name='CaptureCancelled';}
}
export function recommendedDimensions(s:SimSettings,size:ExportResolution):[number,number]{
  const [w,h]=worldDimensions(s);
  // Preserve the ACTUAL cell grid ratio. The rendering canvas must never resize
  // after captureStream() has been called or some browsers lose the video track.
  let width=s.aspect==='landscape' ? Math.round(size*16/9) : size;
  if(width%2)width++;
  let height=Math.round(width*h/w);
  if(height%2)height++;
  return [width,height];
}
export function cloneWorld(w:World):World{
  return {engine:w.engine,width:w.width,height:w.height,generation:w.generation,
    cells:w.cells.slice(),ages:w.ages.slice(),neighbors:w.neighbors.slice(),
    events:w.events.slice(),traces:w.traces.slice(),
    previousCells:w.previousCells?.slice(),olderCells:w.olderCells?.slice(),
    fossils:w.fossils?.slice()};
}
export function equalCells(a:Uint8Array,b:Uint8Array):boolean{
  if(a.length!==b.length)return false;
  for(let i=0;i<a.length;i++)if(a[i]!==b[i])return false;
  return true;
}
const delay=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
const nextPaint=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
const notCancelled=(signal:AbortSignal)=>{if(signal.aborted)throw new CaptureCancelled();};

export function chooseVideoMime():string|null{
  if(typeof window==='undefined'||typeof MediaRecorder==='undefined'
    ||!('captureStream' in HTMLCanvasElement.prototype))return null;
  return ['video/mp4;codecs=avc1.42E01E','video/mp4',
    'video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm']
    .find(t=>MediaRecorder.isTypeSupported(t))??null;
}

interface Cursor {
  current:World;
  advance:()=>{settled:boolean;changed:boolean};
}
export function createCaptureCursor(source:World,s:SimSettings,fps:number,stepsPerSecond:number):Cursor{
  let current=cloneWorld(source);
  let carry=0,unchanged=0;
  const cursor:Cursor={
    current,
    advance(){
      carry+=stepsPerSecond/fps;
      const count=Math.floor(carry);
      carry-=count;
      let changed=false;
      for(let i=0;i<count;i++){
        const next=stepWorld(current,s);
        const same=equalCells(current.cells,next.cells);
        unchanged=same?unchanged+1:0;
        if(!same)changed=true;
        current=next;
      }
      cursor.current=current;
      return {settled:unchanged>=3,changed};
    }
  };
  return cursor;
}

// A steady GIF palette keeps colors coherent across frames and avoids doing
// an expensive 256-color quantization for *every* animation frame on mobile.
function makePaletteIndex(palette:number[][]){
  const lut=new Uint16Array(65536);
  lut.fill(0xffff);
  const colors=palette.map(p=>[p[0],p[1],p[2]]);
  return (rgba:Uint8ClampedArray):Uint8Array=>{
    const out=new Uint8Array(rgba.length/4);
    for(let p=0,j=0;p<rgba.length;p+=4,j++){
      const r=rgba[p],g=rgba[p+1],b=rgba[p+2];
      const key=((r>>3)<<11)|((g>>2)<<5)|(b>>3);
      let best=lut[key];
      if(best===0xffff){
        let dist=Infinity,bestIndex=0;
        for(let k=0;k<colors.length;k++){
          const c=colors[k],dr=r-c[0],dg=g-c[1],db=b-c[2];
          const d=dr*dr*0.9+dg*dg*1.4+db*db*0.9;
          if(d<dist){dist=d;bestIndex=k;}
        }
        best=bestIndex;lut[key]=best;
      }
      out[j]=best;
    }
    return out;
  };
}

// Parse GIF records, not arbitrary 0x2C compressed-data bytes, to verify
// the exported file REALLY has the number of frames the UI promises.
export function countGifFrames(data:Uint8Array):number{
  if(data.length<14||String.fromCharCode(...data.subarray(0,6))!=='GIF89a')return 0;
  let p=13,n=0;
  const packed=data[10];
  if(packed&0x80)p+=3*(1<<((packed&7)+1));
  const skipSubBlocks=()=>{
    while(p<data.length){
      const size=data[p++];
      if(!size)return;
      p+=size;
    }
  };
  while(p<data.length){
    const id=data[p++];
    if(id===0x3b)break;
    if(id===0x21){p++;skipSubBlocks();continue;}
    if(id===0x2c){
      if(p+9>data.length)return 0;
      const flags=data[p+8];p+=9;
      if(flags&0x80)p+=3*(1<<((flags&7)+1));
      p++;skipSubBlocks();n++;continue;
    }
    return 0;
  }
  return n;
}

interface EncoderReply { type:'ready'|'frame-done'|'done'|'error'; message?:string; buffer?:ArrayBuffer; frames?:number }
function roundTrip(worker:Worker,payload:object,transfer:Transferable[],signal:AbortSignal):Promise<EncoderReply>{
  return new Promise((resolve,reject)=>{
    if(signal.aborted){reject(new CaptureCancelled());return;}
    let watchdog:ReturnType<typeof setTimeout>|undefined;
    const clean=()=>{
      if(watchdog!==undefined)clearTimeout(watchdog);
      worker.removeEventListener('message',onMessage);
      worker.removeEventListener('error',onError);
      signal.removeEventListener('abort',onAbort);
    };
    const onMessage=(event:MessageEvent<EncoderReply>)=>{
      clean();
      if(event.data?.type==='error')reject(new Error('GIF encoder: '+(event.data.message||'Unknown error')));
      else resolve(event.data);
    };
    const onError=(event:ErrorEvent)=>{
      clean();reject(new Error('GIF worker failed: '+event.message));
    };
    const onAbort=()=>{clean();reject(new CaptureCancelled());};
    worker.addEventListener('message',onMessage);
    worker.addEventListener('error',onError);
    signal.addEventListener('abort',onAbort,{once:true});
    watchdog=setTimeout(()=>{
      clean();
      reject(new Error('GIF encoder stopped responding. Try 360p / 10 FPS, a shorter duration, or video instead.'));
    },60000);
    try{worker.postMessage(payload,transfer);}catch(error){clean();reject(error);}
  });
}

export async function captureAnimation(
  startingWorld:World,s:SimSettings,a:Appearance,options:CaptureOptions,
  onProgress:(progress:CaptureProgress)=>void,signal:AbortSignal
):Promise<CaptureResult>{
  const opt={...options,
    seconds:Math.min(600,Math.max(1,Number(options.seconds)||30)),
    fps:Math.min(30,Math.max(5,Number(options.fps)||10)),
    stepsPerSecond:Math.max(1,Math.min(120,Number(options.stepsPerSecond)||18))
  };
  const cursor=createCaptureCursor(opt.restart?createWorld(s):startingWorld,s,opt.fps,opt.stepsPerSecond);
  const [width,height]=recommendedDimensions(s,opt.resolution);
  const totalFrames=Math.ceil(opt.seconds*opt.fps);
  // Prevent mobile browser tab eviction on combinations likely to exhaust RAM.
  const budget=/iPhone|iPad|Android/i.test(navigator.userAgent)?110_000_000:350_000_000;
  if(opt.format==='gif'){
    if(opt.mode==='fixed'&&width*height*totalFrames>budget){
      throw new Error('GIF is too big for reliable encoding on this device. Try 360/480p, fewer seconds or lower FPS; use video for long HD clips.');
    }
  }
  const canvas=document.createElement('canvas');
  canvas.width=width;canvas.height=height;
  canvas.className='capture-preview-canvas';
  const host=document.getElementById('capture-canvas-mount');
  // Some WebKit capture implementations freeze detached/invisible canvases.
  // Keep the recording surface attached and actually painted during capture.
  if(host)host.appendChild(canvas);
  const ctx=canvas.getContext('2d',{willReadFrequently:opt.format==='gif'});
  if(!ctx){canvas.remove();throw new Error('Canvas drawing unavailable.');}
  const update=(phase:string,count:number)=>
    onProgress({phase,frames:count,seconds:count/opt.fps,fraction:Math.min(1,count/totalFrames)});
  let frames=0,distinctFrames=0,ended:CaptureResult['ended']='duration';
  try{
    if(opt.format==='gif'){
      const frameLimit=Math.min(totalFrames,Math.max(1,Math.floor(budget/(width*height))));
      const useWorker=typeof Worker!=='undefined'&&typeof window!=='undefined';
      const worker=useWorker ? new Worker(new URL('./gif.worker.ts',import.meta.url),{type:'module'}) : null;
      const gif=worker?null:GIFEncoder();
      let map:(pixels:Uint8ClampedArray)=>Uint8Array=()=>new Uint8Array();
      try{
        if(worker){
          update('Starting GIF encoder…',0);
          await roundTrip(worker,{type:'init',width,height,fps:opt.fps,repeat:opt.mode==='settled'?-1:0},[],signal);
        }
        for(let i=0;i<frameLimit;i++){
          notCancelled(signal);
          renderWorld(canvas,cursor.current,a,width,height);
          const pixels=ctx.getImageData(0,0,width,height).data;
          if(worker){
            await roundTrip(worker,{type:'frame',rgba:pixels.buffer},[pixels.buffer as ArrayBuffer],signal);
          }else if(gif){
            if(i===0){
              const colors=quantize(pixels,256,{format:'rgb565'});
              map=makePaletteIndex(colors);
              gif.writeFrame(map(pixels),width,height,{
                palette:colors,delay:Math.round(1000/opt.fps),repeat:opt.mode==='settled'?-1:0
              });
            }else gif.writeFrame(map(pixels),width,height,{delay:Math.round(1000/opt.fps)});
          }
          frames++;
          const transition=cursor.advance();
          if(transition.changed)distinctFrames++;
          update('Encoding animated GIF',frames);
          if(opt.mode==='settled'&&transition.settled){ended='settled';break;}
          if(i===frameLimit-1&&opt.mode==='settled')ended='limit';
          if(!worker)await delay(0);
        }
        notCancelled(signal);
        update('Finalizing & checking GIF…',frames);
        let bytes:Uint8Array;
        if(worker){
          const done=await roundTrip(worker,{type:'finish'},[],signal);
          bytes=new Uint8Array(done.buffer as ArrayBuffer);
        }else{
          gif!.finish();
          bytes=gif!.bytes();
        }
        const actual=countGifFrames(bytes);
        if(actual!==frames)throw new Error('GIF contained '+actual+' frames, expected '+frames+'. Export not saved.');
        const copy=new Uint8Array(bytes.length);
        copy.set(bytes);
        return {blob:new Blob([copy.buffer],{type:'image/gif'}),
          extension:'gif',frames,distinctFrames,elapsed:frames/opt.fps,ended};
      }finally{
        worker?.terminate();
      }
    }

    const mime=chooseVideoMime();
    if(!mime||typeof canvas.captureStream!=='function')
      throw new Error('This browser cannot record canvas video. GIF export is available instead.');
    // Let WebKit/Chromium see the canvas before capturing; do NOT resize it later.
    renderWorld(canvas,cursor.current,a,width,height);
    await nextPaint();
    notCancelled(signal);
    const stream=canvas.captureStream(opt.fps);
    const track=stream.getVideoTracks()[0] as (MediaStreamTrack & {requestFrame?:()=>void})|undefined;
    if(!track){stream.getTracks().forEach(t=>t.stop());throw new Error('No video track could be captured.');}
    const chunks:Blob[]=[];
    let recorder:MediaRecorder;
    try{
      recorder=new MediaRecorder(stream,{mimeType:mime,
        videoBitsPerSecond:opt.resolution>=2160?16_000_000:
          opt.resolution>=1080?8_000_000:opt.resolution>=720?4_000_000:2_000_000});
    }catch{
      stream.getTracks().forEach(t=>t.stop());
      throw new Error('Video encoder could not start at this resolution. Try 480p or 720p.');
    }
    let recordingError:Error|null=null;
    const finished=new Promise<void>(resolve=>{
      recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      recorder.onerror=()=>{recordingError=new Error('Video encoder reported an error.');};
      recorder.onstop=()=>resolve();
    });
    try{
      recorder.start(1000);
      const begin=performance.now(),stepMillis=1000/opt.fps;
      for(let i=0;i<totalFrames;i++){
        notCancelled(signal);
        renderWorld(canvas,cursor.current,a,width,height);
        // An animation frame lets the compositor publish the new canvas pixels;
        // optional requestFrame additionally nudges CanvasCaptureMediaStreamTrack.
        await nextPaint();
        if(track.requestFrame){
          try{track.requestFrame();}catch{ /* Automatic stream capture still runs */ }
        }
        frames++;
        const transition=cursor.advance();
        if(transition.changed)distinctFrames++;
        if(i%Math.max(1,Math.floor(opt.fps/3))===0)update('Recording video frames',frames);
        if(opt.mode==='settled'&&transition.settled){ended='settled';break;}
        if(i===totalFrames-1&&opt.mode==='settled')ended='limit';
        await delay(Math.max(0,begin+(i+1)*stepMillis-performance.now()));
      }
      if(!signal.aborted)await delay(Math.ceil(1000/opt.fps));
    }finally{
      if(recorder.state!=='inactive')recorder.stop();
      await finished;
      stream.getTracks().forEach(t=>t.stop());
    }
    notCancelled(signal);
    if(recordingError)throw recordingError;
    const blob=new Blob(chunks,{type:mime.split(';')[0]});
    if(blob.size<1000)throw new Error('Recorder produced an empty or nearly empty video. Try a smaller resolution.');
    update('Video ready for preview',frames);
    return {blob,extension:mime.includes('mp4')?'mp4':'webm',frames,
      distinctFrames,elapsed:frames/opt.fps,ended};
  }finally{
    canvas.remove();
  }
}
