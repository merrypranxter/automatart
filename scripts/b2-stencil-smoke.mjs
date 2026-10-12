import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const files=[
 ['src/engine/stencil.ts','scripts/.b2-stencil.mjs'],
 ['src/engine/neighborhood.ts','scripts/.b2-neighborhood.mjs'],
 ['src/engine/topology.ts','scripts/.b2-topology.mjs'],
 ['src/engine/types.ts','scripts/.b2-types.mjs'],
 ['src/engine/sim.ts','scripts/.b2-sim.mjs'],
 ['src/engine/color-signals.ts','scripts/.b2-color.mjs'],
 ['src/engine/capture.ts','scripts/.b2-capture.mjs'],
 ['src/engine/mutation-automatart.ts','scripts/.b2-mutation.mjs']
];
try{
 await Promise.all(files.map(([entry,outfile])=>build({
  entryPoints:[entry],outfile,bundle:true,format:'esm',platform:'node',target:'node22'
 })));
 const mod=async i=>import(pathToFileURL(resolve(files[i][1])).href);
 const {allowedStencilMask,DEFAULT_STENCIL_MASK,STENCIL_CENTER_BIT,stencilBit,
  validStencil,clipStencil,countStencil,stencilOffsets,toggleStencil,
  resizeStencil,rotateStencil,mirrorStencil,invertStencil,stencilPreset,seededStencil}=await mod(0);
 const {maxNeighborCount,validNeighborhoodSettings,normalizeActiveVotes}=await mod(1);
 const {neighborOffsets}=await mod(2);
 const {INITIAL_SETTINGS,INITIAL_APPEARANCE}=await mod(3);
 const {createWorld,stepWorld}=await mod(4);
 const {computeColorSignal}=await mod(5);
 const {cloneWorld}=await mod(6);
 const {mutateAutomatart}=await mod(7);
 const sizes=[3,5];
 for(const size of sizes){
  const allowed=allowedStencilMask(size);
  assert.equal(countStencil(allowed,size),size*size-1,'Center never votes');
  assert.equal(allowed&(1<<STENCIL_CENTER_BIT),0,'Center excluded');
  assert(validStencil(allowed,size));
  assert(!validStencil(allowed|(1<<STENCIL_CENTER_BIT),size));
  assert(!validStencil(0,size));
  assert(!validStencil(allowed,-2));
  if(size===3)assert.equal(countStencil(allowed,3),8);
  if(size===5)assert.equal(countStencil(allowed,5),24);
  assert.equal(stencilOffsets(allowed,size).length,size*size-1);
  assert.equal(new Set(stencilOffsets(allowed,size).map(([x,y])=>x+','+y)).size,size*size-1);
  for(const name of ['fan','hook','ring','claw']){
   const mask=stencilPreset(name,size);
   assert(validStencil(mask,size),'Valid '+name+' preset');
   assert.equal(rotateStencil(rotateStencil(rotateStencil(rotateStencil(mask,size),size),size),size),mask);
   assert.equal(mirrorStencil(mirrorStencil(mask,size),size),mask);
   assert.equal(rotateStencil(mask,size,false),rotateStencil(rotateStencil(rotateStencil(mask,size),size),size));
  }
  for(const seed of [1,9876,4294967295]){
   assert.equal(seededStencil(seed,size),seededStencil(seed,size));
   assert(validStencil(seededStencil(seed,size),size));
  }
  assert(validStencil(invertStencil(1<<stencilBit(0,-1),size),size));
  assert.equal(toggleStencil(1<<stencilBit(0,-1),size,STENCIL_CENTER_BIT,true),1<<stencilBit(0,-1));
  assert.equal(toggleStencil(1<<stencilBit(0,-1),size,stencilBit(0,-1),false),1<<stencilBit(0,-1),
   'Last voter cannot be deleted');
 }
 assert.equal(DEFAULT_STENCIL_MASK,allowedStencilMask(3));
 assert.equal(clipStencil(allowedStencilMask(5),3),DEFAULT_STENCIL_MASK);
 assert.equal(resizeStencil(1<<stencilBit(-2,-2),3),DEFAULT_STENCIL_MASK,
  'Shrinking a stencil never leaves zero voters');
 const base={...INITIAL_SETTINGS,engine:'life',lifeRule:'custom',customBirth:[1],
  customSurvive:[],cellCount:32,density:0,seed:4999,wrap:false,
  neighborShape:'custom',customStencilSize:5,customStencilMask:1<<stencilBit(0,-2)};
 assert(validNeighborhoodSettings(base));
 assert.equal(maxNeighborCount(base),1);
 assert.equal(neighborOffsets('square',15,15,'custom',255,base.customStencilMask,5).length,1);
 const w=createWorld(base),index=16*32+16;
 w.cells.fill(0);w.cells[14*32+16]=1; // only north at distance 2
 const yes=stepWorld(w,base);
 assert.equal(yes.neighbors[index],1);
 assert.equal(yes.cells[index],1,'North radius-2 cell genuinely causes B1 birth');
 const east={...base,customStencilMask:1<<stencilBit(1,0)};
 assert.equal(stepWorld(w,east).neighbors[index],0);
 assert.equal(stepWorld(w,east).cells[index],0,
  'Changing ONE stencil bit changes the transition, not the color only');
 const wrapped={...base,wrap:true};
 const edge=createWorld(wrapped);edge.cells.fill(0);
 edge.cells[30*32]=1;
 assert.equal(stepWorld(edge,wrapped).neighbors[0],1,'Custom stencil wraps top to bottom');
 assert.equal(stepWorld(edge,{...wrapped,wrap:false}).neighbors[0],0);
 assert(!validNeighborhoodSettings({...base,lattice:'hex'}));
 assert(!validNeighborhoodSettings({...base,engine:'margolus'}));
 assert(!validNeighborhoodSettings({...base,customStencilMask:1<<12}));
 assert(!validNeighborhoodSettings({...base,customStencilSize:3,customStencilMask:1<<0}));
 const narrow=normalizeActiveVotes({...base,engine:'cyclic',cyclicThreshold:22});
 assert.equal(narrow.cyclicThreshold,1);
 assert.equal(narrow.speciesBirth,base.speciesBirth,'Inactive Species War preserved');
 const sampleWorld=createWorld({...base,customStencilMask:1<<stencilBit(0,-1)});
 sampleWorld.cells.fill(0);sampleWorld.cells[16*32+17]=1;
 const color={...INITIAL_APPEARANCE,colorBy:'boundaries'};
 assert.equal(computeColorSignal(sampleWorld,color,'boundaries')[index],0);
 sampleWorld.customStencilMask=1<<stencilBit(1,0);
 assert.equal(computeColorSignal(sampleWorld,color,'boundaries')[index],1);
 const clone=cloneWorld(sampleWorld);
 assert.equal(clone.customStencilMask,sampleWorld.customStencilMask);
 assert.equal(clone.customStencilSize,5);
 assert.equal(computeColorSignal(clone,color,'boundaries')[index],1,
  'GIF first frame uses real custom stencil');
 for(const engine of ['life','brians','cyclic','generations','excitable','species']){
  const sim={...base,engine,seed:916};
  assert(validNeighborhoodSettings(sim));
  assert.deepEqual(stepWorld(createWorld(sim),sim).cells,
   stepWorld(createWorld(sim),sim).cells,'Same seed deterministic '+engine);
 }
 const visualOnly={strength:'wtf',locks:{palette:true,rule:true,engine:true,seed:true},allowRestart:false};
 const locked=mutateAutomatart(base,INITIAL_APPEARANCE,visualOnly,19);
 assert.equal(locked.settings.customStencilMask,base.customStencilMask,'Rule lock protects stencil');
 assert.equal(locked.settings.customStencilSize,5,'Rule lock protects stencil size');
 const mutatedA=mutateAutomatart(base,INITIAL_APPEARANCE,
  {...visualOnly,locks:{...visualOnly.locks,rule:false}},283);
 const mutatedB=mutateAutomatart(base,INITIAL_APPEARANCE,
  {...visualOnly,locks:{...visualOnly.locks,rule:false}},283);
 assert.deepEqual(mutatedA.settings,mutatedB.settings);
 assert.equal(mutatedA.willRestart,false,'Changing stencils must not reset the world');
 console.log('PASS: 3×3/5×5 exact bit masks, symmetries, four presets, deterministic surprises');
 console.log('PASS: actual one-bit CA births, wrap, engine compatibility, colors and GIF clone parity');
 console.log('PASS: rule locks, seeded mutation, no-world-reset and center exclusion');
}finally{
 await Promise.all(files.map(([,p])=>unlink(resolve(p)).catch(()=>{})));
}
