// Frame-local GIF color quantization.
// Important: a single palette based on frame 0 cannot represent later
// palette-cycle colors. GIF89a supports a separate <=256-color table in each
// image descriptor, so sample/quantize EACH frame, never just the first one.
import { quantize } from 'gifenc';

export interface IndexedGifFrame {
  palette: number[][];
  indices: Uint8Array;
}

function stratifiedSample(rgba:Uint8ClampedArray, width:number,height:number):Uint8ClampedArray{
  // A bounded, evenly distributed source sample drastically reduces the cost
  // of recomputing a local palette for each frame on mobile. Pixel indexing
  // still considers every pixel via a cached RGB565 nearest-color lookup.
  const budget=24576;
  if(width*height<=budget)return rgba;
  const step=Math.max(2,Math.ceil(Math.sqrt(width*height/budget)));
  const nx=Math.ceil(width/step),ny=Math.ceil(height/step);
  const picked=new Uint8ClampedArray(nx*ny*4);
  let offset=0;
  for(let y=0;y<height;y+=step){
    for(let x=0;x<width;x+=step){
      const ix=(y*width+x)*4;
      picked[offset++]=rgba[ix];
      picked[offset++]=rgba[ix+1];
      picked[offset++]=rgba[ix+2];
      picked[offset++]=255;
    }
  }
  return picked.subarray(0,offset);
}

export function indexGifFrame(rgba:Uint8ClampedArray,width:number,height:number):IndexedGifFrame{
  if(rgba.length!==width*height*4)throw Error('GIF palette dimensions do not match pixels');
  const sample=stratifiedSample(rgba,width,height);
  const palette=quantize(sample,256,{format:'rgb565'});
  if(!palette.length)throw Error('Unable to build GIF color table');
  // Fresh lookup for EVERY frame: a cached palette from any earlier frame
  // would permanently bias colors back toward that frame.
  const lut=new Uint16Array(65536);lut.fill(0xffff);
  const indices=new Uint8Array(width*height);
  for(let p=0,i=0;p<rgba.length;p+=4,i++){
    const r=rgba[p],g=rgba[p+1],b=rgba[p+2];
    const key=((r>>3)<<11)|((g>>2)<<5)|(b>>3);
    let winner=lut[key];
    if(winner===0xffff){
      let best=Infinity,bestIndex=0;
      for(let k=0;k<palette.length;k++){
        const col=palette[k],dr=r-col[0],dg=g-col[1],db=b-col[2];
        const distance=dr*dr*.9+dg*dg*1.4+db*db*.9;
        if(distance<best){best=distance;bestIndex=k;}
      }
      winner=bestIndex;lut[key]=winner;
    }
    indices[i]=winner;
  }
  return {palette,indices};
}
