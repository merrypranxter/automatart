import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createCanvas} from '@napi-rs/canvas';
import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const mods=[
 ['src/engine/types.ts','scripts/.f6d-types.mjs'],
 ['src/engine/sim.ts','scripts/.f6d-sim.mjs'],
 ['src/engine/render.ts','scripts/.f6d-render.mjs'],
 ['src/engine/f6d-microdetail.ts','scripts/.f6d-micro.mjs'],
 ['src/engine/export-frame.ts','scripts/.f6d-frame.mjs'],
 ['src/engine/world-snapshot.ts','scripts/.f6d-snap.mjs']
];
const load=i=>import(pathToFileURL(resolve(mods[i][1])).href);
function hash(data){
 let h=2166136261;
 for(let i=0;i<data.length;i+=19)h=Math.imul(h^data[i],16777619);
 return h>>>0;
}
function inspect(canvas){
 const ctx=canvas.getContext('2d');
 return hash(ctx.getImageData(0,0,canvas.width,canvas.height).data);
}
const skins=['gyroid','inversion','cusp'];
const topologies=[
 ['square','square',19,.34],
 ['hex','square',7,.34],
 ['triangle','portrait',17,.34],
 ['rhombille','landscape',11,.34],
 ['kagome','portrait',23,.34],
 ['squareoct','square',29,.34],
 ['penrose','portrait',47,.34],
 ['voronoi','portrait',23,.42],
 ['voronoi','square',23,0]
];
try{
 await Promise.all(mods.map(([entry,outfile])=>build({
  entryPoints:[entry],outfile,bundle:true,format:'esm',
  platform:'node',target:'node22'
 })));
 const {INITIAL_SETTINGS,INITIAL_APPEARANCE}=await load(0);
 const {createWorld,stepWorld}=await load(1);
 const {renderWorld}=await load(2);
 const {microBudget,sampleMicroEquation}=await load(3);
 const {exportFrameLayout,renderExportFrame}=await load(4);
 const {snapshotWorld,restoreWorldSnapshot}=await load(5);
 globalThis.document={createElement(tag){
  assert.equal(tag,'canvas');return createCanvas(1,1);
 }};
 for(const n of [1024,4096,7296,16384]){
  for(let q=1;q<=3;q++){
   const exportBudget=microBudget(n,q,'export'),
    previewBudget=microBudget(n,q,'preview');
   assert(exportBudget.enabled&&previewBudget.enabled);
   assert(exportBudget.estimatedSamples<=Math.max(n*4,exportBudget.maxSamples),
    'Global work budget must limit extra samples as world size grows');
   assert(previewBudget.estimatedSamples<=Math.max(n*4,previewBudget.maxSamples));
   assert(exportBudget.samples>=previewBudget.samples,
    'The export must have at least the preview intra-cell sample count');
  }
 }
 assert.equal(microBudget(7296,0,'export').enabled,false);
 assert.equal(microBudget(7296,0,'preview').estimatedSamples,0);
 let tests=0;
 for(const [lattice,aspect,seed,jitter] of topologies){
  const s={...INITIAL_SETTINGS,lattice,aspect,seed,voronoiJitter:jitter,
    engine:'cyclic',cellCount:32,cyclicStates:9,cyclicDrive:0.07,
    pattern:'noise',density:.62,
    wrap:lattice!=='penrose'&&lattice!=='voronoi'};
  let world=createWorld(s);
  for(let i=0;i<4;i++)world=stepWorld(world,s);
  const saved=snapshotWorld(world);
  for(const skin of skins){
   const appearance={...INITIAL_APPEARANCE,skin,
    mathMicroDetail:2,mathMicroFrequency:5,mathMicroMix:.75,
    mathFrequency:5,mathWarp:1,mathSlice:.3,
    glowStrength:0,showGrid:false,
    print:{...INITIAL_APPEARANCE.print,enabled:false}};
   const draw=(a=appearance,ww=world,quality='export')=>{
    const canvas=createCanvas(1,1);
    renderWorld(canvas,ww,a,360,undefined,quality);
    return {canvas,hash:inspect(canvas)};
   };
   const original=draw({...appearance,mathMicroDetail:0}).hash;
   const noMix=draw({...appearance,mathMicroMix:0}).hash;
   assert.equal(original,noMix,
    'Microtexture disabled must preserve EXACT original F6C rendering');
   const fine=draw().hash;
   assert.notEqual(fine,original,
    'F6D must add actual pixels inside the existing F6C material '+skin+'/'+lattice);
   assert.equal(fine,draw().hash,
    'Identical world generation and artist controls must produce pixel-identical detail');
   assert.equal(fine,draw(appearance,restoreWorldSnapshot(saved,s)).hash,
    'Full saved source worlds replay the same fine texture without randomness');
   assert.notEqual(fine,draw({...appearance,mathMicroFrequency:11}).hash,
    'Microscopic frequency changes genuine subcell wave sampling');
   assert.notEqual(fine,draw({...appearance,mathMicroMix:.2}).hash,
    'Material pigment intensity is an actual visual control');
   assert.notEqual(fine,draw({...appearance,mathMicroDetail:1}).hash,
    'Sampling quality changes underlying fine pattern resolution');
   const advanced=stepWorld(world,s);
   assert.notEqual(fine,draw(appearance,advanced).hash,
    'True cellular generation affects the microscopic material');
   const subcellPoints=[[.11,.17],[.37,.28],[.68,.74],[.91,.83]];
   const microSamples=subcellPoints.map(([x,y])=>
    sampleMicroEquation(skin,.46,.52,x,y,.6,.2,-.1,
      appearance,world.generation));
   assert(microSamples.every(Number.isFinite));
   assert(new Set(microSamples).size>=2,
    'The SAME physical cell must have multiple genuinely different equation samples');
   assert.deepEqual(snapshotWorld(world),saved,
    'Subcell material changes no physics, history or source geometry');
   tests++;
  }
  console.log('PASS F6D '+lattice+'/'+aspect+': three real subcell shaders, bounded sampling, deterministic snapshots');
 }
 assert.equal(tests,27);
 // Measure honest native-width PNG in 1:1 and 9:16 without relying on a
 // browser screenshot masquerading as a high-resolution output.
 for(const aspect of ['square','portrait']){
  const s={...INITIAL_SETTINGS,engine:'cyclic',lattice:'voronoi',
   wrap:false,aspect,cellCount:32,seed:318,voronoiJitter:.42};
  const world=createWorld(s);
  const appearance={...INITIAL_APPEARANCE,skin:'gyroid',
    mathMicroDetail:3,mathMicroFrequency:7,mathMicroMix:.9,
    print:{...INITIAL_APPEARANCE.print,enabled:false}};
  const layout=exportFrameLayout(s,1080,aspect,'contain');
  const target=createCanvas(1,1),scratch=createCanvas(1,1);
  renderExportFrame(target,scratch,world,appearance,layout);
  const png=target.toBuffer('image/png');
  assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  assert.equal(png.readUInt32BE(16),layout.width);
  assert.equal(png.readUInt32BE(20),layout.height);
  assert(layout.width>=1080&&layout.height>=1080);
  console.log('PASS F6D native Voronoi clipped '+layout.width+'×'+layout.height+' PNG');
 }
 console.log('PASS F6D: 27 subcell mathematical materials, 8 original topologies, bounded budget and full-export PNG');
}finally{
 await Promise.all(mods.map(([,path])=>unlink(resolve(path)).catch(()=>{})));
}
