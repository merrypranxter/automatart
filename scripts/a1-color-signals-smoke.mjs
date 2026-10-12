import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createCanvas} from '@napi-rs/canvas';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const outputs=[
 ['src/engine/color-signals.ts','scripts/.a1-signals.mjs'],
 ['src/engine/render.ts','scripts/.a1-render.mjs'],
 ['src/engine/types.ts','scripts/.a1-types.mjs'],
 ['src/engine/sim.ts','scripts/.a1-sim.mjs']
];
try{
 await Promise.all(outputs.map(([input,outfile])=>build({
   entryPoints:[input],outfile,platform:'node',bundle:true,format:'esm',target:'node22'
 })));
 const mod=async i=>import(pathToFileURL(resolve(outputs[i][1])).href);
 const {NEW_COLOR_SIGNALS,computeColorSignal,signalSample}=await mod(0);
 const {renderWorld}=await mod(1);
 const {INITIAL_SETTINGS,INITIAL_APPEARANCE}=await mod(2);
 const {createWorld,stepWorld}=await mod(3);
 globalThis.document={createElement:()=>createCanvas(1,1)};
 assert.equal(NEW_COLOR_SIGNALS.length,10,'Ten additional authentic signals');
 assert.equal(new Set(NEW_COLOR_SIGNALS.map(s=>s.id)).size,10,'All signals distinct IDs');
 const settings={...INITIAL_SETTINGS,engine:'cyclic',lattice:'square',
   cellCount:48,seed:72623,density:.72,cyclicThreshold:1,cyclicStates:12};
 let world=createWorld(settings);
 for(let i=0;i<8;i++)world=stepWorld(world,settings);
 const reference=world.cells.slice(),generation=world.generation;
 const appearance={...INITIAL_APPEARANCE,skin:'pixels',colorBy:'state',
   paletteCycle:.13,smoothPalette:true,showGrid:false};
 const hashes=new Set();
 for(const desc of NEW_COLOR_SIGNALS){
   const config={...appearance,colorBy:desc.id};
   const values=computeColorSignal(world,config);
   assert.equal(values?.length,world.cells.length,desc.id+' produces one value per cell');
   assert(values.every(v=>Number.isFinite(v)&&v>=0&&v<=1),
     desc.id+' normalized finite signal');
   assert.deepEqual(Array.from(computeColorSignal(world,config)),Array.from(values),
     desc.id+' deterministic replay');
   const canvas=createCanvas(1,1);
   renderWorld(canvas,world,config,320,320);
   assert.equal(canvas.width,320);
   assert.equal(canvas.height,320);
   const image=canvas.getContext('2d').getImageData(0,0,320,320).data;
   let hash=2166136261;
   for(let i=0;i<image.length;i+=17){hash^=image[i];hash=Math.imul(hash,16777619);}
   hashes.add(hash>>>0);
 }
 assert.equal(hashes.size,10,'All ten mathematical sources yield visually distinct renders');
 assert.deepEqual(world.cells,reference,'Color signals are VISUAL ONLY; never mutate CA');
 assert.equal(world.generation,generation,'No hidden advancement');
 // Exact local-neighborhood Shannon entropy / state contrast / diversity.
 const controlled={...world,wrap:false,neighborShape:'moore',width:32,height:32,
   cells:new Uint8Array(1024),ages:new Uint16Array(1024),
   events:new Uint8Array(1024),neighbors:new Uint8Array(1024),
   traces:new Float32Array(1024),previousCells:new Uint8Array(1024),
   olderCells:new Uint8Array(1024),fossils:new Float32Array(1024)};
 const center=16*32+16;
 const idle=computeColorSignal(controlled,{...appearance,colorBy:'entropy'});
 assert.equal(idle[center],0,'Uniform neighborhood has zero entropy');
 const adjacent=[center-33,center-32,center-31,center-1,center+1,center+31,center+32,center+33];
 adjacent.forEach((index,i)=>{controlled.cells[index]=i%4;});
 const mixed=computeColorSignal(controlled,{...appearance,colorBy:'entropy'});
 assert(mixed[center]>.55,'Mixed neighborhood entropy must be positive and substantial');
 assert(computeColorSignal(controlled,{...appearance,colorBy:'boundaries'})[center]>.6);
 assert(computeColorSignal(controlled,{...appearance,colorBy:'diversity'})[center]>.1);
 controlled.cells.fill(0);
 controlled.events[center]=1;controlled.ages[center]=1;controlled.cells[center]=1;
 assert.equal(computeColorSignal(controlled,{...appearance,colorBy:'birthFlash'})[center],1,
   'Newborn exact full-intensity flash');
 controlled.events[center]=2;controlled.cells[center]=0;controlled.fossils[center]=.5;
 assert.equal(computeColorSignal(controlled,{...appearance,colorBy:'deathHeat'})[center],1,
   'Death event drives maximum intensity');
 controlled.events[center]=0;
 assert(computeColorSignal(controlled,{...appearance,colorBy:'deathHeat'})[center]>.3,
   'Fossil history visible even with no new event');
 controlled.previousCells.fill(0);controlled.olderCells.fill(0);
 controlled.cells[center+1]=1;
 const flow=computeColorSignal(controlled,{...appearance,colorBy:'flow'})[center];
 assert(flow>.3&&flow<.9,'Directional flow inferred from eastern neighbor transition');
 const wave={...appearance,colorBy:'generationWave',signalFrequency:6};
 const image1=computeColorSignal(world,wave),image2=computeColorSignal({...world,generation:world.generation+17},wave);
 assert(image1.some((v,i)=>Math.abs(v-image2[i])>.1),
   'Wave animation changes only with integer generation');
 const angle={...appearance,colorBy:'angular',signalCenterX:.22,signalCenterY:.83};
 assert.notDeepEqual(Array.from(computeColorSignal(world,angle)),
   Array.from(computeColorSignal(world,{...angle,signalCenterX:.85})),
   'Angular rainbow moves with chosen center');
 const sample=signalSample(controlled,{...appearance,colorBy:'deathHeat'},16,16);
 assert(sample?.value!==null&&Number.isFinite(sample.value),'Inspector exposes numeric cell value');
 for(const lattice of ['hex','triangle']){
   const setup={...settings,lattice};
   const w=createWorld(setup);
   for(const desc of NEW_COLOR_SIGNALS){
     const pixels=computeColorSignal(w,{...appearance,colorBy:desc.id});
     assert.equal(pixels.length,w.cells.length,lattice+' '+desc.id+' covers valid cells');
     assert(pixels.every(v=>Number.isFinite(v)),lattice+' '+desc.id+' stable on polygon neighbors');
   }
 }
 console.log('PASS: ten distinct cell color signals, local entropy/diversity/edge math, death/birth histories, directional flow');
 console.log('PASS: three lattice geometries, world immutability, generation-stable coloring, 320px renderer and live inspector');
}finally{
 await Promise.all(outputs.map(([,file])=>unlink(resolve(file)).catch(()=>{})));
}
