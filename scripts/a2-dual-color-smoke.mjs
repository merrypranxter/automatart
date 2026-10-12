import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createCanvas} from '@napi-rs/canvas';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const mods=[
  ['src/engine/dual-color.ts','scripts/.a2-dual.mjs'],
  ['src/engine/render.ts','scripts/.a2-render.mjs'],
  ['src/engine/types.ts','scripts/.a2-types.mjs'],
  ['src/engine/sim.ts','scripts/.a2-sim.mjs']
];
try{
 await Promise.all(mods.map(([entry,outfile])=>build({
   entryPoints:[entry],outfile,platform:'node',bundle:true,format:'esm',target:'node22'
 })));
 const load=async i=>import(pathToFileURL(resolve(mods[i][1])).href);
 const {
   INITIAL_DUAL_COLOR,COLOR_SOURCES,validateDualColor,swapDualColor,createDualSampler
 }=await load(0);
 const {renderWorld}=await load(1);
 const {INITIAL_SETTINGS,INITIAL_APPEARANCE}=await load(2);
 const {createWorld,stepWorld}=await load(3);
 globalThis.document={createElement:()=>createCanvas(1,1)};
 assert.equal(COLOR_SOURCES.length,17,'A2 includes all 7 classics and all 10 A1 mappings');
 const d=validateDualColor(undefined);
 assert.equal(d.enabled,false,'Legacy recipes opt out by default');
 const junk=validateDualColor({
  enabled:true,sourceA:'bad',sourceB:'entropy',blend:4,offsetA:-999,
  strengthB:999,invertB:true
 });
 assert.equal(junk.sourceA,'state');assert.equal(junk.blend,1);
 assert.equal(junk.offsetA,-32);assert.equal(junk.strengthB,3);assert(junk.invertB);
 const original=validateDualColor({...INITIAL_DUAL_COLOR,enabled:true,
  sourceA:'entropy',sourceB:'age',blend:.23,
  invertA:true,offsetA:2,strengthB:.65});
 const swapTwice=swapDualColor(swapDualColor(original));
 assert(Math.abs(swapTwice.blend-original.blend)<1e-12,
   'Swapping twice restores the blend ratio numerically');
 assert.deepEqual({...swapTwice,blend:original.blend},original,
   'Swapping twice restores all source-specific settings');
 const s={...INITIAL_SETTINGS,engine:'cyclic',cellCount:48,
  cyclicStates:12,density:.71,cyclicThreshold:1,seed:34813};
 let w=createWorld(s);
 for(let i=0;i<7;i++)w=stepWorld(w,s);
 const before=w.cells.slice(),generation=w.generation;
 const appearance={...INITIAL_APPEARANCE,skin:'pixels',trails:false,showGrid:false,
  temporalRGB:0,fossilOpacity:0,paletteCycle:.18,smoothPalette:true,
  saturation:1,contrast:1,brightness:1};
 const pixels=(world,a,size=252)=>{
  const canvas=createCanvas(1,1);renderWorld(canvas,world,a,size,size);
  return Buffer.from(canvas.getContext('2d').getImageData(0,0,size,size).data);
 };
 for(const lattice of ['square','hex','triangle']){
  const sw={...s,lattice};
  let world=createWorld(sw);
  for(let k=0;k<5;k++)world=stepWorld(world,sw);
  for(const [sourceA,sourceB] of [
    ['state','entropy'],['age','boundaries'],['generationWave','angular'],
    ['birthFlash','deathHeat'],['x','radius']
  ]){
   const sourceConfig={...appearance,dualColor:undefined};
   const d0={...INITIAL_DUAL_COLOR,enabled:true,sourceA,sourceB,blend:0};
   const d1={...d0,blend:1};
   const a=pixels(world,{...sourceConfig,colorBy:sourceA});
   const b=pixels(world,{...sourceConfig,colorBy:sourceB});
   assert.deepEqual(pixels(world,{...sourceConfig,dualColor:d0}),a,
    lattice+' blend=0 should reproduce EXACT standalone '+sourceA);
   assert.deepEqual(pixels(world,{...sourceConfig,dualColor:d1}),b,
    lattice+' blend=1 should reproduce EXACT standalone '+sourceB);
   assert.notDeepEqual(a,b,lattice+' selected sources are visually distinguishable');
   const middle=pixels(world,{...sourceConfig,dualColor:{...d0,blend:.47}});
   assert.notDeepEqual(middle,a,lattice+' mix differs from A');
   assert.notDeepEqual(middle,b,lattice+' mix differs from B');
  }
 }
 const normal=validateDualColor({...INITIAL_DUAL_COLOR,enabled:true,sourceA:'age',sourceB:'entropy'});
 const base={...appearance,dualColor:normal};
 const c1=pixels(w,base);
 const c2=pixels(w,{...base,dualColor:{...normal,offsetA:5}});
 const c3=pixels(w,{...base,dualColor:{...normal,strengthB:2.2}});
 const c4=pixels(w,{...base,dualColor:{...normal,invertA:true}});
 assert.notDeepEqual(c1,c2,'A palette offset must actually change pixels');
 assert.notDeepEqual(c1,c3,'B signal strength must actually change pixels');
 assert.notDeepEqual(c1,c4,'A inversion must actually change pixels');
 const rgb=a=>a.palette.map(v=>[
  parseInt(v.slice(1,3),16),parseInt(v.slice(3,5),16),parseInt(v.slice(5,7),16)
 ]);
 const probe=createDualSampler(w,base,rgb(appearance)).sample(101);
 assert(Number.isFinite(probe.a)&&Number.isFinite(probe.b));
 assert(probe.result.length===3&&probe.result.every(Number.isFinite));
 // Special mercury material uses genuine dual inputs too.
 const mercury={...base,skin:'mercury',dualColor:{...normal,sourceA:'state',sourceB:'entropy',blend:0}};
 const mercuryA=pixels(w,{...mercury,dualColor:undefined,colorBy:'state'});
 assert.deepEqual(pixels(w,mercury),mercuryA,
  'Mercury/relief skin must preserve exact blend A endpoint');
 const mercuryB=pixels(w,{...mercury,dualColor:{...mercury.dualColor,blend:1}});
 assert.notDeepEqual(mercuryA,mercuryB,'Dual sources must affect mercury material');
 // Print Shop pipeline still acts on the combined color for exports.
 const print={...appearance.print,enabled:true,mix:1,
   effects:[{id:'posterize',enabled:true,amount:1}]};
 const basePrint=pixels(w,{...base,print});
 assert.notDeepEqual(basePrint,c1,'Print Shop runs after A2 compositing');
 const later=pixels({...w,generation:generation+13},base);
 assert.notDeepEqual(later,c1,'Frame-local palette travel survives Dual mode');
 assert.deepEqual(w.cells,before,'Color mixing MUST NOT mutate the CA state');
 assert.equal(w.generation,generation);
 console.log('PASS: A2 17 sources, precise A/B blend endpoints for square/hex/triangle, inversion/offset/strength/swap');
 console.log('PASS: dual mercury skin, Print Shop, palette frame cycling, recipe validation and immutable automaton');
}finally{await Promise.all(mods.map(([,p])=>unlink(resolve(p)).catch(()=>{})));}
