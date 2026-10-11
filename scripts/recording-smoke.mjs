// Real animated-GIF smoke test: runs the production export path with a
// Node canvas, parses the result and checks that decoded frames actually vary.
import { build } from 'esbuild';
import { createCanvas } from '@napi-rs/canvas';
import gifuct from 'gifuct-js';
import { unlink } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const outfile=resolve('scripts/.capture-smoke-bundle.mjs');
try {
  await build({entryPoints:['src/engine/capture.ts'],outfile,platform:'node',
    target:'node22',format:'esm',bundle:true});
  const {captureAnimation,countGifFrames,createCaptureCursor}=await import(pathToFileURL(outfile).href);
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{userAgent:'Node smoke test'}});
  globalThis.document={
    createElement(kind){
      assert.equal(kind,'canvas');
      const canvas=createCanvas(1,1);
      canvas.remove=()=>{};
      return canvas;
    },
    getElementById(){return null;}
  };

  const settings={
    engine:'cyclic',lifeRule:'conway',cellCount:32,aspect:'square',
    seed:82641,density:0.45,wrap:true,pattern:'noise',
    cyclicStates:12,cyclicThreshold:1,wolframRule:30
  };
  const appearance={
    palette:['#ff24b9','#fdf428','#13f8d8','#7b30fa','#ff7527','#169dff'],
    colorBy:'state',skin:'pixels',showGrid:false,trails:true
  };
  const n=32*32;
  const cells=new Uint8Array(n);
  for(let i=0;i<n;i++) cells[i]=(i*103+Math.floor(i/32)*17)%12;
  const world={
    engine:'cyclic',width:32,height:32,generation:0,cells,
    ages:new Uint16Array(n).fill(1),neighbors:new Uint8Array(n),
    events:new Uint8Array(n),traces:new Float32Array(n).fill(1)
  };
  const cursor=createCaptureCursor(world,settings,5,18);
  const before=cursor.current.cells.slice();
  const advance=cursor.advance();
  assert(advance.changed,'The simulation should evolve between frames');
  assert.notDeepEqual([...cursor.current.cells],[...before],'Cursor changes its cells');

  const ctrl=new AbortController();
  const result=await captureAnimation(world,settings,appearance,
    {format:'gif',mode:'fixed',seconds:2,fps:5,resolution:360,
      restart:false,stepsPerSecond:18},
    ()=>{},ctrl.signal);
  const data=new Uint8Array(await result.blob.arrayBuffer());
  assert.equal(result.frames,10,'Expected ten frames in recording');
  assert.equal(countGifFrames(data),10,'Actual GIF byte stream should contain ten image frames');
  assert(result.distinctFrames>0,'Simulation must change in a dynamic test');
  const parseGIF=gifuct.parseGIF??gifuct.default?.parseGIF;
  const decompressFrames=gifuct.decompressFrames??gifuct.default?.decompressFrames;
  assert(parseGIF&&decompressFrames,'GIF parser available');
  const decoded=decompressFrames(parseGIF(data.buffer),true);
  assert.equal(decoded.length,10,'Third-party GIF decoder detects all frames');
  const first=decoded[0].patch;
  const differs=decoded.slice(1).some(f=>{
    if(f.patch.length!==first.length)return true;
    for(let j=0;j<first.length;j+=16){if(f.patch[j]!==first[j]||f.patch[j+1]!==first[j+1])return true;}
    return false;
  });
  assert(differs,'GIF pixels must actually vary; a multi-frame frozen GIF is a failure');
  console.log('PASS: animated GIF '+data.byteLength+' bytes / '+decoded.length+' different frames / '+result.distinctFrames+' changing simulation steps');
} finally {
  await unlink(outfile).catch(()=>{});
}
