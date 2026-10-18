import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createCanvas} from '@napi-rs/canvas';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const mods=[
 ['src/engine/f6h-domain-mutation.ts','scripts/.f6h-domain.mjs'],
 ['src/engine/types.ts','scripts/.f6h-types.mjs'],
 ['src/engine/sim.ts','scripts/.f6h-sim.mjs'],
 ['src/engine/render.ts','scripts/.f6h-render.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.f6h-world-snap.mjs'],
 ['src/engine/f6d-microdetail.ts','scripts/.f6h-micro.mjs'],
 ['src/engine/export-frame.ts','scripts/.f6h-frame.mjs']
];
const load=i=>import(pathToFileURL(resolve(mods[i][1])).href);
function hash(canvas){
 const d=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
 let h=2166136261;
 for(let i=0;i<d.length;i+=17)h=Math.imul(h^d[i],16777619);
 return h>>>0;
}
const close=(a,b,tol=1e-8)=>Math.abs(a-b)<tol;
try{
 await Promise.all(mods.map(([entry,outfile])=>build({
  entryPoints:[entry],outfile,bundle:true,format:'esm',platform:'node',target:'node22'
 })));
 const {mutateMicroDomain,validateMicroDomainMode}=await load(0);
 const {INITIAL_SETTINGS,INITIAL_APPEARANCE}=await load(1);
 const {createWorld,stepWorld}=await load(2);
 const {renderWorld}=await load(3);
 const {snapshotWorld,restoreWorldSnapshot}=await load(4);
 const {microBudget}=await load(5);
 const {renderExportFrame,exportFrameLayout}=await load(6);
 globalThis.document={createElement(tag){assert.equal(tag,'canvas');return createCanvas(1,1);}};
 const morph=(x,y,mode,order=3,coupling=0,height=.4,gx=0,gy=0,lap=0)=>
  mutateMicroDomain(x,y,mode,order,coupling,height,gx,gy,lap);
 assert.deepEqual(morph(.24,.63,'none',8,2,.5,1,1,1),[.24,.63],
  'OFF is an exact no-op despite nondefault knobs and field values');
 assert.equal(validateMicroDomainMode('future-shape'),'none');
 assert.equal(validateMicroDomainMode('power'),'power');
 // Normalized complex squaring: x=.75,y=.5 means r=.25, n=2 -> .088388...
 const squared=morph(.75,.5,'power',2);
 assert(close(squared[0],.5+Math.pow(.25*Math.SQRT2,2)/Math.SQRT2));
 assert(close(squared[1],.5));
 const power2=morph(.73,.66,'power',2);
 const power5=morph(.73,.66,'power',5);
 assert.notDeepEqual(power2,power5,'Complex degree changes genuine branching geometry');
 // Reflection symmetry: plus and minus angle collapse into same fundamental wedge.
 const rad=.24,theta=.34;
 const reflectA=morph(.5+rad*Math.cos(theta),.5+rad*Math.sin(theta),'kaleidoscope',5);
 const reflectB=morph(.5+rad*Math.cos(-theta),.5+rad*Math.sin(-theta),'kaleidoscope',5);
 assert(close(reflectA[0],reflectB[0])&&close(reflectA[1],reflectB[1]));
 const twistNear=morph(.56,.5,'vortex',6);
 const twistFar=morph(.91,.5,'vortex',6);
 const angleNear=Math.atan2(twistNear[1]-.5,twistNear[0]-.5);
 const angleFar=Math.atan2(twistFar[1]-.5,twistFar[0]-.5);
 assert(angleNear>angleFar+.2,'Vortex is a truly radius-dependent angular shear');
 assert.notDeepEqual(morph(.72,.6,'vortex',4,0,.8,.5,-.4,.3),
  morph(.72,.6,'vortex',4,2,.8,.5,-.4,.3),
  'True cell neighbor gradients modify the sampling domain');
 for(const mode of ['power','kaleidoscope','vortex'])
  for(const bad of [NaN,Infinity,-Infinity,1e80]){
   const result=morph(.3,.5,mode,bad,bad,bad,bad,bad,bad);
   assert(result.every(Number.isFinite),'Mathematics must remain finite');
  }
 const worlds=[['square','square',107,.34],['penrose','portrait',109,.34],['voronoi','portrait',113,.42]];
 const skins=['prism','facets','spinodal','quasicrystal','hyperbolic','lissajous','gyroid','inversion','cusp'];
 const changed={power:0,kaleidoscope:0,vortex:0},coupled={power:0,kaleidoscope:0,vortex:0};
 let cases=0;
 for(const [lattice,aspect,seed,jitter] of worlds){
  const settings={...INITIAL_SETTINGS,lattice,aspect,seed,voronoiJitter:jitter,
   engine:'cyclic',cyclicStates:9,cyclicDrive:.07,pattern:'noise',density:.7,
   cellCount:24,wrap:lattice==='square'};
  let world=createWorld(settings);
  for(let i=0;i<12;i++)world=stepWorld(world,settings);
  const saved=snapshotWorld(world);
  for(const skin of skins){
   const a={...INITIAL_APPEARANCE,skin,mathMicroDetail:2,
    mathMicroFrequency:7,mathMicroMix:.9,mathMicroAngle:25,mathMicroTimeRate:1.5,
    mathMicroDomain:'none',mathMicroDomainOrder:3,mathMicroDomainCoupling:.8,
    print:{...INITIAL_APPEARANCE.print,enabled:false}};
   const draw=(appearance=a,w=world)=>{
    const canvas=createCanvas(1,1);
    renderWorld(canvas,w,appearance,360,undefined,'export');
    return hash(canvas);
   };
   const plain=draw({...a,mathMicroDetail:0});
   assert.equal(plain,draw({...a,mathMicroMix:0,mathMicroDomain:'power'}),
    'Zero intensity preserves the original pixels');
   assert.equal(plain,draw({...a,mathMicroDetail:0,mathMicroDomain:'vortex'}),
    'Zero detail preserves the original pixels');
   const legacy={...a};
   delete legacy.mathMicroDomain;delete legacy.mathMicroDomainOrder;delete legacy.mathMicroDomainCoupling;
   const base=draw(a);
   assert.equal(base,draw(legacy),'Missing fields must reproduce F6G art');
   assert.equal(base,draw({...a,mathMicroDomain:'none',mathMicroDomainOrder:8,mathMicroDomainCoupling:2}),
    'OFF bypasses nondefault mutation settings');
   assert.equal(base,draw(),'Deterministic render');
   assert.equal(base,draw(a,restoreWorldSnapshot(saved,settings)),'Exact restored-world replay');
   for(const mode of ['power','kaleidoscope','vortex']){
    const variation=draw({...a,mathMicroDomain:mode});
    if(variation!==base)changed[mode]++;
    const stronger=draw({...a,mathMicroDomain:mode,mathMicroDomainCoupling:2});
    if(stronger!==variation)coupled[mode]++;
   }
   assert.deepEqual(snapshotWorld(world),saved,'Micro domain must never mutate physics');
   cases++;
  }
  console.log('PASS F6H '+lattice+': nine living genuine polygon materials and stable replay');
 }
 for(const mode of ['power','kaleidoscope','vortex']){
  assert(changed[mode]>=19,mode+' must actually change most of 27 material cases: '+changed[mode]);
  assert(coupled[mode]>=15,mode+' must respond to neighbor field on most cases: '+coupled[mode]);
 }
 for(const q of [1,2,3]){
  const b=microBudget(16384,q,'export');
  assert(b.estimatedSamples<=Math.max(4*16384,b.maxSamples),'Original finite work ceiling intact');
 }
 // Native-size 9:16 Voronoi export shares this actual shader code.
 const s={...INITIAL_SETTINGS,engine:'cyclic',lattice:'voronoi',aspect:'portrait',cellCount:24,seed:101,wrap:false};
 const world=createWorld(s);
 const a={...INITIAL_APPEARANCE,skin:'lissajous',mathMicroDetail:3,mathMicroMix:.9,
  mathMicroDomain:'kaleidoscope',mathMicroDomainOrder:7,mathMicroDomainCoupling:1.5,
  print:{...INITIAL_APPEARANCE.print,enabled:false}};
 const layout=exportFrameLayout(s,720,'portrait','contain');
 const canvas=createCanvas(1,1),scratch=createCanvas(1,1);
 renderExportFrame(canvas,scratch,world,a,layout);
 const png=canvas.toBuffer('image/png');
 assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 assert.equal(png.readUInt32BE(16),layout.width);
 assert.equal(png.readUInt32BE(20),layout.height);
 assert.equal(cases,27);
 console.log('PASS F6H: 27 materials; changed='+JSON.stringify(changed)+' coupled='+JSON.stringify(coupled));
}finally{
 await Promise.all(mods.map(([,path])=>unlink(resolve(path)).catch(()=>{})));
}
