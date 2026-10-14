import { GIFEncoder } from 'gifenc';
import {FixedWebMMuxer,offlineVideoCodec} from './fixed-webm.js';
import { indexGifFrame } from './gif-palette';
import { createWorld, stepWorld } from './sim';
import { renderWorld } from './render';
import { worldDimensions } from './types';
import { geometryExtent } from './topology';
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
  ended: 'duration' | 'settled' | 'limit' | 'size-limit';
  distinctFrames: number;
}

export class CaptureCancelled extends Error {
  constructor(){super('Recording cancelled');this.name='CaptureCancelled';}
}
export function recommendedDimensions(s:SimSettings,size:ExportResolution):[number,number]{
  const [w,h]=worldDimensions(s);
  // Preserve the ACTUAL cell grid ratio. The rendering canvas must never resize
  // after captureStream() has been called or some browsers lose the video track.
  let width=['landscape','landscape43','landscape54','landscape32'].includes(s.aspect) ? Math.round(size*(w/h)) : size;
  if(width%2)width++;
  const [gx,gy]=geometryExtent(s.lattice,w,h);
  let height=Math.round(width*(s.lattice==='rhombille'?gy/gx:h/w));
  if(height%2)height++;
  return [width,height];
}
export function cloneWorld(w:World):World{
  // Preserve every rule graph field, including directional mask. This clone
  // powers first-frame GIF/video capture before any simulated steps occur.
  return {...w,cells:w.cells.slice(),grains:w.grains?.slice(),hppWalls:w.hppWalls?.slice(),
    turmiteAgents:w.turmiteAgents?.map(a=>({...a})),ages:w.ages.slice(),neighbors:w.neighbors.slice(),
    events:w.events.slice(),traces:w.traces.slice(),
    previousCells:w.previousCells?.slice(),olderCells:w.olderCells?.slice(),
    fossils:w.fossils?.slice()};
}
export function equalGrains(a:Uint32Array,b:Uint32Array):boolean{
  if(a.length!==b.length)return false;
  for(let i=0;i<a.length;i++)if(a[i]!==b[i])return false;
  return true;
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
        const same=equalCells(current.cells,next.cells)&&
          (s.engine!=='turmites'||JSON.stringify(current.turmiteAgents)===JSON.stringify(next.turmiteAgents))&&
          (!next.grains||!!current.grains&&equalGrains(current.grains,next.grains));
        unchanged=same?unchanged+1:0;
        if(!same)changed=true;
        current=next;
      }
      cursor.current=current;
      // A stochastic forest may be quiet for three (or many!) updates and
      // then suddenly grow a tree or ignite via lightning. Never interpret
      // a transient lull as mathematical stabilization.
      const randomFuture=s.engine==='forestfire'&&(
        (s.forestGrowth>0&&current.cells.includes(0))||
        (s.forestLightning>0&&current.cells.includes(1)));
      // Metropolis at T>0 remains genuinely stochastic even if three whole
      // checkerboard sweeps happened not to flip a single spin.
      const thermalFuture=s.engine==='ising'&&s.isingTemperature>0;
      const cyclicFuture=s.engine==='cyclic'&&(s.cyclicDrive??0)>0;
      const waveFuture=(s.engine==='generations'||s.engine==='excitable')&&
        (s.waveStimulus==='clock'||s.waveStimulus==='sparks'&&(s.waveSparkRate??0)>0);
      return {settled:unchanged>=3&&!randomFuture&&!thermalFuture&&!cyclicFuture&&!waveFuture,changed};
    }
  };
  return cursor;
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

interface EncoderReply { type:'ready'|'frame-done'|'done'|'error'; message?:string; buffer?:ArrayBuffer; frames?:number; encodedBytes?:number; sizeLimitHit?:boolean }
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
  // Do NOT reject an export on width × height × frame count: this is raw
  // pixel work, NOT compressed GIF bytes. The Worker processes one frame at a
  // time and measures the ACTUAL output size. Stop gracefully with a usable
  // partial recording if the encoded file approaches a mobile memory limit.
  const maxGifBytes=/iPhone|iPad|Android/i.test(navigator.userAgent)
    ?96*1024*1024:256*1024*1024;
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
      const frameLimit=totalFrames;
      const useWorker=typeof Worker!=='undefined'&&typeof window!=='undefined';
      const worker=useWorker ? new Worker(new URL('./gif.worker.ts',import.meta.url),{type:'module'}) : null;
      const gif=worker?null:GIFEncoder();
      try{
        if(worker){
          update('Starting GIF encoder…',0);
          await roundTrip(worker,{type:'init',width,height,fps:opt.fps,repeat:opt.mode==='settled'?-1:0,maxBytes:maxGifBytes},[],signal);
        }
        for(let i=0;i<frameLimit;i++){
          notCancelled(signal);
          renderWorld(canvas,cursor.current,a,width,height);
          const pixels=ctx.getImageData(0,0,width,height).data;
          let reachedSizeLimit=false;
          if(worker){
            const response=await roundTrip(worker,{type:'frame',rgba:pixels.buffer},[pixels.buffer as ArrayBuffer],signal);
            reachedSizeLimit=!!response.sizeLimitHit;
          }else if(gif){
            // Match Worker behavior: later frames get LOCAL GIF palettes so
            // cycling colors can actually exist in the resulting file.
            const {indices,palette}=indexGifFrame(pixels,width,height);
            gif.writeFrame(indices,width,height,{
              palette,delay:Math.round(1000/opt.fps),
              ...(i===0?{repeat:opt.mode==='settled'?-1:0}:{})
            });
            if(i%6===5)reachedSizeLimit=gif.bytes().byteLength>=maxGifBytes;
          }
          frames++;
          const transition=cursor.advance();
          if(transition.changed)distinctFrames++;
          update(reachedSizeLimit?'Finishing at compressed GIF size limit':'Encoding animated GIF',frames);
          if(reachedSizeLimit){ended='size-limit';break;}
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

    // Preferred video path: render each discrete CA generation by FRAME INDEX,
    // not wall time. The encoder can take longer than playback without a hitch
    // in the resulting video's timestamps or skipping simulated states.
    const bitrate=opt.resolution>=2160?20_000_000:
      opt.resolution>=1080?10_000_000:opt.resolution>=720?5_000_000:2_500_000;
    const fixed=await offlineVideoCodec(width,height,opt.fps,bitrate);
    if(fixed){
      const Encoder=(globalThis as any).VideoEncoder;
      const Frame=(globalThis as any).VideoFrame;
      const mux=new FixedWebMMuxer(width,height,opt.fps,fixed.name);
      let encoderError:Error|null=null;
      const encoder=new Encoder({
        output:(chunk:any)=>{try{mux.addChunk(chunk);}catch(e){encoderError=e as Error;}},
        error:(e:Error)=>{encoderError=e;}
      });
      encoder.configure(fixed.config);
      try{
        for(let i=0;i<totalFrames;i++){
          notCancelled(signal);
          if(encoderError)throw encoderError;
          renderWorld(canvas,cursor.current,a,width,height);
          const frame=new Frame(canvas,{
            timestamp:Math.round(i*1e6/opt.fps),
            duration:Math.round(1e6/opt.fps)
          });
          encoder.encode(frame,{keyFrame:i===0||i%Math.max(1,Math.round(opt.fps*2))===0});
          frame.close();
          frames++;
          const transition=cursor.advance();
          if(transition.changed)distinctFrames++;
          if(opt.mode==='settled'&&transition.settled){ended='settled';break;}
          if(i===totalFrames-1&&opt.mode==='settled')ended='limit';
          while(encoder.encodeQueueSize>3){
            notCancelled(signal);
            if(encoderError)throw encoderError;
            await delay(15);
          }
          if(i%Math.max(1,Math.floor(opt.fps/2))===0||i===totalFrames-1)
            update('Frame-perfect WebM: drawing actual CA states',frames);
          await nextPaint();
        }
        notCancelled(signal);
        await encoder.flush();
        if(encoderError)throw encoderError;
        notCancelled(signal);
        const blob=mux.finish(frames);
        update('Frame-perfect WebM ready',frames);
        return {blob,extension:'webm',frames,
          distinctFrames,elapsed:frames/opt.fps,ended};
      }finally{
        if(encoder.state!=='closed')encoder.close();
      }
    }

    // Fallback for browsers without WebCodecs VP8/VP9. MediaRecorder captures
    // wall clock and can miss frames when simulation/rendering is slow.
    update('Offline WebM unsupported; using real-time recorder (may stutter)',0);
    const mime=chooseVideoMime();
    if(!mime||typeof canvas.captureStream!=='function')
      throw new Error('This browser cannot record canvas video. GIF export is available instead.');
    // Let WebKit/Chromium see the canvas before capturing; do NOT resize it later.
    renderWorld(canvas,cursor.current,a,width,height);
    await nextPaint();
    notCancelled(signal);
    // AUTOMATIC canvas capture is sufficient here. Do not call
    // requestFrame() on an already-automatic track: Safari may collect an
    // extra frame with an inconsistent timestamp.
    const stream=canvas.captureStream(opt.fps);
    const track=stream.getVideoTracks()[0];
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
      // On WebKit, MediaRecorder.start(1000) can flush/encode on the main
      // thread every second, freezing the canvas for ~0.7s and then rushing
      // through many late simulation frames. Collect the finished Blob once.
      recorder.start();
      const stepMillis=1000/opt.fps;
      let nextFrameAt=performance.now();
      for(let i=0;i<totalFrames;i++){
        notCancelled(signal);
        await delay(Math.max(0,nextFrameAt-performance.now()));
        notCancelled(signal);
        renderWorld(canvas,cursor.current,a,width,height);
        // Let the compositor publish painted canvas pixels. The MediaStream
        // already captures at opt.fps; don't request duplicate manual frames.
        await nextPaint();
        frames++;
        const transition=cursor.advance();
        if(transition.changed)distinctFrames++;
        if(i%Math.max(1,Math.floor(opt.fps/3))===0)update('Recording video frames',frames);
        if(opt.mode==='settled'&&transition.settled){ended='settled';break;}
        if(i===totalFrames-1&&opt.mode==='settled')ended='limit';
        // If the device is temporarily overloaded, discard the lateness
        // instead of doing a burst of catch-up paints a few ms apart.
        nextFrameAt=Math.max(nextFrameAt+stepMillis,performance.now()+stepMillis*0.5);
      }
      // Publish the final painted frame before stopping the stream.
      if(!signal.aborted)await delay(Math.ceil(stepMillis));
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
