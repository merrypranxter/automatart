// Worker-side GIF encoding. Main thread renders one frame at a time while
// this worker quantizes, maps and compresses it. One-frame backpressure prevents
// an iPhone from queuing hundreds of full-resolution ImageData buffers.
import { GIFEncoder, quantize } from 'gifenc';

type Request =
  | { type:'init'; width:number; height:number; fps:number; repeat:number; maxBytes:number }
  | { type:'frame'; rgba:ArrayBuffer }
  | { type:'finish' };
const ctx=self as unknown as { onmessage:((event:MessageEvent<Request>)=>void)|null; postMessage:(data:unknown,transfer?:Transferable[])=>void };

let encoder:ReturnType<typeof GIFEncoder>|null=null;
let width=0,height=0,delay=100,repeat=0,frames=0,maxBytes=96*1024*1024;
let palette:number[][]|null=null;
let paletteLookup:((pixels:Uint8ClampedArray)=>Uint8Array)|null=null;

function makePaletteLookup(colors:number[][]){
  // Cache RGB565 source -> palette index. O(1) for common colors / glows.
  const cache=new Uint16Array(65536);
  cache.fill(0xffff);
  return (rgba:Uint8ClampedArray):Uint8Array=>{
    const result=new Uint8Array(rgba.length/4);
    for(let i=0,j=0;i<rgba.length;i+=4,j++){
      const r=rgba[i],g=rgba[i+1],b=rgba[i+2];
      const key=((r>>3)<<11)|((g>>2)<<5)|(b>>3);
      let winner=cache[key];
      if(winner===0xffff){
        let bestDistance=Infinity;
        for(let c=0;c<colors.length;c++){
          const color=colors[c],dr=r-color[0],dg=g-color[1],db=b-color[2];
          const distance=0.9*dr*dr+1.4*dg*dg+0.9*db*db;
          if(distance<bestDistance){bestDistance=distance;winner=c;}
        }
        cache[key]=winner;
      }
      result[j]=winner;
    }
    return result;
  };
}

ctx.onmessage=(event:MessageEvent<Request>)=>{
  try{
    const msg=event.data;
    if(msg.type==='init'){
      width=msg.width;height=msg.height;
      delay=Math.round(1000/msg.fps);repeat=msg.repeat;maxBytes=msg.maxBytes;
      encoder=GIFEncoder();frames=0;palette=null;paletteLookup=null;
      ctx.postMessage({type:'ready'});return;
    }
    if(!encoder)throw Error('GIF worker was not initialized.');
    if(msg.type==='frame'){
      const pixels=new Uint8ClampedArray(msg.rgba);
      if(pixels.length!==width*height*4)throw Error('GIF frame dimensions are inconsistent.');
      if(!palette){
        palette=quantize(pixels,256,{format:'rgb565'});
        paletteLookup=makePaletteLookup(palette);
      }
      const indices=paletteLookup!(pixels);
      if(frames===0)encoder.writeFrame(indices,width,height,{palette,delay,repeat});
      else encoder.writeFrame(indices,width,height,{delay});
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
      encoder=null;palette=null;paletteLookup=null;
    }
  }catch(e){
    ctx.postMessage({type:'error',message:e instanceof Error?e.message:String(e)});
  }
};
