// Worker-side GIF encoding. Main thread renders one frame at a time while
// this worker quantizes, maps and compresses it. One-frame backpressure prevents
// an iPhone from queuing hundreds of full-resolution ImageData buffers.
import { GIFEncoder } from 'gifenc';
import { indexGifFrame } from './gif-palette';

type Request =
  | { type:'init'; width:number; height:number; fps:number; repeat:number; maxBytes:number }
  | { type:'frame'; rgba:ArrayBuffer }
  | { type:'finish' };
const ctx=self as unknown as { onmessage:((event:MessageEvent<Request>)=>void)|null; postMessage:(data:unknown,transfer?:Transferable[])=>void };

let encoder:ReturnType<typeof GIFEncoder>|null=null;
let width=0,height=0,delay=100,repeat=0,frames=0,maxBytes=96*1024*1024;
ctx.onmessage=(event:MessageEvent<Request>)=>{
  try{
    const msg=event.data;
    if(msg.type==='init'){
      width=msg.width;height=msg.height;
      delay=Math.round(1000/msg.fps);repeat=msg.repeat;maxBytes=msg.maxBytes;
      encoder=GIFEncoder();frames=0;
      ctx.postMessage({type:'ready'});return;
    }
    if(!encoder)throw Error('GIF worker was not initialized.');
    if(msg.type==='frame'){
      const pixels=new Uint8ClampedArray(msg.rgba);
      if(pixels.length!==width*height*4)throw Error('GIF frame dimensions are inconsistent.');
      // A new palette for every frame preserves hue shifts from live color
      // cycling. gifenc writes a GIF89a local color table on later frames.
      const {indices,palette}=indexGifFrame(pixels,width,height);
      encoder.writeFrame(indices,width,height,{
        palette,delay,...(frames===0?{repeat}:{})
      });
      frames++;
      // GIF compression runs in this Worker. The old width*height*frames
      // estimate wildly overcounted final file size and rejected good exports.
      // Inspect the actual compressed byte stream instead, occasionally,
      // keeping memory bounded without throwing away usable partial results.
      const encodedBytes=frames%6===0?encoder.bytes().byteLength:0;
      const sizeLimitHit=encodedBytes>=maxBytes;
      ctx.postMessage({type:'frame-done',frames,encodedBytes,sizeLimitHit});
      return;
    }
    if(msg.type==='finish'){
      encoder.finish();
      const bytes=encoder.bytes();
      const out=new Uint8Array(bytes.length);
      out.set(bytes);
      ctx.postMessage({type:'done',buffer:out.buffer,frames},[out.buffer]);
      encoder=null;
    }
  }catch(e){
    ctx.postMessage({type:'error',message:e instanceof Error?e.message:String(e)});
  }
};
