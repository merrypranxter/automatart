// Regression: animated GIF must preserve changing colors, not only changing shapes.
// Decode finished GIF frames and compare their pixel RGB with the actual
// renderWorld output for a stable automaton whose PALETTE changes over time.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createCanvas } from '@napi-rs/canvas';
import gifenc from 'gifenc';
const { GIFEncoder } = gifenc;
import gifuct from 'gifuct-js';
import { unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const fn=resolve('scripts/.gif-color-cycle.mjs');
const capPath=resolve('scripts/.gif-color-capture.mjs');
const renderPath=resolve('scripts/.gif-color-render.mjs');
const parseGIF=gifuct.parseGIF??gifuct.default?.parseGIF;
const decompressFrames=gifuct.decompressFrames??gifuct.default?.decompressFrames;
assert(parseGIF&&decompressFrames,'GIF parser available');
const rgba=(r,g,b,a=255)=>[r,g,b,a];
const samplePixel=(pixels,w,x,y)=>Array.from(pixels.slice((y*w+x)*4,(y*w+x)*4+3));
const error=(a,b)=>Math.max(...a.map((v,i)=>Math.abs(v-b[i])));

try {
  await Promise.all([
    build({entryPoints:['src/engine/gif-palette.ts'],outfile:fn,platform:'node',bundle:true,format:'esm',target:'node22'}),
    build({entryPoints:['src/engine/capture.ts'],outfile:capPath,platform:'node',bundle:true,format:'esm',target:'node22'}),
    build({entryPoints:['src/engine/render.ts'],outfile:renderPath,platform:'node',bundle:true,format:'esm',target:'node22'})
  ]);
  const {indexGifFrame}=await import(pathToFileURL(fn).href);
  const {captureAnimation,createCaptureCursor,countGifFrames}=await import(pathToFileURL(capPath).href);
  const {renderWorld}=await import(pathToFileURL(renderPath).href);
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{userAgent:'Node smoke test'}});
  globalThis.document={createElement(type){assert.equal(type,'canvas');const canvas=createCanvas(1,1);canvas.remove=()=>{};return canvas;},getElementById(){return null;}};
  // Test individual indexed frames with fully different dominant colors,
  // including a long-lived dark backdrop, to expose global palette reuse.
  const w=96,h=64;
  const accents=[[255,0,225],[0,250,155],[0,178,255],[255,229,0]];
  const gif=GIFEncoder();
  for(let f=0;f<accents.length;f++){
    const data=new Uint8ClampedArray(w*h*4);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const p=(y*w+x)*4;
      const c=x<w/3?rgba(9,6,23):x<2*w/3?rgba(...accents[f]):rgba(250,250,250);
      data.set(c,p);
    }
    const {indices,palette}=indexGifFrame(data,w,h);
    gif.writeFrame(indices,w,h,{palette,delay:100,...(f===0?{repeat:0}:{})});
  }
  gif.finish();
  const bytes=gif.bytes();
  assert.equal(countGifFrames(bytes),accents.length,'Animated GIF has expected frame count');
  const decoded=decompressFrames(parseGIF(bytes.buffer),true);
  for(let f=0;f<accents.length;f++){
    const actual=samplePixel(decoded[f].patch,w,48,32);
    assert(error(actual,accents[f])<=18,
      'Frame '+f+' was forced to the wrong global palette. Expected '+accents[f]+', decoded '+actual);
  }

  // End-to-end recording: same CA state evolves in time with paletteCycle=1.
  // The GIF must match renderWorld(current world, appearance) at each step.
  const settings={
    engine:'life',lifeRule:'custom',cellCount:32,aspect:'square',
    seed:7123,density:.65,wrap:true,pattern:'noise',neighborShape:'moore',
    lattice:'square',customBirth:[],customSurvive:[0,1,2,3,4,5,6,7,8],
    trailDecay:.89,cyclicStates:12,cyclicThreshold:2,wolframRule:30
  };
  const n=32*32;
  const cells=new Uint8Array(n);
  for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(x>=8&&x<24&&y>=8&&y<24)cells[y*32+x]=1;
  const world={engine:'life',lattice:'square',width:32,height:32,generation:0,cells,
    ages:new Uint16Array(n).fill(1),neighbors:new Uint8Array(n),
    events:new Uint8Array(n),traces:new Float32Array(n).fill(1)};
  const appearance={
    palette:['#ff00cc','#00ff66','#0055ff','#ffe600','#9d00ff','#00f5ff'],
    colorBy:'state',skin:'pixels',showGrid:false,trails:false,
    paletteOffset:0,paletteCycle:1,paletteReverse:false,smoothPalette:false,
    saturation:1,contrast:1,brightness:1,glowStrength:0
  };
  const ctrl=new AbortController();
  const result=await captureAnimation(world,settings,appearance,
    {format:'gif',mode:'fixed',seconds:1,fps:5,resolution:360,
      restart:false,stepsPerSecond:5},()=>{},ctrl.signal);
  const gifData=new Uint8Array(await result.blob.arrayBuffer());
  assert.equal(countGifFrames(gifData),5);
  const actualFrames=decompressFrames(parseGIF(gifData.buffer),true);
  const cursor=createCaptureCursor(world,settings,5,5);
  const previewCanvas=createCanvas(1,1);
  const samples=[];
  for(let f=0;f<result.frames;f++){
    renderWorld(previewCanvas,cursor.current,appearance,360,360);
    const expected=samplePixel(previewCanvas.getContext('2d').getImageData(0,0,360,360).data,360,180,180);
    const actual=samplePixel(actualFrames[f].patch,360,180,180);
    assert(error(actual,expected)<=24,
      'Frame '+f+' lost palette cycling! live render '+expected+' vs decoded GIF '+actual);
    samples.push(actual.join(','));
    cursor.advance();
  }
  assert(new Set(samples).size>=4,'Recorded GIF should contain multiple distinct cycle colors');
  console.log('PASS: Four per-frame palette tables preserved distinct magenta/cyan/green/yellow output');
  console.log('PASS: Actual 5-frame GIF export reproduces changing live CA colors '+samples.join(' → '));
}finally{
  await Promise.all([unlink(fn).catch(()=>{}),unlink(capPath).catch(()=>{}),unlink(renderPath).catch(()=>{})]);
}
