import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createCanvas} from '@napi-rs/canvas';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
// F6J1: protect against stale RGBA, cached ImageData truncation, canvas resize,
// ghosting between distinct math materials, and accidental change to legacy
// per-sample equation rotation. Benchmark numbers are informative ONLY.
const modules=[
 ['src/engine/f6g-micro-motion.ts','scripts/.f6j1-rot.mjs'],
 ['src/engine/types.ts','scripts/.f6j1-types.mjs'],
 ['src/engine/sim.ts','scripts/.f6j1-sim.mjs'],
 ['src/engine/render.ts','scripts/.f6j1-render.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.f6j1-snapshot.mjs'],
 ['src/engine/f6d-microdetail.ts','scripts/.f6j1-micro.mjs']
];
const load=i=>import(pathToFileURL(resolve(modules[i][1])).href);
function pixels(c){
 const ctx=c.getContext('2d');
 return Buffer.from(ctx.getImageData(0,0,c.width,c.height).data);
}
try{
 await Promise.all(modules.map(([entry,outfile])=>
  build({entryPoints:[entry],outfile,bundle:true,format:'esm',platform:'node',target:'node22'})));
 const {microLocalRotation,prepareMicroLocalRotation}=await load(0);
 const {INITIAL_SETTINGS,INITIAL_APPEARANCE}=await load(1);
 const {createWorld,stepWorld}=await load(2);
 const {renderWorld}=await load(3);
 const {snapshotWorld,restoreWorldSnapshot}=await load(4);
 const {microBudget}=await load(5);
 globalThis.document={createElement(name){assert.equal(name,'canvas');return createCanvas(1,1);}};
 for(const angle of [0,5,12.5,90,115,180,-180,-53.25,NaN,Infinity,-Infinity])
  for(const [x,y] of [[0,0],[.1,.8],[.29,.45],[.5,.5],[.73,.9],[1,1]]){
   assert.deepEqual(prepareMicroLocalRotation(angle)(x,y),microLocalRotation(x,y,angle),
    'Prepared trig must return exact original per-pixel numbers');
  }
 const skins=['prism','facets','spinodal','quasicrystal','hyperbolic','lissajous','gyroid','inversion','cusp'];
 const settings=[
  {...INITIAL_SETTINGS,engine:'cyclic',lattice:'square',aspect:'square',cellCount:32,
   pattern:'noise',density:.68,seed:131,cyclicStates:9,wrap:true},
  {...INITIAL_SETTINGS,engine:'cyclic',lattice:'penrose',aspect:'portrait',cellCount:32,
   pattern:'noise',density:.68,seed:139,cyclicStates:9,wrap:false},
  {...INITIAL_SETTINGS,engine:'cyclic',lattice:'voronoi',aspect:'portrait',cellCount:32,
   pattern:'noise',density:.68,seed:149,voronoiJitter:.42,cyclicStates:9,wrap:false}
 ];
 let passes=0;
 let shared=createCanvas(1,1);
 for(const [latticeIndex,s] of settings.entries()){
  let world=createWorld(s);
  for(let i=0;i<7;i++)world=stepWorld(world,s);
  const worldCopy=restoreWorldSnapshot(snapshotWorld(world),s);
  for(const [skinIndex,skin] of skins.entries()){
   // Deliberately vary all dimensions of the scratch cache: polygon footprint,
   // angle, F6H power, F6I active phase, level and scale. The exported canvas
   // continues to use the same context for many shots before resetting.
   const level=skinIndex%3+1;
   const a={...INITIAL_APPEARANCE,skin,mathMicroDetail:level,
    mathMicroMix:.85,mathMicroFrequency:6.5,
    mathMicroAngle:skinIndex%2?0:-73,
    mathMicroDomain:skinIndex%3===0?'power':skinIndex%3===1?'vortex':'none',
    mathMicroDomainOrder:3+skinIndex%4,mathMicroDomainCoupling:1.25,
    mathMicroPhaseMode:skinIndex%2?'attract':'repel',
    mathMicroPhaseStrength:1.3,mathMicroPhaseDepth:3,
    print:{...INITIAL_APPEARANCE.print,enabled:false}};
   const width=skinIndex%2?370:280;
   const quality=skinIndex%2?'preview':'export';
   renderWorld(shared,world,a,width,undefined,quality);
   const fresh=createCanvas(1,1);
   renderWorld(fresh,worldCopy,a,width,undefined,quality);
   assert.equal(shared.width,fresh.width);
   assert.equal(shared.height,fresh.height);
   assert(pixels(shared).equals(pixels(fresh)),
    'Reusing one canvas has EXACT pixels as fresh context after varied settings: '+s.lattice+'/'+skin);
   // No active shader at quality 0: must not display stale old tiles.
   const off={...a,mathMicroDetail:0};
   renderWorld(shared,world,off,width,undefined,quality);
   const freshOff=createCanvas(1,1);
   renderWorld(freshOff,worldCopy,off,width,undefined,quality);
   assert(pixels(shared).equals(pixels(freshOff)),
    'After drawing detailed ink, opt-out must not show a ghost: '+skin);
   // Refresh shader and ensure reused tiles do not retain earlier skin data.
   renderWorld(shared,world,a,width,undefined,quality);
   const reenter=pixels(shared),initial=pixels(fresh);
   if(!reenter.equals(initial)){
    let count=0,first=[];
    for(let k=0;k<reenter.length;k++)if(reenter[k]!==initial[k]){
     count++;if(first.length<10)first.push([k,initial[k],reenter[k]]);
    }
    const state=shared.getContext('2d');
    const freshCycle=createCanvas(1,1);
    renderWorld(freshCycle,worldCopy,off,width,undefined,quality);
    renderWorld(freshCycle,worldCopy,a,width,undefined,quality);
    console.error('F6J1 DIAGNOSTIC',JSON.stringify({
     lattice:s.lattice,skin,width,quality,level,
     changedBytes:count,totalBytes:reenter.length,first,
     newCanvasOffThenOnMatches:reenter.equals(pixels(freshCycle)),
     newCanvasOffThenOnMatchesInitial:initial.equals(pixels(freshCycle)),
     alpha:state.globalAlpha,comp:state.globalCompositeOperation,
     smoothing:state.imageSmoothingEnabled,smoothingQuality:state.imageSmoothingQuality,
     filter:state.filter
    }));
   }
   assert(reenter.equals(initial),
    'Re-entering detailed mode must restore same math pixels: '+skin);
   passes++;
  }
  console.log('PASS F6J1 '+s.lattice+': warmed buffers + changing quality, geometry, phase and shaders');
 }
 for(const quality of ['preview','export'])
  for(let level=1;level<=3;level++){
   const budget=microBudget(5000,level,quality);
   assert(budget.samples<=28&&budget.samples>=2);
   assert(budget.estimatedSamples<=budget.maxSamples,
    'Existing global shader sample budget stays capped');
  }
 // Measure pure hot-loop overhead, but do not assert unstable CI wall time.
 const samples=240000,points=[];
 for(let i=0;i<samples;i++)points.push([(i%300)/300,((i*7)%319)/319]);
 const baselineStart=performance.now();
 let guard=0;
 for(const [x,y] of points){const [a,b]=microLocalRotation(x,y,103);guard+=a+b;}
 const originalMs=performance.now()-baselineStart;
 const optimizedStart=performance.now();
 const prepared=prepareMicroLocalRotation(103);
 for(const [x,y] of points){const [a,b]=prepared(x,y);guard-=a+b;}
 const preparedMs=performance.now()-optimizedStart;
 assert(Math.abs(guard)<.00001);
 console.log('F6J1 diagnostic 240k math rotations: old='+originalMs.toFixed(1)+
  'ms prepared='+preparedMs.toFixed(1)+'ms (not a device performance guarantee)');
 assert.equal(passes,27);
 console.log('PASS F6J1 27 case exact warmed-versus-fresh pixel parity, zero ghosting, bounded buffers');
}finally{
 await Promise.all(modules.map(([,file])=>unlink(resolve(file)).catch(()=>{})));
}
