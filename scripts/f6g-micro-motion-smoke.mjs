import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createCanvas} from '@napi-rs/canvas';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const mods=[['src/engine/f6g-micro-motion.ts','scripts/.f6g-math.mjs'],['src/engine/types.ts','scripts/.f6g-types.mjs'],['src/engine/sim.ts','scripts/.f6g-sim.mjs'],['src/engine/render.ts','scripts/.f6g-render.mjs'],['src/engine/world-snapshot.ts','scripts/.f6g-snapshot.mjs'],['src/engine/f6d-microdetail.ts','scripts/.f6g-micro.mjs']];
const load=i=>import(pathToFileURL(resolve(mods[i][1])).href);
function hash(c){let h=2166136261,d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let i=0;i<d.length;i+=13)h=Math.imul(h^d[i],16777619);return h>>>0;}
try{
 await Promise.all(mods.map(([entry,outfile])=>build({entryPoints:[entry],outfile,bundle:true,format:'esm',platform:'node',target:'node22'})));
 const {microLocalRotation,microEquationGeneration,microInkBandShift}=await load(0);
 const {INITIAL_SETTINGS,INITIAL_APPEARANCE}=await load(1);
 const {createWorld,stepWorld}=await load(2);
 const {renderWorld}=await load(3);
 const {snapshotWorld,restoreWorldSnapshot}=await load(4);
 const {microBudget}=await load(5);
 globalThis.document={createElement(k){assert.equal(k,'canvas');return createCanvas(1,1);}};
 assert.deepEqual(microLocalRotation(.75,.5,0),[.75,.5]);
 const quarter=microLocalRotation(.75,.5,90);
 assert(Math.abs(quarter[0]-.5)<1e-10&&Math.abs(quarter[1]-.75)<1e-10);
 assert.equal(microEquationGeneration(12,1),12);
 assert.equal(microEquationGeneration(12,0),0);
 assert.equal(microEquationGeneration(12,-2),-24);
 assert.equal(microEquationGeneration(12,NaN),12);
 assert.equal(microInkBandShift(Infinity),0);
 assert.equal(microInkBandShift(400),8);
 const skins=['prism','facets','spinodal','quasicrystal','hyperbolic','lissajous','gyroid','inversion','cusp'];
 const worlds=[['square','square',61,.34],['penrose','portrait',67,.34],['voronoi','portrait',71,.42]];
 const changed={angle:0,time:0,band:0};let cases=0;
 for(const [lattice,aspect,seed,jitter] of worlds){
  const s={...INITIAL_SETTINGS,lattice,aspect,seed,voronoiJitter:jitter,engine:'cyclic',cyclicStates:9,cyclicDrive:.06,pattern:'noise',density:.7,cellCount:24,wrap:lattice==='square'};
  let world=createWorld(s);
  for(let i=0;i<13;i++)world=stepWorld(world,s);
  const saved=snapshotWorld(world);
  for(const skin of skins){
   const a={...INITIAL_APPEARANCE,skin,mathMicroDetail:2,mathMicroFrequency:6.5,mathMicroMix:.9,mathMicroAngle:0,mathMicroTimeRate:1,mathMicroBandShift:0,print:{...INITIAL_APPEARANCE.print,enabled:false}};
   const draw=(appearance=a,w=world)=>{
    const c=createCanvas(1,1);renderWorld(c,w,appearance,360,undefined,'export');return hash(c);
   };
   const old=draw({...a,mathMicroDetail:0});
   assert.equal(old,draw({...a,mathMicroMix:0,mathMicroAngle:115,mathMicroTimeRate:-3,mathMicroBandShift:3}));
   assert.equal(old,draw({...a,mathMicroDetail:0,mathMicroAngle:115,mathMicroTimeRate:-3,mathMicroBandShift:3}));
   const legacy={...a};delete legacy.mathMicroAngle;delete legacy.mathMicroTimeRate;delete legacy.mathMicroBandShift;
   const base=draw();
   assert.equal(base,draw(legacy),'Missing F6G fields = old F6F identity');
   assert.notEqual(base,old,'Micro-equations must be active');
   assert.equal(base,draw(),'Reproducible render');
   assert.equal(base,draw(a,restoreWorldSnapshot(saved,s)),'Reproducible saved world');
   for(const [key,appearance] of Object.entries({
    angle:{...a,mathMicroAngle:115},time:{...a,mathMicroTimeRate:-2},band:{...a,mathMicroBandShift:2.5}
   }))if(draw(appearance)!==base)changed[key]++;
   assert.deepEqual(snapshotWorld(world),saved,'No simulation mutation');
   cases++;
  }
  console.log('PASS F6G '+lattice+': nine deterministic living micro materials');
 }
 for(const k of ['angle','time','band'])assert(changed[k]>=19,k+' materially changes mathematical colors on most of 27 worlds: '+changed[k]);
 for(const q of [1,2,3]){
  const b=microBudget(16384,q,'export');
  assert(b.estimatedSamples<=Math.max(16384*4,b.maxSamples));
 }
 assert.equal(cases,27);
 console.log('PASS F6G: '+cases+' cases, transforms '+JSON.stringify(changed)+' and strict old-image fallback');
}finally{await Promise.all(mods.map(([,f])=>unlink(resolve(f)).catch(()=>{})));}
